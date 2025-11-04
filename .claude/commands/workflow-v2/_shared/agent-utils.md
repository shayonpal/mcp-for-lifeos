# Agent Utilities

**Purpose**: Shared functions for agent activation and orchestration. Eliminates duplication across workflow commands.

## Functions

### activate_serena()

Activates Serena MCP with project context and loads relevant memories.

```bash
activate_serena() {
  echo "🤖 Activating Serena MCP..."

  # Activate project
  mcp__serena__activate_project with project: $WORKFLOW_SERENA_PROJECT_PATH

  # List available memories
  mcp__serena__list_memories

  # Read commonly needed memories
  mcp__serena__read_memory for: code-standards, architecture-pattern-*, mcp-tool-patterns, error-handling-patterns

  echo "✅ Serena activated"
}
```

### get_linear_issue()

Fetches Linear issue details with caching.

**Parameters**:
- `$1` - Issue ID (e.g., MCP-123)
- `$2` - Force refresh (optional, default: false)

```bash
get_linear_issue() {
  local issue_id="$1"
  local force_refresh="${2:-false}"

  # Check cache first (unless force refresh)
  if [ "$force_refresh" != "true" ]; then
    local cached=$(read_workflow_cache "linear-${issue_id}")
    if [ -n "$cached" ]; then
      echo "📦 Using cached Linear issue data"
      echo "$cached"
      return 0
    fi
  fi

  echo "🔍 Fetching Linear issue: $issue_id"

  # Use linear-expert agent to fetch issue
  # Agent: linear-expert
  # Task: Get comprehensive issue details
  #
  # Please fetch:
  # - Issue ID, title, description
  # - Current status, priority
  # - Acceptance criteria
  # - Comments and recent updates
  # - Labels, project association
  #
  # Team ID: $WORKFLOW_LINEAR_TEAM_ID
  # Issue ID: $issue_id

  # Cache result for session
  write_workflow_cache "linear-${issue_id}" "$issue_data"

  echo "$issue_data"
}
```

### update_linear_issue()

Updates Linear issue with comment and/or status change.

**Parameters**:
- `$1` - Issue ID
- `$2` - Comment text
- `$3` - New status (optional)

```bash
update_linear_issue() {
  local issue_id="$1"
  local comment="$2"
  local new_status="$3"

  echo "📝 Updating Linear issue: $issue_id"

  # Use linear-expert agent
  # Agent: linear-expert
  # Task: Update issue with comment and status
  #
  # Team ID: $WORKFLOW_LINEAR_TEAM_ID
  # Issue ID: $issue_id
  # Comment: $comment
  # Status: $new_status (if provided)

  # Invalidate cache after update
  clear_workflow_cache "linear-${issue_id}"

  echo "✅ Linear issue updated"
}
```

### run_git_analysis()

Runs git-expert agent for commit/branch analysis.

**Parameters**:
- `$1` - Analysis type (commits|diff|history)
- `$2` - Additional context (optional)

```bash
run_git_analysis() {
  local analysis_type="$1"
  local context="$2"

  echo "📊 Running git analysis: $analysis_type"

  # Use git-expert agent based on analysis type
  case "$analysis_type" in
    commits)
      # Agent: git-expert
      # Task: Analyze recent commits
      # Context: $context
      ;;
    diff)
      # Agent: git-expert
      # Task: Show detailed diff with statistics
      # Context: $context
      ;;
    history)
      # Agent: git-expert
      # Task: Show commit history and categorize changes
      # Context: $context
      ;;
  esac
}
```

### run_parallel_agents()

Executes multiple agents in parallel and collects results.

**Parameters**:
- `$@` - Array of agent tasks in format "agent_name:task_description"

```bash
run_parallel_agents() {
  local agent_tasks=("$@")

  echo "🚀 Running ${#agent_tasks[@]} agents in parallel..."

  # Execute all agent tasks in single message with multiple tool calls
  # This leverages Claude Code's ability to parallelize independent tool uses

  for task in "${agent_tasks[@]}"; do
    IFS=':' read -r agent_name task_desc <<< "$task"
    echo "  - $agent_name: $task_desc"
  done

  # Agents execute in parallel here
  # Results collected and returned

  echo "✅ Parallel agent execution complete"
}
```

## Usage Examples

### In a workflow command:

```bash
---
description: Example workflow command
---

# Load shared utilities
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/agent-utils.md

# Activate Serena once at start
activate_serena

# Get Linear issue with caching
ISSUE_DATA=$(get_linear_issue "MCP-123")

# Run multiple agents in parallel
run_parallel_agents \
  "doc-search:Find relevant documentation" \
  "git-expert:Analyze recent commits" \
  "linear-expert:Get related issues"

# Update Linear issue
update_linear_issue "MCP-123" "Phase completed" "In Progress"
```
