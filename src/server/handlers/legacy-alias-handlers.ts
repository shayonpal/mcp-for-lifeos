/**
 * Legacy Alias Handlers Module
 * 
 * Provides backward-compatible redirect handlers for deprecated legacy tools.
 * Each alias redirects to a consolidated tool with parameter mapping and
 * deprecation warnings.
 * 
 * **Deprecation Timeline:**
 * - These aliases redirect to consolidated tools (search, create_note, list)
 * - All aliases display deprecation warnings
 * - Maintained for backward compatibility during migration period
 * 
 * **Architecture Pattern:**
 * - Individual factory functions for each alias (easier to maintain and test)
 * - Lazy initialization via handler map
 * - Public registration API for tool registry integration
 * 
 * @see dev/contracts/MCP-97-contracts.ts for implementation requirements
 * @see src/server/handlers/consolidated-handlers.ts for pattern reference
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NaturalLanguageProcessor } from '../../modules/search/index.js';
import { ObsidianLinks } from '../../obsidian-links.js';
import { LIFEOS_CONFIG } from '../../config.js';
import { VaultUtils } from '../../vault-utils.js';
import type {
  SmartCreateNoteOptions,
  UniversalListOptions,
  UniversalSearchOptions
} from '../../tool-router.js';
import { addVersionMetadata } from '../tool-registry.js';
import type { ToolHandler } from '../../../dev/contracts/MCP-8-contracts.js';

/**
 * Internal map of legacy alias handlers
 * Initialized once on first access via lazy initialization pattern
 */
const aliasHandlers = new Map<string, ToolHandler>();

/**
 * List of all legacy alias tool names
 * Used for registration and validation
 */
export const LEGACY_ALIAS_TOOL_NAMES = [
  // Search aliases (6)
  'search_notes',
  'advanced_search',
  'quick_search',
  'search_by_content_type',
  'search_recent',
  'find_notes_by_pattern',
  // Template alias (1)
  'create_note_from_template',
  // List aliases (4)
  'list_folders',
  'list_daily_notes',
  'list_templates',
  'list_yaml_properties'
] as const;

/**
 * Factory function for search alias handlers
 * Creates a redirect handler with parameter mapping for legacy search tools
 * 
 * @param aliasName - The legacy tool name (e.g., 'search_notes')
 * @param mode - The search mode to use (e.g., 'advanced', 'quick')
 * @param paramMapper - Optional function to transform parameters
 */
function createSearchAliasHandler(
  aliasName: string,
  mode: UniversalSearchOptions['mode'],
  paramMapper?: (args: Record<string, unknown>) => Partial<UniversalSearchOptions>
): ToolHandler {
  return async (args, context) => {
    // Build search options with mode
    const searchOptions: UniversalSearchOptions = {
      ...(args as unknown as UniversalSearchOptions),
      mode
    };

    // Apply parameter mapping if provided
    if (paramMapper) {
      const mappedParams = paramMapper(args as Record<string, unknown>);
      Object.assign(searchOptions, mappedParams);
    }

    // Route to consolidated search tool
    const results = await context.router.routeSearch(searchOptions);

    // Build deprecation warning
    const deprecationWarning = `⚠️ **DEPRECATION NOTICE**: The \`${aliasName}\` tool is deprecated. Please use the \`search\` tool with mode="${mode}" instead for better performance and features.\n\n`;

    // Format interpretation text if available
    let interpretationText = '';
    if (results.length > 0 && results[0].interpretation) {
      interpretationText = NaturalLanguageProcessor.formatInterpretation(results[0].interpretation) + '\n\n';
    }

    // Format search results
    const resultText = results.map((result, index) => {
      const note = result.note;
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
    }, context.registryConfig) as CallToolResult;
  };
}

/**
 * Factory function for the template creation alias
 * Creates a redirect handler for create_note_from_template
 */
function createTemplateAliasHandler(): ToolHandler {
  return async (args, context) => {
    // Map to SmartCreateNoteOptions with explicit template
    const createOptions: SmartCreateNoteOptions = {
      title: args.title as string,
      template: args.template as string,
      customData: args.customData as Record<string, any>,
      auto_template: false // Explicit template specified
    };

    // Route to consolidated create_note tool
    const templateResult = await context.router.routeCreateNote(createOptions);

    // Create the note file
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

    // Build deprecation warning
    const deprecationWarning = `⚠️ **DEPRECATION NOTICE**: The \`create_note_from_template\` tool is deprecated. Please use \`create_note\` instead.\n\n`;

    return addVersionMetadata({
      content: [{
        type: 'text',
        text: `${deprecationWarning}✅ Created note: **${createOptions.title}**\n\n${obsidianLink}\n\n📁 Location: \`${note.path.replace(LIFEOS_CONFIG.vaultPath + '/', '')}\`\n🔧 Template: ${createOptions.template}`
      }]
    }, context.registryConfig) as CallToolResult;
  };
}

/**
 * Factory function for list alias handlers
 * Creates a redirect handler with parameter mapping for legacy list tools
 * 
 * @param aliasName - The legacy tool name (e.g., 'list_folders')
 * @param listType - The list type to use (e.g., 'folders', 'daily_notes')
 * @param paramMapper - Optional function to transform parameters
 */
function createListAliasHandler(
  aliasName: string,
  listType: UniversalListOptions['type'],
  paramMapper?: (args: Record<string, unknown>) => Partial<UniversalListOptions>
): ToolHandler {
  return async (args, context) => {
    // Build list options with type
    const listOptions: UniversalListOptions = {
      type: listType
    };

    // Apply parameter mapping if provided
    if (paramMapper) {
      const mappedParams = paramMapper(args as Record<string, unknown>);
      Object.assign(listOptions, mappedParams);
    }

    // Route to consolidated list tool
    const results = await context.router.routeList(listOptions);

    // Build deprecation warning
    const deprecationWarning = `⚠️ **DEPRECATION NOTICE**: The \`${aliasName}\` tool is deprecated. Please use \`list\` with type="${listType}" instead.\n\n`;

    let responseText = '';

    // Format response based on list type
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
        const templates = results as Array<{
          name: string;
          key: string;
          description?: string;
          targetFolder?: string;
          contentType?: string;
        }>;
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
        const propertiesInfo = results as {
          properties: string[];
          counts?: Record<string, number>;
          totalNotes?: number;
        };
        const sortedProperties = propertiesInfo.properties;

        responseText = `# YAML Properties in Vault\n\n`;
        responseText += `Found **${sortedProperties.length}** unique properties`;
        if (propertiesInfo.totalNotes) {
          responseText += ` across **${propertiesInfo.totalNotes}** notes`;
        }
        responseText += `\n\n## Properties List\n\n`;

        if (listOptions.includeCount && propertiesInfo.counts) {
          sortedProperties.forEach((prop: string) => {
            const count = propertiesInfo.counts![prop] || 0;
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
    }, context.registryConfig) as CallToolResult;
  };
}

/**
 * Initialize all legacy alias handlers
 * Called once on first access via lazy initialization pattern
 */
function ensureAliasHandlersInitialized(): void {
  if (aliasHandlers.size > 0) {
    return;
  }

  // Register 6 search aliases
  aliasHandlers.set('search_notes', createSearchAliasHandler('search_notes', 'advanced'));
  aliasHandlers.set('advanced_search', createSearchAliasHandler('advanced_search', 'advanced'));
  aliasHandlers.set('quick_search', createSearchAliasHandler('quick_search', 'quick'));
  
  aliasHandlers.set('search_by_content_type', createSearchAliasHandler(
    'search_by_content_type',
    'content_type',
    (args) => ({
      // Map contentType parameter to query for content_type mode
      query: args.contentType ? (args.contentType as string) : undefined
    })
  ));
  
  aliasHandlers.set('search_recent', createSearchAliasHandler('search_recent', 'recent'));
  
  aliasHandlers.set('find_notes_by_pattern', createSearchAliasHandler(
    'find_notes_by_pattern',
    'pattern',
    (args) => ({
      // Map pattern parameter to query for pattern mode
      query: args.pattern ? (args.pattern as string) : undefined
    })
  ));

  // Register 1 template alias
  aliasHandlers.set('create_note_from_template', createTemplateAliasHandler());

  // Register 4 list aliases
  aliasHandlers.set('list_folders', createListAliasHandler(
    'list_folders',
    'folders',
    (args) => ({
      path: args.path as string | undefined
    })
  ));

  aliasHandlers.set('list_daily_notes', createListAliasHandler(
    'list_daily_notes',
    'daily_notes',
    (args) => ({
      limit: args.limit as number | undefined
    })
  ));

  aliasHandlers.set('list_templates', createListAliasHandler('list_templates', 'templates'));

  aliasHandlers.set('list_yaml_properties', createListAliasHandler(
    'list_yaml_properties',
    'yaml_properties',
    (args) => ({
      includeCount: args.includeCount as boolean | undefined,
      sortBy: args.sortBy as string | undefined,
      excludeStandard: args.excludeStandard as boolean | undefined
    })
  ));
}

/**
 * Register all legacy alias handlers into the provided tool registry
 * 
 * **Usage:**
 * ```typescript
 * const registry = new Map<string, ToolHandler>();
 * registerLegacyAliasHandlers(registry);
 * ```
 * 
 * @param registry - Mutable tool handler registry
 * @returns The same registry for chaining
 */
export function registerLegacyAliasHandlers<T extends Map<string, ToolHandler>>(
  registry: T
): T {
  ensureAliasHandlersInitialized();
  LEGACY_ALIAS_TOOL_NAMES.forEach(toolName => {
    const handler = aliasHandlers.get(toolName);
    if (handler) {
      registry.set(toolName, handler);
    }
  });
  return registry;
}

/**
 * Get a specific legacy alias handler by name
 * Used for hybrid dispatch fallback in request handler
 * 
 * @param toolName - The legacy alias tool name
 * @returns The handler function or undefined if not found
 */
export function getLegacyAliasHandler(toolName: string): ToolHandler | undefined {
  ensureAliasHandlersInitialized();
  return aliasHandlers.get(toolName);
}
