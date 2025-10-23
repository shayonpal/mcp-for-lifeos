# Troubleshooting Guide

Solutions to common issues when using the LifeOS MCP server.

## Table of Contents

1. [Server Issues](#server-issues)
2. [Client Connection Issues](#client-connection-issues)
3. [Template Issues](#template-issues)
4. [YAML Issues](#yaml-issues)
5. [Analytics Issues](#analytics-issues)
6. [Performance Issues](#performance-issues)

---

## Server Issues

### Server Won't Start

**Symptoms:**

- Server crashes on startup
- Error messages in console
- Process exits immediately

**Solutions:**

1. **Check Node.js version:**

   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Build the project:**

   ```bash
   npm run build
   ```

4. **Check configuration:**
   - Verify `src/config.ts` exists
   - Ensure all paths are absolute
   - Validate vault path exists

5. **Review error logs:**

   ```bash
   node dist/src/index.js
   # Read any error messages
   ```

**Common Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot find module` | Missing dependencies | Run `npm install` |
| `ENOENT: no such file` | Invalid path in config | Check vault paths |
| `Permission denied` | Insufficient file permissions | Check folder permissions |
| `Port already in use` | Web interface port conflict | Disable web interface or change port |

---

## Client Connection Issues

### Claude Desktop Can't Connect

**Symptoms:**

- Server not appearing in Claude Desktop
- Tools not available
- Connection timeout errors

**Solutions:**

1. **Use absolute paths:**

   ```json
   {
     "command": "node",
     "args": ["/Users/username/mcp-for-lifeos/dist/src/index.js"]
   }
   ```

   ❌ Don't use: `./dist/src/index.js` or `~/mcp-for-lifeos/...`

2. **Restart Claude Desktop:**
   - Quit Claude Desktop completely
   - Wait 5 seconds
   - Reopen application

3. **Verify JSON syntax:**
   - Check for missing commas
   - Ensure proper quote usage
   - Validate JSON structure

4. **Test server manually:**

   ```bash
   node /absolute/path/to/dist/src/index.js
   # Should start without errors
   ```

5. **Check environment variables:**

   ```json
   {
     "env": {
       "ENABLE_WEB_INTERFACE": "false"
     }
   }
   ```

### Raycast Connection Issues

**Solutions:**

1. **Verify MCP configuration** same as Claude Desktop
2. **Check Raycast permissions** for file access
3. **Restart Raycast** after configuration changes
4. **Test with @lifeos-mcp mention** in AI chat

### Cursor IDE Connection Issues

**Solutions:**

1. **Verify MCP settings** in Cursor preferences
2. **Check Agent Mode** is enabled
3. **Restart Cursor** after changes
4. **Test tool access** in Agent Mode

---

## Template Issues

### Templates Not Working

**Symptoms:**

- Notes created without template content
- Template not found errors
- Missing template sections

**Solutions:**

1. **Check templates path in config:**

   ```typescript
   templatesPath: '/absolute/path/to/vault/Templates'
   ```

2. **Verify template files exist:**

   ```bash
   ls -la /path/to/vault/Templates/
   # Should show .md files
   ```

3. **Ensure .md extension:**
   - Templates must end with `.md`
   - Not `.txt` or other extensions

4. **Check template YAML:**
   - Valid YAML frontmatter
   - No syntax errors
   - Required fields present

5. **Clear template cache:**
   - Restart server (cache is 24 hours)
   - Templates are re-discovered on startup

### Template Processing Errors

**Symptoms:**

- Templater syntax not processed
- Variables not replaced
- Broken note content

**Solutions:**

1. **Test in Obsidian first:**
   - Open template in Obsidian
   - Verify Templater plugin works
   - Check variable syntax

2. **Common Templater issues:**

   ```text
   ❌ <% tp.file.title%>   (no space before %>)
   ✅ <% tp.file.title %>  (space before %>)

   ❌ <%tp.date.now()%>    (no spaces)
   ✅ <% tp.date.now() %>  (spaces)
   ```

3. **YAML-safe Templater:**
   - Use quotes for string values
   - Escape special characters
   - Test YAML parsing

---

## YAML Issues

### YAML Parsing Errors

**Symptoms:**

- "Invalid YAML" error messages
- Notes not saving
- Frontmatter corruption

**Solutions:**

1. **Use diagnose_vault tool:**

   ```bash
   # In Claude Desktop or any MCP client
   diagnose_vault checkYaml: true maxFiles: 100
   ```

2. **Common YAML errors:**

   **Indentation:**

   ```yaml
   ❌ tags:
   - tag1  # Wrong indentation

   ✅ tags:
     - tag1  # Correct indentation
   ```

   **Quotes:**

   ```yaml
   ❌ title: My Note: With Colon  # Unquoted colon
   ✅ title: "My Note: With Colon"  # Quoted

   ❌ source: https://example.com  # May need quotes
   ✅ source: "https://example.com"  # Safer
   ```

   **Arrays:**

   ```yaml
   ❌ tags: tag1, tag2  # Not valid YAML
   ✅ tags: [tag1, tag2]  # Array format
   ✅ tags:
     - tag1
     - tag2
   ```

3. **Fix malformed files:**
   - Backup the note
   - Fix YAML syntax
   - Validate with online YAML checker
   - Save and test

### Auto-Managed Fields

**Issue:** Date fields being overwritten

**Solution:**

- Server never edits `date created` or `date modified`
- If these change, check Obsidian settings
- Verify no other plugins modifying dates

---

## Analytics Issues

### Dashboard Shows "No Data Available"

**Solutions:**

1. **Enable analytics:**

   ```bash
   export DISABLE_USAGE_ANALYTICS=false
   # Or don't set it (enabled by default)
   ```

2. **Use the server:**
   - Perform some tool operations
   - Search, create notes, etc.
   - Data collects automatically

3. **Check analytics file:**

   ```bash
   cat analytics/usage-metrics.jsonl
   # Should contain JSON lines
   ```

4. **Wait for flush:**
   - Data exports every 5 minutes
   - Or restart server to force flush

### Dashboard Not Updating

**Solutions:**

1. **Check auto-refresh:**
   - Dashboard refreshes every 5 minutes
   - Use manual refresh button

2. **Restart dashboard server:**

   ```bash
   # Stop current server (Ctrl+C)
   node scripts/start-analytics-dashboard.js
   ```

3. **Clear browser cache:**
   - Hard refresh (Cmd+Shift+R / Ctrl+F5)
   - Clear cache for localhost

### Analytics Not Collecting

**Solutions:**

1. **Verify environment variable:**

   ```bash
   echo $DISABLE_USAGE_ANALYTICS
   # Should be empty or "false"
   ```

2. **Check write permissions:**

   ```bash
   ls -la analytics/
   # Folder should be writable
   ```

3. **Review server logs:**
   - Look for analytics errors
   - Check file write failures

---

## Performance Issues

### Slow Search Operations

**Solutions:**

1. **Use concise format:**

   ```bash
   search query: "search terms" format: "concise"
   # Returns minimal data, faster
   ```

2. **Limit results:**

   ```bash
   search query: "search terms" maxResults: 10
   # Fewer results = faster
   ```

3. **Optimize query:**
   - Use specific search terms
   - Add metadata filters
   - Narrow folder scope

4. **Check vault size:**
   - Very large vaults (7GB+) may be slow
   - Consider archiving old notes
   - Use folder filters to limit scope

### Slow Note Creation

**Solutions:**

1. **Disable auto-template:**

   ```bash
   create_note_smart title: "Note" auto_template: false
   # Skips template detection
   ```

2. **Clear template cache:**
   - Restart server
   - Cache rebuilds on startup

3. **Check template complexity:**
   - Simplify Templater syntax
   - Reduce template file size
   - Remove unnecessary processing

### iCloud Sync Delays

**Symptoms:**

- "File not found" errors
- Intermittent failures
- Retry attempts

**Solutions:**

1. **Server has automatic retry:**
   - Waits for iCloud sync
   - Retries up to 3 times
   - Usually resolves automatically

2. **Check iCloud status:**
   - Ensure iCloud Drive is active
   - Verify folder is syncing
   - Check network connection

3. **Use local vault:**
   - Store vault outside iCloud
   - Or wait for sync to complete
   - Consider local-only development vault

---

## Getting Help

If you've tried these solutions and still have issues:

1. **Check GitHub Issues:**
   - [View existing issues](https://github.com/shayonpal/mcp-for-lifeos/issues)
   - Search for similar problems
   - Read issue discussions

2. **Create New Issue:**
   - Describe the problem clearly
   - Include error messages
   - Share configuration (remove sensitive data)
   - Mention environment (OS, Node version)

3. **Include Diagnostics:**

   ```bash
   # Server version
   node --version
   npm --version

   # Build status
   npm run typecheck

   # Vault diagnostics (in MCP client)
   diagnose_vault checkYaml: true
   get_server_version includeTools: true
   ```

4. **Community Support:**
   - GitHub Discussions
   - Share solutions with others
   - Help improve documentation

---

For more information:

- [Tools API Reference](../api/TOOLS.md) - Complete tool documentation
- [Configuration Guide](CONFIGURATION.md) - Setup and configuration
- [Templates Guide](TEMPLATES.md) - Template system and customization
- [Integrations Guide](INTEGRATIONS.md) - Client integration setup
- [Deployment Guide](DEPLOYMENT-GUIDE.md) - Installation and deployment
