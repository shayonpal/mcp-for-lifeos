# insert_content Tool

**Tool Name:** `insert_content`  
**Status:** Active (Advanced content manipulation tool)  
**Purpose:** Insert content at specific locations within a note based on headings, block references, or text patterns

## TL;DR

Surgical content insertion at precise locations. Target by heading, block reference, pattern, or line number. Choose position relative to target (before, after, append, prepend, end-of-section). Perfect for adding to daily notes' "Day's Notes" section or appending items to task lists.

## Key Features

- **Multiple targeting methods**: heading, block reference, pattern, line number
- **Flexible positioning options**: before, after, append, prepend, end-of-section  
- **Preserves existing content and formatting**: Smart newline handling and structure awareness
- **Note selection by path or title**: Find notes flexibly
- **Section-aware insertion**: Understands markdown heading hierarchy
- **List-aware insertion**: Maintains proper list formatting and indentation

## Parameters

### Required Parameters

- **content** (`string`): Content to insert

### Required Target (one of)

- **target** (`object`): Target location for insertion
  - **heading** (`string`): Heading text to target (e.g., "## Today's Tasks")
  - **blockRef** (`string`): Block reference ID (e.g., "^block-id")
  - **pattern** (`string`): Text pattern to search for
  - **lineNumber** (`number`): Specific line number (1-based)

### Optional Parameters

- **path** (`string`): Path to the note file (absolute or relative)
- **title** (`string`): Note title (alternative to path)
- **position** (`string`, default: `"after"`): Where to insert relative to target
  - `'before'`: Before the target
  - `'after'`: After the target (default)
  - `'append'`: At end of file
  - `'prepend'`: At beginning of file
  - `'end-of-section'`: At end of heading section
- **ensureNewline** (`boolean`, default: `true`): Ensure proper line breaks

## Target Methods

### Heading

Match markdown headings with exact text match. The heading level matters:

- Target: `"## Tasks"` will match `## Tasks` but not `# Tasks`
- Case-sensitive matching required
- Apostrophes matter: `"Day's Notes"` ≠ `"Days Notes"`

### Block Reference

Target Obsidian block IDs:

- Use with or without caret: `"^block-id"` or `"block-id"`
- Searches for blocks at end of lines: `Some text ^block-id`

### Pattern

Search for specific text anywhere in the document:

- Exact string matching
- Case-sensitive
- First occurrence used

### Line Number

Insert at specific line (1-based indexing):

- Must be within document bounds
- Useful for precise positioning

## Position Options Explained

### before

Insert immediately before the target line:

```markdown
## Tasks
[INSERTED CONTENT HERE]
- Existing task
```

### after (default)

Insert immediately after the target line:

```markdown
## Tasks
[INSERTED CONTENT HERE]
- Existing task
```

### append

Add to end of file (ignores target):

```markdown
## Tasks
- Existing task

[INSERTED CONTENT HERE]
```

### prepend  

Add to beginning of file (ignores target):

```markdown
[INSERTED CONTENT HERE]

## Tasks
- Existing task
```

### end-of-section

Insert at end of heading's content section:

```markdown
## Tasks
- Existing task 1
- Existing task 2
[INSERTED CONTENT HERE]

## Next Section
```

## Daily Notes Special Case

LifeOS daily notes commonly use the heading **"Day's Notes"** (with apostrophe) for main content:

```markdown
# 2024-01-15

## Day's Notes
Morning thoughts and observations.
[INSERT HERE - end of section]

## Tasks  
- Daily tasks here

## Meeting Notes
```

**Common daily note sections:**

- "Day's Notes" (main journal content)
- "Tasks" or "Today's Tasks"
- "Meeting Notes"
- "Reflections"

## Usage Examples

### Insert into Daily Note's "Day's Notes" Section

```json
{
  "title": "2024-01-15",
  "content": "Had an interesting conversation with the team about the new architecture.",
  "target": {
    "heading": "## Day's Notes"
  },
  "position": "end-of-section"
}
```

### Add Task to "Tasks" Heading

```json
{
  "path": "Projects/Project Alpha.md", 
  "content": "- [ ] Review API documentation",
  "target": {
    "heading": "## Tasks"
  },
  "position": "end-of-section"
}
```

### Insert After Specific Pattern

```json
{
  "title": "Meeting Notes",
  "content": "\n**Action Items:**\n- Follow up with client\n- Update project timeline",
  "target": {
    "pattern": "## Decisions Made"
  },
  "position": "after"
}
```

### Add Content at Line Number

```json
{
  "path": "draft.md",
  "content": "**Important:** This section needs review.",
  "target": {
    "lineNumber": 10
  },
  "position": "before"
}
```

### Append to End of File

```json
{
  "title": "Research Notes",
  "content": "\n## References\n- [Study on X](https://example.com)",
  "target": {
    "heading": "## Summary"
  },
  "position": "append"
}
```

## Heading Matching

### Exact Text Match Required

- **Correct**: `"## Tasks"` matches `## Tasks`
- **Incorrect**: `"Tasks"` does NOT match `## Tasks`
- **Incorrect**: `"## tasks"` does NOT match `## Tasks` (case-sensitive)

### Apostrophes Matter

- **Correct**: `"Day's Notes"` matches `## Day's Notes`  
- **Incorrect**: `"Days Notes"` does NOT match `## Day's Notes`

### Heading Level Included

- **Correct**: `"## Tasks"` matches `## Tasks`
- **Incorrect**: `"# Tasks"` does NOT match `## Tasks`
- **Incorrect**: `"### Tasks"` does NOT match `## Tasks`

## Error Handling

### Target Not Found

When a heading, pattern, or block reference isn't found, the tool provides helpful suggestions:

- Lists all available headings in the document
- Suggests similar headings (handles common variations like "Day's Notes" vs "Days Notes")
- Shows line numbers for debugging

### Invalid Line Number

- Error if line number is out of range (< 1 or > document length)
- Clear error message with valid range

### Note Not Found  

- When using `title` parameter, searches with quickSearch
- Error if no matching note found
- Suggests checking note title spelling

### Multiple Matching Patterns

- Uses first occurrence found
- Consider using more specific patterns for precision

### Corrupted Block References

- Error if block reference format is invalid
- Suggests proper format: `^block-id`

## Implementation Details

### Note Discovery

- **By title**: Uses `SearchEngine.quickSearch()` for fuzzy matching
- **By path**: Direct file system access with path normalization
- **Path handling**: Supports both absolute and vault-relative paths

### Content Insertion Engine  

- **Core method**: `VaultUtils.insertContent()`
- **Pattern matching**: Exact string search with case sensitivity
- **Section detection**: Parses markdown heading hierarchy to find section boundaries

### Smart List Detection

- Detects list items in content: `-`, `*`, `1.`, `- [ ]`, etc.
- When inserting list items, finds existing lists in target section
- Maintains proper indentation and list formatting
- Handles nested lists with appropriate spacing

### Section Boundary Detection

For `end-of-section` position:

1. Find target heading and its level (e.g., `## Tasks` = level 2)
2. Scan forward until next heading of same or higher level
3. Insert content before that boundary
4. Handle end-of-document gracefully

## Best Practices

### Read Note First

Always use `read_note` before insertion to verify:

- Target heading/pattern exists
- Current document structure
- Appropriate insertion point

### Use Specific Headings

Avoid ambiguous headings:

- **Good**: `"## Project Alpha Tasks"`
- **Risky**: `"## Tasks"` (if multiple task sections exist)

### Test After Insertion

Use `read_note` after insertion to verify:

- Content was placed correctly
- Formatting was preserved
- No unintended side effects

### Use end-of-section for Sections

When adding to existing sections (like task lists):

```json
{
  "target": { "heading": "## Tasks" },
  "position": "end-of-section"
}
```

## Common Use Cases

### Daily Journaling

**Scenario**: Add thoughts to today's "Day's Notes" section

```json
{
  "title": "2024-01-15", 
  "content": "Realized the importance of user feedback in our design process.",
  "target": { "heading": "## Day's Notes" },
  "position": "end-of-section"
}
```

### Task Management

**Scenario**: Add new task to existing task list

```json
{
  "path": "Projects/Website Redesign.md",
  "content": "- [ ] Create wireframes for mobile layout", 
  "target": { "heading": "## Sprint Tasks" },
  "position": "end-of-section"
}
```

### Meeting Notes

**Scenario**: Insert agenda item results under specific heading

```json
{
  "title": "Weekly Team Meeting - Jan 15",
  "content": "**Decision**: Will proceed with React migration",
  "target": { "heading": "### Technical Discussion" },
  "position": "end-of-section"
}
```

### Research Notes

**Scenario**: Append findings to research document

```json
{
  "path": "Research/Market Analysis.md",
  "content": "### Key Finding\nCustomers prefer mobile-first approach (78% survey response)",
  "target": { "heading": "## Research Results" }, 
  "position": "end-of-section"
}
```

### Template Completion

**Scenario**: Fill in template placeholders

```json
{
  "title": "Project Kickoff Template",
  "content": "**Timeline**: 6 weeks\n**Budget**: $50,000\n**Team Size**: 4 developers", 
  "target": { "pattern": "[PROJECT_DETAILS]" },
  "position": "after"
}
```

## Performance Considerations

### Large File Handling

- Tool loads entire file into memory for processing
- Performance may degrade with very large documents (>1MB)
- Consider breaking large documents into smaller sections

### Pattern Search Efficiency  

- Simple string search is O(n) where n = document size
- For frequent insertions, consider more specific targets
- Block references are faster than pattern searches

### Section Boundary Detection

- Requires parsing entire document to find section end
- Cached during single operation but not between operations
- More expensive than simple line-based insertion

## Related Tools

### read_note

**Use before insert_content**:

- Verify target exists in document
- Understand current document structure
- Plan insertion strategy

**Use after insert_content**:

- Confirm content was inserted correctly
- Verify formatting preserved

### edit_note  

**Alternative for**:

- Replacing entire content sections
- Modifying YAML frontmatter
- Complete document restructuring

### get_daily_note

**Use together**:

- Create daily note if it doesn't exist
- Then use insert_content to add entries

### search

**Use together**:

- Find notes that need content insertion
- Identify patterns across multiple documents
- Discover similar content for consistency

## Advanced Examples

### Chain Insertions for Complex Updates

```json
// First insertion
{
  "title": "Project Status", 
  "content": "## New Updates",
  "target": { "heading": "## Current Status" },
  "position": "after"
}

// Second insertion  
{
  "title": "Project Status",
  "content": "- Backend API completed\n- Frontend 80% done", 
  "target": { "heading": "## New Updates" },
  "position": "end-of-section"
}
```

### Template Variable Replacement

```json
{
  "path": "templates/meeting-template.md",
  "content": "January 15, 2024",
  "target": { "pattern": "{{DATE}}" }, 
  "position": "after"
}
```

### Structured Data Insertion

```json
{
  "title": "Contact Database",
  "content": "| John Doe | john@example.com | (555) 123-4567 |",
  "target": { "pattern": "| Name | Email | Phone |" },
  "position": "after"  
}
```

### Multi-Section Updates

```json
// Add to multiple sections in sequence
[
  {
    "title": "Project Report",
    "content": "- Milestone 3 completed ahead of schedule",
    "target": { "heading": "## Achievements" },
    "position": "end-of-section"
  },
  {
    "title": "Project Report", 
    "content": "- Resource allocation for Phase 2",
    "target": { "heading": "## Next Steps" },
    "position": "end-of-section"
  }
]
```

## Troubleshooting

### "Heading not found" Error

1. **Check exact heading format**: Include `##` and proper spacing
2. **Verify case sensitivity**: "Tasks" ≠ "tasks"  
3. **Check for typos**: Especially apostrophes in "Day's Notes"
4. **Use read_note first**: Confirm heading exists and get exact format

### Content Not Appearing Where Expected

1. **Wrong position parameter**: Try different position values
2. **Multiple matching targets**: Pattern might match unexpected location
3. **Section boundary confusion**: Use line numbers for debugging
4. **Formatting issues**: Check if content needs newlines

### List Formatting Not Preserved

1. **Check content format**: Ensure list markers match existing format
2. **Position setting**: Use "end-of-section" for list continuation
3. **Indentation**: Manually specify indentation if needed
4. **Mixed list types**: Stick to consistent markers (- vs * vs 1.)

### Performance Issues

1. **Large documents**: Consider document size limits
2. **Complex patterns**: Use simpler, more specific targets  
3. **Frequent insertions**: Batch operations when possible
4. **Section detection**: Use line numbers for faster insertion

## Version History

- **v1.7.0**: Current implementation with full feature set
- **Key features**: Heading matching, block references, pattern search, position options
- **Recent improvements**: Enhanced error messages, section boundary detection, list-aware insertion
- **Future enhancements**: Multiple match handling, format preservation improvements

## See Also

- [Use Cases Documentation](../specs/use-cases/insert-content-usecases.md)
- [Implementation Plan](../specs/implementation/insert-content-implementation-plan.md)  
- [Related Tools](README.md)
- [VaultUtils API](../../src/modules/files/vault-utils.ts)
