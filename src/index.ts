#!/usr/bin/env node

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { VaultUtils } from './vault-utils.js';
import { SearchEngine, AdvancedSearchOptions } from './search-engine.js';
import { ObsidianLinks } from './obsidian-links.js';
import { NaturalLanguageProcessor } from './natural-language-processor.js';
import { DynamicTemplateEngine } from './template-engine-dynamic.js';
import { YamlRulesManager } from './yaml-rules-manager.js';
import { ToolRouter, UniversalSearchOptions, SmartCreateNoteOptions, UniversalListOptions } from './tool-router.js';
import { EditNoteInput, InsertContentInput, MoveItemsInput, EditNoteFrontmatter, InsertContentTarget, MoveItemType } from './types.js';
import { LIFEOS_CONFIG } from './config.js';
import { normalizePath } from './path-utils.js';
import { format } from 'date-fns';
import { MCPHttpServer } from './server/http-server.js';
import { logger } from './logger.js';
import { statSync } from 'fs';
import { createMcpServer, SERVER_VERSION, parseToolMode, extractClientInfo } from './server/mcp-server.js';
import type { ToolMode, McpServerInstance } from '../dev/contracts/MCP-6-contracts.js';
import { createRequestHandler } from './server/request-handler.js';
import { getToolsForMode, addVersionMetadata as addToolVersionMetadata } from './server/tool-registry.js';
import type { ToolRegistryConfig } from '../dev/contracts/MCP-7-contracts.js';
import type { ToolHandlerContext, ToolHandler } from '../dev/contracts/MCP-8-contracts.js';
import type { RequestHandlerWithClientContext } from '../dev/contracts/MCP-96-contracts.js';
import { CONSOLIDATED_TOOL_NAMES, isUnknownToolError } from '../dev/contracts/MCP-96-contracts.js';
import { getConsolidatedHandler } from './server/handlers/consolidated-handlers.js';
import { getLegacyAliasHandler, LEGACY_ALIAS_TOOL_NAMES } from './server/handlers/legacy-alias-handlers.js';
import { ALWAYS_AVAILABLE_TOOL_NAMES } from '../dev/contracts/MCP-98-contracts.js';

// ============================================================================
// MCP SERVER INITIALIZATION - LAZY PATTERN
// ============================================================================

// Parse tool mode early (lightweight, no server instantiation)
const toolModeConfig = parseToolMode(process.env);

// Log deprecation warning if legacy flag was used
if (toolModeConfig.usedLegacyFlag) {
  console.error(
    '[DEPRECATED] CONSOLIDATED_TOOLS_ENABLED will be removed in Cycle 10. Use TOOL_MODE instead.'
  );
}

// Lazy server instantiation - created on first access
let mcpInstance: McpServerInstance | null = null;
let handlersRegistered = false;

/**
 * Lazy initialization of MCP server instance
 * Creates server on first access and registers handlers once
 */
function initializeMcpInstance(): McpServerInstance {
  if (!mcpInstance) {
    mcpInstance = createMcpServer({
      vaultPath: LIFEOS_CONFIG.vaultPath,
      toolMode: toolModeConfig.mode // Use pre-parsed tool mode
    });

    // Register handlers once after server creation
    if (!handlersRegistered) {
      registerHandlers(mcpInstance);
      handlersRegistered = true;
    }
  }
  return mcpInstance;
}

/**
 * Get MCP server instance (convenience accessor)
 */
function getMcpInstance(): McpServerInstance {
  return initializeMcpInstance();
}

// Initialize YAML rules manager
const yamlRulesManager = new YamlRulesManager(LIFEOS_CONFIG);

// Define available tools using tool registry
// Construct registry configuration
const registryConfig: ToolRegistryConfig = {
  mode: toolModeConfig.mode,
  serverName: 'lifeos-mcp',
  serverVersion: SERVER_VERSION
};

// Get tools for current mode from registry
const tools: Tool[] = getToolsForMode(registryConfig);

// Module-level tool name sets for efficient lookup (built once at module load)
const consolidatedToolNames = new Set<string>(CONSOLIDATED_TOOL_NAMES);
const legacyAliasToolNames = new Set<string>(LEGACY_ALIAS_TOOL_NAMES);
const alwaysAvailableToolNames = new Set<string>(ALWAYS_AVAILABLE_TOOL_NAMES);

// Tools that have manual analytics tracking in their handlers (exempt from fallback analytics wrapping)
const ANALYTICS_EXEMPT_TOOLS = new Set<string>(['get_daily_note']);

/**
 * Execute tool with hybrid dispatch fallback pattern
 * Provides resilience during handler extraction transition
 *
 * @param toolName - Name of the tool to execute
 * @param request - MCP tool request
 * @param primaryHandler - Primary request handler (registry-based)
 * @param getFallbackHandler - Function to retrieve individual fallback handler
 * @param context - Shared handler execution context
 * @returns Tool execution result
 */
async function executeWithHybridFallback(
  toolName: string,
  request: any,
  primaryHandler: RequestHandlerWithClientContext,
  getFallbackHandler: (name: string) => ToolHandler | undefined,
  context: {
    toolMode: ToolMode;
    registryConfig: ToolRegistryConfig;
    analytics: any;
    sessionId: string;
    router: typeof ToolRouter;
    server: any;
    yamlRulesManager: YamlRulesManager;
    clientInfo: { name?: string; version?: string };
  }
): Promise<any> {
  try {
    return await primaryHandler(request);
  } catch (error) {
    if (!isUnknownToolError(error)) {
      throw error;
    }

    logger.warn(`hybrid-dispatch fallback engaged for "${toolName}": ${error instanceof Error ? error.message : String(error)}`);

    const fallbackHandler = getFallbackHandler(toolName);
    if (!fallbackHandler) {
      throw error;
    }

    const fallbackContext: ToolHandlerContext = {
      toolMode: context.toolMode,
      registryConfig: context.registryConfig,
      analytics: context.analytics,
      sessionId: context.sessionId,
      router: context.router,
      clientName: context.clientInfo.name ?? 'unknown-client',
      clientVersion: context.clientInfo.version ?? '0.0.0',
      server: context.server,
      yamlRulesManager: context.yamlRulesManager
    };

    // Exception: Some tools have manual analytics tracking in their handlers
    // Avoid double-counting by checking exemption list
    const shouldWrapAnalytics = !ANALYTICS_EXEMPT_TOOLS.has(toolName);

    if (shouldWrapAnalytics) {
      return await context.analytics.recordToolExecution(
        toolName,
        async () => fallbackHandler(request.params.arguments as Record<string, unknown>, fallbackContext),
        {
          clientName: fallbackContext.clientName,
          clientVersion: fallbackContext.clientVersion,
          sessionId: context.sessionId
        }
      );
    } else {
      // Tool has manual analytics - call handler directly
      return await fallbackHandler(request.params.arguments as Record<string, unknown>, fallbackContext);
    }
  }
}

/**
 * Register MCP tool handlers
 * Called once during server initialization
 */
function registerHandlers(instance: McpServerInstance): void {
  const { server, analytics, sessionId } = instance;

  const initialClientInfo = extractClientInfo(server);
  const consolidatedRequestHandler = createRequestHandler({
    toolMode: toolModeConfig.mode,
    registryConfig,
    analytics,
    sessionId,
    router: ToolRouter,
    clientName: initialClientInfo.name ?? 'unknown-client',
    clientVersion: initialClientInfo.version ?? '0.0.0',
    server,
    yamlRulesManager
  }) as RequestHandlerWithClientContext;

  // Tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error('Missing arguments');
    }

    const addVersionMetadata = (response: any) => addToolVersionMetadata(response, registryConfig);

    const clientInfo = extractClientInfo(server);
    consolidatedRequestHandler.updateClientContext(clientInfo);

    // Shared context for fallback execution
    const fallbackContext = {
      toolMode: toolModeConfig.mode,
      registryConfig,
      analytics,
      sessionId,
      router: ToolRouter,
      server,
      yamlRulesManager,
      clientInfo
    };

    // Hybrid dispatch for consolidated tools
    if (consolidatedToolNames.has(name)) {
      return await executeWithHybridFallback(
        name,
        request,
        consolidatedRequestHandler,
        getConsolidatedHandler,
        fallbackContext
      );
    }

    // Hybrid dispatch for legacy alias tools
    if (legacyAliasToolNames.has(name)) {
      return await executeWithHybridFallback(
        name,
        request,
        consolidatedRequestHandler,
        getLegacyAliasHandler,
        fallbackContext
      );
    }

    // MCP-98: Route always-available tools through request handler
    if (alwaysAvailableToolNames.has(name)) {
      return await consolidatedRequestHandler(request);
    }

    try {
      // All tools now handled by consolidated request handler through registry
      throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return addVersionMetadata({
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    });
  }
  });
}

// Start the server
async function main() {
  // Initialize server and register handlers
  const instance = getMcpInstance();
  const { server } = instance;

  // Connect server to stdio transport (handled by factory)
  await instance.connect();

  // Log tool mode configuration
  console.error(`Tool Mode: ${toolModeConfig.mode}`);
  console.error(`Registered Tools: ${tools.length}`);

  // Validate tool count matches expected count for mode
  const EXPECTED_TOOL_COUNTS = {
    'consolidated-only': 13,
    'legacy-only': 21,
    'consolidated-with-aliases': 35
  } as const;

  const expectedCount = EXPECTED_TOOL_COUNTS[toolModeConfig.mode];
  if (tools.length !== expectedCount) {
    console.error(
      `[WARNING] Tool count mismatch: expected ${expectedCount} for mode '${toolModeConfig.mode}', got ${tools.length}`
    );
  }

  // Start HTTP server if web interface is explicitly enabled
  const enableWebInterface = process.env.ENABLE_WEB_INTERFACE === 'true';
  if (enableWebInterface) {
    try {
      const httpServer = new MCPHttpServer({
        host: process.env.WEB_HOST || '0.0.0.0',
        port: parseInt(process.env.WEB_PORT || '19831'),
      }, server); // Pass the MCP server instance
      await httpServer.start();
    } catch (error) {
      // Silently continue without web interface
    }
  }
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  try {
    // Only shutdown if server was initialized (don't create on exit)
    if (mcpInstance) {
      await mcpInstance.shutdown();
    }
  } catch (error) {
    // Silently continue
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    // Only shutdown if server was initialized (don't create on exit)
    if (mcpInstance) {
      await mcpInstance.shutdown();
    }
  } catch (error) {
    // Silently continue
  }
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {
    // Exit silently on error to avoid interfering with MCP protocol
    process.exit(1);
  });
}
