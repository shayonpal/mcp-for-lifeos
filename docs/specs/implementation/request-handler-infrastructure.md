# Request Handler Infrastructure (MCP-95)

**Created:** 2025-10-29 15:40 (UTC-04:00)  
**Status:** Completed – infrastructure only (registry population deferred to MCP-96/97)

MCP-95 extracts the foundational request handler infrastructure out of `src/index.ts`, establishing an explicit factory, validation layer, and analytics wrapper that future sub-issues will build upon when tool-specific handlers move into the registry.

---

## Scope

- Provide a dedicated module (`src/server/request-handler.ts`) exporting:
  - `createRequestHandler` factory that compiles shared context once and enforces an empty handler registry during this phase.
  - `isToolAllowed` validator with cached tool-name sets and mode-aware error messaging.
  - `wrapHandlerWithAnalytics` helper that delegates to `AnalyticsCollector.recordToolExecution`.
- Keep handler registry intentionally empty, with guardrails that remind engineers to populate it only once MCP-96 (consolidated handlers) and MCP-97 (legacy handlers) land.
- Update contracts (`dev/contracts/MCP-95-contracts.ts`) and tests to reflect the infrastructure expectations.

_Not in scope_: moving existing tool logic out of `src/index.ts`, modifying runtime behavior, or changing public MCP tool surfaces.

## Entry Points & Dependencies

| Element | Description |
| --- | --- |
| `createRequestHandler(config)` | Builds shared `ToolHandlerContext`, leaves registry empty, validates tool availability, and wraps dispatch with analytics once registry entries exist. |
| `isToolAllowed(toolName, mode)` | Replaces ad-hoc checks with cached consolidated/legacy/alias sets; returns structured `ToolAvailabilityResult` instead of throwing. |
| `wrapHandlerWithAnalytics(toolName, handler, context)` | Centralizes analytics logging for future handlers so each tool can remain thin. |
| `validateMaxResults(...)` | Now returns `{ value, adjusted, originalValue? }` (MCP-38 enhancement tagged by MCP-95). |

Required inputs:

- Tool registry helpers (`getConsolidatedTools`, `getLegacyTools`, etc.) to build cached name sets.
- Analytics collector for wrapper instrumentation.
- `ToolRegistryConfig` for version metadata (still applied in `src/index.ts` until handlers migrate).

## Behavioral Guarantees

1. **Mode validation precedes registry lookup.** Consolidated tools are blocked in `legacy-only` mode, legacy tools blocked in `consolidated-only`, while always-available utilities bypass mode errors.
2. **Empty registry guard.** Factory throws if registry accidentally gains entries before MCP-96/97, preventing premature wiring and ensuring follow-up issues add handlers deliberately.
3. **Structured validation results.** `validateMaxResults` callers must read `value`/`adjusted` metadata instead of catching thrown errors; tests updated accordingly.
4. **Analytics compatibility.** Handler wrapper matches existing analytics contract to preserve telemetry once handlers move.

## Testing Summary

- `tests/unit/server/request-handler.test.ts` exercises validation utilities, factory behavior, and empty-registry guardrails.
- `tests/integration/request-handler-empty-registry.test.ts` confirms infrastructure works end-to-end with mocked dependencies and remains empty by design.
- Existing token-limit tests updated to consume the new `validateMaxResults` return type.

All suites green locally (MCP-95 implementation was merged with passing tests) and no new lint issues were introduced.

## Follow-Up Work

1. **MCP-96:** Populate registry with consolidated tool handlers, remove empty-registry guard, and begin routing through new module.
2. **MCP-97:** Add legacy handler implementations and alias coverage.
3. **Index.ts cleanup:** Replace inline handler implementations with imports from the new module once MCP-96/97 complete.
4. **Docs:** Update tool handler guides once registry is populated; current documentation intentionally highlights infrastructure-only status.
