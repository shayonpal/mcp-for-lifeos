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
import { ALWAYS_AVAILABLE_TOOL_NAMES } from '../dev/contracts/MCP-98-contracts.js';

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
    clientVersion: initialClientInfo.version ?? '0.0.0',
    server,
    yamlRulesManager
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
            clientVersion: clientInfo.version ?? '0.0.0',
            server,
            yamlRulesManager
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
            clientVersion: clientInfo.version ?? '0.0.0',
            server,
            yamlRulesManager
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

    // MCP-98: Route always-available tools through request handler
    const alwaysAvailableToolNames = new Set<string>(ALWAYS_AVAILABLE_TOOL_NAMES);
    if (alwaysAvailableToolNames.has(name)) {
      return await consolidatedRequestHandler(request);
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

      // MCP-98: Always-available handlers extracted to dedicated modules
      case 'get_server_version':
      case 'get_yaml_rules':
      case 'read_note':
      case 'edit_note':
      case 'get_daily_note':
      case 'diagnose_vault':
      case 'move_items':
      case 'insert_content':
      case 'list_yaml_property_values':
        throw new Error(`${name} handler should be registered in handler registry`);

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
