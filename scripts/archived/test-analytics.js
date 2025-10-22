#!/usr/bin/env node

/**
 * Test script for analytics functionality
 * Tests telemetry collection and dashboard data generation
 */

import { AnalyticsCollector } from '../dist/analytics/analytics-collector.js';
import { ToolRouter } from '../dist/tool-router.js';

async function testAnalytics() {
  console.log('🧪 Testing Analytics Implementation...\n');

  // Enable analytics for testing
  process.env.ENABLE_USAGE_ANALYTICS = 'true';

  // Create test analytics instance
  const analytics = AnalyticsCollector.getInstance();

  console.log('1. Testing basic metric recording...');
  
  // Test basic metric recording
  analytics.recordUsage({
    toolName: 'test_tool',
    executionTime: 45,
    success: true,
    cacheHit: true,
    searchMode: 'auto'
  });

  analytics.recordUsage({
    toolName: 'universal_search',
    executionTime: 123,
    success: true,
    resultCount: 12,
    searchMode: 'quick'
  });

  analytics.recordUsage({
    toolName: 'smart_create_note',
    executionTime: 89,
    success: true,
    routingDecision: 'create_note_from_template:template-based'
  });

  console.log('✅ Basic metrics recorded');

  console.log('\n2. Testing tool execution wrapper...');

  // Test tool execution wrapper
  try {
    const result = await analytics.recordToolExecution(
      'test_execution',
      async () => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 50));
        return { message: 'test result', count: 5 };
      },
      { searchMode: 'test' }
    );
    
    console.log('✅ Tool execution recorded:', result);
  } catch (error) {
    console.error('❌ Tool execution failed:', error);
  }

  console.log('\n3. Testing analytics summary generation...');

  // Generate summary
  const summary = analytics.generateSummary(7);
  console.log('✅ Summary generated:', {
    totalExecutions: summary.totalExecutions,
    averageTime: summary.averageExecutionTime,
    successRate: summary.successRate,
    topToolsCount: summary.topTools.length
  });

  console.log('\n4. Testing data export...');

  // Test flush/export
  try {
    await analytics.flush();
    console.log('✅ Analytics data exported to analytics/usage-metrics.json');
  } catch (error) {
    console.error('❌ Export failed:', error);
  }

  console.log('\n5. Testing dashboard data...');

  // Copy sample data for dashboard testing
  try {
    const { copyFileSync } = await import('fs');
    copyFileSync(
      './analytics/sample-data.json',
      './analytics/usage-metrics.json'
    );
    console.log('✅ Sample data copied for dashboard testing');
    console.log('📊 Open analytics/index.html to view the dashboard');
  } catch (error) {
    console.error('❌ Failed to copy sample data:', error);
  }

  console.log('\n6. Testing ToolRouter integration...');

  // Test that ToolRouter properly integrates analytics
  try {
    const routingStats = ToolRouter.getRoutingStats();
    console.log('✅ ToolRouter routing stats:', routingStats);
  } catch (error) {
    console.error('❌ ToolRouter integration test failed:', error);
  }

  console.log('\n🎉 Analytics testing completed!');
  console.log('\nNext steps:');
  console.log('- Set ENABLE_USAGE_ANALYTICS=true in your environment');
  console.log('- Use the MCP server normally to generate real analytics');
  console.log('- Open analytics/index.html to view the dashboard');
  console.log('- Check analytics/usage-metrics.json for raw data');

  // Clean shutdown
  await analytics.shutdown();
}

// Run the test
testAnalytics().catch(console.error);