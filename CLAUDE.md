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

3. **Change Log Format**: Use this format in the PRD:
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