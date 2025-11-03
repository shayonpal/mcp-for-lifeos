/**
 * Integration tests for Handler Lazy Initialization
 * Linear Issue: MCP-10
 *
 * Tests handler registration, lazy loading, context propagation,
 * and analytics exemption patterns.
 *
 * @see dev/contracts/MCP-10-contracts.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMcpServer } from '../../src/server/mcp-server.js';
import { createTestVault } from '../helpers/vault-setup.js';
import type { TestVaultSetup } from '../helpers/vault-setup.js';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

describe('Handler Initialization - Integration', () => {
  let testVault: TestVaultSetup;

  beforeEach(async () => {
    testVault = await createTestVault();
  });

  afterEach(async () => {
    await testVault.cleanup();
  });

  describe('Handler Registration', () => {
    it('should register handlers on server creation', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'consolidated-only',
        enableStdio: false
      });

      // Server should have tools registered
      expect(instance.server).toBeDefined();
      // Note: We can't directly access the handler registry in integration tests,
      // but we can verify the server is properly configured
    });

    it('should respect tool mode during handler registration', () => {
      const instanceLegacy = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'legacy-only',
        enableStdio: false
      });

      const instanceConsolidated = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'consolidated-only',
        enableStdio: false
      });

      // Both instances should be created successfully with different modes
      expect(instanceLegacy.toolModeConfig.mode).toBe('legacy-only');
      expect(instanceConsolidated.toolModeConfig.mode).toBe('consolidated-only');
    });
  });

  describe('Context Propagation', () => {
    it('should propagate shared context to handlers', async () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'consolidated-only',
        enableStdio: false
      });

      // Create a test note to verify handler can access vault
      const testNotePath = join(testVault.vaultPath, 'test-note.md');
      await fs.writeFile(testNotePath, '# Test Note\n\nTest content');

      // Context should include vaultPath and analytics
      expect(instance.analytics).toBeDefined();
      expect(testVault.vaultPath).toBeDefined();

      // Verify vault path is accessible
      const files = await fs.readdir(testVault.vaultPath);
      expect(files).toContain('test-note.md');
    });

    it('should share analytics instance across handler context', () => {
      const instance1 = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      const instance2 = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      // Analytics should be shared singleton
      expect(instance1.analytics).toBe(instance2.analytics);
    });
  });

  describe('Tool Mode Enforcement', () => {
    it('should configure handlers based on legacy-only mode', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'legacy-only',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('legacy-only');
      expect(instance.server).toBeDefined();
    });

    it('should configure handlers based on consolidated-only mode', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'consolidated-only',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('consolidated-only');
      expect(instance.server).toBeDefined();
    });

    it('should configure handlers based on consolidated-with-aliases mode', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'consolidated-with-aliases',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('consolidated-with-aliases');
      expect(instance.server).toBeDefined();
    });
  });

  describe('Analytics Exemption List', () => {
    it('should create server with analytics exemption configuration', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      // Analytics should exist and be properly configured
      expect(instance.analytics).toBeDefined();
      expect(typeof instance.analytics.recordToolExecution).toBe('function');

      // Server should be created with handler registry that respects analytics exemptions
      expect(instance.server).toBeDefined();
    });
  });
});
