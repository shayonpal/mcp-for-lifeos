import { LIFEOS_CONFIG } from './config.js';
import { basename } from 'path';

export class ObsidianLinks {
  /**
   * Generate an Obsidian URL for a note file
   * Format: obsidian://open?vault=VaultName&file=path/to/note
   */
  static generateNoteUrl(filePath: string): string {
    // Extract vault name from path - "LifeOS (iCloud)"
    const vaultName = 'LifeOS%20(iCloud)'; // URL encoded
    
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
    const vaultName = 'LifeOS%20(iCloud)';
    const encodedQuery = encodeURIComponent(query);
    return `obsidian://search?vault=${vaultName}&query=${encodedQuery}`;
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
   */
  private static extractNoteTitle(filePath: string): string {
    const filename = basename(filePath, '.md');
    
    // Handle daily notes (YYYY-MM-DD format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(filename)) {
      const date = new Date(filename);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    // Convert dashes/underscores to spaces and title case
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
   */
  static formatSearchResult(
    index: number, 
    title: string, 
    filePath: string, 
    contentType?: string | string[], 
    score?: number,
    additionalInfo?: string
  ): string {
    const obsidianLink = this.createClickableLink(filePath, title);
    const relativePath = filePath.replace(LIFEOS_CONFIG.vaultPath + '/', '');
    
    let result = `**${index}. ${title}**`;
    
    if (score) {
      result += ` (Score: ${score.toFixed(1)})`;
    }
    
    result += '\n';
    
    if (contentType) {
      const typeText = Array.isArray(contentType) ? contentType.join(', ') : contentType;
      result += `*${typeText}*\n`;
    }
    
    if (additionalInfo) {
      result += `${additionalInfo}\n`;
    }
    
    result += `\`${relativePath}\`\n`;
    result += `${obsidianLink}`;
    
    return result;
  }
}