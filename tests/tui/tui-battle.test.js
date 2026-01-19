/**
 * TUI Battle Menu Tests (BETA)
 * Tests for bin/tui-menu.js battle simulation access
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected truthy, got ${value}`);
  }
}

console.log('=== TUI Battle Menu Tests ===\n');

// Read the tui-menu.js file
const tuiMenuPath = path.join(__dirname, '../../bin/tui-menu.js');
const tuiMenuContent = fs.readFileSync(tuiMenuPath, 'utf8');

// Test 1: [B] key alias exists
test('[B] key alias exists in key handler', () => {
  assertTrue(tuiMenuContent.includes("key === 'b'"), 'Should have b key check');
  assertTrue(tuiMenuContent.includes("key === 'B'"), 'Should have B key check');
});

// Test 2: Battle menu display shows [B/S]
test('Menu displays [B/S] for battle simulation', () => {
  assertTrue(tuiMenuContent.includes('[B/S]'), 'Should show [B/S] in menu');
});

// Test 3: runBattleMenu is imported
test('runBattleMenu is imported', () => {
  assertTrue(tuiMenuContent.includes('runBattleMenu'), 'Should import runBattleMenu');
});

// Test 4: Battle simulation case exists
test('Simulation case triggers battle menu', () => {
  assertTrue(tuiMenuContent.includes("case 'simulation'"), 'Should have simulation case');
  assertTrue(tuiMenuContent.includes('await runBattleMenu()'), 'Should call runBattleMenu');
});

// Test 5: Battle viewer module exists
test('Battle viewer module exists', () => {
  const battleViewerPath = path.join(__dirname, '../../lib/tui/battle-viewer.js');
  assertTrue(fs.existsSync(battleViewerPath), 'battle-viewer.js should exist');
});

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
console.log(`PASSED: ${passed}/${passed + failed}`);

if (failed > 0) process.exit(1);
