/**
 * Note CRUD Operations
 *
 * Extracted from vault-utils.ts (MCP-140)
 * Provides create, read, update operations for Obsidian notes with YAML validation
 */

import { existsSync, statSync } from "fs";
import { basename, join } from "path";
import matter from "gray-matter";
import { readFileWithRetry, writeFileWithRetry } from "./file-io.js";
import { normalizePath } from "../../shared/index.js";
import { LIFEOS_CONFIG, YAML_RULES } from "../../shared/index.js";
import type { LifeOSNote, YAMLFrontmatter } from "../../shared/index.js";

/**
 * Parse note content with fallback for malformed YAML
 * @private
 */
function parseWithFallback(content: string): {
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
        const [, , key, value] = keyValueMatch;
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

/**
 * Validate YAML frontmatter against LifeOS rules
 * @private
 */
function validateYAML(frontmatter: YAMLFrontmatter): void {
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

/**
 * Sanitize frontmatter by removing auto-managed fields and fixing common issues
 * @private
 */
function sanitizeFrontmatter(
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

/**
 * Determine target folder based on content type
 * @private
 */
function determineFolderFromContentType(
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

/**
 * Read a note from the vault
 */
export function readNote(filePath: string): LifeOSNote {
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
    const content = readFileWithRetry(normalizedPath, "utf-8");
    let parsed;

    try {
      parsed = matter(content);
    } catch (yamlError) {
      // Attempt graceful recovery for malformed YAML
      parsed = parseWithFallback(content);
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
    const content = readFileWithRetry(normalizedPath, "utf-8");
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

/**
 * Write a note to the vault with YAML validation
 */
export function writeNote(note: LifeOSNote): void {
  // Validate YAML compliance before writing
  validateYAML(note.frontmatter);

  const frontmatterToWrite = { ...note.frontmatter };

  // Remove auto-managed fields if they exist
  YAML_RULES.AUTO_MANAGED_FIELDS.forEach((field) => {
    delete frontmatterToWrite[field];
  });

  const fileContent = matter.stringify(note.content, frontmatterToWrite);
  writeFileWithRetry(note.path, fileContent, "utf-8");
}

/**
 * Create a new note in the vault
 */
export function createNote(
  fileName: string,
  frontmatter: YAMLFrontmatter,
  content: string = "",
  targetFolder?: string,
): LifeOSNote {
  let folderPath: string;

  if (targetFolder) {
    // Normalize path to handle both absolute paths (from LIFEOS_CONFIG)
    // and relative paths (from user input or template inference)
    folderPath = normalizePath(targetFolder, LIFEOS_CONFIG.vaultPath);
  } else {
    // Determine folder based on content type
    folderPath = determineFolderFromContentType(
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
    frontmatter: sanitizeFrontmatter(frontmatter),
    content,
    created: new Date(),
    modified: new Date(),
  };

  writeNote(note);
  return note;
}

/**
 * Update an existing note in the vault
 */
export function updateNote(
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
  const existingNote = readNote(filePath);

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
        ...sanitizeFrontmatter(updates.frontmatter),
        ...preservedFields,
      };
    } else {
      // Merge mode (default): merge with existing frontmatter
      // First, validate only the new fields being added
      validateYAML(updates.frontmatter);

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
  writeFileWithRetry(updatedNote.path, fileContent, "utf-8");

  return updatedNote;
}
