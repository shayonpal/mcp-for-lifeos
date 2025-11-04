# Workflow V2 - Testing Guide

## Quick Test Scenario

Test the complete workflow with a simple documentation change.

### 1. Initialize Workflow

```bash
/workflow-v2:00-init-workflow MCP-TEST-001
```

**Expected**:

- Creates `.claude/workflow-state.json`
- Fetches Linear issue (or fails gracefully)
- Activates Serena
- Shows next step: 01-plan

### 2. Test Status Command

```bash
/workflow-v2:99-status
```

**Expected**:

- Shows issue: MCP-TEST-001
- Current phase: plan
- Progress: 0/8 phases
- Recommends: /workflow-v2:01-plan

### 3. Run Planning Phase

```bash
/workflow-v2:01-plan
```

**Expected**:

- Reads issue from state (no need to provide)
- Parallel agent execution
- Single approval checkpoint
- Marks phase complete
- Updates state

### 4. Test Auto-Continue

```bash
/workflow-v2:99-continue
```

**Expected**:

- Detects next phase: stage
- Asks confirmation
- Executes /workflow-v2:02-stage

### 5. Quick Test - Documentation Change

Make a simple doc change to test auto-skip:

```bash
echo "Test change" >> README.md
git add README.md
git commit -m "test: workflow v2 testing"
```

Then run:

```bash
/workflow-v2:05-test
```

**Expected**:

- Detects documentation-only change
- AUTO-SKIPS tests
- Completes in <1 second
- Marks phase complete

### 6. Verify State Persistence

```bash
cat .claude/workflow-state.json
```

**Expected JSON**:

```json
{
  "version": "2.0",
  "current_issue": "MCP-TEST-001",
  "phases_complete": ["plan", "stage", "test"],
  "test_status": "skipped-auto",
  ...
}
```

### 7. Test Commit Validation

```bash
/workflow-v2:07-commit-push
```

**Expected**:

- Drafts commit message
- Validates BEFORE committing
- Rejects if too short
- Only commits after validation passes

## Key Features to Test

### ✅ State Persistence

- [ ] State file created by 00-init
- [ ] Issue ID stored and reused
- [ ] Branch name persists across commands
- [ ] Phases_complete array updates
- [ ] Cache stores Linear data

### ✅ Shared Utilities

- [ ] LINEAR_TEAM_ID loaded from config (not hardcoded)
- [ ] Serena activated once, reused
- [ ] Output templates consistent
- [ ] Error messages use standard format

### ✅ Quick Wins

- [ ] Doc-only changes skip tests automatically
- [ ] Commit message validated pre-commit
- [ ] No hardcoded team IDs

### ✅ Automation

- [ ] 99-status shows accurate progress
- [ ] 99-continue suggests correct next phase
- [ ] Parallel agents execute simultaneously (check timing)

### ✅ No Worktrees

- [ ] Uses direct feature branch workflow
- [ ] No worktree commands or references
- [ ] Standard git branch operations

## Performance Comparison

Time these operations and compare with V1:

| Operation | V1 | V2 | Improvement |
|-----------|----|----|-------------|
| Context gathering (01-plan) | ~60s | ~20s | 3x faster |
| Test phase (doc changes) | 2-3 min | <1s | 200x faster |
| Commit & push | ~30s | ~20s | Faster |
| Full workflow | 15-20 min | 10-12 min | 25-40% |

## Known Issues to Report

Document any issues you encounter:

1. **State file corruption**: If state gets corrupted, delete and re-init
2. **Agent caching failures**: Cache might not persist across sessions
3. **Validation skips**: If validation skips incorrectly, check state
4. **Parallel execution**: May not work in all Claude Code versions

## Comparison Test

Run same workflow in V1 and V2 side-by-side:

### V1 Workflow

```bash
/workflow:01-plan MCP-123
/workflow:02-stage MCP-123
/workflow:03-execute MCP-123
# ... manual parameter passing each time
```

### V2 Workflow

```bash
/workflow-v2:00-init MCP-123
/workflow-v2:99-continue    # auto-routes to 01-plan
/workflow-v2:99-continue    # auto-routes to 02-stage
/workflow-v2:99-continue    # auto-routes to 03-execute
# ... state persists automatically
```

**Observe**:

- Parameter passing reduction
- Faster execution time
- Fewer user inputs needed
- Progress visibility

## Full Implementation Needed

These commands are **stubs** and need full implementation:

- 02-stage (branch naming, contract generation)
- 03-execute (Serena integration, implementation)
- 04-code-review (duplication detection)
- 06-document (memory consolidation)
- 08-review-pr (parallel analysis)
- 09-release (streamlined checkpoints)

Fully implemented commands:

- 00-init-workflow ✅
- 01-plan ✅
- 05-test ✅
- 07-commit-push ✅
- 99-status ✅
- 99-continue ✅

## Feedback Template

After testing, provide feedback:

**What worked well:**

- [Feature that worked as expected]

**What didn't work:**

- [Issue encountered with details]

**Performance gains observed:**

- [Timing improvements noticed]

**Missing functionality from V1:**

- [Features you need that aren't in V2]

**Suggestions:**

- [Ideas for improvement]
