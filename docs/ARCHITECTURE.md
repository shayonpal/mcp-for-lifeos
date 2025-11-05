# Architecture Overview

**Last Updated:** 2025-11-03
**Version:** 2.0.1

This document provides a high-level overview of the LifeOS MCP Server architecture, core components, and key design patterns.

---

## Module Structure

**Status:** Modularized (Phase 5 complete)

The codebase is organized into focused modules following domain-driven design:

```
src/
├── modules/               # Domain modules (business logic)
│   ├── files/            # File operations, vault utils, CRUD (7 modules)
│   ├── templates/        # Template system and processing (5 modules)
│   ├── yaml/             # YAML parsing and validation (2 modules)
│   ├── search/           # Full-text search engine (3 modules)
│   ├── links/            # Link scanning and updates (3 modules)
│   ├── transactions/     # Atomic operations with WAL (2 modules)
│   ├── config/           # Custom instructions processing (2 modules)
│   └── analytics/        # Usage tracking and metrics (2 modules)
├── shared/               # Shared utilities and core types
│   ├── types.ts          # Core type definitions
│   ├── config.ts         # Configuration and settings
│   ├── logger.ts         # Logging infrastructure
│   ├── error-types.ts    # Error definitions
│   ├── path-utils.ts     # Path manipulation utilities
│   ├── regex-utils.ts    # Regex patterns
│   ├── text-utils.ts     # Text processing utilities
│   └── date-resolver.ts  # Date parsing and resolution
├── server/               # MCP server infrastructure
│   ├── mcp-server.ts     # Server factory
│   ├── request-handler.ts # Request routing
│   ├── tool-registry.ts  # Tool registration
│   └── handlers/         # Tool handler implementations
├── index.ts              # MCP entry point
└── tool-router.ts        # Unified tool routing

dev/contracts/            # TypeScript contracts and interfaces
tests/                    # Unit and integration tests
docs/                     # Documentation
```

**Key Benefits:**

- Zero circular dependencies (validated via madge)
- Clean module boundaries with barrel exports
- Improved discoverability and maintainability
- Test baseline maintained: 781/785 passing

---

## Core Components

### MCP Server Factory (`src/server/mcp-server.ts`)

Reusable factory module for MCP server instantiation and configuration. Centralizes server bootstrap logic to enable shared server creation across multiple transports (stdio, HTTP).

**Key Responsibilities:**

- Server instantiation with configurable name/version
- Analytics singleton management (AnalyticsCollector)
- Tool mode parsing with backward compatibility
- Session ID generation (UUID v4)
- Optional stdio transport creation
- Client info tracking via oninitialized callback
- Lifecycle management: connect(), shutdown()

**Factory Interface:**

```typescript
function createMcpServer(config: McpServerConfig): McpServerInstance
```

**Created:** 2025-10-28 - 238 lines  
**Status:** Tool registration complete; request handler infrastructure implemented

### Tool Registry (`src/server/tool-registry.ts`)

Pure function module that centralizes tool registration, configuration, and mode-based assembly. Provides catalog of all MCP tools with metadata, organized by operational mode.

**Key Responsibilities:**

- Tool configuration management (3 consolidated + 11 legacy + 11 aliases)
- Mode-based tool assembly (legacy-only, consolidated-only, consolidated-with-aliases)
- Tool count validation per mode (13/21/24 tools)
- Version metadata injection into server responses
- Backward compatibility alias management
- Pure functions with explicit dependency injection

**Exported Functions:**

- `getConsolidatedTools()` - Returns 3 universal AI-optimized tools
- `getLegacyTools()` - Returns 11 legacy tools for backward compatibility
- `getLegacyAliases()` - Returns 11 backward compatibility aliases
- `getAlwaysAvailableTools()` - Returns 9 core tools available in all modes
- `getToolsForMode(config)` - Assembles tools based on mode with validation
- `addVersionMetadata(response, config)` - Injects version metadata into responses

**Design Patterns:**

- Pure functions (no module state)
- Explicit dependency injection via ToolRegistryConfig
- Contract-driven development with TypeScript interfaces
- Shared constants to eliminate duplication (LEGACY_TOOL_DEFINITIONS)

**Created:** 2025-10-28 - 856 lines  
**Test Coverage:** 100% (17 unit tests)  
**Status:** Complete, supports request handler infrastructure and handler extraction

### Request Handler Infrastructure (`src/server/request-handler.ts`)

Factory module for MCP request handling with registry-based tool dispatch.

**Key Responsibilities:**

- Provide `createRequestHandler()` factory that compiles shared context once and dispatches tool requests via handler registry
- Offer `isToolAllowed()` utility with cached tool-name sets per mode, replacing scattered availability checks
- Wrap tool handlers with analytics logging via `wrapHandlerWithAnalytics()` to maintain telemetry parity (with exemptions for handlers with manual tracking)
- Define structural contracts and align `validateMaxResults()` to return structured metadata

**Handler Registration Chain:**

1. **Consolidated Handlers**: search, create_note, list
2. **Legacy Alias Handlers**: 11 backward compatibility aliases
3. **Note Handlers**: read_note, edit_note, insert_content
4. **Utility Handlers**: get_server_version, get_daily_note, diagnose_vault, move_items
5. **Metadata Handlers**: get_yaml_rules, list_yaml_property_values

**Status:** Complete with 24 handlers registered across 5 modules (3 consolidated + 11 legacy aliases + 10 always-available)

**Switch Statement Removal:** Completed 2025-10-30 - All inline tool logic removed from index.ts, achieving pure factory pattern with 100% registry-based routing

**Test Coverage:** Unit and integration suites validate tool-mode enforcement, registry dispatch, and analytics wrapping

### Handler Modules (`src/server/handlers/`)

Extracted handler implementations organized by functional responsibility.

**Consolidated Handlers** (`consolidated-handlers.ts`):

- `search` - Universal search with auto-routing (replaces 6 legacy search tools)
- `create_note` - Smart note creation with template auto-detection
- `list` - Universal listing with auto-type detection

**Legacy Alias Handlers** (`legacy-alias-handlers.ts`):

- 11 backward compatibility aliases for deprecated tool names
- Parameter translation (contentType→query, pattern→query)
- Deprecation warnings in responses
- Legacy aliases work in all tool modes including legacy-only

**Note Handlers** (`note-handlers.ts`):

- `read_note` - Read notes with formatted content and metadata
- `edit_note` - Update note frontmatter and/or content (merge/replace modes)
- `rename_note` - Rename note files with validation
- `insert_content` - Insert content at specific locations (heading, blockRef, pattern, lineNumber)

**Utility Handlers** (`utility-handlers.ts`):

- `get_server_version` - Server information and capabilities
- `get_daily_note` - Daily note handling with auto-creation and analytics tracking
- `diagnose_vault` - Vault health diagnostics and YAML validation
- `move_items` - Move notes/folders with various options

**Metadata Handlers** (`metadata-handlers.ts`):

- `get_yaml_rules` - YAML frontmatter rules document
- `list_yaml_property_values` - Property value analysis with usage statistics

**Design Patterns:**

- Lazy initialization via `ensureHandlersInitialized()`
- Chaining registration pattern: `registry => populate => return`
- Hybrid dependency injection: Context for runtime state, imports for stateless utilities
- Analytics exemptions for handlers with manual tracking (get_daily_note)
- Version metadata injection for MCP compliance

**Total Lines:** 1,638 across 5 modules (consolidated: 401, legacy: 401, note: 254, utility: 359, metadata: 224)

### MCP Server Entry Point (`src/index.ts`)

Main entry point implementing Model Context Protocol server. Coordinates server factory, tool registry, and request routing via pure factory pattern.

**Key Responsibilities:**

- MCP protocol implementation and request routing
- Request/response handling via handler registry factory
- Hybrid dispatch fallback for resilience during transitions
- Integration of server factory and tool registry
- Server lifecycle management

**Hybrid Dispatch Pattern:**

- **Primary Path:** Registry-based dispatch via `createRequestHandler()`
- **Fallback Path:** Individual handler execution with `executeWithHybridFallback()`
- **Analytics Exemptions:** Tools with manual tracking (get_daily_note) excluded from automatic wrapping
- **Module-Level Sets:** Tool name sets cached at module load for O(1) lookup performance
- **Error Recovery:** `UnknownToolError` detection triggers fallback with logging

**Design Patterns:**

- Pure factory pattern (switch statement completely removed)
- O(1) registry-based dispatch via Map.get()
- Cached tool name sets (built once at module load)
- Helper function consolidation (`executeWithHybridFallback()`)
- Analytics double-counting prevention via exemption list

**Status:** Reduced from 1,797 lines (baseline) → 724 lines → 307 lines (current), total reduction of 1,490 lines (-83% from baseline)  
**Decomposition Progress:** Complete as of 2025-10-30 - all 35+ handlers extracted to dedicated modules, 418-line switch statement removed, achieved pure factory pattern with 100% registry-based routing

### Tool Router (`src/tool-router.ts`)

Consolidates multiple legacy tools into unified interfaces with intelligent auto-mode detection. Routes search, creation, and listing operations to appropriate handlers.

**Unified Tools:**

- `search` - Universal search with auto-routing (replaces 6 legacy search tools)
- `create_note` - Smart note creation with template auto-detection (legacy alias: `create_note_smart`)
- `list` - Universal listing (folders, daily notes, templates, YAML properties)

**Design:** Maintains backward compatibility while simplifying AI interactions

### Search Engine (`src/modules/search/search-engine.ts`)

Full-text search with YAML property filtering, relevance scoring, and natural language processing. Handles all search operations across the Obsidian vault.

**Features:**

- Multi-word query parsing with QueryParser
- Relevance scoring with TF-IDF
- YAML metadata filtering
- Natural language query understanding
- Token budget management (~25K response limit)

### File Operations Module

The file operations module (`src/modules/files/`) provides focused, single-purpose utilities for vault interactions:

**Module Components:**

- **file-io.ts** - File reading/writing with cloud sync retry logic and atomic operations
- **note-crud.ts** - Note CRUD operations (read, write, create, update)
- **yaml-operations.ts** - YAML parsing, validation, property analysis
- **folder-operations.ts** - Folder/item movement and organization
- **content-insertion.ts** - Content insertion at specific locations
- **daily-note-service.ts** - Daily note operations and auto-creation
- **index.ts** - Barrel export for all file operations

**Key Responsibilities:**

- File I/O with cloud storage sync retry logic and atomic write capability
- Atomic file operations via temp-file-then-rename pattern (native Node.js fs)
- YAML frontmatter parsing and validation
- Obsidian-compliant file naming
- PARA method folder structure enforcement

**Atomic Operations** (2025-11-01):

- Opt-in atomic writes via `writeFileWithRetry({ atomic: true })`
- Uses `.mcp-tmp-{timestamp}-{filename}` temp files and POSIX atomic `fs.renameSync()`
- Full cloud sync retry integration with existing retry logic
- Zero new dependencies - native Node.js fs only
- Foundation for transaction safety

**Design Patterns:**

Each module exposes pure functions with clear contracts. See `dev/contracts/` for interface definitions.

**Status:** Completed (Phase 4) - vault-utils.ts fully decomposed into 7 focused modules

### Link Update Infrastructure

Two-phase system for vault-wide wikilink updates after note rename operations.

**`src/modules/links/link-scanner.ts`** (Phase 2):

- Vault-wide wikilink detection with regex-based scanning
- Performance: <5000ms for 1000+ notes, <50ms per note
- Supports all Obsidian wikilink formats (basic, alias, heading, block reference, embed)

**`src/modules/links/link-updater.ts`** (Phase 3):

- Three-mode operation: RENDER, COMMIT, DIRECT
- **RENDER mode**: Read-only content map generation without writes (returns LinkRenderResult)
- **COMMIT mode**: Atomic writes from pre-rendered content map (uses atomic file operations)
- **DIRECT mode**: Legacy behavior (read + update + write), default for backward compatibility
- Function overloading with TypeScript signatures for type safety per mode
- Shared helper `scanAndGroupReferences()` eliminates code duplication
- Memory characteristics: ~1-2KB per note, 1-10MB for 1000 files, 100-200MB for 10K+ files
- Foundation for TransactionManager atomic rename transactions

**Design Pattern:**

- Separation of rendering phase (read + compute) from commit phase (write)
- Enables validation before committing changes
- Supports rollback mechanisms via WAL integration

### Template System

Multi-component system for Obsidian template integration:

**`template-manager.ts`**

- Discovers and caches Obsidian templates
- 24-hour cache for performance
- Auto-detection of template types

**`template-engine-dynamic.ts`**

- Creates notes from templates with metadata injection
- Processes Templater syntax
- Handles YAML frontmatter validation

**`template-parser.ts`**

- Processes Templater syntax (`<% tp.file.title %>`, `<% tp.date.now() %>`)
- Template variable substitution
- YAML-safe template processing

### WAL Manager (`src/modules/transactions/wal-manager.ts`)

Write-Ahead Log infrastructure for transaction persistence, recovery, and cleanup. Provides durable storage for transaction state outside the vault to enable crash recovery and rollback operations.

**Key Responsibilities:**

- WAL persistence with filesystem-safe timestamp formatting
- Transaction state recovery from persisted logs
- Age-based WAL scanning (excludes active transactions <1 minute old)
- Automatic README generation in WAL directory explaining recovery procedures
- Schema version validation for future-proofing

**WAL Storage:**

- Location: `~/.config/mcp-lifeos/wal/` (XDG-compliant, external to vault)
- Filename format: `{timestamp}-rename-{correlationId}.wal.json`
- Schema version: 1.0 with validation and evolution support
- Format: Human-readable JSON (pretty-printed, 2-space indentation)

**Operations:**

- `writeWAL()` - Persist transaction state with correlation ID validation
- `readWAL()` - Recover transaction state from log file
- `deleteWAL()` - Clean up completed transactions
- `scanPendingWALs()` - Find abandoned transactions (age >1 minute)

**Design Patterns:**

- UUID v4 correlation ID validation for transaction tracking
- Graceful corrupted JSON handling during scans
- Async method signatures for future remote storage support
- External to vault storage (avoids cloud storage sync conflicts)

**Created:** 2025-11-01 - 291 lines  
**Test Coverage:** 15+ unit tests (535 lines) with 100% pass rate  
**Status:** Foundation for TransactionManager integration

### Transaction Manager (`src/modules/transactions/transaction-manager.ts`)

Five-phase atomic transaction protocol for file rename operations with full rollback capability, Write-Ahead Logging, and staleness detection. Coordinates complex rename operations involving file moves and vault-wide link updates while ensuring vault consistency.

**Five-Phase Protocol:**

1. **PLAN** - Build operation manifest with SHA-256 file hashes for staleness detection
2. **PREPARE** - Stage files to temporary locations, write WAL entry for crash recovery
3. **VALIDATE** - Verify files haven't been modified during transaction (hash validation)
4. **COMMIT** - Atomically promote staged files using POSIX rename semantics, execute link updates
5. **SUCCESS/ABORT** - Clean up temps and WAL on success, or trigger rollback on failure

**Key Responsibilities:**

- Atomic file rename with link update coordination
- SHA-256 hash validation for staleness detection (throws `TRANSACTION_STALE_CONTENT`)
- Two-phase link updates: render mode (plan), commit mode (commit)
- UUID v4 correlation ID tracking across all phases
- WAL integration: write during prepare, update at transitions, preserve on failure
- Graceful rollback with partial recovery support
- Manual recovery instruction generation when automatic rollback fails
- Phase timing metrics for performance monitoring

**Operations:**

- `execute()` - Main orchestrator running all five phases
- `plan()` - Build manifest with SHA-256 hashes
- `prepare()` - Stage files and write WAL
- `validate()` - Detect stale content via hash comparison
- `commit()` - Atomically promote staged files
- `success()` - Cleanup temps and WAL (graceful degradation)
- `abort()` - Trigger rollback on any phase failure
- `rollback()` - Restore from WAL with partial recovery tracking

**Error Handling:**

- New error codes: `TRANSACTION_PLAN_FAILED`, `TRANSACTION_PREPARE_FAILED`, `TRANSACTION_VALIDATE_FAILED`, `TRANSACTION_COMMIT_FAILED`, `TRANSACTION_ROLLBACK_FAILED`, `TRANSACTION_STALE_CONTENT`
- Comprehensive error wrapping with transaction context
- Partial rollback tracking when some operations succeed
- Manual recovery instructions for failed automatic rollback

**Integration Points:**

- WALManager for crash recovery
- Link Updater for two-phase link updates
- writeFileWithRetry() from file-io module for atomic writes
- Zero external dependencies (Node.js built-ins: crypto, fs, path)

**Created:** 2025-11-01 - 691 lines  
**Test Coverage:** 31 comprehensive unit tests (869 lines) with 100% pass rate  
**Status:** Integrated with rename_note tool, boot recovery enabled

### Boot Recovery System (`src/index.ts`)

Automatic recovery mechanism that detects and rolls back incomplete transactions from server crashes during boot. Ensures vault consistency by cleaning up orphaned WAL entries left by unexpected server termination.

**Key Responsibilities:**

- Scan WAL directory on server startup for orphaned transactions
- Skip WALs younger than 1 minute (may be active from concurrent processes)
- Attempt automatic rollback via TransactionManager for stale WALs (>1min old)
- Log recovery results with clear status indicators (✅/⚠️/❌)
- Preserve WAL files on recovery failure for manual intervention
- Graceful degradation: continue server startup regardless of recovery outcome

**Recovery Function:**

- `recoverPendingTransactions()` - Executes early in boot sequence before handler registration
- Non-blocking: server availability prioritized over recovery completion
- Performance: <5s overhead for typical scenarios

**Recovery Process:**

1. Scan `~/.config/mcp-lifeos/wal/` for WAL entries
2. Filter by age (skip <1 minute, process ≥1 minute)
3. For each orphaned WAL:
   - Attempt `TransactionManager.rollback(walPath)`
   - Log success (✅), partial recovery (⚠️), or failure (❌)
   - Preserve WAL on failure for manual recovery
4. Continue server startup regardless of outcome

**Design Patterns:**

- Early boot integration (before MCP handlers registered)
- Age-based filtering to avoid interfering with active transactions
- Graceful degradation on recovery failures
- Manual recovery path via preserved WAL files
- Status symbol logging for operator visibility

**Created:** 2025-11-02 - 92 lines in src/index.ts  
**Test Coverage:** 15 integration tests in `tests/integration/boot-recovery.test.ts`  
**Status:** Operational with full test suite

### Transaction System

Comprehensive atomic transaction infrastructure for vault-modifying operations with full rollback capability, Write-Ahead Logging, and crash recovery. Ensures vault consistency through five-phase protocol guaranteeing all-or-nothing semantics.

**Architecture Overview:**

The transaction system provides atomic rename operations with vault-wide link updates through coordinated interaction between TransactionManager, WALManager, and Boot Recovery. All components work together to ensure vault consistency even in the face of crashes, power failures, or concurrent modifications.

**Key Components:**

1. **TransactionManager** (`src/modules/transactions/transaction-manager.ts`) - Five-phase protocol orchestration
2. **WALManager** (`src/modules/transactions/wal-manager.ts`) - Transaction log persistence and recovery
3. **Boot Recovery** (`src/index.ts`) - Automatic orphaned transaction cleanup
4. **Link Infrastructure** (`src/modules/links/link-scanner.ts`, `src/modules/links/link-updater.ts`) - Vault-wide link updates

**Five-Phase Protocol:**

1. **PLAN**: Build operation manifest with SHA-256 hashes for staleness detection
2. **PREPARE**: Stage files to temp locations, write WAL for crash recovery
3. **VALIDATE**: Verify files unchanged via hash comparison (detects concurrent edits)
4. **COMMIT**: Atomically promote staged files using POSIX rename semantics
5. **SUCCESS/ABORT**: Cleanup temps and WAL, or trigger rollback on failure

**Transaction Error Codes:**

- `TRANSACTION_PLAN_FAILED` - Manifest building failures (phase 1)
- `TRANSACTION_PREPARE_FAILED` - File staging or WAL write failures (phase 2)
- `TRANSACTION_VALIDATE_FAILED` - Validation failures (phase 3)
- `TRANSACTION_STALE_CONTENT` - Concurrent file modifications detected (phase 3)
- `TRANSACTION_COMMIT_FAILED` - Atomic rename failures (phase 4)
- `TRANSACTION_ROLLBACK_FAILED` - Rollback failures requiring manual recovery
- `TRANSACTION_FAILED` - General handler-level transaction failures

**Integration with rename_note:**

The `rename_note` tool delegates all rename operations to TransactionManager, ensuring atomic execution with automatic rollback. Breaking change from Phase 3: success responses no longer include warnings array - operations either fully succeed or fully fail.

**Performance Characteristics:**

- **Overhead**: 2-8x baseline (100-400ms vs 50ms for simple rename)
- **Phase Timings**: Plan (5-10ms), Prepare (50-200ms), Validate (20-100ms), Commit (10-50ms/file), Cleanup (10-30ms)
- **Scalability**: Tested up to 1000 affected files, recommended <100 for optimal performance
- **WAL Size**: ~1KB metadata + ~100 bytes per affected file

**Crash Recovery:**

Boot recovery automatically scans WAL directory on server startup, identifies orphaned transactions (>1 minute old), and attempts rollback. Recovery failures preserve WAL files for manual intervention. Server startup continues regardless of recovery outcome (graceful degradation).

**Related Documentation:**

- **[Transaction System Guide](guides/TRANSACTION-SYSTEM.md)** - Complete architecture and error code reference
- **[WAL Recovery Guide](guides/WAL-RECOVERY.md)** - Manual recovery procedures and troubleshooting
- **[rename_note Tool](tools/rename_note.md)** - Tool documentation with transaction examples

### Analytics (`src/modules/analytics/`)

Zero-maintenance telemetry system tracking tool usage, performance metrics, and routing effectiveness with visual dashboard.

**Features:**

- Tool usage tracking and frequency analysis
- Performance metrics (execution time, cache hit rates)
- Routing effectiveness monitoring
- Visual dashboard (port 19832)
- <1ms overhead per operation

**Default:** Enabled (opt-out via `DISABLE_USAGE_ANALYTICS=true`)

### Config Module (`src/modules/config/`)

Custom instruction processing and hot-reload infrastructure. Provides scaffolding for configurable instruction handling with file-based or inline configuration support.

**Components:**

- `instruction-processor.ts` - Instruction application hooks and file watching
- `index.ts` - Barrel exports for module interface

**Current Status:** Phase 1 scaffolding - pass-through mode with no branching logic

**Features:**

- Inline instruction configuration (`CustomInstructionsConfig.inline`)
- File-based instruction references (`CustomInstructionsConfig.filePath`)
- Hot-reload via `fs.watch()` with lazy initialization
- Test isolation via `DISABLE_CONFIG_WATCH` environment variable
- Graceful degradation on watcher errors

**InstructionProcessor Methods:**

- `getInstructions()` - Retrieve current instructions (inline or file-based)
- `applyInstructions()` - Apply instructions to context (currently pass-through)
- `initializeWatcher()` - Setup file watcher for hot-reload
- `clearCache()` - Cache invalidation for instruction reload
- `cleanup()` - Watcher cleanup for test isolation

**Phase 1 Behavior:**

- Returns inline config if configured
- Warns when file path provided (file reading not yet implemented)
- `applyInstructions()` returns context unchanged (pure pass-through)
- No branching logic (scaffolding only)

**Future Phases:**

- File-based instruction reading implementation
- Instruction branching logic by operation type
- Context modification based on instruction rules
- Integration with note creation/editing tools

**Test Coverage:** 23 unit tests with mock-based file watcher tests

---

## Key Design Patterns

### Unified Tool Architecture

Consolidated tools (`search`, `create_note`, `list`) use intelligent routing to maintain backward compatibility while simplifying AI interactions.

**Benefits:**

- Reduced cognitive load for AI agents (3 tools instead of 15+)
- Backward compatibility maintained (legacy tools deprecated but functional)
- Intelligent auto-mode detection reduces tool selection errors
- Consistent parameter patterns across unified tools

**Example:** `search` tool auto-routes between:

- Quick search (simple text queries)
- Advanced search (metadata filters)
- Content type search (by YAML properties)
- Recent search (by modification date)
- Pattern search (glob patterns)

### YAML Compliance

Strict enforcement of LifeOS YAML rules through `yaml-rules-manager.ts`. Never edits auto-managed fields, validates frontmatter structure.

**Key Rules:**

- Never edit `date created` or `date modified` fields
- Use `source` field for URLs (not `url` or `URL`)
- Location format: `Country [CODE]` (e.g., `Canada [CA]`)
- Tag format flexibility: string, array, or YAML list
- Validation before all note modifications

**Integration:** `get_yaml_rules` tool exposes rules to AI agents for compliance

### Template Processing Pipeline

Templates discovered → cached for 24 hours → Templater syntax processed → YAML validated → note created with proper folder placement.

**Pipeline Stages:**

1. **Discovery:** Scan templates folder, detect template types
2. **Caching:** Store template metadata for 24 hours
3. **Selection:** Auto-detect or explicit template selection
4. **Processing:** Parse Templater syntax, inject custom data
5. **Validation:** Validate YAML frontmatter against LifeOS rules
6. **Creation:** Create note in correct PARA folder with processed content

**Performance:** Sub-second template processing with caching

### Module Import Policy

Enforced import conventions to maintain modular boundaries and prevent circular dependencies.

**Import Rules:**

1. **Within Same Module:**
   - Use relative imports (e.g., `./file-io`, `../shared/utils`)
   - Direct imports within same directory

2. **Cross-Module Imports:**
   - Import via barrel exports (module's `index.ts`)
   - Example: `import { templateEngine } from '../modules/templates'`
   - Never import directly from module internals

3. **Circular Dependencies:**
   - Zero tolerance - detected via `npm run check:circular`
   - Pre-existing violations to be resolved during modularization
   - CI/manual validation enforced on all PRs

**Validation:**

- Automated via madge: `npm run check:circular`
- Runs as part of test suite validation
- Pre-existing circular dependencies documented and tracked for resolution

**Directory Structure (Post-Modularization):**

```
src/
├── app/              # Application layer (future)
├── modules/          # Feature-focused modules
│   ├── templates/    # Template system
│   ├── yaml/         # YAML processing
│   ├── search/       # Search engine & NLP
│   ├── files/        # Vault file operations
│   ├── links/        # Link management
│   ├── transactions/ # Transaction management
│   └── analytics/    # Analytics collection
├── shared/           # Shared utilities
└── server/           # MCP server infrastructure
```

**Status:** Import policy established and enforced

### Error Resilience

Graceful handling of malformed YAML, missing templates, cloud storage sync delays with automatic retry logic.

**Resilience Features:**

- **Cloud Storage Sync:** 3 retry attempts with exponential backoff
- **YAML Parsing:** Diagnostic error messages with line numbers
- **Missing Templates:** Fallback to basic YAML frontmatter
- **File Conflicts:** Safe overwrite confirmation
- **Validation Errors:** Detailed error messages with suggested fixes

---

## Integration Points

### Claude Desktop

Pure MCP server via stdio, disabled web interface by default.

**Configuration:**

```json
{
  "command": "node",
  "args": ["/absolute/path/to/mcp-for-lifeos/dist/src/index.js"],
  "env": {
    "ENABLE_WEB_INTERFACE": "false"
  }
}
```

### Raycast

AI commands with `@lifeos-mcp` mention support for quick vault operations.

**Features:**

- Mention-based tool access
- Quick search from root search
- Note creation via AI commands
- Clickable Obsidian links

### Issue Tracking Integration

Supports integration with issue tracking systems via MCP servers (e.g., Linear, GitHub Issues, etc.).

**Integration Pattern:**

- Direct issue tracking via MCP server protocols
- Workflow: Manual validation, feature branch development
- Configure your preferred issue tracker via MCP server settings

---

## Important Technical Notes

### Analytics

- **Default State:** Enabled
- **Opt-Out:** Set `DISABLE_USAGE_ANALYTICS=true`
- **Overhead:** <1ms per operation
- **Dashboard:** Port 19832 (start with `node scripts/start-analytics-dashboard.js`)

### Template Caching

- **Duration:** 24 hours
- **Purpose:** Performance optimization
- **Invalidation:** Server restart or cache expiry

### Cloud Storage Sync Retry Logic

- **Retry Logic:** 3 attempts with exponential backoff
- **Delay:** 100ms, 200ms, 400ms between retries
- **Platform:** Unix-based (macOS, Linux, WSL2)
- **Rationale:** Handle cloud storage sync delays (iCloud, Dropbox, OneDrive, etc.)

### Type Checking

- **Tool:** TypeScript `tsc` (not eslint)
- **Command:** `npm run typecheck`
- **CI/CD:** None (manual validation workflow)

---

## Performance Characteristics

### Tool Execution Times

- **Search:** 50-200ms (depends on vault size, query complexity)
- **Note Creation:** 100-300ms (with template processing)
- **Note Reading:** 10-50ms (cached frontmatter)
- **YAML Validation:** 5-10ms per note

### Memory Usage

- **Baseline:** 50-100MB typical operation
- **Search Operations:** Up to 200MB for large result sets
- **Template Cache:** ~5MB for 100 templates

### Scalability Limits

- **Vault Size:** Tested up to 7GB (10,000+ notes)
- **Concurrent Clients:** Single instance (stdio transport)
- **Search Results:** Auto-truncated to ~25K token budget

---

## Related Documentation

- **[Current Focus](CURRENT-FOCUS.md)** - Active development priorities
- **[ADR-002](adr/002-strategic-pivot-to-core-server.md)** - Strategic direction
- **[ADR-004](adr/004-project-review-roadmap-2025.md)** - Technical debt roadmap
- **[Tool Consolidation](specs/features/tool-consolidation-optimization.md)** - Unified tool design
- **[Deployment Guide](guides/DEPLOYMENT-GUIDE.md)** - Setup and deployment
- **[Configuration Guide](guides/CONFIGURATION.md)** - Configuration options

---

## Future Architecture Plans

See [ADR-004: Project Review Roadmap](adr/004-project-review-roadmap-2025.md) for comprehensive technical debt reduction plan including:

- **Slice 1:** Analytics fix (multi-instance data loss)
- **Slice 2:** Server decomposition (reduce monolithic files)
- **Slice 3:** Tool consolidation validation and legacy retirement
- **Slice 4:** Documentation and developer experience improvements
