/**
 * Implementation contracts for Linear Issue: MCP-60
 * Issue: Add configuration flag to hide legacy LifeOS MCP tools
 *
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Tool visibility mode controlling which MCP tools are registered
 *
 * - legacy-only: Register only legacy tools (backward compatibility mode)
 * - consolidated-only: Register only consolidated tools (hides all legacy aliases)
 * - consolidated-with-aliases: Register both consolidated and legacy tools (default)
 */
export type ToolMode = 'legacy-only' | 'consolidated-only' | 'consolidated-with-aliases';

// ============================================================================
// CONFIGURATION CONTRACTS
// ============================================================================

/**
 * Tool mode configuration with validation
 *
 * Environment Variables:
 * - TOOL_MODE: Primary configuration (default: 'consolidated-only')
 * - CONSOLIDATED_TOOLS_ENABLED: Deprecated fallback (removed Cycle 10)
 *
 * Backward Compatibility:
 * - If TOOL_MODE unset and CONSOLIDATED_TOOLS_ENABLED='false' → 'legacy-only'
 * - If TOOL_MODE unset and CONSOLIDATED_TOOLS_ENABLED='true' → 'consolidated-only'
 * - If both unset → 'consolidated-only' (default)
 */
export interface ToolModeConfig {
  /** Resolved tool mode after parsing and fallback logic */
  mode: ToolMode;

  /** Whether old CONSOLIDATED_TOOLS_ENABLED flag was used (triggers deprecation warning) */
  usedLegacyFlag: boolean;

  /** Original TOOL_MODE value from environment (undefined if not set) */
  rawToolMode?: string;

  /** Original CONSOLIDATED_TOOLS_ENABLED value from environment (undefined if not set) */
  rawConsolidatedFlag?: string;
}

// ============================================================================
// PARSING CONTRACTS
// ============================================================================

/**
 * Parse TOOL_MODE environment variable with validation and fallback
 *
 * Validation Rules:
 * 1. If TOOL_MODE set and valid → use it
 * 2. If TOOL_MODE set but invalid → log error, fallback to default
 * 3. If TOOL_MODE unset → check CONSOLIDATED_TOOLS_ENABLED for backward compatibility
 * 4. If both unset → use default 'consolidated-only'
 *
 * @returns ToolModeConfig with resolved mode and metadata
 */
export interface ParseToolModeContract {
  (env: NodeJS.ProcessEnv): ToolModeConfig;
}

// ============================================================================
// VALIDATION CONTRACTS
// ============================================================================

/**
 * Valid tool mode values for runtime validation
 */
export const VALID_TOOL_MODES: readonly ToolMode[] = [
  'legacy-only',
  'consolidated-only',
  'consolidated-with-aliases'
] as const;

/**
 * Check if string is valid ToolMode
 */
export interface IsValidToolModeContract {
  (value: string | undefined): value is ToolMode;
}

// ============================================================================
// TOOL REGISTRATION CONTRACTS
// ============================================================================

/**
 * Tool registration logic based on mode
 *
 * Registration Rules:
 * - legacy-only: Register legacy tools only (consolidated tools hidden)
 * - consolidated-only: Register consolidated tools only (legacy aliases hidden)
 * - consolidated-with-aliases: Register both sets (current default behavior)
 *
 * Tool Categories:
 * - Consolidated: search, create_note, list (3 tools)
 * - Legacy: search_notes, advanced_search, quick_search, search_by_content_type,
 *           search_recent, find_notes_by_pattern, create_note_from_template,
 *           list_folders, list_daily_notes, list_templates, list_yaml_properties (11 tools)
 * - Always Available: get_server_version, get_yaml_rules, read_note, edit_note,
 *                     get_daily_note, diagnose_vault, move_items, insert_content,
 *                     list_yaml_property_values (9 tools)
 */
export interface ToolRegistrationContract {
  /** Whether to register consolidated tools (search, create_note, list) */
  shouldRegisterConsolidated(mode: ToolMode): boolean;

  /** Whether to register legacy tool aliases */
  shouldRegisterLegacy(mode: ToolMode): boolean;
}

// ============================================================================
// LOGGING CONTRACTS
// ============================================================================

/**
 * Startup logging contract
 *
 * Required Logs:
 * 1. Tool mode active: "Tool Mode: {mode}"
 * 2. Tool count: "Registered Tools: {count}"
 * 3. Deprecation warning (if CONSOLIDATED_TOOLS_ENABLED used):
 *    "[DEPRECATED] CONSOLIDATED_TOOLS_ENABLED will be removed in Cycle 10. Use TOOL_MODE instead."
 */
export interface StartupLoggingContract {
  logToolMode(config: ToolModeConfig): void;
  logDeprecationWarning(config: ToolModeConfig): void;
}

// ============================================================================
// METADATA ENHANCEMENT CONTRACTS
// ============================================================================

/**
 * Response metadata enhancement
 *
 * All MCP tool responses MUST include metadata with:
 * - version: Server version (e.g., '1.8.0')
 * - serverName: 'lifeos-mcp'
 * - toolMode: Active tool mode ('consolidated-only' | 'legacy-only' | 'consolidated-with-aliases')
 *
 * Purpose: Allows clients to verify active tool mode and server version in every response
 */
export interface ResponseMetadataContract {
  version: string;
  serverName: string;
  toolMode: ToolMode;
}

// ============================================================================
// RUNTIME VALIDATION CONTRACTS
// ============================================================================

/**
 * Runtime tool count validation
 *
 * Expected Tool Counts:
 * - consolidated-only: 12 tools (3 consolidated + 9 always-available)
 * - legacy-only: 20 tools (11 legacy + 9 always-available)
 * - consolidated-with-aliases: 34 tools (3 consolidated + 11 legacy + 11 aliases + 9 always-available)
 *
 * Validation Behavior:
 * - Runs at server startup after tool registration
 * - Non-blocking (server starts even if validation fails)
 * - Logs warning to stderr if count mismatch detected
 * - Warning format: "[WARNING] Tool count mismatch: expected {expected} for mode '{mode}', got {actual}"
 */
export interface RuntimeValidationContract {
  expectedToolCounts: {
    'consolidated-only': 12;
    'legacy-only': 20;
    'consolidated-with-aliases': 34;
  };
  validateToolCount(mode: ToolMode, actualCount: number): boolean;
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error handling for invalid configuration
 *
 * Errors That May Occur:
 * - InvalidToolModeError: TOOL_MODE set to invalid value
 *
 * Error Handling Strategy:
 * - Invalid TOOL_MODE → Log error to stderr, fallback to 'consolidated-only'
 * - No exceptions thrown (graceful degradation)
 * - Error message format: "Invalid TOOL_MODE: {value}. Valid options: {validModes}. Defaulting to 'consolidated-only'"
 */
export interface InvalidToolModeError {
  /** Invalid value that was provided */
  invalidValue: string;

  /** Valid mode options */
  validModes: readonly ToolMode[];

  /** Fallback mode used */
  fallbackMode: ToolMode;
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors:
 *
 * MUST:
 * - Parse TOOL_MODE at server startup (before tool registration)
 * - Validate TOOL_MODE value against VALID_TOOL_MODES
 * - Fallback to CONSOLIDATED_TOOLS_ENABLED for backward compatibility
 * - Log deprecation warning when old flag used
 * - Register tools based on resolved mode
 * - Log active tool mode and count at startup
 *
 * MUST NOT:
 * - Throw exceptions for invalid configuration (graceful degradation required)
 * - Change tool registration after server startup (MCP protocol constraint)
 * - Allow tool list to change without server restart
 * - Skip deprecation warning when CONSOLIDATED_TOOLS_ENABLED used
 *
 * Performance:
 * - Configuration parsing: <1ms (synchronous, single pass)
 * - No runtime overhead (mode resolved once at startup)
 * - Tool registration unchanged in complexity (same spread operator pattern)
 */

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Integration points with existing code
 *
 * Modified Components:
 * - src/index.ts:69 - Add parseToolMode() and validation logic
 * - src/index.ts:207 - Update spread operator condition for legacy tools
 * - src/index.ts:74 - Update spread operator condition for consolidated tools
 *
 * Configuration Files:
 * - .env - Add TOOL_MODE configuration
 * - .env.example - Document TOOL_MODE options and deprecation
 *
 * Documentation Files:
 * - README.md - Remove ENABLE_WEB_INTERFACE=false, document TOOL_MODE
 * - docs/guides/CONFIGURATION.md - Add TOOL_MODE section, mark old flag deprecated
 * - CHANGELOG.md - Add deprecation notice and removal timeline
 * - 8 additional guide files - Remove ENABLE_WEB_INTERFACE=false examples
 *
 * No Changes Required:
 * - Tool handler logic (unchanged - handlers remain registered)
 * - MCP protocol integration (stdio transport)
 * - VaultUtils, SearchEngine, TemplateSystem (orthogonal concerns)
 * - Analytics tracking (tool usage tracked regardless of registration)
 */

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Manual verification test scenarios
 *
 * Test 1: Default mode (no configuration)
 * - Setup: Unset TOOL_MODE, unset CONSOLIDATED_TOOLS_ENABLED
 * - Expected: mode='consolidated-only', 12 tools registered
 * - Verification: tools/list shows only consolidated + always-available tools
 *
 * Test 2: Consolidated-only mode (hides legacy)
 * - Setup: TOOL_MODE='consolidated-only'
 * - Expected: mode='consolidated-only', 12 tools registered
 * - Verification: tools/list shows no [LEGACY ALIAS] tools
 *
 * Test 3: Legacy-only mode
 * - Setup: TOOL_MODE='legacy-only'
 * - Expected: mode='legacy-only', 20 tools registered
 * - Verification: Consolidated tools hidden, legacy tools visible
 *
 * Test 4: Consolidated-with-aliases mode
 * - Setup: TOOL_MODE='consolidated-with-aliases'
 * - Expected: mode='consolidated-with-aliases', 34 tools registered
 * - Verification: All consolidated, legacy, and legacy alias tools visible
 *
 * Test 5: Backward compatibility fallback
 * - Setup: Unset TOOL_MODE, CONSOLIDATED_TOOLS_ENABLED='false'
 * - Expected: mode='legacy-only', deprecation warning logged
 * - Verification: Fallback works, warning appears in startup logs
 *
 * Test 6: Invalid TOOL_MODE value
 * - Setup: TOOL_MODE='invalid-value'
 * - Expected: mode='consolidated-only' (fallback), error logged
 * - Verification: Error message includes valid options, server starts normally
 *
 * Acceptance Criteria Validation:
 * - All 11 legacy tool scenarios work with consolidated tools when mode='consolidated-only'
 * - Server startup logs show active mode and tool count
 * - Deprecation warning appears when CONSOLIDATED_TOOLS_ENABLED used
 * - Invalid values handled gracefully without exceptions
 */

// ============================================================================
// IMPLEMENTATION NOTES
// ============================================================================

/**
 * Implementation checklist:
 *
 * Phase 1: Type definitions and parsing (src/index.ts)
 * [✓] Add ToolMode type definition
 * [✓] Add VALID_TOOL_MODES constant
 * [✓] Implement parseToolMode() function
 * [✓] Implement isValidToolMode() validator
 * [✓] Set default mode to 'consolidated-only'
 *
 * Phase 2: Tool registration logic (src/index.ts)
 * [✓] Update consolidated tools spread operator
 * [✓] Update legacy tools spread operator
 * [✓] Move always-available tools out of legacy conditional
 * [✓] Add missing create_note_from_template to legacy section
 * [✓] Rename create_note_smart → create_note
 * [✓] Remove redundant basic create_note from always-available
 *
 * Phase 3: Logging and validation (src/index.ts)
 * [✓] Add tool mode startup log
 * [✓] Add tool count startup log
 * [✓] Add conditional deprecation warning
 * [✓] Add runtime tool count validation
 *
 * Phase 4: Metadata enhancement (src/index.ts)
 * [✓] Add toolMode field to response metadata
 * [✓] Include in all MCP tool responses
 *
 * Phase 5: Configuration files
 * [✓] Update .env with TOOL_MODE (default: consolidated-only)
 * [✓] Update .env.example with documentation
 * [✓] Mark CONSOLIDATED_TOOLS_ENABLED as deprecated
 *
 * Phase 6: Documentation
 * [✓] Create ADR-005 for default mode decision
 * [ ] Update README.md (add TOOL_MODE)
 * [ ] Update CONFIGURATION.md (add TOOL_MODE section)
 * [ ] Update CHANGELOG.md (deprecation notice)
 * [ ] Update 8 guide files (deferred per user request)
 *
 * Phase 7: Build and validation
 * [✓] Run npm run build (TypeScript compilation)
 * [✓] Run npm run typecheck (type validation)
 * [✓] Manual testing: All 6 test scenarios
 * [✓] Tool count validation: 12/20/34 for all modes
 *
 * Phase 8: Linear integration
 * [✓] Add implementation summary comment to MCP-60
 * [✓] Update ADR-005 with final tool counts
 * [✓] Mark implementation phase complete
 */

// ============================================================================
// IMPLEMENTATION CHANGES FROM ORIGINAL CONTRACTS
// ============================================================================

/**
 * Deviations from original contracts (all approved during implementation):
 *
 * 1. DEFAULT MODE CHANGED:
 *    - Original: 'consolidated-with-aliases'
 *    - Final: 'consolidated-only'
 *    - Rationale: Avoid requiring environment variable configuration for most users
 *
 * 2. TOOL RENAMING:
 *    - Original: 'create_note_smart' as consolidated tool
 *    - Final: Renamed to 'create_note'
 *    - Rationale: Smart creation with template detection makes basic version redundant
 *    - Impact: Simplified API, reduced tool count by 1
 *
 * 3. TOOL COUNTS ADJUSTED:
 *    - consolidated-only: 13 → 12 tools (removed basic create_note)
 *    - legacy-only: 21 → 20 tools (removed basic create_note)
 *    - consolidated-with-aliases: 35 → 34 tools (removed basic create_note)
 *
 * 4. ALWAYS-AVAILABLE TOOLS:
 *    - Original: 10 tools (included basic create_note)
 *    - Final: 9 tools (removed basic create_note)
 *    - Tools: get_server_version, get_yaml_rules, read_note, edit_note,
 *             get_daily_note, diagnose_vault, move_items, insert_content,
 *             list_yaml_property_values
 *
 * 5. TOOL ORGANIZATION FIXES:
 *    - Fixed: 4 always-available tools were incorrectly in legacy conditional
 *    - Moved out: get_daily_note, diagnose_vault, move_items, insert_content
 *    - Added to legacy: create_note_from_template implementation (was missing)
 *
 * 6. ADDITIONAL ENHANCEMENTS:
 *    - Added: toolMode field in response metadata
 *    - Added: Runtime tool count validation with expected counts
 *    - Purpose: Better observability and bug detection
 *
 * All changes validated with:
 * - TypeScript compilation: ✓
 * - Tool count validation: ✓ (12/20/34 for all modes)
 * - Manual testing: ✓ (all 6 test scenarios)
 * - Linear tracking: ✓ (MCP-60)
 */
