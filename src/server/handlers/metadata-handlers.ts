/**
 * Metadata operation handlers for MCP-98
 * Handles YAML and metadata operations
 */

import type { ToolHandler, ToolHandlerContext } from '../../../dev/contracts/MCP-8-contracts.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MutableToolHandlerRegistry } from '../../../dev/contracts/MCP-98-contracts.js';
import { METADATA_HANDLER_TOOL_NAMES } from '../../../dev/contracts/MCP-98-contracts.js';
import { getYamlPropertyValues } from '../../modules/files/index.js';
import { addVersionMetadata } from '../tool-registry.js';

/**
 * Handler registry (lazy initialization)
 */
let metadataHandlers: Map<string, ToolHandler> | null = null;

/**
 * Ensure handlers are initialized
 */
function ensureMetadataHandlersInitialized(): void {
  if (metadataHandlers) return;

  metadataHandlers = new Map<string, ToolHandler>();
  metadataHandlers.set('get_yaml_rules', getYamlRulesHandler);
  metadataHandlers.set('list_yaml_property_values', listYamlPropertyValuesHandler);
}

/**
 * Get YAML rules handler
 * Returns the YAML frontmatter rules document
 */
const getYamlRulesHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolHandlerContext
): Promise<CallToolResult> => {
  if (!context.yamlRulesManager.isConfigured()) {
    return addVersionMetadata({
      content: [{
        type: 'text',
        text: 'YAML rules are not configured. Set the yamlRulesPath in your config to enable this feature.'
      }]
    }, context.registryConfig) as CallToolResult;
  }

  try {
    const isValid = await context.yamlRulesManager.validateRulesFile();
    if (!isValid) {
      return addVersionMetadata({
        content: [{
          type: 'text',
          text: `YAML rules file not found or not accessible at: ${context.yamlRulesManager.getRulesPath()}`
        }]
      }, context.registryConfig) as CallToolResult;
    }

    const rules = await context.yamlRulesManager.getRules();
    return addVersionMetadata({
      content: [{
        type: 'text',
        text: `# YAML Frontmatter Rules\n\n${rules}`
      }]
    }, context.registryConfig) as CallToolResult;
  } catch (error) {
    return addVersionMetadata({
      content: [{
        type: 'text',
        text: `Error reading YAML rules: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }, context.registryConfig) as CallToolResult;
  }
};

/**
 * List YAML property values handler
 * Lists all unique values used for a specific YAML property
 */
const listYamlPropertyValuesHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolHandlerContext
): Promise<CallToolResult> => {
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
  const propertyInfo = getYamlPropertyValues(property, options);

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
  }, context.registryConfig);

  return response as CallToolResult;
};

/**
 * Register metadata handlers in the global handler registry
 *
 * @param registry - Mutable tool handler registry
 * @returns Same registry for chaining
 */
export function registerMetadataHandlers<T extends MutableToolHandlerRegistry>(
  registry: T
): T {
  ensureMetadataHandlersInitialized();

  METADATA_HANDLER_TOOL_NAMES.forEach(toolName => {
    const handler = metadataHandlers!.get(toolName);
    if (handler) {
      registry.set(toolName, handler);
    }
  });

  return registry;
}
