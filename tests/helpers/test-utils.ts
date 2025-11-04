/**
 * Test Utilities
 *
 * Utilities for test isolation and setup.
 * Extracted from VaultUtils.resetSingletons() as part of MCP-91.
 */

/**
 * Reset singleton instances for test isolation
 *
 * Clears all singleton managers (TemplateManager, ObsidianSettings, DateResolver)
 * to force re-initialization with test configuration.
 *
 * @testonly - Only for use in test files
 *
 * IMPORTANT: Call this in beforeEach() after modifying LIFEOS_CONFIG.vaultPath
 * to ensure singletons use test vault, not production vault.
 *
 * TODO MCP-92: Implement proper singleton reset when managers expose reset methods
 * For now, this is a no-op placeholder. Tests should still work because singletons
 * lazy-initialize on first access with current LIFEOS_CONFIG.
 */
export function resetTestSingletons(): void {
  // No-op placeholder - singleton managers don't expose reset methods yet
  // Tests rely on lazy initialization with LIFEOS_CONFIG.vaultPath
  // Follow-up: MCP-92 will implement proper singleton management
}
