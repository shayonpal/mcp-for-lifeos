---
name: start
version: 1.0.0
description: Execute complete workflow in isolated worktree with automatic PR creation
author: Shayon Pal
tags: [workflow, worktree, automation, git, linear]
argument_hint: <linear-issue-id>
env:
  LINEAR_TEAM_ID: d1aae15e-d5b9-418d-a951-adcf8c7e39a8
  WORKTREES_ROOT: ../worktrees
  PROJECT_ROOT: /Users/shayon/DevProjects/mcp-for-lifeos
---

# Worktree Start - Isolated Workflow Execution

Execute complete MCP for LifeOS workflow in an isolated git worktree. This command consolidates planning, staging, implementation, review, testing, documentation, and PR creation into a single coordinated workflow.

## Help Mode

If user provides `--help` or `help` parameter, display this usage guide:

```
/worktree/start - Execute complete workflow in isolated worktree

USAGE:
  /worktree/start <linear-issue-id>    Execute workflow for Linear issue
  /worktree/start help                 Show this help

DESCRIPTION:
  Creates isolated git worktree and executes full workflow:
  1. Planning (with approval)
  2. Staging (contracts + branch)
  3. Implementation (with verification)
  4. Code review
  5. Testing (conditional)
  6. Documentation
  7. Commit & PR creation

  Worktree location: ../worktrees/[branch-name]/

  After completion, PR is created and worktree remains for review.
  Clean up after PR merge: /worktree/cleanup [branch-name]

EXAMPLES:
  /worktree/start MCP-123
  /worktree/start d1aae15e-123

PAUSE POINTS:
  - After planning (strategy approval)
  - After implementation (manual verification)
  - After testing (if tests executed)
```

## Instructions

### Phase 0: Validation and Help

**Parse arguments and handle help mode:**

```bash
ISSUE_ID=$(echo "$ARGUMENTS" | grep -oE '[A-Z]+-[0-9]+' | head -1)

if [ -z "$ISSUE_ID" ]; then
  if echo "$ARGUMENTS" | grep -qE '^(help|--help|-h)$'; then
    # Help mode was shown above, exit
    exit 0
  fi
  echo "❌ Error: Linear issue ID required"
  echo "Usage: /worktree/start <linear-issue-id>"
  echo "Example: /worktree/start MCP-123"
  exit 1
fi

echo "🌳 Starting worktree workflow for issue: $ISSUE_ID"
```

### Phase 1: Context Gathering (Single Pass)

**Activate Serena and gather all context once:**

Use `mcp__serena__activate_project`:

```
Project: /Users/shayon/DevProjects/mcp-for-lifeos
```

Then gather comprehensive context:

```
mcp__serena__list_memories

mcp__serena__read_memory for:
- project_context
- project_overview
- code_style_conventions
- error_handling_patterns
- tool_router_patterns
- mcp_protocol_patterns
- testing_guide
- documentation_workflow
```

**Get Linear issue details with `linear-expert`:**

Use the `linear-expert` agent to retrieve full issue context:

```
Team ID: $LINEAR_TEAM_ID
Issue ID: $ISSUE_ID

Retrieve:
- Full issue details (title, description, acceptance criteria)
- Current status, labels, priority
- Comments (check for previous workflow attempts)
- Related issues and dependencies
- Project context
```

**Strategic context gathering:**

```bash
# Read CURRENT-FOCUS.md for cycle priorities
cat docs/CURRENT-FOCUS.md

# Check for relevant ADRs if architectural
ls docs/adr/ 2>/dev/null || echo "No ADRs directory"

# Review package.json for dependencies
cat package.json | grep -A 50 '"dependencies"'
```

**Store context in temporary structure for sharing across phases.**

### Phase 2: Branch Name Generation

**Generate semantic branch name following 02-stage logic:**

Use `linear-expert` to analyze issue:

- Extract issue title and description
- Identify type (feature/bugfix/hotfix/refactor/test/doc/design)
- Generate 3-5 word semantic description

**Branch naming rules:**

- **feature/**: New functionality, enhancements
- **bugfix/**: Fixing errors, bugs, crashes
- **hotfix/**: Urgent production fixes
- **refactor/**: Code improvements without behavior change
- **test/**: Test additions
- **doc/**: Documentation updates
- **design/**: UI/UX changes

**Format**: `{type}/{ISSUE-ID}-{semantic-description}`

**Examples**:
- `feature/MCP-123-add-date-range-filter`
- `bugfix/MCP-124-fix-search-timeout`
- `refactor/MCP-125-consolidate-vault-ops`

**Store branch name for worktree creation:**

```bash
BRANCH_NAME="[generated-branch-name]"
echo "🌿 Branch name: $BRANCH_NAME"
```

### Phase 3: Worktree Creation

**Create isolated worktree using git-expert:**

```bash
WORKTREE_PATH="$WORKTREES_ROOT/$BRANCH_NAME"

echo "📦 Creating worktree at: $WORKTREE_PATH"

# Create worktrees directory if it doesn't exist
mkdir -p "$WORKTREES_ROOT"
```

**Delegate worktree creation to git-expert agent:**

Use the `Task` tool with `subagent_type: git-expert`:

```
Task: Create git worktree and feature branch

Context:
- Branch name: $BRANCH_NAME
- Worktree path: $WORKTREE_PATH
- Base branch: master

Please:
1. Create worktree from master branch at $WORKTREE_PATH
2. Change to worktree directory
3. Create and checkout feature branch: $BRANCH_NAME
4. Push feature branch to origin with upstream tracking

Verify:
- Worktree created successfully
- Feature branch exists locally and on remote
- Working directory is the worktree
```

**After git-expert completes, capture the working directory:**

```bash
pwd
echo "📍 Working in worktree: $WORKTREE_PATH"
```

### Phase 4: Create Context File

**Create shared context file for phases:**

Use the `Write` tool to create context file:

```
file_path: .worktree-context.json
content: {
  "issueId": "$ISSUE_ID",
  "branchName": "$BRANCH_NAME",
  "worktreePath": "$WORKTREE_PATH",
  "executedPhases": [],
  "prUrl": null,
  "prNumber": null,
  "pausePoints": {
    "planApproved": false,
    "implementationVerified": false,
    "testsVerified": false
  }
}
```

Then confirm:

```bash
echo "📝 Context file created at: .worktree-context.json"
```

---

## Workflow Phase Execution

### Phase 5: Planning (01-plan logic)

**Execute planning phase with gathered context:**

Use `linear-expert` for issue analysis (already retrieved).

Use `agent-Plan` for codebase exploration:

```
Task: Analyze implementation targets and feasibility

Context:
- Linear issue: $ISSUE_ID with requirements
- Serena activated with project context
- Looking for: enhancement opportunities vs. new code needs

Please:
1. Find existing code that could be enhanced
2. Identify integration points
3. Assess architectural compliance
4. Note any risks or challenges
```

**Generate planning strategy document:**

```markdown
## 🎯 [$ISSUE_ID]: [Title]

### 📋 Requirements & Context
- [Requirement 1]
- [Requirement 2]

**Hierarchy**: Parent: [ID or none] | Project: [name or none]

### 🔍 Technical Strategy
**Approach**: Enhance [symbols] | New: [if needed - why]
**Risks**: 🔴 [risk] → [mitigation]
**Integration**: [affected components]

### 🛠️ Implementation Plan
1. **Phase 1**: [Brief description]
2. **Phase 2**: [Brief description]
3. **Phase 3**: [Brief description]

**Testing**: [approach]
**Documentation**: [if needed]

### 🎯 Recommendation
✅ Proceed to staging
```

**Interactive consultation (if needed):**

Use `AskUserQuestion` tool:

```json
{
  "questions": [{
    "question": "Would you like to consult codex or other experts before proceeding with this implementation?",
    "header": "Expert Review",
    "multiSelect": false,
    "options": [
      {
        "label": "Yes, consult experts",
        "description": "Get additional expert validation before proceeding"
      },
      {
        "label": "No, proceed with plan",
        "description": "Implementation strategy looks good, continue to staging"
      }
    ]
  }]
}
```

If "Yes", use `codex` skill with comprehensive context.

**🛑 PAUSE POINT 1: Plan Approval**

Display planning strategy document, then use `AskUserQuestion` tool:

```json
{
  "questions": [{
    "question": "Ready to proceed with this implementation strategy?",
    "header": "Plan Review",
    "multiSelect": false,
    "options": [
      {
        "label": "Approve and continue",
        "description": "Proceed to staging phase with this strategy"
      },
      {
        "label": "Refine strategy",
        "description": "Adjust implementation approach before proceeding"
      },
      {
        "label": "Cancel workflow",
        "description": "Exit workflow and clean up worktree"
      }
    ]
  }]
}
```

**Handle response:**
- **Approve**: Continue to Phase 6 (Staging)
- **Refine**: Loop back with user feedback, regenerate plan
- **Cancel**: Exit workflow, offer worktree cleanup

**Update context file:**

Use `Read` tool to read current context, then `Write` tool to update:

```bash
# Read current context
# Modify pausePoints.planApproved = true
# Add 1 to executedPhases array
# Write back to .worktree-context.json

echo "✅ Context updated: Plan approved, phase 1 complete"
```

**Update Linear with planning results:**

Use `linear-expert` to add comment:

```markdown
## 🌳 Worktree Workflow - Planning Phase Complete

**Branch**: `$BRANCH_NAME`
**Worktree**: `$WORKTREE_PATH`

### Planning Strategy
[Brief summary of approved plan]

**Status**: Planning approved, proceeding to staging
```

### Phase 6: Staging (02-stage logic)

**Create TypeScript contracts:**

```bash
CONTRACT_FILE="dev/contracts/MCP-${ISSUE_ID}-contracts.ts"
mkdir -p dev/contracts
```

**Search for existing type patterns with Serena:**

```
mcp__serena__search_for_pattern with pattern: "interface.*Tool.*Input"
mcp__serena__search_for_pattern with pattern: "type.*Tool.*Output"
mcp__serena__find_symbol for: ToolInput, ToolOutput, MCPTool
```

**Generate contract file based on patterns found:**

```typescript
/**
 * Implementation contracts for Linear Issue: $ISSUE_ID
 * Issue: [Issue Title]
 */

// INPUT CONTRACTS
export interface [Feature]Input {
  requiredParam: string;
  optionalParam?: number;
}

// OUTPUT CONTRACTS
export interface [Feature]Output {
  success: boolean;
  data: ResultItem[];
}

// ERROR CONTRACTS
// Throws: InvalidInputError, VaultAccessError

// INTEGRATION CONTRACTS
// Extends: MCPTool
// Integrates: searchEngine, templateSystem

// BEHAVIORAL CONTRACTS
// MUST: Validate inputs, handle sync delays
// MUST NOT: Block on slow ops, throw unhandled exceptions
```

**Update context file:**

Use `Read` then `Write` to update context:

```bash
# Add 2 to executedPhases array
echo "✅ Context updated: Staging phase complete"
```

**Update Linear:**

Use `linear-expert` to add comment section:

```markdown
### Staging Phase Complete

**Contracts**: `dev/contracts/MCP-${ISSUE_ID}-contracts.ts`
**Branch**: `$BRANCH_NAME` ready for implementation

**Status**: Contracts defined, proceeding to implementation
```

### Phase 7: Implementation (03-execute logic)

**Verify contracts exist:**

```bash
if [ ! -f "$CONTRACT_FILE" ]; then
  echo "❌ Contract file not found (staging failed)"
  exit 1
fi
```

**Execute contract-driven implementation:**

Use Serena for symbol-level implementation:

```
mcp__serena__get_symbols_overview
mcp__serena__find_symbol for target symbols
mcp__serena__replace_symbol_body (preferred over new code)
mcp__serena__insert_before_symbol or insert_after_symbol
```

**Implementation cycle:**

1. Import contracts
2. Implement to contract interfaces
3. Run `npm run typecheck`
4. Refactor while maintaining conformance
5. Repeat until complete

**Build and validate:**

```bash
echo "🔧 Building implementation..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed - fix errors before continuing"
  exit 1
fi

echo "✅ Build successful"
```

**Run type checking:**

```bash
npm run typecheck

if [ $? -ne 0 ]; then
  echo "❌ Type errors detected"
  exit 1
fi

echo "✅ Type checking passed"
```

**🛑 PAUSE POINT 2: Manual Verification**

Display implementation summary, then use `AskUserQuestion` tool:

```json
{
  "questions": [{
    "question": "Have you manually verified the implementation works correctly in Claude Desktop/Raycast?",
    "header": "Verification",
    "multiSelect": true,
    "options": [
      {
        "label": "Tested functionality",
        "description": "All implemented features work as expected"
      },
      {
        "label": "Checked existing features",
        "description": "No existing functionality is broken"
      },
      {
        "label": "Meets requirements",
        "description": "Implementation satisfies all acceptance criteria"
      }
    ]
  }]
}
```

Wait for user confirmation before continuing. If not all options selected, ask for details and address concerns.

**Update context file:**

Use `Read` then `Write` to update context:

```bash
# Set pausePoints.implementationVerified = true
# Add 3 to executedPhases array
echo "✅ Context updated: Implementation verified"
```

**Update Linear:**

Use `linear-expert`:

```markdown
### Implementation Phase Complete

**Files Modified**: [List from git status]
**Build Status**: ✅ Clean
**Type Check**: ✅ Passed
**Manual Verification**: ✅ User confirmed

**Status**: Implementation verified, proceeding to code review
```

### Phase 8: Code Review (04-code-review logic)

**Analyze implementation with Serena:**

```
mcp__serena__get_symbols_overview
mcp__serena__get_symbol_info for modified symbols
mcp__serena__search_for_pattern for: duplication, error handling, validation
```

**Critical: Code duplication detection:**

```bash
# Get list of modified files
git diff --name-only HEAD

# For each new function, search for similar existing implementations
# Use Serena to find duplicates
```

**Quality validation:**

```bash
# TypeScript validation
npm run typecheck

# Run unit tests
npm run test:unit
```

**Generate review findings:**

```markdown
## 🔍 Code Review

**TypeScript**: [Pass/Fail]
**MCP Protocol**: [Pass/Fail]
**Architecture**: [Pass/Fail]

### ⚠️ Issues
**Critical**: [Count]
- [Issue details]

### 🔄 Duplication
[Any duplication found with consolidation recommendations]

### 🎯 Requirements
[✅/❌] Each requirement validated
```

**Update context file:**

Use `Read` then `Write` to update context:

```bash
# Add 4 to executedPhases array
echo "✅ Context updated: Code review complete"
```

**Update Linear:**

```markdown
### Code Review Phase Complete

**Review Status**: [Passed/Issues Found]
**Duplication Check**: [Clean/Found]
**Quality**: [Assessment]

**Status**: Review complete, proceeding to testing
```

### Phase 9: Testing (05-test logic)

**Assess testing requirements:**

Analyze implementation type:

- Documentation-only → skip tests
- New MCP tool → run tests
- Core logic changes → run tests
- Bug fixes → run tests

**If tests needed:**

```bash
echo "🧪 Running test suite..."

# TypeScript validation
npm run typecheck

# Unit tests
npm test -- --verbose

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo "⚠️ Tests failed - review before continuing"

  # Use AskUserQuestion to decide whether to proceed
  # Use tool with question: "Tests have failures. Continue anyway or fix first?"
  # Options: "Fix failures first", "Proceed with caution"
  # If "Fix failures first" selected, exit workflow
fi
```

**MCP-specific testing:**

```bash
# Test MCP tool accuracy
npm run test:claude-desktop:accuracy

# Validate tool parity
npm run test:tool-parity
```

**🛑 PAUSE POINT 3: Test Verification (if tests run)**

If tests were executed, use `AskUserQuestion` tool:

```json
{
  "questions": [{
    "question": "Tests have completed. Ready to proceed to documentation phase?",
    "header": "Test Review",
    "multiSelect": false,
    "options": [
      {
        "label": "Proceed to documentation",
        "description": "Test results are acceptable, continue workflow"
      },
      {
        "label": "Review and fix failures",
        "description": "Address test failures before continuing"
      }
    ]
  }]
}
```

**Update context file:**

Use `Read` then `Write` to update context:

```bash
# Set pausePoints.testsVerified = true
# Add 5 to executedPhases array
echo "✅ Context updated: Testing complete"
```

**Update Linear:**

```markdown
### Testing Phase Complete

**Tests Run**: [Count]
**Pass Rate**: [Percentage]
**Status**: [All passed / Some failures noted]

**Status**: Testing complete, proceeding to documentation
```

**If tests skipped:**

```markdown
### Testing Phase Skipped

**Reason**: [Documentation-only / Simple config change]
**Risk**: Low

**Status**: Proceeding to documentation
```

### Phase 10: Documentation (06-document logic)

**Capture timestamp:**

```bash
CURRENT_TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
echo "📅 Documentation timestamp: $CURRENT_TIMESTAMP"
```

**Update CHANGELOG.md:**

Use Read then Edit tools to add entry:

```markdown
$CURRENT_TIMESTAMP - [type]: [description] ($ISSUE_ID)
```

**Update tool documentation (if applicable):**

Check if tools were added/modified/removed:

- **New tools**: Create `docs/tools/[tool-name].md`
- **Modified tools**: Update existing docs with timestamp
- **Removed tools**: Move to `docs/tools/archived/`

**Update README files (if warranted):**

- Main `README.md`: New features, setup changes
- `src/README.md`: Architecture changes
- `src/tools/README.md`: Tool inventory updates

**Memory consolidation:**

Follow decision tree from `.serena/memories/memory_management.md`:

1. Try consolidation first (update existing memories)
2. Only create new memory if NO existing memory fits
3. Ask user before creating new memory
4. Skip memory for issue-specific details (use Linear/ADR instead)

**Validate memories:**

```bash
.serena/scripts/validate-memories.sh

if [ $? -ne 0 ]; then
  echo "❌ Memory validation failed"
  echo "Fix violations before continuing"
  exit 1
fi
```

**Update context file:**

Use `Read` then `Write` to update context:

```bash
# Add 6 to executedPhases array
echo "✅ Context updated: Documentation complete"
```

**Update Linear:**

```markdown
### Documentation Phase Complete

**CHANGELOG**: Updated with timestamp $CURRENT_TIMESTAMP
**Tool Docs**: [Updated/Created/Not needed]
**Memories**: [Updated/Created/Skipped]

**Status**: Documentation complete, proceeding to commit & PR
```

### Phase 11: Commit & PR Creation (07-commit-push logic)

**Delegate entire commit and PR creation to git-expert agent:**

Use the `Task` tool with `subagent_type: git-expert`:

```
Task: Create comprehensive commit and GitHub PR

Context:
- Working directory: $WORKTREE_PATH (worktree)
- Branch: $BRANCH_NAME
- Issue: $ISSUE_ID (Linear)
- All changes are ready to commit

Commit Message Requirements:
- Format: [type]([scope]): [subject under 72 chars]
- Include detailed description (minimum 3-5 sentences)
- Explain WHAT changed and WHY
- List specific file changes
- List key functions/classes modified
- Note tests and documentation updates
- Breaking changes if any
- Footer: Fixes $ISSUE_ID

PR Requirements:
- Title: [Issue Title from Linear issue]
- Body sections:
  * Summary (implements $ISSUE_ID)
  * Implementation Details (from git diff)
  * Testing checklist (TypeScript, unit tests, manual)
  * Linear Issue link (Closes [Linear URL])
- Base branch: master
- Head branch: $BRANCH_NAME

Please:
1. Stage all changes (git add -A)
2. Create comprehensive multi-line commit
3. Push branch to origin
4. Create GitHub PR
5. Return PR URL and PR number

Expected output:
- Commit SHA
- PR URL
- PR number
```

**After git-expert completes, capture PR details:**

```bash
# git-expert will provide these values
PR_URL="[from git-expert output]"
PR_NUMBER="[from git-expert output]"
COMMIT_SHA="[from git-expert output]"

echo "✅ Commit and PR created:"
echo "   Commit: $COMMIT_SHA"
echo "   PR: #$PR_NUMBER"
echo "   URL: $PR_URL"
```

**Update context file with PR info:**

Use `Read` then `Write` to update context:

```bash
# Set prUrl = $PR_URL
# Set prNumber = $PR_NUMBER
# Add 7 to executedPhases array
echo "✅ Context updated with PR information"
```

**Update Linear issue:**

Use `linear-expert`:

```markdown
### Commit & PR Phase Complete

## 🔀 Pull Request Created

**PR**: $PR_URL
**Number**: #$PR_NUMBER
**Branch**: `$BRANCH_NAME` → master
**Commit**: $COMMIT_SHA

### Workflow Summary
- ✅ Planning approved
- ✅ Contracts defined
- ✅ Implementation verified
- ✅ Code review passed
- ✅ Tests [passed/skipped]
- ✅ Documentation updated
- ✅ PR created

**Status**: In Review

### Next Steps
1. Review PR
2. Obtain approval
3. Merge to master
4. Run: `/worktree/cleanup $BRANCH_NAME`
```

**Update Linear issue status to "In Review"**

### Phase 12: Registry & Completion

**Update worktree registry:**

Use the registry helper script:

```bash
cd "$PROJECT_ROOT"

# Add worktree to registry
node scripts/worktree-registry.js add \
  "$ISSUE_ID" \
  "$BRANCH_NAME" \
  "$WORKTREE_PATH" \
  "$PR_NUMBER" \
  "$PR_URL"

echo "📝 Registry updated"
```

**Display completion summary:**

```
╔════════════════════════════════════════════╗
║  🌳 Worktree Workflow Complete             ║
╚════════════════════════════════════════════╝

📋 Summary:
   Issue: $ISSUE_ID
   Branch: $BRANCH_NAME
   Worktree: $WORKTREE_PATH

🔀 Pull Request:
   URL: $PR_URL
   Number: #$PR_NUMBER
   Status: Open - awaiting review

✅ Phases Completed:
   1. ✅ Planning (approved)
   2. ✅ Staging (contracts created)
   3. ✅ Implementation (verified)
   4. ✅ Code Review (passed)
   5. ✅ Testing ([passed/skipped])
   6. ✅ Documentation (updated)
   7. ✅ Commit & PR (created)

📍 Worktree Status:
   Location: $WORKTREE_PATH
   Preserved for review

🧹 Cleanup Instructions:
   After PR is merged, run:
   /worktree/cleanup $BRANCH_NAME

💡 Next Steps:
   1. Review PR on GitHub
   2. Obtain approvals
   3. Merge to master
   4. Clean up worktree
```

**Return to main repository:**

```bash
# Context file remains in worktree for reference
# Registry tracks worktree for cleanup

cd "$PROJECT_ROOT"
pwd
echo "📍 Returned to main repository"
```

## Error Recovery

If any phase fails:

1. **Planning failure**: Refine strategy or cancel
2. **Worktree creation failure**: Check git state, permissions
3. **Implementation failure**: Fix errors, re-run build
4. **Test failure**: Review failures, fix or proceed with caution
5. **PR creation failure**: Check `gh` CLI auth, network

**On critical failure:**

```
❌ Workflow failed at phase [N]

Worktree preserved at: $WORKTREE_PATH

Options:
1. Fix issues and manually complete remaining phases
2. Delete worktree: /worktree/cleanup $BRANCH_NAME --force
3. Resume workflow: cd $WORKTREE_PATH && [manual commands]
```

## Important Notes

- **Isolation**: All work happens in separate worktree
- **Context Sharing**: Single context file shared across phases
- **Pause Points**: Plan approval, implementation verification, test results
- **Linear Integration**: Team ID from `$LINEAR_TEAM_ID` environment variable
- **Generic Language**: Linear comments use generic terminology
- **Registry**: Tracks all active worktrees via `scripts/worktree-registry.js`
- **Git Operations**: Delegated to git-expert agent for safety
- **Cleanup**: Manual after PR merge (safe approach)
- **Preservation**: Worktree remains until explicit cleanup
