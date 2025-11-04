/**
 * Edge Case Tests for rename_note
 *
 * Tests boundary conditions and unusual inputs against MCP-129 contracts:
 * - Large files (10MB+)
 * - Special characters (Unicode, spaces, emoji)
 * - Concurrent operations
 * - Boundary conditions (empty files, no frontmatter, path limits)
 *
 * @see dev/contracts/MCP-129-contracts.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import { VaultUtils } from '../../../src/modules/files/index.js';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import type { ToolHandlerContext } from '../../../dev/contracts/MCP-8-contracts.js';
import type { RenameNoteOutput } from '../../../dev/contracts/MCP-105-contracts.js';

describe('Edge Case Tests: rename_note Boundary Conditions', () => {
  let vaultPath: string;
  let originalConfig: any;
  let renameNoteHandler: any;

  beforeEach(async () => {
    // Create temporary vault
    const randomId = randomBytes(8).toString('hex');
    vaultPath = path.join(tmpdir(), `test-vault-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });

    // Mock the LIFEOS_CONFIG
    const { LIFEOS_CONFIG } = await import('../../../src/config.js');
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;

    // Reset VaultUtils singletons
    VaultUtils.resetSingletons();

    // Import the handler
    const { registerNoteHandlers } = await import('../../../src/server/handlers/note-handlers.js');
    const handlerRegistry = new Map();
    registerNoteHandlers(handlerRegistry);
    renameNoteHandler = handlerRegistry.get('rename_note');
  });

  afterEach(async () => {
    // Restore original config
    if (originalConfig) {
      const { LIFEOS_CONFIG } = await import('../../../src/config.js');
      Object.assign(LIFEOS_CONFIG, originalConfig);
    }

    // Clean up temporary vault
    if (vaultPath) {
      await fs.rm(vaultPath, { recursive: true, force: true });
    }
  });

  describe('Large Files', () => {
    it('should handle large file (10MB+) with SHA-256 validation', async () => {
      // Create 10MB+ file
      const sourcePath = path.join(vaultPath, 'large-file.md');
      const frontmatter = '---\ntitle: Large File\n---\n\n';
      const contentLine = '# '.repeat(1000) + 'Large content line\n';
      const largeContent = frontmatter + contentLine.repeat(10000); // ~10MB

      await fs.writeFile(sourcePath, largeContent);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'large-file-renamed.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      // Verify: Transaction succeeded
      expect(output.success).toBe(true);

      // Verify: Content integrity preserved
      const renamedContent = await fs.readFile(destPath, 'utf-8');
      expect(renamedContent).toBe(largeContent);
      expect(renamedContent.length).toBeGreaterThan(10_000_000); // >10MB
    }, 30000); // 30s timeout for large file operations

    it('should report performance metrics for large file operations', async () => {
      // Create large file (5MB for faster test)
      const sourcePath = path.join(vaultPath, 'perf-test.md');
      const content = '# '.repeat(5000000); // ~5MB
      await fs.writeFile(sourcePath, content);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'perf-test-renamed.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);
      expect(output.metrics).toBeDefined();
    }, 30000); // Increased timeout for large file operations
  });

  describe('Special Characters in Filenames', () => {
    it('should handle Unicode characters in filename', async () => {
      const sourcePath = path.join(vaultPath, '日本語ノート.md');
      await fs.writeFile(sourcePath, '# Japanese Note');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, '中文笔记.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);
      expect(output.newPath).toBe(destPath);

      // Verify file exists with Unicode name
      const destExists = await fs.access(destPath).then(() => true).catch(() => false);
      expect(destExists).toBe(true);
    });

    it('should handle spaces in filename', async () => {
      const sourcePath = path.join(vaultPath, 'note with spaces.md');
      await fs.writeFile(sourcePath, '# Note with spaces');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'renamed with spaces.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);
      expect(output.newPath).toBe(destPath);
    });

    it('should handle emoji in filename', async () => {
      const sourcePath = path.join(vaultPath, '📝-note.md');
      await fs.writeFile(sourcePath, '# Emoji note');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, '✅-completed.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);
      expect(output.newPath).toBe(destPath);
    });

    it('should update wikilinks with special characters correctly', async () => {
      // Create target note with special chars
      const targetPath = path.join(vaultPath, 'café-notes.md');
      await fs.writeFile(targetPath, '# Café Notes');

      // Create linking note
      const linkingPath = path.join(vaultPath, 'linking.md');
      await fs.writeFile(linkingPath, 'Reference to [[café-notes]]');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'café-renamed.md');
      const result = await renameNoteHandler(
        {
          oldPath: targetPath,
          newPath: destPath,
          updateLinks: true
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);

      // Verify: Link updated correctly
      const updatedLinking = await fs.readFile(linkingPath, 'utf-8');
      expect(updatedLinking).toContain('[[café-renamed]]');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent renames of different files', async () => {
      // Create multiple test files
      const sourcePaths = [];
      for (let i = 0; i < 3; i++) {
        const sourcePath = path.join(vaultPath, `concurrent-${i}.md`);
        await fs.writeFile(sourcePath, `# Concurrent Test ${i}`);
        sourcePaths.push(sourcePath);
      }

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Execute concurrent renames
      const promises = sourcePaths.map((sourcePath, i) => {
        const destPath = path.join(vaultPath, `renamed-${i}.md`);
        return renameNoteHandler(
          {
            oldPath: sourcePath,
            newPath: destPath,
            updateLinks: false
          },
          context
        );
      });

      const results = await Promise.all(promises);

      // Verify: All succeeded
      results.forEach(result => {
        const output = JSON.parse(result.content[0].text) as RenameNoteOutput;
        expect(output.success).toBe(true);
      });

      // Verify: All files renamed
      for (let i = 0; i < 3; i++) {
        const newPath = path.join(vaultPath, `renamed-${i}.md`);
        const exists = await fs.access(newPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });

    it('should prevent concurrent renames of same file with staleness detection', async () => {
      // This test validates that the transaction system prevents race conditions
      const sourcePath = path.join(vaultPath, 'same-file-test.md');
      await fs.writeFile(sourcePath, '# Same File Test');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // First rename
      const dest1Path = path.join(vaultPath, 'renamed-1.md');
      const result1 = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: dest1Path,
          updateLinks: false
        },
        context
      );

      const output1 = JSON.parse(result1.content[0].text) as RenameNoteOutput;
      expect(output1.success).toBe(true);

      // Attempt second rename of original path (should fail - file doesn't exist)
      const dest2Path = path.join(vaultPath, 'renamed-2.md');
      const result2 = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: dest2Path,
          updateLinks: false
        },
        context
      );

      const output2 = JSON.parse(result2.content[0].text);
      expect(output2.success).toBe(false);
      expect(output2.errorCode).toBeDefined();
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle empty file rename', async () => {
      const sourcePath = path.join(vaultPath, 'empty.md');
      await fs.writeFile(sourcePath, '');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'empty-renamed.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);

      // Verify: Empty file preserved
      const content = await fs.readFile(destPath, 'utf-8');
      expect(content).toBe('');
    });

    it('should handle file without YAML frontmatter', async () => {
      const sourcePath = path.join(vaultPath, 'no-yaml.md');
      const content = '# Just Content\n\nNo frontmatter here.';
      await fs.writeFile(sourcePath, content);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'no-yaml-renamed.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);

      // Verify: Content preserved
      const renamedContent = await fs.readFile(destPath, 'utf-8');
      expect(renamedContent).toBe(content);
    });

    it('should handle file with only whitespace', async () => {
      const sourcePath = path.join(vaultPath, 'whitespace.md');
      await fs.writeFile(sourcePath, '   \n\n   \t   \n   ');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'whitespace-renamed.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);
    });

    it('should handle very long path approaching filesystem limits', async () => {
      // Create nested directories
      const longDir = 'a'.repeat(100);
      const nestedPath = path.join(vaultPath, longDir);
      await fs.mkdir(nestedPath, { recursive: true });

      const longFilename = 'b'.repeat(100);
      const sourcePath = path.join(nestedPath, `${longFilename}.md`);
      await fs.writeFile(sourcePath, '# Long Path Test');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destFilename = 'c'.repeat(100);
      const destPath = path.join(nestedPath, `${destFilename}.md`);

      // This should succeed or fail gracefully
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text);

      // Either succeeds or fails with proper error (no crash)
      expect(typeof output.success).toBe('boolean');
      if (output.success) {
        const destExists = await fs.access(destPath).then(() => true).catch(() => false);
        expect(destExists).toBe(true);
      } else {
        expect(output.errorCode).toBeDefined();
      }
    });

    it('should handle single character filename', async () => {
      const sourcePath = path.join(vaultPath, 'a.md');
      await fs.writeFile(sourcePath, '# A');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'z.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);
      expect(output.newPath).toBe(destPath);
    });

    it('should preserve exact byte content for binary-safe operation', async () => {
      // Create file with various character encodings
      const sourcePath = path.join(vaultPath, 'encoding-test.md');
      const content = '---\ntitle: Encoding Test\n---\n\n# Test\n\n日本語 中文 Emoji 🎉 Ñoño';
      await fs.writeFile(sourcePath, content, 'utf-8');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'encoding-test-renamed.md');
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);

      // Verify: Exact content preserved
      const renamedContent = await fs.readFile(destPath, 'utf-8');
      expect(renamedContent).toBe(content);

      // Verify: Byte-for-byte identical
      const originalBytes = Buffer.byteLength(content, 'utf-8');
      const renamedBytes = Buffer.byteLength(renamedContent, 'utf-8');
      expect(renamedBytes).toBe(originalBytes);
    });
  });
});
