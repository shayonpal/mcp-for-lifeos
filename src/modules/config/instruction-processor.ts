/**
 * Instruction Processor - Custom Instructions Scaffolding (Phase 1)
 *
 * This module provides the infrastructure for custom instruction handling
 * with file watching and hot-reload support. Currently in pass-through mode.
 *
 * @module modules/config/instruction-processor
 */

import { watch, FSWatcher } from 'fs';
import { format } from 'date-fns';
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
 * Modified instruction context
 * Extends InstructionContext with modification fields
 */
export interface ModifiedInstructionContext extends InstructionContext {
  /** Modified title (if naming convention applied) */
  modifiedTitle?: string;

  /** Modified frontmatter (if default fields applied) */
  modifiedFrontmatter?: Record<string, any>;

  /** Modified content (if boilerplate/formatting applied) */
  modifiedContent?: string;

  /** Modified template selection (if override applied) */
  modifiedTemplate?: string;
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
   * MCP-150 Implementation:
   * - Branches on context.operation to select relevant rules
   * - Parses rule strings into structured objects
   * - Applies rules to modify context (modifiedTitle, modifiedFrontmatter, modifiedContent)
   * - Tracks applied rules in result
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

    // Parse rules for the specific operation and note type
    const parsedRules = this.parseRulesForOperation(relevantRules, context.noteType);

    if (!parsedRules) {
      logger.debug('No parsed rules for note type', {
        operation: context.operation,
        noteType: context.noteType
      });
      return {
        context,
        modified: false,
        appliedRules: []
      };
    }

    // Apply parsed rules to modify context
    const modifiedContext = this.applyRulesToContext(
      context,
      parsedRules,
      context.operation,
      appliedRules
    );

    const modified = appliedRules.length > 0;

    logger.info('Applied instruction rules', {
      operation: context.operation,
      noteType: context.noteType,
      rulesApplied: appliedRules.length,
      source: result.source
    });

    return {
      context: modifiedContext,
      modified,
      appliedRules
    };
  }

  /**
   * Normalize template key to config key
   * Maps template keys to their corresponding config file keys
   *
   * @param templateKey - Template key from tool-router (e.g., 'daily', 'placetovisit')
   * @returns Normalized config key (e.g., 'dailyNotes', 'placeToVisit')
   */
  private static normalizeNoteType(templateKey: string | undefined): string | undefined {
    if (!templateKey) {
      return undefined;
    }

    // Mapping of template keys to config keys
    const keyMap: Record<string, string> = {
      'daily': 'dailyNotes',
      'placetovisit': 'placeToVisit',
      'books': 'book',
      'application': 'application',
      'article': 'article',
      'person': 'person',
      'restaurant': 'restaurant',
      'medicine': 'medical',
      'newsletter': 'newsletter',
      'game': 'game'
    };

    // Return mapped key or original key (for exact matches)
    return keyMap[templateKey.toLowerCase()] || templateKey;
  }

  /**
   * Parse rules for a specific operation and note type
   * Handles both stringified JSON and legacy string rules
   * Merges general rules with note-type-specific rules
   *
   * @param rulesString - Stringified JSON rules or legacy string
   * @param noteType - The note type to extract rules for
   * @returns Parsed rules object or null if not found
   */
  private static parseRulesForOperation(
    rulesString: string | undefined,
    noteType: string | undefined
  ): Record<string, any> | null {
    if (!rulesString) {
      return null;
    }

    try {
      // Attempt to parse as JSON
      const parsed = JSON.parse(rulesString);

      // If noteType is provided, try to extract note-type-specific rules
      if (noteType && typeof parsed === 'object' && parsed !== null) {
        // Normalize the note type key
        const normalizedNoteType = this.normalizeNoteType(noteType);

        // Extract general rules (if present)
        const generalRules = parsed.general || {};

        // Extract note-type-specific rules
        let noteSpecificRules: Record<string, any> = {};

        if (normalizedNoteType && parsed[normalizedNoteType]) {
          noteSpecificRules = parsed[normalizedNoteType];
          logger.debug('Extracted note-type-specific rules', {
            noteType,
            normalizedNoteType,
            hasRules: true
          });
        }

        // Merge general rules with note-specific rules (note-specific takes precedence)
        if (Object.keys(generalRules).length > 0 || Object.keys(noteSpecificRules).length > 0) {
          const mergedRules = {
            ...generalRules,
            ...noteSpecificRules
          };

          logger.debug('Merged general and note-specific rules', {
            generalRulesCount: Object.keys(generalRules).length,
            noteSpecificRulesCount: Object.keys(noteSpecificRules).length,
            totalRulesCount: Object.keys(mergedRules).length
          });

          return mergedRules;
        }

        // If no general or note-specific rules, return the entire parsed object as fallback
        logger.debug('Using parsed rules as-is (no general or note-specific rules found)', {
          noteType
        });
        return parsed;
      }

      // Return parsed rules as-is if no noteType filtering needed
      return parsed;
    } catch (error) {
      // Legacy string rule (backward compatibility)
      logger.debug('Treating rules as legacy string format', {
        rulesLength: rulesString.length
      });
      return {
        legacy: true,
        content: rulesString
      };
    }
  }

  /**
   * Apply parsed rules to modify context
   * Handles naming conventions, YAML defaults, and content boilerplate
   *
   * @param context - Original context
   * @param rules - Parsed rules object
   * @param operation - Operation type
   * @param appliedRules - Array to track applied rules
   * @returns Modified context
   */
  private static applyRulesToContext(
    context: InstructionContext,
    rules: Record<string, any>,
    operation: string,
    appliedRules: string[]
  ): InstructionContext {
    const modifiedContext = { ...context };

    // Apply rules based on operation type
    switch (operation) {
      case 'create':
        this.applyNoteCreationRules(modifiedContext, rules, appliedRules);
        break;
      case 'edit':
      case 'insert':
        this.applyEditingRules(modifiedContext, rules, appliedRules);
        break;
      case 'template':
        this.applyTemplateRules(modifiedContext, rules, appliedRules);
        break;
    }

    return modifiedContext;
  }

  /**
   * Apply note creation rules
   * Handles naming conventions, YAML defaults, and content structure
   */
  private static applyNoteCreationRules(
    context: InstructionContext & Partial<ModifiedInstructionContext>,
    rules: Record<string, any>,
    appliedRules: string[]
  ): void {
    // Apply YAML defaults
    if (rules.yaml && typeof rules.yaml === 'object') {
      context.modifiedFrontmatter = { ...rules.yaml };
      appliedRules.push('yaml:defaults');
      logger.debug('Applied YAML defaults', {
        fields: Object.keys(rules.yaml)
      });
    }

    // Apply content structure (boilerplate)
    if (rules.contentStructure?.requiredHeadings) {
      const headings = rules.contentStructure.requiredHeadings as string[];
      const boilerplate = headings.map((h) => `## ${h}\n\n`).join('');
      context.modifiedContent = boilerplate;
      appliedRules.push('content:structure');
      logger.debug('Applied content structure', {
        headingsCount: headings.length
      });
    }

    // Apply filename format
    if (rules.filenameFormat && typeof rules.filenameFormat === 'string') {
      try {
        // Convert config format (e.g., "YYYY-MM-DD") to date-fns format (e.g., "yyyy-MM-dd")
        const dateFnsFormat = rules.filenameFormat
          .replace(/YYYY/g, 'yyyy')
          .replace(/DD/g, 'dd');

        // Format current date using the pattern
        const formattedDate = format(new Date(), dateFnsFormat);
        context.modifiedTitle = formattedDate;

        appliedRules.push('naming:format');
        logger.debug('Applied filename format rule', {
          format: rules.filenameFormat,
          modifiedTitle: formattedDate
        });
      } catch (error) {
        // Log error but don't crash - graceful degradation
        logger.warn('Failed to apply filename format rule', {
          format: rules.filenameFormat,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Apply editing rules
   * Handles content formatting and frontmatter validation
   */
  private static applyEditingRules(
    context: InstructionContext & Partial<ModifiedInstructionContext>,
    rules: Record<string, any>,
    appliedRules: string[]
  ): void {
    // Handle legacy string rules (backward compatibility)
    if (rules.legacy && rules.content) {
      appliedRules.push('editing:legacy');
      logger.debug('Detected legacy editing rules', {
        contentLength: rules.content.length
      });
      return;
    }

    // Apply preserve fields rule
    if (rules.preserveFields && Array.isArray(rules.preserveFields)) {
      appliedRules.push('editing:preserveFields');
      logger.debug('Will preserve fields', {
        fields: rules.preserveFields
      });
    }

    // Future: implement content formatting, field removal, etc.
    if (rules.removeValues) {
      appliedRules.push('editing:removeValues');
    }
  }

  /**
   * Apply template rules
   * Handles template selection and data overrides
   */
  private static applyTemplateRules(
    context: InstructionContext & Partial<ModifiedInstructionContext>,
    rules: Record<string, any>,
    appliedRules: string[]
  ): void {
    // Apply template selection
    if (rules.template && typeof rules.template === 'string') {
      context.modifiedTemplate = rules.template;
      appliedRules.push('template:selection');
      logger.debug('Applied template selection', {
        template: rules.template
      });
    }

    // Apply required YAML for templates
    if (rules.requiredYaml && Array.isArray(rules.requiredYaml)) {
      appliedRules.push('template:requiredYaml');
      logger.debug('Detected required YAML fields', {
        fieldsCount: rules.requiredYaml.length
      });
    }
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
