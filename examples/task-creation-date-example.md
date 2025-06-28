# Task Creation Date Example

This example demonstrates how the LifeOS MCP server automatically adds creation dates to tasks using the Obsidian Tasks Plugin format.

## Before

When you insert a task using the `insert_content` tool:

```
- [ ] Review project documentation
- [ ] Update dependencies
- [ ] Run tests
```

## After

The tasks are automatically formatted with creation dates:

```
- [ ] Review project documentation ➕ 2025-06-28
- [ ] Update dependencies ➕ 2025-06-28
- [ ] Run tests ➕ 2025-06-28
```

## Property Order

The creation date is added in the correct position according to the Obsidian Tasks Plugin property order:

1. ➕ Created
2. 🛫 Start
3. ⏳ Scheduled
4. 📅 Due
5. 🔁 Recurrence

Example with multiple properties:
```
- [ ] Important task ➕ 2025-06-28 🛫 2025-06-29 📅 2025-06-30
```

## Existing Creation Dates

If a task already has a creation date, it won't be modified:

```
Input:  - [ ] Old task ➕ 2025-06-01
Output: - [ ] Old task ➕ 2025-06-01  (unchanged)
```

## Usage with Daily Notes

This feature is particularly useful when adding tasks to daily notes:

```typescript
// Using the insert_content tool
{
  "tool": "insert_content",
  "arguments": {
    "path": "/path/to/daily/2025-06-28.md",
    "content": "- [ ] Complete code review",
    "target": { "heading": "Day's Notes" },
    "position": "end-of-section"
  }
}

// Result: Task is inserted with today's creation date
// - [ ] Complete code review ➕ 2025-06-28
```