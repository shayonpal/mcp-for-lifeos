# LifeOS MCP Server

A Model Context Protocol (MCP) server for managing the LifeOS Obsidian vault. This server provides AI assistants with structured access to create, read, and search notes while maintaining strict YAML compliance and organizational standards.

## Features

- **YAML-Compliant Note Creation**: Automatically follows LifeOS YAML rules
- **PARA Method Organization**: Respects Projects/Areas/Resources/Archives structure
- **Template Integration**: Uses existing vault templates for consistent formatting
- **Search & Navigation**: Content-aware search with metadata filtering
- **Daily Notes Management**: Create and manage daily journal entries
- **Strict Validation**: Prevents editing auto-managed fields and enforces formatting rules

## Installation

```bash
npm install
npm run build
```

## Configuration

The server is pre-configured for Shayon's LifeOS vault at:
```
/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)
```

## Available Tools

### `create_note`
Create a new note with proper YAML frontmatter
- **title** (required): Note title
- **content**: Markdown content
- **contentType**: Content type (Article, Daily Note, Recipe, etc.)
- **category**: Category classification
- **tags**: Array of tags
- **targetFolder**: Optional target folder
- **source**: Source URL for articles
- **people**: People mentioned in the note

### `read_note`
Read an existing note
- **path** (required): Full path to the note

### `search_notes`
Search notes by various criteria
- **contentType**: Filter by content type
- **category**: Filter by category
- **tags**: Filter by tags array
- **folder**: Filter by folder path
- **dateStart/dateEnd**: Date range filtering

### `get_daily_note`
Get or create a daily note
- **date**: Date in YYYY-MM-DD format (optional, defaults to today)

### `list_folders`
List folders in the vault
- **path**: Folder path to list (optional, defaults to root)

### `find_notes_by_pattern`
Find notes using glob patterns
- **pattern** (required): Glob pattern (e.g., "**/*recipe*.md")

## Client Integration

### Claude Desktop
Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["/Users/shayon/DevProjects/mcp-for-lifeos/dist/index.js"]
    }
  }
}
```

### Raycast
Integration instructions for Raycast MCP extension coming soon.

### Cursor IDE
Integration instructions for Cursor IDE coming soon.

## Development

```bash
# Development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Type checking
npm run typecheck
```

## YAML Compliance

The server automatically enforces LifeOS YAML rules:
- Uses `source` field for URLs (not `url` or `URL`)
- Maintains location format: `Canada [CA]` or `India [IN]`
- Never edits auto-managed fields (`date created`, `date modified`)
- Follows exact content type and category mappings
- Handles special people tagging conventions

## Folder Structure Awareness

The server understands and respects the PARA method organization:
- **00 - Meta**: System files, templates, MOCs
- **05 - Fleeting Notes**: Quick captures
- **10 - Projects**: Active work
- **20 - Areas**: Life management
- **30 - Resources**: Reference materials
- **40 - Archives**: Completed items

## Template System

The server integrates with existing vault templates and handles Templater plugin code conversion for consistent note creation.

## License

MIT