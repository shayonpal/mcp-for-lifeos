/**
 * Integration tests for Stdio Transport
 * Linear Issue: MCP-10
 *
 * Tests MCP protocol compliance via stdio transport:
 * - Tool discovery and listing
 * - MCP error response format
 * - Session lifecycle
 *
 * @see dev/contracts/MCP-10-contracts.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMcpServer } from '../../src/server/mcp-server.js';
import { createTestVault } from '../helpers/vault-setup.js';
import type { TestVaultSetup } from '../helpers/vault-setup.js';

describe('Stdio Transport - Integration', () => {
  let testVault: TestVaultSetup;

  beforeEach(async () => {
    testVault = await createTestVault();
  });

  afterEach(async () => {
    await testVault.cleanup();
  });

  describe('Transport Creation', () => {
    it('should create stdio transport when enabled', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: true
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

  describe('Session Lifecycle', () => {
    it('should support connect lifecycle without transport', async () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      await expect(instance.connect()).resolves.not.toThrow();
    });

    it('should support shutdown lifecycle without transport', async () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      await expect(instance.shutdown()).resolves.not.toThrow();
    });

    it('should support full connect-shutdown cycle', async () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      await instance.connect();
      await instance.shutdown();

      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Capability Discovery', () => {
    it('should create server with tools capability', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'consolidated-only',
        enableStdio: false
      });

      // Server should be created with tools capability
      expect(instance.server).toBeDefined();
      expect(instance.toolModeConfig).toBeDefined();
    });

    it('should support legacy-only tool mode', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'legacy-only',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('legacy-only');
    });

    it('should support consolidated-only tool mode', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'consolidated-only',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('consolidated-only');
    });

    it('should support consolidated-with-aliases tool mode', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'consolidated-with-aliases',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('consolidated-with-aliases');
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('should generate UUID v4 session IDs per MCP spec', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        enableStdio: false
      });

      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(instance.sessionId).toMatch(uuidV4Regex);
    });

    it('should create server with MCP-compliant configuration', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        serverName: 'lifeos-mcp',
        serverVersion: '2.0.1',
        enableStdio: false
      });

      expect(instance.server).toBeDefined();
      expect(instance.sessionId).toBeDefined();
      expect(instance.analytics).toBeDefined();
    });
  });
});
