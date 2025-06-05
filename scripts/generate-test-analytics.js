#!/usr/bin/env node

/**
 * Generate test analytics data by simulating MCP tool usage
 * This script creates realistic telemetry data for dashboard testing
 */

import { AnalyticsCollector } from '../dist/analytics/analytics-collector.js';

async function generateTestData() {
  console.log('📊 Generating test analytics data...\n');

  // Enable analytics
  process.env.ENABLE_USAGE_ANALYTICS = 'true';
  
  const analytics = AnalyticsCollector.getInstance();

  // Simulate a realistic work session over the past week
  const tools = [
    { name: 'universal_search', weight: 0.6, avgTime: 45, cacheRate: 0.8 },
    { name: 'smart_create_note', weight: 0.2, avgTime: 120, cacheRate: 0.1 },
    { name: 'universal_list', weight: 0.15, avgTime: 30, cacheRate: 0.9 },
    { name: 'routing_decision', weight: 0.05, avgTime: 0, cacheRate: 0 }
  ];

  const searchModes = ['auto', 'quick', 'advanced', 'recent', 'pattern'];
  const routingDecisions = [
    'find_notes_by_pattern:pattern',
    'quick_search:quick',
    'advanced_search:advanced',
    'search_recent:recent',
    'create_note_from_template:template-based',
    'create_note:manual'
  ];

  // Generate data for the past 7 days
  const now = new Date();
  let totalOperations = 0;

  for (let day = 6; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    
    // More activity on weekdays, less on weekends
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseOperations = isWeekend ? 15 : 25;
    const dailyOperations = baseOperations + Math.floor(Math.random() * 10) - 5;

    console.log(`Generating ${dailyOperations} operations for ${date.toDateString()}`);

    for (let op = 0; op < dailyOperations; op++) {
      // Pick a random tool based on weights
      const random = Math.random();
      let cumulativeWeight = 0;
      let selectedTool = tools[0];

      for (const tool of tools) {
        cumulativeWeight += tool.weight;
        if (random <= cumulativeWeight) {
          selectedTool = tool;
          break;
        }
      }

      // Generate realistic execution time with some variance
      const baseTime = selectedTool.avgTime;
      const variance = baseTime * 0.3; // 30% variance
      const executionTime = Math.max(1, Math.floor(baseTime + (Math.random() - 0.5) * variance));

      // Determine success (95% success rate)
      const success = Math.random() > 0.05;

      // Cache hit based on tool characteristics
      const cacheHit = selectedTool.cacheRate > 0 ? Math.random() < selectedTool.cacheRate : undefined;

      // Retry count (occasionally operations need retries)
      const retryCount = Math.random() < 0.1 ? Math.floor(Math.random() * 3) + 1 : undefined;

      // Generate contextual data based on tool type
      let contextData = {};
      
      if (selectedTool.name === 'universal_search') {
        contextData.searchMode = searchModes[Math.floor(Math.random() * searchModes.length)];
        contextData.resultCount = Math.floor(Math.random() * 20) + 1;
      } else if (selectedTool.name === 'routing_decision') {
        contextData.routingDecision = routingDecisions[Math.floor(Math.random() * routingDecisions.length)];
        contextData.searchMode = 'auto';
      }

      // Create the metric with a timestamp from that day
      const timestamp = new Date(date);
      timestamp.setHours(9 + Math.floor(Math.random() * 10)); // 9 AM to 7 PM
      timestamp.setMinutes(Math.floor(Math.random() * 60));
      timestamp.setSeconds(Math.floor(Math.random() * 60));

      analytics.recordUsage({
        toolName: selectedTool.name,
        executionTime,
        success,
        cacheHit,
        retryCount,
        timestamp,
        ...contextData
      });

      totalOperations++;
    }
  }

  console.log(`\n✅ Generated ${totalOperations} analytics entries`);

  // Generate summary and export
  const summary = analytics.generateSummary(7);
  console.log(`📈 Summary: ${summary.totalExecutions} total operations, ${summary.averageExecutionTime}ms avg time`);

  // Export the data
  await analytics.flush();
  console.log('💾 Analytics data exported to analytics/usage-metrics.json');

  console.log('\n🎉 Test data generation complete!');
  console.log('📊 View the dashboard at: http://localhost:8080');
  
  // Clean shutdown
  await analytics.shutdown();
}

generateTestData().catch(console.error);