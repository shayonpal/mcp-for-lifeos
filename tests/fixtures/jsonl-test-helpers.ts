/**
 * Test Fixtures and Helper Functions for JSONL Analytics Testing (MCP-21)
 * Provides reusable test data and utilities for unit and integration tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// Simple UUID v4-like generator for testing
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Sample metric data for testing
 */
export const SAMPLE_METRICS = {
  search: {
    instanceId: uuidv4(),
    pid: process.pid,
    hostname: os.hostname(),
    timestamp: '2025-01-30T12:00:00Z',
    toolName: 'search',
    executionTime: 150,
    success: true,
    searchMode: 'full-text',
    resultCount: 5
  },
  
  createNote: {
    instanceId: uuidv4(),
    pid: process.pid,
    hostname: os.hostname(),
    timestamp: '2025-01-30T12:01:00Z',
    toolName: 'create_note_smart',
    executionTime: 200,
    success: true,
    noteType: 'daily',
    templateUsed: 'daily-note.md'
  },
  
  list: {
    instanceId: uuidv4(),
    pid: process.pid,
    hostname: os.hostname(),
    timestamp: '2025-01-30T12:02:00Z',
    toolName: 'list',
    executionTime: 75,
    success: true,
    itemCount: 10
  },
  
  error: {
    instanceId: uuidv4(),
    pid: process.pid,
    hostname: os.hostname(),
    timestamp: '2025-01-30T12:03:00Z',
    toolName: 'insert_content',
    executionTime: 50,
    success: false,
    errorType: 'FILE_NOT_FOUND',
    errorMessage: 'Target file does not exist'
  }
};

/**
 * Sample JSONL content with various scenarios
 */
export const SAMPLE_JSONL_CONTENT = {
  valid: [
    JSON.stringify(SAMPLE_METRICS.search),
    JSON.stringify(SAMPLE_METRICS.createNote),
    JSON.stringify(SAMPLE_METRICS.list)
  ].join('\n') + '\n',
  
  withMalformed: [
    JSON.stringify(SAMPLE_METRICS.search),
    '{ "broken": "json',  // Malformed line
    JSON.stringify(SAMPLE_METRICS.createNote),
    '',  // Empty line
    JSON.stringify(SAMPLE_METRICS.list),
    '   ',  // Whitespace line
    JSON.stringify(SAMPLE_METRICS.error)
  ].join('\n') + '\n',
  
  partialWrite: [
    JSON.stringify(SAMPLE_METRICS.search),
    JSON.stringify(SAMPLE_METRICS.createNote),
    '{"toolName":"list","timestamp":"2025-01-30T12:02:00Z","execu'  // Incomplete
  ].join('\n'),
  
  empty: '',
  
  singleLine: JSON.stringify(SAMPLE_METRICS.search) + '\n'
};

/**
 * Sample legacy JSON format for migration testing
 */
export const SAMPLE_JSON_CONTENT = {
  version: '1.0.0',
  lastUpdated: '2025-01-30T11:00:00Z',
  metrics: [
    {
      toolName: 'search',
      timestamp: '2025-01-30T10:00:00Z',
      executionTime: 100,
      success: true
    },
    {
      toolName: 'create_note',
      timestamp: '2025-01-30T10:30:00Z',
      executionTime: 250,
      success: true
    }
  ],
  summary: {
    totalCalls: 2,
    averageExecutionTime: 175,
    successRate: 1.0
  }
};

/**
 * Helper class for JSONL file operations
 */
export class JSONLTestHelper {
  private filepath: string;
  
  constructor(filepath: string) {
    this.filepath = filepath;
  }
  
  /**
   * Append a metric to the JSONL file atomically
   */
  appendMetric(metric: any): void {
    fs.appendFileSync(this.filepath, JSON.stringify(metric) + '\n', {
      encoding: 'utf8',
      flag: 'a'
    });
  }
  
  /**
   * Append multiple metrics
   */
  appendMetrics(metrics: any[]): void {
    for (const metric of metrics) {
      this.appendMetric(metric);
    }
  }
  
  /**
   * Read and parse JSONL file, skipping malformed lines
   */
  readMetrics(): any[] {
    if (!fs.existsSync(this.filepath)) {
      return [];
    }
    
    const content = fs.readFileSync(this.filepath, 'utf8');
    const metrics = [];
    const errors = [];
    
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      try {
        metrics.push(JSON.parse(trimmed));
      } catch (error) {
        errors.push({ line: trimmed, error });
      }
    }
    
    if (errors.length > 0) {
      console.warn(`Skipped ${errors.length} malformed lines`);
    }
    
    return metrics;
  }
  
  /**
   * Count total lines (including malformed)
   */
  countLines(): number {
    if (!fs.existsSync(this.filepath)) {
      return 0;
    }
    
    const content = fs.readFileSync(this.filepath, 'utf8');
    return content.split('\n').filter(l => l.trim()).length;
  }
  
  /**
   * Get file size in bytes
   */
  getFileSize(): number {
    if (!fs.existsSync(this.filepath)) {
      return 0;
    }
    
    return fs.statSync(this.filepath).size;
  }
  
  /**
   * Clear the file
   */
  clear(): void {
    if (fs.existsSync(this.filepath)) {
      fs.unlinkSync(this.filepath);
    }
  }
  
  /**
   * Validate JSONL format compliance
   */
  validateFormat(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!fs.existsSync(this.filepath)) {
      return { valid: true, errors: [] };
    }
    
    const content = fs.readFileSync(this.filepath, 'utf8');
    const lines = content.split('\n');
    
    // Check for proper line endings
    if (content.includes('\r\n')) {
      errors.push('File contains Windows line endings (\\r\\n), should use Unix (\\n)');
    }
    
    // Check each line
    lines.forEach((line, index) => {
      if (line === '' && index === lines.length - 1) {
        // Last line can be empty (trailing newline)
        return;
      }
      
      if (line.trim() === '' && line !== '') {
        errors.push(`Line ${index + 1} contains whitespace`);
      }
      
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line);
          
          // Check for multi-line JSON (should be compact)
          if (line.includes('\n') || line.includes('  ')) {
            errors.push(`Line ${index + 1} appears to be formatted/multi-line JSON`);
          }
        } catch (error) {
          errors.push(`Line ${index + 1} is not valid JSON: ${error}`);
        }
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Helper to create mock instance metrics
 */
export function createMockInstanceMetrics(
  instanceId: string,
  count: number,
  options: {
    includeErrors?: boolean;
    includeLargePayloads?: boolean;
    baseTimestamp?: Date;
  } = {}
): any[] {
  const metrics = [];
  const baseTime = options.baseTimestamp || new Date();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(baseTime.getTime() + i * 1000);
    
    const metric: any = {
      instanceId,
      pid: process.pid,
      hostname: os.hostname(),
      timestamp: timestamp.toISOString(),
      toolName: ['search', 'create_note_smart', 'list', 'insert_content'][i % 4],
      executionTime: Math.floor(Math.random() * 500),
      success: options.includeErrors ? Math.random() > 0.1 : true,
      sequence: i
    };
    
    // Add error details if failed
    if (!metric.success) {
      metric.errorType = ['VALIDATION_ERROR', 'FILE_NOT_FOUND', 'PERMISSION_DENIED'][i % 3];
      metric.errorMessage = `Mock error ${i}`;
    }
    
    // Add large payload if requested
    if (options.includeLargePayloads && i % 10 === 0) {
      metric.largeData = {
        results: Array(100).fill(null).map((_, j) => ({
          id: `result-${j}`,
          content: 'x'.repeat(50)
        }))
      };
    }
    
    metrics.push(metric);
  }
  
  return metrics;
}

/**
 * Helper to simulate concurrent writes
 */
export async function simulateConcurrentWrites(
  filepath: string,
  numInstances: number,
  metricsPerInstance: number,
  delayMs: number = 0
): Promise<Map<string, any[]>> {
  const allMetrics = new Map<string, any[]>();
  const promises = [];
  
  for (let i = 0; i < numInstances; i++) {
    const instanceId = `instance-${i}`;
    const metrics = createMockInstanceMetrics(instanceId, metricsPerInstance);
    allMetrics.set(instanceId, metrics);
    
    // Simulate concurrent writes with random delays
    const promise = (async () => {
      for (const metric of metrics) {
        fs.appendFileSync(filepath, JSON.stringify(metric) + '\n', {
          encoding: 'utf8',
          flag: 'a'
        });
        
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * delayMs));
        }
      }
    })();
    
    promises.push(promise);
  }
  
  await Promise.all(promises);
  return allMetrics;
}

/**
 * Helper to verify data integrity after concurrent writes
 */
export function verifyDataIntegrity(
  filepath: string,
  expectedMetrics: Map<string, any[]>
): {
  success: boolean;
  totalExpected: number;
  totalFound: number;
  missingMetrics: any[];
  duplicateMetrics: any[];
  malformedLines: number;
} {
  const helper = new JSONLTestHelper(filepath);
  const actualMetrics = helper.readMetrics();
  const totalLines = helper.countLines();
  
  // Group actual metrics by instance
  const actualByInstance = new Map<string, any[]>();
  for (const metric of actualMetrics) {
    if (!actualByInstance.has(metric.instanceId)) {
      actualByInstance.set(metric.instanceId, []);
    }
    actualByInstance.get(metric.instanceId)!.push(metric);
  }
  
  // Find missing and duplicate metrics
  const missingMetrics: any[] = [];
  const duplicateMetrics: any[] = [];
  let totalExpected = 0;
  
  for (const [instanceId, expected] of expectedMetrics) {
    totalExpected += expected.length;
    const actual = actualByInstance.get(instanceId) || [];
    
    // Check for missing metrics (by sequence number)
    const actualSequences = new Set(actual.map(m => m.sequence));
    for (const metric of expected) {
      if (!actualSequences.has(metric.sequence)) {
        missingMetrics.push(metric);
      }
    }
    
    // Check for duplicates
    const sequenceCounts = new Map<number, number>();
    for (const metric of actual) {
      const count = (sequenceCounts.get(metric.sequence) || 0) + 1;
      sequenceCounts.set(metric.sequence, count);
      
      if (count > 1) {
        duplicateMetrics.push(metric);
      }
    }
  }
  
  return {
    success: missingMetrics.length === 0 && duplicateMetrics.length === 0,
    totalExpected,
    totalFound: actualMetrics.length,
    missingMetrics,
    duplicateMetrics,
    malformedLines: totalLines - actualMetrics.length
  };
}

/**
 * Helper to create test directory structure
 */
export function createTestEnvironment(): {
  dir: string;
  metricsFile: string;
  legacyFile: string;
  cleanup: () => void;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonl-test-'));
  const metricsFile = path.join(dir, 'usage-metrics.jsonl');
  const legacyFile = path.join(dir, 'usage-metrics.json');
  
  return {
    dir,
    metricsFile,
    legacyFile,
    cleanup: () => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  };
}

/**
 * Performance measurement helper
 */
export class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();
  
  measure<T>(name: string, fn: () => T): T {
    const start = process.hrtime.bigint();
    const result = fn();
    const end = process.hrtime.bigint();
    
    const durationMs = Number(end - start) / 1_000_000;
    
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(durationMs);
    
    return result;
  }
  
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    
    const durationMs = Number(end - start) / 1_000_000;
    
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(durationMs);
    
    return result;
  }
  
  getStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }
    
    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.length;
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = sorted.reduce((a, b) => a + b, 0) / count;
    const p95 = sorted[Math.floor(count * 0.95)];
    const p99 = sorted[Math.floor(count * 0.99)];
    
    return { count, min, max, avg, p95, p99 };
  }
  
  getAllStats(): Map<string, ReturnType<typeof this.getStats>> {
    const stats = new Map();
    for (const [name] of this.measurements) {
      stats.set(name, this.getStats(name));
    }
    return stats;
  }
  
  reset(): void {
    this.measurements.clear();
  }
}