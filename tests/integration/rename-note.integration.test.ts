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

    it('should include Phase 5 warning when dryRun flag is provided', async () => {
      // Create test note
      const sourcePath = path.join(testDir, 'test.md');
      await fs.writeFile(sourcePath, 'Test content');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Call handler with dryRun flag (Phase 5 not yet implemented)
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: path.join(testDir, 'renamed.md'),
          dryRun: true
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteOutput;

      expect(output.success).toBe(true);
      expect(output.warnings).toBeDefined();
      expect(output.warnings).toHaveLength(1);
      expect(output.warnings).toContain('Dry-run mode not implemented yet (available in Phase 5)');
    });
  });

  describe('Error handling', () => {
    it('should return FILE_NOT_FOUND error with search suggestion', async () => {
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

      expect(error.success).toBe(false);
      expect(error.errorCode).toBe('FILE_NOT_FOUND');
      expect(error.error).toContain('Note not found');
      expect(error.error).toContain("Run search(query='does-not-exist')");
    });

    it('should return FILE_EXISTS error when destination exists', async () => {
      // Create both source and destination
      const sourcePath = path.join(testDir, 'source.md');
      const destPath = path.join(testDir, 'existing.md');
      await fs.writeFile(sourcePath, 'Source');
      await fs.writeFile(destPath, 'Existing');

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

      const error = JSON.parse(result.content[0].text) as RenameNoteError;

      expect(error.success).toBe(false);
      expect(error.errorCode).toBe('FILE_EXISTS');
      expect(error.error).toContain('already exists');
    });

    it('should return INVALID_PATH error for missing .md extension', async () => {
      const sourcePath = path.join(testDir, 'test.md');
      await fs.writeFile(sourcePath, 'Content');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: path.join(testDir, 'renamed.txt')
        },
        context
      );

      const error = JSON.parse(result.content[0].text) as RenameNoteError;

      expect(error.success).toBe(false);
      expect(error.errorCode).toBe('INVALID_PATH');
      expect(error.error).toContain('.md extension');
    });

    it('should return INVALID_PATH error for identical paths', async () => {
      const sourcePath = path.join(testDir, 'test.md');
      await fs.writeFile(sourcePath, 'Content');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: sourcePath
        },
        context
      );

      const error = JSON.parse(result.content[0].text) as RenameNoteError;

      expect(error.success).toBe(false);
      expect(error.errorCode).toBe('INVALID_PATH');
      expect(error.error).toContain('identical');
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
});
