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
  'tests/unit/xss-validation.test.js'
];

let totalPassed = 0;
let totalFailed = 0;
let suitesRun = 0;
let suitesFailed = 0;

for (const testFile of unitTests) {
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
    const testCountMatch = output.match(/(\d+)\s+tests/i);
    const passMatch = output.match(/(\d+)\s+passed/i);
    const failMatch = output.match(/(\d+)\s+failed/i);

    if (testCountMatch) totalPassed += parseInt(testCountMatch[1]);
    if (passMatch) totalPassed += parseInt(passMatch[1]);
    if (failMatch) totalFailed += parseInt(failMatch[1]);

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
