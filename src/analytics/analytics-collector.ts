/**
 * Analytics Collector - Lightweight telemetry collection
 * 
 * Minimal performance overhead (<1ms) personal development insights
 * @see https://github.com/shayonpal/mcp-for-lifeos/issues/76
 */

import { promises as fs, readFileSync, appendFileSync } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { dirname, extname } from 'path';
import { hostname } from 'os';
import { randomUUID } from 'crypto';
import { UsageMetrics, AnalyticsSummary, AnalyticsConfig, DEFAULT_ANALYTICS_CONFIG } from './usage-metrics.js';

export class AnalyticsCollector {
  private static instance: AnalyticsCollector;
  private metrics: UsageMetrics[] = [];
  private config: AnalyticsConfig;
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly instanceId: string = randomUUID();
  private readonly processInfo = {
    pid: process.pid,
    hostname: hostname(),
    sessionStart: new Date().toISOString()
  };
  private buffer: UsageMetrics[] = [];

  private constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
    
    // Use JSONL format for new files
    if (this.config.outputPath && !this.config.outputPath.endsWith('.jsonl')) {
      this.config.outputPath = this.config.outputPath.replace(/\.json$/, '.jsonl');
    }
    
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
      // Check for legacy JSON file first
      const legacyPath = this.config.outputPath.replace('.jsonl', '.json');
      if (existsSync(legacyPath) && !existsSync(this.config.outputPath)) {
        // Load from legacy JSON format
        const fileContent = readFileSync(legacyPath, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (data.metrics && Array.isArray(data.metrics)) {
          // Convert timestamp strings back to Date objects
          this.metrics = data.metrics.map((metric: any) => ({
            ...metric,
            timestamp: new Date(metric.timestamp)
          }));
          
          if (this.config.logToConsole) {
            console.log(`[Analytics] Loaded ${this.metrics.length} existing metrics from legacy JSON`);
          }
        }
      } else if (existsSync(this.config.outputPath)) {
        // Load from JSONL format
        const fileContent = readFileSync(this.config.outputPath, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim());
        
        this.metrics = [];
        for (const line of lines) {
          try {
            const metric = JSON.parse(line);
            this.metrics.push({
              ...metric,
              timestamp: new Date(metric.timestamp)
            });
          } catch (lineError) {
            // Skip malformed lines
            console.warn('[Analytics] Skipping malformed JSONL line:', line.substring(0, 100));
          }
        }
        
        if (this.config.logToConsole) {
          console.log(`[Analytics] Loaded ${this.metrics.length} metrics from JSONL`);
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
      timestamp: new Date(),
      // Add instance identification
      instanceId: this.instanceId,
      pid: this.processInfo.pid,
      hostname: this.processInfo.hostname,
      sessionStart: this.processInfo.sessionStart
    };

    // For critical metrics (errors, slow operations), append immediately
    const isCritical = !metric.success || (metric.executionTime && metric.executionTime > this.config.slowOperationThresholdMs);
    
    if (isCritical) {
      this.appendMetric(fullMetric);
    } else {
      // Buffer non-critical metrics
      this.buffer.push(fullMetric);
      
      // Flush buffer if it reaches size limit
      if (this.buffer.length >= 100) {
        this.flushBuffer();
      }
    }

    // Keep in-memory metrics for summary generation
    this.metrics.push(fullMetric);

    // Log to console if enabled (for development)
    if (this.config.logToConsole) {
      console.log(`[Analytics] ${metric.toolName}: ${metric.executionTime}ms, success: ${metric.success}`);
    }

    // Archive older metrics in memory, keep recent ones
    const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
  }

  /**
   * Append a single metric to the JSONL file (atomic operation)
   */
  private appendMetric(metric: UsageMetrics): void {
    try {
      // Ensure output directory exists
      const outputDir = dirname(this.config.outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Convert metric to JSON line
      const jsonLine = JSON.stringify({
        ...metric,
        timestamp: metric.timestamp.toISOString()
      }) + '\n';

      // Atomic append using explicit O_APPEND flag for cross-platform guarantee
      appendFileSync(this.config.outputPath, jsonLine, { 
        encoding: 'utf8', 
        flag: 'a'  // Explicit append flag ensures atomic O_APPEND behavior
      });
    } catch (error) {
      console.error('[Analytics] Failed to append metric:', error);
      // Continue operation - analytics failure shouldn't break the server
    }
  }

  /**
   * Flush buffered metrics to JSONL file
   */
  private flushBuffer(): void {
    if (this.buffer.length === 0) return;

    try {
      // Ensure output directory exists
      const outputDir = dirname(this.config.outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Convert all buffered metrics to JSONL lines
      const lines = this.buffer.map(metric => 
        JSON.stringify({
          ...metric,
          timestamp: metric.timestamp.toISOString()
        })
      ).join('\n') + '\n';

      // Atomic append all lines at once with explicit O_APPEND flag
      appendFileSync(this.config.outputPath, lines, {
        encoding: 'utf8',
        flag: 'a'  // Explicit append flag ensures atomic O_APPEND behavior
      });
      
      // Clear buffer after successful write
      this.buffer = [];
    } catch (error) {
      console.error('[Analytics] Failed to flush buffer:', error);
      // Keep buffer intact on failure for retry on next flush
    }
  }

  /**
   * Record tool execution with timing
   */
  async recordToolExecution<T>(
    toolName: string, 
    operation: () => Promise<T>,
    context?: { 
      searchMode?: string; 
      cacheHit?: boolean; 
      retryCount?: number;
      clientName?: string;
      clientVersion?: string;
      sessionId?: string;
    }
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
        errorType,
        clientName: context?.clientName,
        clientVersion: context?.clientVersion,
        sessionId: context?.sessionId
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

    // Client usage analysis
    const clientStats = new Map<string, {
      count: number;
      totalTime: number;
      toolUsage: Map<string, number>;
    }>();

    periodMetrics.forEach(metric => {
      const clientKey = metric.clientName || 'unknown';
      
      if (!clientStats.has(clientKey)) {
        clientStats.set(clientKey, {
          count: 0,
          totalTime: 0,
          toolUsage: new Map()
        });
      }

      const stats = clientStats.get(clientKey)!;
      stats.count++;
      stats.totalTime += metric.executionTime;
      
      // Track tool usage per client
      stats.toolUsage.set(metric.toolName, (stats.toolUsage.get(metric.toolName) || 0) + 1);
    });

    const topClients = Array.from(clientStats.entries())
      .map(([clientName, stats]) => ({
        clientName,
        usageCount: stats.count,
        averageTime: Math.round(stats.totalTime / stats.count),
        mostUsedTools: Array.from(stats.toolUsage.entries())
          .map(([toolName, count]) => ({ toolName, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      }))
      .sort((a, b) => b.usageCount - a.usageCount);

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
      },
      topClients
    };
  }

  /**
   * Flush metrics to file
   */
  async flush(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      // Flush any buffered metrics first
      this.flushBuffer();

      // For JSONL format, we don't need to rewrite the entire file
      // Metrics are already written via append operations
      // This method now primarily handles cleanup and summary generation
      
      // Archive older metrics in memory, keep recent ones
      const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours
      this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);

      if (this.config.logToConsole) {
        console.log(`[Analytics] Flush complete. ${this.metrics.length} metrics in memory.`);
      }
    } catch (error) {
      console.error('[Analytics] Failed to flush metrics:', error);
    }
  }

  /**
   * Start automatic flushing
   */
  private startAutoFlush(): void {
    if (this.flushTimer) return;

    // Set up timer for buffer flush (500ms for better I/O efficiency)
    // Balances between data safety and performance
    const bufferFlushInterval = 500; // 500ms for buffer flush
    
    this.flushTimer = setInterval(() => {
      // Flush buffer every 500ms
      this.flushBuffer();
      
      // Do full flush periodically for memory cleanup (every 5 minutes)
      if (Date.now() % this.config.flushIntervalMs < bufferFlushInterval) {
        this.flush().catch(error => {
          console.error('[Analytics] Auto-flush failed:', error);
        });
      }
    }, bufferFlushInterval);
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
      },
      topClients: []
    };
  }
}