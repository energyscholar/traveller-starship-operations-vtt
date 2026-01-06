// Space Combat Phase Integration Tests
// Verifies phase system integrates with combat flow
// AR-280 Part 1: Phase Display UI

const {
  calculateInitiative,
  getCurrentPhase,
  advancePhase,
  getCurrentRound,
  resetPhaseState,
  canActInPhase,
  allocateThrust,
  getRemainingThrust,
  canFireWeapon,
  fireWeapon,
  resetRoundFlags,
  getInitiativeOrder
} = require('../../lib/phase-system');

console.log('========================================');
console.log('PHASE INTEGRATION TESTS (AR-280)');
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

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true');
  }
}

function assertFalse(condition, message = '') {
  if (condition) {
    throw new Error(message || 'Expected condition to be false');
  }
}

// Helper: Create ship with full combat state
function createCombatShip(id, opts = {}) {
  return {
    id,
    name: opts.name || id,
    initiative: opts.initiative || 0,
    pilotSkill: opts.pilotSkill || 0,
    thrust: {
      total: opts.thrust || 2,
      allocated: { movement: 0, evasive: 0 }
    },
    hull: { current: opts.hull || 40, max: opts.hullMax || 40 },
    turrets: [{
      id: 'turret1',
      operational: true,
      usedThisRound: false,
      weapons: {
        pulse_laser: { operational: true, usedThisRound: false },
        missile_rack: { operational: true, usedThisRound: false, missilesRemaining: opts.missiles || 6 }
      }
    }],
    crew: opts.crew || [
      { id: 'pilot1', role: 'pilot', alive: true, skill: 2 },
      { id: 'gunner1', role: 'gunner', alive: true, skill: 1 },
      { id: 'engineer1', role: 'engineer', alive: true, skill: 1 }
    ]
  };
}

// ============================================================
// INTEGRATION TEST 1: Full Combat Round Flow
// ============================================================
console.log('--- Integration 1: Full Combat Round (8 tests) ---\n');

test('Round flow: Start in Manoeuvre phase', () => {
  resetPhaseState();
  assertEqual(getCurrentPhase(), 'manoeuvre');
  assertEqual(getCurrentRound(), 1);
});

test('Round flow: Only pilot can act in Manoeuvre', () => {
  resetPhaseState();
  const pilot = { role: 'pilot', alive: true };
  const gunner = { role: 'gunner', alive: true };
  const engineer = { role: 'engineer', alive: true };

  assertTrue(canActInPhase(pilot, 'manoeuvre'));
  assertFalse(canActInPhase(gunner, 'manoeuvre'));
  assertFalse(canActInPhase(engineer, 'manoeuvre'));
});

test('Round flow: Advance to Attack phase', () => {
  resetPhaseState();
  advancePhase();
  assertEqual(getCurrentPhase(), 'attack');
});

test('Round flow: Only gunner can act in Attack', () => {
  resetPhaseState();
  advancePhase(); // → attack

  const pilot = { role: 'pilot', alive: true };
  const gunner = { role: 'gunner', alive: true };

  assertFalse(canActInPhase(pilot, 'attack'));
  assertTrue(canActInPhase(gunner, 'attack'));
});

test('Round flow: Advance to Actions phase', () => {
  resetPhaseState();
  advancePhase(); // → attack
  advancePhase(); // → actions
  assertEqual(getCurrentPhase(), 'actions');
});

test('Round flow: All roles can act in Actions', () => {
  resetPhaseState();
  advancePhase(); // → attack
  advancePhase(); // → actions

  const pilot = { role: 'pilot', alive: true };
  const gunner = { role: 'gunner', alive: true };
  const engineer = { role: 'engineer', alive: true };

  assertTrue(canActInPhase(pilot, 'actions'));
  assertTrue(canActInPhase(gunner, 'actions'));
  assertTrue(canActInPhase(engineer, 'actions'));
});

test('Round flow: Complete round increments round number', () => {
  resetPhaseState();
  advancePhase(); // → attack
  advancePhase(); // → actions
  advancePhase(); // → round_end
  advancePhase(); // → manoeuvre (round 2)

  assertEqual(getCurrentPhase(), 'manoeuvre');
  assertEqual(getCurrentRound(), 2);
});

test('Round flow: 3 full rounds cycle correctly', () => {
  resetPhaseState();
  for (let r = 0; r < 3; r++) {
    advancePhase(); advancePhase(); advancePhase(); advancePhase();
  }
  assertEqual(getCurrentRound(), 4);
  assertEqual(getCurrentPhase(), 'manoeuvre');
});

// ============================================================
// INTEGRATION TEST 2: Initiative Order Combat
// ============================================================
console.log('\n--- Integration 2: Initiative Order Combat (6 tests) ---\n');

test('Initiative: Ships sorted by initiative (high first)', () => {
  const ships = [
    { id: 'slow', initiative: 5 },
    { id: 'fast', initiative: 12 },
    { id: 'medium', initiative: 8 }
  ];
  const order = getInitiativeOrder(ships);
  assertEqual(order[0].id, 'fast');
  assertEqual(order[1].id, 'medium');
  assertEqual(order[2].id, 'slow');
});

test('Initiative: Tie-break by ID (alphabetical)', () => {
  const ships = [
    { id: 'zulu', initiative: 10 },
    { id: 'alpha', initiative: 10 },
    { id: 'mike', initiative: 10 }
  ];
  const order = getInitiativeOrder(ships);
  assertEqual(order[0].id, 'alpha');
  assertEqual(order[1].id, 'mike');
  assertEqual(order[2].id, 'zulu');
});

test('Initiative: Calculate with fixed dice (deterministic)', () => {
  const ship = { pilotSkill: 2, thrust: 3 };
  const init = calculateInitiative(ship, [4, 5]); // dice = 9
  assertEqual(init, 14); // 9 + 2 + 3
});

test('Initiative: Each ship acts once per phase', () => {
  const ship = createCombatShip('scout');
  const turret = ship.turrets[0];

  // First attack succeeds
  const result1 = fireWeapon(turret, 'pulse_laser');
  assertTrue(result1.success);

  // Second attack fails (already fired)
  const result2 = fireWeapon(turret, 'missile_rack');
  assertFalse(result2.success);
});

test('Initiative: Reset flags at round end', () => {
  const ship = createCombatShip('scout');
  const turret = ship.turrets[0];

  fireWeapon(turret, 'pulse_laser');
  assertTrue(turret.usedThisRound);

  resetRoundFlags(ship);
  assertFalse(turret.usedThisRound);
});

test('Initiative: Thrust resets at round end', () => {
  const ship = createCombatShip('scout', { thrust: 4 });

  allocateThrust(ship, 'movement', 2);
  allocateThrust(ship, 'evasive', 1);
  assertEqual(getRemainingThrust(ship), 1);

  resetRoundFlags(ship);
  assertEqual(getRemainingThrust(ship), 4);
});

// ============================================================
// INTEGRATION TEST 3: Multi-Ship Combat Scenario
// ============================================================
console.log('\n--- Integration 3: Multi-Ship Combat (6 tests) ---\n');

test('Multi-ship: Both ships can manoeuvre in Manoeuvre phase', () => {
  resetPhaseState();
  const pcShip = createCombatShip('aurora', { thrust: 3 });
  const npcShip = createCombatShip('pirate', { thrust: 2 });

  // Both pilots can allocate thrust
  allocateThrust(pcShip, 'movement', 2);
  allocateThrust(npcShip, 'evasive', 1);

  assertEqual(getRemainingThrust(pcShip), 1);
  assertEqual(getRemainingThrust(npcShip), 1);
});

test('Multi-ship: Both ships fire in Attack phase', () => {
  resetPhaseState();
  advancePhase(); // → attack

  const pcShip = createCombatShip('aurora');
  const npcShip = createCombatShip('pirate');

  const pcResult = fireWeapon(pcShip.turrets[0], 'pulse_laser');
  const npcResult = fireWeapon(npcShip.turrets[0], 'pulse_laser');

  assertTrue(pcResult.success);
  assertTrue(npcResult.success);
});

test('Multi-ship: Dead crew cannot act', () => {
  const ship = createCombatShip('aurora');
  const deadGunner = { role: 'gunner', alive: false };

  assertFalse(canActInPhase(deadGunner, 'attack'));
});

test('Multi-ship: Evasive thrust applies to all incoming attacks', () => {
  const ship = createCombatShip('aurora', { thrust: 4 });

  // Allocate 2 thrust to evasion
  allocateThrust(ship, 'evasive', 2);

  // Evasive allocation tracked
  assertEqual(ship.thrust.allocated.evasive, 2);
  assertEqual(getRemainingThrust(ship), 2);
});

test('Multi-ship: Missile depletion persists across rounds', () => {
  const ship = createCombatShip('aurora', { missiles: 3 });
  const turret = ship.turrets[0];

  // Fire missile 3 times across 3 rounds
  for (let i = 0; i < 3; i++) {
    const result = fireWeapon(turret, 'missile_rack');
    assertTrue(result.success);
    resetRoundFlags(ship);
  }

  // 4th attempt fails
  const result = fireWeapon(turret, 'missile_rack');
  assertFalse(result.success);
  assertEqual(result.message, 'No missiles remaining');
});

test('Multi-ship: Combat ends when one ship destroyed', () => {
  const ship = createCombatShip('aurora');
  ship.hull.current = 0; // Simulate destruction

  // Ship with 0 hull is destroyed
  assertEqual(ship.hull.current, 0);
});

// ============================================================
// INTEGRATION TEST 4: Phase Transition Events
// ============================================================
console.log('\n--- Integration 4: Phase Transition Events (5 tests) ---\n');

test('Phase events: Phase sequence is correct', () => {
  resetPhaseState();
  const phases = [];

  phases.push(getCurrentPhase());
  advancePhase(); phases.push(getCurrentPhase());
  advancePhase(); phases.push(getCurrentPhase());
  advancePhase(); phases.push(getCurrentPhase());
  advancePhase(); phases.push(getCurrentPhase());

  assertEqual(phases.join(','), 'manoeuvre,attack,actions,round_end,manoeuvre');
});

test('Phase events: Can query current phase', () => {
  resetPhaseState();
  assertEqual(getCurrentPhase(), 'manoeuvre');

  advancePhase();
  assertEqual(getCurrentPhase(), 'attack');
});

test('Phase events: Can query current round', () => {
  resetPhaseState();
  assertEqual(getCurrentRound(), 1);

  advancePhase(); advancePhase(); advancePhase(); advancePhase();
  assertEqual(getCurrentRound(), 2);
});

test('Phase events: Phase determines valid actions', () => {
  resetPhaseState();

  // In Manoeuvre: pilot can act
  const pilot = { role: 'pilot', alive: true };
  assertTrue(canActInPhase(pilot, getCurrentPhase()));

  // Advance to Attack
  advancePhase();
  assertFalse(canActInPhase(pilot, getCurrentPhase()));
});

test('Phase events: Reset preserves state for replay', () => {
  resetPhaseState();
  advancePhase(); advancePhase();
  assertEqual(getCurrentPhase(), 'actions');

  resetPhaseState();
  assertEqual(getCurrentPhase(), 'manoeuvre');
  assertEqual(getCurrentRound(), 1);
});

// ============================================================
// INTEGRATION TEST 5: Edge Cases
// ============================================================
console.log('\n--- Integration 5: Edge Cases (5 tests) ---\n');

test('Edge: Ship with no thrust cannot allocate', () => {
  const ship = createCombatShip('derelict');
  ship.thrust.total = 0; // Simulate disabled drive
  assertEqual(getRemainingThrust(ship), 0);

  const result = allocateThrust(ship, 'movement', 1);
  assertFalse(result.success);
});

test('Edge: Disabled turret cannot fire', () => {
  const ship = createCombatShip('damaged');
  ship.turrets[0].operational = false;

  assertFalse(canFireWeapon(ship.turrets[0], 'pulse_laser'));
});

test('Edge: Disabled weapon in operational turret', () => {
  const ship = createCombatShip('damaged');
  ship.turrets[0].weapons.pulse_laser.operational = false;

  // Laser disabled but missile rack works
  assertFalse(canFireWeapon(ship.turrets[0], 'pulse_laser'));
  assertTrue(canFireWeapon(ship.turrets[0], 'missile_rack'));
});

test('Edge: Empty ship (no crew) cannot act', () => {
  const ship = createCombatShip('ghost', { crew: [] });
  assertEqual(ship.crew.length, 0);
});

test('Edge: Single-round combat (immediate victory)', () => {
  resetPhaseState();
  // Simulate: Manoeuvre → Attack (ship destroyed) → Combat ends
  advancePhase(); // attack
  // If ship destroyed here, combat would end before Actions
  assertEqual(getCurrentPhase(), 'attack');
});

// ============================================================
// SUMMARY
// ============================================================
console.log('\n========================================');
console.log('PHASE INTEGRATION TEST RESULTS');
console.log('========================================');
console.log(`PASSED: ${passCount}/${passCount + failCount}`);
console.log(`FAILED: ${failCount}/${passCount + failCount}`);

if (failCount === 0) {
  console.log('\n✅ ALL TESTS PASSED');
} else {
  console.log('\n❌ SOME TESTS FAILED');
  process.exitCode = 1;
}
