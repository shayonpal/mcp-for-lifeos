/**
 * Integration tests for Tool Mode Enforcement
 * Linear Issue: MCP-10
 *
 * Tests tool availability and mode enforcement across:
 * - legacy-only mode (20 tools)
 * - consolidated-only mode (12 tools)
 * - consolidated-with-aliases mode (34 tools)
 *
 * @see dev/contracts/MCP-10-contracts.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMcpServer } from '../../src/server/mcp-server.js';
import { isToolAllowed } from '../../src/server/request-handler.js';
import { createTestVault } from '../helpers/vault-setup.js';
import type { TestVaultSetup } from '../helpers/vault-setup.js';
import type { ToolMode } from '../../dev/contracts/MCP-6-contracts.js';

describe('Tool Mode Enforcement - Integration', () => {
  let testVault: TestVaultSetup;

  beforeEach(async () => {
    testVault = await createTestVault();
  });

  afterEach(async () => {
    await testVault.cleanup();
  });

  describe('Always-Available Tools', () => {
    const alwaysAvailableTools = [
      'get_server_version',
      'get_yaml_rules',
      'read_note',
      'edit_note',
      'get_daily_note',
      'diagnose_vault',
      'move_items',
      'insert_content',
      'list_yaml_property_values'
    ];

    it.each<ToolMode>(['legacy-only', 'consolidated-only', 'consolidated-with-aliases'])(
      'should allow all 9 always-available tools in %s mode',
      (mode) => {
        alwaysAvailableTools.forEach(tool => {
          const result = isToolAllowed(tool, mode);
          expect(result.allowed).toBe(true);
        });
      }
    );
  });

  describe('Consolidated Tools', () => {
    const consolidatedTools = ['search', 'create_note', 'list'];

    it('should allow consolidated tools in consolidated-only mode', () => {
      consolidatedTools.forEach(tool => {
        const result = isToolAllowed(tool, 'consolidated-only');
        expect(result.allowed).toBe(true);
      });
    });

    it('should allow consolidated tools in consolidated-with-aliases mode', () => {
      consolidatedTools.forEach(tool => {
        const result = isToolAllowed(tool, 'consolidated-with-aliases');
        expect(result.allowed).toBe(true);
      });
    });

    it('should block consolidated tools in legacy-only mode', () => {
      consolidatedTools.forEach(tool => {
        const result = isToolAllowed(tool, 'legacy-only');
        expect(result.allowed).toBe(false);
      });
    });
  });

  describe('Legacy Tools', () => {
    const legacyTools = [
      'search_notes',
      'advanced_search',
      'quick_search',
      'search_by_content_type',
      'search_recent',
      'find_notes_by_pattern',
      'create_note_from_template',
      'list_folders',
      'list_daily_notes',
      'list_templates',
      'list_yaml_properties'
    ];

    it('should allow legacy tools in legacy-only mode', () => {
      legacyTools.forEach(tool => {
        const result = isToolAllowed(tool, 'legacy-only');
        expect(result.allowed).toBe(true);
      });
    });

    it('should allow legacy tools in consolidated-with-aliases mode', () => {
      legacyTools.forEach(tool => {
        const result = isToolAllowed(tool, 'consolidated-with-aliases');
        expect(result.allowed).toBe(true);
      });
    });

    it('should block legacy tools in consolidated-only mode', () => {
      legacyTools.forEach(tool => {
        const result = isToolAllowed(tool, 'consolidated-only');
        expect(result.allowed).toBe(false);
      });
    });
  });

  describe('Unknown Tools', () => {
    it('should block unknown tools in all modes', () => {
      const unknownTools = ['unknown_tool', 'invalid_tool', 'nonexistent_tool'];
      const modes: ToolMode[] = ['legacy-only', 'consolidated-only', 'consolidated-with-aliases'];

      modes.forEach(mode => {
        unknownTools.forEach(tool => {
          const result = isToolAllowed(tool, mode);
          expect(result.allowed).toBe(false);
        });
      });
    });

    it('should provide helpful error message for unknown tools', () => {
      const result = isToolAllowed('unknown_tool', 'consolidated-only');

      expect(result.allowed).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('not available');
    });
  });

  describe('Server Integration with Tool Modes', () => {
    it('should create server with legacy-only mode enforcement', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'legacy-only',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('legacy-only');
    });

    it('should create server with consolidated-only mode enforcement', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'consolidated-only',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('consolidated-only');
    });

    it('should create server with consolidated-with-aliases mode enforcement', () => {
      const instance = createMcpServer({
        vaultPath: testVault.vaultPath,
        toolMode: 'consolidated-with-aliases',
        enableStdio: false
      });

      expect(instance.toolModeConfig.mode).toBe('consolidated-with-aliases');
    });
  });
});
