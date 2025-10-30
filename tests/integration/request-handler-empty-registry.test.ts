/**
 * Integration tests for Request Handler Module (MCP-96)
 *
 * Validates that consolidated handlers are registered and executed via the
 * request-handler factory while legacy tools still fall back with useful
 * errors. Confirms analytics wrapping and client-context updates behave as
 * expected across tool modes.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createRequestHandler } from '../../src/server/request-handler.js';
import type { RequestHandlerConfig } from '../../dev/contracts/MCP-8-contracts.js';
import type { ToolMode } from '../../dev/contracts/MCP-6-contracts.js';
import type { AnalyticsCollector } from '../../src/analytics/analytics-collector.js';
import type { RequestHandlerWithClientContext } from '../../dev/contracts/MCP-96-contracts.js';
import { ObsidianLinks } from '../../src/obsidian-links.js';
import { VaultUtils } from '../../src/vault-utils.js';
import { NaturalLanguageProcessor } from '../../src/natural-language-processor.js';

describe('Request Handler - Consolidated Registry Integration (MCP-96)', () => {
  const mockAnalytics = {
    recordUsage: jest.fn(),
    recordToolExecution: jest.fn(async (_toolName, operation) => {
      return await operation();
    })
  } as unknown as AnalyticsCollector;

  const mockRouter = {
    routeSearch: jest.fn(),
    routeCreateNote: jest.fn(),
    routeList: jest.fn()
  };

  const baseConfig: RequestHandlerConfig = {
    toolMode: 'consolidated-only',
    registryConfig: {
      mode: 'consolidated-only',
      serverName: 'lifeos-mcp',
      serverVersion: '2.0.1'
    },
    analytics: mockAnalytics,
    sessionId: 'integration-session',
    router: mockRouter as any,
    clientName: 'test-client',
    clientVersion: '1.0.0'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouter.routeSearch.mockResolvedValue([{
      note: {
        path: '/mock/vault/Test.md',
        frontmatter: { 'content type': 'Test' }
      },
      score: 0.95,
      matches: [{ type: 'content' as const, context: 'example', field: 'body' }],
      interpretation: null
    }]);

    mockRouter.routeCreateNote.mockResolvedValue({
      frontmatter: { title: 'Test Note' },
      content: '# Test',
      targetFolder: 'Test'
    });

    mockRouter.routeList.mockResolvedValue(['Folder A', 'Folder B']);

    jest.spyOn(VaultUtils, 'createNote').mockReturnValue({ path: '/mock/vault/Test.md' });
    jest.spyOn(ObsidianLinks, 'formatSearchResult').mockReturnValue('• Result');
    jest.spyOn(ObsidianLinks, 'extractNoteTitle').mockReturnValue('Test Note');
    jest.spyOn(ObsidianLinks, 'createClickableLink').mockReturnValue('[Test](Test)');
    jest.spyOn(NaturalLanguageProcessor, 'formatInterpretation').mockReturnValue('Interpretation');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createHandler = (toolMode: ToolMode = 'consolidated-only'): RequestHandlerWithClientContext => {
    return createRequestHandler({
      ...baseConfig,
      toolMode,
      registryConfig: {
        ...baseConfig.registryConfig,
        mode: toolMode
      }
    }) as RequestHandlerWithClientContext;
  };

  describe('Consolidated execution', () => {
    it('returns versioned response for consolidated search tool', async () => {
      const handler = createHandler();

      const response = await handler({
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: { query: 'integration test' }
        }
      } as any);

      expect(mockRouter.routeSearch).toHaveBeenCalledWith(expect.objectContaining({
        query: 'integration test',
        maxResults: expect.any(Number)
      }));
      expect(response.metadata?.version).toBe('2.0.1');
      expect(response.content?.[0]?.text).toContain('• Result');
    });

    it('updates analytics client info when updateClientContext is invoked', async () => {
      const handler = createHandler();
      handler.updateClientContext({ name: 'updated-client', version: '2.0.0' });

      await handler({
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: { query: 'client info' }
        }
      } as any);

      expect(mockAnalytics.recordToolExecution).toHaveBeenCalledWith(
        'search',
        expect.any(Function),
        expect.objectContaining({
          clientName: 'updated-client',
          clientVersion: '2.0.0'
        })
      );
    });
  });

  describe('Availability checks', () => {
    it('rejects unknown tools with descriptive error', async () => {
      const handler = createHandler();

      await expect(handler({
        method: 'tools/call',
        params: {
          name: 'read_note',
          arguments: { path: 'test.md' }
        }
      } as any)).rejects.toThrow('Unknown tool: read_note');
    });

    it('blocks consolidated tools in legacy-only mode before lookup', async () => {
      const handler = createHandler('legacy-only');

      await expect(handler({
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: { query: 'legacy mode' }
        }
      } as any)).rejects.toThrow('Consolidated tools are disabled');
    });

    it('blocks legacy tools in consolidated-only mode', async () => {
      const handler = createHandler('consolidated-only');

      await expect(handler({
        method: 'tools/call',
        params: {
          name: 'search_notes',
          arguments: { query: 'legacy tool' }
        }
      } as any)).rejects.toThrow('disabled');
    });
  });
});
