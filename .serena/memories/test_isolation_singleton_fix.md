# Test Isolation - VaultUtils Singleton Fix

## Problem Discovered (2025-08-30)
Tests were writing files to the production Obsidian vault despite using temporary directories in test setup. Random notes were appearing in the live vault during test runs.

## Root Cause
The `VaultUtils` class uses singleton patterns for performance optimization:
- `templateManager`: Singleton instance of TemplateManager
- `obsidianSettings`: Singleton instance of ObsidianSettings  
- `dateResolver`: Singleton instance of DateResolver

These singletons were initialized with the production vault path from `LIFEOS_CONFIG` when first accessed. Even when tests overrode `LIFEOS_CONFIG.vaultPath`, the singletons persisted with production paths, causing test operations to affect the live vault.

## Solution Implemented
Added a `resetSingletons()` method to VaultUtils (line 70-74 in src/vault-utils.ts):
```typescript
static resetSingletons(): void {
  this.templateManager = null;
  this.obsidianSettings = null;
  this.dateResolver = null;
}
```

## Test File Updates Required
All test files that modify `LIFEOS_CONFIG` must call `VaultUtils.resetSingletons()` after changing the config:

```typescript
// Mock the LIFEOS_CONFIG
originalConfig = { ...LIFEOS_CONFIG };
LIFEOS_CONFIG.vaultPath = vaultPath;

// Reset VaultUtils singletons to use new config
VaultUtils.resetSingletons();
```

## Files Modified
- `src/vault-utils.ts`: Added resetSingletons() method
- `tests/unit/insert-content.test.ts`: Added singleton reset
- `tests/unit/task-formatting.test.ts`: Added singleton reset
- `tests/unit/insert-content-sections.test.ts`: Added singleton reset
- `tests/integration/daily-note-simple.test.ts`: Added singleton reset with dynamic import
- `tests/integration/daily-note-task-workflow.test.ts`: Added singleton reset

## Key Learning
When using singleton patterns with configuration that might change (especially in tests), always provide a mechanism to reset the singletons. This is critical for test isolation and preventing test pollution of production data.

## Future Considerations
- Consider dependency injection pattern instead of singletons for better testability
- Add automated checks to ensure all tests use temporary directories
- Consider environment-based configuration (NODE_ENV=test) to prevent accidental production access