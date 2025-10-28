/**
 * Implementation Contracts for Linear Issue: MCP-59
 * Issue: Multi-word search queries (3+ words) return 0 results
 *
 * These contracts define the expected behavior and data structures
 * for the multi-word search fix. All implementation code MUST conform to
 * these interface definitions.
 *
 * @since 2025-10-22
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Query strategy for handling multi-word search queries
 * @since MCP-59
 */
export type QueryStrategy =
  | 'exact_phrase'  // Current behavior: match words in exact sequence
  | 'all_terms'     // AND logic: match all terms in any order
  | 'any_term'      // OR logic: match any term
  | 'auto';         // Intelligent detection based on query

/**
 * Query parsing result for multi-word processing
 * @since MCP-59
 */
export interface ParsedQuery {
  /** Original query string */
  original: string;
  /** Extracted individual terms */
  terms: string[];
  /** Normalized terms (lowercase, trimmed) */
  normalizedTerms: string[];
  /** Detected or specified strategy */
  strategy: QueryStrategy;
  /** Whether query contains regex special chars */
  hasRegexChars: boolean;
  /** Whether query is wrapped in quotes */
  isQuoted: boolean;
}

// ============================================================================
// INTERFACE EXTENSIONS
// ============================================================================

/**
 * Extension to AdvancedSearchOptions for query strategy support
 * To be added to src/search-engine.ts:AdvancedSearchOptions
 */
export interface QueryStrategyExtension {
  /**
   * Strategy for handling multi-word queries
   * @default 'auto' - Automatically detects based on word count and query structure
   * @since MCP-59
   */
  queryStrategy?: QueryStrategy;
}

/**
 * Extension to UniversalSearchOptions for query strategy support
 * To be added to src/tool-router.ts:UniversalSearchOptions
 */
export interface UniversalSearchQueryStrategyExtension {
  /**
   * Strategy for handling multi-word queries
   * Inherited from AdvancedSearchOptions
   * @since MCP-59
   */
  queryStrategy?: QueryStrategy;
}

// ============================================================================
// QUERY PARSER UTILITY CONTRACT
// ============================================================================

/**
 * Utility class for parsing and analyzing search queries
 * To be implemented in src/query-parser.ts
 * @since MCP-59
 */
export interface QueryParserContract {
  /**
   * Parse a query string into structured components
   * @param query - Raw query string
   * @returns Parsed query with terms and detected strategy
   */
  parse(query: string): ParsedQuery;

  /**
   * Extract individual terms from a query
   * Handles quoted strings as single terms
   * @param query - Raw query string
   * @returns Array of extracted terms
   */
  extractTerms(query: string): string[];

  /**
   * Normalize terms for consistent matching
   * @param terms - Array of raw terms
   * @returns Normalized terms (lowercase, trimmed)
   */
  normalizeTerms(terms: string[]): string[];

  /**
   * Auto-detect appropriate query strategy
   * Detection logic:
   * 1. Quoted strings → exact_phrase
   * 2. Contains " OR " → any_term
   * 3. 1-2 words → exact_phrase
   * 4. 3+ words → all_terms
   *
   * @param query - Raw query string
   * @returns Detected strategy based on query characteristics
   */
  detectStrategy(query: string): QueryStrategy;

  /**
   * Check if query contains regex special characters
   * @param query - Query string to check
   * @returns True if contains regex chars (excluding spaces)
   */
  hasRegexChars(query: string): boolean;

  /**
   * Check if query is wrapped in quotes
   * @param query - Query string to check
   * @returns True if wrapped in quotes
   */
  isQuoted(query: string): boolean;

  /**
   * Create regex patterns for different strategies
   * @param terms - Normalized terms to match
   * @param strategy - Query strategy to apply
   * @param caseSensitive - Case sensitivity flag
   * @returns Array of regex patterns
   */
  createPatterns(
    terms: string[],
    strategy: QueryStrategy,
    caseSensitive: boolean
  ): RegExp[];
}

// ============================================================================
// SEARCH ENGINE METHOD CONTRACTS
// ============================================================================

/**
 * Enhanced SearchEngine.createRegex signature
 * Location: src/search-engine.ts:74-81
 */
export interface CreateRegexContract {
  /**
   * Create regex pattern(s) based on query strategy
   *
   * @param query - Query string
   * @param caseSensitive - Case sensitivity flag
   * @param useRegex - Whether query is a regex
   * @param queryStrategy - Strategy for multi-word queries
   * @returns Single regex for exact_phrase, array for other strategies
   *
   * @since MCP-59 - Added queryStrategy parameter
   *
   * @example exact_phrase
   * createRegex("trip india", false, false, 'exact_phrase')
   * // Returns: /trip india/gi
   *
   * @example all_terms
   * createRegex("trip india november", false, false, 'all_terms')
   * // Returns: /(?=.*\btrip\b)(?=.*\bindia\b)(?=.*\bnovember\b)/gi
   *
   * @example any_term
   * createRegex("trip india", false, false, 'any_term')
   * // Returns: /\b(trip|india)\b/gi
   */
  (
    query: string,
    caseSensitive?: boolean,
    useRegex?: boolean,
    queryStrategy?: QueryStrategy
  ): RegExp | RegExp[];
}

/**
 * Enhanced SearchEngine.findMatches signature
 * Location: src/search-engine.ts:96-125
 */
export interface FindMatchesContract {
  /**
   * Find matches with strategy support
   *
   * @param text - Text to search in
   * @param query - Query string
   * @param type - Match type
   * @param field - Optional field name
   * @param caseSensitive - Case sensitivity flag
   * @param useRegex - Whether query is a regex
   * @param queryStrategy - Strategy for multi-word queries
   * @returns Array of matches
   *
   * @since MCP-59 - Added queryStrategy parameter
   */
  (
    text: string,
    query: string,
    type: 'title' | 'content' | 'frontmatter',
    field?: string,
    caseSensitive?: boolean,
    useRegex?: boolean,
    queryStrategy?: QueryStrategy
  ): Array<{
    type: 'title' | 'content' | 'frontmatter';
    field?: string;
    text: string;
    context: string;
    position: number;
    length: number;
  }>;
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Query Strategy Behavior Contract
 *
 * MUST implement these behaviors:
 *
 * exact_phrase (default for 1-2 words):
 * - Query: "trip india"
 * - Matches: "trip to india" (sequential)
 * - No match: "india trip" (wrong order)
 *
 * all_terms (default for 3+ words):
 * - Query: "trip to india november"
 * - Matches: "november india trip" (all terms present)
 * - No match: "trip to france" (missing terms)
 *
 * any_term:
 * - Query: "trip india november"
 * - Matches: "india vacation" (has "india")
 * - Matches: "november plans" (has "november")
 *
 * auto:
 * - 1-2 words → exact_phrase
 * - 3+ words → all_terms
 * - Quoted → exact_phrase
 * - "OR" keyword → any_term
 */
export interface QueryStrategyBehavior {
  exact_phrase: {
    description: "Match words in exact sequence";
    example_query: "trip india";
    matches: "trip to india" | "trip india";
    no_match: "india trip";
  };

  all_terms: {
    description: "Match all terms in any order";
    example_query: "trip to india november";
    matches: "november india trip" | "trip planning for india in november";
    no_match: "trip to france";
  };

  any_term: {
    description: "Match any term (OR logic)";
    example_query: "trip india november";
    matches: "india vacation" | "november plans" | "trip to france";
    no_match: "vacation planning";
  };

  auto: {
    description: "Intelligent detection";
    detection_rules: {
      quoted: "exact_phrase";
      has_or_keyword: "any_term";
      word_count_1_2: "exact_phrase";
      word_count_3_plus: "all_terms";
    };
  };
}

/**
 * Auto-Detection Logic Contract
 *
 * Priority order (first match wins):
 * 1. Explicit queryStrategy parameter
 * 2. Quoted strings → exact_phrase
 * 3. Contains " OR " → any_term
 * 4. Word count:
 *    - 1-2 words → exact_phrase
 *    - 3+ words → all_terms
 */
export interface AutoDetectionLogic {
  priority: [
    "explicit_parameter",
    "quoted_strings",
    "or_keyword",
    "word_count"
  ];

  rules: {
    explicit_parameter: "Use provided queryStrategy value";
    quoted_strings: "Query wrapped in quotes → exact_phrase";
    or_keyword: "Contains ' OR ' (case-insensitive) → any_term";
    word_count: "1-2 words → exact_phrase, 3+ words → all_terms";
  };
}

/**
 * Backward Compatibility Contract
 *
 * MUST maintain:
 * - No breaking changes to existing API
 * - queryStrategy is optional, defaults to 'auto'
 * - Current behavior preserved for 1-2 word queries
 * - Existing tests continue to pass
 */
export interface BackwardCompatibilityContract {
  no_breaking_changes: true;
  queryStrategy_optional: true;
  default_value: "auto";
  one_two_word_behavior: "unchanged (exact_phrase)";
  existing_tests: "must pass without modification";
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error Handling Contract
 *
 * No new error types introduced. Existing error handling applies:
 * - Empty query: Return empty results (no error)
 * - Invalid regex: Fallback to literal search
 * - Malformed strategy: Default to 'auto'
 *
 * Graceful degradation:
 * - Unknown strategy → 'auto'
 * - Regex parse error → literal search
 * - No matches with all_terms → No automatic fallback to any_term
 *
 * @throws No new exceptions introduced
 */
export interface ErrorHandlingContract {
  no_new_exceptions: true;
  empty_query: "Return empty results";
  invalid_regex: "Fallback to literal search";
  malformed_strategy: "Default to 'auto'";
  unknown_strategy: "Default to 'auto'";
  regex_parse_error: "Fallback to literal search";
  no_automatic_fallback: true;
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Integration Contract
 *
 * SearchEngine Integration:
 * - createRegex() accepts queryStrategy parameter
 * - findMatches() passes strategy through call chain
 * - search() auto-detects strategy if not specified
 *
 * ToolRouter Integration:
 * - detectSearchMode() remains unchanged
 * - executeSearch() passes queryStrategy to SearchEngine
 * - Quick search mode benefits from multi-word fix
 *
 * MCP Tool Interface:
 * - 'search' tool accepts optional query_strategy parameter
 * - Parameter exposed in tool schema
 * - Defaults maintain current behavior for AI compatibility
 */
export interface IntegrationContract {
  SearchEngine: {
    createRegex: "Accepts queryStrategy parameter";
    findMatches: "Passes strategy through call chain";
    search: "Auto-detects strategy if not specified";
  };

  ToolRouter: {
    detectSearchMode: "Remains unchanged";
    executeSearch: "Passes queryStrategy to SearchEngine";
    quick_search: "Benefits from multi-word fix";
  };

  MCPTool: {
    search_tool: "Accepts optional query_strategy parameter";
    tool_schema: "Parameter exposed in schema";
    defaults: "Maintain current behavior";
  };
}

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Test Coverage Requirements
 *
 * Unit Tests (tests/unit/query-parser.test.ts):
 * - Term extraction with various inputs
 * - Strategy detection logic
 * - Quote handling
 * - Regex character detection
 *
 * Unit Tests (tests/unit/search-engine.test.ts):
 * - createRegex with different strategies
 * - findMatches with multi-word queries
 * - Backward compatibility for 1-2 words
 * - 3+ word all_terms matching
 *
 * Integration Tests:
 * - End-to-end search with various strategies
 * - Tool router with multi-word queries
 * - MCP tool interface with query_strategy
 *
 * Regression Tests:
 * - Existing search behavior unchanged for 1-2 words
 * - OR query handling preserved
 * - Advanced search options compatibility
 */
export interface TestingContract {
  unit_tests: {
    query_parser: [
      "Term extraction",
      "Strategy detection",
      "Quote handling",
      "Regex char detection"
    ];
    search_engine: [
      "createRegex strategies",
      "findMatches multi-word",
      "Backward compatibility",
      "3+ word all_terms"
    ];
  };

  integration_tests: [
    "End-to-end search",
    "Tool router integration",
    "MCP tool interface"
  ];

  regression_tests: [
    "1-2 word behavior unchanged",
    "OR query handling",
    "Advanced options compatibility"
  ];
}

// ============================================================================
// PERFORMANCE CONTRACTS
// ============================================================================

/**
 * Performance Contract
 *
 * Complexity:
 * - exact_phrase: O(n) single regex match
 * - all_terms: O(n*m) where m = term count
 * - any_term: O(n*m) with early termination
 *
 * Optimization:
 * - Pre-compile regex patterns
 * - Cache parsed queries for repeated searches
 * - Short-circuit evaluation for any_term
 *
 * Memory:
 * - No significant increase in memory usage
 * - Regex patterns garbage collected after search
 * - ParsedQuery objects are lightweight
 */
export interface PerformanceContract {
  complexity: {
    exact_phrase: "O(n)";
    all_terms: "O(n*m) where m = term count";
    any_term: "O(n*m) with early termination";
  };

  optimization: [
    "Pre-compile regex patterns",
    "Cache parsed queries",
    "Short-circuit evaluation"
  ];

  memory: {
    increase: "minimal";
    regex_gc: "After search completion";
    parsed_query_size: "lightweight";
  };
}

// ============================================================================
// SUCCESS METRICS
// ============================================================================

/**
 * Success Criteria
 *
 * From MCP-59 Planning Phase:
 * - Query "trip to india november planning" finds India trip note ✓
 * - 1-2 word queries maintain exact phrase behavior ✓
 * - SearchEngine test coverage: 0% → 80%+ ✓
 * - Performance: <100ms for 1000 notes ✓
 */
export interface SuccessMetrics {
  functional: {
    multi_word_search: "3+ word queries return results";
    specific_case: "trip to india november planning → finds India note";
    backward_compat: "1-2 word queries unchanged";
  };

  quality: {
    test_coverage: "SearchEngine: 0% → 80%+";
    regression_tests: "100% pass rate";
  };

  performance: {
    search_time: "<100ms for 1000 notes";
    token_usage: "No significant increase";
  };
}
