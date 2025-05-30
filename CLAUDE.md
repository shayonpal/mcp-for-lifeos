# Claude.md - Instructions for Claude AI

This file contains instructions and reminders for Claude AI when working with the LifeOS MCP server.

## Current Project Phase: OpenWebUI Integration POC

**Status**: OpenWebUI Integration Proof of Concept (POC) execution phase
**Goal**: Validate OpenWebUI + mcpo proxy + LifeOS MCP integration for mobile-first vault management
**Decision**: PWA development PAUSED pending OpenWebUI mobile experience validation

The current requirements are documented in `docs/01-current-poc/POC-OpenWebUI-Integration-PRD.md`. This PRD contains the complete POC specification and 21-issue implementation plan.

### Strategic Context
- **Approach**: OpenWebUI-first integration replacing custom web interface development
- **Architecture**: OpenWebUI (Port 3000) ← mcpo Proxy (Port 8000) ← LifeOS MCP (stdio)
- **Timeline**: 1-2 week POC → data-driven decision on custom PWA necessity
- **Milestone**: [OpenWebUI Integration POC](https://github.com/shayonpal/mcp-for-lifeos/milestone/2)

### Current POC Status (21 Issues)
- **Issue #47**: Install OpenWebUI via Docker → Status: Ready ✅ (can start immediately)
- **Issues #48-50**: Setup sequence (mcpo proxy, integration, performance baseline) → Sequential dependencies
- **Issues #31-37, #51**: Tool validation (all 18 MCP tools) → Parallel after setup
- **Issues #38-40**: Mobile experience testing → After setup + basic validation
- **Issues #41-42**: Error & stability testing → After tool validation
- **Issues #43-44**: Documentation → Can start early
- **Issues #45-46**: POC analysis & strategic docs → After all testing complete

### Key Documentation Files
- `docs/01-current-poc/Claude-Session-Onboarding.md` - Quick session startup prompt
- `docs/01-current-poc/POC-OpenWebUI-Integration-PRD.md` - Complete POC specification
- `docs/01-current-poc/POC-Dependencies-Analysis.md` - Issue dependency mapping
- `docs/02-strategic-docs/OpenWebUI-Integration-Strategy.md` - Strategic approach
- `docs/04-project-management/GitHub-Project-Setup-Assessment.md` - Project management setup

### Requirement Change Management

When feature specifications change during development:

1. **Update the PRD**: Log all changes in `docs/01-current-poc/POC-OpenWebUI-Integration-PRD.md` with:
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

### OpenWebUI Integration (Current POC)

The project is transitioning from custom web interface to OpenWebUI integration via mcpo proxy:

**POC Setup Commands:**
```bash
# 1. Install OpenWebUI via Docker (Issue #47)
docker run -d -p 3000:8080 -v open-webui:/app/backend/data --name open-webui --restart always ghcr.io/open-webui/open-webui:main

# 2. Install mcpo proxy (Issue #48)
uv tool install mcpo

# 3. Start mcpo proxy with LifeOS MCP server (Issue #48)
uvx mcpo --port 8000 -- node /Users/shayon/DevProjects/mcp-for-lifeos/dist/index.js

# 4. Configure OpenWebUI to use proxy endpoints (Issue #49)
# Access OpenWebUI at http://10.0.0.140:3000 and configure MCP integration
```

**Legacy Web Interface**: The built-in HTTP web interface (`ENABLE_WEB_INTERFACE=true`) is deprecated in favor of OpenWebUI integration.

**Mobile Testing**: POC includes comprehensive mobile PWA testing to validate OpenWebUI as mobile-first solution.

## POC Execution Guidelines

### Critical Success Factors
1. **Sequential Setup**: Issues #47→#48→#49→#50 MUST be completed in strict order
2. **Dependency Awareness**: Never advance issues to "Ready" status unless dependencies are met
3. **Mobile-First Validation**: Focus on mobile experience viability throughout testing
4. **Documentation Parallel**: Issues #43-44 can start early to capture setup knowledge
5. **Comprehensive Testing**: All 18 MCP tools must be validated through OpenWebUI interface

### GitHub Project Management
- **Project**: [Project #4 - MCP Server for Obsidian](https://github.com/users/shayonpal/projects/4)
- **Status Flow**: Backlog → Ready → In Progress → Done
- **Current Ready**: Issue #47 (Install OpenWebUI via Docker)

### Session Startup Protocol
For new Claude sessions, use: `docs/01-current-poc/Claude-Session-Onboarding.md`
This ensures immediate context and prevents development delays.