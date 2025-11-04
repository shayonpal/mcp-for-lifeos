# create_note Tool Documentation

## Tool Overview

- **Name**: `create_note`
- **Purpose**: Create a new note in the LifeOS vault with proper YAML frontmatter and manual control
- **Status**: ✅ Active (Basic note creation without auto-template detection)

## TL;DR

Manual note creation with full control over frontmatter and content. Use this when you need explicit control or when `create_note_smart`'s auto-detection doesn't fit your needs. Supports templates via the `template` parameter and offers a discovery mode to list available templates. Perfect for cases where you want to specify exact metadata or create notes without template processing.

## Key Features

- **Manual YAML Frontmatter Control**: Complete control over all frontmatter fields
- **Optional Template Support**: Use templates when needed via `template` parameter
- **Template Discovery Mode**: List available templates with `useTemplate=true`
- **Custom Folder Placement**: Specify exact target folder with `targetFolder`
- **YAML Rules Compliance**: Automatically follows LifeOS YAML validation rules
- **Support for All LifeOS Metadata Fields**: Full access to content type, category, tags, people, source, etc.
- **Template Variable Injection**: Pass custom data to templates through `customData`
- **Obsidian Compatibility**: Automatic filename sanitization and link generation

## Parameters

### Required Parameters

- **`title`** (string): Note title
  - Used for filename generation and frontmatter
  - Automatically sanitized for Obsidian compatibility (removes `[]`, `:`, `;`)
  - Cannot be empty

### Optional Parameters

- **`content`** (string): Note body content in Markdown format
- **`template`** (string): Template name to use (e.g., `tpl-person`, `tpl-article`, `restaurant`)
- **`useTemplate`** (boolean): If `true`, returns available templates instead of creating note
- **`contentType`** (string): Content type (Article, Daily Note, Recipe, etc.)
- **`category`** (string): Category for PARA method organization
- **`subCategory`** (string): Sub-category classification
- **`tags`** (string[]): Array of tags for frontmatter
- **`targetFolder`** (string): Target folder path (defaults to `01-Inbox`)
- **`source`** (string): Source URL for articles and references
- **`people`** (string[]): Array of people mentioned in the note
- **`customData`** (Record<string, any>): Custom data for template variable processing

## Usage Modes

### Basic Creation

Simple note with title and optional content - no template processing.

### With Metadata

Note creation with explicit frontmatter fields specified manually.

### Template Mode

Using a specific template with optional custom data injection.

### Discovery Mode

Set `useTemplate=true` to list all available templates in the vault.

### Custom Folder

Specify `targetFolder` to override default folder placement.

## Usage Examples

### Simple Note Creation

```json
{
  "title": "Project Meeting Notes",
  "content": "# Meeting Agenda\n\n- Discuss Q1 goals\n- Review budget\n- Plan next steps"
}
```

**Result**: Creates basic note in default inbox folder with minimal frontmatter.

### Note with Full Metadata

```json
{
  "title": "AI Development Best Practices",
  "content": "# Key Principles\n\n1. Data quality\n2. Model validation\n3. Ethical considerations",
  "contentType": "Technical Article",
  "category": "Resources",
  "subCategory": "Development",
  "tags": ["ai", "development", "best-practices"],
  "source": "https://example.com/ai-best-practices",
  "people": ["John Doe", "Jane Smith"]
}
```

**Result**: Creates note with complete metadata structure in appropriate folder.

### Using a Template

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

**Result**: Creates restaurant note using template with custom data injected.

### Discovering Available Templates

```json
{
  "title": "dummy",
  "useTemplate": true
}
```

**Result**: Returns list of all available templates instead of creating a note:

```
Available templates:

- restaurant
- person
- article
- books
- placetovisit
- medicine
- application
- daily
- fleeting
- moc
- reference

To use a template, run create_note again with:
template: "template-name"
```

### Article with Source URL

```json
{
  "title": "The Future of AI in Healthcare",
  "content": "Summary of key findings from recent research...",
  "template": "article",
  "source": "https://healthtech.example.com/ai-future",
  "contentType": "Research Article",
  "category": "Health",
  "tags": ["ai", "healthcare", "research"]
}
```

**Result**: Creates article note with template processing and source attribution.

### Note with Custom Folder Placement

```json
{
  "title": "Personal Development Goals",
  "content": "# 2025 Goals\n\n- Learn TypeScript\n- Improve fitness\n- Travel more",
  "targetFolder": "20 - Areas/21 - Myself/Goals",
  "contentType": "Personal Goal",
  "category": "Personal",
  "tags": ["goals", "personal-development", "2025"]
}
```

**Result**: Creates note in specified folder with custom metadata.

## YAML Frontmatter Structure

The tool automatically generates YAML frontmatter with the following structure:

### Core Fields

- **`title`**: Note title (required)
- **`created`**: Auto-generated creation timestamp
- **`modified`**: Auto-generated modification timestamp

### Content Classification

- **`content type`**: Type of content (string or array)
- **`category`**: PARA method category
- **`sub-category`**: Sub-category classification

### Metadata Fields

- **`tags`**: Array of tags for organization
- **`people`**: Array of people mentioned
- **`source`**: Source URL for references
- **Custom fields**: Any additional fields from templates or manual specification

### Example Generated Frontmatter

```yaml
---
title: "Milano Italian Restaurant"
content type: ["Restaurant"]
category: "Areas"
sub-category: "Food & Dining"
tags: ["restaurant", "italian", "downtown"]
people: []
source: null
cuisine: "Italian"
location: "Downtown Toronto"
rating: 4
price_range: "$$"
visited_date: "2025-01-15"
created: "2025-08-29T10:30:00.000Z"
modified: "2025-08-29T10:30:00.000Z"
---
```

## Template Support

### How to Discover Templates

Use the discovery mode to list all available templates:

```json
{
  "title": "dummy",
  "useTemplate": true
}
```

### How to Use Templates

Specify the template name in the `template` parameter:

```json
{
  "title": "Note Title",
  "template": "template-name",
  "customData": { /* template-specific data */ }
}
```

### Template Variable Injection

Templates support variable injection through the `customData` parameter. Template variables are processed using Templater syntax (`<% tp.user.variable %>`).

### Available Templates

Common templates in the system include:

| Template | Description | Use Case |
|----------|-------------|----------|
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

## Folder Organization

### Default Behavior

- **Default Folder**: `01-Inbox` (if no `targetFolder` specified)
- **Template Override**: Templates can specify their own target folders
- **Custom Override**: `targetFolder` parameter takes precedence over template defaults

### PARA Method Structure

The tool respects the PARA method folder organization:

- **Projects**: `10 - Projects/`
- **Areas**: `20 - Areas/`
- **Resources**: `30 - Resources/`
- **Archive**: `40 - Archive/`
- **Inbox**: `01-Inbox/`

### Auto-creation of Folders

Folders are automatically created if they don't exist when using `targetFolder`.

## Comparison with create_note_smart

| Aspect | create_note | create_note_smart |
|--------|-------------|-------------------|
| **Control** | Manual control, explicit parameters | Auto-detection, intelligent routing |
| **Template Detection** | Manual template specification | Automatic based on title keywords |
| **Best For** | Explicit control, custom workflows | Quick creation, standard workflows |
| **Complexity** | More parameters, explicit setup | Simpler interface, smart defaults |
| **Flexibility** | Maximum flexibility | Optimized for common patterns |

### When to Use Each Tool

**Use `create_note` when:**

- You need explicit control over all parameters
- The note doesn't fit standard template patterns
- You want to bypass auto-detection logic
- You're creating highly custom notes with specific metadata
- You need to specify exact folder placement

**Use `create_note_smart` when:**

- You want automatic template detection
- You're creating standard note types (restaurants, people, articles)
- You prefer intelligent defaults and routing
- You want the system to handle template selection

## Implementation Details

### Handler Location

- **Primary Handler**: Direct implementation in `src/index.ts` (case 'create_note')
- **File Creation**: `VaultUtils.createNote()` method
- **Template Processing**: `DynamicTemplateEngine.createNoteFromTemplate()`

### Template Engine Integration

- **Discovery**: `TemplateManager.getTemplateNames()` for template listing
- **Processing**: `DynamicTemplateEngine` with Templater syntax support
- **Caching**: Templates cached for 30 seconds to improve performance

### YAML Compliance

- **Validation**: `YamlRulesManager` ensures compliance with LifeOS rules
- **Sanitization**: Automatic frontmatter sanitization and structure validation
- **Auto-managed Fields**: Never modifies auto-managed timestamps and IDs

### File Operations

- **Creation**: `VaultUtils.createNote()` handles file system operations
- **Sanitization**: Automatic filename sanitization for Obsidian compatibility
- **Link Generation**: `ObsidianLinks.createClickableLink()` for vault integration

## Response Format

### Successful Creation

```json
{
  "content": [{
    "type": "text",
    "text": "✅ Created note: **Note Title**\n\nobsidian://open?vault=VaultName&file=path%2Fto%2Fnote.md\n\n📁 Location: `relative/path/to/note.md`"
  }],
  "metadata": {
    "version": "1.7.0",
    "timestamp": "2025-08-29T10:30:00.000Z"
  }
}
```

### Template Discovery Response

```json
{
  "content": [{
    "type": "text", 
    "text": "Available templates:\n\n- restaurant\n- person\n- article\n- books\n- placetovisit\n- medicine\n- application\n- daily\n- fleeting\n- moc\n- reference\n\nTo use a template, run create_note again with:\ntemplate: \"template-name\""
  }]
}
```

### Error Cases

**Missing Title:**

```json
{
  "error": "Title is required"
}
```

**Invalid Template:**

```json
{
  "content": [{
    "type": "text",
    "text": "Error listing templates: Template not found: invalid_template"
  }]
}
```

**File Already Exists:**

```json
{
  "error": "Note already exists: /path/to/existing/note.md"
}
```

**Invalid Target Folder:**

```json
{
  "error": "Target folder does not exist: /invalid/folder/path"
}
```

## Best Practices

### Use Explicit Control When Needed

- Leverage `create_note` when you need precise control over frontmatter
- Specify exact metadata that doesn't fit standard templates
- Use custom folder placement for specialized organization

### Discover Templates First

- Use `useTemplate=true` to explore available templates
- Understand template capabilities before manual specification
- Keep template names consistent with vault structure

### Validate YAML Rules

- Use `get_yaml_rules` tool to understand current YAML compliance requirements
- Follow LifeOS YAML structure for consistency
- Avoid modifying auto-managed fields

### Optimize Folder Structure  

- Use PARA method folder organization for consistency
- Specify `targetFolder` when default placement isn't appropriate
- Ensure target folders exist or can be auto-created

### Provide Meaningful Metadata

- Include relevant tags for discoverability
- Add people references for relationship tracking
- Include source URLs for articles and references
- Use structured custom data for template variables

## Performance Considerations

- **Template Caching**: Templates are cached for 30 seconds to reduce filesystem operations
- **YAML Validation**: Frontmatter is validated and sanitized for compliance
- **File System**: Uses retry logic for iCloud sync resilience on macOS
- **Memory Usage**: Minimal memory footprint with on-demand template loading

## Related Tools

### Primary Alternatives

- **`create_note_smart`**: Intelligent note creation with auto-detection
- **`create_note_from_template`**: Legacy template-based creation (deprecated)

### Supporting Tools

- **`get_yaml_rules`**: Understand YAML frontmatter compliance rules
- **`list`** with `type='templates'`: List all available templates with details
- **`search`**: Find existing notes to avoid duplicates

### Integration Tools

- **`read_note`**: Read created notes for verification
- **`update_note`**: Modify notes after creation
- **`move_items`**: Reorganize notes and folders

## Analytics and Monitoring

The tool automatically tracks:

- Note creation success/failure rates
- Template usage patterns when templates are used
- Folder placement decisions
- Performance metrics for file operations
- Error patterns and frequency

View analytics with the dashboard at `http://localhost:19832` (when `ENABLE_WEB_INTERFACE=true`).

## Troubleshooting

### Common Issues

**"Title is required" Error**

- Ensure `title` parameter is provided and not empty
- Check that title string is valid

**"Note already exists" Error**  

- Use `search` tool to check for existing notes with same title
- Consider using different title or updating existing note

**"Target folder does not exist" Error**

- Verify `targetFolder` path is correct and exists in vault
- Use `list` tool with `type='folders'` to see available folders

**Template Not Found**

- Use `useTemplate=true` to list available templates
- Ensure template name is spelled correctly
- Check that template files exist in templates folder

**YAML Validation Errors**

- Use `get_yaml_rules` to understand compliance requirements
- Ensure frontmatter structure follows LifeOS standards
- Avoid conflicting or invalid YAML syntax

### Debug Tips

1. **Test Template Discovery**: Always test `useTemplate=true` first to see available options
2. **Verify Folder Structure**: Use `list` tool to explore vault organization  
3. **Check YAML Rules**: Review current YAML compliance with `get_yaml_rules`
4. **Start Simple**: Begin with basic notes and add complexity incrementally
5. **Monitor Analytics**: Use analytics dashboard to identify patterns in failures

## Version History

- **v1.7.0**: Current version with full template integration and discovery mode
- **v1.6.0**: Enhanced YAML property handling and validation
- **v1.5.0**: Natural language processing integration
- **v1.4.0**: Added comprehensive frontmatter field support
- **v1.3.0**: YAML rules integration and compliance checking
- **v1.0.0**: Initial implementation with basic note creation
