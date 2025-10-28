/**
 * Unit tests for MCP Server Factory
 * Linear Issue: MCP-6
 * @see dev/contracts/MCP-6-contracts.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMcpServer, isValidToolMode, parseToolMode, generateSessionId, extractClientInfo, SERVER_VERSION } from '../../src/server/mcp-server.js';
import type { ToolMode, ToolModeConfig } from '../../dev/contracts/MCP-6-contracts.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync } from 'fs';

describe('MCP Server Factory', () => {
  describe('isValidToolMode', () => {
    it('should return true for valid tool modes', () => {
      expect(isValidToolMode('legacy-only')).toBe(true);
      expect(isValidToolMode('consolidated-only')).toBe(true);
      expect(isValidToolMode('consolidated-with-aliases')).toBe(true);
    });

    it('should return false for invalid tool modes', () => {
      expect(isValidToolMode('invalid')).toBe(false);
      expect(isValidToolMode('unknown-mode')).toBe(false);
      expect(isValidToolMode(undefined)).toBe(false);
      expect(isValidToolMode('')).toBe(false);
    });
  });

  describe('parseToolMode', () => {
    it('should use TOOL_MODE when set to valid value', () => {
      const config = parseToolMode({ TOOL_MODE: 'legacy-only' });
      expect(config.mode).toBe('legacy-only');
      expect(config.usedLegacyFlag).toBe(false);
      expect(config.rawToolMode).toBe('legacy-only');
    });

    it('should fallback to default when TOOL_MODE is invalid', () => {
      const config = parseToolMode({ TOOL_MODE: 'invalid-mode' });
      expect(config.mode).toBe('consolidated-only');
      expect(config.usedLegacyFlag).toBe(false);
      expect(config.rawToolMode).toBe('invalid-mode');
    });

    it('should use CONSOLIDATED_TOOLS_ENABLED for backward compatibility', () => {
      const config1 = parseToolMode({ CONSOLIDATED_TOOLS_ENABLED: 'true' });
      expect(config1.mode).toBe('consolidated-only');
      expect(config1.usedLegacyFlag).toBe(true);

      const config2 = parseToolMode({ CONSOLIDATED_TOOLS_ENABLED: 'false' });
      expect(config2.mode).toBe('legacy-only');
      expect(config2.usedLegacyFlag).toBe(true);
    });

    it('should prefer TOOL_MODE over CONSOLIDATED_TOOLS_ENABLED', () => {
      const config = parseToolMode({
        TOOL_MODE: 'consolidated-with-aliases',
        CONSOLIDATED_TOOLS_ENABLED: 'false'
      });
      expect(config.mode).toBe('consolidated-with-aliases');
      expect(config.usedLegacyFlag).toBe(false);
    });

    it('should default to consolidated-only when no env vars set', () => {
      const config = parseToolMode({});
      expect(config.mode).toBe('consolidated-only');
      expect(config.usedLegacyFlag).toBe(false);
    });
  });

  describe('generateSessionId', () => {
    it('should generate valid UUID', () => {
      const id = generateSessionId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('extractClientInfo', () => {
    it('should extract client name and version from server', () => {
      const mockServer = {
        getClientVersion: () => ({ name: 'test-client', version: '1.0.0' })
      };

      const result = extractClientInfo(mockServer as any);

      expect(result).toEqual({
        name: 'test-client',
        version: '1.0.0'
      });
    });

    it('should handle undefined client version', () => {
      const mockServer = {
        getClientVersion: () => undefined
      };

      const result = extractClientInfo(mockServer as any);

      expect(result).toEqual({
        name: undefined,
        version: undefined
      });
    });

    it('should handle partial client info (missing version)', () => {
      const mockServer = {
        getClientVersion: () => ({ name: 'test-client', version: undefined })
      };

      const result = extractClientInfo(mockServer as any);

      expect(result).toEqual({
        name: 'test-client',
        version: undefined
      });
    });

    it('should handle partial client info (missing name)', () => {
      const mockServer = {
        getClientVersion: () => ({ name: undefined, version: '2.0.0' })
      };

      const result = extractClientInfo(mockServer as any);

      expect(result).toEqual({
        name: undefined,
        version: '2.0.0'
      });
    });

    it('should extract info from multiple server instances consistently', () => {
      const mockServer1 = {
        getClientVersion: () => ({ name: 'client-a', version: '1.0.0' })
      };
      const mockServer2 = {
        getClientVersion: () => ({ name: 'client-b', version: '2.0.0' })
      };

      const result1 = extractClientInfo(mockServer1 as any);
      const result2 = extractClientInfo(mockServer2 as any);

      expect(result1.name).toBe('client-a');
      expect(result1.version).toBe('1.0.0');
      expect(result2.name).toBe('client-b');
      expect(result2.version).toBe('2.0.0');
    });

    it('should handle real-world client names', () => {
      const testCases = [
        { name: 'Claude Desktop', version: '0.7.3' },
        { name: 'Raycast', version: '1.0.0' },
        { name: 'custom-mcp-client', version: '2.5.1' }
      ];

      testCases.forEach(testCase => {
        const mockServer = {
          getClientVersion: () => testCase
        };

        const result = extractClientInfo(mockServer as any);

        expect(result).toEqual(testCase);
      });
    });
  });

  describe('createMcpServer', () => {
    let testVaultPath: string;

    beforeEach(() => {
      // Create temporary vault directory for tests
      testVaultPath = join(tmpdir(), `test-vault-${Date.now()}`);
      mkdirSync(testVaultPath, { recursive: true });
    });

    afterEach(() => {
      // Clean up temporary vault
      try {
        rmSync(testVaultPath, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should create server with minimal config', () => {
      const instance = createMcpServer({
        vaultPath: testVaultPath,
        enableStdio: false // Disable for testing
      });

      expect(instance.server).toBeDefined();
      expect(instance.analytics).toBeDefined();
      expect(instance.toolModeConfig).toBeDefined();
      expect(instance.sessionId).toBeDefined();
      expect(instance.connect).toBeDefined();
      expect(instance.shutdown).toBeDefined();
    });

    it('should throw error for invalid vaultPath', () => {
      expect(() => {
        createMcpServer({ vaultPath: '' });
      }).toThrow('Invalid vaultPath');

      expect(() => {
        createMcpServer({ vaultPath: '   ' });
      }).toThrow('Invalid vaultPath');
    });

    it('should throw error for non-existent vaultPath', () => {
      expect(() => {
        createMcpServer({ vaultPath: '/non/existent/path/that/does/not/exist' });
      }).toThrow('Vault path not accessible');
    });

    it('should throw error for inaccessible vaultPath', () => {
      // Testing with a path that exists but may not be accessible (system path)
      expect(() => {
        createMcpServer({ vaultPath: '/root/inaccessible' });
      }).toThrow('Vault path not accessible');
    });

    it('should use provided server name and version', () => {
      const instance = createMcpServer({
        vaultPath: testVaultPath,
        serverName: 'test-server',
        serverVersion: '1.0.0-test',
        enableStdio: false
      });

      expect(instance.server).toBeDefined();
    });

    it('should use default server name and version', () => {
      const instance = createMcpServer({
        vaultPath: testVaultPath,
        enableStdio: false
      });

      expect(instance.server).toBeDefined();
    });

    it('should accept explicit tool mode', () => {
      const instance = createMcpServer({
        vaultPath: testVaultPath,
        toolMode: 'legacy-only',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('legacy-only');
    });

    it('should parse tool mode from environment', () => {
      const instance = createMcpServer({
        vaultPath: testVaultPath,
        env: { TOOL_MODE: 'consolidated-with-aliases' },
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('consolidated-with-aliases');
    });

    it('should accept custom session ID', () => {
      const customSessionId = 'custom-session-123';
      const instance = createMcpServer({
        vaultPath: testVaultPath,
        sessionId: customSessionId,
        enableStdio: false
      });

      expect(instance.sessionId).toBe(customSessionId);
    });

    it('should generate session ID if not provided', () => {
      const instance = createMcpServer({
        vaultPath: testVaultPath,
        enableStdio: false
      });

      expect(instance.sessionId).toBeDefined();
      expect(instance.sessionId).toMatch(/^[0-9a-f-]+$/i);
    });

    it('should create stdio transport by default', () => {
      const instance = createMcpServer({
        vaultPath: testVaultPath
      });

      expect(instance.transport).toBeDefined();
    });

    it('should not create stdio transport when disabled', () => {
      const instance = createMcpServer({
        vaultPath: testVaultPath,
        enableStdio: false
      });

      expect(instance.transport).toBeUndefined();
    });

    it('should return instance with lifecycle methods', async () => {
      const instance = createMcpServer({
        vaultPath: testVaultPath,
        enableStdio: false
      });

      expect(typeof instance.connect).toBe('function');
      expect(typeof instance.shutdown).toBe('function');

      // Test connect/shutdown don't throw without transport
      await expect(instance.connect()).resolves.not.toThrow();
      await expect(instance.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Server Factory Integration', () => {
    let testVault1: string;
    let testVault2: string;

    beforeEach(() => {
      // Create temporary vault directories for integration tests
      testVault1 = join(tmpdir(), `test-vault-integration-1-${Date.now()}`);
      testVault2 = join(tmpdir(), `test-vault-integration-2-${Date.now()}`);
      mkdirSync(testVault1, { recursive: true });
      mkdirSync(testVault2, { recursive: true });
    });

    afterEach(() => {
      // Clean up temporary vaults
      try {
        rmSync(testVault1, { recursive: true, force: true });
        rmSync(testVault2, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should create server instance conforming to McpServerInstance contract', () => {
      const instance = createMcpServer({
        vaultPath: testVault1,
        enableStdio: false
      });

      // Verify all required properties exist
      expect(instance).toHaveProperty('server');
      expect(instance).toHaveProperty('analytics');
      expect(instance).toHaveProperty('toolModeConfig');
      expect(instance).toHaveProperty('sessionId');
      expect(instance).toHaveProperty('connect');
      expect(instance).toHaveProperty('shutdown');

      // Verify tool mode config structure
      expect(instance.toolModeConfig).toHaveProperty('mode');
      expect(instance.toolModeConfig).toHaveProperty('usedLegacyFlag');
    });

    it('should share analytics singleton across instances', () => {
      const instance1 = createMcpServer({
        vaultPath: testVault1,
        enableStdio: false
      });

      const instance2 = createMcpServer({
        vaultPath: testVault2,
        enableStdio: false
      });

      // Analytics should be same singleton instance
      expect(instance1.analytics).toBe(instance2.analytics);
    });
  });
});
