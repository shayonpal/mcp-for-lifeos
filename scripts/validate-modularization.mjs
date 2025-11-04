#!/usr/bin/env node

/**
 * Comprehensive Modularization Validation Script
 *
 * Tests all critical module exports and integrations to ensure
 * no regressions were introduced during Phase 4 refactoring.
 */

import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 Starting Modularization Validation...\n');

let passCount = 0;
let failCount = 0;

function pass(msg) {
  console.log(`✅ ${msg}`);
  passCount++;
}

function fail(msg, error) {
  console.log(`❌ ${msg}`);
  if (error) console.log(`   Error: ${error.message}`);
  failCount++;
}

// Test 1: Module files exist
console.log('📦 Testing module file structure...');
const moduleFiles = [
  'dist/src/modules/files/index.js',
  'dist/src/modules/files/vault-utils.js',
  'dist/src/modules/files/file-io.js',
  'dist/src/modules/files/note-crud.js',
  'dist/src/modules/files/daily-note-service.js',
  'dist/src/modules/files/content-insertion.js',
  'dist/src/modules/files/yaml-operations.js',
  'dist/src/modules/files/folder-operations.js',
];

for (const file of moduleFiles) {
  const fullPath = join(projectRoot, file);
  if (existsSync(fullPath)) {
    pass(`Module exists: ${file}`);
  } else {
    fail(`Module missing: ${file}`);
  }
}

console.log('\n🔌 Testing module exports...');

try {
  // Test 2: Barrel export works
  const filesModule = await import('../dist/src/modules/files/index.js');

  const expectedExports = [
    'VaultUtils',
    'readFileWithRetry',
    'writeFileWithRetry',
    'readNote',
    'writeNote',
    'createNote',
    'updateNote',
    'getDailyNote',
    'createDailyNote',
    'insertContent',
    'getYamlPropertyValues',
    'getAllYamlProperties',
    'moveItem',
  ];

  for (const exportName of expectedExports) {
    if (filesModule[exportName]) {
      pass(`Export available: ${exportName}`);
    } else {
      fail(`Export missing: ${exportName}`);
    }
  }

  // Test 3: VaultUtils class methods
  console.log('\n🛠️  Testing VaultUtils methods...');
  const { VaultUtils } = filesModule;

  const vaultMethods = [
    'readNote',
    'writeNote',
    'createNote',
    'updateNote',
    'getDailyNote',
    'createDailyNote',
    'insertContent',
    'findNotes',
    'findNoteByTitle',
    'searchNotes',
    'updateNoteLinks',
    'buildNewLinkText',
    'moveItem',
    'getYamlPropertyValues',
    'getAllYamlProperties',
    'normalizePath',
    'getLocalDate',
    'resetSingletons',
  ];

  for (const method of vaultMethods) {
    if (typeof VaultUtils[method] === 'function') {
      pass(`VaultUtils.${method} is callable`);
    } else {
      fail(`VaultUtils.${method} is not a function`);
    }
  }

  // Test 4: Core dependencies import correctly
  console.log('\n📚 Testing core module imports...');

  try {
    const searchModule = await import('../dist/src/modules/search/index.js');
    if (searchModule.SearchEngine) {
      pass('SearchEngine module loads');
    } else {
      fail('SearchEngine not exported');
    }
  } catch (error) {
    fail('SearchEngine module failed to load', error);
  }

  try {
    const templatesModule = await import('../dist/src/modules/templates/index.js');
    if (templatesModule.TemplateManager) {
      pass('TemplateManager module loads');
    } else {
      fail('TemplateManager not exported');
    }
  } catch (error) {
    fail('TemplateManager module failed to load', error);
  }

  // Test 5: Server entry point
  console.log('\n🚀 Testing server entry point...');
  try {
    const serverModule = await import('../dist/src/index.js');
    if (serverModule) {
      pass('Server entry point loads');
    }
  } catch (error) {
    fail('Server entry point failed to load', error);
  }

  // Test 6: Tool router imports
  console.log('\n🔀 Testing tool router...');
  try {
    const toolRouter = await import('../dist/src/tool-router.js');
    if (toolRouter.ToolRouter) {
      pass('ToolRouter module loads');
    }
  } catch (error) {
    fail('ToolRouter failed to load', error);
  }

  // Test 7: Handler imports
  console.log('\n🎯 Testing handlers...');
  const handlers = [
    'note-handlers',
    'metadata-handlers',
    'utility-handlers',
    'consolidated-handlers',
    'legacy-alias-handlers',
  ];

  for (const handler of handlers) {
    try {
      await import(`../dist/src/server/handlers/${handler}.js`);
      pass(`Handler loads: ${handler}`);
    } catch (error) {
      fail(`Handler failed: ${handler}`, error);
    }
  }

} catch (error) {
  fail('Module export testing failed', error);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`📈 Success Rate: ${Math.round((passCount / (passCount + failCount)) * 100)}%`);

if (failCount === 0) {
  console.log('\n🎉 ALL VALIDATIONS PASSED - Safe to merge!');
  process.exit(0);
} else {
  console.log('\n⚠️  VALIDATION FAILURES DETECTED - Do NOT merge!');
  process.exit(1);
}
