/**
 * Implementation contracts for Linear Issue: MCP-106
 * Issue: Link Detection Infrastructure (read-only scanner)
 *
 * Phase 2 of rename_note implementation: Read-only link scanner to find all references to a note.
 *
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-106
 */

import type { LifeOSNote } from '../../src/shared/index.js';

// ============================================================================
// WIKILINK PATTERN CONTRACTS
// ============================================================================

/**
 * Comprehensive wikilink regex pattern for Obsidian links
 *
 * Pattern: /(!)?\[\[(.+?)(?:#(.+?))?(?:\^(.+?))?(?:\|(.+?))?\]\]/g
 *
 * Obsidian format: [[target#heading^block|alias]]
 * - target comes first (required)
 * - heading/block references come in middle (optional)
 * - alias comes last after pipe (optional)
 *
 * Capture groups:
 * - Group 1: Embed flag (!) - optional
 * - Group 2: Target note name - required (actual link destination)
 * - Group 3: Heading reference (#heading) - optional
 * - Group 4: Block reference (^block) - optional
 * - Group 5: Alias text - optional (display text after |)
 *
 * Supported link formats:
 * - Basic: [[Note]]
 * - Alias: [[Note|Display Text]]
 * - Heading: [[Note#Heading]]
 * - Heading + Alias: [[Note#Heading|Alias]]
 * - Block: [[Note^blockref]]
 * - Block + Alias: [[Note^blockref|Alias]]
 * - Embed: ![[Note]]
 * - Combined: [[Note#Heading^block|Alias]]
 *
 * IMPLEMENTATION LOCATION: src/regex-utils.ts as WIKILINK_PATTERN constant
 */
export interface WikilinkPatternContract {
  /**
   * The regex pattern for wikilink matching
   */
  pattern: RegExp;

  /**
   * Pattern must be global (g flag) for exec() loop
   */
  flags: 'g';

  /**
   * Capture group indices for parsing matches
   */
  groups: {
    embedFlag: 1;     // (!) optional embed indicator
    target: 2;        // Note name (required) - actual link destination
    heading: 3;       // Text after # (heading ref)
    blockRef: 4;      // Text after ^ (block ref)
    alias: 5;         // Display text after | (comes last)
  };
}

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Options for link scanning operations
 */
export interface LinkScanOptions {
  /**
   * Whether to include embed links (![[...]]) in results
   * Default: true
   */
  includeEmbeds?: boolean;

  /**
   * Case-sensitive target matching
   * Default: false (Obsidian links are case-insensitive)
   */
  caseSensitive?: boolean;

  /**
   * Skip scanning code blocks (``` markers)
   * Default: true (prevents false positives)
   */
  skipCodeBlocks?: boolean;

  /**
   * Skip scanning frontmatter (--- blocks)
   * Default: true (frontmatter links not rendered)
   */
  skipFrontmatter?: boolean;
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Single link reference found in a note
 *
 * Represents one occurrence of a wikilink pointing to the target note.
 * Includes complete metadata for Phase 3 link update operations.
 */
export interface LinkReference {
  // ========== Source note information ==========
  /**
   * Full path to source note containing the link
   * Example: "/Users/name/vault/Projects/note.md"
   */
  sourcePath: string;

  /**
   * Source note filename without extension
   * Example: "note" (from "note.md")
   */
  sourceNote: string;

  // ========== Link details ==========
  /**
   * Full wikilink text as it appears in the note
   * Examples: "[[Note]]", "![[Image]]", "[[Note#Heading|Alias]]"
   */
  linkText: string;

  /**
   * Resolved target note name (without extension)
   * Example: "target-note" (from [[target-note]])
   */
  targetNote: string;

  /**
   * Display alias if link uses [[Note|Alias]] format
   * undefined if no alias
   */
  alias?: string;

  /**
   * Heading reference if link uses [[Note#Heading]] format
   * undefined if no heading
   */
  heading?: string;

  /**
   * Block reference if link uses [[Note^block]] format
   * undefined if no block reference
   */
  blockRef?: string;

  /**
   * Whether this is an embed link (![[...]])
   * true for embeds, false for regular wikilinks
   */
  isEmbed: boolean;

  // ========== Position information ==========
  /**
   * Line number where link appears (1-indexed)
   * Example: 42 (line 42 in the file)
   */
  lineNumber: number;

  /**
   * Full line text containing the link (for context)
   * Example: "See also: [[Related Note]] for more details"
   */
  lineText: string;

  /**
   * Character position of link start within the line (0-indexed)
   * Example: 10 (link starts at column 10)
   */
  columnStart: number;

  /**
   * Character position of link end within the line (0-indexed)
   * Example: 25 (link ends at column 25)
   */
  columnEnd: number;

  // ========== Metadata ==========
  /**
   * Whether target resolution is ambiguous (multiple notes match)
   * true if multiple notes in vault have same name
   * false if target is unique
   *
   * Phase 3 will need to handle ambiguous references carefully
   */
  isAmbiguous: boolean;
}

/**
 * Result of scanning vault for links to a target note
 *
 * Aggregates all link references found and provides scan metadata.
 */
export interface LinkScanResult {
  /**
   * Target note name that was searched for
   * Example: "target-note" (the note being renamed)
   */
  targetNote: string;

  /**
   * Total number of link references found across vault
   * Example: 15 (15 links pointing to target note)
   */
  totalReferences: number;

  /**
   * Array of all link references found
   * Empty array if no references exist
   */
  references: LinkReference[];

  /**
   * Number of notes scanned during search
   * Example: 1247 (total vault size)
   */
  scannedNotes: number;

  /**
   * Scan duration in milliseconds
   * Example: 1834 (1.8 seconds to scan vault)
   *
   * Performance target: <5000ms for 1000+ note vaults
   */
  scanTimeMs: number;

  /**
   * Whether SearchEngine cache was used
   * true if getAllNotes() returned cached results
   * false if fresh vault scan was required
   */
  usedCache: boolean;
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error types that may be thrown during link scanning:
 *
 * @throws InvalidTargetError - Target note name is empty or invalid
 * @throws VaultAccessError - Cannot read vault or access notes
 * @throws PatternMatchError - Regex pattern compilation or matching failed
 *
 * All errors should include actionable messages for debugging.
 */

/**
 * Error for invalid target note names
 */
export interface InvalidTargetError {
  name: 'InvalidTargetError';
  message: string;
  targetNote: string; // The invalid target that was provided
}

/**
 * Error for vault access failures
 */
export interface VaultAccessError {
  name: 'VaultAccessError';
  message: string;
  vaultPath: string; // Path to vault that failed
  cause?: Error;     // Underlying error if available
}

/**
 * Error for pattern matching failures
 */
export interface PatternMatchError {
  name: 'PatternMatchError';
  message: string;
  pattern: string;   // Pattern that failed
  cause?: Error;     // Underlying error if available
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * LinkScanner integration points with existing systems
 */
export interface LinkScannerIntegration {
  /**
   * Extends no existing interfaces (standalone utility)
   */
  extends: null;

  /**
   * Integrates with existing components
   */
  integrates: {
    /**
     * Uses SearchEngine.getAllNotes() for cached vault access
     * Leverages 5-minute cache for performance
     */
    searchEngine: true;

    /**
     * Uses VaultUtils.readNote() for note parsing
     * Leverages gray-matter frontmatter extraction
     */
    vaultUtils: true;

    /**
     * Uses WIKILINK_PATTERN from regex-utils.ts
     * Centralized pattern for consistency
     */
    regexUtils: true;

    /**
     * Uses path normalization from path-utils.ts
     * Cross-platform path handling
     */
    pathUtils: true;

    /**
     * NO integration with:
     * - TemplateSystem (not needed for link scanning)
     * - YAMLManager (frontmatter irrelevant to links)
     * - Analytics (internal infrastructure, not tracked)
     */
    templateSystem: false;
    yamlManager: false;
    analytics: false;
  };
}

// ============================================================================
// MODULE STRUCTURE CONTRACTS
// ============================================================================

/**
 * LinkScanner static utility class contract
 *
 * Pattern: Static methods only (no instance state)
 * Matches: VaultUtils, SearchEngine, ObsidianLinks patterns
 */
export interface LinkScannerContract {
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
   * @throws InvalidTargetError if targetNoteName is empty or invalid
   * @throws VaultAccessError if vault cannot be accessed
   *
   * Performance: <5000ms for 1000+ note vaults with cache
   */
  scanVaultForLinks(
    targetNoteName: string,
    options?: LinkScanOptions
  ): Promise<LinkScanResult>;

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
   * Performance: <50ms per note
   */
  scanNoteForLinks(
    note: LifeOSNote,
    options?: LinkScanOptions
  ): LinkReference[];

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
   * Performance: <10ms per 1000 lines
   */
  extractLinksFromContent(
    content: string,
    sourcePath: string,
    options?: LinkScanOptions
  ): LinkReference[];
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors for LinkScanner implementation
 *
 * MUST:
 * - Use SearchEngine.getAllNotes() for vault scanning (reuse cache)
 * - Filter code blocks (``` markers) by default to prevent false positives
 * - Filter frontmatter (--- blocks) by default (links not rendered)
 * - Handle case-insensitive matching by default (Obsidian behavior)
 * - Return complete LinkReference metadata for Phase 3 usage
 * - Detect ambiguous targets (multiple notes with same name)
 * - Track scan performance metrics (scanTimeMs, usedCache)
 * - Use WIKILINK_PATTERN from regex-utils.ts (centralized pattern)
 *
 * MUST NOT:
 * - Modify any files (read-only infrastructure)
 * - Create new cache infrastructure (reuse SearchEngine cache)
 * - Scan files multiple times (leverage existing cache)
 * - Throw unhandled exceptions (all errors structured)
 * - Block main thread (async operations only)
 *
 * SHOULD:
 * - Complete vault scans in <5000ms for 1000+ notes (with cache)
 * - Complete single note scans in <50ms
 * - Provide detailed position information (line, column)
 * - Include full line context in LinkReference
 * - Detect embed vs regular wikilinks
 * - Parse all Obsidian link variants (alias, heading, block)
 *
 * PERFORMANCE:
 * - Vault scan: <5000ms for 1000+ notes (with cache)
 * - Single note: <50ms per note
 * - Content extraction: <10ms per 1000 lines
 * - Cache hit rate: >90% for repeated scans within 5 minutes
 */

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Test coverage requirements for LinkScanner
 *
 * Unit tests (20+ test cases):
 * - Wikilink pattern matching (all 5 variants)
 * - Code block filtering (``` markers)
 * - Frontmatter filtering (--- blocks)
 * - Case sensitivity handling
 * - Edge cases (empty content, malformed links, special characters)
 * - Ambiguous target detection
 * - Position tracking accuracy (line, column)
 *
 * Integration tests (5+ test cases):
 * - Vault scanning with SearchEngine cache
 * - Performance with 100+ note test vault
 * - Cache reuse validation (second scan faster)
 * - Cross-platform path handling
 * - Real vault structure with nested folders
 *
 * Performance benchmarks:
 * - Vault scan time measurement
 * - Single note scan time measurement
 * - Cache hit rate tracking
 */

// ============================================================================
// PHASE 3 COMPATIBILITY CONTRACTS
// ============================================================================

/**
 * LinkReference design enables Phase 3 (MCP-107) link updates
 *
 * Phase 3 will use LinkReference metadata to:
 * - Locate exact link position (lineNumber, columnStart, columnEnd)
 * - Preserve link format (alias, heading, block ref)
 * - Handle ambiguous targets (isAmbiguous flag)
 * - Update link text in-place (linkText for search/replace)
 * - Maintain line context (lineText for validation)
 *
 * LinkScanResult provides:
 * - Complete reference inventory before updates
 * - Performance metrics for progress tracking
 * - Validation that all links were found
 *
 * No breaking changes expected in Phase 3 - LinkReference structure
 * is designed to be stable and forward-compatible.
 */
