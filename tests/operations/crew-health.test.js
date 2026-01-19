/**
 * Crew Health System Tests
 * Tests for lib/operations/crew-health.js
 * Tests exports and constants without requiring full DB setup
 */

const crewHealth = require('../../lib/operations/crew-health');

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

console.log('=== Crew Health Tests ===\n');

// Test 1: WOUND_TYPES constants exist
test('WOUND_TYPES has expected values', () => {
  assertTrue(crewHealth.WOUND_TYPES, 'Should have WOUND_TYPES');
  assertTrue(crewHealth.WOUND_TYPES.LACERATION, 'Should have LACERATION');
  assertTrue(crewHealth.WOUND_TYPES.BURN, 'Should have BURN');
  assertTrue(crewHealth.WOUND_TYPES.IMPACT, 'Should have IMPACT');
  assertTrue(crewHealth.WOUND_TYPES.INTERNAL, 'Should have INTERNAL');
  assertTrue(crewHealth.WOUND_TYPES.RADIATION, 'Should have RADIATION');
});

// Test 2: SEVERITY constants exist
test('SEVERITY has expected values', () => {
  assertTrue(crewHealth.SEVERITY, 'Should have SEVERITY');
  assertTrue(crewHealth.SEVERITY.MINOR, 'Should have MINOR');
  assertTrue(crewHealth.SEVERITY.MODERATE, 'Should have MODERATE');
  assertTrue(crewHealth.SEVERITY.SEVERE, 'Should have SEVERE');
  assertTrue(crewHealth.SEVERITY.CRITICAL, 'Should have CRITICAL');
});

// Test 3: LOCATIONS constants exist
test('LOCATIONS has expected values', () => {
  assertTrue(crewHealth.LOCATIONS, 'Should have LOCATIONS');
  assertTrue(crewHealth.LOCATIONS.HEAD, 'Should have HEAD');
  assertTrue(crewHealth.LOCATIONS.TORSO, 'Should have TORSO');
  assertTrue(crewHealth.LOCATIONS.ARM_L, 'Should have ARM_L');
  assertTrue(crewHealth.LOCATIONS.LEG_R, 'Should have LEG_R');
});

// Test 4: CONSCIOUSNESS states exist
test('CONSCIOUSNESS has expected values', () => {
  assertTrue(crewHealth.CONSCIOUSNESS, 'Should have CONSCIOUSNESS');
  assertTrue(crewHealth.CONSCIOUSNESS.ALERT, 'Should have ALERT');
  assertTrue(crewHealth.CONSCIOUSNESS.DAZED, 'Should have DAZED');
  assertTrue(crewHealth.CONSCIOUSNESS.UNCONSCIOUS, 'Should have UNCONSCIOUS');
  assertTrue(crewHealth.CONSCIOUSNESS.DEAD, 'Should have DEAD');
});

// Test 5: CONDITION_TYPES exist
test('CONDITION_TYPES has expected values', () => {
  assertTrue(crewHealth.CONDITION_TYPES, 'Should have CONDITION_TYPES');
  assertTrue(crewHealth.CONDITION_TYPES.FATIGUE, 'Should have FATIGUE');
  assertTrue(crewHealth.CONDITION_TYPES.STUNNED, 'Should have STUNNED');
});

// Test 6: getHealth function exported
test('getHealth is exported as function', () => {
  assertTrue(typeof crewHealth.getHealth === 'function', 'Should be function');
});

// Test 7: addWound function exported
test('addWound is exported as function', () => {
  assertTrue(typeof crewHealth.addWound === 'function', 'Should be function');
});

// Test 8: treatWound function exported
test('treatWound is exported as function', () => {
  assertTrue(typeof crewHealth.treatWound === 'function', 'Should be function');
});

// Test 9: stabilize function exported
test('stabilize is exported as function', () => {
  assertTrue(typeof crewHealth.stabilize === 'function', 'Should be function');
});

// Test 10: getCampaignHealth function exported
test('getCampaignHealth is exported as function', () => {
  assertTrue(typeof crewHealth.getCampaignHealth === 'function', 'Should be function');
});

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
console.log(`PASSED: ${passed}/${passed + failed}`);

if (failed > 0) process.exit(1);
