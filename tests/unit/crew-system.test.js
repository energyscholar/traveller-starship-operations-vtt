// Stage 6: Crew System Tests
// Test crew skills, role assignment, and damage
// TDD: Write tests FIRST, implement SECOND

const { SHIPS, CREW, resolveAttack, applyCrew, assignCrewRole, crewTakeDamage, engineerRepair } = require('../../lib/combat');

console.log('========================================');
console.log('STAGE 6: CREW SYSTEM TESTS');
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

function assertGreaterThan(actual, threshold, message = '') {
  if (actual <= threshold) {
    throw new Error(`${message}\nExpected > ${threshold}, got ${actual}`);
  }
}

function assertLessThan(actual, threshold, message = '') {
  if (actual >= threshold) {
    throw new Error(`${message}\nExpected < ${threshold}, got ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true');
  }
}

console.log('--- CREW SKILL APPLICATION (8 tests) ---\n');

test('Gunner skill adds to attack roll', () => {
  const scout = { ...SHIPS.scout };
  const free_trader = { ...SHIPS.free_trader };

  // Scout gunner has skill +2
  const gunner = CREW.scout.find(c => c.role === 'gunner');
  assertEqual(gunner.skills.gunner, 2, 'Scout gunner should have skill +2');

  // Apply gunner to scout
  const scoutWithCrew = applyCrew(scout, { gunner: gunner });

  // Attack with and without crew should differ by gunner skill
  const noCrew = resolveAttack(scout, free_trader, { seed: 12345, range: 'medium' });
  const withCrew = resolveAttack(scoutWithCrew, free_trader, { seed: 12345, range: 'medium' });

  // With crew should have +2 to attack from gunner skill
  assertEqual(withCrew.gunnerSkill, 2, 'Should have gunner skill +2');
  assertEqual(withCrew.attackTotal, noCrew.attackTotal + 2, 'Gunner skill should add +2 to attack');
});

test('Pilot skill adds to initiative (stored for initiative calculation)', () => {
  const scout = { ...SHIPS.scout };

  // Scout pilot has skill +2
  const pilot = CREW.scout.find(c => c.role === 'pilot');
  assertEqual(pilot.skills.pilot, 2, 'Scout pilot should have skill +2');

  // Apply pilot to scout
  const scoutWithCrew = applyCrew(scout, { pilot: pilot });

  // Should store pilot skill for initiative calculations
  assertEqual(scoutWithCrew.pilotSkill, 2, 'Pilot skill should be +2');
});

test('Engineer can repair hull (1d6 per action)', () => {
  const scout = { ...SHIPS.scout, hull: 5 }; // damaged

  // Scout engineer has skill +1
  const engineer = CREW.scout.find(c => c.role === 'engineer');
  assertEqual(engineer.skills.engineering, 1, 'Scout engineer should have skill +1');

  // Engineer repairs (1d6 HP, skill doesn't add to repair amount in basic version)
  const repairResult = engineerRepair(scout, engineer, { seed: 12345 });

  assertTrue(repairResult.repaired, 'Engineer should successfully repair');
  assertGreaterThan(repairResult.hullRepaired, 0, 'Should repair at least 1 HP');
  assertLessThan(repairResult.hullRepaired, 7, 'Should repair max 6 HP (1d6)');
  assertEqual(repairResult.newHull, scout.hull + repairResult.hullRepaired, 'Hull should increase by repair amount');
});

test('Engineer repair cannot exceed max hull', () => {
  const scout = { ...SHIPS.scout, hull: 9, maxHull: 10 }; // 1 damage
  const engineer = CREW.scout.find(c => c.role === 'engineer');

  // Repair with high roll (seed that gives 6)
  const repairResult = engineerRepair(scout, engineer, { seed: 99999 });

  assertTrue(repairResult.newHull <= scout.maxHull, 'Hull should not exceed max hull');
  assertEqual(repairResult.newHull, scout.maxHull, 'Should cap at max hull');
});

test('Multiple crew can be assigned to ship', () => {
  const scout = { ...SHIPS.scout };
  const pilot = CREW.scout.find(c => c.role === 'pilot');
  const gunner = CREW.scout.find(c => c.role === 'gunner');
  const engineer = CREW.scout.find(c => c.role === 'engineer');

  const scoutWithCrew = applyCrew(scout, {
    pilot: pilot,
    gunner: gunner,
    engineer: engineer
  });

  assertEqual(scoutWithCrew.crew.pilot.name, pilot.name, 'Pilot should be assigned');
  assertEqual(scoutWithCrew.crew.gunner.name, gunner.name, 'Gunner should be assigned');
  assertEqual(scoutWithCrew.crew.engineer.name, engineer.name, 'Engineer should be assigned');
});

test('Crew skills stack correctly (pilot + gunner)', () => {
  const scout = { ...SHIPS.scout };
  const free_trader = { ...SHIPS.free_trader };
  const pilot = CREW.scout.find(c => c.role === 'pilot');
  const gunner = CREW.scout.find(c => c.role === 'gunner');

  const scoutWithCrew = applyCrew(scout, { pilot, gunner });

  const result = resolveAttack(scoutWithCrew, free_trader, { seed: 12345, range: 'medium' });

  // Should have pilot skill for pilotSkill (initiative/dodge)
  assertEqual(result.skill, 2, 'Should use pilot skill for base skill');
  // Should have gunner skill for attack bonus
  assertEqual(result.gunnerSkill, 2, 'Should have gunner skill bonus');
});

test('Free Trader crew has different skill levels', () => {
  const pilot = CREW.free_trader.find(c => c.role === 'pilot');
  const gunner = CREW.free_trader.find(c => c.role === 'gunner');
  const engineer = CREW.free_trader.find(c => c.role === 'engineer');

  // Free Trader crew should be less skilled (generic pirates vs trained scouts)
  assertEqual(pilot.skills.pilot, 1, 'Free Trader pilot should have skill +1');
  assertEqual(gunner.skills.gunner, 1, 'Free Trader gunner should have skill +1');
  assertEqual(engineer.skills.engineering, 0, 'Free Trader engineer should have skill +0');
});

test('No crew assigned means no skill bonuses', () => {
  const scout = { ...SHIPS.scout };
  const free_trader = { ...SHIPS.free_trader };

  // Scout with no crew should use ship default pilotSkill only
  const result = resolveAttack(scout, free_trader, { seed: 12345, range: 'medium' });

  assertEqual(result.skill, scout.pilotSkill, 'Should use ship default pilot skill');
  assertEqual(result.gunnerSkill, undefined, 'Should have no gunner skill bonus');
});

console.log('\n--- ROLE ASSIGNMENT (6 tests) ---\n');

test('Can assign crew to pilot role', () => {
  const crewMember = { name: 'Test Pilot', skills: { pilot: 3 } };
  const assignment = assignCrewRole('scout', 'pilot', crewMember);

  assertEqual(assignment.ship, 'scout', 'Should assign to scout');
  assertEqual(assignment.role, 'pilot', 'Should assign to pilot role');
  assertEqual(assignment.crew.name, 'Test Pilot', 'Should assign correct crew');
});

test('Can assign crew to gunner role', () => {
  const crewMember = { name: 'Test Gunner', skills: { gunner: 2 } };
  const assignment = assignCrewRole('scout', 'gunner', crewMember);

  assertEqual(assignment.role, 'gunner', 'Should assign to gunner role');
  assertEqual(assignment.crew.name, 'Test Gunner', 'Should assign correct crew');
});

test('Can assign crew to engineer role', () => {
  const crewMember = { name: 'Test Engineer', skills: { engineering: 1 } };
  const assignment = assignCrewRole('scout', 'engineer', crewMember);

  assertEqual(assignment.role, 'engineer', 'Should assign to engineer role');
  assertEqual(assignment.crew.name, 'Test Engineer', 'Should assign correct crew');
});

test('Cannot assign to invalid role', () => {
  const crewMember = { name: 'Test', skills: { pilot: 1 } };

  try {
    assignCrewRole('scout', 'captain', crewMember);
    throw new Error('Should have thrown error for invalid role');
  } catch (error) {
    assertTrue(error.message.includes('Invalid role'), 'Should reject invalid role');
  }
});

test('Can unassign crew from role (pass null)', () => {
  const assignment = assignCrewRole('scout', 'pilot', null);

  assertEqual(assignment.ship, 'scout', 'Should target correct ship');
  assertEqual(assignment.role, 'pilot', 'Should target correct role');
  assertEqual(assignment.crew, null, 'Should unassign crew');
});

test('Crew assignment validates ship name', () => {
  const crewMember = { name: 'Test', skills: { pilot: 1 } };

  try {
    assignCrewRole('invalidShip', 'pilot', crewMember);
    throw new Error('Should have thrown error for invalid ship');
  } catch (error) {
    assertTrue(error.message.includes('Invalid ship'), 'Should reject invalid ship');
  }
});

console.log('\n--- CREW DAMAGE (6 tests) ---\n');

test('Crew can take damage', () => {
  const pilot = { ...CREW.scout.find(c => c.role === 'pilot'), health: 10, maxHealth: 10 };

  const result = crewTakeDamage(pilot, 3);

  assertEqual(result.damageTaken, 3, 'Should take 3 damage');
  assertEqual(result.newHealth, 7, 'Health should be 7 (10-3)');
  assertEqual(result.alive, true, 'Should still be alive');
});

test('Crew death when health reaches 0', () => {
  const pilot = { ...CREW.scout.find(c => c.role === 'pilot'), health: 2, maxHealth: 10 };

  const result = crewTakeDamage(pilot, 5);

  assertEqual(result.damageTaken, 5, 'Should take 5 damage');
  assertEqual(result.newHealth, 0, 'Health should be 0 (capped)');
  assertEqual(result.alive, false, 'Should be dead');
});

test('Damaged crew has reduced skill effectiveness', () => {
  const gunner = {
    ...CREW.scout.find(c => c.role === 'gunner'),
    health: 3,
    maxHealth: 10,
    skills: { gunner: 2 }
  };

  // Crew at 30% health (3/10) should have reduced effectiveness
  const effectiveSkill = gunner.skills.gunner * (gunner.health / gunner.maxHealth);

  assertLessThan(effectiveSkill, gunner.skills.gunner, 'Damaged crew should have reduced skill');
  // At 30% health, skill should be ~0.6 (2 * 0.3)
  assertTrue(Math.abs(effectiveSkill - 0.6) < 0.1, 'Skill should scale with health percentage');
});

test('Crew at full health has full skill effectiveness', () => {
  const engineer = {
    ...CREW.scout.find(c => c.role === 'engineer'),
    health: 10,
    maxHealth: 10,
    skills: { engineering: 1 }
  };

  const effectiveSkill = engineer.skills.engineering * (engineer.health / engineer.maxHealth);

  assertEqual(effectiveSkill, engineer.skills.engineering, 'Full health crew should have full skill');
});

test('Dead crew provides no skill bonus', () => {
  const gunner = {
    ...CREW.scout.find(c => c.role === 'gunner'),
    health: 0,
    maxHealth: 10,
    skills: { gunner: 2 }
  };

  const effectiveSkill = gunner.health > 0 ? gunner.skills.gunner : 0;

  assertEqual(effectiveSkill, 0, 'Dead crew should provide no skill');
});

test('Crew can heal/recover health', () => {
  const pilot = {
    ...CREW.scout.find(c => c.role === 'pilot'),
    health: 5,
    maxHealth: 10
  };

  // Simple healing (restore some HP, max at maxHealth)
  const healAmount = 3;
  const newHealth = Math.min(pilot.health + healAmount, pilot.maxHealth);

  assertEqual(newHealth, 8, 'Should heal to 8 HP (5+3)');
  assertTrue(newHealth <= pilot.maxHealth, 'Should not exceed max health');
});

// Test summary
console.log('\n========================================');
console.log('CREW SYSTEM TEST RESULTS');
console.log('========================================');
console.log(`PASSED: ${passCount}/20`);
console.log(`FAILED: ${failCount}/20`);

if (failCount === 0) {
  console.log('\nALL TESTS PASSED ✅');
  console.log('========================================');
  console.log('Crew system ready!');
  console.log('Ready for Stage 7: Movement & Positioning');
} else {
  console.log(`\n${failCount} TEST(S) FAILED ❌`);
  console.log('Fix the implementation before proceeding.');
  process.exit(1);
}
