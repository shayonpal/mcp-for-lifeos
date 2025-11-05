# Example Workflow: Creating a Restaurant Note

This example demonstrates how to create a restaurant note with automatic template detection and custom YAML properties.

## Scenario

You want to create a note for a new restaurant you discovered, with properly structured metadata including cuisine type, location, and rating.

## Workflow Steps

### Step 1: Create Note with Auto-Detection

Use the `create_note` tool with `auto_template=true` (default) to automatically detect and apply the restaurant template:

```json
{
  "tool": "create_note",
  "arguments": {
    "title": "La Belle Cuisine",
    "content": "Amazing French restaurant in downtown Montreal with excellent service.",
    "auto_template": true,
    "customData": {
      "cuisine": "French",
      "location": "Montreal, QC",
      "priceRange": "$$$$",
      "rating": 4.5
    }
  }
}
```

**Expected Result:**
- Note created at: `30 - Resources/Restaurants/La Belle Cuisine.md`
- Template detected: `tpl-restaurant`
- YAML frontmatter auto-populated with restaurant-specific fields

### Step 2: Verify the Created Note

Read the note to verify the template was applied correctly:

```json
{
  "tool": "read_note",
  "arguments": {
    "path": "30 - Resources/Restaurants/La Belle Cuisine.md"
  }
}
```

**Expected Output:**
```yaml
---
title: La Belle Cuisine
contentType: Restaurant
category: Food & Dining
cuisine: French
location: Montreal, QC
priceRange: $$$$
rating: 4.5
dateCreated: 2025-11-05
tags:
  - restaurant
  - french-cuisine
  - montreal
---

Amazing French restaurant in downtown Montreal with excellent service.
```

### Step 3: Update Restaurant Metadata

Add additional information using `edit_note`:

```json
{
  "tool": "edit_note",
  "arguments": {
    "title": "La Belle Cuisine",
    "frontmatter": {
      "visited": "2025-11-04",
      "recommendedDishes": ["Coq au Vin", "Crème Brûlée"],
      "reservationRequired": true
    },
    "mode": "merge"
  }
}
```

**Expected Result:**
- Frontmatter merged with existing fields
- New custom properties added without overwriting existing data

### Step 4: Search for Restaurant

Find the restaurant note later using search:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "naturalLanguage": "French restaurants in Montreal",
    "maxResults": 10
  }
}
```

**Expected Result:**
- Note found with relevance score
- Natural language processing extracts: cuisine="French", location contains "Montreal"
- Returns structured search results with metadata

## Advanced: Explicit Template Override

If auto-detection doesn't work as expected, you can explicitly specify the template:

```json
{
  "tool": "create_note",
  "arguments": {
    "title": "Street Food Cart",
    "template": "tpl-restaurant",
    "customData": {
      "cuisine": "Mexican",
      "location": "Toronto, ON",
      "priceRange": "$",
      "rating": 4.0,
      "type": "Food Truck"
    }
  }
}
```

## Tips & Best Practices

1. **Use `auto_template=true` for common types**: The system recognizes keywords like "Restaurant", "Bistro", "Cafe" in titles
2. **Provide `customData` upfront**: This pre-populates template fields and reduces manual editing
3. **Use `mode="merge"` when editing**: Preserves existing frontmatter while adding new fields
4. **Search with natural language**: The `naturalLanguage` parameter extracts filters automatically

## Related Tools

- [`create_note`](../TOOLS.md#create_note) - Smart note creation with template detection
- [`edit_note`](../TOOLS.md#edit_note) - Edit existing notes and frontmatter
- [`read_note`](../TOOLS.md#read_note) - Read note content and metadata
- [`search`](../TOOLS.md#search) - Universal search with natural language support

## Troubleshooting

**Template not auto-detected?**
- Check that the title contains recognizable keywords ("Restaurant", "Bistro", etc.)
- Use explicit `template` parameter as fallback
- Verify template exists with `list(type="templates")`

**Custom YAML fields not appearing?**
- Ensure `customData` is properly formatted as an object
- Check template definition supports those fields
- Consult `get_yaml_rules` for vault-specific YAML conventions
