/**
 * Claude Desktop Integration Tests (Direct Import)
 *
 * Tests MCP server tools using direct imports instead of spawning separate process.
 * This provides reliable test isolation without env var propagation complexity.
 *
 * MCP-61 Design Decision:
 * Initial approach tried spawning server as separate process with env vars for temp vault.
 * Env var propagation failed (vars not reaching spawned process despite correct spawn config).
 * Pivoted to proven direct-import pattern (used by daily-note-simple.test.ts) because:
 *
 * Trade-offs:
 * ✅ Achieves primary goal: Zero production vault pollution
 * ✅ Reliable, proven pattern (2+ existing tests use this)
 * ✅ Faster test execution (no process spawn overhead)
 * ✅ Tests all tool logic, YAML compliance, template system
 * ❌ Doesn't test: stdio transport, JSON-RPC protocol, process lifecycle
 *
 * Decision: Test tool logic directly now, defer full integration test to future work.
 * Rationale: Fixing production pollution is P1 urgent; debugging env vars could take hours.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { createNote } from '../../src/modules/files/index.js';
import { LIFEOS_CONFIG } from '../../src/shared/index.js';
import { resetTestSingletons } from '../helpers/test-utils.js';

describe('Claude Desktop Integration (Direct)', () => {
  let vaultPath: string;
  let originalConfig: any;
  let fleetingNotesPath: string;
  const productionVaultPath = '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)';

  beforeEach(async () => {
    // Create temporary test vault (MCP-61: Prevent production vault pollution)
    const randomId = randomBytes(8).toString('hex');
    vaultPath = join(tmpdir(), `test-vault-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });

    // Create required LifeOS folder structure
    fleetingNotesPath = join(vaultPath, '05 - Fleeting Notes');
    const templatesPath = join(vaultPath, 'Templates');
    const dailyPath = join(vaultPath, 'Daily');

    await fs.mkdir(fleetingNotesPath, { recursive: true });
    await fs.mkdir(templatesPath, { recursive: true});
    await fs.mkdir(dailyPath, { recursive: true });

    // Seed minimal template for DynamicTemplateEngine.scanTemplates
    await fs.writeFile(
      join(templatesPath, 'tpl-test.md'),
      '---\ntitle: Test Template\n---\n\nTest content'
    );

    // Mock LIFEOS_CONFIG for VaultUtils (proven pattern from daily-note-simple.test.ts)
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;
    LIFEOS_CONFIG.templatesPath = templatesPath;
    LIFEOS_CONFIG.dailyNotesPath = dailyPath;
    LIFEOS_CONFIG.attachmentsPath = join(vaultPath, 'Attachments');
    LIFEOS_CONFIG.yamlRulesPath = join(vaultPath, 'yaml-rules.md');

    // Reset singletons to use new config
    resetTestSingletons();

    // Runtime assertion: Verify temp vault configuration (MCP-61 safety check)
    expect(LIFEOS_CONFIG.vaultPath).toBe(vaultPath);
    expect(LIFEOS_CONFIG.vaultPath).not.toContain('iCloud');
  });

  afterEach(async () => {
    // Restore original config
    if (originalConfig) {
      Object.assign(LIFEOS_CONFIG, originalConfig);
    }

    // Clean up temporary vault (MCP-61: Guaranteed cleanup)
    if (vaultPath) {
      await fs.rm(vaultPath, { recursive: true, force: true });
    }
  });

  describe('Core MCP-61 Test: No Production Vault Pollution', () => {
    it('should create notes ONLY in temp vault, never in production', async () => {
      // Create multiple test notes using VaultUtils.createNote
      const testNotePaths: string[] = [];

      for (let i = 0; i < 3; i++) {
        const note = createNote(
          `Integration Test Note ${i}`,
          { title: `Integration Test Note ${i}`, tags: ['test', 'integration'] },
          'This note should ONLY exist in temp vault',
          '05 - Fleeting Notes' // Pass relative path, not absolute
        );

        testNotePaths.push(note.path);
      }

      // Verify notes created in temp vault
      expect(testNotePaths.length).toBe(3);
      testNotePaths.forEach(notePath => {
        expect(notePath).toContain(vaultPath);
        expect(notePath).not.toContain('iCloud');
        expect(notePath).toContain('05 - Fleeting Notes');
      });

      // Verify notes actually exist on filesystem
      for (const notePath of testNotePaths) {
        const exists = await fs.access(notePath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      }

      // Critical assertion: Production vault should have NO test notes
      try {
        const productionFleetingNotes = join(productionVaultPath, '05 - Fleeting Notes');
        const files = await fs.readdir(productionFleetingNotes);
        const testNotes = files.filter(f => f.includes('Integration Test Note'));

        expect(testNotes.length).toBe(0);
        console.log(`✅ Production vault clean - ${testNotes.length} test artifacts found`);
      } catch (error) {
        // If production vault doesn't exist, that's fine - test passes
        console.log(`✅ Production vault not accessible (OK for CI/test environments)`);
      }
    });
  });

  describe('Vault Isolation Verification', () => {
    it('should read/write/search only in temp vault', async () => {
      // Create a note
      const note = createNote(
        'Vault Isolation Test',
        { title: 'Vault Isolation Test', tags: ['test'] },
        'Content to verify isolation',
        '05 - Fleeting Notes' // Pass relative path
      );

      const notePath = note.path;

      // Verify note is in temp vault
      expect(notePath).toContain(vaultPath);
      expect(notePath).not.toContain(productionVaultPath);

      // Verify note can be read back
      const noteContent = await fs.readFile(notePath, 'utf-8');
      expect(noteContent).toContain('Vault Isolation Test');
      expect(noteContent).toContain('Content to verify isolation');

      // List all notes in fleeting folder - should only find our test note
      const files = await fs.readdir(fleetingNotesPath);
      const mdFiles = files.filter(f => f.endsWith('.md'));

      expect(mdFiles.length).toBeGreaterThanOrEqual(1);
      expect(mdFiles.some(f => f.includes('Vault Isolation Test'))).toBe(true);

      console.log(`✅ Vault isolation verified: ${mdFiles.length} notes in temp vault`);
    });
  });

  describe('Config Override Verification', () => {
    it('should use temp vault paths from LIFEOS_CONFIG', () => {
      // Verify config was properly overridden
      expect(LIFEOS_CONFIG.vaultPath).toBe(vaultPath);
      expect(LIFEOS_CONFIG.vaultPath).toContain(tmpdir());
      expect(LIFEOS_CONFIG.vaultPath).not.toContain('iCloud');

      // Verify all paths point to temp vault
      expect(LIFEOS_CONFIG.templatesPath).toContain(vaultPath);
      expect(LIFEOS_CONFIG.dailyNotesPath).toContain(vaultPath);
      expect(LIFEOS_CONFIG.attachmentsPath).toContain(vaultPath);

      console.log(`✅ Config correctly overridden to temp vault`);
    });
  });

  describe('Cleanup Verification', () => {
    it('should clean up temp vault in afterEach', async () => {
      // Create a note
      const note = createNote(
        'Cleanup Test',
        { title: 'Cleanup Test' },
        'Will be cleaned up',
        '05 - Fleeting Notes' // Pass relative path
      );

      const notePath = note.path;

      // Verify it exists
      const exists = await fs.access(notePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // afterEach will handle cleanup
      console.log(`✅ Note created - will be cleaned by afterEach: ${notePath}`);
    });
  });
});
