---
description: Commit all changes, create PR, and finalize Linear issue with review workflow
argument_hint: <linear-issue-id>
---

# 07-Commit-Push - PR Creation & Deployment

Comprehensive workflow command to commit all changes, create GitHub Pull Request for review, and finalize Linear issue integration.

## Help Mode

If user provides `--help` or `help` parameter, display this usage guide instead of running the command:

```
08-commit-push - Commit all changes and push to master branch

USAGE:
  08-commit-push <linear-issue-id>    Commit and push with Linear integration
  08-commit-push help                 Show this help

EXAMPLES:
  08-commit-push MCP-25
  08-commit-push d1aae15e-123
```

## Instructions

**First, validate inputs:**

- If no parameters provided, show error and usage
- If `help` or `--help` provided, show the help mode above and stop
- Extract Linear issue ID from first argument

### Step 1: CHANGELOG Verification and Update

Ensure CHANGELOG.md is updated before any commit operations:

Use **doc-search** agent to check CHANGELOG status:

```
Agent: doc-search
Task: Verify CHANGELOG.md contains entry for current issue

Please:
1. Search CHANGELOG.md for the Linear issue ID
2. Check if recent changes are documented
3. Report if CHANGELOG needs updating
```

If CHANGELOG update needed, collect implementation context:

Use **linear-expert** agent to get issue details:

```
Agent: linear-expert
Task: Get Linear issue details for CHANGELOG

Please:
1. Get full issue details including title and description
2. Identify type of change (feat/fix/chore/docs/test)
3. Provide summary suitable for CHANGELOG entry

Team ID: d1aae15e-d5b9-418d-a951-adcf8c7e39a8
Issue ID: [from user input]
```

Review current changes with **git-expert**:

```
Agent: git-expert
Task: Analyze git diff for CHANGELOG context

Please:
1. Run git diff --stat to show modified files
2. Identify key changes made
3. Summarize implementation for CHANGELOG entry
```

Capture current timestamp:

```bash
echo "📅 Current timestamp:"
date "+%Y-%m-%d %H:%M"
```

Update CHANGELOG.md directly using Read and Edit tools:

```bash
# Read current CHANGELOG.md
# Then Edit to add new entry with:
# - Current timestamp: $CURRENT_TIMESTAMP (from date command above)
# - Issue reference: [Linear issue ID]
# - Change type: [feat/fix/chore/docs/test]
# - Summary: [implementation summary]
# - Breaking changes: [if any]

# Format according to Common Changelog style
# Example: "2025-11-02 14:30 - feat: add search consolidation (MCP-145)"
```

Use Read tool first, then Edit tool to insert the new entry at the appropriate location.

Verify CHANGELOG update succeeded:

```bash
echo "🔍 Verifying CHANGELOG update..."
git status CHANGELOG.md
if git diff --name-only | grep -q "CHANGELOG.md"; then
  echo "✅ CHANGELOG.md updated successfully"
else
  echo "❌ CHANGELOG.md update verification failed"
  exit 1
fi
```

### Step 1.4: Strategic Context Assessment

**Assess CURRENT-FOCUS.md impact:**

Use **doc-search** agent to check CURRENT-FOCUS alignment:

```
Agent: doc-search
Task: Assess if CURRENT-FOCUS.md needs updating

Please:
1. Read docs/CURRENT-FOCUS.md current content
2. Assess if completed work affects documented priorities
3. Check if cycle goals or active work sections need updates
4. Determine: [needs update / aligned / N/A]

Rationale: Completed work may shift priorities or complete planned items
```

**Language Policy:**  
Use factual, neutral language in commit messages and Linear updates - avoid superlatives (excellent, perfect, amazing, best, etc.)

---

### Step 1.5: Branch Detection and Workflow Selection

**Detect current branch:**

```bash
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" = "master" ]; then
  echo "⚠️ On master branch - commits skip PR review process"
  read -p "Continue with direct master commit? (y/N) " -n 1 -r
  echo
  [[ ! $REPLY =~ ^[Yy]$ ]] && { echo "Aborting. Checkout feature branch first."; exit 1; }
  WORKFLOW_MODE="direct-master"
else
  echo "✅ On feature branch - will create PR for review"
  WORKFLOW_MODE="feature-pr"
fi
```

### Step 2: Pre-Commit Validation

Run pre-commit checks to ensure codebase is ready for deployment:

```bash
echo "🔍 Running pre-commit validation..."

# TypeScript type checking (primary validation method for this project)
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ TypeScript validation failed"
  exit 1
fi

# Build verification
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

# Quick test verification (unit tests only for speed)
npm run test:unit
if [ $? -ne 0 ]; then
  echo "⚠️ Unit tests failed - review before continuing"
fi

echo "✅ Pre-commit checks completed"
```

### Step 3: Git Status Review

Use **git-expert** agent to review current repository state:

```
Agent: git-expert
Task: Review git status and provide commit summary

Please:
1. Run git status to show all changes
2. Run git diff --stat to show change summary
3. Identify key files modified (src/, tests/, docs/, config)
4. Suggest commit message based on changes
5. Verify we're on master branch
```

### Step 4: Stage All Changes

Commit ALL changes in the repository - no selective staging:

```bash
echo "📦 Staging all changes..."

# Stage everything - code, docs, tests, configs
git add -A

# Verify staging
echo "📋 Staged changes:"
git status --porcelain
```

### Step 4.5: Commit Message Requirements Reminder

**CRITICAL: Commit messages MUST include detailed descriptions**

Your commit will be rejected if it's single-line only. Required format:

1. ✅ Subject line: type(scope): brief summary (under 72 chars)
2. ✅ Blank line
3. ✅ Detailed description: 3-5+ sentences explaining WHAT and WHY
4. ✅ Changes list: specific files/functions modified
5. ✅ Breaking changes assessment
6. ✅ Linear issue reference: Fixes [ISSUE_ID]

Single-line commits are blocked by pre-commit hook validation.

---

### Step 5: Create Comprehensive Commit

**Use `git-expert` agent to create multi-line commit message:**

```
Agent: git-expert
Task: Create comprehensive multi-line commit message

**REQUIRED FORMAT** (minimum 3 components):
```

[type]([scope]): [subject line under 72 chars]

[MANDATORY DETAILED DESCRIPTION - minimum 3-5 sentences]

Explain WHAT was changed and WHY:

- Context for the changes
- Implementation approach taken
- Key technical decisions made
- Performance or behavior impacts

Changes:

- [Specific file changes with brief rationale]
- [Key functions/classes modified]
- [Tests added/updated]
- [Documentation updated]

Breaking Changes: [None or list with migration steps]  
Migration Required: [None or specific steps]

Fixes [LINEAR_ISSUE_ID]

```

**COMMIT MESSAGE MUST NOT:**
- Be single-line only (will be rejected)
- Use vague language ("updated stuff", "fixed things")
- Skip the WHY (context and rationale required)
- Omit file-level changes summary

**VALIDATION:** Pre-commit hook will reject single-line commits automatically.
```

```

### Step 5.5: Validate Commit Message Quality

**Verify commit message meets quality standards:**

```bash
echo "🔍 Validating commit message structure..."

# Get the commit message
COMMIT_MSG=$(git log -1 --pretty=%B)

# Count lines in commit message
LINE_COUNT=$(echo "$COMMIT_MSG" | wc -l)

# Check if commit has body (more than 2 lines: subject + blank + body)
if [ $LINE_COUNT -lt 3 ]; then  
  echo "❌ Commit message validation failed"  
  echo ""  
  echo "⚠️  Single-line commit detected. Commits MUST include:"  
  echo "   1. Summary line (under 72 chars)"  
  echo "   2. Blank line"  
  echo "   3. Detailed description (minimum 3-5 sentences)"  
  echo ""  
  echo "Current commit message:"  
  echo "---"  
  echo "$COMMIT_MSG"  
  echo "---"  
  echo ""  
  echo "Please amend commit with detailed description:"  
  echo "   git commit --amend"  
  exit 1  
fi

# Verify blank line after subject
SECOND_LINE=$(echo "$COMMIT_MSG" | sed -n '2p')
if [ -n "$SECOND_LINE" ]; then  
  echo "⚠️  Warning: Second line should be blank for proper git format"  
fi

# Verify Linear issue reference
if ! echo "$COMMIT_MSG" | grep -qE "(Fixes|Closes|Refs) [A-Z]+-[0-9]+"; then
  echo "⚠️  Warning: No Linear issue reference found (Fixes/Closes LINEAR-ID)"  
fi

echo "✅ Commit message structure validated"  
echo ""  
echo "📝 Commit message preview:"  
echo "=========================="
git log -1 --pretty=format:"%s%n%n%b" | head -20
echo ""  
echo "=========================="
```

---

### Step 6: Push Branch (Workflow-Dependent)

**Push changes based on workflow mode:**

```bash
if [ "$WORKFLOW_MODE" = "direct-master" ]; then  
  echo "🚀 Pushing directly to master branch..."

  git push origin master

  if [ $? -eq 0 ]; then  
    echo "✅ Successfully pushed to master"  
    COMMIT_SHA=$(git rev-parse HEAD)  
    echo "📝 Commit SHA: $COMMIT_SHA"  
  else  
    echo "❌ Push failed - check network and permissions"  
    exit 1  
  fi

else  # feature-pr workflow  
  echo "🚀 Pushing feature branch to origin..."

  git push origin $CURRENT_BRANCH

  if [ $? -eq 0 ]; then  
    echo "✅ Successfully pushed feature branch: $CURRENT_BRANCH"  
    COMMIT_SHA=$(git rev-parse HEAD)  
    echo "📝 Commit SHA: $COMMIT_SHA"  
  else  
    echo "❌ Push failed - check network and permissions"  
    exit 1  
  fi  
fi
```

### Step 6.5: Create Pull Request (Feature Branch Workflow Only)

**Create GitHub PR for code review (skipped if direct-master workflow):**

```bash
if [ "$WORKFLOW_MODE" = "feature-pr" ]; then  
  echo "📋 Creating Pull Request..."  
else  
  echo "⏭️  Skipping PR creation (direct-master workflow)"
  # Jump to Step 7
fi
```

Use `git-expert` agent to create comprehensive PR:

```
Agent: git-expert  
Task: Create GitHub Pull Request for Linear issue

Please use gh CLI to create PR with:
1. Title: [Linear Issue Title from linear-expert]
2. Body template:
   ## Summary
   Implements [Linear Issue ID]: [Issue Title]

   ## Implementation Details
   [Brief summary of changes from git diff]

   ## Testing
   - [ ] TypeScript validation passed
   - [ ] Unit tests passed
   - [ ] Integration tests passed
   - [ ] Manual testing completed

   ## Linear Issue
   Closes [Linear Issue URL]

3. Base branch: master
4. Head branch: $CURRENT_BRANCH
5. Assign to current user
6. Add label: "linear-issue"

Command: gh pr create --title "..." --body "..." --base master --head $CURRENT_BRANCH
```

**Capture PR URL and number:**

```bash
if [ "$WORKFLOW_MODE" = "feature-pr" ]; then  
  PR_URL=$(gh pr view --json url --jq .url)  
  PR_NUMBER=$(gh pr view --json number --jq .number)

  echo "✅ Pull Request created:"  
  echo "   URL: $PR_URL"  
  echo "   Number: #$PR_NUMBER"

  # Store PR info for Linear update
fi
```

### Step 7: Update Linear Issue

**Use `linear-expert` to update issue based on workflow:**

```
Team ID: d1aae15e-d5b9-418d-a951-adcf8c7e39a8  
Issue ID: [from user input]

If WORKFLOW_MODE = "feature-pr":  
  Status: "In Review"  
  Comment:
    ## 🔀 Pull Request Created
    **PR**: [PR_URL]  
    **Number**: #[PR_NUMBER]  
    **Branch**: `[branch-name]` → master  
    **Commit**: [COMMIT_SHA]

    ### Review Required
    - Code review
    - Tests passing
    - Documentation updated

    ### Strategic Context
    **CURRENT-FOCUS Impact**: [needs update / aligned / N/A]

If WORKFLOW_MODE = "direct-master":  
  Status: "Done"  
  Comment:
    ## ✅ Deployed to Master
    **Commit**: [COMMIT_SHA]  
    **Branch**: master  
    **Status**: Deployed  
    ⚠️ Direct commit - code review skipped

    ### Strategic Context
    **CURRENT-FOCUS Impact**: [needs update / aligned / N/A]
```

### Step 8: Deployment Complete

**Deployment information tracked in:**

- Linear issue comments (comprehensive deployment details and PR links)
- Git history (commit messages with detailed context)
- GitHub PR timeline (for feature-pr workflow)

Serena memory reserved for reusable architectural patterns, not per-deployment tracking.

### Step 8.5: Next Steps

```bash
echo "╔════════════════════════════════════════════╗"  
echo "║  Deployment Complete                       ║"  
echo "╚════════════════════════════════════════════╝"  
echo ""  
if [ "$WORKFLOW_MODE" = "feature-pr" ]; then  
  echo "📋 Pull Request: $PR_URL"  
  echo "✅ Next: Review PR, obtain approval, merge to master"  
  echo "🧹 After merge: Delete feature branch"  
else  
  echo "✅ Changes deployed to master"  
  echo "💡 Next: Monitor MCP server, verify integration"  
fi
```

## Output Format

```
## {'🔀 Pull Request Created' if feature-pr else '🚀 Deployment Complete'}

### 🎯 Strategic Context
**CURRENT-FOCUS Impact**: [needs update / aligned / N/A]  
**Language Policy**: Factual, neutral language used

### 📊 Commit Summary
- **Issue**: [Linear Issue ID]
- **Commit**: [SHA]
- **Branch**: [feature-branch or master]
- **Workflow**: [feature-pr or direct-master]
- **Files Changed**: [count]

### 🔍 Pre-Commit Results
- **TypeCheck**: ✅ Passed
- **Build**: ✅ Passed
- **Tests**: ✅ Passed / ⚠️ Review needed

### {'🔀 Pull Request' if feature-pr else '📋 Deployment'} Details
[IF feature-pr]:
- **PR Number**: #[number]
- **PR URL**: [GitHub PR URL]
- **Status**: Open - awaiting review
- **Next**: Review → Approve → Merge

[IF direct-master]:
- **Status**: Deployed to master
- **Note**: Code review skipped
- **Next**: Monitor deployment

### 📝 Linear Issue
- **Status**: [In Review or Done]
- **Comment**: Added with [PR link or commit details]

### 💡 Next Steps
[Workflow-specific next actions]
```

## Error Recovery

If any step fails:

1. **Pre-commit failure**: Fix issues before proceeding
2. **Git push failure**: Check network, permissions, conflicts
3. **Linear update failure**: Manually update issue status
4. **Build failure**: Resolve compilation errors first

All failures should stop execution - do not proceed with partial deployments.
