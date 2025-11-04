---
name: 01-plan
version: 2.0.0
description: Planning phase with state management and parallel agent execution
author: Shayon Pal
tags: [workflow-v2, planning]
argument_hint: <linear-issue-id>
---

# Plan - Feature Planning with State Persistence

Comprehensive planning with Linear analysis, Serena insights, and expert validation. Uses workflow state for seamless progression.

## Instructions

### Load Shared Utilities & Read State

```bash
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/agent-utils.md
source .claude/commands/workflow-v2/_shared/state-utils.md
source .claude/commands/workflow-v2/_shared/output-templates.md

# Get issue from state or arguments
ISSUE_ID="${ARGUMENTS:-$(read_workflow_state 'current_issue')}"

if [ -z "$ISSUE_ID" ]; then
  error_output \
    "No Issue ID" \
    "No issue ID provided and no active workflow" \
    "Run: /workflow-v2:00-init-workflow <issue-id> first"
  exit 1
fi

phase_header "Planning Phase" "Comprehensive feature planning for $ISSUE_ID"

# Update current phase in state
write_workflow_state "current_phase" "plan"
```

### Phase 1: Parallel Context Gathering

```bash
echo "🚀 Gathering context (parallel execution)..."

# Run multiple agents in parallel for faster context gathering
run_parallel_agents \
  "linear-expert:Get issue details, acceptance criteria, dependencies" \
  "doc-search:Find relevant documentation and patterns" \
  "agent-Plan:Analyze existing code for enhancement opportunities"

echo "✅ Context gathered from 3 sources"
```

### Phase 2: Technical Feasibility

```bash
echo "🔍 Analyzing technical feasibility..."

# Use cached Linear data
ISSUE_DATA=$(get_linear_issue "$ISSUE_ID")

# Run feasibility checks using Serena
# - Existing code analysis
# - MCP protocol compliance
# - Integration impact
# - Type compatibility
# - Performance/security implications

echo "✅ Feasibility assessment complete"
```

### Phase 3: Expert Consultation (Batch Mode)

```bash
# Simplified consultation - batch all expert opinions at once
checkpoint_output \
  "Expert Consultation" \
  "Planning analysis complete. Review findings above." \
  "Consult additional experts? (none/codex/all)"

# Options:
# - none: Proceed to approval
# - codex: Consult codex skill only
# - all: Consult doc-search, git-expert, agent-Plan

# Based on choice, run consultations in parallel if "all"
```

### Phase 4: Strategy Approval

```bash
# Single consolidated checkpoint instead of iterative loop
checkpoint_output \
  "Implementation Strategy" \
  "[Display comprehensive strategy]" \
  "Approve strategy? (yes/refine/cancel)"

# yes: Mark complete, proceed
# refine: Loop back with feedback
# cancel: Exit workflow
```

### Phase 5: Mark Complete & Store State

```bash
# Mark phase complete
mark_phase_complete "plan"

# Update state with planning results
write_workflow_state "validation_results.planning" "pass"

# Display success
success_output \
  "Planning Phase" \
  "Strategy validated and approved for $ISSUE_ID" \
  "Next: /workflow-v2:02-stage (or run /workflow-v2:99-continue)"

# Show quick status
show_workflow_status
```

## Key Improvements from v1

1. **State Management**: Reads issue from state, writes completion status
2. **Parallel Execution**: Runs 3 agents simultaneously for faster context
3. **Batch Consultation**: Single decision point instead of iterative loop
4. **Auto-progress**: Can use /workflow-v2:99-continue for next phase
5. **Cached Data**: Reuses Linear issue data across commands

## Output Format

```
════════════════════════════════════════════
  Planning Phase
════════════════════════════════════════════

🚀 Gathering context (parallel execution)...
✅ Context gathered from 3 sources

🔍 Analyzing technical feasibility...
✅ Feasibility assessment complete

╔════════════════════════════════════════════╗
║  🤔 Implementation Strategy                 ║
╚════════════════════════════════════════════╝

[Strategy details...]

**Approve strategy? (yes/refine/cancel)**

╔════════════════════════════════════════════╗
║  ✅ Planning Phase Complete                 ║
╚════════════════════════════════════════════╝

### 💡 Next Steps
Next: /workflow-v2:02-stage (or run /workflow-v2:99-continue)

╔════════════════════════════════════════════╗
║  Workflow Status - Issue MCP-123            ║
╚════════════════════════════════════════════╝
Progress: [████░░░░░░░░░░░░░░░░] 12% (1/8 phases)
```
