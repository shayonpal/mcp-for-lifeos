/**
 * Instruction Processor - Custom Instructions Scaffolding (Phase 1)
 *
 * This module provides the infrastructure for custom instruction handling
 * with file watching and hot-reload support. Currently in pass-through mode.
 *
 * @module modules/config/instruction-processor
 */

import { watch, FSWatcher } from 'fs';
import { LIFEOS_CONFIG } from '../../shared/config.js';
import { CustomInstructionsConfig } from '../../shared/types.js';
import { logger } from '../../shared/logger.js';
import { readFileWithRetry } from '../files/file-io.js';

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

/**
 * Result of instruction retrieval
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
 */
export interface InstructionApplicationResult {
  /** The context after instruction application (currently unchanged) */
  context: InstructionContext;

  /**
   * Whether any modifications were applied
   * Phase 2: Indicates rules were detected (even if not yet applied to context)
   * Future: Will indicate actual context modification
   */
  modified: boolean;

  /** Applied instruction rules (for debugging) - always present, empty array if no rules */
  appliedRules: string[];
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

/**
 * InstructionProcessor - Singleton for custom instruction handling
 *
 * Phase 1: Pass-through mode
 * - getInstructions() returns configured instructions (no processing)
 * - applyInstructions() returns context unchanged
 * - Hot-reload infrastructure in place but file reading not implemented
 *
 * Future phases will implement:
 * - File-based instruction reading
 * - Instruction branching logic
 * - Context modification based on instructions
 */
export class InstructionProcessor {
  private static watcher: FSWatcher | null = null;
  private static cachedInstructions: CustomInstructionsConfig['inline'] | null = null;
  private static watcherInitialized = false;

  /**
   * Get current custom instructions
   * Returns null if no instructions configured
   *
   * Phase 1 Behavior:
   * - Returns inline config if present
   * - Warns if filePath provided (not yet implemented)
   * - Returns null if no config
   */
  static getInstructions(): InstructionRetrievalResult {
    const config = LIFEOS_CONFIG.customInstructions;

    if (!config) {
      return {
        instructions: null,
        source: 'none',
        loadedAt: new Date()
      };
    }

    // File-based config takes precedence
    if (config.filePath) {
      // Return cached instructions if available
      if (this.cachedInstructions !== null) {
        logger.debug('Returning cached file-based instructions', {
          filePath: config.filePath
        });
        return {
          instructions: this.cachedInstructions,
          source: 'file',
          loadedAt: new Date()
        };
      }

      // Load and cache instructions from file
      try {
        const fileContent = this.readInstructionFile(config.filePath);
        const parsedInstructions = this.parseInstructionFile(fileContent, config.filePath);

        // Cache the parsed instructions
        this.cachedInstructions = parsedInstructions;

        logger.info('Loaded file-based custom instructions', {
          filePath: config.filePath,
          hasNoteCreationRules: !!parsedInstructions.noteCreationRules,
          hasEditingRules: !!parsedInstructions.editingRules,
          hasTemplateRules: !!parsedInstructions.templateRules
        });

        return {
          instructions: parsedInstructions,
          source: 'file',
          loadedAt: new Date()
        };
      } catch (error: any) {
        logger.error('Failed to load file-based instructions, falling back to inline', {
          filePath: config.filePath,
          error: error.message
        });

        // Fall back to inline config if available
        if (config.inline) {
          return {
            instructions: config.inline,
            source: 'inline',
            loadedAt: new Date()
          };
        }

        // Return empty if no fallback available
        return {
          instructions: null,
          source: 'none',
          loadedAt: new Date()
        };
      }
    }

    // Return inline config if present
    if (config.inline) {
      return {
        instructions: config.inline,
        source: 'inline',
        loadedAt: new Date()
      };
    }

    return {
      instructions: null,
      source: 'none',
      loadedAt: new Date()
    };
  }

  /**
   * Read instruction file from disk
   * Uses readFileWithRetry for resilience against iCloud/network issues
   *
   * @throws Error if file cannot be read after retries
   */
  private static readInstructionFile(filePath: string): string {
    try {
      return readFileWithRetry(filePath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Instruction file not found: ${filePath}`);
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied reading instruction file: ${filePath}`);
      } else {
        throw new Error(`Failed to read instruction file: ${error.message}`);
      }
    }
  }

  /**
   * Parse instruction file content as JSON
   * Validates against expected structure
   *
   * @throws Error if parsing or validation fails
   */
  private static parseInstructionFile(
    content: string,
    filePath: string
  ): NonNullable<CustomInstructionsConfig['inline']> {
    try {
      const parsed = JSON.parse(content);

      // Validate structure - must have at least one rule type
      if (!parsed.noteCreationRules && !parsed.editingRules && !parsed.templateRules) {
        throw new Error(
          'Invalid instruction file: must contain at least one of ' +
          'noteCreationRules, editingRules, or templateRules'
        );
      }

      // Convert to strings for storage (backward compatible with inline string format)
      // File-based instructions can be structured objects - stringify them for storage
      // MCP-150 will parse them back into objects when applying
      return {
        noteCreationRules: parsed.noteCreationRules
          ? (typeof parsed.noteCreationRules === 'string'
              ? parsed.noteCreationRules
              : JSON.stringify(parsed.noteCreationRules))
          : undefined,
        editingRules: parsed.editingRules
          ? (typeof parsed.editingRules === 'string'
              ? parsed.editingRules
              : JSON.stringify(parsed.editingRules))
          : undefined,
        templateRules: parsed.templateRules
          ? (typeof parsed.templateRules === 'string'
              ? parsed.templateRules
              : JSON.stringify(parsed.templateRules))
          : undefined
      };
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in instruction file ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Apply instructions to context
   *
   * Phase 2 Behavior:
   * - Branches on context.operation to select relevant rules
   * - Logs when rules are available for the operation
   * - Tracks rule availability in appliedRules array
   * - Returns modified=true when rules found (even if not yet applied)
   *
   * Future enhancements:
   * - Actual rule parsing and application
   * - Context modification based on parsed rules
   */
  static applyInstructions(context: InstructionContext): InstructionApplicationResult {
    logger.debug('InstructionProcessor.applyInstructions called', {
      operation: context.operation,
      noteType: context.noteType
    });

    // Get current instructions
    const result = this.getInstructions();

    // If no instructions configured, return pass-through
    if (!result.instructions) {
      logger.debug('No instructions configured, returning pass-through');
      return {
        context,
        modified: false,
        appliedRules: []
      };
    }

    const instructions = result.instructions;
    const appliedRules: string[] = [];
    let modified = false;

    // Branch on operation type to select relevant rules
    let relevantRules: string | undefined;
    let ruleType: string;

    switch (context.operation) {
      case 'create':
        relevantRules = instructions.noteCreationRules;
        ruleType = 'noteCreationRules';
        break;
      case 'edit':
      case 'insert': // Treat insert as partial edit
        relevantRules = instructions.editingRules;
        ruleType = 'editingRules';
        break;
      case 'template':
        relevantRules = instructions.templateRules;
        ruleType = 'templateRules';
        break;
      default:
        logger.warn('Unknown operation type', { operation: context.operation });
        return {
          context,
          modified: false,
          appliedRules: []
        };
    }

    // If no relevant rules for this operation, return pass-through
    if (!relevantRules) {
      logger.debug('No rules configured for operation', {
        operation: context.operation,
        ruleType
      });
      return {
        context,
        modified: false,
        appliedRules: []
      };
    }

    // Phase 2 MVP: Log that rules would be applied, but don't modify context yet
    // Full rule parsing and application will be implemented in future iterations
    logger.info('Instruction rules available for operation', {
      operation: context.operation,
      ruleType,
      rulesLength: relevantRules.length,
      noteType: context.noteType,
      source: result.source
    });

    appliedRules.push(
      `${ruleType} available (${relevantRules.length} chars, source: ${result.source})`
    );

    // Phase 2: Mark as modified to indicate rules were detected
    // NOTE: Context is NOT actually modified yet - this flag tracks rule detection
    // Future phases will implement actual context modification
    modified = true;

    // TODO (MCP-150): Implement actual rule parsing and application
    // For now, return context with tracking that rules were found
    return {
      context,
      modified,
      appliedRules
    };
  }

  /**
   * Initialize file watcher for hot-reload
   *
   * Conditions for initialization:
   * - DISABLE_CONFIG_WATCH !== 'true' (for test isolation)
   * - Not already initialized (idempotent)
   * - config.filePath provided
   * - config.enableHotReload === true
   *
   * Uses fs.watch() for file change detection
   * Calls clearCache() on change events
   * Graceful degradation on errors (logs but doesn't crash)
   */
  static initializeWatcher(): WatcherInitializationResult {
    // Skip if disabled (for tests)
    if (process.env.DISABLE_CONFIG_WATCH === 'true') {
      logger.debug('Config file watching disabled via DISABLE_CONFIG_WATCH');
      return {
        success: false,
        error: 'Disabled via environment variable'
      };
    }

    // Skip if already initialized (idempotent)
    if (this.watcherInitialized) {
      logger.debug('Config file watcher already initialized');
      return {
        success: true,
        watchedPath: LIFEOS_CONFIG.customInstructions?.filePath
      };
    }

    const config = LIFEOS_CONFIG.customInstructions;

    // Skip if no file path configured
    if (!config?.filePath) {
      logger.debug('No custom instructions file path configured');
      return {
        success: false,
        error: 'No file path configured'
      };
    }

    // Skip if hot-reload not enabled
    if (!config.enableHotReload) {
      logger.debug('Hot-reload not enabled for custom instructions');
      return {
        success: false,
        error: 'Hot-reload not enabled'
      };
    }

    // Initialize watcher
    try {
      this.watcher = watch(config.filePath, (eventType) => {
        if (eventType === 'change') {
          logger.info('Custom instructions file changed, clearing cache', {
            filePath: config.filePath
          });
          this.clearCache();
        }
      });

      this.watcherInitialized = true;
      logger.info('Custom instructions file watcher initialized', {
        filePath: config.filePath
      });

      return {
        success: true,
        watchedPath: config.filePath
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize file watcher', {
        error: errorMessage,
        filePath: config.filePath
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Clear cached instructions
   * Forces re-read on next getInstructions() call
   *
   * Note: Cache invalidation only affects next tool execution,
   * not in-flight operations (by design)
   */
  static clearCache(): void {
    this.cachedInstructions = null;
    logger.debug('Custom instructions cache cleared');
  }

  /**
   * Cleanup watcher and cache
   * Used primarily for test isolation
   *
   * Ensures no watchers leak between tests
   * Resets all singleton state
   */
  static cleanup(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      logger.debug('Custom instructions file watcher closed');
    }

    this.watcherInitialized = false;
    this.clearCache();
  }
}
