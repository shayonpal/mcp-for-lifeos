/**
 * Shared test utility for creating temporary vaults in integration tests
 *
 * Reduces code duplication across integration tests by providing a standard
 * temporary vault setup pattern with automatic cleanup.
 *
 * Pattern extracted from:
 * - tests/integration/claude-desktop-integration.test.ts
 * - tests/integration/rename-note.integration.test.ts
 * - tests/integration/boot-recovery.test.ts
 */

import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { LIFEOS_CONFIG } from '../../src/shared/index.js';
import { VaultUtils } from '../../src/modules/files/index.js';

/**
 * Test vault setup result with cleanup function
 */
export interface TestVaultSetup {
  /** Path to temporary vault directory */
  vaultPath: string;
  /** Cleanup function to restore original config and remove vault */
  cleanup: () => Promise<void>;
  /** Original LIFEOS_CONFIG for manual restoration if needed */
  originalConfig: typeof LIFEOS_CONFIG;
}

/**
 * Create a temporary vault with required LifeOS folder structure
 *
 * Sets up a temporary vault in the system temp directory with:
 * - Random 8-byte hex ID for isolation
 * - Required LifeOS folders: 05 - Fleeting Notes, Templates, Daily
 * - Mocked LIFEOS_CONFIG pointing to temp vault
 * - VaultUtils singleton reset for test isolation
 *
 * Usage:
 * ```typescript
 * let testVault: TestVaultSetup;
 *
 * beforeEach(async () => {
 *   testVault = await createTestVault();
 * });
 *
 * afterEach(async () => {
 *   await testVault.cleanup();
 * });
 *
 * it('should work with vault', async () => {
 *   // Use testVault.vaultPath in tests
 * });
 * ```
 *
 * @returns TestVaultSetup with vaultPath, cleanup function, and original config
 */
export async function createTestVault(): Promise<TestVaultSetup> {
  // Generate unique vault ID to prevent test collisions
  const randomId = randomBytes(8).toString('hex');
  const vaultPath = join(tmpdir(), `test-vault-${randomId}`);

  // Create required LifeOS folder structure
  // These folders are required for vault validation in VaultUtils
  await fs.mkdir(join(vaultPath, '05 - Fleeting Notes'), { recursive: true });
  await fs.mkdir(join(vaultPath, 'Templates'), { recursive: true });
  await fs.mkdir(join(vaultPath, 'Daily'), { recursive: true });

  // Backup original config for restoration
  const originalConfig = { ...LIFEOS_CONFIG };

  // Mock config to point to test vault
  LIFEOS_CONFIG.vaultPath = vaultPath;

  // Reset VaultUtils singleton to pick up new config
  // Critical for test isolation - prevents cache pollution
  VaultUtils.resetSingletons();

  return {
    vaultPath,
    originalConfig,
    cleanup: async () => {
      // Restore original config
      Object.assign(LIFEOS_CONFIG, originalConfig);

      // Reset singleton again to pick up restored config
      VaultUtils.resetSingletons();

      // Remove temporary vault directory
      // force: true prevents errors if already deleted
      // recursive: true removes all contents
      await fs.rm(vaultPath, { recursive: true, force: true });
    }
  };
}

/**
 * Create multiple test vaults for tests requiring vault isolation
 *
 * Useful for tests that need to verify cross-vault operations or
 * run multiple vault scenarios in parallel.
 *
 * @param count Number of vaults to create
 * @returns Array of TestVaultSetup instances
 */
export async function createMultipleTestVaults(count: number): Promise<TestVaultSetup[]> {
  const vaults: TestVaultSetup[] = [];

  for (let i = 0; i < count; i++) {
    vaults.push(await createTestVault());
  }

  return vaults;
}

/**
 * Cleanup all test vaults created by createMultipleTestVaults
 *
 * @param vaults Array of TestVaultSetup instances to cleanup
 */
export async function cleanupAllTestVaults(vaults: TestVaultSetup[]): Promise<void> {
  for (const vault of vaults) {
    await vault.cleanup();
  }
}
