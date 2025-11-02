/**
 * Implementation contracts for Linear Issue: MCP-122
 * Issue: Dry-Run Mode Foundation (Basic Preview)
 *
 * Implements basic preview functionality for rename_note operations.
 * The dryRun parameter (currently accepted but ignored) will return a preview
 * of the operation without executing filesystem changes.
 *
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-122
 */

import type { RenameNoteInput, RenameNoteOutput } from './MCP-105-contracts.js';

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Input schema for dry-run preview
 *
 * Uses existing RenameNoteInput with dryRun: true
 * No new input parameters needed - contract extension only
 */
export type DryRunRenameInput = RenameNoteInput & {
  /**
   * Enable dry-run mode (preview without execution)
   * When true, returns preview object instead of performing rename
   */
  dryRun: true;
};

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Preview response for dry-run mode
 *
 * Returns operation details without executing filesystem changes
 */
export interface RenamePreviewOutput {
  /**
   * Success indicator (preview generated successfully)
   */
  success: true;

  /**
   * Preview metadata indicating this is a dry-run
   */
  preview: {
    /**
     * Operation type (always "rename" for this phase)
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
     * Number of files that would be affected
     * - 1 for note rename
     * - Additional count if link updates enabled (future enhancement)
     */
    filesAffected: number;

    /**
     * Execution mode indicator
     */
    executionMode: 'dry-run';
  };
}

/**
 * Combined output type for rename with dry-run support
 */
export type RenameWithPreviewResult = RenameNoteOutput | RenamePreviewOutput;

// ============================================================================
// IMPLEMENTATION STRATEGY
// ============================================================================

/**
 * Implementation approach using TransactionManager.plan()
 *
 * The TransactionManager already has a plan() method that:
 * 1. Validates source/destination paths
 * 2. Computes SHA-256 hashes
 * 3. Builds operation manifest
 * 4. Does NOT execute filesystem changes
 *
 * Dry-run implementation strategy:
 * 1. Check if dryRun === true in renameNoteHandler
 * 2. Call TransactionManager.plan() for validation
 * 3. Build RenamePreviewOutput from manifest
 * 4. Return preview without calling execute()
 *
 * Benefits:
 * - Reuses existing validation logic
 * - Same error detection as actual execution
 * - Minimal code changes (early return in handler)
 * - No new TransactionManager methods needed
 */

// ============================================================================
// HANDLER INTEGRATION
// ============================================================================

/**
 * Integration point in note-handlers.ts
 *
 * Modification location: renameNoteHandler function
 * Add after path normalization, before TransactionManager.execute()
 *
 * Pseudocode:
 * ```typescript
 * // After path normalization (line ~224)
 * const normalizedOldPath = normalizePath(...);
 * const normalizedNewPath = normalizePath(...);
 *
 * // NEW: Dry-run early return
 * if (typedArgs.dryRun === true) {
 *   return await previewRenameOperation(
 *     normalizedOldPath,
 *     normalizedNewPath,
 *     typedArgs.updateLinks ?? true,
 *     context
 *   );
 * }
 *
 * // Existing transaction execution continues...
 * const txManager = await getTransactionManager();
 * const result = await txManager.execute(...);
 * ```
 */

// ============================================================================
// HELPER FUNCTION CONTRACT
// ============================================================================

/**
 * Preview helper function signature
 *
 * Calls TransactionManager.plan() and formats as preview response
 */
export interface PreviewRenameFunction {
  (
    oldPath: string,
    newPath: string,
    updateLinks: boolean,
    context: any // ToolHandlerContext
  ): Promise<any>; // CallToolResult with RenamePreviewOutput
}

/**
 * Preview function implementation contract
 *
 * Implementation steps:
 * 1. Get TransactionManager instance (use existing getTransactionManager())
 * 2. Call txManager.plan(oldPath, newPath, updateLinks)
 * 3. Handle validation errors (FILE_NOT_FOUND, FILE_EXISTS, etc.)
 * 4. Build RenamePreviewOutput from manifest
 * 5. Return formatted CallToolResult
 *
 * Error handling:
 * - plan() throws for validation failures (FILE_NOT_FOUND, FILE_EXISTS)
 * - Wrap in try-catch and return error as RenameNoteError
 * - Same error codes as actual execution for consistency
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
 * MUST NOT:
 * - Execute filesystem operations
 * - Create staging directories
 * - Write WAL entries
 * - Modify any files
 *
 * Preview-specific validations:
 * - dryRun === true (type guard)
 * - All other validations identical to actual execution
 */

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error handling for dry-run mode
 *
 * Uses existing RenameNoteError interface from MCP-105-contracts
 * Same error codes:
 * - FILE_NOT_FOUND: oldPath doesn't exist
 * - FILE_EXISTS: newPath already exists
 * - INVALID_PATH: Path validation failed
 * - PERMISSION_DENIED: Filesystem access denied
 * - UNKNOWN_ERROR: Unexpected error during planning
 *
 * NO new error codes needed for dry-run
 * Errors have same format as actual execution
 */

// ============================================================================
// RESPONSE FORMAT CONTRACTS
// ============================================================================

/**
 * Response format for dry-run preview
 *
 * Returns JSON-formatted CallToolResult:
 * {
 *   "content": [{
 *     "type": "text",
 *     "text": "{...RenamePreviewOutput as JSON...}"
 *   }]
 * }
 *
 * Success response example:
 * {
 *   "success": true,
 *   "preview": {
 *     "operation": "rename",
 *     "oldPath": "/vault/Projects/old.md",
 *     "newPath": "/vault/Projects/new.md",
 *     "willUpdateLinks": true,
 *     "filesAffected": 1,
 *     "executionMode": "dry-run"
 *   }
 * }
 *
 * Error response example (uses existing RenameNoteError):
 * {
 *   "success": false,
 *   "error": "Source file not found: /vault/Projects/missing.md",
 *   "errorCode": "FILE_NOT_FOUND"
 * }
 */

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Test requirements
 *
 * UNIT TESTS:
 * - Dry-run returns preview without filesystem changes
 * - Preview includes correct paths and metadata
 * - Validation errors returned as RenameNoteError
 * - filesAffected count is accurate
 * - executionMode is "dry-run"
 *
 * INTEGRATION TESTS:
 * - File remains at oldPath after dry-run
 * - No staging directory created
 * - No WAL entry written
 * - Multiple dry-runs don't affect filesystem
 *
 * ERROR TESTS:
 * - FILE_NOT_FOUND when oldPath missing
 * - FILE_EXISTS when newPath exists
 * - INVALID_PATH for bad paths
 */

/**
 * Test file locations
 * - Unit: tests/unit/rename-note.test.ts (add dry-run suite)
 * - Integration: tests/integration/rename-note.integration.test.ts
 */

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors
 *
 * MUST:
 * - Return preview when dryRun === true
 * - Validate all inputs (same as actual execution)
 * - Return same error types as actual execution
 * - NOT modify filesystem
 * - NOT create staging directories
 * - NOT write WAL entries
 * - Use TransactionManager.plan() for validation
 *
 * MUST NOT:
 * - Execute TransactionManager.execute()
 * - Call prepare/validate/commit phases
 * - Modify any files in vault
 * - Create temporary files
 * - Update links (even if willUpdateLinks: true)
 *
 * PERFORMANCE:
 * - Preview should complete in <50ms (faster than actual execution)
 * - Only plan phase overhead (path validation + SHA-256 computation)
 * - No staging or WAL overhead
 */

// ============================================================================
// INTEGRATION POINTS
// ============================================================================

/**
 * Files to modify
 *
 * PRIMARY:
 * - src/server/handlers/note-handlers.ts
 *   - Add previewRenameOperation() helper function
 *   - Modify renameNoteHandler to check dryRun flag
 *   - Early return with preview if dryRun === true
 *
 * TESTS:
 * - tests/unit/rename-note.test.ts
 *   - Add "Dry-run mode" test suite
 * - tests/integration/rename-note.integration.test.ts
 *   - Add integration tests for preview
 *
 * DOCUMENTATION:
 * - docs/tools/rename_note.md
 *   - Update with dry-run parameter documentation
 *   - Add preview response format examples
 *
 * NO CHANGES NEEDED:
 * - src/transaction-manager.ts (reuses existing plan() method)
 * - src/server/tool-registry.ts (dryRun already in schema)
 * - dev/contracts/MCP-105-contracts.ts (RenameNoteInput already has dryRun)
 */

// ============================================================================
// DEPENDENCIES
// ============================================================================

/**
 * Required dependencies (all existing)
 *
 * - TransactionManager (src/transaction-manager.ts)
 *   - Uses plan() method for validation
 * - RenameNoteInput (dev/contracts/MCP-105-contracts.ts)
 *   - Already includes dryRun parameter
 * - RenameNoteError (dev/contracts/MCP-105-contracts.ts)
 *   - Reuses existing error structure
 * - normalizePath (src/path-utils.ts)
 *   - Path normalization
 * - addVersionMetadata (src/server/tool-registry.ts)
 *   - Response formatting
 *
 * NO NEW DEPENDENCIES REQUIRED
 */

// ============================================================================
// DESIGN DECISIONS
// ============================================================================

/**
 * Key design decisions and rationale
 *
 * 1. REUSE TransactionManager.plan() vs CREATE separate validation
 *    Decision: Reuse existing plan() method
 *    Rationale: DRY principle, same validation logic, no code duplication
 *    Impact: Minimal code changes, consistent validation
 *
 * 2. EARLY RETURN in handler vs MODIFY TransactionManager
 *    Decision: Early return in renameNoteHandler
 *    Rationale: Separation of concerns, TransactionManager unchanged
 *    Impact: Simple implementation, no transaction infrastructure changes
 *
 * 3. PREVIEW format matches transaction result
 *    Decision: Similar structure to RenameNoteOutput but with preview key
 *    Rationale: Consistent API, easy to distinguish preview vs execution
 *    Impact: Clear user feedback, predictable structure
 *
 * 4. SAME error codes as actual execution
 *    Decision: Reuse RenameNoteError interface unchanged
 *    Rationale: Consistent error handling, no new error types
 *    Impact: Simplified error handling, predictable failures
 *
 * 5. filesAffected count for future enhancement
 *    Decision: Include filesAffected: 1 now (only note rename)
 *    Rationale: Forward compatibility for link update counting
 *    Impact: API stability when link updates implemented
 */

/**
 * Implementation checklist
 *
 * [ ] Add previewRenameOperation() function to note-handlers.ts
 * [ ] Modify renameNoteHandler to check dryRun flag
 * [ ] Add early return with preview when dryRun === true
 * [ ] Add unit tests for dry-run mode
 * [ ] Add integration tests verifying no filesystem changes
 * [ ] Update docs/tools/rename_note.md with preview examples
 * [ ] Run npm run typecheck to verify contracts
 * [ ] Manual test in Claude Desktop with dryRun: true
 */
