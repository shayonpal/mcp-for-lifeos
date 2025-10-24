# Architecture Overview

**Last Updated:** 2025-10-24  
**Version:** 2.0.0

This document provides a high-level overview of the LifeOS MCP Server architecture, core components, and key design patterns.

---

## Core Components

### MCP Server (`src/index.ts`)

Main entry point implementing Model Context Protocol server. Handles tool registration, request routing, and client communication via stdio transport.

**Key Responsibilities:**

- Tool registration and MCP protocol implementation
- Request/response handling for 20+ MCP tools
- Client communication via stdio
- Server lifecycle management

**Status:** Monolithic (2,224 lines) - scheduled for decomposition in roadmap

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

- File I/O with iCloud sync retry logic
- YAML frontmatter parsing and validation
- Obsidian-compliant file naming
- PARA method folder structure enforcement

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

## Transport Layer

The MCP server supports dual transport modes for local and remote access.

### stdio Transport (Default)

Standard input/output transport for local MCP clients like Claude Desktop and Raycast.

**Characteristics:**

- **Connection:** Process-to-process communication via stdin/stdout
- **Clients:** Claude Desktop, Raycast, Cursor IDE
- **Security:** Process isolation (no network exposure)
- **Session:** Single persistent connection per client
- **Default State:** Always enabled

**Configuration:**

```json
{
  "command": "node",
  "args": ["/path/to/mcp-for-lifeos/dist/src/index.js"]
}
```

### HTTP Transport (Optional)

Streamable HTTP transport for remote access via Cloudflare Tunnel, enabling web-based AI platforms.

**Characteristics:**

- **Protocol:** MCP Streamable HTTP (spec 2025-03-26)
- **Mode:** Stateless (no session management)
- **Endpoint:** Single POST `/mcp` for all operations
- **Clients:** claude.ai Custom Connectors, CLI tools, web clients
- **Security:** Localhost binding + DNS rebinding protection
- **Default State:** Disabled (opt-in via `ENABLE_HTTP_TRANSPORT=true`)

**Architecture:**

```
claude.ai → Cloudflare Tunnel → localhost:19831/mcp → MCP Server
```

**Implementation:**

- Uses `@modelcontextprotocol/sdk` StreamableHTTPServerTransport
- Stateless mode: Each request creates new transport instance
- No session storage or persistence layer required
- Dual transport: stdio and HTTP run simultaneously

**Configuration:**

```bash
# .env
ENABLE_HTTP_TRANSPORT=true
HTTP_PORT=19831
HTTP_HOST=localhost
ENABLE_DNS_REBINDING_PROTECTION=true
ALLOWED_HOSTS=127.0.0.1,localhost
```

**Security:**

- **Localhost Binding:** Server only accepts connections from localhost
- **DNS Rebinding Protection:** Validates Host header against whitelist
- **Cloudflare Tunnel:** Creates encrypted connection to public endpoint
- **No Direct Exposure:** Server never exposed to internet directly

**Deployment:**  
See [ADR-006](./adr/006-http-transport-cloudflare-tunnel.md) for Cloudflare Tunnel deployment strategy and [ADR-007](./adr/007-streamable-http-sdk-implementation.md) for SDK implementation details.

**Performance:**

- Stateless operations enable horizontal scaling
- No session affinity requirements
- Request latency: <100ms (p95) for tool invocations
- Memory: No session storage overhead

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
