---
name: 09-release
version: 1.0.0
description: Comprehensive release preparation with validation, documentation, and Linear integration
author: Shayon Pal
tags: [workflow, release, git, linear, documentation]
requires: [git, npm, linear-expert, git-expert]
argument_hint: [version] | [auto]
---

# 09-Release - Comprehensive Release Preparation & Publishing

Prepare and publish a new release with comprehensive validation, documentation updates, Linear integration, and GitHub release creation. Orchestrates existing agents (git-expert, linear-expert) and direct tools for coordinated release management.

## Purpose

Create a production-ready release for the MCP for LifeOS server with complete quality validation, documentation updates, Linear issue resolution, and GitHub release publication.

## Arguments

`$ARGUMENTS` expects: `[version|auto]`

**Format**:

- **Explicit version**: `v1.9.0`, `v2.0.0`, `v1.8.1` (must start with 'v' and follow semver)
- **Auto mode**: `auto` (determines version bump based on commit analysis)
- **Empty**: Defaults to `auto` mode

**Examples**:

```
/workflow:09-release v1.9.0     # Explicit version
/workflow:09-release auto       # Auto-detect version
/workflow:09-release            # Same as auto
```

## Language Policy

Use factual, neutral language throughout all outputs and Linear updates. Avoid superlatives (excellent, perfect, amazing, best, etc.). State facts and assessments objectively.

---

## Phase 1: Release Context & Version Determination

### Step 1: Validate Arguments and Parse Version

```bash
VERSION_ARG="${ARGUMENTS:-auto}"

echo "📋 Release Configuration"
echo "========================"
echo "Version argument: $VERSION_ARG"
echo ""

# Validate version format if not auto
if [ "$VERSION_ARG" != "auto" ]; then
  if ! echo "$VERSION_ARG" | grep -qE '^v[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo "❌ Error: Invalid version format"
    echo ""
    echo "Expected format: vX.Y.Z (e.g., v1.9.0)"
    echo "Or use 'auto' for automatic detection"
    exit 1
  fi
  echo "✅ Version format valid: $VERSION_ARG"
else
  echo "🔍 Auto-detection mode enabled"
fi
echo ""
```

### Step 2: Get Last Release Tag

```bash
echo "🏷️  Analyzing git history..."
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")

if [ "$LAST_TAG" = "v0.0.0" ]; then
  echo "⚠️  No previous release tags found (first release)"
else
  echo "📌 Last release: $LAST_TAG"
fi

# Get commit count since last release
COMMIT_COUNT=$(git rev-list ${LAST_TAG}..HEAD --count 2>/dev/null || echo "0")
echo "📊 Commits since last release: $COMMIT_COUNT"
echo ""

if [ "$COMMIT_COUNT" = "0" ]; then
  echo "❌ Error: No commits since last release"
  echo "Nothing to release"
  exit 1
fi
```

### Step 3: Analyze Changes Since Last Release

Use **git-expert** agent to analyze commit history:

```
Agent: git-expert
Task: Analyze commits since last release for version determination

Please:
1. Run: git log ${LAST_TAG}..HEAD --oneline --no-merges
2. Categorize commits by type:
   - Breaking changes (BREAKING CHANGE in commit body)
   - Features (feat: prefix)
   - Fixes (fix: prefix)
   - Chores (chore: prefix)
   - Docs (docs: prefix)
   - Tests (test: prefix)
3. Extract Linear issue IDs (pattern: MCP-XXX)
4. Show file statistics: git diff ${LAST_TAG}..HEAD --stat
5. Provide structured summary for version bump recommendation
```

### Step 4: Determine Version Bump

```bash
# If auto mode, determine version based on commit analysis
if [ "$VERSION_ARG" = "auto" ]; then
  echo "🤔 Determining version bump..."
  echo ""
  echo "Based on commit analysis:"
  echo "- Breaking changes → Major bump (X.0.0)"
  echo "- New features → Minor bump (X.Y.0)"
  echo "- Bug fixes only → Patch bump (X.Y.Z)"
  echo ""

  # Parse current version
  CURRENT_VERSION="${LAST_TAG#v}"
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

  # User will review git-expert analysis and decide
  # For now, provide recommendation based on commit types
  # Actual version will be confirmed in checkpoint
fi
```

### Checkpoint 1: Version Confirmation

Display proposed version and request confirmation from user:

```
╔════════════════════════════════════════════╗
║  Release Version Confirmation              ║
╚════════════════════════════════════════════╝

📋 Change Summary:
- Commits: [count]
- Breaking Changes: [count]
- Features: [count]
- Fixes: [count]
- Linear Issues: [detected IDs]

📌 Last Release: $LAST_TAG
🎯 Proposed Version: $PROPOSED_VERSION

Rationale: [Based on semantic versioning rules]

❓ Confirm version or specify different version:
   • Type 'yes' to confirm $PROPOSED_VERSION
   • Type version number (e.g., v1.9.0) to override
   • Type 'cancel' to abort release
```

**Wait for user response and set `RELEASE_VERSION` variable.**

---

## Phase 2: Change Analysis & Impact Assessment

### Step 5: Detailed Commit Categorization

Use **git-expert** agent for detailed analysis:

```
Agent: git-expert
Task: Generate comprehensive change report for release notes

Please:
1. Group commits by category (breaking/feat/fix/docs/chore/test)
2. For each category, list commits with:
   - Short summary
   - Linear issue ID (if present)
   - Files affected
3. Identify breaking changes explicitly
4. Note performance-related changes
5. Highlight security-related fixes
6. Format as structured markdown for CHANGELOG
```

### Step 6: Linear Issue Analysis

Use **linear-expert** agent to enrich issue context:

```
Agent: linear-expert
Task: Fetch details for Linear issues detected in commits

Linear Issue IDs: [from git-expert analysis]
Team ID: d1aae15e-d5b9-418d-a951-adcf8c7e39a8

Please:
1. For each issue ID, fetch:
   - Full title
   - Current status
   - Priority
   - Labels
   - Project association
2. Verify all issues belong to MCP for LifeOS team
3. Flag any issues not in "Done" or completed state
4. Provide structured table for user review
```

### Step 7: Strategic Context Assessment

```bash
echo "🎯 Strategic Context Review"
echo "==========================="
echo ""

# Check if CURRENT-FOCUS.md exists and needs updating
if [ -f "docs/CURRENT-FOCUS.md" ]; then
  echo "📄 Reviewing CURRENT-FOCUS.md for alignment..."
  echo ""
  echo "⚠️  Manual review required:"
  echo "   Does this release affect documented cycle priorities?"
  echo "   Should CURRENT-FOCUS.md be updated after release?"
  echo ""
else
  echo "ℹ️  No CURRENT-FOCUS.md found (skipping strategic review)"
  echo ""
fi
```

### Step 8: Impact Summary

Display comprehensive impact assessment:

```
╔════════════════════════════════════════════╗
║  Release Impact Assessment                 ║
╚════════════════════════════════════════════╝

📊 Scope:
- Files Changed: [count]
- Lines Added: [+count]
- Lines Removed: [-count]
- Tests Modified: [count]

📋 Changes by Type:
- Breaking Changes: [count]
- New Features: [count]
- Bug Fixes: [count]
- Documentation: [count]
- Performance: [count]

🎯 Strategic Impact:
- CURRENT-FOCUS Alignment: [needs update / aligned / N/A]
- Cycle Goals: [affected / on track]
```

### Checkpoint 2: Change Summary Approval

Prompt user for approval before proceeding:

```
❓ Review the change analysis above.

   • Type 'yes' to proceed with release
   • Type 'no' to abort and revise changes
```

---

## Phase 3: Pre-Release Quality Validation

### Step 9: TypeScript Validation

```bash
echo "🔍 Phase 3: Quality Validation"
echo "=============================="
echo ""
echo "Running TypeScript validation..."

npm run typecheck

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ TypeScript validation failed"
  echo ""
  echo "Release cannot proceed with type errors."
  echo "Fix errors and restart release process."
  exit 1
fi

echo "✅ TypeScript validation passed"
echo ""
```

### Step 10: Build Verification

```bash
echo "🔨 Building project..."

npm run build

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Build failed"
  echo ""
  echo "Release cannot proceed with build errors."
  echo "Fix errors and restart release process."
  exit 1
fi

echo "✅ Build successful"
echo ""
```

### Step 11: Test Suite Validation

```bash
echo "🧪 Running full test suite..."
echo "This may take a few moments..."
echo ""

npm test

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ Test suite failed"
  echo ""
  echo "Release cannot proceed with failing tests."
  echo "Fix test failures and restart release process."
  exit 1
fi

echo ""
echo "✅ All tests passed"
echo ""
```

### Step 12: Quality Summary

```
╔════════════════════════════════════════════╗
║  Quality Validation Results                ║
╚════════════════════════════════════════════╝

✅ TypeScript: Clean (no errors)
✅ Build: Successful
✅ Tests: All passing

Release quality gates: PASSED
```

### Checkpoint 3: Quality Gates Passed

All quality gates must pass to proceed. No user confirmation needed - automatic progression.

---

## Phase 4: Documentation Updates

### Step 13: Simplify Unreleased CHANGELOG Entries

Read and condense the detailed unreleased section to match the style of previous releases:

**Analysis required:**

1. Read current CHANGELOG.md unreleased section
2. Identify detailed entries with timestamps, file paths, test counts, implementation details
3. Compare with released sections (2.0.1, 2.0.0, 1.8.0) for target style

**Simplification rules:**

- **Remove**: Timestamps, file paths, detailed sub-bullets, test statistics, performance metrics
- **Keep**: Linear issue IDs, high-level feature descriptions, breaking change notices
- **Condense**: Multi-paragraph entries into 1-2 sentence summaries
- **Style**: Match previous releases (brief, action-focused bullets)

**Example transformation:**

Before (verbose):

```markdown
- **Frontmatter Link Scanning** (MCP-110, 2025-11-03 11:16): Enhanced LinkScanner to optionally scan and update wikilinks in YAML frontmatter during rename operations, resolving edge case where notes with frontmatter-only links were not discovered
  - Added `skipFrontmatter: false` parameter to LinkScanner in `src/modules/links/link-updater.ts` scanAndGroupReferences() for metadata consistency
  - Modified `scanNoteForLinks()` in `src/modules/links/link-scanner.ts` to read raw file content when frontmatter scanning enabled
  - Full test suite: 724/728 tests passing (99.5% pass rate, 4 skipped unrelated)
```

After (concise):

```markdown
- Enhanced LinkScanner to scan and update wikilinks in YAML frontmatter during rename operations (MCP-110).
```

**Simplification Algorithm:**

For each unreleased entry, apply these transformations:

1. **Extract Core Elements:**
   - What changed (the feature/fix/change itself)
   - Why it matters (user/developer impact in 5-10 words)
   - Linear issue ID (MCP-XXX format)
   - Category (Added/Changed/Fixed/Removed)

2. **Remove These Elements:**
   - Timestamps and dates
   - File paths and code locations
   - Implementation details (method names, class names)
   - Test statistics and pass rates
   - Sub-bullets and detailed breakdowns
   - Performance metrics and numbers
   - Code snippets and examples

3. **Condense to 1-2 Sentences:**
   - Start with action verb (Added, Fixed, Enhanced, etc.)
   - State what changed at feature level
   - Add brief impact if not obvious
   - End with Linear issue ID in parentheses
   - Use period after issue ID

4. **Quality Checks:**
   - Does it answer "What changed?"
   - Is impact clear to users/developers?
   - Is it 1-2 sentences maximum?
   - Does it match style of v2.0.1, v2.0.0 releases?
   - No technical jargon unless necessary?

**Process:**

1. Read current CHANGELOG.md unreleased section
2. Read 2-3 previous release sections (v2.0.1, v2.0.0) for style reference
3. For each verbose entry, apply simplification algorithm above
4. Edit CHANGELOG.md to replace verbose entries with simplified versions
5. Preserve category structure (Added, Changed, Documentation, Fixed, Removed)
6. Verify each entry follows pattern: `- {Action verb} {what} {brief why} ({MCP-XXX}).`

### Step 14: Update CHANGELOG.md Version

Update CHANGELOG directly using Read and Edit tools:

```bash
# Context for update:
# - Current version: $LAST_TAG
# - New version: $RELEASE_VERSION
# - Release date: $(date +%Y-%m-%d)
# - Changes: [now simplified in Step 13]
# - Linear issues: [from linear-expert analysis in Phase 2]

# Read current CHANGELOG.md (with simplified unreleased section)
# Then Edit to:
# 1. Move [Unreleased] section to new version heading
# 2. Format: ## [$RELEASE_VERSION] - $(date +%Y-%m-%d)
# 3. Follow Common Changelog style (NOT Keep a Changelog)
# 4. Include categories: Added/Changed/Fixed/Removed
# 5. Reference Linear issue IDs in entries (already simplified)
# 6. Maintain existing format and style
# 7. Ensure proper markdown structure
# 8. Preserve rest of CHANGELOG unchanged

# Note: This project uses Common Changelog format

# Use Read tool first to get current content
# Then Edit tool to make the updates
```

### Step 15: Update package.json Version

```bash
echo "📦 Updating package.json version..."

# Get current version from package.json
CURRENT_PKG_VERSION=$(node -p "require('./package.json').version")
echo "Current package.json version: v$CURRENT_PKG_VERSION"

# New version without 'v' prefix
NEW_PKG_VERSION="${RELEASE_VERSION#v}"
echo "New package.json version: v$NEW_PKG_VERSION"

# Update package.json using node
node -e "
const fs = require('fs');
const pkg = require('./package.json');
pkg.version = '$NEW_PKG_VERSION';
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
"

echo "✅ package.json updated"
echo ""
```

### Step 16: Check and Update README.md

Analyze release changes to determine if README.md needs updates, and fix any inconsistencies.

**Change Analysis for README Update:**

Review the simplified CHANGELOG entries from Step 13 to identify changes that warrant README updates:

1. **New Features** → Update "Features" section
2. **New Tools** → Update "Available Tools" section
3. **Breaking Changes** → Update relevant sections with migration notes
4. **Platform Support Changes** → Update "Platform Support" section
5. **Configuration Changes** → Update "Configuration" section
6. **Template Changes** → Update "Template System" section

**Inconsistency Checks:**

Before making changes, scan README.md for these common inconsistencies:

1. **Version References:**
   - "Last updated" date should match release date
   - Version numbers in examples should be current
   - Links to specific version tags should be updated

2. **Feature Lists:**
   - Features mentioned match actual tool capabilities
   - Tool counts are accurate (e.g., "13 tools", "24 tools")
   - Deprecated features are marked or removed

3. **Documentation Links:**
   - All internal links point to existing files
   - Guide references match actual guide titles
   - No broken markdown links

4. **Configuration Examples:**
   - JSON examples use correct syntax
   - Environment variables match actual implementation
   - Path examples are realistic

5. **Tool Names:**
   - Tool names match current API (e.g., `create_note` not `create_note_smart`)
   - Legacy aliases properly noted if mentioned
   - Tool descriptions accurate

**Update Decision Logic:**

```bash
# Determine if README needs updating
README_NEEDS_UPDATE=false

# Check for feature additions
if grep -q "^### Added" CHANGELOG.md | head -1; then
  README_NEEDS_UPDATE=true
fi

# Check for breaking changes
if grep -q "BREAKING" CHANGELOG.md; then
  README_NEEDS_UPDATE=true
fi

# Check for tool changes
if grep -qE "(tool|create_note|search|list)" CHANGELOG.md; then
  README_NEEDS_UPDATE=true
fi

if [ "$README_NEEDS_UPDATE" = "true" ]; then
  echo "📝 README.md update required based on release changes"
else
  echo "ℹ️  README.md update not required (no user-facing changes)"
  echo "   Performing consistency checks only..."
fi
```

**Update Process:**

1. **Read current README.md** to understand structure
2. **Read simplified CHANGELOG** from Step 13 for changes
3. **Identify sections needing updates:**
   - Map CHANGELOG entries to README sections
   - Note any breaking changes requiring callouts
   - Identify feature additions/removals

4. **Fix inconsistencies found during scan:**
   - Update "Last updated" date to release date
   - Correct tool counts if changed
   - Fix any broken or outdated links
   - Update configuration examples if API changed
   - Correct tool names to match current API

5. **Apply updates matching existing style:**
   - Preserve markdown formatting (headings, lists, code blocks)
   - Maintain section order and structure
   - Keep existing writing tone and style
   - Use emojis consistently with existing pattern
   - Follow existing link format (inline vs reference)

6. **Quality verification:**
   - All sections still readable and accurate
   - No duplicate information
   - Links are valid
   - Code examples are correct
   - Version references updated

**Example Update Scenarios:**

**Scenario 1: New Tool Added**

```markdown
CHANGELOG: "- Added universal search tool with auto-routing (MCP-123)."

README Update:
- Add to "Available Tools" → "Recommended: Consolidated Tools"
- Update tool count in configuration section
- Add example usage if significant
```

**Scenario 2: Breaking Change**

```markdown
CHANGELOG: "- Renamed create_note_smart to create_note (MCP-60)."

README Update:
- Update all tool name references
- Add note about legacy alias in Tool Mode Configuration
- Update code examples with new name
```

**Scenario 3: Inconsistency Found**

```markdown
Issue: README shows "Last updated: 2025-11-03" but release is 2025-11-05

Fix: Update to "Last updated: 2025-11-05"
```

If no changes warranted and no inconsistencies found, skip editing README.md.

### Step 17: Review Documentation Changes

```bash
echo "📄 Documentation changes:"
echo "========================"
echo ""

# Show CHANGELOG diff
echo "CHANGELOG.md changes:"
git diff CHANGELOG.md | head -50

echo ""
echo "package.json version:"
git diff package.json | grep '"version"'

echo ""
echo "README.md changes (if any):"
if git diff --quiet README.md; then
  echo "No changes to README.md"
else
  git diff README.md | head -50
fi

echo ""
```

### Checkpoint 4: Documentation Review

Prompt user to review and confirm documentation changes:

```
❓ Review the documentation updates above.

   • Type 'yes' to confirm and proceed
   • Type 'no' to abort and make manual edits
```

---

## Phase 5: Linear Issue Resolution (Review-First)

### Step 18: Display Detected Linear Issues

Use **linear-expert** agent to show issue table:

```
Agent: linear-expert
Task: Display Linear issues for release confirmation

Linear Issue IDs: [from Phase 2 analysis]
Team ID: d1aae15e-d5b9-418d-a951-adcf8c7e39a8

Please display table:

╔════════════════════════════════════════════════════════════╗
║  Linear Issues in This Release                             ║
╚════════════════════════════════════════════════════════════╝

| Issue ID | Title | Status | Commits |
|----------|-------|--------|---------|
| MCP-XXX  | ...   | Done   | 3       |
| MCP-YYY  | ...   | Done   | 1       |

Total: [count] issues
```

### Checkpoint 5: Linear Issues Confirmation

Prompt user to confirm Linear issue updates:

```
❓ Review the Linear issues above.

These issues will be marked as "Released in $RELEASE_VERSION"

   • Type 'yes' to confirm and update all issues
   • Type 'no' to skip Linear updates (handle manually)
   • Type specific issue IDs (comma-separated) to update only those
```

### Step 19: Update Linear Issues

Use **linear-expert** agent to update confirmed issues:

```
Agent: linear-expert
Task: Update Linear issues for release $RELEASE_VERSION

Issues to update: [from user confirmation]
Team ID: d1aae15e-d5b9-418d-a951-adcf8c7e39a8

For each issue, please:
1. Add comment:
   "✅ Released in $RELEASE_VERSION

   Release: [GitHub release URL will be added in Phase 6]
   Date: $(date +%Y-%m-%d)"

2. Update status:
   - If status is "Done" → keep as "Done"
   - If status is "In Review" → change to "Done"
   - Add "released" label if available

3. Report success/failure for each issue
```

---

## Phase 6: Git Tag & GitHub Release

### Step 20: Create Annotated Git Tag

Use **git-expert** agent to create and push tag:

```
Agent: git-expert
Task: Create annotated git tag for release $RELEASE_VERSION

Please:
1. Create annotated tag with release notes from CHANGELOG
2. Tag name: $RELEASE_VERSION
3. Tag message: Extract from CHANGELOG for this version
4. Push master branch to origin
5. Push tag to origin: git push origin $RELEASE_VERSION
6. Verify tag pushed successfully
7. Report tag SHA and push status
```

### Step 21: Create GitHub Release

```bash
echo "📦 Creating GitHub Release..."
echo ""

# Extract CHANGELOG section for this version
RELEASE_NOTES=$(awk "/^## \[${RELEASE_VERSION#v}\]/,/^## \[/" CHANGELOG.md | sed '$d')

# Create GitHub release using gh CLI
gh release create "$RELEASE_VERSION" \
  --title "$RELEASE_VERSION" \
  --notes "$RELEASE_NOTES" \
  --verify-tag

if [ $? -eq 0 ]; then
  RELEASE_URL=$(gh release view "$RELEASE_VERSION" --json url --jq .url)
  echo "✅ GitHub release created: $RELEASE_URL"
  echo ""
else
  echo "⚠️  GitHub release creation failed"
  echo "Tag has been pushed successfully."
  echo "Create release manually at: https://github.com/shayonpal/mcp-for-lifeos/releases/new"
  echo ""
  RELEASE_URL="[Manual creation required]"
fi
```

### Step 22: Update Linear Issues with Release URL

Use **linear-expert** agent to add release URL to Linear comments:

```
Agent: linear-expert
Task: Update Linear issue comments with GitHub release URL

Issues: [from Phase 5]
Release URL: $RELEASE_URL

For each issue updated in Step 19:
1. Edit the release comment to include GitHub release link
2. Format: "Release: $RELEASE_URL"
```

### Checkpoint 6: Git Operations Complete

No user confirmation needed - automatic progression if successful.

---

## Phase 7: Release Summary & Next Steps

### Step 23: Comprehensive Release Summary

```bash
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║  ✅ Release $RELEASE_VERSION Complete                      ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
```

Display detailed summary:

```
📊 Release Statistics
=====================
Version: $RELEASE_VERSION
Previous: $LAST_TAG
Date: $(date +%Y-%m-%d)

Changes:
- Linear Issues Resolved: [count]
- Commits: $COMMIT_COUNT
- Files Changed: [count from git diff stat]
- Lines Added: [+count]
- Lines Removed: [-count]

Changes by Type:
- Breaking Changes: [count]
- New Features: [count]
- Bug Fixes: [count]
- Documentation: [count]
- Chores: [count]

🔍 Quality Validation
=====================
✅ TypeScript: Clean (no errors)
✅ Build: Successful
✅ Tests: All passing ([test count] tests)

📝 Documentation
================
✅ CHANGELOG.md: Updated with release notes
✅ package.json: Version bumped to $RELEASE_VERSION

🔗 Release Artifacts
====================
✅ Git Tag: $RELEASE_VERSION
✅ GitHub Release: $RELEASE_URL
✅ Linear Issues: [count] updated

📋 Linear Issues Included
==========================
[List of Linear issue IDs with titles]

💡 Next Steps
=============
1. Announce release (if applicable)
   - Update relevant channels/forums
   - Notify users of significant changes

2. Monitor MCP server integration
   - Verify Claude Desktop compatibility
   - Check Raycast integration
   - Monitor for user feedback

3. Update deployment documentation (if needed)
   - Installation guides
   - Migration instructions
   - Breaking change notifications

🎯 Strategic Context
====================
CURRENT-FOCUS Impact: [needs update / aligned / N/A]
```

### Step 24: Archive Release Information

```bash
# Create release archive directory if needed
mkdir -p .claude/releases

# Archive release summary
cat > .claude/releases/release-${RELEASE_VERSION}.md << EOF
# Release $RELEASE_VERSION

**Date**: $(date +%Y-%m-%d)
**Previous Version**: $LAST_TAG

## Summary
[Auto-generated from above summary]

## Linear Issues
[List of issue IDs]

## Links
- GitHub Release: $RELEASE_URL
- Git Tag: $RELEASE_VERSION
EOF

echo ""
echo "📦 Release information archived to: .claude/releases/release-${RELEASE_VERSION}.md"
echo ""
```

---

## Error Handling & Recovery

### Missing/Invalid Version

```
❌ Error: Invalid version format

Expected: vX.Y.Z (e.g., v1.9.0) or 'auto'
Received: $VERSION_ARG

Fix: Provide valid version or use auto-detection
```

### Quality Gate Failures

```
❌ Error: [Quality Gate Name] failed

Release cannot proceed with quality issues.

Recovery steps:
1. Review errors above
2. Fix identified issues
3. Commit fixes
4. Restart release process: /workflow:09-release $RELEASE_VERSION
```

### Linear API Failures

```
⚠️  Warning: Linear API unavailable

Release will proceed without Linear updates.

Manual steps required:
1. Update Linear issues manually after release
2. Add release comment: "Released in $RELEASE_VERSION"
3. Link to GitHub release: $RELEASE_URL
```

### Git Push Failures

```
❌ Error: Git push failed

Recovery steps:
1. Check network connection
2. Verify git credentials
3. Check branch protection rules
4. Retry push: git push origin master && git push origin $RELEASE_VERSION

Rollback (if needed):
1. Delete local tag: git tag -d $RELEASE_VERSION
2. Fix underlying issue
3. Restart release process
```

### GitHub Release Failures

```
⚠️  Warning: GitHub release creation failed

Git tag has been pushed successfully: $RELEASE_VERSION

Manual steps:
1. Go to: https://github.com/shayonpal/mcp-for-lifeos/releases/new
2. Select tag: $RELEASE_VERSION
3. Copy release notes from CHANGELOG.md
4. Publish release
5. Update Linear issues with release URL
```

---

## Examples

### Example 1: Auto-detect Version

```bash
/workflow:09-release auto
# or simply
/workflow:09-release
```

**Process**:

1. Analyzes commits since last release
2. Detects breaking changes → suggests major bump
3. User confirms v2.0.0
4. Proceeds with full release workflow

### Example 2: Explicit Version

```bash
/workflow:09-release v1.9.0
```

**Process**:

1. Validates version format
2. Uses explicit version v1.9.0
3. Proceeds with full release workflow

### Example 3: Patch Release

```bash
/workflow:09-release v1.8.1
```

**Process**:

1. Quick patch release
2. Likely bug fixes only
3. Minimal changes in CHANGELOG
4. Fast quality validation

---

## Notes

- **Branch Workflow**: Creates tag directly on master branch (current MCP workflow)
- **Testing Scope**: Standard suite (typecheck + build + test)
- **Linear Integration**: Review-first approach with user confirmation
- **Changelog Format**: Common Changelog (not Keep a Changelog)
- **Language Policy**: Factual, neutral language throughout
- **Team Context**: Linear team ID `d1aae15e-d5b9-418d-a951-adcf8c7e39a8`

---

## Integration with Workflow Commands

This command is the final step in the development workflow:

1. `/workflow:01-plan` - Plan implementation
2. `/workflow:02-stage` - Create contracts
3. `/workflow:03-execute` - Implement code
4. `/workflow:04-code-review` - Review code
5. `/workflow:05-test` - Test implementation
6. `/workflow:06-document` - Update docs
7. `/workflow:07-commit-push` - Commit & push
8. `/workflow:08-review-pr` - Review PR
9. **`/workflow:09-release`** ← Final release & publish
