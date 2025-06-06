# LifeOS MCP Server - Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the LifeOS MCP server deployment and operation.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Configuration Problems](#configuration-problems)
3. [MCP Protocol Issues](#mcp-protocol-issues)
4. [Vault Access Problems](#vault-access-problems)
5. [Client Integration Issues](#client-integration-issues)
6. [Performance Issues](#performance-issues)
7. [Template System Problems](#template-system-problems)
8. [Network and Connectivity](#network-and-connectivity)
9. [Logging and Debugging](#logging-and-debugging)
10. [Getting Help](#getting-help)

## Installation Issues

### Node.js Version Compatibility

**Problem:** Server fails to start with Node.js version errors
```
Error: The engine "node" is incompatible with this module
```

**Solution:**
```bash
# Check Node.js version
node --version

# Required: Node.js 18.0.0 or higher
# Update Node.js using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or download from nodejs.org
```

### npm Installation Failures

**Problem:** Dependencies fail to install
```
npm ERR! peer dep missing
npm ERR! network timeout
```

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use different registry if network issues
npm install --registry https://registry.npmjs.org/

# For corporate networks, configure proxy
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080
```

### TypeScript Compilation Errors

**Problem:** Build fails with TypeScript errors
```
error TS2307: Cannot find module
error TS2345: Argument of type 'string' is not assignable
```

**Solutions:**
```bash
# Install TypeScript globally
npm install -g typescript

# Check TypeScript version compatibility
npx tsc --version

# Clean build and retry
rm -rf dist/
npm run build

# Run type checking separately
npm run typecheck
```

### Permission Errors

**Problem:** Permission denied during installation or execution
```
EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

**Solutions:**
```bash
# Fix npm permissions (recommended method)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Or use nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install node

# As last resort, fix ownership (macOS/Linux)
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

## Configuration Problems

### Invalid Vault Paths

**Problem:** Server can't access vault files
```
Error: ENOENT: no such file or directory, scandir '/path/to/vault'
```

**Solutions:**
```bash
# Verify vault path exists
ls -la "/path/to/your/vault"

# Check path in config.ts
cat src/config.ts | grep vaultPath

# Common path issues:
# - Use absolute paths, not relative
# - Escape spaces in paths: "/path/with\ spaces"
# - Check for typos in folder names
# - Verify case sensitivity (especially on Linux)

# Test path accessibility
node -e "console.log(require('fs').existsSync('/your/vault/path'))"
```

### Configuration File Issues

**Problem:** Configuration not found or invalid
```
Error: Cannot find module './config.js'
Module parse failed: Unexpected token
```

**Solutions:**
```bash
# Ensure config.ts exists
ls -la src/config.ts

# If missing, copy from example
cp src/config.example.ts src/config.ts

# Check for syntax errors
npx tsc --noEmit src/config.ts

# Verify configuration structure
node -e "
try {
  const config = require('./dist/config.js');
  console.log('Config loaded successfully');
  console.log('Vault path:', config.LIFEOS_CONFIG.vaultPath);
} catch (e) {
  console.error('Config error:', e.message);
}
"
```

### YAML Rules Configuration

**Problem:** YAML rules file not found or accessible
```
YAML rules file not found or not accessible at: /path/to/rules.md
```

**Solutions:**
```bash
# Check if YAML rules path is correct
ls -la "/path/to/your/vault/00 - Meta/System/YAML Rules for LifeOS Vault.md"

# Option 1: Fix the path in config.ts
# Option 2: Create the YAML rules file
# Option 3: Remove yamlRulesPath from config if not needed

# Test YAML rules access
node -e "
const { YamlRulesManager } = require('./dist/yaml-rules-manager.js');
const { LIFEOS_CONFIG } = require('./dist/config.js');
const manager = new YamlRulesManager(LIFEOS_CONFIG);
console.log('Rules configured:', manager.isConfigured());
"
```

## MCP Protocol Issues

### JSON-RPC Communication Errors

**Problem:** MCP client can't communicate with server
```
MCP error -32000: Invalid response format
Connection closed unexpectedly
```

**Root Cause:** Console output interfering with stdio communication

**Solutions:**
```bash
# Check for console.log statements in production code
grep -r "console\." src/ --exclude="*.example.*"

# Remove any console output from source files
# MCP servers must use stdio exclusively for JSON-RPC

# Test MCP protocol compliance
node dist/index.js < /dev/null

# Should only output valid JSON-RPC responses
```

### Tool Execution Failures

**Problem:** MCP tools return errors or unexpected results
```
Error: Tool 'create_note' failed with error: ...
Unknown tool: get_server_version
```

**Solutions:**
```bash
# Verify tools are properly registered
node -e "
const server = require('./dist/index.js');
// Should show available tools
"

# Test individual tool functionality
node -e "
const { VaultUtils } = require('./dist/vault-utils.js');
console.log('Vault utils loaded:', typeof VaultUtils.createNote);
"

# Check tool parameter validation
# Ensure required parameters are provided
# Verify parameter types match schema
```

### Server Connection Issues

**Problem:** Client can't connect to MCP server
```
Failed to connect to MCP server
Server process exited unexpectedly
```

**Solutions:**
```bash
# Test server startup manually
node dist/index.js

# Check for startup errors
node dist/index.js 2>&1 | head -20

# Verify executable permissions
chmod +x dist/index.js

# Test with explicit node path
/usr/local/bin/node dist/index.js

# Check client configuration
cat ~/.config/claude-desktop/claude_desktop_config.json
```

## Analytics System Issues

### Server Startup Failures with ES Module Errors

**Problem:** MCP server fails to start with import/require errors
```
ReferenceError: require is not defined in ES module scope
Error: ENOENT: no such file or directory, mkdir './analytics'
```

**Root Cause:** ES module compatibility issues in analytics system (Fixed in v1.7.1)

**Solutions:**
```bash
# Ensure you're running the latest version
npm run build
node dist/index.js

# If still failing, check for mixed require/import usage
grep -r "require(" src/analytics/

# Verify analytics directory exists
mkdir -p analytics

# Check file paths are absolute, not relative
ls -la analytics/usage-metrics*.json
```

### Analytics Data Loss After Restart

**Problem:** Analytics dashboard shows only recent data after server restart
```
Analytics shows "Total Operations: 1" but had more data before
Historical usage patterns missing from dashboard
```

**Root Cause:** Analytics system was overwriting existing data (Fixed in v1.7.1)

**Solutions:**
```bash
# Verify analytics data is preserved
cat analytics/usage-metrics.json | jq '.metadata.totalMetrics'

# Check for backup files with historical data
ls -la analytics/usage-metrics*.json

# If data was lost, check backup files:
# - usage-metrics-latest.json
# - usage-metrics-test-backup.json

# Ensure proper startup loading:
grep -r "loadExistingMetrics" src/analytics/
```

### Analytics Dashboard Not Updating

**Problem:** Dashboard shows stale data or doesn't reflect recent tool usage
```
Recent tool calls not appearing in analytics
Metrics count not increasing after tool usage
```

**Root Cause:** Analytics flush interval or collection issues

**Solutions:**
```bash
# Check analytics are being collected
tail -f ~/.logs/claude-desktop.log | grep Analytics

# Verify flush interval (default: 5 minutes)
grep "flushIntervalMs" src/analytics/usage-metrics.ts

# Force analytics flush by restarting server
# Or wait for automatic 5-minute flush cycle

# Check if analytics are disabled
echo $DISABLE_USAGE_ANALYTICS  # Should be empty or 'false'

# Verify analytics tracking in code
grep -r "analytics.recordUsage" src/
```

## Vault Access Problems

### File Permission Issues

**Problem:** Can't read or write vault files
```
EACCES: permission denied, open '/vault/file.md'
```

**Solutions:**
```bash
# Check vault directory permissions
ls -la "/path/to/vault"

# Fix ownership (if needed)
sudo chown -R $(whoami) "/path/to/vault"

# Set proper permissions
chmod -R 755 "/path/to/vault"

# For iCloud/OneDrive vaults, ensure sync is complete
# Check vault accessibility
node -e "
const fs = require('fs');
try {
  fs.accessSync('/path/to/vault', fs.constants.R_OK | fs.constants.W_OK);
  console.log('Vault access: OK');
} catch (e) {
  console.error('Vault access error:', e.message);
}
"
```

### YAML Parsing Errors

**Problem:** Notes with invalid YAML frontmatter
```
YAMLException: bad indentation of a mapping entry
YAMLException: end of the stream or a document separator is expected
```

**Solutions:**
```bash
# Run vault diagnostics
node -e "
const { VaultUtils } = require('./dist/vault-utils.js');
// Use diagnose_vault tool to find problematic files
"

# Common YAML issues:
# - Incorrect indentation (use spaces, not tabs)
# - Missing quotes around special characters
# - Unescaped colons in values
# - Malformed arrays or objects

# Fix example:
# Bad:  title: My Note: A Story
# Good: title: "My Note: A Story"

# Use YAML validator online or:
npm install -g js-yaml
js-yaml-cli your-problematic-file.md
```

### Template Discovery Issues

**Problem:** Templates not found or not loading
```
Template 'restaurant' not found
Template discovery failed
```

**Solutions:**
```bash
# Check templates directory
ls -la "/path/to/vault/00 - Meta/Templates"

# Verify template files exist
find "/path/to/vault" -name "*.md" -path "*/Templates/*"

# Test template engine
node -e "
const { DynamicTemplateEngine } = require('./dist/template-engine-dynamic.js');
console.log('Templates found:', DynamicTemplateEngine.getAllTemplates().length);
DynamicTemplateEngine.getAllTemplates().forEach(t => console.log('- ' + t.name));
"

# Common template issues:
# - Template files missing .md extension
# - Invalid YAML frontmatter in templates
# - Incorrect template directory path
# - Templater syntax causing YAML parsing errors
```

## Client Integration Issues

### Claude Desktop Integration

**Problem:** MCP server not appearing in Claude Desktop
```
MCP server 'lifeos' not found
Failed to load MCP servers
```

**Solutions:**
```bash
# Check Claude Desktop config location
# macOS: ~/.config/claude-desktop/claude_desktop_config.json
# Windows: %APPDATA%\Claude\claude_desktop_config.json

# Verify config syntax
cat ~/.config/claude-desktop/claude_desktop_config.json | jq .

# Common config issues:
{
  "mcpServers": {
    "lifeos": {
      "command": "node",  // Must be "node", not "nodejs"
      "args": ["/absolute/path/to/dist/index.js"]  // Must be absolute path
    }
  }
}

# Test config manually
node -c ~/.config/claude-desktop/claude_desktop_config.json

# Restart Claude Desktop after config changes
```

### Raycast Integration

**Problem:** Raycast can't execute MCP commands
```
Script execution failed
Command not found: node
```

**Solutions:**
```bash
# Check Node.js in PATH for Raycast
echo $PATH

# Update start-mcp.sh script
cat scripts/start-mcp.sh

# Ensure nvm is properly loaded:
#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

cd "/absolute/path/to/mcp-for-lifeos"
exec node dist/index.js "$@"

# Make script executable
chmod +x scripts/start-mcp.sh

# Test script manually
./scripts/start-mcp.sh
```

### Cursor IDE Integration

**Problem:** Cursor can't access MCP server
```
MCP server connection failed
Agent mode not working with vault
```

**Solutions:**
```bash
# Check Cursor MCP configuration
# Verify server is running and accessible
# Test agent mode with simple queries

# Common issues:
# - Incorrect server endpoint configuration
# - Missing environment variables
# - Agent mode not enabled in Cursor settings
```

## Performance Issues

### Slow Search Operations

**Problem:** Search takes too long or times out
```
Search operation timeout
Memory usage too high during search
```

**Solutions:**
```bash
# Monitor memory usage
top -p $(pgrep -f "node dist/index.js")

# Optimize search parameters
# - Reduce maxResults
# - Use more specific queries
# - Exclude large folders

# Check vault size
du -sh "/path/to/vault"
find "/path/to/vault" -name "*.md" | wc -l

# Consider search optimization:
# - Use folder filters to limit scope
# - Avoid regex searches on large vaults
# - Use content type filters when possible
```

### High Memory Usage

**Problem:** Server uses excessive memory
```
Process killed (out of memory)
Heap allocation failed
```

**Solutions:**
```bash
# Monitor memory usage
ps aux | grep "node dist/index.js"

# Increase Node.js heap size if needed
node --max-old-space-size=4096 dist/index.js

# Optimize configuration:
# - Reduce concurrent operations
# - Limit search result sizes
# - Use streaming for large operations

# Check for memory leaks
node --inspect dist/index.js
# Use Chrome DevTools to profile memory
```

### File System Performance

**Problem:** Slow file operations or disk I/O
```
File operations timing out
Vault scanning takes too long
```

**Solutions:**
```bash
# Check disk I/O performance
iostat -x 1 5

# For network drives (iCloud, OneDrive):
# - Ensure files are downloaded locally
# - Consider local vault copy for performance
# - Check sync status

# Optimize file operations:
# - Use file system caching
# - Limit concurrent file access
# - Consider SSD upgrade for large vaults
```

## Template System Problems

### Templater Syntax Issues

**Problem:** Templates with Templater syntax cause errors
```
Template YAML parsing failed
Unexpected token '<' in YAML
```

**Solutions:**
The server automatically handles Templater syntax, but if issues persist:

```bash
# Check template preprocessing
node -e "
const { DynamicTemplateEngine } = require('./dist/template-engine-dynamic.js');
// Test specific template
const template = DynamicTemplateEngine.getTemplate('restaurant');
console.log('Template loaded:', template ? 'YES' : 'NO');
"

# Common Templater issues handled:
# - <% tp.file.title %> → actual title
# - <% moment().format() %> → current date
# - Template variables in YAML frontmatter

# If templates still fail:
# 1. Check for nested template syntax
# 2. Verify template file encoding (UTF-8)
# 3. Check for special characters in frontmatter
```

### Custom Template Creation

**Problem:** Custom templates not working
```
Template validation failed
Custom template not found
```

**Solutions:**
```bash
# Template requirements:
# 1. Must be in Templates directory
# 2. Must have .md extension
# 3. Must have valid YAML frontmatter
# 4. Use template key matching filename

# Example template structure:
# filename: custom-template.md
---
template: custom-template
name: "Custom Template"
description: "My custom template"
targetFolder: "30 - Resources"
contentType: "Reference"
---

# Template Content Here
Title: <% tp.file.title %>
Date: <% moment().format('YYYY-MM-DD') %>

# Test custom template
node -e "
const { DynamicTemplateEngine } = require('./dist/template-engine-dynamic.js');
const templates = DynamicTemplateEngine.getAllTemplates();
console.log('Available templates:');
templates.forEach(t => console.log('- ' + t.key + ': ' + t.name));
"
```

## Network and Connectivity

### Web Interface Issues

**Problem:** Web interface not accessible
```
Connection refused on port 19831
Web interface not starting
```

**Solutions:**
```bash
# Check if web interface is enabled
echo $ENABLE_WEB_INTERFACE

# Enable for testing only
ENABLE_WEB_INTERFACE=true node dist/index.js

# Check port availability
netstat -an | grep 19831
lsof -i :19831

# Use different port if needed
ENABLE_WEB_INTERFACE=true WEB_PORT=8080 node dist/index.js

# Important: Don't enable web interface with MCP clients
```

### Firewall and Security

**Problem:** Network connections blocked
```
Connection timeout
Access denied
```

**Solutions:**
```bash
# Check firewall status (macOS)
sudo pfctl -s rules

# Check firewall status (Linux)
sudo ufw status

# Allow Node.js through firewall if needed
sudo ufw allow from 192.168.1.0/24 to any port 19831

# For corporate networks:
# - Configure proxy settings
# - Check network security policies
# - Verify VPN compatibility
```

## Logging and Debugging

### Enable Debug Logging

```bash
# Set debug environment
export NODE_ENV=development
export DEBUG=lifeos:*

# Run with verbose logging
node dist/index.js --verbose

# Create debug configuration
cat > debug-config.js << 'EOF'
module.exports = {
  logging: {
    level: 'debug',
    file: './debug.log'
  }
};
EOF
```

### Common Debug Commands

```bash
# Check server startup
node dist/index.js --dry-run

# Test configuration loading
node -e "
try {
  const config = require('./dist/config.js');
  console.log('✓ Config loaded');
  console.log('✓ Vault path:', config.LIFEOS_CONFIG.vaultPath);
} catch (e) {
  console.error('✗ Config error:', e.message);
}
"

# Test vault access
node -e "
const { VaultUtils } = require('./dist/vault-utils.js');
try {
  const notes = VaultUtils.searchNotes({});
  console.log('✓ Vault accessible, found', notes.length, 'notes');
} catch (e) {
  console.error('✗ Vault error:', e.message);
}
"

# Test template system
node -e "
const { DynamicTemplateEngine } = require('./dist/template-engine-dynamic.js');
const templates = DynamicTemplateEngine.getAllTemplates();
console.log('✓ Templates loaded:', templates.length);
templates.forEach(t => console.log('  -', t.name));
"
```

### Log Analysis

```bash
# Check system logs (macOS)
log show --predicate 'process == "node"' --last 1h

# Check system logs (Linux)
journalctl -u lifeos-mcp -f

# Analyze application logs
tail -f debug.log | grep ERROR
tail -f debug.log | grep -E "(ERROR|WARN|timeout)"

# Performance analysis
grep -E "(slow|timeout|memory)" debug.log
```

## Getting Help

### Before Seeking Help

1. **Check this troubleshooting guide** for your specific issue
2. **Review the deployment documentation** in [DEPLOYMENT.md](DEPLOYMENT.md)
3. **Verify system requirements** are met
4. **Test with minimal configuration** to isolate the problem
5. **Collect relevant logs and error messages**

### Information to Provide

When reporting issues, include:

```bash
# System information
node --version
npm --version
uname -a  # or systeminfo on Windows

# Application information
cat package.json | grep version
ls -la dist/
ls -la src/config.ts

# Configuration (remove sensitive paths)
cat src/config.ts | sed 's|/Users/[^/]*|/Users/USERNAME|g'

# Error logs
tail -50 debug.log  # or relevant log files

# Test results
node -e "console.log(process.platform, process.arch)"
```

### Support Channels

1. **GitHub Issues**: [Create an issue](https://github.com/your-username/mcp-for-lifeos/issues) for bugs and feature requests
2. **Documentation**: Check README.md and other docs/ files
3. **Community Discussions**: Join repository discussions
4. **Integration Guides**: See client-specific guides in docs/

### Common Solutions Summary

| Issue Type | Quick Fix | Reference |
|------------|-----------|-----------|
| Installation | Update Node.js to 18+ | [Installation Issues](#installation-issues) |
| Configuration | Copy config.example.ts | [Configuration Problems](#configuration-problems) |
| MCP Protocol | Remove console.log statements | [MCP Protocol Issues](#mcp-protocol-issues) |
| Vault Access | Check paths and permissions | [Vault Access Problems](#vault-access-problems) |
| Client Setup | Use absolute paths | [Client Integration Issues](#client-integration-issues) |
| Performance | Reduce search scope | [Performance Issues](#performance-issues) |
| Templates | Check YAML syntax | [Template System Problems](#template-system-problems) |
| Network | Disable web interface for MCP | [Network and Connectivity](#network-and-connectivity) |

### Emergency Recovery

If the server is completely broken:

```bash
# 1. Stop all processes
pkill -f "node dist/index.js"

# 2. Reset to clean state
git checkout HEAD -- src/config.ts
rm -rf node_modules dist
npm install
npm run build

# 3. Reconfigure from scratch
cp src/config.example.ts src/config.ts
# Edit config.ts with your settings

# 4. Test minimal setup
node dist/index.js --help
```

This should restore a working baseline from which you can troubleshoot specific issues.