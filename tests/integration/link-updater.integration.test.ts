/**
 * Link Updater Integration Tests
 *
 * Tests full link update workflow with real vault operations:
 * - File I/O with iCloud sync retries
 * - Multiple files with various link formats
 * - Partial failure scenarios
 * - Frontmatter preservation
 *
 * @since MCP-107
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { updateVaultLinks } from '../../src/modules/links/index.js';
import { VaultUtils } from '../../src/modules/files/index.js';

describe('Link Updater Integration', () => {
  let vaultPath: string;
  let originalConfig: any;

  beforeEach(async () => {
    // Create temporary vault
    const randomId = randomBytes(8).toString('hex');
    vaultPath = path.join(tmpdir(), `test-vault-link-updater-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });

    // Mock the LIFEOS_CONFIG
    const { LIFEOS_CONFIG } = await import('../../src/config.js');
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;

    // Reset VaultUtils singleton to use new config
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

  describe('updateNoteLinks with real files', () => {
    it('should update links while preserving frontmatter structure', async () => {
      const content = `---
title: Test Note
tags: [project, important]
created: 2025-01-01
---

# My Note

See [[OldNote]] for details about the project.

More content with [[OldNote|custom alias]].`;

      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');

      // Verify frontmatter preserved
      expect(result).toMatch(/---[\s\S]*?title: Test Note[\s\S]*?---/);
      expect(result).toMatch(/created/);

      // Verify links updated in content
      expect(result).toContain('[[NewNote]]');
      expect(result).toContain('[[NewNote|custom alias]]');
      expect(result).not.toMatch(/\[\[OldNote\]\]/);
    });

    it('should handle files without frontmatter', async () => {
      const content = `# Simple Note

Just a reference to [[OldNote]] here.`;

      const result = VaultUtils.updateNoteLinks(content, 'OldNote', 'NewNote');

      expect(result).toContain('[[NewNote]]');
      expect(result).toContain('# Simple Note');
      expect(result).not.toContain('[[OldNote]]');
    });
  });

  describe('updateVaultLinks with real vault', () => {
    it('should update links across multiple files', async () => {
      // Create source note that will be renamed
      const sourceNotePath = path.join(vaultPath, 'OldNote.md');
      await fs.writeFile(sourceNotePath, '# Old Note\n\nSome content.');

      // Create referencing notes
      const ref1Path = path.join(vaultPath, 'Referencing1.md');
      await fs.writeFile(
        ref1Path,
        `---
title: Reference 1
---

See [[OldNote]] for more info.`
      );

      const ref2Path = path.join(vaultPath, 'Referencing2.md');
      await fs.writeFile(
        ref2Path,
        `Check out [[OldNote|Old Note Link]] and [[OldNote#Section]].`
      );

      const ref3Path = path.join(vaultPath, 'Referencing3.md');
      await fs.writeFile(
        ref3Path,
        `Embed: ![[OldNote]]`
      );

      // Wait for SearchEngine to index (required for LinkScanner)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Perform link update
      const result = await updateVaultLinks('OldNote', 'NewNote');

      // Verify result summary
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      expect(result.totalReferences).toBeGreaterThan(0);
      expect(result.failedFiles).toHaveLength(0);

      // Verify file contents actually updated
      const ref1Content = await fs.readFile(ref1Path, 'utf-8');
      expect(ref1Content).toContain('[[NewNote]]');
      expect(ref1Content).not.toMatch(/\[\[OldNote\]\]/);

      const ref2Content = await fs.readFile(ref2Path, 'utf-8');
      expect(ref2Content).toContain('[[NewNote|Old Note Link]]');
      expect(ref2Content).toContain('[[NewNote#Section]]');

      const ref3Content = await fs.readFile(ref3Path, 'utf-8');
      expect(ref3Content).toContain('![[NewNote]]');
    });

    it('should handle case-insensitive matching', async () => {
      // Create referencing notes with various case variations
      const ref1Path = path.join(vaultPath, 'Ref1.md');
      await fs.writeFile(ref1Path, 'Links: [[oldnote]], [[OLDNOTE]], [[OldNote]]');

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update links (case-insensitive)
      await updateVaultLinks('OldNote', 'NewNote');

      // Verify all variants updated
      const ref1Content = await fs.readFile(ref1Path, 'utf-8');
      const newLinkMatches = ref1Content.match(/\[\[NewNote\]\]/g);
      expect(newLinkMatches).toHaveLength(3);
      expect(ref1Content).not.toContain('oldnote');
      expect(ref1Content).not.toContain('OLDNOTE');
    });

    it('should preserve other links while updating target', async () => {
      const refPath = path.join(vaultPath, 'Mixed.md');
      await fs.writeFile(
        refPath,
        `Links to [[OtherNote]], [[OldNote]], and [[ThirdNote]].`
      );

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update only OldNote links
      await updateVaultLinks('OldNote', 'NewNote');

      // Verify selective update
      const refContent = await fs.readFile(refPath, 'utf-8');
      expect(refContent).toContain('[[OtherNote]]');
      expect(refContent).toContain('[[NewNote]]');
      expect(refContent).toContain('[[ThirdNote]]');
      expect(refContent).not.toContain('[[OldNote]]');
    });

    it('should handle complex link formats', async () => {
      const refPath = path.join(vaultPath, 'Complex.md');
      await fs.writeFile(
        refPath,
        `---
title: Complex References
---

- Basic: [[OldNote]]
- Alias: [[OldNote|See Old Note]]
- Heading: [[OldNote#Introduction]]
- Block: [[OldNote#^block123]]
- Heading + Alias: [[OldNote#Section|Link Text]]
- Embed: ![[OldNote]]
- Embed + Heading: ![[OldNote#Diagram]]`
      );

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update all variants
      const result = await updateVaultLinks('OldNote', 'NewNote');

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);

      // Verify all formats updated
      const refContent = await fs.readFile(refPath, 'utf-8');
      expect(refContent).toContain('[[NewNote]]');
      expect(refContent).toContain('[[NewNote|See Old Note]]');
      expect(refContent).toContain('[[NewNote#Introduction]]');
      expect(refContent).toContain('[[NewNote#^block123]]');
      expect(refContent).toContain('[[NewNote#Section|Link Text]]');
      expect(refContent).toContain('![[NewNote]]');
      expect(refContent).toContain('![[NewNote#Diagram]]');
      expect(refContent).not.toMatch(/\[\[OldNote/);
    });

    it('should return empty result when no links found', async () => {
      // Create notes without any links to OldNote
      const note1Path = path.join(vaultPath, 'Unrelated1.md');
      await fs.writeFile(note1Path, 'No links here.');

      const note2Path = path.join(vaultPath, 'Unrelated2.md');
      await fs.writeFile(note2Path, 'Links to [[OtherNote]] only.');

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try to update non-existent links
      const result = await updateVaultLinks('OldNote', 'NewNote');

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
      expect(result.totalReferences).toBe(0);
      expect(result.failedFiles).toHaveLength(0);
    });

    it('should include timing metrics', async () => {
      // Create a single referencing note
      const refPath = path.join(vaultPath, 'Ref.md');
      await fs.writeFile(refPath, '[[OldNote]]');

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update links and check timing
      const result = await updateVaultLinks('OldNote', 'NewNote');

      expect(result.scanTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.updateTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Frontmatter preservation', () => {
    it('should preserve complex frontmatter during updates', async () => {
      const refPath = path.join(vaultPath, 'Complex-FM.md');
      await fs.writeFile(
        refPath,
        `---
title: Complex Frontmatter
tags:
  - project
  - important
created: 2025-01-01T10:00:00
modified: 2025-01-02T15:30:00
metadata:
  author: Test User
  version: 1.0
---

Content with [[OldNote]] reference.`
      );

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update links
      await updateVaultLinks('OldNote', 'NewNote');

      // Verify frontmatter preserved
      const refContent = await fs.readFile(refPath, 'utf-8');
      expect(refContent).toContain('title: Complex Frontmatter');
      // Note: gray-matter may reformat dates/metadata, just verify they exist
      expect(refContent).toContain('created');
      expect(refContent).toContain('author');

      // Verify link updated
      expect(refContent).toContain('[[NewNote]]');
      expect(refContent).not.toContain('[[OldNote]]');
    });
  });

  describe('Error scenarios', () => {
    it('should handle empty note names', async () => {
      await expect(updateVaultLinks('', 'NewNote')).rejects.toThrow(
        'Old note name and new note name are required'
      );

      await expect(updateVaultLinks('OldNote', '')).rejects.toThrow(
        'Old note name and new note name are required'
      );
    });

    it('should handle vault with subdirectories', async () => {
      // Create notes in subdirectories
      const projectDir = path.join(vaultPath, 'Projects');
      await fs.mkdir(projectDir, { recursive: true });

      const archiveDir = path.join(vaultPath, 'Archive');
      await fs.mkdir(archiveDir, { recursive: true });

      // Create referencing notes in different folders
      await fs.writeFile(
        path.join(projectDir, 'Project1.md'),
        'See [[OldNote]] in archive.'
      );

      await fs.writeFile(
        path.join(archiveDir, 'Archived.md'),
        'Reference: [[OldNote#Historical]]'
      );

      await fs.writeFile(
        path.join(vaultPath, 'Root.md'),
        '![[OldNote]]'
      );

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update links across all folders
      const result = await updateVaultLinks('OldNote', 'NewNote');

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);

      // Verify updates in all folders
      const project1Content = await fs.readFile(path.join(projectDir, 'Project1.md'), 'utf-8');
      expect(project1Content).toContain('[[NewNote]]');

      const archivedContent = await fs.readFile(path.join(archiveDir, 'Archived.md'), 'utf-8');
      expect(archivedContent).toContain('[[NewNote#Historical]]');

      const rootContent = await fs.readFile(path.join(vaultPath, 'Root.md'), 'utf-8');
      expect(rootContent).toContain('![[NewNote]]');
    });
  });

  describe('Real Vault Validation - Fleeting Notes', () => {
    // Use temp vault path to simulate fleeting notes folder
    let fleetingPath: string;

    beforeEach(async () => {
      // Create fleeting notes subfolder in temp vault
      fleetingPath = path.join(vaultPath, '05 - Fleeting Notes');
      await fs.mkdir(fleetingPath, { recursive: true });
    });

    it('should update links with aliases in fleeting notes folder', async () => {

      // Create test notes
      const oldNote = path.join(fleetingPath, 'MCP-107-Test-Old.md');
      const refNote = path.join(fleetingPath, 'MCP-107-Test-Ref.md');

      await fs.writeFile(oldNote, '# Old Note\n\nTest content for MCP-107.');
      await fs.writeFile(refNote, `---
people:
  - "[[MCP-107-Test-Old|Display Name]]"
tags: [test, mcp-107]
---

See [[MCP-107-Test-Old]] and [[MCP-107-Test-Old|Custom Alias]] here.`);

      // Wait for indexing
      await new Promise(resolve => setTimeout(resolve, 200));

      try {
        // Update links
        const result = await updateVaultLinks('MCP-107-Test-Old', 'MCP-107-Test-New');

        // Verify success
        expect(result.success).toBe(true);
        expect(result.updatedCount).toBeGreaterThan(0);

        const refContent = await fs.readFile(refNote, 'utf-8');

        // Frontmatter: NOW UPDATED (implemented in MCP-110)
        expect(refContent).toContain('[[MCP-107-Test-New|Display Name]]');

        // Content: basic link updated
        expect(refContent).toContain('[[MCP-107-Test-New]]');

        // Content: alias preserved
        expect(refContent).toContain('[[MCP-107-Test-New|Custom Alias]]');

        // Verify no old references remain ANYWHERE (both frontmatter and content updated)
        expect(refContent).not.toContain('[[MCP-107-Test-Old');
      } finally {
        // Cleanup - always run even if test fails
        await fs.unlink(oldNote).catch(() => {});
        await fs.unlink(refNote).catch(() => {});
      }
    });

    it('should handle frontmatter-only link updates in fleeting notes (MCP-110)', async () => {
      // MCP-110: LinkScanner now scans frontmatter links when skipFrontmatter: false
      // link-updater.ts passes this option to enable frontmatter link discovery for rename operations
      // This ensures YAML metadata consistency for person/organization references

      // Create source note for LinkScanner to find
      const oldNote = path.join(fleetingPath, 'MCP-107-Test-Old.md');
      await fs.writeFile(oldNote, '# Old Note\n\nSource content.');

      const refNote = path.join(fleetingPath, 'MCP-107-Test-Frontmatter.md');

      await fs.writeFile(refNote, `---
people:
  - "[[MCP-107-Test-Old]]"
  - "[[MCP-107-Test-Old|With Alias]]"
tags: [test]
---

No links in content - only frontmatter.`);

      await new Promise(resolve => setTimeout(resolve, 200));

      try {
        await updateVaultLinks('MCP-107-Test-Old', 'MCP-107-Test-New');

        const refContent = await fs.readFile(refNote, 'utf-8');

        // Both frontmatter links should be updated
        expect(refContent).toContain('[[MCP-107-Test-New]]');
        expect(refContent).toContain('[[MCP-107-Test-New|With Alias]]');

        // Alias should be preserved
        expect(refContent).toMatch(/\[\[MCP-107-Test-New\|With Alias\]\]/);

        // No old references
        expect(refContent).not.toContain('[[MCP-107-Test-Old');
      } finally {
        await fs.unlink(oldNote).catch(() => {});
        await fs.unlink(refNote).catch(() => {});
      }
    });

    it('should update multiple link formats simultaneously in fleeting notes', async () => {
      // Create source note for LinkScanner to find
      const oldNote = path.join(fleetingPath, 'MCP-107-Test-Old.md');
      await fs.writeFile(oldNote, '# Old Note\n\nSource content.');

      const refNote = path.join(fleetingPath, 'MCP-107-Test-Multi.md');

      await fs.writeFile(refNote, `---
people:
  - "[[MCP-107-Test-Old|Person Alias]]"
---

# Multi-Format Test

Basic: [[MCP-107-Test-Old]]
Alias: [[MCP-107-Test-Old|My Alias]]
Heading: [[MCP-107-Test-Old#Section]]
Block: [[MCP-107-Test-Old#^block123]]
Combo: [[MCP-107-Test-Old#Section|Link Text]]
Embed: ![[MCP-107-Test-Old]]`);

      await new Promise(resolve => setTimeout(resolve, 200));

      try {
        await updateVaultLinks('MCP-107-Test-Old', 'MCP-107-Test-New');

        const refContent = await fs.readFile(refNote, 'utf-8');

        // Frontmatter: NOW UPDATED (implemented in MCP-110)
        expect(refContent).toContain('[[MCP-107-Test-New|Person Alias]]');

        // Content - all formats UPDATED
        expect(refContent).toMatch(/Basic: \[\[MCP-107-Test-New\]\]/);
        expect(refContent).toMatch(/Alias: \[\[MCP-107-Test-New\|My Alias\]\]/);
        expect(refContent).toMatch(/Heading: \[\[MCP-107-Test-New#Section\]\]/);
        expect(refContent).toMatch(/Block: \[\[MCP-107-Test-New#\^block123\]\]/);
        expect(refContent).toMatch(/Combo: \[\[MCP-107-Test-New#Section\|Link Text\]\]/);
        expect(refContent).toMatch(/Embed: !\[\[MCP-107-Test-New\]\]/);

        // No old references anywhere (both frontmatter and content updated in MCP-110)
        expect(refContent).not.toContain('MCP-107-Test-Old');
      } finally {
        await fs.unlink(oldNote).catch(() => {});
        await fs.unlink(refNote).catch(() => {});
      }
    });
  });
});
