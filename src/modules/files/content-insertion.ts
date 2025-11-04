/**
 * Content Insertion Operations
 *
 * Extracted from vault-utils.ts (MCP-142)
 * Provides intelligent content insertion with heading, pattern, and list awareness
 */

import { existsSync } from "fs";
import { basename } from "path";
import { format } from "date-fns";
import { readNote, updateNote } from "./note-crud.js";
import { logger } from "../../shared/index.js";
import type { LifeOSNote, YAMLFrontmatter } from "../../shared/index.js";

/**
 * Find where a section ends (next heading of same or higher level)
 * @private
 */
function findSectionEnd(
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
 * @private
 */
function isListItem(content: string): boolean {
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
 * @private
 */
function isTask(content: string): boolean {
  const trimmed = content.trim();
  return /^[-*+]\s+\[[ x]\]/i.test(trimmed);
}

/**
 * Format a task with Obsidian Tasks Plugin notation
 * Adds creation date (➕ YYYY-MM-DD) if not already present
 * Maintains proper property order: ➕ created 🛫 start ⏳ scheduled 📅 due 🔁 recurrence
 * @private
 */
function formatTaskWithCreationDate(content: string): string {
  // Check if it's a task
  if (!isTask(content)) {
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
 * @private
 */
function findLastListItem(lines: string[], startIndex: number): number {
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
      if (j < lines.length && isListItem(lines[j])) {
        // Continue through the empty lines
        i = j;
        lastListIndex = j;
      } else {
        // Double empty line or non-list content, list ends
        break;
      }
    } else if (isListItem(line)) {
      lastListIndex = i;
      i++;
    } else {
      // Non-list content, list ends
      break;
    }
  }

  return lastListIndex;
}

/**
 * Insert content at specific locations within a note
 *
 * Supports insertion based on:
 * - Heading targets (with end-of-section support)
 * - Block references
 * - Text patterns
 * - Line numbers
 *
 * Smart list handling:
 * - Detects list items and inserts at bottom of lists
 * - Formats tasks with creation dates
 * - Maintains proper spacing
 */
export function insertContent(
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
  const existingNote = readNote(filePath);
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
      endOfSectionIndex = findSectionEnd(
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
      const isInsertingListItem = isListItem(content);

      // Look for existing list in the section
      let insertIndex = endOfSectionIndex;
      if (isInsertingListItem) {
        // Find the last list item in the section
        for (
          let i = targetLineIndex + 1;
          i <= endOfSectionIndex && i < lines.length;
          i++
        ) {
          if (isListItem(lines[i])) {
            insertIndex = findLastListItem(lines, i);
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
    formatTaskWithCreationDate(line),
  );
  contentToInsert = formattedLines.join("\n");

  // Smart spacing for list continuation
  if (actualPosition === "after" && targetLineIndex >= 0) {
    const targetLine = lines[targetLineIndex];
    const isTargetList = isListItem(targetLine);
    const isContentList = isListItem(content);

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

  return updateNote(filePath, {
    content: contentToWrite,
  });
}
