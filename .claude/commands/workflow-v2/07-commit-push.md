---
name: 07-commit-push
version: 2.0.0
description: Commit and push with pre-validation
author: Shayon Pal
tags: [workflow-v2, commit, git]
argument_hint: <linear-issue-id>
---

# Commit-Push - Pre-Validated Commit & PR Creation

Commit changes with pre-commit message validation. No more post-commit amendments.

## Instructions

### Load Shared Utilities & Read State

```bash
source .claude/commands/workflow-v2/_shared/config.md
source .claude/commands/workflow-v2/_shared/agent-utils.md
source .claude/commands/workflow-v2/_shared/state-utils.md
source .claude/commands/workflow-v2/_shared/output-templates.md

ISSUE_ID="${ARGUMENTS:-$(read_workflow_state 'current_issue')}"
BRANCH=$(read_workflow_state "branch_name")

phase_header "Commit & Push Phase" "Creating validated commit for $ISSUE_ID"

write_workflow_state "current_phase" "commit"
```

### Phase 1: Pre-Commit Validation (Quick Win #2)

```bash
echo "🔍 Running pre-commit validation..."

# Only re-validate if tests were skipped or state is stale
TEST_STATUS=$(read_workflow_state "test_status")

if [ "$TEST_STATUS" = "skipped-auto" ] || [ "$TEST_STATUS" = "skipped" ]; then
  # Quick validation for doc-only changes
  echo "  ⏭️ Skipping full validation (doc-only changes)"

elif [ "$TEST_STATUS" != "passed" ]; then
  # Full validation needed
  echo "  🧪 TypeScript check..."
  npm run typecheck || {
    error_output "TypeCheck Failed" "Fix type errors before committing" "Run: npm run typecheck"
    exit 1
  }

  echo "  🔨 Build check..."
  npm run build || {
    error_output "Build Failed" "Fix build errors before committing" "Run: npm run build"
    exit 1
  }

else
  echo "  ✅ Using cached validation results (all passed)"
fi

echo "✅ Pre-commit validation complete"
```

### Phase 2: Draft Commit Message (Pre-Validation)

```bash
echo ""
echo "✍️ Drafting commit message..."

# Use git-expert to draft message BEFORE committing
# Agent: git-expert
# Task: Create comprehensive multi-line commit message
#
# Requirements:
# - Subject line: type(scope): brief summary (under 72 chars)
# - Blank line
# - Detailed description (3-5 sentences explaining WHAT and WHY)
# - Changes list (files/functions modified)
# - Breaking changes assessment
# - Footer: Fixes $ISSUE_ID
#
# Git status shows: [file changes]
# Linear issue: $ISSUE_ID

# git-expert returns drafted message
COMMIT_MESSAGE="[message from git-expert]"
```

### Phase 3: Validate Message BEFORE Commit (Improvement)

```bash
echo "🔍 Validating commit message structure..."

# Validate message has required components
LINE_COUNT=$(echo "$COMMIT_MESSAGE" | wc -l)

if [ "$LINE_COUNT" -lt "$WORKFLOW_MIN_COMMIT_MESSAGE_LINES" ]; then
  error_output \
    "Commit Message Validation Failed" \
    "Message must have at least $WORKFLOW_MIN_COMMIT_MESSAGE_LINES lines (subject + blank + description)" \
    "1. Review drafted message\n2. Add detailed description\n3. Retry commit"

  echo "Drafted message:"
  echo "---"
  echo "$COMMIT_MESSAGE"
  echo "---"
  exit 1
fi

# Check for blank line after subject
SECOND_LINE=$(echo "$COMMIT_MESSAGE" | sed -n '2p')
if [ -n "$SECOND_LINE" ]; then
  echo "⚠️ Warning: Line 2 should be blank for proper git format"
fi

# Check for Linear issue reference
if ! echo "$COMMIT_MESSAGE" | grep -qE "(Fixes|Closes|Refs) [A-Z]+-[0-9]+"; then
  echo "⚠️ Warning: No Linear issue reference found"
fi

echo "✅ Commit message validated"
echo ""
echo "Preview:"
echo "========================================"
echo "$COMMIT_MESSAGE" | head -20
echo "========================================"
echo ""
```

### Phase 4: Create Commit with Validated Message

```bash
checkpoint_output \
  "Commit Confirmation" \
  "Message validated and ready" \
  "Create commit? (yes/edit/cancel)"

# yes: Proceed with commit
# edit: Loop back to message drafting
# cancel: Exit

if [ "$USER_CHOICE" = "yes" ]; then
  echo "📝 Creating commit..."

  git add -A
  git commit -m "$COMMIT_MESSAGE"

  COMMIT_SHA=$(git rev-parse HEAD)
  echo "✅ Commit created: $COMMIT_SHA"

  # Store commit info
  write_workflow_state "commit_sha" "$COMMIT_SHA"
fi
```

### Phase 5: Branch Detection & Push

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" = "$WORKFLOW_DEFAULT_BRANCH" ]; then
  checkpoint_output \
    "Direct Master Commit Detected" \
    "Currently on $WORKFLOW_DEFAULT_BRANCH branch" \
    "Push to master (skip PR)? (yes/no)"

  # yes: Push directly, skip PR creation
  # no: Exit, suggest feature branch
fi

echo "🚀 Pushing branch to origin..."
git push origin "$CURRENT_BRANCH"

echo "✅ Branch pushed successfully"
```

### Phase 6: Create Pull Request

```bash
if [ "$CURRENT_BRANCH" != "$WORKFLOW_DEFAULT_BRANCH" ]; then
  echo "📋 Creating Pull Request..."

  # Use git-expert to create PR
  # Agent: git-expert
  # Task: Create GitHub PR with gh CLI
  #
  # PR title: [Issue title from Linear]
  # PR body: Implementation summary with testing checklist
  # Base: $WORKFLOW_DEFAULT_BRANCH
  # Head: $CURRENT_BRANCH
  # Linear: $ISSUE_ID

  PR_URL="[from gh pr create]"
  PR_NUMBER="[from gh pr view]"

  # Store PR info
  write_workflow_state "pr_url" "$PR_URL"
  write_workflow_state "pr_number" "$PR_NUMBER"

  echo "✅ PR created: $PR_URL"
fi
```

### Phase 7: Update Linear & Mark Complete

```bash
# Update Linear issue
if [ -n "$PR_URL" ]; then
  update_linear_issue "$ISSUE_ID" \
    "✅ PR Created: $PR_URL\nBranch: $CURRENT_BRANCH\nCommit: $COMMIT_SHA" \
    "In Review"
else
  update_linear_issue "$ISSUE_ID" \
    "✅ Committed to $WORKFLOW_DEFAULT_BRANCH\nCommit: $COMMIT_SHA" \
    "Done"
fi

mark_phase_complete "commit"

success_output \
  "Commit & Push Phase" \
  "Changes committed and $([ -n "$PR_URL" ] && echo 'PR created' || echo 'pushed to master')" \
  "$([ -n "$PR_URL" ] && echo 'Next: /workflow-v2:08-review-pr' || echo 'Workflow complete')"

show_workflow_status
```

## Key Improvements from v1

1. **Pre-Commit Validation** (Quick Win #2): Validates message BEFORE creating commit
2. **No Amendments**: Prevents wasted commits that need --amend
3. **Cached Validation**: Reuses test results instead of re-running
4. **State Tracking**: Stores commit SHA and PR info for later phases
5. **Smart Skip**: Doc-only changes skip heavy validation

## Validation Flow Comparison

### v1 (Old)

```
Draft message → Create commit → Validate message → ❌ Failed → Amend commit → Retry
```

### v2 (New)

```
Draft message → Validate message → ✅ Pass → Create commit → Done
```

## Output Format

```
════════════════════════════════════════════
  Commit & Push Phase
════════════════════════════════════════════

🔍 Running pre-commit validation...
  ✅ Using cached validation results

✍️ Drafting commit message...

🔍 Validating commit message structure...
✅ Commit message validated

Preview:
========================================
feat(search): add consolidated search tool

Implements unified search tool replacing 6 legacy tools.
Intelligent auto-mode detection routes queries appropriately.
...
========================================

╔════════════════════════════════════════════╗
║  🤔 Commit Confirmation                     ║
╚════════════════════════════════════════════╝

**Create commit? (yes/edit/cancel)**

📝 Creating commit... ✅
🚀 Pushing branch... ✅
📋 Creating PR... ✅

╔════════════════════════════════════════════╗
║  ✅ Commit & Push Phase Complete            ║
╚════════════════════════════════════════════╝

### 💡 Next Steps
Next: /workflow-v2:08-review-pr
```
