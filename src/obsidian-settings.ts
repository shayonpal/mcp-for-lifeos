import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from './shared/index.js';
import { stripMdExtension } from './shared/index.js';

export interface DailyNoteSettings {
  format: string;
  folder: string;
  template: string;
  autorun: boolean;
}

export interface TemplateSettings {
  folder: string;
}

export class ObsidianSettings {
  private vaultPath: string;
  private dailyNoteSettings: DailyNoteSettings | null = null;
  private templateSettings: TemplateSettings | null = null;
  private lastRead: Date | null = null;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes cache for settings

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.lastRead) return false;
    const now = new Date();
    return (now.getTime() - this.lastRead.getTime()) < this.cacheExpiry;
  }

  /**
   * Read and parse a JSON settings file
   */
  private async readSettingsFile<T>(fileName: string): Promise<T | null> {
    try {
      const filePath = path.join(this.vaultPath, '.obsidian', fileName);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      logger.debug(`Could not read ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Get daily note settings
   */
  public async getDailyNoteSettings(): Promise<DailyNoteSettings | null> {
    if (!this.isCacheValid() || !this.dailyNoteSettings) {
      this.dailyNoteSettings = await this.readSettingsFile<DailyNoteSettings>('daily-notes.json');
      this.lastRead = new Date();
    }
    return this.dailyNoteSettings;
  }

  /**
   * Get template settings
   */
  public async getTemplateSettings(): Promise<TemplateSettings | null> {
    if (!this.isCacheValid() || !this.templateSettings) {
      this.templateSettings = await this.readSettingsFile<TemplateSettings>('templates.json');
      this.lastRead = new Date();
    }
    return this.templateSettings;
  }

  /**
   * Get the daily note template name (without .md extension)
   */
  public async getDailyNoteTemplateName(): Promise<string | null> {
    const settings = await this.getDailyNoteSettings();
    if (!settings || !settings.template) {
      return null;
    }

    // Remove .md extension if present
    return stripMdExtension(settings.template);
  }

  /**
   * Get the daily note folder path
   */
  public async getDailyNoteFolder(): Promise<string> {
    const settings = await this.getDailyNoteSettings();
    if (!settings || !settings.folder) {
      // Default to a common daily note location
      return path.join(this.vaultPath, 'Daily Notes');
    }
    
    return path.join(this.vaultPath, settings.folder);
  }

  /**
   * Get the daily note date format
   */
  public async getDailyNoteDateFormat(): Promise<string> {
    const settings = await this.getDailyNoteSettings();
    return settings?.format || 'YYYY-MM-DD';
  }

  /**
   * Get the template folder path
   */
  public async getTemplateFolder(): Promise<string | null> {
    const settings = await this.getTemplateSettings();
    if (!settings || !settings.folder) {
      return null;
    }
    
    return path.join(this.vaultPath, settings.folder);
  }

  /**
   * Check if a given path is a daily note based on settings
   */
  public async isDailyNote(filePath: string): Promise<boolean> {
    const dailyNoteFolder = await this.getDailyNoteFolder();
    const normalizedPath = path.normalize(filePath);
    const normalizedDailyFolder = path.normalize(dailyNoteFolder);
    
    // Check if the file is in the daily notes folder
    if (!normalizedPath.startsWith(normalizedDailyFolder)) {
      return false;
    }
    
    // Check if filename matches date format
    const format = await this.getDailyNoteDateFormat();
    const fileName = path.basename(filePath, '.md');
    
    // Simple check for YYYY-MM-DD format
    if (format === 'YYYY-MM-DD') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      return dateRegex.test(fileName);
    }
    
    // For other formats, we'd need more complex parsing
    // For now, just check if it's in the daily notes folder
    return true;
  }

  /**
   * Force refresh the settings cache
   */
  public clearCache(): void {
    this.dailyNoteSettings = null;
    this.templateSettings = null;
    this.lastRead = null;
  }
}