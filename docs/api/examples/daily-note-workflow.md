# Example Workflow: Daily Note Management

This example demonstrates common daily note operations including creation, updating, and task management.

## Scenario

You want to manage your daily notes: create today's note, add tasks, update content, and search recent entries.

## Workflow Steps

### Step 1: Get or Create Today's Daily Note

Use `get_daily_note` to retrieve today's note (creates if missing):

```json
{
  "tool": "get_daily_note",
  "arguments": {
    "date": "today",
    "createIfMissing": true
  }
}
```

**Expected Result:**
- Note created at: `20 - Areas/Journal/2025-11-05.md`
- Template applied: `tpl-daily-note` (if configured)
- Returns path and creation status

### Step 2: Add Tasks to Daily Note

Use `insert_content` to add tasks to the daily note's tasks section:

```json
{
  "tool": "insert_content",
  "arguments": {
    "path": "20 - Areas/Journal/2025-11-05.md",
    "content": "- [ ] Review pull requests\n- [ ] Update project documentation\n- [ ] Team meeting at 3 PM",
    "target": {
      "heading": "Day's Notes"
    },
    "position": "end-of-section"
  }
}
```

**Important Notes:**
- Daily notes use heading **"Day's Notes"** (with apostrophe) for main content
- Tasks automatically get creation date annotations: `➕ 2025-11-05`
- Use `position: "end-of-section"` to append to the section

**Expected Result:**
```markdown
## Day's Notes

- [ ] Review pull requests ➕ 2025-11-05
- [ ] Update project documentation ➕ 2025-11-05
- [ ] Team meeting at 3 PM ➕ 2025-11-05
```

### Step 3: Add Quick Notes

Insert unstructured content to capture thoughts:

```json
{
  "tool": "insert_content",
  "arguments": {
    "path": "20 - Areas/Journal/2025-11-05.md",
    "content": "Had a great discussion about the new feature architecture. Key points:\n- Microservices approach\n- Event-driven design\n- Consider using Redis for caching",
    "target": {
      "heading": "Day's Notes"
    },
    "position": "end-of-section"
  }
}
```

### Step 4: Get Yesterday's Daily Note

Access yesterday's note for context:

```json
{
  "tool": "get_daily_note",
  "arguments": {
    "date": "yesterday",
    "createIfMissing": false
  }
}
```

**Alternative date formats:**
- `"today"`, `"yesterday"`, `"tomorrow"`
- `"+1"`, `"-3"` (relative days)
- `"2025-11-04"` (explicit date)
- `"last Monday"` (natural language)

### Step 5: Read Complete Daily Note

Read the full note with all content:

```json
{
  "tool": "read_note",
  "arguments": {
    "path": "20 - Areas/Journal/2025-11-05.md"
  }
}
```

**Expected Output:**
```yaml
---
title: November 05, 2025
contentType: Daily Note
date: 2025-11-05
tags:
  - daily
  - journal
---

## Day's Notes

- [ ] Review pull requests ➕ 2025-11-05
- [ ] Update project documentation ➕ 2025-11-05
- [ ] Team meeting at 3 PM ➕ 2025-11-05

Had a great discussion about the new feature architecture. Key points:
- Microservices approach
- Event-driven design
- Consider using Redis for caching
```

### Step 6: Search Recent Daily Notes

Find daily notes from the past week:

```json
{
  "tool": "search",
  "arguments": {
    "mode": "recent",
    "days": 7,
    "contentType": "Daily Note",
    "maxResults": 7
  }
}
```

**Expected Result:**
- Returns daily notes from last 7 days
- Sorted by modification date (most recent first)
- Includes excerpts showing recent changes

### Step 7: Update Daily Note Metadata

Add tags or metadata to daily note:

```json
{
  "tool": "edit_note",
  "arguments": {
    "path": "20 - Areas/Journal/2025-11-05.md",
    "frontmatter": {
      "mood": "productive",
      "projects": ["MCP-14", "Feature Architecture"],
      "tags": ["daily", "journal", "work"]
    },
    "mode": "merge"
  }
}
```

## Advanced: Batch Daily Note Creation

Create multiple daily notes for planning ahead:

```json
{
  "tool": "get_daily_note",
  "arguments": {
    "date": "+1",
    "createIfMissing": true
  }
}
```

Then use `insert_content` to pre-populate tomorrow's tasks:

```json
{
  "tool": "insert_content",
  "arguments": {
    "path": "20 - Areas/Journal/2025-11-06.md",
    "content": "## Planning\n\n- [ ] Review architecture decisions\n- [ ] Prepare demo presentation",
    "target": {
      "heading": "Day's Notes"
    },
    "position": "before"
  }
}
```

## Advanced: List All Daily Notes

Get a complete list of daily notes for overview:

```json
{
  "tool": "list",
  "arguments": {
    "type": "daily_notes",
    "limit": 30
  }
}
```

**Expected Result:**
- Returns paths to last 30 daily notes
- Sorted by date (most recent first)
- Useful for reporting or batch operations

## Tips & Best Practices

1. **Use relative dates**: `"today"`, `"yesterday"` are more intuitive than explicit dates
2. **Target "Day's Notes" heading**: This is the standard section for daily content
3. **Use `end-of-section` position**: Appends content without interrupting existing text
4. **Leverage automatic task dates**: The system adds ➕ dates automatically for Obsidian Tasks plugin
5. **Merge metadata**: Always use `mode="merge"` to preserve existing frontmatter

## Related Tools

- [`get_daily_note`](../TOOLS.md#get_daily_note) - Get or create daily notes
- [`insert_content`](../TOOLS.md#insert_content) - Add content to specific locations
- [`edit_note`](../TOOLS.md#edit_note) - Update note metadata
- [`read_note`](../TOOLS.md#read_note) - Read complete note content
- [`search`](../TOOLS.md#search) - Find notes with filters
- [`list`](../TOOLS.md#list) - List daily notes overview

## Troubleshooting

**Daily note not found?**
- Ensure daily notes folder is configured: `20 - Areas/Journal/`
- Check date format is correct: `YYYY-MM-DD`
- Verify template exists with `list(type="templates")`

**Content inserted at wrong location?**
- Use exact heading text: `"Day's Notes"` (with apostrophe)
- Try `position: "end-of-section"` instead of `"after"`
- Check heading hierarchy (use ##, not #)

**Tasks not getting creation dates?**
- Ensure content starts with `- [ ]` format
- Check Obsidian Tasks plugin is installed
- Existing dates won't be overwritten
