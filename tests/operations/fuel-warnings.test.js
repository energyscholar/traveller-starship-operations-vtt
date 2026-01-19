/**
 * Low Fuel Warnings Tests (AR-190)
 * Tests for fuel warning thresholds in engineer-state.js
 */

const { getEngineerState } = require('../../lib/engine/roles/engineer-state');
const { createEngineerViewModel } = require('../../lib/viewmodels/role-viewmodels/engineer-viewmodel');

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

console.log('=== Low Fuel Warnings Tests ===\n');

// Test 1: Normal fuel (> 25%) returns normal status
test('Fuel > 25% returns normal', () => {
  const fuelStatus = { total: 30, max: 40, percentFull: 75 };
  const state = getEngineerState({}, {}, {}, [], fuelStatus);
  assertTrue(!state.fuel?.lowFuel, 'Should not be low');
  assertTrue(!state.fuel?.criticalFuel, 'Should not be critical');
});

// Test 2: Low fuel (< 25%) returns lowFuel true
test('Fuel < 25% returns lowFuel true', () => {
  const fuelStatus = { total: 8, max: 40, percentFull: 20 };
  const state = getEngineerState({}, {}, {}, [], fuelStatus);
  assertTrue(state.fuel?.lowFuel, 'Should be low');
  assertTrue(!state.fuel?.criticalFuel, 'Should not be critical yet');
});

// Test 3: Critical fuel (< 10%) returns criticalFuel true
test('Fuel < 10% returns criticalFuel true', () => {
  const fuelStatus = { total: 3, max: 40, percentFull: 7 };
  const state = getEngineerState({}, {}, {}, [], fuelStatus);
  assertTrue(state.fuel?.lowFuel, 'Should be low');
  assertTrue(state.fuel?.criticalFuel, 'Should be critical');
});

// Test 4: ViewModel derives correct statusBadge for low fuel
test('ViewModel statusBadge shows FUEL LOW', () => {
  const fuelStatus = { total: 8, max: 40, percentFull: 20, lowFuel: true, criticalFuel: false };
  const vm = createEngineerViewModel({}, {}, {}, [], fuelStatus);
  assertEqual(vm.derived.statusBadge, 'FUEL LOW', 'Badge should show FUEL LOW');
});

// Test 5: ViewModel derives correct statusBadge for critical fuel
test('ViewModel statusBadge shows FUEL CRITICAL', () => {
  const fuelStatus = { total: 3, max: 40, percentFull: 7, lowFuel: true, criticalFuel: true };
  const vm = createEngineerViewModel({}, {}, {}, [], fuelStatus);
  assertEqual(vm.derived.statusBadge, 'FUEL CRITICAL', 'Badge should show FUEL CRITICAL');
});

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
console.log(`PASSED: ${passed}/${passed + failed}`);

if (failed > 0) process.exit(1);
