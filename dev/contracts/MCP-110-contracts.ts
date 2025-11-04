/**
 * Implementation contracts for Linear Issue: MCP-110
 * Issue: LinkScanner skips frontmatter - prevents frontmatter-only link discovery
 *
 * These contracts define expected behavior for optional frontmatter link scanning.
 * All implementation MUST conform to these interfaces and behavioral contracts.
 */

// ============================================================================
// EXISTING INTERFACES (NO CHANGES REQUIRED)
// ============================================================================

/**
 * LinkScanOptions interface already exists in src/modules/links/link-scanner.ts
 *
 * The skipFrontmatter parameter is already defined:
 * ```typescript
 * skipFrontmatter?: boolean; // @default true (frontmatter links not rendered)
 * ```
 *
 * NO interface changes required - only behavior modification.
 */

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected implementation behavior for MCP-110
 */
export interface FrontmatterScanningContract {
  /**
   * MUST: Preserve default behavior
   * - skipFrontmatter defaults to true (backward compatible)
   * - Existing callers see no behavior change
   * - Only affects callers explicitly passing skipFrontmatter: false
   */
  defaultBehavior: {
    skipFrontmatter: true;
    preservesExistingBehavior: true;
    backwardCompatible: true;
  };

  /**
   * MUST: Conditional frontmatter skip region logic
   * - identifySkipRegions() checks options.skipFrontmatter value
   * - When true: add frontmatter to skip regions (current behavior)
   * - When false: do not add frontmatter to skip regions (new behavior)
   */
  skipRegionBehavior: {
    whenTrue: 'add frontmatter to skip regions';
    whenFalse: 'do not add frontmatter to skip regions';
    implementationLocation: 'LinkScanner.identifySkipRegions()';
  };

  /**
   * MUST: Support real-world YAML wikilink formats
   * - Block scalar format: `- "[[Note]]"` or `- "[[Note|Alias]]"`
   * - Inline array format: `["[[Note]]", "[[Other]]"]`
   * - WIKILINK_PATTERN regex handles both formats
   */
  yamlFormatSupport: {
    blockScalar: true;
    inlineArray: true;
    regexPattern: 'WIKILINK_PATTERN from regex-utils.ts';
  };

  /**
   * MUST NOT: Modify other LinkScanner behavior
   * - No changes to code block skipping logic
   * - No changes to link extraction logic
   * - No changes to LinkScanResult structure
   * - No changes to rename_note tool interface
   */
  unchangedBehavior: {
    codeBlockSkipping: 'unchanged';
    linkExtraction: 'unchanged';
    resultStructure: 'unchanged';
    mcpToolInterface: 'unchanged';
  };
}

// ============================================================================
// VALIDATION CONTRACTS
// ============================================================================

/**
 * Test validation requirements for MCP-110
 */
export interface TestValidationContract {
  /**
   * Unit tests MUST verify:
   */
  unitTests: {
    // Default behavior unchanged
    defaultSkipsFrontmatter: boolean;

    // Conditional behavior works
    explicitTrueSkipsFrontmatter: boolean;
    explicitFalseIncludesFrontmatter: boolean;

    // YAML format support
    blockScalarFormatExtracted: boolean;
    inlineArrayFormatExtracted: boolean;
    aliasFormatsPreserved: boolean;
  };

  /**
   * Integration tests MUST verify:
   */
  integrationTests: {
    // Enable skipped test (link-updater.integration.test.ts:412)
    skippedTestEnabled: boolean;

    // Frontmatter-only link updates
    frontmatterOnlyLinksUpdated: boolean;

    // YAML people property updates
    yamlPeoplePropertyUpdated: boolean;

    // Rename workflow compatibility
    renameWorkflowWorks: boolean;
  };

  /**
   * Manual validation MUST include:
   */
  manualValidation: {
    claudeDesktopTesting: boolean;
    realVaultTesting: boolean;
    frontmatterLinkScenarios: boolean;
  };
}

// ============================================================================
// IMPLEMENTATION SCOPE
// ============================================================================

/**
 * Files to be modified for MCP-110
 */
export const ImplementationScope = {
  /**
   * Primary implementation file
   */
  linkScanner: {
    file: 'src/modules/links/link-scanner.ts',
    method: 'identifySkipRegions',
    lineRange: '382-436',
    change: 'Conditional frontmatter skip region logic',
  },

  /**
   * Test files to update
   */
  tests: {
    unit: {
      file: 'tests/unit/link-scanner.test.ts',
      changes: [
        'Add tests for skipFrontmatter: false behavior',
        'Verify YAML block scalar format extraction',
        'Verify YAML inline array format extraction',
      ],
    },
    integration: {
      file: 'tests/integration/link-updater.integration.test.ts',
      changes: [
        'Enable skipped test at line 412',
        'Update test to use skipFrontmatter: false',
        'Verify frontmatter-only link updates',
      ],
    },
  },

  /**
   * Documentation to update
   */
  documentation: {
    linkScanner: {
      file: 'src/modules/links/link-scanner.ts',
      update: 'Update LinkScanOptions.skipFrontmatter JSDoc',
    },
    renameTool: {
      file: 'docs/tools/rename_note.md',
      update: 'Add example for frontmatter link handling',
    },
  },
} as const;

// ============================================================================
// ERROR HANDLING CONTRACTS
// ============================================================================

/**
 * No new error types required for MCP-110
 *
 * This is a behavior enhancement that uses existing error handling:
 * - YAML parsing errors already handled by gray-matter
 * - Link extraction errors already handled by WIKILINK_PATTERN
 * - File reading errors already handled by LinkScanner
 */
export interface ErrorHandlingContract {
  newErrorTypes: never; // No new error types
  existingErrorHandling: 'sufficient';
  errorSources: {
    yamlParsing: 'gray-matter handles malformed YAML';
    linkExtraction: 'WIKILINK_PATTERN handles invalid formats';
    fileReading: 'LinkScanner handles file access errors';
  };
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Integration points that MUST remain compatible
 */
export interface IntegrationContract {
  /**
   * rename_note tool integration
   * - No changes to rename_note handler required
   * - LinkScanner already called with options parameter
   * - Behavior change is transparent to rename_note
   */
  renameTool: {
    requiresChanges: false;
    integrationPoint: 'LinkScanner.scanVaultForLinks()';
    compatibility: 'fully backward compatible';
  };

  /**
   * Link updater integration
   * - No changes to link-updater.ts required
   * - Uses LinkScanner results regardless of source
   * - Frontmatter links updated by existing regex replacement
   */
  linkUpdater: {
    requiresChanges: false;
    integrationPoint: 'uses LinkScanResult.references';
    compatibility: 'fully backward compatible';
  };

  /**
   * Dry-run preview integration
   * - No changes to dry-run preview required
   * - Displays links discovered by LinkScanner
   * - Works automatically with frontmatter links
   */
  dryRunPreview: {
    requiresChanges: false;
    integrationPoint: 'displays LinkScanResult';
    compatibility: 'fully backward compatible';
  };
}

// ============================================================================
// PERFORMANCE CONTRACTS
// ============================================================================

/**
 * Performance expectations for frontmatter scanning
 */
export interface PerformanceContract {
  /**
   * Frontmatter scan performance
   * - Typical frontmatter: 5-15 lines
   * - Typical content: 100+ lines
   * - Impact: <2% increase in scan time
   */
  scanTimeImpact: {
    maxIncrease: '2%';
    typicalFrontmatterLines: '5-15';
    typicalContentLines: '100+';
  };

  /**
   * Skip region detection performance
   * - Single pass through lines array
   * - O(n) complexity unchanged
   * - Conditional check adds negligible overhead
   */
  skipRegionDetection: {
    complexity: 'O(n)';
    overhead: 'negligible (<1ms per scan)';
  };

  /**
   * Default behavior optimization preserved
   * - skipFrontmatter: true keeps frontmatter skip optimization
   * - No performance regression for default usage
   */
  defaultOptimization: {
    preserved: true;
    regressionRisk: 'none';
  };
}

// ============================================================================
// CONTRACT VALIDATION
// ============================================================================

/**
 * How to validate implementation conforms to contracts
 */
export const ContractValidation = {
  /**
   * TypeScript compilation
   * - Run: npm run typecheck
   * - Verifies: Type safety, interface conformance
   */
  typecheck: 'npm run typecheck',

  /**
   * Unit test validation
   * - Run: npm run test:unit
   * - Verifies: Behavioral contracts, edge cases
   */
  unitTests: 'npm run test:unit',

  /**
   * Integration test validation
   * - Run: npm run test:integration
   * - Verifies: End-to-end workflows, real scenarios
   */
  integrationTests: 'npm run test:integration',

  /**
   * Full test suite
   * - Run: npm test
   * - Verifies: Complete functionality, no regressions
   */
  fullSuite: 'npm test',
} as const;
