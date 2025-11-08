// Stage 8.2: Range Bands & Targeting Tests
// TDD: Write tests FIRST, implement SECOND

const {
  SPACE_RANGE_BANDS,
  calculateRangeDM,
  getValidTargets,
  checkFriendlyFire,
  validateWeaponRange,
  selectDefaultTarget
} = require('../../lib/combat');

const { TestRunner, assertEqual, assertTrue, assertFalse, assertArrayEqual } = require('../test-helpers');

const runner = new TestRunner('Stage 8.2: Range Bands & Targeting');

function test(description, fn) {
  runner.test(description, fn);
}

runner.section('RANGE BAND DEFINITIONS');

test('7 range bands defined', () => {
  const expected = ['adjacent', 'close', 'short', 'medium', 'long', 'very_long', 'distant'];
  assertArrayEqual(SPACE_RANGE_BANDS, expected);
});

test('Adjacent range band exists', () => {
  assertTrue(SPACE_RANGE_BANDS.includes('adjacent'));
});

test('Distant range band exists', () => {
  assertTrue(SPACE_RANGE_BANDS.includes('distant'));
});

runner.section('RANGE DM CALCULATION');

test('Adjacent range: no DM (0)', () => {
  assertEqual(calculateRangeDM('adjacent'), 0);
});

test('Close range: no DM (0)', () => {
  assertEqual(calculateRangeDM('close'), 0);
});

test('Short range: +1 DM', () => {
  assertEqual(calculateRangeDM('short'), 1);
});

test('Medium range: no DM (0)', () => {
  assertEqual(calculateRangeDM('medium'), 0);
});

test('Long range: -2 DM', () => {
  assertEqual(calculateRangeDM('long'), -2);
});

test('Very Long range: -4 DM', () => {
  assertEqual(calculateRangeDM('very_long'), -4);
});

test('Distant range: -6 DM', () => {
  assertEqual(calculateRangeDM('distant'), -6);
});

test('Invalid range throws error', () => {
  let threw = false;
  try {
    calculateRangeDM('invalid');
  } catch (e) {
    threw = true;
  }
  assertTrue(threw, 'Should throw error for invalid range');
});

runner.section('TARGET FILTERING BY STANCE');

test('Hostile ships are valid targets', () => {
  const attacker = { id: 'ship1', stance: 'neutral' };
  const targets = [
    { id: 'ship2', stance: 'hostile' },
    { id: 'ship3', stance: 'friendly' }
  ];

  const valid = getValidTargets(attacker, targets);
  assertEqual(valid.length, 1);
  assertEqual(valid[0].id, 'ship2');
});

test('Friendly ships not auto-targeted', () => {
  const attacker = { id: 'ship1', stance: 'neutral' };
  const targets = [
    { id: 'ship2', stance: 'friendly' },
    { id: 'ship3', stance: 'friendly' }
  ];

  const valid = getValidTargets(attacker, targets);
  assertEqual(valid.length, 0);
});

test('Disabled ships not valid targets', () => {
  const attacker = { id: 'ship1', stance: 'neutral' };
  const targets = [
    { id: 'ship2', stance: 'disabled' },
    { id: 'ship3', stance: 'destroyed' }
  ];

  const valid = getValidTargets(attacker, targets);
  assertEqual(valid.length, 0);
});

test('Cannot target self', () => {
  const attacker = { id: 'ship1', stance: 'neutral' };
  const targets = [
    { id: 'ship1', stance: 'hostile' },
    { id: 'ship2', stance: 'hostile' }
  ];

  const valid = getValidTargets(attacker, targets);
  assertEqual(valid.length, 1);
  assertEqual(valid[0].id, 'ship2');
});

test('Neutral ships can be targeted', () => {
  const attacker = { id: 'ship1', stance: 'hostile' };
  const targets = [
    { id: 'ship2', stance: 'neutral' }
  ];

  const valid = getValidTargets(attacker, targets);
  assertEqual(valid.length, 1);
  assertEqual(valid[0].id, 'ship2');
});

runner.section('FRIENDLY FIRE WARNINGS');

test('Friendly fire warning when targeting friendly', () => {
  const attacker = { id: 'ship1', stance: 'neutral' };
  const target = { id: 'ship2', stance: 'friendly' };

  const result = checkFriendlyFire(attacker, target);
  assertTrue(result.isFriendlyFire);
  assertTrue(result.warning.includes('friendly'));
});

test('No warning when targeting hostile', () => {
  const attacker = { id: 'ship1', stance: 'neutral' };
  const target = { id: 'ship2', stance: 'hostile' };

  const result = checkFriendlyFire(attacker, target);
  assertFalse(result.isFriendlyFire);
  assertEqual(result.warning, null);
});

test('Friendly fire allowed but warned', () => {
  const attacker = { id: 'ship1', stance: 'neutral' };
  const target = { id: 'ship2', stance: 'friendly' };

  const result = checkFriendlyFire(attacker, target);
  assertTrue(result.allowed, 'Friendly fire should be allowed');
  assertTrue(result.isFriendlyFire, 'Should be flagged as friendly fire');
});

runner.section('WEAPON RANGE RESTRICTIONS');

test('Beam Laser restricted to medium or closer', () => {
  const weapon = { id: 'beam_laser', name: 'Beam Laser', rangeRestriction: ['adjacent', 'close', 'short', 'medium'] };

  assertTrue(validateWeaponRange(weapon, 'adjacent'));
  assertTrue(validateWeaponRange(weapon, 'medium'));
  assertFalse(validateWeaponRange(weapon, 'long'));
  assertFalse(validateWeaponRange(weapon, 'distant'));
});

test('Pulse Laser no range restriction', () => {
  const weapon = { id: 'pulse_laser', name: 'Pulse Laser', rangeRestriction: null };

  assertTrue(validateWeaponRange(weapon, 'adjacent'));
  assertTrue(validateWeaponRange(weapon, 'medium'));
  assertTrue(validateWeaponRange(weapon, 'long'));
  assertTrue(validateWeaponRange(weapon, 'distant'));
});

test('Weapon without rangeRestriction field defaults to no restriction', () => {
  const weapon = { id: 'test_weapon', name: 'Test Weapon' };

  assertTrue(validateWeaponRange(weapon, 'distant'));
});

runner.section('DEFAULT TARGET SELECTION');

test('Select last valid target if still valid', () => {
  const attacker = { id: 'ship1', lastTarget: 'ship2' };
  const targets = [
    { id: 'ship2', stance: 'hostile' },
    { id: 'ship3', stance: 'hostile' }
  ];

  const selected = selectDefaultTarget(attacker, targets);
  assertEqual(selected.id, 'ship2');
});

test('Select first valid target if no last target', () => {
  const attacker = { id: 'ship1', lastTarget: null };
  const targets = [
    { id: 'ship2', stance: 'hostile' },
    { id: 'ship3', stance: 'hostile' }
  ];

  const selected = selectDefaultTarget(attacker, targets);
  assertEqual(selected.id, 'ship2');
});

test('Select new target if last target destroyed', () => {
  const attacker = { id: 'ship1', lastTarget: 'ship2' };
  const targets = [
    { id: 'ship2', stance: 'destroyed' },
    { id: 'ship3', stance: 'hostile' }
  ];

  const selected = selectDefaultTarget(attacker, targets);
  assertEqual(selected.id, 'ship3');
});

test('Return null if no valid targets', () => {
  const attacker = { id: 'ship1', lastTarget: null };
  const targets = [
    { id: 'ship2', stance: 'friendly' },
    { id: 'ship3', stance: 'destroyed' }
  ];

  const selected = selectDefaultTarget(attacker, targets);
  assertEqual(selected, null);
});

runner.finish();
