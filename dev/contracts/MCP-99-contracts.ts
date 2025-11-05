/**
 * Implementation contracts for Linear Issue: MCP-99
 * Issue: Finalize request handler extraction and remove switch statement
 *
 * Defines contracts for completing the handler extraction refactoring by
 * removing the switch statement from index.ts and enabling legacy alias
 * handlers to work across all tool modes.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-99/finalize-request-handler-extraction-and-remove-switch-statement
 */

import type { ToolHandler } from './MCP-8-contracts.js';

// ============================================================================
// INPUT CONTRACTS
// ============================================================================

/**
 * Configuration for switch statement removal phase
 *
 * This contract documents the transition from hybrid dispatch with switch
 * fallback to pure factory pattern routing through the handler registry.
 */
export interface SwitchRemovalConfig {
  /**
   * Phase 1: Remove legacy-only mode guards from legacy alias handlers
   *
   * Legacy alias handlers currently throw errors when toolMode === 'legacy-only'.
   * This prevents them from routing to consolidated handlers in that mode.
   *
   * Target locations in src/server/handlers/legacy-alias-handlers.ts:
   * - Search alias handlers: ~lines 77-79, 148-150
   * - List alias handlers: ~lines 204-207
   * - Create alias handler: similar pattern
   *
   * Action: Remove all mode guard checks that throw in legacy-only mode
   */
  removeModeGuards: {
    targetFile: 'src/server/handlers/legacy-alias-handlers.ts';
    guardLocations: Array<{
      handlerType: 'search' | 'list' | 'create';
      approximateLine: number;
      guardPattern: 'if (context.toolMode === \'legacy-only\') { throw ... }';
    }>;
  };

  /**
   * Phase 2: Delete switch statement from registerHandlers
   *
   * After mode guards are removed, the switch statement in index.ts becomes
   * completely unreachable. All tools route through the handler registry.
   *
   * Target location in src/index.ts:
   * - Switch statement: lines 222-639 (~418 lines total)
   *   - Error-throwing guards: lines 224-263 (40 lines)
   *   - Legacy implementations: lines 265-634 (378 lines)
   *
   * Action: Delete entire switch block, keep only error wrapper
   */
  deleteSwitchStatement: {
    targetFile: 'src/index.ts';
    functionName: 'registerHandlers';
    switchLocation: {
      startLine: 222;
      endLine: 639;
      totalLines: 418;
    };
    keepErrorWrapper: {
      startLine: 640;
      endLine: 648;
    };
  };

  /**
   * Phase 3: Update hybrid dispatch logic
   *
   * Current hybrid dispatch has mode checks preventing legacy alias routing
   * in legacy-only mode. After Phase 1 completes, these checks are obsolete.
   *
   * Target location in src/index.ts:
   * - Hybrid dispatch block: lines 175-212
   * - Mode check: line 175 checks `toolModeConfig.mode !== 'legacy-only'`
   *
   * Action: Simplify to route all legacy alias tools through registry
   */
  simplifyHybridDispatch: {
    targetFile: 'src/index.ts';
    currentModeCheck: 'toolModeConfig.mode !== \'legacy-only\'';
    proposedChange: 'Remove mode check, route all legacy aliases through registry';
  };
}

// ============================================================================
// OUTPUT CONTRACTS
// ============================================================================

/**
 * Expected outcomes after switch statement removal
 *
 * Verifies that the refactoring achieves the architectural goals without
 * breaking existing functionality.
 */
export interface SwitchRemovalOutcome {
  /**
   * Line count reduction metrics
   */
  metrics: {
    originalLines: 1797;
    currentLines: 724;
    targetLines: 306; // Updated based on actual reduction achieved
    removedLines: 418; // Switch statement deletion
    finalReduction: '83%'; // Total reduction from original
  };

  /**
   * Architectural improvements
   */
  architecture: {
    pattern: 'pure factory pattern';
    dispatchMechanism: 'registry-based routing only';
    inlineToolLogic: 'zero lines in index.ts';
    handlerModules: Array<
      'src/server/handlers/consolidated-handlers.ts' |
      'src/server/handlers/legacy-alias-handlers.ts' |
      'src/server/handlers/note-handlers.ts' |
      'src/server/handlers/utility-handlers.ts' |
      'src/server/handlers/metadata-handlers.ts'
    >;
  };

  /**
   * Test validation requirements
   */
  testing: {
    unitTests: {
      existingPassing: 450;
      totalTests: 454;
      requiredPassing: 450; // Must maintain current pass rate
      skippedTests: 4; // Optional enhancements, not blockers
    };
    integrationTests: {
      mcpProtocol: 'all tools route through registry';
      toolModes: ['consolidated-only', 'legacy-only', 'consolidated-with-aliases'];
      behavioralRegressions: 'none allowed';
    };
    manualTests: {
      claudeDesktop: 'verify all 3 tool modes work';
      httpTransport: 'identical behavior to stdio';
      analyticTracking: 'get_daily_note tracking preserved';
    };
  };

  /**
   * Documentation updates required
   */
  documentation: {
    currentFocus: 'update MCP-99 completion status';
    changelog: 'document final metrics: ~306 lines (-83%)';
    linearIssue: 'update with actual vs target line count';
  };
}

// ============================================================================
// VALIDATION CONTRACTS
// ============================================================================

/**
 * Validation checklist for switch removal phases
 *
 * Each phase must pass validation before proceeding to the next.
 */
export interface PhaseValidation {
  /**
   * Phase 1: Mode guard removal validation
   */
  phase1: {
    modeGuardsRemoved: boolean;
    legacyAliasesWorkInLegacyMode: boolean;
    testsStillPass: boolean;
  };

  /**
   * Phase 2: Switch deletion validation
   */
  phase2: {
    switchStatementDeleted: boolean;
    errorHandlerPreserved: boolean;
    typeCheckPasses: boolean;
    testsStillPass: boolean;
  };

  /**
   * Phase 3: Hybrid dispatch simplification validation
   */
  phase3: {
    modeChecksRemoved: boolean;
    allToolsRouteToRegistry: boolean;
    allToolModesWork: boolean;
    testsStillPass: boolean;
  };

  /**
   * Final validation
   */
  final: {
    lineCountTarget: boolean; // ~306 lines achieved
    zeroBehavioralRegressions: boolean;
    httpTransportWorks: boolean;
    documentationUpdated: boolean;
    mcp9Unblocked: boolean;
  };
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error scenarios that may occur during switch removal
 *
 * @throws TypeError - If mode guard removal breaks type contracts
 * @throws ReferenceError - If switch deletion references undefined handlers
 * @throws AssertionError - If test suite fails after changes
 */
export type SwitchRemovalError =
  | 'mode-guard-removal-breaks-types'
  | 'switch-deletion-breaks-routing'
  | 'hybrid-dispatch-update-fails'
  | 'test-suite-regression'
  | 'behavioral-change-detected';

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Existing interfaces this implementation must conform to
 */
export interface IntegrationPoints {
  /**
   * Request handler factory from MCP-95
   */
  requestHandler: {
    module: 'src/server/request-handler.ts';
    factory: 'createRequestHandler';
    registry: 'MutableToolHandlerRegistry';
  };

  /**
   * Handler registration modules
   */
  handlerModules: {
    consolidated: 'src/server/handlers/consolidated-handlers.ts';
    legacyAlias: 'src/server/handlers/legacy-alias-handlers.ts';
    note: 'src/server/handlers/note-handlers.ts';
    utility: 'src/server/handlers/utility-handlers.ts';
    metadata: 'src/server/handlers/metadata-handlers.ts';
  };

  /**
   * Tool registry from MCP-7
   */
  toolRegistry: {
    module: 'src/server/tool-registry.ts';
    function: 'getToolsForMode';
    config: 'ToolRegistryConfig';
  };

  /**
   * Analytics integration
   */
  analytics: {
    module: 'src/analytics/analytics-collector.ts';
    tracking: 'recordToolExecution';
    specialCase: 'get_daily_note manual tracking preserved';
  };
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors after switch statement removal
 *
 * MUST:
 * - All 3 tool modes work identically to current implementation
 * - Legacy alias handlers route to consolidated handlers in all modes
 * - Analytics tracking preserved for all tools
 * - Test suite maintains 450/454 passing rate
 * - HTTP transport works identically to stdio
 *
 * MUST NOT:
 * - Change tool behavior or response formats
 * - Break backward compatibility with any tool mode
 * - Introduce new dependencies or external packages
 * - Modify existing handler implementations
 * - Change test expectations or skip additional tests
 */
export const BEHAVIORAL_REQUIREMENTS = {
  preserveToolBehavior: true,
  maintainBackwardCompatibility: true,
  zeroDependencyChanges: true,
  noHandlerModifications: true,
  maintainTestCoverage: true,
} as const;

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Legacy tool names that will route through alias handlers after Phase 1
 */
export type LegacyToolName =
  | 'search_notes'
  | 'advanced_search'
  | 'quick_search'
  | 'search_by_content_type'
  | 'search_recent'
  | 'find_notes_by_pattern'
  | 'create_note_from_template'
  | 'list_folders'
  | 'list_daily_notes'
  | 'list_templates'
  | 'list_yaml_properties';

/**
 * Tool count validation per mode
 */
export interface ToolCountByMode {
  'consolidated-only': 13; // 3 consolidated + 10 always-available
  'legacy-only': 21; // 11 legacy + 10 always-available
  'consolidated-with-aliases': 24; // 3 consolidated + 11 aliases + 10 always-available
}

/**
 * Handler registration order (maintains MCP-96 pattern)
 */
export type HandlerRegistrationChain =
  | 'registerConsolidatedHandlers'
  | 'registerLegacyAliasHandlers'
  | 'registerNoteHandlers'
  | 'registerUtilityHandlers'
  | 'registerMetadataHandlers';
