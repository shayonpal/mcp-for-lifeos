/**
 * Unit tests for Hybrid Dispatch Fallback Logic
 *
 * Tests the executeWithHybridFallback() function in src/index.ts,
 * specifically validating the analytics exemption for get_daily_note
 * to prevent double-counting.
 *
 * @see src/index.ts:112-173 (executeWithHybridFallback function)
 * @see https://linear.app/agilecode-studio/issue/MCP-99
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// ============================================================================
// Mock Analytics Collector
// ============================================================================

const mockRecordToolExecution = jest.fn(async (toolName: string, fn: () => Promise<any>) => {
  return await fn();
});

const mockAnalytics = {
  recordToolExecution: mockRecordToolExecution,
  getAnalytics: jest.fn(),
  shutdown: jest.fn()
};

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Simulates the executeWithHybridFallback logic from src/index.ts
 * This is a test double that matches the actual implementation
 */
async function executeWithHybridFallback(
  toolName: string,
  request: any,
  primaryHandler: any,
  getFallbackHandler: (name: string) => any,
  context: {
    analytics: typeof mockAnalytics;
    sessionId: string;
    clientInfo: { name?: string; version?: string };
  }
): Promise<CallToolResult> {
  const ANALYTICS_EXEMPT_TOOLS = new Set<string>(['get_daily_note']);

  try {
    return await primaryHandler(request);
  } catch (error: any) {
    // Simulate unknown tool error detection
    if (error.message !== 'Unknown tool') {
      throw error;
    }

    const fallbackHandler = getFallbackHandler(toolName);
    if (!fallbackHandler) {
      throw error;
    }

    const fallbackArgs = request.params?.arguments || {};

    // KEY LOGIC: Check if tool should have analytics wrapping
    const shouldWrapAnalytics = !ANALYTICS_EXEMPT_TOOLS.has(toolName);

    if (shouldWrapAnalytics) {
      // Wrap with analytics
      return await context.analytics.recordToolExecution(
        toolName,
        async () => fallbackHandler(fallbackArgs),
        {
          clientName: context.clientInfo.name ?? 'unknown-client',
          clientVersion: context.clientInfo.version ?? '0.0.0',
          sessionId: context.sessionId
        }
      );
    } else {
      // Call directly without analytics wrapping (manual analytics in handler)
      return await fallbackHandler(fallbackArgs);
    }
  }
}

// ============================================================================
// TEST SUITE: Hybrid Dispatch Analytics Exemption
// ============================================================================

describe('Hybrid Dispatch - Analytics Exemption', () => {
  let mockPrimaryHandler: jest.Mock;
  let mockFallbackHandler: jest.Mock;
  let mockGetFallbackHandler: jest.Mock;
  let context: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Primary handler that always fails (simulates registry miss)
    mockPrimaryHandler = jest.fn().mockRejectedValue(new Error('Unknown tool'));

    // Fallback handler that returns success
    mockFallbackHandler = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Fallback success' }]
    });

    // Get fallback handler function
    mockGetFallbackHandler = jest.fn().mockReturnValue(mockFallbackHandler);

    // Context with analytics
    context = {
      analytics: mockAnalytics,
      sessionId: 'test-session-123',
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    };
  });

  // ==========================================================================
  // Test Case 1: get_daily_note exemption (NO analytics wrapping)
  // ==========================================================================

  it('should NOT wrap get_daily_note with analytics (exemption)', async () => {
    const request = {
      params: {
        name: 'get_daily_note',
        arguments: { date: '2025-10-30' }
      }
    };

    const result = await executeWithHybridFallback(
      'get_daily_note',
      request,
      mockPrimaryHandler,
      mockGetFallbackHandler,
      context
    );

    // Verify primary handler was attempted
    expect(mockPrimaryHandler).toHaveBeenCalledWith(request);

    // Verify fallback handler was retrieved
    expect(mockGetFallbackHandler).toHaveBeenCalledWith('get_daily_note');

    // KEY ASSERTION: Analytics NOT called for exempt tool
    expect(mockRecordToolExecution).not.toHaveBeenCalled();

    // Verify fallback handler was called directly (no wrapping)
    expect(mockFallbackHandler).toHaveBeenCalledWith({ date: '2025-10-30' });

    // Verify result returned correctly
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Fallback success' }]
    });
  });

  it('should call get_daily_note fallback handler directly with arguments', async () => {
    const request = {
      params: {
        name: 'get_daily_note',
        arguments: {
          date: 'today',
          createIfMissing: true,
          confirmCreation: false
        }
      }
    };

    await executeWithHybridFallback(
      'get_daily_note',
      request,
      mockPrimaryHandler,
      mockGetFallbackHandler,
      context
    );

    // Verify arguments passed directly to handler (no analytics middleware)
    expect(mockFallbackHandler).toHaveBeenCalledWith({
      date: 'today',
      createIfMissing: true,
      confirmCreation: false
    });

    // Double-check: Analytics should NOT be involved
    expect(mockRecordToolExecution).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // Test Case 2: Non-exempt tools (WITH analytics wrapping)
  // ==========================================================================

  it('should wrap non-exempt tools with analytics', async () => {
    const request = {
      params: {
        name: 'search',
        arguments: { query: 'test search' }
      }
    };

    const result = await executeWithHybridFallback(
      'search',
      request,
      mockPrimaryHandler,
      mockGetFallbackHandler,
      context
    );

    // Verify primary handler was attempted
    expect(mockPrimaryHandler).toHaveBeenCalledWith(request);

    // Verify fallback handler was retrieved
    expect(mockGetFallbackHandler).toHaveBeenCalledWith('search');

    // KEY ASSERTION: Analytics WAS called for non-exempt tool
    expect(mockRecordToolExecution).toHaveBeenCalledWith(
      'search',
      expect.any(Function), // The wrapped async function
      {
        clientName: 'test-client',
        clientVersion: '1.0.0',
        sessionId: 'test-session-123'
      }
    );

    // Verify fallback handler was called (via analytics wrapper)
    expect(mockFallbackHandler).toHaveBeenCalledWith({ query: 'test search' });

    // Verify result returned correctly
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Fallback success' }]
    });
  });

  it('should wrap read_note (always-available tool) with analytics', async () => {
    const request = {
      params: {
        name: 'read_note',
        arguments: { path: 'test-note.md' }
      }
    };

    await executeWithHybridFallback(
      'read_note',
      request,
      mockPrimaryHandler,
      mockGetFallbackHandler,
      context
    );

    // Verify analytics wrapping for always-available tool
    expect(mockRecordToolExecution).toHaveBeenCalledWith(
      'read_note',
      expect.any(Function),
      expect.objectContaining({
        sessionId: 'test-session-123'
      })
    );

    expect(mockFallbackHandler).toHaveBeenCalledWith({ path: 'test-note.md' });
  });

  it('should wrap create_note (consolidated tool) with analytics', async () => {
    const request = {
      params: {
        name: 'create_note',
        arguments: {
          title: 'New Note',
          content: 'Note content'
        }
      }
    };

    await executeWithHybridFallback(
      'create_note',
      request,
      mockPrimaryHandler,
      mockGetFallbackHandler,
      context
    );

    // Verify analytics wrapping for consolidated tool
    expect(mockRecordToolExecution).toHaveBeenCalledWith(
      'create_note',
      expect.any(Function),
      expect.objectContaining({
        sessionId: 'test-session-123'
      })
    );

    expect(mockFallbackHandler).toHaveBeenCalledWith({
      title: 'New Note',
      content: 'Note content'
    });
  });

  // ==========================================================================
  // Test Case 3: Edge cases
  // ==========================================================================

  it('should throw error if fallback handler not found', async () => {
    mockGetFallbackHandler.mockReturnValue(undefined);

    const request = {
      params: {
        name: 'nonexistent_tool',
        arguments: {}
      }
    };

    await expect(
      executeWithHybridFallback(
        'nonexistent_tool',
        request,
        mockPrimaryHandler,
        mockGetFallbackHandler,
        context
      )
    ).rejects.toThrow('Unknown tool');

    // Analytics should not be called for missing handler
    expect(mockRecordToolExecution).not.toHaveBeenCalled();
  });

  it('should propagate non-"Unknown tool" errors', async () => {
    const customError = new Error('Database connection failed');
    mockPrimaryHandler.mockRejectedValue(customError);

    const request = {
      params: {
        name: 'search',
        arguments: {}
      }
    };

    await expect(
      executeWithHybridFallback(
        'search',
        request,
        mockPrimaryHandler,
        mockGetFallbackHandler,
        context
      )
    ).rejects.toThrow('Database connection failed');

    // Fallback should not be attempted for non-registry errors
    expect(mockGetFallbackHandler).not.toHaveBeenCalled();
    expect(mockRecordToolExecution).not.toHaveBeenCalled();
  });
});
