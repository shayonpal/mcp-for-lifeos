/**
 * Response Truncator - Token budget management for MCP responses
 *
 * Implements centralized token limiting to prevent AI context overflow.
 * Uses character estimation (4 chars ≈ 1 token) for performance.
 *
 * @see dev/contracts/MCP-38-contracts.ts for interface definitions
 */

import {
  TokenBudgetConfig,
  IResponseTruncator,
  TruncationMetadata,
  DEFAULT_TOKEN_BUDGET,
  TRUNCATION_MESSAGES,
  validateTokenBudgetConfig
} from '../../../dev/contracts/MCP-38-contracts.js';

/**
 * ResponseTruncator implementation
 *
 * Tracks token budget consumption during result accumulation and generates
 * truncation metadata when limits are reached.
 */
export class ResponseTruncator implements IResponseTruncator {
  private consumed: number = 0;

  readonly config: TokenBudgetConfig;

  /**
   * Create a new ResponseTruncator
   * @param config Token budget configuration (defaults to DEFAULT_TOKEN_BUDGET)
   */
  constructor(config: Partial<TokenBudgetConfig> = {}) {
    this.config = { ...DEFAULT_TOKEN_BUDGET, ...config };
    validateTokenBudgetConfig(this.config);
  }

  get remainingBudget(): number {
    return Math.max(0, this.config.maxCharacters - this.consumed);
  }

  get totalBudget(): number {
    return this.config.maxCharacters;
  }

  /**
   * Check if adding a result would exceed budget
   * @param formattedResult Result formatted as string
   * @returns true if result fits within budget
   */
  canAddResult(formattedResult: string): boolean {
    const resultSize = formattedResult.length;
    return (this.consumed + resultSize) <= this.config.maxCharacters;
  }

  /**
   * Consume budget for a result
   * @param formattedResult Result formatted as string
   * @throws Error if budget already exceeded
   */
  consumeBudget(formattedResult: string): void {
    const resultSize = formattedResult.length;

    if ((this.consumed + resultSize) > this.config.maxCharacters) {
      throw new Error(
        `Cannot consume budget: would exceed limit (${this.consumed + resultSize} > ${this.config.maxCharacters})`
      );
    }

    this.consumed += resultSize;
  }

  /**
   * Generate truncation metadata
   * @param shownCount Number of results included
   * @param totalCount Total results available
   * @param formatUsed Format used in response
   * @param autoDowngraded Whether auto-downgrade occurred
   * @returns Complete truncation metadata
   */
  getTruncationInfo(
    shownCount: number,
    totalCount: number,
    formatUsed: 'concise' | 'detailed',
    autoDowngraded: boolean
  ): TruncationMetadata {
    const truncated = shownCount < totalCount;

    // Determine limit type
    let limitType: 'token' | 'result' | 'both' = 'token';
    if (!truncated) {
      limitType = 'result'; // maxResults limit only
    } else if (this.consumed >= this.config.maxCharacters * 0.95) {
      limitType = 'both'; // Token budget was primary constraint
    }

    // Generate appropriate suggestion message
    let suggestion: string;
    if (autoDowngraded) {
      suggestion = TRUNCATION_MESSAGES.autoDowngraded(shownCount, totalCount);
    } else {
      suggestion = TRUNCATION_MESSAGES.standard(shownCount, totalCount);
    }

    return {
      truncated,
      shownCount,
      totalCount,
      limitType,
      formatUsed,
      autoDowngraded,
      estimatedTokens: Math.ceil(this.consumed / this.config.estimationRatio),
      estimatedCharacters: this.consumed,
      suggestion
    };
  }

  /**
   * Estimate tokens for a string
   * @param text Text to estimate
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / this.config.estimationRatio);
  }

  /**
   * Reset budget to initial state
   */
  reset(): void {
    this.consumed = 0;
  }
}

/**
 * Create a default ResponseTruncator instance
 * @returns ResponseTruncator with default configuration
 */
export function createDefaultTruncator(): ResponseTruncator {
  return new ResponseTruncator();
}

/**
 * Create a ResponseTruncator with custom configuration
 * @param config Custom token budget configuration
 * @returns ResponseTruncator with provided configuration
 */
export function createTruncator(config: Partial<TokenBudgetConfig>): ResponseTruncator {
  return new ResponseTruncator(config);
}
