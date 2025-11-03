/**
 * MCP-65: Fix Remaining Integration Test Suite Failures
 *
 * Implementation contracts for test infrastructure fixes based on comprehensive
 * Codex strategic analysis. This file defines TypeScript interfaces and utilities
 * to guide the implementation across 7 test files with 11+ failures.
 *
 * Root Causes Identified by Codex Analysis:
 * 1. Method signature mismatch in formatSearchResult (token-limited-search.test.ts)
 * 2. Process spawn path error (dist/index.js vs dist/src/index.js)
 * 3. Analytics globally disabled in tests/setup.ts preventing JSONL writes
 * 4. Path normalization bug in VaultUtils (double-prefix issue)
 * 5. ObsidianLinks edge case (.md → .MD for empty filename)
 * 6. ResponseTruncator validation guard violations (maxCharacters > limit)
 * 7. JSONL stress test threshold mismatches for Node 18 (heap ~8MB vs 10MB expected)
 *
 * Implementation Phases:
 * - Phase 1: formatSearchResult compatibility + analytics test opt-out (Priority: High)
 * - Phase 2: Path normalization fix + validation adjustments (Priority: High)
 * - Phase 3: Memory threshold recalibration (Priority: Medium)
 */

import type { SearchResult } from '../../src/modules/search/index.js';
import type { ResponseTruncator } from '../../src/response-truncator.js';

// ============================================================================
// Phase 1: formatSearchResult Compatibility Layer
// ============================================================================

/**
 * Test helper contract: Compatibility wrapper for formatSearchResult
 *
 * Purpose: Bridge old API (SearchResult object) to new API (discrete fields)
 * Location: Create in tests/helpers/format-search-result.ts
 *
 * Old API (tests): formatSearchResult(mockResult, 'concise', truncator, index)
 * New API (src):   formatSearchResult(index, title, filePath, contentType?, score?, additionalInfo?, format, tokenBudget?)
 */
export interface FormatSearchResultHelper {
  /**
   * Compatibility wrapper that accepts SearchResult object and delegates to new signature
   *
   * @param result - SearchResult object from test fixture
   * @param index - Result index (0-based)
   * @param format - Display format ('concise' | 'detailed')
   * @param truncator - Optional ResponseTruncator for token budgeting
   * @returns Formatted markdown string with [[wikilink]] syntax
   *
   * Implementation notes:
   * - Extract title from result.frontmatter?.title or derive from path
   * - Pass result.frontmatter?.contentType (may be string | string[])
   * - Include result.score and result.excerpt as additionalInfo
   * - Verify output contains [[...]] from createClickableLink
   */
  formatSearchResultFromSearch(
    result: SearchResult,
    index: number,
    format: 'concise' | 'detailed',
    truncator?: ResponseTruncator
  ): string;
}

/**
 * Test assertion contracts for formatSearchResult output
 *
 * Since the new API generates different markdown, tests must verify:
 * - [[wikilink]] presence and correct note name
 * - Title display (from frontmatter or derived from filename)
 * - Format differences (concise vs detailed)
 */
export interface FormatSearchResultAssertions {
  /** Verify wikilink format: [[note-name]] */
  containsWikilink: (output: string, noteName: string) => boolean;

  /** Verify title display matches frontmatter or filename */
  containsTitle: (output: string, expectedTitle: string) => boolean;

  /** Verify detailed format includes metadata (tags, category, etc.) */
  includesMetadata: (output: string, format: 'concise' | 'detailed') => boolean;
}

// ============================================================================
// Phase 1: Analytics Test Opt-Out Pattern
// ============================================================================

/**
 * Analytics test configuration contract
 *
 * Problem: tests/setup.ts globally disables analytics and stubs AnalyticsCollector
 * Solution: Suites needing real JSONL writes must opt out of global mock
 *
 * Affected files:
 * - tests/integration/mcp-server-concurrent.test.ts (4 timeouts)
 * - tests/integration/jsonl-final-validation.test.ts (1 timeout)
 *
 * Implementation approach:
 * 1. In affected test files, unmock analytics before describe block
 * 2. Re-enable analytics via process.env.DISABLE_USAGE_ANALYTICS = 'false'
 * 3. Spawn process with correct path: dist/src/index.js (not dist/index.js)
 * 4. Ensure proper cleanup to avoid ESM import.meta.url parsing issues
 */
export interface AnalyticsTestConfig {
  /**
   * Opt specific test suite out of global analytics mock
   *
   * Usage pattern:
   * ```typescript
   * // At top of test file, before imports
   * jest.unmock('../../src/analytics/analytics-collector.js');
   *
   * describe('Analytics Suite', () => {
   *   beforeAll(() => {
   *     process.env.DISABLE_USAGE_ANALYTICS = 'false';
   *   });
   *
   *   afterAll(() => {
   *     process.env.DISABLE_USAGE_ANALYTICS = 'true'; // Restore
   *   });
   * });
   * ```
   */
  unmockAnalytics: () => void;

  /**
   * Enable analytics for spawned child processes
   * Returns environment object with analytics enabled
   */
  getAnalyticsEnabledEnv: (testDir: string) => Record<string, string>;

  /**
   * Get correct server entry point path after build
   * Returns: 'dist/src/index.js' (not 'dist/index.js')
   */
  getServerEntryPoint: () => string;
}

// ============================================================================
// Phase 2: Path Normalization Contracts
// ============================================================================

/**
 * Path normalization fix contract for VaultUtils.createNote
 *
 * Problem: VaultUtils.createNote re-normalizes already-absolute dailyNotesPath,
 *          causing double-prefix (vaultPath + dailyNotesPath where dailyNotesPath
 *          already contains vaultPath)
 *
 * Location: src/vault-utils.ts:324-339
 *
 * Affected tests:
 * - tests/integration/daily-note-simple.test.ts (7/7 pass, suite fails)
 * - tests/integration/daily-note-task-workflow.test.ts (failures)
 * - tests/unit/task-formatting.test.ts (failures)
 */
export interface PathNormalizationFix {
  /**
   * Enhanced normalizePath that detects already-absolute paths
   *
   * Logic:
   * ```typescript
   * function normalizePath(basePath: string, inputPath: string): string {
   *   // Guard: if inputPath already starts with basePath, treat as absolute
   *   if (inputPath.startsWith(basePath)) {
   *     return path.resolve(inputPath);
   *   }
   *
   *   // Otherwise, join basePath + inputPath
   *   return path.resolve(basePath, inputPath);
   * }
   * ```
   *
   * Alternative approach: Ensure test fixtures pass vault-relative folders
   * and let normalizePath do the join (adjust test config instead of code)
   */
  normalizePath: (basePath: string, inputPath: string) => string;

  /**
   * Test fixtures for path normalization regression coverage
   * Must cover:
   * - Windows paths (C:\\ backslashes)
   * - POSIX paths (forward slashes)
   * - Already-absolute paths (with basePath prefix)
   * - Relative paths (without basePath prefix)
   */
  pathTestFixtures: PathTestFixture[];
}

export interface PathTestFixture {
  name: string;
  basePath: string;
  inputPath: string;
  expectedOutput: string;
  description: string;
}

// ============================================================================
// Phase 2: ObsidianLinks Edge Case Fix
// ============================================================================

/**
 * ObsidianLinks.extractNoteTitle edge case contract
 *
 * Problem: extractNoteTitle('/vault/.md') returns '.MD' instead of empty string
 * Location: src/obsidian-links.ts:120-123
 *
 * Current behavior: Title-case empty filename → '.MD'
 * Expected behavior: Return empty string for .md-only filenames
 *
 * Affected tests:
 * - tests/unit/obsidian-links.test.ts:233-240 (expects empty string)
 */
export interface ObsidianLinksEdgeCaseFix {
  /**
   * Enhanced extractNoteTitle with edge case handling
   *
   * Logic:
   * ```typescript
   * function extractNoteTitle(filePath: string): string {
   *   const basename = path.basename(filePath, '.md');
   *
   *   // Edge case: if basename is empty, return empty string
   *   if (!basename || basename === '') {
   *     return '';
   *   }
   *
   *   // Otherwise, title-case the basename
   *   return titleCase(basename);
   * }
   * ```
   *
   * Decision point: Does product surface need legacy behavior (title-casing
   * empty filenames)? If yes, adjust test expectations instead of code.
   */
  extractNoteTitle: (filePath: string) => string;

  /**
   * Test cases for edge case coverage
   */
  edgeCaseFixtures: NoteTitleEdgeCase[];
}

export interface NoteTitleEdgeCase {
  filePath: string;
  expectedTitle: string;
  description: string;
}

// ============================================================================
// Phase 2: ResponseTruncator Validation Fix
// ============================================================================

/**
 * ResponseTruncator validation guard contract
 *
 * Problem: Tests configure maxCharacters=100000, violating guard in
 *          src/response-truncator.ts:34-37 (likely enforces lower limit)
 *
 * Location: tests/unit/response-truncator.test.ts:57
 *
 * Solution: Update test expectations to respect validation guard OR
 *           adjust validation guard if 100000 is legitimate use case
 */
export interface ResponseTruncatorValidation {
  /**
   * Validation guard constants
   * Define acceptable ranges for token budget configuration
   */
  MAX_CHARACTERS_LIMIT: number;
  MIN_CHARACTERS_LIMIT: number;
  MAX_TOKENS_LIMIT: number;
  MIN_TOKENS_LIMIT: number;

  /**
   * Validation function to check config compliance
   * Should match behavior in src/response-truncator.ts:34-37
   */
  validateTruncatorConfig: (config: {
    maxTokens?: number;
    maxCharacters?: number;
  }) => { valid: boolean; errors: string[] };
}

// ============================================================================
// Phase 3: JSONL Stress Test Threshold Recalibration
// ============================================================================

/**
 * JSONL stress test memory threshold contract
 *
 * Problem: Tests expect fixed 10MB heap growth and 5 recoveries, but Node 18
 *          exhibits ~8MB heap delta and 4 recoveries when injecting corrupt lines
 *
 * Location: tests/integration/jsonl-stress.test.ts:113-137, 345-384
 *
 * Affected assertions:
 * - Memory usage during continuous writes (expected < 10MB, actual ~8MB)
 * - Recovery count with corrupt data (expected 5, actual 4)
 *
 * Solution: Capture baseline heap growth and acceptable variance instead of
 *           fixed thresholds, or split into smoke test + heavy load test
 */
export interface JSONLStressTestThresholds {
  /**
   * Baseline memory thresholds for Node 18
   * Should be measured empirically, not hardcoded
   */
  baselineMemoryGrowth: {
    min: number; // e.g., 6MB
    max: number; // e.g., 10MB
    typical: number; // e.g., 8MB
  };

  /**
   * Recovery count variance tolerance
   * Account for Node version differences and GC timing
   */
  recoveryCountRange: {
    min: number; // e.g., 3
    max: number; // e.g., 5
    expected: number; // e.g., 4
  };

  /**
   * Alternative: Feature flag for heavy stress tests
   * Allows splitting into fast smoke test + slow comprehensive test
   */
  enableHeavyStressTests: boolean;
}

/**
 * Smoke test variant contract
 *
 * Purpose: Lighter test that detects runaway memory growth without full
 *          stress load, keeping main suite tractable
 *
 * Implementation:
 * - Reduce write count from 10000 to 1000
 * - Use trend-based thresholds (growth rate) instead of absolute values
 * - Mark heavy tests with test.skip or test.concurrent for manual runs
 */
export interface SmokeTestVariant {
  /** Reduced write count for fast execution */
  smokeTestWriteCount: number; // e.g., 1000

  /** Trend-based memory growth detection (MB/write) */
  maxMemoryGrowthRate: number; // e.g., 0.01 MB per write

  /** Skip heavy load tests in CI */
  shouldSkipHeavyTests: (isCI: boolean) => boolean;
}

// ============================================================================
// Test Utilities Export Contract
// ============================================================================

/**
 * Consolidated test utilities module
 *
 * Location: Create tests/helpers/index.ts
 *
 * Exports all helper functions and fixtures to avoid duplication across
 * test files. Ensures consistent patterns for:
 * - formatSearchResult compatibility
 * - Analytics test opt-out
 * - Path normalization test fixtures
 * - Edge case handling
 */
export interface TestHelpersModule {
  formatSearchResult: FormatSearchResultHelper;
  analyticsConfig: AnalyticsTestConfig;
  pathNormalization: PathNormalizationFix;
  obsidianLinks: ObsidianLinksEdgeCaseFix;
  truncatorValidation: ResponseTruncatorValidation;
  stressTestThresholds: JSONLStressTestThresholds;
  smokeTest: SmokeTestVariant;
}

// ============================================================================
// Implementation Checklist
// ============================================================================

/**
 * Contract implementation checklist (use for tracking)
 *
 * Phase 1 (High Priority - Day 1, Oct 27):
 * [ ] Create tests/helpers/format-search-result.ts with compatibility wrapper
 * [ ] Update token-limited-search.test.ts to use helper (4 failures → 0)
 * [ ] Add analytics opt-out pattern to mcp-server-concurrent.test.ts
 * [ ] Add analytics opt-out pattern to jsonl-final-validation.test.ts
 * [ ] Fix process spawn path: dist/index.js → dist/src/index.js
 * [ ] Update obsidian-links.test.ts assertions for new markdown format
 *
 * Phase 2 (High Priority - Day 2, Oct 28):
 * [ ] Fix VaultUtils.normalizePath double-prefix bug
 * [ ] Add path normalization regression tests (Windows/POSIX/absolute/relative)
 * [ ] Fix ObsidianLinks.extractNoteTitle edge case (.md → empty string)
 * [ ] Update ResponseTruncator validation expectations (maxCharacters)
 * [ ] Run daily-note-simple.test.ts to verify path fix (7/7 pass, suite pass)
 * [ ] Run task-formatting.test.ts to verify path fix
 *
 * Phase 3 (Medium Priority - Post-cycle if needed):
 * [ ] Recalibrate JSONL stress test memory thresholds for Node 18
 * [ ] Create smoke test variant with reduced write count
 * [ ] Mark heavy stress tests with test.skip for optional runs
 * [ ] Document baseline memory growth empirically
 *
 * Validation:
 * [ ] npm test (all suites should pass)
 * [ ] npm run typecheck (no TypeScript errors)
 * [ ] Verify no ESM import.meta.url parsing regressions
 * [ ] Document any skipped tests with follow-up Linear issues
 */

// ============================================================================
// Risk Mitigation Notes
// ============================================================================

/**
 * Key risks and mitigation strategies:
 *
 * 1. Analytics mock unmocking → ESM import.meta.url parsing issue
 *    Mitigation: Gate unmock within describe blocks, restore in afterAll
 *
 * 2. Path normalization changes → vault writes outside vault
 *    Mitigation: Comprehensive regression tests, log computed paths in dry run
 *
 * 3. Relaxing memory assertions → masking real leaks
 *    Mitigation: Keep smoke tests with trend-based thresholds
 *
 * 4. Adjusting test expectations → masking genuine regressions
 *    Mitigation: Validate product surface behavior before changing assertions
 *
 * 5. Spawning compiled server → slow CI, build dependency
 *    Mitigation: Consider child_process.fork with tsx for faster tests
 *
 * 6. Fixing one category breaks another → cascading failures
 *    Mitigation: Run full test suite after each phase, not just affected tests
 */
