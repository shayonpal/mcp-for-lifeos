/**
 * Tool Router for AI Tool Caller Optimization
 * 
 * Consolidates multiple similar tools into intelligent unified tools
 * to reduce AI decision complexity while maintaining 100% functionality.
 * 
 * @see docs/AI-Tool-Caller-Optimization-PRD.md for complete specification
 */

import { SearchEngine, AdvancedSearchOptions, SearchResult } from './modules/search/index.js';
import { VaultUtils } from './modules/files/index.js';
import { DynamicTemplateEngine } from './modules/templates/index.js';
import { LIFEOS_CONFIG } from './config.js';
import { AnalyticsCollector } from './analytics/analytics-collector.js';
import { ObsidianLinks } from './modules/links/index.js';

/**
 * Universal Search Tool - Consolidates 6 search tools into 1
 * 
 * Auto-mode intelligently routes to optimal search strategy:
 * - Pattern-based queries → find_notes_by_pattern
 * - Content type queries → search_by_content_type  
 * - Recent/date queries → search_recent
 * - Simple queries → quick_search
 * - Complex queries → advanced_search
 * - Basic metadata → search_notes
 */
export interface UniversalSearchOptions {
  query?: string;
  mode?: 'auto' | 'advanced' | 'quick' | 'content_type' | 'recent' | 'pattern';
  
  // All advanced search options (for explicit control)
  contentQuery?: string;
  titleQuery?: string;
  naturalLanguage?: string;
  contentType?: string | string[];
  category?: string;
  subCategory?: string;
  tags?: string[];
  author?: string[];
  people?: string[];
  yamlProperties?: Record<string, any>;
  matchMode?: 'all' | 'any';
  arrayMode?: 'exact' | 'contains' | 'any';
  includeNullValues?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  folder?: string;
  excludeFolders?: string[];
  caseSensitive?: boolean;
  useRegex?: boolean;
  includeContent?: boolean;
  maxResults?: number;
  sortBy?: 'relevance' | 'created' | 'modified' | 'title';
  sortOrder?: 'asc' | 'desc';
  
  // Legacy compatibility options
  dateStart?: string;
  dateEnd?: string;
  pattern?: string;
  days?: number;

  // Response format option for token optimization
  format?: 'concise' | 'detailed';

  /**
   * Strategy for handling multi-word queries
   * @default 'auto' - Automatically detects based on word count and query structure
   * @since MCP-59
   */
  queryStrategy?: 'exact_phrase' | 'all_terms' | 'any_term' | 'auto';
}

/**
 * Smart Note Creation Tool - Consolidates 2 creation tools into 1
 */
export interface SmartCreateNoteOptions {
  title: string;
  content?: string;
  auto_template?: boolean; // Auto-detect template
  template?: string; // Explicit template override
  contentType?: string;
  category?: string;
  subCategory?: string;
  tags?: string[];
  targetFolder?: string;
  source?: string;
  people?: string[];
  customData?: Record<string, any>;
}

/**
 * Universal Listing Tool - Consolidates 4 listing tools into 1
 */
export interface UniversalListOptions {
  type: 'folders' | 'daily_notes' | 'templates' | 'yaml_properties' | 'auto';
  
  // Type-specific parameters
  path?: string; // For folders
  limit?: number; // For daily_notes
  includeCount?: boolean; // For yaml_properties
  sortBy?: string; // For yaml_properties
  excludeStandard?: boolean; // For yaml_properties
  
  // Response format option for token optimization
  format?: 'concise' | 'detailed';
}

export interface RoutingDecision {
  targetTool: string;
  strategy: string;
  confidence: number;
  reasoning: string;
}

export class ToolRouter {
  private static routingStats = new Map<string, number>();
  private static readonly ENABLE_TELEMETRY = process.env.TOOL_ROUTER_TELEMETRY === 'true';
  private static analytics = AnalyticsCollector.getInstance();
  private static clientInfo: { name?: string; version?: string } = {};
  private static sessionIdProvider: (() => string) | null = null;

  /**
   * Set client information and session ID provider for analytics tracking
   * Session ID is provided via function to avoid duplication with factory-managed session ID
   */
  static setClientInfo(info: { name?: string; version?: string }, sessionIdProvider: () => string): void {
    this.clientInfo = info;
    this.sessionIdProvider = sessionIdProvider;
  }

  /**
   * Get current session ID from provider
   */
  private static get sessionId(): string {
    return this.sessionIdProvider?.() || '';
  }

  /**
   * Record routing decision for telemetry
   */
  private static recordRouting(decision: RoutingDecision): void {
    if (!this.ENABLE_TELEMETRY) return;
    
    const key = `${decision.targetTool}_${decision.strategy}`;
    this.routingStats.set(key, (this.routingStats.get(key) || 0) + 1);

    // Also record in new analytics system
    this.analytics.recordUsage({
      toolName: 'routing_decision',
      executionTime: 0, // Routing decisions are instantaneous
      success: true,
      routingDecision: `${decision.targetTool}:${decision.strategy}`,
      searchMode: decision.strategy,
      clientName: this.clientInfo.name,
      clientVersion: this.clientInfo.version,
      sessionId: this.sessionId
    });
  }

  /**
   * Auto-mode: Intelligently detect optimal search strategy
   */
  private static detectSearchMode(options: UniversalSearchOptions): 'advanced' | 'quick' | 'content_type' | 'recent' | 'pattern' {
    const { query, contentType, pattern, days, dateStart, dateEnd, naturalLanguage } = options;

    // Pattern detection
    if (pattern || (query && (query.includes('*') || query.includes('**/')))) {
      return 'pattern';
    }

    // Content type detection
    if (contentType) {
      return 'content_type';
    }

    // Recent/date detection
    if (days !== undefined || dateStart || dateEnd || 
        options.modifiedAfter || options.modifiedBefore ||
        (query && /\b(recent|today|yesterday|last\s+\w+|this\s+\w+)\b/i.test(query))) {
      return 'recent';
    }

    // Advanced search detection - complex queries with multiple filters
    if (naturalLanguage || 
        options.yamlProperties || 
        options.tags?.length || 
        options.people?.length ||
        options.author?.length ||
        options.folder ||
        options.category ||
        options.subCategory ||
        options.contentQuery ||
        options.titleQuery) {
      return 'advanced';
    }

    // Check if query contains OR operations
    // Simple OR queries without complex operators should use quick search
    if (query && /\s+or\s+/i.test(query) && !/[()"\[\]|]/.test(query)) {
      return 'quick';  // Use quick search for simple multi-term OR
    }
    
    // Complex queries with operators still go to advanced
    if (query && /[()"\[\]|]/.test(query)) {
      return 'advanced';
    }

    // Default to quick search for simple queries
    return 'quick';
  }

  /**
   * Universal Search Tool - Routes to appropriate search implementation
   */
  static async routeSearch(options: UniversalSearchOptions): Promise<SearchResult[]> {
    return await this.analytics.recordToolExecution(
      'universal_search',
      async () => {
        return await this.executeSearch(options);
      },
      { 
        searchMode: options.mode || 'auto',
        clientName: this.clientInfo.name,
        clientVersion: this.clientInfo.version,
        sessionId: this.sessionId
      }
    );
  }

  /**
   * Internal search execution (separated for telemetry)
   */
  private static async executeSearch(options: UniversalSearchOptions): Promise<SearchResult[]> {
    const startTime = Date.now();
    
    try {
      // Determine routing strategy
      const mode = options.mode === 'auto' || !options.mode ? 
        this.detectSearchMode(options) : options.mode;

      const decision: RoutingDecision = {
        targetTool: '',
        strategy: mode,
        confidence: 0.9,
        reasoning: `Auto-detected ${mode} search based on query characteristics`
      };

      let results: SearchResult[];

      switch (mode) {
        case 'pattern':
          decision.targetTool = 'find_notes_by_pattern';
          const pattern = options.pattern || options.query || '';
          const files = await VaultUtils.findNotes(pattern);
          
          // Convert file paths to SearchResult format
          results = await Promise.all(
            files.slice(0, options.maxResults || 20).map(async (filePath) => {
              try {
                const note = VaultUtils.readNote(filePath);
                const title = ObsidianLinks.extractNoteTitle(note.path, note.frontmatter);
                return {
                  note,
                  score: 1.0,
                  matches: [{
                    type: 'title' as const,
                    text: title,
                    context: `File: ${filePath}`,
                    position: 0,
                    length: title.length
                  }]
                };
              } catch (error) {
                // Skip files that can't be read
                return null;
              }
            })
          ).then(results => results.filter(r => r !== null) as SearchResult[]);
          break;

        case 'content_type':
          decision.targetTool = 'search_by_content_type';
          const contentType = options.contentType as string || options.query || '';
          results = await SearchEngine.searchByContentType(contentType, options.maxResults);
          break;

        case 'recent':
          decision.targetTool = 'search_recent';
          const days = options.days || 7;
          const maxResults = options.maxResults || 20;
          results = await SearchEngine.searchRecent(days, maxResults);
          break;

        case 'quick':
          decision.targetTool = 'quick_search';
          if (!options.query) {
            throw new Error('Query is required for quick search');
          }
          
          // Handle OR queries as multiple quick searches
          if (/\s+or\s+/i.test(options.query)) {
            const terms = options.query.split(/\s+or\s+/i).map(term => term.trim().replace(/['"]/g, ''));
            const seen = new Set<string>();
            const combined: SearchResult[] = [];
            const maxPerTerm = Math.ceil((options.maxResults || 10) / terms.length);
            
            for (const term of terms) {
              if (!term) continue;
              
              try {
                const termResults = await SearchEngine.quickSearch(term, maxPerTerm);
                
                for (const result of termResults) {
                  if (!seen.has(result.note.path)) {
                    combined.push(result);
                    seen.add(result.note.path);
                  }
                }
              } catch (error) {
                // Continue with other terms if one fails
              }
            }
            
            // Sort combined results by score and limit
            results = combined
              .sort((a, b) => b.score - a.score)
              .slice(0, options.maxResults || 10);
            
            decision.strategy = 'multi-term-quick';
            decision.reasoning = `Split OR query into ${terms.length} separate searches`;
          } else {
            // Single term quick search
            results = await SearchEngine.quickSearch(options.query, options.maxResults || 10);
          }
          break;

        case 'advanced':
          decision.targetTool = 'advanced_search';
          
          // Convert universal options to advanced search options
          const advancedOptions: AdvancedSearchOptions = { ...options };

          // Handle legacy date format conversion
          if (options.dateStart) {
            advancedOptions.createdAfter = new Date(options.dateStart);
          }
          if (options.dateEnd) {
            advancedOptions.createdBefore = new Date(options.dateEnd);
          }

          // Pass queryStrategy through (MCP-59 multi-word search fix)
          // Always pass queryStrategy, defaulting to 'auto' for intelligent detection
          advancedOptions.queryStrategy = options.queryStrategy || 'auto';

          results = await SearchEngine.search(advancedOptions);
          
          // Intelligent fallback: If advanced search returns no results,
          // try a quick search as fallback with various strategies
          if (results.length === 0) {
            let fallbackQuery = '';
            
            // Priority 1: Use query or natural language if available
            if (options.query || options.naturalLanguage) {
              fallbackQuery = options.query || options.naturalLanguage || '';
              
              // If it's a complex OR query, take the first few terms
              if (fallbackQuery.toLowerCase().includes(' or ')) {
                const terms = fallbackQuery.split(/\s+or\s+/i)
                  .map(term => term.trim().replace(/["|']/g, ''))
                  .filter(term => term.length > 0)
                  .slice(0, 3); // Take first 3 terms
                fallbackQuery = terms.join(' ');
              }
            }
            
            // Priority 2: If no query but have metadata filters, use them
            if (!fallbackQuery && (options.category || options.subCategory || options.contentType)) {
              const parts = [];
              if (options.subCategory) parts.push(options.subCategory);
              if (options.category) parts.push(options.category);
              if (options.contentType) parts.push(options.contentType);
              fallbackQuery = parts.join(' ');
            }
            
            // Priority 3: If we have tags, use them
            if (!fallbackQuery && options.tags && options.tags.length > 0) {
              fallbackQuery = options.tags.slice(0, 3).join(' ');
            }
            
            if (fallbackQuery) {
              // Attempt fallback with quick search
              try {
                const fallbackResults = await SearchEngine.quickSearch(fallbackQuery, options.maxResults || 20);
                if (fallbackResults.length > 0) {
                  // Update decision to reflect fallback
                  decision.targetTool = 'advanced_search_with_fallback';
                  decision.reasoning += ' (No results with advanced search, fell back to quick search)';
                  decision.confidence = 0.7; // Lower confidence due to fallback
                  
                  // Add a note about the fallback in results
                  results = fallbackResults.map(result => ({
                    ...result,
                    // Add fallback indicator to help with debugging
                    interpretation: {
                      yamlProperties: {},
                      confidence: 0.7,
                      interpretation: `Advanced search found no results. Showing results for simplified query: "${fallbackQuery}"`,
                      suggestions: [
                        'Try using more specific search terms',
                        'Check if the metadata filters match your vault structure',
                        'Consider using natural language search instead'
                      ]
                    }
                  }));
                }
              } catch (fallbackError) {
                // If fallback fails, return original empty results
                // Don't throw error to maintain graceful degradation
              }
            }
          }
          break;

        default:
          throw new Error(`Unknown search mode: ${mode}`);
      }

      // Record telemetry
      decision.confidence = results.length > 0 ? 0.95 : 0.7;
      this.recordRouting(decision);

      const routingTime = Date.now() - startTime;
      if (routingTime > 200) {
        // Log slow routing if telemetry enabled
        if (this.ENABLE_TELEMETRY) {
          console.error(`Slow routing detected: ${routingTime}ms for ${decision.strategy}`);
        }
      }

      return results;

    } catch (error) {
      const routingTime = Date.now() - startTime;
      throw new Error(`Search routing failed after ${routingTime}ms: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Smart Note Creation Tool - Routes to appropriate creation method
   */
  static async routeCreateNote(options: SmartCreateNoteOptions): Promise<any> {
    return await this.analytics.recordToolExecution(
      'smart_create_note',
      async () => {
        return await this.executeCreateNote(options);
      },
      {
        clientName: this.clientInfo.name,
        clientVersion: this.clientInfo.version,
        sessionId: this.sessionId
      }
    );
  }

  /**
   * Internal note creation execution (separated for telemetry)
   */
  private static async executeCreateNote(options: SmartCreateNoteOptions): Promise<any> {
    try {
      const { title, auto_template = true, template } = options;

      // Template detection logic
      let finalTemplate = template;
      
      if (auto_template && !finalTemplate) {
        // Get available templates from the system
        const availableTemplates = DynamicTemplateEngine.getAllTemplates();
        const templateKeys = availableTemplates.map(t => t.key);
        
        // Simple heuristic-based template detection using actual available templates
        const titleLower = title.toLowerCase();
        
        if ((titleLower.includes('restaurant') || titleLower.includes('cafe') || titleLower.includes('food')) && templateKeys.includes('restaurant')) {
          finalTemplate = 'restaurant';
        } else if ((titleLower.includes('person') || titleLower.includes('contact') || titleLower.includes('people')) && templateKeys.includes('person')) {
          finalTemplate = 'person';
        } else if ((titleLower.includes('article') || titleLower.includes('blog') || titleLower.includes('post')) && templateKeys.includes('article')) {
          finalTemplate = 'article';
        } else if ((titleLower.includes('book') || titleLower.includes('reading')) && templateKeys.includes('books')) {
          finalTemplate = 'books';
        } else if ((titleLower.includes('place') || titleLower.includes('visit') || titleLower.includes('travel')) && templateKeys.includes('placetovisit')) {
          finalTemplate = 'placetovisit';
        } else if ((titleLower.includes('medicine') || titleLower.includes('medication') || titleLower.includes('drug')) && templateKeys.includes('medicine')) {
          finalTemplate = 'medicine';
        } else if ((titleLower.includes('app') || titleLower.includes('application') || titleLower.includes('software') || titleLower.includes('tool')) && templateKeys.includes('application')) {
          finalTemplate = 'application';
        } else if ((titleLower.includes('daily') || titleLower.includes('journal')) && templateKeys.includes('daily')) {
          finalTemplate = 'daily';
        }
        // Note: fleeting, moc, and reference templates are too general for auto-detection
      }

      const decision: RoutingDecision = {
        targetTool: finalTemplate ? 'create_note_from_template' : 'create_note',
        strategy: finalTemplate ? 'template-based' : 'manual',
        confidence: finalTemplate ? 0.8 : 1.0,
        reasoning: finalTemplate ? 
          `Auto-detected template: ${finalTemplate}` : 
          'Manual note creation without template'
      };

      this.recordRouting(decision);

      if (finalTemplate) {
        // Use template-based creation
        return DynamicTemplateEngine.createNoteFromTemplate(
          finalTemplate,
          title,
          options.customData || {}
        );
      } else {
        // Use manual creation - prepare frontmatter
        let frontmatter: any = { title };
        
        if (options.contentType) frontmatter['content type'] = options.contentType;
        if (options.category) frontmatter.category = options.category;
        if (options.subCategory) frontmatter['sub-category'] = options.subCategory;
        if (options.tags) frontmatter.tags = options.tags;
        if (options.source) frontmatter.source = options.source;
        if (options.people) frontmatter.people = options.people;

        return {
          frontmatter,
          content: options.content || '',
          targetFolder: options.targetFolder
        };
      }

    } catch (error) {
      throw new Error(`Note creation routing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Universal List Tool - Routes to appropriate listing method
   */
  static async routeList(options: UniversalListOptions): Promise<any> {
    return await this.analytics.recordToolExecution(
      'universal_list',
      async () => {
        return await this.executeList(options);
      },
      {
        clientName: this.clientInfo.name,
        clientVersion: this.clientInfo.version,
        sessionId: this.sessionId
      }
    );
  }

  /**
   * Internal list execution (separated for telemetry)
   */
  private static async executeList(options: UniversalListOptions): Promise<any> {
    try {
      const { type } = options;
      
      const decision: RoutingDecision = {
        targetTool: `list_${type}`,
        strategy: 'direct-mapping',
        confidence: 1.0,
        reasoning: `Direct mapping to ${type} listing`
      };

      this.recordRouting(decision);

      switch (type) {
        case 'folders':
          return await this.listFolders(options.path);
          
        case 'daily_notes':
          return await this.listDailyNotes(options.limit);
          
        case 'templates':
          return DynamicTemplateEngine.getAllTemplates();
          
        case 'yaml_properties':
          return VaultUtils.getAllYamlProperties({
            includeCount: options.includeCount || false,
            excludeStandard: options.excludeStandard || false
          });
          
        case 'auto':
          // Auto-detect what to list based on available options
          if (options.path !== undefined) return await this.listFolders(options.path);
          if (options.limit !== undefined) return await this.listDailyNotes(options.limit);
          if (options.includeCount !== undefined) return VaultUtils.getAllYamlProperties({
            includeCount: options.includeCount,
            excludeStandard: options.excludeStandard || false
          });
          
          // Default to folders
          return await this.listFolders();

        default:
          throw new Error(`Unknown list type: ${type}`);
      }

    } catch (error) {
      throw new Error(`List routing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Helper method for folder listing
   */
  private static async listFolders(basePath?: string): Promise<string[]> {
    const { readdirSync, statSync } = await import('fs');
    const fullPath = basePath ? 
      `${LIFEOS_CONFIG.vaultPath}/${basePath}` : 
      LIFEOS_CONFIG.vaultPath;

    return readdirSync(fullPath)
      .filter(item => statSync(`${fullPath}/${item}`).isDirectory());
  }

  /**
   * Helper method for daily notes listing
   */
  private static async listDailyNotes(limit: number = 10): Promise<string[]> {
    const { readdirSync } = await import('fs');
    
    return readdirSync(LIFEOS_CONFIG.dailyNotesPath)
      .filter(file => file.endsWith('.md'))
      .sort()
      .slice(-limit);
  }

  /**
   * Get routing statistics for telemetry
   */
  static getRoutingStats(): Record<string, number> {
    return Object.fromEntries(this.routingStats);
  }

  /**
   * Clear routing statistics
   */
  static clearRoutingStats(): void {
    this.routingStats.clear();
  }
}