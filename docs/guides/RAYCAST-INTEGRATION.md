# Raycast Integration Guide

This guide shows you how to integrate the LifeOS MCP server with Raycast for seamless AI-powered interactions with your Obsidian vault.

## Prerequisites

- Raycast installed with AI features enabled
- LifeOS MCP server built and accessible via PATH
- Your LifeOS configuration properly set up

## Installation Methods

### Method 1: Using Raycast Install Server Command

1. **Open Raycast** and search for "Install Server"
2. **Configure the server** with these settings:

   ```json
   {
     "name": "lifeos-mcp",
     "type": "stdio",
     "command": "node",
     "args": ["/path/to/your/mcp-for-lifeos/dist/index.js"],
     "env": {}
   }
   ```

3. **Replace the path** with your actual project path
4. **Save the configuration**

### Method 2: Deep Link Installation

Create a deep link with the configuration:

```bash
# First, create the configuration JSON
cat > raycast-config.json << 'EOF'
{
  "name": "lifeos-mcp",
  "type": "stdio", 
  "command": "node",
  "args": ["/Users/yourusername/DevProjects/mcp-for-lifeos/dist/index.js"],
  "env": {}
}
EOF

# Encode and create deep link (replace with your actual path)
# raycast://mcp/install?%7B%22name%22%3A%22lifeos-mcp%22%2C%22type%22%3A%22stdio%22%2C%22command%22%3A%22node%22%2C%22args%22%3A%5B%22/Users/yourusername/DevProjects/mcp-for-lifeos/dist/index.js%22%5D%2C%22env%22%3A%7B%7D%7D
```

## Configuration

### 1. Update Your Project Path

Make sure to replace `/path/to/your/mcp-for-lifeos/dist/index.js` with your actual project path:

```bash
# Example paths:
/Users/yourusername/DevProjects/mcp-for-lifeos/dist/index.js
/home/yourusername/projects/mcp-for-lifeos/dist/index.js
```

### 2. Ensure Node.js is in PATH

Raycast needs to find Node.js in your system PATH. Test this:

```bash
# This should work in your terminal
node /path/to/your/mcp-for-lifeos/dist/index.js
```

If Node.js isn't in PATH, you can:

- Add Node.js to your PATH in `~/.zshrc` or `~/.bashrc`
- Use the full path to Node.js in the configuration
- Restart Raycast after PATH changes

### 3. Alternative: Global Installation

For easier PATH management, you can install the MCP server globally:

```bash
# In your project directory
npm pack
npm install -g lifeos-mcp-1.0.0.tgz

# Then use this simpler configuration:
{
  "name": "lifeos-mcp",
  "type": "stdio",
  "command": "lifeos-mcp",
  "args": [],
  "env": {}
}
```

## Usage in Raycast

Once installed, you can use the LifeOS MCP server in several ways:

### 1. Root Search

- Open Raycast (⌘ + Space)
- Type `@lifeos-mcp` to mention the server
- Ask questions about your vault

### 2. AI Commands

- Create custom AI commands that utilize your vault
- Use `@lifeos-mcp` in command prompts

### 3. AI Chat

- Start an AI chat
- Use `@lifeos-mcp` to bring in vault context
- Ask questions like:
  - "Show me my recent daily notes"
  - "Find articles about productivity"
  - "Create a new restaurant note for..."

### 4. Presets

- Create presets that automatically include `@lifeos-mcp`
- Set up workflows for common vault operations

## Example Interactions

### Search Your Vault

```
@lifeos-mcp search for notes about "machine learning"
```

### Create Notes

```
@lifeos-mcp create a new restaurant note for "Sakura Sushi" with cuisine Japanese and location downtown
```

### Daily Notes

```
@lifeos-mcp get today's daily note
```

### Templates

```
@lifeos-mcp show me all available templates
```

## Troubleshooting

### Server Not Found

- Verify Node.js is in PATH: `which node`
- Check the server path is correct
- Try running the server manually first
- Restart Raycast after PATH changes

### Permission Issues

- Ensure the script is executable: `chmod +x dist/index.js`
- Check file permissions

### Configuration Errors

- Validate JSON syntax in configuration
- Use absolute paths, not relative paths
- Ensure no trailing commas in JSON

### Vault Access Issues

- Verify your `src/config.ts` has correct vault path
- Check that Obsidian vault is accessible
- Ensure no file permission issues

## Advanced Configuration

### Environment Variables

You can pass environment variables for configuration:

```json
{
  "name": "lifeos-mcp",
  "type": "stdio",
  "command": "node",
  "args": ["/path/to/your/mcp-for-lifeos/dist/index.js"],
  "env": {
    "LIFEOS_VAULT_PATH": "/custom/vault/path",
    "NODE_ENV": "production"
  }
}
```

### Custom Startup Script

Create a wrapper script for more complex setups:

```bash
#!/bin/bash
# ~/bin/lifeos-mcp
cd /path/to/your/mcp-for-lifeos
exec node dist/index.js "$@"
```

Then use:

```json
{
  "name": "lifeos-mcp",
  "type": "stdio", 
  "command": "/Users/yourusername/bin/lifeos-mcp",
  "args": [],
  "env": {}
}
```

## Management

### Uninstall Server

1. Open Raycast
2. Search for "Manage Servers"
3. Find "lifeos-mcp" and uninstall

### Update Server

1. Rebuild your project: `npm run build`
2. Server will automatically use updated code
3. No need to reinstall unless configuration changes

### Start New Chat

Use "Manage Servers" command to start fresh conversations with the server.

## Tips for Best Experience

1. **Use specific queries**: Instead of "search notes", try "search for notes about productivity in the last 30 days"

2. **Leverage templates**: Ask for template lists and use them to create consistent notes

3. **Combine with Raycast features**: Use snippets, quicklinks, and other Raycast features alongside the MCP server

4. **Create workflows**: Set up AI commands that perform common vault operations

5. **Use Obsidian links**: The server returns clickable obsidian:// links that open directly in your vault
