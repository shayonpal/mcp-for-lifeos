---
description: Design implementation contracts with TypeScript interfaces for Linear issue
argument_hint: <linear-issue-id>
---

# 02-Stage - Implementation Contract Design

Generates TypeScript implementation contracts defining clear input/output schemas, interfaces, and error boundaries before implementation begins.

## Instructions

**Parse issue ID from arguments:**

```bash
ISSUE_ID="$ARGUMENTS"
if [ -z "$ISSUE_ID" ]; then
  echo "❌ Linear issue ID required"
  echo "Usage: 02-stage <linear-issue-id>"
  exit 1
fi
```

### Phase 1: Activate Serena and Gather Context

**Activate Serena MCP for contract design:**

```
# Activate Serena for project context
mcp__serena__activate_project with project: /Users/shayon/DevProjects/mcp-for-lifeos

# Access contract patterns and type definitions
mcp__serena__list_memories
mcp__serena__read_memory for keys related to:
- "planning-decisions-[ISSUE_ID]" - planning phase outputs
- "type-patterns" - established type definition patterns
- "interface-standards" - interface design standards
- "contract-patterns" - previous contract examples
```

**Use `linear-expert` to retrieve issue details:**

- Get comprehensive issue description and requirements
- Extract acceptance criteria
- Identify all integration points
- Understand expected functionality

### Phase 1.5: Strategic Context Review

**Check CURRENT-FOCUS.md for cycle priorities:**

- Read `docs/CURRENT-FOCUS.md` to understand active cycle work
- Assess if this issue aligns with current priorities
- Note if staging affects documented focus areas

**Review relevant ADRs (if architectural):**

- If issue involves architecture decisions, check `docs/adr/` for relevant ADRs
- Identify existing patterns to follow or decisions to respect
- Note any ADR conflicts or updates needed

**Analyze dependencies:**

- Check `package.json` and `package-lock.json` for current dependencies
- Identify if new packages needed for contract implementation
- If new package required: Query user for latest version confirmation
  Format: "Contract requires [package-name]. Latest version is X.X.X. Proceed? (y/n)"

**Language policy for output:**
Use factual, neutral language in all output - avoid superlatives (excellent, perfect, amazing, best, etc.)

### Phase 1.6: Branch Name Recommendation

**Analyze issue for semantic branch naming:**

Use `linear-expert` to retrieve full issue context:

- Issue ID, title, description
- Labels (if available)
- Priority and comments

**Classify issue type:**

Analyze issue description and title to determine prefix:

- **bugfix/**: Fixing errors, bugs, crashes, incorrect behavior
- **feature/**: New functionality, enhancements, additions
- **hotfix/**: Urgent production fixes, critical blockers
- **refactor/**: Code improvements, optimization, cleanup without behavior change
- **test/**: Test additions, test improvements, coverage
- **doc/**: Documentation updates, guides, README, comments
- **design/**: UI/UX changes, styling, visual improvements

**Generate semantic branch name:**

Analyze the issue's core purpose and generate meaningful description:

1. Read full issue description, not just title
2. Identify the PRIMARY action and target
3. Generate 3-5 word semantic description that explains WHAT is being done
4. Avoid incomplete fragments (e.g., "use-github-to")
5. Ensure name is self-explanatory

Examples of semantic analysis:

- Title: "Use GitHub Actions to automate deployment"
  - Bad: `feature/MCP-123-use-github-to`
  - Good: `feature/MCP-123-automate-deployment-github`
- Title: "Fix timeout in search"
  - Bad: `bugfix/MCP-124-fix-timeout-in`
  - Good: `bugfix/MCP-124-fix-search-timeout`
- Title: "Add support for filtering by date range"
  - Bad: `feature/MCP-125-add-support-for`
  - Good: `feature/MCP-125-add-date-range-filter`

**Update Linear with branch recommendation:**

Use `linear-expert` to add comment with GENERIC language:

```
## 🌿 Recommended Branch Name

**Branch**: `{type}/{ISSUE-ID}-{semantic-description}`
**Type**: {bugfix|feature|hotfix|refactor|test|doc|design}
**Rationale**: {Brief explanation of classification and naming}

Ready for implementation phase.
```

**IMPORTANT**:

- Do NOT create the branch yet - only recommend the name
- Do NOT mention slash commands in Linear comments
- Use generic terms: "implementation phase", "execution phase", "staging phase"

### Phase 2: Analyze Existing Types with Serena

**Search for existing type patterns to extend:**

```
# Find existing type definitions
mcp__serena__search_for_pattern with pattern: "interface.*Tool.*Input"
mcp__serena__search_for_pattern with pattern: "type.*Tool.*Output"
mcp__serena__search_for_pattern with pattern: "interface.*MCP.*"

# Locate existing interfaces to extend/conform to
mcp__serena__find_symbol with symbol: "ToolInput" or "ToolOutput" or "MCPTool"

# Find error handling patterns
mcp__serena__search_for_pattern with pattern: "class.*Error.*extends"
mcp__serena__search_for_pattern with pattern: "throw.*Error.*"
```

### Phase 3: Design Implementation Contracts

**Create TypeScript contract file: `dev/contracts/MCP-{ISSUE_ID}-contracts.ts`**

**Design contracts using Serena patterns found in Phase 2:**

Based on existing interfaces and patterns discovered with Serena:

- Extend found interfaces (ToolInput, ToolOutput, MCPTool)
- Follow error handling patterns from search results
- Conform to project TypeScript conventions
- Maintain consistency with MCP protocol requirements

```typescript
// dev/contracts/MCP-{ISSUE_ID}-contracts.ts

/**
 * Implementation contracts for Linear Issue: {ISSUE_ID}
 * Issue: {Issue Title}
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 */

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Input schema for {feature name}
 */
export interface {FeatureName}Input {
  requiredParam: string; // Description
  optionalParam?: number; // Default behavior
  filters?: {
    tags?: string[];
    dateRange?: [string, string];
  };
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Output schema for {feature name}
 */
export interface {FeatureName}Output {
  success: boolean;
  data: {
    results: ResultItem[];
    metadata: ResponseMetadata;
  };
  warnings?: string[];
}

export interface ResultItem {
  id: string;
  // Additional fields...
}

export interface ResponseMetadata {
  totalCount: number;
  executionTime: number;
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error types that may be thrown:
 * @throws InvalidInputError - Input validation failure
 * @throws VaultAccessError - Vault operation failure
 * @throws TemplateProcessingError - Template processing failure
 */

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Existing interfaces this implementation must conform to
 */
export interface ExistingInterfaceConformance {
  extends?: "MCPTool" | "SearchTool" | "VaultTool";
  integrates: {
    searchEngine?: boolean;
    templateSystem?: boolean;
    yamlManager?: boolean;
    analytics?: boolean;
  };
}

// ============================================================================
// MCP TOOL CONTRACT (if applicable)
// ============================================================================

export interface {ToolName}MCPContract {
  name: string;
  description: string;
  inputSchema: {FeatureName}Input;
  handler: (input: {FeatureName}Input) => Promise<{FeatureName}Output>;
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors:
 * MUST: Validate inputs, handle sync delays, maintain YAML compliance, track analytics
 * MUST NOT: Modify auto-managed YAML, block on slow ops, throw unhandled exceptions
 */
```

### Phase 4: Validate Contracts

**Use Serena to verify contract completeness:**

```
# Check if contracts cover all planned implementation areas
mcp__serena__read_memory with key: "planning-decisions-[ISSUE_ID]"

# Verify contracts align with existing type patterns
mcp__serena__search_for_pattern with pattern: "similar.*contract.*pattern"

# Validate against MCP protocol requirements
mcp__serena__search_for_pattern with pattern: "MCP.*protocol.*requirement"
```

**Contract validation checklist:**

- [ ] All input parameters defined with types
- [ ] Output structure completely specified
- [ ] Error conditions documented
- [ ] Integration points identified
- [ ] MCP protocol compliance (if applicable)
- [ ] Extends existing interfaces where appropriate
- [ ] JSDoc comments explain purpose and behavior

### Phase 5: Document Contract Decisions

Contract documentation exists in TypeScript file. No Serena memory storage needed for per-issue contracts.

### Phase 6: Update Linear Issue

**Use `linear-expert` to document staging completion:**

```markdown
## 🎯 Implementation Contracts Defined

### Contracts Created
**File**: `dev/contracts/MCP-{ISSUE_ID}-contracts.ts`

### Input Schema
- {List key input parameters}
- {Validation requirements}

### Output Schema
- {List key output fields}
- {Response structure}

### Error Contracts
- {List error types and conditions}

### Integration Points
- {List systems this integrates with}
- {Existing interfaces to conform to}

### Validation Strategy
**TypeCheck Validation**: `npm run typecheck` will verify conformance
**Implementation Phase**: Must import and implement these contracts
**Code Review Phase**: Will validate against these contracts

### Next Phase
✅ Ready for Implementation
```

**Update Linear issue status to "Staged"**

## Output Format

```
## 🎯 Implementation Contracts Generated for {ISSUE_ID}

### 📋 Issue Context
**Issue**: {Issue ID and title}
**Status**: Updated to "Staged"
**Scope**: {Implementation scope from planning}

### 🎯 Strategic Context
**Current Focus Impact**: [needs update / aligned / N/A]
**Relevant ADRs**: [list or none]
**Dependencies**: [no changes / updates needed: X / new package: Y]

### 🌿 Branch Name Recommended
**Branch**: {type}/{ISSUE-ID}-{semantic-description}
**Type**: {bugfix|feature|hotfix|refactor|test|doc|design}
**Rationale**: {Brief explanation of classification and naming}
**Next**: Branch will be created during implementation phase

### 📝 Contract File Created
**Location**: `dev/contracts/MCP-{ISSUE_ID}-contracts.ts`

### 🔧 Contracts Defined

**Input Schema:**
- Required parameters: {list}
- Optional parameters: {list}
- Validation rules: {list}

**Output Schema:**
- Success response structure: {overview}
- Error response structure: {overview}
- Metadata fields: {list}

**Error Contracts:**
- {ErrorType1}: {When it occurs}
- {ErrorType2}: {When it occurs}

**Integration Points:**
- Extends: {Existing interfaces}
- Integrates with: {Systems/components}

### ✅ Validation Strategy
- **Compile-time**: TypeScript type checking
- **Implementation**: Import and conform to interfaces
- **Code Review**: Validate implementation matches contracts

### 🚀 Next Phase
**Ready for**: Implementation phase (execute against contracts)
**Validation**: `npm run typecheck` confirms conformance
**Dependencies**: None - contracts are self-contained

---
*Implementation contracts defined. Ready for execution phase.*
```

## Important Notes

- **TypeScript Only**: No JSON Schema - TypeScript provides sufficient contract validation
- **Serena Integration**: Uses Serena to find existing type patterns to extend
- **Pattern Reuse**: Contracts should follow established project type patterns
- **Linear Integration**: Team ID `d1aae15e-d5b9-418d-a951-adcf8c7e39a8`
- **Memory Strategy**: No per-issue Serena memories - contracts documented in TypeScript files
- **Strategic Checks**: Reviews CURRENT-FOCUS.md, ADRs, and dependencies during staging
- **Language Policy**: Factual, neutral language - no superlatives in output
- **Validation Method**: `npm run typecheck` is the contract validator
- **Contract-First**: Implementation MUST import and conform to these contracts
