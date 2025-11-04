# Custom Instructions Guide

**Status:** Phase 1 Scaffolding (MCP-90) - Infrastructure in place, awaiting implementation
**Last Updated:** 2025-11-04

This guide explains how to configure and use custom instructions with the LifeOS MCP Server. Custom instructions allow you to define rules and behaviors for note creation, editing, and template processing.

---

## Overview

Custom instructions provide a way to configure rules that influence how the MCP server processes notes. The system supports two configuration methods:

1. **Inline Configuration** - Define instructions directly in the config object
2. **File-Based Configuration** - Reference an external instructions file with hot-reload support

## Current Status

**Phase 1 (MCP-90):** Infrastructure scaffolding complete

- Configuration interfaces defined (`CustomInstructionsConfig`)
- Instruction processor module created (`src/modules/config/`)
- Hot-reload infrastructure in place (file watching via `fs.watch()`)
- Pass-through mode only (no instruction branching yet)

**Not Yet Implemented:**

- File-based instruction reading
- Instruction branching logic
- Context modification based on instructions
- Integration with tool handlers

---

## Configuration

### Inline Configuration

Define instructions directly in your configuration:

```typescript
import { LIFEOS_CONFIG } from './src/shared/config.js';

LIFEOS_CONFIG.customInstructions = {
  inline: {
    noteCreationRules: 'Always use title case for note titles',
    editingRules: 'Preserve existing formatting and structure',
    templateRules: 'Apply templates consistently based on note type'
  }
};
```

### File-Based Configuration

Reference an external instructions file:

```typescript
LIFEOS_CONFIG.customInstructions = {
  filePath: '/path/to/instructions.md',
  enableHotReload: true  // Watch for file changes
};
```

**Hot-Reload Behavior:**

- Uses `fs.watch()` to detect file changes
- Automatically clears cache when file is modified
- Next tool execution picks up new instructions
- No server restart required

---

## Configuration Options

### CustomInstructionsConfig Interface

```typescript
interface CustomInstructionsConfig {
  // Inline instruction definitions
  inline?: {
    noteCreationRules?: string;
    editingRules?: string;
    templateRules?: string;
  };

  // File path reference
  filePath?: string;

  // Enable hot-reload for file-based instructions
  enableHotReload?: boolean;  // Default: false
}
```

### Configuration Priority

When both `inline` and `filePath` are provided:

1. Inline configuration takes precedence
2. File path is ignored (with warning log)

---

## InstructionProcessor API

The `InstructionProcessor` class provides methods for instruction handling:

### getInstructions()

Retrieve current custom instructions.

```typescript
const result = InstructionProcessor.getInstructions();
// Returns: InstructionRetrievalResult
// {
//   instructions: { ... } | null,
//   source: 'inline' | 'file' | 'none',
//   loadedAt: Date
// }
```

**Phase 1 Behavior:**

- Returns inline config if present
- Returns null if no config
- Warns if filePath provided (not yet implemented)

### applyInstructions()

Apply instructions to an operation context.

```typescript
const context = {
  operation: 'create',
  noteType: 'daily',
  targetPath: '/vault/daily/2025-11-04.md'
};

const result = InstructionProcessor.applyInstructions(context);
// Returns: InstructionApplicationResult
// {
//   context: { ... },  // Unchanged in Phase 1
//   modified: false,
//   appliedRules: []
// }
```

**Phase 1 Behavior:**

- Pure pass-through (context returned unchanged)
- `modified` always false
- `appliedRules` always empty array
- Logs debug message when called

### initializeWatcher()

Initialize file watcher for hot-reload.

```typescript
const result = InstructionProcessor.initializeWatcher();
// Returns: WatcherInitializationResult
// {
//   success: boolean,
//   watchedPath?: string,
//   error?: string
// }
```

**Initialization Conditions:**

- `DISABLE_CONFIG_WATCH !== 'true'` (for test isolation)
- Not already initialized (idempotent)
- `config.filePath` provided
- `config.enableHotReload === true`

**Behavior:**

- Uses `fs.watch()` for file change detection
- Calls `clearCache()` on file change
- Graceful degradation on errors (logs but doesn't crash)
- Lazy initialization (only when conditions met)

### clearCache()

Clear cached instructions.

```typescript
InstructionProcessor.clearCache();
```

**Behavior:**

- Clears internal cache
- Next `getInstructions()` call re-reads config
- Does NOT affect in-flight operations

### cleanup()

Cleanup watcher and cache (primarily for testing).

```typescript
InstructionProcessor.cleanup();
```

**Behavior:**

- Closes file watcher if exists
- Resets initialization flag
- Clears cache
- Enables re-initialization

---

## Test Isolation

For test environments, disable file watching:

```typescript
// In test setup
process.env.DISABLE_CONFIG_WATCH = 'true';

// In test teardown
InstructionProcessor.cleanup();
```

**Why Disable Watching in Tests:**

- Prevents actual file system watchers in test environment
- Avoids inter-test pollution
- Ensures test isolation
- Mock-based tests can still verify watcher logic

---

## Examples

### Example 1: Inline Configuration

```typescript
import { LIFEOS_CONFIG } from './src/shared/config.js';
import { InstructionProcessor } from './src/modules/config/index.js';

// Configure inline instructions
LIFEOS_CONFIG.customInstructions = {
  inline: {
    noteCreationRules: `
      - Use title case for all note titles
      - Include category in frontmatter
      - Add date created timestamp
    `,
    editingRules: `
      - Preserve existing YAML frontmatter
      - Maintain consistent heading structure
      - Don't modify auto-managed fields
    `,
    templateRules: `
      - Apply tpl-daily for daily notes
      - Apply tpl-restaurant for restaurant notes
      - Apply tpl-person for person notes
    `
  }
};

// Retrieve instructions
const instructions = InstructionProcessor.getInstructions();
console.log(instructions);
// {
//   instructions: { noteCreationRules: '...', ... },
//   source: 'inline',
//   loadedAt: 2025-11-04T...
// }
```

### Example 2: File-Based Configuration with Hot-Reload

```typescript
import { LIFEOS_CONFIG } from './src/shared/config.js';
import { InstructionProcessor } from './src/modules/config/index.js';

// Configure file-based instructions
LIFEOS_CONFIG.customInstructions = {
  filePath: '/vault/00 - Meta/custom-instructions.md',
  enableHotReload: true
};

// Initialize watcher
const watcherResult = InstructionProcessor.initializeWatcher();
console.log(watcherResult);
// {
//   success: true,
//   watchedPath: '/vault/00 - Meta/custom-instructions.md'
// }

// File changes automatically trigger clearCache()
// Next tool execution picks up new instructions
```

### Example 3: Applying Instructions (Future Phase)

```typescript
// Phase 1: Pass-through only (no modifications)
const context = {
  operation: 'create',
  noteType: 'restaurant',
  targetPath: '/vault/30 - Resources/Restaurants/example.md'
};

const result = InstructionProcessor.applyInstructions(context);
console.log(result);
// {
//   context: { operation: 'create', noteType: 'restaurant', ... },
//   modified: false,
//   appliedRules: []
// }

// Future Phase: Instruction branching
// const result = InstructionProcessor.applyInstructions(context);
// {
//   context: { ... modified with rules applied ... },
//   modified: true,
//   appliedRules: ['noteCreationRules', 'templateRules']
// }
```

---

## Architecture

### Module Structure

```
src/modules/config/
├── instruction-processor.ts  # Instruction processing logic
└── index.ts                   # Barrel exports
```

### Data Flow

```
Config (LIFEOS_CONFIG)
  ↓
InstructionProcessor.getInstructions()
  ↓
[Future] InstructionProcessor.applyInstructions(context)
  ↓
[Future] Tool Handlers (create_note, edit_note, etc.)
  ↓
Modified note content/behavior
```

### Hot-Reload Cycle

```
File Change Detected (fs.watch)
  ↓
InstructionProcessor.clearCache()
  ↓
Next Tool Execution
  ↓
InstructionProcessor.getInstructions() (re-reads)
  ↓
Updated instructions applied
```

---

## Future Phases

### Phase 2: File Reading Implementation

- Implement file-based instruction reading
- Support Markdown format with sections
- Validate instruction file structure
- Handle file read errors gracefully

### Phase 3: Instruction Branching Logic

- Implement operation-specific rules
- Context modification based on instructions
- Rule matching and application
- Instruction conflict resolution

### Phase 4: Tool Integration

- Integrate with `create_note` tool
- Integrate with `edit_note` tool
- Integrate with template system
- Instruction-based content transformation

---

## Troubleshooting

### File Watcher Not Initializing

**Symptoms:** Hot-reload not working, file changes ignored

**Possible Causes:**

1. `DISABLE_CONFIG_WATCH=true` (check environment variables)
2. `enableHotReload` not set to `true` in config
3. `filePath` not provided or invalid
4. File permissions issues

**Solutions:**

```typescript
// Check environment
console.log(process.env.DISABLE_CONFIG_WATCH); // Should be undefined

// Verify config
console.log(LIFEOS_CONFIG.customInstructions);
// Should have: { filePath: '...', enableHotReload: true }

// Check initialization result
const result = InstructionProcessor.initializeWatcher();
console.log(result);
// If success: false, check error message
```

### Instructions Not Applied

**Symptoms:** Rules defined but not affecting behavior

**Current Status:** Expected in Phase 1

- Phase 1 is pass-through only
- `applyInstructions()` does not modify context
- Instruction branching logic not yet implemented
- Wait for Phase 3 implementation

### Test Pollution

**Symptoms:** Tests failing due to file watcher leaks

**Solution:**

```typescript
describe('YourTest', () => {
  beforeEach(() => {
    process.env.DISABLE_CONFIG_WATCH = 'true';
  });

  afterEach(() => {
    InstructionProcessor.cleanup();
  });

  // Your tests...
});
```

---

## Related Documentation

- **[Architecture](../ARCHITECTURE.md)** - Config module architecture
- **[MCP-90](https://linear.app/agilecode-studio/issue/MCP-90)** - Phase 1 implementation issue
- **[MCP-17](https://linear.app/agilecode-studio/issue/MCP-17)** - Parent issue (custom instructions project)

---

**Last Updated:** 2025-11-04
**Status:** Phase 1 Scaffolding Complete
**Next:** Phase 2 (File Reading Implementation) - TBD
