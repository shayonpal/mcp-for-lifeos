/**
 * Unit tests for Request Handler Module
 *
 * Tests validation utilities and factory infrastructure for MCP-95.
 * Integration tests for handler execution in separate file.
 *
 * @see src/server/request-handler.ts
 * @see https://linear.app/agilecode-studio/issue/MCP-95
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
  isToolAllowed,
  createRequestHandler
} from '../../../src/server/request-handler.js';
import { validateMaxResults } from '../../../dev/contracts/MCP-38-contracts.js';
import type { ToolMode } from '../../../dev/contracts/MCP-6-contracts.js';
import type {
  RequestHandlerConfig,
  ToolAvailabilityResult
} from '../../../dev/contracts/MCP-8-contracts.js';
import type { MaxResultsValidation } from '../../../dev/contracts/MCP-38-contracts.js';
import type { AnalyticsCollector } from '../../../src/analytics/analytics-collector.js';
import { ObsidianLinks } from '../../../src/obsidian-links.js';
import { VaultUtils } from '../../../src/modules/files/index.js';
import { NaturalLanguageProcessor } from '../../../src/modules/search/index.js';

// ============================================================================
// TEST SUITE: isToolAllowed Validation
// ============================================================================

describe('Request Handler - isToolAllowed', () => {
  describe('Always-available tools', () => {
    const alwaysAvailableTools = [
      'read_note',
      'edit_note',
      'get_daily_note',
      'get_yaml_rules',
      'insert_content',
      'move_items',
      'list_yaml_property_values',
      'diagnose_vault',
      'get_server_version'
    ];

    it.each([
      'legacy-only',
      'consolidated-only',
      'consolidated-with-aliases'
    ] as ToolMode[])('allows always-available tools in %s mode', (mode) => {
      alwaysAvailableTools.forEach(toolName => {
        const result = isToolAllowed(toolName, mode);
        expect(result.allowed).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });
    });
  });

  describe('Consolidated tools', () => {
    const consolidatedTools = ['search', 'create_note', 'list'];

    it('allows consolidated tools in consolidated-only mode', () => {
      consolidatedTools.forEach(toolName => {
        const result = isToolAllowed(toolName, 'consolidated-only');
        expect(result.allowed).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });
    });

    it('allows consolidated tools in consolidated-with-aliases mode', () => {
      consolidatedTools.forEach(toolName => {
        const result = isToolAllowed(toolName, 'consolidated-with-aliases');
        expect(result.allowed).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });
    });

    it('blocks consolidated tools in legacy-only mode', () => {
      consolidatedTools.forEach(toolName => {
        const result = isToolAllowed(toolName, 'legacy-only');
        expect(result.allowed).toBe(false);
        expect(result.errorMessage).toContain('Consolidated tools are disabled');
      });
    });
  });

  describe('Legacy tools', () => {
    const legacyTools = [
      'search_notes',
      'create_note_from_template',
      'list_folders',
      'find_notes_by_pattern',
      'list_daily_notes',
      'advanced_search',
      'quick_search',
      'search_by_content_type',
      'search_recent',
      'list_templates',
      'list_yaml_properties'
    ];

    it('allows legacy tools in legacy-only mode', () => {
      legacyTools.forEach(toolName => {
        const result = isToolAllowed(toolName, 'legacy-only');
        expect(result.allowed).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });
    });

    it('allows legacy tools in consolidated-with-aliases mode', () => {
      legacyTools.forEach(toolName => {
        const result = isToolAllowed(toolName, 'consolidated-with-aliases');
        expect(result.allowed).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });
    });

    it('blocks legacy tools in consolidated-only mode', () => {
      legacyTools.forEach(toolName => {
        const result = isToolAllowed(toolName, 'consolidated-only');
        expect(result.allowed).toBe(false);
        expect(result.errorMessage).toContain('disabled');
      });
    });
  });

  describe('Unknown tools', () => {
    const unknownTools = ['nonexistent_tool', 'invalid_tool', 'fake_tool'];

    it.each([
      'legacy-only',
      'consolidated-only',
      'consolidated-with-aliases'
    ] as ToolMode[])('blocks unknown tools in %s mode', (mode) => {
      unknownTools.forEach(toolName => {
        const result = isToolAllowed(toolName, mode);
        expect(result.allowed).toBe(false);
        expect(result.errorMessage).toBeDefined();
      });
    });
  });

  describe('Edge cases', () => {
    it('handles empty tool name', () => {
      const result = isToolAllowed('', 'consolidated-only');
      expect(result.allowed).toBe(false);
    });

    it('handles case-sensitive tool names', () => {
      const result = isToolAllowed('SEARCH', 'consolidated-only');
      expect(result.allowed).toBe(false);
    });

    it('returns structured error message for invalid mode', () => {
      const result = isToolAllowed('search', 'invalid-mode' as ToolMode);
      expect(result.allowed).toBe(false);
      expect(result.errorMessage).toContain('Invalid tool mode');
    });
  });
});

// ============================================================================
// TEST SUITE: validateMaxResults
// ============================================================================

describe('Request Handler - validateMaxResults', () => {
  describe('Default behavior', () => {
    it('returns default value (25) when undefined', () => {
      const result = validateMaxResults(undefined, 'search');
      expect(result.value).toBe(25);
      expect(result.adjusted).toBe(false);
      expect(result.originalValue).toBeUndefined();
    });
  });

  describe('Valid range (1-100)', () => {
    it('accepts value within range without adjustment', () => {
      const testValues = [1, 10, 25, 50, 75, 100];
      testValues.forEach(value => {
        const result = validateMaxResults(value, 'search');
        expect(result.value).toBe(value);
        expect(result.adjusted).toBe(false);
        expect(result.originalValue).toBeUndefined();
      });
    });
  });

  describe('Constraint to minimum (1)', () => {
    it('constrains negative values to minimum', () => {
      const result = validateMaxResults(-5, 'search');
      expect(result.value).toBe(1);
      expect(result.adjusted).toBe(true);
      expect(result.originalValue).toBe(-5);
    });

    it('constrains zero to minimum', () => {
      const result = validateMaxResults(0, 'search');
      expect(result.value).toBe(1);
      expect(result.adjusted).toBe(true);
      expect(result.originalValue).toBe(0);
    });
  });

  describe('Constraint to maximum (100)', () => {
    it('constrains values above 100', () => {
      const result = validateMaxResults(150, 'search');
      expect(result.value).toBe(100);
      expect(result.adjusted).toBe(true);
      expect(result.originalValue).toBe(150);
    });

    it('constrains very large values', () => {
      const result = validateMaxResults(1000, 'search');
      expect(result.value).toBe(100);
      expect(result.adjusted).toBe(true);
      expect(result.originalValue).toBe(1000);
    });
  });

  describe('Tool name parameter (MCP-95)', () => {
    it('accepts any tool name without tool-specific constraints', () => {
      const tools = ['search', 'list', 'unknown_tool'];
      tools.forEach(tool => {
        const result = validateMaxResults(50, tool);
        expect(result.value).toBe(50);
        expect(result.adjusted).toBe(false);
      });
    });
  });
});

// ============================================================================
// TEST SUITE: createRequestHandler Factory
// ============================================================================

describe('Request Handler - createRequestHandler', () => {
  // Mock dependencies
  const mockAnalytics = {
    recordUsage: jest.fn(),
    recordToolExecution: jest.fn(async (toolName, operation, context) => {
      return await operation();
    })
  } as unknown as AnalyticsCollector;

  const mockRouter = {
    routeSearch: jest.fn(),
    routeCreateNote: jest.fn(),
    routeList: jest.fn()
  };

  const mockServer = {
    _options: {
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  } as any;

  const mockYamlRulesManager = {
    isConfigured: jest.fn(() => false),
    validateRulesFile: jest.fn(),
    getRules: jest.fn(),
    getRulesPath: jest.fn(() => '/test/rules.md')
  } as any;

  const mockConfig: RequestHandlerConfig = {
    toolMode: 'consolidated-only',
    registryConfig: {
      mode: 'consolidated-only',
      serverName: 'lifeos-mcp',
      serverVersion: '2.0.1'
    },
    analytics: mockAnalytics,
    sessionId: 'test-session-123',
    router: mockRouter as any,
    clientName: 'test-client',
    clientVersion: '1.0.0',
    server: mockServer,
    yamlRulesManager: mockYamlRulesManager
  };

  const mockVaultNote = {
    path: '/mock/vault/Test Note.md'
  } as const;

  const mockSearchResult = [{
    note: {
      path: '/mock/vault/Test Note.md',
      frontmatter: { 'content type': 'Test' }
    },
    score: 0.98,
    matches: [{ type: 'content' as const, context: 'example', field: 'body' }],
    interpretation: null
  }];

  const mockListResult = ['Folder A', 'Folder B'];

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouter.routeSearch.mockResolvedValue(mockSearchResult);
    mockRouter.routeCreateNote.mockResolvedValue({
      frontmatter: { title: 'Test Note' },
      content: '# Test',
      targetFolder: 'Test'
    });
    mockRouter.routeList.mockResolvedValue(mockListResult);

    jest.spyOn(VaultUtils, 'createNote').mockReturnValue(mockVaultNote);
    jest.spyOn(ObsidianLinks, 'formatSearchResult').mockReturnValue('• Result');
    jest.spyOn(ObsidianLinks, 'extractNoteTitle').mockReturnValue('Test Note');
    jest.spyOn(ObsidianLinks, 'createClickableLink').mockReturnValue('[Test](Test)');
    jest.spyOn(NaturalLanguageProcessor, 'formatInterpretation').mockReturnValue('Interpretation');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Factory creation', () => {
    it('creates handler function', () => {
      const handler = createRequestHandler(mockConfig);
      expect(typeof handler).toBe('function');
    });

    it('creates handler without executing side effects', () => {
      const analyticsCallCount = mockAnalytics.recordUsage.mock.calls.length;
      createRequestHandler(mockConfig);
      expect(mockAnalytics.recordUsage.mock.calls.length).toBe(analyticsCallCount);
    });
  });

  describe('Registry population (MCP-96)', () => {
    it('throws "Missing arguments" for request without arguments', async () => {
      const handler = createRequestHandler(mockConfig);
      const request = {
        method: 'tools/call',
        params: {
          name: 'search'
          // Missing arguments
        }
      } as any;

      await expect(handler(request)).rejects.toThrow('Missing arguments');
    });

    it('executes consolidated tools via registry', async () => {
      const handler = createRequestHandler(mockConfig);

      const searchRequest = {
        method: 'tools/call',
        params: {
          name: 'search',
          arguments: { query: 'registry test' }
        }
      } as any;

      const result = await handler(searchRequest);

      expect(mockRouter.routeSearch).toHaveBeenCalledWith(expect.objectContaining({
        query: 'registry test',
        maxResults: expect.any(Number)
      }));
      expect(result.content?.[0]?.type).toBe('text');
      expect(result.content?.[0]?.text).toContain('• Result');
      expect(mockAnalytics.recordToolExecution).toHaveBeenCalledWith(
        'search',
        expect.any(Function),
        expect.objectContaining({ clientName: 'test-client' })
      );
    });

    it('creates notes via consolidated registry handler', async () => {
      const handler = createRequestHandler(mockConfig);

      const createRequest = {
        method: 'tools/call',
        params: {
          name: 'create_note',
          arguments: { title: 'Registry Test Note' }
        }
      } as any;

      const result = await handler(createRequest);

      expect(mockRouter.routeCreateNote).toHaveBeenCalledWith({ title: 'Registry Test Note' });
      expect(VaultUtils.createNote).toHaveBeenCalledWith(
        'Registry Test Note',
        expect.any(Object),
        expect.any(String),
        expect.any(String)
      );
      expect(result.content?.[0]?.text).toContain('Registry Test Note');
    });

    it('lists data via consolidated registry handler', async () => {
      const handler = createRequestHandler(mockConfig);

      const listRequest = {
        method: 'tools/call',
        params: {
          name: 'list',
          arguments: { type: 'folders', format: 'concise' }
        }
      } as any;

      const result = await handler(listRequest);

      expect(mockRouter.routeList).toHaveBeenCalledWith({ type: 'folders', format: 'concise' });
      expect(result.content?.[0]?.text).toContain('Folder A');
    });

    it('throws "Unknown tool" when registry lacks tool', async () => {
      const handler = createRequestHandler(mockConfig);

      const request = {
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: { path: 'test.md' }
        }
      } as any;

      await expect(handler(request)).rejects.toThrow("Tool 'nonexistent_tool' is not available in mode 'consolidated-only'");
    });

    it('validates tool mode before registry lookup', async () => {
      const handler = createRequestHandler({
        ...mockConfig,
        toolMode: 'legacy-only'
      });

      const request = {
        method: 'tools/call',
        params: {
          name: 'search',  // Consolidated tool blocked in legacy-only
          arguments: { query: 'test' }
        }
      } as any;

      await expect(handler(request)).rejects.toThrow('Consolidated tools are disabled');
    });
  });

  describe('Tool mode validation', () => {
    it('validates tool availability in legacy-only mode', async () => {
      const handler = createRequestHandler({
        ...mockConfig,
        toolMode: 'legacy-only'
      });

      const request = {
        method: 'tools/call',
        params: {
          name: 'create_note',
          arguments: { title: 'Test' }
        }
      } as any;

      await expect(handler(request)).rejects.toThrow('Consolidated tools are disabled');
    });

    it('validates tool availability in consolidated-only mode', async () => {
      const handler = createRequestHandler({
        ...mockConfig,
        toolMode: 'consolidated-only'
      });

      const request = {
        method: 'tools/call',
        params: {
          name: 'search_notes',  // Legacy tool
          arguments: { query: 'test' }
        }
      } as any;

      await expect(handler(request)).rejects.toThrow('disabled');
    });
  });

  describe('Handler context', () => {
    it('builds context with provided configuration', () => {
      const handler = createRequestHandler(mockConfig);
      expect(handler).toBeDefined();
      // Context is private, validated through behavior
    });
  });
});
