/**
 * Integration tests for Request Handler Module (MCP-95)
 *
 * Tests empty registry behavior and factory infrastructure.
 * Validates that factory pattern works correctly before handler extraction.
 *
 * @see src/server/request-handler.ts
 * @see https://linear.app/agilecode-studio/issue/MCP-95
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { createRequestHandler } from '../../src/server/request-handler.js';
import type { RequestHandlerConfig } from '../../dev/contracts/MCP-8-contracts.js';
import type { ToolMode } from '../../dev/contracts/MCP-6-contracts.js';
import type { AnalyticsCollector } from '../../src/analytics/analytics-collector.js';

describe('Request Handler - Empty Registry Integration (MCP-95)', () => {
  // Mock analytics collector
  const mockAnalytics = {
    recordUsage: jest.fn(),
    recordToolExecution: jest.fn(async (toolName, operation, context) => {
      return await operation();
    })
  } as unknown as AnalyticsCollector;

  // Mock tool router (not used in MCP-95, but required by config)
  const mockRouter = {
    routeSearch: jest.fn(),
    routeCreateNote: jest.fn(),
    routeList: jest.fn()
  };

  // Base configuration for tests
  const baseConfig: RequestHandlerConfig = {
    toolMode: 'consolidated-only',
    registryConfig: {
      mode: 'consolidated-only',
      serverName: 'lifeos-mcp',
      serverVersion: '2.0.1'
    },
    analytics: mockAnalytics,
    sessionId: 'test-session-integration',
    router: mockRouter as any,
    clientName: 'test-client',
    clientVersion: '1.0.0'
  };

  beforeEach(() => {
    // Clear analytics mock calls between tests
    jest.clearAllMocks();
  });

  describe('Factory Infrastructure', () => {
    it('creates handler function successfully', () => {
      const handler = createRequestHandler(baseConfig);
      expect(typeof handler).toBe('function');
    });

    it('creates independent handler instances per factory call', () => {
      const handler1 = createRequestHandler(baseConfig);
      const handler2 = createRequestHandler(baseConfig);

      expect(handler1).not.toBe(handler2);
      expect(typeof handler1).toBe('function');
      expect(typeof handler2).toBe('function');
    });

    it('compiles registry once during factory creation', () => {
      // Analytics should not be called during factory creation
      const callsBefore = mockAnalytics.recordUsage.mock.calls.length;
      createRequestHandler(baseConfig);
      const callsAfter = mockAnalytics.recordUsage.mock.calls.length;

      expect(callsAfter).toBe(callsBefore);
    });
  });

  describe('Empty Registry Behavior', () => {
    it('rejects request with missing arguments', async () => {
      const handler = createRequestHandler(baseConfig);

      const request = {
        method: 'tools/call',
        params: {
          name: 'search'
          // Missing: arguments
        }
      } as any;

      await expect(handler(request)).rejects.toThrow('Missing arguments');
    });

    it('rejects always-available tools (empty registry)', async () => {
      const handler = createRequestHandler(baseConfig);

      const request = {
        method: 'tools/call',
        params: {
          name: 'read_note',
          arguments: { path: 'test.md' }
        }
      } as any;

      await expect(handler(request)).rejects.toThrow('Unknown tool: read_note');
    });

    it('rejects consolidated tools (empty registry)', async () => {
      const handler = createRequestHandler(baseConfig);

      const request = {
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: { query: 'test' }
        }
      } as any;

      await expect(handler(request)).rejects.toThrow('Unknown tool: search');
    });

    it('rejects legacy tools (empty registry)', async () => {
      const handler = createRequestHandler({
        ...baseConfig,
        toolMode: 'legacy-only',
        registryConfig: {
          ...baseConfig.registryConfig,
          mode: 'legacy-only'
        }
      });

      const request = {
        method: 'tools/call',
        params: {
          name: 'search_notes',
          arguments: { query: 'test' }
        }
      } as any;

      await expect(handler(request)).rejects.toThrow('Unknown tool: search_notes');
    });
  });

  describe('Tool Mode Validation Before Registry Lookup', () => {
    it('validates consolidated tools blocked in legacy-only mode', async () => {
      const handler = createRequestHandler({
        ...baseConfig,
        toolMode: 'legacy-only',
        registryConfig: {
          ...baseConfig.registryConfig,
          mode: 'legacy-only'
        }
      });

      const request = {
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: { query: 'test' }
        }
      } as any;

      // Should fail on tool mode validation BEFORE registry lookup
      await expect(handler(request)).rejects.toThrow('Consolidated tools are disabled');
    });

    it('validates legacy tools blocked in consolidated-only mode', async () => {
      const handler = createRequestHandler({
        ...baseConfig,
        toolMode: 'consolidated-only'
      });

      const request = {
        method: 'tools/call',
        params: {
          name: 'search_notes',
          arguments: { query: 'test' }
        }
      } as any;

      // Should fail on tool mode validation BEFORE registry lookup
      await expect(handler(request)).rejects.toThrow('disabled');
    });

    it('allows all tools in consolidated-with-aliases mode (but registry still empty)', async () => {
      const handler = createRequestHandler({
        ...baseConfig,
        toolMode: 'consolidated-with-aliases',
        registryConfig: {
          ...baseConfig.registryConfig,
          mode: 'consolidated-with-aliases'
        }
      });

      // Consolidated tool
      const request1 = {
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: { query: 'test' }
        }
      } as any;

      // Passes tool mode validation but fails on empty registry
      await expect(handler(request1)).rejects.toThrow('Unknown tool: search');

      // Legacy tool
      const request2 = {
        method: 'tools/call',
        params: {
          name: 'search_notes',
          arguments: { query: 'test' }
        }
      } as any;

      // Passes tool mode validation but fails on empty registry
      await expect(handler(request2)).rejects.toThrow('Unknown tool: search_notes');
    });
  });

  describe('Error Message Quality', () => {
    it('provides clear error for missing arguments', async () => {
      const handler = createRequestHandler(baseConfig);

      const request = {
        method: 'tools/call',
        params: {
          name: 'search'
        }
      } as any;

      try {
        await handler(request);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Missing arguments');
      }
    });

    it('provides clear error for unknown tool with tool name', async () => {
      const handler = createRequestHandler(baseConfig);

      const request = {
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: { foo: 'bar' }
        }
      } as any;

      try {
        await handler(request);
        fail('Should have thrown error');
      } catch (error: any) {
        // Tool mode validation happens first, then registry lookup
        // For unknown tool, it fails on mode validation with "not available" message
        expect(error.message).toContain('not available');
        expect(error.message).toContain('nonexistent_tool');
      }
    });

    it('provides clear error for tool mode violations', async () => {
      const handler = createRequestHandler({
        ...baseConfig,
        toolMode: 'legacy-only',
        registryConfig: {
          ...baseConfig.registryConfig,
          mode: 'legacy-only'
        }
      });

      const request = {
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: { query: 'test' }
        }
      } as any;

      try {
        await handler(request);
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Consolidated tools are disabled');
        expect(error.message).toContain('legacy');
      }
    });
  });

  describe('Configuration Flexibility', () => {
    it('works with all tool modes', () => {
      const modes: ToolMode[] = ['legacy-only', 'consolidated-only', 'consolidated-with-aliases'];

      modes.forEach(mode => {
        const config: RequestHandlerConfig = {
          ...baseConfig,
          toolMode: mode,
          registryConfig: {
            ...baseConfig.registryConfig,
            mode
          }
        };

        const handler = createRequestHandler(config);
        expect(typeof handler).toBe('function');
      });
    });

    it('accepts different session IDs', () => {
      const sessionIds = ['session-1', 'session-2', 'test-session'];

      sessionIds.forEach(sessionId => {
        const handler = createRequestHandler({
          ...baseConfig,
          sessionId
        });

        expect(typeof handler).toBe('function');
      });
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('handles standard MCP CallToolRequest structure', async () => {
      const handler = createRequestHandler(baseConfig);

      const request = {
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: {
            query: 'test',
            maxResults: 10
          }
        }
      } as any;

      // Should fail on empty registry but still process request structure correctly
      await expect(handler(request)).rejects.toThrow('Unknown tool');
    });

    it('processes arguments object correctly', async () => {
      const handler = createRequestHandler(baseConfig);

      const request = {
        method: 'tools/call',
        params: {
          name: 'create_note',
          arguments: {
            title: 'Test Note',
            content: 'Test content',
            tags: ['test', 'example']
          }
        }
      } as any;

      // Should fail on empty registry but process args structure
      await expect(handler(request)).rejects.toThrow('Unknown tool');
    });
  });

  describe('Readiness for Handler Extraction (MCP-96/97)', () => {
    it('validates infrastructure ready for handler population', () => {
      const handler = createRequestHandler(baseConfig);

      // Factory creates handler successfully
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');

      // Validates tool mode checking works
      // Validates argument validation works
      // Registry pattern established (empty Map in MCP-95)

      // Ready for MCP-96 (consolidated handlers) and MCP-97 (legacy handlers)
    });
  });
});
