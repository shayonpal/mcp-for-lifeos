/**
 * Shared regex utility functions for search operations
 * Consolidates regex escaping and pattern manipulation
 *
 * @since MCP-59 - Extracted from QueryParser and SearchEngine to eliminate duplication
 * @since MCP-106 - Added wikilink pattern for link detection infrastructure
 */

/**
 * Comprehensive regex pattern for matching Obsidian wikilinks
 *
 * Obsidian format: [[target#heading^block|alias]] or [[target#heading^block]]
 * - target: The actual note being linked to (required)
 * - heading: Optional section heading reference (before alias)
 * - block: Optional block reference ID (before alias)
 * - alias: Optional display text shown instead of full link text
 *
 * Pattern breakdown:
 * - `(!)?` - Capture group 1: Optional embed flag (!)
 * - `\[\[` - Opening wikilink brackets
 * - `(.+?)` - Capture group 2: Target note name (required, before #/^/|)
 * - `(?:#(.+?))?` - Capture group 3: Optional heading reference after #
 * - `(?:\^(.+?))?` - Capture group 4: Optional block reference after ^
 * - `(?:\|(.+?))?` - Capture group 5: Optional alias text after pipe (comes last)
 * - `\]\]` - Closing wikilink brackets
 *
 * Capture group indices:
 * - [1]: Embed flag (!) - optional
 * - [2]: Target note name - required (the actual link destination)
 * - [3]: Heading reference - optional (e.g., "Section" from [[Note#Section]])
 * - [4]: Block reference - optional (e.g., "abc" from [[Note^abc]])
 * - [5]: Alias text - optional (display text shown to user, comes after |)
 *
 * Supported formats:
 * - Basic: [[Note]]
 * - Alias: [[Note|Display Text]] (Note=target, Display Text=alias)
 * - Heading: [[Note#Heading]]
 * - Heading + Alias: [[Note#Heading|Alias]]
 * - Block: [[Note^blockref]]
 * - Block + Alias: [[Note^blockref|Alias]]
 * - Embed: ![[Note]]
 * - Combined: [[Note#Heading^block|Alias]]
 *
 * @example Basic link
 * ```typescript
 * const match = WIKILINK_PATTERN.exec("See [[Note]] for details");
 * // match[0] = "[[Note]]"  (full match)
 * // match[1] = undefined   (no embed flag)
 * // match[2] = "Note"      (target note)
 * // match[3] = undefined   (no heading)
 * // match[4] = undefined   (no block ref)
 * // match[5] = undefined   (no alias)
 * ```
 *
 * @example Alias link
 * ```typescript
 * const match = WIKILINK_PATTERN.exec("[[Note|Display]]");
 * // match[0] = "[[Note|Display]]"  (full match)
 * // match[1] = undefined   (no embed flag)
 * // match[2] = "Note"      (target - the actual link destination)
 * // match[3] = undefined   (no heading)
 * // match[4] = undefined   (no block ref)
 * // match[5] = "Display"   (alias - what user sees)
 * ```
 *
 * @example Heading with alias
 * ```typescript
 * const match = WIKILINK_PATTERN.exec("[[Note#Section|Alias]]");
 * // match[0] = "[[Note#Section|Alias]]"
 * // match[1] = undefined   (no embed)
 * // match[2] = "Note"      (target)
 * // match[3] = "Section"   (heading)
 * // match[4] = undefined   (no block ref)
 * // match[5] = "Alias"     (alias)
 * ```
 *
 * @since MCP-106 - Link detection infrastructure (Phase 2 of rename_note)
 */
export const WIKILINK_PATTERN = /(!)?\[\[(.+?)(?:#(.+?))?(?:\^(.+?))?(?:\|(.+?))?\]\]/g;

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
