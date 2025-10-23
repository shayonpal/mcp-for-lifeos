# Configuration Guide

Complete guide for configuring the LifeOS MCP server for your Obsidian vault.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Configuration File](#configuration-file)
3. [YAML Compliance](#yaml-compliance)
4. [File Naming Convention](#file-naming-convention)
5. [Folder Structure](#folder-structure)
6. [Environment Variables](#environment-variables)

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

**macOS/Linux:**

```bash
export ENABLE_WEB_INTERFACE=false
node dist/src/index.js
```

**Windows:**

```cmd
set ENABLE_WEB_INTERFACE=false
node dist\src\index.js
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
