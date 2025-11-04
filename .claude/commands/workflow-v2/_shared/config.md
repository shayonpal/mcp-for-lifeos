# Workflow Configuration

**Purpose**: Centralized configuration for workflow commands. Single source of truth for project-specific settings.

## Configuration Values

```bash
# Linear Integration
export WORKFLOW_LINEAR_TEAM_ID="d1aae15e-d5b9-418d-a951-adcf8c7e39a8"
export WORKFLOW_LINEAR_TEAM_NAME="MCP for LifeOS"

# Repository Settings
export WORKFLOW_REPO_PATH="/Users/shayon/DevProjects/mcp-for-lifeos"
export WORKFLOW_DEFAULT_BRANCH="master"

# Serena MCP
export WORKFLOW_SERENA_PROJECT_PATH="/Users/shayon/DevProjects/mcp-for-lifeos"

# State Management
export WORKFLOW_STATE_FILE=".claude/workflow-state.json"
export WORKFLOW_CACHE_TTL="3600" # 1 hour in seconds

# Validation Settings
export WORKFLOW_AUTO_SKIP_TESTS_FOR_DOCS=true
export WORKFLOW_AUTO_PROGRESS_QUALITY_GATES=true
export WORKFLOW_MIN_COMMIT_MESSAGE_LINES=3

# Output Settings
export WORKFLOW_USE_EMOJI=true
export WORKFLOW_VERBOSE_OUTPUT=false
```

## Usage in Commands

Source this config at the start of any workflow command:

```bash
# Load workflow configuration
source .claude/commands/workflow-v2/_shared/config.md
```

## Environment Variable Override

User can override any setting via environment variables:

```bash
export WORKFLOW_LINEAR_TEAM_ID="custom-team-id"
/workflow-v2:01-plan MCP-123
```
