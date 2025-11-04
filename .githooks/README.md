# Git Hooks

This directory contains Git hooks for the project.

## Setup

After cloning the repository, run:

```bash
git config core.hooksPath .githooks
```

This tells Git to use hooks from this directory instead of `.git/hooks/`.

## Available Hooks

### pre-commit

Prevents Linear issue references (MCP-XXX format) from being committed to:

- `docs/ARCHITECTURE.md`
- `docs/guides/*.md`

**Rationale:** External users cloning this repo won't have access to the Linear project. Documentation should be self-contained.

**Bypass:** Use `git commit --no-verify` if you need to bypass this check (use sparingly).
