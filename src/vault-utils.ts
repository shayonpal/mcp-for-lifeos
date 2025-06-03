import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, renameSync, mkdirSync, rmSync } from 'fs';
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

  static updateNote(
    filePath: string,
    updates: {
      frontmatter?: Partial<YAMLFrontmatter>;
      content?: string;
      mode?: 'replace' | 'merge';
    }
  ): LifeOSNote {
    // Check if note exists
    if (!existsSync(filePath)) {
      throw new Error(`Note not found: ${filePath}`);
    }

    // Read existing note
    const existingNote = this.readNote(filePath);
    
    // Prepare updated note
    const updatedNote: LifeOSNote = {
      ...existingNote,
      modified: new Date()
    };

    // Update content if provided
    if (updates.content !== undefined) {
      updatedNote.content = updates.content;
    }

    // Update frontmatter
    if (updates.frontmatter) {
      if (updates.mode === 'replace') {
        // Replace mode: completely replace frontmatter (but preserve auto-managed fields)
        const preservedFields: any = {};
        YAML_RULES.AUTO_MANAGED_FIELDS.forEach(field => {
          if (existingNote.frontmatter[field]) {
            preservedFields[field] = existingNote.frontmatter[field];
          }
        });
        
        updatedNote.frontmatter = {
          ...this.sanitizeFrontmatter(updates.frontmatter),
          ...preservedFields
        };
      } else {
        // Merge mode (default): merge with existing frontmatter
        // First, validate only the new fields being added
        this.validateYAML(updates.frontmatter);
        
        updatedNote.frontmatter = {
          ...existingNote.frontmatter,
          ...updates.frontmatter
        };
        
        // Ensure we never modify auto-managed fields
        YAML_RULES.AUTO_MANAGED_FIELDS.forEach(field => {
          if (existingNote.frontmatter[field]) {
            updatedNote.frontmatter[field] = existingNote.frontmatter[field];
          }
        });
      }
    }

    // Write without re-validating (since we've already validated the changes)
    const frontmatterToWrite = { ...updatedNote.frontmatter };
    
    // Remove auto-managed fields before writing (they'll be preserved by the linter)
    YAML_RULES.AUTO_MANAGED_FIELDS.forEach(field => {
      delete frontmatterToWrite[field];
    });

    const fileContent = matter.stringify(updatedNote.content, frontmatterToWrite);
    writeFileSync(updatedNote.path, fileContent, 'utf-8');
    
    return updatedNote;
  }

  /**
   * Find where a section ends (before the next heading of same or higher level)
   */
  private static findSectionEnd(lines: string[], headingIndex: number, headingLevel: number): number {
    // Start from the line after the heading
    for (let i = headingIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this is a heading
      const headingMatch = line.match(/^(#{1,6})\s+/);
      if (headingMatch) {
        const nextHeadingLevel = headingMatch[1].length;
        // If we found a heading of same or higher level (fewer #), section ends here
        if (nextHeadingLevel <= headingLevel) {
          // Return the line before this heading, but skip empty lines
          let endIndex = i - 1;
          while (endIndex > headingIndex && lines[endIndex].trim() === '') {
            endIndex--;
          }
          return endIndex;
        }
      }
    }
    
    // If no next heading found, section goes to end of file
    // Skip trailing empty lines
    let endIndex = lines.length - 1;
    while (endIndex > headingIndex && lines[endIndex].trim() === '') {
      endIndex--;
    }
    return endIndex;
  }

  /**
   * Detect if content appears to be a list item
   */
  private static isListItem(content: string): boolean {
    const trimmed = content.trim();
    // Check for unordered list markers (-, *, +)
    if (/^[-*+]\s+/.test(trimmed)) return true;
    // Check for ordered list markers (1., 2., etc.)
    if (/^\d+\.\s+/.test(trimmed)) return true;
    // Check for task list markers
    if (/^[-*+]\s+\[[ x]\]/i.test(trimmed)) return true;
    return false;
  }

  /**
   * Find the last item in a list starting from a given line
   */
  private static findLastListItem(lines: string[], startIndex: number): number {
    let lastListIndex = startIndex;
    
    // Skip empty lines after the starting point
    let i = startIndex + 1;
    while (i < lines.length && lines[i].trim() === '') {
      i++;
    }
    
    // Continue while we find list items
    while (i < lines.length) {
      const line = lines[i].trim();
      if (line === '') {
        // Empty line might be within the list, check next non-empty line
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === '') {
          j++;
        }
        if (j < lines.length && this.isListItem(lines[j])) {
          // Continue through the empty lines
          i = j;
          lastListIndex = j;
        } else {
          // Double empty line or non-list content, list ends
          break;
        }
      } else if (this.isListItem(line)) {
        lastListIndex = i;
        i++;
      } else {
        // Non-list content, list ends
        break;
      }
    }
    
    return lastListIndex;
  }

  static insertContent(
    filePath: string,
    content: string,
    target: {
      heading?: string;
      blockRef?: string;
      pattern?: string;
      lineNumber?: number;
    },
    position: 'before' | 'after' | 'append' | 'prepend' | 'end-of-section' = 'after',
    ensureNewline: boolean = true
  ): LifeOSNote {
    // Check if note exists
    if (!existsSync(filePath)) {
      throw new Error(`Note not found: ${filePath}`);
    }

    // Read existing note
    const existingNote = this.readNote(filePath);
    const lines = existingNote.content.split('\n');
    
    // Find target line index
    let targetLineIndex = -1;
    let endOfSectionIndex = -1;
    
    if (target.lineNumber) {
      // Direct line number (convert from 1-based to 0-based)
      targetLineIndex = target.lineNumber - 1;
      if (targetLineIndex < 0 || targetLineIndex >= lines.length) {
        throw new Error(`Line number ${target.lineNumber} is out of range (1-${lines.length})`);
      }
    } else if (target.heading) {
      // Find heading - exact match (ignore leading/trailing whitespace)
      const headingToFind = target.heading.trim();
      targetLineIndex = lines.findIndex(line => {
        const trimmedLine = line.trim();
        // Match markdown headings (# to ######)
        return /^#{1,6}\s+/.test(trimmedLine) && 
               trimmedLine.replace(/^#{1,6}\s+/, '').trim() === headingToFind.replace(/^#{1,6}\s+/, '').trim();
      });
      
      if (targetLineIndex === -1) {
        throw new Error(`Heading not found: ${target.heading}`);
      }
      
      // For end-of-section, find where this section ends
      if (position === 'end-of-section') {
        const headingLevel = lines[targetLineIndex].match(/^#+/)?.[0].length || 1;
        endOfSectionIndex = this.findSectionEnd(lines, targetLineIndex, headingLevel);
      }
    } else if (target.blockRef) {
      // Find block reference - look for ^blockId at end of lines
      const blockId = target.blockRef.startsWith('^') ? target.blockRef : `^${target.blockRef}`;
      targetLineIndex = lines.findIndex(line => line.trim().endsWith(blockId));
      
      if (targetLineIndex === -1) {
        throw new Error(`Block reference not found: ${target.blockRef}`);
      }
    } else if (target.pattern) {
      // Find text pattern
      targetLineIndex = lines.findIndex(line => line.includes(target.pattern!));
      
      if (targetLineIndex === -1) {
        throw new Error(`Pattern not found: ${target.pattern}`);
      }
    } else {
      throw new Error('No valid target specified');
    }

    // Handle end-of-section positioning
    let actualPosition = position;
    if (position === 'end-of-section') {
      // end-of-section only makes sense for heading targets
      if (!target.heading) {
        // For non-heading targets, convert to 'after' for simplicity and clarity
        actualPosition = 'after';
      } else {
        // For heading targets, we should have endOfSectionIndex set
        if (endOfSectionIndex === -1) {
          throw new Error(`Cannot find section end for heading target. Target: ${JSON.stringify(target)}, targetLineIndex: ${targetLineIndex}`);
        }
        
        // Validate endOfSectionIndex is within bounds
        if (endOfSectionIndex >= lines.length) {
          endOfSectionIndex = lines.length - 1;
        }
        if (endOfSectionIndex < targetLineIndex) {
          endOfSectionIndex = targetLineIndex;
        }
        
        // Check if we're inserting into a list context
        const isInsertingListItem = this.isListItem(content);
        
        // Look for existing list in the section
        let insertIndex = endOfSectionIndex;
        if (isInsertingListItem) {
          // Find the last list item in the section
          for (let i = targetLineIndex + 1; i <= endOfSectionIndex && i < lines.length; i++) {
            if (this.isListItem(lines[i])) {
              insertIndex = this.findLastListItem(lines, i);
              break;
            }
          }
        }
        
        // Validate insertIndex
        if (insertIndex >= lines.length) {
          insertIndex = lines.length - 1;
        }
        if (insertIndex < 0) {
          insertIndex = 0;
        }
        
        // Update target for insertion
        targetLineIndex = insertIndex;
        actualPosition = 'after'; // Treat as 'after' the last relevant line
      }
    }
    
    // Prepare content to insert
    let contentToInsert = content;
    
    // Smart spacing for list continuation
    if (actualPosition === 'after' && targetLineIndex >= 0) {
      const targetLine = lines[targetLineIndex];
      const isTargetList = this.isListItem(targetLine);
      const isContentList = this.isListItem(content);
      
      // If both target and content are list items, minimal spacing
      if (isTargetList && isContentList) {
        ensureNewline = false; // Override to prevent extra spacing
      }
    }
    
    if (ensureNewline && (actualPosition === 'before' || actualPosition === 'after')) {
      // Smart newline handling - check context
      if (actualPosition === 'after') {
        // Check if there's already a blank line after the target
        const hasBlankLineAfter = targetLineIndex < lines.length - 1 && lines[targetLineIndex + 1].trim() === '';
        
        // Add leading newline only if content doesn't start with one
        if (!contentToInsert.startsWith('\n')) {
          contentToInsert = '\n' + contentToInsert;
        }
        
        // Add trailing newline only if there isn't already a blank line and content doesn't end with newline
        if (!hasBlankLineAfter && !contentToInsert.endsWith('\n')) {
          contentToInsert = contentToInsert + '\n';
        }
      } else if (actualPosition === 'before') {
        // Check if there's already a blank line before the target
        const hasBlankLineBefore = targetLineIndex > 0 && lines[targetLineIndex - 1].trim() === '';
        
        // Add leading newline only if there isn't already a blank line and content doesn't start with newline
        if (!hasBlankLineBefore && !contentToInsert.startsWith('\n')) {
          contentToInsert = '\n' + contentToInsert;
        }
        
        // Add trailing newline only if content doesn't end with one
        if (!contentToInsert.endsWith('\n')) {
          contentToInsert = contentToInsert + '\n';
        }
      }
    }

    // Insert content based on position
    let newLines: string[] = [];
    
    // Validate targetLineIndex
    if (targetLineIndex < 0 || targetLineIndex >= lines.length) {
      throw new Error(`Invalid targetLineIndex: ${targetLineIndex}, lines.length: ${lines.length}, position: ${position}, actualPosition: ${actualPosition}`);
    }
    
    switch (actualPosition) {
      case 'before':
        newLines = [
          ...lines.slice(0, targetLineIndex),
          ...contentToInsert.split('\n'),
          ...lines.slice(targetLineIndex)
        ];
        break;
      
      case 'after':
        newLines = [
          ...lines.slice(0, targetLineIndex + 1),
          ...contentToInsert.split('\n'),
          ...lines.slice(targetLineIndex + 1)
        ];
        break;
      
      case 'prepend':
        // Prepend to the beginning of the target line
        newLines = [...lines];
        newLines[targetLineIndex] = contentToInsert + lines[targetLineIndex];
        break;
      
      case 'append':
        // Append to the end of the target line
        newLines = [...lines];
        newLines[targetLineIndex] = lines[targetLineIndex] + contentToInsert;
        break;
        
      case 'end-of-section':
        // This should never happen as we convert to 'after' above
        throw new Error('end-of-section should have been converted to after');
        
      default:
        throw new Error(`Invalid position: ${actualPosition}`);
    }

    // Update the note with new content
    // Validate newLines before proceeding
    if (!newLines || !Array.isArray(newLines)) {
      throw new Error(`Failed to generate new content. Position: ${position}, actualPosition: ${actualPosition}, targetLineIndex: ${targetLineIndex}, newLines: ${typeof newLines}`);
    }
    
    // Validate all elements in the array are strings
    if (!newLines.every(line => typeof line === 'string')) {
      throw new Error(`newLines contains non-string elements. Elements: ${newLines.map(line => typeof line).join(', ')}`);
    }
    
    // Clone the array to prevent race conditions in concurrent calls
    const safeLines = [...newLines];
    
    // Additional validation of safeLines
    if (!safeLines || !Array.isArray(safeLines)) {
      throw new Error(`Array cloning failed. safeLines: ${typeof safeLines}, newLines: ${typeof newLines}`);
    }
    
    // Final validation before join operation
    if (safeLines.length === 0) {
      throw new Error(`Empty array after processing. Original newLines length: ${newLines.length}`);
    }
    
    // Defensive check: ensure all elements are still strings after cloning
    if (!safeLines.every(line => typeof line === 'string')) {
      throw new Error(`safeLines contains non-string elements after cloning. Elements: ${safeLines.map(line => typeof line).join(', ')}`);
    }
    
    const contentToWrite = safeLines.join('\n');
    
    return this.updateNote(filePath, {
      content: contentToWrite
    });
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
    
    // Looking for daily note
    
    if (existsSync(filePath)) {
      // Found daily note
      return this.readNote(filePath);
    } else {
      // Daily note not found - this is normal, return null
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

  static moveItem(sourcePath: string, destinationFolder: string, options: {
    createDestination?: boolean;
    overwrite?: boolean;
    mergeFolders?: boolean;
  } = {}): { success: boolean; newPath: string; error?: string } {
    // Normalize paths
    const normalizedSource = sourcePath.startsWith(LIFEOS_CONFIG.vaultPath) 
      ? sourcePath 
      : join(LIFEOS_CONFIG.vaultPath, sourcePath);
    const normalizedDest = destinationFolder.startsWith(LIFEOS_CONFIG.vaultPath)
      ? destinationFolder
      : join(LIFEOS_CONFIG.vaultPath, destinationFolder);

    // Validate source exists
    if (!existsSync(normalizedSource)) {
      return { success: false, newPath: '', error: 'Source item not found' };
    }

    // Check if source is file or folder
    const isDirectory = statSync(normalizedSource).isDirectory();
    
    // Prevent moving folder into itself or its subdirectories
    if (isDirectory && normalizedDest.startsWith(normalizedSource)) {
      return { success: false, newPath: '', error: 'Cannot move folder into itself or its subdirectories' };
    }

    // Create destination if needed
    if (!existsSync(normalizedDest)) {
      if (options.createDestination) {
        mkdirSync(normalizedDest, { recursive: true });
      } else {
        return { success: false, newPath: '', error: 'Destination folder does not exist' };
      }
    }

    // Ensure destination is a directory
    if (!statSync(normalizedDest).isDirectory()) {
      return { success: false, newPath: '', error: 'Destination must be a folder' };
    }

    const itemName = basename(normalizedSource);
    const newPath = join(normalizedDest, itemName);

    // Handle existing items
    if (existsSync(newPath)) {
      if (isDirectory && options.mergeFolders) {
        // Merge folder contents
        return this.mergeFolders(normalizedSource, newPath);
      } else if (!options.overwrite) {
        return { success: false, newPath: '', error: 'Item already exists in destination' };
      } else if (!isDirectory) {
        // For files with overwrite=true, remove the existing file first
        rmSync(newPath);
      } else {
        // For directories with overwrite=true but mergeFolders=false, remove existing directory
        rmSync(newPath, { recursive: true });
      }
    }

    try {
      renameSync(normalizedSource, newPath);
      return { success: true, newPath };
    } catch (error) {
      return { success: false, newPath: '', error: String(error) };
    }
  }

  private static mergeFolders(source: string, destination: string): { success: boolean; newPath: string; error?: string } {
    try {
      const items = readdirSync(source, { withFileTypes: true });
      
      for (const item of items) {
        const sourcePath = join(source, item.name);
        const destPath = join(destination, item.name);
        
        if (item.isDirectory()) {
          if (existsSync(destPath)) {
            // Recursively merge subdirectories
            const result = this.mergeFolders(sourcePath, destPath);
            if (!result.success) {
              return result;
            }
          } else {
            // Move the subdirectory
            renameSync(sourcePath, destPath);
          }
        } else {
          // Move the file (overwriting if exists)
          if (existsSync(destPath)) {
            rmSync(destPath);
          }
          renameSync(sourcePath, destPath);
        }
      }
      
      // Remove the now-empty source directory
      rmSync(source, { recursive: true });
      return { success: true, newPath: destination };
    } catch (error) {
      return { success: false, newPath: '', error: `Failed to merge folders: ${String(error)}` };
    }
  }
}