---
description: Execute implementation against TypeScript contracts for Linear issue
argument_hint: <linear_issue_id>
---

# 03-Execute - Contract-Driven Implementation

Execute implementation against TypeScript contracts from the staging phase, ensuring type safety and contract conformance.

## Prerequisites Check and Serena Activation

**Activate Serena MCP for implementation support:**

```
mcp__serena__activate_project with project: /Users/shayon/DevProjects/mcp-for-lifeos

# Access architectural patterns and coding standards
mcp__serena__list_memories
mcp__serena__read_memory for: implementation-patterns, architecture-pattern-*, code-standards, mcp-tool-patterns, error-handling-patterns
```

**Validate execution readiness:**

```bash
pwd
```

Confirm we're in `/Users/shayon/DevProjects/mcp-for-lifeos` directory.

**Extract Linear issue ID from arguments:**

```bash
ISSUE_ID="$ARGUMENTS"
if [ -z "$ISSUE_ID" ]; then
  echo "❌ Error: Linear issue ID required"
  echo "Usage: 04-execute <linear_issue_id>"
  exit 1
fi
```

**Get issue details and validate contract completion:**  
Use `linear-expert` agent to get comprehensive issue details including current status, requirements, and recent comments to validate staging completion.

**Verify contract file exists from staging phase:**

```bash
ISSUE_ID="$ARGUMENTS"
CONTRACT_FILE="dev/contracts/MCP-${ISSUE_ID}-contracts.ts"

if [ ! -f "$CONTRACT_FILE" ]; then
  echo "❌ Error: Contract file not found: $CONTRACT_FILE"
  echo "Please run 02-stage first to generate implementation contracts"
  exit 1
fi

echo "✅ Contract file found: $CONTRACT_FILE"
```

## Phase 0: Feature Branch Setup

**Retrieve recommended branch name from Linear:**

Use `linear-expert` to:

1. Get issue details including comments
2. Extract recommended branch name from staging phase comment
3. Look for comment containing "🌿 Recommended Branch Name"

**Validate branch name:**

If branch recommendation found:

- Use recommended name: `{type}/{ISSUE-ID}-{description}`
- Display to user for confirmation

If no recommendation found:

- Fallback: Generate `feature/{ISSUE-ID}-implement-issue`
- Warn: "No branch recommendation found from staging phase"

**Create and checkout feature branch via `git-expert`:**

Task: Create feature branch for implementation

- Ensure master branch is current
- Verify branch doesn't already exist
- Create branch: {recommended-branch-name}
- Checkout new branch
- Push to origin for remote tracking

**Update Linear with branch creation (GENERIC language):**

Use `linear-expert` to add comment:

```
## ✅ Feature Branch Created

**Branch**: `{branch-name}`
**Base**: master
**Status**: Implementation in progress
```

## Update Linear Status

**Mark issue as In Progress:**  
Use `linear-expert` agent to update issue status:

```
Update Linear issue $ISSUE_ID to "In Progress" status with comment:
"🚀 Starting contract-driven implementation - building against TypeScript contracts from staging phase"
```

## Strategic Context Review

**Before implementation, review strategic alignment:**

### Check CURRENT-FOCUS.md

- Read `docs/CURRENT-FOCUS.md` to understand active cycle work
- Assess if this implementation aligns with current priorities
- Note if implementation affects documented focus areas
- Consider impact on cycle timeline and goals

### Review Relevant ADRs

- If implementation involves architectural decisions, check `docs/adr/`
- Identify existing patterns and decisions to respect
- Note any ADR conflicts or updates needed based on implementation approach
- Follow established architectural patterns

### Analyze Dependencies

- Check `package.json` and `package-lock.json` for current dependencies
- Identify if implementation requires new packages
- If new package needed: Verify latest version before installing
  - Query user: "Implementation requires [package-name]. Latest version is X.X.X. Install? (y/n)"
- Document dependency changes in implementation notes

### Language Policy for Output

Use factual, neutral language in all output and Linear updates - avoid superlatives (excellent, perfect, amazing, best, etc.)

---

## Contract-Driven Implementation Cycle with Serena Integration

**Phase 1: Load Contracts and Analyze Implementation Targets**

```bash
# Review the contract file
cat dev/contracts/MCP-${ISSUE_ID}-contracts.ts

# Run typecheck to establish baseline
npm run typecheck
```

**Use Serena to understand implementation targets:**

```
# Get comprehensive view of symbols that need modification
mcp__serena__get_symbols_overview

# Find specific symbols mentioned in planning phase
mcp__serena__find_symbol for symbols identified during planning

# Search for implementation patterns relevant to this issue
mcp__serena__search_for_pattern with patterns based on issue type:
- Tool implementation: "class.*Tool.*Implementation"
- Router modifications: "router.*handle.*[tool-type]"
- Search functionality: "search.*[feature-type].*implementation"
- Template processing: "template.*process.*[template-type]"
```

**Phase 2: Existing Code Verification and Enhancement**

**Before implementation, verify which existing symbols to modify:**

```
# Confirm existing symbols identified in planning phase
mcp__serena__find_symbol for symbols identified during planning
mcp__serena__get_symbol_info for each target symbol to understand current implementation
```

**Phase 2: Serena-Guided Contract Implementation**

Use Serena for symbol-level implementation following this contract-driven cycle:

1. **Import Contracts**: Import types from contract file into implementation
2. **Serena Analysis**: Use `mcp__serena__get_symbol_info` to understand implementation target symbols
3. **Implement to Contract**: Write code that conforms to contract interfaces using Serena's editing tools
4. **Run TypeCheck**: Verify implementation matches contract types with `npm run typecheck`
5. **Refactor**: Clean up code while maintaining contract conformance
6. **Repeat**: Continue until all contract requirements implemented

Use `agent-Plan` when exploring unfamiliar code areas or understanding complex architectural patterns.

**Implementation Principle**: ALWAYS prefer modifying existing code over creating new

**Existing Code Enhancement Strategy:**

**Before creating any new function/tool, verify no existing code can be enhanced to handle the requirement**

```
# For each implementation target:
# 1. Analyze existing symbol structure for enhancement potential
mcp__serena__get_symbol_info for target symbols

# 2. Find similar implementations to extend rather than replace
mcp__serena__search_for_pattern with pattern: "similar.*implementation.*pattern"

# 3. Prioritize Serena's modification tools over creation:
# - mcp__serena__replace_symbol_body for function/method modifications (PREFERRED)
# - mcp__serena__insert_before_symbol for adding to existing functionality
# - mcp__serena__insert_after_symbol for extending existing functionality
# - Only create new symbols when existing code cannot handle requirement

# 4. Understand integration points to avoid unnecessary new code
mcp__serena__find_symbol for dependent symbols that might be affected
```

**Enhancement-First Implementation Strategy:**

- **Enhance existing MCP tool interfaces** in `src/` using Serena symbol analysis
- **Extend existing patterns** from `tool-router.ts` and `search-engine.ts` identified by Serena
- **Modify existing YAML compliance** rules from `yaml-rules-manager.ts` using Serena pattern matching
- **Enhance existing operations** in files/search/links modules following Serena-identified patterns
- **Extend existing analytics** tracking using established patterns from Serena analysis
- **Only create new functionality** when existing code cannot be reasonably enhanced

**Phase 3: Incremental Validation with Serena Verification**

After each implementation increment:

```bash
# Type checking
npm run typecheck

# Run specific test file if working on focused area
npx jest path/to/specific.test.ts

# Run full test suite periodically
npm test
```

**Use Serena for implementation verification:**

```
# Verify symbol modifications are correct
mcp__serena__get_symbol_info for modified symbols to confirm changes

# Check for integration issues
mcp__serena__find_symbol for symbols that depend on modified code

# Search for potential regression patterns
mcp__serena__search_for_pattern with pattern: ".*[modified-symbol].*usage"

# Verify architectural consistency
mcp__serena__search_for_pattern with pattern: "similar.*implementation.*style"
```

**Phase 4: Integration Testing**

```bash
# Build the project
npm run build

# Test MCP server startup
timeout 5s node dist/index.js || echo "Server startup test complete"

# Validate tool registration
ENABLE_WEB_INTERFACE=true timeout 10s node dist/index.js &
sleep 2
curl -f http://localhost:19831/health 2>/dev/null && echo "✅ Web interface accessible" || echo "ℹ️ Web interface test skipped"
pkill -f "node dist/index.js" 2>/dev/null || true
```

## 🔄 Claude Code Restart Required

**IMPORTANT: After rebuilding the project, restart your Claude Code session to access the latest build artifacts.**

**Why This Step Is Necessary:**

- Claude Code needs to reload the rebuilt MCP server to test the implementation
- The latest `dist/` artifacts must be accessible for integration testing
- This allows Claude Code to verify the implementation directly rather than relying solely on manual testing

**How to Restart:**

1. Exit this Claude Code session (Cmd+Q or close the window)
2. Restart Claude Code application
3. Navigate back to this project directory
4. Re-run this workflow command: `/03-execute <issue_id>`

**After Restart, Claude Code Will:**

- Load and test the MCP server with the latest build
- Verify tool registration and functionality
- Validate integration points automatically
- Run automated tests against the new implementation
- Report any issues found during automated testing

**Once Claude Code automated testing is complete, proceed to manual verification below.**

---

## ⚠️ Manual Verification Required

**🛑 STOP - Claude Code Testing Complete, Now Manual Verification Required**

After Claude Code has restarted and tested the latest build automatically, **you must also manually verify that the implementation works correctly in your actual usage environment.**

**Required Manual Verification Steps:**

1. **Test the implemented functionality manually in Claude Desktop/Raycast**
2. **Verify all expected behavior works as intended**
3. **Check that no existing functionality is broken**
4. **Confirm the implementation meets the original requirements**

**❓ Manual Verification Confirmation**

**Please manually test the implementation and confirm:**

"Have you manually verified that the implementation works correctly? (yes/no)"

**⚠️ IMPORTANT**: Linear updates will only proceed after you confirm "yes" to manual verification.

---

**If verification reveals issues:**

- Return to Phase 2 for additional implementation
- Fix identified problems before requesting verification again
- Do not proceed to Linear updates until verification passes

**If verification is successful:**

- Type "yes" to confirm manual verification complete
- Linear updates will proceed automatically after confirmation

## Quality Validation

**TypeScript Validation:**

```bash
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors must be resolved"
  exit 1
fi
```

**Test Suite Validation:**

```bash
npm test
if [ $? -ne 0 ]; then
  echo "❌ Test failures must be resolved"
  exit 1
fi
```

**MCP Tool Validation:**  
Test tool accuracy if changes affect tool routing:

```bash
# Only run if tool-router or search-engine modified
if git diff --name-only HEAD~1 | grep -E "(tool-router|search-engine)" > /dev/null; then
  npm run test:claude-desktop:accuracy
fi
```

## Implementation Documentation with Serena Insights

**Implementation decisions documented in Linear and git history.**

Per-issue implementation details are tracked in:

- Linear issue comments (comprehensive implementation summary)
- Git commit messages (detailed technical context)
- Code comments (inline rationale for complex decisions)

Serena memory reserved for reusable architectural patterns only.

**Create implementation summary for Linear update:**

```
Create implementation summary covering:
- Files modified/created with brief rationale
- Key architectural decisions made during implementation
- Performance considerations for MCP tool operations
- Integration points with existing files/search/links modules and analytics
- Code quality adherence to established patterns

Use Serena symbol analysis during implementation to understand code structure, but document results in Linear, not Serena memory.
```

## Linear Update and Handoff

**⚠️ Only Execute After Manual Verification Confirmed**

**ONLY proceed with Linear updates if user has confirmed manual verification with "yes"**

**Update Linear with comprehensive implementation details:**  
Use `linear-expert` agent to:

```
Update Linear issue $ISSUE_ID with comment:
"✅ Implementation completed via TDD methodology with Serena MCP integration

## Files Modified
[List from git status]

## Serena Analysis Used
- Symbols analyzed and modified: [list key symbols]
- Patterns followed: [reference established patterns]
- Architecture compliance verified

## Test Coverage
- All new tests passing
- No regressions in existing functionality
- TypeScript validation clean

## Implementation Quality
- Follows established code patterns (verified via Serena)
- Integration points properly handled
- Performance considerations addressed

## Manual Verification
- ✅ User confirmed manual testing successful
- ✅ Implementation verified to work correctly

## Next Steps
Ready for code-review phase - implementation matches validated test design and follows established patterns"

Change status to "In Review"
```

**Prepare for code review handoff:**

```bash
# Stage all changes
git add .

# Show final diff summary
git diff --cached --stat

echo "✅ Implementation complete - ready for code review phase"
echo "Next: Run code-review workflow command with issue $ISSUE_ID"
```

## Output Format

```
## 🚀 Implementation Execution Complete

### 🎯 Strategic Context
**Current Focus Impact**: [needs update / aligned / N/A]
**Relevant ADRs**: [list or none]
**Dependencies**: [no changes / updated: package@version / added: package@version]

### 📊 Implementation Summary
- **Linear Issue**: $ISSUE_ID  
- **Files Modified**: [count] files changed
- **Test Status**: ✅ All tests passing
- **Type Check**: ✅ No TypeScript errors
- **Build Status**: ✅ Clean build

### 🔍 Quality Metrics
- **Test Coverage**: Maintained/improved
- **Performance**: No regressions detected
- **MCP Compliance**: All tools properly registered

### ➡️ Next Phase
**Code Review**: Use code-review workflow with issue $ISSUE_ID
**Status**: Implementation ready for review and integration
```
