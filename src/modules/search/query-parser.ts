/**
 * Query Parser Utility
 * Handles query parsing, term extraction, and strategy detection for multi-word searches
 *
 * @since MCP-59
 */

import type { QueryStrategy, ParsedQuery } from '../../../dev/contracts/MCP-59-contracts';
import { escapeRegex } from '../../regex-utils.js';
import { normalizeText } from '../../text-utils.js';

/**
 * Utility class for parsing and analyzing search queries
 * Implements QueryParserContract from MCP-59 contracts
 */
export class QueryParser {
  // LRU cache for parsed queries (MCP-59: Performance optimization)
  private static parseCache = new Map<string, ParsedQuery>();
  private static readonly MAX_CACHE_SIZE = 100;

  /**
   * Parse a query string into structured components
   * Uses LRU cache to avoid redundant parsing of repeated queries
   *
   * @param query - Raw query string
   * @returns Parsed query with terms and detected strategy
   *
   * @since MCP-59 - Added LRU caching for performance
   */
  static parse(query: string): ParsedQuery {
    // Check cache first
    const cached = this.parseCache.get(query);
    if (cached) {
      // Move to end (most recently used) by deleting and re-inserting
      this.parseCache.delete(query);
      this.parseCache.set(query, cached);
      return cached;
    }
    const terms = this.extractTerms(query);
    const normalizedTerms = normalizeText(terms); // MCP-59: Use shared text-utils
    const strategy = this.detectStrategy(query);
    const hasRegexChars = this.hasRegexChars(query);
    const isQuoted = this.isQuoted(query);

    const result: ParsedQuery = {
      original: query,
      terms,
      normalizedTerms,
      strategy,
      hasRegexChars,
      isQuoted
    };

    // Add to cache with LRU eviction
    if (this.parseCache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry (first key in Map maintains insertion order)
      const firstKey = this.parseCache.keys().next().value;
      if (firstKey !== undefined) {
        this.parseCache.delete(firstKey);
      }
    }
    this.parseCache.set(query, result);

    return result;
  }

  /**
   * Extract individual terms from a query
   * Handles quoted strings as single terms
   * @param query - Raw query string
   * @returns Array of extracted terms
   */
  static extractTerms(query: string): string[] {
    if (!query || !query.trim()) return [];

    const terms: string[] = [];
    let currentTerm = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < query.length; i++) {
      const char = query[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        // Start of quoted string
        inQuotes = true;
        quoteChar = char;
        currentTerm = '';
      } else if (char === quoteChar && inQuotes) {
        // End of quoted string
        inQuotes = false;
        if (currentTerm.trim()) {
          terms.push(currentTerm.trim());
        }
        currentTerm = '';
        quoteChar = '';
      } else if (char === ' ' && !inQuotes) {
        // Word boundary outside quotes
        if (currentTerm.trim()) {
          terms.push(currentTerm.trim());
        }
        currentTerm = '';
      } else {
        // Regular character
        currentTerm += char;
      }
    }

    // Add final term if exists
    if (currentTerm.trim()) {
      terms.push(currentTerm.trim());
    }

    return terms;
  }

  // Note: normalizeTerms removed - now using shared normalizeText from text-utils.ts (MCP-59)

  /**
   * Auto-detect appropriate query strategy
   * Detection logic:
   * 1. Quoted strings → exact_phrase
   * 2. Contains " OR " → any_term
   * 3. 1-2 words → exact_phrase
   * 4. 3+ words → all_terms
   *
   * @param query - Raw query string
   * @returns Detected strategy based on query characteristics
   */
  static detectStrategy(query: string): QueryStrategy {
    // Priority 1: Quoted strings
    if (this.isQuoted(query)) {
      return 'exact_phrase';
    }

    // Priority 2: OR operator (case-insensitive, flexible whitespace)
    // Matches "OR" surrounded by one or more whitespace characters (spaces, tabs, etc.)
    if (/\s+OR\s+/i.test(query)) {
      return 'any_term';
    }

    // Priority 3: Word count
    const terms = this.extractTerms(query);
    if (terms.length >= 3) {
      return 'all_terms';
    }

    // Default: 1-2 words → exact_phrase
    return 'exact_phrase';
  }

  /**
   * Check if query contains regex special characters
   * @param query - Query string to check
   * @returns True if contains regex chars (excluding spaces)
   */
  static hasRegexChars(query: string): boolean {
    // Regex special chars excluding space
    return /[.*+?^${}()|[\]\\]/.test(query);
  }

  /**
   * Check if query is wrapped in quotes
   * @param query - Query string to check
   * @returns True if wrapped in quotes
   */
  static isQuoted(query: string): boolean {
    const trimmed = query.trim();
    return (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    );
  }

  /**
   * Filter out logical operators from term list
   * @param terms - Array of terms to filter
   * @returns Terms with logical operators removed
   */
  private static filterLogicalOperators(terms: string[]): string[] {
    const logicalOperators = ['OR', 'AND', 'NOT'];
    return terms.filter(term => !logicalOperators.includes(term.toUpperCase()));
  }

  /**
   * Create regex pattern for different strategies
   * @param terms - Normalized terms to match
   * @param strategy - Query strategy to apply
   * @param caseSensitive - Case sensitivity flag
   * @returns Regex pattern for the specified strategy
   *
   * @since MCP-59 - Simplified to return single RegExp instead of array
   */
  static createPatterns(
    terms: string[],
    strategy: QueryStrategy,
    caseSensitive: boolean
  ): RegExp {
    // Regex Flag Strategy (MCP-59 standardization):
    // Omit 'g' flag to avoid stateful regex issues (lastIndex property maintains state)
    // SearchEngine.findMatches() handles single-match behavior when !regex.global
    // Only use 'i' flag for case-insensitive matching
    const flags = caseSensitive ? '' : 'i';

    // Resolve 'auto' strategy based on term count
    let resolvedStrategy = strategy;
    if (strategy === 'auto') {
      resolvedStrategy = terms.length >= 3 ? 'all_terms' : 'exact_phrase';
    }

    // Normalize terms based on case sensitivity (MCP-59: Use shared text-utils)
    const normalizedTerms = normalizeText(terms, caseSensitive);

    // Filter out logical operators ONLY for any_term strategy (boolean queries)
    // For other strategies (exact_phrase, all_terms), keep literals like "OR gate"
    const filteredTerms = resolvedStrategy === 'any_term'
      ? this.filterLogicalOperators(normalizedTerms)
      : normalizedTerms;

    // Guard against empty term list (e.g., query="AND OR NOT" with any_term strategy)
    if (filteredTerms.length === 0) {
      // Return a pattern that matches nothing
      return /(?!.*)/; // Negative lookahead - matches nothing
    }

    // Escape terms for regex using shared utility (MCP-59: eliminates duplication)
    const escapedTerms = filteredTerms.map(escapeRegex);

    switch (resolvedStrategy) {
      case 'exact_phrase': {
        // Sequential match: "trip to india"
        const pattern = escapedTerms.join('\\s+');
        return new RegExp(pattern, flags);
      }

      case 'all_terms': {
        // All terms present in any order using lookaheads
        // (?=[\s\S]*\btrip\b)(?=[\s\S]*\bindia\b)(?=[\s\S]*\bnovember\b)[\s\S]*
        // IMPORTANT: Use [\s\S]* instead of .* to match across newlines
        const lookaheads = escapedTerms
          .map(term => `(?=[\\s\\S]*\\b${term}\\b)`)
          .join('');
        // Add [\s\S]* to match all characters including newlines (dotAll equivalent)
        return new RegExp(`${lookaheads}[\\s\\S]*`, flags);
      }

      case 'any_term': {
        // Any term matches (OR logic): \b(trip|india|november)\b
        const alternation = escapedTerms.join('|');
        return new RegExp(`\\b(${alternation})\\b`, flags);
      }

      default:
        // Fallback to exact_phrase for unknown strategies
        const pattern = escapedTerms.join('\\s+');
        return new RegExp(pattern, flags);
    }
  }
}
