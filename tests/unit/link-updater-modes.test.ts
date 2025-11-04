/**
 * Unit tests for Link Updater Modes (MCP-116)
 *
 * Tests the three-mode functionality: render, commit, direct
 * Verifies:
 * - Render mode generates content map without writes
 * - Commit mode writes from pre-rendered map
 * - Direct mode preserves Phase 3 behavior
 * - Backward compatibility maintained
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-116
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import {
  updateVaultLinks,
  type LinkRenderResult,
  type LinkUpdateResult,
  type LinkCommitInput
} from '../../src/modules/links/index.js';
import { VaultUtils } from '../../src/modules/files/index.js';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('Link Updater Modes (MCP-116)', () => {
  let testVaultPath: string;
  let originalConfig: any;

  beforeEach(async () => {
    // Create temporary test vault
    const randomId = randomBytes(8).toString('hex');
    testVaultPath = path.join(tmpdir(), `test-vault-modes-${randomId}`);
    fs.mkdirSync(testVaultPath, { recursive: true });

    // Mock the LIFEOS_CONFIG
    const { LIFEOS_CONFIG } = await import('../../src/shared/index.js');
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = testVaultPath;

    // Reset VaultUtils singleton to pick up new vault path
    VaultUtils.resetSingletons();
  });

  afterEach(async () => {
    // Restore original config
    if (originalConfig) {
      const { LIFEOS_CONFIG } = await import('../../src/shared/index.js');
      Object.assign(LIFEOS_CONFIG, originalConfig);
    }

    // Cleanup
    if (testVaultPath && fs.existsSync(testVaultPath)) {
      fs.rmSync(testVaultPath, { recursive: true, force: true });
    }

    // Reset VaultUtils singleton
    VaultUtils.resetSingletons();
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Create test note with wikilink references
   */
  function createNoteWithLinks(
    filename: string,
    content: string
  ): string {
    const notePath = path.join(testVaultPath, filename);
    fs.writeFileSync(notePath, content, 'utf-8');
    return notePath;
  }

  // ============================================================================
  // RENDER MODE TESTS
  // ============================================================================

  describe('Render Mode', () => {
    it('should generate content map without performing writes', async () => {
      // Setup: Create notes with wikilinks
      createNoteWithLinks('source.md', 'Link to [[old-note]]');
      createNoteWithLinks('another.md', 'Another link to [[old-note]]');
      createNoteWithLinks('old-note.md', '# Old Note');

      // Track file modification times before render
      const sourceStats = fs.statSync(path.join(testVaultPath, 'source.md'));
      const anotherStats = fs.statSync(path.join(testVaultPath, 'another.md'));

      // Execute: Render mode
      const result = await updateVaultLinks('old-note', 'new-note', {
        mode: 'render'
      }) as LinkRenderResult;

      // Verify: No writes performed
      const sourceStatsAfter = fs.statSync(path.join(testVaultPath, 'source.md'));
      const anotherStatsAfter = fs.statSync(path.join(testVaultPath, 'another.md'));

      expect(sourceStats.mtimeMs).toBe(sourceStatsAfter.mtimeMs);
      expect(anotherStats.mtimeMs).toBe(anotherStatsAfter.mtimeMs);

      // Verify: Content map generated
      expect(result.contentMap).toBeInstanceOf(Map);
      expect(result.contentMap.size).toBeGreaterThan(0);
    });

    it('should include all affected files in result', async () => {
      // Setup
      createNoteWithLinks('file1.md', '[[old-note]]');
      createNoteWithLinks('file2.md', '[[old-note]]');
      createNoteWithLinks('file3.md', '[[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Execute
      const result = await updateVaultLinks('old-note', 'new-note', {
        mode: 'render'
      }) as LinkRenderResult;

      // Verify
      expect(result.affectedFiles).toHaveLength(3);
      expect(result.affectedFiles).toContain(path.join(testVaultPath, 'file1.md'));
      expect(result.affectedFiles).toContain(path.join(testVaultPath, 'file2.md'));
      expect(result.affectedFiles).toContain(path.join(testVaultPath, 'file3.md'));
    });

    it('should include scan time metric', async () => {
      // Setup
      createNoteWithLinks('source.md', '[[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Execute
      const result = await updateVaultLinks('old-note', 'new-note', {
        mode: 'render'
      }) as LinkRenderResult;

      // Verify
      expect(result.scanTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.scanTimeMs).toBe('number');
    });

    it('should include render time metric', async () => {
      // Setup
      createNoteWithLinks('source.md', '[[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Execute
      const result = await updateVaultLinks('old-note', 'new-note', {
        mode: 'render'
      }) as LinkRenderResult;

      // Verify
      expect(result.renderTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.renderTimeMs).toBe('number');
    });

    it('should include total reference count', async () => {
      // Setup: Multiple references in different files
      createNoteWithLinks('file1.md', '[[old-note]] and [[old-note]] again');
      createNoteWithLinks('file2.md', 'Link to [[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Execute
      const result = await updateVaultLinks('old-note', 'new-note', {
        mode: 'render'
      }) as LinkRenderResult;

      // Verify
      expect(result.totalReferences).toBeGreaterThanOrEqual(3);
      expect(typeof result.totalReferences).toBe('number');
    });

    it('should have correct content map structure (Map<string, string>)', async () => {
      // Setup
      createNoteWithLinks('source.md', 'Content with [[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Execute
      const result = await updateVaultLinks('old-note', 'new-note', {
        mode: 'render'
      }) as LinkRenderResult;

      // Verify
      expect(result.contentMap).toBeInstanceOf(Map);

      // Check map entries
      for (const [filePath, updatedContent] of result.contentMap.entries()) {
        expect(typeof filePath).toBe('string');
        expect(typeof updatedContent).toBe('string');
        expect(path.isAbsolute(filePath)).toBe(true);
      }
    });

    it('should compute correct updated content in map', async () => {
      // Setup
      const sourcePath = createNoteWithLinks(
        'source.md',
        'Link to [[old-note]] here'
      );
      createNoteWithLinks('old-note.md', '# Old');

      // Execute
      const result = await updateVaultLinks('old-note', 'new-note', {
        mode: 'render'
      }) as LinkRenderResult;

      // Verify: Content map has updated links
      const updatedContent = result.contentMap.get(sourcePath);
      expect(updatedContent).toBeDefined();
      expect(updatedContent).toContain('[[new-note]]');
      expect(updatedContent).not.toContain('[[old-note]]');
    });
  });

  // ============================================================================
  // COMMIT MODE TESTS
  // ============================================================================

  describe('Commit Mode', () => {
    it('should write from pre-rendered content map', async () => {
      // Setup: Create files
      const sourcePath = createNoteWithLinks('source.md', 'Original [[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // First render
      const renderResult = await updateVaultLinks('old-note', 'new-note', {
        mode: 'render'
      }) as LinkRenderResult;

      // Execute: Commit
      const commitInput: LinkCommitInput = {
        contentMap: renderResult.contentMap,
        totalReferences: renderResult.totalReferences
      };

      const result = await updateVaultLinks('old-note', 'new-note', {
        mode: 'commit',
        commitInput
      }) as LinkUpdateResult;

      // Verify: Files updated
      const updatedContent = fs.readFileSync(sourcePath, 'utf-8');
      expect(updatedContent).toContain('[[new-note]]');
      expect(updatedContent).not.toContain('[[old-note]]');

      // Verify: Result structure
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBeGreaterThan(0);
    });

    it('should return LinkUpdateResult', async () => {
      // Setup
      createNoteWithLinks('source.md', '[[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Render first
      const renderResult = await updateVaultLinks('old-note', 'new-note', {
        mode: 'render'
      }) as LinkRenderResult;

      // Execute: Commit
      const result = await updateVaultLinks('old-note', 'new-note', {
        mode: 'commit',
        commitInput: {
          contentMap: renderResult.contentMap,
          totalReferences: renderResult.totalReferences
        }
      }) as LinkUpdateResult;

      // Verify: Correct result type
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('updatedCount');
      expect(result).toHaveProperty('totalReferences');
      expect(result).toHaveProperty('failedFiles');
      expect(result).toHaveProperty('partialSuccess');
      expect(result).toHaveProperty('scanTimeMs');
      expect(result).toHaveProperty('updateTimeMs');
    });

    it('should handle empty content map', async () => {
      // Setup: Empty content map
      const commitInput: LinkCommitInput = {
        contentMap: new Map(),
        totalReferences: 0
      };

      // Execute
      const result = await updateVaultLinks('old-note', 'new-note', {
        mode: 'commit',
        commitInput
      }) as LinkUpdateResult;

      // Verify
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
      expect(result.failedFiles).toHaveLength(0);
    });

    it('should throw error if commitInput is missing', async () => {
      // Execute & Verify
      await expect(
        updateVaultLinks('old-note', 'new-note', {
          mode: 'commit'
        } as any) // Intentionally invalid
      ).rejects.toThrow('commitInput is required for COMMIT mode');
    });
  });

  // ============================================================================
  // DIRECT MODE TESTS
  // ============================================================================

  describe('Direct Mode', () => {
    it('should preserve Phase 3 behavior', async () => {
      // Setup
      const sourcePath = createNoteWithLinks('source.md', 'Link [[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Execute: Direct mode (explicit)
      const result = await updateVaultLinks('old-note', 'new-note', {
        mode: 'direct'
      }) as LinkUpdateResult;

      // Verify: Files updated immediately
      const updatedContent = fs.readFileSync(sourcePath, 'utf-8');
      expect(updatedContent).toContain('[[new-note]]');
      expect(updatedContent).not.toContain('[[old-note]]');

      // Verify: Result structure matches Phase 3
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBeGreaterThan(0);
      expect(result.totalReferences).toBeGreaterThan(0);
      expect(result.scanTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.updateTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should be default when mode not specified', async () => {
      // Setup
      const sourcePath = createNoteWithLinks('source.md', '[[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Execute: No mode specified (should default to direct)
      const result = await updateVaultLinks('old-note', 'new-note') as LinkUpdateResult;

      // Verify: Direct mode behavior (files updated)
      const updatedContent = fs.readFileSync(sourcePath, 'utf-8');
      expect(updatedContent).toContain('[[new-note]]');

      // Verify: Result is LinkUpdateResult (not LinkRenderResult)
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('updatedCount');
      expect(result.updatedCount).toBeGreaterThan(0);
    });

    it('should handle failures gracefully in direct mode', async () => {
      // Setup: Create a file and make it read-only to force failure
      const readonlyPath = createNoteWithLinks('readonly.md', '[[old-note]]');
      createNoteWithLinks('success.md', '[[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Make file read-only
      fs.chmodSync(readonlyPath, 0o444);

      try {
        // Execute
        const result = await updateVaultLinks('old-note', 'new-note', {
          mode: 'direct'
        }) as LinkUpdateResult;

        // Verify: Partial success
        expect(result.partialSuccess).toBe(true);
        expect(result.updatedCount).toBeGreaterThan(0);
        expect(result.failedFiles.length).toBeGreaterThan(0);

        // Verify: Failed file details
        const failedFile = result.failedFiles.find(f => f.path === readonlyPath);
        expect(failedFile).toBeDefined();
        expect(failedFile?.error).toBeDefined();
      } finally {
        // Cleanup: Restore permissions
        fs.chmodSync(readonlyPath, 0o644);
      }
    });
  });

  // ============================================================================
  // BACKWARD COMPATIBILITY TESTS
  // ============================================================================

  describe('Backward Compatibility', () => {
    it('should work with existing calls (no options parameter)', async () => {
      // Setup
      const sourcePath = createNoteWithLinks('source.md', '[[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Execute: Legacy call style (no options)
      const result = await updateVaultLinks('old-note', 'new-note') as LinkUpdateResult;

      // Verify: Works as before
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBeGreaterThan(0);

      const updatedContent = fs.readFileSync(sourcePath, 'utf-8');
      expect(updatedContent).toContain('[[new-note]]');
    });

    it('should maintain existing result structure for direct mode', async () => {
      // Setup
      createNoteWithLinks('source.md', '[[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Execute
      const result = await updateVaultLinks('old-note', 'new-note') as LinkUpdateResult;

      // Verify: All expected fields present
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('updatedCount');
      expect(result).toHaveProperty('totalReferences');
      expect(result).toHaveProperty('failedFiles');
      expect(result).toHaveProperty('partialSuccess');
      expect(result).toHaveProperty('scanTimeMs');
      expect(result).toHaveProperty('updateTimeMs');

      // Verify: Types correct
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.updatedCount).toBe('number');
      expect(typeof result.totalReferences).toBe('number');
      expect(Array.isArray(result.failedFiles)).toBe(true);
      expect(typeof result.partialSuccess).toBe('boolean');
      expect(typeof result.scanTimeMs).toBe('number');
      expect(typeof result.updateTimeMs).toBe('number');
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should validate required parameters', async () => {
      // Execute & Verify: Empty oldNoteName
      await expect(
        updateVaultLinks('', 'new-note')
      ).rejects.toThrow('Old note name and new note name are required');

      // Execute & Verify: Empty newNoteName
      await expect(
        updateVaultLinks('old-note', '')
      ).rejects.toThrow('Old note name and new note name are required');
    });

    it('should handle render mode errors gracefully', async () => {
      // Setup: Create a file that will fail to read
      const failPath = path.join(testVaultPath, 'fail.md');
      fs.writeFileSync(failPath, '[[old-note]]', 'utf-8');

      // Create another valid file
      createNoteWithLinks('success.md', '[[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Make fail.md unreadable
      fs.chmodSync(failPath, 0o000);

      try {
        // Execute: Should not throw, just skip the unreadable file
        const result = await updateVaultLinks('old-note', 'new-note', {
          mode: 'render'
        }) as LinkRenderResult;

        // Verify: Other files processed
        expect(result.contentMap.size).toBeGreaterThan(0);
      } finally {
        // Cleanup: Restore permissions
        fs.chmodSync(failPath, 0o644);
      }
    });

    it('should handle commit mode errors gracefully', async () => {
      // Setup: Create content map with non-existent directory
      const contentMap = new Map<string, string>();
      contentMap.set('/nonexistent/path/file.md', 'content');
      contentMap.set(path.join(testVaultPath, 'valid.md'), 'valid content');

      // Execute
      const result = await updateVaultLinks('old-note', 'new-note', {
        mode: 'commit',
        commitInput: { contentMap, totalReferences: 0 }
      }) as LinkUpdateResult;

      // Verify: Partial success with failures tracked
      expect(result.failedFiles.length).toBeGreaterThan(0);
      expect(result.failedFiles[0].path).toBe('/nonexistent/path/file.md');
    });
  });

  // ============================================================================
  // INTEGRATION TESTS (MODE COMBINATIONS)
  // ============================================================================

  describe('Mode Integration', () => {
    it('should successfully chain render → commit', async () => {
      // Setup
      const sourcePath = createNoteWithLinks(
        'source.md',
        'Content with [[old-note]] link'
      );
      createNoteWithLinks('old-note.md', '# Old');

      // Phase 1: Render
      const renderResult = await updateVaultLinks('old-note', 'new-note', {
        mode: 'render'
      }) as LinkRenderResult;

      // Verify render result
      expect(renderResult.contentMap.size).toBeGreaterThan(0);

      // Phase 2: Commit
      const commitResult = await updateVaultLinks('old-note', 'new-note', {
        mode: 'commit',
        commitInput: {
          contentMap: renderResult.contentMap,
          totalReferences: renderResult.totalReferences
        }
      }) as LinkUpdateResult;

      // Verify commit result
      expect(commitResult.success).toBe(true);
      expect(commitResult.updatedCount).toBe(renderResult.affectedFiles.length);

      // Verify actual file content
      const finalContent = fs.readFileSync(sourcePath, 'utf-8');
      expect(finalContent).toContain('[[new-note]]');
      expect(finalContent).not.toContain('[[old-note]]');
    });

    it('should produce same result: render+commit vs direct', async () => {
      // Setup: Create identical vault setups
      const file1Path = createNoteWithLinks('file1.md', '[[old-note]]');
      const file2Path = createNoteWithLinks('file2.md', '[[old-note]] twice [[old-note]]');
      createNoteWithLinks('old-note.md', '# Old');

      // Approach 1: Render + Commit
      const renderResult = await updateVaultLinks('old-note', 'new-note-1', {
        mode: 'render'
      }) as LinkRenderResult;

      const commitResult = await updateVaultLinks('old-note', 'new-note-1', {
        mode: 'commit',
        commitInput: {
          contentMap: renderResult.contentMap,
          totalReferences: renderResult.totalReferences
        }
      }) as LinkUpdateResult;

      const renderCommitContent1 = fs.readFileSync(file1Path, 'utf-8');
      const renderCommitContent2 = fs.readFileSync(file2Path, 'utf-8');

      // Reset files for approach 2
      fs.writeFileSync(file1Path, '[[old-note]]', 'utf-8');
      fs.writeFileSync(file2Path, '[[old-note]] twice [[old-note]]', 'utf-8');

      // Approach 2: Direct
      const directResult = await updateVaultLinks('old-note', 'new-note-1') as LinkUpdateResult;

      const directContent1 = fs.readFileSync(file1Path, 'utf-8');
      const directContent2 = fs.readFileSync(file2Path, 'utf-8');

      // Verify: Same content produced
      expect(renderCommitContent1).toBe(directContent1);
      expect(renderCommitContent2).toBe(directContent2);

      // Verify: Same success metrics
      expect(commitResult.success).toBe(directResult.success);
      expect(commitResult.updatedCount).toBe(directResult.updatedCount);
    });
  });
});
