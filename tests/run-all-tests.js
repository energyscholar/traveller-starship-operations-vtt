#!/usr/bin/env node
// Test Runner - Runs all unit tests in sequence
// Run with: node tests/run-all-tests.js

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

console.log(`${COLORS.cyan}${COLORS.bold}========================================`);
console.log(`TRAVELLER COMBAT VTT - TEST SUITE`);
console.log(`========================================${COLORS.reset}\n`);

// Unit tests to run (in order)
const unitTests = [
  'tests/unit/combat.test.js',
  'tests/unit/crew-system.test.js',
  'tests/unit/weapon-system.test.js',
  'tests/unit/grid-system.test.js',
  'tests/unit/space-ships.test.js',
  'tests/unit/ship-registry.test.js',
  'tests/unit/space-range.test.js',  // Stage 8.2
  'tests/unit/space-initiative.test.js',  // Stage 8.3
  'tests/unit/space-combat.test.js',  // Stage 8.4
  'tests/unit/space-criticals.test.js',  // Stage 8.5
  'tests/unit/space-movement.test.js',  // Stage 9.1
  'tests/unit/space-initiative-advanced.test.js',  // Stage 9.2
  'tests/unit/xss-validation.test.js'
  // DEFERRED: ship-validation-edge-cases.test.js (test framework integration needed)
];

// Integration tests
const integrationTests = [
  'tests/integration/space-ship-selection.test.js',     // Stage 8.6
  'tests/integration/space-combat-hud.test.js',         // Stage 8.7
  'tests/integration/space-combat-resolution.test.js'   // Stage 8.8
];

let totalPassed = 0;
let totalFailed = 0;
let suitesRun = 0;
let suitesFailed = 0;

// Run all tests (unit + integration)
const allTests = [...unitTests, ...integrationTests];

for (const testFile of allTests) {
  const testPath = path.join(__dirname, '..', testFile);

  if (!fs.existsSync(testPath)) {
    console.log(`${COLORS.yellow}⚠️  Skipping: ${testFile} (not found)${COLORS.reset}`);
    continue;
  }

  const testName = path.basename(testFile, '.test.js');
  console.log(`${COLORS.cyan}Running: ${testName}${COLORS.reset}`);
  console.log(`${'─'.repeat(50)}`);

  try {
    // Run in quiet mode for minimal output
    const output = execSync(`node ${testPath}`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, TEST_QUIET: 'true' }
    });

    // Show compact output
    console.log(output.trim());

    // Try to extract pass/fail counts from output
    // Match formats: "PASSED: X/Y" (prioritize this), "X passed", "RESULTS: X passed, Y failed"
    const passedRegex = /PASSED:\s*(\d+)\/(\d+)/i;
    const resultsRegex = /RESULTS:\s*(\d+)\s+passed,\s*(\d+)\s+failed/i;

    const passMatch = output.match(passedRegex);
    const resultsMatch = output.match(resultsRegex);

    if (passMatch) {
      // Use PASSED: X/Y format (most common)
      const passed = parseInt(passMatch[1]);
      const total = parseInt(passMatch[2]);
      const failed = total - passed;
      totalPassed += passed;
      totalFailed += failed;
    } else if (resultsMatch) {
      // Use RESULTS: X passed, Y failed format
      totalPassed += parseInt(resultsMatch[1]);
      totalFailed += parseInt(resultsMatch[2]);
    }

    suitesRun++;

  } catch (error) {
    // Only show output on failure
    console.log(error.stdout || error.message);
    console.log(`${COLORS.red}✗ ${testName} FAILED${COLORS.reset}\n`);
    suitesRun++;
    suitesFailed++;
  }
}

console.log(`${COLORS.cyan}${COLORS.bold}========================================`);
console.log(`TEST SUMMARY`);
console.log(`========================================${COLORS.reset}`);
console.log(`Test suites: ${suitesRun} total, ${suitesFailed} failed, ${suitesRun - suitesFailed} passed`);

if (totalPassed > 0 || totalFailed > 0) {
  console.log(`Individual tests: ${totalPassed + totalFailed} total, ${totalFailed} failed, ${totalPassed} passed`);
}

if (suitesFailed > 0) {
  console.log(`\n${COLORS.red}${COLORS.bold}TESTS FAILED${COLORS.reset}`);
  process.exit(1);
} else {
  console.log(`\n${COLORS.green}${COLORS.bold}ALL TESTS PASSED ✓${COLORS.reset}`);
}
