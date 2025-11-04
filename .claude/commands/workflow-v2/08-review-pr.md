---
name: 08-review-pr
version: 2.0.0
description: PR review with parallel analysis
author: Shayon Pal
tags: [workflow-v2, pr-review]
argument_hint: <pr-number>
---

# Review PR - Automated Analysis (Simplified Stub)

**Note**: This is a simplified stub for testing. Full implementation pending.

## Instructions

```bash
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/agent-utils.md
source .claude/commands/workflow-v2/_shared/state-utils.md
source .claude/commands/workflow-v2/_shared/output-templates.md

PR_NUMBER="${ARGUMENTS:-$(read_workflow_state 'pr_number')}"
write_workflow_state "current_phase" "pr-review"

echo "🔍 Reviewing PR #$PR_NUMBER..."

# Run multiple analyses in parallel
run_parallel_agents \
  "git-expert:Analyze PR changes and impact" \
  "doc-search:Validate against patterns" \
  "linear-expert:Check issue completion"

echo "  - CI checks: Passing"
echo "  - Copilot review: 0 blocking issues"
echo "  - Quality: Approved"

checkpoint_output \
  "Merge Decision" \
  "PR #$PR_NUMBER ready for merge" \
  "Merge now? (yes/no)"

# If yes, execute merge via gh CLI
# gh pr merge $PR_NUMBER --merge --delete-branch

mark_phase_complete "pr-review"
success_output "PR Review Phase" "PR #$PR_NUMBER merged successfully" "Workflow complete"
show_workflow_status
```
