/**
 * Implementation contracts for Linear Issue: MCP-107
 * Issue: Link Update Implementation (no rollback)
 *
 * Phase 3 of rename_note implementation: Update wikilinks in vault files after note rename.
 * This phase does NOT include rollback/transaction safety (deferred to MCP-108).
 *
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-107
 */

import type { LinkReference, LinkScanResult } from '../../src/modules/links/index.js';

// ============================================================================
// CORE LINK UPDATE CONTRACTS
// ============================================================================

/**
 * Result of updating wikilinks across the vault
 *
 * Phase 3 returns partial success information without rollback capability.
 * If some files fail to update, operation continues with remaining files.
 */
export interface LinkUpdateResult {
  /**
   * Whether link updates completed without errors
   * - true: All referenced files updated successfully
   * - false: One or more files failed to update
   */
  success: boolean;

  /**
   * Number of files successfully updated
   */
  updatedCount: number;

  /**
   * Total number of link references found across vault
   * (from LinkScanner.scanVaultForLinks)
   */
  totalReferences: number;

  /**
   * Files that failed to update with error details
   * Empty array if all updates succeeded
   */
  failedFiles: LinkUpdateFailure[];

  /**
   * Whether operation completed with partial success
   * - true: Some files updated, some failed
   * - false: All succeeded or all failed
   */
  partialSuccess: boolean;

  /**
   * Scan time from LinkScanner operation (milliseconds)
   */
  scanTimeMs: number;

  /**
   * Total update time including file I/O (milliseconds)
   */
  updateTimeMs: number;
}

/**
 * Details about a file that failed to update
 */
export interface LinkUpdateFailure {
  /**
   * Path to the file that failed
   */
  path: string;

  /**
   * Error message describing why update failed
   */
  error: string;

  /**
   * Number of link references in this file (from LinkReference)
   */
  referenceCount: number;
}

// ============================================================================
// FUNCTION CONTRACTS
// ============================================================================

/**
 * Contract for updateVaultLinks function
 *
 * Orchestrates vault-wide link updates:
 * 1. Use LinkScanner.scanVaultForLinks() to find all references
 * 2. Update each referenced file with updateNoteLinks()
 * 3. Collect success/failure information
 * 4. Return structured result
 *
 * MUST:
 * - Use LinkScanner.scanVaultForLinks() for discovery (don't duplicate logic)
 * - Use VaultUtils.readFileWithRetry/writeFileWithRetry for file I/O
 * - Continue updating remaining files on individual failures
 * - Preserve frontmatter using gray-matter
 * - Handle case-insensitive matching (Obsidian default)
 * - Track timing for performance monitoring
 *
 * MUST NOT:
 * - Revert file rename on link update failures (no rollback in Phase 3)
 * - Stop processing on first failure (collect all errors)
 * - Modify YAML frontmatter content
 * - Implement parallel updates (use sequential for iCloud safety)
 *
 * @param oldNoteName - Original note name (without .md extension)
 * @param newNoteName - New note name (without .md extension)
 * @returns Promise resolving to LinkUpdateResult with success/failure details
 *
 * @throws Error if vault cannot be accessed
 * @throws Error if oldNoteName or newNoteName are empty
 */
export type UpdateVaultLinksFunction = (
  oldNoteName: string,
  newNoteName: string
) => Promise<LinkUpdateResult>;

/**
 * Contract for updateNoteLinks function
 *
 * Updates all matching wikilinks in a single note's content.
 * Uses String.replace() with WIKILINK_PATTERN callback for precision.
 *
 * MUST:
 * - Use WIKILINK_PATTERN from regex-utils.ts for matching
 * - Preserve all link components (alias, heading, block ref, embed flag)
 * - Handle case-insensitive matching (compare with .toLowerCase())
 * - Strip .md extension from both old and new names for comparison
 * - Return updated content with only target note name changed
 *
 * MUST NOT:
 * - Modify links that don't match target note
 * - Change link formatting or whitespace
 * - Corrupt link components (alias, heading, block ref)
 * - Modify content outside of wikilinks
 *
 * @param content - Full note content (including frontmatter)
 * @param oldNoteName - Original note name to match (without .md)
 * @param newNoteName - New note name to replace with (without .md)
 * @returns Updated content with wikilinks rewritten
 *
 * @example
 * updateNoteLinks(
 *   'See [[OldNote]] and [[OldNote|Alias]]',
 *   'OldNote',
 *   'NewNote'
 * )
 * // Returns: 'See [[NewNote]] and [[NewNote|Alias]]'
 */
export type UpdateNoteLinksFunction = (
  content: string,
  oldNoteName: string,
  newNoteName: string
) => string;

/**
 * Contract for buildNewLinkText function
 *
 * Reconstructs wikilink text from components with new target note name.
 * Pure function for building correctly formatted wikilinks.
 *
 * MUST:
 * - Preserve embed flag if present (!)
 * - Preserve heading reference if present (#heading)
 * - Preserve block reference if present (^block)
 * - Preserve alias if present (|alias)
 * - Follow Obsidian wikilink format: [[target#heading^block|alias]]
 * - Order components correctly: target, heading, block, alias
 *
 * MUST NOT:
 * - Add components that weren't in original link
 * - Change component formatting (# vs ^)
 * - Reorder components
 * - Add whitespace within brackets
 *
 * @param embedFlag - '!' if embed, undefined otherwise
 * @param targetNote - New note name to use as target (without .md)
 * @param heading - Heading reference text (without #)
 * @param blockRef - Block reference text (without ^)
 * @param alias - Alias display text (without |)
 * @returns Formatted wikilink text with new target
 *
 * @example
 * buildNewLinkText(undefined, 'NewNote', 'Section', undefined, 'Link')
 * // Returns: '[[NewNote#Section|Link]]'
 *
 * @example
 * buildNewLinkText('!', 'NewNote', undefined, undefined, undefined)
 * // Returns: '![[NewNote]]'
 */
export type BuildNewLinkTextFunction = (
  embedFlag: string | undefined,
  targetNote: string,
  heading: string | undefined,
  blockRef: string | undefined,
  alias: string | undefined
) => string;

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Integration point with renameNoteHandler
 *
 * When updateLinks flag is true in RenameNoteInput:
 * 1. renameNoteHandler performs file rename via VaultUtils.moveItem()
 * 2. If rename succeeds AND updateLinks is true:
 *    - Extract note names from old/new paths (strip extensions, get basenames)
 *    - Call updateVaultLinks(oldName, newName)
 *    - Collect result
 * 3. Build RenameNoteOutput with link update status:
 *    - If partialSuccess: Add warning message to warnings array
 *    - If complete failure: Add warning about link update failure
 *    - Include success count in warning message
 *
 * Handler MUST:
 * - Perform file rename BEFORE link updates
 * - Only call updateVaultLinks if updateLinks flag is true
 * - Add warnings to RenameNoteOutput for partial/complete failures
 * - NOT revert file rename if link updates fail
 * - Remove Phase 1 limitation warning when updateLinks is true
 *
 * Handler MUST NOT:
 * - Call updateVaultLinks if file rename fails
 * - Fail entire operation if link updates fail (graceful degradation)
 * - Modify RenameNoteError structure (keep existing error codes)
 */
export interface RenameHandlerIntegration {
  /**
   * When this integration is active
   */
  condition: 'updateLinks flag is true in RenameNoteInput';

  /**
   * Integration timing
   */
  timing: 'After successful file rename via VaultUtils.moveItem()';

  /**
   * Function to call
   */
  function: 'updateVaultLinks(oldNoteName, newNoteName)';

  /**
   * How to handle result
   */
  resultHandling: {
    onSuccess: 'No additional warnings needed';
    onPartialSuccess: 'Add warning: "Updated N links, M files failed"';
    onCompleteFailure: 'Add warning: "Link updates failed: [error details]"';
  };
}

// ============================================================================
// INTEGRATION WITH EXISTING TYPES
// ============================================================================

/**
 * Existing types from MCP-106 that MUST be used
 */
export interface MCP106Dependencies {
  /**
   * LinkScanner class from src/link-scanner.ts
   * - Use: LinkScanner.scanVaultForLinks() to find all references
   * - Do NOT: Duplicate link detection logic
   */
  LinkScanner: 'src/link-scanner.ts';

  /**
   * LinkReference interface from src/link-scanner.ts
   * - Use: Extract sourcePath for file updates
   * - Contains: All link metadata (target, alias, heading, block, line/column)
   */
  LinkReference: 'src/link-scanner.ts';

  /**
   * LinkScanResult interface from src/link-scanner.ts
   * - Use: Get totalReferences and scanTimeMs for LinkUpdateResult
   * - Contains: All scan results and metadata
   */
  LinkScanResult: 'src/link-scanner.ts';

  /**
   * WIKILINK_PATTERN constant from src/regex-utils.ts
   * - Use: For String.replace() callback in updateNoteLinks()
   * - Do NOT: Create new regex pattern
   */
  WIKILINK_PATTERN: 'src/regex-utils.ts';
}

/**
 * Existing utilities from VaultUtils that MUST be used
 */
export interface VaultUtilsDependencies {
  /**
   * VaultUtils.readFileWithRetry() - Read file with iCloud sync retry
   * - Use: For reading note content before updating
   * - Do NOT: Use fs.readFile() directly
   */
  readFileWithRetry: 'VaultUtils.readFileWithRetry(path)';

  /**
   * VaultUtils.writeFileWithRetry() - Write file with iCloud sync retry
   * - Use: For writing updated note content
   * - Do NOT: Use fs.writeFile() directly
   */
  writeFileWithRetry: 'VaultUtils.writeFileWithRetry(path, content)';
}

/**
 * Path utilities that MUST be used
 */
export interface PathUtilsDependencies {
  /**
   * stripMdExtension utility
   * - Use: For normalizing note names before comparison
   * - Ensures: Consistent handling of .md extensions
   */
  stripMdExtension: 'Strip .md extension from filenames for comparison';

  /**
   * basename from Node.js path module
   * - Use: Extract note name from full path
   * - Needed: For integration with renameNoteHandler
   */
  basename: 'Extract filename from path';
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error conditions that may occur during link updates
 *
 * Phase 3 does NOT throw errors for individual file failures.
 * Instead, collect failures in LinkUpdateFailure[] and continue processing.
 *
 * Errors that SHOULD be thrown:
 * - Empty note name parameters (validation error)
 * - Vault access failure (from LinkScanner)
 * - All files failed to update (complete failure)
 *
 * Errors that should NOT be thrown:
 * - Individual file write failures (collect in failedFiles)
 * - Permission errors on specific files (collect in failedFiles)
 * - iCloud sync conflicts (VaultUtils retry handles)
 */
export type LinkUpdateErrors =
  | 'INVALID_PARAMETERS'    // Empty note names
  | 'VAULT_ACCESS_FAILED'   // Cannot scan vault
  | 'COMPLETE_FAILURE';     // All file updates failed

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors for link update implementation
 */
export interface BehavioralContracts {
  MUST: {
    /**
     * Use LinkScanner for discovery
     * - Call LinkScanner.scanVaultForLinks() to find references
     * - Do NOT duplicate link detection logic
     */
    useLinkScanner: true;

    /**
     * Preserve frontmatter
     * - Use gray-matter to parse YAML frontmatter
     * - Only update content section, not frontmatter
     * - Use matter.stringify() to rebuild file
     */
    preserveFrontmatter: true;

    /**
     * Continue on failures
     * - Collect individual file failures
     * - Continue processing remaining files
     * - Return partial success result
     */
    continueOnFailures: true;

    /**
     * Sequential file updates
     * - Update files one at a time (not parallel)
     * - Use VaultUtils retry logic for each file
     * - Safer for iCloud sync
     */
    sequentialUpdates: true;

    /**
     * Case-insensitive matching
     * - Compare note names with .toLowerCase()
     * - Matches Obsidian behavior
     * - Handles [[note]], [[Note]], [[NOTE]] identically
     */
    caseInsensitiveMatching: true;

    /**
     * Format preservation
     * - Preserve all link components exactly
     * - Don't add/remove whitespace
     * - Don't modify non-matching links
     */
    formatPreservation: true;
  };

  MUST_NOT: {
    /**
     * No rollback in Phase 3
     * - Do NOT revert file rename on link update failures
     * - Phase 4 (MCP-108) will add transaction safety
     */
    noRollback: true;

    /**
     * No parallel processing
     * - Do NOT update files in parallel
     * - Sequential is safer for iCloud sync
     */
    noParallelProcessing: true;

    /**
     * No frontmatter modification
     * - Do NOT update wikilinks in YAML frontmatter
     * - gray-matter handles boundary detection
     * - Frontmatter link updates deferred to MCP-110
     */
    noFrontmatterModification: true;

    /**
     * No duplicate logic
     * - Do NOT reimplement link detection
     * - Do NOT create new WIKILINK_PATTERN
     * - Do NOT implement custom file I/O retry
     */
    noDuplication: true;
  };
}

// ============================================================================
// PERFORMANCE CONTRACTS
// ============================================================================

/**
 * Performance expectations for link update operations
 */
export interface PerformanceContracts {
  /**
   * Acceptable performance for personal vault usage
   * - 100 link updates: <5 seconds
   * - Sequential updates with retry: acceptable trade-off
   * - Optimization deferred until real-world performance issues
   */
  acceptablePerformance: {
    linkUpdates100: '<5 seconds';
    linkUpdates1000: '<60 seconds (acceptable for rare operations)';
    approach: 'Sequential with retry logic';
    optimization: 'Deferred to future if needed';
  };

  /**
   * Performance monitoring
   * - Track scanTimeMs from LinkScanner
   * - Track updateTimeMs for file I/O
   * - Include in LinkUpdateResult for analysis
   */
  monitoring: {
    scanTimeMs: 'From LinkScanner.scanVaultForLinks()';
    updateTimeMs: 'Total file update time';
    purpose: 'Future optimization decisions';
  };
}

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Required test coverage for link update implementation
 */
export interface TestingContracts {
  unitTests: {
    /**
     * buildNewLinkText() - All format combinations
     * - Basic: [[Note]]
     * - Alias: [[Note|Alias]]
     * - Heading: [[Note#Heading]]
     * - Block: [[Note^block]]
     * - Embed: ![[Note]]
     * - Combinations: [[Note#Heading|Alias]], etc.
     */
    buildNewLinkText: '9+ format tests';

    /**
     * updateNoteLinks() - Content transformation
     * - Single link update
     * - Multiple links in content
     * - Case-insensitive matching
     * - Frontmatter preservation
     * - Non-matching links preserved
     */
    updateNoteLinks: '15+ transformation tests';

    /**
     * updateVaultLinks() - Orchestration with mocks
     * - Mock LinkScanner.scanVaultForLinks()
     * - Mock VaultUtils file I/O
     * - Test success/failure collection
     * - Test partial success handling
     */
    updateVaultLinks: '10+ orchestration tests';
  };

  integrationTests: {
    /**
     * Real vault with temp directories
     * - Full rename + link update flow
     * - Multiple files with various link formats
     * - Partial failure scenarios
     * - Frontmatter preservation validation
     */
    vaultOperations: '12+ integration tests';

    /**
     * Error recovery
     * - Individual file failures
     * - Permission errors
     * - Continue with remaining files
     */
    errorScenarios: '5+ error tests';
  };

  vaultSafety: {
    /**
     * Production vault protection
     * - Always use temp directories
     * - Call VaultUtils.resetSingletons()
     * - Never touch production vault
     */
    tempVaultOnly: 'CRITICAL: No production vault access in tests';
  };
}
