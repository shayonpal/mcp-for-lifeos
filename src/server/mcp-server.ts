/**
 * MCP Server Factory Module
 *
 * Extracted from index.ts to provide reusable server creation logic for both stdio and HTTP transports.
 * This module encapsulates server instantiation, transport setup, analytics wiring, and tool-mode configuration.
 *
 * Linear Issue: MCP-6
 * @see dev/contracts/MCP-6-contracts.ts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AnalyticsCollector } from '../modules/analytics/index.js';
import { ToolRouter } from '../tool-router.js';
import { v4 as uuidv4 } from 'uuid';
import { accessSync, constants } from 'fs';
import type {
  McpServerConfig,
  McpServerInstance,
  ToolMode,
  ToolModeConfig,
  ClientInfo,
  CreateMcpServerFunction,
  ParseToolModeFunction,
  IsValidToolModeFunction,
  GenerateSessionIdFunction
} from '../../dev/contracts/MCP-6-contracts.js';
import packageJson from '../../package.json' with { type: 'json' };

// Server version - sourced from package.json (single source of truth)
export const SERVER_VERSION = packageJson.version;

/**
 * Valid tool mode values for runtime validation
 */
const VALID_TOOL_MODES: readonly ToolMode[] = [
  'legacy-only',
  'consolidated-only',
  'consolidated-with-aliases'
] as const;

/**
 * Check if string is valid ToolMode
 */
export const isValidToolMode: IsValidToolModeFunction = (value): value is ToolMode => {
  return VALID_TOOL_MODES.includes(value as ToolMode);
};

/**
 * Parse TOOL_MODE environment variable with validation and fallback
 *
 * Validation Rules:
 * 1. If TOOL_MODE set and valid → use it
 * 2. If TOOL_MODE set but invalid → log error, fallback to default
 * 3. If TOOL_MODE unset → check CONSOLIDATED_TOOLS_ENABLED for backward compatibility
 * 4. If both unset → use default 'consolidated-only'
 */
export const parseToolMode: ParseToolModeFunction = (env) => {
  const rawToolMode = env.TOOL_MODE;
  const rawConsolidatedFlag = env.CONSOLIDATED_TOOLS_ENABLED;

  // Check if TOOL_MODE is set and valid
  if (rawToolMode !== undefined) {
    if (isValidToolMode(rawToolMode)) {
      return {
        mode: rawToolMode,
        usedLegacyFlag: false,
        rawToolMode
      };
    } else {
      // Invalid TOOL_MODE - log error and fallback
      console.error(
        `Invalid TOOL_MODE: ${rawToolMode}. Valid options: ${VALID_TOOL_MODES.join(', ')}. Defaulting to 'consolidated-only'`
      );
      return {
        mode: 'consolidated-only',
        usedLegacyFlag: false,
        rawToolMode
      };
    }
  }

  // TOOL_MODE not set - check CONSOLIDATED_TOOLS_ENABLED for backward compatibility
  if (rawConsolidatedFlag !== undefined) {
    const mode = rawConsolidatedFlag === 'false' ? 'legacy-only' : 'consolidated-only';
    return {
      mode,
      usedLegacyFlag: true,
      rawConsolidatedFlag
    };
  }

  // Both unset - use default
  return {
    mode: 'consolidated-only',
    usedLegacyFlag: false
  };
};

/**
 * Generate unique session ID for tracking
 */
export const generateSessionId: GenerateSessionIdFunction = () => {
  return uuidv4();
};

/**
 * Extract client information from MCP server instance
 *
 * Centralizes client info extraction to avoid duplication across analytics call sites.
 * Returns client name and version from MCP SDK's ClientVersion interface.
 *
 * @param server - MCP Server instance
 * @returns ClientInfo object with name and version (may be undefined if client not initialized)
 */
export function extractClientInfo(server: Server): ClientInfo {
  const clientImplementation = server.getClientVersion();
  return {
    name: clientImplementation?.name,
    version: clientImplementation?.version
  };
}

/**
 * Factory function for creating MCP server instances
 *
 * Creates configured MCP server with:
 * - Server instantiation with name/version
 * - Analytics initialization (singleton or provided instance)
 * - Tool mode parsing and validation
 * - Session ID generation
 * - Optional stdio transport setup
 * - Client info tracking hooks
 *
 * @param config - Server configuration
 * @returns Server instance with metadata and lifecycle methods
 *
 * @example
 * // Basic usage with stdio transport (default)
 * const server = createMcpServer({
 *   vaultPath: '/path/to/vault',
 *   serverName: 'my-mcp-server',
 *   enableStdio: true
 * });
 * server.start();
 *
 * @example
 * // Usage for testing (stdio transport disabled)
 * const server = createMcpServer({
 *   vaultPath: '/tmp/test-vault',
 *   enableStdio: false // disables stdio transport for test environments
 * });
 * // Use server instance methods directly in tests
 */
export const createMcpServer: CreateMcpServerFunction = (config) => {
  // Validate required configuration
  if (!config.vaultPath || config.vaultPath.trim() === '') {
    throw new Error('Invalid vaultPath: must be non-empty string');
  }

  // Validate vault path exists and is accessible
  try {
    accessSync(config.vaultPath, constants.R_OK | constants.W_OK);
  } catch (error) {
    throw new Error(`Vault path not accessible: ${config.vaultPath}. Ensure the path exists and has read/write permissions.`);
  }

  // Use provided values or defaults
  const serverName = config.serverName || 'lifeos-mcp';
  const serverVersion = config.serverVersion || SERVER_VERSION;
  const env = config.env || process.env;
  const enableStdio = config.enableStdio !== false; // Default true

  // Initialize or use provided analytics
  const analytics = config.analytics || AnalyticsCollector.getInstance();

  // Parse tool mode from config or environment
  const toolModeConfig: ToolModeConfig = config.toolMode
    ? {
        mode: config.toolMode,
        usedLegacyFlag: false
      }
    : parseToolMode(env);

  // Log deprecation warning if old flag was used
  if (toolModeConfig.usedLegacyFlag) {
    console.error(
      '[DEPRECATED] CONSOLIDATED_TOOLS_ENABLED will be removed in Cycle 10. Use TOOL_MODE instead.'
    );
  }

  // Generate or use provided session ID
  const sessionId = config.sessionId || generateSessionId();

  // Track client info
  let clientInfo: ClientInfo = config.clientInfo || {};

  // Create MCP server instance
  const server = new Server(
    {
      name: serverName,
      version: serverVersion,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Setup client info tracking callback
  server.oninitialized = () => {
    const extractedClientInfo = extractClientInfo(server);
    if (extractedClientInfo.name && extractedClientInfo.version) {
      clientInfo = extractedClientInfo;
      // Log client info for debugging
      console.error(`[Analytics] Client connected: ${clientInfo.name} v${clientInfo.version} (session: ${sessionId})`);

      // Set client info and session ID provider in ToolRouter for analytics
      // Session ID is provided via function to avoid duplication - factory maintains single source of truth
      ToolRouter.setClientInfo(clientInfo, () => sessionId);
    }
  };

  // Create stdio transport if enabled
  let transport: StdioServerTransport | undefined;
  if (enableStdio) {
    transport = new StdioServerTransport();
  }

  // Return server instance with lifecycle methods
  const instance: McpServerInstance = {
    server,
    analytics,
    toolModeConfig,
    sessionId,
    transport,

    /**
     * Connect server to transport
     * For stdio mode: connects to stdio transport
     * For HTTP mode: no-op (HTTP handles own transport)
     */
    async connect(): Promise<void> {
      if (transport) {
        await server.connect(transport);
      }
    },

    /**
     * Graceful server shutdown
     * Flushes analytics, closes transport, cleans up resources
     */
    async shutdown(): Promise<void> {
      // Flush analytics before shutdown
      if (analytics && typeof analytics.flush === 'function') {
        await analytics.flush();
      }

      // Close server connection
      if (server && typeof server.close === 'function') {
        await server.close();
      }
    }
  };

  return instance;
};
