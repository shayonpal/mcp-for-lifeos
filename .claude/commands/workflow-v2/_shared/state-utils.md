# State Management Utilities

**Purpose**: Workflow state persistence across commands. Enables context passing and progress tracking.

## State File Format

```json
{
  "version": "2.0",
  "current_issue": "MCP-123",
  "branch_name": "feature/MCP-123-add-search",
  "phases_complete": ["plan", "stage", "execute"],
  "current_phase": "code-review",
  "test_status": "passed",
  "validation_results": {
    "typecheck": true,
    "build": true,
    "tests": true
  },
  "timestamps": {
    "started": "2025-11-04T10:00:00Z",
    "last_updated": "2025-11-04T11:30:00Z"
  },
  "cache": {
    "linear-MCP-123": {
      "data": "{...}",
      "expires": 1699102800
    }
  }
}
```

## Functions

### init_workflow_state()

Initialize workflow state for a new issue.

```bash
init_workflow_state() {
  local issue_id="$1"

  echo "📋 Initializing workflow state for $issue_id"

  cat > "$WORKFLOW_STATE_FILE" << EOF
{
  "version": "2.0",
  "current_issue": "$issue_id",
  "branch_name": null,
  "phases_complete": [],
  "current_phase": "plan",
  "test_status": null,
  "validation_results": {},
  "timestamps": {
    "started": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "last_updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  },
  "cache": {}
}
EOF

  echo "✅ Workflow state initialized"
}
```

### read_workflow_state()

Read entire workflow state or specific field.

**Parameters**:
- `$1` - Field path (optional, e.g., "current_issue" or "validation_results.typecheck")

```bash
read_workflow_state() {
  local field_path="$1"

  if [ ! -f "$WORKFLOW_STATE_FILE" ]; then
    echo "⚠️ No workflow state found"
    return 1
  fi

  if [ -z "$field_path" ]; then
    # Return entire state
    cat "$WORKFLOW_STATE_FILE"
  else
    # Return specific field using jq
    jq -r ".$field_path // empty" "$WORKFLOW_STATE_FILE"
  fi
}
```

### write_workflow_state()

Update workflow state field.

**Parameters**:
- `$1` - Field path (e.g., "branch_name" or "validation_results.typecheck")
- `$2` - Value

```bash
write_workflow_state() {
  local field_path="$1"
  local value="$2"

  if [ ! -f "$WORKFLOW_STATE_FILE" ]; then
    echo "❌ No workflow state found. Run /workflow-v2:00-init first"
    return 1
  fi

  # Update field and last_updated timestamp
  local temp_file=$(mktemp)
  jq --arg value "$value" \
     --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
     ".$field_path = \$value | .timestamps.last_updated = \$timestamp" \
     "$WORKFLOW_STATE_FILE" > "$temp_file"

  mv "$temp_file" "$WORKFLOW_STATE_FILE"
}
```

### mark_phase_complete()

Mark a workflow phase as complete.

**Parameters**:
- `$1` - Phase name (plan|stage|execute|review|test|document|commit|pr-review|release)

```bash
mark_phase_complete() {
  local phase="$1"

  echo "✅ Marking phase complete: $phase"

  # Add to phases_complete array if not already present
  local temp_file=$(mktemp)
  jq --arg phase "$phase" \
     --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
     '.phases_complete += [$phase] | .phases_complete |= unique | .timestamps.last_updated = $timestamp' \
     "$WORKFLOW_STATE_FILE" > "$temp_file"

  mv "$temp_file" "$WORKFLOW_STATE_FILE"
}
```

### get_next_phase()

Determine next appropriate phase based on current state.

```bash
get_next_phase() {
  local phases_complete=$(jq -r '.phases_complete | join(",")' "$WORKFLOW_STATE_FILE")

  # Phase progression logic
  case "$phases_complete" in
    *"plan"*)
      if [[ ! "$phases_complete" =~ "stage" ]]; then
        echo "stage"
      elif [[ ! "$phases_complete" =~ "execute" ]]; then
        echo "execute"
      elif [[ ! "$phases_complete" =~ "review" ]]; then
        echo "review"
      elif [[ ! "$phases_complete" =~ "test" ]]; then
        echo "test"
      elif [[ ! "$phases_complete" =~ "document" ]]; then
        echo "document"
      elif [[ ! "$phases_complete" =~ "commit" ]]; then
        echo "commit"
      elif [[ ! "$phases_complete" =~ "pr-review" ]]; then
        echo "pr-review"
      else
        echo "complete"
      fi
      ;;
    *)
      echo "plan"
      ;;
  esac
}
```

### read_workflow_cache()

Read cached data from workflow state.

**Parameters**:
- `$1` - Cache key (e.g., "linear-MCP-123")

```bash
read_workflow_cache() {
  local cache_key="$1"

  if [ ! -f "$WORKFLOW_STATE_FILE" ]; then
    return 1
  fi

  # Check if cache exists and not expired
  local cache_data=$(jq -r ".cache[\"$cache_key\"].data // empty" "$WORKFLOW_STATE_FILE")
  local cache_expires=$(jq -r ".cache[\"$cache_key\"].expires // 0" "$WORKFLOW_STATE_FILE")
  local current_time=$(date +%s)

  if [ -n "$cache_data" ] && [ "$cache_expires" -gt "$current_time" ]; then
    echo "$cache_data"
    return 0
  fi

  return 1
}
```

### write_workflow_cache()

Write data to workflow cache with TTL.

**Parameters**:
- `$1` - Cache key
- `$2` - Data to cache

```bash
write_workflow_cache() {
  local cache_key="$1"
  local data="$2"
  local expires=$(($(date +%s) + WORKFLOW_CACHE_TTL))

  local temp_file=$(mktemp)
  jq --arg key "$cache_key" \
     --arg data "$data" \
     --arg expires "$expires" \
     ".cache[\$key] = {\"data\": \$data, \"expires\": (\$expires | tonumber)}" \
     "$WORKFLOW_STATE_FILE" > "$temp_file"

  mv "$temp_file" "$WORKFLOW_STATE_FILE"
}
```

### clear_workflow_cache()

Clear specific cache entry or all cache.

**Parameters**:
- `$1` - Cache key (optional, clears all if not provided)

```bash
clear_workflow_cache() {
  local cache_key="$1"

  local temp_file=$(mktemp)

  if [ -z "$cache_key" ]; then
    # Clear all cache
    jq '.cache = {}' "$WORKFLOW_STATE_FILE" > "$temp_file"
  else
    # Clear specific cache entry
    jq --arg key "$cache_key" 'del(.cache[$key])' "$WORKFLOW_STATE_FILE" > "$temp_file"
  fi

  mv "$temp_file" "$WORKFLOW_STATE_FILE"
}
```

### show_workflow_status()

Display current workflow progress.

```bash
show_workflow_status() {
  if [ ! -f "$WORKFLOW_STATE_FILE" ]; then
    echo "❌ No active workflow"
    echo "Run /workflow-v2:00-init <issue-id> to start"
    return 1
  fi

  local issue=$(jq -r '.current_issue' "$WORKFLOW_STATE_FILE")
  local branch=$(jq -r '.branch_name // "not created"' "$WORKFLOW_STATE_FILE")
  local phase=$(jq -r '.current_phase' "$WORKFLOW_STATE_FILE")
  local complete=$(jq -r '.phases_complete | join(", ")' "$WORKFLOW_STATE_FILE")

  echo "╔════════════════════════════════════════════╗"
  echo "║  Workflow Status                           ║"
  echo "╚════════════════════════════════════════════╝"
  echo ""
  echo "📋 Issue: $issue"
  echo "🌿 Branch: $branch"
  echo "📍 Current Phase: $phase"
  echo "✅ Complete: $complete"
  echo ""
}
```

## Usage Example

```bash
# Load state utilities
source .claude/commands/workflow-v2/_shared/state-utils.md

# Initialize new workflow
init_workflow_state "MCP-123"

# Read current issue
ISSUE_ID=$(read_workflow_state "current_issue")

# Update branch name after creation
write_workflow_state "branch_name" "feature/MCP-123-add-search"

# Mark phase complete
mark_phase_complete "plan"

# Get next phase
NEXT_PHASE=$(get_next_phase)

# Show status
show_workflow_status
```
