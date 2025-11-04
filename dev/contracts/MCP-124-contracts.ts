/**
 * Implementation contracts for Linear Issue: MCP-124
 * Issue: Block Reference Support in Link Updates
 *
 * These contracts define expected behavior and data structures for adding
 * block reference support to the link scanning and updating system.
 * All implementation MUST conform to these interfaces.
 */

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Extended LinkReference interface with block reference support
 * Extends existing interface from src/modules/links/link-scanner.ts
 */
export interface LinkReferenceWithBlockSupport {
  // ========== Existing fields (from LinkReference) ==========
  sourcePath: string;
  sourceNote: string;
  linkText: string;
  targetNote: string;
  alias?: string;
  isEmbed: boolean;
  lineNumber: number;
  lineText: string;
  columnStart: number;
  columnEnd: number;
  isAmbiguous: boolean;

  // ========== Updated anchor handling ==========
  /**
   * Heading reference if link uses [[Note#Heading]] format
   * MUST NOT be set if blockRef is present
   */
  heading?: string;

  /**
   * Block reference if link uses [[Note#^blockid]] format
   * MUST include the ^ prefix (e.g., "^abc123")
   * MUST NOT be set if heading is present
   */
  blockRef?: string;
}

/**
 * Regex capture group mapping for updated WIKILINK_PATTERN
 * Documents expected regex structure and validation rules
 */
export interface WikilinkPatternCaptures {
  /**
   * Updated regex pattern structure:
   * /(!?)\\[\\[([^\\]|#]+)(?:#(\\^[^\\]|]+|[^\\]|]+))?(?:\\|([^\\]]+))?\\]\\]/g
   *
   * Capture groups:
   * - Group 1: Embed marker (!) - optional
   * - Group 2: Target note name - required
   * - Group 3: Anchor (heading or block ref) - optional
   *   - If starts with ^: block reference
   *   - Otherwise: heading reference
   * - Group 4: Display alias - optional
   */
  embedMarker?: string;       // Group 1: '!' or undefined
  targetNote: string;          // Group 2: Always present
  anchor?: string;             // Group 3: Heading or block ref (with ^ if block)
  alias?: string;              // Group 4: Display alias
}

/**
 * Anchor parsing logic contract
 * Defines how to classify anchor as heading vs block reference
 */
export interface AnchorClassification {
  /**
   * Input: Raw anchor string from regex capture (may be undefined)
   * Output: Classification result
   *
   * Rules:
   * - If anchor is undefined: neither heading nor blockRef set
   * - If anchor starts with ^: blockRef = anchor (includes ^), heading undefined
   * - Otherwise: heading = anchor, blockRef undefined
   */
  isBlockRef: boolean;
  heading?: string;
  blockRef?: string;
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Link reconstruction contract
 * Defines how to rebuild wikilink text from parsed components
 */
export interface LinkReconstructionLogic {
  /**
   * Rebuild wikilink from components
   *
   * Logic:
   * 1. Start with embed marker if present: '![[' else '[['
   * 2. Add target note name
   * 3. Add anchor if present:
   *    - If blockRef: append '#' + blockRef (blockRef already includes ^)
   *    - Else if heading: append '#' + heading
   * 4. Add alias if present: '|' + alias
   * 5. Close: ']]'
   *
   * Examples:
   * - {targetNote: "Note", blockRef: "^abc"} → "[[Note#^abc]]"
   * - {targetNote: "Note", heading: "Section"} → "[[Note#Section]]"
   * - {targetNote: "Note", blockRef: "^abc", alias: "Link"} → "[[Note#^abc|Link]]"
   */
  components: {
    isEmbed: boolean;
    targetNote: string;
    heading?: string;
    blockRef?: string;
    alias?: string;
  };
  expectedOutput: string;
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error types that may be thrown:
 *
 * Validation Errors:
 * - If both heading AND blockRef are set on same link: Invalid state
 * - If blockRef doesn't start with ^: Invalid format
 * - If anchor string is empty after trim: Invalid anchor
 *
 * Note: Implementation should prevent invalid states at parse time
 * rather than throwing errors during reconstruction
 */
export type BlockRefValidationError =
  | 'BOTH_HEADING_AND_BLOCKREF_SET'
  | 'BLOCKREF_MISSING_CARET'
  | 'EMPTY_ANCHOR';

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Files requiring modifications
 */
export interface ModifiedComponents {
  linkScanner: {
    file: 'src/modules/links/link-scanner.ts';
    changes: [
      'Update WIKILINK_PATTERN regex to capture block refs',
      'Modify parsing logic in extractLinksFromContent',
      'Distinguish heading vs blockRef in anchor classification'
    ];
    interfaces: {
      updated: ['LinkReference'];
      unchanged: ['LinkScanOptions', 'LinkScanResult'];
    };
  };

  linkUpdater: {
    file: 'src/modules/links/link-updater.ts';
    changes: [
      'Update link reconstruction logic in renderLinkUpdates',
      'Preserve ^ prefix when rebuilding block refs',
      'Handle blockRef field in link rewriting'
    ];
    interfaces: {
      unchanged: ['LinkUpdateResult', 'LinkCommitInput', 'LinkRenderResult'];
    };
  };

  tests: {
    unit: [
      'tests/unit/link-scanner.test.ts',
      'tests/unit/link-updater.test.ts'
    ];
    integration: [
      'tests/integration/rename-note.integration.test.ts'
    ];
  };

  documentation: {
    files: ['docs/tools/rename_note.md'];
    updates: ['Add block reference examples and behavior'];
  };
}

/**
 * Integration with existing systems
 */
export interface ExistingIntegrationPoints {
  searchEngine: {
    impact: 'none';
    notes: 'Link scanner already integrates with SearchEngine cache';
  };

  yamlManager: {
    impact: 'none';
    notes: 'Block refs don\'t affect YAML frontmatter';
  };

  transactionSystem: {
    impact: 'none';
    notes: 'Link updates already wrapped in transaction protocol';
  };
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors and constraints
 */
export interface BlockRefBehaviorContract {
  /**
   * MUST behaviors:
   * 1. Detect block references: [[Note#^blockid]] patterns must be captured
   * 2. Distinguish from headings: ^ prefix determines classification
   * 3. Preserve caret: Block refs must retain ^ in reconstruction
   * 4. Mutual exclusivity: heading and blockRef cannot both be set
   * 5. Update on rename: Block refs update when target note renamed
   *
   * MUST NOT behaviors:
   * 1. Strip caret: ^ prefix must never be removed from block refs
   * 2. Confuse formats: Headings and block refs must remain distinct
   * 3. Break existing: Current heading support must remain functional
   */
  mustPreserveCaretPrefix: true;
  mustDistinguishFromHeadings: true;
  mustUpdateOnRename: true;
  mustNotStripCaret: true;
  mustNotBreakHeadings: true;
}

/**
 * Test coverage requirements
 */
export interface TestCoverageContract {
  unitTests: {
    linkScanner: [
      'Parse [[Note#^blockid]] correctly',
      'Distinguish [[Note#^block]] from [[Note#heading]]',
      'Handle [[Note#^block|Alias]] with alias',
      'Reject invalid formats (missing ^, empty anchor)',
      'Preserve ^ prefix in blockRef field'
    ];
    linkUpdater: [
      'Reconstruct [[Note#^block]] with caret',
      'Update block refs on rename',
      'Preserve alias in block ref links',
      'Handle mixed heading and block ref updates'
    ];
  };

  integrationTests: [
    'E2E: Rename note with block ref links',
    'E2E: Mixed heading and block ref updates',
    'E2E: Dry-run preview shows block ref changes'
  ];
}

// ============================================================================
// REGEX PATTERN CONTRACT
// ============================================================================

/**
 * Updated WIKILINK_PATTERN specification
 */
export interface WikilinkRegexContract {
  /**
   * Current pattern (from ADR-006):
   * /(!)?\\[\\[(?:(.+?)\\|)?(.+?)(?:#([^|\\]]+))?(?:\\^([^|\\]]+))?\\]\\]/g
   *
   * Updated pattern (MCP-124):
   * /(!?)\\[\\[([^\\]|#]+)(?:#(\\^[^\\]|]+|[^\\]|]+))?(?:\\|([^\\]]+))?\\]\\]/g
   *
   * Key changes:
   * 1. Group 3 now captures full anchor (heading or block ref)
   * 2. Anchor pattern: (\\^[^\\]|]+|[^\\]|]+)
   *    - First alternative: \\^[^\\]|]+ (block ref with ^)
   *    - Second alternative: [^\\]|]+ (heading without ^)
   * 3. Removed separate block ref group (merged into anchor)
   *
   * Benefits:
   * - Simpler capture group structure
   * - Easier to distinguish heading vs block (check for ^ prefix)
   * - Maintains performance (single regex pass)
   */
  pattern: string;
  captureGroups: WikilinkPatternCaptures;
  testCases: {
    basic: '[[Note#^block123]]';
    withAlias: '[[Note#^block123|Link Text]]';
    heading: '[[Note#Heading]]';  // Should NOT match as block ref
    embed: '![[Note#^block123]]';
  };
}

// ============================================================================
// BACKWARD COMPATIBILITY CONTRACT
// ============================================================================

/**
 * Ensures existing functionality remains intact
 */
export interface BackwardCompatibilityContract {
  /**
   * Existing link formats must continue to work:
   * - [[Note]] - Basic links
   * - [[Note|Alias]] - Aliased links
   * - [[Note#Heading]] - Heading links
   * - ![[Note]] - Embeds
   * - [[Note#Heading|Alias]] - Combined heading + alias
   *
   * All existing tests must pass without modification
   * No breaking changes to LinkReference interface for existing consumers
   */
  existingFormatsSupported: true;
  noBreakingChanges: true;
  allExistingTestsPass: true;
}

// ============================================================================
// IMPLEMENTATION CHECKLIST
// ============================================================================

/**
 * Steps to complete implementation (in order)
 */
export const IMPLEMENTATION_STEPS = [
  '1. Update WIKILINK_PATTERN regex in src/modules/links/link-scanner.ts',
  '2. Modify LinkReference interface to add blockRef field',
  '3. Update extractLinksFromContent parsing logic',
  '4. Add anchor classification logic (heading vs blockRef)',
  '5. Update link reconstruction in src/modules/links/link-updater.ts',
  '6. Add unit tests for block ref parsing',
  '7. Add unit tests for block ref reconstruction',
  '8. Add integration tests for E2E rename with block refs',
  '9. Update docs/tools/rename_note.md with examples',
  '10. Verify all 681+ existing tests still pass'
] as const;

/**
 * Validation checklist before marking complete
 */
export const VALIDATION_CHECKLIST = [
  '☐ [[Note#^blockid]] detected by LinkScanner',
  '☐ Block refs distinguished from headings',
  '☐ Caret prefix preserved in updates',
  '☐ Mixed heading + block refs handled correctly',
  '☐ All unit tests pass (new + existing)',
  '☐ All integration tests pass',
  '☐ npm run typecheck passes',
  '☐ Documentation updated with examples',
  '☐ No breaking changes to existing link formats',
  '☐ Performance remains <5000ms for 1000+ notes'
] as const;
