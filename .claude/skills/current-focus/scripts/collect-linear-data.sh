#!/bin/bash
# Collect Linear cycle and issue data
# Usage: ./collect-linear-data.sh [team-id] [cycle-type]

set -euo pipefail

TEAM_ID="${1:-d1aae15e-d5b9-418d-a951-adcf8c7e39a8}"
CYCLE_TYPE="${2:-current}"

echo "=== Linear Data Collection ===" >&2

# Phase A: Get Current Cycle
echo "Fetching cycle data..." >&2
CYCLE_JSON=$(mcp__linear-server__list_cycles team="$TEAM_ID" type="$CYCLE_TYPE" 2>/dev/null)

if [ -z "$CYCLE_JSON" ] || [ "$CYCLE_JSON" = "[]" ]; then
  echo "❌ Error: No $CYCLE_TYPE cycle found" >&2
  exit 1
fi

# Extract cycle metadata (CRITICAL: use ID, not cycle number!)
CYCLE_ID=$(echo "$CYCLE_JSON" | jq -r '.[0].id // empty')
CYCLE_NAME=$(echo "$CYCLE_JSON" | jq -r '.[0].title // empty')
CYCLE_START=$(echo "$CYCLE_JSON" | jq -r '.[0].startsAt // empty')
CYCLE_END=$(echo "$CYCLE_JSON" | jq -r '.[0].endsAt // empty')
COMPLETED_COUNT=$(echo "$CYCLE_JSON" | jq -r '.[0].completedIssueCountHistory[-1] // 0')
TOTAL_COUNT=$(echo "$CYCLE_JSON" | jq -r '.[0].issueCountHistory[-1] // 0')

# Validation
if [ -z "$CYCLE_ID" ]; then
  echo "❌ Error: Failed to extract cycle ID" >&2
  exit 1
fi

echo "Cycle: $CYCLE_NAME (ID: $CYCLE_ID)" >&2
echo "Progress: $COMPLETED_COUNT / $TOTAL_COUNT" >&2

# Phase B: Collect Issues (Token-Limited Queries)
echo "Fetching issues..." >&2

# Active Work (In Progress + In Review)
ACTIVE_JSON=$(mcp__linear-server__list_issues \
  team="$TEAM_ID" \
  state="In Progress" \
  limit=25 2>/dev/null || echo "[]")

REVIEW_JSON=$(mcp__linear-server__list_issues \
  team="$TEAM_ID" \
  state="In Review" \
  limit=25 2>/dev/null || echo "[]")

# Planned Work (Todo)
PLANNED_JSON=$(mcp__linear-server__list_issues \
  team="$TEAM_ID" \
  state="Todo" \
  limit=30 2>/dev/null || echo "[]")

# Recent Completions (Done in last 3 days)
DONE_JSON=$(mcp__linear-server__list_issues \
  team="$TEAM_ID" \
  state="Done" \
  updatedAt="-P3D" \
  limit=20 2>/dev/null || echo "[]")

# Phase C: Count and Validate
ACTIVE_COUNT=$(echo "$ACTIVE_JSON" | jq 'length')
REVIEW_COUNT=$(echo "$REVIEW_JSON" | jq 'length')
PLANNED_COUNT=$(echo "$PLANNED_JSON" | jq 'length')
DONE_COUNT=$(echo "$DONE_JSON" | jq 'length')
TOTAL_ISSUES=$((ACTIVE_COUNT + REVIEW_COUNT + PLANNED_COUNT + DONE_COUNT))

echo "Active Issues: $ACTIVE_COUNT" >&2
echo "In Review: $REVIEW_COUNT" >&2
echo "Planned Issues: $PLANNED_COUNT" >&2
echo "Recent Completions: $DONE_COUNT" >&2
echo "Total Issues: $TOTAL_ISSUES" >&2

# Warn if suspiciously low
if [ "$TOTAL_ISSUES" -lt 3 ]; then
  echo "⚠️ Warning: Only $TOTAL_ISSUES issues found (expected 10+)" >&2
fi

# Output complete JSON
jq -n \
  --argjson cycle "$CYCLE_JSON" \
  --argjson active "$ACTIVE_JSON" \
  --argjson review "$REVIEW_JSON" \
  --argjson planned "$PLANNED_JSON" \
  --argjson done "$DONE_JSON" \
  '{
    cycle: $cycle[0],
    issues: {
      active: $active,
      review: $review,
      planned: $planned,
      done: $done
    },
    counts: {
      active: ($active | length),
      review: ($review | length),
      planned: ($planned | length),
      done: ($done | length),
      total: (($active | length) + ($review | length) + ($planned | length) + ($done | length))
    }
  }'
