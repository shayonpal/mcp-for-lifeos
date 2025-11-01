/**
 * Transaction Manager - Five-phase atomic rename operations with rollback
 *
 * Part of MCP-117: Transaction Coordinator Implementation
 * Implements MCP-108 contracts for atomic rename operations with Write-Ahead Logging
 *
 * Five-Phase Protocol:
 * 1. PLAN: Build operation manifest with SHA-256 hashes
 * 2. PREPARE: Stage files to temp locations, write WAL
 * 3. VALIDATE: Verify staged files match manifest (staleness detection)
 * 4. COMMIT: Atomically promote staged files using fs.renameSync
 * 5. SUCCESS/ABORT: Cleanup temps and WAL, or rollback on failure
 *
 * Key Features:
 * - Write-Ahead Logging (WAL) for crash recovery
 * - Staleness detection via SHA-256 hash comparison
 * - Two-phase link updates (render → commit)
 * - Graceful rollback with partial recovery support
 * - Manual recovery instructions on rollback failure
 *
 * @see dev/contracts/MCP-108-contracts.ts
 * @see https://linear.app/agilecode-studio/issue/MCP-117
 */

import { createHash } from 'crypto';
import { randomUUID } from 'crypto';
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
} from 'fs';
import { basename } from 'path';
import type {
  TransactionPhase,
  TransactionState,
  TransactionManifest,
  TransactionResult,
  RollbackResult,
  WALEntry,
} from '../dev/contracts/MCP-108-contracts.js';
import { WALManager } from './wal-manager.js';
import { updateVaultLinks } from './link-updater.js';
import type { LinkRenderResult } from './link-updater.js';
import { VaultUtils } from './vault-utils.js';
import { TransactionErrorCode } from './error-types.js';
import { LIFEOS_CONFIG } from './config.js';

/**
 * TransactionManager - Coordinates atomic rename operations with rollback
 *
 * Implements five-phase protocol with Write-Ahead Logging for vault consistency
 */
export class TransactionManager {
  private readonly vaultPath: string;
  private readonly walManager: WALManager;

  constructor(vaultPath?: string, walManager?: WALManager) {
    this.vaultPath = vaultPath ?? LIFEOS_CONFIG.vaultPath;
    this.walManager = walManager ?? new WALManager();
  }

  /**
   * Execute transaction with five-phase protocol
   *
   * @param oldPath - Source note path (absolute)
   * @param newPath - Destination note path (absolute)
   * @param updateLinks - Whether to update wikilinks across vault
   * @returns Transaction result with success/failure details
   */
  async execute(
    oldPath: string,
    newPath: string,
    updateLinks: boolean
  ): Promise<TransactionResult> {
    // Initialize transaction state
    const correlationId = randomUUID(); // UUID v4
    const timestamp = new Date().toISOString();
    const phaseTimings: Partial<Record<TransactionPhase, number>> = {};

    const state: TransactionState = {
      correlationId,
      phase: 'plan',
      timestamp,
      vaultPath: this.vaultPath,
      manifest: {
        noteRename: {
          from: oldPath,
          to: newPath,
          sha256Before: '',
        },
        linkUpdates: [],
        totalOperations: 0,
      },
    };

    try {
      // Phase 1: PLAN - Build operation manifest
      const planStartTime = Date.now();
      state.manifest = await this.plan(oldPath, newPath, updateLinks);
      phaseTimings.plan = Date.now() - planStartTime;

      // Phase 2: PREPARE - Stage files and write WAL
      state.phase = 'prepare';
      const prepareStartTime = Date.now();
      await this.prepare(state);
      phaseTimings.prepare = Date.now() - prepareStartTime;

      // Phase 3: VALIDATE - Verify staged files
      state.phase = 'validate';
      const validateStartTime = Date.now();
      await this.validate(state);
      phaseTimings.validate = Date.now() - validateStartTime;

      // Phase 4: COMMIT - Atomically promote staged files
      state.phase = 'commit';
      const commitStartTime = Date.now();
      await this.commit(state);
      phaseTimings.commit = Date.now() - commitStartTime;

      // Phase 5: SUCCESS - Cleanup temps and WAL
      state.phase = 'success';
      const successStartTime = Date.now();
      await this.success(state);
      phaseTimings.success = Date.now() - successStartTime;

      // Build success result
      const totalTimeMs = Object.values(phaseTimings).reduce((a, b) => a + b, 0);
      return {
        success: true,
        correlationId,
        finalPhase: 'success',
        noteRename: {
          oldPath,
          newPath,
          completed: true,
        },
        linkUpdates: updateLinks ? {
          updatedCount: state.manifest.linkUpdates.filter(l => l.completed).length,
          failedCount: state.manifest.linkUpdates.filter(l => !l.completed).length,
          totalReferences: state.manifest.linkUpdates.reduce((sum, l) => sum + l.referenceCount, 0),
        } : undefined,
        metrics: {
          totalTimeMs,
          phaseTimings,
        },
      };

    } catch (error) {
      // Phase 5 (alternative): ABORT - Rollback and generate recovery instructions
      const rollbackResult = await this.abort(state, error as Error);

      const totalTimeMs = Object.values(phaseTimings).reduce((a, b) => a + b, 0);
      return {
        success: false,
        correlationId,
        finalPhase: 'abort',
        rollback: rollbackResult,
        metrics: {
          totalTimeMs,
          phaseTimings,
        },
      };
    }
  }

  /**
   * Plan phase: Build operation manifest with SHA-256 hashes
   *
   * Steps:
   * 1. Compute SHA-256 hash of source note file
   * 2. If updateLinks=true, call updateVaultLinks({ mode: 'render' })
   * 3. Build manifest with all operation details
   *
   * @param oldPath - Source note path
   * @param newPath - Destination note path
   * @param updateLinks - Whether to update links
   * @returns Complete transaction manifest
   */
  async plan(
    oldPath: string,
    newPath: string,
    updateLinks: boolean
  ): Promise<TransactionManifest> {
    try {
      // Step 1: Compute SHA-256 hash of source note
      const noteContent = readFileSync(oldPath, 'utf-8');
      const sha256Before = this.computeSHA256(noteContent);

      // Initialize manifest
      const manifest: TransactionManifest = {
        noteRename: {
          from: oldPath,
          to: newPath,
          sha256Before,
        },
        linkUpdates: [],
        totalOperations: 1, // Start with note rename operation
      };

      // Step 2: If updateLinks=true, render link updates
      if (updateLinks) {
        const oldNoteName = this.extractNoteName(oldPath);
        const newNoteName = this.extractNoteName(newPath);

        const renderResult: LinkRenderResult = await updateVaultLinks(
          oldNoteName,
          newNoteName,
          { mode: 'render' }
        );

        // Step 3: Build link update manifest entries
        for (const [filePath, renderedContent] of renderResult.contentMap.entries()) {
          const fileContent = readFileSync(filePath, 'utf-8');
          const sha256Before = this.computeSHA256(fileContent);

          manifest.linkUpdates.push({
            path: filePath,
            sha256Before,
            renderedContent,
            referenceCount: 1, // Will be updated during scan
            completed: false,
          });
        }

        manifest.totalOperations += manifest.linkUpdates.length;
      }

      return manifest;

    } catch (error) {
      throw new Error(
        `[${TransactionErrorCode.TRANSACTION_PLAN_FAILED}] Failed to build transaction manifest: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Prepare phase: Stage files to temp locations and write WAL
   *
   * Steps:
   * 1. Stage note to .mcp-staged-{correlationId}
   * 2. Stage all link update files to temp locations
   * 3. Write WAL entry with complete manifest
   * 4. Update state with WAL path
   *
   * @param state - Current transaction state
   */
  async prepare(state: TransactionState): Promise<void> {
    try {
      const { correlationId, manifest } = state;

      // Step 1: Stage source note to temp location
      const stagedNotePath = `${manifest.noteRename.to}.mcp-staged-${correlationId}`;
      const noteContent = readFileSync(manifest.noteRename.from, 'utf-8');
      VaultUtils.writeFileWithRetry(stagedNotePath, noteContent, 'utf-8', {
        atomic: false, // Temp file doesn't need atomicity
        transactional: true,
      });
      manifest.noteRename.stagedPath = stagedNotePath;

      // Step 2: Stage all link update files
      for (const linkUpdate of manifest.linkUpdates) {
        const stagedPath = `${linkUpdate.path}.mcp-staged-${correlationId}`;

        if (!linkUpdate.renderedContent) {
          throw new Error(`Missing rendered content for ${linkUpdate.path}`);
        }

        VaultUtils.writeFileWithRetry(stagedPath, linkUpdate.renderedContent, 'utf-8', {
          atomic: false, // Temp file doesn't need atomicity
          transactional: true,
        });
        linkUpdate.stagedPath = stagedPath;
      }

      // Step 3: Write WAL entry
      const walEntry: WALEntry = {
        version: '1.0',
        correlationId,
        timestamp: state.timestamp,
        vaultPath: this.vaultPath,
        phase: 'prepare',
        operation: 'rename_note',
        manifest,
        pid: process.pid,
      };

      const walPath = await this.walManager.writeWAL(walEntry);
      state.walPath = walPath;

    } catch (error) {
      throw new Error(
        `[${TransactionErrorCode.TRANSACTION_PREPARE_FAILED}] Failed to stage files and write WAL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate phase: Verify staged files and detect staleness
   *
   * Steps:
   * 1. Recompute SHA-256 hashes of source files
   * 2. Compare with manifest hashes
   * 3. Throw TRANSACTION_STALE_CONTENT if mismatch detected
   * 4. Update WAL to 'validate' phase
   *
   * TODO: Parallelize hash computation using Promise.all() for better performance
   * @see Code review MCP-117 - sequential hash validation optimization
   *
   * @param state - Current transaction state
   */
  async validate(state: TransactionState): Promise<void> {
    try {
      const { manifest } = state;
      const staleFiles: string[] = [];

      // Step 1 & 2: Validate source note hash
      // TODO: Parallelize with link update validation below
      if (existsSync(manifest.noteRename.from)) {
        const currentContent = readFileSync(manifest.noteRename.from, 'utf-8');
        const currentHash = this.computeSHA256(currentContent);

        if (currentHash !== manifest.noteRename.sha256Before) {
          staleFiles.push(manifest.noteRename.from);
        }
      }

      // Step 1 & 2: Validate link update file hashes
      // TODO: Parallelize with Promise.all() for I/O-bound hash checks
      for (const linkUpdate of manifest.linkUpdates) {
        if (existsSync(linkUpdate.path)) {
          const currentContent = readFileSync(linkUpdate.path, 'utf-8');
          const currentHash = this.computeSHA256(currentContent);

          if (currentHash !== linkUpdate.sha256Before) {
            staleFiles.push(linkUpdate.path);
          }
        }
      }

      // Step 3: Throw if staleness detected
      if (staleFiles.length > 0) {
        throw new Error(
          `[${TransactionErrorCode.TRANSACTION_STALE_CONTENT}] Files modified during transaction (staleness detected): ${staleFiles.join(', ')}`
        );
      }

      // Step 4: Update WAL to validate phase
      if (state.walPath) {
        const walEntry = await this.walManager.readWAL(state.walPath);
        walEntry.phase = 'validate';
        await this.walManager.writeWAL(walEntry);
      }

    } catch (error) {
      // Preserve TRANSACTION_STALE_CONTENT errors
      if (error instanceof Error && error.message.includes(TransactionErrorCode.TRANSACTION_STALE_CONTENT)) {
        throw error;
      }

      throw new Error(
        `[${TransactionErrorCode.TRANSACTION_VALIDATE_FAILED}] Failed to validate staged files: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Commit phase: Atomically promote staged files using fs.renameSync
   *
   * Steps:
   * 1. Atomically rename staged note to final destination
   * 2. If updateLinks=true, call updateVaultLinks({ mode: 'commit' })
   * 3. Mark operations as completed in manifest
   * 4. Update WAL to 'commit' phase
   *
   * @param state - Current transaction state
   */
  async commit(state: TransactionState): Promise<void> {
    try {
      const { manifest } = state;

      // Step 1: Atomically rename note (POSIX atomic on macOS)
      if (!manifest.noteRename.stagedPath) {
        throw new Error('Note staged path not found in manifest');
      }

      renameSync(manifest.noteRename.stagedPath, manifest.noteRename.to);

      // Delete original source file after successful rename to staged location
      if (existsSync(manifest.noteRename.from)) {
        rmSync(manifest.noteRename.from, { force: true });
      }

      manifest.noteRename.completed = true;

      // Step 2: Commit link updates if present
      if (manifest.linkUpdates.length > 0) {
        for (const linkUpdate of manifest.linkUpdates) {
          try {
            if (!linkUpdate.stagedPath) {
              throw new Error(`Staged path not found for ${linkUpdate.path}`);
            }

            // Atomic rename of staged file to original location
            renameSync(linkUpdate.stagedPath, linkUpdate.path);
            linkUpdate.completed = true;

          } catch (error) {
            // Mark as failed but continue with other files
            linkUpdate.completed = false;
            console.error(`Failed to commit ${linkUpdate.path}: ${error}`);
          }
        }
      }

      // Step 3: Update WAL to commit phase
      if (state.walPath) {
        const walEntry = await this.walManager.readWAL(state.walPath);
        walEntry.phase = 'commit';
        walEntry.manifest = manifest; // Update with completion status
        await this.walManager.writeWAL(walEntry);
      }

    } catch (error) {
      throw new Error(
        `[${TransactionErrorCode.TRANSACTION_COMMIT_FAILED}] Failed to commit staged files: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Success phase: Cleanup temp files and delete WAL
   *
   * Steps:
   * 1. Delete all staged temp files
   * 2. Delete WAL entry
   * 3. No errors thrown (graceful cleanup)
   *
   * @param state - Current transaction state
   */
  async success(state: TransactionState): Promise<void> {
    try {
      const { manifest, walPath } = state;

      // Step 1: Delete staged note temp file (if still exists)
      if (manifest.noteRename.stagedPath && existsSync(manifest.noteRename.stagedPath)) {
        rmSync(manifest.noteRename.stagedPath, { force: true });
      }

      // Delete all staged link update temp files
      for (const linkUpdate of manifest.linkUpdates) {
        if (linkUpdate.stagedPath && existsSync(linkUpdate.stagedPath)) {
          rmSync(linkUpdate.stagedPath, { force: true });
        }
      }

      // Step 2: Delete WAL entry
      if (walPath) {
        await this.walManager.deleteWAL(walPath);
      }

    } catch (error) {
      // Graceful degradation: log error but don't throw
      console.error(`Success phase cleanup warning: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Abort phase: Rollback changes and generate recovery instructions
   *
   * Steps:
   * 1. Call rollback() to restore original state
   * 2. Generate manual recovery instructions if rollback fails
   * 3. Preserve WAL for manual intervention
   * 4. Return RollbackResult with recovery guidance
   *
   * @param state - Current transaction state
   * @param error - Error that triggered abort
   * @returns Rollback result with recovery instructions
   */
  async abort(state: TransactionState, error: Error): Promise<RollbackResult> {
    try {
      // Step 1: Attempt automatic rollback
      const rollbackResult = await this.rollback(state.manifest, state.walPath || '');

      // Step 2: Generate recovery instructions if needed
      if (!rollbackResult.success || rollbackResult.partialRecovery) {
        rollbackResult.recoveryInstructions = this.generateRecoveryInstructions(
          state,
          error,
          rollbackResult
        );
      }

      return rollbackResult;

    } catch (rollbackError) {
      // Rollback itself failed - preserve WAL and return failure
      return {
        success: false,
        rolledBack: [],
        failures: [{
          type: 'note_rename',
          path: state.manifest.noteRename.from,
          error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
        }],
        partialRecovery: false,
        manualRecoveryRequired: true,
        recoveryInstructions: this.generateRecoveryInstructions(state, error, null),
      };
    }
  }

  /**
   * Rollback transaction from manifest
   *
   * Steps:
   * 1. Restore note from staged file (if commit not completed)
   * 2. Restore link update files from staged files
   * 3. Delete all temp files
   * 4. Delete WAL on successful rollback
   * 5. Preserve WAL on failed rollback
   *
   * @param manifest - Transaction manifest
   * @param walPath - WAL file path
   * @returns Rollback result
   */
  async rollback(
    manifest: TransactionManifest,
    walPath: string
  ): Promise<RollbackResult> {
    const rolledBack: Array<{ type: 'note_rename' | 'link_update'; path: string; restored: boolean }> = [];
    const failures: Array<{ type: 'note_rename' | 'link_update'; path: string; error: string }> = [];

    try {
      // Step 1: Rollback note rename if needed
      if (manifest.noteRename.completed) {
        try {
          // Note was committed - restore original file
          if (manifest.noteRename.stagedPath && existsSync(manifest.noteRename.stagedPath)) {
            renameSync(manifest.noteRename.stagedPath, manifest.noteRename.from);
            rolledBack.push({ type: 'note_rename', path: manifest.noteRename.from, restored: true });
          }
        } catch (error) {
          failures.push({
            type: 'note_rename',
            path: manifest.noteRename.from,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        // Note not yet committed - just delete staged file
        if (manifest.noteRename.stagedPath && existsSync(manifest.noteRename.stagedPath)) {
          rmSync(manifest.noteRename.stagedPath, { force: true });
          rolledBack.push({ type: 'note_rename', path: manifest.noteRename.from, restored: false });
        }
      }

      // Step 2: Rollback link updates
      for (const linkUpdate of manifest.linkUpdates) {
        try {
          if (linkUpdate.completed) {
            // Link was committed - restore original content (not implemented yet)
            // For now, mark as failure
            failures.push({
              type: 'link_update',
              path: linkUpdate.path,
              error: 'Link rollback not yet implemented',
            });
          } else {
            // Link not yet committed - just delete staged file
            if (linkUpdate.stagedPath && existsSync(linkUpdate.stagedPath)) {
              rmSync(linkUpdate.stagedPath, { force: true });
              rolledBack.push({ type: 'link_update', path: linkUpdate.path, restored: false });
            }
          }
        } catch (error) {
          failures.push({
            type: 'link_update',
            path: linkUpdate.path,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Step 4: Delete WAL on successful rollback
      const success = failures.length === 0;
      const partialRecovery = rolledBack.length > 0 && failures.length > 0;

      if (success && walPath) {
        await this.walManager.deleteWAL(walPath);
      }

      return {
        success,
        rolledBack,
        failures,
        partialRecovery,
        manualRecoveryRequired: !success,
      };

    } catch (error) {
      // Catastrophic rollback failure
      return {
        success: false,
        rolledBack,
        failures: [{
          type: 'note_rename',
          path: manifest.noteRename.from,
          error: `Rollback failed: ${error instanceof Error ? error.message : String(error)}`,
        }],
        partialRecovery: rolledBack.length > 0,
        manualRecoveryRequired: true,
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Compute SHA-256 hash of content
   *
   * @param content - File content to hash
   * @returns SHA-256 hash as hex string
   */
  private computeSHA256(content: string): string {
    return createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  /**
   * Extract note name from file path (without .md extension)
   *
   * TODO: Extract to shared path-utils.ts utility (pattern used in 14+ locations)
   * @see Code review MCP-117 - minor duplication opportunity
   *
   * @param filePath - Full file path
   * @returns Note name without extension
   */
  private extractNoteName(filePath: string): string {
    const name = basename(filePath, '.md');
    return name;
  }

  /**
   * Generate manual recovery instructions
   *
   * @param state - Transaction state
   * @param error - Error that triggered abort
   * @param rollbackResult - Result of rollback attempt (null if rollback itself failed)
   * @returns Array of recovery instruction strings
   */
  private generateRecoveryInstructions(
    state: TransactionState,
    error: Error,
    rollbackResult: RollbackResult | null
  ): string[] {
    const instructions: string[] = [
      `Transaction ${state.correlationId} failed during ${state.phase} phase`,
      `Error: ${error.message}`,
      '',
      'Manual Recovery Required:',
    ];

    if (state.walPath) {
      instructions.push(`1. Inspect WAL file: ${state.walPath}`);
    }

    if (rollbackResult?.partialRecovery) {
      instructions.push('2. Partial rollback completed - some files restored, others failed');
      instructions.push('3. Check failed files:');
      rollbackResult.failures.forEach((failure, idx) => {
        instructions.push(`   ${idx + 1}. ${failure.path}: ${failure.error}`);
      });
    } else {
      instructions.push('2. Rollback failed completely - vault may be in inconsistent state');
    }

    instructions.push('');
    instructions.push('Recovery Steps:');
    instructions.push('1. Verify vault backups are available');
    instructions.push('2. Check for orphaned temp files (.mcp-staged-*)');
    instructions.push('3. Manually restore affected files if needed');
    instructions.push('4. Contact support if assistance required');

    return instructions;
  }
}
