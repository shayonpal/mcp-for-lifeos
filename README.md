# LifeOS MCP Server

A Model Context Protocol (MCP) server for managing the LifeOS Obsidian vault. Provides AI assistants with structured access to create, read, and search notes while maintaining YAML compliance and organizational standards.

## Features

- **YAML-Compliant Note Creation**: Automatically follows LifeOS YAML rules
- **Custom YAML Rules Integration**: Reference your own YAML frontmatter guidelines
- **PARA Method Organization**: Respects Projects/Areas/Resources/Archives structure
- **Template System**: Integration with 11+ LifeOS templates (restaurant, article, person, etc.)
- **Search Engine**: Full-text search with relevance scoring and context extraction
- **Obsidian Integration**: Clickable links that open notes directly in Obsidian
- **Daily Notes Management**: Create and manage daily journal entries
- **Analytics Dashboard**: Zero-maintenance telemetry with visual insights (default enabled)
- **Universal Tools**: Consolidates 6 search tools into 1, with auto-routing
- **iCloud Sync Resilience**: Automatic retry logic for file operations on macOS
- **Backward Compatibility**: All legacy tools continue to work with deprecation warnings

## Quick Start

### Automated Setup (Recommended)

```bash
# Clone and run automated setup
git clone https://github.com/shayonpal/mcp-for-lifeos.git
cd mcp-for-lifeos
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The setup script will install dependencies, generate configuration, and build the application.

### Manual Installation

```bash
npm install
npm run build
```

**📖 For detailed deployment instructions, see [Deployment Guide](docs/guides/DEPLOYMENT-GUIDE.md)**

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

**📖 For complete configuration options, see [Configuration Guide](docs/guides/CONFIGURATION.md)**

## Available Tools

### Recommended: Consolidated Tools

**`search`** - Universal search with auto-routing for all search operations

- Supports modes: auto, advanced, quick, content_type, recent, pattern
- Natural language queries (e.g., "Quebec barbecue restaurants")
- Automatic token budget management

**`create_note_smart`** - Smart note creation with automatic template detection

- Auto-detects templates from title/content
- Handles YAML validation and folder placement

**`list`** - Universal listing for folders, daily notes, templates, YAML properties

- Auto-detection of list type
- Supports concise and detailed formats

### Core Operations

**Note Management:**

- `create_note` - Create notes with YAML frontmatter and templates
- `read_note` - Read existing notes
- `edit_note` - Edit notes with frontmatter merging
- `get_daily_note` - Get or create daily notes
- `move_items` - Move notes and folders
- `insert_content` - Insert content at specific locations

**Utilities:**

- `diagnose_vault` - Diagnose vault issues
- `get_server_version` - Get server version and capabilities
- `get_yaml_rules` - Retrieve custom YAML rules

**Search:**

- `advanced_search` - Full-text search with metadata filters
- `list_yaml_properties` - Discover YAML properties
- `list_yaml_property_values` - Analyze property values

**📖 For complete tools documentation, see [Tools API Reference](docs/api/TOOLS.md)**

## Client Integration

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-for-lifeos/dist/src/index.js"],
      "env": {
        "ENABLE_WEB_INTERFACE": "false"
      }
    }
  }
}
```

### Raycast

Use `@lifeos-mcp` to mention the server in AI chats and commands for quick vault search and note creation.

### Cursor IDE

Access vault context directly in Agent Mode to research existing knowledge while coding.

**📖 For complete integration guides, see [Integrations Guide](docs/guides/INTEGRATIONS.md)**

## Template System

The server includes intelligent template integration with 11+ templates:

- **restaurant**, **article**, **person**, **daily**, **reference**
- **medicine**, **application**, **book**, **place**, **fleeting**, **moc**

Templates automatically process Templater syntax and place notes in correct PARA folders.

```bash
# Auto-detect template from title
create_note_smart title: "Pizza Palace"  # → restaurant template

# Explicit template
create_note_smart title: "My Article" template: "article"
```

**📖 For template system details, see [Templates Guide](docs/guides/TEMPLATES.md)**

## Analytics Dashboard

The server includes a lightweight analytics system for tracking tool usage patterns and performance insights.

**Quick Start:**

```bash
# Start the analytics dashboard (default port 19832)
node scripts/start-analytics-dashboard.js
# Visit http://localhost:19832
```

**Features:** Tool usage tracking, performance insights, cache hit rates, visual charts, and daily trends.

**📊 For complete analytics documentation, see [analytics/README.md](analytics/README.md)**

## Documentation

### Guides

- **[📖 Deployment Guide](docs/guides/DEPLOYMENT-GUIDE.md)** - Complete setup and deployment instructions
- **[⚙️ Configuration Guide](docs/guides/CONFIGURATION.md)** - Detailed configuration options
- **[🔧 Templates Guide](docs/guides/TEMPLATES.md)** - Template system and customization
- **[🔌 Integrations Guide](docs/guides/INTEGRATIONS.md)** - Client integration (Claude Desktop, Raycast, Cursor)
- **[🐛 Troubleshooting Guide](docs/guides/TROUBLESHOOTING.md)** - Common issues and solutions
- **[📱 Raycast Integration](docs/guides/RAYCAST-INTEGRATION.md)** - Raycast-specific setup
- **[💻 Cursor Integration](docs/guides/CURSOR-IDE-INTEGRATION.md)** - Cursor IDE-specific setup

### API Reference

- **[🔧 Tools API Reference](docs/api/TOOLS.md)** - Complete tool documentation with parameters and examples

### Analytics

- **[📊 Analytics Dashboard](analytics/README.md)** - Analytics configuration and insights

## Development

```bash
# Development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run typecheck
```

### Testing

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

## Versioning

The server follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

All API responses include version metadata for compatibility checking.

## YAML Compliance

The server automatically enforces LifeOS YAML rules:

- Uses `source` field for URLs (not `url` or `URL`)
- Maintains location format: `Country [CODE]` (e.g., `Canada [CA]`)
- Never edits auto-managed fields (`date created`, `date modified`)
- Validates YAML syntax and provides error reporting
- Supports flexible tag formats: string, array, or YAML list

## File Naming Convention

Notes use natural file naming that preserves readability:

- **Preserves**: Spaces, punctuation, numbers, parentheses
- **Removes**: Square brackets `[]`, colons `:`, semicolons `;`
- **Example**: "Book Review - The 48 Laws of Power" → "Book Review - The 48 Laws of Power.md"

## Folder Structure (PARA Method)

- **00 - Meta**: System files, templates, MOCs
- **05 - Fleeting Notes**: Quick captures
- **10 - Projects**: Active work
- **20 - Areas**: Life management
- **30 - Resources**: Reference materials
- **40 - Archives**: Completed items

## Support and Contributing

- **🐛 Issues**: Report bugs and request features via [GitHub Issues](https://github.com/shayonpal/mcp-for-lifeos/issues)
- **💬 Discussions**: Join community discussions in the repository
- **📖 Documentation**: Check [docs/](docs/) for guides and references

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE.md](LICENSE.md) for details.

**Copyright (C) 2025 Shayon Pal**  
**AgileCode Studio** - [https://agilecode.studio](https://agilecode.studio)
