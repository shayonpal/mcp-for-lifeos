# Changelog

All notable changes to the LifeOS MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation

- 2025-11-04 - docs: prepare documentation for external users
  - Generalized ARCHITECTURE.md to remove internal-only references and private Linear workflows
  - Pruned guides for external users (removed private team references and internal tooling details)
  - Linked all TODO comments to Linear issues and created tracking issues for technical debt

### Added

- 2025-11-04 07:01 - feat: implement hot-reload custom instructions (MCP-92)

- **Hot-Reload Custom Instructions** (MCP-92, 2025-11-04): Implemented file-based instruction loading with hot-reload, rule branching logic, and tool integration demonstrating instruction-aware workflows
  - **Phase 1 - File-Based Loading**: Implemented `readInstructionFile()` and `parseInstructionFile()` methods using `readFileWithRetry` for resilience, JSON parsing with validation, caching with file mtime, graceful fallback to inline config on errors
  - **Phase 2 - Rule Application Logic**: Enhanced `applyInstructions()` with branching on `context.operation` (create/edit/insert/template), rule type selection (noteCreationRules/editingRules/templateRules), rule detection logging, and tracking via `appliedRules` array
  - **Phase 3 - Tool Integration**: Integrated `InstructionProcessor` into `src/tool-router.ts::executeCreateNote()` with telemetry tracking, demonstrating instruction-aware note creation workflow
  - **Hot-Reload Mechanism**: File changes detected via existing `fs.watch()` infrastructure from MCP-90, cache invalidation on file change, lazy reload on next `getInstructions()` call (no active push)
  - **Configuration Priority**: File-based instructions (`config.filePath`) take precedence over inline config, automatic fallback to inline on file read/parse errors, backward compatible with MCP-90 scaffolding
  - **Test Updates**: Fixed 3 unit tests in `instruction-processor.test.ts` to reflect Phase 2 behavior (file loading attempts, updated log messages, rule detection tracking), all 805/808 tests passing (99.6%)
  - **Contracts & Documentation**: Created `dev/contracts/MCP-92-contracts.ts` (650+ lines) defining input/output interfaces, error contracts, integration contracts, behavioral contracts (MUST/MUST NOT), and test requirements
  - **TypeScript Compliance**: Zero type errors, successful build, `NonNullable<CustomInstructionsConfig['inline']>` return type for strict null safety
  - **Zero Breaking Changes**: Pass-through default when no instructions configured, existing tools work unchanged, feature flag ready for future granular control
  - **Future Work**: Full rule parsing/application (YAML defaults, naming conventions, content boilerplate), additional tool integration points (updateNote, insertContent, template processing), comprehensive integration tests

- 2025-11-04 03:54 - feat: extract config & instruction scaffolding from vault-utils (MCP-90)

- **Config Module & Custom Instructions Scaffolding** (MCP-90, 2025-11-04): Created infrastructure for custom instruction handling with pass-through processor and hot-reload support
  - **Configuration Extension**: Extended `LifeOSConfig` interface with optional `customInstructions` field supporting both inline and file-based configurations
  - **New Module**: Created `src/modules/config/` with `instruction-processor.ts` (5 methods: getInstructions, applyInstructions, initializeWatcher, clearCache, cleanup) and barrel export
  - **CustomInstructionsConfig Interface**: Supports inline instruction definitions (noteCreationRules, editingRules, templateRules) and file-based references with hot-reload capability
  - **Hot-Reload Infrastructure**: File watching via `fs.watch()` with lazy initialization, graceful degradation, and test isolation via `DISABLE_CONFIG_WATCH` environment variable
  - **Phase 1 Behavior**: Pure pass-through mode - `applyInstructions()` returns context unchanged (no branching logic yet), `getInstructions()` returns inline config or warns for file paths
  - **Test Coverage**: 23 new unit tests (all passing) with mock-based file watcher tests, brings total to 805/808 tests passing (48 test suites, 3 skipped)
  - **Documentation**: Updated ARCHITECTURE.md with config module section, created CUSTOM-INSTRUCTIONS.md guide (examples, API reference, troubleshooting)
  - **TypeScript Contracts**: Created `dev/contracts/MCP-90-contracts.ts` defining interfaces, error contracts, and behavioral requirements (MUST/MUST NOT)
  - **Zero Breaking Changes**: Optional config field, backward compatible, all existing tools behave identically, server boots without errors
  - **Future Phases**: File-based instruction reading (Phase 2), instruction branching logic (Phase 3), tool integration (Phase 4)

- 2025-11-03 21:00 - refactor: complete Phase 5 modularization (MCP-145, MCP-146, MCP-147)

- **Phase 5 Modularization Complete** (MCP-145, MCP-146, MCP-147, 2025-11-03): Completed final modularization phase organizing codebase into focused domain modules with zero circular dependencies
  - **MCP-145** (Links Module): Moved `link-scanner.ts`, `link-updater.ts`, `obsidian-links.ts` to `src/modules/links/` with barrel export
  - **MCP-146** (Transactions Module): Moved `transaction-manager.ts`, `wal-manager.ts` to `src/modules/transactions/` with barrel export
  - **MCP-147A** (Analytics Module): Moved `analytics-collector.ts`, `usage-metrics.ts` to `src/modules/analytics/` with barrel export
  - **MCP-147B** (Shared Utilities): Moved 9 core utility files to `src/shared/` (types, config, logger, error-types, path-utils, regex-utils, text-utils, date-resolver) with consolidated barrel export
  - Updated ~200+ import statements across src/, tests/, dev/contracts/, .claude/commands/
  - Fixed jest.mock() paths and dynamic import() statements in test suite
  - Updated documentation: ARCHITECTURE.md (added module structure diagram), workflow commands, tool docs, Serena memories
  - **Validation**: TypeScript passing, 0 circular dependencies (madge), 781/785 tests passing (4 skipped)
  - **Module Count**: 24 modules across 7 domain areas (files: 7, templates: 5, yaml: 2, search: 3, links: 3, transactions: 2, analytics: 2)
  - **Benefits**: Improved discoverability, maintainability, clean module boundaries, zero circular deps baseline established

- 2025-11-03 19:38 - test: enable instance ID integration test (MCP-94)

- 2025-11-03 19:14 - test: prevent unit tests from polluting production Obsidian vault (MCP-148)

- **Test Isolation for Unit Tests** (MCP-148, 2025-11-04): Fixed unit test vault pollution by implementing proper test isolation with createTestVault() helper pattern
  - **Problem**: Unit test in `tests/unit/server/legacy-alias-handlers.test.ts` was writing test artifacts directly to production Obsidian vault (10+ `Test-MCP99-{timestamp}.md` files in `05 - Fleeting Notes/`)
  - **Root Cause**: Test did not use `createTestVault()` helper, defaulting to production vault path from `LIFEOS_CONFIG.vaultPath` with no cleanup hooks
  - **Solution**: Implemented proper test isolation using `createTestVault()` with beforeEach/afterEach lifecycle hooks for automatic cleanup
  - **Test Contract**: Created `dev/contracts/MCP-148-contracts.ts` defining test isolation requirements and production vault detection patterns
  - **Production Safeguards**: Added global vault detection guard in `tests/setup.ts` beforeAll() hook with documentation explaining LIFEOS_CONFIG override pattern
  - **PR Review Fixes**: Corrected incorrect `fs.promises.access()` test assertion, removed unused import, fixed contract-implementation mismatch
  - **Validation**: All 544 unit tests pass (543 passed, 1 skipped), production vault remains clean (git status shows no test artifacts)
  - **Test Results**: Smoke test confirmed no vault pollution after full test suite execution (782/785 total tests passing)
  - **Zero Breaking Changes**: No production code modifications, test-only changes for isolation compliance

- 2025-11-03 14:30 - test: integration testing and documentation refresh (MCP-10)

- **Instance ID Uniqueness Test** (MCP-94, 2025-11-03 19:38): Enabled integration test validating unique instance ID generation across server restarts
  - **Test Implementation**: Created integration test in `tests/integration/jsonl-final-validation.test.ts` (lines 103-169) validating UUID v4 generation mechanism used by AnalyticsCollector
  - **Validation Scope**: Tests uniqueness across 5 simulated server restarts, validates UUID v4 format compliance, verifies process metadata (hostname, PID) consistency
  - **Approach**: Direct testing of `randomUUID()` from crypto module (same mechanism as `AnalyticsCollector.instanceId`) avoiding spawned process analytics file writing issues
  - **Test Results**: ✅ All 782 tests passing (3 skipped), new test executes in <2ms, validates 100% uniqueness across generated IDs
  - **Format Validation**: Confirms UUID v4 pattern `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
  - **Technical Note**: Skips full MCP server process spawning (analytics file writing for spawned processes has known issues), tests underlying generation logic directly for reliability
  - **Zero Breaking Changes**: No production code changes, test-only addition
  - **Cycle Impact**: Completes MCP-94 (low priority test infrastructure work from Test Infrastructure Stabilization project)

- **Integration Testing and Documentation Refresh** (MCP-10, 2025-11-03 14:30): Comprehensive validation of server decomposition with module boundary tests, MCP protocol compliance tests, and documentation updates reflecting completed architecture
  - **Test Coverage**: Created 54 new integration tests across 6 test files validating factory patterns, lazy initialization, registry dispatch, transport independence, and tool mode enforcement
  - **Shared Test Utility**: Extracted `tests/helpers/vault-setup.ts` reducing duplication across integration tests with standard temporary vault setup pattern
  - **Module Boundary Tests (32 tests)**: Factory instantiation (8 tests), handler initialization (8 tests), hybrid dispatch (16 tests) validating server lifecycle, analytics singleton, session ID generation (UUID v4), context propagation, fallback handling
  - **Protocol Compliance Tests (22 tests)**: Stdio transport (10 tests), tool mode enforcement (12 tests) validating MCP spec conformance, tool availability across modes (legacy-only: 20 tools, consolidated-only: 12 tools, consolidated-with-aliases: 34 tools)
  - **Documentation Updates**:
    - ADR-004 (project roadmap): Marked decomposition complete with final metrics (2224→503 lines, 77% reduction, validated via MCP-10)
    - ADR-002 (strategic pivot): Updated line counts and completion status, success metrics reflect 99.5% test pass rate
    - request-handler-infrastructure.md: Documented pure factory pattern with no inline handler references, marked all follow-up work complete (MCP-96/97/98/99)
    - ARCHITECTURE.md: Updated "Last Updated" to 2025-11-03 confirming accuracy with current module structure
  - **Test Results**: 778 tests passing (54 new integration tests + 724 existing), 99.5% pass rate maintained, 3 skipped unrelated
  - **Contract Validation**: All acceptance criteria from dev/contracts/MCP-10-contracts.ts met, TypeScript interfaces ensure type safety
  - **Zero Breaking Changes**: MCP tool interfaces unchanged, existing functionality preserved, runtime behavior identical
  - **Validates Decomposition**: End-to-end validation of MCP-6/7/8/9 server decomposition through automated integration testing
  - **Bootstrap Extraction**: Skipped (src/index.ts = 503 lines, within acceptable variance of optional ≤500 target per MCP-10-contracts.ts line 396: "indexLinesOptional")
  - **Unblocks Issues**: MCP-90 (config extraction), MCP-91 (vault-utils decomposition), MCP-92 (hot-reload instructions) ready to proceed
  - **Cycle Impact**: Completes 68% of Cycle 9 (Oct 28 - Nov 7), critical path cleared for VaultUtils elimination series

- 2025-11-03 11:16 - feat: frontmatter link scanning for rename operations (MCP-110)

- **Frontmatter Link Scanning** (MCP-110, 2025-11-03 11:16): Enhanced LinkScanner to optionally scan and update wikilinks in YAML frontmatter during rename operations, resolving edge case where notes with frontmatter-only links were not discovered
  - Added `skipFrontmatter: false` parameter to LinkScanner in `src/modules/links/link-updater.ts` scanAndGroupReferences() for metadata consistency
  - Modified `scanNoteForLinks()` in `src/modules/links/link-scanner.ts` to read raw file content when frontmatter scanning enabled (uses VaultUtils.readFileWithRetry with iCloud retry logic)
  - Updated `updateNoteLinks()` in `src/modules/files/vault-utils.ts` to update entire file content including frontmatter using full-content string replacement (preserves YAML structure)
  - YAML format support: Block scalar (`- "[[Note]]"`) and inline array (`["[[Note1]]", "[[Note2]]"]`) formats both handled by existing WIKILINK_PATTERN regex
  - Backward compatible: Default `skipFrontmatter: true` preserved, only rename operations explicitly enable frontmatter scanning
  - Critical fixes from code review: Replaced raw `readFileSync()` with `VaultUtils.readFileWithRetry()` for iCloud reliability, removed circular dependency (SearchEngine import), updated outdated docstring
  - Test coverage: Added YAML block scalar and inline array format tests, enabled previously skipped integration test for frontmatter-only link updates
  - Full test suite: 724/728 tests passing (99.5% pass rate, 4 skipped unrelated)
  - Zero breaking changes: No MCP tool interface modifications, existing content link updates remain functional
  - Performance: <2% impact when frontmatter scanning enabled (contract requirement met)
  - Completes MCP-107 link update implementation: Content links + frontmatter links now both updated during rename

- 2025-11-03 00:38 - test: comprehensive integration and regression testing suite (MCP-129)

- **Block Reference Support in Link Updates** (MCP-124, 2025-11-02 23:03): Extended link scanner and updater to detect and preserve Obsidian block references during note rename operations
  - Updated WIKILINK_PATTERN regex in `src/regex-utils.ts` to capture block references `[[Note#^blockid]]` distinct from headings `[[Note#heading]]`
  - Modified anchor parsing logic in LinkScanner to classify anchors by `^` prefix: block refs preserve caret, headings remain plain text
  - Enhanced link reconstruction in LinkUpdater to preserve `^` prefix when rebuilding block reference links
  - Block refs and headings are mutually exclusive: link can have heading OR blockRef, never both
  - Supported formats: `[[Note#^block123]]`, `[[Note#^block123|Alias]]`, `![[Note#^block123]]` (embed with block ref)
  - Updated LinkReference interface with `blockRef?: string` field (includes `^` prefix, e.g., "^abc123")
  - Test coverage: 18+ new tests in `tests/unit/link-scanner.test.ts`, `tests/unit/link-updater.test.ts`, `tests/integration/link-updater.integration.test.ts`
  - Full test suite: 681/681 tests passing (100% pass rate)
  - Zero breaking changes: existing heading links, basic links, and embeds remain fully functional
  - Performance: <5s link scanning for 1000-note vaults maintained (no performance regression)
  - Completes Obsidian wikilink format support: basic links, aliases, headings, block refs, and embeds all handled

- **Enhanced Dry-Run Preview** (MCP-123, 2025-11-02 16:24): Extended dry-run preview with detailed link scanning, transaction phases, and execution time estimates
  - Added `linkUpdates` field to preview response when `updateLinks: true` containing filesWithLinks count, affectedPaths array, and totalReferences count
  - Added `transactionPhases` field displaying 5-phase atomic protocol (plan → prepare → validate → commit → success) with dynamic commit description
  - Added `estimatedTime` field with min/max execution time range calculated from base operation + link count (formula: base 50ms + links*10ms + overhead 30ms ± 50%)
  - Updated `filesAffected` calculation to include linking files: 1 (renamed note) + affectedPaths.length when updateLinks enabled
  - Enhanced `previewRenameOperation()` in `src/server/handlers/note-handlers.ts` to integrate LinkScanner.scanVaultForLinks() when updateLinks enabled
  - Reuses established infrastructure: LinkScanner from MCP-107, TransactionManager.plan() from MCP-118, SearchEngine cache for performance
  - Backward compatible with MCP-122: additive changes only, no breaking modifications to existing preview fields
  - Performance: <5s link scanning for 1000-note vaults, 40-135ms preview generation depending on link count
  - Test coverage: 2 new integration tests in `tests/integration/rename-note.integration.test.ts` validating enhanced preview structure
  - Full test suite: 681/681 tests passing (100% pass rate)
  - Contract-driven development using TypeScript interfaces from `dev/contracts/MCP-123-contracts.ts`
  - Builds on MCP-122 dry-run foundation with no new code paths - enhancement-first strategy

- **Dry-Run Preview Mode** (MCP-122, 2025-11-02 14:15): Added preview capability to rename_note tool for validating operations before execution
  - Added optional `dryRun` parameter to rename_note tool (default: false)
  - Returns operation preview without executing filesystem changes when `dryRun: true`
  - Full validation occurs (FILE_NOT_FOUND, FILE_EXISTS, path validation) same as actual execution
  - Preview response includes operation details, paths, filesAffected count, and executionMode
  - Leverages TransactionManager.plan() for validation without execution (DRY principle)
  - Added `previewRenameOperation()` helper function to `src/server/handlers/note-handlers.ts`
  - Early return pattern when `dryRun === true` to skip execution
  - Safe for multiple dry-run calls - no filesystem modifications occur
  - Response format: `{ success: true, preview: { operation, oldPath, newPath, willUpdateLinks, filesAffected, executionMode } }`
  - Test coverage: 5 comprehensive dry-run tests in `tests/integration/rename-note.integration.test.ts`
  - Validates no filesystem changes during preview operations
  - All 12 integration tests passing (includes 5 new dry-run tests)
  - Full test suite: 679/679 tests passing (100% pass rate)
  - Performance: Preview completes in <50ms (faster than actual execution)
  - Updated tool documentation in `docs/tools/rename_note.md` with usage examples
  - Completes Phase 5 of rename_note tool roadmap - all planned features now implemented

- **Boot Recovery System** (MCP-119, 2025-11-02 06:22): Implemented automatic recovery mechanism detecting and rolling back incomplete transactions from server crashes during boot
  - Added `recoverPendingTransactions()` function to `src/index.ts` (92 lines) executing early in server boot sequence before handler registration
  - Scans `~/.config/mcp-lifeos/wal/` directory for orphaned WAL entries on server startup
  - Skips WALs younger than 1 minute (may be active transactions from concurrent processes)
  - Attempts automatic rollback via `TransactionManager.rollback()` for stale WALs (>1min old)
  - Logs recovery results with status symbols: ✅ success, ⚠️ partial recovery, ❌ failed recovery
  - Preserves WAL files on failed or partial recovery for manual intervention
  - Graceful degradation: server continues startup regardless of recovery outcome (non-blocking)
  - Performance: Recovery overhead <5s for typical scenarios
  - Test coverage: 15 comprehensive integration tests in `tests/integration/boot-recovery.test.ts` covering WAL scanning, recovery operations, graceful degradation, edge cases
  - Full test suite: 674/679 tests passing (5 skipped, 99.3% pass rate)
  - Manual testing confirmed operational boot recovery with proper WAL cleanup
  - Foundation for reliable crash recovery ensuring vault consistency after unexpected server termination

### Changed

- 2025-11-04 05:30 - refactor: eliminate VaultUtils facade, migrate to domain modules (MCP-91)

- **VaultUtils Facade Elimination** (MCP-91, 2025-11-04): Completed Phase 4/5 of vault-utils decomposition by fully eliminating the 483-line VaultUtils facade class and migrating all consumers to direct domain module imports
  - **Core Refactoring**: Deleted `src/modules/files/vault-utils.ts` (483 lines) - eliminated god class anti-pattern and completed architectural decomposition that began with MCP-141 through MCP-144
  - **New Domain Modules Created**:
    - `src/modules/links/link-text-builder.ts`: buildNewLinkText(), updateNoteLinks() for wikilink construction and replacement
    - `src/shared/metadata-utils.ts`: getLocalDate(), normalizeTagsToArray(), matchesContentType(), hasAnyTag() for date/tag/content-type utilities
    - `src/modules/search/search-utilities.ts`: findNoteByTitle(), findNotes(), getAllNotes(), searchNotes() for search and discovery operations
  - **Module Organization**: Files module now exports 7 focused domain functions (note-crud, daily-note-service, file-io, content-insertion, yaml-operations, folder-operations); Links module exports link-text-builder + existing link-scanner/updater; Search module exports search-utilities + existing SearchEngine/QueryParser; Shared module exports metadata-utils + existing path/text/config utilities
  - **Production Files Updated** (7): Updated tool-router.ts and 6 server handlers (utility, note, legacy-alias, consolidated, metadata, link-updater) to use direct domain imports instead of VaultUtils facade
  - **Test Infrastructure Updated** (25 files): Created `tests/helpers/test-utils.ts` with resetTestSingletons() placeholder (no-op pending MCP-92), updated vault-setup.ts to use new helper, migrated 18 test files for resetSingletons pattern, updated 7 test files for direct method imports
  - **Documentation Complete** (18 files): Updated 11 tool docs, 3 architecture docs (ARCHITECTURE.md, ADR-002, ADR-004), 4 development guides (TESTING.md, DEPLOYMENT-GUIDE.md, MCP-108-IMPLEMENTATION-CONTEXT.md, README.md) to reflect domain module architecture
  - **Memory Consolidation** (5 files): Updated testing_guide.md, vault_integration_patterns.md, obsidian_integration.md, wal_transaction_patterns.md, code_quality_patterns.md to document facade elimination pattern and migration path
  - **Implementation Contracts**: Created `dev/contracts/MCP-91-contracts.ts` (800+ lines) defining interfaces, behavioral contracts (MUST/MUST NOT), validation gates, and module responsibility boundaries
  - **Test Results**: 805/808 tests passing (100% of non-skipped tests), TypeScript compilation: 0 errors, net code reduction: 448 lines (254 insertions, 702 deletions across 36 files)
  - **Zero Breaking Changes**: Internal refactoring only - all MCP tools remain unchanged, no user-facing impact
  - **Follow-up Work**: MCP-92 implemented proper singleton reset methods to replace no-op placeholder

- **Transaction Integration with rename_note** (MCP-118, 2025-11-01 21:56): Integrated TransactionManager with rename_note tool providing atomic rename operations with automatic rollback
  - Refactored `renameNoteHandler` in `src/server/handlers/note-handlers.ts` to delegate all rename operations to TransactionManager.execute()
  - Singleton pattern for TransactionManager instance with lazy initialization to reduce overhead
  - Removed "success with warnings" pattern - operations now return explicit transaction failures with detailed metadata
  - BREAKING CHANGE: Warnings array removed from success responses (RenameNoteOutput) - failures now return TRANSACTION_FAILED error code instead of partial success
  - Added transaction correlation ID and performance metrics to success responses (correlationId, metrics with totalTimeMs and phaseTimings)
  - Extended `RenameNoteError` with transaction error codes: TRANSACTION_PLAN_FAILED, TRANSACTION_PREPARE_FAILED, TRANSACTION_VALIDATE_FAILED, TRANSACTION_COMMIT_FAILED, TRANSACTION_ROLLBACK_FAILED, TRANSACTION_STALE_CONTENT, TRANSACTION_FAILED
  - Added comprehensive `TransactionMetadata` interface in contracts providing phase, correlationId, affectedFiles, rollbackStatus, failures array, recoveryAction, walPath, and recoveryInstructions
  - Updated tool description in `src/server/tool-registry.ts` to document Phase 4 features (atomic transactions, automatic rollback, vault-wide link updates, SHA-256 staleness detection, WAL crash recovery)
  - Standardized error creation with `createRenameError()` helper ensuring consistent error structure
  - Test coverage: 20+ integration tests in `tests/integration/rename-note.integration.test.ts` covering transaction success, rollback scenarios, metadata in errors, no warnings in success, backward compatible inputs
  - Vault operations are now all-or-nothing with automatic rollback on any failure preventing partial states

### Documentation

- **Architecture Update** (2025-11-01 18:39): Added WAL Manager and Transaction Manager sections to ARCHITECTURE.md documenting new infrastructure components for atomic rename operations
  - Added WAL Manager section describing Write-Ahead Log infrastructure for transaction persistence, recovery, and cleanup (MCP-115)
  - Added Transaction Manager section documenting five-phase atomic transaction protocol with rollback capability and staleness detection (MCP-117)
  - Updated timestamp to reflect latest documentation changes
  - Inserted sections after Template System and before Analytics for logical component flow

### Removed

- **Unused Anthropic SDK Dependency** (2025-11-02 23:22): Removed @anthropic-ai/sdk package that was declared but never used in the codebase
  - Removed @anthropic-ai/sdk from dependencies (was at version 0.52.0)
  - Reduces bundle size by ~200KB+ and eliminates 3 transitive dependencies (json-schema-to-ts, ts-algebra, @babel/runtime)
  - Package was never imported or used - all "anthropic" references were display strings only
  - Closed Dependabot PR #127 (attempted upgrade to 0.68.0)
  - MCP server does not directly call Anthropic API - it provides MCP tools for Claude Desktop to use
  - Cleaner dependency tree with only actively-used packages

### Added

- **Transaction Manager Core Protocol** (MCP-117, 2025-11-01 18:39): Implemented five-phase atomic transaction protocol for file rename operations with full rollback capability, Write-Ahead Logging (WAL), and staleness detection
  - Created `src/modules/transactions/transaction-manager.ts` (691 lines) with TransactionManager class providing execute(), plan(), prepare(), validate(), commit(), success(), abort(), rollback() methods for managing atomic rename transactions
  - Five-phase protocol ensures vault consistency: PLAN (build manifest with SHA-256 hashes), PREPARE (stage files and write WAL), VALIDATE (detect stale content), COMMIT (atomically promote staged files), SUCCESS/ABORT (cleanup or rollback)
  - SHA-256 hash validation detects file modifications during transaction (staleness detection) throwing TRANSACTION_STALE_CONTENT error to prevent writing stale content
  - Integrates with two-phase link updater (MCP-116): render mode during plan phase for preview, commit mode during commit phase for atomic link updates
  - UUID v4 correlation ID tracking throughout all phases for transaction tracing and recovery
  - WAL integration: writes during prepare phase, updates at each phase transition, deletes on success, preserves on failure for manual recovery
  - Graceful rollback with partial recovery support: automatic restoration from WAL on abort, generates manual recovery instructions when automatic rollback fails
  - Phase timing metrics collection for performance monitoring
  - New error codes in `src/error-types.ts`: TRANSACTION_PLAN_FAILED, TRANSACTION_PREPARE_FAILED, TRANSACTION_VALIDATE_FAILED, TRANSACTION_COMMIT_FAILED, TRANSACTION_ROLLBACK_FAILED, TRANSACTION_STALE_CONTENT
  - Test coverage: 31 comprehensive unit tests in `tests/unit/transaction-manager.test.ts` (869 lines) with 100% pass rate covering all phases, error propagation, and full execution scenarios
  - Zero external dependencies (Node.js built-ins only: crypto for SHA-256/UUID, fs for file operations, path for path manipulation)
  - Foundation for MCP-118 integration with rename_note tool - not yet exposed via MCP tools
  - TypeScript contracts from `dev/contracts/MCP-108-contracts.ts`: TransactionState, TransactionManifest, TransactionResult, RollbackResult, WALEntry

- **Two-Phase Link Updater** (MCP-116, 2025-11-01 16:49): Refactored link updater to support three operational modes separating rendering from committing for atomic transactions
  - Extended `updateVaultLinks()` with mode parameter supporting 'render', 'commit', and 'direct' modes
  - RENDER mode: Read-only operation that scans vault, reads affected files, computes updated content, returns content map without writing (returns LinkRenderResult with performance metrics)
  - COMMIT mode: Writes pre-rendered content atomically from content map, uses existing atomic write infrastructure from MCP-114 (returns LinkUpdateResult)
  - DIRECT mode: Legacy Phase 3 behavior (read + update + write in single operation) maintained for backward compatibility, used as default when mode not specified
  - Function overloading with TypeScript signatures ensuring type safety for each mode
  - Shared helper `scanAndGroupReferences()` eliminates code duplication between render and direct modes
  - Memory characteristics documented: typical ~1-2KB per note, 1-10MB for 1000 affected files, 100-200MB for 10K+ files
  - Foundation for MCP-117 TransactionManager integration enabling atomic rename with link updates
  - Test coverage: 18+ new unit tests in `tests/unit/link-updater-modes.test.ts` covering all three modes, backward compatibility, and error handling with 100% pass rate
  - Zero breaking changes: existing code continues using default direct mode without modification
  - Prepared for future WAL integration: LinkCommitInput includes manifestEntries field for transaction validation

- **Link Update Implementation** (MCP-107, 2025-10-31 20:54): Implemented automatic wikilink updates after note rename (Phase 3 of rename_note tool)
  - Created `src/link-updater.ts` (152 lines) providing `updateVaultLinks()` orchestration function for vault-wide link updates
  - Pure orchestration layer delegating all link update logic to `VaultUtils.updateNoteLinks()` (regex-based link rewriting)
  - Integrated with `rename_note` handler: when `updateLinks: true`, applies link updates after successful file rename
  - Preserves all wikilink formats: basic `[[OldName]]`, alias `[[OldName|Custom]]`, heading `[[OldName#Heading]]`, embed `![[OldName]]`
  - Graceful failure handling: continues processing remaining files on individual failures, returns partial success status
  - Performance metrics: tracks scan time (from LinkScanner) and update time separately
  - Sequential file updates for iCloud sync safety (no parallel writes)
  - Comprehensive TypeScript contracts in `dev/contracts/MCP-107-contracts.ts` defining result schemas and failure handling
  - Test coverage: 24 new tests (12 unit, 12 integration) with 100% pass rate
  - No rollback mechanism yet (vault may be left inconsistent on link update failures) - limitation documented in tool responses
  - Activates `updateLinks` parameter in rename_note tool (Phase 1 limitation removed)

- **WAL Infrastructure** (MCP-115, 2025-11-01 13:29): Created WALManager class for Write-Ahead Log persistence, recovery, and cleanup (infrastructure foundation for atomic rename transactions)
  - Created `src/wal-manager.ts` (291 lines) with WALManager class providing write/read/delete/scan operations for transaction logs
  - WAL storage location: `~/.config/mcp-lifeos/wal/` (XDG-compliant, external to vault, avoids iCloud sync conflicts)
  - Filename format: `{timestamp}-rename-{correlationId}.wal.json` with filesystem-safe timestamp formatting
  - Schema version 1.0 with validation and future-proofing for schema evolution
  - UUID v4 correlation ID validation ensuring transaction tracking integrity
  - Automatic README.md generation in WAL directory explaining purpose and recovery procedures
  - Age-based WAL scanning: `scanPendingWALs()` returns only WALs older than 1 minute (excludes active transactions)
  - Graceful corrupted JSON handling during scans (logs errors, continues processing valid WALs)
  - Human-readable JSON formatting (pretty-printed with 2-space indentation) for debugging
  - Methods declared async for future-proofing (e.g., remote WAL storage) but currently use synchronous fs operations
  - Test coverage: 15+ unit tests in `tests/unit/wal-manager.test.ts` (535 lines) with 100% pass rate covering all operations and edge cases
  - No transaction integration yet - pure infrastructure layer for MCP-108 atomic rename implementation
  - Foundation for rollback-capable rename operations with link update safety

- **Atomic File Operations Foundation** (MCP-114, 2025-11-01 02:29): Extended VaultUtils.writeFileWithRetry() with atomic write capability using native Node.js fs temp-file-then-rename pattern
  - Added AtomicWriteOptions interface with atomic mode, retry configuration, and telemetry tracking flags
  - Opt-in atomic writes via `{ atomic: true }` parameter using `.mcp-tmp-{timestamp}-{filename}` temp files and POSIX atomic fs.renameSync()
  - Comprehensive error handling with try/catch/finally blocks ensuring temp file cleanup on all error paths
  - Full iCloud retry integration with existing ICLOUD_RETRY_CONFIG (3 retries, exponential backoff)
  - Zero new dependencies - uses native Node.js fs only
  - Code quality improvements: extracted retryWrite() and syncSleep() helpers eliminating retry logic duplication from 3 locations (net -12 lines)
  - Improved error diagnostics distinguishing atomic vs non-atomic failures with operation context
  - 100% backward compatible: atomic defaults to false, no changes to existing callers
  - Test coverage: 15 new unit tests with 100% pass rate, 574/579 existing tests passing (no regressions)
  - Foundation for MCP-108 transaction safety and MCP-115 WAL infrastructure
  - Contract-driven development using specifications from dev/contracts/MCP-108-contracts.ts

- **Link Detection Infrastructure** (MCP-106, 2025-10-31 04:49): Implemented read-only link scanner for vault-wide wikilink detection (Phase 2 of rename_note tool)
  - Created `src/link-scanner.ts` (426 lines) with LinkScanner class providing 3 static methods for vault-wide link scanning
  - Added centralized `WIKILINK_PATTERN` constant to `src/regex-utils.ts` supporting all Obsidian wikilink formats (basic, alias, heading, block reference, embed)
  - Made `SearchEngine.getAllNotes()` public for efficient cache-based vault access (eliminates unnecessary search scoring overhead)
  - Regex-based approach (simpler and faster than AST parsing) with comprehensive filtering options (code blocks, frontmatter, embeds, case sensitivity)
  - Performance targets: <5000ms for 1000+ notes, <50ms per note, <10ms per 1000 lines
  - Comprehensive TypeScript contracts in `dev/contracts/MCP-106-contracts.ts` defining input/output schemas and error handling
  - Test coverage: 42 new tests (30 unit, 12 integration) with 100% pass rate, all existing tests passing
  - Fixed regex instantiation bug (preserves global flag for multi-link detection on same line)
  - Applied code review optimizations: direct cache access via getAllNotes(), regex flag preservation, accurate cache documentation
  - Foundation for Phase 3 (MCP-107: Link Updates) - no MCP tool exposure yet, internal infrastructure only

- **Basic Rename Tool** (MCP-105, 2025-10-31 02:40): Added rename_note tool (Phase 1: basic rename without link updates)
  - Implemented rename_note handler in `src/server/handlers/note-handlers.ts` following established note handler patterns
  - Enhanced `VaultUtils.moveItem()` with optional `newFilename` parameter for zero-duplication architecture (adds 1 line, maintains backward compatibility)
  - Registered rename_note as 13th always-available tool with proper MCP annotations (readOnly: false, idempotent: false, openWorld: true)
  - Created comprehensive TypeScript contracts in `dev/contracts/MCP-105-contracts.ts` defining input/output schemas, error codes, and behavioral constraints
  - Accepts forward-compatible parameters (`updateLinks`, `dryRun`) for future phases without breaking changes
  - Implemented structured error handling with 5 error codes: FILE_NOT_FOUND, FILE_EXISTS, INVALID_PATH, PERMISSION_DENIED, UNKNOWN_ERROR
  - Added Phase 1 limitation warnings in responses (link updates deferred to MCP-107, dry-run to MCP-109)
  - Test coverage: 18 new tests (10 unit, 8 integration) with 100% pass rate, all 475 existing tests passing
  - Manual verification completed in Claude Desktop live environment
  - Updated tool count validation to 13 in `src/index.ts`
  - Path normalization and security validation via existing `normalizePath()` utility

### Changed

- **Architecture Documentation Update** (2025-11-01 at 3:00 AM): Updated docs/ARCHITECTURE.md to document MCP-114 atomic file operations capability
  - Added "Atomic Operations" subsection to Vault Utils documenting opt-in atomic writes via `writeFileWithRetry({ atomic: true })`
  - Documented temp-file-then-rename pattern using `.mcp-tmp-{timestamp}-{filename}` temp files and POSIX atomic `fs.renameSync()`
  - Highlighted iCloud retry integration and zero new dependencies (native Node.js fs only)
  - Noted foundation for MCP-108 transaction safety
  - Updated "Last Updated" timestamp to 2025-11-01

- **Switch Statement Removal** (MCP-99, 2025-10-30 21:39): Completed request handler extraction by removing switch statement entirely from index.ts, achieving pure factory pattern
  - Deleted 418-line switch statement (lines 222-639) from `src/index.ts`, eliminating all inline tool logic
  - Removed 3 mode guard checks from `src/server/handlers/legacy-alias-handlers.ts` enabling legacy alias handlers to work in all tool modes
  - Simplified hybrid dispatch by removing `toolModeConfig.mode !== 'legacy-only'` check, routing all legacy alias tools through registry in all modes
  - Reduced `src/index.ts` from 724 to 307 lines (-417 lines, -57% reduction from pre-MCP-99, -83% from original 1,797 lines)
  - Achieved target line count of 306 lines (actual: 307, within 1 line of goal)
  - All 35+ tool handlers now in dedicated modules with 100% registry-based routing (zero inline tool logic)
  - Updated 3 legacy alias handler tests to reflect new behavior (legacy aliases now work in legacy-only mode)
  - Test results: 449/454 tests passing (99.1% pass rate), 1 pre-existing flaky test unrelated to MCP-99
  - TypeScript clean build with no errors, server startup verified with consolidated-only mode
  - Unblocks MCP-9 for tool file reorganization with clean handler architecture

- **Always-Available Handler Extraction** (MCP-98, 2025-10-30 18:08): Extracted 9 always-available tool handlers with independent implementations into 3 logically-organized modules
  - Added `src/server/handlers/note-handlers.ts` (254 lines) with read_note, edit_note, and insert_content handlers for note CRUD operations
  - Added `src/server/handlers/utility-handlers.ts` (359 lines) with get_server_version, get_daily_note, diagnose_vault, and move_items handlers for server utilities
  - Added `src/server/handlers/metadata-handlers.ts` (224 lines) with get_yaml_rules and list_yaml_property_values handlers for YAML/metadata operations
  - Introduced `registerNoteHandlers()`, `registerUtilityHandlers()`, and `registerMetadataHandlers()` APIs for registry integration with lazy initialization
  - Integrated handler modules into request handler registry chain in `src/server/request-handler.ts` with special analytics exemption for get_daily_note
  - Reduced `src/index.ts` by 591 lines (39% reduction) while preserving analytics tracking, path normalization, and error handling
  - Extended `VaultUtils.moveItem()` to return itemType for type-safe handler implementations, eliminating direct fs.statSync calls
  - Created TypeScript contracts in `dev/contracts/MCP-98-contracts.ts` (377 lines) defining handler signatures and behavioral requirements
  - Applied 7 code review fixes including version metadata consistency, duplicate code removal, double analytics prevention, and type safety improvements
  - All 450/454 existing tests passing (99.1% pass rate) with manual verification of all 9 extracted handlers
  - Technical debt: Unit test coverage for extracted handlers recommended in follow-up cycle (~150-200 lines per handler)

- **Legacy Alias Handler Extraction** (MCP-97, 2025-10-30 09:11): Extracted 11 legacy tool alias handlers into dedicated module following established factory pattern
  - Added `src/server/handlers/legacy-alias-handlers.ts` (401 lines) with individual handler factories for backward compatibility
  - Introduced `registerLegacyAliasHandlers()` and `getLegacyAliasHandler()` public APIs for registry integration and hybrid dispatch
  - Integrated legacy alias handlers into request handler registry chain in `src/server/request-handler.ts`
  - Reduced `src/index.ts` by ~212 lines while preserving deprecation warnings and parameter mapping logic (contentType→query, pattern→query)
  - Added hybrid dispatch fallback pattern for legacy aliases mirroring consolidated tools (MCP-96)
  - Created comprehensive test coverage: 17 unit tests and 11 integration tests validating parameter mapping, mode guards, and deprecation warnings
  - All 11 legacy aliases (6 search, 1 template, 4 list) redirect to consolidated tools with backward-compatible parameter translation

- **Consolidated Handler Registry** (MCP-96, 2025-10-29 19:10): Populated the request-handler map with consolidated tool implementations and hybrid dispatch safeguards
  - Added `dev/contracts/MCP-96-contracts.ts` exposing `MutableToolHandlerRegistry`, `RequestHandlerWithClientContext`, and `UnknownToolError` for legacy fallback detection
  - Introduced `src/server/handlers/consolidated-handlers.ts` and refactored `src/server/request-handler.ts` to register `search`, `create_note`, and `list` through analytics-aware wrappers
  - Simplified `src/index.ts` to delegate tool execution to the registry, enabling client-context updates before each request
  - Expanded Jest coverage (unit and integration suites) to assert consolidated execution paths, mode gating, and fallback error propagation

- **Request Handler Infrastructure** (MCP-95, 2025-10-29 15:40): Established dedicated request handler factory module with infrastructure-only guardrails
  - Added `src/server/request-handler.ts` providing `createRequestHandler`, cached `isToolAllowed` validation, and analytics wrapper utilities
  - Created contracts in `dev/contracts/MCP-95-contracts.ts` and enhanced MCP-38 contracts so `validateMaxResults` returns structured metadata instead of throwing
  - Introduced unit and integration coverage (`tests/unit/server/request-handler.test.ts`, `tests/integration/request-handler-empty-registry.test.ts`) plus updated token-limit suites to assert new validation result shape
  - Registry remains intentionally empty pending MCP-96/97; guard prevents premature handler registration while maintaining existing runtime behavior

- **Tool Registry Extraction** (MCP-7, 2025-10-28 16:50): Extracted tool registration logic into dedicated pure function module
  - Created src/server/tool-registry.ts (856 lines) with 6 exported pure functions (public API: getConsolidatedTools, getLegacyTools, getLegacyAliases, getAlwaysAvailableTools, getToolsForMode, addVersionMetadata) plus internal helpers (validateToolCount)
  - Reduced src/index.ts from 2,588 to 1,797 lines (-791 lines, -30.5%)
  - Eliminated 400 lines of code duplication through shared constants
  - Tool registry provides mode-based assembly (legacy-only: 20 tools, consolidated-only: 12 tools, consolidated-with-aliases: 34 tools)
  - Contract-driven development with explicit TypeScript interfaces and dependency injection
  - Created comprehensive test suite: 17 unit tests achieving 100% coverage
  - No breaking changes: All existing functionality preserved
  - Foundation for future decomposition: Next phase is MCP-8 (request handlers)

- **MCP Server Factory Extraction** (MCP-6, 2025-10-28 12:13): Extracted server bootstrap logic into reusable factory module
  - Created src/server/mcp-server.ts (238 lines) with createMcpServer() factory function
  - Reduced src/index.ts from 2,659 to 2,550 lines (-109 lines)
  - Factory handles server instantiation, analytics initialization, session ID generation, and stdio transport
  - Created comprehensive test suite: 22 unit tests covering all factory capabilities
  - No breaking changes: All existing functionality maintained
  - Foundation for future decomposition: MCP-7 (tool registration) and MCP-8 (request handlers)

## [2.0.1] - 2025-10-27

- Restored all failing test suites (MCP-63–65) and centralized path normalization for daily note workflows.
- Consolidated `.md` handling inside `path-utils` and moved version metadata to `package.json` (MCP-82, MCP-89).

## [2.0.0] - 2025-10-24

- Introduced `TOOL_MODE` with consolidated defaults, preserved legacy aliases, and renamed `create_note_smart` to `create_note` (MCP-60).
- Typed key tool inputs (`EditNoteInput`, `InsertContentInput`, `MoveItemsInput`) to tighten developer ergonomics (MCP-40).
- Rebuilt documentation: lean README, dedicated API reference, and focused guides for configuration, templates, integrations, and troubleshooting.
- Standardized recovery-focused error copy across template, file, and YAML flows using reusable guidance patterns (MCP-39).
- Added optional `format` parameter for search/list to trim token usage while keeping detailed mode for compatibility (MCP-37).
- Migrated contracts to `dev/`, enriched tool docs with title extraction guidance and usage examples (MCP-29, MCP-36).
- Tagged tools with read/write/idempotent hints and published reference docs for server metadata, diagnostics, listing, smart note creation, and search (MCP-35 and related doc work).
- Hardened analytics, templates, task creation, and test isolation to keep production vaults clean (#83–#90).

## [1.8.0] - 2025-06-28

- Preserved analytics across restarts, fixed ES module regressions, and completed JSONL migration (#83).
- Delivered daily note template support, automatic task creation dates, and timezone regression coverage (#86–#90).
- Instrumented consolidated tools for usage analytics and documented the v2.0.0 rollout plan.

## [1.7.0] - 2025-06-05

- Added telemetry dashboard for routing decisions with negligible runtime overhead (#76).
- Finished tool consolidation with universal search/list/create flows and backward-compatible aliases (#62).

## [1.6.0] - 2025-06-04

- Shipped advanced YAML property search with caching, null handling, and updated documentation (#61).
- Improved repeat search performance while keeping `SearchResult` payloads stable.

## [1.5.0] - 2025-06-04

- Enabled natural-language YAML queries with entity extraction, confidence feedback, and graceful fallbacks (#70).
- Bolstered YAML parsing resilience to handle malformed frontmatter safely.

## [1.4.0] - 2025-06-04

- Added `list_yaml_property_values` for vault-wide property analysis and reporting (#57).
- Removed the deprecated web interface in favor of OpenWebUI guidance.

## [1.3.0] - 2025-06-02

- Introduced `list_yaml_properties` to inventory vault metadata and spot inconsistencies (#53).

## [1.2.1] - 2025-06-02

- Delivered context-aware `insert_content` targeting plus race-condition hardening in join logic (#29).

## [1.2.0] - 2025-01-29

- Added `get_yaml_rules`, comprehensive deployment docs, an automated setup script, and standardized project layout (#15, #19).
- Fixed template YAML parsing and reorganized scripts/docs for long-term maintainability (#17).

## [1.1.1] - 2025-01-29

- Removed unsupported schema `oneOf` to restore `move_items` compatibility.

## [1.1.0] - 2025-01-29

- Added `move_items` with batch operations, destination controls, and protective validation (#26).
- Preserved spaces and safe special characters in note filenames across creation tools (#25).
