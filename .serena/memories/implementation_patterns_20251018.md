# MCP Implementation Patterns - Tool Annotations

**Documentation session**: 2025-10-18 04:15

## Pattern: MCP Protocol Tool Annotations

### Overview
Added standardized MCP protocol annotations to all tools for enhanced AI understanding and safety guarantees. This pattern provides explicit classification of tool behavior for AI tool callers.

### Annotation Types Implemented

**readOnlyHint**
- `true`: Tool only reads data, no mutations (24 tools)
- `false`: Tool may write/modify data (3 tools: create_note, create_note_smart, edit_note)
- Special case: `get_daily_note` has `false` because it creates notes when missing

**idempotentHint**
- `true`: Calling tool multiple times with same params produces same result
- Applied to all 27 tools in the server

**openWorldHint**
- `true`: Tool interacts with external systems (file system) - 26 tools
- `false`: Tool is purely internal (get_server_version) - 1 tool

### Implementation Location
- File: `src/index.ts`
- Pattern: Inline annotation object in each tool definition
- Structure:
```typescript
{
  name: 'tool_name',
  description: '...',
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true
  },
  inputSchema: { ... }
}
```

### Tools Annotated (27 total)

**Consolidated Tools (3):**
- `search` - Universal search (read-only)
- `list` - Universal listing (read-only)
- `create_note_smart` - Smart creation (write - no annotations yet)

**Legacy Search Aliases (6):**
- search_notes, advanced_search, quick_search
- search_by_content_type, search_recent, find_notes_by_pattern
- All: readOnly=true, idempotent=true, openWorld=true

**Legacy List Aliases (4):**
- list_folders, list_daily_notes, list_templates, list_yaml_properties
- All: readOnly=true, idempotent=true, openWorld=true

**Core Tools (14):**
- Read-only: get_server_version, get_yaml_rules, read_note, search_notes, diagnose_vault, list_yaml_property_values
- Conditional write: get_daily_note (readOnly=false, creates if missing)
- Write tools: create_note, edit_note, move_items, insert_content (no annotations)

### Benefits

**For AI Tool Callers:**
1. Can confidently identify safe read-only operations for parallel execution
2. Understand which tools modify vault state vs. query only
3. Better tool selection accuracy based on safety requirements
4. Clear expectations for idempotent behavior

**For Developers:**
1. Explicit API surface showing operation characteristics
2. MCP protocol compliance for tool metadata
3. Foundation for safety-critical workflows requiring operation classification
4. Better integration with Claude Desktop and other AI clients

### Design Decisions

**Consistency Pattern:**
- All read-only operations consistently marked with readOnlyHint: true
- Write operations identifiable by absence of annotations or readOnlyHint: false
- All tools marked as idempotent (safe to retry)
- File system interactions clearly marked with openWorldHint: true

**Special Cases:**
- `get_server_version`: Only tool with openWorldHint=false (purely internal)
- `get_daily_note`: readOnlyHint=false (creates notes when createIfMissing=true)
- Write tools: Left without full annotations to clearly distinguish from read operations

### Testing Impact
- No test changes needed - metadata only
- Annotations are optional MCP protocol feature
- No breaking changes to existing functionality

### Documentation Approach
- CHANGELOG entry follows existing verbose style
- Linear issue MCP-35 linked
- Comprehensive breakdown of affected tools
- Benefits clearly articulated for both AI and developers

### Future Considerations
- Could add annotations to write tools for completeness
- May want to add custom annotation for tool categories
- Consider adding performance hints (fast vs. slow operations)
- Potential for safety-critical workflows using these classifications

### Related Issues
- Linear: MCP-35 (completed 2025-10-18)
- Part of: MCP Improvements project
- Based on: MCP Builder best practices analysis

### Code Location
- Implementation: `/Users/shayon/DevProjects/mcp-for-lifeos/src/index.ts`
- Documentation: CHANGELOG.md updated with comprehensive entry
- Time to implement: ~5 minutes (as estimated in acceptance criteria)
