# LifeOS MCP Server

A Model Context Protocol (MCP) server for managing the LifeOS Obsidian vault. This server provides AI assistants with structured access to create, read, and search notes while maintaining strict YAML compliance and organizational standards.

## Features

- **YAML-Compliant Note Creation**: Automatically follows LifeOS YAML rules
- **PARA Method Organization**: Respects Projects/Areas/Resources/Archives structure
- **Intelligent Template System**: Full integration with 11+ LifeOS templates (restaurant, article, person, etc.)
- **Advanced Search Engine**: Full-text search with relevance scoring and context extraction
- **Obsidian Integration**: Clickable links that open notes directly in Obsidian
- **Daily Notes Management**: Create and manage daily journal entries
- **Robust Error Handling**: Graceful YAML parsing with diagnostic tools
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
  vaultPath: '/path/to/your/obsidian/vault',
  templatesPath: '/path/to/your/obsidian/vault/Templates',
  // ... other paths
};
```

## Available Tools

### Core Operations

#### `create_note`
Create a new note with proper YAML frontmatter and optional template integration
- **title** (required): Note title
- **content**: Markdown content
- **template**: Template to use (restaurant, article, person, etc.)
- **contentType**: Content type (Article, Daily Note, Recipe, etc.)
- **category**: Category classification
- **tags**: Array of tags
- **targetFolder**: Optional target folder
- **source**: Source URL for articles
- **people**: People mentioned in the note
- **customData**: Custom data for template processing

#### `create_note_from_template`
Create a note using a specific LifeOS template with auto-filled metadata
- **title** (required): Note title
- **template** (required): Template key (restaurant, article, person, daily, etc.)
- **customData**: Template-specific data (e.g., cuisine, location for restaurants)

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

#### `list_templates`
List all available note templates in the LifeOS vault
- Shows template descriptions, target folders, and usage examples

#### `diagnose_vault`
Diagnose vault issues and check for problematic files
- **checkYaml**: Check for YAML parsing errors (default: true)
- **maxFiles**: Maximum files to check (default: 100)

### Advanced Search Tools

#### `get_server_version`
Get the current server version and capabilities information
- **includeTools**: Include full list of available tools in the response (optional)

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
obsidian://open?vault=YourVaultName&file=path/to/note.md
obsidian://search?vault=YourVaultName&query=search+terms
```

This allows seamless integration between Claude Desktop conversations and your Obsidian vault - simply click any note link to jump directly to that note in Obsidian.

## Template System

The LifeOS MCP server includes intelligent template integration that automatically uses your existing Obsidian templates.

### Available Templates

| Template | Target Folder | Content Type | Description |
|----------|---------------|--------------|-------------|
| **restaurant** | `30 - Resources/Restaurants` | Reference | Restaurant notes with cuisine, location, and ratings |
| **article** | `30 - Resources/Reading` | Article | Article notes with source and author |
| **person** | `20 - Areas/Relationships` | MOC | Person/contact notes with relationships |
| **daily** | `20 - Areas/Personal/Journals/Daily` | Daily Note | Daily journal entries |
| **reference** | `30 - Resources` | Reference | General reference notes |
| **medicine** | `20 - Areas/Health` | Medical | Medicine/medication notes |
| **application** | `30 - Resources/Tools` | Reference | Application/software reviews |
| **book** | `30 - Resources/Reading` | Reference | Book notes and reviews |
| **place** | `10 - Projects` | Planning | Travel and places to visit |
| **fleeting** | `05 - Fleeting Notes` | Fleeting | Quick capture and temporary thoughts |
| **moc** | `00 - Meta/MOCs` | MOC | Maps of Content for organizing notes |

### Template Features

- **Automatic Templater Processing**: Converts `<% tp.file.title %>`, date functions, etc.
- **Smart Folder Placement**: Templates automatically target the correct PARA folders
- **Custom Data Injection**: Pass template-specific data (cuisine, location, etc.)
- **Fallback Handling**: Graceful degradation if templates are missing
- **Auto-Detection**: Infers appropriate template from note title and context

### Usage Examples

```bash
# Create a restaurant note with template
create_note_from_template title: "Example Restaurant" template: "restaurant"

# Create any note with auto-template detection
create_note title: "New Coffee Shop" template: "restaurant"

# List all available templates
list_templates
```

## Client Integration

### Claude Desktop
Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["/path/to/your/mcp-for-lifeos/dist/index.js"]
    }
  }
}
```

### Raycast
The LifeOS MCP server integrates seamlessly with Raycast for AI-powered vault interactions.

**[📖 Complete Raycast Integration Guide](docs/RAYCAST_INTEGRATION.md)**

Key features:
- Use `@lifeos-mcp` to mention the server in AI chats and commands
- Quick vault search from Raycast's root search
- Create notes and manage daily entries through AI commands
- Clickable Obsidian links for seamless vault navigation

### Cursor IDE  
Enhance your development workflow with AI-powered access to your knowledge vault.

**[📖 Complete Cursor Integration Guide](docs/CURSOR_INTEGRATION.md)**

Key features:
- Access vault context directly in Agent Mode
- Research existing knowledge while coding
- Create development notes and link to project planning
- Integrate learning materials with your coding workflow

## Versioning

The LifeOS MCP server follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Incremented when making incompatible API changes
- **MINOR**: Incremented when adding functionality in a backward compatible manner
- **PATCH**: Incremented when making backward compatible bug fixes

### Version Information

All API responses include version metadata to help clients check compatibility:

```json
{
  "content": [{ "type": "text", "text": "..." }],
  "metadata": {
    "version": "1.0.0",
    "serverName": "lifeos-mcp"
  }
}
```

### Checking Server Version

Use the `get_server_version` tool to get detailed information about the server:

```
get_server_version
```

Optional parameters:
- **includeTools**: Set to `true` to include a list of all available tools

This returns comprehensive information about the server version, capabilities, and available tools.

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
- Maintains location format: `Country [CODE]` (e.g., `Canada [CA]`, `India [IN]`)
- Never edits auto-managed fields (`date created`, `date modified`)
- Follows exact content type and category mappings
- Handles special people tagging conventions
- Processes Templater variables automatically
- Validates YAML syntax and provides error reporting

## Folder Structure Awareness

The server understands and respects the PARA method organization:
- **00 - Meta**: System files, templates, MOCs
- **05 - Fleeting Notes**: Quick captures
- **10 - Projects**: Active work
- **20 - Areas**: Life management
- **30 - Resources**: Reference materials
- **40 - Archives**: Completed items

## Template System

The server provides full integration with your existing LifeOS templates:

- **Template Discovery**: Automatically maps to your `/00 - Meta/Templates/` folder
- **Templater Compatibility**: Processes `tp.file.title`, `moment()`, and other Templater functions
- **Intelligent Routing**: Routes notes to appropriate PARA folders based on template
- **Custom Data Support**: Inject template-specific data (restaurant cuisine, article author, etc.)
- **Error Recovery**: Falls back gracefully if templates are unavailable

### Template Processing

The server converts Templater syntax to static content:
```yaml
# Template: <% tp.file.title %>
# Becomes: "Restaurant Name"

# Template: <% moment().format('YYYY-MM-DD') %>
# Becomes: "2025-05-24"
```

## License

MIT