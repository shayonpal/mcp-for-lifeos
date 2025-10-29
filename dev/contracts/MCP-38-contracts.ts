/**
 * Implementation contracts for Linear Issue: MCP-38
 * Issue: Implement ~25K token limit per response with smart truncation
 *
 * These contracts define the expected behavior and data structures
 * for the implementation. All implementation code MUST conform to
 * these interface definitions.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-38
 */

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Token budget configuration for response size limiting
 *
 * Provides token/character limits to prevent AI context overflow.
 * Uses character estimation (4 chars ≈ 1 token) for performance.
 */
export interface TokenBudgetConfig {
  /** Maximum tokens allowed (~25K default) */
  maxTokens: number;

  /** Maximum characters allowed (~100K default, derived from maxTokens * 4) */
  maxCharacters: number;

  /** Character-to-token estimation ratio (default: 4) */
  estimationRatio: number;
}

/**
 * Enhanced search options with token limiting
 *
 * Extends UniversalSearchOptions with token budget parameters.
 * Maintains backward compatibility through optional parameters.
 */
export interface TokenLimitedSearchOptions {
  /** All existing search options */
  query?: string;
  mode?: 'auto' | 'advanced' | 'quick' | 'content_type' | 'recent' | 'pattern';
  contentType?: string | string[];
  tags?: string[];
  maxResults?: number;
  format?: 'concise' | 'detailed';
  // ... all other UniversalSearchOptions fields

  /** NEW: Token budget configuration (optional for backward compatibility) */
  tokenBudget?: TokenBudgetConfig;

  /** NEW: Enable auto-downgrade from detailed to concise (default: false) */
  enableAutoDowngrade?: boolean;
}

/**
 * Enhanced list options with token limiting
 *
 * Extends UniversalListOptions with token budget parameters.
 */
export interface TokenLimitedListOptions {
  type: 'folders' | 'daily_notes' | 'templates' | 'yaml_properties' | 'auto';
  path?: string;
  limit?: number;
  format?: 'concise' | 'detailed';
  // ... all other UniversalListOptions fields

  /** NEW: Token budget configuration (optional for backward compatibility) */
  tokenBudget?: TokenBudgetConfig;
}

/**
 * YAML property value listing options with token limiting
 *
 * Special handling for properties with 100+ unique values.
 */
export interface TokenLimitedYamlPropertyOptions {
  /** Property name to list values for */
  propertyName?: string;

  /** Include count of notes using each value */
  includeCount?: boolean;

  /** Sort method for values */
  sortBy?: 'count' | 'alphabetical';

  /** Exclude standard LifeOS properties */
  excludeStandard?: boolean;

  /** NEW: Maximum examples per property value (default: 3) */
  maxExamplesPerValue?: number;

  /** NEW: Token budget configuration */
  tokenBudget?: TokenBudgetConfig;
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Truncation metadata for responses exceeding limits
 *
 * Provides transparent feedback when results are truncated.
 */
export interface TruncationMetadata {
  /** Whether truncation occurred */
  truncated: boolean;

  /** Number of results shown */
  shownCount: number;

  /** Total results available before truncation */
  totalCount: number;

  /** Type of limit that caused truncation */
  limitType: 'token' | 'result' | 'both';

  /** Format used in response */
  formatUsed: 'concise' | 'detailed';

  /** Whether auto-downgrade from detailed to concise occurred */
  autoDowngraded: boolean;

  /** Estimated tokens consumed */
  estimatedTokens: number;

  /** Estimated characters consumed */
  estimatedCharacters: number;

  /** User-friendly suggestion message */
  suggestion: string;
}

/**
 * Token-aware search response
 *
 * Standard SearchResult[] with optional truncation metadata.
 */
export interface TokenLimitedSearchResponse {
  /** Search results (potentially truncated) */
  results: any[]; // SearchResult[] from search-engine.ts

  /** Truncation information (if applicable) */
  truncation?: TruncationMetadata;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Search mode used */
  mode: string;
}

/**
 * Token-aware list response
 *
 * Standard list results with optional truncation metadata.
 */
export interface TokenLimitedListResponse {
  /** List items (potentially truncated) */
  items: string[] | any[];

  /** Truncation information (if applicable) */
  truncation?: TruncationMetadata;

  /** List type */
  type: string;
}

/**
 * Token-aware YAML property value response
 *
 * Property values with both value-level and example-level truncation.
 */
export interface TokenLimitedYamlPropertyResponse {
  /** Property values with counts and examples */
  values: Array<{
    value: string;
    count: number;
    examples?: string[]; // Note paths (potentially truncated)
    examplesTruncated?: boolean;
  }>;

  /** Overall truncation information */
  truncation?: TruncationMetadata;

  /** Property name */
  propertyName?: string;
}

// ============================================================================
// CORE UTILITY CONTRACTS
// ============================================================================

/**
 * ResponseTruncator utility interface
 *
 * Centralized token budget management and truncation logic.
 * Replaces scattered maxResults slicing across codebase.
 */
export interface IResponseTruncator {
  /** Current available token budget */
  readonly remainingBudget: number;

  /** Total token budget configured */
  readonly totalBudget: number;

  /** Token budget configuration */
  readonly config: TokenBudgetConfig;

  /**
   * Check if adding a result would exceed budget
   * @param formattedResult - Result formatted as string
   * @returns true if result fits within budget
   */
  canAddResult(formattedResult: string): boolean;

  /**
   * Consume budget for a result
   * @param formattedResult - Result formatted as string
   * @throws Error if budget already exceeded
   */
  consumeBudget(formattedResult: string): void;

  /**
   * Generate truncation metadata
   * @param shownCount - Number of results included
   * @param totalCount - Total results available
   * @param formatUsed - Format used in response
   * @param autoDowngraded - Whether auto-downgrade occurred
   * @returns Complete truncation metadata
   */
  getTruncationInfo(
    shownCount: number,
    totalCount: number,
    formatUsed: 'concise' | 'detailed',
    autoDowngraded: boolean
  ): TruncationMetadata;

  /**
   * Estimate tokens for a string
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number;

  /**
   * Reset budget to initial state
   */
  reset(): void;
}

/**
 * Enhanced formatting options for ObsidianLinks methods
 *
 * Extends existing format parameter with token budget tracking.
 */
export interface FormattingOptions {
  /** Response format mode */
  format: 'concise' | 'detailed';

  /** Optional token budget tracker */
  tokenBudget?: IResponseTruncator;

  /** Index number for result */
  index?: number;
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error types that may be thrown during execution
 *
 * @throws TokenBudgetExceededError - When initial result exceeds budget
 * @throws InvalidTokenConfigError - When token configuration is invalid
 */

/**
 * Token budget exceeded error
 *
 * Thrown when even a single result exceeds the token budget.
 * Rare case - typically handled through truncation.
 */
export class TokenBudgetExceededError extends Error {
  constructor(
    public estimatedTokens: number,
    public maxTokens: number,
    public resultIndex: number
  ) {
    super(`Result at index ${resultIndex} exceeds token budget: ${estimatedTokens} > ${maxTokens}`);
    this.name = 'TokenBudgetExceededError';
  }
}

/**
 * Invalid token configuration error
 *
 * Thrown when token budget configuration is invalid.
 */
export class InvalidTokenConfigError extends Error {
  constructor(message: string) {
    super(`Invalid token configuration: ${message}`);
    this.name = 'InvalidTokenConfigError';
  }
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Existing interfaces this implementation must conform to
 *
 * This implementation extends existing MCP server patterns.
 */
export interface ExistingInterfaceConformance {
  /** Extends existing tool router pattern */
  extends: 'ToolRouter';

  /** Integrates with existing systems */
  integrates: {
    /** ObsidianLinks for result formatting */
    obsidianLinks: true;
    /** SearchEngine for search operations */
    searchEngine: true;
    /** VaultUtils for YAML property values */
    vaultUtils: true;
    /** Analytics for telemetry */
    analytics: true;
  };

  /** Maintains backward compatibility */
  backwardCompatible: true;

  /** Optional parameters ensure existing code unaffected */
  optionalParameters: ['tokenBudget', 'enableAutoDowngrade'];
}

// ============================================================================
// MCP TOOL CONTRACT (if applicable)
// ============================================================================

/**
 * MCP tool parameter updates for token limiting
 *
 * Adds maxResults constraints to existing tool schemas.
 */
export interface MCPToolParameterUpdates {
  /** Updated search tool parameters */
  search: {
    maxResults: {
      type: 'number';
      description: 'Max results (1-100, default: 25)';
      minimum: 1;
      maximum: 100;
      default: 25;
    };
  };

  /** Updated list tool parameters */
  list: {
    limit: {
      type: 'number';
      description: 'Limit number of results (1-100)';
      minimum: 1;
      maximum: 100;
    };
  };

  /** Updated list_yaml_property_values parameters */
  list_yaml_property_values: {
    maxValues: {
      type: 'number';
      description: 'Max property values to return (1-100, default: 50)';
      minimum: 1;
      maximum: 100;
      default: 50;
    };
    maxExamplesPerValue: {
      type: 'number';
      description: 'Max example notes per value (1-10, default: 3)';
      minimum: 1;
      maximum: 10;
      default: 3;
    };
  };
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors and side effects
 *
 * MUST:
 * - Validate maxResults parameter (1-100 range)
 * - Apply token budget incrementally during result accumulation
 * - Provide clear truncation messages when limit reached
 * - Maintain backward compatibility (tokenBudget optional)
 * - Use character estimation (4:1 ratio) for performance
 * - Track analytics for token limiting effectiveness
 *
 * MUST NOT:
 * - Block on token counting (use fast character estimation)
 * - Throw errors for normal truncation scenarios
 * - Modify tool behavior when tokenBudget not specified
 * - Count tokens using external libraries in production
 * - Format results that will be truncated (early termination)
 *
 * SHOULD:
 * - Attempt auto-downgrade (detailed → concise) before truncation
 * - Provide actionable suggestions in truncation messages
 * - Log slow truncation operations if telemetry enabled
 * - Cache token estimates per result type for performance
 *
 * MAY:
 * - Use tiktoken library in development/testing for validation
 * - Implement feature flag for auto-downgrade behavior
 * - Add custom analytics events for truncation patterns
 */

// ============================================================================
// IMPLEMENTATION CONSTANTS
// ============================================================================

/**
 * Default token budget constants
 *
 * Based on Linear issue MCP-38 requirements.
 */
export const DEFAULT_TOKEN_BUDGET: TokenBudgetConfig = {
  maxTokens: 25000,        // ~25K tokens
  maxCharacters: 100000,   // ~100K characters
  estimationRatio: 4       // 4 characters ≈ 1 token
};

/**
 * Default maxResults constraints by tool type
 */
export const MAX_RESULTS_CONSTRAINTS = {
  search: {
    default: 25,
    min: 1,
    max: 100
  },
  list: {
    daily_notes: {
      default: 10,
      min: 1,
      max: 100
    }
  },
  yaml_properties: {
    values: {
      default: 50,
      min: 1,
      max: 100
    },
    examplesPerValue: {
      default: 3,
      min: 1,
      max: 10
    }
  }
};

/**
 * Truncation message templates
 */
export const TRUNCATION_MESSAGES = {
  standard: (shown: number, total: number): string =>
    `Showing ${shown} of ${total} results (limit reached). Refine query for more specific results.`,

  autoDowngraded: (shown: number, total: number): string =>
    `Showing ${shown} of ${total} results in concise format (auto-downgraded to fit token limit). Use more specific filters to reduce result count.`,

  yamlProperties: (shown: number, total: number, property: string): string =>
    `Showing ${shown} of ${total} values for property "${property}" (limit reached). Filter by category or content type to reduce results.`,

  examplesTruncated: (shown: number, total: number): string =>
    `Showing ${shown} of ${total} example notes (limit reached).`
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Max results validation result (MCP-95 enhancement)
 * Validated and constrained maxResults parameter
 */
export interface MaxResultsValidation {
  /** Validated maxResults value (constrained to limits) */
  value: number;

  /** Whether value was adjusted from input */
  adjusted: boolean;

  /** Original input value (if adjusted) */
  originalValue?: number;
}

/**
 * Validate maxResults parameter
 * Enhanced in MCP-95 to return validation result instead of throwing
 *
 * @param value - maxResults value to validate
 * @param toolType - Tool type for appropriate constraints
 * @returns Validation result with constrained value and adjustment metadata
 */
export function validateMaxResults(
  value: number | undefined,
  toolType: 'search' | 'list' | 'yaml_properties'
): MaxResultsValidation {
  // Validation constraints
  const min = 1;
  const max = 100;

  // Default value if not provided
  if (value === undefined) {
    let defaultValue: number;
    if (toolType === 'search') defaultValue = MAX_RESULTS_CONSTRAINTS.search.default;
    else if (toolType === 'list') defaultValue = MAX_RESULTS_CONSTRAINTS.list.daily_notes.default;
    else defaultValue = MAX_RESULTS_CONSTRAINTS.yaml_properties.values.default;

    return {
      value: defaultValue,
      adjusted: false
    };
  }

  // Constrain to minimum
  if (value < min) {
    return {
      value: min,
      adjusted: true,
      originalValue: value
    };
  }

  // Constrain to maximum
  if (value > max) {
    return {
      value: max,
      adjusted: true,
      originalValue: value
    };
  }

  // Value within range
  return {
    value,
    adjusted: false
  };
}

/**
 * Validate token budget configuration
 * @param config - Token budget config to validate
 * @throws InvalidTokenConfigError if validation fails
 */
export function validateTokenBudgetConfig(config: TokenBudgetConfig): void {
  if (config.maxTokens <= 0) {
    throw new InvalidTokenConfigError('maxTokens must be positive');
  }

  if (config.maxCharacters <= 0) {
    throw new InvalidTokenConfigError('maxCharacters must be positive');
  }

  if (config.estimationRatio <= 0) {
    throw new InvalidTokenConfigError('estimationRatio must be positive');
  }

  // Validate consistency: maxCharacters should be ~maxTokens * estimationRatio
  const expectedCharacters = config.maxTokens * config.estimationRatio;
  const tolerance = 0.1; // 10% tolerance

  if (Math.abs(config.maxCharacters - expectedCharacters) > expectedCharacters * tolerance) {
    throw new InvalidTokenConfigError(
      `maxCharacters (${config.maxCharacters}) should be approximately maxTokens (${config.maxTokens}) * estimationRatio (${config.estimationRatio}) = ${expectedCharacters}`
    );
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for TokenLimitedSearchOptions
 */
export function isTokenLimitedSearchOptions(
  options: any
): options is TokenLimitedSearchOptions {
  return options && typeof options === 'object';
}

/**
 * Type guard for TruncationMetadata
 */
export function isTruncated(
  metadata: TruncationMetadata | undefined
): metadata is TruncationMetadata {
  return metadata !== undefined && metadata.truncated === true;
}

// ============================================================================
// IMPLEMENTATION NOTES
// ============================================================================

/**
 * IMPLEMENTATION ROADMAP:
 *
 * Phase 1: ResponseTruncator Utility (src/response-truncator.ts)
 * - Implement IResponseTruncator interface
 * - Character-based estimation (4:1 ratio)
 * - Incremental budget tracking
 * - Truncation metadata generation
 *
 * Phase 2: Enhanced Formatting (src/obsidian-links.ts)
 * - Add tokenBudget parameter to formatSearchResult()
 * - Add tokenBudget parameter to formatListResult()
 * - Maintain backward compatibility (optional param)
 *
 * Phase 3: Tool Handler Integration (src/index.ts)
 * - search handler: incremental token tracking
 * - list handler: token budget enforcement
 * - list_yaml_property_values: value-level + example-level truncation
 * - Inject truncation metadata into MCP responses
 *
 * Phase 4: Optional Auto-Downgrade
 * - Implement format downgrade logic
 * - Feature flag for gradual rollout
 * - Testing across vault sizes
 */
