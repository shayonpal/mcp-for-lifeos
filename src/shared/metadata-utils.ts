/**
 * Metadata Utilities
 *
 * Utilities for handling dates, tags, and content type metadata.
 * Extracted from VaultUtils as part of MCP-91 refactoring.
 *
 * @module shared/metadata-utils
 */

/**
 * Get the current local date at midnight (start of day)
 *
 * Ensures consistent date handling regardless of timezone. Parses YYYY-MM-DD strings
 * as local midnight to avoid timezone shifts.
 *
 * @param dateInput - Optional date input (Date object, YYYY-MM-DD string, or ISO string)
 * @returns Date object set to local midnight (00:00:00)
 *
 * @example
 * getLocalDate() // Today at 00:00:00 local time
 *
 * @example
 * getLocalDate("2025-08-30") // Aug 30, 2025 at 00:00:00 local time
 *
 * @example
 * getLocalDate(new Date()) // Input date at 00:00:00 local time
 *
 * @remarks
 * Critical for avoiding timezone bugs in date-sensitive operations.
 * YYYY-MM-DD strings get T00:00:00 appended to force local interpretation.
 */
export function getLocalDate(dateInput?: Date | string): Date {
  let date: Date;

  if (!dateInput) {
    // If no date provided, use current local date
    date = new Date();
  } else if (typeof dateInput === "string") {
    // If string provided (like "2024-05-28"), parse it as local date
    // Add time component to ensure it's interpreted as local midnight
    if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = new Date(dateInput + "T00:00:00");
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = dateInput;
  }

  // Reset to start of day in local timezone
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  return localDate;
}

/**
 * Normalize tags to string array
 *
 * Handles various tag input formats and normalizes them to a consistent string array.
 * Used for YAML frontmatter tag processing and search filtering.
 *
 * @param tags - Tags in various formats (string, string[], undefined, null)
 * @returns Normalized string array (empty array for invalid input)
 *
 * @example
 * normalizeTagsToArray("project") // ["project"]
 *
 * @example
 * normalizeTagsToArray(["work", "urgent"]) // ["work", "urgent"]
 *
 * @example
 * normalizeTagsToArray(undefined) // []
 *
 * @remarks
 * Preserves user input without validation or deduplication.
 * Does NOT trim whitespace or validate tag format.
 */
export function normalizeTagsToArray(tags: any): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") return [tags];
  return [];
}

/**
 * Check if note content type matches search content type
 *
 * Helper for search filtering. Handles both string and array content types.
 *
 * @param noteType - Note's contentType from frontmatter (string, array, or undefined)
 * @param searchType - Content type to search for
 * @returns True if note matches search type
 *
 * @example
 * matchesContentType("article", "article") // true
 *
 * @example
 * matchesContentType(["article", "reference"], "article") // true
 *
 * @example
 * matchesContentType(undefined, "article") // false
 *
 * @internal
 * Search module helper - not intended for direct external use
 */
export function matchesContentType(
  noteType: string | string[] | undefined,
  searchType: string,
): boolean {
  if (!noteType) return false;

  if (Array.isArray(noteType)) {
    return noteType.includes(searchType);
  }

  return noteType === searchType;
}

/**
 * Check if note has any of the search tags
 *
 * Helper for search filtering. Case-sensitive tag matching.
 *
 * @param noteTags - Note's tags from frontmatter (string array or undefined)
 * @param searchTags - Tags to search for
 * @returns True if note has at least one matching tag
 *
 * @example
 * hasAnyTag(["work", "urgent"], ["urgent", "personal"]) // true
 *
 * @example
 * hasAnyTag(["work"], ["personal"]) // false
 *
 * @example
 * hasAnyTag(undefined, ["work"]) // false
 *
 * @internal
 * Search module helper - not intended for direct external use
 */
export function hasAnyTag(
  noteTags: string[] | undefined,
  searchTags: string[],
): boolean {
  if (!noteTags || !Array.isArray(noteTags)) return false;
  return searchTags.some((tag) => noteTags.includes(tag));
}
