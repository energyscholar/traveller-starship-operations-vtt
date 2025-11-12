/**
 * Missile Mechanics Unit Tests
 * Stage 11: Test missile tracking, movement, point defense
 */

const { MissileTracker, getMissileRangeBonus, canLaunchMissile } = require('../../lib/weapons/missiles');

console.log('========================================');
console.log('MISSILE MECHANICS UNIT TESTS');
console.log('========================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${description}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ========================================
// Missile Launch Tests
// ========================================

console.log('Missile Launch (5 tests):\n');

test('1.1: Can launch missile from any range', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'player1',
    defenderId: 'player2',
    currentRange: 'distant',
    round: 1
  });

  assert(missile.id, 'Missile should have ID');
  assert(missile.attacker === 'player1', 'Missile should track attacker');
  assert(missile.target === 'player2', 'Missile should track target');
  assert(missile.currentRange === 'distant', 'Missile should start at launch range');
  assert(missile.status === 'tracking', 'Missile should be tracking');
});

test('1.2: Missile IDs are unique', () => {
  const tracker = new MissileTracker();
  const m1 = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'long', round: 1 });
  const m2 = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'long', round: 1 });

  assert(m1.id !== m2.id, 'Each missile should have unique ID');
});

test('1.3: Missile tracks launch round', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'p1',
    defenderId: 'p2',
    currentRange: 'medium',
    round: 5
  });

  assert(missile.launchRound === 5, 'Missile should remember launch round');
  assert(missile.turnsInFlight === 0, 'Missile starts with 0 turns in flight');
});

test('1.4: Can launch at all ranges', () => {
  assert(canLaunchMissile('adjacent'), 'Can launch at adjacent');
  assert(canLaunchMissile('close'), 'Can launch at close');
  assert(canLaunchMissile('short'), 'Can launch at short');
  assert(canLaunchMissile('medium'), 'Can launch at medium');
  assert(canLaunchMissile('long'), 'Can launch at long');
  assert(canLaunchMissile('very_long'), 'Can launch at very long');
  assert(canLaunchMissile('distant'), 'Can launch at distant');
});

test('1.5: Missile range bonus at long ranges', () => {
  assert(getMissileRangeBonus('adjacent') === 0, 'No bonus at adjacent');
  assert(getMissileRangeBonus('close') === 0, 'No bonus at close');
  assert(getMissileRangeBonus('short') === 0, 'No bonus at short');
  assert(getMissileRangeBonus('medium') === 0, 'No bonus at medium');
  assert(getMissileRangeBonus('long') === 2, '+2 bonus at long');
  assert(getMissileRangeBonus('very_long') === 2, '+2 bonus at very long');
  assert(getMissileRangeBonus('distant') === 2, '+2 bonus at distant');
});

// ========================================
// Missile Movement Tests
// ========================================

console.log('\nMissile Movement (6 tests):\n');

test('2.1: Missile moves 1 range band per round', () => {
  const tracker = new MissileTracker();
  tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'medium', round: 1 });

  const updates = tracker.updateMissiles(2);
  const missile = Array.from(tracker.missiles.values())[0];

  assert(missile.currentRange === 'short', 'Missile should move from medium to short');
  assert(missile.turnsInFlight === 1, 'Missile should have 1 turn in flight');
});

test('2.2: Missile moves through all range bands', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'long', round: 1 });

  // Round 2: long → medium
  tracker.updateMissiles(2);
  assert(missile.currentRange === 'medium', 'Round 2: Should be at medium');

  // Round 3: medium → short
  tracker.updateMissiles(3);
  assert(missile.currentRange === 'short', 'Round 3: Should be at short');

  // Round 4: short → close
  tracker.updateMissiles(4);
  assert(missile.currentRange === 'close', 'Round 4: Should be at close');

  // Round 5: close → adjacent
  tracker.updateMissiles(5);
  assert(missile.currentRange === 'adjacent', 'Round 5: Should be at adjacent');
});

test('2.3: Missile from distant takes 6 rounds', () => {
  const tracker = new MissileTracker();
  tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'distant', round: 1 });

  // distant → very_long → long → medium → short → close → adjacent
  for (let round = 2; round <= 7; round++) {
    tracker.updateMissiles(round);
  }

  const missile = Array.from(tracker.missiles.values())[0];
  assert(missile.currentRange === 'adjacent', 'Should reach adjacent after 6 rounds');
  assert(missile.turnsInFlight === 6, 'Should have 6 turns in flight');
});

test('2.4: Update returns movement info', () => {
  const tracker = new MissileTracker();
  tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'short', round: 1 });

  const updates = tracker.updateMissiles(2);

  assert(updates.length > 0, 'Should return updates');
  assert(updates[0].action === 'moved', 'Update should indicate movement');
});

test('2.5: Impact detected at adjacent range', () => {
  const tracker = new MissileTracker();
  tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'close', round: 1 });

  const updates = tracker.updateMissiles(2);

  const impactUpdate = updates.find(u => u.action === 'impact');
  assert(impactUpdate, 'Should detect impact when reaching adjacent');
});

test('2.6: Missile stops at adjacent', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'adjacent', round: 1 });

  tracker.updateMissiles(2);
  tracker.updateMissiles(3);

  assert(missile.currentRange === 'adjacent', 'Missile should stay at adjacent');
});

// ========================================
// Point Defense Tests
// ========================================

console.log('\nPoint Defense (8 tests):\n');

test('3.1: Point defense requires gunner skill check', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'long', round: 1 });

  const result = tracker.pointDefense(missile.id, {}, 0);

  assert(result.success, 'Point defense should attempt');
  assert(result.hasOwnProperty('destroyed'), 'Should indicate if destroyed');
  assert(result.roll, 'Should include dice roll');
  assert(result.total !== undefined, 'Should include total');
});

test('3.2: Point defense with high skill more likely to succeed', () => {
  const tracker = new MissileTracker();
  let successes = 0;

  // Run 20 trials with Gunner-3 skill
  for (let i = 0; i < 20; i++) {
    const m = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'long', round: 1 });
    const result = tracker.pointDefense(m.id, {}, 3);
    if (result.destroyed) successes++;
  }

  // With +3 skill and target 8, expect ~70-80% success rate
  assert(successes >= 10, `Expected high success rate with skill 3, got ${successes}/20`);
});

test('3.3: Point defense destroys missile on hit', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'long', round: 1 });

  // Keep trying until we get a hit (or max 50 tries)
  let destroyed = false;
  for (let i = 0; i < 50; i++) {
    const m = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'long', round: 1 });
    const result = tracker.pointDefense(m.id, {}, 5);
    if (result.destroyed) {
      destroyed = true;
      assert(m.status === 'destroyed', 'Missile status should be destroyed');
      break;
    }
  }

  assert(destroyed, 'Should eventually destroy a missile with skill 5');
});

test('3.4: Cannot point defense non-existent missile', () => {
  const tracker = new MissileTracker();
  const result = tracker.pointDefense('fake_missile_id', {}, 2);

  assert(!result.success, 'Should fail for non-existent missile');
  assert(result.reason === 'missile_not_found', 'Should give correct error');
});

test('3.5: Cannot point defense already destroyed missile', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'long', round: 1 });

  missile.status = 'destroyed';
  const result = tracker.pointDefense(missile.id, {}, 2);

  assert(!result.success, 'Should fail for destroyed missile');
  assert(result.reason === 'missile_not_active', 'Should give correct error');
});

test('3.6: Point defense target number is 8', () => {
  const tracker = new MissileTracker();

  let hits = 0;
  let misses = 0;

  // Run many trials with skill 0 to verify 8+ threshold
  for (let i = 0; i < 100; i++) {
    const m = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'long', round: 1 });
    const result = tracker.pointDefense(m.id, {}, 0);

    if (result.destroyed && result.total >= 8) hits++;
    if (!result.destroyed && result.total < 8) misses++;
  }

  // Should see consistent pattern: hit when total >= 8, miss when < 8
  assert(hits + misses >= 80, 'Target number 8 should be consistent');
});

test('3.7: Gunner skill improves point defense', () => {
  const tracker = new MissileTracker();

  const testSkill = (skill) => {
    let successes = 0;
    for (let i = 0; i < 30; i++) {
      const m = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'long', round: 1 });
      const result = tracker.pointDefense(m.id, {}, skill);
      if (result.destroyed) successes++;
    }
    return successes;
  };

  const skill0 = testSkill(0);
  const skill3 = testSkill(3);

  assert(skill3 > skill0, `Skill 3 (${skill3}/30) should have more successes than skill 0 (${skill0}/30)`);
});

test('3.8: Get missiles targeting specific ship', () => {
  const tracker = new MissileTracker();

  tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'long', round: 1 });
  tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'medium', round: 1 });
  tracker.launchMissile({ attackerId: 'p2', defenderId: 'p1', currentRange: 'short', round: 1 });

  const targetingP2 = tracker.getMissilesTargeting('p2');
  const targetingP1 = tracker.getMissilesTargeting('p1');

  assert(targetingP2.length === 2, 'Should find 2 missiles targeting p2');
  assert(targetingP1.length === 1, 'Should find 1 missile targeting p1');
});

// ========================================
// Missile Impact Tests
// ========================================

console.log('\nMissile Impact (5 tests):\n');

test('4.1: Missile deals 4D6 damage', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'adjacent', round: 1 });

  const result = tracker.resolveMissileImpact(missile.id);

  assert(result.hit, 'Missile should hit');
  assert(result.damageRoll.length === 4, 'Should roll 4 dice');
  assert(result.damage >= 4 && result.damage <= 24, 'Damage should be 4-24');
});

test('4.2: Missile automatically hits (no attack roll)', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'adjacent', round: 1 });

  const result = tracker.resolveMissileImpact(missile.id);

  assert(result.hit, 'Missiles always hit');
  assert(!result.attackRoll, 'No attack roll needed');
});

test('4.3: Impact changes missile status', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'adjacent', round: 1 });

  tracker.resolveMissileImpact(missile.id);

  assert(missile.status === 'impacted', 'Missile status should be impacted');
});

test('4.4: Cannot impact non-tracking missile', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'adjacent', round: 1 });

  missile.status = 'destroyed';
  const result = tracker.resolveMissileImpact(missile.id);

  assert(!result.hit, 'Destroyed missile cannot impact');
  assert(result.reason === 'missile_not_active', 'Should give correct error');
});

test('4.5: Damage varies (dice rolls are random)', () => {
  const tracker = new MissileTracker();
  const damages = [];

  for (let i = 0; i < 10; i++) {
    const m = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'adjacent', round: 1 });
    const result = tracker.resolveMissileImpact(m.id);
    damages.push(result.damage);
  }

  const uniqueDamages = new Set(damages);
  assert(uniqueDamages.size > 1, 'Damage should vary across rolls');
});

// ========================================
// Missile Tracker State Tests
// ========================================

console.log('\nMissile Tracker State (3 tests):\n');

test('5.1: Tracker maintains missile count', () => {
  const tracker = new MissileTracker();

  tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'long', round: 1 });
  tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'medium', round: 1 });

  const state = tracker.getState();
  assert(state.activeMissiles === 2, 'Should track 2 active missiles');
  assert(state.totalMissiles === 2, 'Should track 2 total missiles');
});

test('5.2: Cleanup removes old missiles', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'adjacent', round: 1 });

  tracker.resolveMissileImpact(missile.id);
  missile.turnsInFlight = 15; // Old missile

  tracker.cleanup();

  const state = tracker.getState();
  assert(state.totalMissiles === 0, 'Old missiles should be cleaned up');
});

test('5.3: Recent impacted missiles kept for logging', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({ attackerId: 'p1', defenderId: 'p2', currentRange: 'adjacent', round: 1 });

  tracker.resolveMissileImpact(missile.id);
  missile.turnsInFlight = 2; // Recent missile

  tracker.cleanup();

  const state = tracker.getState();
  assert(state.totalMissiles === 1, 'Recent impacted missiles should be kept');
});

// ========================================
// Summary
// ========================================

console.log('\n========================================');
console.log('TEST SUMMARY');
console.log('========================================');
console.log(`Total tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log('========================================\n');

if (testsFailed > 0) {
  process.exit(1);
}
