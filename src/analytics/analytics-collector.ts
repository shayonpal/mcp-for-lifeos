/**
 * Analytics Collector - Lightweight telemetry collection
 * 
 * Minimal performance overhead (<1ms) personal development insights
 * @see https://github.com/shayonpal/mcp-for-lifeos/issues/76
 */

import { promises as fs, readFileSync } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { UsageMetrics, AnalyticsSummary, AnalyticsConfig, DEFAULT_ANALYTICS_CONFIG } from './usage-metrics.js';

export class AnalyticsCollector {
  private static instance: AnalyticsCollector;
  private metrics: UsageMetrics[] = [];
  private config: AnalyticsConfig;
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
    
    if (this.config.enabled) {
      this.loadExistingMetrics();
      this.startAutoFlush();
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<AnalyticsConfig>): AnalyticsCollector {
    if (!AnalyticsCollector.instance) {
      AnalyticsCollector.instance = new AnalyticsCollector(config);
    }
    return AnalyticsCollector.instance;
  }

  /**
   * Load existing metrics from disk on startup
   */
  private loadExistingMetrics(): void {
    try {
      if (existsSync(this.config.outputPath)) {
        const fileContent = readFileSync(this.config.outputPath, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (data.metrics && Array.isArray(data.metrics)) {
          // Convert timestamp strings back to Date objects
          this.metrics = data.metrics.map((metric: any) => ({
            ...metric,
            timestamp: new Date(metric.timestamp)
          }));
          
          if (this.config.logToConsole) {
            console.log(`[Analytics] Loaded ${this.metrics.length} existing metrics from disk`);
          }
        }
      }
    } catch (error) {
      // If loading fails, start with empty metrics (don't crash the server)
      console.error('[Analytics] Failed to load existing metrics:', error);
      this.metrics = [];
    }
  }

  /**
   * Record a usage metric (designed for <1ms overhead)
   */
  recordUsage(metric: Omit<UsageMetrics, 'timestamp'>): void {
    if (!this.config.enabled) return;

    const fullMetric: UsageMetrics = {
      ...metric,
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);

    // Log to console if enabled (for development)
    if (this.config.logToConsole) {
      console.log(`[Analytics] ${metric.toolName}: ${metric.executionTime}ms, success: ${metric.success}`);
    }

    // Auto-flush if memory limit reached
    if (this.metrics.length >= this.config.maxMetricsInMemory) {
      this.flush();
    }
  }

  /**
   * Record tool execution with timing
   */
  async recordToolExecution<T>(
    toolName: string, 
    operation: () => Promise<T>,
    context?: { searchMode?: string; cacheHit?: boolean; retryCount?: number }
  ): Promise<T> {
    if (!this.config.enabled) {
      return await operation();
    }

    const startTime = Date.now();
    let success = false;
    let errorType: string | undefined;
    let resultCount: number | undefined;

    try {
      const result = await operation();
      success = true;
      
      // Try to extract result count for search operations
      if (Array.isArray(result)) {
        resultCount = result.length;
      } else if (result && typeof result === 'object' && 'length' in result) {
        resultCount = (result as any).length;
      }
      
      return result;
    } catch (error) {
      errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      throw error;
    } finally {
      const executionTime = Date.now() - startTime;
      
      this.recordUsage({
        toolName,
        executionTime,
        success,
        cacheHit: context?.cacheHit,
        retryCount: context?.retryCount,
        searchMode: context?.searchMode,
        resultCount,
        errorType
      });
    }
  }

  /**
   * Generate analytics summary
   */
  generateSummary(periodDays: number = 7): AnalyticsSummary {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));
    
    const periodMetrics = this.metrics.filter(m => 
      m.timestamp >= startDate && m.timestamp <= endDate
    );

    if (periodMetrics.length === 0) {
      return this.getEmptySummary(startDate, endDate);
    }

    // Tool usage analysis
    const toolStats = new Map<string, { 
      count: number; 
      totalTime: number; 
      successCount: number; 
    }>();

    let totalCacheHits = 0;
    let totalCacheRequests = 0;
    let totalRetries = 0;
    let totalRetriedOperations = 0;
    let slowOperations = 0;
    let autoModeDetections = 0;
    let fallbacksTriggered = 0;

    // Daily and hourly distribution
    const dailyUsage: Record<string, number> = {};
    const hourlyDistribution: Record<string, number> = {};

    for (const metric of periodMetrics) {
      // Tool statistics
      const toolKey = metric.toolName;
      if (!toolStats.has(toolKey)) {
        toolStats.set(toolKey, { count: 0, totalTime: 0, successCount: 0 });
      }
      const stats = toolStats.get(toolKey)!;
      stats.count++;
      stats.totalTime += metric.executionTime;
      if (metric.success) stats.successCount++;

      // Cache statistics
      if (metric.cacheHit !== undefined) {
        totalCacheRequests++;
        if (metric.cacheHit) totalCacheHits++;
      }

      // Retry statistics
      if (metric.retryCount !== undefined && metric.retryCount > 0) {
        totalRetriedOperations++;
        totalRetries += metric.retryCount;
      }

      // Performance tracking
      if (metric.executionTime > this.config.slowOperationThresholdMs) {
        slowOperations++;
      }

      // Routing accuracy
      if (metric.searchMode === 'auto') {
        autoModeDetections++;
      }
      if (metric.routingDecision?.includes('fallback')) {
        fallbacksTriggered++;
      }

      // Time distribution
      const dayKey = metric.timestamp.toISOString().split('T')[0];
      const hourKey = metric.timestamp.getHours().toString();
      
      dailyUsage[dayKey] = (dailyUsage[dayKey] || 0) + 1;
      hourlyDistribution[hourKey] = (hourlyDistribution[hourKey] || 0) + 1;
    }

    // Build top tools list
    const topTools = Array.from(toolStats.entries())
      .map(([toolName, stats]) => ({
        toolName,
        usageCount: stats.count,
        averageTime: Math.round(stats.totalTime / stats.count),
        successRate: Math.round((stats.successCount / stats.count) * 100) / 100
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    const totalExecutions = periodMetrics.length;
    const totalExecutionTime = periodMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    const totalSuccesses = periodMetrics.filter(m => m.success).length;

    return {
      period: { start: startDate, end: endDate },
      totalExecutions,
      averageExecutionTime: Math.round(totalExecutionTime / totalExecutions),
      successRate: Math.round((totalSuccesses / totalExecutions) * 100) / 100,
      topTools,
      routingAccuracy: {
        autoModeDetections,
        fallbacksTriggered,
        accuracy: autoModeDetections > 0 ? 
          Math.round(((autoModeDetections - fallbacksTriggered) / autoModeDetections) * 100) / 100 : 1.0
      },
      performance: {
        cacheHitRate: totalCacheRequests > 0 ? 
          Math.round((totalCacheHits / totalCacheRequests) * 100) / 100 : 0,
        averageRetries: totalRetriedOperations > 0 ? 
          Math.round((totalRetries / totalRetriedOperations) * 10) / 10 : 0,
        slowOperations
      },
      trends: {
        dailyUsage,
        hourlyDistribution
      }
    };
  }

  /**
   * Flush metrics to file
   */
  async flush(): Promise<void> {
    if (!this.config.enabled || this.metrics.length === 0) return;

    try {
      // Ensure output directory exists
      const outputDir = dirname(this.config.outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Prepare data for export
      const exportData = {
        metadata: {
          generated: new Date().toISOString(),
          totalMetrics: this.metrics.length,
          version: '1.0.0'
        },
        metrics: this.metrics.slice(), // Copy array
        summary: this.generateSummary()
      };

      // Write to file
      if (this.config.logToFile) {
        await fs.writeFile(
          this.config.outputPath, 
          JSON.stringify(exportData, null, 2),
          'utf8'
        );
      }

      // Archive older metrics, keep recent ones
      const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours
      this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);

    } catch (error) {
      console.error('[Analytics] Failed to flush metrics:', error);
    }
  }

  /**
   * Start automatic flushing
   */
  private startAutoFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('[Analytics] Auto-flush failed:', error);
      });
    }, this.config.flushIntervalMs);
  }

  /**
   * Stop collection and flush final data
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Get current metrics count
   */
  getMetricsCount(): number {
    return this.metrics.length;
  }

  /**
   * Clear all metrics (for testing)
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Create empty summary structure
   */
  private getEmptySummary(start: Date, end: Date): AnalyticsSummary {
    return {
      period: { start, end },
      totalExecutions: 0,
      averageExecutionTime: 0,
      successRate: 1.0,
      topTools: [],
      routingAccuracy: {
        autoModeDetections: 0,
        fallbacksTriggered: 0,
        accuracy: 1.0
      },
      performance: {
        cacheHitRate: 0,
        averageRetries: 0,
        slowOperations: 0
      },
      trends: {
        dailyUsage: {},
        hourlyDistribution: {}
      }
    };
  }
}