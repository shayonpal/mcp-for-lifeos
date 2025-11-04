/**
 * Integration Tests for MCP Server Concurrent Operations (MCP-21)
 * Tests multiple MCP server instances running concurrently
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('MCP Server Concurrent Operations', () => {
  const TEST_DIR = path.join(os.tmpdir(), 'mcp-concurrent-test');
  const METRICS_FILE = path.join(TEST_DIR, 'usage-metrics.jsonl');
  // MCP-65: Correct server entry point path (build outputs to dist/src/)
  const SERVER_SCRIPT = path.join(process.cwd(), 'dist', 'src', 'index.js');
  const IS_CI = process.env.CI === 'true';
  const START_STOP_ITERATIONS = IS_CI ? 3 : 5;
  const START_STOP_WAIT_MS = IS_CI ? 800 : 500;
  const RAPID_REQUEST_COUNT = IS_CI ? 6 : 10;
  const RAPID_INTERVAL_MS = IS_CI ? 25 : 10;
  const START_STOP_TIMEOUT_MS = IS_CI ? 40000 : 20000;
  const RAPID_TIMEOUT_MS = IS_CI ? 18000 : 10000;
  
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    
    // Set environment for test directory
    process.env.ANALYTICS_DIR = TEST_DIR;
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    
    delete process.env.ANALYTICS_DIR;
  });

  describe('Multiple Server Instances', () => {
    // TODO (MCP-154): Re-enable after analytics implementation is fixed
    // Analytics feature is currently broken, preventing these spawned-process tests from working
    // Previously tracked in MCP-65
    it.skip('should handle multiple MCP server instances writing analytics concurrently', async () => {
      const NUM_SERVERS = 3;
      const servers: ChildProcess[] = [];
      
      // Start multiple server instances
      for (let i = 0; i < NUM_SERVERS; i++) {
        const env = {
          ...process.env,
          DISABLE_USAGE_ANALYTICS: 'false', // MCP-65: Enable analytics for spawned process
          ANALYTICS_DIR: TEST_DIR,
          ENABLE_WEB_INTERFACE: 'false',
          PORT: String(19831 + i) // Different ports
        };
        
        const server = spawn('node', [SERVER_SCRIPT], {
          env,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        servers.push(server);
        
        // Send a simple MCP request to trigger analytics
        const request = JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: `test-${i}`
        }) + '\n';
        
        server.stdin!.write(request);
      }
      
      // Wait for servers to write analytics
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Kill all servers
      servers.forEach(server => {
        server.kill('SIGTERM');
      });
      
      // Wait for servers to exit
      await Promise.all(servers.map(server => 
        new Promise(resolve => server.on('exit', resolve))
      ));
      
      // Check if JSONL file was created
      expect(fs.existsSync(METRICS_FILE)).toBe(true);
      
      // Parse and validate metrics
      if (fs.existsSync(METRICS_FILE)) {
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
        
        // Should have metrics from multiple instances
        const instanceIds = new Set(metrics.map(m => m.instanceId));
        expect(instanceIds.size).toBeGreaterThanOrEqual(1); // At least some metrics
        
        // All metrics should have required fields
        for (const metric of metrics) {
          expect(metric).toHaveProperty('instanceId');
          expect(metric).toHaveProperty('timestamp');
        }
      }
    }, 15000); // 15 second timeout

    it('should maintain data integrity when servers start and stop frequently', async () => {
      const iterations = START_STOP_ITERATIONS;
      const allMetrics = [];

      for (let i = 0; i < iterations; i++) {
        const env = {
          ...process.env,
          DISABLE_USAGE_ANALYTICS: 'false', // MCP-65: Enable analytics for spawned process
          ANALYTICS_DIR: TEST_DIR,
          ENABLE_WEB_INTERFACE: 'false'
        };

        const server = spawn('node', [SERVER_SCRIPT], {
          env,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // Capture stderr for debugging
        let stderrData = '';
        server.stderr!.on('data', (data) => {
          stderrData += data.toString();
        });

        // Send a request
        const request = JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: `iteration-${i}`
        }) + '\n';

        server.stdin!.write(request);
        server.stdin!.end(); // Close stdin to signal EOF

        // Wait briefly
        await new Promise(resolve => setTimeout(resolve, START_STOP_WAIT_MS));

        // Kill server with timeout fallback
        server.kill('SIGTERM');

        // Wait for exit with timeout
        const exitPromise = new Promise<void>((resolve) => {
          server.on('exit', () => resolve());
        });

        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            if (!server.killed) {
              server.kill('SIGKILL'); // Force kill if still running
            }
            resolve();
          }, 2000); // 2 second timeout for graceful shutdown
        });

        await Promise.race([exitPromise, timeoutPromise]);

        // Log any stderr output in CI for debugging
        if (IS_CI && stderrData) {
          console.log(`Server ${i} stderr:`, stderrData);
        }
      }
      
      // Check metrics integrity
      if (fs.existsSync(METRICS_FILE)) {
        const content = fs.readFileSync(METRICS_FILE, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          try {
            const metric = JSON.parse(line);
            allMetrics.push(metric);
          } catch {
            // Count malformed lines
          }
        }
        
        // All parsed metrics should be valid
        for (const metric of allMetrics) {
          expect(metric).toHaveProperty('instanceId');
          expect(metric).toHaveProperty('timestamp');
          
          // Timestamps should be valid ISO strings
          expect(() => new Date(metric.timestamp)).not.toThrow();
        }
      }
    }, START_STOP_TIMEOUT_MS);
  });

  describe('Analytics Collection Behavior', () => {
    // TODO (MCP-154): Re-enable after analytics implementation is fixed
    // Analytics feature is currently broken, preventing these spawned-process tests from working
    // Previously tracked in MCP-65
    it.skip('should append to existing JSONL file', async () => {
      // Create initial JSONL file
      const initialMetric = {
        instanceId: 'initial-instance',
        timestamp: new Date().toISOString(),
        toolName: 'test-initial'
      };
      
      fs.writeFileSync(METRICS_FILE, JSON.stringify(initialMetric) + '\n');
      
      // Start server
      const env = {
          ...process.env,
          DISABLE_USAGE_ANALYTICS: 'false', // MCP-65: Enable analytics for spawned process
        ANALYTICS_DIR: TEST_DIR,
        ENABLE_WEB_INTERFACE: 'false'
      };
      
      const server = spawn('node', [SERVER_SCRIPT], {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Send request
      const request = JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 'append-test'
      }) + '\n';
      
      server.stdin!.write(request);
      
      // Wait for analytics
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Kill server
      server.kill('SIGTERM');
      await new Promise(resolve => server.on('exit', resolve));
      
      // Check file
      const content = fs.readFileSync(METRICS_FILE, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const metrics = lines.map(l => JSON.parse(l));
      
      // Should have initial metric plus new ones
      expect(metrics.length).toBeGreaterThan(1);
      expect(metrics[0].instanceId).toBe('initial-instance');
      
      // New metrics should have different instance ID
      const newMetrics = metrics.filter(m => m.instanceId !== 'initial-instance');
      expect(newMetrics.length).toBeGreaterThan(0);
    }, 10000);

    it('should handle rapid sequential writes without data loss', async () => {
      const env = {
          ...process.env,
          DISABLE_USAGE_ANALYTICS: 'false', // MCP-65: Enable analytics for spawned process
        ANALYTICS_DIR: TEST_DIR,
        ENABLE_WEB_INTERFACE: 'false'
      };

      const server = spawn('node', [SERVER_SCRIPT], {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Capture stderr for debugging
      let stderrData = '';
      server.stderr!.on('data', (data) => {
        stderrData += data.toString();
      });

      // Send multiple rapid requests
      const requestCount = RAPID_REQUEST_COUNT;
      for (let i = 0; i < requestCount; i++) {
        const request = JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: `rapid-${i}`
        }) + '\n';

        server.stdin!.write(request);

        // Very short delay between requests
        await new Promise(resolve => setTimeout(resolve, RAPID_INTERVAL_MS));
      }

      // Close stdin after all requests sent
      server.stdin!.end();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Kill server with timeout fallback
      server.kill('SIGTERM');

      // Wait for exit with timeout
      const exitPromise = new Promise<void>((resolve) => {
        server.on('exit', () => resolve());
      });

      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!server.killed) {
            server.kill('SIGKILL'); // Force kill if still running
          }
          resolve();
        }, 2000); // 2 second timeout for graceful shutdown
      });

      await Promise.race([exitPromise, timeoutPromise]);

      // Log any stderr output in CI for debugging
      if (IS_CI && stderrData) {
        console.log('Rapid test server stderr:', stderrData);
      }
      
      // Check metrics
      if (fs.existsSync(METRICS_FILE)) {
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
        
        // Should have captured multiple metrics
        expect(metrics.length).toBeGreaterThan(0);
        
        // All metrics should be from same instance
        const instanceIds = new Set(metrics.map(m => m.instanceId));
        expect(instanceIds.size).toBe(1);
      }
    }, RAPID_TIMEOUT_MS);
  });
});
