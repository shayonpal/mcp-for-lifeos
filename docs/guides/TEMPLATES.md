# Template System Guide

The LifeOS MCP server includes intelligent template integration that automatically uses your existing Obsidian templates.

## Table of Contents

1. [Available Templates](#available-templates)
2. [Template Features](#template-features)
3. [Usage Examples](#usage-examples)
4. [Template Processing](#template-processing)
5. [Creating Custom Templates](#creating-custom-templates)

---

## Available Templates

| Template        | Target Folder                        | Content Type | Description                                          |
| ----------------- | -------------------------------------- | -------------- | ------------------------------------------------------ |
| **restaurant**  | `30 - Resources/Restaurants`         | Reference    | Restaurant notes with cuisine, location, and ratings |
| **article**     | `30 - Resources/Reading`             | Article      | Article notes with source and author                 |
| **person**      | `20 - Areas/Relationships`           | MOC          | Person/contact notes with relationships              |
| **daily**       | `20 - Areas/Personal/Journals/Daily` | Daily Note   | Daily journal entries                                |
| **reference**   | `30 - Resources`                     | Reference    | General reference notes                              |
| **medicine**    | `20 - Areas/Health`                  | Medical      | Medicine/medication notes                            |
| **application** | `30 - Resources/Tools`               | Reference    | Application/software reviews                         |
| **book**        | `30 - Resources/Reading`             | Reference    | Book notes and reviews                               |
| **place**       | `10 - Projects`                      | Planning     | Travel and places to visit                           |
| **fleeting**    | `05 - Fleeting Notes`                | Fleeting     | Quick capture and temporary thoughts                 |
| **moc**         | `00 - Meta/MOCs`                     | MOC          | Maps of Content for organizing notes                 |

---

## Template Features

### Automatic Templater Processing

The template system automatically processes Templater syntax:

- `<% tp.file.title %>` - Current file title
- `<% tp.date.now() %>` - Current date/time
- `<% tp.file.path() %>` - File path
- Custom template variables and functions

### Smart Folder Placement

Templates automatically place notes in the correct PARA folders based on content type:

- **Projects** (10 - Projects): Active work and goals
- **Areas** (20 - Areas): Ongoing responsibilities
- **Resources** (30 - Resources): Reference materials
- **Archives** (40 - Archives): Completed items

### Custom Data Injection

Pass template-specific data when creating notes:

- **Restaurant**: cuisine, location, rating, price range
- **Article**: author, source, publication date
- **Person**: relationship, company, contact information
- **Place**: location, travel dates, activities

### Fallback Handling

Graceful degradation if templates are missing:

- Falls back to basic YAML frontmatter
- Creates note in appropriate folder
- Maintains YAML compliance and structure

### Auto-Detection

Automatically infers appropriate template from note title and context:

- "Pizza Palace" → restaurant template
- "John Doe" → person template
- "Trip to Japan" → place template

---

## Usage Examples

### Smart Note Creation (Recommended)

```bash
# Auto-detect template from title
create_note_smart title: "Pizza Palace"  # → restaurant template

# Explicit template override
create_note_smart title: "My Article" template: "article"

# With custom data
create_note_smart title: "Thai Basil" template: "restaurant" customData: {
  cuisine: "Thai",
  location: "Downtown Toronto",
  rating: "4.5"
}
```

### List Available Templates

```bash
# View all templates
list type: "templates"

# Returns template names and target folders
```

### Traditional Note Creation

```bash
# Use specific template
create_note title: "Book Review" template: "tpl-book"

# List templates before creating
create_note title: "New Note" useTemplate: true
```

---

## Template Processing

### How Templates Work

1. **Template Discovery**: Server scans your Obsidian templates folder
2. **Template Caching**: Templates cached for 24 hours for performance
3. **Templater Processing**: Converts Templater syntax to actual values
4. **YAML Validation**: Ensures frontmatter follows LifeOS rules
5. **Folder Placement**: Places note in correct PARA folder
6. **File Creation**: Creates note with processed template content

### Template File Structure

Templates should be standard Obsidian markdown files with:

- YAML frontmatter at the top
- Templater variables where needed
- Markdown content structure

Example template file (`tpl-restaurant.md`):

```markdown
---
title: <% tp.file.title %>
contentType: Reference
category: Restaurant
date created: <% tp.date.now("YYYY-MM-DD HH:mm") %>
tags: []
cuisine:
location:
rating:
---

# <% tp.file.title %>

## Details

**Cuisine:**
**Location:**
**Rating:**

## Notes

## Visited

- [ ] First visit
```

---

## Creating Custom Templates

### Template Location

Templates must be in your configured templates folder:

```typescript
// In src/config.ts
templatesPath: '/path/to/your/vault/00 - Meta/Templates'
```

### Template Naming Convention

- Prefix with `tpl-` for clarity (e.g., `tpl-restaurant.md`)
- Use descriptive names that match content type
- Lowercase with hyphens for readability

### Template Best Practices

1. **Include Required YAML Fields**:
   - `title`
   - `contentType`
   - `date created`

2. **Use Templater Variables**:
   - Makes templates reusable
   - Automatically fills in dynamic content
   - Reduces manual editing

3. **Follow PARA Structure**:
   - Ensure contentType matches target folder
   - Respect organizational hierarchy
   - Consider workflow integration

4. **Add Helpful Sections**:
   - Relevant headings for note type
   - Checklists for common tasks
   - Placeholder text for guidance

5. **Test Your Templates**:
   - Create test notes
   - Verify YAML parsing
   - Check folder placement
   - Validate Templater processing

### Custom Data Fields

When creating notes with custom data, the template system will:

- Inject values into matching YAML fields
- Process Templater syntax first
- Merge custom data with template defaults
- Maintain YAML compliance

Example with custom data:

```bash
create_note_smart title: "Sushi Place" customData: {
  cuisine: "Japanese",
  location: "Queen Street",
  rating: "5",
  priceRange: "$$"
}
```

The template will receive these values and populate the frontmatter accordingly.

---

## Troubleshooting

### Templates Not Found

1. Check `templatesPath` in configuration
2. Verify templates folder exists
3. Ensure templates have `.md` extension
4. Check file permissions

### Template Processing Errors

1. Validate YAML syntax in template
2. Check Templater syntax format
3. Test template manually in Obsidian
4. Review server logs for details

### Wrong Folder Placement

1. Verify contentType in template frontmatter
2. Check PARA folder structure configuration
3. Ensure template metadata is correct
4. Review folder mapping rules

---

For more information:

- [Complete Tools API Reference](../api/TOOLS.md)
- [Configuration Guide](CONFIGURATION.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
