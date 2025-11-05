# MCP Tools Inventory

This document provides a comprehensive overview of all MCP tools available in the LifeOS server, including their consolidation status and recommended usage.

## Tool Categories

### Search Tools

**Recommended: Use `search` for all search operations**

| Tool | Status | Description |
|------|--------|-------------|
| **search** | ✅ Active | Universal search with intelligent auto-mode routing |
| search_notes | ⚠️ Legacy | Basic metadata search → use `search` |
| advanced_search | ⚠️ Legacy | Full-text search → use `search` with mode="advanced" |
| quick_search | ⚠️ Legacy | Quick text search → use `search` with mode="quick" |
| search_by_content_type | ⚠️ Legacy | Find by content type → use `search` with mode="content_type" |
| search_recent | ⚠️ Legacy | Find recent notes → use `search` with mode="recent" |
| find_notes_by_pattern | ⚠️ Legacy | Pattern matching → use `search` with mode="pattern" |

### Note Creation Tools

**Recommended: Use `create_note` for intelligent template detection**

| Tool | Status | Description |
|------|--------|-------------|
| **create_note** | ✅ Active | Smart creation with automatic template detection |
| create_note_from_template | ⚠️ Legacy | Template-based creation → use `create_note` |

**Note:** `create_note_smart` was renamed to `create_note` (MCP-60). The old name is available as an alias in `consolidated-with-aliases` mode only.

### Listing Tools

**Recommended: Use `list` for all listing operations**

| Tool | Status | Description |
|------|--------|-------------|
| **list** | ✅ Active | Universal listing tool with auto-detection |
| list_folders | ⚠️ Legacy | List vault folders → use `list` with type="folders" |
| list_daily_notes | ⚠️ Legacy | List daily notes → use `list` with type="daily_notes" |
| list_templates | ⚠️ Legacy | List templates → use `list` with type="templates" |
| list_yaml_properties | ⚠️ Legacy | List all YAML property names → use `list` with type="yaml_properties" |

**Note:** Don't confuse `list_yaml_properties` (legacy, lists property names) with `list_yaml_property_values` (always-available, lists values for a specific property).

### Core Tools (No Duplicates)

| Tool | Description |
|------|-------------|
| **get_server_version** | Get server version and capabilities information |
| **get_yaml_rules** | Get YAML frontmatter rules for reference |
| **edit_note** | Edit existing notes in the vault |
| **read_note** | Read note content from the vault |
| **get_daily_note** | Get or create daily note for specific date |
| **diagnose_vault** | Diagnose vault issues and check for problematic files |
| **move_items** | Move notes/folders to different locations |
| **rename_note** | Rename note files with atomic transaction safety and automatic link updates |
| **insert_content** | Insert content at specific locations within notes |
| **list_yaml_property_values** | List unique values for a specific YAML property |

## Consolidation Strategy

The MCP server implements a consolidation strategy to simplify AI interactions while maintaining backward compatibility:

1. **Consolidated Tools** (`search`, `create_note`, `list`):
   - Use intelligent routing to determine the best handler
   - Accept flexible parameters that auto-detect intent
   - Reduce cognitive load on AI tool callers

2. **Legacy Tools**:
   - Marked with "[LEGACY ALIAS]" in descriptions
   - Still functional but route to consolidated tools
   - Maintained for backward compatibility

3. **Active Non-Consolidated Tools**:
   - Remain separate due to distinct functionality
   - No overlapping capabilities with other tools

## Usage Guidelines

### For AI Tool Callers

- **Always prefer consolidated tools** when available
- Use `search` instead of any legacy search variant
- Use `create_note` for note creation with templates
- Use `list` for any listing operation

### For Developers

- Legacy tools are implemented as thin wrappers around consolidated tools
- New features should be added to consolidated tools, not legacy variants
- Tool router (`src/tool-router.ts`) handles intelligent routing logic

## Tool Documentation

Individual tool documentation can be found in:

- `[tool-name].md` - Detailed documentation for each tool (coming soon)

## Related Documentation

- [`/docs/architecture/`](../architecture/) - System architecture
- [`/docs/guides/`](../guides/) - Integration guides
- [`/src/tool-router.ts`](../../src/tool-router.ts) - Tool routing implementation
