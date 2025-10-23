# LifeOS MCP Analytics Dashboard

*Last updated: 2025-10-23*

## Overview

Lightweight telemetry system for tracking personal tool usage patterns, routing effectiveness, and performance insights. Built for zero-maintenance development optimization.

## Features

- **Tool Usage Tracking**: Monitor which tools you use most frequently
- **Routing Analytics**: Track auto-mode detection accuracy and fallback patterns
- **Performance Insights**: Execution times, cache hit rates, retry patterns
- **Visual Dashboard**: Beautiful HTML + Chart.js dashboard with zero dependencies
- **Minimal Overhead**: <1ms performance impact on operations

## Setup

### 1. Analytics Configuration

Analytics are **enabled by default** for personal development insights.

**To disable analytics:**
```bash
export DISABLE_USAGE_ANALYTICS=true
```

**To configure dashboard port:**
```bash
export ANALYTICS_DASHBOARD_PORT=19832  # Default port, change as needed
```

### 2. Use the MCP Server

Simply use the server normally. Analytics are collected automatically for:
- Universal search operations (`search` tool)
- Smart note creation (`create_note_smart` tool)
- Universal listing (`list` tool)
- Routing decisions and fallbacks

### 3. View the Dashboard

Start the analytics dashboard server:

```bash
# Start the dashboard server (default port 19832)
node scripts/start-analytics-dashboard.js

# Or with custom port
ANALYTICS_DASHBOARD_PORT=9000 node scripts/start-analytics-dashboard.js

# Then visit http://localhost:19832 (or your custom port)
```

## Dashboard Features

### Summary Statistics
- Total operations performed
- Average execution time
- Overall success rate
- Cache hit rate

### Visual Charts
1. **Tool Usage Distribution** - Pie chart showing which tools you use most
2. **Performance Bubble Chart** - Usage count vs execution time
3. **Routing Accuracy** - Success rate of auto-mode detection
4. **Cache Performance** - Hit rates and retry patterns
5. **Daily Usage Trends** - Timeline of your tool usage patterns

### Real-time Updates
- Dashboard auto-refreshes every 5 minutes
- Manual refresh button available
- Shows last updated timestamp

## Data Files

- `usage-metrics.jsonl` - Current analytics data (auto-generated)
- `sample-data.json` - Example data for testing the dashboard
- `historical/` - Date-based archives (future feature)

## Configuration

Analytics behavior can be customized via environment variables:

```bash
# Enable/disable analytics (default: false)
ENABLE_USAGE_ANALYTICS=true

# Legacy telemetry flag (still supported)
TOOL_ROUTER_TELEMETRY=true
```

Analytics configuration is handled automatically with sensible defaults:
- **Memory limit**: 1000 metrics before auto-flush
- **Flush interval**: 5 minutes
- **File output**: `./analytics/usage-metrics.jsonl`
- **Slow operation threshold**: 200ms

## Privacy & Data

This is a **personal analytics system** designed for single-user development insights:

- ✅ All data stays on your local machine
- ✅ No external services or cloud uploads
- ✅ No sensitive information collected
- ✅ You control when analytics are enabled/disabled
- ✅ Simple JSON format for easy inspection

## Example Usage Insights

After using the system, you might discover:

- **Most used tools**: "I use `search` 80% of the time, maybe I should optimize it further"
- **Performance patterns**: "List operations are slower on Monday mornings (probably larger datasets)"
- **Routing accuracy**: "Auto-mode detection works well, with rare fallbacks to legacy tools"
- **Cache effectiveness**: "Search cache is working well at 73% hit rate"
- **Usage trends**: "I'm most productive between 2-4 PM"

## Troubleshooting

### Dashboard shows "No Data Available"
1. Make sure `ENABLE_USAGE_ANALYTICS=true` is set
2. Use the MCP server to generate some analytics data
3. Check that `usage-metrics.jsonl` exists in the analytics folder

### Dashboard shows loading error
1. Check that `usage-metrics.jsonl` exists and is valid JSONL
2. Try copying `sample-data.json` to `usage-metrics.jsonl` for testing
3. Check browser console for specific error messages

### Analytics not collecting
1. Verify environment variable: `echo $ENABLE_USAGE_ANALYTICS`
2. Check that the analytics folder exists and is writable
3. Look for error messages in the MCP server logs

## Development

To test the dashboard with sample data:

```bash
# Copy sample data to see the dashboard in action
cp sample-data.json usage-metrics.jsonl

# Open dashboard
open index.html
```

The analytics system is designed to have zero maintenance overhead while providing valuable insights into your personal development workflow.