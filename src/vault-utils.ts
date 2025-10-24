import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  renameSync,
  mkdirSync,
  rmSync,
} from "fs";
import { join, dirname, basename, extname } from "path";
import matter from "gray-matter";
import { glob } from "glob";
import { format } from "date-fns";
import {
  LifeOSNote,
  YAMLFrontmatter,
  SearchOptions,
  NoteTemplate,
} from "./types.js";
import { LIFEOS_CONFIG, YAML_RULES } from "./config.js";
import { TemplateManager } from "./template-manager.js";
import { ObsidianSettings } from "./obsidian-settings.js";
import { DateResolver } from "./date-resolver.js";
import { TemplateContext } from "./template-parser.js";
import { logger } from "./logger.js";

// iCloud sync retry configuration
const ICLOUD_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 200,
  maxDelayMs: 2000,
  retryableErrors: ["EBUSY", "ENOENT", "EPERM", "EMFILE", "ENFILE"],
};

export class VaultUtils {
  private static templateManager: TemplateManager | null = null;
  private static obsidianSettings: ObsidianSettings | null = null;
  private static dateResolver: DateResolver | null = null;

  /**
   * Get singleton instances of our services
   */
  private static getTemplateManager(): TemplateManager {
    if (!this.templateManager) {
      this.templateManager = new TemplateManager(LIFEOS_CONFIG.vaultPath);
    }
    return this.templateManager;
  }

  private static getObsidianSettings(): ObsidianSettings {
    if (!this.obsidianSettings) {
      this.obsidianSettings = new ObsidianSettings(LIFEOS_CONFIG.vaultPath);
    }
    return this.obsidianSettings;
  }

  private static getDateResolver(): DateResolver {
    if (!this.dateResolver) {
      this.dateResolver = new DateResolver();
    }
    return this.dateResolver;
  }

  /**
   * Reset all singleton instances - for testing purposes only
   * This ensures that when config changes, the singletons are recreated
   * with the new config values
   */
  static resetSingletons(): void {
    this.templateManager = null;
    this.obsidianSettings = null;
    this.dateResolver = null;
  }

  /**
   * Get the current local date at midnight (start of day).
   * This ensures consistent date handling regardless of timezone.
   */
  static getLocalDate(dateInput?: Date | string): Date {
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
   * Normalize a file path by handling escaped spaces and resolving relative paths
   * @param path - The path to normalize (can be relative or absolute)
   * @returns Absolute path with escaped spaces handled
   */
  static normalizePath(path: string): string {
    // Handle escaped spaces
    let normalizedPath = path.replace(/\\ /g, ' ');

    // Resolve relative paths to absolute paths
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = `${LIFEOS_CONFIG.vaultPath}/${normalizedPath}`;
    }

    return normalizedPath;
  }

  /**
   * Find a note by title using search
   * @param title - The title to search for
   * @returns The path of the found note
   * @throws Error if no note found with the given title
   */
  static async findNoteByTitle(title: string): Promise<string> {
    // Import SearchEngine dynamically to avoid circular dependency
    const { SearchEngine } = await import('./search-engine.js');

    const searchResults = await SearchEngine.quickSearch(title, 1);

    if (searchResults.length === 0) {
      throw new Error(`No note found with title: ${title}`);
    }

    return searchResults[0].note.path;
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is retryable (likely due to iCloud sync conflicts)
   */
  private static isRetryableError(error: any): boolean {
    if (!error || typeof error.code !== "string") return false;
    return ICLOUD_RETRY_CONFIG.retryableErrors.includes(error.code);
  }

  /**
   * Calculate exponential backoff delay
   */
  private static calculateBackoffDelay(attempt: number): number {
    const delay = ICLOUD_RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
    return Math.min(delay, ICLOUD_RETRY_CONFIG.maxDelayMs);
  }

  /**
   * Read file with iCloud sync retry logic
   */
  static readFileWithRetry(
    filePath: string,
    encoding: BufferEncoding = "utf-8",
  ): string {
    let lastError: any;

    for (
      let attempt = 0;
      attempt <= ICLOUD_RETRY_CONFIG.maxRetries;
      attempt++
    ) {
      try {
        return readFileSync(filePath, encoding);
      } catch (error: any) {
        lastError = error;

        // Don't retry if it's not a retryable error
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Don't sleep on the last attempt
        if (attempt < ICLOUD_RETRY_CONFIG.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          // Use synchronous sleep approximation for simplicity
          const start = Date.now();
          while (Date.now() - start < delay) {
            // Busy wait - not ideal but works for short delays
          }
        }
      }
    }

    // If all retries failed, throw the last error
    throw new Error(
      `Failed to read file after ${ICLOUD_RETRY_CONFIG.maxRetries} retries: ${lastError.message}`,
    );
  }

  /**
   * Write file with iCloud sync retry logic
   */
  static writeFileWithRetry(
    filePath: string,
    content: string,
    encoding: BufferEncoding = "utf-8",
  ): void {
    let lastError: any;

    for (
      let attempt = 0;
      attempt <= ICLOUD_RETRY_CONFIG.maxRetries;
      attempt++
    ) {
      try {
        writeFileSync(filePath, content, encoding);
        return; // Success
      } catch (error: any) {
        lastError = error;

        // Don't retry if it's not a retryable error
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Don't sleep on the last attempt
        if (attempt < ICLOUD_RETRY_CONFIG.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          // Use synchronous sleep approximation for simplicity
          const start = Date.now();
          while (Date.now() - start < delay) {
            // Busy wait - not ideal but works for short delays
          }
        }
      }
    }

    // If all retries failed, throw the last error
    throw new Error(
      `Failed to write file after ${ICLOUD_RETRY_CONFIG.maxRetries} retries: ${lastError.message}`,
    );
  }

  static async findNotes(pattern: string = "**/*.md"): Promise<string[]> {
    const searchPath = join(LIFEOS_CONFIG.vaultPath, pattern);
    return await glob(searchPath, {
      ignore: ["**/node_modules/**", "**/.*"],
    });
  }

  static readNote(filePath: string): LifeOSNote {
    // Normalize the path to handle spaces and special characters
    const normalizedPath = filePath.replace(/\\ /g, " ");

    if (!existsSync(normalizedPath)) {
      const fileName = basename(normalizedPath, '.md');
      throw new Error(
        `Note not found: ${normalizedPath}. ` +
        `Run search(query='${fileName}') to find similar notes.`
      );
    }

    try {
      const content = this.readFileWithRetry(normalizedPath, "utf-8");
      let parsed;

      try {
        parsed = matter(content);
      } catch (yamlError) {
        // Attempt graceful recovery for malformed YAML
        parsed = this.parseWithFallback(content);
      }

      const stats = statSync(normalizedPath);

      return {
        path: normalizedPath,
        frontmatter: parsed.data as YAMLFrontmatter,
        content: parsed.content,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      console.error(`Error parsing note ${normalizedPath}:`, error);
      // Return note with empty frontmatter if parsing fails
      const content = this.readFileWithRetry(normalizedPath, "utf-8");
      const stats = statSync(normalizedPath);

      return {
        path: normalizedPath,
        frontmatter: { title: basename(normalizedPath, ".md") },
        content: content,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    }
  }

  static writeNote(note: LifeOSNote): void {
    // Validate YAML compliance before writing
    this.validateYAML(note.frontmatter);

    const frontmatterToWrite = { ...note.frontmatter };

    // Remove auto-managed fields if they exist
    YAML_RULES.AUTO_MANAGED_FIELDS.forEach((field) => {
      delete frontmatterToWrite[field];
    });

    const fileContent = matter.stringify(note.content, frontmatterToWrite);
    this.writeFileWithRetry(note.path, fileContent, "utf-8");
  }

  static createNote(
    fileName: string,
    frontmatter: YAMLFrontmatter,
    content: string = "",
    targetFolder?: string,
  ): LifeOSNote {
    let folderPath: string;

    if (targetFolder) {
      folderPath = join(LIFEOS_CONFIG.vaultPath, targetFolder);
    } else {
      // Determine folder based on content type
      folderPath = this.determineFolderFromContentType(
        frontmatter["content type"],
      );
    }

    if (!existsSync(folderPath)) {
      throw new Error(`Target folder does not exist: ${folderPath}`);
    }

    const filePath = join(folderPath, `${fileName}.md`);

    if (existsSync(filePath)) {
      throw new Error(`Note already exists: ${filePath}`);
    }

    const note: LifeOSNote = {
      path: filePath,
      frontmatter: this.sanitizeFrontmatter(frontmatter),
      content,
      created: new Date(),
      modified: new Date(),
    };

    this.writeNote(note);
    return note;
  }

  static updateNote(
    filePath: string,
    updates: {
      frontmatter?: Partial<YAMLFrontmatter>;
      content?: string;
      mode?: "replace" | "merge";
    },
  ): LifeOSNote {
    // Check if note exists
    if (!existsSync(filePath)) {
      const fileName = basename(filePath, '.md');
      throw new Error(
        `Note not found: ${filePath}. ` +
        `Run search(query='${fileName}') to find similar notes.`
      );
    }

    // Read existing note
    const existingNote = this.readNote(filePath);

    // Prepare updated note
    const updatedNote: LifeOSNote = {
      ...existingNote,
      modified: new Date(),
    };

    // Update content if provided
    if (updates.content !== undefined) {
      updatedNote.content = updates.content;
    }

    // Update frontmatter
    if (updates.frontmatter) {
      if (updates.mode === "replace") {
        // Replace mode: completely replace frontmatter (but preserve auto-managed fields)
        const preservedFields: any = {};
        YAML_RULES.AUTO_MANAGED_FIELDS.forEach((field) => {
          if (existingNote.frontmatter[field]) {
            preservedFields[field] = existingNote.frontmatter[field];
          }
        });

        updatedNote.frontmatter = {
          ...this.sanitizeFrontmatter(updates.frontmatter),
          ...preservedFields,
        };
      } else {
        // Merge mode (default): merge with existing frontmatter
        // First, validate only the new fields being added
        this.validateYAML(updates.frontmatter);

        updatedNote.frontmatter = {
          ...existingNote.frontmatter,
          ...updates.frontmatter,
        };

        // Ensure we never modify auto-managed fields
        YAML_RULES.AUTO_MANAGED_FIELDS.forEach((field) => {
          if (existingNote.frontmatter[field]) {
            updatedNote.frontmatter[field] = existingNote.frontmatter[field];
          }
        });
      }
    }

    // Write without re-validating (since we've already validated the changes)
    const frontmatterToWrite = { ...updatedNote.frontmatter };

    // Remove auto-managed fields before writing (they'll be preserved by the linter)
    YAML_RULES.AUTO_MANAGED_FIELDS.forEach((field) => {
      delete frontmatterToWrite[field];
    });

    const fileContent = matter.stringify(
      updatedNote.content,
      frontmatterToWrite,
    );
    this.writeFileWithRetry(updatedNote.path, fileContent, "utf-8");

    return updatedNote;
  }

  /**
   * Find where a section ends (before the next heading of same or higher level)
   */
  private static findSectionEnd(
    lines: string[],
    headingIndex: number,
    headingLevel: number,
  ): number {
    // Start from the line after the heading
    for (let i = headingIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if this is a heading
      const headingMatch = line.match(/^(#{1,6})\s+/);
      if (headingMatch) {
        const nextHeadingLevel = headingMatch[1].length;
        // If we found a heading of same or higher level (fewer #), section ends here
        if (nextHeadingLevel <= headingLevel) {
          // Return the line before this heading, but skip empty lines
          let endIndex = i - 1;
          while (endIndex > headingIndex && lines[endIndex].trim() === "") {
            endIndex--;
          }
          return endIndex;
        }
      }
    }

    // If no next heading found, section goes to end of file
    // Skip trailing empty lines
    let endIndex = lines.length - 1;
    while (endIndex > headingIndex && lines[endIndex].trim() === "") {
      endIndex--;
    }
    return endIndex;
  }

  /**
   * Detect if content appears to be a list item
   */
  private static isListItem(content: string): boolean {
    const trimmed = content.trim();
    // Check for unordered list markers (-, *, +)
    if (/^[-*+]\s+/.test(trimmed)) return true;
    // Check for ordered list markers (1., 2., etc.)
    if (/^\d+\.\s+/.test(trimmed)) return true;
    // Check for task list markers
    if (/^[-*+]\s+\[[ x]\]/i.test(trimmed)) return true;
    return false;
  }

  /**
   * Check if content is a task (checkbox list item)
   */
  private static isTask(content: string): boolean {
    const trimmed = content.trim();
    return /^[-*+]\s+\[[ x]\]/i.test(trimmed);
  }

  /**
   * Format a task with Obsidian Tasks Plugin notation
   * Adds creation date (➕ YYYY-MM-DD) if not already present
   * Maintains proper property order: ➕ created 🛫 start ⏳ scheduled 📅 due 🔁 recurrence
   */
  private static formatTaskWithCreationDate(content: string): string {
    // Check if it's a task
    if (!this.isTask(content)) {
      return content;
    }

    // Check if it already has a creation date (➕ symbol)
    if (content.includes("➕")) {
      return content;
    }

    // Get today's date in YYYY-MM-DD format
    const today = format(new Date(), "yyyy-MM-dd");
    const creationDate = `➕ ${today}`;

    // Parse existing properties to maintain order
    const trimmed = content.trim();

    // Define property order and their emojis
    const propertyOrder = ["➕", "🛫", "⏳", "📅", "🔁"];

    // Extract task text and existing properties
    let taskText = trimmed;
    const properties: { [key: string]: string } = {};

    // Find all existing properties
    propertyOrder.forEach((emoji) => {
      if (emoji === "➕") return; // Skip creation date as we're adding it

      const regex = new RegExp(`${emoji}\\s+[^\\s]+(?:\\s+[^\\s]+)*`);
      const match = taskText.match(regex);
      if (match) {
        properties[emoji] = match[0];
        taskText = taskText.replace(match[0], "").trim();
      }
    });

    // Add creation date to properties
    properties["➕"] = creationDate;

    // Rebuild task with properties in correct order
    let formattedTask = taskText;
    propertyOrder.forEach((emoji) => {
      if (properties[emoji]) {
        formattedTask += ` ${properties[emoji]}`;
      }
    });

    return formattedTask;
  }

  /**
   * Find the last item in a list starting from a given line
   */
  private static findLastListItem(lines: string[], startIndex: number): number {
    let lastListIndex = startIndex;

    // Skip empty lines after the starting point
    let i = startIndex + 1;
    while (i < lines.length && lines[i].trim() === "") {
      i++;
    }

    // Continue while we find list items
    while (i < lines.length) {
      const line = lines[i].trim();
      if (line === "") {
        // Empty line might be within the list, check next non-empty line
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === "") {
          j++;
        }
        if (j < lines.length && this.isListItem(lines[j])) {
          // Continue through the empty lines
          i = j;
          lastListIndex = j;
        } else {
          // Double empty line or non-list content, list ends
          break;
        }
      } else if (this.isListItem(line)) {
        lastListIndex = i;
        i++;
      } else {
        // Non-list content, list ends
        break;
      }
    }

    return lastListIndex;
  }

  static insertContent(
    filePath: string,
    content: string,
    target: {
      heading?: string;
      blockRef?: string;
      pattern?: string;
      lineNumber?: number;
    },
    position:
      | "before"
      | "after"
      | "append"
      | "prepend"
      | "end-of-section" = "after",
    ensureNewline: boolean = true,
  ): LifeOSNote {
    // Check if note exists
    if (!existsSync(filePath)) {
      const fileName = basename(filePath, '.md');
      throw new Error(
        `Note not found: ${filePath}. ` +
        `Run search(query='${fileName}') to find similar notes.`
      );
    }

    // Read existing note
    const existingNote = this.readNote(filePath);
    const lines = existingNote.content.split("\n");

    // Find target line index
    let targetLineIndex = -1;
    let endOfSectionIndex = -1;

    if (target.lineNumber) {
      // Direct line number (convert from 1-based to 0-based)
      targetLineIndex = target.lineNumber - 1;
      if (targetLineIndex < 0 || targetLineIndex >= lines.length) {
        throw new Error(
          `Line number ${target.lineNumber} is out of range (1-${lines.length})`,
        );
      }
    } else if (target.heading) {
      // Find heading - exact match (ignore leading/trailing whitespace)
      const headingToFind = target.heading.trim();
      logger.info(`[insertContent] Looking for heading: "${headingToFind}"`);

      targetLineIndex = lines.findIndex((line, index) => {
        const trimmedLine = line.trim();
        // Match markdown headings (# to ######)
        if (/^#{1,6}\s+/.test(trimmedLine)) {
          const headingText = trimmedLine.replace(/^#{1,6}\s+/, "").trim();
          const targetHeadingText = headingToFind
            .replace(/^#{1,6}\s+/, "")
            .trim();

          if (headingText === targetHeadingText) {
            logger.info(
              `[insertContent] Found heading "${headingText}" at line ${index + 1}`,
            );
            return true;
          }
        }
        return false;
      });

      if (targetLineIndex === -1) {
        // Log available headings for debugging
        const availableHeadings = lines
          .map((line, idx) => ({ line, idx }))
          .filter(({ line }) => /^#{1,6}\s+/.test(line.trim()))
          .map(({ line, idx }) => {
            const headingText = line.trim().replace(/^#{1,6}\s+/, "");
            return { line: idx + 1, text: headingText, full: line.trim() };
          });

        logger.error(`[insertContent] Heading not found: "${target.heading}"`);
        logger.error(`[insertContent] Available headings in file:`);
        availableHeadings.forEach((h) => {
          logger.error(`  Line ${h.line}: "${h.full}"`);
        });

        // Check for common variations and provide suggestions
        const targetText = headingToFind
          .replace(/^#{1,6}\s+/, "")
          .toLowerCase();
        const suggestions = availableHeadings.filter((h) => {
          const headingLower = h.text.toLowerCase();
          return (
            headingLower.includes(targetText) ||
            targetText.includes(headingLower) ||
            // Check for common variations
            (targetText === "day's notes" && headingLower === "days notes") ||
            (targetText === "days notes" && headingLower === "day's notes") ||
            // Levenshtein distance would be better, but this is simpler
            Math.abs(headingLower.length - targetText.length) <= 2
          );
        });

        let errorMsg = `Heading not found: ${target.heading}`;
        if (suggestions.length > 0) {
          errorMsg += `\n\nDid you mean one of these?\n${suggestions.map((s) => `  - "${s.text}"`).join("\n")}`;
        }

        throw new Error(errorMsg);
      }

      // For end-of-section, find where this section ends
      if (position === "end-of-section") {
        const headingLevel =
          lines[targetLineIndex].match(/^#+/)?.[0].length || 1;
        endOfSectionIndex = this.findSectionEnd(
          lines,
          targetLineIndex,
          headingLevel,
        );
      }
    } else if (target.blockRef) {
      // Find block reference - look for ^blockId at end of lines
      const blockId = target.blockRef.startsWith("^")
        ? target.blockRef
        : `^${target.blockRef}`;
      targetLineIndex = lines.findIndex((line) =>
        line.trim().endsWith(blockId),
      );

      if (targetLineIndex === -1) {
        throw new Error(`Block reference not found: ${target.blockRef}`);
      }
    } else if (target.pattern) {
      // Find text pattern
      targetLineIndex = lines.findIndex((line) =>
        line.includes(target.pattern!),
      );

      if (targetLineIndex === -1) {
        throw new Error(`Pattern not found: ${target.pattern}`);
      }
    } else {
      throw new Error("No valid target specified");
    }

    // Handle end-of-section positioning
    let actualPosition = position;
    if (position === "end-of-section") {
      // end-of-section only makes sense for heading targets
      if (!target.heading) {
        // For non-heading targets, convert to 'after' for simplicity and clarity
        actualPosition = "after";
      } else {
        // For heading targets, we should have endOfSectionIndex set
        if (endOfSectionIndex === -1) {
          throw new Error(
            `Cannot find section end for heading target. Target: ${JSON.stringify(target)}, targetLineIndex: ${targetLineIndex}`,
          );
        }

        // Validate endOfSectionIndex is within bounds
        if (endOfSectionIndex >= lines.length) {
          endOfSectionIndex = lines.length - 1;
        }
        if (endOfSectionIndex < targetLineIndex) {
          endOfSectionIndex = targetLineIndex;
        }

        // Check if we're inserting into a list context
        const isInsertingListItem = this.isListItem(content);

        // Look for existing list in the section
        let insertIndex = endOfSectionIndex;
        if (isInsertingListItem) {
          // Find the last list item in the section
          for (
            let i = targetLineIndex + 1;
            i <= endOfSectionIndex && i < lines.length;
            i++
          ) {
            if (this.isListItem(lines[i])) {
              insertIndex = this.findLastListItem(lines, i);
              break;
            }
          }
        }

        // Validate insertIndex
        if (insertIndex >= lines.length) {
          insertIndex = lines.length - 1;
        }
        if (insertIndex < 0) {
          insertIndex = 0;
        }

        // Update target for insertion
        targetLineIndex = insertIndex;
        actualPosition = "after"; // Treat as 'after' the last relevant line
      }
    }

    // Prepare content to insert
    let contentToInsert = content;

    // Format tasks with creation date if applicable
    const contentLines = contentToInsert.split("\n");
    const formattedLines = contentLines.map((line) =>
      this.formatTaskWithCreationDate(line),
    );
    contentToInsert = formattedLines.join("\n");

    // Smart spacing for list continuation
    if (actualPosition === "after" && targetLineIndex >= 0) {
      const targetLine = lines[targetLineIndex];
      const isTargetList = this.isListItem(targetLine);
      const isContentList = this.isListItem(content);

      // If both target and content are list items, minimal spacing
      if (isTargetList && isContentList) {
        ensureNewline = false; // Override to prevent extra spacing
      }
    }

    if (
      ensureNewline &&
      (actualPosition === "before" || actualPosition === "after")
    ) {
      // Smart newline handling - check context
      if (actualPosition === "after") {
        // Check if there's already a blank line after the target
        const hasBlankLineAfter =
          targetLineIndex < lines.length - 1 &&
          lines[targetLineIndex + 1].trim() === "";

        // Add leading newline only if content doesn't start with one
        if (!contentToInsert.startsWith("\n")) {
          contentToInsert = "\n" + contentToInsert;
        }

        // Add trailing newline only if there isn't already a blank line and content doesn't end with newline
        if (!hasBlankLineAfter && !contentToInsert.endsWith("\n")) {
          contentToInsert = contentToInsert + "\n";
        }
      } else if (actualPosition === "before") {
        // Check if there's already a blank line before the target
        const hasBlankLineBefore =
          targetLineIndex > 0 && lines[targetLineIndex - 1].trim() === "";

        // Add leading newline only if there isn't already a blank line and content doesn't start with newline
        if (!hasBlankLineBefore && !contentToInsert.startsWith("\n")) {
          contentToInsert = "\n" + contentToInsert;
        }

        // Add trailing newline only if content doesn't end with one
        if (!contentToInsert.endsWith("\n")) {
          contentToInsert = contentToInsert + "\n";
        }
      }
    }

    // Insert content based on position
    let newLines: string[] = [];

    // Validate targetLineIndex
    if (targetLineIndex < 0 || targetLineIndex >= lines.length) {
      throw new Error(
        `Invalid targetLineIndex: ${targetLineIndex}, lines.length: ${lines.length}, position: ${position}, actualPosition: ${actualPosition}`,
      );
    }

    switch (actualPosition) {
      case "before":
        newLines = [
          ...lines.slice(0, targetLineIndex),
          ...contentToInsert.split("\n"),
          ...lines.slice(targetLineIndex),
        ];
        break;

      case "after":
        newLines = [
          ...lines.slice(0, targetLineIndex + 1),
          ...contentToInsert.split("\n"),
          ...lines.slice(targetLineIndex + 1),
        ];
        break;

      case "prepend":
        // Prepend to the beginning of the target line
        newLines = [...lines];
        newLines[targetLineIndex] = contentToInsert + lines[targetLineIndex];
        break;

      case "append":
        // Append to the end of the target line
        newLines = [...lines];
        newLines[targetLineIndex] = lines[targetLineIndex] + contentToInsert;
        break;

      case "end-of-section":
        // This should never happen as we convert to 'after' above
        throw new Error("end-of-section should have been converted to after");

      default:
        throw new Error(`Invalid position: ${actualPosition}`);
    }

    // Update the note with new content
    // Validate newLines before proceeding
    if (!newLines || !Array.isArray(newLines)) {
      throw new Error(
        `Failed to generate new content. Position: ${position}, actualPosition: ${actualPosition}, targetLineIndex: ${targetLineIndex}, newLines: ${typeof newLines}`,
      );
    }

    // Validate all elements in the array are strings
    if (!newLines.every((line) => typeof line === "string")) {
      throw new Error(
        `newLines contains non-string elements. Elements: ${newLines.map((line) => typeof line).join(", ")}`,
      );
    }

    // Clone the array to prevent race conditions in concurrent calls
    const safeLines = [...newLines];

    // Additional validation of safeLines
    if (!safeLines || !Array.isArray(safeLines)) {
      throw new Error(
        `Array cloning failed. safeLines: ${typeof safeLines}, newLines: ${typeof newLines}`,
      );
    }

    // Final validation before join operation
    if (safeLines.length === 0) {
      throw new Error(
        `Empty array after processing. Original newLines length: ${newLines.length}`,
      );
    }

    // Defensive check: ensure all elements are still strings after cloning
    if (!safeLines.every((line) => typeof line === "string")) {
      throw new Error(
        `safeLines contains non-string elements after cloning. Elements: ${safeLines.map((line) => typeof line).join(", ")}`,
      );
    }

    const contentToWrite = safeLines.join("\n");

    return this.updateNote(filePath, {
      content: contentToWrite,
    });
  }

  static searchNotes(options: SearchOptions): LifeOSNote[] {
    const allNotes = this.getAllNotes();

    return allNotes.filter((note) => {
      if (options.contentType) {
        const noteContentType = note.frontmatter["content type"];
        if (Array.isArray(options.contentType)) {
          if (
            !options.contentType.some((ct) =>
              this.matchesContentType(noteContentType, ct),
            )
          ) {
            return false;
          }
        } else {
          if (!this.matchesContentType(noteContentType, options.contentType)) {
            return false;
          }
        }
      }

      if (options.category && note.frontmatter.category !== options.category) {
        return false;
      }

      if (
        options.tags &&
        !this.hasAnyTag(note.frontmatter.tags, options.tags)
      ) {
        return false;
      }

      if (options.folder && !note.path.includes(options.folder)) {
        return false;
      }

      if (options.dateRange) {
        if (options.dateRange.start && note.created < options.dateRange.start) {
          return false;
        }
        if (options.dateRange.end && note.created > options.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  static async getDailyNote(date: Date): Promise<LifeOSNote | null> {
    // Ensure we're working with local date at start of day
    const localDate = this.getLocalDate(date);
    const dateStr = format(localDate, "yyyy-MM-dd");
    const fileName = `${dateStr}.md`;
    const filePath = join(LIFEOS_CONFIG.dailyNotesPath, fileName);

    // Looking for daily note

    if (existsSync(filePath)) {
      // Found daily note
      return this.readNote(filePath);
    } else {
      // Daily note not found - this is normal, return null
    }

    return null;
  }

  /**
   * Graceful fallback parser for malformed YAML frontmatter
   * Attempts to extract basic metadata even from broken YAML
   */
  private static parseWithFallback(content: string): {
    data: any;
    content: string;
  } {
    // Default fallback values
    const fallbackData: any = {
      title: "Untitled",
      "content type": "Note",
      tags: [],
    };

    // Try to find frontmatter boundaries
    const frontmatterMatch = content.match(
      /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/,
    );

    if (!frontmatterMatch) {
      // No frontmatter found - extract title from first heading or filename
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        fallbackData.title = titleMatch[1].trim();
      }
      return {
        data: fallbackData,
        content: content,
      };
    }

    const [, frontmatterText, bodyContent] = frontmatterMatch;

    // Simple line-by-line parsing to extract what we can
    const lines = frontmatterText.split("\n");

    for (const line of lines) {
      try {
        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith("#")) continue;

        // Simple key-value extraction
        const keyValueMatch = line.match(/^(\s*)([^:]+):\s*(.*)$/);
        if (keyValueMatch) {
          const [, indent, key, value] = keyValueMatch;
          const cleanKey = key.trim();
          let cleanValue = value.trim();

          // Skip overly complex values (likely Templater code)
          if (cleanValue.includes("<%") || cleanValue.includes("%>")) {
            continue;
          }

          // Handle quoted strings
          if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
            cleanValue = cleanValue.slice(1, -1);
          } else if (cleanValue.startsWith("'") && cleanValue.endsWith("'")) {
            cleanValue = cleanValue.slice(1, -1);
          }

          // Handle simple arrays
          if (cleanValue.startsWith("[") && cleanValue.endsWith("]")) {
            try {
              cleanValue = JSON.parse(cleanValue);
            } catch {
              // If JSON parsing fails, treat as string
            }
          }

          fallbackData[cleanKey] = cleanValue;
        }
      } catch (lineError) {
        // Skip problematic lines silently
        continue;
      }
    }

    // Ensure we have at least a title
    if (!fallbackData.title || fallbackData.title === "Untitled") {
      // Try to extract from first heading in content
      const titleMatch = bodyContent.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        fallbackData.title = titleMatch[1].trim();
      }
    }

    return {
      data: fallbackData,
      content: bodyContent,
    };
  }

  static async createDailyNote(date: Date): Promise<LifeOSNote> {
    // Ensure we're working with local date at start of day
    const localDate = this.getLocalDate(date);
    const dateStr = format(localDate, "yyyy-MM-dd");

    try {
      // Get the template manager
      const templateManager = this.getTemplateManager();

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
          return this.createNote(
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

      return this.createNote(dateStr, frontmatter, content, dailyNoteFolder);
    } catch (error) {
      // If async operations fail, use synchronous fallback
      const dateDisplay = format(localDate, "MMMM dd, yyyy");
      const frontmatter: YAMLFrontmatter = {
        aliases: [dateDisplay],
        "content type": ["Daily Note"],
        tags: ["dailyNote"],
      };

      const content = `# Day's Notes\n\n\n\n\n# Linked Notes\n\n# Notes Created On This Day\n\n`;

      return this.createNote(
        dateStr,
        frontmatter,
        content,
        LIFEOS_CONFIG.dailyNotesPath,
      );
    }
  }

  private static getAllNotes(): LifeOSNote[] {
    const pattern = join(LIFEOS_CONFIG.vaultPath, "**/*.md");
    const files = glob.sync(pattern, {
      ignore: ["**/node_modules/**", "**/.*"],
    });

    return files.map((file) => this.readNote(file));
  }

  private static matchesContentType(
    noteType: string | string[] | undefined,
    searchType: string,
  ): boolean {
    if (!noteType) return false;

    if (Array.isArray(noteType)) {
      return noteType.includes(searchType);
    }

    return noteType === searchType;
  }

  private static hasAnyTag(
    noteTags: string[] | undefined,
    searchTags: string[],
  ): boolean {
    if (!noteTags || !Array.isArray(noteTags)) return false;
    return searchTags.some((tag) => noteTags.includes(tag));
  }

  static normalizeTagsToArray(tags: any): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === "string") return [tags];
    return [];
  }

  private static validateYAML(frontmatter: YAMLFrontmatter): void {
    // Check for forbidden fields
    YAML_RULES.AUTO_MANAGED_FIELDS.forEach((field) => {
      if (frontmatter[field]) {
        throw new Error(
          `Cannot set auto-managed field '${field}'. ` +
          `Run get_yaml_rules() to see which fields are auto-managed.`
        );
      }
    });

    // Validate URL field naming
    if (frontmatter.url || frontmatter.URL) {
      throw new Error(
        `Invalid YAML field 'url' or 'URL': Use '${YAML_RULES.URL_FIELD}' instead. ` +
        `Run get_yaml_rules() to see expected format and valid fields.`
      );
    }

    // Validate location format
    if (frontmatter.country) {
      const validCountries = Object.values(YAML_RULES.LOCATION_FORMAT);
      if (!validCountries.includes(frontmatter.country)) {
        throw new Error(
          `Country must be in format: ${validCountries.join(" or ")}`,
        );
      }
    }
  }

  private static sanitizeFrontmatter(
    frontmatter: YAMLFrontmatter,
  ): YAMLFrontmatter {
    const sanitized = { ...frontmatter };

    // Remove auto-managed fields
    YAML_RULES.AUTO_MANAGED_FIELDS.forEach((field) => {
      delete sanitized[field];
    });

    // Fix common issues
    if (sanitized.url) {
      sanitized.source = sanitized.url;
      delete sanitized.url;
    }

    if (sanitized.URL) {
      sanitized.source = sanitized.URL;
      delete sanitized.URL;
    }

    return sanitized;
  }

  private static determineFolderFromContentType(
    contentType: string | string[] | undefined,
  ): string {
    if (!contentType) {
      return join(LIFEOS_CONFIG.vaultPath, "05 - Fleeting Notes");
    }

    const type = Array.isArray(contentType) ? contentType[0] : contentType;

    switch (type) {
      case "Daily Note":
        return join(
          LIFEOS_CONFIG.vaultPath,
          "20 - Areas/21 - Myself/Journals/Daily",
        );
      case "Article":
      case "Reference":
        return join(LIFEOS_CONFIG.vaultPath, "30 - Resources");
      case "Recipe":
        return join(LIFEOS_CONFIG.vaultPath, "30 - Resources");
      case "Medical":
        return join(LIFEOS_CONFIG.vaultPath, "20 - Areas/23 - Health");
      case "Planning":
        return join(LIFEOS_CONFIG.vaultPath, "10 - Projects");
      default:
        return join(LIFEOS_CONFIG.vaultPath, "05 - Fleeting Notes");
    }
  }

  static moveItem(
    sourcePath: string,
    destinationFolder: string,
    options: {
      createDestination?: boolean;
      overwrite?: boolean;
      mergeFolders?: boolean;
    } = {},
  ): { success: boolean; newPath: string; error?: string } {
    // Normalize paths
    const normalizedSource = sourcePath.startsWith(LIFEOS_CONFIG.vaultPath)
      ? sourcePath
      : join(LIFEOS_CONFIG.vaultPath, sourcePath);
    const normalizedDest = destinationFolder.startsWith(LIFEOS_CONFIG.vaultPath)
      ? destinationFolder
      : join(LIFEOS_CONFIG.vaultPath, destinationFolder);

    // Validate source exists
    if (!existsSync(normalizedSource)) {
      return { success: false, newPath: "", error: "Source item not found" };
    }

    // Check if source is file or folder
    const isDirectory = statSync(normalizedSource).isDirectory();

    // Prevent moving folder into itself or its subdirectories
    if (isDirectory && normalizedDest.startsWith(normalizedSource)) {
      return {
        success: false,
        newPath: "",
        error: "Cannot move folder into itself or its subdirectories",
      };
    }

    // Create destination if needed
    if (!existsSync(normalizedDest)) {
      if (options.createDestination) {
        mkdirSync(normalizedDest, { recursive: true });
      } else {
        return {
          success: false,
          newPath: "",
          error: "Destination folder does not exist",
        };
      }
    }

    // Ensure destination is a directory
    if (!statSync(normalizedDest).isDirectory()) {
      return {
        success: false,
        newPath: "",
        error: "Destination must be a folder",
      };
    }

    const itemName = basename(normalizedSource);
    const newPath = join(normalizedDest, itemName);

    // Handle existing items
    if (existsSync(newPath)) {
      if (isDirectory && options.mergeFolders) {
        // Merge folder contents
        return this.mergeFolders(normalizedSource, newPath);
      } else if (!options.overwrite) {
        return {
          success: false,
          newPath: "",
          error: "Item already exists in destination",
        };
      } else if (!isDirectory) {
        // For files with overwrite=true, remove the existing file first
        rmSync(newPath);
      } else {
        // For directories with overwrite=true but mergeFolders=false, remove existing directory
        rmSync(newPath, { recursive: true });
      }
    }

    try {
      renameSync(normalizedSource, newPath);
      return { success: true, newPath };
    } catch (error) {
      return { success: false, newPath: "", error: String(error) };
    }
  }

  private static mergeFolders(
    source: string,
    destination: string,
  ): { success: boolean; newPath: string; error?: string } {
    try {
      const items = readdirSync(source, { withFileTypes: true });

      for (const item of items) {
        const sourcePath = join(source, item.name);
        const destPath = join(destination, item.name);

        if (item.isDirectory()) {
          if (existsSync(destPath)) {
            // Recursively merge subdirectories
            const result = this.mergeFolders(sourcePath, destPath);
            if (!result.success) {
              return result;
            }
          } else {
            // Move the subdirectory
            renameSync(sourcePath, destPath);
          }
        } else {
          // Move the file (overwriting if exists)
          if (existsSync(destPath)) {
            rmSync(destPath);
          }
          renameSync(sourcePath, destPath);
        }
      }

      // Remove the now-empty source directory
      rmSync(source, { recursive: true });
      return { success: true, newPath: destination };
    } catch (error) {
      return {
        success: false,
        newPath: "",
        error: `Failed to merge folders: ${String(error)}`,
      };
    }
  }

  /**
   * Get all unique values for a specific YAML property across the vault
   */
  static getYamlPropertyValues(
    property: string,
    options?: {
      includeCount?: boolean;
      includeExamples?: boolean;
      sortBy?: "alphabetical" | "usage" | "type";
      maxExamples?: number;
    },
  ): {
    property: string;
    totalNotes: number;
    values: {
      single: any[];
      array: any[][];
      uniqueValues: any[];
    };
    valueCounts?: Record<string, number>;
    valueExamples?: Record<string, string[]>;
    scannedFiles: number;
    skippedFiles: number;
  } {
    const {
      includeCount = false,
      includeExamples = false,
      sortBy = "alphabetical",
      maxExamples = 3,
    } = options || {};

    const singleValues: any[] = [];
    const arrayValues: any[][] = [];
    const uniqueValuesSet = new Set<string>();
    const valueCounts: Record<string, number> = {};
    const valueExamples: Record<string, string[]> = {};
    const singleValueNotes: Map<any, string[]> = new Map();
    const arrayValueNotes: Map<string, string[]> = new Map();
    let totalNotes = 0;
    let scannedFiles = 0;
    let skippedFiles = 0;

    try {
      // Find all markdown files
      const files = glob.sync(join(LIFEOS_CONFIG.vaultPath, "**/*.md"), {
        ignore: ["**/node_modules/**", "**/.*"],
      });

      // Process each file
      for (const file of files) {
        scannedFiles++;
        try {
          const content = this.readFileWithRetry(file, "utf-8");
          const { data: frontmatter } = matter(content);

          if (
            frontmatter &&
            typeof frontmatter === "object" &&
            frontmatter.hasOwnProperty(property)
          ) {
            totalNotes++;
            const value = frontmatter[property];
            const noteTitle = frontmatter.title || basename(file, ".md");

            if (Array.isArray(value)) {
              // Handle array values
              arrayValues.push(value);
              const arrayKey = JSON.stringify(value);

              // Track notes for this array value
              if (includeExamples) {
                if (!arrayValueNotes.has(arrayKey)) {
                  arrayValueNotes.set(arrayKey, []);
                }
                const notes = arrayValueNotes.get(arrayKey)!;
                if (notes.length < maxExamples) {
                  notes.push(noteTitle);
                }
              }

              // Add each array element to unique values and count
              value.forEach((item) => {
                if (item !== null && item !== undefined) {
                  const itemStr = String(item);
                  uniqueValuesSet.add(itemStr);
                  if (includeCount) {
                    valueCounts[itemStr] = (valueCounts[itemStr] || 0) + 1;
                  }
                }
              });
            } else {
              // Handle single values
              singleValues.push(value);
              if (value !== null && value !== undefined) {
                const valueStr = String(value);
                uniqueValuesSet.add(valueStr);
                if (includeCount) {
                  valueCounts[valueStr] = (valueCounts[valueStr] || 0) + 1;
                }

                // Track notes for this single value
                if (includeExamples) {
                  if (!singleValueNotes.has(value)) {
                    singleValueNotes.set(value, []);
                  }
                  const notes = singleValueNotes.get(value)!;
                  if (notes.length < maxExamples) {
                    notes.push(noteTitle);
                  }
                }
              }
            }
          }
        } catch (error) {
          // Skip files that can't be parsed (malformed YAML, file access issues, etc.)
          skippedFiles++;
        }
      }

      // Sort values based on options
      let sortedSingleValues = singleValues;
      let sortedArrayValues = arrayValues;
      let sortedUniqueValues = Array.from(uniqueValuesSet);

      if (sortBy === "usage" && includeCount) {
        // Sort by usage count (descending)
        sortedUniqueValues.sort(
          (a, b) => (valueCounts[b] || 0) - (valueCounts[a] || 0),
        );

        // Sort single values by their usage count
        const singleValueCounts = new Map<any, number>();
        singleValues.forEach((v) => {
          const key = String(v);
          singleValueCounts.set(v, (singleValueCounts.get(v) || 0) + 1);
        });
        sortedSingleValues = Array.from(new Set(singleValues)).sort((a, b) => {
          const countA = singleValueCounts.get(a) || 0;
          const countB = singleValueCounts.get(b) || 0;
          return countB - countA;
        });

        // Sort array values by their usage count
        const arrayValueCounts = new Map<string, number>();
        arrayValues.forEach((arr) => {
          const key = JSON.stringify(arr);
          arrayValueCounts.set(key, (arrayValueCounts.get(key) || 0) + 1);
        });
        const uniqueArrays = Array.from(
          new Set(arrayValues.map((arr) => JSON.stringify(arr))),
        );
        sortedArrayValues = uniqueArrays
          .sort(
            (a, b) =>
              (arrayValueCounts.get(b) || 0) - (arrayValueCounts.get(a) || 0),
          )
          .map((arrStr) => JSON.parse(arrStr));
      } else if (sortBy === "type") {
        // Sort by type (singles first, then arrays)
        // Already separated by type
      } else {
        // Sort alphabetically
        sortedUniqueValues.sort((a, b) =>
          a.toLowerCase().localeCompare(b.toLowerCase()),
        );
        sortedSingleValues = Array.from(new Set(singleValues)).sort((a, b) =>
          String(a).toLowerCase().localeCompare(String(b).toLowerCase()),
        );
        sortedArrayValues = Array.from(
          new Set(arrayValues.map((arr) => JSON.stringify(arr))),
        )
          .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
          .map((arrStr) => JSON.parse(arrStr));
      }

      // Build examples if requested
      if (includeExamples) {
        // Add examples for single values
        singleValueNotes.forEach((notes, value) => {
          valueExamples[String(value)] = notes;
        });

        // Add examples for array values
        arrayValueNotes.forEach((notes, arrayKey) => {
          valueExamples[arrayKey] = notes;
        });
      }

      const result: any = {
        property,
        totalNotes,
        values: {
          single: sortedSingleValues,
          array: sortedArrayValues,
          uniqueValues: sortedUniqueValues,
        },
        scannedFiles,
        skippedFiles,
      };

      if (includeCount) {
        result.valueCounts = valueCounts;
      }

      if (includeExamples) {
        result.valueExamples = valueExamples;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get YAML property values: ${String(error)}`);
    }
  }

  /**
   * Get all unique YAML properties used across the vault
   */
  static getAllYamlProperties(
    options: {
      includeCount?: boolean;
      excludeStandard?: boolean;
    } = {},
  ): {
    properties: string[];
    counts?: Record<string, number>;
    totalNotes?: number;
    scannedFiles?: number;
    skippedFiles?: number;
  } {
    const { includeCount = false, excludeStandard = false } = options;

    // Standard LifeOS properties to exclude if requested
    const standardProperties = new Set([
      "title",
      "contentType",
      "category",
      "subCategory",
      "tags",
      "created",
      "modified",
      "source",
      "people",
      "author",
      "status",
      "priority",
      "due",
      "completed",
      "project",
      "area",
      "resources",
      "archive",
      "rating",
      "favorite",
      "pinned",
    ]);

    const propertySet = new Set<string>();
    const propertyCounts: Record<string, number> = {};
    let totalNotes = 0;
    let scannedFiles = 0;
    let skippedFiles = 0;

    try {
      // Find all markdown files
      const files = glob.sync(join(LIFEOS_CONFIG.vaultPath, "**/*.md"), {
        ignore: ["**/node_modules/**", "**/.*"],
      });

      // Process each file
      for (const file of files) {
        scannedFiles++;
        try {
          const content = this.readFileWithRetry(file, "utf-8");
          const { data: frontmatter } = matter(content);

          if (frontmatter && typeof frontmatter === "object") {
            totalNotes++;

            // Extract all property names
            for (const prop of Object.keys(frontmatter)) {
              // Skip if excluding standard and this is a standard property
              if (excludeStandard && standardProperties.has(prop)) {
                continue;
              }

              propertySet.add(prop);

              if (includeCount) {
                propertyCounts[prop] = (propertyCounts[prop] || 0) + 1;
              }
            }
          }
        } catch (error) {
          // Skip files that can't be parsed (malformed YAML, file access issues, etc.)
          skippedFiles++;
        }
      }

      const result: {
        properties: string[];
        counts?: Record<string, number>;
        totalNotes?: number;
        scannedFiles?: number;
        skippedFiles?: number;
      } = {
        properties: Array.from(propertySet),
        scannedFiles,
        skippedFiles,
      };

      if (includeCount) {
        result.counts = propertyCounts;
        result.totalNotes = totalNotes;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to get YAML properties: ${String(error)}`);
    }
  }
}
