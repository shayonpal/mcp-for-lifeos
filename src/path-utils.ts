/**
 * Path utility functions for consistent file path handling
 *
 * This module provides standardized utilities for path manipulation operations
 * to eliminate code duplication and ensure consistent behavior across the codebase.
 *
 * @module path-utils
 * @since MCP-89
 */

/**
 * Regex pattern for matching .md extension at end of string
 *
 * Pattern: /\.md$/
 * - Matches literal ".md" at end of string only
 * - Does not match ".md" in middle of filename
 * - Prevents incorrect replacements like "my.mdfile.md" → "myfile.md"
 *
 * @example
 * ```typescript
 * "template.md".match(MD_EXTENSION_REGEX) // Matches
 * "my.mdfile.md".match(MD_EXTENSION_REGEX) // Matches only final .md
 * "template".match(MD_EXTENSION_REGEX) // No match
 * ```
 *
 * @since MCP-89
 */
export const MD_EXTENSION_REGEX = /\.md$/;

/**
 * Strip .md extension from filename or path
 *
 * Removes trailing .md extension while preserving:
 * - Directory path components (relative or absolute)
 * - Non-.md extensions
 * - Multiple .md extensions (only strips final .md)
 * - Empty strings (returns empty string)
 *
 * This is a pure function with no side effects:
 * - Does not modify input parameter
 * - No I/O operations
 * - Deterministic output for same input
 * - No exceptions thrown
 *
 * @param filename - Filename or path with optional .md extension
 * @returns Filename/path with trailing .md removed, or original if no .md extension
 *
 * @example Basic usage
 * ```typescript
 * stripMdExtension("template.md")  // Returns "template"
 * stripMdExtension("template")     // Returns "template"
 * ```
 *
 * @example Edge cases
 * ```typescript
 * stripMdExtension("")              // Returns ""
 * stripMdExtension("template.md.md") // Returns "template.md"
 * stripMdExtension("my.mdfile.md")  // Returns "my.mdfile"
 * stripMdExtension("document.txt")  // Returns "document.txt"
 * ```
 *
 * @example Path preservation
 * ```typescript
 * stripMdExtension("folder/template.md")       // Returns "folder/template"
 * stripMdExtension("/absolute/path/note.md")   // Returns "/absolute/path/note"
 * stripMdExtension("my.note.file.md")          // Returns "my.note.file"
 * ```
 *
 * @since MCP-89
 */
export function stripMdExtension(filename: string): string {
  return filename.replace(MD_EXTENSION_REGEX, '');
}
