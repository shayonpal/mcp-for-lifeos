/**
 * TypeScript Contracts for MCP-90: Extract Config & Instruction Scaffolding
 *
 * This file defines the interfaces and behavioral contracts for implementing
 * custom instruction configuration and processing infrastructure.
 *
 * SCOPE: Configuration extension + instruction processor scaffolding (pass-through mode)
 * NO RUNTIME BEHAVIOR CHANGES - pure scaffolding for future features
 */

// ============================================================================
// INPUT INTERFACES - Configuration
// ============================================================================

/**
 * Configuration for custom instructions with support for both
 * inline definitions and file-based references
 */
export interface CustomInstructionsConfig {
  /**
   * Inline instruction definitions
   * For immediate configuration without external files
   */
  inline?: {
    /** Rules applied during note creation */
    noteCreationRules?: string;

    /** Rules applied during note editing */
    editingRules?: string;

    /** Rules applied during template processing */
    templateRules?: string;
  };

  /**
   * File path reference to external instructions file
   * Enables hot-reload when combined with enableHotReload
   */
  filePath?: string;

  /**
   * Enable hot-reload for file-based instructions
   * Uses fs.watch() to detect changes and clear cache
   * Default: false
   */
  enableHotReload?: boolean;
}

/**
 * Extended LifeOSConfig interface with custom instructions support
 * Maintains backward compatibility via optional field
 */
export interface ExtendedLifeOSConfig {
  /** Existing required fields */
  vaultPath: string;
  attachmentsPath: string;
  templatesPath: string;
  dailyNotesPath: string;

  /** Existing optional fields */
  yamlRulesPath?: string;

  /** NEW: Custom instructions configuration */
  customInstructions?: CustomInstructionsConfig;
}

// ============================================================================
// INPUT INTERFACES - Instruction Processing
// ============================================================================

/**
 * Context for instruction application
 * Describes the operation being performed and relevant metadata
 */
export interface InstructionContext {
  /** Type of operation triggering instruction application */
  operation: 'create' | 'edit' | 'insert' | 'template';

  /** Optional note type (e.g., 'daily', 'restaurant', 'person') */
  noteType?: string;

  /** Existing content (for edit operations) */
  existingContent?: string;

  /** Target path for file operations */
  targetPath?: string;
}

// ============================================================================
// OUTPUT INTERFACES
// ============================================================================

/**
 * Result of instruction retrieval
 * Null indicates no instructions configured
 */
export interface InstructionRetrievalResult {
  /** The retrieved instructions, or null if none configured */
  instructions: CustomInstructionsConfig['inline'] | null;

  /** Source of the instructions */
  source: 'inline' | 'file' | 'none';

  /** Timestamp when instructions were loaded */
  loadedAt: Date;
}

/**
 * Result of instruction application
 * Extended in MCP-121 to include guidance metadata
 */
export interface InstructionApplicationResult {
  /** The context after instruction application (currently unchanged) */
  context: InstructionContext;

  /** Whether any modifications were applied */
  modified: boolean;

  /** Applied instruction rules (for debugging) */
  appliedRules?: string[];

  /** Optional guidance metadata for LLM clients (added in MCP-121) */
  guidance?: any; // NoteGuidanceMetadata from shared/types.ts
}

/**
 * Result of file watcher initialization
 */
export interface WatcherInitializationResult {
  /** Whether watcher was successfully initialized */
  success: boolean;

  /** Watched file path (if applicable) */
  watchedPath?: string;

  /** Error message if initialization failed */
  error?: string;
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Errors that may occur during instruction processing
 */
export enum InstructionProcessorError {
  /** File-based instructions not yet implemented */
  FILE_INSTRUCTIONS_NOT_IMPLEMENTED = 'FILE_INSTRUCTIONS_NOT_IMPLEMENTED',

  /** File watcher initialization failed */
  WATCHER_INIT_FAILED = 'WATCHER_INIT_FAILED',

  /** Invalid instruction configuration */
  INVALID_CONFIG = 'INVALID_CONFIG',

  /** File read error for file-based instructions */
  FILE_READ_ERROR = 'FILE_READ_ERROR'
}

/**
 * Standard error response for instruction processor operations
 */
export interface InstructionProcessorErrorResponse {
  /** Error code from InstructionProcessorError enum */
  code: InstructionProcessorError;

  /** Human-readable error message */
  message: string;

  /** Additional error details */
  details?: Record<string, unknown>;
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * InstructionProcessor class interface
 * Static methods for singleton pattern (matches existing patterns in codebase)
 */
export interface IInstructionProcessor {
  /**
   * Get current custom instructions
   * Returns null if no instructions configured
   *
   * BEHAVIOR: Phase 1 - Pass-through mode
   * - Returns inline config if present
   * - Warns if filePath provided (not yet implemented)
   * - Returns null if no config
   */
  getInstructions(): InstructionRetrievalResult;

  /**
   * Apply instructions to context
   * Currently pure pass-through, no modifications
   *
   * BEHAVIOR: Phase 1 - Pass-through mode
   * - Logs debug message
   * - Returns context unchanged
   * - Sets modified = false
   */
  applyInstructions(context: InstructionContext): InstructionApplicationResult;

  /**
   * Initialize file watcher for hot-reload
   * Only initializes if conditions are met:
   * - DISABLE_CONFIG_WATCH !== 'true'
   * - Not already initialized
   * - config.filePath provided
   * - config.enableHotReload === true
   *
   * BEHAVIOR: Lazy initialization pattern
   * - Skips if disabled or already initialized
   * - Uses fs.watch() for file change detection
   * - Calls clearCache() on change events
   * - Graceful degradation on errors
   */
  initializeWatcher(): WatcherInitializationResult;

  /**
   * Clear cached instructions
   * Forces re-read on next getInstructions() call
   *
   * BEHAVIOR: Cache invalidation
   * - Clears internal cache
   * - Logs debug message
   * - Does NOT affect in-flight operations
   */
  clearCache(): void;

  /**
   * Cleanup watcher and cache
   * Used primarily for test isolation
   *
   * BEHAVIOR: Complete cleanup
   * - Closes file watcher if exists
   * - Resets initialization flag
   * - Clears cache
   */
  cleanup(): void;
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * MUST: Configuration Extension
 * - CustomInstructionsConfig MUST be added to src/shared/types.ts
 * - LifeOSConfig interface MUST be extended with optional customInstructions field
 * - LIFEOS_CONFIG export MUST include customInstructions: undefined by default
 * - Changes MUST maintain backward compatibility (all existing code continues working)
 */

/**
 * MUST: Module Structure
 * - Module MUST be created at src/modules/config/
 * - Module MUST follow existing Phase 4/5 patterns (barrel exports, clean boundaries)
 * - Module MUST NOT introduce circular dependencies
 * - Module MUST export InstructionProcessor class and InstructionContext type
 */

/**
 * MUST: Pass-Through Behavior (Phase 1)
 * - getInstructions() MUST return null when no config provided
 * - getInstructions() MUST return inline config when present
 * - getInstructions() MUST warn when filePath provided (not yet implemented)
 * - applyInstructions() MUST return context unchanged
 * - applyInstructions() MUST set modified = false
 * - applyInstructions() MUST log debug message when called
 */

/**
 * MUST: File Watching
 * - initializeWatcher() MUST skip when DISABLE_CONFIG_WATCH=true (for tests)
 * - initializeWatcher() MUST skip when already initialized (idempotent)
 * - initializeWatcher() MUST skip when no filePath configured
 * - initializeWatcher() MUST skip when enableHotReload=false
 * - initializeWatcher() MUST use fs.watch() for file change detection
 * - initializeWatcher() MUST handle errors gracefully (no crashes)
 * - File changes MUST trigger clearCache()
 * - Cache invalidation MUST NOT affect in-flight operations
 */

/**
 * MUST: Test Isolation
 * - Tests MUST set DISABLE_CONFIG_WATCH=true to prevent watcher creation
 * - Tests MUST call cleanup() in afterEach hooks
 * - Tests MUST NOT pollute production vault
 * - Tests MUST verify pass-through behavior (no modifications)
 * - Tests MUST mock fs.watch() to avoid actual file system watchers
 */

/**
 * MUST: Build Integration
 * - Module MUST compile without TypeScript errors
 * - Module MUST be importable via barrel export (import from 'src/modules/config')
 * - Module MUST NOT break existing 782 test suite
 * - Server MUST boot without errors with new module present
 */

/**
 * MUST NOT: Runtime Behavior Changes
 * - Implementation MUST NOT modify any existing tool behavior
 * - Implementation MUST NOT change vault operations
 * - Implementation MUST NOT affect YAML processing
 * - Implementation MUST NOT impact template processing
 * - All existing tests MUST continue passing without modifications
 */

/**
 * MUST NOT: Premature Features
 * - Implementation MUST NOT implement file reading (future phase)
 * - Implementation MUST NOT implement instruction branching logic (future phase)
 * - Implementation MUST NOT modify any tool handlers (future phase)
 * - Implementation MUST remain pure scaffolding (pass-through only)
 */

// ============================================================================
// VALIDATION CHECKLIST
// ============================================================================

/**
 * Implementation Completion Checklist:
 *
 * Configuration:
 * [ ] CustomInstructionsConfig interface added to src/shared/types.ts
 * [ ] LifeOSConfig interface extended with customInstructions field
 * [ ] LIFEOS_CONFIG includes customInstructions: undefined
 * [ ] npm run typecheck passes
 *
 * Module Creation:
 * [ ] src/modules/config/ directory created
 * [ ] instruction-processor.ts implements all IInstructionProcessor methods
 * [ ] index.ts barrel export created
 * [ ] Module follows existing patterns (no circular dependencies)
 *
 * Pass-Through Behavior:
 * [ ] getInstructions() returns null when no config
 * [ ] getInstructions() returns inline config when present
 * [ ] getInstructions() warns for filePath (not implemented)
 * [ ] applyInstructions() returns context unchanged
 * [ ] applyInstructions() sets modified = false
 *
 * File Watching:
 * [ ] initializeWatcher() skips when DISABLE_CONFIG_WATCH=true
 * [ ] initializeWatcher() uses fs.watch() when conditions met
 * [ ] File changes trigger clearCache()
 * [ ] Errors handled gracefully (no crashes)
 *
 * Testing:
 * [ ] Unit tests created (tests/unit/instruction-processor.test.ts)
 * [ ] Tests cover all methods (12+ test cases)
 * [ ] Tests use DISABLE_CONFIG_WATCH=true
 * [ ] Tests mock fs.watch()
 * [ ] Tests verify pass-through behavior
 * [ ] cleanup() called in afterEach hooks
 * [ ] All 782 existing tests still pass
 *
 * Build & Integration:
 * [ ] npm run build succeeds
 * [ ] npm run typecheck passes
 * [ ] npm test passes (existing + new tests)
 * [ ] Server boots without errors
 * [ ] No circular dependencies
 *
 * Documentation:
 * [ ] docs/ARCHITECTURE.md updated with config module section
 * [ ] docs/guides/CUSTOM-INSTRUCTIONS.md created
 * [ ] markdownlint-cli2 passes
 */
