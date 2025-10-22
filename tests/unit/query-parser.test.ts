/**
 * Unit tests for QueryParser utility
 * Tests query parsing, term extraction, and strategy detection
 *
 * @since MCP-59
 */

import { QueryParser } from '../../src/query-parser';
import type { QueryStrategy, ParsedQuery } from '../../dev/contracts/MCP-59-contracts';

describe('QueryParser', () => {
  describe('extractTerms', () => {
    it('should extract single word', () => {
      const terms = QueryParser.extractTerms('india');
      expect(terms).toEqual(['india']);
    });

    it('should extract multiple words', () => {
      const terms = QueryParser.extractTerms('trip to india');
      expect(terms).toEqual(['trip', 'to', 'india']);
    });

    it('should handle quoted strings as single term', () => {
      const terms = QueryParser.extractTerms('"trip to india"');
      expect(terms).toEqual(['trip to india']);
    });

    it('should handle mixed quoted and unquoted', () => {
      const terms = QueryParser.extractTerms('"trip to india" november planning');
      expect(terms).toEqual(['trip to india', 'november', 'planning']);
    });

    it('should handle extra whitespace', () => {
      const terms = QueryParser.extractTerms('  trip   to    india  ');
      expect(terms).toEqual(['trip', 'to', 'india']);
    });

    it('should handle empty string', () => {
      const terms = QueryParser.extractTerms('');
      expect(terms).toEqual([]);
    });
  });

  // Note: normalizeTerms tests removed - functionality moved to text-utils.ts (MCP-59)

  describe('hasRegexChars', () => {
    it('should detect regex special chars', () => {
      expect(QueryParser.hasRegexChars('trip.*')).toBe(true);
      expect(QueryParser.hasRegexChars('india+')).toBe(true);
      expect(QueryParser.hasRegexChars('nov[ember]')).toBe(true);
    });

    it('should not flag spaces as regex chars', () => {
      expect(QueryParser.hasRegexChars('trip to india')).toBe(false);
    });

    it('should not flag normal text', () => {
      expect(QueryParser.hasRegexChars('simple query')).toBe(false);
    });
  });

  describe('isQuoted', () => {
    it('should detect quoted strings', () => {
      expect(QueryParser.isQuoted('"trip to india"')).toBe(true);
      expect(QueryParser.isQuoted("'trip to india'")).toBe(true);
    });

    it('should not detect unquoted strings', () => {
      expect(QueryParser.isQuoted('trip to india')).toBe(false);
    });

    it('should not detect partial quotes', () => {
      expect(QueryParser.isQuoted('"trip to india')).toBe(false);
      expect(QueryParser.isQuoted('trip to india"')).toBe(false);
    });
  });

  describe('detectStrategy', () => {
    it('should detect exact_phrase for quoted strings', () => {
      expect(QueryParser.detectStrategy('"trip to india"')).toBe('exact_phrase');
    });

    it('should detect any_term for OR queries', () => {
      expect(QueryParser.detectStrategy('trip OR india')).toBe('any_term');
      expect(QueryParser.detectStrategy('trip or india')).toBe('any_term');
    });

    it('should detect exact_phrase for 1-2 word queries', () => {
      expect(QueryParser.detectStrategy('india')).toBe('exact_phrase');
      expect(QueryParser.detectStrategy('trip india')).toBe('exact_phrase');
    });

    it('should detect all_terms for 3+ word queries', () => {
      expect(QueryParser.detectStrategy('trip to india')).toBe('all_terms');
      expect(QueryParser.detectStrategy('trip india november planning')).toBe('all_terms');
    });

    it('should prioritize quotes over word count', () => {
      expect(QueryParser.detectStrategy('"trip to india november"')).toBe('exact_phrase');
    });

    it('should prioritize OR over word count', () => {
      expect(QueryParser.detectStrategy('trip india november OR planning')).toBe('any_term');
    });
  });

  describe('parse', () => {
    it('should parse simple query', () => {
      const parsed = QueryParser.parse('india');
      expect(parsed).toMatchObject({
        original: 'india',
        terms: ['india'],
        normalizedTerms: ['india'],
        strategy: 'exact_phrase',
        hasRegexChars: false,
        isQuoted: false
      });
    });

    it('should parse multi-word query', () => {
      const parsed = QueryParser.parse('trip to india');
      expect(parsed).toMatchObject({
        original: 'trip to india',
        terms: ['trip', 'to', 'india'],
        normalizedTerms: ['trip', 'to', 'india'],
        strategy: 'all_terms',
        hasRegexChars: false,
        isQuoted: false
      });
    });

    it('should parse quoted query', () => {
      const parsed = QueryParser.parse('"trip to india"');
      expect(parsed).toMatchObject({
        original: '"trip to india"',
        terms: ['trip to india'],
        normalizedTerms: ['trip to india'],
        strategy: 'exact_phrase',
        hasRegexChars: false,
        isQuoted: true
      });
    });

    it('should parse OR query', () => {
      const parsed = QueryParser.parse('trip OR india');
      expect(parsed).toMatchObject({
        original: 'trip OR india',
        terms: ['trip', 'OR', 'india'],
        normalizedTerms: ['trip', 'or', 'india'],
        strategy: 'any_term',
        hasRegexChars: false,
        isQuoted: false
      });
    });

    it('should detect regex chars', () => {
      const parsed = QueryParser.parse('trip.*india');
      expect(parsed.hasRegexChars).toBe(true);
    });
  });

  describe('createPatterns', () => {
    describe('exact_phrase strategy', () => {
      it('should create single pattern for sequential match', () => {
        const pattern = QueryParser.createPatterns(
          ['trip', 'to', 'india'],
          'exact_phrase',
          false
        );
        expect(pattern).toBeInstanceOf(RegExp);
        expect(pattern.source).toContain('trip');
        expect(pattern.source).toContain('to');
        expect(pattern.source).toContain('india');
      });

      it('should respect case sensitivity', () => {
        const caseSensitive = QueryParser.createPatterns(['Trip'], 'exact_phrase', true);
        const caseInsensitive = QueryParser.createPatterns(['Trip'], 'exact_phrase', false);

        expect(caseSensitive.flags).not.toContain('i');
        expect(caseInsensitive.flags).toContain('i');
      });
    });

    describe('all_terms strategy', () => {
      it('should create lookahead pattern for all terms', () => {
        const pattern = QueryParser.createPatterns(
          ['trip', 'india', 'november'],
          'all_terms',
          false
        );
        expect(pattern).toBeInstanceOf(RegExp);
        expect(pattern.source).toContain('(?=');
        expect(pattern.source).toContain('trip');
        expect(pattern.source).toContain('india');
        expect(pattern.source).toContain('november');
      });

      it('should use word boundaries', () => {
        const pattern = QueryParser.createPatterns(['trip'], 'all_terms', false);
        expect(pattern.source).toContain('\\b');
      });
    });

    describe('any_term strategy', () => {
      it('should create alternation pattern for any term', () => {
        const pattern = QueryParser.createPatterns(
          ['trip', 'india', 'november'],
          'any_term',
          false
        );
        expect(pattern).toBeInstanceOf(RegExp);
        expect(pattern.source).toContain('trip');
        expect(pattern.source).toContain('india');
        expect(pattern.source).toContain('november');
        expect(pattern.source).toContain('|');
      });

      it('should use word boundaries', () => {
        const pattern = QueryParser.createPatterns(['trip'], 'any_term', false);
        expect(pattern.source).toContain('\\b');
      });
    });

    describe('auto strategy', () => {
      it('should fallback to exact_phrase for auto', () => {
        const pattern = QueryParser.createPatterns(['trip'], 'auto', false);
        expect(pattern).toBeInstanceOf(RegExp);
        // Auto should resolve to exact_phrase for single word
        expect(pattern.source).toContain('trip');
      });
    });
  });

  describe('Bug Regression: MCP-59', () => {
    it('should handle "trip to india november planning" with all_terms', () => {
      const parsed = QueryParser.parse('trip to india november planning');
      expect(parsed.strategy).toBe('all_terms');
      expect(parsed.terms).toHaveLength(5);

      const pattern = QueryParser.createPatterns(
        parsed.normalizedTerms,
        parsed.strategy,
        false
      );
      expect(pattern).toBeInstanceOf(RegExp);

      // Test pattern matches text with all terms in different order
      const testText = 'November 2025 planning for trip to india';
      expect(pattern.test(testText.toLowerCase())).toBe(true);

      // Test pattern does NOT match text missing a term
      const partialText = 'November planning for india trip';
      expect(pattern.test(partialText.toLowerCase())).toBe(false);
    });

    it('should maintain exact_phrase for "India trip"', () => {
      const parsed = QueryParser.parse('India trip');
      expect(parsed.strategy).toBe('exact_phrase');

      const pattern = QueryParser.createPatterns(
        parsed.normalizedTerms,
        parsed.strategy,
        false
      );

      // Should match sequential
      expect(pattern.test('india trip planning')).toBe(true);

      // Should NOT match non-sequential (exact phrase)
      expect(pattern.test('trip to india')).toBe(false);
    });
  });
});
