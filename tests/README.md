# Tests Directory

This directory contains the test suite for the LifeOS MCP server.

## Structure

- **`unit/`** - Unit tests for individual components and functions
- **`integration/`** - Integration tests for MCP tools and vault operations  
- **`fixtures/`** - Test data and mock vault structures

## Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration

# Run tests in watch mode
npm run test:watch
```

## Test Guidelines

### Unit Tests
- Test individual functions and classes in isolation
- Mock external dependencies (file system, vault operations)
- Focus on business logic and error handling

### Integration Tests
- Test complete MCP tool workflows
- Use temporary test vaults in system tmpdir for complete isolation (MCP-61)
- **CRITICAL**: Never write to production vault - use direct tool imports with temp vault setup
- Verify tool inputs/outputs and side effects
- Clean up test artifacts in afterEach() hooks

**Test Isolation Pattern** (MCP-61, updated MCP-91):
```typescript
// ✅ Correct: Direct import with temp vault
import { readNote, createNote } from '../../src/modules/files/index.js';
import { resetTestSingletons } from '../helpers/test-utils.js';
import { LIFEOS_CONFIG } from '../../src/shared/index.js';

beforeEach(async () => {
  vaultPath = join(tmpdir(), `test-vault-${randomBytes(8).toString('hex')}`);
  await fs.mkdir(vaultPath, { recursive: true });
  LIFEOS_CONFIG.vaultPath = vaultPath;
  resetTestSingletons(); // Reset singleton managers for test isolation
});

afterEach(async () => {
  await fs.rm(vaultPath, { recursive: true, force: true });
});
```

```typescript
// ❌ Wrong: Spawning server process (env var propagation unreliable)
const server = spawn('node', ['dist/index.js'], {
  env: { LIFEOS_VAULT_PATH: testVault } // May not propagate
});
```

**Rationale**: Direct imports test all tool logic reliably while avoiding production vault pollution. Process spawning tests (stdio transport, JSON-RPC) deferred to future work.

**Legacy Scripts Archived** (2025-10-22): 6 standalone test scripts moved to scripts/archived/ - Jest is now the single testing framework. See scripts/archived/README.md for migration details.

### Test Data
- Store sample vault structures in `fixtures/`
- Include various YAML frontmatter formats
- Provide template examples for testing

## Adding Tests

When adding new features:

1. **Add unit tests** for new functions/classes
2. **Add integration tests** for new MCP tools
3. **Update fixtures** if new test data is needed
4. **Document test cases** in comments

## Future Enhancements

- [ ] Jest configuration for TypeScript
- [ ] Test coverage reporting
- [ ] Automated test fixtures generation
- [ ] Performance benchmarking tests
- [ ] End-to-end client integration tests