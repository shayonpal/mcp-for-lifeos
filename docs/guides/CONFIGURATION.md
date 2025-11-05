# Configuration Guide

**Last updated:** 2025-10-24 00:23

Complete guide for configuring the LifeOS MCP server for your Obsidian vault.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Configuration File](#configuration-file)
3. [YAML Compliance](#yaml-compliance)
4. [File Naming Convention](#file-naming-convention)
5. [Folder Structure](#folder-structure)
6. [Environment Variables](#environment-variables)
7. [Transaction System Configuration](#transaction-system-configuration)

---

## Initial Setup

### Prerequisites

1. **Node.js 18+** installed
2. **Obsidian vault** with PARA structure
3. **Git** (for installation)

### Configuration Steps

1. **Copy configuration template:**

   ```bash
   cp src/config.example.ts src/config.ts
   ```

2. **Update vault paths** to match your Obsidian vault location

3. **Customize mappings** (optional):
   - PEOPLE_MAPPINGS for contacts
   - YAML rules path for custom guidelines

4. **Build the project:**

   ```bash
   npm run build
   ```

---

## Configuration File

The configuration file (`src/config.ts`) contains all server settings.

### Required Configuration

```typescript
export const LIFEOS_CONFIG: LifeOSConfig = {
  vaultPath: '/path/to/your/obsidian/vault',
  templatesPath: '/path/to/your/obsidian/vault/Templates',
  yamlRulesPath: '/path/to/your/vault/YAML Rules.md', // Optional
  // ... other paths
};
```

### Key Configuration Options

#### Vault Paths

```typescript
{
  // Main vault directory
  vaultPath: '/Users/username/Documents/LifeOS-Vault',

  // Attachments folder
  attachmentsPath: '/Users/username/Documents/LifeOS-Vault/00 - Meta/Attachments',

  // Templates folder
  templatesPath: '/Users/username/Documents/LifeOS-Vault/00 - Meta/Templates',

  // Daily notes folder
  dailyNotesPath: '/Users/username/Documents/LifeOS-Vault/20 - Areas/Personal/Journals/Daily',

  // Inbox folder (for quick captures)
  inboxPath: '/Users/username/Documents/LifeOS-Vault/05 - Fleeting Notes'
}
```

#### YAML Rules Integration

```typescript
{
  // Optional: Path to your custom YAML frontmatter guidelines
  yamlRulesPath: '/path/to/vault/YAML Rules.md'
}
```

When set, AI assistants can reference your YAML rules using the `get_yaml_rules` tool to ensure consistent note creation.

#### People Mappings

```typescript
{
  // Map common names to full contact information
  PEOPLE_MAPPINGS: {
    'John': 'John Doe',
    'Sarah': 'Sarah Smith',
    'Mom': 'Jane Doe'
  }
}
```

Helps maintain consistent people tagging across notes.

### TOOL_MODE

Controls which MCP tools are registered and visible to AI clients. This allows you to customize the tool interface without code changes.

**Available Modes:**

1. **`consolidated-only`** (default, 13 tools)
   - Only modern consolidated tools (search, create_note, list)
   - Always-available tools (get_server_version, get_yaml_rules, read_note, edit_note, get_daily_note, diagnose_vault, move_items, rename_note, insert_content, list_yaml_property_values)
   - Cleaner MCP client interface, recommended for most users
   - Hides 11 legacy tool aliases

2. **`legacy-only`** (21 tools)
   - All original legacy tools without consolidated versions
   - Useful for backward compatibility testing
   - Hides 3 consolidated tools

3. **`consolidated-with-aliases`** (24 tools)
   - Both consolidated tools AND legacy aliases
   - Maximum compatibility mode
   - Shows all tools (13 consolidated-only + 11 legacy aliases)

**Configuration Examples:**

```bash
# Default mode (no configuration needed)
# Shows 13 tools - recommended for most users
# (no TOOL_MODE set defaults to consolidated-only)

# Legacy-only mode (21 tools)
TOOL_MODE=legacy-only

# Maximum compatibility mode (24 tools)
TOOL_MODE=consolidated-with-aliases
```

**Backward Compatibility:**

The deprecated `CONSOLIDATED_TOOLS_ENABLED` flag is still supported for backward compatibility:

- `CONSOLIDATED_TOOLS_ENABLED=false` maps to `TOOL_MODE=legacy-only`
- Console warning logged when using deprecated flag
- Scheduled for removal in Cycle 10

**Tool Renaming:**

- `create_note_smart` has been renamed to `create_note`
- Smart functionality (template auto-detection) is now the default create_note behavior
- Legacy `create_note_smart` alias available in consolidated-with-aliases mode

**Default Mode Change:**

- Previous default: `consolidated-with-aliases` (24 tools)
- New default: `consolidated-only` (13 tools)
- **Upgrade impact**: Users upgrading will see 13 tools instead of 24
- **Restoration**: Set `TOOL_MODE=consolidated-with-aliases` to restore previous behavior

**Validation:**

- Invalid TOOL_MODE values fallback to `consolidated-only` with error log
- Server logs tool count at startup for verification
- All MCP responses include `toolMode` field in metadata

For complete tool mapping and migration guide, see [ADR-005: Default Tool Mode](../adr/005-default-tool-mode-consolidated-only.md).

---

## YAML Compliance

The server automatically enforces LifeOS YAML rules to maintain consistency.

### Auto-Managed Fields

These fields are **never edited** by the server:

- `date created` - Set once on creation
- `date modified` - Automatically updated by Obsidian

### Standard Fields

```yaml
---
title: Note Title
contentType: Article
category: Technology
date created: 2025-01-15 10:30
tags: [ai, programming]
source: https://example.com
---
```

### Field Conventions

**Source URLs:**

- Use `source` field (not `url` or `URL`)
- Full URLs with protocol

**Location Format:**

- Format: `Country [CODE]`
- Examples: `Canada [CA]`, `India [IN]`, `United States [US]`

**Tags:**

- Array format: `tags: [tag1, tag2]`
- String format: `tags: mytag` (single tag)
- YAML list format:

  ```yaml
  tags:
    - tag1
    - tag2
  ```

**Content Types:**

- Follow exact mappings from configuration
- Case-sensitive: "Article", "Daily Note", "Reference"

### YAML Validation

The server:

- ✅ Validates YAML syntax before saving
- ✅ Ensures required fields present
- ✅ Follows exact formatting rules
- ✅ Provides error reporting for issues
- ✅ Handles Templater syntax safely

### Special Handling

**Templater Syntax:**

- Preserved during YAML processing
- Not evaluated as YAML
- Example: `<% tp.file.title %>` stays as-is

**People Tagging:**

- Uses configured name mappings
- Consistent format across notes
- Handles special characters

---

## File Naming Convention

Notes use a natural file naming convention that preserves readability.

### Naming Rules

**Preserves:**

- ✅ Spaces between words
- ✅ Most punctuation and symbols
- ✅ Numbers and dates
- ✅ Parentheses and hyphens

**Removes:**

- ❌ Square brackets `[]`
- ❌ Colons `:`
- ❌ Semicolons `;`

### Examples

```
Input: "My Note Title"
Output: "My Note Title.md"

Input: "Book Review - The 48 Laws of Power"
Output: "Book Review - The 48 Laws of Power.md"

Input: "Meeting Notes (Q1 2024)"
Output: "Meeting Notes (Q1 2024).md"

Input: "What's Next? Planning for 2025!"
Output: "What's Next? Planning for 2025!.md"

Input: "Project [Alpha]: Status Update"
Output: "Project Alpha Status Update.md"
```

### Why This Matters

- **Readability**: Easy to find and identify notes
- **Natural**: Matches how you think about notes
- **Obsidian-compatible**: Works with Obsidian's restrictions
- **Cross-platform**: Compatible with all operating systems

---

## Folder Structure

The server understands and respects the PARA method organization.

### PARA Structure

```
YourVault/
├── 00 - Meta/
│   ├── Templates/
│   ├── Attachments/
│   └── MOCs/
├── 05 - Fleeting Notes/
├── 10 - Projects/
├── 20 - Areas/
│   ├── Personal/
│   │   └── Journals/
│   │       └── Daily/
│   ├── Relationships/
│   └── Health/
├── 30 - Resources/
│   ├── Restaurants/
│   ├── Reading/
│   └── Tools/
└── 40 - Archives/
```

### Folder Purposes

**00 - Meta**: System files, templates, MOCs

- Templates for note creation
- Attachments and media
- Maps of Content (MOCs)

**05 - Fleeting Notes**: Quick captures

- Temporary thoughts
- Ideas to process later
- Inbox items

**10 - Projects**: Active work

- Current projects with deadlines
- Goals with specific outcomes
- Time-bound initiatives

**20 - Areas**: Ongoing responsibilities

- Life areas requiring attention
- Continuous activities
- Personal management

**30 - Resources**: Reference materials

- Articles and research
- Contacts and restaurants
- Tools and applications
- General knowledge

**40 - Archives**: Completed items

- Finished projects
- Inactive areas
- Historical reference

### Template Folder Mapping

Templates automatically place notes in appropriate folders:

| Template    | Target Folder                |
|-------------|------------------------------|
| restaurant  | 30 - Resources/Restaurants   |
| article     | 30 - Resources/Reading       |
| person      | 20 - Areas/Relationships     |
| daily       | 20 - Areas/.../Journals/Daily|
| medicine    | 20 - Areas/Health            |
| application | 30 - Resources/Tools         |
| fleeting    | 05 - Fleeting Notes          |
| moc         | 00 - Meta/MOCs               |

---

## Environment Variables

Configure server behavior using environment variables.

### Available Variables

```bash
# Web Interface
ENABLE_WEB_INTERFACE=false  # Disable for MCP usage (recommended)
WEB_PORT=19831              # Custom web server port

# Analytics
DISABLE_USAGE_ANALYTICS=true     # Disable analytics tracking
ANALYTICS_DASHBOARD_PORT=19832   # Custom dashboard port

# Vault Configuration (overrides config.ts)
LIFEOS_VAULT_PATH=/path/to/vault          # Override vault path
LIFEOS_TEMPLATES_PATH=/path/to/templates  # Override templates path
LIFEOS_DAILY_NOTES_PATH=/path/to/daily    # Override daily notes path
```

### Setting Variables

**macOS/Linux/WSL2:**

```bash
export ENABLE_WEB_INTERFACE=false
node dist/src/index.js
```

**Claude Desktop Config:**

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["/path/to/dist/src/index.js"],
      "env": {
        "ENABLE_WEB_INTERFACE": "false",
        "DISABLE_USAGE_ANALYTICS": "true"
      }
    }
  }
}
```

### Variable Priority

1. **Environment variables** (highest priority)
2. **config.ts** file
3. **Default values** (lowest priority)

---

## Transaction System Configuration

The transaction system (MCP-108) provides atomic rename operations with Write-Ahead Logging and automatic crash recovery. This section covers configuration options for the WAL directory and recovery behavior.

### WAL Directory

**Default Location:**

```
~/.config/mcp-lifeos/wal/
```

**Purpose:**

- Stores Write-Ahead Log (WAL) entries for atomic transactions
- External to vault (avoids iCloud/Dropbox sync conflicts)
- XDG Base Directory specification compliant
- Enables crash recovery and transaction rollback

**Directory Structure:**

```
~/.config/mcp-lifeos/wal/
├── README.md                                              # Auto-generated documentation
├── 2024-11-02T10-30-15-123Z-rename-550e8400.wal.json     # WAL entry
├── 2024-11-02T10-35-42-789Z-rename-7a3bc912.wal.json     # WAL entry
└── .recovery.lock                                          # Boot recovery lock (temporary)
```

**Custom Location** (not currently supported):

The WAL directory location is hardcoded to `~/.config/mcp-lifeos/wal/`. Future versions may support custom locations via environment variable.

### Boot Recovery Settings

Boot recovery automatically detects and recovers orphaned transactions on server startup.

**Recovery Behavior:**

- **Age Threshold**: 1 minute (WALs younger than 1 minute are skipped to avoid interfering with active transactions)
- **Time Budget**: 5 seconds (recovery process enforces 5-second time budget to prevent startup delays)
- **Graceful Degradation**: Server continues startup regardless of recovery outcome
- **Lock File**: `.recovery.lock` prevents concurrent recovery attempts

**Recovery Logging:**

Server logs recovery results with status symbols:

- ✅ **Success**: Transaction fully recovered, WAL deleted
- ⚠️ **Partial**: Some operations succeeded, some failed, WAL preserved
- ❌ **Failed**: Recovery failed completely, WAL preserved for manual intervention
- ⏭️ **Skipped**: Lock conflict or WAL too recent (< 1 minute)

**Example Boot Logs:**

```
Found 3 orphaned transaction(s), attempting recovery...
✅ Recovered transaction 550e8400-e29b-41d4-a716-446655440000
⚠️  Partial recovery for 7a3bc912-f456-78ab-cdef-123456789012 - manual intervention needed
   WAL preserved: /Users/name/.config/mcp-lifeos/wal/2024-11-02-rename-7a3bc912.wal.json
```

### Performance Tuning

**Transaction Overhead:**

- **Expected**: 2-8x baseline (100-400ms vs 50ms for simple rename)
- **Phase Timing**: Plan (5-10ms), Prepare (50-200ms), Validate (20-100ms), Commit (10-50ms/file), Cleanup (10-30ms)

**Scalability Limits:**

- **Maximum Affected Files**: ~1000 files before memory pressure
- **Recommended**: <100 affected files per transaction for optimal performance
- **WAL Size**: ~1KB metadata + ~100 bytes per affected file

**Optimization Tips:**

1. **Set `updateLinks: false`** for performance-critical renames (manual link cleanup):

   ```json
   {
     "oldPath": "note.md",
     "newPath": "renamed.md",
     "updateLinks": false
   }
   ```

2. **Use dry-run mode** to validate operations before execution:

   ```json
   {
     "oldPath": "note.md",
     "newPath": "renamed.md",
     "dryRun": true
   }
   ```

3. **Pause sync services** during bulk rename operations to prevent `TRANSACTION_STALE_CONTENT` errors

### Maintenance

**WAL Directory Cleanup:**

WAL entries are automatically deleted after successful transactions. Orphaned WAL files indicate:

1. **Server crash** during transaction (boot recovery will handle)
2. **Recovery failure** (requires manual intervention)

**Manual Cleanup** (if needed):

```bash
# Check for orphaned WALs (should be empty or minimal)
ls -lh ~/.config/mcp-lifeos/wal/*.wal.json

# Delete WAL after manual recovery verification
rm ~/.config/mcp-lifeos/wal/2024-11-02-rename-550e8400.wal.json
```

**Monitoring:**

```bash
# Alert script for orphaned WALs (> 5 minutes old)
find ~/.config/mcp-lifeos/wal/ -name "*.wal.json" -mmin +5 | while read wal; do
  echo "ALERT: Orphaned WAL detected: $wal"
done
```

**Backup Recommendations:**

Include WAL directory in backups:

- Primary: Vault directory (main data)
- Secondary: `~/.config/mcp-lifeos/wal/` (transaction logs)
- Exclude: `.mcp-staged-*` temp files (ephemeral)

### Disk Space Requirements

**Minimum Free Space:**

- Keep >500MB free during rename operations
- WAL entries are small (~1KB each) but temp files consume space
- Temp files cleaned up automatically on success

**Disk Full Handling:**

Transactions fail gracefully with `TRANSACTION_PREPARE_FAILED` or `TRANSACTION_COMMIT_FAILED` errors. Automatic rollback restores vault state.

### Related Configuration

**Environment Variables** (future consideration):

```bash
# Not currently supported - for future reference
# WAL_DIRECTORY=/custom/path/to/wal/
# RECOVERY_TIME_BUDGET=5000  # milliseconds
# RECOVERY_AGE_THRESHOLD=60  # seconds
```

**Dry-Run Configuration:**

No configuration needed - controlled per-operation via `dryRun: true` parameter.

### Related Documentation

- **[Transaction System Guide](TRANSACTION-SYSTEM.md)** - Complete architecture and error codes
- **[WAL Recovery Guide](WAL-RECOVERY.md)** - Manual recovery procedures
- **[Troubleshooting Guide](TROUBLESHOOTING.md#transaction-errors)** - Transaction error troubleshooting

---

## Validation

Validate your configuration before deployment:

```bash
# Type check configuration
npm run typecheck

# Test server startup
node dist/src/index.js

# Verify vault access
# Server should log successful vault connection
```

### Common Validation Issues

**Path errors:**

- Use absolute paths, not relative
- Ensure paths exist on filesystem
- Check permissions (read/write access)

**YAML errors:**

- Validate YAML syntax in templates
- Check frontmatter format
- Test with sample notes

**Template errors:**

- Verify templates folder exists
- Ensure templates have .md extension
- Check Templater syntax

---

For more information:

- [Tools API Reference](../api/TOOLS.md) - Complete tool documentation
- [Templates Guide](TEMPLATES.md) - Template configuration
- [Integrations Guide](INTEGRATIONS.md) - Client integration setup
- [Deployment Guide](DEPLOYMENT-GUIDE.md) - Complete setup
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues
