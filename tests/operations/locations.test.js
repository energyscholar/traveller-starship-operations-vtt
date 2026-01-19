/**
 * Locations Module Tests
 * Tests for lib/operations/locations.js
 * Tests exports and constants without requiring full DB setup
 */

const locations = require('../../lib/operations/locations');

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

console.log('=== Locations Tests ===\n');

// Test 1: LOCATION_TYPES constants exist
test('LOCATION_TYPES has expected values', () => {
  assertTrue(locations.LOCATION_TYPES, 'Should have LOCATION_TYPES');
});

// Test 2: VISIBILITY constants exist
test('VISIBILITY has expected values', () => {
  assertTrue(locations.VISIBILITY, 'Should have VISIBILITY');
});

// Test 3: createLocation function exported
test('createLocation is exported as function', () => {
  assertTrue(typeof locations.createLocation === 'function', 'Should be function');
});

// Test 4: getLocation function exported
test('getLocation is exported as function', () => {
  assertTrue(typeof locations.getLocation === 'function', 'Should be function');
});

// Test 5: getLocationsByCampaign function exported
test('getLocationsByCampaign is exported as function', () => {
  assertTrue(typeof locations.getLocationsByCampaign === 'function', 'Should be function');
});

// Test 6: getChildLocations function exported
test('getChildLocations is exported as function', () => {
  assertTrue(typeof locations.getChildLocations === 'function', 'Should be function');
});

// Test 7: getRootLocations function exported
test('getRootLocations is exported as function', () => {
  assertTrue(typeof locations.getRootLocations === 'function', 'Should be function');
});

// Test 8: updateLocation function exported
test('updateLocation is exported as function', () => {
  assertTrue(typeof locations.updateLocation === 'function', 'Should be function');
});

// Test 9: revealLocation function exported
test('revealLocation is exported as function', () => {
  assertTrue(typeof locations.revealLocation === 'function', 'Should be function');
});

// Test 10: deleteLocation function exported
test('deleteLocation is exported as function', () => {
  assertTrue(typeof locations.deleteLocation === 'function', 'Should be function');
});

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
console.log(`PASSED: ${passed}/${passed + failed}`);

if (failed > 0) process.exit(1);
