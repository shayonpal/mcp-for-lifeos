#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { VaultUtils } from './vault-utils.js';
import { LIFEOS_CONFIG } from './config.js';
import { format } from 'date-fns';

const server = new Server(
  {
    name: 'lifeos-mcp',
    version: '1.0.0',
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
    name: 'create_note',
    description: 'Create a new note in the LifeOS vault with proper YAML frontmatter',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Note title' },
        content: { type: 'string', description: 'Note content (markdown)' },
        contentType: { type: 'string', description: 'Content type (Article, Daily Note, Recipe, etc.)' },
        category: { type: 'string', description: 'Category' },
        subCategory: { type: 'string', description: 'Sub-category' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags array' },
        targetFolder: { type: 'string', description: 'Target folder path (optional)' },
        source: { type: 'string', description: 'Source URL for articles' },
        people: { type: 'array', items: { type: 'string' }, description: 'People mentioned' }
      },
      required: ['title']
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

  try {
    switch (name) {
      case 'create_note': {
        const title = args.title as string;
        if (!title) {
          throw new Error('Title is required');
        }

        const frontmatter: any = { title };

        if (args.contentType) frontmatter['content type'] = args.contentType as string;
        if (args.category) frontmatter.category = args.category as string;
        if (args.subCategory) frontmatter['sub-category'] = args.subCategory as string;
        if (args.tags) frontmatter.tags = args.tags as string[];
        if (args.source) frontmatter.source = args.source as string;
        if (args.people) frontmatter.people = args.people as string[];

        const fileName = title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-');
        const note = VaultUtils.createNote(
          fileName,
          frontmatter,
          (args.content as string) || '',
          args.targetFolder as string | undefined
        );

        return {
          content: [{
            type: 'text',
            text: `Created note: ${note.path}`
          }]
        };
      }

      case 'read_note': {
        const path = args.path as string;
        if (!path) {
          throw new Error('Path is required');
        }
        const note = VaultUtils.readNote(path);
        return {
          content: [{
            type: 'text',
            text: `# ${note.frontmatter.title || 'Untitled'}\n\n**Path:** ${note.path}\n**Content Type:** ${note.frontmatter['content type']}\n**Tags:** ${note.frontmatter.tags?.join(', ') || 'None'}\n\n---\n\n${note.content}`
          }]
        };
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

        return {
          content: [{
            type: 'text',
            text: `Found ${results.length} notes:\n\n${resultText}`
          }]
        };
      }

      case 'get_daily_note': {
        const date = args.date ? new Date(args.date as string) : new Date();
        let note = await VaultUtils.getDailyNote(date);
        
        if (!note) {
          note = VaultUtils.createDailyNote(date);
        }

        return {
          content: [{
            type: 'text',
            text: `# Daily Note: ${format(date, 'MMMM dd, yyyy')}\n\n**Path:** ${note.path}\n\n---\n\n${note.content}`
          }]
        };
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

        return {
          content: [{
            type: 'text',
            text: `Folders in ${basePath || 'vault root'}:\n\n${items}`
          }]
        };
      }

      case 'find_notes_by_pattern': {
        const pattern = args.pattern as string;
        if (!pattern) {
          throw new Error('Pattern is required');
        }
        const files = await VaultUtils.findNotes(pattern);
        const fileList = files.map(file => file.replace(LIFEOS_CONFIG.vaultPath + '/', '')).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${files.length} files matching "${args.pattern}":\n\n${fileList}`
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('LifeOS MCP Server running on stdio');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}