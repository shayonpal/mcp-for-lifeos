---
name: 01-plan
version: 2.0.0
description: Comprehensive MCP feature planning with Linear analysis, Serena insights, and expert validation (read-only strategy creation)
author: Shayon Pal
tags: [workflow, planning, mcp, linear, serena]
argument_hint: <linear-issue-id>
---

# Plan - MCP Feature Planning & Architecture Validation

Advanced planning for MCP for LifeOS server development. Performs Linear issue analysis, technical feasibility assessment, and creates detailed implementation strategies. **STRICTLY read-only** - no code implementation or file modifications during planning.

## Purpose

Create comprehensive, validated implementation strategy for MCP server features using Linear issue analysis, Serena pattern recognition, and multi-expert consultation. Use `@agent-Plan` for investigations of the codebase. They are the expert for this action.

## Arguments

`$ARGUMENTS` expects: `<linear-issue-id>`

Example: `01-plan MCP-123`

## Instructions

### Validation Phase

Extract Linear issue ID:

```bash
ISSUE_ID=$(echo "$ARGUMENTS" | grep -oE '[A-Z]+-[0-9]+' | head -1)
```

If no ID provided, show error:

```
Error: Linear issue ID required
Usage: 01-plan <linear-issue-id>
Example: 01-plan MCP-123
```

Validate issue exists and belongs to MCP for LifeOS team using `linear-expert`.

### Phase 1: Context Gathering

**Step 1.1: Serena Activation & Linear Analysis**

- Activate Serena: `mcp__serena__activate_project` with `/Users/shayon/DevProjects/mcp-for-lifeos`
- Access memories: planning decisions, similar issues, architecture patterns, lessons learned
- Fetch Linear issue with `linear-expert`: requirements, acceptance criteria, comments, priority, labels
- Analyze hierarchy: parent issue context, sub-issues, project description, dependencies

**Step 1.2: Existing Code Analysis**

- Use `mcp__serena__find_symbol` to locate existing functions/tools for enhancement
- Search patterns: tool registration, router patterns, search engine, template processing, vault operations
- Prioritize enhancing existing code over creating new implementations
- Identify integration points and dependencies

**Step 1.3: Documentation & Architecture Analysis**

- Read `docs/CURRENT-FOCUS.md` for cycle priorities, active work, larger project context
- Use `doc-search` for relevant documentation, implementation patterns, API specs
- Search issue-specific documentation using Linear requirements
- Identify MCP tool patterns, YAML processing, template system, analytics
- Review README, CHANGELOG, architectural decision records
- **Optional**: If issue involves architecture decisions, review `docs/adr/` for relevant ADRs
- Use Serena to identify architectural patterns: MCP tool registration, stdio transport, error handling

### Phase 2: Feasibility Assessment

**Step 2.1: Technical Validation**  
Validate using Serena and experts:

- Enhancement vs. new creation necessity (list specific symbols to modify)
- MCP protocol compliance and tool compatibility
- Symbol-level integration impact via `mcp__serena__get_symbol_info`
- Type compatibility (`npm run typecheck`)
- Performance and security implications
- iCloud sync resilience, template system, YAML rules integration
- Analyze `package.json` and `package-lock.json` for dependency impact
- If new package needed, query user: "New package [name] - latest version is X.X.X, proceed? (y/n)"

**Step 2.2: Architecture & Risk Assessment**  
Use `agent-Plan` for code exploration combined with architectural analysis checklist:

**Architectural Analysis:**

- [ ] Design pattern appropriateness for MCP architecture
- [ ] Code organization follows existing patterns (use Serena to find similar patterns)
- [ ] Error handling consistent with project standards
- [ ] Testing strategy aligns with existing test structure

**Risk Identification:**

- [ ] MCP protocol limitations or constraints
- [ ] iCloud sync resilience considerations
- [ ] YAML edge cases and validation rules
- [ ] Cross-platform compatibility issues
- [ ] Performance implications
- [ ] Security considerations

Use agent-Plan to explore relevant code sections and Serena to find existing architectural patterns.

**Step 2.3: Clarify Ambiguities**

If analysis reveals ambiguities, ask user before proceeding:

- Unclear requirements or acceptance criteria
- Multiple valid implementation approaches
- Trade-offs requiring decisions
- Dependency or scope questions

Present findings and specific questions. Wait for user response.

### Phase 3: Expert Review & Strategy Approval

**Step 3.1: MCP Architecture Guidance**  
Consult `mcp-builder` skill for:

- MCP tool design and protocol compliance best practices
- Schema design for inputs/outputs
- Error handling patterns and testing strategies

**Step 3.2: Present Strategy Summary**  
Show comprehensive analysis:

- Feasibility assessment with key findings
- Recommended approach with rationale
- Risk analysis with mitigation strategies
- Expert validation results
- MCP-builder guidance integration

**Step 3.3: Interactive Consultation Loop**

Present options and **continue loop until option 1 selected**:

```
## 🎯 Implementation Strategy Review

[Detailed strategy summary]

## 🤔 How would you like to proceed?

1. ✅ **Approve strategy**
   → Finalize planning and proceed to 02-stage

2. 🔄 **Refine strategy**
   → Adjust approach based on feedback (returns to this menu)

3. 🧠 **Consult codex**
   → Use `codex` skill for strategic analysis and recommendations (returns to this menu)

4. 🔍 **Consult other experts**
   → Additional validation: doc-search, git-expert, linear-expert, agent-Plan (returns to this menu)

⚠️ Loop continues until option 1 selected
```

**For codex consultation (Option 3)**:  
Use `codex` skill and provide comprehensive context:

- Linear issue: requirements, hierarchy, dependencies, strategic context
- Implementation strategy: technical approach, architecture decisions, development plan
- Existing code analysis: symbols for enhancement vs. new code required
- MCP architecture: protocol constraints, tool architecture, integration requirements
- Feasibility results: expert opinions, risk assessment, complexity evaluation
- Specific questions: implementation approach, enhancement strategy, risk mitigation, MCP considerations, alternatives, timeline, recommendations

After consultation, integrate codex recommendations and **return to option menu**.

**For expert consultation (Option 4)**:  
Available experts: `doc-search`, `git-expert`, `linear-expert`, `agent-Plan`

- `doc-search`: Documentation patterns and technical content analysis
- `git-expert`: Repository history and change analysis
- `linear-expert`: Issue context and project management insights
- `agent-Plan`: Code exploration and architectural analysis using Serena MCP

After consultation, integrate insights and **return to option menu**.

### Phase 4: Final Planning Output (ONLY after Option 1)

**Step 4.1: Generate Planning Document**

**LANGUAGE POLICY**: Use factual, neutral language throughout. Avoid superlatives like "excellent", "perfect", "amazing", "best", etc. State facts and assessments objectively.

**CODE POLICY**: This is a planning phase - describe approaches using plain English and pseudocode logic, NOT actual code snippets. Reserve implementation details for the staging/execution phases.

Create comprehensive strategy document (not actual implementation):

## Expected Output

```
## 🎯 [ISSUE-ID]: [Title]
**Priority**: [P] | **Status**: [S] | **Assignee**: [A]

### 📋 Requirements & Context

- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

**Hierarchy**: Parent: [ID or none] | Project: [name or none] | Dependencies: [list or none]

### 🔍 Technical Strategy
**Approach**: Enhance [symbols] | New: [if needed - why] | MCP: [impact] | Deps: [status] | ADRs: [list]
**Risks**: 🔴 [risk] → [mitigation] | 🟡 [risk] → [monitoring] | 🟢 [risk] → [acceptance]
**Integration**: [affected components]

### 🛠️ Implementation Plan

1. **Phase 1**: [Brief description - 1 sentence]
2. **Phase 2**: [Brief description - 1 sentence]
3. **Phase 3**: [Brief description - 1 sentence]

**Testing**: [Unit: approach | Integration: MCP protocol validation | Manual: Claude Desktop]
**Documentation** (if needed): [README / docs/ / API specs / Examples]

### 🧠 Expert Consultations
**Consulted**: [expert-1, expert-2] | **Synthesis**: [1-sentence key insight]
- **expert-name**: [recommendation 1] | [recommendation 2] | [recommendation 3]

### 🎯 Recommendation
✅/⚠️/❌ [status]: [factual rationale] | **Next**: 02-stage for branch recommendation & implementation contracts
```

### Step 4.2: Architectural Pattern Assessment

Determine if this issue introduces reusable patterns worth noting for documentation phase.

**Assessment criteria** (from `.serena/memories/memory_management.md`):

- New architectural pattern (affects ≥3 components)
- Reusable implementation strategy (applicable to multiple features)
- Significant technical gotcha/workaround (saves future time)
- Major design decision (affects multiple components)

**If architectural impact identified:**

1. Check existing memories for consolidation opportunity:

   ```bash
   ls -la .serena/memories/
   ```

2. Note for 06-document phase:
   - Pattern description: [brief summary]
   - Suggested memory: [existing memory to update OR new memory name]
   - Rationale: [why this belongs in memory]

**DO NOT write memories in planning phase** - defer to 06-document for consolidation.

**Otherwise:** No memory needed. Issue details documented in Linear comments and git history.

## Error Handling

### Missing Issue ID

```
❌ Error: Linear issue ID required
Usage: 01-plan <linear-issue-id>
Example: 01-plan MCP-123
```

### Issue Not Found

Suggest alternatives:

- List similar IDs if typo suspected
- Show recent issues
- Verify team access

### Analysis Failure

If phase fails:

1. **Linear Access**: Suggest manual review, provide analysis template
2. **Codebase Analysis**: Use available docs, provide general MCP patterns
3. **Expert Consultation**: Fallback analysis with limitations noted
4. **Technical Issues**: Request user input for critical decisions

## Examples

### Basic Usage

```bash
/01-plan MCP-145
```

**Result**: Comprehensive planning analysis for MCP-145 with strategy document

### With Parent Issue

```bash
/01-plan MCP-156
```

**Result**: Analysis includes parent context, sibling coordination, project scope

## Usage Tips

1. **Comprehensive Context**: Command gathers Linear hierarchy, Serena patterns, documentation
2. **Clarification Step**: Asks about ambiguities after analysis, before strategy creation
3. **Consultation Loop**: Use codex and experts iteratively before approving
4. **Enhancement Focus**: Prioritizes enhancing existing code over new creation
5. **Read-Only**: No modifications occur - pure strategy creation
6. **Next Step**: Always use `02-stage` after planning completion
7. **Memory Storage**: Only architectural patterns stored in Serena (not per-issue details)
8. **Issue Documentation**: Linear comments and git history for issue-specific details

## Important Notes

- **READ-ONLY OPERATION**: Only creates strategy documentation, no file modifications
- **Linear Team**: `d1aae15e-d5b9-418d-a951-adcf8c7e39a8` (MCP for LifeOS)
- **Serena Integration**: Full project context with memory and pattern analysis
- **Consultation Loop**: Mandatory until user approves (option 1)
- **Expert Network**: Uses 6+ agents plus codex for comprehensive validation
- **MCP Focus**: All analysis considers protocol constraints and patterns
- **Manual Testing**: Accounts for Claude Desktop testing workflow
- **Next Command**: Staging phase for contract design and branch recommendation
- **Branch Workflow**: Staging recommends branch → Implementation creates branch → PR creation before master merge
