/**
 * Implementation contracts for Linear Issue: MCP-148
 * Issue: Unit test creates artifact files in production Obsidian vault
 *
 * This contract defines the behavioral and structural requirements for fixing
 * test isolation violations in the legacy alias handlers test suite.
 */

// ============================================================================
// TEST ISOLATION CONTRACTS
// ============================================================================

/**
 * Test Vault Setup Contract
 *
 * MUST: Use createTestVault() helper from tests/helpers/vault-setup.ts
 * MUST: Call in beforeEach() hook for per-test isolation
 * MUST: Store returned TestVaultSetup instance for cleanup
 * MUST NOT: Share test vault instances across tests
 */
export interface TestVaultIsolationContract {
  /** Path to temporary test vault (must be in tmpdir()) */
  vaultPath: string;

  /** Cleanup function that restores original config */
  cleanup: () => Promise<void>;

  /** Validates vault is NOT production vault */
  isProductionVault(): boolean;
}

/**
 * Test Lifecycle Hooks Contract
 *
 * MUST: Implement both beforeEach and afterEach hooks
 * MUST: Create fresh vault before each test
 * MUST: Clean up after each test (not afterAll)
 * MUST: Handle async operations with await
 */
export interface TestLifecycleContract {
  /** Create isolated vault before each test */
  beforeEach(): Promise<void>;

  /** Clean up and restore config after each test */
  afterEach(): Promise<void>;

  /** Verify vault isolation */
  assertTestVaultUsed(): void;
}

// ============================================================================
// GLOBAL TEST PROTECTION CONTRACTS
// ============================================================================

/**
 * Production Vault Detection Contract
 *
 * MUST: Run in beforeAll() hook in tests/setup.ts
 * MUST: Throw error if production vault path detected
 * MUST: Check for 'iCloud' in LIFEOS_CONFIG.vaultPath
 * MUST NOT: Allow tests to run with production config
 */
export interface ProductionVaultGuardContract {
  /** Validates that vault path is not production */
  validateNotProductionVault(vaultPath: string): void;

  /** Keywords that indicate production vault */
  PRODUCTION_VAULT_INDICATORS: readonly string[];
}

// ============================================================================
// FILE CREATION VERIFICATION CONTRACTS
// ============================================================================

/**
 * Test Artifact Verification Contract
 *
 * MUST: Verify files created in test vault, not production
 * MUST: Use path.join(testVault.vaultPath, ...) for assertions
 * MUST NOT: Check production vault paths
 */
export interface ArtifactVerificationContract {
  /** Verify note was created in test vault */
  verifyNoteInTestVault(
    testVaultPath: string,
    noteTitle: string,
    expectedFolder: string
  ): Promise<boolean>;

  /** Verify note NOT in production vault */
  verifyNoteNotInProductionVault(noteTitle: string): Promise<boolean>;
}

// ============================================================================
// INTEGRATION TEST CONTRACTS
// ============================================================================

/**
 * Mock Replacement Contract
 *
 * SHOULD: Remove incomplete VaultUtils mock
 * SHOULD: Use createTestVault() with real file operations
 * MAY: Keep mock if testing pure parameter mapping
 * MUST: Mock all VaultUtils methods if using mock approach
 */
export interface IntegrationTestMockContract {
  /** Decision: Use real vault or complete mock */
  usesRealVault: boolean;

  /** If mocking, must be complete */
  isCompleteMock: boolean;

  /** Methods that must be mocked if using mock approach */
  requiredMockMethods: readonly string[];
}

// ============================================================================
// ERROR HANDLING CONTRACTS
// ============================================================================

/**
 * Error Scenarios
 *
 * MUST throw: ProductionVaultDetectedError if production vault in tests
 * MUST handle: Cleanup failures gracefully
 * MUST log: Cleanup failures for debugging
 */
export type ProductionVaultDetectedError = Error & {
  code: 'PRODUCTION_VAULT_DETECTED';
  vaultPath: string;
};

export type CleanupFailureError = Error & {
  code: 'CLEANUP_FAILURE';
  vaultPath: string;
  originalError: Error;
};

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Required Behaviors
 *
 * 1. Test Isolation:
 *    - Each test MUST run in fresh temporary vault
 *    - Tests MUST be order-independent
 *    - Cleanup MUST happen even if test fails
 *
 * 2. Singleton Management:
 *    - createTestVault() already calls VaultUtils.resetSingletons()
 *    - No additional singleton management needed
 *    - Config override is atomic per test
 *
 * 3. Production Protection:
 *    - Global check in tests/setup.ts MUST run before any test
 *    - MUST throw if production vault detected
 *    - MUST prevent test execution on failure
 *
 * 4. File Operations:
 *    - All file operations MUST target test vault
 *    - Paths MUST be constructed with path.join(testVault.vaultPath, ...)
 *    - MUST NOT hard-code production paths in tests
 */

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Dependencies:
 * - tests/helpers/vault-setup.ts (createTestVault, TestVaultSetup)
 * - src/config.ts (LIFEOS_CONFIG)
 * - src/vault-utils.ts (VaultUtils.resetSingletons)
 *
 * Extends: None (this is a test-only fix)
 * Integrates: Jest test framework, Node.js fs/promises, Node.js path
 *
 * MUST NOT: Modify production code (src/**) - this is test-only fix
 * MAY: Add helper functions to tests/helpers/ if needed
 */

// ============================================================================
// ACCEPTANCE CRITERIA CONTRACTS
// ============================================================================

/**
 * Success Criteria (from Linear issue):
 *
 * 1. All tests run in isolated temporary vaults
 *    - Verified by: Check testVault.vaultPath contains 'test-vault'
 *    - Verified by: Check testVault.vaultPath does NOT contain 'iCloud'
 *
 * 2. No artifacts created in production vault after `npm test`
 *    - Verified by: Run `npm test` and check production vault for Test-MCP99-* files
 *    - Verified by: No files matching pattern Test-MCP99-{timestamp}.md
 *
 * 3. Production vault path check in `tests/setup.ts`
 *    - Verified by: Global beforeAll hook exists
 *    - Verified by: Throws error if production vault detected
 *
 * 4. All existing tests still pass
 *    - Verified by: `npm test` shows 724+ tests passing
 *    - Verified by: No test regressions introduced
 */

// ============================================================================
// IMPLEMENTATION NOTES
// ============================================================================

/**
 * Files to Modify:
 *
 * 1. tests/unit/server/legacy-alias-handlers.test.ts (PRIORITY 1)
 *    - Add import: createTestVault, TestVaultSetup
 *    - Add variable: let testVault: TestVaultSetup;
 *    - Add beforeEach: testVault = await createTestVault();
 *    - Add afterEach: await testVault.cleanup();
 *    - Add assertion: verify test vault usage in failing test
 *
 * 2. tests/setup.ts (PRIORITY 2)
 *    - Add import: LIFEOS_CONFIG
 *    - Add beforeAll hook
 *    - Check vault path for 'iCloud'
 *    - Throw error if detected
 *
 * 3. tests/integration/legacy-alias-handlers.test.ts (PRIORITY 3)
 *    - Remove jest.mock for VaultUtils
 *    - Add createTestVault() pattern
 *    - Update test context to use test vault
 *
 * Pattern Reference: tests/integration/handler-initialization.test.ts
 */

// ============================================================================
// TYPE SAFETY CONTRACTS
// ============================================================================

/**
 * TypeScript Requirements:
 *
 * MUST: No type errors after implementation
 * MUST: Pass `npm run typecheck`
 * MUST: Use proper async/await typing
 * MUST: Type testVault variable as TestVaultSetup
 */
