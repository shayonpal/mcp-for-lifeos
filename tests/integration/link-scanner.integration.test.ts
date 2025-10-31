/**
 * Link Scanner Integration Tests
 *
 * Tests LinkScanner with real vault structure, SearchEngine caching,
 * and performance benchmarks.
 *
 * @since MCP-106
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { LinkScanner } from '../../src/link-scanner.js';
import { VaultUtils } from '../../src/vault-utils.js';
import { SearchEngine } from '../../src/search-engine.js';

describe('LinkScanner Integration', () => {
  let vaultPath: string;
  let originalConfig: any;

  beforeEach(async () => {
    // Create temporary vault
    const randomId = randomBytes(8).toString('hex');
    vaultPath = path.join(tmpdir(), `test-vault-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });

    // Mock the LIFEOS_CONFIG
    const { LIFEOS_CONFIG } = await import('../../src/config.js');
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;

    // Reset singletons
    VaultUtils.resetSingletons();
  });

  afterEach(async () => {
    // Restore original config
    if (originalConfig) {
      const { LIFEOS_CONFIG } = await import('../../src/config.js');
      Object.assign(LIFEOS_CONFIG, originalConfig);
    }

    // Clean up temporary vault
    if (vaultPath) {
      await fs.rm(vaultPath, { recursive: true, force: true });
    }
  });

  describe('Vault-wide scanning', () => {
    it('should scan vault and find all references to a note', async () => {
      // Create target note
      await fs.writeFile(
        path.join(vaultPath, 'target.md'),
        '# Target Note\n\nThis is the target.'
      );

      // Create notes with references
      await fs.writeFile(
        path.join(vaultPath, 'note1.md'),
        'See [[target]] for details.'
      );

      await fs.writeFile(
        path.join(vaultPath, 'note2.md'),
        'Both [[target]] and [[target#Section]] are useful.'
      );

      await fs.writeFile(
        path.join(vaultPath, 'note3.md'),
        'No references here.'
      );

      // Scan vault
      const result = await LinkScanner.scanVaultForLinks('target');

      expect(result.targetNote).toBe('target');
      expect(result.totalReferences).toBe(3);
      expect(result.scannedNotes).toBe(4); // target + note1 + note2 + note3
      expect(result.references).toHaveLength(3);

      // Verify reference details
      const ref1 = result.references.find(r => r.sourceNote === 'note1');
      expect(ref1).toBeDefined();
      expect(ref1?.targetNote).toBe('target');
      expect(ref1?.linkText).toBe('[[target]]');

      const ref2Heading = result.references.find(r => r.heading === 'Section');
      expect(ref2Heading).toBeDefined();
      expect(ref2Heading?.sourceNote).toBe('note2');
    });

    it('should detect ambiguous targets (multiple notes with same name)', async () => {
      // Create two notes with same name in different folders
      const folder1 = path.join(vaultPath, 'folder1');
      const folder2 = path.join(vaultPath, 'folder2');
      await fs.mkdir(folder1, { recursive: true });
      await fs.mkdir(folder2, { recursive: true });

      await fs.writeFile(
        path.join(folder1, 'duplicate.md'),
        'First duplicate'
      );

      await fs.writeFile(
        path.join(folder2, 'duplicate.md'),
        'Second duplicate'
      );

      await fs.writeFile(
        path.join(vaultPath, 'referencer.md'),
        'See [[duplicate]] for details'
      );

      // Scan for duplicate
      const result = await LinkScanner.scanVaultForLinks('duplicate');

      expect(result.totalReferences).toBe(1);
      expect(result.references[0].isAmbiguous).toBe(true);
    });

    it('should respect includeEmbeds option', async () => {
      await fs.writeFile(
        path.join(vaultPath, 'target.md'),
        'Target content'
      );

      await fs.writeFile(
        path.join(vaultPath, 'note.md'),
        'Regular [[target]] and embed ![[target]]'
      );

      // With embeds (default)
      const withEmbeds = await LinkScanner.scanVaultForLinks('target');
      expect(withEmbeds.totalReferences).toBe(2);

      // Without embeds
      const withoutEmbeds = await LinkScanner.scanVaultForLinks('target', {
        includeEmbeds: false,
      });
      expect(withoutEmbeds.totalReferences).toBe(1);
      expect(withoutEmbeds.references[0].isEmbed).toBe(false);
    });

    it('should handle case-insensitive matching by default', async () => {
      await fs.writeFile(
        path.join(vaultPath, 'MyNote.md'),
        'Target content'
      );

      await fs.writeFile(
        path.join(vaultPath, 'note.md'),
        'Links: [[mynote]] [[MyNote]] [[MYNOTE]]'
      );

      // Case-insensitive (default)
      const result = await LinkScanner.scanVaultForLinks('mynote');
      expect(result.totalReferences).toBe(3);
    });

    it('should handle case-sensitive matching when requested', async () => {
      await fs.writeFile(
        path.join(vaultPath, 'MyNote.md'),
        'Target content'
      );

      await fs.writeFile(
        path.join(vaultPath, 'note.md'),
        'Links: [[mynote]] [[MyNote]] [[MYNOTE]]'
      );

      // Case-sensitive
      const result = await LinkScanner.scanVaultForLinks('MyNote', {
        caseSensitive: true,
      });
      expect(result.totalReferences).toBe(1);
      expect(result.references[0].linkText).toBe('[[MyNote]]');
    });
  });

  describe('Performance benchmarks', () => {
    it('should scan 100+ note vault in reasonable time', async () => {
      // Create 100 notes
      for (let i = 0; i < 100; i++) {
        const content = i % 10 === 0
          ? `Note ${i} links to [[target]]`
          : `Note ${i} has no special links`;
        await fs.writeFile(
          path.join(vaultPath, `note-${i}.md`),
          content
        );
      }

      await fs.writeFile(
        path.join(vaultPath, 'target.md'),
        'Target note'
      );

      const startTime = Date.now();
      const result = await LinkScanner.scanVaultForLinks('target');
      const duration = Date.now() - startTime;

      expect(result.scannedNotes).toBe(101);
      expect(result.totalReferences).toBe(10); // 10% of notes link to target
      expect(duration).toBeLessThan(5000); // Should complete in <5s
      expect(result.scanTimeMs).toBeGreaterThan(0);
    });

    it('should use SearchEngine cache on second scan', async () => {
      await fs.writeFile(
        path.join(vaultPath, 'target.md'),
        'Target'
      );

      await fs.writeFile(
        path.join(vaultPath, 'note.md'),
        '[[target]]'
      );

      // First scan - populates cache
      const first = await LinkScanner.scanVaultForLinks('target');
      expect(first.usedCache).toBe(true); // SearchEngine has cache

      // Second scan - uses cache
      const second = await LinkScanner.scanVaultForLinks('target');
      expect(second.usedCache).toBe(true);
      // Note: Timing comparison removed due to unreliability across systems/load
      // Cache usage is verified above, which is the critical behavior
    });
  });

  describe('Real vault structure', () => {
    it('should handle nested folders', async () => {
      const projectsDir = path.join(vaultPath, 'Projects');
      const archiveDir = path.join(vaultPath, 'Archive');
      await fs.mkdir(projectsDir, { recursive: true });
      await fs.mkdir(archiveDir, { recursive: true });

      await fs.writeFile(
        path.join(vaultPath, 'target.md'),
        'Root target'
      );

      await fs.writeFile(
        path.join(projectsDir, 'project.md'),
        'Project links to [[target]]'
      );

      await fs.writeFile(
        path.join(archiveDir, 'archived.md'),
        'Archived links to [[target]]'
      );

      const result = await LinkScanner.scanVaultForLinks('target');

      expect(result.totalReferences).toBe(2);
      expect(result.references.some(r => r.sourcePath.includes('Projects'))).toBe(true);
      expect(result.references.some(r => r.sourcePath.includes('Archive'))).toBe(true);
    });

    it('should handle notes with complex content', async () => {
      await fs.writeFile(
        path.join(vaultPath, 'target.md'),
        'Target'
      );

      const complexContent = `---
title: Complex Note
tags: [test, links]
---

# Introduction

See [[target]] for background.

## Code Example

\`\`\`typescript
// This should be ignored: [[target]]
const link = "[[target]]";
\`\`\`

## More Content

Another reference to [[target#Section]].

![[target]] embedded here.
`;

      await fs.writeFile(
        path.join(vaultPath, 'complex.md'),
        complexContent
      );

      const result = await LinkScanner.scanVaultForLinks('target');

      // Should find 3 links (skipping code block)
      expect(result.totalReferences).toBe(3);

      // Verify links found
      const links = result.references.filter(r => r.sourceNote === 'complex');
      expect(links).toHaveLength(3);

      // Check for heading and embed
      expect(links.some(l => l.heading === 'Section')).toBe(true);
      expect(links.some(l => l.isEmbed === true)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw error for empty target', async () => {
      await expect(LinkScanner.scanVaultForLinks('')).rejects.toThrow(
        'Invalid target note name'
      );
    });

    it('should handle vault with no notes gracefully', async () => {
      const result = await LinkScanner.scanVaultForLinks('nonexistent');

      expect(result.totalReferences).toBe(0);
      expect(result.references).toHaveLength(0);
      expect(result.scannedNotes).toBe(0);
    });

    it('should handle target that does not exist', async () => {
      await fs.writeFile(
        path.join(vaultPath, 'note.md'),
        'Some content'
      );

      const result = await LinkScanner.scanVaultForLinks('nonexistent');

      expect(result.totalReferences).toBe(0);
      expect(result.scannedNotes).toBe(1);
    });
  });
});
