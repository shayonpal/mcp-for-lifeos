# LifeOS MCP Server - Project Overview

## Purpose
A Model Context Protocol (MCP) server for managing the LifeOS Obsidian vault. This server provides AI assistants with structured access to create, read, and search notes while maintaining strict YAML compliance and organizational standards.

## Tech Stack
- **Language**: TypeScript (ES2022 target, ESNext modules)
- **Runtime**: Node.js (>=18.0.0)
- **Framework**: MCP SDK (@modelcontextprotocol/sdk)
- **Build Tool**: TypeScript compiler (tsc)
- **Testing**: Jest with ts-jest
- **Package Manager**: npm
- **Additional Libraries**:
  - Fastify (HTTP server with CORS and static file support)
  - gray-matter (YAML frontmatter parsing)
  - date-fns (Date manipulation)
  - glob (File pattern matching)
  - yaml (YAML parsing)
  - @anthropic-ai/sdk (AI integration)

## Project Structure
```
mcp-for-lifeos/
├── src/                    # Source code
│   ├── server/            # HTTP server components
│   ├── analytics/         # Analytics and telemetry
│   └── [various .ts files] # Core functionality modules
├── tests/                 # Test suites
│   ├── integration/       # Integration tests
│   └── unit/             # Unit tests
├── docs/                  # Documentation
│   ├── 01-current-poc/   # POC docs (deprioritized)
│   ├── 02-strategic-docs/ # Strategic analysis
│   └── [other doc folders]
├── scripts/               # Automation scripts
├── raycast-scripts/       # Raycast integration
└── public/               # Static assets
```

## Key Features
- YAML-compliant note creation with custom rules
- PARA method organization (Projects/Areas/Resources/Archives)
- 11+ LifeOS templates integration
- Advanced search with relevance scoring
- Obsidian clickable links
- Daily notes management
- Personal analytics dashboard
- Robust error handling and diagnostics

## Configuration
The server requires a `src/config.ts` file (created from `src/config.example.ts`) with paths to:
- Obsidian vault location
- Templates directory
- Optional YAML rules document
- People mappings for contacts

## Version
Current version: 1.8.0 (Semantic Versioning)