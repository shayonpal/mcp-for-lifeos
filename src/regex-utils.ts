/**
 * Shared regex utility functions for search operations
 * Consolidates regex escaping and pattern manipulation
 *
 * @since MCP-59 - Extracted from QueryParser and SearchEngine to eliminate duplication
 */

/**
 * Escapes special regex characters in a string to treat it as a literal search term
 *
 * @param term - The string to escape
 * @returns The escaped string safe for use in RegExp constructor
 *
 * @example
 * escapeRegex("foo.bar") // Returns "foo\\.bar"
 * escapeRegex("test[123]") // Returns "test\\[123\\]"
 *
 * @since MCP-59 - Consolidated regex escaping logic
 */
export function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
