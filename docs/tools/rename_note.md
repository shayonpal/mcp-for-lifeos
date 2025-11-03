# rename_note Tool Documentation

## Tool Overview

- **Name**: `rename_note`
- **Purpose**: Atomic note rename with transaction safety, automatic wikilink updates, and dry-run preview
- **Status**: ✅ Active (Phase 5: Complete with dry-run mode)
- **Created**: 2025-10-31
- **Last Updated**: 2025-11-02 23:03
- **MCP Issues**: MCP-105 (Phase 1), MCP-106 (Phase 2), MCP-107 (Phase 3), MCP-118 (Phase 4), MCP-122 (Phase 5), MCP-123 (Phase 5 Enhancement), MCP-124 (Block Reference Support)

## TL;DR

Rename notes atomically with full transaction safety, automatic rollback on failures, and vault-wide wikilink updates. Phase 4 (MCP-118) integrates TransactionManager providing five-phase atomic protocol ensuring vault consistency through write-ahead logging and SHA-256 staleness detection.

## Key Features

- **Atomic Transactions**: Five-phase protocol (plan, prepare, validate, commit, cleanup) ensuring all-or-nothing operations
- **Automatic Rollback**: Full rollback capability on any failure preventing partial vault states
- **Write-Ahead Logging**: WAL persistence at `~/.config/mcp-lifeos/wal/` for crash recovery
- **Staleness Detection**: SHA-256 hash validation prevents overwriting concurrent file changes
- **Automatic Link Updates**: Vault-wide wikilink updates using two-phase commit protocol
- **Performance Metrics**: Transaction correlation ID and phase timing for monitoring
- **Structured Error Handling**: Transaction-specific error codes with detailed metadata
- **Cross-Platform Safety**: Proper path normalization for macOS, Windows, Linux

## Implementation Status

### ✅ Phase 4 Complete (MCP-118, 2025-11-01)

**BREAKING CHANGE**: Transaction-based atomic rename operations:

- **TransactionManager Integration** (`src/transaction-manager.ts`): Five-phase atomic protocol with full rollback
- **Write-Ahead Logging** (`src/wal-manager.ts`): WAL persistence for crash recovery at `~/.config/mcp-lifeos/wal/`
- **All-or-Nothing Semantics**: Operations fully succeed or fully fail - no partial states
- **Warnings Array Removed**: Success responses no longer include warnings field (breaking change)
- **Transaction Error Codes**: TRANSACTION_PLAN_FAILED, TRANSACTION_PREPARE_FAILED, TRANSACTION_VALIDATE_FAILED, TRANSACTION_COMMIT_FAILED, TRANSACTION_ROLLBACK_FAILED, TRANSACTION_STALE_CONTENT, TRANSACTION_FAILED
- **Performance Tracking**: Correlation ID and phase timing metrics in success responses
- **SHA-256 Validation**: Detects concurrent file modifications during transaction
- **Automatic Rollback**: Restores vault state on any phase failure

### ✅ Phase 3 Complete (MCP-107, 2025-10-31)

Automatic link updates integrated with transactions:

- **Link Updater Module** (`src/link-updater.ts`): Two-phase commit protocol (render + commit modes)
- **Link Rewriting**: Preserves all wikilink formats (basic, alias, heading, embed)
- **Atomic Link Updates**: Integrated into transaction commit phase
- **Performance Metrics**: Tracks scan time and update time separately
- **Integration**: Activated via `updateLinks: true` parameter (default: true)

### ✅ Phase 2 Complete (MCP-106, 2025-10-31)

Internal link detection infrastructure:

- **LinkScanner Module** (`src/link-scanner.ts`): Vault-wide wikilink detection with regex-based approach
- **Performance**: <5000ms for 1000+ notes, <50ms per note
- **Supported Formats**: All Obsidian wikilink formats (basic, alias, heading, block reference, embed)

### ✅ Current Status

All planned features now implemented:

- **Dry-Run Mode** (Phase 5 - MCP-122): Preview changes before executing (Complete)

## Parameters

### Required Parameters

- **`oldPath`** (string): Current path to the note file
  - Can be absolute path or relative to vault root
  - Must point to an existing `.md` file
  - Examples: `Projects/my-note.md`, `/Users/name/vault/notes/file.md`

- **`newPath`** (string): New path for the note file
  - Can be absolute path or relative to vault root
  - Must include `.md` extension
  - Can be in same directory (in-place rename) or different directory (move + rename)
  - Examples: `Projects/renamed-note.md`, `Archive/old-project.md`

### Optional Parameters

- **`updateLinks`** (boolean, optional, default: true)
  - **Phase 4 Status**: ✅ Fully integrated with transactions
  - **Behavior**: When `true` (default), automatically updates all wikilinks in atomic transaction
  - **Link Formats**: Preserves basic `[[name]]`, alias `[[name|alias]]`, heading `[[name#heading]]`, block reference `[[name#^blockid]]`, embed `![[name]]`
  - **Failure Handling**: Automatic rollback on any link update failure (all-or-nothing)
  - **Transaction Integration**: Link updates occur during commit phase using two-phase protocol

- **`dryRun`** (boolean, optional, default: false)
  - **Phase 5 Status**: ✅ Fully implemented (MCP-122)
  - **Behavior**: When `true`, returns preview of operation without executing filesystem changes
  - **Validation**: All validations occur (FILE_NOT_FOUND, FILE_EXISTS, etc.) same as actual execution
  - **Preview Response**: Returns operation details, paths, filesAffected count, and executionMode
  - **Safe Testing**: Can run dry-run multiple times without affecting vault

## Usage Modes

### In-Place Rename

Rename a note in its current location:

```json
{
  "oldPath": "Projects/draft-proposal.md",
  "newPath": "Projects/final-proposal.md"
}
```

**Result**: File renamed within the same folder.

### Move and Rename

Move note to different folder and rename simultaneously:

```json
{
  "oldPath": "Inbox/meeting-notes.md",
  "newPath": "02-Areas/Projects/Q4-meeting-notes.md"
}
```

**Result**: File moved to new location with new name.

### Relative to Absolute Path

```json
{
  "oldPath": "temp-note.md",
  "newPath": "/Users/username/vault/Archive/2024/temp-note.md"
}
```

**Result**: Relative source path resolved and moved to absolute destination.

## Error Handling

### Error Codes

The tool provides structured error responses with specific error codes and actionable messages:

#### 1. FILE_NOT_FOUND

**Scenario**: Source file does not exist

```json
{
  "success": false,
  "error": "Source file does not exist: Projects/missing-note.md",
  "errorCode": "FILE_NOT_FOUND",
  "suggestion": "Use the list tool to find the correct path"
}
```

**Common Causes**:

- Typo in filename or path
- File was already moved or deleted
- Incorrect vault root assumption

**Resolution**: Verify file exists with `list` or `search` tool before renaming.

#### 2. FILE_EXISTS

**Scenario**: Destination file already exists

```json
{
  "success": false,
  "error": "Destination file already exists: Projects/existing-note.md",
  "errorCode": "FILE_EXISTS",
  "suggestion": "Choose a different name or delete the existing file first"
}
```

**Common Causes**:

- Target filename already in use
- Previous rename attempt completed successfully
- Duplicate file in destination folder

**Resolution**: Choose different name or manually handle existing file.

#### 3. INVALID_PATH

**Scenario**: Invalid filename or path characters

```json
{
  "success": false,
  "error": "Invalid path: Projects/note:with:colons.md",
  "errorCode": "INVALID_PATH",
  "suggestion": "Ensure the path uses valid characters and ends with .md extension"
}
```

**Common Causes**:

- Obsidian-restricted characters in filename (`:`, `|`, `\\`, `/`, `<`, `>`, `*`, `?`, `"`)
- Missing `.md` extension
- Invalid path structure

**Resolution**: Use alphanumeric characters, hyphens, and underscores only.

#### 4. PERMISSION_DENIED

**Scenario**: Filesystem permissions prevent operation

```json
{
  "success": false,
  "error": "Permission denied: Cannot rename Projects/protected-note.md",
  "errorCode": "PERMISSION_DENIED",
  "suggestion": "Check file permissions or wait for iCloud sync to complete"
}
```

**Common Causes**:

- File locked by another application
- iCloud sync in progress
- Insufficient filesystem permissions
- File open in Obsidian or other editor

**Resolution**: Close file in other apps, wait for sync, or check permissions.

#### 5. UNKNOWN_ERROR

**Scenario**: Unexpected error during operation

```json
{
  "success": false,
  "error": "An unexpected error occurred: [original error message]",
  "errorCode": "UNKNOWN_ERROR",
  "suggestion": "Check the error details and try again"
}
```

**Common Causes**:

- Filesystem-level issues
- Disk space exhaustion
- Corrupted file metadata

**Resolution**: Check system logs, verify disk space, retry operation.

#### 6. Transaction Error Codes (Phase 4)

**Added in Phase 4**: Transaction-specific error codes for atomic operations

- **TRANSACTION_PLAN_FAILED**: Planning phase failed (invalid paths, file not found)
- **TRANSACTION_PREPARE_FAILED**: Staging phase failed (filesystem issues)
- **TRANSACTION_VALIDATE_FAILED**: Validation phase failed (concurrent modifications)
- **TRANSACTION_COMMIT_FAILED**: Commit phase failed (atomic rename failed)
- **TRANSACTION_ROLLBACK_FAILED**: Rollback failed (manual recovery needed)
- **TRANSACTION_STALE_CONTENT**: File modified during transaction
- **TRANSACTION_FAILED**: General transaction failure

**Example Response**:

```json
{
  "success": false,
  "error": "Transaction validation failed: File modified during operation",
  "errorCode": "TRANSACTION_STALE_CONTENT",
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "suggestion": "Retry the operation - file was modified by another process"
}
```

**Automatic Rollback**: All transaction errors trigger automatic rollback, ensuring vault is never left in inconsistent state.

## Response Format

### Success Response (Basic Rename)

```json
{
  "success": true,
  "oldPath": "Projects/old-name.md",
  "newPath": "Projects/new-name.md",
  "message": "Note renamed successfully from Projects/old-name.md to Projects/new-name.md"
}
```

### Success Response (With Link Updates)

```json
{
  "success": true,
  "oldPath": "Projects/old-name.md",
  "newPath": "Archive/new-name.md",
  "message": "Note renamed successfully from Projects/old-name.md to Archive/new-name.md"
}
```

**Phase 4 Note**: All operations are atomic with automatic rollback. Link updates either fully succeed or the entire operation fails with a transaction error code.

### Error Response

```json
{
  "success": false,
  "error": "Detailed error message",
  "errorCode": "FILE_NOT_FOUND|FILE_EXISTS|INVALID_PATH|PERMISSION_DENIED|UNKNOWN_ERROR",
  "suggestion": "Actionable suggestion for resolution"
}
```

## Implementation Details

### Architecture

- **Handler Location**: `src/server/handlers/note-handlers.ts`
- **Core Logic**: Uses enhanced `VaultUtils.moveItem()` with optional `newFilename` parameter
- **Zero Duplication**: Leverages existing move infrastructure (adds only 1 line to moveItem)
- **Registry Integration**: Registered in `src/server/tool-registry.ts` as 13th always-available tool
- **Contracts**: TypeScript contracts in `dev/contracts/MCP-105-contracts.ts`

### Path Processing

1. **Path Normalization**: Both oldPath and newPath normalized via `normalizePath()`
2. **Security Validation**: Path traversal prevention built into normalizePath()
3. **Extension Validation**: Ensures `.md` extension on both paths
4. **Relative Path Resolution**: Resolves relative paths against vault root
5. **Cross-Platform Compatibility**: Handles Windows, macOS, Linux path formats

### Integration with VaultUtils

The rename operation uses the enhanced `VaultUtils.moveItem()` method:

```typescript
const itemName = options.newFilename || basename(normalizedSource);
```

This single-line enhancement enables rename functionality while maintaining backward compatibility for move-only operations.

### MCP Protocol Annotations

```typescript
{
  readOnlyHint: false,    // Modifies vault content
  idempotentHint: false,  // Each rename changes filesystem state
  openWorldHint: true     // Can operate on any note in vault
}
```

## Comparison with move_items

### Use rename_note when

- Renaming a single note file
- Need structured error handling with specific error codes
- Want consistent rename semantics (always operates on individual files)
- Planning to use link updates in future phases

### Use move_items when

- Moving notes without renaming (keep same filename)
- Batch operations (moving multiple notes)
- Moving entire folders
- Need folder merge capabilities
- Reorganizing vault structure

### Key Differences

| Feature | rename_note | move_items |
|---------|-------------|------------|
| Primary Purpose | Rename files | Move files/folders |
| Batch Operations | No (single file only) | Yes (via items array) |
| Folder Support | No | Yes |
| Rename Capability | Yes (always) | No (preserves filename) |
| Link Updates | Yes (Phase 3) | N/A |
| Error Codes | 5 specific codes | General error handling |
| Use Case | File renaming | Folder reorganization |

## Usage Examples

### Example 1: Simple In-Place Rename

**Scenario**: Rename a draft to its final name

```json
{
  "oldPath": "Inbox/draft-proposal.md",
  "newPath": "Inbox/client-proposal-final.md"
}
```

**Response**:

```json
{
  "success": true,
  "oldPath": "Inbox/draft-proposal.md",
  "newPath": "Inbox/client-proposal-final.md",
  "message": "Note renamed successfully"
}
```

### Example 2: Move and Rename to Archive

**Scenario**: Move completed project note to archive with dated name

```json
{
  "oldPath": "01-Projects/website-redesign.md",
  "newPath": "03-Archive/2024-Q4-website-redesign.md"
}
```

**Response**:

```json
{
  "success": true,
  "oldPath": "01-Projects/website-redesign.md",
  "newPath": "03-Archive/2024-Q4-website-redesign.md",
  "message": "Note renamed successfully"
}
```

### Example 3: Error - File Not Found

**Scenario**: Attempting to rename non-existent file

```json
{
  "oldPath": "Projects/missing-file.md",
  "newPath": "Projects/new-name.md"
}
```

**Response**:

```json
{
  "success": false,
  "error": "Source file does not exist: Projects/missing-file.md",
  "errorCode": "FILE_NOT_FOUND",
  "suggestion": "Use the list tool to find the correct path"
}
```

### Example 4: Error - File Already Exists

**Scenario**: Target filename already in use

```json
{
  "oldPath": "Projects/draft.md",
  "newPath": "Projects/existing-note.md"
}
```

**Response**:

```json
{
  "success": false,
  "error": "Destination file already exists: Projects/existing-note.md",
  "errorCode": "FILE_EXISTS",
  "suggestion": "Choose a different name or delete the existing file first"
}
```

### Example 5: Rename with Link Updates (Phase 3)

**Scenario**: Rename note and update all wikilinks

```json
{
  "oldPath": "Projects/old-name.md",
  "newPath": "Projects/new-name.md",
  "updateLinks": true
}
```

**Response** (Transaction succeeded):

```json
{
  "success": true,
  "oldPath": "Projects/old-name.md",
  "newPath": "Projects/new-name.md",
  "message": "Note renamed successfully",
  "transactionId": "550e8400-e29b-41d4-a716-446655440000",
  "metrics": {
    "totalTime": 156,
    "planTime": 12,
    "prepareTime": 45,
    "validateTime": 23,
    "commitTime": 76
  }
}
```

**Note**: With Phase 4, all operations are atomic. If link updates fail, the entire operation rolls back automatically.

### Example 6: Block Reference Link Updates (MCP-124)

**Scenario**: Rename note with block reference links

When a note contains block references like `[[OldNote#^block123]]`, the rename operation updates them to preserve the block reference:

**Before** (in other notes linking to the renamed file):

```markdown
See the introduction in [[OldNote#^intro-block]].

The key findings are in [[OldNote#^findings|Important Results]].

![[OldNote#^diagram-1]]
```

**Command**:

```json
{
  "oldPath": "OldNote.md",
  "newPath": "UpdatedNote.md",
  "updateLinks": true
}
```

**After** (block references preserved with new note name):

```markdown
See the introduction in [[UpdatedNote#^intro-block]].

The key findings are in [[UpdatedNote#^findings|Important Results]].

![[UpdatedNote#^diagram-1]]
```

**Key Features**:

- Block references detected by `^` prefix after `#`
- Caret prefix `^` preserved in all updates
- Works with aliases: `[[Note#^block|Alias]]`
- Works with embeds: `![[Note#^block]]`
- Distinct from heading links: `[[Note#Heading]]` (no caret)

### Example 7: Dry-Run Preview (Phase 5 - MCP-122)

**Scenario**: Preview rename operation before executing

```json
{
  "oldPath": "Projects/important-note.md",
  "newPath": "Archive/2024-important-note.md",
  "dryRun": true,
  "updateLinks": true
}
```

**Response** (Preview without execution):

```json
{
  "success": true,
  "preview": {
    "operation": "rename",
    "oldPath": "Projects/important-note.md",
    "newPath": "Archive/2024-important-note.md",
    "willUpdateLinks": true,
    "filesAffected": 1,
    "executionMode": "dry-run"
  }
}
```

**Key Features**:

- No filesystem changes occur
- All validation still performed (FILE_NOT_FOUND, FILE_EXISTS, etc.)
- Returns preview showing what would happen
- Can run multiple times safely
- When ready, run same command with `dryRun: false` to execute

**Error Example** (File not found during dry-run):

```json
{
  "success": false,
  "error": "Source file does not exist: Projects/missing.md",
  "errorCode": "FILE_NOT_FOUND"
}
```

### Example 8: Enhanced Dry-Run Preview (Phase 5 Enhancement - MCP-123)

**Scenario**: Preview rename with detailed link scanning, transaction phases, and time estimates

```json
{
  "oldPath": "Projects/important-note.md",
  "newPath": "Archive/2024-important-note.md",
  "dryRun": true,
  "updateLinks": true
}
```

**Response** (Enhanced preview with link details):

```json
{
  "success": true,
  "preview": {
    "operation": "rename",
    "oldPath": "Projects/important-note.md",
    "newPath": "Archive/2024-important-note.md",
    "willUpdateLinks": true,
    "filesAffected": 4,
    "executionMode": "dry-run",
    "linkUpdates": {
      "filesWithLinks": 3,
      "affectedPaths": [
        "Projects/related-note.md",
        "Projects/meeting-notes.md",
        "Archive/old-project.md"
      ],
      "totalReferences": 7
    },
    "transactionPhases": [
      {
        "phase": "plan",
        "description": "Validate paths and detect conflicts"
      },
      {
        "phase": "prepare",
        "description": "Stage files for atomic rename"
      },
      {
        "phase": "validate",
        "description": "Check for concurrent modifications"
      },
      {
        "phase": "commit",
        "description": "Execute rename and update 3 files"
      },
      {
        "phase": "success",
        "description": "Remove staging files and finalize"
      }
    ],
    "estimatedTime": {
      "min": 70,
      "max": 210
    }
  }
}
```

**Key Enhanced Features** (MCP-123):

- **Link Scanning**: `linkUpdates` field shows exactly which files contain references (3 files, 7 total references)
- **Transaction Insight**: `transactionPhases` array details the 5-phase atomic protocol with dynamic commit description
- **Time Estimation**: `estimatedTime` provides execution range (70-210ms) based on link count
- **Accurate File Count**: `filesAffected` now includes linking files (1 renamed + 3 linking = 4 total)
- **Same Validation**: All FILE_NOT_FOUND, FILE_EXISTS checks still occur
- **Safe Preview**: No filesystem changes, can run multiple times

**When `updateLinks: false`**:

```json
{
  "success": true,
  "preview": {
    "operation": "rename",
    "oldPath": "Projects/important-note.md",
    "newPath": "Archive/2024-important-note.md",
    "willUpdateLinks": false,
    "filesAffected": 1,
    "executionMode": "dry-run",
    "transactionPhases": [...],
    "estimatedTime": {
      "min": 40,
      "max": 120
    }
  }
}
```

**Note**: `linkUpdates` field only appears when `updateLinks: true`. Time estimates are faster without link updates.

## Best Practices

### Pre-Rename Validation

1. **Preview First**: Use `dryRun: true` to preview changes before executing (Phase 5)
2. **Verify Source Exists**: Use `read_note` or `search` to confirm file exists
3. **Check Destination**: Ensure target filename doesn't already exist
4. **Enable Link Updates**: Set `updateLinks: true` to automatically update wikilinks (Phase 3)

### Filename Guidelines

1. **Use Descriptive Names**: Choose clear, searchable filenames
2. **Avoid Special Characters**: Stick to alphanumeric, hyphens, underscores
3. **Include Dates if Relevant**: `2024-Q4-project-name.md` for archival clarity
4. **Follow Obsidian Conventions**: Use kebab-case or snake_case consistently

### Error Recovery

1. **FILE_NOT_FOUND**: Double-check path with `list` tool first
2. **FILE_EXISTS**: Manually inspect existing file before deciding
3. **INVALID_PATH**: Review Obsidian filename restrictions
4. **PERMISSION_DENIED**: Wait for sync, close file in other apps

### Link Management (Phase 4)

With atomic link updates:

1. **Enable Link Updates**: Set `updateLinks: true` for most rename operations (default)
2. **Verify Success**: Check response for `success: true` - all operations are all-or-nothing
3. **Handle Failures**: If operation fails, entire transaction rolls back automatically
4. **Transaction Metrics**: Review `transactionId` and phase timing in response
5. **No Partial States**: Vault is never left in inconsistent state due to automatic rollback

## Related Tools

### Complementary Tools

- **`move_items`**: Move notes without renaming, batch operations, folder moves
- **`read_note`**: Verify note content before/after rename
- **`search`**: Find notes to rename or locate references to renamed notes
- **`edit_note`**: Update note content after rename (e.g., internal links)

### Typical Workflows

**Workflow 1: Archive Completed Project (Phase 4)**

1. `read_note` - Review project note content
2. `rename_note` with `updateLinks: true` - Move to Archive with dated name, atomic link updates
3. Verify `success: true` - all operations completed or rolled back
4. Optional: `search` - Confirm all links updated if desired

**Workflow 2: Organize Inbox (Phase 4)**

1. `list` - View inbox contents
2. `rename_note` with `updateLinks: true` - Rename and categorize notes atomically
3. Check response for `success: true` or transaction error code
4. No manual fixes needed - operations are all-or-nothing

## Troubleshooting

### Issue: "File not found" but I can see it in Obsidian

**Possible Causes**:

- Path case sensitivity (Linux/macOS)
- Obsidian showing cached file list
- File in different vault than configured

**Solutions**:

- Use `list` tool to get exact path
- Check vault root configuration
- Verify file exists on filesystem

### Issue: "Permission denied" errors

**Possible Causes**:

- iCloud sync in progress
- File open in Obsidian or another app
- Filesystem permissions

**Solutions**:

- Wait 30 seconds for iCloud sync
- Close file in all applications
- Check file permissions with `ls -la`

### Issue: Links broken after rename

**Phase 3 Behavior**:

- Links ARE automatically updated when `updateLinks: true`
- If `updateLinks: false` (default), links are NOT updated

**Troubleshooting**:

- Check if `updateLinks: true` was provided in request
- Verify transaction succeeded (no `TRANSACTION_FAILED` error)
- All operations are atomic with automatic rollback on failure
- Use `search` to find any remaining broken links if needed

### Issue: Cannot rename to existing filename

**Expected Behavior**:

- Tool prevents overwriting existing files
- Returns FILE_EXISTS error

**Solutions**:

- Choose different target filename
- Manually delete or rename existing file first
- Use `read_note` to compare files before deciding

## Performance Considerations

### Single File Operations

- Rename operation: < 50ms for typical note
- Path normalization: < 5ms
- Filesystem checks: < 10ms

### Best Practices

- Rename files during low vault activity
- Avoid renaming while Obsidian is indexing
- Wait for iCloud/sync to complete before renaming

### Scaling Limitations

- Tool operates on single files only
- For bulk renames, call tool multiple times
- Consider performance impact of manual link updates (Phase 1)

## Future Phases

### ✅ Phase 3: Link Updates (MCP-107) - Complete

- ✅ Automatically update wikilinks after rename
- ✅ Handle all wikilink formats: `[[note]]`, `[[note|alias]]`, `[[note#heading]]`, `![[note]]`
- ✅ Preserve link aliases, headings, and embeds during updates
- ✅ Activate `updateLinks` parameter
- ✅ Graceful failure handling with partial success reporting

### ✅ Phase 2: Link Detection (MCP-106) - Complete

- ✅ Detect wikilinks pointing to renamed note
- ✅ Vault-wide link scanning with regex-based approach
- ✅ Comprehensive wikilink format support

### ✅ Phase 4: Atomic Operations & Rollback (MCP-118) - Complete

- ✅ Transaction safety for rename + link update operations
- ✅ Automatic rollback mechanism on any failure
- ✅ Atomic vault state management with five-phase protocol
- ✅ All-or-nothing guarantee for all operations
- ✅ Write-ahead logging for crash recovery
- ✅ SHA-256 staleness detection

### ✅ Phase 5: Dry-Run Mode (MCP-122) - Complete

- ✅ Preview rename operation without executing
- ✅ Show what would change (paths, filesAffected count)
- ✅ Validate paths without filesystem changes
- ✅ Activate `dryRun` parameter

## Version History

### Phase 5 Enhancement - v1.4.1 (2025-11-02)

- **Enhanced Dry-Run Preview** (MCP-123)
- Extended preview with link scanning, transaction phases, and time estimates
- Added `linkUpdates` field with filesWithLinks, affectedPaths, totalReferences when updateLinks enabled
- Added `transactionPhases` field showing 5-phase atomic protocol with dynamic commit description
- Added `estimatedTime` field with min/max execution range based on link count
- Updated `filesAffected` to include linking files: 1 (renamed) + affectedPaths.length
- Reuses LinkScanner (MCP-107), TransactionManager (MCP-118), SearchEngine cache
- Backward compatible with MCP-122: additive changes only
- Performance: <5s link scanning for 1000-note vaults, 40-135ms preview generation
- 2 additional integration tests validating enhanced preview structure
- Contract-driven development via TypeScript interfaces
- Enhancement-first strategy: no new code paths

### Phase 5 - v1.4.0 (2025-11-02)

- **Dry-Run Mode Implementation** (MCP-122)
- Preview rename operations without executing filesystem changes
- Full path validation (FILE_NOT_FOUND, FILE_EXISTS, etc.) in preview mode
- Returns preview response with operation details, paths, and filesAffected count
- Multiple dry-run calls safe - no filesystem modifications
- Uses TransactionManager.plan() for validation without execution
- 5 additional integration tests verifying no filesystem changes during preview
- All planned features now complete

### Phase 4 - v1.3.0 (2025-11-02)

- **BREAKING CHANGE**: Transaction-based atomic operations (MCP-118)
- Five-phase transaction protocol (plan, prepare, validate, commit, cleanup)
- Automatic rollback on any failure preventing partial vault states
- Write-ahead logging (WAL) for crash recovery
- SHA-256 staleness detection prevents concurrent modification overwrites
- Removed warnings array from success responses (breaking change)
- Transaction-specific error codes (TRANSACTION_PLAN_FAILED, TRANSACTION_PREPARE_FAILED, etc.)
- Performance metrics with transaction correlation ID and phase timing
- 66 additional tests (31 unit TransactionManager, 20+ integration, 15 boot recovery)
- All-or-nothing semantics: operations fully succeed or fully fail

### Phase 3 - v1.2.0 (2025-10-31)

- Link update implementation (MCP-107)
- Created link-updater module for vault-wide link updates
- Automatic wikilink updates via `updateLinks: true` parameter
- Preserves all wikilink formats (basic, alias, heading, embed)
- Graceful failure handling with partial success reporting
- Performance metrics: separate scan time and update time tracking
- 24 additional tests (12 unit, 12 integration) with 100% pass rate
- Note: Phase 4 added automatic rollback mechanism for all operations

### Phase 2 - v1.1.0 (2025-10-31)

- Link detection infrastructure (MCP-106)
- Created LinkScanner module for vault-wide wikilink scanning
- Regex-based approach with comprehensive format support
- Performance targets: <5000ms for 1000+ notes
- 42 additional tests (30 unit, 12 integration) with 100% pass rate
- Internal infrastructure only - no user-facing changes yet

### Phase 1 - v1.0.0 (2025-10-31)

- Initial implementation (MCP-105)
- Basic file rename functionality
- Comprehensive error handling with 5 error codes
- Forward-compatible API for future phases
- Zero code duplication architecture
- 18 tests (10 unit, 8 integration) with 100% pass rate

### Future Releases

- All planned features complete

## Testing

### Unit Tests

- Location: `tests/unit/rename-note.test.ts`
- Coverage: 10 tests covering basic functionality and error cases
- Test categories: Basic rename, error handling, edge cases

### Integration Tests

- Location: `tests/integration/rename-note.integration.test.ts`
- Coverage: 8 tests covering end-to-end scenarios
- Test categories: Successful operations, error handling, path normalization

### Manual Testing

- Verified in Claude Desktop live environment
- Tested all error codes with real filesystem
- Confirmed forward-compatible parameter handling

### Test Status

- Unit: 10/10 passing (100%)
- Integration: 8/8 passing (100%)
- Overall suite: 475/475 passing (100%)

## Support

### Questions or Issues

- Check Linear issues MCP-105 (Phase 1) and MCP-106 (Phase 2) for implementation details
- Review error codes and suggestions in error responses
- Use `diagnose_vault` for vault-level issues

### Reporting Problems

- Include oldPath and newPath in report
- Note error code and error message
- Describe expected vs actual behavior
- Mention vault size and filesystem (macOS/Windows/Linux)
