# create_note_smart Tool Documentation

## Tool Overview

- **Name**: `create_note_smart`
- **Purpose**: Smart note creation with automatic template detection and intelligent routing
- **Status**: ✅ Active (Primary tool for template-based note creation)

## TL;DR

Smart note creation tool that intelligently creates notes with automatic template detection based on title keywords. Just provide a title and it figures out if you need a restaurant review, person contact, article, etc. Set `auto_template=false` to disable auto-detection. Consolidates legacy `create_note` and `create_note_from_template` tools.

## Key Features

- **Automatic Template Detection**: Analyzes note titles to determine appropriate templates
- **Tool Consolidation**: Combines `create_note` and `create_note_from_template` functionality
- **Smart Routing**: Automatically routes to template-based or manual creation
- **Custom Data Injection**: Supports template variables through `customData` parameter
- **YAML Frontmatter Compliance**: Enforces LifeOS YAML rules and structure
- **Intelligent Folder Placement**: Places notes in appropriate folders based on templates
- **Backward Compatibility**: Maintains compatibility with existing workflows

## Parameters

### Required Parameters

- **`title`** (string): The note title
  - Used for filename generation and frontmatter
  - Automatically sanitized for Obsidian compatibility
  - Triggers template auto-detection when `auto_template=true`

### Optional Parameters

- **`content`** (string): Note body content in Markdown format
- **`auto_template`** (boolean, default: `true`): Enable automatic template detection
- **`template`** (string): Explicit template override (overrides auto-detection)
- **`contentType`** (string): Content type for frontmatter
- **`category`** (string): Category classification for frontmatter
- **`subCategory`** (string): Sub-category classification for frontmatter
- **`tags`** (string[]): Array of tags for frontmatter
- **`targetFolder`** (string): Override target folder path
- **`source`** (string): Source URL for articles and references
- **`people`** (string[]): Array of people mentioned in the note
- **`customData`** (Record<string, any>): Custom data for template variable processing

## Template Detection Logic

The tool analyzes the note title for keywords to automatically determine the appropriate template:

### Supported Template Detection

| Template | Trigger Keywords | Example Titles |
|----------|-----------------|----------------|
| **restaurant** | "restaurant", "cafe", "food" | "Joe's Pizza", "Downtown Cafe Review" |
| **person** | "person", "contact", "people" | "John Smith Contact", "Meeting with Sarah" |
| **article** | "article", "blog", "post" | "AI Development Article", "Tech Blog Post" |
| **books** | "book", "reading" | "Clean Code Book Notes", "Reading List" |
| **placetovisit** | "place", "visit", "travel" | "Paris Travel Guide", "Places to Visit" |
| **medicine** | "medicine", "medication", "drug" | "Aspirin Information", "Medication Notes" |
| **application** | "app", "application", "software", "tool" | "VS Code Setup", "New Application Review" |
| **daily** | "daily", "journal" | "Daily Journal", "Today's Notes" |

### Templates Not Auto-Detected

These templates are too general for reliable auto-detection and require explicit specification:
- **fleeting** - Quick temporary notes
- **moc** - Map of Content pages  
- **reference** - Reference documentation

## Available Templates

The tool discovers templates dynamically from the vault's templates folder. Common templates include:

| Template Key | Description | Use Case |
|-------------|-------------|----------|
| `restaurant` | Restaurant reviews and recommendations | Food establishments, dining experiences |
| `person` | Contact information and relationships | People, contacts, networking |
| `article` | Web articles and blog posts | Online content, research articles |
| `books` | Book notes and reviews | Reading notes, book recommendations |
| `placetovisit` | Travel destinations and locations | Travel planning, location notes |
| `medicine` | Medication tracking and information | Health, medication management |
| `application` | Software and tool documentation | App reviews, tool comparisons |
| `daily` | Daily journal entries | Daily notes, journaling |
| `fleeting` | Quick temporary notes | Temporary thoughts, quick captures |
| `moc` | Map of Content pages | Content organization, navigation |
| `reference` | Reference documentation | Knowledge base, documentation |

## Usage Examples

### Simple Note with Auto-Detection

```json
{
  "title": "Joe's Pizza Review",
  "content": "Amazing pepperoni pizza with great service.",
  "auto_template": true
}
```

**Result**: Automatically detects "restaurant" template based on title keywords.

### Note with Explicit Template

```json
{
  "title": "John Smith",
  "template": "person",
  "customData": {
    "email": "john@example.com",
    "phone": "555-0123",
    "company": "Tech Corp"
  }
}
```

**Result**: Uses person template with custom contact information.

### Article with Source URL

```json
{
  "title": "AI Development Best Practices",
  "template": "article",
  "source": "https://example.com/ai-best-practices",
  "contentType": "Technical Article",
  "tags": ["ai", "development", "best-practices"]
}
```

**Result**: Creates article note with source URL and metadata.

### Disable Auto-Detection

```json
{
  "title": "Project Meeting Notes",
  "content": "# Meeting Agenda\n\n- Item 1\n- Item 2",
  "auto_template": false,
  "category": "Work",
  "tags": ["meeting", "project"]
}
```

**Result**: Creates basic note without template processing.

### Book Notes with Custom Data

```json
{
  "title": "Clean Code - Robert Martin",
  "template": "books",
  "customData": {
    "author": "Robert C. Martin",
    "isbn": "978-0132350884",
    "rating": 5,
    "status": "reading"
  },
  "tags": ["programming", "software-development"]
}
```

**Result**: Creates book note with structured metadata.

### Restaurant with Custom Fields

```json
{
  "title": "Milano Italian Restaurant",
  "template": "restaurant",
  "customData": {
    "cuisine": "Italian",
    "location": "Downtown Toronto",
    "rating": 4,
    "price_range": "$$",
    "visited_date": "2025-01-15"
  },
  "tags": ["restaurant", "italian", "downtown"]
}
```

**Result**: Creates restaurant review with structured data.

## Migration from Legacy Tools

### From `create_note_from_template`

**Old way:**
```json
{
  "title": "Joe's Pizza",
  "template": "restaurant",
  "customData": { "rating": 5 }
}
```

**New way (same parameters):**
```json
{
  "title": "Joe's Pizza",
  "template": "restaurant",
  "customData": { "rating": 5 }
}
```

### From `create_note`

**Old way:**
```json
{
  "title": "Meeting Notes",
  "content": "Today's meeting...",
  "frontmatter": { "category": "Work" }
}
```

**New way:**
```json
{
  "title": "Meeting Notes",
  "content": "Today's meeting...",
  "category": "Work",
  "auto_template": false
}
```

## Routing Behavior

The tool uses intelligent routing to determine the creation method:

### With Template (Auto-detected or Explicit)
- **Route**: Template Engine (`DynamicTemplateEngine`)
- **Confidence**: 0.8 (auto-detected) / 1.0 (explicit)
- **Process**: Template processing with variable substitution
- **Output**: Structured note with template-specific frontmatter

### Without Template
- **Route**: Basic Note Creation
- **Confidence**: 1.0
- **Process**: Manual frontmatter construction
- **Output**: Simple note with user-provided metadata

### Decision Factors

1. **Explicit Template**: Always takes precedence
2. **Auto-detection**: Based on title keyword analysis
3. **Template Availability**: Only uses templates that exist in vault
4. **Fallback**: Falls back to basic creation if template processing fails

## Implementation Details

### Handler Functions
- **Primary**: `ToolRouter.routeCreateNote()` - Main routing logic
- **Execution**: `ToolRouter.executeCreateNote()` - Internal execution
- **Template Processing**: `DynamicTemplateEngine.createNoteFromTemplate()`

### Template Engine
- **Discovery**: Automatic from vault templates folder
- **Caching**: 30-second cache for template metadata
- **Processing**: Templater syntax support with variable substitution
- **Validation**: YAML frontmatter compliance checking

### File Operations
- **Creation**: `VaultUtils.createNote()` - Core file creation
- **Sanitization**: Automatic filename sanitization for Obsidian compatibility
- **Folder Placement**: Based on template configuration or user override

## Response Format

### Successful Creation

```json
{
  "note": {
    "path": "/path/to/note.md",
    "frontmatter": { ... },
    "content": "...",
    "title": "Note Title"
  },
  "obsidianLink": "obsidian://open?vault=VaultName&file=NotePath",
  "templateUsed": "restaurant",
  "routingDecision": {
    "targetTool": "create_note_from_template",
    "strategy": "template-based", 
    "confidence": 0.8
  }
}
```

### Error Response

> **Note**: Error messages enhanced in MCP-39 (2025-10-23) to provide actionable guidance for recovery.

```json
{
  "error": "Template not found: invalid_template. Available templates: restaurant, person, article, books, placetovisit. Run list(type='templates') to see all options.",
  "availableTemplables": ["restaurant", "person", "article", ...],
  "suggestion": "Use list tool with type='templates' to see all available templates"
}
```

## Best Practices

### Let Auto-Detection Work
- Use descriptive titles that contain relevant keywords
- Trust the auto-detection for common note types
- Leverage the intelligence built into the system

### Use Explicit Templates for Edge Cases
- When auto-detection might be ambiguous
- For specialized templates not covered by auto-detection
- When you need guaranteed template selection

### Provide Custom Data for Template Variables
- Use `customData` to populate template placeholders
- Include structured information for better organization
- Follow template-specific data patterns

### Check Available Templates
- Use `list` tool with `type="templates"` to see all available templates
- Understand which templates are available before explicit specification
- Keep template names consistent with your vault structure

### Optimize for Your Workflow
- Customize template detection keywords if needed
- Use consistent naming patterns for better auto-detection
- Structure custom data to match your vault's organization

## Analytics and Monitoring

The tool automatically tracks:
- Template detection accuracy
- Routing decisions and confidence levels
- Creation success/failure rates
- Performance metrics
- Template usage patterns

View analytics with the dashboard at `http://localhost:19832` (when enabled).

## Related Documentation

- [Template System Documentation](../architecture/template-system.md)
- [Tool Router Implementation](../../src/tool-router.ts)
- [YAML Rules Manager](../architecture/yaml-compliance.md)
- [Analytics Dashboard](../guides/analytics-dashboard.md)