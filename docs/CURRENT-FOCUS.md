# Current Development Focus

**Last Updated:** 2025-10-23  
**Cycle:** Cycle 8 (Oct 20-27, 2025)  
**Progress:** 75% complete (9/12 issues done)  
**Current Branch:** master

---

## 🎯 Active Work

### MCP-60: Configuration Flag to Hide Legacy LifeOS MCP Tools

**Branch:** `feature/mcp-60-add-configuration-flag-to-hide-legacy-lifeos-mcp-tools`  
**Priority:** High  
**Status:** In Progress

**Problem:** MCP clients see both consolidated and legacy tool aliases, causing confusion

**Solution:** Add config flag to hide legacy aliases without code changes

**Tasks:**

1. Implement server flag (env var/config option)
2. Wire config through `.env`, `config.ts`, Codex `config.toml`
3. Update README + release notes with flag documentation
4. Define acceptance tests for both modes (legacy visible/hidden)
5. Verify with MCP clients (Codex, Claude Desktop)

**Note:** MCP-4 (Analytics) deferred pending test infrastructure decision

---

## 🔜 Up Next

### Priority 1: HTTP Transport Foundation (Unblock 13 Issues)

Complete these 3 design/research issues to unblock all HTTP Transport work:

1. **MCP-42** (Urgent, 2-3h) - Research MCP SDK Streamable HTTP Support
   - Verify SDK version compatibility
   - Study official Streamable HTTP examples
   - Document implementation approach

2. **MCP-43** (High, 2-3h) - Design Session Management Architecture
   - Session ID generation strategy
   - Event store design
   - Resumability with Last-Event-ID

3. **MCP-44** (High, 2-3h) - Design Security Model
   - Origin validation
   - Authentication approach
   - HTTPS enforcement
   - Rate limiting strategy

**Dependencies:** All 13 HTTP Transport implementation issues are blocked on these three

### Priority 2: Test Infrastructure Stabilization

**Project:** Test Infrastructure Stabilization (Next Cycle)  
**Parent Issue:** MCP-62 - Fix 28 pre-existing test failures

Sub-issues ready to work:

- **MCP-63** (High) - Fix template manager test failures (4 tests)
- **MCP-64** (High) - Fix daily note task workflow failures (3 tests)
- **MCP-65** (High) - Fix remaining integration test failures (21 tests)

**Current Test Status:** 249/278 passing (89.6%)

---

## 🚫 Blocked Work

### HTTP Transport Implementation (13 Issues)

All implementation work blocked waiting for foundation (MCP-42, MCP-43, MCP-44):

- MCP-45: Implement Streamable HTTP Transport Layer (blocks 5 others)
- MCP-46: Implement Session Management (blocked by MCP-43)
- MCP-47: Implement Event Store (blocked by MCP-43)
- MCP-48: Add SSE Streaming Support (blocked by MCP-45, MCP-47)
- MCP-49: Modify Main Server for Dual Transport (blocks 4 others)
- MCP-50: Replace http-server.ts (blocked by MCP-45, MCP-49)
- MCP-51: Environment Variable Configuration (blocked by MCP-49)
- MCP-53: Authentication Middleware (blocked by MCP-44)
- MCP-54: Configure HTTPS Support (blocked by MCP-44, MCP-49)
- MCP-55: Create Integration Tests (blocked by MCP-49, MCP-50)
- MCP-56: Test Session Resumability (blocked by MCP-48, MCP-55)
- MCP-57: Test Concurrent Multi-Client (blocked by MCP-55, MCP-56)
- MCP-58: Deployment Documentation (blocked by MCP-51, MCP-53, MCP-54)

### Web Interface Projects

**Status:** All deferred  
**Rationale:** Focus on core MCP server stability and HTTP Transport foundation

---

## 📌 Notes for Claude

- **Current branch:** master (no active feature branches)
- **Linear Team ID:** `d1aae15e-d5b9-418d-a951-adcf8c7e39a8`
- **Test suite status:** 249/278 passing (89.6%)
- **Decision needed:** Test infrastructure vs HTTP Transport priority

---

## 🔄 Update Instructions

Run `/current-focus` to update this file with latest Linear cycle data.

Manual updates when:

1. Starting new work (update Active Work section)
2. Completing issues (move from Active to appropriate section)
3. Discovering blockers (update Blocked Work section)
4. Switching branches (update Current Branch in header)

Keep this file focused on current + next 1-2 weeks of work only.
