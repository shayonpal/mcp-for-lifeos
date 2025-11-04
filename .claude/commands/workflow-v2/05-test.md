---
name: 05-test
version: 2.0.0
description: Auto-detecting test phase with smart skip logic
author: Shayon Pal
tags: [workflow-v2, testing, automation]
argument_hint: <linear-issue-id>
---

# Test - Auto-Detecting Test Phase

Automatically detects whether tests are needed based on file changes. Smart skip for documentation-only changes.

## Instructions

### Load Shared Utilities & Read State

```bash
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/agent-utils.md
source .claude/commands/workflow-v2/_shared/state-utils.md
source .claude/commands/workflow-v2/_shared/output-templates.md

ISSUE_ID="${ARGUMENTS:-$(read_workflow_state 'current_issue')}"
BRANCH=$(read_workflow_state "branch_name")

phase_header "Testing Phase" "Auto-detecting test requirements for $ISSUE_ID"

write_workflow_state "current_phase" "test"
```

### Phase 1: Auto-Detect Test Necessity

```bash
echo "🔍 Analyzing changes to determine test requirements..."

# Get list of changed files
CHANGED_FILES=$(git diff --name-only $WORKFLOW_DEFAULT_BRANCH...HEAD)

# Categorize changes
TS_FILES=$(echo "$CHANGED_FILES" | grep -E '\.ts$' | grep -v '\.test\.ts$' | wc -l)
TEST_FILES=$(echo "$CHANGED_FILES" | grep -E '\.test\.ts$' | wc -l)
DOC_FILES=$(echo "$CHANGED_FILES" | grep -E '\.(md|json)$' | wc -l)
TOTAL_FILES=$(echo "$CHANGED_FILES" | wc -l)

echo "📊 Change Analysis:"
echo "  - TypeScript files: $TS_FILES"
echo "  - Test files: $TEST_FILES"
echo "  - Documentation/config: $DOC_FILES"
echo "  - Total files: $TOTAL_FILES"
echo ""

# Auto-decision logic (Quick Win #3)
if [ "$TS_FILES" -eq 0 ] && [ "$DOC_FILES" -gt 0 ]; then
  # Documentation-only changes - auto-skip
  echo "✅ AUTO-DECISION: Documentation-only changes detected"
  echo "   Skipping tests automatically (no source code changes)"
  echo ""

  write_workflow_state "test_status" "skipped-auto"
  write_workflow_state "validation_results.tests" "skip"

  mark_phase_complete "test"

  success_output \
    "Testing Phase (Skipped)" \
    "Documentation-only changes detected - tests skipped automatically" \
    "Next: /workflow-v2:06-document"

  show_workflow_status
  exit 0

elif [ "$TS_FILES" -gt 0 ]; then
  # Source code changes - auto-run tests
  echo "✅ AUTO-DECISION: Source code changes detected"
  echo "   Running tests automatically"
  echo ""
  RUN_TESTS=true

else
  # Ambiguous case - ask user
  checkpoint_output \
    "Test Decision Required" \
    "Changes: $TEST_FILES test files, $DOC_FILES doc files\nNo obvious source code changes" \
    "Run tests? (yes/no)"

  # Wait for user input
  # Set RUN_TESTS based on response
fi
```

### Phase 2: Execute Tests (if needed)

```bash
if [ "$RUN_TESTS" = true ]; then
  echo "🧪 Running test suite..."
  echo ""

  # TypeScript validation
  echo "1️⃣ TypeScript validation..."
  npm run typecheck
  TYPECHECK_RESULT=$?

  # Build verification
  echo "2️⃣ Build verification..."
  npm run build
  BUILD_RESULT=$?

  # Test execution
  echo "3️⃣ Test suite..."
  npm test
  TEST_RESULT=$?

  # Store validation results
  write_workflow_state "validation_results.typecheck" "$([ $TYPECHECK_RESULT -eq 0 ] && echo 'pass' || echo 'fail')"
  write_workflow_state "validation_results.build" "$([ $BUILD_RESULT -eq 0 ] && echo 'pass' || echo 'fail')"
  write_workflow_state "validation_results.tests" "$([ $TEST_RESULT -eq 0 ] && echo 'pass' || echo 'fail')"

  # Validate all passed
  if [ $TYPECHECK_RESULT -eq 0 ] && [ $BUILD_RESULT -eq 0 ] && [ $TEST_RESULT -eq 0 ]; then
    write_workflow_state "test_status" "passed"

    validation_results \
      "typecheck:pass:No errors" \
      "build:pass:Successful" \
      "tests:pass:All passing"

    mark_phase_complete "test"

    success_output \
      "Testing Phase" \
      "All validation checks passed" \
      "Next: /workflow-v2:06-document"

  else
    write_workflow_state "test_status" "failed"

    validation_results \
      "typecheck:$([ $TYPECHECK_RESULT -eq 0 ] && echo 'pass' || echo 'fail'):" \
      "build:$([ $BUILD_RESULT -eq 0 ] && echo 'pass' || echo 'fail'):" \
      "tests:$([ $TEST_RESULT -eq 0 ] && echo 'pass' || echo 'fail'):"

    error_output \
      "Test Failures Detected" \
      "One or more validation checks failed" \
      "1. Review errors above\n2. Fix issues\n3. Re-run: /workflow-v2:05-test"

    exit 1
  fi
fi

show_workflow_status
```

## Key Improvements from v1

1. **Auto-Skip Logic**: Documentation-only changes skip tests automatically (Quick Win #3)
2. **Smart Detection**: Analyzes git diff to determine test necessity
3. **No Manual Assessment**: Removes 40+ lines of manual decision logic
4. **State Integration**: Stores test results for other commands to reference
5. **Fast Path**: Doc changes skip in <1 second vs 2-3 minutes of test execution

## Decision Matrix

| Change Type | Files | Decision |
|-------------|-------|----------|
| Docs only | `*.md`, `*.json` | AUTO-SKIP |
| Source code | `src/**/*.ts` | AUTO-RUN |
| Tests only | `*.test.ts` | ASK USER |
| Config only | `tsconfig.json`, `package.json` | ASK USER |
| Mixed | Various | ASK USER |

## Output Format

### Documentation-only (auto-skip)

```
════════════════════════════════════════════
  Testing Phase
════════════════════════════════════════════

🔍 Analyzing changes...
📊 Change Analysis:
  - TypeScript files: 0
  - Test files: 0
  - Documentation/config: 3
  - Total files: 3

✅ AUTO-DECISION: Documentation-only changes detected
   Skipping tests automatically

╔════════════════════════════════════════════╗
║  ✅ Testing Phase (Skipped) Complete       ║
╚════════════════════════════════════════════╝

### 💡 Next Steps
Next: /workflow-v2:06-document
```

### Source code changes (auto-run)

```
✅ AUTO-DECISION: Source code changes detected
   Running tests automatically

🧪 Running test suite...

1️⃣ TypeScript validation... ✅
2️⃣ Build verification... ✅
3️⃣ Test suite... ✅

### 🔍 Validation Results

- ✅ typecheck: Passed
- ✅ build: Passed
- ✅ tests: Passed

╔════════════════════════════════════════════╗
║  ✅ Testing Phase Complete                  ║
╚════════════════════════════════════════════╝
```
