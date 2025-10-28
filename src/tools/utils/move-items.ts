/**
 * Move Items Tool Handler
 * Handles moving notes and folders to different locations in the vault
 */

import { VaultUtils } from '../../vault-utils.js';
import { LIFEOS_CONFIG } from '../../config.js';
import type { MoveItemsInput, MoveItemType } from '../../types.js';
import type { ToolResponse } from '../shared.js';
import { statSync } from 'fs';

/**
 * Execute move_items tool
 */
export async function executeMoveItems(
  args: Record<string, any>
): Promise<ToolResponse> {
  const argsTyped = args as unknown as MoveItemsInput;
  const destination = argsTyped.destination as string;
  if (!destination) {
    throw new Error('Destination is required');
  }

  // Collect items to move
  const itemsToMove: MoveItemType[] = [];

  if (argsTyped.item) {
    itemsToMove.push({ path: argsTyped.item });
  } else if (argsTyped.items && Array.isArray(argsTyped.items)) {
    itemsToMove.push(...argsTyped.items);
  } else {
    throw new Error('Either item or items must be provided');
  }

  if (itemsToMove.length === 0) {
    throw new Error('No items specified to move');
  }

  const options = {
    createDestination: argsTyped.createDestination as boolean || false,
    overwrite: argsTyped.overwrite as boolean || false,
    mergeFolders: argsTyped.mergeFolders as boolean || false
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

  return {
    content: [{
      type: 'text',
      text: response
    }]
  };
}
