# Tools Directory Structure

This directory contains all tool handler implementations extracted from `src/index.ts` as part of the MCP-9 reorganization effort.

## Directory Structure

```
src/tools/
├── index.ts              # Central registry/barrel export for all tool handlers
├── shared.ts             # Shared helpers (addVersionMetadata, validateToolMode, etc.)
├── search.ts             # Consolidated search tool
├── create-note.ts        # Consolidated create_note tool
├── list.ts               # Consolidated list tool (folders, daily_notes, templates, yaml_properties)
├── legacy/               # Legacy tool handlers (for backward compatibility)
│   └── (to be added)
└── utils/                # Utility/management tools
    ├── diagnose-vault.ts # Vault diagnostic tool
    └── move-items.ts     # Note/folder moving tool
```

## Tool Categories

### Consolidated Tools (AI-Optimized)

These tools are the primary interface for AI assistants, providing unified and optimized functionality:

- **search** (`search.ts`): Universal search with intelligent routing
  - Handles basic search, advanced search, quick search, content type search, recent search, and pattern matching
  - Auto-mode routing based on query characteristics
  - Token budget management with ResponseTruncator
  - Natural language interpretation support

- **create_note** (`create-note.ts`): Smart note creation with template detection
  - Automatic template detection
  - Obsidian-compatible filename generation
  - Clickable link generation

- **list** (`list.ts`): Universal listing tool
  - Sub-types: folders, daily_notes, templates, yaml_properties
  - Format support: concise and detailed
  - Token budget management

### Utility Tools

Located in `utils/`:

- **diagnose_vault** (`diagnose-vault.ts`): Vault health diagnostics
  - YAML validation
  - Problematic file detection
  - Diagnostic reporting

- **move_items** (`move-items.ts`): Note and folder relocation
  - Batch move support
  - Folder merging
  - Error handling and reporting

### Legacy Tools (To Be Added)

These tools maintain backward compatibility with existing integrations:

- `search_notes`
- `advanced_search`
- `quick_search`
- `search_by_content_type`
- `search_recent`
- `find_notes_by_pattern`
- `create_note_from_template`
- `list_folders`
- `list_daily_notes`
- `list_templates`
- `list_yaml_properties`

### Additional Tools (To Be Extracted)

- `read_note`
- `edit_note`
- `get_daily_note`
- `insert_content`
- `get_server_version`
- `get_yaml_rules`
- `list_yaml_property_values`

## Tool Handler Pattern

All tool handlers follow a consistent pattern:

```typescript
export async function executeToolName(
  args: Record<string, any>,
  toolMode?: ToolMode  // For tools that require mode validation
): Promise<ToolResponse> {
  // 1. Validate tool mode (if needed)
  validateToolMode(toolMode, 'consolidated' | 'legacy');
  
  // 2. Extract and validate arguments
  const param1 = args.param1 as string;
  
  // 3. Call business logic (ToolRouter, VaultUtils, etc.)
  const result = await BusinessLogic.doWork(param1);
  
  // 4. Format response
  return {
    content: [{
      type: 'text',
      text: formattedResult
    }],
    truncation?: metadata  // For tools with token budget management
  };
}
```

## Integration with index.ts

The main `src/index.ts` file imports tool handlers from this registry and delegates execution:

```typescript
import { executeSearch, executeCreateNote, ... } from './tools/index.js';

// In the request handler switch statement:
case 'search': {
  const response = await executeSearch(args, toolModeConfig.mode);
  return addVersionMetadata(response);
}
```

## Benefits of This Structure

1. **Testability**: Each tool can be tested in isolation
2. **Maintainability**: Tools are organized by function, making them easier to find and update
3. **Reusability**: Tool handlers can be reused in different contexts (HTTP, stdio, tests)
4. **Clarity**: Clear separation between tool logic and request handling
5. **Type Safety**: Proper TypeScript types for arguments and responses

## Tool Mode Support

Tools support different modes based on the `TOOL_MODE` environment variable:

- `consolidated-only`: Only consolidated tools are available
- `legacy-only`: Only legacy tools are available  
- `consolidated-with-aliases`: Both consolidated and legacy tools are available

Tools validate their mode using `validateToolMode()` from `shared.ts`.

## Token Budget Management

Search and list tools use `ResponseTruncator` from `src/response-truncator.ts` to manage token budgets and prevent context overflow:

```typescript
const tokenBudget = new ResponseTruncator(DEFAULT_TOKEN_BUDGET);

// Check if result fits
if (!tokenBudget.canAddResult(formattedResult)) {
  truncated = true;
  break;
}

// Consume budget
tokenBudget.consumeBudget(formattedResult);

// Generate metadata
const truncationInfo = tokenBudget.getTruncationInfo(...);
```

## Adding New Tools

To add a new tool handler:

1. Create a new file in the appropriate directory (consolidated, legacy, or utils)
2. Follow the tool handler pattern above
3. Export the handler from `index.ts`
4. Import and use in `src/index.ts`
5. Add tests in `tests/unit/tools/` or `tests/integration/tools/`

## Testing

Tool handlers should have both unit and integration tests:

- **Unit tests**: Test the tool handler in isolation with mocked dependencies
- **Integration tests**: Test the tool handler with real dependencies in a test vault

Example test structure:
```
tests/
├── unit/
│   └── tools/
│       ├── search.test.ts
│       ├── create-note.test.ts
│       └── ...
└── integration/
    └── tools/
        ├── search-integration.test.ts
        └── ...
```

## Related Documentation

- [ADR 003: Search Tool Consolidation](../../docs/adr/003-search-tool-consolidation-fallback-strategy.md)
- [ADR 005: Default Tool Mode](../../docs/adr/005-default-tool-mode-consolidated-only.md)
- [MCP-6: Server Factory](../../dev/contracts/MCP-6-contracts.ts)
- [MCP-38: Token Budget Management](../../dev/contracts/MCP-38-contracts.ts)
