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
  
  // Instance identification (for multi-instance safety)
  instanceId?: string;       // UUID v4 for unique instance identification
  pid?: number;              // Process ID
  hostname?: string;         // Machine hostname
  sessionStart?: string;     // ISO timestamp when instance started
  
  // Client tracking
  clientName?: string;      // e.g., "claude-desktop", "cursor", "zed"
  clientVersion?: string;   // e.g., "0.1.0"
  sessionId?: string;       // Unique per client session
  
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
  topClients: Array<{
    clientName: string;
    usageCount: number;
    averageTime: number;
    mostUsedTools: Array<{ toolName: string; count: number }>;
  }>;
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
  outputPath: new URL('../../analytics/usage-metrics.jsonl', import.meta.url).pathname,
  slowOperationThresholdMs: 200,
  dashboardPort: parseInt(process.env.ANALYTICS_DASHBOARD_PORT || '19832') // Default to 19832, configurable
};