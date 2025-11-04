---
name: cleanup
version: 1.0.0
description: Clean up feature branch after PR merge
author: Shayon Pal
tags: [workflow, implement, cleanup, git]
argument_hint: <linear-issue-id|branch-name> [--force]
env:
  PROJECT_ROOT: /Users/shayon/DevProjects/mcp-for-lifeos
---

# Implement Cleanup - Branch Cleanup After PR Merge

Safely clean up feature branch after PR has been merged. Verifies PR merge status, deletes branches, and optionally restores stashed changes.

## Help Mode

If user provides `--help` or `help` parameter, display this usage guide:

```
/implement/cleanup - Clean up feature branch after PR merge

USAGE:
  /implement/cleanup <linear-issue-id>           Clean up by issue ID
  /implement/cleanup <branch-name>               Clean up by branch name
  /implement/cleanup <issue-id> --force          Force cleanup without PR verification
  /implement/cleanup --list                      List feature branches
  /implement/cleanup help                        Show this help

DESCRIPTION:
  Safely removes feature branch after verifying PR is merged.

  Cleanup steps:
  1. Verify PR merge status (unless --force)
  2. Switch to master branch
  3. Pull latest changes
  4. Delete local feature branch
  5. Optionally delete remote branch
  6. Optionally restore stashed changes

EXAMPLES:
  /implement/cleanup MCP-123
  /implement/cleanup feature/MCP-123-add-search
  /implement/cleanup MCP-123 --force

FLAGS:
  --force    Skip PR merge verification
  --list     Show all feature branches
```

## Instructions

### Phase 0: Validation and Mode Detection

**Parse arguments:**

```bash
# Check for special modes
if echo "$ARGUMENTS" | grep -qE '^(help|--help|-h)$'; then
  # Help mode shown above
  exit 0
fi

if echo "$ARGUMENTS" | grep -qE '^(--list|-l|list)$'; then
  # List mode - show all feature branches
  LIST_MODE=true
else
  LIST_MODE=false
fi

# Extract issue ID or branch name and flags
ISSUE_ID=$(echo "$ARGUMENTS" | grep -oE '[A-Z]+-[0-9]+' | head -1)
BRANCH_NAME=$(echo "$ARGUMENTS" | grep -oE 'feature/[a-zA-Z0-9_-]+|bugfix/[a-zA-Z0-9_-]+|hotfix/[a-zA-Z0-9_-]+' | head -1)
FORCE_MODE=false

if echo "$ARGUMENTS" | grep -qE '(--force|-f)'; then
  FORCE_MODE=true
fi
```

### Phase 1: List Mode (if --list)

**If LIST_MODE is true, display all feature branches:**

```bash
if [ "$LIST_MODE" = true ]; then
  cd "$PROJECT_ROOT"

  echo "╔════════════════════════════════════════════╗"
  echo "║  🌿 Feature Branches                       ║"
  echo "╚════════════════════════════════════════════╝"
  echo ""

  # Show local feature branches
  echo "📍 Local branches:"
  git branch | grep -E 'feature/|bugfix/|hotfix/' || echo "  (none)"

  echo ""
  echo "🌐 Remote branches:"
  git branch -r | grep -E 'origin/(feature/|bugfix/|hotfix/)' | sed 's/origin\//  /' || echo "  (none)"

  echo ""
  echo "Cleanup: /implement/cleanup <issue-id|branch-name>"
  exit 0
fi
```

### Phase 2: Resolve Branch Name

**If issue ID provided, infer branch name:**

```bash
cd "$PROJECT_ROOT"

if [ -n "$ISSUE_ID" ] && [ -z "$BRANCH_NAME" ]; then
  echo "🔍 Looking for branch matching issue: $ISSUE_ID"

  # Search local and remote branches for matching issue ID
  FOUND_BRANCH=$(git branch -a | grep -E "feature/.*$ISSUE_ID|bugfix/.*$ISSUE_ID|hotfix/.*$ISSUE_ID" | head -1 | sed 's/^[ *]*//' | sed 's/remotes\/origin\///')

  if [ -n "$FOUND_BRANCH" ]; then
    BRANCH_NAME="$FOUND_BRANCH"
    echo "✅ Found branch: $BRANCH_NAME"
  else
    echo "❌ Error: No branch found matching issue $ISSUE_ID"
    echo ""
    echo "Available branches:"
    git branch -a | grep -E 'feature/|bugfix/|hotfix/' | head -10
    exit 1
  fi
elif [ -z "$BRANCH_NAME" ]; then
  echo "❌ Error: Issue ID or branch name required"
  echo ""
  echo "Usage: /implement/cleanup <linear-issue-id|branch-name>"
  echo "Example: /implement/cleanup MCP-123"
  echo "Example: /implement/cleanup feature/MCP-123-add-search"
  exit 1
fi

echo "🧹 Cleaning up branch: $BRANCH_NAME"
```

### Phase 3: PR Verification (unless --force)

**Find and verify PR status:**

```bash
if [ "$FORCE_MODE" = true ]; then
  echo "⚠️  Force mode enabled - skipping PR verification"
else
  echo "🔍 Verifying PR merge status..."

  # Try to find PR for this branch
  PR_NUMBER=$(gh pr list --state all --head "$BRANCH_NAME" --json number --jq '.[0].number' 2>/dev/null)

  if [ -z "$PR_NUMBER" ]; then
    echo "⚠️  Warning: No PR found for branch $BRANCH_NAME"
    echo ""

    # Use AskUserQuestion tool:
    # Question: "No PR found for this branch. Proceed with cleanup?"
    # Options:
    #   - "Proceed with cleanup" (description: Delete branch anyway)
    #   - "Cancel cleanup" (description: Keep branch for now)
    # If "Cancel cleanup" selected:
    #   echo "❌ Cleanup cancelled"
    #   echo "To force cleanup: /implement/cleanup $BRANCH_NAME --force"
    #   exit 1
  else
    # Check PR status
    PR_STATE=$(gh pr view "$PR_NUMBER" --json state --jq .state 2>/dev/null)

    if [ "$PR_STATE" = "MERGED" ]; then
      echo "✅ PR #$PR_NUMBER is merged - safe to clean up"
    else
      echo "⚠️  Warning: PR #$PR_NUMBER is not merged (status: $PR_STATE)"

      PR_URL=$(gh pr view "$PR_NUMBER" --json url --jq .url 2>/dev/null)
      echo "   PR URL: $PR_URL"
      echo ""
      echo "Cleanup will delete the branch permanently."

      # Use AskUserQuestion tool:
      # Question: "PR is not merged. Delete branch anyway?"
      # Options:
      #   - "Cancel cleanup" (description: Keep branch until PR is merged)
      #   - "Force cleanup" (description: Delete branch despite unmerged PR)
      # If "Cancel cleanup" selected:
      #   echo "❌ Cleanup cancelled"
      #   echo ""
      #   echo "To force cleanup: /implement/cleanup $BRANCH_NAME --force"
      #   exit 1
    fi
  fi
fi
```

Use `AskUserQuestion` tool for no PR found:

```json
{
  "questions": [{
    "question": "No PR found for this branch. Proceed with cleanup anyway?",
    "header": "No PR Found",
    "multiSelect": false,
    "options": [
      {
        "label": "Proceed with cleanup",
        "description": "Delete branch even without PR verification"
      },
      {
        "label": "Cancel cleanup",
        "description": "Keep branch for now"
      }
    ]
  }]
}
```

Use `AskUserQuestion` tool for unmerged PR:

```json
{
  "questions": [{
    "question": "PR is not merged. Delete branch anyway?",
    "header": "Unmerged PR",
    "multiSelect": false,
    "options": [
      {
        "label": "Cancel cleanup",
        "description": "Keep branch until PR is merged"
      },
      {
        "label": "Force cleanup",
        "description": "Delete branch despite unmerged PR"
      }
    ]
  }]
}
```

### Phase 4: Final Confirmation

**Ask for final confirmation before deletion:**

```bash
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  ⚠️  Final Confirmation                    ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "This will permanently delete:"
echo "   🌿 Local branch: $BRANCH_NAME"
echo "   🌐 Remote branch: origin/$BRANCH_NAME (if confirmed)"
echo ""
```

Use `AskUserQuestion` tool:

```json
{
  "questions": [{
    "question": "Are you absolutely sure you want to delete this branch?",
    "header": "Final Confirm",
    "multiSelect": false,
    "options": [
      {
        "label": "Yes, delete it",
        "description": "Permanently remove local and remote branch"
      },
      {
        "label": "No, cancel",
        "description": "Abort cleanup operation"
      }
    ]
  }]
}
```

If "No, cancel" selected:
```bash
echo "❌ Cleanup cancelled"
exit 0
```

### Phase 5: Switch to Master

**Delegate branch switch to git-expert agent:**

Use the `Task` tool with `subagent_type: git-expert`:

```
Task: Switch to master branch and update

Context:
- Working directory: $PROJECT_ROOT
- Current branch: $BRANCH_NAME (to be deleted)
- Target branch: master

Please:
1. Checkout master branch
2. Pull latest changes from origin/master
3. Verify successful switch

Expected:
- Currently on master branch
- Up to date with origin/master
```

**After git-expert completes:**

```bash
echo "✅ Switched to master branch"
git branch --show-current
```

### Phase 6: Delete Local Branch

**Delegate local branch deletion to git-expert agent:**

Use the `Task` tool with `subagent_type: git-expert`:

```
Task: Delete local feature branch

Context:
- Branch to delete: $BRANCH_NAME
- Force delete: true (use -D flag)

Please:
1. Delete local branch: $BRANCH_NAME (force delete with -D)
2. Handle if branch doesn't exist (already deleted)

Expected:
- Local branch deleted or confirmed already gone
```

**After git-expert completes:**

```bash
echo "✅ Local branch deleted: $BRANCH_NAME"
```

### Phase 7: Delete Remote Branch (optional)

**Check if remote branch exists and ask user:**

```bash
# Check if remote branch exists
REMOTE_EXISTS=$(git branch -r | grep "origin/$BRANCH_NAME" || echo "")

if [ -n "$REMOTE_EXISTS" ]; then
  echo ""
  echo "🌐 Remote branch exists: origin/$BRANCH_NAME"

  # Use AskUserQuestion tool
  # If "Delete remote" selected:
  #   Use git-expert agent to delete remote branch
  # If "Keep remote" selected:
  #   echo "ℹ️  Remote branch preserved: origin/$BRANCH_NAME"
else
  echo "ℹ️  Remote branch not found (may have been auto-deleted by GitHub)"
fi
```

Use `AskUserQuestion` tool:

```json
{
  "questions": [{
    "question": "Delete remote branch from origin?",
    "header": "Remote Branch",
    "multiSelect": false,
    "options": [
      {
        "label": "Delete remote",
        "description": "Remove branch from GitHub"
      },
      {
        "label": "Keep remote",
        "description": "Preserve branch on origin"
      }
    ]
  }]
}
```

If "Delete remote" selected, delegate to git-expert:

```
Task: Delete remote feature branch

Context:
- Remote branch: origin/$BRANCH_NAME

Please:
1. Delete remote branch: origin/$BRANCH_NAME
2. Handle if branch doesn't exist

Expected:
- Remote branch deleted or confirmed already gone
```

### Phase 8: Restore Stash (if exists)

**Check for stashed changes from /implement/start:**

```bash
echo ""
echo "🔍 Checking for stashed changes..."

# Look for stash matching the issue ID or branch name
STASH_LIST=$(git stash list | grep -E "implement-start:.*$ISSUE_ID|implement-start:.*$BRANCH_NAME" || echo "")

if [ -n "$STASH_LIST" ]; then
  echo "📦 Found stashed changes:"
  echo "$STASH_LIST"
  echo ""

  # Extract stash reference (e.g., stash@{0})
  STASH_REF=$(echo "$STASH_LIST" | head -1 | grep -oE 'stash@\{[0-9]+\}')

  # Get stash date
  STASH_DATE=$(git stash list | grep "$STASH_REF" | sed 's/.*: //')

  # Use AskUserQuestion tool
else
  echo "ℹ️  No stashed changes found for this issue"
fi
```

Use `AskUserQuestion` tool if stash found:

```json
{
  "questions": [{
    "question": "Stashed changes found from this workflow. What would you like to do?",
    "header": "Stash Found",
    "multiSelect": false,
    "options": [
      {
        "label": "Restore stash",
        "description": "Apply stashed changes to current branch (master)"
      },
      {
        "label": "Drop stash",
        "description": "Permanently delete the stashed changes"
      },
      {
        "label": "Keep stash",
        "description": "Leave stash for later manual handling"
      }
    ]
  }]
}
```

**Handle stash based on response:**

```bash
# If "Restore stash":
git stash pop "$STASH_REF"
echo "✅ Stash restored"

# If "Drop stash":
git stash drop "$STASH_REF"
echo "✅ Stash dropped"

# If "Keep stash":
echo "ℹ️  Stash preserved: $STASH_REF"
echo "   To restore later: git stash pop $STASH_REF"
```

### Phase 9: Completion Summary

**Display cleanup summary:**

```
╔════════════════════════════════════════════╗
║  ✅ Cleanup Complete                       ║
╚════════════════════════════════════════════╝

🗑️  Removed:
   - Local branch: $BRANCH_NAME
   - Remote branch: [deleted/preserved/not found]

📍 Current Status:
   Branch: master (up to date)
   Issue: $ISSUE_ID
   PR: #$PR_NUMBER (merged)
   Stash: [restored/dropped/kept/not found]

💡 Next Steps:
   - Verify cleanup: git branch -a
   - View remaining branches: /implement/cleanup --list
   - Start new work: /implement/start <issue-id>
```

## Error Recovery

**If cleanup fails:**

1. **PR verification failure**:
   - Check: `gh pr list --head $BRANCH_NAME`
   - Manual: View PR on GitHub
   - Override: Use `--force` flag

2. **Branch switch failure**:
   - Check: `git status` for uncommitted changes
   - Stash or commit changes first
   - Retry: `git checkout master`

3. **Branch deletion failure**:
   - Check: Is branch current? (can't delete current branch)
   - Check: Unmerged commits? (use -D to force)
   - Manual: `git branch -D $BRANCH_NAME`

4. **Remote deletion failure**:
   - Check: Network connection
   - Check: Permissions on repository
   - Manual: `git push origin --delete $BRANCH_NAME`

5. **Stash restoration failure**:
   - Check: Merge conflicts
   - Resolve conflicts manually
   - Or: `git stash drop` to discard

**Manual cleanup commands:**

```bash
# Switch to master
git checkout master
git pull origin master

# Delete local branch
git branch -D feature/MCP-123-add-search

# Delete remote branch
git push origin --delete feature/MCP-123-add-search

# List stashes
git stash list

# Restore specific stash
git stash pop stash@{0}

# Drop specific stash
git stash drop stash@{0}
```

## Important Notes

- **Safety First**: Always verifies PR merge status (unless --force)
- **Interactive Questions**: Uses AskUserQuestion tool for all confirmations
- **Git Operations**: Delegated to git-expert agent for safety
- **Stash Support**: Can restore changes stashed during /implement/start
- **Force Mode**: Use `--force` to skip PR verification (dangerous)
- **List Mode**: Use `--list` to see all feature branches
- **Flexible Input**: Accepts issue ID or branch name
- **Environment Variables**: Uses $PROJECT_ROOT for path references
- **Branch Management**: Handles local and remote branch cleanup
- **PR Verification**: Checks merge status before deletion
