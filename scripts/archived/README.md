# Archived Test Scripts

**Archived Date**: 2025-10-22
**Reason**: Migration to Jest test suite complete

These standalone test scripts were created during feature development but are now **superseded by the Jest test suite** (250+ passing tests across 19 test files).

## ⚠️ WARNING: Do Not Run These Scripts

**CRITICAL SAFETY ISSUE**: Some of these scripts use process-spawning approaches that can **pollute the production Obsidian vault** with test artifacts. This issue was fixed in MCP-61 by migrating to direct tool imports with temporary test vaults.

**If you need to run tests**: Use `npm test` instead.

## Why These Were Archived

### Test Infrastructure Migration (MCP-61, 2025-10-22)
- **Problem**: Integration tests were creating permanent artifacts in production vault
- **Root Cause**: Process-spawn approach with unreliable environment variable propagation
- **Solution**: Migrated to Jest with direct tool imports and temp vault isolation
- **Result**: 100% test coverage with zero production vault pollution

### Redundancy with Jest Suite
All functionality tested by these scripts is now covered by comprehensive Jest tests:
- Unit tests: `tests/unit/*.test.ts`
- Integration tests: `tests/integration/*.test.ts`
- 250+ passing tests with proper isolation and cleanup

### Industry Best Practice
Mature projects consolidate on a single automated testing framework rather than maintaining parallel test infrastructures.

---

## Archived Scripts

### 🔴 RISKY - Vault Pollution Risk

#### **test-claude-desktop.js** - Claude Desktop Integration Tests
- **What it tested**: AI tool selection accuracy for consolidated tools
- **Why archived**: Uses process-spawning that pollutes production vault (same issue as MCP-61)
- **Jest equivalent**: `tests/integration/claude-desktop-integration.test.ts` (refactored with temp vault)
- **Safety note**: ⚠️ **DO NOT RUN** - Will create artifacts in production vault

### 🟡 REDUNDANT - Covered by Jest

#### **test-issue-61-acceptance.js** - YAML Search Features
- **What it tested**: GitHub Issue #61 acceptance criteria (YAML property search)
- **Feature completed**: ~5 months ago (e3b9e6b commit)
- **Jest equivalent**: `tests/unit/search-engine.test.ts`
- **Redundancy**: Feature stable, comprehensively tested in Jest

#### **test-tool-parity.js** - Tool Parity Validation
- **What it tested**: Consolidated vs legacy tool output matching
- **Feature completed**: GitHub Issue #80 (tool consolidation)
- **Jest equivalent**: Integration tests + unit tests for tool router
- **Redundancy**: Parity validated, feature complete

#### **test-tool-consolidation.js** - Consolidation Testing
- **What it tested**: Tool routing and auto-mode detection
- **Jest equivalent**: `tests/unit/tool-router.test.ts`
- **Redundancy**: Routing logic fully tested in Jest

#### **test-analytics.js** - Analytics System Testing
- **What it tested**: Analytics collection and dashboard functionality
- **Jest equivalent**: Unit tests for analytics components
- **Redundancy**: Analytics tested as part of tool execution tests

#### **test-advanced-features.js** - Advanced Feature Testing
- **What it tested**: Natural language query processing, complex searches
- **Jest equivalent**: `tests/unit/search-engine.test.ts`, `tests/unit/query-parser.test.ts`
- **Redundancy**: Advanced features comprehensively tested

---

## If You Need This Code

### For Reference
These scripts are preserved for historical reference and can be examined to understand past testing approaches. However, **do not run them against production vault**.

### For Recovery
If you need to reference specific test scenarios:
1. **Look at Jest tests first**: `tests/unit/` and `tests/integration/`
2. **Check git history**: `git log -- scripts/archived/`
3. **Review archived code**: Read the scripts but don't execute them

### For New Tests
Follow the established Jest pattern:
- Use `tests/integration/claude-desktop-integration.test.ts` as reference
- Create temporary test vaults in system tmpdir
- Use direct tool imports instead of process spawning
- Implement proper cleanup in `afterEach()` hooks
- See `tests/README.md` for test isolation pattern

---

## Testing Best Practices (Post-Migration)

### Primary Test Command
```bash
# Run all tests (unit + integration)
npm test

# Run specific test types
npm run test:unit
npm run test:integration

# Run with watch mode
npm run test:watch
```

### Test Isolation Pattern
```typescript
// ✅ Correct: Direct import with temp vault
import { VaultUtils } from '../../src/vault-utils.js';

beforeEach(async () => {
  vaultPath = join(tmpdir(), `test-vault-${randomBytes(8).toString('hex')}`);
  await fs.mkdir(vaultPath, { recursive: true });
});

afterEach(async () => {
  await fs.rm(vaultPath, { recursive: true, force: true });
});
```

### What We Learned
1. **Process spawning is unreliable** for test isolation (env vars don't propagate)
2. **Direct imports are safer** and test the same tool logic
3. **Temporary vaults are essential** to prevent production pollution
4. **Cleanup in afterEach()** guarantees no artifacts remain

---

## Documentation Updates

- **CHANGELOG.md**: MCP-61 entry documents the test infrastructure migration
- **tests/README.md**: Updated with test isolation pattern and best practices
- **scripts/README.md**: Updated to reflect archived scripts and Jest-first approach
- **Serena Memory**: `test_isolation_patterns_20251022` captures architectural decision

---

## Related Issues

- **Linear MCP-61**: Integration test vault pollution prevention
- **GitHub Issue #61**: YAML search features (original purpose of test-issue-61-acceptance.js)
- **GitHub Issue #80**: Tool consolidation (original purpose of test-tool-parity.js)
- **GitHub Issue #82**: Claude Desktop integration tests

---

**For questions about testing**: See `tests/README.md` or consult the Jest test suite.
**For questions about this archival**: See MCP-61 in Linear or CHANGELOG.md entry from 2025-10-22.
