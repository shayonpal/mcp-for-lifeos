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
import { DynamicTemplateEngine } from './template-engine-dynamic.js';
import { YamlRulesManager } from './yaml-rules-manager.js';
import { LIFEOS_CONFIG } from './config.js';
import { format } from 'date-fns';
import { MCPHttpServer } from './server/http-server.js';
import { statSync } from 'fs';

// Server version - follow semantic versioning (MAJOR.MINOR.PATCH)
export const SERVER_VERSION = '1.2.0';

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

// Define available tools
const tools: Tool[] = [
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
        contentType: { type: 'string', description: 'Filter by content type' },
        category: { type: 'string', description: 'Filter by category' },
        subCategory: { type: 'string', description: 'Filter by sub-category' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (any match)' },
        author: { type: 'array', items: { type: 'string' }, description: 'Filter by author' },
        people: { type: 'array', items: { type: 'string' }, description: 'Filter by people mentioned' },
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
        
        // Metadata filters
        if (args.contentType) searchOptions.contentType = args.contentType as string;
        if (args.category) searchOptions.category = args.category as string;
        if (args.subCategory) searchOptions.subCategory = args.subCategory as string;
        if (args.tags) searchOptions.tags = args.tags as string[];
        if (args.author) searchOptions.author = args.author as string[];
        if (args.people) searchOptions.people = args.people as string[];
        
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
            text: `Found ${results.length} results:\n\n${resultText}`
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