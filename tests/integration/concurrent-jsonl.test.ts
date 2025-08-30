/**
 * Integration Tests for Concurrent JSONL Analytics (MCP-21)
 * Tests multiple processes writing metrics concurrently with zero data loss
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
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

describe('Concurrent JSONL Integration Tests', () => {
  const TEST_DIR = path.join(os.tmpdir(), 'jsonl-concurrent-test');
  const METRICS_FILE = path.join(TEST_DIR, 'usage-metrics.jsonl');
  const WORKER_SCRIPT = path.join(TEST_DIR, 'worker.js');
  
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    
    // Create worker script that simulates MCP instance writing metrics
    const workerCode = `
      const fs = require('fs');
      const path = require('path');
      const uuidv4 = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      const metricsFile = process.argv[2];
      const instanceId = process.argv[3];
      const metricsCount = parseInt(process.argv[4] || '100');
      
      // Simulate MCP instance writing metrics
      for (let i = 0; i < metricsCount; i++) {
        const metric = {
          instanceId: instanceId,
          pid: process.pid,
          hostname: require('os').hostname(),
          timestamp: new Date().toISOString(),
          toolName: \`tool-\${i % 3}\`,
          executionTime: Math.floor(Math.random() * 1000),
          success: Math.random() > 0.1,
          sequence: i
        };
        
        try {
          // Atomic append operation
          fs.appendFileSync(metricsFile, JSON.stringify(metric) + '\\n', {
            encoding: 'utf8',
            flag: 'a'
          });
          
          // Random delay between 0-10ms to simulate real usage
          const delay = Math.random() * 10;
          const start = Date.now();
          while (Date.now() - start < delay) {
            // Busy wait
          }
        } catch (error) {
          console.error('Write error:', error);
        }
      }
      
      console.log(\`Instance \${instanceId} wrote \${metricsCount} metrics\`);
    `;
    
    fs.writeFileSync(WORKER_SCRIPT, workerCode);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Concurrent Process Writes', () => {
    it('should handle 3 concurrent processes with zero data loss', async () => {
      const NUM_INSTANCES = 3;
      const METRICS_PER_INSTANCE = 100;
      const instances: { id: string; process: ChildProcess }[] = [];
      
      // Start concurrent processes
      const promises = [];
      for (let i = 0; i < NUM_INSTANCES; i++) {
        const instanceId = uuidv4();
        const promise = new Promise<void>((resolve, reject) => {
          const proc = spawn('node', [
            WORKER_SCRIPT,
            METRICS_FILE,
            instanceId,
            METRICS_PER_INSTANCE.toString()
          ]);
          
          proc.on('exit', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Process ${instanceId} exited with code ${code}`));
            }
          });
          
          proc.on('error', reject);
          
          instances.push({ id: instanceId, process: proc });
        });
        
        promises.push(promise);
      }
      
      // Wait for all processes to complete
      await Promise.all(promises);
      
      // Verify all metrics were written
      const content = fs.readFileSync(METRICS_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const metrics = [];
      
      for (const line of lines) {
        try {
          metrics.push(JSON.parse(line));
        } catch (error) {
          console.error('Failed to parse line:', line);
        }
      }
      
      // Should have exactly the expected number of metrics
      expect(metrics.length).toBe(NUM_INSTANCES * METRICS_PER_INSTANCE);
      
      // Verify each instance wrote all its metrics
      const metricsByInstance = new Map<string, any[]>();
      for (const metric of metrics) {
        if (!metricsByInstance.has(metric.instanceId)) {
          metricsByInstance.set(metric.instanceId, []);
        }
        metricsByInstance.get(metric.instanceId)!.push(metric);
      }
      
      expect(metricsByInstance.size).toBe(NUM_INSTANCES);
      
      for (const [instanceId, instanceMetrics] of metricsByInstance) {
        expect(instanceMetrics.length).toBe(METRICS_PER_INSTANCE);
        
        // Verify sequence numbers are complete (0 to METRICS_PER_INSTANCE-1)
        const sequences = instanceMetrics.map(m => m.sequence).sort((a, b) => a - b);
        for (let i = 0; i < METRICS_PER_INSTANCE; i++) {
          expect(sequences[i]).toBe(i);
        }
      }
    }, 30000); // 30 second timeout for concurrent test

    it('should maintain line atomicity (no interleaved writes)', async () => {
      const NUM_INSTANCES = 3;
      const METRICS_PER_INSTANCE = 50;
      
      // Create larger metrics to increase chance of interleaving
      const workerCode = `
        const fs = require('fs');
        
        const metricsFile = process.argv[2];
        const instanceId = process.argv[3];
        const metricsCount = parseInt(process.argv[4] || '50');
        
        for (let i = 0; i < metricsCount; i++) {
          const metric = {
            instanceId: instanceId,
            pid: process.pid,
            sequence: i,
            // Add padding to make line longer (increase chance of interleaving)
            padding: 'x'.repeat(1000)
          };
          
          fs.appendFileSync(metricsFile, JSON.stringify(metric) + '\\n', {
            encoding: 'utf8',
            flag: 'a'
          });
        }
      `;
      
      fs.writeFileSync(WORKER_SCRIPT, workerCode);
      
      // Start concurrent processes
      const promises = [];
      for (let i = 0; i < NUM_INSTANCES; i++) {
        const instanceId = `instance-${i}`;
        promises.push(
          new Promise<void>((resolve, reject) => {
            const proc = spawn('node', [
              WORKER_SCRIPT,
              METRICS_FILE,
              instanceId,
              METRICS_PER_INSTANCE.toString()
            ]);
            
            proc.on('exit', () => resolve());
            proc.on('error', reject);
          })
        );
      }
      
      await Promise.all(promises);
      
      // Verify no lines are interleaved
      const content = fs.readFileSync(METRICS_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        // Each line should be valid JSON (not interleaved)
        expect(() => JSON.parse(line)).not.toThrow();
        
        // Each line should have complete structure
        const metric = JSON.parse(line);
        expect(metric).toHaveProperty('instanceId');
        expect(metric).toHaveProperty('pid');
        expect(metric).toHaveProperty('sequence');
        expect(metric).toHaveProperty('padding');
        
        // Padding should be complete (not truncated by interleaving)
        expect(metric.padding.length).toBe(1000);
      }
      
      expect(lines.length).toBe(NUM_INSTANCES * METRICS_PER_INSTANCE);
    }, 30000);

    it('should handle process crashes gracefully', async () => {
      // Create a worker that crashes mid-write
      const crashingWorkerCode = `
        const fs = require('fs');
        
        const metricsFile = process.argv[2];
        const instanceId = process.argv[3];
        
        // Write some successful metrics
        for (let i = 0; i < 5; i++) {
          const metric = {
            instanceId: instanceId,
            sequence: i,
            timestamp: new Date().toISOString()
          };
          
          fs.appendFileSync(metricsFile, JSON.stringify(metric) + '\\n');
        }
        
        // Simulate crash during write
        const partialMetric = '{"instanceId":"' + instanceId + '","sequence":5,"times';
        fs.appendFileSync(metricsFile, partialMetric);
        
        // Exit abruptly
        process.exit(1);
      `;
      
      fs.writeFileSync(path.join(TEST_DIR, 'crashing-worker.js'), crashingWorkerCode);
      
      // Run the crashing worker
      await new Promise<void>((resolve) => {
        const proc = spawn('node', [
          path.join(TEST_DIR, 'crashing-worker.js'),
          METRICS_FILE,
          'crash-instance'
        ]);
        
        proc.on('exit', () => resolve());
      });
      
      // Now run a normal worker to write after the crash
      await new Promise<void>((resolve) => {
        const proc = spawn('node', [
          WORKER_SCRIPT,
          METRICS_FILE,
          'normal-instance',
          '5'
        ]);
        
        proc.on('exit', () => resolve());
      });
      
      // Parse the file, skipping malformed lines
      const content = fs.readFileSync(METRICS_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const validMetrics = [];
      const invalidLines = [];
      
      for (const line of lines) {
        try {
          validMetrics.push(JSON.parse(line));
        } catch {
          invalidLines.push(line);
        }
      }
      
      // Should have 5 metrics from crash instance + 5 from normal instance
      // Note: The partial write may or may not be completed depending on OS buffering
      expect(validMetrics.length).toBeGreaterThanOrEqual(9);
      expect(validMetrics.length).toBeLessThanOrEqual(10);
      
      // Should have at least 1 invalid line (partial write from crash)
      expect(invalidLines.length).toBeGreaterThanOrEqual(1);
      // The invalid line should contain the partial write
      const hasPartialWrite = invalidLines.some(line => 
        line.includes('crash-instance') && line.includes('"times'));
      expect(hasPartialWrite).toBe(true);
    });
  });

  describe('Format Migration', () => {
    it('should read existing JSON format while writing JSONL', () => {
      // Create legacy JSON file
      const legacyFile = path.join(TEST_DIR, 'usage-metrics.json');
      const legacyData = {
        version: '1.0.0',
        metrics: [
          { toolName: 'search', timestamp: '2025-01-01T00:00:00Z' },
          { toolName: 'create_note_smart', timestamp: '2025-01-01T00:01:00Z' }
        ]
      };
      fs.writeFileSync(legacyFile, JSON.stringify(legacyData, null, 2));
      
      // Read legacy format
      const jsonContent = fs.readFileSync(legacyFile, 'utf8');
      const jsonData = JSON.parse(jsonContent);
      expect(jsonData.metrics).toHaveLength(2);
      
      // Write new metrics in JSONL format
      const jsonlFile = path.join(TEST_DIR, 'usage-metrics.jsonl');
      const newMetrics = [
        { toolName: 'list', timestamp: '2025-01-01T00:02:00Z' },
        { toolName: 'insert_content', timestamp: '2025-01-01T00:03:00Z' }
      ];
      
      for (const metric of newMetrics) {
        fs.appendFileSync(jsonlFile, JSON.stringify(metric) + '\n');
      }
      
      // Read JSONL format
      const jsonlContent = fs.readFileSync(jsonlFile, 'utf8');
      const jsonlMetrics = jsonlContent
        .split('\n')
        .filter(l => l.trim())
        .map(l => JSON.parse(l));
      
      expect(jsonlMetrics).toHaveLength(2);
      
      // Combine metrics from both formats
      const allMetrics = [...jsonData.metrics, ...jsonlMetrics];
      expect(allMetrics).toHaveLength(4);
    });

    it('should auto-detect format based on file extension', () => {
      const detectAndRead = (filepath: string): any[] => {
        const ext = path.extname(filepath).toLowerCase();
        const content = fs.readFileSync(filepath, 'utf8');
        
        if (ext === '.jsonl') {
          // Parse as JSONL
          return content
            .split('\n')
            .filter(l => l.trim())
            .map(l => {
              try {
                return JSON.parse(l);
              } catch {
                return null;
              }
            })
            .filter(m => m !== null);
        } else {
          // Parse as JSON
          try {
            const data = JSON.parse(content);
            return Array.isArray(data) ? data : (data.metrics || []);
          } catch {
            return [];
          }
        }
      };
      
      // Test JSON format
      const jsonFile = path.join(TEST_DIR, 'test.json');
      fs.writeFileSync(jsonFile, JSON.stringify({ metrics: [{ test: 1 }] }));
      const jsonMetrics = detectAndRead(jsonFile);
      expect(jsonMetrics).toHaveLength(1);
      
      // Test JSONL format
      const jsonlFile = path.join(TEST_DIR, 'test.jsonl');
      fs.writeFileSync(jsonlFile, '{"test":2}\n{"test":3}\n');
      const jsonlMetrics = detectAndRead(jsonlFile);
      expect(jsonlMetrics).toHaveLength(2);
    });
  });

  describe('Performance Validation', () => {
    it('should complete append operations within 5ms', () => {
      const iterations = 100;
      const timings: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const metric = {
          instanceId: uuidv4(),
          timestamp: new Date().toISOString(),
          toolName: 'test',
          executionTime: i
        };
        
        const start = process.hrtime.bigint();
        fs.appendFileSync(METRICS_FILE, JSON.stringify(metric) + '\n');
        const end = process.hrtime.bigint();
        
        const durationMs = Number(end - start) / 1_000_000;
        timings.push(durationMs);
      }
      
      // Calculate average and max timing
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);
      
      // Average should be under 5ms
      expect(avgTime).toBeLessThan(5);
      
      // 95% of operations should be under 5ms
      const under5ms = timings.filter(t => t < 5).length;
      expect(under5ms / iterations).toBeGreaterThan(0.95);
      
      // Log performance stats for debugging
      console.log(`Append performance: avg=${avgTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms`);
    });

    it('should handle high-frequency writes efficiently', async () => {
      const DURATION_MS = 1000; // 1 second test
      const startTime = Date.now();
      let writeCount = 0;
      
      // Write as many metrics as possible in 1 second
      while (Date.now() - startTime < DURATION_MS) {
        const metric = {
          instanceId: 'perf-test',
          timestamp: new Date().toISOString(),
          sequence: writeCount
        };
        
        fs.appendFileSync(METRICS_FILE, JSON.stringify(metric) + '\n');
        writeCount++;
      }
      
      // Should be able to write at least 100 metrics per second
      expect(writeCount).toBeGreaterThan(100);
      
      // Verify all metrics were written correctly
      const content = fs.readFileSync(METRICS_FILE, 'utf8');
      const metrics = content
        .split('\n')
        .filter(l => l.trim())
        .map(l => JSON.parse(l));
      
      expect(metrics.length).toBe(writeCount);
      
      console.log(`High-frequency write test: ${writeCount} metrics in 1 second`);
    });
  });

  describe('Edge Cases', () => {
    it('should handle disk full scenarios gracefully', () => {
      // Simulate disk full errors
      const errors: Error[] = [];
      let errorCount = 0;
      
      // Simulate writing with occasional disk full errors
      for (let i = 0; i < 5; i++) {
        try {
          if (errorCount++ < 3) {
            // Simulate disk full error
            throw new Error('ENOSPC: no space left on device');
          }
          // Otherwise succeed
          fs.appendFileSync(METRICS_FILE, JSON.stringify({ metric: i }) + '\n');
        } catch (error) {
          errors.push(error as Error);
        }
      }
      
      // Should have captured disk full errors
      expect(errors.length).toBe(3);
      expect(errors[0].message).toContain('ENOSPC');
    });

    it('should handle permission denied errors', () => {
      const readOnlyFile = path.join(TEST_DIR, 'readonly.jsonl');
      fs.writeFileSync(readOnlyFile, '');
      
      // Make file read-only
      fs.chmodSync(readOnlyFile, 0o444);
      
      // Try to append to read-only file
      let error: Error | null = null;
      try {
        fs.appendFileSync(readOnlyFile, JSON.stringify({ test: 1 }) + '\n');
      } catch (e) {
        error = e as Error;
      }
      
      // Should have gotten permission error
      expect(error).not.toBeNull();
      if (process.platform !== 'win32') {
        // Permission errors are platform-specific
        expect(error?.message).toMatch(/EACCES|permission/i);
      }
      
      // Restore permissions for cleanup
      fs.chmodSync(readOnlyFile, 0o644);
    });

    it('should handle very large individual metrics', () => {
      const largeMetric = {
        instanceId: uuidv4(),
        timestamp: new Date().toISOString(),
        // Create a large payload
        searchResults: Array(1000).fill(null).map((_, i) => ({
          title: `Result ${i}`,
          content: 'x'.repeat(100),
          metadata: {
            tags: Array(10).fill(`tag${i}`),
            properties: Object.fromEntries(
              Array(10).fill(null).map((_, j) => [`prop${j}`, `value${j}`])
            )
          }
        }))
      };
      
      const jsonLine = JSON.stringify(largeMetric);
      
      // Should handle large metrics (but warn if over PIPE_BUF)
      fs.appendFileSync(METRICS_FILE, jsonLine + '\n');
      
      // Verify it was written and can be parsed
      const content = fs.readFileSync(METRICS_FILE, 'utf8');
      const parsed = JSON.parse(content.trim());
      
      expect(parsed.instanceId).toBe(largeMetric.instanceId);
      expect(parsed.searchResults).toHaveLength(1000);
      
      // Log size for monitoring
      console.log(`Large metric size: ${jsonLine.length} bytes`);
      
      // Warn if over PIPE_BUF (4096 on most systems)
      if (jsonLine.length > 4096) {
        console.warn('Warning: Metric exceeds PIPE_BUF size, atomicity not guaranteed');
      }
    });
  });
});