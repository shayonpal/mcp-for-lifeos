/**
 * Diagnose Vault Tool Handler
 * Checks vault for problematic files and YAML issues
 */

import { VaultUtils } from '../../vault-utils.js';
import { LIFEOS_CONFIG } from '../../config.js';
import type { ToolResponse } from '../shared.js';

/**
 * Execute diagnose_vault tool
 */
export async function executeDiagnoseVault(
  args: Record<string, any>
): Promise<ToolResponse> {
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
  
  return {
    content: [{
      type: 'text',
      text: diagnosticText
    }]
  };
}
