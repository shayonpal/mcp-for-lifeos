# Scripts Directory

This directory contains utility scripts for development, testing, deployment, and analytics for the LifeOS MCP Server.

## 🚀 Setup and Deployment

### **[setup.sh](./setup.sh)** - Automated Setup Script
Complete automated installation and configuration with interactive prompts.

```bash
# Full setup with all steps
./scripts/setup.sh

# Skip dependency installation
./scripts/setup.sh --skip-deps

# Skip configuration generation  
./scripts/setup.sh --skip-config

# Silent mode (no interactive prompts)
./scripts/setup.sh --silent
```

**Features:**
- Dependency installation and build process
- Interactive vault path configuration
- Client integration config generation (Claude Desktop, Raycast, Cursor)
- Validation and testing of setup
- Comprehensive error handling and logging

## 🔧 Server Management

### **[start-mcp.sh](./start-mcp.sh)** - MCP Server Launcher
Start the MCP server with proper environment setup for client integrations.

```bash
# Start MCP server (for Raycast integration)
./scripts/start-mcp.sh

# Or directly
chmod +x scripts/start-mcp.sh
./scripts/start-mcp.sh
```

### **[start-web.js](./start-web.js)** - Web Interface Launcher
Start the experimental web interface for development and testing.

```bash
# Enable web interface on default port (19831)
node scripts/start-web.js

# Custom port
WEB_PORT=8080 node scripts/start-web.js
```

**⚠️ Warning:** Never enable web interface when running as MCP server for clients.

### **[start-with-analytics.sh](./start-with-analytics.sh)** - MCP + Analytics
Start MCP server with analytics dashboard enabled.

```bash
# Start server with analytics
./scripts/start-with-analytics.sh

# Analytics dashboard available at http://localhost:19832
```

## 📊 Analytics and Monitoring

### **[start-analytics-dashboard.js](./start-analytics-dashboard.js)** - Analytics Dashboard
Launch the analytics dashboard to view usage patterns and performance insights.

```bash
# Default port (19832)
node scripts/start-analytics-dashboard.js

# Custom port
ANALYTICS_DASHBOARD_PORT=9000 node scripts/start-analytics-dashboard.js
```

**Features:**
- Real-time usage statistics and tool distribution
- Performance analysis with execution time trends  
- Routing accuracy for consolidated tools
- Daily usage patterns and cache hit rates

### **[generate-test-analytics.js](./generate-test-analytics.js)** - Test Data Generator
Generate sample analytics data for development and testing.

```bash
# Generate test analytics data
node scripts/generate-test-analytics.js

# Useful for:
# - Testing analytics dashboard with sample data
# - Development environment setup
# - Demonstrating analytics features
```

## 🧪 Testing and Validation

**Primary Testing**: Use the Jest test suite for all testing needs.

```bash
# Run all tests (250+ passing tests)
npm test

# Run specific test types
npm run test:unit
npm run test:integration

# Run tests in watch mode
npm run test:watch
```

### **Archived Test Scripts** (2025-10-22)

Standalone test scripts have been **archived** to `scripts/archived/` and superseded by the Jest test suite:

- ~~test-claude-desktop.js~~ → `tests/integration/claude-desktop-integration.test.ts`
- ~~test-tool-parity.js~~ → Jest integration tests
- ~~test-tool-consolidation.js~~ → `tests/unit/tool-router.test.ts`
- ~~test-analytics.js~~ → Analytics unit tests
- ~~test-advanced-features.js~~ → `tests/unit/search-engine.test.ts`, `tests/unit/query-parser.test.ts`
- ~~test-issue-61-acceptance.js~~ → `tests/unit/search-engine.test.ts`

**Why archived**: Migration to Jest complete, some scripts had vault pollution risks (MCP-61).

**See**: `scripts/archived/README.md` for full rationale and safety warnings.

## 🔍 Development and Debugging

### **[test-server.js](./test-server.js)** - Server Functionality Test
Basic server functionality and connectivity testing.

```bash
# Test basic server startup and tool availability
node scripts/test-server.js

# Quick validation that server is working correctly
```

### **[test-manual.sh](./test-manual.sh)** - Manual Testing Helper
Interactive testing script for manual validation workflows.

```bash
# Run manual testing procedures
./scripts/test-manual.sh

# Guides through manual testing steps for comprehensive validation
```

### **[test-advanced-features.js](./test-advanced-features.js)** - Advanced Feature Testing
Test advanced features like natural language processing and complex search operations.

```bash
# Test advanced search features
node scripts/test-advanced-features.js

# Includes:
# - Natural language query processing
# - Complex YAML property searches
# - Advanced routing scenarios
```

### **[test-analytics.js](./test-analytics.js)** - Analytics System Testing
Test analytics collection, processing, and dashboard functionality.

```bash
# Test analytics system
node scripts/test-analytics.js

# Validates:
# - Metrics collection accuracy
# - Dashboard data generation
# - Performance overhead measurement
```

### **[test-issue-61-acceptance.js](./test-issue-61-acceptance.js)** - Specific Issue Validation
Test script for validating specific issue fixes and acceptance criteria.

```bash
# Test Issue #61 acceptance criteria
node scripts/test-issue-61-acceptance.js

# Used for:
# - Specific feature validation
# - Regression testing
# - Acceptance criteria verification
```

## 🛠️ Usage Guidelines

### Development Workflow

```bash
# 1. Setup new environment
./scripts/setup.sh

# 2. Test basic functionality  
node scripts/test-server.js

# 3. Run comprehensive tests
npm test
node scripts/test-claude-desktop.js
node scripts/test-tool-parity.js

# 4. Start with analytics for development
./scripts/start-with-analytics.sh
```

### CI/CD Integration

```bash
# Validation for CI/CD pipelines
npm test                # All Jest tests
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
npm run typecheck       # TypeScript validation
```

### Production Deployment

```bash
# Automated production setup
./scripts/setup.sh --silent

# Validate before deployment
node scripts/test-server.js
npm run typecheck
```

## 📝 Script Categories

| Category | Scripts | Purpose |
|----------|---------|---------|
| **Setup** | setup.sh | Environment configuration and installation |
| **Server Management** | start-mcp.sh, start-web.js, start-with-analytics.sh | Various server startup modes |
| **Analytics** | start-analytics-dashboard.js, generate-test-analytics.js | Analytics system management |
| **Development** | test-server.js, test-manual.sh | Server validation and manual testing helpers |
| **Archived** | archived/* (6 scripts) | Legacy test scripts superseded by Jest (see archived/README.md) |

## ⚠️ Important Notes

### Security Considerations
- Scripts may contain or generate configuration with sensitive paths
- Never commit generated client configurations to version control
- Review generated configs before sharing or deployment

### Prerequisites
- **Node.js 18+** installed and in PATH
- **npm dependencies** installed (`npm install`)
- **TypeScript compilation** completed (`npm run build`)
- **Valid configuration** in `src/config.ts`

### Performance Impact
- **Testing scripts**: May create temporary files and processes
- **Analytics scripts**: Minimal <1ms overhead during collection
- **Server scripts**: Production-ready with proper resource management

## 🔧 Maintenance

### Adding New Scripts
1. **Follow naming convention**: `action-target.js/sh` (e.g., `test-feature.js`, `start-server.sh`)
2. **Add proper headers**: Include purpose, usage, and requirements
3. **Document here**: Add entry to appropriate category table
4. **Test thoroughly**: Ensure scripts work in clean environments

### Script Dependencies
Most scripts require:
- Built project (`npm run build`)
- Valid configuration (`src/config.ts`)
- Accessible vault path
- Node.js runtime environment

---

**Last Updated**: October 22, 2025
**Active Scripts**: 8 utility scripts
**Archived Scripts**: 6 (see archived/README.md)
**Categories**: Setup, server management, analytics, development