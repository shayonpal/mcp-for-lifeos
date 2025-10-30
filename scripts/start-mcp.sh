#!/bin/bash
# MCP Server Wrapper Script for Raycast

# Source nvm to ensure Node.js is available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Change to the project directory
cd "/Users/shayon/DevProjects/mcp-for-lifeos"

# Start the MCP server (compiled entry lives under dist/src/index.js)
exec node dist/src/index.js "$@"