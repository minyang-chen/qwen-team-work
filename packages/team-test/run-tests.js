#!/usr/bin/env node

/**
 * Test Runner for Team Layer E2E Tests
 * Runs all tests in sequence with proper setup/teardown
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

async function runTests(testFile) {
  return new Promise((resolve) => {
    const testPath = join(__dirname, 'tests', testFile);
    
    log(COLORS.blue, `\n▶ Running ${testFile}...`);
    
    const jest = spawn('node', [
      '--experimental-vm-modules',
      'node_modules/jest/bin/jest.js',
      testPath,
      '--verbose'
    ], {
      stdio: 'inherit',
      cwd: __dirname
    });

    jest.on('close', (code) => {
      if (code === 0) {
        log(COLORS.green, `✓ ${testFile} passed`);
        resolve(true);
      } else {
        log(COLORS.red, `✗ ${testFile} failed`);
        resolve(false);
      }
    });
  });
}

async function main() {
  log(COLORS.blue, '═══════════════════════════════════════');
  log(COLORS.blue, '  Team Layer E2E Test Suite');
  log(COLORS.blue, '═══════════════════════════════════════\n');

  const tests = [
    'llm.test.js',
    'storage.test.js',
    'ai-agent.test.js',
    'service.test.js',
    'web.test.js'
  ];

  const results = [];

  for (const test of tests) {
    const passed = await runTests(test);
    results.push({ test, passed });
  }

  // Summary
  log(COLORS.blue, '\n═══════════════════════════════════════');
  log(COLORS.blue, '  Test Summary');
  log(COLORS.blue, '═══════════════════════════════════════\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(({ test, passed }) => {
    const color = passed ? COLORS.green : COLORS.red;
    const icon = passed ? '✓' : '✗';
    log(color, `${icon} ${test}`);
  });

  log(COLORS.blue, `\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);

  if (failed > 0) {
    log(COLORS.red, '❌ Some tests failed');
    process.exit(1);
  } else {
    log(COLORS.green, '✅ All tests passed!');
    process.exit(0);
  }
}

main().catch((error) => {
  log(COLORS.red, `\n❌ Test runner error: ${error.message}`);
  process.exit(1);
});
