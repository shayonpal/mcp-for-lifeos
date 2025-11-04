# LifeOS MCP Server Documentation

This directory contains comprehensive documentation for the LifeOS MCP Server, organized by purpose and maintained for current development priorities.

## 📁 Directory Structure

### 🏛️ [`adr/`](./adr/) - Architecture Decision Records

**Major architectural and strategic decisions**

- [ADR-001](./adr/001-openwebui-integration-strategy.md) - OpenWebUI Integration Strategy (Superseded)
- [ADR-002](./adr/002-strategic-pivot-to-core-server.md) - **Strategic Pivot to Core Server Development** ⭐
- [ADR-003](./adr/003-search-tool-consolidation-fallback-strategy.md) - Search Tool Consolidation Strategy
- [ADR-004](./adr/004-project-review-roadmap-2025.md) - **Project Review and Technical Debt Roadmap** ⭐

### 📖 [`guides/`](./guides/) - Setup and Integration Guides

**Client setup, deployment, and integration instructions**

- [Deployment Guide](./guides/DEPLOYMENT-GUIDE.md) - Complete setup and deployment instructions
- [Configuration Guide](./guides/CONFIGURATION.md) - Detailed configuration options
- [Templates Guide](./guides/TEMPLATES.md) - Template system and customization
- [Integrations Guide](./guides/INTEGRATIONS.md) - Client integration setup
- [Troubleshooting Guide](./guides/TROUBLESHOOTING.md) - Common issues and solutions
- [Raycast Integration](./guides/RAYCAST-INTEGRATION.md) - Raycast setup for macOS
- [Cursor Integration](./guides/CURSOR-IDE-INTEGRATION.md) - Cursor IDE setup and usage

### 📋 [`specs/`](./specs/) - Product Specifications

**Feature requirements, implementation plans, and use cases**

- [`features/`](./specs/features/) - Product requirements and feature specifications
- [`implementation/`](./specs/implementation/) - Technical implementation guides
  - [Request Handler Infrastructure (MCP-95)](./specs/implementation/request-handler-infrastructure.md)
- [`use-cases/`](./specs/use-cases/) - User scenarios and workflow documentation
- [`rfcs/`](./specs/rfcs/) - Request for Comments (future major changes)

### 🗄️ [`archive/`](./archive/) - Historical Documentation

**Preserved historical content and deprecated approaches**

- [`openwebui-poc/`](./archive/openwebui-poc/) - OpenWebUI integration analysis (deprioritized)
- [`legacy-pwa/`](./archive/legacy-pwa/) - Legacy web interface specifications (abandoned)

## 🎯 Current Strategic Direction

**Status**: Focus on core MCP server development and technical debt reduction  
**Priority**: Server decomposition, test suite health, analytics fixes  
**Deferred**: All web interface approaches (OpenWebUI, LinuxServer.io, custom PWA)

### Key Documents for Current Phase

1. **[ADR-002: Strategic Pivot](./adr/002-strategic-pivot-to-core-server.md)** - Current direction and rationale
2. **[ADR-004: Project Roadmap](./adr/004-project-review-roadmap-2025.md)** - Comprehensive technical debt roadmap
3. **[Tool Consolidation Spec](./specs/features/tool-consolidation-optimization.md)** - AI optimization implementation

## 🚀 Quick Start

### For Contributors

1. **Understand Current Direction**: Read [ADR-002](./adr/002-strategic-pivot-to-core-server.md)
2. **See Roadmap**: Review [ADR-004](./adr/004-project-review-roadmap-2025.md) for priorities
3. **Setup Environment**: Follow [Deployment Guide](./guides/DEPLOYMENT-GUIDE.md)

### For Users

1. **Setup**: [Deployment Guide](./guides/DEPLOYMENT-GUIDE.md)
2. **Client Integration**: [Raycast](./guides/RAYCAST-INTEGRATION.md) | [Cursor](./guides/CURSOR-IDE-INTEGRATION.md)
3. **Common Issues**: See README.md Common Issues section

## 📊 Project Status

**Technical Debt Score**: 7.8/10 → Target: 3.0/10  
**Test Suite Health**: 67% passing → Target: 100%
**Tool Count**: 37 tools → Target: ~11 tools
**File Status**: index.ts (✅ 307 lines, decomposition complete), modules/files/ (✅ 7 modules, decomposition complete via MCP-91) → Target: <500 lines each

**Active Linear Projects**:

- Emergency Analytics Fix (P0)
- Server Decomposition + Rename Tool (P1)
- Tool Consolidation Validation & Legacy Retirement (P1)

## 🔄 Documentation Lifecycle

### Current Documents

- **ADRs**: Document major architectural decisions and strategic pivots
- **Guides**: Maintain for current integrations and deployment procedures
- **Specs**: Active specifications for current and planned features

### Historical Documents

- **Archive**: Preserved for context but not actively maintained
- **Legacy Approaches**: OpenWebUI, PWA, custom web interfaces (all deprioritized)

### Future Documentation

As outlined in ADR-004 Slice 4:

- **API Documentation** (`docs/api/`) - Auto-generated tool reference
- **System Reference** (`docs/reference/`) - Architecture overview, development guide

## 📝 Maintenance Guidelines

**Update When**:

- ADRs: After major architectural or strategic decisions
- Guides: When client integration procedures change  
- Specs: During active feature development
- Archive: Generally preserved as-is (historical record)

**Update Responsibility**:

- **ADRs**: Lead developer/architect for major decisions
- **Guides**: Community contributions welcome for integration improvements
- **Specs**: Product owner and development team collaboration

---

**Last Updated**: August 29, 2025  
**Documentation Version**: 3.0 (Post-cleanup & ADR implementation)  
**Project Management**: Linear (Team ID: `d1aae15e-d5b9-418d-a951-adcf8c7e39a8`)
