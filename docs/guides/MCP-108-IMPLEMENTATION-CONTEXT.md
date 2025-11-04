# MCP-108 Implementation Context

**Atomic Operations & Rollback Transaction Safety**

This document provides complete implementation context for all 6 MCP-108 sub-issues. Future sessions can reference this doc and start implementing immediately without re-gathering context.

---

## Overview

**Parent Issue**: MCP-108 - Atomic Operations & Rollback (transaction safety)
**Linear URL**: https://linear.app/agilecode-studio/issue/MCP-108
**Contract File**: `dev/contracts/MCP-108-contracts.ts` (1182 lines, comprehensive)
**Strategy**: Vertical slice implementation with 6 independent sub-issues

### Vertical Slice Decomposition

MCP-108 is decomposed into 6 slices that build incrementally:

**Round 1 - Foundation** (can run in parallel):

- MCP-114: Atomic File Operations Foundation
- MCP-115: WAL Infrastructure
- MCP-116: Two-Phase Link Updater

**Round 2 - Orchestration**:

- MCP-117: Transaction Manager - Core Protocol (requires Round 1)

**Round 3 - Integration** (can run in parallel):

- MCP-118: Transaction Integration with rename_note (requires MCP-117)
- MCP-119: Boot Recovery System (requires MCP-115, MCP-117)

### Feature Branch Strategy

**Parent Branch**: Deleted (not used)
**Sub-Issue Branches**: Each sub-issue creates its own branch and merges directly to `master`
**Completion**: MCP-108 marked as Done when all 6 sub-issues merged

---

## Implementation Workflow (Per Sub-Issue)

### Standard Workflow

```bash
# 1. Execute (skip plan/stage - context already defined)
/workflow:03-execute <sub-issue-id>

# 2. Validate
npm test              # All tests passing
npm run typecheck     # Clean
npm run build         # Successful
# Manual verification via Claude Code CLI

# 3. Code Review
/workflow:04-code-review <sub-issue-id>

# 4. Finalize
/workflow:07-commit-push <sub-issue-id>  # Commit, PR, merge to master
```

### Key Principles

- **No Plan/Stage Workflows**: All contracts already defined in MCP-108-contracts.ts
- **Enhancement-First**: Modify existing code when possible, avoid creating new files unnecessarily
- **Test-Driven**: Unit tests before integration, comprehensive coverage
- **Incremental Merge**: Each sub-issue merges to master independently

---

## Sub-Issue 1: MCP-114 - Atomic File Operations Foundation

### Details

**Linear ID**: MCP-114
**Priority**: High
**Complexity**: Simple
**Dependencies**: None (foundational slice)
**Branch**: `feature/mcp-114-atomic-file-operations-foundation`
**URL**: https://linear.app/agilecode-studio/issue/MCP-114

### Contract Reference

- `dev/contracts/MCP-108-contracts.ts` lines 298-366 (AtomicFileOperations)
- `dev/contracts/MCP-108-contracts.ts` lines 843-851 (MUST use native fs)

### Implementation Details

**Goal**: Extend `VaultUtils.writeFileWithRetry()` with atomic write capability using native Node.js fs temp-file-then-rename pattern.

**Add Interface**:

```typescript
interface AtomicWriteOptions {
  atomic?: boolean;           // Enable temp-file-then-rename (default: false)
  retries?: number;           // iCloud retry count (default: 3)
  transactional?: boolean;    // For telemetry tracking
}
```

**Extend Method Signature**:

```typescript
static writeFileWithRetry(
  filePath: string,
  content: string,
  encoding: BufferEncoding = "utf-8",
  options?: AtomicWriteOptions
): void
```

**Atomic Write Logic**:

1. If `options?.atomic === true`:
   - Generate temp file: `.mcp-tmp-{timestamp}` in same directory as target
   - Write content to temp file using existing retry logic
   - Use `fs.renameSync(tempPath, targetPath)` - POSIX atomic on macOS
   - Cleanup temp file on all error paths (try/finally)
2. If `options?.atomic === false` or undefined:
   - Preserve existing behavior (backward compatible)

**Key Requirements**:

- **Native fs only**: No write-file-atomic, fs-extra, or tmp dependencies
- **POSIX semantics**: `fs.renameSync()` is atomic on macOS
- **iCloud retry**: Apply existing `ICLOUD_RETRY_CONFIG` to temp file operations
- **Cleanup**: Temp files cleaned up on all error paths
- **Backward compatible**: Existing calls unchanged (atomic defaults to false)

### Files to Modify

- `src/vault-utils.ts`:
  - Add `AtomicWriteOptions` interface (around line 200)
  - Extend `writeFileWithRetry` signature
  - Add atomic write logic branch
  - Add temp file cleanup helper

### Test Requirements

**File**: `tests/unit/atomic-file-operations.test.ts`

**Test Count**: 12+ tests covering:

1. Atomic write using temp-file-then-rename
2. Temp file uses correct naming pattern (`.mcp-tmp-{timestamp}`)
3. POSIX atomic rename promotes temp → target
4. Temp file cleanup on write errors
5. Temp file cleanup on rename errors
6. iCloud retry integration with atomic writes
7. Backward compatibility (atomic defaults to false)
8. Existing behavior preserved when atomic not specified
9. Rename failure handling
10. Concurrent write safety (multiple temp files)
11. Permission errors during temp file creation
12. Disk full scenarios

### Acceptance Criteria

- [ ] `writeFileWithRetry()` accepts `AtomicWriteOptions` parameter
- [ ] When `atomic: true`, uses `.mcp-tmp-{timestamp}` temp files
- [ ] POSIX atomic rename (fs.renameSync) promotes temp → target
- [ ] Temp file cleanup on all error paths (write errors, rename errors)
- [ ] Backward compatible: existing calls work unchanged (atomic defaults to false)
- [ ] iCloud retry logic works with atomic writes
- [ ] All 12+ unit tests passing
- [ ] TypeScript validation clean
- [ ] No regressions in existing tests (559/564 maintained)

---

## Sub-Issue 2: MCP-115 - WAL Infrastructure

### Details

**Linear ID**: MCP-115
**Priority**: High
**Complexity**: Medium
**Dependencies**: None (can run parallel with MCP-114)
**Branch**: `feature/mcp-115-wal-infrastructure`
**URL**: https://linear.app/agilecode-studio/issue/MCP-115

### Contract Reference

- `dev/contracts/MCP-108-contracts.ts` lines 124-197 (WAL contracts)
- `dev/contracts/MCP-108-contracts.ts` lines 856-860 (WAL location requirements)

### Implementation Details

**Goal**: Create `WALManager` class for Write-Ahead Log persistence, recovery, and cleanup. No transaction integration yet - just infrastructure.

**Create Class**:

```typescript
// src/modules/transactions/wal-manager.ts
export class WALManager {
  private walDir = '~/.config/mcp-lifeos/wal/';

  async writeWAL(entry: WALEntry): Promise<string> {
    // Filename: {timestamp}-rename-{correlationId}.wal.json
    // Persist WALEntry as JSON
    // Return WAL file path
  }

  async readWAL(walPath: string): Promise<WALEntry> {
    // Read WAL file
    // Validate schema version 1.0
    // Return parsed WALEntry
  }

  async deleteWAL(walPath: string): Promise<void> {
    // Remove WAL file
  }

  async scanPendingWALs(): Promise<WALEntry[]> {
    // Find all .wal.json files in walDir
    // Filter: only WALs older than 1 minute
    // Return array of WALEntry
  }

  private async ensureWALDirectory(): Promise<void> {
    // Create ~/.config/mcp-lifeos/wal/ if not exists
    // Create README.md explaining purpose
    // Set proper permissions
  }
}
```

**WAL Entry Structure** (from contracts):

```typescript
interface WALEntry {
  version: '1.0';
  correlationId: string;
  timestamp: string;           // ISO 8601
  vaultPath: string;           // Absolute path
  phase: TransactionPhase;
  operation: 'rename_note';
  manifest: TransactionManifest;
  pid: number;                 // Process ID
}
```

**WAL Directory**: `~/.config/mcp-lifeos/wal/`

- External to vault (avoids iCloud sync conflicts)
- XDG-compliant location
- Auto-generated README.md on first use

**README.md Content**:

```markdown
# MCP for LifeOS - Write-Ahead Log (WAL)

This directory contains transaction logs for atomic rename operations.

## Purpose
WAL entries ensure vault consistency during rename operations with link updates.
If a transaction is interrupted (crash, power loss), the WAL enables automatic recovery.

## File Format
- Filename: `{timestamp}-rename-{correlationId}.wal.json`
- Content: JSON transaction manifest

## Recovery
WAL entries older than 1 minute are automatically recovered on server startup.
Do not manually delete WAL files unless you're certain recovery is not needed.

## Manual Recovery
If automatic recovery fails, WAL files contain all information needed to:
1. Rollback partial changes
2. Restore original file state
3. Clean up temporary files

Contact support if manual intervention is needed.
```

### Files to Create

- `src/modules/transactions/wal-manager.ts` (WALManager class, ~150 lines)
- `~/.config/mcp-lifeos/wal/README.md` (auto-generated on first use)

### Test Requirements

**File**: `tests/unit/wal-manager.test.ts`

**Test Count**: 15+ tests covering:

1. WAL directory creation on first write
2. Directory creation is idempotent
3. README.md auto-generated with correct content
4. WAL entry persistence with correct filename format
5. WAL filename includes timestamp and correlation ID
6. WAL reading and JSON parsing
7. Schema version 1.0 validation
8. Schema version mismatch handling
9. WAL deletion
10. Pending WAL scanning (finds only WALs >1min old)
11. Recent WAL skipping (<1min old)
12. Corrupted JSON handling (graceful degradation)
13. Missing WAL file handling
14. Empty WAL directory handling
15. Permission errors during directory creation

### Acceptance Criteria

- [ ] WAL files written to `~/.config/mcp-lifeos/wal/{timestamp}-rename-{correlationId}.wal.json`
- [ ] WAL directory created with proper permissions on first use
- [ ] README.md auto-generated explaining WAL purpose
- [ ] `readWAL()` validates schema version 1.0
- [ ] `scanPendingWALs()` finds only WALs older than 1 minute
- [ ] Recent WALs (<1min) skipped during scan
- [ ] Graceful handling of corrupted WAL JSON (logs error, continues)
- [ ] All 15+ unit tests passing
- [ ] TypeScript validation clean
- [ ] No regressions in existing tests

---

## Sub-Issue 3: MCP-116 - Two-Phase Link Updater

### Details

**Linear ID**: MCP-116
**Priority**: High
**Complexity**: Medium
**Dependencies**: MCP-107 (completed - Link Update Implementation)
**Branch**: `feature/mcp-116-two-phase-link-updater`
**URL**: https://linear.app/agilecode-studio/issue/MCP-116

### Contract Reference

- `dev/contracts/MCP-108-contracts.ts` lines 200-296 (Two-phase link update contracts)

### Implementation Details

**Goal**: Refactor `updateVaultLinks()` to support three modes: `render` (content map generation), `commit` (atomic writes from map), `direct` (legacy Phase 3).

**Add Mode Type**:

```typescript
type LinkUpdateMode = 'render' | 'commit' | 'direct';
```

**Add Result Interfaces**:

```typescript
interface LinkRenderResult {
  contentMap: Map<string, string>;  // path → updated content
  affectedFiles: string[];
  totalReferences: number;
  scanTimeMs: number;
  renderTimeMs: number;
}

interface LinkCommitInput {
  contentMap: Map<string, string>;
  manifestEntries: TransactionManifest['linkUpdates'];
}
```

**Extend Function Signature** (overloads):

```typescript
// Render mode: Returns content map without writes
export async function updateVaultLinks(
  oldNoteName: string,
  newNoteName: string,
  options: { mode: 'render' }
): Promise<LinkRenderResult>;

// Commit mode: Writes from pre-rendered content map
export async function updateVaultLinks(
  oldNoteName: string,
  newNoteName: string,
  options: { mode: 'commit'; commitInput: LinkCommitInput }
): Promise<LinkUpdateResult>;

// Direct mode: Legacy Phase 3 behavior (default)
export async function updateVaultLinks(
  oldNoteName: string,
  newNoteName: string,
  options?: { mode?: 'direct' }
): Promise<LinkUpdateResult>;
```

**Mode Implementation**:

**Render Mode**:

1. Scan vault for wikilinks (use existing LinkScanner from MCP-106)
2. Compute updated content for each affected file
3. Build content map: `Map<string, string>` (path → updated content)
4. **NO writes performed**
5. Return `LinkRenderResult` with metrics

**Commit Mode**:

1. Receive pre-rendered content map from prepare phase
2. Validate manifest entries (staleness detection deferred to MCP-117)
3. Write each file atomically using `VaultUtils.writeFileWithRetry({ atomic: true })` from MCP-114
4. Return `LinkUpdateResult`

**Direct Mode** (default):

1. Preserve existing Phase 3 behavior (MCP-107)
2. Read + update + write in single pass
3. Backward compatible with all existing calls

### Files to Modify

- `src/link-updater.ts`:
  - Add mode types and interfaces
  - Add mode parameter to function signature
  - Implement render mode logic
  - Implement commit mode logic
  - Preserve direct mode (existing behavior)

### Test Requirements

**File**: `tests/unit/link-updater-modes.test.ts`

**Test Count**: 18+ tests covering:

1. Render mode generates content map without writes
2. Render mode includes all affected files
3. Render mode includes scan time metric
4. Render mode includes render time metric
5. Render mode includes total reference count
6. Content map has correct structure (Map<string, string>)
7. Commit mode writes from pre-rendered content map
8. Commit mode uses atomic writes (integration with MCP-114)
9. Commit mode returns LinkUpdateResult
10. Direct mode preserves Phase 3 behavior
11. Direct mode remains default when mode not specified
12. Backward compatibility: existing calls work unchanged
13. Mode parameter type checking
14. Empty content map handling (no files to update)
15. Large content map handling (many files)
16. Concurrent mode usage safety
17. Error handling in render mode
18. Error handling in commit mode

### Acceptance Criteria

- [ ] `updateVaultLinks({ mode: 'render' })` returns content map without writes
- [ ] Render mode includes performance metrics (scan time, render time)
- [ ] `updateVaultLinks({ mode: 'commit', commitInput })` writes atomically from map
- [ ] Commit mode integrates atomic writes from MCP-114
- [ ] `updateVaultLinks()` defaults to 'direct' mode (backward compatible)
- [ ] Direct mode preserves existing Phase 3 behavior exactly
- [ ] All existing link update tests still passing (no regressions)
- [ ] All 18+ new mode tests passing
- [ ] TypeScript validation clean
- [ ] Function overloads work correctly

---

## Sub-Issue 4: MCP-117 - Transaction Manager - Core Protocol

### Details

**Linear ID**: MCP-117
**Priority**: High
**Complexity**: Complex
**Dependencies**: MCP-114, MCP-115, MCP-116 (requires all Round 1 slices)
**Branch**: `feature/mcp-117-transaction-manager-core-protocol`
**URL**: https://linear.app/agilecode-studio/issue/MCP-117

### Contract Reference

- `dev/contracts/MCP-108-contracts.ts` lines 16-122 (Transaction coordinator contracts)
- `dev/contracts/MCP-108-contracts.ts` lines 623-691 (TransactionManager interface)
- `dev/contracts/MCP-108-contracts.ts` lines 862-876 (Five-phase protocol requirements)

### Implementation Details

**Goal**: Create `TransactionManager` class implementing 5-phase protocol: plan → prepare → validate → commit → success/abort.

**Create Class**:

```typescript
// src/modules/transactions/transaction-manager.ts
import { WALManager } from './wal-manager.js';
import { updateVaultLinks } from './link-updater.js';
import { VaultUtils } from './vault-utils.js';
import crypto from 'crypto';

export class TransactionManager {
  constructor(
    private vaultPath: string,
    private walManager: WALManager
  ) {}

  /**
   * Main entry point - executes full 5-phase protocol
   */
  async execute(
    oldPath: string,
    newPath: string,
    updateLinks: boolean
  ): Promise<TransactionResult> {
    const state = await this.plan(oldPath, newPath, updateLinks);

    try {
      await this.prepare(state);
      await this.validate(state);
      await this.commit(state);
      await this.success(state);

      return {
        success: true,
        correlationId: state.correlationId,
        finalPhase: 'success',
        noteRename: {
          oldPath,
          newPath,
          completed: true
        },
        metrics: this.collectMetrics(state)
      };
    } catch (error) {
      const rollback = await this.abort(state, error);

      return {
        success: false,
        correlationId: state.correlationId,
        finalPhase: 'abort',
        rollback,
        metrics: this.collectMetrics(state)
      };
    }
  }

  /**
   * Phase 1: Build operation manifest with SHA-256 hashes
   */
  async plan(
    oldPath: string,
    newPath: string,
    updateLinks: boolean
  ): Promise<TransactionState> {
    // 1. Generate correlation ID (UUID)
    // 2. Compute SHA-256 hash of source file
    // 3. If updateLinks: render link updates to get affected files
    // 4. Compute SHA-256 hashes for all affected link files
    // 5. Build TransactionManifest
    // 6. Return TransactionState with phase='plan'
  }

  /**
   * Phase 2: Stage files and write WAL
   */
  async prepare(state: TransactionState): Promise<void> {
    // 1. Stage note rename: copy to temp location
    // 2. If updateLinks: stage all link files to temp locations
    // 3. Write WAL entry with complete manifest
    // 4. Update state.walPath
    // 5. Update state.phase = 'prepare'
  }

  /**
   * Phase 3: Verify staged files and detect staleness
   */
  async validate(state: TransactionState): Promise<void> {
    // 1. Verify source file still exists
    // 2. Compute current SHA-256 hash of source file
    // 3. Compare with manifest hash (detect staleness)
    // 4. If updateLinks: verify all link files unchanged
    // 5. Throw TRANSACTION_STALE_CONTENT if mismatch
    // 6. Update state.phase = 'validate'
  }

  /**
   * Phase 4: Atomically promote staged files
   */
  async commit(state: TransactionState): Promise<void> {
    // 1. Atomically rename note: staged → target
    // 2. Delete original file
    // 3. If updateLinks: commit link updates from content map
    // 4. Mark each operation as completed in manifest
    // 5. Update WAL with commit phase
    // 6. Update state.phase = 'commit'
  }

  /**
   * Phase 5: Cleanup temps and WAL
   */
  async success(state: TransactionState): Promise<void> {
    // 1. Delete all temp files
    // 2. Delete WAL file
    // 3. Log success metrics
    // 4. Update state.phase = 'success'
  }

  /**
   * Abort: Rollback and cleanup
   */
  async abort(
    state: TransactionState,
    error: Error
  ): Promise<RollbackResult> {
    // 1. Invoke rollback with manifest
    // 2. Generate recovery instructions if partial rollback
    // 3. Preserve WAL for manual recovery if needed
    // 4. Update state.phase = 'abort'
    // 5. Return RollbackResult
  }

  /**
   * Rollback from WAL manifest
   */
  async rollback(
    manifest: TransactionManifest,
    walPath: string
  ): Promise<RollbackResult> {
    // 1. Restore original note if rename committed
    // 2. Restore original link files if link updates committed
    // 3. Track successful/failed restorations
    // 4. Generate manual recovery instructions for failures
    // 5. Return RollbackResult with partial recovery status
  }

  private collectMetrics(state: TransactionState): TransactionMetrics {
    // Collect phase timings and total duration
  }
}
```

**5-Phase Protocol Details**:

**Phase 1 - Plan**:

- Generate correlation ID (UUID v4)
- Read source file, compute SHA-256 hash
- If updateLinks: call `updateVaultLinks({ mode: 'render' })` to get content map
- Build `TransactionManifest` with all file hashes
- Start phase timing

**Phase 2 - Prepare**:

- Stage note rename: copy source to `.mcp-staged-{correlationId}` temp file
- If updateLinks: stage link updates (store content map in manifest)
- Write WAL entry to `~/.config/mcp-lifeos/wal/{timestamp}-rename-{correlationId}.wal.json`
- Store WAL path in state

**Phase 3 - Validate**:

- Verify source file still exists
- Recompute SHA-256 hash of source file
- Compare with manifest hash
- If mismatch: throw `TRANSACTION_STALE_CONTENT` error
- If updateLinks: verify all link files unchanged (hash comparison)
- This prevents writing stale content

**Phase 4 - Commit**:

- Atomically rename note: `fs.renameSync(stagedPath, targetPath)` (POSIX atomic)
- Delete original file
- If updateLinks: call `updateVaultLinks({ mode: 'commit', commitInput })` with atomic writes
- Mark each operation as completed in manifest
- Update WAL with commit phase status

**Phase 5a - Success**:

- Delete all temp files (staged files)
- Delete WAL file
- Log transaction success with correlation ID
- Async cleanup (non-blocking)

**Phase 5b - Abort**:

- Trigger rollback from manifest
- Restore original files from backups/temps
- Track partial recovery (which operations succeeded/failed)
- Generate manual recovery instructions if needed
- Preserve WAL for manual intervention
- Return `RollbackResult`

### Files to Create

- `src/modules/transactions/transaction-manager.ts` (TransactionManager class, ~400 lines)
- `src/error-types.ts` (if not exists - add TransactionErrorCode enum)

**Error Codes to Add**:

```typescript
export type TransactionErrorCode =
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
```

### Test Requirements

**File**: `tests/unit/transaction-manager.test.ts`

**Test Count**: 25+ tests covering:

1. Full 5-phase execution success path
2. Plan phase: manifest building with file hashes
3. Plan phase: correlation ID generation (UUID format)
4. Plan phase: link render integration when updateLinks=true
5. Prepare phase: file staging to temp locations
6. Prepare phase: WAL writing with correct structure
7. Validate phase: staleness detection via hash comparison
8. Validate phase: passes when hashes match
9. Validate phase: throws TRANSACTION_STALE_CONTENT on mismatch
10. Commit phase: atomic file promotion
11. Commit phase: link update commits with atomic writes
12. Commit phase: manifest completion tracking
13. Success phase: temp file cleanup
14. Success phase: WAL deletion
15. Abort phase: rollback triggering
16. Rollback: note restore from staged file
17. Rollback: link file restoration
18. Rollback: partial rollback handling (some succeed, some fail)
19. Rollback: recovery instructions generation
20. Rollback: WAL preservation on failed recovery
21. Correlation ID tracking throughout phases
22. Phase timing metrics collection
23. WAL updated at each phase transition
24. Error propagation from each phase
25. Graceful degradation on rollback failures

### Acceptance Criteria

- [ ] `TransactionManager.execute()` completes all 5 phases successfully
- [ ] Plan phase builds manifest with SHA-256 hashes for all files
- [ ] Prepare phase stages files to temp locations and writes WAL
- [ ] Validate phase detects stale content via hash comparison
- [ ] Commit phase atomically promotes staged files using POSIX rename
- [ ] Success phase cleans up temps and deletes WAL
- [ ] Abort phase triggers rollback with error context
- [ ] Rollback restores original state from WAL manifest
- [ ] Partial rollback generates manual recovery instructions
- [ ] Correlation ID included in all metrics and WAL entries
- [ ] WAL updated at each phase transition
- [ ] All 25+ unit tests passing
- [ ] TypeScript validation clean
- [ ] No regressions in existing tests

---

## Sub-Issue 5: MCP-118 - Transaction Integration with rename_note

### Details

**Linear ID**: MCP-118
**Priority**: High
**Complexity**: Medium
**Dependencies**: MCP-117 (requires TransactionManager)
**Branch**: `feature/mcp-118-transaction-integration-with-rename_note`
**URL**: https://linear.app/agilecode-studio/issue/MCP-118

### Contract Reference

- `dev/contracts/MCP-108-contracts.ts` lines 693-735 (Handler integration contracts)
- `dev/contracts/MCP-108-contracts.ts` lines 915-920 (No success on rollback)

### Implementation Details

**Goal**: Refactor `renameNoteHandler` to delegate all rename operations to `TransactionManager.execute()`. Remove "success + warnings" pattern - return explicit transaction failures.

**Current Handler Location**: `src/server/handlers/note-handlers.ts`

**Refactor Strategy**:

```typescript
async function renameNoteHandler(
  input: RenameNoteInput
): Promise<RenameNoteOutput | TransactionRenameNoteError> {
  // 1. Create WALManager instance
  const walManager = new WALManager();

  // 2. Create TransactionManager instance
  const vaultPath = VaultUtils.getVaultPath();
  const txManager = new TransactionManager(vaultPath, walManager);

  // 3. Delegate to TransactionManager.execute()
  const result = await txManager.execute(
    input.oldPath,
    input.newPath,
    input.updateLinks ?? true
  );

  // 4. Handle result
  if (!result.success) {
    // Return TRANSACTION_FAILED with metadata
    return {
      success: false,
      error: 'Transaction failed during rename operation',
      errorCode: 'TRANSACTION_FAILED',
      transactionMetadata: {
        phase: result.finalPhase,
        correlationId: result.correlationId,
        affectedFiles: [input.oldPath, input.newPath],
        rollbackStatus: result.rollback?.success ? 'success' : 'failed',
        failures: result.rollback?.failures,
        recoveryAction: result.rollback?.manualRecoveryRequired
          ? 'manual_recovery'
          : 'retry',
        walPath: result.rollback?.walPath,
        recoveryInstructions: result.rollback?.recoveryInstructions
      }
    };
  }

  // 5. Success response (NO warnings array)
  return {
    success: true,
    oldPath: result.noteRename.oldPath,
    newPath: result.noteRename.newPath,
    correlationId: result.correlationId,
    metrics: {
      totalTimeMs: result.metrics.totalTimeMs,
      phaseTimings: result.metrics.phaseTimings
    }
  };
}
```

**Breaking Change**:

- **Old Behavior**: `{ success: true, warnings: ['Link update failed for file.md'] }`
- **New Behavior**: `{ success: false, errorCode: 'TRANSACTION_FAILED', transactionMetadata: {...} }`
- **Rationale**: Vault consistency requires explicit failure signaling. If any part of the transaction fails (note rename OR link updates), the entire operation must be reported as failed.

**Error Response Structure**:

```typescript
interface TransactionRenameNoteError {
  success: false;
  error: string;
  errorCode: TransactionErrorCode;
  transactionMetadata?: {
    phase: TransactionPhase;
    correlationId: string;
    affectedFiles: string[];
    rollbackStatus: 'not_started' | 'in_progress' | 'success' | 'partial' | 'failed';
    failures?: Array<{
      path: string;
      operation: 'note_rename' | 'link_update';
      error: string;
    }>;
    recoveryAction: 'retry' | 'manual_recovery' | 'contact_support';
    walPath?: string;
    recoveryInstructions?: string[];
  };
}
```

### Files to Modify

- `src/server/handlers/note-handlers.ts`:
  - Import `TransactionManager` and `WALManager`
  - Refactor `renameNoteHandler` to delegate to `TransactionManager.execute()`
  - Add transaction error codes to responses
  - Remove warnings array from success responses
  - Preserve `RenameNoteInput` schema (backward compatible)

- `dev/contracts/MCP-105-contracts.ts` (if needed):
  - Extend `RenameNoteError` with transaction error codes
  - Add `TransactionRenameNoteError` interface

### Test Requirements

**File**: `tests/integration/rename-note-transaction.test.ts`

**Test Count**: 20+ integration tests covering:

1. Successful rename without link updates (full transaction)
2. Successful rename with link updates (full transaction)
3. Transaction failure returns TRANSACTION_FAILED error code
4. Transaction metadata included in error response
5. Rollback on plan failure
6. Rollback on prepare failure
7. Rollback on validate failure (staleness detected)
8. Rollback on commit failure
9. Rollback status tracking (success, partial, failed)
10. No warnings array in success responses (breaking change verified)
11. Correlation ID tracking end-to-end
12. Backward compatible inputs (RenameNoteInput unchanged)
13. Performance overhead within acceptable range (2-8x baseline)
14. Manual recovery instructions in error metadata
15. WAL path in error metadata when rollback fails
16. Recovery action recommendations (retry vs manual_recovery)
17. Affected files list in error metadata
18. Phase information in error metadata
19. Graceful degradation on partial rollback
20. Error message clarity for AI agents

### Acceptance Criteria

- [ ] `renameNoteHandler` creates `TransactionManager` instance
- [ ] All renames delegated to `TransactionManager.execute()`
- [ ] Success response includes transaction metrics and correlation ID
- [ ] Failure response returns `TRANSACTION_FAILED` error code
- [ ] Transaction metadata included in all error responses
- [ ] No warnings array in success responses (breaking change implemented)
- [ ] `RenameNoteInput` schema unchanged (backward compatible)
- [ ] All 20+ integration tests passing
- [ ] TypeScript validation clean
- [ ] No regressions in existing rename tests
- [ ] Performance overhead 2-8x baseline (acceptable per contracts)

---

## Sub-Issue 6: MCP-119 - Boot Recovery System

### Details

**Linear ID**: MCP-119
**Priority**: Medium
**Complexity**: Simple
**Dependencies**: MCP-115, MCP-117 (requires WALManager, TransactionManager)
**Branch**: `feature/mcp-119-boot-recovery-system`
**URL**: https://linear.app/agilecode-studio/issue/MCP-119

### Contract Reference

- `dev/contracts/MCP-108-contracts.ts` lines 571-620 (Boot recovery contracts)
- `dev/contracts/MCP-108-contracts.ts` lines 877-884 (Boot recovery requirements)

### Implementation Details

**Goal**: Add recovery hook in `src/index.ts` that runs before handler registration. Scans for orphaned WAL entries and attempts automatic recovery. Graceful degradation - server startup continues even if recovery fails.

**Add Function to `src/index.ts`**:

```typescript
async function recoverPendingTransactions(): Promise<void> {
  const walManager = new WALManager();

  try {
    // 1. Scan for pending WAL entries
    const pendingWALs = await walManager.scanPendingWALs();

    if (pendingWALs.length === 0) {
      return; // No orphaned transactions
    }

    console.error(`Found ${pendingWALs.length} orphaned transaction(s), attempting recovery...`);

    // 2. Attempt recovery for each WAL
    for (const wal of pendingWALs) {
      const age = Date.now() - new Date(wal.timestamp).getTime();

      // Skip WALs younger than 1 minute (may be active)
      if (age < 60000) {
        console.error(`⏭️  Skipping recent WAL ${wal.correlationId} (${Math.round(age/1000)}s old)`);
        continue;
      }

      try {
        // 3. Create TransactionManager and attempt rollback
        const txManager = new TransactionManager(wal.vaultPath, walManager);
        const walPath = `~/.config/mcp-lifeos/wal/${wal.timestamp}-rename-${wal.correlationId}.wal.json`;
        const result = await txManager.rollback(wal.manifest, walPath);

        if (result.success) {
          // 4. Delete WAL on successful recovery
          await walManager.deleteWAL(walPath);
          console.error(`✅ Recovered transaction ${wal.correlationId}`);
        } else if (result.partialRecovery) {
          // 5. Partial recovery - preserve WAL, log instructions
          console.error(`⚠️  Partial recovery for ${wal.correlationId} - manual intervention needed`);
          console.error(`   WAL preserved: ${walPath}`);
          if (result.recoveryInstructions) {
            console.error(`   Instructions:`);
            result.recoveryInstructions.forEach(instr =>
              console.error(`   - ${instr}`)
            );
          }
        } else {
          // 6. Recovery failed - preserve WAL
          console.error(`❌ Recovery failed for ${wal.correlationId}`);
          console.error(`   WAL preserved: ${walPath}`);
        }
      } catch (error) {
        // 7. Recovery error - preserve WAL, log error
        console.error(`❌ Recovery error for ${wal.correlationId}: ${error.message}`);
        console.error(`   WAL preserved for manual recovery`);
      }
    }
  } catch (error) {
    // 8. Scan error - log and continue startup
    console.error(`⚠️  WAL scan failed: ${error.message}`);
    console.error(`   Server startup continuing...`);
  }
}
```

**Integration with Server Startup**:

```typescript
// In src/index.ts, before handler registration
const server = new Server(
  {
    name: "lifeos-mcp",
    version: "2.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ADD RECOVERY HOOK HERE (before setRequestHandler)
await recoverPendingTransactions();

// Then register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // ...
});
```

**Graceful Degradation**:

- Recovery failures never block server startup
- Partial recovery tracked with detailed logging
- Manual recovery instructions generated for failed operations
- WAL files preserved when recovery incomplete
- All errors logged to stderr for observability

### Files to Modify

- `src/index.ts`:
  - Add `recoverPendingTransactions()` function
  - Call before handler registration
  - Import `TransactionManager` and `WALManager`

### Test Requirements

**File**: `tests/integration/boot-recovery.test.ts`

**Test Count**: 10+ integration tests covering:

1. Scans and recovers orphaned WALs
2. Skips WALs younger than 1 minute
3. Deletes WAL on successful recovery
4. Preserves WAL on failed recovery
5. Preserves WAL on partial recovery
6. Logs recovery results to stderr (✅ success, ⚠️ partial, ❌ failed)
7. Server continues startup even if recovery fails
8. Server continues startup even if scan fails
9. Process ID conflict detection (WAL from different process)
10. Multiple WAL recovery in sequence
11. Empty WAL directory handling (no-op)
12. Recovery instruction logging for partial recovery

### Acceptance Criteria

- [ ] `recoverPendingTransactions()` scans WAL directory on server boot
- [ ] Skips WALs younger than 1 minute (active transactions)
- [ ] Attempts rollback for stale WAL entries (>1min old)
- [ ] Logs recovery results to stderr with status symbols (✅ ⚠️ ❌)
- [ ] Deletes WAL on successful recovery
- [ ] Preserves WAL on failed or partial recovery
- [ ] Server startup continues regardless of recovery outcome
- [ ] Manual recovery instructions logged for partial recovery
- [ ] All 10+ integration tests passing
- [ ] TypeScript validation clean
- [ ] No startup time impact (<5s overhead acceptable)
- [ ] No blocking of server startup on recovery failures

---

## Key Implementation Patterns

### From MCP-108 Contracts

**Native Node.js fs Only**:

- NO external dependencies (write-file-atomic, fs-extra, tmp)
- Use `fs.renameSync()` for POSIX atomic rename
- Temp file pattern: `.mcp-tmp-{timestamp}`
- Cleanup temp files with try/finally blocks

**WAL Location**:

- `~/.config/mcp-lifeos/wal/` (XDG-compliant)
- External to vault (avoids iCloud sync conflicts)
- Auto-generated README.md explaining purpose

**5-Phase Transaction Protocol**:

1. **Plan**: Build manifest with SHA-256 hashes
2. **Prepare**: Stage files, write WAL
3. **Validate**: Verify staged files, detect staleness
4. **Commit**: Atomically promote staged files
5. **Success/Abort**: Cleanup or rollback

**Graceful Degradation**:

- Partial recovery tracked in `RollbackResult`
- Manual recovery instructions generated
- WAL preserved for manual intervention
- Server continues operation on recovery failures

**Staleness Detection**:

- SHA-256 hashes computed during plan phase
- Recomputed during validate phase
- Throw `TRANSACTION_STALE_CONTENT` on mismatch
- Prevents writing stale content to vault

### From Serena Memories

**Vault Integration Patterns**:

- iCloud retry logic: `ICLOUD_RETRY_CONFIG` (3 retries, exponential backoff)
- Path normalization: `VaultUtils.normalizePath()`
- File operations: Always use `VaultUtils` helpers

**Error Handling**:

- Structured errors with error codes
- Detailed error metadata for AI agents
- Correlation IDs for tracing
- Recovery instructions in error responses

**Testing Patterns**:

- Temp vault for all tests (protect production vault)
- `VaultUtils.resetSingletons()` called between tests
- No production vault access in test suite
- Comprehensive cleanup in afterEach hooks

### Performance Expectations

**Acceptable Overhead** (per contracts):

- Non-transactional baseline: ~50ms
- With transactions: 100-400ms acceptable
- 2-8x slowdown acceptable (safety > speed)

**Phase Breakdown**:

- Plan: 5-10ms
- Prepare: 50-200ms (WAL write + temp staging)
- Validate: 20-100ms (hash checks)
- Commit: 10-50ms per file
- Cleanup: 10-30ms (background async)

**Scalability Limits**:

- Max affected files: ~1000 before memory pressure
- Max file size: No hard limit, streaming for >100KB
- WAL size: ~1KB metadata per file + selective content backups

---

## Testing Strategy

### Unit Tests First

Each sub-issue must have comprehensive unit tests before integration:

- Test count specified per sub-issue (12-25+ tests)
- Test files created in `tests/unit/`
- All edge cases covered
- Error handling validated
- Performance expectations verified

### Integration Tests

After MCP-118 (transaction integration):

- Full transaction lifecycle tests
- End-to-end rename with link updates
- Failure scenarios (disk full, permissions, crashes)
- Boot recovery scenarios

### Failure Injection

Test resilience at each phase:

- Disk full during prepare
- Permission denied during commit
- Forced crash between prepare/commit
- Staleness during validate
- Network errors (iCloud sync)

### Manual Verification

**Tool**: Claude Code CLI (not Claude Desktop)
**Why**: Real vault operations, error message clarity, recovery instructions

**Test Cases**:

1. Successful rename with link updates
2. Failed rename with rollback
3. Partial rollback scenario
4. Boot recovery from orphaned WAL
5. Manual recovery instructions clarity

---

## Breaking Changes

### MCP-118: Remove "Success + Warnings" Pattern

**Old Behavior** (Phase 3):

```json
{
  "success": true,
  "oldPath": "/vault/note.md",
  "newPath": "/vault/renamed.md",
  "warnings": [
    "Failed to update link in file1.md",
    "Failed to update link in file2.md"
  ]
}
```

**New Behavior** (Phase 4):

```json
{
  "success": false,
  "error": "Transaction failed during rename operation",
  "errorCode": "TRANSACTION_FAILED",
  "transactionMetadata": {
    "phase": "commit",
    "correlationId": "abc-123",
    "affectedFiles": ["/vault/note.md", "/vault/renamed.md"],
    "rollbackStatus": "success",
    "failures": [
      {
        "path": "/vault/file1.md",
        "operation": "link_update",
        "error": "Permission denied"
      }
    ],
    "recoveryAction": "retry",
    "walPath": "~/.config/mcp-lifeos/wal/..."
  }
}
```

**Rationale**: Vault consistency requires explicit failure signaling. If link updates fail, the vault is in an inconsistent state, and this must be reported as a transaction failure, not a success with warnings.

**Migration**: AI agents using the API must handle `TRANSACTION_FAILED` error code and use `transactionMetadata` for recovery decisions.

---

## Common Gotchas

### 1. Temp File Cleanup

**Problem**: Orphaned temp files if cleanup code not in finally block
**Solution**: Always use try/finally for temp file operations

```typescript
const tempPath = `.mcp-tmp-${Date.now()}`;
try {
  fs.writeFileSync(tempPath, content);
  fs.renameSync(tempPath, targetPath);
} finally {
  // Cleanup temp file on all paths (success or error)
  if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
  }
}
```

### 2. iCloud Sync Delays

**Problem**: iCloud may delay file visibility
**Solution**: Use existing `ICLOUD_RETRY_CONFIG` with exponential backoff

```typescript
const ICLOUD_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 100,
  backoffMultiplier: 2
};
```

### 3. SHA-256 Hash Computation

**Problem**: Large files may block event loop
**Solution**: Use streaming hash for files >100KB (deferred to future optimization)

```typescript
import crypto from 'crypto';

function computeHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}
```

### 4. WAL Schema Versioning

**Problem**: Future schema changes may break recovery
**Solution**: Always validate `version: '1.0'` before parsing WAL

```typescript
const wal = JSON.parse(fs.readFileSync(walPath, 'utf-8'));
if (wal.version !== '1.0') {
  throw new Error(`Unsupported WAL version: ${wal.version}`);
}
```

### 5. Correlation ID Format

**Problem**: Inconsistent correlation IDs make tracing difficult
**Solution**: Use UUID v4 format consistently

```typescript
import { v4 as uuidv4 } from 'uuid';

const correlationId = uuidv4(); // e.g., "550e8400-e29b-41d4-a716-446655440000"
```

---

## Prompt Template for Future Sessions

Use this exact prompt to start implementing any sub-issue:

```
I need to implement MCP-<sub-issue-number>.

Context document: docs/guides/MCP-108-IMPLEMENTATION-CONTEXT.md

Read the context doc for MCP-<sub-issue-number>, then execute immediately:
/workflow:03-execute mcp-<sub-issue-number>

All planning and contracts are already defined - go directly to implementation.
```

**Example for MCP-114**:

```
I need to implement MCP-114.

Context document: docs/guides/MCP-108-IMPLEMENTATION-CONTEXT.md

Read the context doc for MCP-114, then execute immediately:
/workflow:03-execute mcp-114

All planning and contracts are already defined - go directly to implementation.
```

---

## Success Criteria (Overall MCP-108)

MCP-108 is complete when all 6 sub-issues are merged to master:

- [ ] MCP-114 merged: Atomic file operations working
- [ ] MCP-115 merged: WAL infrastructure in place
- [ ] MCP-116 merged: Two-phase link updater functional
- [ ] MCP-117 merged: Transaction manager operational
- [ ] MCP-118 merged: rename_note using transactions
- [ ] MCP-119 merged: Boot recovery active

**Final Validation**:

- All 559/564 existing tests still passing (no regressions)
- All new tests passing (100+ new tests across 6 slices)
- TypeScript validation clean
- Manual verification successful
- Performance overhead 2-8x baseline (acceptable)
- Zero data loss scenarios
- Vault always consistent

**Documentation Updates** (after all slices complete):

- `docs/ARCHITECTURE.md` - Transaction design patterns
- `docs/tools/rename_note.md` - Transaction semantics
- `docs/TROUBLESHOOTING.md` - Recovery procedures
- `~/.config/mcp-lifeos/wal/README.md` - Manual recovery guide

---

*This document is the single source of truth for MCP-108 implementation. All sub-issues reference this doc for complete context.*
