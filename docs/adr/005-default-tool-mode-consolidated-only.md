# ADR-005: Default TOOL_MODE Changed to 'consolidated-only'

**Status**: Accepted  
**Date**: 2025-10-23  
**Deciders**: Lead Developer  
**Technical Story**: Linear Issue MCP-60 - Add configuration flag to hide legacy LifeOS MCP tools

## Context and Problem Statement

Following the implementation of MCP-60, which introduced the `TOOL_MODE` configuration flag with three modes (`legacy-only`, `consolidated-only`, `consolidated-with-aliases`), the initial default was set to `'consolidated-with-aliases'` to maximize backward compatibility. This default required users to explicitly set `TOOL_MODE=consolidated-only` in their MCP client configurations to achieve a cleaner tool list.

**Key Issues**:

- Default tool list showed 24 tools (13 consolidated + 11 legacy aliases) which was overwhelming in MCP clients
- Legacy aliases marked with `[LEGACY ALIAS]` created confusion in tool lists
- Users needed to add environment variable configuration for the recommended setup
- The cleaner 13-tool experience required explicit opt-in rather than being the default

**User Feedback**:

- Strong preference for cleaner tool list by default (no legacy aliases)
- Legacy aliases were primarily needed for backward compatibility, not new usage
- Configuration should optimize for new users while allowing legacy users to opt-in

## Decision Drivers

### Primary Goals

- **Improved UX**: Cleaner MCP client tool list for typical usage
- **Zero Configuration**: No environment variables needed for recommended setup
- **Backward Compatibility**: Legacy users can still access old tool names via configuration
- **Developer Experience**: Focus tool list on consolidated tools (search, create_note_smart, list)

### Technical Considerations

- Consolidated tools provide 100% functionality of legacy tools
- Legacy aliases exist only for backward compatibility
- MCP clients show all registered tools, so fewer tools = better UX
- Environment variable configuration still available for edge cases

## Considered Options

### Option 1: Keep 'consolidated-with-aliases' Default (Original)

- **Pros**: Maximum backward compatibility, no breaking changes
- **Cons**: Requires configuration for optimal UX, tool list bloat, confusing [LEGACY ALIAS] markers
- **Risk**: Low - maintains status quo

### Option 2: Change Default to 'consolidated-only' (Selected)

- **Pros**: Better default UX, no configuration needed, cleaner tool list, focuses on modern tools
- **Cons**: Users with legacy tool dependencies need to update configuration
- **Risk**: Low - legacy users can opt back in easily

### Option 3: Remove Legacy Aliases Entirely

- **Pros**: Simplest implementation, forces migration to consolidated tools
- **Cons**: Breaking change for existing users, no migration path
- **Risk**: High - would break existing workflows without fallback

## Decision Outcome

**Chosen Option**: Change default TOOL_MODE to 'consolidated-only'

**Implementation Changes**:

```typescript
// src/index.ts - Three locations updated:

// Line 130: Invalid TOOL_MODE fallback
return {
  mode: 'consolidated-only',  // Changed from 'consolidated-with-aliases'
  usedLegacyFlag: false,
  rawToolMode
};

// Line 139: CONSOLIDATED_TOOLS_ENABLED backward compatibility
const mode = rawConsolidatedFlag === 'false' ? 'legacy-only' : 'consolidated-only';  // Changed

// Line 149: Default when no configuration
return {
  mode: 'consolidated-only',  // Changed from 'consolidated-with-aliases'
  usedLegacyFlag: false
};
```

**Configuration Simplification**:

- Removed `TOOL_MODE=consolidated-only` from example configurations
- Default MCP client setup now requires zero environment variables
- Legacy users can add `TOOL_MODE=consolidated-with-aliases` to restore old behavior

### Tool Registration Impact

**Default Behavior (consolidated-only: 13 tools total)**:

- **Consolidated Tools (3)**: search, create_note, list
- **Always Available (10)**: get_server_version, get_yaml_rules, read_note, edit_note, get_daily_note, diagnose_vault, move_items, rename_note, insert_content, list_yaml_property_values

**Legacy Aliases Hidden by Default (11)**:

- search_notes, advanced_search, quick_search, search_by_content_type
- search_recent, find_notes_by_pattern, create_note_from_template
- list_folders, list_daily_notes, list_templates, list_yaml_properties

**Legacy-Only Mode (21 tools)**:

- All original legacy tools without consolidated versions

**Opt-In to Legacy (via TOOL_MODE=consolidated-with-aliases: 24 tools)**:

- Shows all tools (13 consolidated + 11 legacy aliases)

## Consequences

### Positive

- **Better Default UX**: Clean 13-tool list in MCP clients (no [LEGACY ALIAS] markers)
- **Zero Configuration**: Recommended setup works out of the box
- **Focused Tool List**: AI agents see only modern consolidated tools
- **Simpler Documentation**: No need to explain TOOL_MODE in basic setup

### Negative

- **Migration Required**: Users upgrading from pre-MCP-60 who used legacy tool names must either:
  - Update tool calls to use consolidated tools (recommended)
  - Set `TOOL_MODE=consolidated-with-aliases` in configuration
- **Documentation Updates**: Need to clarify new default in upgrade guides
- **Testing Impact**: Default test scenarios now use consolidated-only mode

### Technical Trade-offs

- **User Experience vs Backward Compatibility**: Prioritized better default UX over maximum compatibility
- **Configuration Simplicity vs Migration**: Accepted one-time migration cost for ongoing simplicity
- **Tool Count vs Functionality**: No loss of functionality, only change in default tool visibility

## Implementation Notes

### Tool Renaming (Added during implementation)

During implementation, `create_note_smart` was renamed to `create_note` to simplify the API:

- **Rationale**: The smart creation tool with template auto-detection provides all functionality of the basic `create_note`, making the basic version redundant
- **Behavior**: When no template matches, `create_note` falls back to manual note creation
- **Impact**: Consolidated-only mode initially reduced from 13 to 12 tools (one less always-available tool), but was later increased back to 13 tools when `rename_note` was added as an always-available tool

**Tool Consolidation:**

- ✅ `create_note` - Smart creation with template detection (replaces both `create_note_smart` and basic `create_note`)
- ⚠️ `create_note_from_template` - Moved to legacy tools (available in legacy-only and consolidated-with-aliases modes)

### Tool Organization Fixes

Fixed tool registration bugs discovered during implementation:

1. **Always-available tools** moved out of legacy conditional:
   - `get_daily_note`, `diagnose_vault`, `move_items`, `insert_content`

2. **Legacy tools** properly categorized:
   - `create_note_from_template` moved from always-available to legacy section

**Final Always-Available Tools (10 total):**

- `get_server_version`, `get_yaml_rules`, `read_note`, `edit_note`
- `get_daily_note`, `diagnose_vault`, `move_items`, `rename_note`, `insert_content`
- `list_yaml_property_values`

## Migration Guide

### For Users Upgrading from Pre-MCP-60

#### Option 1: Migrate to Consolidated Tools (Recommended)

```jsonc
// Old approach (still works with TOOL_MODE=consolidated-with-aliases)
{
  "tool": "search_notes",
  "arguments": { "query": "meeting notes" }
}

// New approach (works with default TOOL_MODE=consolidated-only)
{
  "tool": "search",
  "arguments": { "mode": "auto", "query": "meeting notes" }
}

// create_note_smart renamed to create_note
{
  "tool": "create_note",
  "arguments": { "title": "Meeting Notes" }  // Auto-detects templates
}
```

#### Option 2: Restore Legacy Aliases

```json
// In Claude Desktop config.json or equivalent MCP client
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["/path/to/build/index.js"],
      "env": {
        "VAULT_PATH": "/path/to/vault",
        "TOOL_MODE": "consolidated-with-aliases"  // Restores all 24 tools
      }
    }
  }
}
```

### Tool Mapping Reference

| Legacy Tool | Consolidated Equivalent |
|-------------|------------------------|
| `search_notes` | `search` (mode: "auto") |
| `advanced_search` | `search` (mode: "advanced") |
| `quick_search` | `search` (mode: "quick") |
| `search_by_content_type` | `search` (type: "area/resource/project") |
| `search_recent` | `search` (mode: "recent") |
| `find_notes_by_pattern` | `search` (mode: "pattern") |
| `create_note_from_template` | `create_note` (auto-detects templates) |
| `list_folders` | `list` (mode: "folders") |
| `list_daily_notes` | `list` (mode: "daily-notes") |
| `list_templates` | `list` (mode: "templates") |
| `list_yaml_properties` | `list` (mode: "yaml-properties") |

## Monitoring and Success Indicators

### Metrics to Track

- **User Support Requests**: Monitor migration assistance needs
- **Configuration Pattern**: Percentage of users setting TOOL_MODE explicitly
- **Tool Usage Analytics**: Verify consolidated tools receiving expected traffic
- **Documentation Views**: Track access to migration guide

### Success Criteria

- <10% of users need to set TOOL_MODE=consolidated-with-aliases
- Zero loss of functionality reported
- Improved onboarding experience for new users
- Positive feedback on cleaner tool list

## Future Considerations

### Potential Next Steps

1. **Legacy Removal Timeline**: Consider removing legacy aliases in a future major version (v2.0)
2. **Tool Consolidation Expansion**: Apply similar patterns to other tool categories
3. **Dynamic Tool Registration**: Explore runtime tool visibility configuration (MCP protocol permitting)

### Cycle 10 Deprecation Plan

- **CONSOLIDATED_TOOLS_ENABLED** flag will be removed (already deprecated)
- Only `TOOL_MODE` will control tool visibility
- Users must migrate to `TOOL_MODE` before Cycle 10

## Related Decisions

- **ADR-003**: Search Tool Consolidation and Intelligent Fallback Strategy (informed tool design)
- **ADR-002**: Strategic Pivot to Core Server (prioritized user experience over compatibility)
- **Linear MCP-60**: Configuration flag implementation providing the foundation for this change

## Links

- **Implementation**: `src/index.ts` (parseToolMode function, lines 125-152)
- **Contracts**: `dev/contracts/MCP-60-contracts.ts` (behavioral contracts)
- **Migration Guide**: README.md (tool migration section)
- **Configuration Docs**: `docs/guides/CONFIGURATION.md` (TOOL_MODE documentation)
- **Linear Issue**: MCP-60 - Add configuration flag to hide legacy LifeOS MCP tools

---

*This ADR establishes the new default tool visibility mode, prioritizing user experience and configuration simplicity while maintaining full backward compatibility through explicit opt-in.*
