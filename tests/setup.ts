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