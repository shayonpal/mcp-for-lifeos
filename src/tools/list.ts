/**
 * Consolidated List Tool Handler
 * Handles universal listing of folders, daily notes, templates, and YAML properties
 */

import { ToolRouter, UniversalListOptions } from '../tool-router.js';
import { ResponseTruncator } from '../response-truncator.js';
import { LIFEOS_CONFIG } from '../config.js';
import { DEFAULT_TOKEN_BUDGET } from '../../dev/contracts/MCP-38-contracts.js';
import type { ToolResponse } from './shared.js';
import { validateToolMode } from './shared.js';
import type { ToolMode } from '../../dev/contracts/MCP-6-contracts.js';

/**
 * Execute consolidated list tool
 */
export async function executeList(
  args: Record<string, any>,
  toolMode: ToolMode
): Promise<ToolResponse> {
  // Validate tool mode
  validateToolMode(toolMode, 'consolidated');

  const listOptions: UniversalListOptions = args as unknown as UniversalListOptions;
  const results = await ToolRouter.routeList(listOptions);

  // Extract format parameter (default: detailed for backward compatibility)
  const format = (args.format === 'concise' || args.format === 'detailed')
    ? args.format
    : 'detailed';

  // Initialize token budget tracker
  const tokenBudget = new ResponseTruncator(DEFAULT_TOKEN_BUDGET);

  let responseText = '';
  let truncated = false;
  let totalItems = 0;
  let shownItems = 0;

  switch (listOptions.type) {
    case 'folders': {
      const folders = results as string[];
      totalItems = folders.length;

      if (format === 'concise') {
        // Build response incrementally with budget tracking
        const includedFolders: string[] = [];
        for (const folder of folders) {
          const formattedItem = `📁 ${folder}\n`;
          if (!tokenBudget.canAddResult(formattedItem)) {
            truncated = true;
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
            truncated = true;
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
      const files = results as string[];
      totalItems = files.length;

      if (format === 'concise') {
        const includedFiles: string[] = [];
        for (const file of files) {
          const formattedItem = `${file}\n`;
          if (!tokenBudget.canAddResult(formattedItem)) {
            truncated = true;
            break;
          }
          tokenBudget.consumeBudget(formattedItem);
          includedFiles.push(file);
        }
        shownItems = includedFiles.length;
        responseText = includedFiles.join('\n');
      } else {
        const header = `Latest ${files.length} daily notes:\n\n`;
        tokenBudget.consumeBudget(header);
        responseText = header;

        const includedFiles: string[] = [];
        for (const file of files) {
          const formattedItem = `**${file}**\n\`${LIFEOS_CONFIG.dailyNotesPath}/${file}\`\n\n`;
          if (!tokenBudget.canAddResult(formattedItem)) {
            truncated = true;
            break;
          }
          tokenBudget.consumeBudget(formattedItem);
          includedFiles.push(file);
        }
        shownItems = includedFiles.length;
        responseText += includedFiles.map(f => `**${f}**\n\`${LIFEOS_CONFIG.dailyNotesPath}/${f}\``).join('\n\n');
      }
      break;
    }

    case 'templates': {
      const templates = results as any[];
      totalItems = templates.length;

      if (format === 'concise') {
        const includedTemplates: any[] = [];
        for (const template of templates) {
          const formattedItem = `**${template.key}**: ${template.name}\n`;
          if (!tokenBudget.canAddResult(formattedItem)) {
            truncated = true;
            break;
          }
          tokenBudget.consumeBudget(formattedItem);
          includedTemplates.push(template);
        }
        shownItems = includedTemplates.length;
        responseText = includedTemplates.map(t => `**${t.key}**: ${t.name}`).join('\n');
      } else {
        const header = `# Available Templates\n\n`;
        tokenBudget.consumeBudget(header);
        responseText = header;

        const includedTemplates: any[] = [];
        for (let index = 0; index < templates.length; index++) {
          const template = templates[index];
          const formattedItem =
            `**${index + 1}. ${template.name}** (\`${template.key}\`)\n` +
            `   ${template.description}\n` +
            `   📁 Target: \`${template.targetFolder || 'Auto-detect'}\`\n` +
            `   📄 Content Type: ${template.contentType || 'Varies'}\n\n`;
          if (!tokenBudget.canAddResult(formattedItem)) {
            truncated = true;
            break;
          }
          tokenBudget.consumeBudget(formattedItem);
          includedTemplates.push(template);
        }
        shownItems = includedTemplates.length;
        responseText += includedTemplates.map((template, index) => {
          return `**${index + 1}. ${template.name}** (\`${template.key}\`)\n` +
                 `   ${template.description}\n` +
                 `   📁 Target: \`${template.targetFolder || 'Auto-detect'}\`\n` +
                 `   📄 Content Type: ${template.contentType || 'Varies'}`;
        }).join('\n\n');
      }
      break;
    }

    case 'yaml_properties': {
      const propertiesInfo = results as any;
      const sortedProperties = propertiesInfo.properties;
      totalItems = sortedProperties.length;

      if (format === 'concise') {
        const includedProperties: string[] = [];
        for (const prop of sortedProperties) {
          const formattedItem = `${prop}\n`;
          if (!tokenBudget.canAddResult(formattedItem)) {
            truncated = true;
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
          let formattedItem: string;
          if (listOptions.includeCount && propertiesInfo.counts) {
            const count = propertiesInfo.counts[prop] || 0;
            formattedItem = `- **${prop}** (used in ${count} note${count !== 1 ? 's' : ''})\n`;
          } else {
            formattedItem = `- ${prop}\n`;
          }
          if (!tokenBudget.canAddResult(formattedItem)) {
            truncated = true;
            break;
          }
          tokenBudget.consumeBudget(formattedItem);
          includedProperties.push(prop);
        }
        shownItems = includedProperties.length;

        if (listOptions.includeCount && propertiesInfo.counts) {
          responseText += includedProperties.map((prop: string) => {
            const count = propertiesInfo.counts[prop] || 0;
            return `- **${prop}** (used in ${count} note${count !== 1 ? 's' : ''})`;
          }).join('\n');
        } else {
          responseText += includedProperties.map((prop: string) => `- ${prop}`).join('\n');
        }
      }
      break;
    }

    default:
      responseText = `Listed ${Array.isArray(results) ? results.length : 'unknown'} items`;
      totalItems = Array.isArray(results) ? results.length : 0;
      shownItems = totalItems;
  }

  // Generate truncation metadata
  const truncationInfo = tokenBudget.getTruncationInfo(
    shownItems,
    totalItems,
    format,
    false  // autoDowngraded not implemented yet
  );

  // Add truncation notice if applicable
  if (truncationInfo.truncated) {
    responseText = `Showing ${truncationInfo.shownCount} of ${truncationInfo.totalCount} items (limit reached)\n\n${truncationInfo.suggestion}\n\n---\n\n${responseText}`;
  }

  return {
    content: [{
      type: 'text',
      text: responseText
    }],
    // Add truncation metadata for debugging/telemetry
    truncation: truncationInfo.truncated ? truncationInfo : undefined
  };
}
