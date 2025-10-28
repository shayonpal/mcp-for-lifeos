/**
 * Tool Handler Registry
 * Central registry for all tool implementations
 */

// Consolidated tools
export { executeSearch } from './search.js';
export { executeCreateNote } from './create-note.js';
export { executeList } from './list.js';

// Utility tools
export { executeDiagnoseVault } from './utils/diagnose-vault.js';
export { executeMoveItems } from './utils/move-items.js';

// Shared helpers
export { addVersionMetadata, validateToolMode } from './shared.js';
export type { ToolResponse } from './shared.js';
