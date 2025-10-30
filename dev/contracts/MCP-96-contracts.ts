/**
 * Implementation contracts for Linear Issue: MCP-96
 * Issue: Extract consolidated tool handlers into request-handler registry
 *
 * Provides helper types shared across the MCP-96 implementation so both the
 * request-handler module and entry point agree on hybrid dispatch behaviour.
 */

import type { ClientInfo } from './MCP-6-contracts.js';
import type { RequestHandler, ToolHandler } from './MCP-8-contracts.js';

/**
 * Canonical list of consolidated tool names managed by the registry.
 */
export type ConsolidatedToolName = 'search' | 'create_note' | 'list';

export const CONSOLIDATED_TOOL_NAMES: readonly ConsolidatedToolName[] = [
  'search',
  'create_note',
  'list'
] as const;

/**
 * Mutable registry used during handler registration.
 *
 * The public contract in MCP-8 exposes a readonly map, but the MCP-96
 * extraction phase needs a mutable view while the registry is being
 * populated. Consumers must treat this as write-once and never expose it
 * outside of handler construction.
 */
export type MutableToolHandlerRegistry = Map<string, ToolHandler>;

/**
 * Extended request handler that allows the caller to update client context
 * (name/version) once the MCP handshake completes. This keeps analytics
 * metadata accurate without rebuilding the registry per request.
 */
export interface RequestHandlerWithClientContext extends RequestHandler {
  updateClientContext(info: ClientInfo): void;
}

/**
 * Error thrown when the handler registry cannot resolve a tool. The entry
 * point uses this to trigger the legacy switch fallback while other error
 * types propagate to the caller unchanged.
 */
export class UnknownToolError extends Error {
  public readonly type = 'unknownTool';

  constructor(public readonly toolName: string, message?: string) {
    super(message ?? `Unknown tool: ${toolName}`);
    this.name = 'UnknownToolError';
  }
}

/**
 * Type guard for UnknownToolError so hybrid dispatch can reliably detect the
 * fallback condition even if the error was re-wrapped across module
 * boundaries.
 */
export function isUnknownToolError(error: unknown): error is UnknownToolError {
  if (error instanceof UnknownToolError) {
    return true;
  }

  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as { type?: unknown; toolName?: unknown };
  return candidate.type === 'unknownTool' && typeof candidate.toolName === 'string';
}
