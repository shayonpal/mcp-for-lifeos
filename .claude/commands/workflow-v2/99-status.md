---
name: 99-status
version: 2.0.0
description: Show current workflow progress and state
author: Shayon Pal
tags: [workflow-v2, status, progress]
---

# Workflow Status - View Current Progress

Display current workflow state, progress, and next recommended action.

## Instructions

### Load Shared Utilities

```bash
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/state-utils.md
source .claude/commands/workflow-v2/_shared/output-templates.md
```

### Display Workflow Status

```bash
if [ ! -f "$WORKFLOW_STATE_FILE" ]; then
  echo "❌ No active workflow"
  echo ""
  echo "Initialize a workflow:"
  echo "  /workflow-v2:00-init-workflow <issue-id>"
  exit 0
fi

# Read workflow state
ISSUE_ID=$(read_workflow_state "current_issue")
BRANCH=$(read_workflow_state "branch_name")
CURRENT_PHASE=$(read_workflow_state "current_phase")
PHASES_COMPLETE=$(read_workflow_state "phases_complete")
TEST_STATUS=$(read_workflow_state "test_status")

# Calculate progress
TOTAL_PHASES=8
COMPLETE_COUNT=$(echo "$PHASES_COMPLETE" | jq 'length')

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Workflow Status - Issue $ISSUE_ID                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Progress indicator
progress_indicator "$COMPLETE_COUNT" "$TOTAL_PHASES"
echo ""

# Current status
summary_table \
  "Current Status" \
  "Issue:$ISSUE_ID" \
  "Branch:${BRANCH:-not created}" \
  "Current Phase:$CURRENT_PHASE" \
  "Test Status:${TEST_STATUS:-not run}"

# Phases checklist
echo "### 📋 Phase Checklist"
echo ""

declare -a ALL_PHASES=("plan" "stage" "execute" "review" "test" "document" "commit" "pr-review")

for phase in "${ALL_PHASES[@]}"; do
  if echo "$PHASES_COMPLETE" | jq -e ".[] | select(. == \"$phase\")" > /dev/null 2>&1; then
    echo "- ✅ $phase"
  elif [ "$phase" = "$CURRENT_PHASE" ]; then
    echo "- ⏳ $phase (in progress)"
  else
    echo "- ⏸️ $phase (pending)"
  fi
done

echo ""

# Validation status
TYPECHECK=$(read_workflow_state "validation_results.typecheck")
BUILD=$(read_workflow_state "validation_results.build")
TESTS=$(read_workflow_state "validation_results.tests")

if [ -n "$TYPECHECK" ] || [ -n "$BUILD" ] || [ -n "$TESTS" ]; then
  validation_results \
    "typecheck:${TYPECHECK:-skip}:" \
    "build:${BUILD:-skip}:" \
    "tests:${TESTS:-skip}:"
fi

# Next action
NEXT_PHASE=$(get_next_phase)

if [ "$NEXT_PHASE" = "complete" ]; then
  echo "🎉 All phases complete!"
  echo ""
  echo "Next: Create release or merge PR"
else
  echo "### 💡 Next Action"
  echo ""
  echo "Recommended: /workflow-v2:0${ALL_PHASES[@]/$NEXT_PHASE/}-$NEXT_PHASE"
  echo "Or run: /workflow-v2:99-continue"
  echo ""
fi

# Timestamps
STARTED=$(read_workflow_state "timestamps.started")
UPDATED=$(read_workflow_state "timestamps.last_updated")

echo "---"
echo "Started: $STARTED"
echo "Last updated: $UPDATED"
echo ""
```

## Output Format

```
╔════════════════════════════════════════════════════════════╗
║  Workflow Status - Issue MCP-123                           ║
╚════════════════════════════════════════════════════════════╝

Progress: [████████████░░░░░░░░] 60% (5/8 phases)

### 📊 Current Status

Issue          : MCP-123
Branch         : feature/MCP-123-add-search
Current Phase  : test
Test Status    : passed

### 📋 Phase Checklist

- ✅ plan
- ✅ stage
- ✅ execute
- ✅ review
- ⏳ test (in progress)
- ⏸️ document (pending)
- ⏸️ commit (pending)
- ⏸️ pr-review (pending)

### 🔍 Validation Results

- ✅ typecheck: Passed
- ✅ build: Passed
- ✅ tests: Passed

### 💡 Next Action

Recommended: /workflow-v2:06-document
Or run: /workflow-v2:99-continue

---
Started: 2025-11-04T10:00:00Z
Last updated: 2025-11-04T11:30:00Z
```

## Notes

- Shows real-time workflow progress
- Displays validation results
- Recommends next action
- Works without arguments
- Non-destructive read-only operation
