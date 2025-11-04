# Read Note Tool Documentation

## Overview

**Tool Name**: `read_note`  
**Purpose**: Read a note from the vault and return its content with metadata  
**Status**: ✅ Active (Primary tool for note retrieval)

The `read_note` tool provides straightforward access to individual notes in your LifeOS vault. It reads a note's complete content, parses its YAML frontmatter, and returns a formatted response with metadata and clickable Obsidian links.

> **TL;DR**: Simple note reader that returns full content and metadata. Just provide the path (absolute or relative). Returns formatted text with frontmatter, content, and clickable Obsidian link. Handles spaces in paths automatically and normalizes tags to array format.

## Key Features

- **Full Note Content Retrieval**: Returns complete note content including markdown body
- **YAML Frontmatter Parsing**: Extracts and validates YAML metadata with graceful error handling
- **Path Normalization**: Automatically handles escaped spaces and resolves relative paths
- **Clickable Obsidian Links**: Generates working `obsidian://` URLs for direct vault access
- **Tag Normalization**: Converts tag formats (string, array, null) to consistent array display
- **Formatted Output**: Clean, structured presentation with metadata headers and content separation
- **Error Resilience**: Handles malformed YAML with fallback parsing

## Parameters

The `read_note` tool accepts a single required parameter:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Full path to the note |

### Path Formats Supported

- **Absolute Path**: `/full/path/to/note.md`
- **Relative Path**: `folder/note.md` (resolved from vault root)
- **Escaped Spaces**: `folder/my\ note.md` (automatically handled)
- **Without Extension**: `folder/note` (.md extension assumed if not provided)

## Path Resolution

The tool intelligently handles different path formats:

1. **Absolute Paths**: Used directly if they start with `/`
2. **Relative Paths**: Prepended with vault root path if they don't start with `/`
3. **Space Handling**: Escaped spaces (`\`) are automatically converted to regular spaces
4. **Extension Handling**: While .md extension is assumed in most contexts, always include it for clarity

### Examples of Valid Paths

```
# Absolute paths
/Users/username/LifeOS/Daily Notes/2025-01-01.md
/Users/username/LifeOS/People/John Doe.md

# Relative paths (resolved from vault root)
Daily Notes/2025-01-01.md
People/John Doe.md
Projects/Web Development/React Notes.md

# With escaped spaces (automatically handled)
Daily\ Notes/2025-01-01.md
People/John\ Doe.md
```

## Response Format

The tool returns a formatted text response with the following structure:

```
# [Note Title]

**Path:** [full absolute path]
**Content Type:** [type from frontmatter]
**Tags:** [comma-separated tag list or "None"]

🔗 [Open in Obsidian: [Note Title]](obsidian://url)

---

[Complete note content including any markdown formatting]
```

## Output Structure

### Header Section

- **Title**: Extracted from frontmatter `title` field or "Untitled" if missing
- **Path**: Full absolute path to the note file
- **Content Type**: Value from `content type` frontmatter field
- **Tags**: Comma-separated list of all tags (or "None" if no tags exist)

### Navigation Section

- **Obsidian Link**: Clickable link that opens the note directly in Obsidian application
- **Separator**: Horizontal rule (`---`) to separate metadata from content

### Content Section

- **Complete Content**: Full note content as stored in the file, including all markdown formatting

## Tag Normalization

The tool handles different tag formats and normalizes them for display:

| Input Format | Display Output |
|--------------|----------------|
| `tags: ["tag1", "tag2", "tag3"]` | `tag1, tag2, tag3` |
| `tags: "single-tag"` | `single-tag` |
| `tags: null` | `None` |
| `tags: []` | `None` |
| Missing tags field | `None` |

## Usage Examples

### Reading a Daily Note

```javascript
// Read today's daily note
{
  "path": "Daily Notes/2025-01-15.md"
}
```

### Reading by Absolute Path

```javascript
// Read a specific note with full path
{
  "path": "/Users/username/LifeOS/People/Sarah Johnson.md"
}
```

### Reading a Project Note

```javascript
// Read from a subfolder
{
  "path": "Projects/MCP Server/Architecture Notes.md"
}
```

### Reading with Spaces in Path

```javascript
// Path with spaces (escaped or not)
{
  "path": "Meeting Notes/Q1 Planning Session.md"
}
```

### Reading from Areas Folder

```javascript
// Read from PARA method Areas folder
{
  "path": "Areas/Health & Fitness/Workout Routines.md"
}
```

## Error Handling

The tool provides clear error messages for common issues:

### File Not Found

```
Error: Note not found: /path/to/missing/note.md
```

### Invalid Path Format

- Resolves relative paths automatically
- Handles escaped characters gracefully
- Provides specific error context

### Permission Errors

- Reports file system permission issues
- Suggests potential solutions

### Corrupted YAML Frontmatter

- Attempts graceful recovery with fallback parsing
- Reports parsing issues while still returning available content
- Maintains basic metadata structure even with malformed YAML

## Implementation Details

### Core Functions Used

- **Reader**: `VaultUtils.readNote()` - Handles file reading and YAML parsing
- **Tag Handler**: `VaultUtils.normalizeTagsToArray()` - Converts tags to consistent format
- **Link Generator**: `ObsidianLinks.createClickableLink()` - Creates working Obsidian URLs
- **Path Resolver**: Built-in normalization for spaces and relative paths

### YAML Processing

- Uses `gray-matter` library for frontmatter parsing
- Implements fallback parsing for corrupted YAML
- Preserves original content structure during metadata extraction

### iCloud Sync Resilience

- Implements retry logic for temporary file access issues
- Handles macOS iCloud sync delays automatically
- Provides robust file system interaction on iCloud-synced vaults

## Performance Considerations

### Direct File Access

- No caching layer - always reads fresh from disk
- Immediate reflection of file system changes
- Suitable for single-note operations

### YAML Parsing Overhead

- Frontmatter parsing adds minimal latency
- Fallback parsing for corrupted YAML may take longer
- Generally negligible for typical note sizes

### Large File Handling

- Reads entire file content into memory
- May have performance impact for very large notes (>10MB)
- No built-in content truncation or streaming

## Best Practices

### When to Use read_note

- **Before Editing**: Read note content to understand current state before making changes
- **Content Export**: Extract note content for external processing or backup
- **Metadata Verification**: Check frontmatter fields and tag assignments
- **Content Validation**: Verify note structure before automated processing

### Path Recommendations

- Always use relative paths when possible for vault portability
- Include `.md` extension explicitly to avoid ambiguity
- Use forward slashes (`/`) even on Windows for consistency
- Verify paths with `list` or `search` tools before reading if uncertain

### Performance Tips

- Use `search` tool to find notes by content rather than reading multiple files
- Consider `list` tool for browsing available notes before specific reads
- Cache results in your application if reading the same note repeatedly

## Common Use Cases

### Review Before Editing

```javascript
// Read note first to understand current content
read_note -> edit_note -> read_note (verify changes)
```

### Content Export Workflow

```javascript
// Export note content for external processing
read_note -> process content -> optionally edit_note with updates
```

### Metadata Validation

```javascript
// Check note metadata for compliance
read_note -> validate tags/categories -> optionally edit_note
```

### Template Verification

```javascript
// Verify template-created notes have correct structure
create_note_smart -> read_note -> verify frontmatter
```

## Related Tools

### Complementary Tools

- **`edit_note`**: Modify note after reading to understand current state
- **`search`**: Find notes to read by content, tags, or metadata
- **`list`**: Browse available notes to identify what to read
- **`insert_content`**: Add content to specific locations after reading structure

### Tool Chain Examples

```
search -> read_note -> edit_note    # Find, review, then modify
list -> read_note -> insert_content # Browse, read, then add content
read_note -> create_note_smart     # Read template, create similar note
```

## Limitations

### Content Handling

- **No Partial Retrieval**: Always returns complete note content
- **No Content Filtering**: Cannot extract specific sections or filter content
- **Raw Markdown**: Returns markdown as stored, not rendered HTML

### Performance Boundaries

- **Single Note Only**: Cannot batch read multiple notes
- **No Streaming**: Entire file loaded into memory
- **No Content Preview**: Always returns full content regardless of size

### Metadata Scope

- **Frontmatter Only**: Only processes YAML frontmatter, not inline metadata
- **No Link Analysis**: Doesn't extract or analyze internal links
- **No Embedded Content**: Doesn't process embedded images or attachments

## Integration Notes

### Claude Desktop Integration

- Provides formatted output optimized for Claude's interface
- Clickable Obsidian links work directly from Claude Desktop
- Consistent formatting across all MCP tool responses

### Raycast Integration

- Works seamlessly with `@lifeos-mcp` mentions
- Output format suitable for Raycast's text display
- Obsidian links functional from Raycast environment

### Analytics Integration

- Usage automatically tracked for performance monitoring
- Execution time recorded for optimization insights
- Success/failure rates monitored for reliability metrics

The `read_note` tool is designed for simplicity and reliability - it's a straightforward file reader that provides comprehensive note access with proper error handling and user-friendly formatting.
