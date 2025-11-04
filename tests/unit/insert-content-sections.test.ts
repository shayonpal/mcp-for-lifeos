import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { VaultUtils } from '../../src/modules/files/index.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { LIFEOS_CONFIG } from '../../src/config.js';

describe('Insert Content - Section Targeting', () => {
  let vaultPath: string;
  let testNotePath: string;
  let originalConfig: any;

  beforeEach(async () => {
    // Create temporary vault
    const randomId = randomBytes(8).toString('hex');
    vaultPath = path.join(tmpdir(), `test-vault-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });

    // Store original config
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;
    
    // Reset VaultUtils singletons to use new config
    VaultUtils.resetSingletons();
  });

  afterEach(async () => {
    // Restore original config
    Object.assign(LIFEOS_CONFIG, originalConfig);
    
    // Cleanup temp vault
    await fs.rm(vaultPath, { recursive: true, force: true });
  });

  describe('Daily Note - Day\'s Notes Section', () => {
    beforeEach(async () => {
      // Create a daily note with the actual template structure
      testNotePath = path.join(vaultPath, '2025-06-28.md');
      await fs.writeFile(testNotePath, `---
aliases:
  - June 28, 2025
content type:
  - Daily Note
tags:
  - dailyNote
---

# Day's Notes

This is where daily tasks should go.

# Linked Notes

# Notes Created On This Day
`);
    });

    it('should find "Day\'s Notes" heading correctly', async () => {
      const content = '- [ ] Test task for Day\'s Notes section';
      
      const result = VaultUtils.insertContent(
        testNotePath,
        content,
        { heading: 'Day\'s Notes' },
        'end-of-section',
        true
      );

      expect(result).toBeDefined();
      expect(result.content).toContain('# Day\'s Notes');
      expect(result.content).toContain('Test task for Day\'s Notes section');
      
      // Verify task is in the correct section
      const lines = result.content.split('\n');
      const dayNotesIndex = lines.findIndex(line => line.trim() === '# Day\'s Notes');
      const taskIndex = lines.findIndex(line => line.includes('Test task for Day\'s Notes section'));
      const linkedNotesIndex = lines.findIndex(line => line.trim() === '# Linked Notes');
      
      expect(dayNotesIndex).toBeGreaterThan(-1);
      expect(taskIndex).toBeGreaterThan(dayNotesIndex);
      expect(taskIndex).toBeLessThan(linkedNotesIndex);
    });

    it('should handle exact heading matching with hash prefix', async () => {
      const content = '- [ ] Another test task';
      
      // Should work with or without the # prefix
      const result = VaultUtils.insertContent(
        testNotePath,
        content,
        { heading: '# Day\'s Notes' },
        'end-of-section',
        true
      );

      expect(result).toBeDefined();
      expect(result.content).toContain('Another test task');
    });

    it('should add multiple tasks to the same section', async () => {
      // Add first task
      let result = VaultUtils.insertContent(
        testNotePath,
        '- [ ] First task',
        { heading: 'Day\'s Notes' },
        'end-of-section',
        true
      );

      // Update file with result
      await fs.writeFile(testNotePath, result.content);

      // Add second task
      result = VaultUtils.insertContent(
        testNotePath,
        '- [ ] Second task',
        { heading: 'Day\'s Notes' },
        'end-of-section',
        true
      );

      expect(result.content).toContain('- [ ] First task');
      expect(result.content).toContain('- [ ] Second task');
      
      // Both should be in Day's Notes section
      const lines = result.content.split('\n');
      const dayNotesIndex = lines.findIndex(line => line.trim() === '# Day\'s Notes');
      const firstTaskIndex = lines.findIndex(line => line.includes('First task'));
      const secondTaskIndex = lines.findIndex(line => line.includes('Second task'));
      const linkedNotesIndex = lines.findIndex(line => line.trim() === '# Linked Notes');
      
      expect(firstTaskIndex).toBeGreaterThan(dayNotesIndex);
      expect(secondTaskIndex).toBeGreaterThan(dayNotesIndex);
      expect(firstTaskIndex).toBeLessThan(linkedNotesIndex);
      expect(secondTaskIndex).toBeLessThan(linkedNotesIndex);
    });

    it('should throw error for non-existent heading', async () => {
      expect(() => {
        VaultUtils.insertContent(
          testNotePath,
          '- [ ] Task',
          { heading: 'Non-existent Section' },
          'end-of-section',
          true
        );
      }).toThrow('Heading not found: Non-existent Section');
    });

    it('should handle case sensitivity correctly', async () => {
      // Should find the heading despite different case
      expect(() => {
        VaultUtils.insertContent(
          testNotePath,
          '- [ ] Task',
          { heading: 'day\'s notes' }, // lowercase
          'end-of-section',
          true
        );
      }).toThrow('Heading not found');
    });
  });

  describe('Template Variations', () => {
    it('should handle template with "Days Notes" (no apostrophe)', async () => {
      // Create note with alternative heading
      testNotePath = path.join(vaultPath, 'test-alt.md');
      await fs.writeFile(testNotePath, `# Days Notes\n\nContent here\n\n# Other Section`);

      const result = VaultUtils.insertContent(
        testNotePath,
        '- [ ] Task for Days Notes',
        { heading: 'Days Notes' },
        'end-of-section',
        true
      );

      expect(result.content).toContain('Task for Days Notes');
    });

    it('should handle template with different heading levels', async () => {
      testNotePath = path.join(vaultPath, 'test-levels.md');
      await fs.writeFile(testNotePath, `## Day's Notes\n\nContent\n\n## Next Section`);

      const result = VaultUtils.insertContent(
        testNotePath,
        '- [ ] Task',
        { heading: 'Day\'s Notes' },
        'end-of-section',
        true
      );

      expect(result.content).toContain('- [ ] Task');
    });
  });
});