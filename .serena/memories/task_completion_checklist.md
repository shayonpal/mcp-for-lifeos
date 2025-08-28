# Task Completion Checklist

When completing any development task on the LifeOS MCP Server, follow this checklist:

## 1. Code Quality Verification
**CRITICAL**: Always run these commands before considering a task complete:

```bash
# Type checking (MANDATORY - this is the primary error checker)
npm run typecheck

# Linting (for style consistency)
npm run lint
```

## 2. Testing
Depending on the changes made:

```bash
# Run relevant tests
npm test                    # All tests
npm run test:unit          # For logic changes
npm run test:integration   # For feature changes
npm run test:tool-parity   # For tool modifications
```

## 3. Documentation Updates
If applicable:
- Update CHANGELOG.md (Keep a Changelog format)
- Update relevant documentation in docs/
- Update inline code comments if behavior changed

## 4. Configuration Check
If config-related:
- Ensure config.example.ts is updated
- Verify changes work with different config setups

## 5. Version Control
```bash
# Check your changes
git status
git diff

# Stage and commit (only when explicitly requested)
git add .
git commit -m "feat/fix/chore: descriptive message"
```

## 6. Special Considerations

### For Template Changes
- Clear template cache if needed
- Test with actual Obsidian vault
- Verify Templater syntax processing

### For Search/Query Changes
- Test with various query patterns
- Check performance with large vaults
- Verify relevance scoring

### For YAML/Frontmatter Changes
- Test YAML compliance
- Verify auto-managed fields protection
- Check with custom YAML rules

### For Analytics Changes
- Verify data persistence across restarts
- Check metrics accuracy
- Test dashboard visualization

## 7. Final Verification
Before marking complete:
1. ✅ No TypeScript errors (`npm run typecheck`)
2. ✅ Tests passing (if applicable)
3. ✅ Code follows project conventions
4. ✅ Changes work as intended
5. ✅ No regression in existing features

## Important Reminders
- **TypeScript errors must be fixed** - typecheck is non-negotiable
- **ES Module compatibility** - use import/export, not require()
- **Node 18+ features** - can use modern JavaScript
- **User config paths** - always respect user's config.ts settings