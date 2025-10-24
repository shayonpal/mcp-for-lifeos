# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records documenting significant architectural and strategic decisions for the LifeOS MCP Server.

## Decision Log

| ADR | Title | Status | Date | Impact |
|-----|--------|--------|------|--------|
| [001](./001-openwebui-integration-strategy.md) | OpenWebUI Integration Over Custom Web Interface | Superseded | 2025-01-06 | **High** - Strategic pivot from custom to community solutions |
| [002](./002-strategic-pivot-to-core-server.md) | Strategic Pivot to Core MCP Server Development | **Accepted** | 2025-08-29 | **Critical** - Focus shift to technical debt and server excellence |
| [003](./003-search-tool-consolidation-fallback-strategy.md) | Search Tool Consolidation and Intelligent Fallback Strategy | **Accepted** | 2025-06-04 | **High** - AI tool optimization with 95% query success rate |
| [004](./004-project-review-roadmap-2025.md) | Project Review and Technical Debt Roadmap | **Accepted** | 2025-08-29 | **Critical** - Comprehensive roadmap for production readiness |
| [005](./005-default-tool-mode-consolidated-only.md) | Default TOOL_MODE Changed to 'consolidated-only' | **Accepted** | 2025-10-23 | **Medium** - Improved UX with cleaner tool list, simple migration path |

## Current Strategic Direction

**Active**: Focus on core MCP server development and technical debt reduction  
**Priority**: Test suite health, monolithic file decomposition, tool consolidation validation  
**Deferred**: All web interface approaches (OpenWebUI, LinuxServer.io, custom PWA)

## ADR Template

New ADRs should follow this structure:
- **Status**: Proposed/Accepted/Superseded
- **Context**: What prompted this decision?
- **Decision Drivers**: Key factors influencing the choice
- **Considered Options**: Alternatives evaluated with pros/cons
- **Decision Outcome**: Chosen option with rationale
- **Consequences**: Positive/negative impacts and trade-offs

## Related Documentation

- **Product Specifications**: `../specs/` - Feature specs, implementation plans, use cases
- **Archived Analysis**: `../archive/openwebui-poc/` 
- **Implementation Plans**: Linear project management
- **Tool Optimization**: `../specs/features/tool-consolidation-optimization.md`