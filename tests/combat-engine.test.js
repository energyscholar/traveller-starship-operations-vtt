/**
 * Combat Engine Unit Tests (Autorun 14)
 *
 * Tests for dice rolling, attack resolution, damage calculation,
 * and critical hit mechanics.
 */

const {
  roll2D6,
  roll1D6,
  rollDamage,
  RANGE_DM,
  getRangeModifier,
  resolveAttack,
  rollCriticalEffect,
  CRITICAL_EFFECTS,
  applyDamage,
  checkDestroyed,
  resolvePointDefense
} = require('../lib/operations/combat-engine');

// Test state
let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    testResults.push({ name, passed: true });
  } catch (error) {
    testsFailed++;
    testResults.push({ name, passed: false, error: error.message });
    console.error(`  FAIL: ${name}`);
    console.error(`    ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertInRange(value, min, max, message) {
  if (value < min || value > max) {
    throw new Error(message || `Expected ${value} to be between ${min} and ${max}`);
  }
}

// ============================================================================
// DICE ROLLING TESTS
// ============================================================================

console.log('=== Dice Rolling Tests ===\n');

test('roll2D6 returns object with dice array and total', () => {
  const result = roll2D6();
  assert(Array.isArray(result.dice), 'dice should be array');
  assertEqual(result.dice.length, 2, 'should have 2 dice');
  assertEqual(typeof result.total, 'number', 'total should be number');
  assertEqual(result.total, result.dice[0] + result.dice[1], 'total should be sum of dice');
});

test('roll2D6 produces valid die values (1-6)', () => {
  for (let i = 0; i < 100; i++) {
    const result = roll2D6();
    assertInRange(result.dice[0], 1, 6, 'first die should be 1-6');
    assertInRange(result.dice[1], 1, 6, 'second die should be 1-6');
    assertInRange(result.total, 2, 12, 'total should be 2-12');
  }
});

test('roll1D6 returns value 1-6', () => {
  for (let i = 0; i < 50; i++) {
    const result = roll1D6();
    assertInRange(result, 1, 6, 'roll should be 1-6');
  }
});

test('rollDamage parses "2d6" correctly', () => {
  const result = rollDamage('2d6');
  assertEqual(result.dice.length, 2, 'should roll 2 dice');
  assertEqual(result.modifier, 0, 'no modifier');
  assertInRange(result.total, 2, 12, 'total should be 2-12');
});

test('rollDamage parses "4d6+2" correctly', () => {
  const result = rollDamage('4d6+2');
  assertEqual(result.dice.length, 4, 'should roll 4 dice');
  assertEqual(result.modifier, 2, 'modifier should be +2');
  assertInRange(result.total, 6, 26, 'total should be 6-26');
});

test('rollDamage parses "1d6-1" correctly', () => {
  const result = rollDamage('1d6-1');
  assertEqual(result.dice.length, 1, 'should roll 1 die');
  assertEqual(result.modifier, -1, 'modifier should be -1');
  assertInRange(result.total, 0, 5, 'total should be 0-5');
});

test('rollDamage handles null/undefined', () => {
  const result = rollDamage(null);
  assertEqual(result.dice.length, 1, 'should default to 1 die');
  assertEqual(result.modifier, 0, 'no modifier');
});

test('rollDamage handles invalid format', () => {
  const result = rollDamage('invalid');
  assertEqual(result.dice.length, 1, 'should fallback to 1 die');
});

// ============================================================================
// RANGE MODIFIER TESTS
// ============================================================================

console.log('\n=== Range Modifier Tests ===\n');

test('RANGE_DM has correct values', () => {
  assertEqual(RANGE_DM.adjacent, 1, 'adjacent should be +1');
  assertEqual(RANGE_DM.close, 0, 'close should be 0');
  assertEqual(RANGE_DM.short, 0, 'short should be 0');
  assertEqual(RANGE_DM.medium, -1, 'medium should be -1');
  assertEqual(RANGE_DM.long, -2, 'long should be -2');
  assertEqual(RANGE_DM.extreme, -4, 'extreme should be -4');
  assertEqual(RANGE_DM.distant, -6, 'distant should be -6');
});

test('getRangeModifier returns correct base modifier', () => {
  assertEqual(getRangeModifier('medium', 'short'), 0, 'short range should be 0');
  assertEqual(getRangeModifier('medium', 'medium'), -1, 'medium range should be -1');
  assertEqual(getRangeModifier('medium', 'long'), -2, 'long range should be -2');
});

test('getRangeModifier gives bonus for long-range weapons at distance', () => {
  const dmLong = getRangeModifier('long', 'long');
  const dmMedium = getRangeModifier('medium', 'long');
  assert(dmLong > dmMedium, 'long-range weapon should have better DM at long range');
});

test('getRangeModifier gives bonus for short-range weapons up close', () => {
  const dmShort = getRangeModifier('short', 'adjacent');
  const dmMedium = getRangeModifier('medium', 'adjacent');
  assert(dmShort > dmMedium, 'short-range weapon should have better DM at adjacent');
});

test('getRangeModifier handles unknown range band', () => {
  const dm = getRangeModifier('medium', 'unknown');
  assertEqual(dm, -4, 'unknown range should default to -4');
});

// ============================================================================
// ATTACK RESOLUTION TESTS
// ============================================================================

console.log('\n=== Attack Resolution Tests ===\n');

test('resolveAttack returns required fields', () => {
  const attacker = { name: 'Player', skills: { gunnery: 0 } };
  const weapon = { name: 'Laser', damage: '2d6', range: 'medium' };
  const target = { name: 'Enemy', range_band: 'short', armor: 0 };

  const result = resolveAttack(attacker, weapon, target);

  assert(typeof result.hit === 'boolean', 'should have hit boolean');
  assert(typeof result.roll === 'number', 'should have roll number');
  assert(Array.isArray(result.dice), 'should have dice array');
  assert(typeof result.total === 'number', 'should have total');
  assert(typeof result.effect === 'number', 'should have effect');
  assert(typeof result.message === 'string', 'should have message');
});

test('resolveAttack includes skill modifier', () => {
  const attacker = { name: 'Expert', skills: { gunnery: 3 } };
  const weapon = { name: 'Laser', damage: '2d6', range: 'medium' };
  const target = { name: 'Enemy', range_band: 'short', armor: 0 };

  const result = resolveAttack(attacker, weapon, target);

  assertEqual(result.modifiers.skill, 3, 'skill modifier should be 3');
});

test('resolveAttack includes range modifier', () => {
  const attacker = { name: 'Player', skills: { gunnery: 0 } };
  const weapon = { name: 'Laser', damage: '2d6', range: 'medium' };
  const target = { name: 'Enemy', range_band: 'long', armor: 0 };

  const result = resolveAttack(attacker, weapon, target);

  assertEqual(result.modifiers.range, -2, 'long range should be -2');
});

test('resolveAttack includes evasive modifier', () => {
  const attacker = { name: 'Player', skills: { gunnery: 0 } };
  const weapon = { name: 'Laser', damage: '2d6', range: 'medium' };
  const target = { name: 'Enemy', range_band: 'short', armor: 0, evasive: true };

  const result = resolveAttack(attacker, weapon, target);

  assertEqual(result.modifiers.evasive, -2, 'evasive should be -2');
});

test('resolveAttack applies armor reduction on hit', () => {
  // Force a hit by using high skill
  const attacker = { name: 'Expert', skills: { gunnery: 10 } };
  const weapon = { name: 'Laser', damage: '2d6', range: 'medium' };
  const target = { name: 'Enemy', range_band: 'short', armor: 4 };

  const result = resolveAttack(attacker, weapon, target);

  if (result.hit) {
    assert(result.armorReduction <= 4, 'armor reduction should not exceed armor value');
    // actualDamage = (dice + effect - armor) × damageMultiple, can exceed raw dice
    assert(result.actualDamage >= 0, 'actual damage should not be negative');
  }
});

test('resolveAttack hit requires total >= 8', () => {
  // Run multiple times to verify hit/miss logic
  let hits = 0;
  let misses = 0;

  for (let i = 0; i < 100; i++) {
    const attacker = { name: 'Player', skills: { gunnery: 0 } };
    const weapon = { name: 'Laser', damage: '2d6', range: 'medium' };
    const target = { name: 'Enemy', range_band: 'short', armor: 0 };

    const result = resolveAttack(attacker, weapon, target);

    if (result.hit) {
      assert(result.total >= 8, 'hit should require total >= 8');
      hits++;
    } else {
      assert(result.total < 8, 'miss should have total < 8');
      misses++;
    }
  }

  // With 2d6 and no modifiers, roughly 58% hit rate (15 out of 36 outcomes >= 8)
  assert(hits > 20, 'should have some hits');
  assert(misses > 20, 'should have some misses');
});

test('resolveAttack calculates effect correctly', () => {
  const attacker = { name: 'Player', skills: { gunnery: 0 } };
  const weapon = { name: 'Laser', damage: '2d6', range: 'medium' };
  const target = { name: 'Enemy', range_band: 'short', armor: 0 };

  const result = resolveAttack(attacker, weapon, target);

  assertEqual(result.effect, result.total - 8, 'effect should be total - 8');
});

test('resolveAttack critical hit on effect 6+', () => {
  // Use very high skill to guarantee effect 6+
  const attacker = { name: 'Expert', skills: { gunnery: 10 } };
  const weapon = { name: 'Laser', damage: '2d6', range: 'medium' };
  const target = { name: 'Enemy', range_band: 'short', armor: 0 };

  const result = resolveAttack(attacker, weapon, target);

  if (result.effect >= 6) {
    assert(result.critical === true, 'effect 6+ should be critical');
    assert(result.criticalEffect !== undefined, 'should have critical effect');
  }
});

// ============================================================================
// CRITICAL HIT TESTS
// ============================================================================

console.log('\n=== Critical Hit Tests ===\n');

test('rollCriticalEffect returns valid effect', () => {
  const result = rollCriticalEffect();

  assert(typeof result.roll === 'number', 'should have roll');
  assertInRange(result.roll, 2, 12, 'roll should be 2-12');
  assert(typeof result.effect === 'string', 'should have effect description');
  assert(typeof result.system === 'string', 'should have system identifier');
});

test('CRITICAL_EFFECTS covers all 2d6 results', () => {
  for (let roll = 2; roll <= 12; roll++) {
    const effect = CRITICAL_EFFECTS.find(e => e.roll === roll);
    assert(effect !== undefined, `should have effect for roll ${roll}`);
  }
});

// ============================================================================
// DAMAGE APPLICATION TESTS
// ============================================================================

console.log('\n=== Damage Application Tests ===\n');

test('applyDamage reduces health correctly', () => {
  const result = applyDamage(100, 100, 25);

  assertEqual(result.health, 75, 'health should be reduced to 75');
  assertEqual(result.damage, 25, 'damage should be 25');
  assertEqual(result.destroyed, false, 'should not be destroyed');
});

test('applyDamage cannot reduce health below 0', () => {
  const result = applyDamage(10, 100, 50);

  assertEqual(result.health, 0, 'health should not go below 0');
  assertEqual(result.destroyed, true, 'should be destroyed');
});

test('applyDamage calculates percent remaining', () => {
  const result = applyDamage(100, 100, 25);

  assertEqual(result.percentRemaining, 75, 'should be 75% remaining');
});

test('checkDestroyed returns true for 0 health', () => {
  assert(checkDestroyed(0) === true, '0 health should be destroyed');
});

test('checkDestroyed returns true for negative health', () => {
  assert(checkDestroyed(-10) === true, 'negative health should be destroyed');
});

test('checkDestroyed returns false for positive health', () => {
  assert(checkDestroyed(1) === false, 'positive health should not be destroyed');
});

// ============================================================================
// POINT DEFENSE TESTS
// ============================================================================

console.log('\n=== Point Defense Tests ===\n');

test('resolvePointDefense returns required fields', () => {
  const defender = { skills: { gunnery: 2 } };
  const missile = { name: 'Missile' };

  const result = resolvePointDefense(defender, missile);

  assert(typeof result.intercepted === 'boolean', 'should have intercepted boolean');
  assert(typeof result.roll === 'number', 'should have roll');
  assert(typeof result.total === 'number', 'should have total');
  assert(typeof result.message === 'string', 'should have message');
});

test('resolvePointDefense uses gunnery skill', () => {
  const defender = { skills: { gunnery: 3 } };
  const missile = { name: 'Missile' };

  const result = resolvePointDefense(defender, missile);

  assertEqual(result.skill, 3, 'should use gunnery skill');
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n==================================================');
console.log(`Total: ${testsPassed + testsFailed} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
console.log('==================================================');

if (testsFailed > 0) {
  console.log('\nFailed tests:');
  testResults.filter(t => !t.passed).forEach(t => {
    console.log(`  - ${t.name}: ${t.error}`);
  });
  process.exit(1);
}
