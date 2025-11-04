/**
 * File I/O Operations with iCloud Sync Retry Logic
 *
 * Extracted from vault-utils.ts (MCP-139)
 * Provides robust file operations with retry logic for iCloud sync conflicts
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
  rmSync,
} from "fs";
import { join, dirname, basename } from "path";
import { logger } from "../../logger.js";

/**
 * Options for atomic file writes
 *
 * Extends writeFileWithRetry with atomic semantics via temp-file-then-rename
 */
export interface AtomicWriteOptions {
  /**
   * Whether to use atomic temp-file-then-rename pattern
   * Default: false (preserves existing behavior)
   */
  atomic?: boolean;

  /**
   * Number of retry attempts for iCloud sync conflicts
   * Default: 3 (uses ICLOUD_RETRY_CONFIG.maxRetries)
   */
  retries?: number;

  /**
   * Whether this write is part of a transaction
   * Used for telemetry and error context
   */
  transactional?: boolean;
}

/**
 * iCloud sync retry configuration
 */
const ICLOUD_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 200,
  maxDelayMs: 2000,
  retryableErrors: ["EBUSY", "ENOENT", "EPERM", "EMFILE", "ENFILE"],
};

/**
 * Asynchronous sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable (likely due to iCloud sync conflicts)
 */
function isRetryableError(error: any): boolean {
  if (!error || typeof error.code !== "string") return false;
  return ICLOUD_RETRY_CONFIG.retryableErrors.includes(error.code);
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number): number {
  const delay = ICLOUD_RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, ICLOUD_RETRY_CONFIG.maxDelayMs);
}

/**
 * Synchronous sleep using busy-wait
 * Used for iCloud retry delays in synchronous operations
 */
function syncSleep(ms: number): void {
  const start = Date.now();
  while (Date.now() - start < ms) {
    // Busy wait - acceptable for short delays (<2s)
  }
}

/**
 * Retry a write operation with exponential backoff
 * Handles iCloud sync conflicts and retryable errors
 */
function retryWrite(
  writeFn: () => void,
  maxRetries: number,
  operation: string,
): void {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      writeFn();
      return; // Success
    } catch (error: any) {
      lastError = error;

      if (!isRetryableError(error)) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        syncSleep(delay);
      }
    }
  }

  // All retries failed
  throw new Error(
    `Failed to ${operation} after ${maxRetries} retries: ${lastError.message}`,
  );
}

/**
 * Read file with iCloud sync retry logic
 */
export function readFileWithRetry(
  filePath: string,
  encoding: BufferEncoding = "utf-8",
): string {
  let lastError: any;

  for (
    let attempt = 0;
    attempt <= ICLOUD_RETRY_CONFIG.maxRetries;
    attempt++
  ) {
    try {
      return readFileSync(filePath, encoding);
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't sleep on the last attempt
      if (attempt < ICLOUD_RETRY_CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        syncSleep(delay);
      }
    }
  }

  // If all retries failed, throw the last error
  throw new Error(
    `Failed to read file after ${ICLOUD_RETRY_CONFIG.maxRetries} retries: ${lastError.message}`,
  );
}

/**
 * Write file with iCloud sync retry logic
 */
export function writeFileWithRetry(
  filePath: string,
  content: string,
  encoding: BufferEncoding = "utf-8",
  options?: AtomicWriteOptions,
): void {
  const maxRetries = options?.retries ?? ICLOUD_RETRY_CONFIG.maxRetries;
  const useAtomic = options?.atomic ?? false;

  if (useAtomic) {
    // Atomic write using temp-file-then-rename pattern
    const tempPath = join(
      dirname(filePath),
      `.mcp-tmp-${Date.now()}-${basename(filePath)}`,
    );

    try {
      // Step 1: Write content to temp file with retry logic
      retryWrite(
        () => writeFileSync(tempPath, content, encoding),
        maxRetries,
        `write temp file (atomic mode): ${tempPath}`,
      );

      // Step 2: Atomically rename temp file to target (POSIX atomic on macOS)
      retryWrite(
        () => renameSync(tempPath, filePath),
        maxRetries,
        `atomic rename temp file: ${tempPath} -> ${filePath}`,
      );
    } catch (error) {
      // Cleanup temp file on any error
      try {
        if (existsSync(tempPath)) {
          rmSync(tempPath, { force: true });
        }
      } catch (cleanupError) {
        // Log cleanup failure but don't mask original error
        logger.error(
          `Failed to cleanup temp file ${tempPath}: ${cleanupError}`,
        );
      }
      throw error;
    }
  } else {
    // Non-atomic write (existing behavior for backward compatibility)
    retryWrite(
      () => writeFileSync(filePath, content, encoding),
      maxRetries,
      `write file (non-atomic mode): ${filePath}`,
    );
  }
}
