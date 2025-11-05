/**
 * Implementation contracts for Linear Issue: MCP-7
 * Issue: Extract tool registry
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-7/extract-tool-registry
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolMode, ToolModeConfig } from './MCP-6-contracts.js';

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Configuration for tool registry operations
 * Provides context for tool assembly and metadata injection
 */
export interface ToolRegistryConfig {
  /** Tool mode determining which tools to include */
  mode: ToolMode;

  /** Server name for metadata injection */
  serverName: string;

  /** Server version for metadata injection */
  serverVersion: string;
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Tool array structure
 * Array of MCP Tool definitions conforming to SDK specification
 */
export type ToolArray = Tool[];

/**
 * Response with version metadata
 * Generic response structure with injected version information
 * Uses _meta (MCP protocol field) instead of metadata for LLM visibility
 */
export interface VersionedResponse {
  /** Original response content (preserves existing structure) */
  [key: string]: any;

  /** Injected _meta (MCP protocol metadata field visible to LLM) */
  _meta?: {
    /** Server version */
    version: string;
    /** Server name */
    serverName: string;
    /** Tool mode configuration */
    toolMode: ToolMode;
    /** Any additional _meta from original response */
    [key: string]: any;
  };
}

// ============================================================================
// TOOL CATEGORY CONTRACTS
// ============================================================================

/**
 * Consolidated tool definitions (3 tools)
 * Universal AI-optimized tools with auto-mode detection
 * - search: Universal search with mode routing
 * - create_note: Smart note creation with template detection
 * - list: Universal listing with type detection
 */
export type ConsolidatedTools = readonly Tool[];

/**
 * Legacy tools (11 tools)
 * Original search and note creation tools
 * Available in legacy-only and consolidated-with-aliases modes
 */
export type LegacyTools = readonly Tool[];

/**
 * Legacy tool aliases (11 tools)
 * Backward compatibility aliases pointing to consolidated tools
 * All include deprecation notices in descriptions
 */
export type LegacyAliases = readonly Tool[];

/**
 * Always-available tools (9 tools)
 * Core tools available in all modes
 * - get_server_version
 * - get_yaml_rules
 * - edit_note
 * - read_note
 * - get_daily_note
 * - diagnose_vault
 * - move_items
 * - insert_content
 * - list_yaml_property_values
 */
export type AlwaysAvailableTools = readonly Tool[];

// ============================================================================
// FUNCTION CONTRACTS
// ============================================================================

/**
 * Get consolidated tools
 * Returns 3 universal AI-optimized tools
 *
 * @returns Array of consolidated tool definitions
 */
export type GetConsolidatedToolsFunction = () => ConsolidatedTools;

/**
 * Get legacy tools
 * Returns 11 original search and note creation tools
 *
 * @returns Array of legacy tool definitions
 */
export type GetLegacyToolsFunction = () => LegacyTools;

/**
 * Get legacy tool aliases
 * Returns 11 backward compatibility aliases
 *
 * @returns Array of legacy alias tool definitions
 */
export type GetLegacyAliasesFunction = () => LegacyAliases;

/**
 * Get always-available tools
 * Returns 9 core tools present in all modes
 *
 * @returns Array of always-available tool definitions
 */
export type GetAlwaysAvailableToolsFunction = () => AlwaysAvailableTools;

/**
 * Assemble tools for specific mode
 * Composes tool array based on mode configuration
 *
 * Mode mappings:
 * - legacy-only: 20 tools (9 always + 11 legacy)
 * - consolidated-only: 12 tools (9 always + 3 consolidated)
 * - consolidated-with-aliases: 34 tools (9 always + 3 consolidated + 11 legacy + 11 aliases)
 *
 * @param config - Tool registry configuration
 * @returns Composed tool array for mode
 * @throws Error if tool count doesn't match expected value for mode
 */
export type GetToolsForModeFunction = (config: ToolRegistryConfig) => ToolArray;

/**
 * Add version metadata to response
 * Pure function that injects server version, name, and tool mode
 * Does not mutate original response
 *
 * @param response - Original response object
 * @param config - Tool registry configuration
 * @returns New response object with metadata
 */
export type AddVersionMetadataFunction = (
  response: any,
  config: ToolRegistryConfig
) => VersionedResponse;

/**
 * Validate tool count for mode
 * Internal validation helper ensuring correct tool assembly
 *
 * Expected counts:
 * - legacy-only: 20 tools
 * - consolidated-only: 12 tools
 * - consolidated-with-aliases: 34 tools
 *
 * @param tools - Tool array to validate
 * @param mode - Expected tool mode
 * @throws Error if count doesn't match expected value
 */
export type ValidateToolCountFunction = (tools: ToolArray, mode: ToolMode) => void;

// ============================================================================
// TOOL REGISTRY MODULE CONTRACT
// ============================================================================

/**
 * Tool registry module exports
 * All functions exported by src/server/tool-registry.ts
 */
export interface ToolRegistryModule {
  /** Get consolidated tools (3 tools) */
  getConsolidatedTools: GetConsolidatedToolsFunction;

  /** Get legacy tools (11 tools) */
  getLegacyTools: GetLegacyToolsFunction;

  /** Get legacy aliases (11 tools) */
  getLegacyAliases: GetLegacyAliasesFunction;

  /** Get always-available tools (9 tools) */
  getAlwaysAvailableTools: GetAlwaysAvailableToolsFunction;

  /** Assemble tools for mode with validation */
  getToolsForMode: GetToolsForModeFunction;

  /** Add version metadata to response */
  addVersionMetadata: AddVersionMetadataFunction;
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error types that may be thrown:
 *
 * @throws Error - Invalid tool mode (if config.mode is corrupted)
 * @throws Error - Tool count mismatch (if assembly fails validation)
 * @throws Error - Invalid response structure (if metadata cannot be injected)
 *
 * All errors should include descriptive messages with:
 * - What failed (tool assembly, validation, metadata injection)
 * - Expected vs actual values (for validation errors)
 * - Suggested remediation (check config, verify tool definitions)
 */

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Integration points and dependencies
 */
export interface ToolRegistryIntegration {
  /** Imports from MCP SDK */
  imports: {
    /** Tool type from SDK types */
    mcpSdk: '@modelcontextprotocol/sdk/types.js';
    /** ToolMode, ToolModeConfig from factory contracts */
    factoryContracts: '../../dev/contracts/MCP-6-contracts.js';
  };

  /** Consumed by */
  consumedBy: {
    /** src/index.ts - Main entry point for tool registration */
    indexTs: 'src/index.ts';
    /** Future: src/server/request-handler.ts (MCP-8) */
    requestHandler: 'src/server/request-handler.ts (future MCP-8)';
    /** tests/unit/server/tool-registry.test.ts */
    tests: 'tests/unit/server/tool-registry.test.ts';
  };

  /** Does NOT import from */
  prohibitedImports: {
    /** No vault operations */
    vaultUtils: 'src/vault-utils.ts';
    /** No tool routing logic */
    toolRouter: 'src/tool-router.ts';
    /** No search engine */
    searchEngine: 'src/search-engine.ts';
    /** No template system */
    templates: 'src/template-*.ts';
    /** Only SDK types, no domain logic */
    reason: 'Registry is foundational layer - tool definitions only, no implementations';
  };
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors and constraints:
 *
 * MUST:
 * - Return exact tool counts per mode (12/20/34)
 * - Use pure functions (no module-level state)
 * - Accept ToolRegistryConfig as explicit parameter
 * - Preserve exact tool definitions from index.ts
 * - Maintain tool order and structure
 * - Include deprecation notices in legacy alias descriptions
 * - Validate tool counts before returning
 * - Return new objects from addVersionMetadata (no mutation)
 *
 * MUST NOT:
 * - Import from domain logic modules (vault-utils, tool-router, etc.)
 * - Modify tool definitions at runtime
 * - Cache or memoize (lazy evaluation sufficient)
 * - Throw exceptions for valid modes
 * - Mutate input parameters or responses
 * - Create global state or singletons
 * - Register tools or handlers (pure catalog)
 *
 * SHOULD:
 * - Organize tool definitions logically (consolidated, legacy, always)
 * - Use readonly arrays for tool categories
 * - Add JSDoc comments for all exported functions
 * - Include tool count validation
 * - Log errors with context (mode, expected count, actual count)
 * - Follow existing tool definition patterns from index.ts
 *
 * TESTING:
 * - Unit test each getter function independently
 * - Validate tool counts for all 3 modes
 * - Test metadata injection without mutation
 * - Verify tool schema compliance (name, description, inputSchema)
 * - Test error handling for invalid inputs
 * - Integration test with MCP server registration
 */

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/**
 * Migration from src/index.ts to src/server/tool-registry.ts
 *
 * Extract (lines 75-870 from index.ts):
 * ✓ Constant `tools: Tool[]` array definition
 * ✓ Consolidated tools section (3 tools)
 * ✓ Legacy aliases section (11 tools)
 * ✓ Always-available tools section (9 tools)
 * ✓ Tool mode conditional logic
 * ✓ addVersionMetadata helper function
 *
 * Update index.ts:
 * ✓ Import { getToolsForMode, addVersionMetadata, type ToolRegistryConfig } from './server/tool-registry.js'
 * ✓ Construct ToolRegistryConfig from parsed toolModeConfig
 * ✓ Replace inline tools definition with getToolsForMode(registryConfig)
 * ✓ Update addVersionMetadata call sites with registryConfig parameter
 * ✓ Remove 796 lines of tool definitions
 *
 * Validation:
 * ✓ npm run typecheck - No type errors
 * ✓ npm run build - Clean build
 * ✓ npm test - All tests pass
 * ✓ Tool count verification for each mode
 * ✓ Manual verification with Claude Desktop
 */

// ============================================================================
// VALIDATION STRATEGY
// ============================================================================

/**
 * Compile-time validation:
 * - TypeScript type checking via `npm run typecheck`
 * - All exported functions must conform to function type signatures
 * - ToolRegistryConfig must be imported from MCP-6 contracts
 * - Tool type must be imported from MCP SDK
 *
 * Implementation validation:
 * - Import these contracts in implementation file
 * - Declare functions with explicit type annotations
 * - Use ToolRegistryModule interface for export validation
 * - Runtime tool count validation in getToolsForMode
 *
 * Test validation:
 * - Unit tests: getToolsForMode returns correct counts (12/20/34)
 * - Unit tests: Tool schema compliance (name, description, inputSchema)
 * - Unit tests: Metadata injection preserves original structure
 * - Integration tests: Registry matches MCP server registration
 * - Contract tests: Expected tool counts validated
 *
 * Code review validation:
 * - Verify no domain logic imports (only SDK types)
 * - Ensure pure functions (no state, no mutation)
 * - Validate tool definitions match index.ts exactly
 * - Confirm deprecation notices on legacy aliases
 * - Check error messages include context
 */
