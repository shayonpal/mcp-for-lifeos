/**
 * Implementation contracts for Linear Issue: MCP-6
 * Issue: Extract MCP server core
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-6/extract-mcp-server-core
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { AnalyticsCollector } from '../../src/modules/analytics/index.js';

// ============================================================================
// TYPE DEFINITIONS (From src/index.ts)
// ============================================================================

/**
 * Valid tool mode configurations
 * - legacy-only: 20 legacy tools (deprecated mode)
 * - consolidated-only: 12 consolidated tools (default)
 * - consolidated-with-aliases: 34 tools (consolidated + legacy aliases)
 */
export type ToolMode = 'legacy-only' | 'consolidated-only' | 'consolidated-with-aliases';

/**
 * Tool mode configuration with validation metadata
 * Tracks which environment variables were used and their raw values
 */
export interface ToolModeConfig {
  /** Selected tool mode */
  mode: ToolMode;
  /** Whether deprecated CONSOLIDATED_TOOLS_ENABLED flag was used */
  usedLegacyFlag: boolean;
  /** Raw TOOL_MODE environment variable value (if set) */
  rawToolMode?: string;
  /** Raw CONSOLIDATED_TOOLS_ENABLED value (if set) */
  rawConsolidatedFlag?: string;
}

/**
 * Client information for session tracking
 */
export interface ClientInfo {
  /** Client name (e.g., "claude-desktop", "raycast") */
  name?: string;
  /** Client version */
  version?: string;
}

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Configuration for MCP server factory
 * Factory creates server with specified configuration and optional dependency overrides
 */
export interface McpServerConfig {
  /** Path to Obsidian vault (required) */
  vaultPath: string;

  /** Tool mode - if not specified, parses from process.env.TOOL_MODE */
  toolMode?: ToolMode;

  /** Server name for MCP protocol identification */
  serverName?: string;

  /** Server version for MCP protocol */
  serverVersion?: string;

  /** Analytics collector instance - creates singleton if not provided */
  analytics?: AnalyticsCollector;

  /** Session ID for tracking - generates UUID if not provided */
  sessionId?: string;

  /** Enable stdio transport creation (default: true) */
  enableStdio?: boolean;

  /** Client information for session tracking */
  clientInfo?: ClientInfo;

  /** Environment variables for tool mode parsing (default: process.env) */
  env?: NodeJS.ProcessEnv;
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * MCP Server instance with associated metadata and lifecycle methods
 * Returned by createMcpServer factory function
 */
export interface McpServerInstance {
  /** MCP Server instance configured and ready for use */
  server: Server;

  /** Analytics collector instance (shared singleton) */
  analytics: AnalyticsCollector;

  /** Tool mode configuration used by server */
  toolModeConfig: ToolModeConfig;

  /** Session ID for tracking this server instance */
  sessionId: string;

  /** Stdio transport if created (undefined if enableStdio: false) */
  transport?: StdioServerTransport;

  /**
   * Connect server to transport
   * For stdio mode: connects to stdio transport
   * For HTTP mode: no-op (HTTP handles own transport)
   */
  connect(): Promise<void>;

  /**
   * Graceful server shutdown
   * Flushes analytics, closes transport, cleans up resources
   */
  shutdown(): Promise<void>;
}

// ============================================================================
// FACTORY CONTRACT
// ============================================================================

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
 * // Stdio mode (default)
 * const instance = createMcpServer({
 *   vaultPath: '/path/to/vault'
 * });
 * await instance.connect();
 *
 * @example
 * // HTTP mode (no stdio transport)
 * const instance = createMcpServer({
 *   vaultPath: '/path/to/vault',
 *   enableStdio: false
 * });
 *
 * @example
 * // Testing with mock analytics
 * const instance = createMcpServer({
 *   vaultPath: '/test/vault',
 *   analytics: mockAnalytics,
 *   enableStdio: false
 * });
 */
export type CreateMcpServerFunction = (config: McpServerConfig) => McpServerInstance;

// ============================================================================
// HELPER CONTRACTS
// ============================================================================

/**
 * Tool mode parsing function contract
 * Parses and validates TOOL_MODE environment variable with fallback logic
 *
 * Validation Rules:
 * 1. If TOOL_MODE set and valid → use it
 * 2. If TOOL_MODE set but invalid → log error, fallback to default
 * 3. If TOOL_MODE unset → check CONSOLIDATED_TOOLS_ENABLED for backward compatibility
 * 4. If both unset → use default 'consolidated-only'
 *
 * @param env - Environment variables (typically process.env)
 * @returns Tool mode configuration with validation metadata
 */
export type ParseToolModeFunction = (env: NodeJS.ProcessEnv) => ToolModeConfig;

/**
 * Tool mode validation function contract
 * Type guard for validating ToolMode strings
 *
 * @param value - String value to validate
 * @returns True if value is valid ToolMode
 */
export type IsValidToolModeFunction = (value: string | undefined) => value is ToolMode;

/**
 * Session ID generation function contract
 * Generates unique UUID for session tracking
 *
 * @returns UUID string
 */
export type GenerateSessionIdFunction = () => string;

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error types that may be thrown during server creation:
 *
 * @throws Error - Invalid vaultPath (empty or invalid)
 * @throws Error - Analytics initialization failure
 * @throws Error - Transport connection failure (stdio mode)
 * @throws Error - Server instantiation failure
 *
 * All errors should be caught and logged during factory execution.
 * Factory should not throw - return server instance or fail gracefully.
 */

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Integration points and dependencies
 */
export interface McpServerIntegration {
  /** Extends MCP SDK Server class */
  extends: 'Server';

  /** Integration points */
  integrates: {
    /** Uses AnalyticsCollector singleton for telemetry */
    analytics: true;
    /** Creates StdioServerTransport for stdio communication */
    stdioTransport: true;
    /** Parses tool mode from environment variables */
    toolModeConfig: true;
    /** Tracks session with UUID */
    sessionTracking: true;
    /** Registers client info callbacks */
    clientInfoTracking: true;
  };

  /** Dependencies consumed */
  consumes: {
    /** @modelcontextprotocol/sdk - Server, StdioServerTransport */
    mcpSdk: '^1.0.0';
    /** uuid - Session ID generation */
    uuid: '^11.1.0';
  };

  /** Modules that will consume factory */
  consumedBy: {
    /** src/index.ts - CLI entry point */
    cliEntrypoint: 'src/index.ts';
    /** src/server/http-server.ts - HTTP server */
    httpServer: 'src/server/http-server.ts';
    /** tests - Unit and integration tests */
    tests: 'tests/**/*.test.ts';
  };
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors and constraints:
 *
 * MUST:
 * - Create Server instance with provided name/version
 * - Initialize or accept AnalyticsCollector singleton
 * - Parse tool mode from environment with fallback to default
 * - Generate session ID if not provided
 * - Create stdio transport if enableStdio !== false
 * - Return McpServerInstance with all metadata
 * - Provide connect() and shutdown() lifecycle methods
 * - Log tool mode configuration to stderr
 * - Track client info via server.oninitialized callback
 *
 * MUST NOT:
 * - Throw unhandled exceptions (catch and log)
 * - Create multiple analytics instances (use singleton)
 * - Register tools (deferred to index.ts until MCP-7)
 * - Register request handlers (deferred to index.ts until MCP-8)
 * - Modify global state beyond server instance
 * - Block on async operations during factory call
 *
 * SHOULD:
 * - Validate vaultPath exists and is accessible
 * - Log warnings for invalid tool mode with fallback
 * - Use default server name 'lifeos-mcp' if not provided
 * - Use SERVER_VERSION constant for version if not provided
 * - Accept optional overrides for testing (analytics, sessionId)
 *
 * TESTING:
 * - Factory must be testable without MCP protocol overhead
 * - Accept mock analytics for unit tests
 * - Support enableStdio: false for non-transport tests
 * - Validate tool mode parsing logic independently
 * - Test lifecycle methods (connect, shutdown) in isolation
 */

// ============================================================================
// VALIDATION STRATEGY
// ============================================================================

/**
 * Compile-time validation:
 * - TypeScript type checking via `npm run typecheck`
 * - All interfaces must conform to these contracts
 * - Factory return type must match McpServerInstance
 *
 * Implementation validation:
 * - Import these contracts in implementation file
 * - Declare factory with CreateMcpServerFunction type
 * - Use helper function types for parseToolMode, isValidToolMode
 *
 * Test validation:
 * - Import contracts for test type safety
 * - Mock dependencies conform to interface types
 * - Validate factory output matches McpServerInstance
 *
 * Code review validation:
 * - Verify implementation matches behavioral contracts
 * - Ensure error handling follows error contracts
 * - Validate integration points match integration contracts
 */
