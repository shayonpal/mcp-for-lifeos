/**
 * Implementation contracts for Linear Issue: MCP-123
 * Issue: Dry-Run Enhanced Preview (Link Updates, Transaction Phases)
 *
 * Extends MCP-122 dry-run foundation with enhanced preview capabilities:
 * - Link update detection (files containing links to renamed note)
 * - Transaction phase descriptions (5-phase commit protocol)
 * - Estimated execution time (based on file count and link updates)
 *
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-123
 */

import type {
  RenameNoteInput,
  RenameNoteOutput,
} from './MCP-105-contracts.js';
import type {
  DryRunRenameInput,
  RenamePreviewOutput,
} from './MCP-mcp-122-contracts.js';
import type { TransactionPhase } from './MCP-108-contracts.js';

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Input schema for enhanced dry-run preview
 *
 * Uses existing DryRunRenameInput from MCP-122
 * No new input parameters needed - only output enhancement
 */
export type EnhancedDryRunInput = DryRunRenameInput;

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Transaction phase description
 *
 * Describes what each phase of the transaction does
 */
export interface TransactionPhaseDescription {
  /**
   * Phase name from five-phase protocol
   */
  name: TransactionPhase;

  /**
   * Human-readable description of what this phase does
   */
  description: string;

  /**
   * Order in execution sequence (1-5)
   */
  order: number;
}

/**
 * Link update details for dry-run preview
 *
 * Shows which files would be affected by link updates
 */
export interface LinkUpdatePreview {
  /**
   * Number of files containing links to the renamed note
   */
  filesWithLinks: number;

  /**
   * Paths to files that would be updated
   * Relative to vault root for readability
   */
  affectedPaths: string[];

  /**
   * Total number of link references across all files
   */
  totalReferences: number;
}

/**
 * Estimated execution time range
 *
 * Provides min/max estimates based on operation complexity
 */
export interface TimeEstimate {
  /**
   * Minimum expected execution time (milliseconds)
   * Base case: no link updates, optimal conditions
   */
  min: number;

  /**
   * Maximum expected execution time (milliseconds)
   * Worst case: many link updates, iCloud sync delays
   */
  max: number;
}

/**
 * Enhanced preview response for dry-run mode
 *
 * Extends MCP-122 basic preview with link updates and transaction details
 */
export interface EnhancedRenamePreviewOutput {
  /**
   * Success indicator (preview generated successfully)
   */
  success: true;

  /**
   * Enhanced preview metadata
   */
  preview: {
    /**
     * Operation type (always "rename" for this tool)
     */
    operation: 'rename';

    /**
     * Source path that would be renamed
     */
    oldPath: string;

    /**
     * Destination path for rename
     */
    newPath: string;

    /**
     * Whether link updates would occur
     */
    willUpdateLinks: boolean;

    /**
     * Total number of files that would be affected
     * - 1 for note rename
     * - Additional count for each file with links (if updateLinks: true)
     */
    filesAffected: number;

    /**
     * Execution mode indicator
     */
    executionMode: 'dry-run';

    /**
     * Link update details (only present if updateLinks: true)
     * Undefined if updateLinks: false
     */
    linkUpdates?: LinkUpdatePreview;

    /**
     * Transaction phases that would execute
     * Always 5 phases regardless of updateLinks setting
     */
    transactionPhases: TransactionPhaseDescription[];

    /**
     * Estimated execution time range
     */
    estimatedTime: TimeEstimate;
  };
}

/**
 * Combined output type for rename with enhanced dry-run support
 *
 * Type union for actual execution vs enhanced preview
 */
export type RenameWithEnhancedPreviewResult =
  | RenameNoteOutput
  | EnhancedRenamePreviewOutput;

// ============================================================================
// LINK SCANNER INTEGRATION
// ============================================================================

/**
 * Link scanner interface contract
 *
 * Uses existing LinkScanner.scanVaultForLinks() from MCP-107
 */
export interface LinkScannerContract {
  /**
   * Scan vault for links to a specific note
   *
   * @param targetNoteName - Note name without .md extension
   * @returns Scan result with affected files and reference counts
   */
  scanVaultForLinks(targetNoteName: string): Promise<{
    scanTimeMs: number;
    affectedFiles: Array<{
      path: string;
      referenceCount: number;
    }>;
    totalReferences: number;
  }>;
}

// ============================================================================
// PREVIEW HELPER CONTRACTS
// ============================================================================

/**
 * Transaction phase definitions
 *
 * Static descriptions for the five-phase commit protocol
 */
export const TRANSACTION_PHASES: TransactionPhaseDescription[] = [
  {
    name: 'plan',
    description: 'Validate paths and detect conflicts',
    order: 1,
  },
  {
    name: 'prepare',
    description: 'Stage files for atomic rename',
    order: 2,
  },
  {
    name: 'validate',
    description: 'Check for concurrent modifications',
    order: 3,
  },
  {
    name: 'commit',
    description: 'Execute rename and update links',
    order: 4,
  },
  {
    name: 'success',
    description: 'Remove staging files and finalize',
    order: 5,
  },
];

/**
 * Time estimation constants
 *
 * Empirical values based on MCP-108 performance testing
 */
export const TIME_ESTIMATION = {
  /**
   * Base time for note rename operation (milliseconds)
   * Includes plan, prepare, validate, commit, success phases
   */
  BASE_RENAME_TIME: 50,

  /**
   * Time per link update operation (milliseconds)
   * Includes file read, content update, atomic write
   */
  TIME_PER_LINK_FILE: 10,

  /**
   * Transaction overhead (milliseconds)
   * WAL writes, SHA-256 hashing, cleanup
   */
  TRANSACTION_OVERHEAD: 30,

  /**
   * Variation factor for min/max estimation
   * Accounts for iCloud sync delays and filesystem performance
   */
  VARIATION_FACTOR: 0.5, // ±50%
} as const;

/**
 * Enhanced preview generation function contract
 *
 * Extends MCP-122 previewRenameOperation with link scanning and time estimation
 */
export interface EnhancedPreviewFunctionContract {
  /**
   * Generate enhanced preview with link updates and transaction details
   *
   * @param oldPath - Source note path (normalized)
   * @param newPath - Destination note path (normalized)
   * @param updateLinks - Whether link updates would occur
   * @param context - Tool handler context
   * @returns Enhanced preview response
   */
  (
    oldPath: string,
    newPath: string,
    updateLinks: boolean,
    context: any // ToolHandlerContext
  ): Promise<any>; // CallToolResult with EnhancedRenamePreviewOutput
}

// ============================================================================
// IMPLEMENTATION STRATEGY
// ============================================================================

/**
 * Implementation approach
 *
 * Extends MCP-122 previewRenameOperation() helper in note-handlers.ts:
 *
 * 1. **Validate paths** (existing MCP-122 logic via TransactionManager.plan())
 *    - Check oldPath exists and is .md file
 *    - Check newPath doesn't exist
 *    - Validate paths within vault
 *
 * 2. **Scan for links** (NEW - if updateLinks: true)
 *    - Extract note name from oldPath (without .md extension)
 *    - Call LinkScanner.scanVaultForLinks(noteName)
 *    - Build LinkUpdatePreview from scan result
 *    - Calculate filesAffected = 1 (note) + affectedFiles.length
 *
 * 3. **Build transaction phases** (NEW)
 *    - Use TRANSACTION_PHASES constant array
 *    - Update commit phase description with link count if applicable
 *    - Return all 5 phases in order
 *
 * 4. **Estimate execution time** (NEW)
 *    - Base: TIME_ESTIMATION.BASE_RENAME_TIME
 *    - Links: affectedFiles.length * TIME_ESTIMATION.TIME_PER_LINK_FILE
 *    - Overhead: TIME_ESTIMATION.TRANSACTION_OVERHEAD
 *    - Total = base + links + overhead
 *    - Min = total * (1 - VARIATION_FACTOR)
 *    - Max = total * (1 + VARIATION_FACTOR)
 *
 * 5. **Return enhanced preview** (extends MCP-122)
 *    - Include all MCP-122 fields (operation, paths, willUpdateLinks, executionMode)
 *    - Add linkUpdates (if updateLinks: true)
 *    - Add transactionPhases array
 *    - Add estimatedTime object
 *    - Update filesAffected count
 *
 * Benefits:
 * - Reuses MCP-122 validation logic (no duplication)
 * - Uses existing LinkScanner infrastructure (MCP-107)
 * - Provides actionable preview information for AI agents
 * - Performance: <5s for 1000 note vault (scan time included)
 */

// ============================================================================
// HANDLER INTEGRATION
// ============================================================================

/**
 * Integration point in note-handlers.ts
 *
 * Modification location: previewRenameOperation() helper function
 *
 * Changes required:
 * 1. Import LinkScanner from link-scanner.ts
 * 2. Import time estimation constants
 * 3. Add link scanning logic after plan() call
 * 4. Build enhanced preview object
 * 5. Return EnhancedRenamePreviewOutput instead of RenamePreviewOutput
 *
 * Backward compatibility:
 * - EnhancedRenamePreviewOutput is superset of RenamePreviewOutput
 * - Existing MCP-122 consumers see additional fields (safe additive change)
 * - Type union RenameWithEnhancedPreviewResult includes both types
 */

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error handling for enhanced dry-run mode
 *
 * Uses existing RenameNoteError interface from MCP-105-contracts
 * Same error codes as MCP-122:
 * - FILE_NOT_FOUND: oldPath doesn't exist
 * - FILE_EXISTS: newPath already exists
 * - INVALID_PATH: Path validation failed
 * - PERMISSION_DENIED: Filesystem access denied
 * - UNKNOWN_ERROR: Unexpected error during preview
 *
 * NO new error codes needed for enhanced preview
 * Link scanning errors wrapped in UNKNOWN_ERROR with descriptive message
 */

// ============================================================================
// VALIDATION CONTRACTS
// ============================================================================

/**
 * Validation requirements
 *
 * MUST validate (via TransactionManager.plan()):
 * - oldPath exists and is .md file
 * - newPath has .md extension
 * - newPath doesn't already exist
 * - Paths are within vault
 * - No directory traversal attempts
 *
 * MUST validate (enhanced preview):
 * - LinkScanner returns valid scan result
 * - affectedFiles array contains valid paths
 * - referenceCount values are non-negative integers
 *
 * MUST NOT:
 * - Execute filesystem operations (except reads for link scanning)
 * - Create staging directories
 * - Write WAL entries
 * - Modify any files
 * - Update links (even if willUpdateLinks: true)
 *
 * Preview-specific validations:
 * - dryRun === true (type guard)
 * - Link scanning completes within timeout (<5s for large vaults)
 * - All validations identical to actual execution
 */

// ============================================================================
// PERFORMANCE CONTRACTS
// ============================================================================

/**
 * Performance requirements
 *
 * MUST meet performance targets:
 * - Preview generation: <50ms for no link updates
 * - Preview generation: <5s for 1000 note vault with link scanning
 * - Link scanning: Uses existing LinkScanner.scanVaultForLinks() performance
 * - Memory: Negligible overhead for preview objects (~1KB)
 *
 * Performance optimization strategies:
 * - Link scanning only when updateLinks: true
 * - Use cached LinkScanner results if available
 * - Lazy evaluation of transaction phases (static array)
 * - Simple arithmetic for time estimation (no complex calculations)
 *
 * Acceptable trade-offs:
 * - Preview may take longer than MCP-122 due to link scanning
 * - <5s is acceptable for comprehensive preview in large vaults
 * - Actual execution time may vary from estimate (estimate is guidance only)
 */

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Test requirements
 *
 * UNIT TESTS (tests/unit/rename-note.test.ts):
 * - Enhanced preview includes linkUpdates when updateLinks: true
 * - Enhanced preview omits linkUpdates when updateLinks: false
 * - Enhanced preview includes 5 transaction phases
 * - Transaction phases in correct order (1-5)
 * - Commit phase description updated with link count
 * - Enhanced preview includes estimatedTime with min/max
 * - Time estimation calculations correct
 * - filesAffected = 1 + affectedFiles.length when updateLinks: true
 * - filesAffected = 1 when updateLinks: false
 * - Validation errors returned as RenameNoteError (same as MCP-122)
 * - executionMode is "dry-run"
 *
 * INTEGRATION TESTS (tests/integration/rename-note.integration.test.ts):
 * - Link scanning finds correct affected files
 * - Link scanning counts correct total references
 * - Preview generation completes in <5s for 1000 note vault
 * - No filesystem modifications during preview
 * - Multiple previews don't affect each other
 * - Preview accuracy: link counts match actual execution
 *
 * ERROR TESTS:
 * - FILE_NOT_FOUND when oldPath missing
 * - FILE_EXISTS when newPath exists
 * - INVALID_PATH for bad paths
 * - LinkScanner errors wrapped in UNKNOWN_ERROR
 * - Graceful handling of large vault scan timeouts
 *
 * Test file locations:
 * - Unit: tests/unit/rename-note.test.ts (add "Enhanced Dry-Run Preview" suite)
 * - Integration: tests/integration/rename-note.integration.test.ts (add scanning tests)
 */

// ============================================================================
// DOCUMENTATION CONTRACTS
// ============================================================================

/**
 * Documentation updates required
 *
 * Files to update:
 * 1. docs/tools/rename_note.md
 *    - Add enhanced preview example
 *    - Document linkUpdates field structure
 *    - Document transactionPhases array
 *    - Document estimatedTime calculation
 *    - Show before/after comparison with MCP-122
 *
 * 2. CHANGELOG.md
 *    - Add MCP-123 entry under "Enhancements"
 *    - Document additive changes (backward compatible)
 *    - Link to Linear issue
 *
 * 3. dev/contracts/MCP-123-contracts.ts (this file)
 *    - Comprehensive contract documentation
 *    - Implementation strategy
 *    - Integration points
 *
 * Documentation format:
 * - Use concrete examples with real vault paths
 * - Show JSON response format for enhanced preview
 * - Document performance characteristics
 * - Explain time estimation methodology
 */

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors
 *
 * MUST:
 * - Return enhanced preview when dryRun === true
 * - Include linkUpdates ONLY when updateLinks === true
 * - Include transactionPhases (always 5 phases)
 * - Include estimatedTime (always min/max)
 * - Update filesAffected count based on link scanning results
 * - Scan vault for links when updateLinks === true
 * - Use existing LinkScanner.scanVaultForLinks() method
 * - Validate all inputs (same as actual execution)
 * - Return same error types as actual execution
 * - NOT modify filesystem
 * - NOT create staging directories
 * - NOT write WAL entries
 * - Use TransactionManager.plan() for validation
 * - Format commit phase description with link count
 *
 * MUST NOT:
 * - Execute TransactionManager.execute()
 * - Call prepare/validate/commit phases (only plan)
 * - Modify any files in vault
 * - Create temporary files
 * - Update links (even if willUpdateLinks: true)
 * - Block on slow link scanning (timeout: 5s)
 * - Throw errors for link scanning failures (wrap in UNKNOWN_ERROR)
 *
 * PERFORMANCE:
 * - Preview should complete in <50ms when updateLinks: false (MCP-122 baseline)
 * - Preview should complete in <5s when updateLinks: true with large vault
 * - Link scanning should not block server responsiveness
 * - Time estimation should be simple arithmetic (no complex algorithms)
 *
 * USER EXPERIENCE:
 * - Enhanced preview provides actionable information for AI agents
 * - Link update details help users understand impact before execution
 * - Transaction phases explain what will happen during execution
 * - Time estimates set realistic expectations for execution duration
 * - Backward compatible with MCP-122 consumers (additive changes only)
 */

// ============================================================================
// MIGRATION FROM MCP-122
// ============================================================================

/**
 * Migration strategy
 *
 * Changes to existing code:
 * 1. src/server/handlers/note-handlers.ts
 *    - Modify previewRenameOperation() function
 *    - Add link scanning logic
 *    - Add time estimation logic
 *    - Build EnhancedRenamePreviewOutput
 *
 * Backward compatibility:
 * - EnhancedRenamePreviewOutput extends RenamePreviewOutput
 * - All MCP-122 fields preserved
 * - Additional fields are optional or additive
 * - Existing consumers see superset of data (safe)
 *
 * Breaking changes:
 * - NONE - purely additive enhancement
 *
 * Deprecations:
 * - NONE - MCP-122 functionality fully preserved
 */
