/**
 * Tool Parity Integration Tests
 * 
 * Validates that consolidated tools produce identical outputs to their legacy counterparts.
 * This ensures backward compatibility and validates the AI Tool Caller Optimization (#62).
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: any;
}

interface ToolParityTestResult {
  tool: string;
  scenario: string;
  legacyResult: any;
  consolidatedResult: any;
  matches: boolean;
  timeDiff: number;
  legacyTime: number;
  consolidatedTime: number;
}

class MCPToolParityClient extends EventEmitter {
  private serverProcess: any = null;
  private requestId = 0;
  private responses = new Map<number, (response: MCPResponse) => void>();
  private connected = false;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ENABLE_WEB_INTERFACE: 'false' }
      });

      let responseBuffer = '';

      this.serverProcess.stdout.on('data', (data: Buffer) => {
        const text = data.toString();
        responseBuffer += text;

        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line.trim());
              if (response.id !== undefined && this.responses.has(response.id)) {
                const callback = this.responses.get(response.id)!;
                this.responses.delete(response.id);
                callback(response);
              }
            } catch (error) {
              // Ignore non-JSON output
            }
          }
        }
      });

      this.serverProcess.stderr.on('data', (data: Buffer) => {
        console.error('Server stderr:', data.toString());
      });

      this.serverProcess.on('error', (error: Error) => {
        reject(error);
      });

      // Initialize the MCP server connection
      this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          experimental: {},
          sampling: {}
        },
        clientInfo: {
          name: 'tool-parity-integration-test',
          version: '1.0.0'
        }
      }).then(() => {
        this.connected = true;
        resolve();
      }).catch(reject);
    });
  }

  async disconnect(): Promise<void> {
    if (this.serverProcess && !this.serverProcess.killed) {
      this.serverProcess.kill();
      this.connected = false;
    }
  }

  private async sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      
      this.responses.set(id, (response: MCPResponse) => {
        if (response.error) {
          reject(new Error(response.error.message || 'MCP Error'));
        } else {
          resolve(response.result);
        }
      });

      const request = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params
      });

      this.serverProcess.stdin.write(request + '\n');

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.responses.has(id)) {
          this.responses.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  async callTool(name: string, arguments_: Record<string, any>): Promise<{ result: any, time: number }> {
    const startTime = performance.now();
    
    try {
      const result = await this.sendRequest('tools/call', {
        name,
        arguments: arguments_
      });
      
      const endTime = performance.now();
      return {
        result,
        time: endTime - startTime
      };
    } catch (error) {
      const endTime = performance.now();
      throw error;
    }
  }
}

describe('Tool Parity Tests', () => {
  let client: MCPToolParityClient;
  const testResults: ToolParityTestResult[] = [];

  beforeAll(async () => {
    client = new MCPToolParityClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
    
    // Report overall statistics
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.matches).length;
    const accuracy = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    
    console.log('\n=== Tool Parity Test Summary ===');
    console.log(`Total comparisons: ${totalTests}`);
    console.log(`Matching outputs: ${passedTests}`);
    console.log(`Parity accuracy: ${accuracy.toFixed(1)}%`);
    console.log(`Target: 95.0%`);
    console.log(`Status: ${accuracy >= 95 ? 'PASSED' : 'FAILED'}`);
    
    if (accuracy < 95) {
      console.log('\nFailed comparisons:');
      testResults
        .filter(r => !r.matches)
        .forEach(r => console.log(`- ${r.tool}/${r.scenario}: Legacy vs Consolidated mismatch`));
    }
  });

  describe('Search Tool Parity', () => {
    const searchScenarios = [
      {
        name: 'basic-text-search',
        legacyTool: 'quick_search',
        legacyParams: { query: 'test', maxResults: 5 },
        consolidatedTool: 'search',
        consolidatedParams: { query: 'test', maxResults: 5, mode: 'quick' }
      },
      {
        name: 'content-type-search',
        legacyTool: 'search_by_content_type',
        legacyParams: { contentType: 'Article', maxResults: 3 },
        consolidatedTool: 'search',
        consolidatedParams: { contentType: 'Article', maxResults: 3, mode: 'content_type' }
      },
      {
        name: 'recent-search',
        legacyTool: 'search_recent',
        legacyParams: { days: 7, maxResults: 5 },
        consolidatedTool: 'search',
        consolidatedParams: { days: 7, maxResults: 5, mode: 'recent' }
      },
      {
        name: 'pattern-search',
        legacyTool: 'find_notes_by_pattern',
        legacyParams: { pattern: '**/*test*.md' },
        consolidatedTool: 'search',
        consolidatedParams: { pattern: '**/*test*.md', mode: 'pattern' }
      },
      {
        name: 'advanced-search',
        legacyTool: 'advanced_search',
        legacyParams: { query: 'example', contentType: 'Article', maxResults: 5 },
        consolidatedTool: 'search',
        consolidatedParams: { query: 'example', contentType: 'Article', maxResults: 5, mode: 'advanced' }
      },
      {
        name: 'metadata-search',
        legacyTool: 'search_notes',
        legacyParams: { contentType: 'Daily Note', category: 'Personal' },
        consolidatedTool: 'search',
        consolidatedParams: { contentType: 'Daily Note', category: 'Personal', mode: 'auto' }
      }
    ];

    searchScenarios.forEach(scenario => {
      it(`should match ${scenario.name} between legacy and consolidated tools`, async () => {
        try {
          // Call legacy tool
          const legacyResponse = await client.callTool(scenario.legacyTool, scenario.legacyParams);
          
          // Call consolidated tool
          const consolidatedResponse = await client.callTool(scenario.consolidatedTool, scenario.consolidatedParams);

          // Compare results (normalize for comparison)
          const legacyContent = normalizeToolOutput(legacyResponse.result);
          const consolidatedContent = normalizeToolOutput(consolidatedResponse.result);
          
          const matches = deepEquals(legacyContent, consolidatedContent);
          
          // Record test result
          testResults.push({
            tool: 'search',
            scenario: scenario.name,
            legacyResult: legacyContent,
            consolidatedResult: consolidatedContent,
            matches,
            timeDiff: Math.abs(legacyResponse.time - consolidatedResponse.time),
            legacyTime: legacyResponse.time,
            consolidatedTime: consolidatedResponse.time
          });

          if (!matches && process.env.VERBOSE_TESTS) {
            console.log(`\nMismatch in ${scenario.name}:`);
            console.log('Legacy:', JSON.stringify(legacyContent, null, 2));
            console.log('Consolidated:', JSON.stringify(consolidatedContent, null, 2));
          }

          expect(matches).toBe(true);
        } catch (error) {
          console.error(`Error testing ${scenario.name}:`, error);
          throw error;
        }
      });
    });
  });

  describe('Creation Tool Parity', () => {
    const creationScenarios = [
      {
        name: 'basic-note-creation',
        legacyTool: 'create_note',
        legacyParams: { 
          title: 'Test Parity Note',
          content: 'Test content for parity validation',
          contentType: 'Reference',
          tags: ['test', 'parity']
        },
        consolidatedTool: 'create_note_smart',
        consolidatedParams: { 
          title: 'Test Parity Note Smart',
          content: 'Test content for parity validation',
          contentType: 'Reference',
          tags: ['test', 'parity'],
          auto_template: false
        }
      },
      {
        name: 'template-based-creation',
        legacyTool: 'create_note_from_template',
        legacyParams: { 
          title: 'Test Restaurant Legacy',
          template: 'restaurant',
          customData: { cuisine: 'Italian', location: 'Toronto' }
        },
        consolidatedTool: 'create_note_smart',
        consolidatedParams: { 
          title: 'Test Restaurant Smart',
          template: 'restaurant',
          customData: { cuisine: 'Italian', location: 'Toronto' },
          auto_template: false
        }
      }
    ];

    creationScenarios.forEach(scenario => {
      it(`should match ${scenario.name} output format and metadata`, async () => {
        try {
          // Call legacy tool
          const legacyResponse = await client.callTool(scenario.legacyTool, scenario.legacyParams);
          
          // Call consolidated tool
          const consolidatedResponse = await client.callTool(scenario.consolidatedTool, scenario.consolidatedParams);

          // Compare output structure (not file creation, just response format)
          const legacyContent = normalizeCreationOutput(legacyResponse.result);
          const consolidatedContent = normalizeCreationOutput(consolidatedResponse.result);
          
          const structureMatches = compareCreationStructure(legacyContent, consolidatedContent);
          
          // Record test result
          testResults.push({
            tool: 'creation',
            scenario: scenario.name,
            legacyResult: legacyContent,
            consolidatedResult: consolidatedContent,
            matches: structureMatches,
            timeDiff: Math.abs(legacyResponse.time - consolidatedResponse.time),
            legacyTime: legacyResponse.time,
            consolidatedTime: consolidatedResponse.time
          });

          expect(structureMatches).toBe(true);
        } catch (error) {
          console.error(`Error testing ${scenario.name}:`, error);
          throw error;
        }
      });
    });
  });

  describe('Listing Tool Parity', () => {
    const listingScenarios = [
      {
        name: 'folders-listing',
        legacyTool: 'list_folders',
        legacyParams: { path: '/' },
        consolidatedTool: 'list',
        consolidatedParams: { type: 'folders', path: '/' }
      },
      {
        name: 'templates-listing',
        legacyTool: 'list_templates',
        legacyParams: {},
        consolidatedTool: 'list',
        consolidatedParams: { type: 'templates' }
      },
      {
        name: 'daily-notes-listing',
        legacyTool: 'list_daily_notes',
        legacyParams: { limit: 5 },
        consolidatedTool: 'list',
        consolidatedParams: { type: 'daily_notes', limit: 5 }
      },
      {
        name: 'yaml-properties-listing',
        legacyTool: 'list_yaml_properties',
        legacyParams: { includeCount: true, sortBy: 'usage' },
        consolidatedTool: 'list',
        consolidatedParams: { type: 'yaml_properties', includeCount: true, sortBy: 'usage' }
      }
    ];

    listingScenarios.forEach(scenario => {
      it(`should match ${scenario.name} between legacy and consolidated tools`, async () => {
        try {
          // Call legacy tool
          const legacyResponse = await client.callTool(scenario.legacyTool, scenario.legacyParams);
          
          // Call consolidated tool
          const consolidatedResponse = await client.callTool(scenario.consolidatedTool, scenario.consolidatedParams);

          // Compare results
          const legacyContent = normalizeToolOutput(legacyResponse.result);
          const consolidatedContent = normalizeToolOutput(consolidatedResponse.result);
          
          const matches = deepEquals(legacyContent, consolidatedContent);
          
          // Record test result
          testResults.push({
            tool: 'listing',
            scenario: scenario.name,
            legacyResult: legacyContent,
            consolidatedResult: consolidatedContent,
            matches,
            timeDiff: Math.abs(legacyResponse.time - consolidatedResponse.time),
            legacyTime: legacyResponse.time,
            consolidatedTime: consolidatedResponse.time
          });

          expect(matches).toBe(true);
        } catch (error) {
          console.error(`Error testing ${scenario.name}:`, error);
          throw error;
        }
      });
    });
  });

  describe('Performance Regression Tests', () => {
    it('should not have significant performance degradation', async () => {
      const performanceResults = testResults.filter(r => r.timeDiff > 0);
      
      if (performanceResults.length === 0) {
        return; // No performance data to analyze
      }

      const avgTimeDiff = performanceResults.reduce((sum, r) => sum + r.timeDiff, 0) / performanceResults.length;
      const maxAcceptableDiff = 500; // 500ms maximum acceptable difference
      
      console.log(`\nPerformance Analysis:`);
      console.log(`Average time difference: ${avgTimeDiff.toFixed(2)}ms`);
      console.log(`Maximum acceptable: ${maxAcceptableDiff}ms`);
      
      expect(avgTimeDiff).toBeLessThan(maxAcceptableDiff);
    });
  });

  describe('Error Handling Parity', () => {
    const errorScenarios = [
      {
        name: 'invalid-search-params',
        legacyTool: 'quick_search',
        legacyParams: { query: '', maxResults: -1 },
        consolidatedTool: 'search',
        consolidatedParams: { query: '', maxResults: -1, mode: 'quick' }
      },
      {
        name: 'missing-required-params',
        legacyTool: 'create_note',
        legacyParams: { content: 'No title provided' },
        consolidatedTool: 'create_note_smart',
        consolidatedParams: { content: 'No title provided' }
      }
    ];

    errorScenarios.forEach(scenario => {
      it(`should handle ${scenario.name} consistently`, async () => {
        let legacyError: any = null;
        let consolidatedError: any = null;

        try {
          await client.callTool(scenario.legacyTool, scenario.legacyParams);
        } catch (error) {
          legacyError = error;
        }

        try {
          await client.callTool(scenario.consolidatedTool, scenario.consolidatedParams);
        } catch (error) {
          consolidatedError = error;
        }

        // Both should either succeed or fail consistently
        const bothSucceeded = !legacyError && !consolidatedError;
        const bothFailed = legacyError && consolidatedError;
        
        expect(bothSucceeded || bothFailed).toBe(true);
        
        if (bothFailed) {
          // Error types should be similar
          expect(typeof legacyError.message).toBe(typeof consolidatedError.message);
        }
      });
    });
  });
});

// Utility functions for result comparison
function normalizeToolOutput(output: any): any {
  if (!output || !output.content) return output;
  
  // Normalize MCP response format
  const content = output.content;
  if (Array.isArray(content)) {
    return content.map((item: any) => {
      if (item.type === 'text') {
        return { type: 'text', text: item.text };
      }
      return item;
    });
  }
  
  return content;
}

function normalizeCreationOutput(output: any): any {
  if (!output || !output.content) return output;
  
  // Focus on structure, not dynamic content like timestamps
  const content = output.content;
  if (Array.isArray(content)) {
    return content.map((item: any) => {
      if (item.type === 'text' && item.text) {
        // Remove dynamic elements like file paths and timestamps
        const normalized = item.text
          .replace(/Created: .+\.md/, 'Created: [FILE]')
          .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, '[TIMESTAMP]')
          .replace(/\/Users\/[^/]+\//, '/Users/[USER]/');
        return { type: 'text', text: normalized };
      }
      return item;
    });
  }
  
  return content;
}

function compareCreationStructure(legacy: any, consolidated: any): boolean {
  // Compare structure and key elements, not exact content
  if (!legacy || !consolidated) return false;
  
  const legacyText = JSON.stringify(legacy);
  const consolidatedText = JSON.stringify(consolidated);
  
  // Check for key structural elements
  const requiredElements = ['Created:', 'YAML frontmatter', 'successfully'];
  
  return requiredElements.every(element => 
    legacyText.includes(element) && consolidatedText.includes(element)
  );
}

function deepEquals(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEquals(obj1[i], obj2[i])) return false;
    }
    return true;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEquals(obj1[key], obj2[key])) return false;
  }
  
  return true;
}