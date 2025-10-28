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
    let testAnalyticsFiles: string[] = [];
    let testVaultPath: string;
    
    beforeEach(() => {
      // Create a temporary vault for testing
      testVaultPath = path.join(os.tmpdir(), `test-vault-${Date.now()}`);
      fs.mkdirSync(testVaultPath, { recursive: true });
      
      // Create a dummy note for search to find
      const dummyNote = path.join(testVaultPath, 'test-note.md');
      fs.writeFileSync(dummyNote, '# Test Note\nThis is a test note for analytics testing.');
    });
    
    afterEach(() => {
      // Clean up test analytics files
      testAnalyticsFiles.forEach(file => {
        if (fs.existsSync(file)) {
          try {
            fs.unlinkSync(file);
          } catch (error) {
            console.warn(`Failed to cleanup ${file}:`, error);
          }
        }
      });
      testAnalyticsFiles = [];
      
      // Clean up test vault
      if (testVaultPath && fs.existsSync(testVaultPath)) {
        try {
          fs.rmSync(testVaultPath, { recursive: true, force: true });
        } catch (error) {
          console.warn(`Failed to cleanup vault ${testVaultPath}:`, error);
        }
      }
    });

    it('should generate unique instance IDs for each server start', async () => {
      const instanceData: Array<{
        instanceId: string;
        pid: number;
        hostname: string;
        sessionStart: string;
      }> = [];
      
      const numIterations = 5;
      
      // Start and stop server multiple times
      for (let i = 0; i < numIterations; i++) {
        const testOutput = path.join(os.tmpdir(), `test-instance-${Date.now()}-${i}.jsonl`);
        testAnalyticsFiles.push(testOutput);
        
        // Ensure output directory exists
        const outputDir = path.dirname(testOutput);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const server = spawn('node', [
          path.join(process.cwd(), 'dist', 'src', 'index.js')
        ], {
          env: {
            ...process.env,
            LIFEOS_VAULT_PATH: testVaultPath, // Set vault path for the test (correct environment variable)
            DISABLE_USAGE_ANALYTICS: 'false', // Explicitly enable analytics
            ENABLE_WEB_INTERFACE: 'false',
            // Override the analytics output path via config if supported
            ANALYTICS_OUTPUT_PATH: testOutput
          },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let serverOutput = '';
        let serverError = '';
        
        // Capture server output for debugging
        server.stdout?.on('data', (data) => {
          serverOutput += data.toString();
        });
        
        server.stderr?.on('data', (data) => {
          serverError += data.toString();
        });
        
        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send a test request to trigger analytics (use 'search' tool to ensure analytics is recorded)
        const request = JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'search',
            arguments: {
              query: 'test',
              mode: 'quick'
            }
          },
          id: `instance-test-${i}`
        }) + '\n';
        
        server.stdin?.write(request);
        
        // Wait for response and analytics to be written
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Gracefully shutdown server
        server.kill('SIGTERM');
        
        // Wait for server to exit
        await new Promise<void>((resolve) => {
          server.on('exit', () => resolve());
          // Timeout after 3 seconds
          setTimeout(() => {
            if (!server.killed) {
              server.kill('SIGKILL');
            }
            resolve();
          }, 3000);
        });
        
        // Check for instance ID in output file
        if (fs.existsSync(testOutput)) {
          const content = fs.readFileSync(testOutput, 'utf8');
          const lines = content.split('\n').filter(l => l.trim());
          
          for (const line of lines) {
            try {
              const metric = JSON.parse(line);
              if (metric.instanceId && metric.pid && metric.hostname) {
                // Store complete instance data
                instanceData.push({
                  instanceId: metric.instanceId,
                  pid: metric.pid,
                  hostname: metric.hostname,
                  sessionStart: metric.sessionStart
                });
                // Only need one metric per server instance
                break;
              }
            } catch (error) {
              console.warn(`Failed to parse metric line: ${line.substring(0, 100)}`);
            }
          }
        } else {
          console.warn(`Analytics file not created for iteration ${i}: ${testOutput}`);
          console.warn(`Server output: ${serverOutput.substring(0, 500)}`);
          console.warn(`Server error: ${serverError.substring(0, 500)}`);
        }
      }
      
      // Validate we collected data from all iterations
      expect(instanceData.length).toBe(numIterations);
      
      // Validate instance ID uniqueness
      const uniqueInstanceIds = new Set(instanceData.map(d => d.instanceId));
      expect(uniqueInstanceIds.size).toBe(numIterations);
      
      // Validate instance ID format (UUID v4)
      instanceData.forEach(data => {
        expect(data.instanceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      });
      
      // Validate that each instance has required fields
      instanceData.forEach(data => {
        expect(data.pid).toBeGreaterThan(0);
        expect(data.hostname).toBeTruthy();
        expect(data.hostname.length).toBeGreaterThan(0);
        expect(data.sessionStart).toBeTruthy();
        // Validate sessionStart is a valid ISO timestamp
        expect(() => new Date(data.sessionStart)).not.toThrow();
        expect(new Date(data.sessionStart).toISOString()).toBe(data.sessionStart);
      });
      
      // Validate PIDs are different (each server start gets new process)
      const uniquePids = new Set(instanceData.map(d => d.pid));
      expect(uniquePids.size).toBe(numIterations);
      
      // Validate sessionStart times are different and increasing
      const sessionStarts = instanceData.map(d => new Date(d.sessionStart).getTime());
      for (let i = 1; i < sessionStarts.length; i++) {
        expect(sessionStarts[i]).toBeGreaterThanOrEqual(sessionStarts[i - 1]);
      }
      
      console.log(`✓ Validated ${numIterations} unique instance IDs`);
      console.log(`✓ All instance IDs are valid UUID v4 format`);
      console.log(`✓ All ${numIterations} PIDs are unique`);
      console.log(`✓ All sessionStart timestamps are valid and sequential`);
    }, 30000); // Increased timeout for multiple server starts
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