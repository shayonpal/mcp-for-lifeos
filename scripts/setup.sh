#!/bin/bash

# LifeOS MCP Server - Automated Setup Script
# This script automates the installation and configuration process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_DIR/src/config.ts"
CONFIG_EXAMPLE="$PROJECT_DIR/src/config.example.ts"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Header
print_header() {
    echo ""
    echo "=================================================="
    echo "  LifeOS MCP Server - Automated Setup Script"
    echo "=================================================="
    echo ""
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18.0.0 or higher."
        log_info "Visit: https://nodejs.org/en/download/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
        # Fallback version check if semver is not available
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            log_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18.0.0 or higher."
            exit 1
        fi
    fi
    
    log_success "Node.js version: $NODE_VERSION ✓"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    log_success "npm version: $NPM_VERSION ✓"
    
    # Check Git
    if ! command -v git &> /dev/null; then
        log_warning "Git is not installed. You may need it for future updates."
    else
        log_success "Git is available ✓"
    fi
    
    echo ""
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$PROJECT_DIR"
    
    if [ -f "package-lock.json" ]; then
        log_info "Found package-lock.json, using npm ci for faster install..."
        npm ci
    else
        log_info "Installing packages with npm install..."
        npm install
    fi
    
    log_success "Dependencies installed successfully ✓"
    echo ""
}

# Get user input for configuration
get_user_config() {
    log_info "Configuring LifeOS MCP Server..."
    echo ""
    
    # Get vault path
    while true; do
        echo -n "Enter your LifeOS vault path (absolute path): "
        read VAULT_PATH
        
        if [ -z "$VAULT_PATH" ]; then
            log_error "Vault path cannot be empty."
            continue
        fi
        
        # Expand tilde to home directory
        VAULT_PATH="${VAULT_PATH/#\~/$HOME}"
        
        if [ ! -d "$VAULT_PATH" ]; then
            log_error "Directory does not exist: $VAULT_PATH"
            echo -n "Would you like to create it? [y/N]: "
            read CREATE_VAULT
            if [[ $CREATE_VAULT =~ ^[Yy]$ ]]; then
                mkdir -p "$VAULT_PATH"
                log_success "Created vault directory: $VAULT_PATH"
                break
            else
                continue
            fi
        else
            log_success "Vault directory found: $VAULT_PATH ✓"
            break
        fi
    done
    
    # Derive other paths from vault path
    ATTACHMENTS_PATH="$VAULT_PATH/00 - Meta/Attachments"
    TEMPLATES_PATH="$VAULT_PATH/00 - Meta/Templates"
    DAILY_NOTES_PATH="$VAULT_PATH/20 - Areas/21 - Myself/Journals/Daily"
    YAML_RULES_PATH="$VAULT_PATH/00 - Meta/System/YAML Rules for LifeOS Vault.md"
    
    # Check if standard directories exist
    log_info "Checking LifeOS directory structure..."
    
    MISSING_DIRS=()
    
    if [ ! -d "$ATTACHMENTS_PATH" ]; then
        MISSING_DIRS+=("00 - Meta/Attachments")
    fi
    
    if [ ! -d "$TEMPLATES_PATH" ]; then
        MISSING_DIRS+=("00 - Meta/Templates")
    fi
    
    if [ ! -d "$DAILY_NOTES_PATH" ]; then
        MISSING_DIRS+=("20 - Areas/21 - Myself/Journals/Daily")
    fi
    
    if [ ${#MISSING_DIRS[@]} -gt 0 ]; then
        log_warning "Some standard LifeOS directories are missing:"
        for dir in "${MISSING_DIRS[@]}"; do
            echo "  - $dir"
        done
        echo ""
        echo -n "Would you like to create the missing directories? [Y/n]: "
        read CREATE_DIRS
        if [[ ! $CREATE_DIRS =~ ^[Nn]$ ]]; then
            for dir in "${MISSING_DIRS[@]}"; do
                mkdir -p "$VAULT_PATH/$dir"
                log_success "Created: $dir"
            done
        fi
    fi
    
    # Ask about YAML rules
    echo ""
    echo -n "Do you have a YAML rules document? [y/N]: "
    read HAS_YAML_RULES
    
    if [[ $HAS_YAML_RULES =~ ^[Yy]$ ]]; then
        if [ ! -f "$YAML_RULES_PATH" ]; then
            echo -n "Enter path to your YAML rules document: "
            read CUSTOM_YAML_PATH
            if [ -f "$CUSTOM_YAML_PATH" ]; then
                YAML_RULES_PATH="$CUSTOM_YAML_PATH"
            else
                log_warning "YAML rules file not found. You can configure this later."
                YAML_RULES_PATH=""
            fi
        fi
    else
        YAML_RULES_PATH=""
    fi
    
    echo ""
}

# Generate configuration file
generate_config() {
    log_info "Generating configuration file..."
    
    if [ -f "$CONFIG_FILE" ]; then
        echo -n "Configuration file exists. Overwrite? [y/N]: "
        read OVERWRITE
        if [[ ! $OVERWRITE =~ ^[Yy]$ ]]; then
            log_info "Keeping existing configuration file."
            return
        fi
        cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
        log_info "Backed up existing config to config.ts.backup"
    fi
    
    # Create config file from template
    cp "$CONFIG_EXAMPLE" "$CONFIG_FILE"
    
    # Replace paths in config file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS sed
        sed -i '' "s|/path/to/your/vault/LifeOS (iCloud)|$VAULT_PATH|g" "$CONFIG_FILE"
        sed -i '' "s|/path/to/your/vault/LifeOS (iCloud)/00 - Meta/Attachments|$ATTACHMENTS_PATH|g" "$CONFIG_FILE"
        sed -i '' "s|/path/to/your/vault/LifeOS (iCloud)/00 - Meta/Templates|$TEMPLATES_PATH|g" "$CONFIG_FILE"
        sed -i '' "s|/path/to/your/vault/LifeOS (iCloud)/20 - Areas/21 - Myself/Journals/Daily|$DAILY_NOTES_PATH|g" "$CONFIG_FILE"
        
        if [ -n "$YAML_RULES_PATH" ]; then
            sed -i '' "s|/path/to/your/vault/LifeOS (iCloud)/00 - Meta/System/YAML Rules for LifeOS Vault.md|$YAML_RULES_PATH|g" "$CONFIG_FILE"
        else
            # Comment out YAML rules path
            sed -i '' 's|yamlRulesPath: .*|// yamlRulesPath: undefined // Configure later if needed|g' "$CONFIG_FILE"
        fi
    else
        # Linux sed
        sed -i "s|/path/to/your/vault/LifeOS (iCloud)|$VAULT_PATH|g" "$CONFIG_FILE"
        sed -i "s|/path/to/your/vault/LifeOS (iCloud)/00 - Meta/Attachments|$ATTACHMENTS_PATH|g" "$CONFIG_FILE"
        sed -i "s|/path/to/your/vault/LifeOS (iCloud)/00 - Meta/Templates|$TEMPLATES_PATH|g" "$CONFIG_FILE"
        sed -i "s|/path/to/your/vault/LifeOS (iCloud)/20 - Areas/21 - Myself/Journals/Daily|$DAILY_NOTES_PATH|g" "$CONFIG_FILE"
        
        if [ -n "$YAML_RULES_PATH" ]; then
            sed -i "s|/path/to/your/vault/LifeOS (iCloud)/00 - Meta/System/YAML Rules for LifeOS Vault.md|$YAML_RULES_PATH|g" "$CONFIG_FILE"
        else
            sed -i 's|yamlRulesPath: .*|// yamlRulesPath: undefined // Configure later if needed|g' "$CONFIG_FILE"
        fi
    fi
    
    log_success "Configuration file generated successfully ✓"
    echo ""
}

# Build the project
build_project() {
    log_info "Building the project..."
    
    cd "$PROJECT_DIR"
    
    # Clean previous build
    if [ -d "dist" ]; then
        rm -rf dist
    fi
    
    # Run build
    npm run build
    
    if [ ! -f "dist/index.js" ]; then
        log_error "Build failed - dist/index.js not found"
        exit 1
    fi
    
    log_success "Project built successfully ✓"
    echo ""
}

# Validate installation
validate_installation() {
    log_info "Validating installation..."
    
    cd "$PROJECT_DIR"
    
    # Test configuration loading
    log_info "Testing configuration..."
    if node -e "
        try {
            const config = require('./dist/src/config.js');
            console.log('✓ Configuration loaded successfully');
            console.log('✓ Vault path:', config.LIFEOS_CONFIG.vaultPath);
        } catch (e) {
            console.error('✗ Configuration error:', e.message);
            process.exit(1);
        }
    "; then
        log_success "Configuration validation passed ✓"
    else
        log_error "Configuration validation failed"
        exit 1
    fi
    
    # Test vault access
    log_info "Testing vault access..."
    if node -e "
        const { VaultUtils } = require('./dist/src/modules/files/index.js');
        try {
            const { LIFEOS_CONFIG } = require('./dist/src/config.js');
            const fs = require('fs');
            fs.accessSync(LIFEOS_CONFIG.vaultPath, fs.constants.R_OK | fs.constants.W_OK);
            console.log('✓ Vault access verified');
        } catch (e) {
            console.error('✗ Vault access error:', e.message);
            process.exit(1);
        }
    "; then
        log_success "Vault access validation passed ✓"
    else
        log_warning "Vault access validation failed - check permissions"
    fi
    
    # Test template discovery
    log_info "Testing template system..."
    TEMPLATE_COUNT=$(node -e "
        try {
            const { DynamicTemplateEngine } = require('./dist/template-engine-dynamic.js');
            const templates = DynamicTemplateEngine.getAllTemplates();
            console.log(templates.length);
        } catch (e) {
            console.log('0');
        }
    ")
    
    if [ "$TEMPLATE_COUNT" -gt 0 ]; then
        log_success "Template system loaded $TEMPLATE_COUNT templates ✓"
    else
        log_warning "No templates found - you may need to add templates to $TEMPLATES_PATH"
    fi
    
    echo ""
}

# Generate client configuration examples
generate_client_configs() {
    log_info "Generating client configuration examples..."
    
    CONFIG_DIR="$PROJECT_DIR/config-examples"
    mkdir -p "$CONFIG_DIR"
    
    # Claude Desktop config
    cat > "$CONFIG_DIR/claude-desktop-config.json" << EOF
{
  "mcpServers": {
    "lifeos": {
      "command": "node",
      "args": ["$PROJECT_DIR/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
EOF
    
    # Raycast script (references the moved script)
    cat > "$CONFIG_DIR/start-mcp-raycast.sh" << EOF
#!/bin/bash
# Raycast MCP Server Script - Generated by setup

# Source nvm to ensure Node.js is available
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && \\. "\$NVM_DIR/nvm.sh"

# Change to the project directory
cd "$PROJECT_DIR"

# Start the MCP server
exec node dist/index.js "\$@"
EOF
    
    chmod +x "$CONFIG_DIR/start-mcp-raycast.sh"
    
    # Cursor IDE project-specific config
    cat > "$CONFIG_DIR/cursor-project-mcp.json" << EOF
{
  "mcpServers": {
    "lifeos-mcp": {
      "command": "node",
      "args": ["$PROJECT_DIR/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
EOF
    
    # Cursor IDE global config
    cat > "$CONFIG_DIR/cursor-global-mcp.json" << EOF
{
  "mcpServers": {
    "lifeos-mcp": {
      "command": "node",
      "args": ["$PROJECT_DIR/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
EOF
    
    log_success "Client configuration examples generated in $CONFIG_DIR/ ✓"
    echo ""
}

# Display setup summary
display_summary() {
    echo ""
    echo "=================================================="
    echo "  Setup Complete!"
    echo "=================================================="
    echo ""
    log_success "LifeOS MCP Server has been successfully installed and configured."
    echo ""
    echo "Configuration Summary:"
    echo "  • Vault Path: $VAULT_PATH"
    echo "  • Templates: $TEMPLATES_PATH"
    echo "  • Daily Notes: $DAILY_NOTES_PATH"
    if [ -n "$YAML_RULES_PATH" ]; then
        echo "  • YAML Rules: $YAML_RULES_PATH"
    fi
    echo ""
    echo "Next Steps:"
    echo ""
    echo "1. Test the server:"
    echo "   cd $PROJECT_DIR"
    echo "   node dist/index.js --help"
    echo ""
    echo "2. Configure your client:"
    echo "   • Claude Desktop: Copy config from $CONFIG_DIR/claude-desktop-config.json"
    echo "   • Raycast: Use script at $CONFIG_DIR/start-mcp-raycast.sh"
    echo "   • Cursor IDE (project): Copy $CONFIG_DIR/cursor-project-mcp.json to .cursor/mcp.json"
    echo "   • Cursor IDE (global): Copy $CONFIG_DIR/cursor-global-mcp.json to ~/.cursor/mcp.json"
    echo ""
    echo "3. Read the documentation:"
    echo "   • Deployment Guide: docs/DEPLOYMENT.md"
    echo "   • Troubleshooting: docs/TROUBLESHOOTING.md"
    echo "   • Feature Documentation: README.md"
    echo ""
    echo "4. Test basic functionality:"
    echo "   • Use get_server_version tool to verify connection"
    echo "   • Try create_note to test vault integration"
    echo "   • Use quick_search to test search functionality"
    echo ""
    log_info "For support, visit: https://github.com/your-username/mcp-for-lifeos"
    echo ""
}

# Main setup function
main() {
    print_header
    
    # Parse command line arguments
    SKIP_DEPS=false
    SKIP_CONFIG=false
    SILENT=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-config)
                SKIP_CONFIG=true
                shift
                ;;
            --silent)
                SILENT=true
                shift
                ;;
            --help)
                echo "LifeOS MCP Server Setup Script"
                echo ""
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-deps     Skip dependency installation"
                echo "  --skip-config   Skip configuration setup"
                echo "  --silent        Run in silent mode (use defaults)"
                echo "  --help          Show this help message"
                echo ""
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help for usage information."
                exit 1
                ;;
        esac
    done
    
    # Run setup steps
    check_requirements
    
    if [ "$SKIP_DEPS" = false ]; then
        install_dependencies
    else
        log_info "Skipping dependency installation (--skip-deps)"
    fi
    
    if [ "$SKIP_CONFIG" = false ]; then
        if [ "$SILENT" = false ]; then
            get_user_config
        else
            log_warning "Silent mode: using default configuration"
            VAULT_PATH="$HOME/Documents/LifeOS-Vault"
            # Create default vault structure
            mkdir -p "$VAULT_PATH"
            ATTACHMENTS_PATH="$VAULT_PATH/00 - Meta/Attachments"
            TEMPLATES_PATH="$VAULT_PATH/00 - Meta/Templates"
            DAILY_NOTES_PATH="$VAULT_PATH/20 - Areas/21 - Myself/Journals/Daily"
            mkdir -p "$ATTACHMENTS_PATH" "$TEMPLATES_PATH" "$DAILY_NOTES_PATH"
        fi
        generate_config
    else
        log_info "Skipping configuration setup (--skip-config)"
    fi
    
    build_project
    validate_installation
    generate_client_configs
    display_summary
}

# Error handling
trap 'log_error "Setup failed at line $LINENO. Check the error above for details."; exit 1' ERR

# Run main function
main "$@"