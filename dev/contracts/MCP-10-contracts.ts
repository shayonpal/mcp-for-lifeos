/**
 * Implementation contracts for Linear Issue: MCP-10
 * Issue: Integration and cleanup
 *
 * Verification and documentation refresh after server decomposition completion.
 * Validates module boundaries, MCP protocol compliance, dual-transport functionality,
 * and ensures documentation reflects the decomposed architecture.
 *
 * These contracts define expected test behavior, documentation updates, and validation criteria.
 * All implementation MUST conform to these interfaces.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-10/integration-and-cleanup
 */

// ============================================================================
// TEST SUITE CONTRACTS - MODULE BOUNDARIES
// ============================================================================

/**
 * Module boundary test structure
 *
 * Validates factory patterns, lazy initialization, and module independence
 */
export interface ModuleBoundaryTests {
  mcpServerFactory: {
    testFile: 'tests/integration/mcp-server-factory.test.ts';
    coverage: [
      'server instantiation with config',
      'transport creation (stdio)',
      'analytics singleton management',
      'tool mode parsing',
      'session ID generation',
      'client info tracking',
      'lifecycle (connect/shutdown)'
    ];
  };
  handlerLazyInit: {
    testFile: 'tests/integration/handler-initialization.test.ts';
    coverage: [
      'handlers loaded on first call',
      'shared context propagated',
      'analytics exemption list respected',
      'tool mode enforcement per handler'
    ];
  };
  hybridDispatch: {
    testFile: 'tests/integration/hybrid-dispatch.test.ts';
    coverage: [
      'registry miss triggers fallback',
      'direct handler invocation',
      'error handling in fallback',
      'analytics tracking in both paths'
    ];
  };
}

/**
 * Factory instantiation test contract
 */
export interface McpServerFactoryTest {
  inputs: {
    serverName: string;
    serverVersion: string;
    toolMode: 'legacy-only' | 'consolidated-only' | 'consolidated-with-aliases';
    capabilities: {
      tools: {};
      resources?: {};
    };
  };
  expectedOutputs: {
    serverInstance: {
      hasServer: boolean;
      hasAnalytics: boolean;
      hasSessionId: boolean;
      sessionIdFormat: 'UUID v4';
    };
    methods: {
      connect: 'async function';
      shutdown: 'async function';
    };
  };
}

/**
 * Handler lazy initialization test contract
 */
export interface HandlerLazyInitTest {
  setup: {
    toolName: string;
    expectedHandler: string; // Module path
    contextRequired: ['registryConfig', 'analytics'];
  };
  execution: {
    firstCall: {
      triggersLoad: boolean;
      contextPassed: boolean;
      analyticsTracked: boolean;
    };
    subsequentCalls: {
      usesCache: boolean;
      performanceDelta: '<10%'; // Subsequent calls within 10% of first call
    };
  };
}

// ============================================================================
// MCP PROTOCOL COMPLIANCE TEST CONTRACTS
// ============================================================================

/**
 * MCP protocol compliance test structure
 *
 * Validates stdio/HTTP transport consistency and MCP spec conformance
 */
export interface McpProtocolTests {
  stdioTransport: {
    testFile: 'tests/integration/stdio-transport.test.ts';
    coverage: [
      'all 29 tools callable via stdio',
      'tool discovery (list_tools)',
      'capability discovery',
      'error responses MCP-compliant',
      'session lifecycle'
    ];
  };
  httpTransport: {
    testFile: 'tests/integration/http-transport.test.ts';
    coverage: [
      'optional HTTP server activation',
      'same tools as stdio',
      'transport independence',
      'session preservation',
      'SSE streaming (if applicable)'
    ];
  };
  toolModeEnforcement: {
    testFile: 'tests/integration/tool-mode-enforcement.test.ts';
    coverage: [
      'legacy-only: 12 tools (9 always + 3 legacy)',
      'consolidated-only: 12 tools (9 always + 3 consolidated)',
      'consolidated-with-aliases: 34 tools (9 + 3 + 11 + 11)',
      'unknown tool error handling',
      'alias resolution'
    ];
  };
  bootRecovery: {
    testFile: 'tests/integration/boot-recovery.test.ts'; // Already exists
    coverage: [
      'orphaned WAL cleanup on startup',
      'age-based WAL filtering (>1min)',
      'recovery attempt logging',
      'server startup continues regardless'
    ];
  };
}

/**
 * Stdio transport test contract
 */
export interface StdioTransportTest {
  toolCoverage: {
    consolidated: ['search', 'create_note', 'list'];
    legacyAliases: [
      'search_notes',
      'advanced_search',
      'quick_search',
      'search_by_content_type',
      'search_recent',
      'find_notes_by_pattern',
      'create_note_from_template',
      'list_folders',
      'list_daily_notes',
      'list_templates',
      'list_yaml_properties'
    ];
    alwaysAvailable: [
      'get_server_version',
      'get_yaml_rules',
      'read_note',
      'edit_note',
      'get_daily_note',
      'diagnose_vault',
      'move_items',
      'insert_content',
      'list_yaml_property_values'
    ];
  };
  validation: {
    allToolsCallable: boolean;
    errorResponseFormat: {
      hasIsError: boolean;
      hasContentArray: boolean;
      contentType: 'text';
    };
  };
}

/**
 * Dual-transport consistency test contract
 */
export interface DualTransportConsistencyTest {
  testScenarios: [
    {
      tool: 'search';
      params: { query: 'test', mode: 'quick' };
      expectation: 'stdio result === HTTP result';
    },
    {
      tool: 'get_server_version';
      params: {};
      expectation: 'same version metadata in both transports';
    }
  ];
  errorScenarios: [
    {
      tool: 'unknown_tool';
      expectation: 'same error format and message';
    }
  ];
}

/**
 * Tool mode enforcement test contract
 */
export interface ToolModeEnforcementTest {
  modes: {
    'legacy-only': {
      expectedToolCount: 20; // 9 always + 11 legacy
      mustInclude: ['search_notes', 'list_folders'];
      mustExclude: ['search', 'list'];
    };
    'consolidated-only': {
      expectedToolCount: 12; // 9 always + 3 consolidated
      mustInclude: ['search', 'create_note', 'list'];
      mustExclude: ['search_notes', 'list_folders'];
    };
    'consolidated-with-aliases': {
      expectedToolCount: 34; // 9 + 3 + 11 + 11
      mustInclude: ['search', 'search_notes']; // Both present
    };
  };
  aliasResolution: {
    'search_notes': {
      resolves: 'search';
      params: { mode: 'advanced' };
    };
    'list_folders': {
      resolves: 'list';
      params: { type: 'folders' };
    };
  };
}

// ============================================================================
// DOCUMENTATION UPDATE CONTRACTS
// ============================================================================

/**
 * Documentation refresh contract
 *
 * Defines which docs need updates and what changes are required
 */
export interface DocumentationUpdates {
  adrUpdates: {
    '004-project-review-roadmap-2025.md': {
      changes: ['mark decomposition complete', 'update status from pending'];
      validation: 'no references to incomplete decomposition';
    };
    '002-strategic-pivot-to-core-server.md': {
      changes: ['update line counts', 'reflect completion status'];
      validation: 'line count: src/index.ts = 503';
    };
  };
  specUpdates: {
    'specs/implementation/request-handler-infrastructure.md': {
      changes: ['remove inline handler references', 'document pure factory pattern'];
      validation: 'no references to switch statement or inline logic';
    };
  };
  architectureValidation: {
    'ARCHITECTURE.md': {
      changes: 'verify accuracy (last updated 2025-11-02)';
      validation: [
        'module list complete',
        'handler modules documented',
        'line counts accurate'
      ];
    };
  };
  changelogEntry: {
    file: 'CHANGELOG.md';
    entry: {
      category: 'Added' | 'Changed';
      description: 'Integration testing and documentation refresh (MCP-10)';
      timestamp: string; // ISO format
      linearReference: 'MCP-10';
    };
  };
}

/**
 * ADR update validation contract
 */
export interface AdrUpdateValidation {
  file: string;
  requiredChanges: string[];
  forbiddenContent: string[];
  postUpdateValidation: {
    noMonolithicReferences: boolean;
    lineCountsAccurate: boolean;
    statusReflectsCompletion: boolean;
  };
}

// ============================================================================
// OPTIONAL CLEANUP CONTRACTS
// ============================================================================

/**
 * Bootstrap module extraction contract (optional)
 *
 * Only if <500 line target is mandatory
 */
export interface BootstrapExtractionContract {
  trigger: 'src/index.ts > 500 lines';
  extraction: {
    sourceFunction: 'registerHandlers()';
    targetFile: 'src/server/bootstrap.ts';
    linesExtracted: 86;
    expectedResult: 'src/index.ts ~417 lines';
  };
  interface: {
    exports: {
      registerHandlers: {
        signature: '<T extends MutableToolHandlerRegistry>(registry: T, context: SharedContext) => T';
        purpose: 'Register all tool handlers with shared context';
      };
    };
  };
  validation: {
    importsUpdated: boolean;
    typeCheckPasses: boolean;
    allTestsPass: boolean;
    noFunctionalChanges: boolean;
  };
}

/**
 * Residual code cleanup contract
 */
export interface ResidualCodeCleanup {
  deadExports: {
    検証: 'verify only recoverPendingTransactions exported';
    action: 'remove if not needed for tests';
  };
  obsoleteConstants: {
    candidates: [
      'alwaysAvailableToolNames',
      'ANALYTICS_EXEMPT_TOOLS',
      'consolidatedToolNames',
      'legacyAliasToolNames'
    ];
    decision: 'keep (performance-critical O(1) lookups)';
  };
  backupFiles: {
    'index.ts.backup': {
      action: 'remove after validation';
      validation: 'verify current index.ts works';
    };
  };
}

// ============================================================================
// VALIDATION & ACCEPTANCE CRITERIA
// ============================================================================

/**
 * MCP-10 acceptance criteria contract
 */
export interface Mcp10AcceptanceCriteria {
  testSuite: {
    allTestsPass: boolean; // 724/728+ tests
    newTestsAdded: {
      moduleBoundaries: '>=15 tests';
      mcpProtocol: '>=20 tests';
    };
    coverage: '>=99%';
  };
  documentation: {
    adrsUpdated: number; // 2 files minimum
    specsUpdated: number; // 1 file minimum
    architectureVerified: boolean;
    changelogEntryAdded: boolean;
  };
  codeQuality: {
    indexLinesOptional: '<=500 lines'; // Optional target
    typeCheckPasses: boolean;
    noDeadCode: boolean;
  };
  integration: {
    stdioTransportWorks: boolean;
    httpTransportWorks: boolean; // When enabled
    claudeDesktopSmoke: boolean; // Manual verification
    bootRecoveryActivates: boolean;
  };
}

/**
 * Test execution validation contract
 */
export interface TestExecutionValidation {
  preConditions: {
    dependenciesInstalled: boolean; // @date-fns/tz present
    vaultPathSet: boolean;
    typeCheckPasses: boolean;
  };
  execution: {
    unitTestsPass: boolean;
    integrationTestsPass: boolean;
    noRegressions: boolean;
  };
  postConditions: {
    coverageReportGenerated: boolean;
    allSuitesGreen: boolean;
    performanceAcceptable: boolean; // <10% overhead
  };
}

/**
 * Manual smoke test contract
 */
export interface ManualSmokeTest {
  environment: 'Claude Desktop' | 'Raycast' | 'Cursor';
  scenarios: [
    {
      action: 'list_tools';
      expectation: '29 tools returned (consolidated-with-aliases mode)';
    },
    {
      action: 'search with query="test"';
      expectation: 'results returned, no errors';
    },
    {
      action: 'create_note with title="Smoke Test"';
      expectation: 'note created successfully';
    },
    {
      action: 'rename_note with updateLinks=true';
      expectation: 'transaction completes, links updated';
    }
  ];
  validation: {
    noErrors: boolean;
    responseTimes: '<2s per tool call';
    toolSelectionAccuracy: '>=95%'; // AI selects correct tool
  };
}

// ============================================================================
// IMPLEMENTATION PHASES CONTRACT
// ============================================================================

/**
 * MCP-10 implementation phases
 *
 * Defines the sequential phases for implementation
 */
export interface Mcp10ImplementationPhases {
  phase1: {
    name: 'Environment Validation';
    tasks: [
      'verify @date-fns/tz installed',
      'run npm test',
      'confirm all 724+ tests pass',
      'run npm run typecheck'
    ];
    completion: 'all tasks green';
  };
  phase2: {
    name: 'Module Boundary Testing';
    tasks: [
      'create tests/integration/mcp-server-factory.test.ts',
      'create tests/integration/handler-initialization.test.ts',
      'create tests/integration/hybrid-dispatch.test.ts'
    ];
    testCount: '>=15 new tests';
  };
  phase3: {
    name: 'MCP Protocol Compliance Testing';
    tasks: [
      'create tests/integration/stdio-transport.test.ts',
      'create tests/integration/http-transport.test.ts',
      'create tests/integration/tool-mode-enforcement.test.ts'
    ];
    testCount: '>=20 new tests';
  };
  phase4: {
    name: 'Documentation Refresh';
    tasks: [
      'update docs/adr/004-project-review-roadmap-2025.md',
      'update docs/adr/002-strategic-pivot-to-core-server.md',
      'update docs/specs/implementation/request-handler-infrastructure.md',
      'verify docs/ARCHITECTURE.md accuracy',
      'add CHANGELOG.md entry'
    ];
    validation: 'no monolithic structure references remain';
  };
  phase5: {
    name: 'Optional Bootstrap Extraction';
    tasks: [
      'extract registerHandlers() to src/server/bootstrap.ts',
      'update imports in src/index.ts',
      'verify <500 line count'
    ];
    trigger: 'only if <500 line target is mandatory';
  };
}

/**
 * Overall MCP-10 contract
 *
 * Top-level contract encompassing all aspects of MCP-10
 */
export interface Mcp10Contract {
  issue: {
    id: 'MCP-10';
    title: 'Integration and cleanup';
    priority: 'High';
    labels: ['Technical Debt', 'Documentation'];
    dependencies: ['MCP-2', 'MCP-6', 'MCP-7', 'MCP-8', 'MCP-9', 'MCP-96', 'MCP-97', 'MCP-98', 'MCP-99'];
  };
  moduleBoundaryTests: ModuleBoundaryTests;
  mcpProtocolTests: McpProtocolTests;
  documentationUpdates: DocumentationUpdates;
  optionalCleanup: {
    bootstrapExtraction: BootstrapExtractionContract;
    residualCodeCleanup: ResidualCodeCleanup;
  };
  acceptanceCriteria: Mcp10AcceptanceCriteria;
  implementationPhases: Mcp10ImplementationPhases;
  validation: {
    testExecution: TestExecutionValidation;
    manualSmoke: ManualSmokeTest;
  };
}
