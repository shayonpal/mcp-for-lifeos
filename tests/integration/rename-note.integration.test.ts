/**
 * Rename Note Integration Tests
 *
 * Tests the rename_note tool handler through the MCP protocol layer
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import { VaultUtils } from '../../src/vault-utils.js';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import type { ToolHandlerContext } from '../../dev/contracts/MCP-8-contracts.js';
import type { RenameNoteOutput, RenameNoteError } from '../../dev/contracts/MCP-105-contracts.js';

describe('Rename Note Integration (Handler)', () => {
  let vaultPath: string;
  let testDir: string;
  let originalConfig: any;
  let renameNoteHandler: any;

  beforeEach(async () => {
    // Create temporary vault
    const randomId = randomBytes(8).toString('hex');
    vaultPath = path.join(tmpdir(), `test-vault-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });

    // Create test directory
    testDir = path.join(vaultPath, 'test-notes');
    await fs.mkdir(testDir, { recursive: true });

    // Mock the LIFEOS_CONFIG
    const { LIFEOS_CONFIG } = await import('../../src/config.js');
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;

    // Reset VaultUtils singletons to use new config
    VaultUtils.resetSingletons();

    // Import the handler
    const { registerNoteHandlers } = await import('../../src/server/handlers/note-handlers.js');
    const handlerRegistry = new Map();
    registerNoteHandlers(handlerRegistry);
    renameNoteHandler = handlerRegistry.get('rename_note');
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

  describe('Successful rename operations', () => {
    it('should rename a note successfully', async () => {
      // Create test note
      const sourcePath = path.join(testDir, 'original.md');
      const content = '---\ntitle: Original Note\n---\n\nContent here.';
      await fs.writeFile(sourcePath, content);

      // Create mock context
      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Call handler
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: path.join(testDir, 'renamed.md')
        },
        context
      );

      // Parse JSON response
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);
      expect(output.newPath).toBe(path.join(testDir, 'renamed.md'));
      expect(output.message).toContain('Successfully renamed');

      // Verify file was actually renamed
      const oldExists = await fs.access(sourcePath).then(() => true).catch(() => false);
      const newExists = await fs.access(output.newPath).then(() => true).catch(() => false);
      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);

      // Verify content preserved
      const newContent = await fs.readFile(output.newPath, 'utf-8');
      expect(newContent).toBe(content);
    });
  });

  describe('Error handling', () => {
    it('should return transaction error for non-existent file', async () => {
      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const result = await renameNoteHandler(
        {
          oldPath: path.join(testDir, 'does-not-exist.md'),
          newPath: path.join(testDir, 'renamed.md')
        },
        context
      );

      const error = JSON.parse(result.content[0].text) as RenameNoteError;

      // Phase 4: File existence checked by TransactionManager during plan phase
      // Returns TRANSACTION_FAILED with metadata
      expect(error.success).toBe(false);
      expect(error.errorCode).toBe('TRANSACTION_FAILED');
      expect(error.error).toBeTruthy();
      expect(error.transactionMetadata).toBeDefined();
    });

    it('should handle destination exists scenario via transaction', async () => {
      // Create both source and destination
      const sourcePath = path.join(testDir, 'source.md');
      const destPath = path.join(testDir, 'existing.md');
      await fs.writeFile(sourcePath, 'Source content');
      await fs.writeFile(destPath, 'Existing content');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath
        },
        context
      );

      const response = JSON.parse(result.content[0].text) as RenameNoteOutput | RenameNoteError;

      // Phase 4: TransactionManager handles this scenario
      // On Unix/POSIX, renameSync overwrites destination if it exists
      // Transaction should succeed, overwriting the existing file
      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.correlationId).toBeDefined();
        expect(response.metrics).toBeDefined();
      }
    });

    it('should throw error for missing .md extension', async () => {
      const sourcePath = path.join(testDir, 'test.md');
      await fs.writeFile(sourcePath, 'Content');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Phase 4: Extension validation in handler before TransactionManager
      // Throws error for better error message
      await expect(
        renameNoteHandler(
          {
            oldPath: sourcePath,
            newPath: path.join(testDir, 'renamed.txt')
          },
          context
        )
      ).rejects.toThrow('.md extension');
    });

    it('should throw error for identical paths', async () => {
      const sourcePath = path.join(testDir, 'test.md');
      await fs.writeFile(sourcePath, 'Content');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Phase 4: Identical path check in handler before TransactionManager
      // Prevents unnecessary transaction overhead
      await expect(
        renameNoteHandler(
          {
            oldPath: sourcePath,
            newPath: sourcePath
          },
          context
        )
      ).rejects.toThrow('identical');
    });
  });

  describe('Path normalization', () => {
    it('should handle relative paths correctly', async () => {
      const sourcePath = path.join(testDir, 'test.md');
      await fs.writeFile(sourcePath, 'Content');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Use relative path
      const result = await renameNoteHandler(
        {
          oldPath: 'test-notes/test.md',
          newPath: 'test-notes/renamed.md'
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);
      expect(output.newPath).toBe(path.join(testDir, 'renamed.md'));
    });

    it('should handle move and rename together', async () => {
      const sourcePath = path.join(testDir, 'original.md');
      const destDir = path.join(vaultPath, 'moved-notes');
      await fs.mkdir(destDir, { recursive: true });
      await fs.writeFile(sourcePath, 'Content');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: path.join(destDir, 'renamed.md')
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);
      expect(output.newPath).toBe(path.join(destDir, 'renamed.md'));

      // Verify file was moved and renamed
      const oldExists = await fs.access(sourcePath).then(() => true).catch(() => false);
      const newExists = await fs.access(output.newPath).then(() => true).catch(() => false);
      expect(oldExists).toBe(false);
      expect(newExists).toBe(true);
    });
  });

  describe('Dry-run mode (MCP-122)', () => {
    it('should return preview without filesystem changes when dryRun=true', async () => {
      // Create test note
      const sourcePath = path.join(testDir, 'original.md');
      const content = '---\ntitle: Original Note\n---\n\nContent here.';
      await fs.writeFile(sourcePath, content);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Call handler with dryRun=true
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: path.join(testDir, 'renamed.md'),
          dryRun: true
        },
        context
      );

      // Parse JSON response
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      const output = JSON.parse(result.content[0].text);

      // Verify preview structure
      expect(output.success).toBe(true);
      expect(output.preview).toBeDefined();
      expect(output.preview.operation).toBe('rename');
      expect(output.preview.oldPath).toBe(sourcePath);
      expect(output.preview.newPath).toBe(path.join(testDir, 'renamed.md'));
      expect(output.preview.willUpdateLinks).toBe(true);
      expect(output.preview.filesAffected).toBe(1);
      expect(output.preview.executionMode).toBe('dry-run');

      // Verify file was NOT renamed
      const oldExists = await fs.access(sourcePath).then(() => true).catch(() => false);
      const newExists = await fs.access(path.join(testDir, 'renamed.md')).then(() => true).catch(() => false);
      expect(oldExists).toBe(true);
      expect(newExists).toBe(false);

      // Verify content unchanged
      const originalContent = await fs.readFile(sourcePath, 'utf-8');
      expect(originalContent).toBe(content);
    });

    it('should validate paths in dry-run mode (FILE_NOT_FOUND)', async () => {
      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Call handler with non-existent source file
      const result = await renameNoteHandler(
        {
          oldPath: path.join(testDir, 'missing.md'),
          newPath: path.join(testDir, 'renamed.md'),
          dryRun: true
        },
        context
      );

      // Parse JSON response
      const output = JSON.parse(result.content[0].text) as RenameNoteError;

      // Verify error response
      expect(output.success).toBe(false);
      expect(output.errorCode).toBe('FILE_NOT_FOUND');
      expect(result.isError).toBe(true);
    });

    it('should validate paths in dry-run mode (FILE_EXISTS)', async () => {
      // Create both source and destination files
      const sourcePath = path.join(testDir, 'original.md');
      const destPath = path.join(testDir, 'existing.md');
      await fs.writeFile(sourcePath, 'Source content');
      await fs.writeFile(destPath, 'Existing content');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Call handler trying to rename to existing file
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          dryRun: true
        },
        context
      );

      // Parse JSON response
      const output = JSON.parse(result.content[0].text) as RenameNoteError;

      // Verify error response
      expect(output.success).toBe(false);
      expect(output.errorCode).toBe('FILE_EXISTS');
      expect(result.isError).toBe(true);

      // Verify neither file was modified
      const sourceContent = await fs.readFile(sourcePath, 'utf-8');
      const destContent = await fs.readFile(destPath, 'utf-8');
      expect(sourceContent).toBe('Source content');
      expect(destContent).toBe('Existing content');
    });

    it('should respect updateLinks parameter in preview', async () => {
      const sourcePath = path.join(testDir, 'test.md');
      await fs.writeFile(sourcePath, 'Content');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Test with updateLinks=false
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: path.join(testDir, 'renamed.md'),
          dryRun: true,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text);

      expect(output.success).toBe(true);
      expect(output.preview.willUpdateLinks).toBe(false);
      expect(output.preview.filesAffected).toBe(1);
    });

    it('should allow multiple dry-run calls without affecting filesystem', async () => {
      const sourcePath = path.join(testDir, 'test.md');
      await fs.writeFile(sourcePath, 'Content');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Run multiple dry-runs
      for (let i = 0; i < 3; i++) {
        const result = await renameNoteHandler(
          {
            oldPath: sourcePath,
            newPath: path.join(testDir, `renamed-${i}.md`),
            dryRun: true
          },
          context
        );

        const output = JSON.parse(result.content[0].text);
        expect(output.success).toBe(true);
        expect(output.preview).toBeDefined();
      }

      // Verify original file still exists and no new files created
      const oldExists = await fs.access(sourcePath).then(() => true).catch(() => false);
      expect(oldExists).toBe(true);

      for (let i = 0; i < 3; i++) {
        const newExists = await fs.access(path.join(testDir, `renamed-${i}.md`))
          .then(() => true)
          .catch(() => false);
        expect(newExists).toBe(false);
      }
    });
  });

  describe('Enhanced dry-run preview (MCP-123)', () => {
    it('should include linkUpdates structure when updateLinks=true and links exist', async () => {
      // Create target note
      const targetPath = path.join(testDir, 'target-note.md');
      await fs.writeFile(targetPath, '---\ntitle: Target Note\n---\n\nContent here.');

      // Create linking notes (notes that reference the target)
      const linking1Path = path.join(testDir, 'linking-note-1.md');
      await fs.writeFile(linking1Path, '---\ntitle: Linking Note 1\n---\n\nThis links to [[target-note]].');

      const linking2Path = path.join(testDir, 'linking-note-2.md');
      await fs.writeFile(linking2Path, '---\ntitle: Linking Note 2\n---\n\nAnother link to [[target-note]] and [[target-note|with alias]].');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Call handler with dryRun=true and updateLinks=true
      const result = await renameNoteHandler(
        {
          oldPath: targetPath,
          newPath: path.join(testDir, 'renamed-target.md'),
          dryRun: true,
          updateLinks: true
        },
        context
      );

      // Parse JSON response
      const output = JSON.parse(result.content[0].text);

      // Verify preview structure
      expect(output.success).toBe(true);
      expect(output.preview).toBeDefined();

      // Verify linkUpdates structure (MCP-123)
      expect(output.preview.linkUpdates).toBeDefined();
      expect(output.preview.linkUpdates.filesWithLinks).toBe(2); // 2 files contain links
      expect(output.preview.linkUpdates.affectedPaths).toBeDefined();
      expect(Array.isArray(output.preview.linkUpdates.affectedPaths)).toBe(true);
      expect(output.preview.linkUpdates.affectedPaths).toHaveLength(2);
      expect(output.preview.linkUpdates.totalReferences).toBe(3); // 3 total link references

      // Verify affectedPaths contains the linking note paths
      expect(output.preview.linkUpdates.affectedPaths).toContain(linking1Path);
      expect(output.preview.linkUpdates.affectedPaths).toContain(linking2Path);

      // Verify filesAffected calculation: 1 (renamed note) + 2 (files with links) = 3
      expect(output.preview.filesAffected).toBe(3);
    });

    it('should include transactionPhases array in preview response', async () => {
      // Create test note
      const sourcePath = path.join(testDir, 'original.md');
      await fs.writeFile(sourcePath, '---\ntitle: Original Note\n---\n\nContent here.');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Call handler with dryRun=true
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: path.join(testDir, 'renamed.md'),
          dryRun: true,
          updateLinks: false
        },
        context
      );

      // Parse JSON response
      const output = JSON.parse(result.content[0].text);

      // Verify preview structure
      expect(output.success).toBe(true);
      expect(output.preview).toBeDefined();

      // Verify transactionPhases structure (MCP-123)
      expect(output.preview.transactionPhases).toBeDefined();
      expect(Array.isArray(output.preview.transactionPhases)).toBe(true);
      expect(output.preview.transactionPhases).toHaveLength(5);

      // Verify each phase has required fields
      const phaseNames = ['plan', 'prepare', 'validate', 'commit', 'success'];
      output.preview.transactionPhases.forEach((phase: any, index: number) => {
        expect(phase.name).toBe(phaseNames[index]);
        expect(phase.description).toBeDefined();
        expect(typeof phase.description).toBe('string');
        expect(phase.description.length).toBeGreaterThan(0);
        expect(phase.order).toBe(index + 1);
      });

      // Verify specific phase descriptions
      expect(output.preview.transactionPhases[0].description).toContain('Validate paths');
      expect(output.preview.transactionPhases[1].description).toContain('Stage files');
      expect(output.preview.transactionPhases[2].description).toContain('concurrent modifications');
      expect(output.preview.transactionPhases[3].description).toContain('Execute rename');
      expect(output.preview.transactionPhases[4].description).toContain('staging files');

      // Verify estimatedTime structure (bonus validation)
      expect(output.preview.estimatedTime).toBeDefined();
      expect(output.preview.estimatedTime.min).toBeDefined();
      expect(output.preview.estimatedTime.max).toBeDefined();
      expect(typeof output.preview.estimatedTime.min).toBe('number');
      expect(typeof output.preview.estimatedTime.max).toBe('number');
      expect(output.preview.estimatedTime.max).toBeGreaterThan(output.preview.estimatedTime.min);
    });
  });
});
