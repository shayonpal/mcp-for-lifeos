/**
 * Link detection infrastructure for Obsidian wikilinks
 *
 * Provides read-only scanning capabilities to find all references to a note.
 * Part of MCP-106 (Phase 2 of rename_note implementation).
 *
 * Key features:
 * - Vault-wide link scanning using SearchEngine cache
 * - Support for all Obsidian link formats (basic, alias, heading, block, embed)
 * - Code block and frontmatter filtering
 * - Performance optimized for 1000+ note vaults (<5000ms)
 * - Ambiguous target detection for multi-note scenarios
 *
 * @module link-scanner
 * @since MCP-106
 */

import { basename } from 'path';
import type { LifeOSNote } from './types.js';
import { SearchEngine } from './search-engine.js';
import { VaultUtils } from './vault-utils.js';
import { WIKILINK_PATTERN } from './regex-utils.js';
import { stripMdExtension } from './path-utils.js';

/**
 * Options for configuring link scanning behavior
 */
export interface LinkScanOptions {
  /**
   * Whether to include embed links (![[...]]) in results
   * @default true
   */
  includeEmbeds?: boolean;

  /**
   * Case-sensitive target matching
   * @default false (Obsidian links are case-insensitive)
   */
  caseSensitive?: boolean;

  /**
   * Skip scanning code blocks (``` markers)
   * @default true (prevents false positives)
   */
  skipCodeBlocks?: boolean;

  /**
   * Skip scanning frontmatter (--- blocks)
   * @default true (frontmatter links not rendered)
   */
  skipFrontmatter?: boolean;
}

/**
 * Single link reference found in a note
 *
 * Contains complete metadata for link location and format,
 * enabling Phase 3 (MCP-107) link update operations.
 */
export interface LinkReference {
  // ========== Source note information ==========
  /** Full path to source note containing the link */
  sourcePath: string;

  /** Source note filename without extension */
  sourceNote: string;

  // ========== Link details ==========
  /** Full wikilink text as it appears in the note */
  linkText: string;

  /** Resolved target note name (without extension) */
  targetNote: string;

  /** Display alias if link uses [[Note|Alias]] format */
  alias?: string;

  /** Heading reference if link uses [[Note#Heading]] format */
  heading?: string;

  /** Block reference if link uses [[Note^block]] format */
  blockRef?: string;

  /** Whether this is an embed link (![[...]]) */
  isEmbed: boolean;

  // ========== Position information ==========
  /** Line number where link appears (1-indexed) */
  lineNumber: number;

  /** Full line text containing the link (for context) */
  lineText: string;

  /** Character position of link start within the line (0-indexed) */
  columnStart: number;

  /** Character position of link end within the line (0-indexed) */
  columnEnd: number;

  // ========== Metadata ==========
  /**
   * Whether target resolution is ambiguous (multiple notes match)
   * Phase 3 will need to handle ambiguous references carefully
   */
  isAmbiguous: boolean;
}

/**
 * Result of scanning vault for links to a target note
 */
export interface LinkScanResult {
  /** Target note name that was searched for */
  targetNote: string;

  /** Total number of link references found across vault */
  totalReferences: number;

  /** Array of all link references found */
  references: LinkReference[];

  /** Number of notes scanned during search */
  scannedNotes: number;

  /** Scan duration in milliseconds */
  scanTimeMs: number;

  /** Whether SearchEngine cache was used */
  usedCache: boolean;
}

/**
 * Static utility class for link detection operations
 *
 * Provides methods to scan vault for wikilinks, detect references,
 * and extract link metadata. All methods are static (no instance state).
 *
 * Pattern matches VaultUtils, SearchEngine, ObsidianLinks conventions.
 *
 * @since MCP-106
 */
export class LinkScanner {
  /**
   * Scan entire vault for wikilinks referencing a target note
   *
   * Uses SearchEngine.getAllNotes() for efficient cached vault traversal.
   * Scans note content with WIKILINK_PATTERN regex.
   * Filters code blocks and frontmatter by default.
   *
   * @param targetNoteName - Note name to search for (without .md extension)
   * @param options - Scan configuration options
   * @returns Link scan result with all references and metadata
   *
   * @throws Error if targetNoteName is empty or invalid
   * @throws Error if vault cannot be accessed
   *
   * @example
   * ```typescript
   * const result = await LinkScanner.scanVaultForLinks("my-note");
   * console.log(`Found ${result.totalReferences} references in ${result.scannedNotes} notes`);
   * ```
   *
   * Performance: <5000ms for 1000+ note vaults with cache
   */
  static async scanVaultForLinks(
    targetNoteName: string,
    options?: LinkScanOptions
  ): Promise<LinkScanResult> {
    const startTime = Date.now();

    // Validate target note name
    if (!targetNoteName || targetNoteName.trim().length === 0) {
      throw new Error(
        'Invalid target note name: Target cannot be empty. ' +
        'Provide a valid note name (without .md extension).'
      );
    }

    const normalizedTarget = stripMdExtension(targetNoteName.trim());

    // Apply default options
    const opts = {
      includeEmbeds: options?.includeEmbeds ?? true,
      caseSensitive: options?.caseSensitive ?? false,
      skipCodeBlocks: options?.skipCodeBlocks ?? true,
      skipFrontmatter: options?.skipFrontmatter ?? true,
    };

    // Get all notes from vault (uses SearchEngine cache)
    let notes: LifeOSNote[];
    try {
      notes = await SearchEngine.getAllNotes();
    } catch (error) {
      throw new Error(
        `Vault access failed: Unable to read vault notes. ` +
        `Ensure vault path is configured correctly. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Detect ambiguous targets (multiple notes with same name)
    const noteNames = notes.map(n => stripMdExtension(basename(n.path)));
    const targetMatches = noteNames.filter(name =>
      opts.caseSensitive
        ? name === normalizedTarget
        : name.toLowerCase() === normalizedTarget.toLowerCase()
    );
    const isAmbiguous = targetMatches.length > 1;

    // Scan each note for links to target
    const allReferences: LinkReference[] = [];

    for (const note of notes) {
      const noteReferences = this.scanNoteForLinks(note, options);

      // Filter for links targeting our search target
      const targetReferences = noteReferences.filter(ref => {
        const matchTarget = opts.caseSensitive
          ? ref.targetNote === normalizedTarget
          : ref.targetNote.toLowerCase() === normalizedTarget.toLowerCase();

        // Apply embed filter if needed
        if (!opts.includeEmbeds && ref.isEmbed) {
          return false;
        }

        return matchTarget;
      });

      // Mark ambiguous references
      targetReferences.forEach(ref => {
        ref.isAmbiguous = isAmbiguous;
      });

      allReferences.push(...targetReferences);
    }

    const scanTimeMs = Date.now() - startTime;

    return {
      targetNote: normalizedTarget,
      totalReferences: allReferences.length,
      references: allReferences,
      scannedNotes: notes.length,
      scanTimeMs,
      usedCache: true, // SearchEngine.getAllNotes() leverages 5-minute cache when available
    };
  }

  /**
   * Scan single note for all outgoing wikilinks
   *
   * Extracts all wikilink references from note content.
   * Useful for analyzing note's link structure.
   * Does not require vault-wide scanning.
   *
   * @param note - LifeOSNote to scan for links
   * @param options - Scan configuration options
   * @returns Array of link references found in note
   *
   * @example
   * ```typescript
   * const note = VaultUtils.readNote("/path/to/note.md");
   * const links = LinkScanner.scanNoteForLinks(note);
   * console.log(`Note contains ${links.length} wikilinks`);
   * ```
   *
   * Performance: <50ms per note
   */
  static scanNoteForLinks(
    note: LifeOSNote,
    options?: LinkScanOptions
  ): LinkReference[] {
    return this.extractLinksFromContent(note.content, note.path, options);
  }

  /**
   * Extract wikilinks from raw markdown content
   *
   * Low-level method for testing and content analysis.
   * Does not require parsed note or vault access.
   *
   * @param content - Raw markdown content
   * @param sourcePath - File path for reference metadata
   * @param options - Scan configuration options
   * @returns Array of link references found in content
   *
   * @example
   * ```typescript
   * const content = "See [[Note]] and [[Other#Section]] for details";
   * const links = LinkScanner.extractLinksFromContent(content, "/path/note.md");
   * // Returns 2 LinkReference objects
   * ```
   *
   * Performance: <10ms per 1000 lines
   */
  static extractLinksFromContent(
    content: string,
    sourcePath: string,
    options?: LinkScanOptions
  ): LinkReference[] {
    const references: LinkReference[] = [];
    const sourceNote = stripMdExtension(basename(sourcePath));

    // Apply default options
    const opts = {
      includeEmbeds: options?.includeEmbeds ?? true,
      caseSensitive: options?.caseSensitive ?? false,
      skipCodeBlocks: options?.skipCodeBlocks ?? true,
      skipFrontmatter: options?.skipFrontmatter ?? true,
    };

    // Split content into lines for position tracking
    const lines = content.split('\n');

    // Track regions to skip
    const skipRegions = this.identifySkipRegions(lines, opts);

    // Scan each line for wikilinks
    lines.forEach((line, lineIndex) => {
      const lineNumber = lineIndex + 1; // 1-indexed

      // Skip lines in excluded regions
      if (skipRegions.some(region => lineNumber >= region.start && lineNumber <= region.end)) {
        return;
      }

      // Reset regex for each line (global flag requires reset)
      WIKILINK_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = WIKILINK_PATTERN.exec(line)) !== null) {
        const [fullMatch, embedFlag, target, anchor, alias] = match;

        // Skip embeds if option disabled
        const isEmbed = !!embedFlag;
        if (!opts.includeEmbeds && isEmbed) {
          continue;
        }

        // Extract target note name (strip extension if present)
        const targetNote = stripMdExtension(target);

        // Classify anchor as heading or block reference
        // Block refs start with ^ (e.g., "^abc123")
        // Headings are plain text (e.g., "Section")
        const isBlockRef = anchor?.startsWith('^') ?? false;
        const heading = isBlockRef ? undefined : (anchor?.trim() || undefined);
        const blockRef = isBlockRef ? anchor.trim() : undefined;

        references.push({
          sourcePath,
          sourceNote,
          linkText: fullMatch,
          targetNote,
          alias: alias || undefined,
          heading,
          blockRef,
          isEmbed,
          lineNumber,
          lineText: line,
          columnStart: match.index,
          columnEnd: match.index + fullMatch.length,
          isAmbiguous: false, // Will be set by scanVaultForLinks if needed
        });
      }
    });

    return references;
  }

  /**
   * Identify regions of content that should be skipped during link scanning
   *
   * Detects:
   * - Code blocks (``` markers)
   * - Frontmatter (--- blocks at start of file)
   *
   * @param lines - Content split into lines
   * @param options - Options indicating which regions to skip
   * @returns Array of skip regions with start/end line numbers (1-indexed)
   */
  private static identifySkipRegions(
    lines: string[],
    options: Required<LinkScanOptions>
  ): Array<{ start: number; end: number }> {
    const regions: Array<{ start: number; end: number }> = [];

    let inCodeBlock = false;
    let inFrontmatter = false;
    let frontmatterStart = -1;
    let codeBlockStart = -1;

    lines.forEach((line, index) => {
      const lineNumber = index + 1; // 1-indexed
      const trimmedLine = line.trim();

      // Frontmatter detection (only at start of file)
      if (options.skipFrontmatter && lineNumber === 1 && trimmedLine === '---') {
        inFrontmatter = true;
        frontmatterStart = lineNumber;
        return;
      }

      if (inFrontmatter && trimmedLine === '---') {
        // End of frontmatter
        regions.push({ start: frontmatterStart, end: lineNumber });
        inFrontmatter = false;
        frontmatterStart = -1;
        return;
      }

      // Code block detection
      if (options.skipCodeBlocks && trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          regions.push({ start: codeBlockStart, end: lineNumber });
          inCodeBlock = false;
          codeBlockStart = -1;
        } else {
          // Start of code block
          inCodeBlock = true;
          codeBlockStart = lineNumber;
        }
      }
    });

    // Handle unclosed blocks (include till end)
    if (inCodeBlock && codeBlockStart > 0) {
      regions.push({ start: codeBlockStart, end: lines.length });
    }
    if (inFrontmatter && frontmatterStart > 0) {
      regions.push({ start: frontmatterStart, end: lines.length });
    }

    return regions;
  }
}
