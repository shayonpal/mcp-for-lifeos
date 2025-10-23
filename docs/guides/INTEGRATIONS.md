# Client Integration Guide

Complete guide for integrating the LifeOS MCP server with various AI clients and development tools.

## Table of Contents

1. [Claude Desktop](#claude-desktop)
2. [Raycast](#raycast)
3. [Cursor IDE](#cursor-ide)
4. [Obsidian Link Integration](#obsidian-link-integration)

---

## Claude Desktop

Add the LifeOS MCP server to your Claude Desktop configuration for AI-powered vault management.

### Configuration

Add to your Claude Desktop configuration file (`claude_desktop_config.json`):

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

**Important Notes:**

- Use **absolute paths**, not relative paths
- Set `ENABLE_WEB_INTERFACE: "false"` for pure MCP usage
- Restart Claude Desktop after configuration changes

### Configuration File Location

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Features in Claude Desktop

- **Full tool access**: All 20+ MCP tools available
- **Natural language**: Ask questions about your vault
- **Note creation**: Create notes with templates via conversation
- **Search**: Find notes by content, metadata, or natural language
- **Daily notes**: Quick access to daily journal entries
- **Clickable links**: Open notes directly in Obsidian

### Usage Examples

```
User: "Show me my recent daily notes"
Claude: [Uses search tool with recent filter]

User: "Create a restaurant note for Thai Basil"
Claude: [Uses create_note_smart with auto-detection]

User: "Find all articles about AI from this year"
Claude: [Uses advanced_search with filters]
```

---

## Raycast

The LifeOS MCP server integrates with Raycast for AI-powered vault interactions through AI commands.

### Setup

1. **Install Raycast** (if not already installed)
2. **Configure MCP server** following the Claude Desktop instructions above
3. **Access via AI chat**: Use `@lifeos-mcp` to mention the server
4. **Quick commands**: Create Raycast AI commands for frequent operations

### Key Features

- **@lifeos-mcp mentions**: Reference the server in AI chats and commands
- **Quick vault search**: Search from Raycast's root search
- **Note creation**: Create notes and daily entries through AI commands
- **Clickable links**: Obsidian links work in Raycast results
- **Workflow integration**: Chain with other Raycast automation

### Raycast AI Command Examples

Create custom AI commands in Raycast:

**Daily Note Command:**

```
Open today's daily note in Obsidian

Use @lifeos-mcp to get today's daily note
```

**Quick Search:**

```
Search my vault for {query}

Use @lifeos-mcp to search for notes about {query}
```

**Restaurant Note:**

```
Create a restaurant note for {name}

Use @lifeos-mcp to create a restaurant note with:
- Title: {name}
- Auto-detect template
```

### Raycast Advantages

- **Speed**: Fastest way to access vault from anywhere
- **Context**: Keep working while searching notes
- **Hotkeys**: Global keyboard shortcuts
- **Clipboard**: Easy copying of search results

For detailed Raycast setup, see [Raycast Integration Guide](Raycast-Integration.md).

---

## Cursor IDE

Enhance your development workflow with AI-powered access to your knowledge vault directly in Cursor.

### Setup

1. **Configure MCP server** for Cursor (similar to Claude Desktop)
2. **Access in Agent Mode**: MCP tools available in Cursor's AI agent
3. **Context integration**: Reference vault knowledge while coding

### Key Features

- **Agent Mode access**: Use vault tools during coding sessions
- **Research while coding**: Look up existing knowledge without leaving IDE
- **Development notes**: Create and link notes to code projects
- **Learning integration**: Access tutorials and documentation from vault
- **Project planning**: Reference project notes and planning documents

### Use Cases

**Technical Research:**

```
Agent: "What did I document about React hooks?"
[Searches vault for React hooks documentation]
```

**Code Documentation:**

```
Agent: "Create a note documenting this API endpoint"
[Creates note with code context and details]
```

**Learning Notes:**

```
Agent: "Show me my TypeScript learning notes"
[Retrieves TypeScript knowledge base]
```

### Workflow Benefits

- **Context switching**: No need to leave IDE
- **Knowledge reuse**: Access past solutions and learnings
- **Documentation**: Keep development notes organized
- **Planning**: Link code to project planning notes

For complete Cursor setup, see [Cursor IDE Integration Guide](Cursor-IDE-Integration.md).

---

## Obsidian Link Integration

All search results and note references include clickable links that open notes directly in Obsidian using the `obsidian://` URL scheme.

### Link Format

**Search Results:**

- Each result includes a "🔗 Open in Obsidian" link
- Click to jump directly to the note in Obsidian

**Note Reading:**

- Direct links to open specific notes
- Works from any AI client

**Daily Notes:**

- Quick access to daily journal entries
- Opens today's note with one click

### URL Scheme Examples

```
# Open a specific note
obsidian://open?vault=YourVaultName&file=path/to/note.md

# Search in Obsidian
obsidian://search?vault=YourVaultName&query=search+terms

# Create new note
obsidian://new?vault=YourVaultName&name=Note+Title
```

### Configuration

The MCP server automatically generates Obsidian links based on:

- Vault name from configuration
- Note file paths
- Search queries

No additional configuration needed - links work automatically once the vault is configured.

### Cross-Platform Support

Obsidian links work across:

- **macOS**: Native URL scheme support
- **Windows**: Obsidian protocol handler
- **Linux**: Desktop file associations
- **Mobile**: iOS and Android app integration

### Usage Tips

1. **Bookmark frequently accessed notes**: Save Obsidian links
2. **Share with team**: Send direct note links
3. **Automation**: Use links in scripts and workflows
4. **Quick access**: Click links from any AI conversation

---

## Environment Variables

All clients support environment variable configuration:

### Required Variables

None - server works with default configuration.

### Optional Variables

```bash
# Disable web interface (recommended for MCP clients)
ENABLE_WEB_INTERFACE=false

# Disable analytics tracking
DISABLE_USAGE_ANALYTICS=true

# Custom analytics port
ANALYTICS_DASHBOARD_PORT=19832

# Vault path override (useful for testing)
LIFEOS_VAULT_PATH=/path/to/vault
```

Set these in your client configuration or shell environment.

---

## Troubleshooting

### Server Won't Start

1. **Check Node.js version**: Requires Node.js 18+
2. **Verify paths**: Use absolute paths in configuration
3. **Check permissions**: Ensure read/write access to vault
4. **Review logs**: Check Claude Desktop or client logs

### Claude Desktop Can't Connect

1. **Restart Claude**: Close and reopen Claude Desktop
2. **Verify config**: Check JSON syntax in config file
3. **Test path**: Run `node /path/to/dist/src/index.js` manually
4. **Check build**: Ensure `npm run build` completed successfully

### Tools Not Appearing

1. **Wait for initialization**: Server may take a few seconds
2. **Check conversation**: Start a new chat in Claude
3. **Verify installation**: Ensure all dependencies installed
4. **Review server version**: Use `get_server_version` tool

### Links Not Working

1. **Verify Obsidian installed**: App must be on the system
2. **Check vault name**: Must match Obsidian vault name exactly
3. **Test manually**: Try opening `obsidian://` link in browser
4. **Review URL encoding**: Ensure spaces and special chars encoded

---

For more information:

- [Deployment Guide](Deployment-Guide.md) - Complete setup instructions
- [Configuration Guide](CONFIGURATION.md) - Detailed configuration options
- [Tools API Reference](../api/TOOLS.md) - Complete tool documentation
