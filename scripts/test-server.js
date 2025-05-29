#!/usr/bin/env node

/**
 * Simple test server for development
 */

import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname'
            }
        }
    }
});

// CORS
await fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Static files
await fastify.register(fastifyStatic, {
    root: join(__dirname, 'public'),
    prefix: '/',
});

// Health endpoint
fastify.get('/api/health', async (request, reply) => {
    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0-mvp',
        uptime: process.uptime()
    };
});

// Models endpoint
fastify.get('/api/models', async (request, reply) => {
    return {
        models: [
            {
                id: 'claude-sonnet-4-20250514',
                name: 'Claude Sonnet 4',
                description: 'Latest Claude Sonnet model with enhanced capabilities',
                provider: 'anthropic'
            },
            {
                id: 'claude-3-7-sonnet-latest',
                name: 'Claude 3.7 Sonnet',
                description: 'Claude 3.7 Sonnet with advanced reasoning',
                provider: 'anthropic'
            }
        ]
    };
});

// Chat endpoint
fastify.post('/api/chat', async (request, reply) => {
    const body = request.body;
    
    if (!body.message || typeof body.message !== 'string') {
        reply.code(400);
        return { error: 'Message is required' };
    }

    if (!body.apiKey || typeof body.apiKey !== 'string') {
        reply.code(400);
        return { error: 'API key is required' };
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    return {
        response: `This is a simulated response to: "${body.message}". In the full implementation, this would be processed through the Anthropic API and your LifeOS vault using model ${body.model || 'claude-sonnet-4-20250514'}.`,
        model: body.model || 'claude-sonnet-4-20250514',
        timestamp: new Date().toISOString()
    };
});

// 404 handler for API routes only
fastify.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) {
        reply.status(404).send({
            error: 'Not Found',
            message: `API endpoint ${request.method} ${request.url} not found`
        });
    } else {
        // For non-API routes, serve index.html (SPA routing)
        return reply.sendFile('index.html');
    }
});

// Start server
try {
    await fastify.listen({
        host: '0.0.0.0',
        port: 9000
    });

    console.log('\n🚀 LifeOS MCP Test Server started!');
    console.log(`📍 Local: http://localhost:9000`);
    console.log(`🌐 Network: http://0.0.0.0:9000`);
    console.log('\n💡 Available endpoints:');
    console.log('  GET  /              - Web interface');
    console.log('  GET  /api/health    - Health check');
    console.log('  GET  /api/models    - Available models');
    console.log('  POST /api/chat      - Send chat message');

} catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
}