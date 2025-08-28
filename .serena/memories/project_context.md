# Project Context and Current Status

## Repository Information
- **GitHub URL**: https://github.com/shayonpal/mcp-for-lifeos
- **GitHub Project**: https://github.com/users/shayonpal/projects/4
- **License**: GPL-3.0
- **Author**: Shayon Pal <https://agilecode.studio>

## Current Development Phase
**Status**: Evaluating LinuxServer.io Obsidian Web Access as alternative to OpenWebUI integration

### Strategic Pivot (Current)
- Testing LinuxServer.io's Obsidian web access solution
- Direct web access with native Copilot plugin
- Simpler alternative to OpenWebUI integration
- Documented in: `docs/02-strategic-docs/Obsidian-Web-Access-Alternative.md`

### OpenWebUI POC (DEPRIORITIZED)
- 21 issues created but on hold (#47-#51, #31-#46)
- Original plan: OpenWebUI → mcpo Proxy → LifeOS MCP
- Milestone: OpenWebUI Integration POC (paused)
- Full spec in: `docs/01-current-poc/POC-OpenWebUI-Integration-PRD.md`

## Key Project Instructions (from CLAUDE.local.md)
1. **Workflow**: Add issues to GitHub Project #4 in "Backlog" column
2. **Linting**: Use `npm run typecheck` for errors (not eslint)
3. **File Creation**: Never create files unless absolutely necessary
4. **Documentation**: Don't proactively create .md files unless requested
5. **Editing**: Always prefer editing existing files over creating new ones

## Recent Achievements (v1.8.0)
- Fixed critical analytics data loss bug
- Fixed ES Module compatibility issues
- Enhanced daily note template management
- Improved task creation with dates
- Better section targeting in insert_content

## Architecture Highlights
- **MCP Protocol**: Standard Model Context Protocol implementation
- **Tool System**: Extensive tool set for vault management
- **Template Engine**: Dynamic template discovery and processing
- **Search Engine**: Advanced full-text search with scoring
- **Analytics**: Built-in telemetry and dashboard
- **HTTP Server**: Optional Fastify server for web interface

## Integration Points
- **Obsidian**: Direct vault file system access
- **Claude Desktop**: MCP protocol integration
- **Raycast**: Script integration for macOS
- **Cursor IDE**: Direct MCP support

## Development Environment
- Darwin/macOS platform
- Node.js 18+ required
- TypeScript with ES modules
- Jest for testing
- Git version control