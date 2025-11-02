/**
 * Implementation contracts for Linear Issue: MCP-105
 * Issue: Basic Rename Tool (without link updates)
 *
 * Phase 1 of rename_note implementation: Working rename tool without link update functionality.
 *
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-105
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolHandler, ToolHandlerContext } from './MCP-8-contracts.js';

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Input schema for rename_note tool
 *
 * NOTE: This is Phase 1 - basic rename without link updates.
 * The updateLinks and dryRun flags are accepted but IGNORED in this phase.
 * They are included for forward compatibility with future phases.
 *
 * @see MCP-106 (Phase 2) for link detection implementation
 * @see MCP-107 (Phase 3) for link update implementation
 * @see MCP-109 (Phase 5) for dry-run mode implementation
 */
export interface RenameNoteInput {
  /**
   * Current path to the note (absolute or relative to vault)
   * Can be full path or filename if unique
   */
  oldPath: string;

  /**
   * New path for the note (absolute or relative to vault)
   * Can be full path or just new filename
   */
  newPath: string;

  /**
   * Whether to update wikilinks after rename
   *
   * PHASE 1: This flag is ACCEPTED but IGNORED
   * - Default: false
   * - Implementation: MCP-107 (Phase 3)
   * - Behavior: Tool documents that link updates not yet implemented
   */
  updateLinks?: boolean;

  /**
   * Dry-run mode: preview changes without executing
   *
   * PHASE 1: This flag is ACCEPTED but IGNORED
   * - Default: false
   * - Implementation: MCP-109 (Phase 5)
   * - Behavior: Tool documents that dry-run not yet implemented
   */
  dryRun?: boolean;
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Output schema for successful rename operation
 */
export interface RenameNoteOutput {
  /**
   * Success indicator
   */
  success: true;

  /**
   * Original path that was renamed
   */
  oldPath: string;

  /**
   * New path after rename
   */
  newPath: string;

  /**
   * Message confirming the rename
   */
  message: string;

  /**
   * Transaction correlation ID (Phase 4: MCP-108)
   * Only present when using transactional rename
   */
  correlationId?: string;

  /**
   * Transaction performance metrics (Phase 4: MCP-108)
   * Only present when using transactional rename
   */
  metrics?: {
    totalTimeMs: number;
    phaseTimings: Partial<Record<string, number>>;
  };

  /**
   * @deprecated **BREAKING CHANGE in Phase 4 (MCP-108)**: The warnings field has been removed.
   *
   * **Migration Guide:**
   * - Previous behavior: Partial success with warnings array (e.g., link update failures)
   * - New behavior: Atomic transactions - operations fully succeed or fully fail
   * - Link update failures now return `success: false` with `TRANSACTION_FAILED` error code
   * - Transaction metadata provides detailed failure information
   *
   * **Why this changed:**
   * - Ensures vault consistency - no partial states
   * - Prevents data corruption from incomplete operations
   * - Automatic rollback on any failure
   *
   * **What to do:**
   * - Check `success` field - false indicates complete failure, not partial success
   * - Use `transactionMetadata` in error responses for failure details
   * - See CHANGELOG for complete migration guide
   */
  warnings?: never;
}

/**
 * Error response for failed rename operation
 */
/**
 * Transaction error codes (Phase 4: MCP-108)
 */
export type TransactionErrorCode =
  | 'TRANSACTION_PLAN_FAILED'
  | 'TRANSACTION_PREPARE_FAILED'
  | 'TRANSACTION_VALIDATE_FAILED'
  | 'TRANSACTION_COMMIT_FAILED'
  | 'TRANSACTION_ROLLBACK_FAILED'
  | 'TRANSACTION_STALE_CONTENT'
  | 'TRANSACTION_FAILED';

/**
 * Transaction metadata for error responses (Phase 4: MCP-108)
 */
export interface TransactionMetadata {
  /** Transaction phase where error occurred */
  phase: string;

  /** Transaction correlation ID for tracing */
  correlationId: string;

  /** Files affected by transaction */
  affectedFiles: string[];

  /** Rollback status */
  rollbackStatus: 'not_started' | 'in_progress' | 'success' | 'partial' | 'failed';

  /** Specific operation failures */
  failures?: Array<{
    path: string;
    operation: 'note_rename' | 'link_update';
    error: string;
  }>;

  /** Recommended recovery action */
  recoveryAction: 'retry' | 'manual_recovery' | 'contact_support';

  /** WAL path (for manual recovery) */
  walPath?: string;

  /** Manual recovery instructions */
  recoveryInstructions?: string[];
}

export interface RenameNoteError {
  /**
   * Failure indicator
   */
  success: false;

  /**
   * Error message explaining what went wrong
   */
  error: string;

  /**
   * Error code for programmatic handling
   * Extended in Phase 4 (MCP-108) with transaction error codes
   */
  errorCode: 'FILE_NOT_FOUND' | 'FILE_EXISTS' | 'INVALID_PATH' | 'PERMISSION_DENIED' | 'UNKNOWN_ERROR' | TransactionErrorCode;

  /**
   * Transaction metadata (Phase 4: MCP-108)
   * Only present when errorCode is a transaction error
   */
  transactionMetadata?: TransactionMetadata;
}

/**
 * Combined output type for rename operation
 */
export type RenameNoteResult = RenameNoteOutput | RenameNoteError;

// ============================================================================
// VAULT UTILS ENHANCEMENT CONTRACTS
// ============================================================================

/**
 * Enhancement contract for VaultUtils.moveItem()
 *
 * DESIGN DECISION: Enhance existing moveItem() instead of creating new renameNote()
 *
 * Current behavior:
 * - moveItem(sourcePath, destinationFolder, options)
 * - Uses renameSync() for file operations
 * - Detects same-folder moves when dirname(source) === destination
 *
 * Enhanced behavior:
 * - Add optional newFilename parameter
 * - Support in-place rename: when dirname(source) === destination && newFilename provided
 * - Maintain backward compatibility: if newFilename not provided, use basename(source)
 * - Preserve existing validation and error handling
 *
 * Example usage:
 * ```typescript
 * // Rename in same folder
 * moveItem('/vault/note.md', '/vault', { newFilename: 'renamed.md' })
 *
 * // Move to different folder (existing behavior)
 * moveItem('/vault/note.md', '/vault/subfolder')
 *
 * // Move and rename in one operation
 * moveItem('/vault/note.md', '/vault/subfolder', { newFilename: 'renamed.md' })
 * ```
 */
export interface EnhancedMoveItemOptions {
  /**
   * Create destination folder if it doesn't exist
   * Existing option from moveItem()
   */
  createDestination?: boolean;

  /**
   * Overwrite existing file at destination
   * Existing option from moveItem()
   */
  overwrite?: boolean;

  /**
   * Merge folders if moving a directory
   * Existing option from moveItem()
   */
  mergeFolders?: boolean;

  /**
   * NEW: Optional filename for destination
   * If provided, renames file to this name at destination
   * If not provided, uses basename from sourcePath
   *
   * @example 'new-name.md'
   */
  newFilename?: string;
}

/**
 * VaultUtils.moveItem() return type (existing interface)
 * No changes to return structure
 */
export interface MoveItemResult {
  success: boolean;
  newPath: string;
  itemType: 'note' | 'folder';
  error?: string;
}

// ============================================================================
// MCP TOOL HANDLER CONTRACT
// ============================================================================

/**
 * Tool handler function for rename_note
 * Follows established pattern from note-handlers.ts
 *
 * Implementation location: src/server/handlers/note-handlers.ts
 * Handler name: renameNoteHandler
 * Registration: noteHandlers.set('rename_note', renameNoteHandler)
 */
export interface RenameNoteHandlerContract {
  /**
   * Handler signature matching ToolHandler type
   */
  (args: Record<string, unknown>, context: ToolHandlerContext): Promise<CallToolResult>;
}

/**
 * Tool registration in note-handlers.ts
 *
 * INTEGRATION:
 * 1. Add renameNoteHandler constant following pattern of editNoteHandler
 * 2. Update ensureNoteHandlersInitialized() to register handler
 * 3. Export via getNoteHandlers() function
 */
export const RENAME_NOTE_TOOL_NAME = 'rename_note' as const;

// ============================================================================
// MCP TOOL SCHEMA CONTRACT
// ============================================================================

/**
 * JSON Schema for rename_note tool registration
 * Defines MCP protocol contract for tool
 *
 * Location: src/server/tool-registry.ts
 * Integration: Add to ALWAYS_AVAILABLE_TOOLS array
 */
export interface RenameNoteToolSchema {
  name: typeof RENAME_NOTE_TOOL_NAME;
  description: string; // Enhanced description with WHEN TO USE and RETURNS sections
  inputSchema: {
    type: 'object';
    properties: {
      oldPath: {
        type: 'string';
        description: 'Current path to the note (absolute or relative to vault)';
      };
      newPath: {
        type: 'string';
        description: 'New path for the note (absolute or relative to vault)';
      };
      updateLinks: {
        type: 'boolean';
        description: 'Whether to update wikilinks after rename (Phase 1: accepted but ignored)';
      };
      dryRun: {
        type: 'boolean';
        description: 'Dry-run mode: preview changes without executing (Phase 1: accepted but ignored)';
      };
    };
    required: ['oldPath', 'newPath'];
  };
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error conditions for rename operations
 *
 * FILE_NOT_FOUND:
 * - oldPath does not exist in vault
 * - Suggested action: Verify path spelling, use list tool to find correct path
 *
 * FILE_EXISTS:
 * - newPath already exists and overwrite=false
 * - Suggested action: Choose different name or set overwrite=true
 *
 * INVALID_PATH:
 * - Path contains invalid characters (/, \, :, etc.)
 * - Path attempts directory traversal (../)
 * - newPath missing .md extension
 * - Suggested action: Use valid Obsidian-compatible filename
 *
 * PERMISSION_DENIED:
 * - Filesystem permission error
 * - iCloud sync lock on file
 * - Suggested action: Check vault permissions, wait for sync to complete
 *
 * UNKNOWN_ERROR:
 * - Unexpected error during rename
 * - Includes original error message for debugging
 */
export type RenameErrorCode =
  | 'FILE_NOT_FOUND'
  | 'FILE_EXISTS'
  | 'INVALID_PATH'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR';

/**
 * Error message templates for consistent error responses
 */
export const RENAME_ERROR_MESSAGES: Record<RenameErrorCode, (details?: string) => string> = {
  FILE_NOT_FOUND: (path) => `Source file not found: ${path}. Use list tool to verify correct path.`,
  FILE_EXISTS: (path) => `File already exists at destination: ${path}. Choose a different name or use a different location.`,
  INVALID_PATH: (reason) => `Invalid path: ${reason}. Use Obsidian-compatible filenames (no /, \\, :, etc.).`,
  PERMISSION_DENIED: (details) => `Permission denied: ${details}. Check vault permissions or wait for iCloud sync.`,
  UNKNOWN_ERROR: (message) => `Unexpected error during rename: ${message}`
};

// ============================================================================
// VALIDATION CONTRACTS
// ============================================================================

/**
 * Path validation rules for rename operations
 *
 * MUST validate:
 * - oldPath exists and is a file (not directory)
 * - oldPath has .md extension
 * - newPath has .md extension
 * - newPath does not contain invalid characters
 * - newPath does not attempt directory traversal
 *
 * OPTIONAL:
 * - Warn if newPath changes folder location (Phase 1 only renames, doesn't move)
 */
export interface PathValidationRules {
  /**
   * Validate oldPath exists and is accessible
   */
  validateSourceExists: (path: string) => boolean;

  /**
   * Validate newPath is safe and valid
   */
  validateDestinationPath: (path: string) => {
    valid: boolean;
    error?: string;
  };

  /**
   * Normalize paths for comparison
   */
  normalizePath: (path: string, vaultPath: string) => string;

  /**
   * Check if paths are in same directory
   */
  isSameDirectory: (path1: string, path2: string) => boolean;
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors and constraints
 *
 * MUST:
 * - Use VaultUtils.moveItem() for file operations (enhanced with newFilename)
 * - Use normalizePath() for path handling (cross-platform safety)
 * - Validate inputs before attempting rename
 * - Return clear error messages with actionable suggestions
 * - Document that updateLinks and dryRun are ignored in Phase 1
 * - Track analytics for rename operations
 * - Handle iCloud sync delays with retry logic
 *
 * MUST NOT:
 * - Update wikilinks (Phase 3 implementation)
 * - Perform dry-run preview (Phase 5 implementation)
 * - Move files to different folders (use existing move_items tool for that)
 * - Allow renaming to same name (no-op, should warn)
 * - Rename files outside vault
 * - Rename system folders (.obsidian, etc.)
 *
 * PERFORMANCE:
 * - Rename operation should complete in <100ms for typical case
 * - Retry logic for iCloud conflicts (existing ICLOUD_RETRY_CONFIG pattern)
 * - No caching or optimization needed in Phase 1
 */
export interface BehavioralConstraints {
  /**
   * File operations delegated to VaultUtils
   */
  usesVaultUtils: true;

  /**
   * Cross-platform path normalization
   */
  usesNormalizePath: true;

  /**
   * Phase 1 limitations clearly documented
   */
  documentsLimitations: {
    updateLinks: 'Accepted but ignored - implementation in MCP-107';
    dryRun: 'Accepted but ignored - implementation in MCP-109';
  };

  /**
   * Analytics integration
   */
  tracksAnalytics: {
    toolName: 'rename_note';
    successMetric: boolean;
    errorTypes: RenameErrorCode[];
  };
}

// ============================================================================
// INTEGRATION POINTS
// ============================================================================

/**
 * System components this implementation integrates with
 *
 * EXISTING INTERFACES:
 * - ToolHandler (MCP-8-contracts.ts) - handler signature
 * - ToolHandlerContext (MCP-8-contracts.ts) - context object
 * - normalizePath() (path-utils.ts) - path normalization
 * - VaultUtils.moveItem() (vault-utils.ts) - file operations
 * - ObsidianLinks.extractNoteTitle() (obsidian-links.ts) - title extraction
 * - addVersionMetadata() (tool-registry.ts) - version metadata
 *
 * INTEGRATION STEPS:
 * 1. Extend VaultUtils.moveItem() with newFilename option
 * 2. Add renameNoteHandler to note-handlers.ts
 * 3. Register in noteHandlers Map
 * 4. Add tool schema to tool-registry.ts ALWAYS_AVAILABLE_TOOLS
 * 5. Export handler via getNoteHandlers()
 */
export interface IntegrationPoints {
  /**
   * Handler module location
   */
  handlerModule: 'src/server/handlers/note-handlers.ts';

  /**
   * Utility enhancements
   */
  vaultUtilsEnhancement: 'VaultUtils.moveItem() gains newFilename parameter';

  /**
   * Tool registry integration
   */
  toolRegistry: 'Added to ALWAYS_AVAILABLE_TOOLS in src/server/tool-registry.ts';

  /**
   * Dependencies
   */
  dependencies: {
    normalizePath: 'src/path-utils.ts';
    vaultUtils: 'src/vault-utils.ts';
    obsidianLinks: 'src/obsidian-links.ts';
    toolRegistry: 'src/server/tool-registry.ts';
    contracts: 'dev/contracts/MCP-8-contracts.ts';
    types: 'src/types.ts';
  };
}

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Test requirements for rename_note implementation
 *
 * UNIT TESTS:
 * - Path validation (valid/invalid paths)
 * - Error handling (file not found, file exists, permissions)
 * - VaultUtils.moveItem() enhancement (newFilename parameter)
 * - Handler input validation
 *
 * INTEGRATION TESTS:
 * - End-to-end rename via MCP protocol
 * - iCloud retry logic
 * - Analytics tracking
 * - Error response format
 *
 * MANUAL TESTS (Claude Desktop):
 * - Tool appears in tool list
 * - Successful rename operation
 * - Error messages are clear and actionable
 * - Warnings about limitations displayed
 */
export interface TestingRequirements {
  unitTests: {
    pathValidation: string[];
    errorHandling: RenameErrorCode[];
    vaultUtilsEnhancement: string[];
  };

  integrationTests: {
    mcpProtocol: 'End-to-end rename via CallToolRequest';
    icloudRetry: 'Retry logic for sync conflicts';
    analytics: 'Tool call tracking';
    errorFormat: 'MCP error response structure';
  };

  manualTests: {
    toolRegistration: 'Appears in Claude Desktop tool list';
    successfulRename: 'Renames file correctly';
    errorMessages: 'Clear and actionable';
    limitationWarnings: 'Phase 1 limitations documented';
  };
}

// ============================================================================
// IMPLEMENTATION CHECKLIST
// ============================================================================

/**
 * Step-by-step implementation validation
 * All items must be completed before considering Phase 1 complete
 */
export interface ImplementationChecklist {
  vaultUtilsEnhancement: {
    addNewFilenameParameter: 'EnhancedMoveItemOptions interface';
    updateMoveItemSignature: 'Add newFilename to options';
    implementRenameLogic: 'Use newFilename or basename(source)';
    preserveBackwardCompatibility: 'Existing calls work unchanged';
    addUnitTests: 'Test newFilename parameter';
  };

  handlerImplementation: {
    createRenameNoteHandler: 'Follow pattern from editNoteHandler';
    validateInputs: 'Type as RenameNoteInput';
    callEnhancedMoveItem: 'Pass newFilename from newPath';
    handleErrors: 'Map to RenameErrorCode';
    returnResult: 'Format as RenameNoteOutput';
    documentLimitations: 'Warn about ignored flags';
  };

  toolRegistration: {
    addToToolRegistry: 'ALWAYS_AVAILABLE_TOOLS array';
    defineSchema: 'Follow RenameNoteToolSchema contract';
    setAnnotations: 'readOnlyHint=false, idempotentHint=false, openWorldHint=true';
    addDescriptionWhenToUse: 'Enhanced description with use cases';
  };

  testing: {
    unitTests: 'Pass all path validation and error handling tests';
    integrationTests: 'Pass MCP protocol and analytics tests';
    typecheck: 'npm run typecheck passes';
    manualTest: 'Verified in Claude Desktop';
  };

  documentation: {
    contractFile: 'This file (dev/contracts/MCP-105-contracts.ts)';
    limitations: 'Document updateLinks and dryRun ignored';
    nextPhase: 'Reference MCP-106 for link detection';
  };
}

// ============================================================================
// DESIGN DECISIONS
// ============================================================================

/**
 * Key design decisions and rationale
 *
 * 1. ENHANCE moveItem() vs CREATE renameNote()
 *    Decision: Enhance existing moveItem() with newFilename parameter
 *    Rationale: Avoid code duplication, moveItem() already handles renameSync()
 *    Impact: Simpler implementation, maintains single source of truth
 *
 * 2. ACCEPT updateLinks/dryRun flags in Phase 1
 *    Decision: Include in schema but ignore in implementation
 *    Rationale: API stability - avoid breaking changes in future phases
 *    Impact: Clear migration path, no breaking changes later
 *
 * 3. LOCATION in note-handlers.ts
 *    Decision: Add to existing note-handlers module
 *    Rationale: Rename is a note operation, follows established pattern
 *    Impact: Consistent organization, easy to find
 *
 * 4. ERROR handling strategy
 *    Decision: Return structured errors with codes and suggestions
 *    Rationale: Actionable error messages improve user experience
 *    Impact: Users can self-serve error resolution
 *
 * 5. PATH handling
 *    Decision: Use existing normalizePath() utility
 *    Rationale: Cross-platform safety, proven pattern
 *    Impact: Consistent path handling across all tools
 */
export interface DesignDecisions {
  enhanceVsCreate: 'Enhance moveItem() to avoid duplication';
  apiStability: 'Accept future flags early for smooth migration';
  moduleLocation: 'note-handlers.ts follows established pattern';
  errorStrategy: 'Structured errors with actionable suggestions';
  pathHandling: 'Reuse normalizePath() for cross-platform safety';
}
