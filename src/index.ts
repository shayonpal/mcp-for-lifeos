#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { VaultUtils } from './vault-utils.js';
import { SearchEngine, AdvancedSearchOptions } from './search-engine.js';
import { ObsidianLinks } from './obsidian-links.js';
import { NaturalLanguageProcessor } from './natural-language-processor.js';
import { DynamicTemplateEngine } from './template-engine-dynamic.js';
import { YamlRulesManager } from './yaml-rules-manager.js';
import { ToolRouter, UniversalSearchOptions, SmartCreateNoteOptions, UniversalListOptions } from './tool-router.js';
import { LIFEOS_CONFIG } from './config.js';
import { format } from 'date-fns';
import { MCPHttpServer } from './server/http-server.js';
import { statSync } from 'fs';

// Server version - follow semantic versioning (MAJOR.MINOR.PATCH)
export const SERVER_VERSION = '1.6.0';

// Initialize YAML rules manager
const yamlRulesManager = new YamlRulesManager(LIFEOS_CONFIG);

const server = new Server(
  {
    name: 'lifeos-mcp',
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Check if consolidated tools are enabled
const CONSOLIDATED_TOOLS_ENABLED = process.env.CONSOLIDATED_TOOLS_ENABLED !== 'false'; // Default enabled

// Define available tools
const tools: Tool[] = [
  // Consolidated AI-Optimized Tools (when enabled)
  ...(CONSOLIDATED_TOOLS_ENABLED ? [
    {
      name: 'search',
      description: 'Universal search tool with intelligent auto-mode routing. Consolidates all search functionality: basic search, advanced search, quick search, content type search, recent search, and pattern matching.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query' },
          mode: { 
            type: 'string', 
            enum: ['auto', 'advanced', 'quick', 'content_type', 'recent', 'pattern'],
            description: 'Search mode - auto intelligently detects optimal strategy (default: auto)' 
          },
          // All advanced search parameters
          contentQuery: { type: 'string', description: 'Search only in note content' },
          titleQuery: { type: 'string', description: 'Search only in note titles' },
          naturalLanguage: { type: 'string', description: 'Natural language query (e.g., "Quebec barbecue restaurants")' },
          contentType: { 
            type: 'string',
            description: 'Filter by content type' 
          },
          category: { type: 'string', description: 'Filter by category' },
          subCategory: { type: 'string', description: 'Filter by sub-category' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
          people: { type: 'array', items: { type: 'string' }, description: 'Filter by people mentioned' },
          folder: { type: 'string', description: 'Filter by folder path' },
          maxResults: { type: 'number', description: 'Maximum number of results' },
          // Legacy compatibility
          dateStart: { type: 'string', description: 'Start date (YYYY-MM-DD) - legacy compatibility' },
          dateEnd: { type: 'string', description: 'End date (YYYY-MM-DD) - legacy compatibility' },
          pattern: { type: 'string', description: 'Glob pattern for pattern mode (e.g., "**/*recipe*.md")' },
          days: { type: 'number', description: 'Days back for recent search (default: 7)' }
        }
      }
    },
    {
      name: 'create_note_smart',
      description: 'Smart note creation with automatic template detection. Consolidates create_note and create_note_from_template with intelligent template routing.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          title: { type: 'string', description: 'Note title' },
          content: { type: 'string', description: 'Note content (markdown)' },
          auto_template: { type: 'boolean', description: 'Automatically detect and apply templates (default: true)' },
          template: { type: 'string', description: 'Explicit template override (restaurant, article, person, etc.)' },
          contentType: { type: 'string', description: 'Content type' },
          category: { type: 'string', description: 'Category' },
          subCategory: { type: 'string', description: 'Sub-category' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags array' },
          targetFolder: { type: 'string', description: 'Target folder path (optional)' },
          source: { type: 'string', description: 'Source URL for articles' },
          people: { type: 'array', items: { type: 'string' }, description: 'People mentioned' },
          customData: { type: 'object', description: 'Custom data for template processing' }
        },
        required: ['title']
      }
    },
    {
      name: 'list',
      description: 'Universal listing tool that consolidates folders, daily notes, templates, and YAML properties listing with auto-detection.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          type: { 
            type: 'string',
            enum: ['folders', 'daily_notes', 'templates', 'yaml_properties', 'auto'],
            description: 'Type of items to list - auto detects based on parameters'
          },
          // Type-specific parameters
          path: { type: 'string', description: 'Folder path to list (for folders)' },
          limit: { type: 'number', description: 'Limit number of results (for daily_notes)' },
          includeCount: { type: 'boolean', description: 'Include usage count (for yaml_properties)' },
          sortBy: { type: 'string', description: 'Sort method (for yaml_properties)' },
          excludeStandard: { type: 'boolean', description: 'Exclude standard properties (for yaml_properties)' }
        },
        required: ['type']
      }
    }
  ] : []),
  
  // Backward Compatibility Aliases (when consolidated tools are enabled)
  ...(CONSOLIDATED_TOOLS_ENABLED ? [
    {
      name: 'search_notes',
      description: '[LEGACY ALIAS] Use "search" tool instead. Basic search by metadata filters.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          contentType: { type: 'string', description: 'Filter by content type' },
          category: { type: 'string', description: 'Filter by category' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
          folder: { type: 'string', description: 'Filter by folder path' },
          dateStart: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          dateEnd: { type: 'string', description: 'End date (YYYY-MM-DD)' }
        }
      }
    },
    {
      name: 'advanced_search',
      description: '[LEGACY ALIAS] Use "search" tool with mode="advanced" instead. Advanced search with full-text search and metadata filters.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query' },
          naturalLanguage: { type: 'string', description: 'Natural language query' },
          contentType: { type: 'string', description: 'Filter by content type' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
          maxResults: { type: 'number', description: 'Maximum results' }
        }
      }
    },
    {
      name: 'quick_search',
      description: '[LEGACY ALIAS] Use "search" tool with mode="quick" instead. Quick text search across all notes.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query' },
          maxResults: { type: 'number', description: 'Maximum results' }
        },
        required: ['query']
      }
    },
    {
      name: 'search_by_content_type',
      description: '[LEGACY ALIAS] Use "search" tool with mode="content_type" instead. Find notes by content type.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          contentType: { type: 'string', description: 'Content type to search for' },
          maxResults: { type: 'number', description: 'Maximum results' }
        },
        required: ['contentType']
      }
    },
    {
      name: 'search_recent',
      description: '[LEGACY ALIAS] Use "search" tool with mode="recent" instead. Find recently modified notes.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          days: { type: 'number', description: 'Days back to search' },
          maxResults: { type: 'number', description: 'Maximum results' }
        }
      }
    },
    {
      name: 'find_notes_by_pattern',
      description: '[LEGACY ALIAS] Use "search" tool with mode="pattern" instead. Find notes by glob pattern.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          pattern: { type: 'string', description: 'Glob pattern' }
        },
        required: ['pattern']
      }
    },
    {
      name: 'create_note_from_template',
      description: '[LEGACY ALIAS] Use "create_note_smart" instead. Create note from template.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          title: { type: 'string', description: 'Note title' },
          template: { type: 'string', description: 'Template key' },
          customData: { type: 'object', description: 'Template-specific data' }
        },
        required: ['title', 'template']
      }
    },
    {
      name: 'list_folders',
      description: '[LEGACY ALIAS] Use "list" tool with type="folders" instead. List vault folders.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string', description: 'Folder path to list' }
        }
      }
    },
    {
      name: 'list_daily_notes',
      description: '[LEGACY ALIAS] Use "list" tool with type="daily_notes" instead. List daily notes.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          limit: { type: 'number', description: 'Limit number of results' }
        }
      }
    },
    {
      name: 'list_templates',
      description: '[LEGACY ALIAS] Use "list" tool with type="templates" instead. List available templates.',
      inputSchema: {
        type: 'object' as const,
        properties: {}
      }
    },
    {
      name: 'list_yaml_properties',
      description: '[LEGACY ALIAS] Use "list" tool with type="yaml_properties" instead. List YAML properties.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          includeCount: { type: 'boolean', description: 'Include usage count' },
          sortBy: { type: 'string', description: 'Sort method' },
          excludeStandard: { type: 'boolean', description: 'Exclude standard properties' }
        }
      }
    }
  ] : []),
  
  // Legacy/Existing Tools (always available for backward compatibility)
  {
    name: 'get_server_version',
    description: 'Get the current server version and capabilities information',
    inputSchema: {
      type: 'object',
      properties: {
        includeTools: { type: 'boolean', description: 'Include full list of available tools in the response' }
      }
    }
  },
  {
    name: 'get_yaml_rules',
    description: 'Get the user\'s YAML frontmatter rules document for reference when creating or editing note YAML',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'create_note',
    description: 'Create a new note in the LifeOS vault with proper YAML frontmatter. If YAML rules are configured, consult get_yaml_rules before modifying frontmatter.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Note title' },
        content: { type: 'string', description: 'Note content (markdown)' },
        template: { type: 'string', description: 'Template to use (restaurant, article, person, etc.)' },
        contentType: { type: 'string', description: 'Content type (Article, Daily Note, Recipe, etc.)' },
        category: { type: 'string', description: 'Category' },
        subCategory: { type: 'string', description: 'Sub-category' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags array' },
        targetFolder: { type: 'string', description: 'Target folder path (optional)' },
        source: { type: 'string', description: 'Source URL for articles' },
        people: { type: 'array', items: { type: 'string' }, description: 'People mentioned' },
        customData: { type: 'object', description: 'Custom data for template processing' }
      },
      required: ['title']
    }
  },
  {
    name: 'create_note_from_template',
    description: 'Create a note using a specific LifeOS template with auto-filled metadata. If YAML rules are configured, consult get_yaml_rules before modifying frontmatter.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Note title' },
        template: { type: 'string', description: 'Template key (restaurant, article, person, daily, etc.)' },
        customData: { 
          type: 'object', 
          description: 'Template-specific data (e.g., cuisine, location for restaurants)',
          additionalProperties: true
        }
      },
      required: ['title', 'template']
    }
  },
  {
    name: 'edit_note',
    description: 'Edit an existing note in the LifeOS vault. If YAML rules are configured, consult get_yaml_rules before modifying frontmatter.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the note file (absolute or relative to vault)' },
        title: { type: 'string', description: 'Note title (alternative to path)' },
        content: { type: 'string', description: 'New content (optional - preserves existing if not provided)' },
        frontmatter: { 
          type: 'object', 
          description: 'Frontmatter fields to update (merged with existing)',
          properties: {
            contentType: { type: 'string', description: 'Content type' },
            category: { type: 'string', description: 'Category' },
            subCategory: { type: 'string', description: 'Sub-category' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags array' },
            source: { type: 'string', description: 'Source URL' },
            people: { type: 'array', items: { type: 'string' }, description: 'People mentioned' }
          }
        },
        mode: { 
          type: 'string', 
          enum: ['merge', 'replace'], 
          description: 'Update mode: merge (default) or replace frontmatter' 
        }
      }
    }
  },
  {
    name: 'read_note',
    description: 'Read a note from the vault',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Full path to the note' }
      },
      required: ['path']
    }
  },
  {
    name: 'search_notes',
    description: 'Search notes by content type, tags, category, or date range',
    inputSchema: {
      type: 'object',
      properties: {
        contentType: { type: 'string', description: 'Filter by content type' },
        category: { type: 'string', description: 'Filter by category' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
        folder: { type: 'string', description: 'Filter by folder path' },
        dateStart: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        dateEnd: { type: 'string', description: 'End date (YYYY-MM-DD)' }
      }
    }
  },
  {
    name: 'get_daily_note',
    description: 'Get or create a daily note for a specific date',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format (optional, defaults to today)' }
      }
    }
  },
  {
    name: 'list_folders',
    description: 'List all folders in the vault following PARA structure',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Folder path to list (optional, defaults to root)' }
      }
    }
  },
  {
    name: 'find_notes_by_pattern',
    description: 'Find notes matching a glob pattern',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern (e.g., "**/*recipe*.md")' }
      },
      required: ['pattern']
    }
  },
  {
    name: 'list_daily_notes',
    description: 'List all daily notes with their full paths for debugging',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Limit number of results (optional, default 10)' }
      }
    }
  },
  {
    name: 'advanced_search',
    description: 'Advanced search with full-text search, metadata filters, and relevance scoring',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'General search query (searches title, content, and frontmatter)' },
        contentQuery: { type: 'string', description: 'Search only in note content' },
        titleQuery: { type: 'string', description: 'Search only in note titles' },
        naturalLanguage: { type: 'string', description: 'Natural language query that will be processed to extract YAML properties and filters (e.g., "Quebec barbecue restaurants")' },
        contentType: { type: 'string', description: 'Filter by content type' },
        category: { type: 'string', description: 'Filter by category' },
        subCategory: { type: 'string', description: 'Filter by sub-category' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (any match)' },
        author: { type: 'array', items: { type: 'string' }, description: 'Filter by author' },
        people: { type: 'array', items: { type: 'string' }, description: 'Filter by people mentioned' },
        yamlProperties: { type: 'object', additionalProperties: true, description: 'Filter by arbitrary YAML property key-value pairs' },
        matchMode: { type: 'string', enum: ['all', 'any'], description: 'Whether notes must match ALL yamlProperties or ANY (default: all)' },
        arrayMode: { type: 'string', enum: ['exact', 'contains', 'any'], description: 'How to match array values: exact match, contains value, or any overlap (default: contains)' },
        includeNullValues: { type: 'boolean', description: 'Include notes where YAML properties don\'t exist or are null (default: false)' },
        folder: { type: 'string', description: 'Filter by folder path' },
        excludeFolders: { type: 'array', items: { type: 'string' }, description: 'Exclude folders' },
        createdAfter: { type: 'string', description: 'Filter notes created after date (YYYY-MM-DD)' },
        createdBefore: { type: 'string', description: 'Filter notes created before date (YYYY-MM-DD)' },
        modifiedAfter: { type: 'string', description: 'Filter notes modified after date (YYYY-MM-DD)' },
        modifiedBefore: { type: 'string', description: 'Filter notes modified before date (YYYY-MM-DD)' },
        caseSensitive: { type: 'boolean', description: 'Case sensitive search (default: false)' },
        useRegex: { type: 'boolean', description: 'Use regex for search queries (default: false)' },
        includeContent: { type: 'boolean', description: 'Include content in search (default: true)' },
        maxResults: { type: 'number', description: 'Maximum number of results (default: 20)' },
        sortBy: { type: 'string', enum: ['relevance', 'created', 'modified', 'title'], description: 'Sort results by (default: relevance)' },
        sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order (default: desc for relevance, asc for others)' }
      }
    }
  },
  {
    name: 'quick_search',
    description: 'Quick text search across all notes with relevance ranking',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        maxResults: { type: 'number', description: 'Maximum results (default: 10)' }
      },
      required: ['query']
    }
  },
  {
    name: 'search_by_content_type',
    description: 'Find all notes of a specific content type',
    inputSchema: {
      type: 'object',
      properties: {
        contentType: { type: 'string', description: 'Content type to search for' },
        maxResults: { type: 'number', description: 'Maximum results (optional)' }
      },
      required: ['contentType']
    }
  },
  {
    name: 'search_recent',
    description: 'Find recently modified notes',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days back to search (default: 7)' },
        maxResults: { type: 'number', description: 'Maximum results (default: 20)' }
      }
    }
  },
  {
    name: 'diagnose_vault',
    description: 'Diagnose vault issues and check for problematic files',
    inputSchema: {
      type: 'object',
      properties: {
        checkYaml: { type: 'boolean', description: 'Check for YAML parsing errors (default: true)' },
        maxFiles: { type: 'number', description: 'Maximum files to check (default: 100)' }
      }
    }
  },
  {
    name: 'list_templates',
    description: 'List all available note templates in the LifeOS vault',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'move_items',
    description: 'Move notes and/or folders to a different location in the vault. Use either "item" for single moves or "items" for batch operations.',
    inputSchema: {
      type: 'object',
      properties: {
        items: { 
          type: 'array', 
          items: { 
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to note or folder' },
              type: { type: 'string', enum: ['note', 'folder'], description: 'Item type (auto-detected if not specified)' }
            },
            required: ['path']
          },
          description: 'Array of items to move (use this OR item, not both)'
        },
        item: {
          type: 'string',
          description: 'Single item path to move (use this OR items, not both)'
        },
        destination: { 
          type: 'string', 
          description: 'Target folder path (relative to vault root)'
        },
        createDestination: {
          type: 'boolean',
          description: 'Create destination folder if it doesn\'t exist (default: false)'
        },
        overwrite: {
          type: 'boolean',
          description: 'Overwrite existing files in destination (default: false)'
        },
        mergeFolders: {
          type: 'boolean',
          description: 'When moving folders, merge with existing folder of same name (default: false)'
        }
      },
      required: ['destination']
    }
  },
  {
    name: 'insert_content',
    description: 'Insert content at specific locations within a note based on headings, block references, or text patterns. Preserves existing content and formatting.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the note file (absolute or relative to vault)' },
        title: { type: 'string', description: 'Note title (alternative to path)' },
        content: { type: 'string', description: 'Content to insert' },
        target: { 
          type: 'object',
          description: 'Target location for insertion',
          properties: {
            heading: { type: 'string', description: 'Heading text to target (e.g., "## Today\'s Tasks")' },
            blockRef: { type: 'string', description: 'Block reference ID to target (e.g., "^block-id")' },
            pattern: { type: 'string', description: 'Text pattern to search for' },
            lineNumber: { type: 'number', description: 'Specific line number (1-based)' }
          }
        },
        position: {
          type: 'string',
          enum: ['before', 'after', 'append', 'prepend', 'end-of-section'],
          description: 'Where to insert content relative to target (default: after). Use "end-of-section" to insert at the end of a heading section.'
        },
        ensureNewline: {
          type: 'boolean',
          description: 'Ensure proper line breaks around inserted content (default: true)'
        }
      },
      required: ['content', 'target']
    }
  },
  {
    name: 'list_yaml_properties',
    description: 'List all YAML frontmatter properties used across all notes in the vault',
    inputSchema: {
      type: 'object',
      properties: {
        includeCount: { 
          type: 'boolean', 
          description: 'Include usage count for each property (default: false)'
        },
        sortBy: { 
          type: 'string',
          enum: ['alphabetical', 'usage'],
          description: 'Sort properties by name or usage count (default: alphabetical)'
        },
        excludeStandard: { 
          type: 'boolean',
          description: 'Exclude standard LifeOS properties (title, contentType, etc.) (default: false)'
        }
      }
    }
  },
  {
    name: 'list_yaml_property_values',
    description: 'List all unique values used for a specific YAML property, showing which are single values vs arrays',
    inputSchema: {
      type: 'object',
      properties: {
        property: {
          type: 'string',
          description: 'The YAML property name to analyze'
        },
        includeCount: {
          type: 'boolean',
          description: 'Include usage count for each value (default: false)'
        },
        includeExamples: {
          type: 'boolean',
          description: 'Include example note titles that use each value (default: false)'
        },
        sortBy: {
          type: 'string',
          enum: ['alphabetical', 'usage', 'type'],
          description: 'Sort values by name, usage count, or type (default: alphabetical)'
        },
        maxExamples: {
          type: 'number',
          description: 'Maximum number of example notes per value (default: 3)'
        }
      },
      required: ['property']
    }
  }
];

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error('Missing arguments');
  }

  // Add version metadata to all responses
  const addVersionMetadata = (response: any) => {
    if (!response.metadata) {
      response.metadata = {};
    }
    response.metadata.version = SERVER_VERSION;
    response.metadata.serverName = 'lifeos-mcp';
    return response;
  };
  
  try {

    switch (name) {
      // Consolidated AI-Optimized Tools
      case 'search': {
        if (!CONSOLIDATED_TOOLS_ENABLED) {
          throw new Error('Consolidated tools are disabled. Use legacy search tools instead.');
        }
        
        const searchOptions: UniversalSearchOptions = args as unknown as UniversalSearchOptions;
        
        // Note: OR queries are now handled in the ToolRouter by splitting into multiple searches
        const results = await ToolRouter.routeSearch(searchOptions);
        
        // Check if we have natural language interpretation to display
        let interpretationText = '';
        if (results.length > 0 && results[0].interpretation) {
          interpretationText = NaturalLanguageProcessor.formatInterpretation(results[0].interpretation) + '\n\n';
        }
        
        const resultText = results.map((result, index) => {
          const note = result.note;
          const score = result.score.toFixed(1);
          const matchCount = result.matches.length;
          const title = note.frontmatter.title || 'Untitled';
          
          let output = ObsidianLinks.formatSearchResult(
            index + 1,
            title,
            note.path,
            note.frontmatter['content type'] || 'Unknown',
            result.score,
            `${matchCount} matches`
          );
          
          // Show top 3 matches with context
          const topMatches = result.matches.slice(0, 3);
          if (topMatches.length > 0) {
            output += '\n\n**Matches:**\n';
            topMatches.forEach(match => {
              const type = match.type === 'frontmatter' ? `${match.type} (${match.field})` : match.type;
              output += `- *${type}*: "${match.context}"\n`;
            });
          }
          
          return output;
        }).join('\n\n---\n\n');

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `${interpretationText}Found ${results.length} results:\n\n${resultText}`
          }]
        });
      }

      case 'create_note_smart': {
        if (!CONSOLIDATED_TOOLS_ENABLED) {
          throw new Error('Consolidated tools are disabled. Use create_note or create_note_from_template instead.');
        }
        
        const createOptions: SmartCreateNoteOptions = args as unknown as SmartCreateNoteOptions;
        const templateResult = await ToolRouter.routeCreateNote(createOptions);
        
        // Generate filename, removing only Obsidian-restricted characters
        const fileName = createOptions.title
          .replace(/[\[\]:;]/g, '')        // Remove square brackets, colons, and semicolons (Obsidian limitations)
          .replace(/\s+/g, ' ')            // Normalize multiple spaces to single space
          .trim();                         // Remove leading/trailing spaces
        
        const note = VaultUtils.createNote(
          fileName, 
          templateResult.frontmatter, 
          templateResult.content, 
          templateResult.targetFolder
        );

        const obsidianLink = ObsidianLinks.createClickableLink(note.path, createOptions.title);
        
        // Determine if template was used - check templateResult structure
        const usedTemplate = createOptions.template || 
          (typeof templateResult === 'object' && templateResult.frontmatter && 
           (templateResult.frontmatter.category?.includes?.('Restaurant') || 
            templateResult.frontmatter.tags?.includes?.('restaurant'))) ? 'restaurant' : null;
        
        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `✅ Created note: **${createOptions.title}**\n\n${obsidianLink}\n\n📁 Location: \`${note.path.replace(LIFEOS_CONFIG.vaultPath + '/', '')}\`\n🔧 Smart Creation: ${usedTemplate ? `Template "${usedTemplate}" auto-detected` : 'Manual creation'}`
          }]
        });
      }

      case 'list': {
        if (!CONSOLIDATED_TOOLS_ENABLED) {
          throw new Error('Consolidated tools are disabled. Use specific list tools instead.');
        }
        
        const listOptions: UniversalListOptions = args as unknown as UniversalListOptions;
        const results = await ToolRouter.routeList(listOptions);
        
        let responseText = '';
        
        switch (listOptions.type) {
          case 'folders': {
            const folders = results as string[];
            responseText = `Folders in ${listOptions.path || 'vault root'}:\n\n${folders.map(f => `📁 ${f}`).join('\n')}`;
            break;
          }
          
          case 'daily_notes': {
            const files = results as string[];
            responseText = `Latest ${files.length} daily notes:\n\n${files.map(f => `**${f}**\n\`${LIFEOS_CONFIG.dailyNotesPath}/${f}\``).join('\n\n')}`;
            break;
          }
          
          case 'templates': {
            const templates = results as any[];
            const templateList = templates.map((template, index) => {
              return `**${index + 1}. ${template.name}** (\`${template.key}\`)\n` +
                     `   ${template.description}\n` +
                     `   📁 Target: \`${template.targetFolder || 'Auto-detect'}\`\n` +
                     `   📄 Content Type: ${template.contentType || 'Varies'}`;
            }).join('\n\n');
            
            responseText = `# Available Templates\n\n${templateList}`;
            break;
          }
          
          case 'yaml_properties': {
            const propertiesInfo = results as any;
            const sortedProperties = propertiesInfo.properties;
            
            responseText = `# YAML Properties in Vault\n\n`;
            responseText += `Found **${sortedProperties.length}** unique properties`;
            if (propertiesInfo.totalNotes) {
              responseText += ` across **${propertiesInfo.totalNotes}** notes`;
            }
            responseText += `\n\n## Properties List\n\n`;
            
            if (listOptions.includeCount && propertiesInfo.counts) {
              sortedProperties.forEach((prop: string) => {
                const count = propertiesInfo.counts[prop] || 0;
                responseText += `- **${prop}** (used in ${count} note${count !== 1 ? 's' : ''})\n`;
              });
            } else {
              sortedProperties.forEach((prop: string) => {
                responseText += `- ${prop}\n`;
              });
            }
            break;
          }
          
          default:
            responseText = `Listed ${Array.isArray(results) ? results.length : 'unknown'} items`;
        }

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: responseText
          }]
        });
      }

      // Legacy Tool Aliases (redirect to consolidated tools)
      case 'search_notes':
      case 'advanced_search':
      case 'quick_search':
      case 'search_by_content_type':
      case 'search_recent':
      case 'find_notes_by_pattern': {
        if (!CONSOLIDATED_TOOLS_ENABLED) {
          // Fall through to original implementation when consolidated tools are disabled
          break;
        }
        
        // Map legacy parameters to universal search parameters
        const searchOptions: UniversalSearchOptions = args as unknown as UniversalSearchOptions;
        
        // Determine the appropriate mode based on the legacy tool name
        if (name === 'search_notes') {
          searchOptions.mode = 'advanced'; // search_notes maps to advanced search
        } else if (name === 'advanced_search') {
          searchOptions.mode = 'advanced';
        } else if (name === 'quick_search') {
          searchOptions.mode = 'quick';
        } else if (name === 'search_by_content_type') {
          searchOptions.mode = 'content_type';
          // Map contentType parameter to query for content_type mode
          if (args.contentType && !searchOptions.query) {
            searchOptions.query = args.contentType as string;
          }
        } else if (name === 'search_recent') {
          searchOptions.mode = 'recent';
        } else if (name === 'find_notes_by_pattern') {
          searchOptions.mode = 'pattern';
          // Map pattern parameter to query for pattern mode
          if (args.pattern && !searchOptions.query) {
            searchOptions.query = args.pattern as string;
          }
        }
        
        const results = await ToolRouter.routeSearch(searchOptions);
        
        // Add deprecation warning to response
        const deprecationWarning = `⚠️ **DEPRECATION NOTICE**: The \`${name}\` tool is deprecated. Please use the \`search\` tool with mode="${searchOptions.mode}" instead for better performance and features.\n\n`;
        
        let interpretationText = '';
        if (results.length > 0 && results[0].interpretation) {
          interpretationText = NaturalLanguageProcessor.formatInterpretation(results[0].interpretation) + '\n\n';
        }
        
        const resultText = results.map((result, index) => {
          const note = result.note;
          const score = result.score.toFixed(1);
          const matchCount = result.matches.length;
          const title = note.frontmatter.title || 'Untitled';
          
          let output = ObsidianLinks.formatSearchResult(
            index + 1,
            title,
            note.path,
            note.frontmatter['content type'] || 'Unknown',
            result.score,
            `${matchCount} matches`
          );
          
          const topMatches = result.matches.slice(0, 3);
          if (topMatches.length > 0) {
            output += '\n\n**Matches:**\n';
            topMatches.forEach(match => {
              const type = match.type === 'frontmatter' ? `${match.type} (${match.field})` : match.type;
              output += `- *${type}*: "${match.context}"\n`;
            });
          }
          
          return output;
        }).join('\n\n---\n\n');

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `${deprecationWarning}${interpretationText}Found ${results.length} results:\n\n${resultText}`
          }]
        });
      }

      case 'create_note_from_template': {
        if (!CONSOLIDATED_TOOLS_ENABLED) {
          // Fall through to original implementation
          break;
        }
        
        const createOptions: SmartCreateNoteOptions = {
          title: args.title as string,
          template: args.template as string,
          customData: args.customData as Record<string, any>,
          auto_template: false // Explicit template specified
        };
        
        const templateResult = await ToolRouter.routeCreateNote(createOptions);
        
        const fileName = createOptions.title
          .replace(/[\[\]:;]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        const note = VaultUtils.createNote(
          fileName, 
          templateResult.frontmatter, 
          templateResult.content, 
          templateResult.targetFolder
        );

        const obsidianLink = ObsidianLinks.createClickableLink(note.path, createOptions.title);
        const deprecationWarning = `⚠️ **DEPRECATION NOTICE**: The \`create_note_from_template\` tool is deprecated. Please use \`create_note_smart\` instead.\n\n`;
        
        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `${deprecationWarning}✅ Created note: **${createOptions.title}**\n\n${obsidianLink}\n\n📁 Location: \`${note.path.replace(LIFEOS_CONFIG.vaultPath + '/', '')}\`\n🔧 Template: ${createOptions.template}`
          }]
        });
      }

      case 'list_folders':
      case 'list_daily_notes':
      case 'list_templates':
      case 'list_yaml_properties': {
        if (!CONSOLIDATED_TOOLS_ENABLED) {
          // Fall through to original implementation
          break;
        }
        
        // Map legacy parameters to universal list parameters
        let listType: string = 'auto';
        const listOptions: UniversalListOptions = { type: 'auto' };
        
        if (name === 'list_folders') {
          listType = 'folders';
          listOptions.type = 'folders';
          if (args.path) listOptions.path = args.path as string;
        } else if (name === 'list_daily_notes') {
          listType = 'daily_notes';
          listOptions.type = 'daily_notes';
          if (args.limit) listOptions.limit = args.limit as number;
        } else if (name === 'list_templates') {
          listType = 'templates';
          listOptions.type = 'templates';
        } else if (name === 'list_yaml_properties') {
          listType = 'yaml_properties';
          listOptions.type = 'yaml_properties';
          if (args.includeCount) listOptions.includeCount = args.includeCount as boolean;
          if (args.sortBy) listOptions.sortBy = args.sortBy as string;
          if (args.excludeStandard) listOptions.excludeStandard = args.excludeStandard as boolean;
        }
        
        const results = await ToolRouter.routeList(listOptions);
        const deprecationWarning = `⚠️ **DEPRECATION NOTICE**: The \`${name}\` tool is deprecated. Please use \`list\` with type="${listType}" instead.\n\n`;
        
        let responseText = '';
        
        switch (listOptions.type) {
          case 'folders': {
            const folders = results as string[];
            responseText = `Folders in ${listOptions.path || 'vault root'}:\n\n${folders.map(f => `📁 ${f}`).join('\n')}`;
            break;
          }
          
          case 'daily_notes': {
            const files = results as string[];
            responseText = `Latest ${files.length} daily notes:\n\n${files.map(f => `**${f}**\n\`${LIFEOS_CONFIG.dailyNotesPath}/${f}\``).join('\n\n')}`;
            break;
          }
          
          case 'templates': {
            const templates = results as any[];
            const templateList = templates.map((template, index) => {
              return `**${index + 1}. ${template.name}** (\`${template.key}\`)\n` +
                     `   ${template.description}\n` +
                     `   📁 Target: \`${template.targetFolder || 'Auto-detect'}\`\n` +
                     `   📄 Content Type: ${template.contentType || 'Varies'}`;
            }).join('\n\n');
            
            responseText = `# Available Templates\n\n${templateList}`;
            break;
          }
          
          case 'yaml_properties': {
            const propertiesInfo = results as any;
            const sortedProperties = propertiesInfo.properties;
            
            responseText = `# YAML Properties in Vault\n\n`;
            responseText += `Found **${sortedProperties.length}** unique properties`;
            if (propertiesInfo.totalNotes) {
              responseText += ` across **${propertiesInfo.totalNotes}** notes`;
            }
            responseText += `\n\n## Properties List\n\n`;
            
            if (listOptions.includeCount && propertiesInfo.counts) {
              sortedProperties.forEach((prop: string) => {
                const count = propertiesInfo.counts[prop] || 0;
                responseText += `- **${prop}** (used in ${count} note${count !== 1 ? 's' : ''})\n`;
              });
            } else {
              sortedProperties.forEach((prop: string) => {
                responseText += `- ${prop}\n`;
              });
            }
            break;
          }
        }

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `${deprecationWarning}${responseText}`
          }]
        });
      }

      case 'get_server_version': {
        const includeTools = args.includeTools as boolean;
        const templateCount = DynamicTemplateEngine.getAllTemplates().length;
        
        let response = {
          content: [{
            type: 'text',
            text: `# LifeOS MCP Server v${SERVER_VERSION}\n\n` +
                  `## Server Information\n` +
                  `- **Version:** ${SERVER_VERSION}\n` +
                  `- **Templates Available:** ${templateCount}\n` +
                  `- **Vault Path:** ${LIFEOS_CONFIG.vaultPath.replace(/^.*[\\\/]/, '')}\n\n` +
                  `## Capabilities\n` +
                  `- **Template System:** Dynamic with Templater syntax support\n` +
                  `- **Search:** Advanced full-text with metadata filtering\n` +
                  `- **Daily Notes:** Supported with auto-creation\n` +
                  `- **YAML Validation:** Strict compliance with LifeOS standards\n` +
                  `- **Obsidian Integration:** Direct vault linking\n\n` +
                  `## Version History\n` +
                  `- **1.6.0:** Advanced YAML Property Search Features - includeNullValues parameter, performance caching, enhanced sorting\n` +
                  `- **1.5.0:** Natural Language YAML Query Parsing - transform conversational queries into structured searches\n` +
                  `- **1.4.0:** Added list_yaml_property_values tool for comprehensive YAML property value analysis\n` +
                  `- **1.3.0:** Added list_yaml_properties tool to discover YAML frontmatter properties across vault\n` +
                  `- **1.2.0:** Added YAML rules integration tool for custom frontmatter guidelines\n` +
                  `- **1.1.1:** Fixed move_items tool schema to remove unsupported oneOf constraint\n` +
                  `- **1.1.0:** Added move_items tool for moving notes and folders within the vault\n` +
                  `- **1.0.2:** Fixed get_daily_note timezone issue - now uses local date instead of UTC\n` +
                  `- **1.0.1:** Fixed read_note tool to handle different tag formats (string, array, null)\n` +
                  `- **1.0.0:** Initial release with core functionality`
          }]
        };
        
        if (includeTools) {
          const toolsList = tools.map(tool => 
            `- **${tool.name}:** ${tool.description}`
          ).join('\n');
          
          response.content[0].text += `\n\n## Available Tools\n${toolsList}`;
        }
        
        return addVersionMetadata(response);
      }
      case 'get_yaml_rules': {
        if (!yamlRulesManager.isConfigured()) {
          return {
            content: [{
              type: 'text',
              text: 'YAML rules are not configured. Set the yamlRulesPath in your config to enable this feature.'
            }]
          };
        }

        try {
          const isValid = await yamlRulesManager.validateRulesFile();
          if (!isValid) {
            return {
              content: [{
                type: 'text',
                text: `YAML rules file not found or not accessible at: ${yamlRulesManager.getRulesPath()}`
              }]
            };
          }

          const rules = await yamlRulesManager.getRules();
          return {
            content: [{
              type: 'text',
              text: `# YAML Frontmatter Rules\n\n${rules}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error reading YAML rules: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
      }
      case 'create_note': {
        const title = args.title as string;
        if (!title) {
          throw new Error('Title is required');
        }

        let frontmatter: any = { title };
        let content = (args.content as string) || '';
        let targetFolder = args.targetFolder as string | undefined;

        // Check if template is specified
        if (args.template) {
          try {
            const templateResult = DynamicTemplateEngine.createNoteFromTemplate(
              args.template as string,
              title,
              (args.customData as Record<string, any>) || {}
            );
            
            frontmatter = { ...templateResult.frontmatter };
            content = templateResult.content + (content ? `\n\n${content}` : '');
            targetFolder = targetFolder || templateResult.targetFolder;
          } catch (error) {
            console.error('Template processing failed:', error);
            // Continue with manual frontmatter
          }
        }

        // Override with manually specified values
        if (args.contentType) frontmatter['content type'] = args.contentType as string;
        if (args.category) frontmatter.category = args.category as string;
        if (args.subCategory) frontmatter['sub-category'] = args.subCategory as string;
        if (args.tags) frontmatter.tags = args.tags as string[];
        if (args.source) frontmatter.source = args.source as string;
        if (args.people) frontmatter.people = args.people as string[];

        // Generate filename, removing only Obsidian-restricted characters
        const fileName = title
          .replace(/[\[\]:;]/g, '')        // Remove square brackets, colons, and semicolons (Obsidian limitations)
          .replace(/\s+/g, ' ')            // Normalize multiple spaces to single space
          .trim();                         // Remove leading/trailing spaces
        const note = VaultUtils.createNote(fileName, frontmatter, content, targetFolder);

        const obsidianLink = ObsidianLinks.createClickableLink(note.path, title);

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `✅ Created note: **${title}**\n\n${obsidianLink}\n\n📁 Location: \`${note.path.replace(LIFEOS_CONFIG.vaultPath + '/', '')}\``
          }]
        });
      }

      case 'create_note_from_template': {
        const title = args.title as string;
        const template = args.template as string;
        
        if (!title || !template) {
          throw new Error('Title and template are required');
        }

        const templateResult = DynamicTemplateEngine.createNoteFromTemplate(
          template,
          title,
          (args.customData as Record<string, any>) || {}
        );

        // Generate filename, removing only Obsidian-restricted characters
        const fileName = title
          .replace(/[\[\]:;]/g, '')        // Remove square brackets, colons, and semicolons (Obsidian limitations)
          .replace(/\s+/g, ' ')            // Normalize multiple spaces to single space
          .trim();                         // Remove leading/trailing spaces
        const note = VaultUtils.createNote(
          fileName, 
          templateResult.frontmatter, 
          templateResult.content, 
          templateResult.targetFolder
        );

        const obsidianLink = ObsidianLinks.createClickableLink(note.path, title);
        const templateInfo = DynamicTemplateEngine.getTemplate(template);

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `✅ Created **${title}** using **${templateInfo?.name || template}** template\n\n${obsidianLink}\n\n📁 Location: \`${note.path.replace(LIFEOS_CONFIG.vaultPath + '/', '')}\`\n📋 Template: ${templateInfo?.description || 'Custom template'}`
          }]
        });
      }

      case 'read_note': {
        const path = args.path as string;
        if (!path) {
          throw new Error('Path is required');
        }
        
        // Normalize path - handle escaped spaces and resolve relative paths
        let normalizedPath = path.replace(/\\ /g, ' ');
        if (!normalizedPath.startsWith('/')) {
          normalizedPath = `${LIFEOS_CONFIG.vaultPath}/${normalizedPath}`;
        }
        
        // Debug logging removed for MCP compatibility
        const note = VaultUtils.readNote(normalizedPath);
        const obsidianLink = ObsidianLinks.createClickableLink(note.path, note.frontmatter.title);
        
        // Normalize tags to array format
        const tags = VaultUtils.normalizeTagsToArray(note.frontmatter.tags);
        const tagsDisplay = tags.length > 0 ? tags.join(', ') : 'None';
        
        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `# ${note.frontmatter.title || 'Untitled'}\n\n**Path:** ${note.path}\n**Content Type:** ${note.frontmatter['content type']}\n**Tags:** ${tagsDisplay}\n\n${obsidianLink}\n\n---\n\n${note.content}`
          }]
        });
      }

      case 'edit_note': {
        // Get note path - either from direct path or by searching for title
        let notePath: string;
        
        if (args.path) {
          notePath = args.path as string;
          // Normalize path - handle escaped spaces and resolve relative paths
          notePath = notePath.replace(/\\ /g, ' ');
          if (!notePath.startsWith('/')) {
            notePath = `${LIFEOS_CONFIG.vaultPath}/${notePath}`;
          }
        } else if (args.title) {
          // Search for note by title
          const searchResults = await SearchEngine.quickSearch(args.title as string, 1);
          
          if (searchResults.length === 0) {
            throw new Error(`No note found with title: ${args.title}`);
          }
          
          notePath = searchResults[0].note.path;
        } else {
          throw new Error('Either path or title is required');
        }

        // Prepare update object
        const updates: any = {
          mode: args.mode as 'merge' | 'replace' || 'merge'
        };

        if (args.content !== undefined) {
          updates.content = args.content as string;
        }

        if (args.frontmatter) {
          const fm = args.frontmatter as any;
          updates.frontmatter = {};
          
          // Map from API field names to YAML field names
          if (fm.contentType) updates.frontmatter['content type'] = fm.contentType;
          if (fm.category) updates.frontmatter.category = fm.category;
          if (fm.subCategory) updates.frontmatter['sub-category'] = fm.subCategory;
          if (fm.tags) updates.frontmatter.tags = fm.tags;
          if (fm.source) updates.frontmatter.source = fm.source;
          if (fm.people) updates.frontmatter.people = fm.people;
          
          // Allow any other custom fields
          Object.keys(fm).forEach(key => {
            if (!['contentType', 'category', 'subCategory', 'tags', 'source', 'people'].includes(key)) {
              updates.frontmatter[key] = fm[key];
            }
          });
        }

        // Update the note
        const updatedNote = VaultUtils.updateNote(notePath, updates);
        const obsidianLink = ObsidianLinks.createClickableLink(updatedNote.path, updatedNote.frontmatter.title);
        
        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `✅ Updated note: **${updatedNote.frontmatter.title || 'Untitled'}**\n\n${obsidianLink}\n\n📁 Location: \`${updatedNote.path.replace(LIFEOS_CONFIG.vaultPath + '/', '')}\`\n📝 Mode: ${updates.mode}\n⏰ Modified: ${format(updatedNote.modified, 'yyyy-MM-dd HH:mm:ss')}`
          }]
        });
      }

      case 'search_notes': {
        const searchOptions: any = {};
        
        if (args.contentType) searchOptions.contentType = args.contentType as string;
        if (args.category) searchOptions.category = args.category as string;
        if (args.tags) searchOptions.tags = args.tags as string[];
        if (args.folder) searchOptions.folder = args.folder as string;
        if (args.dateStart || args.dateEnd) {
          searchOptions.dateRange = {};
          if (args.dateStart) searchOptions.dateRange.start = new Date(args.dateStart as string);
          if (args.dateEnd) searchOptions.dateRange.end = new Date(args.dateEnd as string);
        }

        const results = VaultUtils.searchNotes(searchOptions);
        const resultText = results.map(note => 
          `**${note.frontmatter.title || 'Untitled'}** (${note.frontmatter['content type']})\n${note.path}`
        ).join('\n\n');

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `Found ${results.length} notes:\n\n${resultText}`
          }]
        });
      }

      case 'get_daily_note': {
        // Use VaultUtils.getLocalDate to ensure proper timezone handling
        const date = VaultUtils.getLocalDate(args.date as string | undefined);
        let note = await VaultUtils.getDailyNote(date);
        
        if (!note) {
          note = VaultUtils.createDailyNote(date);
        }

        const obsidianLink = ObsidianLinks.createClickableLink(note.path, `Daily Note: ${format(date, 'MMMM dd, yyyy')}`);
        
        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `# Daily Note: ${format(date, 'MMMM dd, yyyy')}\n\n**Path:** ${note.path}\n\n${obsidianLink}\n\n---\n\n${note.content}`
          }]
        });
      }

      case 'list_folders': {
        const basePath = (args.path as string) || '';
        const fullPath = basePath ? 
          `${LIFEOS_CONFIG.vaultPath}/${basePath}` : 
          LIFEOS_CONFIG.vaultPath;

        const { readdirSync, statSync } = await import('fs');
        const items = readdirSync(fullPath)
          .filter(item => statSync(`${fullPath}/${item}`).isDirectory())
          .map(item => `📁 ${item}`)
          .join('\n');

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `Folders in ${basePath || 'vault root'}:\n\n${items}`
          }]
        });
      }

      case 'find_notes_by_pattern': {
        const pattern = args.pattern as string;
        if (!pattern) {
          throw new Error('Pattern is required');
        }
        const files = await VaultUtils.findNotes(pattern);
        const fileList = files.map(file => file.replace(LIFEOS_CONFIG.vaultPath + '/', '')).join('\n');

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `Found ${files.length} files matching "${args.pattern}":\n\n${fileList}`
          }]
        });
      }

      case 'list_daily_notes': {
        const limit = (args.limit as number) || 10;
        const { readdirSync } = await import('fs');
        
        try {
          const files = readdirSync(LIFEOS_CONFIG.dailyNotesPath)
            .filter(file => file.endsWith('.md'))
            .sort()
            .slice(-limit)
            .map(file => {
              const fullPath = `${LIFEOS_CONFIG.dailyNotesPath}/${file}`;
              return `**${file}**\n\`${fullPath}\``;
            });

          return addVersionMetadata({
            content: [{
              type: 'text',
              text: `Latest ${files.length} daily notes:\n\n${files.join('\n\n')}`
            }]
          });
        } catch (error) {
          return addVersionMetadata({
            content: [{
              type: 'text',
              text: `Error accessing daily notes directory: ${error}`
            }],
            isError: true
          });
        }
      }

      case 'advanced_search': {
        const searchOptions: AdvancedSearchOptions = {};
        
        // Text queries - handle OR operations
        if (args.query) {
          const query = args.query as string;
          // Convert OR operations to regex for better handling
          if (query.toLowerCase().includes(' or ')) {
            const orTerms = query.split(/\s+or\s+/i).map(term => term.trim().replace(/"/g, ''));
            searchOptions.query = orTerms.join('|');
            searchOptions.useRegex = true;
          } else {
            searchOptions.query = query;
          }
        }
        if (args.contentQuery) searchOptions.contentQuery = args.contentQuery as string;
        if (args.titleQuery) searchOptions.titleQuery = args.titleQuery as string;
        if (args.naturalLanguage) searchOptions.naturalLanguage = args.naturalLanguage as string;
        
        // Metadata filters
        if (args.contentType) searchOptions.contentType = args.contentType as string;
        if (args.category) searchOptions.category = args.category as string;
        if (args.subCategory) searchOptions.subCategory = args.subCategory as string;
        if (args.tags) searchOptions.tags = args.tags as string[];
        if (args.author) searchOptions.author = args.author as string[];
        if (args.people) searchOptions.people = args.people as string[];
        if (args.yamlProperties) searchOptions.yamlProperties = args.yamlProperties as Record<string, any>;
        if (args.matchMode) searchOptions.matchMode = args.matchMode as 'all' | 'any';
        if (args.arrayMode) searchOptions.arrayMode = args.arrayMode as 'exact' | 'contains' | 'any';
        if (args.includeNullValues !== undefined) searchOptions.includeNullValues = args.includeNullValues as boolean;
        
        // Location filters
        if (args.folder) searchOptions.folder = args.folder as string;
        if (args.excludeFolders) searchOptions.excludeFolders = args.excludeFolders as string[];
        
        // Date filters
        if (args.createdAfter) searchOptions.createdAfter = new Date(args.createdAfter as string);
        if (args.createdBefore) searchOptions.createdBefore = new Date(args.createdBefore as string);
        if (args.modifiedAfter) searchOptions.modifiedAfter = new Date(args.modifiedAfter as string);
        if (args.modifiedBefore) searchOptions.modifiedBefore = new Date(args.modifiedBefore as string);
        
        // Search options
        if (args.caseSensitive) searchOptions.caseSensitive = args.caseSensitive as boolean;
        if (args.useRegex) searchOptions.useRegex = args.useRegex as boolean;
        if (args.includeContent !== undefined) searchOptions.includeContent = args.includeContent as boolean;
        if (args.maxResults) searchOptions.maxResults = args.maxResults as number;
        if (args.sortBy) searchOptions.sortBy = args.sortBy as any;
        if (args.sortOrder) searchOptions.sortOrder = args.sortOrder as any;

        const results = await SearchEngine.search(searchOptions);
        
        // Check if we have natural language interpretation to display
        let interpretationText = '';
        if (results.length > 0 && results[0].interpretation) {
          interpretationText = NaturalLanguageProcessor.formatInterpretation(results[0].interpretation) + '\n\n';
        }
        
        const resultText = results.map((result, index) => {
          const note = result.note;
          const score = result.score.toFixed(1);
          const matchCount = result.matches.length;
          const title = note.frontmatter.title || 'Untitled';
          
          let output = ObsidianLinks.formatSearchResult(
            index + 1,
            title,
            note.path,
            note.frontmatter['content type'] || 'Unknown',
            result.score,
            `${matchCount} matches`
          );
          
          // Show top 3 matches with context
          const topMatches = result.matches.slice(0, 3);
          if (topMatches.length > 0) {
            output += '\n\n**Matches:**\n';
            topMatches.forEach(match => {
              const type = match.type === 'frontmatter' ? `${match.type} (${match.field})` : match.type;
              output += `- *${type}*: "${match.context}"\n`;
            });
          }
          
          return output;
        }).join('\n\n---\n\n');

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `${interpretationText}Found ${results.length} results:\n\n${resultText}`
          }]
        });
      }

      case 'quick_search': {
        const query = args.query as string;
        const maxResults = (args.maxResults as number) || 10;
        
        const results = await SearchEngine.quickSearch(query, maxResults);
        
        const resultText = results.map((result, index) => {
          const note = result.note;
          const topMatch = result.matches[0];
          const title = note.frontmatter.title || 'Untitled';
          
          let output = ObsidianLinks.formatSearchResult(
            index + 1,
            title,
            note.path,
            note.frontmatter['content type'] || 'Unknown'
          );
          
          if (topMatch) {
            output += `\n\n**Preview:** "${topMatch.context}"`;
          }
          
          return output;
        }).join('\n\n---\n\n');

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `Quick search results for "${query}":\n\n${resultText}`
          }]
        });
      }

      case 'search_by_content_type': {
        const contentType = args.contentType as string;
        const maxResults = args.maxResults as number | undefined;
        
        const results = await SearchEngine.searchByContentType(contentType, maxResults);
        
        const resultText = results.map((result, index) => {
          const note = result.note;
          const modifiedDate = format(note.modified, 'MMM dd, yyyy');
          const title = note.frontmatter.title || 'Untitled';
          
          return ObsidianLinks.formatSearchResult(
            index + 1,
            title,
            note.path,
            note.frontmatter['content type'] || 'Unknown',
            undefined,
            `Modified: ${modifiedDate}`
          );
        }).join('\n\n---\n\n');

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `Found ${results.length} notes with content type "${contentType}":\n\n${resultText}`
          }]
        });
      }

      case 'search_recent': {
        const days = (args.days as number) || 7;
        const maxResults = (args.maxResults as number) || 20;
        
        const results = await SearchEngine.searchRecent(days, maxResults);
        
        const resultText = results.map((result, index) => {
          const note = result.note;
          const modifiedDate = format(note.modified, 'MMM dd, yyyy HH:mm');
          const title = note.frontmatter.title || 'Untitled';
          
          return ObsidianLinks.formatSearchResult(
            index + 1,
            title,
            note.path,
            note.frontmatter['content type'] || 'Unknown',
            undefined,
            `Modified: ${modifiedDate}`
          );
        }).join('\n\n---\n\n');

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `Found ${results.length} notes modified in the last ${days} days:\n\n${resultText}`
          }]
        });
      }

      case 'diagnose_vault': {
        const checkYaml = (args.checkYaml as boolean) !== false; // Default true
        const maxFiles = (args.maxFiles as number) || 100;
        
        const files = await VaultUtils.findNotes('**/*.md');
        const filesToCheck = files.slice(0, maxFiles);
        
        let totalFiles = filesToCheck.length;
        let successfulFiles = 0;
        let problematicFiles: string[] = [];
        let yamlErrors: { file: string, error: string }[] = [];
        
        for (const file of filesToCheck) {
          try {
            const note = VaultUtils.readNote(file);
            successfulFiles++;
            
            // Check for common YAML issues
            if (checkYaml && note.frontmatter) {
              const frontmatterStr = JSON.stringify(note.frontmatter);
              if (frontmatterStr.includes('undefined') || frontmatterStr.includes('null')) {
                yamlErrors.push({ file: file.replace(LIFEOS_CONFIG.vaultPath + '/', ''), error: 'Contains undefined/null values' });
              }
            }
          } catch (error) {
            problematicFiles.push(file.replace(LIFEOS_CONFIG.vaultPath + '/', ''));
            yamlErrors.push({ 
              file: file.replace(LIFEOS_CONFIG.vaultPath + '/', ''), 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
        }
        
        let diagnosticText = `# Vault Diagnostic Report\n\n`;
        diagnosticText += `**Files Checked:** ${totalFiles}\n`;
        diagnosticText += `**Successfully Parsed:** ${successfulFiles}\n`;
        diagnosticText += `**Problematic Files:** ${problematicFiles.length}\n\n`;
        
        if (problematicFiles.length > 0) {
          diagnosticText += `## Problematic Files\n\n`;
          yamlErrors.slice(0, 10).forEach((error, index) => {
            diagnosticText += `${index + 1}. **${error.file}**\n   Error: ${error.error}\n\n`;
          });
          
          if (yamlErrors.length > 10) {
            diagnosticText += `... and ${yamlErrors.length - 10} more files with issues.\n\n`;
          }
        }
        
        diagnosticText += `## Recommendations\n\n`;
        if (problematicFiles.length > 0) {
          diagnosticText += `- Fix YAML frontmatter in problematic files\n`;
          diagnosticText += `- Check for unescaped special characters in YAML\n`;
          diagnosticText += `- Ensure proper indentation and syntax\n`;
        } else {
          diagnosticText += `✅ All checked files are parsing correctly!\n`;
        }
        
        return addVersionMetadata({
          content: [{
            type: 'text',
            text: diagnosticText
          }]
        });
      }

      case 'list_templates': {
        const templates = DynamicTemplateEngine.getAllTemplates();
        
        const templateList = templates.map((template, index) => {
          return `**${index + 1}. ${template.name}** (\`${template.key}\`)\n` +
                 `   ${template.description}\n` +
                 `   📁 Target: \`${template.targetFolder || 'Auto-detect'}\`\n` +
                 `   📄 Content Type: ${template.contentType || 'Varies'}`;
        }).join('\n\n');

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `# Available Templates\n\n${templateList}\n\n## Usage Examples\n\n` +
                  `• \`create_note_from_template\` with template: "restaurant"\n` +
                  `• \`create_note\` with template: "article"\n` +
                  `• \`create_note_from_template\` with template: "person"\n\n` +
                  `**Pro tip:** I can auto-detect the right template based on your note title and content!`
          }]
        });
      }

      case 'move_items': {
        const destination = args.destination as string;
        if (!destination) {
          throw new Error('Destination is required');
        }

        // Collect items to move
        const itemsToMove: Array<{ path: string; type?: string }> = [];
        
        if (args.item) {
          itemsToMove.push({ path: args.item as string });
        } else if (args.items && Array.isArray(args.items)) {
          itemsToMove.push(...(args.items as Array<{ path: string; type?: string }>));
        } else {
          throw new Error('Either item or items must be provided');
        }

        if (itemsToMove.length === 0) {
          throw new Error('No items specified to move');
        }

        const options = {
          createDestination: args.createDestination as boolean || false,
          overwrite: args.overwrite as boolean || false,
          mergeFolders: args.mergeFolders as boolean || false
        };

        const results = {
          moved: { notes: [] as string[], folders: [] as string[] },
          failed: [] as Array<{ path: string; type: string; reason: string }>
        };

        for (const item of itemsToMove) {
          const result = VaultUtils.moveItem(item.path, destination, options);
          
          if (result.success) {
            const relativePath = result.newPath.replace(LIFEOS_CONFIG.vaultPath + '/', '');
            
            try {
              const isDirectory = statSync(result.newPath).isDirectory();
              if (isDirectory) {
                results.moved.folders.push(relativePath);
              } else {
                results.moved.notes.push(relativePath);
              }
            } catch (error) {
              // If we can't stat the file, assume it's a note
              results.moved.notes.push(relativePath);
            }
          } else {
            results.failed.push({
              path: item.path,
              type: item.type || 'unknown',
              reason: result.error || 'Unknown error'
            });
          }
        }

        // Generate response
        let response = `# Move Operation Results\n\n`;
        
        if (results.moved.notes.length > 0 || results.moved.folders.length > 0) {
          response += `## ✅ Successfully Moved\n\n`;
          
          if (results.moved.folders.length > 0) {
            response += `**Folders (${results.moved.folders.length}):**\n`;
            results.moved.folders.forEach(f => response += `- 📁 ${f}\n`);
            response += '\n';
          }
          
          if (results.moved.notes.length > 0) {
            response += `**Notes (${results.moved.notes.length}):**\n`;
            results.moved.notes.forEach(n => response += `- 📄 ${n}\n`);
            response += '\n';
          }
        }
        
        if (results.failed.length > 0) {
          response += `## ❌ Failed Moves\n\n`;
          results.failed.forEach(f => {
            response += `- **${f.path}**: ${f.reason}\n`;
          });
          response += '\n';
        }
        
        response += `**Destination:** \`${destination}\``;

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: response
          }]
        });
      }

      case 'insert_content': {
        // Get note path - either from direct path or by searching for title
        let notePath: string;
        
        if (args.path) {
          notePath = args.path as string;
          // Normalize path - handle escaped spaces and resolve relative paths
          notePath = notePath.replace(/\\ /g, ' ');
          if (!notePath.startsWith('/')) {
            notePath = `${LIFEOS_CONFIG.vaultPath}/${notePath}`;
          }
        } else if (args.title) {
          // Search for note by title
          const searchResults = await SearchEngine.quickSearch(args.title as string, 1);
          
          if (searchResults.length === 0) {
            throw new Error(`No note found with title: ${args.title}`);
          }
          
          notePath = searchResults[0].note.path;
        } else {
          throw new Error('Either path or title is required');
        }

        // Validate required parameters
        const content = args.content as string;
        const target = args.target as any;
        
        if (!content) {
          throw new Error('Content is required');
        }
        
        if (!target || typeof target !== 'object') {
          throw new Error('Target is required and must be an object');
        }
        
        // Validate target has at least one valid field
        if (!target.heading && !target.blockRef && !target.pattern && !target.lineNumber) {
          throw new Error('Target must specify at least one of: heading, blockRef, pattern, or lineNumber');
        }
        
        // Get optional parameters
        const position = (args.position as 'before' | 'after' | 'append' | 'prepend' | 'end-of-section') || 'after';
        const ensureNewline = args.ensureNewline !== false; // Default true
        
        // Perform the insertion
        let updatedNote;
        try {
          updatedNote = VaultUtils.insertContent(
            notePath,
            content,
            target,
            position,
            ensureNewline
          );
        } catch (insertError) {
          throw insertError;
        }
        
        try {
          const obsidianLink = ObsidianLinks.createClickableLink(updatedNote.path, updatedNote.frontmatter.title);
          
          // Build target description
          let targetDesc = '';
          if (target.heading) targetDesc = `heading "${target.heading}"`;
          else if (target.blockRef) targetDesc = `block reference "${target.blockRef}"`;
          else if (target.pattern) targetDesc = `pattern "${target.pattern}"`;
          else if (target.lineNumber) targetDesc = `line ${target.lineNumber}`;
          
          const formattedDate = format(updatedNote.modified, 'yyyy-MM-dd HH:mm:ss');
          
          const response = addVersionMetadata({
            content: [{
              type: 'text',
              text: `✅ Inserted content in **${updatedNote.frontmatter.title || 'Untitled'}**\n\n` +
                    `${obsidianLink}\n\n` +
                    `📁 Location: \`${updatedNote.path.replace(LIFEOS_CONFIG.vaultPath + '/', '')}\`\n` +
                    `🎯 Target: ${targetDesc}\n` +
                    `📍 Position: ${position}\n` +
                    `⏰ Modified: ${formattedDate}`
            }]
          });
          
          return response;
        } catch (responseError) {
          throw new Error(`Failed to generate response: ${responseError instanceof Error ? responseError.message : String(responseError)}`);
        }
      }

      case 'list_yaml_properties': {
        const includeCount = args.includeCount as boolean || false;
        const sortBy = args.sortBy as 'alphabetical' | 'usage' || 'alphabetical';
        const excludeStandard = args.excludeStandard as boolean || false;

        // Get all YAML properties from the vault
        const propertiesInfo = VaultUtils.getAllYamlProperties({
          includeCount,
          excludeStandard
        });

        // Sort the properties
        let sortedProperties = propertiesInfo.properties;
        if (sortBy === 'usage' && includeCount) {
          sortedProperties = sortedProperties.sort((a, b) => 
            (propertiesInfo.counts?.[b] || 0) - (propertiesInfo.counts?.[a] || 0)
          );
        } else {
          sortedProperties = sortedProperties.sort((a, b) => 
            a.toLowerCase().localeCompare(b.toLowerCase())
          );
        }

        // Format the response
        let responseText = `# YAML Properties in Vault\n\n`;
        responseText += `Found **${sortedProperties.length}** unique properties`;
        if (propertiesInfo.totalNotes) {
          responseText += ` across **${propertiesInfo.totalNotes}** notes`;
        }
        responseText += `\n\n`;

        // Show scan statistics
        responseText += `## Scan Statistics\n`;
        responseText += `- **Files scanned**: ${propertiesInfo.scannedFiles || 0}\n`;
        if (propertiesInfo.skippedFiles && propertiesInfo.skippedFiles > 0) {
          responseText += `- **Files skipped**: ${propertiesInfo.skippedFiles} (malformed YAML or read errors)\n`;
        }
        responseText += `- **Notes with frontmatter**: ${propertiesInfo.totalNotes || 0}\n\n`;

        if (excludeStandard) {
          responseText += `*Standard LifeOS properties excluded*\n\n`;
        }

        responseText += `## Properties List\n\n`;

        if (includeCount && propertiesInfo.counts) {
          // Show properties with usage counts
          sortedProperties.forEach(prop => {
            const count = propertiesInfo.counts![prop] || 0;
            responseText += `- **${prop}** (used in ${count} note${count !== 1 ? 's' : ''})\n`;
          });
        } else {
          // Simple list
          sortedProperties.forEach(prop => {
            responseText += `- ${prop}\n`;
          });
        }

        const response = addVersionMetadata({
          content: [{
            type: 'text',
            text: responseText
          }]
        });

        return response;
      }

      case 'list_yaml_property_values': {
        const property = args.property as string;
        if (!property) {
          throw new Error('Property is required');
        }

        // Get options
        const options = {
          includeCount: args.includeCount as boolean || false,
          includeExamples: args.includeExamples as boolean || false,
          sortBy: args.sortBy as 'alphabetical' | 'usage' | 'type' || 'alphabetical',
          maxExamples: args.maxExamples as number || 3
        };

        // Get all values for the specified property
        const propertyInfo = VaultUtils.getYamlPropertyValues(property, options);

        // Format the response
        let responseText = `# YAML Property Values: "${property}"\n\n`;
        
        if (propertyInfo.totalNotes === 0) {
          responseText += `**No notes found** using property "${property}"\n\n`;
        } else {
          responseText += `Found property "${property}" in **${propertyInfo.totalNotes}** notes\n\n`;
        }

        // Show scan statistics
        responseText += `## Scan Statistics\n`;
        responseText += `- **Files scanned**: ${propertyInfo.scannedFiles}\n`;
        if (propertyInfo.skippedFiles > 0) {
          responseText += `- **Files skipped**: ${propertyInfo.skippedFiles} (malformed YAML or read errors)\n`;
        }
        responseText += `- **Notes with "${property}"**: ${propertyInfo.totalNotes}\n\n`;

        if (propertyInfo.totalNotes > 0) {
          // Show value analysis
          responseText += `## Value Type Analysis\n\n`;

          // Single values
          if (propertyInfo.values.single.length > 0) {
            const uniqueSingleValues = Array.from(new Set(propertyInfo.values.single.map(v => String(v))));
            responseText += `**Single Values** (${uniqueSingleValues.length} unique, ${propertyInfo.values.single.length} total uses):\n`;
            
            uniqueSingleValues.forEach(value => {
              const count = propertyInfo.values.single.filter(v => String(v) === value).length;
              responseText += `- "${value}" (used in ${count} note${count !== 1 ? 's' : ''})\n`;
              
              // Add examples if requested
              if (options.includeExamples && propertyInfo.valueExamples && propertyInfo.valueExamples[value]) {
                const examples = propertyInfo.valueExamples[value];
                responseText += `  Examples: ${examples.map(e => `"${e}"`).join(', ')}\n`;
              }
            });
            responseText += '\n';
          }

          // Array values
          if (propertyInfo.values.array.length > 0) {
            const uniqueArrayValues = Array.from(new Set(propertyInfo.values.array.map(arr => JSON.stringify(arr))));
            responseText += `**Array Values** (${uniqueArrayValues.length} unique combinations, ${propertyInfo.values.array.length} total uses):\n`;
            
            uniqueArrayValues.forEach(arrayStr => {
              const arrayValue = JSON.parse(arrayStr);
              const count = propertyInfo.values.array.filter(arr => JSON.stringify(arr) === arrayStr).length;
              responseText += `- [${arrayValue.map((v: any) => `"${v}"`).join(', ')}] (used in ${count} note${count !== 1 ? 's' : ''})\n`;
              
              // Add examples if requested
              if (options.includeExamples && propertyInfo.valueExamples && propertyInfo.valueExamples[arrayStr]) {
                const examples = propertyInfo.valueExamples[arrayStr];
                responseText += `  Examples: ${examples.map(e => `"${e}"`).join(', ')}\n`;
              }
            });
            responseText += '\n';
          }

          // Unique individual values across all formats
          if (propertyInfo.values.uniqueValues.length > 0) {
            responseText += `**All Unique Values** (across single and array formats):\n`;
            
            if (options.sortBy === 'usage' && options.includeCount && propertyInfo.valueCounts) {
              // Already sorted by usage if that option was selected
              propertyInfo.values.uniqueValues.forEach(value => {
                const totalCount = propertyInfo.valueCounts![value] || 0;
                const singleCount = propertyInfo.values.single.filter(v => String(v) === value).length;
                const arrayCount = totalCount - singleCount;
                
                let usageDetails = [];
                if (singleCount > 0) usageDetails.push(`${singleCount} single`);
                if (arrayCount > 0) usageDetails.push(`${arrayCount} in arrays`);
                
                responseText += `- "${value}" (${totalCount} total uses: ${usageDetails.join(', ')})\n`;
              });
            } else {
              propertyInfo.values.uniqueValues.forEach(value => {
                const singleCount = propertyInfo.values.single.filter(v => String(v) === value).length;
                const arrayCount = propertyInfo.values.array.filter(arr => arr.some(item => String(item) === value)).length;
                const totalUses = singleCount + arrayCount;
                
                let usageDetails = [];
                if (singleCount > 0) usageDetails.push(`${singleCount} single`);
                if (arrayCount > 0) usageDetails.push(`${arrayCount} in arrays`);
                
                responseText += `- "${value}" (${totalUses} total uses: ${usageDetails.join(', ')})\n`;
              });
            }
            
            // Add sorting information
            if (options.sortBy !== 'alphabetical') {
              responseText += `\n*Sorted by: ${options.sortBy}*\n`;
            }
          }
        }

        const response = addVersionMetadata({
          content: [{
            type: 'text',
            text: responseText
          }]
        });

        return response;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return addVersionMetadata({
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    });
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Start HTTP server if web interface is explicitly enabled
  const enableWebInterface = process.env.ENABLE_WEB_INTERFACE === 'true';
  if (enableWebInterface) {
    try {
      const httpServer = new MCPHttpServer({
        host: process.env.WEB_HOST || '0.0.0.0',
        port: parseInt(process.env.WEB_PORT || '19831'),
      }, server); // Pass the MCP server instance
      await httpServer.start();
    } catch (error) {
      // Silently continue without web interface
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {
    // Exit silently on error to avoid interfering with MCP protocol
    process.exit(1);
  });
}