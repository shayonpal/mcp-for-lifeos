# Example Workflow: Batch Operations and Note Organization

This example demonstrates batch operations for moving, organizing, and managing multiple notes efficiently.

## Scenario

You need to reorganize your vault: move completed projects to archives, organize notes by category, and manage folder structures.

## Basic Move Operations

### Operation 1: Move Single Note

Move a single note to a different folder:

```json
{
  "tool": "move_items",
  "arguments": {
    "item": "Inbox/meeting-notes-2025-10-15.md",
    "destination": "20 - Areas/Meetings/October",
    "createDestination": true
  }
}
```

**Expected Result:**
- Note moved to `20 - Areas/Meetings/October/meeting-notes-2025-10-15.md`
- Destination folder created if it doesn't exist
- Original file removed from Inbox

### Operation 2: Move Multiple Notes

Move multiple notes in a single operation:

```json
{
  "tool": "move_items",
  "arguments": {
    "items": [
      { "path": "Inbox/article-1.md" },
      { "path": "Inbox/article-2.md" },
      { "path": "Inbox/article-3.md" }
    ],
    "destination": "30 - Resources/Articles",
    "createDestination": false
  }
}
```

**Expected Result:**
- All three notes moved to Articles folder
- Operation fails if destination doesn't exist (createDestination: false)
- Atomic operation: either all succeed or all fail

### Operation 3: Move Entire Folder

Move a complete folder structure:

```json
{
  "tool": "move_items",
  "arguments": {
    "item": "10 - Projects/Completed/Q3-Project",
    "destination": "40 - Archives/2025/Q3",
    "createDestination": true
  }
}
```

**Expected Result:**
- Entire folder moved with all contents
- Folder hierarchy preserved
- Destination created if needed

## Advanced Batch Operations

### Operation 4: Archive Completed Projects

Combine search with move to archive completed projects:

**Step 1: Find completed projects**
```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "folder": "10 - Projects",
    "yamlProperties": {
      "status": "completed"
    },
    "format": "concise",
    "maxResults": 50
  }
}
```

**Step 2: Move to archives**
```json
{
  "tool": "move_items",
  "arguments": {
    "items": [
      { "path": "10 - Projects/Project-A/overview.md" },
      { "path": "10 - Projects/Project-B/overview.md" },
      { "path": "10 - Projects/Project-C/overview.md" }
    ],
    "destination": "40 - Archives/2025/Completed",
    "createDestination": true
  }
}
```

### Operation 5: Merge Folders

Merge contents of two folders:

```json
{
  "tool": "move_items",
  "arguments": {
    "item": "30 - Resources/Old Resources",
    "destination": "30 - Resources/Active Resources",
    "mergeFolders": true,
    "overwrite": false
  }
}
```

**Expected Result:**
- Contents merged into target folder
- Existing files preserved (overwrite: false)
- Source folder removed after successful merge
- Fails if files with same names exist

### Operation 6: Reorganize by Content Type

**Step 1: Find notes by content type**
```json
{
  "tool": "search",
  "arguments": {
    "mode": "content_type",
    "contentType": "Recipe",
    "folder": "Inbox",
    "maxResults": 100
  }
}
```

**Step 2: Batch move to appropriate folder**
```json
{
  "tool": "move_items",
  "arguments": {
    "items": [
      { "path": "Inbox/pasta-carbonara.md" },
      { "path": "Inbox/chocolate-cake.md" },
      { "path": "Inbox/thai-curry.md" }
    ],
    "destination": "30 - Resources/Recipes",
    "createDestination": true
  }
}
```

## Complex Organization Scenarios

### Scenario 1: Quarterly Archive Workflow

Archive all completed items from last quarter:

**Step 1: Find items to archive**
```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "folder": "10 - Projects",
    "yamlProperties": {
      "status": "completed"
    },
    "createdBefore": "2025-10-01",
    "format": "concise",
    "maxResults": 100
  }
}
```

**Step 2: Create archive folder structure**
```json
{
  "tool": "move_items",
  "arguments": {
    "items": [
      { "path": "10 - Projects/Q3-Initiative-Alpha", "type": "folder" },
      { "path": "10 - Projects/Q3-Initiative-Beta", "type": "folder" }
    ],
    "destination": "40 - Archives/2025/Q3",
    "createDestination": true
  }
}
```

### Scenario 2: Organize Inbox by Date

Process inbox notes and organize by date:

**Step 1: Find recent inbox items**
```json
{
  "tool": "search",
  "arguments": {
    "mode": "recent",
    "folder": "Inbox",
    "days": 30,
    "sortBy": "created",
    "format": "detailed",
    "maxResults": 100
  }
}
```

**Step 2: Move to date-based folders**
```json
// October items
{
  "tool": "move_items",
  "arguments": {
    "items": [
      { "path": "Inbox/note-1.md" },
      { "path": "Inbox/note-2.md" }
    ],
    "destination": "20 - Areas/Archive/2025-10",
    "createDestination": true
  }
}

// November items
{
  "tool": "move_items",
  "arguments": {
    "items": [
      { "path": "Inbox/note-3.md" },
      { "path": "Inbox/note-4.md" }
    ],
    "destination": "20 - Areas/Archive/2025-11",
    "createDestination": true
  }
}
```

### Scenario 3: Consolidate Duplicate Folders

Merge duplicate or similar folders:

```json
{
  "tool": "move_items",
  "arguments": {
    "items": [
      { "path": "30 - Resources/Programming Tips", "type": "folder" },
      { "path": "30 - Resources/Coding Resources", "type": "folder" }
    ],
    "destination": "30 - Resources/Development",
    "createDestination": true,
    "mergeFolders": true
  }
}
```

## Folder Structure Management

### Operation 7: Create Organized Folder Structure

While `move_items` doesn't create folders directly, you can use it to move a placeholder:

**Step 1: Create structure notes**
```json
{
  "tool": "create_note",
  "arguments": {
    "title": ".folder-info",
    "content": "This folder contains Q4 2025 archives",
    "targetFolder": "40 - Archives/2025/Q4"
  }
}
```

**Step 2: Now destination exists for moves**
```json
{
  "tool": "move_items",
  "arguments": {
    "items": [
      { "path": "10 - Projects/Q4-Project-1" }
    ],
    "destination": "40 - Archives/2025/Q4"
  }
}
```

## Safety and Best Practices

### Safe Move with Verification

Always verify before moving:

**Step 1: Read note to verify it's correct**
```json
{
  "tool": "read_note",
  "arguments": {
    "path": "Inbox/important-note.md"
  }
}
```

**Step 2: Move after verification**
```json
{
  "tool": "move_items",
  "arguments": {
    "item": "Inbox/important-note.md",
    "destination": "10 - Projects/Active",
    "overwrite": false
  }
}
```

### Prevent Accidental Overwrites

```json
{
  "tool": "move_items",
  "arguments": {
    "item": "Inbox/report.md",
    "destination": "20 - Areas/Reports",
    "overwrite": false,
    "createDestination": false
  }
}
```

**Safety features:**
- `overwrite: false` prevents replacing existing files
- `createDestination: false` prevents accidental folder creation
- Operation fails safely if destination exists

## Tips & Best Practices

1. **Use search first**: Find notes before moving to ensure correct selection
2. **Batch when possible**: Multiple items in one operation is more efficient
3. **Enable `createDestination` carefully**: Only when you want automatic folder creation
4. **Set `overwrite: false`**: Prevent accidental data loss
5. **Test with single items**: Verify destination before batch operations
6. **Use `format: "concise"`**: When searching for paths to move
7. **Specify `type` explicitly**: For folders to avoid ambiguity

## Related Tools

- [`move_items`](../TOOLS.md#move_items) - Move notes and folders
- [`search`](../TOOLS.md#search) - Find notes to organize
- [`read_note`](../TOOLS.md#read_note) - Verify before moving
- [`list`](../TOOLS.md#list) - Browse folder structure
- [`rename_note`](../TOOLS.md#rename_note) - Rename without moving

## Troubleshooting

**Move operation failed?**
- Check source path exists
- Verify destination folder exists (if `createDestination: false`)
- Ensure no file conflicts (if `overwrite: false`)
- Check file/folder permissions

**Folder merge conflicts?**
- Use `overwrite: true` to replace files
- Or rename conflicting files before merge
- Review with `list` before merging

**Lost files after move?**
- Files are moved, not copied
- Check destination folder
- Use search to locate: `search(mode="pattern", pattern="**/filename.md")`
