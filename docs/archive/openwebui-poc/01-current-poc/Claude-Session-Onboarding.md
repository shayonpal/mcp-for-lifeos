# Claude Session Onboarding Prompt

Copy and paste this prompt to quickly onboard Claude to the mcp-for-lifeos project:

---

## Project Context

You are working on **mcp-for-lifeos**, a Model Context Protocol (MCP) server that provides conversational AI access to Obsidian vault management through 18 specialized tools. This project is currently in **OpenWebUI Integration POC phase**.

### Current Project Status
- **Phase**: OpenWebUI Integration Proof of Concept (POC)
- **Goal**: Validate OpenWebUI + mcpo proxy + LifeOS MCP integration for mobile-first vault management
- **Priority Decision**: PWA development PAUSED pending OpenWebUI mobile experience validation
- **Timeline**: 1-2 week POC → data-driven decision on custom PWA necessity

### Key Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   OpenWebUI     │    │  mcpo Proxy      │    │  LifeOS MCP     │
│   Port 3000     │◄───┤  Port 8000       │◄───┤  stdio          │
│   Web Interface │    │  MCP→REST        │    │  18 Tools       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 18 LifeOS MCP Tools
**Core Management**: get_server_version, get_yaml_rules
**Note Operations**: create_note, create_note_from_template, edit_note, read_note
**Search & Discovery**: search_notes, advanced_search, quick_search, search_by_content_type, search_recent
**Daily Notes**: get_daily_note, list_daily_notes
**Vault Management**: list_folders, find_notes_by_pattern, move_items
**Maintenance**: diagnose_vault, list_templates

### Current POC Status (21 Issues)

#### Critical Path (Sequential - P0):
- **#47**: Install OpenWebUI via Docker → Status: Ready ✅
- **#48**: Install mcpo proxy → Status: Backlog (blocked by #47)
- **#49**: Configure OpenWebUI integration → Status: Backlog (blocked by #48)
- **#50**: Performance baseline setup → Status: Backlog (blocked by #49)

#### Tool Validation (Parallel - P1):
**Issues #31-37, #51**: Validate all 18 MCP tools through OpenWebUI
- Can execute in parallel after setup complete (#47-50)
- Component: MCP Server

#### Mobile Testing (Sequential - P1):
**Issues #38-40**: PWA installation → workflows → performance
- Dependencies: Setup + basic tool validation

#### Error & Stability (Parallel - P1):
**Issues #41-42**: Error scenarios + continuous operation
- Dependencies: Tool validation complete

#### Documentation (P2):
**Issues #43-44**: Setup docs + workflow patterns
- Can start early, parallel with testing

#### Analysis (Sequential - P0/P1):
**Issues #45-46**: POC results analysis → strategic doc updates
- Dependencies: ALL testing complete

### Project Infrastructure
- **GitHub Project**: [Project #4 - MCP Server for Obsidian](https://github.com/users/shayonpal/projects/4)
- **Milestone**: [OpenWebUI Integration POC](https://github.com/shayonpal/mcp-for-lifeos/milestone/2)
- **Repository**: [mcp-for-lifeos](https://github.com/shayonpal/mcp-for-lifeos)

### Key Documents
- `docs/01-current-poc/POC-OpenWebUI-Integration-PRD.md` - Complete POC specification
- `docs/01-current-poc/POC-Dependencies-Analysis.md` - Dependency analysis and execution order
- `docs/01-current-poc/POC-GitHub-Project-Fields.md` - GitHub project field assignments
- `docs/04-project-management/GitHub-Project-Setup-Assessment.md` - Project management setup
- `CLAUDE.md` - Project-specific instructions and requirements

### Important Commands to Remember
```bash
# GitHub CLI project management
gh project item-list 4 --owner "@me"
gh issue list --milestone "OpenWebUI Integration POC"

# MCP server operations  
npm run build
node dist/index.js

# OpenWebUI setup (when ready)
docker run -d -p 3000:8080 -v open-webui:/app/backend/data --name open-webui ghcr.io/open-webui/open-webui:main

# mcpo proxy setup (when ready)
uv tool install mcpo
uvx mcpo --port 8000 -- node /Users/shayon/DevProjects/mcp-for-lifeos/dist/index.js
```

### Current Priorities
1. **Issue #47** is Ready to execute (Install OpenWebUI Docker container)
2. **Follow strict sequential order** for setup issues #47→#48→#49→#50
3. **Maintain dependency awareness** when advancing project items
4. **Use GitHub project board** for status tracking and progress visibility

### Development Principles
- **No console.log/console.error** in MCP server (breaks stdio protocol)
- **Always run build** after code changes
- **Test with actual Obsidian vault** for validation
- **Document setup steps** for reproducibility
- **Mobile-first mindset** for OpenWebUI experience validation

### Success Criteria for POC
- All 18 MCP tools functional through OpenWebUI
- Mobile PWA experience viable for core workflows  
- Performance acceptable (tool execution <20s, interface load <10s)
- Integration stable over multi-hour operation
- Clear go/no-go recommendation for custom PWA development

---

## Immediate Action Context

When starting a session, please:

1. **Check current project status**: Use `gh project item-list 4 --owner "@me"` to see current item statuses
2. **Review Ready items**: Look for issues with "Ready" status that can be worked on
3. **Follow dependencies**: Never advance items to Ready unless dependencies are met
4. **Update todo list**: Use TodoWrite to track session work
5. **Maintain project board**: Update statuses as work progresses

The project is currently at the **POC execution phase** with Issue #47 ready to begin. All planning, prioritization, and dependency analysis is complete.

---

Copy everything above this line for session onboarding.