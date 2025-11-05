# Example Workflow: YAML Property Discovery and Management

This example demonstrates how to discover, analyze, and manage YAML frontmatter properties across your vault.

## Scenario

You want to understand what YAML properties are used in your vault, standardize property values, and manage custom metadata effectively.

## Property Discovery

### Operation 1: List All YAML Properties

Discover all properties used across your vault:

```json
{
  "tool": "list_yaml_properties",
  "arguments": {
    "includeCount": true,
    "sortBy": "usage"
  }
}
```

**Expected Output:**
```json
{
  "properties": [
    { "name": "title", "count": 1250 },
    { "name": "contentType", "count": 1200 },
    { "name": "tags", "count": 980 },
    { "name": "dateCreated", "count": 850 },
    { "name": "status", "count": 420 },
    { "name": "priority", "count": 180 }
  ],
  "total": 45
}
```

**Use cases:**
- Audit vault metadata
- Find unused properties
- Identify naming inconsistencies

### Operation 2: List Custom Properties Only

Exclude standard LifeOS properties to focus on custom fields:

```json
{
  "tool": "list_yaml_properties",
  "arguments": {
    "includeCount": true,
    "excludeStandard": true,
    "sortBy": "usage"
  }
}
```

**Expected Output:**
```json
{
  "properties": [
    { "name": "project", "count": 150 },
    { "name": "assignee", "count": 120 },
    { "name": "dueDate", "count": 95 },
    { "name": "cuisine", "count": 45 },
    { "name": "location", "count": 40 }
  ],
  "total": 28,
  "excluded": ["title", "contentType", "category", "tags", "dateCreated"]
}
```

## Property Value Analysis

### Operation 3: Analyze Property Values

Explore all unique values for a specific property:

```json
{
  "tool": "list_yaml_property_values",
  "arguments": {
    "property": "contentType",
    "includeCount": true,
    "includeExamples": true,
    "sortBy": "usage",
    "maxExamples": 3
  }
}
```

**Expected Output:**
```json
{
  "property": "contentType",
  "values": [
    {
      "value": "Article",
      "count": 420,
      "type": "single",
      "examples": [
        "AI and Machine Learning Trends",
        "Software Architecture Patterns",
        "Remote Work Best Practices"
      ]
    },
    {
      "value": "Daily Note",
      "count": 365,
      "type": "single",
      "examples": [
        "2025-11-05",
        "2025-11-04",
        "2025-11-03"
      ]
    },
    {
      "value": "Project",
      "count": 150,
      "type": "single",
      "examples": [
        "Website Redesign",
        "Mobile App Development",
        "API Integration"
      ]
    }
  ],
  "total": 15
}
```

### Operation 4: Analyze Tag Usage

Understand how tags are used (arrays vs single values):

```json
{
  "tool": "list_yaml_property_values",
  "arguments": {
    "property": "tags",
    "includeCount": true,
    "sortBy": "usage",
    "maxExamples": 2
  }
}
```

**Expected Output:**
```json
{
  "property": "tags",
  "values": [
    {
      "value": "project",
      "count": 180,
      "type": "array",
      "examples": ["Website Redesign", "Mobile App"]
    },
    {
      "value": "urgent",
      "count": 65,
      "type": "array",
      "examples": ["Q4 Planning", "Bug Fix"]
    },
    {
      "value": "documentation",
      "count": 45,
      "type": "mixed",
      "examples": ["API Docs", "User Guide"],
      "note": "Used both as array and single value"
    }
  ],
  "total": 120
}
```

**Key insight:**
- `type: "array"` - Always used in arrays
- `type: "single"` - Always used as single value
- `type: "mixed"` - Inconsistent usage (needs standardization)

## Property Standardization

### Operation 5: Find Inconsistent Usage

Identify properties with mixed usage patterns:

**Step 1: Analyze property**
```json
{
  "tool": "list_yaml_property_values",
  "arguments": {
    "property": "status",
    "includeCount": true,
    "includeExamples": true,
    "sortBy": "alphabetical"
  }
}
```

**Expected Output:**
```json
{
  "values": [
    { "value": "completed", "count": 80 },
    { "value": "Completed", "count": 15 },  // ← Inconsistency
    { "value": "in-progress", "count": 45 },
    { "value": "in_progress", "count": 12 }, // ← Inconsistency
    { "value": "pending", "count": 30 }
  ]
}
```

**Step 2: Find and fix inconsistencies**
```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "yamlProperties": {
      "status": "Completed"
    },
    "format": "concise",
    "maxResults": 50
  }
}
```

**Step 3: Update to standardized value**
```json
{
  "tool": "edit_note",
  "arguments": {
    "path": "10 - Projects/Project-A.md",
    "frontmatter": {
      "status": "completed"
    },
    "mode": "merge"
  }
}
```

### Operation 6: Discover Missing Required Properties

Find notes missing essential properties:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "folder": "10 - Projects",
    "yamlProperties": {
      "status": null
    },
    "includeNullValues": true,
    "format": "concise",
    "maxResults": 100
  }
}
```

**Expected Result:**
- Returns notes without `status` property
- Use to identify incomplete metadata
- Helpful for data quality audits

## Advanced Property Management

### Scenario 1: Property Migration

Rename property across entire vault:

**Step 1: Find all notes with old property**
```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "yamlProperties": {
      "dueDate": "*"
    },
    "format": "concise",
    "maxResults": 500
  }
}
```

**Step 2: Read note to get current value**
```json
{
  "tool": "read_note",
  "arguments": {
    "path": "10 - Projects/Project-A.md"
  }
}
```

**Step 3: Update with new property name**
```json
{
  "tool": "edit_note",
  "arguments": {
    "path": "10 - Projects/Project-A.md",
    "frontmatter": {
      "deadline": "2025-12-31",
      "dueDate": null
    },
    "mode": "merge"
  }
}
```

**Note:** Repeat for all affected notes (consider scripting for large-scale migrations)

### Scenario 2: Add Default Properties

Add missing properties to notes in a category:

**Step 1: Find notes missing property**
```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "contentType": "Project",
    "yamlProperties": {
      "priority": null
    },
    "includeNullValues": true,
    "maxResults": 100
  }
}
```

**Step 2: Add default value**
```json
{
  "tool": "edit_note",
  "arguments": {
    "path": "10 - Projects/New-Project.md",
    "frontmatter": {
      "priority": "medium",
      "status": "pending"
    },
    "mode": "merge"
  }
}
```

### Scenario 3: Property Value Cleanup

Standardize property values across notes:

**Step 1: Find non-standard values**
```json
{
  "tool": "list_yaml_property_values",
  "arguments": {
    "property": "priority",
    "includeCount": true,
    "includeExamples": true,
    "sortBy": "alphabetical"
  }
}
```

**Expected Output:**
```json
{
  "values": [
    { "value": "high", "count": 45 },
    { "value": "High", "count": 8 },      // ← Fix needed
    { "value": "1", "count": 3 },          // ← Fix needed
    { "value": "urgent", "count": 5 },     // ← Fix needed
    { "value": "low", "count": 30 },
    { "value": "medium", "count": 65 }
  ]
}
```

**Step 2: Search and update**
```json
// Fix "High" → "high"
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "yamlProperties": { "priority": "High" },
    "format": "concise"
  }
}

// Update each note
{
  "tool": "edit_note",
  "arguments": {
    "path": "path/to/note.md",
    "frontmatter": { "priority": "high" },
    "mode": "merge"
  }
}
```

## Best Practices Discovery

### Operation 7: Analyze Property Patterns

Understand how properties are used together:

**Step 1: Find notes with specific property combination**
```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "yamlProperties": {
      "contentType": "Restaurant",
      "cuisine": "*"
    },
    "format": "detailed",
    "maxResults": 50
  }
}
```

**Step 2: Analyze results to understand patterns**
- Which properties are commonly used together?
- What values are typical for each content type?
- Are there missing properties that should be standard?

### Operation 8: Property Coverage Analysis

Check property usage across different content types:

```json
// Articles
{
  "tool": "search",
  "arguments": {
    "mode": "content_type",
    "contentType": "Article",
    "format": "detailed",
    "maxResults": 10
  }
}

// Projects
{
  "tool": "search",
  "arguments": {
    "mode": "content_type",
    "contentType": "Project",
    "format": "detailed",
    "maxResults": 10
  }
}
```

Compare results to identify:
- Content-type specific properties
- Missing standardization opportunities
- Recommended property schemas

## Tips & Best Practices

1. **Regular audits**: Run `list_yaml_properties` monthly to discover property drift
2. **Standardize early**: Define property conventions before vault grows large
3. **Use `includeExamples`**: Examples help understand property usage context
4. **Sort by usage**: Most-used properties indicate importance
5. **Exclude standard properties**: Focus on custom fields for better insights
6. **Document conventions**: Create YAML rules document (use `get_yaml_rules`)
7. **Fix inconsistencies incrementally**: Tackle most-used properties first

## Creating YAML Rules Document

Document your property conventions:

```json
{
  "tool": "create_note",
  "arguments": {
    "title": "YAML Frontmatter Rules",
    "content": "# YAML Property Conventions\n\n## Standard Properties\n\n- **title**: Note title (required)\n- **contentType**: Article, Project, Recipe, etc.\n- **tags**: Array of tags (lowercase, kebab-case)\n- **dateCreated**: YYYY-MM-DD format\n\n## Project Properties\n\n- **status**: pending, in-progress, completed, archived\n- **priority**: low, medium, high\n- **assignee**: Person name\n- **deadline**: YYYY-MM-DD format\n\n## Restaurant Properties\n\n- **cuisine**: Italian, French, Japanese, etc.\n- **location**: City, State/Province\n- **priceRange**: $, $$, $$$, $$$$\n- **rating**: 0-5 numeric",
    "contentType": "Documentation",
    "targetFolder": "00 - System"
  }
}
```

Then configure in settings:
```json
{
  "yamlRulesPath": "00 - System/YAML Frontmatter Rules.md"
}
```

## Related Tools

- [`list_yaml_properties`](../TOOLS.md#list_yaml_properties) - List all properties in vault
- [`list_yaml_property_values`](../TOOLS.md#list_yaml_property_values) - Analyze property values
- [`search`](../TOOLS.md#search) - Find notes by property values
- [`edit_note`](../TOOLS.md#edit_note) - Update YAML frontmatter
- [`get_yaml_rules`](../TOOLS.md#get_yaml_rules) - Get YAML conventions document

## Troubleshooting

**Property not found?**
- Check spelling (case-sensitive)
- Verify notes have YAML frontmatter
- Ensure property is not nested in objects

**Inconsistent values?**
- Use `sortBy: "alphabetical"` to spot variations
- Check for case differences
- Look for typos in property values

**Missing properties?**
- Use `includeNullValues: true` in search
- Check if property is genuinely missing vs. empty/null
- Verify frontmatter formatting is correct
