/**
 * Test Contracts for JSONL Analytics Implementation (MCP-21)
 * Defines expected behavior for append-only analytics operations
 */

// Core JSONL Analytics Contract
export interface JSONLAnalyticsContract {
  format: {
    type: "jsonl"; // Newline-delimited JSON
    encoding: "utf8";
    lineDelimiter: "\n";
    atomicAppend: true; // Each line written atomically
  };
  
  operations: {
    write: "fs.appendFileSync"; // Atomic append operation
    read: "line-by-line"; // Parse each line independently
    migration: "support-both-formats"; // JSON and JSONL during transition
  };
  
  concurrency: {
    maxInstances: 34; // Support up to 34 concurrent MCP instances
    writeConflicts: "none"; // O_APPEND flag prevents conflicts
    dataLoss: "zero"; // No metrics lost
  };
}

// Instance Identification Contract
export interface InstanceMetricsContract {
  required: {
    instanceId: string; // UUID v4 for unique identification
    pid: number; // Process ID
    hostname: string; // Machine hostname
    sessionStart: string; // ISO timestamp when instance started
  };
  
  perMetric: {
    timestamp: Date; // When metric was recorded
    toolName: string; // Tool that was executed
    executionTime: number; // Milliseconds
    success: boolean; // Operation succeeded
  };
  
  optional: {
    clientName?: string; // "Claude Desktop", "Cursor", etc.
    clientVersion?: string; // Client version
    searchMode?: string; // For search tools
    errorType?: string; // Error classification
    resultCount?: number; // Results returned
  };
}

// File Operations Contract
export interface FileOperationsContract {
  append: {
    method: "fs.appendFileSync";
    flags: "a"; // O_APPEND flag for atomic append
    encoding: "utf8";
    maxLineSize: 4096; // Stay under PIPE_BUF for atomicity
  };
  
  read: {
    method: "readline" | "split('\\n')";
    errorHandling: "skip-malformed-lines";
    validation: "per-line-json-parse";
  };
  
  migration: {
    oldFormat: "usage-metrics.json"; // Existing JSON file
    newFormat: "usage-metrics.jsonl"; // New JSONL file
    supportBoth: true; // Read both during transition
    autoDetect: "by-extension"; // .json vs .jsonl
  };
}

// Performance Contract
export interface PerformanceContract {
  latency: {
    appendOperation: "< 5ms"; // Per metric write
    totalImpact: "< 5%"; // Overall performance impact
  };
  
  buffering: {
    strategy: "hybrid"; // Immediate for critical, buffered for regular
    flushInterval: 100; // Milliseconds
    bufferSize: 100; // Max metrics before flush
  };
  
  fileSize: {
    rotation: "future-enhancement"; // MCP-28 will handle
    monitoring: "track-file-growth";
  };
}

// Testing Contract
export interface TestingContract {
  unitTests: {
    appendOperation: "verify-atomic-writes";
    lineFormat: "validate-jsonl-structure";
    instanceId: "ensure-uniqueness";
    errorHandling: "malformed-line-recovery";
  };
  
  integrationTests: {
    concurrentWrites: {
      instances: 3; // Test with 3 concurrent processes
      duration: 10; // Seconds
      metricsPerInstance: 100; // Total metrics to write
      validation: "zero-data-loss";
    };
    
    formatMigration: {
      readOldFormat: "parse-existing-json";
      writeNewFormat: "append-jsonl";
      compatibility: "both-formats-supported";
    };
  };
  
  edgeCases: {
    processCrash: "partial-line-handling";
    diskFull: "graceful-error";
    permissions: "error-logging";
    largeLine: "truncation-handling";
  };
}

// Acceptance Criteria Contract
export interface AcceptanceCriteriaContract {
  dataIntegrity: {
    noDataLoss: boolean; // Must be true
    allMetricsRecorded: boolean; // Must be true
    lineAtomicity: boolean; // Must be true
  };
  
  formatCompliance: {
    validJSONL: boolean; // Each line is valid JSON
    oneMetricPerLine: boolean; // No multi-line metrics
    properDelimiters: boolean; // \n between lines
  };
  
  performance: {
    latencyAcceptable: boolean; // < 5ms per write
    concurrencySupported: boolean; // 3+ instances work
    noDeadlocks: boolean; // No lock contention
  };
  
  compatibility: {
    existingDataPreserved: boolean; // Can read old JSON
    dashboardCompatible: boolean; // Dashboard can parse JSONL
    backwardCompatible: boolean; // Metric structure unchanged
  };
}

// Implementation Validation Contract
export interface ImplementationValidationContract {
  codeChanges: {
    analyticsCollector: {
      file: "src/analytics/analytics-collector.ts";
      methods: ["flush", "recordUsage", "loadExistingMetrics"];
      additions: ["instanceId", "appendMetric"];
    };
    
    usageMetrics: {
      file: "src/analytics/usage-metrics.ts";
      additions: ["instanceId", "pid", "hostname"];
    };
  };
  
  testCoverage: {
    unit: ["append-operations", "jsonl-parsing", "instance-id"];
    integration: ["concurrent-writes", "format-migration"];
    manual: ["multi-instance-verification"];
  };
  
  documentation: {
    readme: "analytics/README.md";
    updates: ["jsonl-format", "migration-guide", "multi-instance"];
  };
}

// Overall MCP-21 Contract
export interface MCP21Contract {
  issue: {
    id: "MCP-21";
    title: "Implement basic JSONL append-only operations";
    priority: "Urgent";
    timeEstimate: "1 hour";
  };
  
  analytics: JSONLAnalyticsContract;
  metrics: InstanceMetricsContract;
  fileOps: FileOperationsContract;
  performance: PerformanceContract;
  testing: TestingContract;
  acceptance: AcceptanceCriteriaContract;
  validation: ImplementationValidationContract;
  
  success: {
    dataLossFixed: boolean; // Primary goal
    concurrencyEnabled: boolean; // 34+ instances
    performanceAcceptable: boolean; // < 5% impact
    backwardCompatible: boolean; // Existing data readable
  };
}