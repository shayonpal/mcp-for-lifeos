import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NaturalLanguageProcessor } from '../../modules/search/index.js';
import { ObsidianLinks } from '../../modules/links/index.js';
import { ResponseTruncator } from '../../modules/search/index.js';
import { LIFEOS_CONFIG, NoteGuidanceMetadata } from '../../shared/index.js';
import { createNote } from '../../modules/files/index.js';
import type {
  SmartCreateNoteOptions,
  UniversalListOptions,
  UniversalSearchOptions
} from '../../tool-router.js';
import { addVersionMetadata } from '../tool-registry.js';
import type {
  ToolHandler
} from '../../../dev/contracts/MCP-8-contracts.js';
import {
  DEFAULT_TOKEN_BUDGET,
  validateMaxResults
} from '../../../dev/contracts/MCP-38-contracts.js';
import { CONSOLIDATED_TOOL_NAMES } from '../../../dev/contracts/MCP-96-contracts.js';

/**
 * Internal map of consolidated tool handlers. Each handler consumes the shared
 * ToolHandlerContext provided by the request handler module.
 */
const consolidatedHandlers = new Map<string, ToolHandler>();

function ensureHandlersInitialized(): void {
  if (consolidatedHandlers.size > 0) {
    return;
  }

  // -----------------------------------------------------------------------
  // search handler
  // -----------------------------------------------------------------------
  const searchHandler: ToolHandler = async (args, context) => {
    if (context.toolMode === 'legacy-only') {
      throw new Error('Consolidated tools are disabled. Use legacy search tools instead.');
    }

    const searchArgs = args as unknown as UniversalSearchOptions;
    const validatedMaxResults = validateMaxResults(
      typeof searchArgs.maxResults === 'number' ? searchArgs.maxResults : undefined,
      'search'
    );

    const searchOptions: UniversalSearchOptions = {
      ...searchArgs,
      maxResults: validatedMaxResults.value
    };

    const allResults = await context.router.routeSearch(searchOptions);

    const format = (searchArgs as Record<string, unknown>).format === 'concise' ||
      (searchArgs as Record<string, unknown>).format === 'detailed'
      ? (searchArgs as Record<string, 'concise' | 'detailed'>).format
      : 'detailed';

    const tokenBudget = new ResponseTruncator(DEFAULT_TOKEN_BUDGET);

    let interpretationText = '';
    if (allResults.length > 0 && allResults[0].interpretation) {
      interpretationText = `${NaturalLanguageProcessor.formatInterpretation(allResults[0].interpretation)}\n\n`;
      tokenBudget.consumeBudget(interpretationText);
    }

    const includedResults: string[] = [];

    for (let index = 0; index < allResults.length; index++) {
      const result = allResults[index];
      const note = result.note;
      const matchCount = result.matches.length;
      const title = ObsidianLinks.extractNoteTitle(note.path, note.frontmatter);

      let output = ObsidianLinks.formatSearchResult(
        index + 1,
        title,
        note.path,
        note.frontmatter['content type'] || 'Unknown',
        result.score,
        `${matchCount} matches`,
        format,
        tokenBudget
      );

      if (format === 'detailed') {
        const topMatches = result.matches.slice(0, 3);
        if (topMatches.length > 0) {
          output += '\n\n**Matches:**\n';
          topMatches.forEach(match => {
            const type = match.type === 'frontmatter'
              ? `${match.type} (${match.field})`
              : match.type;
            output += `- *${type}*: "${match.context}"\n`;
          });
        }
      }

      const resultSeparator = '\n\n---\n\n';
      if (!tokenBudget.canAddResult(output + resultSeparator)) {
        break;
      }

      tokenBudget.consumeBudget(output + resultSeparator);
      includedResults.push(output);
    }

    const resultText = includedResults.join('\n\n---\n\n');
    const truncationInfo = tokenBudget.getTruncationInfo(
      includedResults.length,
      allResults.length,
      format,
      false
    );

    let responseText = `${interpretationText}Found ${allResults.length} results`;
    if (truncationInfo.truncated) {
      responseText += ` (showing ${truncationInfo.shownCount})\n\n${truncationInfo.suggestion}`;
    } else {
      responseText += ':';
    }

    responseText += `\n\n${resultText}`;

    return addVersionMetadata({
      content: [{
        type: 'text',
        text: responseText
      }],
      truncation: truncationInfo.truncated ? truncationInfo : undefined
    }, context.registryConfig) as CallToolResult;
  };

  // -----------------------------------------------------------------------
  // create_note handler
  // -----------------------------------------------------------------------
  const createNoteHandler: ToolHandler = async (args, context) => {
    if (context.toolMode === 'legacy-only') {
      throw new Error('Consolidated tools are disabled. Use legacy create_note_from_template tool instead.');
    }

    const createOptions = args as unknown as SmartCreateNoteOptions;
    const templateResult = await context.router.routeCreateNote(createOptions);

    const fileName = createOptions.title
      .replace(/[\[\]:;]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const note = createNote(
      fileName,
      templateResult.frontmatter,
      templateResult.content,
      templateResult.targetFolder
    );

    const obsidianLink = ObsidianLinks.createClickableLink(note.path, createOptions.title);

    const usedTemplate = createOptions.template ||
      (typeof templateResult === 'object' && templateResult.frontmatter &&
        (templateResult.frontmatter.category?.includes?.('Restaurant') ||
          templateResult.frontmatter.tags?.includes?.('restaurant'))) ? 'restaurant' : null;

    // Extract guidance metadata if present
    const metadata: { guidance?: NoteGuidanceMetadata } = {};
    if (templateResult.guidance) {
      metadata.guidance = templateResult.guidance;
    }

    return addVersionMetadata({
      content: [{
        type: 'text',
        text: `✅ Created note: **${createOptions.title}**\n\n${obsidianLink}\n\n📁 Location: \`${note.path.replace(`${LIFEOS_CONFIG.vaultPath}/`, '')}\`\n🔧 Smart Creation: ${usedTemplate ? `Template "${usedTemplate}" auto-detected` : 'Manual creation'}`
      }],
      ...(Object.keys(metadata).length > 0 ? { metadata } : {})
    }, context.registryConfig) as CallToolResult;
  };

  // -----------------------------------------------------------------------
  // list handler
  // -----------------------------------------------------------------------
  const listHandler: ToolHandler = async (args, context) => {
    if (context.toolMode === 'legacy-only') {
      throw new Error('Consolidated tools are disabled. Use specific list tools instead.');
    }

    const listOptions = args as unknown as UniversalListOptions;
    const results = await context.router.routeList(listOptions);

    const format = (args as Record<string, unknown>).format === 'concise' ||
      (args as Record<string, unknown>).format === 'detailed'
      ? (args as Record<string, 'concise' | 'detailed'>).format
      : 'detailed';

    const tokenBudget = new ResponseTruncator(DEFAULT_TOKEN_BUDGET);
    let responseText = '';
    let totalItems = 0;
    let shownItems = 0;

    switch (listOptions.type) {
      case 'folders': {
        const folders = results as string[];
        totalItems = folders.length;
        if (format === 'concise') {
          const includedFolders: string[] = [];
          for (const folder of folders) {
            const formattedItem = `📁 ${folder}\n`;
            if (!tokenBudget.canAddResult(formattedItem)) {
              break;
            }
            tokenBudget.consumeBudget(formattedItem);
            includedFolders.push(folder);
          }
          shownItems = includedFolders.length;
          responseText = includedFolders.map(f => `📁 ${f}`).join('\n');
        } else {
          const header = `Folders in ${listOptions.path || 'vault root'}:\n\n`;
          tokenBudget.consumeBudget(header);
          responseText = header;

          const includedFolders: string[] = [];
          for (const folder of folders) {
            const formattedItem = `📁 ${folder}\n`;
            if (!tokenBudget.canAddResult(formattedItem)) {
              break;
            }
            tokenBudget.consumeBudget(formattedItem);
            includedFolders.push(folder);
          }
          shownItems = includedFolders.length;
          responseText += includedFolders.map(f => `📁 ${f}`).join('\n');
        }
        break;
      }

      case 'daily_notes': {
        const dailyNotes = results as string[];
        totalItems = dailyNotes.length;
        const includedNotes: string[] = [];
        for (const note of dailyNotes) {
          const formattedItem = `🗓️ ${note}\n`;
          if (!tokenBudget.canAddResult(formattedItem)) {
            break;
          }
          tokenBudget.consumeBudget(formattedItem);
          includedNotes.push(note);
        }
        shownItems = includedNotes.length;
        responseText = includedNotes.map(n => `🗓️ ${n}`).join('\n');
        break;
      }

      case 'templates': {
        const templates = results as Array<{ name: string; path: string; description?: string; contentType?: string; targetFolder?: string }>;
        totalItems = templates.length;

        if (format === 'concise') {
          const includedTemplates: string[] = [];
          for (const template of templates) {
            const formattedItem = `🧩 ${template.name}\n`;
            if (!tokenBudget.canAddResult(formattedItem)) {
              break;
            }
            tokenBudget.consumeBudget(formattedItem);
            includedTemplates.push(template.name);
          }
          shownItems = includedTemplates.length;
          responseText = includedTemplates.map(t => `🧩 ${t}`).join('\n');
        } else {
          const header = '# Templates\n\n';
          tokenBudget.consumeBudget(header);
          responseText = header;

          const includedTemplates: typeof templates = [];
          for (const template of templates) {
            const formattedItem = `### ${template.name}\n📍 ${template.path}` + (template.description ? `\n📝 ${template.description}` : '') + '\n\n';
            if (!tokenBudget.canAddResult(formattedItem)) {
              break;
            }
            tokenBudget.consumeBudget(formattedItem);
            includedTemplates.push(template);
          }
          shownItems = includedTemplates.length;
          responseText += includedTemplates.map(template => {
            return `### ${template.name}\n📍 ${template.path}` +
              (template.description ? `\n📝 ${template.description}` : '') +
              (template.targetFolder ? `\n📁 Target Folder: ${template.targetFolder}` : '') +
              (template.contentType ? `\n🧪 Content Type: ${template.contentType}` : '') +
              '\n';
          }).join('\n');
        }
        break;
      }

      case 'yaml_properties': {
        const propertiesInfo = results as { properties: string[]; counts?: Record<string, number>; totalNotes?: number };
        const sortedProperties = propertiesInfo.properties;
        totalItems = sortedProperties.length;

        if (format === 'concise') {
          const includedProperties: string[] = [];
          for (const prop of sortedProperties) {
            const formattedItem = `${prop}\n`;
            if (!tokenBudget.canAddResult(formattedItem)) {
              break;
            }
            tokenBudget.consumeBudget(formattedItem);
            includedProperties.push(prop);
          }
          shownItems = includedProperties.length;
          responseText = includedProperties.join('\n');
        } else {
          const header = `# YAML Properties in Vault\n\n` +
            `Found **${sortedProperties.length}** unique properties` +
            (propertiesInfo.totalNotes ? ` across **${propertiesInfo.totalNotes}** notes` : '') +
            `\n\n## Properties List\n\n`;
          tokenBudget.consumeBudget(header);
          responseText = header;

          const includedProperties: string[] = [];
          for (const prop of sortedProperties) {
            const count = propertiesInfo.counts?.[prop] ?? 0;
            const formattedItem = listOptions.includeCount
              ? `- **${prop}** (used in ${count} note${count !== 1 ? 's' : ''})\n`
              : `- ${prop}\n`;
            if (!tokenBudget.canAddResult(formattedItem)) {
              break;
            }
            tokenBudget.consumeBudget(formattedItem);
            includedProperties.push(prop);
          }
          shownItems = includedProperties.length;
          responseText += includedProperties.map(prop => {
            if (listOptions.includeCount) {
              const count = propertiesInfo.counts?.[prop] ?? 0;
              return `- **${prop}** (used in ${count} note${count !== 1 ? 's' : ''})`;
            }
            return `- ${prop}`;
          }).join('\n');
        }
        break;
      }

      default: {
        totalItems = Array.isArray(results) ? results.length : 0;
        shownItems = totalItems;
        responseText = `Listed ${Array.isArray(results) ? results.length : 'unknown'} items`;
      }
    }

    const truncationInfo = tokenBudget.getTruncationInfo(
      shownItems,
      totalItems,
      format,
      false
    );

    if (truncationInfo.truncated) {
      responseText = `Showing ${truncationInfo.shownCount} of ${truncationInfo.totalCount} items (limit reached)\n\n${truncationInfo.suggestion}\n\n---\n\n${responseText}`;
    }

    return addVersionMetadata({
      content: [{
        type: 'text',
        text: responseText
      }],
      truncation: truncationInfo.truncated ? truncationInfo : undefined
    }, context.registryConfig) as CallToolResult;
  };

  consolidatedHandlers.set('search', searchHandler);
  consolidatedHandlers.set('create_note', createNoteHandler);
  consolidatedHandlers.set('list', listHandler);
}

ensureHandlersInitialized();

export function registerConsolidatedHandlers<T extends Map<string, ToolHandler>>(
  registry: T
): T {
  ensureHandlersInitialized();
  CONSOLIDATED_TOOL_NAMES.forEach(toolName => {
    const handler = consolidatedHandlers.get(toolName);
    if (handler) {
      registry.set(toolName, handler);
    }
  });
  return registry;
}

export function getConsolidatedHandler(toolName: string): ToolHandler | undefined {
  ensureHandlersInitialized();
  return consolidatedHandlers.get(toolName);
}
