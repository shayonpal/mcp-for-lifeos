#!/usr/bin/env node

/**
 * Standalone web server starter for LifeOS MCP
 * This starts only the HTTP server without the MCP stdio transport
 */

import { MCPHttpServer } from './dist/server/http-server.js';

async function startWebServer() {
    console.log('🚀 Starting LifeOS MCP Web Interface...');
    
    const server = new MCPHttpServer({
        host: process.env.WEB_HOST || '0.0.0.0',
        port: parseInt(process.env.WEB_PORT || '9000'),
    });
    
    try {
        await server.start();
        console.log('\n✅ Web interface is ready!');
        console.log('💡 You can now access the interface in your browser');
        console.log('📱 For iOS: Add to Home Screen for PWA experience');
    } catch (error) {
        console.error('❌ Failed to start web server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down...');
    process.exit(0);
});

startWebServer().catch(console.error);