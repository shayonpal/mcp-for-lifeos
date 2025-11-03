# Repository Guidelines

## Project Structure & Module Organization

TypeScript sources live in `src/`, grouped by capability (`search-engine.ts`,  
`tool-router.ts`, analytics, YAML managers). Contract definitions that agents  
rely on sit in `dev/contracts`, and automation utilities live under `scripts/`.  
Guides and reference docs are in `docs/`, static assets in `public/`, and build  
artefacts in `dist/` (do not edit generated code). Example configuration stays  
in `config-examples/`. Tests are held in `tests/` split into `unit`,  
`integration`, `contracts`, and reusable `fixtures`.

## Build, Test, and Development Commands

- `npm run dev` – start the MCP server with `tsx` hot reload.
- `npm run build` – compile TypeScript into ESM output in `dist/`.
- `npm run start` – run the compiled server for production parity.
- `npm run lint` / `npm run typecheck` – run ESLint and `tsc --noEmit`.
- `npm run test` (or `test:unit`, `test:integration`) – launch Jest suites;
  append `--watch` while iterating.

## Coding Style & Naming Conventions

Use 2-space indentation, ES module imports, and prefer named exports. Adopt  
`PascalCase` for classes, `camelCase` for functions and variables, and  
`SCREAMING_SNAKE_CASE` for environment-derived constants. Create new files with  
`kebab-case.ts` names, keeping side effects in entry points like `src/index.ts`.  
Run `npm run lint` before PRs and rely on inline `eslint-disable` comments only  
when documented in the review.

## Testing Guidelines

Place unit specs in `tests/unit` with shared mocks in `tests/fixtures`; broader  
flows belong in `tests/integration`, and protocol checks in `tests/contracts`.  
Name files `*.spec.ts` so Jest auto-discovers them and keep executions  
deterministic by relying on fixtures instead of real vault mutations. Run  
`npm run test -- --coverage` before releases, especially after adding tools or  
routes.

## Commit & Pull Request Guidelines

Follow Conventional Commits (`type(scope): summary`) and reference issues or PRs  
when relevant (e.g., `fix(core): stabilize analytics session ids (#123)`).  
Before opening a PR, confirm lint, typecheck, and targeted Jest suites pass,  
link the tracking issue, describe config or documentation impacts, and attach  
screenshots or logs when behaviour shifts.

## Configuration & Security Notes

Copy `src/config.example.ts` to `src/config.ts`, update vault paths, and keep  
vault-specific data out of version control. Store secrets in `.env` (see  
`.env.example`) and verify `.gitignore` catches them. For debugging, export  
`CONSOLIDATED_TOOLS_ENABLED=false` before `npm run dev` to disable consolidated  
tooling.

## Issue Lookup Protocol

When a request references a Linear issue identifier such as `MCP-XXX`, always
query the Linear MCP tools for the full context before responding. Fetch:
- core issue details (title, description, status, priority)
- comments or timeline notes
- parent and sub-issue relationships
- associated project metadata (if present)

Use these tool responses as the authoritative source when summarizing or
reasoning about the issue.
