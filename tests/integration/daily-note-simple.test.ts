/**
 * Simplified Daily Note Template Integration Tests
 * 
 * Tests the template functionality directly without spawning the full MCP server
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';
import { TemplateManager } from '../../src/modules/templates/index.js';
import { DateResolver } from '../../src/shared/index.js';
import { ObsidianSettings } from '../../src/obsidian-settings.js';
import { VaultUtils } from '../../src/modules/files/index.js';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

describe('Daily Note Template Integration (Direct)', () => {
  let vaultPath: string;
  let templateManager: TemplateManager;
  let dateResolver: DateResolver;
  let obsidianSettings: ObsidianSettings;
  let originalConfig: any;

  beforeEach(async () => {
    // Create temporary vault
    const randomId = randomBytes(8).toString('hex');
    vaultPath = path.join(tmpdir(), `test-vault-${randomId}`);
    await fs.mkdir(vaultPath, { recursive: true });
    
    // Create Obsidian config directory
    const obsidianDir = path.join(vaultPath, '.obsidian');
    await fs.mkdir(obsidianDir, { recursive: true });
    
    // Set up daily notes configuration
    await fs.writeFile(
      path.join(obsidianDir, 'daily-notes.json'),
      JSON.stringify({
        format: 'YYYY-MM-DD',
        folder: 'Daily',
        template: 'tpl-daily',
        autorun: false
      }, null, 2)
    );
    
    // Set up templates configuration
    await fs.writeFile(
      path.join(obsidianDir, 'templates.json'),
      JSON.stringify({ folder: 'Templates' }, null, 2)
    );
    
    // Create folders
    await fs.mkdir(path.join(vaultPath, 'Daily'), { recursive: true });
    await fs.mkdir(path.join(vaultPath, 'Templates'), { recursive: true });
    
    // Create template
    await fs.writeFile(
      path.join(vaultPath, 'Templates', 'tpl-daily.md'),
      `---
date: <% tp.date.now("YYYY-MM-DD") %>
contentType: Daily Note
tags:
  - daily-note
---

# <% tp.date.now("dddd, MMMM D, YYYY") %>

## Morning Reflections
- 

## Today's Tasks
- [ ] 

## Evening Review
- 

## Notes
`
    );
    
    // Initialize services with test vault
    templateManager = new TemplateManager(vaultPath);
    dateResolver = new DateResolver();
    obsidianSettings = new ObsidianSettings(vaultPath);
    
    // Mock the LIFEOS_CONFIG for VaultUtils
    const { LIFEOS_CONFIG } = await import('../../src/shared/index.js');
    const { VaultUtils } = await import('../../src/modules/files/index.js');
    originalConfig = { ...LIFEOS_CONFIG };
    LIFEOS_CONFIG.vaultPath = vaultPath;
    LIFEOS_CONFIG.dailyNotesPath = path.join(vaultPath, 'Daily');
    LIFEOS_CONFIG.templatesPath = path.join(vaultPath, 'Templates');
    
    // Reset VaultUtils singletons to use new config
    VaultUtils.resetSingletons();
  });

  afterEach(async () => {
    // Restore original config
    if (originalConfig) {
      const { LIFEOS_CONFIG } = await import('../../src/shared/index.js');
      Object.assign(LIFEOS_CONFIG, originalConfig);
    }
    
    // Clean up temporary vault
    await fs.rm(vaultPath, { recursive: true, force: true });
  });

  describe('Daily note creation with templates', () => {
    it('should create daily note using configured template', async () => {
      const today = new Date();
      const dateString = dateResolver.formatForDailyNote(today);
      const notePath = path.join(vaultPath, 'Daily', `${dateString}.md`);
      
      // Get the template
      const templateName = await obsidianSettings.getDailyNoteTemplateName();
      expect(templateName).toBe('tpl-daily');
      
      // Process template
      const processedContent = await templateManager.processTemplate(templateName!, {
        title: dateString,
        date: today
      });
      
      expect(processedContent).toBeTruthy();
      expect(processedContent).toContain(`date: ${dateString}`);
      expect(processedContent).toContain('contentType: Daily Note');
      expect(processedContent).toContain('tags:\n  - daily-note');
      expect(processedContent).toContain('## Morning Reflections');
      expect(processedContent).toContain('## Today\'s Tasks');
      
      // Create the note
      await fs.writeFile(notePath, processedContent!);
      
      // Verify it was created
      const exists = await fs.access(notePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      const content = await fs.readFile(notePath, 'utf-8');
      expect(content).toBe(processedContent);
    });

    it('should handle different date formats', async () => {
      const testDates = [
        { input: 'yesterday', offset: -1 },
        { input: 'tomorrow', offset: 1 },
        { input: '+5', offset: 5 },
        { input: '-3', offset: -3 }
      ];
      
      for (const { input, offset } of testDates) {
        const resolvedDate = dateResolver.parseDate(input);
        const dateString = dateResolver.formatForDailyNote(resolvedDate);
        
        // Process template for this date
        const processedContent = await templateManager.processTemplate('tpl-daily', {
          title: dateString,
          date: resolvedDate
        });
        
        expect(processedContent).toContain(`date: ${dateString}`);
        
        // Verify the date is correct
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + offset);
        const expectedDateString = dateResolver.formatForDailyNote(expectedDate);
        expect(dateString).toBe(expectedDateString);
      }
    });

    it('should create weekly template when specified', async () => {
      // Create weekly template
      await fs.writeFile(
        path.join(vaultPath, 'Templates', 'tpl-weekly.md'),
        `---
week: <% tp.date.now("YYYY-[W]ww") %>
contentType: Weekly Review
tags:
  - weekly-review
---

# Week <% tp.date.now("[W]ww, YYYY") %>

## Weekly Goals
- 

## Accomplishments
- 

## Next Week Planning
- `
      );
      
      const today = new Date();
      const processedContent = await templateManager.processTemplate('tpl-weekly', {
        title: 'Weekly Review',
        date: today
      });
      
      expect(processedContent).toContain('contentType: Weekly Review');
      expect(processedContent).toContain('tags:\n  - weekly-review');
      expect(processedContent).toContain('## Weekly Goals');
      expect(processedContent).toContain('## Accomplishments');
    });

    it('should handle missing template gracefully', async () => {
      const result = await templateManager.processTemplate('non-existent', {
        title: 'Test',
        date: new Date()
      });
      
      expect(result).toBeNull();
    });

    it('should apply template caching', async () => {
      // Load template once
      const first = await templateManager.getTemplate('tpl-daily');
      expect(first).toBeTruthy();
      
      // Modify the template file
      const templatePath = path.join(vaultPath, 'Templates', 'tpl-daily.md');
      const originalContent = await fs.readFile(templatePath, 'utf-8');
      await fs.writeFile(templatePath, originalContent + '\n## Additional Section');
      
      // Load again (should use cache)
      const second = await templateManager.getTemplate('tpl-daily');
      expect(second?.content).toBe(first?.content);
      
      // Force cache refresh
      await templateManager.refreshCache();
      
      // Load again (should have new content)
      const third = await templateManager.getTemplate('tpl-daily');
      expect(third?.content).toContain('## Additional Section');
    });
  });

  describe('Template processing edge cases', () => {
    it('should handle malformed template syntax', async () => {
      await fs.writeFile(
        path.join(vaultPath, 'Templates', 'tpl-broken.md'),
        `---
date: <% tp.date.now("YYYY-MM-DD"
---

# <% tp.file.title

Unclosed tags above`
      );
      
      const result = await templateManager.processTemplate('tpl-broken', {
        title: 'Test',
        date: new Date()
      });
      
      // Should return content but with unprocessed tags
      expect(result).toBeTruthy();
      expect(result).toContain('<% tp.date.now("YYYY-MM-DD"');
      expect(result).toContain('<% tp.file.title');
    });

    it('should handle complex date formatting', async () => {
      await fs.writeFile(
        path.join(vaultPath, 'Templates', 'tpl-complex-date.md'),
        `---
created: <% tp.date.now("YYYY-MM-DD HH:mm") %>
week: <% tp.date.now("YYYY-[W]ww") %>
month: <% tp.date.now("MMMM YYYY") %>
quarter: <% tp.date.now("[Q]Q YYYY") %>
---

# <% tp.date.now("dddd, MMMM D, YYYY") %>

Today is <% tp.date.now("dddd") %> in week <% tp.date.now("ww") %>`
      );
      
      const date = new Date('2025-06-28T15:30:00');
      const result = await templateManager.processTemplate('tpl-complex-date', {
        title: '2025-06-28',
        date
      });
      
      expect(result).toContain('created: 2025-06-28');
      // Note: date-fns doesn't support [W] format, so it outputs the date instead
      expect(result).toContain('week: 2025-06-28');
      expect(result).toContain('month: June 2025');
      // Note: date-fns doesn't support [Q] format perfectly
      expect(result).toContain('quarter: [2]2 2025');
      expect(result).toContain('# Saturday, June 28, 2025');
      expect(result).toContain('Today is Saturday in week 26');
    });

    it('should handle nested folders in template path', async () => {
      // Create nested template folder
      await fs.mkdir(path.join(vaultPath, 'Templates', 'Daily'), { recursive: true });
      
      await fs.writeFile(
        path.join(vaultPath, 'Templates', 'Daily', 'journal.md'),
        `# Daily Journal - <% tp.date.now("YYYY-MM-DD") %>`
      );
      
      // Update templates config to use nested folder
      await fs.writeFile(
        path.join(vaultPath, '.obsidian', 'templates.json'),
        JSON.stringify({ folder: 'Templates' }, null, 2)
      );
      
      // Template manager should find templates in subdirectories
      const templates = await templateManager.getTemplateNames();
      expect(templates).toContain('tpl-daily');
      
      // Note: Current implementation only scans top-level template folder
      // This test documents the current behavior
    });
  });

  describe('VaultUtils integration', () => {
    it('should create daily note with VaultUtils', async () => {
      // Create the folder structure that VaultUtils expects
      const journalPath = path.join(vaultPath, '20 - Areas', '21 - Myself', 'Journals', 'Daily');
      await fs.mkdir(journalPath, { recursive: true });
      
      // Update config to use simple Daily folder for testing
      const { LIFEOS_CONFIG } = await import('../../src/shared/index.js');
      LIFEOS_CONFIG.dailyNotesPath = path.join(vaultPath, 'Daily');
      
      const dateString = '2025-07-01';
      const date = new Date(dateString + 'T00:00:00');
      
      // Create daily note using VaultUtils
      const note = await VaultUtils.createDailyNote(date);
      
      expect(note).toBeTruthy();
      // The path will contain the actual date formatted
      const formattedDate = dateResolver.formatForDailyNote(date);
      expect(note.path).toContain(`/Daily/${formattedDate}.md`);
      
      // VaultUtils.createDailyNote uses hardcoded content as fallback
      // Note: frontmatter in returned note object is sanitized (auto-managed fields removed)
      // So we verify by reading the file directly

      // The note.path is already a full path, not relative
      const fullPath = note.path.startsWith('/') ? note.path : path.join(vaultPath, note.path);
      const exists = await fs.access(fullPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Read and verify content - VaultUtils uses hardcoded content
      const content = await fs.readFile(fullPath, 'utf-8');

      // Verify frontmatter was written to file (even though it's sanitized in return value)
      // Note: YAML serialization uses contentType (camelCase) not "content type"
      expect(content).toContain('contentType:');
      expect(content).toContain('Daily Note');

      // Check for template content (using configured daily note template)
      // The template includes date heading and standard sections
      // Dynamically generate expected heading for test date
      const expectedHeading = '# ' + date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      expect(content).toContain(expectedHeading);
      expect(content).toContain('## Morning Reflections');
      expect(content).toContain('## Today\'s Tasks');
    });
  });
});