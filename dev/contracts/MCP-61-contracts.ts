/**
 * Implementation contracts for Linear Issue: MCP-61
 * Issue: Integration test leaves "Integration Test Note" artifacts in production vault
 *
 * These contracts define the expected behavior and data structures
 * for the implementation. All implementation code MUST conform to
 * these interface definitions.
 *
 * Branch: feature/mcp-61-integration-test-leaves-integration-test-note-artifacts-in
 * Priority: Urgent (P1)
 * Labels: Backend, Bug
 */

import { LifeOSConfig } from '../../src/types.js';

// ============================================================================
// CONFIG CONTRACTS
// ============================================================================

/**
 * Environment variable contract for test vault isolation
 *
 * These env vars override production paths when set, enabling test isolation.
 * All must use absolute paths.
 */
export interface TestVaultEnvironment {
  /** Override for LIFEOS_CONFIG.vaultPath */
  LIFEOS_VAULT_PATH?: string;

  /** Override for LIFEOS_CONFIG.attachmentsPath */
  LIFEOS_ATTACHMENTS_PATH?: string;

  /** Override for LIFEOS_CONFIG.templatesPath */
  LIFEOS_TEMPLATES_PATH?: string;

  /** Override for LIFEOS_CONFIG.dailyNotesPath */
  LIFEOS_DAILY_NOTES_PATH?: string;

  /** Override for LIFEOS_CONFIG.yamlRulesPath */
  LIFEOS_YAML_RULES_PATH?: string;
}

/**
 * Modified LifeOSConfig contract with environment variable support
 *
 * MUST be implemented in src/config.ts with this exact structure:
 * - Each field checks process.env first
 * - Falls back to hardcoded production path if env var not set
 * - No other changes to config structure
 */
export interface EnvironmentAwareConfig extends LifeOSConfig {
  /**
   * Example implementation pattern (MUST be followed):
   *
   * vaultPath: process.env.LIFEOS_VAULT_PATH || '<production-path>',
   * attachmentsPath: process.env.LIFEOS_ATTACHMENTS_PATH || '<production-path>',
   * // ... etc for all paths
   */
}

// ============================================================================
// TEST FIXTURE CONTRACTS (DEFERRED TO MCP-62)
// ============================================================================

/**
 * NOTE: Shared test fixture extraction is OUT OF SCOPE for MCP-61
 *
 * For MCP-61, vault setup will be INLINE in claude-desktop-integration.test.ts
 * following the pattern from daily-note-simple.test.ts:24-106.
 *
 * Future MCP-62 will extract this to tests/fixtures/test-vault-setup.ts
 * with the interfaces documented below.
 */

/**
 * Test vault configuration options (for future MCP-62 extraction)
 */
export interface TestVaultConfig {
  /** Base path for vault (defaults to tmpdir()/test-vault-{randomId}) */
  basePath?: string;

  /** Whether to create Obsidian config files (.obsidian/daily-notes.json, templates.json) */
  createObsidianConfig?: boolean;

  /** Required LifeOS folder structure to create */
  folders: ('Daily' | 'Templates' | '05 - Fleeting Notes')[];

  /** Templates to seed (at least one .md template required for DynamicTemplateEngine) */
  templates?: Array<{
    name: string;
    content: string;
  }>;
}

/**
 * Test vault setup result (for future MCP-62 extraction)
 */
export interface TestVaultSetup {
  /** Absolute path to created vault */
  vaultPath: string;

  /** Absolute path to templates directory */
  templatesPath: string;

  /** Absolute path to daily notes directory (if created) */
  dailyNotesPath?: string;

  /** Original config backup for restoration */
  originalConfig: LifeOSConfig;
}

// ============================================================================
// TEST LIFECYCLE CONTRACTS
// ============================================================================

/**
 * Suite-level vault lifecycle contract
 *
 * MUST be implemented in claude-desktop-integration.test.ts as:
 * - beforeAll(): Create temp vault, spawn server with env vars
 * - afterAll(): Cleanup vault with fs.rm({recursive: true, force: true})
 *
 * NOT per-test (beforeEach/afterEach) because ClaudeDesktopTestClient
 * is long-lived across entire suite.
 */
export interface TestVaultLifecycle {
  /**
   * Create temporary vault and spawn MCP server
   *
   * MUST execute in this order:
   * 1. Generate unique vault path: tmpdir()/test-vault-{randomId}
   * 2. Create vault directory structure
   * 3. Create required folders: '05 - Fleeting Notes', 'Templates', 'Daily'
   * 4. Seed at least one .md template (for DynamicTemplateEngine.scanTemplates)
   * 5. Spawn MCP server with environment variables injected
   * 6. Connect test client
   * 7. Execute runtime assertion to verify temp vault usage
   */
  setupVault(): Promise<void>;

  /**
   * Cleanup temporary vault
   *
   * MUST execute in this order:
   * 1. Disconnect client (if connected)
   * 2. Delete vault with fs.rm(vaultPath, {recursive: true, force: true})
   *
   * MUST NOT fail if vault already deleted (force: true handles this)
   * MUST run even if test suite crashes (afterAll() guarantees this)
   */
  cleanupVault(): Promise<void>;
}

/**
 * Runtime assertion contract for vault verification
 *
 * MUST be executed immediately after client.connect() in beforeAll()
 * to catch environment variable propagation failures.
 *
 * @throws Error if production vault detected
 */
export interface VaultVerification {
  /**
   * Verify test client is using temporary vault, not production
   *
   * Implementation MUST:
   * 1. Call list tool to get vault folders
   * 2. Check if returned paths contain testVaultPath
   * 3. Throw descriptive error if production vault detected
   *
   * Example:
   * ```typescript
   * const listResult = await client.callTool('list', { type: 'folders' });
   * if (!listResult.result.includes(testVaultPath)) {
   *   throw new Error(
   *     `CRITICAL: Test using production vault instead of ${testVaultPath}! ` +
   *     `Env var propagation failed.`
   *   );
   * }
   * ```
   */
  assertUsingTempVault(testVaultPath: string): Promise<void>;
}

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Components this implementation integrates with
 */
export interface IntegrationPoints {
  /** src/config.ts - Modified to read environment variables */
  config: {
    file: 'src/config.ts';
    modifications: [
      'Add process.env.LIFEOS_VAULT_PATH || fallback pattern',
      'Add process.env overrides for all 5 config paths'
    ];
    rebuild_required: true; // npm run build after changes
  };

  /** tests/integration/claude-desktop-integration.test.ts - Test refactoring */
  integrationTest: {
    file: 'tests/integration/claude-desktop-integration.test.ts';
    modifications: [
      'Add suite-level variables: testVaultPath, testTemplatePath',
      'Add beforeAll(): create temp vault, spawn with env vars, verify',
      'Modify ClaudeDesktopTestClient.connect() spawn to inject env vars',
      'Add afterAll(): cleanup vault with fs.rm()'
    ];
  };

  /** Existing patterns to follow */
  patterns: {
    vaultSetup: 'tests/integration/daily-note-simple.test.ts:24-106';
    iCloudRetry: 'src/vault-utils.ts:28-34 (ICLOUD_RETRY_CONFIG)';
    folderValidation: 'src/vault-utils.ts:291-305 (VaultUtils.createNote)';
    templateScanning: 'src/template-engine-dynamic.ts:27-78 (DynamicTemplateEngine.scanTemplates)';
  };
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors and side effects
 *
 * MUST:
 * - Modify src/config.ts to read environment variables with production fallbacks
 * - Run npm run build after config.ts changes to update dist/index.js
 * - Create suite-level temp vault in beforeAll() with required folder structure
 * - Inject environment variables in ClaudeDesktopTestClient.spawn() (lines 85-90)
 * - Execute runtime assertion after client.connect() to verify temp vault usage
 * - Cleanup vault in afterAll() with fs.rm({recursive: true, force: true})
 * - Seed at least one .md template for DynamicTemplateEngine.scanTemplates
 * - Create required folders: '05 - Fleeting Notes', 'Templates', 'Daily'
 *
 * MUST NOT:
 * - Modify LIFEOS_CONFIG structure (only add env var reads)
 * - Extract shared fixtures (deferred to MCP-62)
 * - Use per-test vault lifecycle (beforeEach/afterEach) - client is long-lived
 * - Skip runtime assertion (critical for catching env var failures)
 * - Rely on VaultUtils.resetSingletons() - not needed for stdio server spawn
 *
 * VALIDATION:
 * - npm run typecheck: Verifies TypeScript conformance
 * - npm run build: Required after config.ts changes
 * - npm test -- claude-desktop-integration.test.ts: Integration test passes
 * - Manual check: No artifacts in production vault after test run
 * - Failure test: Crash test suite mid-run, verify cleanup still executed
 */

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error types that may be thrown during implementation
 *
 * @throws Error - "CRITICAL: Test using production vault!" if runtime assertion fails
 * @throws Error - Build failure if npm run build not executed after config.ts changes
 * @throws ENOENT - If required folders not created before server spawn
 * @throws Error - If template seeding skipped (DynamicTemplateEngine.scanTemplates fails)
 */

// ============================================================================
// SCOPE BOUNDARY
// ============================================================================

/**
 * Out of scope for MCP-61 (deferred to MCP-62)
 *
 * - Extracting shared test fixtures to tests/fixtures/test-vault-setup.ts
 * - Refactoring daily-note-simple.test.ts to use shared fixtures
 * - Refactoring daily-note-task-workflow.test.ts to use shared fixtures
 * - Creating reusable createTestVault() / cleanupTestVault() helpers
 * - Implementing VaultUtils.resetSingletons() for shared fixtures
 *
 * Rationale: Minimal scope approach prioritizes urgent P1 bug fix over refactoring
 */

// ============================================================================
// SUCCESS METRICS
// ============================================================================

/**
 * Implementation success criteria
 *
 * - Zero test artifacts in production vault after test runs
 * - All integration tests pass with temp vault isolation
 * - Cleanup executes reliably even if test suite crashes
 * - Runtime assertion catches production vault usage immediately
 * - npm run build succeeds after config.ts modifications
 * - No TypeScript errors (npm run typecheck passes)
 * - Test execution time remains under 30 seconds
 */
