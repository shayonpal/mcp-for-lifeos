# ADR-007: Streamable HTTP Implementation with MCP SDK

**Status**: Accepted  
**Date**: 2025-10-24  
**Technical Story**: MCP-42 - Research MCP SDK Streamable HTTP Support

## Context and Problem Statement

Following ADR-006's decision to implement HTTP transport with Cloudflare Tunnel deployment, we need to determine the specific implementation approach for the Streamable HTTP transport layer. The key decision is whether to use the official MCP TypeScript SDK's built-in transport or implement a custom HTTP transport layer.

**Key Questions:**

1. Does `@modelcontextprotocol/sdk@^1.0.0` support Streamable HTTP transport?
2. Should we use stateless or stateful session management?
3. Do we need custom session storage or event stores?
4. What security configurations are required?
5. How does this integrate with our existing stdio transport?

## Decision Drivers

### Primary Requirements

- **Protocol Compliance**: Must implement MCP specification 2025-03-26 correctly
- **Stateless Operations**: Vault operations (search, read, create, edit) are naturally stateless
- **Dual Transport**: Must maintain stdio transport for Claude Desktop while adding HTTP
- **Security**: DNS rebinding protection for localhost-bound server
- **Simplicity**: Minimize custom code and implementation complexity
- **Maintainability**: Stay aligned with MCP protocol evolution

### Technical Constraints

- Current SDK version: `@modelcontextprotocol/sdk@^1.0.0` (already installed)
- Server framework: Express already in use for analytics dashboard
- Deployment: Cloudflare Tunnel pointing to `localhost:19831` (from ADR-006)
- No persistent session requirements for vault operations
- Must work with claude.ai Custom Connectors (HTTP-based)

## Considered Options

### Option 1: Use SDK StreamableHTTPServerTransport (Stateless Mode)

**Implementation:**

```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode
    enableJsonResponse: true,
    enableDnsRebindingProtection: true,
    allowedHosts: ['127.0.0.1', 'localhost']
});

await server.connect(transport);
await transport.handleRequest(req, res, req.body);
```

**Pros:**

- **Zero Custom Code**: SDK handles all MCP protocol logic
- **Protocol Compliance**: Official implementation guarantees spec adherence
- **Proven Reliability**: Used by Claude Code, VS Code, MCP Inspector
- **Automatic Updates**: Protocol changes handled by SDK updates
- **Type Safety**: Full TypeScript types and validation
- **Stateless Scalability**: Each request independent, no session state
- **Fault Tolerance**: No session data loss on server restart
- **Simple Deployment**: No session store or persistence layer needed
- **Lower Memory**: No session storage overhead

**Cons:**

- **Limited Customization**: Transport layer is opaque
- **Dependency Weight**: Adds ~5MB to package size (already installed)
- **Framework Pattern**: Must follow Express/Fastify integration patterns

**Fit for LifeOS:**

- ✅ Vault operations are stateless (no multi-step workflows)
- ✅ Claude Code/claude.ai handle conversation context client-side
- ✅ No persistent session requirements
- ✅ Horizontal scalability behind Cloudflare Tunnel
- ✅ Simpler operational model

### Option 2: Use SDK StreamableHTTPServerTransport (Stateful Mode)

**Implementation:**

```typescript
import { randomUUID } from 'node:crypto';

const transports: Record<string, StreamableHTTPServerTransport> = {};

const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => { transports[id] = transport; },
    onsessionclosed: (id) => { delete transports[id]; }
});
```

**Pros:**

- **Session Memory**: Maintains conversation history across requests
- **Resumability**: Clients can resume interrupted sessions
- **State Preservation**: Multi-step workflows with server-side state

**Cons:**

- **Session Management Overhead**: In-memory storage of active sessions
- **Scalability Complexity**: Requires session affinity or external session store
- **Memory Usage**: Session data persists for duration of connection
- **Not Needed for LifeOS**: Vault operations complete in single request-response

**Fit for LifeOS:**

- ❌ No multi-step workflows requiring conversation memory
- ❌ No progress tracking for long-running operations
- ❌ Adds unnecessary complexity for stateless vault operations
- ❌ Requires session cleanup and management logic

### Option 3: Custom HTTP Transport Implementation

**Implementation:**

- Custom Express middleware to handle MCP JSON-RPC 2.0 messages
- Manual routing for tool calls, resource requests, prompt requests
- Custom error handling and response formatting
- Manual session management (if needed)

**Pros:**

- **Full Control**: Complete customization of transport behavior
- **No SDK Dependency**: Reduced package size
- **Custom Features**: Can add non-standard extensions

**Cons:**

- **Protocol Compliance Risk**: Must manually implement MCP spec correctly
- **Development Time**: 2-3 weeks to implement and test transport layer
- **Maintenance Burden**: Must track MCP protocol changes manually
- **Error Prone**: Easy to miss edge cases in JSON-RPC 2.0 handling
- **No Type Safety**: Would need custom TypeScript types
- **Testing Overhead**: Extensive integration testing required
- **Not Standard**: May have compatibility issues with MCP clients

**Fit for LifeOS:**

- ❌ No special requirements justifying custom implementation
- ❌ SDK provides everything needed
- ❌ Additional complexity not justified

## Decision Outcome

**Chosen Option**: Option 1 - Use SDK `StreamableHTTPServerTransport` in Stateless Mode

**Rationale:**

1. **Protocol Compliance**: SDK guarantees correct MCP spec 2025-03-26 implementation
2. **Zero Custom Code**: No HTTP transport layer to write or maintain
3. **Proven Reliability**: Official implementation used by major MCP clients
4. **Stateless Operations**: Vault operations are naturally stateless (search, read, create, edit complete in single request)
5. **Scalability**: Stateless mode allows horizontal scaling behind Cloudflare Tunnel
6. **Fault Tolerance**: No session data loss if server restarts
7. **Simple Deployment**: No session store or persistence layer needed
8. **Maintainability**: SDK updates handle protocol evolution automatically

### Implementation Architecture

```
┌──────────────────────────────────────────────────────────┐
│               claude.ai / Claude Code                     │
│          https://lifeos.shayonpal.com/mcp                 │
└─────────────────────┬────────────────────────────────────┘
                      │
                      │ HTTPS (Cloudflare Tunnel)
                      │
            ┌─────────▼─────────┐
            │ Cloudflare Edge   │
            │ (from ADR-006)    │
            └─────────┬─────────┘
                      │
                      │ Encrypted Tunnel
                      │
            ┌─────────▼─────────┐
            │   cloudflared     │
            │   (Mac Mini)      │
            └─────────┬─────────┘
                      │
                      │ localhost:19831/mcp
                      │
┌─────────────────────▼──────────────────────────────────┐
│  MCP Server (LifeOS)                                   │
│                                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │ stdio Transport                              │   │
│  │ (Claude Desktop, Raycast)                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │ Streamable HTTP Transport (Stateless)        │   │
│  │ - SDK StreamableHTTPServerTransport          │   │
│  │ - sessionIdGenerator: undefined              │   │
│  │ - enableDnsRebindingProtection: true         │   │
│  │ - New transport instance per request         │   │
│  └──────────────────────────────────────────────┘   │
│                                                        │
│  ┌──────────────────────────────────────────────┐   │
│  │ Core MCP Server                              │   │
│  │ - vault-utils.ts (Obsidian operations)       │   │
│  │ - search-engine.ts (Full-text search)        │   │
│  │ - tool-router.ts (Tool routing)              │   │
│  │ - template-*.ts (Template system)            │   │
│  └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### Configuration

**Environment Variables** (`.env`):

```bash
# HTTP Transport
ENABLE_HTTP_TRANSPORT=true
HTTP_PORT=19831
HTTP_HOST=localhost

# Security
ENABLE_DNS_REBINDING_PROTECTION=true
ALLOWED_HOSTS=127.0.0.1,localhost
```

**Implementation** (`src/index.ts`):

```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';

const server = new McpServer({ name: 'lifeos-mcp', version: '2.0.0' });

// Register all tools, resources, prompts...

// Stdio transport (existing, for Claude Desktop)
if (process.env.ENABLE_STDIO_TRANSPORT !== 'false') {
    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);
}

// HTTP transport (new, for claude.ai and remote clients)
if (process.env.ENABLE_HTTP_TRANSPORT === 'true') {
    const app = express();
    app.use(express.json());

    app.post('/mcp', async (req, res) => {
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // Stateless mode
            enableJsonResponse: true,
            enableDnsRebindingProtection: true,
            allowedHosts: (process.env.ALLOWED_HOSTS || '127.0.0.1,localhost').split(',')
        });

        res.on('close', () => transport.close());

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    });

    const port = parseInt(process.env.HTTP_PORT || '19831');
    const host = process.env.HTTP_HOST || 'localhost';

    app.listen(port, host, () => {
        console.log(`HTTP transport listening on http://${host}:${port}/mcp`);
    });
}
```

## Consequences

### Positive

- **No Custom Code**: Zero HTTP transport implementation needed
- **Protocol Compliance**: Guaranteed MCP spec adherence via official SDK
- **Proven Reliability**: Same implementation used by Claude Code, VS Code
- **Automatic Updates**: Protocol changes handled by SDK version bumps
- **Type Safety**: Full TypeScript types and compile-time validation
- **Stateless Scalability**: Horizontal scaling with no session affinity
- **Fault Tolerance**: Server restarts don't lose session data
- **Simple Deployment**: No Redis, database, or session store required
- **Lower Memory**: No session storage overhead
- **Dual Transport**: stdio and HTTP coexist seamlessly

### Negative

- **Limited Customization**: Cannot modify transport layer behavior
- **SDK Dependency**: Tied to SDK release cycle for updates
- **Framework Pattern**: Must follow Express integration approach
- **No Stateful Features**: Cannot add conversation memory later without refactor

### Trade-offs

- **Simplicity vs Control**: Accepted limited customization for simpler implementation
- **SDK Dependency vs Custom Code**: Chose SDK dependency over maintaining custom transport
- **Stateless vs Stateful**: Stateless chosen based on vault operation characteristics

## Security Considerations

### DNS Rebinding Protection

**Threat**: Malicious websites could make requests to `localhost:19831` to access vault data

**Mitigation**:

```typescript
enableDnsRebindingProtection: true,
allowedHosts: ['127.0.0.1', 'localhost']
```

This validates the `Host` header against the whitelist, preventing DNS rebinding attacks.

### Localhost Binding

**Configuration**: `HTTP_HOST=localhost` ensures server only accepts local connections

**Defense**:

- Server not exposed to network (only localhost)
- Cloudflare Tunnel creates encrypted connection
- No direct internet access to MCP server
- Cloudflare handles DDoS, WAF, bot mitigation (from ADR-006)

### CORS (Future)

If browser-based clients are added:

```typescript
import cors from 'cors';

app.use(cors({
    origin: ['https://lifeos.shayonpal.com'],
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'mcp-session-id']
}));
```

## Session Management Decision

### Why Stateless Mode

**Vault Operation Characteristics:**

- **Search**: Single request → results (no state needed)
- **Read Note**: Single request → note content (no state needed)
- **Create Note**: Single request → creation (no state needed)
- **Edit Note**: Single request → modification (no state needed)
- **List Operations**: Single request → list (no state needed)

**Client-Side Context:**

- Claude Code maintains conversation history
- claude.ai maintains chat context
- Each vault operation is independent and complete

**No Requirements For:**

- Multi-step workflows (vault operations are atomic)
- Conversation memory (clients handle this)
- Progress tracking (operations complete in <1s)
- Session resumability (operations don't interrupt)

### Stateful Mode Not Needed

**Reasons to Avoid:**

- Additional complexity (session storage, cleanup, expiration)
- Memory overhead (storing active sessions)
- Scalability issues (session affinity or distributed storage)
- Fault tolerance (session loss on crash)
- No use case justifying the overhead

### Future Migration Path

If stateful features are needed later:

1. Add `sessionIdGenerator: () => randomUUID()`
2. Add session storage: `Record<string, StreamableHTTPServerTransport>`
3. Handle GET/DELETE endpoints for session management
4. Add session cleanup logic (TTL, expiration)
5. Consider external session store (Redis) for persistence

## Monitoring and Success Indicators

### Metrics to Track

- **HTTP Response Time**: p50/p95/p99 latency for `/mcp` endpoint
- **Transport Errors**: Failed transport initialization or request handling
- **Protocol Errors**: Invalid MCP messages or JSON-RPC errors
- **DNS Rebinding Attempts**: Rejected requests due to Host header validation
- **Concurrent Clients**: Number of simultaneous HTTP connections

### Success Criteria

- HTTP transport response time <100ms for tool invocations (p95)
- Zero protocol compliance errors with MCP clients
- stdio transport continues working unchanged
- DNS rebinding protection blocks malicious requests
- Successful claude.ai Custom Connector integration

## Related Decisions

- **ADR-006**: HTTP Transport with Cloudflare Tunnel (deployment strategy)
- **MCP-42**: Research findings validating SDK approach
- **Future ADR**: Authentication and authorization (if needed beyond DNS protection)

## Implementation Issues

- **MCP-85**: Implement Streamable HTTP Transport Layer (SDK approach)
- **MCP-49**: Modify Main Server for Dual Transport (stdio + HTTP)
- **MCP-51**: Environment Variable Configuration
- **MCP-53**: DNS Rebinding Protection Implementation
- **MCP-55**: Create Integration Tests for HTTP Transport

## Issues Closed by This Decision

- **MCP-43**: Session Management Architecture (not needed for stateless)
- **MCP-46**: Implement Session Management (SDK handles, not needed)
- **MCP-47**: Implement Event Store (not needed for stateless)

## Links

- **MCP Specification**: <https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transports#http-with-sse>
- **SDK Documentation**: <https://github.com/modelcontextprotocol/typescript-sdk/blob/main/README.md#streamable-http>
- **Research Issue**: MCP-42 - Research MCP SDK Streamable HTTP Support
- **Deployment Strategy**: ADR-006 - HTTP Transport Implementation with Cloudflare Tunnel

---

*This ADR establishes the implementation approach for Streamable HTTP transport using the official MCP SDK in stateless mode, enabling HTTP-based access while maintaining protocol compliance and operational simplicity.*
