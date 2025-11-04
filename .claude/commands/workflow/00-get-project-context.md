---
description: Gather comprehensive project context for MCP for LifeOS development
argument_hint: [mode] [component] [--serena] [--overview]
---

# Get Project Context - MCP for LifeOS

Get comprehensive understanding of the MCP for LifeOS project including architecture, recent changes, available agents, and key components for effective development work.

## Help Mode

If user provides `--help` or `help` parameter, display this usage guide:

```
get-project-context - Gather comprehensive MCP for LifeOS project context

USAGE:
  get-project-context                   Detailed comprehensive analysis (default)
  get-project-context overview          High-level project summary
  get-project-context architecture      Deep-dive into MCP architecture
  get-project-context recent            Recent changes and commits
  get-project-context tools             Available tools and routing
  get-project-context agents            Available Claude Code agents
  get-project-context --serena          Include Serena MCP symbol navigation
  get-project-context --overview        Use overview mode instead of detailed

MODES:
  overview       Project summary, tech stack, current status
  architecture   MCP server, tool router, search engine deep-dive
  recent         Git history, recent changes, active development
  tools          Tool consolidation, routing logic, MCP protocol
  agents         Available agents and their capabilities
  testing        Test architecture, validation strategies

EXAMPLES:
  get-project-context                    (detailed mode by default)
  get-project-context overview          (high-level summary)
  get-project-context architecture --serena
  get-project-context recent --overview
  get-project-context tools
```

## Mode Detection

Parse $ARGUMENTS to determine analysis focus:

- If contains "overview" or "--overview" → Project overview mode
- If contains "architecture" → Architecture deep-dive mode
- If contains "recent" → Recent changes mode
- If contains "tools" → Tool analysis mode
- If contains "agents" → Agent capabilities mode
- If contains "testing" → Testing strategy mode
- If contains "--serena" → Include Serena MCP analysis
- If no specific mode → Detailed comprehensive analysis (default)

## Context Detection (No Parameters)

If $ARGUMENTS is empty:

Analyze conversation context:

- Check for recent Linear issues mentioned
- Look for architecture/component discussions
- Review recent file modifications referenced

Present confirmation:

```
📋 Project Context Mode

Focus: {detected focus or "Comprehensive"}
Recent context: {brief summary}

Proceed? (y/n)
```

If unclear, default to overview mode.

## Instructions

This project is a Model Context Protocol (MCP) server for LifeOS Obsidian vault management with TypeScript architecture, tool consolidation, and AI optimization focus.

### Step 1: Activate Serena MCP

**Activate Serena MCP for comprehensive project context:**

```
mcp__serena__activate_project with project: /Users/shayon/DevProjects/mcp-for-lifeos
```

**Access Serena project memories and context:**

```
# Get available memories for this project
mcp__serena__list_memories

# Read relevant project memories
Read memories related to:
- "architecture" - MCP server architecture patterns
- "implementation patterns" - coding standards and patterns used
- "issues" - past implementation challenges and solutions
- "performance" - optimization patterns and considerations
- "testing" - testing strategies and patterns used
```

**Analyze project architecture with Serena:**

```
# Get comprehensive project structure understanding
mcp__serena__get_symbols_overview

# Search for key architectural patterns
mcp__serena__search_for_pattern with pattern: "MCP.*tool.*registration"
mcp__serena__search_for_pattern with pattern: "export.*interface.*Tool"
mcp__serena__search_for_pattern with pattern: "router.*consolidated"
```

### Step 2: Initialize Available Agents

Based on mode selection, engage appropriate agents:

**Core Agents Available:**

- `doc-search` - Documentation analysis and technical content search
- `git-expert` - Repository analysis, commit history, and change tracking
- `linear-expert` - Issue tracking and project management (Team ID: d1aae15e-d5b9-418d-a951-adcf8c7e39a8)
- `agent-Plan` - Code exploration and codebase analysis using Serena MCP

**Direct Tools for File Operations:**

- Read, Edit, Write tools for documentation updates
- Bash commands for file operations and timestamp capture
- Serena MCP for code symbol analysis and pattern matching

**Agent Selection by Mode:**

- Default (Detailed): All agents - comprehensive analysis
- Overview: `doc-search`, `git-expert` (high-level only)
- Architecture: `agent-Plan`, `doc-search` + Serena MCP for code exploration
- Recent: `git-expert`, `linear-expert`
- Tools: `agent-Plan`, `doc-search` + Serena MCP for tool analysis
- Testing: Direct bash + Read/Edit tools for test execution and analysis

### Step 3: Core Project Analysis with Serena Integration

**Enhanced project analysis using Serena symbol navigation:**

```
# Analyze key symbols and their relationships
mcp__serena__find_symbol with symbol: "McpServer" or "ToolRouter" or "SearchEngine"
mcp__serena__find_symbol with symbol: "createNoteFromTemplate" or "searchNotes" or "listTemplates"

# Get symbol relationships and dependencies
For each key symbol found, use get_symbol_info to understand:
- Symbol definition and type
- Dependencies and usage patterns
- Integration points with other components
```

Analyze these key MCP project components:

**Primary Documentation:**

- `README.md` - Comprehensive feature overview, tool reference
- `CHANGELOG.md` - Version history and feature evolution
- `CLAUDE.md` - Development instructions and project guidance
- `package.json` - Dependencies, scripts, project metadata

**Core Architecture Files:**

- `src/index.ts` - MCP server entry point and protocol implementation
- `src/tool-router.ts` - Unified tool routing with intelligent auto-mode detection
- `src/modules/search/search-engine.ts` - Full-text search with YAML filtering and relevance scoring
- `src/modules/files/` - File operations via domain modules (note-crud, daily-note-service, file-io, yaml-operations, content-insertion, folder-operations)
- `src/modules/templates/template-manager.ts` - Template discovery and caching system
- `src/modules/templates/template-engine-dynamic.ts` - Dynamic template processing with Templater syntax
- `src/modules/yaml/yaml-rules-manager.ts` - LifeOS YAML compliance and validation
- `src/modules/links/` - Link scanning and update orchestration
- `src/modules/transactions/` - Atomic operations with WAL
- `src/modules/analytics/` - Usage tracking and metrics

**Configuration & Build:**

- `src/shared/config.ts` - Vault paths and LifeOS integration settings
- `src/shared/types.ts` - Core type definitions
- `src/shared/` - Shared utilities (logger, path-utils, regex-utils, etc.)
- `tsconfig.json` - TypeScript configuration for MCP development
- `scripts/` - Development and testing automation

### Step 4: Architecture Deep-Dive (if architecture mode)

**MCP Server Architecture:**

- Model Context Protocol implementation via @modelcontextprotocol/sdk
- Stdio transport for Claude Desktop integration
- Tool registration and request routing
- Analytics collection and performance monitoring

**Tool Consolidation Strategy:**

- Unified `search` tool replacing 6 legacy search tools
- Smart `create_note_smart` with automatic template detection
- Universal `list` tool for all listing operations
- Intelligent routing with 95% AI tool selection accuracy

**Key Design Patterns:**

- Zero-maintenance analytics with visual dashboard
- Template caching for performance optimization
- YAML-first compliance with auto-managed field protection
- iCloud sync resilience with retry logic
- Natural language processing for search queries

### Step 5: Recent Development Analysis (if recent mode)

Use `git-expert` to analyze:

- Recent commits and development focus areas
- Active branches and pull request status
- Linear issues and project tracking (Team ID: d1aae15e-d5b9-418d-a951-adcf8c7e39a8)
- Performance improvements and optimization efforts
- Test coverage and validation enhancements

### Step 6: Tool Architecture Analysis (if tools mode)

**MCP Protocol Implementation:**

- Tool registration and capability declaration
- Request/response handling with proper error management
- Metadata inclusion for version tracking
- Analytics integration for usage monitoring

**Tool Categories:**

- Core Operations: create_note, read_note, edit_note, move_items, insert_content
- Search & Navigation: search, quick_search, advanced_search, search_recent
- Template System: create_note_from_template, list_templates
- YAML Management: list_yaml_properties, list_yaml_property_values
- Vault Operations: diagnose_vault, get_daily_note

### Step 7: Testing & Validation Strategy (if testing mode)

**Test Architecture:**

- Unit tests for core functionality (`tests/unit/`)
- Integration tests for MCP protocol compliance (`tests/integration/`)
- Claude Desktop accuracy testing (95% target achievement)
- Tool parity validation between consolidated and legacy tools
- Performance benchmarking and optimization validation

**Validation Commands:**

- `npm run typecheck` - TypeScript validation (preferred over ESLint)
- `npm run test:claude-desktop:accuracy` - AI tool selection accuracy
- `npm run test:tool-parity` - Consolidated vs legacy tool output matching
- `npm run test:integration` - Full MCP protocol testing

## Output Format

```
## 🎯 MCP for LifeOS Context

**Mode**: {mode} | **Version**: {version}

### 📊 Architecture

- MCP Server: stdio transport, {tool count} tools
- Tool Router: 95% accuracy, 6→1 consolidation
- Search: Full-text + YAML filtering
- Templates: Dynamic processing, Templater syntax

### 🤖 Available Agents

- doc-search: Documentation analysis
- git-expert: Repository analysis
- linear-expert: Project management (Team: d1aae15e-d5b9-418d-a951-adcf8c7e39a8)
- agent-Plan: Code exploration using Serena MCP

### 🔧 Direct Tools

- Read/Edit/Write: Documentation file operations
- Bash: File operations, timestamp capture
- Serena MCP: Code analysis, pattern matching

### 🔧 Development

- Validate: `npm run typecheck`
- Test: Unit, integration, accuracy (95% target)
- Deploy: Feature branch → PR → master
- Analytics: Port 19832

### 📈 Recent {if recent mode}

{git-expert summary: commits, branches, focus areas}

### 💡 Next Steps

- {Specific actionable recommendations based on mode}

---

{timestamp} | Mode: {mode} | Serena: {activated}
```
