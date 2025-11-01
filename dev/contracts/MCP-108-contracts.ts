/**
 * Implementation contracts for Linear Issue: MCP-108
 * Issue: Atomic Operations & Rollback (Transaction Safety)
 *
 * Phase 4 of rename_note implementation: Transaction-safe rename with automatic rollback
 * using Write-Ahead Logging (WAL) and two-phase commit semantics.
 *
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-108
 */

import type { LinkUpdateResult, LinkUpdateFailure } from './MCP-107-contracts.js';

// ============================================================================
// TRANSACTION COORDINATOR CONTRACTS
// ============================================================================

/**
 * Transaction phases for rename operations
 *
 * Five-phase commit protocol ensures vault consistency:
 * 1. PLAN: Build manifest of operations
 * 2. PREPARE: Stage files and write WAL
 * 3. VALIDATE: Verify staged files
 * 4. COMMIT: Atomically promote staged files
 * 5. SUCCESS/ABORT: Cleanup or rollback
 */
export type TransactionPhase = 'plan' | 'prepare' | 'validate' | 'commit' | 'success' | 'abort';

/**
 * Transaction state for operations
 */
export interface TransactionState {
  /**
   * Unique transaction identifier (correlation ID)
   * Used for WAL file naming and observability
   */
  correlationId: string;

  /**
   * Current transaction phase
   */
  phase: TransactionPhase;

  /**
   * Transaction start timestamp (ISO 8601)
   */
  timestamp: string;

  /**
   * Vault path for this transaction
   */
  vaultPath: string;

  /**
   * Operation manifest (built during PLAN phase)
   */
  manifest: TransactionManifest;

  /**
   * WAL file path (written during PREPARE phase)
   */
  walPath?: string;
}

/**
 * Manifest of all operations in transaction
 *
 * Created during PLAN phase, persisted to WAL during PREPARE phase
 */
export interface TransactionManifest {
  /**
   * Note rename operation details
   */
  noteRename: {
    /** Source note path (absolute) */
    from: string;

    /** Destination note path (absolute) */
    to: string;

    /** SHA-256 hash of original file (for integrity validation) */
    sha256Before: string;

    /** Staged temp file path (during PREPARE) */
    stagedPath?: string;

    /** Whether commit completed for this operation */
    completed?: boolean;
  };

  /**
   * Link update operations (if updateLinks=true)
   * Empty array if updateLinks=false
   */
  linkUpdates: Array<{
    /** File path to update */
    path: string;

    /** SHA-256 hash of original content (for staleness detection) */
    sha256Before: string;

    /** Rendered updated content (during PREPARE render phase) */
    renderedContent?: string;

    /** Staged temp file path (during PREPARE) */
    stagedPath?: string;

    /** Number of link references in this file */
    referenceCount: number;

    /** Whether commit completed for this file */
    completed?: boolean;
  }>;

  /**
   * Total operations count for progress tracking
   */
  totalOperations: number;
}

// ============================================================================
// WAL (WRITE-AHEAD LOG) CONTRACTS
// ============================================================================

/**
 * WAL entry structure for transaction persistence
 *
 * Stored in ~/.config/mcp-lifeos/wal/{timestamp}-rename-{correlationId}.wal.json
 * Human-readable JSON for debugging and manual recovery
 */
export interface WALEntry {
  /**
   * WAL format version (for future schema evolution)
   */
  version: '1.0';

  /**
   * Transaction correlation ID
   */
  correlationId: string;

  /**
   * Transaction timestamp (ISO 8601)
   */
  timestamp: string;

  /**
   * Vault path (absolute)
   */
  vaultPath: string;

  /**
   * Current transaction phase
   */
  phase: TransactionPhase;

  /**
   * Operation type
   */
  operation: 'rename_note';

  /**
   * Complete transaction manifest
   */
  manifest: TransactionManifest;

  /**
   * Process ID (for concurrent transaction detection)
   */
  pid: number;
}

/**
 * WAL storage paths
 */
export interface WALPaths {
  /**
   * Base WAL directory
   * ~/.config/mcp-lifeos/wal/
   */
  walDir: string;

  /**
   * WAL entry file path
   * ~/.config/mcp-lifeos/wal/{timestamp}-rename-{correlationId}.wal.json
   */
  walFilePath: string;

  /**
   * Backup directory for file content
   * ~/.config/mcp-lifeos/wal/backups/{correlationId}/
   */
  backupDir: string;
}

// ============================================================================
// TWO-PHASE LINK UPDATE CONTRACTS
// ============================================================================

/**
 * Link update operation mode
 *
 * Two-phase approach separates rendering from committing:
 * - RENDER: Read files, compute updated content, return content map (no writes)
 * - COMMIT: Write pre-rendered content atomically from content map
 * - DIRECT: Legacy mode for non-transactional usage (Phase 3 behavior)
 */
export type LinkUpdateMode = 'render' | 'commit' | 'direct';

/**
 * Result of RENDER phase link updates
 *
 * Returns content map for validation before commit
 */
export interface LinkRenderResult {
  /**
   * Map of file paths to updated content
   * Used during COMMIT phase for atomic writes
   */
  contentMap: Map<string, string>;

  /**
   * Files that will be updated
   */
  affectedFiles: string[];

  /**
   * Total link references across all files
   */
  totalReferences: number;

  /**
   * Scan time from LinkScanner (milliseconds)
   */
  scanTimeMs: number;

  /**
   * Render time (milliseconds)
   */
  renderTimeMs: number;
}

/**
 * Input for COMMIT phase link updates
 */
export interface LinkCommitInput {
  /**
   * Pre-rendered content map from RENDER phase
   */
  contentMap: Map<string, string>;

  /**
   * Original manifest entries for validation
   */
  manifestEntries: TransactionManifest['linkUpdates'];
}

/**
 * Extended updateVaultLinks function signature
 *
 * Supports three modes:
 * - render: Returns content map without writing
 * - commit: Writes content from provided map
 * - direct: Legacy Phase 3 behavior (default)
 */
export interface UpdateVaultLinksContract {
  /**
   * RENDER mode: Compute updated content without writing
   */
  (
    oldNoteName: string,
    newNoteName: string,
    options: { mode: 'render' }
  ): Promise<LinkRenderResult>;

  /**
   * COMMIT mode: Write pre-rendered content atomically
   */
  (
    oldNoteName: string,
    newNoteName: string,
    options: { mode: 'commit'; commitInput: LinkCommitInput }
  ): Promise<LinkUpdateResult>;

  /**
   * DIRECT mode: Legacy behavior (Phase 3)
   */
  (
    oldNoteName: string,
    newNoteName: string,
    options?: { mode?: 'direct' }
  ): Promise<LinkUpdateResult>;
}

// ============================================================================
// ATOMIC FILE OPERATION CONTRACTS
// ============================================================================

/**
 * Options for atomic file writes
 *
 * Extends existing writeFileWithRetry with atomic semantics
 */
export interface AtomicWriteOptions {
  /**
   * Whether to use atomic temp-file-then-rename pattern
   * Default: false (preserves existing behavior)
   */
  atomic?: boolean;

  /**
   * Number of retry attempts for iCloud sync conflicts
   * Default: 3 (existing ICLOUD_RETRY_CONFIG)
   */
  retries?: number;

  /**
   * Whether this write is part of a transaction
   * Used for telemetry and error context
   */
  transactional?: boolean;
}

/**
 * Enhanced VaultUtils function signatures
 */
export interface AtomicFileOperations {
  /**
   * Atomic file write using temp-file-then-rename
   *
   * POSIX atomic rename semantics on macOS:
   * 1. Write content to .mcp-tmp-{timestamp} file
   * 2. Rename temp file to target path (atomic on POSIX)
   * 3. Cleanup temp on failure
   *
   * MUST:
   * - Use native Node.js fs (no external dependencies)
   * - Handle iCloud sync delays with retry logic
   * - Cleanup temp files on all error paths
   * - Preserve existing writeFileWithRetry behavior when atomic=false
   *
   * MUST NOT:
   * - Use external libraries (write-file-atomic, fs-extra)
   * - Leave orphaned temp files
   * - Overwrite target before validation
   */
  atomicWriteFile(
    targetPath: string,
    content: string,
    options?: AtomicWriteOptions
  ): Promise<void>;

  /**
   * Extended writeFileWithRetry to support atomic mode
   *
   * Backward compatible: if atomic option not provided, uses existing behavior
   */
  writeFileWithRetry(
    path: string,
    content: string,
    options?: AtomicWriteOptions
  ): Promise<void>;
}

// ============================================================================
// TRANSACTION RESULT CONTRACTS
// ============================================================================

/**
 * Result of transaction execution
 */
export interface TransactionResult {
  /**
   * Whether transaction completed successfully
   */
  success: boolean;

  /**
   * Transaction correlation ID
   */
  correlationId: string;

  /**
   * Final transaction phase reached
   */
  finalPhase: TransactionPhase;

  /**
   * Note rename result (if commit reached)
   */
  noteRename?: {
    oldPath: string;
    newPath: string;
    completed: boolean;
  };

  /**
   * Link update result (if updateLinks=true)
   */
  linkUpdates?: {
    updatedCount: number;
    failedCount: number;
    totalReferences: number;
  };

  /**
   * Rollback result (if abort occurred)
   */
  rollback?: RollbackResult;

  /**
   * Performance metrics
   */
  metrics: {
    /** Total transaction time (milliseconds) */
    totalTimeMs: number;

    /** Time by phase (milliseconds) */
    phaseTimings: Partial<Record<TransactionPhase, number>>;
  };
}

/**
 * Result of rollback operation
 */
export interface RollbackResult {
  /**
   * Whether rollback completed successfully
   */
  success: boolean;

  /**
   * Operations that were rolled back
   */
  rolledBack: Array<{
    type: 'note_rename' | 'link_update';
    path: string;
    restored: boolean;
  }>;

  /**
   * Operations that failed to rollback
   */
  failures: Array<{
    type: 'note_rename' | 'link_update';
    path: string;
    error: string;
  }>;

  /**
   * Whether partial recovery occurred
   */
  partialRecovery: boolean;

  /**
   * Whether manual recovery required
   */
  manualRecoveryRequired: boolean;

  /**
   * Manual recovery instructions (if needed)
   */
  recoveryInstructions?: string[];
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Transaction-specific error codes
 *
 * Extends existing RenameErrorCode with transaction failure codes
 */
export type TransactionErrorCode =
  // Existing codes from MCP-105
  | 'FILE_NOT_FOUND'
  | 'FILE_EXISTS'
  | 'INVALID_PATH'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR'
  // New transaction codes
  | 'TRANSACTION_PLAN_FAILED'
  | 'TRANSACTION_PREPARE_FAILED'
  | 'TRANSACTION_VALIDATE_FAILED'
  | 'TRANSACTION_COMMIT_FAILED'
  | 'TRANSACTION_ROLLBACK_FAILED'
  | 'TRANSACTION_STALE_CONTENT';

/**
 * Structured error metadata for transaction failures
 *
 * Provides AI agents with actionable failure context
 */
export interface TransactionErrorMetadata {
  /**
   * Transaction phase where failure occurred
   */
  phase: TransactionPhase;

  /**
   * Transaction correlation ID
   */
  correlationId: string;

  /**
   * Files affected by transaction
   */
  affectedFiles: string[];

  /**
   * Rollback status after failure
   */
  rollbackStatus: 'not_started' | 'in_progress' | 'success' | 'partial' | 'failed';

  /**
   * Individual operation failures
   */
  failures?: Array<{
    path: string;
    operation: 'note_rename' | 'link_update';
    error: string;
  }>;

  /**
   * Recommended recovery action for AI agent
   */
  recoveryAction: 'retry' | 'manual_recovery' | 'contact_support';

  /**
   * WAL file path for manual recovery
   */
  walPath?: string;

  /**
   * Manual recovery instructions
   */
  recoveryInstructions?: string[];
}

/**
 * Enhanced RenameNoteError with transaction metadata
 *
 * Backward compatible with MCP-105 error structure
 */
export interface TransactionRenameNoteError {
  /**
   * Failure indicator
   */
  success: false;

  /**
   * Error message
   */
  error: string;

  /**
   * Error code (includes transaction codes)
   */
  errorCode: TransactionErrorCode;

  /**
   * Transaction metadata (only present for transaction failures)
   */
  transactionMetadata?: TransactionErrorMetadata;
}

// ============================================================================
// BOOT RECOVERY CONTRACTS
// ============================================================================

/**
 * Boot-time recovery hook contract
 *
 * Called in src/index.ts before handler registration
 */
export interface BootRecoveryContract {
  /**
   * Scan for orphaned WAL entries
   *
   * MUST:
   * - Check ~/.config/mcp-lifeos/wal/ for .wal.json files
   * - Skip WAL files younger than 1 minute (may be active)
   * - Attempt recovery for stale WAL entries
   * - Log recovery results to stderr
   * - Be idempotent (safe to run multiple times)
   *
   * MUST NOT:
   * - Block server startup on recovery failures
   * - Delete WAL files on partial recovery
   * - Attempt recovery for very recent WALs (<1min)
   */
  scanPendingWALs(): Promise<WALEntry[]>;

  /**
   * Attempt automatic recovery from WAL
   *
   * MUST:
   * - Validate WAL schema version
   * - Check process ID for concurrent transactions
   * - Invoke rollback with WAL manifest
   * - Delete WAL on successful recovery
   * - Preserve WAL on failed recovery
   * - Generate recovery instructions on failure
   *
   * MUST NOT:
   * - Throw errors (graceful degradation)
   * - Modify vault without rollback confirmation
   * - Delete WAL before recovery completes
   */
  recoverFromWAL(wal: WALEntry): Promise<{
    success: boolean;
    walPath: string;
    result?: RollbackResult;
    error?: string;
  }>;
}

// ============================================================================
// TRANSACTION MANAGER CONTRACTS
// ============================================================================

/**
 * Transaction manager class contract
 *
 * Centralizes transaction coordination for rename operations
 */
export interface TransactionManagerContract {
  /**
   * Execute transaction with five-phase protocol
   *
   * @param oldPath - Source note path
   * @param newPath - Destination note path
   * @param updateLinks - Whether to update wikilinks
   * @returns Transaction result with success/failure details
   */
  execute(
    oldPath: string,
    newPath: string,
    updateLinks: boolean
  ): Promise<TransactionResult>;

  /**
   * Rollback transaction from manifest
   *
   * @param manifest - Transaction manifest (from WAL)
   * @param walPath - WAL file path
   * @returns Rollback result with success/failure details
   */
  rollback(
    manifest: TransactionManifest,
    walPath: string
  ): Promise<RollbackResult>;

  /**
   * Plan phase: Build operation manifest
   */
  plan(
    oldPath: string,
    newPath: string,
    updateLinks: boolean
  ): Promise<TransactionManifest>;

  /**
   * Prepare phase: Stage files and write WAL
   */
  prepare(state: TransactionState): Promise<void>;

  /**
   * Validate phase: Verify staged files
   */
  validate(state: TransactionState): Promise<void>;

  /**
   * Commit phase: Atomically promote staged files
   */
  commit(state: TransactionState): Promise<void>;

  /**
   * Success phase: Cleanup temps and WAL
   */
  success(state: TransactionState): Promise<void>;

  /**
   * Abort phase: Rollback and cleanup
   */
  abort(state: TransactionState, error: Error): Promise<RollbackResult>;
}

// ============================================================================
// HANDLER INTEGRATION CONTRACTS
// ============================================================================

/**
 * Contract for renameNoteHandler refactoring
 *
 * MUST:
 * - Delegate to TransactionManager.execute() for all renames
 * - Return TRANSACTION_FAILED error code on rollback
 * - Remove "success + warnings" pattern for link update failures
 * - Preserve existing RenameNoteInput interface (backward compatible)
 * - Add transaction metadata to error responses
 *
 * MUST NOT:
 * - Perform direct file operations (delegate to TransactionManager)
 * - Return success when rollback occurred
 * - Modify RenameNoteInput schema (breaking change)
 */
export interface HandlerRefactoringContract {
  /**
   * Handler delegates to transaction manager
   */
  delegatesToTransactionManager: true;

  /**
   * Error handling strategy changed
   */
  failsOnRollback: {
    oldBehavior: 'success=true with warnings array';
    newBehavior: 'success=false with TRANSACTION_FAILED error code';
    rationale: 'Vault consistency requires explicit failure signaling';
  };

  /**
   * Backward compatibility maintained
   */
  backwardCompatible: {
    inputSchema: 'RenameNoteInput unchanged';
    successOutput: 'RenameNoteOutput structure preserved';
    errorCodes: 'Existing codes still valid, new codes added';
  };
}

// ============================================================================
// TELEMETRY CONTRACTS
// ============================================================================

/**
 * Transaction lifecycle telemetry events
 *
 * All events include correlation ID for tracing
 */
export interface TransactionTelemetryEvents {
  /**
   * Transaction started
   */
  'transaction.start': {
    correlationId: string;
    operation: 'rename_note';
    updateLinks: boolean;
    timestamp: string;
  };

  /**
   * Transaction phase transition
   */
  'transaction.phase': {
    correlationId: string;
    phase: TransactionPhase;
    duration: number; // milliseconds
    timestamp: string;
  };

  /**
   * Transaction completed successfully
   */
  'transaction.complete': {
    correlationId: string;
    totalDuration: number;
    noteRenamed: boolean;
    linksUpdated: number;
    timestamp: string;
  };

  /**
   * Transaction failed with rollback
   */
  'transaction.failed': {
    correlationId: string;
    phase: TransactionPhase;
    errorCode: TransactionErrorCode;
    rollbackStatus: TransactionErrorMetadata['rollbackStatus'];
    duration: number;
    timestamp: string;
  };

  /**
   * Boot recovery attempted
   */
  'transaction.recovery': {
    correlationId: string;
    walAge: number; // milliseconds
    success: boolean;
    timestamp: string;
  };
}

// ============================================================================
// INTEGRATION WITH EXISTING CONTRACTS
// ============================================================================

/**
 * Dependencies on MCP-105 and MCP-107 contracts
 */
export interface ExistingContractDependencies {
  /**
   * MCP-105: RenameNoteInput (unchanged)
   */
  RenameNoteInput: 'dev/contracts/MCP-105-contracts.ts';

  /**
   * MCP-105: RenameNoteOutput (structure preserved)
   */
  RenameNoteOutput: 'dev/contracts/MCP-105-contracts.ts';

  /**
   * MCP-105: RenameNoteError (extended with transaction codes)
   */
  RenameNoteError: 'dev/contracts/MCP-105-contracts.ts (extended)';

  /**
   * MCP-107: LinkUpdateResult (used in transaction result)
   */
  LinkUpdateResult: 'dev/contracts/MCP-107-contracts.ts';

  /**
   * MCP-107: updateVaultLinks (extended with mode parameter)
   */
  updateVaultLinks: 'dev/contracts/MCP-107-contracts.ts (extended)';
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors for transaction implementation
 */
export interface TransactionBehavioralContracts {
  MUST: {
    /**
     * Use native Node.js fs only
     * - No write-file-atomic dependency
     * - No fs-extra dependency
     * - No tmp dependency
     * - Atomic operations via temp-file-then-rename
     */
    useNativeFS: true;

    /**
     * Store WAL in XDG-compliant location
     * - ~/.config/mcp-lifeos/wal/
     * - External to vault (no iCloud sync)
     * - README.md explaining purpose
     */
    useXDGWALLocation: true;

    /**
     * Implement five-phase protocol
     * - Plan → Prepare → Validate → Commit → Success/Abort
     * - Each phase must complete before next begins
     * - WAL updated at each phase transition
     */
    followFivePhaseProtocol: true;

    /**
     * Graceful degradation on rollback failures
     * - Partial recovery tracked in result
     * - Manual recovery instructions generated
     * - WAL preserved for manual intervention
     */
    gracefulRollbackDegradation: true;

    /**
     * Boot recovery before serving requests
     * - Check for orphaned WALs
     * - Attempt automatic recovery
     * - Log results to stderr
     * - Continue startup on recovery failures
     */
    bootRecovery: true;

    /**
     * Staleness detection before commit
     * - Verify file hashes match manifest
     * - Fail with TRANSACTION_STALE_CONTENT if modified
     * - Include affected files in error metadata
     */
    stalenessDetection: true;
  };

  MUST_NOT: {
    /**
     * No external dependencies
     * - Do NOT use write-file-atomic
     * - Do NOT use fs-extra
     * - Do NOT use tmp
     * - Planning decision: zero new dependencies
     */
    noExternalDependencies: true;

    /**
     * No vault-local backups
     * - Do NOT create .mcp-backup/ in vault
     * - All backups in ~/.config/mcp-lifeos/wal/backups/
     * - Planning decision: external storage only
     */
    noVaultBackups: true;

    /**
     * No success on rollback
     * - Do NOT return success=true when rollback occurred
     * - Always return TRANSACTION_FAILED error code
     * - Change from Phase 3 "success + warnings" pattern
     */
    noSuccessOnRollback: true;

    /**
     * No WAL in vault
     * - Do NOT store WAL files in vault directory
     * - Prevents iCloud sync conflicts
     * - External location mandatory
     */
    noVaultWAL: true;
  };
}

// ============================================================================
// PERFORMANCE CONTRACTS
// ============================================================================

/**
 * Performance expectations for transaction operations
 */
export interface TransactionPerformanceContracts {
  /**
   * Acceptable overhead vs non-transactional rename
   *
   * Planning decision: "safety > speed"
   * - Non-transactional baseline: ~50ms
   * - Transaction overhead: 100-400ms acceptable
   * - 2-8x slowdown acceptable for safety
   */
  acceptableOverhead: {
    baseline: '~50ms (Phase 3 without transactions)';
    withTransactions: '100-400ms (Phase 4)';
    breakdown: {
      plan: '5-10ms';
      prepare: '50-200ms (WAL write + temp staging)';
      validate: '20-100ms (hash checks)';
      commit: '10-50ms per file';
      cleanup: '10-30ms (background async)';
    };
    multiplier: '2-8x baseline (acceptable per planning)';
  };

  /**
   * Optimization strategies
   */
  optimizations: {
    parallelValidation: 'Hash checks can run concurrently';
    lazyCleanup: 'Success cleanup is async background task';
    selectiveBackups: 'Hash-only for files >100KB (deferred to future)';
    streamingWrites: 'Avoid buffering large files in memory';
  };

  /**
   * Scalability limits
   */
  scalability: {
    maxAffectedFiles: '~1000 before memory pressure';
    maxFileSize: 'No hard limit, streaming recommended for >100KB';
    walSize: '~1KB metadata per file + selective content backups';
  };
}

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Required test coverage for transaction implementation
 */
export interface TransactionTestingContracts {
  unitTests: {
    /**
     * TransactionManager class
     * - Five-phase protocol execution
     * - Rollback logic with partial failures
     * - WAL persistence and recovery
     * - Staleness detection
     */
    transactionManager: '25+ tests covering all phases and rollback scenarios';

    /**
     * WALManager class
     * - WAL entry creation and persistence
     * - Boot-time WAL scanning
     * - Recovery from WAL
     * - Cleanup and expiration
     */
    walManager: '15+ tests for WAL lifecycle';

    /**
     * Atomic file operations
     * - atomicWriteFile with temp-file pattern
     * - writeFileWithRetry with atomic option
     * - Temp file cleanup on errors
     * - iCloud retry integration
     */
    atomicOperations: '12+ tests for atomic file writes';

    /**
     * Two-phase link updater
     * - Render mode content map generation
     * - Commit mode atomic writes from map
     * - Direct mode backward compatibility
     * - Staleness detection
     */
    linkUpdaterModes: '18+ tests for three operation modes';
  };

  integrationTests: {
    /**
     * Full transaction lifecycle
     * - Successful rename with link updates
     * - Partial failure rollback scenarios
     * - Crash recovery simulation
     * - Boot-time recovery
     */
    transactionLifecycle: '20+ end-to-end transaction tests';

    /**
     * Failure injection
     * - Disk full during prepare
     * - Permission denied during commit
     * - Forced crash between prepare/commit
     * - Staleness during commit
     */
    failureScenarios: '15+ failure injection tests';

    /**
     * Claude Code CLI testing
     * - Manual testing via Claude Code CLI
     * - Real vault operations
     * - Error message clarity
     * - Recovery instructions
     */
    manualTesting: 'Verified via Claude Code CLI (not Claude Desktop)';
  };

  vaultSafety: {
    /**
     * Temp vault protection
     * - All tests use temp directories
     * - No production vault access
     * - VaultUtils.resetSingletons() called
     */
    tempVaultOnly: 'CRITICAL: No production vault access in tests';

    /**
     * Cleanup verification
     * - No orphaned temp files
     * - WAL files cleaned up on success
     * - Backup files removed
     */
    cleanupVerification: 'All temp artifacts cleaned up';
  };
}

// ============================================================================
// IMPLEMENTATION CHECKLIST
// ============================================================================

/**
 * Step-by-step implementation validation
 *
 * All items must be completed before Phase 4 complete
 */
export interface MCP108ImplementationChecklist {
  foundation: {
    atomicFileOperations: 'Extend VaultUtils.writeFileWithRetry with atomic option';
    walManager: 'Create WALManager class for persistence and recovery';
    linkUpdaterModes: 'Refactor updateVaultLinks for render/commit/direct modes';
    errorCodes: 'Add transaction error codes to error-types.ts';
  };

  transactionCoordinator: {
    transactionManager: 'Create TransactionManager class with five-phase protocol';
    planPhase: 'Build operation manifest';
    preparePhase: 'Stage files and write WAL';
    validatePhase: 'Verify staged files and detect staleness';
    commitPhase: 'Atomically promote staged files';
    successPhase: 'Cleanup temps and WAL';
    abortPhase: 'Rollback and generate recovery instructions';
  };

  integration: {
    handlerRefactoring: 'Refactor renameNoteHandler to delegate to TransactionManager';
    bootRecovery: 'Add recovery hook in src/index.ts before handler registration';
    telemetry: 'Add transaction lifecycle events to analytics';
    errorResponses: 'Return TRANSACTION_FAILED with metadata on rollback';
  };

  testing: {
    unitTests: 'All unit tests passing';
    integrationTests: 'All integration tests passing';
    failureInjection: 'Disk full, permissions, crashes tested';
    manualTesting: 'Verified via Claude Code CLI';
  };

  documentation: {
    contracts: 'This file (dev/contracts/MCP-108-contracts.ts)';
    architecture: 'Update docs/ARCHITECTURE.md with transaction design';
    toolDocs: 'Update docs/tools/rename_note.md with transaction semantics';
    troubleshooting: 'Add recovery procedures to docs/TROUBLESHOOTING.md';
    walReadme: 'Create ~/.config/mcp-lifeos/wal/README.md';
  };
}

// ============================================================================
// DESIGN DECISIONS
// ============================================================================

/**
 * Key design decisions for MCP-108
 *
 * Based on planning phase (01-plan) and tech-expert consultation
 */
export interface MCP108DesignDecisions {
  /**
   * External WAL storage
   * Decision: ~/.config/mcp-lifeos/wal/ (XDG-compliant)
   * Rationale: Eliminates iCloud sync conflicts, standard location
   * Impact: macOS-only recovery, no cross-device support needed
   */
  externalWALStorage: 'XDG-compliant external location avoids iCloud conflicts';

  /**
   * Zero external dependencies
   * Decision: Native Node.js fs only (no write-file-atomic, fs-extra, tmp)
   * Rationale: Aligns with project philosophy, POSIX atomic rename sufficient
   * Impact: Manual temp-file management, platform awareness
   */
  nativeFSOnly: 'Zero new dependencies using native fs with temp-file pattern';

  /**
   * Two-phase link updates
   * Decision: Render/commit separation instead of direct writes
   * Rationale: Enables prepare/validate phases with content validation
   * Impact: Memory overhead for content map, staleness detection possible
   */
  twoPhaseLinks: 'Render then commit enables validation and rollback';

  /**
   * Fail on rollback
   * Decision: TRANSACTION_FAILED error instead of success with warnings
   * Rationale: Vault consistency requires explicit failure signaling
   * Impact: Breaking change from Phase 3 behavior, clearer semantics
   */
  failOnRollback: 'Explicit failure better than success with warnings';

  /**
   * Graceful degradation
   * Decision: Partial recovery with manual instructions vs hard failure
   * Rationale: Some recovery better than none, user can complete manually
   * Impact: Complex rollback logic, detailed error metadata required
   */
  gracefulDegradation: 'Partial recovery with instructions beats hard failure';

  /**
   * macOS-only
   * Decision: No Windows/Linux support in Phase 4
   * Rationale: User confirmed macOS-only deployment
   * Impact: Simplifies atomic rename (POSIX semantics), no platform detection
   */
  macOSOnly: 'POSIX atomic rename semantics, no cross-platform complexity';
}
