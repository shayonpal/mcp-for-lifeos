/**
 * Implementation contracts for Linear Issue: MCP-64
 * Issue: Fix daily note task workflow test failures (3 tests)
 *
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 *
 * @since MCP-64
 */

import * as path from 'path';

// ============================================================================
// PATH NORMALIZATION CONTRACTS
// ============================================================================

/**
 * Path normalization utility contract
 *
 * Purpose: Normalize paths that may be relative or absolute for vault operations.
 * Handles both absolute paths from LIFEOS_CONFIG and relative paths from user input.
 *
 * @param inputPath - Path to normalize (relative or absolute)
 * @param basePath - Base path to join with if inputPath is relative
 * @returns Normalized absolute path
 *
 * @example Absolute path (use as-is)
 * ```typescript
 * normalizePath('/Users/shayon/vault/Daily', '/Users/shayon/vault')
 * // Returns: '/Users/shayon/vault/Daily'
 * ```
 *
 * @example Relative path (join with base)
 * ```typescript
 * normalizePath('20 - Areas/21 - Myself/Journals/Daily', '/Users/shayon/vault')
 * // Returns: '/Users/shayon/vault/20 - Areas/21 - Myself/Journals/Daily'
 * ```
 *
 * @example Windows absolute path
 * ```typescript
 * normalizePath('C:\\Users\\vault\\Daily', 'C:\\Users\\vault')
 * // Returns: 'C:\\Users\\vault\\Daily'
 * ```
 */
export interface NormalizePathContract {
  (inputPath: string, basePath: string): string;
}

/**
 * Implementation behavior contract
 */
export const normalizePathBehavior = {
  /**
   * MUST: Use path.isAbsolute() for cross-platform absolute path detection
   * - POSIX: /path/to/file → true
   * - Windows: C:\path\to\file → true
   * - UNC: \\server\share\file → true
   * - Relative: path/to/file → false
   */
  absoluteDetection: 'path.isAbsolute()',

  /**
   * MUST: Return absolute path as-is without modification
   * Rationale: LIFEOS_CONFIG paths are already absolute and correct
   */
  absolutePathBehavior: 'return as-is',

  /**
   * MUST: Join relative paths with basePath using path.join()
   * Rationale: path.join() is cross-platform and handles separators correctly
   */
  relativePathBehavior: 'path.join(basePath, inputPath)',

  /**
   * MUST: Be a pure function (no side effects, deterministic)
   */
  purity: true,

  /**
   * MUST NOT: Perform I/O operations (file exists checks)
   * Rationale: Path normalization is separate concern from validation
   */
  noIO: true,
} as const;

// ============================================================================
// VAULT UTILS ENHANCEMENT CONTRACTS
// ============================================================================

/**
 * VaultUtils.createNote() enhancement contract
 *
 * Purpose: Fix path construction bug where absolute targetFolder paths
 * from LIFEOS_CONFIG were incorrectly joined with vaultPath again.
 *
 * Current behavior (buggy):
 * ```typescript
 * if (targetFolder) {
 *   folderPath = join(LIFEOS_CONFIG.vaultPath, targetFolder);  // Always joins
 * }
 * ```
 *
 * Expected behavior (correct):
 * ```typescript
 * if (targetFolder) {
 *   folderPath = path.isAbsolute(targetFolder)
 *     ? targetFolder  // Use absolute path as-is
 *     : join(LIFEOS_CONFIG.vaultPath, targetFolder);  // Join relative path
 * }
 * ```
 */
export interface CreateNotePathHandlingContract {
  /**
   * Input scenarios this must handle:
   */
  inputs: {
    /**
     * SCENARIO 1: Absolute path from LIFEOS_CONFIG.dailyNotesPath
     * Example: '/Users/shayon/.../LifeOS (iCloud)/20 - Areas/21 - Myself/Journals/Daily'
     * Expected: Use path as-is
     */
    absoluteConfigPath: {
      example: '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)/20 - Areas/21 - Myself/Journals/Daily';
      expected: 'use as-is without joining';
    };

    /**
     * SCENARIO 2: Relative path from DynamicTemplateEngine.inferTargetFolder()
     * Example: '30 - Resources/Recipes'
     * Expected: Join with LIFEOS_CONFIG.vaultPath
     */
    relativeInferredPath: {
      example: '30 - Resources/Recipes';
      expected: 'join(LIFEOS_CONFIG.vaultPath, relativePath)';
    };

    /**
     * SCENARIO 3: Relative path from user input
     * Example: 'Projects/Active'
     * Expected: Join with LIFEOS_CONFIG.vaultPath
     */
    relativeUserPath: {
      example: 'Projects/Active';
      expected: 'join(LIFEOS_CONFIG.vaultPath, relativePath)';
    };
  };

  /**
   * Integration points this affects:
   */
  callers: {
    /**
     * VaultUtils.createDailyNote() - passes absolute dailyNotesPath
     */
    createDailyNote: 'passes LIFEOS_CONFIG.dailyNotesPath (absolute)';

    /**
     * create_note_smart MCP tool - may pass relative or absolute
     */
    createNoteSmart: 'may pass relative or absolute targetFolder';
  };
}

/**
 * VaultUtils.moveItem() consolidation contract
 *
 * Purpose: Update to use shared normalizePath() utility instead of
 * duplicated path normalization logic.
 *
 * Current implementation (lines 1311-1316):
 * ```typescript
 * const normalizedSource = sourcePath.startsWith(LIFEOS_CONFIG.vaultPath)
 *   ? sourcePath
 *   : join(LIFEOS_CONFIG.vaultPath, sourcePath);
 * ```
 *
 * After consolidation:
 * ```typescript
 * const normalizedSource = normalizePath(sourcePath, LIFEOS_CONFIG.vaultPath);
 * const normalizedDest = normalizePath(destinationFolder, LIFEOS_CONFIG.vaultPath);
 * ```
 */
export interface MoveItemConsolidationContract {
  before: 'string prefix check (sourcePath.startsWith(vaultPath))';
  after: 'normalizePath(sourcePath, vaultPath)';
  rationale: 'Eliminate code duplication, use cross-platform path.isAbsolute()';
}

// ============================================================================
// TEST CONTRACTS
// ============================================================================

/**
 * Unit test contract for normalizePath()
 */
export interface NormalizePathTestContract {
  /**
   * Test cases that MUST be covered:
   */
  testCases: {
    /**
     * TC1: Absolute POSIX path
     */
    absolutePosix: {
      input: ['/Users/shayon/vault/Daily', '/Users/shayon/vault'];
      expected: '/Users/shayon/vault/Daily';
    };

    /**
     * TC2: Relative POSIX path
     */
    relativePosix: {
      input: ['20 - Areas/Daily', '/Users/shayon/vault'];
      expected: '/Users/shayon/vault/20 - Areas/Daily';
    };

    /**
     * TC3: Absolute Windows path
     */
    absoluteWindows: {
      input: ['C:\\Users\\vault\\Daily', 'C:\\Users\\vault'];
      expected: 'C:\\Users\\vault\\Daily';
    };

    /**
     * TC4: Relative Windows path
     */
    relativeWindows: {
      input: ['20 - Areas\\Daily', 'C:\\Users\\vault'];
      expected: 'C:\\Users\\vault\\20 - Areas\\Daily';
    };

    /**
     * TC5: Path traversal attempt (security check)
     */
    traversalAttempt: {
      input: ['../../../etc', '/Users/shayon/vault'];
      expected: '/Users/shayon/vault/../../../etc';
      note: 'existsSync() check in createNote() prevents actual security issue';
    };

    /**
     * TC6: UNC path (Windows network share)
     */
    uncPath: {
      input: ['\\\\server\\share\\vault', '\\\\server\\share'];
      expected: '\\\\server\\share\\vault';
    };
  };
}

/**
 * Integration test contract for daily note task workflow
 */
export interface DailyNoteTaskWorkflowTestContract {
  /**
   * Failing tests that MUST pass after fix:
   */
  failingTests: {
    /**
     * Test 1: should add tasks to existing Day's Notes section
     */
    test1: {
      description: 'Daily note creation with task insertion';
      error: 'Target folder does not exist: /var/folders/.../20 - Areas/21 - Myself/Journals/Daily';
      rootCause: 'Path duplication - dailyNotesPath joined with vaultPath twice';
      expectedAfterFix: 'Test passes, task added to correct section';
    };

    /**
     * Test 2: should fail gracefully when heading doesn't exist
     */
    test2: {
      description: 'Graceful error handling for missing heading';
      error: 'Target folder does not exist (before reaching heading check)';
      rootCause: 'Path construction fails before heading validation';
      expectedAfterFix: 'Test passes, throws "Heading not found" error';
    };

    /**
     * Test 3: should not create duplicate files when updating daily notes
     */
    test3: {
      description: 'Multiple updates to same daily note';
      error: 'Target folder does not exist on first update';
      rootCause: 'Path construction fails on note creation';
      expectedAfterFix: 'Test passes, single file created and updated';
    };
  };

  /**
   * Test environment that exercises the fix:
   */
  testSetup: {
    vaultPath: 'Temporary directory: /var/folders/.../test-vault-{random}';
    dailyNotesPath: 'Absolute path within temp vault: {vaultPath}/20 - Areas/21 - Myself/Journals/Daily';
    config: 'LIFEOS_CONFIG.dailyNotesPath set to absolute path';
    verification: 'VaultUtils.resetSingletons() ensures test isolation';
  };
}

// ============================================================================
// ERROR HANDLING CONTRACTS
// ============================================================================

/**
 * Error types that may be thrown:
 *
 * @throws Error - "Target folder does not exist: {folderPath}"
 *   When: existsSync(folderPath) returns false
 *   Cause: Path normalization correct, but folder genuinely missing
 *   Mitigation: Caller should create folder or handle error
 *
 * No new error types introduced - existing error handling preserved.
 */

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Existing interfaces this implementation must conform to:
 */
export interface ExistingInterfaceConformance {
  /**
   * MUST: Maintain VaultUtils method signatures
   */
  vaultUtils: {
    createNote: '(fileName, frontmatter, content, targetFolder?) => LifeOSNote';
    moveItem: '(sourcePath, destinationFolder, ...) => MoveItemsResult';
  };

  /**
   * MUST: Preserve LifeOSNote interface
   */
  lifeOSNote: 'No changes to LifeOSNote interface';

  /**
   * MUST: Maintain backward compatibility
   */
  backwardCompatibility: {
    absolutePaths: 'Work as before (now correctly)';
    relativePaths: 'Work as before (existing behavior)';
  };
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors:
 *
 * MUST:
 * - Add normalizePath() to src/path-utils.ts (follows MCP-89 pattern)
 * - Update VaultUtils.createNote() to use path.isAbsolute() check
 * - Update VaultUtils.moveItem() to use shared normalizePath() utility
 * - Preserve all existing error handling and validation
 * - Pass all 3 failing integration tests
 * - Pass new unit tests for normalizePath()
 * - Maintain TypeScript type safety (npm run typecheck)
 *
 * MUST NOT:
 * - Modify any MCP protocol interfaces
 * - Change VaultUtils method signatures
 * - Alter existing error messages or codes
 * - Introduce new dependencies (uses existing Node.js path module)
 * - Modify test file structure or test setup
 *
 * SHOULD:
 * - Follow MCP-89 consolidation pattern (extract to path-utils.ts)
 * - Use comprehensive JSDoc documentation
 * - Include inline comments explaining cross-platform behavior
 * - Update CHANGELOG.md with fix description
 */

// ============================================================================
// PERFORMANCE CONTRACTS
// ============================================================================

/**
 * Performance characteristics:
 *
 * - normalizePath(): O(1) complexity (path.isAbsolute + conditional join)
 * - No I/O operations in path normalization
 * - No performance regression vs. current buggy implementation
 * - Test suite execution time unchanged
 */

// ============================================================================
// DOCUMENTATION CONTRACTS
// ============================================================================

/**
 * Documentation requirements:
 *
 * - JSDoc for normalizePath() function (purpose, params, returns, examples)
 * - Inline comments in createNote() explaining absolute vs relative handling
 * - Release notes documenting behavior change for create_note_smart
 * - CHANGELOG.md entry with fix description and issue reference
 * - No ADR needed (bug fix, not architectural decision)
 */

// ============================================================================
// VALIDATION STRATEGY
// ============================================================================

/**
 * Contract validation methods:
 *
 * 1. Compile-time: `npm run typecheck` verifies TypeScript conformance
 * 2. Unit tests: Validate normalizePath() edge cases
 * 3. Integration tests: Verify 3 failing tests now pass
 * 4. Full test suite: `npm test` ensures no regressions
 * 5. Manual validation: Daily note creation via Claude Desktop
 */
