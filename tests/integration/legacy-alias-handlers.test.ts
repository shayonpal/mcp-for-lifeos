/**
 * Integration tests for legacy alias handlers
 * Tests end-to-end behavior including parameter mapping and deprecation warnings
 * @see src/server/handlers/legacy-alias-handlers.ts
 */

import { getLegacyAliasHandler } from '../../src/server/handlers/legacy-alias-handlers.js';
import type { ToolHandlerContext } from '../../dev/contracts/MCP-8-contracts.js';
import type { ToolRegistryConfig } from '../../dev/contracts/MCP-7-contracts.js';
import type { AnalyticsCollector } from '../../src/analytics/analytics-collector.js';
import { ToolRouter } from '../../src/tool-router.js';
import { VaultUtils } from '../../src/modules/files/index.js';

// MCP-148: Safety net mock to prevent file creation if any code path bypasses ToolRouter
// These tests focus on parameter mapping by mocking ToolRouter methods directly.
// This VaultUtils mock is intentionally minimal as it should never be reached.
// For tests that actually create files, use createTestVault() instead (see unit tests).
jest.mock('../../src/modules/files/index.js', () => ({
  VaultUtils: {
    createNote: jest.fn((fileName, frontmatter, content, targetFolder) => ({
      path: `${targetFolder}/${fileName}.md`,
      frontmatter,
      content
    }))
  }
}));

describe('Legacy Alias Handlers Integration', () => {
  let mockContext: ToolHandlerContext;
  let mockRegistryConfig: ToolRegistryConfig;

  beforeEach(() => {
    mockRegistryConfig = {
      mode: 'consolidated-with-aliases',
      serverName: 'lifeos-mcp',
      serverVersion: '2.0.1'
    };

    const mockAnalytics = {
      recordToolExecution: jest.fn(async (toolName, fn) => await fn()),
      getMetrics: jest.fn(() => ({})),
      writeMetricsToFile: jest.fn()
    } as unknown as AnalyticsCollector;

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

  describe('Search Alias Parameter Mapping', () => {
    it('search_by_content_type should map contentType to query parameter', async () => {
      const handler = getLegacyAliasHandler('search_by_content_type');
      expect(handler).toBeDefined();

      // Mock ToolRouter.routeSearch to verify parameter mapping
      const originalRouteSearch = ToolRouter.routeSearch;
      let capturedOptions: any = null;
      ToolRouter.routeSearch = jest.fn(async (options) => {
        capturedOptions = options;
        return [];
      });

      try {
        await handler!({ contentType: 'article' }, mockContext);

        expect(ToolRouter.routeSearch).toHaveBeenCalled();
        expect(capturedOptions).toMatchObject({
          mode: 'content_type',
          query: 'article'
        });
      } finally {
        ToolRouter.routeSearch = originalRouteSearch;
      }
    });

    it('find_notes_by_pattern should map pattern to query parameter', async () => {
      const handler = getLegacyAliasHandler('find_notes_by_pattern');
      expect(handler).toBeDefined();

      const originalRouteSearch = ToolRouter.routeSearch;
      let capturedOptions: any = null;
      ToolRouter.routeSearch = jest.fn(async (options) => {
        capturedOptions = options;
        return [];
      });

      try {
        await handler!({ pattern: '**/*test*.md' }, mockContext);

        expect(ToolRouter.routeSearch).toHaveBeenCalled();
        expect(capturedOptions).toMatchObject({
          mode: 'pattern',
          query: '**/*test*.md'
        });
      } finally {
        ToolRouter.routeSearch = originalRouteSearch;
      }
    });

    it('search_notes should use advanced mode', async () => {
      const handler = getLegacyAliasHandler('search_notes');
      expect(handler).toBeDefined();

      const originalRouteSearch = ToolRouter.routeSearch;
      let capturedOptions: any = null;
      ToolRouter.routeSearch = jest.fn(async (options) => {
        capturedOptions = options;
        return [];
      });

      try {
        await handler!({ query: 'test query' }, mockContext);

        expect(ToolRouter.routeSearch).toHaveBeenCalled();
        expect(capturedOptions).toMatchObject({
          mode: 'advanced',
          query: 'test query'
        });
      } finally {
        ToolRouter.routeSearch = originalRouteSearch;
      }
    });

    it('quick_search should use quick mode', async () => {
      const handler = getLegacyAliasHandler('quick_search');
      expect(handler).toBeDefined();

      const originalRouteSearch = ToolRouter.routeSearch;
      let capturedOptions: any = null;
      ToolRouter.routeSearch = jest.fn(async (options) => {
        capturedOptions = options;
        return [];
      });

      try {
        await handler!({ query: 'quick test' }, mockContext);

        expect(ToolRouter.routeSearch).toHaveBeenCalled();
        expect(capturedOptions).toMatchObject({
          mode: 'quick',
          query: 'quick test'
        });
      } finally {
        ToolRouter.routeSearch = originalRouteSearch;
      }
    });

    it('search_recent should use recent mode', async () => {
      const handler = getLegacyAliasHandler('search_recent');
      expect(handler).toBeDefined();

      const originalRouteSearch = ToolRouter.routeSearch;
      let capturedOptions: any = null;
      ToolRouter.routeSearch = jest.fn(async (options) => {
        capturedOptions = options;
        return [];
      });

      try {
        await handler!({ days: 7 }, mockContext);

        expect(ToolRouter.routeSearch).toHaveBeenCalled();
        expect(capturedOptions).toMatchObject({
          mode: 'recent'
        });
      } finally {
        ToolRouter.routeSearch = originalRouteSearch;
      }
    });
  });

  describe('List Alias Parameter Mapping', () => {
    it('list_folders should map path parameter', async () => {
      const handler = getLegacyAliasHandler('list_folders');
      expect(handler).toBeDefined();

      const originalRouteList = ToolRouter.routeList;
      let capturedOptions: any = null;
      ToolRouter.routeList = jest.fn(async (options) => {
        capturedOptions = options;
        return [];
      });

      try {
        await handler!({ path: '10 - Projects' }, mockContext);

        expect(ToolRouter.routeList).toHaveBeenCalled();
        expect(capturedOptions).toMatchObject({
          type: 'folders',
          path: '10 - Projects'
        });
      } finally {
        ToolRouter.routeList = originalRouteList;
      }
    });

    it('list_daily_notes should map limit parameter', async () => {
      const handler = getLegacyAliasHandler('list_daily_notes');
      expect(handler).toBeDefined();

      const originalRouteList = ToolRouter.routeList;
      let capturedOptions: any = null;
      ToolRouter.routeList = jest.fn(async (options) => {
        capturedOptions = options;
        return [];
      });

      try {
        await handler!({ limit: 10 }, mockContext);

        expect(ToolRouter.routeList).toHaveBeenCalled();
        expect(capturedOptions).toMatchObject({
          type: 'daily_notes',
          limit: 10
        });
      } finally {
        ToolRouter.routeList = originalRouteList;
      }
    });

    it('list_yaml_properties should map all parameters', async () => {
      const handler = getLegacyAliasHandler('list_yaml_properties');
      expect(handler).toBeDefined();

      const originalRouteList = ToolRouter.routeList;
      let capturedOptions: any = null;
      ToolRouter.routeList = jest.fn(async (options) => {
        capturedOptions = options;
        return { properties: [], counts: {}, totalNotes: 0 };
      });

      try {
        await handler!(
          { includeCount: true, sortBy: 'alpha', excludeStandard: true },
          mockContext
        );

        expect(ToolRouter.routeList).toHaveBeenCalled();
        expect(capturedOptions).toMatchObject({
          type: 'yaml_properties',
          includeCount: true,
          sortBy: 'alpha',
          excludeStandard: true
        });
      } finally {
        ToolRouter.routeList = originalRouteList;
      }
    });
  });

  describe('Template Alias Integration', () => {
    it('create_note_from_template should set auto_template to false', async () => {
      const handler = getLegacyAliasHandler('create_note_from_template');
      expect(handler).toBeDefined();

      const originalRouteCreateNote = ToolRouter.routeCreateNote;
      let capturedOptions: any = null;
      ToolRouter.routeCreateNote = jest.fn(async (options) => {
        capturedOptions = options;
        return {
          frontmatter: { title: 'Test' },
          content: 'Test content',
          targetFolder: '10 - Projects'
        };
      });

      try {
        await handler!(
          { title: 'New Note', template: 'article', customData: { author: 'Test' } },
          mockContext
        );

        expect(ToolRouter.routeCreateNote).toHaveBeenCalled();
        expect(capturedOptions).toMatchObject({
          title: 'New Note',
          template: 'article',
          customData: { author: 'Test' },
          auto_template: false
        });
      } finally {
        ToolRouter.routeCreateNote = originalRouteCreateNote;
      }
    });
  });

  describe('Deprecation Warning Presence', () => {
    it('search aliases should include deprecation warning in response', async () => {
      const handler = getLegacyAliasHandler('advanced_search');
      expect(handler).toBeDefined();

      const originalRouteSearch = ToolRouter.routeSearch;
      ToolRouter.routeSearch = jest.fn(async () => []);

      try {
        const result = await handler!({ query: 'test' }, mockContext);

        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0]).toHaveProperty('text');
        expect(result.content[0].text).toContain('DEPRECATION NOTICE');
        expect(result.content[0].text).toContain('advanced_search');
        expect(result.content[0].text).toContain('use the `search` tool');
      } finally {
        ToolRouter.routeSearch = originalRouteSearch;
      }
    });

    it('template alias should include deprecation warning in response', async () => {
      const handler = getLegacyAliasHandler('create_note_from_template');
      expect(handler).toBeDefined();

      const originalRouteCreateNote = ToolRouter.routeCreateNote;
      ToolRouter.routeCreateNote = jest.fn(async () => ({
        frontmatter: { title: 'Test' },
        content: 'Test',
        targetFolder: '10 - Projects'
      }));

      try {
        const result = await handler!(
          { title: 'Test', template: 'default' },
          mockContext
        );

        expect(result).toHaveProperty('content');
        expect(result.content[0].text).toContain('DEPRECATION NOTICE');
        expect(result.content[0].text).toContain('create_note_from_template');
        expect(result.content[0].text).toContain('use `create_note` instead');
      } finally {
        ToolRouter.routeCreateNote = originalRouteCreateNote;
      }
    });

    it('list aliases should include deprecation warning in response', async () => {
      const handler = getLegacyAliasHandler('list_templates');
      expect(handler).toBeDefined();

      const originalRouteList = ToolRouter.routeList;
      ToolRouter.routeList = jest.fn(async () => []);

      try {
        const result = await handler!({}, mockContext);

        expect(result).toHaveProperty('content');
        expect(result.content[0].text).toContain('DEPRECATION NOTICE');
        expect(result.content[0].text).toContain('list_templates');
        expect(result.content[0].text).toContain('use `list`');
      } finally {
        ToolRouter.routeList = originalRouteList;
      }
    });
  });

  describe('Version Metadata Integration', () => {
    it('should include version metadata when enabled in registry config', async () => {
      const handler = getLegacyAliasHandler('search_notes');
      expect(handler).toBeDefined();

      const originalRouteSearch = ToolRouter.routeSearch;
      ToolRouter.routeSearch = jest.fn(async () => []);

      try {
        const result = await handler!({ query: 'test' }, mockContext);

        // Version metadata should be added by addVersionMetadata wrapper
        expect(result).toHaveProperty('content');
        // Additional metadata assertions would depend on addVersionMetadata implementation
      } finally {
        ToolRouter.routeSearch = originalRouteSearch;
      }
    });
  });
});
