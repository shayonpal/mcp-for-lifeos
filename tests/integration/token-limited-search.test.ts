/**
 * Integration tests for token-limited search functionality - MCP-38
 *
 * Tests end-to-end token limiting behavior including:
 * - Search tool handler integration with ResponseTruncator
 * - ObsidianLinks formatting with token budget
 * - Truncation metadata generation
 * - maxResults parameter validation
 * - Edge cases with real search results
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ResponseTruncator } from '../../src/response-truncator.js';
import { ObsidianLinks } from '../../src/obsidian-links.js';
import type { SearchResult } from '../../src/types.js';
import {
  TokenBudgetConfig,
  TruncationMetadata,
  validateMaxResults
} from '../../dev/contracts/MCP-38-contracts.js';

describe('Token-Limited Search Integration', () => {
  describe('ObsidianLinks with Token Budget', () => {
    let truncator: ResponseTruncator;

    beforeEach(() => {
      truncator = new ResponseTruncator();
    });

    afterEach(() => {
      truncator.reset();
    });

    it('should format search result and consume budget', () => {
      const mockResult: SearchResult = {
        path: '/vault/test-note.md',
        score: 0.95,
        matches: ['test content'],
        frontmatter: {
          title: 'Test Note',
          created: new Date('2025-01-01'),
          modified: new Date('2025-01-02')
        },
        excerpt: 'This is a test note with some content'
      };

      const formatted = ObsidianLinks.formatSearchResult(mockResult, 'concise', truncator, 0);

      // Should produce formatted output
      expect(formatted).toContain('[[test-note]]');
      expect(formatted).toContain('Test Note');

      // Should consume budget
      expect(truncator.remainingBudget).toBeLessThan(truncator.totalBudget);
      expect(truncator.remainingBudget).toBeGreaterThan(0);
    });

    it('should format in detailed mode with token budget', () => {
      const mockResult: SearchResult = {
        path: '/vault/detailed-note.md',
        score: 0.88,
        matches: ['detailed content', 'more details'],
        frontmatter: {
          title: 'Detailed Note',
          tags: ['tag1', 'tag2'],
          category: 'Projects',
          created: new Date('2025-01-01'),
          modified: new Date('2025-01-02')
        },
        excerpt: 'This note has detailed content with multiple matches and metadata'
      };

      const formatted = ObsidianLinks.formatSearchResult(mockResult, 'detailed', truncator, 0);

      // Detailed format should include more information
      expect(formatted).toContain('[[detailed-note]]');
      expect(formatted).toContain('Detailed Note');
      expect(formatted.length).toBeGreaterThan(100); // Detailed format is longer

      // Should consume more budget than concise
      const consumed = truncator.totalBudget - truncator.remainingBudget;
      expect(consumed).toBeGreaterThan(50);
    });

    it('should handle multiple results with budget tracking', () => {
      const results: SearchResult[] = Array.from({ length: 10 }, (_, i) => ({
        path: `/vault/note-${i}.md`,
        score: 0.9 - (i * 0.05),
        matches: [`content ${i}`],
        frontmatter: {
          title: `Note ${i}`,
          created: new Date('2025-01-01'),
          modified: new Date('2025-01-02')
        },
        excerpt: `This is note number ${i} with some content`
      }));

      const formatted: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const formattedResult = ObsidianLinks.formatSearchResult(result, 'concise', truncator, i);

        if (truncator.canAddResult(formattedResult)) {
          truncator.consumeBudget(formattedResult);
          formatted.push(formattedResult);
        } else {
          break;
        }
      }

      expect(formatted.length).toBe(10); // All should fit
      expect(truncator.remainingBudget).toBeGreaterThan(0);
    });

    it('should stop adding results when budget exhausted', () => {
      // Create truncator with small budget
      const smallTruncator = new ResponseTruncator({
        maxTokens: 100,
        maxCharacters: 400,
        estimationRatio: 4
      });

      const results: SearchResult[] = Array.from({ length: 100 }, (_, i) => ({
        path: `/vault/note-${i}.md`,
        score: 0.9,
        matches: ['content'],
        frontmatter: {
          title: `Note ${i}`,
          created: new Date('2025-01-01'),
          modified: new Date('2025-01-02')
        },
        excerpt: 'Some content here'
      }));

      const formatted: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const formattedResult = ObsidianLinks.formatSearchResult(result, 'concise', smallTruncator, i);

        if (smallTruncator.canAddResult(formattedResult)) {
          smallTruncator.consumeBudget(formattedResult);
          formatted.push(formattedResult);
        } else {
          break;
        }
      }

      // Should stop well before 100 results
      expect(formatted.length).toBeLessThan(10);
      expect(smallTruncator.remainingBudget).toBeLessThan(200);
    });
  });

  describe('maxResults Parameter Validation', () => {
    it('should enforce minimum maxResults=1', () => {
      expect(() => validateMaxResults(0, 'search')).toThrow(/must be between 1 and 100/);
    });

    it('should enforce maximum maxResults=100', () => {
      expect(() => validateMaxResults(101, 'search')).toThrow(/must be between 1 and 100/);
    });

    it('should accept valid range 1-100', () => {
      expect(validateMaxResults(1, 'search')).toBe(1);
      expect(validateMaxResults(25, 'search')).toBe(25);
      expect(validateMaxResults(100, 'search')).toBe(100);
    });

    it('should return default when undefined', () => {
      expect(validateMaxResults(undefined, 'search')).toBe(25);
      expect(validateMaxResults(undefined, 'list')).toBe(10);
      expect(validateMaxResults(undefined, 'yaml_properties')).toBe(50);
    });
  });

  describe('Truncation Metadata Generation', () => {
    it('should generate metadata when results truncated', () => {
      const truncator = new ResponseTruncator();

      // Simulate consuming budget
      truncator.consumeBudget('A'.repeat(95000));

      const metadata: TruncationMetadata = truncator.getTruncationInfo(
        5,    // shown
        20,   // total
        'detailed',
        false
      );

      expect(metadata.truncated).toBe(true);
      expect(metadata.shownCount).toBe(5);
      expect(metadata.totalCount).toBe(20);
      expect(metadata.limitType).toBe('both');
      expect(metadata.formatUsed).toBe('detailed');
      expect(metadata.suggestion).toContain('Showing 5 of 20 results');
    });

    it('should indicate no truncation when all results shown', () => {
      const truncator = new ResponseTruncator();

      const metadata: TruncationMetadata = truncator.getTruncationInfo(
        10,
        10,
        'concise',
        false
      );

      expect(metadata.truncated).toBe(false);
      expect(metadata.shownCount).toBe(10);
      expect(metadata.totalCount).toBe(10);
    });

    it('should indicate auto-downgrade in suggestion', () => {
      const truncator = new ResponseTruncator();

      const metadata: TruncationMetadata = truncator.getTruncationInfo(
        15,
        30,
        'concise',
        true  // auto-downgraded
      );

      expect(metadata.autoDowngraded).toBe(true);
      expect(metadata.suggestion).toContain('auto-downgraded');
      expect(metadata.suggestion).toContain('concise format');
    });
  });

  describe('End-to-End Scenarios', () => {
    it('should handle search with maxResults constraint', () => {
      const maxResults = 5;
      const totalResults = 20;

      const results: SearchResult[] = Array.from({ length: totalResults }, (_, i) => ({
        path: `/vault/note-${i}.md`,
        score: 0.9 - (i * 0.02),
        matches: [`match ${i}`],
        frontmatter: {
          title: `Note ${i}`,
          created: new Date('2025-01-01'),
          modified: new Date('2025-01-02')
        },
        excerpt: `Content for note ${i}`
      }));

      // Apply maxResults constraint
      const limitedResults = results.slice(0, maxResults);

      expect(limitedResults.length).toBe(5);
      expect(results.length).toBe(20);
    });

    it('should handle search with token budget constraint', () => {
      const truncator = new ResponseTruncator({
        maxTokens: 500,
        maxCharacters: 2000,
        estimationRatio: 4
      });

      const results: SearchResult[] = Array.from({ length: 50 }, (_, i) => ({
        path: `/vault/note-${i}.md`,
        score: 0.9,
        matches: ['content'],
        frontmatter: {
          title: `Note ${i}`,
          created: new Date('2025-01-01'),
          modified: new Date('2025-01-02')
        },
        excerpt: 'Some content'
      }));

      const formatted: string[] = [];
      for (const [index, result] of results.entries()) {
        const formattedResult = ObsidianLinks.formatSearchResult(result, 'concise', truncator, index);

        if (truncator.canAddResult(formattedResult)) {
          truncator.consumeBudget(formattedResult);
          formatted.push(formattedResult);
        } else {
          break;
        }
      }

      // Token budget should limit results before maxResults
      expect(formatted.length).toBeLessThan(50);
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('should handle combined maxResults and token budget constraints', () => {
      const maxResults = 25;
      const truncator = new ResponseTruncator(); // Default 25K tokens

      const results: SearchResult[] = Array.from({ length: 100 }, (_, i) => ({
        path: `/vault/note-${i}.md`,
        score: 0.9,
        matches: ['content'],
        frontmatter: {
          title: `Note ${i}`,
          created: new Date('2025-01-01'),
          modified: new Date('2025-01-02')
        },
        excerpt: 'Content here'
      }));

      // Apply maxResults first
      const limitedByMaxResults = results.slice(0, maxResults);

      // Then apply token budget
      const formatted: string[] = [];
      for (const [index, result] of limitedByMaxResults.entries()) {
        const formattedResult = ObsidianLinks.formatSearchResult(result, 'concise', truncator, index);

        if (truncator.canAddResult(formattedResult)) {
          truncator.consumeBudget(formattedResult);
          formatted.push(formattedResult);
        } else {
          break;
        }
      }

      // Should be limited by maxResults (25) since token budget is large
      expect(formatted.length).toBeLessThanOrEqual(maxResults);
    });

    it('should provide accurate truncation metadata after processing', () => {
      const truncator = new ResponseTruncator({
        maxTokens: 200,
        maxCharacters: 800,
        estimationRatio: 4
      });

      const totalResults = 30;
      const results: SearchResult[] = Array.from({ length: totalResults }, (_, i) => ({
        path: `/vault/note-${i}.md`,
        score: 0.9,
        matches: ['content'],
        frontmatter: {
          title: `Note ${i}`,
          created: new Date('2025-01-01'),
          modified: new Date('2025-01-02')
        },
        excerpt: 'Content'
      }));

      let shownCount = 0;
      for (const [index, result] of results.entries()) {
        const formatted = ObsidianLinks.formatSearchResult(result, 'concise', truncator, index);

        if (truncator.canAddResult(formatted)) {
          truncator.consumeBudget(formatted);
          shownCount++;
        } else {
          break;
        }
      }

      const metadata = truncator.getTruncationInfo(
        shownCount,
        totalResults,
        'concise',
        false
      );

      expect(metadata.truncated).toBe(true);
      expect(metadata.shownCount).toBe(shownCount);
      expect(metadata.totalCount).toBe(totalResults);
      expect(metadata.shownCount).toBeLessThan(totalResults);
      expect(metadata.estimatedCharacters).toBeLessThanOrEqual(800);
    });
  });

  describe('Format Switching Impact', () => {
    it('should show that detailed format consumes more budget than concise', () => {
      const mockResult: SearchResult = {
        path: '/vault/test.md',
        score: 0.9,
        matches: ['content'],
        frontmatter: {
          title: 'Test',
          tags: ['tag1', 'tag2'],
          category: 'Projects',
          created: new Date('2025-01-01'),
          modified: new Date('2025-01-02')
        },
        excerpt: 'Test content'
      };

      // Test concise format
      const truncatorConcise = new ResponseTruncator();
      const concise = ObsidianLinks.formatSearchResult(mockResult, 'concise', truncatorConcise, 0);
      truncatorConcise.consumeBudget(concise);
      const conciseConsumed = truncatorConcise.totalBudget - truncatorConcise.remainingBudget;

      // Test detailed format
      const truncatorDetailed = new ResponseTruncator();
      const detailed = ObsidianLinks.formatSearchResult(mockResult, 'detailed', truncatorDetailed, 0);
      truncatorDetailed.consumeBudget(detailed);
      const detailedConsumed = truncatorDetailed.totalBudget - truncatorDetailed.remainingBudget;

      // Detailed should consume more
      expect(detailedConsumed).toBeGreaterThan(conciseConsumed);
    });

    it('should fit more results in concise mode than detailed mode', () => {
      const results: SearchResult[] = Array.from({ length: 20 }, (_, i) => ({
        path: `/vault/note-${i}.md`,
        score: 0.9,
        matches: ['content'],
        frontmatter: {
          title: `Note ${i}`,
          tags: ['tag1', 'tag2'],
          created: new Date('2025-01-01'),
          modified: new Date('2025-01-02')
        },
        excerpt: 'Content here'
      }));

      // Small budget to force truncation
      const conciseTruncator = new ResponseTruncator({
        maxTokens: 500,
        maxCharacters: 2000,
        estimationRatio: 4
      });

      const detailedTruncator = new ResponseTruncator({
        maxTokens: 500,
        maxCharacters: 2000,
        estimationRatio: 4
      });

      // Count concise results
      let conciseCount = 0;
      for (const [index, result] of results.entries()) {
        const formatted = ObsidianLinks.formatSearchResult(result, 'concise', conciseTruncator, index);
        if (conciseTruncator.canAddResult(formatted)) {
          conciseTruncator.consumeBudget(formatted);
          conciseCount++;
        } else {
          break;
        }
      }

      // Count detailed results
      let detailedCount = 0;
      for (const [index, result] of results.entries()) {
        const formatted = ObsidianLinks.formatSearchResult(result, 'detailed', detailedTruncator, index);
        if (detailedTruncator.canAddResult(formatted)) {
          detailedTruncator.consumeBudget(formatted);
          detailedCount++;
        } else {
          break;
        }
      }

      // Should fit more in concise mode
      expect(conciseCount).toBeGreaterThan(detailedCount);
    });
  });

  describe('Error Handling', () => {
    it('should not throw when adding results within budget', () => {
      const truncator = new ResponseTruncator();
      const mockResult: SearchResult = {
        path: '/vault/test.md',
        score: 0.9,
        matches: ['content'],
        frontmatter: {
          title: 'Test',
          created: new Date('2025-01-01'),
          modified: new Date('2025-01-02')
        },
        excerpt: 'Content'
      };

      expect(() => {
        const formatted = ObsidianLinks.formatSearchResult(mockResult, 'concise', truncator, 0);
        if (truncator.canAddResult(formatted)) {
          truncator.consumeBudget(formatted);
        }
      }).not.toThrow();
    });

    it('should gracefully handle empty search results', () => {
      const truncator = new ResponseTruncator();
      const results: SearchResult[] = [];

      expect(results.length).toBe(0);

      const metadata = truncator.getTruncationInfo(0, 0, 'concise', false);
      expect(metadata.truncated).toBe(false);
      expect(metadata.shownCount).toBe(0);
      expect(metadata.totalCount).toBe(0);
    });
  });
});
