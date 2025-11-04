/**
 * Implementation Contracts for Linear Issue: MCP-29
 * Issue: Multiple MCP tools show 'Untitled' for daily notes + timezone bug in date display
 *
 * These contracts define the expected behavior and data structures for implementing
 * fixes across all 4 sub-issues (MCP-31, MCP-32, MCP-33, MCP-34).
 *
 * All implementation code MUST conform to these interface definitions.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-29
 */

import { YAMLFrontmatter } from '../../src/shared/index.js';

// ============================================================================
// SUB-ISSUE TRACKING
// ============================================================================

/**
 * MCP-29 consists of 4 sub-issues that will be implemented together:
 *
 * - MCP-31: Fix timezone bug in ObsidianLinks.extractNoteTitle()
 * - MCP-32: Create consistent title display helper for daily notes
 * - MCP-33: Update core MCP tools to use consistent title display
 * - MCP-34: Update search MCP tools to use consistent title display
 *
 * This consolidated implementation addresses all 4 sub-issues in one pass.
 */

// ============================================================================
// INPUT CONTRACTS (MCP-32: Enhanced extractNoteTitle)
// ============================================================================

/**
 * Input parameters for the enhanced extractNoteTitle method
 *
 * @contract MCP-32
 * @location src/obsidian-links.ts:73
 */
export interface ExtractNoteTitleInput {
  /**
   * Absolute or relative file path to the note
   * Must include .md extension or be a basename
   *
   * Examples:
   * - "/path/to/vault/Daily Notes/2025-08-30.md"
   * - "2025-08-30.md"
   * - "My Project Note.md"
   */
  filePath: string;

  /**
   * Optional YAML frontmatter object
   * If provided and contains 'title' field, that title takes precedence
   *
   * This enables proper title extraction for notes that DO have explicit titles
   * while still handling daily notes (which typically don't have title field)
   *
   * @optional
   */
  frontmatter?: YAMLFrontmatter | Record<string, any>;
}

// ============================================================================
// OUTPUT CONTRACTS (MCP-32: Title Extraction Results)
// ============================================================================

/**
 * Output from extractNoteTitle method
 *
 * Returns a human-readable title string derived from:
 * 1. Frontmatter title field (if provided and exists)
 * 2. Formatted date for daily notes (YYYY-MM-DD format)
 * 3. Filename with formatting (spaces, title case)
 *
 * @contract MCP-32
 */
export type ExtractNoteTitleOutput = string;

/**
 * Expected output formats based on input type
 */
export interface TitleFormatExamples {
  /**
   * Daily note with frontmatter.title: "My Custom Title"
   * Output: "My Custom Title"
   */
  dailyNoteWithTitle: "My Custom Title";

  /**
   * Daily note without frontmatter.title, filename: "2025-08-30.md"
   * Output: "August 30, 2025"
   *
   * TIMEZONE FIX (MCP-31): Must use parseISO() not new Date()
   * to avoid UTC parsing bug causing day shift
   */
  dailyNoteWithoutTitle: "August 30, 2025";

  /**
   * Regular note without frontmatter.title, filename: "my-project-note.md"
   * Output: "My Project Note"
   */
  regularNoteWithoutTitle: "My Project Note";

  /**
   * Regular note with frontmatter.title: "Explicit Title"
   * Output: "Explicit Title"
   */
  regularNoteWithTitle: "Explicit Title";
}

// ============================================================================
// BEHAVIORAL CONTRACTS (MCP-31: Timezone Fix)
// ============================================================================

/**
 * Timezone handling contract for daily notes
 *
 * @contract MCP-31 (Timezone Bug Fix)
 * @problem File '2025-08-30.md' shows as 'August 29, 2025' due to UTC parsing
 * @solution Use parseISO() from date-fns instead of new Date()
 */
export interface TimezoneBehaviorContract {
  /**
   * MUST: Use parseISO() from date-fns for timezone-aware parsing
   *
   * INCORRECT (current):
   * const date = new Date(filename); // Creates UTC date, shifts to previous day
   *
   * CORRECT (required):
   * import { parseISO } from 'date-fns';
   * const date = parseISO(filename); // Parses as local date, no shift
   */
  parsingMethod: "parseISO" | never;

  /**
   * MUST: Use format() from date-fns for consistent date formatting
   *
   * INCORRECT (current):
   * date.toLocaleDateString('en-US', { ... }) // Inconsistent with other tools
   *
   * CORRECT (required):
   * import { format } from 'date-fns';
   * format(date, 'MMMM dd, yyyy') // Matches get_daily_note pattern
   */
  formattingMethod: "date-fns format()" | never;

  /**
   * Expected behavior: File "2025-08-30.md" MUST display as "August 30, 2025"
   * regardless of user's timezone
   */
  expectedOutput: {
    input: "2025-08-30";
    output: "August 30, 2025";
    timezone: "any"; // Must work in all timezones
  };
}

// ============================================================================
// METHOD SIGNATURE CONTRACT (MCP-32)
// ============================================================================

/**
 * Required method signature for enhanced extractNoteTitle
 *
 * @contract MCP-32
 * @location src/obsidian-links.ts:73
 * @visibility MUST change from 'private' to 'public'
 */
export interface EnhancedExtractNoteTitleSignature {
  /**
   * Method name (unchanged)
   */
  methodName: "extractNoteTitle";

  /**
   * Visibility MUST be changed to public
   *
   * BEFORE: private static extractNoteTitle(...)
   * AFTER:  public static extractNoteTitle(...)
   */
  visibility: "public static";

  /**
   * Parameters in order
   */
  parameters: [
    {
      name: "filePath";
      type: "string";
      required: true;
      description: "Path to note file";
    },
    {
      name: "frontmatter";
      type: "YAMLFrontmatter | Record<string, any> | undefined";
      required: false;
      description: "Optional frontmatter object with title field";
    }
  ];

  /**
   * Return type
   */
  returnType: "string";

  /**
   * Complete signature
   */
  signature: "public static extractNoteTitle(filePath: string, frontmatter?: YAMLFrontmatter | Record<string, any>): string";
}

// ============================================================================
// CONSOLIDATION CONTRACTS (MCP-33, MCP-34)
// ============================================================================

/**
 * Pattern to replace across all MCP tools
 *
 * @contract MCP-33 (Core tools), MCP-34 (Search tools)
 * @locations 13 locations across src/index.ts and src/tool-router.ts
 */
export interface TitleConsolidationPattern {
  /**
   * INCORRECT pattern (current - appears 13 times)
   */
  oldPattern: "note.frontmatter.title || 'Untitled'";

  /**
   * CORRECT pattern (required replacement)
   */
  newPattern: "ObsidianLinks.extractNoteTitle(note.path, note.frontmatter)";

  /**
   * Code locations to update (MCP-33: Core tools)
   */
  coreToolLocations: [
    "src/index.ts:~1464 (read_note)",
    "src/index.ts:~1529 (edit_note)",
    "src/index.ts:~2150 (insert_content)"
  ];

  /**
   * Code locations to update (MCP-34: Search tools)
   */
  searchToolLocations: [
    "src/index.ts:~892 (search - first occurrence)",
    "src/index.ts:~1085 (search - second occurrence)",
    "src/index.ts:~1549 (search_notes)",
    "src/index.ts:~1765 (advanced_search)",
    "src/index.ts:~1806 (quick_search)",
    "src/index.ts:~1839 (search_by_content_type)",
    "src/index.ts:~1868 (search_recent)",
    "src/tool-router.ts:~247 (pattern mode in universal search)"
  ];

  /**
   * Required import statement for all modified files
   */
  requiredImport: "import { ObsidianLinks } from './obsidian-links.js';";
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Existing interfaces this implementation must conform to
 *
 * @contract Integration requirements
 */
export interface ExistingInterfaceConformance {
  /**
   * Works with existing LifeOSNote interface
   */
  noteInterface: "LifeOSNote";

  /**
   * Uses existing YAMLFrontmatter interface
   */
  frontmatterInterface: "YAMLFrontmatter";

  /**
   * Integrates with existing systems (no changes required)
   */
  integrationPoints: {
    searchEngine: false; // No changes needed
    templateSystem: false; // No changes needed
    yamlManager: false; // No changes needed
    analytics: false; // No changes needed
    vaultUtils: false; // No changes needed
  };

  /**
   * Modified systems
   */
  modifiedSystems: {
    obsidianLinks: true; // Primary change location
    toolHandlers: true; // 13 tool response formatters updated
  };
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error handling for title extraction
 *
 * This is a utility method that should NOT throw errors.
 * All edge cases should return reasonable fallback values.
 */
export interface TitleExtractionErrorHandling {
  /**
   * MUST NOT throw errors for any input
   * Even malformed inputs should return a reasonable title
   */
  throwsErrors: false;

  /**
   * Fallback behaviors for edge cases
   */
  edgeCases: {
    /**
     * Empty file path → Returns empty string or filename
     */
    emptyPath: {
      behavior: "Return empty string or 'Untitled' (acceptable fallback)";
    };

    /**
     * Invalid date format in filename → Treat as regular note
     */
    invalidDateFormat: {
      input: "2025-13-45.md"; // Invalid month/day
      behavior: "Apply filename formatting (spaces, title case)";
      output: "2025 13 45"; // Formatted as regular note
    };

    /**
     * Missing .md extension → Still extract title from basename
     */
    missingExtension: {
      input: "my-note";
      behavior: "Extract title from basename";
      output: "My Note";
    };

    /**
     * Frontmatter exists but title is empty string
     */
    emptyFrontmatterTitle: {
      input: { frontmatter: { title: "" } };
      behavior: "Fallback to filename-based title";
    };
  };
}

// ============================================================================
// VALIDATION CONTRACTS
// ============================================================================

/**
 * How implementation will be validated against these contracts
 */
export interface ValidationStrategy {
  /**
   * Compile-time validation
   */
  typeCheck: {
    command: "npm run typecheck";
    requirement: "MUST pass with zero errors";
    validates: [
      "Method signature matches contract",
      "Parameter types correct",
      "Return type correct",
      "Import statements valid"
    ];
  };

  /**
   * Unit test validation
   */
  unitTests: {
    file: "tests/unit/obsidian-links.test.ts";
    requiredTests: [
      "Daily note without frontmatter → formatted date",
      "Daily note with frontmatter.title → uses frontmatter",
      "Regular note without frontmatter → formatted filename",
      "Regular note with frontmatter.title → uses frontmatter",
      "Timezone handling: 2025-08-30 → August 30, 2025 (not August 29)",
      "Invalid date format → formatted as regular note",
      "Empty frontmatter.title → fallback to filename"
    ];
  };

  /**
   * Integration test validation
   */
  integrationTests: {
    scope: "Manual testing with Claude Desktop";
    requiredValidation: [
      "insert_content shows correct title for daily notes",
      "read_note shows correct title for daily notes",
      "edit_note shows correct title for daily notes",
      "All search tools show correct titles for daily notes",
      "Clickable links display correct dates (timezone fix verified)",
      "No regression: regular notes still display correctly"
    ];
  };
}

// ============================================================================
// ACCEPTANCE CRITERIA CONTRACTS
// ============================================================================

/**
 * Acceptance criteria from Linear issue MCP-29
 *
 * Implementation MUST satisfy ALL criteria
 */
export interface AcceptanceCriteriaContract {
  /**
   * AC1: All 10+ affected tools must show actual filename
   */
  criteriaOne: {
    requirement: "Show '2025-08-30' instead of 'Untitled' for daily notes";
    affectedTools: 13; // 13 code locations
    validationMethod: "Manual testing of each tool with daily note";
    status: "MUST PASS";
  };

  /**
   * AC2: Clickable links must show correct date (timezone fix)
   */
  criteriaTwo: {
    requirement: "File '2025-08-30.md' shows 'August 30, 2025' not 'August 29, 2025'";
    rootCause: "UTC parsing bug in extractNoteTitle()";
    fix: "Use parseISO() from date-fns";
    validationMethod: "Test in timezone that would cause shift (e.g., EST)";
    status: "MUST PASS";
  };

  /**
   * AC3: Response text vs clickable link formatting
   */
  criteriaThree: {
    requirement: "Response text uses exact filename, clickable links use formatted dates";
    responseText: "Updated note: **2025-08-30**";
    clickableLink: "🔗 [Open in Obsidian: August 30, 2025](obsidian://...)";
    distinction: "Technical accuracy (response) vs user readability (links)";
    status: "MUST PASS";
  };

  /**
   * AC4: Single source of truth
   */
  criteriaFour: {
    requirement: "extractNoteTitle() is THE method for all title extraction";
    implementation: "All 13 locations use ObsidianLinks.extractNoteTitle()";
    validation: "Code search for 'frontmatter.title' OR 'Untitled' shows zero duplicates";
    status: "MUST PASS";
  };

  /**
   * AC5: No regression
   */
  criteriaFive: {
    requirement: "Non-daily-note files must display titles exactly as before";
    testCases: [
      "Note with frontmatter.title → shows frontmatter.title",
      "Note without frontmatter.title → shows formatted filename",
      "Template-generated notes → shows correct titles"
    ];
    validationMethod: "Regression testing with existing notes";
    status: "MUST PASS";
  };
}

// ============================================================================
// IMPLEMENTATION CHECKLIST CONTRACT
// ============================================================================

/**
 * Step-by-step implementation checklist
 * Implementation MUST complete all steps
 */
export interface ImplementationChecklist {
  /**
   * Phase 1: Enhance extractNoteTitle (MCP-31 + MCP-32)
   */
  phaseOne: {
    steps: [
      "Add imports: import { parseISO, format } from 'date-fns';",
      "Change method visibility: private → public",
      "Add frontmatter parameter: frontmatter?: YAMLFrontmatter | Record<string, any>",
      "Add frontmatter.title check at method start",
      "Replace new Date(filename) with parseISO(filename)",
      "Replace toLocaleDateString() with format(date, 'MMMM dd, yyyy')",
      "Add JSDoc comments explaining timezone fix"
    ];
    file: "src/obsidian-links.ts";
    estimatedTime: "30 minutes";
  };

  /**
   * Phase 2: Update core tools (MCP-33)
   */
  phaseTwo: {
    steps: [
      "Add import to src/index.ts: import { ObsidianLinks } from './obsidian-links.js';",
      "Update read_note tool (~line 1464)",
      "Update edit_note tool (~line 1529)",
      "Update insert_content tool (~line 2150)",
      "Replace pattern in each: note.frontmatter.title || 'Untitled' → ObsidianLinks.extractNoteTitle(note.path, note.frontmatter)"
    ];
    file: "src/index.ts";
    affectedLines: [1464, 1529, 2150];
    estimatedTime: "20 minutes";
  };

  /**
   * Phase 3: Update search tools (MCP-34)
   */
  phaseThree: {
    steps: [
      "Update search tool - first occurrence (~line 892)",
      "Update search tool - second occurrence (~line 1085)",
      "Update search_notes (~line 1549)",
      "Update advanced_search (~line 1765)",
      "Update quick_search (~line 1806)",
      "Update search_by_content_type (~line 1839)",
      "Update search_recent (~line 1868)",
      "Update tool-router.ts pattern mode (~line 247)",
      "Add import to tool-router.ts if needed"
    ];
    files: ["src/index.ts", "src/tool-router.ts"];
    affectedLines: [892, 1085, 1549, 1765, 1806, 1839, 1868, 247];
    estimatedTime: "40 minutes";
  };

  /**
   * Phase 4: Testing and validation
   */
  phaseFour: {
    steps: [
      "Run npm run typecheck (must pass)",
      "Create/update unit tests for extractNoteTitle()",
      "Test timezone handling with daily notes",
      "Test all 13 affected code locations manually",
      "Verify clickable links show correct dates",
      "Verify no regression with regular notes"
    ];
    estimatedTime: "1-2 hours";
  };
}

// ============================================================================
// NOTES AND RATIONALE
// ============================================================================

/**
 * Design decisions and rationale for this contract
 */
export const DESIGN_RATIONALE = {
  /**
   * Why use optional frontmatter parameter?
   *
   * Provides flexibility: method can work with just file path (backward compatible)
   * or with full note context (preferred for new code).
   */
  optionalFrontmatter: "Backward compatibility + enhanced functionality",

  /**
   * Why parseISO() instead of new Date()?
   *
   * new Date("2025-08-30") creates UTC date at midnight, which may be previous
   * day in negative UTC offset timezones (EST, PST, etc.).
   * parseISO() parses as local date without timezone conversion.
   */
  parseISOChoice: "Timezone-aware parsing prevents day shift bug",

  /**
   * Why format() from date-fns instead of toLocaleDateString()?
   *
   * Consistency with get_daily_note tool which already uses date-fns format().
   * More predictable formatting across different locales.
   */
  dateFnsFormat: "Consistency with existing codebase patterns",

  /**
   * Why consolidate all tools at once?
   *
   * Single PR, comprehensive fix, no partial state, faster completion.
   */
  consolidatedApproach: "Efficiency and completeness",

  /**
   * Why no error throwing?
   *
   * extractNoteTitle() is a formatting utility, not a critical operation.
   * Returning reasonable fallback is better than breaking tool responses.
   */
  noErrorThrowing: "Graceful degradation better than failure",
} as const;

/**
 * All contract types are exported individually above.
 * Contract files contain type definitions only - no runtime values to export.
 */
