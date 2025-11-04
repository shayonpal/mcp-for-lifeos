---
name: cleanup
version: 1.0.0
description: Remove worktree after PR is merged
author: Shayon Pal
tags: [workflow, worktree, cleanup, git]
argument_hint: <linear-issue-id> [--force]
env:
  PROJECT_ROOT: /Users/shayon/DevProjects/mcp-for-lifeos
---

# Worktree Cleanup - Safe Worktree Removal

Safely remove git worktree after PR has been merged. Verifies PR merge status before deletion to prevent accidental data loss.

## Help Mode

If user provides `--help` or `help` parameter, display this usage guide:

```
/worktree/cleanup - Remove worktree after PR merge

USAGE:
  /worktree/cleanup <linear-issue-id>          Remove worktree (checks PR merged)
  /worktree/cleanup <linear-issue-id> --force  Remove without PR verification
  /worktree/cleanup --list                     List all tracked worktrees
  /worktree/cleanup help                       Show this help

DESCRIPTION:
  Safely removes git worktree after verifying PR is merged.

  Safety checks:
  - Verifies worktree exists in registry
  - Checks if PR is merged (unless --force)
  - Confirms before deletion
  - Updates registry

  Worktree location: ../worktrees/[branch-name]/

EXAMPLES:
  /worktree/cleanup MCP-123
  /worktree/cleanup MCP-123 --force
  /worktree/cleanup --list

FLAGS:
  --force    Skip PR merge verification
  --list     Show all tracked worktrees
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
  # List mode - show all worktrees
  LIST_MODE=true
else
  LIST_MODE=false
fi

# Extract issue ID and flags
ISSUE_ID=$(echo "$ARGUMENTS" | grep -oE '[A-Z]+-[0-9]+' | head -1)
FORCE_MODE=false

if echo "$ARGUMENTS" | grep -qE '(--force|-f)'; then
  FORCE_MODE=true
fi
```

### Phase 1: List Mode (if --list)

**If LIST_MODE is true, display all tracked worktrees:**

Use the registry helper script:

```bash
if [ "$LIST_MODE" = true ]; then
  cd "$PROJECT_ROOT"
  node scripts/worktree-registry.js list
  exit 0
fi
```

### Phase 2: Validation (Cleanup Mode)

**Validate issue ID provided:**

```bash
if [ -z "$ISSUE_ID" ]; then
  echo "❌ Error: Linear issue ID required"
  echo ""
  echo "Usage: /worktree/cleanup <linear-issue-id>"
  echo "Example: /worktree/cleanup MCP-123"
  echo ""
  echo "To see all worktrees: /worktree/cleanup --list"
  exit 1
fi

echo "🧹 Cleaning up worktree for issue: $ISSUE_ID"
```

### Phase 3: Registry Lookup

**Read registry and find worktree by issue ID:**

Use the registry helper script:

```bash
cd "$PROJECT_ROOT"

# Find worktree by issue ID (outputs JSON)
WORKTREE_JSON=$(node scripts/worktree-registry.js find "$ISSUE_ID" 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "❌ Error: Worktree not found in registry"
  echo "   Issue: $ISSUE_ID"
  echo ""
  node scripts/worktree-registry.js list
  exit 1
fi

# Parse JSON to extract fields (using basic grep/sed or read into variables)
# For bash compatibility, we'll parse the JSON output
BRANCH_NAME=$(echo "$WORKTREE_JSON" | grep '"branchName"' | sed 's/.*: "\(.*\)".*/\1/')
WORKTREE_PATH=$(echo "$WORKTREE_JSON" | grep '"path"' | sed 's/.*: "\(.*\)".*/\1/')
PR_NUMBER=$(echo "$WORKTREE_JSON" | grep '"prNumber"' | sed 's/.*: \(.*\),/\1/')
PR_URL=$(echo "$WORKTREE_JSON" | grep '"prUrl"' | sed 's/.*: "\(.*\)".*/\1/')

echo "📋 Worktree found:"
echo "   Issue: $ISSUE_ID"
echo "   Branch: $BRANCH_NAME"
echo "   Path: $WORKTREE_PATH"
echo "   PR: #$PR_NUMBER"
```

### Phase 4: PR Merge Verification

**Verify PR is merged (unless --force):**

```bash
if [ "$FORCE_MODE" = true ]; then
  echo "⚠️  Force mode enabled - skipping PR verification"
else
  echo "🔍 Verifying PR merge status..."

  # Check PR status using gh CLI
  PR_STATE=$(gh pr view "$PR_NUMBER" --json state --jq .state 2>/dev/null)

  if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Could not fetch PR status"
    echo "   PR may have been deleted or gh CLI not authenticated"

    # Use AskUserQuestion tool with:
    # Question: "Could not verify PR status. Proceed with cleanup anyway?"
    # Options: "Proceed with cleanup", "Cancel cleanup"
    # If "Cancel cleanup" selected, exit 1
  else
    if [ "$PR_STATE" = "MERGED" ]; then
      echo "✅ PR is merged - safe to clean up"
    else
      echo "⚠️  Warning: PR is not merged (status: $PR_STATE)"
      echo "   PR URL: $PR_URL"
      echo ""
      echo "Cleanup will delete the worktree and all uncommitted changes."

      # Use AskUserQuestion tool:
      # Question: "PR is not merged. Delete worktree anyway?"
      # Options:
      #   - "Cancel cleanup" (description: Keep worktree until PR is merged)
      #   - "Force cleanup" (description: Delete worktree despite unmerged PR)
      # If "Cancel cleanup" selected:
      #   echo "To force cleanup: /worktree/cleanup $ISSUE_ID --force"
      #   exit 1
    fi
  fi
fi
```

### Phase 5: Worktree Existence Check

**Verify worktree still exists:**

```bash
if [ ! -d "$WORKTREE_PATH" ]; then
  echo "⚠️  Warning: Worktree directory not found at: $WORKTREE_PATH"
  echo "   The worktree may have been manually deleted"

  # Use AskUserQuestion tool:
  # Question: "Worktree directory not found. Remove from registry anyway?"
  # Options:
  #   - "Remove from registry" (description: Clean up registry entry)
  #   - "Cancel cleanup" (description: Keep registry entry)
  # If "Remove from registry" selected:
  #   WORKTREE_ALREADY_DELETED=true (skip to Phase 8)
  # If "Cancel cleanup" selected:
  #   exit 1

  WORKTREE_ALREADY_DELETED=true  # Set based on AskUserQuestion response
else
  WORKTREE_ALREADY_DELETED=false
fi
```

### Phase 6: Final Confirmation

**Ask for final confirmation before deletion:**

```bash
if [ "$WORKTREE_ALREADY_DELETED" = false ]; then
  echo ""
  echo "╔════════════════════════════════════════════╗"
  echo "║  ⚠️  Final Confirmation                    ║"
  echo "╚════════════════════════════════════════════╝"
  echo ""
  echo "This will permanently delete:"
  echo "   📁 Worktree: $WORKTREE_PATH"
  echo "   🌿 Branch: $BRANCH_NAME (local and remote)"

  # Use AskUserQuestion tool:
  # Question: "Are you absolutely sure you want to delete this worktree?"
  # Options:
  #   - "Yes, delete it" (description: Permanently remove worktree and branches)
  #   - "No, cancel" (description: Abort cleanup operation)
  # If "No, cancel" selected:
  #   echo "❌ Cleanup cancelled"
  #   exit 0
fi
```

### Phase 7: Remove Worktree

**Remove git worktree (delegated to git-expert):**

```bash
if [ "$WORKTREE_ALREADY_DELETED" = false ]; then
  echo ""
  echo "🗑️  Removing worktree..."

  # Use git-expert agent to safely remove worktree
  # Task: "Remove git worktree at $WORKTREE_PATH with --force flag"
  # If git worktree remove fails, fallback to manual deletion:
  #   rm -rf "$WORKTREE_PATH"

  echo "✅ Worktree removed"
fi
```

### Phase 8: Delete Local Branch

**Delete local feature branch (delegated to git-expert):**

```bash
echo "🗑️  Deleting local branch..."

# Use git-expert agent to delete local branch
# Task: "Delete local branch $BRANCH_NAME (force delete with -D)"
# Expected: Success message or "branch not found" message

echo "✅ Local branch deletion complete"
```

### Phase 9: Delete Remote Branch

**Delete remote branch (delegated to git-expert):**

```bash
echo ""
echo "   Remote branch: origin/$BRANCH_NAME"

# Use AskUserQuestion tool:
# Question: "Delete remote branch from origin?"
# Options:
#   - "Delete remote branch" (description: Remove branch from GitHub)
#   - "Keep remote branch" (description: Preserve branch on origin)

# If "Delete remote branch" selected:
#   Use git-expert agent to delete remote branch safely
#   Task: "Delete remote branch origin/$BRANCH_NAME"
# If "Keep remote branch" selected:
#   echo "ℹ️  Remote branch preserved: origin/$BRANCH_NAME"
```

### Phase 10: Update Registry

**Remove worktree from registry:**

Use the registry helper script:

```bash
cd "$PROJECT_ROOT"

echo "📝 Updating registry..."

# Remove worktree entry by issue ID
node scripts/worktree-registry.js remove "$ISSUE_ID"

echo "✅ Registry updated"
```

### Phase 11: Completion Summary

**Display cleanup summary:**

```
╔════════════════════════════════════════════╗
║  ✅ Cleanup Complete                       ║
╚════════════════════════════════════════════╝

🗑️  Removed:
   - Worktree: $WORKTREE_PATH
   - Local branch: $BRANCH_NAME
   - Remote branch: [deleted/preserved]
   - Registry entry

📋 Status:
   Issue: $ISSUE_ID
   PR: #$PR_NUMBER (merged)

💡 Next Steps:
   - Verify cleanup: git worktree list
   - View remaining: /worktree/cleanup --list
   - Or: node scripts/worktree-registry.js list
```

## Error Recovery

**If cleanup fails:**

1. **Worktree removal failure**:
   - Try: `git worktree remove [path] --force`
   - Fallback: `rm -rf [path]`
   - Last resort: Manual deletion

2. **Branch deletion failure**:
   - Try: `git branch -D [branch]`
   - Check: `git branch -a` for status
   - Remote: `git push origin --delete [branch]`

3. **Registry update failure**:
   - Manually edit: `.worktrees-registry.json`
   - Remove entry for deleted branch
   - Validate JSON syntax

**Manual registry cleanup:**

```bash
# View all worktrees
node scripts/worktree-registry.js list

# Remove specific entry by issue ID
node scripts/worktree-registry.js remove ISSUE-ID

# View specific worktree details
node scripts/worktree-registry.js find ISSUE-ID
```

## Important Notes

- **Safety First**: Always verifies PR merge status (unless --force)
- **Interactive Questions**: Uses AskUserQuestion tool for all confirmations
- **Git Operations**: Delegated to git-expert agent for safety
- **Registry**: Tracks all worktrees via `scripts/worktree-registry.js`
- **List Mode**: Use `--list` to see all tracked worktrees
- **Force Mode**: Use `--force` to skip PR verification (dangerous)
- **Remote Branches**: Asks before deleting remote branch
- **Preservation**: Original repository is never affected
- **Environment Variables**: Uses $PROJECT_ROOT for path references
- **Cleanup**: Removes worktree directory, local branch, and registry entry
