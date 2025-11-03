/**
 * Link Updater - Update wikilinks after note rename
 *
 * Part of MCP-107: Phase 3 of rename_note implementation
 * Extended by MCP-116: Two-phase link updater with render/commit/direct modes
 *
 * Pure orchestration layer for vault-wide link updates.
 * Delegates all link update logic to VaultUtils.updateNoteLinks().
 *
 * @see https://linear.app/agilecode-studio/issue/MCP-107
 * @see https://linear.app/agilecode-studio/issue/MCP-116
 */

import { LinkScanner } from './link-scanner.js';
import { VaultUtils } from './vault-utils.js';
import type { LinkScanResult, LinkReference } from './link-scanner.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Link update operation mode
 *
 * Two-phase approach separates rendering from committing:
 * - RENDER: Read files, compute updated content, return content map (no writes)
 * - COMMIT: Write pre-rendered content atomically from content map
 * - DIRECT: Legacy mode for non-transactional usage (Phase 3 behavior)
 */
export type LinkUpdateMode = 'render' | 'commit' | 'direct';

/**
 * Result of RENDER phase link updates
 *
 * Returns content map for validation before commit
 */
export interface LinkRenderResult {
  /**
   * Map of file paths to updated content
   * Used during COMMIT phase for atomic writes
   */
  contentMap: Map<string, string>;

  /**
   * Files that will be updated
   */
  affectedFiles: string[];

  /**
   * Total link references across all files
   */
  totalReferences: number;

  /**
   * Scan time from LinkScanner (milliseconds)
   */
  scanTimeMs: number;

  /**
   * Render time (milliseconds)
   */
  renderTimeMs: number;
}

/**
 * Input for COMMIT phase link updates
 */
export interface LinkCommitInput {
  /**
   * Pre-rendered content map from RENDER phase
   */
  contentMap: Map<string, string>;

  /**
   * Total reference count from RENDER phase
   * Allows commit mode to report accurate statistics
   */
  totalReferences: number;

  /**
   * Original manifest entries for validation (optional for MCP-116)
   * Will be used by TransactionManager in MCP-117
   */
  manifestEntries?: unknown;
}

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
// CORE IMPLEMENTATION - OVERLOADED SIGNATURES
// ============================================================================

/**
 * RENDER mode: Compute updated content without writing
 */
export async function updateVaultLinks(
  oldNoteName: string,
  newNoteName: string,
  options: { mode: 'render' }
): Promise<LinkRenderResult>;

/**
 * COMMIT mode: Write pre-rendered content atomically
 */
export async function updateVaultLinks(
  oldNoteName: string,
  newNoteName: string,
  options: { mode: 'commit'; commitInput: LinkCommitInput }
): Promise<LinkUpdateResult>;

/**
 * DIRECT mode: Legacy behavior (Phase 3) - default
 */
export async function updateVaultLinks(
  oldNoteName: string,
  newNoteName: string,
  options?: { mode?: 'direct' }
): Promise<LinkUpdateResult>;

/**
 * Orchestrate vault-wide link updates after note rename
 *
 * Supports three operational modes:
 *
 * **RENDER Mode** ({ mode: 'render' }):
 * 1. Scan vault for wikilink references
 * 2. Read all affected files
 * 3. Compute updated content for each file
 * 4. Build content map: Map<path, updatedContent>
 * 5. Return LinkRenderResult with metrics
 * 6. NO writes performed (read-only operation)
 *
 * **COMMIT Mode** ({ mode: 'commit', commitInput }):
 * 1. Receive pre-rendered content map from RENDER phase
 * 2. Validate manifest entries (optional for MCP-116)
 * 3. Write each file atomically using VaultUtils.writeFileWithRetry
 * 4. Track success/failure for each file
 * 5. Return LinkUpdateResult
 *
 * **DIRECT Mode** (default, backward compatible):
 * 1. Scan vault for wikilink references
 * 2. Group references by source file
 * 3. Update each file sequentially (read + update + write)
 * 4. Collect success/failure information
 * 5. Return LinkUpdateResult with timing metrics
 *
 * Handles individual file failures gracefully:
 * - Continues processing remaining files on failure
 * - Collects error details in failedFiles array
 * - Returns partial success if some files updated successfully
 *
 * **Memory Characteristics:**
 * - RENDER mode: Stores full content of all affected files in memory
 * - Typical usage: ~1-2KB per note, 1-10MB for 1000 affected files
 * - Large vaults: 10K+ affected files may require 100-200MB RAM
 * - Consider batching for very large rename operations (10K+ files)
 *
 * @param oldNoteName - Original note name (without .md extension)
 * @param newNoteName - New note name (without .md extension)
 * @param options - Optional mode configuration
 * @returns Promise resolving to LinkRenderResult or LinkUpdateResult depending on mode
 *
 * @throws Error if oldNoteName or newNoteName are empty
 * @throws Error if vault cannot be accessed (from LinkScanner)
 * @throws Error if mode is 'commit' but commitInput is missing
 */
export async function updateVaultLinks(
  oldNoteName: string,
  newNoteName: string,
  options?: { mode?: LinkUpdateMode; commitInput?: LinkCommitInput }
): Promise<LinkRenderResult | LinkUpdateResult> {
  // Validate parameters
  if (!oldNoteName || !newNoteName) {
    throw new Error('Old note name and new note name are required');
  }

  // Determine mode (default to 'direct' for backward compatibility)
  const mode = options?.mode || 'direct';

  // Route to appropriate implementation
  if (mode === 'render') {
    return await renderLinkUpdates(oldNoteName, newNoteName);
  } else if (mode === 'commit') {
    if (!options?.commitInput) {
      throw new Error('commitInput is required for COMMIT mode');
    }
    return await commitLinkUpdates(options.commitInput);
  } else {
    // DIRECT mode (legacy Phase 3 behavior)
    return await directLinkUpdates(oldNoteName, newNoteName);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Scan vault for link references and group by source file
 *
 * Shared helper used by render and direct modes to eliminate duplication
 *
 * @param targetName - Note name to search for references
 * @returns Scan result with timing and grouped references
 */
async function scanAndGroupReferences(
  targetName: string
): Promise<{ scanResult: LinkScanResult; fileGroups: Map<string, LinkReference[]> }> {
  // Use LinkScanner to find all references to the target note
  // Enable frontmatter scanning for rename operations (MCP-110)
  const scanResult: LinkScanResult = await LinkScanner.scanVaultForLinks(targetName, {
    skipFrontmatter: false, // Include frontmatter links for metadata consistency
  });

  // Group references by source file path
  const fileGroups = new Map<string, LinkReference[]>();
  for (const ref of scanResult.references) {
    const existing = fileGroups.get(ref.sourcePath) || [];
    existing.push(ref);
    fileGroups.set(ref.sourcePath, existing);
  }

  return { scanResult, fileGroups };
}

// ============================================================================
// MODE IMPLEMENTATIONS
// ============================================================================

/**
 * RENDER mode implementation: Generate content map without writes
 *
 * @param oldNoteName - Original note name
 * @param newNoteName - New note name
 * @returns LinkRenderResult with content map and metrics
 */
async function renderLinkUpdates(
  oldNoteName: string,
  newNoteName: string
): Promise<LinkRenderResult> {
  const renderStartTime = Date.now();

  // Step 1 & 2: Scan vault and group references (using shared helper)
  const { scanResult, fileGroups } = await scanAndGroupReferences(oldNoteName);

  // Step 3: Read all affected files and compute updated content (NO writes)
  const contentMap = new Map<string, string>();
  const affectedFiles: string[] = [];

  for (const [sourcePath, _references] of fileGroups.entries()) {
    try {
      // Read file content
      const content = await VaultUtils.readFileWithRetry(sourcePath);

      // Update links in content using VaultUtils
      const updatedContent = VaultUtils.updateNoteLinks(content, oldNoteName, newNoteName);

      // Store in content map (NO write yet)
      contentMap.set(sourcePath, updatedContent);
      affectedFiles.push(sourcePath);
    } catch (error) {
      // In render mode, we skip files that can't be read
      // Error will be logged for debugging, but won't block other files
      // TransactionManager in MCP-117 will provide comprehensive validation
      console.error(`Render mode: Failed to read ${sourcePath}: ${error}`);
    }
  }

  // Step 4: Calculate result metrics
  const renderTimeMs = Date.now() - renderStartTime;

  // Step 5: Return LinkRenderResult (no LinkUpdateResult for render mode)
  return {
    contentMap,
    affectedFiles,
    totalReferences: scanResult.totalReferences,
    scanTimeMs: scanResult.scanTimeMs,
    renderTimeMs
  };
}

/**
 * COMMIT mode implementation: Write pre-rendered content atomically
 *
 * @param commitInput - Pre-rendered content map from RENDER phase
 * @returns LinkUpdateResult with success/failure details
 */
async function commitLinkUpdates(
  commitInput: LinkCommitInput
): Promise<LinkUpdateResult> {
  const commitStartTime = Date.now();

  // Step 1: Extract content map and metadata
  const { contentMap, totalReferences } = commitInput;

  // Step 2: Write each file atomically
  const failedFiles: LinkUpdateFailure[] = [];
  let updatedCount = 0;

  for (const [sourcePath, updatedContent] of contentMap.entries()) {
    try {
      // Write updated content atomically (will use MCP-114's atomic write in future)
      // For now, use standard write with retry
      await VaultUtils.writeFileWithRetry(sourcePath, updatedContent);

      updatedCount++;
    } catch (error) {
      // Collect failure details and continue with remaining files
      failedFiles.push({
        path: sourcePath,
        error: error instanceof Error ? error.message : String(error),
        referenceCount: 0 // Unknown at commit time (only known during render)
      });
    }
  }

  // Step 3: Calculate result metrics
  const updateTimeMs = Date.now() - commitStartTime;
  const success = failedFiles.length === 0;
  const partialSuccess = updatedCount > 0 && failedFiles.length > 0;

  // Step 4: Return LinkUpdateResult
  return {
    success,
    updatedCount,
    totalReferences, // From render phase
    failedFiles,
    partialSuccess,
    scanTimeMs: 0, // Not applicable in commit mode (scan happened in render)
    updateTimeMs
  };
}

/**
 * DIRECT mode implementation: Legacy Phase 3 behavior (read + update + write)
 *
 * This is the original implementation from MCP-107, preserved for backward compatibility.
 *
 * @param oldNoteName - Original note name
 * @param newNoteName - New note name
 * @returns LinkUpdateResult with success/failure details
 */
async function directLinkUpdates(
  oldNoteName: string,
  newNoteName: string
): Promise<LinkUpdateResult> {
  const updateStartTime = Date.now();

  // Step 1 & 2: Scan vault and group references (using shared helper)
  const { scanResult, fileGroups } = await scanAndGroupReferences(oldNoteName);

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
