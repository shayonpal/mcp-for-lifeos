#!/usr/bin/env node
/**
 * Stdio smoke test for LifeOS MCP
 * - Starts the server via stdio transport
 * - Lists tools, runs search and list (templates, daily notes)
 * - Optionally creates a safe note in "05 - Fleeting Notes" when DO_CREATE=1
 *
 * Env vars:
 * - TOOL_MODE: defaults to "consolidated-only"
 * - DO_CREATE=1: enable create_note step (skipped by default for safety)
 * - LIFEOS_*: standard vault path overrides are respected by the server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import process from 'node:process';

async function run() {
  const results = { tools: [], search: null, listTemplates: null, listDaily: null, created: null };
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/src/index.js'],
    env: {
      ...process.env,
      TOOL_MODE: process.env.TOOL_MODE || 'consolidated-only'
    },
    stderr: 'pipe'
  });

  const client = new Client({ name: 'smoke-stdio', version: '0.1.0' });

  try {
    await client.connect(transport);

    // List tools
    const toolsResp = await client.listTools();
    results.tools = toolsResp.tools?.map(t => t.name) || [];

    // search (quick, concise)
    const searchResp = await client.callTool({
      name: 'search',
      arguments: { mode: 'quick', query: 'AGENTS', maxResults: 5, format: 'concise' }
    });
    results.search = searchResp?.content?.[0]?.text || JSON.stringify(searchResp);

    // list templates (concise)
    const listTemplatesResp = await client.callTool({
      name: 'list',
      arguments: { type: 'templates', format: 'concise' }
    });
    results.listTemplates = listTemplatesResp?.content?.[0]?.text || JSON.stringify(listTemplatesResp);

    // list daily notes (limit 3, concise)
    const listDailyResp = await client.callTool({
      name: 'list',
      arguments: { type: 'daily_notes', limit: 3, format: 'concise' }
    });
    results.listDaily = listDailyResp?.content?.[0]?.text || JSON.stringify(listDailyResp);

    // Optional: create_note (manual) when DO_CREATE=1
    if (process.env.DO_CREATE === '1') {
      const stamp = new Date().toISOString().replace(/[-:TZ]/g, '').slice(0, 12);
      const title = `MCP Smoke Test Note ${stamp}`;
      const createResp = await client.callTool({
        name: 'create_note',
        arguments: {
          title,
          content: 'This is a smoke test note created via stdio. Safe to delete.',
          auto_template: false,
          contentType: 'Reference',
          tags: ['mcp', 'smoke-test'],
          targetFolder: '05 - Fleeting Notes'
        }
      });
      results.created = createResp?.content?.[0]?.text || JSON.stringify(createResp);
    } else {
      results.created = '(skipped - set DO_CREATE=1 to enable)';
    }

    // Print a compact summary
    console.log('--- SMOKE STDIO SUMMARY ---');
    console.log(`Tools (${results.tools.length}):`, results.tools.slice(0, 10).join(', '));
    console.log('\n[search]\n', (results.search || '').split('\n').slice(0, 10).join('\n'));
    console.log('\n[list: templates]\n', (results.listTemplates || '').split('\n').slice(0, 10).join('\n'));
    console.log('\n[list: daily_notes]\n', (results.listDaily || '').split('\n').slice(0, 10).join('\n'));
    console.log('\n[create_note]\n', (results.created || '').split('\n').slice(0, 12).join('\n'));

  } finally {
    try { await client.close(); } catch {}
  }
}

run().catch(err => {
  console.error('Smoke stdio failed:', err?.stack || String(err));
  process.exitCode = 1;
});
