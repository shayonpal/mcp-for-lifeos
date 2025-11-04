/**
 * TypeScript Contracts for MCP-92: Implement Hot-Reload Custom Instructions
 *
 * This file defines the contracts that must be satisfied by the implementation.
 * All interfaces and types represent the expected inputs, outputs, and behaviors.
 *
 * @module dev/contracts/MCP-92-contracts
 */

import type { CustomInstructionsConfig, YAMLFrontmatter } from '../../src/shared/types.js';
import type { InstructionContext } from '../../src/modules/config/instruction-processor.js';

// ============================================================================
// INPUT INTERFACES
// ============================================================================

/**
 * Structure of file-based instruction files (JSON format)
 * This is what operators will author in external files
 */
export interface InstructionFileFormat {
  /** Rules applied during note creation */
  noteCreationRules?: NoteCreationRules;

  /** Rules applied during note editing */
  editingRules?: EditingRules;

  /** Rules applied during template processing */
  templateRules?: TemplateRules;
}

/**
 * Note creation rules - control how new notes are created
 */
export interface NoteCreationRules {
  /** File naming patterns by note type */
  namingConventions?: Record<string, string>;

  /** Default YAML frontmatter fields by note type */
  defaultFrontmatter?: Record<string, Partial<YAMLFrontmatter>>;

  /** Content boilerplate to inject by note type */
  contentBoilerplate?: Record<string, ContentBoilerplateRule>;

  /** Template selection overrides */
  templateOverrides?: Record<string, string>;
}

/**
 * Editing rules - control how notes are modified
 */
export interface EditingRules {
  /** Content formatting rules */
  contentFormatting?: ContentFormattingRule[];

  /** YAML frontmatter validation rules */
  frontmatterValidation?: FrontmatterValidationRule[];

  /** Content structure enforcement */
  structureEnforcement?: StructureEnforcementRule[];
}

/**
 * Template rules - control template processing
 */
export interface TemplateRules {
  /** Template data overrides */
  dataOverrides?: Record<string, Record<string, any>>;

  /** Template selection priority */
  selectionPriority?: string[];

  /** Post-processing transformations */
  postProcessing?: PostProcessingRule[];
}

/**
 * Content boilerplate rule
 */
export interface ContentBoilerplateRule {
  /** Position to inject boilerplate */
  position: 'prepend' | 'append';

  /** Template string for boilerplate */
  template: string;

  /** Optional condition for application */
  condition?: string;
}

/**
 * Content formatting rule
 */
export interface ContentFormattingRule {
  /** Pattern to match */
  pattern: string | RegExp;

  /** Replacement template */
  replacement: string;

  /** Scope of application */
  scope: 'global' | 'first-match';
}

/**
 * Frontmatter validation rule
 */
export interface FrontmatterValidationRule {
  /** Field to validate */
  field: string;

  /** Validation type */
  type: 'required' | 'format' | 'enum';

  /** Validation value (format regex or enum values) */
  value: string | string[];

  /** Error message if validation fails */
  errorMessage: string;
}

/**
 * Structure enforcement rule
 */
export interface StructureEnforcementRule {
  /** Required heading hierarchy */
  requiredHeadings?: string[];

  /** Heading order enforcement */
  enforceOrder?: boolean;

  /** Auto-create missing headings */
  autoCreate?: boolean;
}

/**
 * Post-processing rule for templates
 */
export interface PostProcessingRule {
  /** Type of transformation */
  type: 'replace' | 'inject' | 'remove';

  /** Target pattern */
  target: string | RegExp;

  /** Value for transformation */
  value?: string;
}

// ============================================================================
// OUTPUT INTERFACES
// ============================================================================

/**
 * Result of file-based instruction loading
 * Extends InstructionRetrievalResult with file-specific metadata
 */
export interface FileInstructionLoadResult {
  /** Loaded instructions (null if failed) */
  instructions: InstructionFileFormat | null;

  /** Source of instructions */
  source: 'file' | 'inline' | 'none';

  /** File path that was loaded */
  filePath?: string;

  /** Timestamp when file was loaded */
  loadedAt: Date;

  /** File modification time (for staleness detection) */
  fileModifiedAt?: Date;

  /** Error if loading failed */
  error?: {
    code: 'FILE_NOT_FOUND' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'READ_ERROR';
    message: string;
    details?: any;
  };
}

/**
 * Enhanced instruction application result
 * Extends InstructionApplicationResult with detailed modification tracking
 */
export interface EnhancedInstructionApplicationResult {
  /** Modified context */
  context: ModifiedInstructionContext;

  /** Whether any modifications were applied */
  modified: boolean;

  /** Applied instruction rules with details */
  appliedRules: AppliedRule[];

  /** Performance metrics */
  metrics?: {
    /** Time to apply instructions (ms) */
    applicationTimeMs: number;

    /** Number of rules evaluated */
    rulesEvaluated: number;

    /** Number of rules applied */
    rulesApplied: number;
  };
}

/**
 * Modified instruction context
 * Extends InstructionContext with modification fields
 */
export interface ModifiedInstructionContext extends InstructionContext {
  /** Modified title (if naming convention applied) */
  modifiedTitle?: string;

  /** Modified frontmatter (if default fields applied) */
  modifiedFrontmatter?: Partial<YAMLFrontmatter>;

  /** Modified content (if boilerplate/formatting applied) */
  modifiedContent?: string;

  /** Modified template selection (if override applied) */
  modifiedTemplate?: string;
}

/**
 * Applied rule tracking
 */
export interface AppliedRule {
  /** Rule type */
  type: 'naming' | 'frontmatter' | 'content' | 'template' | 'validation';

  /** Rule identifier */
  ruleId: string;

  /** Description of what was applied */
  description: string;

  /** Original value (before application) */
  originalValue?: any;

  /** New value (after application) */
  newValue?: any;
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Instruction processing error codes
 */
export type InstructionErrorCode =
  | 'FILE_NOT_FOUND'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'READ_ERROR'
  | 'APPLICATION_ERROR'
  | 'CACHE_ERROR'
  | 'WATCHER_ERROR';

/**
 * Instruction processing error
 */
export interface InstructionError {
  /** Error code */
  code: InstructionErrorCode;

  /** Human-readable error message */
  message: string;

  /** Technical details for debugging */
  details?: {
    /** File path (if applicable) */
    filePath?: string;

    /** Parse error location (if applicable) */
    parseError?: {
      line: number;
      column: number;
      snippet: string;
    };

    /** Stack trace (for unexpected errors) */
    stack?: string;
  };

  /** Whether error is recoverable */
  recoverable: boolean;

  /** Suggested recovery action */
  recoveryAction?: string;
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Contract for InstructionProcessor.getInstructions()
 * MUST implement file reading when config.filePath is provided
 */
export interface GetInstructionsContract {
  /**
   * Input: CustomInstructionsConfig from LIFEOS_CONFIG
   */
  input: CustomInstructionsConfig | undefined;

  /**
   * Output: FileInstructionLoadResult
   */
  output: FileInstructionLoadResult;

  /**
   * Behavior:
   * 1. If config.filePath is provided:
   *    a. Read file using readFileWithRetry (max 3 retries, 100ms delay)
   *    b. Parse JSON content
   *    c. Validate against InstructionFileFormat schema
   *    d. Cache parsed result with file mtime
   *    e. Return with source: 'file'
   * 2. If config.inline is provided and no filePath:
   *    a. Return inline config with source: 'inline'
   * 3. If neither provided:
   *    a. Return null with source: 'none'
   * 4. On error:
   *    a. Log error with logger.error()
   *    b. Fall back to inline config (if available)
   *    c. Return error details in result
   */
  behavior: 'file-first-with-fallback';
}

/**
 * Contract for InstructionProcessor.applyInstructions()
 * MUST branch on context.operation and apply relevant rules
 */
export interface ApplyInstructionsContract {
  /**
   * Input: InstructionContext
   */
  input: InstructionContext;

  /**
   * Output: EnhancedInstructionApplicationResult
   */
  output: EnhancedInstructionApplicationResult;

  /**
   * Behavior:
   * 1. Get instructions via getInstructions()
   * 2. If no instructions configured, return pass-through (modified: false)
   * 3. Branch on context.operation:
   *    - 'create' → Apply noteCreationRules
   *    - 'edit' → Apply editingRules
   *    - 'insert' → Apply editingRules (treat as partial edit)
   *    - 'template' → Apply templateRules
   * 4. For each rule type:
   *    a. Check if rule applies to context.noteType
   *    b. Apply rule transformation to context
   *    c. Track applied rule in appliedRules array
   * 5. Return modified context with modification tracking
   * 6. Log application summary at debug level
   */
  behavior: 'branch-by-operation-with-tracking';
}

/**
 * Contract for hot-reload cache invalidation
 */
export interface CacheInvalidationContract {
  /**
   * Trigger: fs.watch() detects file change event
   */
  trigger: 'file-change-event';

  /**
   * Behavior:
   * 1. fs.watch() callback fires on file change
   * 2. Call clearCache() to reset cachedInstructions
   * 3. Log cache invalidation at info level
   * 4. Next getInstructions() call will re-read from disk
   * 5. No active push to tools (lazy reload)
   */
  behavior: 'lazy-invalidation-on-change';

  /**
   * Performance:
   * - Cache invalidation must be non-blocking
   * - File re-read deferred until next getInstructions() call
   * - No impact on in-flight operations
   */
  performance: 'non-blocking';
}

/**
 * Contract for tool integration
 */
export interface ToolIntegrationContract {
  /**
   * Integration points (4 total):
   */
  integrationPoints: [
    'src/tool-router.ts::executeCreateNote',
    'src/modules/files/note-crud.ts::createNote',
    'src/modules/files/note-crud.ts::updateNote',
    'src/modules/files/content-insertion.ts::insertContent',
    'src/modules/templates/template-engine.ts::processTemplate'
  ];

  /**
   * Injection pattern (consistent across all points):
   * 1. Build InstructionContext before operation
   * 2. Call InstructionProcessor.applyInstructions(context)
   * 3. Use result.context.modified* fields for operation
   * 4. Log application via telemetry (ToolRouter only)
   */
  injectionPattern: 'context-build-apply-use';

  /**
   * Backward compatibility:
   * - Default to pass-through when no instructions configured
   * - Existing tests must pass without modification
   * - Use feature flag ENABLE_INSTRUCTION_APPLICATION (default: true)
   */
  backwardCompatibility: 'pass-through-default';
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * MUST behaviors - Required for correct implementation
 */
export interface MustBehaviors {
  /** MUST read file when config.filePath is provided */
  readFileWhenPathProvided: true;

  /** MUST parse JSON format matching InstructionFileFormat */
  parseJsonFormat: true;

  /** MUST cache parsed instructions with file mtime */
  cacheWithMtime: true;

  /** MUST invalidate cache on fs.watch() event */
  invalidateCacheOnChange: true;

  /** MUST fall back to inline config on file read error */
  fallbackToInline: true;

  /** MUST branch on context.operation */
  branchByOperation: true;

  /** MUST track applied rules in result */
  trackAppliedRules: true;

  /** MUST maintain backward compatibility (pass-through default) */
  backwardCompatible: true;

  /** MUST preserve YAML auto-managed fields (date created, date modified) */
  preserveAutoManagedFields: true;

  /** MUST achieve >90% test coverage for new code */
  testCoverageOver90Percent: true;
}

/**
 * MUST NOT behaviors - Prohibited patterns
 */
export interface MustNotBehaviors {
  /** MUST NOT break existing tests (805/808+ must pass) */
  breakExistingTests: false;

  /** MUST NOT block in-flight operations during cache invalidation */
  blockInFlightOperations: false;

  /** MUST NOT push instruction updates actively (use lazy reload) */
  activePushUpdates: false;

  /** MUST NOT depend on VaultUtils (fully eliminated in MCP-91) */
  dependOnVaultUtils: false;

  /** MUST NOT create new config files (use existing src/shared/config.ts) */
  createNewConfigFiles: false;

  /** MUST NOT introduce circular dependencies */
  introducCircularDependencies: false;
}

// ============================================================================
// TEST CONTRACTS
// ============================================================================

/**
 * Unit test coverage requirements
 */
export interface UnitTestContracts {
  /** File-based instruction loading */
  fileLoading: {
    'reads instructions from valid file': true;
    'handles missing file gracefully': true;
    'handles invalid JSON gracefully': true;
    'validates instruction schema': true;
    'caches parsed instructions': true;
    'includes file mtime in cache': true;
    'falls back to inline on file error': true;
  };

  /** Cache invalidation */
  cacheInvalidation: {
    'invalidates cache on file change': true;
    'debounces rapid file changes': true;
    'logs cache invalidation': true;
    'handles concurrent cache access': true;
  };

  /** Instruction application */
  instructionApplication: {
    'applies noteCreationRules to create operation': true;
    'applies editingRules to edit operation': true;
    'applies templateRules to template operation': true;
    'returns pass-through when no instructions': true;
    'tracks appliedRules in result': true;
    'preserves context fields not targeted by rules': true;
    'handles missing noteType gracefully': true;
  };

  /** Error handling */
  errorHandling: {
    'handles file not found error': true;
    'handles JSON parse error': true;
    'handles schema validation error': true;
    'handles file read retry exhaustion': true;
    'logs errors appropriately': true;
  };
}

/**
 * Integration test coverage requirements
 */
export interface IntegrationTestContracts {
  /** End-to-end workflows */
  endToEndWorkflows: {
    'creates note with custom naming rules': true;
    'creates note with custom YAML defaults': true;
    'edits note with custom content rules': true;
    'applies template rules during template processing': true;
    'inserts content with custom formatting rules': true;
  };

  /** Hot-reload scenarios */
  hotReloadScenarios: {
    'hot-reloads instructions on file change': true;
    'handles file modification during operation': true;
    'maintains cache correctness after reload': true;
  };

  /** Error scenarios */
  errorScenarios: {
    'handles missing instruction file gracefully': true;
    'handles invalid instruction format gracefully': true;
    'falls back to inline config on error': true;
  };

  /** Regression protection */
  regressionProtection: {
    'existing create_note tool works unchanged': true;
    'existing edit_note tool works unchanged': true;
    'existing template processing works unchanged': true;
    'all 805+ existing tests still pass': true;
  };
}

// ============================================================================
// DOCUMENTATION CONTRACTS
// ============================================================================

/**
 * Documentation requirements
 */
export interface DocumentationContracts {
  /** Primary documentation */
  primaryDocs: {
    'docs/guides/CUSTOM-INSTRUCTIONS.md': {
      sections: [
        'Overview',
        'Configuration',
        'File Format Specification',
        'Hot-Reload Setup',
        'Examples (all three rule types)',
        'Troubleshooting'
      ];
      codeExamples: 'JSON instruction file format';
      troubleshooting: 'Common errors and fixes';
    };
  };

  /** Architecture documentation */
  architectureDocs: {
    'docs/ARCHITECTURE.md': {
      additions: ['Instruction processing flow diagram'];
    };
  };

  /** Tool documentation */
  toolDocs: {
    'docs/tools/create_note.md': {
      updates: ['Document instruction-aware behavior'];
    };
    'docs/tools/edit_note.md': {
      updates: ['Document instruction-aware behavior'];
    };
  };

  /** Example files */
  exampleFiles: {
    'docs/guides/examples/custom-instructions.json': {
      content: 'Working example with all three rule types';
    };
    'docs/guides/examples/custom-instructions-advanced.json': {
      content: 'Advanced patterns and edge cases';
    };
  };
}
