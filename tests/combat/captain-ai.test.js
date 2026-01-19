/**
 * BATCH 3.B: Combat Captain AI Tests
 *
 * Tests for captain tactical decision-making:
 * - Fight/flee/surrender logic
 * - Fleet strength calculation
 */

const {
  captainDecision,
  calculateFleetStrength,
  DEFAULT_FLEE_THRESHOLD,
  POWER_FLEE_THRESHOLD
} = require('../../lib/combat/captain-ai');

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

function assertApprox(actual, expected, tolerance = 0.01, msg = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${msg} Expected ~${expected}, got ${actual}`);
  }
}

// ==================== Helper Factory ====================

function makeShip(overrides = {}) {
  return {
    hull: 100,
    maxHull: 100,
    power: 100,
    maxPower: 100,
    thrust: 1,
    turrets: [],
    destroyed: false,
    ...overrides
  };
}

function makeBattleState(friendlyOverrides = [{}], enemyOverrides = [{}]) {
  return {
    friendlyFleet: friendlyOverrides.map(o => makeShip(o)),
    enemyFleet: enemyOverrides.map(o => makeShip(o))
  };
}

// ==================== Tests ====================

console.log('\n=== Combat Captain AI Tests ===\n');

// --- 3.B.1: captainDecision exists ---
console.log('--- 3.B.1: Function exports ---\n');

test('captainDecision is exported', () => {
  assertEqual(typeof captainDecision, 'function');
});

test('calculateFleetStrength is exported', () => {
  assertEqual(typeof calculateFleetStrength, 'function');
});

// --- 3.B.2: Low hull triggers flee ---
console.log('\n--- 3.B.2: Low hull triggers flee ---\n');

test('Ship at 25% hull returns flee', () => {
  const ship = makeShip({ hull: 25, maxHull: 100 });
  const battle = makeBattleState([{ hull: 100 }], [{ hull: 100 }]); // Even odds
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'flee');
});

test('Ship at 29% hull returns flee (below 30% threshold)', () => {
  const ship = makeShip({ hull: 29, maxHull: 100 });
  const battle = makeBattleState([{ hull: 100 }], [{ hull: 100 }]);
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'flee');
});

test('Ship at 31% hull with good odds returns fight', () => {
  const ship = makeShip({ hull: 31, maxHull: 100 });
  // Friendly fleet is stronger (2 ships)
  const battle = makeBattleState([{ hull: 100 }, { hull: 100 }], [{ hull: 50 }]);
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'fight');
});

// --- 3.B.3: Low power triggers flee ---
console.log('\n--- 3.B.3: Low power triggers flee ---\n');

test('Ship at 15% power returns flee', () => {
  const ship = makeShip({ hull: 80, power: 15, maxPower: 100 });
  const battle = makeBattleState([{ hull: 100 }], [{ hull: 100 }]);
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'flee');
});

test('Ship at 19% power returns flee', () => {
  const ship = makeShip({ hull: 80, power: 19, maxPower: 100 });
  const battle = makeBattleState([{ hull: 100 }], [{ hull: 100 }]);
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'flee');
});

test('Ship at 25% power with good odds returns fight', () => {
  const ship = makeShip({ hull: 80, power: 25, maxPower: 100 });
  const battle = makeBattleState([{ hull: 100 }, { hull: 100 }], [{ hull: 50 }]);
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'fight');
});

test('Ship with undefined power is treated as full power', () => {
  const ship = { hull: 80, maxHull: 100 }; // No power field
  const battle = makeBattleState([{ hull: 100 }, { hull: 100 }], [{ hull: 50 }]);
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'fight');
});

// --- 3.B.4: Bad odds + damage triggers surrender ---
console.log('\n--- 3.B.4: Bad odds + damage triggers surrender ---\n');

test('Bad odds (<20%) + damaged (<50% hull) returns surrender', () => {
  const ship = makeShip({ hull: 40, maxHull: 100 });
  // 1 friendly vs 5 enemies = ~16% odds
  const battle = makeBattleState(
    [{ hull: 100 }],
    [{ hull: 100 }, { hull: 100 }, { hull: 100 }, { hull: 100 }, { hull: 100 }]
  );
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'surrender');
});

test('Bad odds but not damaged enough returns flee (not surrender)', () => {
  const ship = makeShip({ hull: 60, maxHull: 100 }); // 60% hull > 50% threshold
  const battle = makeBattleState(
    [{ hull: 100 }],
    [{ hull: 100 }, { hull: 100 }, { hull: 100 }, { hull: 100 }, { hull: 100 }]
  );
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'flee');
});

// --- 3.B.5: Good odds returns fight ---
console.log('\n--- 3.B.5: Good odds returns fight ---\n');

test('Even odds (50%) with healthy ship returns fight', () => {
  const ship = makeShip({ hull: 100, maxHull: 100 });
  const battle = makeBattleState([{ hull: 100 }], [{ hull: 100 }]);
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'fight');
});

test('Favorable odds (70%) returns fight', () => {
  const ship = makeShip({ hull: 100, maxHull: 100 });
  const battle = makeBattleState(
    [{ hull: 100 }, { hull: 100 }],
    [{ hull: 80 }]
  );
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'fight');
});

test('Marginal odds (35%) with healthy ship returns fight', () => {
  const ship = makeShip({ hull: 100, maxHull: 100 });
  // About 35% odds
  const battle = makeBattleState(
    [{ hull: 80 }],
    [{ hull: 100 }, { hull: 50 }]
  );
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'fight');
});

// --- 3.B.6: Custom fleeThreshold ---
console.log('\n--- 3.B.6: Custom fleeThreshold (Prize Taker) ---\n');

test('Prize Taker (fleeThreshold: 0.9) flees at 85% hull', () => {
  const ship = makeShip({ hull: 85, maxHull: 100, fleeThreshold: 0.9 });
  const battle = makeBattleState([{ hull: 100 }], [{ hull: 50 }]); // Good odds
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'flee');
});

test('Prize Taker (fleeThreshold: 0.9) flees immediately at 89% hull', () => {
  const ship = makeShip({ hull: 89, maxHull: 100, fleeThreshold: 0.9 });
  const battle = makeBattleState([{ hull: 100 }, { hull: 100 }], [{ hull: 50 }]);
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'flee');
});

test('Prize Taker (fleeThreshold: 0.9) fights at 95% hull', () => {
  const ship = makeShip({ hull: 95, maxHull: 100, fleeThreshold: 0.9 });
  const battle = makeBattleState([{ hull: 100 }, { hull: 100 }], [{ hull: 50 }]);
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'fight');
});

test('Aggressive ship (fleeThreshold: 0.1) fights at 15% hull', () => {
  const ship = makeShip({ hull: 15, maxHull: 100, fleeThreshold: 0.1 });
  const battle = makeBattleState([{ hull: 100 }], [{ hull: 50 }]); // Good odds
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'fight');
});

// --- 3.B.7: calculateFleetStrength ---
console.log('\n--- 3.B.7: Fleet strength calculation ---\n');

test('Single healthy ship returns thrust value', () => {
  const fleet = [makeShip({ hull: 100, maxHull: 100, thrust: 2, turrets: [] })];
  const strength = calculateFleetStrength(fleet);
  // 100% hull * 1.0 weapon mult * 2 thrust = 2
  assertApprox(strength, 2.0);
});

test('Ship with turrets gets weapon bonus', () => {
  const fleet = [makeShip({
    hull: 100, maxHull: 100, thrust: 1,
    turrets: ['laser', 'missile'] // 2 weapons
  })];
  const strength = calculateFleetStrength(fleet);
  // 100% hull * 1.4 (1 + 2*0.2) * 1 thrust = 1.4
  assertApprox(strength, 1.4);
});

test('Damaged ship contributes less', () => {
  const fleet = [makeShip({ hull: 50, maxHull: 100, thrust: 1, turrets: [] })];
  const strength = calculateFleetStrength(fleet);
  // 50% hull * 1.0 * 1 = 0.5
  assertApprox(strength, 0.5);
});

test('Destroyed ship contributes zero', () => {
  const fleet = [makeShip({ hull: 50, maxHull: 100, thrust: 1, destroyed: true })];
  const strength = calculateFleetStrength(fleet);
  assertEqual(strength, 0);
});

test('Multiple ships sum correctly', () => {
  const fleet = [
    makeShip({ hull: 100, maxHull: 100, thrust: 1, turrets: [] }),  // 1.0
    makeShip({ hull: 50, maxHull: 100, thrust: 2, turrets: [] })    // 0.5 * 2 = 1.0
  ];
  const strength = calculateFleetStrength(fleet);
  assertApprox(strength, 2.0);
});

test('Empty fleet returns 0', () => {
  assertEqual(calculateFleetStrength([]), 0);
});

test('Null fleet returns 0', () => {
  assertEqual(calculateFleetStrength(null), 0);
});

test('Undefined fleet returns 0', () => {
  assertEqual(calculateFleetStrength(undefined), 0);
});

// --- Edge cases ---
console.log('\n--- Edge cases ---\n');

test('Ship with zero maxHull returns flee (divide by zero protection)', () => {
  const ship = makeShip({ hull: 0, maxHull: 0 });
  const battle = makeBattleState([{ hull: 100 }], [{ hull: 100 }]);
  const decision = captainDecision(ship, battle);
  // With NaN/Infinity hull percent, should default to flee
  assertEqual(decision, 'flee');
});

test('Battle with no enemies treats odds as favorable', () => {
  const ship = makeShip({ hull: 100, maxHull: 100 });
  const battle = { friendlyFleet: [makeShip()], enemyFleet: [] };
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'fight');
});

test('Battle with no friendlies treats odds as unfavorable', () => {
  const ship = makeShip({ hull: 100, maxHull: 100 });
  const battle = { friendlyFleet: [], enemyFleet: [makeShip()] };
  const decision = captainDecision(ship, battle);
  assertEqual(decision, 'flee');
});

// ==================== Summary ====================

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}
