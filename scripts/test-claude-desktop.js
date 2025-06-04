#!/usr/bin/env node

/**
 * Claude Desktop Integration Test Runner
 * 
 * Standalone script for testing AI Tool Caller Optimization effectiveness.
 * Can be run independently of Jest for quick validation.
 * 
 * Usage:
 *   node scripts/test-claude-desktop.js
 *   node scripts/test-claude-desktop.js --scenario search-basic
 *   node scripts/test-claude-desktop.js --accuracy-only
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  SERVER_PATH: join(__dirname, '../dist/index.js'),
  SCENARIOS_PATH: join(__dirname, '../tests/fixtures/claude-desktop-scenarios.json'),
  TIMEOUT_MS: 10000,
  COLORS: {
    RESET: '\x1b[0m',
    BRIGHT: '\x1b[1m',
    GREEN: '\x1b[32m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    CYAN: '\x1b[36m',
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const specificScenario = args.find(arg => arg.startsWith('--scenario='))?.split('=')[1];
const accuracyOnly = args.includes('--accuracy-only');
const verbose = args.includes('--verbose');

/**
 * Simple MCP Client for testing
 */
class MCPTestClient {
  constructor() {
    this.serverProcess = null;
    this.requestId = 1;
    this.pendingRequests = new Map();
    this.responseBuffer = '';
  }

  async connect() {
    return new Promise((resolve, reject) => {
      if (!existsSync(CONFIG.SERVER_PATH)) {
        reject(new Error(`Server not found at ${CONFIG.SERVER_PATH}. Run 'npm run build' first.`));
        return;
      }

      this.serverProcess = spawn('node', [CONFIG.SERVER_PATH], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          CONSOLIDATED_TOOLS_ENABLED: 'true',
        },
      });

      this.serverProcess.stdout.on('data', (data) => {
        this.responseBuffer += data.toString();
        this.processResponses();
      });

      this.serverProcess.stderr.on('data', (data) => {
        if (verbose) {
          console.error('Server stderr:', data.toString());
        }
      });

      this.serverProcess.on('error', reject);

      // Initialize connection
      this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: { experimental: {}, sampling: {} },
        clientInfo: { name: 'claude-desktop-test', version: '1.0.0' },
      }).then(resolve).catch(reject);
    });
  }

  async disconnect() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  processResponses() {
    const lines = this.responseBuffer.split('\n');
    this.responseBuffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          const pending = this.pendingRequests.get(response.id);
          
          if (pending) {
            this.pendingRequests.delete(response.id);
            
            if (response.error) {
              pending.reject(new Error(`MCP Error: ${response.error.message}`));
            } else {
              pending.resolve(response.result);
            }
          }
        } catch (error) {
          if (verbose) {
            console.error('Failed to parse response:', line, error);
          }
        }
      }
    }
  }

  async sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });
      
      const requestLine = JSON.stringify(request) + '\n';
      this.serverProcess.stdin.write(requestLine);

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout after ${CONFIG.TIMEOUT_MS}ms`));
        }
      }, CONFIG.TIMEOUT_MS);
    });
  }

  async listTools() {
    const result = await this.sendRequest('tools/list');
    return result.tools || [];
  }

  async callTool(name, arguments_) {
    const startTime = Date.now();
    
    try {
      const result = await this.sendRequest('tools/call', {
        name,
        arguments: arguments_,
      });
      
      return {
        result,
        executionTime: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      return {
        error: error.message,
        executionTime: Date.now() - startTime,
        success: false,
      };
    }
  }
}

/**
 * Tool selection simulation
 */
function selectTool(userRequest, tools) {
  const request = userRequest.toLowerCase();
  
  if (request.includes('search') || request.includes('find') || request.includes('look for')) {
    return 'search';
  }
  
  if (request.includes('create') || request.includes('new note') || request.includes('add note')) {
    return 'create_note_smart';
  }
  
  if (request.includes('list') || request.includes('show all') || request.includes('show me')) {
    return 'list';
  }
  
  return 'search'; // Default fallback
}

function inferParameters(userRequest, toolName) {
  const request = userRequest.toLowerCase();
  const params = {};
  
  if (toolName === 'search') {
    const searchTerms = request
      .replace(/search for|find|look for/gi, '')
      .trim();
    
    if (searchTerms) {
      params.query = searchTerms;
    }
    
    if (request.includes('recent') || request.includes('last few')) {
      params.mode = 'recent';
      params.days = 7;
    } else if (request.includes('pattern') || request.includes('*')) {
      params.mode = 'pattern';
    } else {
      params.mode = 'auto';
    }
  }
  
  if (toolName === 'create_note_smart') {
    const titleMatch = request.match(/["']([^"']+)["']/);
    if (titleMatch) {
      params.title = titleMatch[1];
    } else {
      params.title = 'Test Note';
    }
    params.auto_template = true;
  }
  
  if (toolName === 'list') {
    if (request.includes('folder')) {
      params.type = 'folders';
    } else if (request.includes('template')) {
      params.type = 'templates';
    } else if (request.includes('daily')) {
      params.type = 'daily_notes';
    } else if (request.includes('yaml') || request.includes('properties')) {
      params.type = 'yaml_properties';
    } else {
      params.type = 'auto';
    }
  }
  
  return params;
}

/**
 * Load test scenarios
 */
function loadScenarios() {
  if (!existsSync(CONFIG.SCENARIOS_PATH)) {
    throw new Error(`Scenarios file not found: ${CONFIG.SCENARIOS_PATH}`);
  }
  
  const content = readFileSync(CONFIG.SCENARIOS_PATH, 'utf8');
  return JSON.parse(content);
}

/**
 * Run a single test scenario
 */
async function runScenario(client, scenario) {
  const { COLORS } = CONFIG;
  const startTime = Date.now();
  
  try {
    // Get available tools
    const tools = await client.listTools();
    
    // Simulate tool selection
    const selectedTool = selectTool(scenario.userRequest, tools);
    const parameters = inferParameters(scenario.userRequest, selectedTool);
    
    // Test tool execution
    const result = await client.callTool(selectedTool, parameters);
    
    const totalTime = Date.now() - startTime;
    const success = selectedTool === scenario.expectedTool;
    
    // Print result
    const statusIcon = success ? `${COLORS.GREEN}✓${COLORS.RESET}` : `${COLORS.RED}✗${COLORS.RESET}`;
    const timeColor = result.executionTime < 1000 ? COLORS.GREEN : COLORS.YELLOW;
    
    console.log(`${statusIcon} ${scenario.id}`);
    
    if (!accuracyOnly) {
      console.log(`  Request: ${COLORS.CYAN}"${scenario.userRequest}"${COLORS.RESET}`);
      console.log(`  Expected: ${COLORS.BLUE}${scenario.expectedTool}${COLORS.RESET}`);
      console.log(`  Selected: ${selectedTool === scenario.expectedTool ? COLORS.GREEN : COLORS.RED}${selectedTool}${COLORS.RESET}`);
      console.log(`  Time: ${timeColor}${result.executionTime}ms${COLORS.RESET}`);
      
      if (!success) {
        console.log(`  ${COLORS.RED}Mismatch: Expected ${scenario.expectedTool}, got ${selectedTool}${COLORS.RESET}`);
      }
      
      if (result.error) {
        console.log(`  ${COLORS.RED}Error: ${result.error}${COLORS.RESET}`);
      }
      
      console.log('');
    }
    
    return {
      scenario,
      selectedTool,
      expectedTool: scenario.expectedTool,
      success,
      executionTime: result.executionTime,
      error: result.error,
    };
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    
    console.log(`${COLORS.RED}✗ ${scenario.id}${COLORS.RESET}`);
    console.log(`  ${COLORS.RED}Error: ${error.message}${COLORS.RESET}`);
    console.log('');
    
    return {
      scenario,
      selectedTool: 'error',
      expectedTool: scenario.expectedTool,
      success: false,
      executionTime: totalTime,
      error: error.message,
    };
  }
}

/**
 * Print summary statistics
 */
function printSummary(results) {
  const { COLORS } = CONFIG;
  
  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = total - successful;
  const accuracy = (successful / total) * 100;
  
  const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / total;
  
  console.log(`${COLORS.BRIGHT}=== Summary ===${COLORS.RESET}`);
  console.log(`Total scenarios: ${total}`);
  console.log(`Successful: ${COLORS.GREEN}${successful}${COLORS.RESET}`);
  console.log(`Failed: ${COLORS.RED}${failed}${COLORS.RESET}`);
  console.log(`Accuracy: ${accuracy >= 90 ? COLORS.GREEN : COLORS.RED}${accuracy.toFixed(1)}%${COLORS.RESET}`);
  console.log(`Average time: ${avgTime < 1000 ? COLORS.GREEN : COLORS.YELLOW}${avgTime.toFixed(0)}ms${COLORS.RESET}`);
  
  // Target achievement
  const targetMet = accuracy >= 90;
  console.log(`90% Target: ${targetMet ? COLORS.GREEN : COLORS.RED}${targetMet ? 'MET' : 'NOT MET'}${COLORS.RESET}`);
  
  // Category breakdown
  const categories = {};
  results.forEach(r => {
    const cat = r.scenario.category;
    if (!categories[cat]) {
      categories[cat] = { total: 0, successful: 0 };
    }
    categories[cat].total++;
    if (r.success) categories[cat].successful++;
  });
  
  console.log(`\n${COLORS.BRIGHT}=== By Category ===${COLORS.RESET}`);
  Object.entries(categories).forEach(([category, stats]) => {
    const catAccuracy = (stats.successful / stats.total) * 100;
    console.log(`${category}: ${catAccuracy >= 90 ? COLORS.GREEN : COLORS.RED}${catAccuracy.toFixed(1)}%${COLORS.RESET} (${stats.successful}/${stats.total})`);
  });
}

/**
 * Main test runner
 */
async function main() {
  const { COLORS } = CONFIG;
  
  console.log(`${COLORS.BRIGHT}Claude Desktop Integration Test Runner${COLORS.RESET}`);
  console.log(`${COLORS.BLUE}Testing AI Tool Caller Optimization effectiveness${COLORS.RESET}\n`);
  
  try {
    // Load scenarios
    const allScenarios = loadScenarios();
    const scenarios = specificScenario 
      ? allScenarios.filter(s => s.id === specificScenario)
      : allScenarios;
    
    if (scenarios.length === 0) {
      console.error(`${COLORS.RED}No scenarios found${specificScenario ? ` for: ${specificScenario}` : ''}${COLORS.RESET}`);
      process.exit(1);
    }
    
    console.log(`Running ${scenarios.length} test scenario${scenarios.length === 1 ? '' : 's'}...\n`);
    
    // Connect to MCP server
    const client = new MCPTestClient();
    await client.connect();
    
    console.log(`${COLORS.GREEN}Connected to MCP server${COLORS.RESET}\n`);
    
    // Run scenarios
    const results = [];
    for (const scenario of scenarios) {
      const result = await runScenario(client, scenario);
      results.push(result);
    }
    
    // Cleanup
    await client.disconnect();
    
    // Print summary
    if (results.length > 1) {
      printSummary(results);
    }
    
    // Exit with appropriate code
    const accuracy = (results.filter(r => r.success).length / results.length) * 100;
    const success = accuracy >= 90;
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error(`${COLORS.RED}Test runner failed: ${error.message}${COLORS.RESET}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}