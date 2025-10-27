/**
 * Path utility functions for consistent file path handling
 *
 * This module provides standardized utilities for path manipulation operations
 * to eliminate code duplication and ensure consistent behavior across the codebase.
 *
 * @module path-utils
 * @since MCP-89
 */

import * as path from 'path';

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

/**
 * Normalize paths that may be relative or absolute for vault operations
 *
 * Handles both absolute paths (e.g., from LIFEOS_CONFIG.dailyNotesPath) and relative paths
 * (e.g., from user input or template inference). Uses path.isAbsolute() for cross-platform
 * absolute path detection (POSIX, Windows, UNC).
 *
 * Features:
 * - Escaped space handling: Converts `\ ` to space for CLI compatibility
 * - Cross-platform absolute path detection (POSIX, Windows, UNC)
 * - Optional path traversal prevention (vault confinement)
 *
 * This is a pure function with no side effects:
 * - Does not perform I/O operations (no file exists checks)
 * - Deterministic output for same input
 * - Throws only when path traversal detected and validation enabled
 *
 * @param inputPath - Path to normalize (relative or absolute)
 * @param basePath - Base path to join with if inputPath is relative
 * @param options - Optional configuration
 * @param options.validateVaultConfinement - If true, throws error if normalized path escapes basePath
 * @returns Normalized absolute path
 * @throws Error if path traversal detected and validateVaultConfinement is true
 *
 * @example Absolute path (use as-is)
 * ```typescript
 * normalizePath('/Users/shayon/vault/Daily', '/Users/shayon/vault')
 * // Returns: '/Users/shayon/vault/Daily'
 * ```
 *
 * @example Relative path (join with base)
 * ```typescript
 * normalizePath('20 - Areas/21 - Myself/Journals/Daily', '/Users/shayon/vault')
 * // Returns: '/Users/shayon/vault/20 - Areas/21 - Myself/Journals/Daily'
 * ```
 *
 * @example Escaped spaces (CLI compatibility)
 * ```typescript
 * normalizePath('20\\ -\\ Areas/file.md', '/Users/shayon/vault')
 * // Returns: '/Users/shayon/vault/20 - Areas/file.md'
 * ```
 *
 * @example Windows absolute path
 * ```typescript
 * normalizePath('C:\\Users\\vault\\Daily', 'C:\\Users\\vault')
 * // Returns: 'C:\\Users\\vault\\Daily'
 * ```
 *
 * @example Windows UNC path (network share)
 * ```typescript
 * normalizePath('\\\\server\\share\\vault', '\\\\server\\share')
 * // Returns: '\\\\server\\share\\vault'
 * ```
 *
 * @example Path traversal prevention
 * ```typescript
 * normalizePath('../outside', '/Users/shayon/vault', { validateVaultConfinement: true })
 * // Throws: Error('Path traversal detected: path escapes vault boundary')
 * ```
 *
 * @since MCP-64
 */
export function normalizePath(
  inputPath: string,
  basePath: string,
  options?: { validateVaultConfinement?: boolean }
): string {
  // Handle escaped spaces for CLI compatibility (e.g., "20\ -\ Areas" → "20 - Areas")
  // This preserves backward compatibility with VaultUtils.normalizePath
  const pathWithoutEscapedSpaces = inputPath.replace(/\\ /g, ' ');

  // Use path.isAbsolute() for cross-platform absolute path detection
  // - POSIX: /path/to/file → true
  // - Windows: C:\path\to\file → true
  // - UNC: \\server\share\file → true
  // - Relative: path/to/file → false
  let normalizedPath: string;

  if (path.isAbsolute(pathWithoutEscapedSpaces)) {
    // Return absolute path as-is without modification
    // Rationale: LIFEOS_CONFIG paths are already absolute and correct
    normalizedPath = pathWithoutEscapedSpaces;
  } else {
    // Join relative paths with basePath using path.join()
    // Rationale: path.join() is cross-platform and handles separators correctly
    normalizedPath = path.join(basePath, pathWithoutEscapedSpaces);
  }

  // Validate vault confinement if requested (prevents path traversal attacks)
  if (options?.validateVaultConfinement) {
    const resolvedPath = path.resolve(normalizedPath);
    const resolvedBase = path.resolve(basePath);

    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error(
        `Path traversal detected: '${inputPath}' resolves to '${resolvedPath}' which escapes vault boundary '${resolvedBase}'`
      );
    }
  }

  return normalizedPath;
}
