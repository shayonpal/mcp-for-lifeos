---
name: 03-execute
version: 2.0.0
description: Execute implementation on feature branch
author: Shayon Pal
tags: [workflow-v2, execution]
argument_hint: <linear-issue-id>
---

# Execute - Implementation (Simplified Stub)

**Note**: This is a simplified stub for testing. Full implementation pending.

## Instructions

```bash
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/agent-utils.md
source .claude/commands/workflow-v2/_shared/state-utils.md
source .claude/commands/workflow-v2/_shared/output-templates.md

ISSUE_ID="${ARGUMENTS:-$(read_workflow_state 'current_issue')}"
BRANCH=$(read_workflow_state "branch_name")
write_workflow_state "current_phase" "execute"

echo "🌿 Creating feature branch: $BRANCH"
git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"

echo "🔨 Implementing changes..."
# Serena-guided implementation
# - Use existing code where possible
# - Import contracts from staging
# - Incremental typecheck validation

mark_phase_complete "execute"
success_output "Execution Phase" "Implementation complete on branch $BRANCH" "Next: /workflow-v2:04-code-review"
show_workflow_status
```
