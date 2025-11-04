# List Tool Documentation

## Overview

**Tool Name**: `list`  
**Purpose**: Universal listing tool that consolidates folders, daily notes, templates, and YAML properties listing with auto-detection  
**Status**: ✅ Active (Primary tool for all listing operations)

The `list` tool is the primary interface for all listing operations in the LifeOS MCP server. It intelligently routes listing requests to the most appropriate handler while providing a unified, simplified interface for AI tool callers.

> **TL;DR**: One tool to list anything in your vault - folders, daily notes, templates, or YAML properties. Set `type='auto'` to let it figure out what you want based on other parameters, or explicitly specify `'folders'`, `'daily_notes'`, `'templates'`, or `'yaml_properties'`. Replaces 4 legacy listing tools with intelligent auto-routing.

## Key Features

- **Intelligent Auto-Detection**: Automatically determines what to list based on provided parameters
- **Unified Interface**: Consolidates 4 legacy listing tools into one comprehensive tool
- **Direct Type Mapping**: Explicit control through type specification
- **Type-Specific Parameters**: Each list type supports its specific options
- **Consistent Response Formats**: Standardized output across all list types
- **PARA Method Support**: Folder listing respects PARA methodology organization
- **Template Discovery**: Real-time template scanning with metadata
- **YAML Analytics**: Property usage statistics and analysis

## Parameters

The `list` tool accepts parameters through the `UniversalListOptions` interface:

### Core Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | ✅ Yes | List type: `'auto'`, `'folders'`, `'daily_notes'`, `'templates'`, `'yaml_properties'` |

### Type-Specific Parameters

| Parameter | Type | Used By | Description |
|-----------|------|---------|-------------|
| `path` | string | folders | Folder path to list (relative to vault root) |
| `limit` | number | daily_notes | Maximum number of daily notes to return |
| `includeCount` | boolean | yaml_properties | Include usage count for each property |
| `sortBy` | string | yaml_properties | Sort method for properties |
| `excludeStandard` | boolean | yaml_properties | Exclude standard LifeOS properties |
| `format` | `'concise'` \| `'detailed'` | All types | Response format for context window optimization (default: `'detailed'`) |

### Response Format Options

The `format` parameter controls the level of detail in list results to optimize AI context window usage:

**`'detailed'` (default)**:

- Full metadata for templates (description, path, target folder, content type)
- Property usage counts for YAML properties
- Formatted presentation with emoji and descriptions
- Current behavior (backward compatible)

**`'concise'`**:

- Minimal data optimized for token budget
- Templates: Key + name only (~60-70% reduction)
- YAML properties: Property names array (vs object with counts)
- Folders/daily_notes: Already minimal (no change)

**Example - Templates (concise)**:

```
**tpl-restaurant**: Restaurant Template
**tpl-recipe**: Recipe Template
**tpl-meeting**: Meeting Notes Template
```

**Example - Templates (detailed)**:

```
**tpl-restaurant**: Restaurant Template
  Template for documenting restaurant experiences
  Path: `templates/tpl-restaurant.md`
  Target: 30 - Resources/Restaurants
  Content Type: Restaurant

**tpl-recipe**: Recipe Template
  Template for capturing cooking recipes
  Path: `templates/tpl-recipe.md`
  Target: 30 - Resources/Recipes
  Content Type: Recipe
```

**Example - YAML Properties (concise)**:

```
title
author
tags
date
status
```

**Example - YAML Properties (detailed)**:

```
**title**: 1,234 notes
**author**: 856 notes
**tags**: 2,103 notes
**date**: 1,456 notes
**status**: 789 notes
```

## List Types and Auto-Detection

### folders

**Purpose**: Lists vault folder structure  
**Auto-Detection**: Triggered when `path` parameter is provided  
**Returns**: Array of folder names (strings)

Lists directories in the Obsidian vault, organized according to PARA methodology. Supports both root-level listing and specific folder traversal.

```javascript
// List all root folders
{ type: "folders" }

// List contents of specific folder
{ type: "folders", path: "areas/health" }
```

### daily_notes

**Purpose**: Lists daily journal notes  
**Auto-Detection**: Triggered when `limit` parameter is provided  
**Returns**: Array of daily note filenames (strings)

Lists daily notes from the configured daily notes folder, sorted chronologically with the most recent notes first.

```javascript
// List last 10 daily notes
{ type: "daily_notes", limit: 10 }

// List last 5 daily notes
{ type: "daily_notes", limit: 5 }
```

### templates

**Purpose**: Lists available note templates  
**Auto-Detection**: No specific trigger (use explicit type)  
**Returns**: Array of TemplateInfo objects

Discovers and lists all available Obsidian templates with their metadata, including template keys, names, descriptions, and target folders.

```javascript
// List all templates
{ type: "templates" }
```

### yaml_properties

**Purpose**: Lists all YAML frontmatter properties across the vault  
**Auto-Detection**: Triggered when `includeCount` parameter is provided  
**Returns**: Object with property names and optional usage counts

Analyzes all notes in the vault to extract unique YAML frontmatter properties, with optional usage statistics.

```javascript
// List properties with usage counts
{ type: "yaml_properties", includeCount: true }

// List properties excluding standard ones
{ type: "yaml_properties", excludeStandard: true }
```

### auto

**Purpose**: Intelligent type detection based on parameters  
**Auto-Detection Logic**:

1. If `path` is provided → `folders`
2. If `limit` is provided → `daily_notes`  
3. If `includeCount` is provided → `yaml_properties`
4. Default fallback → `folders`

```javascript
// Auto-detects as folders
{ type: "auto", path: "projects" }

// Auto-detects as daily_notes
{ type: "auto", limit: 7 }

// Auto-detects as yaml_properties
{ type: "auto", includeCount: true }
```

## Usage Examples

### List All Root Folders

```javascript
// Explicit type specification
{
  type: "folders"
}

// Auto-detection (default behavior)
{
  type: "auto"
}
```

**Expected Response**:

```json
[
  "areas",
  "projects", 
  "resources",
  "archives",
  "daily-notes",
  "templates"
]
```

### List Specific Folder Contents

```javascript
// List contents of areas folder
{
  type: "folders",
  path: "areas"
}

// Auto-detection based on path parameter
{
  type: "auto",
  path: "projects/active"
}
```

**Expected Response**:

```json
[
  "health",
  "finance", 
  "relationships",
  "skills"
]
```

### List Recent Daily Notes

```javascript
// List last 5 daily notes
{
  type: "daily_notes",
  limit: 5
}

// Auto-detection based on limit parameter
{
  type: "auto",
  limit: 10
}
```

**Expected Response**:

```json
[
  "2024-12-29.md",
  "2024-12-28.md", 
  "2024-12-27.md",
  "2024-12-26.md",
  "2024-12-25.md"
]
```

### List All Available Templates

```javascript
// List all templates with metadata
{
  type: "templates"
}
```

**Expected Response**:

```json
[
  {
    "key": "person",
    "name": "Person",
    "description": "Template for person/contact notes",
    "path": "/templates/person.md",
    "contentType": "person",
    "targetFolder": "people"
  },
  {
    "key": "restaurant", 
    "name": "Restaurant",
    "description": "Template for restaurant reviews",
    "path": "/templates/restaurant.md",
    "contentType": "restaurant",
    "targetFolder": "places/restaurants"
  }
]
```

### List YAML Properties with Usage Counts

```javascript
// Get property usage statistics
{
  type: "yaml_properties",
  includeCount: true
}

// Auto-detection based on includeCount parameter
{
  type: "auto", 
  includeCount: true
}
```

**Expected Response**:

```json
{
  "title": 1247,
  "content type": 856,
  "tags": 634,
  "created": 1247,
  "modified": 1247,
  "category": 423,
  "rating": 156,
  "people": 89,
  "location": 67
}
```

### List Properties Excluding Standard Ones

```javascript
// Exclude standard LifeOS properties
{
  type: "yaml_properties",
  includeCount: true,
  excludeStandard: true
}
```

**Expected Response**:

```json
{
  "rating": 156,
  "cuisine": 78,
  "visited": 45,
  "price_range": 34,
  "atmosphere": 29
}
```

## Migration from Legacy Tools

The `list` tool replaces all legacy listing tools. Here's the complete migration guide:

| Legacy Tool | New Usage | Migration |
|-------------|-----------|-----------|
| `list_folders` | `list` with `type="folders"` | Direct parameter mapping |
| `list_daily_notes` | `list` with `type="daily_notes"` | Direct parameter mapping |
| `list_templates` | `list` with `type="templates"` | Direct parameter mapping |
| `list_yaml_properties` | `list` with `type="yaml_properties"` | Direct parameter mapping |

### Migration Examples

```javascript
// OLD: list_folders()
// NEW: 
{ type: "folders" }

// OLD: list_folders({ path: "areas" })
// NEW:
{ type: "folders", path: "areas" }

// OLD: list_daily_notes({ limit: 7 })
// NEW:
{ type: "daily_notes", limit: 7 }

// OLD: list_templates()
// NEW:
{ type: "templates" }

// OLD: list_yaml_properties({ includeCount: true })
// NEW:
{ type: "yaml_properties", includeCount: true }

// OLD: list_yaml_properties({ excludeStandard: true })
// NEW:
{ type: "yaml_properties", excludeStandard: true }
```

## Response Formats

### Folders Response

**Type**: `string[]`  
**Format**: Array of folder names

```json
[
  "areas",
  "projects", 
  "resources",
  "archives"
]
```

### Daily Notes Response  

**Type**: `string[]`  
**Format**: Array of filenames sorted chronologically (newest first)

```json
[
  "2024-12-29.md",
  "2024-12-28.md",
  "2024-12-27.md"
]
```

### Templates Response

**Type**: `TemplateInfo[]`  
**Format**: Array of template objects with metadata

```typescript
interface TemplateInfo {
  key: string;           // Template identifier
  name: string;          // Display name
  description: string;   // Template description
  path: string;          // File path to template
  contentType?: string;  // Associated content type
  targetFolder?: string; // Default folder for notes created from this template
}
```

### YAML Properties Response

**Type**: `Record<string, number>` or `Record<string, boolean>`  
**Format**: Object mapping property names to usage counts (if includeCount=true) or boolean flags

```json
// With includeCount: true
{
  "title": 1247,
  "content type": 856,
  "tags": 634
}

// With includeCount: false (or undefined)
{
  "title": true,
  "content type": true,
  "tags": true
}
```

## Routing Behavior

### Direct Mapping Strategy

The list tool uses a **direct mapping strategy** with 1.0 confidence for all explicit type specifications:

- `type: "folders"` → `listFolders()`
- `type: "daily_notes"` → `listDailyNotes()`
- `type: "templates"` → `DynamicTemplateEngine.getAllTemplates()`
- `type: "yaml_properties"` → `getAllYamlProperties()` from files module

### Auto-Detection Algorithm

For `type: "auto"`, the system applies this detection logic:

1. **Path Parameter Check**: `options.path !== undefined` → folders
2. **Limit Parameter Check**: `options.limit !== undefined` → daily_notes
3. **Include Count Check**: `options.includeCount !== undefined` → yaml_properties
4. **Default Fallback**: No specific parameters → folders

### Confidence Scoring

- **Explicit Types**: Always 1.0 confidence
- **Auto-Detection**: 1.0 confidence (deterministic routing)
- **Fallback**: 1.0 confidence (clear default behavior)

## Implementation Details

### Handler Location

- **Main Router**: `ToolRouter.routeList()` in `src/tool-router.ts`
- **Execution**: `ToolRouter.executeList()`
- **Individual Handlers**:
  - Folders: `ToolRouter.listFolders()`
  - Daily Notes: `ToolRouter.listDailyNotes()`
  - Templates: `DynamicTemplateEngine.getAllTemplates()`
  - YAML Properties: `getAllYamlProperties()` from files module

### Data Sources

- **Folders**: File system directory traversal
- **Daily Notes**: Configured daily notes directory (`LIFEOS_CONFIG.dailyNotesPath`)
- **Templates**: Template scanning and caching system
- **YAML Properties**: Vault-wide frontmatter analysis

### Caching Strategy

- **Templates**: 24-hour cache for performance optimization
- **YAML Properties**: Real-time analysis (no caching for accuracy)
- **Folders & Daily Notes**: No caching (real-time file system reads)

## Error Handling

The list tool provides graceful error handling for various scenarios:

### Common Error Scenarios

| Error Type | Cause | Behavior |
|------------|--------|----------|
| Invalid Type | Unknown `type` parameter | Throws descriptive error |
| Path Not Found | Invalid folder path | Returns empty array |
| Permission Denied | File system access issues | Throws access error |
| Template Scan Failure | Template directory issues | Returns empty array |
| YAML Parse Errors | Malformed frontmatter | Skips problematic files |

### Error Response Format

```json
{
  "error": "List routing failed: Unknown list type: invalid_type",
  "type": "INVALID_PARAMETER", 
  "code": "LIST_TYPE_UNKNOWN"
}
```

## Best Practices

### For AI Tool Callers

1. **Use Explicit Types**: Prefer specific types over auto-detection for clarity
2. **Check Empty Results**: Handle cases where folders/notes may not exist
3. **Parameter Validation**: Ensure path parameters are valid before calling
4. **Template Availability**: Check template list before attempting note creation
5. **Property Discovery**: Use YAML properties listing to understand vault structure

```javascript
// Good: Explicit and clear
{ type: "folders", path: "projects/active" }

// Avoid: Ambiguous auto-detection
{ type: "auto" }
```

### For Developers

1. **Path Sanitization**: Validate folder paths to prevent directory traversal
2. **Result Limiting**: Consider implementing limits for large vaults  
3. **Error Boundaries**: Wrap list operations in try-catch blocks
4. **Cache Awareness**: Understand which results are cached vs. real-time
5. **Performance Monitoring**: Track execution times for large folder structures

### Performance Considerations

- **Large Vaults**: Consider pagination for folders with many subdirectories
- **Template Caching**: Templates are cached for 24 hours for performance
- **YAML Analysis**: Property listing scans entire vault (can be slow for large vaults)
- **Daily Notes**: Limited by configured daily notes folder size

## Related Documentation

- [Tool Router Implementation](../../src/tool-router.ts) - Routing logic and execution
- [Template Engine](../../src/template-engine-dynamic.ts) - Template discovery system
- [File Operations](../../src/modules/files/index.ts) - File system operations and YAML analysis
- [MCP Tools Overview](README.md) - Complete tool inventory
- [Search Tool](search.md) - Primary search functionality

## Analytics and Monitoring

The list tool automatically tracks usage analytics when enabled:

- **Routing Decisions**: Which list type was selected and detection method
- **Performance Metrics**: Execution times for different list types
- **Usage Patterns**: Most frequently requested list types
- **Client Information**: Tool caller identification for optimization

Access analytics via the analytics dashboard when `TOOL_ROUTER_TELEMETRY=true` or through server logs.

### Analytics Data Points

```json
{
  "toolName": "universal_list",
  "listType": "folders|daily_notes|templates|yaml_properties", 
  "routingStrategy": "direct-mapping|auto-detection",
  "executionTime": 45,
  "resultCount": 12,
  "clientName": "claude-desktop",
  "sessionId": "session-123"
}
```

## Troubleshooting

### Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Empty folder list | Returns `[]` for existing path | Check path syntax and permissions |
| No daily notes | Returns `[]` despite existing notes | Verify `LIFEOS_CONFIG.dailyNotesPath` |
| Missing templates | Returns `[]` despite template files | Check template directory and file format |
| No YAML properties | Returns `{}` despite frontmatter | Verify YAML syntax in note files |

### Debug Commands

```javascript
// Test folder listing
{ type: "folders", path: "" }  // List root folders

// Check daily notes configuration
{ type: "daily_notes", limit: 1 }  // Should return at least one note

// Verify template discovery
{ type: "templates" }  // Should return available templates

// Analyze YAML structure
{ type: "yaml_properties", includeCount: true }  // Property usage stats
```

### Logging

Enable detailed logging for debugging:

```bash
# Enable router telemetry
export TOOL_ROUTER_TELEMETRY=true

# Start server with verbose logging
node dist/index.js
```

This will provide detailed routing decisions and execution metrics for troubleshooting list operations.
