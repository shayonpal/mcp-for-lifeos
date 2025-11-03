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
 * Obsidian format: [[target#anchor|alias]] or [[target#anchor]]
 * - target: The actual note being linked to (required)
 * - anchor: Optional heading or block reference after # (heading OR block, not both)
 *   - Heading: [[Note#Heading]] - plain text after #
 *   - Block: [[Note#^blockid]] - starts with ^ after #
 * - alias: Optional display text shown instead of full link text
 *
 * Pattern breakdown:
 * - `(!)?` - Capture group 1: Optional embed flag (!)
 * - `\[\[` - Opening wikilink brackets
 * - `(.+?)` - Capture group 2: Target note name (required, non-greedy, supports nested brackets)
 * - `(?:#(\^[^\]|]+|[^\]|]+))?` - Capture group 3: Optional anchor after #
 *   - `\^[^\]|]+` - Block ref (starts with ^, continues until ] or |)
 *   - `[^\]|]+` - Heading (no ^, continues until ] or |)
 * - `(?:\|(.+?))?` - Capture group 4: Optional alias text after pipe (comes last)
 * - `\]\]` - Closing wikilink brackets
 *
 * Capture group indices:
 * - [1]: Embed flag (!) - optional
 * - [2]: Target note name - required (the actual link destination)
 * - [3]: Anchor (heading OR block ref) - optional
 *   - If starts with ^: block reference (includes ^ prefix, e.g., "^abc123")
 *   - Otherwise: heading reference (e.g., "Section")
 * - [4]: Alias text - optional (display text shown to user, comes after |)
 *
 * Supported formats:
 * - Basic: [[Note]]
 * - Alias: [[Note|Display Text]] (Note=target, Display Text=alias)
 * - Heading: [[Note#Heading]]
 * - Heading + Alias: [[Note#Heading|Alias]]
 * - Block: [[Note#^blockref]]
 * - Block + Alias: [[Note#^blockref|Alias]]
 * - Embed: ![[Note]]
 * - Nested brackets: [[Note [with] brackets]] (edge case support)
 *
 * @example Basic link
 * ```typescript
 * const match = WIKILINK_PATTERN.exec("See [[Note]] for details");
 * // match[0] = "[[Note]]"  (full match)
 * // match[1] = undefined   (no embed flag)
 * // match[2] = "Note"      (target note)
 * // match[3] = undefined   (no anchor)
 * // match[4] = undefined   (no alias)
 * ```
 *
 * @example Block reference
 * ```typescript
 * const match = WIKILINK_PATTERN.exec("[[Note#^block123]]");
 * // match[0] = "[[Note#^block123]]"  (full match)
 * // match[1] = undefined   (no embed flag)
 * // match[2] = "Note"      (target note)
 * // match[3] = "^block123" (block ref - includes ^ prefix)
 * // match[4] = undefined   (no alias)
 * ```
 *
 * @example Heading with alias
 * ```typescript
 * const match = WIKILINK_PATTERN.exec("[[Note#Section|Alias]]");
 * // match[0] = "[[Note#Section|Alias]]"
 * // match[1] = undefined   (no embed)
 * // match[2] = "Note"      (target)
 * // match[3] = "Section"   (heading - no ^ prefix)
 * // match[4] = "Alias"     (alias)
 * ```
 *
 * @since MCP-106 - Link detection infrastructure (Phase 2 of rename_note)
 * @since MCP-124 - Updated to properly distinguish block refs from headings, support nested brackets
 */
export const WIKILINK_PATTERN = /(!)?\[\[(.+?)(?:#(\^[^\]|]+|[^\]|]+))?(?:\|(.+?))?\]\]/g;

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
