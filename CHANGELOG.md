# Changelog

All notable changes to the LifeOS MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2025-11-05

- **BREAKING**: Removed `warnings` array from `rename_note` success responses - operations now fully atomic with transaction error codes (MCP-118).
- Implemented atomic rename operations with five-phase transaction protocol, SHA-256 staleness detection, WAL crash recovery, vault-wide link updates (all formats), dry-run preview, and boot recovery (MCP-105–124).
- Added custom instruction system with hot-reload for automatic YAML defaults, content boilerplate, and LLM guidance metadata (MCP-90, MCP-92, MCP-121, MCP-150).
- Completed modularization into 24 domain modules with zero circular dependencies and eliminated 483-line VaultUtils facade (MCP-91, MCP-133–148).
- Established request handler infrastructure with pure factory pattern reducing `src/index.ts` from 2,224 to 503 lines (77% reduction) (MCP-6–10, MCP-95–99).
- Added 54 integration tests, machine-readable tool schemas, Unix-only platform policy (macOS, Linux, WSL2), and generalized documentation for external users (MCP-10, MCP-14, MCP-100, MCP-164).
- Fixed test isolation, template engine bugs, EPIPE race conditions, and tool count inconsistencies (MCP-129, MCP-148, MCP-150, MCP-164).
- Removed unused `@anthropic-ai/sdk` dependency (~200KB reduction).

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
