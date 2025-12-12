/**
 * AR-103 Scaffolding Test Runner
 *
 * Runs all scaffolding tests in sequence.
 * These tests must pass before AND after any app.js refactor phase.
 *
 * Run: npm run cleanup:all; npm start & sleep 5; node tests/scaffolding/run-all.js
 */

const { execSync } = require('child_process');
const path = require('path');

const tests = [
  'app-window-exports.test.js',
  'app-role-buttons.test.js'
];

console.log('╔══════════════════════════════════════════════════╗');
console.log('║  AR-103 SCAFFOLDING TEST SUITE                   ║');
console.log('║  app.js Refactor Safety Net                      ║');
console.log('╚══════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

for (const test of tests) {
  console.log(`\n▶ Running ${test}...\n`);
  const testPath = path.join(__dirname, test);

  try {
    execSync(`node ${testPath}`, { stdio: 'inherit' });
    passed++;
  } catch (err) {
    failed++;
    console.log(`\n❌ ${test} FAILED\n`);
  }
}

console.log('\n══════════════════════════════════════════════════');
console.log(`SUMMARY: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
console.log('══════════════════════════════════════════════════\n');

if (failed > 0) {
  console.log('⚠️  SCAFFOLDING TESTS FAILED - DO NOT PROCEED WITH REFACTOR');
  process.exit(1);
} else {
  console.log('✅ ALL SCAFFOLDING TESTS PASSED - Safe to refactor');
  process.exit(0);
}
