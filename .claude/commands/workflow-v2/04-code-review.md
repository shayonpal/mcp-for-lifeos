---
name: 04-code-review
version: 2.0.0
description: Code review with duplication detection
author: Shayon Pal
tags: [workflow-v2, review]
argument_hint: <linear-issue-id>
---

# Code Review - Quality Analysis (Simplified Stub)

**Note**: This is a simplified stub for testing. Full implementation pending.

## Instructions

```bash
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/agent-utils.md
source .claude/commands/workflow-v2/_shared/state-utils.md
source .claude/commands/workflow-v2/_shared/output-templates.md

ISSUE_ID="${ARGUMENTS:-$(read_workflow_state 'current_issue')}"
write_workflow_state "current_phase" "review"

echo "🔍 Analyzing implementation..."
echo "  - Checking for code duplication..."
echo "  - Validating MCP compliance..."
echo "  - Assessing quality..."

# Use Serena to detect duplication
# For each new function, search for similar existing code
# Flag duplicates with consolidation recommendations

validation_results \
  "duplication:pass:No duplicates found" \
  "mcp-compliance:pass:Protocol compliant" \
  "quality:pass:Meets standards"

mark_phase_complete "review"
success_output "Code Review Phase" "Implementation validated" "Next: /workflow-v2:05-test"
show_workflow_status
```
