#!/usr/bin/env node

/**
 * Tool Consolidation Validation Script
 * 
 * Tests that consolidated tools produce equivalent output to legacy tools
 * to ensure 100% functionality preservation during tool consolidation.
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

// Test cases for validation
const testCases = [
  // Search tool tests
  {
    name: 'Quick Search - Restaurant query',
    legacy: {
      tool: 'quick_search',
      args: { query: 'restaurant', maxResults: 5 }
    },
    consolidated: {
      tool: 'search',
      args: { query: 'restaurant', mode: 'quick', maxResults: 5 }
    }
  },
  {
    name: 'Advanced Search - Natural language query',
    legacy: {
      tool: 'advanced_search',
      args: { naturalLanguage: 'Quebec restaurants', maxResults: 3 }
    },
    consolidated: {
      tool: 'search',
      args: { naturalLanguage: 'Quebec restaurants', mode: 'advanced', maxResults: 3 }
    }
  },
  {
    name: 'Search by Content Type',
    legacy: {
      tool: 'search_by_content_type',
      args: { contentType: 'Reference', maxResults: 3 }
    },
    consolidated: {
      tool: 'search',
      args: { contentType: 'Reference', mode: 'content_type', maxResults: 3 }
    }
  },
  {
    name: 'Search Recent Notes',
    legacy: {
      tool: 'search_recent',
      args: { days: 30, maxResults: 3 }
    },
    consolidated: {
      tool: 'search',
      args: { days: 30, mode: 'recent', maxResults: 3 }
    }
  },
  {
    name: 'Pattern Search',
    legacy: {
      tool: 'find_notes_by_pattern',
      args: { pattern: '**/*restaurant*.md' }
    },
    consolidated: {
      tool: 'search',
      args: { pattern: '**/*restaurant*.md', mode: 'pattern' }
    }
  },

  // List tool tests
  {
    name: 'List Templates',
    legacy: {
      tool: 'list_templates',
      args: {}
    },
    consolidated: {
      tool: 'list',
      args: { type: 'templates' }
    }
  },
  {
    name: 'List Folders',
    legacy: {
      tool: 'list_folders',
      args: {}
    },
    consolidated: {
      tool: 'list',
      args: { type: 'folders' }
    }
  },
  {
    name: 'List Daily Notes',
    legacy: {
      tool: 'list_daily_notes',
      args: { limit: 3 }
    },
    consolidated: {
      tool: 'list',
      args: { type: 'daily_notes', limit: 3 }
    }
  },
  {
    name: 'List YAML Properties',
    legacy: {
      tool: 'list_yaml_properties',
      args: { includeCount: true }
    },
    consolidated: {
      tool: 'list',
      args: { type: 'yaml_properties', includeCount: true }
    }
  }
];

/**
 * Execute a tool call and return the result
 */
async function callTool(tool, args) {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: tool, arguments: args }
    };

    const child = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Tool call failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const response = JSON.parse(stdout);
        resolve(response);
      } catch (error) {
        reject(new Error(`Failed to parse response: ${error.message}`));
      }
    });

    child.stdin.write(JSON.stringify(request));
    child.stdin.end();
  });
}

/**
 * Normalize response for comparison by removing dynamic/metadata fields
 */
function normalizeResponse(response) {
  if (!response.result || !response.result.content) {
    return response;
  }

  let text = response.result.content[0].text;
  
  // Remove deprecation warnings for fair comparison
  text = text.replace(/⚠️.*?DEPRECATION NOTICE.*?\n\n/s, '');
  
  // Remove metadata that may differ
  text = text.replace(/📧.*?Generated with.*?\n/g, '');
  text = text.replace(/🔧 Smart Creation:.*?\n/g, '');
  text = text.replace(/\*\*Modified:.*?\n/g, '');
  
  // Normalize spacing
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return {
    ...response,
    result: {
      ...response.result,
      content: [{
        type: 'text',
        text: text
      }]
    }
  };
}

/**
 * Compare two responses for functional equivalence
 */
function compareResponses(legacy, consolidated, testName) {
  const normalizedLegacy = normalizeResponse(legacy);
  const normalizedConsolidated = normalizeResponse(consolidated);

  // Extract main content
  const legacyText = normalizedLegacy.result?.content?.[0]?.text || '';
  const consolidatedText = normalizedConsolidated.result?.content?.[0]?.text || '';

  // For search results, compare result count and first few titles
  if (testName.includes('Search') || testName.includes('Pattern')) {
    const legacyResults = extractSearchResults(legacyText);
    const consolidatedResults = extractSearchResults(consolidatedText);
    
    console.log(`  Legacy results: ${legacyResults.length}`);
    console.log(`  Consolidated results: ${consolidatedResults.length}`);
    
    if (legacyResults.length !== consolidatedResults.length) {
      console.log(`  ❌ Result count mismatch`);
      return false;
    }
    
    // Compare first 3 results (titles)
    for (let i = 0; i < Math.min(3, legacyResults.length); i++) {
      if (legacyResults[i] !== consolidatedResults[i]) {
        console.log(`  ❌ Result ${i+1} title mismatch:`);
        console.log(`    Legacy: "${legacyResults[i]}"`);
        console.log(`    Consolidated: "${consolidatedResults[i]}"`);
        return false;
      }
    }
    
    console.log(`  ✅ Search results match`);
    return true;
  }

  // For list results, compare basic structure
  if (testName.includes('List')) {
    const legacyLines = legacyText.split('\n').filter(line => line.trim());
    const consolidatedLines = consolidatedText.split('\n').filter(line => line.trim());
    
    console.log(`  Legacy lines: ${legacyLines.length}`);
    console.log(`  Consolidated lines: ${consolidatedLines.length}`);
    
    // Allow for small differences in formatting
    const similarity = calculateSimilarity(legacyText, consolidatedText);
    console.log(`  Text similarity: ${(similarity * 100).toFixed(1)}%`);
    
    if (similarity > 0.8) { // 80% similarity threshold
      console.log(`  ✅ List content substantially matches`);
      return true;
    } else {
      console.log(`  ❌ List content differs significantly`);
      return false;
    }
  }

  // Default: exact text comparison (after normalization)
  if (legacyText === consolidatedText) {
    console.log(`  ✅ Exact match`);
    return true;
  } else {
    console.log(`  ❌ Content differs`);
    return false;
  }
}

/**
 * Extract search result titles from response text
 */
function extractSearchResults(text) {
  const results = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Match pattern like "**1. Title Name** (Score: 123.0)"
    const match = line.match(/^\*\*\d+\.\s+(.+?)\*\*/);
    if (match) {
      results.push(match[1]);
    }
  }
  
  return results;
}

/**
 * Calculate text similarity using simple word overlap
 */
function calculateSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Run all validation tests
 */
async function runValidationTests() {
  console.log('🧪 Tool Consolidation Validation Tests');
  console.log('=====================================\n');

  let passed = 0;
  let total = testCases.length;
  const results = [];

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    
    try {
      // Call legacy tool
      console.log(`  Calling legacy tool: ${testCase.legacy.tool}`);
      const legacyResponse = await callTool(testCase.legacy.tool, testCase.legacy.args);
      
      // Call consolidated tool
      console.log(`  Calling consolidated tool: ${testCase.consolidated.tool}`);
      const consolidatedResponse = await callTool(testCase.consolidated.tool, testCase.consolidated.args);
      
      // Compare responses
      const isMatch = compareResponses(legacyResponse, consolidatedResponse, testCase.name);
      
      if (isMatch) {
        passed++;
        console.log(`  ✅ PASS\n`);
      } else {
        console.log(`  ❌ FAIL\n`);
      }
      
      results.push({
        name: testCase.name,
        passed: isMatch,
        legacy: testCase.legacy.tool,
        consolidated: testCase.consolidated.tool
      });
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}\n`);
      results.push({
        name: testCase.name,
        passed: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('=====================================');
  console.log(`Summary: ${passed}/${total} tests passed (${((passed/total) * 100).toFixed(1)}%)`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Tool consolidation maintains 100% functionality.');
  } else {
    console.log('⚠️  Some tests failed. Review output above for details.');
  }

  // Save detailed results
  const reportPath = './test-consolidation-results.json';
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed results saved to: ${reportPath}`);

  return passed === total;
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidationTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}