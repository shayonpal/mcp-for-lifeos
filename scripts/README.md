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

### **[test-claude-desktop.js](./test-claude-desktop.js)** - Claude Desktop Integration Tests
Standalone test runner for AI Tool Caller Optimization validation.

```bash
# Quick accuracy test (30 seconds)
node scripts/test-claude-desktop.js --accuracy-only

# Full test suite with detailed results
node scripts/test-claude-desktop.js

# Test specific scenario
node scripts/test-claude-desktop.js --scenario=search-basic-text --verbose

# Available scenarios: search-*, creation-*, listing-*, workflow-*
```

**Performance Target:** 95% AI tool selection accuracy (currently achieved)

### **[test-tool-parity.js](./test-tool-parity.js)** - Tool Parity Validation
Comprehensive testing to ensure consolidated tools match legacy tool outputs exactly.

```bash
# Run all parity tests
node scripts/test-tool-parity.js

# Test specific category
node scripts/test-tool-parity.js --category search

# Verbose debugging output
node scripts/test-tool-parity.js --verbose

# Custom configuration
node scripts/test-tool-parity.js --category creation --max-tests 5 --verbose
```

**Performance Target:** 95% output parity, <500ms performance difference

### **[test-tool-consolidation.js](./test-tool-consolidation.js)** - Consolidation Testing
Test the tool consolidation and routing logic effectiveness.

```bash
# Test tool consolidation routing
node scripts/test-tool-consolidation.js

# Validates:
# - Auto-mode detection accuracy
# - Routing logic correctness  
# - Fallback mechanism effectiveness
# - Performance within targets
```

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
# Quick validation (suitable for CI)
npm run test:claude-desktop:accuracy
npm run test:tool-parity

# Full validation (for releases)
npm test
node scripts/test-claude-desktop.js
node scripts/test-tool-parity.js --verbose
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
| **Analytics** | start-analytics-dashboard.js, generate-test-analytics.js, test-analytics.js | Analytics system management |
| **Testing** | test-claude-desktop.js, test-tool-parity.js, test-server.js | Comprehensive testing suite |
| **Validation** | test-tool-consolidation.js, test-advanced-features.js, test-issue-*.js | Feature validation and regression testing |
| **Development** | test-manual.sh | Interactive development helpers |

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

**Last Updated**: August 29, 2025  
**Script Count**: 14 utility scripts  
**Categories**: Setup, server management, analytics, testing, validation, development