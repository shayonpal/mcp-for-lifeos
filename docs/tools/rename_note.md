# rename_note Tool Documentation

## Tool Overview

- **Name**: `rename_note`
- **Purpose**: Rename note files in the vault with path validation and error handling
- **Status**: ✅ Active (Phase 1: Basic rename; Phase 2: Link detection; Phase 3: Link updates)
- **Created**: 2025-10-31
- **Last Updated**: 2025-10-31 20:54
- **MCP Issues**: MCP-105 (Phase 1), MCP-106 (Phase 2), MCP-107 (Phase 3)

## TL;DR

Rename note files in your vault with comprehensive error handling, validation, and automatic wikilink updates. Phase 1 provides basic file rename functionality. Phase 2 (MCP-106) completed internal link detection infrastructure. Phase 3 (MCP-107) adds automatic link updates when `updateLinks: true`.

## Key Features

- **File Rename Operations**: Rename notes in-place or move and rename simultaneously
- **Path Validation**: Comprehensive validation of source and destination paths
- **Structured Error Handling**: Five specific error codes with actionable messages
- **Cross-Platform Safety**: Proper path normalization for macOS, Windows, Linux
- **Automatic Link Updates**: Updates all wikilinks across vault when `updateLinks: true` (Phase 3)
- **Obsidian Filename Compliance**: Validates against Obsidian naming restrictions
- **Zero Code Duplication**: Leverages existing VaultUtils.moveItem() infrastructure

## Implementation Status

### ✅ Phase 3 Complete (MCP-107, 2025-10-31)

Automatic link updates are now available:
- **Link Updater Module** (`src/link-updater.ts`): Orchestrates vault-wide link updates after rename
- **Link Rewriting**: Preserves all wikilink formats (basic, alias, heading, embed)
- **Graceful Failures**: Continues processing on individual file failures, reports partial success
- **Performance Metrics**: Tracks scan time and update time separately
- **Integration**: Activated via `updateLinks: true` parameter in rename_note tool
- **Limitation**: No rollback mechanism - vault may be inconsistent if link updates fail

### ✅ Phase 2 Complete (MCP-106, 2025-10-31)

Internal link detection infrastructure:
- **LinkScanner Module** (`src/link-scanner.ts`): Vault-wide wikilink detection with regex-based approach
- **Performance**: <5000ms for 1000+ notes, <50ms per note
- **Supported Formats**: All Obsidian wikilink formats (basic, alias, heading, block reference, embed)

### ⚠️ Current Limitations

The following features are NOT yet implemented:

- **Rollback Safety** (Phase 4 - MCP-108): No transaction safety or rollback on link update failures
- **Dry-Run Mode** (Phase 5 - MCP-109): Preview mode to see changes before applying them

The `dryRun` parameter is accepted for forward compatibility but currently ignored. Warnings are included in responses when this parameter is provided.

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

- **`updateLinks`** (boolean, optional, default: false)
  - **Phase 3 Status**: ✅ Fully implemented
  - **Behavior**: When `true`, automatically updates all wikilinks pointing to renamed note
  - **Link Formats**: Preserves basic `[[name]]`, alias `[[name|alias]]`, heading `[[name#heading]]`, embed `![[name]]`
  - **Failure Handling**: Continues processing on individual file failures, reports partial success
  - **Limitation**: No rollback mechanism (vault may be inconsistent if link updates fail)

- **`dryRun`** (boolean, optional, default: false)
  - **Phase 3 Status**: Accepted but ignored
  - **Future**: Will preview changes without executing (Phase 5 - MCP-109)
  - **Current Behavior**: Warning added to response when provided

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

Note: Link update status is reported via absence of warnings. If link updates were requested and completed successfully, no warning appears.

### Success Response (Partial Link Update Failure)

```json
{
  "success": true,
  "oldPath": "Projects/old-name.md",
  "newPath": "Archive/new-name.md",
  "message": "Note renamed successfully from Projects/old-name.md to Archive/new-name.md",
  "warnings": [
    "Updated 8 files with links, 2 files failed to update"
  ]
}
```

### Success Response (Complete Link Update Failure)

```json
{
  "success": true,
  "oldPath": "Projects/old-name.md",
  "newPath": "Archive/new-name.md",
  "message": "Note renamed successfully from Projects/old-name.md to Archive/new-name.md",
  "warnings": [
    "Link updates failed: 10 files could not be updated"
  ]
}
```

Note: File rename succeeds even if link updates fail. Vault may be left inconsistent.

### Success Response (Dry-Run Parameter Provided)

```json
{
  "success": true,
  "oldPath": "Projects/old-name.md",
  "newPath": "Projects/new-name.md",
  "message": "Note renamed successfully from Projects/old-name.md to Projects/new-name.md",
  "warnings": [
    "Dry-run mode not implemented yet (available in Phase 5)"
  ]
}
```

Warnings array only appears when dryRun parameter is provided or link updates encounter failures.

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

### Use rename_note when:
- Renaming a single note file
- Need structured error handling with specific error codes
- Want consistent rename semantics (always operates on individual files)
- Planning to use link updates in future phases

### Use move_items when:
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

**Response** (All links updated successfully):
```json
{
  "success": true,
  "oldPath": "Projects/old-name.md",
  "newPath": "Projects/new-name.md",
  "message": "Note renamed successfully"
}
```

**Response** (Some links failed to update):
```json
{
  "success": true,
  "oldPath": "Projects/old-name.md",
  "newPath": "Projects/new-name.md",
  "message": "Note renamed successfully",
  "warnings": [
    "Updated 15 files with links, 2 files failed to update"
  ]
}
```

**Note**: File rename succeeds even if link updates fail. Check warnings for details.

## Best Practices

### Pre-Rename Validation

1. **Verify Source Exists**: Use `read_note` or `search` to confirm file exists
2. **Check Destination**: Ensure target filename doesn't already exist
3. **Enable Link Updates**: Set `updateLinks: true` to automatically update wikilinks (Phase 3)

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

### Link Management (Phase 3)

With automatic link updates available:

1. **Enable Link Updates**: Set `updateLinks: true` for most rename operations
2. **Check Warnings**: Review response warnings for any failed link updates
3. **Verify Results**: Use `search` to confirm all links updated correctly
4. **Manual Fixes**: Update any files that failed during automatic link updates
5. **Rollback Awareness**: Be aware that failed link updates cannot be rolled back (Phase 4)

## Related Tools

### Complementary Tools

- **`move_items`**: Move notes without renaming, batch operations, folder moves
- **`read_note`**: Verify note content before/after rename
- **`search`**: Find notes to rename or locate references to renamed notes
- **`edit_note`**: Update note content after rename (e.g., internal links)

### Typical Workflows

**Workflow 1: Archive Completed Project (Phase 3)**
1. `read_note` - Review project note content
2. `rename_note` with `updateLinks: true` - Move to Archive with dated name, update all links
3. `search` - Verify all links updated correctly
4. Review warnings for any failed link updates

**Workflow 2: Organize Inbox (Phase 3)**
1. `list` - View inbox contents
2. `rename_note` with `updateLinks: true` - Rename and categorize notes
3. Check response warnings for any link update failures
4. Manually fix any files that failed to update

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
- Review response warnings for any failed link updates
- Use `search` to find remaining broken links
- Manually fix files that failed during automatic updates
- Future: Rollback mechanism (Phase 4 - MCP-108)

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

### Phase 4: Atomic Operations & Rollback (MCP-108) - Next
- Add transaction safety for rename + link update operations
- Rollback mechanism if link updates fail
- Atomic vault state management
- All-or-nothing guarantee for critical operations

### Phase 5: Dry-Run Mode (MCP-109)
- Preview rename operation without executing
- Show what would change (files, links)
- Activate `dryRun` parameter

## Version History

### Phase 3 - v1.2.0 (2025-10-31)
- Link update implementation (MCP-107)
- Created link-updater module for vault-wide link updates
- Automatic wikilink updates via `updateLinks: true` parameter
- Preserves all wikilink formats (basic, alias, heading, embed)
- Graceful failure handling with partial success reporting
- Performance metrics: separate scan time and update time tracking
- 24 additional tests (12 unit, 12 integration) with 100% pass rate
- Limitation: No rollback mechanism (deferred to Phase 4)

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
- Phase 4: Atomic operations & rollback (MCP-108) - Next
- Phase 5: Dry-run mode (MCP-109)

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
