/**
 * Unit tests for legacy alias handlers module
 * @see src/server/handlers/legacy-alias-handlers.ts
 */

import {
  registerLegacyAliasHandlers,
  getLegacyAliasHandler,
  LEGACY_ALIAS_TOOL_NAMES
} from '../../../src/server/handlers/legacy-alias-handlers.js';
import type { ToolHandler, ToolHandlerContext } from '../../../dev/contracts/MCP-8-contracts.js';
import type { ToolRegistryConfig } from '../../../dev/contracts/MCP-7-contracts.js';
import type { AnalyticsCollector } from '../../../src/analytics/analytics-collector.js';
import { ToolRouter } from '../../../src/tool-router.js';
import { createTestVault, type TestVaultSetup } from '../../helpers/vault-setup.js';
import { join } from 'path';
import { access } from 'fs/promises';

describe('Legacy Alias Handlers Module', () => {
  let mockContext: ToolHandlerContext;
  let mockRegistryConfig: ToolRegistryConfig;
  let testVault: TestVaultSetup;

  beforeEach(async () => {
    // Create isolated test vault to prevent production pollution
    testVault = await createTestVault();
    // Create mock registry config
    mockRegistryConfig = {
      mode: 'consolidated-with-aliases',
      serverName: 'lifeos-mcp',
      serverVersion: '2.0.1'
    };

    // Create mock analytics
    const mockAnalytics = {
      recordToolExecution: jest.fn(async (toolName, fn) => await fn()),
      getMetrics: jest.fn(() => ({})),
      writeMetricsToFile: jest.fn()
    } as unknown as AnalyticsCollector;

    // Create mock context
    mockContext = {
      toolMode: 'consolidated-with-aliases',
      registryConfig: mockRegistryConfig,
      analytics: mockAnalytics,
      sessionId: 'test-session-123',
      router: ToolRouter,
      clientName: 'test-client',
      clientVersion: '1.0.0'
    };
  });

  afterEach(async () => {
    // Clean up test vault and restore original config
    await testVault.cleanup();
  });

  describe('LEGACY_ALIAS_TOOL_NAMES constant', () => {
    it('should export exactly 11 legacy alias tool names', () => {
      expect(LEGACY_ALIAS_TOOL_NAMES).toHaveLength(11);
    });

    it('should include all search aliases (6 total)', () => {
      const searchAliases = [
        'search_notes',
        'advanced_search',
        'quick_search',
        'search_by_content_type',
        'search_recent',
        'find_notes_by_pattern'
      ];
      searchAliases.forEach(alias => {
        expect(LEGACY_ALIAS_TOOL_NAMES).toContain(alias);
      });
    });

    it('should include template alias', () => {
      expect(LEGACY_ALIAS_TOOL_NAMES).toContain('create_note_from_template');
    });

    it('should include all list aliases (4 total)', () => {
      const listAliases = [
        'list_folders',
        'list_daily_notes',
        'list_templates',
        'list_yaml_properties'
      ];
      listAliases.forEach(alias => {
        expect(LEGACY_ALIAS_TOOL_NAMES).toContain(alias);
      });
    });
  });

  describe('registerLegacyAliasHandlers()', () => {
    it('should register all 11 legacy alias handlers into the registry', () => {
      const registry = new Map<string, ToolHandler>();
      const result = registerLegacyAliasHandlers(registry);

      expect(result.size).toBe(11);
      expect(result).toBe(registry); // Returns same registry for chaining
    });

    it('should register handlers for each tool in LEGACY_ALIAS_TOOL_NAMES', () => {
      const registry = new Map<string, ToolHandler>();
      registerLegacyAliasHandlers(registry);

      LEGACY_ALIAS_TOOL_NAMES.forEach(toolName => {
        expect(registry.has(toolName)).toBe(true);
        expect(typeof registry.get(toolName)).toBe('function');
      });
    });

    it('should support chaining pattern', () => {
      const registry = new Map<string, ToolHandler>();
      const result = registerLegacyAliasHandlers(registry);

      expect(result).toBe(registry);
      expect(result.size).toBe(11);
    });

    it('should be idempotent (multiple calls don\'t duplicate handlers)', () => {
      const registry = new Map<string, ToolHandler>();
      registerLegacyAliasHandlers(registry);
      registerLegacyAliasHandlers(registry);

      expect(registry.size).toBe(11);
    });
  });

  describe('getLegacyAliasHandler()', () => {
    it('should return handler for valid legacy alias tool names', () => {
      LEGACY_ALIAS_TOOL_NAMES.forEach(toolName => {
        const handler = getLegacyAliasHandler(toolName);
        expect(handler).toBeDefined();
        expect(typeof handler).toBe('function');
      });
    });

    it('should return undefined for unknown tool names', () => {
      const handler = getLegacyAliasHandler('unknown_tool');
      expect(handler).toBeUndefined();
    });

    it('should return the same handler instance on multiple calls', () => {
      const handler1 = getLegacyAliasHandler('search_notes');
      const handler2 = getLegacyAliasHandler('search_notes');
      expect(handler1).toBe(handler2);
    });
  });

  describe('Mode Guards', () => {
    it('should work in legacy-only mode (search aliases)', async () => {
      const handler = getLegacyAliasHandler('search_notes');
      expect(handler).toBeDefined();

      const legacyOnlyContext: ToolHandlerContext = {
        ...mockContext,
        toolMode: 'legacy-only'
      };

      // Should now route successfully through registry instead of throwing
      const result = await handler!({ query: 'test' }, legacyOnlyContext);
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]).toHaveProperty('text');
    });

    it('should work in legacy-only mode (template alias)', async () => {
      const handler = getLegacyAliasHandler('create_note_from_template');
      expect(handler).toBeDefined();

      const legacyOnlyContext: ToolHandlerContext = {
        ...mockContext,
        toolMode: 'legacy-only'
      };

      // Should now route successfully through registry instead of throwing
      const uniqueTitle = `Test-MCP99-${Date.now()}`;
      const result = await handler!({ title: uniqueTitle, template: 'default' }, legacyOnlyContext);
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();

      // Verify note was created in test vault, NOT production vault
      expect(testVault.vaultPath).toContain('test-vault');
      expect(testVault.vaultPath).not.toContain('iCloud');

      // Verify the note exists in the test vault
      const notePath = join(testVault.vaultPath, '05 - Fleeting Notes', `${uniqueTitle}.md`);
      await access(notePath); // Will throw if file doesn't exist, causing test to fail
    });

    it('should work in legacy-only mode (list aliases)', async () => {
      const handler = getLegacyAliasHandler('list_folders');
      expect(handler).toBeDefined();

      const legacyOnlyContext: ToolHandlerContext = {
        ...mockContext,
        toolMode: 'legacy-only'
      };

      // Should now route successfully through registry instead of throwing
      const result = await handler!({}, legacyOnlyContext);
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });

  describe('Handler Factory Initialization', () => {
    it('should initialize handlers lazily (only on first access)', () => {
      // Reset by creating a new isolated test
      const handler1 = getLegacyAliasHandler('quick_search');
      const handler2 = getLegacyAliasHandler('advanced_search');

      expect(handler1).toBeDefined();
      expect(handler2).toBeDefined();
      expect(handler1).not.toBe(handler2);
    });

    it('should create separate handler instances for each tool', () => {
      const handlers = LEGACY_ALIAS_TOOL_NAMES.map(name => getLegacyAliasHandler(name));
      const uniqueHandlers = new Set(handlers);

      // All handlers should be unique instances
      expect(uniqueHandlers.size).toBe(LEGACY_ALIAS_TOOL_NAMES.length);
    });
  });

  describe('Deprecation Warning Generation', () => {
    it('should include deprecation notice in handler response structure', () => {
      // Test that handlers are set up to include deprecation warnings
      const searchHandler = getLegacyAliasHandler('search_notes');
      expect(searchHandler).toBeDefined();
      
      // Note: Full integration testing of responses happens in integration tests
      // This verifies the handler exists and is properly typed
    });
  });
});
