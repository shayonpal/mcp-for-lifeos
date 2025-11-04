import { join } from "path";
import { glob } from "glob";
import { LifeOSNote, YAMLFrontmatter, SearchOptions, LIFEOS_CONFIG, stripMdExtension, DateResolver, normalizePath, WIKILINK_PATTERN } from "../../shared/index.js";
import { TemplateManager } from "../templates/index.js";
import { ObsidianSettings } from "../../obsidian-settings.js";
import {
  readFileWithRetry,
  writeFileWithRetry,
  AtomicWriteOptions,
} from "./file-io.js";
import {
  readNote as readNoteImpl,
  writeNote as writeNoteImpl,
  createNote as createNoteImpl,
  updateNote as updateNoteImpl,
} from "./note-crud.js";
import {
  getDailyNote as getDailyNoteImpl,
  createDailyNote as createDailyNoteImpl,
} from "./daily-note-service.js";
import { insertContent as insertContentImpl } from "./content-insertion.js";
import {
  getYamlPropertyValues as getYamlPropertyValuesImpl,
  getAllYamlProperties as getAllYamlPropertiesImpl,
} from "./yaml-operations.js";
import { moveItem as moveItemImpl } from "./folder-operations.js";

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
   * Normalize paths for vault operations
   *
   * @deprecated Use normalizePath from path-utils.ts instead
   * This method delegates to the shared utility for consistency
   *
   * @param path - Path to normalize (relative or absolute)
   * @returns Normalized absolute path
   */
  static normalizePath(path: string): string {
    // Delegate to shared utility for consistent cross-platform path handling
    // This preserves backward compatibility while using the improved implementation
    return normalizePath(path, LIFEOS_CONFIG.vaultPath);
  }

  /**
   * Find a note by title using search
   * @param title - The title to search for
   * @returns The path of the found note
   * @throws Error if no note found with the given title
   */
  static async findNoteByTitle(title: string): Promise<string> {
    // Import SearchEngine dynamically to avoid circular dependency
    const { SearchEngine } = await import('../search/index.js');

    const searchResults = await SearchEngine.quickSearch(title, 1);

    if (searchResults.length === 0) {
      throw new Error(`No note found with title: ${title}`);
    }

    return searchResults[0].note.path;
  }

  static async findNotes(pattern: string = "**/*.md"): Promise<string[]> {
    const searchPath = join(LIFEOS_CONFIG.vaultPath, pattern);
    return await glob(searchPath, {
      ignore: ["**/node_modules/**", "**/.*"],
    });
  }

  static readNote(filePath: string): LifeOSNote {
    return readNoteImpl(filePath);
  }

  static writeNote(note: LifeOSNote): void {
    writeNoteImpl(note);
  }

  static createNote(
    fileName: string,
    frontmatter: YAMLFrontmatter,
    content: string = "",
    targetFolder?: string,
  ): LifeOSNote {
    return createNoteImpl(fileName, frontmatter, content, targetFolder);
  }

  static updateNote(
    filePath: string,
    updates: {
      frontmatter?: Partial<YAMLFrontmatter>;
      content?: string;
      mode?: "replace" | "merge";
    },
  ): LifeOSNote {
    return updateNoteImpl(filePath, updates);
  }

  /**
   * Read file with iCloud sync retry logic
   * Public API for backward compatibility
   */
  static readFileWithRetry(
    filePath: string,
    encoding: BufferEncoding = "utf-8",
  ): string {
    return readFileWithRetry(filePath, encoding);
  }

  /**
   * Write file with iCloud sync retry logic
   * Public API for backward compatibility
   */
  static writeFileWithRetry(
    filePath: string,
    content: string,
    encoding: BufferEncoding = "utf-8",
    options?: AtomicWriteOptions,
  ): void {
    return writeFileWithRetry(filePath, content, encoding, options);
  }

  /**
   * Reconstruct wikilink text from components with new target note name
   *
   * Follows Obsidian wikilink format: [[target#anchor|alias]]
   * where anchor is either a heading (plain text) or block ref (starts with ^)
   * Preserves all link components exactly as they were in original link.
   *
   * @param embedFlag - '!' if embed, undefined otherwise
   * @param targetNote - New note name to use as target (without .md)
   * @param heading - Heading reference text (without #)
   * @param blockRef - Block reference text (includes ^ prefix, e.g., "^abc123")
   * @param alias - Alias display text (without |)
   * @returns Formatted wikilink text with new target
   *
   * @example
   * buildNewLinkText(undefined, 'NewNote', 'Section', undefined, 'Link')
   * // Returns: '[[NewNote#Section|Link]]'
   *
   * @example
   * buildNewLinkText(undefined, 'NewNote', undefined, '^block123', undefined)
   * // Returns: '[[NewNote#^block123]]'
   *
   * @example
   * buildNewLinkText('!', 'NewNote', undefined, undefined, undefined)
   * // Returns: '![[NewNote]]'
   *
   * @internal Used by link update operations and testing
   */
  public static buildNewLinkText(
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
   * Update all matching wikilinks in a note's content
   *
   * Uses String.replace() with WIKILINK_PATTERN callback for precision.
   * Only updates links where target matches oldNoteName (case-insensitive).
   * Preserves all link components (alias, heading, block ref, embed flag).
   *
   * Updates links in both frontmatter and content sections (MCP-110).
   * Uses simple string replacement on full content to preserve YAML structure.
   *
   * @param content - Full note content (including frontmatter)
   * @param oldNoteName - Original note name to match (without .md)
   * @param newNoteName - New note name to replace with (without .md)
   * @returns Updated content with wikilinks rewritten
   *
   * @example
   * updateNoteLinks(
   *   'See [[OldNote]] and [[OldNote|Alias]]',
   *   'OldNote',
   *   'NewNote'
   * )
   * // Returns: 'See [[NewNote]] and [[NewNote|Alias]]'
   */
  static updateNoteLinks(
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

          return this.buildNewLinkText(embedFlag, newNameNormalized, heading, blockRef, alias);
        }

        // Preserve non-matching links unchanged
        return match;
      }
    );

    return updatedFullContent;
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
    return insertContentImpl(filePath, content, target, position, ensureNewline);
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
    return getDailyNoteImpl(date, this.getLocalDate.bind(this));
  }

  static async createDailyNote(date: Date): Promise<LifeOSNote> {
    return createDailyNoteImpl(
      date,
      this.getLocalDate.bind(this),
      this.getTemplateManager.bind(this),
    );
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

  static moveItem(
    sourcePath: string,
    destinationFolder: string,
    options: {
      createDestination?: boolean;
      overwrite?: boolean;
      mergeFolders?: boolean;
      newFilename?: string;
    } = {},
  ): { success: boolean; newPath: string; itemType: 'note' | 'folder'; error?: string } {
    return moveItemImpl(sourcePath, destinationFolder, options);
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
    return getYamlPropertyValuesImpl(property, options);
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
    return getAllYamlPropertiesImpl(options);
  }
}
