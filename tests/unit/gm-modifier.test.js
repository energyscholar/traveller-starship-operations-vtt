/**
 * GM Roll Modifier Tests (AR-186)
 * Tests for lib/socket-handlers/roll-broadcast.js GM modifier functions
 */

const { setGmModifier, getGmModifier, clearGmModifier } = require('../../lib/socket-handlers/roll-broadcast');

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

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected truthy, got ${value}`);
  }
}

const TEST_CAMPAIGN = `test_gm_mod_${Date.now()}`;

console.log('=== GM Roll Modifier Tests ===\n');

// Test 1: setGmModifier stores value
test('setGmModifier stores DM value', () => {
  setGmModifier(TEST_CAMPAIGN, +2, 'Favorable conditions', false);
  const mod = getGmModifier(TEST_CAMPAIGN);
  assertEqual(mod.dm, 2, 'DM should be stored');
});

// Test 2: getGmModifier retrieves value
test('getGmModifier retrieves modifier', () => {
  setGmModifier(TEST_CAMPAIGN, -1, 'Difficult terrain', false);
  const mod = getGmModifier(TEST_CAMPAIGN);
  assertTrue(mod, 'Should return modifier');
  assertEqual(mod.dm, -1, 'DM should be -1');
  assertEqual(mod.reason, 'Difficult terrain', 'Reason should match');
});

// Test 3: clearGmModifier removes value
test('clearGmModifier removes modifier', () => {
  setGmModifier(TEST_CAMPAIGN, +3, 'Test', false);
  clearGmModifier(TEST_CAMPAIGN);
  const mod = getGmModifier(TEST_CAMPAIGN);
  assertTrue(!mod || mod.dm === 0, 'Modifier should be cleared');
});

// Test 4: Modifier with reason
test('Modifier includes reason', () => {
  setGmModifier(TEST_CAMPAIGN, +1, 'Cover bonus', true);
  const mod = getGmModifier(TEST_CAMPAIGN);
  assertEqual(mod.reason, 'Cover bonus', 'Reason should be stored');
});

// Test 5: Persistent flag stored
test('Modifier persistent flag stored', () => {
  setGmModifier(TEST_CAMPAIGN, +2, 'Persistent test', true);
  const mod = getGmModifier(TEST_CAMPAIGN);
  assertEqual(mod.persistent, true, 'Persistent should be true');
});

// Cleanup
clearGmModifier(TEST_CAMPAIGN);

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
console.log(`PASSED: ${passed}/${passed + failed}`);

if (failed > 0) process.exit(1);
