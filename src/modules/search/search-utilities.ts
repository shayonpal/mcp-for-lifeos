/**
 * Search Utilities
 *
 * High-level search functions for the SearchEngine module.
 * Extracted from VaultUtils as part of MCP-91 refactoring.
 *
 * @module search/search-utilities
 */

import { join } from 'path';
import { glob } from 'glob';
import {
  LIFEOS_CONFIG,
  LifeOSNote,
  SearchOptions,
  matchesContentType,
  hasAnyTag,
  getLocalDate
} from '../../shared/index.js';
import { readNote } from '../files/note-crud.js';

/**
 * Find a note by title using the SearchEngine
 *
 * Uses dynamic import to avoid circular dependency issues with SearchEngine.
 * Performs a quick text search on the note title.
 *
 * @param title - The title to search for
 * @returns The path of the found note
 * @throws Error if no note found with the given title
 *
 * @example
 * const path = await findNoteByTitle("My Project");
 */
export async function findNoteByTitle(title: string): Promise<string> {
  // Dynamic import to avoid circular dependency
  const { SearchEngine } = await import('./index.js');

  const searchResults = await SearchEngine.quickSearch(title, 1);

  if (searchResults.length === 0) {
    throw new Error(`No note found with title: ${title}`);
  }

  return searchResults[0].note.path;
}

/**
 * Find notes matching a glob pattern
 *
 * Searches the vault for files matching the provided glob pattern.
 * Ignores node_modules and hidden files by default.
 *
 * @param pattern - Glob pattern to match (default: "**\/*.md")
 * @returns Array of matching file paths
 *
 * @example
 * const notes = await findNotes("Projects/**\/*.md");
 */
export async function findNotes(pattern: string = "**/*.md"): Promise<string[]> {
  const searchPath = join(LIFEOS_CONFIG.vaultPath, pattern);
  return await glob(searchPath, {
    ignore: ["**/node_modules/**", "**/.*"],
  });
}

/**
 * Get all notes in the vault with parsed frontmatter
 *
 * Enumerates all markdown files and parses their YAML frontmatter.
 * Uses the same cache mechanism as SearchEngine.
 *
 * @returns Array of all LifeOSNote objects
 *
 * @remarks
 * This function reads and parses all notes synchronously.
 * For better performance with large vaults, consider using SearchEngine.getAllNotes() instead.
 *
 * @example
 * const allNotes = getAllNotes();
 * const recentNotes = allNotes.filter(n => n.modified > new Date('2025-01-01'));
 */
export function getAllNotes(): LifeOSNote[] {
  const pattern = join(LIFEOS_CONFIG.vaultPath, "**/*.md");
  const files = glob.sync(pattern, {
    ignore: ["**/node_modules/**", "**/.*"],
  });

  const notes: LifeOSNote[] = [];
  for (const file of files) {
    try {
      const note = readNote(file);
      notes.push(note);
    } catch {
      // Silent skip for problematic files
      // Continue processing other files
    }
  }

  return notes;
}

/**
 * Search notes by metadata criteria
 *
 * Filters notes by content type, tags, category, folder location, and date range.
 * Uses getAllNotes() internally, so suitable for focused searches rather than full scans.
 *
 * @param options - Search filter options
 * @returns Array of matching LifeOSNote objects
 *
 * @example
 * // Find articles with "work" tag created after Jan 1, 2025
 * const workNotes = searchNotes({
 *   contentType: 'Article',
 *   tags: ['work'],
 *   dateRange: { start: new Date('2025-01-01') }
 * });
 *
 * @remarks
 * - If multiple tags are specified, returns notes that have ANY of the tags
 * - Date range uses local timezone interpretation (00:00:00 for start dates)
 * - Folder filtering checks if note path starts with the specified folder
 */
export function searchNotes(options: SearchOptions): LifeOSNote[] {
  const allNotes = getAllNotes();

  return allNotes.filter((note) => {
    // Filter by content type if specified
    if (options.contentType) {
      const searchTypes = Array.isArray(options.contentType)
        ? options.contentType
        : [options.contentType];

      const hasMatchingType = searchTypes.some((type) =>
        matchesContentType(note.frontmatter['content type'], type)
      );

      if (!hasMatchingType) return false;
    }

    // Filter by tags if specified (any tag match)
    if (options.tags && options.tags.length > 0) {
      const noteTags = Array.isArray(note.frontmatter.tags)
        ? note.frontmatter.tags
        : [];

      if (!hasAnyTag(noteTags, options.tags)) {
        return false;
      }
    }

    // Filter by category if specified
    if (options.category) {
      if (note.frontmatter.category !== options.category) {
        return false;
      }
    }

    // Filter by folder if specified
    if (options.folder) {
      const notePath = note.path.toLowerCase();
      const folderPath = options.folder.toLowerCase();

      if (!notePath.startsWith(folderPath)) {
        return false;
      }
    }

    // Filter by date range if specified
    if (options.dateRange) {
      if (options.dateRange.start) {
        const startDate = getLocalDate(options.dateRange.start);
        if (note.created < startDate) {
          return false;
        }
      }

      if (options.dateRange.end) {
        const endDate = getLocalDate(options.dateRange.end);
        // Set end date to end of day (23:59:59)
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        if (note.created > endOfDay) {
          return false;
        }
      }
    }

    return true;
  });
}
