// Stage 8.4: Basic Combat Resolution Tests
// TDD: Write tests FIRST, implement SECOND

const {
  resolveSpaceCombatAttack,
  applyDamageToShip,
  updateShipStance,
  getShipStatus
} = require('../../lib/combat');

const { TestRunner, assertEqual, assertTrue, assertFalse } = require('../test-helpers');

const runner = new TestRunner('Stage 8.4: Basic Combat Resolution');

function test(description, fn) {
  runner.test(description, fn);
}

runner.section('SPACE COMBAT ATTACK');

test('Attack uses range DM from calculateRangeDM', () => {
  const attacker = { id: 'scout', pilotSkill: 2, weapons: [{ id: 'pulse_laser', damage: '2d6' }] };
  const target = { id: 'trader', hull: 30, armour: 2 };
  const result = resolveSpaceCombatAttack(attacker, target, { range: 'short', weapon: 0, seed: 12345 });

  // Short range has +1 DM
  assertTrue(result.rangeDM === 1);
});

test('Attack includes gunner skill if present', () => {
  const attacker = {
    id: 'scout',
    pilotSkill: 2,
    gunnerSkill: 2,
    weapons: [{ id: 'pulse_laser', damage: '2d6' }]
  };
  const target = { id: 'trader', hull: 30, armour: 2 };
  const result = resolveSpaceCombatAttack(attacker, target, { range: 'medium', weapon: 0, seed: 12345 });

  assertTrue(result.gunnerSkill !== undefined);
  assertEqual(result.gunnerSkill, 2);
});

test('Attack applies weapon damage on hit', () => {
  const attacker = {
    id: 'scout',
    pilotSkill: 3,
    gunnerSkill: 3,
    weapons: [{ id: 'pulse_laser', damage: '2d6' }]
  };
  const target = { id: 'trader', hull: 30, armour: 0 };
  const result = resolveSpaceCombatAttack(attacker, target, { range: 'short', weapon: 0, seed: 99999 });

  if (result.hit) {
    assertTrue(result.damage !== undefined);
    assertTrue(result.newHull !== undefined);
    assertEqual(result.newHull, 30 - result.damage);
  }
});

test('Attack respects armour reduction', () => {
  const attacker = {
    id: 'scout',
    pilotSkill: 3,
    gunnerSkill: 3,
    weapons: [{ id: 'pulse_laser', damage: '2d6' }]
  };
  const target = { id: 'trader', hull: 30, armour: 5 };
  const result = resolveSpaceCombatAttack(attacker, target, { range: 'short', weapon: 0, seed: 99999 });

  if (result.hit) {
    assertTrue(result.damage >= 0); // Armour prevents negative damage
  }
});

test('Attack target must be 8+', () => {
  const attacker = { id: 'scout', pilotSkill: 2, weapons: [{ id: 'pulse_laser', damage: '2d6' }] };
  const target = { id: 'trader', hull: 30, armour: 2 };
  const result = resolveSpaceCombatAttack(attacker, target, { range: 'medium', weapon: 0, seed: 12345 });

  assertTrue(result.targetNumber === 8);
});

runner.section('DAMAGE APPLICATION');

test('Apply damage reduces hull', () => {
  const ship = { id: 'scout', hull: 20, maxHull: 20, armour: 4 };
  const result = applyDamageToShip(ship, 5);

  assertEqual(result.newHull, 15);
  assertEqual(result.damageTaken, 5);
});

test('Hull cannot go below zero', () => {
  const ship = { id: 'scout', hull: 5, maxHull: 20, armour: 4 };
  const result = applyDamageToShip(ship, 10);

  assertEqual(result.newHull, 0);
  assertEqual(result.damageTaken, 5); // Only 5 hull was left
});

test('Zero damage does not change hull', () => {
  const ship = { id: 'scout', hull: 20, maxHull: 20, armour: 4 };
  const result = applyDamageToShip(ship, 0);

  assertEqual(result.newHull, 20);
  assertEqual(result.damageTaken, 0);
});

test('Damage returns destroyed flag when hull reaches 0', () => {
  const ship = { id: 'scout', hull: 5, maxHull: 20, armour: 4 };
  const result = applyDamageToShip(ship, 5);

  assertTrue(result.destroyed);
  assertEqual(result.newHull, 0);
});

runner.section('SHIP STANCE UPDATES');

test('Ship becomes disabled at 0 hull', () => {
  const ship = { id: 'scout', hull: 0, maxHull: 20, stance: 'hostile' };
  updateShipStance(ship);

  assertEqual(ship.stance, 'disabled');
});

test('Ship becomes destroyed if already disabled and hit again', () => {
  const ship = { id: 'scout', hull: 0, maxHull: 20, stance: 'disabled' };
  updateShipStance(ship, { overkill: true });

  assertEqual(ship.stance, 'destroyed');
});

test('Hostile ship stays hostile if hull > 0', () => {
  const ship = { id: 'scout', hull: 10, maxHull: 20, stance: 'hostile' };
  updateShipStance(ship);

  assertEqual(ship.stance, 'hostile');
});

test('Friendly ship stays friendly if hull > 0', () => {
  const ship = { id: 'scout', hull: 10, maxHull: 20, stance: 'friendly' };
  updateShipStance(ship);

  assertEqual(ship.stance, 'friendly');
});

runner.section('SHIP STATUS');

test('Get ship status: operational', () => {
  const ship = { id: 'scout', hull: 20, maxHull: 20 };
  const status = getShipStatus(ship);

  assertEqual(status.operational, true);
  assertEqual(status.hullPercent, 100);
  assertEqual(status.condition, 'operational');
});

test('Get ship status: damaged', () => {
  const ship = { id: 'scout', hull: 10, maxHull: 20 };
  const status = getShipStatus(ship);

  assertEqual(status.operational, true);
  assertEqual(status.hullPercent, 50);
  assertEqual(status.condition, 'damaged');
});

test('Get ship status: critical', () => {
  const ship = { id: 'scout', hull: 3, maxHull: 20 };
  const status = getShipStatus(ship);

  assertEqual(status.operational, true);
  assertEqual(status.hullPercent, 15);
  assertEqual(status.condition, 'critical');
});

test('Get ship status: disabled', () => {
  const ship = { id: 'scout', hull: 0, maxHull: 20 };
  const status = getShipStatus(ship);

  assertEqual(status.operational, false);
  assertEqual(status.hullPercent, 0);
  assertEqual(status.condition, 'disabled');
});

runner.finish();
