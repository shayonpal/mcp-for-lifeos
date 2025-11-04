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
    { name: 'readFileWithRetry', type: 'function' },
    { name: 'writeFileWithRetry', type: 'function' },
    { name: 'readNote', type: 'function' },
    { name: 'writeNote', type: 'function' },
    { name: 'createNote', type: 'function' },
    { name: 'updateNote', type: 'function' },
    { name: 'getDailyNote', type: 'function' },
    { name: 'createDailyNote', type: 'function' },
    { name: 'insertContent', type: 'function' },
    { name: 'getYamlPropertyValues', type: 'function' },
    { name: 'getAllYamlProperties', type: 'function' },
    { name: 'moveItem', type: 'function' },
  ];

  for (const { name, type } of expectedExports) {
    const exportValue = filesModule[name];
    if (typeof exportValue === type) {
      pass(`Export "${name}" is a ${type}`);
    } else if (exportValue !== undefined) {
      fail(`Export "${name}" exists but is not a ${type}`);
    } else {
      fail(`Export missing: ${name}`);
    }
  }

  // Test 3: Core dependencies import correctly
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

  // Test 4: Server entry point
  console.log('\n🚀 Testing server entry point...');
  try {
    const serverModule = await import('../dist/src/index.js');
    if (serverModule) {
      pass('Server entry point loads');
    }
  } catch (error) {
    fail('Server entry point failed to load', error);
  }

  // Test 5: Tool router imports
  console.log('\n🔀 Testing tool router...');
  try {
    const toolRouter = await import('../dist/src/tool-router.js');
    if (toolRouter.ToolRouter) {
      pass('ToolRouter module loads');
    }
  } catch (error) {
    fail('ToolRouter failed to load', error);
  }

  // Test 6: Handler imports
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
