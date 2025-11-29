// Space Combat Role-Based Action Gating & Edge Cases
// Covers USE CASE 7 (role restrictions) and edge cases (destroyed ships, disabled systems)
// Based on PHASE-SYSTEM-USE-CASES.md

const {
  canActInPhase,
  canAllocateThrust,
  canFireWeapon,
  canRepairSystem,
  resetRoundFlags,
  isShipDestroyed,
  isSystemDisabled
} = require('../../lib/combat');

console.log('========================================');
console.log('ROLE GATING & EDGE CASES TESTS');
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

// ============================================================
// USE CASE 7: ROLE-BASED ACTION GATING (15 tests)
// ============================================================
console.log('--- USE CASE 7: Role-Based Action Gating (15 tests) ---\n');

test('Role: Pilot can act in Manoeuvre phase', () => {
  const crew = { role: 'pilot', alive: true };
  assertTrue(canActInPhase(crew, 'manoeuvre'), 'Pilot should act in Manoeuvre');
});

test('Role: Pilot can allocate thrust', () => {
  const crew = { role: 'pilot', alive: true };
  assertTrue(canAllocateThrust(crew), 'Pilot can allocate thrust');
});

test('Role: Gunner cannot act in Manoeuvre phase', () => {
  const crew = { role: 'gunner', alive: true };
  assertEqual(canActInPhase(crew, 'manoeuvre'), false, 'Gunner blocked in Manoeuvre');
});

test('Role: Gunner cannot allocate thrust', () => {
  const crew = { role: 'gunner', alive: true };
  assertEqual(canAllocateThrust(crew), false, 'Gunner cannot allocate thrust');
});

test('Role: Engineer cannot act in Manoeuvre phase', () => {
  const crew = { role: 'engineer', alive: true };
  assertEqual(canActInPhase(crew, 'manoeuvre'), false, 'Engineer blocked in Manoeuvre');
});

test('Role: Gunner can act in Attack phase', () => {
  const crew = { role: 'gunner', alive: true };
  assertTrue(canActInPhase(crew, 'attack'), 'Gunner should act in Attack');
});

test('Role: Gunner can fire weapons', () => {
  const crew = { role: 'gunner', alive: true };
  const turret = { weapons: { pulse_laser: { usedThisRound: false } } };
  assertTrue(canFireWeapon(turret, 'pulse_laser', crew), 'Gunner can fire weapons');
});

test('Role: Pilot cannot fire weapons in Attack phase', () => {
  const crew = { role: 'pilot', alive: true };
  const turret = { weapons: { pulse_laser: { usedThisRound: false } } };
  assertEqual(canFireWeapon(turret, 'pulse_laser', crew), false, 'Pilot blocked from firing');
});

test('Role: Engineer cannot fire weapons in Attack phase', () => {
  const crew = { role: 'engineer', alive: true };
  const turret = { weapons: { pulse_laser: { usedThisRound: false } } };
  assertEqual(canFireWeapon(turret, 'pulse_laser', crew), false, 'Engineer blocked from firing');
});

test('Role: Engineer can act in Actions phase', () => {
  const crew = { role: 'engineer', alive: true };
  assertTrue(canActInPhase(crew, 'actions'), 'Engineer should act in Actions');
});

test('Role: Engineer can repair systems', () => {
  const crew = { role: 'engineer', alive: true };
  const system = { name: 'M-Drive', damaged: true };
  assertTrue(canRepairSystem(system, crew), 'Engineer can repair systems');
});

test('Role: Pilot can act in Actions phase (other actions)', () => {
  const crew = { role: 'pilot', alive: true };
  assertTrue(canActInPhase(crew, 'actions'), 'Pilot can act in Actions');
});

test('Role: Gunner can act in Actions phase (other actions)', () => {
  const crew = { role: 'gunner', alive: true };
  assertTrue(canActInPhase(crew, 'actions'), 'Gunner can act in Actions');
});

test('Role: Non-engineer cannot repair systems', () => {
  const crew = { role: 'pilot', alive: true };
  const system = { name: 'M-Drive', damaged: true };
  assertEqual(canRepairSystem(system, crew), false, 'Only engineer can repair');
});

test('Role: Dead crew cannot act in any phase', () => {
  const crew = { role: 'pilot', alive: false };
  assertEqual(canActInPhase(crew, 'manoeuvre'), false, 'Dead crew cannot act');
  assertEqual(canActInPhase(crew, 'attack'), false);
  assertEqual(canActInPhase(crew, 'actions'), false);
});

// ============================================================
// EDGE CASE 1: DESTROYED SHIPS (5 tests)
// ============================================================
console.log('\n--- EDGE CASE 1: Destroyed Ships (5 tests) ---\n');

test('EC1: Ship with 0 hull is destroyed', () => {
  const ship = { id: 'scout', hull: { current: 0, max: 40 } };
  assertTrue(isShipDestroyed(ship), 'Ship should be destroyed at 0 hull');
});

test('EC1: Ship with negative hull is destroyed', () => {
  const ship = { id: 'scout', hull: { current: -5, max: 40 } };
  assertTrue(isShipDestroyed(ship), 'Ship should be destroyed at negative hull');
});

test('EC1: Ship with 1 hull is not destroyed', () => {
  const ship = { id: 'scout', hull: { current: 1, max: 40 } };
  assertEqual(isShipDestroyed(ship), false, 'Ship should survive with 1 hull');
});

test('EC1: Destroyed ship cannot act', () => {
  const ship = { id: 'scout', hull: { current: 0, max: 40 } };
  const crew = { role: 'pilot', alive: true };
  assertEqual(canActInPhase(crew, 'manoeuvre', ship), false, 'Destroyed ship cannot act');
});

test('EC1: Destroyed ship skipped in phase', () => {
  const ships = [
    { id: 'scout', hull: { current: 0, max: 40 }, initiative: 12 },
    { id: 'trader', hull: { current: 80, max: 80 }, initiative: 8 }
  ];
  const activeShips = ships.filter(s => !isShipDestroyed(s));
  assertEqual(activeShips.length, 1, 'Only 1 ship should be active');
  assertEqual(activeShips[0].id, 'trader');
});

// ============================================================
// EDGE CASE 2: DISABLED SYSTEMS (10 tests)
// ============================================================
console.log('\n--- EDGE CASE 2: Disabled Systems (10 tests) ---\n');

test('EC2: M-Drive hit prevents thrust allocation', () => {
  const ship = {
    systems: { mDrive: { operational: false } },
    thrust: { total: 2 }
  };
  assertEqual(canAllocateThrust({ role: 'pilot', alive: true }, ship), false, 'Disabled M-Drive blocks thrust');
});

test('EC2: M-Drive operational allows thrust', () => {
  const ship = {
    systems: { mDrive: { operational: true } },
    thrust: { total: 2 }
  };
  assertTrue(canAllocateThrust({ role: 'pilot', alive: true }, ship), 'Operational M-Drive allows thrust');
});

test('EC2: Weapon hit prevents firing that weapon', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: false, operational: false }
    }
  };
  const crew = { role: 'gunner', alive: true };
  assertEqual(canFireWeapon(turret, 'pulse_laser', crew), false, 'Damaged weapon cannot fire');
});

test('EC2: Other weapons in turret still work', () => {
  const turret = {
    weapons: {
      pulse_laser: { usedThisRound: false, operational: false },
      missile_rack: { usedThisRound: false, operational: true }
    },
    usedThisRound: false
  };
  const crew = { role: 'gunner', alive: true };
  assertTrue(canFireWeapon(turret, 'missile_rack', crew), 'Undamaged weapon should work');
});

test('EC2: Sensors hit applies attack DM penalty', () => {
  const ship = {
    systems: { sensors: { operational: false } }
  };
  const attackDM = getAttackDM(ship);
  assertTrue(attackDM < 0, 'Sensor damage should penalize attacks');
});

test('EC2: Power plant hit reduces available thrust', () => {
  const ship = {
    systems: { powerPlant: { operational: false, efficiency: 0.5 } },
    thrust: { total: 2 }
  };
  const effectiveThrust = getEffectiveThrust(ship);
  assertEqual(effectiveThrust, 1, 'Power plant damage should halve thrust');
});

test('EC2: Multiple system hits compound effects', () => {
  const ship = {
    systems: {
      sensors: { operational: false },
      powerPlant: { operational: false, efficiency: 0.5 }
    },
    thrust: { total: 2 }
  };
  const effectiveThrust = getEffectiveThrust(ship);
  assertEqual(effectiveThrust, 1, 'Multiple hits compound');
  assertTrue(getAttackDM(ship) < 0, 'Sensor damage still applies');
});

test('EC2: System can be repaired', () => {
  const system = { name: 'M-Drive', operational: false, damaged: true };
  const crew = { role: 'engineer', alive: true, skill: 2 };
  const result = repairSystem(system, crew);
  assertTrue(result.attemptMade, 'Engineer should attempt repair');
});

test('EC2: Critical system cannot be repaired mid-combat', () => {
  const system = { name: 'Power Plant', operational: false, critical: true };
  const crew = { role: 'engineer', alive: true, skill: 2 };
  const result = repairSystem(system, crew);
  assertEqual(result.success, false, 'Critical damage too severe for mid-combat repair');
});

test('EC2: Disabled turret cannot fire any weapon', () => {
  const turret = {
    operational: false,
    weapons: {
      pulse_laser: { usedThisRound: false, operational: true }
    }
  };
  const crew = { role: 'gunner', alive: true };
  assertEqual(canFireWeapon(turret, 'pulse_laser', crew), false, 'Disabled turret blocks all weapons');
});

// ============================================================
// EDGE CASE 3: CREW CASUALTIES (5 tests)
// ============================================================
console.log('\n--- EDGE CASE 3: Crew Casualties (5 tests) ---\n');

test('EC3: Pilot killed - no evasive manoeuvres', () => {
  const ship = {
    crew: [
      { role: 'pilot', alive: false },
      { role: 'gunner', alive: true }
    ],
    thrust: { total: 2 }
  };
  const pilot = ship.crew.find(c => c.role === 'pilot');
  assertEqual(canAllocateThrust(pilot, ship), false, 'Dead pilot cannot allocate thrust');
});

test('EC3: Gunner killed - turret cannot fire', () => {
  const ship = {
    crew: [
      { role: 'pilot', alive: true },
      { role: 'gunner', alive: false }
    ]
  };
  const turret = { weapons: { pulse_laser: { usedThisRound: false } } };
  const gunner = ship.crew.find(c => c.role === 'gunner');
  assertEqual(canFireWeapon(turret, 'pulse_laser', gunner), false, 'Dead gunner cannot fire');
});

test('EC3: Engineer killed - no repairs possible', () => {
  const ship = {
    crew: [
      { role: 'pilot', alive: true },
      { role: 'engineer', alive: false }
    ]
  };
  const system = { name: 'M-Drive', damaged: true };
  const engineer = ship.crew.find(c => c.role === 'engineer');
  assertEqual(canRepairSystem(system, engineer), false, 'Dead engineer cannot repair');
});

test('EC3: Backup crew can take over role', () => {
  const ship = {
    crew: [
      { role: 'pilot', alive: false },
      { role: 'backup_pilot', alive: true, canPilot: true }
    ]
  };
  const backup = ship.crew.find(c => c.canPilot && c.alive);
  assertTrue(backup !== undefined, 'Backup pilot should exist');
  assertTrue(canAllocateThrust(backup, ship), 'Backup can pilot');
});

test('EC3: All crew dead - ship is derelict', () => {
  const ship = {
    crew: [
      { role: 'pilot', alive: false },
      { role: 'gunner', alive: false },
      { role: 'engineer', alive: false }
    ],
    hull: { current: 20, max: 40 }
  };
  const isDerelict = ship.crew.every(c => !c.alive);
  assertTrue(isDerelict, 'Ship should be derelict with all crew dead');
});

// ============================================================
// SUMMARY
// ============================================================
console.log('\n========================================');
console.log('ROLE GATING & EDGE CASES TEST RESULTS');
console.log('========================================');
console.log(`PASSED: ${passCount}/35`);
console.log(`FAILED: ${failCount}/35`);

if (failCount === 0) {
  console.log('\n✅ ALL TESTS PASSED');
} else {
  console.log(`\n❌ ${failCount} TEST(S) FAILED`);
  process.exit(1);
}
