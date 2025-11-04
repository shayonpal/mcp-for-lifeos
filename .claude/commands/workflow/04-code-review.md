---
description: Comprehensive code review for MCP implementation with quality assessment
argument_hint: <linear-issue-id>
---

# 04-Code-Review - MCP Implementation Review

Reviews implemented code changes against Linear issue requirements using Serena MCP analysis, code duplication detection, and quality validation.

## Help Mode

If user provides `--help` or `help` parameter, display this usage guide:

```
05-code-review - MCP Implementation Review

USAGE:
  05-code-review <linear-issue-id>    Review implementation for Linear issue
  05-code-review help                 Show this help

DESCRIPTION:
  Performs comprehensive code review of implemented changes:
  - Retrieves Linear issue requirements and implementation details
  - Reviews git diff changes with Serena MCP analysis
  - Detects code duplication and consolidation opportunities
  - Validates TypeScript compliance and MCP protocol adherence
  - Assesses code quality, performance, and security
  - Provides structured feedback for improvements

EXAMPLES:
  05-code-review MCP-123
  05-code-review "add-template-validation"
```

## Instructions

**First, validate input:**

**If no parameters provided:**

Analyze chat context to identify review target:

- Check for recent Linear issue IDs mentioned
- Look for git branch context or commit references
- Review recent file modifications discussed

Present concise confirmation:

```
📋 Review Context Detected

Issue: {ISSUE_ID or "Recent changes"}
Branch: {branch-name or "current"}
Scope: {files/components discussed}

Proceed with review? (y/n)
```

If context unclear or user declines, request explicit issue ID.

**If `help` or `--help` provided:** Show help mode above and stop

**If parameters provided:** Parse Linear issue ID from arguments

### Step 1: Activate Serena and Gather Context

**Activate Serena MCP:**

```
mcp__serena__activate_project with project: /Users/shayon/DevProjects/mcp-for-lifeos
mcp__serena__list_memories
mcp__serena__read_memory for: code-standards, review-patterns, architecture-pattern-*, mcp-tool-patterns, error-handling-patterns
```

**Use `linear-expert` to retrieve comprehensive issue details:**

```
Get detailed information about issue {ISSUE_ID} including:
- Issue title and description
- Requirements and acceptance criteria
- Current status and recent updates
- Any linked issues or dependencies
- Implementation comments and decisions made
```

**Language Policy:**  
Use factual, neutral language in all review feedback - avoid superlatives (excellent, perfect, amazing, best, etc.)

### Step 2: Serena-Enhanced Implementation Analysis

**Use Serena to analyze implementation changes:**

```
mcp__serena__get_symbols_overview
mcp__serena__get_symbol_info for modified symbols
mcp__serena__search_for_pattern for: implementation patterns, error handling, validation patterns
```

**Examine the actual code changes with git analysis:**

```bash
# Get detailed diff of recent changes
git log --oneline -10
git diff HEAD~3..HEAD --name-only
git diff HEAD~3..HEAD --stat
```

**Review key files with Serena context:**

- `src/` directory for core implementation (analyze symbols and patterns)
- `tests/` directory for test coverage (verify test patterns followed)
- Package and configuration files (check for consistency)

### Step 3: Serena-Enhanced Technical Architecture Review

**Use Serena for architectural analysis:**

```
mcp__serena__search_for_pattern for: MCP protocol, tool registration, error handling, integration patterns, type safety, validation
mcp__serena__find_symbol for integration points
```

**Phase 3A: CRITICAL - Code Duplication Detection**

**Use Serena MCP to explicitly detect code duplication:**

```bash
# Step 1: Identify all new functions/symbols created
mcp__serena__find_symbol with pattern matching new code
# Review git diff to list new function names

# Step 2: For EACH new function, search for similar existing implementations
for new_function in [new_functions_list]:
  # Search for similar functionality patterns
  mcp__serena__search_for_pattern with pattern: "[similar_functionality_pattern]"

  # Find symbols with related names
  mcp__serena__find_symbol with substring_matching for related names

  # Analyze if existing code could have been enhanced instead

# Step 3: Document duplication findings
```

**Duplication Analysis Checklist:**

- [ ] List all new functions/classes/tools created
- [ ] For each new item, identify if similar existing code was found
- [ ] Flag any new code that duplicates existing functionality
- [ ] Provide specific consolidation recommendations (file:line)
- [ ] Verify "enhance don't duplicate" principle was followed
- [ ] List functions that should be merged/refactored

**If duplication found:**

```
🔄 **Duplication Detected**

New: [new-function] in [file:line]
Duplicates: [existing-function] in [file:line]
Recommendation: Enhance [existing-function] to handle [new-requirements]
Consolidation steps: [specific refactoring actions]
```

**Phase 3B: Quality Analysis Checklists**

**MCP Protocol Compliance:**

- [ ] Tool registration matches established patterns (use Serena search)
- [ ] Request/response handling follows existing patterns
- [ ] Schema definitions consistent with existing schemas
- [ ] Error handling adheres to protocol standards

**TypeScript Quality:**

- [ ] Run `npm run typecheck` - must pass
- [ ] Type safety: no `any` types without justification
- [ ] Interface compliance verified with Serena symbol analysis
- [ ] Null safety: proper optional chaining and null checks

**MCP Server Architecture:**

- [ ] Tool router integration follows established patterns
- [ ] Unified tool patterns used (not legacy patterns)
- [ ] Search engine integration consistent with existing usage
- [ ] Vault utilities used correctly

**Template System Integration (if applicable):**

- [ ] Template discovery follows caching patterns
- [ ] Dynamic engine usage matches existing patterns
- [ ] YAML frontmatter processing compliant with rules
- [ ] Folder placement logic correct

**Performance & Reliability:**

- [ ] iCloud sync resilience considerations addressed
- [ ] Error recovery mechanisms in place
- [ ] Memory usage patterns analyzed (no leaks)
- [ ] Async operations properly handled

**Security:**

- [ ] Input validation and sanitization present
- [ ] File system access properly controlled
- [ ] YAML parsing uses safe methods
- [ ] Client request validation implemented

Use `agent-Plan` for deeper architectural exploration when needed.

**Review Criteria - Code Reuse & Quality:**

- Code Reuse: Were existing functions enhanced vs. new ones created?
- Duplication: Any functionality that duplicates existing code?
- Consolidation: Opportunities to merge similar functions?

Please analyze the git diff combined with Serena pattern analysis and provide specific feedback on implementation quality and pattern adherence.

```

### Step 4: TypeScript Validation

Validate code compiles and types are correct:

```bash
npm run typecheck
```

If type errors exist:

- Document each error with file location
- Assess impact on functionality
- Prioritize fixes by severity

### Step 5: MCP Protocol Testing

Basic protocol validation:

```bash
# Test server starts correctly
node dist/index.js --version 2>/dev/null || echo "Build required"

# Verify tool registration (if built)
if [ -f "dist/index.js" ]; then
  timeout 5s node dist/index.js 2>&1 | head -20
fi
```

### Step 6: Serena-Enhanced Code Quality Assessment

**Use Serena for quality analysis:**

```
mcp__serena__search_for_pattern for: file organization, error handling, integration patterns, documentation standards
mcp__serena__find_symbol for key integration points
```

**Review implementation against MCP project standards with Serena insights:**

**File Organization (with Serena structure analysis):**

- Proper module structure in `src/` (verified against established patterns)
- Test coverage in appropriate test files (following test organization patterns)
- Documentation updates if needed (consistent with documentation patterns)

**Error Handling (with Serena error patterns):**

- Graceful failure modes (following established failure patterns)
- User-friendly error messages (consistent with message patterns)
- Proper logging and debugging (adhering to logging patterns)

**Integration Points (with Serena integration analysis):**

- Template system compatibility (verified against template integration patterns)
- Search engine integration (following search integration patterns)
- Analytics tracking (consistent with analytics patterns, if applicable)

### Step 7: Strategic Context Validation

**Review strategic alignment:**

**CURRENT-FOCUS Impact:**

- Read `docs/CURRENT-FOCUS.md` if implementation may affect documented priorities
- Assess if code changes align with current cycle goals
- Note if review findings impact planned focus areas

**ADR Compliance:**

- Verify implementation follows established architectural decisions in `docs/adr/`
- Identify any deviations from documented ADRs
- Flag if new architectural decisions need ADR documentation

**Dependency Review:**

- Check if implementation added or updated dependencies in `package.json`
- Verify dependency versions are appropriate
- Note any security or compatibility concerns with dependencies

### Step 8: Requirements Validation

**Use Serena to analyze implementation against requirements:**

```
# Analyze symbol structure for requirement fulfillment
mcp__serena__get_symbols_overview

# Search for requirement implementation patterns
mcp__serena__search_for_pattern with pattern: "requirement.*[requirement-type].*implementation"

# Verify acceptance criteria symbols
mcp__serena__find_symbol for symbols related to acceptance criteria
```

**Cross-reference implementation with Linear issue requirements:**

- Map each requirement to implemented functionality (using Serena symbol analysis)
- Identify any gaps or missing features (through pattern and symbol verification)
- Assess if acceptance criteria are met (validate through code analysis)
- Confirm architectural decisions align with requirements (check against established patterns)

### Step 9: Optional Codex Consultation

**Ask user for codex consultation:**

```
🤔 Consult codex for additional analysis? (y/n)
```

**If yes:**

Use `codex` skill with progressive timeout:

- Initial: 7 minutes (420s)
- Increment: +60s each check until complete

**Context for codex:**

- Linear issue: {ISSUE_ID}, requirements, acceptance criteria
- Git changes: modified files, diff summary
- Duplication analysis findings: duplicates found, consolidation recommendations
- Quality analysis: compliance, TypeScript, architecture checks
- Serena insights: patterns, symbols, integration points
- Strategic context: CURRENT-FOCUS, ADRs, dependencies
- Review focus: consolidation opportunities, architectural alignment, security/performance concerns

Integrate codex recommendations before final output.

## Output Format

```
## 🔍 Code Review: {ISSUE_ID}

**Issue**: {Title}
**Modified**: {File count} files, {Line count} lines
**Reviewers**: Serena MCP + Duplication Analysis{, codex}

### ✅ Compliance

- TypeScript: {Pass/Fail}
- MCP Protocol: {Pass/Fail}
- Architecture: {Pass/Fail}

### ⚠️ Issues

**Critical**: {Count}

- {Issue with file:line}

**Important**: {Count}

- {Issue with file:line}

**Minor**: {Count}

- {Issue with file:line}

### 🔄 Duplication

{If found:}

- {Function/file}: duplicates {existing code}
  → Consolidate into {suggestion}

### 🎯 Requirements

{For each requirement:}
{✅/❌} {Requirement}: {Status}

### 📋 Actions

**Before Next Phase**:

- {Fix 1}
- {Fix 2}

**Status**: {Ready for next phase / Needs fixes}

### 🎯 Recommended Next Step

**Phase**: /workflow:{05-test OR 06-document OR 07-commit-push}

**Rationale**: {Brief explanation based on implementation type}

**Testing Required**: {Yes/No/Partial}

---

{timestamp} | CURRENT-FOCUS: {impact} | ADRs: {status}
```

### Step 10: Smart Next-Step Recommendation

**Analyze implementation type and recommend appropriate next phase:**

Use implementation analysis to determine the optimal next step:

**Recommend `/workflow:05-test` if:**
- New MCP tool functionality added
- Core logic changes (search-engine, tool-router, files module)
- Bug fixes with complex logic requiring validation
- Template system modifications
- YAML processing changes
- Integration point modifications
- Any changes that could affect runtime behavior

**Recommend `/workflow:06-document` if:**
- Documentation-only changes (README, docs/, comments)
- Simple configuration updates (package.json, tsconfig.json)
- Trivial typo fixes or formatting changes
- Changes already tested in previous phases
- Testing skipped (per 05-test assessment logic)

**Recommend `/workflow:07-commit-push` directly if:**
- All testing and documentation already completed
- Simple documentation updates requiring no validation
- Configuration changes with zero behavioral impact

**Present recommendation to user:**

```
## 🎯 Next Step Recommendation

**Implementation Type**: [New feature / Bug fix / Documentation / Configuration / etc.]

**Modified Components**: [List key files/systems changed]

**Testing Requirements**: [Complex logic / Simple changes / None]

**Recommended Next Phase**: /workflow:[05-test OR 06-document OR 07-commit-push]

**Rationale**: [Brief explanation of why this path is recommended]

**Alternative Path**: [If user wants different approach, mention it]

Proceed with recommended phase? (y/n)
```

### Step 11: Review Handoff Decision

**Document results in Linear issue** (including codex insights if consulted).

Use `linear-expert` to add comment:

```
Code review complete

[IF ISSUES:]
Issues found:
- [file:line] - [issue]

Status: needs fixes

[IF NO ISSUES:]
No issues found
TypeScript: clean
MCP compliance: verified

Ready for [next phase]
```

Use Serena analysis during review to understand code, but document results in Linear comments, not Serena memory.
