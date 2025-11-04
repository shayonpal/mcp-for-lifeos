# Testing Guide

Comprehensive guide to the LifeOS MCP Server test suite.

## Overview

The test suite ensures reliability, regression protection, and edge case handling for the MCP server. Tests are organized into unit and integration categories with specialized test suites for workflows, regression, edge cases, and vault configurations.

**Test Statistics**:

- Total: 726 tests (721 passing, 5 skipped)
- Test Suites: 42 suites
- Coverage: >95%
- Pass Rate: 99.3%

## Test Organization

```
tests/
├── unit/                    # Unit tests (isolated functionality)
├── integration/             # Integration tests (MCP protocol, handlers)
│   ├── workflows/          # End-to-end workflow scenarios
│   ├── regression/         # Regression protection tests
│   └── edge-cases/         # Boundary conditions and edge cases
└── setup.ts                # Global test configuration
```

## Running Tests

### All Tests

```bash
npm test                  # Run complete test suite (726 tests)
npm run test:unit         # Unit tests only
npm run test:integration  # All integration tests
```

### Specialized Test Suites

```bash
npm run test:workflows      # End-to-end workflow scenarios
npm run test:regression     # Regression protection tests
npm run test:edge-cases     # Edge case and boundary tests
npm run test:vault-config   # Vault configuration variations
```

### Integration Tests with Memory Management

Integration tests require memory management flags for garbage collection testing. The `npm test` command now automatically includes `--expose-gc`:

```bash
npm test                                                  # Includes --expose-gc automatically
npm run test:integration                                  # Integration tests with --expose-gc
node --expose-gc ./node_modules/.bin/jest tests/integration  # Manual invocation
```

### Specific Test Files

```bash
npx jest path/to/specific.test.ts                    # Run one file
npx jest path/to/specific.test.ts -t "test name"     # Run one test
```

## Test Categories

### Workflow Tests

**Purpose**: Validate realistic end-to-end scenarios users will encounter.

**Location**: `tests/integration/workflows/`

**Scenarios Covered**:

1. **Archive Project**: Move completed project to Archives with link updates
   - PARA folder structure navigation
   - Bidirectional link updates
   - Frontmatter preservation
   - Block reference integrity

2. **Organize Inbox**: Categorize inbox notes into PARA folders
   - Cross-folder moves
   - Cross-reference updates
   - Multiple sequential operations

3. **Refactor Structure**: Multiple sequential renames with bidirectional links
   - Note graph consistency
   - Sequential rename operations
   - Bidirectional link integrity

**When to Add Workflow Tests**: When implementing features that affect common user workflows or multi-step operations.

### Regression Tests

**Purpose**: Protect critical Phase 4 transaction features from breaking changes.

**Location**: `tests/integration/regression/`

**Features Protected**:

1. **Transaction Atomicity**: Rollback on failure, no partial states
2. **SHA-256 Staleness Detection**: Concurrent modification protection
3. **Boot Recovery**: Orphaned WAL cleanup at startup
4. **WAL Cleanup**: WAL deletion after successful transactions
5. **Staging File Cleanup**: Temp file cleanup on success/abort

**When to Add Regression Tests**: After fixing a bug or when implementing a critical feature that must never break.

### Edge Case Tests

**Purpose**: Test boundary conditions and unusual inputs.

**Location**: `tests/integration/edge-cases/`

**Categories**:

1. **Large Files**: 10MB+ files with SHA-256 validation
2. **Special Characters**: Unicode, spaces, emoji in filenames
3. **Concurrent Operations**: Same file vs different file renames
4. **Boundary Conditions**: Empty files, no frontmatter, path limits

**When to Add Edge Case Tests**: When bugs are found in production or when handling unusual user inputs.

### Vault Configuration Tests

**Purpose**: Validate behavior across different vault setups.

**Location**: `tests/integration/vault-configurations.test.ts`

**Configurations Tested**:

1. **Complex YAML**: Nested structures, arrays, custom fields
2. **PARA Folders**: Cross-folder moves, folder-scoped links
3. **Mixed Link Formats**: Wikilinks, aliases, block refs, headings
4. **Template Interactions**: Template metadata preservation

**When to Add Vault Config Tests**: When adding features that interact with YAML, templates, or vault structure.

## Common Testing Patterns

### Vault Setup Pattern

Always use temporary vaults to prevent production pollution:

```typescript
import { VaultUtils } from '../../src/vault-utils.js';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

let vaultPath: string;
let originalConfig: any;

beforeEach(async () => {
  // Create temporary vault
  const randomId = randomBytes(8).toString('hex');
  vaultPath = path.join(tmpdir(), `test-vault-${randomId}`);
  await fs.mkdir(vaultPath, { recursive: true });

  // Override config
  const { LIFEOS_CONFIG } = await import('../../src/config.js');
  originalConfig = { ...LIFEOS_CONFIG };
  LIFEOS_CONFIG.vaultPath = vaultPath;

  // CRITICAL: Reset singletons
  VaultUtils.resetSingletons();
});

afterEach(async () => {
  // Restore original config
  if (originalConfig) {
    const { LIFEOS_CONFIG } = await import('../../src/config.js');
    Object.assign(LIFEOS_CONFIG, originalConfig);
  }

  // Clean up temporary vault
  if (vaultPath) {
    await fs.rm(vaultPath, { recursive: true, force: true });
  }
});
```

**Why Critical**: Without `VaultUtils.resetSingletons()`, singleton instances retain production vault path and cause test pollution of live vault.

### Handler Testing Pattern

Test MCP tools through their handlers:

```typescript
let renameNoteHandler: any;

beforeEach(async () => {
  // Import the handler
  const { registerNoteHandlers } = await import('../../src/server/handlers/note-handlers.js');
  const handlerRegistry = new Map();
  registerNoteHandlers(handlerRegistry);
  renameNoteHandler = handlerRegistry.get('rename_note');
});

// In test:
const context: ToolHandlerContext = {
  registryConfig: { serverVersion: '2.0.1', toolMode: 'consolidated-only' },
  analytics: { logToolCall: () => Promise.resolve() } as any
};

const result = await renameNoteHandler({ oldPath, newPath }, context);
const output = JSON.parse(result.content[0].text);

expect(output.success).toBe(true);
```

### YAML Frontmatter Testing

Test YAML preservation during operations:

```typescript
const content = `---
title: Test Note
tags: [tag1, tag2]
customField: Custom Value
---

# Content`;

await fs.writeFile(sourcePath, content);

// ... perform operation ...

const updatedContent = await fs.readFile(destPath, 'utf-8');
expect(updatedContent).toContain('title: Test Note');
expect(updatedContent).toContain('tags: [tag1, tag2]');
expect(updatedContent).toContain('customField: Custom Value');
```

### Link Update Validation

Test wikilink updates after rename operations:

```typescript
// Create target note
await fs.writeFile(targetPath, '# Target');

// Create linking note
await fs.writeFile(linkingPath, '[[target]]');

// Rename target with link updates
const result = await renameNoteHandler({
  oldPath: targetPath,
  newPath: newPath,
  updateLinks: true
}, context);

// Verify link updated
const updatedContent = await fs.readFile(linkingPath, 'utf-8');
expect(updatedContent).toContain('[[renamed-target]]');
```

## Testing Pitfalls

### Timezone Bugs

**Issue**: `new Date('2025-08-30')` creates UTC midnight, which shifts to previous day in EST/PST.

**Fix**: Use `parseISO()` from date-fns for date strings:

```typescript
// WRONG - creates timezone shift
const date = new Date('2025-08-30'); // EST: Aug 29

// CORRECT - interprets as local date
import { parseISO } from 'date-fns';
const date = parseISO('2025-08-30'); // Aug 30
```

### Production Vault Pollution

**Issue**: Tests write to production Obsidian vault despite temp directory setup.

**Root Cause**: Singletons (TemplateManager, ObsidianSettings, DateResolver) initialized with production config persist across tests.

**Fix**: Always call `VaultUtils.resetSingletons()` after modifying `LIFEOS_CONFIG`:

```typescript
beforeEach(() => {
  LIFEOS_CONFIG.vaultPath = testVaultPath;
  VaultUtils.resetSingletons(); // Force re-initialization
});
```

### Async Timing

**Issue**: Long-running tests exceed Jest default timeout (5s).

**Fix**: Increase timeout for specific tests:

```typescript
it('should handle large file operations', async () => {
  // ... test code ...
}, 30000); // 30 second timeout
```

### API Surface Mismatches

**Issue**: Tests call methods that don't exist on the actual API.

**Fix**: Use Serena to verify API surface before writing tests:

```bash
mcp__serena__find_symbol with name_path: "ClassName"
mcp__serena__get_symbols_overview
```

## Quality Standards

### Test Coverage Targets

- Unit tests: 80%+ coverage for core utilities
- Integration tests: All MCP tools exercised
- Regression tests: All critical features protected
- Overall: >95% code coverage

### Test Reliability

- **Zero flaky tests** - Tests must be deterministic
- **No retries** - Tests should pass on first run
- **Proper isolation** - Each test uses temp vault
- **Clean state** - No cross-test dependencies

### Performance Benchmarks

- Character estimation: <100ms for 1000 operations
- JSONL append: <5ms per operation
- Search throughput: >1000 ops/sec
- Server startup: <1 second to tool registration

## Pre-Commit Checklist

Before committing changes, verify:

1. ✅ Full test suite passes: `npm test`
2. ✅ TypeScript compilation clean: `npm run typecheck`
3. ✅ No new flaky tests introduced
4. ✅ Test coverage maintained or improved
5. ✅ No production vault pollution (check vault for test artifacts)

## Debugging Failed Tests

### Check Test Isolation

```bash
# Run test multiple times to check for flakiness
for i in {1..5}; do npm test; done
```

### Check Production Vault

```bash
# Look for test artifacts in production vault
ls -la ~/Documents/LifeOS-Obsidian-Vault/.mcp-*
ls -la ~/Documents/LifeOS-Obsidian-Vault/test-*
```

### Enable Debug Logging

```bash
# Run with verbose output
npm test -- --verbose

# Run specific test with debug
npx jest path/to/test.ts --verbose --no-coverage
```

### Memory Issues

```bash
# Run with memory profiling
node --expose-gc --trace-gc ./node_modules/.bin/jest tests/integration
```

## Adding New Tests

### Workflow Test Template

```typescript
describe('Workflow: [Workflow Name]', () => {
  it('should [describe expected behavior]', async () => {
    // Setup: Create vault structure and test data

    // Execute: Perform operations

    // Verify: Check results match expectations
  });
});
```

### Regression Test Template

```typescript
describe('Regression: [Feature Name]', () => {
  it('should protect [specific behavior] from breaking', async () => {
    // Setup: Create minimal test case

    // Execute: Perform operation

    // Verify: Critical behavior still works
  });
});
```

### Edge Case Test Template

```typescript
describe('Edge Case: [Boundary Condition]', () => {
  it('should handle [unusual input] correctly', async () => {
    // Setup: Create edge case scenario

    // Execute: Perform operation

    // Verify: Graceful handling or expected error
  });
});
```

## CI Integration

**Note**: This project uses direct master branch workflow without CI/CD automation.

**Manual Validation Required**:

1. Run `npm test` locally before committing
2. Run `npm run typecheck` to verify types
3. Manual testing with Claude Desktop/Raycast

**Future CI Setup** (if needed):

- GitHub Actions configuration
- Automated test runs on PR
- Coverage reporting
- Performance benchmarking

## Test Maintenance

### Updating Tests After API Changes

1. Use Serena to find affected tests:

   ```bash
   mcp__serena__search_for_pattern with pattern: "method.*name"
   ```

2. Update test expectations to match new behavior
3. Run affected test suite to verify
4. Run full suite to check for regressions

### Debugging Flaky Tests

1. Run test 10+ times to reproduce
2. Check for timing dependencies
3. Verify proper cleanup in afterEach
4. Check for singleton state leakage
5. Use `it.skip()` temporarily if blocking progress

### Performance Regression Testing

Monitor test execution time:

```bash
# Run tests and track timing
npm test 2>&1 | grep "Time:"

# Expected: < 25 seconds for full suite
```

## Resources

- **Contract Files**: `dev/contracts/` - TypeScript contracts for features
- **Test Fixtures**: Create in temp directories, not committed
- **Memory Patterns**: `mcp__serena__read_memory with key: "testing_guide"`
- **Existing Tests**: Reference boot-recovery.test.ts for complex patterns

## Support

For test-related questions:

- Review existing test files for patterns
- Check Serena memories for testing knowledge
- Reference this guide for common pitfalls
- Create issues for test infrastructure improvements
