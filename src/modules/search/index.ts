/**
 * Search Module
 *
 * Handles full-text search, query parsing, natural language processing, and response formatting.
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

// Natural Language Processor - Query interpretation and NLP utilities
export {
  NaturalLanguageProcessor,
  type QueryInterpretation
} from './natural-language-processor.js';

// Response Truncator - Token-limited response formatting
export {
  ResponseTruncator,
  createDefaultTruncator,
  createTruncator
} from './response-truncator.js';
