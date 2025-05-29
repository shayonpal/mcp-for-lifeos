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
- Use test vault with known structure
- Verify tool inputs/outputs and side effects

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