#!/usr/bin/env node

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ObsidianLinks } from './modules/links/index.js';
import { YamlRulesManager } from './modules/yaml/index.js';
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
import { WALManager } from './wal-manager.js';
import { TransactionManager } from './transaction-manager.js';
import { join } from 'path';
import { homedir } from 'os';

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

// ============================================================================
// BOOT RECOVERY SYSTEM
// ============================================================================

/**
 * Recover pending transactions from orphaned WAL entries
 *
 * Called during server startup before handler registration.
 * Scans for WAL files older than 1 minute and attempts automatic recovery.
 * Server startup continues regardless of recovery outcome (graceful degradation).
 *
 * Part of MCP-119: Boot Recovery System
 * @see dev/contracts/MCP-108-contracts.ts (lines 571-620, 877-884)
 * @see https://linear.app/agilecode-studio/issue/MCP-119
 * @internal Exported for testing purposes only
 */
export async function recoverPendingTransactions(): Promise<void> {
  const walManager = new WALManager();
  const walDir = join(homedir(), '.config', 'mcp-lifeos', 'wal');
  const lockFile = join(walDir, '.recovery.lock');
  let lockAcquired = false;

  try {
    // 1. Try to acquire recovery lock to prevent concurrent recovery
    try {
      const { existsSync, statSync, writeFileSync, unlinkSync } = await import('fs');

      if (existsSync(lockFile)) {
        const lockStat = statSync(lockFile);
        const lockAge = Date.now() - lockStat.mtimeMs;

        // If lock is recent (<2 minutes), another process is likely recovering
        if (lockAge < 120000) {
          console.error(`⏭️  Skipping recovery - another process is recovering (lock age: ${Math.round(lockAge / 1000)}s)`);
          return;
        }

        // Stale lock - take over
        console.error(`⚠️  Stale recovery lock detected (${Math.round(lockAge / 1000)}s old) - taking over`);
        unlinkSync(lockFile);
      }

      // Create lock file with current PID
      writeFileSync(lockFile, JSON.stringify({ pid: process.pid, timestamp: new Date().toISOString() }), 'utf-8');
      lockAcquired = true;
    } catch (lockError) {
      // If we can't acquire lock, log and skip recovery
      console.error(`⚠️  Cannot acquire recovery lock: ${lockError instanceof Error ? lockError.message : String(lockError)}`);
      return;
    }

    // 2. Scan for pending WAL entries
    const pendingWALs = await walManager.scanPendingWALs();

    if (pendingWALs.length === 0) {
      // No orphaned transactions - lock will be released in finally block
      return;
    }

    console.error(`Found ${pendingWALs.length} orphaned transaction(s), attempting recovery...`);

    // Track recovery time to enforce 5s budget
    const recoveryStartTime = Date.now();
    const RECOVERY_TIMEOUT_MS = 5000;

    // 3. Attempt recovery for each WAL
    for (const wal of pendingWALs) {
      // Check if recovery budget exceeded
      const elapsedTime = Date.now() - recoveryStartTime;
      if (elapsedTime > RECOVERY_TIMEOUT_MS) {
        console.error(`⚠️  Recovery timeout exceeded (${Math.round(elapsedTime / 1000)}s) - stopping recovery`);
        console.error(`   Processed some WALs, remaining will be recovered on next startup`);
        break;
      }

      // Note: Age filtering (<1 minute) already handled by scanPendingWALs()

      // SECURITY: Validate WAL vault path matches configured vault
      if (wal.vaultPath !== LIFEOS_CONFIG.vaultPath) {
        console.error(`⚠️  Skipping WAL ${wal.correlationId} - vault path mismatch`);
        console.error(`   WAL vault: ${wal.vaultPath}`);
        console.error(`   Configured: ${LIFEOS_CONFIG.vaultPath}`);
        continue;
      }

      // SECURITY: Validate all manifest paths are within vault boundaries
      const pathsToValidate = [
        wal.manifest.noteRename.from,
        wal.manifest.noteRename.to,
        wal.manifest.noteRename.stagedPath,
        ...wal.manifest.linkUpdates.map(u => u.path),
        ...wal.manifest.linkUpdates.map(u => u.stagedPath)
      ].filter(Boolean);

      const invalidPaths = pathsToValidate.filter(p => !p?.startsWith(wal.vaultPath));
      if (invalidPaths.length > 0) {
        console.error(`❌ Rejecting WAL ${wal.correlationId} - paths outside vault`);
        console.error(`   Invalid paths: ${invalidPaths.join(', ')}`);
        continue;
      }

      try {
        // Create TransactionManager and attempt rollback
        const txManager = new TransactionManager(wal.vaultPath, walManager);
        // Resolve WAL path using centralized helper
        const walPath = walManager.resolvePath(wal);
        const result = await txManager.rollback(wal.manifest, walPath);

        if (result.success) {
          // 4. WAL already deleted by TransactionManager.rollback()
          console.error(`✅ Recovered transaction ${wal.correlationId}`);
        } else if (result.partialRecovery) {
          // 5. Partial recovery - preserve WAL, log instructions
          console.error(`⚠️  Partial recovery for ${wal.correlationId} - manual intervention needed`);
          console.error(`   WAL preserved: ${walPath}`);
          if (result.failures && result.failures.length > 0) {
            console.error(`   Failures:`);
            result.failures.forEach((failure) =>
              console.error(`   - ${failure.path}: ${failure.error}`)
            );
          }
        } else {
          // 6. Recovery failed - preserve WAL
          console.error(`❌ Recovery failed for ${wal.correlationId}`);
          console.error(`   WAL preserved: ${walPath}`);
          if (result.failures && result.failures.length > 0) {
            console.error(`   Failures:`);
            result.failures.forEach((failure) =>
              console.error(`   - ${failure.path}: ${failure.error}`)
            );
          }
        }
      } catch (error) {
        // 7. Recovery error - preserve WAL, log error
        console.error(`❌ Recovery error for ${wal.correlationId}: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`   WAL preserved for manual recovery`);
      }
    }
  } catch (error) {
    // 8. Scan error - log and continue startup
    console.error(`⚠️  WAL scan failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`   Server startup continuing...`);
  } finally {
    // 9. Release recovery lock if acquired
    if (lockAcquired) {
      try {
        const { unlinkSync, existsSync } = await import('fs');
        if (existsSync(lockFile)) {
          unlinkSync(lockFile);
        }
      } catch (unlockError) {
        // Log but don't fail - stale lock will be cleaned up next time
        console.error(`⚠️  Failed to release recovery lock: ${unlockError instanceof Error ? unlockError.message : String(unlockError)}`);
      }
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
  // Recover orphaned transactions before serving requests (MCP-119)
  await recoverPendingTransactions();

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
