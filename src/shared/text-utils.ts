/**
 * Shared text utility functions for search operations
 * Consolidates text normalization and manipulation
 *
 * @since MCP-59 - Extracted from SearchEngine to eliminate duplication
 */

/**
 * Normalizes text for case-insensitive comparison and trimming
 * Supports both string and string[] inputs with method overloading
 *
 * @param text - Text to normalize (string or array of strings)
 * @param caseSensitive - Whether to preserve original casing (default: false)
 * @returns Normalized text in same type as input
 *
 * @example
 * normalizeText("  Hello World  ") // Returns "hello world"
 * normalizeText("  Hello World  ", true) // Returns "Hello World"
 * normalizeText(["  Foo  ", "  Bar  "]) // Returns ["foo", "bar"]
 *
 * @since MCP-59 - Consolidated text normalization logic
 */
export function normalizeText(text: string, caseSensitive?: boolean): string;
export function normalizeText(text: string[], caseSensitive?: boolean): string[];
export function normalizeText(text: string | string[], caseSensitive: boolean = false): string | string[] {
  if (Array.isArray(text)) {
    return caseSensitive
      ? text.map(t => t.trim())
      : text.map(t => t.toLowerCase().trim());
  }
  return caseSensitive ? text.trim() : text.toLowerCase().trim();
}
