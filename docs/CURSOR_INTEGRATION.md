# Cursor IDE Integration Guide

This guide shows you how to integrate the LifeOS MCP server with Cursor IDE to supercharge your coding experience with AI-powered access to your Obsidian vault.

## Prerequisites

- Cursor IDE (latest version required for MCP support)
- LifeOS MCP server built and functional
- Your LifeOS configuration properly set up
- Node.js installed and accessible

## Configuration Options

Cursor supports two configuration scopes for MCP servers:

### Project-Specific Configuration (Recommended)
For LifeOS integration specific to your current project:
- Location: `.cursor/mcp.json` in your project root
- Use case: When working on projects that need vault context

### Global Configuration
For LifeOS integration across all Cursor projects:
- Location: `~/.cursor/mcp.json` in your home directory  
- Use case: When you want vault access in all coding sessions

## Setup Instructions

### 1. Create Configuration Directory

Choose your configuration scope and create the necessary directory:

```bash
# For project-specific (recommended for most use cases)
mkdir -p .cursor

# For global access
# Directory ~/.cursor should already exist
```

### 2. Create MCP Configuration File

Create the appropriate `mcp.json` file:

**Project-specific (`.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "lifeos-mcp": {
      "command": "node",
      "args": ["/Users/shayon/DevProjects/mcp-for-lifeos/dist/index.js"],
      "env": {}
    }
  }
}
```

**Global (`~/.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "lifeos-mcp": {
      "command": "node", 
      "args": ["/Users/shayon/DevProjects/mcp-for-lifeos/dist/index.js"],
      "env": {}
    }
  }
}
```

### 3. Update Paths

Replace the path in the configuration with your actual project location:

```bash
# Find your actual path
pwd  # If you're in the mcp-for-lifeos directory

# Example paths:
# macOS: /Users/yourusername/DevProjects/mcp-for-lifeos/dist/index.js
# Linux: /home/yourusername/projects/mcp-for-lifeos/dist/index.js
# Windows: C:/Users/yourusername/projects/mcp-for-lifeos/dist/index.js
```

### 4. Alternative: Using NPX

If you want to use the published package or avoid absolute paths:

```json
{
  "mcpServers": {
    "lifeos-mcp": {
      "command": "npx",
      "args": ["-y", "lifeos-mcp"],
      "env": {}
    }
  }
}
```

## Advanced Configuration

### Environment Variables

Pass configuration through environment variables:

```json
{
  "mcpServers": {
    "lifeos-mcp": {
      "command": "node",
      "args": ["/path/to/mcp-for-lifeos/dist/index.js"],
      "env": {
        "LIFEOS_VAULT_PATH": "/custom/vault/path",
        "LIFEOS_TEMPLATES_PATH": "/custom/templates/path",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Multiple Configurations

You can run multiple MCP servers simultaneously:

```json
{
  "mcpServers": {
    "lifeos-mcp": {
      "command": "node",
      "args": ["/path/to/mcp-for-lifeos/dist/index.js"],
      "env": {}
    },
    "other-mcp": {
      "command": "npx",
      "args": ["-y", "other-mcp-server"],
      "env": {}
    }
  }
}
```

## Verification

### 1. Check Cursor Settings

1. Open Cursor
2. Go to **Settings** → **MCP**
3. You should see "lifeos-mcp" listed with a green "active" status

### 2. Test Agent Mode

1. Switch to **Agent Mode** (not Ask Mode) in Cursor
2. The MCP integration only works in Agent Mode
3. Look for the agent toggle in the chat interface

### 3. Verify Tools Are Available

In Agent Mode, you should see access to 13 LifeOS tools:
- `create_note`
- `create_note_from_template`
- `read_note`
- `search_notes`
- `get_daily_note`
- `list_folders`
- `find_notes_by_pattern`
- `advanced_search`
- `quick_search`
- `search_by_content_type`
- `search_recent`
- `diagnose_vault`
- `list_templates`

## Usage in Cursor

### 1. Code Documentation

```
Help me document this function by finding related notes in my vault about [topic]
```

### 2. Research Integration

```
Search my vault for notes about "React patterns" and help me implement this component
```

### 3. Daily Development Notes

```
Create a daily note for today and add notes about the feature I'm working on
```

### 4. Knowledge Retrieval

```
Find articles I've saved about "database optimization" to help with this query
```

### 5. Project Planning

```
Search for project templates in my vault and help me plan this new feature
```

## Example Workflows

### Starting a New Feature

1. **Research existing knowledge:**
   ```
   Search my vault for notes related to authentication and JWT tokens
   ```

2. **Create development notes:**
   ```
   Create a new note called "OAuth Implementation Plan" using the article template
   ```

3. **Link to daily progress:**
   ```
   Add today's progress to my daily note
   ```

### Code Review Preparation

1. **Find related documentation:**
   ```
   Search for any notes about the patterns used in this codebase
   ```

2. **Create review notes:**
   ```
   Create a note to track code review feedback using the reference template
   ```

### Learning Integration

1. **Save learning resources:**
   ```
   Create an article note for this tutorial I'm following
   ```

2. **Track progress:**
   ```
   Update my learning MOC with this new topic
   ```

## Troubleshooting

### Server Not Connecting

**Check configuration:**
- Verify JSON syntax (no trailing commas)
- Ensure absolute paths are correct
- Test server manually: `node /path/to/dist/index.js`

**Restart Cursor:**
- Close and reopen Cursor after configuration changes
- Check Settings → MCP for server status

### Tools Not Available

**Verify Agent Mode:**
- Must be in Agent Mode, not Ask Mode
- Look for agent selection dropdown

**Check tool limit:**
- Cursor only loads first 40 tools
- Our server has 13 tools, so this shouldn't be an issue

### Permission Issues

**File permissions:**
```bash
chmod +x dist/index.js
```

**Path access:**
```bash
# Test if Cursor can access the path
ls -la /path/to/mcp-for-lifeos/dist/index.js
```

### Vault Access Issues

**Configuration problems:**
- Check `src/config.ts` has correct vault path
- Verify Obsidian vault is accessible
- Ensure no file permission issues

**Test manually:**
```bash
node dist/index.js
# Should start without errors
```

## Limitations

### Current Cursor MCP Limitations

1. **Tool Limit:** Only first 40 tools are sent to Agent
2. **SSH Issues:** May not work properly over SSH connections  
3. **Resources:** MCP resources not yet supported in Cursor
4. **Agent Mode Only:** MCP integration only works in Agent Mode

### Workarounds

1. **For SSH issues:** Use local development or SSE transport
2. **For large tool sets:** Prioritize most important tools first
3. **For resources:** Use tools to read/search content instead

## Best Practices

### 1. Use Project-Specific Configuration

Unless you need vault access in every project, use `.cursor/mcp.json` for better organization.

### 2. Environment-Specific Configs

```json
{
  "mcpServers": {
    "lifeos-dev": {
      "command": "node",
      "args": ["/path/to/dev/mcp-for-lifeos/dist/index.js"],
      "env": {"NODE_ENV": "development"}
    }
  }
}
```

### 3. Version Control

Add to `.gitignore` if using project-specific config with sensitive paths:
```
.cursor/mcp.json
```

Or use environment variables and commit a template:
```json
{
  "mcpServers": {
    "lifeos-mcp": {
      "command": "node",
      "args": ["${LIFEOS_MCP_PATH}"],
      "env": {}
    }
  }
}
```

### 4. Combine with Other Tools

Cursor supports multiple MCP servers - combine LifeOS with other productivity tools:
- Database MCP servers for data access
- GitHub MCP for repository management  
- Browser automation for research

## Tips for Maximum Productivity

1. **Context-Aware Coding:** Use vault search to find related patterns and examples from your notes

2. **Documentation as You Code:** Create notes about complex implementations for future reference

3. **Learning Integration:** Save and reference learning materials directly in your development workflow

4. **Project Knowledge:** Link code decisions to architectural notes and requirements

5. **Daily Tracking:** Use daily notes to track development progress and blockers