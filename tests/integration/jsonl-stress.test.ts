/**
 * Stress Testing for JSONL Analytics Implementation (MCP-21)
 * Validates memory usage, data integrity, and performance under load
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

// Simple UUID v4-like generator for testing
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

describe('JSONL Analytics Stress Tests', () => {
  const TEST_DIR = path.join(os.tmpdir(), 'jsonl-stress-test');
  const METRICS_FILE = path.join(TEST_DIR, 'usage-metrics.jsonl');
  
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Memory Usage Tests', () => {
    it('should maintain stable memory usage during continuous writes', () => {
      const iterations = 1000;
      const memoryUsage: number[] = [];
      
      // Baseline memory
      const baselineMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < iterations; i++) {
        const metric = {
          instanceId: uuidv4(),
          timestamp: new Date().toISOString(),
          toolName: `tool-${i % 10}`,
          executionTime: Math.floor(Math.random() * 1000),
          success: Math.random() > 0.1,
          searchResults: Array(10).fill(null).map((_, j) => ({
            title: `Result ${j}`,
            score: Math.random()
          }))
        };
        
        // Append metric
        fs.appendFileSync(METRICS_FILE, JSON.stringify(metric) + '\n');
        
        // Track memory every 100 iterations
        if (i % 100 === 0) {
          const currentMemory = process.memoryUsage().heapUsed;
          memoryUsage.push(currentMemory - baselineMemory);
        }
      }
      
      // Memory growth should be minimal (less than 10MB for 1000 metrics)
      const maxMemoryGrowth = Math.max(...memoryUsage);
      expect(maxMemoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB
      
      // Verify all metrics were written
      const content = fs.readFileSync(METRICS_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      expect(lines.length).toBe(iterations);
    });

    it('should not leak memory when reading large JSONL files', () => {
      // Create large JSONL file
      const largeMetricsCount = 10000;
      for (let i = 0; i < largeMetricsCount; i++) {
        const metric = {
          instanceId: uuidv4(),
          timestamp: new Date().toISOString(),
          sequence: i
        };
        fs.appendFileSync(METRICS_FILE, JSON.stringify(metric) + '\n');
      }
      
      const fileSize = fs.statSync(METRICS_FILE).size;
      expect(fileSize).toBeGreaterThan(100000); // Should be > 100KB
      
      // Baseline memory
      const baselineMemory = process.memoryUsage().heapUsed;
      
      // Read and parse multiple times
      for (let iteration = 0; iteration < 5; iteration++) {
        const content = fs.readFileSync(METRICS_FILE, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        const metrics = [];
        
        for (const line of lines) {
          try {
            metrics.push(JSON.parse(line));
          } catch {
            // Skip malformed lines
          }
        }
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      // Memory should return close to baseline after GC
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - baselineMemory;
      
      // Allow for some overhead, but should be much less than file size * iterations
      expect(memoryGrowth).toBeLessThan(fileSize * 2); // Should not hold all iterations in memory
    });
  });

  describe('Data Integrity Under Load', () => {
    it('should maintain data integrity with 10 concurrent processes', async () => {
      const NUM_PROCESSES = 10;
      const METRICS_PER_PROCESS = 100;
      
      // Create worker script
      const workerScript = path.join(TEST_DIR, 'stress-worker.js');
      const workerCode = `
        const fs = require('fs');
        const metricsFile = process.argv[2];
        const processId = process.argv[3];
        const count = parseInt(process.argv[4]);
        
        for (let i = 0; i < count; i++) {
          const metric = {
            processId: processId,
            sequence: i,
            timestamp: new Date().toISOString(),
            data: 'x'.repeat(100) // Some payload
          };
          
          fs.appendFileSync(metricsFile, JSON.stringify(metric) + '\\n');
          
          // Random small delay to increase contention
          const delay = Math.random() * 2;
          const start = Date.now();
          while (Date.now() - start < delay) {}
        }
      `;
      
      fs.writeFileSync(workerScript, workerCode);
      
      // Launch all processes simultaneously
      const promises = [];
      for (let i = 0; i < NUM_PROCESSES; i++) {
        promises.push(
          new Promise<void>((resolve, reject) => {
            const proc = spawn('node', [
              workerScript,
              METRICS_FILE,
              `process-${i}`,
              METRICS_PER_PROCESS.toString()
            ]);
            
            proc.on('exit', (code) => {
              if (code === 0) resolve();
              else reject(new Error(`Process ${i} failed with code ${code}`));
            });
            
            proc.on('error', reject);
          })
        );
      }
      
      // Wait for all processes
      await Promise.all(promises);
      
      // Verify data integrity
      const content = fs.readFileSync(METRICS_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const metrics = lines.map(l => JSON.parse(l));
      
      // Should have exact count
      expect(metrics.length).toBe(NUM_PROCESSES * METRICS_PER_PROCESS);
      
      // Verify each process wrote all its metrics
      const metricsByProcess = new Map<string, any[]>();
      for (const metric of metrics) {
        if (!metricsByProcess.has(metric.processId)) {
          metricsByProcess.set(metric.processId, []);
        }
        metricsByProcess.get(metric.processId)!.push(metric);
      }
      
      expect(metricsByProcess.size).toBe(NUM_PROCESSES);
      
      for (const [processId, processMetrics] of metricsByProcess) {
        expect(processMetrics.length).toBe(METRICS_PER_PROCESS);
        
        // Verify all sequence numbers present
        const sequences = processMetrics.map(m => m.sequence).sort((a, b) => a - b);
        for (let i = 0; i < METRICS_PER_PROCESS; i++) {
          expect(sequences[i]).toBe(i);
        }
      }
    }, 30000); // 30 second timeout

    it('should handle rapid write bursts without data corruption', async () => {
      const BURST_SIZE = 1000;
      const NUM_BURSTS = 5;
      const DELAY_BETWEEN_BURSTS = 100; // ms
      
      for (let burst = 0; burst < NUM_BURSTS; burst++) {
        // Write a burst of metrics as fast as possible
        const burstStart = Date.now();
        for (let i = 0; i < BURST_SIZE; i++) {
          const metric = {
            burstId: burst,
            sequence: i,
            timestamp: new Date().toISOString()
          };
          
          fs.appendFileSync(METRICS_FILE, JSON.stringify(metric) + '\n');
        }
        const burstDuration = Date.now() - burstStart;
        
        console.log(`Burst ${burst}: ${BURST_SIZE} metrics in ${burstDuration}ms`);
        
        // Wait between bursts
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BURSTS));
      }
      
      // Verify all metrics
      const content = fs.readFileSync(METRICS_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const metrics = lines.map(l => JSON.parse(l));
      
      expect(metrics.length).toBe(BURST_SIZE * NUM_BURSTS);
      
      // Verify burst integrity
      for (let burst = 0; burst < NUM_BURSTS; burst++) {
        const burstMetrics = metrics.filter(m => m.burstId === burst);
        expect(burstMetrics.length).toBe(BURST_SIZE);
        
        const sequences = burstMetrics.map(m => m.sequence).sort((a, b) => a - b);
        for (let i = 0; i < BURST_SIZE; i++) {
          expect(sequences[i]).toBe(i);
        }
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('should achieve > 1000 writes per second', async () => {
      const DURATION_MS = 5000; // 5 second test
      const startTime = Date.now();
      let writeCount = 0;
      
      while (Date.now() - startTime < DURATION_MS) {
        const metric = {
          instanceId: 'perf-test',
          timestamp: new Date().toISOString(),
          sequence: writeCount
        };
        
        fs.appendFileSync(METRICS_FILE, JSON.stringify(metric) + '\n');
        writeCount++;
      }
      
      const actualDuration = Date.now() - startTime;
      const writesPerSecond = (writeCount / actualDuration) * 1000;
      
      console.log(`Performance: ${writeCount} writes in ${actualDuration}ms = ${writesPerSecond.toFixed(0)} writes/sec`);
      
      // Should achieve at least 1000 writes per second
      expect(writesPerSecond).toBeGreaterThan(1000);
      
      // Verify all writes succeeded
      const content = fs.readFileSync(METRICS_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      expect(lines.length).toBe(writeCount);
    });

    it('should handle mixed read/write operations efficiently', async () => {
      // Pre-populate with some data
      for (let i = 0; i < 100; i++) {
        fs.appendFileSync(METRICS_FILE, JSON.stringify({ initial: i }) + '\n');
      }
      
      const operations: Array<{ type: 'read' | 'write', duration: number }> = [];
      const NUM_OPERATIONS = 500;
      
      for (let i = 0; i < NUM_OPERATIONS; i++) {
        const isRead = Math.random() > 0.7; // 30% reads, 70% writes
        
        const startOp = process.hrtime.bigint();
        
        if (isRead) {
          // Read operation
          const content = fs.readFileSync(METRICS_FILE, 'utf8');
          const lines = content.split('\n').filter(l => l.trim());
          // Parse a few lines to simulate real usage
          for (let j = 0; j < Math.min(10, lines.length); j++) {
            try {
              JSON.parse(lines[j]);
            } catch {}
          }
        } else {
          // Write operation
          const metric = {
            operation: i,
            timestamp: new Date().toISOString()
          };
          fs.appendFileSync(METRICS_FILE, JSON.stringify(metric) + '\n');
        }
        
        const endOp = process.hrtime.bigint();
        const durationMs = Number(endOp - startOp) / 1_000_000;
        
        operations.push({
          type: isRead ? 'read' : 'write',
          duration: durationMs
        });
      }
      
      // Calculate statistics
      const readOps = operations.filter(op => op.type === 'read');
      const writeOps = operations.filter(op => op.type === 'write');
      
      const avgReadTime = readOps.reduce((sum, op) => sum + op.duration, 0) / readOps.length;
      const avgWriteTime = writeOps.reduce((sum, op) => sum + op.duration, 0) / writeOps.length;
      
      console.log(`Mixed operations: ${readOps.length} reads (avg ${avgReadTime.toFixed(2)}ms), ${writeOps.length} writes (avg ${avgWriteTime.toFixed(2)}ms)`);
      
      // Both operations should be reasonably fast
      expect(avgReadTime).toBeLessThan(50); // Reads under 50ms average
      expect(avgWriteTime).toBeLessThan(10); // Writes under 10ms average
    });
  });

  describe('Error Recovery', () => {
    it('should recover from corrupted JSONL files', () => {
      // Create a file with mixed valid and invalid lines
      const corruptedContent = [
        '{"valid": 1}',
        '{"valid": 2',  // Missing closing brace
        'not json at all',
        '{"valid": 3}',
        '{"partial": "data", "missing',  // Truncated
        '{"valid": 4}',
        '', // Empty line
        '   ', // Whitespace
        '{"valid": 5}'
      ].join('\n');
      
      fs.writeFileSync(METRICS_FILE, corruptedContent);
      
      // Try to read and parse
      const content = fs.readFileSync(METRICS_FILE, 'utf8');
      const lines = content.split('\n');
      const validMetrics = [];
      const errors = [];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          validMetrics.push(JSON.parse(line));
        } catch (error) {
          errors.push({ line: line.substring(0, 50), error });
        }
      }
      
      // Should recover valid metrics
      expect(validMetrics.length).toBe(5);
      expect(validMetrics.map(m => m.valid)).toEqual([1, 3, 4, 5]);
      
      // Should track errors
      expect(errors.length).toBe(3);
      
      // Should be able to append new metrics after corruption
      const newMetric = { valid: 6 };
      fs.appendFileSync(METRICS_FILE, '\n' + JSON.stringify(newMetric) + '\n');
      
      // Re-read and verify new metric
      const updatedContent = fs.readFileSync(METRICS_FILE, 'utf8');
      const allLines = updatedContent.split('\n').filter(l => l.trim());
      const lastLine = allLines[allLines.length - 1];
      const lastMetric = JSON.parse(lastLine);
      expect(lastMetric.valid).toBe(6);
    });

    it('should handle file system errors gracefully', () => {
      const readOnlyDir = path.join(TEST_DIR, 'readonly');
      fs.mkdirSync(readOnlyDir);
      const readOnlyFile = path.join(readOnlyDir, 'metrics.jsonl');
      
      // Create and make read-only
      fs.writeFileSync(readOnlyFile, '{"initial": true}\n');
      fs.chmodSync(readOnlyFile, 0o444);
      
      // Attempt to append (should fail gracefully)
      let writeError: Error | null = null;
      try {
        fs.appendFileSync(readOnlyFile, '{"test": 1}\n');
      } catch (error) {
        writeError = error as Error;
      }
      
      // Should have gotten an error
      expect(writeError).not.toBeNull();
      
      // Restore permissions for cleanup
      fs.chmodSync(readOnlyFile, 0o644);
      
      // Should still be able to read the file
      const content = fs.readFileSync(readOnlyFile, 'utf8');
      const metric = JSON.parse(content.trim());
      expect(metric.initial).toBe(true);
    });
  });
});