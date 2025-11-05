# LifeOS MCP Workflow Examples

This directory contains practical workflow examples demonstrating common use cases and patterns for the LifeOS MCP server.

## Available Examples

### 1. [Creating Restaurant Notes](./creating-restaurant-note.md)
Learn how to create restaurant notes with automatic template detection and custom YAML properties.

**Key concepts:**
- Auto-template detection
- Custom YAML data
- Template override
- Metadata management

**Tools covered:** `create_note`, `read_note`, `edit_note`, `search`

---

### 2. [Daily Note Workflow](./daily-note-workflow.md)
Master daily note management including creation, task tracking, and content organization.

**Key concepts:**
- Creating and accessing daily notes
- Task management with automatic dates
- Content insertion strategies
- Recent note discovery

**Tools covered:** `get_daily_note`, `insert_content`, `edit_note`, `read_note`, `search`, `list`

---

### 3. [Advanced Search Patterns](./advanced-search-patterns.md)
Explore powerful search capabilities including natural language queries and complex filters.

**Key concepts:**
- Natural language search
- Multiple metadata filters
- YAML property matching
- Date range filtering
- Pattern-based search
- Performance optimization

**Tools covered:** `search` (all modes), `advanced_search`, `quick_search`

---

### 4. [Batch Operations and Note Organization](./batch-operations.md)
Efficiently move and organize multiple notes and folders.

**Key concepts:**
- Single and batch moves
- Folder operations
- Archiving workflows
- Merge strategies
- Safety best practices

**Tools covered:** `move_items`, `search`, `read_note`, `list`

---

### 5. [YAML Property Management](./yaml-property-management.md)
Discover, analyze, and manage YAML frontmatter properties across your vault.

**Key concepts:**
- Property discovery
- Value analysis
- Standardization workflows
- Property migration
- Convention documentation

**Tools covered:** `list_yaml_properties`, `list_yaml_property_values`, `search`, `edit_note`

---

## How to Use These Examples

Each example follows this structure:

1. **Scenario**: Real-world use case description
2. **Workflow Steps**: Step-by-step instructions with tool calls
3. **Expected Results**: What to expect from each operation
4. **Advanced Scenarios**: Complex multi-step workflows
5. **Tips & Best Practices**: Practical recommendations
6. **Troubleshooting**: Common issues and solutions

## Tool Parameters Format

All examples use JSON format for tool parameters:

```json
{
  "tool": "tool_name",
  "arguments": {
    "parameter1": "value",
    "parameter2": ["array", "values"],
    "parameter3": {
      "nested": "object"
    }
  }
}
```

## Quick Reference

### By Task

- **Creating notes**: Examples 1, 2
- **Searching notes**: Example 3
- **Organizing notes**: Example 4
- **Managing metadata**: Examples 1, 5
- **Daily workflows**: Example 2

### By Skill Level

- **Beginner**: Examples 1, 2
- **Intermediate**: Examples 3, 4
- **Advanced**: Example 5

## Additional Resources

- [Complete API Reference](../TOOLS.md) - Full documentation of all tools
- [Tool JSON Schema](../tool-schemas.json) - Machine-readable schemas
- [Configuration Guide](../../guides/CONFIGURATION.md) - Server setup
- [Integration Guide](../../guides/INTEGRATIONS.md) - Client integrations

## Contributing Examples

Have a useful workflow to share? Examples should:

1. Address a real-world use case
2. Include step-by-step instructions
3. Show expected results
4. Provide troubleshooting guidance
5. Follow the established structure

## Feedback

Found an issue or have suggestions? Please open an issue on [GitHub](https://github.com/shayonpal/mcp-for-lifeos/issues).
