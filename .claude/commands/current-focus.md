---
name: current-focus
version: 2.1.0
description: Sync Linear cycle information with CURRENT-FOCUS.md for MCP for LifeOS project
author: Shayon Pal
tags: [linear, mcp-for-lifeos, project-management, documentation]
argument_hint: [update|view|help|debug]
allowed-tools:
  - mcp__linear-server__list_cycles
  - mcp__linear-server__list_issues
  - Bash(git log:*)
  - Bash(git rev-parse:*)
  - Bash(npm test:*)
  - Bash(cat:*)
  - Bash(file:*)
  - Bash(grep:*)
---

# Current Focus - Linear to CURRENT-FOCUS.md

Synchronize Linear cycle data with docs/CURRENT-FOCUS.md, combining issue states, git history, and test results.

**See Also:**

- Linear Team ID: `CLAUDE.md` (root)
- Test execution: `docs/development/TESTING.md`
- Error handling: `docs/guides/TROUBLESHOOTING.md`
- Format reference: `docs/CURRENT-FOCUS.md` (actual file)

## Arguments

- **`update`** or (no args): Fetch Linear data and update CURRENT-FOCUS.md
- **`view`**: Display current CURRENT-FOCUS.md
- **`debug`** or `--debug`: Show data collection summary before updating
- **`help`** or `--help`: Show usage guide

## Help Mode

If user provides `--help` or `help`:

```
current-focus - Sync Linear cycle with CURRENT-FOCUS.md

USAGE:
  current-focus              Update CURRENT-FOCUS.md with Linear cycle data
  current-focus view         Display current CURRENT-FOCUS.md
  current-focus debug        Show data preview before updating
  current-focus help         Show this help

LINEAR TEAM: MCP for LifeOS (configured in workflow-v2 shared config)

EXAMPLES:
  current-focus              Update focus document
  current-focus view         View current focus
  current-focus debug        Preview changes before commit
```

## Instructions

### Step 0: Load Workflow Configuration

```bash
# Load shared workflow configuration
source .claude/commands/workflow-v2/_shared/config.md

# Use configuration variables
PROJECT_DIR="$WORKFLOW_REPO_PATH"
FOCUS_DOC="$PROJECT_DIR/docs/CURRENT-FOCUS.md"

[ ! -d "$PROJECT_DIR" ] && echo "❌ Error: MCP for LifeOS project not found at $PROJECT_DIR" && exit 1
```

### Step 2: Parse Mode

```bash
MODE="${ARGUMENTS:-update}"
DEBUG=false

# Check for debug flag
[[ "$MODE" =~ debug|--debug ]] && DEBUG=true && MODE="update"

case "$MODE" in
  update|"") MODE="update" ;;
  view) MODE="view" ;;
  help|--help) MODE="help" ;;
  *) echo "❌ Error: Unknown mode '$MODE'" && echo "Valid: update, view, debug, help" && exit 1 ;;
esac
```

### Step 3: Execute Mode

**Help Mode:** Show help text above and exit

**View Mode:**

```bash
if [ "$MODE" = "view" ]; then
  [ -f "$FOCUS_DOC" ] && cat "$FOCUS_DOC" || echo "❌ Error: File doesn't exist. Run 'current-focus update'"
  exit 0
fi
```

**Update Mode:** Continue to Step 4

### Step 4: Collect Linear Data

Use Linear MCP server with team ID from workflow configuration.

**Phase A: Get Current Cycle**

```bash
# Use team ID from shared config (loaded in Step 0)
TEAM_ID="$WORKFLOW_LINEAR_TEAM_ID"

# Get current cycle metadata
CYCLE_DATA=$(mcp__linear-server__list_cycles team="$TEAM_ID" type="current")

# Extract cycle ID (CRITICAL: use ID, not cycle number!)
CYCLE_ID=$(echo "$CYCLE_DATA" | extract id)
CYCLE_NAME=$(echo "$CYCLE_DATA" | extract name)
CYCLE_START=$(echo "$CYCLE_DATA" | extract startsAt)
CYCLE_END=$(echo "$CYCLE_DATA" | extract endsAt)
CYCLE_PROGRESS=$(echo "$CYCLE_DATA" | extract progress)

# Validation checkpoint
[ -z "$CYCLE_ID" ] && echo "❌ Error: No current cycle found" && exit 1
```

**Phase B: Collect Issues (Token-Limited Queries)**

Run parallel targeted queries to avoid token limits:

```bash
# Active Work (In Progress + In Review)
ACTIVE_ISSUES=$(mcp__linear-server__list_issues \
  team="$TEAM_ID" \
  state="In Progress" \
  limit=25)

REVIEW_ISSUES=$(mcp__linear-server__list_issues \
  team="$TEAM_ID" \
  state="In Review" \
  limit=25)

# Planned Work (Todo in current cycle)
PLANNED_ISSUES=$(mcp__linear-server__list_issues \
  team="$TEAM_ID" \
  state="Todo" \
  limit=30)

# Recent Completions (Done in last 3 days)
DONE_ISSUES=$(mcp__linear-server__list_issues \
  team="$TEAM_ID" \
  state="Done" \
  updatedAt="-P3D" \
  limit=20)
```

**Phase C: Validation Checkpoints**

```bash
# Count total issues collected
ACTIVE_COUNT=$(count_issues "$ACTIVE_ISSUES" "$REVIEW_ISSUES")
PLANNED_COUNT=$(count_issues "$PLANNED_ISSUES")
DONE_COUNT=$(count_issues "$DONE_ISSUES")
TOTAL_ISSUES=$((ACTIVE_COUNT + PLANNED_COUNT + DONE_COUNT))

# Warn if suspiciously low
[ "$TOTAL_ISSUES" -lt 3 ] && echo "⚠️ Warning: Only $TOTAL_ISSUES issues found (expected 10+)"

# Debug mode output
if [ "$DEBUG" = true ]; then
  echo "=== DEBUG: Linear Data Collection ==="
  echo "Cycle ID: $CYCLE_ID"
  echo "Cycle Name: $CYCLE_NAME"
  echo "Active Issues: $ACTIVE_COUNT"
  echo "Planned Issues: $PLANNED_COUNT"
  echo "Recent Completions: $DONE_COUNT"
  echo "Total Issues: $TOTAL_ISSUES"
  echo ""
  echo "Press Enter to continue or Ctrl+C to abort..."
  read
fi
```

### Step 5: Analyze Git Repository

**Git data to collect:**

```bash
# Current branch (using config variable)
CURRENT_BRANCH=$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD)

# Commits from last 3 days
git -C "$PROJECT_DIR" log --since="3 days ago" --pretty=format:"%H|%an|%ar|%s|%b"
```

**Extract:**

- Linear issue references (MCP-XXX pattern)
- Branch names from merge commits
- PR numbers from merge commits
- Classify commits as linked to Linear or ad-hoc work

### Step 6: Run Test Suite

```bash
cd "$PROJECT_DIR" && npm test
```

Parse for: total tests, passing, failing, failed test names/errors

**Reference:** See `docs/development/TESTING.md` for test suite details

### Step 7: Generate and Write CURRENT-FOCUS.md

**CRITICAL REQUIREMENTS:**

- Final document MUST be under 100 lines
- Use bash heredoc for UTF-8 encoding
- Verify encoding after write
- Preserve Project Health section entirely

**Phase A: Read Existing Project Health**

```bash
# Extract Project Health section to preserve it
PROJECT_HEALTH=$(awk '/## 📊 Project Health/,EOF' "$FOCUS_DOC" 2>/dev/null || echo "")
```

**Phase B: Generate Document with Bash Heredoc**

```bash
# Write complete document atomically
cat > "$FOCUS_DOC" << 'EOF'
# Current Development Focus

**Last Updated:** $(date '+%Y-%m-%d %H:%M %Z')
**Cycle:** ${CYCLE_NAME} (${CYCLE_START} - ${CYCLE_END})
**Progress:** ${CYCLE_PROGRESS}% (${COMPLETED}/${TOTAL} issues)

## 📋 Planned (This Cycle)

${PLANNED_SECTION}

## ✅ Recent Completions (Last 3 Days)

${DONE_SECTION}

## ✅ Test Status

**Latest Run ($(date '+%Y-%m-%d')):**
- ✅ ${PASSING_TESTS} passing / ${TOTAL_TESTS} total (${SKIPPED_TESTS} skipped)
- ${TEST_SUITES} test suites, ${TEST_DURATION}
- All integration tests green

**Recent Fixes:**
${TEST_FIXES}

${PROJECT_HEALTH}
EOF
```

**Phase C: Verify Encoding**

```bash
# Verify UTF-8 encoding
if file "$FOCUS_DOC" | grep -q "UTF-8"; then
  # Verify emoji rendering (should have at least 4 emojis)
  EMOJI_COUNT=$(grep -o "[📋✅📊🔧]" "$FOCUS_DOC" | wc -l | xargs)

  if [ "$EMOJI_COUNT" -lt 4 ]; then
    echo "⚠️ Warning: Emoji encoding may have failed (found $EMOJI_COUNT, expected ≥4)"
  fi
else
  echo "❌ Error: File encoding is not UTF-8"
  file "$FOCUS_DOC"
  exit 1
fi
```

#### Data Mapping

| Linear State | Section |
|--------------|---------|
| In Progress, In Review | Active Work |
| Todo, Backlog (in cycle) | Planned Work |
| Done (last 3d) | Recent Completions |
| Done (>3d) | Remove |

#### Format Guidelines

- **Planned Work**: Issue ID + brief title only (1 line per issue)
- **Recent Completions**: Issue ID + 1-sentence summary + key metric
- **Test Status**: Pass rate, duration, critical fixes only
- **Project Health**: Preserve existing content entirely (never auto-update)

### Step 8: Confirm Update

```bash
echo "✅ CURRENT-FOCUS.md updated successfully"
echo "📄 Updated file: $FOCUS_DOC"
echo "🔍 To view: current-focus view"
```

## Error Handling

**Critical errors only (for other errors, see `docs/guides/TROUBLESHOOTING.md`):**

```
❌ Project not found → Verify: /Users/shayon/DevProjects/mcp-for-lifeos
❌ Linear API errors → Check Linear MCP server config in ~/.claude.json
❌ Git errors → Verify git repository: git status
```

## Examples

### Update Focus Document

```bash
/current-focus
```

Updates CURRENT-FOCUS.md with latest Linear cycle and git data.

### View Current Focus

```bash
/current-focus view
```

Displays current CURRENT-FOCUS.md without changes.

## Integration Notes

**Data Collection:**

- Linear MCP server for cycle/issue data
- Git commands for commit history
- npm test for test status

**Document Update:**

- Uses bash heredoc for UTF-8 encoding (not Edit tool)
- Atomic file write with encoding verification
- Preserves Project Health section entirely
- Follows <100 line length requirement
- Referenced by root CLAUDE.md for AI context

**MCP for LifeOS Context:**

- Team ID: Loaded from workflow-v2 shared config
- Cycle-based development workflow
- Direct master branch (no CI/CD)

**Integration with Workflow V2:**

- Uses `WORKFLOW_LINEAR_TEAM_ID` from shared config
- Uses `WORKFLOW_REPO_PATH` for project directory
- Can be called independently or from workflow commands
- Shares configuration with workflow-v2 commands
