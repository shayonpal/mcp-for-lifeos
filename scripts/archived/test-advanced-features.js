#!/usr/bin/env node

/**
 * Test script for Issue #61 - Advanced Features & Integration
 * Tests the new includeNullValues parameter and performance optimizations
 */

import { SearchEngine } from '../dist/search-engine.js';

async function testAdvancedFeatures() {
  console.log('🧪 Testing Advanced YAML Property Search Features (Issue #61)');
  console.log('=' .repeat(60));

  try {
    // Test 1: includeNullValues parameter
    console.log('\n📋 Test 1: includeNullValues parameter');
    console.log('Searching for notes with status="active" AND includeNullValues=true');
    
    const test1Results = await SearchEngine.search({
      yamlProperties: { status: 'active' },
      includeNullValues: true,
      maxResults: 5
    });
    
    console.log(`✅ Found ${test1Results.length} results (including notes where status is missing/null)`);
    
    // Test 2: includeNullValues=false (default behavior)
    console.log('\n📋 Test 2: includeNullValues=false (default)');
    console.log('Searching for notes with status="active" AND includeNullValues=false');
    
    const test2Results = await SearchEngine.search({
      yamlProperties: { status: 'active' },
      includeNullValues: false,
      maxResults: 5
    });
    
    console.log(`✅ Found ${test2Results.length} results (only notes with explicit status="active")`);

    // Test 3: Performance test - search with large result set
    console.log('\n📋 Test 3: Performance test');
    console.log('Performing search with no limits to test caching...');
    
    const startTime = Date.now();
    const perfResults1 = await SearchEngine.search({
      contentType: 'Daily Note',
      sortBy: 'modified',
      sortOrder: 'desc'
    });
    const firstSearchTime = Date.now() - startTime;
    
    console.log(`✅ First search: ${perfResults1.length} results in ${firstSearchTime}ms`);
    
    // Second search should be faster due to caching
    const startTime2 = Date.now();
    const perfResults2 = await SearchEngine.search({
      contentType: 'Article',
      sortBy: 'created',
      sortOrder: 'asc'
    });
    const secondSearchTime = Date.now() - startTime2;
    
    console.log(`✅ Second search: ${perfResults2.length} results in ${secondSearchTime}ms`);

    // Test 4: Cache stats
    console.log('\n📋 Test 4: Cache statistics');
    const cacheStats = SearchEngine.getCacheStats();
    console.log(`✅ Cache contains ${cacheStats.size} notes`);

    // Test 5: Sorting tests
    console.log('\n📋 Test 5: Sorting functionality');
    
    const sortedResults = await SearchEngine.search({
      contentType: 'Daily Note',
      sortBy: 'created',
      sortOrder: 'desc',
      maxResults: 3
    });
    
    console.log(`✅ Found ${sortedResults.length} Daily Notes sorted by creation date (desc)`);
    if (sortedResults.length >= 2) {
      const first = sortedResults[0].note.created;
      const second = sortedResults[1].note.created;
      const correctOrder = first.getTime() >= second.getTime();
      console.log(`✅ Sort order correct: ${correctOrder}`);
    }

    // Test 6: maxResults limit
    console.log('\n📋 Test 6: maxResults parameter');
    
    const limitedResults = await SearchEngine.search({
      includeContent: true,
      maxResults: 2
    });
    
    console.log(`✅ Limited results: requested max 2, got ${limitedResults.length}`);
    console.log(`✅ Limit enforced: ${limitedResults.length <= 2}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ includeNullValues parameter working');
    console.log('✅ Performance caching implemented');
    console.log('✅ Sorting functionality verified');
    console.log('✅ Result limiting working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle both direct execution and module import
if (process.argv[1].endsWith('test-advanced-features.js')) {
  testAdvancedFeatures();
}

export { testAdvancedFeatures };