# Current Focus Skill

Project-specific skill for MCP for LifeOS that syncs Linear cycle data with CURRENT-FOCUS.md, analyzes chat context for gaps, prioritizes work, and provides actionable recommendations.

## Overview

This skill replaces the `/current-focus` slash command for complex update workflows while keeping the command available for simple view operations.

## Trigger Keywords

- "show current focus" - Display current CURRENT-FOCUS.md
- "update current focus" - Full workflow with fresh data collection
- "current focus" - Context-dependent behavior

## Skill Structure

```
current-focus/
├── SKILL.md                           # Main workflow and instructions
├── references/                        # Reference documentation
│   └── output-format.md              # Document formatting guidelines (75-line limit)
└── README.md                          # This file
```

**Note:** Claude calls MCP tools directly (no bash scripts - they cannot call MCP tools).

## Features

### 1. Linear Cycle Synchronization

- Extracts cycle ID (not cycle number) from `list_cycles`
- Token-limited parallel queries to avoid API limits
- Validation checkpoints for data quality

### 2. Chat Context Analysis

- **Recency-weighted scan**: Last 20-30 messages
- **Pattern-based detection**: Entire session for MCP-XXX, test failures, commits
- **Gap identification**: Work mentioned but not in Linear cycle

### 3. Work Prioritization

Priority factors (in order):

1. **Blocking dependencies** - Issues that block others get highest priority
2. **Test failures** - Issues related to failing tests
3. **Cycle deadline proximity** - Urgency based on cycle end date

**Note:** Linear priority labels are ignored (often missed or mislabeled)

### 4. Gap Analysis

When work is detected in chat but not in Linear:

- Search Linear for existing issues
- Create new issues (with user approval)
- Ignore and document in "Future Work" section

### 5. UTF-8 Document Generation

- Uses bash heredoc (not Edit tool) for encoding safety
- Atomic file write with verification
- Preserves Project Health section
- Emoji count validation (≥5 emojis)

## Usage Examples

### Update Current Focus

**User:** "update current focus"

**Skill workflow:**

1. Scans last 20-30 messages for context
2. Collects Linear cycle data via MCP tools (with cycle ID filter)
3. Analyzes git history for commits and PRs
4. Runs test suite and parses results
5. Generates prioritization recommendations
6. Identifies gaps and prompts user action
7. Writes document with UTF-8 encoding via bash heredoc
8. Runs markdownlint-cli2 auto-fix
9. Presents summary and next recommended issue

### Show Current Focus

**User:** "show current focus"

**Skill behavior:**

- Reads existing CURRENT-FOCUS.md
- Displays content in formatted markdown
- No data collection or updates

### Context-Aware Update

**User:** "we just completed MCP-92 and are ready to move on. what's next?"

**Skill workflow:**

1. Detects MCP-92 completion in context
2. Updates CURRENT-FOCUS.md with fresh cycle data
3. Analyzes dependencies and prioritizes
4. Recommends next issue based on blockers and test status

## Integration with Existing Workflow

### Division of Responsibility

| Component | Purpose | Use Case |
|-----------|---------|----------|
| `/current-focus` command | View-only mode | Quick display without updates |
| `current-focus` skill | Full update workflow | Complex analysis with prioritization |

### Data Collection Approach

**Claude calls MCP tools directly** (bash scripts cannot call MCP tools - they only work in Claude's execution context).

**CRITICAL:** All Linear issue queries MUST include `cycle: cycleId` parameter to filter to current cycle only.

**Correct approach:**

```javascript
// Step 1: Get current cycle
const cycleData = await mcp__linear-server__list_cycles({
  teamId: "d1aae15e-d5b9-418d-a951-adcf8c7e39a8",
  type: "current"
});
const cycleId = cycleData[0].id;

// Step 2: Query issues with cycle filter
const issues = await mcp__linear-server__list_issues({
  team: "d1aae15e-d5b9-418d-a951-adcf8c7e39a8",
  cycle: cycleId,  // ← CRITICAL: Without this, pulls ALL cycles
  state: "Todo"
});
```

**Common mistake:**

```javascript
// WRONG - pulls from ALL cycles
const issues = await mcp__linear-server__list_issues({
  team: "d1aae15e-d5b9-418d-a951-adcf8c7e39a8",
  state: "Todo"  // ← Missing cycle filter
});
```

## Configuration

**MCP for LifeOS specifics (hardcoded):**

- Team ID: `d1aae15e-d5b9-418d-a951-adcf8c7e39a8`
- Project directory: `/Users/shayon/DevProjects/mcp-for-lifeos`
- Document location: `docs/CURRENT-FOCUS.md`

## Error Handling

| Error | Recovery |
|-------|----------|
| No cycle found | Verify Linear MCP server connection |
| Empty issue list | Check cycle ID is used in all queries (SKILL.md Phase 2) |
| Wrong cycle issues | Verify `cycle: cycleId` parameter in all list_issues calls |
| Encoding failure | Verify bash heredoc syntax |
| Line count > 75 | Reduce verbosity per references/output-format.md rules |

## Maintenance

### Updating SKILL.md

Workflow changes should be reflected in SKILL.md:

- Add/remove phases
- Adjust prioritization factors
- Update context analysis logic
- Modify Linear state queries (Phase 2, Step 2)
- Change verbosity rules (Phase 5)

### Updating References

Output format changes go in `references/output-format.md`:

- Section templates (≤75 lines)
- Formatting guidelines
- Verbosity reduction rules

## Version History

**v1.0.0** (2025-11-04)

- Initial skill creation from `/current-focus` command
- Chat context analysis with gap detection (recency-weighted + pattern-based)
- Work prioritization (blocking dependencies > test failures > deadlines)
- Direct MCP tool execution (all Linear states: In Progress, In Review, Todo, Backlog, Deferred, Done)
- UTF-8 document generation via bash heredoc with markdownlint auto-fix
- 75-line limit enforcement (focus on future work, minimal past work)
