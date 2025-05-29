#!/bin/bash

echo "🧪 Manual Testing Script for MCP HTTP Transport Layer"
echo "=================================================="
echo

SERVER_URL="http://localhost:9000"

echo "1. Testing Health Check..."
echo "curl $SERVER_URL/api/health"
curl -s "$SERVER_URL/api/health" | jq '.' || curl -s "$SERVER_URL/api/health"
echo -e "\n"

echo "2. Testing MCP Tools List..."
echo "curl $SERVER_URL/api/mcp/tools"
curl -s "$SERVER_URL/api/mcp/tools" | jq '.tools[0:3] | .[].name' || curl -s "$SERVER_URL/api/mcp/tools"
echo -e "\n"

echo "3. Testing MCP Tool Execution (get_server_version)..."
echo "curl -X POST $SERVER_URL/api/mcp/tool -H 'Content-Type: application/json' -d '{\"tool\":\"get_server_version\",\"arguments\":{}}'"
curl -s -X POST "$SERVER_URL/api/mcp/tool" \
  -H "Content-Type: application/json" \
  -d '{"tool":"get_server_version","arguments":{}}' | jq '.content[0].text' || curl -s -X POST "$SERVER_URL/api/mcp/tool" -H "Content-Type: application/json" -d '{"tool":"get_server_version","arguments":{}}'
echo -e "\n"

echo "4. Testing Models Endpoint..."
echo "curl $SERVER_URL/api/models"
curl -s "$SERVER_URL/api/models" | jq '.features.mcpTools' || curl -s "$SERVER_URL/api/models"
echo -e "\n"

echo "5. Testing Web Interface..."
echo "curl -I $SERVER_URL/"
curl -s -I "$SERVER_URL/" | head -5
echo -e "\n"

echo "✅ Manual testing complete!"
echo "💡 You can also open http://localhost:9000 in your browser to test the web interface"