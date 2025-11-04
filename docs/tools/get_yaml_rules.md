# get_yaml_rules

**Status**: Active (Configuration reference tool)  
**Purpose**: Get the user's YAML frontmatter rules document for reference when creating or editing note YAML  
**Category**: Configuration Management  

## TL;DR

Returns your YAML frontmatter rules document that defines required fields, allowed values, and validation rules. Essential reference before modifying frontmatter. Returns nothing if not configured.

## Tool Overview

The `get_yaml_rules` tool is a simple configuration reference tool that retrieves the user's YAML frontmatter rules document. This document serves as the authoritative guide for:

- Required YAML fields for notes
- Allowed values for specific properties
- Auto-managed fields that shouldn't be modified
- Data type specifications
- Validation rules and constraints
- Example frontmatter blocks

## Key Features

- **No parameters required** - Simple getter with no configuration
- **Returns complete rules document** - Full markdown document with all rules
- **Validates rules file existence** - Checks accessibility before reading
- **Provides configuration status** - Clear messages when not configured
- **Used by other tools for compliance** - Internal reference for validation
- **Caching with file watching** - Auto-reload when rules change
- **Error handling** - Graceful failure with helpful messages

## Parameters

**None** - This tool takes no parameters and returns the complete rules document.

```json
{
  "name": "get_yaml_rules",
  "arguments": {}
}
```

## Configuration Requirements

### Setup Prerequisites

- **yamlRulesPath** must be configured in the MCP server config
- Points to a markdown file containing the YAML rules
- File must be accessible from the vault directory
- Standard location: `obsidian/YAML-frontmatter-rules.md`

### Configuration Example

```json
{
  "vaultPath": "/path/to/vault",
  "yamlRulesPath": "/path/to/vault/obsidian/YAML-frontmatter-rules.md"
}
```

## Response Types

### ✅ Configured and Available

Returns the complete rules document with a header:

```
# YAML Frontmatter Rules

[Complete content of the rules document]
```

### ⚠️ Not Configured

```
YAML rules are not configured. Set the yamlRulesPath in your config to enable this feature.
```

### ❌ File Not Found

```
YAML rules file not found or not accessible at: /path/to/rules.md
```

### ❌ Read Error

```
Error reading YAML rules: [specific error message]
```

## YAML Rules Document Structure

A typical YAML rules document includes:

### Field Definitions

```markdown
## Required Fields

### title
- **Type**: String
- **Required**: Yes
- **Description**: Note title

### contentType
- **Type**: String (enum)
- **Required**: Yes
- **Allowed Values**: journal, project, task, meeting, reference
```

### Auto-Managed Fields

```markdown
## Auto-Managed Fields (DO NOT MODIFY)

### created
- **Type**: ISO Date String
- **Managed**: Automatically set on creation
- **Example**: "2025-01-15T10:30:00Z"

### modified
- **Type**: ISO Date String
- **Managed**: Auto-updated on changes

### id
- **Type**: String
- **Managed**: Unique identifier
```

### Validation Rules

```markdown
## Validation Rules

- All dates must be in ISO 8601 format
- Tags must be lowercase, hyphen-separated
- URLs must be valid and accessible
- Required fields cannot be empty or null
```

### Example Frontmatter

```yaml
---
title: "Meeting with Engineering Team"
contentType: "meeting"
tags: ["team-sync", "engineering", "weekly"]
people: ["john-doe", "jane-smith"]
source: "https://calendar.company.com/meeting/123"
category: "work"
subCategory: "meetings"
created: "2025-01-15T10:30:00Z"
modified: "2025-01-15T10:30:00Z"
id: "meeting-eng-team-20250115"
---
```

## Usage Examples

### Check Rules Before Creating Note

```javascript
// 1. Get current rules
const rules = await get_yaml_rules();

// 2. Review required fields and constraints
// 3. Create note with compliant frontmatter
```

### Verify Field Requirements

Use before editing existing notes to understand:

- Which fields are required
- What values are allowed
- Which fields are auto-managed

### Understand Allowed Values

For enum fields like `contentType`, check what values are permitted:

- journal, project, task, meeting, reference
- Prevents validation errors during note creation

## Integration with Other Tools

### create_note

- Consults rules for YAML validation
- Ensures required fields are present
- Validates enum values and data types

### edit_note

- Preserves auto-managed fields
- Validates new YAML against rules
- Prevents rule violations during edits

### create_note_smart

- Uses rules for template compliance
- Validates template-generated YAML
- Ensures consistent frontmatter structure

### YamlRulesManager (Internal)

- Caches rules for performance
- Validates rule file accessibility
- Provides instruction text for other tools

## Auto-Managed Fields

**Critical**: These fields are automatically managed and should NEVER be manually modified:

### created

- **Purpose**: Records note creation timestamp
- **Format**: ISO 8601 date-time string
- **Managed**: Set once during creation
- **Example**: `"2025-01-15T10:30:00Z"`

### modified

- **Purpose**: Tracks last modification time
- **Format**: ISO 8601 date-time string  
- **Managed**: Updated on every change
- **Behavior**: Automatically updated by tools

### id

- **Purpose**: Unique identifier for the note
- **Format**: String (often slug-based)
- **Managed**: Generated during creation
- **Usage**: Internal references and linking

## Common Rules Examples

### Required Fields

```yaml
title: string (required)
contentType: enum (required) - journal|project|task|meeting|reference
```

### Optional Standard Fields

```yaml
tags: array of strings
people: array of strings (person references)
source: string (URL)
category: string
subCategory: string
```

### Array Fields

```yaml
tags: ["tag1", "tag2", "tag3"]
people: ["person-1", "person-2"]
```

### Date Fields

```yaml
dueDate: "2025-01-20T00:00:00Z"
startDate: "2025-01-15T09:00:00Z"
```

### URL Fields

```yaml
source: "https://example.com/article"
reference: "https://docs.company.com/guidelines"
```

## Implementation Details

### Manager Class

- **Class**: `YamlRulesManager`
- **File**: `src/yaml-rules-manager.ts`
- **Caching**: In-memory with file modification tracking
- **Validation**: `validateRulesFile()` method

### File Watching

- Monitors rule file modification time
- Auto-reloads when file changes
- Maintains cache for performance

### Error Handling

- Configuration validation
- File accessibility checks
- Graceful failure with helpful messages
- Clear error reporting

## Best Practices

### Before Note Operations

1. **Always check rules first** when creating/editing notes
2. **Cache response for session** to avoid repeated calls
3. **Respect auto-managed fields** - never modify them
4. **Use for field discovery** to understand schema

### During Development

1. **Reference for validation** when building tools
2. **Test with different configurations** (configured/unconfigured)
3. **Handle all response types** gracefully
4. **Update rules as schema evolves**

### For Users

1. **Keep rules updated** as workflow changes
2. **Document new fields** when adding them
3. **Include examples** for complex structures
4. **Version control rules file** for history

## Error Scenarios

### Configuration Issues

#### yamlRulesPath Not Set

```
YAML rules are not configured. Set the yamlRulesPath in your config to enable this feature.
```

**Resolution**: Configure `yamlRulesPath` in MCP server config

#### Rules File Missing

```
YAML rules file not found or not accessible at: /path/to/rules.md
```

**Resolution**: Create rules file at specified path or update path

### File Access Issues

#### Permission Error

```
Error reading YAML rules: EACCES: permission denied
```

**Resolution**: Check file permissions and vault access

#### Invalid File Path

```
Error reading YAML rules: ENOENT: no such file or directory
```

**Resolution**: Verify file exists and path is correct

## Configuration Setup

### Step 1: Create Rules Document

Create a markdown file (typically `obsidian/YAML-frontmatter-rules.md`) with your YAML schema:

```markdown
# YAML Frontmatter Rules

## Required Fields
- title: String, note title
- contentType: Enum (journal|project|task|meeting|reference)

## Auto-Managed Fields
- created: ISO date (auto-set)
- modified: ISO date (auto-updated)
- id: String (auto-generated)

## Example
```yaml
---
title: "My Note"
contentType: "journal"
tags: ["personal", "daily"]
created: "2025-01-15T10:30:00Z"
modified: "2025-01-15T10:30:00Z"
id: "my-note-20250115"
---
```

### Step 2: Configure MCP Server

Add to your MCP server configuration:

```json
{
  "vaultPath": "/path/to/vault",
  "yamlRulesPath": "/path/to/vault/obsidian/YAML-frontmatter-rules.md"
}
```

### Step 3: Test Configuration

```javascript
const result = await get_yaml_rules();
// Should return your complete rules document
```

## Standard LifeOS Rules Template

```markdown
# YAML Frontmatter Rules

## Required Fields

### title
- **Type**: String
- **Required**: Yes
- **Description**: Human-readable note title

### contentType  
- **Type**: String (enum)
- **Required**: Yes
- **Values**: journal, project, task, meeting, reference, template
- **Description**: Categorizes the note's purpose

## Optional Standard Fields

### tags
- **Type**: Array of strings
- **Format**: lowercase, hyphen-separated
- **Example**: ["daily-notes", "work-planning"]

### people
- **Type**: Array of strings
- **Format**: References to person notes
- **Example**: ["john-smith", "jane-doe"]

### category / subCategory
- **Type**: String
- **Description**: Hierarchical categorization
- **Example**: category="work", subCategory="meetings"

### source
- **Type**: String (URL)
- **Description**: Reference link or source material
- **Validation**: Must be valid URL if provided

## Auto-Managed Fields (DO NOT EDIT)

### created
- **Type**: ISO 8601 date string
- **Managed**: Set automatically on creation
- **Format**: "YYYY-MM-DDTHH:mm:ssZ"

### modified
- **Type**: ISO 8601 date string  
- **Managed**: Updated automatically on changes
- **Format**: "YYYY-MM-DDTHH:mm:ssZ"

### id
- **Type**: String
- **Managed**: Unique identifier, auto-generated
- **Format**: Typically slug-based with timestamp

## Example Frontmatter

```yaml
---
title: "Weekly Team Sync"
contentType: "meeting"
category: "work"
subCategory: "team-meetings"
tags: ["weekly-sync", "engineering", "planning"]
people: ["alice-johnson", "bob-smith"]
source: "https://calendar.company.com/meeting/456"
created: "2025-01-15T10:30:00Z"
modified: "2025-01-15T10:30:00Z"
id: "weekly-team-sync-20250115"
---
```

```

## Related Tools

### Primary Integration
- **`create_note`**: Validates new notes against rules
- **`edit_note`**: Ensures edits comply with rules  
- **`create_note_smart`**: Template compliance validation

### Discovery Tools
- **`list` with type='yaml_properties'**: Discover existing YAML properties in vault
- **`list_yaml_property_values`**: See actual property usage patterns
- **`diagnose_vault`**: Check for YAML compliance issues

### Information Tools
- **`get_server_version`**: Check MCP server capabilities
- **`read_note`**: View existing YAML frontmatter examples

## Version History

- **v0.8.0**: Initial implementation with caching
- **v0.8.1**: Added file watching and validation
- **v0.8.2**: Enhanced error handling and messaging
- **Current**: Stable with comprehensive validation

## Troubleshooting

### Tool Returns "Not Configured"
1. Check MCP server config has `yamlRulesPath`
2. Verify path points to existing file
3. Restart MCP server after config changes

### File Not Found Errors  
1. Verify file exists at specified path
2. Check file permissions (readable)
3. Ensure path is absolute, not relative

### Empty or Invalid Response
1. Check file contains valid markdown content
2. Verify no file corruption or encoding issues
3. Test file access manually

### Performance Issues
1. Rules are cached - first call may be slower
2. File watching enables auto-reload
3. Consider file size if rules document is very large

This tool serves as the foundation for YAML compliance across the entire LifeOS MCP server ecosystem. Always consult it before modifying note frontmatter to ensure consistency and prevent validation errors.
