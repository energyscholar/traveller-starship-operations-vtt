/**
 * AR-196: Called Shot System Tests (TDD)
 * Targeting specific ship systems during combat
 */

const combatEngine = require('../lib/operations/combat-engine');

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

// ==================== Tests ====================

console.log('\n=== Called Shot Tests ===\n');

console.log('--- Called Shot Penalties ---\n');

test('getCalledShotPenalty returns -2 for standard systems', () => {
  const penalty = combatEngine.getCalledShotPenalty('mDrive');
  assertEqual(penalty, -2);
});

test('getCalledShotPenalty returns -2 for sensors', () => {
  const penalty = combatEngine.getCalledShotPenalty('sensors');
  assertEqual(penalty, -2);
});

test('getCalledShotPenalty returns -4 for power plant (critical)', () => {
  const penalty = combatEngine.getCalledShotPenalty('powerPlant');
  assertEqual(penalty, -4);
});

test('getCalledShotPenalty returns -4 for jDrive (critical)', () => {
  const penalty = combatEngine.getCalledShotPenalty('jDrive');
  assertEqual(penalty, -4);
});

test('getCalledShotPenalty returns 0 for null (no called shot)', () => {
  const penalty = combatEngine.getCalledShotPenalty(null);
  assertEqual(penalty, 0);
});

console.log('\n--- Valid Target Systems ---\n');

test('TARGETABLE_SYSTEMS contains mDrive', () => {
  assertTrue(combatEngine.TARGETABLE_SYSTEMS.includes('mDrive'));
});

test('TARGETABLE_SYSTEMS contains sensors', () => {
  assertTrue(combatEngine.TARGETABLE_SYSTEMS.includes('sensors'));
});

test('TARGETABLE_SYSTEMS contains powerPlant', () => {
  assertTrue(combatEngine.TARGETABLE_SYSTEMS.includes('powerPlant'));
});

test('TARGETABLE_SYSTEMS contains jDrive', () => {
  assertTrue(combatEngine.TARGETABLE_SYSTEMS.includes('jDrive'));
});

test('TARGETABLE_SYSTEMS contains weapon', () => {
  assertTrue(combatEngine.TARGETABLE_SYSTEMS.includes('weapon'));
});

test('TARGETABLE_SYSTEMS does NOT contain crew', () => {
  assertTrue(!combatEngine.TARGETABLE_SYSTEMS.includes('crew'));
});

console.log('\n--- Called Shot Resolution ---\n');

test('resolveAttack accepts targetSystem in modifiers', () => {
  const attacker = { name: 'Gunner', skills: { gunnery: 2 } };
  const weapon = { name: 'Laser', damage: '2d6', range: 'medium' };
  const target = { name: 'Pirate', range_band: 'medium', armor: 0 };

  // Should not throw
  const result = combatEngine.resolveAttack(attacker, weapon, target, { targetSystem: 'mDrive' });
  assertTrue(result !== null, 'returns result');
  assertTrue(result.targetSystem === 'mDrive', 'includes targetSystem in result');
});

test('Called shot applies penalty to attack roll', () => {
  const attacker = { name: 'Gunner', skills: { gunnery: 0 } };
  const weapon = { name: 'Laser', damage: '2d6', range: 'medium' };
  const target = { name: 'Pirate', range_band: 'medium', armor: 0 };

  const resultNormal = combatEngine.resolveAttack(attacker, weapon, target, {});
  const resultCalled = combatEngine.resolveAttack(attacker, weapon, target, { targetSystem: 'mDrive' });

  // Called shot should have -2 penalty reflected in modifiers
  assertEqual(resultCalled.modifiers.calledShot, -2, 'called shot penalty in modifiers');
});

// ==================== Summary ====================

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}
