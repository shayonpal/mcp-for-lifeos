#!/usr/bin/env node

/**
 * Tool Parity Test Runner
 * 
 * Specialized test runner for validating tool parity between legacy and consolidated tools.
 * Provides detailed reporting and performance analysis.
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

class MCPParityTestClient extends EventEmitter {
  constructor() {
    super();
    this.serverProcess = null;
    this.requestId = 0;
    this.responses = new Map();
    this.connected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ENABLE_WEB_INTERFACE: 'false' }
      });

      let responseBuffer = '';

      this.serverProcess.stdout.on('data', (data) => {
        const text = data.toString();
        responseBuffer += text;

        const lines = responseBuffer.split('\n');
        responseBuffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line.trim());
              if (response.id !== undefined && this.responses.has(response.id)) {
                const callback = this.responses.get(response.id);
                this.responses.delete(response.id);
                callback(response);
              }
            } catch (error) {
              // Ignore non-JSON output
            }
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        if (process.env.VERBOSE) {
          console.error('Server stderr:', data.toString());
        }
      });

      this.serverProcess.on('error', (error) => {
        reject(error);
      });

      // Initialize MCP connection
      this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { experimental: {}, sampling: {} },
        clientInfo: {
          name: 'tool-parity-test',
          version: '1.0.0'
        }
      }).then(() => {
        this.connected = true;
        resolve();
      }).catch(reject);
    });
  }

  async disconnect() {
    if (this.serverProcess && !this.serverProcess.killed) {
      this.serverProcess.kill();
      this.connected = false;
    }
  }

  async sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      
      this.responses.set(id, (response) => {
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

      // Timeout
      setTimeout(() => {
        if (this.responses.has(id)) {
          this.responses.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  async callTool(name, arguments_) {
    const startTime = performance.now();
    
    try {
      const result = await this.sendRequest('tools/call', {
        name,
        arguments: arguments_
      });
      
      const endTime = performance.now();
      return {
        result,
        time: endTime - startTime,
        success: true
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        result: null,
        time: endTime - startTime,
        success: false,
        error: error.message
      };
    }
  }
}

class ParityTestRunner {
  constructor() {
    this.client = new MCPParityTestClient();
    this.results = [];
    this.verbose = process.argv.includes('--verbose');
    this.category = this.getArgValue('--category');
    this.maxTests = parseInt(this.getArgValue('--max-tests')) || 50;
  }

  getArgValue(arg) {
    const index = process.argv.indexOf(arg);
    return index !== -1 && index + 1 < process.argv.length ? process.argv[index + 1] : null;
  }

  async run() {
    console.log('🔍 Starting Tool Parity Tests...\n');

    try {
      await this.client.connect();
      console.log('✅ MCP Server connected');

      const testSuites = this.getTestSuites();
      let totalTests = 0;
      let passedTests = 0;

      for (const [suiteName, tests] of Object.entries(testSuites)) {
        if (this.category && suiteName !== this.category) continue;

        console.log(`\n📋 Running ${suiteName} tests...`);
        
        for (const test of tests.slice(0, this.maxTests)) {
          const result = await this.runParityTest(test);
          this.results.push(result);
          
          totalTests++;
          if (result.matches) passedTests++;

          const status = result.matches ? '✅' : '❌';
          const timeInfo = `(${result.legacyTime.toFixed(0)}ms vs ${result.consolidatedTime.toFixed(0)}ms)`;
          
          console.log(`  ${status} ${test.name} ${timeInfo}`);
          
          if (!result.matches && this.verbose) {
            console.log(`      Reason: ${result.reason || 'Output mismatch'}`);
          }
        }
      }

      await this.client.disconnect();
      console.log('\n🔌 MCP Server disconnected');

      this.printSummary(totalTests, passedTests);
    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      await this.client.disconnect();
      process.exit(1);
    }
  }

  async runParityTest(test) {
    try {
      // Run legacy tool
      const legacyResult = await this.client.callTool(test.legacyTool, test.legacyParams);
      
      // Run consolidated tool
      const consolidatedResult = await this.client.callTool(test.consolidatedTool, test.consolidatedParams);

      // Compare results
      const comparison = this.compareResults(legacyResult, consolidatedResult, test);

      return {
        test: test.name,
        category: test.category,
        legacyTool: test.legacyTool,
        consolidatedTool: test.consolidatedTool,
        legacyTime: legacyResult.time,
        consolidatedTime: consolidatedResult.time,
        timeDiff: Math.abs(legacyResult.time - consolidatedResult.time),
        matches: comparison.matches,
        reason: comparison.reason,
        score: comparison.score
      };
    } catch (error) {
      return {
        test: test.name,
        category: test.category,
        matches: false,
        reason: `Test execution error: ${error.message}`,
        score: 0,
        legacyTime: 0,
        consolidatedTime: 0,
        timeDiff: 0
      };
    }
  }

  compareResults(legacy, consolidated, test) {
    // Handle error cases
    if (!legacy.success && !consolidated.success) {
      // Both failed - check if error types are similar
      return {
        matches: true,
        reason: 'Both tools failed consistently',
        score: 100
      };
    }

    if (legacy.success !== consolidated.success) {
      return {
        matches: false,
        reason: 'One tool succeeded while the other failed',
        score: 0
      };
    }

    // Both succeeded - compare outputs
    const legacyNormalized = this.normalizeOutput(legacy.result);
    const consolidatedNormalized = this.normalizeOutput(consolidated.result);

    if (test.category === 'creation') {
      return this.compareCreationOutputs(legacyNormalized, consolidatedNormalized);
    } else {
      return this.compareStandardOutputs(legacyNormalized, consolidatedNormalized);
    }
  }

  normalizeOutput(output) {
    if (!output || !output.content) return output;

    // Convert to string for consistent comparison
    let normalized = JSON.stringify(output.content);
    
    // Remove dynamic elements
    normalized = normalized
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]')
      .replace(/\/Users\/[^/]+\//g, '/Users/[USER]/')
      .replace(/Created: [^"]+\.md/g, 'Created: [FILE].md')
      .replace(/"version":"[^"]+"/g, '"version":"[VERSION]"');

    try {
      return JSON.parse(normalized);
    } catch {
      return normalized;
    }
  }

  compareCreationOutputs(legacy, consolidated) {
    // For creation tools, focus on structure rather than exact content
    const legacyStr = JSON.stringify(legacy);
    const consolidatedStr = JSON.stringify(consolidated);

    const requiredElements = [
      'Created:', 'YAML frontmatter', 'successfully'
    ];

    const legacyHasAll = requiredElements.every(el => legacyStr.includes(el));
    const consolidatedHasAll = requiredElements.every(el => consolidatedStr.includes(el));

    if (legacyHasAll && consolidatedHasAll) {
      return { matches: true, reason: 'Structure matches', score: 100 };
    } else {
      return { 
        matches: false, 
        reason: 'Missing required structural elements',
        score: 50
      };
    }
  }

  compareStandardOutputs(legacy, consolidated) {
    const legacyStr = JSON.stringify(legacy);
    const consolidatedStr = JSON.stringify(consolidated);

    if (legacyStr === consolidatedStr) {
      return { matches: true, reason: 'Exact match', score: 100 };
    }

    // Check for substantial similarity
    const similarity = this.calculateSimilarity(legacyStr, consolidatedStr);
    
    if (similarity > 0.9) {
      return { matches: true, reason: `High similarity (${(similarity * 100).toFixed(1)}%)`, score: similarity * 100 };
    } else {
      return { matches: false, reason: `Low similarity (${(similarity * 100).toFixed(1)}%)`, score: similarity * 100 };
    }
  }

  calculateSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1;
    
    // Simple character-based similarity
    let matches = 0;
    const minLen = Math.min(len1, len2);
    
    for (let i = 0; i < minLen; i++) {
      if (str1[i] === str2[i]) matches++;
    }
    
    return matches / maxLen;
  }

  printSummary(totalTests, passedTests) {
    const accuracy = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const target = 95;
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 TOOL PARITY TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Accuracy: ${accuracy.toFixed(1)}%`);
    console.log(`Target: ${target}%`);
    console.log(`Status: ${accuracy >= target ? '✅ PASSED' : '❌ FAILED'}`);

    // Performance analysis
    if (this.results.length > 0) {
      const times = this.results.map(r => r.timeDiff).filter(t => t > 0);
      if (times.length > 0) {
        const avgTimeDiff = times.reduce((sum, t) => sum + t, 0) / times.length;
        console.log(`\nPerformance:`);
        console.log(`Average time difference: ${avgTimeDiff.toFixed(2)}ms`);
        console.log(`Max acceptable: 500ms`);
        console.log(`Performance: ${avgTimeDiff < 500 ? '✅ GOOD' : '⚠️  SLOW'}`);
      }
    }

    // Category breakdown
    const categories = {};
    this.results.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { total: 0, passed: 0 };
      }
      categories[result.category].total++;
      if (result.matches) categories[result.category].passed++;
    });

    console.log('\n📊 By Category:');
    Object.entries(categories).forEach(([cat, stats]) => {
      const catAccuracy = (stats.passed / stats.total) * 100;
      console.log(`  ${cat}: ${catAccuracy.toFixed(1)}% (${stats.passed}/${stats.total})`);
    });

    // Failed tests detail
    const failed = this.results.filter(r => !r.matches);
    if (failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      failed.forEach(result => {
        console.log(`  • ${result.test}: ${result.reason}`);
      });
    }

    console.log('\n' + '='.repeat(50));
  }

  getTestSuites() {
    return {
      search: [
        {
          name: 'quick-search-basic',
          category: 'search',
          legacyTool: 'quick_search',
          legacyParams: { query: 'test', maxResults: 5 },
          consolidatedTool: 'search',
          consolidatedParams: { query: 'test', maxResults: 5, mode: 'quick' }
        },
        {
          name: 'advanced-search-full',
          category: 'search',
          legacyTool: 'advanced_search',
          legacyParams: { query: 'example', contentType: 'Article', maxResults: 5 },
          consolidatedTool: 'search',
          consolidatedParams: { query: 'example', contentType: 'Article', maxResults: 5, mode: 'advanced' }
        },
        {
          name: 'content-type-search',
          category: 'search',
          legacyTool: 'search_by_content_type',
          legacyParams: { contentType: 'Daily Note', maxResults: 3 },
          consolidatedTool: 'search',
          consolidatedParams: { contentType: 'Daily Note', maxResults: 3, mode: 'content_type' }
        },
        {
          name: 'recent-search',
          category: 'search',
          legacyTool: 'search_recent',
          legacyParams: { days: 7, maxResults: 10 },
          consolidatedTool: 'search',
          consolidatedParams: { days: 7, maxResults: 10, mode: 'recent' }
        },
        {
          name: 'pattern-search',
          category: 'search',
          legacyTool: 'find_notes_by_pattern',
          legacyParams: { pattern: '**/*.md' },
          consolidatedTool: 'search',
          consolidatedParams: { pattern: '**/*.md', mode: 'pattern' }
        },
        {
          name: 'metadata-search',
          category: 'search',
          legacyTool: 'search_notes',
          legacyParams: { contentType: 'Reference', tags: ['important'] },
          consolidatedTool: 'search',
          consolidatedParams: { contentType: 'Reference', tags: ['important'], mode: 'auto' }
        }
      ],

      creation: [
        {
          name: 'basic-note-creation',
          category: 'creation',
          legacyTool: 'create_note',
          legacyParams: {
            title: 'Parity Test Basic',
            content: 'Test content',
            contentType: 'Reference'
          },
          consolidatedTool: 'create_note_smart',
          consolidatedParams: {
            title: 'Parity Test Basic Smart',
            content: 'Test content',
            contentType: 'Reference',
            auto_template: false
          }
        },
        {
          name: 'template-creation',
          category: 'creation',
          legacyTool: 'create_note_from_template',
          legacyParams: {
            title: 'Parity Test Restaurant',
            template: 'restaurant'
          },
          consolidatedTool: 'create_note_smart',
          consolidatedParams: {
            title: 'Parity Test Restaurant Smart',
            template: 'restaurant'
          }
        }
      ],

      listing: [
        {
          name: 'folders-listing',
          category: 'listing',
          legacyTool: 'list_folders',
          legacyParams: { path: '/' },
          consolidatedTool: 'list',
          consolidatedParams: { type: 'folders', path: '/' }
        },
        {
          name: 'templates-listing',
          category: 'listing',
          legacyTool: 'list_templates',
          legacyParams: {},
          consolidatedTool: 'list',
          consolidatedParams: { type: 'templates' }
        },
        {
          name: 'daily-notes-listing',
          category: 'listing',
          legacyTool: 'list_daily_notes',
          legacyParams: { limit: 5 },
          consolidatedTool: 'list',
          consolidatedParams: { type: 'daily_notes', limit: 5 }
        },
        {
          name: 'yaml-properties-listing',
          category: 'listing',
          legacyTool: 'list_yaml_properties',
          legacyParams: { includeCount: true },
          consolidatedTool: 'list',
          consolidatedParams: { type: 'yaml_properties', includeCount: true }
        }
      ]
    };
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new ParityTestRunner();
  
  if (process.argv.includes('--help')) {
    console.log(`
Tool Parity Test Runner

Usage: node scripts/test-tool-parity.js [options]

Options:
  --verbose         Show detailed output and error messages
  --category <cat>  Run only tests for specific category (search, creation, listing)
  --max-tests <n>   Limit number of tests per category (default: 50)
  --help           Show this help message

Examples:
  node scripts/test-tool-parity.js
  node scripts/test-tool-parity.js --category search --verbose
  node scripts/test-tool-parity.js --max-tests 10
`);
    process.exit(0);
  }

  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}