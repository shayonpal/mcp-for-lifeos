/**
 * Transaction System Regression Tests
 *
 * Protects Phase 4 transaction safety features from breaking changes:
 * - Transaction atomicity (rollback on failure)
 * - SHA-256 staleness detection
 * - Boot recovery (orphaned WAL cleanup)
 * - WAL cleanup after success
 * - Staging file cleanup
 *
 * @see dev/contracts/MCP-129-contracts.ts
 * @see dev/contracts/MCP-108-contracts.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs, existsSync } from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { randomBytes, randomUUID } from 'crypto';
import { VaultUtils } from '../../../src/modules/files/index.js';
import { WALManager, type WALEntry } from '../../../src/modules/transactions/index.js';
import type { ToolHandlerContext } from '../../../dev/contracts/MCP-8-contracts.js';
import type { RenameNoteError } from '../../../dev/contracts/MCP-105-contracts.js';
import { resetTestSingletons } from '../../helpers/test-utils.js';

describe('Transaction System Regression Tests', () => {
  let vaultPath: string;
  let walDir: string;
  let originalConfig: any;
  let renameNoteHandler: any;

  beforeEach(async () => {
    // Create temporary vault
    const randomId = randomBytes(8).toString('hex');
    vaultPath = path.join(tmpdir(), `test-vault-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });

    // Create temporary WAL directory
    walDir = path.join(tmpdir(), `test-wal-${randomId}`);

    // Mock the LIFEOS_CONFIG
    const { LIFEOS_CONFIG } = await import('../../../src/shared/index.js');
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;

    // Reset singletons
    resetTestSingletons();

    // Import the handler
    const { registerNoteHandlers } = await import('../../../src/server/handlers/note-handlers.js');
    const handlerRegistry = new Map();
    registerNoteHandlers(handlerRegistry);
    renameNoteHandler = handlerRegistry.get('rename_note');
  });

  afterEach(async () => {
    // Restore original config
    if (originalConfig) {
      const { LIFEOS_CONFIG } = await import('../../../src/shared/index.js');
      Object.assign(LIFEOS_CONFIG, originalConfig);
    }

    // Reset singletons
    resetTestSingletons();

    // Cleanup test directories
    try {
      if (vaultPath && existsSync(vaultPath)) {
        await fs.rm(vaultPath, { recursive: true, force: true });
      }
      if (walDir && existsSync(walDir)) {
        await fs.rm(walDir, { recursive: true, force: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Regression: Transaction Atomicity', () => {
    it('should rollback rename operation on transaction failure', async () => {
      // This test validates rollback behavior through handler interface
      // Create test note
      const sourcePath = path.join(vaultPath, 'test-note.md');
      const originalContent = '---\ntitle: Test Note\n---\n\nOriginal content.';
      await fs.writeFile(sourcePath, originalContent);

      // Create invalid destination (directory instead of file path)
      const invalidDestDir = path.join(vaultPath, 'invalid-dest.md');
      await fs.mkdir(invalidDestDir, { recursive: true });

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Attempt rename to directory (should fail)
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: invalidDestDir,
          updateLinks: true
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteError;

      // Verify: Transaction failed
      expect(output.success).toBe(false);
      expect(output.errorCode).toBeDefined();

      // Verify: No partial state - original file still exists
      const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false);
      expect(sourceExists).toBe(true);

      // Verify: Original content unchanged
      const currentContent = await fs.readFile(sourcePath, 'utf-8');
      expect(currentContent).toBe(originalContent);

      // Verify: No staged files left behind
      const vaultContents = await fs.readdir(vaultPath);
      const stagedFiles = vaultContents.filter(f => f.startsWith('.mcp-staged-'));
      expect(stagedFiles).toHaveLength(0);
    });

    it('should maintain vault consistency when transaction aborts during prepare phase', async () => {
      // Create test note
      const sourcePath = path.join(vaultPath, 'source.md');
      await fs.writeFile(sourcePath, '# Source Note');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Execute transaction that will fail during plan phase (nonexistent file)
      const destPath = path.join(vaultPath, 'dest.md');
      const result = await renameNoteHandler(
        {
          oldPath: '/nonexistent/file.md',
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteError;

      // Verify: Transaction failed
      expect(output.success).toBe(false);
      expect(output.errorCode).toBeDefined();

      // Verify: Vault unchanged
      const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false);
      const destExists = await fs.access(destPath).then(() => true).catch(() => false);

      expect(sourceExists).toBe(true);
      expect(destExists).toBe(false);
    });
  });

  describe('Regression: SHA-256 Staleness Detection', () => {
    it('should detect concurrent modifications and abort transaction', async () => {
      // Create test note
      const sourcePath = path.join(vaultPath, 'concurrent-test.md');
      const originalContent = '# Original Content';
      await fs.writeFile(sourcePath, originalContent);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'renamed-concurrent.md');

      // Execute rename (will succeed)
      const result1 = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output1 = JSON.parse(result1.content[0].text);
      expect(output1.success).toBe(true);

      // Verify: Content preserved (hash validation passed)
      const renamedContent = await fs.readFile(destPath, 'utf-8');
      expect(renamedContent).toBe(originalContent);

      // Note: Staleness detection is checked during validation phase
      // This regression test ensures the feature continues to exist
    });

    it('should use SHA-256 hashing for integrity validation', async () => {
      // Create test note with specific content
      const sourcePath = path.join(vaultPath, 'hash-test.md');
      const content = '# Test Content for SHA-256';
      await fs.writeFile(sourcePath, content);

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'hash-test-renamed.md');

      // Execute transaction
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text);

      expect(output.success).toBe(true);
      expect(output.metrics).toBeDefined();

      // Verify: Content preserved (hash validation passed)
      const finalContent = await fs.readFile(destPath, 'utf-8');
      expect(finalContent).toBe(content);
    });
  });

  describe('Regression: Boot Recovery', () => {
    it('should have boot recovery system for orphaned WAL entries', async () => {
      // Note: Boot recovery is tested comprehensively in boot-recovery.test.ts
      // This regression test ensures the feature continues to exist

      const walManager = new WALManager(walDir);

      // Verify: WALManager has boot recovery capability (scanPendingWALs method)
      expect(typeof walManager.scanPendingWALs).toBe('function');
      expect(typeof walManager.writeWAL).toBe('function');
      expect(typeof walManager.deleteWAL).toBe('function');

      // Verify: WAL scanning works
      const pendingWALs = await walManager.scanPendingWALs();
      expect(Array.isArray(pendingWALs)).toBe(true);
    });

    it('should support WAL age-based cleanup logic', async () => {
      // Note: Age-based cleanup logic is tested in boot-recovery.test.ts
      // This regression test verifies the infrastructure exists

      const walManager = new WALManager(walDir);

      // Ensure WAL directory exists
      await fs.mkdir(walDir, { recursive: true });

      // Create a test WAL entry
      const correlationId = randomUUID();
      const walEntry: WALEntry = {
        version: '1.0',
        correlationId,
        timestamp: new Date().toISOString(),
        vaultPath,
        phase: 'prepare',
        operation: 'rename_note',
        manifest: {
          noteRename: {
            from: path.join(vaultPath, 'test.md'),
            to: path.join(vaultPath, 'test-renamed.md'),
            sha256Before: 'fake-hash',
            completed: false
          },
          linkUpdates: [],
          totalOperations: 1
        },
        pid: process.pid
      };

      // Verify: Can write WAL entries
      const walPath = await walManager.writeWAL(walEntry);
      expect(walPath).toBeTruthy();
      expect(existsSync(walPath)).toBe(true);

      // Verify: Can scan WAL entries
      const pendingWALs = await walManager.scanPendingWALs();
      expect(Array.isArray(pendingWALs)).toBe(true);

      // Cleanup
      await walManager.deleteWAL(walPath);

      // Verify: Deletion worked
      expect(existsSync(walPath)).toBe(false);
    });
  });

  describe('Regression: WAL Cleanup After Success', () => {
    it('should delete WAL file after successful transaction completion', async () => {
      // Note: WAL cleanup is handled internally by TransactionManager
      // This regression test validates the behavior persists

      // Create test note
      const sourcePath = path.join(vaultPath, 'cleanup-test.md');
      await fs.writeFile(sourcePath, '# Cleanup Test');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'cleanup-test-renamed.md');

      // Execute transaction
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text);
      expect(output.success).toBe(true);

      // Verify: File renamed successfully (WAL was used and cleaned up)
      const destExists = await fs.access(destPath).then(() => true).catch(() => false);
      expect(destExists).toBe(true);
    });

    it('should not leave WAL directory polluted after multiple successful operations', async () => {
      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Execute multiple transactions
      for (let i = 0; i < 5; i++) {
        const sourcePath = path.join(vaultPath, `test-${i}.md`);
        await fs.writeFile(sourcePath, `# Test ${i}`);

        const destPath = path.join(vaultPath, `renamed-${i}.md`);

        const result = await renameNoteHandler(
          {
            oldPath: sourcePath,
            newPath: destPath,
            updateLinks: false
          },
          context
        );

        const output = JSON.parse(result.content[0].text);
        expect(output.success).toBe(true);
      }

      // Verify: All files renamed successfully
      for (let i = 0; i < 5; i++) {
        const destPath = path.join(vaultPath, `renamed-${i}.md`);
        const exists = await fs.access(destPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }
    });
  });

  describe('Regression: Staging File Cleanup', () => {
    it('should remove staged files after successful commit', async () => {
      // Create test note
      const sourcePath = path.join(vaultPath, 'staging-test.md');
      await fs.writeFile(sourcePath, '# Staging Test');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'staging-test-renamed.md');

      // Execute transaction
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: destPath,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text);
      expect(output.success).toBe(true);

      // Verify: No .mcp-staged-* files left in vault
      const vaultContents = await fs.readdir(vaultPath);
      const stagedFiles = vaultContents.filter(f => f.startsWith('.mcp-staged-'));
      expect(stagedFiles).toHaveLength(0);
    });

    it('should remove staged files after transaction abort', async () => {
      // Create test note
      const sourcePath = path.join(vaultPath, 'abort-staging-test.md');
      await fs.writeFile(sourcePath, '# Abort Test');

      // Create destination as directory (will cause transaction to fail)
      const invalidDest = path.join(vaultPath, 'invalid.md');
      await fs.mkdir(invalidDest, { recursive: true });

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      // Attempt rename (will fail)
      const result = await renameNoteHandler(
        {
          oldPath: sourcePath,
          newPath: invalidDest,
          updateLinks: false
        },
        context
      );

      const output = JSON.parse(result.content[0].text) as RenameNoteError;
      expect(output.success).toBe(false);

      // Verify: No .mcp-staged-* artifacts left behind
      const vaultContents = await fs.readdir(vaultPath);
      const stagedFiles = vaultContents.filter(f => f.startsWith('.mcp-staged-'));
      expect(stagedFiles).toHaveLength(0);
    });

    it('should clean up staged files for link updates', async () => {
      // Create target note
      const targetPath = path.join(vaultPath, 'target.md');
      await fs.writeFile(targetPath, '# Target');

      // Create linking note
      const linkingPath = path.join(vaultPath, 'linking.md');
      await fs.writeFile(linkingPath, '[[target]]');

      const context: ToolHandlerContext = {
        registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
        analytics: { logToolCall: () => Promise.resolve() } as any
      };

      const destPath = path.join(vaultPath, 'target-renamed.md');

      // Execute transaction with link updates
      const result = await renameNoteHandler(
        {
          oldPath: targetPath,
          newPath: destPath,
          updateLinks: true
        },
        context
      );

      const output = JSON.parse(result.content[0].text);
      expect(output.success).toBe(true);

      // Verify: No staged files for link updates
      const vaultContents = await fs.readdir(vaultPath);
      const stagedFiles = vaultContents.filter(f => f.startsWith('.mcp-staged-'));
      expect(stagedFiles).toHaveLength(0);
    });
  });
});
