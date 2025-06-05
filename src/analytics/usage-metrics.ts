/**
 * Usage Metrics Types and Interfaces
 * 
 * Lightweight telemetry for personal development insights
 * @see https://github.com/shayonpal/mcp-for-lifeos/issues/76
 */

export interface UsageMetrics {
  toolName: string;
  executionTime: number;
  cacheHit?: boolean;
  retryCount?: number;
  success: boolean;
  timestamp: Date;
  
  // Additional context
  searchMode?: string;
  resultCount?: number;
  routingDecision?: string;
  errorType?: string;
}

export interface AnalyticsSummary {
  period: {
    start: Date;
    end: Date;
  };
  totalExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  topTools: Array<{
    toolName: string;
    usageCount: number;
    averageTime: number;
    successRate: number;
  }>;
  routingAccuracy: {
    autoModeDetections: number;
    fallbacksTriggered: number;
    accuracy: number;
  };
  performance: {
    cacheHitRate: number;
    averageRetries: number;
    slowOperations: number; // Operations > 200ms
  };
  trends: {
    dailyUsage: Record<string, number>;
    hourlyDistribution: Record<string, number>;
  };
}

export interface AnalyticsConfig {
  enabled: boolean;
  maxMetricsInMemory: number;
  flushIntervalMs: number;
  logToConsole: boolean;
  logToFile: boolean;
  outputPath: string;
  slowOperationThresholdMs: number;
  dashboardPort: number;
}

export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  // Default enabled for personal development insights
  // Disable with: DISABLE_USAGE_ANALYTICS=true
  enabled: process.env.DISABLE_USAGE_ANALYTICS !== 'true',
  maxMetricsInMemory: 1000,
  flushIntervalMs: 5 * 60 * 1000, // 5 minutes
  logToConsole: false,
  logToFile: true,
  outputPath: './analytics/usage-metrics.json',
  slowOperationThresholdMs: 200,
  dashboardPort: parseInt(process.env.ANALYTICS_DASHBOARD_PORT || '19832') // Default to 19832, configurable
};