# Troubleshooting Guide

Solutions to common issues when using the LifeOS MCP server.

## Table of Contents

1. [Server Issues](#server-issues)
2. [Client Connection Issues](#client-connection-issues)
3. [Template Issues](#template-issues)
4. [YAML Issues](#yaml-issues)
5. [Transaction Errors](#transaction-errors)
6. [Analytics Issues](#analytics-issues)
7. [Performance Issues](#performance-issues)

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

## Transaction Errors

The transaction system (MCP-108) provides atomic rename operations with automatic rollback. Below are all transaction error codes with troubleshooting guidance.

### Error Code Matrix

| Error Code | Phase | Rollback? | Manual Recovery? | Retry? |
|------------|-------|-----------|------------------|--------|
| TRANSACTION_PLAN_FAILED | Plan | N/A | No | Yes |
| TRANSACTION_PREPARE_FAILED | Prepare | Yes | Rare | Yes |
| TRANSACTION_VALIDATE_FAILED | Validate | Yes | No | Yes |
| TRANSACTION_STALE_CONTENT | Validate | Yes | No | Yes (recommended) |
| TRANSACTION_COMMIT_FAILED | Commit | Yes | Possible | Maybe |
| TRANSACTION_ROLLBACK_FAILED | Abort | Partial | **Yes** | After manual recovery |
| TRANSACTION_FAILED | Any | Varies | Varies | Depends on cause |

---

### TRANSACTION_PLAN_FAILED

**Phase**: Plan (phase 1)
**Rollback**: Not applicable (no changes made yet)

**Common Causes:**

- Source file does not exist
- Invalid file paths (not within vault)
- Manifest building failures
- Link render failures (if `updateLinks: true`)

**Solutions:**

1. **Verify source file:**

   ```bash
   ls -lh /vault/path/to/file.md
   # Should exist
   ```

2. **Check paths:**
   - Use absolute paths or vault-relative paths
   - Ensure paths point to `.md` files
   - Verify paths are within vault boundaries

3. **Test without link updates:**

   ```json
   {
     "oldPath": "note.md",
     "newPath": "renamed.md",
     "updateLinks": false
   }
   ```

**Resolution**: Fix path issues and retry

---

### TRANSACTION_PREPARE_FAILED

**Phase**: Prepare (phase 2)
**Rollback**: Yes (staged files deleted automatically)

**Common Causes:**

- Filesystem errors during staging
- Disk full errors
- WAL directory permission issues
- Temp file write failures

**Solutions:**

1. **Check disk space:**

   ```bash
   df -h
   # Ensure adequate free space
   ```

2. **Verify WAL directory permissions:**

   ```bash
   ls -ld ~/.config/mcp-lifeos/wal/
   # Should be writable

   chmod 755 ~/.config/mcp-lifeos/wal/
   ```

3. **Check temp file conflicts:**

   ```bash
   find /vault -name "*.mcp-staged-*"
   # Should be empty or only recent files
   ```

**Resolution**: Fix filesystem issues and retry

---

### TRANSACTION_VALIDATE_FAILED

**Phase**: Validate (phase 3)
**Rollback**: Yes (automatic)

**Common Causes:**

- Hash computation failures
- File read errors during validation
- Filesystem corruption

**Solutions:**

1. **Check file accessibility:**

   ```bash
   cat /vault/path/to/file.md > /dev/null
   # Should succeed without errors
   ```

2. **Verify filesystem health:**

   ```bash
   # macOS
   diskutil verifyVolume /Volumes/VaultDrive

   # Linux
   fsck -n /dev/device
   ```

3. **Retry operation:**
   - Usually transient errors
   - Wait a few seconds and retry

**Resolution**: Retry operation, check filesystem if persists

---

### TRANSACTION_STALE_CONTENT

**Phase**: Validate (phase 3)
**Rollback**: Yes (automatic)

**Common Causes:**

- **File modified by another process during transaction**
- Concurrent edits (user or sync service)
- SHA-256 hash mismatch detected
- **Most common transaction error**

**Example Error:**

```json
{
  "success": false,
  "error": "[TRANSACTION_STALE_CONTENT] Files modified during transaction (staleness detected): /vault/note.md",
  "errorCode": "TRANSACTION_STALE_CONTENT",
  "correlationId": "550e8400-..."
}
```

**Solutions:**

1. **Retry operation:**
   - **Recommended first step**
   - Content is now stable
   - Transaction will succeed on retry

2. **Disable sync services:**

   ```bash
   # Pause iCloud sync during rename
   # Or disable Dropbox temporarily
   ```

3. **Avoid concurrent edits:**
   - Close note in Obsidian during rename
   - Don't manually edit files during operation
   - Wait for previous operations to complete

4. **Use dry-run first:**

   ```json
   {
     "oldPath": "note.md",
     "newPath": "renamed.md",
     "dryRun": true
   }
   ```

   Then execute after verifying:

   ```json
   {
     "oldPath": "note.md",
     "newPath": "renamed.md",
     "dryRun": false
   }
   ```

**Prevention:**

- Pause sync services during bulk renames
- Avoid manual edits during rename operations
- Close files in Obsidian before renaming
- Use dry-run mode for high-impact operations

**Resolution**: Retry operation (90% success rate on retry)

---

### TRANSACTION_COMMIT_FAILED

**Phase**: Commit (phase 4)
**Rollback**: Yes (partial changes rolled back)

**Common Causes:**

- Atomic rename failures
- Permission errors
- Disk full during commit
- Filesystem locked/unavailable

**Solutions:**

1. **Check disk space:**

   ```bash
   df -h /vault
   # Ensure adequate space
   ```

2. **Verify permissions:**

   ```bash
   ls -ld /vault/destination/folder/
   # Should be writable

   chmod 755 /vault/destination/folder/
   ```

3. **Check file locks:**

   ```bash
   # macOS
   lsof | grep /vault/note.md

   # Linux
   fuser /vault/note.md
   ```

4. **Review WAL file if preserved:**

   ```bash
   cat ~/.config/mcp-lifeos/wal/*.wal.json | jq .
   ```

**Manual Recovery:**

If rollback fails, see [WAL Recovery Guide](WAL-RECOVERY.md) for manual procedures.

**Resolution**: Fix permissions/space, retry or manually recover

---

### TRANSACTION_ROLLBACK_FAILED

**Phase**: Abort (rollback phase)
**Rollback**: Partial or failed
**Manual Recovery**: **REQUIRED**

**Common Causes:**

- Catastrophic filesystem failures
- Permission changes during rollback
- Disk full during recovery
- Rollback logic errors

**Critical Error - Manual Recovery Required**

**Immediate Actions:**

1. **Stop MCP server:**

   ```bash
   pkill -f "mcp-for-lifeos"
   ```

2. **Locate WAL file:**

   ```bash
   ls -lh ~/.config/mcp-lifeos/wal/*.wal.json
   ```

3. **Follow WAL Recovery Guide:**
   - [WAL Recovery Guide](WAL-RECOVERY.md)
   - Complete manual recovery procedures
   - Validate vault consistency

**Manual Recovery Steps (Summary):**

1. Inspect WAL contents to understand transaction state
2. Check vault for source/destination files
3. Restore files based on WAL manifest
4. Delete orphaned temp files (`.mcp-staged-*`)
5. Delete WAL file after successful recovery
6. Restart server

**Example Recovery:**

```bash
# 1. Inspect WAL
cat ~/.config/mcp-lifeos/wal/2024-11-02-rename-550e8400.wal.json | jq .

# 2. Check file state
ls -lh /vault/Projects/note.md     # Source
ls -lh /vault/Archive/note.md      # Destination

# 3. Restore if needed
mv /vault/Archive/note.md /vault/Projects/note.md

# 4. Clean up temps
find /vault -name "*.mcp-staged-550e8400" -delete

# 5. Delete WAL
rm ~/.config/mcp-lifeos/wal/2024-11-02-rename-550e8400.wal.json

# 6. Restart server
npm start
```

**Resolution**: Manual recovery only - see [WAL Recovery Guide](WAL-RECOVERY.md)

---

### TRANSACTION_FAILED

**Phase**: Handler-level (any phase)
**Rollback**: Varies (depends on phase)

**Common Causes:**

- General transaction execution failures
- Handler-level errors
- Unexpected exceptions
- Underlying error from specific phase

**Solutions:**

1. **Check error message for details:**

   ```json
   {
     "success": false,
     "error": "[TRANSACTION_FAILED] ...",
     "correlationId": "550e8400-...",
     "finalPhase": "validate",
     "rollback": { ... }
   }
   ```

2. **Identify underlying cause:**
   - Review `finalPhase` field
   - Check `rollback.failures` array
   - Look for specific error details

3. **Follow phase-specific guidance:**
   - If `finalPhase: "plan"` → see TRANSACTION_PLAN_FAILED
   - If `finalPhase: "prepare"` → see TRANSACTION_PREPARE_FAILED
   - If `finalPhase: "validate"` → see TRANSACTION_VALIDATE_FAILED or TRANSACTION_STALE_CONTENT
   - If `finalPhase: "commit"` → see TRANSACTION_COMMIT_FAILED

4. **Check rollback status:**

   ```json
   "rollback": {
     "success": true,
     "rolledBack": [...],
     "failures": []
   }
   ```

   - If `rollback.success: true` → safe to retry
   - If `rollback.success: false` → may need manual recovery

**Resolution**: Address underlying cause and retry

---

### Common Transaction Error Scenarios

#### Scenario 1: Concurrent File Modification

**Symptom**: `TRANSACTION_STALE_CONTENT` error

**Cause**: iCloud sync or manual edit during transaction

**Solution**:

```bash
# 1. Disable iCloud sync temporarily
# 2. Close file in Obsidian
# 3. Retry rename operation
```

**Success Rate**: 90%+ on retry

---

#### Scenario 2: Orphaned WAL Files

**Symptom**: WAL files accumulating in `~/.config/mcp-lifeos/wal/`

**Cause**: Server crashes during transactions

**Solution**:

```bash
# 1. Restart server (triggers boot recovery)
npm start

# 2. Check recovery logs for status
# Should see ✅ or ⚠️ symbols

# 3. Manual recovery if needed
# See WAL Recovery Guide
```

---

#### Scenario 3: Disk Full During Transaction

**Symptom**: `TRANSACTION_PREPARE_FAILED` or `TRANSACTION_COMMIT_FAILED`

**Cause**: Insufficient disk space

**Solution**:

```bash
# 1. Check disk space
df -h

# 2. Free up space
# Delete large files or move to external storage

# 3. Clean up temp files
find /vault -name "*.mcp-staged-*" -delete

# 4. Retry operation
```

---

### Transaction Error Prevention

**Best Practices:**

1. **Use dry-run mode for complex operations:**

   ```json
   { "dryRun": true }
   ```

2. **Pause sync services during bulk renames:**
   - Disable iCloud sync
   - Pause Dropbox
   - Wait for operations to complete

3. **Avoid concurrent edits:**
   - Close files in Obsidian
   - Don't manually edit during renames

4. **Monitor WAL directory:**

   ```bash
   ls -lh ~/.config/mcp-lifeos/wal/
   # Should be empty or minimal
   ```

5. **Ensure adequate disk space:**
   - Keep >500MB free
   - Monitor before bulk operations

---

### Transaction Error Recovery Workflows

**Workflow 1: Simple Retry**

```
TRANSACTION_STALE_CONTENT
  ↓
Wait 5 seconds
  ↓
Retry operation
  ↓
Success ✅
```

**Workflow 2: Manual Recovery**

```
TRANSACTION_ROLLBACK_FAILED
  ↓
Stop server
  ↓
Inspect WAL file
  ↓
Manual file restoration
  ↓
Delete WAL
  ↓
Restart server
```

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
