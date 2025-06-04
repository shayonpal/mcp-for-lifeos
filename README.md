# LifeOS MCP Server

A Model Context Protocol (MCP) server for managing the LifeOS Obsidian vault. This server provides AI assistants with structured access to create, read, and search notes while maintaining strict YAML compliance and organizational standards.

## Features

- **YAML-Compliant Note Creation**: Automatically follows LifeOS YAML rules
- **Custom YAML Rules Integration**: Reference your own YAML frontmatter guidelines for consistent note creation
- **PARA Method Organization**: Respects Projects/Areas/Resources/Archives structure
- **Intelligent Template System**: Full integration with 11+ LifeOS templates (restaurant, article, person, etc.)
- **Advanced Search Engine**: Full-text search with relevance scoring and context extraction
- **Obsidian Integration**: Clickable links that open notes directly in Obsidian
- **Daily Notes Management**: Create and manage daily journal entries
- **Robust Error Handling**: Graceful YAML parsing with diagnostic tools
- **Strict Validation**: Prevents editing auto-managed fields and enforces formatting rules

## Quick Start

### Automated Setup (Recommended)
```bash
# Clone and run automated setup
git clone https://github.com/shayonpal/mcp-for-lifeos.git
cd mcp-for-lifeos
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Manual Installation
```bash
npm install
npm run build
```

📖 **For detailed deployment instructions, see [DEPLOYMENT.md](docs/DEPLOYMENT.md)**

## Configuration

1. Copy `src/config.example.ts` to `src/config.ts`
2. Update the vault paths to match your Obsidian vault location
3. Customize the PEOPLE_MAPPINGS for your specific contacts
4. **Optional**: Set `yamlRulesPath` to reference your YAML frontmatter guidelines

```typescript
export const LIFEOS_CONFIG: LifeOSConfig = {
  vaultPath: '/path/to/your/obsidian/vault',
  templatesPath: '/path/to/your/obsidian/vault/Templates',
  yamlRulesPath: '/path/to/your/vault/YAML Rules.md', // Optional
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

#### `edit_note`
Edit an existing note in the vault
- **path**: Path to the note file (absolute or relative to vault)
- **title**: Note title (alternative to path - will search for the note)
- **content**: New content (optional - preserves existing if not provided)
- **frontmatter**: Frontmatter fields to update (merged with existing)
  - `contentType`: Content type
  - `category`: Category
  - `subCategory`: Sub-category
  - `tags`: Tags array
  - `source`: Source URL
  - `people`: People mentioned
- **mode**: Update mode - 'merge' (default) or 'replace' frontmatter

Example usage:
```bash
# Edit by path
edit_note path: "Articles/My Article.md" content: "Updated content"

# Edit by title
edit_note title: "My Article" frontmatter: {tags: ["updated", "important"]}

# Replace entire frontmatter (preserves date created)
edit_note title: "My Article" mode: "replace" frontmatter: {contentType: "Article", tags: ["new"]}
```

#### `get_daily_note`
Get or create a daily note
- **date**: Date in YYYY-MM-DD format (optional, defaults to today)

#### `move_items`
Move notes and/or folders to a different location in the vault
- **item**: Single item path to move (alternative to items)
- **items**: Array of items to move, each with:
  - `path`: Path to note or folder
  - `type`: Item type - 'note' or 'folder' (auto-detected if not specified)
- **destination** (required): Target folder path (relative to vault root)
- **createDestination**: Create destination folder if it doesn't exist (default: false)
- **overwrite**: Overwrite existing files in destination (default: false)
- **mergeFolders**: When moving folders, merge with existing folder of same name (default: false)

Example usage:
```bash
# Move a single note
move_items item: "10 - Projects/old-note.md" destination: "40 - Archives/2024"

# Move multiple items
move_items items: [{path: "10 - Projects/Completed"}, {path: "planning-doc.md"}] destination: "40 - Archives/2024" createDestination: true

# Merge folders
move_items item: "20 - Areas/Old Resources" destination: "30 - Resources" mergeFolders: true
```

#### `insert_content`
Insert content at specific locations within a note based on headings, block references, or text patterns
- **path**: Path to the note file (absolute or relative to vault)
- **title**: Note title (alternative to path - will search for the note)
- **content** (required): Content to insert
- **target** (required): Target location for insertion
  - `heading`: Heading text to target (e.g., "## Today's Tasks")
  - `blockRef`: Block reference ID to target (e.g., "^block-id")
  - `pattern`: Text pattern to search for
  - `lineNumber`: Specific line number (1-based)
- **position**: Where to insert content relative to target - 'before', 'after', 'append', 'prepend', 'end-of-section' (default: after)
- **ensureNewline**: Ensure proper line breaks around inserted content (default: true)

Example usage:
```bash
# Insert after a heading
insert_content title: "Daily Note" content: "- New task" target: {heading: "## Today's Tasks"} position: "after"

# Insert before a block reference
insert_content path: "project-notes.md" content: "Update: Project approved!" target: {blockRef: "^project-status"} position: "before"

# Append to a line containing a pattern
insert_content title: "Meeting Notes" content: " - Bob" target: {pattern: "Attendees:"} position: "append"

# Insert at specific line number
insert_content path: "todo.md" content: "- [ ] New item" target: {lineNumber: 5} position: "after"

# Insert at end of a section (for heading targets)
insert_content title: "Project Notes" content: "- Final task" target: {heading: "## Action Items"} position: "end-of-section"
```

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

#### `get_yaml_rules`
Retrieve your custom YAML frontmatter rules document for reference when creating or editing notes
- No parameters required
- Returns the content of your configured YAML rules document
- Requires `yamlRulesPath` to be set in configuration

#### `advanced_search`
Comprehensive search with full-text search, metadata filters, and relevance scoring
- **query**: General search query (searches title, content, and frontmatter)
- **contentQuery**: Search only in note content
- **titleQuery**: Search in note titles, filenames (without .md extension), and aliases
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

### YAML Property Management

#### `list_yaml_properties`
Discover and analyze YAML frontmatter properties across your entire vault
- **includeCount**: Include usage count for each property (default: false)
- **sortBy**: Sort by 'alphabetical' or 'usage' (default: alphabetical)
- **excludeStandard**: Exclude standard LifeOS properties to focus on custom fields (default: false)

Example usage:
```bash
# List all YAML properties with usage counts
list_yaml_properties includeCount: true sortBy: "usage"

# List only custom properties (excludes standard ones like title, contentType, etc.)
list_yaml_properties excludeStandard: true
```

#### `list_yaml_property_values`
Analyze all unique values used for a specific YAML property across the vault
- **property** (required): The YAML property name to analyze

Features:
- Distinguishes between single values and array values
- Identifies mixed usage patterns (property used both ways)
- Accurate deduplication with detailed usage statistics
- Graceful handling of malformed YAML and missing properties

Example usage:
```bash
# Analyze all values used for the "tags" property
list_yaml_property_values property: "tags"

# Analyze values for "content type" property
list_yaml_property_values property: "content type"

# Check usage patterns for custom properties
list_yaml_property_values property: "project"
```

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
      "args": ["/path/to/your/mcp-for-lifeos/dist/index.js"],
      "env": {
        "ENABLE_WEB_INTERFACE": "false"
      }
    }
  }
}
```

**Note**: The `ENABLE_WEB_INTERFACE: "false"` setting disables the HTTP server for pure MCP usage, ensuring clean JSON communication with Claude Desktop.

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

## Web Interface (Experimental)

The LifeOS MCP server includes an experimental web interface for testing and development purposes. This interface is **disabled by default** to ensure proper MCP protocol compatibility.

### Enabling the Web Interface

To enable the web interface for testing:

```bash
# Set environment variable before starting
ENABLE_WEB_INTERFACE=true node dist/index.js

# Or with custom port
ENABLE_WEB_INTERFACE=true WEB_PORT=8080 node dist/index.js
```

### Web Interface Features

- **API Explorer**: Test MCP tools via REST API
- **Model Selection**: Choose between different AI models
- **Chat Interface**: Interactive chat with vault integration
- **MCP Tool Execution**: Direct access to all MCP tools

### Important Notes

- **Do NOT enable the web interface when running as an MCP server** (e.g., with Claude Desktop)
- The web interface uses port 19831 by default
- Ensure the port is not already in use before enabling
- This feature is experimental and primarily for development/testing

## Documentation

- **[📖 Deployment Guide](docs/DEPLOYMENT.md)** - Complete setup and deployment instructions
- **[🔧 Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[📱 Raycast Integration](docs/RAYCAST_INTEGRATION.md)** - Setup guide for Raycast
- **[💻 Cursor Integration](docs/CURSOR_INTEGRATION.md)** - Setup guide for Cursor IDE

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

### Quick Setup for Development
```bash
# Use automated setup script
./scripts/setup.sh --skip-deps  # Skip npm install if already done
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
- Safely handles templates with Templater syntax that would cause YAML parsing errors
- Supports flexible tag formats: string (`tags: mytag`), array (`tags: [tag1, tag2]`), or YAML list

## File Naming Convention

Notes created through the MCP server use a natural file naming convention:
- **Preserves spaces**: "My Note Title" creates "My Note Title.md" (not "My-Note-Title.md")
- **Allows special characters**: Most punctuation and symbols are preserved
- **Obsidian restrictions**: Only removes square brackets `[]`, colons `:`, and semicolons `;`
- **Examples**:
  - "Book Review - The 48 Laws of Power" → "Book Review - The 48 Laws of Power.md"
  - "Meeting Notes (Q1 2024)" → "Meeting Notes (Q1 2024).md"
  - "What's Next? Planning for 2025!" → "What's Next? Planning for 2025!.md"
  - "Project [Alpha]: Status Update" → "Project Alpha Status Update.md"

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
- **Robust YAML Parsing**: Safely handles templates with complex Templater syntax in frontmatter
- **Intelligent Routing**: Routes notes to appropriate PARA folders based on template
- **Custom Data Support**: Inject template-specific data (restaurant cuisine, article author, etc.)
- **Error Recovery**: Falls back gracefully if templates are unavailable or contain parsing errors

### Template Processing

The server converts Templater syntax to static content:
```yaml
# Template: <% tp.file.title %>
# Becomes: "Restaurant Name"

# Template: <% moment().format('YYYY-MM-DD') %>
# Becomes: "2025-05-24"
```

## Support and Contributing

- **🐛 Issues**: Report bugs and request features via [GitHub Issues](https://github.com/shayonpal/mcp-for-lifeos/issues)
- **💬 Discussions**: Join community discussions in the repository
- **📖 Documentation**: Check [docs/](docs/) for comprehensive guides
- **🔧 Troubleshooting**: See [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for common issues

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE.md](LICENSE.md) for details.

**Copyright (C) 2025 Shayon Pal**  
**AgileCode Studio** - [https://agilecode.studio](https://agilecode.studio)