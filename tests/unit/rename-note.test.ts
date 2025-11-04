import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { VaultUtils } from '../../src/modules/files/index.js';
import { LIFEOS_CONFIG } from '../../src/config.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import * as fs from 'fs/promises';

describe('VaultUtils.moveItem with newFilename', () => {
  let vaultPath: string;
  let testDir: string;
  let originalConfig: any;

  beforeEach(async () => {
    // Create temporary vault
    const randomId = randomBytes(8).toString('hex');
    vaultPath = join(tmpdir(), `test-vault-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });

    // Set test paths
    testDir = join(vaultPath, 'test-notes');

    // Mock the LIFEOS_CONFIG
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;

    // Reset VaultUtils singletons to use new config
    VaultUtils.resetSingletons();

    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Restore original config
    if (originalConfig) {
      Object.assign(LIFEOS_CONFIG, originalConfig);
    }

    // Clean up temporary vault
    if (vaultPath) {
      await fs.rm(vaultPath, { recursive: true, force: true });
    }
  });

  describe('Basic rename functionality', () => {
    it('should rename a file in the same directory using newFilename option', () => {
      // Create test file
      const originalPath = join(testDir, 'original.md');
      writeFileSync(originalPath, '---\ntitle: Original Note\n---\n\nContent here.');

      // Rename using newFilename option
      const result = VaultUtils.moveItem(
        originalPath,
        testDir,
        { newFilename: 'renamed.md' }
      );

      expect(result.success).toBe(true);
      expect(result.newPath).toBe(join(testDir, 'renamed.md'));
      expect(result.itemType).toBe('note');
      expect(existsSync(originalPath)).toBe(false);
      expect(existsSync(join(testDir, 'renamed.md'))).toBe(true);
    });

    it('should use basename if newFilename not provided (backward compatibility)', () => {
      // Create test file
      const originalPath = join(testDir, 'test.md');
      const destFolder = join(vaultPath, 'moved-notes');
      mkdirSync(destFolder, { recursive: true });
      writeFileSync(originalPath, 'Test content');

      // Move without newFilename (existing behavior)
      const result = VaultUtils.moveItem(
        originalPath,
        destFolder
      );

      expect(result.success).toBe(true);
      expect(result.newPath).toBe(join(destFolder, 'test.md'));
      expect(existsSync(join(destFolder, 'test.md'))).toBe(true);
    });

    it('should handle move and rename in one operation', () => {
      // Create test file
      const originalPath = join(testDir, 'original.md');
      const destFolder = join(vaultPath, 'new-folder');
      mkdirSync(destFolder, { recursive: true });
      writeFileSync(originalPath, 'Content');

      // Move to different folder AND rename
      const result = VaultUtils.moveItem(
        originalPath,
        destFolder,
        { newFilename: 'new-name.md' }
      );

      expect(result.success).toBe(true);
      expect(result.newPath).toBe(join(destFolder, 'new-name.md'));
      expect(existsSync(originalPath)).toBe(false);
      expect(existsSync(join(destFolder, 'new-name.md'))).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should return error if source file does not exist', () => {
      const nonExistentPath = join(testDir, 'does-not-exist.md');

      const result = VaultUtils.moveItem(
        nonExistentPath,
        testDir,
        { newFilename: 'renamed.md' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Source item not found');
    });

    it('should return error if destination file already exists without overwrite', () => {
      // Create both source and destination files
      const sourcePath = join(testDir, 'source.md');
      const existingPath = join(testDir, 'existing.md');
      writeFileSync(sourcePath, 'Source content');
      writeFileSync(existingPath, 'Existing content');

      // Try to rename to existing filename
      const result = VaultUtils.moveItem(
        sourcePath,
        testDir,
        { newFilename: 'existing.md' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should overwrite destination if overwrite=true', async () => {
      // Create both source and destination files
      const sourcePath = join(testDir, 'source.md');
      const existingPath = join(testDir, 'existing.md');
      writeFileSync(sourcePath, 'Source content');
      writeFileSync(existingPath, 'Existing content');

      // Rename with overwrite
      const result = VaultUtils.moveItem(
        sourcePath,
        testDir,
        { newFilename: 'existing.md', overwrite: true }
      );

      expect(result.success).toBe(true);
      expect(result.newPath).toBe(existingPath);

      // Verify content was replaced
      const content = await fs.readFile(existingPath, 'utf-8');
      expect(content).toBe('Source content');
    });

    it('should return error if destination folder does not exist without createDestination', () => {
      const sourcePath = join(testDir, 'source.md');
      const nonExistentFolder = join(vaultPath, 'does-not-exist');
      writeFileSync(sourcePath, 'Content');

      const result = VaultUtils.moveItem(
        sourcePath,
        nonExistentFolder,
        { newFilename: 'renamed.md' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Destination folder does not exist');
    });

    it('should create destination folder if createDestination=true', () => {
      const sourcePath = join(testDir, 'source.md');
      const newFolder = join(vaultPath, 'auto-created');
      writeFileSync(sourcePath, 'Content');

      const result = VaultUtils.moveItem(
        sourcePath,
        newFolder,
        { newFilename: 'renamed.md', createDestination: true }
      );

      expect(result.success).toBe(true);
      expect(result.newPath).toBe(join(newFolder, 'renamed.md'));
      expect(existsSync(join(newFolder, 'renamed.md'))).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle files with spaces in names', () => {
      const sourcePath = join(testDir, 'file with spaces.md');
      writeFileSync(sourcePath, 'Content');

      const result = VaultUtils.moveItem(
        sourcePath,
        testDir,
        { newFilename: 'renamed file.md' }
      );

      expect(result.success).toBe(true);
      expect(result.newPath).toBe(join(testDir, 'renamed file.md'));
    });

    it('should preserve file content during rename', async () => {
      const sourcePath = join(testDir, 'source.md');
      const originalContent = '---\ntitle: Test\ntags: [test, rename]\n---\n\n# Content\n\nSome text.';
      writeFileSync(sourcePath, originalContent);

      const result = VaultUtils.moveItem(
        sourcePath,
        testDir,
        { newFilename: 'renamed.md' }
      );

      expect(result.success).toBe(true);

      const newContent = await fs.readFile(result.newPath, 'utf-8');
      expect(newContent).toBe(originalContent);
    });
  });
});
