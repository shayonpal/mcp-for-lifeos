import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';
import { format } from 'date-fns';
import { LifeOSNote, YAMLFrontmatter, SearchOptions, NoteTemplate } from './types.js';
import { LIFEOS_CONFIG, YAML_RULES } from './config.js';

export class VaultUtils {
  /**
   * Get the current local date at midnight (start of day).
   * This ensures consistent date handling regardless of timezone.
   */
  static getLocalDate(dateInput?: Date | string): Date {
    let date: Date;
    
    if (!dateInput) {
      // If no date provided, use current local date
      date = new Date();
    } else if (typeof dateInput === 'string') {
      // If string provided (like "2024-05-28"), parse it as local date
      // Add time component to ensure it's interpreted as local midnight
      if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = new Date(dateInput + 'T00:00:00');
      } else {
        date = new Date(dateInput);
      }
    } else {
      date = dateInput;
    }
    
    // Reset to start of day in local timezone
    const localDate = new Date(date);
    localDate.setHours(0, 0, 0, 0);
    return localDate;
  }

  static async findNotes(pattern: string = '**/*.md'): Promise<string[]> {
    const searchPath = join(LIFEOS_CONFIG.vaultPath, pattern);
    return await glob(searchPath, { 
      ignore: ['**/node_modules/**', '**/.*']
    });
  }

  static readNote(filePath: string): LifeOSNote {
    // Normalize the path to handle spaces and special characters
    const normalizedPath = filePath.replace(/\\ /g, ' ');
    
    if (!existsSync(normalizedPath)) {
      throw new Error(`Note not found: ${normalizedPath}`);
    }

    try {
      const content = readFileSync(normalizedPath, 'utf-8');
      const parsed = matter(content);
      const stats = statSync(normalizedPath);

      return {
        path: normalizedPath,
        frontmatter: parsed.data as YAMLFrontmatter,
        content: parsed.content,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      console.error(`Error parsing note ${normalizedPath}:`, error);
      // Return note with empty frontmatter if parsing fails
      const content = readFileSync(normalizedPath, 'utf-8');
      const stats = statSync(normalizedPath);
      
      return {
        path: normalizedPath,
        frontmatter: { title: basename(normalizedPath, '.md') },
        content: content,
        created: stats.birthtime,
        modified: stats.mtime
      };
    }
  }

  static writeNote(note: LifeOSNote): void {
    // Validate YAML compliance before writing
    this.validateYAML(note.frontmatter);
    
    const frontmatterToWrite = { ...note.frontmatter };
    
    // Remove auto-managed fields if they exist
    YAML_RULES.AUTO_MANAGED_FIELDS.forEach(field => {
      delete frontmatterToWrite[field];
    });

    const fileContent = matter.stringify(note.content, frontmatterToWrite);
    writeFileSync(note.path, fileContent, 'utf-8');
  }

  static createNote(
    fileName: string, 
    frontmatter: YAMLFrontmatter, 
    content: string = '',
    targetFolder?: string
  ): LifeOSNote {
    let folderPath: string;
    
    if (targetFolder) {
      folderPath = join(LIFEOS_CONFIG.vaultPath, targetFolder);
    } else {
      // Determine folder based on content type
      folderPath = this.determineFolderFromContentType(frontmatter['content type']);
    }

    if (!existsSync(folderPath)) {
      throw new Error(`Target folder does not exist: ${folderPath}`);
    }

    const filePath = join(folderPath, `${fileName}.md`);
    
    if (existsSync(filePath)) {
      throw new Error(`Note already exists: ${filePath}`);
    }

    const note: LifeOSNote = {
      path: filePath,
      frontmatter: this.sanitizeFrontmatter(frontmatter),
      content,
      created: new Date(),
      modified: new Date()
    };

    this.writeNote(note);
    return note;
  }

  static searchNotes(options: SearchOptions): LifeOSNote[] {
    const allNotes = this.getAllNotes();
    
    return allNotes.filter(note => {
      if (options.contentType) {
        const noteContentType = note.frontmatter['content type'];
        if (Array.isArray(options.contentType)) {
          if (!options.contentType.some(ct => this.matchesContentType(noteContentType, ct))) {
            return false;
          }
        } else {
          if (!this.matchesContentType(noteContentType, options.contentType)) {
            return false;
          }
        }
      }

      if (options.category && note.frontmatter.category !== options.category) {
        return false;
      }

      if (options.tags && !this.hasAnyTag(note.frontmatter.tags, options.tags)) {
        return false;
      }

      if (options.folder && !note.path.includes(options.folder)) {
        return false;
      }

      if (options.dateRange) {
        if (options.dateRange.start && note.created < options.dateRange.start) {
          return false;
        }
        if (options.dateRange.end && note.created > options.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  static async getDailyNote(date: Date): Promise<LifeOSNote | null> {
    // Ensure we're working with local date at start of day
    const localDate = this.getLocalDate(date);
    const dateStr = format(localDate, 'yyyy-MM-dd');
    const fileName = `${dateStr}.md`;
    const filePath = join(LIFEOS_CONFIG.dailyNotesPath, fileName);
    
    console.error(`Looking for daily note at: ${filePath}`);
    console.error(`Input date: ${date.toISOString()}, Local date: ${localDate.toISOString()}, Formatted: ${dateStr}`);
    
    if (existsSync(filePath)) {
      console.error(`Found daily note at: ${filePath}`);
      return this.readNote(filePath);
    } else {
      console.error(`Daily note not found at: ${filePath}`);
      // Try to list files in the directory for debugging
      try {
        const files = readdirSync(LIFEOS_CONFIG.dailyNotesPath);
        console.error(`Files in daily notes directory: ${files.filter(f => f.includes(dateStr)).join(', ')}`);
      } catch (e) {
        console.error(`Error reading daily notes directory: ${e}`);
      }
    }
    
    return null;
  }

  static createDailyNote(date: Date): LifeOSNote {
    // Ensure we're working with local date at start of day
    const localDate = this.getLocalDate(date);
    const dateStr = format(localDate, 'yyyy-MM-dd');
    const dateDisplay = format(localDate, 'MMMM dd, yyyy');
    
    const frontmatter: YAMLFrontmatter = {
      aliases: [dateDisplay],
      'content type': 'Daily Note',
      tags: ['dailyNote']
    };

    const content = `# ${dateDisplay}\n\n## Today's Focus\n\n\n## Notes\n\n\n## Reflections\n\n`;

    return this.createNote(dateStr, frontmatter, content, '20 - Areas/21 - Myself/Journals/Daily');
  }

  private static getAllNotes(): LifeOSNote[] {
    const pattern = join(LIFEOS_CONFIG.vaultPath, '**/*.md');
    const files = glob.sync(pattern, { ignore: ['**/node_modules/**', '**/.*'] });
    
    return files.map(file => this.readNote(file));
  }

  private static matchesContentType(noteType: string | string[] | undefined, searchType: string): boolean {
    if (!noteType) return false;
    
    if (Array.isArray(noteType)) {
      return noteType.includes(searchType);
    }
    
    return noteType === searchType;
  }

  private static hasAnyTag(noteTags: string[] | undefined, searchTags: string[]): boolean {
    if (!noteTags || !Array.isArray(noteTags)) return false;
    return searchTags.some(tag => noteTags.includes(tag));
  }

  static normalizeTagsToArray(tags: any): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') return [tags];
    return [];
  }

  private static validateYAML(frontmatter: YAMLFrontmatter): void {
    // Check for forbidden fields
    YAML_RULES.AUTO_MANAGED_FIELDS.forEach(field => {
      if (frontmatter[field]) {
        throw new Error(`Cannot manually set auto-managed field: ${field}`);
      }
    });

    // Validate URL field naming
    if (frontmatter.url || frontmatter.URL) {
      throw new Error(`Use '${YAML_RULES.URL_FIELD}' instead of 'url' or 'URL'`);
    }

    // Validate location format
    if (frontmatter.country) {
      const validCountries = Object.values(YAML_RULES.LOCATION_FORMAT);
      if (!validCountries.includes(frontmatter.country)) {
        throw new Error(`Country must be in format: ${validCountries.join(' or ')}`);
      }
    }
  }

  private static sanitizeFrontmatter(frontmatter: YAMLFrontmatter): YAMLFrontmatter {
    const sanitized = { ...frontmatter };
    
    // Remove auto-managed fields
    YAML_RULES.AUTO_MANAGED_FIELDS.forEach(field => {
      delete sanitized[field];
    });

    // Fix common issues
    if (sanitized.url) {
      sanitized.source = sanitized.url;
      delete sanitized.url;
    }
    
    if (sanitized.URL) {
      sanitized.source = sanitized.URL;
      delete sanitized.URL;
    }

    return sanitized;
  }

  private static determineFolderFromContentType(contentType: string | string[] | undefined): string {
    if (!contentType) {
      return join(LIFEOS_CONFIG.vaultPath, '05 - Fleeting Notes');
    }

    const type = Array.isArray(contentType) ? contentType[0] : contentType;
    
    switch (type) {
      case 'Daily Note':
        return join(LIFEOS_CONFIG.vaultPath, '20 - Areas/21 - Myself/Journals/Daily');
      case 'Article':
      case 'Reference':
        return join(LIFEOS_CONFIG.vaultPath, '30 - Resources');
      case 'Recipe':
        return join(LIFEOS_CONFIG.vaultPath, '30 - Resources');
      case 'Medical':
        return join(LIFEOS_CONFIG.vaultPath, '20 - Areas/23 - Health');
      case 'Planning':
        return join(LIFEOS_CONFIG.vaultPath, '10 - Projects');
      default:
        return join(LIFEOS_CONFIG.vaultPath, '05 - Fleeting Notes');
    }
  }
}