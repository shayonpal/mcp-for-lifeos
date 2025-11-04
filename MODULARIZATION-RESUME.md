# Modularization Resume - Phase 4+

**Branch**: `feature/modularize-core-mcp-layout`
**Status**: 6/15 done (40%) - Phases 1-3 complete
**Last commit**: `a94e89c` (MCP-138)
**Tests**: 781/785 passing
**Circular deps**: 1 (resolves in Phase 4)

---

## Completed (MCP-133 to MCP-138)

- ✅ Directory scaffolding + import policy
- ✅ Templates → `modules/templates/` (4 files)
- ✅ YAML → `modules/yaml/` (1 file)
- ✅ Search + NLP → `modules/search/` (4 files)

---

## Remaining Work (9 Issues)

### Phase 4: Vault Decomposition (6 issues, 18h)

Extract methods from vault-utils.ts (1,956 lines → ~400 lines):

**MCP-139** (3h): Extract file I/O → `modules/files/file-io.ts`
- 7 methods: readFileWithRetry, writeFileWithRetry, etc.
- Verify iCloud retry logic

**MCP-140** (3h): Extract note CRUD → `modules/files/note-crud.ts`
- 6 methods: createNote, readNote, updateNote, etc.

**MCP-141** (2h): Extract daily notes → `modules/files/daily-note-service.ts`
- 3 methods: getDailyNote, createDailyNote, formatDailyNoteName

**MCP-142** (3h): Extract content insertion → `modules/files/content-insertion.ts`
- 6 methods: insertContent, findInsertionPoint, etc.

**MCP-143** (3h): Extract YAML ops → `modules/files/yaml-operations.ts`
- 4 methods: parseFrontmatter, updateFrontmatter, etc.

**MCP-144** (4h) ⚠️ **SMOKE TEST REQUIRED**:
- Extract folder ops → `modules/files/folder-operations.ts`
- Create `modules/files/index.ts` barrel
- Move vault-utils.ts to modules/files/
- Update 20+ import statements
- **Expected**: Circular dependency eliminated (0 deps)
- **Smoke test**: 5+ tool calls, verify functionality

### Phase 5: Links & Transactions (2 issues, 6h)

**MCP-145** (3h) ⚠️ **SMOKE TEST**: Move links → `modules/links/` (3 files)
**MCP-146** (3h) ⚠️ **SMOKE TEST**: Move transactions → `modules/transactions/` (2 files)

### Phase 6-8: Finalization (3 parts, 8h)

**MCP-147A** (2h) ⚠️ **SMOKE TEST**: Analytics → `modules/analytics/`, update paths to var/
**MCP-147B** (2h): Shared utils → `shared/` (8 files: types, logger, etc.)
**MCP-147C** (4h) ⚠️ **SMOKE TEST**: Documentation sweep (7 memories, ARCHITECTURE.md, tool docs, MIGRATION-GUIDE.md, CHANGELOG.md)

---

## Testing Protocol (Every Issue)

```bash
npm run typecheck          # Must pass
npm run check:circular     # Must pass (0 after MCP-144)
npm test                   # Maintain 781/785
```

**Smoke tests** (MCP-144, 145, 146, 147A, 147C):
```bash
npm run dev
# Test 5+ tool calls, verify analytics dashboard
```

---

## Final Validation

```bash
# 1. Full test suite
npm run typecheck && npm run check:circular && npm test && npm run build

# 2. Code quality
rg "TODO|FIXME" src/
rg "console\.(log|warn|error)" src/ --glob '!**/logger.ts'
wc -l src/modules/files/vault-utils.ts  # Should be ~400

# 3. Documentation
markdownlint-cli2 "docs/**/*.md"

# 4. Git status
git status
git log --oneline feature/modularize-core-mcp-layout ^master | wc -l  # Should be 15

# 5. Comprehensive smoke test (20+ tool calls)

# 6. MANDATORY: Codex code review
# Use codex skill with full context, get approval before PR

# 7. Submit PR
git push origin feature/modularize-core-mcp-layout
gh pr create --title "feat: modularize core MCP source layout" --body "..."
```

---

## Resume Command

```
Resume modularization from MODULARIZATION-RESUME.md. Start MCP-139, proceed through MCP-147. Run tests after each. Smoke test when required. Commit each issue. After all 15 done: final validation, codex review, then PR.
```

---

**Next**: MCP-139 (Extract file I/O operations)
**Critical**: Phase 4 eliminates circular dependency
**Goal**: 80% vault-utils reduction, zero circular deps, all tests passing
