#!/usr/bin/env node

/**
 * Worktree Registry Management
 *
 * Manages tracking of active git worktrees for the MCP for LifeOS project.
 * Registry file: .worktrees-registry.json (gitignored)
 *
 * Usage:
 *   node scripts/worktree-registry.js add <issueId> <branchName> <path> [prNumber] [prUrl]
 *   node scripts/worktree-registry.js remove <issueId>
 *   node scripts/worktree-registry.js list [--json]
 *   node scripts/worktree-registry.js find <issueId>
 */

const fs = require('fs');
const path = require('path');

// Registry file location (relative to project root)
const REGISTRY_FILE = path.join(__dirname, '..', '.worktrees-registry.json');

// Registry schema
const EMPTY_REGISTRY = {
  version: '1.0.0',
  worktrees: []
};

/**
 * Read registry from file
 */
function readRegistry() {
  try {
    if (!fs.existsSync(REGISTRY_FILE)) {
      return { ...EMPTY_REGISTRY };
    }

    const content = fs.readFileSync(REGISTRY_FILE, 'utf8');
    const registry = JSON.parse(content);

    // Validate structure
    if (!registry.worktrees || !Array.isArray(registry.worktrees)) {
      console.error('⚠️  Warning: Invalid registry structure, resetting');
      return { ...EMPTY_REGISTRY };
    }

    return registry;
  } catch (error) {
    console.error(`❌ Error reading registry: ${error.message}`);
    return { ...EMPTY_REGISTRY };
  }
}

/**
 * Write registry to file
 */
function writeRegistry(registry) {
  try {
    const content = JSON.stringify(registry, null, 2);
    fs.writeFileSync(REGISTRY_FILE, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error writing registry: ${error.message}`);
    return false;
  }
}

/**
 * Add worktree to registry
 */
function add(issueId, branchName, worktreePath, prNumber = null, prUrl = null) {
  if (!issueId || !branchName || !worktreePath) {
    console.error('❌ Error: Missing required parameters');
    console.error('Usage: add <issueId> <branchName> <path> [prNumber] [prUrl]');
    process.exit(1);
  }

  const registry = readRegistry();

  // Check if already exists
  const existing = registry.worktrees.find(w => w.issueId === issueId);
  if (existing) {
    console.error(`❌ Error: Worktree already exists for issue ${issueId}`);
    console.error(`   Branch: ${existing.branchName}`);
    console.error(`   Path: ${existing.path}`);
    process.exit(1);
  }

  // Add new entry
  const entry = {
    issueId,
    branchName,
    path: worktreePath,
    prNumber: prNumber ? parseInt(prNumber, 10) : null,
    prUrl: prUrl || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  registry.worktrees.push(entry);

  if (writeRegistry(registry)) {
    console.log(`✅ Worktree added to registry`);
    console.log(`   Issue: ${issueId}`);
    console.log(`   Branch: ${branchName}`);
    console.log(`   Path: ${worktreePath}`);
    if (prNumber) console.log(`   PR: #${prNumber}`);
  } else {
    process.exit(1);
  }
}

/**
 * Remove worktree from registry
 */
function remove(issueId) {
  if (!issueId) {
    console.error('❌ Error: Issue ID required');
    console.error('Usage: remove <issueId>');
    process.exit(1);
  }

  const registry = readRegistry();
  const initialCount = registry.worktrees.length;

  registry.worktrees = registry.worktrees.filter(w => w.issueId !== issueId);

  if (registry.worktrees.length === initialCount) {
    console.error(`❌ Error: Worktree not found for issue ${issueId}`);
    process.exit(1);
  }

  if (writeRegistry(registry)) {
    console.log(`✅ Worktree removed from registry`);
    console.log(`   Issue: ${issueId}`);
    console.log(`   Remaining worktrees: ${registry.worktrees.length}`);
  } else {
    process.exit(1);
  }
}

/**
 * List all worktrees
 */
function list(options = {}) {
  const registry = readRegistry();

  if (options.json) {
    console.log(JSON.stringify(registry.worktrees, null, 2));
    return;
  }

  if (registry.worktrees.length === 0) {
    console.log('📋 No worktrees currently tracked');
    return;
  }

  console.log('╔════════════════════════════════════════════╗');
  console.log('║  📋 Tracked Worktrees                      ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  registry.worktrees.forEach((wt, index) => {
    console.log(`🌿 Branch: ${wt.branchName}`);
    console.log(`   Issue: ${wt.issueId}`);
    console.log(`   Path: ${wt.path}`);
    if (wt.prNumber) {
      console.log(`   PR: #${wt.prNumber}${wt.prUrl ? ` - ${wt.prUrl}` : ''}`);
    }
    console.log(`   Created: ${wt.createdAt}`);
    if (index < registry.worktrees.length - 1) {
      console.log('');
    }
  });

  console.log('');
  console.log(`Total worktrees: ${registry.worktrees.length}`);
}

/**
 * Find worktree by issue ID
 */
function find(issueId) {
  if (!issueId) {
    console.error('❌ Error: Issue ID required');
    console.error('Usage: find <issueId>');
    process.exit(1);
  }

  const registry = readRegistry();
  const worktree = registry.worktrees.find(w => w.issueId === issueId);

  if (!worktree) {
    console.error(`❌ Worktree not found for issue ${issueId}`);
    console.log('');
    console.log('Available worktrees:');
    if (registry.worktrees.length === 0) {
      console.log('  (none)');
    } else {
      registry.worktrees.forEach(w => {
        console.log(`  - ${w.issueId} (${w.branchName})`);
      });
    }
    process.exit(1);
  }

  console.log(JSON.stringify(worktree, null, 2));
}

/**
 * Update worktree entry
 */
function update(issueId, updates) {
  if (!issueId) {
    console.error('❌ Error: Issue ID required');
    console.error('Usage: update <issueId> <field>=<value> [<field>=<value> ...]');
    process.exit(1);
  }

  const registry = readRegistry();
  const worktree = registry.worktrees.find(w => w.issueId === issueId);

  if (!worktree) {
    console.error(`❌ Error: Worktree not found for issue ${issueId}`);
    process.exit(1);
  }

  // Apply updates
  Object.assign(worktree, updates);
  worktree.updatedAt = new Date().toISOString();

  if (writeRegistry(registry)) {
    console.log(`✅ Worktree updated`);
    console.log(`   Issue: ${issueId}`);
    console.log(`   Updates: ${Object.keys(updates).join(', ')}`);
  } else {
    process.exit(1);
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
Worktree Registry Management

USAGE:
  node scripts/worktree-registry.js <command> [options]

COMMANDS:
  add <issueId> <branchName> <path> [prNumber] [prUrl]
      Add a new worktree to the registry

  remove <issueId>
      Remove a worktree from the registry

  list [--json]
      List all tracked worktrees (--json for machine-readable output)

  find <issueId>
      Find and display a specific worktree by issue ID

  update <issueId> <key>=<value> [<key>=<value> ...]
      Update worktree fields (e.g., prNumber=123 prUrl=https://...)

EXAMPLES:
  node scripts/worktree-registry.js add MCP-123 feature/add-search ../worktrees/feature-add-search
  node scripts/worktree-registry.js update MCP-123 prNumber=456 prUrl=https://github.com/...
  node scripts/worktree-registry.js list
  node scripts/worktree-registry.js find MCP-123
  node scripts/worktree-registry.js remove MCP-123

REGISTRY FILE:
  Location: .worktrees-registry.json (gitignored)
  Format: JSON with versioning
`);
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

switch (command) {
  case 'add':
    add(args[1], args[2], args[3], args[4], args[5]);
    break;

  case 'remove':
    remove(args[1]);
    break;

  case 'list':
    list({ json: args.includes('--json') });
    break;

  case 'find':
    find(args[1]);
    break;

  case 'update': {
    const issueId = args[1];
    const updates = {};

    // Parse key=value pairs
    for (let i = 2; i < args.length; i++) {
      const [key, value] = args[i].split('=');
      if (key && value) {
        // Try to parse as number if it looks like one
        updates[key] = /^\d+$/.test(value) ? parseInt(value, 10) : value;
      }
    }

    if (Object.keys(updates).length === 0) {
      console.error('❌ Error: No updates provided');
      console.error('Usage: update <issueId> <key>=<value> [<key>=<value> ...]');
      process.exit(1);
    }

    update(issueId, updates);
    break;
  }

  default:
    console.error(`❌ Unknown command: ${command}`);
    console.error('');
    showHelp();
    process.exit(1);
}
