---
name: start
version: 1.0.0
description: Execute complete workflow in feature branch
author: Shayon Pal
tags: [workflow, implement, automation, git, linear]
argument_hint: <linear-issue-id>
env:
  LINEAR_TEAM_ID: d1aae15e-d5b9-418d-a951-adcf8c7e39a8
  PROJECT_ROOT: /Users/shayon/DevProjects/mcp-for-lifeos
---

# Implement Start - Feature Branch Workflow

Execute complete MCP for LifeOS workflow: planning → staging → implementation → review → testing → documentation → PR creation.

## Help

```
Usage: /implement/start <issue-id>
Example: /implement/start MCP-123
Cleanup: /implement/cleanup <issue-id>
```

## Instructions

### Phase 0: Validation & Pre-flight

Parse issue ID, validate arguments.

### Phase 1: Context Gathering

Activate Serena for project context.  
Read memories: project_context, conventions, error_handling, tool_router, mcp_protocol, testing, documentation.  
Get Linear issue via `linear-expert`: title, description, acceptance criteria, status, labels, dependencies.  
Read `docs/CURRENT-FOCUS.md` for cycle priorities.

### Phase 2: Branch Name Generation

Use `linear-expert` to analyze issue and generate semantic branch name.

Types: feature|bugfix|hotfix|refactor|test|doc|design
Format: `{type}/{ISSUE-ID}-{3-5-word-description}`  
Example: `feature/MCP-123-add-date-range-filter`

### Phase 3: Branch Creation

Delegate to `git-expert`:

- Checkout master, pull origin/master
- Create feature branch: `$BRANCH_NAME`
- Push with upstream tracking

Working directory: `$PROJECT_ROOT`

---

## Workflow Phases

### Phase 4: Planning

Use `agent-Plan` for codebase exploration: find existing code to enhance, integration points, architectural compliance, risks.

Generate planning doc: requirements, technical strategy (approach, risks, integration), implementation plan (phases, testing, docs), recommendation.

**Display planning document:**

```
═══════════════════════════════════════════════════════════
📋 PLANNING DOCUMENT: $ISSUE_ID
═══════════════════════════════════════════════════════════

[Show complete planning doc with all sections:]
- Requirements
- Technical Strategy (approach, risks, integration)
- Implementation Plan (phases, testing, docs)
- Recommendation

═══════════════════════════════════════════════════════════
```

AskUser: "Consult experts before proceeding?" → Yes/No
AskUser: "Ready to proceed?" → Approve/Refine/Cancel

If Approve: Continue
If Refine: Loop with feedback
If Cancel: Exit

Update Linear: "Planning complete, branch: $BRANCH_NAME, status: staging"

### Phase 5: Staging

Create `dev/contracts/MCP-${ISSUE_ID}-contracts.ts`

Use Serena to find existing type patterns.

Generate contracts: Input interfaces, Output interfaces, Error contracts, Integration contracts, Behavioral contracts (MUST/MUST NOT).

Update Linear: "Staging complete, contracts defined"

### Phase 6: Implementation

Verify contracts exist.

Use Serena for symbol-level implementation:

- `get_symbols_overview`, `find_symbol`, `replace_symbol_body`, `insert_before_symbol`, `insert_after_symbol`
- Prefer enhancing existing code over new code

Implementation cycle:

1. Import contracts
2. Implement to interfaces
3. `npm run typecheck`
4. Refactor
5. Repeat until complete

Run `npm run build` and `npm run typecheck` - must pass.

AskUser (multiselect): "Manual verification complete?" → Tested functionality / Checked existing features / Meets requirements

Update Linear: "Implementation complete, verified"

### Phase 7: Code Review

Analyze with Serena: check modified symbols, duplication, error handling, validation.

Run `npm run typecheck` and `npm run test:unit`.

Generate review findings: TypeScript status, MCP protocol compliance, architecture compliance, critical issues, duplication, requirements validation.

Update Linear: "Code review complete"

### Phase 8: Testing

Assess if tests needed (skip for docs-only, run for tools/logic/bugs).

If tests needed:

- Run `npm run typecheck`, `npm test`, MCP-specific tests
- If failures: AskUser → "Fix first" or "Proceed with caution"

AskUser: "Tests complete, proceed to docs?" → Proceed/Fix

Update Linear: "Testing complete" or "Testing skipped (reason)"

### Phase 9: Documentation

Capture timestamp: `CURRENT_TIMESTAMP=$(date "+%Y-%m-%d %H:%M")"`

Update CHANGELOG.md with timestamped entry.  
Update tool docs if tools added/modified/removed.  
Update READMEs if warranted.  
Consolidate memories per memory_management.md guidelines.  
Run `.serena/scripts/validate-memories.sh` - must pass.

Update Linear: "Documentation complete"

### Phase 10: Commit & PR

Delegate to `git-expert`:

Create commit:

- Format: `[type]([scope]): [subject under 72 chars]`
- Detailed description (3-5 sentences explaining WHAT and WHY)
- List file changes, functions/classes modified, tests, docs
- Breaking changes if any
- Footer: `Fixes $ISSUE_ID`

Create PR:

- Title: [Issue Title from Linear]
- Body: Summary, Implementation Details, Testing checklist, Linear Issue link
- Base: master, Head: $BRANCH_NAME

Stage, commit, push, create PR, return PR_URL and PR_NUMBER.

Update Linear: "PR created: $PR_URL, status: In Review"  
Set Linear issue status to "In Review".

### Phase 11: Completion

Display summary: Issue, Branch, PR URL/Number, phases completed.

AskUser: "PR created. What next?" → Switch to master / Stay on feature branch

If switch to master:

- Delegate to `git-expert`: checkout master, pull origin/master

Display: "Cleanup after PR merge: /implement/cleanup $ISSUE_ID"

## Error Recovery

On failure at any phase:

```bash
# Abort workflow
git checkout master
git branch -D $BRANCH_NAME
```

Pre-flight: Resolve changes, retry  
Branch creation: Check git state, sync master  
Implementation: Fix errors, re-run build  
Tests: Fix or proceed with caution  
PR creation: Check `gh` auth, network

## Important Notes

- Works in main repository on feature branch
- Pause points: plan approval, implementation verification, test results
- Linear integration via `$LINEAR_TEAM_ID`
- Git operations delegated to git-expert
- Cleanup: `/implement/cleanup` after PR merge
