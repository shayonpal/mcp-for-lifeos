# Setup and Integration Guides

This directory contains comprehensive guides for setting up, deploying, and integrating the LifeOS MCP Server with various clients and development environments.

## 📖 Available Guides

### 🚀 **[Deployment Guide](./DEPLOYMENT-GUIDE.md)**
Complete setup and deployment instructions for the LifeOS MCP Server.

**Contents:**
- System requirements and prerequisites
- Installation and configuration
- Environment setup
- Production deployment considerations
- Automated setup scripts usage

**Audience:** New users, system administrators, developers setting up local environments

---

### 📱 **[Raycast Integration](./RAYCAST-INTEGRATION.md)**
Setup guide for integrating LifeOS MCP Server with Raycast on macOS.

**Contents:**
- Raycast MCP configuration
- AI command setup with `@lifeos-mcp` mentions
- Quick vault search and note creation
- Troubleshooting common integration issues

**Audience:** macOS users who use Raycast for productivity

---

### 💻 **[Cursor Integration](./CURSOR-IDE-INTEGRATION.md)**
Setup guide for integrating LifeOS MCP Server with Cursor IDE.

**Contents:**
- Cursor IDE MCP configuration
- Agent Mode setup for vault access
- Workflow integration with development projects
- Research and knowledge management in coding contexts

**Audience:** Developers using Cursor IDE who want vault integration

## 🎯 Integration Overview

The LifeOS MCP Server supports multiple client integrations through the Model Context Protocol (MCP):

| Client | Primary Use Case | Setup Complexity | Platform |
|--------|------------------|------------------|----------|
| **Claude Desktop** | General AI assistance with vault access | Medium | macOS, Windows |
| **Raycast** | Quick vault operations and AI commands | Low | macOS |
| **Cursor IDE** | Development workflow with knowledge integration | Medium | Cross-platform |

## 🔧 Common Setup Requirements

All integrations require:

1. **LifeOS MCP Server** installed and configured
2. **Node.js 18+** with proper PATH configuration
3. **Absolute paths** in client configurations
4. **MCP protocol compliance** (stdio transport)

### Essential Configuration Elements

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-for-lifeos/dist/index.js"],
      "env": {
        "ENABLE_WEB_INTERFACE": "false"
      }
    }
  }
}
```

## 🚨 Important Notes

### Web Interface Compatibility
- **Never enable** `ENABLE_WEB_INTERFACE=true` when running as MCP server
- Web interface is for testing only and conflicts with MCP protocol
- Use pure stdio communication for all client integrations

### Path Requirements
- Always use **absolute paths** to the compiled `dist/index.js` file
- Relative paths will fail in client environments
- Ensure Node.js is accessible from client PATH

### Performance Considerations
- MCP server startup time: ~2-3 seconds for large vaults
- Tool execution time: <200ms for most operations
- Memory usage: ~50-100MB typical, ~200MB for large search operations

## 📋 Integration Checklist

Before setting up any client integration:

- [ ] LifeOS MCP Server built successfully (`npm run build`)
- [ ] Configuration file (`src/config.ts`) properly set up
- [ ] Vault paths accessible and permissions correct
- [ ] Node.js version 18+ installed and in PATH
- [ ] Test server startup: `node dist/index.js` runs without errors

## 🔍 Troubleshooting

### Common Issues Across All Clients

**Server Won't Start**
- Check Node.js version: `node --version` (requires 18+)
- Verify build completion: `npm run build`
- Check configuration: ensure `src/config.ts` exists and is valid

**Client Can't Connect**
- Use absolute paths in client configuration
- Restart client application after configuration changes
- Check for console output interfering with MCP protocol

**Tools Not Working**
- Verify vault path accessibility
- Check file permissions on vault directory
- Test individual tools with minimal parameters

### Client-Specific Issues

For detailed troubleshooting of specific clients, see:
- **Claude Desktop**: Check JSON configuration syntax and restart application
- **Raycast**: Ensure script permissions and PATH variables
- **Cursor**: Verify Agent Mode is enabled and MCP server is accessible

## 🆘 Getting Help

If you encounter issues not covered in the guides:

1. **Check Common Issues** in the main README.md
2. **Review Client Logs** for specific error messages
3. **Test MCP Server** independently: `node dist/index.js`
4. **Report Issues** via [GitHub Issues](https://github.com/shayonpal/mcp-for-lifeos/issues)

When reporting issues, include:
- Operating system and version
- Node.js version (`node --version`)
- Client application and version
- Complete error messages
- Configuration file contents (sanitized)

---

**Last Updated**: August 29, 2025  
**Supported Clients**: Claude Desktop, Raycast, Cursor IDE  
**MCP Protocol Version**: 1.0  