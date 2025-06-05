#!/bin/bash

# Start LifeOS MCP Server with Analytics Enabled
# Usage: ./scripts/start-with-analytics.sh

echo "🚀 Starting LifeOS MCP Server with Analytics..."
echo ""

# Set analytics environment variable
export ENABLE_USAGE_ANALYTICS=true
export TOOL_ROUTER_TELEMETRY=true

# Confirm settings
echo "📊 Analytics Configuration:"
echo "  ENABLE_USAGE_ANALYTICS=$ENABLE_USAGE_ANALYTICS"
echo "  TOOL_ROUTER_TELEMETRY=$TOOL_ROUTER_TELEMETRY"
echo ""

# Show analytics dashboard URL
echo "📈 Analytics Dashboard: http://localhost:8080"
echo ""

# Start the server
echo "Starting MCP server..."
echo "Use Ctrl+C to stop the server and flush analytics data"
echo ""

# Run the MCP server
node dist/index.js