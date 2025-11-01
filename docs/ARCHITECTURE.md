# Architecture Overview

**Last Updated:** 2025-11-01
**Version:** 2.0.1

This document provides a high-level overview of the LifeOS MCP Server architecture, core components, and key design patterns.

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

**Created:** 2025-10-28 (MCP-6) - 238 lines
**Status:** MCP-7 (tool registration) complete; request handler infrastructure landed in MCP-95

### Tool Registry (`src/server/tool-registry.ts`)

Pure function module that centralizes tool registration, configuration, and mode-based assembly. Provides catalog of all MCP tools with metadata, organized by operational mode.

**Key Responsibilities:**

- Tool configuration management (3 consolidated + 11 legacy + 11 aliases)
- Mode-based tool assembly (legacy-only, consolidated-only, consolidated-with-aliases)
- Tool count validation per mode (12/20/34 tools)
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

**Created:** 2025-10-28 (MCP-7) - 856 lines
**Test Coverage:** 100% (17 unit tests)
**Status:** Complete, supports request handler infrastructure (MCP-95) and upcoming handler extraction

### Request Handler Infrastructure (`src/server/request-handler.ts`)

Factory module for MCP request handling with registry-based tool dispatch. Introduced in MCP-95 and fully populated in MCP-96, MCP-97, and MCP-98.

**Key Responsibilities:**

- Provide `createRequestHandler()` factory that compiles shared context once and dispatches tool requests via handler registry
- Offer `isToolAllowed()` utility with cached tool-name sets per mode, replacing scattered availability checks
- Wrap tool handlers with analytics logging via `wrapHandlerWithAnalytics()` to maintain telemetry parity (with exemptions for handlers with manual tracking)
- Define structural contracts in `dev/contracts/MCP-95-contracts.ts` and align `validateMaxResults()` to return structured metadata

**Handler Registration Chain:**

1. **Consolidated Handlers** (MCP-96): search, create_note, list
2. **Legacy Alias Handlers** (MCP-97): 11 backward compatibility aliases
3. **Note Handlers** (MCP-98): read_note, edit_note, insert_content
4. **Utility Handlers** (MCP-98): get_server_version, get_daily_note, diagnose_vault, move_items
5. **Metadata Handlers** (MCP-98): get_yaml_rules, list_yaml_property_values

**Status:** Complete with 29 handlers registered across 5 modules (3 consolidated + 11 legacy aliases + 9 always-available + 6 remaining in hybrid dispatch)

**Switch Statement Removal (MCP-99):** Completed 2025-10-30 - All inline tool logic removed from index.ts, achieving pure factory pattern with 100% registry-based routing

**Test Coverage:** Unit and integration suites validate tool-mode enforcement, registry dispatch, and analytics wrapping

### Handler Modules (`src/server/handlers/`)

Extracted handler implementations organized by functional responsibility. Introduced across MCP-96, MCP-97, MCP-98, and finalized in MCP-99 with complete switch statement removal.

**Consolidated Handlers** (`consolidated-handlers.ts` - MCP-96):
- `search` - Universal search with auto-routing (replaces 6 legacy search tools)
- `create_note` - Smart note creation with template auto-detection
- `list` - Universal listing with auto-type detection

**Legacy Alias Handlers** (`legacy-alias-handlers.ts` - MCP-97, updated MCP-99):
- 11 backward compatibility aliases for deprecated tool names
- Parameter translation (contentType→query, pattern→query)
- Deprecation warnings in responses
- Mode guard removal (MCP-99): Legacy aliases now work in all tool modes including legacy-only

**Note Handlers** (`note-handlers.ts` - MCP-98, MCP-105):
- `read_note` - Read notes with formatted content and metadata
- `edit_note` - Update note frontmatter and/or content (merge/replace modes)
- `rename_note` - Rename note files with validation (Phase 1: basic rename without link updates)
- `insert_content` - Insert content at specific locations (heading, blockRef, pattern, lineNumber)

**Utility Handlers** (`utility-handlers.ts` - MCP-98):
- `get_server_version` - Server information and capabilities
- `get_daily_note` - Daily note handling with auto-creation and analytics tracking
- `diagnose_vault` - Vault health diagnostics and YAML validation
- `move_items` - Move notes/folders with various options

**Metadata Handlers** (`metadata-handlers.ts` - MCP-98):
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

**Status:** Reduced from 1,797 lines (baseline) → 724 lines (pre-MCP-99) → 307 lines (post-MCP-99), total reduction of 1,490 lines (-83% from baseline)
**Decomposition Progress:** Complete as of 2025-10-30 - all 35+ handlers extracted to dedicated modules, 418-line switch statement removed (MCP-99), achieved pure factory pattern with 100% registry-based routing

### Tool Router (`src/tool-router.ts`)

Consolidates multiple legacy tools into unified interfaces with intelligent auto-mode detection. Routes search, creation, and listing operations to appropriate handlers.

**Unified Tools:**

- `search` - Universal search with auto-routing (replaces 6 legacy search tools)
- `create_note_smart` - Smart note creation with template auto-detection
- `list` - Universal listing (folders, daily notes, templates, YAML properties)

**Design:** Maintains backward compatibility while simplifying AI interactions

### Search Engine (`src/search-engine.ts`)

Full-text search with YAML property filtering, relevance scoring, and natural language processing. Handles all search operations across the Obsidian vault.

**Features:**

- Multi-word query parsing with QueryParser
- Relevance scoring with TF-IDF
- YAML metadata filtering
- Natural language query understanding
- Token budget management (~25K response limit)

### Vault Utils (`src/vault-utils.ts`)

Core file operations with iCloud sync resilience, YAML parsing/validation, and Obsidian-compliant file naming. Central interface for vault interactions.

**Key Responsibilities:**

- File I/O with iCloud sync retry logic and atomic write capability
- Atomic file operations via temp-file-then-rename pattern (native Node.js fs)
- YAML frontmatter parsing and validation
- Obsidian-compliant file naming
- PARA method folder structure enforcement

**Atomic Operations** (MCP-114, 2025-11-01):
- Opt-in atomic writes via `writeFileWithRetry({ atomic: true })`
- Uses `.mcp-tmp-{timestamp}-{filename}` temp files and POSIX atomic `fs.renameSync()`
- Full iCloud retry integration with existing retry logic
- Zero new dependencies - native Node.js fs only
- Foundation for MCP-108 transaction safety

**Status:** Monolithic (1,687 lines) - scheduled for decomposition in roadmap

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

### Analytics (`src/analytics/`)

Zero-maintenance telemetry system tracking tool usage, performance metrics, and routing effectiveness with visual dashboard.

**Features:**

- Tool usage tracking and frequency analysis
- Performance metrics (execution time, cache hit rates)
- Routing effectiveness monitoring
- Visual dashboard (port 19832)
- <1ms overhead per operation

**Default:** Enabled (opt-out via `DISABLE_USAGE_ANALYTICS=true`)

---

## Key Design Patterns

### Unified Tool Architecture

Consolidated tools (`search`, `create_note_smart`, `list`) use intelligent routing to maintain backward compatibility while simplifying AI interactions.

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

### Error Resilience

Graceful handling of malformed YAML, missing templates, iCloud sync delays with automatic retry logic.

**Resilience Features:**

- **iCloud Sync:** 3 retry attempts with exponential backoff
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

### Linear

Issue tracking via Linear MCP Server for project management.

**Team Details:**

- **Team Name:** MCP for LifeOS
- **Team ID:** `d1aae15e-d5b9-418d-a951-adcf8c7e39a8`
- **Workflow:** Manual validation, direct master commits

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

### iCloud Sync

- **Retry Logic:** 3 attempts with exponential backoff
- **Delay:** 100ms, 200ms, 400ms between retries
- **Platform:** macOS only
- **Rationale:** Handle iCloud Drive sync delays

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
