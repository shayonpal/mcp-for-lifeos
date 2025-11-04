/**
 * Implementation contracts for Linear Issue: MCP-98
 * Issue: Extract always-available tool handlers (9 independent tools)
 *
 * Defines handler function contracts and registration patterns for extracting
 * 9 always-available tool handlers from src/index.ts switch statement into
 * dedicated handler modules.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-98/extract-always-available-tool-handlers-9-independent-tools
 */

import type { ToolHandler, ToolHandlerContext } from './MCP-8-contracts.js';
import type { EditNoteInput, InsertContentInput, MoveItemsInput } from '../../src/types.js';

// ============================================================================
// HANDLER ORGANIZATION CONTRACTS
// ============================================================================

/**
 * Handler modules organize 9 tools into logical groups.
 *
 * Three modules provide clear separation of concerns:
 * - note-handlers: CRUD operations on notes (read, edit, insert)
 * - metadata-handlers: YAML and metadata operations
 * - utility-handlers: Server utilities and diagnostics
 */

/**
 * Tool names managed by note-handlers module
 */
export type NoteHandlerToolName = 'read_note' | 'edit_note' | 'insert_content' | 'rename_note';

export const NOTE_HANDLER_TOOL_NAMES: readonly NoteHandlerToolName[] = [
  'read_note',
  'edit_note',
  'insert_content',
  'rename_note'
] as const;

/**
 * Tool names managed by metadata-handlers module
 */
export type MetadataHandlerToolName = 'get_yaml_rules' | 'list_yaml_property_values';

export const METADATA_HANDLER_TOOL_NAMES: readonly MetadataHandlerToolName[] = [
  'get_yaml_rules',
  'list_yaml_property_values'
] as const;

/**
 * Tool names managed by utility-handlers module
 */
export type UtilityHandlerToolName =
  | 'get_server_version'
  | 'get_daily_note'
  | 'diagnose_vault'
  | 'move_items';

export const UTILITY_HANDLER_TOOL_NAMES: readonly UtilityHandlerToolName[] = [
  'get_server_version',
  'get_daily_note',
  'diagnose_vault',
  'move_items'
] as const;

/**
 * All MCP-98 handler tool names combined for routing
 */
export const ALWAYS_AVAILABLE_TOOL_NAMES: readonly string[] = [
  ...NOTE_HANDLER_TOOL_NAMES,
  ...METADATA_HANDLER_TOOL_NAMES,
  ...UTILITY_HANDLER_TOOL_NAMES
] as const;

/**
 * Union type of all always-available tool names
 */
export type AlwaysAvailableToolName =
  | NoteHandlerToolName
  | MetadataHandlerToolName
  | UtilityHandlerToolName;

// ============================================================================
// HANDLER FUNCTION CONTRACTS
// ============================================================================

/**
 * Handler function signature for note operations.
 *
 * Note handlers MUST:
 * - Use normalizePath() utility for path resolution
 * - Call VaultUtils methods for file operations
 * - Return formatted response with ObsidianLinks
 * - Include version metadata via addVersionMetadata()
 *
 * Note handlers MUST NOT:
 * - Access vault files directly (use VaultUtils)
 * - Skip path normalization (security risk)
 * - Omit version metadata
 */
export type NoteOperationHandler = ToolHandler;

/**
 * Handler function signature for metadata operations.
 *
 * Metadata handlers MUST:
 * - Use yamlRulesManager for YAML rules access
 * - Use VaultUtils for property scanning
 * - Include scan statistics in responses
 * - Format responses with markdown structure
 * - Include version metadata via addVersionMetadata()
 *
 * Metadata handlers MUST NOT:
 * - Parse YAML directly (use VaultUtils)
 * - Skip scan statistics
 * - Return raw property values without formatting
 */
export type MetadataOperationHandler = ToolHandler;

/**
 * Handler function signature for utility operations.
 *
 * Utility handlers MUST:
 * - Track analytics for get_daily_note (recordUsage pattern)
 * - Use DynamicTemplateEngine.getAllTemplates() for template count
 * - Use DateResolver for date parsing in get_daily_note
 * - Use VaultUtils for vault operations
 * - Include version metadata via addVersionMetadata()
 *
 * Utility handlers MUST NOT:
 * - Skip analytics tracking in get_daily_note
 * - Access templates directly (use DynamicTemplateEngine)
 * - Parse dates manually (use DateResolver)
 */
export type UtilityOperationHandler = ToolHandler;

// ============================================================================
// REGISTRATION CONTRACTS
// ============================================================================

/**
 * Mutable registry for handler registration.
 * Same pattern as MCP-96/97 for consistency.
 */
export type MutableToolHandlerRegistry = Map<string, ToolHandler>;

/**
 * Registration function signature for always-available handlers.
 *
 * Pattern follows MCP-96 (consolidated) and MCP-97 (legacy aliases):
 * - Accepts mutable registry Map
 * - Registers all handlers for the module
 * - Returns same registry for chaining
 * - Lazy initialization on first call
 *
 * @param registry - Mutable tool handler registry
 * @returns Same registry for chaining
 */
export type RegisterHandlersFn = <T extends MutableToolHandlerRegistry>(registry: T) => T;

// ============================================================================
// HANDLER INPUT TYPE CONTRACTS
// ============================================================================

/**
 * Input types already defined in src/types.ts.
 * Import and reuse existing interfaces:
 *
 * - EditNoteInput (src/types.ts:65-80)
 * - InsertContentInput (src/types.ts:114-132)
 * - MoveItemsInput (src/types.ts:156-174)
 *
 * Other handlers use simple arguments from request.params.arguments.
 */

/**
 * Type-safe argument extraction for get_server_version
 */
export interface GetServerVersionInput {
  includeTools?: boolean;
}

/**
 * Type-safe argument extraction for get_daily_note
 */
export interface GetDailyNoteInput {
  date?: string; // Date in YYYY-MM-DD format, relative date, or natural language
  createIfMissing?: boolean; // Default: true
  confirmCreation?: boolean; // Default: false
}

/**
 * Type-safe argument extraction for diagnose_vault
 */
export interface DiagnoseVaultInput {
  checkYaml?: boolean; // Default: true
  maxFiles?: number; // Default: 100
}

/**
 * Type-safe argument extraction for list_yaml_property_values
 */
export interface ListYamlPropertyValuesInput {
  property: string; // Required
  includeCount?: boolean; // Default: false
  includeExamples?: boolean; // Default: false
  sortBy?: 'alphabetical' | 'usage' | 'type'; // Default: 'alphabetical'
  maxExamples?: number; // Default: 3
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Integration requirements for always-available handlers.
 *
 * Handlers MUST integrate with:
 * - VaultUtils: File operations, YAML parsing, note CRUD
 * - ObsidianLinks: Link generation, title extraction
 * - AnalyticsCollector: Usage tracking (get_daily_note)
 * - DynamicTemplateEngine: Template discovery (get_server_version)
 * - yamlRulesManager: YAML rules access (get_yaml_rules)
 * - DateResolver: Date parsing (get_daily_note)
 * - Tool registry: Version metadata injection (all handlers)
 *
 * Handlers MUST NOT:
 * - Route through ToolRouter (independent implementations)
 * - Share state between handlers (stateless functions)
 * - Access vault files directly (use VaultUtils)
 */

/**
 * Dependencies for note operation handlers
 */
export interface NoteHandlerDependencies {
  VaultUtils: typeof import('../../src/modules/files/index.js').VaultUtils;
  ObsidianLinks: typeof import('../../src/obsidian-links.js').ObsidianLinks;
  normalizePath: typeof import('../../src/path-utils.js').normalizePath;
  addVersionMetadata: (response: any, config: any) => any;
  format: typeof import('date-fns').format;
}

/**
 * Dependencies for metadata operation handlers
 */
export interface MetadataHandlerDependencies {
  VaultUtils: typeof import('../../src/modules/files/index.js').VaultUtils;
  YamlRulesManager: typeof import('../../src/modules/yaml/index.js').YamlRulesManager;
  addVersionMetadata: (response: any, config: any) => any;
}

/**
 * Dependencies for utility operation handlers
 */
export interface UtilityHandlerDependencies {
  VaultUtils: typeof import('../../src/modules/files/index.js').VaultUtils;
  ObsidianLinks: typeof import('../../src/obsidian-links.js').ObsidianLinks;
  DynamicTemplateEngine: typeof import('../../src/modules/templates/index.js').DynamicTemplateEngine;
  DateResolver: typeof import('../../src/date-resolver.js').DateResolver;
  AnalyticsCollector: typeof import('../../src/analytics/analytics-collector.js').AnalyticsCollector;
  addVersionMetadata: (response: any, config: any) => any;
  extractClientInfo: (server: any) => { name: string; version: string };
  format: typeof import('date-fns').format;
  statSync: typeof import('fs').statSync;
}

// ============================================================================
// ANALYTICS CONTRACT (get_daily_note)
// ============================================================================

/**
 * Analytics tracking contract for get_daily_note handler.
 *
 * The get_daily_note handler MUST preserve exact analytics pattern:
 *
 * ```typescript
 * const startTime = Date.now();
 * try {
 *   // ... handler logic ...
 *
 *   // Record success
 *   const clientInfo = extractClientInfo(server);
 *   analytics.recordUsage({
 *     toolName: 'get_daily_note',
 *     executionTime: Date.now() - startTime,
 *     success: true,
 *     clientName: clientInfo.name,
 *     clientVersion: clientInfo.version,
 *     sessionId
 *   });
 *
 *   return response;
 * } catch (error) {
 *   // Record failure
 *   const clientInfo = extractClientInfo(server);
 *   analytics.recordUsage({
 *     toolName: 'get_daily_note',
 *     executionTime: Date.now() - startTime,
 *     success: false,
 *     errorType: error instanceof Error ? error.constructor.name : 'Unknown',
 *     clientName: clientInfo.name,
 *     clientVersion: clientInfo.version,
 *     sessionId
 *   });
 *   throw error;
 * }
 * ```
 *
 * Analytics preservation is CRITICAL. Integration tests MUST validate.
 */
export interface GetDailyNoteAnalyticsContract {
  /** Record usage on success with execution time */
  recordSuccess: true;
  /** Record usage on failure with error type */
  recordFailure: true;
  /** Track execution time from start to completion */
  trackExecutionTime: true;
  /** Include client info from server context */
  includeClientInfo: true;
}

// ============================================================================
// ERROR HANDLING CONTRACTS
// ============================================================================

/**
 * Error handling requirements for all handlers.
 *
 * Handlers MUST:
 * - Throw descriptive errors with context
 * - Preserve error messages from existing implementation
 * - Let VaultUtils errors propagate unchanged
 * - Use Error class (not custom error types)
 *
 * Handlers MUST NOT:
 * - Swallow errors silently
 * - Transform error types unnecessarily
 * - Return error responses (throw instead)
 *
 * Error types that may be thrown:
 * @throws Error - Generic error for validation failures
 * @throws Error - VaultUtils errors (file not found, YAML parse errors)
 * @throws Error - Template errors (template not found, processing failures)
 * @throws Error - Date parsing errors (invalid date format)
 */

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Implementation requirements for all handlers:
 *
 * MUST:
 * - Follow ToolHandler signature: async (args, context) => CallToolResult
 * - Extract typed arguments from args parameter
 * - Use context for analytics, registry config, session ID
 * - Return responses with addVersionMetadata() wrapper
 * - Maintain exact response format from switch statement
 * - Preserve path normalization patterns
 * - Include ObsidianLinks in responses
 * - Track analytics for get_daily_note (success + failure)
 *
 * MUST NOT:
 * - Route through ToolRouter (independent implementations)
 * - Share state between handlers (stateless functions)
 * - Access server instance directly (use context)
 * - Skip version metadata injection
 * - Modify response format from existing implementation
 * - Create circular dependencies between handler modules
 *
 * TESTING:
 * - Unit tests: Handler function behavior and error handling
 * - Integration tests: MCP protocol compliance and analytics tracking
 * - Manual tests: Claude Desktop validation for all 9 handlers
 */
