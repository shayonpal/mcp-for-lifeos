# Archived Content Documentation

This document catalogs all archived content in the LifeOS MCP repository, explaining what was archived, why, and when.

**Last Updated**: 2025-11-05
**Related Issue**: [MCP-14: Tool Documentation Overhaul](https://linear.app/agilecode-studio/issue/MCP-14)

---

## Overview

As the LifeOS MCP project evolved from proof-of-concept to production-ready, various experimental implementations, test scripts, and architectural decisions were archived. This document provides a comprehensive index of archived content and the rationale for each archival.

## Archive Locations

### 1. Test Scripts (`scripts/archived/`)

**Archived Date**: 2025-10-22
**Related Issue**: Linear MCP-61

#### Contents
- `test-claude-desktop.js` - Claude Desktop integration tests
- `test-issue-61-acceptance.js` - YAML search feature acceptance tests
- `test-tool-parity.js` - Tool parity validation
- `test-tool-consolidation.js` - Consolidation testing
- `test-analytics.js` - Analytics system testing
- `test-advanced-features.js` - Advanced feature testing

#### Why Archived
- **Migration to Jest**: All functionality migrated to comprehensive Jest test suite (250+ tests)
- **Safety Concerns**: Process-spawning approach risked polluting production vault
- **Redundancy**: Jest tests provide better isolation and coverage
- **Industry Best Practice**: Consolidated on single testing framework

#### Replacement
- Jest test suite in `tests/unit/` and `tests/integration/`
- Proper test isolation with temporary vaults
- See `tests/README.md` for current testing patterns

#### Safety Warning
⚠️ **DO NOT RUN** archived test scripts - they can create artifacts in production vault

**Reference**: `scripts/archived/README.md`

---

### 2. OpenWebUI POC Documentation

**Archived Date**: 2025-01-06 (Superseded)
**Related Issue**: GitHub #9, #10, #11

#### Context
The project initially explored building a custom Progressive Web App (PWA) interface for mobile/iPad access to the Obsidian vault. After 80% completion, the project pivoted to OpenWebUI integration.

#### Architecture Decision Records (ADR)

##### ADR-001: OpenWebUI Integration Strategy
**Status**: Superseded by ADR-002
**Location**: `docs/adr/001-openwebui-integration-strategy.md`

**Key Points**:
- Decided to use OpenWebUI instead of custom PWA
- Saved 2-3 weeks of development time
- Provided mature chat interface with MCP support
- Enabled focus on core MCP functionality

**Decision**: OpenWebUI + Conditional PWA approach
- Phase 1: OpenWebUI integration (completed)
- Phase 2: MCP tool optimization (completed)
- Phase 3: Conditional PWA evaluation (completed - not needed)

#### Why Archived
- **Strategic Pivot**: Custom web interface development abandoned in favor of OpenWebUI
- **Resource Optimization**: Redirected development time to core MCP features
- **Infrastructure Dependency**: OpenWebUI provided professional UI with less maintenance
- **Feature Parity**: OpenWebUI offered advanced features (multi-LLM, conversation management)

#### Current State
- OpenWebUI integration documented in user guides
- Custom PWA code preserved for reference but not maintained
- Focus remains on MCP server functionality, not UI development

**Reference**: `docs/adr/001-openwebui-integration-strategy.md`

---

### 3. Legacy Tool Architecture (2025-08-29)

**Status**: Superseded by consolidated tools
**Related Issues**: Linear MCP-60, MCP-96, MCP-97

#### What Changed
- **Before**: 37 individual tools with overlapping functionality
- **After**: 13 consolidated tools (default mode) with intelligent routing

#### Tool Count Evolution
- **Original**: 37 tools (all separate)
- **Consolidated-only**: 13 tools (modern, default)
- **Legacy-only**: 21 tools (backward compatibility)
- **Consolidated-with-aliases**: 24 tools (maximum compatibility)

#### Why Consolidated
- **Complexity Reduction**: Fewer tools for AI agents to choose from
- **Better UX**: Clearer tool purposes and usage patterns
- **Intelligent Routing**: Auto-mode detection for optimal behavior
- **Backward Compatibility**: Legacy tools preserved in compatibility modes

#### Migration Path
- Default mode uses consolidated tools
- Legacy mode available via `TOOL_MODE=legacy-only`
- Aliases available in `TOOL_MODE=consolidated-with-aliases`
- Full migration guide in ADR-005

**Reference**:
- `docs/adr/005-default-tool-mode-consolidated-only.md`
- `docs/api/TOOLS.md` (Tool Visibility Modes section)

---

## Archived Feature Specifications

### 1. Original Tool Documentation Overhaul (MCP-14)

**Original Scope (2025-08-29)**:
- Document all 37 original tools individually
- Create AI Tool Optimization PRD
- Build system overview documentation
- Create development guides

**Why Re-Scoped**:
- **Architecture Changed**: Tool consolidation reduced from 37 → 13 tools
- **Organic Evolution**: Documentation evolved with codebase over 2+ months
- **Already Complete**: Most original goals achieved through other work
  - API documentation exists (`docs/api/TOOLS.md`, 508 lines)
  - Architecture documented (`ARCHITECTURE.md`, 791 lines)
  - 7+ guides created (`docs/guides/`)
  - 49+ markdown files in repository

**Re-Scoped Focus (2025-11-05)**:
- Automated tool schema generation
- Example workflow documentation
- JSON schema export for external tools
- Archive cleanup documentation (this file)

**Reference**: [Linear MCP-14](https://linear.app/agilecode-studio/issue/MCP-14)

---

## Archive Access Guidelines

### For Historical Reference

Archived content is preserved for:
1. **Context Understanding**: Why certain decisions were made
2. **Migration Reference**: Understanding evolution of the codebase
3. **Avoiding Repetition**: Learning from past experiments

### DO NOT

- ❌ Run archived test scripts (risk of vault pollution)
- ❌ Copy archived test patterns (superseded by Jest)
- ❌ Build on archived PWA code (not maintained)
- ❌ Use archived tool names without checking current API

### DO

- ✅ Read ADRs to understand architectural decisions
- ✅ Reference archived docs for historical context
- ✅ Learn from migration patterns
- ✅ Follow current test isolation patterns

---

## Timeline of Major Archives

| Date | What | Why | Reference |
|------|------|-----|-----------|
| 2025-01-06 | OpenWebUI POC | Strategic pivot to OpenWebUI | ADR-001 |
| 2025-08-29 | Original 37 tools | Consolidated to 13 tools | MCP-60, ADR-005 |
| 2025-10-22 | Test scripts | Migrated to Jest | MCP-61, `scripts/archived/` |
| 2025-11-05 | Original MCP-14 scope | Re-scoped after organic completion | MCP-14 (updated) |

---

## Current Active Documentation

### Core Documentation
- **README.md** - Project overview and quickstart
- **ARCHITECTURE.md** - System architecture (791 lines)
- **CHANGELOG.md** - Version history and changes

### API Documentation
- **docs/api/TOOLS.md** - Complete tool reference (508 lines)
- **docs/api/tool-schemas.json** - Machine-readable schemas
- **docs/api/examples/** - 5 workflow examples

### Guides
- **docs/guides/CONFIGURATION.md** - Server configuration
- **docs/guides/DEPLOYMENT.md** - Deployment strategies
- **docs/guides/INTEGRATIONS.md** - Client integrations
- **docs/guides/TEMPLATES.md** - Template system
- **docs/guides/TROUBLESHOOTING.md** - Common issues

### Architecture Decision Records (ADRs)
- **docs/adr/** - 8+ ADR documents
- Most recent: ADR-005 (Default tool mode)

---

## Questions?

### About Testing
- See `tests/README.md` for current patterns
- Use Jest test suite: `npm test`
- Review integration test examples in `tests/integration/`

### About Tools
- See `docs/api/TOOLS.md` for current API
- Check `docs/api/tool-schemas.json` for schemas
- Review examples in `docs/api/examples/`

### About Architecture
- Read `ARCHITECTURE.md` for system overview
- Review ADRs in `docs/adr/` for decisions
- Check `docs/guides/` for implementation details

---

## Contributing

When archiving new content:

1. **Update this document** with what, why, when, and where
2. **Create clear README** in archived directory explaining context
3. **Update related docs** to remove references to archived content
4. **Document alternatives** - what should be used instead
5. **Consider ADR** if it's an architectural decision

---

**For questions about archived content**: Check references listed above or open an issue on [GitHub](https://github.com/shayonpal/mcp-for-lifeos/issues).

**To add to this archive**: Follow the contribution guidelines above and submit a PR.
