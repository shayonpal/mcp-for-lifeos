import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../../logger.js';
import { ObsidianSettings } from '../../obsidian-settings.js';
import { TemplateParser, TemplateContext } from './template-parser.js';
import { stripMdExtension } from '../../path-utils.js';

interface TemplateData {
  name: string;
  path: string;
  content: string;
  hasTemplater: boolean;
  lastModified: Date;
}

interface TemplateCache {
  templates: Map<string, TemplateData>;
  lastRefresh: Date;
  templateFolder: string;
}

export class TemplateManager {
  private cache: TemplateCache | null = null;
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private vaultPath: string;
  private obsidianSettings: ObsidianSettings;
  private templateParser: TemplateParser;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
    this.obsidianSettings = new ObsidianSettings(vaultPath);
    this.templateParser = new TemplateParser();
  }

  /**
   * Check if cache needs refresh
   */
  private shouldRefreshCache(): boolean {
    if (!this.cache) return true;
    
    const now = new Date();
    const timeSinceRefresh = now.getTime() - this.cache.lastRefresh.getTime();
    return timeSinceRefresh > this.cacheExpiry;
  }

  /**
   * Get template folder from Obsidian settings
   */
  private async getTemplateFolder(): Promise<string> {
    // Try to get from Obsidian settings first
    const templateFolder = await this.obsidianSettings.getTemplateFolder();
    if (templateFolder) {
      return templateFolder;
    }

    // Default fallback to common template locations
    const defaultPaths = [
      path.join(this.vaultPath, '00 - Meta', 'Templates'),
      path.join(this.vaultPath, 'Templates'),
      path.join(this.vaultPath, 'templates')
    ];

    for (const templatePath of defaultPaths) {
      try {
        const stats = await fs.stat(templatePath);
        if (stats.isDirectory()) {
          return templatePath;
        }
      } catch {
        // Directory doesn't exist, try next
      }
    }

    // If no template folder found, return first default
    return defaultPaths[0];
  }

  /**
   * Check if content has Templater syntax
   */
  private hasTemplaterSyntax(content: string): boolean {
    return content.includes('<%') && content.includes('%>');
  }

  /**
   * Load all templates from template folder
   */
  private async loadTemplates(): Promise<Map<string, TemplateData>> {
    const templates = new Map<string, TemplateData>();
    const templateFolder = await this.getTemplateFolder();

    try {
      const files = await fs.readdir(templateFolder);
      
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        
        const filePath = path.join(templateFolder, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          const content = await fs.readFile(filePath, 'utf-8');
          const name = stripMdExtension(file);

          templates.set(name, {
            name,
            path: filePath,
            content,
            hasTemplater: this.hasTemplaterSyntax(content),
            lastModified: stats.mtime
          });

          logger.debug(`Loaded template: ${name}`);
        }
      }
    } catch (error) {
      logger.error('Error loading templates:', error);
    }

    return templates;
  }

  /**
   * Refresh the template cache
   */
  public async refreshCache(): Promise<void> {
    logger.info('Refreshing template cache...');
    
    const templates = await this.loadTemplates();
    const templateFolder = await this.getTemplateFolder();
    
    this.cache = {
      templates,
      lastRefresh: new Date(),
      templateFolder
    };
    
    logger.info(`Template cache refreshed with ${templates.size} templates`);
  }

  /**
   * Get all available template names
   */
  public async getTemplateNames(): Promise<string[]> {
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }
    
    if (!this.cache) {
      return [];
    }
    
    return Array.from(this.cache.templates.keys());
  }

  /**
   * Get a specific template by name
   *
   * Extension-agnostic: Accepts template names with or without .md extension.
   * Both 'tpl-daily' and 'tpl-daily.md' will retrieve the same template.
   *
   * @param templateName - Template name (e.g., 'tpl-daily' or 'tpl-daily.md')
   * @returns Template data including content and metadata, or null if not found
   */
  public async getTemplate(templateName: string): Promise<TemplateData | null> {
    if (this.shouldRefreshCache()) {
      await this.refreshCache();
    }

    if (!this.cache) {
      return null;
    }

    const normalizedName = stripMdExtension(templateName);

    return this.cache.templates.get(normalizedName) || null;
  }

  /**
   * Get template content with Templater variable processing
   */
  public async processTemplate(templateName: string, context: TemplateContext): Promise<string | null> {
    const template = await this.getTemplate(templateName);
    if (!template) {
      logger.warn(`Template not found: ${templateName}`);
      return null;
    }
    
    // Process the template with Templater support
    try {
      const processed = await this.templateParser.processTemplate(template.content, context);
      return processed;
    } catch (error) {
      logger.error(`Error processing template ${templateName}:`, error);
      return template.content; // Return raw content as fallback
    }
  }

  /**
   * Get the daily note template from Obsidian settings
   */
  public async getDailyNoteTemplate(): Promise<string | null> {
    return await this.obsidianSettings.getDailyNoteTemplateName();
  }
}