import * as fs from 'fs/promises';
import * as path from 'path';
import { LifeOSConfig } from '../../types.js';

export class YamlRulesManager {
  private config: LifeOSConfig;
  private cachedRules: string | null = null;
  private lastModified: number = 0;

  constructor(config: LifeOSConfig) {
    this.config = config;
  }

  isConfigured(): boolean {
    return Boolean(this.config.yamlRulesPath);
  }

  async validateRulesFile(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const stats = await fs.stat(this.config.yamlRulesPath!);
      return stats.isFile();
    } catch (error) {
      return false;
    }
  }

  async getRules(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('YAML rules path not configured');
    }

    const rulesPath = this.config.yamlRulesPath!;

    try {
      // Check if we need to refresh cache
      const stats = await fs.stat(rulesPath);
      const currentModified = stats.mtimeMs;

      if (this.cachedRules === null || currentModified > this.lastModified) {
        this.cachedRules = await fs.readFile(rulesPath, 'utf-8');
        this.lastModified = currentModified;
      }

      return this.cachedRules;
    } catch (error) {
      throw new Error(`Failed to read YAML rules file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getInstructionText(): string {
    if (!this.isConfigured()) {
      return '';
    }
    
    return 'Consult the YAML rules document via get_yaml_rules tool before modifying frontmatter.';
  }

  getRulesPath(): string | undefined {
    return this.config.yamlRulesPath;
  }
}