# LifeOS MCP Server - Deployment Guide

This guide provides comprehensive instructions for deploying the LifeOS MCP server in various environments and configurations.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Start](#quick-start)
3. [Manual Installation](#manual-installation)
4. [Client Configuration](#client-configuration)
5. [Network Configuration](#network-configuration)
6. [Production Deployment](#production-deployment)
7. [Environment Variables](#environment-variables)
8. [Validation & Testing](#validation--testing)

## System Requirements

### Minimum Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Operating System**: macOS, Linux, or WSL2
- **Memory**: 512MB RAM minimum, 1GB recommended
- **Storage**: 100MB for application files + vault size

### Supported Platforms

- **macOS**: 10.15 (Catalina) or later
- **Linux**: Ubuntu 18.04+, CentOS 7+, or equivalent
- **WSL2**: Windows 10 version 2004+ or Windows 11

**Note**: Native Windows is not supported. Windows users should use WSL2. See [WSL2 Setup Guide](WSL2-SETUP.md) for installation instructions.

### Required Dependencies

- **Obsidian**: For vault management and link integration
- **Git**: For cloning repository and version control

### Vault Requirements

- **LifeOS Vault Structure**: Must follow PARA method organization
- **Template System**: Optional but recommended for full functionality
- **YAML Frontmatter**: Notes should use consistent YAML formatting

## Quick Start

For rapid deployment, use our automated setup script:

```bash
# Clone the repository
git clone https://github.com/your-username/mcp-for-lifeos.git
cd mcp-for-lifeos

# Run automated setup
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The setup script will:

- Verify system requirements
- Install dependencies
- Generate configuration from template
- Build the application
- Configure client integrations
- Validate the installation

## Manual Installation

If you prefer manual control over the installation process:

### 1. Clone Repository

```bash
git clone https://github.com/your-username/mcp-for-lifeos.git
cd mcp-for-lifeos
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Verify installation
npm list --depth=0
```

### 3. Configuration Setup

```bash
# Copy configuration template
cp src/config.example.ts src/config.ts

# Edit configuration file
nano src/config.ts  # or your preferred editor
```

> **📝 Note:** All paths shown below are **templates**. Replace `YOUR_USERNAME` and adjust paths to match your actual vault location and system configuration.

**Required Configuration Updates:**

```typescript
export const LIFEOS_CONFIG: LifeOSConfig = {
  // Update these paths to match your vault location
  vaultPath: '/Users/YOUR_USERNAME/path/to/your/LifeOS-Vault',
  attachmentsPath: '/Users/YOUR_USERNAME/path/to/your/LifeOS-Vault/00 - Meta/Attachments',
  templatesPath: '/Users/YOUR_USERNAME/path/to/your/LifeOS-Vault/00 - Meta/Templates',
  dailyNotesPath: '/Users/YOUR_USERNAME/path/to/your/LifeOS-Vault/20 - Areas/21 - Myself/Journals/Daily',
  
  // Optional: Configure YAML rules integration
  yamlRulesPath: '/Users/YOUR_USERNAME/path/to/your/LifeOS-Vault/00 - Meta/System/YAML Rules.md'
};

// Customize people mappings for your contacts
export const YAML_RULES = {
  // ... existing rules ...
  PEOPLE_MAPPINGS: {
    'YourPartner': { people: ['[[Your Partner Name]]'], tags: ['partner'] },
    'YourPet': { people: ['[[Your Pet Name]]'], tags: ['pet'] },
    'YourFriend': { people: ['[[Friend Name]]'], tags: ['friend'] }
    // Add your specific people here
  }
};
```

### 4. Build Application

```bash
# Compile TypeScript to JavaScript
npm run build

# Verify build success
ls -la dist/
```

### 5. Test Installation

```bash
# Run type checking
npm run typecheck

# Test MCP server startup
node dist/index.js --help

# Run basic functionality test
npm test
```

## Client Configuration

### Claude Desktop

Add the MCP server to your Claude Desktop configuration:

**macOS/Linux:**

```bash
# Edit Claude Desktop config
nano ~/.config/claude-desktop/claude_desktop_config.json
```

**WSL2:**

```bash
# Edit Claude Desktop config (same as Linux)
nano ~/.config/claude-desktop/claude_desktop_config.json
```

**Configuration:**

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-for-lifeos/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important Notes:**

- Use absolute paths, not relative paths
- Ensure the path exists and is accessible
- Restart Claude Desktop after configuration changes

### Raycast Integration

Configure Raycast to use the MCP server:

1. **Install MCP Extension** (if available) or create custom script
2. **Configure Script Path:**

   ```bash
   # Edit the start-mcp.sh script with your paths
   nano scripts/start-mcp.sh
   ```

3. **Update Paths:**

   ```bash
   #!/bin/bash
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   
   cd "/absolute/path/to/mcp-for-lifeos"
   exec node dist/index.js "$@"
   ```

4. **Make Executable:**

   ```bash
   chmod +x scripts/start-mcp.sh
   ```

### Cursor IDE Integration

The setup script automatically generates Cursor configurations:

**Project-specific configuration (recommended):**

```bash
# Copy generated config to your project
cp config-examples/cursor-project-mcp.json .cursor/mcp.json
```

**Global configuration:**

```bash
# Copy generated config to global location
cp config-examples/cursor-global-mcp.json ~/.cursor/mcp.json
```

**Manual configuration steps:**

1. Choose project-specific or global configuration
2. Copy the appropriate generated config file
3. Restart Cursor IDE
4. Switch to Agent Mode (not Ask Mode)
5. Verify "lifeos-mcp" appears in MCP settings

For detailed integration guides, see:

- [Raycast Integration Guide](RAYCAST_INTEGRATION.md)
- [Cursor Integration Guide](CURSOR_INTEGRATION.md)

## Network Configuration

### Local Development

For local development, no special network configuration is required. The MCP server communicates via stdio (standard input/output).

### Remote Deployment

If deploying to a remote server:

#### Port Configuration (Web Interface Only)

```bash
# Default web interface port
export WEB_PORT=19831
export WEB_HOST=0.0.0.0

# Enable web interface (development only)
export ENABLE_WEB_INTERFACE=true
```

#### Firewall Configuration

```bash
# Allow Node.js through firewall (if needed)
sudo ufw allow from 192.168.1.0/24 to any port 19831

# Or for specific IP access only
sudo ufw allow from YOUR_CLIENT_IP to any port 19831
```

#### Security Considerations

- **Never expose the web interface to public internet**
- **Use HTTPS in production environments**
- **Implement proper authentication for remote access**
- **Keep vault paths secure and non-public**

### Network Troubleshooting

Common network-related issues:

1. **Port Conflicts**: Ensure port 19831 is not in use
2. **Firewall Blocking**: Check local firewall settings
3. **DNS Resolution**: Verify hostname resolution if using custom domains
4. **VPN Issues**: MCP communication may conflict with some VPN configurations

## Production Deployment

### Process Management

Use a process manager for production deployments:

#### Using PM2

```bash
# Install PM2
npm install -g pm2

# Create PM2 configuration
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'lifeos-mcp',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Using systemd (Linux)

```bash
# Create service file
sudo nano /etc/systemd/system/lifeos-mcp.service
```

```ini
[Unit]
Description=LifeOS MCP Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/mcp-for-lifeos
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable lifeos-mcp
sudo systemctl start lifeos-mcp
sudo systemctl status lifeos-mcp
```

### Logging Configuration

Set up proper logging for production:

```bash
# Create logs directory
mkdir -p logs

# Configure log rotation (Linux)
sudo nano /etc/logrotate.d/lifeos-mcp
```

```
/path/to/mcp-for-lifeos/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 your-username your-username
}
```

### Monitoring & Health Checks

Implement monitoring for production deployments:

```bash
# Simple health check script
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash
# Health check for LifeOS MCP Server

set -e

# Check if process is running
if ! pgrep -f "node dist/index.js" > /dev/null; then
    echo "ERROR: MCP server process not found"
    exit 1
fi

# Check if vault path is accessible
if [ ! -d "$VAULT_PATH" ]; then
    echo "ERROR: Vault path not accessible: $VAULT_PATH"
    exit 1
fi

# Test basic MCP functionality
echo "INFO: LifeOS MCP Server health check passed"
exit 0
EOF

chmod +x scripts/health-check.sh
```

### Backup Strategy

Implement backup procedures:

```bash
# Configuration backup
cp src/config.ts backups/config-$(date +%Y%m%d).ts

# Application backup
tar -czf backups/lifeos-mcp-$(date +%Y%m%d).tar.gz \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    .
```

## Environment Variables

Configure the application using environment variables:

### Core Configuration

```bash
# Node.js environment
export NODE_ENV=production

# Application settings
export LIFEOS_VAULT_PATH="/path/to/vault"
export LIFEOS_TEMPLATES_PATH="/path/to/vault/templates"
export LIFEOS_DAILY_NOTES_PATH="/path/to/vault/daily"

# Web interface (development only)
export ENABLE_WEB_INTERFACE=false
export WEB_PORT=19831
export WEB_HOST=127.0.0.1

# Logging
export LOG_LEVEL=info
export LOG_FILE=/var/log/lifeos-mcp.log
```

### .env File Support

Create a `.env` file for local development:

```bash
# .env file example
NODE_ENV=development
LIFEOS_VAULT_PATH=/Users/username/Documents/LifeOS-Vault
ENABLE_WEB_INTERFACE=true
WEB_PORT=19831
LOG_LEVEL=debug
```

**Security Note:** Never commit `.env` files with sensitive information.

## Validation & Testing

### Post-Deployment Validation

1. **Verify Installation:**

   ```bash
   # Check Node.js version
   node --version
   
   # Verify dependencies
   npm list --depth=0
   
   # Test configuration
   node -e "console.log(require('./dist/config.js'))"
   ```

2. **Test MCP Functionality:**

   ```bash
   # Start server and test basic tools
   node dist/index.js &
   
   # Test via command line (if CLI tool available)
   mcp-test get_server_version
   ```

3. **Validate Vault Access:**

   ```bash
   # Check vault path accessibility
   ls -la "$VAULT_PATH"
   
   # Verify template discovery
   node -e "
   const { DynamicTemplateEngine } = require('./dist/template-engine-dynamic.js');
   console.log('Templates found:', DynamicTemplateEngine.getAllTemplates().length);
   "
   ```

### Integration Testing

Test client integrations:

1. **Claude Desktop Test:**
   - Start Claude Desktop
   - Look for MCP server in available tools
   - Test basic tool execution

2. **Raycast Test:**
   - Trigger MCP command in Raycast
   - Verify server response
   - Test vault search functionality

3. **API Test (if web interface enabled):**

   ```bash
   curl -X POST http://localhost:19831/api/tools/get_server_version \
        -H "Content-Type: application/json" \
        -d '{}'
   ```

### Performance Validation

Monitor system performance:

```bash
# Check memory usage
ps aux | grep "node dist/index.js"

# Monitor file descriptors
lsof -p $(pgrep -f "node dist/index.js")

# Test response times
time node -e "
const { searchNotes } = require('./dist/modules/search/search-engine.js');
console.log('Search test:', searchNotes({}).length);
"
```

## Troubleshooting

For common deployment issues and solutions, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Support

- **Documentation**: See README.md for feature documentation
- **Integration Guides**: Check docs/ directory for client-specific guides
- **Issues**: Report problems via GitHub Issues
- **Community**: Join discussions in project repository

## Security Considerations

- Keep vault paths secure and non-public
- Use absolute paths in configuration
- Never expose web interface to public internet
- Regularly update dependencies for security patches
- Implement proper file permissions on configuration files
- Use environment variables for sensitive configuration
