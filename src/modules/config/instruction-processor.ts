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

  /** Whether any modifications were applied */
  modified: boolean;

  /** Applied instruction rules (for debugging) */
  appliedRules?: string[];
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

    // Return inline config if present
    if (config.inline) {
      return {
        instructions: config.inline,
        source: 'inline',
        loadedAt: new Date()
      };
    }

    // File-based config: not yet implemented
    if (config.filePath) {
      logger.warn(
        'File-based custom instructions not yet implemented',
        { filePath: config.filePath }
      );
      return {
        instructions: null,
        source: 'none',
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
   * Apply instructions to context
   * Phase 1: Pure pass-through, no modifications
   *
   * Future phases will implement branching logic based on:
   * - context.operation type
   * - context.noteType
   * - Configured instruction rules
   */
  static applyInstructions(context: InstructionContext): InstructionApplicationResult {
    logger.debug('InstructionProcessor.applyInstructions called (pass-through mode)', {
      operation: context.operation,
      noteType: context.noteType
    });

    // Phase 1: Pure pass-through, no modifications
    return {
      context,
      modified: false,
      appliedRules: []
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
