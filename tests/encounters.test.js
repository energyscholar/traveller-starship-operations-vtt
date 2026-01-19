/**
 * Encounters Module Tests (AR-197)
 * Tests for encounter templates, creation, and resolution
 */

const encounters = require('../lib/operations/encounters');

// Test utilities
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
    throw new Error(`${msg} Expected true, got ${value}`);
  }
}

function assertFalse(value, msg = '') {
  if (value) {
    throw new Error(`${msg} Expected false, got ${value}`);
  }
}

// ==================== Tests ====================

console.log('\n=== Encounters Module Tests (AR-197) ===\n');

// ==================== Template Tests ====================

console.log('--- Encounter Templates ---\n');

test('ENCOUNTER_TEMPLATES has scoutDistress', () => {
  assertTrue(encounters.ENCOUNTER_TEMPLATES.scoutDistress !== undefined);
});

test('scoutDistress template has required fields', () => {
  const template = encounters.ENCOUNTER_TEMPLATES.scoutDistress;
  assertTrue(template.id !== undefined, 'id');
  assertTrue(template.name !== undefined, 'name');
  assertTrue(template.description !== undefined, 'description');
  assertTrue(template.flavorText !== undefined, 'flavorText');
  assertTrue(template.ship !== undefined, 'ship');
  assertTrue(template.npcs !== undefined, 'npcs');
  assertTrue(template.resolutions !== undefined, 'resolutions');
});

test('scoutDistress has Captain Vance NPC', () => {
  const template = encounters.ENCOUNTER_TEMPLATES.scoutDistress;
  const captain = template.npcs.find(npc => npc.id === 'scout-captain');
  assertTrue(captain !== undefined);
  assertEqual(captain.name, 'Captain Elara Vance');
});

test('scoutDistress has multiple resolution options', () => {
  const template = encounters.ENCOUNTER_TEMPLATES.scoutDistress;
  assertTrue(template.resolutions.length >= 4);
});

test('getEncounterTemplate returns correct template', () => {
  const template = encounters.getEncounterTemplate('scoutDistress');
  assertTrue(template !== null);
  assertEqual(template.id, 'scout-distress');
});

test('getEncounterTemplate returns null for invalid id', () => {
  const template = encounters.getEncounterTemplate('nonexistent');
  assertEqual(template, null);
});

test('getAllEncounterTemplates returns all templates', () => {
  const templates = encounters.getAllEncounterTemplates();
  assertTrue(Object.keys(templates).length >= 2);
});

// ==================== Encounter Creation Tests ====================

console.log('\n--- Encounter Creation ---\n');

test('createEncounter creates instance from template', () => {
  const result = encounters.createEncounter('scoutDistress');
  assertTrue(result.success);
  assertTrue(result.encounter !== undefined);
  assertEqual(result.encounter.templateId, 'scoutDistress');
  assertEqual(result.encounter.status, 'active');
});

test('createEncounter generates unique ID', () => {
  const result1 = encounters.createEncounter('scoutDistress');
  const result2 = encounters.createEncounter('scoutDistress');
  assertTrue(result1.encounter.id !== result2.encounter.id);
});

test('createEncounter returns error for invalid template', () => {
  const result = encounters.createEncounter('invalid');
  assertFalse(result.success);
  assertTrue(result.error.includes('Unknown'));
});

test('createEncounter allows overrides', () => {
  const result = encounters.createEncounter('scoutDistress', {
    ship: { name: 'Custom Ship' }
  });
  assertTrue(result.success);
  assertEqual(result.encounter.ship.name, 'Custom Ship');
});

// ==================== Roll Encounter Tests ====================

console.log('\n--- Roll Encounter ---\n');

test('rollJumpEmergenceEncounter with forceScout returns scout encounter', () => {
  const encounter = encounters.rollJumpEmergenceEncounter({ forceScout: true });
  assertTrue(encounter !== null);
  assertEqual(encounter.templateId, 'scoutDistress');
});

test('rollEncounter respects location filter', () => {
  // Run multiple times - should sometimes return null at non-matching location
  let nullCount = 0;
  for (let i = 0; i < 20; i++) {
    const encounter = encounters.rollEncounter('deep_space');
    if (encounter === null) nullCount++;
  }
  // All should be null since no templates match 'deep_space'
  assertEqual(nullCount, 20);
});

test('rollEncounter can return encounter at valid location', () => {
  // Force an encounter at jump_point
  const encounter = encounters.rollEncounter('jump_point', { forceEncounter: true });
  assertTrue(encounter !== null);
});

// ==================== Resolution Tests ====================

console.log('\n--- Encounter Resolution ---\n');

test('resolveEncounter with valid resolution succeeds', () => {
  const { encounter } = encounters.createEncounter('scoutDistress');
  const result = encounters.resolveEncounter(encounter, 'evacuate', {});

  assertTrue(result.success);
  assertEqual(result.resolution, 'evacuate');
  assertEqual(result.encounterStatus, 'resolved');
});

test('resolveEncounter returns error for invalid resolution', () => {
  const { encounter } = encounters.createEncounter('scoutDistress');
  const result = encounters.resolveEncounter(encounter, 'invalid');

  assertFalse(result.success);
  assertTrue(result.error.includes('Unknown'));
});

test('resolveEncounter checks requirements', () => {
  const { encounter } = encounters.createEncounter('scoutDistress');
  const result = encounters.resolveEncounter(encounter, 'assist-repair', {
    hasEngineer: false
  });

  assertFalse(result.success);
  assertTrue(result.error.includes('requirements'));
});

test('resolveEncounter passes with met requirements', () => {
  const { encounter } = encounters.createEncounter('scoutDistress');
  const result = encounters.resolveEncounter(encounter, 'assist-repair', {
    hasEngineer: true,
    skillLevel: 4  // High skill for success
  });

  assertTrue(result.success);
});

test('resolveEncounter with ignore option works', () => {
  const { encounter } = encounters.createEncounter('scoutDistress');
  const result = encounters.resolveEncounter(encounter, 'ignore', {});

  assertTrue(result.success);
  assertTrue(result.outcome.reputation !== undefined);
});

// ==================== Helper Tests ====================

console.log('\n--- Helpers ---\n');

test('getEncounterNPCs returns NPCs', () => {
  const { encounter } = encounters.createEncounter('scoutDistress');
  const npcs = encounters.getEncounterNPCs(encounter);

  assertTrue(Array.isArray(npcs));
  assertEqual(npcs.length, 2);
});

test('getEncounterShip returns ship data', () => {
  const { encounter } = encounters.createEncounter('scoutDistress');
  const ship = encounters.getEncounterShip(encounter);

  assertTrue(ship !== null);
  assertEqual(ship.name, 'ISS Wanderer');
  assertEqual(ship.type, 'Scout/Courier');
});

// ==================== Results ====================

console.log('\n' + '='.repeat(50));
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
}
