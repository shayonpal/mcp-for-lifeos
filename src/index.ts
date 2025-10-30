#!/usr/bin/env node

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
import { EditNoteInput, InsertContentInput, MoveItemsInput, EditNoteFrontmatter, InsertContentTarget, MoveItemType } from './types.js';
import { LIFEOS_CONFIG } from './config.js';
import { normalizePath } from './path-utils.js';
import { format } from 'date-fns';
import { MCPHttpServer } from './server/http-server.js';
import { logger } from './logger.js';
import { statSync } from 'fs';
import { createMcpServer, SERVER_VERSION, parseToolMode, extractClientInfo } from './server/mcp-server.js';
import type { ToolMode, McpServerInstance } from '../dev/contracts/MCP-6-contracts.js';
import { createRequestHandler } from './server/request-handler.js';
import { getToolsForMode, addVersionMetadata as addToolVersionMetadata } from './server/tool-registry.js';
import type { ToolRegistryConfig } from '../dev/contracts/MCP-7-contracts.js';
import type { ToolHandlerContext } from '../dev/contracts/MCP-8-contracts.js';
import type { RequestHandlerWithClientContext } from '../dev/contracts/MCP-96-contracts.js';
import { CONSOLIDATED_TOOL_NAMES, isUnknownToolError } from '../dev/contracts/MCP-96-contracts.js';
import { getConsolidatedHandler } from './server/handlers/consolidated-handlers.js';
import { getLegacyAliasHandler, LEGACY_ALIAS_TOOL_NAMES } from './server/handlers/legacy-alias-handlers.js';

// ============================================================================
// MCP SERVER INITIALIZATION - LAZY PATTERN
// ============================================================================

// Parse tool mode early (lightweight, no server instantiation)
const toolModeConfig = parseToolMode(process.env);

// Log deprecation warning if legacy flag was used
if (toolModeConfig.usedLegacyFlag) {
  console.error(
    '[DEPRECATED] CONSOLIDATED_TOOLS_ENABLED will be removed in Cycle 10. Use TOOL_MODE instead.'
  );
}

// Lazy server instantiation - created on first access
let mcpInstance: McpServerInstance | null = null;
let handlersRegistered = false;

/**
 * Lazy initialization of MCP server instance
 * Creates server on first access and registers handlers once
 */
function initializeMcpInstance(): McpServerInstance {
  if (!mcpInstance) {
    mcpInstance = createMcpServer({
      vaultPath: LIFEOS_CONFIG.vaultPath,
      toolMode: toolModeConfig.mode // Use pre-parsed tool mode
    });

    // Register handlers once after server creation
    if (!handlersRegistered) {
      registerHandlers(mcpInstance);
      handlersRegistered = true;
    }
  }
  return mcpInstance;
}

/**
 * Get MCP server instance (convenience accessor)
 */
function getMcpInstance(): McpServerInstance {
  return initializeMcpInstance();
}

// Initialize YAML rules manager
const yamlRulesManager = new YamlRulesManager(LIFEOS_CONFIG);

// Define available tools using tool registry
// Construct registry configuration
const registryConfig: ToolRegistryConfig = {
  mode: toolModeConfig.mode,
  serverName: 'lifeos-mcp',
  serverVersion: SERVER_VERSION
};

// Get tools for current mode from registry
const tools: Tool[] = getToolsForMode(registryConfig);

/**
 * Register MCP tool handlers
 * Called once during server initialization
 */
function registerHandlers(instance: McpServerInstance): void {
  const { server, analytics, sessionId } = instance;

  const initialClientInfo = extractClientInfo(server);
  const consolidatedRequestHandler = createRequestHandler({
    toolMode: toolModeConfig.mode,
    registryConfig,
    analytics,
    sessionId,
    router: ToolRouter,
    clientName: initialClientInfo.name ?? 'unknown-client',
    clientVersion: initialClientInfo.version ?? '0.0.0'
  }) as RequestHandlerWithClientContext;

  const consolidatedToolNames = new Set<string>(CONSOLIDATED_TOOL_NAMES);

  // Tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error('Missing arguments');
    }

    const addVersionMetadata = (response: any) => addToolVersionMetadata(response, registryConfig);

    const clientInfo = extractClientInfo(server);
    consolidatedRequestHandler.updateClientContext(clientInfo);

    if (consolidatedToolNames.has(name)) {
      try {
        return await consolidatedRequestHandler(request);
      } catch (error) {
        if (!isUnknownToolError(error)) {
          throw error;
        }

        logger.warn(`hybrid-dispatch fallback engaged for consolidated tool "${name}": ${error instanceof Error ? error.message : String(error)}`);

        const fallbackHandler = getConsolidatedHandler(name);
        if (fallbackHandler) {
          const fallbackContext: ToolHandlerContext = {
            toolMode: toolModeConfig.mode,
            registryConfig,
            analytics,
            sessionId,
            router: ToolRouter,
            clientName: clientInfo.name ?? 'unknown-client',
            clientVersion: clientInfo.version ?? '0.0.0'
          };

          return await analytics.recordToolExecution(
            name,
            async () => fallbackHandler(args as Record<string, unknown>, fallbackContext),
            {
              clientName: fallbackContext.clientName,
              clientVersion: fallbackContext.clientVersion,
              sessionId
            }
          );
        }

        throw error;
      }
    }

    // Create Set of legacy alias tool names for efficient lookup
    const legacyAliasToolNames = new Set<string>(LEGACY_ALIAS_TOOL_NAMES);

    // Hybrid dispatch for legacy alias tools (non-legacy-only mode)
    if (legacyAliasToolNames.has(name) && toolModeConfig.mode !== 'legacy-only') {
      try {
        return await consolidatedRequestHandler(request);
      } catch (error) {
        if (!isUnknownToolError(error)) {
          throw error;
        }

        logger.warn(`hybrid-dispatch fallback engaged for legacy alias tool "${name}": ${error instanceof Error ? error.message : String(error)}`);

        const fallbackHandler = getLegacyAliasHandler(name);
        if (fallbackHandler) {
          const fallbackContext: ToolHandlerContext = {
            toolMode: toolModeConfig.mode,
            registryConfig,
            analytics,
            sessionId,
            router: ToolRouter,
            clientName: clientInfo.name ?? 'unknown-client',
            clientVersion: clientInfo.version ?? '0.0.0'
          };

          return await analytics.recordToolExecution(
            name,
            async () => fallbackHandler(args as Record<string, unknown>, fallbackContext),
            {
              clientName: fallbackContext.clientName,
              clientVersion: fallbackContext.clientVersion,
              sessionId
            }
          );
        }

        throw error;
      }
    }

    try {

    switch (name) {
      // Consolidated AI-Optimized Tools
      case 'search': {
        throw new Error('search handler should be resolved by consolidated registry');
      }
      case 'create_note': {
        throw new Error('create_note handler should be resolved by consolidated registry');
      }
      case 'list': {
        throw new Error('list handler should be resolved by consolidated registry');
      }

      // Legacy Tool Aliases - handled by registry in non-legacy-only modes
      // Fall through to legacy implementations for legacy-only mode
      case 'search_notes':
      case 'advanced_search':
      case 'quick_search':
      case 'search_by_content_type':
      case 'search_recent':
      case 'find_notes_by_pattern':
        throw new Error(`${name} handler should be resolved by legacy alias registry`);

      case 'create_note_from_template':
        throw new Error('create_note_from_template handler should be resolved by legacy alias registry');

      case 'list_folders':
      case 'list_daily_notes':
      case 'list_templates':
      case 'list_yaml_properties':
        throw new Error(`${name} handler should be resolved by legacy alias registry`);

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
                  `- **Obsidian Integration:** Direct vault linking`
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

        // Normalize path using shared utility (cross-platform, escaped spaces, path traversal safe)
        const normalizedPath = normalizePath(path, LIFEOS_CONFIG.vaultPath);

        // Debug logging removed for MCP compatibility
        const note = VaultUtils.readNote(normalizedPath);
        const obsidianLink = ObsidianLinks.createClickableLink(note.path, note.frontmatter.title);
        
        // Normalize tags to array format
        const tags = VaultUtils.normalizeTagsToArray(note.frontmatter.tags);
        const tagsDisplay = tags.length > 0 ? tags.join(', ') : 'None';
        
        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `# ${ObsidianLinks.extractNoteTitle(note.path, note.frontmatter)}\n\n**Path:** ${note.path}\n**Content Type:** ${note.frontmatter['content type']}\n**Tags:** ${tagsDisplay}\n\n${obsidianLink}\n\n---\n\n${note.content}`
          }]
        });
      }

      case 'edit_note': {
        const args = request.params.arguments as unknown as EditNoteInput;
        // Get note path - either from direct path or by searching for title
        let notePath: string;

        if (args.path) {
          // Normalize path using shared utility (cross-platform, escaped spaces, path traversal safe)
          notePath = normalizePath(args.path as string, LIFEOS_CONFIG.vaultPath);
        } else if (args.title) {
          // Find note by title using utility method
          notePath = await VaultUtils.findNoteByTitle(args.title as string);
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
          const fm = args.frontmatter;
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
            text: `✅ Updated note: **${ObsidianLinks.extractNoteTitle(updatedNote.path, updatedNote.frontmatter)}**\n\n${obsidianLink}\n\n📁 Location: \`${updatedNote.path.replace(LIFEOS_CONFIG.vaultPath + '/', '')}\`\n📝 Mode: ${updates.mode}\n⏰ Modified: ${format(updatedNote.modified, 'yyyy-MM-dd HH:mm:ss')}`
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
          `**${ObsidianLinks.extractNoteTitle(note.path, note.frontmatter)}** (${note.frontmatter['content type']})\n${note.path}`
        ).join('\n\n');

        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `Found ${results.length} notes:\n\n${resultText}`
          }]
        });
      }

      case 'get_daily_note': {
        const startTime = Date.now();
        try {
          // Import DateResolver at the top of the file if not already
          const dateResolver = new (await import('./date-resolver.js')).DateResolver();
          
          // Parse the date input using DateResolver
          const dateInput = args.date as string || 'today';
          logger.info(`[get_daily_note] Processing date input: "${dateInput}"`);
          
          const resolvedDateStr = dateResolver.resolveDailyNoteDate(dateInput);
          logger.info(`[get_daily_note] DateResolver output: ${resolvedDateStr}`);
          
          const date = VaultUtils.getLocalDate(resolvedDateStr);
          logger.info(`[get_daily_note] Final Date object: ${date.toISOString()} (${format(date, 'yyyy-MM-dd')})`);
          
          // Check parameters with defaults
          const createIfMissing = args.createIfMissing !== false;  // default true
          const confirmCreation = args.confirmCreation === true;   // default false
          
          let note = await VaultUtils.getDailyNote(date);
          
          if (!note) {
            if (!createIfMissing) {
              return addVersionMetadata({
                content: [{
                  type: 'text',
                  text: `Daily note for ${format(date, 'MMMM dd, yyyy')} does not exist.\n\nUse createIfMissing: true to create it automatically.`
                }]
              });
            }
            
            if (confirmCreation) {
              return addVersionMetadata({
                content: [{
                  type: 'text',
                  text: `Daily note for ${format(date, 'MMMM dd, yyyy')} does not exist.\n\nWould you like to create it? Please confirm by running the command again with confirmCreation: false or createIfMissing: true.`
                }]
              });
            }
            
            note = await VaultUtils.createDailyNote(date);
          }

          const obsidianLink = ObsidianLinks.createClickableLink(note.path, `Daily Note: ${format(date, 'MMMM dd, yyyy')}`);

          // Record analytics
          const clientInfo = extractClientInfo(server);
          analytics.recordUsage({
            toolName: 'get_daily_note',
            executionTime: Date.now() - startTime,
            success: true,
            clientName: clientInfo.name,
            clientVersion: clientInfo.version,
            sessionId
          });

          return addVersionMetadata({
            content: [{
              type: 'text',
              text: `# Daily Note: ${format(date, 'MMMM dd, yyyy')}\n\n**Path:** ${note.path}\n\n${obsidianLink}\n\n---\n\n${note.content}`
            }]
          });
        } catch (error) {
          // Record failed analytics
          const clientInfo = extractClientInfo(server);
          analytics.recordUsage({
            toolName: 'get_daily_note',
            executionTime: Date.now() - startTime,
            success: false,
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
            clientName: clientInfo.name,
            clientVersion: clientInfo.version,
            sessionId
          });
          throw error;
        }
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
          const title = ObsidianLinks.extractNoteTitle(note.path, note.frontmatter);
          
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
          const title = ObsidianLinks.extractNoteTitle(note.path, note.frontmatter);
          
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
          const title = ObsidianLinks.extractNoteTitle(note.path, note.frontmatter);
          
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
          const title = ObsidianLinks.extractNoteTitle(note.path, note.frontmatter);
          
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
        const args = request.params.arguments as unknown as MoveItemsInput;
        const destination = args.destination as string;
        if (!destination) {
          throw new Error('Destination is required');
        }

        // Collect items to move
        const itemsToMove: MoveItemType[] = [];

        if (args.item) {
          itemsToMove.push({ path: args.item });
        } else if (args.items && Array.isArray(args.items)) {
          itemsToMove.push(...args.items);
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
        const args = request.params.arguments as unknown as InsertContentInput;
        // Get note path - either from direct path or by searching for title
        let notePath: string;
        
        if (args.path) {
          // Normalize path using shared utility (cross-platform, escaped spaces, path traversal safe)
          notePath = normalizePath(args.path as string, LIFEOS_CONFIG.vaultPath);
        } else if (args.title) {
          // Find note by title using utility method
          notePath = await VaultUtils.findNoteByTitle(args.title as string);
        } else {
          throw new Error('Either path or title is required');
        }

        // Validate required parameters
        const content = args.content;
        const target = args.target;

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
        
        logger.info(`[insert_content] Inserting content into ${notePath}`);
        logger.info(`[insert_content] Target: ${JSON.stringify(target)}`);
        logger.info(`[insert_content] Position: ${position}`);
        
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
          logger.error(`[insert_content] Failed to insert content: ${insertError}`);
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
              text: `✅ Inserted content in **${ObsidianLinks.extractNoteTitle(updatedNote.path, updatedNote.frontmatter)}**\n\n` +
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
}

// Start the server
async function main() {
  // Initialize server and register handlers
  const instance = getMcpInstance();
  const { server } = instance;

  // Connect server to stdio transport (handled by factory)
  await instance.connect();

  // Log tool mode configuration
  console.error(`Tool Mode: ${toolModeConfig.mode}`);
  console.error(`Registered Tools: ${tools.length}`);

  // Validate tool count matches expected count for mode
  const EXPECTED_TOOL_COUNTS = {
    'consolidated-only': 12,
    'legacy-only': 20,
    'consolidated-with-aliases': 34
  } as const;

  const expectedCount = EXPECTED_TOOL_COUNTS[toolModeConfig.mode];
  if (tools.length !== expectedCount) {
    console.error(
      `[WARNING] Tool count mismatch: expected ${expectedCount} for mode '${toolModeConfig.mode}', got ${tools.length}`
    );
  }

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

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  try {
    // Only shutdown if server was initialized (don't create on exit)
    if (mcpInstance) {
      await mcpInstance.shutdown();
    }
  } catch (error) {
    // Silently continue
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    // Only shutdown if server was initialized (don't create on exit)
    if (mcpInstance) {
      await mcpInstance.shutdown();
    }
  } catch (error) {
    // Silently continue
  }
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(() => {
    // Exit silently on error to avoid interfering with MCP protocol
    process.exit(1);
  });
}
