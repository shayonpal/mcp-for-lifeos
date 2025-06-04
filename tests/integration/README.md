# Claude Desktop Integration Tests

This directory contains integration tests that validate the effectiveness of the AI Tool Caller Optimization (#62) by testing actual Claude Desktop interaction patterns.

## Overview

The Claude Desktop integration tests validate that:
- **Tool Selection Accuracy**: AI chooses the correct consolidated tools (>90% target)
- **Parameter Inference**: User requests are correctly translated to tool parameters
- **Performance**: Consolidated tools perform comparably to legacy tools
- **User Experience**: End-to-end workflows complete successfully
- **Error Handling**: Graceful handling of invalid requests and edge cases

## Test Architecture

### Core Components

1. **`claude-desktop-integration.test.ts`** - Main Jest test suite
   - Comprehensive test scenarios covering all tool categories
   - Statistical validation of 90% accuracy target
   - Performance benchmarking and comparison
   - End-to-end workflow testing

2. **`../fixtures/claude-desktop-scenarios.json`** - Test scenarios
   - 20+ real-world user request scenarios
   - Expected tool selections and parameters
   - Coverage across search, creation, listing, and workflow categories
   - Edge cases and performance tests

3. **`../../scripts/test-claude-desktop.js`** - Standalone runner
   - Quick validation without Jest overhead
   - Command-line interface for targeted testing
   - Real-time accuracy reporting
   - Useful for development and debugging

### Test Categories

- **Search** (9 scenarios): Basic text search, recent notes, pattern matching, content type filtering, natural language queries
- **Creation** (4 scenarios): Basic note creation, template-based creation (restaurant, person, article)
- **Listing** (4 scenarios): Folders, templates, daily notes, YAML properties
- **Workflow** (2 scenarios): Multi-step operations combining different tools
- **Edge Cases** (1 scenario): Empty queries, special characters, error conditions

## Running Tests

### Full Jest Suite
```bash
# Run all integration tests
npm run test:integration

# Run with verbose output
VERBOSE_TESTS=1 npm run test:integration

# Run specific test
npm test -- --testNamePattern="Tool Selection Accuracy"
```

### Standalone Test Runner
```bash
# Run all scenarios with summary
npm run test:claude-desktop

# Run accuracy test only (faster)
npm run test:claude-desktop:accuracy

# Run specific scenario
node scripts/test-claude-desktop.js --scenario=search-basic-text

# Verbose output for debugging
node scripts/test-claude-desktop.js --verbose
```

## Test Results Interpretation

### Success Metrics

- **90% Accuracy Target**: Overall tool selection accuracy must be ≥90%
- **Category Performance**: Each category should achieve >85% accuracy
- **Response Time**: Average response time should be <2 seconds
- **Error Rate**: <5% of requests should result in errors

### Sample Output
```
=== Summary ===
Total scenarios: 20
Successful: 19
Failed: 1
Accuracy: 95.0%
Average time: 32ms
90% Target: MET

=== By Category ===
search: 100.0% (9/9)
creation: 100.0% (4/4)
listing: 100.0% (4/4)
workflow: 50.0% (1/2)
```

## Test Implementation Details

### MCP Client Simulation

The tests use a `ClaudeDesktopTestClient` that:
- Spawns the MCP server as a child process
- Communicates via JSON-RPC over stdio
- Simulates Claude Desktop tool selection logic
- Measures execution time and accuracy

### Tool Selection Logic

The tool selection simulation uses heuristics based on:
- Keywords in user requests ("search", "create", "list")
- Context clues (recent, pattern, template types)
- Parameter inference from natural language

This approximates how Claude Desktop's AI would choose tools, providing a realistic test environment.

### Parameter Inference

The tests validate that:
- User intent is correctly translated to tool parameters
- Optional parameters are properly inferred
- Default values are applied appropriately
- Edge cases are handled gracefully

## Extending Tests

### Adding New Scenarios

1. Add new scenario to `../fixtures/claude-desktop-scenarios.json`:
```json
{
  "id": "new-scenario",
  "userRequest": "user's natural language request",
  "expectedTool": "expected_tool_name",
  "expectedParameters": { "param": "value" },
  "category": "search|creation|listing|workflow",
  "complexity": "simple|medium|complex",
  "description": "What this scenario tests"
}
```

2. Run tests to validate the new scenario:
```bash
node scripts/test-claude-desktop.js --scenario=new-scenario --verbose
```

### Customizing Tool Selection Logic

Modify the `selectToolForRequest()` and `inferParameters()` functions in:
- `claude-desktop-integration.test.ts` (Jest version)
- `../../scripts/test-claude-desktop.js` (standalone version)

### Performance Testing

Add performance-specific scenarios with:
- Large dataset queries
- Complex parameter combinations
- Stress testing with rapid requests

## Troubleshooting

### Common Issues

1. **Server not found**: Run `npm run build` first
2. **Connection timeout**: Increase `TIMEOUT_MS` in test config
3. **Low accuracy**: Check tool selection logic or add more training scenarios
4. **Performance issues**: Enable verbose logging to identify bottlenecks

### Debug Mode

Enable verbose output for detailed debugging:
```bash
VERBOSE_TESTS=1 npm run test:integration
node scripts/test-claude-desktop.js --verbose
```

### Manual Testing

Test individual tools manually:
```bash
# Start MCP server
node dist/index.js

# In another terminal, send JSON-RPC requests
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js
```

## Validation Checklist

Before considering implementation complete:

- [ ] All test scenarios pass (≥90% accuracy)
- [ ] Performance meets targets (<2s average response time)
- [ ] Edge cases handled gracefully
- [ ] Error handling validates properly
- [ ] End-to-end workflows complete successfully
- [ ] Documentation is complete and accurate

## Future Enhancements

- **Real Claude Desktop Integration**: Test with actual Claude Desktop instead of simulation
- **A/B Testing Framework**: Compare consolidated vs legacy tools
- **Performance Regression Testing**: Automated detection of performance degradation
- **User Journey Analytics**: Track complex multi-step workflows
- **Statistical Analysis**: Confidence intervals and hypothesis testing