/**
 * Unit tests for tool registry module
 * @see src/server/tool-registry.ts
 */

// Jest is used for testing (not Vitest)
import {
  getConsolidatedTools,
  getLegacyTools,
  getLegacyAliases,
  getAlwaysAvailableTools,
  getToolsForMode,
  addVersionMetadata
} from '../../../src/server/tool-registry.js';
import type { ToolRegistryConfig } from '../../../dev/contracts/MCP-7-contracts.js';

describe('Tool Registry', () => {
  describe('getConsolidatedTools()', () => {
    it('should return exactly 3 consolidated tools', () => {
      const tools = getConsolidatedTools();
      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toEqual(['search', 'create_note', 'list']);
    });

    it('should have valid tool structure', () => {
      const tools = getConsolidatedTools();
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toHaveProperty('type');
      });
    });
  });

  describe('getLegacyTools()', () => {
    it('should return exactly 11 legacy tools', () => {
      const tools = getLegacyTools();
      expect(tools).toHaveLength(11);
    });

    it('should not have deprecation notices in descriptions', () => {
      const tools = getLegacyTools();
      tools.forEach(tool => {
        expect(tool.description).not.toContain('[LEGACY ALIAS]');
      });
    });
  });

  describe('getLegacyAliases()', () => {
    it('should return exactly 11 legacy aliases', () => {
      const aliases = getLegacyAliases();
      expect(aliases).toHaveLength(11);
    });

    it('should have deprecation notices in descriptions', () => {
      const aliases = getLegacyAliases();
      aliases.forEach(alias => {
        expect(alias.description).toContain('[LEGACY ALIAS]');
      });
    });

    it('should share schemas with legacy tools', () => {
      const tools = getLegacyTools();
      const aliases = getLegacyAliases();

      // Same tool names
      expect(tools.map(t => t.name).sort()).toEqual(aliases.map(a => a.name).sort());

      // Schemas should be identical
      tools.forEach((tool, i) => {
        const alias = aliases.find(a => a.name === tool.name);
        expect(alias).toBeDefined();
        expect(alias?.inputSchema).toEqual(tool.inputSchema);
      });
    });
  });

  describe('getAlwaysAvailableTools()', () => {
    it('should return exactly 9 always-available tools', () => {
      const tools = getAlwaysAvailableTools();
      expect(tools).toHaveLength(9);
    });

    it('should include core tools', () => {
      const tools = getAlwaysAvailableTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('get_server_version');
      expect(toolNames).toContain('get_yaml_rules');
      expect(toolNames).toContain('edit_note');
      expect(toolNames).toContain('read_note');
      expect(toolNames).toContain('get_daily_note');
    });
  });

  describe('getToolsForMode()', () => {
    const baseConfig: ToolRegistryConfig = {
      serverName: 'lifeos-mcp',
      serverVersion: '2.0.1',
      mode: 'consolidated-only'
    };

    it('should return 12 tools for consolidated-only mode', () => {
      const config = { ...baseConfig, mode: 'consolidated-only' as const };
      const tools = getToolsForMode(config);
      expect(tools).toHaveLength(12); // 9 always + 3 consolidated
    });

    it('should return 20 tools for legacy-only mode', () => {
      const config = { ...baseConfig, mode: 'legacy-only' as const };
      const tools = getToolsForMode(config);
      expect(tools).toHaveLength(20); // 9 always + 11 legacy
    });

    it('should return 34 tools for consolidated-with-aliases mode', () => {
      const config = { ...baseConfig, mode: 'consolidated-with-aliases' as const };
      const tools = getToolsForMode(config);
      expect(tools).toHaveLength(34); // 9 always + 3 consolidated + 11 legacy + 11 aliases
    });

    it('should throw error for invalid mode', () => {
      const config = { ...baseConfig, mode: 'invalid-mode' as any };
      expect(() => getToolsForMode(config)).toThrow('Invalid tool mode');
    });

    it('should include always-available tools in all modes', () => {
      const modes = ['consolidated-only', 'legacy-only', 'consolidated-with-aliases'] as const;

      modes.forEach(mode => {
        const config = { ...baseConfig, mode };
        const tools = getToolsForMode(config);
        const toolNames = tools.map(t => t.name);

        expect(toolNames).toContain('get_server_version');
        expect(toolNames).toContain('edit_note');
      });
    });
  });

  describe('addVersionMetadata()', () => {
    const config: ToolRegistryConfig = {
      serverName: 'lifeos-mcp',
      serverVersion: '2.0.1',
      mode: 'consolidated-only'
    };

    it('should add metadata to response', () => {
      const response = { content: 'test' };
      const versioned = addVersionMetadata(response, config);

      expect(versioned).toHaveProperty('metadata');
      expect(versioned.metadata).toHaveProperty('version', '2.0.1');
      expect(versioned.metadata).toHaveProperty('serverName', 'lifeos-mcp');
      expect(versioned.metadata).toHaveProperty('toolMode', 'consolidated-only');
    });

    it('should preserve existing metadata', () => {
      const response = {
        content: 'test',
        metadata: { customField: 'value' }
      };
      const versioned = addVersionMetadata(response, config);

      expect(versioned.metadata.customField).toBe('value');
      expect(versioned.metadata.version).toBe('2.0.1');
    });

    it('should not mutate original response', () => {
      const response = { content: 'test' };
      const versioned = addVersionMetadata(response, config);

      expect(response).not.toHaveProperty('metadata');
      expect(versioned).not.toBe(response);
    });
  });
});
