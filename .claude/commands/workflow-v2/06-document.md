---
name: 06-document
version: 2.0.0
description: Update documentation selectively
author: Shayon Pal
tags: [workflow-v2, documentation]
argument_hint: <linear-issue-id>
---

# Document - Selective Updates (Simplified Stub)

**Note**: This is a simplified stub for testing. Full implementation pending.

## Instructions

```bash
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/agent-utils.md
source .claude/commands/workflow-v2/_shared/state-utils.md
source .claude/commands/workflow-v2/_shared/output-templates.md

ISSUE_ID="${ARGUMENTS:-$(read_workflow_state 'current_issue')}"
write_workflow_state "current_phase" "document"

echo "📚 Updating documentation..."
echo "  - CHANGELOG.md (always)"
echo "  - Tool docs (if tools changed)"
echo "  - README (if needed)"

TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
echo "  - Timestamp: $TIMESTAMP"

# Update CHANGELOG.md
# Update tool docs if applicable
# Consider memory consolidation (simplified heuristic)

mark_phase_complete "document"
success_output "Documentation Phase" "Documentation updated with timestamp $TIMESTAMP" "Next: /workflow-v2:07-commit-push"
show_workflow_status
```
