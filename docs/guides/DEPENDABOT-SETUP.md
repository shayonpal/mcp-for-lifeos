# Dependabot Setup Guide

This guide explains the Dependabot configuration for the MCP for LifeOS project and how to enable auto-merge for low-risk updates.

## Configuration Overview

The `.github/dependabot.yml` file configures automated dependency updates with the following strategy:

### Update Schedule

- **Frequency**: Weekly
- **Day**: Sunday
- **Time**: 6:00 PM Toronto time
- **Rationale**: End-of-weekend timing allows updates to be ready for review Monday morning

### Dependency Groups

#### npm Ecosystem

1. **Development Dependencies Group**
   - TypeScript, tsx, ESLint, type definitions
   - Grouped together for patch + minor updates
   - Single PR per update cycle

2. **Testing Framework Group**
   - Jest, ts-jest, @types/jest
   - Kept synchronized to avoid version conflicts
   - Single PR per update cycle

3. **Production Dependencies**
   - Each gets individual PRs
   - Better review granularity for critical dependencies
   - Includes MCP SDK, Fastify, YAML parsers, etc.

#### GitHub Actions Ecosystem

- All actions grouped together
- Separate from npm dependencies
- Single PR per update cycle

### Risk Management

- **Open PR Limit**: 5 concurrent PRs (npm) + 2 (GitHub Actions)
- **Versioning Strategy**: `increase-if-necessary` (application, not library)
- **Blocked Major Updates**: MCP SDK, Fastify, gray-matter, YAML (require manual review)

## Auto-Merge Configuration

The configuration is designed to support auto-merge for low-risk updates. However, auto-merge requires additional GitHub repository settings.

### What Should Auto-Merge

✅ **Automatically merge after CI passes:**

- Patch updates to development dependencies
- Patch updates to GitHub Actions
- **Minor updates to MCP SDK** (backward-compatible changes)

⚠️ **Require manual review:**

- All major version updates
- Minor/major updates to production dependencies (except MCP SDK)

### Enabling Auto-Merge

#### Option 1: GitHub CLI (Recommended)

Run these commands to enable auto-merge for specific dependency types:

```bash
# Enable auto-merge for Dependabot PRs with specific labels
gh pr list --author "app/dependabot" --json number --jq '.[] | .number' | while read pr; do
  gh pr merge "$pr" --auto --squash
done
```

You can create a GitHub Actions workflow to automatically enable auto-merge on Dependabot PRs.

#### Option 2: GitHub Actions Workflow

Create `.github/workflows/dependabot-auto-merge.yml`:

```yaml
name: Dependabot Auto-Merge
on: pull_request_target

permissions:
  pull-requests: write
  contents: write

jobs:
  dependabot:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - name: Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: "${{ secrets.GITHUB_TOKEN }}"

      - name: Enable auto-merge for patch updates
        if: |
          (steps.metadata.outputs.update-type == 'version-update:semver-patch' &&
           contains(github.event.pull_request.labels.*.name, 'dependencies')) ||
          (steps.metadata.outputs.update-type == 'version-update:semver-minor' &&
           steps.metadata.outputs.dependency-names == '@modelcontextprotocol/sdk')
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}

      - name: Approve PR
        if: |
          (steps.metadata.outputs.update-type == 'version-update:semver-patch' &&
           contains(github.event.pull_request.labels.*.name, 'dependencies')) ||
          (steps.metadata.outputs.update-type == 'version-update:semver-minor' &&
           steps.metadata.outputs.dependency-names == '@modelcontextprotocol/sdk')
        run: gh pr review --approve "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

This workflow:

1. Detects Dependabot PRs
2. Checks if the update is a patch (any dependency) or minor (MCP SDK only)
3. Approves and enables auto-merge if criteria are met
4. Waits for CI checks to pass before merging

#### Option 3: Manual Repository Settings

1. Go to repository **Settings** → **General** → **Pull Requests**
2. Enable "Allow auto-merge"
3. For each qualifying Dependabot PR:
   - Review the changes
   - Click "Enable auto-merge" button
   - Select "Squash and merge"

### Branch Protection (Optional)

To ensure auto-merge only happens after tests pass:

1. Go to **Settings** → **Branches** → **Branch protection rules**
2. Add rule for `master` branch:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - Select checks: `typecheck`, `integration-tests`
   - ✅ Require branches to be up to date before merging

This prevents auto-merge if CI fails.

## Monitoring Dependabot

### View Dependabot PRs

```bash
# List all open Dependabot PRs
gh pr list --author "app/dependabot"

# View details of a specific PR
gh pr view <PR_NUMBER>

# Check CI status
gh pr checks <PR_NUMBER>
```

### Manually Trigger Updates

Dependabot runs on schedule, but you can manually trigger updates:

1. Go to **Insights** → **Dependency graph** → **Dependabot**
2. Click "Last checked X minutes ago"
3. Click "Check for updates"

### Troubleshooting

**Dependabot not creating PRs?**

- Check `.github/dependabot.yml` syntax with [GitHub's validator](https://github.com/<your-username>/<repo>/network/updates)
- Verify Dependabot is enabled in repository settings
- Check Dependabot logs in the Dependency graph section

**Auto-merge not working?**

- Ensure "Allow auto-merge" is enabled in repository settings
- Verify branch protection rules don't block auto-merge
- Check if GitHub Actions workflow has proper permissions

**Too many PRs?**

- Adjust `open-pull-requests-limit` in dependabot.yml
- Close unwanted PRs with `@dependabot close` comment
- Add more dependencies to ignore list

## Best Practices

1. **Review First Week**: Manually review all PRs in the first week to ensure configuration works as expected
2. **Monitor CI**: Ensure your CI pipeline is reliable before enabling auto-merge
3. **Check Changelogs**: For production dependencies, review changelogs even for patch updates
4. **Update Schedule**: Sunday 6 PM gives you Monday morning to review any issues
5. **Security Updates**: Dependabot creates immediate PRs for security vulnerabilities (outside schedule)

## Configuration Changes

To modify the Dependabot configuration:

1. Edit `.github/dependabot.yml`
2. Commit and push changes
3. GitHub validates configuration automatically
4. Changes take effect on next scheduled run

Common adjustments:

- Change schedule: Modify `schedule.day` or `schedule.time`
- Add dependencies to groups: Add patterns to `groups.<group-name>.patterns`
- Block specific updates: Add to `ignore` list
- Adjust PR limits: Modify `open-pull-requests-limit`

## Related Documentation

- [GitHub Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Dependabot Configuration Reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference)
- [Auto-merge Pull Requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
