---
description: Conditional testing phase - design and execute tests only if implementation requires validation
argument_hint: <linear-issue-id>
---

# 05-Test - Conditional Testing Phase

Assess whether implementation requires automated testing. If needed, design and execute comprehensive tests. If not needed, skip to documentation phase.

## Help Mode

If user provides `--help` or `help` parameter, display this usage guide:

```
05-test - Conditional testing phase with test design and execution

USAGE:
  05-test <linear-issue-id>    Assess, design, and execute tests if needed
  05-test help                 Show this help

DESCRIPTION:
  Conditional testing phase that:
  1. Assesses whether implementation needs automated tests
  2. Designs tests based on actual implementation (if needed)
  3. Executes comprehensive test suite (if tests created)
  4. Updates Linear with results or skip rationale

EXAMPLES:
  05-test MCP-123             Evaluate testing needs for issue MCP-123
```

## Phase 0: Test Necessity Assessment

**IMPORTANT: Determine if automated tests are needed before proceeding**

**Parse LINEAR_ISSUE_ID from arguments:**

```bash
LINEAR_ISSUE_ID="$ARGUMENTS"
if [ -z "$LINEAR_ISSUE_ID" ]; then
  echo "❌ Linear issue ID required"
  exit 1
fi
```

**Assess implementation type and testing requirements:**

Use `linear-expert` to retrieve:

- Issue description and implementation scope
- Acceptance criteria
- Implementation changes made
- Code review feedback

**Automatic Skip Scenarios (no user consultation needed):**

- Documentation-only changes (README, docs/, comments)
- Configuration file updates (package.json, tsconfig.json)
- Trivial typo fixes or formatting changes
- Changes with zero `.ts` source code modifications

**User Consultation Required For:**

- New MCP tool functionality
- Changes to core logic (search-engine, tool-router, files module)
- Integration point modifications
- Bug fixes with complex logic
- Template system changes
- YAML processing modifications

**Consultation Prompt:**

```
## 🤔 Testing Assessment for {LINEAR_ISSUE_ID}

### Implementation Summary
{Brief description of what was implemented}

### Changed Files
{List of modified source files}

### Implementation Type
{Bug fix / New feature / Enhancement / Refactor}

### Testing Recommendation
Based on the implementation scope, automated testing is:
- ✅ **Recommended** - Complex logic requiring validation
- ⚠️ **Optional** - Simple changes, low risk
- ❌ **Not Needed** - Documentation/config only

### Question
**Do you want to create and run automated tests for this implementation?**

Options:
1. Yes - Design and execute comprehensive tests
2. No - Skip to documentation phase (05-document)
3. Partial - Run existing tests only, no new test design

Please respond with: 1, 2, or 3
```

**Based on user response:**

- **Option 1 (Yes)**: Proceed with Phases 1-7 below (test design + execution)
- **Option 2 (No)**: Skip to documentation handoff (see Phase 8: Skip Testing)
- **Option 3 (Partial)**: Skip to Phase 2 (execute existing tests only)

---

## Instructions (if testing selected)

**Validate Prerequisites:**

- Ensure code-review phase completed successfully
- Verify implementation exists and builds without errors
- User confirmed testing is needed

### Phase 1: Initialize Testing Session

**Activate Serena MCP for Testing Memory:**

1. **Project Activation**:

   ```bash
   echo "Activating LifeOS MCP testing session for issue $LINEAR_ISSUE_ID"
   ```

2. **Access Testing Patterns**:
   Use Serena MCP to search for previous MCP testing approaches and patterns:
   - Query: "MCP server testing patterns and validation strategies"
   - Search for similar testing scenarios in memory
   - Identify relevant test patterns for this project type

3. **Retrieve Issue Context**:
   Use linear-expert agent to get complete issue details including acceptance criteria.

### Phase 2: Automated Test Execution

**TypeScript Validation:**

```bash
echo "🔍 Running TypeScript validation..."
npm run typecheck 2>&1 | tee typecheck-results.log
TYPECHECK_EXIT_CODE=${PIPESTATUS[0]}
```

- Verify no type errors exist
- Ensure all imports resolve correctly
- Validate MCP protocol compliance
- **Capture compilation errors and warnings for detailed reporting**

**Unit Test Suite:**

```bash
echo "🧪 Executing unit test suite..."
npm test -- --verbose --json --outputFile=test-results.json 2>&1 | tee test-output.log
TEST_EXIT_CODE=${PIPESTATUS[0]}
```

- Run complete Jest test suite with detailed JSON output
- **Capture failed test details including error messages and stack traces**
- **Record skipped tests with skip reasons**
- Check test coverage for new functionality
- Validate core utilities (files module, search-engine)

**MCP-Specific Testing:**

```bash
echo "🎯 Testing MCP tool accuracy..."
npm run test:claude-desktop:accuracy -- --verbose --json --outputFile=accuracy-results.json 2>&1 | tee accuracy-output.log
ACCURACY_EXIT_CODE=${PIPESTATUS[0]}

echo "⚖️ Validating tool parity..."
npm run test:tool-parity -- --verbose --json --outputFile=parity-results.json 2>&1 | tee parity-output.log
PARITY_EXIT_CODE=${PIPESTATUS[0]}
```

- Test Claude Desktop integration accuracy
- Validate consolidated vs legacy tool parity
- Ensure tool router functions correctly
- **Capture detailed failure information for MCP-specific tests**

### Phase 3: Manual MCP Server Verification

**Server Startup Test:**

1. **Build and Start Server**:

   ```bash
   npm run build
   echo "Starting MCP server for manual testing..."
   timeout 10s node dist/index.js || echo "Server startup test complete"
   ```

2. **Tool Registration Verification**:
   - Verify all tools register correctly
   - Check stdio transport initialization
   - Validate MCP protocol handshake

3. **Core Functionality Testing**:
   - Test search tool with sample queries
   - Validate create_note_smart with template
   - Verify list tool with different filters
   - Test YAML compliance and validation

**Template System Verification:**

- Test template discovery and caching
- Validate Templater syntax processing
- Verify YAML frontmatter compliance
- Check folder placement logic

### Phase 4: Integration Testing

**Execute comprehensive integration tests directly:**

```bash
# Run integration test suite
npm run test:integration

# If integration tests don't exist yet, run all tests:
npm test

# Verify coverage of:
# - End-to-end workflow testing
# - Error handling and edge cases
# - Performance under typical usage patterns
# - Memory usage and cleanup verification

# Parse test output for failures
# Use Read tool on test-results.json if generated
```

**Analytics System Testing:**

```bash
echo "📊 Testing analytics system..."
# Verify analytics collection works without errors
# Test dashboard accessibility if enabled
ENABLE_WEB_INTERFACE=true timeout 5s node dist/index.js || echo "Analytics test complete"
```

### Phase 5: Acceptance Criteria Validation

**Using doc-search Agent:**

1. **Retrieve Requirements**: Search project documentation for acceptance criteria
2. **Create Validation Matrix**: Map each criterion to test results
3. **Document Coverage**: Verify all requirements tested

**Manual Verification Checklist:**

- [ ] All automated tests pass
- [ ] MCP server starts without errors
- [ ] Tools register and respond correctly
- [ ] Template system processes correctly
- [ ] YAML compliance enforced
- [ ] Error handling works gracefully
- [ ] Performance meets expectations
- [ ] No memory leaks detected

### Phase 6: Store Testing Insights

**Using Serena MCP:**
Store discovered testing patterns and insights:

- Effective MCP testing strategies
- Common failure modes identified
- Performance benchmarks established
- Integration testing approaches that worked well

### Phase 7: Analyze Test Results

**Parse Test Output Files:**

1. **Extract Failed Tests**:
   - Parse JSON test results for failures
   - Collect error messages and stack traces
   - Identify common failure patterns
   - Document suggested fixes

2. **Extract Skipped Tests**:
   - Parse JSON results for skipped/pending tests
   - Capture skip reasons and todo descriptions
   - Assess impact of skipped functionality
   - Document when skipped tests should be addressed

3. **Analyze TypeScript Errors**:
   - Review typecheck-results.log for compilation issues
   - Categorize errors (syntax, type, import issues)
   - Prioritize fixes based on severity

### Phase 8: Update Linear Issue

**Using linear-expert Agent:**

1. **Document Test Results**:
   - Summary of all test executions with exit codes
   - Pass/fail status for each test category
   - **Detailed failed test analysis with error messages**
   - **Comprehensive skipped test report with reasons**
   - Performance metrics if applicable

2. **Update Issue Status**:
   - Add comprehensive testing comment with failure details
   - Move to "Ready for Documentation" if all tests pass
   - Flag any blocking issues requiring fixes with specific error details
   - Tag relevant team members for review
   - **Create follow-up tasks for failed test fixes if needed**

3. **Create Test Report**:

   ```
   Testing complete

   TypeScript: [PASS/FAIL]
   Unit: X/Y passing
   MCP accuracy: [PASS/FAIL]
   Tool parity: [PASS/FAIL]

   [IF FAILURES:]
   Failed: [test-name]
   Error: [brief error]
   Fix: [action needed]

   [IF SKIPPED:]
   Skipped: [test-name] - [reason]

   [Ready for documentation / Needs fixes]
   ```

## Output Format

```
## 🧪 Testing Phase Results - Issue $LINEAR_ISSUE_ID

### 📊 Test Execution Summary
[Automated test results with pass/fail counts and exit codes]

### ❌ Failed Tests (if any)
**Test Category**: [Unit/Integration/MCP-Specific]
- **Test Name**: [Specific test that failed]
- **Error**: [Brief failure description]
- **Stack Trace**: [Key error details]
- **Suggested Action**: [Investigation path or fix suggestion]

### ⏭️ Skipped Tests (if any)
**Test Category**: [Unit/Integration/MCP-Specific]
- **Test Name**: [Specific test that was skipped]
- **Skip Reason**: [Why test was skipped - pending, environment, etc.]
- **Impact Assessment**: [Risk of skipped functionality]
- **Resolution Timeline**: [When this should be addressed]

### 🔧 Manual Verification Status  
[Manual testing checklist results]

### 📋 Acceptance Criteria Validation
[Mapping of requirements to test coverage]

### ⚡ Performance Metrics
[Key performance indicators measured]

### 🚀 Next Steps
- Issue status updated in Linear with detailed failure/skip analysis
- Testing patterns stored in Serena MCP
- [IF ALL PASS] Ready for documentation phase: `07-document $LINEAR_ISSUE_ID`
- [IF FAILURES] Address blocking issues before proceeding

### 📝 Action Items for Failed/Skipped Tests
- [Specific tasks created for addressing test failures]
- [Timeline for resolving skipped test scenarios]

### 💾 Testing Insights Stored
[Key learnings captured for future testing cycles]
```

**Success Criteria:**

- All automated tests pass
- Manual verification complete
- Acceptance criteria validated
- Linear issue updated with comprehensive results
- Ready for documentation handoff

---

## Phase 8: Skip Testing (if Option 2 selected)

**When user selects Option 2 (No testing needed), execute this phase:**

### Update Linear with Skip Rationale

**Use `linear-expert` to document testing skip:**

```markdown
Testing skipped - {reason}
Type: {doc-only/config/trivial}
Risk: low

Ready for documentation
```

**Update Linear issue status:**

- Add comment with skip rationale
- Move status to "Ready for Documentation"
- Tag as appropriate for the change type

### Handoff to Documentation

**Output format when testing skipped:**

```
## ⏭️ Testing Phase Skipped for {LINEAR_ISSUE_ID}

### 📋 Skip Assessment
**Implementation Type**: {Type}
**Risk Level**: Low
**Testing Decision**: Automated tests not required

### ✅ Validation Completed
- Code review: PASSED
- TypeScript: CLEAN
- Manual verification: {PERFORMED/NOT REQUIRED}

### 🚀 Next Phase
**Ready for**: Documentation phase
**Linear Status**: Updated to "Ready for Documentation"

---
*Testing skipped - proceeding to documentation phase.*
```
