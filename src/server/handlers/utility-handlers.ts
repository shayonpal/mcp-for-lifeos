/**
 * Utility operation handlers for MCP-98
 * Handles server utilities and diagnostics
 */

import type { ToolHandler, ToolHandlerContext } from '../../../dev/contracts/MCP-8-contracts.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MoveItemsInput } from '../../types.js';
import type { MutableToolHandlerRegistry } from '../../../dev/contracts/MCP-98-contracts.js';
import { UTILITY_HANDLER_TOOL_NAMES } from '../../../dev/contracts/MCP-98-contracts.js';
import { VaultUtils } from '../../modules/files/index.js';
import { ObsidianLinks } from '../../modules/links/index.js';
import { DynamicTemplateEngine } from '../../modules/templates/index.js';
import { DateResolver } from '../../date-resolver.js';
import { addVersionMetadata, getToolsForMode } from '../tool-registry.js';
import { format } from 'date-fns';
import { LIFEOS_CONFIG } from '../../config.js';
import { SERVER_VERSION, extractClientInfo } from '../mcp-server.js';
import { logger } from '../../logger.js';

/**
 * Handler registry (lazy initialization)
 */
let utilityHandlers: Map<string, ToolHandler> | null = null;

/**
 * Ensure handlers are initialized
 */
function ensureUtilityHandlersInitialized(): void {
  if (utilityHandlers) return;

  utilityHandlers = new Map<string, ToolHandler>();
  utilityHandlers.set('get_server_version', getServerVersionHandler);
  utilityHandlers.set('get_daily_note', getDailyNoteHandler);
  utilityHandlers.set('diagnose_vault', diagnoseVaultHandler);
  utilityHandlers.set('move_items', moveItemsHandler);
}

/**
 * Get server version handler
 * Returns server information and capabilities
 */
const getServerVersionHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolHandlerContext
): Promise<CallToolResult> => {
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
    // Get tools from registry config
    const tools = getToolsForMode(context.registryConfig);
    const toolsList = tools.map((tool: any) =>
      `- **${tool.name}:** ${tool.description}`
    ).join('\n');

    response.content[0].text += `\n\n## Available Tools\n${toolsList}`;
  }

  return addVersionMetadata(response, context.registryConfig) as CallToolResult;
};

/**
 * Get daily note handler
 * CRITICAL: Preserves analytics tracking for success AND failure
 */
const getDailyNoteHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolHandlerContext
): Promise<CallToolResult> => {
  const startTime = Date.now();

  try {
    // Import DateResolver at the top of the file if not already
    const dateResolver = new DateResolver();

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
        }, context.registryConfig) as CallToolResult;
      }

      if (confirmCreation) {
        return addVersionMetadata({
          content: [{
            type: 'text',
            text: `Daily note for ${format(date, 'MMMM dd, yyyy')} does not exist.\n\nWould you like to create it? Please confirm by running the command again with confirmCreation: false or createIfMissing: true.`
          }]
        }, context.registryConfig) as CallToolResult;
      }

      note = await VaultUtils.createDailyNote(date);
    }

    const obsidianLink = ObsidianLinks.createClickableLink(note.path, `Daily Note: ${format(date, 'MMMM dd, yyyy')}`);

    // Record analytics - SUCCESS
    const clientInfo = extractClientInfo(context.server);
    context.analytics.recordUsage({
      toolName: 'get_daily_note',
      executionTime: Date.now() - startTime,
      success: true,
      clientName: clientInfo.name,
      clientVersion: clientInfo.version,
      sessionId: context.sessionId
    });

    return addVersionMetadata({
      content: [{
        type: 'text',
        text: `# Daily Note: ${format(date, 'MMMM dd, yyyy')}\n\n**Path:** ${note.path}\n\n${obsidianLink}\n\n---\n\n${note.content}`
      }]
    }, context.registryConfig) as CallToolResult;
  } catch (error) {
    // Record analytics - FAILURE
    const clientInfo = extractClientInfo(context.server);
    context.analytics.recordUsage({
      toolName: 'get_daily_note',
      executionTime: Date.now() - startTime,
      success: false,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      clientName: clientInfo.name,
      clientVersion: clientInfo.version,
      sessionId: context.sessionId
    });
    throw error;
  }
};

/**
 * Diagnose vault handler
 * Checks vault for problematic files and YAML issues
 */
const diagnoseVaultHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolHandlerContext
): Promise<CallToolResult> => {
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
  }, context.registryConfig) as CallToolResult;
};

/**
 * Move items handler
 * Moves notes and folders to different locations in the vault
 */
const moveItemsHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolHandlerContext
): Promise<CallToolResult> => {
  const typedArgs = args as unknown as MoveItemsInput;
  const destination = typedArgs.destination as string;
  if (!destination) {
    throw new Error('Destination is required');
  }

  // Collect items to move
  type MoveItemType = { path: string; type?: string };
  const itemsToMove: MoveItemType[] = [];

  if (typedArgs.item) {
    itemsToMove.push({ path: typedArgs.item });
  } else if (typedArgs.items && Array.isArray(typedArgs.items)) {
    itemsToMove.push(...typedArgs.items);
  } else {
    throw new Error('Either item or items must be provided');
  }

  if (itemsToMove.length === 0) {
    throw new Error('No items specified to move');
  }

  const options = {
    createDestination: typedArgs.createDestination as boolean || false,
    overwrite: typedArgs.overwrite as boolean || false,
    mergeFolders: typedArgs.mergeFolders as boolean || false
  };

  const results = {
    moved: { notes: [] as string[], folders: [] as string[] },
    failed: [] as Array<{ path: string; type: string; reason: string }>
  };

  for (const item of itemsToMove) {
    const result = VaultUtils.moveItem(item.path, destination, options);

    if (result.success) {
      const relativePath = result.newPath.replace(LIFEOS_CONFIG.vaultPath + '/', '');

      // Use itemType from VaultUtils.moveItem instead of calling statSync
      if (result.itemType === 'folder') {
        results.moved.folders.push(relativePath);
      } else {
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
  }, context.registryConfig) as CallToolResult;
};

/**
 * Register utility handlers in the global handler registry
 *
 * @param registry - Mutable tool handler registry
 * @returns Same registry for chaining
 */
export function registerUtilityHandlers<T extends MutableToolHandlerRegistry>(
  registry: T
): T {
  ensureUtilityHandlersInitialized();

  UTILITY_HANDLER_TOOL_NAMES.forEach(toolName => {
    const handler = utilityHandlers!.get(toolName);
    if (handler) {
      registry.set(toolName, handler);
    }
  });

  return registry;
}
