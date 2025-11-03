/**
 * Search Module
 *
 * Handles full-text search, query parsing, and relevance scoring.
 */

// Search Engine - Core search functionality with relevance scoring
export {
  SearchEngine,
  type AdvancedSearchOptions,
  type SearchResult,
  type SearchMatch
} from './search-engine.js';

// Query Parser - Search query interpretation and strategy selection
export { QueryParser } from './query-parser.js';
