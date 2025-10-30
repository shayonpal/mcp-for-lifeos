/**
 * Request Handler Infrastructure Module
 *
 * Factory pattern for MCP request handler with empty registry pattern.
 * Creates foundation for incremental handler extraction in MCP-96/97.
 *
 * @module server/request-handler
 * @see https://linear.app/agilecode-studio/issue/MCP-95/extract-request-handler-infrastructure
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
} from '../../dev/contracts/MCP-8-contracts.js';
import type { ClientInfo } from '../../dev/contracts/MCP-6-contracts.js';
import {
  MutableToolHandlerRegistry,
  RequestHandlerWithClientContext,
  UnknownToolError
} from '../../dev/contracts/MCP-96-contracts.js';
import type { ToolMode } from '../../dev/contracts/MCP-6-contracts.js';
import {
  getConsolidatedTools,
  getLegacyTools,
  getAlwaysAvailableTools,
  getLegacyAliases
} from './tool-registry.js';
import { registerConsolidatedHandlers } from './handlers/consolidated-handlers.js';
import { registerLegacyAliasHandlers } from './handlers/legacy-alias-handlers.js';

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Tool name sets for availability validation
 * Built once and cached to avoid per-request Set construction
 */
interface ToolNameSets {
  consolidated: Set<string>;
  legacy: Set<string>;
  alwaysAvailable: Set<string>;
  legacyAliases: Set<string>;
}

/**
 * Build tool name sets from registry for availability validation
 * Helper for isToolAllowed validation logic
 *
 * @returns Tool name sets organized by category
 */
function buildToolNameSets(): ToolNameSets {
  const consolidated = new Set(getConsolidatedTools().map(t => t.name));
  const legacy = new Set(getLegacyTools().map(t => t.name));
  const alwaysAvailable = new Set(getAlwaysAvailableTools().map(t => t.name));
  const legacyAliases = new Set(getLegacyAliases().map(t => t.name));

  return {
    consolidated,
    legacy,
    alwaysAvailable,
    legacyAliases
  };
}

// Cache tool name sets (built once at module load)
const cachedToolSets = buildToolNameSets();

/**
 * Check if tool is allowed in current tool mode
 *
 * Validates tool availability based on mode configuration.
 * Uses cached tool name sets (built once at module load).
 *
 * @param toolName - Name of tool to validate
 * @param mode - Current tool mode configuration
 * @returns Validation result with allowed flag and error message
 */
export const isToolAllowed: IsToolAllowedFunction = (
  toolName: string,
  mode: ToolMode
): ToolAvailabilityResult => {
  const toolSets = cachedToolSets;

  // Always-available tools are allowed in all modes
  if (toolSets.alwaysAvailable.has(toolName)) {
    return { allowed: true };
  }

  // Mode-specific validation
  switch (mode) {
    case 'legacy-only':
      // Only legacy tools allowed (no consolidated, no aliases)
      if (toolSets.legacy.has(toolName)) {
        return { allowed: true };
      }
      if (toolSets.consolidated.has(toolName)) {
        return {
          allowed: false,
          errorMessage: 'Consolidated tools are disabled. Use legacy search tools instead.'
        };
      }
      return {
        allowed: false,
        errorMessage: `Tool '${toolName}' is not available in mode '${mode}'`
      };

    case 'consolidated-only':
      // Only consolidated tools allowed (no legacy)
      if (toolSets.consolidated.has(toolName)) {
        return { allowed: true };
      }
      if (toolSets.legacy.has(toolName)) {
        return {
          allowed: false,
          errorMessage: `Legacy tool '${toolName}' is disabled. Use consolidated tools instead.`
        };
      }
      return {
        allowed: false,
        errorMessage: `Tool '${toolName}' is not available in mode '${mode}'`
      };

    case 'consolidated-with-aliases':
      // All tools allowed (consolidated + legacy + aliases)
      if (toolSets.consolidated.has(toolName) ||
          toolSets.legacy.has(toolName) ||
          toolSets.legacyAliases.has(toolName)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        errorMessage: `Tool '${toolName}' is not available in mode '${mode}'`
      };

    default:
      // Invalid mode
      return {
        allowed: false,
        errorMessage: `Invalid tool mode: '${mode}'`
      };
  }
};

// NOTE: validateMaxResults moved to MCP-38-contracts.ts (consolidated implementation)
// Import from there if needed for MCP-96/97 handler implementations

// ============================================================================
// ANALYTICS INTEGRATION
// ============================================================================

/**
 * Wrap handler with analytics logging
 *
 * Uses AnalyticsCollector.recordToolExecution() for consistent analytics tracking.
 * Avoids duplication with existing analytics pattern.
 *
 * @param toolName - Tool being invoked
 * @param handler - Handler function to wrap
 * @param context - Handler context with analytics instance
 * @returns Wrapped handler with analytics logging
 */
function wrapHandlerWithAnalytics(
  toolName: string,
  handler: ToolHandler,
  context: ToolHandlerContext
): ToolHandler {
  return async (args: Record<string, unknown>): Promise<CallToolResult> => {
    // Use AnalyticsCollector.recordToolExecution for consistent tracking
    return await context.analytics.recordToolExecution(
      toolName,
      async () => handler(args, context),
      {
        clientName: context.clientName,
        clientVersion: context.clientVersion,
        sessionId: context.sessionId
      }
    );
  };
}

// ============================================================================
// FACTORY IMPLEMENTATION
// ============================================================================

/**
 * Create request handler populated with consolidated tool handlers.
 *
 * Factory compiles handler registry once during creation (not per-request).
 * Returns async handler function that processes CallToolRequests.
 *
 * @param config - Request handler configuration
 * @returns Handler function ready for MCP server registration
 */
export const createRequestHandler: CreateRequestHandlerFunction = (
  config: RequestHandlerConfig
): RequestHandler => {
  // Build handler context
  const context: ToolHandlerContext = {
    toolMode: config.toolMode,
    registryConfig: config.registryConfig,
    analytics: config.analytics,
    sessionId: config.sessionId,
    router: config.router,
    clientName: config.clientName,
    clientVersion: config.clientVersion
  };

  const handlerRegistry = registerLegacyAliasHandlers(
    registerConsolidatedHandlers(
      new Map<string, ToolHandler>()
    )
  ) as MutableToolHandlerRegistry;

  const executeRequest: RequestHandler = async (request: CallToolRequest): Promise<CallToolResult> => {
    const { name: toolName, arguments: args } = request.params;

    // Validate arguments present
    if (!args) {
      throw new Error('Missing arguments');
    }

    // Validate tool availability in current mode
    const availability = isToolAllowed(toolName, config.toolMode);
    if (!availability.allowed) {
      throw new Error(availability.errorMessage || `Tool '${toolName}' is not available`);
    }

    // Lookup handler in registry
    const handler = handlerRegistry.get(toolName);
    if (!handler) {
      throw new UnknownToolError(toolName);
    }

    // Wrap handler with analytics (used by MCP-96 consolidated handlers)
    const wrappedHandler = wrapHandlerWithAnalytics(toolName, handler, context);

    // Execute handler with context
    return await wrappedHandler(args, context);
  };

  const requestHandler = executeRequest as RequestHandlerWithClientContext;

  requestHandler.updateClientContext = (info: ClientInfo): void => {
    if (!info) {
      return;
    }

    if (info.name) {
      context.clientName = info.name;
    }

    if (info.version) {
      context.clientVersion = info.version;
    }
  };

  return requestHandler;
};
