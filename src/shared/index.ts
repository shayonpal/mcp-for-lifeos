/**
 * Shared Utilities Module
 *
 * Core utilities, types, configuration, and helpers used across the MCP server.
 */

// Re-export all types
export * from './types.js';

// Configuration
export { LIFEOS_CONFIG, YAML_RULES } from './config.js';

// Logging
export { logger } from './logger.js';

// Error types
export { TransactionErrorCode } from './error-types.js';

// Path utilities
export {
  normalizePath,
  stripMdExtension,
  MD_EXTENSION_REGEX
} from './path-utils.js';

// Regex utilities
export {
  WIKILINK_PATTERN,
  escapeRegex
} from './regex-utils.js';

// Text utilities
export {
  normalizeText
} from './text-utils.js';

// Date utilities
export { DateResolver } from './date-resolver.js';

// Metadata utilities
export {
  getLocalDate,
  normalizeTagsToArray,
  matchesContentType,
  hasAnyTag
} from './metadata-utils.js';
