# Write-Ahead Log (WAL) Recovery Guide

**Last Updated:** 2025-11-02
**Version:** 1.0
**Status:** Production

This guide provides comprehensive documentation for WAL directory structure, boot recovery mechanisms, and manual recovery procedures for the MCP for LifeOS transaction system.

---

## Overview

Write-Ahead Logging (WAL) provides crash recovery for atomic rename operations by persisting transaction state before executing filesystem changes. If a transaction is interrupted (crash, power loss, forced termination), the WAL enables automatic or manual recovery to restore vault consistency.

**Key Concepts:**

- **External Storage**: WAL files stored outside vault (`~/.config/mcp-lifeos/wal/`) to avoid sync conflicts
- **Boot Recovery**: Automatic orphaned transaction recovery on server startup
- **Manual Recovery**: Structured procedures for failed automatic recovery
- **Schema Versioning**: Future-proof WAL format with version validation

---

## WAL Directory Structure

### Location

```
~/.config/mcp-lifeos/wal/
```

**XDG-Compliant**: Follows XDG Base Directory specification for application config
**External to Vault**: Prevents cloud storage sync conflicts
**Persistent**: Survives vault deletions and relocations

### Directory Contents

```
~/.config/mcp-lifeos/wal/
├── README.md                                              # Auto-generated documentation
├── 2024-11-02T10-30-15-123Z-rename-550e8400.wal.json     # WAL entry
├── 2024-11-02T10-35-42-789Z-rename-7a3bc912.wal.json     # WAL entry
└── .recovery.lock                                          # Boot recovery lock file (temporary)
```

### File Naming Pattern

**Pattern**: `{timestamp}-rename-{correlationId}.wal.json`

**Components:**

- **Timestamp**: ISO 8601 format with colons/dots replaced by hyphens for filesystem safety
- **Operation**: `rename` (fixed literal for rename_note operations)
- **Correlation ID**: UUID v4 for transaction tracking
- **Extension**: `.wal.json` (Write-Ahead Log in JSON format)

**Example**: `2024-11-02T10-30-15-123Z-rename-550e8400-e29b-41d4-a716-446655440000.wal.json`

---

## WAL Entry Schema

### Version 1.0 Format

```json
{
  "version": "1.0",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-11-02T10:30:15.123Z",
  "vaultPath": "/path/to/your/vault",
  "phase": "prepare",
  "operation": "rename_note",
  "manifest": {
    "noteRename": {
      "from": "/path/to/your/vault/Projects/note.md",
      "to": "/path/to/your/vault/Archive/note.md",
      "sha256Before": "abc123def456...",
      "stagedPath": "/path/to/your/vault/Archive/note.md.mcp-staged-550e8400",
      "completed": false
    },
    "linkUpdates": [
      {
        "path": "/path/to/your/vault/Daily/2024-11-01.md",
        "sha256Before": "789ghi012jkl...",
        "renderedContent": "Updated content with new link...",
        "stagedPath": "/path/to/your/vault/Daily/2024-11-01.md.mcp-staged-550e8400",
        "referenceCount": 3,
        "completed": false
      }
    ],
    "totalOperations": 2
  },
  "pid": 12345
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Schema version (currently "1.0") |
| `correlationId` | string | UUID v4 for transaction tracking |
| `timestamp` | string | ISO 8601 timestamp of transaction start |
| `vaultPath` | string | Absolute path to vault (security validation) |
| `phase` | string | Current phase: "prepare", "validate", "commit" |
| `operation` | string | Operation type (currently "rename_note" only) |
| `manifest` | object | Complete transaction manifest (see below) |
| `pid` | number | Process ID of server that created WAL |

### Manifest Structure

**noteRename Object:**

- `from`: Source note path (absolute)
- `to`: Destination note path (absolute)
- `sha256Before`: SHA-256 hash before transaction
- `stagedPath`: Temp file location (during prepare phase)
- `completed`: Boolean indicating commit status

**linkUpdates Array**: Each entry contains:

- `path`: Link file path (absolute)
- `sha256Before`: Original SHA-256 hash
- `renderedContent`: New content with updated links
- `stagedPath`: Temp file location
- `referenceCount`: Number of references in file
- `completed`: Boolean indicating commit status

---

## Boot Recovery Mechanism

### Overview

Boot recovery automatically detects and recovers orphaned transactions when the MCP server starts. This handles crashes, power losses, or forced terminations that interrupted transactions.

**Implementation**: `src/index.ts` (lines 195-335)
**Trigger**: Called in `main()` before handler registration
**Behavior**: Graceful degradation - server starts regardless of recovery outcome

### Recovery Flow

```
1. Acquire recovery lock (.recovery.lock)
   ├── Check for existing lock file
   ├── If lock is recent (<2 minutes), skip recovery
   └── If lock is stale, take over and continue

2. Scan WAL directory
   ├── Find all *.wal.json files
   ├── Filter to entries older than 1 minute (active transactions excluded)
   └── Return pending WAL list

3. For each pending WAL:
   ├── Validate vault path matches configured vault (security)
   ├── Validate all manifest paths within vault boundaries (security)
   ├── Attempt rollback via TransactionManager
   ├── Log recovery result (✅ success, ⚠️ partial, ❌ failed)
   ├── Delete WAL on successful recovery
   └── Preserve WAL on failures

4. Release recovery lock

5. Continue server startup
```

### Age Filtering

**1-Minute Threshold**: WAL files younger than 1 minute are skipped

**Rationale:**

- Prevents interfering with active transactions
- Allows brief server restarts without triggering recovery
- Reduces false positives for in-progress operations

**Edge Case**: If server crashes and restarts within 1 minute, orphaned WAL will be recovered on next restart

### Time Budget

**5-Second Limit**: Recovery process enforces 5-second time budget

**Behavior:**

- Processes WALs in order until budget exceeded
- Logs timeout warning if not all WALs processed
- Remaining WALs recovered on next server startup
- Server continues starting after timeout

**Rationale**: Prevents recovery from delaying server availability

---

### Recovery Lock File

**Location**: `~/.config/mcp-lifeos/wal/.recovery.lock`
**Purpose**: Prevents concurrent recovery attempts

**Contents:**

```json
{
  "pid": 12345,
  "timestamp": "2024-11-02T10:30:00.000Z"
}
```

**Lifecycle:**

1. Created at recovery start
2. Checked for staleness (>2 minutes)
3. Deleted at recovery completion
4. Cleaned up on next recovery if stale

**Stale Lock Handling:**

- Lock older than 2 minutes considered stale
- Stale locks automatically taken over
- Original process likely crashed/terminated

---

### Recovery Logging

**Symbols Used:**

- ✅ **Success**: Transaction fully recovered, WAL deleted
- ⚠️ **Partial**: Some operations succeeded, some failed, WAL preserved
- ❌ **Failed**: Recovery failed completely, WAL preserved
- ⏭️ **Skipped**: Lock conflict or recent WAL (< 1 minute)

**Example Logs:**

```
Found 3 orphaned transaction(s), attempting recovery...
✅ Recovered transaction 550e8400-e29b-41d4-a716-446655440000
⚠️  Partial recovery for 7a3bc912-f456-78ab-cdef-123456789012 - manual intervention needed
   WAL preserved: /Users/name/.config/mcp-lifeos/wal/2024-11-02-rename-7a3bc912.wal.json
   Failures:
   - /vault/file.md: EACCES: permission denied
❌ Recovery failed for 9f4e3a21-8765-43cd-9abc-def012345678
   WAL preserved: /Users/name/.config/mcp-lifeos/wal/2024-11-02-rename-9f4e3a21.wal.json
```

---

## Manual Recovery Procedures

### When to Use Manual Recovery

**Scenarios:**

1. **TRANSACTION_ROLLBACK_FAILED Error**: Automatic rollback failed
2. **Partial Recovery**: Boot recovery partially succeeded but has failures
3. **Preserved WAL Files**: WAL files remain after server restart
4. **Recovery Timeout**: WAL not processed within 5-second boot budget

**Indicators:**

- WAL files older than 5 minutes in `~/.config/mcp-lifeos/wal/`
- Log messages showing ⚠️ or ❌ recovery symbols
- Error responses with `manualRecoveryRequired: true`

---

### Manual Recovery Steps

#### Step 1: Stop MCP Server

```bash
# If running via npm/node
pkill -f "mcp-for-lifeos"

# If running via Claude Desktop
# Quit Claude Desktop application

# Verify server stopped
ps aux | grep mcp-for-lifeos
```

**Critical**: Server must be stopped to prevent interference

---

#### Step 2: Identify WAL Files

```bash
cd ~/.config/mcp-lifeos/wal/

# List all WAL files
ls -lh *.wal.json

# Check file ages
stat -f "%Sm %N" -t "%Y-%m-%d %H:%M:%S" *.wal.json
```

**Focus on**: Files older than 5 minutes

---

#### Step 3: Inspect WAL Contents

```bash
# Pretty-print WAL entry
cat 2024-11-02T10-30-15-123Z-rename-550e8400.wal.json | jq .

# Extract key information
jq '{phase, noteRename: .manifest.noteRename, linkCount: (.manifest.linkUpdates | length)}' < file.wal.json
```

**Key Fields to Check:**

- `phase`: Current transaction phase (prepare/validate/commit)
- `manifest.noteRename.completed`: Was note rename committed?
- `manifest.linkUpdates[].completed`: Which link updates committed?
- `manifest.noteRename.stagedPath`: Location of temp files

---

#### Step 4: Assess Vault State

```bash
# Check if source file exists
ls -lh /vault/Projects/note.md

# Check if destination file exists
ls -lh /vault/Archive/note.md

# Check for staged temp files
find /vault -name "*.mcp-staged-*" -ls
```

**Determine Transaction State:**

| Source Exists | Destination Exists | Temp Files Exist | State |
|---------------|--------------------|--------------------|-------|
| Yes | No | Yes | Prepare/Validate phase |
| No | Yes | No | Commit succeeded (cleanup needed) |
| Yes | Yes | Yes | Partial commit |
| No | No | Yes | Commit failed |

---

#### Step 5: Manual Rollback

**Scenario A: Prepare/Validate Phase (Not Committed)**

```bash
# Delete staged temp files only
find /vault -name "*.mcp-staged-550e8400" -delete

# Verify source file still exists
ls -lh /vault/Projects/note.md  # Should exist unchanged
```

**Scenario B: Commit Phase (Partial Success)**

```bash
# If note was committed, restore to source
mv /vault/Archive/note.md /vault/Projects/note.md

# Delete staged temp files
find /vault -name "*.mcp-staged-550e8400" -delete

# Verify link files not corrupted
# (Manual inspection required)
```

**Scenario C: Full Commit (Cleanup Only)**

```bash
# Just delete temp files, note already moved correctly
find /vault -name "*.mcp-staged-550e8400" -delete

# Delete WAL as transaction completed
rm ~/.config/mcp-lifeos/wal/2024-11-02-rename-550e8400.wal.json
```

---

#### Step 6: Verify Vault Consistency

```bash
# Check for orphaned temp files
find /vault -name "*.mcp-staged-*"

# Verify note is in expected location
ls -lh /vault/Projects/note.md  # Or Archive/note.md

# Check file integrity
md5 /vault/Projects/note.md
# Compare with sha256Before from WAL if needed
```

---

#### Step 7: Clean Up WAL Files

```bash
# After successful manual recovery, delete WAL
rm ~/.config/mcp-lifeos/wal/2024-11-02-rename-550e8400.wal.json

# Delete stale recovery lock if present
rm ~/.config/mcp-lifeos/wal/.recovery.lock
```

**Verification:**

```bash
# Ensure WAL directory is clean
ls -lh ~/.config/mcp-lifeos/wal/
# Should show only README.md (and possibly active WALs < 1 minute old)
```

---

#### Step 8: Restart Server

```bash
# Restart server
npm start  # Or via Claude Desktop

# Monitor logs for clean startup
# Should not show any recovery messages if cleanup successful
```

---

### Advanced Recovery Scenarios

#### Scenario: Multiple Orphaned WALs

**Problem**: Several WAL files accumulated

**Solution:**

1. Process WALs in chronological order (oldest first)
2. Inspect each WAL independently
3. Apply manual rollback steps for each
4. Delete WALs incrementally after verification

**Batch Inspection Script:**

```bash
#!/bin/bash
for wal in ~/.config/mcp-lifeos/wal/*.wal.json; do
  echo "=== $wal ==="
  jq '{timestamp, phase, noteFrom: .manifest.noteRename.from, noteTo: .manifest.noteRename.to}' < "$wal"
  echo ""
done
```

---

#### Scenario: Corrupted WAL File

**Problem**: WAL file contains invalid JSON or schema

**Symptoms:**

- Server logs "Unsupported WAL schema version"
- `jq` fails to parse WAL
- WAL file truncated or corrupted

**Solution:**

1. Backup corrupted WAL: `cp file.wal.json file.wal.json.bak`
2. Attempt manual parsing: `cat file.wal.json` (may be partially readable)
3. If unrecoverable, **CRITICAL**: Check vault for orphaned temp files manually
4. Delete corrupted WAL only after confirming vault consistency
5. Report corruption to support with .bak file

---

#### Scenario: Permission Issues

**Problem**: Cannot delete temp files or WAL

**Symptoms:**

- `EACCES: permission denied`
- Rollback fails with permission errors

**Solution:**

```bash
# Check file ownership
ls -l /vault/*.mcp-staged-*

# Fix ownership if needed
sudo chown $(whoami) /vault/*.mcp-staged-*

# Fix permissions
chmod 644 /vault/*.mcp-staged-*

# Retry deletion
rm /vault/*.mcp-staged-*
```

---

#### Scenario: Disk Full During Recovery

**Problem**: Not enough disk space to complete recovery

**Solution:**

1. Free up disk space: `df -h` to identify full volumes
2. Delete large temporary files or caches
3. Move vault to different volume if needed
4. Retry recovery after space available
5. Consider WAL directory cleanup: Delete very old WAL files (>7 days) after vault verification

---

## Troubleshooting

### Q: WAL directory doesn't exist

**A**: Normal for fresh installations.

**Expected Behavior**: WAL directory created automatically on first transaction
**Action**: No action needed unless transactions are failing

---

### Q: README.md missing from WAL directory

**A**: Auto-generated on first WAL write.

**Regeneration**: Will be created automatically on next transaction
**Manual Creation**: Not required (see `src/wal-manager.ts` lines 241-286 for content)

---

### Q: .recovery.lock won't delete

**A**: Lock file in use or permissions issue.

**Solutions:**

```bash
# Check if recovery process running
lsof ~/.config/mcp-lifeos/wal/.recovery.lock

# Force delete if stale
rm -f ~/.config/mcp-lifeos/wal/.recovery.lock

# Fix permissions
chmod 644 ~/.config/mcp-lifeos/wal/.recovery.lock
```

---

### Q: Boot recovery takes >5 seconds

**A**: Multiple WALs or slow I/O.

**Behavior**: Expected if many orphaned transactions
**Impact**: Server startup delayed but will continue
**Action**: Review server logs for recovery results, manually recover preserved WALs

---

### Q: Same WAL reappears after deletion

**A**: Active transaction creating new WAL with similar name.

**Check**: Verify timestamp is recent (< 1 minute)
**Action**: Allow transaction to complete, WAL will be cleaned up automatically

---

### Q: Vault path in WAL doesn't match current vault

**A**: Vault relocated or configuration changed.

**Security**: Boot recovery will skip WAL (vault path mismatch)
**Action**: Manually inspect WAL, update vault configuration, or delete obsolete WAL after verification

---

## Preventive Measures

### Reducing WAL Accumulation

1. **Stable Operations**: Avoid server crashes during transactions
2. **Resource Monitoring**: Ensure adequate disk space and memory
3. **Graceful Shutdown**: Use proper shutdown procedures, avoid force-kill
4. **Testing**: Use dry-run mode for high-risk operations

### Monitoring WAL Health

**Automated Monitoring:**

```bash
#!/bin/bash
# Alert if WAL files older than 5 minutes
find ~/.config/mcp-lifeos/wal/ -name "*.wal.json" -mmin +5 | while read wal; do
  echo "ALERT: Orphaned WAL detected: $wal"
done
```

**Metrics to Track:**

- WAL file count (should be 0 or low single digits)
- WAL file age (should be < 1 minute for active, 0 for completed)
- Recovery success rate (from server logs)
- .recovery.lock presence (should be transient)

### Backup Recommendations

**Include in Backups:**

- Vault directory (primary data)
- `~/.config/mcp-lifeos/wal/` (WAL directory)
- Server configuration files

**Exclude from Backups:**

- `.mcp-staged-*` temp files (ephemeral)
- `.recovery.lock` (transient)

**Backup Strategy:**

- Daily vault backups before/after bulk operations
- WAL directory snapshots during major migrations
- Point-in-time recovery capability for vault

---

## Related Documentation

- **[Transaction System Architecture](TRANSACTION-SYSTEM.md)**: Complete transaction system documentation
- **[rename_note Tool](../tools/rename_note.md)**: Tool usage and examples
- **[Configuration Guide](CONFIGURATION.md)**: WAL directory configuration options
- **[Architecture Overview](../ARCHITECTURE.md)**: System architecture and components

---

## Version History

**1.0** (2025-11-02):

- Initial comprehensive WAL recovery documentation
- Complete WAL directory structure specification
- Boot recovery mechanism with lock file handling
- Manual recovery procedures for all scenarios
- Troubleshooting guide and preventive measures

**Implementation Components:**

- Transaction infrastructure (five-phase atomic protocol)
- WAL Manager (persistent transaction logging)
- Boot recovery system (automatic orphaned transaction recovery)
