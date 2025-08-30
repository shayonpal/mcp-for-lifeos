/**
 * Test Contracts for Analytics Multi-Instance Safety (MCP-4)
 * These contracts define the expected behavior for concurrent analytics operations
 */

// Core Analytics Safety Contract
export interface AnalyticsSafetyContract {
  concurrency: {
    maxInstances: 34; // Support up to 34 concurrent MCP instances
    lockMechanism: "fs.appendFileSync" | "proper-lockfile";
    dataIntegrity: "zero_loss";
    conflictResolution: "append_only";
  };
  
  performance: {
    lockAcquisitionTimeMs: 100; // P99 < 100ms
    flushIntervalMs: 100; // Buffer flush every 100ms
    maxLatencyIncreasePercent: 5; // < 5% performance impact
  };
  
  validation: {
    noDataLoss: boolean; // All metrics captured
    noCorruption: boolean; // No interleaved writes
    backwardCompatible: boolean; // Dashboard still works
  };
}

// Instance Identification Contract
export interface InstanceIdentificationContract {
  required: {
    instanceId: string; // UUID v4
    pid: number; // Process ID
    hostname: string; // Machine hostname
    sessionStart: string; // ISO timestamp
  };
  
  optional: {
    clientName?: string; // "Claude Desktop", "Cursor", etc.
    clientVersion?: string; // Client version string
    nodeVersion?: string; // Node.js version
    platform?: string; // "darwin", "win32", "linux"
  };
  
  validation: {
    uniqueInstanceId: boolean; // Each instance has unique ID
    persistentAcrossSession: boolean; // ID remains same for session
    includedInEveryMetric: boolean; // All metrics have instance data
  };
}

// JSONL Format Contract
export interface JSONLFormatContract {
  structure: {
    format: "jsonl"; // Newline-delimited JSON
    encoding: "utf8";
    lineDelimiter: "\n";
    atomicWrite: boolean; // Each line written atomically
  };
  
  metricLine: {
    // Each line is a complete JSON object
    instanceId: string;
    timestamp: string; // ISO 8601
    toolName: string;
    executionTime: number;
    success: boolean;
    [key: string]: any; // Additional metric data
  };
  
  operations: {
    append: "fs.appendFileSync" | "fs.writeSync";
    read: "readline" | "split('\\n')";
    errorHandling: "skip_invalid_lines";
  };
}

// File Operations Contract
export interface FileOperationsContract {
  writePattern: {
    mode: "append_only";
    buffering: boolean; // Buffer writes for efficiency
    flushTriggers: ["interval", "buffer_size", "process_exit"];
    atomicity: "per_flush"; // Each flush is atomic
  };
  
  lockStrategy: {
    type: "lock_free"; // Using O_APPEND flag
    fallback: "retry_with_backoff";
    staleDetection: boolean; // Detect and handle stale locks
  };
  
  fileManagement: {
    filename: "usage-metrics.jsonl";
    rotation: "daily" | "size_based" | "none";
    compression: boolean; // Compress old files
    backup: boolean; // Backup before migration
  };
}

// Dashboard Compatibility Contract
export interface DashboardCompatibilityContract {
  readStrategy: {
    format: "jsonl" | "legacy_json"; // Support both formats
    parsing: "line_by_line"; // Parse each line independently
    errorHandling: "skip_malformed"; // Skip invalid lines
  };
  
  aggregation: {
    mergeInstances: boolean; // Combine metrics from all instances
    groupByClient: boolean; // Group by client name
    timeWindows: ["realtime", "hourly", "daily"];
  };
  
  visualization: {
    showInstanceCount: boolean; // Display active instances
    showClientBreakdown: boolean; // Show metrics by client
    maintainExistingCharts: boolean; // Keep current visualizations
  };
}

// Testing Contract
export interface ConcurrentTestingContract {
  scenarios: {
    simultaneousWrites: {
      instances: 3; // Test with 3 concurrent instances
      duration: 60; // Run for 60 seconds
      metricsPerSecond: 10; // Each instance generates 10 metrics/sec
    };
    
    crashRecovery: {
      simulateCrash: boolean; // Kill process mid-write
      verifyRecovery: boolean; // Check data integrity after crash
      validatePartialWrites: boolean; // Handle incomplete lines
    };
    
    performance: {
      measureLatency: boolean; // Track write latencies
      checkThroughput: boolean; // Verify metrics/second
      monitorCPU: boolean; // CPU usage should stay low
    };
  };
  
  validation: {
    expectedMetrics: number; // instances * duration * metricsPerSecond
    actualMetrics: number; // Count from JSONL file
    lostMetrics: 0; // Must be zero
    corruptedLines: 0; // Must be zero
  };
}

// Migration Contract
export interface MigrationContract {
  process: {
    backupExisting: boolean; // Save current usage-metrics.json
    convertToJSONL: boolean; // Transform to new format
    preserveHistory: boolean; // Keep historical data
    rollbackCapability: boolean; // Can revert if needed
  };
  
  compatibility: {
    dualFormatSupport: boolean; // Dashboard reads both formats
    gracefulTransition: boolean; // No downtime during migration
    dataLossAcceptable: boolean; // User confirmed OK with data loss
  };
}

// Client Identification Fix Contract
export interface ClientIdentificationContract {
  detection: {
    primary: "server.getClientVersion()"; // MCP protocol method
    fallback: "process.env.MCP_CLIENT_NAME"; // Environment variable
    debug: "extensive_logging"; // Debug why it shows "unknown"
  };
  
  validation: {
    notUnknown: boolean; // Should not show "unknown"
    accurateClientName: boolean; // Correct client identified
    persistentAcrossSession: boolean; // Same client throughout session
  };
}

// Overall Implementation Contract
export interface AnalyticsImplementationContract {
  safety: AnalyticsSafetyContract;
  identification: InstanceIdentificationContract;
  format: JSONLFormatContract;
  fileOps: FileOperationsContract;
  dashboard: DashboardCompatibilityContract;
  testing: ConcurrentTestingContract;
  migration: MigrationContract;
  clientFix: ClientIdentificationContract;
  
  verticalSlices: {
    slice1: "basic_jsonl_append"; // Fix data loss immediately
    slice2: "fix_client_identification"; // Debug unknown client
    slice3: "add_instance_identification"; // Add UUID, pid, hostname
    slice4: "implement_buffered_writes"; // 100ms flush interval
    slice5: "update_dashboard_jsonl"; // Parse new format
    slice6: "concurrent_testing_suite"; // Validate with 3 instances
    slice7: "pm2_integration"; // Auto-start dashboard
    slice8: "migration_cleanup"; // Backup and document
  };
  
  timeline: {
    core: "slices_1_to_3"; // Core fix
    polish: "slices_4_to_6"; // Performance and testing
    optional: "slices_7_to_8"; // Nice to have
  };
}