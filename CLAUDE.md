# Claude.md - Instructions for Claude AI

This file contains instructions and reminders for Claude AI when working with the LifeOS MCP server.

## Project Requirements

The requirements for this project, including the web interface feature, are documented in `docs/Web Interface - PRD.md`. This PRD contains the complete specification for the MVP implementation.

### Requirement Change Management

When feature specifications change during development:

1. **Update the PRD**: Log all changes in `docs/Web Interface - PRD.md` with:
   - Human-readable timestamps (e.g., "Updated January 15, 2025 at 3:30 PM")
   - Clear description of what changed and why
   - Impact assessment on existing implementation

2. **Update GitHub Issues**: For any changes that affect existing GitHub issues:
   - Update the relevant issue descriptions with new requirements
   - Add comments explaining the change with timestamps
   - Adjust acceptance criteria as needed
   - Update priority or dependencies if required

3. **Change Log Format**: Use this format in the PRD. Run the `date` command to get current timestamp:
   ```
   ## Change Log
   
   ### January 15, 2025 at 3:30 PM
   - **Changed**: API endpoint structure from REST to GraphQL
   - **Reason**: Better data fetching for complex queries
   - **Impact**: Affects Issues #10, #11 - backend API implementation
   - **GitHub Issues Updated**: #10, #11
   ```

### Change Management Best Practices

1. **Impact Assessment Matrix**: Before making changes, categorize them:
   - **Breaking**: Requires rework of existing code
   - **Additive**: New features that don't affect existing work
   - **Cosmetic**: UI/UX changes with minimal code impact

2. **Dependency Tracking**: When updating requirements:
   - Check which issues depend on the changed feature
   - Update dependency chains in GitHub issues
   - Consider if implementation order needs adjustment

3. **Version Control for Requirements**:
   - Use git to track PRD changes with meaningful commit messages
   - Tag major requirement versions (e.g., `requirements-v1.1`)
   - Reference git commits in GitHub issue updates

4. **Communication Protocol**:
   - Add a "Requirements Changed" label to affected GitHub issues
   - Use issue comments to explain how changes affect current work
   - Cross-reference between PRD changes and GitHub issues

## Version Management

The LifeOS MCP server follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Increment when making incompatible API changes
- **MINOR**: Increment when adding functionality in a backward compatible manner
- **PATCH**: Increment when making backward compatible bug fixes

### Versioning Process

1. When updating the server version, make sure to update:
   - `SERVER_VERSION` constant in `src/index.ts`
   - `version` field in `package.json`

2. Add the new version to the version history in the `get_server_version` tool response.

3. **Documentation Requirements**:
   - After any MAJOR version update, remind the user to update the README.md and other documentation
   - Suggest creating a GitHub Release for MAJOR and MINOR version updates
   - For PATCH updates, a simple commit is sufficient

### Version Release Guidelines

**For MAJOR updates (X.0.0):**
- Update all documentation
- Create comprehensive release notes
- Create a GitHub Release with detailed changelog
- Consider backward compatibility support

**For MINOR updates (0.X.0):**
- Update relevant documentation sections
- Create a GitHub Release with feature descriptions
- Test backward compatibility

**For PATCH updates (0.0.X):**
- Simple git commit is sufficient
- No GitHub Release needed unless fixing critical bugs

## Commands to Run

Always run these commands after version updates:

```bash
npm run build
npm run test (if available)
git add .
git commit -m "Bump version to X.Y.Z: [brief description]"
```

For MAJOR and MINOR updates, also suggest:
```bash
git tag vX.Y.Z
git push origin master --tags
```

## Git Commit Messages

**IMPORTANT**: Never include the following in commit messages:
- 🤖 Generated with [Claude Code](https://claude.ai/code)
- Co-Authored-By: Claude <noreply@anthropic.com>
- Any references to AI assistance or Claude

Keep commit messages professional and focused on the changes made.

## Post-Implementation Workflow

When a GitHub issue has been implemented and successfully tested, follow these steps before committing:

### 1. Documentation Updates
Update relevant documentation files as appropriate:
- **CHANGELOG.md**: Add entry for new features, fixes, or changes
- **README.md**: Update tool documentation, feature lists, or usage examples
- **CLAUDE.md**: Add any new development guidelines or patterns discovered

### 2. Acceptance Criteria Testing
Before marking an issue as complete, test against the acceptance criteria:
- **Review Acceptance Criteria**: Check if the GitHub issue contains acceptance criteria
- **Test Each Criterion**: Systematically test each acceptance criterion listed in the issue
- **Document Test Results**: Record which criteria pass/fail during testing
- **Update Issue Description**: Mark completed acceptance criteria as done using checkboxes (- [x])
- **Address Failures**: If any criteria fail, implement fixes before closing the issue

### 3. GitHub Issue Management
Act on the implemented issue appropriately:
- **Comment**: Add implementation details, test results, or relevant notes
- **Close**: Close the issue if fully implemented (use "fixes #X" in commit message)
- **Update Labels**: Add "completed" or remove "in-progress" labels
- **Link PR**: If creating a pull request, link it to the issue
- **Mark Duplicate**: If the issue duplicates another, mark and reference
- **Reopen**: If implementation revealed the issue wasn't fully resolved

### 4. Commit and Push
Only after completing documentation and issue management:
```bash
git add .
git commit -m "Implement feature: brief description (fixes #X)"
git push origin branch-name
```

### Example Workflow
```bash
# 1. Update documentation
# Edit CHANGELOG.md to add new feature entry
# Update README.md if new tools were added
# Update CLAUDE.md if new patterns were established

# 2. Test acceptance criteria (if present in issue)
# Check issue #26 for acceptance criteria
# Test each criterion systematically
# Update issue description to mark completed criteria as [x]

# 3. Comment on the issue with test results
gh issue comment 26 --body "Implemented move_items tool with full test coverage. All acceptance criteria verified: ✅ Single item moves ✅ Batch operations ✅ Folder merging ✅ Error handling"

# 4. Commit with issue reference
git add .
git commit -m "Add move_items tool for moving notes and folders (fixes #26)"
git push origin master

# 5. Close the issue (if not using "fixes" keyword)
gh issue close 26
```

## MCP Server Stdio Communication

**IMPORTANT**: MCP servers communicate via stdio (standard input/output) using JSON-RPC protocol. Any output to stderr (console.error) or stdout (console.log) that is not JSON-RPC will interfere with the protocol and cause connection failures.

### Key Rules for MCP Servers:

1. **Never use console.log or console.error** in production MCP server code
2. **All debug output must be suppressed** when running as an MCP server
3. **Only JSON-RPC messages should be sent to stdout**
4. **Error handling should be silent** - catch errors and handle them without logging

### Common Connection Issues:

- "Connection closed" error: Usually caused by non-JSON output to stdout/stderr
- "MCP error -32000": Often indicates protocol violation from debug logging
- Server fails to connect: Check for any console output during startup

### Debugging Tips:

- Use environment variables to conditionally enable debug logging
- Write debug logs to files instead of console when needed
- Test the server with `node dist/index.js` to see any console output that would break MCP

### Web Interface

The HTTP web interface is disabled by default to ensure MCP compatibility. To enable it:
- Set environment variable: `ENABLE_WEB_INTERFACE=true`
- Ensure port 19831 is not already in use
- Run the server with: `ENABLE_WEB_INTERFACE=true node dist/index.js`

**Note**: The web interface should only be enabled for testing/development, not when running as an MCP server.