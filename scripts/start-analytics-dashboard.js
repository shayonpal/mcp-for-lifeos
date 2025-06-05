#!/usr/bin/env node

/**
 * Analytics Dashboard Server
 * Serves the HTML dashboard with configurable port
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const analyticsDir = join(projectRoot, 'analytics');

// Configuration
const PORT = parseInt(process.env.ANALYTICS_DASHBOARD_PORT || '19832');
const HOST = process.env.ANALYTICS_DASHBOARD_HOST || 'localhost';

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function getMimeType(filePath) {
  const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
  return mimeTypes[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  try {
    if (!existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    const content = readFileSync(filePath);
    const mimeType = getMimeType(filePath);
    
    res.writeHead(200, { 
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(`Server error: ${error.message}`);
  }
}

const server = createServer((req, res) => {
  let url = req.url;
  
  // Handle root request
  if (url === '/') {
    url = '/index.html';
  }
  
  // Remove query parameters
  url = url.split('?')[0];
  
  // Construct file path
  const filePath = join(analyticsDir, url);
  
  // Security check - ensure file is within analytics directory
  if (!filePath.startsWith(analyticsDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access denied');
    return;
  }
  
  serveFile(res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`📊 Analytics Dashboard running at http://${HOST}:${PORT}`);
  console.log(`📁 Serving files from: ${analyticsDir}`);
  console.log(`🔧 Configure port with: ANALYTICS_DASHBOARD_PORT=${PORT}`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down analytics dashboard server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down analytics dashboard server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});