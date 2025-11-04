/**
 * Transaction-specific error codes for MCP-108
 * Extends existing RenameErrorCode from MCP-105 with transaction failure codes
 *
 * @see dev/contracts/MCP-108-contracts.ts
 * @see dev/contracts/MCP-105-contracts.ts
 */

/**
 * Transaction error codes
 * Includes existing MCP-105 codes plus new transaction-specific codes
 */
export enum TransactionErrorCode {
  // Existing codes from MCP-105
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_EXISTS = 'FILE_EXISTS',
  INVALID_PATH = 'INVALID_PATH',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',

  // New transaction codes for MCP-108
  TRANSACTION_PLAN_FAILED = 'TRANSACTION_PLAN_FAILED',
  TRANSACTION_PREPARE_FAILED = 'TRANSACTION_PREPARE_FAILED',
  TRANSACTION_VALIDATE_FAILED = 'TRANSACTION_VALIDATE_FAILED',
  TRANSACTION_COMMIT_FAILED = 'TRANSACTION_COMMIT_FAILED',
  TRANSACTION_ROLLBACK_FAILED = 'TRANSACTION_ROLLBACK_FAILED',
  TRANSACTION_STALE_CONTENT = 'TRANSACTION_STALE_CONTENT',
}

/**
 * Type alias for backward compatibility with MCP-105 contracts
 */
export type TransactionErrorCodeType = keyof typeof TransactionErrorCode;
