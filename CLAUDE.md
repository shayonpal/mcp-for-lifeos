# CLAUDE.md - LifeOS MCP Server

**Repository:** https://github.com/shayonpal/mcp-for-lifeos
**Linear Team ID:** d1aae15e-d5b9-418d-a951-adcf8c7e39a8

Model Context Protocol server for LifeOS Obsidian vault management with YAML compliance, PARA method organization, and template system.

**Current Focus**: Core MCP server functionality, technical debt reduction, and user experience.

## Current Focus

**See [docs/CURRENT-FOCUS.md](docs/CURRENT-FOCUS.md) for:**

- Active work and branch information
- Cycle plan vs execution status
- Immediate queue and upcoming priorities
- Recent completions and test status
- Update this after merging PRs to master

## Common Commands

### Development

```bash
npm install          # Install dependencies
npm run dev          # Run with auto-reload (tsx)
npm run build        # Compile TypeScript
npm run typecheck    # Type checking (this project uses typecheck, NOT eslint)
npm test             # Run all tests before committing

# Integration tests with memory management
node --expose-gc ./node_modules/.bin/jest tests/integration
```

### Testing

```bash
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests
npm test                  # All tests (run before commits)
```

### Analytics Dashboard

```bash
# View test coverage and quality metrics
node scripts/start-analytics-dashboard.js
```

### Markdown Linting

```bash
markdownlint-cli2 --fix <file>   # Fix markdown issues
markdownlint-cli2 <file>          # Check without fixing
```

## MCP Server Architecture

**Core Components:**

- **MCP Server:** `src/index.ts` (main entry point)
- **Tool Router:** `src/tool-router.ts` (unified tool consolidation)
- **Search Engine:** `src/search-engine.ts` (full-text search with relevance)
- **Vault Utils:** `src/vault-utils.ts` (file ops, YAML validation)
- **Template System:** `src/template-*.ts` (discovery, processing, Templater syntax)

**See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for:**

- Key design patterns (Unified Tool Architecture, YAML Compliance)
- Integration points (Claude Desktop, Raycast, Linear)
- Performance characteristics and scalability

**Deployment:** See [docs/guides/DEPLOYMENT-GUIDE.md](docs/guides/DEPLOYMENT-GUIDE.md)

## Platform Support

**Supported Platforms:**
- ✅ **macOS** (primary development and testing platform)
- ✅ **Linux** (Ubuntu 18.04+, other distros)
- ⚠️ **Windows**: WSL2 only (native Windows not supported)

See [ADR-007](docs/adr/007-unix-only-platform-support.md) for platform support rationale.

## Key File Locations

**Core:**

- `src/index.ts` - MCP server entry point
- `src/tool-router.ts` - Tool routing and consolidation
- `src/vault-utils.ts` - Vault operations and YAML validation
- `src/search-engine.ts` - Search functionality

**Tests:**

- `tests/unit/` - Unit tests
- `tests/integration/` - Integration tests (require `--expose-gc`)

**Documentation:**

- `docs/` - See CURRENT-FOCUS.md, ARCHITECTURE.md, guides/, tools/

**Project Management:**

- Linear Team: "MCP for LifeOS" (ID: `d1aae15e-d5b9-418d-a951-adcf8c7e39a8`)
- Use Linear MCP Server for issue operations
- Direct master branch workflow (no CI/CD automation)

## Important Behavioral Rules

**NEVER:**

- Create files unless absolutely necessary (prefer editing existing files)
- Commit without running `npm test` first
- Ignore type errors (run `npm run typecheck`)
- Copy-paste code without understanding context

**ALWAYS:**

- Check docs/CURRENT-FOCUS.md for current priorities
- Run tests before committing changes
- Update CURRENT-FOCUS.md after merging PRs
- Use Linear Team ID `d1aae15e-d5b9-418d-a951-adcf8c7e39a8` for issue operations
- Reference architecture docs rather than duplicating patterns

**Approach:**

- Be pragmatic and collaborative (treat user as peer, not boss)
- Push back on ideas when genuinely unconvinced
- Focus on core server functionality over UI/web interfaces
- Prefer logic, English, and pseudocode over raw code for explanations

**See Also**: `~/.claude/guidelines/git-strategy.md` (commit workflow, branching, PR process, release strategy)

## Agent Usage

Use specialized agents for complex tasks: `web-researcher` (external docs), `doc-search` (internal patterns), `linear-expert` (issues), `git-expert` (commits).

**Project-Specific Agents**: [docs/guides/AGENT-USAGE.md](docs/guides/AGENT-USAGE.md) - Full roster, use cases, Serena MCP integration

**General Patterns**: `~/.claude/guidelines/agent-patterns.md` - Parallel execution, scratchpad patterns, context management

## Output Style Preferences

- **Audience:** Product manager perspective (logic, English, pseudocode over code)
- **Responses:** Concise and actionable
- **Action Items:** Summarize as bullet points
- **Next Steps:** Always suggest what to do next
- **Parallel Work:** Use multiple agent instances when applicable

**See Also**: `~/.claude/guidelines/code-style.md` (documentation standards, naming conventions, testing practices)

## Tool Preferences

- Use `fd` instead of `find`
- Use `rg` instead of `grep`
- Use `eza` instead of `ls` (when listing directories)
- Use `bat` instead of `cat` (when viewing files)
- Reference `~/.claude/guidelines/stack-preferences.md` for technology choices
