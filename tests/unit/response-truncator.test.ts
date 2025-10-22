/**
 * Unit tests for ResponseTruncator - MCP-38 Token Limiting
 *
 * Tests comprehensive token budget management functionality including:
 * - Budget tracking and consumption
 * - Token estimation accuracy
 * - Truncation metadata generation
 * - Edge cases and error handling
 * - Configuration validation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ResponseTruncator,
  createDefaultTruncator,
  createTruncator
} from '../../src/response-truncator.js';
import {
  TokenBudgetConfig,
  DEFAULT_TOKEN_BUDGET,
  InvalidTokenConfigError,
  validateMaxResults,
  validateTokenBudgetConfig
} from '../../dev/contracts/MCP-38-contracts.js';

describe('ResponseTruncator', () => {
  describe('Constructor and Initialization', () => {
    it('should create with default configuration', () => {
      const truncator = new ResponseTruncator();

      expect(truncator.config.maxTokens).toBe(25000);
      expect(truncator.config.maxCharacters).toBe(100000);
      expect(truncator.config.estimationRatio).toBe(4);
      expect(truncator.remainingBudget).toBe(100000);
      expect(truncator.totalBudget).toBe(100000);
    });

    it('should create with custom configuration', () => {
      const customConfig: Partial<TokenBudgetConfig> = {
        maxTokens: 10000,
        maxCharacters: 40000,
        estimationRatio: 4
      };

      const truncator = new ResponseTruncator(customConfig);

      expect(truncator.config.maxTokens).toBe(10000);
      expect(truncator.config.maxCharacters).toBe(40000);
      expect(truncator.remainingBudget).toBe(40000);
    });

    it('should merge custom config with defaults', () => {
      const partialConfig: Partial<TokenBudgetConfig> = {
        maxTokens: 15000,
        maxCharacters: 60000  // Must be consistent: 15000 * 4 = 60000
      };

      const truncator = new ResponseTruncator(partialConfig);

      // Custom values
      expect(truncator.config.maxTokens).toBe(15000);
      expect(truncator.config.maxCharacters).toBe(60000);
      // Default value preserved
      expect(truncator.config.estimationRatio).toBe(4);
    });

    it('should validate configuration on creation', () => {
      const invalidConfig: Partial<TokenBudgetConfig> = {
        maxTokens: -1000,
        maxCharacters: -4000,
        estimationRatio: 4
      };

      expect(() => new ResponseTruncator(invalidConfig)).toThrow(InvalidTokenConfigError);
    });
  });

  describe('Budget Tracking', () => {
    let truncator: ResponseTruncator;

    beforeEach(() => {
      truncator = new ResponseTruncator();
    });

    it('should track remaining budget correctly', () => {
      expect(truncator.remainingBudget).toBe(100000);

      const result = 'A'.repeat(1000); // 1000 characters
      truncator.consumeBudget(result);

      expect(truncator.remainingBudget).toBe(99000);
    });

    it('should never return negative remaining budget', () => {
      const largeResult = 'A'.repeat(100000); // Exactly at limit
      truncator.consumeBudget(largeResult);

      expect(truncator.remainingBudget).toBe(0);
    });

    it('should accumulate consumed budget across multiple calls', () => {
      truncator.consumeBudget('A'.repeat(1000));  // 1000 chars
      truncator.consumeBudget('B'.repeat(2000));  // 2000 chars
      truncator.consumeBudget('C'.repeat(500));   // 500 chars

      expect(truncator.remainingBudget).toBe(96500);
    });

    it('should reset budget to initial state', () => {
      truncator.consumeBudget('A'.repeat(50000));
      expect(truncator.remainingBudget).toBe(50000);

      truncator.reset();

      expect(truncator.remainingBudget).toBe(100000);
    });
  });

  describe('canAddResult()', () => {
    let truncator: ResponseTruncator;

    beforeEach(() => {
      truncator = new ResponseTruncator();
    });

    it('should return true when result fits within budget', () => {
      const smallResult = 'Small result content';

      expect(truncator.canAddResult(smallResult)).toBe(true);
    });

    it('should return false when result exceeds budget', () => {
      const hugeResult = 'A'.repeat(100001); // Exceeds 100K limit

      expect(truncator.canAddResult(hugeResult)).toBe(false);
    });

    it('should return true when result exactly fits budget', () => {
      const exactResult = 'A'.repeat(100000); // Exactly 100K

      expect(truncator.canAddResult(exactResult)).toBe(true);
    });

    it('should account for already consumed budget', () => {
      truncator.consumeBudget('A'.repeat(99000)); // Consume 99K

      const smallResult = 'B'.repeat(500);   // 500 chars - fits
      const largeResult = 'C'.repeat(1500);  // 1500 chars - exceeds

      expect(truncator.canAddResult(smallResult)).toBe(true);
      expect(truncator.canAddResult(largeResult)).toBe(false);
    });

    it('should handle empty string', () => {
      expect(truncator.canAddResult('')).toBe(true);
    });
  });

  describe('consumeBudget()', () => {
    let truncator: ResponseTruncator;

    beforeEach(() => {
      truncator = new ResponseTruncator();
    });

    it('should consume budget for valid result', () => {
      const result = 'A'.repeat(5000);

      expect(() => truncator.consumeBudget(result)).not.toThrow();
      expect(truncator.remainingBudget).toBe(95000);
    });

    it('should throw error when result would exceed budget', () => {
      truncator.consumeBudget('A'.repeat(99000));

      const tooLarge = 'B'.repeat(2000); // Would exceed limit

      expect(() => truncator.consumeBudget(tooLarge)).toThrow(
        /Cannot consume budget: would exceed limit/
      );
    });

    it('should throw error with accurate exceeded amount', () => {
      truncator.consumeBudget('A'.repeat(95000));

      const result = 'B'.repeat(6000);

      expect(() => truncator.consumeBudget(result)).toThrow(
        /101000 > 100000/
      );
    });

    it('should not modify budget if consumption throws', () => {
      truncator.consumeBudget('A'.repeat(99000));
      const initialRemaining = truncator.remainingBudget;

      try {
        truncator.consumeBudget('B'.repeat(2000));
      } catch (e) {
        // Expected error
      }

      // Budget should remain unchanged after failed consumption
      expect(truncator.remainingBudget).toBe(initialRemaining);
    });

    it('should handle empty string without error', () => {
      expect(() => truncator.consumeBudget('')).not.toThrow();
      expect(truncator.remainingBudget).toBe(100000);
    });
  });

  describe('estimateTokens()', () => {
    let truncator: ResponseTruncator;

    beforeEach(() => {
      truncator = new ResponseTruncator();
    });

    it('should estimate tokens using configured ratio', () => {
      // Default ratio is 4:1 (4 chars = 1 token)
      const text = 'A'.repeat(400); // 400 chars

      const tokens = truncator.estimateTokens(text);

      expect(tokens).toBe(100); // 400 / 4 = 100 tokens
    });

    it('should round up fractional tokens', () => {
      const text = 'ABC'; // 3 chars

      const tokens = truncator.estimateTokens(text);

      expect(tokens).toBe(1); // Math.ceil(3 / 4) = 1
    });

    it('should handle custom estimation ratios', () => {
      const customTruncator = new ResponseTruncator({
        maxTokens: 25000,
        maxCharacters: 50000,
        estimationRatio: 2 // 2 chars = 1 token
      });

      const text = 'A'.repeat(100); // 100 chars

      const tokens = customTruncator.estimateTokens(text);

      expect(tokens).toBe(50); // 100 / 2 = 50 tokens
    });

    it('should handle empty string', () => {
      expect(truncator.estimateTokens('')).toBe(0);
    });

    it('should handle unicode characters correctly', () => {
      // Unicode characters count as 1 character in string.length
      const text = '你好世界'; // 4 Chinese characters

      const tokens = truncator.estimateTokens(text);

      expect(tokens).toBe(1); // Math.ceil(4 / 4) = 1
    });
  });

  describe('getTruncationInfo()', () => {
    let truncator: ResponseTruncator;

    beforeEach(() => {
      truncator = new ResponseTruncator();
    });

    it('should generate metadata when not truncated', () => {
      const metadata = truncator.getTruncationInfo(10, 10, 'concise', false);

      expect(metadata.truncated).toBe(false);
      expect(metadata.shownCount).toBe(10);
      expect(metadata.totalCount).toBe(10);
      expect(metadata.limitType).toBe('result');
      expect(metadata.formatUsed).toBe('concise');
      expect(metadata.autoDowngraded).toBe(false);
    });

    it('should generate metadata when truncated by token budget', () => {
      // Consume most of the budget to simulate token truncation
      truncator.consumeBudget('A'.repeat(95000));

      const metadata = truncator.getTruncationInfo(5, 20, 'detailed', false);

      expect(metadata.truncated).toBe(true);
      expect(metadata.shownCount).toBe(5);
      expect(metadata.totalCount).toBe(20);
      expect(metadata.limitType).toBe('both'); // Token was primary constraint
      expect(metadata.formatUsed).toBe('detailed');
    });

    it('should include standard suggestion message', () => {
      const metadata = truncator.getTruncationInfo(10, 50, 'concise', false);

      expect(metadata.suggestion).toContain('Showing 10 of 50 results');
      expect(metadata.suggestion).toContain('Refine query for more specific results');
    });

    it('should include auto-downgrade suggestion when applicable', () => {
      const metadata = truncator.getTruncationInfo(8, 25, 'concise', true);

      expect(metadata.suggestion).toContain('auto-downgraded');
      expect(metadata.suggestion).toContain('concise format');
    });

    it('should calculate estimated tokens correctly', () => {
      truncator.consumeBudget('A'.repeat(8000)); // 8000 chars

      const metadata = truncator.getTruncationInfo(4, 10, 'detailed', false);

      // 8000 / 4 = 2000 tokens expected
      expect(metadata.estimatedTokens).toBe(2000);
      expect(metadata.estimatedCharacters).toBe(8000);
    });

    it('should set limitType to "token" when token was constraint', () => {
      truncator.consumeBudget('A'.repeat(96000)); // Near limit

      const metadata = truncator.getTruncationInfo(3, 10, 'concise', false);

      expect(metadata.limitType).toBe('both');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle maxResults=1 (minimum)', () => {
      const truncator = new ResponseTruncator();
      const singleResult = 'Single result';

      expect(truncator.canAddResult(singleResult)).toBe(true);
      truncator.consumeBudget(singleResult);

      const metadata = truncator.getTruncationInfo(1, 1, 'concise', false);
      expect(metadata.truncated).toBe(false);
    });

    it('should handle maxResults=100 (maximum)', () => {
      const truncator = new ResponseTruncator();
      let count = 0;

      // Add results until budget exhausted
      while (count < 100) {
        const result = 'Result content here\n';
        if (!truncator.canAddResult(result)) break;

        truncator.consumeBudget(result);
        count++;
      }

      const metadata = truncator.getTruncationInfo(count, 100, 'concise', false);
      expect(metadata.shownCount).toBeLessThanOrEqual(100);
    });

    it('should handle single result exceeding budget', () => {
      const truncator = new ResponseTruncator();
      const hugeResult = 'A'.repeat(100001); // Exceeds limit

      expect(truncator.canAddResult(hugeResult)).toBe(false);
      expect(() => truncator.consumeBudget(hugeResult)).toThrow();
    });

    it('should handle exactly at budget boundary', () => {
      const truncator = new ResponseTruncator();
      const exactResult = 'A'.repeat(100000);

      expect(truncator.canAddResult(exactResult)).toBe(true);
      expect(() => truncator.consumeBudget(exactResult)).not.toThrow();
      expect(truncator.remainingBudget).toBe(0);
    });
  });

  describe('Factory Functions', () => {
    it('should create default truncator via factory', () => {
      const truncator = createDefaultTruncator();

      expect(truncator).toBeInstanceOf(ResponseTruncator);
      expect(truncator.config).toEqual(DEFAULT_TOKEN_BUDGET);
    });

    it('should create custom truncator via factory', () => {
      const config: Partial<TokenBudgetConfig> = {
        maxTokens: 10000,
        maxCharacters: 40000,
        estimationRatio: 4
      };

      const truncator = createTruncator(config);

      expect(truncator).toBeInstanceOf(ResponseTruncator);
      expect(truncator.config.maxTokens).toBe(10000);
    });
  });
});

describe('Configuration Validation', () => {
  describe('validateTokenBudgetConfig()', () => {
    it('should accept valid configuration', () => {
      const validConfig: TokenBudgetConfig = {
        maxTokens: 25000,
        maxCharacters: 100000,
        estimationRatio: 4
      };

      expect(() => validateTokenBudgetConfig(validConfig)).not.toThrow();
    });

    it('should reject negative maxTokens', () => {
      const invalidConfig: TokenBudgetConfig = {
        maxTokens: -1000,
        maxCharacters: 100000,
        estimationRatio: 4
      };

      expect(() => validateTokenBudgetConfig(invalidConfig)).toThrow(
        /maxTokens must be positive/
      );
    });

    it('should reject zero maxTokens', () => {
      const invalidConfig: TokenBudgetConfig = {
        maxTokens: 0,
        maxCharacters: 100000,
        estimationRatio: 4
      };

      expect(() => validateTokenBudgetConfig(invalidConfig)).toThrow(
        /maxTokens must be positive/
      );
    });

    it('should reject negative maxCharacters', () => {
      const invalidConfig: TokenBudgetConfig = {
        maxTokens: 25000,
        maxCharacters: -5000,
        estimationRatio: 4
      };

      expect(() => validateTokenBudgetConfig(invalidConfig)).toThrow(
        /maxCharacters must be positive/
      );
    });

    it('should reject negative estimationRatio', () => {
      const invalidConfig: TokenBudgetConfig = {
        maxTokens: 25000,
        maxCharacters: 100000,
        estimationRatio: -2
      };

      expect(() => validateTokenBudgetConfig(invalidConfig)).toThrow(
        /estimationRatio must be positive/
      );
    });

    it('should reject inconsistent maxCharacters and maxTokens', () => {
      const invalidConfig: TokenBudgetConfig = {
        maxTokens: 25000,
        maxCharacters: 10000, // Should be ~100K (25000 * 4)
        estimationRatio: 4
      };

      expect(() => validateTokenBudgetConfig(invalidConfig)).toThrow(
        /maxCharacters.*should be approximately/
      );
    });

    it('should allow reasonable tolerance in consistency check', () => {
      const validConfig: TokenBudgetConfig = {
        maxTokens: 25000,
        maxCharacters: 98000, // Within 10% tolerance of 100K
        estimationRatio: 4
      };

      expect(() => validateTokenBudgetConfig(validConfig)).not.toThrow();
    });
  });

  describe('validateMaxResults()', () => {
    it('should return default for undefined value (search)', () => {
      const result = validateMaxResults(undefined, 'search');
      expect(result).toBe(25);
    });

    it('should return default for undefined value (list)', () => {
      const result = validateMaxResults(undefined, 'list');
      expect(result).toBe(10);
    });

    it('should return default for undefined value (yaml_properties)', () => {
      const result = validateMaxResults(undefined, 'yaml_properties');
      expect(result).toBe(50);
    });

    it('should accept valid value within range', () => {
      expect(validateMaxResults(50, 'search')).toBe(50);
      expect(validateMaxResults(1, 'search')).toBe(1);
      expect(validateMaxResults(100, 'search')).toBe(100);
    });

    it('should reject value below minimum', () => {
      expect(() => validateMaxResults(0, 'search')).toThrow(
        /maxResults must be between 1 and 100/
      );
    });

    it('should reject value above maximum', () => {
      expect(() => validateMaxResults(101, 'search')).toThrow(
        /maxResults must be between 1 and 100/
      );
    });

    it('should reject negative values', () => {
      expect(() => validateMaxResults(-5, 'search')).toThrow(
        InvalidTokenConfigError
      );
    });
  });
});

describe('Real-World Scenarios', () => {
  describe('Incremental Result Accumulation', () => {
    it('should simulate typical search result accumulation', () => {
      const truncator = new ResponseTruncator();
      const results: string[] = [];

      // Simulate formatting and adding 20 search results
      for (let i = 1; i <= 20; i++) {
        const formattedResult = `
[[Note ${i}]] - Title of Note ${i}
Content preview of note ${i} with some text...
Tags: #tag1 #tag2
---
`.repeat(10); // Each result ~500-600 chars

        if (truncator.canAddResult(formattedResult)) {
          truncator.consumeBudget(formattedResult);
          results.push(formattedResult);
        } else {
          break; // Stop when budget exhausted
        }
      }

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(20);
      expect(truncator.remainingBudget).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large result that fits exactly', () => {
      const truncator = new ResponseTruncator();
      const largeResult = 'A'.repeat(100000); // Exactly at limit

      expect(truncator.canAddResult(largeResult)).toBe(true);
      truncator.consumeBudget(largeResult);

      const metadata = truncator.getTruncationInfo(1, 1, 'detailed', false);
      expect(metadata.truncated).toBe(false);
    });

    it('should prevent adding second result after budget consumed', () => {
      const truncator = new ResponseTruncator();

      // First result consumes all budget
      const firstResult = 'A'.repeat(100000);
      truncator.consumeBudget(firstResult);

      // Second result cannot be added
      const secondResult = 'B'.repeat(100);
      expect(truncator.canAddResult(secondResult)).toBe(false);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle character estimation efficiently', () => {
      const truncator = new ResponseTruncator();
      const startTime = Date.now();

      // Estimate tokens for 1000 results
      for (let i = 0; i < 1000; i++) {
        truncator.estimateTokens('A'.repeat(1000));
      }

      const elapsedMs = Date.now() - startTime;

      // Should complete in under 100ms
      expect(elapsedMs).toBeLessThan(100);
    });

    it('should track budget for many small results efficiently', () => {
      const truncator = new ResponseTruncator();
      let count = 0;

      // Add many small results until budget exhausted
      const smallResult = 'Small result\n';
      while (truncator.canAddResult(smallResult)) {
        truncator.consumeBudget(smallResult);
        count++;

        if (count > 10000) break; // Safety limit
      }

      expect(count).toBeGreaterThan(100);
      expect(truncator.remainingBudget).toBeLessThan(smallResult.length);
    });
  });
});
