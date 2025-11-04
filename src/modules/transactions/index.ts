/**
 * Transactions Module
 *
 * Provides atomic transaction management with Write-Ahead Logging (WAL)
 * for safe file operations with rollback support.
 */

export { TransactionManager } from './transaction-manager.js';

export { WALManager } from './wal-manager.js';
export type {
  TransactionPhase,
  TransactionManifest,
  WALEntry
} from './wal-manager.js';
