# MCP-for-LifeOS Web Interface MVP: GitHub Issues

This document contains atomic GitHub issues for implementing the MVP version of the MCP web interface, prioritizing frontend development first, then backend integration. All issues focus on the Anthropic-only MVP as defined in the PRD Phase 1.

## Priority 1: Core Frontend Infrastructure (P0 - Critical)

### Issue F-001
**Title**: Create basic HTML structure and PWA manifest for web interface
**Priority**: P0 (Critical)
**Description**: 
Set up the foundational HTML structure for the web interface with PWA capabilities.

**Acceptance Criteria**:
- Create `public/index.html` with semantic HTML structure
- Create `public/manifest.json` with PWA configuration for iOS compatibility
- Include meta tags for viewport, PWA display modes, and iOS-specific settings
- Add basic favicon and app icons (16x16, 32x32, 192x192, 512x512)
- Ensure HTML validates and loads correctly at http://localhost:9000

**Files to Create**:
- `public/index.html`
- `public/manifest.json` 
- `public/icons/` directory with app icons

**Labels**: P0, frontend, pwa, foundation

---

### Issue F-002
**Title**: Implement responsive CSS framework and chat interface styling
**Priority**: P0 (Critical)
**Description**:
Create responsive CSS styling for the chat interface optimized for desktop, iPad, and mobile devices.

**Acceptance Criteria**:
- Create `public/css/styles.css` with mobile-first responsive design
- Implement chat message styling (user vs assistant messages)
- Add loading states and visual feedback for API calls
- Ensure touch-friendly interface for iOS devices
- Test responsive breakpoints (mobile: <768px, tablet: 768-1024px, desktop: >1024px)
- Include dark/light theme variables (implement light theme first)

**Files to Create**:
- `public/css/styles.css`

**Dependencies**: F-001

**Labels**: P0, frontend, css, responsive

---

### Issue F-003
**Title**: Build core chat interface JavaScript functionality
**Priority**: P0 (Critical)
**Description**:
Implement the client-side JavaScript for the chat interface with message handling and basic interaction.

**Acceptance Criteria**:
- Create `public/js/app.js` with chat functionality
- Implement message sending via form submission
- Add message rendering with basic markdown support
- Include loading states during API requests
- Add session-based message history (localStorage)
- Implement clear conversation functionality
- Handle basic error states in UI

**Files to Create**:
- `public/js/app.js`

**Dependencies**: F-001, F-002

**Labels**: P0, frontend, javascript, chat

---

### Issue F-004
**Title**: Implement Service Worker for PWA offline capabilities
**Priority**: P1 (High)
**Description**:
Create service worker to enable PWA installation and basic offline functionality.

**Acceptance Criteria**:
- Create `public/service-worker.js` with caching strategy
- Cache static assets (HTML, CSS, JS, icons)
- Implement offline fallback page
- Add PWA installation prompts for iOS Safari
- Test PWA installation on iOS devices
- Verify offline functionality works correctly

**Files to Create**:
- `public/service-worker.js`

**Dependencies**: F-001, F-002, F-003

**Labels**: P1, frontend, pwa, service-worker

---

## Priority 2: API Key Management & Configuration (P1 - High)

### Issue F-005
**Title**: Create API key management interface
**Priority**: P1 (High)
**Description**:
Build UI components for entering and managing Anthropic API keys with client-side validation.

**Acceptance Criteria**:
- Add API key input form to main interface
- Implement client-side validation for Anthropic API key format
- Store API keys securely in localStorage (encrypted)
- Add toggle for showing/hiding API key value
- Include "Test Connection" button to verify key validity
- Show clear status indicators for configured/unconfigured state
- Add help text with link to Anthropic API key documentation

**Files to Modify**:
- `public/index.html` (add API key form)
- `public/js/app.js` (add key management logic)
- `public/css/styles.css` (style form components)

**Dependencies**: F-003

**Labels**: P1, frontend, api-keys, security

---

### Issue F-006
**Title**: Implement model selection interface for Anthropic models
**Priority**: P1 (High)
**Description**:
Create UI for selecting between available Anthropic Claude models.

**Acceptance Criteria**:
- Add model selection dropdown with Anthropic models:
  - `claude-sonnet-4-20250514`
  - `claude-3-7-sonnet-latest`
- Implement model switching that affects subsequent API calls
- Store selected model in localStorage for session persistence
- Add model descriptions/tooltips explaining differences
- Handle model availability gracefully

**Files to Modify**:
- `public/index.html` (add model selector)
- `public/js/app.js` (add model selection logic)
- `public/css/styles.css` (style dropdown)

**Dependencies**: F-003

**Labels**: P1, frontend, models, anthropic

---

## Priority 3: Backend Infrastructure (P1 - High)

### Issue B-001
**Title**: Set up basic HTTP server with Fastify framework
**Priority**: P1 (High)
**Description**:
Create the foundational HTTP server infrastructure to serve the web interface and API endpoints.

**Acceptance Criteria**:
- Install Fastify and necessary dependencies in `package.json`
- Create `src/server/http-server.js` with basic Fastify setup
- Serve static files from `public/` directory
- Configure server to run on port 9000, host 0.0.0.0
- Add basic CORS configuration for local network access
- Include proper error handling and logging
- Test server starts correctly and serves static files

**Files to Create**:
- `src/server/http-server.js`

**Files to Modify**:
- `package.json` (add Fastify dependencies)

**Labels**: P1, backend, server, fastify

---

### Issue B-002
**Title**: Create HTTP transport layer for MCP server
**Priority**: P1 (High)
**Description**:
Implement HTTP transport that maintains compatibility with existing stdio transport while adding web capabilities.

**Acceptance Criteria**:
- Create `src/server/http-transport.js` implementing HTTP transport
- Maintain compatibility with existing MCP server architecture
- Support dual transport mode (stdio + HTTP)
- Add WebSocket support for real-time streaming
- Implement proper request/response handling
- Include error handling for transport layer failures
- Add environment variable controls (ENABLE_WEB_INTERFACE)

**Files to Create**:
- `src/server/http-transport.js`

**Files to Modify**:
- `src/index.ts` (add HTTP transport initialization)

**Dependencies**: B-001

**Labels**: P1, backend, transport, mcp

---

### Issue B-003
**Title**: Implement Anthropic provider integration
**Priority**: P1 (High)
**Description**:
Create Anthropic Claude API integration with streaming support for the MVP.

**Acceptance Criteria**:
- Create `src/providers/anthropic.js` with Anthropic SDK integration
- Support specified models: `claude-sonnet-4-20250514`, `claude-3-7-sonnet-latest`
- Implement streaming chat responses using Server-Sent Events (SSE)
- Add proper error handling for API failures, rate limits, invalid keys
- Include model availability verification
- Add usage tracking (request count, token usage)
- Implement retry logic with exponential backoff

**Files to Create**:
- `src/providers/anthropic.js`

**Files to Modify**:
- `package.json` (add @anthropic-ai/sdk dependency)

**Dependencies**: B-002

**Labels**: P1, backend, anthropic, llm-integration

---

### Issue B-004
**Title**: Create chat API endpoints with streaming support
**Priority**: P1 (High)
**Description**:
Implement REST API endpoints for chat functionality with real-time streaming.

**Acceptance Criteria**:
- Create `/api/chat` POST endpoint for sending messages
- Implement `/api/chat/stream` for Server-Sent Events streaming
- Add `/api/models` GET endpoint for listing available models
- Include `/api/health` endpoint for connectivity testing
- Implement proper request validation and sanitization
- Add rate limiting to prevent abuse
- Include comprehensive error responses with proper HTTP status codes

**Files to Create**:
- `src/api/chat.js`
- `src/api/models.js` 
- `src/api/health.js`

**Files to Modify**:
- `src/server/http-server.js` (register API routes)

**Dependencies**: B-003

**Labels**: P1, backend, api, streaming

---

## Priority 4: Integration & Polish (P2 - Medium)

### Issue I-001
**Title**: Connect frontend chat interface to backend API
**Priority**: P2 (Medium)
**Description**:
Integrate the frontend chat interface with the backend streaming API.

**Acceptance Criteria**:
- Update `public/js/app.js` to call backend API endpoints
- Implement streaming response handling using EventSource
- Add proper error handling for network failures
- Show connection status in UI (connected/disconnected)
- Handle API key validation errors gracefully
- Add retry logic for failed requests
- Test end-to-end chat functionality

**Files to Modify**:
- `public/js/app.js` (add API integration)

**Dependencies**: F-003, B-004

**Labels**: P2, integration, frontend, backend

---

### Issue I-002
**Title**: Add network discovery and mDNS support
**Priority**: P2 (Medium)
**Description**:
Implement optional mDNS/Bonjour support for easier discovery of the web interface on the local network.

**Acceptance Criteria**:
- Add optional mDNS advertising for the web service
- Advertise service as "MCP-LifeOS._http._tcp.local"
- Include TXT records with version and capabilities
- Make mDNS configurable via environment variables
- Test discovery from iOS devices on same network
- Add fallback documentation for manual IP access

**Files to Create**:
- `src/server/mdns.js`

**Files to Modify**:
- `src/server/http-server.js` (integrate mDNS)
- `package.json` (add mDNS dependencies)

**Dependencies**: B-001

**Labels**: P2, backend, network, discovery

---

### Issue I-003
**Title**: Implement comprehensive error handling and user feedback
**Priority**: P2 (Medium)
**Description**:
Add robust error handling throughout the application with clear user feedback.

**Acceptance Criteria**:
- Create error handling utilities for common failure scenarios
- Add user-friendly error messages for API failures
- Implement toast notifications or error banners
- Add retry mechanisms for transient failures
- Include offline detection and appropriate messaging
- Log errors appropriately for debugging
- Test error scenarios thoroughly

**Files to Create**:
- `src/utils/error-handler.js`
- `public/js/error-utils.js`

**Files to Modify**:
- `public/js/app.js` (integrate error handling)
- `src/server/http-server.js` (add error middleware)

**Dependencies**: I-001

**Labels**: P2, error-handling, ux, reliability

---

## Priority 5: Testing & Documentation (P3 - Low)

### Issue T-001
**Title**: Create basic integration tests for MVP functionality
**Priority**: P3 (Low)
**Description**:
Implement basic testing to ensure MVP functionality works correctly.

**Acceptance Criteria**:
- Set up testing framework (Jest or similar)
- Create tests for API endpoints functionality
- Add frontend integration tests for chat interface
- Test PWA installation and offline functionality
- Include network connectivity tests
- Add CI/CD workflow for automated testing
- Document testing procedures

**Files to Create**:
- `tests/` directory structure
- `tests/api.test.js`
- `tests/frontend.test.js`
- `.github/workflows/test.yml`

**Dependencies**: I-001

**Labels**: P3, testing, ci-cd

---

### Issue T-002
**Title**: Create deployment documentation and setup scripts
**Priority**: P3 (Low)
**Description**:
Document the deployment process and create setup scripts for easy installation.

**Acceptance Criteria**:
- Create deployment guide with step-by-step instructions
- Add environment configuration documentation
- Create setup script for initial deployment
- Document troubleshooting common issues
- Add system requirements and dependencies
- Include network configuration guidance
- Test documentation with fresh installation

**Files to Create**:
- `docs/DEPLOYMENT.md`
- `scripts/setup.sh`
- `docs/TROUBLESHOOTING.md`

**Labels**: P3, documentation, deployment

---

## Implementation Order

**Phase 1 - Foundation (Week 1)**
1. F-001: Basic HTML & PWA manifest
2. F-002: CSS framework & styling  
3. F-003: Core chat JavaScript
4. F-005: API key management interface

**Phase 2 - Backend (Week 2)**  
1. B-001: HTTP server setup
2. B-002: HTTP transport layer
3. B-003: Anthropic integration
4. B-004: Chat API endpoints

**Phase 3 - Integration (Week 3)**
1. I-001: Frontend-backend integration
2. F-004: Service Worker & PWA
3. F-006: Model selection interface
4. I-003: Error handling

**Phase 4 - Polish (Week 4)**
1. I-002: mDNS discovery
2. T-001: Integration testing
3. T-002: Documentation

## Notes

- All P0 issues are critical for basic functionality
- P1 issues are required for MVP completion  
- P2 issues improve user experience and reliability
- P3 issues are nice-to-have for production readiness
- Each issue should be completable in 1-2 days
- Dependencies are clearly marked to prevent blocking
- Issues are designed to be worked on in parallel where possible