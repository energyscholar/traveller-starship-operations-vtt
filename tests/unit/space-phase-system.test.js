// Space Combat Phase System Tests
// Covers initiative, phase sequencing, and action economy
// Based on PHASE-SYSTEM-USE-CASES.md

const {
  calculateInitiative,
  allocateThrust,
  canActInPhase,
  canFireWeapon,
  canUsePointDefense,
  resetRoundFlags,
  getCurrentPhase,
  advancePhase,
  getInitiativeOrder
} = require('../../lib/combat');

console.log('========================================');
console.log('SPACE COMBAT PHASE SYSTEM TESTS');
console.log('========================================\n');

let passCount = 0;
let failCount = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passCount++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  ${error.message}`);
    failCount++;
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true');
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertDeepEqual(actual, expected, message = '') {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`);
  }
}

// ============================================================
// USE CASE 1: INITIATIVE CALCULATION (10 tests)
// ============================================================
console.log('--- USE CASE 1: Initiative Calculation (10 tests) ---\n');

test('Initiative: 2d6 + pilot skill + thrust', () => {
  const init = calculateInitiative({ pilotSkill: 2, thrust: 2 }, [3, 4]); // Fixed dice roll
  assertEqual(init, 11, 'Initiative should be 7 (dice) + 2 (pilot) + 2 (thrust) = 11');
});

test('Initiative: Minimum value (snake eyes)', () => {
  const init = calculateInitiative({ pilotSkill: 0, thrust: 0 }, [1, 1]);
  assertEqual(init, 2, 'Minimum initiative should be 2');
});

test('Initiative: Maximum theoretical value', () => {
  const init = calculateInitiative({ pilotSkill: 5, thrust: 6 }, [6, 6]);
  assertEqual(init, 23, 'Maximum initiative: 12 + 5 + 6 = 23');
});

test('Initiative: No pilot skill bonus', () => {
  const init = calculateInitiative({ pilotSkill: 0, thrust: 2 }, [4, 3]);
  assertEqual(init, 9, 'Initiative with no skill: 7 + 0 + 2 = 9');
});

test('Initiative: No thrust bonus', () => {
  const init = calculateInitiative({ pilotSkill: 2, thrust: 0 }, [5, 2]);
  assertEqual(init, 9, 'Initiative with no thrust: 7 + 2 + 0 = 9');
});

test('Initiative: Negative pilot skill (DM-1)', () => {
  const init = calculateInitiative({ pilotSkill: -1, thrust: 2 }, [4, 4]);
  assertEqual(init, 9, 'Initiative with negative skill: 8 - 1 + 2 = 9');
});

test('Initiative: High skill compensates for low thrust', () => {
  const init = calculateInitiative({ pilotSkill: 4, thrust: 1 }, [3, 3]);
  assertEqual(init, 11, 'High skill + low thrust: 6 + 4 + 1 = 11');
});

test('Initiative: Low skill compensated by high thrust', () => {
  const init = calculateInitiative({ pilotSkill: 1, thrust: 5 }, [2, 2]);
  assertEqual(init, 10, 'Low skill + high thrust: 4 + 1 + 5 = 10');
});

test('Initiative: Average values', () => {
  const init = calculateInitiative({ pilotSkill: 1, thrust: 1 }, [4, 3]);
  assertEqual(init, 9, 'Average initiative: 7 + 1 + 1 = 9');
});

test('Initiative: Randomness check (without fixed dice)', () => {
  const init = calculateInitiative({ pilotSkill: 2, thrust: 2 });
  assertTrue(init >= 6 && init <= 16, `Initiative should be between 6 and 16, got ${init}`);
});

// ============================================================
// USE CASE 2: INITIATIVE ORDERING (10 tests)
// ============================================================
console.log('\n--- USE CASE 2: Initiative Ordering (10 tests) ---\n');

test('Order: Two ships, different initiative', () => {
  const ships = [
    { id: 'scout', initiative: 12 },
    { id: 'trader', initiative: 8 }
  ];
  const order = getInitiativeOrder(ships);
  assertDeepEqual(order.map(s => s.id), ['scout', 'trader'], 'Higher initiative acts first');
});

test('Order: Four ships, descending initiative', () => {
  const ships = [
    { id: 'scoutA', initiative: 12 },
    { id: 'cruiser', initiative: 10 },
    { id: 'scoutB', initiative: 9 },
    { id: 'trader', initiative: 7 }
  ];
  const order = getInitiativeOrder(ships);
  assertDeepEqual(order.map(s => s.id), ['scoutA', 'cruiser', 'scoutB', 'trader']);
});

test('Order: Tie initiative (use ship ID for determinism)', () => {
  const ships = [
    { id: 'ship1', initiative: 10 },
    { id: 'ship2', initiative: 10 }
  ];
  const order = getInitiativeOrder(ships);
  assertEqual(order.length, 2, 'Both ships should be in order');
  // Deterministic tie-breaking by ID
  assertDeepEqual(order.map(s => s.id), ['ship1', 'ship2'], 'Tie broken by ID');
});

test('Order: Single ship', () => {
  const ships = [{ id: 'solo', initiative: 10 }];
  const order = getInitiativeOrder(ships);
  assertEqual(order.length, 1, 'Single ship should be in order');
  assertEqual(order[0].id, 'solo');
});

test('Order: Empty fleet', () => {
  const order = getInitiativeOrder([]);
  assertEqual(order.length, 0, 'Empty fleet should return empty order');
});

test('Order: Mixed high and low initiatives', () => {
  const ships = [
    { id: 'slow', initiative: 5 },
    { id: 'fast', initiative: 15 },
    { id: 'medium', initiative: 10 }
  ];
  const order = getInitiativeOrder(ships);
  assertDeepEqual(order.map(s => s.id), ['fast', 'medium', 'slow']);
});

test('Order: All same initiative', () => {
  const ships = [
    { id: 'a', initiative: 8 },
    { id: 'b', initiative: 8 },
    { id: 'c', initiative: 8 }
  ];
  const order = getInitiativeOrder(ships);
  assertEqual(order.length, 3, 'All ships in order');
  // Should be deterministic
  assertDeepEqual(order.map(s => s.id), ['a', 'b', 'c']);
});

test('Order: Very low initiative', () => {
  const ships = [
    { id: 'unlucky', initiative: 2 },
    { id: 'normal', initiative: 8 }
  ];
  const order = getInitiativeOrder(ships);
  assertDeepEqual(order.map(s => s.id), ['normal', 'unlucky']);
});

test('Order: Very high initiative', () => {
  const ships = [
    { id: 'ace', initiative: 20 },
    { id: 'normal', initiative: 8 }
  ];
  const order = getInitiativeOrder(ships);
  assertDeepEqual(order.map(s => s.id), ['ace', 'normal']);
});

test('Order: Large fleet (10 ships)', () => {
  const ships = Array.from({ length: 10 }, (_, i) => ({
    id: `ship${i}`,
    initiative: Math.floor(Math.random() * 20) + 2
  }));
  const order = getInitiativeOrder(ships);
  assertEqual(order.length, 10, 'All ships should be ordered');
  // Verify descending order
  for (let i = 0; i < order.length - 1; i++) {
    assertTrue(order[i].initiative >= order[i + 1].initiative, 'Order should be descending');
  }
});

// ============================================================
// USE CASE 3: PHASE SEQUENCING (10 tests)
// ============================================================
console.log('\n--- USE CASE 3: Phase Sequencing (10 tests) ---\n');

test('Phase: Initial phase is Manoeuvre', () => {
  const phase = getCurrentPhase();
  assertEqual(phase, 'manoeuvre', 'Round should start with Manoeuvre phase');
});

test('Phase: Advance from Manoeuvre to Attack', () => {
  advancePhase();
  const phase = getCurrentPhase();
  assertEqual(phase, 'attack', 'Should advance to Attack phase');
});

test('Phase: Advance from Attack to Actions', () => {
  advancePhase();
  const phase = getCurrentPhase();
  assertEqual(phase, 'actions', 'Should advance to Actions phase');
});

test('Phase: Advance from Actions to round_end', () => {
  advancePhase();
  const phase = getCurrentPhase();
  assertEqual(phase, 'round_end', 'Should advance to round_end phase');
});

test('Phase: Advance from round_end to Manoeuvre (new round)', () => {
  advancePhase();
  const phase = getCurrentPhase();
  assertEqual(phase, 'manoeuvre', 'Should cycle back to Manoeuvre');
});

test('Phase: Full round cycle', () => {
  const phases = ['manoeuvre', 'attack', 'actions', 'round_end', 'manoeuvre'];
  for (let i = 0; i < phases.length; i++) {
    assertEqual(getCurrentPhase(), phases[i], `Phase ${i} should be ${phases[i]}`);
    if (i < phases.length - 1) advancePhase();
  }
});

test('Phase: Cannot skip phases', () => {
  // Reset to manoeuvre
  while (getCurrentPhase() !== 'manoeuvre') advancePhase();

  assertEqual(getCurrentPhase(), 'manoeuvre');
  advancePhase();
  assertEqual(getCurrentPhase(), 'attack', 'Cannot skip to Actions from Manoeuvre');
});

test('Phase: Multiple rounds cycle correctly', () => {
  // Advance through 3 full rounds
  for (let round = 0; round < 3; round++) {
    assertEqual(getCurrentPhase(), 'manoeuvre');
    advancePhase(); // attack
    advancePhase(); // actions
    advancePhase(); // round_end
    advancePhase(); // back to manoeuvre
  }
  assertEqual(getCurrentPhase(), 'manoeuvre');
});

test('Phase: Get current round number', () => {
  const round = getCurrentRound();
  assertTrue(round >= 1, 'Round number should be at least 1');
});

test('Phase: Round number increments after round_end', () => {
  const startRound = getCurrentRound();
  // Advance to round_end and beyond
  while (getCurrentPhase() !== 'round_end') advancePhase();
  advancePhase(); // Should increment round and go to manoeuvre
  const newRound = getCurrentRound();
  assertEqual(newRound, startRound + 1, 'Round should increment');
});

// ============================================================
// USE CASE 4: THRUST ALLOCATION (10 tests)
// ============================================================
console.log('\n--- USE CASE 4: Thrust Allocation (10 tests) ---\n');

test('Thrust: Allocate to movement', () => {
  const ship = { id: 'scout', thrust: { total: 2, allocated: { movement: 0, evasive: 0 } } };
  const result = allocateThrust(ship, 'movement', 1);
  assertTrue(result.success, 'Should allocate 1 thrust to movement');
  assertEqual(ship.thrust.allocated.movement, 1);
});

test('Thrust: Allocate to evasive', () => {
  const ship = { id: 'scout', thrust: { total: 2, allocated: { movement: 0, evasive: 0 } } };
  const result = allocateThrust(ship, 'evasive', 1);
  assertTrue(result.success, 'Should allocate 1 thrust to evasive');
  assertEqual(ship.thrust.allocated.evasive, 1);
});

test('Thrust: Split allocation (1 movement, 1 evasive)', () => {
  const ship = { id: 'scout', thrust: { total: 2, allocated: { movement: 0, evasive: 0 } } };
  allocateThrust(ship, 'movement', 1);
  allocateThrust(ship, 'evasive', 1);
  assertEqual(ship.thrust.allocated.movement, 1);
  assertEqual(ship.thrust.allocated.evasive, 1);
});

test('Thrust: Insufficient thrust blocks allocation', () => {
  const ship = { id: 'scout', thrust: { total: 2, allocated: { movement: 2, evasive: 0 } } };
  const result = allocateThrust(ship, 'evasive', 1);
  assertEqual(result.success, false, 'Should block allocation when insufficient thrust');
  assertTrue(result.message.includes('Insufficient'), 'Error message should mention insufficient thrust');
});

test('Thrust: Calculate remaining thrust', () => {
  const ship = { id: 'scout', thrust: { total: 2, allocated: { movement: 1, evasive: 0 } } };
  const remaining = getRemainingThrust(ship);
  assertEqual(remaining, 1, 'Remaining thrust should be 1');
});

test('Thrust: Zero remaining after full allocation', () => {
  const ship = { id: 'scout', thrust: { total: 2, allocated: { movement: 1, evasive: 1 } } };
  const remaining = getRemainingThrust(ship);
  assertEqual(remaining, 0, 'No thrust remaining');
});

test('Thrust: Allocate all to movement', () => {
  const ship = { id: 'scout', thrust: { total: 2, allocated: { movement: 0, evasive: 0 } } };
  allocateThrust(ship, 'movement', 2);
  assertEqual(ship.thrust.allocated.movement, 2);
  assertEqual(getRemainingThrust(ship), 0);
});

test('Thrust: Allocate all to evasive', () => {
  const ship = { id: 'scout', thrust: { total: 2, allocated: { movement: 0, evasive: 0 } } };
  allocateThrust(ship, 'evasive', 2);
  assertEqual(ship.thrust.allocated.evasive, 2);
  assertEqual(getRemainingThrust(ship), 0);
});

test('Thrust: Cannot over-allocate', () => {
  const ship = { id: 'scout', thrust: { total: 2, allocated: { movement: 0, evasive: 0 } } };
  const result = allocateThrust(ship, 'movement', 3);
  assertEqual(result.success, false, 'Should block over-allocation');
});

test('Thrust: High-thrust ship (6 thrust)', () => {
  const ship = { id: 'racer', thrust: { total: 6, allocated: { movement: 0, evasive: 0 } } };
  allocateThrust(ship, 'movement', 4);
  allocateThrust(ship, 'evasive', 2);
  assertEqual(getRemainingThrust(ship), 0);
});

// ============================================================
// SUMMARY
// ============================================================
console.log('\n========================================');
console.log('PHASE SYSTEM TEST RESULTS');
console.log('========================================');
console.log(`PASSED: ${passCount}/50`);
console.log(`FAILED: ${failCount}/50`);

if (failCount === 0) {
  console.log('\n✅ ALL TESTS PASSED');
} else {
  console.log(`\n❌ ${failCount} TEST(S) FAILED`);
  process.exit(1);
}
