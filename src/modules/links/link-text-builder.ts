/**
 * Link Text Builder
 *
 * Utilities for constructing and updating wikilinks in notes.
 * Extracted from VaultUtils as part of MCP-91 refactoring.
 *
 * @module links/link-text-builder
 */

import { stripMdExtension, WIKILINK_PATTERN } from "../../shared/index.js";

/**
 * Build new wikilink text from components
 *
 * Constructs a properly formatted wikilink with optional embed flag, anchor, and alias.
 *
 * @param embedFlag - Optional embed prefix (usually '!')
 * @param targetNote - Target note name (without .md extension)
 * @param heading - Optional heading anchor (e.g., "Section")
 * @param blockRef - Optional block reference (e.g., "^abc123")
 * @param alias - Optional display alias
 * @returns Properly formatted wikilink text
 *
 * @example
 * buildNewLinkText(undefined, "Meeting Notes", "Action Items", undefined, undefined)
 * // Returns: "[[Meeting Notes#Action Items]]"
 *
 * @example
 * buildNewLinkText("!", "Image", undefined, undefined, "Screenshot")
 * // Returns: "![[Image|Screenshot]]"
 */
export function buildNewLinkText(
  embedFlag: string | undefined,
  targetNote: string,
  heading: string | undefined,
  blockRef: string | undefined,
  alias: string | undefined
): string {
  let link = '[[' + targetNote;

  // Add anchor (heading or block ref) after #
  // Block refs include ^ prefix in the blockRef parameter
  if (blockRef) {
    link += '#' + blockRef;  // blockRef already includes ^
  } else if (heading) {
    link += '#' + heading;
  }

  // Add alias BEFORE closing brackets
  if (alias) {
    link += '|' + alias;
  }

  link += ']]';  // Close AFTER alias

  if (embedFlag) {
    link = embedFlag + link;
  }

  return link;
}

/**
 * Update wikilinks in note content
 *
 * Finds all wikilinks matching the old note name and replaces them with the new note name.
 * Preserves embed flags, anchors (headings/block refs), and aliases.
 *
 * Case-insensitive matching for target notes, preserving user's chosen casing in aliases.
 *
 * @param content - Full note content (including YAML frontmatter)
 * @param oldNoteName - Old note name (with or without .md extension)
 * @param newNoteName - New note name (with or without .md extension)
 * @returns Updated content with replaced wikilinks
 *
 * @example
 * const content = "See [[Old Note]] and [[Old Note|my note]]";
 * updateNoteLinks(content, "Old Note", "New Note")
 * // Returns: "See [[New Note]] and [[New Note|my note]]"
 *
 * @remarks
 * - Updates wikilinks in both YAML frontmatter and body content
 * - Preserves YAML structure (uses string replacement, not re-parsing)
 * - Case-insensitive target matching
 * - Strips .md extensions for consistent comparison
 */
export function updateNoteLinks(
  content: string,
  oldNoteName: string,
  newNoteName: string
): string {
  // Strip .md extension from both names for consistent comparison
  const oldNameNormalized = stripMdExtension(oldNoteName).toLowerCase();
  const newNameNormalized = stripMdExtension(newNoteName);

  // MCP-110: Update wikilinks in both frontmatter and content
  // Use simple string replacement on full content (preserves YAML structure)
  const updatedFullContent = content.replace(
    WIKILINK_PATTERN,
    (match: string, embedFlag: string | undefined, target: string, anchor: string | undefined, alias: string | undefined) => {
      // Normalize target for case-insensitive comparison
      const targetNormalized = stripMdExtension(target).toLowerCase();

      // Only update if target matches old note name
      if (targetNormalized === oldNameNormalized) {
        // Classify anchor as heading or block reference
        // Block refs start with ^ (e.g., "^abc123")
        // Headings are plain text (e.g., "Section")
        const isBlockRef = anchor?.startsWith('^') ?? false;
        const heading = isBlockRef ? undefined : anchor;
        const blockRef = isBlockRef ? anchor : undefined;

        return buildNewLinkText(embedFlag, newNameNormalized, heading, blockRef, alias);
      }

      // Preserve non-matching links unchanged
      return match;
    }
  );

  return updatedFullContent;
}
