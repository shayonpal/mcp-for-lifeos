/**
 * Implementation Contracts for Linear Issue: MCP-89
 * Issue: Consolidate .md extension stripping logic into shared utility
 *
 * These contracts define the expected behavior and data structures
 * for creating a shared path utility that eliminates code duplication.
 * All implementation code MUST conform to these interface definitions.
 *
 * @since 2025-10-26
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Path utility function signature for .md extension stripping
 * @since MCP-89
 */
export type StripMdExtensionFunction = (filename: string) => string;

/**
 * Regex constant for .md extension matching
 * Used to ensure consistent pattern across all usage locations
 * @since MCP-89
 */
export type MdExtensionRegex = RegExp;

// ============================================================================
// UTILITY FUNCTION CONTRACT
// ============================================================================

/**
 * Contract for stripMdExtension utility function
 * To be implemented in src/path-utils.ts
 *
 * Removes trailing .md extension from filename while preserving:
 * - Directory path components
 * - Non-.md extensions
 * - Multiple .md extensions (only strips final .md)
 *
 * @since MCP-89
 */
export interface StripMdExtensionContract {
  /**
   * Strip .md extension from filename or path
   *
   * @param filename - Filename or path with optional .md extension
   * @returns Filename/path with trailing .md removed
   *
   * @example Basic usage
   * stripMdExtension("template.md") // Returns "template"
   * stripMdExtension("template") // Returns "template"
   *
   * @example Edge cases
   * stripMdExtension("") // Returns ""
   * stripMdExtension("template.md.md") // Returns "template.md"
   * stripMdExtension("my.mdfile.md") // Returns "my.mdfile"
   *
   * @example Path preservation
   * stripMdExtension("folder/template.md") // Returns "folder/template"
   * stripMdExtension("/absolute/path/note.md") // Returns "/absolute/path/note"
   *
   * @since MCP-89
   */
  (filename: string): string;
}

/**
 * Constant contract for regex pattern
 * To be exported from src/path-utils.ts
 *
 * Pattern: /\.md$/
 * - Matches literal ".md" at end of string
 * - Does not match ".md" in middle of filename
 * - Prevents incorrect replacements like "my.mdfile.md" → "myfile.md"
 *
 * @since MCP-89
 */
export interface MdExtensionRegexContract {
  pattern: "/\\.md$/";
  flags: undefined;
  description: "Matches .md extension at end of string only";
}

// ============================================================================
// REFACTORING LOCATIONS CONTRACT
// ============================================================================

/**
 * Code locations to be refactored
 * All 5 instances must be replaced with shared utility
 *
 * @since MCP-89
 */
export interface RefactoringLocationsContract {
  locations: [
    {
      file: "src/template-manager.ts";
      line: 90;
      current: "private normalizeTemplateName(name: string): string";
      action: "Remove private method entirely";
    },
    {
      file: "src/template-manager.ts";
      line: 111;
      current: "this.normalizeTemplateName(templateName)";
      action: "Replace with stripMdExtension(templateName)";
    },
    {
      file: "src/obsidian-settings.ts";
      line: 82;
      current: "settings.template.replace(/\\.md$/, '')";
      action: "Replace with stripMdExtension(settings.template)";
    },
    {
      file: "src/search-engine.ts";
      line: 502;
      current: "filename.replace(/\\.md$/, '')";
      action: "Replace with stripMdExtension(filename)";
    },
    {
      file: "src/search-engine.ts";
      line: 545;
      current: "filename.replace(/\\.md$/, '')";
      action: "Replace with stripMdExtension(filename)";
    }
  ];

  imports_required: [
    {
      file: "src/template-manager.ts";
      import: "import { stripMdExtension } from './path-utils.js';";
    },
    {
      file: "src/obsidian-settings.ts";
      import: "import { stripMdExtension } from './path-utils.js';";
    },
    {
      file: "src/search-engine.ts";
      import: "import { stripMdExtension } from './path-utils.js';";
    }
  ];
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors that MUST be maintained
 *
 * MUST:
 * - Strip only trailing .md extension
 * - Preserve directory path components
 * - Handle empty string gracefully
 * - Handle filenames without .md extension
 * - Handle double .md extensions correctly
 * - Use regex pattern /\.md$/ for consistency
 * - Export both function and constant
 *
 * MUST NOT:
 * - Strip .md from middle of filename
 * - Remove directory path
 * - Throw exceptions on edge cases
 * - Modify input parameter
 * - Use string.replace() without regex
 * - Use path.basename() (removes directory)
 *
 * @since MCP-89
 */
export interface BehavioralContract {
  must: [
    "Strip only trailing .md extension",
    "Preserve directory path components",
    "Handle empty string gracefully",
    "Handle filenames without .md extension",
    "Handle double .md extensions correctly (template.md.md → template.md)",
    "Use regex pattern /\\.md$/ for consistency",
    "Export both function and constant"
  ];

  must_not: [
    "Strip .md from middle of filename (my.mdfile.md → myfile.md is WRONG)",
    "Remove directory path components",
    "Throw exceptions on edge cases",
    "Modify input parameter (pure function)",
    "Use string.replace() without regex",
    "Use path.basename() (removes directory structure)"
  ];
}

/**
 * Edge cases that MUST be handled correctly
 *
 * @since MCP-89
 */
export interface EdgeCasesContract {
  empty_string: {
    input: "";
    output: "";
    behavior: "Return empty string unchanged";
  };

  no_extension: {
    input: "template";
    output: "template";
    behavior: "Return filename unchanged";
  };

  double_extension: {
    input: "template.md.md";
    output: "template.md";
    behavior: "Strip only final .md extension";
  };

  md_in_middle: {
    input: "my.mdfile.md";
    output: "my.mdfile";
    behavior: "Preserve .md in middle, strip only trailing";
  };

  with_directory: {
    input: "folder/subfolder/note.md";
    output: "folder/subfolder/note";
    behavior: "Preserve directory path, strip extension";
  };

  absolute_path: {
    input: "/absolute/path/to/note.md";
    output: "/absolute/path/to/note";
    behavior: "Preserve absolute path, strip extension";
  };

  other_extension: {
    input: "document.txt";
    output: "document.txt";
    behavior: "Do not strip non-.md extensions";
  };

  multiple_dots: {
    input: "my.note.file.md";
    output: "my.note.file";
    behavior: "Preserve all dots except final .md";
  };
}

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Test coverage requirements
 *
 * Unit Tests (tests/unit/path-utils.test.ts):
 * - Basic functionality (with/without .md)
 * - Edge cases (empty, no ext, double .md)
 * - Path preservation (relative, absolute)
 * - Multiple dots in filename
 * - Non-.md extensions
 *
 * Integration Tests:
 * - Template manager tests continue passing (12 tests)
 * - Search engine tests continue passing
 * - Obsidian settings tests continue passing
 * - No behavioral changes in existing functionality
 *
 * Regression Tests:
 * - All existing tests pass without modification
 * - TypeScript compilation succeeds
 * - No runtime errors introduced
 *
 * @since MCP-89
 */
export interface TestingContract {
  unit_tests: {
    file: "tests/unit/path-utils.test.ts";
    test_cases: [
      "Basic: stripMdExtension('template.md') === 'template'",
      "No extension: stripMdExtension('template') === 'template'",
      "Empty string: stripMdExtension('') === ''",
      "Double extension: stripMdExtension('template.md.md') === 'template.md'",
      "Middle .md: stripMdExtension('my.mdfile.md') === 'my.mdfile'",
      "With directory: stripMdExtension('folder/note.md') === 'folder/note'",
      "Absolute path: stripMdExtension('/path/note.md') === '/path/note'",
      "Other extension: stripMdExtension('doc.txt') === 'doc.txt'",
      "Multiple dots: stripMdExtension('my.note.file.md') === 'my.note.file'"
    ];
    minimum_coverage: "100% function coverage";
  };

  integration_tests: {
    template_manager: "All 12 tests continue passing";
    search_engine: "Existing tests unchanged";
    obsidian_settings: "No behavioral changes";
  };

  regression_tests: {
    existing_suite: "100% pass rate required";
    typecheck: "npm run typecheck succeeds";
    no_runtime_errors: "Clean execution";
  };
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Integration points with existing code
 *
 * Template Manager:
 * - Remove private normalizeTemplateName method
 * - Replace calls with stripMdExtension import
 * - Maintain exact same behavior
 *
 * Search Engine:
 * - Replace inline .replace() calls (lines 502, 545)
 * - Import stripMdExtension
 * - No changes to search logic
 *
 * Obsidian Settings:
 * - Replace inline .replace() call (line 82)
 * - Import stripMdExtension
 * - No changes to settings processing
 *
 * @since MCP-89
 */
export interface IntegrationContract {
  TemplateManager: {
    remove: "private normalizeTemplateName method (line 90)";
    replace: "this.normalizeTemplateName() → stripMdExtension()";
    behavior: "Exact same template name normalization";
  };

  SearchEngine: {
    replace: [
      "Line 502: filename.replace(/\\.md$/, '') → stripMdExtension(filename)",
      "Line 545: filename.replace(/\\.md$/, '') → stripMdExtension(filename)"
    ];
    behavior: "Exact same filename title extraction";
  };

  ObsidianSettings: {
    replace: "Line 82: settings.template.replace(/\\.md$/, '') → stripMdExtension(settings.template)";
    behavior: "Exact same template path handling";
  };

  imports: {
    format: "import { stripMdExtension } from './path-utils.js';";
    locations: ["template-manager.ts", "search-engine.ts", "obsidian-settings.ts"];
  };
}

// ============================================================================
// FILE STRUCTURE CONTRACT
// ============================================================================

/**
 * New file structure requirements
 *
 * src/path-utils.ts:
 * - Export stripMdExtension function
 * - Export MD_EXTENSION_REGEX constant
 * - Comprehensive JSDoc with examples
 * - Pure function (no side effects)
 * - TypeScript strict mode compliant
 *
 * tests/unit/path-utils.test.ts:
 * - Jest test suite
 * - 100% function coverage
 * - All edge cases tested
 * - Clear test descriptions
 *
 * @since MCP-89
 */
export interface FileStructureContract {
  source_file: {
    path: "src/path-utils.ts";
    exports: [
      "stripMdExtension function",
      "MD_EXTENSION_REGEX constant"
    ];
    documentation: "Comprehensive JSDoc with @example blocks";
    style: "Matches text-utils.ts pattern from MCP-59";
  };

  test_file: {
    path: "tests/unit/path-utils.test.ts";
    framework: "Jest";
    structure: "describe/test blocks";
    coverage: "100% function coverage required";
  };

  pattern_reference: {
    similar_to: "src/text-utils.ts (created in MCP-59)";
    follows: "Shared utility pattern for code consolidation";
  };
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error handling contract
 *
 * No exceptions should be thrown:
 * - Empty string: Return ""
 * - Invalid input: Graceful handling
 * - Edge cases: Predictable behavior
 *
 * Pure function contract:
 * - No mutations
 * - No side effects
 * - Deterministic output
 * - No I/O operations
 *
 * @since MCP-89
 */
export interface ErrorHandlingContract {
  no_exceptions: true;
  empty_string_handling: "Return empty string";
  invalid_input: "Graceful degradation";
  edge_cases: "Predictable, documented behavior";
  pure_function: {
    no_mutations: true;
    no_side_effects: true;
    deterministic: true;
    no_io: true;
  };
}

// ============================================================================
// BACKWARD COMPATIBILITY CONTRACT
// ============================================================================

/**
 * Backward compatibility requirements
 *
 * MUST maintain:
 * - Exact same behavior as existing inline replacements
 * - No changes to function signatures in calling code
 * - All existing tests pass without modification
 * - TypeScript compilation succeeds
 * - No runtime errors introduced
 * - No performance degradation
 *
 * @since MCP-89
 */
export interface BackwardCompatibilityContract {
  exact_behavior: "Matches existing .replace(/\\.md$/, '') behavior";
  no_signature_changes: "Only imports change in calling code";
  existing_tests_pass: "100% pass rate without test modifications";
  typescript_succeeds: "npm run typecheck passes";
  no_runtime_errors: "Clean execution";
  no_performance_impact: "Negligible difference";
}

// ============================================================================
// SUCCESS METRICS
// ============================================================================

/**
 * Success criteria from MCP-89 acceptance criteria
 *
 * From Linear Issue:
 * ✅ Single shared utility replaces all 5 instances
 * ✅ Consistent regex pattern /\.md$/ used everywhere
 * ✅ Comprehensive JSDoc with edge case documentation
 * ✅ Unit tests cover edge cases
 * ✅ All existing tests pass (no behavioral changes)
 * ✅ TypeScript compilation clean
 *
 * @since MCP-89
 */
export interface SuccessMetrics {
  functional: {
    consolidation: "5 instances → 1 shared utility";
    consistency: "Single regex pattern /\\.md$/ everywhere";
    correctness: "All edge cases handled properly";
  };

  quality: {
    documentation: "Comprehensive JSDoc with edge case examples";
    test_coverage: "100% function coverage with edge case tests";
    existing_tests: "100% pass rate (12 template tests + others)";
  };

  technical: {
    typescript: "npm run typecheck succeeds";
    no_regressions: "No behavioral changes";
    pattern_compliance: "Follows text-utils.ts pattern from MCP-59";
  };
}
