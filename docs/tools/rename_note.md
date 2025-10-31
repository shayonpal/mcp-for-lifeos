# rename_note Tool Documentation

## Tool Overview

- **Name**: `rename_note`
- **Purpose**: Rename note files in the vault with path validation and error handling
- **Status**: ✅ Active (Phase 1: Basic rename without link updates; Phase 2: Link detection infrastructure complete)
- **Created**: 2025-10-31
- **Last Updated**: 2025-10-31 04:49
- **MCP Issues**: MCP-105 (Phase 1), MCP-106 (Phase 2)

## TL;DR

Rename note files in your vault with comprehensive error handling and validation. Phase 1 provides basic file rename functionality. Phase 2 (MCP-106) completed internal link detection infrastructure. Link updates will be added in Phase 3 (MCP-107).

## Key Features

- **File Rename Operations**: Rename notes in-place or move and rename simultaneously
- **Path Validation**: Comprehensive validation of source and destination paths
- **Structured Error Handling**: Five specific error codes with actionable messages
- **Cross-Platform Safety**: Proper path normalization for macOS, Windows, Linux
- **Forward-Compatible API**: Accepts future parameters (updateLinks, dryRun) without breaking
- **Obsidian Filename Compliance**: Validates against Obsidian naming restrictions
- **Zero Code Duplication**: Leverages existing VaultUtils.moveItem() infrastructure

## Implementation Status

### ✅ Phase 2 Complete (MCP-106, 2025-10-31)

Internal link detection infrastructure is now in place:
- **LinkScanner Module** (`src/link-scanner.ts`): Vault-wide wikilink detection with regex-based approach
- **Performance**: <5000ms for 1000+ notes, <50ms per note
- **Supported Formats**: All Obsidian wikilink formats (basic, alias, heading, block reference, embed)
- **Filtering Options**: Code block exclusion, frontmatter exclusion, embed control, case sensitivity
- **Status**: Internal infrastructure only - not exposed as MCP tool yet

### ⚠️ Current Limitations

The following features are NOT yet user-facing:

- **Link Updates** (Phase 3 - MCP-107): Existing links to renamed notes are NOT automatically updated
- **Dry-Run Mode** (Phase 5 - MCP-109): Preview mode to see changes before applying them

The `updateLinks` and `dryRun` parameters are accepted for forward compatibility but currently ignored. Warnings are included in responses when these parameters are provided.

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

### Optional Parameters (Forward Compatibility)

- **`updateLinks`** (boolean, optional, default: false)
  - **Phase 1 Status**: Accepted but ignored
  - **Future**: Will update wikilinks after rename (MCP-107)
  - **Current Behavior**: Warning added to response when provided

- **`dryRun`** (boolean, optional, default: false)
  - **Phase 1 Status**: Accepted but ignored
  - **Future**: Will preview changes without executing (MCP-109)
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

### Success Response

```json
{
  "success": true,
  "oldPath": "Projects/old-name.md",
  "newPath": "Archive/new-name.md",
  "message": "Note renamed successfully from Projects/old-name.md to Archive/new-name.md",
  "warnings": [
    "Phase 1: Link updates not implemented (deferred to MCP-107)",
    "Phase 1: Dry-run mode not implemented (deferred to MCP-109)"
  ]
}
```

### Success Response (No Warnings)

```json
{
  "success": true,
  "oldPath": "Projects/old-name.md",
  "newPath": "Projects/new-name.md",
  "message": "Note renamed successfully from Projects/old-name.md to Projects/new-name.md"
}
```

Warnings array only appears when forward-compatibility parameters are provided.

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
| Link Updates | Future (MCP-107) | N/A |
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

### Example 5: Forward-Compatible Parameters (Phase 1)

**Scenario**: Using future parameters in Phase 1

```json
{
  "oldPath": "Projects/old-name.md",
  "newPath": "Projects/new-name.md",
  "updateLinks": true,
  "dryRun": true
}
```

**Response**:
```json
{
  "success": true,
  "oldPath": "Projects/old-name.md",
  "newPath": "Projects/new-name.md",
  "message": "Note renamed successfully",
  "warnings": [
    "Phase 1: Link updates not implemented (deferred to MCP-107)",
    "Phase 1: Dry-run mode not implemented (deferred to MCP-109)"
  ]
}
```

**Note**: File is renamed successfully, but link updates and dry-run are ignored.

## Best Practices

### Pre-Rename Validation

1. **Verify Source Exists**: Use `read_note` or `search` to confirm file exists
2. **Check Destination**: Ensure target filename doesn't already exist
3. **Plan Link Updates**: Note that Phase 1 does NOT update links automatically

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

### Link Management (Phase 1 Limitations)

Since Phase 1 does not update links automatically:

1. **Search for Links**: Use `search` tool to find references before renaming
2. **Manual Updates**: Update wikilinks manually after rename
3. **Document Changes**: Keep track of renamed files for reference
4. **Wait for Phase 3**: Consider deferring critical renames until MCP-107 implementation

## Related Tools

### Complementary Tools

- **`move_items`**: Move notes without renaming, batch operations, folder moves
- **`read_note`**: Verify note content before/after rename
- **`search`**: Find notes to rename or locate references to renamed notes
- **`edit_note`**: Update note content after rename (e.g., internal links)

### Typical Workflows

**Workflow 1: Archive Completed Project**
1. `read_note` - Review project note content
2. `rename_note` - Move to Archive with dated name
3. `search` - Find references to old name
4. `edit_note` - Update references in other notes

**Workflow 2: Organize Inbox**
1. `list` - View inbox contents
2. `rename_note` - Rename and categorize notes
3. `search` - Verify no broken references

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

**Expected Behavior** (Phase 1):
- Links are NOT automatically updated
- This is a known Phase 1 limitation

**Workaround**:
- Use `search` to find broken links: `search [[old-name]]`
- Manually update links with `edit_note`
- Wait for Phase 3 (MCP-107) for automatic link updates

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

### ✅ Phase 2: Link Detection (MCP-106) - Complete
- ✅ Detect wikilinks pointing to renamed note
- ✅ Vault-wide link scanning with regex-based approach
- ✅ Comprehensive wikilink format support
- ✅ Internal infrastructure ready for Phase 3

### Phase 3: Link Updates (MCP-107) - Next
- Automatically update wikilinks after rename
- Handle both `[[note]]` and `[[note|alias]]` formats
- Preserve link aliases during updates
- Activate `updateLinks` parameter

### Phase 4: Folder Detection (MCP-108)
- Support renaming folders (with file propagation)
- Update links in all files within renamed folder

### Phase 5: Dry-Run Mode (MCP-109)
- Preview rename operation without executing
- Show what would change (files, links)
- Activate `dryRun` parameter

## Version History

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
- Phase 3: Link updates (MCP-107) - Next
- Phase 4: Folder support (MCP-108)
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
