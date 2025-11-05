---
description: Intelligently update documentation based on Linear issue implementation
argument_hint: <linear-issue-id>
---

# 06-Document - Smart Documentation Updates

Analyzes implementation changes and selectively updates documentation where meaningful changes warrant it.

## Help Mode

If user provides `--help` or `help` parameter, display this usage guide:

```
07-document - Smart Documentation Updates

USAGE:
  07-document <linear-issue-id>    Update docs based on implementation
  07-document help                 Show this help

DESCRIPTION:
  Intelligently analyzes what was implemented and updates only the 
  documentation that needs updating. Focuses on meaningful changes
  rather than documenting everything blindly.

EXAMPLES:
  07-document LIF-123             Update docs for issue LIF-123
  07-document MCP-456             Update docs for MCP server change
```

## Instructions

**Phase 1: Analysis & Planning**

### Step 1: Get Implementation Details

Use linear-expert to get comprehensive issue details:

```
Get full details for Linear issue [ISSUE_ID] including:
- Implementation summary and technical changes
- Files modified and their purposes  
- New features, tools, or architecture changes
- Dependencies or setup changes
- Breaking changes or API modifications
```

### Step 2: Activate Project Context

Use Serena to activate project context:

```
Activate MCP for LifeOS project context. I need to analyze recent implementation changes for documentation updates. Load existing documentation patterns and architectural knowledge.
```

### Step 3: Documentation Impact Analysis

Use doc-search to analyze current documentation state:

```bash
# Find existing documentation to potentially update
find docs/ -name "*.md" -type f | head -20
ls -la README.md src/README.md src/tools/README.md docs/README.md 2>/dev/null || echo "Missing READMEs noted"
```

Analyze implementation against documentation decision criteria:

**CHANGELOG Updates** (Always Required):

- Update if not already done for this issue
- Include timestamp, version, changes made, Linear issue reference

**README Updates** (If Warranted):

- Main README.md: New features, API changes, setup instructions
- src/README.md: Architecture changes, new modules  
- src/tools/README.md: Tool additions/modifications/removals
- docs/README.md: New documentation structure

**Technical Documentation** (If Applicable):

- docs/architecture/: ADRs for architectural decisions
- docs/specs/: Technical specs for complex new features
- docs/tools/: Individual tool documentation (REQUIRED for tool changes)
- docs/guides/: User guides for new user-facing functionality
- docs/api/: API documentation for new endpoints

**Phase 2: Selective Documentation Updates**

### Step 4: Capture Current Timestamp

First, capture the current date and time for consistent use across all documentation:

```bash
# Get current timestamp for documentation consistency
CURRENT_TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
CURRENT_DATE=$(date "+%Y-%m-%d")
CURRENT_DATE_COMPACT=$(date "+%Y%m%d")
echo "Documentation timestamp: $CURRENT_TIMESTAMP"
```

### Step 5: CHANGELOG Update (Always)

Update CHANGELOG.md directly with captured timestamp:

```bash
# Read current CHANGELOG
# Then edit to add new entry at appropriate location

# Format: "YYYY-MM-DD HH:MM - type: description"
# Example: "$CURRENT_TIMESTAMP - feat: add search consolidation (MCP-145)"

# Entry should:
# - Use exact timestamp from Step 4
# - Describe changes in user-friendly terms
# - Reference Linear issue ID
# - Follow Common Changelog format (not Keep a Changelog)
```

Use Read and Edit tools to update the file with the new entry.

### Step 6: Tool Documentation (If Tools Changed)

If implementation involved tool changes:

For **new tools**:

```bash
# Create new tool documentation file
# Use Write tool: docs/tools/[tool-name].md

# Include in document:
# - Creation date: $CURRENT_DATE
# - Purpose and use cases
# - Parameters and examples
# - Integration points
# - Usage patterns

# Follow structure from existing tool docs in docs/tools/
```

For **modified tools**:

```bash
# Update existing tool documentation
# Use Read then Edit tools: docs/tools/[tool-name].md

# Updates to include:
# - Add "Last updated: $CURRENT_TIMESTAMP" to frontmatter or top
# - Reflect parameter changes
# - Update examples
# - Note behavior changes
# - Maintain version history
```

For **removed tools**:

```bash
# Move to archived location
# Use bash: mkdir -p docs/tools/archived/ && mv docs/tools/[tool-name].md docs/tools/archived/

# Then Edit the moved file to add:
# - Removal date: $CURRENT_DATE
# - Removal reason
# - Updated timestamp

# Update any referencing documentation with Edit tool
```

### Step 7: README Updates (If Warranted)

Based on analysis, update relevant READMEs directly:

**Main README.md** - Update if:

- New user-facing features
- Setup/installation changes
- Architecture overview changes
- New dependencies
- Add \"Last updated: $CURRENT_TIMESTAMP\" if significantly modified

Use Read then Edit tools for targeted section updates.

**src/README.md** - Update if:

- New modules or core components
- Architecture pattern changes
- Developer workflow changes
- Add \"Last updated: $CURRENT_TIMESTAMP\" if significantly modified

Use Read then Edit tools for targeted section updates.

**src/tools/README.md** - Update if:

- Tool inventory changes
- Tool categorization changes
- Tool usage patterns change
- Add \"Last updated: $CURRENT_TIMESTAMP\" if significantly modified

Use Read then Edit tools for targeted section updates.

### Step 8: Technical Documentation (If Applicable)

Create technical docs directly when warranted:

**ADR (Architecture Decision Record)** - Create if:

- Major architectural decisions made
- Technology choices with trade-offs
- Significant refactoring approaches
- Protocol or integration changes

Use Write tool to create docs/adr/[number]-[title].md with:

- Creation date: $CURRENT_DATE in document header
- Follow ADR template structure

**Technical Specifications** - Create if:

- Complex new features implemented
- MCP protocol extensions
- Integration specifications
- Performance considerations

Use Write tool to create docs/specs/[feature-name].md with:

- Creation date: $CURRENT_DATE in document header
- Follow existing specs structure

**User Guides** - Create if:

- New user-facing workflows
- Configuration procedures
- Integration setup guides

Use Write tool to create docs/guides/[guide-name].md with:

- Creation date: $CURRENT_DATE in document header
- Follow existing guide structure

### Step 9: Memory Consolidation (Not Creation)

**PRIORITY: Update existing memories, not create new ones**

**Follow**: `.serena/memories/memory_management.md` (Decision Tree)

#### Pre-Consolidation Validation

```bash
# Ensure clean baseline
.serena/scripts/validate-memories.sh
```

#### Review Planning Notes

Check notes from 01-plan phase:

- Were architectural patterns identified?
- Which memories were suggested for updates?
- Any new patterns discovered during implementation?

#### Apply Decision Tree

**Step 1: Try Consolidation First**

For each architectural insight or pattern:

1. List existing memories:

   ```bash
   ls -la .serena/memories/
   ```

2. Read potentially related memory:

   ```bash
   mcp__serena__read_memory [memory-name]
   ```

3. Evaluate fit:
   - MCP tool pattern → `tool_router_patterns.md` or `mcp_protocol_patterns.md`?
   - Obsidian integration → `vault_integration_patterns.md` or `obsidian_integration.md`?
   - Error handling → `error_handling_patterns.md` or `code_quality_patterns.md`?
   - Performance → `performance_search_patterns.md`?
   - Testing → `testing_guide.md`?
   - Documentation → `documentation_workflow.md`?

4. **Default action: UPDATE existing memory**
   - Add new section or expand existing section
   - Consolidate related patterns together
   - Keep memory focused and cohesive

**Step 2: Validate New Memory Necessity**

Only if NO existing memory fits the domain:

1. Apply criteria from `memory_management.md`:
   - ✅ Affects ≥3 components?
   - ✅ Thematic name (no issue/date refs)?
   - ✅ Projected size 60-150 lines?
   - ✅ Distinct architectural domain?
   - ✅ Proven reusability (not single-use)?

2. **Ask user before creating new memory**:

   ```
   🤔 New Memory Decision Required

   Pattern: [description]

   Existing memories checked:
   - [memory-1.md] - Doesn't cover [reason]
   - [memory-2.md] - Related but distinct because [reason]

   Proposed new memory: `[name].md`
   Projected scope: [60-150 lines]
   Domain: [architectural domain]

   Options:
   1. Create new memory (justified above)
   2. Extend [existing-memory.md] instead
   3. Skip memory (document in Linear/ADR)

   Please choose: 1, 2, or 3
   ```

**Step 3: When to Skip Memories**

Skip Serena memory if:

- Pattern is issue-specific → Document in Linear comment
- Architectural decision → Create ADR in `docs/adr/`
- Single use case → Document in git commit message
- Temporary workaround → Note in code comments

**Reference**: `.serena/memories/memory_management.md` (Examples section)

#### Post-Consolidation Validation

```bash
# After ANY memory changes (update or create)
.serena/scripts/validate-memories.sh

if [ $? -ne 0 ]; then
  echo "❌ Memory validation failed"
  echo "Fix violations before continuing:"
  echo "  - Remove issue number references (MCP-##)"
  echo "  - Remove date patterns (YYYY-MM-DD)"
  echo "  - Check file size (60-250 lines)"
  echo "  - Check naming conventions"
  exit 1
fi
```

#### Documentation Summary

```
## 📚 Memory Updates

### ✅ Memories Updated

- [memory-name.md]: Added [pattern/section description]
- [memory-name.md]: Updated [existing section] with [new insight]

### ✅ Memories Created (if any)

- [new-memory.md]: Created for [domain] with [justification]
- User approved creation on [date]

### ✅ Memory Skips (if any)

- [Pattern X]: Documented in Linear issue comment instead
- [Pattern Y]: Created ADR in docs/adr/ instead

### ✅ Validation Status

```bash
.serena/scripts/validate-memories.sh
```

✅ All checks passed

```

**Language Policy**: Use factual, neutral language - no superlatives

**Phase 3: Validation & Summary**

### Step 10: Documentation Validation

Verify updates with doc-search (for pattern finding) and direct tools:

```bash
# Verify documentation consistency
grep -r "TODO\|FIXME\|XXX" docs/ || echo "No pending documentation items"

# Check for broken links (optional validation)
# Can use Read + grep on updated files to verify references
```

Review updated documentation for:

- Broken internal links (use grep to search for link patterns)
- Outdated references (compare with implementation)
- Consistency with implementation (manual review)
- Proper formatting and structure (markdownlint-cli2 if needed)

### Step 11: Documentation Summary

Present summary and update Linear:

Use `linear-expert` to add comment:

```
Documentation updated

CHANGELOG: [entry added]
[IF TOOLS:] Tools: [list updated/created/archived]
[IF READMES:] READMEs: [list updated]
[IF ADR/SPECS/GUIDES:] Docs: [list created]

Ready for commit/push
```

**Output Format:**

```
Documentation complete

Updated:
- [list files]

Created:
- [list new files]

Skipped:
- [list with reasons]

Ready for next phase
```
