/**
 * Link Updater - Update wikilinks after note rename
 *
 * Part of MCP-107: Phase 3 of rename_note implementation
 * Provides link update functionality without rollback capability.
 *
 * Pure orchestration layer for vault-wide link updates.
 * Delegates all link update logic to VaultUtils.updateNoteLinks().
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-107
 */

import { LinkScanner } from './link-scanner.js';
import { VaultUtils } from './vault-utils.js';
import type { LinkScanResult, LinkReference } from './link-scanner.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result of updating wikilinks across the vault
 */
export interface LinkUpdateResult {
  /** Whether all link updates completed successfully */
  success: boolean;

  /** Number of files successfully updated */
  updatedCount: number;

  /** Total number of link references found across vault */
  totalReferences: number;

  /** Files that failed to update with error details */
  failedFiles: LinkUpdateFailure[];

  /** Whether operation completed with partial success */
  partialSuccess: boolean;

  /** Scan time from LinkScanner operation (milliseconds) */
  scanTimeMs: number;

  /** Total update time including file I/O (milliseconds) */
  updateTimeMs: number;
}

/**
 * Details about a file that failed to update
 */
export interface LinkUpdateFailure {
  /** Path to the file that failed */
  path: string;

  /** Error message describing why update failed */
  error: string;

  /** Number of link references in this file */
  referenceCount: number;
}

// ============================================================================
// CORE IMPLEMENTATION
// ============================================================================

/**
 * Orchestrate vault-wide link updates after note rename
 *
 * Workflow:
 * 1. Use LinkScanner.scanVaultForLinks() to find all references
 * 2. Group references by source file
 * 3. Update each referenced file with updateNoteLinks()
 * 4. Collect success/failure information
 * 5. Return structured result with timing metrics
 *
 * Handles individual file failures gracefully:
 * - Continues processing remaining files on failure
 * - Collects error details in failedFiles array
 * - Returns partial success if some files updated successfully
 *
 * @param oldNoteName - Original note name (without .md extension)
 * @param newNoteName - New note name (without .md extension)
 * @returns Promise resolving to LinkUpdateResult with success/failure details
 *
 * @throws Error if oldNoteName or newNoteName are empty
 * @throws Error if vault cannot be accessed (from LinkScanner)
 */
export async function updateVaultLinks(
  oldNoteName: string,
  newNoteName: string
): Promise<LinkUpdateResult> {
  const updateStartTime = Date.now();

  // Validate parameters
  if (!oldNoteName || !newNoteName) {
    throw new Error('Old note name and new note name are required');
  }

  // Step 1: Use LinkScanner to find all references to the old note
  const scanResult: LinkScanResult = await LinkScanner.scanVaultForLinks(oldNoteName);

  // Step 2: Group references by source file path
  const fileGroups = new Map<string, LinkReference[]>();
  for (const ref of scanResult.references) {
    const existing = fileGroups.get(ref.sourcePath) || [];
    existing.push(ref);
    fileGroups.set(ref.sourcePath, existing);
  }

  // Step 3: Update each file sequentially (safer for iCloud sync)
  const failedFiles: LinkUpdateFailure[] = [];
  let updatedCount = 0;

  for (const [sourcePath, references] of fileGroups.entries()) {
    try {
      // Read file content
      const content = await VaultUtils.readFileWithRetry(sourcePath);

      // Update links in content using VaultUtils
      const updatedContent = VaultUtils.updateNoteLinks(content, oldNoteName, newNoteName);

      // Write updated content back
      await VaultUtils.writeFileWithRetry(sourcePath, updatedContent);

      updatedCount++;
    } catch (error) {
      // Collect failure details and continue with remaining files
      failedFiles.push({
        path: sourcePath,
        error: error instanceof Error ? error.message : String(error),
        referenceCount: references.length
      });
    }
  }

  // Step 4: Calculate result metrics
  const updateTimeMs = Date.now() - updateStartTime;
  const success = failedFiles.length === 0;
  const partialSuccess = updatedCount > 0 && failedFiles.length > 0;

  // Step 5: Return structured result
  return {
    success,
    updatedCount,
    totalReferences: scanResult.totalReferences,
    failedFiles,
    partialSuccess,
    scanTimeMs: scanResult.scanTimeMs,
    updateTimeMs
  };
}
