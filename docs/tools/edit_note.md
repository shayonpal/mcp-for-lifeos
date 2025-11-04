# Edit Note Tool Documentation

## Overview

**Tool Name**: `edit_note`  
**Purpose**: Edit an existing note in the LifeOS vault with frontmatter and content updates  
**Status**: ✅ Active (Primary tool for note modification)

The `edit_note` tool provides comprehensive note editing capabilities, allowing you to modify existing notes by path or title. It supports both content updates and frontmatter modifications with intelligent merge strategies.

> **TL;DR**: Update existing notes by path or title. Modify content, frontmatter, or both. Default mode merges frontmatter changes, preserving other fields. Use `mode='replace'` for complete frontmatter replacement. Automatically handles YAML compliance and field mapping.

## Key Features

- **Flexible Note Selection**: Find notes by absolute/relative path or by title search
- **Dual Update Modes**: Merge mode (default) preserves existing fields, replace mode overwrites entire frontmatter
- **Content Preservation**: Content is optional - existing content preserved if not provided
- **YAML Rules Compliance**: Automatically respects auto-managed fields and YAML validation rules
- **Field Mapping**: Intelligent mapping between API field names and YAML frontmatter structure
- **Custom Field Support**: Accepts any additional frontmatter fields beyond standard LifeOS schema
- **Path Normalization**: Handles escaped spaces and relative path resolution automatically
- **Search Integration**: Uses SearchEngine.quickSearch() for title-based note discovery

## Parameters

The `edit_note` tool accepts the following parameters:

### Core Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | No* | Path to the note file (absolute or relative to vault) |
| `title` | string | No* | Note title (alternative to path - searches for matching note) |
| `content` | string | No | New content (preserves existing if not provided) |
| `frontmatter` | object | No | Frontmatter fields to update |
| `mode` | string | No | Update mode: `merge` (default) or `replace` |

*Either `path` or `title` is required

### Frontmatter Object Properties

| Property | Type | Description | Maps to YAML |
|----------|------|-------------|--------------|
| `contentType` | string | Content type classification | `content type` |
| `category` | string | Primary category | `category` |
| `subCategory` | string | Sub-category classification | `sub-category` |
| `tags` | string[] | Array of tags | `tags` |
| `source` | string | Source URL or reference | `source` |
| `people` | string[] | People mentioned in the note | `people` |
| `[custom]` | any | Any additional custom fields | Direct mapping |

## Update Modes

### Merge Mode (Default)

- **Behavior**: Updates only the specified frontmatter fields, preserves all existing fields
- **Safety**: Safest option, prevents accidental data loss
- **Use Case**: Adding tags, updating specific metadata, making incremental changes
- **Auto-managed Fields**: Automatically preserved (created, modified, id, etc.)

```javascript
// Example: Add tags without affecting other frontmatter
{
  "frontmatter": {
    "tags": ["new-tag", "additional-tag"]
  },
  "mode": "merge"  // Optional - this is the default
}
```

### Replace Mode

- **Behavior**: Replaces entire frontmatter with provided fields
- **Safety**: ⚠️ **Dangerous** - can lose existing data if not careful
- **Protection**: Auto-managed fields are automatically preserved
- **Use Case**: Complete frontmatter restructuring, correcting malformed YAML

```javascript
// Example: Complete frontmatter replacement
{
  "frontmatter": {
    "contentType": "article",
    "category": "Technology",
    "tags": ["tech", "ai"]
  },
  "mode": "replace"
}
```

## Note Selection Methods

### By Path (Recommended for Precision)

```javascript
// Absolute path
{
  "path": "/Users/username/Obsidian/Vault/Notes/My Note.md"
}

// Relative path (resolved from vault root)
{
  "path": "Notes/My Note.md"
}

// Handles escaped spaces automatically
{
  "path": "Notes/My\\ Note\\ With\\ Spaces.md"
}
```

### By Title (Convenient but Less Precise)

```javascript
// Searches for note with matching title
{
  "title": "My Important Note"
}
```

**Note**: If both `path` and `title` are provided, `path` takes precedence.

## Usage Examples

### Update Content Only

```javascript
{
  "path": "Daily/2024-01-15.md",
  "content": "# Updated Daily Note\n\nNew content for today's note."
}
```

### Update Frontmatter Only (Merge Mode)

```javascript
{
  "title": "Project Meeting Notes",
  "frontmatter": {
    "tags": ["meeting", "project-alpha"],
    "people": ["Alice", "Bob"]
  }
}
```

### Update Both Content and Frontmatter

```javascript
{
  "path": "Articles/AI Research.md",
  "content": "# AI Research Updates\n\nLatest findings...",
  "frontmatter": {
    "contentType": "article",
    "category": "Research",
    "source": "https://example.com/research"
  }
}
```

### Find Note by Title and Update

```javascript
{
  "title": "Weekly Review Template",
  "frontmatter": {
    "subCategory": "planning",
    "tags": ["template", "weekly", "review"]
  }
}
```

### Replace Entire Frontmatter (Advanced)

```javascript
{
  "path": "Notes/Corrupted Note.md",
  "frontmatter": {
    "contentType": "note",
    "category": "Personal",
    "tags": ["corrected"]
  },
  "mode": "replace"
}
```

### Add Custom Frontmatter Fields

```javascript
{
  "path": "Research/Study Notes.md",
  "frontmatter": {
    "priority": "high",
    "deadline": "2024-12-31",
    "customField": "custom value"
  }
}
```

## Frontmatter Field Mapping

The tool automatically maps API field names to proper YAML frontmatter structure:

| API Parameter | YAML Frontmatter | Example |
|---------------|------------------|---------|
| `contentType` | `content type` | `contentType: "article"` → `content type: article` |
| `subCategory` | `sub-category` | `subCategory: "planning"` → `sub-category: planning` |
| `category` | `category` | Direct mapping |
| `tags` | `tags` | Direct mapping |
| `source` | `source` | Direct mapping |
| `people` | `people` | Direct mapping |
| Custom fields | Direct mapping | `priority: "high"` → `priority: high` |

## YAML Rules Compliance

### Auto-Managed Fields

The following fields are automatically managed by the system and preserved during updates:

- `created` - Note creation timestamp
- `modified` - Last modification timestamp  
- `id` - Unique note identifier

These fields are:

- **Never overwritten** in either merge or replace mode
- **Automatically updated** when appropriate (e.g., `modified` timestamp)
- **Excluded from manual editing** to maintain data integrity

### Best Practice

Always consult `get_yaml_rules` before modifying frontmatter to understand current YAML schema and validation rules.

## Path Resolution

### Absolute Paths

- Used as-is without modification
- Must point to valid file within the vault
- Example: `/Users/username/Obsidian/MyVault/Notes/file.md`

### Relative Paths

- Resolved from vault root directory
- Automatically prepended with vault path
- Example: `Notes/file.md` → `/vault/path/Notes/file.md`

### Escaped Spaces

- Automatically handles escaped spaces in paths
- `My\ Note.md` becomes `My Note.md`
- No manual unescaping required

### Title Search

- Uses `SearchEngine.quickSearch()` with limit of 1 result
- Returns first matching note by title
- Case-sensitive exact match preferred

## Response Format

### Success Response

```
✅ Updated note: **Note Title**

🔗 [Note Title](obsidian://vault/MyVault/path/to/note.md)

📁 Location: `path/to/note.md`
📝 Mode: merge
⏰ Modified: 2024-01-15 14:30:15
```

### Error Responses

- **Note not found**: `No note found with title: [title]`
- **Invalid path**: `Note not found: [path]`
- **Missing parameters**: `Either path or title is required`
- **YAML validation errors**: Specific validation failure messages

## Implementation Details

### Core Components Used

- **SearchEngine**: `quickSearch()` for title-based note discovery
- **Note Crud Module**: `updateNote()` for file operations and YAML processing
- **ObsidianLinks**: `createClickableLink()` for response formatting
- **YamlRulesManager**: YAML validation and compliance checking

### Update Pipeline

1. **Note Discovery**: Resolve note path from path or title parameter
2. **Path Normalization**: Handle escaped spaces and relative paths
3. **Update Preparation**: Map API fields to YAML structure
4. **Mode Processing**: Apply merge or replace logic with auto-field protection
5. **File Writing**: Write updated content with proper YAML frontmatter
6. **Response Generation**: Create formatted response with clickable links

### Error Handling

- **File Not Found**: Comprehensive error messages with context
- **Path Resolution**: Graceful handling of invalid paths
- **YAML Validation**: Detailed validation error reporting
- **Search Failures**: Clear messaging when title search returns no results

## Best Practices

### Safety First

- **Use merge mode** unless complete frontmatter replacement is needed
- **Backup important notes** before using replace mode
- **Test with non-critical notes** when learning the tool
- **Check YAML rules** before adding custom fields

### Efficiency Tips

- **Use path for precision** when you know the exact file location
- **Use title for convenience** when searching for notes by name
- **Batch similar updates** to minimize tool calls
- **Leverage auto-field protection** instead of manual field management

### Content Management

- **Preserve existing content** by omitting the content parameter
- **Use consistent formatting** in content updates
- **Maintain note structure** when making partial updates
- **Consider template usage** for structured note updates

## Common Use Cases

### Metadata Maintenance

- Adding tags to existing notes for better organization
- Updating source URLs for reference articles
- Correcting content type classifications
- Adding people references to meeting notes

### Content Updates

- Appending new information to existing notes
- Correcting factual errors in note content
- Updating outdated information with current data
- Adding cross-references and links

### Bulk Operations

- Standardizing frontmatter across note collections
- Migrating notes to new category structures
- Updating templates with improved metadata
- Correcting systematic data entry errors

### Template Maintenance

- Updating template content with improved structures
- Adding new frontmatter fields to existing templates
- Correcting template formatting and YAML structure
- Migrating legacy templates to current standards

## Error Scenarios and Solutions

### Common Errors

#### "Note not found" Error

**Problem**: Path doesn't exist or title search failed
**Solutions**:

- Verify file path accuracy and file existence
- Check spelling of title in title-based searches
- Use absolute path for guaranteed resolution
- Confirm note is within the configured vault

#### "Either path or title is required" Error

**Problem**: Neither parameter provided
**Solution**: Always include either `path` or `title` parameter

#### YAML Validation Errors

**Problem**: Frontmatter doesn't comply with LifeOS schema
**Solutions**:

- Consult `get_yaml_rules` for current schema requirements
- Validate field names and value types
- Use supported content types and categories
- Check array formatting for tags and people fields

### Recovery Strategies

- **Backup first**: Always backup notes before complex operations
- **Incremental updates**: Make small changes and verify results
- **Validation checks**: Use `get_yaml_rules` and `read_note` for verification
- **Rollback capability**: Keep track of original values for manual rollback

## Related Tools

### Complementary Tools

- **`read_note`**: Read note content before editing to understand current state
- **`search`**: Find notes to edit using advanced search capabilities
- **`get_yaml_rules`**: Understand frontmatter schema and validation rules
- **`insert_content`**: Add content at specific locations within notes

### Tool Combinations

1. **Search → Edit**: Find notes by criteria, then update them
2. **Read → Edit**: Examine current state, then make informed changes  
3. **Rules → Edit**: Check YAML schema, then update compliant frontmatter
4. **Edit → Read**: Update note, then verify changes took effect

### Alternative Approaches

- Use `create_note_smart` for new notes instead of editing non-existent ones
- Use `insert_content` for adding content at specific locations
- Use search tools for finding multiple notes that need similar updates

## Security and Data Integrity

### Auto-Managed Field Protection

- System automatically preserves critical metadata fields
- Prevents accidental modification of timestamps and IDs
- Maintains data consistency across all operations

### YAML Schema Compliance

- Validates all frontmatter changes against current schema
- Prevents invalid data from corrupting note metadata
- Maintains compatibility with Obsidian and LifeOS systems

### File Operation Safety

- Checks file existence before attempting updates
- Uses atomic file operations to prevent partial writes
- Includes retry logic for file system reliability

### Best Security Practices

- Always validate parameters before calling the tool
- Use least-privilege approach (merge vs replace mode)
- Test changes on non-critical notes first
- Maintain backup copies of important notes
