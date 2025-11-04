# Modularization Project Execution Prompt

**Branch**: `feature/modularize-core-mcp-layout`  
**Project**: Modularize Core MCP Source Layout  
**Issues**: MCP-133 through MCP-147 (15 issues)  
**Timeline**: 10-12 days (51 hours total)

---

## Execution Instructions

Work through the 15 issues sequentially in the feature branch `feature/modularize-core-mcp-layout`. After completing each issue:

1. Run full test suite
2. Commit changes with descriptive message
3. Continue to next issue in same branch
4. Final PR submission only after all 15 issues complete

---

## Issue Execution Workflow

For each issue (MCP-133 through MCP-147), follow this workflow:

### Step 1: Start Issue

```bash
# Update Linear issue status to "In Progress"
# Read issue description and acceptance criteria
```

### Step 2: Implementation

```bash
# Implement the changes specified in the Linear issue
# Follow acceptance criteria exactly
# Maintain coding standards and patterns
```

### Step 3: Testing Protocol (MANDATORY)

**Run tests in this exact order:**

```bash
# 1. Type checking (MUST PASS)
npm run typecheck

# 2. Circular dependency check (MUST PASS - starting from MCP-134)
npm run check:circular

# 3. Unit tests (MUST PASS)
npm run test:unit

# 4. Integration tests (MUST PASS)
npm run test:integration

# 5. Full test suite (MUST PASS - baseline: 724/728)
npm test

# 6. Build verification (MUST SUCCEED)
npm run build
```

**Critical Validation Points:**

- All type errors resolved (zero TypeScript errors)
- No circular dependencies detected
- Test count stable: 724/728 tests passing
- Build completes without errors
- No new warnings introduced

### Step 4: Smoke Testing (Issues 4.6, 5.1, 5.2, 6.1, 8.1 ONLY)

These issues require manual smoke testing:

```bash
# Start MCP server
npm run dev

# In another terminal, test with Claude Desktop:
# 1. Connect to MCP server
# 2. Execute 5+ representative tool calls:
#    - create_note (template auto-detection)
#    - search (with various query types)
#    - edit_note (frontmatter updates)
#    - insert_content (various targets)
#    - rename_note (with link updates - Issue 5.1 only)
#    - get_daily_note (creation + existing)
# 3. Verify all tools work correctly
# 4. Check analytics dashboard: http://localhost:19832
```

**Smoke Test Checklist:**

- [ ] Server starts without errors
- [ ] All tested tools return expected results
- [ ] No runtime exceptions in logs
- [ ] Analytics dashboard displays data
- [ ] File operations persist correctly

### Step 5: Commit Changes

```bash
# Stage all changes
git add .

# Commit with descriptive message following this format:
git commit -m "feat(module): [issue-id] brief description

- Detailed change 1
- Detailed change 2
- Detailed change 3

Acceptance criteria met:
- [x] Criterion 1
- [x] Criterion 2
- [x] Criterion 3

Tests: 724/728 passing
Issue: [Linear issue URL]"

# Example for MCP-133:
git commit -m "feat(structure): MCP-133 create modular directory scaffolding

- Created src/modules/ subdirectories (templates, yaml, search, files, links, transactions, analytics)
- Created src/app/ and src/shared/ directories
- Created var/ for runtime artifacts (logs, metrics, analytics)
- Added .gitkeep files to empty directories
- Added var/ to .gitignore

Acceptance criteria met:
- [x] All directories created
- [x] var/ ignored in git
- [x] npm run typecheck passes
- [x] npm test passes (724/728)
- [x] No functional changes

Tests: 724/728 passing
Issue: https://linear.app/agilecode-studio/issue/MCP-133"
```

### Step 6: Update Linear Issue

```bash
# Mark Linear issue as "Done"
# Add comment with commit SHA and test results
```

### Step 7: Continue to Next Issue

```bash
# Proceed immediately to next issue in sequence
# NO push to remote until all 15 issues complete
# NO branch switching - stay in feature/modularize-core-mcp-layout
```

---

## Sequential Issue Execution Plan

### Phase 1: Foundation (4 hours)

**MCP-133: Create modular directory scaffolding (2h)**

- Create directory structure
- Add .gitkeep files
- Update .gitignore
- **Tests**: typecheck, full suite (no circular check yet)
- **Smoke test**: Not required

**MCP-134: Import policy & circular dependency checks (2h)**

- Install madge: `npm install --save-dev madge`
- Add script: `"check:circular": "madge --circular --extensions ts src/"`
- Document import policy in docs/ARCHITECTURE.md
- Communicate freeze window
- **Tests**: typecheck, circular, full suite
- **Smoke test**: Not required

### Phase 2: Templates & YAML (5 hours)

**MCP-135: Move template system (3h)**

- Move 4 files to modules/templates/
- Create barrel export
- Update 6-8 import statements
- Update docs/tools/create_note.md
- **Tests**: All tests + circular check
- **Smoke test**: Not required

**MCP-136: Move YAML processing (2h)**

- Move 1 file to modules/yaml/
- Create barrel export
- Update 4-5 import statements
- Update .serena/memories/obsidian_integration.md
- **Tests**: All tests + circular check
- **Smoke test**: Not required

### Phase 3: Search & NLP (5 hours)

**MCP-137: Move search engine & query parser (3h)**

- Move 2 files to modules/search/
- Create barrel export
- Update 5-6 import statements
- Update docs/tools/search.md
- **Tests**: All tests + circular check
- **Smoke test**: Not required

**MCP-138: Move NLP & response truncator (2h)**

- Move 2 files to modules/search/
- Update barrel export
- Update 3-4 import statements
- Update .serena/memories/performance_search_patterns.md
- **Tests**: All tests + circular check
- **Smoke test**: Not required

### Phase 4: Vault Decomposition ⚠️ CRITICAL PATH (18 hours)

**MCP-139: Extract file I/O operations (3h)**

- Create modules/files/file-io.ts (7 methods)
- Update vault-utils.ts to import
- Add unit tests for retry logic
- Verify iCloud retry still works
- **Tests**: All tests + circular check
- **Smoke test**: Not required

**MCP-140: Extract note CRUD operations (3h)**

- Create modules/files/note-crud.ts (6 methods)
- Update vault-utils.ts to import/re-export
- Add unit tests for CRUD
- **Tests**: All tests + circular check
- **Smoke test**: Not required

**MCP-141: Extract daily note operations (2h)**

- Create modules/files/daily-note-service.ts (3 methods)
- Update vault-utils.ts to import/re-export
- Add unit tests
- **Tests**: All tests + circular check
- **Smoke test**: Not required

**MCP-142: Extract content insertion logic (3h)**

- Create modules/files/content-insertion.ts (6 methods)
- Update vault-utils.ts to import/re-export
- Add unit tests
- **Tests**: All tests + circular check
- **Smoke test**: Not required

**MCP-143: Extract YAML operations (3h)**

- Create modules/files/yaml-operations.ts (4 methods)
- Update vault-utils.ts to import/re-export
- Add unit tests for YAML edge cases
- **Tests**: All tests + circular check
- **Smoke test**: Not required

**MCP-144: Extract folder operations & finalize (4h) 🔥**

- Create modules/files/folder-operations.ts (3 methods)
- Create modules/files/index.ts barrel export
- Reduce vault-utils.ts to ~400 lines
- **Update 20+ files with new imports**
- Update .serena/memories/vault_integration_patterns.md
- **Tests**: All tests + circular check
- **Smoke test**: REQUIRED (5+ tool calls, verify all functionality)

### Phase 5: Links & Transactions (6 hours)

**MCP-145: Move link management (3h)**

- Move 3 files to modules/links/
- Create barrel export
- Update 5-6 import statements
- Update docs/tools/rename_note.md
- **Tests**: All tests + circular check
- **Smoke test**: REQUIRED (test rename_note with link updates)

**MCP-146: Move transaction management (3h)**

- Move 2 files to modules/transactions/
- Create barrel export
- Update 4-5 import statements
- Update .serena/memories/wal_transaction_patterns.md
- **Tests**: All tests + circular check
- **Smoke test**: REQUIRED (test rename_note transaction safety)

### Phase 6-8: Finalization (8 hours)

**MCP-147: Complete modularization (8h)**

**Part A: Analytics (2h)**

- Move 2 files to modules/analytics/
- Update output paths to var/analytics/
- Update dashboard script and HTTP server
- Update import statements in server files
- **Tests**: All tests + circular check
- **Smoke test**: Verify dashboard at localhost:19832

**Part B: Shared Utilities (2h)**

- Move 8 files to src/shared/
- Create barrel export
- Update 10-15 import statements
- **Tests**: All tests + circular check
- **Smoke test**: Not required

**Part C: Documentation Sweep (4h)**

- Update 7 Serena memories
- Update ARCHITECTURE.md with module diagram
- Update 6+ tool docs
- Create docs/guides/MIGRATION-GUIDE.md
- Update CLAUDE.md and CHANGELOG.md
- Run markdownlint: `markdownlint-cli2 --fix "docs/**/*.md"`
- **Tests**: All tests + circular check + markdown linting
- **Smoke test**: REQUIRED (comprehensive 10+ tool call verification)

---

## Final Validation (Before PR Submission)

After completing all 15 issues, perform final validation:

### 1. Full Test Suite Verification

```bash
# Must all pass:
npm run typecheck           # Zero TypeScript errors
npm run check:circular      # No circular dependencies
npm run test:unit           # All unit tests pass
npm run test:integration    # All integration tests pass
npm test                    # 724/728 tests passing
npm run build               # Build succeeds
```

### 2. Comprehensive Smoke Test

```bash
# Start server
npm run dev

# Test ALL major tool categories (20+ tool calls):
# - Note CRUD: create_note, read_note, edit_note
# - Search: search (5+ query types)
# - Daily notes: get_daily_note (create + existing)
# - Content: insert_content (3+ target types)
# - Rename: rename_note (with link updates)
# - List: list (folders, daily notes, templates)
# - Metadata: get_yaml_rules, list_yaml_property_values
# - Utilities: get_server_version, diagnose_vault

# Verify analytics dashboard: http://localhost:19832
```

### 3. Code Quality Checks

```bash
# Check for TODO/FIXME comments (should be none)
rg "TODO|FIXME" src/

# Verify no console.log statements (except in logger)
rg "console\.(log|warn|error)" src/ --glob '!**/logger.ts'

# Check file size reduction (vault-utils.ts should be ~400 lines)
wc -l src/modules/files/vault-utils.ts
```

### 4. Documentation Verification

```bash
# All markdown passes linting
markdownlint-cli2 "docs/**/*.md"

# Verify no broken internal links
# Manually check: ARCHITECTURE.md, CLAUDE.md, tool docs

# Verify Serena memories updated
ls -la .serena/memories/
```

### 5. Git Status Check

```bash
# Verify clean working directory
git status

# Review commit history (should have 15 commits)
git log --oneline feature/modularize-core-mcp-layout ^master | wc -l

# Verify no large files accidentally committed
git ls-files --stage | awk '$4 > 100000 {print $4, $5}'
```

### 6. Sanity Checks

- [ ] All 15 Linear issues marked as "Done"
- [ ] No regression in test count (724/728 baseline maintained)
- [ ] No new TypeScript errors introduced
- [ ] No circular dependencies detected
- [ ] Build artifact size reasonable (check dist/ folder)
- [ ] Analytics dashboard accessible and functional
- [ ] All documentation up to date
- [ ] CHANGELOG.md updated with modularization summary
- [ ] ARCHITECTURE.md reflects new structure
- [ ] Migration guide created for developers

### 7. Comprehensive Code Review via Codex (MANDATORY)

**Objective**: Perform final architectural and code quality review before PR submission.

**Use the `codex` skill with comprehensive context:**

```
Use codex skill to perform comprehensive code review of the modularization refactoring.

Context for codex:
- Project: MCP for LifeOS server modularization
- Branch: feature/modularize-core-mcp-layout
- Scope: 15 incremental issues (MCP-133 through MCP-147)
- Changes: Reorganized 28 peer files into modular structure
- Key transformation: vault-utils.ts (1,956 lines) → modules/files/* (~400 lines)

Areas to review:

1. **Architectural Assessment**
   - Module boundary clarity and separation of concerns
   - Barrel export design (modules/*/index.ts)
   - Import graph health (no circular dependencies verified, but check patterns)
   - Orchestration layer design (vault-utils.ts remaining responsibilities)
   - Module cohesion and coupling analysis

2. **Code Quality**
   - Consistent module organization patterns
   - Proper use of TypeScript types across module boundaries
   - Error handling patterns maintained during refactoring
   - Performance implications of new module structure
   - Any code smells or anti-patterns introduced

3. **Refactoring Completeness**
   - All files properly migrated (no orphaned code)
   - Import paths consistently updated
   - No duplicated logic across modules
   - Singleton patterns preserved correctly
   - Test coverage maintained (724/728 baseline)

4. **MCP Protocol Compliance**
   - Tool handler patterns unaffected by refactoring
   - Request routing still efficient
   - Analytics integration intact
   - Transaction safety preserved

5. **Future Maintainability**
   - Clear module ownership for future changes
   - Easy to add new features within module structure
   - Migration path clear for MCP-90/91/92 work
   - Technical debt reduction achieved

6. **Documentation Alignment**
   - ARCHITECTURE.md accurately reflects new structure
   - Migration guide provides clear old→new mappings
   - Serena memories updated with correct patterns
   - Tool docs reference correct module locations

7. **Risk Assessment**
   - Any hidden coupling not captured by tests
   - Performance regressions not caught by test suite
   - Edge cases in module interactions
   - Deployment risks or runtime surprises

Please provide:
- Overall assessment (approve/request changes)
- Critical issues (must fix before merge)
- Recommendations (nice-to-have improvements)
- Specific code locations requiring attention
```

**Codex Review Checklist:**

- [ ] Codex review executed with full context
- [ ] Overall assessment received (approve/request changes)
- [ ] Critical issues documented (if any)
- [ ] Critical issues addressed and re-validated
- [ ] Recommendations documented for future consideration
- [ ] Architecture patterns approved by codex
- [ ] No hidden coupling or anti-patterns identified

**Action Required:**

- If codex identifies **critical issues**: Fix immediately, re-run tests, re-submit to codex
- If codex identifies **recommendations only**: Document in PR description for future work
- If codex **approves**: Proceed to PR submission
- If codex **requests major changes**: Consider breaking into smaller PR or addressing concerns

**Important**: Do NOT proceed to PR submission until codex review is complete and any critical issues are resolved.

---

## PR Submission Checklist

Only after ALL 15 issues complete and final validation passes:

### 1. Push to Remote

```bash
git push origin feature/modularize-core-mcp-layout
```

### 2. Create Pull Request

```bash
# Use GitHub CLI or web interface
gh pr create --title "feat: modularize core MCP source layout" --body "$(cat <<'EOF'
## Summary
Complete modularization of MCP for LifeOS codebase into feature-focused modules. Implements 15 incremental issues (MCP-133 through MCP-147) from the "Modularize Core MCP Source Layout" project.

## Key Changes

### Structure
- Created `src/modules/` with domain-focused subdirectories
- Created `src/shared/` for shared utilities
- Created `var/` for runtime artifacts
- Eliminated vault-utils.ts god-file (1,956 → ~400 lines, 80% reduction)

### Modules Created
- `modules/templates/` - Template system (4 files)
- `modules/yaml/` - YAML processing (1 file)
- `modules/search/` - Search engine & NLP (4 files)
- `modules/files/` - Vault operations (6 modules + orchestration)
- `modules/links/` - Link management (3 files)
- `modules/transactions/` - Transaction management (2 files)
- `modules/analytics/` - Analytics (2 files)
- `shared/` - Shared utilities (8 files)

### Benefits
✅ Clear domain ownership and module boundaries
✅ Easier maintenance (changes isolated to modules)
✅ Better onboarding (navigable structure)
✅ Enables MCP-90/91/92 domain extraction work
✅ No circular dependencies
✅ Zero test regressions

## Testing

### Test Results
- **Type checking**: ✅ Zero errors
- **Circular dependencies**: ✅ None detected
- **Unit tests**: ✅ All passing
- **Integration tests**: ✅ All passing
- **Full test suite**: ✅ 724/728 passing (baseline maintained)
- **Build**: ✅ Successful
- **Smoke tests**: ✅ 20+ tool calls verified

### Coverage
- All major tool categories tested
- Analytics dashboard verified
- Link update atomicity validated
- Transaction safety confirmed

## Codex Code Review

### Overall Assessment
✅ **Approved** - Architecture and code quality meet standards

### Review Areas Validated
- ✅ **Architectural Assessment**: Module boundaries clear, separation of concerns maintained
- ✅ **Code Quality**: Consistent patterns, proper TypeScript usage, error handling preserved
- ✅ **Refactoring Completeness**: All files migrated, no orphaned code, test coverage maintained
- ✅ **MCP Protocol Compliance**: Tool handlers unaffected, request routing efficient
- ✅ **Future Maintainability**: Clear ownership, easy to extend, enables MCP-90/91/92
- ✅ **Documentation Alignment**: Architecture docs accurate, migration guide complete
- ✅ **Risk Assessment**: No hidden coupling, no performance regressions, edge cases handled

### Critical Issues
None identified

### Recommendations (for future consideration)
[Include any non-blocking recommendations from codex here]

## Documentation
- ✅ ARCHITECTURE.md updated with module diagram
- ✅ All tool docs updated with new paths
- ✅ 7 Serena memories updated
- ✅ Migration guide created
- ✅ CHANGELOG.md updated
- ✅ All markdown linted and passing

## Impact Analysis
- **Files moved**: 36 files
- **Import updates**: ~70-105 imports
- **Test updates**: ~20-30 test files
- **Documentation updates**: ~12 files
- **Commits**: 15 (one per issue)

## Sequential Issues Completed
1. ✅ MCP-133: Directory scaffolding
2. ✅ MCP-134: Import policy & circular checks
3. ✅ MCP-135: Template system migration
4. ✅ MCP-136: YAML processing migration
5. ✅ MCP-137: Search engine migration
6. ✅ MCP-138: NLP & response utilities
7. ✅ MCP-139: File I/O extraction
8. ✅ MCP-140: Note CRUD extraction
9. ✅ MCP-141: Daily note extraction
10. ✅ MCP-142: Content insertion extraction
11. ✅ MCP-143: YAML operations extraction
12. ✅ MCP-144: Folder operations & finalization
13. ✅ MCP-145: Link management migration
14. ✅ MCP-146: Transaction migration
15. ✅ MCP-147: Analytics, utilities & documentation

## Related Issues
- Parent: MCP-120 (exploration & decision)
- Enables: MCP-90 (config scaffolding)
- Enables: MCP-91 (vault-utils decomposition)
- Enables: MCP-92 (hot-reload custom instructions)
- Project: [Modularize Core MCP Source Layout](https://linear.app/agilecode-studio/project/modularize-core-mcp-source-layout-52bafdb15128)

## Breaking Changes
None - All changes maintain backward compatibility via barrel exports during transition.

## Review Notes
- Each commit represents one completed issue with full test validation
- Commit messages include detailed acceptance criteria
- No functional changes - pure refactoring
- Test baseline maintained throughout: 724/728 passing
- Comprehensive codex code review performed and approved before PR submission

## Deployment Notes
- No environment changes required
- No configuration updates needed
- No database migrations
- Server restart recommended but not required
EOF
)"
```

### 3. PR Metadata

- **Base branch**: `master`
- **Labels**: `Technical Debt`, `Refactoring`, `Documentation`
- **Reviewers**: Request review from team
- **Project**: Link to "Modularize Core MCP Source Layout"
- **Milestone**: Current cycle

### 4. Post-PR Actions

- Monitor CI/CD pipeline (if configured)
- Address any review feedback
- Merge when approved
- Delete feature branch after merge
- Update CURRENT-FOCUS.md with completion

---

## Emergency Rollback Procedure

If critical issues discovered during any phase:

### Rollback Single Issue

```bash
# Identify last good commit
git log --oneline -20

# Revert to commit before problematic change
git reset --hard <commit-sha>

# Fix issues and re-implement
```

### Rollback Multiple Issues

```bash
# Create backup branch first
git checkout -b backup/modularize-core-mcp-layout
git checkout feature/modularize-core-mcp-layout

# Revert to specific commit
git reset --hard <last-good-commit>

# Re-implement from that point
```

### Complete Rollback

```bash
# Return to master
git checkout master

# Delete feature branch
git branch -D feature/modularize-core-mcp-layout

# Start fresh if needed
```

---

## Success Metrics

Track these throughout execution:

- ✅ All 15 issues completed sequentially
- ✅ vault-utils.ts reduced from 1,956 to ~400 lines (80% reduction)
- ✅ Zero test regressions (724/728 maintained)
- ✅ Zero circular dependencies
- ✅ Zero TypeScript errors
- ✅ All smoke tests passing
- ✅ All documentation updated
- ✅ **Codex code review completed and approved**
- ✅ Clean git history (15 well-structured commits)
- ✅ PR approved and merged

---

## Important Notes

1. **DO NOT** push to remote until all 15 issues complete
2. **DO NOT** switch branches during execution
3. **DO NOT** skip testing phases
4. **DO NOT** batch commits - one commit per issue
5. **DO NOT** skip codex code review before PR submission
6. **DO** run full test suite after each issue
7. **DO** update Linear issue status after each completion
8. **DO** perform smoke tests when required
9. **DO** maintain test baseline (724/728)
10. **DO** perform comprehensive codex review before final PR submission

---

## Prompt Usage

To execute this project, simply say:

> "Execute the modularization project following MODULARIZATION-PROMPT.md. Start with MCP-133 and proceed sequentially through all 15 issues. Run all required tests after each issue. Perform smoke tests when specified. Commit after each completed issue. Continue until all 15 issues complete and final validation passes. Then perform comprehensive codex code review. After codex approval, submit PR."

Or for step-by-step execution:

> "Start modularization project: implement MCP-133 following MODULARIZATION-PROMPT.md"

After each issue completes:

> "Continue modularization: implement [next-issue-id]"

---

**Status**: Ready to execute  
**Branch**: `feature/modularize-core-mcp-layout` ✅ Created  
**Next Step**: Start with MCP-133
