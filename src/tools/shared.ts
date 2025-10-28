/**
 * Shared tool handler types and helpers
 * Common functionality used across multiple tool implementations
 */

import type { ToolMode } from '../../dev/contracts/MCP-6-contracts.js';

/**
 * Tool response structure
 */
export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  truncation?: any;
  metadata?: Record<string, any>;
}

/**
 * Validate tool availability based on tool mode
 */
export function validateToolMode(
  toolMode: ToolMode,
  requiredMode: 'consolidated' | 'legacy'
): void {
  if (requiredMode === 'consolidated' && toolMode === 'legacy-only') {
    throw new Error('Consolidated tools are disabled. Use legacy tools instead.');
  }
  if (requiredMode === 'legacy' && toolMode === 'consolidated-only') {
    throw new Error('Legacy tools are disabled. Use consolidated tools instead.');
  }
}
