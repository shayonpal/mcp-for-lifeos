/**
 * Implementation contracts for Linear Issue: MCP-8
 * Issue: Extract request handler
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-8/extract-request-handler
 */

import type { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ToolMode } from './MCP-6-contracts.js';
import type { ToolRegistryConfig } from './MCP-7-contracts.js';
import type { AnalyticsCollector } from '../../src/modules/analytics/index.js';
import type { ToolRouter } from '../../src/tool-router.js';
import type { YamlRulesManager } from '../../src/modules/yaml/index.js';

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Configuration for request handler factory
 * Provides all dependencies needed for request processing
 */
export interface RequestHandlerConfig {
  /** Tool mode determining which tools are enabled */
  toolMode: ToolMode;

  /** Tool registry configuration for version metadata injection */
  registryConfig: ToolRegistryConfig;

  /** Analytics collector for telemetry tracking */
  analytics: AnalyticsCollector;

  /** Session ID for request correlation */
  sessionId: string;

  /** Tool router for business logic delegation */
  router: typeof ToolRouter;

  /** Client name for analytics (e.g., "Claude Desktop", "Raycast") */
  clientName: string;

  /** Client version for analytics */
  clientVersion: string;

  /** MCP Server instance for extractClientInfo and other server operations */
  server: Server;

  /** YAML rules manager for metadata handlers */
  yamlRulesManager: YamlRulesManager;
}

/**
 * Context passed to individual tool handlers
 * Provides access to shared services and configuration
 */
export interface ToolHandlerContext {
  /** Tool mode for validation (e.g., consolidated tools disabled in legacy-only) */
  toolMode: ToolMode;

  /** Registry config for version metadata injection */
  registryConfig: ToolRegistryConfig;

  /** Analytics for logging tool calls */
  analytics: AnalyticsCollector;

  /** Session ID for correlation */
  sessionId: string;

  /** Router for business logic */
  router: typeof ToolRouter;

  /** Client name for analytics (e.g., "Claude Desktop", "Raycast") */
  clientName: string;

  /** Client version for analytics */
  clientVersion: string;

  /** MCP Server instance for extractClientInfo and other server operations (required for get_daily_note analytics) */
  server: Server;

  /** YAML rules manager for metadata handlers (required for get_yaml_rules, list_yaml_property_values) */
  yamlRulesManager: YamlRulesManager;
}

/**
 * Validation utilities configuration
 * Cross-cutting concerns for request validation
 */
export interface ValidationConfig {
  /** Tool mode for tool availability checks */
  toolMode: ToolMode;
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Request handler function signature
 * Processes MCP CallToolRequest and returns CallToolResult
 */
export type RequestHandler = (request: CallToolRequest) => Promise<CallToolResult>;

/**
 * Tool handler function signature
 * Processes specific tool invocation with typed arguments
 */
export type ToolHandler = (
  args: Record<string, unknown>,
  context: ToolHandlerContext
) => Promise<CallToolResult>;

/**
 * Tool handler registry
 * Maps tool names to their handler functions
 */
export type ToolHandlerRegistry = ReadonlyMap<string, ToolHandler>;

// ============================================================================
// VALIDATION CONTRACTS
// ============================================================================

/**
 * Tool availability validation result
 * Indicates whether a tool is allowed in current mode
 */
export interface ToolAvailabilityResult {
  /** Whether tool is allowed in current mode */
  allowed: boolean;

  /** Error message if tool is not allowed */
  errorMessage?: string;
}

/**
 * Max results validation result
 * Validated and constrained maxResults parameter
 */
export interface MaxResultsValidation {
  /** Validated maxResults value (constrained to limits) */
  value: number;

  /** Whether value was adjusted from input */
  adjusted: boolean;

  /** Original input value (if provided) */
  originalValue?: number;
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error types that may be thrown during request handling:
 *
 * @throws Error - Generic errors with descriptive messages
 *   - "Missing arguments" - Request lacks required arguments parameter
 *   - "Unknown tool: {name}" - Tool name not found in handler registry
 *   - "Consolidated tools are disabled. Use legacy search tools instead." - Tool not allowed in legacy-only mode
 *   - "Tool '{name}' is not available in mode '{mode}'" - Generic tool mode violation
 *
 * Tool-specific errors are handled within individual handlers and returned as
 * CallToolResult with isError: true, not thrown exceptions.
 */

// ============================================================================
// FUNCTION CONTRACTS
// ============================================================================

/**
 * Factory function to create request handler
 * Compiles handler registry and returns handler function
 *
 * @param config - Request handler configuration
 * @returns Async function that processes CallToolRequests
 */
export type CreateRequestHandlerFunction = (
  config: RequestHandlerConfig
) => RequestHandler;

/**
 * Validation function for tool availability
 * Checks if tool is allowed in current tool mode
 *
 * @param toolName - Name of tool to check
 * @param mode - Current tool mode
 * @returns Validation result with allowed flag and error message
 */
export type IsToolAllowedFunction = (
  toolName: string,
  mode: ToolMode
) => ToolAvailabilityResult;

/**
 * Validation function for maxResults parameter
 * Constrains value to valid range (1-100) with tool-specific defaults
 *
 * @param value - Input maxResults value (may be undefined)
 * @param toolName - Tool name for specific constraints
 * @returns Validated maxResults with adjustment metadata
 */
export type ValidateMaxResultsFunction = (
  value: number | undefined,
  toolName: string
) => MaxResultsValidation;

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Integration points for request handler module:
 *
 * DEPENDS ON:
 * - ToolRouter: Business logic delegation (routeSearch, routeList, routeCreate)
 * - AnalyticsCollector: Telemetry tracking (logToolCall)
 * - ResponseTruncator: Token budget management (from MCP-38-contracts)
 * - ToolRegistry: Version metadata injection (addVersionMetadata from MCP-7)
 * - MCP SDK: Protocol types (CallToolRequest, CallToolResult)
 *
 * CONSUMED BY:
 * - src/index.ts: Stdio transport handler registration
 * - src/server/http-server.ts: HTTP transport handler invocation
 *
 * ENABLES:
 * - MCP-9: Tool file extraction (handler registry pattern prevents circular dependencies)
 */

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors for request handler implementation:
 *
 * MUST:
 * - Compile handler registry once during factory creation (no per-request compilation)
 * - Validate tool availability before dispatching (isToolAllowed check)
 * - Log analytics at handler entry (before business logic execution)
 * - Inject version metadata into all responses (via addVersionMetadata)
 * - Handle missing arguments with clear error message
 * - Handle unknown tool names with clear error message
 * - Return MCP-compliant CallToolResult structure
 * - Preserve exact error handling behavior from current implementation
 *
 * MUST NOT:
 * - Import from src/tools/* directly (circular dependency with MCP-9)
 * - Rebuild handler registry per request (performance regression)
 * - Throw exceptions for tool-specific errors (return isError: true instead)
 * - Block on slow operations without proper async handling
 * - Modify analytics or router state (read-only access)
 *
 * PERFORMANCE:
 * - Handler registry lookup: O(1) Map.get()
 * - Analytics overhead: <1ms per request
 * - No intermediate object allocations in hot path
 * - Early validation before expensive operations
 */

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Testing strategy for request handler:
 *
 * INTEGRATION TESTS:
 * - Drive factory with mock ToolRouter, real analytics, mock config
 * - Test success path: tool invocation, response structure, metadata injection
 * - Test error paths: missing args, unknown tool, disabled tool, tool-specific errors
 * - Test analytics: verify logToolCall called with correct parameters
 * - Test truncation: verify ResponseTruncator integration (if applicable)
 * - Test transport parity: stdio and HTTP produce identical responses
 *
 * SNAPSHOT TESTS:
 * - Capture current response format for regression detection
 * - Validate byte-for-byte parity with current implementation
 * - Include truncated output scenarios (often regress silently)
 *
 * VALIDATION:
 * - TypeScript compilation: npm run typecheck
 * - All tests passing: npm test
 * - No new linting errors: npm run lint (if applicable)
 */
