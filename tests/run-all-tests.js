#!/usr/bin/env node
// Test Runner - Runs all unit tests in sequence
// Run with: node tests/run-all-tests.js
//
// AR-18 Optimizations:
//   --unit         Run unit tests only
//   --integration  Run integration tests only
//   --security     Run security tests only
//   --file=NAME    Run single test file (partial match)
//   --timing       Show per-suite timing breakdown

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// AR-18.8: Parse CLI flags
const args = process.argv.slice(2);
const flags = {
  unitOnly: args.includes('--unit'),
  integrationOnly: args.includes('--integration'),
  securityOnly: args.includes('--security'),
  smokeOnly: args.includes('--smoke'),
  showTiming: args.includes('--timing') || process.env.TEST_TIMING === 'true',
  fileFilter: args.find(a => a.startsWith('--file='))?.split('=')[1] || null
};

// AR-24.5: Smoke tests - critical path only (fast)
const smokeTests = [
  'tests/unit/state.test.js',
  'tests/unit/services.test.js',
  'tests/operations-handlers.test.js',
  'tests/contacts.test.js'
];

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// AR-18.10: Start timing
const startTime = Date.now();
const suiteTimes = [];

// Test cleanup utility
const testCleanup = require('./test-cleanup');

console.log(`${COLORS.cyan}${COLORS.bold}========================================`);
console.log(`TRAVELLER COMBAT VTT - TEST SUITE`);
console.log(`========================================${COLORS.reset}\n`);

// Pre-test cleanup: Remove any stale test campaigns
const preCleanCount = testCleanup.run();
if (preCleanCount > 0) {
  console.log(`${COLORS.yellow}Pre-test cleanup: ${preCleanCount} stale campaigns removed${COLORS.reset}\n`);
}

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
  'tests/unit/xss-validation.test.js',
  'tests/unit/export-import.test.js',  // Session 4 - Export/import system
  'tests/unit/docking.test.js',  // Stage 12.1 - Docking stub
  'tests/unit/space-phase-system.test.js',  // Phase system - Initiative, ordering, phases, thrust (50 tests)
  'tests/unit/space-weapons-phase.test.js',  // Phase system - Weapons, point defense (30 tests)
  'tests/unit/space-role-gating.test.js',  // Phase system - Role gating, edge cases (35 tests)
  // DEFERRED: ship-validation-edge-cases.test.js (test framework integration needed)
  'tests/unit/state.test.js',  // State module tests (13 tests)
  'tests/unit/services.test.js',  // Services module tests (10 tests)
  'tests/unit/ai-helpers.test.js',  // AI helper tests (9 tests)
  'tests/unit/ai-decisions.test.js',  // AI decision tests (10 tests)
  'tests/unit/reveals.test.js',  // Reveals CRUD tests (23 tests) - AUTORUN-8
  'tests/unit/characters.test.js',  // Characters CRUD and parsers (17 tests) - AUTORUN-9
  'tests/operations-handlers.test.js',  // Operations handler smoke tests (27 tests)
  'tests/contacts.test.js',  // Contacts CRUD and visibility tests
  'tests/ship-systems.test.js',  // Ship systems damage and repair (31 tests with AR-194)
  'tests/encounters.test.js',  // AR-197 encounters module (20 tests)
  'tests/jump.test.js',  // Jump travel and date utilities (23 tests)
  'tests/operations-refueling.test.js',  // Refueling system tests (25 tests)
  'tests/combat-engine.test.js',  // Combat engine tests (31 tests) - AUTORUN-14
  'tests/unit/combat-display.test.js',  // Combat display ASCII renderer (29 tests)
  'tests/system-cache.test.js',  // AR-28: System cache tests (9 tests)
  'tests/captain.test.js',  // AR-29: Captain role tests (10 tests)
  'tests/gunner-training.test.js',  // AR-29: Gunner training target tests (8 tests)
  'tests/unit/travellermap-proxy.test.js',  // AR-121: TravellerMap proxy tests (17 tests)
  'tests/engine/starsystem-generator.test.js',  // AR-240: Star system generator (39 tests)
  'tests/combat/captain-ai.test.js',  // BATCH 3.B: Combat Captain AI (29 tests)
  'tests/combat/called-shot-ai.test.js',  // AR-223: Called shot AI (20 tests)
  'tests/combat/escape-mechanics.test.js',  // AR-223: Escape mechanics (15 tests)
  // Factory tests
  'tests/factories/CrewFactory.test.js',
  'tests/factories/ShipFactory.test.js',
  'tests/factories/NPCCrewFactory.test.js',
  'tests/factories/ContactFactory.test.js',
  'tests/factories/index.test.js',
  // ViewModel tests
  'tests/viewmodels/engineer-viewmodel.test.js',
  'tests/viewmodels/pilot-viewmodel.test.js',
  'tests/viewmodels/sensors-viewmodel.test.js',
  'tests/viewmodels/captain-viewmodel.test.js',
  'tests/viewmodels/astrogator-viewmodel.test.js',
  'tests/viewmodels/damage-control-viewmodel.test.js',
  'tests/viewmodels/medic-viewmodel.test.js',
  'tests/viewmodels/marines-viewmodel.test.js',
  'tests/viewmodels/comms-viewmodel.test.js',
  'tests/viewmodels/steward-viewmodel.test.js',
  // TUI Formatter tests
  'tests/tui/formatters/travel-formatter.test.js',
  'tests/tui/formatters/jump-formatter.test.js',
  'tests/tui/formatters/campaign-formatter.test.js',
  'tests/tui/formatters/fuel-formatter.test.js',
  'tests/tui/formatters/contacts-formatter.test.js',
  'tests/tui/formatters/time-formatter.test.js',
  'tests/tui/formatters/email-formatter.test.js',
  'tests/tui/formatters/npc-formatter.test.js',
  'tests/tui/formatters/battle-formatter.test.js',
  // TUI Menu tests
  'tests/tui/menus/operations-menu.test.js',
  'tests/tui/menus/campaign-menu.test.js',
  'tests/tui/menus/email-menu.test.js',
  'tests/tui/menus/npc-menu.test.js',
  'tests/tui/menus/battle-viewer.test.js',
  // TUI Integration tests
  'tests/tui/integration/tui-flow.test.js',
  // V2 Bug Fix tests
  'tests/v2/v2-bugs.test.js',
  'tests/v2/modals.test.js'  // V2 modal system tests
];

// Integration tests
const integrationTests = [
  'tests/integration/space-ship-selection.test.js',     // Stage 8.6
  'tests/integration/space-combat-hud.test.js',         // Stage 8.7
  'tests/integration/space-combat-resolution.test.js'   // Stage 8.8
];

// Security tests (AR-16) - Jest format, run with: npx jest tests/security/
// Excluded from main runner until validators.js merged from security branch
const securityTests = [
  // 'tests/security/validation.test.js',  // Needs lib/operations/validators.js
  // 'tests/security/rate-limit.test.js'   // Jest format (describe/test)
];

let totalPassed = 0;
let totalFailed = 0;
let suitesRun = 0;
let suitesFailed = 0;

// AR-18.8: Select tests based on flags
let allTests;
if (flags.smokeOnly) {
  allTests = smokeTests;
  console.log(`${COLORS.yellow}🚀 SMOKE TESTS (fast critical path)${COLORS.reset}\n`);
} else if (flags.unitOnly) {
  allTests = unitTests;
  console.log(`${COLORS.yellow}Running unit tests only${COLORS.reset}\n`);
} else if (flags.integrationOnly) {
  allTests = integrationTests;
  console.log(`${COLORS.yellow}Running integration tests only${COLORS.reset}\n`);
} else if (flags.securityOnly) {
  allTests = securityTests;
  console.log(`${COLORS.yellow}Running security tests only${COLORS.reset}\n`);
} else {
  allTests = [...unitTests, ...integrationTests, ...securityTests];
}

// AR-18.8: Filter by file name if specified
if (flags.fileFilter) {
  allTests = allTests.filter(t => t.toLowerCase().includes(flags.fileFilter.toLowerCase()));
  console.log(`${COLORS.yellow}Filtering to: ${flags.fileFilter} (${allTests.length} matches)${COLORS.reset}\n`);
}

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
    // AR-18.10: Track suite timing
    const suiteStart = Date.now();

    // Run in quiet mode for minimal output
    const output = execSync(`node ${testPath}`, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe',
      env: { ...process.env, TEST_QUIET: 'true' }
    });

    const suiteTime = Date.now() - suiteStart;
    suiteTimes.push({ name: testName, time: suiteTime });

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

// AR-18.10: Calculate total time
const totalTime = Date.now() - startTime;

console.log(`${COLORS.cyan}${COLORS.bold}========================================`);
console.log(`TEST SUMMARY`);
console.log(`========================================${COLORS.reset}`);
console.log(`Test suites: ${suitesRun} total, ${suitesFailed} failed, ${suitesRun - suitesFailed} passed`);

if (totalPassed > 0 || totalFailed > 0) {
  console.log(`Individual tests: ${totalPassed + totalFailed} total, ${totalFailed} failed, ${totalPassed} passed`);
}

// AR-18.10: Show timing
console.log(`Total time: ${(totalTime / 1000).toFixed(2)}s`);

// Show slowest suites if --timing flag or more than 5 suites
if (flags.showTiming && suiteTimes.length > 0) {
  const sorted = [...suiteTimes].sort((a, b) => b.time - a.time);
  console.log(`\n${COLORS.yellow}Slowest suites:${COLORS.reset}`);
  sorted.slice(0, 5).forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name}: ${s.time}ms`);
  });
}

// Post-test cleanup: Remove any test campaigns created during run
const postCleanCount = testCleanup.run();
if (postCleanCount > 0) {
  console.log(`${COLORS.yellow}Post-test cleanup: ${postCleanCount} test campaigns removed${COLORS.reset}`);
}

if (suitesFailed > 0) {
  console.log(`\n${COLORS.red}${COLORS.bold}TESTS FAILED${COLORS.reset}`);
  process.exit(1);
} else {
  console.log(`\n${COLORS.green}${COLORS.bold}ALL TESTS PASSED ✓${COLORS.reset}`);
}
