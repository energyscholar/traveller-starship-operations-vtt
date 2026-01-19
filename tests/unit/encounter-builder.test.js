/**
 * Encounter Builder Tests
 * Tests for lib/operations/encounters.js
 */

const encounters = require('../../lib/operations/encounters');

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

console.log('=== Encounter Builder Tests ===\n');

// Test 1: ENCOUNTER_STATUS constants exist
test('ENCOUNTER_STATUS constants exist', () => {
  assertTrue(encounters.ENCOUNTER_STATUS, 'Should have ENCOUNTER_STATUS');
});

// Test 2: ENCOUNTER_TYPES constants exist
test('ENCOUNTER_TYPES constants exist', () => {
  assertTrue(encounters.ENCOUNTER_TYPES, 'Should have ENCOUNTER_TYPES');
});

// Test 3: ENCOUNTER_TEMPLATES exist
test('ENCOUNTER_TEMPLATES exist', () => {
  assertTrue(encounters.ENCOUNTER_TEMPLATES, 'Should have ENCOUNTER_TEMPLATES');
});

// Test 4: getEncounterTemplate function exported
test('getEncounterTemplate is exported as function', () => {
  assertTrue(typeof encounters.getEncounterTemplate === 'function', 'Should be function');
});

// Test 5: getAllEncounterTemplates function exported
test('getAllEncounterTemplates is exported as function', () => {
  assertTrue(typeof encounters.getAllEncounterTemplates === 'function', 'Should be function');
});

// Test 6: getAllEncounterTemplates returns object
test('getAllEncounterTemplates returns templates', () => {
  const templates = encounters.getAllEncounterTemplates();
  assertTrue(templates, 'Should return templates');
  assertTrue(typeof templates === 'object', 'Should be object');
});

// Test 7: createEncounter function exported
test('createEncounter is exported as function', () => {
  assertTrue(typeof encounters.createEncounter === 'function', 'Should be function');
});

// Test 8: rollEncounter function exported
test('rollEncounter is exported as function', () => {
  assertTrue(typeof encounters.rollEncounter === 'function', 'Should be function');
});

// Test 9: rollJumpEmergenceEncounter function exported
test('rollJumpEmergenceEncounter is exported as function', () => {
  assertTrue(typeof encounters.rollJumpEmergenceEncounter === 'function', 'Should be function');
});

// Test 10: Template has expected types
test('Templates include expected encounter types', () => {
  const templates = encounters.getAllEncounterTemplates();
  const keys = Object.keys(templates);
  assertTrue(keys.length > 0, 'Should have templates');
});

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
console.log(`PASSED: ${passed}/${passed + failed}`);

if (failed > 0) process.exit(1);
