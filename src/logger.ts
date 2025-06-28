// Simple logger module for consistent logging across the application

export const logger = {
  info: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('[INFO]', ...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[WARN]', ...args);
    }
  },
  
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  
  debug: (...args: any[]) => {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.log('[DEBUG]', ...args);
    }
  }
};