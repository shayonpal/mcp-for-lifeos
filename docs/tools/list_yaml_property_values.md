# list_yaml_property_values

**Status**: Active (YAML property analysis tool)  
**Purpose**: List all unique values used for a specific YAML property across the vault  
**Category**: Metadata Analysis  

## TL;DR

Discover all unique values used for any YAML property across your vault. Shows whether values are strings or arrays, usage counts, and example notes. Perfect for understanding your metadata landscape, finding inconsistencies, and standardizing your YAML properties.

## Tool Overview

The `list_yaml_property_values` tool provides comprehensive analysis of YAML property usage patterns across your entire vault. It scans all notes, extracts values for a specified property, categorizes them as single values or array elements, and provides detailed statistics and examples.

This tool is essential for:
- **Metadata Discovery**: Understanding how properties are used across your vault
- **Data Quality Audits**: Finding typos, inconsistencies, and duplicate variations
- **Standardization Projects**: Consolidating similar values and improving consistency
- **Content Analysis**: Analyzing patterns in tags, categories, people, and other metadata
- **Cleanup Operations**: Identifying orphaned or rarely-used values

## Key Features

- **Complete Value Discovery**: Lists all unique values for any YAML property
- **Type Differentiation**: Distinguishes single values from array elements
- **Usage Statistics**: Optional counting of how often each value appears
- **Example Notes**: Shows which notes use each value (configurable limit)
- **Multiple Sort Options**: Sort alphabetically, by usage, or by value type
- **Nested Property Support**: Handles dot notation for nested properties
- **Error Resilience**: Gracefully handles malformed YAML and missing properties
- **Performance Optimized**: Efficient scanning with skip logic for corrupted files

## Parameters

### Required Parameters

- **property** (string): The YAML property name to analyze
  - Simple properties: `'tags'`, `'category'`, `'people'`
  - Properties with spaces: `'content type'`, `'sub-category'`
  - Nested properties: Use dot notation if supported

### Optional Parameters

- **includeCount** (boolean, default: `false`): Include usage count for each value
  - Shows how many notes use each value
  - Useful for identifying popular vs rare values

- **includeExamples** (boolean, default: `false`): Include example note titles
  - Shows actual notes that use each value
  - Limited by `maxExamples` parameter

- **sortBy** (string, default: `'alphabetical'`): Sort method for results
  - `'alphabetical'`: Sort values A-Z
  - `'usage'`: Sort by usage count (most used first)
  - `'type'`: Group by value type (single values vs arrays)

- **maxExamples** (number, default: `3`): Maximum example notes per value
  - Limits example list length for readability
  - Only applies when `includeExamples` is true

## Property Name Formats

### Standard Properties
```bash
# Simple property names
property: "tags"
property: "category" 
property: "people"
property: "source"
```

### Properties with Spaces
```bash
# Use exact property name including spaces
property: "content type"
property: "sub-category"
property: "created date"
```

### Case Sensitivity
Property names are **case-sensitive**. These are different properties:
- `tags` vs `Tags` vs `TAGS`
- `contentType` vs `content-type` vs `content type`

### Nested Properties
For nested YAML structures, use the exact property path:
```yaml
# For this YAML structure:
metadata:
  author: "John Doe"
  
# Use the nested property name
property: "author"  # if it's a direct property
property: "metadata.author"  # if nested (implementation dependent)
```

## Response Structure

The tool returns structured information about property usage:

### Basic Response Elements
- **Property name** being analyzed
- **Total notes** containing the property
- **Scan statistics** (files scanned, skipped, processed)
- **Value type analysis** (single vs array values)

### Value Information (per unique value)
- **Value name/content**
- **Value type** (single value or array element)  
- **Usage count** (if `includeCount: true`)
- **Example notes** (if `includeExamples: true`)

### Summary Statistics
- **Total unique values** discovered
- **Type distribution** (single vs array usage)
- **Files scanned** vs **files with property**
- **Error handling** (malformed YAML, read errors)

## Usage Examples

### Basic Property Analysis
```bash
# List all tags used in vault
list_yaml_property_values property: "tags"

# Analyze content types
list_yaml_property_values property: "contentType"

# Check category usage
list_yaml_property_values property: "category"
```

### Enhanced Analysis with Counts
```bash
# Show usage statistics
list_yaml_property_values property: "tags" includeCount: true

# Find most popular content types
list_yaml_property_values property: "contentType" includeCount: true sortBy: "usage"
```

### Comprehensive Analysis with Examples  
```bash
# Full analysis with examples
list_yaml_property_values property: "people" includeCount: true includeExamples: true

# Limited examples for readability
list_yaml_property_values property: "tags" includeExamples: true maxExamples: 2

# Sort by type to see single vs array usage patterns
list_yaml_property_values property: "category" sortBy: "type" includeCount: true
```

### All Features Combined
```bash
# Maximum insight for property analysis
list_yaml_property_values property: "contentType" includeCount: true includeExamples: true sortBy: "usage" maxExamples: 3
```

## Common Properties to Analyze

### Standard LifeOS Properties
- **tags**: All tags across vault - identify popular vs orphaned tags
- **contentType**: Content type distribution - see Article, Recipe, Person ratios
- **category**: PARA categories - understand organizational patterns  
- **subCategory**: Sub-categorization patterns
- **people**: People network analysis - find frequently mentioned individuals
- **source**: Article sources - identify trusted publishers
- **status**: Task/note statuses - track completion patterns

### Content-Specific Properties
- **cuisine**: For recipe collections (restaurant types, cooking styles)
- **location**: Geographic references (cities, countries, venues)  
- **project**: Project associations for task management
- **author**: Author attribution for articles and references
- **rating**: Rating patterns for reviews and recommendations

### Custom Properties
Any custom YAML property you've created can be analyzed:
- **mood**: Emotional tags for journal entries
- **tools**: Software/tools mentioned in technical notes
- **skills**: Skill categories for learning notes  
- **topics**: Subject matter organization

## Value Type Detection

### Single Values
Properties used as simple strings:
```yaml
# Single value usage
category: "Projects"
status: "active"
priority: "high"
```

### Array Elements  
Properties used as arrays, analyzed per element:
```yaml
# Array usage - each element counted separately
tags: ["productivity", "automation", "tools"]
people: ["John Doe", "Jane Smith"]
skills: ["javascript", "typescript", "node.js"]
```

### Mixed Usage Detection
The tool identifies when the same property is used both ways:
- Notes using `tags: "single-tag"` (string)
- Notes using `tags: ["tag1", "tag2"]` (array)
- Flags these inconsistencies for standardization

### Empty Value Handling
- **Empty strings**: Counted as valid values
- **Null values**: Excluded from analysis  
- **Missing properties**: Notes without the property are excluded
- **Empty arrays**: `[]` counted as empty array usage

## Sorting Options Explained

### Alphabetical Sort (default)
- **Behavior**: A-Z ordering of value names
- **Use Case**: General browsing, finding specific values
- **Example**: "apple", "banana", "cherry"

### Usage Sort  
- **Behavior**: Most frequently used values first
- **Use Case**: Identifying popular vs rare values
- **Requires**: `includeCount: true` for meaningful results
- **Example**: "javascript" (50 uses), "python" (30 uses), "ruby" (5 uses)

### Type Sort
- **Behavior**: Groups values by how they're used (single vs array)
- **Use Case**: Understanding usage patterns and inconsistencies
- **Sections**: Single values first, then array elements
- **Benefits**: Spots mixed usage patterns quickly

## Example Discovery Features

### Note Title Examples
When `includeExamples: true`, shows actual note titles:
```markdown
- "javascript" (used in 25 notes)
  Examples: "React Hooks Tutorial", "Node.js Best Practices", "JavaScript Testing Guide"
  
- "productivity" (used in 12 notes)  
  Examples: "Getting Things Done System", "Time Blocking Method"
```

### Example Limit Control
Use `maxExamples` to control example length:
- `maxExamples: 1`: Just one example per value
- `maxExamples: 5`: Up to 5 examples (good for detailed analysis)
- `maxExamples: 10`: Comprehensive examples (may be verbose)

### Example Selection Logic
Examples are selected based on:
1. **Recent usage**: Newer notes preferred when available
2. **Alphabetical fallback**: Consistent ordering when dates similar
3. **Title uniqueness**: Avoids duplicate or very similar titles

## Implementation Details

### Scanner Architecture
- **File Discovery**: Uses VaultUtils.getYamlPropertyValues()
- **YAML Parsing**: Robust parsing with error recovery
- **Value Extraction**: Handles both single values and arrays
- **Type Categorization**: Automatic single vs array detection

### Performance Characteristics
- **Full Vault Scan**: Processes all .md files in vault
- **Memory Efficient**: Streams file processing, doesn't load all content
- **Error Recovery**: Continues processing despite individual file errors
- **Caching**: Results cached during session for repeated queries

### Error Handling
- **Malformed YAML**: Files with YAML syntax errors are skipped
- **Read Permissions**: Files that can't be read are counted as skipped
- **Missing Properties**: Notes without the property are excluded cleanly
- **Type Errors**: Non-string, non-array values handled gracefully

## Best Practices

### Before Bulk Updates
```bash
# Understand current state before changing metadata
list_yaml_property_values property: "tags" includeCount: true sortBy: "usage"

# Find standardization opportunities  
list_yaml_property_values property: "category" includeCount: true includeExamples: true
```

### Data Quality Audits
```bash
# Find typos and variants
list_yaml_property_values property: "contentType" includeCount: true

# Look for: "Article" vs "article" vs "Articles"
# Look for: "Recipe" vs "Recipes" vs "recipe"
```

### Consolidation Projects
```bash
# Identify rarely-used values for consolidation
list_yaml_property_values property: "tags" includeCount: true sortBy: "usage"

# Values with count=1 may be typos or candidates for merging
```

### Consistency Analysis
```bash
# Check for mixed usage patterns
list_yaml_property_values property: "people" sortBy: "type" includeCount: true

# If same property appears as both single and array, standardize
```

## Use Cases

### Metadata Cleanup Projects
1. **Tag Consolidation**: Find duplicate/similar tags to merge
2. **Category Standardization**: Ensure consistent category naming
3. **Typo Detection**: Spot misspelled property values  
4. **Case Consistency**: Find "Tag" vs "tag" inconsistencies

### Content Analysis
1. **Popular Topics**: Most-used tags show content focus areas
2. **Author Analysis**: Most-mentioned people in your notes
3. **Source Analysis**: Most-referenced websites/publications
4. **Content Distribution**: Balance of content types (Article vs Recipe vs Person)

### Vault Organization
1. **PARA Compliance**: Ensure categories align with PARA method
2. **Folder Strategy**: Property usage informs folder organization
3. **Template Design**: Popular properties should be in templates
4. **Workflow Optimization**: Focus on frequently-used metadata

### Quality Assurance
1. **Template Compliance**: Verify notes follow template standards
2. **Missing Metadata**: Properties that should be arrays but aren't
3. **Validation Rules**: Check if values comply with rules
4. **Data Integrity**: Ensure metadata consistency across vault

## Performance Considerations

### Vault Size Impact
- **Small vaults** (< 100 notes): Near-instant results
- **Medium vaults** (100-1000 notes): 1-3 seconds
- **Large vaults** (1000+ notes): 5-15 seconds depending on file sizes
- **Very large vaults** (5000+ notes): May take 30+ seconds

### Optimization Strategies
- **Session Caching**: Results cached until server restart
- **Property-Specific Cache**: Each property analysis cached separately  
- **Skip Logic**: Malformed files skipped quickly to avoid delays
- **Progress Indicators**: Scan statistics show processing progress

### Memory Usage
- **Efficient Processing**: Files processed individually, not loaded in bulk
- **Result Storage**: Only final analysis kept in memory
- **Garbage Collection**: Intermediate data cleaned up during processing

## Related Tools

### Discovery Tools
- **list with type='yaml_properties'**: List all available properties across vault
- **get_yaml_rules**: Understand property requirements and validation rules
- **diagnose_vault**: Check for YAML compliance issues

### Action Tools  
- **search**: Find notes with specific property values
- **edit_note**: Update property values based on analysis results
- **create_note_smart**: Use popular values when creating new notes

### Analysis Tools
- **advanced_search**: Filter by property values discovered through analysis
- **search with yamlProperties**: Find notes using specific property combinations

## Data Quality Insights

### Standardization Opportunities
```bash
# Find variations that should be standardized
list_yaml_property_values property: "contentType" includeCount: true

# Results might show:
# - "Article" (45 uses) 
# - "article" (12 uses)  ← Should be standardized to "Article"
# - "Articles" (3 uses)  ← Should be standardized to "Article"
```

### Orphaned Values (Single Use)
```bash  
# Find values used only once (potential typos)
list_yaml_property_values property: "tags" includeCount: true sortBy: "usage"

# Values with count=1 at the bottom may be:
# - Typos: "javscript" instead of "javascript"
# - Over-specific tags: "meeting-notes-jan-15" instead of "meetings"
# - Abandoned experiments: Old tag systems no longer in use
```

### Popular Pattern Discovery
```bash
# Understand your most important metadata
list_yaml_property_values property: "people" includeCount: true sortBy: "usage"

# High-count values reveal:
# - Key people in your knowledge system
# - Collaboration patterns
# - Research focuses
```

### Inconsistency Detection
```bash
# Mixed usage patterns indicate need for standardization
list_yaml_property_values property: "tags" sortBy: "type" includeCount: true

# If both single and array usage appears:
# Single: tags: "productivity" (15 uses)
# Array: tags: ["productivity", "tools"] (30 uses)
# → Standardize all to array format
```

This tool is essential for maintaining high-quality metadata and understanding the information architecture of your vault. Use it regularly to ensure consistency and discover opportunities for better organization.