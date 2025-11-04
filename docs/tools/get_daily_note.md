# get_daily_note Tool Documentation

## Tool Overview

- **Name**: `get_daily_note`
- **Purpose**: Get or create a daily note for a specific date with intelligent date parsing
- **Status**: ✅ Active (Primary tool for daily note management)

## TL;DR

Access or create daily journal notes with natural language date parsing. Just say "today", "yesterday", "next Monday", or any date format. Automatically creates the note if missing (disable with `createIfMissing=false`).

## Key Features

- **Natural Language Date Parsing**: Understands "today", "tomorrow", "yesterday", "next week", etc.
- **Multiple Date Format Support**: ISO (YYYY-MM-DD), US (MM/DD/YYYY), European (DD/MM/YYYY)
- **Relative Date Expressions**: "3 days ago", "next Monday", "in 5 days"
- **Auto-Creation of Missing Daily Notes**: Creates notes automatically using templates
- **Optional Creation Confirmation**: Ask before creating with `confirmCreation=true`
- **Timezone-Aware Date Handling**: Uses local timezone for accurate date resolution
- **PARA Method Organization**: Follows LifeOS folder structure
- **Template-Based Note Creation**: Uses Obsidian daily note templates when available

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `date` | `string` | No | `"today"` | Date in various formats (see Date Parsing Examples) |
| `createIfMissing` | `boolean` | No | `true` | Automatically create the note if it doesn't exist |
| `confirmCreation` | `boolean` | No | `false` | Ask for confirmation before creating a new daily note |

### Date Parameter Options

The `date` parameter accepts multiple formats:

- **ISO Format**: `YYYY-MM-DD` (e.g., "2024-12-25")
- **US Format**: `MM/DD/YYYY` (e.g., "12/25/2024")
- **European Format**: `DD/MM/YYYY` (e.g., "25/12/2024")
- **Relative Keywords**: "today", "yesterday", "tomorrow"
- **Natural Language**: "next Monday", "last Friday", "3 days ago"
- **Numeric Relative**: "+1", "-3", "in 2 days"

## Date Parsing Examples

### Basic Relative Dates

```
"today"          → Current date
"yesterday"      → Previous day  
"tomorrow"       → Next day
"now"           → Current date (alias for "today")
```

### Specific Date Formats

```
"2024-12-25"    → December 25, 2024 (ISO format)
"12/25/2024"    → December 25, 2024 (US format)
"25/12/2024"    → December 25, 2024 (European format)
"Dec 25, 2024"  → December 25, 2024 (text format)
"25 Dec 2024"   → December 25, 2024 (alternative text)
```

### Natural Language Dates

```
"next Monday"    → Coming Monday
"last Friday"    → Previous Friday
"next week"      → 7 days from today
"monday"         → Next Monday (if today is not Monday)
"tuesday"        → Next Tuesday
```

### Relative Numeric Dates

```
"+1"            → Tomorrow (1 day from now)
"-3"            → 3 days ago
"3 days ago"    → 3 days before today
"in 5 days"     → 5 days from today
"5 days from now" → 5 days from today
```

### Month and Year Combinations

```
"January 15"    → January 15 of current year
"15 January"    → January 15 of current year
```

## Usage Examples

### Get Today's Daily Note

```json
{
  "name": "get_daily_note"
}
```

*Default behavior - gets or creates today's note*

### Get Yesterday's Note

```json
{
  "name": "get_daily_note",
  "arguments": {
    "date": "yesterday"
  }
}
```

### Get Note for Specific Date

```json
{
  "name": "get_daily_note",
  "arguments": {
    "date": "2024-12-25"
  }
}
```

### Create Future Planning Note

```json
{
  "name": "get_daily_note",
  "arguments": {
    "date": "next Monday"
  }
}
```

### Check if Note Exists Without Creating

```json
{
  "name": "get_daily_note",
  "arguments": {
    "date": "2024-01-01",
    "createIfMissing": false
  }
}
```

### Request Confirmation Before Creation

```json
{
  "name": "get_daily_note",
  "arguments": {
    "date": "tomorrow",
    "confirmCreation": true
  }
}
```

## Response Format

### When Note Exists

Returns the complete note content with metadata:

```
# Daily Note: January 15, 2025

**Date**: Tuesday, January 15, 2025
**Path**: 01-Inbox/Daily Notes/2025/01-January/2025-01-15.md
**Size**: 1,247 bytes

## Day's Notes
[Note content here...]

## Tasks
- [ ] Example task

📎 **Obsidian Link**: [Daily Note: January 15, 2025](obsidian://open?vault=LifeOS&file=01-Inbox%2FDaily%20Notes%2F2025%2F01-January%2F2025-01-15.md)
```

### When Note is Created

Returns the new note with template content applied:

```
# Daily Note: January 16, 2025 (Created)

**Date**: Wednesday, January 16, 2025
**Path**: 01-Inbox/Daily Notes/2025/01-January/2025-01-16.md
**Size**: 892 bytes

[Template content with YAML frontmatter and standard sections]

📎 **Obsidian Link**: [Daily Note: January 16, 2025](obsidian://open?vault=LifeOS&file=01-Inbox%2FDaily%20Notes%2F2025%2F01-January%2F2025-01-16.md)
```

### When Note Missing (createIfMissing=false)

```
Daily note for January 20, 2025 does not exist.

Use createIfMissing: true to create it automatically.
```

### When Confirmation Requested (confirmCreation=true)

```
Daily note for January 20, 2025 does not exist.

Would you like to create it? Please confirm by running the command again with confirmCreation: false or createIfMissing: true.
```

## Daily Note Structure

### File Location

Daily notes are organized using the PARA method structure:

```
01-Inbox/
  Daily Notes/
    YYYY/
      MM-Month/
        YYYY-MM-DD.md
```

**Examples**:

- `01-Inbox/Daily Notes/2025/01-January/2025-01-15.md`
- `01-Inbox/Daily Notes/2025/12-December/2025-12-25.md`

### Filename Format

All daily notes use the ISO date format: `YYYY-MM-DD.md`

### Template Content

When a daily note template is available in Obsidian:

- Uses configured daily note template
- Processes Templater syntax (date variables, etc.)
- Includes YAML frontmatter with date metadata
- Follows LifeOS YAML compliance rules

### Standard Sections

Default daily notes include:

- Date and metadata header
- Day's Notes section
- Tasks section (with checkbox format)
- Additional template sections as configured

## Error Handling

### Invalid Date Formats

When an invalid date is provided:

- Falls back to "today"
- Logs warning with original input
- Returns today's daily note
- **Example**: `get_daily_note("invalid-date")` → today's note

### Ambiguous Natural Language

For ambiguous inputs, the DateResolver attempts intelligent parsing:

- "monday" when today is Monday → next Monday
- Relative dates calculated from current date
- Malformed dates trigger fallback behavior

### File System Issues

- **Permission Errors**: Returns error message with troubleshooting
- **iCloud Sync Delays**: Automatic retry logic with exponential backoff
- **Missing Template**: Creates note without template, logs warning
- **Invalid Characters**: Sanitizes date input and filename

### Template Processing Errors

- **Missing Template File**: Creates basic daily note structure
- **Malformed Template**: Uses fallback template
- **Templater Syntax Errors**: Processes what it can, logs issues

## Implementation Details

### Core Components

**Date Resolution**: `DateResolver` class with `chrono-node` for natural language parsing

- Timezone-aware date handling using `date-fns-tz`
- Support for multiple input formats and languages
- Relative date calculation with reference date context

**Note Retrieval**: `VaultUtils.getDailyNote()` method

- iCloud sync-aware file reading
- YAML frontmatter parsing and validation
- Metadata extraction (size, modified date, etc.)

**Note Creation**: `VaultUtils.createDailyNote()` method

- Template discovery and processing via `TemplateManager`
- Dynamic content generation via `DynamicTemplateEngine`
- PARA method folder structure compliance

**Template Processing**:

- Obsidian template detection from settings
- Templater syntax processing (date variables, cursor position)
- YAML frontmatter generation and validation

### Timezone Handling

- Uses user's system timezone by default
- Converts dates to local timezone for accurate daily note resolution
- Handles daylight saving time transitions automatically
- Logs timezone information for debugging

### Performance Optimizations

- Template caching (24-hour cache duration)
- Lazy loading of DateResolver and TemplateEngine
- Efficient file system operations with retry logic
- Analytics tracking for usage patterns and optimization

## Best Practices

### For Scripts and Automation

- **Use ISO Format**: `"2025-01-15"` for predictable parsing
- **Handle Errors**: Check `createIfMissing: false` first for conditional logic
- **Batch Operations**: Check existence before creating multiple notes
- **Timezone Awareness**: Consider user's timezone for scheduled operations

### For Interactive Use

- **Natural Language**: `"today"`, `"yesterday"`, `"next Monday"` for convenience
- **Confirmation**: Use `confirmCreation: true` for destructive operations
- **Date Context**: Be specific with ambiguous dates ("next Monday" vs "Monday")

### Performance Considerations

- Template caching reduces creation time for multiple daily notes
- DateResolver instance reuse across multiple calls
- iCloud sync awareness prevents file system conflicts

### Integration Patterns

```javascript
// Check if note exists first
const checkResult = await get_daily_note({ 
  date: "2025-01-01", 
  createIfMissing: false 
});

// Then create if needed
if (checkResult.includes("does not exist")) {
  await get_daily_note({ date: "2025-01-01" });
}
```

## Related Tools

### Complementary Tools

- **`list`** with `type='daily_notes'` - List all daily notes in date range
- **`create_note_smart`** - Create other note types with intelligent template detection  
- **`insert_content`** - Add content to existing daily notes
- **`search`** - Find content across daily notes

### Workflow Integration

1. **Daily Review**: Use `get_daily_note` to access today's note
2. **Weekly Planning**: Use `get_daily_note` with "next Monday" for week prep
3. **Historical Analysis**: Use `list` to find date ranges, then `get_daily_note` for specific days
4. **Content Addition**: Use `get_daily_note` to verify note exists, then `insert_content` to add

### Common Patterns

```javascript
// Daily workflow
await get_daily_note(); // Today's note
await get_daily_note({ date: "yesterday" }); // Review yesterday

// Weekly planning  
await get_daily_note({ date: "next Monday" });
await get_daily_note({ date: "next Friday" });

// Historical review
await get_daily_note({ date: "7 days ago" });
await get_daily_note({ date: "2025-01-01" });
```

## Analytics and Monitoring

The tool automatically tracks:

- **Usage Frequency**: Daily note access patterns
- **Date Input Types**: Most common date formats used
- **Creation Rate**: How often new notes are created vs accessed
- **Performance Metrics**: Date resolution and file operation timing
- **Error Patterns**: Common parsing failures and file system issues

Analytics help optimize date parsing logic and identify usage trends for better template and folder organization.
