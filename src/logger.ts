// Simple logger module for consistent logging across the application
// IMPORTANT: MCP servers must use stderr for all logging to avoid breaking JSON-RPC protocol on stdout

export const logger = {
  info: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[INFO]', ...args);  // Use stderr for MCP compatibility
    }
  },

  warn: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[WARN]', ...args);  // Use stderr for MCP compatibility
    }
  },

  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },

  debug: (...args: any[]) => {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.error('[DEBUG]', ...args);  // Use stderr for MCP compatibility
    }
  }
};