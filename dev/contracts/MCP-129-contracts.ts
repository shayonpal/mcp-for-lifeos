/**
 * Implementation contracts for Linear Issue: MCP-129
 * Issue: Integration & Regression Testing Suite
 *
 * Comprehensive test suite expansion covering end-to-end workflows, regression tests
 * for Phase 4 features, edge cases, and vault configuration variations.
 *
 * These contracts define expected test behavior, coverage requirements, and validation criteria.
 * All test implementation MUST conform to these interfaces.
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-129
 */

// ============================================================================
// TEST SUITE STRUCTURE CONTRACTS
// ============================================================================

/**
 * Test suite organization structure
 *
 * Defines the directory structure and file organization for the testing suite
 */
export interface TestSuiteStructure {
  workflows: {
    directory: 'tests/integration/workflows';
    files: ['rename-workflows.test.ts'];
  };
  regression: {
    directory: 'tests/integration/regression';
    files: ['transaction-regression.test.ts'];
  };
  edgeCases: {
    directory: 'tests/integration/edge-cases';
    files: ['rename-edge-cases.test.ts'];
  };
  vaultConfigurations: {
    directory: 'tests/integration';
    files: ['vault-configurations.test.ts'];
  };
}

// ============================================================================
// WORKFLOW TEST CONTRACTS
// ============================================================================

/**
 * Realistic vault setup for workflow tests
 *
 * Represents a typical PARA-organized vault structure
 */
export interface WorkflowVaultSetup {
  structure: {
    projects: {
      directory: 'Projects';
      subfolders: string[];
      noteCount: number;
    };
    areas: {
      directory: 'Areas';
      subfolders: string[];
      noteCount: number;
    };
    resources: {
      directory: 'Resources';
      subfolders: string[];
      noteCount: number;
    };
    archives: {
      directory: 'Archives';
      subfolders: string[];
      noteCount: number;
    };
    daily: {
      directory: 'Daily';
      noteCount: number; // At least 7 daily notes
    };
  };
  crossReferences: {
    wikilinks: number; // Minimum bidirectional links
    blockRefs: number; // Minimum block references
  };
}

/**
 * Workflow 1: Archive Project
 *
 * End-to-end test for moving a completed project to Archives
 */
export interface ArchiveProjectWorkflow {
  setup: {
    projectName: string;
    projectPath: string; // Projects/[projectName].md
    linkedNotes: string[]; // Notes that reference this project
    blockReferences: number; // Count of block refs to project
  };
  operations: {
    preview: {
      operation: 'rename_note with dryRun=true';
      validate: [
        'affectedFiles count',
        'estimatedTime present',
        'linkScanResults accurate'
      ];
    };
    execute: {
      operation: 'rename_note with updateLinks=true';
      destination: string; // Archives/[projectName].md
    };
  };
  validation: {
    fileMoved: boolean; // File exists at new location
    oldPathEmpty: boolean; // Old location no longer exists
    linksUpdated: boolean; // All wikilinks point to new location
    blockRefsPreserved: boolean; // Block references still work
    frontmatterIntact: boolean; // YAML frontmatter unchanged
    yamlCompliant: boolean; // Auto-managed fields correct
  };
}

/**
 * Workflow 2: Organize Inbox
 *
 * Categorizing inbox notes into PARA folders
 */
export interface OrganizeInboxWorkflow {
  setup: {
    inboxNotes: Array<{
      path: string;
      category: 'project' | 'area' | 'resource';
      referencedBy: string[];
    }>;
  };
  operations: {
    categorize: Array<{
      from: string; // Inbox/note.md
      to: string; // Projects/note.md or Areas/note.md
      updateLinks: true;
    }>;
  };
  validation: {
    allNotesMoved: boolean;
    crossReferencesIntact: boolean; // Notes still reference each other correctly
    noOrphanedLinks: boolean; // No broken wikilinks
  };
}

/**
 * Workflow 3: Refactor Structure
 *
 * Multiple sequential renames with bidirectional link updates
 */
export interface RefactorStructureWorkflow {
  setup: {
    noteGraph: Array<{
      path: string;
      linksTo: string[]; // Outbound wikilinks
      linkedFrom: string[]; // Inbound wikilinks
    }>;
  };
  operations: {
    sequence: Array<{
      oldPath: string;
      newPath: string;
      updateLinks: true;
    }>;
  };
  validation: {
    allRenamesSucceeded: boolean;
    bidirectionalLinksIntact: boolean; // Both inbound and outbound links updated
    graphConsistency: boolean; // Note graph structure preserved
  };
}

// ============================================================================
// REGRESSION TEST CONTRACTS
// ============================================================================

/**
 * Phase 4 transaction system regression tests
 *
 * Protect critical features from breaking changes
 */
export interface TransactionRegressionTests {
  atomicity: {
    test: 'Transaction rollback on failure';
    scenario: 'Simulate failure during commit phase';
    validate: [
      'no partial state',
      'vault unchanged',
      'WAL cleaned up'
    ];
  };
  stalenessDetection: {
    test: 'SHA-256 staleness detection';
    scenario: 'Concurrent modification detected';
    validate: [
      'TRANSACTION_STALE_CONTENT error',
      'transaction aborted',
      'no file corruption'
    ];
  };
  bootRecovery: {
    test: 'Orphaned WAL cleanup at boot';
    scenario: 'Server crash leaves orphaned WAL';
    validate: [
      'orphaned WAL detected',
      'rollback executed',
      'vault restored to consistent state'
    ];
  };
  walCleanup: {
    test: 'WAL cleanup after success';
    scenario: 'Successful transaction completes';
    validate: [
      'WAL file deleted',
      'no WAL directory pollution'
    ];
  };
  stagingCleanup: {
    test: 'Staging file cleanup';
    scenario: 'Transaction completes or aborts';
    validate: [
      'staged files removed',
      'no .mcp-staged-* artifacts'
    ];
  };
}

// ============================================================================
// EDGE CASE TEST CONTRACTS
// ============================================================================

/**
 * Edge case test scenarios
 *
 * Boundary conditions and unusual inputs
 */
export interface EdgeCaseTests {
  largeFiles: {
    test: 'Large file handling (10MB+)';
    fileSize: number; // >= 10MB
    validate: [
      'transaction succeeds',
      'SHA-256 validation works',
      'performance acceptable'
    ];
  };
  specialCharacters: {
    test: 'Special characters in filenames';
    characters: string[]; // Unicode, spaces, emoji
    validate: [
      'rename succeeds',
      'links updated correctly',
      'no path encoding issues'
    ];
  };
  concurrentOperations: {
    sameFile: {
      test: 'Concurrent renames of same file';
      validate: [
        'one succeeds',
        'others get staleness error',
        'no data loss'
      ];
    };
    differentFiles: {
      test: 'Concurrent renames of different files';
      validate: [
        'all succeed',
        'link updates consistent',
        'no race conditions'
      ];
    };
  };
  boundaryConditions: {
    emptyFile: {
      test: 'Rename empty note';
      validate: ['succeeds with empty content'];
    };
    noFrontmatter: {
      test: 'Rename note without YAML';
      validate: ['succeeds without YAML'];
    };
    maxPathLength: {
      test: 'Near-max path length';
      pathLength: number; // Close to filesystem limit
      validate: ['succeeds or fails gracefully'];
    };
  };
}

// ============================================================================
// VAULT CONFIGURATION TEST CONTRACTS
// ============================================================================

/**
 * Vault configuration variation tests
 *
 * Different vault setups and configurations
 */
export interface VaultConfigurationTests {
  complexYAML: {
    test: 'Complex frontmatter preservation';
    frontmatter: {
      standardFields: string[]; // tags, category, contentType
      customFields: string[]; // User-defined fields
      nestedStructures: boolean; // Nested YAML objects
      arrays: boolean; // YAML arrays
    };
    validate: [
      'all fields preserved',
      'structure maintained',
      'auto-managed fields updated correctly'
    ];
  };
  paraFolders: {
    test: 'PARA folder structure moves';
    structure: {
      projects: string[];
      areas: string[];
      resources: string[];
      archives: string[];
    };
    validate: [
      'cross-folder moves work',
      'folder-scoped links updated',
      'relative paths correct'
    ];
  };
  mixedLinkFormats: {
    test: 'Mixed wikilink and block reference formats';
    linkTypes: {
      simpleWikilinks: number; // [[Note]]
      aliasedWikilinks: number; // [[Note|Alias]]
      blockReferences: number; // [[Note#^block-id]]
      headingLinks: number; // [[Note#Heading]]
    };
    validate: [
      'all link types updated',
      'block ref caret preserved',
      'heading links updated',
      'aliases preserved'
    ];
  };
  templateInteractions: {
    test: 'Template system interactions';
    scenario: 'Rename notes created from templates';
    validate: [
      'template metadata preserved',
      'custom template fields intact',
      'no template corruption'
    ];
  };
}

// ============================================================================
// TEST EXECUTION CONTRACTS
// ============================================================================

/**
 * Test execution requirements
 *
 * Performance and reliability criteria
 */
export interface TestExecutionRequirements {
  performance: {
    workflowTests: {
      maxDuration: '30s per workflow';
      memoryUsage: '< 512MB';
    };
    regressionTests: {
      maxDuration: '10s per test';
      memoryUsage: '< 256MB';
    };
    edgeCaseTests: {
      maxDuration: '60s per test'; // Some edge cases may be slow
      memoryUsage: '< 1GB'; // Large file tests
    };
  };
  reliability: {
    flakyTests: 0; // No flaky tests allowed
    retries: 0; // Tests should not require retries
    isolation: boolean; // Each test isolated with temp vault
  };
  coverage: {
    totalTests: number; // >= 23 new tests (3 workflows + 5 regression + 10 edge + 5 vault config)
    passingTests: number; // All tests must pass
    coveragePercent: number; // >= 95% coverage
  };
}

// ============================================================================
// TEST HELPER CONTRACTS
// ============================================================================

/**
 * Shared test helper functions
 *
 * Reusable utilities for test setup and validation
 */
export interface TestHelpers {
  vaultSetup: {
    createPARAVault: (vaultPath: string) => Promise<WorkflowVaultSetup>;
    createCrossReferences: (vaultPath: string, linkCount: number) => Promise<void>;
    addBlockReferences: (vaultPath: string, blockCount: number) => Promise<void>;
  };
  validation: {
    verifyFileExists: (path: string) => Promise<boolean>;
    verifyFileNotExists: (path: string) => Promise<boolean>;
    verifyLinksUpdated: (vaultPath: string, oldPath: string, newPath: string) => Promise<boolean>;
    verifyFrontmatterPreserved: (oldContent: string, newContent: string) => boolean;
    verifyBlockRefsIntact: (vaultPath: string, noteContent: string) => Promise<boolean>;
  };
  fixtures: {
    generateLargeFile: (sizeBytes: number) => Promise<string>;
    generateSpecialCharFilename: () => string;
    generateComplexYAML: () => object;
  };
}

// ============================================================================
// DOCUMENTATION CONTRACTS
// ============================================================================

/**
 * Testing guide documentation requirements
 *
 * Developer-facing documentation for the test suite
 */
export interface TestingGuideContract {
  sections: {
    overview: {
      content: [
        'Test suite purpose',
        'Coverage areas',
        'Running tests'
      ];
    };
    workflowTests: {
      content: [
        'Purpose of workflow tests',
        'Realistic scenarios covered',
        'Adding new workflows'
      ];
    };
    regressionTests: {
      content: [
        'Phase 4 features protected',
        'When to add regression tests',
        'Regression test patterns'
      ];
    };
    edgeCases: {
      content: [
        'Edge case categories',
        'Boundary condition testing',
        'Performance edge cases'
      ];
    };
    vaultConfigurations: {
      content: [
        'Configuration variations',
        'PARA structure testing',
        'YAML compliance testing'
      ];
    };
    maintenance: {
      content: [
        'Test maintenance guidelines',
        'Updating tests after changes',
        'Debugging flaky tests'
      ];
    };
  };
  location: 'docs/development/TESTING.md';
}

// ============================================================================
// CI INTEGRATION CONTRACTS
// ============================================================================

/**
 * CI integration requirements
 *
 * Automated test execution in CI environment
 */
export interface CIIntegrationContract {
  testScripts: {
    workflows: 'npm run test:workflows';
    regression: 'npm run test:regression';
    edgeCases: 'npm run test:edge-cases';
    vaultConfig: 'npm run test:vault-config';
    all: 'npm test'; // Runs all tests including new suites
  };
  ciConfig: {
    platform: 'GitHub Actions' | 'none'; // Note: Direct master workflow, no CI/CD
    runOn: ['push', 'pull_request'];
    node: ['18.x', '20.x'];
    memoryLimit: '2GB';
  };
  failureHandling: {
    failFast: false; // Run all tests even if some fail
    reporting: 'junit-xml'; // Test result format
    artifacts: ['test-coverage', 'test-results'];
  };
}

// ============================================================================
// ACCEPTANCE CRITERIA CONTRACTS
// ============================================================================

/**
 * Overall acceptance criteria for MCP-129
 *
 * All criteria must be met for issue completion
 */
export interface AcceptanceCriteriaContract {
  workflowTests: {
    count: number; // >= 3 workflow tests
    passing: boolean; // All workflow tests pass
    realistic: boolean; // Workflows represent real use cases
  };
  regressionTests: {
    count: number; // >= 5 regression tests for Phase 4
    passing: boolean; // All regression tests pass
    coverage: string[]; // [atomicity, staleness, boot recovery, WAL cleanup, staging cleanup]
  };
  edgeCaseTests: {
    count: number; // >= 10 edge case tests
    passing: boolean; // All edge case tests pass
    categories: string[]; // [large files, special chars, concurrent ops, boundaries]
  };
  vaultConfigTests: {
    count: number; // >= 5 vault configuration tests
    passing: boolean; // All vault config tests pass
    configurations: string[]; // [complex YAML, PARA folders, mixed links, templates]
  };
  overall: {
    totalTests: number; // >= 680 total tests (existing + new)
    passingTests: number; // All tests pass
    coverage: number; // >= 95% code coverage
    flakyTests: number; // Must be 0
    documentation: boolean; // Testing guide created
    ciIntegration: boolean; // CI working (or documented as not applicable)
  };
}

// ============================================================================
// IMPLEMENTATION VALIDATION CONTRACTS
// ============================================================================

/**
 * Implementation validation checklist
 *
 * Ensure all files created and configured correctly
 */
export interface ImplementationValidationContract {
  filesCreated: {
    workflows: 'tests/integration/workflows/rename-workflows.test.ts';
    regression: 'tests/integration/regression/transaction-regression.test.ts';
    edgeCases: 'tests/integration/edge-cases/rename-edge-cases.test.ts';
    vaultConfig: 'tests/integration/vault-configurations.test.ts';
    documentation: 'docs/development/TESTING.md';
  };
  packageJsonUpdated: {
    scripts: {
      'test:workflows': string;
      'test:regression': string;
      'test:edge-cases': string;
      'test:vault-config': string;
    };
  };
  testExecution: {
    allTestsRun: boolean; // npm test executes new suites
    memoryManagement: boolean; // --expose-gc flag used
    isolation: boolean; // Each test uses temp vault
  };
  validation: {
    typecheck: boolean; // npm run typecheck passes
    noWarnings: boolean; // No deprecation warnings
    performanceMet: boolean; // Tests complete within time limits
  };
}

// ============================================================================
// OVERALL MCP-129 CONTRACT
// ============================================================================

/**
 * Complete contract for MCP-129 implementation
 *
 * Top-level contract bringing together all sub-contracts
 */
export interface MCP129Contract {
  issue: {
    id: 'MCP-129';
    title: 'Integration & Regression Testing Suite';
    priority: 'High';
    parentIssue: 'MCP-2'; // rename_note epic
  };

  structure: TestSuiteStructure;
  workflows: {
    archiveProject: ArchiveProjectWorkflow;
    organizeInbox: OrganizeInboxWorkflow;
    refactorStructure: RefactorStructureWorkflow;
  };
  regression: TransactionRegressionTests;
  edgeCases: EdgeCaseTests;
  vaultConfigurations: VaultConfigurationTests;
  execution: TestExecutionRequirements;
  helpers: TestHelpers;
  documentation: TestingGuideContract;
  ci: CIIntegrationContract;
  acceptance: AcceptanceCriteriaContract;
  validation: ImplementationValidationContract;

  success: {
    testCoverageExpanded: boolean; // >= 23 new tests
    phase4Protected: boolean; // Regression tests cover all Phase 4 features
    edgeCasesHandled: boolean; // >= 10 edge cases tested
    vaultVariationsTested: boolean; // >= 5 vault configurations tested
    allTestsPassing: boolean; // 100% pass rate
    coverageTarget: boolean; // >= 95% coverage
    documentationComplete: boolean; // Testing guide created
    ciIntegrated: boolean; // CI working or documented
    noFlakyTests: boolean; // Zero flaky tests
  };
}
