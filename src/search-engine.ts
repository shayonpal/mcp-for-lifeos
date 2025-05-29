import { readFileSync } from 'fs';
import { LifeOSNote, YAMLFrontmatter, SearchOptions } from './types.js';
import { VaultUtils } from './vault-utils.js';

export interface AdvancedSearchOptions {
  // Text search
  query?: string;
  contentQuery?: string;
  titleQuery?: string;
  
  // Metadata filters
  contentType?: string | string[];
  category?: string;
  subCategory?: string;
  tags?: string[];
  author?: string[];
  people?: string[];
  
  // Date filters
  createdAfter?: Date;
  createdBefore?: Date;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  
  // Location filters
  folder?: string;
  excludeFolders?: string[];
  
  // Advanced options
  caseSensitive?: boolean;
  useRegex?: boolean;
  includeContent?: boolean;
  maxResults?: number;
  sortBy?: 'relevance' | 'created' | 'modified' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  note: LifeOSNote;
  score: number;
  matches: SearchMatch[];
}

export interface SearchMatch {
  type: 'title' | 'content' | 'frontmatter';
  field?: string;
  text: string;
  context: string;
  position: number;
  length: number;
}

export class SearchEngine {
  private static normalizeText(text: string, caseSensitive: boolean = false): string {
    return caseSensitive ? text : text.toLowerCase();
  }

  private static createRegex(query: string, caseSensitive: boolean = false, useRegex: boolean = false): RegExp {
    if (useRegex) {
      return new RegExp(query, caseSensitive ? 'g' : 'gi');
    }
    
    // Escape special regex characters for literal search
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, caseSensitive ? 'g' : 'gi');
  }

  private static extractContext(text: string, position: number, contextSize: number = 100): string {
    const start = Math.max(0, position - contextSize);
    const end = Math.min(text.length, position + contextSize);
    
    let context = text.substring(start, end);
    
    // Add ellipsis if truncated
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    
    return context.trim();
  }

  private static findMatches(
    text: string, 
    query: string, 
    type: SearchMatch['type'], 
    field?: string,
    caseSensitive: boolean = false,
    useRegex: boolean = false
  ): SearchMatch[] {
    if (!query || !text) return [];

    const regex = this.createRegex(query, caseSensitive, useRegex);
    const matches: SearchMatch[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        type,
        field,
        text: match[0],
        context: this.extractContext(text, match.index),
        position: match.index,
        length: match[0].length
      });

      // Prevent infinite loop with global regex
      if (!regex.global) break;
    }

    return matches;
  }

  private static matchesMetadataFilter(note: LifeOSNote, options: AdvancedSearchOptions): boolean {
    const fm = note.frontmatter;

    // Content type filter
    if (options.contentType) {
      const noteContentType = fm['content type'];
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

    // Category filters
    if (options.category && fm.category !== options.category) return false;
    if (options.subCategory && fm['sub-category'] !== options.subCategory) return false;

    // Tags filter - handle OR operations
    if (options.tags && options.tags.length > 0) {
      if (!fm.tags || !Array.isArray(fm.tags)) return false;
      // Check if any of the specified tags match any of the note's tags
      const hasMatchingTag = options.tags.some(tag => 
        fm.tags!.some(noteTag => 
          noteTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
      if (!hasMatchingTag) return false;
    }

    // Author filter
    if (options.author && options.author.length > 0) {
      if (!fm.author || !Array.isArray(fm.author)) return false;
      if (!options.author.some(author => fm.author!.includes(author))) return false;
    }

    // People filter
    if (options.people && options.people.length > 0) {
      if (!fm.people || !Array.isArray(fm.people)) return false;
      if (!options.people.some(person => fm.people!.includes(person))) return false;
    }

    return true;
  }

  private static matchesContentType(noteType: string | string[] | undefined, searchType: string): boolean {
    if (!noteType) return false;
    
    if (Array.isArray(noteType)) {
      return noteType.includes(searchType);
    }
    
    return noteType === searchType;
  }

  private static matchesDateFilter(note: LifeOSNote, options: AdvancedSearchOptions): boolean {
    // Created date filters
    if (options.createdAfter && note.created < options.createdAfter) return false;
    if (options.createdBefore && note.created > options.createdBefore) return false;

    // Modified date filters  
    if (options.modifiedAfter && note.modified < options.modifiedAfter) return false;
    if (options.modifiedBefore && note.modified > options.modifiedBefore) return false;

    return true;
  }

  private static matchesFolderFilter(note: LifeOSNote, options: AdvancedSearchOptions): boolean {
    // Folder inclusion filter
    if (options.folder && !note.path.includes(options.folder)) return false;

    // Folder exclusion filter
    if (options.excludeFolders && options.excludeFolders.length > 0) {
      if (options.excludeFolders.some(folder => note.path.includes(folder))) return false;
    }

    return true;
  }

  private static calculateRelevanceScore(note: LifeOSNote, matches: SearchMatch[], options: AdvancedSearchOptions): number {
    let score = 0;

    // Base score for having matches
    if (matches.length > 0) score += 10;

    // Weight different match types
    matches.forEach(match => {
      switch (match.type) {
        case 'title':
          score += 5; // Title matches are most important
          break;
        case 'frontmatter':
          score += 3; // Metadata matches are moderately important
          break;
        case 'content':
          score += 1; // Content matches are least important
          break;
      }
    });

    // Boost score for exact matches
    matches.forEach(match => {
      if (options.query && match.text.toLowerCase() === options.query.toLowerCase()) {
        score += 5;
      }
    });

    // Recency boost (newer notes get slight boost)
    const daysSinceModified = (Date.now() - note.modified.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 30) score += 2;
    if (daysSinceModified < 7) score += 1;

    return score;
  }

  static async search(options: AdvancedSearchOptions): Promise<SearchResult[]> {
    const allNotes = await this.getAllNotes();
    const results: SearchResult[] = [];

    for (const note of allNotes) {
      // Apply filters first
      if (!this.matchesMetadataFilter(note, options)) continue;
      if (!this.matchesDateFilter(note, options)) continue;
      if (!this.matchesFolderFilter(note, options)) continue;

      // Find text matches
      const matches: SearchMatch[] = [];

      // Search in title
      if (options.query || options.titleQuery) {
        const titleQuery = options.titleQuery || options.query!;
        
        // Search in multiple title-related fields
        const titleSources: string[] = [];
        
        // 1. Use frontmatter title if available
        if (note.frontmatter.title) {
          titleSources.push(note.frontmatter.title);
        }
        
        // 2. Always include filename without extension
        const pathParts = note.path.split('/');
        const filename = pathParts[pathParts.length - 1];
        const filenameWithoutExt = filename.replace(/\.md$/, '');
        titleSources.push(filenameWithoutExt);
        
        // 3. Check aliases
        if (note.frontmatter.aliases) {
          const aliases = Array.isArray(note.frontmatter.aliases) 
            ? note.frontmatter.aliases 
            : [note.frontmatter.aliases];
          titleSources.push(...aliases.filter(a => typeof a === 'string'));
        }
        
        // Search in all title sources
        for (const titleSource of titleSources) {
          matches.push(...this.findMatches(
            titleSource, 
            titleQuery, 
            'title', 
            undefined,
            options.caseSensitive,
            options.useRegex
          ));
        }
      }

      // Search in content
      if ((options.query || options.contentQuery) && options.includeContent !== false) {
        const contentQuery = options.contentQuery || options.query!;
        matches.push(...this.findMatches(
          note.content, 
          contentQuery, 
          'content',
          undefined,
          options.caseSensitive,
          options.useRegex
        ));
      }

      // Search in frontmatter fields
      if (options.query) {
        Object.entries(note.frontmatter).forEach(([key, value]) => {
          if (typeof value === 'string') {
            matches.push(...this.findMatches(
              value, 
              options.query!, 
              'frontmatter', 
              key,
              options.caseSensitive,
              options.useRegex
            ));
          } else if (Array.isArray(value)) {
            value.forEach(item => {
              if (typeof item === 'string') {
                matches.push(...this.findMatches(
                  item, 
                  options.query!, 
                  'frontmatter', 
                  key,
                  options.caseSensitive,
                  options.useRegex
                ));
              }
            });
          }
        });
      }

      // If we have query terms but no matches, skip this note
      if ((options.query || options.titleQuery || options.contentQuery) && matches.length === 0) {
        continue;
      }

      // Calculate relevance score
      const score = this.calculateRelevanceScore(note, matches, options);

      results.push({
        note,
        score,
        matches
      });
    }

    // Sort results
    results.sort((a, b) => {
      switch (options.sortBy) {
        case 'created':
          const createdOrder = options.sortOrder === 'asc' ? 1 : -1;
          return createdOrder * (a.note.created.getTime() - b.note.created.getTime());
        
        case 'modified':
          const modifiedOrder = options.sortOrder === 'asc' ? 1 : -1;
          return modifiedOrder * (a.note.modified.getTime() - b.note.modified.getTime());
        
        case 'title':
          const titleOrder = options.sortOrder === 'asc' ? 1 : -1;
          const titleA = a.note.frontmatter.title || '';
          const titleB = b.note.frontmatter.title || '';
          return titleOrder * titleA.localeCompare(titleB);
        
        case 'relevance':
        default:
          return b.score - a.score; // Higher scores first
      }
    });

    // Apply limit
    if (options.maxResults) {
      return results.slice(0, options.maxResults);
    }

    return results;
  }

  private static async getAllNotes(): Promise<LifeOSNote[]> {
    const files = await VaultUtils.findNotes('**/*.md');
    const notes: LifeOSNote[] = [];
    
    for (const file of files) {
      try {
        const note = VaultUtils.readNote(file);
        notes.push(note);
      } catch (error) {
        console.error(`Skipping file ${file} due to error:`, error);
        // Continue with other files
      }
    }
    
    return notes;
  }

  // Utility method for quick text search
  static async quickSearch(query: string, maxResults: number = 10): Promise<SearchResult[]> {
    return this.search({
      query,
      includeContent: true,
      maxResults,
      sortBy: 'relevance'
    });
  }

  // Utility method for searching by content type
  static async searchByContentType(contentType: string, maxResults?: number): Promise<SearchResult[]> {
    return this.search({
      contentType,
      maxResults,
      sortBy: 'modified',
      sortOrder: 'desc'
    });
  }

  // Utility method for searching recent notes
  static async searchRecent(days: number = 7, maxResults: number = 20): Promise<SearchResult[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    return this.search({
      modifiedAfter: date,
      maxResults,
      sortBy: 'modified',
      sortOrder: 'desc'
    });
  }
}