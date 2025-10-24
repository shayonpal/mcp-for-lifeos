# LifeOS MCP Tools - Complete API Reference

**Last updated:** 2025-10-24 00:23

This document provides complete documentation for all tools available in the LifeOS MCP server.

## Table of Contents

0. [Tool Visibility Modes](#tool-visibility-modes)
1. [Recommended: Consolidated Tools](#recommended-consolidated-tools)
2. [Core Operations](#core-operations)
3. [Utility Tools](#utility-tools)
4. [Search Tools](#search-tools)
5. [YAML Property Management](#yaml-property-management)

---

## Tool Visibility Modes

The LifeOS MCP server supports three tool visibility modes controlled by the `TOOL_MODE` environment variable. This allows you to customize which tools appear in your MCP client without code changes.

### Available Modes

**`consolidated-only` (Default - 12 tools)**
- Modern consolidated tools: `search`, `create_note`, `list`
- Always-available tools: `get_server_version`, `get_yaml_rules`, `read_note`, `edit_note`, `get_daily_note`, `diagnose_vault`, `move_items`, `insert_content`, `list_yaml_property_values`
- Recommended for most users
- Cleaner interface, easier navigation

**`legacy-only` (20 tools)**
- All original legacy tools without consolidated versions
- Useful for backward compatibility testing
- Legacy search tools, creation tools, and listing tools

**`consolidated-with-aliases` (34 tools)**
- Both consolidated AND legacy tools visible
- Maximum compatibility mode
- Shows all 12 consolidated-only tools + 22 additional legacy tools

### Configuration

```bash
# Default mode (no configuration needed)
# (no TOOL_MODE set defaults to consolidated-only)

# Legacy-only mode
TOOL_MODE=legacy-only

# Maximum compatibility mode
TOOL_MODE=consolidated-with-aliases
```

### Tool Name Changes

- **`create_note_smart`** has been renamed to **`create_note`**
- Smart functionality (template auto-detection) is now the default behavior
- Legacy `create_note_smart` name available in `consolidated-with-aliases` mode only

For complete configuration details, see [Configuration Guide](../guides/CONFIGURATION.md#tool-mode-configuration).

For migration guidance and tool mapping, see [ADR-005: Default Tool Mode](../adr/005-default-tool-mode-consolidated-only.md).

---

## Recommended: Consolidated Tools

These unified tools provide intelligent auto-routing and simplified interfaces for common operations.

### `search`

Universal search tool with intelligent auto-routing for all search operations

**Parameters:**

- **mode**: Search strategy - 'auto' (recommended), 'advanced', 'quick', 'content_type', 'recent', 'pattern'
- **query**: Search text across titles, content, and metadata
- **naturalLanguage**: Natural language query (e.g., "Quebec barbecue restaurants")
- **format**: Response format - 'concise' (title+path, ~50-100 tokens/result) or 'detailed' (full metadata, default)
- **maxResults**: Maximum results to return (1-100, default: 25) - Automatic token budget management prevents context overflow
- **All advanced_search parameters supported** - See `advanced_search` documentation below for full parameter list

The `search` tool automatically detects the optimal search strategy based on your query and consolidates 6 legacy search tools into one intelligent interface. Results are automatically truncated to fit within ~25K token budget with helpful suggestions when limits are reached.

### `create_note_smart`

Smart note creation with automatic template detection and YAML compliance

**Note:** This tool has been renamed to `create_note`. The smart functionality is now the default behavior. This alias is available in `consolidated-with-aliases` mode only.

**Parameters:**

- **title** (required): Note title
- **auto_template**: Auto-detect template from title/content (default: true)
- **template**: Explicit template override (restaurant, article, person, etc.)
- **All create_note parameters supported** - See `create_note` documentation below for full parameter list

Automatically detects appropriate templates (e.g., "Pizza Palace" → restaurant template) and handles template processing, YAML validation, and folder placement.

### `list`

Universal listing tool for folders, daily notes, templates, and YAML properties

**Parameters:**

- **type**: Item type - 'folders', 'daily_notes', 'templates', 'yaml_properties', 'auto'
- **path**: Folder path (for folders type)
- **limit**: Number of results (for daily_notes type)
- **format**: Response format - 'concise' (minimal fields) or 'detailed' (full metadata, default)
- **maxResults**: Maximum results to return (1-100, default: 10) - Automatic token budget management prevents context overflow
- **sortBy**, **includeCount**, **excludeStandard**: YAML property options

Consolidates all listing operations into one tool with automatic type detection. Results are automatically truncated to fit within ~25K token budget with helpful suggestions when limits are reached.

---

## Core Operations

### `create_note`

Create a new note with proper YAML frontmatter and optional template integration

**Parameters:**

- **title** (required): Note title
- **content**: Markdown content
- **template**: Template name to use (e.g., tpl-person, tpl-article, etc.)
- **useTemplate**: If true, returns available templates for selection instead of creating note
- **contentType**: Content type (Article, Daily Note, Recipe, etc.)
- **category**: Category classification
- **tags**: Array of tags
- **targetFolder**: Optional target folder
- **source**: Source URL for articles
- **people**: People mentioned in the note
- **customData**: Custom data for template processing

**Template integration features:**

- Automatically discovers templates from your Obsidian templates folder
- Processes Templater syntax (`<% tp.file.title %>`, `<% tp.date.now() %>`)
- Falls back gracefully if templates are missing or unavailable
- Use `useTemplate: true` to list available templates before creating

### `read_note`

Read an existing note

**Parameters:**

- **path** (required): Full path to the note

### `edit_note`

Edit an existing note in the vault

**Parameters:**

- **path**: Path to the note file (absolute or relative to vault)
- **title**: Note title (alternative to path - will search for the note)
- **content**: New content (optional - preserves existing if not provided)
- **frontmatter**: Frontmatter fields to update (merged with existing)
  - `contentType`: Content type
  - `category`: Category
  - `subCategory`: Sub-category
  - `tags`: Tags array
  - `source`: Source URL
  - `people`: People mentioned
- **mode**: Update mode - 'merge' (default) or 'replace' frontmatter

**Example usage:**

```bash
# Edit by path
edit_note path: "Articles/My Article.md" content: "Updated content"

# Edit by title
edit_note title: "My Article" frontmatter: {tags: ["updated", "important"]}

# Replace entire frontmatter (preserves date created)
edit_note title: "My Article" mode: "replace" frontmatter: {contentType: "Article", tags: ["new"]}
```

### `get_daily_note`

Get or create a daily note with automatic template integration

**Parameters:**

- **date**: Date in YYYY-MM-DD format, relative date (today, yesterday, tomorrow, +1, -3), or natural language (optional, defaults to today)
- **createIfMissing**: Create the daily note if it doesn't exist (default: true)
- **confirmCreation**: Ask for confirmation before creating a new daily note (default: false)

**Template integration:**

- Automatically uses the template specified in `.obsidian/daily-notes.json`
- Processes Templater syntax (`<% tp.date.now() %>`, `<% tp.file.title %>`)
- Falls back to a minimal template if no template is configured
- Supports relative dates like "yesterday", "tomorrow", "+5", "-3"

### `move_items`

Move notes and/or folders to a different location in the vault

**Parameters:**

- **item**: Single item path to move (alternative to items)
- **items**: Array of items to move, each with:
  - `path`: Path to note or folder
  - `type`: Item type - 'note' or 'folder' (auto-detected if not specified)
- **destination** (required): Target folder path (relative to vault root)
- **createDestination**: Create destination folder if it doesn't exist (default: false)
- **overwrite**: Overwrite existing files in destination (default: false)
- **mergeFolders**: When moving folders, merge with existing folder of same name (default: false)

**Example usage:**

```bash
# Move a single note
move_items item: "10 - Projects/old-note.md" destination: "40 - Archives/2024"

# Move multiple items
move_items items: [{path: "10 - Projects/Completed"}, {path: "planning-doc.md"}] destination: "40 - Archives/2024" createDestination: true

# Merge folders
move_items item: "20 - Areas/Old Resources" destination: "30 - Resources" mergeFolders: true
```

### `insert_content`

Insert content at specific locations within a note based on headings, block references, or text patterns

**Parameters:**

- **path**: Path to the note file (absolute or relative to vault)
- **title**: Note title (alternative to path - will search for the note)
- **content** (required): Content to insert
- **target** (required): Target location for insertion
  - `heading`: Heading text to target (e.g., "## Today's Tasks")
  - `blockRef`: Block reference ID to target (e.g., "^block-id")
  - `pattern`: Text pattern to search for
  - `lineNumber`: Specific line number (1-based)
- **position**: Where to insert content relative to target - 'before', 'after', 'append', 'prepend', 'end-of-section' (default: after)
- **ensureNewline**: Ensure proper line breaks around inserted content (default: true)

**Automatic Task Formatting:** When inserting tasks (lines starting with `- [ ]`), the tool automatically adds creation dates using the Obsidian Tasks Plugin format (➕ YYYY-MM-DD). This helps track when tasks were created and maintains consistency with the Tasks plugin. Tasks with existing creation dates are not modified.

**Example usage:**

```bash
# Insert after a heading
insert_content title: "Daily Note" content: "- New task" target: {heading: "## Today's Tasks"} position: "after"

# Insert before a block reference
insert_content path: "project-notes.md" content: "Update: Project approved!" target: {blockRef: "^project-status"} position: "before"

# Append to a line containing a pattern
insert_content title: "Meeting Notes" content: " - Bob" target: {pattern: "Attendees:"} position: "append"

# Insert at specific line number
insert_content path: "todo.md" content: "- [ ] New item" target: {lineNumber: 5} position: "after"

# Insert at end of a section (for heading targets)
insert_content title: "Project Notes" content: "- Final task" target: {heading: "## Action Items"} position: "end-of-section"

# Task insertion with automatic creation date
insert_content title: "Daily Note" content: "- [ ] Review PR #123" target: {heading: "Day's Notes"} position: "end-of-section"
# Result: - [ ] Review PR #123 ➕ 2025-06-28
```

---

## Utility Tools

### `diagnose_vault`

Diagnose vault issues and check for problematic files

**Parameters:**

- **checkYaml**: Check for YAML parsing errors (default: true)
- **maxFiles**: Maximum files to check (default: 100)

### `get_server_version`

Get the current server version and capabilities information

**Parameters:**

- **includeTools**: Include full list of available tools in the response (optional)

### `get_yaml_rules`

Retrieve your custom YAML frontmatter rules document for reference when creating or editing notes

**Parameters:**

- No parameters required
- Returns the content of your configured YAML rules document
- Requires `yamlRulesPath` to be set in configuration

---

## Search Tools

### `advanced_search`

Comprehensive search with full-text search, metadata filters, and natural language processing

**Parameters:**

- **naturalLanguage**: Natural language query (e.g., "Quebec barbecue restaurants", "recent articles about AI")
- **query**: General search query (searches title, content, and frontmatter)
- **contentQuery**: Search only in note content
- **titleQuery**: Search in note titles, filenames (without .md extension), and aliases
- **contentType**: Filter by content type
- **category**: Filter by category
- **subCategory**: Filter by sub-category
- **tags**: Filter by tags (any match)
- **author**: Filter by author
- **people**: Filter by people mentioned
- **yamlProperties**: Filter by arbitrary YAML property key-value pairs
- **matchMode**: Whether notes must match ALL yamlProperties or ANY (default: all)
- **arrayMode**: How to match array values: exact, contains, or any overlap (default: contains)
- **includeNullValues**: Include notes where YAML properties don't exist or are null (default: false)
- **folder**: Filter by folder path
- **excludeFolders**: Exclude specific folders
- **createdAfter/createdBefore**: Date range filters for creation
- **modifiedAfter/modifiedBefore**: Date range filters for modification
- **caseSensitive**: Case sensitive search (default: false)
- **useRegex**: Use regex for search queries (default: false)
- **includeContent**: Include content in search (default: true)
- **maxResults**: Maximum number of results (default: 20)
- **sortBy**: Sort by relevance, created, modified, or title
- **sortOrder**: Sort order (asc/desc)

**Natural Language Examples:**

```javascript
// Find restaurants
{ naturalLanguage: "Quebec barbecue restaurants" }
// → Automatically detects: state="Quebec", cuisine="Barbecue", category="Restaurant"

// Find recent content
{ naturalLanguage: "recent articles about AI" }
// → Automatically detects: category="Article", modifiedAfter=<recent date>

// Find recipes
{ naturalLanguage: "Italian pasta recipes" }
// → Automatically detects: category="Recipe", cuisine="Italian"
```

**Advanced YAML Property Examples:**

```javascript
// Include notes where "project" property is missing/null
{
  "yamlProperties": { "status": "active" },
  "includeNullValues": true
}

// Search with performance optimizations
{
  "yamlProperties": { "contentType": "Daily Note" },
  "sortBy": "created",
  "sortOrder": "desc",
  "maxResults": 10
}

// Complex property matching with null handling
{
  "yamlProperties": { "priority": "high", "assignee": "john" },
  "matchMode": "any",
  "includeNullValues": false
}
```

---

## YAML Property Management

### `list_yaml_properties`

Discover and analyze YAML frontmatter properties across your entire vault

**Parameters:**

- **includeCount**: Include usage count for each property (default: false)
- **sortBy**: Sort by 'alphabetical' or 'usage' (default: alphabetical)
- **excludeStandard**: Exclude standard LifeOS properties to focus on custom fields (default: false)

**Example usage:**

```bash
# List all YAML properties with usage counts
list_yaml_properties includeCount: true sortBy: "usage"

# List only custom properties (excludes standard ones like title, contentType, etc.)
list_yaml_properties excludeStandard: true
```

### `list_yaml_property_values`

Analyze all unique values used for a specific YAML property across the vault

**Parameters:**

- **property** (required): The YAML property name to analyze
- **includeCount**: Include usage count for each value (default: false)
- **includeExamples**: Include example note titles that use each value (default: false)
- **sortBy**: Sort values by 'alphabetical', 'usage', or 'type' (default: alphabetical)
- **maxExamples**: Maximum number of example notes per value (default: 3)

**Features:**

- Distinguishes between single values and array values
- Identifies mixed usage patterns (property used both ways)
- Accurate deduplication with detailed usage statistics
- Usage count tracking and example note collection
- Multiple sorting options for different analysis needs
- Graceful handling of malformed YAML and missing properties

**Example usage:**

```bash
# Basic analysis
list_yaml_property_values property: "tags"

# With usage counts and examples
list_yaml_property_values property: "contentType" includeCount: true includeExamples: true

# Sort by most used values first
list_yaml_property_values property: "category" includeCount: true sortBy: "usage"

# Limit examples shown per value
list_yaml_property_values property: "tags" includeExamples: true maxExamples: 2

# All enhanced features
list_yaml_property_values property: "contentType" includeCount: true includeExamples: true sortBy: "usage" maxExamples: 3
```

---

## Obsidian Integration

All search results and note references include clickable links that open notes directly in Obsidian using the `obsidian://` URL scheme.

### Link Format

- **Search Results**: Each result includes a "🔗 Open in Obsidian" link
- **Note Reading**: Direct links to open the specific note
- **Daily Notes**: Quick access to open daily journal entries

### URL Scheme Examples

```
obsidian://open?vault=YourVaultName&file=path/to/note.md
obsidian://search?vault=YourVaultName&query=search+terms
```

This allows direct integration between AI assistant conversations and your Obsidian vault - simply click any note link to jump directly to that note in Obsidian.
