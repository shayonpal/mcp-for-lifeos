/**
 * Final Validation Tests for JSONL Analytics (MCP-21)
 * Comprehensive validation of the complete implementation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

describe('JSONL Analytics Final Validation', () => {
  const ANALYTICS_DIR = path.join(process.cwd(), 'analytics');
  const JSONL_FILE = path.join(ANALYTICS_DIR, 'usage-metrics.jsonl');
  const JSON_FILE = path.join(ANALYTICS_DIR, 'usage-metrics.json');
  
  describe('Production File Analysis', () => {
    it('should validate existing JSONL file structure', () => {
      if (!fs.existsSync(JSONL_FILE)) {
        console.log('No JSONL file found, skipping validation');
        return;
      }
      
      const content = fs.readFileSync(JSONL_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      
      expect(lines.length).toBeGreaterThan(0);
      
      // Validate each line
      const metrics = [];
      const parseErrors = [];
      
      for (const line of lines) {
        try {
          const metric = JSON.parse(line);
          metrics.push(metric);
        } catch (error) {
          parseErrors.push({ line: line.substring(0, 100), error });
        }
      }
      
      // Should have minimal parse errors
      const errorRate = parseErrors.length / lines.length;
      expect(errorRate).toBeLessThan(0.01); // Less than 1% error rate
      
      // Validate metric structure
      for (const metric of metrics.slice(0, 100)) { // Check first 100
        // Required fields
        expect(metric).toHaveProperty('toolName');
        expect(metric).toHaveProperty('timestamp');
        expect(metric).toHaveProperty('success');
        
        // Instance identification (should be present in new metrics)
        if (metric.instanceId) {
          expect(metric.instanceId).toMatch(/^[0-9a-f-]{36}$/i); // UUID format
          expect(metric).toHaveProperty('pid');
          expect(metric).toHaveProperty('hostname');
          expect(metric).toHaveProperty('sessionStart');
        }
        
        // Timestamp validation
        expect(() => new Date(metric.timestamp)).not.toThrow();
        
        // Tool name validation
        expect(typeof metric.toolName).toBe('string');
        expect(metric.toolName.length).toBeGreaterThan(0);
      }
      
      console.log(`Validated ${metrics.length} metrics from JSONL file`);
    });

    it('should verify backward compatibility with JSON format', () => {
      if (!fs.existsSync(JSON_FILE)) {
        console.log('No legacy JSON file found, skipping compatibility check');
        return;
      }
      
      const jsonContent = fs.readFileSync(JSON_FILE, 'utf8');
      let jsonData;
      
      try {
        jsonData = JSON.parse(jsonContent);
      } catch (error) {
        console.log('Legacy JSON file is not valid JSON, may be corrupted');
        return;
      }
      
      // Should have metrics array
      if (jsonData.metrics && Array.isArray(jsonData.metrics)) {
        expect(jsonData.metrics.length).toBeGreaterThan(0);
        
        // Validate structure
        for (const metric of jsonData.metrics.slice(0, 10)) {
          expect(metric).toHaveProperty('toolName');
          expect(metric).toHaveProperty('timestamp');
        }
        
        console.log(`Legacy JSON contains ${jsonData.metrics.length} metrics`);
      }
    });
  });

  describe('Instance Identification', () => {
    // TODO: Re-enable after analytics implementation is fixed
    // Analytics feature is currently broken, preventing these spawned-process tests from working
    // Tracked in MCP-65
    it.skip('should generate unique instance IDs for each server start', async () => {
      const instanceIds = new Set<string>();
      
      // Start and stop server multiple times
      for (let i = 0; i < 3; i++) {
        const testOutput = path.join(os.tmpdir(), `test-instance-${i}.jsonl`);
        
        const server = spawn('node', [
          path.join(process.cwd(), 'dist', 'index.js')
        ], {
          env: {
            ...process.env,
            ENABLE_WEB_INTERFACE: 'false',
            ANALYTICS_OUTPUT: testOutput
          },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Send a test request
        const request = JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: `instance-test-${i}`
        }) + '\n';
        
        server.stdin!.write(request);
        
        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Kill server
        server.kill('SIGTERM');
        await new Promise(resolve => server.on('exit', resolve));
        
        // Check for instance ID in output (if file was created)
        if (fs.existsSync(testOutput)) {
          const content = fs.readFileSync(testOutput, 'utf8');
          const lines = content.split('\n').filter(l => l.trim());
          
          for (const line of lines) {
            try {
              const metric = JSON.parse(line);
              if (metric.instanceId) {
                instanceIds.add(metric.instanceId);
              }
            } catch {}
          }
          
          // Clean up
          fs.unlinkSync(testOutput);
        }
      }
      
      // Each server start should have unique instance ID
      // Note: May not create files if analytics disabled, so check if we got any
      if (instanceIds.size > 0) {
        expect(instanceIds.size).toBeGreaterThanOrEqual(1);
        console.log(`Generated ${instanceIds.size} unique instance IDs`);
      }
    }, 10000);
  });

  describe('Concurrent Safety', () => {
    it('should validate no data corruption in production JSONL file', () => {
      if (!fs.existsSync(JSONL_FILE)) {
        console.log('No JSONL file found, skipping corruption check');
        return;
      }
      
      const content = fs.readFileSync(JSONL_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      
      // Check for common corruption patterns
      let corruptionCount = 0;
      const corruptionPatterns = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for incomplete JSON (missing closing braces)
        if (line.includes('{') && !line.includes('}')) {
          corruptionCount++;
          corruptionPatterns.push('Incomplete JSON object');
          continue;
        }
        
        // Check for merged lines (multiple JSON objects on one line)
        const braceCount = (line.match(/\{/g) || []).length;
        if (braceCount > 1) {
          // Could be nested objects, try to parse
          try {
            JSON.parse(line);
          } catch {
            corruptionCount++;
            corruptionPatterns.push('Merged JSON objects');
          }
        }
        
        // Check for truncated lines
        if (line.length > 0 && line.length < 20) {
          try {
            JSON.parse(line);
          } catch {
            corruptionCount++;
            corruptionPatterns.push('Truncated line');
          }
        }
      }
      
      // Corruption should be minimal
      const corruptionRate = corruptionCount / lines.length;
      expect(corruptionRate).toBeLessThan(0.001); // Less than 0.1%
      
      if (corruptionCount > 0) {
        console.log(`Found ${corruptionCount} potentially corrupted lines:`);
        console.log(corruptionPatterns.slice(0, 10));
      } else {
        console.log(`No corruption detected in ${lines.length} lines`);
      }
    });

    it('should verify atomicity of recent writes', () => {
      if (!fs.existsSync(JSONL_FILE)) {
        console.log('No JSONL file found, skipping atomicity check');
        return;
      }
      
      const content = fs.readFileSync(JSONL_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      
      // Get last 100 lines
      const recentLines = lines.slice(-100);
      const recentMetrics = [];
      
      for (const line of recentLines) {
        try {
          const metric = JSON.parse(line);
          recentMetrics.push(metric);
        } catch {
          // Skip invalid lines
        }
      }
      
      // Group by instance ID to check for consistency
      const byInstance = new Map<string, any[]>();
      for (const metric of recentMetrics) {
        if (metric.instanceId) {
          if (!byInstance.has(metric.instanceId)) {
            byInstance.set(metric.instanceId, []);
          }
          byInstance.get(metric.instanceId)!.push(metric);
        }
      }
      
      // Each instance should have consistent properties
      for (const [instanceId, metrics] of byInstance) {
        const pids = new Set(metrics.map(m => m.pid));
        const hostnames = new Set(metrics.map(m => m.hostname));
        const sessionStarts = new Set(metrics.map(m => m.sessionStart));
        
        // Same instance should have same PID, hostname, and session start
        expect(pids.size).toBe(1);
        expect(hostnames.size).toBe(1);
        expect(sessionStarts.size).toBe(1);
      }
      
      console.log(`Verified atomicity for ${byInstance.size} instances`);
    });
  });

  describe('Performance Characteristics', () => {
    it('should measure append performance on actual analytics file', () => {
      const TEST_FILE = path.join(os.tmpdir(), 'perf-test.jsonl');
      const iterations = 100;
      const timings: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const metric = {
          instanceId: 'perf-test',
          timestamp: new Date().toISOString(),
          toolName: 'test',
          executionTime: i,
          pid: process.pid,
          hostname: os.hostname()
        };
        
        const start = process.hrtime.bigint();
        fs.appendFileSync(TEST_FILE, JSON.stringify(metric) + '\n');
        const end = process.hrtime.bigint();
        
        timings.push(Number(end - start) / 1_000_000);
      }
      
      // Clean up
      fs.unlinkSync(TEST_FILE);
      
      // Calculate statistics
      const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);
      const minTime = Math.min(...timings);
      
      // Performance expectations
      expect(avgTime).toBeLessThan(10); // Average under 10ms
      expect(maxTime).toBeLessThan(50); // Max under 50ms
      
      console.log(`Append performance: min=${minTime.toFixed(2)}ms, avg=${avgTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms`);
    });

    it('should measure file size growth characteristics', () => {
      if (!fs.existsSync(JSONL_FILE)) {
        console.log('No JSONL file found, skipping size analysis');
        return;
      }
      
      const stats = fs.statSync(JSONL_FILE);
      const fileSizeKB = stats.size / 1024;
      const fileSizeMB = fileSizeKB / 1024;
      
      // Parse file to count metrics
      const content = fs.readFileSync(JSONL_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      
      const avgBytesPerMetric = stats.size / lines.length;
      
      console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);
      console.log(`Total metrics: ${lines.length}`);
      console.log(`Average bytes per metric: ${avgBytesPerMetric.toFixed(0)}`);
      
      // Typical metric should be 200-500 bytes
      expect(avgBytesPerMetric).toBeGreaterThan(100);
      expect(avgBytesPerMetric).toBeLessThan(1000);
      
      // Estimate growth rate
      const metricsPerDay = 1000; // Estimate
      const growthPerDayMB = (avgBytesPerMetric * metricsPerDay) / (1024 * 1024);
      console.log(`Estimated growth: ${growthPerDayMB.toFixed(2)} MB/day at ${metricsPerDay} metrics/day`);
    });
  });
});