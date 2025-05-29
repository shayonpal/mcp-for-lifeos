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
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ServerConfig {
    host: string;
    port: number;
    enableCors: boolean;
    staticPath: string;
}

export interface MCPToolRequest {
    tool: string;
    arguments: Record<string, any>;
}

export interface MCPToolResponse {
    success: boolean;
    content?: any[];
    error?: string;
    metadata?: Record<string, any>;
}

export class MCPHttpServer {
    private fastify: FastifyInstance;
    private config: ServerConfig;
    private mcpServer?: Server;

    constructor(config: Partial<ServerConfig> = {}, mcpServer?: Server) {
        this.config = {
            host: '0.0.0.0',
            port: 19831,
            enableCors: true,
            staticPath: join(__dirname, '../../public'),
            ...config
        };
        
        this.mcpServer = mcpServer;

        this.fastify = Fastify({
            logger: {
                level: 'info',
                transport: {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'HH:MM:ss Z',
                        destination: 2, // stderr
                        ignore: 'pid,hostname'
                    }
                }
            }
        });

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
        // Register plugins first
        this.fastify.register(async (fastify) => {
            // CORS configuration for local network access
            if (this.config.enableCors) {
                await fastify.register(fastifyCors, {
                    origin: true, // Allow all origins for local development
                    credentials: true,
                    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
                });
            }

            // Static file serving
            await fastify.register(fastifyStatic, {
                root: this.config.staticPath,
                prefix: '/', // Optional: default '/'
            });

            // Request logging and timing
            fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
                (request as any).startTime = Date.now();
                request.log.info(`${request.method} ${request.url}`);
            });

            // Response time header
            fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload) => {
                const startTime = (request as any).startTime || Date.now();
                reply.header('X-Response-Time', `${Date.now() - startTime}ms`);
                return payload;
            });
        });

        // Health check endpoint
        this.fastify.get('/api/health', async (request: FastifyRequest, reply: FastifyReply) => {
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                uptime: process.uptime(),
                mcpServer: this.mcpServer ? 'connected' : 'not available'
            };
        });

        // API endpoints will be added here
        this.setupApiRoutes();

        // Note: No catch-all route needed - handled by setNotFoundHandler below
    }

    private setupApiRoutes(): void {
        // MCP Tool execution endpoint
        this.fastify.post('/api/mcp/tool', async (request: FastifyRequest, reply: FastifyReply) => {
            if (!this.mcpServer) {
                reply.code(503);
                return { 
                    success: false, 
                    error: 'MCP server not available' 
                };
            }
            
            const { tool, arguments: args } = request.body as MCPToolRequest;
            
            if (!tool) {
                reply.code(400);
                return { 
                    success: false, 
                    error: 'Tool name is required' 
                };
            }
            
            try {
                // Create proper MCP request structure
                const mcpRequest = {
                    method: 'tools/call',
                    params: {
                        name: tool,
                        arguments: args || {}
                    }
                };
                
                // Access the MCP server's internal request handlers
                const callToolHandler = (this.mcpServer as any)._requestHandlers?.get('tools/call');
                if (!callToolHandler) {
                    reply.code(500);
                    return { 
                        success: false, 
                        error: 'MCP tool handler not found' 
                    };
                }
                
                const result = await callToolHandler(mcpRequest);
                
                return {
                    success: true,
                    content: result.content,
                    metadata: result.metadata
                } as MCPToolResponse;
            } catch (error) {
                request.log.error('MCP tool execution error:', error);
                reply.code(500);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                } as MCPToolResponse;
            }
        });
        
        // List available MCP tools
        this.fastify.get('/api/mcp/tools', async (request: FastifyRequest, reply: FastifyReply) => {
            if (!this.mcpServer) {
                reply.code(503);
                return { error: 'MCP server not available' };
            }
            
            try {
                // Create proper MCP request structure
                const mcpRequest = {
                    method: 'tools/list',
                    params: {}
                };
                
                const listToolsHandler = (this.mcpServer as any)._requestHandlers?.get('tools/list');
                if (!listToolsHandler) {
                    reply.code(500);
                    return { error: 'MCP tools list handler not found' };
                }
                
                const result = await listToolsHandler(mcpRequest);
                return result;
            } catch (error) {
                request.log.error('Error listing MCP tools:', error);
                reply.code(500);
                return {
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        
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
                ],
                features: {
                    streaming: false,
                    fileUpload: false,
                    webSearch: false,
                    mcpTools: this.mcpServer ? true : false
                }
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
            console.error(`\nReceived ${signal}. Shutting down gracefully...`);
            try {
                await this.fastify.close();
                console.error('Server closed successfully.');
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

            console.error('\n🚀 LifeOS MCP Web Interface started!');
            console.error(`📍 Local: http://localhost:${this.config.port}`);
            console.error(`🌐 Network: http://${this.config.host}:${this.config.port}`);
            console.error(`📁 Static files: ${this.config.staticPath}`);
            console.error('\n💡 Available endpoints:');
            console.error('  GET  /              - Web interface');
            console.error('  GET  /api/health    - Health check');
            console.error('  GET  /api/models    - Available models');
            console.error('  POST /api/chat      - Send chat message');
            console.error('  GET  /api/chat/stream - Streaming chat');
            if (this.mcpServer) {
                console.error('  GET  /api/mcp/tools - List MCP tools');
                console.error('  POST /api/mcp/tool  - Execute MCP tool');
                console.error('\n🔗 MCP Integration: ENABLED');
            } else {
                console.error('\n🔗 MCP Integration: DISABLED (server not provided)');
            }

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
    
    setMCPServer(server: Server): void {
        this.mcpServer = server;
    }
}

// For direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new MCPHttpServer();
    server.start();
}