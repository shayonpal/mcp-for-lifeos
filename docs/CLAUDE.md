# CLAUDE.md - Documentation

See root CLAUDE.md for overall project context.

## This Directory

Comprehensive documentation for the LifeOS MCP Server including architecture decisions, tool specifications, integration guides, and implementation specs.

## Key Directories

- **adr/**: Architecture Decision Records tracking major technical decisions
- **tools/**: Individual tool documentation (one file per MCP tool)
- **guides/**: Integration and deployment guides for various platforms
- **specs/**: Feature specifications, RFCs, and use cases
- **api/**: API documentation (TOOLS.md for tool reference)

## Key Files

- `ARCHITECTURE.md` - System architecture and design patterns
- `CURRENT-FOCUS.md` - Current priorities and cycle status (update after merging PRs)
- `README.md` - Documentation index and navigation

## Documentation Commands

```bash
# Lint markdown files before committing
markdownlint-cli2 --fix docs/**/*.md

# Lint specific file
markdownlint-cli2 --fix docs/path/to/file.md

# Check all docs without fixing
markdownlint-cli2 "docs/**/*.md"
```

## Documentation Workflow

**Adding ADRs:**

1. Create numbered file in `adr/` (e.g., `008-description.md`)
2. Use existing ADRs as template
3. Update `adr/README.md` index

**Updating Tool Docs:**

- Each tool has dedicated file in `tools/`
- Include examples and parameter descriptions
- Keep aligned with implementation

**Updating Guides:**

- Integration guides in `guides/`
- Focus on practical setup steps
- Include troubleshooting sections

**After PR Merges:**

- Run `/current-focus` command to sync Linear cycle info with CURRENT-FOCUS.md
- Command automatically updates cycle progress, completed items, and current status
