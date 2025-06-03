#!/usr/bin/env node

/**
 * Test script to validate the end-of-section fix
 * This tests the specific scenarios that were failing
 */

import fs from 'fs';
import path from 'path';

// Create a test note
const testNotePath = '/tmp/test-end-of-section.md';
const testContent = `---
title: Test Note
tags: [test]
---

# Main Heading

Some content here.

## Sub Section

- Existing list item
- Another item

Some more content.

## Another Section

Final content.
`;

fs.writeFileSync(testNotePath, testContent);

// Test JSON-RPC call for end-of-section with heading target
const testCalls = [
  {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "call_tool",
    "params": {
      "name": "insert_content",
      "arguments": {
        "path": testNotePath,
        "content": "- New list item added",
        "target": {
          "heading": "Sub Section"
        },
        "position": "end-of-section"
      }
    }
  },
  {
    "jsonrpc": "2.0", 
    "id": 2,
    "method": "call_tool",
    "params": {
      "name": "insert_content",
      "arguments": {
        "path": testNotePath,
        "content": "Pattern-based insertion",
        "target": {
          "pattern": "Final content"
        },
        "position": "end-of-section"
      }
    }
  }
];

console.log('Testing end-of-section fixes...');
console.log('Test calls:');
testCalls.forEach((call, i) => {
  console.log(`\nTest ${i + 1}:`);
  console.log(JSON.stringify(call, null, 2));
});

console.log(`\nTest file created at: ${testNotePath}`);
console.log('Run this test via MCP server to validate the fix.');