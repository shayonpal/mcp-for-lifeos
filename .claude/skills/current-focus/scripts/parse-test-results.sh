#!/bin/bash
# Parse npm test output for pass/fail counts and timing
# Usage: ./parse-test-results.sh [project-dir]

set -euo pipefail

PROJECT_DIR="${1:-/Users/shayon/DevProjects/mcp-for-lifeos}"

echo "=== Test Suite Execution ===" >&2

cd "$PROJECT_DIR" || exit 1

# Run npm test and capture output
echo "Running npm test..." >&2
TEST_OUTPUT=$(npm test 2>&1 || true)

# Extract summary line (last few lines typically contain summary)
SUMMARY=$(echo "$TEST_OUTPUT" | tail -10)

# Parse test counts
PASSING=$(echo "$SUMMARY" | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo "0")
TOTAL=$(echo "$SUMMARY" | grep -oE 'Tests:.*total' | grep -oE '[0-9]+ total' | grep -oE '[0-9]+' || echo "0")
SKIPPED=$(echo "$SUMMARY" | grep -oE '[0-9]+ skipped' | grep -oE '[0-9]+' || echo "0")
FAILED=$(echo "$SUMMARY" | grep -oE '[0-9]+ failed' | grep -oE '[0-9]+' || echo "0")

# Parse test suites
TEST_SUITES=$(echo "$SUMMARY" | grep -oE 'Test Suites:.*passed' | grep -oE '[0-9]+ passed' | grep -oE '[0-9]+' || echo "0")

# Parse duration
DURATION=$(echo "$SUMMARY" | grep -oE 'Time: *[0-9]+\.[0-9]+' | grep -oE '[0-9]+\.[0-9]+' || echo "0")

# Calculate pass rate
if [ "$TOTAL" -gt 0 ]; then
  PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSING / $TOTAL) * 100}")
else
  PASS_RATE="0.0"
fi

echo "Passing: $PASSING / $TOTAL ($PASS_RATE%)" >&2
echo "Skipped: $SKIPPED" >&2
echo "Failed: $FAILED" >&2
echo "Test Suites: $TEST_SUITES" >&2
echo "Duration: ${DURATION}s" >&2

# Extract failing test names (if any)
FAILING_TESTS="[]"
if [ "$FAILED" -gt 0 ]; then
  echo "Extracting failing test names..." >&2
  FAILING_TESTS=$(echo "$TEST_OUTPUT" \
    | grep -A 2 "FAIL " \
    | grep "●" \
    | sed 's/^[[:space:]]*●[[:space:]]*//' \
    | jq -R . | jq -s '.')
fi

# Output complete JSON
jq -n \
  --arg passing "$PASSING" \
  --arg total "$TOTAL" \
  --arg skipped "$SKIPPED" \
  --arg failed "$FAILED" \
  --arg suites "$TEST_SUITES" \
  --arg duration "$DURATION" \
  --arg pass_rate "$PASS_RATE" \
  --argjson failing_tests "$FAILING_TESTS" \
  '{
    passing: ($passing | tonumber),
    total: ($total | tonumber),
    skipped: ($skipped | tonumber),
    failed: ($failed | tonumber),
    test_suites: ($suites | tonumber),
    duration: $duration,
    pass_rate: ($pass_rate | tonumber),
    failing_tests: $failing_tests,
    status: (if ($failed | tonumber) > 0 then "failing" else "passing" end)
  }'
