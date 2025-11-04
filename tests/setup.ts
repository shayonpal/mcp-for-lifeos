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
jest.mock('../src/modules/analytics/analytics-collector.js', () => ({
  AnalyticsCollector: {
    getInstance: jest.fn().mockReturnValue({
      trackToolCall: jest.fn(),
      trackError: jest.fn(),
      recordToolExecution: jest.fn(async (_toolName, fn) => await fn()), // Execute the wrapped function
      shutdown: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock usage-metrics to avoid import.meta.url issues
jest.mock('../src/modules/analytics/usage-metrics.js', () => ({
  DEFAULT_ANALYTICS_CONFIG: {
    enabled: false,
    outputPath: '/tmp/test-analytics.jsonl',
    flushInterval: 60000,
  },
}));

// Silence console.log during tests unless explicitly enabled
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  // MCP-148: Production vault detection guard
  // Note: We can't check LIFEOS_CONFIG here because it's set to production by default,
  // and individual tests override it in their beforeEach hooks using createTestVault().
  // The test-level assertions (expect(testVault.vaultPath).not.toContain('iCloud'))
  // provide the actual safety guarantee.
  //
  // This environment variable check catches the case where someone tries to run tests
  // with an explicitly set production vault path via env var.
  if (process.env.LIFEOS_VAULT_PATH &&
      (process.env.LIFEOS_VAULT_PATH.includes('iCloud') ||
       process.env.LIFEOS_VAULT_PATH.includes('Library/Mobile Documents'))) {
    throw new Error(
      `[MCP-148] PRODUCTION VAULT PATH IN ENVIRONMENT VARIABLE!\n` +
      `LIFEOS_VAULT_PATH: ${process.env.LIFEOS_VAULT_PATH}\n` +
      `Tests must not use production vault paths.\n\n` +
      `Fix: Unset LIFEOS_VAULT_PATH or set it to a test directory.`
    );
  }

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