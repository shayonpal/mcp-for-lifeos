# CURRENT-FOCUS.md Output Format Reference

## Document Structure

### Required Sections (in order)

1. **Header** - Cycle metadata and progress
2. **Recommended Work Order** - Prioritization analysis
3. **Planned Work** - Todo/Backlog issues from current cycle
4. **Recent Completions** - Done issues from last 3 days
5. **Test Status** - Latest npm test results
6. **Project Health** - Always preserved from existing document

### Section Templates

#### Header Template

```markdown
# Current Development Focus

**Last Updated:** {YYYY-MM-DD HH:MM TZ}
**Cycle:** {Cycle Name} ({Start Date} - {End Date})
**Progress:** {%} ({completed}/{total} issues)
```

**Example:**

```markdown
# Current Development Focus

**Last Updated:** 2025-11-04 13:45 EST
**Cycle:** Modular Transition (2025-10-28 - 2025-11-05)
**Progress:** 90% (47/52 issues)
```

#### Recommended Work Order Template

```markdown
## 🎯 Recommended Work Order

URGENT (Next):
1. {Issue ID} - {Brief Title} ({Reason})
   Reason: {Specific blocking/test/deadline reason}

HIGH PRIORITY:
2. {Issue ID} - {Brief Title}
   Reason: {Dependency or deadline reason}

NORMAL PRIORITY:
3. {Issue ID} - {Brief Title}
   Reason: {Context}

DEFERRED:
4. {Issue ID} - {Brief Title}
   Reason: {Blocking reason}
```

**Example:**

```markdown
## 🎯 Recommended Work Order

URGENT (Next):
1. MCP-148 - Unit test vault pollution (test failures detected)
   Reason: Blocking test suite reliability

HIGH PRIORITY:
2. MCP-150 - Custom instruction parsing (unblocks future work)
   Reason: Blocks 3 downstream issues in next cycle
```

#### Planned Work Template

```markdown
## 📋 Planned (This Cycle)

### {Issue ID}: {Title}

{First 1-2 sentences of description}
```

**Formatting rules:**
- Maximum 3-4 planned issues shown (most important only)
- Keep descriptions to 1-2 sentences
- Include labels if relevant (e.g., `[Technical Debt]`, `[Feature]`)

#### Recent Completions Template

```markdown
## ✅ Recent Completions (Last 3 Days)

### {Issue ID}: {Title} ✅

{1-sentence summary with key metric or outcome}
```

**Example:**

```markdown
## ✅ Recent Completions (Last 3 Days)

### MCP-92: Hot-Reload Custom Instructions ✅

Config-driven instruction system with fs.watch hot-reload. YAML rules, website preferences, task formatting—all configurable without server restart.

### MCP-91: Eliminate VaultUtils Facade ✅

Reduced from 1,956 to 483 lines. Full domain module migration to `src/modules/files/`. All 7 consumers updated, zero test regressions.
```

#### Test Status Template

```markdown
## ✅ Test Status

**Latest Run ({YYYY-MM-DD}):**
- ✅ {passing} passing / {total} total ({skipped} skipped)
- {suites} test suites, {duration}
- All integration tests green

**Recent Fixes:**
- {Fix description}
- {Fix description}
```

**Example:**

```markdown
## ✅ Test Status

**Latest Run (2025-11-04):**
- ✅ 805 passing / 808 total (3 skipped)
- 48 test suites, 29s
- All integration tests green

**Recent Fixes:**
- EPIPE race condition eliminated in concurrent server test
- Test vault isolation verified across all suites
```

#### Project Health Template

```markdown
## 📊 Project Health

**Active Development:**
- {Key activity or feature}
- {Current focus area}
- {Metric or status}

**Technical Debt:**
- ✅ {Completed debt item}
- ✅ {Completed debt item}
- ⏸️ {Deferred debt item}

**Quality Metrics:**
- {Metric with current value}
- {Metric with current value}
- {Metric with current value}

**Infrastructure:**
- {Infrastructure detail}
- {Infrastructure detail}
```

**Important:** This section is NEVER updated automatically. Always preserve existing content.

## Formatting Guidelines

### Line Length Requirements

- **Target:** ≤75 lines total (STRICT - forces focus on future work, minimal past work)
- **Maximum:** 85 lines (hard limit)
- **Strategy:** Prioritize future/urgent items, heavily truncate completions, NO descriptions in Planned Work

### Emoji Usage

**Required emojis (minimum 5):**
- 🎯 - Recommended Work Order
- 📋 - Planned Work
- ✅ - Recent Completions (used 2x)
- 📊 - Project Health

**Additional emojis (optional):**
- ⚠️ - Warnings or gaps
- 🔧 - Active Work (if separate section)
- 📄 - Documentation references

### Description Truncation

**Rules for 75-line limit (STRICT):**

1. **Recommended Work Order**: Top 3 issues maximum, 1 line reason each (no verbose descriptions)
2. **Planned Work**: Issue ID + title ONLY (NO descriptions, NO labels, NO context)
3. **Recent Completions**: Maximum 5 issues, issue ID + 1 sentence summary ONLY (NO metrics, NO verbose descriptions)
4. **Test Status**: Pass/fail counts + duration ONLY (NO "Recent Fixes" section unless absolutely critical)
5. **Gaps Section**: ONLY if detected in chat context (omit entirely if none)

### UTF-8 Encoding Verification

**After generating document, verify:**

```bash
# Check encoding
file docs/CURRENT-FOCUS.md | grep -q "UTF-8"

# Count emojis (should be ≥5)
grep -o "[🎯📋✅⚠️📊]" docs/CURRENT-FOCUS.md | wc -l
```

## Data Mapping Reference

### Linear Issue States → Document Sections

| Linear State | Document Section | Display Rules |
|--------------|------------------|---------------|
| In Progress | Recommended Work Order | Show in priority order |
| In Review | Recommended Work Order | Show in priority order |
| Todo | Planned (This Cycle) | ID + title only (no descriptions) |
| Backlog | Planned (This Cycle) | ID + title only (no descriptions) |
| Deferred | Blocked/Deferred note | Flag as blocked in Recommended Work Order |
| Done (last 3d) | Recent Completions | Max 5 issues, 1 sentence each |
| Done (>3d) | Omit | Not shown |
| Canceled, Duplicate | Omit | Not shown |

### Priority Indicators

| Indicator | Meaning | Display |
|-----------|---------|---------|
| URGENT | Next task to work on | Bold, numbered 1 |
| HIGH PRIORITY | Important but not blocking | Numbered 2-4 |
| NORMAL PRIORITY | Standard workflow | Numbered 5+ |
| DEFERRED | Blocked or low priority | Listed last |

### Test Status Indicators

| Status | Display | Emoji |
|--------|---------|-------|
| All passing | "All integration tests green" | ✅ |
| Some failures | "{count} failures in {test names}" | ⚠️ |
| Skipped tests | "{count} skipped" | (no emoji) |

## Common Pitfalls

❌ **Don't:**
- Update Project Health section automatically
- Include issues with state "Canceled" or "Duplicate"
- Show more than 10 recent completions
- Exceed 100 line limit
- Use Edit tool (causes emoji corruption)
- Include full issue descriptions

✅ **Do:**
- Use bash heredoc for UTF-8 safety
- Verify emoji count after generation
- Truncate descriptions to meet line limit
- Preserve manual edits in Project Health
- Show only actionable, recent information
- Focus on next steps and priorities
