/**
 * Implementation contracts for Linear Issue: MCP-82
 * Issue: Centralize SERVER_VERSION to package.json as single source of truth
 *
 * These contracts define expected behavior and data structures.
 * All implementation MUST conform to these interfaces.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Package.json structure (subset relevant to version reading)
 */
export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Version reading result with metadata
 */
export interface VersionInfo {
  /** Semantic version string (e.g., '2.0.0') */
  version: string;

  /** Source of version information */
  source: 'package.json';

  /** Whether fallback version was used */
  isFallback: boolean;
}

// ============================================================================
// VERSION READING CONTRACTS
// ============================================================================

/**
 * Read version from package.json using JSON import
 *
 * Implementation Approach:
 * ```typescript
 * import packageJson from '../package.json' with { type: 'json' };
 * export const SERVER_VERSION = packageJson.version;
 * ```
 *
 * Rationale for JSON Import over fs.readFileSync:
 * - Type-safe: TypeScript validates package.json structure at compile time
 * - Performance: No runtime file I/O (module cached by Node.js)
 * - Simplicity: 2 lines vs 8+ lines with path resolution
 * - Standard: ES Module JSON import is standard practice
 * - Build-time verification: Errors caught during compilation, not runtime
 *
 * Error Handling:
 * - Import failure: TypeScript compilation error (fail-fast at build time)
 * - Missing version field: TypeScript type error (compile-time safety)
 * - Invalid version format: Runtime validation optional (semantic versioning assumed)
 *
 * @example
 * import packageJson from '../package.json' with { type: 'json' };
 * export const SERVER_VERSION = packageJson.version;
 */
export interface VersionReadingContract {
  /** Read version from package.json */
  readVersion(): string;

  /** Get version with metadata (optional enhancement) */
  getVersionInfo?(): VersionInfo;
}

// ============================================================================
// USAGE LOCATION CONTRACTS
// ============================================================================

/**
 * Existing SERVER_VERSION usage locations in src/index.ts
 *
 * All 4 locations must continue to work after refactor:
 *
 * Location 1 (Line 43): Server Info Initialization
 * - Context: MCP server capabilities response
 * - Usage: version: SERVER_VERSION
 * - Requirement: String value for protocol response
 *
 * Location 2 (Line 979): Response Metadata
 * - Context: Tool response metadata
 * - Usage: response.metadata.version = SERVER_VERSION
 * - Requirement: String value for response metadata
 *
 * Location 3 & 4 (Line 1588): Help Text
 * - Context: get_server_version tool help output
 * - Usage: `# LifeOS MCP Server v${SERVER_VERSION}`
 * - Usage: `- **Version:** ${SERVER_VERSION}`
 * - Requirement: String value for template interpolation
 */
export interface UsageLocationContract {
  /** All usage locations maintain same signature */
  version: string;
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Integration points with existing code
 *
 * Modified Components:
 * - src/index.ts:28 - Replace hardcoded constant with JSON import
 * - src/index.ts:1-26 - Add import statement for package.json
 *
 * Existing Imports (Lines 1-25):
 * - ES Module imports with .js extensions
 * - Pattern: import { X } from './module.js'
 * - Follows tsconfig.json module resolution: "ESNext" with "node"
 *
 * New Import Pattern:
 * - import packageJson from '../package.json' with { type: 'json' };
 * - Location: After other imports, before first constant declaration
 * - Type safety: Enabled by tsconfig.json "resolveJsonModule": true
 *
 * No Changes Required:
 * - package.json (already has version field: "2.0.0")
 * - tsconfig.json (already has "resolveJsonModule": true)
 * - Tool handler logic (uses SERVER_VERSION constant unchanged)
 * - MCP protocol responses (version field signature unchanged)
 * - Analytics tracking (version logging unchanged)
 */
export interface IntegrationContract {
  /** Modified file */
  modifiedFile: 'src/index.ts';

  /** Lines modified */
  modifiedLines: {
    /** Add import statement */
    imports: 'Add: import packageJson from ../package.json with { type: json }';

    /** Replace constant declaration */
    constant: 'Line 28: export const SERVER_VERSION = packageJson.version';
  };

  /** Unchanged files */
  unchangedFiles: [
    'package.json',
    'tsconfig.json',
    'src/vault-utils.ts',
    'src/search-engine.ts',
    'src/tool-router.ts',
    'src/template-engine*.ts',
    'src/analytics/*'
  ];
}

// ============================================================================
// VALIDATION CONTRACTS
// ============================================================================

/**
 * Compile-time validation via TypeScript
 *
 * Validation Steps:
 * 1. npm run typecheck - Verify TypeScript compilation
 * 2. npm run build - Ensure production build succeeds
 * 3. Verify package.json import resolves correctly
 *
 * Expected Results:
 * - No TypeScript errors
 * - No module resolution errors
 * - SERVER_VERSION type inferred as string
 * - All usage locations type-check correctly
 */
export interface CompileTimeValidationContract {
  /** TypeScript compilation must succeed */
  typecheckPasses: boolean;

  /** Production build must succeed */
  buildPasses: boolean;

  /** SERVER_VERSION type correctly inferred */
  versionType: 'string';
}

/**
 * Runtime validation via manual testing
 *
 * Test Scenarios:
 * 1. Server startup - Verify version appears in initialization log
 * 2. get_server_version tool - Verify help text shows correct version
 * 3. Tool responses - Verify metadata.version field correct
 * 4. Version modification test - Change package.json version, rebuild, verify pickup
 *
 * Validation Method:
 * - Start MCP server in Claude Desktop
 * - Execute get_server_version tool
 * - Check MCP protocol response metadata
 * - Modify package.json version to test value (e.g., '2.0.1-test')
 * - Rebuild and verify new version appears everywhere
 */
export interface RuntimeValidationContract {
  /** Server initialization shows version */
  serverStartupLogsVersion: boolean;

  /** Help text displays version */
  helpTextShowsVersion: boolean;

  /** Response metadata includes version */
  responseMetadataHasVersion: boolean;

  /** Version changes when package.json updated */
  versionUpdatesOnPackageChange: boolean;
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error handling for version reading
 *
 * Compile-Time Errors (fail-fast, desired behavior):
 * - ImportError: package.json not found → TypeScript compilation error
 * - TypeError: version field missing → TypeScript type error
 * - SyntaxError: Invalid JSON in package.json → Build-time parse error
 *
 * Error Handling Strategy:
 * - All errors are compile-time (no runtime error handling needed)
 * - Fail-fast during build prevents deployment of broken configuration
 * - No fallback version needed (would hide configuration issues)
 *
 * Advantage over fs.readFileSync:
 * - Runtime errors (file not found, parse errors) become compile-time errors
 * - Guarantees version is always available at runtime
 * - No try-catch blocks needed
 */
export interface ErrorHandlingContract {
  /** Error detection timing */
  errorDetection: 'compile-time';

  /** No runtime error handling required */
  runtimeErrorHandling: false;

  /** No fallback version needed */
  fallbackVersion: undefined;
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors:
 *
 * MUST:
 * - Import package.json using JSON import with type assertion
 * - Export SERVER_VERSION as constant (maintain existing export signature)
 * - Preserve all 4 existing usage locations without modification
 * - Maintain type compatibility (string type for version)
 * - Pass TypeScript compilation (npm run typecheck)
 * - Pass production build (npm run build)
 *
 * MUST NOT:
 * - Use fs.readFileSync for version reading (suboptimal approach)
 * - Add runtime error handling (compile-time validation sufficient)
 * - Modify usage locations (constant signature unchanged)
 * - Change version format or structure
 * - Add fallback version logic (masks configuration errors)
 *
 * Performance:
 * - Version reading: 0ms (compile-time resolution, no I/O)
 * - Runtime overhead: None (static import cached by Node.js)
 * - Build time impact: Negligible (<1ms for JSON import resolution)
 */

// ============================================================================
// TESTING CONTRACTS
// ============================================================================

/**
 * Manual verification test scenarios
 *
 * Test 1: Normal Operation
 * - Setup: package.json has version: "2.0.0"
 * - Action: npm run build && start server
 * - Expected: Version "2.0.0" appears in all 4 locations
 * - Verification: Check server startup, help text, response metadata
 *
 * Test 2: Version Update via npm version
 * - Setup: Current version "2.0.0"
 * - Action: npm version patch (bumps to 2.0.1)
 * - Expected: Automatic version pickup after rebuild
 * - Verification: Rebuild, restart server, verify new version
 *
 * Test 3: TypeScript Type Safety
 * - Setup: Modify package.json to remove version field
 * - Action: npm run typecheck
 * - Expected: TypeScript compilation error
 * - Verification: Error message mentions missing version property
 *
 * Test 4: Integration with Claude Desktop
 * - Setup: Server running with new version import
 * - Action: Execute get_server_version tool in Claude Desktop
 * - Expected: Help text shows correct version
 * - Verification: Response includes version in metadata
 *
 * Acceptance Criteria Validation:
 * - ✓ Hardcoded SERVER_VERSION removed from src/index.ts:28
 * - ✓ Version reading from package.json implemented
 * - ✓ Version displays correctly in MCP server info
 * - ✓ No breaking changes to MCP protocol response
 * - ✓ Automatic version updates on npm version commands
 */

// ============================================================================
// IMPLEMENTATION NOTES
// ============================================================================

/**
 * Implementation checklist:
 *
 * Phase 1: Update imports (src/index.ts)
 * [ ] Add JSON import statement after existing imports
 * [ ] Import statement: import packageJson from '../package.json' with { type: 'json' };
 * [ ] Verify tsconfig.json has "resolveJsonModule": true (already present)
 *
 * Phase 2: Replace constant declaration (src/index.ts:28)
 * [ ] Remove: export const SERVER_VERSION = '2.0.0';
 * [ ] Add: export const SERVER_VERSION = packageJson.version;
 * [ ] Verify export signature unchanged (still exports string constant)
 *
 * Phase 3: Compile-time validation
 * [ ] Run npm run typecheck (verify TypeScript compilation)
 * [ ] Run npm run build (verify production build)
 * [ ] Check for any import or type errors
 *
 * Phase 4: Runtime validation
 * [ ] Start server in Claude Desktop
 * [ ] Verify server startup logs show version
 * [ ] Execute get_server_version tool
 * [ ] Check response metadata.version field
 *
 * Phase 5: Version update test
 * [ ] Modify package.json version to test value
 * [ ] Rebuild project (npm run build)
 * [ ] Restart server and verify new version appears
 * [ ] Restore original version
 *
 * Phase 6: Documentation (minimal)
 * [ ] Update CHANGELOG.md with version centralization note
 * [ ] No README changes needed (internal implementation detail)
 *
 * Total Estimated Time: 15-30 minutes
 */

// ============================================================================
// DEPENDENCIES
// ============================================================================

/**
 * No new dependencies required
 *
 * Existing Infrastructure:
 * - Node.js >=18.0.0 (already required, supports JSON import assertions)
 * - TypeScript >=5.0.0 (already present, supports JSON imports)
 * - tsconfig.json "resolveJsonModule": true (already configured)
 * - ES Module support (already configured with "module": "ESNext")
 *
 * No package.json changes needed:
 * - No new packages to install
 * - Version field already exists
 * - Build scripts unchanged
 */

// ============================================================================
// RISK ASSESSMENT
// ============================================================================

/**
 * Risk analysis and mitigation
 *
 * Risk 1: Build-time import failure
 * - Level: Low
 * - Scenario: package.json not found or malformed
 * - Impact: TypeScript compilation error (prevents deployment)
 * - Mitigation: Fail-fast at build time (desired behavior)
 *
 * Risk 2: Version field missing from package.json
 * - Level: Low
 * - Scenario: package.json lacks version field
 * - Impact: TypeScript type error during compilation
 * - Mitigation: Type safety ensures version always present
 *
 * Risk 3: Breaking changes to usage locations
 * - Level: Very Low
 * - Scenario: SERVER_VERSION constant signature changes
 * - Impact: Type errors at all 4 usage locations
 * - Mitigation: Constant remains string export (no signature change)
 *
 * Risk 4: npm version command compatibility
 * - Level: Very Low
 * - Scenario: npm version fails to update package.json
 * - Impact: Version drift (same as current state)
 * - Mitigation: Standard npm behavior, well-tested
 *
 * Overall Risk Level: LOW
 * - Simple refactor with compile-time safety
 * - Single file modification
 * - No runtime error handling needed
 * - Easy rollback (single commit revert)
 */
