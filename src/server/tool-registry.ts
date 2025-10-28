/**
 * Tool Registry Module
 *
 * Centralizes all MCP tool definitions and registration logic.
 * Provides functions to assemble tools based on mode configuration.
 *
 * @module server/tool-registry
 * @see https://linear.app/agilecode-studio/issue/MCP-7/extract-tool-registry
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolMode } from '../../dev/contracts/MCP-6-contracts.js';
import type {
  ToolRegistryConfig,
  VersionedResponse,
  ConsolidatedTools,
  LegacyTools,
  LegacyAliases,
  AlwaysAvailableTools,
  GetConsolidatedToolsFunction,
  GetLegacyToolsFunction,
  GetLegacyAliasesFunction,
  GetAlwaysAvailableToolsFunction,
  GetToolsForModeFunction,
  AddVersionMetadataFunction
} from '../../dev/contracts/MCP-7-contracts.js';

// No additional imports needed - all metadata comes from config

/**
 * Get consolidated AI-optimized tools (3 tools)
 * These are the modern, unified tools with auto-mode detection
 *
 * Tools included:
 * - search: Universal search with mode routing
 * - create_note: Smart note creation with template detection
 * - list: Universal listing with type detection
 *
 * @returns Array of 3 consolidated tool definitions
 */
export const getConsolidatedTools: GetConsolidatedToolsFunction = () => {
  return [
    {
      name: 'search',
      description: `Universal search tool with intelligent auto-mode routing. Consolidates all search functionality: basic search, advanced search, quick search, content type search, recent search, and pattern matching.

WHEN TO USE:
- Find notes by content/metadata: mode="advanced", query="meeting notes"
- Recent activity discovery: mode="recent", days=7
- File pattern matching: mode="pattern", pattern="**/*recipe*.md"

RETURNS: Array of SearchResult objects with path, title, excerpt, relevance score, and frontmatter metadata

TITLE EXTRACTION: Search result titles are determined by priority:
1. YAML frontmatter 'title' field (if present and non-empty)
2. Formatted date for daily notes (e.g., "August 30, 2025" for 2025-08-30.md)
3. Title-cased filename for regular notes (e.g., "My Project Note" for my-project-note.md)`,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
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
          maxResults: {
            type: 'number',
            description: 'Maximum number of results (1-100, default: 25)',
            minimum: 1,
            maximum: 100,
            default: 25
          },
          // Legacy compatibility
          dateStart: { type: 'string', description: 'Start date (YYYY-MM-DD) - legacy compatibility' },
          dateEnd: { type: 'string', description: 'End date (YYYY-MM-DD) - legacy compatibility' },
          pattern: { type: 'string', description: 'Glob pattern for pattern mode (e.g., "**/*recipe*.md")' },
          days: { type: 'number', description: 'Days back for recent search (default: 7)' },
          format: {
            type: 'string',
            enum: ['concise', 'detailed'],
            description: 'Response format: concise (paths only, ~50-100 tokens/result) or detailed (full metadata, ~200-500 tokens/result, default: detailed)'
          }
        }
      }
    },
    {
      name: 'create_note',
      description: `Create a new note in the LifeOS vault with automatic template detection and proper YAML frontmatter.

WHEN TO USE:
- Restaurant/person/article auto-detection: auto_template=true, title includes keywords
- Explicit template selection: template="tpl-restaurant", customData provided
- Manual note creation without templates: auto_template=false, content provided

RETURNS: Success message with created note path and applied template name`,
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
      description: `Universal listing tool that consolidates folders, daily notes, templates, and YAML properties listing with auto-detection.

WHEN TO USE:
- Browse vault folder structure: type="folders", path="Projects"
- Discover available templates: type="templates"
- List daily notes: type="daily_notes", limit=10

RETURNS: Type-specific arrays: folder paths, template list, daily note paths, or YAML property names`,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
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
          excludeStandard: { type: 'boolean', description: 'Exclude standard properties (for yaml_properties)' },
          format: {
            type: 'string',
            enum: ['concise', 'detailed'],
            description: 'Response format: concise (minimal fields) or detailed (full metadata, default: detailed)'
          }
        },
        required: ['type']
      }
    }
  ] as const;
};

// ============================================================================
// LEGACY TOOL DEFINITIONS (Shared between legacy tools and aliases)
// ============================================================================

/**
 * Base legacy tool definition structure
 * @internal
 */
interface LegacyToolDefinition {
  name: string;
  description: string;
  annotations?: {
    readOnlyHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  inputSchema: any;
}

/**
 * Base definitions for legacy tools
 * Single source of truth for tool schemas and metadata
 * Used by both getLegacyTools() and getLegacyAliases()
 * @internal
 */
const LEGACY_TOOL_DEFINITIONS: readonly LegacyToolDefinition[] = [
  {
    name: 'search_notes',
    description: 'Search notes by content type, tags, category, or date range',
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true
    },
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
    name: 'create_note_from_template',
    description: 'Create a note using a specific LifeOS template with auto-filled metadata. If YAML rules are configured, consult get_yaml_rules before modifying frontmatter.',
    inputSchema: {
      type: 'object' as const,
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
    name: 'list_folders',
    description: 'List all folders in the vault following PARA structure',
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: 'Folder path to list (optional, defaults to root)' }
      }
    }
  },
  {
    name: 'find_notes_by_pattern',
    description: 'Find notes matching a glob pattern',
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern: { type: 'string', description: 'Glob pattern (e.g., "**/*recipe*.md")' }
      },
      required: ['pattern']
    }
  },
  {
    name: 'list_daily_notes',
    description: 'List all daily notes with their full paths for debugging',
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Limit number of results (optional, default 10)' }
      }
    }
  },
  {
    name: 'advanced_search',
    description: 'Advanced search with full-text search, metadata filters, and relevance scoring',
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object' as const,
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
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object' as const,
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
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object' as const,
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
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        days: { type: 'number', description: 'Number of days back to search (default: 7)' },
        maxResults: { type: 'number', description: 'Maximum results (default: 20)' }
      }
    }
  },
  {
    name: 'list_templates',
    description: 'List all available note templates in the LifeOS vault',
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object' as const,
      properties: {}
    }
  },
  {
    name: 'list_yaml_properties',
    description: 'List all YAML frontmatter properties used across all notes in the vault',
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object' as const,
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
  }
] as const;

/**
 * Get legacy tool aliases (11 tools)
 * Backward compatibility wrappers that route to consolidated tools
 * All include deprecation notices in descriptions
 *
 * @returns Array of 11 legacy alias tool definitions
 */
export const getLegacyAliases: GetLegacyAliasesFunction = () => {
  // Map base definitions to legacy aliases with deprecation prefix
  return LEGACY_TOOL_DEFINITIONS.map(def => ({
    name: def.name,
    description: `[LEGACY ALIAS] Use modern equivalent instead. ${def.description}`,
    ...(def.annotations && { annotations: def.annotations }),
    inputSchema: def.inputSchema
  })) as LegacyAliases;
};

/**
 * Get always-available tools (9 tools)
 * Core tools available in all operating modes
 *
 * Tools included:
 * - get_server_version: Server version and capabilities
 * - get_yaml_rules: YAML frontmatter rules reference
 * - edit_note: Edit existing notes with frontmatter updates
 * - read_note: Read note content and frontmatter
 * - get_daily_note: Get or create daily notes
 * - diagnose_vault: Diagnose vault issues
 * - move_items: Move notes and folders
 * - insert_content: Insert content at specific locations
 * - list_yaml_property_values: List unique YAML property values
 *
 * @returns Array of 9 always-available tool definitions
 */
export const getAlwaysAvailableTools: GetAlwaysAvailableToolsFunction = () => {
  return [
    {
      name: 'get_server_version',
      description: 'Get the current server version and capabilities information',
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false
      },
      inputSchema: {
        type: 'object' as const,
        properties: {
          includeTools: { type: 'boolean', description: 'Include full list of available tools in the response' }
        }
      }
    },
    {
      name: 'get_yaml_rules',
      description: 'Get the user\'s YAML frontmatter rules document for reference when creating or editing note YAML',
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        type: 'object' as const,
        properties: {}
      }
    },
    {
      name: 'edit_note',
      description: `Edit an existing note in the LifeOS vault. If YAML rules are configured, consult get_yaml_rules before modifying frontmatter.

WHEN TO USE:
- Update frontmatter fields: frontmatter={tags: [...]}, mode="merge"
- Replace entire note content: content provided, mode optional
- Selective field editing: frontmatter updates specific fields only

RETURNS: Success message with summary of updated frontmatter fields and content changes

TITLE EXTRACTION: Note titles in responses are determined by priority:
1. YAML frontmatter 'title' field (if present and non-empty)
2. Formatted date for daily notes (e.g., "August 30, 2025" for 2025-08-30.md)
3. Title-cased filename for regular notes (e.g., "My Project Note" for my-project-note.md)`,
      annotations: {
        readOnlyHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: {
        type: 'object' as const,
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
      description: `Read a note from the vault.

WHEN TO USE:
- Before editing: Read to understand current state
- Content export: Extract for external processing
- Metadata verification: Check frontmatter fields and tags

RETURNS: Formatted text with complete YAML frontmatter, Obsidian link, and full note content

TITLE EXTRACTION: Note titles are determined by priority:
1. YAML frontmatter 'title' field (if present and non-empty)
2. Formatted date for daily notes (e.g., "August 30, 2025" for 2025-08-30.md)
3. Title-cased filename for regular notes (e.g., "My Project Note" for my-project-note.md)`,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        type: 'object' as const,
        properties: {
          path: { type: 'string', description: 'Full path to the note' }
        },
        required: ['path']
      }
    },
    {
      name: 'get_daily_note',
      description: `Get or create a daily note for a specific date.

WHEN TO USE:
- Today's daily note: date omitted or date="today"
- Relative date references: date="yesterday" or date="tomorrow"
- Natural language dates: date="last Monday" or date="2025-10-15"

RETURNS: Daily note path, creation status (created/existed), and applied template name`,
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        type: 'object' as const,
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format, relative date (today, yesterday, tomorrow), or natural language (optional, defaults to today)' },
          createIfMissing: { type: 'boolean', description: 'Create the daily note if it doesn\'t exist (default: true)' },
          confirmCreation: { type: 'boolean', description: 'Ask for confirmation before creating a new daily note (default: false)' }
        }
      }
    },
    {
      name: 'diagnose_vault',
      description: 'Diagnose vault issues and check for problematic files',
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        type: 'object' as const,
        properties: {
          checkYaml: { type: 'boolean', description: 'Check for YAML parsing errors (default: true)' },
          maxFiles: { type: 'number', description: 'Maximum files to check (default: 100)' }
        }
      }
    },
    {
      name: 'move_items',
      description: 'Move notes and/or folders to a different location in the vault. Use either "item" for single moves or "items" for batch operations.',
      annotations: {
        readOnlyHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      inputSchema: {
        type: 'object' as const,
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
      description: `Insert content at specific locations within a note based on headings, block references, or text patterns. Preserves existing content and formatting. IMPORTANT: For daily notes, use heading "Day's Notes" (with apostrophe) to target the main content section.

WHEN TO USE:
- Append to daily notes: target={heading: "Day's Notes"}, position="end-of-section"
- Insert after specific heading: target={heading: "## Tasks"}, position="after"
- Target by text pattern: target={pattern: "TODO"}, position="before"

RETURNS: Success message with insertion location (heading/line) and content preview

TITLE EXTRACTION: Note titles in responses are determined by priority:
1. YAML frontmatter 'title' field (if present and non-empty)
2. Formatted date for daily notes (e.g., "August 30, 2025" for 2025-08-30.md)
3. Title-cased filename for regular notes (e.g., "My Project Note" for my-project-note.md)`,
      inputSchema: {
        type: 'object' as const,
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
      name: 'list_yaml_property_values',
      description: 'List all unique values used for a specific YAML property, showing which are single values vs arrays',
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true
      },
      inputSchema: {
        type: 'object' as const,
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
  ] as const;
};

/**
 * Get legacy tools (11 tools)
 * Original search and note creation tools
 * Available in legacy-only and consolidated-with-aliases modes
 *
 * @returns Array of 11 legacy tool definitions
 */
export const getLegacyTools: GetLegacyToolsFunction = () => {
  // Return base definitions directly - standard descriptions without alias prefix
  return LEGACY_TOOL_DEFINITIONS.map(def => ({
    name: def.name,
    description: def.description,
    ...(def.annotations && { annotations: def.annotations }),
    inputSchema: def.inputSchema
  })) as readonly Tool[];
};

/**
 * Validate tool count for mode
 * Internal validation helper ensuring correct tool assembly
 *
 * Expected counts:
 * - legacy-only: 20 tools (9 always + 11 legacy)
 * - consolidated-only: 12 tools (9 always + 3 consolidated)
 * - consolidated-with-aliases: 34 tools (9 always + 3 consolidated + 11 legacy + 11 aliases)
 *
 * @param tools - Tool array to validate
 * @param mode - Expected tool mode
 * @throws Error if count doesn't match expected value
 * @internal
 * @example
 * ```typescript
 * const tools = getToolsForMode({ mode: 'legacy-only', serverName: 'lifeos-mcp', serverVersion: '2.0.1' });
 * validateToolCount(tools, 'legacy-only'); // Expects 20 tools
 * ```
 */
function validateToolCount(tools: Tool[], mode: ToolMode): void {
  const expectedCounts: Record<ToolMode, number> = {
    'legacy-only': 20,
    'consolidated-only': 12,
    'consolidated-with-aliases': 34
  };

  const expected = expectedCounts[mode];
  const actual = tools.length;

  if (actual !== expected) {
    throw new Error(
      `Tool count validation failed for mode "${mode}": ` +
      `expected ${expected} tools but got ${actual}. ` +
      `This indicates a tool definition mismatch in the registry.`
    );
  }
}

/**
 * Assemble tools for specific mode
 * Composes tool array based on mode configuration with validation
 *
 * Mode mappings:
 * - legacy-only: 20 tools (9 always + 11 legacy)
 * - consolidated-only: 12 tools (9 always + 3 consolidated)
 * - consolidated-with-aliases: 34 tools (9 always + 3 consolidated + 11 legacy + 11 aliases)
 *
 * @param config - Tool registry configuration
 * @returns Composed tool array for mode
 * @throws Error if tool count doesn't match expected value for mode
 */
export const getToolsForMode: GetToolsForModeFunction = (config) => {
  const always = getAlwaysAvailableTools();
  const consolidated = getConsolidatedTools();
  const legacy = getLegacyTools();
  const aliases = getLegacyAliases();

  let tools: Tool[];

  switch (config.mode) {
    case 'legacy-only':
      // 9 always + 11 legacy = 20 tools
      tools = [...always, ...legacy];
      break;

    case 'consolidated-only':
      // 9 always + 3 consolidated = 12 tools
      tools = [...always, ...consolidated];
      break;

    case 'consolidated-with-aliases':
      // 9 always + 3 consolidated + 11 legacy + 11 aliases = 34 tools
      tools = [...always, ...consolidated, ...legacy, ...aliases];
      break;

    default:
      throw new Error(
        `Invalid tool mode: "${config.mode}". ` +
        `Expected one of: legacy-only, consolidated-only, consolidated-with-aliases`
      );
  }

  // Validate tool count
  validateToolCount(tools, config.mode);

  return tools;
};

/**
 * Add version metadata to response
 * Pure function that injects server version, name, and tool mode into responses
 * Does not mutate the original response object
 *
 * @param response - Original response object
 * @param config - Tool registry configuration
 * @returns New response object with metadata property added
 */
export const addVersionMetadata: AddVersionMetadataFunction = (response, config) => {
  // Create new object to avoid mutation
  const versioned = { ...response };

  // Create or merge metadata
  if (!versioned.metadata) {
    versioned.metadata = {};
  } else {
    // Preserve existing metadata
    versioned.metadata = { ...versioned.metadata };
  }

  // Add version information from config
  versioned.metadata.version = config.serverVersion;
  versioned.metadata.serverName = config.serverName;
  versioned.metadata.toolMode = config.mode;

  return versioned;
};
