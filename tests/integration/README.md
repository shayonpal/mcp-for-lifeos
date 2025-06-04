# Integration Tests

This directory contains integration tests for the LifeOS MCP server, focusing on validating tool consolidation effectiveness and backward compatibility.

## Test Suites

### 1. Claude Desktop Integration Tests (`claude-desktop-integration.test.ts`)

Tests the AI Tool Caller Optimization (#62) by simulating Claude Desktop interaction patterns.

**Purpose:** Validate that consolidated tools improve AI decision-making accuracy
**Current Status:** ✅ 95% accuracy achieved (exceeds 90% target)

### 2. Tool Parity Tests (`tool-parity.test.ts`)

Comprehensive validation that consolidated tools produce identical outputs to their legacy counterparts across all use cases.

**Purpose:** Ensure backward compatibility and validate the AI Tool Caller Optimization (#62)
**Status:** 🆕 **Newly Implemented** - Issues #80

#### Test Categories

- **Search Parity** (6 scenarios): All search tools vs universal search with different modes
- **Creation Parity** (4 scenarios): create_note vs create_note_smart flows  
- **Listing Parity** (8 scenarios): All listing tools vs universal list tool
- **Error Handling** (5 scenarios): Consistent error handling between legacy and consolidated tools
- **Performance Regression** (automatic): Validates no significant performance degradation

#### Expected Results

- **95% Parity Target**: Consolidated tools must match legacy tool outputs ≥95% of the time
- **Performance Threshold**: <500ms average time difference between tools
- **Error Consistency**: Both tools should succeed/fail consistently

## Test Utilities

### Test Data Generator (`../utils/test-data-generator.ts`)

Provides comprehensive test scenario generation with:
- **SearchTestCase**: 13 search scenarios covering all legacy tools
- **CreationTestCase**: 4 creation scenarios with templates and metadata
- **ListingTestCase**: 8 listing scenarios across all types
- **ErrorTestCase**: 5 error handling scenarios
- **ParityValidator**: Advanced output comparison with normalization

## Running Tests

### Full Test Suite
```bash
# Run all integration tests
npm run test:integration

# Run with verbose output
VERBOSE_TESTS=1 npm run test:integration
```

### Claude Desktop Tests
```bash
# Quick accuracy validation
npm run test:claude-desktop:accuracy

# Full test with performance metrics
npm run test:claude-desktop

# Run specific scenario
node scripts/test-claude-desktop.js --scenario=search-basic-text --verbose
```

### Tool Parity Tests
```bash
# Run all parity tests
npm run test:tool-parity

# Run specific category
npm run test:tool-parity:search

# Run with detailed output
npm run test:tool-parity:verbose

# Custom test run
node scripts/test-tool-parity.js --category creation --max-tests 5 --verbose
```

## Test Infrastructure

### MCP Client Simulation

Both test suites use specialized MCP clients that:
- Spawn the actual MCP server as a child process
- Communicate via JSON-RPC over stdio
- Measure execution time and validate responses
- Handle connection lifecycle and error conditions

### Output Normalization

Tool parity tests include sophisticated output normalization:
- **Timestamp Normalization**: Dynamic timestamps become `[TIMESTAMP]`
- **Path Normalization**: User-specific paths become `/Users/[USER]/`
- **File Reference Normalization**: Dynamic file names become `[FILE].md`
- **Structure Validation**: Focus on output structure over exact content

### Performance Validation

Automated performance regression testing:
- Measures execution time for all tool calls
- Compares legacy vs consolidated tool performance
- Flags performance degradation >500ms average difference
- Provides detailed timing breakdowns by category

## Validation Checklist

Before considering tool consolidation complete:

- [ ] **Claude Desktop Tests**: ≥90% tool selection accuracy
- [ ] **Tool Parity Tests**: ≥95% output consistency
- [ ] **Performance Tests**: <500ms average time difference
- [ ] **Error Handling**: Consistent error behavior
- [ ] **Edge Cases**: All edge cases handled gracefully
- [ ] **Integration Validation**: End-to-end workflows complete successfully

## Test Results Analysis

### Success Metrics

- **Accuracy Target**: 90% for Claude Desktop, 95% for Tool Parity
- **Performance Target**: <500ms average response time difference
- **Error Rate Target**: <5% of requests should result in errors
- **Category Performance**: Each test category should achieve >85% accuracy

### Sample Output Analysis
```
=== TOOL PARITY TEST SUMMARY ===
Total tests: 25
Passed: 24
Failed: 1
Accuracy: 96.0%
Target: 95%
Status: ✅ PASSED

Performance:
Average time difference: 127.32ms
Max acceptable: 500ms
Performance: ✅ GOOD

📊 By Category:
  search: 100.0% (6/6)
  creation: 100.0% (4/4)
  listing: 87.5% (7/8)
  error: 100.0% (5/5)
```

## Troubleshooting

### Common Issues

1. **Server Connection Failures**
   - Ensure `npm run build` has been run
   - Check that no other MCP server instances are running
   - Verify environment variables are set correctly

2. **Test Timeouts**
   - Increase timeout in `jest.config.js` for slow systems
   - Run smaller test batches with `--max-tests` parameter
   - Check for vault accessibility issues

3. **Parity Failures**
   - Review verbose output to understand differences
   - Check if differences are due to legitimate improvements
   - Update normalization logic if needed

4. **Performance Issues**
   - Profile individual tool calls for bottlenecks
   - Check vault size and file system performance
   - Consider test environment optimization

### Debug Mode

Enable detailed debugging:
```bash
# Jest tests
VERBOSE_TESTS=1 npm run test:integration

# Standalone runners  
node scripts/test-tool-parity.js --verbose
node scripts/test-claude-desktop.js --verbose
```

## Future Enhancements

- **Real Claude Desktop Integration**: Test with actual Claude Desktop instead of simulation
- **A/B Testing Framework**: Statistical comparison of consolidated vs legacy tools
- **Automated Regression Detection**: CI/CD integration for performance monitoring
- **User Journey Analytics**: Track complex multi-step workflows
- **Statistical Validation**: Confidence intervals and hypothesis testing

## Contributing

When adding new test scenarios:

1. Add scenarios to `test-data-generator.ts` 
2. Update expected results in test documentation
3. Run comprehensive validation before submitting
4. Include performance impact analysis
5. Update troubleshooting guide as needed