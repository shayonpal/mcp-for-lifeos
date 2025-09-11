Planning Analysis for Linear Issue: MCP-29

## Issue Summary
- **Title**: lifeos:insert_content shows "Untitled" instead of actual note title for daily notes
- **Root Cause**: Code incorrectly uses `frontmatter.title` instead of filename for display
- **Location**: `src/index.ts:1961`
- **Priority**: High priority bug
- **Type**: Display formatting error in MCP tool response

## Architecture Analysis
**Existing Pattern**: All MCP tools use `note.frontmatter.title || 'Untitled'` fallback pattern
**Problem**: Daily notes don't have `title` field in frontmatter - they use filename-based identification
**Solution Available**: `ObsidianLinks.extractNoteTitle()` method already handles this correctly
  - Detects daily note format (`YYYY-MM-DD`) with regex `/^\d{4}-\d{2}-\d{2}$/`
  - Converts to proper date format like "August 30, 2025"
  - Falls back to filename-based title for other notes

## Implementation Strategy
**Existing Code to Enhance**: 
- `src/index.ts:1961` - Change display title logic in insert_content response
- Leverage existing `ObsidianLinks.extractNoteTitle()` method

**Files to Modify**:
- `src/index.ts` (line 1961) - Primary fix location
- Potentially other MCP tools using same pattern for consistency

**Pattern to Apply**:
```typescript
// Current (problematic):
const title = updatedNote.frontmatter.title || 'Untitled';

// Fixed (using existing helper):
const title = updatedNote.frontmatter.title || ObsidianLinks.extractNoteTitle(updatedNote.path);
```

## Key Symbols Identified
- `insertContent` MCP tool handler in `src/index.ts` (lines 1882-1961)
- `ObsidianLinks.extractNoteTitle()` in `src/obsidian-links.ts` (lines 72-89)
- `VaultUtils.insertContent()` method (implementation in vault-utils.ts)

## Risk Assessment
**Low Risk**: 
- Simple one-line change to existing response formatting
- Leverages existing tested functionality (extractNoteTitle)
- No changes to core MCP protocol or tool behavior
- Only affects response display text, not functionality

## Decision Rationale
- Bug is clearly identified with specific location
- Solution already exists in codebase (extractNoteTitle method)
- Minimal change with maximum impact
- Consistent with existing patterns in ObsidianLinks usage
- No backward compatibility issues