import { WALManager, WALEntry, TransactionManifest } from '../../src/modules/transactions/index.js';
import {
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  utimesSync,
} from 'fs';
import { join } from 'path';

// Test WAL directory (isolated from production)
const TEST_WAL_DIR = join(process.cwd(), 'test-wal-dir');

describe('MCP-115: WAL Infrastructure', () => {
  let walManager: WALManager;

  beforeEach(() => {
    // Clean test directory
    if (existsSync(TEST_WAL_DIR)) {
      rmSync(TEST_WAL_DIR, { recursive: true, force: true });
    }

    // Create fresh WALManager instance with test directory
    walManager = new WALManager(TEST_WAL_DIR);
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(TEST_WAL_DIR)) {
      rmSync(TEST_WAL_DIR, { recursive: true, force: true });
    }
  });

  // Helper function to create a test WAL entry
  function createTestWALEntry(overrides?: Partial<WALEntry>): WALEntry {
    const defaultManifest: TransactionManifest = {
      noteRename: {
        from: '/vault/old-note.md',
        to: '/vault/new-note.md',
        sha256Before: 'abc123def456',
      },
      linkUpdates: [],
      totalOperations: 1,
    };

    return {
      version: '1.0',
      correlationId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID v4
      timestamp: new Date().toISOString(),
      vaultPath: '/vault',
      phase: 'prepare',
      operation: 'rename_note',
      manifest: defaultManifest,
      pid: process.pid,
      ...overrides,
    };
  }

  describe('WAL Directory Management', () => {
    it('should create WAL directory on first write', async () => {
      expect(existsSync(TEST_WAL_DIR)).toBe(false);

      const entry = createTestWALEntry();
      await walManager.writeWAL(entry);

      expect(existsSync(TEST_WAL_DIR)).toBe(true);
    });

    it('should create directory with correct permissions', async () => {
      const entry = createTestWALEntry();
      await walManager.writeWAL(entry);

      const stats = require('fs').statSync(TEST_WAL_DIR);
      // Mode 0o755 = 493 in decimal (on Unix-like systems)
      expect(stats.mode & 0o777).toBe(0o755);
    });

    it('should make directory creation idempotent', async () => {
      const correlationId1 = 'dddddddd-eeee-4fff-8000-111111111111';
      const correlationId2 = 'eeeeeeee-ffff-4000-8111-222222222222';
      const entry1 = createTestWALEntry({ correlationId: correlationId1 });
      const entry2 = createTestWALEntry({ correlationId: correlationId2 });

      await walManager.writeWAL(entry1);
      await walManager.writeWAL(entry2);

      expect(existsSync(TEST_WAL_DIR)).toBe(true);

      // Should have 2 WAL files + 1 README
      const files = readdirSync(TEST_WAL_DIR);
      expect(files.filter((f) => f.endsWith('.wal.json'))).toHaveLength(2);
    });

    it('should auto-generate README.md on first directory creation', async () => {
      const entry = createTestWALEntry();
      await walManager.writeWAL(entry);

      const readmePath = join(TEST_WAL_DIR, 'README.md');
      expect(existsSync(readmePath)).toBe(true);

      const content = readFileSync(readmePath, 'utf-8');
      expect(content).toContain('# MCP for LifeOS - Write-Ahead Log (WAL)');
      expect(content).toContain('WAL entries ensure vault consistency');
      expect(content).toContain('automatic recovery');
    });

    it('should have comprehensive README content', async () => {
      const entry = createTestWALEntry();
      await walManager.writeWAL(entry);

      const readmePath = join(TEST_WAL_DIR, 'README.md');
      const content = readFileSync(readmePath, 'utf-8');

      // Verify key sections
      expect(content).toContain('## Purpose');
      expect(content).toContain('## File Format');
      expect(content).toContain('## Recovery');
      expect(content).toContain('## Manual Recovery');
      expect(content).toContain('## File Structure');

      // Verify filename format documented
      expect(content).toContain('{timestamp}-rename-{correlationId}.wal.json');

      // Verify schema version documented
      expect(content).toContain('version 1.0');
    });
  });

  describe('WAL Entry Persistence', () => {
    it('should write WAL with correct filename format', async () => {
      const timestamp = '2025-01-15T10:30:45.123Z';
      const correlationId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
      const entry = createTestWALEntry({
        correlationId,
        timestamp,
      });

      const walPath = await walManager.writeWAL(entry);

      // Filename should have timestamp with colons/dots replaced by hyphens
      const expectedFilename = `2025-01-15T10-30-45-123Z-rename-${correlationId}.wal.json`;
      expect(walPath).toContain(expectedFilename);
    });

    it('should include correlation ID in filename', async () => {
      const correlationId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const entry = createTestWALEntry({ correlationId });
      const walPath = await walManager.writeWAL(entry);

      expect(walPath).toContain(correlationId);
      expect(walPath).toContain('.wal.json');
    });

    it('should persist WAL entry as valid JSON', async () => {
      const entry = createTestWALEntry();
      const walPath = await walManager.writeWAL(entry);

      const content = readFileSync(walPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe('1.0');
      expect(parsed.correlationId).toBe(entry.correlationId);
      expect(parsed.vaultPath).toBe(entry.vaultPath);
      expect(parsed.phase).toBe(entry.phase);
      expect(parsed.operation).toBe('rename_note');
    });

    it('should pretty-print JSON for human readability', async () => {
      const entry = createTestWALEntry();
      const walPath = await walManager.writeWAL(entry);

      const content = readFileSync(walPath, 'utf-8');

      // Pretty-printed JSON should have indentation (2 spaces)
      expect(content).toContain('  "version"');
      expect(content).toContain('  "correlationId"');

      // Should not be minified (would be on single line)
      const lines = content.split('\n');
      expect(lines.length).toBeGreaterThan(10);
    });

    it('should return WAL file path for tracking', async () => {
      const entry = createTestWALEntry();
      const walPath = await walManager.writeWAL(entry);

      expect(walPath).toBeTruthy();
      expect(existsSync(walPath)).toBe(true);
      expect(walPath).toMatch(/\.wal\.json$/);
    });
  });

  describe('WAL Reading and Validation', () => {
    it('should read and parse WAL entry correctly', async () => {
      const correlationId = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';
      const originalEntry = createTestWALEntry({
        correlationId,
        phase: 'commit',
      });
      const walPath = await walManager.writeWAL(originalEntry);

      const readEntry = await walManager.readWAL(walPath);

      expect(readEntry.version).toBe('1.0');
      expect(readEntry.correlationId).toBe(correlationId);
      expect(readEntry.phase).toBe('commit');
      expect(readEntry.operation).toBe('rename_note');
    });

    it('should validate schema version 1.0', async () => {
      const entry = createTestWALEntry();
      const walPath = await walManager.writeWAL(entry);

      const readEntry = await walManager.readWAL(walPath);

      expect(readEntry.version).toBe('1.0');
    });

    it('should throw on unsupported schema version', async () => {
      mkdirSync(TEST_WAL_DIR, { recursive: true });

      const invalidEntry = {
        version: '2.0', // Unsupported version
        correlationId: 'test',
        timestamp: new Date().toISOString(),
      };

      const walPath = join(TEST_WAL_DIR, 'invalid-version.wal.json');
      writeFileSync(walPath, JSON.stringify(invalidEntry), 'utf-8');

      await expect(walManager.readWAL(walPath)).rejects.toThrow(
        'Unsupported WAL schema version: 2.0'
      );
    });

    it('should throw on missing WAL file', async () => {
      const nonExistentPath = join(TEST_WAL_DIR, 'missing.wal.json');

      await expect(walManager.readWAL(nonExistentPath)).rejects.toThrow(
        'WAL file not found'
      );
    });

    it('should throw on corrupted JSON during readWAL', async () => {
      mkdirSync(TEST_WAL_DIR, { recursive: true });

      const walPath = join(TEST_WAL_DIR, 'corrupted.wal.json');
      writeFileSync(walPath, '{ invalid json content', 'utf-8');

      await expect(walManager.readWAL(walPath)).rejects.toThrow();
    });
  });

  describe('WAL Deletion', () => {
    it('should delete existing WAL file', async () => {
      const entry = createTestWALEntry();
      const walPath = await walManager.writeWAL(entry);

      expect(existsSync(walPath)).toBe(true);

      await walManager.deleteWAL(walPath);

      expect(existsSync(walPath)).toBe(false);
    });

    it('should be idempotent when file does not exist', async () => {
      const nonExistentPath = join(TEST_WAL_DIR, 'missing.wal.json');

      // Should not throw
      await expect(walManager.deleteWAL(nonExistentPath)).resolves.not.toThrow();
    });
  });

  describe('Pending WAL Scanning', () => {
    it('should return empty array if directory does not exist', async () => {
      const pendingWALs = await walManager.scanPendingWALs();

      expect(pendingWALs).toEqual([]);
    });

    it('should find WALs older than 1 minute', async () => {
      const correlationId = '11111111-2222-4333-8444-555555555555';
      const entry = createTestWALEntry({ correlationId });
      const walPath = await walManager.writeWAL(entry);

      // Simulate old file by setting modification time to 2 minutes ago
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      utimesSync(walPath, new Date(twoMinutesAgo), new Date(twoMinutesAgo));

      const pendingWALs = await walManager.scanPendingWALs();

      expect(pendingWALs).toHaveLength(1);
      expect(pendingWALs[0].correlationId).toBe(correlationId);
    });

    it('should skip WALs younger than 1 minute', async () => {
      const correlationId = '22222222-3333-4444-8555-666666666666';
      const entry = createTestWALEntry({ correlationId });
      await walManager.writeWAL(entry);

      // File just created, should be <1 minute old
      const pendingWALs = await walManager.scanPendingWALs();

      expect(pendingWALs).toHaveLength(0);
    });

    it('should find multiple old WALs', async () => {
      const correlationId1 = '33333333-4444-4555-8666-777777777777';
      const correlationId2 = '44444444-5555-4666-8777-888888888888';
      const entry1 = createTestWALEntry({ correlationId: correlationId1 });
      const entry2 = createTestWALEntry({ correlationId: correlationId2 });

      const wal1 = await walManager.writeWAL(entry1);
      const wal2 = await walManager.writeWAL(entry2);

      // Set both files to 2 minutes old
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      utimesSync(wal1, new Date(twoMinutesAgo), new Date(twoMinutesAgo));
      utimesSync(wal2, new Date(twoMinutesAgo), new Date(twoMinutesAgo));

      const pendingWALs = await walManager.scanPendingWALs();

      expect(pendingWALs).toHaveLength(2);
      const correlationIds = pendingWALs.map((w) => w.correlationId);
      expect(correlationIds).toContain(correlationId1);
      expect(correlationIds).toContain(correlationId2);
    });

    it('should handle corrupted JSON gracefully during scan', async () => {
      mkdirSync(TEST_WAL_DIR, { recursive: true });

      // Create a corrupted WAL file
      const corruptedPath = join(TEST_WAL_DIR, '2025-01-01-corrupted.wal.json');
      writeFileSync(corruptedPath, '{ corrupted json', 'utf-8');

      // Set file to be old
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      utimesSync(corruptedPath, new Date(twoMinutesAgo), new Date(twoMinutesAgo));

      // Create a valid WAL file
      const validCorrelationId = '55555555-6666-4777-8888-999999999999';
      const validEntry = createTestWALEntry({ correlationId: validCorrelationId });
      const validPath = await walManager.writeWAL(validEntry);
      utimesSync(validPath, new Date(twoMinutesAgo), new Date(twoMinutesAgo));

      // Should log error but continue, returning only valid WAL
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const pendingWALs = await walManager.scanPendingWALs();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(pendingWALs).toHaveLength(1);
      expect(pendingWALs[0].correlationId).toBe(validCorrelationId);

      consoleErrorSpy.mockRestore();
    });

    it('should only scan .wal.json files', async () => {
      mkdirSync(TEST_WAL_DIR, { recursive: true });

      // Create non-WAL files
      writeFileSync(join(TEST_WAL_DIR, 'other-file.txt'), 'test');
      writeFileSync(join(TEST_WAL_DIR, 'README.md'), 'readme');

      // Create a valid old WAL
      const validCorrelationId = '66666666-7777-4888-8999-aaaaaaaaaaaa';
      const entry = createTestWALEntry({ correlationId: validCorrelationId });
      const walPath = await walManager.writeWAL(entry);

      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      utimesSync(walPath, new Date(twoMinutesAgo), new Date(twoMinutesAgo));

      const pendingWALs = await walManager.scanPendingWALs();

      expect(pendingWALs).toHaveLength(1);
      expect(pendingWALs[0].correlationId).toBe(validCorrelationId);
    });

    it('should use file mtime for age calculation', async () => {
      const entry = createTestWALEntry();
      const walPath = await walManager.writeWAL(entry);

      // Verify file was just created (mtime should be recent)
      const stats = require('fs').statSync(walPath);
      const ageMs = Date.now() - stats.mtimeMs;

      expect(ageMs).toBeLessThan(5000); // Created within last 5 seconds

      // Modify mtime to 2 minutes ago
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      utimesSync(walPath, new Date(twoMinutesAgo), new Date(twoMinutesAgo));

      const pendingWALs = await walManager.scanPendingWALs();
      expect(pendingWALs).toHaveLength(1);
    });
  });

  describe('CorrelationId Validation', () => {
    it('should accept valid UUID v4 correlationId', async () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      for (const uuid of validUUIDs) {
        const entry = createTestWALEntry({ correlationId: uuid });
        await expect(walManager.writeWAL(entry)).resolves.toBeTruthy();
      }
    });

    it('should reject non-UUID correlationId', async () => {
      const entry = createTestWALEntry({ correlationId: 'not-a-uuid' });

      await expect(walManager.writeWAL(entry)).rejects.toThrow(
        'Invalid correlationId format (expected UUID v4): not-a-uuid'
      );
    });

    it('should reject UUID v1 format', async () => {
      const entry = createTestWALEntry({
        correlationId: '550e8400-e29b-11d4-a716-446655440000', // v1 (has '1' in version position)
      });

      await expect(walManager.writeWAL(entry)).rejects.toThrow(
        'Invalid correlationId format (expected UUID v4)'
      );
    });

    it('should reject malformed UUID', async () => {
      const entry = createTestWALEntry({
        correlationId: '550e8400-e29b-41d4-a716', // Too short
      });

      await expect(walManager.writeWAL(entry)).rejects.toThrow(
        'Invalid correlationId format (expected UUID v4)'
      );
    });

    it('should reject correlationId with invalid characters', async () => {
      const entry = createTestWALEntry({
        correlationId: '550e8400-e29b-41d4-a716-44665544000g', // 'g' is invalid
      });

      await expect(walManager.writeWAL(entry)).rejects.toThrow(
        'Invalid correlationId format (expected UUID v4)'
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty WAL directory', async () => {
      mkdirSync(TEST_WAL_DIR, { recursive: true });

      const pendingWALs = await walManager.scanPendingWALs();

      expect(pendingWALs).toEqual([]);
    });

    it('should preserve manifest structure in WAL', async () => {
      const manifest: TransactionManifest = {
        noteRename: {
          from: '/vault/original.md',
          to: '/vault/renamed.md',
          sha256Before: 'hash123',
          stagedPath: '/tmp/staged.md',
          completed: false,
        },
        linkUpdates: [
          {
            path: '/vault/file1.md',
            sha256Before: 'hash456',
            renderedContent: 'updated content',
            referenceCount: 3,
            completed: true,
          },
        ],
        totalOperations: 2,
      };

      const entry = createTestWALEntry({ manifest });
      const walPath = await walManager.writeWAL(entry);

      const readEntry = await walManager.readWAL(walPath);

      expect(readEntry.manifest.noteRename.from).toBe('/vault/original.md');
      expect(readEntry.manifest.noteRename.stagedPath).toBe('/tmp/staged.md');
      expect(readEntry.manifest.linkUpdates).toHaveLength(1);
      expect(readEntry.manifest.linkUpdates[0].referenceCount).toBe(3);
      expect(readEntry.manifest.totalOperations).toBe(2);
    });

    it('should handle all transaction phases correctly', async () => {
      const phases: TransactionPhase[] = [
        'plan',
        'prepare',
        'validate',
        'commit',
        'success',
        'abort',
      ];

      // Use different UUID v4 for each phase
      const uuids = [
        '77777777-8888-4999-8aaa-bbbbbbbbbbbb',
        '88888888-9999-4aaa-8bbb-cccccccccccc',
        '99999999-aaaa-4bbb-8ccc-dddddddddddd',
        'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
        'cccccccc-dddd-4eee-8fff-000000000000',
      ];

      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        const correlationId = uuids[i];
        const entry = createTestWALEntry({ phase, correlationId });
        const walPath = await walManager.writeWAL(entry);

        const readEntry = await walManager.readWAL(walPath);
        expect(readEntry.phase).toBe(phase);
      }
    });

    it('should preserve process ID in WAL', async () => {
      const entry = createTestWALEntry({ pid: 12345 });
      const walPath = await walManager.writeWAL(entry);

      const readEntry = await walManager.readWAL(walPath);
      expect(readEntry.pid).toBe(12345);
    });
  });
});
