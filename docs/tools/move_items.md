# move_items Tool Documentation

## Tool Overview

- **Name**: `move_items`
- **Purpose**: Move notes and/or folders to a different location in the vault
- **Status**: ✅ Active (File organization tool)

## TL;DR

Reorganize your vault by moving notes and folders. Supports single moves with "item" or batch operations with "items". Auto-detects whether you're moving notes or folders. Options for creating destinations, overwriting, and folder merging.

## Key Features

- **Single or Batch Move Operations**: Move one item with `item` or multiple items with `items`
- **Auto-detection of Item Types**: Automatically detects whether items are notes or folders
- **Destination Folder Creation**: Optionally create destination folders that don't exist
- **Overwrite Protection with Option**: Safe by default, with optional overwrite capability
- **Folder Merging Capability**: Merge source folders with existing folders at destination
- **PARA Method Compliance**: Supports LifeOS folder organization patterns
- **Link Preservation**: Maintains internal links and references during moves
- **Circular Move Prevention**: Protects against moving folders into themselves

## Parameters

### Required Parameters

- **`destination`** (string): Target folder path (relative to vault root)
  - Path where items will be moved
  - Can be relative path like `02-Areas/Projects` or `Archive/2024`
  - No leading slash required

### Item Selection (Mutually Exclusive)

You must use **either** `item` **or** `items`, but not both:

- **`item`** (string, optional): Single item path to move
  - Path to a single note or folder
  - Use for moving one item at a time
  
- **`items`** (array, optional): Array of items to move for batch operations
  - Each item object contains:
    - **`path`** (string, required): Path to note or folder
    - **`type`** (string, optional): 'note' or 'folder' (auto-detected if not specified)

### Optional Parameters

- **`createDestination`** (boolean, optional, default: false): Create destination if missing
  - When `true`, creates the destination folder if it doesn't exist
  - Useful for organizing into new folder structures
  
- **`overwrite`** (boolean, optional, default: false): Overwrite existing files
  - When `true`, replaces existing files at destination
  - When `false`, fails if file already exists at destination
  
- **`mergeFolders`** (boolean, optional, default: false): Merge with existing folders
  - When `true`, merges source folder contents with existing folder
  - When `false`, fails if folder with same name exists at destination
  - Only applies when moving folders

## Single vs Batch Operations

### Single Item Move (`item`)

- Move one note or folder at a time
- Simpler parameter structure
- Immediate feedback on single operation
- Best for individual reorganization tasks

### Batch Move (`items`)

- Move multiple items in one operation
- Preserves folder structure during batch moves
- More efficient for large reorganization projects
- Provides consolidated results for all moves

### Mutual Exclusivity

- Cannot use both `item` and `items` parameters together
- Tool will throw error if both are provided
- Choose based on whether moving single item or multiple items

## Item Type Detection

### Automatic Detection

- System automatically checks if path points to file or folder
- Uses filesystem inspection to determine type
- No manual specification required in most cases

### Manual Specification

- Optionally specify `type: 'note'` or `type: 'folder'` in items array
- Useful for disambiguation in edge cases
- Improves performance by skipping filesystem checks

### Type Categories

- **Notes**: `.md` files with Markdown content
- **Folders**: Directories that may contain other notes and folders

## Destination Handling

### Path Format

- Relative paths from vault root
- No leading slash required
- Examples:
  - `"02-Areas/Projects"`
  - `"Archive/2024"`
  - `"30-Resources/Documentation"`

### Auto-creation Behavior

- Default: Fails if destination folder doesn't exist
- With `createDestination=true`: Creates full path including parent folders
- Recursive creation ensures entire path exists

### PARA Method Integration

- Supports standard LifeOS folder structure:
  - `01-Inbox` - New and unprocessed items
  - `10-Projects` - Active projects
  - `20-Areas` - Ongoing areas of responsibility
  - `30-Resources` - Future reference materials
  - `40-Archive` - Completed and inactive items

## Usage Examples

### Move Single Note to Folder

```json
{
  "item": "01-Inbox/Meeting Notes 2024-08-29.md",
  "destination": "10-Projects/Q4-Planning",
  "createDestination": true
}
```

**Result**: Moves note from inbox to project folder, creating the project folder if needed.

### Move Folder with Contents

```json
{
  "item": "10-Projects/Completed-Project",
  "destination": "40-Archive/2024",
  "createDestination": true
}
```

**Result**: Moves entire project folder to archive with all contents intact.

### Batch Move Multiple Notes

```json
{
  "items": [
    {"path": "01-Inbox/Research Article 1.md", "type": "note"},
    {"path": "01-Inbox/Research Article 2.md", "type": "note"},
    {"path": "01-Inbox/Reference Notes.md", "type": "note"}
  ],
  "destination": "30-Resources/Research",
  "createDestination": true
}
```

**Result**: Moves multiple research notes from inbox to resources folder.

### Reorganize with PARA Method

```json
{
  "items": [
    {"path": "01-Inbox/Personal Goal Setting.md"},
    {"path": "01-Inbox/Fitness Tracking.md"},
    {"path": "01-Inbox/Career Development.md"}
  ],
  "destination": "20-Areas/21-Personal",
  "createDestination": true
}
```

**Result**: Organizes personal notes from inbox into Areas folder.

### Archive Old Content

```json
{
  "item": "10-Projects/2023-Website-Redesign",
  "destination": "40-Archive/Projects/2023",
  "createDestination": true
}
```

**Result**: Archives completed project to year-based archive structure.

### Create Destination on the Fly

```json
{
  "item": "01-Inbox/New Client Documentation.md",
  "destination": "10-Projects/Client-Onboarding/Documentation",
  "createDestination": true
}
```

**Result**: Creates nested folder structure and moves note into newly created destination.

## Overwrite Behavior

### Default Safety Mode

- Default `overwrite=false` prevents accidental file replacement
- Operation fails with error if file already exists at destination
- Protects against data loss from unintended overwrites

### Overwrite Mode (`overwrite=true`)

- Replaces existing files at destination
- **Safety**: System creates automatic backup before overwriting
- Use cautiously - previous file content is lost
- Best for intentional file replacement or cleanup operations

### File vs Folder Handling

- **Files**: Direct replacement when overwrite enabled
- **Folders**: Combined with `mergeFolders` option for folder conflicts
- **Mixed Operations**: Each item handled according to its type

## Folder Merging

### Default Behavior

- Default `mergeFolders=false` prevents folder conflicts
- Operation fails if folder with same name exists at destination
- Maintains clear folder boundaries and prevents unintended mixing

### Merge Mode (`mergeFolders=true`)

- Combines contents of source folder with existing destination folder
- **Conflict Resolution**: Existing files preserved unless `overwrite=true`
- **Recursive Merging**: Handles nested folder structures intelligently
- **Source Cleanup**: Removes empty source folder after successful merge

### Advanced Merging Scenarios

- **File Conflicts**: Resolved based on `overwrite` setting
- **Nested Folders**: Recursively merged maintaining structure
- **Empty Folders**: Source folders cleaned up after content transfer
- **Partial Failures**: Detailed error reporting for failed merge operations

## Link Behavior

**Important:** `move_items` does **NOT** automatically update wikilinks when moving files. Links pointing to moved files will break unless manually updated.

### What Happens to Links

When you move a note from `Projects/note.md` to `Archive/note.md`:

- **Links pointing TO the moved note**: ❌ Break (become unresolved)
- **Links WITHIN the moved note**: ✅ Preserved (content unchanged)
- **File structure**: ✅ Maintained (folders and files move intact)

### Example

**Before move:**

- `Projects/important-note.md` contains `[[reference]]`
- `Daily/2024-11-01.md` contains `[[Projects/important-note]]`

**After moving to Archive:**

- `Archive/important-note.md` still contains `[[reference]]` ✅
- `Daily/2024-11-01.md` still contains `[[Projects/important-note]]` ❌ (broken link)

### Recommendation

For moves that require link updates, use `rename_note` instead with `updateLinks: true`.

## Comparison: move_items vs rename_note

### Feature Comparison Table

| Feature | move_items | rename_note |
|---------|------------|-------------|
| **Move files** | ✅ Yes | ✅ Yes (via newPath) |
| **Move folders** | ✅ Yes | ❌ No (files only) |
| **Batch operations** | ✅ Yes (via items array) | ❌ No (single file) |
| **Rename files** | ❌ No (preserves filename) | ✅ Yes (always) |
| **Update wikilinks** | ❌ No | ✅ Yes (with `updateLinks: true`) |
| **Folder merging** | ✅ Yes (with `mergeFolders`) | ❌ N/A |
| **Overwrite protection** | ✅ Yes (with `overwrite`) | ✅ Yes (automatic) |
| **Transaction safety** | ❌ No | ✅ Yes (atomic with rollback) |
| **Dry-run preview** | ❌ No | ✅ Yes (with `dryRun: true`) |
| **Primary use case** | Folder reorganization | File renaming with link integrity |

### When to Use move_items

- Moving notes **without** renaming (keeping same filename)
- Moving entire **folders** with contents
- **Batch operations** (multiple files/folders at once)
- Reorganizing vault structure (PARA method)
- Links are not a concern or will be manually updated

### When to Use rename_note

- **Renaming** individual files
- Need **automatic link updates** across vault
- Require **transaction safety** (atomic operations with rollback)
- Want **dry-run preview** before executing
- Need **performance metrics** and correlation tracking

### Migration Example

**Scenario:** Move and rename with link updates

**Wrong approach (move_items):**

```json
{
  "item": "Projects/draft.md",
  "destination": "Archive"
}
```

**Result:** File moves but links break, no rename capability

**Right approach (rename_note):**

```json
{
  "oldPath": "Projects/draft.md",
  "newPath": "Archive/final-draft.md",
  "updateLinks": true
}
```

**Result:** File moved, renamed, all wikilinks updated atomically

## PARA Method Organization

### Common PARA Workflows

#### Inbox Processing

Move items from inbox to appropriate PARA categories:

```json
{
  "item": "01-Inbox/Weekly Review Process.md",
  "destination": "20-Areas/Productivity",
  "createDestination": true
}
```

#### Project Archival

Archive completed projects:

```json
{
  "item": "10-Projects/Website-Launch",
  "destination": "40-Archive/Projects/2024",
  "createDestination": true
}
```

#### Resource Organization

Organize reference materials:

```json
{
  "items": [
    {"path": "01-Inbox/API Documentation.md"},
    {"path": "01-Inbox/Best Practices Guide.md"}
  ],
  "destination": "30-Resources/Development",
  "createDestination": true
}
```

#### Seasonal Reorganization

Periodic cleanup and organization:

```json
{
  "items": [
    {"path": "10-Projects/Q3-Initiatives"},
    {"path": "20-Areas/Temporary-Focus"}
  ],
  "destination": "40-Archive/2024/Q3",
  "createDestination": true
}
```

### PARA Folder Structure

- **01-Inbox**: New and unprocessed items
- **10-Projects**: Active projects with deadlines
- **20-Areas**: Ongoing areas of responsibility
- **30-Resources**: Future reference materials
- **40-Archive**: Completed and inactive items

## Error Handling

### Common Error Scenarios

#### Source Not Found

```json
{
  "error": "Source item not found: NonExistent/File.md"
}
```

- Occurs when specified path doesn't exist in vault
- Check path spelling and verify item exists before moving

#### Destination Permission Denied

```json
{
  "error": "Permission denied: Cannot write to destination folder"
}
```

- Filesystem permission issues
- Ensure vault has write access to destination

#### Name Conflicts

```json
{
  "error": "Item already exists in destination: ProjectNotes.md"
}
```

- File or folder with same name exists at destination
- Use `overwrite=true` or `mergeFolders=true` to resolve

#### Invalid Paths

```json
{
  "error": "Invalid destination path: Contains illegal characters"
}
```

- Destination path contains invalid characters
- Use Obsidian-compatible folder names

#### Circular Moves

```json
{
  "error": "Cannot move folder into itself or its subdirectories"
}
```

- Attempted to move folder into its own subdirectory
- Choose different destination outside source folder hierarchy

### Error Recovery

- **Partial Failures**: Batch operations continue with remaining items
- **Detailed Reporting**: Specific error messages for each failed item
- **Rollback Safety**: No partial moves - operations complete fully or fail cleanly
- **Retry Logic**: Built-in retry for transient filesystem issues

## Implementation Details

### Core Handler

- **Location**: `VaultUtils.moveItem()` method in `src/modules/files/vault-utils.ts`
- **Type Detection**: File system checks using Node.js `statSync()`
- **Path Processing**: Automatic normalization and validation
- **Error Handling**: Comprehensive error checking and reporting

### Move Process

1. **Validation**: Check source exists and destination is valid
2. **Type Detection**: Determine if moving file or folder
3. **Destination Preparation**: Create destination folder if requested
4. **Conflict Resolution**: Handle existing items based on options
5. **Move Operation**: Execute filesystem move with error handling
6. **Link Updates**: Update internal links to reflect new paths
7. **Result Reporting**: Generate detailed operation results

### Folder Merging Implementation

- **Recursive Processing**: `mergeFolders()` method handles nested structures
- **Item-by-item Merging**: Each file and subfolder processed individually
- **Conflict Resolution**: Per-item handling based on overwrite settings
- **Cleanup**: Source folders removed after successful content transfer

### Safety Mechanisms

- **Circular Move Prevention**: Path analysis prevents moving folders into themselves
- **Permission Checks**: Verify write access before attempting moves
- **Atomic Operations**: Moves complete fully or fail without partial states
- **Backup Creation**: Automatic backup before overwrite operations

## Best Practices

### Plan Your Organization

- **Map Current Structure**: Use `list` tool to understand current vault organization
- **Test with Single Items**: Start with individual moves before batch operations
- **Use Consistent Patterns**: Follow PARA method or established folder conventions

### Safety First

- **Default Settings**: Start with default safety settings (`overwrite=false`, `mergeFolders=false`)
- **Enable Options Carefully**: Only enable overwrite/merge when intentionally needed
- **Backup Important Content**: Consider manual backups before major reorganization

### Efficient Workflows

- **Batch Similar Items**: Group related notes/folders for batch moves
- **Create Destinations**: Use `createDestination=true` for new organizational structures
- **Process Systematically**: Work through inbox processing in logical order

### Link Maintenance

- **Trust Auto-updates**: Let the system handle link updates automatically
- **Verify After Moves**: Check important links after major reorganization
- **Monitor Broken Links**: Watch for any link update failures

### PARA Method Best Practices

- **Regular Reviews**: Periodically move items between PARA categories
- **Clear Criteria**: Establish clear rules for what belongs in each category
- **Archive Regularly**: Move completed projects and outdated areas to archive
- **Process Inbox**: Regularly clear inbox by moving items to appropriate categories

## Performance Considerations

### Operation Speed

- **Large Folder Moves**: May be slow for folders with many files
- **Link Updates**: Add overhead proportional to number of internal links
- **Batch Efficiency**: Batch operations more efficient than multiple single moves
- **Filesystem Performance**: Performance varies by storage type (SSD vs HDD, local vs network)

### Resource Usage

- **Memory Usage**: Minimal memory footprint for file operations
- **Disk I/O**: Primary performance factor for large moves
- **Link Processing**: CPU intensive for notes with many links
- **iCloud Sync**: Additional overhead on macOS with iCloud-synced vaults

### Optimization Tips

- **Batch Related Items**: Group moves to same destination for efficiency
- **Off-peak Processing**: Perform large reorganization during off-peak hours
- **Monitor Progress**: Watch for slow operations and interrupt if necessary
- **Network Considerations**: Be aware of sync delays with cloud-synced vaults

## Related Tools

### Primary Organization Tools

- **`list`**: Browse folder structure and discover move candidates
- **`search`**: Find items to move based on content or properties
- **`create_note`**: Specify initial location when creating notes
- **`create_note_smart`**: Intelligent note creation with proper folder placement

### Verification Tools

- **`read_note`**: Verify notes after move operations
- **`get_yaml_rules`**: Understand organization rules and compliance
- **`list_yaml_properties`**: Analyze metadata for organization decisions

### Complementary Organization Tools

- **`update_note`**: Modify metadata after reorganization
- **`insert_content`**: Add content to moved notes
- **Analytics Dashboard**: Track move patterns and organization effectiveness

### PARA Method Tools

All LifeOS tools support PARA method organization:

- Use `search` to find items for PARA categorization
- Use `list` to explore PARA folder structures
- Use `move_items` to maintain PARA organization

## Common Use Cases

### Inbox Processing to PARA Folders

Regular workflow for processing new items:

```json
{
  "items": [
    {"path": "01-Inbox/Project Planning Template.md"},
    {"path": "01-Inbox/Meeting Schedule.md"},
    {"path": "01-Inbox/Research Links.md"}
  ],
  "destination": "20-Areas/Work",
  "createDestination": true
}
```

### Project Archival

Moving completed projects to archive:

```json
{
  "item": "10-Projects/Website-Redesign-2024",
  "destination": "40-Archive/Projects/2024",
  "createDestination": true
}
```

### Note Consolidation

Combining related notes into organized folders:

```json
{
  "items": [
    {"path": "scattered/Note1.md"},
    {"path": "random/Note2.md"},
    {"path": "misc/Note3.md"}
  ],
  "destination": "30-Resources/Consolidated-Topic",
  "createDestination": true
}
```

### Template Organization

Organizing templates into structured folders:

```json
{
  "items": [
    {"path": "templates/meeting.md"},
    {"path": "templates/project.md"},
    {"path": "templates/person.md"}
  ],
  "destination": "00-System/Templates/Work",
  "createDestination": true
}
```

### Seasonal Cleanup

Periodic reorganization based on time periods:

```json
{
  "items": [
    {"path": "10-Projects/Q1-Initiatives"},
    {"path": "20-Areas/Temporary-Q1-Focus"}
  ],
  "destination": "40-Archive/2024/Q1",
  "createDestination": true
}
```

## Response Format

### Successful Move Operations

```json
{
  "content": [{
    "type": "text",
    "text": "# Move Operation Results\n\n## ✅ Successfully Moved\n\n**Folders (1):**\n- 📁 40-Archive/Projects/2024/Website-Redesign\n\n**Notes (2):**\n- 📄 20-Areas/Work/Meeting Schedule.md\n- 📄 30-Resources/Research Links.md\n\n**Destination:** `20-Areas/Work`"
  }]
}
```

### Mixed Success/Failure Results

```json
{
  "content": [{
    "type": "text", 
    "text": "# Move Operation Results\n\n## ✅ Successfully Moved\n\n**Notes (1):**\n- 📄 20-Areas/Work/Project Planning.md\n\n## ❌ Failed Moves\n\n- **01-Inbox/NonExistent.md**: Source item not found\n- **01-Inbox/Duplicate.md**: Item already exists in destination\n\n**Destination:** `20-Areas/Work`"
  }]
}
```

### Error Response

```json
{
  "error": "Either item or items must be provided"
}
```

### Parameter Validation Error

```json
{
  "error": "Destination is required"
}
```

## Analytics and Monitoring

### Tracked Metrics

- **Move Success/Failure Rates**: Operation success statistics
- **Item Types Moved**: Distribution of notes vs folders
- **Destination Patterns**: Most common destination folders
- **Batch vs Single Operations**: Usage pattern analysis
- **Error Categories**: Common failure types and frequencies
- **Performance Metrics**: Operation timing and efficiency

### Dashboard Views

Access analytics at `http://localhost:19832` when web interface enabled:

- **Organization Patterns**: Visual analysis of move patterns
- **PARA Method Usage**: Tracking of PARA category utilization
- **Error Analysis**: Detailed error reporting and trends
- **Performance Monitoring**: Operation timing and bottleneck identification

## Troubleshooting

### Common Issues

#### "Source item not found" Error

**Cause**: Specified path doesn't exist in vault
**Solution**:

- Use `list` tool to verify correct path
- Check spelling of file and folder names
- Ensure item hasn't been moved already

#### "Destination folder does not exist" Error

**Cause**: Target folder doesn't exist and `createDestination=false`
**Solution**:

- Set `createDestination=true` to auto-create folder
- Create destination folder manually first
- Use `list` tool to find existing folders

#### "Item already exists in destination" Error

**Cause**: File/folder with same name exists at destination
**Solution**:

- Use `overwrite=true` to replace existing files
- Use `mergeFolders=true` to merge folder contents
- Rename source item before moving

#### "Cannot move folder into itself" Error

**Cause**: Attempted circular move (folder into its own subdirectory)
**Solution**:

- Choose destination outside source folder hierarchy
- Move to sibling or parent directory instead
- Reorganize folder structure to avoid circular references

#### Performance Issues with Large Moves

**Cause**: Moving folders with many files or notes with many links
**Solution**:

- Break large operations into smaller batches
- Use single-item moves for very large folders
- Monitor system resources during operation
- Perform moves during off-peak times

### Debug Tips

1. **Start Small**: Test moves with single items before batch operations
2. **Verify Paths**: Use `list` tool to confirm source and destination paths
3. **Check Permissions**: Ensure vault has write access to all involved folders
4. **Monitor Links**: Check important links after moves to verify updates
5. **Use Analytics**: Review dashboard data to identify patterns in failures
6. **Incremental Approach**: Build complex folder structures incrementally

### Recovery Procedures

#### Partial Batch Failure

- Review detailed error messages for each failed item
- Re-run operation with only failed items after fixing issues
- Consider different parameters (overwrite, mergeFolders) for retry

#### Unintended Overwrites

- Check for automatic backups created before overwrite
- Use version history if available in sync service (iCloud, etc.)
- Restore from vault backup if necessary

#### Link Update Failures  

- Use Obsidian's broken link detection to find update failures
- Manually update links that weren't automatically processed
- Consider rebuilding link cache if issues persist

## Version History

- **v1.7.0**: Current version with comprehensive move operations and PARA method support
- **v1.1.1**: Fixed tool schema to remove unsupported oneOf constraint
- **v1.1.0**: Added move_items tool for moving notes and folders within the vault
- **v1.0.0**: Core LifeOS MCP functionality established

## Advanced Usage

### Complex Reorganization Projects

For major vault restructuring:

1. **Plan Phase**: Map current structure with `list` and `search` tools
2. **Test Phase**: Test moves with non-critical items
3. **Execute Phase**: Perform moves in logical dependency order
4. **Verify Phase**: Check links and organization after completion
5. **Cleanup Phase**: Archive old structures and optimize organization

### Automation Integration

- Combine with other MCP tools for automated organization workflows
- Use search results to identify candidates for batch moves
- Integrate with external automation tools (Raycast, etc.)

### Custom Organization Schemes

Beyond PARA method:

- Create custom folder hierarchies with `createDestination=true`
- Implement project-specific organization patterns
- Support topic-based or chronological organization schemes
- Maintain multiple organizational views of same content
