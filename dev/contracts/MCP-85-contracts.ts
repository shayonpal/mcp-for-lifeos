/**
 * Implementation contracts for Linear Issue: MCP-85
 * Issue: Implement Core Streamable HTTP Transport
 *
 * These contracts define expected behavior and data structures for the Streamable HTTP
 * transport implementation. All implementation MUST conform to these interfaces.
 *
 * Status: Planning approved - ready for implementation
 * Branch: feature/mcp-85-implement-core-streamable-http-transport
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { FastifyInstance } from 'fastify';

// ============================================================================
// TRANSPORT CONFIGURATION CONTRACTS
// ============================================================================

/**
 * Configuration for HTTP transport initialization
 * Used in src/index.ts main() function to conditionally enable HTTP transport
 */
export interface HttpTransportConfig {
  /** Enable HTTP transport (env: ENABLE_HTTP_TRANSPORT) */
  enabled: boolean;

  /** Host to bind server (env: HTTP_HOST, default: 'localhost') */
  host: string;

  /** Port to bind server (env: HTTP_PORT, default: 19831) */
  port: number;

  /** Enable DNS rebinding protection (env: ENABLE_DNS_REBINDING_PROTECTION, default: true) */
  enableDnsRebindingProtection: boolean;

  /** Allowed Host header values (env: ALLOWED_HOSTS, default: '127.0.0.1,localhost') */
  allowedHosts: string[];

  /** Enable JSON response mode for non-streaming clients */
  enableJsonResponse: boolean;
}

/**
 * Default HTTP transport configuration
 * Follows stateless mode pattern from ADR-007
 */
export const DEFAULT_HTTP_CONFIG: HttpTransportConfig = {
  enabled: false,
  host: 'localhost',
  port: 19831,
  enableDnsRebindingProtection: true,
  allowedHosts: ['127.0.0.1', 'localhost'],
  enableJsonResponse: true,
};

// ============================================================================
// TRANSPORT INITIALIZATION CONTRACTS
// ============================================================================

/**
 * Per-request transport configuration for stateless mode
 * New transport instance created for each POST /mcp request
 *
 * Prevents request ID collisions in stateless mode as documented in SDK examples
 */
export interface TransportInstanceConfig {
  /** Stateless mode: undefined (no session tracking) */
  sessionIdGenerator: undefined;

  /** Enable JSON response mode for compatibility */
  enableJsonResponse: boolean;

  /** DNS rebinding protection configuration */
  enableDnsRebindingProtection?: boolean;
  allowedHosts?: string[];
}

// ============================================================================
// HTTP SERVER CONTRACTS
// ============================================================================

/**
 * HTTP server initialization result
 * Returned from HTTP transport setup in main()
 */
export interface HttpServerResult {
  /** Fastify application instance */
  app: FastifyInstance;

  /** Server listening address (e.g., "http://localhost:19831") */
  address: string;

  /** Cleanup function to stop server */
  stop: () => Promise<void>;
}

/**
 * HTTP endpoint handler signature
 * POST /mcp endpoint handler following SDK per-request pattern
 */
export type HttpEndpointHandler = (
  server: Server,
  config: HttpTransportConfig
) => Promise<void>;

// ============================================================================
// INTEGRATION CONTRACTS
// ============================================================================

/**
 * Main function integration points
 * Defines how HTTP transport integrates with existing stdio transport
 */
export interface DualTransportIntegration {
  /** Existing stdio transport (unchanged) */
  stdioTransport: {
    enabled: boolean;
    type: 'StdioServerTransport';
  };

  /** New HTTP transport (conditional) */
  httpTransport: {
    enabled: boolean;
    type: 'StreamableHTTPServerTransport' | null;
    mode: 'stateless' | null;
  };

  /** Shared MCP Server instance */
  mcpServer: Server;

  /** Both transports connect to same server instance */
  sharedState: {
    analytics: boolean;
    clientInfo: boolean;
    toolRegistrations: boolean;
  };
}

// ============================================================================
// ERROR CONTRACTS
// ============================================================================

/**
 * Error types that may be thrown during HTTP transport operations:
 *
 * @throws HttpTransportInitError - HTTP server initialization failure
 * @throws TransportConnectionError - MCP transport connection failure
 * @throws InvalidRequestError - Malformed MCP request body
 * @throws DnsRebindingError - Host header validation failure
 */

export class HttpTransportInitError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(`HTTP Transport initialization failed: ${message}`);
    this.name = 'HttpTransportInitError';
  }
}

export class TransportConnectionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(`Transport connection failed: ${message}`);
    this.name = 'TransportConnectionError';
  }
}

export class InvalidRequestError extends Error {
  constructor(message: string, public readonly requestBody?: unknown) {
    super(`Invalid MCP request: ${message}`);
    this.name = 'InvalidRequestError';
  }
}

export class DnsRebindingError extends Error {
  constructor(message: string, public readonly hostHeader?: string) {
    super(`DNS rebinding protection triggered: ${message}`);
    this.name = 'DnsRebindingError';
  }
}

// ============================================================================
// BEHAVIORAL CONTRACTS
// ============================================================================

/**
 * Expected behaviors for HTTP transport implementation:
 *
 * MUST:
 * - Use Fastify (already installed) instead of Express
 * - Create new transport instance per POST /mcp request (stateless pattern)
 * - Enable DNS rebinding protection with allowedHosts whitelist
 * - Close transport on response.raw.on('close') event
 * - Call server.connect(transport) before handleRequest()
 * - Use transport.handleRequest(req.raw, res.raw, req.body) for SDK delegation
 * - Parse environment variables for configuration
 * - Maintain TypeScript type safety throughout
 * - Handle errors gracefully (body parsing, transport init, generic 500)
 *
 * MUST NOT:
 * - Create separate transport factory file (implement in main())
 * - Use Express (not installed, ADR-007 needs correction)
 * - Implement custom MCP protocol logic (SDK handles via handleRequest)
 * - Share transport instances across requests (causes ID collisions)
 * - Expose server to network (bind to localhost only)
 * - Skip DNS rebinding protection (security requirement)
 *
 * SHOULD:
 * - Follow per-request transport pattern from SDK examples
 * - Keep main() function focused (HTTP init ~30 lines)
 * - Test dual transport (stdio + HTTP) working simultaneously
 * - Document framework choice (Fastify) in code comments
 * - Reference ADR-007 in implementation comments
 */

// ============================================================================
// TEST CONTRACTS
// ============================================================================

/**
 * Smoke test requirements for MCP-85
 * Validates basic HTTP transport functionality
 */
export interface SmokeTestRequirements {
  /** Test 1: HTTP endpoint responds to basic MCP request */
  basicRequest: {
    method: 'POST';
    path: '/mcp';
    body: Record<string, unknown>; // MCP JSON-RPC request
    expectedStatus: 200;
    expectedContentType: 'application/json';
  };

  /** Test 2: Single tool invocation via HTTP (get_server_version) */
  toolInvocation: {
    method: 'POST';
    path: '/mcp';
    tool: 'get_server_version';
    expectedResult: {
      success: boolean;
      version: string;
    };
  };

  /** Test 3: Dual transport validation (stdio + HTTP work simultaneously) */
  dualTransport: {
    stdioActive: boolean;
    httpActive: boolean;
    sharedServerInstance: boolean;
  };
}

// ============================================================================
// DOCUMENTATION CONTRACTS
// ============================================================================

/**
 * ADR-007 updates required as part of MCP-85 implementation
 *
 * Phase 3 deliverable: Update ADR-007 code examples from Express to Fastify
 */
export interface ADR007UpdateRequirements {
  /** Sections to update in docs/adr/007-streamable-http-sdk-implementation.md */
  sectionsToUpdate: [
    'Implementation Architecture (lines 232-275)',
    'Configuration Section (lines 217-274)',
    'Consequences Section (lines 277-298)',
  ];

  /** New section to add */
  newSection: {
    title: 'Framework Decision';
    location: 'After line 298';
    content: [
      'Document why Fastify chosen over Express',
      'Note that Express is not in dependencies',
      'Explain Fastify advantages (already present, faster, better TypeScript)',
    ];
  };

  /** Code example corrections */
  codeExamples: {
    from: 'Express syntax (import express from "express")';
    to: 'Fastify syntax (import Fastify from "fastify")';
    keydifferences: [
      'express.json() middleware → Fastify parses JSON automatically',
      'req/res → req.raw/res.raw (Fastify wraps Node.js HTTP objects)',
      'app.listen(port, host) → app.listen({ host, port }) (Fastify async)',
      'res.on("close") → res.raw.on("close") (access underlying response)',
    ];
  };
}

// ============================================================================
// IMPLEMENTATION VALIDATION
// ============================================================================

/**
 * Validation strategy for contract conformance
 *
 * Compile-time validation:
 * - `npm run typecheck` verifies all types match contracts
 * - Import and implement these contracts in src/index.ts
 *
 * Runtime validation:
 * - Smoke tests verify HTTP transport functionality
 * - Manual testing validates dual transport operation
 * - Environment variable parsing validates configuration
 *
 * Code review validation:
 * - Implementation imports contracts from this file
 * - All interfaces implemented as specified
 * - Error types used in implementation
 * - Behavioral contracts followed
 */
