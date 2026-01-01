/**
 * AR-226: Missile Mechanics Unit Tests (Mongoose Traveller 2e)
 *
 * Tests the corrected missile implementation:
 * - Flight time table (not 1 band/turn)
 * - Cannot launch at Adjacent/Close
 * - Point defense only on arrival turn
 * - Cumulative -1 DM per PD attempt
 * - Turret bonuses (+1 double, +2 triple)
 * - Smart missiles persist until destroyed
 * - ECM warfare against missiles
 */

const {
  MissileTracker,
  getMissileRangeBonus,
  canLaunchMissile,
  getFlightTime,
  MISSILE_FLIGHT_TIME,
  BLOCKED_LAUNCH_RANGES
} = require('../../lib/weapons/missiles');

console.log('========================================');
console.log('AR-226: MISSILE MECHANICS TESTS');
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
// AR-226.1: Flight Time Table
// ========================================

console.log('AR-226.1 Flight Time Table (6 tests):\n');

test('1.1: Short range = 1 turn flight time', () => {
  assert(getFlightTime('short') === 1, 'Short should be 1 turn');
});

test('1.2: Medium range = 1 turn flight time', () => {
  assert(getFlightTime('medium') === 1, 'Medium should be 1 turn');
});

test('1.3: Long range = 2 turns flight time', () => {
  assert(getFlightTime('long') === 2, 'Long should be 2 turns');
});

test('1.4: Very Long range = 5 turns flight time', () => {
  assert(getFlightTime('very_long') === 5, 'Very Long should be 5 turns');
});

test('1.5: Distant range = 10 turns flight time', () => {
  assert(getFlightTime('distant') === 10, 'Distant should be 10 turns');
});

test('1.6: Missile tracks arrival round correctly', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'long',
    round: 3
  });

  assert(missile.launchRound === 3, 'Should record launch round');
  assert(missile.flightTime === 2, 'Long range = 2 turn flight');
  assert(missile.arrivalRound === 5, 'Should arrive round 3 + 2 = 5');
});

// ========================================
// AR-226.2: Adjacent/Close Launch Block
// ========================================

console.log('\nAR-226.2 Adjacent/Close Block (5 tests):\n');

test('2.1: Cannot launch at adjacent range', () => {
  assert(canLaunchMissile('adjacent') === false, 'Adjacent should be blocked');
});

test('2.2: Cannot launch at close range', () => {
  assert(canLaunchMissile('close') === false, 'Close should be blocked');
});

test('2.3: Can launch at short range', () => {
  assert(canLaunchMissile('short') === true, 'Short should be allowed');
});

test('2.4: Tracker returns error for blocked range', () => {
  const tracker = new MissileTracker();
  const result = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'adjacent',
    round: 1
  });

  assert(result.error === true, 'Should return error');
  assert(result.reason.includes('too close'), 'Should explain reason');
});

test('2.5: BLOCKED_LAUNCH_RANGES constant is correct', () => {
  assert(BLOCKED_LAUNCH_RANGES.includes('adjacent'), 'Should include adjacent');
  assert(BLOCKED_LAUNCH_RANGES.includes('close'), 'Should include close');
  assert(!BLOCKED_LAUNCH_RANGES.includes('short'), 'Should not include short');
});

// ========================================
// AR-226.3: Smart Missiles
// ========================================

console.log('\nAR-226.3 Smart Missiles (4 tests):\n');

test('3.1: Smart missile flag is tracked', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'medium',
    round: 1,
    isSmart: true
  });

  assert(missile.isSmart === true, 'Should track smart flag');
});

test('3.2: Smart missiles always need 8+ to hit', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'short',
    round: 1,
    isSmart: true,
    gunneryEffect: 6  // Would normally reduce target number
  });

  // Move to arrival round
  tracker.updateMissiles(2);

  // Try multiple times to verify target is always 8
  let foundTargetNumber = false;
  for (let i = 0; i < 20; i++) {
    const m = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1,
      isSmart: true,
      gunneryEffect: 6
    });
    tracker.updateMissiles(2);
    const result = tracker.resolveMissileImpact(m.id);
    if (result.targetNumber === 8) {
      foundTargetNumber = true;
      break;
    }
  }

  assert(foundTargetNumber, 'Smart missiles should use target 8 regardless of gunnery');
});

test('3.3: Normal missile target improves with gunnery', () => {
  const tracker = new MissileTracker();

  // High gunnery effect should reduce target number
  let foundReducedTarget = false;
  for (let i = 0; i < 20; i++) {
    const m = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1,
      isSmart: false,
      gunneryEffect: 6
    });
    tracker.updateMissiles(2);
    const result = tracker.resolveMissileImpact(m.id);
    if (result.targetNumber < 8) {
      foundReducedTarget = true;
      break;
    }
  }

  assert(foundReducedTarget, 'Normal missiles should have reduced target with high gunnery');
});

test('3.4: Smart missile persists on miss', () => {
  const tracker = new MissileTracker();

  // Try to get a miss on a smart missile
  let foundPersist = false;
  for (let i = 0; i < 50; i++) {
    const m = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1,
      isSmart: true
    });
    tracker.updateMissiles(2);
    const result = tracker.resolveMissileImpact(m.id, 5);  // High dodge
    if (!result.hit && result.smartPersist) {
      foundPersist = true;
      assert(m.status === 'tracking', 'Smart missile should still be tracking');
      assert(m.arrivalRound === 3, 'Should attack again next round');
      break;
    }
  }

  assert(foundPersist, 'Smart missiles should persist on miss');
});

// ========================================
// AR-226.4: Point Defense Timing
// ========================================

console.log('\nAR-226.4 Point Defense Timing (4 tests):\n');

test('4.1: Cannot PD missile before arrival', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'long',  // 2 turn flight
    round: 1
  });

  // Try PD on round 2 (arrives round 3)
  const result = tracker.pointDefense(missile.id, { round: 2 });

  assert(result.success === false, 'Should fail');
  assert(result.reason === 'missile_not_arrived', 'Should explain timing');
  assert(result.turnsRemaining === 1, 'Should show turns remaining');
});

test('4.2: Can PD missile on arrival round', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'short',  // 1 turn flight, arrives round 2
    round: 1
  });

  tracker.updateMissiles(2);
  const result = tracker.pointDefense(missile.id, { gunnerSkill: 3, round: 2 });

  assert(result.success === true, 'Should allow PD on arrival');
});

test('4.3: getArrivingMissiles only returns arrived', () => {
  const tracker = new MissileTracker();

  // Launch at different ranges
  tracker.launchMissile({ attackerId: 's1', defenderId: 'target', currentRange: 'short', round: 1 });   // arrives r2
  tracker.launchMissile({ attackerId: 's2', defenderId: 'target', currentRange: 'medium', round: 1 });  // arrives r2
  tracker.launchMissile({ attackerId: 's3', defenderId: 'target', currentRange: 'long', round: 1 });    // arrives r3

  tracker.updateMissiles(2);
  const arriving = tracker.getArrivingMissiles('target', 2);

  assert(arriving.length === 2, 'Should only get 2 missiles arriving at round 2');
});

test('4.4: Arriving flag set correctly', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'short',
    round: 1
  });

  const updates = tracker.updateMissiles(2);
  const arrivingUpdate = updates.find(u => u.action === 'arriving');

  assert(arrivingUpdate, 'Should have arriving update');
  assert(missile.arriving === true, 'Missile should be marked arriving');
});

// ========================================
// AR-226.5: Cumulative PD Penalty
// ========================================

console.log('\nAR-226.5 Cumulative PD Penalty (3 tests):\n');

test('5.1: First PD attempt has no penalty', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'short',
    round: 1
  });
  tracker.updateMissiles(2);

  const result = tracker.pointDefense(missile.id, {
    gunnerSkill: 2,
    gunnerId: 'gunner1',
    round: 2
  });

  assert(result.modifiers.cumulativePenalty === 0, 'First attempt should have no penalty');
  assert(result.modifiers.attemptNumber === 1, 'Should be attempt 1');
});

test('5.2: Second PD attempt has -1 penalty', () => {
  const tracker = new MissileTracker();

  const m1 = tracker.launchMissile({ attackerId: 's1', defenderId: 'target', currentRange: 'short', round: 1 });
  const m2 = tracker.launchMissile({ attackerId: 's2', defenderId: 'target', currentRange: 'short', round: 1 });
  tracker.updateMissiles(2);

  tracker.pointDefense(m1.id, { gunnerSkill: 2, gunnerId: 'gunner1', round: 2 });
  const result = tracker.pointDefense(m2.id, { gunnerSkill: 2, gunnerId: 'gunner1', round: 2 });

  assert(result.modifiers.cumulativePenalty === -1, 'Second attempt should have -1 penalty');
  assert(result.modifiers.attemptNumber === 2, 'Should be attempt 2');
});

test('5.3: Penalty resets each round', () => {
  const tracker = new MissileTracker();

  const m1 = tracker.launchMissile({ attackerId: 's1', defenderId: 'target', currentRange: 'short', round: 1 });
  tracker.updateMissiles(2);
  tracker.pointDefense(m1.id, { gunnerSkill: 2, gunnerId: 'gunner1', round: 2 });

  // New round
  const m2 = tracker.launchMissile({ attackerId: 's2', defenderId: 'target', currentRange: 'short', round: 2 });
  tracker.updateMissiles(3);  // This resets PD counters
  const result = tracker.pointDefense(m2.id, { gunnerSkill: 2, gunnerId: 'gunner1', round: 3 });

  assert(result.modifiers.cumulativePenalty === 0, 'Penalty should reset each round');
});

// ========================================
// AR-226.6: Turret PD Bonuses
// ========================================

console.log('\nAR-226.6 Turret PD Bonuses (3 tests):\n');

test('6.1: Single turret gives no bonus', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'short',
    round: 1
  });
  tracker.updateMissiles(2);

  const result = tracker.pointDefense(missile.id, {
    gunnerSkill: 2,
    turretSize: 1,
    round: 2
  });

  assert(result.modifiers.turretBonus === 0, 'Single turret = 0 bonus');
});

test('6.2: Double turret gives +1 bonus', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'short',
    round: 1
  });
  tracker.updateMissiles(2);

  const result = tracker.pointDefense(missile.id, {
    gunnerSkill: 2,
    turretSize: 2,
    round: 2
  });

  assert(result.modifiers.turretBonus === 1, 'Double turret = +1 bonus');
});

test('6.3: Triple turret gives +2 bonus', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'short',
    round: 1
  });
  tracker.updateMissiles(2);

  const result = tracker.pointDefense(missile.id, {
    gunnerSkill: 2,
    turretSize: 3,
    round: 2
  });

  assert(result.modifiers.turretBonus === 2, 'Triple turret = +2 bonus');
});

// ========================================
// AR-226.7: ECM Against Missiles
// ========================================

console.log('\nAR-226.7 ECM Warfare (5 tests):\n');

test('7.1: ECM can jam missiles', () => {
  const tracker = new MissileTracker();

  let jammed = false;
  for (let i = 0; i < 30; i++) {
    const m = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1
    });
    const result = tracker.electronicWarfare(m.id, 3);
    if (result.jammed) {
      jammed = true;
      assert(m.status === 'jammed', 'Missile should be jammed');
      break;
    }
  }

  assert(jammed, 'ECM should eventually jam a missile');
});

test('7.2: ECM can only be attempted once per salvo', () => {
  const tracker = new MissileTracker();
  const missile = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'short',
    round: 1
  });

  tracker.electronicWarfare(missile.id, 2);
  const result = tracker.electronicWarfare(missile.id, 2);

  assert(result.success === false, 'Should fail second ECM attempt');
  assert(result.reason === 'ecm_already_attempted', 'Should explain reason');
});

test('7.3: Smart missiles can resist ECM', () => {
  const tracker = new MissileTracker();

  let resisted = false;
  for (let i = 0; i < 50; i++) {
    const m = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1,
      isSmart: true
    });
    const result = tracker.electronicWarfare(m.id, 3);
    if (result.success && !result.jammed && result.smartResist) {
      resisted = true;
      assert(m.status === 'tracking', 'Smart missile should still track');
      break;
    }
  }

  assert(resisted, 'Smart missiles should sometimes resist ECM');
});

test('7.4: ECM target number is 8', () => {
  const tracker = new MissileTracker();

  let confirmed = false;
  for (let i = 0; i < 30; i++) {
    const m = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1
    });
    const result = tracker.electronicWarfare(m.id, 0);
    if (result.total >= 8 && result.jammed) {
      confirmed = true;
      break;
    }
    if (result.total < 8 && !result.jammed) {
      confirmed = true;
      break;
    }
  }

  assert(confirmed, 'ECM should use target 8');
});

test('7.5: Sensor skill improves ECM', () => {
  const tracker = new MissileTracker();

  let skill0Jams = 0;
  let skill3Jams = 0;

  for (let i = 0; i < 30; i++) {
    const m1 = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1
    });
    const r1 = tracker.electronicWarfare(m1.id, 0);
    if (r1.jammed) skill0Jams++;

    const m2 = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1
    });
    const r2 = tracker.electronicWarfare(m2.id, 3);
    if (r2.jammed) skill3Jams++;
  }

  assert(skill3Jams >= skill0Jams, 'Higher sensor skill should jam more');
});

// ========================================
// Missile Range Bonus (unchanged from before)
// ========================================

console.log('\nMissile Range Bonus (4 tests):\n');

test('8.1: No bonus at short range', () => {
  assert(getMissileRangeBonus('short') === 0, 'No bonus at short');
});

test('8.2: No bonus at medium range', () => {
  assert(getMissileRangeBonus('medium') === 0, 'No bonus at medium');
});

test('8.3: +2 bonus at long range', () => {
  assert(getMissileRangeBonus('long') === 2, '+2 at long');
});

test('8.4: +2 bonus at very long and distant', () => {
  assert(getMissileRangeBonus('very_long') === 2, '+2 at very long');
  assert(getMissileRangeBonus('distant') === 2, '+2 at distant');
});

// ========================================
// Missile Impact and Damage
// ========================================

console.log('\nMissile Impact (4 tests):\n');

test('9.1: Missile deals 4D6 damage on hit', () => {
  const tracker = new MissileTracker();

  let foundHit = false;
  for (let i = 0; i < 30; i++) {
    const m = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1
    });
    tracker.updateMissiles(2);
    const result = tracker.resolveMissileImpact(m.id, 0);
    if (result.hit) {
      foundHit = true;
      assert(result.damageRoll.length === 4, 'Should roll 4 dice');
      assert(result.damage >= 4 && result.damage <= 24, 'Damage should be 4-24');
      break;
    }
  }

  assert(foundHit, 'Should eventually hit');
});

test('9.2: Impact sets status to impacted', () => {
  const tracker = new MissileTracker();

  for (let i = 0; i < 30; i++) {
    const m = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1
    });
    tracker.updateMissiles(2);
    const result = tracker.resolveMissileImpact(m.id, 0);
    if (result.hit) {
      assert(m.status === 'impacted', 'Status should be impacted');
      break;
    }
  }
});

test('9.3: Dodge DM reduces hit chance', () => {
  const tracker = new MissileTracker();

  let hits0 = 0;
  let hits5 = 0;

  for (let i = 0; i < 30; i++) {
    const m1 = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1
    });
    tracker.updateMissiles(2);
    if (tracker.resolveMissileImpact(m1.id, 0).hit) hits0++;

    const m2 = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1
    });
    tracker.updateMissiles(2);
    if (tracker.resolveMissileImpact(m2.id, 5).hit) hits5++;
  }

  assert(hits0 > hits5, 'Higher dodge should reduce hits');
});

test('9.4: Normal missile miss sets status to missed', () => {
  const tracker = new MissileTracker();

  for (let i = 0; i < 50; i++) {
    const m = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1,
      isSmart: false
    });
    tracker.updateMissiles(2);
    const result = tracker.resolveMissileImpact(m.id, 6);  // High dodge
    if (!result.hit) {
      assert(m.status === 'missed', 'Normal missile should miss permanently');
      break;
    }
  }
});

// ========================================
// Tracker State Management
// ========================================

console.log('\nTracker State (3 tests):\n');

test('10.1: getState returns correct counts', () => {
  const tracker = new MissileTracker();

  tracker.launchMissile({ attackerId: 's1', defenderId: 'target', currentRange: 'short', round: 1 });
  tracker.launchMissile({ attackerId: 's2', defenderId: 'target', currentRange: 'medium', round: 1 });

  const state = tracker.getState();
  assert(state.activeMissiles === 2, 'Should show 2 active');
  assert(state.totalMissiles === 2, 'Should show 2 total');
});

test('10.2: getMissilesTargeting filters correctly', () => {
  const tracker = new MissileTracker();

  tracker.launchMissile({ attackerId: 's1', defenderId: 'target1', currentRange: 'short', round: 1 });
  tracker.launchMissile({ attackerId: 's2', defenderId: 'target1', currentRange: 'short', round: 1 });
  tracker.launchMissile({ attackerId: 's3', defenderId: 'target2', currentRange: 'short', round: 1 });

  const t1 = tracker.getMissilesTargeting('target1');
  const t2 = tracker.getMissilesTargeting('target2');

  assert(t1.length === 2, '2 missiles targeting target1');
  assert(t2.length === 1, '1 missile targeting target2');
});

test('10.3: cleanup removes old missiles', () => {
  const tracker = new MissileTracker();
  const m = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'short',
    round: 1
  });
  tracker.updateMissiles(2);

  // Simulate impact and age
  tracker.resolveMissileImpact(m.id, 0);
  m.turnsInFlight = 15;

  tracker.cleanup();

  const state = tracker.getState();
  assert(state.totalMissiles === 0, 'Old missiles should be cleaned');
});

// ========================================
// AR-226.8: Nuclear Missiles
// ========================================

console.log('\nAR-226.8 Nuclear Missiles (5 tests):\n');

test('11.1: Can launch nuclear missile', () => {
  const tracker = new MissileTracker();
  const m = tracker.launchMissile({
    attackerId: 'ship1',
    defenderId: 'ship2',
    currentRange: 'medium',
    round: 1,
    missileType: 'nuclear'
  });

  assert(!m.error, 'Should launch successfully');
  assert(m.missileType === 'nuclear', 'Should track missile type');
  assert(m.isNuclear === true, 'Should flag as nuclear');
});

test('11.2: Nuclear missile has radiation result on hit', () => {
  const tracker = new MissileTracker();

  let foundRadiation = false;
  for (let i = 0; i < 30; i++) {
    const m = tracker.launchMissile({
      attackerId: 'ship1',
      defenderId: 'ship2',
      currentRange: 'short',
      round: 1,
      missileType: 'nuclear'
    });
    tracker.updateMissiles(2);
    const result = tracker.resolveMissileImpact(m.id, 0, { armor: 2 });
    if (result.hit && result.isNuclear) {
      foundRadiation = true;
      assert(result.radiationResult, 'Should have radiation result');
      break;
    }
  }

  assert(foundRadiation, 'Should eventually hit and have radiation result');
});

test('11.3: Armor 8+ blocks radiation', () => {
  const { checkRadiationDamage } = require('../../lib/weapons/missiles');
  const result = checkRadiationDamage(8);
  assert(result.applies === false, 'Armor 8 should block radiation');
  assert(result.reason.includes('Armor 8+'), 'Should explain why blocked');
});

test('11.4: Nuclear damper blocks radiation', () => {
  const { checkRadiationDamage } = require('../../lib/weapons/missiles');
  const result = checkRadiationDamage(4, true);
  assert(result.applies === false, 'Nuclear damper should block radiation');
});

test('11.5: MISSILE_TYPES has nuclear type', () => {
  const { MISSILE_TYPES } = require('../../lib/weapons/missiles');
  assert(MISSILE_TYPES.nuclear, 'Should have nuclear type');
  assert(MISSILE_TYPES.nuclear.radiation === true, 'Nuclear should have radiation');
  assert(MISSILE_TYPES.nuclear.legal === false, 'Nuclear should be illegal');
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
