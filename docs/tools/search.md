# Search Tool Documentation

## Overview

**Tool Name**: `search`  
**Purpose**: Universal search tool with intelligent auto-mode routing that consolidates all search functionality  
**Status**: ✅ Active (Primary tool for all search operations)

The `search` tool is the primary interface for all search operations in the LifeOS MCP server. It intelligently routes queries to the most appropriate search strategy while providing a unified, simplified interface for AI tool callers.

> **TL;DR**: The `search` tool is your one-stop shop for finding anything in your Obsidian vault. Just pass a `query` and it automatically figures out the best search strategy. Replaces 6 legacy search tools with intelligent auto-routing. Use `mode: 'auto'` (default) to let it decide, or specify `'advanced'`, `'quick'`, `'content_type'`, `'recent'`, or `'pattern'` for explicit control.

## Key Features

- **Intelligent Auto-Mode Detection**: Automatically determines the best search strategy based on query characteristics
- **Unified Interface**: Consolidates 6 legacy search tools into one comprehensive tool
- **Multiple Search Modes**: Supports advanced, quick, content_type, recent, and pattern search modes
- **Full-Text Search**: Searches through note content, titles, and YAML frontmatter with relevance scoring
- **YAML Property Filtering**: Flexible filtering on any YAML frontmatter property with multiple matching modes
- **Natural Language Processing**: Interprets natural language queries and extracts structured search parameters
- **Intelligent Fallbacks**: If advanced searches return no results, automatically attempts simplified fallback searches
- **Performance Optimized**: Built-in caching and optimized search algorithms

## Parameters

The `search` tool accepts a comprehensive set of parameters through the `UniversalSearchOptions` interface:

### Core Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string (optional) | Main search query - searches across titles, content, and metadata |
| `mode` | string (optional) | Search mode: `auto` (default), `advanced`, `quick`, `content_type`, `recent`, `pattern` |

### Text Search Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `contentQuery` | string | Search only within note content |
| `titleQuery` | string | Search only within note titles |
| `naturalLanguage` | string | Natural language query that gets interpreted into structured search |

### Metadata Filter Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `contentType` | string \| string[] | Filter by content type (e.g., "person", "restaurant", "article") |
| `category` | string | Filter by category |
| `subCategory` | string | Filter by sub-category |
| `tags` | string[] | Filter by tags |
| `author` | string[] | Filter by author |
| `people` | string[] | Filter by people mentioned |
| `yamlProperties` | Record<string, any> | Filter by any YAML frontmatter properties |

### YAML Matching Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `matchMode` | `all` \| `any` | How to match multiple filters: all conditions must match OR any condition can match |
| `arrayMode` | `exact` \| `contains` \| `any` | How to match array values in YAML |
| `includeNullValues` | boolean | Whether to include notes with null/missing values for filtered properties |

### Date Filter Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `createdAfter` | Date | Find notes created after this date |
| `createdBefore` | Date | Find notes created before this date |
| `modifiedAfter` | Date | Find notes modified after this date |
| `modifiedBefore` | Date | Find notes modified before this date |
| `days` | number | Find notes modified within the last N days |
| `dateStart` | string | Legacy date format (converted to `createdAfter`) |
| `dateEnd` | string | Legacy date format (converted to `createdBefore`) |

### Location Filter Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `folder` | string | Search within a specific folder |
| `excludeFolders` | string[] | Exclude specific folders from search |
| `pattern` | string | Glob pattern for file path matching (triggers pattern mode) |

### Advanced Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `caseSensitive` | boolean | Enable case-sensitive search |
| `useRegex` | boolean | Treat query as regular expression |
| `includeContent` | boolean | Include full note content in results |
| `maxResults` | number | Maximum number of results to return |
| `sortBy` | `relevance` \| `created` \| `modified` \| `title` | Sort results by specified field |
| `sortOrder` | `asc` \| `desc` | Sort order (ascending or descending) |
| `format` | `'concise'` \| `'detailed'` | Response format for context window optimization (default: `'detailed'`) |

### Response Format Options

The `format` parameter controls the level of detail in search results to optimize AI context window usage:

**`'detailed'` (default)**:
- Full metadata including score, content type, match excerpts
- Obsidian clickable links
- ~200-500 tokens per result
- Best for: Comprehensive analysis, metadata inspection, content verification

**`'concise'`**:
- Title and path only
- ~50-100 tokens per result (50-70% reduction vs detailed)
- Best for: Quick lookups, high-level browsing, large result sets, token budget constraints

**Example concise output**:
```
**1. Meeting Notes 2025-08-30** - `20 - Areas/21 - Myself/Journals/Daily/2025-08-30.md`
**2. Project Roadmap** - `10 - Projects/Project Alpha/roadmap.md`
```

**Example detailed output**:
```
**1. Meeting Notes 2025-08-30** (Score: 9.2)
*Daily Note*
3 matches: "discussed project timeline", "action items assigned", "next meeting scheduled"
`20 - Areas/21 - Myself/Journals/Daily/2025-08-30.md`
[[2025-08-30]]
```

## Search Modes

### Auto Mode (Default)

**Mode**: `auto` (default when `mode` is unspecified or set to `'auto'`)

Auto mode intelligently detects the optimal search strategy based on the provided parameters:

**Auto-Detection Logic**:
1. **Pattern Mode**: Triggered by `pattern` parameter or glob patterns (`*`, `**/`) in query
2. **Content Type Mode**: Triggered by `contentType` parameter
3. **Recent Mode**: Triggered by `days`, date parameters, or temporal keywords in query
4. **Advanced Mode**: Triggered by complex queries with multiple filters, natural language, or special operators
5. **Quick Mode**: Default for simple text queries

### Pattern Mode

**Mode**: `pattern`  
**Triggered by**: Glob patterns in query or `pattern` parameter  
**Use case**: Find files by path patterns

```javascript
// Find all restaurant notes
{ query: "**/restaurant-*.md" }

// Find notes in specific folder
{ pattern: "people/**/*.md" }
```

### Content Type Mode

**Mode**: `content_type`  
**Triggered by**: `contentType` parameter  
**Use case**: Filter by specific content types

```javascript
// Find all person notes
{ contentType: "person" }

// Find multiple content types
{ contentType: ["restaurant", "cafe"] }
```

### Recent Mode

**Mode**: `recent`  
**Triggered by**: `days` parameter, date filters, or temporal keywords  
**Use case**: Find recently modified notes

```javascript
// Notes from last 7 days
{ days: 7 }

// Notes with temporal keywords
{ query: "recent restaurant visits" }
```

### Advanced Mode

**Mode**: `advanced`  
**Triggered by**: Complex queries with multiple filters or natural language  
**Use case**: Complex searches with multiple criteria

```javascript
// Multi-filter search
{
  query: "sushi",
  contentType: "restaurant",
  tags: ["favorite"],
  category: "food"
}

// Natural language search
{ naturalLanguage: "Find Japanese restaurants I visited last month" }
```

### Quick Mode

**Mode**: `quick`  
**Triggered by**: Simple text queries without complex operators  
**Use case**: Fast text-based searches

```javascript
// Simple text search
{ query: "machine learning" }

// Multiple terms with OR
{ query: "react or vue or angular" }
```

## Usage Examples

### Simple Text Search

```javascript
// Search for "machine learning" across all notes
{
  query: "machine learning"
}
```

### Search with Content Type Filter

```javascript
// Find all restaurants mentioning "sushi"
{
  query: "sushi",
  contentType: "restaurant"
}
```

### Recent Notes Search

```javascript
// Find notes modified in the last 3 days
{
  days: 3
}

// Find recent notes with specific content
{
  query: "project update",
  days: 7
}
```

### Pattern-Based Search

```javascript
// Find all daily notes
{
  pattern: "daily-notes/**/*.md"
}

// Find specific file patterns
{
  query: "meeting-notes-*.md"
}
```

### Advanced Multi-Filter Search

```javascript
// Complex search with multiple criteria
{
  query: "API design",
  contentType: "article",
  tags: ["programming", "architecture"],
  category: "work",
  createdAfter: new Date("2024-01-01"),
  maxResults: 20,
  sortBy: "relevance"
}
```

### Natural Language Search

```javascript
// Let the system interpret the query
{
  naturalLanguage: "Show me restaurants I visited last month that I rated highly"
}
```

### YAML Property Search

```javascript
// Search by custom YAML properties
{
  yamlProperties: {
    "rating": 5,
    "visited": true,
    "cuisine": "Italian"
  },
  matchMode: "all"
}
```

## Migration from Legacy Tools

The `search` tool replaces all legacy search tools. Here's the migration guide:

| Legacy Tool | Migration |
|-------------|-----------|
| `search_notes` | Use `search` with basic query |
| `advanced_search` | Use `search` with `mode="advanced"` or auto-detection |
| `quick_search` | Use `search` with `mode="quick"` or auto-detection |
| `search_by_content_type` | Use `search` with `contentType` parameter |
| `search_recent` | Use `search` with `days` parameter |
| `find_notes_by_pattern` | Use `search` with `pattern` parameter or glob patterns |

### Migration Examples

```javascript
// OLD: search_notes({ query: "machine learning" })
// NEW: search({ query: "machine learning" })

// OLD: advanced_search({ contentType: "person", tags: ["colleague"] })
// NEW: search({ contentType: "person", tags: ["colleague"] })

// OLD: quick_search({ query: "react" })
// NEW: search({ query: "react" })

// OLD: search_by_content_type({ contentType: "restaurant" })
// NEW: search({ contentType: "restaurant" })

// OLD: search_recent({ days: 7 })
// NEW: search({ days: 7 })

// OLD: find_notes_by_pattern({ pattern: "**/*.md" })
// NEW: search({ pattern: "**/*.md" })
```

## Implementation Details

### Handler Location
- **Main Router**: `ToolRouter.routeSearch()` in `src/tool-router.ts`
- **Execution**: `ToolRouter.executeSearch()` 
- **Mode Detection**: `ToolRouter.detectSearchMode()`
- **Search Engine**: `SearchEngine.search()` in `src/search-engine.ts`

### Auto-Detection Algorithm

The auto-detection follows this priority order:

1. **Pattern Detection**: Look for glob patterns (`*`, `**/`) in query or pattern parameter
2. **Content Type Detection**: Check for `contentType` parameter
3. **Temporal Detection**: Check for date parameters or temporal keywords
4. **Complexity Detection**: Analyze query for multiple filters, operators, or natural language
5. **Default to Quick**: Simple queries default to quick search mode

### Intelligent Fallbacks

When advanced searches return no results, the system automatically attempts fallback searches:

1. **Query Simplification**: Extracts key terms from complex queries
2. **Metadata Fallback**: Uses category, subcategory, or tags as search terms
3. **Tag Fallback**: Uses tags as search terms when other methods fail
4. **Confidence Scoring**: Lower confidence scores indicate fallback results

### Performance Optimizations

- **Note Caching**: Frequently accessed notes are cached for 5 minutes
- **Smart Routing**: Avoids expensive operations when simpler searches suffice
- **Result Limiting**: Configurable result limits prevent performance issues
- **Lazy Loading**: Content is only loaded when `includeContent` is requested

## Response Format

The search tool returns an array of `SearchResult` objects:

```typescript
interface SearchResult {
  note: LifeOSNote;           // Complete note object with metadata
  score: number;              // Relevance score (0.0 - 1.0)
  matches: SearchMatch[];     // Detailed match information
  interpretation?: QueryInterpretation; // For natural language queries
}

interface SearchMatch {
  type: 'title' | 'content' | 'frontmatter'; // Where the match was found
  field?: string;             // Specific field name (for frontmatter matches)
  text: string;              // The matching text
  context: string;           // Surrounding context
  position: number;          // Position in the text
  length: number;            // Length of the match
}
```

### Example Response

```json
[
  {
    "note": {
      "path": "restaurants/sushi-zen.md",
      "frontmatter": {
        "title": "Sushi Zen",
        "content type": "restaurant",
        "rating": 5,
        "tags": ["japanese", "sushi", "favorite"]
      },
      "content": "Excellent omakase experience..."
    },
    "score": 0.95,
    "matches": [
      {
        "type": "title",
        "text": "Sushi Zen",
        "context": "Sushi Zen",
        "position": 0,
        "length": 9
      },
      {
        "type": "content",
        "text": "omakase",
        "context": "...Excellent omakase experience with...",
        "position": 45,
        "length": 7
      }
    ]
  }
]
```

## Error Handling

The search tool provides graceful error handling:

- **Invalid Parameters**: Clear error messages for malformed requests
- **File Access Errors**: Continues searching when individual files can't be read
- **Regex Errors**: Falls back to literal search when regex is invalid
- **Performance Limits**: Automatically limits results to prevent timeouts
- **Fallback Mechanisms**: Attempts simpler searches when complex ones fail

## Best Practices

### For AI Tool Callers

1. **Start Simple**: Begin with basic queries and add filters as needed
2. **Use Auto-Mode**: Let the system choose the optimal search strategy
3. **Leverage Natural Language**: Use the `naturalLanguage` parameter for complex requests
4. **Specify Result Limits**: Use `maxResults` to control response size
5. **Check Scores**: Higher scores indicate more relevant results

### For Developers

1. **Monitor Performance**: Watch for slow searches and optimize queries
2. **Use Appropriate Modes**: Choose explicit modes when auto-detection isn't optimal
3. **Handle Empty Results**: Implement proper handling for no-result scenarios
4. **Cache Results**: Consider caching search results for repeated queries
5. **Test Edge Cases**: Verify behavior with malformed or edge-case queries

## Related Documentation

- [Tool Router Implementation](../../src/tool-router.ts) - Routing logic and mode detection
- [Search Engine Implementation](../../src/search-engine.ts) - Core search functionality
- [Natural Language Processor](../../src/natural-language-processor.ts) - NLP query interpretation
- [MCP Tools Overview](README.md) - Complete tool inventory
- [Vault Utils](../../src/vault-utils.ts) - File system operations

## Analytics and Monitoring

The search tool automatically tracks usage analytics when enabled:

- **Routing Decisions**: Which mode was selected and why
- **Performance Metrics**: Execution times and result counts
- **Success Rates**: Search success vs. fallback usage
- **Client Information**: Tool caller identification for optimization

Access analytics via the analytics dashboard or server logs when `TOOL_ROUTER_TELEMETRY=true`.