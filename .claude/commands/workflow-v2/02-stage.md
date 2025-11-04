---
name: 02-stage
version: 2.0.0
description: Generate branch name and implementation contracts
author: Shayon Pal
tags: [workflow-v2, staging]
argument_hint: <linear-issue-id>
---

# Stage - Branch Naming & Contracts (Simplified Stub)

**Note**: This is a simplified stub for testing. Full implementation pending.

## Instructions

```bash
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/agent-utils.md
source .claude/commands/workflow-v2/_shared/state-utils.md
source .claude/commands/workflow-v2/_shared/output-templates.md

ISSUE_ID="${ARGUMENTS:-$(read_workflow_state 'current_issue')}"
write_workflow_state "current_phase" "stage"

echo "🌿 Generating branch name..."
# Use linear-expert to analyze issue and generate semantic branch name
BRANCH_NAME="feature/${ISSUE_ID}-implementation"
write_workflow_state "branch_name" "$BRANCH_NAME"

echo "📝 Creating contracts..."
# Generate TypeScript contracts in dev/contracts/MCP-${ISSUE_ID}-contracts.ts

mark_phase_complete "stage"
success_output "Staging Phase" "Branch: $BRANCH_NAME, Contracts: Ready" "Next: /workflow-v2:03-execute"
show_workflow_status
```
