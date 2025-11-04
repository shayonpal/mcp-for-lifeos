/**
 * Daily Note Service
 *
 * Extracted from vault-utils.ts (MCP-141)
 * Provides operations for daily notes with template support
 */

import { existsSync } from "fs";
import { join } from "path";
import { format } from "date-fns";
import matter from "gray-matter";
import { readNote, createNote } from "./note-crud.js";
import { LIFEOS_CONFIG } from "../../shared/index.js";
import type { LifeOSNote, YAMLFrontmatter } from "../../shared/index.js";
import type { TemplateContext } from "../templates/index.js";

/**
 * Get a daily note for a specific date (if it exists)
 *
 * @param date - The date for the daily note
 * @param getLocalDate - Function to convert date to local timezone
 * @returns The daily note if it exists, null otherwise
 */
export async function getDailyNote(
  date: Date,
  getLocalDate: (date: Date) => Date,
): Promise<LifeOSNote | null> {
  // Ensure we're working with local date at start of day
  const localDate = getLocalDate(date);
  const dateStr = format(localDate, "yyyy-MM-dd");
  const fileName = `${dateStr}.md`;
  const filePath = join(LIFEOS_CONFIG.dailyNotesPath, fileName);

  // Looking for daily note

  if (existsSync(filePath)) {
    // Found daily note
    return readNote(filePath);
  } else {
    // Daily note not found - this is normal, return null
  }

  return null;
}

/**
 * Create a new daily note for a specific date
 *
 * Uses template if available, falls back to minimal template
 *
 * @param date - The date for the daily note
 * @param getLocalDate - Function to convert date to local timezone
 * @param getTemplateManager - Function to get template manager instance
 * @returns The created daily note
 */
export async function createDailyNote(
  date: Date,
  getLocalDate: (date: Date) => Date,
  getTemplateManager: () => any,
): Promise<LifeOSNote> {
  // Ensure we're working with local date at start of day
  const localDate = getLocalDate(date);
  const dateStr = format(localDate, "yyyy-MM-dd");

  try {
    // Get the template manager
    const templateManager = getTemplateManager();

    // Get the daily note template name
    const templateName = await templateManager.getDailyNoteTemplate();

    // Use configured daily notes path directly (not from Obsidian settings)
    const dailyNoteFolder = LIFEOS_CONFIG.dailyNotesPath;

    if (templateName) {
      // Create template context
      const context: TemplateContext = {
        title: dateStr,
        date: localDate,
        folder: dailyNoteFolder,
      };

      // Process the template
      const processedContent = await templateManager.processTemplate(
        templateName,
        context,
      );

      if (processedContent) {
        // Parse the processed template to extract frontmatter and content
        const parsed = matter(processedContent);

        // Create the note with the processed template
        return createNote(
          dateStr,
          parsed.data as YAMLFrontmatter,
          parsed.content,
          dailyNoteFolder,
        );
      }
    }

    // Fallback to minimal template if no template found or processing failed
    const dateDisplay = format(localDate, "MMMM dd, yyyy");
    const frontmatter: YAMLFrontmatter = {
      aliases: [dateDisplay],
      "content type": ["Daily Note"], // Use array format to match user's template
      tags: ["dailyNote"],
    };

    const content = `# Day's Notes\n\n\n\n\n# Linked Notes\n\n# Notes Created On This Day\n\n`;

    return createNote(dateStr, frontmatter, content, dailyNoteFolder);
  } catch (error) {
    // If async operations fail, use synchronous fallback
    const dateDisplay = format(localDate, "MMMM dd, yyyy");
    const frontmatter: YAMLFrontmatter = {
      aliases: [dateDisplay],
      "content type": ["Daily Note"],
      tags: ["dailyNote"],
    };

    const content = `# Day's Notes\n\n\n\n\n# Linked Notes\n\n# Notes Created On This Day\n\n`;

    return createNote(
      dateStr,
      frontmatter,
      content,
      LIFEOS_CONFIG.dailyNotesPath,
    );
  }
}
