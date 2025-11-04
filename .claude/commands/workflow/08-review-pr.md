---
name: 08-review-pr
version: 1.0.0
description: Review GitHub PR, validate automated reviews, assess merge readiness, and guide next steps
author: Shayon Pal
tags: [workflow, pr-review, merge-decision, quality-check]
argument_hint: <pr-number>
---

# 08-Review-PR - Pull Request Review & Merge Decision

Comprehensive PR review workflow: fetches PR details, analyzes automated reviews (Copilot, CI), validates review comments through two-tier investigation (pattern-based + deep analysis), provides independent solution recommendations, assesses merge readiness, and guides decision-making.

## Purpose

Provide comprehensive PR review analysis with two-tier validation (automated pattern detection + deep codebase investigation), independent solution recommendations, code quality assessment, and interactive merge decision workflow.

## Arguments

`$ARGUMENTS` can take several formats:

1. **PR number**: `<pr-number>` - Review specific PR by number
2. **Linear issue**: `MCP-123` - Find and review PR associated with Linear issue
3. **Help mode**: `help` or `--help` - Show usage guide

## Instructions

**IMPORTANT**: All bash code blocks in this command should be executed as bash scripts. Claude will run these commands directly in the shell environment.

**First, validate inputs:**

- If no parameters provided, show error and usage
- If `help` or `--help` provided, show help mode and stop
- Extract PR number from first argument

### Help Mode Display

If user provides `--help` or `help` parameter, display this guide:

```
08-review-pr - Pull Request Review & Merge Decision

USAGE:
  08-review-pr <pr-number>    Review PR and assess merge readiness
  08-review-pr MCP-123        Find PR by Linear issue and review
  08-review-pr help           Show this help

DESCRIPTION:
  Comprehensive PR review workflow:
  - Fetches PR details and review status
  - Analyzes automated reviews (Copilot, CI checks)
  - Two-tier validation: pattern-based detection + deep codebase investigation
  - Validates issues and provides independent solution recommendations
  - Assesses code quality and strategic alignment
  - Provides merge recommendation with plan options
  - Executes merge or guides next steps based on user decision

EXAMPLES:
  08-review-pr 42             Review PR #42
  08-review-pr MCP-145        Review PR for Linear issue MCP-145
```

Then exit without further processing.

### Step 1: PR Context Gathering

**Extract and validate PR number:**

```bash
PR_INPUT="$ARGUMENTS"

# Check for Linear issue ID format
if [[ "$PR_INPUT" =~ ^[A-Z]+-[0-9]+$ ]]; then
  echo "🔍 Linear issue ID detected: $PR_INPUT"
  echo "Searching for associated PR..."

  # Search for PR with Linear issue reference
  PR_NUMBER=$(gh pr list --search "$PR_INPUT" --json number --jq '.[0].number')

  if [ -z "$PR_NUMBER" ]; then
    echo "❌ No PR found for Linear issue: $PR_INPUT"
    echo "Verify issue has associated PR"
    exit 1
  fi

  echo "✅ Found PR #$PR_NUMBER"
else
  # Validate numeric PR number
  if ! [[ "$PR_INPUT" =~ ^[0-9]+$ ]]; then
    echo "❌ Invalid PR number: $PR_INPUT"
    echo "Usage: 08-review-pr <pr-number>"
    exit 1
  fi
  PR_NUMBER="$PR_INPUT"
fi

echo "📋 Reviewing PR #$PR_NUMBER"
```

**Fetch comprehensive PR details using gh CLI:**

```bash
# Get PR metadata
PR_DATA=$(gh pr view $PR_NUMBER --json title,body,state,headRefName,baseRefName,number,url,author,isDraft,additions,deletions,changedFiles)

# Extract key fields
PR_TITLE=$(echo "$PR_DATA" | jq -r '.title')
PR_URL=$(echo "$PR_DATA" | jq -r '.url')
PR_HEAD=$(echo "$PR_DATA" | jq -r '.headRefName')
PR_BASE=$(echo "$PR_DATA" | jq -r '.baseRefName')
PR_AUTHOR=$(echo "$PR_DATA" | jq -r '.author.login')
IS_DRAFT=$(echo "$PR_DATA" | jq -r '.isDraft')
FILES_CHANGED=$(echo "$PR_DATA" | jq -r '.changedFiles')
ADDITIONS=$(echo "$PR_DATA" | jq -r '.additions')
DELETIONS=$(echo "$PR_DATA" | jq -r '.deletions')

# Extract Linear issue ID from PR body if present
LINEAR_ISSUE=$(echo "$PR_DATA" | jq -r '.body' | grep -oE '(MCP|ISSUE)-[0-9]+' | head -1)

# Get review status
REVIEW_DATA=$(gh pr view $PR_NUMBER --json reviews,reviewDecision)
REVIEW_DECISION=$(echo "$REVIEW_DATA" | jq -r '.reviewDecision // "REVIEW_REQUIRED"')

# Get CI check status
CI_CHECKS=$(gh pr checks $PR_NUMBER --json name,state,event)

echo "✅ PR context gathered"
```

### Step 2: Automated Review Analysis

**CI/CD Checks Analysis:**

```bash
echo "🔍 Analyzing CI/CD checks..."

# Parse CI checks
CI_STATUS="passing"
FAILED_CHECKS=""

while IFS= read -r check; do
  NAME=$(echo "$check" | jq -r '.name')
  STATE=$(echo "$check" | jq -r '.state')

  if [[ "$STATE" == "FAILURE" || "$STATE" == "ERROR" ]]; then
    CI_STATUS="failing"
    FAILED_CHECKS="$FAILED_CHECKS\n- $NAME: Failed"
  elif [[ "$STATE" == "PENDING" || "$STATE" == "IN_PROGRESS" ]]; then
    CI_STATUS="pending"
  fi
done < <(echo "$CI_CHECKS" | jq -c '.[]')

echo "CI Status: $CI_STATUS"
```

**GitHub Copilot & Bot Review Comments Analysis with Validation:**

```bash
echo "🤖 Analyzing and validating Copilot/bot review comments..."

# Get repository owner and name
REPO_FULL=$(gh repo view --json nameWithOwner -q .nameWithOwner)
OWNER=$(echo "$REPO_FULL" | cut -d'/' -f1)
REPO=$(echo "$REPO_FULL" | cut -d'/' -f2)

# Fetch all review comments
REVIEW_COMMENTS=$(gh api "repos/$OWNER/$REPO/pulls/$PR_NUMBER/comments" 2>/dev/null || echo "[]")

# Filter and analyze Copilot/bot comments with validation
COPILOT_ISSUES=""
SECURITY_COUNT=0
QUALITY_COUNT=0
FALSE_POSITIVE_COUNT=0

while IFS= read -r comment; do
  AUTHOR=$(echo "$comment" | jq -r '.user.login')

  # Check if author is a bot (copilot, github-actions, etc.)
  if [[ "$AUTHOR" =~ (copilot|github-actions|bot) ]]; then
    FILE=$(echo "$comment" | jq -r '.path')
    LINE=$(echo "$comment" | jq -r '.line // .original_line')
    BODY=$(echo "$comment" | jq -r '.body')
    DIFF_HUNK=$(echo "$comment" | jq -r '.diff_hunk // ""')

    # Extract suggested code if present (Copilot often provides ```suggestion blocks)
    SUGGESTED_FIX=$(echo "$BODY" | sed -n '/```suggestion/,/```/p' | sed '1d;$d')

    # Validate if this is a real issue by analyzing code context
    IS_VALID=false
    IS_SECURITY=false
    IS_QUALITY=false
    PRIORITY="LOW"
    VALIDATION_REASON=""
    SOLUTION=""

    # Get code context around the flagged line
    CODE_CONTEXT=""
    if [[ -n "$DIFF_HUNK" ]]; then
      CODE_CONTEXT="$DIFF_HUNK"
    fi

    # Security validation
    if echo "$BODY" | grep -qiE '(security|vulnerability|injection|xss|csrf)'; then
      # Check if code context shows actual security risk
      if echo "$CODE_CONTEXT" | grep -qiE '(eval\(|innerHTML|dangerouslySetInnerHTML|exec\(|system\()'; then
        IS_VALID=true
        IS_SECURITY=true
        PRIORITY="HIGH"
        VALIDATION_REASON="Code uses potentially unsafe function"
        ((SECURITY_COUNT++))
      elif echo "$BODY" | grep -qiE '(sql injection|command injection|path traversal)'; then
        IS_VALID=true
        IS_SECURITY=true
        PRIORITY="HIGH"
        VALIDATION_REASON="Injection vulnerability pattern detected"
        ((SECURITY_COUNT++))
      elif echo "$BODY" | grep -qiE '(authentication|authorization|credential|token|password)' && \
           echo "$CODE_CONTEXT" | grep -qiE '(hardcoded|plain.*text|no.*validation|missing.*check)'; then
        IS_VALID=true
        IS_SECURITY=true
        PRIORITY="HIGH"
        VALIDATION_REASON="Auth/credential handling issue"
        ((SECURITY_COUNT++))
      fi

    # Quality/bug validation
    elif echo "$BODY" | grep -qiE '(null|undefined|memory leak|race condition)'; then
      # Check if code context shows actual null/undefined risk
      if echo "$CODE_CONTEXT" | grep -qE '\.\w+' && \
         ! echo "$CODE_CONTEXT" | grep -qE '(if.*null|if.*undefined|\?\.|!!)'; then
        IS_VALID=true
        IS_QUALITY=true
        PRIORITY="MEDIUM"
        VALIDATION_REASON="Potential null/undefined access without check"
        ((QUALITY_COUNT++))
      elif echo "$BODY" | grep -qiE 'memory leak' && \
           echo "$CODE_CONTEXT" | grep -qiE '(setInterval|setTimeout|addEventListener)' && \
           ! echo "$CODE_CONTEXT" | grep -qiE '(clear|remove|cleanup)'; then
        IS_VALID=true
        IS_QUALITY=true
        PRIORITY="MEDIUM"
        VALIDATION_REASON="Resource cleanup missing"
        ((QUALITY_COUNT++))
      elif echo "$BODY" | grep -qiE 'race condition' && \
           echo "$CODE_CONTEXT" | grep -qiE '(async|await|Promise)'; then
        IS_VALID=true
        IS_QUALITY=true
        PRIORITY="MEDIUM"
        VALIDATION_REASON="Async operation without proper synchronization"
        ((QUALITY_COUNT++))
      fi

    # Retry/resilience logic validation
    elif echo "$BODY" | grep -qiE '(retry|retryable|transient|EBUSY|EPERM|sync conflict)'; then
      # Check if code performs operations without retry logic
      if echo "$CODE_CONTEXT" | grep -qiE '(renameSync|writeFileSync|unlinkSync|mkdirSync)' && \
         ! echo "$CODE_CONTEXT" | grep -qiE '(retry|for.*attempt|while.*try)'; then
        IS_VALID=true
        IS_QUALITY=true
        PRIORITY="MEDIUM"
        VALIDATION_REASON="Missing retry logic for transient filesystem errors"
        ((QUALITY_COUNT++))
      fi

    # Redundant code validation
    elif echo "$BODY" | grep -qiE '(redundant|duplicate|unnecessary|already)'; then
      # Check if code shows patterns of duplication in diff
      if echo "$CODE_CONTEXT" | grep -qE 'finally' && \
         echo "$CODE_CONTEXT" | grep -qE 'catch.*cleanup'; then
        IS_VALID=true
        IS_QUALITY=true
        PRIORITY="MEDIUM"
        VALIDATION_REASON="Redundant cleanup code (catch + finally)"
        ((QUALITY_COUNT++))
      fi

    # Error handling validation
    elif echo "$BODY" | grep -qiE '(error handling|try.*catch|exception)'; then
      if echo "$CODE_CONTEXT" | grep -qE 'catch.*\{\s*\}' || \
         echo "$CODE_CONTEXT" | grep -qE 'catch.*\/\/.*ignore'; then
        IS_VALID=true
        IS_QUALITY=true
        PRIORITY="MEDIUM"
        VALIDATION_REASON="Empty catch block swallows errors"
        ((QUALITY_COUNT++))
      fi
    fi

    # Generate specific solution based on validation
    if $IS_VALID; then
      if [[ -n "$SUGGESTED_FIX" ]]; then
        # Use Copilot's suggested fix if available
        SOLUTION="Apply suggested fix:\n$(echo "$SUGGESTED_FIX" | head -c 150)"
      elif $IS_SECURITY; then
        case "$VALIDATION_REASON" in
          *"unsafe function"*)
            SOLUTION="Replace unsafe function with safer alternative (e.g., use sanitization library)"
            ;;
          *"Injection"*)
            SOLUTION="Use parameterized queries/escaped inputs to prevent injection"
            ;;
          *"Auth/credential"*)
            SOLUTION="Use environment variables or secure storage for credentials"
            ;;
          *)
            SOLUTION="Review and implement proper security controls"
            ;;
        esac
      elif $IS_QUALITY; then
        case "$VALIDATION_REASON" in
          *"null/undefined"*)
            SOLUTION="Add null check: if (!variable) return/throw before line $LINE"
            ;;
          *"Resource cleanup"*)
            SOLUTION="Add cleanup in finally block or component unmount"
            ;;
          *"Async operation"*)
            SOLUTION="Add proper await/Promise.all or locking mechanism"
            ;;
          *"Empty catch"*)
            SOLUTION="Add error logging/handling or rethrow if cannot handle"
            ;;
          *"retry logic"*)
            SOLUTION="Wrap operation in retry helper (e.g., retryWrite()) to handle transient errors"
            ;;
          *"Redundant"*)
            SOLUTION="Remove duplicate cleanup - keep in either catch OR finally, not both"
            ;;
          *)
            SOLUTION="Address code quality issue as described"
            ;;
        esac
      fi

      # Add to validated issues list
      COPILOT_ISSUES="$COPILOT_ISSUES\n[$PRIORITY] $FILE:$LINE - $(echo "$BODY" | head -c 80)...\n  Validation: $VALIDATION_REASON\n  → Fix: $SOLUTION"
    else
      # False positive or low-priority suggestion
      ((FALSE_POSITIVE_COUNT++))
    fi
  fi
done < <(echo "$REVIEW_COMMENTS" | jq -c '.[]')

echo "Validated: $SECURITY_COUNT security issues, $QUALITY_COUNT quality issues"
echo "Filtered out: $FALSE_POSITIVE_COUNT false positives/low-priority suggestions"
```

**Deep Investigation & Solution Validation:**

After the automated pattern-based validation above, Claude will now thoroughly investigate each validated issue:

**For each validated Copilot/bot issue:**

1. **Investigate the actual codebase context:**
   - Read the affected file(s) to understand the broader implementation
   - Examine how the flagged code is used elsewhere in the codebase
   - Check for similar patterns that might have the same issue
   - Understand the architectural intent and design decisions

2. **Validate or invalidate the issue:**
   - Confirm whether the automated validation correctly identified a real problem
   - Consider edge cases and actual usage patterns
   - Assess severity in the context of this specific project
   - Determine if the issue is a genuine concern or acceptable trade-off

3. **Provide independent solution:**
   - Even if Copilot's suggested fix exists, analyze and propose your own solution
   - Consider multiple approaches and recommend the best one for this codebase
   - If Copilot's suggestion is valid, you may confirm it, but explain WHY it's correct
   - If you disagree with Copilot's approach, clearly explain the alternative
   - Provide specific, actionable fixes with file:line references

4. **Document findings:**
   - Update the COPILOT_ISSUES variable with your validated analysis
   - Mark false positives that the automated check missed
   - Escalate severity if your investigation reveals deeper problems
   - Add context about why the issue matters (or doesn't) for this project

**Output format for each investigated issue:**

```
[PRIORITY] file:line - Issue summary
  Automated detection: [what the pattern-based validation found]
  Deep analysis: [your investigation findings]
  Valid issue: [YES/NO with reasoning]
  Copilot's solution: [if available, with assessment]
  Recommended fix: [your specific solution with code example if helpful]
```

**Important:**
- Use your best judgment - don't blindly accept either the automated validation OR Copilot's suggestions
- Be pragmatic: some issues might be theoretical but not practical concerns
- Consider project-specific context (this is the mcp-for-lifeos project with specific patterns)
- If investigating reveals the pattern-based validation was wrong, correct it

### Step 3: Review Comment Validation

**Parse and categorize all review comments and threads:**

```bash
echo "💬 Analyzing review comments..."

# Fetch reviews (includes comments in body)
REVIEWS=$(gh pr view $PR_NUMBER --json reviews)

# Parse human review comments (non-bot)
CRITICAL_COMMENTS=""
IMPORTANT_COMMENTS=""
CRITICAL_COUNT=0
IMPORTANT_COUNT=0
TOTAL_REVIEWS=0

# Analyze reviews for human comments
while IFS= read -r review; do
  AUTHOR=$(echo "$review" | jq -r '.author.login')
  BODY=$(echo "$review" | jq -r '.body')
  STATE=$(echo "$review" | jq -r '.state')

  # Skip bot reviews (already analyzed in Step 2)
  if [[ "$AUTHOR" =~ (copilot|github-actions|bot) ]]; then
    continue
  fi

  # Skip empty reviews
  if [[ -z "$BODY" || "$BODY" == "null" ]]; then
    continue
  fi

  ((TOTAL_REVIEWS++))

  # Categorize by priority based on content and state
  if [[ "$STATE" == "CHANGES_REQUESTED" ]]; then
    # Changes requested are automatically important
    ((CRITICAL_COUNT++))
    CRITICAL_COMMENTS="$CRITICAL_COMMENTS\n- Review by @$AUTHOR: Changes requested\n  $(echo "$BODY" | head -c 80)..."
  elif echo "$BODY" | grep -qiE '(security|bug|breaking|blocker|critical|must fix)'; then
    ((CRITICAL_COUNT++))
    CRITICAL_COMMENTS="$CRITICAL_COMMENTS\n- Review by @$AUTHOR\n  $(echo "$BODY" | head -c 80)..."
  elif echo "$BODY" | grep -qiE '(should|concern|design|test|important|improve)'; then
    ((IMPORTANT_COUNT++))
    IMPORTANT_COMMENTS="$IMPORTANT_COMMENTS\n- Review by @$AUTHOR\n  $(echo "$BODY" | head -c 80)..."
  fi
done < <(echo "$REVIEWS" | jq -c '.reviews[]? // empty')

echo "Review comments: $CRITICAL_COUNT critical, $IMPORTANT_COUNT important from $TOTAL_REVIEWS human reviews"
```

### Step 4: Generate Succinct Review Report

**Compile analysis into focused report:**

```
## 🎯 PR Review: #[NUMBER]

### 📊 Overview
- **Title**: [PR title]
- **URL**: [GitHub PR URL]
- **Branch**: [head] → [base]
- **Files**: [count] (+[additions] -[deletions])
- **Linear**: [ISSUE-ID] OR [N/A]

### 🚫 Blocking Issues

[If CI_STATUS == "failing"]
**Failed CI Checks:**
[List failed checks with brief reason]

[If SECURITY_COUNT > 0 or QUALITY_COUNT > 0]
**Copilot/Bot Issues:**
[List HIGH/MEDIUM priority issues with solutions]

[If CRITICAL_COUNT > 0]
**Critical Review Comments:**
[List critical unresolved comments]

[If no blocking issues]
✅ No blocking issues found

### 📋 Merge Readiness

**Status**: [✅ READY / ⚠️ NEEDS CHANGES / ❌ BLOCKED]

**Checks:**
- CI: [✅ Passed / ❌ Failed / ⏳ Pending]
- Security: [✅ Clean / ❌ Issues found]
- Reviews: [✅ Approved / ⚠️ Pending / ❌ Changes requested]
- Comments: [✅ Resolved / ⚠️ [X] unresolved]

[If READY]
✅ Clear to merge

[If NEEDS CHANGES or BLOCKED]
**Actions Required:**
1. [Specific action with file:line reference]
2. [Next action]
3. [Additional actions...]

### 💡 Recommendations

[Only if changes needed - provide brief, actionable guidance]
- Fix [specific issue] at [file:line]: [how to fix]
- Address [concern] in [file]: [recommendation]
- [Additional recommendations...]

---
```

### Step 5: Present Decision Options & Get User Choice

**Auto-recommend option and prompt for choice:**

```bash
# Determine recommended action
RECOMMENDED_OPTION=1
RECOMMENDATION_REASON=""

if [[ "$CI_STATUS" == "failing" || "$SECURITY_COUNT" -gt 0 || "$CRITICAL_COUNT" -gt 0 ]]; then
  RECOMMENDED_OPTION=2
  TOTAL_ISSUES=$((SECURITY_COUNT + CRITICAL_COUNT))
  RECOMMENDATION_REASON="$TOTAL_ISSUES blocking issue(s) found"
elif [[ "$REVIEW_DECISION" == "CHANGES_REQUESTED" ]]; then
  RECOMMENDED_OPTION=2
  RECOMMENDATION_REASON="Changes requested by reviewers"
elif [[ "$IMPORTANT_COUNT" -gt 0 ]]; then
  RECOMMENDED_OPTION=3
  RECOMMENDATION_REASON="Review clarification recommended"
else
  RECOMMENDED_OPTION=1
  RECOMMENDATION_REASON="All checks passing, ready to merge"
fi

cat << EOF

## 🤔 Recommended Action

**Recommendation**: Option $RECOMMENDED_OPTION
**Reason**: $RECOMMENDATION_REASON

---

## How would you like to proceed?

**Option 1: ✅ Merge PR** [Recommended if ready]
- Merge to $PR_BASE branch
- Close Linear issue as Done (if applicable)
- Delete feature branch (local and remote)

**Option 2: 🔧 Address Feedback** [If issues found]
- Fix blocking issues identified above
- Push updates to PR
- Re-run review after changes

**Option 3: 🔄 Request Additional Review** [If clarification needed]
- Add comment requesting specific input
- Tag reviewers for clarification

**Option 4: 📊 Show Detailed Analysis** [For investigation]
- View full PR diff
- Examine specific files
- Check CI logs

EOF

read -p "Select option (1-4): " USER_CHOICE
```

### Step 6: Execute Selected Option

#### Option 1: ✅ Merge PR

**Execute merge workflow:**

```bash
case $USER_CHOICE in
  1)
    echo "🔍 Running final pre-merge checks..."

    # Verify checks status
    if [[ "$CI_STATUS" == "failing" ]]; then
      echo "⚠️ Warning: Some CI checks failed"
      read -p "Continue with merge anyway? (y/N) " -n 1 -r
      echo
      [[ ! $REPLY =~ ^[Yy]$ ]] && { echo "Merge cancelled"; exit 1; }
    fi

    # Verify mergeable
    IS_MERGEABLE=$(gh pr view $PR_NUMBER --json mergeable -q .mergeable)
    if [[ "$IS_MERGEABLE" != "MERGEABLE" ]]; then
      echo "❌ PR is not mergeable (conflicts or branch protection)"
      exit 1
    fi

    echo "✅ Pre-merge validation complete"
    echo ""
    echo "🚀 Merging PR #$PR_NUMBER..."

    # Merge PR and delete remote branch
    gh pr merge $PR_NUMBER --delete-branch --merge

    # Capture merge details
    MERGE_COMMIT=$(gh pr view $PR_NUMBER --json mergeCommit -q .mergeCommit.oid)

    echo "✅ PR merged successfully"
    echo ""

    # Update local repository
    git checkout $PR_BASE
    git pull origin $PR_BASE

    # Delete local branch if it exists
    if git show-ref --verify --quiet "refs/heads/$PR_HEAD"; then
      git branch -D "$PR_HEAD"
      echo "✅ Local branch $PR_HEAD deleted"
    fi

    echo ""
    echo "## ✅ PR Merged Successfully"
    echo ""
    echo "### 📊 Merge Summary"
    echo "- **PR**: #$PR_NUMBER - $PR_TITLE"
    echo "- **URL**: $PR_URL"
    echo "- **Merged to**: $PR_BASE"
    echo "- **Commit**: $MERGE_COMMIT"
    echo "- **Branch**: $PR_HEAD (deleted ✅)"
    echo ""

    # Handle Linear issue if present
    if [[ -n "$LINEAR_ISSUE" ]]; then
      echo "### 📝 Linear Issue: $LINEAR_ISSUE"
      echo ""
      echo "Update Linear issue $LINEAR_ISSUE to 'Done' status:"
      echo "Use Linear MCP tools or update manually in Linear app"
      echo "Team ID: d1aae15e-d5b9-418d-a951-adcf8c7e39a8"
      echo ""
    fi

    echo "### 💡 Next Steps"
    echo "- Changes now live on $PR_BASE branch"
    echo "- Monitor for any deployment issues"
    echo "- Verify functionality works as expected"
    echo ""
    echo "---"
    echo "Merge complete 🎉"
    ;;

  2)
    echo ""
    echo "## 🔧 Address Feedback"
    echo ""
    echo "### Priority Items to Fix"
    echo ""

    # Show CI failures
    if [[ "$CI_STATUS" == "failing" ]]; then
      echo "**Failed CI Checks:**"
      echo -e "$FAILED_CHECKS"
      echo ""
    fi

    # Show Copilot/bot issues
    if [[ $SECURITY_COUNT -gt 0 || $QUALITY_COUNT -gt 0 ]]; then
      echo "**Copilot/Bot Issues:**"
      echo -e "$COPILOT_ISSUES"
      echo ""
    fi

    # Show critical comments
    if [[ $CRITICAL_COUNT -gt 0 ]]; then
      echo "**Critical Review Comments:**"
      echo -e "$CRITICAL_COMMENTS"
      echo ""
    fi

    # Show important comments
    if [[ $IMPORTANT_COUNT -gt 0 ]]; then
      echo "**Important Items:**"
      echo -e "$IMPORTANT_COMMENTS"
      echo ""
    fi

    echo "### Workflow"
    echo ""
    echo "1. Ensure on feature branch:"
    echo "   git checkout $PR_HEAD"
    echo "   git pull origin $PR_HEAD"
    echo ""
    echo "2. Fix issues systematically (critical first)"
    echo "   - Run: npm test"
    echo "   - Run: npm run typecheck"
    echo ""
    echo "3. Commit and push:"
    echo "   git add ."
    echo "   git commit -m \"fix: address PR review feedback\""
    echo "   git push origin $PR_HEAD"
    echo ""
    echo "4. Re-run this command:"
    echo "   /08-review-pr $PR_NUMBER"
    echo ""
    ;;

  3)
    echo ""
    echo "## 🔄 Request Additional Review"
    echo ""

    # Generate review request comment
    REVIEW_REQUEST="## 🔄 Additional Review Requested

Please review the following areas:

"

    # Add areas based on findings
    if [[ $IMPORTANT_COUNT -gt 0 ]]; then
      REVIEW_REQUEST+="**Design/Implementation Questions:**
$IMPORTANT_COMMENTS

"
    fi

    if [[ $IMPORTANT_COUNT -gt 0 ]]; then
      REVIEW_REQUEST+="**Important Items Needing Clarification:**
Please help clarify the $IMPORTANT_COUNT pending items.

"
    fi

    REVIEW_REQUEST+="Your input would be appreciated. Thank you!"

    # Post comment
    echo "Posting review request comment..."
    gh pr comment $PR_NUMBER --body "$REVIEW_REQUEST"

    echo "✅ Review request posted"
    echo ""
    echo "### ⏰ Next Steps"
    echo "1. Wait for reviewer responses"
    echo "2. Monitor PR: $PR_URL"
    echo "3. Address feedback as it comes in"
    echo "4. Re-run: /08-review-pr $PR_NUMBER"
    echo ""
    ;;

  4)
    echo ""
    echo "## 📊 Detailed Analysis Options"
    echo ""
    echo "### 1. View Full PR Diff"
    echo "   gh pr diff $PR_NUMBER"
    echo ""
    echo "### 2. Examine Specific Files"
    echo "Changed files:"
    gh pr diff $PR_NUMBER --name-only
    echo ""
    echo "To view file: gh pr diff $PR_NUMBER -- <file-path>"
    echo ""
    echo "### 3. View in Browser"
    echo "   gh pr view $PR_NUMBER --web"
    echo ""
    echo "### 4. Check CI Logs"
    echo "   gh pr checks $PR_NUMBER --web"
    echo ""
    echo "### 5. Checkout and Test Locally"
    echo "   gh pr checkout $PR_NUMBER"
    echo "   npm test"
    echo "   npm run typecheck"
    echo "   npm run build"
    echo ""
    echo "After investigation, re-run: /08-review-pr $PR_NUMBER"
    echo ""
    ;;

  *)
    echo "Invalid option. Please run command again and select 1-4."
    exit 1
    ;;
esac

```

## Expected Output

Succinct PR review report focused on merge readiness, blocking issues, and actionable recommendations.

## Error Handling

### PR Not Found

```

❌ Error: PR #[number] not found

Please verify:

- PR number is correct
- You have access to the repository
- GitHub CLI is authenticated: gh auth status

To list open PRs: gh pr list

```

### GitHub CLI Not Authenticated

```

❌ Error: GitHub CLI authentication required

Please authenticate:

```bash
gh auth login
```

Follow prompts to authenticate with GitHub.

```

### Linear Issue Reference Not Found

```

⚠️ Warning: No Linear issue reference found in PR

PR can still be reviewed and merged, but Linear tracking unavailable.

To add Linear reference, edit PR description to include:

- Fixes [ISSUE-ID]
- Closes [ISSUE-ID]
- Refs [ISSUE-ID]

```

### Checks Failing - Cannot Merge

```

❌ Cannot merge: CI checks failing

Failing checks:

- [Check 1]: [failure reason]
- [Check 2]: [failure reason]

Recommendation: Use Option 2 (Address Feedback) to fix checks

View details: gh pr checks [PR_NUMBER] --web

```

### Critical Comments Unresolved

```

❌ Cannot merge: Critical review comments unresolved

Blocking items:

- [File:line] - [Critical issue description]
- [File:line] - [Critical issue description]

Recommendation: Use Option 2 (Address Feedback) to resolve

View comments: [PR_URL]/files

```

### Merge Conflict

```

❌ Cannot merge: Merge conflicts detected

Conflicts in:

- [File 1]
- [File 2]

Resolution steps:

```bash
# Checkout PR branch
gh pr checkout [PR_NUMBER]

# Merge latest master
git fetch origin master  
git merge origin/master

# Resolve conflicts
# Edit conflicted files, then:
git add .  
git commit -m "fix: resolve merge conflicts"  
git push origin [feature-branch]
```

Then re-run: /08-review-pr [PR_NUMBER]

```


## Examples

### Basic Usage

```bash
/08-review-pr 42
```

**Result**: Comprehensive review of PR #42 with automated analysis, code quality assessment, and interactive merge decision

### With Linear Issue

```bash
/08-review-pr MCP-145
```

**Result**: Finds PR associated with Linear issue MCP-145, performs full review workflow, integrates Linear status updates

### After Addressing Feedback

```bash
/08-review-pr 42
```

**Result**: Re-validates PR after changes pushed, confirms fixes applied, assesses new merge readiness

## Usage Tips

1. **Run before every merge**: Always review PR status comprehensively before merging
2. **Check automated feedback**: Copilot and CI suggestions often identify real issues
3. **Validate all threads**: Ensure critical comments properly addressed or explicitly dismissed
4. **Re-run after changes**: Validate updates by re-running command after pushing fixes
5. **Clean workflow**: Use Option 2 systematically to address feedback in organized manner
6. **Branch cleanup**: Automatic deletion keeps repository clean post-merge
7. **Linear integration**: Note Linear issue ID for manual closure in Linear app
8. **Succinct reports**: Focus on merge readiness, not comprehensive analysis
9. **Two-tier validation**: Pattern-based detection filters noise, then deep investigation validates real issues and proposes independent solutions
10. **Independent analysis**: Claude provides its own solution recommendations, not blindly accepting Copilot's suggestions
11. **Factual language**: All outputs use neutral, factual language per project policy
