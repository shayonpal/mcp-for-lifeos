---
name: 99-continue
version: 2.0.0
description: Auto-execute next appropriate workflow phase
author: Shayon Pal
tags: [workflow-v2, automation, orchestration]
---

# Workflow Continue - Auto-Execute Next Phase

Automatically determine and execute the next appropriate workflow phase based on current state.

## Instructions

### Load Shared Utilities

```bash
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/state-utils.md
source .claude/commands/workflow-v2/_shared/output-templates.md
```

### Determine Next Phase

```bash
if [ ! -f "$WORKFLOW_STATE_FILE" ]; then
  error_output \
    "No Active Workflow" \
    "No workflow state found" \
    "Initialize workflow first: /workflow-v2:00-init-workflow <issue-id>"
  exit 1
fi

ISSUE_ID=$(read_workflow_state "current_issue")
NEXT_PHASE=$(get_next_phase)

if [ "$NEXT_PHASE" = "complete" ]; then
  success_output \
    "Workflow Complete" \
    "All phases finished for issue $ISSUE_ID" \
    "Create release or merge PR manually"
  exit 0
fi
```

### Confirm and Execute

```bash
# Map phase to command number
declare -A PHASE_COMMANDS=(
  ["plan"]="01-plan"
  ["stage"]="02-stage"
  ["execute"]="03-execute"
  ["review"]="04-code-review"
  ["test"]="05-test"
  ["document"]="06-document"
  ["commit"]="07-commit-push"
  ["pr-review"]="08-review-pr"
)

COMMAND=${PHASE_COMMANDS[$NEXT_PHASE]}

checkpoint_output \
  "Auto-Continue Workflow" \
  "Next phase: $NEXT_PHASE\nCommand: /workflow-v2:$COMMAND" \
  "Execute now? (yes/no)"

# Wait for user confirmation
# If yes, execute the command
# If no, show status and exit

echo "Executing: /workflow-v2:$COMMAND $ISSUE_ID"
echo ""

# Execute the next workflow command
# This delegates to the appropriate workflow command
```

## Output Format

```
╔════════════════════════════════════════════╗
║  🤔 Auto-Continue Workflow                  ║
╚════════════════════════════════════════════╝

Next phase: test
Command: /workflow-v2:05-test

**Execute now? (yes/no)**

[If yes:]
Executing: /workflow-v2:05-test MCP-123

[Command output follows...]
```

## Usage Examples

### After completing a phase

```bash
# Just finished code review
/workflow-v2:99-continue

# Auto-detects next phase (test)
# Confirms with user
# Executes /workflow-v2:05-test
```

### Check status first

```bash
/workflow-v2:99-status      # See where you are
/workflow-v2:99-continue    # Execute next phase
```

## Notes

- Reads workflow state to determine next phase
- Requires user confirmation before executing
- Delegates to appropriate workflow command
- Handles workflow completion gracefully
- Smart routing based on completed phases
