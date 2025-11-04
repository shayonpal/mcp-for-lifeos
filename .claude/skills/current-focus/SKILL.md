---
name: current-focus
description: Sync Linear cycle data with CURRENT-FOCUS.md, analyze chat context for gaps, prioritize work based on dependencies and test failures, and provide actionable recommendations. This skill should be used when the user requests "show current focus", "update current focus", or discusses project status and upcoming work.
---

# Current Focus Skill

Generate and update the CURRENT-FOCUS.md document by combining Linear cycle data, git history, test results, and chat context analysis. Provides work prioritization recommendations based on blocking dependencies and test failures.

## Trigger Keywords

- "show current focus" - Display current CURRENT-FOCUS.md
- "update current focus" - Full workflow with fresh data collection
- "current focus" - Context-dependent (show if recently updated, else update)

## Core Capabilities

1. **Linear Cycle Synchronization** - Fetch current cycle data using cycle ID (not number)
2. **Chat Context Analysis** - Scan conversation for Linear issues, commits, test results
3. **Work Prioritization** - Recommend issue order based on dependencies and test failures
4. **Gap Analysis** - Identify missing work from context and prompt user action
5. **UTF-8 Document Generation** - Atomic write with encoding verification

## When to Use This Skill

Use this skill when:
- User explicitly requests "show/update current focus"
- Discussing project status and asking about priorities
- Completing work and need to know what's next
- Planning cycle work and need dependency analysis
- After merging PRs or completing Linear issues

## Workflow

### Phase 1: Context Analysis

**Scan chat session for relevant context:**

1. **Recency-weighted scan** (last 20-30 messages):
   - Linear issue mentions (MCP-XXX pattern)
   - File modifications (Write/Edit tool usage)
   - Git operations (commits, merges, PRs)
   - Test results (npm test output)

2. **Pattern-based detection** (entire session):
   - Uncompleted work mentioned but not in Linear
   - Blocking issues mentioned in discussion
   - Test failures that need addressing
   - Architecture changes requiring follow-up

3. **Context categorization**:
   - **Active work**: Issues discussed and in progress
   - **Planned work**: Mentioned but not started
   - **Gaps**: Work needed but not in current cycle
   - **Blockers**: Dependencies preventing progress

**Output context summary:**

```
📊 Chat Context Analysis

Active Work:
- MCP-150: Custom instruction parsing (discussed 5 messages ago)
- Feature X: Implementation ongoing (Write tool usage detected)

Gaps Detected:
- Documentation updates for Phase 6 (mentioned but no Linear issue)
- Integration test for feature Y (test failure detected)

Blockers:
- MCP-150 depends on MCP-92 (completed)
```

### Phase 2: Data Collection

Use helper scripts for deterministic data collection:

1. **Linear cycle data** - `scripts/collect-linear-data.sh`
   - Get current cycle ID from list_cycles
   - Query issues by state (In Progress, Todo, Done)
   - Extract dependencies and blocking relationships
   - Collect issue metadata (ID, title, labels, status)

2. **Git history** - `scripts/analyze-git-history.sh`
   - Recent commits (last 3 days)
   - Merge commits and PR references
   - Linear issue references in commit messages

3. **Test results** - `scripts/parse-test-results.sh`
   - Run npm test and parse output
   - Extract pass/fail counts, duration
   - Identify failing test names

4. **Validation checkpoints**:
   - Verify cycle ID extracted successfully
   - Check issue count > 3 (warn if suspiciously low)
   - Confirm emoji encoding in test output

**Always show verbose data collection summary** (no debug flag needed):

```
=== Linear Data Collection ===
Cycle: Modular Transition (c82d7f64-689c-42e5-8dea-17ccc8572317)
Active Issues: 2
Planned Issues: 15
Recent Completions: 6
Total Issues: 23

=== Git History ===
Recent Commits: 12
Merge Commits: 3
Linear References: MCP-92, MCP-91, MCP-90

=== Test Status ===
Passing: 805 / 808 (99.6%)
Duration: 29s
```

### Phase 3: Work Prioritization Analysis

**Priority factors (in order):**

1. **Blocking dependencies** (highest priority):
   - Issues that block others → prioritize
   - Issues blocked by incomplete work → deprioritize
   - Circular dependencies → flag for resolution

2. **Test failures**:
   - Issues related to failing tests → high priority
   - Issues with passing tests → normal priority

3. **Cycle deadline proximity**:
   - Cycle ends in <2 days → urgent
   - Cycle ends in 2-5 days → high priority
   - Cycle ends in >5 days → normal priority

**Note:** Ignore Linear priority labels (often missed or mislabeled)

**Generate prioritization report:**

```
🎯 Recommended Work Order

URGENT (Next):
1. MCP-148 - Unit test vault pollution (test failures detected)
   Reason: Blocking test suite reliability

HIGH PRIORITY:
2. MCP-150 - Custom instruction parsing (unblocks future work)
   Reason: Blocks 3 downstream issues in next cycle

3. MCP-147 - Documentation updates (cycle ends in 1 day)
   Reason: Cycle deadline approaching

NORMAL PRIORITY:
4. MCP-132 - Pagination for YAML properties
   Reason: No blockers, no test failures

DEFERRED:
5. MCP-93 - "Last weekday" date parsing (low priority enhancement)
   Reason: Blocked by MCP-150 completion
```

### Phase 4: Gap Analysis

**Compare chat context against Linear cycle:**

1. **Missing work detection**:
   - Work mentioned in chat but not in Linear
   - Follow-up tasks implied by recent changes
   - Technical debt identified during discussion

2. **User prompt for gaps**:

```
⚠️ Gap Analysis: Work Detected Outside Current Cycle

Gaps Identified:
1. Documentation for modularization (mentioned 10 messages ago)
2. Integration test for custom instructions (test gap)
3. Performance benchmarks for search consolidation

Actions:
[A] Search Linear for existing issues
[B] Create new issue(s) for these gaps
[C] Ignore for now

Your choice (A/B/C):
```

3. **Execute user choice**:
   - **A**: Search Linear using `mcp__linear-server__list_issues` with query
   - **B**: Present issue templates for user approval before creation
   - **C**: Document gaps in CURRENT-FOCUS.md "Future Work" section

### Phase 5: Document Generation

**Use bash heredoc for UTF-8 encoding** (not Edit tool):

1. **Preserve existing Project Health section**:

```bash
PROJECT_HEALTH=$(awk '/## 📊 Project Health/,EOF' "$FOCUS_DOC" 2>/dev/null || echo "")
```

2. **Generate document atomically**:

```bash
cat > "$FOCUS_DOC" << 'EOF'
# Current Development Focus

**Last Updated:** {timestamp EST}
**Cycle:** {cycle_name} ({dates})
**Progress:** {%} ({completed}/{total} issues)

## 🎯 Recommended Work Order

{Prioritization report from Phase 3}

## 📋 Planned (This Cycle)

{Todo/Backlog issues - brief context only}

## ✅ Recent Completions (Last 3 Days)

{Done issues from last 3d - minimal bullets}

## ✅ Test Status

{Latest npm test results}

## ⚠️ Gaps & Future Work

{Gap analysis results from Phase 4}

## 📊 Project Health

{Preserved from existing document}
EOF
```

3. **Verify encoding**:

```bash
# Check UTF-8 encoding
file "$FOCUS_DOC" | grep -q "UTF-8" || (echo "❌ Encoding error" && exit 1)

# Verify emoji count (should be ≥5)
EMOJI_COUNT=$(grep -o "[🎯📋✅⚠️📊]" "$FOCUS_DOC" | wc -l | xargs)
[ "$EMOJI_COUNT" -lt 5 ] && echo "⚠️ Warning: Emoji encoding may have failed"
```

### Phase 6: Output & Next Steps

**Present update summary:**

```
✅ CURRENT-FOCUS.md Updated

📊 Summary:
- Active Work: 2 issues
- Planned Work: 15 issues
- Recent Completions: 6 issues
- Gaps Detected: 3 (action required)

🎯 Next Recommended Issue:
MCP-148 - Unit test vault pollution
Reason: Test failures blocking reliability

📄 Document: docs/CURRENT-FOCUS.md (78 lines, UTF-8 ✓)
```

**Prompt for immediate action:**

```
Ready to start MCP-148? (y/n)
```

If yes, provide:
- Issue details (description, acceptance criteria)
- Branch name suggestion
- Testing strategy

## Helper Scripts

All scripts located in `.claude/skills/current-focus/scripts/`:

1. **`collect-linear-data.sh`**
   - Inputs: Team ID, cycle type
   - Outputs: JSON with cycle metadata and issues
   - Features: Cycle ID extraction, token-limited queries, validation

2. **`analyze-git-history.sh`**
   - Inputs: Project directory, days back
   - Outputs: Commits, merges, Linear references
   - Features: Pattern extraction, PR detection

3. **`parse-test-results.sh`**
   - Inputs: npm test output
   - Outputs: Pass/fail counts, duration, failing tests
   - Features: Error extraction, timing analysis

4. **`generate-document.sh`**
   - Inputs: All collected data + template
   - Outputs: Final CURRENT-FOCUS.md content
   - Features: UTF-8 heredoc, emoji verification, section preservation

## Reference Materials

See `references/output-format.md` for:
- Document structure examples
- Section formatting guidelines
- Emoji usage patterns
- Line length requirements (<100 lines)

## Integration with Existing Workflow

This skill **replaces** the `/current-focus` slash command for complex workflows while keeping the command available for simple "show current focus" requests.

**Division of responsibility:**
- **Slash command**: View-only mode (`/current-focus view`)
- **Skill**: Full update workflow with context analysis and prioritization

## Error Handling

**Common errors and recovery:**

1. **No cycle found**: Verify Linear MCP server connection
2. **Empty issue list**: Check team ID and cycle ID extraction
3. **Encoding failure**: Verify bash heredoc syntax and file command
4. **Token limit exceeded**: Reduce query limits in collect-linear-data.sh

## Project Context

**MCP for LifeOS specifics:**
- Team ID: `d1aae15e-d5b9-418d-a951-adcf8c7e39a8`
- Cycle-based development workflow
- Direct master branch (no CI/CD)
- Test suite: 805/808 passing (99.6%)
- Document location: `docs/CURRENT-FOCUS.md`
