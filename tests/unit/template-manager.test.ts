import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TemplateManager } from '../../src/modules/templates/index.js';
import { ObsidianSettings } from '../../src/obsidian-settings.js';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn()
  }
}));
jest.mock('../../src/obsidian-settings.js');
jest.mock('../../src/modules/templates/template-parser.js');
jest.mock('../../src/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('TemplateManager', () => {
  let templateManager: TemplateManager;
  const mockVaultPath = '/test/vault';
  const mockTemplateFolder = path.join(mockVaultPath, 'Templates');
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock ObsidianSettings
    (ObsidianSettings as jest.MockedClass<typeof ObsidianSettings>).mockImplementation(() => ({
      getTemplateFolder: jest.fn().mockResolvedValue('Templates'),
      getDailyNoteSettings: jest.fn().mockResolvedValue({
        format: 'YYYY-MM-DD',
        folder: 'Daily',
        template: 'tpl-daily',
        autorun: false
      }),
      getDailyNoteTemplateName: jest.fn().mockResolvedValue('tpl-daily')
    } as any));
    
    // Create instance after mocks are set up
    templateManager = new TemplateManager(mockVaultPath);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTemplateNames', () => {
    it('should return template names from cache when valid', async () => {
      // Mock file system
      (fs.readdir as jest.Mock).mockResolvedValue([
        'tpl-daily.md',
        'tpl-meeting.md',
        'not-a-template.txt'
      ]);

      (fs.stat as jest.Mock).mockImplementation((p) => {
        return Promise.resolve({
          isDirectory: () => p.includes('Templates'),
          isFile: () => p.endsWith('.md'),
          mtime: new Date()
        });
      });

      (fs.readFile as jest.Mock).mockResolvedValue('# Template content');

      const names = await templateManager.getTemplateNames();

      expect(names).toEqual(['tpl-daily', 'tpl-meeting']);
      expect(fs.readdir).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache when expired', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['tpl-daily.md']);
      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false,
        isFile: () => true,
        mtime: new Date()
      });
      (fs.readFile as jest.Mock).mockResolvedValue('# Template');

      // First call
      await templateManager.getTemplateNames();

      // Simulate cache expiry
      const cache = (templateManager as any).cache;
      if (cache) {
        cache.lastRefresh = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      }

      // Second call should refresh
      await templateManager.getTemplateNames();

      expect(fs.readdir).toHaveBeenCalledTimes(2);
    });

    it('should handle missing template folder gracefully', async () => {
      (fs.stat as jest.Mock).mockRejectedValue(new Error('Not found'));
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Not found'));
      
      const names = await templateManager.getTemplateNames();
      
      expect(names).toEqual([]);
    });
  });

  describe('getTemplate', () => {
    beforeEach(() => {
      (fs.readdir as jest.Mock).mockResolvedValue(['tpl-daily.md']);
      (fs.stat as jest.Mock).mockImplementation((p) => {
        return Promise.resolve({ 
          isDirectory: () => p.includes('Templates'),
          isFile: () => p.endsWith('.md'),
          mtime: new Date() 
        });
      });
    });

    it('should load template content from file', async () => {
      const mockContent = `---
contentType: Daily Note
---

# <% tp.file.title %>

## Today's Tasks
- [ ] Task 1`;
      
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);
      
      const template = await templateManager.getTemplate('tpl-daily');
      
      expect(template).toBeTruthy();
      expect(template?.name).toBe('tpl-daily');
      expect(template?.content).toBe(mockContent);
      expect(template?.hasTemplater).toBe(true);
    });

    it('should return null for non-existent template', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['tpl-other.md']);
      
      const template = await templateManager.getTemplate('tpl-daily');
      
      expect(template).toBeNull();
    });

    it('should handle template with .md extension', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['tpl-daily.md']);
      (fs.readFile as jest.Mock).mockResolvedValue('# Template');
      
      const template = await templateManager.getTemplate('tpl-daily.md');
      
      expect(template).toBeTruthy();
      expect(template?.name).toBe('tpl-daily');
    });
  });

  describe('getDailyNoteTemplate', () => {
    it('should return daily note template name from settings', async () => {
      const templateName = await templateManager.getDailyNoteTemplate();
      
      expect(templateName).toBe('tpl-daily');
    });

    it('should return null when no template configured', async () => {
      (ObsidianSettings as jest.MockedClass<typeof ObsidianSettings>).mockImplementation(() => ({
        getDailyNoteSettings: jest.fn().mockResolvedValue({
          format: 'YYYY-MM-DD',
          folder: 'Daily',
          template: '',
          autorun: false
        }),
        getDailyNoteTemplateName: jest.fn().mockResolvedValue(null),
        getTemplateFolder: jest.fn().mockResolvedValue('Templates')
      } as any));
      
      const newManager = new TemplateManager(mockVaultPath);
      const templateName = await newManager.getDailyNoteTemplate();
      
      expect(templateName).toBeNull();
    });
  });

  describe('processTemplate', () => {
    it('should process template with context', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['tpl-daily.md']);
      (fs.stat as jest.Mock).mockImplementation((p) => {
        return Promise.resolve({
          isDirectory: () => p.includes('Templates'),
          isFile: () => p.endsWith('.md'),
          mtime: new Date()
        });
      });
      (fs.readFile as jest.Mock).mockResolvedValue('# <% tp.file.title %>');

      // Mock TemplateParser - need to import and mock before creating new TemplateManager
      const { TemplateParser } = await import('../../src/modules/templates/template-parser.js');
      (TemplateParser as jest.MockedClass<typeof TemplateParser>).mockImplementation(() => ({
        processTemplate: jest.fn().mockResolvedValue('# 2025-06-28')
      } as any));

      // Create new TemplateManager after mock is set up
      const newManager = new TemplateManager(mockVaultPath);

      const result = await newManager.processTemplate('tpl-daily', {
        title: '2025-06-28',
        date: new Date('2025-06-28')
      });

      expect(result).toBe('# 2025-06-28');
    });

    it('should return null for non-existent template', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);
      
      const result = await templateManager.processTemplate('non-existent', {
        title: 'Test',
        date: new Date()
      });
      
      expect(result).toBeNull();
    });
  });

  describe('caching behavior', () => {
    it('should reuse cache within expiry period', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['tpl-daily.md']);
      (fs.stat as jest.Mock).mockImplementation((p) => {
        return Promise.resolve({ 
          isDirectory: () => p.includes('Templates'),
          isFile: () => p.endsWith('.md'),
          mtime: new Date() 
        });
      });
      (fs.readFile as jest.Mock).mockResolvedValue('# Template');
      
      // Load template twice
      await templateManager.getTemplate('tpl-daily');
      await templateManager.getTemplate('tpl-daily');
      
      // Should only read file once due to caching
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      (fs.readdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));
      
      const names = await templateManager.getTemplateNames();
      
      expect(names).toEqual([]);
    });
  });
});