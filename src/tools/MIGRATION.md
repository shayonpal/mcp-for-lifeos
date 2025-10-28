# Tool Implementation Mapping

This document tracks the migration of tool implementations from `src/index.ts` to `src/tools/*`.

## Status Legend
- ✅ Extracted and tested
- 🚧 In progress
- ⏳ Pending

## Consolidated Tools (AI-Optimized)

| Tool Name | Status | Target Module | Line in index.ts | Notes |
|-----------|--------|---------------|------------------|-------|
| `search` | ✅ | `tools/search.ts` | N/A (extracted) | Universal search with token budget |
| `create_note` | ✅ | `tools/create-note.ts` | N/A (extracted) | Smart creation with template detection |
| `list` | ✅ | `tools/list.ts` | N/A (extracted) | Universal list with sub-types |

## Utility/Management Tools

| Tool Name | Status | Target Module | Line in index.ts | Notes |
|-----------|--------|---------------|------------------|-------|
| `diagnose_vault` | ✅ | `tools/utils/diagnose-vault.ts` | N/A (extracted) | Vault health diagnostics |
| `move_items` | ✅ | `tools/utils/move-items.ts` | N/A (extracted) | Note/folder relocation |
| `insert_content` | ⏳ | `tools/utils/insert-content.ts` | ~1867 | Content insertion with targeting |
| `get_server_version` | ⏳ | `tools/utils/server-version.ts` | ~1499 | Server info and capabilities |
| `get_yaml_rules` | ⏳ | `tools/utils/yaml-rules.ts` | ~1530 | YAML validation rules |
| `read_note` | ⏳ | `tools/utils/read-note.ts` | ~1605 | Note reading |
| `edit_note` | ⏳ | `tools/utils/edit-note.ts` | ~1630 | Note editing |
| `get_daily_note` | ⏳ | `tools/utils/daily-note.ts` | ~1712 | Daily note access |
| `list_yaml_properties` | ⏳ | `tools/utils/yaml-properties.ts` | ~2311 | List YAML properties |
| `list_yaml_property_values` | ⏳ | `tools/utils/yaml-property-values.ts` | ~2379 | List property values |
| `list_templates` | ⏳ | `tools/utils/list-templates.ts` | ~2108 | Template listing |

## Legacy Tools

### Legacy Search Tools (Aliases to Consolidated)

| Tool Name | Status | Target Module | Line in index.ts | Notes |
|-----------|--------|---------------|------------------|-------|
| `search_notes` | ⏳ | `tools/legacy/search-notes.ts` | ~1286 | Redirects to consolidated search |
| `advanced_search` | ⏳ | `tools/legacy/advanced-search.ts` | ~1858 | Advanced search variant |
| `quick_search` | ⏳ | `tools/legacy/quick-search.ts` | ~1951 | Quick search variant |
| `search_by_content_type` | ⏳ | `tools/legacy/search-content-type.ts` | ~1984 | Content type filter |
| `search_recent` | ⏳ | `tools/legacy/search-recent.ts` | ~2013 | Recent notes search |
| `find_notes_by_pattern` | ⏳ | `tools/legacy/find-by-pattern.ts` | ~1811 | Pattern matching |

### Legacy Create/List Tools

| Tool Name | Status | Target Module | Line in index.ts | Notes |
|-----------|--------|---------------|------------------|-------|
| `create_note_from_template` | ⏳ | `tools/legacy/create-from-template.ts` | ~1367, ~1568 | Template-based creation (2 implementations) |
| `list_folders` | ⏳ | `tools/legacy/list-folders.ts` | ~1404, ~1791 | Folder listing (2 implementations) |
| `list_daily_notes` | ⏳ | `tools/legacy/list-daily-notes.ts` | ~1405, ~1827 | Daily notes listing (2 implementations) |
| `list_templates` | ⏳ | `tools/legacy/list-templates-legacy.ts` | ~1406 | Template listing (legacy variant) |
| `list_yaml_properties` | ⏳ | `tools/legacy/list-yaml-props-legacy.ts` | ~1407 | YAML properties (legacy variant) |

## Implementation Notes

### Consolidated Tools
- All consolidated tools have been extracted
- Token budget management is implemented via `ResponseTruncator`
- Tool mode validation is handled via `validateToolMode` from `shared.ts`
- All extracted tools verified with test suite (331 passing tests)

### Legacy Tools
- Many legacy tools are aliases that route to consolidated tools
- Some have duplicate implementations in different switch case blocks
- Need to identify which implementation to preserve

### Utility Tools
- Most utility tools are standalone and don't require mode validation
- insert_content is complex with multiple targeting options
- YAML-related tools have cross-dependencies

## Next Steps

1. **Phase 1**: Extract remaining utility tools
   - `insert_content` (highest priority - complex targeting logic)
   - `read_note`, `edit_note`, `get_daily_note` (note management)
   - YAML tools (`get_yaml_rules`, `list_yaml_properties`, `list_yaml_property_values`)
   - `get_server_version`, `list_templates`

2. **Phase 2**: Extract legacy tools
   - Identify and extract legacy search tool variants
   - Extract legacy create/list tools
   - Consolidate duplicate implementations

3. **Phase 3**: Testing and validation
   - Add unit tests for each extracted tool
   - Add integration tests for complex workflows
   - Verify all tests pass (current: 331 passing, 34 failing, 4 skipped)
   - Run linter and typecheck

4. **Phase 4**: Documentation and cleanup
   - Update API documentation
   - Update ADRs
   - Remove unused imports from index.ts
   - Final code review

## Dependencies

### Core Dependencies (used by multiple tools)
- `VaultUtils`: Vault operations
- `ToolRouter`: Request routing
- `ObsidianLinks`: Link generation
- `SearchEngine`: Search operations
- `DynamicTemplateEngine`: Template operations
- `ResponseTruncator`: Token budget management
- `LIFEOS_CONFIG`: Configuration

### Helper Functions (remain in index.ts for now)
- `addVersionMetadata`: Adds version info to responses
- Various closures with access to `SERVER_VERSION` and `toolModeConfig`

## Testing Strategy

### Extracted Tools
- ✅ search.ts: Tested via daily-note-simple integration test
- ✅ create-note.ts: Tested via daily-note-simple integration test
- ✅ list.ts: Tested via daily-note-simple integration test
- ✅ diagnose-vault.ts: Builds successfully
- ✅ move-items.ts: Builds successfully

### Coverage Target
- Unit tests for all extracted tools
- Integration tests for complex workflows
- Maintain 100% backward compatibility
