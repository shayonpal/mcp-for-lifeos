/**
 * Implementation contracts for Linear Issue: MCP-39
 * Issue: Enhance all error messages with suggested next steps and available options
 *
 * These contracts define the expected behavior and data structures
 * for the implementation. All implementation code MUST conform to
 * these interface definitions.
 *
 * SCOPE: Pattern + Examples Approach (5 error sites + pattern documentation)
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-39
 */

// ============================================================================
// ERROR ENHANCEMENT PATTERNS
// ============================================================================

/**
 * Three reusable error message patterns for MCP server errors
 *
 * These patterns guide inline error message enhancements without
 * requiring infrastructure (no error classes, no factory functions).
 */
export enum ErrorMessagePattern {
  /** List available alternatives when resource not found */
  LIST_AVAILABLE_OPTIONS = 'list_options',

  /** Suggest search command when item not found by path/identifier */
  SUGGEST_SEARCH = 'suggest_search',

  /** Reference documentation tool for validation/schema errors */
  REFERENCE_DOC_TOOL = 'reference_tool'
}

/**
 * Error message enhancement template
 *
 * Defines structure for all enhanced error messages.
 */
export interface EnhancedErrorMessage {
  /** Base diagnostic message (what went wrong) */
  diagnostic: string;

  /** Actionable suggestion (what to do next) */
  suggestion: string;

  /** Available options or examples (if applicable) */
  options?: string[];

  /** Tool reference for documentation (if applicable) */
  toolReference?: string;

  /** Pattern used for this error */
  pattern: ErrorMessagePattern;
}

// ============================================================================
// PATTERN 1: LIST AVAILABLE OPTIONS
// ============================================================================

/**
 * Pattern for resource not found with alternatives
 *
 * Use when: Template, folder, or other resource doesn't exist but alternatives available
 *
 * Template: "{Resource} '{identifier}' not found. Available: {list}. Run {tool} to see all."
 *
 * Example: "Template 'restaurant' not found. Available: article, person, daily-note.
 *           Run list(type='templates') to see all options."
 */
export interface ListAvailableOptionsPattern {
  /** Resource type (e.g., "Template", "Folder") */
  resourceType: string;

  /** User-provided identifier that wasn't found */
  identifier: string;

  /** List of available alternatives (truncated to ~5-10 items for readability) */
  availableItems: string[];

  /** Tool command to see complete list */
  listCommand: string;
}

/**
 * Constants for LIST_AVAILABLE_OPTIONS pattern
 */
export const LIST_OPTIONS_CONSTANTS = {
  /** Maximum items to show in error message before truncation */
  MAX_ITEMS_SHOWN: 5,

  /** Character budget for options list (~500 chars) */
  MAX_OPTIONS_LENGTH: 500,

  /** Truncation suffix when list exceeds max */
  TRUNCATION_SUFFIX: (remaining: number) => ` (${remaining} more)`
};

// ============================================================================
// PATTERN 2: SUGGEST SEARCH COMMAND
// ============================================================================

/**
 * Pattern for item not found by path/identifier
 *
 * Use when: Note, file, or item doesn't exist at expected location
 *
 * Template: "{Item} not found: {identifier}. Run search(query='{suggestion}') to find it."
 *
 * Example: "Note not found: Projects/MyNote.md. Run search(query='MyNote') to find similar notes."
 */
export interface SuggestSearchPattern {
  /** Item type (e.g., "Note", "File") */
  itemType: string;

  /** Path or identifier that wasn't found */
  identifier: string;

  /** Suggested search query (extracted from identifier) */
  searchQuery: string;

  /** Search tool command */
  searchCommand: string;
}

/**
 * Constants for SUGGEST_SEARCH pattern
 */
export const SUGGEST_SEARCH_CONSTANTS = {
  /** Tool name for search commands */
  SEARCH_TOOL: 'search',

  /** Default search mode parameter */
  DEFAULT_MODE: 'query',

  /** Character limit for search suggestion (~200 chars) */
  MAX_SUGGESTION_LENGTH: 200
};

// ============================================================================
// PATTERN 3: REFERENCE DOCUMENTATION TOOL
// ============================================================================

/**
 * Pattern for validation errors on schema/rules
 *
 * Use when: YAML validation fails, field format invalid, or schema violation
 *
 * Template: "{Validation error}. Run {doc_tool}() to see {schema/rules}."
 *
 * Example: "Cannot set auto-managed field 'created'. Run get_yaml_rules() to see auto-managed fields."
 */
export interface ReferenceDocToolPattern {
  /** Validation error description */
  validationError: string;

  /** Field or property that caused error */
  fieldName?: string;

  /** Documentation tool to reference */
  docTool: string;

  /** What the tool shows (e.g., "auto-managed fields", "valid formats") */
  docContent: string;
}

/**
 * Constants for REFERENCE_DOC_TOOL pattern
 */
export const REFERENCE_TOOL_CONSTANTS = {
  /** YAML rules documentation tool */
  YAML_RULES_TOOL: 'get_yaml_rules',

  /** Character limit for tool reference (~200 chars) */
  MAX_REFERENCE_LENGTH: 200,

  /** Common documentation tools */
  COMMON_DOC_TOOLS: [
    'get_yaml_rules',
    'list',
    'get_server_version'
  ] as const
};

// ============================================================================
// IMPLEMENTATION SITES
// ============================================================================

/**
 * Five specific error sites to enhance in this implementation
 *
 * Each site maps to one of the three patterns.
 */
export interface ImplementationSite {
  /** File path relative to project root */
  filePath: string;

  /** Approximate line number */
  lineNumber: number;

  /** Current error message */
  currentMessage: string;

  /** Enhanced error message */
  enhancedMessage: string;

  /** Pattern applied */
  pattern: ErrorMessagePattern;

  /** Implementation notes */
  notes?: string;
}

/**
 * Contract definitions for the 5 implementation sites
 */
export const IMPLEMENTATION_SITES: ReadonlyArray<ImplementationSite> = [
  // Site 1: Template Error
  {
    filePath: 'src/template-engine.ts',
    lineNumber: 147,
    currentMessage: 'Template not found: ${templateKey}',
    enhancedMessage:
      'Template not found: ${templateKey}. ' +
      'Available templates: ${this.getAllTemplates().map(t => t.key).join(\', \')}. ' +
      'Run list(type=\'templates\') to see all options.',
    pattern: ErrorMessagePattern.LIST_AVAILABLE_OPTIONS,
    notes: 'Copy pattern from template-engine-dynamic.ts:409 (already has this format)'
  },

  // Site 2: Note Not Found by Path
  {
    filePath: 'src/vault-utils.ts',
    lineNumber: 225,
    currentMessage: 'Note not found: ${normalizedPath}',
    enhancedMessage:
      'Note not found: ${normalizedPath}. ' +
      'Run search(query=\'${path.basename(normalizedPath, \'.md\')}\') to find similar notes.',
    pattern: ErrorMessagePattern.SUGGEST_SEARCH,
    notes: 'Extract filename from path for search query'
  },

  // Site 3: Note Not Found by Title (insertContent)
  {
    filePath: 'src/vault-utils.ts',
    lineNumber: 2342,
    currentMessage: 'No note found with title: ${args.title}',
    enhancedMessage:
      'No note found with title: ${args.title}. ' +
      'Run search(query=\'${args.title}\') to find similar notes.',
    pattern: ErrorMessagePattern.SUGGEST_SEARCH,
    notes: 'Already has heading suggestion pattern at line 647-652; standardize format'
  },

  // Site 4: Auto-Managed Field Violation
  {
    filePath: 'src/vault-utils.ts',
    lineNumber: 1174,
    currentMessage: 'Cannot manually set auto-managed field: ${field}',
    enhancedMessage:
      'Cannot set auto-managed field \'${field}\'. ' +
      'Run get_yaml_rules() to see which fields are auto-managed.',
    pattern: ErrorMessagePattern.REFERENCE_DOC_TOOL,
    notes: 'Reference get_yaml_rules tool for schema documentation'
  },

  // Site 5: Invalid YAML Field
  {
    filePath: 'src/vault-utils.ts',
    lineNumber: 1180,
    currentMessage: 'Invalid YAML field (varies by context)',
    enhancedMessage:
      'Invalid YAML field \'${field}\': ${reason}. ' +
      'Run get_yaml_rules() to see expected format and valid fields.',
    pattern: ErrorMessagePattern.REFERENCE_DOC_TOOL,
    notes: 'Show expected format, reference get_yaml_rules for complete schema'
  }
];

// ============================================================================
// ERROR CONTRACTS (MCP Protocol Compliance)
// ============================================================================

/**
 * MCP protocol error response requirements
 *
 * All errors MUST conform to existing MCP protocol pattern.
 * No custom error classes needed - enhanced Error instances work.
 *
 * @see src/index.ts:2615-2621 for existing error-to-MCP conversion
 */
export interface MCPErrorResponse {
  /** isError flag (required by MCP protocol) */
  isError: true;

  /** Error message in content array */
  content: Array<{
    type: 'text';
    text: string; // Enhanced error message from this.message
  }>;
}

/**
 * Character limits for error messages (MCP best practices)
 *
 * Based on MCP Builder recommendations:
 * - Maximum response: ~25K tokens (~100K characters)
 * - Recommended error limit: ~2000 characters
 */
export const ERROR_CHARACTER_LIMITS = {
  /** Recommended maximum for single error message */
  MAX_ERROR_LENGTH: 2000,

  /** Maximum items in options list */
  MAX_OPTIONS_LIST: 5,

  /** Maximum examples in suggestion */
  MAX_EXAMPLES: 3
} as const;

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Existing interfaces this implementation integrates with
 *
 * This implementation enhances existing error handling without
 * modifying MCP protocol integration or error conversion logic.
 */
export interface ExistingInterfaceConformance {
  /** No extension of existing interfaces - inline enhancements only */
  extends: null;

  /** Integrates with existing error handling */
  integrates: {
    /** MCP protocol error conversion (src/index.ts:2615-2621) */
    mcpErrorHandling: true;
    /** Template system (src/template-engine.ts, src/template-engine-dynamic.ts) */
    templateSystem: true;
    /** Vault operations (src/vault-utils.ts) */
    vaultUtils: true;
    /** YAML rules management (src/yaml-rules-manager.ts) */
    yamlRulesManager: true;
  };

  /** Maintains backward compatibility */
  backwardCompatible: true;

  /** No new parameters - error message changes only */
  newParameters: [];
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors and side effects for error message enhancements
 *
 * MUST:
 * - Follow one of three documented patterns (LIST_OPTIONS, SUGGEST_SEARCH, REFERENCE_TOOL)
 * - Include both diagnostic (what happened) and suggestion (what to do)
 * - Keep error messages under 2000 characters
 * - Truncate options lists to 5 items with "(X more)" suffix
 * - Use existing cached data (template list, YAML rules) - no new queries
 * - Flow through existing MCP error handling without changes
 *
 * MUST NOT:
 * - Create error classes or factory functions (inline enhancements only)
 * - Modify src/index.ts error-to-MCP conversion logic
 * - Add new dependencies or utilities
 * - Perform expensive operations in error path (use cached data)
 * - Change error handling behavior (throw vs return)
 *
 * SHOULD:
 * - Extract reusable logic for option listing/truncation (if needed by multiple sites)
 * - Reference existing tools (search, list, get_yaml_rules) in suggestions
 * - Use clear, action-oriented language ("Run X", "Try Y")
 * - Match existing code style and formatting
 *
 * MAY:
 * - Add helper functions for common patterns (if justified by multiple call sites)
 * - Extract filename/query from identifiers for search suggestions
 * - Format options lists for readability (commas, line breaks)
 */

// ============================================================================
// PATTERN DOCUMENTATION CONTRACT
// ============================================================================

/**
 * Pattern documentation file structure
 *
 * File: dev/contracts/MCP-39-error-patterns.md
 */
export interface PatternDocumentation {
  /** Three core patterns documented */
  patterns: [
    ListAvailableOptionsPattern,
    SuggestSearchPattern,
    ReferenceDocToolPattern
  ];

  /** When to use each pattern */
  usageGuidelines: {
    listOptions: string;
    suggestSearch: string;
    referenceTool: string;
  };

  /** Implementation examples for each pattern */
  examples: {
    listOptions: string[];
    suggestSearch: string[];
    referenceTool: string[];
  };

  /** Future adoption strategy */
  adoptionStrategy: string;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate enhanced error message against pattern contract
 *
 * @param message - Enhanced error message
 * @param pattern - Pattern used
 * @returns true if message conforms to pattern contract
 */
export function validateEnhancedMessage(
  message: string,
  pattern: ErrorMessagePattern
): boolean {
  // Basic validation: message should not be empty
  if (!message || message.trim().length === 0) {
    return false;
  }

  // Character limit validation
  if (message.length > ERROR_CHARACTER_LIMITS.MAX_ERROR_LENGTH) {
    return false;
  }

  // Pattern-specific validation
  switch (pattern) {
    case ErrorMessagePattern.LIST_AVAILABLE_OPTIONS:
      // Should contain "Available" or "available"
      return message.toLowerCase().includes('available');

    case ErrorMessagePattern.SUGGEST_SEARCH:
      // Should contain "search" or "Search"
      return message.toLowerCase().includes('search');

    case ErrorMessagePattern.REFERENCE_DOC_TOOL:
      // Should contain "Run" and a tool reference
      return message.includes('Run') && message.includes('()');

    default:
      return false;
  }
}

/**
 * Truncate options list to fit character budget
 *
 * @param items - Full list of options
 * @param maxItems - Maximum items to show (default: 5)
 * @param maxLength - Maximum character length (default: 500)
 * @returns Truncated list with "(X more)" suffix if needed
 */
export function truncateOptionsList(
  items: string[],
  maxItems: number = LIST_OPTIONS_CONSTANTS.MAX_ITEMS_SHOWN,
  maxLength: number = LIST_OPTIONS_CONSTANTS.MAX_OPTIONS_LENGTH
): string {
  if (items.length === 0) {
    return '';
  }

  const truncatedItems: string[] = [];
  let currentLength = 0;

  for (let i = 0; i < items.length && i < maxItems; i++) {
    const item = items[i];
    const itemLength = item.length + 2; // +2 for ", " separator

    if (currentLength + itemLength > maxLength) {
      break;
    }

    truncatedItems.push(item);
    currentLength += itemLength;
  }

  const remaining = items.length - truncatedItems.length;
  const result = truncatedItems.join(', ');

  return remaining > 0
    ? result + LIST_OPTIONS_CONSTANTS.TRUNCATION_SUFFIX(remaining)
    : result;
}

// ============================================================================
// IMPLEMENTATION ROADMAP
// ============================================================================

/**
 * IMPLEMENTATION ROADMAP:
 *
 * Phase 1: Pattern Documentation (2 hours)
 * - Create dev/contracts/MCP-39-error-patterns.md
 * - Document three core patterns with templates and examples
 * - Explain when to use each pattern
 * - Provide adoption strategy for remaining 59 sites
 *
 * Phase 2: Enhance 5 Error Sites (3 hours)
 * - Site 1: src/template-engine.ts:147 (LIST_OPTIONS)
 * - Site 2: src/vault-utils.ts:225 (SUGGEST_SEARCH)
 * - Site 3: src/vault-utils.ts:2342 (SUGGEST_SEARCH)
 * - Site 4: src/vault-utils.ts:1174 (REFERENCE_TOOL)
 * - Site 5: src/vault-utils.ts:1180 (REFERENCE_TOOL)
 *
 * Phase 3: Testing & Validation (2 hours)
 * - Manual Claude Desktop testing for each error scenario
 * - Verify message clarity and actionability
 * - Confirm character limits respected
 * - Test AI agent error recovery effectiveness
 *
 * Phase 4: Documentation Updates (1 hour)
 * - Update docs/tools/create_note.md (template error examples)
 * - Update docs/tools/search.md (file not found examples)
 * - Update CHANGELOG.md with MCP-39 changes
 *
 * Total Effort: ~8 hours (1 day)
 */

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for ListAvailableOptionsPattern
 */
export function isListOptionsPattern(
  pattern: any
): pattern is ListAvailableOptionsPattern {
  return (
    pattern &&
    typeof pattern === 'object' &&
    'resourceType' in pattern &&
    'identifier' in pattern &&
    'availableItems' in pattern &&
    'listCommand' in pattern
  );
}

/**
 * Type guard for SuggestSearchPattern
 */
export function isSuggestSearchPattern(
  pattern: any
): pattern is SuggestSearchPattern {
  return (
    pattern &&
    typeof pattern === 'object' &&
    'itemType' in pattern &&
    'identifier' in pattern &&
    'searchQuery' in pattern &&
    'searchCommand' in pattern
  );
}

/**
 * Type guard for ReferenceDocToolPattern
 */
export function isReferenceToolPattern(
  pattern: any
): pattern is ReferenceDocToolPattern {
  return (
    pattern &&
    typeof pattern === 'object' &&
    'validationError' in pattern &&
    'docTool' in pattern &&
    'docContent' in pattern
  );
}

// ============================================================================
// IMPLEMENTATION NOTES
// ============================================================================

/**
 * KEY ARCHITECTURAL DECISIONS:
 *
 * 1. NO ERROR INFRASTRUCTURE
 *    - No error-utils.ts, no factory functions, no custom error classes
 *    - Inline enhancements only (simple string replacements)
 *    - Rationale: 5 sites don't justify infrastructure overhead
 *
 * 2. PATTERN DOCUMENTATION FIRST
 *    - Document patterns before implementing
 *    - Enables incremental adoption for remaining 59 sites
 *    - Rationale: Codex recommendation - maximizes ROI
 *
 * 3. MCP PROTOCOL COMPLIANCE
 *    - Existing error handling (src/index.ts:2615-2621) already correct
 *    - Enhanced messages flow through existing `isError: true` pattern
 *    - No protocol changes needed
 *    - Rationale: Zero integration risk
 *
 * 4. CHARACTER LIMITS
 *    - Self-enforcing through natural message bounds
 *    - Template list ~10-15 items = ~200 chars
 *    - Search suggestions ~1 line = ~100 chars
 *    - Tool references ~1 line = ~80 chars
 *    - Rationale: No complex truncation logic needed
 *
 * 5. PERFORMANCE
 *    - Use existing cached data only (template list, YAML rules)
 *    - No new queries in error path
 *    - Simple string operations
 *    - Rationale: Zero performance impact
 */
