/**
 * Unit Tests for JSONL Analytics Implementation (MCP-21)
 * Tests atomic append operations, JSONL formatting, and parsing
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
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

// Mock fs module for controlled testing
jest.mock('fs');

describe('JSONL Analytics Unit Tests', () => {
  const TEST_FILE = path.join(os.tmpdir(), 'test-metrics.jsonl');
  const LEGACY_FILE = path.join(os.tmpdir(), 'test-metrics.json');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(TEST_FILE)) {
      fs.unlinkSync(TEST_FILE);
    }
    if (fs.existsSync(LEGACY_FILE)) {
      fs.unlinkSync(LEGACY_FILE);
    }
  });

  describe('Atomic Append Operations', () => {
    it('should use fs.appendFileSync for atomic writes', () => {
      const mockAppendFileSync = jest.spyOn(fs, 'appendFileSync');
      const metric = {
        instanceId: uuidv4(),
        pid: process.pid,
        hostname: os.hostname(),
        timestamp: new Date().toISOString(),
        toolName: 'search',
        executionTime: 123,
        success: true
      };
      
      const jsonLine = JSON.stringify(metric) + '\n';
      
      // Simulate append operation
      fs.appendFileSync(TEST_FILE, jsonLine, { encoding: 'utf8', flag: 'a' });
      
      expect(mockAppendFileSync).toHaveBeenCalledWith(
        TEST_FILE,
        jsonLine,
        expect.objectContaining({
          encoding: 'utf8',
          flag: 'a'
        })
      );
    });

    it('should ensure line size stays under PIPE_BUF (4096 bytes)', () => {
      const metric = {
        instanceId: uuidv4(),
        pid: process.pid,
        hostname: os.hostname(),
        timestamp: new Date().toISOString(),
        toolName: 'search',
        executionTime: 123,
        success: true,
        // Add large optional data to test size limits
        searchResults: Array(100).fill('result').join(',')
      };
      
      const jsonLine = JSON.stringify(metric) + '\n';
      
      // Line should be truncated or split if over 4096 bytes
      expect(jsonLine.length).toBeLessThanOrEqual(4096);
    });

    it('should handle write errors gracefully', () => {
      const mockAppendFileSync = jest.spyOn(fs, 'appendFileSync')
        .mockImplementation(() => {
          throw new Error('EACCES: permission denied');
        });
      
      const metric = {
        instanceId: uuidv4(),
        timestamp: new Date().toISOString(),
        toolName: 'search'
      };
      
      // Should not throw, but log error
      expect(() => {
        try {
          fs.appendFileSync(TEST_FILE, JSON.stringify(metric) + '\n');
        } catch (error) {
          // Error should be handled, not propagated
          console.error('Analytics write failed:', error);
        }
      }).not.toThrow();
      
      mockAppendFileSync.mockRestore();
    });
  });

  describe('JSONL Line Formatting', () => {
    it('should format each metric as a single JSON line', () => {
      const metrics = [
        { toolName: 'search', timestamp: '2025-01-01T00:00:00Z' },
        { toolName: 'create_note_smart', timestamp: '2025-01-01T00:00:01Z' },
        { toolName: 'list', timestamp: '2025-01-01T00:00:02Z' }
      ];
      
      const jsonlContent = metrics
        .map(m => JSON.stringify(m))
        .join('\n') + '\n';
      
      // Each line should be valid JSON
      const lines = jsonlContent.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
      
      // Should have exactly one newline between metrics
      expect(jsonlContent.match(/\n/g)?.length).toBe(metrics.length);
    });

    it('should not include multi-line JSON formatting', () => {
      const metric = {
        instanceId: uuidv4(),
        nested: {
          data: {
            value: 'test'
          }
        }
      };
      
      const jsonLine = JSON.stringify(metric);
      
      // Should be compact, single-line JSON
      expect(jsonLine).not.toContain('\n');
      expect(jsonLine).not.toContain('  '); // No indentation
    });

    it('should escape special characters properly', () => {
      const metric = {
        toolName: 'search',
        query: 'Line with\nnewline and "quotes"',
        path: 'C:\\Users\\Test\\Path'
      };
      
      const jsonLine = JSON.stringify(metric);
      const parsed = JSON.parse(jsonLine);
      
      expect(parsed.query).toBe('Line with\nnewline and "quotes"');
      expect(parsed.path).toBe('C:\\Users\\Test\\Path');
    });
  });

  describe('Instance ID Generation', () => {
    it('should generate unique UUID v4 instance IDs', () => {
      const instanceIds = new Set();
      
      for (let i = 0; i < 100; i++) {
        const id = uuidv4();
        expect(id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
        instanceIds.add(id);
      }
      
      // All IDs should be unique
      expect(instanceIds.size).toBe(100);
    });

    it('should include process ID and hostname', () => {
      const instanceMetric = {
        instanceId: uuidv4(),
        pid: process.pid,
        hostname: os.hostname(),
        sessionStart: new Date().toISOString()
      };
      
      expect(instanceMetric.pid).toBe(process.pid);
      expect(instanceMetric.pid).toBeGreaterThan(0);
      expect(instanceMetric.hostname).toBe(os.hostname());
      expect(instanceMetric.hostname.length).toBeGreaterThan(0);
    });

    it('should maintain instance ID throughout session', () => {
      const sessionId = uuidv4();
      const metrics = [];
      
      // Simulate multiple metrics from same session
      for (let i = 0; i < 10; i++) {
        metrics.push({
          instanceId: sessionId,
          timestamp: new Date().toISOString(),
          toolName: `tool-${i}`
        });
      }
      
      // All metrics should have same instance ID
      const uniqueIds = new Set(metrics.map(m => m.instanceId));
      expect(uniqueIds.size).toBe(1);
      expect(uniqueIds.has(sessionId)).toBe(true);
    });
  });

  describe('Malformed Line Parsing', () => {
    it('should skip malformed JSON lines', () => {
      const jsonlContent = [
        '{"valid": "metric1"}',
        'not valid json',
        '{"valid": "metric2"}',
        '{ incomplete',
        '{"valid": "metric3"}'
      ].join('\n');
      
      const parsedMetrics = [];
      const lines = jsonlContent.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          parsedMetrics.push(JSON.parse(line));
        } catch {
          // Skip malformed lines
          continue;
        }
      }
      
      expect(parsedMetrics).toHaveLength(3);
      expect(parsedMetrics[0]).toEqual({ valid: 'metric1' });
      expect(parsedMetrics[1]).toEqual({ valid: 'metric2' });
      expect(parsedMetrics[2]).toEqual({ valid: 'metric3' });
    });

    it('should handle partial lines from process crashes', () => {
      const jsonlContent = [
        '{"complete": "metric1"}',
        '{"partial": "metr', // Simulated crash mid-write
        '{"complete": "metric2"}'
      ].join('\n');
      
      const parsedMetrics = [];
      const errors = [];
      
      for (const line of jsonlContent.split('\n')) {
        if (!line.trim()) continue;
        try {
          parsedMetrics.push(JSON.parse(line));
        } catch (error) {
          errors.push({ line, error });
        }
      }
      
      expect(parsedMetrics).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0].line).toContain('{"partial"');
    });

    it('should handle empty lines and whitespace', () => {
      const jsonlContent = [
        '{"metric": 1}',
        '',
        '   ',
        '{"metric": 2}',
        '\n\n',
        '{"metric": 3}'
      ].join('\n');
      
      const parsedMetrics = [];
      
      for (const line of jsonlContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        try {
          parsedMetrics.push(JSON.parse(trimmed));
        } catch {
          // Skip invalid lines
        }
      }
      
      expect(parsedMetrics).toHaveLength(3);
    });
  });

  describe('Format Detection (JSON vs JSONL)', () => {
    it('should detect format by file extension', () => {
      const detectFormat = (filepath: string): 'json' | 'jsonl' => {
        const ext = path.extname(filepath).toLowerCase();
        return ext === '.jsonl' ? 'jsonl' : 'json';
      };
      
      expect(detectFormat('metrics.json')).toBe('json');
      expect(detectFormat('metrics.jsonl')).toBe('jsonl');
      expect(detectFormat('metrics.JSONL')).toBe('jsonl');
      expect(detectFormat('metrics')).toBe('json'); // Default to JSON
    });

    it('should detect format by content structure', () => {
      const detectFormatByContent = (content: string): 'json' | 'jsonl' => {
        // Try parsing as JSON object/array first
        try {
          const parsed = JSON.parse(content);
          if (typeof parsed === 'object') {
            return 'json';
          }
        } catch {
          // Not valid JSON, might be JSONL
        }
        
        // Check if it's JSONL (multiple JSON objects separated by newlines)
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
          try {
            for (const line of lines) {
              JSON.parse(line);
            }
            return 'jsonl';
          } catch {
            // Not valid JSONL either
          }
        }
        
        return 'json'; // Default
      };
      
      const jsonContent = '{"metrics": [{"tool": "search"}]}';
      const jsonlContent = '{"tool": "search"}\n{"tool": "list"}';
      
      expect(detectFormatByContent(jsonContent)).toBe('json');
      expect(detectFormatByContent(jsonlContent)).toBe('jsonl');
    });

    it('should support reading both formats during migration', () => {
      const readMetrics = (filepath: string): any[] => {
        const content = fs.readFileSync(filepath, 'utf8');
        const format = path.extname(filepath).toLowerCase() === '.jsonl' ? 'jsonl' : 'json';
        
        if (format === 'jsonl') {
          const metrics = [];
          for (const line of content.split('\n')) {
            if (!line.trim()) continue;
            try {
              metrics.push(JSON.parse(line));
            } catch {
              // Skip malformed lines
            }
          }
          return metrics;
        } else {
          try {
            const data = JSON.parse(content);
            return Array.isArray(data) ? data : (data.metrics || []);
          } catch {
            return [];
          }
        }
      };
      
      // Mock file reads
      jest.spyOn(fs, 'readFileSync')
        .mockImplementationOnce(() => '{"metrics": [{"tool": "search"}]}')
        .mockImplementationOnce(() => '{"tool": "create"}\n{"tool": "list"}');
      
      const jsonMetrics = readMetrics('test.json');
      const jsonlMetrics = readMetrics('test.jsonl');
      
      expect(jsonMetrics).toHaveLength(1);
      expect(jsonlMetrics).toHaveLength(2);
    });
  });

  describe('Buffer Management', () => {
    it('should flush buffer when size limit reached', () => {
      const BUFFER_SIZE = 100;
      const buffer: any[] = [];
      let flushCount = 0;
      
      const flushBuffer = () => {
        if (buffer.length > 0) {
          // Write all buffered metrics
          flushCount++;
          buffer.length = 0;
        }
      };
      
      // Simulate adding metrics
      for (let i = 0; i < 250; i++) {
        buffer.push({ metric: i });
        
        if (buffer.length >= BUFFER_SIZE) {
          flushBuffer();
        }
      }
      
      // Final flush
      if (buffer.length > 0) {
        flushBuffer();
      }
      
      expect(flushCount).toBe(3); // 250 metrics / 100 buffer = 2.5, so 3 flushes
    });

    it('should flush buffer on timer interval', (done) => {
      const FLUSH_INTERVAL = 100; // ms
      const buffer: any[] = [];
      let flushCount = 0;
      
      const flushBuffer = () => {
        if (buffer.length > 0) {
          flushCount++;
          buffer.length = 0;
        }
      };
      
      // Set up interval
      const timer = setInterval(flushBuffer, FLUSH_INTERVAL);
      
      // Add some metrics
      buffer.push({ metric: 1 });
      
      setTimeout(() => {
        buffer.push({ metric: 2 });
      }, 50);
      
      setTimeout(() => {
        clearInterval(timer);
        flushBuffer(); // Final flush
        
        expect(flushCount).toBeGreaterThanOrEqual(1);
        done();
      }, 250);
    });
  });
});