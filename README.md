# LifeOS MCP Server

A Model Context Protocol (MCP) server for managing the LifeOS Obsidian vault. This server provides AI assistants with structured access to create, read, and search notes while maintaining strict YAML compliance and organizational standards.

## Features

- **YAML-Compliant Note Creation**: Automatically follows LifeOS YAML rules
- **PARA Method Organization**: Respects Projects/Areas/Resources/Archives structure
- **Template Integration**: Uses existing vault templates for consistent formatting
- **Advanced Search Engine**: Full-text search with relevance scoring and context extraction
- **Obsidian Integration**: Clickable links that open notes directly in Obsidian
- **Daily Notes Management**: Create and manage daily journal entries
- **Strict Validation**: Prevents editing auto-managed fields and enforces formatting rules

## Installation

```bash
npm install
npm run build
```

## Configuration

1. Copy `src/config.example.ts` to `src/config.ts`
2. Update the vault paths to match your Obsidian vault location
3. Customize the PEOPLE_MAPPINGS for your specific contacts

```typescript
export const LIFEOS_CONFIG: LifeOSConfig = {
  vaultPath: '/path/to/your/vault/LifeOS (iCloud)',
  // ... other paths
};
```

## Available Tools

### Core Operations

#### `create_note`
Create a new note with proper YAML frontmatter
- **title** (required): Note title
- **content**: Markdown content
- **contentType**: Content type (Article, Daily Note, Recipe, etc.)
- **category**: Category classification
- **tags**: Array of tags
- **targetFolder**: Optional target folder
- **source**: Source URL for articles
- **people**: People mentioned in the note

#### `read_note`
Read an existing note
- **path** (required): Full path to the note

#### `get_daily_note`
Get or create a daily note
- **date**: Date in YYYY-MM-DD format (optional, defaults to today)

### Navigation Tools

#### `list_folders`
List folders in the vault
- **path**: Folder path to list (optional, defaults to root)

#### `find_notes_by_pattern`
Find notes using glob patterns
- **pattern** (required): Glob pattern (e.g., "**/*recipe*.md")

#### `list_daily_notes`
List recent daily notes with full paths (debugging tool)
- **limit**: Number of results (optional, default 10)

### Advanced Search Tools

#### `advanced_search`
Comprehensive search with full-text search, metadata filters, and relevance scoring
- **query**: General search query (searches title, content, and frontmatter)
- **contentQuery**: Search only in note content
- **titleQuery**: Search only in note titles
- **contentType**: Filter by content type
- **category**: Filter by category
- **subCategory**: Filter by sub-category
- **tags**: Filter by tags (any match)
- **author**: Filter by author
- **people**: Filter by people mentioned
- **folder**: Filter by folder path
- **excludeFolders**: Exclude specific folders
- **createdAfter/createdBefore**: Date range filters for creation
- **modifiedAfter/modifiedBefore**: Date range filters for modification
- **caseSensitive**: Case sensitive search (default: false)
- **useRegex**: Use regex for search queries (default: false)
- **includeContent**: Include content in search (default: true)
- **maxResults**: Maximum number of results (default: 20)
- **sortBy**: Sort by relevance, created, modified, or title
- **sortOrder**: Sort order (asc/desc)

#### `quick_search`
Fast text search across all notes with relevance ranking
- **query** (required): Search query
- **maxResults**: Maximum results (default: 10)

#### `search_by_content_type`
Find all notes of a specific content type
- **contentType** (required): Content type to search for
- **maxResults**: Maximum results (optional)

#### `search_recent`
Find recently modified notes
- **days**: Number of days back to search (default: 7)
- **maxResults**: Maximum results (default: 20)

#### `search_notes` (Legacy)
Basic search by metadata criteria
- **contentType**: Filter by content type
- **category**: Filter by category
- **tags**: Filter by tags array
- **folder**: Filter by folder path
- **dateStart/dateEnd**: Date range filtering

## Obsidian Integration

All search results and note references include **clickable links** that open notes directly in Obsidian using the `obsidian://` URL scheme.

### Link Format
- **Search Results**: Each result includes a "🔗 Open in Obsidian" link
- **Note Reading**: Direct links to open the specific note
- **Daily Notes**: Quick access to open daily journal entries

### URL Scheme Examples
```
obsidian://open?vault=LifeOS%20(iCloud)&file=path/to/note.md
obsidian://search?vault=LifeOS%20(iCloud)&query=search+terms
```

This allows seamless integration between Claude Desktop conversations and your Obsidian vault - simply click any note link to jump directly to that note in Obsidian.

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