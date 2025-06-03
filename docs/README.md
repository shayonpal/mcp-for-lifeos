# MCP-for-LifeOS Documentation

This directory contains all project documentation organized by purpose and lifecycle stage.

## 📁 Folder Structure

### 🎯 [`01-current-poc/`](./01-current-poc/) - POC Documentation (DEPRIORITIZED)
**OpenWebUI Integration Proof of Concept - Currently on hold**
- [`POC-OpenWebUI-Integration-PRD.md`](./01-current-poc/POC-OpenWebUI-Integration-PRD.md) - Complete POC specification and requirements
- [`POC-Dependencies-Analysis.md`](./01-current-poc/POC-Dependencies-Analysis.md) - Issue dependency mapping and execution order
- [`POC-GitHub-Project-Fields.md`](./01-current-poc/POC-GitHub-Project-Fields.md) - GitHub project field assignments and component mapping
- [`POC-Issues-Specification.md`](./01-current-poc/POC-Issues-Specification.md) - Detailed 21-issue POC breakdown
- [`Claude-Session-Onboarding.md`](./01-current-poc/Claude-Session-Onboarding.md) - ⭐ **Quick session startup prompt**

### 📊 [`02-strategic-docs/`](./02-strategic-docs/) - Strategic Analysis
**High-level strategy and architectural decisions**
- [`Obsidian-Web-Access-Alternative.md`](./02-strategic-docs/Obsidian-Web-Access-Alternative.md) - ⭐ **Current approach using LinuxServer.io solution**
- [`OpenWebUI-Integration-Strategy.md`](./02-strategic-docs/OpenWebUI-Integration-Strategy.md) - Original integration strategy (deprioritized)
- [`OpenWebUI-vs-PWA-Decision-Analysis.md`](./02-strategic-docs/OpenWebUI-vs-PWA-Decision-Analysis.md) - DECIDE framework analysis for PWA vs OpenWebUI

### 🗄️ [`03-legacy-specs/`](./03-legacy-specs/) - Legacy & Paused Specifications
**Historical specifications and paused development tracks**
- [`Legacy-Web-Interface-PRD.md`](./03-legacy-specs/Legacy-Web-Interface-PRD.md) - Original custom web interface specification
- [`Paused-PWA-PRD.md`](./03-legacy-specs/Paused-PWA-PRD.md) - Mobile PWA specification (paused pending OpenWebUI validation)

### 📋 [`04-project-management/`](./04-project-management/) - Project Management
**GitHub project setup and workflow management**
- [`GitHub-Project-Setup-Assessment.md`](./04-project-management/GitHub-Project-Setup-Assessment.md) - Project board configuration and field mapping

### 🔌 [`05-integration-guides/`](./05-integration-guides/) - Integration Guides
**Third-party tool integrations and deployment**
- [`Cursor-IDE-Integration.md`](./05-integration-guides/Cursor-IDE-Integration.md) - Cursor IDE setup and usage
- [`Raycast-Integration.md`](./05-integration-guides/Raycast-Integration.md) - Raycast integration for macOS
- [`Deployment-Guide.md`](./05-integration-guides/Deployment-Guide.md) - Production deployment instructions

### 🛠️ [`06-troubleshooting/`](./06-troubleshooting/) - Support & Troubleshooting
**Debugging guides and common issues**
- [`General-Troubleshooting.md`](./06-troubleshooting/General-Troubleshooting.md) - Common issues and solutions

## 🚀 Quick Start for New Sessions

**For strategic context**, refer to:
```
📄 02-strategic-docs/Obsidian-Web-Access-Alternative.md
```
This documents the current LinuxServer.io Obsidian web access evaluation approach.

## 📈 Current Project Status

**Phase**: Evaluating LinuxServer.io Obsidian Web Access Solution
**Previous Milestone**: [OpenWebUI Integration POC](https://github.com/shayonpal/mcp-for-lifeos/milestone/2) - DEPRIORITIZED
**Current Focus**: Testing native Obsidian web interface with Copilot plugin for chat capabilities

### Current Priority Documents
1. **Current Strategy**: [`02-strategic-docs/Obsidian-Web-Access-Alternative.md`](./02-strategic-docs/Obsidian-Web-Access-Alternative.md)
2. **Deprioritized POC**: [`01-current-poc/POC-OpenWebUI-Integration-PRD.md`](./01-current-poc/POC-OpenWebUI-Integration-PRD.md)
3. **Session Onboarding**: [`01-current-poc/Claude-Session-Onboarding.md`](./01-current-poc/Claude-Session-Onboarding.md)

## 📚 Document Lifecycle

### Active Documents
- All files in `01-current-poc/` and `02-strategic-docs/`
- Reflect current project direction and active work

### Legacy Documents  
- Files in `03-legacy-specs/` are preserved for reference
- Represent paused or superseded approaches
- May be reactivated based on POC findings

### Reference Documents
- Files in `04-project-management/`, `05-integration-guides/`, `06-troubleshooting/`
- Provide ongoing operational support
- Updated as needed throughout project lifecycle

## 🔄 Document Maintenance

**When to Update:**
- Active POC documents: Update as POC progresses
- Strategic documents: Update after major decisions
- Legacy documents: Generally preserved as-is
- Integration guides: Update when tools/processes change

**Update Responsibility:**
- Claude AI: Technical documentation during development
- Project owner: Strategic decisions and architecture changes
- Community: Integration guides and troubleshooting tips

---

**Last Updated**: May 30, 2025  
**Documentation Version**: 2.0 (Post-reorganization)