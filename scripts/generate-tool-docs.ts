#!/usr/bin/env tsx
/**
 * Tool Documentation Generation Script
 *
 * Generates machine-readable JSON schema documentation from TypeScript tool definitions.
 * This ensures documentation stays in sync with code and enables external tooling integration.
 *
 * Usage:
 *   npm run docs:generate
 *   tsx scripts/generate-tool-docs.ts
 *
 * Output:
 *   - docs/api/tool-schemas.json: Complete JSON schema for all tools
 *
 * Related:
 *   - Linear Issue: MCP-14
 *   - Source: src/server/tool-registry.ts
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-14
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolMode } from '../dev/contracts/MCP-6-contracts.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import tool registry functions
import {
  getConsolidatedTools,
  getLegacyTools,
  getLegacyAliases,
  getAlwaysAvailableTools,
  getToolsForMode
} from '../src/server/tool-registry.js';

/**
 * Tool schema with categorization and metadata
 */
interface ToolSchema {
  name: string;
  description: string;
  category: string;
  inputSchema: any;
  annotations?: {
    readOnlyHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  availability: {
    modes: ToolMode[];
    alwaysAvailable: boolean;
  };
}

/**
 * Complete tool documentation structure
 */
interface ToolDocumentation {
  metadata: {
    generatedAt: string;
    version: string;
    source: string;
    totalTools: number;
  };
  modes: {
    [key in ToolMode]: {
      description: string;
      toolCount: number;
      tools: string[];
    };
  };
  categories: {
    [category: string]: {
      description: string;
      tools: string[];
    };
  };
  tools: ToolSchema[];
}

/**
 * Categorize tools based on their functionality
 */
function categorizeTool(toolName: string): string {
  // Consolidated tools
  if (['search', 'create_note', 'list'].includes(toolName)) {
    return 'Consolidated Tools';
  }

  // Search tools
  if (toolName.includes('search') || toolName.includes('find')) {
    return 'Search Tools';
  }

  // Note creation tools
  if (toolName.includes('create')) {
    return 'Note Creation';
  }

  // Note editing tools
  if (['edit_note', 'read_note', 'rename_note', 'insert_content'].includes(toolName)) {
    return 'Note Editing';
  }

  // Listing tools
  if (toolName.includes('list')) {
    return 'Listing & Discovery';
  }

  // Daily note tools
  if (toolName.includes('daily')) {
    return 'Daily Notes';
  }

  // YAML tools
  if (toolName.includes('yaml')) {
    return 'YAML Management';
  }

  // Utility tools
  if (['diagnose_vault', 'get_server_version', 'get_yaml_rules', 'move_items'].includes(toolName)) {
    return 'Utilities';
  }

  return 'Other';
}

/**
 * Determine which modes a tool is available in
 */
function getToolAvailability(toolName: string): { modes: ToolMode[]; alwaysAvailable: boolean } {
  const consolidated = getConsolidatedTools();
  const legacy = getLegacyTools();
  const aliases = getLegacyAliases();
  const always = getAlwaysAvailableTools();

  const isAlways = always.some(t => t.name === toolName);
  const isConsolidated = consolidated.some(t => t.name === toolName);
  const isLegacy = legacy.some(t => t.name === toolName);
  const isAlias = aliases.some(t => t.name === toolName);

  const modes: ToolMode[] = [];

  if (isAlways) {
    modes.push('consolidated-only', 'legacy-only', 'consolidated-with-aliases');
    return { modes, alwaysAvailable: true };
  }

  if (isConsolidated) {
    modes.push('consolidated-only', 'consolidated-with-aliases');
  }

  if (isLegacy) {
    modes.push('legacy-only', 'consolidated-with-aliases');
  }

  if (isAlias && !isLegacy) {
    modes.push('consolidated-with-aliases');
  }

  return { modes, alwaysAvailable: false };
}

/**
 * Convert a Tool to ToolSchema with metadata
 */
function toolToSchema(tool: Tool): ToolSchema {
  return {
    name: tool.name,
    description: tool.description || '',
    category: categorizeTool(tool.name),
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
    availability: getToolAvailability(tool.name)
  };
}

/**
 * Generate complete tool documentation
 */
function generateToolDocumentation(): ToolDocumentation {
  // Get all unique tools across all modes
  const allTools = new Map<string, Tool>();

  // Collect from all modes
  for (const mode of ['consolidated-only', 'legacy-only', 'consolidated-with-aliases'] as ToolMode[]) {
    const tools = getToolsForMode({
      mode,
      serverName: 'lifeos-mcp',
      serverVersion: '2.0.1'
    });

    for (const tool of tools) {
      if (!allTools.has(tool.name)) {
        allTools.set(tool.name, tool);
      }
    }
  }

  // Convert to schemas
  const toolSchemas = Array.from(allTools.values()).map(toolToSchema);

  // Sort by name
  toolSchemas.sort((a, b) => a.name.localeCompare(b.name));

  // Group by category
  const categories: { [key: string]: { description: string; tools: string[] } } = {};
  const categoryDescriptions: { [key: string]: string } = {
    'Consolidated Tools': 'Modern unified tools with intelligent auto-routing (recommended)',
    'Search Tools': 'Legacy search tools for finding notes by various criteria',
    'Note Creation': 'Tools for creating new notes with templates',
    'Note Editing': 'Tools for reading, editing, and managing existing notes',
    'Listing & Discovery': 'Tools for browsing and discovering vault contents',
    'Daily Notes': 'Tools for managing daily journal entries',
    'YAML Management': 'Tools for managing YAML frontmatter properties',
    'Utilities': 'Utility tools for vault diagnostics and configuration'
  };

  for (const schema of toolSchemas) {
    if (!categories[schema.category]) {
      categories[schema.category] = {
        description: categoryDescriptions[schema.category] || '',
        tools: []
      };
    }
    categories[schema.category].tools.push(schema.name);
  }

  // Read package.json for version
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  // Build documentation
  const doc: ToolDocumentation = {
    metadata: {
      generatedAt: new Date().toISOString(),
      version: packageJson.version,
      source: 'src/server/tool-registry.ts',
      totalTools: toolSchemas.length
    },
    modes: {
      'consolidated-only': {
        description: 'Modern consolidated tools (recommended) - cleaner interface with 13 tools',
        toolCount: getToolsForMode({
          mode: 'consolidated-only',
          serverName: 'lifeos-mcp',
          serverVersion: packageJson.version
        }).length,
        tools: getToolsForMode({
          mode: 'consolidated-only',
          serverName: 'lifeos-mcp',
          serverVersion: packageJson.version
        }).map(t => t.name)
      },
      'legacy-only': {
        description: 'Original legacy tools for backward compatibility - 21 tools',
        toolCount: getToolsForMode({
          mode: 'legacy-only',
          serverName: 'lifeos-mcp',
          serverVersion: packageJson.version
        }).length,
        tools: getToolsForMode({
          mode: 'legacy-only',
          serverName: 'lifeos-mcp',
          serverVersion: packageJson.version
        }).map(t => t.name)
      },
      'consolidated-with-aliases': {
        description: 'Maximum compatibility mode with all tools - 35 tools',
        toolCount: getToolsForMode({
          mode: 'consolidated-with-aliases',
          serverName: 'lifeos-mcp',
          serverVersion: packageJson.version
        }).length,
        tools: getToolsForMode({
          mode: 'consolidated-with-aliases',
          serverName: 'lifeos-mcp',
          serverVersion: packageJson.version
        }).map(t => t.name)
      }
    },
    categories,
    tools: toolSchemas
  };

  return doc;
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('🔧 Generating tool documentation...\n');

    // Generate documentation
    const doc = generateToolDocumentation();

    // Write JSON schema
    const outputPath = path.join(__dirname, '..', 'docs', 'api', 'tool-schemas.json');
    fs.writeFileSync(
      outputPath,
      JSON.stringify(doc, null, 2),
      'utf-8'
    );

    console.log('✅ Generated tool documentation:');
    console.log(`   📄 ${outputPath}`);
    console.log(`   📊 Total tools: ${doc.metadata.totalTools}`);
    console.log(`   📦 Version: ${doc.metadata.version}`);
    console.log(`   🕐 Generated: ${doc.metadata.generatedAt}\n`);

    // Print mode summary
    console.log('📋 Tool counts by mode:');
    for (const [mode, config] of Object.entries(doc.modes)) {
      console.log(`   • ${mode}: ${config.toolCount} tools`);
    }
    console.log();

    // Print category summary
    console.log('🗂️  Tool categories:');
    const sortedCategories = Object.entries(doc.categories)
      .sort(([, a], [, b]) => b.tools.length - a.tools.length);
    for (const [category, config] of sortedCategories) {
      console.log(`   • ${category}: ${config.tools.length} tools`);
    }
    console.log();

    console.log('✨ Documentation generation complete!\n');

  } catch (error) {
    console.error('❌ Error generating tool documentation:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateToolDocumentation, toolToSchema, categorizeTool, getToolAvailability };
