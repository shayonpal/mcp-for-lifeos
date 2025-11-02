import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  rmSync,
  statSync,
} from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Transaction phase enumeration
 */
export type TransactionPhase =
  | 'plan'
  | 'prepare'
  | 'validate'
  | 'commit'
  | 'success'
  | 'abort';

/**
 * Transaction manifest for tracking all operations
 */
export interface TransactionManifest {
  noteRename: {
    from: string;
    to: string;
    sha256Before: string;
    stagedPath?: string;
    completed?: boolean;
  };
  linkUpdates: Array<{
    path: string;
    sha256Before: string;
    renderedContent?: string;
    stagedPath?: string;
    referenceCount: number;
    completed?: boolean;
  }>;
  totalOperations: number;
}

/**
 * Write-Ahead Log entry structure
 * Schema version 1.0
 */
export interface WALEntry {
  version: '1.0';
  correlationId: string;
  timestamp: string; // ISO 8601
  vaultPath: string; // Absolute path
  phase: TransactionPhase;
  operation: 'rename_note';
  manifest: TransactionManifest;
  pid: number;
}

/**
 * Write-Ahead Log Manager
 *
 * Manages transaction log persistence for atomic rename operations.
 * Stores WAL entries in ~/.config/mcp-lifeos/wal/ (external to vault).
 *
 * Key Features:
 * - External storage location (avoids iCloud sync conflicts)
 * - Human-readable JSON format for debugging
 * - Schema versioning for future evolution
 * - Automatic README.md generation
 * - Age-based filtering for pending WAL detection
 */
export class WALManager {
  private readonly walDir: string;

  constructor(customWalDir?: string) {
    // XDG-compliant location: ~/.config/mcp-lifeos/wal/
    // Accepts custom directory for testing
    this.walDir = customWalDir ?? join(homedir(), '.config', 'mcp-lifeos', 'wal');
  }

  /**
   * Write WAL entry to disk
   *
   * Note: Declared async for future-proofing (e.g., remote WAL storage)
   * but currently uses synchronous fs operations for simplicity and
   * reliable error handling. WAL operations are fast (single file I/O)
   * and blocking is negligible.
   *
   * @param entry - WAL entry to persist
   * @returns WAL file path for tracking
   * @throws Error if correlationId is not a valid UUID v4
   */
  async writeWAL(entry: WALEntry): Promise<string> {
    // Validate correlationId format (UUID v4)
    this.validateCorrelationId(entry.correlationId);
    // Ensure WAL directory exists (idempotent)
    await this.ensureWALDirectory();

    // Filename format: {timestamp}-rename-{correlationId}.wal.json
    // Replace colons and dots to make timestamp filesystem-safe
    const safeTimestamp = entry.timestamp.replace(/[:.]/g, '-');
    const filename = `${safeTimestamp}-rename-${entry.correlationId}.wal.json`;
    const walPath = join(this.walDir, filename);

    // Write JSON with pretty formatting (human-readable for debugging)
    const jsonContent = JSON.stringify(entry, null, 2);
    writeFileSync(walPath, jsonContent, 'utf-8');

    return walPath;
  }

  /**
   * Read and parse WAL entry
   * Validates schema version
   *
   * Note: Declared async for consistency with writeWAL and future-proofing.
   * Currently uses synchronous fs operations.
   *
   * @param walPath - Path to WAL file
   * @returns Parsed WAL entry
   * @throws Error if file not found or schema version unsupported
   */
  async readWAL(walPath: string): Promise<WALEntry> {
    if (!existsSync(walPath)) {
      throw new Error(`WAL file not found: ${walPath}`);
    }

    const content = readFileSync(walPath, 'utf-8');
    const entry = JSON.parse(content) as WALEntry;

    // Schema version validation
    if (entry.version !== '1.0') {
      throw new Error(`Unsupported WAL schema version: ${entry.version}`);
    }

    return entry;
  }

  /**
   * Delete WAL file (after successful recovery)
   *
   * Note: Declared async for consistency with other WAL operations.
   * Currently uses synchronous fs operations.
   *
   * @param walPath - Path to WAL file
   */
  async deleteWAL(walPath: string): Promise<void> {
    if (existsSync(walPath)) {
      rmSync(walPath, { force: true });
    }
  }

  /**
   * Resolve WAL file path from entry
   *
   * Constructs the filesystem path for a WAL entry using the same
   * naming convention as writeWAL(). This centralizes the path logic
   * and prevents desync between writing and reading operations.
   *
   * @param entry - WAL entry to resolve path for
   * @returns Full filesystem path to WAL file
   */
  resolvePath(entry: WALEntry): string {
    // Use same timestamp sanitization as writeWAL
    const safeTimestamp = entry.timestamp.replace(/[:.]/g, '-');
    const filename = `${safeTimestamp}-rename-${entry.correlationId}.wal.json`;
    return join(this.walDir, filename);
  }

  /**
   * Scan for pending (orphaned) WAL entries
   * Returns only WALs older than 1 minute (active transactions excluded)
   *
   * Note: Declared async for consistency with other WAL operations.
   * Currently uses synchronous fs operations.
   *
   * @returns Array of pending WAL entries
   */
  async scanPendingWALs(): Promise<WALEntry[]> {
    // Return empty array if WAL directory doesn't exist
    if (!existsSync(this.walDir)) {
      return [];
    }

    const files = readdirSync(this.walDir);
    const walFiles = files.filter((f) => f.endsWith('.wal.json'));

    const pendingWALs: WALEntry[] = [];
    const ONE_MINUTE_MS = 60000;
    const now = Date.now();

    for (const file of walFiles) {
      const walPath = join(this.walDir, file);

      try {
        // Get file modification time
        const stats = statSync(walPath);
        const ageMs = now - stats.mtimeMs;

        // Skip recent WALs (<1 minute) - may be active transactions
        if (ageMs < ONE_MINUTE_MS) {
          continue;
        }

        // Read and parse WAL entry
        const entry = await this.readWAL(walPath);
        pendingWALs.push(entry);
      } catch (error) {
        // Graceful degradation: log error but continue scanning
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Failed to read WAL file ${file}: ${errorMessage}`);
        continue;
      }
    }

    return pendingWALs;
  }

  /**
   * Ensure WAL directory exists with proper permissions
   * Auto-generates README.md on first creation
   */
  private async ensureWALDirectory(): Promise<void> {
    if (!existsSync(this.walDir)) {
      // Create directory hierarchy
      mkdirSync(this.walDir, { recursive: true, mode: 0o755 });

      // Generate README.md
      const readmePath = join(this.walDir, 'README.md');
      const readmeContent = this.generateREADME();
      writeFileSync(readmePath, readmeContent, 'utf-8');
    }
  }

  /**
   * Generate README content for WAL directory
   */
  private generateREADME(): string {
    return `# MCP for LifeOS - Write-Ahead Log (WAL)

This directory contains transaction logs for atomic rename operations.

## Purpose

WAL entries ensure vault consistency during rename operations with link updates.
If a transaction is interrupted (crash, power loss), the WAL enables automatic recovery.

## File Format

- Filename: \`{timestamp}-rename-{correlationId}.wal.json\`
- Content: JSON transaction manifest
- Schema: version 1.0

## Recovery

WAL entries older than 1 minute are automatically recovered on server startup.
Do not manually delete WAL files unless you're certain recovery is not needed.

## Manual Recovery

If automatic recovery fails, WAL files contain all information needed to:

1. Rollback partial changes
2. Restore original file state
3. Clean up temporary files

Contact support if manual intervention is needed.

## File Structure

\`\`\`json
{
  "version": "1.0",
  "correlationId": "uuid-v4",
  "timestamp": "ISO-8601-timestamp",
  "vaultPath": "/absolute/path/to/vault",
  "phase": "prepare|validate|commit",
  "operation": "rename_note",
  "manifest": { ... },
  "pid": 12345
}
\`\`\`
`;
  }

  /**
   * Validate correlationId format (UUID v4)
   *
   * @param correlationId - Correlation ID to validate
   * @throws Error if correlationId is not a valid UUID v4
   */
  private validateCorrelationId(correlationId: string): void {
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where x is any hexadecimal digit and y is one of 8, 9, a, or b
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidV4Regex.test(correlationId)) {
      throw new Error(
        `Invalid correlationId format (expected UUID v4): ${correlationId}`
      );
    }
  }
}
