/**
 * Test Data Generator
 * 
 * Utilities for generating consistent test data across tool parity tests
 */

export interface TestScenarioMatrix {
  search: SearchTestCase[];
  creation: CreationTestCase[];
  listing: ListingTestCase[];
  error: ErrorTestCase[];
}

export interface SearchTestCase {
  name: string;
  description: string;
  legacyTool: string;
  legacyParams: Record<string, any>;
  consolidatedTool: string;
  consolidatedParams: Record<string, any>;
  category: 'basic' | 'advanced' | 'pattern' | 'content_type' | 'recent' | 'metadata';
  expectedResults?: number;
}

export interface CreationTestCase {
  name: string;
  description: string;
  legacyTool: string;
  legacyParams: Record<string, any>;
  consolidatedTool: string;
  consolidatedParams: Record<string, any>;
  category: 'basic' | 'template' | 'complex';
  cleanup?: boolean;
}

export interface ListingTestCase {
  name: string;
  description: string;
  legacyTool: string;
  legacyParams: Record<string, any>;
  consolidatedTool: string;
  consolidatedParams: Record<string, any>;
  category: 'folders' | 'templates' | 'daily_notes' | 'yaml_properties';
}

export interface ErrorTestCase {
  name: string;
  description: string;
  legacyTool: string;
  legacyParams: Record<string, any>;
  consolidatedTool: string;
  consolidatedParams: Record<string, any>;
  expectedError: string;
}

export class TestDataGenerator {
  /**
   * Generate comprehensive test scenario matrix
   */
  static generateTestMatrix(): TestScenarioMatrix {
    return {
      search: this.generateSearchScenarios(),
      creation: this.generateCreationScenarios(),
      listing: this.generateListingScenarios(),
      error: this.generateErrorScenarios()
    };
  }

  /**
   * Generate search test scenarios covering all legacy tools
   */
  private static generateSearchScenarios(): SearchTestCase[] {
    return [
      // Quick Search variations
      {
        name: 'quick-search-basic',
        description: 'Basic text search with quick_search',
        legacyTool: 'quick_search',
        legacyParams: { query: 'test', maxResults: 5 },
        consolidatedTool: 'search',
        consolidatedParams: { query: 'test', maxResults: 5, mode: 'quick' },
        category: 'basic'
      },
      {
        name: 'quick-search-empty',
        description: 'Quick search with empty query',
        legacyTool: 'quick_search',
        legacyParams: { query: '', maxResults: 10 },
        consolidatedTool: 'search',
        consolidatedParams: { query: '', maxResults: 10, mode: 'quick' },
        category: 'basic'
      },
      {
        name: 'quick-search-special-chars',
        description: 'Quick search with special characters',
        legacyTool: 'quick_search',
        legacyParams: { query: 'test & example (2024)', maxResults: 3 },
        consolidatedTool: 'search',
        consolidatedParams: { query: 'test & example (2024)', maxResults: 3, mode: 'quick' },
        category: 'basic'
      },

      // Advanced Search variations
      {
        name: 'advanced-search-full',
        description: 'Advanced search with multiple parameters',
        legacyTool: 'advanced_search',
        legacyParams: { 
          query: 'example', 
          contentType: 'Article', 
          tags: ['test'], 
          maxResults: 5 
        },
        consolidatedTool: 'search',
        consolidatedParams: { 
          query: 'example', 
          contentType: 'Article', 
          tags: ['test'], 
          maxResults: 5, 
          mode: 'advanced' 
        },
        category: 'advanced'
      },
      {
        name: 'advanced-search-natural-language',
        description: 'Advanced search with natural language',
        legacyTool: 'advanced_search',
        legacyParams: { naturalLanguage: 'Italian restaurants in Toronto' },
        consolidatedTool: 'search',
        consolidatedParams: { naturalLanguage: 'Italian restaurants in Toronto', mode: 'advanced' },
        category: 'advanced'
      },

      // Content Type Search
      {
        name: 'content-type-search-article',
        description: 'Search by content type - Article',
        legacyTool: 'search_by_content_type',
        legacyParams: { contentType: 'Article', maxResults: 5 },
        consolidatedTool: 'search',
        consolidatedParams: { contentType: 'Article', maxResults: 5, mode: 'content_type' },
        category: 'content_type'
      },
      {
        name: 'content-type-search-daily',
        description: 'Search by content type - Daily Note',
        legacyTool: 'search_by_content_type',
        legacyParams: { contentType: 'Daily Note', maxResults: 3 },
        consolidatedTool: 'search',
        consolidatedParams: { contentType: 'Daily Note', maxResults: 3, mode: 'content_type' },
        category: 'content_type'
      },

      // Recent Search
      {
        name: 'recent-search-week',
        description: 'Recent search - past week',
        legacyTool: 'search_recent',
        legacyParams: { days: 7, maxResults: 10 },
        consolidatedTool: 'search',
        consolidatedParams: { days: 7, maxResults: 10, mode: 'recent' },
        category: 'recent'
      },
      {
        name: 'recent-search-month',
        description: 'Recent search - past month',
        legacyTool: 'search_recent',
        legacyParams: { days: 30, maxResults: 15 },
        consolidatedTool: 'search',
        consolidatedParams: { days: 30, maxResults: 15, mode: 'recent' },
        category: 'recent'
      },

      // Pattern Search
      {
        name: 'pattern-search-markdown',
        description: 'Pattern search for markdown files',
        legacyTool: 'find_notes_by_pattern',
        legacyParams: { pattern: '**/*.md' },
        consolidatedTool: 'search',
        consolidatedParams: { pattern: '**/*.md', mode: 'pattern' },
        category: 'pattern'
      },
      {
        name: 'pattern-search-specific',
        description: 'Pattern search for specific naming pattern',
        legacyTool: 'find_notes_by_pattern',
        legacyParams: { pattern: '**/Daily*2024*.md' },
        consolidatedTool: 'search',
        consolidatedParams: { pattern: '**/Daily*2024*.md', mode: 'pattern' },
        category: 'pattern'
      },

      // Metadata Search
      {
        name: 'metadata-search-basic',
        description: 'Basic metadata search',
        legacyTool: 'search_notes',
        legacyParams: { contentType: 'Reference', category: 'Tools' },
        consolidatedTool: 'search',
        consolidatedParams: { contentType: 'Reference', category: 'Tools', mode: 'auto' },
        category: 'metadata'
      },
      {
        name: 'metadata-search-with-tags',
        description: 'Metadata search with tags',
        legacyTool: 'search_notes',
        legacyParams: { tags: ['important', 'review'], folder: '30 - Resources' },
        consolidatedTool: 'search',
        consolidatedParams: { tags: ['important', 'review'], folder: '30 - Resources', mode: 'auto' },
        category: 'metadata'
      }
    ];
  }

  /**
   * Generate creation test scenarios
   */
  private static generateCreationScenarios(): CreationTestCase[] {
    return [
      {
        name: 'basic-note-creation',
        description: 'Basic note creation without template',
        legacyTool: 'create_note',
        legacyParams: {
          title: 'Parity Test Basic Note',
          content: 'This is a test note for parity validation.',
          contentType: 'Reference',
          category: 'Testing',
          tags: ['test', 'parity']
        },
        consolidatedTool: 'create_note_smart',
        consolidatedParams: {
          title: 'Parity Test Basic Note Smart',
          content: 'This is a test note for parity validation.',
          contentType: 'Reference',
          category: 'Testing',
          tags: ['test', 'parity'],
          auto_template: false
        },
        category: 'basic',
        cleanup: true
      },
      {
        name: 'template-restaurant-creation',
        description: 'Restaurant note creation with template',
        legacyTool: 'create_note_from_template',
        legacyParams: {
          title: 'Parity Test Restaurant',
          template: 'restaurant',
          customData: {
            cuisine: 'Italian',
            location: 'Toronto, ON',
            rating: 4.5
          }
        },
        consolidatedTool: 'create_note_smart',
        consolidatedParams: {
          title: 'Parity Test Restaurant Smart',
          template: 'restaurant',
          customData: {
            cuisine: 'Italian',
            location: 'Toronto, ON',
            rating: 4.5
          },
          auto_template: false
        },
        category: 'template',
        cleanup: true
      },
      {
        name: 'template-article-creation',
        description: 'Article note creation with template',
        legacyTool: 'create_note_from_template',
        legacyParams: {
          title: 'Parity Test Article',
          template: 'article',
          customData: {
            author: 'Test Author',
            source: 'https://example.com/article',
            publishDate: '2024-12-06'
          }
        },
        consolidatedTool: 'create_note_smart',
        consolidatedParams: {
          title: 'Parity Test Article Smart',
          template: 'article',
          customData: {
            author: 'Test Author',
            source: 'https://example.com/article',
            publishDate: '2024-12-06'
          },
          auto_template: false
        },
        category: 'template',
        cleanup: true
      },
      {
        name: 'complex-note-creation',
        description: 'Complex note with all metadata',
        legacyTool: 'create_note',
        legacyParams: {
          title: 'Parity Test Complex Note',
          content: '# Complex Note\n\nThis note has all possible metadata fields.',
          contentType: 'MOC',
          category: 'System',
          subCategory: 'Testing',
          tags: ['complex', 'parity', 'validation'],
          people: ['John Doe', 'Jane Smith'],
          source: 'https://example.com/complex',
          targetFolder: '00 - Meta'
        },
        consolidatedTool: 'create_note_smart',
        consolidatedParams: {
          title: 'Parity Test Complex Note Smart',
          content: '# Complex Note\n\nThis note has all possible metadata fields.',
          contentType: 'MOC',
          category: 'System',
          subCategory: 'Testing',
          tags: ['complex', 'parity', 'validation'],
          people: ['John Doe', 'Jane Smith'],
          source: 'https://example.com/complex',
          targetFolder: '00 - Meta',
          auto_template: false
        },
        category: 'complex',
        cleanup: true
      }
    ];
  }

  /**
   * Generate listing test scenarios
   */
  private static generateListingScenarios(): ListingTestCase[] {
    return [
      {
        name: 'folders-root-listing',
        description: 'List folders at root level',
        legacyTool: 'list_folders',
        legacyParams: { path: '/' },
        consolidatedTool: 'list',
        consolidatedParams: { type: 'folders', path: '/' },
        category: 'folders'
      },
      {
        name: 'folders-specific-path',
        description: 'List folders in specific path',
        legacyTool: 'list_folders',
        legacyParams: { path: '20 - Areas' },
        consolidatedTool: 'list',
        consolidatedParams: { type: 'folders', path: '20 - Areas' },
        category: 'folders'
      },
      {
        name: 'templates-all',
        description: 'List all available templates',
        legacyTool: 'list_templates',
        legacyParams: {},
        consolidatedTool: 'list',
        consolidatedParams: { type: 'templates' },
        category: 'templates'
      },
      {
        name: 'daily-notes-default',
        description: 'List daily notes with default limit',
        legacyTool: 'list_daily_notes',
        legacyParams: {},
        consolidatedTool: 'list',
        consolidatedParams: { type: 'daily_notes' },
        category: 'daily_notes'
      },
      {
        name: 'daily-notes-limited',
        description: 'List daily notes with custom limit',
        legacyTool: 'list_daily_notes',
        legacyParams: { limit: 5 },
        consolidatedTool: 'list',
        consolidatedParams: { type: 'daily_notes', limit: 5 },
        category: 'daily_notes'
      },
      {
        name: 'yaml-properties-basic',
        description: 'List YAML properties basic',
        legacyTool: 'list_yaml_properties',
        legacyParams: {},
        consolidatedTool: 'list',
        consolidatedParams: { type: 'yaml_properties' },
        category: 'yaml_properties'
      },
      {
        name: 'yaml-properties-with-counts',
        description: 'List YAML properties with usage counts',
        legacyTool: 'list_yaml_properties',
        legacyParams: { includeCount: true, sortBy: 'usage' },
        consolidatedTool: 'list',
        consolidatedParams: { type: 'yaml_properties', includeCount: true, sortBy: 'usage' },
        category: 'yaml_properties'
      },
      {
        name: 'yaml-properties-exclude-standard',
        description: 'List YAML properties excluding standard ones',
        legacyTool: 'list_yaml_properties',
        legacyParams: { excludeStandard: true, includeCount: true },
        consolidatedTool: 'list',
        consolidatedParams: { type: 'yaml_properties', excludeStandard: true, includeCount: true },
        category: 'yaml_properties'
      }
    ];
  }

  /**
   * Generate error handling test scenarios
   */
  private static generateErrorScenarios(): ErrorTestCase[] {
    return [
      {
        name: 'search-invalid-maxResults',
        description: 'Search with invalid maxResults parameter',
        legacyTool: 'quick_search',
        legacyParams: { query: 'test', maxResults: -1 },
        consolidatedTool: 'search',
        consolidatedParams: { query: 'test', maxResults: -1, mode: 'quick' },
        expectedError: 'Invalid maxResults'
      },
      {
        name: 'search-missing-query',
        description: 'Search with missing required query',
        legacyTool: 'quick_search',
        legacyParams: { maxResults: 5 },
        consolidatedTool: 'search',
        consolidatedParams: { maxResults: 5, mode: 'quick' },
        expectedError: 'Missing required parameter'
      },
      {
        name: 'creation-missing-title',
        description: 'Note creation with missing title',
        legacyTool: 'create_note',
        legacyParams: { content: 'Content without title' },
        consolidatedTool: 'create_note_smart',
        consolidatedParams: { content: 'Content without title' },
        expectedError: 'Title is required'
      },
      {
        name: 'creation-invalid-template',
        description: 'Note creation with invalid template',
        legacyTool: 'create_note_from_template',
        legacyParams: { title: 'Test', template: 'nonexistent_template' },
        consolidatedTool: 'create_note_smart',
        consolidatedParams: { title: 'Test', template: 'nonexistent_template' },
        expectedError: 'Template not found'
      },
      {
        name: 'listing-invalid-type',
        description: 'Listing with invalid type parameter',
        legacyTool: 'list_folders',
        legacyParams: { path: '/nonexistent/path' },
        consolidatedTool: 'list',
        consolidatedParams: { type: 'folders', path: '/nonexistent/path' },
        expectedError: 'Invalid path'
      }
    ];
  }

  /**
   * Generate performance benchmark scenarios
   */
  static generatePerformanceBenchmarks(): Array<{
    name: string;
    iterations: number;
    scenarios: Array<{
      tool: string;
      params: Record<string, any>;
    }>;
  }> {
    return [
      {
        name: 'search-performance',
        iterations: 10,
        scenarios: [
          { tool: 'quick_search', params: { query: 'test', maxResults: 20 } },
          { tool: 'search', params: { query: 'test', maxResults: 20, mode: 'quick' } }
        ]
      },
      {
        name: 'listing-performance',
        iterations: 5,
        scenarios: [
          { tool: 'list_folders', params: { path: '/' } },
          { tool: 'list', params: { type: 'folders', path: '/' } }
        ]
      }
    ];
  }
}

/**
 * Result comparison utilities
 */
export class ParityValidator {
  /**
   * Validate that two tool outputs are functionally equivalent
   */
  static validateOutputParity(legacy: any, consolidated: any, options: {
    ignoreTimestamps?: boolean;
    ignorePaths?: boolean;
    ignoreMetadata?: boolean;
  } = {}): {
    matches: boolean;
    differences: string[];
    score: number;
  } {
    const differences: string[] = [];
    let score = 100;

    // Normalize outputs for comparison
    const normalizedLegacy = this.normalizeOutput(legacy, options);
    const normalizedConsolidated = this.normalizeOutput(consolidated, options);

    // Structure comparison
    if (this.getStructureSignature(normalizedLegacy) !== this.getStructureSignature(normalizedConsolidated)) {
      differences.push('Output structure differs');
      score -= 30;
    }

    // Content comparison
    const contentMatch = this.compareContent(normalizedLegacy, normalizedConsolidated);
    if (!contentMatch.matches) {
      differences.push(...contentMatch.differences);
      score -= contentMatch.penalty;
    }

    return {
      matches: differences.length === 0,
      differences,
      score: Math.max(0, score)
    };
  }

  private static normalizeOutput(output: any, options: any): any {
    if (!output) return output;

    let normalized = JSON.parse(JSON.stringify(output));

    if (options.ignoreTimestamps) {
      normalized = this.replaceTimestamps(normalized);
    }

    if (options.ignorePaths) {
      normalized = this.replacePaths(normalized);
    }

    if (options.ignoreMetadata) {
      normalized = this.removeMetadata(normalized);
    }

    return normalized;
  }

  private static replaceTimestamps(obj: any): any {
    const timestampRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g;
    const dateRegex = /\d{4}-\d{2}-\d{2}/g;
    
    const str = JSON.stringify(obj);
    const replaced = str
      .replace(timestampRegex, '[TIMESTAMP]')
      .replace(dateRegex, '[DATE]');
    
    return JSON.parse(replaced);
  }

  private static replacePaths(obj: any): any {
    const pathRegex = /\/Users\/[^/]+\//g;
    const str = JSON.stringify(obj);
    const replaced = str.replace(pathRegex, '/Users/[USER]/');
    return JSON.parse(replaced);
  }

  private static removeMetadata(obj: any): any {
    if (obj && obj.metadata) {
      const { metadata, ...rest } = obj;
      return rest;
    }
    return obj;
  }

  private static getStructureSignature(obj: any): string {
    if (Array.isArray(obj)) {
      return `[${obj.map(item => this.getStructureSignature(item)).join(',')}]`;
    }
    
    if (obj && typeof obj === 'object') {
      const keys = Object.keys(obj).sort();
      return `{${keys.map(key => `${key}:${this.getStructureSignature(obj[key])}`).join(',')}}`;
    }
    
    return typeof obj;
  }

  private static compareContent(legacy: any, consolidated: any): {
    matches: boolean;
    differences: string[];
    penalty: number;
  } {
    const differences: string[] = [];
    let penalty = 0;

    // Deep comparison logic
    if (JSON.stringify(legacy) !== JSON.stringify(consolidated)) {
      differences.push('Content differs');
      penalty = 20;
    }

    return { matches: differences.length === 0, differences, penalty };
  }
}