/**
 * Passenger Manifest Tests
 * Tests for lib/operations/passenger-manifest.js
 * Tests exports and constants without requiring full DB setup
 */

const passengers = require('../../lib/operations/passenger-manifest');

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

console.log('=== Passenger Manifest Tests ===\n');

// Test 1: PASSENGER_TYPES constants exist
test('PASSENGER_TYPES has expected values', () => {
  assertTrue(passengers.PASSENGER_TYPES, 'Should have PASSENGER_TYPES');
});

// Test 2: PASSENGER_STATUS constants exist
test('PASSENGER_STATUS has expected values', () => {
  assertTrue(passengers.PASSENGER_STATUS, 'Should have PASSENGER_STATUS');
});

// Test 3: RESTRAINT_TYPES constants exist
test('RESTRAINT_TYPES has expected values', () => {
  assertTrue(passengers.RESTRAINT_TYPES, 'Should have RESTRAINT_TYPES');
});

// Test 4: DEMAND_TYPES constants exist
test('DEMAND_TYPES has expected values', () => {
  assertTrue(passengers.DEMAND_TYPES, 'Should have DEMAND_TYPES');
});

// Test 5: getPassengerCapacity function exported
test('getPassengerCapacity is exported as function', () => {
  assertTrue(typeof passengers.getPassengerCapacity === 'function', 'Should be function');
});

// Test 6: getPassengers function exported
test('getPassengers is exported as function', () => {
  assertTrue(typeof passengers.getPassengers === 'function', 'Should be function');
});

// Test 7: addPassenger function exported
test('addPassenger is exported as function', () => {
  assertTrue(typeof passengers.addPassenger === 'function', 'Should be function');
});

// Test 8: removePassenger function exported
test('removePassenger is exported as function', () => {
  assertTrue(typeof passengers.removePassenger === 'function', 'Should be function');
});

// Test 9: assignCabin function exported
test('assignCabin is exported as function', () => {
  assertTrue(typeof passengers.assignCabin === 'function', 'Should be function');
});

// Test 10: secureAllPassengers function exported
test('secureAllPassengers is exported as function', () => {
  assertTrue(typeof passengers.secureAllPassengers === 'function', 'Should be function');
});

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
console.log(`PASSED: ${passed}/${passed + failed}`);

if (failed > 0) process.exit(1);
