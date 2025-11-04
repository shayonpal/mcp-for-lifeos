#!/bin/bash
# Analyze git history for commits and Linear references
# Usage: ./analyze-git-history.sh [project-dir] [days-back]

set -euo pipefail

PROJECT_DIR="${1:-/Users/shayon/DevProjects/mcp-for-lifeos}"
DAYS_BACK="${2:-3}"

echo "=== Git History Analysis ===" >&2

cd "$PROJECT_DIR" || exit 1

# Current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current Branch: $CURRENT_BRANCH" >&2

# Recent commits (non-merge)
echo "Fetching recent commits..." >&2
COMMITS_JSON=$(git log --since="$DAYS_BACK days ago" \
  --no-merges \
  --pretty=format:'{"hash":"%H","author":"%an","date":"%ar","message":"%s"}' \
  | jq -s '.')

COMMIT_COUNT=$(echo "$COMMITS_JSON" | jq 'length')
echo "Recent Commits: $COMMIT_COUNT" >&2

# Merge commits (for PR tracking)
echo "Fetching merge commits..." >&2
MERGES_JSON=$(git log --since="$DAYS_BACK days ago" \
  --merges \
  --pretty=format:'{"hash":"%H","author":"%an","date":"%ar","message":"%s"}' \
  | jq -s '.')

MERGE_COUNT=$(echo "$MERGES_JSON" | jq 'length')
echo "Merge Commits: $MERGE_COUNT" >&2

# Extract Linear issue references (MCP-XXX pattern)
LINEAR_REFS=$(git log --since="$DAYS_BACK days ago" \
  --pretty=format:'%s %b' \
  | grep -oE 'MCP-[0-9]+' \
  | sort -u \
  | jq -R . | jq -s '.')

LINEAR_REF_COUNT=$(echo "$LINEAR_REFS" | jq 'length')
echo "Linear References: $LINEAR_REF_COUNT" >&2

if [ "$LINEAR_REF_COUNT" -gt 0 ]; then
  echo "  Issues: $(echo "$LINEAR_REFS" | jq -r '.[]' | tr '\n' ', ' | sed 's/,$//')" >&2
fi

# Extract PR references from merge commits
PR_REFS=$(echo "$MERGES_JSON" | jq -r '.[].message' \
  | grep -oE '#[0-9]+' \
  | sort -u \
  | jq -R . | jq -s '.')

PR_REF_COUNT=$(echo "$PR_REFS" | jq 'length')
echo "PR References: $PR_REF_COUNT" >&2

# Output complete JSON
jq -n \
  --arg branch "$CURRENT_BRANCH" \
  --argjson commits "$COMMITS_JSON" \
  --argjson merges "$MERGES_JSON" \
  --argjson linear_refs "$LINEAR_REFS" \
  --argjson pr_refs "$PR_REFS" \
  '{
    branch: $branch,
    commits: $commits,
    merges: $merges,
    references: {
      linear: $linear_refs,
      prs: $pr_refs
    },
    counts: {
      commits: ($commits | length),
      merges: ($merges | length),
      linear_refs: ($linear_refs | length),
      pr_refs: ($pr_refs | length)
    }
  }'
