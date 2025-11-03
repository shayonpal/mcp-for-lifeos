# WSL2 Setup Guide for Windows Users

This guide helps Windows users set up WSL2 (Windows Subsystem for Linux) to run the LifeOS MCP Server, which officially supports Unix-only platforms.

## Why WSL2?

The LifeOS MCP Server officially supports macOS and Linux only. WSL2 provides a full Linux environment on Windows with:

- ✅ Full Unix compatibility (all features work)
- ✅ Native file system performance
- ✅ Seamless Windows integration
- ✅ Access to Linux tools and packages

## Prerequisites

- Windows 10 version 2004+ or Windows 11
- Administrator access
- At least 4GB RAM available
- 20GB free disk space

## Installation Steps

### 1. Enable WSL2

Open PowerShell as Administrator and run:

```powershell
# Enable WSL
wsl --install
```

This command will:

- Enable the Windows Subsystem for Linux
- Install WSL2
- Download and install Ubuntu (default distribution)
- Restart your computer (when prompted)

### 2. Set Up Ubuntu

After restart, Ubuntu will launch automatically:

1. **Create user account:**

   ```bash
   Enter new UNIX username: yourusername
   New password: [enter password]
   Retype new password: [confirm password]
   ```

2. **Update system packages:**

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

### 3. Install Node.js

Install Node.js 18+ using nvm (recommended):

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Install Node.js 18
nvm install 18
nvm use 18

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### 4. Install Git

```bash
sudo apt install git -y
git --version
```

### 5. Clone and Build MCP Server

```bash
# Navigate to home directory
cd ~

# Create projects directory
mkdir -p DevProjects
cd DevProjects

# Clone repository
git clone https://github.com/shayonpal/mcp-for-lifeos.git
cd mcp-for-lifeos

# Install dependencies
npm install

# Build the project
npm run build

# Verify build
ls -la dist/
```

### 6. Configure Vault Path

The key challenge with WSL2 is accessing your Windows Obsidian vault. You have two options:

#### Option A: Access Windows Vault from WSL2 (Recommended)

Windows drives are mounted at `/mnt/` in WSL2:

- `C:\` → `/mnt/c/`
- `D:\` → `/mnt/d/`

**Example configuration:**

If your vault is at `C:\Users\YourName\Documents\ObsidianVault`, use:

```bash
# Edit configuration
cp src/config.example.ts src/config.ts
nano src/config.ts
```

```typescript
export const LIFEOS_CONFIG: LifeOSConfig = {
  vaultPath: '/mnt/c/Users/YourName/Documents/ObsidianVault',
  templatesPath: '/mnt/c/Users/YourName/Documents/ObsidianVault/Templates',
  dailyNotesPath: '/mnt/c/Users/YourName/Documents/ObsidianVault/Daily',
  // ... other paths
};
```

#### Option B: Move Vault to WSL2 (Better Performance)

For better file system performance:

```bash
# Copy vault to WSL2
cp -r /mnt/c/Users/YourName/Documents/ObsidianVault ~/Documents/

# Update config
export const LIFEOS_CONFIG: LifeOSConfig = {
  vaultPath: '/home/yourusername/Documents/ObsidianVault',
  // ... other paths
};
```

**Important:** If using this option, you'll need to:

1. Open the vault in Obsidian using WSL2 path (requires Obsidian Windows app pointing to WSL2 path)
2. Use file sync solution (Syncthing, rclone) if you need bidirectional sync

### 7. Test Installation

```bash
# Run tests
npm test

# Start server manually
npm run dev
```

## MCP Client Configuration

### Claude Desktop on Windows

Claude Desktop on Windows can launch WSL2 commands.

**Option 1: WSL2 Command (Recommended)**

Edit Claude Desktop config at:
`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "wsl",
      "args": [
        "-d", "Ubuntu",
        "-e", "bash", "-c",
        "cd /home/yourusername/DevProjects/mcp-for-lifeos && node dist/index.js"
      ]
    }
  }
}
```

**Option 2: Direct Node Path (if Node.js also installed on Windows)**

```json
{
  "mcpServers": {
    "lifeos": {
      "command": "wsl",
      "args": [
        "node",
        "/home/yourusername/DevProjects/mcp-for-lifeos/dist/index.js"
      ]
    }
  }
}
```

### Cursor IDE on Windows

Create `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "lifeos-mcp": {
      "command": "wsl",
      "args": [
        "-d", "Ubuntu",
        "-e", "bash", "-c",
        "cd /home/yourusername/DevProjects/mcp-for-lifeos && node dist/index.js"
      ]
    }
  }
}
```

## Troubleshooting

### WSL2 Not Found

```powershell
# Check WSL version
wsl --list --verbose

# If WSL1, upgrade to WSL2
wsl --set-version Ubuntu 2
wsl --set-default-version 2
```

### Permission Denied on /mnt/c/

```bash
# Update WSL2 config
sudo nano /etc/wsl.conf
```

Add:

```ini
[automount]
options = "metadata"
```

Restart WSL2:

```powershell
wsl --shutdown
```

Then relaunch Ubuntu app.

### Slow File Access from /mnt/c/

This is expected - cross-filesystem access is slower. Consider Option B (move vault to WSL2) for better performance.

### Node.js Not Found

```bash
# Reload shell
source ~/.bashrc

# Verify nvm
nvm --version

# Install Node.js again if needed
nvm install 18
nvm use 18
```

### Obsidian Can't See WSL2 Vault

If using Option B (vault in WSL2):

1. **Access via network path:**
   - In Windows Explorer: `\\wsl$\Ubuntu\home\yourusername\Documents\ObsidianVault`
   - Open this path in Obsidian as vault location

2. **Or use symbolic link:**

   ```powershell
   # From PowerShell
   mklink /D C:\Users\YourName\ObsidianVault \\wsl$\Ubuntu\home\yourusername\Documents\ObsidianVault
   ```

## Performance Tips

1. **Store project in WSL2 filesystem** (`/home/user/...`) not `/mnt/c/` for better performance
2. **Use WSL2 terminal** (Ubuntu app) instead of PowerShell for native experience
3. **Allocate more resources** in `.wslconfig`:

Create `%USERPROFILE%\.wslconfig` (in Windows):

```ini
[wsl2]
memory=4GB
processors=2
swap=2GB
```

Then restart WSL2:

```powershell
wsl --shutdown
```

## VS Code Integration

Install "Remote - WSL" extension to edit files in WSL2 directly from VS Code:

```bash
# From WSL2 terminal
code /home/yourusername/DevProjects/mcp-for-lifeos
```

This opens VS Code with full WSL2 integration.

## Useful Commands

```bash
# Start Ubuntu from Windows
wsl

# Run single command in WSL2 from PowerShell
wsl -d Ubuntu -- node --version

# Shutdown WSL2 (to apply .wslconfig changes)
wsl --shutdown

# Check WSL2 status
wsl --list --running

# Access WSL2 filesystem from Windows
# In Explorer: \\wsl$\Ubuntu\home\yourusername
```

## File System Best Practices

### Recommended Setup

1. **MCP Server**: Store in WSL2 (`/home/yourusername/DevProjects/mcp-for-lifeos`)
2. **Obsidian Vault**:
   - Keep in Windows if you use Obsidian Windows app heavily
   - Access via `/mnt/c/...` path in config
   - Accept slightly slower file ops for convenience

### Alternative (Performance-Optimized)

1. **MCP Server**: WSL2 filesystem
2. **Obsidian Vault**: WSL2 filesystem
3. **Access vault in Windows**: Via `\\wsl$\Ubuntu\...` network path
4. **Trade-off**: Better MCP performance, slightly slower Obsidian Windows access

## Additional Resources

- [WSL2 Official Docs](https://learn.microsoft.com/en-us/windows/wsl/)
- [WSL2 Best Practices](https://learn.microsoft.com/en-us/windows/wsl/compare-versions)
- [Node.js on WSL2](https://learn.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-wsl)
- [VS Code Remote WSL](https://code.visualstudio.com/docs/remote/wsl)

## Support

For WSL2-specific issues:

- [WSL GitHub Issues](https://github.com/microsoft/WSL/issues)
- [WSL2 Troubleshooting](https://learn.microsoft.com/en-us/windows/wsl/troubleshooting)

For LifeOS MCP Server issues:

- [Project GitHub Issues](https://github.com/shayonpal/mcp-for-lifeos/issues)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
