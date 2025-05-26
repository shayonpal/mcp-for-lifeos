/**
 * LifeOS MCP HTTP Server
 * Fastify-based HTTP server for serving web interface and API endpoints
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ServerConfig {
    host: string;
    port: number;
    enableCors: boolean;
    staticPath: string;
}

export class MCPHttpServer {
    private fastify: FastifyInstance;
    private config: ServerConfig;

    constructor(config: Partial<ServerConfig> = {}) {
        this.config = {
            host: '0.0.0.0',
            port: 9000,
            enableCors: true,
            staticPath: join(__dirname, '../../public'),
            ...config
        };

        this.fastify = Fastify({
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

        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private async setupMiddleware(): Promise<void> {
        // CORS configuration for local network access
        if (this.config.enableCors) {
            await this.fastify.register(fastifyCors, {
                origin: true, // Allow all origins for local development
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
            });
        }

        // Static file serving
        await this.fastify.register(fastifyStatic, {
            root: this.config.staticPath,
            prefix: '/', // Optional: default '/'
        });

        // Request logging and timing
        this.fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
            (request as any).startTime = Date.now();
            request.log.info(`${request.method} ${request.url}`);
        });

        // Response time header
        this.fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload) => {
            const startTime = (request as any).startTime || Date.now();
            reply.header('X-Response-Time', `${Date.now() - startTime}ms`);
            return payload;
        });
    }

    private setupRoutes(): void {
        // Health check endpoint
        this.fastify.get('/api/health', async (request: FastifyRequest, reply: FastifyReply) => {
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                uptime: process.uptime()
            };
        });

        // API endpoints will be added here
        this.setupApiRoutes();

        // Catch-all route for SPA (serve index.html for all non-API routes)
        this.fastify.get('/*', async (request: FastifyRequest, reply: FastifyReply) => {
            // Don't interfere with API routes
            if (request.url.startsWith('/api/')) {
                reply.code(404);
                return { error: 'API endpoint not found' };
            }

            // Serve index.html for all other routes (SPA routing)
            return reply.sendFile('index.html');
        });
    }

    private setupApiRoutes(): void {
        // Models endpoint
        this.fastify.get('/api/models', async (request: FastifyRequest, reply: FastifyReply) => {
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

        // Chat endpoint (placeholder for now)
        this.fastify.post('/api/chat', async (request: FastifyRequest, reply: FastifyReply) => {
            const body = request.body as any;
            
            // Basic validation
            if (!body.message || typeof body.message !== 'string') {
                reply.code(400);
                return { error: 'Message is required' };
            }

            if (!body.apiKey || typeof body.apiKey !== 'string') {
                reply.code(400);
                return { error: 'API key is required' };
            }

            // For MVP, return a simulated response
            return {
                response: `This is a simulated response to: "${body.message}". In the full implementation, this would be processed through the Anthropic API and your LifeOS vault.`,
                model: body.model || 'claude-sonnet-4-20250514',
                timestamp: new Date().toISOString()
            };
        });

        // Streaming chat endpoint (placeholder)
        this.fastify.get('/api/chat/stream', async (request: FastifyRequest, reply: FastifyReply) => {
            reply.header('Content-Type', 'text/event-stream');
            reply.header('Cache-Control', 'no-cache');
            reply.header('Connection', 'keep-alive');
            reply.header('Access-Control-Allow-Origin', '*');

            // Simulate streaming response
            const messages = [
                'This is a simulated',
                ' streaming response.',
                ' In the full implementation,',
                ' this would connect to',
                ' Anthropic Claude API',
                ' and stream real responses.'
            ];

            for (let i = 0; i < messages.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 500));
                reply.raw.write(`data: ${JSON.stringify({ 
                    chunk: messages[i],
                    index: i,
                    finished: i === messages.length - 1
                })}\n\n`);
            }

            reply.raw.end();
        });
    }

    private setupErrorHandling(): void {
        // Global error handler
        this.fastify.setErrorHandler(async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
            request.log.error(error);

            // Don't expose internal errors in production
            const isDevelopment = process.env.NODE_ENV === 'development';
            
            reply.status(500).send({
                error: 'Internal Server Error',
                message: isDevelopment ? error.message : 'Something went wrong',
                ...(isDevelopment && { stack: error.stack })
            });
        });

        // 404 handler for API routes
        this.fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
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

        // Graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            console.log(`\nReceived ${signal}. Shutting down gracefully...`);
            try {
                await this.fastify.close();
                console.log('Server closed successfully.');
                process.exit(0);
            } catch (error) {
                console.error('Error during shutdown:', error);
                process.exit(1);
            }
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    }

    async start(): Promise<void> {
        try {
            await this.fastify.listen({
                host: this.config.host,
                port: this.config.port
            });

            console.log('\n🚀 LifeOS MCP Web Interface started!');
            console.log(`📍 Local: http://localhost:${this.config.port}`);
            console.log(`🌐 Network: http://${this.config.host}:${this.config.port}`);
            console.log(`📁 Static files: ${this.config.staticPath}`);
            console.log('\n💡 Available endpoints:');
            console.log('  GET  /              - Web interface');
            console.log('  GET  /api/health    - Health check');
            console.log('  GET  /api/models    - Available models');
            console.log('  POST /api/chat      - Send chat message');
            console.log('  GET  /api/chat/stream - Streaming chat');

        } catch (error) {
            this.fastify.log.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    async stop(): Promise<void> {
        await this.fastify.close();
    }

    getFastifyInstance(): FastifyInstance {
        return this.fastify;
    }
}

// For direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new MCPHttpServer();
    server.start();
}