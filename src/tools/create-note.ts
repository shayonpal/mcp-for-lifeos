/**
 * Consolidated Create Note Tool Handler
 * Handles smart note creation with template detection
 */

import { ToolRouter, SmartCreateNoteOptions } from '../tool-router.js';
import { VaultUtils } from '../vault-utils.js';
import { ObsidianLinks } from '../obsidian-links.js';
import { LIFEOS_CONFIG } from '../config.js';
import type { ToolResponse } from './shared.js';
import { validateToolMode } from './shared.js';
import type { ToolMode } from '../../dev/contracts/MCP-6-contracts.js';

/**
 * Execute consolidated create_note tool
 */
export async function executeCreateNote(
  args: Record<string, any>,
  toolMode: ToolMode
): Promise<ToolResponse> {
  // Validate tool mode
  validateToolMode(toolMode, 'consolidated');
  
  const createOptions: SmartCreateNoteOptions = args as unknown as SmartCreateNoteOptions;
  const templateResult = await ToolRouter.routeCreateNote(createOptions);
  
  // Generate filename, removing only Obsidian-restricted characters
  const fileName = createOptions.title
    .replace(/[\[\]:;]/g, '')        // Remove square brackets, colons, and semicolons (Obsidian limitations)
    .replace(/\s+/g, ' ')            // Normalize multiple spaces to single space
    .trim();                         // Remove leading/trailing spaces
  
  const note = VaultUtils.createNote(
    fileName, 
    templateResult.frontmatter, 
    templateResult.content, 
    templateResult.targetFolder
  );

  const obsidianLink = ObsidianLinks.createClickableLink(note.path, createOptions.title);
  
  // Determine if template was used - check templateResult structure
  const usedTemplate = createOptions.template || 
    (typeof templateResult === 'object' && templateResult.frontmatter && 
     (templateResult.frontmatter.category?.includes?.('Restaurant') || 
      templateResult.frontmatter.tags?.includes?.('restaurant'))) ? 'restaurant' : null;
  
  return {
    content: [{
      type: 'text',
      text: `✅ Created note: **${createOptions.title}**\n\n${obsidianLink}\n\n📁 Location: \`${note.path.replace(LIFEOS_CONFIG.vaultPath + '/', '')}\`\n🔧 Smart Creation: ${usedTemplate ? `Template "${usedTemplate}" auto-detected` : 'Manual creation'}`
    }]
  };
}
