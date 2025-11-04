import { readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';
import { LifeOSNote, YAMLFrontmatter, SearchOptions } from '../../shared/index.js';
import { readNote } from '../files/note-crud.js';
import { LIFEOS_CONFIG } from '../../shared/index.js';
import { NaturalLanguageProcessor, QueryInterpretation } from './natural-language-processor.js';
import { QueryParser } from './query-parser.js';
import type { QueryStrategy } from '../../../dev/contracts/MCP-59-contracts.js';
import { escapeRegex } from '../../shared/index.js';
import { normalizeText } from '../../shared/index.js';
import { stripMdExtension } from '../../shared/index.js';

export interface AdvancedSearchOptions {
  // Text search
  query?: string;
  contentQuery?: string;
  titleQuery?: string;
  
  // Natural language processing
  naturalLanguage?: string;
  
  // Metadata filters
  contentType?: string | string[];
  category?: string;
  subCategory?: string;
  tags?: string[];
  author?: string[];
  people?: string[];
  yamlProperties?: Record<string, any>;
  
  // YAML property matching modes
  matchMode?: 'all' | 'any';
  arrayMode?: 'exact' | 'contains' | 'any';
  includeNullValues?: boolean;
  
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

  /**
   * Strategy for handling multi-word queries
   * @default 'auto' - Automatically detects based on word count and query structure
   * @since MCP-59
   */
  queryStrategy?: QueryStrategy;
}

export interface SearchResult {
  note: LifeOSNote;
  score: number;
  matches: SearchMatch[];
  interpretation?: QueryInterpretation;
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
  // Simple cache for parsed notes to improve performance on repeated searches
  private static noteCache = new Map<string, LifeOSNote>();
  private static cacheTimestamp = new Map<string, number>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Note: normalizeText moved to text-utils.ts to eliminate duplication (MCP-59)

  /**
   * Create regex pattern(s) based on query strategy
   * Enhanced in MCP-59 to support multi-word search strategies
   *
   * @param query - Query string
   * @param caseSensitive - Case sensitivity flag
   * @param useRegex - Whether query is a regex
   * @param queryStrategy - Strategy for multi-word queries (default: 'auto')
   * @returns Regex pattern for matching
   * @since MCP-59 - Added queryStrategy parameter
   */
  private static createRegex(
    query: string,
    caseSensitive: boolean = false,
    useRegex: boolean = false,
    queryStrategy: QueryStrategy = 'auto'
  ): RegExp {
    // Note: useRegex path uses 'g' flag for multiple matches via exec() loop
    // QueryParser path omits 'g' flag to avoid stateful regex issues with .test()
    // See findMatches() which breaks after first match when !regex.global (MCP-59)
    if (useRegex) {
      return new RegExp(query, caseSensitive ? 'g' : 'gi');
    }

    // Parse query to detect strategy if auto mode
    const parsed = QueryParser.parse(query);
    const effectiveStrategy = queryStrategy === 'auto' ? parsed.strategy : queryStrategy;

    // Create pattern based on strategy
    // Pass raw terms (not normalizedTerms) so createPatterns can handle case sensitivity
    // MCP-59: createPatterns now returns single RegExp (simplified from array)
    return QueryParser.createPatterns(
      parsed.terms,
      effectiveStrategy,
      caseSensitive
    );
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

  /**
   * Find matches with strategy support
   * Enhanced in MCP-59 to pass queryStrategy through
   *
   * @param text - Text to search in
   * @param query - Query string
   * @param type - Match type
   * @param field - Optional field name
   * @param caseSensitive - Case sensitivity flag
   * @param useRegex - Whether query is a regex
   * @param queryStrategy - Strategy for multi-word queries
   * @returns Array of matches
   * @since MCP-59 - Added queryStrategy parameter
   */
  private static findMatches(
    text: string,
    query: string,
    type: SearchMatch['type'],
    field?: string,
    caseSensitive: boolean = false,
    useRegex: boolean = false,
    queryStrategy: QueryStrategy = 'auto'
  ): SearchMatch[] {
    if (!query || !text) return [];

    const regex = this.createRegex(query, caseSensitive, useRegex, queryStrategy);
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

    // Custom YAML properties filter with array matching and match modes
    if (options.yamlProperties && typeof options.yamlProperties === 'object') {
      const matchMode = options.matchMode || 'all';
      const arrayMode = options.arrayMode || 'contains';
      const includeNullValues = options.includeNullValues || false;
      
      const propertyResults: boolean[] = [];
      
      for (const [property, expectedValue] of Object.entries(options.yamlProperties)) {
        const actualValue = fm[property];
        const matches = this.matchesYamlProperty(actualValue, expectedValue, arrayMode, includeNullValues);
        propertyResults.push(matches);
      }
      
      // Apply match mode logic
      if (matchMode === 'all') {
        // ALL properties must match (existing behavior)
        if (propertyResults.some(result => !result)) {
          return false;
        }
      } else if (matchMode === 'any') {
        // ANY property can match (new behavior)
        if (propertyResults.length > 0 && propertyResults.every(result => !result)) {
          return false;
        }
      }
    }

    return true;
  }

  private static matchesYamlProperty(actualValue: any, expectedValue: any, arrayMode: 'exact' | 'contains' | 'any', includeNullValues?: boolean): boolean {
    // Handle null/undefined cases
    if (actualValue === null || actualValue === undefined) {
      // If includeNullValues is true, null/undefined values match any expected value
      if (includeNullValues) {
        return true;
      }
      // Otherwise, only match if expected value is also null/undefined
      return expectedValue === null || expectedValue === undefined;
    }
    
    // If expectedValue is an array, use array-to-value matching
    if (Array.isArray(expectedValue)) {
      return this.matchArrayToValue(actualValue, expectedValue, arrayMode);
    }
    
    // If actualValue is an array, use value-to-array matching  
    if (Array.isArray(actualValue)) {
      return this.matchValueToArray(expectedValue, actualValue, arrayMode);
    }
    
    // Both are single values - exact match
    return actualValue === expectedValue;
  }

  private static matchArrayToValue(actualValue: any, expectedArray: any[], arrayMode: 'exact' | 'contains' | 'any'): boolean {
    if (Array.isArray(actualValue)) {
      // Array to array comparison
      switch (arrayMode) {
        case 'exact':
          // Arrays must be identical (same elements in same order)
          return actualValue.length === expectedArray.length && 
                 actualValue.every((val, idx) => val === expectedArray[idx]);
        
        case 'contains':
          // Actual array must contain all expected values
          return expectedArray.every(expectedVal => actualValue.includes(expectedVal));
        
        case 'any':
          // Any overlap between arrays
          return expectedArray.some(expectedVal => actualValue.includes(expectedVal));
        
        default:
          return false;
      }
    } else {
      // Single value to array comparison
      switch (arrayMode) {
        case 'exact':
          // Single value must exactly match a single-element expected array
          return expectedArray.length === 1 && actualValue === expectedArray[0];
        
        case 'contains':
        case 'any':
          // Single value must be included in the expected array
          return expectedArray.includes(actualValue);
        
        default:
          return false;
      }
    }
  }

  private static matchValueToArray(expectedValue: any, actualArray: any[], arrayMode: 'exact' | 'contains' | 'any'): boolean {
    switch (arrayMode) {
      case 'exact':
        // Expected single value must exactly match a single-element actual array
        return actualArray.length === 1 && actualArray[0] === expectedValue;
      
      case 'contains':
      case 'any':
        // Actual array must contain the expected value
        return actualArray.includes(expectedValue);
      
      default:
        return false;
    }
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
    let interpretation: QueryInterpretation | undefined;
    let processedOptions = { ...options };

    // Default queryStrategy to 'auto' for intelligent multi-word search detection (MCP-59)
    // This ensures quickSearch() and other calls without explicit queryStrategy use auto-detection
    if (!processedOptions.queryStrategy) {
      processedOptions.queryStrategy = 'auto';
    }

    // Process natural language query if provided
    if (options.naturalLanguage) {
      interpretation = NaturalLanguageProcessor.processQuery(options.naturalLanguage);
      
      // Merge natural language interpretation with existing options
      if (interpretation.yamlProperties && Object.keys(interpretation.yamlProperties).length > 0) {
        processedOptions.yamlProperties = {
          ...processedOptions.yamlProperties,
          ...interpretation.yamlProperties
        };
      }
      
      if (interpretation.arrayMode) {
        processedOptions.arrayMode = interpretation.arrayMode;
      }
      
      if (interpretation.matchMode) {
        processedOptions.matchMode = interpretation.matchMode;
      }
      
      if (interpretation.dateFilters) {
        if (interpretation.dateFilters.modifiedAfter) {
          processedOptions.modifiedAfter = interpretation.dateFilters.modifiedAfter;
        }
        if (interpretation.dateFilters.modifiedBefore) {
          processedOptions.modifiedBefore = interpretation.dateFilters.modifiedBefore;
        }
        if (interpretation.dateFilters.createdAfter) {
          processedOptions.createdAfter = interpretation.dateFilters.createdAfter;
        }
        if (interpretation.dateFilters.createdBefore) {
          processedOptions.createdBefore = interpretation.dateFilters.createdBefore;
        }
      }
      
      // If no specific query provided but we have natural language, use it as general query for fallback
      if (!processedOptions.query && interpretation.confidence < 0.5) {
        processedOptions.query = options.naturalLanguage;
      }
    }

    const allNotes = await this.getAllNotes();
    const results: SearchResult[] = [];

    // Optimization: Parse query once before loop for all_terms prefilter
    // Use individual word tests instead of complex lookahead pattern for better performance
    let allTermsPrefilterWords: string[] | null = null;
    let allTermsPrefilterRegexes: RegExp[] | null = null;
    let allTermsPrefilterCaseSensitive = false;
    if (processedOptions.query) {
      const parsed = QueryParser.parse(processedOptions.query);
      const effectiveStrategy = processedOptions.queryStrategy === 'auto'
        ? parsed.strategy
        : processedOptions.queryStrategy;

      if (effectiveStrategy === 'all_terms') {
        // Store normalized terms for individual word matching
        allTermsPrefilterCaseSensitive = processedOptions.caseSensitive || false;
        allTermsPrefilterWords = allTermsPrefilterCaseSensitive
          ? parsed.terms
          : parsed.normalizedTerms;

        // Pre-compile regexes to avoid recompilation in the loop (performance optimization)
        allTermsPrefilterRegexes = allTermsPrefilterWords.map(word =>
          new RegExp(`\\b${escapeRegex(word)}\\b`, allTermsPrefilterCaseSensitive ? '' : 'i')
        );
      }
    }

    for (const note of allNotes) {
      // Apply filters first
      if (!this.matchesMetadataFilter(note, processedOptions)) continue;
      if (!this.matchesDateFilter(note, processedOptions)) continue;
      if (!this.matchesFolderFilter(note, processedOptions)) continue;

      // Find text matches
      const matches: SearchMatch[] = [];

      // Pre-filter for all_terms strategy: Check if ALL terms exist somewhere in the note
      // This handles cross-field searches where words are split across title/content/frontmatter
      // PERFORMANCE: Use individual word tests instead of lookahead pattern (much faster)
      if (allTermsPrefilterWords) {
        // Concatenate all searchable text
        const titleSources: string[] = [];
        if (note.frontmatter.title) titleSources.push(note.frontmatter.title);
        const pathParts = note.path.split('/');
        const filename = pathParts[pathParts.length - 1];
        titleSources.push(stripMdExtension(filename));
        if (note.frontmatter.aliases) {
          const aliases = Array.isArray(note.frontmatter.aliases)
            ? note.frontmatter.aliases
            : [note.frontmatter.aliases];
          titleSources.push(...aliases.filter(a => typeof a === 'string'));
        }

        const combinedText = [
          ...titleSources,
          note.content,
          ...Object.values(note.frontmatter).flatMap(v =>
            Array.isArray(v) ? v.filter(i => typeof i === 'string') :
            typeof v === 'string' ? [v] : []
          )
        ].join('\n');

        // Test each word individually - much faster than lookahead pattern
        // Short-circuits on first missing word
        const textToTest = allTermsPrefilterCaseSensitive ? combinedText : combinedText.toLowerCase();
        const allWordsPresent = allTermsPrefilterRegexes!.every(regex => regex.test(textToTest));

        if (!allWordsPresent) {
          // Not all terms found - skip this note
          continue;
        }
      }

      // Search in title
      if (processedOptions.query || processedOptions.titleQuery) {
        const titleQuery = processedOptions.titleQuery || processedOptions.query!;
        
        // Search in multiple title-related fields
        const titleSources: string[] = [];
        
        // 1. Use frontmatter title if available
        if (note.frontmatter.title) {
          titleSources.push(note.frontmatter.title);
        }

        // 2. Always include filename without extension
        const pathParts = note.path.split('/');
        const filename = pathParts[pathParts.length - 1];
        const filenameWithoutExt = stripMdExtension(filename);
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
            processedOptions.caseSensitive,
            processedOptions.useRegex,
            processedOptions.queryStrategy
          ));
        }
      }

      // Search in content
      if ((processedOptions.query || processedOptions.contentQuery) && processedOptions.includeContent !== false) {
        const contentQuery = processedOptions.contentQuery || processedOptions.query!;
        matches.push(...this.findMatches(
          note.content,
          contentQuery,
          'content',
          undefined,
          processedOptions.caseSensitive,
          processedOptions.useRegex,
          processedOptions.queryStrategy
        ));
      }

      // Search in frontmatter fields
      if (processedOptions.query) {
        Object.entries(note.frontmatter).forEach(([key, value]) => {
          if (typeof value === 'string') {
            matches.push(...this.findMatches(
              value,
              processedOptions.query!,
              'frontmatter',
              key,
              processedOptions.caseSensitive,
              processedOptions.useRegex,
              processedOptions.queryStrategy
            ));
          } else if (Array.isArray(value)) {
            value.forEach(item => {
              if (typeof item === 'string') {
                matches.push(...this.findMatches(
                  item,
                  processedOptions.query!,
                  'frontmatter',
                  key,
                  processedOptions.caseSensitive,
                  processedOptions.useRegex,
                  processedOptions.queryStrategy
                ));
              }
            });
          }
        });
      }

      // If we have query terms but no matches, skip this note
      if ((processedOptions.query || processedOptions.titleQuery || processedOptions.contentQuery) && matches.length === 0) {
        continue;
      }

      // Calculate relevance score
      const score = this.calculateRelevanceScore(note, matches, processedOptions);

      const result: SearchResult = {
        note,
        score,
        matches
      };
      
      // Add interpretation to first result only (to avoid duplication)
      if (interpretation && results.length === 0) {
        result.interpretation = interpretation;
      }
      
      results.push(result);
    }

    // Sort results
    results.sort((a, b) => {
      switch (processedOptions.sortBy) {
        case 'created':
          const createdOrder = processedOptions.sortOrder === 'asc' ? 1 : -1;
          return createdOrder * (a.note.created.getTime() - b.note.created.getTime());
        
        case 'modified':
          const modifiedOrder = processedOptions.sortOrder === 'asc' ? 1 : -1;
          return modifiedOrder * (a.note.modified.getTime() - b.note.modified.getTime());
        
        case 'title':
          const titleOrder = processedOptions.sortOrder === 'asc' ? 1 : -1;
          const titleA = String(a.note.frontmatter.title || '');
          const titleB = String(b.note.frontmatter.title || '');
          return titleOrder * titleA.localeCompare(titleB);
        
        case 'relevance':
        default:
          return b.score - a.score; // Higher scores first
      }
    });

    // Apply limit
    if (processedOptions.maxResults) {
      return results.slice(0, processedOptions.maxResults);
    }

    return results;
  }

  public static async getAllNotes(): Promise<LifeOSNote[]> {
    const searchPath = join(LIFEOS_CONFIG.vaultPath, '**/*.md');
    const files = await glob(searchPath, {
      ignore: ["**/node_modules/**", "**/.*"],
    });
    const notes: LifeOSNote[] = [];
    let skippedCount = 0;
    const now = Date.now();

    for (const file of files) {
      try {
        // Check cache first
        const cachedNote = this.noteCache.get(file);
        const cacheTime = this.cacheTimestamp.get(file);

        if (cachedNote && cacheTime && (now - cacheTime) < this.CACHE_TTL) {
          notes.push(cachedNote);
          continue;
        }

        // Read and cache the note
        const note = readNote(file);
        this.noteCache.set(file, note);
        this.cacheTimestamp.set(file, now);
        notes.push(note);
      } catch (error) {
        // Silent skip for MCP compatibility - don't log to console
        // Track skipped files for potential reporting
        skippedCount++;
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

  // Cache management methods
  static clearCache(): void {
    this.noteCache.clear();
    this.cacheTimestamp.clear();
  }

  static getCacheStats(): { size: number; entries: number } {
    return {
      size: this.noteCache.size,
      entries: this.cacheTimestamp.size
    };
  }
}
