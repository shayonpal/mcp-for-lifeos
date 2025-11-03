# Changelog

All notable changes to the LifeOS MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
  - Created `src/transaction-manager.ts` (691 lines) with TransactionManager class providing execute(), plan(), prepare(), validate(), commit(), success(), abort(), rollback() methods for managing atomic rename transactions
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
