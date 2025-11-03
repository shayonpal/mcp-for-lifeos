/**
 * Integration tests for MCP Server Factory
 * Linear Issue: MCP-10
 *
 * Tests end-to-end server lifecycle, analytics integration,
 * and transport creation patterns.
 *
 * @see dev/contracts/MCP-10-contracts.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMcpServer } from '../../src/server/mcp-server.js';
import { createTestVault } from '../helpers/vault-setup.js';
import type { TestVaultSetup } from '../helpers/vault-setup.js';

describe('MCP Server Factory - Integration', () => {
  let testVault: TestVaultSetup;

  beforeEach(async () => {
    testVault = await createTestVault();
  });

  afterEach(async () => {
    await testVault.cleanup();
  });

  describe('Server Instantiation', () => {
    it('should create server with all required components', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        serverName: 'test-integration-server',
        serverVersion: '1.0.0-test',
        enableStdio: false
      });

      // Verify server instance
      expect(instance.server).toBeDefined();

      // Verify analytics instance
      expect(instance.analytics).toBeDefined();

      // Verify session ID (UUID v4 format)
      expect(instance.sessionId).toBeDefined();
      expect(instance.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

      // Verify lifecycle methods
      expect(typeof instance.connect).toBe('function');
      expect(typeof instance.shutdown).toBe('function');
    });

    it('should create stdio transport when enabled', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: true // Enable stdio transport
      });

      expect(instance.transport).toBeDefined();
    });

    it('should not create stdio transport when disabled', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      expect(instance.transport).toBeUndefined();
    });
  });

  describe('Tool Mode Configuration', () => {
    it('should configure legacy-only mode', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'legacy-only',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('legacy-only');
      expect(instance.toolModeConfig.usedLegacyFlag).toBe(false);
    });

    it('should configure consolidated-only mode', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'consolidated-only',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('consolidated-only');
      expect(instance.toolModeConfig.usedLegacyFlag).toBe(false);
    });

    it('should configure consolidated-with-aliases mode', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'consolidated-with-aliases',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('consolidated-with-aliases');
      expect(instance.toolModeConfig.usedLegacyFlag).toBe(false);
    });

    it('should parse tool mode from environment variables', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        env: { TOOL_MODE: 'legacy-only' },
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('legacy-only');
    });
  });

  describe('Analytics Singleton Management', () => {
    it('should share analytics singleton across multiple server instances', () => {
      const instance1 = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      const instance2 = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      // Analytics should be the same singleton instance
      expect(instance1.analytics).toBe(instance2.analytics);
    });

    it('should have analytics instance with recordToolExecution method', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      expect(instance.analytics).toBeDefined();
      expect(typeof instance.analytics.recordToolExecution).toBe('function');
    });
  });

  describe('Session ID Generation', () => {
    it('should generate unique session IDs for each instance', () => {
      const instance1 = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      const instance2 = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      // Session IDs should be unique
      expect(instance1.sessionId).not.toBe(instance2.sessionId);
    });

    it('should accept custom session ID', () => {
      const customSessionId = 'custom-test-session-id';

      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        sessionId: customSessionId,
        enableStdio: false
      });

      expect(instance.sessionId).toBe(customSessionId);
    });

    it('should generate UUID v4 format session IDs', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      // UUID v4 format validation
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(instance.sessionId).toMatch(uuidV4Regex);
    });
  });

  describe('Server Lifecycle', () => {
    it('should support connect without transport', async () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      // Connect should not throw without transport
      await expect(instance.connect()).resolves.not.toThrow();
    });

    it('should support shutdown without transport', async () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      // Shutdown should not throw without transport
      await expect(instance.shutdown()).resolves.not.toThrow();
    });

    it('should support full lifecycle: connect → shutdown', async () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      // Full lifecycle should complete without errors
      await expect(instance.connect()).resolves.not.toThrow();
      await expect(instance.shutdown()).resolves.not.toThrow();
    });
  });
});
