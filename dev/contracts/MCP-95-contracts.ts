/**
 * Implementation contracts for Linear Issue: MCP-95
 * Issue: Extract request handler infrastructure (factory + validation)
 *
 * This sub-issue creates the foundational infrastructure for request handler
 * extraction. All implementation MUST conform to these interfaces and the
 * parent MCP-8 contracts.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-95
 * @see ./MCP-8-contracts.ts - Parent contracts defining full system
 */

import type { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  RequestHandlerConfig,
  ToolHandlerContext,
  RequestHandler,
  ToolHandler,
  ToolHandlerRegistry,
  ToolAvailabilityResult,
  CreateRequestHandlerFunction,
  IsToolAllowedFunction
} from './MCP-8-contracts.js';
import type { ToolMode } from './MCP-6-contracts.js';

// ============================================================================
// MCP-95 SCOPE: INFRASTRUCTURE ONLY
// ============================================================================

/**
 * MCP-95 creates infrastructure skeleton with empty handler registry.
 * NO tool handlers are extracted in this phase.
 *
 * Subsequent sub-issues will populate the registry:
 * - MCP-96: Extract consolidated tool handlers
 * - MCP-97: Extract legacy tool handlers
 */

// ============================================================================
// FACTORY IMPLEMENTATION CONTRACTS
// ============================================================================

/**
 * Factory function implementation contract for MCP-95
 *
 * Creates request handler with EMPTY handler registry.
 * Registry will be populated in subsequent sub-issues.
 *
 * @param config - Request handler configuration
 * @returns Handler function ready for empty registry testing
 */
export type MCP95CreateRequestHandler = CreateRequestHandlerFunction;

/**
 * Empty handler registry for MCP-95 infrastructure phase
 *
 * This will be replaced with populated registry in MCP-96/97.
 * Current phase validates registry pattern with zero handlers.
 */
export type EmptyHandlerRegistry = ReadonlyMap<string, never>;

// ============================================================================
// VALIDATION UTILITY CONTRACTS
// ============================================================================

/**
 * Tool availability validator for MCP-95
 *
 * Checks if tool name is allowed in current tool mode.
 * Uses tool registry to determine available tool names.
 *
 * IMPLEMENTATION REQUIREMENTS:
 * - Must check against consolidated tools (3 tools)
 * - Must check against legacy tools (11 tools)
 * - Must check against always-available tools (9 tools)
 * - Must respect tool mode (legacy-only, consolidated-only, consolidated-with-aliases)
 * - Returns structured result (not boolean) for detailed error messages
 *
 * @param toolName - Name of tool to validate
 * @param mode - Current tool mode configuration
 * @returns Validation result with allowed flag and error message
 */
export type MCP95IsToolAllowed = IsToolAllowedFunction;

/**
 * Tool name set for availability checking
 * Derived from tool registry functions
 */
export interface ToolNameSets {
  /** Consolidated tool names (search, create_note, list) */
  consolidated: Set<string>;

  /** Legacy tool names (11 legacy tools) */
  legacy: Set<string>;

  /** Always-available tool names (9 core tools) */
  alwaysAvailable: Set<string>;

  /** Legacy alias names (11 aliased tools with deprecation) */
  legacyAliases: Set<string>;
}

/**
 * Build tool name sets from registry
 * Helper for isToolAllowed validation logic
 *
 * @returns Tool name sets for mode-based validation
 */
export type BuildToolNameSetsFunction = () => ToolNameSets;

// ============================================================================
// ANALYTICS INTEGRATION CONTRACTS
// ============================================================================

/**
 * Analytics wrapper for handler invocations
 *
 * Logs tool call analytics before handler execution.
 * Tracks execution time, success/failure, error types.
 *
 * INTEGRATION REQUIREMENTS:
 * - Must call analytics.logToolCall() before handler execution
 * - Must record execution time (Date.now() delta)
 * - Must track success boolean
 * - Must capture error type on failure
 * - Must pass through handler result unchanged
 *
 * @param toolName - Tool being invoked
 * @param handler - Handler function to wrap
 * @param context - Handler context with analytics instance
 * @returns Wrapped handler with analytics logging
 */
export type WrapHandlerWithAnalyticsFunction = (
  toolName: string,
  handler: ToolHandler,
  context: ToolHandlerContext
) => ToolHandler;

/**
 * Analytics event structure for tool calls
 * Conforms to existing AnalyticsCollector.recordUsage() signature
 */
export interface ToolCallAnalyticsEvent {
  /** Tool name that was invoked */
  toolName: string;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Whether tool execution succeeded */
  success: boolean;

  /** Error type if execution failed */
  errorType?: string;

  /** Client name (from MCP server context) */
  clientName: string;

  /** Client version (from MCP server context) */
  clientVersion: string;

  /** Session ID for correlation */
  sessionId: string;
}

// ============================================================================
// ERROR HANDLING CONTRACTS
// ============================================================================

/**
 * Error types specific to MCP-95 infrastructure phase
 *
 * These supplement the general errors in MCP-8-contracts.ts
 */

/**
 * Unknown tool error
 * Thrown when tool name not found in empty registry
 *
 * Expected during MCP-95 since registry is empty.
 * Will become rare once handlers are populated in MCP-96/97.
 */
export interface UnknownToolError {
  /** Error message including tool name */
  message: string;

  /** Unknown tool name that was requested */
  toolName: string;

  /** Suggestion for user (list available tools) */
  suggestion: string;
}

/**
 * Tool not allowed in mode error
 * Thrown when tool is valid but disabled in current mode
 *
 * Example: Consolidated tools disabled in legacy-only mode
 */
export interface ToolModeViolationError {
  /** Error message including tool and mode */
  message: string;

  /** Tool name that violated mode restriction */
  toolName: string;

  /** Current tool mode */
  mode: ToolMode;

  /** Suggested alternative tools (if available) */
  alternatives?: string[];
}

// ============================================================================
// INTEGRATION TEST CONTRACTS
// ============================================================================

/**
 * Test harness configuration for MCP-95
 *
 * Integration tests validate empty registry behavior.
 * Tests verify factory skeleton without actual handlers.
 */
export interface MCP95TestHarnessConfig {
  /** Mock request handler config */
  config: RequestHandlerConfig;

  /** Mock tool requests for testing */
  requests: CallToolRequest[];

  /** Expected error responses */
  expectedErrors: Array<{
    toolName: string;
    errorType: 'unknown_tool' | 'tool_not_allowed' | 'missing_arguments';
    errorMessage: string;
  }>;
}

/**
 * Integration test scenarios for MCP-95
 *
 * REQUIRED TEST COVERAGE:
 * 1. Unknown tool error (empty registry)
 * 2. Missing arguments error
 * 3. Tool mode validation (consolidated disabled in legacy-only)
 * 4. Analytics integration (logToolCall invoked)
 * 5. Version metadata injection (response includes metadata)
 * 6. Hybrid dispatch compatibility (factory coexists with switch)
 */
export interface MCP95TestScenarios {
  /** Test unknown tool handling */
  testUnknownTool: (handler: RequestHandler) => Promise<void>;

  /** Test missing arguments handling */
  testMissingArguments: (handler: RequestHandler) => Promise<void>;

  /** Test tool mode validation */
  testToolModeValidation: (handler: RequestHandler, mode: ToolMode) => Promise<void>;

  /** Test analytics logging */
  testAnalyticsIntegration: (handler: RequestHandler) => Promise<void>;

  /** Test version metadata injection */
  testVersionMetadata: (handler: RequestHandler) => Promise<void>;
}

// ============================================================================
// BEHAVIORAL CONTRACTS (MCP-95 SPECIFIC)
// ============================================================================

/**
 * MCP-95 specific behavioral requirements
 *
 * MUST:
 * - Create factory function that compiles EMPTY handler registry
 * - Implement isToolAllowed validation using tool registry functions
 * - Wrap handler calls with analytics logging
 * - Return "Unknown tool" error for all tool requests (empty registry)
 * - Maintain TypeScript compilation with npm run typecheck
 * - Pass all existing tests (382/386 baseline)
 *
 * MUST NOT:
 * - Extract any actual tool handlers (reserved for MCP-96/97)
 * - Modify existing switch statement in src/index.ts
 * - Break existing tool functionality
 * - Add new dependencies to package.json
 *
 * TESTING:
 * - Unit tests for isToolAllowed with all tool modes
 * - Integration tests for empty registry behavior
 * - Integration tests for analytics wrapper
 * - Verify no regressions in existing 382 passing tests
 */

// ============================================================================
// IMPLEMENTATION CHECKLIST
// ============================================================================

/**
 * MCP-95 Definition of Done checklist
 *
 * ✅ Factory function created and exported
 * ✅ isToolAllowed validation utility implemented
 * ✅ Analytics wrapper implemented
 * ✅ Empty handler registry pattern established
 * ✅ Integration tests verify empty registry behavior
 * ✅ Unit tests for validation utilities
 * ✅ TypeScript compilation clean (npm run typecheck)
 * ✅ All existing tests pass (382/386)
 * ✅ JSDoc documentation added
 * ✅ Ready for MCP-96 handler extraction
 */

// ============================================================================
// EXPORTS FOR MCP-96/97
// ============================================================================

/**
 * Types that will be reused by subsequent sub-issues
 *
 * MCP-96 and MCP-97 will import these contracts when populating
 * the handler registry with actual tool implementations.
 */
export type {
  RequestHandler,
  ToolHandler,
  ToolHandlerRegistry,
  ToolHandlerContext,
  ToolAvailabilityResult
} from './MCP-8-contracts.js';
