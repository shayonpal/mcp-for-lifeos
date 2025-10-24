# ADR-006: HTTP Transport Implementation with Cloudflare Tunnel

**Status**: Accepted  
**Date**: 2025-10-24  
**Technical Story**: Enable HTTP-based access for claude.ai Custom Connectors and remote clients

## Context and Problem Statement

The MCP for LifeOS server currently only supports stdio transport for local access via Claude Desktop and similar local MCP clients. However, several use cases require HTTP-based access:

1. **claude.ai Custom Connectors**: Requires public HTTPS endpoint to connect web-based Claude to the MCP server
2. **Local CLI Tools and Web Applications**: Need HTTP-based programmatic access without stdio overhead
3. **Remote Access from Mobile Devices**: iPad and mobile workflows require network-accessible endpoint
4. **Cross-Machine Integration**: Access vault from MacBook Air while server runs on Mac Mini

**Current Limitations**:

- No network accessibility - server only accessible via local stdio
- Cannot integrate with web-based AI platforms (claude.ai, cursor.sh web)
- Mobile workflows blocked by stdio transport requirement
- No solution for cross-device vault access

**MCP Protocol Context**:

- MCP specification version 2025-03-26 introduced Streamable HTTP transport
- Streamable HTTP is the newer standard replacing legacy HTTP+SSE transport
- Supports both streaming and non-streaming responses with proper error handling
- Full backward compatibility with stdio transport maintained

## Decision Drivers

### Primary Requirements

- **Public HTTPS Endpoint**: claude.ai Custom Connectors require valid HTTPS with proper certificates
- **Security**: Must not expose MCP server directly to internet or require port forwarding
- **Simplicity**: Minimal configuration and maintenance overhead
- **Zero Router Config**: Should work behind CGNAT, residential ISP, or restrictive networks
- **Dual Access**: Both public URL (for claude.ai) and localhost (for local clients)
- **Backward Compatibility**: Existing stdio transport must continue working

### Technical Constraints

- Mac Mini server behind residential ISP (potential CGNAT)
- No static IP address or control over router configuration
- Certificate management should be automatic (no manual Let's Encrypt renewal)
- Must not require opening ports on home router
- Should handle DDoS and security threats automatically

### User Experience Goals

- Simple deployment and configuration
- Reliable public endpoint (no rotating URLs)
- Fast connection times (low latency)
- Clear error messages and debugging
- Minimal ongoing maintenance

## Considered Options

### Option 1: Traditional Reverse Proxy (nginx + Let's Encrypt)

**Implementation**:

- nginx reverse proxy on public server
- Let's Encrypt for SSL certificates
- Port forwarding from router to Mac Mini
- Certbot for automatic certificate renewal

**Pros**:

- Full control over reverse proxy configuration
- No third-party service dependencies
- Standard deployment pattern

**Cons**:

- Requires static IP or DDNS service
- Port forwarding configuration needed (may not be possible with CGNAT)
- Manual certificate management (certbot can fail)
- Security responsibility falls on developer (DDoS, intrusion detection)
- Complex setup and ongoing maintenance
- Additional VPS cost for public server

**Risk**: High - complex setup, potential certificate renewal failures, port forwarding may not be possible

### Option 2: ngrok Tunneling Service

**Implementation**:

- ngrok agent running on Mac Mini
- Automatic HTTPS tunnel to public endpoint
- No router configuration required

**Pros**:

- Simple setup and configuration
- Works behind any NAT/firewall
- Automatic HTTPS with valid certificates
- No port forwarding needed

**Cons**:

- Free tier has rotating URLs (breaks claude.ai Custom Connector setup)
- Free tier rate limits (40 connections/minute)
- Paid tier required for static domains ($8-12/month)
- Dependency on ngrok infrastructure
- Limited customization options

**Risk**: Medium - free tier insufficient, paid tier recurring cost, vendor lock-in

### Option 3: SSH Tunneling Only

**Implementation**:

- SSH reverse tunnel from Mac Mini to public server
- Local port forwarding for remote access
- Manual HTTPS setup on public server

**Pros**:

- Uses existing SSH infrastructure
- Secure encrypted tunnel
- No additional software required

**Cons**:

- Does not provide HTTPS endpoint for claude.ai (SSH tunnel ≠ HTTPS)
- Requires public server with static IP
- Complex port forwarding management
- No automatic certificate handling
- Cannot satisfy claude.ai Custom Connector requirements

**Risk**: High - does not meet primary requirement (public HTTPS endpoint)

### Option 4: Cloudflare Workers (Serverless Edge Compute)

**Implementation**:

- Deploy MCP server as Cloudflare Worker function
- Edge compute runs at Cloudflare's global network
- Automatic HTTPS and global distribution
- Serverless architecture (no always-on server needed)

**Pros**:

- Global edge distribution (lowest latency worldwide)
- Automatic scaling and zero server maintenance
- Built-in HTTPS and DDoS protection
- No Mac Mini required to be running 24/7

**Cons**:

- **No Filesystem Access**: Workers cannot access local Obsidian vault directly
- **Storage Refactor Required**: Must sync vault to Cloudflare R2 or external storage
- **Major Code Changes**: vault-utils.ts, search-engine.ts need complete rewrite
- **Sync Complexity**: Need custom daemon for iCloud ↔ Cloudflare bidirectional sync
- **Storage Costs**: ~$0.015/GB/month for vault storage in R2
- **Sync Conflicts**: Risk of data conflicts with multiple write sources
- **Real-time Sync**: Need file watcher daemon to detect vault changes
- **Template System Rewrite**: Current filesystem-based templates won't work
- **Development Time**: 2-3 weeks of refactoring for storage layer
- **Cold Start Latency**: Initial function invocations have ~50-200ms delay
- **Stateless Architecture**: Requires external KV for caching and session state

**Risk**: High - requires fundamental architectural refactor, vault must move to cloud storage

**Why Rejected**:

The MCP server's core design depends on direct filesystem access to the local Obsidian vault at `/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)`. Workers have no filesystem access, requiring the entire vault to be synced to Cloudflare R2 or similar cloud storage. This would necessitate:

1. Complete rewrite of vault access layer (vault-utils.ts, search-engine.ts)
2. Custom sync daemon for iCloud → Cloudflare synchronization
3. Conflict resolution for bidirectional sync
4. Storage costs and increased latency for vault operations
5. Loss of direct iCloud integration and local-first architecture

The complexity and development effort (2-3 weeks) outweigh the benefits, especially since Mac Mini must run 24/7 anyway for the sync daemon. Cloudflare Tunnel provides the same public HTTPS endpoint while preserving direct filesystem access.

### Option 5: Cloudflare Tunnel (Selected)

**Implementation**:

- MCP server binds to localhost:19831 (not exposed to network)
- Cloudflare Tunnel (cloudflared) creates secure tunnel to Cloudflare edge
- Public HTTPS endpoint with automatic certificates: `https://lifeos.shayonpal.com`
- Localhost access remains available: `http://localhost:19831`

**Pros**:

- **Zero Router Configuration**: No port forwarding, works behind CGNAT
- **Automatic HTTPS**: Valid certificates from Cloudflare, zero manual management
- **Static Public URL**: No URL rotation, reliable for claude.ai Custom Connectors
- **Built-in Security**: DDoS protection, WAF, bot mitigation at Cloudflare edge
- **Server Stays Local**: MCP server never exposed directly to internet
- **Simple Deployment**: One-time tunnel setup, minimal configuration
- **Zero Trust Integration**: Can add authentication layers via Cloudflare Access
- **Free Tier Available**: Sufficient for personal/small team usage
- **Fast Performance**: Cloudflare global edge network, low latency

**Cons**:

- **Cloudflare Dependency**: Requires Cloudflare account and domain
- **Additional Component**: cloudflared daemon must run alongside MCP server
- **Vendor Lock-in**: Tied to Cloudflare infrastructure (but easy to migrate)

**Risk**: Low - proven technology, minimal maintenance, meets all requirements

## Decision Outcome

**Chosen Option**: Option 5 - Implement Streamable HTTP transport with Cloudflare Tunnel deployment

**Alternatives Considered**:

1. Traditional Reverse Proxy (nginx + Let's Encrypt)
2. ngrok Tunneling Service
3. SSH Tunneling Only
4. Cloudflare Workers (Serverless Edge Compute)

**Rationale**:

- Meets all primary requirements (public HTTPS, security, simplicity)
- Zero router/firewall configuration needed (critical for residential ISP)
- Automatic certificate management (eliminates manual renewal failures)
- Built-in DDoS and security protection (reduces security burden)
- Simple deployment and minimal ongoing maintenance
- Free tier sufficient for personal/small team usage
- Server remains localhost-bound (security best practice)
- Static URL for reliable claude.ai integration

### Implementation Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    claude.ai / Web Clients                    │
│               https://lifeos.shayonpal.com                    │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             │ HTTPS (automatic SSL)
                             │
                   ┌─────────▼─────────┐
                   │ Cloudflare Edge   │
                   │  - DDoS Protection│
                   │  - WAF            │
                   │  - Bot Mitigation │
                   └─────────┬─────────┘
                             │
                             │ Encrypted Tunnel
                             │
                   ┌─────────▼─────────┐
                   │   cloudflared     │
                   │   (Mac Mini)      │
                   └─────────┬─────────┘
                             │
                             │ localhost:19831
                             │
┌────────────────────────────▼─────────────────────────────────┐
│              MCP Server (Streamable HTTP)                    │
│                localhost:19831                               │
│  - stdio transport (existing, unchanged)                     │
│  - HTTP transport (new, Streamable HTTP)                     │
└──────────────────────────────────────────────────────────────┘
                             ▲
                             │
                             │ http://localhost:19831
                             │
                   ┌─────────┴─────────┐
                   │  Local Clients    │
                   │  - CLI tools      │
                   │  - Web apps       │
                   │  - Scripts        │
                   └───────────────────┘
```

### Implementation Plan

#### Phase 1: HTTP Transport Implementation

1. **Add Streamable HTTP Transport to MCP Server**
   - Implement MCP Streamable HTTP protocol (2025-03-26 spec)
   - Add Express.js/Fastify HTTP server binding to localhost:19831
   - Support both streaming and non-streaming responses
   - Maintain 100% backward compatibility with stdio transport

2. **Test Local HTTP Access**
   - Verify localhost:19831 responds to MCP HTTP requests
   - Test tool invocation via HTTP
   - Validate error handling and response formats

#### Phase 2: Cloudflare Tunnel Setup

1. **Cloudflare Account and Domain**
   - Configure domain in Cloudflare DNS
   - Create tunnel in Zero Trust dashboard
   - Generate tunnel credentials

2. **Install and Configure cloudflared**

   ```bash
   # Install cloudflared on Mac Mini
   brew install cloudflared

   # Authenticate with Cloudflare
   cloudflared tunnel login

   # Create tunnel
   cloudflared tunnel create lifeos-mcp

   # Configure tunnel to point to localhost:19831
   # Route https://lifeos.shayonpal.com -> localhost:19831
   cloudflared tunnel route dns lifeos-mcp lifeos.shayonpal.com
   ```

3. **Launch cloudflared as Background Service**
   - Create launchd plist for automatic startup
   - Configure health checks and auto-restart
   - Monitor tunnel status

#### Phase 3: Integration and Testing

1. **Test Public HTTPS Endpoint**
   - Verify `https://lifeos.shayonpal.com` responds
   - Test MCP tool invocation via public URL
   - Validate SSL certificate and HTTPS

2. **Configure claude.ai Custom Connector**
   - Add public endpoint to claude.ai settings
   - Test tool discovery and invocation
   - Verify streaming responses work

3. **Documentation and Deployment**
   - Update deployment guide with HTTP transport instructions
   - Document Cloudflare Tunnel setup process
   - Add troubleshooting section for common issues

### Configuration Example

**MCP Server Configuration** (`config.json`):

```json
{
  "transports": {
    "stdio": {
      "enabled": true
    },
    "http": {
      "enabled": true,
      "host": "localhost",
      "port": 19831
    }
  }
}
```

**Cloudflare Tunnel Configuration** (`config.yml`):

```yaml
tunnel: <tunnel-id>
credentials-file: /Users/shayon/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: lifeos.shayonpal.com
    service: http://localhost:19831
  - service: http_status:404
```

**launchd Service** (`com.shayon.cloudflared.plist`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.shayon.cloudflared</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/cloudflared</string>
        <string>tunnel</string>
        <string>--config</string>
        <string>/Users/shayon/.cloudflared/config.yml</string>
        <string>run</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

## Consequences

### Positive

- **Public HTTPS Access**: claude.ai Custom Connectors work seamlessly
- **Remote Mobile Access**: iPad/mobile workflows enabled via public endpoint
- **Local Access Preserved**: localhost:19831 for local CLI tools and scripts
- **Zero Configuration**: No router/firewall changes, works behind CGNAT
- **Automatic Certificates**: No manual SSL certificate management
- **Built-in Security**: DDoS protection, WAF, bot mitigation at edge
- **Static URL**: Reliable endpoint for Custom Connector configuration
- **Simple Maintenance**: cloudflared auto-updates, minimal configuration drift
- **Backward Compatibility**: Existing stdio transport unchanged

### Negative

- **Cloudflare Dependency**: Requires Cloudflare account and domain
- **Additional Component**: cloudflared daemon adds complexity
- **Potential Latency**: Extra hop through Cloudflare edge (typically <50ms)
- **Free Tier Limits**: May need paid plan for high traffic (unlikely for personal use)
- **Vendor Lock-in**: Migration to alternative requires infrastructure change

### Technical Trade-offs

- **Simplicity vs Control**: Sacrificed low-level control for simpler deployment
- **Vendor Dependency vs Maintenance**: Accepted Cloudflare dependency to eliminate certificate/security management
- **Public Access vs Security**: Mitigated with localhost binding + Cloudflare security layers
- **Cost vs Features**: Free tier sufficient initially, can upgrade if needed

## Security Considerations

### Threat Model

**Addressed Threats**:

- **DDoS Attacks**: Cloudflare edge absorbs traffic before reaching server
- **Port Scanning**: MCP server not directly exposed, no open ports
- **SSL/TLS Vulnerabilities**: Cloudflare manages certificates and TLS configuration
- **Brute Force**: Can add Cloudflare Access authentication layer
- **Data Exfiltration**: Encrypted tunnel, no plaintext transmission

**Additional Security Layers**:

- **Cloudflare Access** (optional): Add authentication before tunnel
- **IP Allowlisting**: Restrict access to specific IP ranges
- **Rate Limiting**: Cloudflare can rate limit requests
- **Audit Logging**: Monitor access via Cloudflare analytics

### Authentication Strategy (Future)

While initial implementation will be unauthenticated (relies on Cloudflare security), future enhancements could add:

- API key authentication at MCP server level
- Cloudflare Access integration for SSO
- IP-based access restrictions
- OAuth2/OIDC for user authentication

## Monitoring and Success Indicators

### Metrics to Track

- **Tunnel Uptime**: cloudflared daemon availability (target: >99.9%)
- **Response Latency**: Public endpoint vs localhost comparison
- **Error Rates**: HTTP transport errors and failures
- **Connection Count**: Number of active HTTP clients
- **Bandwidth Usage**: Data transfer via tunnel

### Success Criteria

- Public HTTPS endpoint accessible from claude.ai within 1 second
- Localhost access maintains <100ms latency for tool invocation
- Tunnel uptime >99.9% (excluding planned maintenance)
- Zero certificate-related errors or outages
- stdio transport continues working without changes

## Future Considerations

### Potential Enhancements

1. **Multiple Transport Support**: Allow simultaneous stdio and HTTP connections
2. **WebSocket Transport**: Add WebSocket for long-lived connections
3. **Authentication**: Implement API key or OAuth2 authentication
4. **Multi-Region Tunnels**: Deploy multiple tunnels for redundancy
5. **Load Balancing**: Distribute traffic across multiple MCP server instances

### Alternative Deployment Options

If Cloudflare Tunnel becomes unsuitable:

- **Tailscale**: Zero-config VPN for private network access
- **WireGuard**: Custom VPN for cross-device access
- **Paid ngrok**: Static domains with higher limits
- **AWS API Gateway + Lambda**: Serverless MCP endpoint

## Reversal Criteria

This decision should be reconsidered if:

- Cloudflare free tier becomes insufficient (traffic/connection limits)
- Cloudflare introduces breaking changes to tunnel service
- Latency through Cloudflare edge exceeds 200ms consistently
- Alternative solution provides significantly better cost/performance
- MCP protocol deprecates HTTP transport in favor of new standard

## Related Decisions

- **ADR-002**: Strategic Pivot to Core Server (enables HTTP transport focus)
- **MCP Specification**: 2025-03-26 Streamable HTTP transport standard
- **Future ADR**: Authentication and authorization strategy (pending)

## Links

- **MCP Streamable HTTP Spec**: <https://spec.modelcontextprotocol.io/specification/basic/transports/#streamable-http>
- **Cloudflare Tunnel Docs**: <https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/>
- **Implementation**: `src/transports/http-transport.ts` (to be created)
- **Deployment Guide**: `docs/guides/DEPLOYMENT-GUIDE.md` (to be updated)
- **Linear Issue**: (to be created for tracking)

---

*This ADR establishes the HTTP transport implementation strategy, enabling public HTTPS access for claude.ai Custom Connectors and remote clients while maintaining security and simplicity through Cloudflare Tunnel.*
