/**
 * NPC Dossiers Tests
 * Tests for lib/operations/npc-dossiers.js
 * Tests exports and constants without requiring full DB setup
 */

const dossiers = require('../../lib/operations/npc-dossiers');

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

console.log('=== NPC Dossiers Tests ===\n');

// Test 1: NPC_ROLES constants exist
test('NPC_ROLES has expected values', () => {
  assertTrue(dossiers.NPC_ROLES, 'Should have NPC_ROLES');
});

// Test 2: NPC_STATUS constants exist
test('NPC_STATUS has expected values', () => {
  assertTrue(dossiers.NPC_STATUS, 'Should have NPC_STATUS');
});

// Test 3: VISIBILITY constants exist
test('VISIBILITY has expected values', () => {
  assertTrue(dossiers.VISIBILITY, 'Should have VISIBILITY');
});

// Test 4: createNPCDossier function exported
test('createNPCDossier is exported as function', () => {
  assertTrue(typeof dossiers.createNPCDossier === 'function', 'Should be function');
});

// Test 5: getNPCDossier function exported
test('getNPCDossier is exported as function', () => {
  assertTrue(typeof dossiers.getNPCDossier === 'function', 'Should be function');
});

// Test 6: getNPCDossiersByCampaign function exported
test('getNPCDossiersByCampaign is exported as function', () => {
  assertTrue(typeof dossiers.getNPCDossiersByCampaign === 'function', 'Should be function');
});

// Test 7: updateNPCDossier function exported
test('updateNPCDossier is exported as function', () => {
  assertTrue(typeof dossiers.updateNPCDossier === 'function', 'Should be function');
});

// Test 8: revealNPC function exported
test('revealNPC is exported as function', () => {
  assertTrue(typeof dossiers.revealNPC === 'function', 'Should be function');
});

// Test 9: getHiddenNPCs function exported
test('getHiddenNPCs is exported as function', () => {
  assertTrue(typeof dossiers.getHiddenNPCs === 'function', 'Should be function');
});

// Test 10: deleteNPCDossier function exported
test('deleteNPCDossier is exported as function', () => {
  assertTrue(typeof dossiers.deleteNPCDossier === 'function', 'Should be function');
});

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
console.log(`PASSED: ${passed}/${passed + failed}`);

if (failed > 0) process.exit(1);
