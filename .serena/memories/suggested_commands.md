# Suggested Commands for LifeOS MCP Server

## Development Commands

### Building & Running
```bash
# Install dependencies
npm install

# Build the project (TypeScript compilation)
npm run build

# Development mode (uses tsx for hot reload)
npm run dev

# Production mode (run compiled code)
npm start

# Watch mode (auto-restart on changes)
npm run watch
```

### Testing
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Test Claude Desktop integration
npm run test:claude-desktop

# Test tool parity (consistency checks)
npm run test:tool-parity

# Verbose tool parity testing
npm run test:tool-parity:verbose
```

### Code Quality
```bash
# Type checking (IMPORTANT: Used instead of linting for errors)
npm run typecheck

# Linting (ESLint - for style checks)
npm run lint
```

### Setup & Configuration
```bash
# Automated setup (recommended for initial setup)
chmod +x scripts/setup.sh
./scripts/setup.sh

# Manual configuration
cp src/config.example.ts src/config.ts
# Then edit src/config.ts with your vault paths
```

## System Commands (Darwin/macOS)

### Git Operations
```bash
git status
git diff
git add .
git commit -m "message"
git push
git pull
```

### File System
```bash
ls -la              # List files with details
find . -name "*.ts" # Find TypeScript files
grep -r "pattern"   # Search in files
```

### Process Management
```bash
ps aux | grep node  # Find Node.js processes
kill -9 [PID]      # Force kill process
lsof -i :8000      # Check what's using port 8000
```

## Important Notes
- **Type checking is primary**: This project uses `npm run typecheck` for catching errors, not ESLint
- **ES Modules**: Project uses ES modules (type: "module" in package.json)
- **Node version**: Requires Node.js 18+
- **Config required**: Must create src/config.ts before running