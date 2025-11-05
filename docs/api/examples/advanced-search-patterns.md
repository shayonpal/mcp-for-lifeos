# Example Workflow: Advanced Search Patterns

This example demonstrates powerful search capabilities including natural language queries, complex metadata filters, and YAML property matching.

## Scenario

You need to find notes across your vault using various search strategies: natural language, metadata filters, date ranges, and custom YAML properties.

## Basic Search Patterns

### Pattern 1: Natural Language Search

Use natural language to automatically extract filters:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "naturalLanguage": "Quebec barbecue restaurants",
    "maxResults": 20
  }
}
```

**How it works:**
- Automatically detects: `state="Quebec"`, `cuisine="Barbecue"`, `category="Restaurant"`
- Extracts location, category, and cuisine from natural text
- No need to specify individual filter parameters

**More natural language examples:**
```json
// Find recent AI articles
{ "naturalLanguage": "recent articles about artificial intelligence" }

// Find Italian pasta recipes
{ "naturalLanguage": "Italian pasta recipes" }

// Find project meeting notes
{ "naturalLanguage": "project meeting notes from last month" }
```

### Pattern 2: Quick Text Search

Fast full-text search across all notes:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "quick",
    "query": "architecture decision",
    "maxResults": 10
  }
}
```

**Use cases:**
- Fast keyword lookup
- Simple text matching
- No metadata filtering needed

### Pattern 3: Content Type Filtering

Find all notes of a specific type:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "content_type",
    "contentType": "Daily Note",
    "maxResults": 30
  }
}
```

## Advanced Search Patterns

### Pattern 4: Title vs Content Search

Search only in titles or only in content:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "titleQuery": "meeting",
    "contentQuery": "action items",
    "maxResults": 15
  }
}
```

**Expected Result:**
- Title must contain "meeting"
- Content must contain "action items"
- Both conditions must be satisfied

### Pattern 5: Multiple Metadata Filters

Combine multiple filters for precise results:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "contentType": "Article",
    "category": "Technology",
    "tags": ["AI", "machine-learning"],
    "people": ["John Doe"],
    "maxResults": 25
  }
}
```

**Expected Result:**
- Content type is "Article"
- Category is "Technology"
- Has either "AI" OR "machine-learning" tag (any match)
- Mentions "John Doe" in people array

### Pattern 6: Custom YAML Property Matching

Search using arbitrary YAML properties:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "yamlProperties": {
      "status": "in-progress",
      "priority": "high",
      "assignee": "jane"
    },
    "matchMode": "all",
    "maxResults": 20
  }
}
```

**Options:**
- `matchMode: "all"` - Must match ALL properties (AND logic)
- `matchMode: "any"` - Must match ANY property (OR logic)
- `arrayMode: "contains"` - Array contains value (default)
- `arrayMode: "exact"` - Array exactly matches
- `arrayMode: "any"` - Any overlap between arrays

### Pattern 7: Date Range Filtering

Find notes within specific date ranges:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "contentType": "Meeting Notes",
    "createdAfter": "2025-10-01",
    "createdBefore": "2025-10-31",
    "modifiedAfter": "2025-11-01",
    "sortBy": "modified",
    "sortOrder": "desc",
    "maxResults": 50
  }
}
```

**Expected Result:**
- Created in October 2025
- Modified in November 2025
- Sorted by modification date (newest first)

### Pattern 8: Folder Filtering with Exclusions

Search within specific folders while excluding others:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "query": "project",
    "folder": "10 - Projects",
    "excludeFolders": ["10 - Projects/Archived", "10 - Projects/Templates"],
    "maxResults": 30
  }
}
```

**Expected Result:**
- Searches in `10 - Projects` folder
- Excludes archived and template subfolders
- Useful for active project searches

### Pattern 9: Regex and Case-Sensitive Search

Use regex patterns for advanced matching:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "query": "API-\\d{3,4}",
    "useRegex": true,
    "caseSensitive": true,
    "maxResults": 20
  }
}
```

**Use cases:**
- Find issue references: `MCP-\\d+`
- Match patterns: `v\\d+\\.\\d+\\.\\d+` (version numbers)
- Email addresses: `[a-z]+@[a-z]+\\.[a-z]+`

### Pattern 10: Recent Activity Search

Find recently modified notes:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "recent",
    "days": 7,
    "contentType": "Article",
    "maxResults": 20
  }
}
```

**Expected Result:**
- Modified within last 7 days
- Only articles
- Sorted by modification date

## Complex Search Scenarios

### Scenario 1: Find Incomplete Tasks in Projects

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "query": "- [ ]",
    "folder": "10 - Projects",
    "yamlProperties": {
      "status": "in-progress"
    },
    "modifiedAfter": "2025-10-01",
    "sortBy": "modified",
    "maxResults": 50
  }
}
```

### Scenario 2: Find High-Priority Notes Missing Assignees

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "yamlProperties": {
      "priority": "high"
    },
    "includeNullValues": true,
    "maxResults": 25
  }
}
```

**Key feature:**
- `includeNullValues: true` finds notes where `assignee` field is missing/null
- Useful for finding incomplete metadata

### Scenario 3: Find Notes with Multiple Tag Matches

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "tags": ["urgent", "review-needed", "documentation"],
    "arrayMode": "any",
    "sortBy": "modified",
    "maxResults": 30
  }
}
```

**Expected Result:**
- Matches notes with ANY of the specified tags
- `arrayMode: "any"` enables OR logic for arrays

### Scenario 4: Pattern-Based File Search

Use glob patterns to find files:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "pattern",
    "pattern": "**/*recipe*italian*.md",
    "maxResults": 20
  }
}
```

**Glob patterns:**
- `**/*.md` - All markdown files
- `**/Projects/**/*.md` - All notes in Projects subfolders
- `**/*meeting*2025*.md` - Meeting notes from 2025

## Performance Optimization

### Use Concise Format for Large Results

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "query": "project",
    "format": "concise",
    "maxResults": 100
  }
}
```

**Benefits:**
- `format: "concise"` returns only titles and paths (~50-100 tokens/result)
- `format: "detailed"` returns full metadata (~200-500 tokens/result)
- Use concise for browsing, detailed for analysis

### Limit Results Intelligently

```json
{
  "tool": "search",
  "arguments": {
    "mode": "advanced",
    "query": "documentation",
    "maxResults": 25,
    "sortBy": "relevance",
    "sortOrder": "desc"
  }
}
```

**Tips:**
- Default `maxResults: 25` balances comprehensiveness and performance
- Sort by relevance to get best matches first
- Increase limit only when needed

## Tips & Best Practices

1. **Start with natural language**: Let the system extract filters automatically
2. **Use `mode: "auto"`**: Intelligent routing picks the best search strategy
3. **Combine filters progressively**: Start broad, narrow down with additional filters
4. **Leverage YAML properties**: Custom properties enable powerful filtering
5. **Sort strategically**: Use relevance for text search, modified for recent activity
6. **Test patterns incrementally**: Build complex queries step by step

## Related Tools

- [`search`](../TOOLS.md#search) - Universal search with multiple modes
- [`advanced_search`](../TOOLS.md#advanced_search) - Direct access to advanced features (legacy)
- [`quick_search`](../TOOLS.md#quick_search) - Fast text search (legacy)
- [`list_yaml_properties`](../TOOLS.md#list_yaml_properties) - Discover available properties
- [`list_yaml_property_values`](../TOOLS.md#list_yaml_property_values) - Explore property values

## Troubleshooting

**No results found?**
- Try broader query terms
- Check folder filters aren't too restrictive
- Verify YAML property names are correct
- Use `includeNullValues: true` to find missing fields

**Too many results?**
- Add more specific filters
- Use date ranges to narrow scope
- Increase specificity of text queries
- Combine multiple filter types

**Slow search performance?**
- Use `format: "concise"` for large result sets
- Reduce `maxResults` limit
- Enable folder filtering to search subset
- Avoid regex on large vaults (use simple text when possible)
