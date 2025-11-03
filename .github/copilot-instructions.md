# MCP for LifeOS - PR Review Guidelines

You are reviewing a Pull Request for the LifeOS MCP Server, a Model Context Protocol server for Obsidian vault management. Apply these specific review criteria:

## Critical Requirements (MUST)

### 1. Testing Coverage

- [ ] All tests pass (`npm test` before commit)
- [ ] New features have unit tests in `tests/unit/`
- [ ] Integration tests added for vault operations (use `--expose-gc` flag)
- [ ] No test coverage regressions
- [ ] Edge cases covered (empty vaults, missing files, invalid YAML)

### 2. YAML Compliance

- [ ] YAML frontmatter validation using `validateYamlFrontmatter()` from `vault-utils.ts`
- [ ] Proper handling of YAML parsing errors
- [ ] User's YAML rules consulted when modifying frontmatter
- [ ] Atomic operations for YAML updates (no partial states)

### 3. Type Safety

- [ ] No TypeScript errors (`npm run typecheck` passes)
- [ ] Proper types for tool parameters (not `any`)
- [ ] Null/undefined checks for optional parameters
- [ ] Return types explicitly declared for public functions

### 4. Platform Compatibility

- [ ] Unix-only platform assumption (macOS/Linux/WSL2)
- [ ] No Windows-specific path handling (use forward slashes)
- [ ] File operations use `fs.promises` (async)
- [ ] Path operations use `path.posix` where applicable

## Architecture Patterns

### Tool Implementation

- [ ] New tools registered in `tool-router.ts` (unified architecture)
- [ ] Tool descriptions include "WHEN TO USE" and "RETURNS" sections
- [ ] Parameters follow existing naming conventions (camelCase)
- [ ] Input validation with clear error messages

### Search Operations

- [ ] Use `search-engine.ts` for full-text search
- [ ] Relevance scoring applied consistently
- [ ] Result limits respected (default: 25, max: 100)
- [ ] Title extraction follows priority: YAML title → formatted date → filename

### Vault Operations

- [ ] Use `vault-utils.ts` for file operations
- [ ] Proper error handling (file not found, permission denied)
- [ ] Transaction safety for multi-step operations
- [ ] No direct `fs` calls (use vault-utils abstractions)

## Code Quality

### Error Handling

- [ ] Descriptive error messages (include context)
- [ ] Proper error types (not generic Error)
- [ ] User-facing messages are actionable
- [ ] Server errors vs user errors distinguished

### Performance

- [ ] No unnecessary file reads (check caching opportunities)
- [ ] Glob patterns optimized (specific paths when possible)
- [ ] Memory cleanup for large operations
- [ ] Integration tests use `--expose-gc` for memory management

### Documentation

- [ ] JSDoc comments for public functions
- [ ] Complex logic has inline comments
- [ ] ADRs updated for architectural changes (see `docs/adr/`)
- [ ] Tool documentation updated in relevant guides

## Project-Specific Checks

### Template System

- [ ] Template discovery respects `tpl-*` naming convention
- [ ] Templater syntax (`<% %>`) properly processed
- [ ] Custom data passed correctly to template engine
- [ ] Template errors caught and reported clearly

### Daily Notes

- [ ] Date parsing handles multiple formats (YYYY-MM-DD, "today", "yesterday")
- [ ] Template application for new daily notes
- [ ] Proper heading structure ("Day's Notes" with apostrophe)
- [ ] Metadata preservation on edits

### Linear Integration

- [ ] Uses Linear Team ID: `d1aae15e-d5b9-418d-a951-adcf8c7e39a8`
- [ ] Issue references in commits formatted correctly
- [ ] PR descriptions link to Linear issues

## Documentation Updates

Check if these need updating:

- [ ] `docs/CURRENT-FOCUS.md` - after merging to master
- [ ] `docs/ARCHITECTURE.md` - for architectural changes
- [ ] `docs/tools/*.md` - for new/changed tools
- [ ] `README.md` - for user-facing changes

## Anti-Patterns (FLAG THESE)

### Code Smells

- ❌ Direct `fs` calls instead of `vault-utils` abstractions
- ❌ Synchronous file operations (`readFileSync`, etc.)
- ❌ Swallowing errors without logging
- ❌ Magic numbers/strings (use constants)
- ❌ Duplicate code (check for refactoring opportunities)

### Testing Issues

- ❌ Tests with hardcoded paths
- ❌ Tests depending on execution order
- ❌ Integration tests without memory cleanup
- ❌ Mocking `vault-utils` in unit tests (use real implementation)

### Architecture Violations

- ❌ New tools not using `tool-router.ts`
- ❌ Business logic in `index.ts` (should be in separate modules)
- ❌ Circular dependencies between modules
- ❌ Direct Obsidian vault manipulation (should go through MCP tools)

## Review Focus Areas

### For Bug Fixes

1. Root cause identified and documented?
2. Regression test added?
3. Related code paths checked for similar issues?
4. Error message improved for future debugging?

### For New Features

1. Solves user need (not just technically interesting)?
2. Consistent with existing tool patterns?
3. Performance impact assessed?
4. Documentation complete (tool docs + ADR if architectural)?

### For Refactoring

1. Behavior preserved (tests still pass)?
2. Complexity reduced (not just moved)?
3. Performance maintained or improved?
4. Breaking changes documented?

## Code Style Conventions

### Naming Conventions

- Functions: `camelCase` (e.g., `getDailyNote`, `validateYamlFrontmatter`)
- Classes: `PascalCase` (e.g., `SearchEngine`, `TemplateProcessor`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RESULTS`, `DEFAULT_LIMIT`)
- Files: `kebab-case` (e.g., `vault-utils.ts`, `search-engine.ts`)

### Import Organization

1. Node built-ins (fs, path, etc.)
2. External dependencies (@modelcontextprotocol, etc.)
3. Internal modules (./vault-utils, ./search-engine)
4. Blank line between groups

### Async/Await

- Prefer `async/await` over `.then()` chains
- Always handle errors with try/catch
- Use `Promise.all()` for parallel operations
- Document any synchronous file operations (and why they're necessary)

## Output Format

Provide feedback as:

**Required Changes:**

- Critical issues that must be fixed before merge

**Suggestions:**

- Improvements that would enhance quality but aren't blockers

**Positive Notes:**

- Well-implemented patterns worth highlighting

**Questions:**

- Areas needing clarification from the author

## Example Review Comments

### Good

```typescript
// ✅ Good: Uses vault-utils abstraction, proper error handling
async function readNote(path: string): Promise<string> {
  try {
    return await readNoteFile(vaultPath, path);
  } catch (error) {
    throw new Error(`Failed to read note at ${path}: ${error.message}`);
  }
}
```

### Needs Improvement

```typescript
// ❌ Bad: Direct fs call, synchronous, no error handling
function readNote(path: string): string {
  return fs.readFileSync(path, 'utf-8');
}
```

### Better Alternative

```typescript
// ✅ Better: Async, uses vault-utils, proper error context
async function readNote(path: string): Promise<string> {
  try {
    return await readNoteFile(vaultPath, path);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Note not found: ${path}`);
    }
    throw new Error(`Failed to read note at ${path}: ${error.message}`);
  }
}
```

## Common Pitfalls

### YAML Frontmatter

```typescript
// ❌ Bad: No validation
frontmatter.tags = newTags;

// ✅ Good: Validate before writing
const validated = await validateYamlFrontmatter(frontmatter, yamlRules);
await writeNoteFile(path, validated);
```

### Search Results

```typescript
// ❌ Bad: Doesn't respect limits
return allResults;

// ✅ Good: Respects maxResults parameter
return allResults.slice(0, maxResults);
```

### Title Extraction

```typescript
// ❌ Bad: Only checks filename
const title = path.basename(filePath, '.md');

// ✅ Good: Follows priority order
const title = extractTitle(filePath, frontmatter);
// Priority: YAML title → formatted date → title-cased filename
```

## Testing Best Practices

### Unit Tests

```typescript
// ✅ Good: Focused, isolated, uses test fixtures
describe('validateYamlFrontmatter', () => {
  it('should reject invalid tags array', async () => {
    const invalid = { tags: 'not-an-array' };
    await expect(validateYamlFrontmatter(invalid)).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
// ✅ Good: Uses temp vault, cleans up, handles memory
describe('search integration', () => {
  let testVault: string;

  beforeEach(async () => {
    testVault = await createTestVault();
  });

  afterEach(async () => {
    await cleanupTestVault(testVault);
    if (global.gc) global.gc();
  });

  it('should find notes by content', async () => {
    // Test implementation
  });
});
```

## Security Considerations

- [ ] No path traversal vulnerabilities (validate user-provided paths)
- [ ] No arbitrary code execution (sanitize template inputs)
- [ ] No sensitive data in logs (redact vault paths, file contents)
- [ ] Proper permission checks for file operations

## Performance Benchmarks

For operations that process multiple files:

- Single file operation: < 50ms
- Search with 100 notes: < 500ms
- Batch operations: < 2s for 1000 notes
- Memory usage: < 100MB for typical vault (1000 notes)

Flag any operations that significantly exceed these benchmarks.

## Additional Resources

- Architecture: `docs/ARCHITECTURE.md`
- Tool Documentation: `docs/tools/`
- ADRs: `docs/adr/`
- Current Focus: `docs/CURRENT-FOCUS.md`
- Deployment Guide: `docs/guides/DEPLOYMENT-GUIDE.md`
