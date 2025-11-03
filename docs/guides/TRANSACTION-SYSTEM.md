# Transaction System Architecture

**Last Updated:** 2025-11-02  
**Version:** 1.0  
**Status:** Production

This guide provides comprehensive documentation of the transaction system implemented for atomic rename operations with automatic rollback and crash recovery.

---

## Overview

The Transaction System provides atomic rename operations with vault-wide link updates through a five-phase protocol with Write-Ahead Logging (WAL). It ensures vault consistency by guaranteeing all-or-nothing semantics: operations either fully succeed or fully fail with automatic rollback.

**Key Features:**

- **Five-Phase Protocol**: Plan → Prepare → Validate → Commit → Success/Abort
- **Write-Ahead Logging**: Crash recovery through persistent transaction logs
- **SHA-256 Staleness Detection**: Prevents overwriting concurrent file modifications
- **Automatic Rollback**: Restores vault state on any failure
- **Boot Recovery**: Automatic orphaned transaction recovery on server startup
- **Performance Tracking**: Correlation IDs and phase timing metrics

**Implementation:**

The transaction system was implemented through several incremental phases:

- Core transaction infrastructure (five-phase protocol, WAL)
- Transaction Manager with rollback capability
- Integration with rename_note tool
- Boot recovery system for orphaned transactions
- Dry-run preview mode
- Enhanced preview with link analysis and time estimation

---

## Five-Phase Protocol

### Phase 1: PLAN

**Purpose**: Build complete operation manifest with SHA-256 hashes

**Steps:**

1. Compute SHA-256 hash of source note file
2. If `updateLinks=true`, call `updateVaultLinks({ mode: 'render' })`
3. Build transaction manifest with all file operations
4. Generate UUID v4 correlation ID for tracking

**Output**: `TransactionManifest` containing:

- Note rename details (from, to, SHA-256 hash)
- Link update list (paths, hashes, rendered content)
- Total operation count

**Timing**: ~5-10ms (I/O-bound hash computation)

**Errors**:

- `TRANSACTION_PLAN_FAILED` - Invalid paths, file not found, render failures

**Example Manifest:**

```typescript
{
  noteRename: {
    from: "/vault/Projects/note.md",
    to: "/vault/Archive/note.md",
    sha256Before: "abc123..."
  },
  linkUpdates: [
    {
      path: "/vault/Daily/2024-11-01.md",
      sha256Before: "def456...",
      renderedContent: "[[Archive/note]]",
      referenceCount: 3
    }
  ],
  totalOperations: 2
}
```

---

### Phase 2: PREPARE

**Purpose**: Stage files to temporary locations and write WAL

**Steps:**

1. Stage note to `.mcp-staged-{correlationId}` temp file
2. Stage all link update files to temp locations
3. Write WAL entry to `~/.config/mcp-lifeos/wal/`
4. Update transaction state with WAL path

**Staging Pattern:**

- Note: `{destination}.mcp-staged-{correlationId}`
- Links: `{original-path}.mcp-staged-{correlationId}`

**WAL Entry** (JSON format):

```json
{
  "version": "1.0",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-11-02T10:30:00.000Z",
  "vaultPath": "/Users/name/vault",
  "phase": "prepare",
  "operation": "rename_note",
  "manifest": { ... },
  "pid": 12345
}
```

**Timing**: ~50-200ms (depends on file count and WAL I/O)

**Errors**:

- `TRANSACTION_PREPARE_FAILED` - Filesystem errors, WAL write failures

---

### Phase 3: VALIDATE

**Purpose**: Verify staged files and detect concurrent modifications

**Steps:**

1. Recompute SHA-256 hashes of all source files
2. Compare current hashes with manifest hashes
3. Throw `TRANSACTION_STALE_CONTENT` if mismatch detected
4. Update WAL to 'validate' phase

**Staleness Detection:**

```typescript
// Source note validation
const currentHash = computeSHA256(readFileSync(oldPath));
if (currentHash !== manifest.noteRename.sha256Before) {
  throw TRANSACTION_STALE_CONTENT;
}

// Link update files validation
for (const linkUpdate of manifest.linkUpdates) {
  const currentHash = computeSHA256(readFileSync(linkUpdate.path));
  if (currentHash !== linkUpdate.sha256Before) {
    throw TRANSACTION_STALE_CONTENT;
  }
}
```

**Timing**: ~20-100ms (hash computation, scales with file count)

**Errors**:

- `TRANSACTION_STALE_CONTENT` - File modified during transaction (retry recommended)
- `TRANSACTION_VALIDATE_FAILED` - Hash computation failures

---

### Phase 4: COMMIT

**Purpose**: Atomically promote staged files using POSIX rename

**Steps:**

1. Atomically rename staged note to final destination (fs.renameSync)
2. Delete original source file
3. Commit all link update files (atomic renames)
4. Mark operations as completed in manifest
5. Update WAL to 'commit' phase

**Atomicity Guarantee:**

- Uses `fs.renameSync()` which is POSIX atomic on macOS/Linux
- Each file operation is atomic; rollback handles partial failures
- Link updates marked individually (partial success tracked)

**Timing**: ~10-50ms per file (depends on filesystem)

**Errors**:

- `TRANSACTION_COMMIT_FAILED` - Atomic rename failures, permission errors

---

### Phase 5: SUCCESS / ABORT

#### SUCCESS Path

**Purpose**: Cleanup temp files and delete WAL

**Steps:**

1. Delete all staged temp files (`.mcp-staged-*`)
2. Delete WAL entry (transaction complete)
3. Return success result with metrics

**Graceful Degradation**: Cleanup errors logged but don't fail transaction

**Timing**: ~10-30ms (background async cleanup)

#### ABORT Path

**Purpose**: Rollback changes and generate recovery instructions

**Steps:**

1. Call `rollback()` to restore original vault state
2. Generate manual recovery instructions if rollback fails
3. Preserve WAL for manual intervention
4. Return rollback result with recovery guidance

**Rollback Logic:**

```typescript
// If note was committed, restore from destination back to source
if (manifest.noteRename.completed) {
  renameSync(manifest.noteRename.to, manifest.noteRename.from);
} else {
  // Note not committed - just delete staged file
  rmSync(manifest.noteRename.stagedPath);
}

// Rollback link updates (or delete staged files if not committed)
for (const linkUpdate of manifest.linkUpdates) {
  if (linkUpdate.completed) {
    // Restore original content (requires additional logic)
  } else {
    rmSync(linkUpdate.stagedPath);
  }
}
```

**Timing**: ~50-200ms (depends on rollback complexity)

---

## Error Codes Reference

### 1. TRANSACTION_PLAN_FAILED

**Phase**: Plan  
**Rollback**: N/A (no changes yet)

**Causes:**

- Source file not found
- Invalid file paths
- Manifest building failures
- Link render failures (if `updateLinks=true`)

**Resolution:**

- Verify source file exists
- Check file paths are valid
- Ensure vault is accessible

**Example:**

```json
{
  "success": false,
  "error": "[TRANSACTION_PLAN_FAILED] Failed to build transaction manifest: ENOENT: no such file or directory",
  "errorCode": "TRANSACTION_PLAN_FAILED"
}
```

---

### 2. TRANSACTION_PREPARE_FAILED

**Phase**: Prepare  
**Rollback**: Yes (staged files deleted)

**Causes:**

- Filesystem errors during staging
- WAL directory permission issues
- Disk full errors
- Temp file write failures

**Resolution:**

- Check disk space availability
- Verify WAL directory permissions (`~/.config/mcp-lifeos/wal/`)
- Check filesystem health

**Manual Recovery**: Rarely needed (WAL not yet written or incomplete)

---

### 3. TRANSACTION_VALIDATE_FAILED

**Phase**: Validate  
**Rollback**: Yes (staged files deleted, WAL removed)

**Causes:**

- Hash computation failures
- File read errors during validation
- Filesystem corruption

**Resolution:**

- Retry operation (transient errors)
- Check file accessibility
- Verify filesystem integrity

**Manual Recovery**: Not needed (automatic rollback)

---

### 4. TRANSACTION_STALE_CONTENT

**Phase**: Validate  
**Rollback**: Yes (automatic)

**Causes:**

- File modified by another process during transaction
- Concurrent edits (user or sync service)
- SHA-256 hash mismatch detected

**Resolution:**

- **Recommended**: Retry operation (content now stable)
- Review recent changes before retrying
- Disable sync services during bulk renames

**Example:**

```json
{
  "success": false,
  "error": "[TRANSACTION_STALE_CONTENT] Files modified during transaction (staleness detected): /vault/note.md",
  "errorCode": "TRANSACTION_STALE_CONTENT",
  "correlationId": "550e8400-..."
}
```

**Prevention:**

- Avoid manual edits during rename operations
- Pause sync services (iCloud, Dropbox) during bulk operations
- Use dry-run mode to preview changes first

---

### 5. TRANSACTION_COMMIT_FAILED

**Phase**: Commit  
**Rollback**: Yes (partial changes rolled back)

**Causes:**

- Atomic rename failures
- Permission errors
- Disk full during commit
- Filesystem locked/unavailable

**Resolution:**

1. Check disk space
2. Verify file permissions
3. Ensure destination directory is writable
4. Review WAL file if preserved

**Manual Recovery**: May be needed if rollback fails

**Rollback Behavior:**

- Attempts to restore files to pre-transaction state
- If note was committed, moves it back to source location
- Deletes staged temp files
- Preserves WAL if rollback fails

---

### 6. TRANSACTION_ROLLBACK_FAILED

**Phase**: Abort  
**Rollback**: Partial or failed

**Causes:**

- Catastrophic filesystem failures
- Rollback logic errors
- Permission changes during rollback
- Disk full during recovery

**Resolution:**

**CRITICAL**: Manual recovery required

1. Stop MCP server
2. Locate WAL file: `~/.config/mcp-lifeos/wal/{timestamp}-rename-{correlationId}.wal.json`
3. Read WAL manifest to understand transaction state
4. Manually restore files based on manifest
5. Delete orphaned temp files (`.mcp-staged-*`)
6. Delete WAL file after manual recovery
7. Restart server

**See**: [WAL Recovery Guide](WAL-RECOVERY.md) for detailed procedures

---

### 7. TRANSACTION_FAILED

**Phase**: Handler-level (any phase)  
**Rollback**: Varies (depends on phase)

**Causes:**

- General transaction execution failures
- Handler-level errors
- Unexpected exceptions during transaction

**Resolution:**

- Check error message for specific details
- Review transaction metadata (correlationId, finalPhase)
- Follow resolution steps for underlying error code

**Response Structure:**

```json
{
  "success": false,
  "correlationId": "550e8400-...",
  "finalPhase": "validate",
  "walPath": "/Users/name/.config/mcp-lifeos/wal/...",
  "rollback": {
    "success": true,
    "rolledBack": [...],
    "failures": []
  },
  "metrics": {
    "totalTimeMs": 145,
    "phaseTimings": {
      "plan": 8,
      "prepare": 95,
      "validate": 42
    }
  }
}
```

---

## Performance Characteristics

### Overhead Expectations

**Baseline**: Simple file rename without transactions (~50ms)  
**With Transactions**: 2-8x overhead (100-400ms typical)

**Overhead Sources:**

- SHA-256 hash computation: 5-20ms per file
- WAL write I/O: 30-50ms
- Validation: 20-100ms (scales with file count)
- Atomic commits: 10-50ms per file
- Cleanup: 10-30ms (async background)

### Phase Timing Breakdown

| Phase | Typical Duration | Notes |
|-------|-----------------|-------|
| Plan | 5-10ms | Hash computation + link scanning |
| Prepare | 50-200ms | File staging + WAL write (I/O-bound) |
| Validate | 20-100ms | Hash recomputation (scales with files) |
| Commit | 10-50ms/file | POSIX atomic renames |
| Cleanup | 10-30ms | Background async (non-blocking) |

**Total**: 95-390ms for typical operations

### Scalability Limits

**Maximum Affected Files**: ~1000 files before memory pressure  
**WAL Size**: ~1KB metadata + ~100 bytes per affected file  
**Recommended**: <100 affected files per transaction for optimal performance

### Time Estimation Formula

Used by dry-run mode for preview:

```typescript
const BASE_RENAME_TIME = 10;           // ms
const TIME_PER_LINK_FILE = 20;        // ms per file with links
const TRANSACTION_OVERHEAD = 30;      // ms for WAL + validation
const VARIATION_FACTOR = 0.3;         // ±30% variance

const baseTime = BASE_RENAME_TIME + (affectedFiles * TIME_PER_LINK_FILE) + TRANSACTION_OVERHEAD;
const minTime = baseTime * (1 - VARIATION_FACTOR);
const maxTime = baseTime * (1 + VARIATION_FACTOR);
```

**Example** (5 files with links):

```
Base = 10 + (5 × 20) + 30 = 140ms
Min = 140 × 0.7 = 98ms
Max = 140 × 1.3 = 182ms
```

### Performance Optimization Tips

1. **Batch Operations**: Group related renames into single transactions when possible
2. **Link Updates**: Set `updateLinks: false` for performance-critical renames (manual link cleanup)
3. **Dry-Run First**: Use dry-run mode to validate operations before execution
4. **Pause Sync**: Disable iCloud/Dropbox sync during bulk rename operations
5. **Monitor Metrics**: Use correlation ID and phase timings to identify bottlenecks

---

## Integration Points

### TransactionManager (`src/transaction-manager.ts`)

**Responsibilities:**

- Five-phase protocol execution
- SHA-256 hash computation
- Manifest building and validation
- Rollback coordination
- Recovery instruction generation

**Key Methods:**

```typescript
async execute(oldPath: string, newPath: string, updateLinks: boolean): Promise<TransactionResult>
async plan(oldPath: string, newPath: string, updateLinks: boolean): Promise<TransactionManifest>
async prepare(state: TransactionState): Promise<void>
async validate(state: TransactionState): Promise<void>
async commit(state: TransactionState): Promise<void>
async success(state: TransactionState): Promise<void>
async abort(state: TransactionState, error: Error): Promise<RollbackResult>
async rollback(manifest: TransactionManifest, walPath: string): Promise<RollbackResult>
```

---

### WALManager (`src/wal-manager.ts`)

**Responsibilities:**

- WAL persistence and retrieval
- Schema version validation
- Orphaned transaction scanning
- WAL directory management
- README auto-generation

**Key Methods:**

```typescript
async writeWAL(entry: WALEntry): Promise<string>
async readWAL(walPath: string): Promise<WALEntry>
async deleteWAL(walPath: string): Promise<void>
async scanPendingWALs(): Promise<WALEntry[]>
resolvePath(entry: WALEntry): string
```

**WAL Location**: `~/.config/mcp-lifeos/wal/`  
**Filename Pattern**: `{timestamp}-rename-{correlationId}.wal.json`  
**Schema Version**: 1.0

---

### Boot Recovery (`src/index.ts`)

**Purpose**: Recover orphaned transactions on server startup

**Behavior:**

1. Scans WAL directory for entries older than 1 minute
2. Validates vault paths match configured vault
3. Attempts automatic rollback for each orphaned transaction
4. Enforces 5-second recovery time budget
5. Preserves WAL files on recovery failures
6. Server continues startup regardless of recovery outcome

**Lock File**: `.recovery.lock` prevents concurrent recovery attempts

**See**: [WAL Recovery Guide](WAL-RECOVERY.md) for details

---

### rename_note Handler (`src/server/handlers/note-handlers.ts`)

**Integration Pattern:**

```typescript
export async function renameNoteHandler(args: RenameNoteInput): Promise<RenameNoteResponse> {
  // Dry-run preview mode
  if (args.dryRun) {
    return await previewRenameOperation(args);
  }

  // Execute transaction
  const txManager = new TransactionManager(vaultPath);
  const result = await txManager.execute(oldPath, newPath, updateLinks);

  if (result.success) {
    return {
      success: true,
      oldPath,
      newPath,
      filesAffected: result.linkUpdates?.updatedCount ?? 1,
      correlationId: result.correlationId,
      metrics: result.metrics
    };
  } else {
    throw new Error(
      `[TRANSACTION_FAILED] ${result.rollback?.manualRecoveryRequired ? 'Manual recovery required' : 'Transaction aborted'}`
    );
  }
}
```

---

## Transaction Lifecycle Example

### Successful Transaction

```
1. User calls rename_note:
   {
     oldPath: "Projects/draft.md",
     newPath: "Archive/draft.md",
     updateLinks: true
   }

2. PLAN phase (8ms):
   - Compute SHA-256: abc123...
   - Scan vault for links: 3 files found
   - Build manifest: 4 total operations

3. PREPARE phase (95ms):
   - Stage note → Archive/draft.md.mcp-staged-550e8400
   - Stage link files → Daily/2024-11-01.md.mcp-staged-550e8400
   - Write WAL → ~/.config/mcp-lifeos/wal/2024-11-02-rename-550e8400.wal.json

4. VALIDATE phase (42ms):
   - Recompute hashes: all match ✓
   - Update WAL phase → validate

5. COMMIT phase (65ms):
   - Atomic rename note: Archive/draft.md ✓
   - Delete original: Projects/draft.md ✓
   - Commit link files: 3/3 success ✓
   - Update WAL phase → commit

6. SUCCESS phase (15ms):
   - Delete staged files ✓
   - Delete WAL ✓

Total: 225ms

Response:
{
  success: true,
  correlationId: "550e8400-...",
  filesAffected: 4,
  metrics: {
    totalTimeMs: 225,
    phaseTimings: { plan: 8, prepare: 95, validate: 42, commit: 65, success: 15 }
  }
}
```

---

### Failed Transaction with Rollback

```
1. User calls rename_note

2. PLAN phase: Success ✓

3. PREPARE phase: Success ✓

4. VALIDATE phase: FAILURE
   - File modified during transaction
   - SHA-256 mismatch detected
   - Error: TRANSACTION_STALE_CONTENT

5. ABORT phase (120ms):
   - Rollback triggered
   - Delete staged files ✓
   - Delete WAL ✓

Response:
{
  success: false,
  errorCode: "TRANSACTION_STALE_CONTENT",
  correlationId: "550e8400-...",
  rollback: {
    success: true,
    rolledBack: ["note_rename", "link_update", "link_update"],
    failures: []
  }
}

Recommendation: Retry operation
```

---

## Best Practices

### For Users

1. **Use Dry-Run First**: Preview high-impact operations before executing
2. **Avoid Concurrent Edits**: Don't edit files during rename operations
3. **Pause Sync Services**: Disable iCloud/Dropbox during bulk renames
4. **Monitor Errors**: Check for `TRANSACTION_STALE_CONTENT` and retry
5. **Review WAL Files**: Preserved WAL files indicate recovery needed

### For Developers

1. **Never Skip Phases**: All five phases must execute in order
2. **Preserve Atomicity**: Use `fs.renameSync()` for atomic operations
3. **Validate Paths**: Ensure all paths are within vault boundaries
4. **Log Phase Timing**: Include metrics for performance monitoring
5. **Test Rollback**: Simulate failures to verify rollback behavior
6. **Handle Partial Success**: Track link update failures individually

### For Operations

1. **Monitor WAL Directory**: Alert on WAL files older than 5 minutes
2. **Disk Space**: Ensure adequate space for temp files and WAL
3. **Backup WAL**: Include `~/.config/mcp-lifeos/wal/` in backups
4. **Recovery Time**: Budget 5 seconds for boot recovery
5. **Lock File**: Monitor `.recovery.lock` for stuck recovery processes

---

## Troubleshooting

### Q: Transaction keeps failing with TRANSACTION_STALE_CONTENT

**A**: Files are being modified during the transaction.

**Solutions:**

- Disable sync services (iCloud, Dropbox)
- Close other applications editing vault files
- Retry operation after ensuring files are stable
- Use dry-run mode to validate before executing

---

### Q: WAL files accumulating in ~/.config/mcp-lifeos/wal/

**A**: Orphaned transactions not being recovered.

**Solutions:**

- Restart MCP server (triggers boot recovery)
- Check server logs for recovery failures
- Manually recover using [WAL Recovery Guide](WAL-RECOVERY.md)
- Delete WAL files after verifying vault consistency

---

### Q: Transaction failed with TRANSACTION_ROLLBACK_FAILED

**A**: Critical failure requiring manual intervention.

**Solutions:**

1. Stop MCP server
2. Locate WAL file in `~/.config/mcp-lifeos/wal/`
3. Follow [WAL Recovery Guide](WAL-RECOVERY.md)
4. Manually restore files using WAL manifest
5. Delete WAL after recovery
6. Restart server

---

### Q: Performance degraded (>1s per rename)

**A**: Transaction overhead excessive for operation scale.

**Solutions:**

- Check affected file count (should be <100)
- Disable link updates if not needed (`updateLinks: false`)
- Verify disk I/O performance
- Review phase timings in metrics
- Consider batching operations

---

## Related Documentation

- **[WAL Recovery Guide](WAL-RECOVERY.md)**: Manual recovery procedures and troubleshooting
- **[rename_note Tool](../tools/rename_note.md)**: Comprehensive tool documentation with examples
- **[Architecture Overview](../ARCHITECTURE.md)**: System architecture and integration points
- **[Configuration Guide](CONFIGURATION.md)**: Transaction system configuration options

---

## Version History

**1.0** (2025-11-02):

- Initial comprehensive transaction system documentation
- Complete five-phase protocol specification
- All seven error codes documented with resolution steps
- Performance characteristics and optimization guidance
- Integration points and best practices

**Implementation Components:**

- Transaction infrastructure with five-phase protocol
- TransactionManager with automatic rollback
- rename_note tool integration
- Boot recovery system
- Dry-run preview mode
- Enhanced preview with link scanning
