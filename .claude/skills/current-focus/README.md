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
├── scripts/                           # Helper scripts for data collection
│   ├── collect-linear-data.sh        # Linear API queries with cycle ID extraction
│   ├── analyze-git-history.sh        # Git log analysis and Linear references
│   ├── parse-test-results.sh         # npm test output parsing
│   └── generate-document.sh          # Bash heredoc document generation
├── references/                        # Reference documentation
│   └── output-format.md              # Document formatting guidelines
└── README.md                          # This file
```

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
2. Collects Linear cycle data using helper scripts
3. Analyzes git history for commits and PRs
4. Runs test suite and parses results
5. Generates prioritization recommendations
6. Identifies gaps and prompts user action
7. Writes document with UTF-8 encoding
8. Presents summary and next recommended issue

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

### Data Collection Scripts

All scripts output JSON for deterministic parsing:

**collect-linear-data.sh**
```json
{
  "cycle": {...},
  "issues": {
    "active": [...],
    "planned": [...],
    "done": [...]
  },
  "counts": {...}
}
```

**analyze-git-history.sh**
```json
{
  "branch": "master",
  "commits": [...],
  "merges": [...],
  "references": {
    "linear": ["MCP-92", "MCP-91"],
    "prs": ["#144", "#143"]
  }
}
```

**parse-test-results.sh**
```json
{
  "passing": 805,
  "total": 808,
  "failed": 0,
  "failing_tests": [],
  "pass_rate": 99.6,
  "status": "passing"
}
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
| Empty issue list | Check team ID and cycle ID extraction |
| Encoding failure | Verify bash heredoc syntax |
| Token limit exceeded | Reduce query limits in collect-linear-data.sh |

## Maintenance

### Updating Scripts

Scripts are self-contained and can be edited independently:

1. **collect-linear-data.sh** - Adjust query limits or filters
2. **analyze-git-history.sh** - Change days-back or pattern extraction
3. **parse-test-results.sh** - Update test output parsing regex
4. **generate-document.sh** - Modify document template

### Updating SKILL.md

Workflow changes should be reflected in SKILL.md:
- Add/remove phases
- Adjust prioritization factors
- Update context analysis logic

### Updating References

Output format changes go in `references/output-format.md`:
- Section templates
- Formatting guidelines
- Line length requirements

## Version History

**v1.0.0** (2025-11-04)
- Initial skill creation from `/current-focus` command
- Chat context analysis with gap detection
- Work prioritization based on dependencies and test failures
- UTF-8 document generation with bash heredoc
- Helper scripts for Linear/git/test parsing
