---
name: 00-init-workflow
version: 2.0.0
description: Initialize workflow state for a Linear issue
author: Shayon Pal
tags: [workflow-v2, initialization, state-management]
argument_hint: <linear-issue-id>
---

# Initialize Workflow - Start New Development Workflow

Initialize workflow state management for a Linear issue. Creates tracking file and prepares for subsequent workflow commands.

## Help Mode

```
00-init-workflow - Initialize workflow for Linear issue

USAGE:
  00-init-workflow <linear-issue-id>    Initialize workflow
  00-init-workflow help                 Show this help

DESCRIPTION:
  Creates workflow state file and fetches initial Linear issue context.
  This is the entry point for workflow-v2 command sequence.

EXAMPLES:
  00-init-workflow MCP-123
```

## Instructions

### Load Shared Utilities

```bash
# Load configuration and utilities
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/agent-utils.md
source .claude/commands/workflow-v2/_shared/state-utils.md
source .claude/commands/workflow-v2/_shared/output-templates.md
```

### Step 1: Validate Arguments

```bash
ISSUE_ID="$ARGUMENTS"

if [ -z "$ISSUE_ID" ] || [ "$ISSUE_ID" = "help" ] || [ "$ISSUE_ID" = "--help" ]; then
  cat << EOF
00-init-workflow - Initialize workflow for Linear issue

USAGE:
  00-init-workflow <linear-issue-id>
  00-init-workflow help

EXAMPLES:
  00-init-workflow MCP-123
EOF
  exit 0
fi

# Validate issue ID format
if ! echo "$ISSUE_ID" | grep -qE '^[A-Z]+-[0-9]+$'; then
  error_output \
    "Invalid Issue ID" \
    "Expected format: PROJECT-NUMBER (e.g., MCP-123)" \
    "Provide valid Linear issue ID"
  exit 1
fi
```

### Step 2: Check for Existing Workflow

```bash
if [ -f "$WORKFLOW_STATE_FILE" ]; then
  EXISTING_ISSUE=$(read_workflow_state "current_issue")

  checkpoint_output \
    "Existing Workflow Detected" \
    "Active workflow found for issue: $EXISTING_ISSUE" \
    "Overwrite with new workflow for $ISSUE_ID? (yes/no)"

  # Wait for user response
  # If no, exit
  # If yes, continue
fi
```

### Step 3: Initialize Workflow State

```bash
phase_header \
  "Workflow Initialization" \
  "Setting up workflow tracking for $ISSUE_ID"

# Initialize state file
init_workflow_state "$ISSUE_ID"

echo "✅ Workflow state file created: $WORKFLOW_STATE_FILE"
```

### Step 4: Fetch Linear Issue Context

```bash
echo "🔍 Fetching Linear issue details..."

# Activate Serena once for entire workflow
activate_serena

# Fetch and cache Linear issue
ISSUE_DATA=$(get_linear_issue "$ISSUE_ID")

# Extract key information
ISSUE_TITLE=$(echo "$ISSUE_DATA" | jq -r '.title')
ISSUE_STATUS=$(echo "$ISSUE_DATA" | jq -r '.state.name')
ISSUE_PRIORITY=$(echo "$ISSUE_DATA" | jq -r '.priority')

echo "✅ Issue retrieved: $ISSUE_TITLE"
```

### Step 5: Display Summary & Next Steps

```bash
summary_table \
  "Workflow Initialized" \
  "Issue:$ISSUE_ID" \
  "Title:$ISSUE_TITLE" \
  "Status:$ISSUE_STATUS" \
  "Priority:$ISSUE_PRIORITY"

success_output \
  "Workflow Initialization" \
  "Workflow state initialized for $ISSUE_ID" \
  "Next phase: /workflow-v2:01-plan $ISSUE_ID"

echo "💡 Quick Commands:"
echo "  • Show status: /workflow-v2:99-status"
echo "  • Continue: /workflow-v2:99-continue"
echo ""
```

## Output Format

```
════════════════════════════════════════════
  Workflow Initialization
════════════════════════════════════════════

✅ Workflow state file created
✅ Issue retrieved: [Title]

### 📊 Workflow Initialized

Issue          : MCP-123
Title          : [Issue title]
Status         : [Current status]
Priority       : [Priority level]

╔════════════════════════════════════════════╗
║  ✅ Workflow Initialization Complete       ║
╚════════════════════════════════════════════╝

### 💡 Next Steps
Next phase: /workflow-v2:01-plan MCP-123

💡 Quick Commands:
  • Show status: /workflow-v2:99-status
  • Continue: /workflow-v2:99-continue
```

## Notes

- Creates `.claude/workflow-state.json` file
- Activates Serena MCP (persists for session)
- Caches Linear issue data
- Entry point for all workflow-v2 commands
- Non-destructive: prompts before overwriting existing workflow
