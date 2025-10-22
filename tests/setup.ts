/**
 * Jest test setup
 * Global test configuration and utilities
 */

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidMCPResponse(): R;
    }
  }
}

// Custom Jest matcher for MCP responses
expect.extend({
  toBeValidMCPResponse(received: any) {
    const isValid = 
      received &&
      typeof received === 'object' &&
      received.jsonrpc === '2.0' &&
      typeof received.id === 'number' &&
      (received.result !== undefined || received.error !== undefined);

    if (isValid) {
      return {
        message: () => `Expected ${received} not to be a valid MCP response`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid MCP response`,
        pass: false,
      };
    }
  },
});

// Environment setup
process.env.NODE_ENV = 'test';
process.env.CONSOLIDATED_TOOLS_ENABLED = 'true';
process.env.DISABLE_USAGE_ANALYTICS = 'true'; // MCP-61: Disable analytics for tests

// MCP-61: Mock analytics module to avoid import.meta.url ESM parsing issues in Jest
// This must come after environment setup but before any imports that use analytics
jest.mock('../src/analytics/analytics-collector.js', () => ({
  AnalyticsCollector: {
    getInstance: jest.fn().mockReturnValue({
      trackToolCall: jest.fn(),
      trackError: jest.fn(),
      recordToolExecution: jest.fn(async (_toolName, fn) => await fn()), // Execute the wrapped function
      shutdown: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Silence console.log during tests unless explicitly enabled
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  if (!process.env.VERBOSE_TESTS) {
    console.log = () => {};
    console.error = () => {};
  }
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

export {};