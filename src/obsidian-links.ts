import { LIFEOS_CONFIG } from './config.js';
import { basename } from 'path';
import { parseISO, format } from 'date-fns';
import type { YAMLFrontmatter } from './types.js';

export class ObsidianLinks {
  /**
   * Generate an Obsidian URL for a note file
   * Format: obsidian://open?vault=VaultName&file=path/to/note
   */
  static generateNoteUrl(filePath: string): string {
    // Extract vault name from config path
    const vaultName = this.getVaultNameFromPath(LIFEOS_CONFIG.vaultPath);
    
    // Get relative path from vault root
    const relativePath = filePath.replace(LIFEOS_CONFIG.vaultPath + '/', '');
    
    // URL encode the file path
    const encodedPath = encodeURIComponent(relativePath);
    
    return `obsidian://open?vault=${vaultName}&file=${encodedPath}`;
  }

  /**
   * Generate an Obsidian URL for a specific heading in a note
   * Format: obsidian://open?vault=VaultName&file=path/to/note&heading=HeadingName
   */
  static generateHeadingUrl(filePath: string, heading: string): string {
    const baseUrl = this.generateNoteUrl(filePath);
    const encodedHeading = encodeURIComponent(heading);
    return `${baseUrl}&heading=${encodedHeading}`;
  }

  /**
   * Generate an Obsidian URL for searching within the vault
   * Format: obsidian://search?vault=VaultName&query=search+terms
   */
  static generateSearchUrl(query: string): string {
    const vaultName = this.getVaultNameFromPath(LIFEOS_CONFIG.vaultPath);
    const encodedQuery = encodeURIComponent(query);
    return `obsidian://search?vault=${vaultName}&query=${encodedQuery}`;
  }

  /**
   * Extract vault name from vault path and URL encode it
   */
  private static getVaultNameFromPath(vaultPath: string): string {
    // Extract the last part of the path (vault name)
    const parts = vaultPath.split('/');
    const vaultName = parts[parts.length - 1];
    return encodeURIComponent(vaultName);
  }

  /**
   * Create a markdown link that opens the note in Obsidian
   */
  static createMarkdownLink(filePath: string, title?: string): string {
    const url = this.generateNoteUrl(filePath);
    const linkText = title || this.extractNoteTitle(filePath);
    return `[${linkText}](${url})`;
  }

  /**
   * Create a clickable link for Claude Desktop (using markdown format)
   */
  static createClickableLink(filePath: string, title?: string): string {
    const url = this.generateNoteUrl(filePath);
    const linkText = title || this.extractNoteTitle(filePath);
    return `🔗 [Open in Obsidian: ${linkText}](${url})`;
  }

  /**
   * Extract a readable note title from file path
   *
   * @param filePath - Absolute or relative path to the note file
   * @param frontmatter - Optional YAML frontmatter object; if provided and contains 'title', that takes precedence
   * @returns Human-readable title string
   *
   * Priority for title extraction:
   * 1. Frontmatter title field (if provided and non-empty)
   * 2. Formatted date for daily notes (YYYY-MM-DD format)
   * 3. Formatted filename (spaces, title case)
   *
   * @example
   * // Daily note with frontmatter title
   * extractNoteTitle('/path/2025-08-30.md', { title: 'Custom Title' }) // → 'Custom Title'
   *
   * @example
   * // Daily note without frontmatter title (timezone fix applied)
   * extractNoteTitle('/path/2025-08-30.md') // → 'August 30, 2025'
   *
   * @example
   * // Regular note without frontmatter
   * extractNoteTitle('/path/my-project-note.md') // → 'My Project Note'
   *
   * @remarks
   * MCP-31 Fix: Uses parseISO() from date-fns instead of new Date() to prevent timezone
   * parsing bugs where UTC dates shift to previous day in negative offset timezones (EST, PST).
   * Example: File '2025-08-30.md' now correctly shows 'August 30, 2025' instead of 'August 29, 2025'
   */
  public static extractNoteTitle(filePath: string, frontmatter?: YAMLFrontmatter | Record<string, any>): string {
    // Priority 1: Check frontmatter title if provided
    if (frontmatter?.title && typeof frontmatter.title === 'string' && frontmatter.title.trim()) {
      return frontmatter.title;
    }

    const filename = basename(filePath, '.md');

    // Edge case: Handle empty filename (e.g., '/vault/.md' -> basename returns '.md')
    if (!filename || filename === '' || filename === '.md') {
      return '';
    }

    // Priority 2: Handle daily notes (YYYY-MM-DD format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(filename)) {
      // MCP-31 Timezone Fix: Use parseISO() instead of new Date() to prevent day shift
      // parseISO() parses as local date without timezone conversion
      // new Date(filename) creates UTC date at midnight, causing previous day in EST/PST
      const date = parseISO(filename);

      // Use date-fns format() for consistency with get_daily_note tool
      return format(date, 'MMMM dd, yyyy');
    }

    // Priority 3: Convert dashes/underscores to spaces and title case for regular notes
    return filename
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Generate a "Show in Obsidian" button/link
   */
  static createShowInObsidianButton(filePath: string): string {
    const url = this.generateNoteUrl(filePath);
    return `📝 [📋 Show in Obsidian](${url})`;
  }

  /**
   * Create both a relative path display and clickable link
   */
  static createPathWithLink(filePath: string, title?: string): string {
    const relativePath = filePath.replace(LIFEOS_CONFIG.vaultPath + '/', '');
    const clickableLink = this.createClickableLink(filePath, title);
    
    return `\`${relativePath}\`\n${clickableLink}`;
  }

  /**
   * Create a search result entry with Obsidian link
   *
   * @param tokenBudget - RESERVED for future use. Token budget tracking is handled
   *                      at the handler level (index.ts) for incremental consumption.
   *                      This parameter maintains API consistency for potential future
   *                      per-result budget validation. Currently unused.
   */
  static formatSearchResult(
    index: number,
    title: string,
    filePath: string,
    contentType?: string | string[],
    score?: number,
    additionalInfo?: string,
    format: 'concise' | 'detailed' = 'detailed',
    tokenBudget?: import('./response-truncator.js').ResponseTruncator
  ): string {
    const relativePath = filePath.replace(LIFEOS_CONFIG.vaultPath + '/', '');

    // Concise mode: title + path + clickable link (~50-100 tokens)
    if (format === 'concise') {
      const obsidianLink = this.createClickableLink(filePath, title);
      return `**${index}. ${title}** - \`${relativePath}\`\n${obsidianLink}`;
    }
    
    // Detailed mode: current behavior (full metadata)
    const obsidianLink = this.createClickableLink(filePath, title);
    
    let result = `**${index}. ${title}**`;
    
    if (score) {
      result += ` (Score: ${score.toFixed(1)})`;
    }
    
    result += '\\\n';
    
    if (contentType) {
      const typeText = Array.isArray(contentType) ? contentType.join(', ') : contentType;
      result += `*${typeText}*\\\n`;
    }
    
    if (additionalInfo) {
      result += `${additionalInfo}\\\n`;
    }
    
    result += `\`${relativePath}\`\\\n`;
    result += `${obsidianLink}`;
    
    return result;
  }

  /**
   * Format list results with type-specific formatting
   *
   * @param tokenBudget - RESERVED for future use. Token budget tracking is handled
   *                      at the handler level (index.ts) for incremental consumption.
   *                      This parameter maintains API consistency for potential future
   *                      per-result budget validation. Currently unused.
   */
  static formatListResult(
    items: string[] | any[] | Record<string, number>,
    listType: 'folders' | 'daily_notes' | 'templates' | 'yaml_properties',
    format: 'concise' | 'detailed' = 'detailed',
    tokenBudget?: import('./response-truncator.js').ResponseTruncator
  ): string {
    // Concise mode formatting
    if (format === 'concise') {
      switch (listType) {
        case 'folders':
        case 'daily_notes':
          // Already minimal (string arrays)
          return Array.isArray(items) ? items.join('\\\n') : '';
        
        case 'templates':
          // Return key + name only
          if (Array.isArray(items)) {
            return items.map((t: any) => `**${t.key}**: ${t.name}`).join('\\\n');
          }
          return '';
        
        case 'yaml_properties':
          // Return property names array
          if (typeof items === 'object' && !Array.isArray(items)) {
            return Object.keys(items).join('\\\n');
          }
          return '';
      }
    }
    
    // Detailed mode formatting
    switch (listType) {
      case 'folders':
      case 'daily_notes':
        return Array.isArray(items) ? items.join('\\\n') : '';
      
      case 'templates':
        if (Array.isArray(items)) {
          return items.map((template: any) => {
            let result = `**${template.key}**: ${template.name}\\\n`;
            if (template.description) {
              result += `  ${template.description}\\\n`;
            }
            if (template.path) {
              result += `  Path: \`${template.path}\`\\\n`;
            }
            if (template.targetFolder) {
              result += `  Target: ${template.targetFolder}\\\n`;
            }
            if (template.contentType) {
              result += `  Content Type: ${template.contentType}\\\n`;
            }
            return result;
          }).join('\\\n');
        }
        return '';
      
      case 'yaml_properties':
        if (typeof items === 'object' && !Array.isArray(items)) {
          return Object.entries(items)
            .map(([key, count]) => `**${key}**: ${count} notes`)
            .join('\\\n');
        }
        return '';
      
      default:
        return '';
    }
  }
}