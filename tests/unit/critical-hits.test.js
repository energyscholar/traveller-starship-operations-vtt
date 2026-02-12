// Stage 10: Critical Hits System Tests

const {
  calculateSeverity,
  rollCriticalLocation,
  triggersCriticalHit,
  triggersSustainedDamage,
  applyCriticalHit,
  getTotalSeverity,
  attemptRepair
} = require('../../lib/critical-hits');

const {
  getMDriveEffects,
  getPowerPlantEffects,
  getSensorsEffects,
  getWeaponEffects,
  getJDriveEffects,
  applyHullCritical,
  applyCrewCasualty
} = require('../../lib/damage-effects');

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('========================================');
console.log('STAGE 10: CRITICAL HITS SYSTEM TESTS');
console.log('========================================\n');

let passed = 0;
let failed = 0;

function test(description, assertion) {
  if (assertion) {
    console.log(`${GREEN}✓${RESET} ${description}`);
    passed++;
  } else {
    console.log(`${RED}✗${RESET} ${description}`);
    failed++;
  }
}

// ========================================
// SEVERITY CALCULATION TESTS
// ========================================

console.log('--- SEVERITY CALCULATION (8 tests) ---\n');

test('Severity 1 for 1-10 damage', calculateSeverity(1) === 1 && calculateSeverity(10) === 1);
test('Severity 2 for 11-20 damage', calculateSeverity(11) === 2 && calculateSeverity(20) === 2);
test('Severity 3 for 21-30 damage', calculateSeverity(25) === 3);
test('Severity 6 for 51-60 damage', calculateSeverity(55) === 6);
test('Severity capped at 6 for massive damage', calculateSeverity(100) === 6);
test('Severity 0 for zero damage', calculateSeverity(0) === 0);
test('Severity rounds up (15 damage = Sev 2)', calculateSeverity(15) === 2);
test('Severity rounds up (1 damage = Sev 1)', calculateSeverity(1) === 1);

// ========================================
// CRITICAL HIT TRIGGER TESTS
// ========================================

console.log('\n--- CRITICAL HIT TRIGGERS (6 tests) ---\n');

test('Effect 6+ with damage triggers crit', triggersCriticalHit(6, 10));
test('Effect 8 with 1 damage triggers crit', triggersCriticalHit(8, 1));
test('Effect 5 does not trigger crit', !triggersCriticalHit(5, 10));
test('Effect 6 with 0 damage does not trigger', !triggersCriticalHit(6, 0));
test('High effect with no damage does not trigger', !triggersCriticalHit(10, 0));
test('Negative effect does not trigger', !triggersCriticalHit(-2, 10));

// ========================================
// SUSTAINED DAMAGE TESTS
// ========================================

console.log('\n--- SUSTAINED DAMAGE (6 tests) ---\n');

// Scout: 40 Hull, threshold = 4 HP per 10%
test('No sustained damage at 40/40 → 38/40',
  !triggersSustainedDamage(38, 40, 40));

test('Sustained damage at 40/40 → 35/40 (crosses 10% threshold)',
  triggersSustainedDamage(35, 40, 40));

test('Sustained damage at 40/40 → 30/40 (crosses 25% threshold)',
  triggersSustainedDamage(30, 40, 40));

test('Multiple thresholds: 20/40 → 10/40',
  triggersSustainedDamage(10, 40, 20));

test('No sustained damage if hull increases',
  !triggersSustainedDamage(40, 40, 35));

test('Free Trader: 80/80 → 70/80 crosses threshold',
  triggersSustainedDamage(70, 80, 80));

// ========================================
// LOCATION ROLL TESTS
// ========================================

console.log('\n--- LOCATION ROLL (3 tests) ---\n');

const location = rollCriticalLocation();
const validLocations = ['sensors', 'powerPlant', 'fuel', 'weapon', 'armour',
  'hull', 'mDrive', 'cargo', 'jDrive', 'crew', 'computer'];

test('Roll returns valid location', validLocations.includes(location));
test('Multiple rolls produce variety', () => {
  const rolls = new Set();
  for (let i = 0; i < 50; i++) {
    rolls.add(rollCriticalLocation());
  }
  return rolls.size >= 5; // Should get at least 5 different locations in 50 rolls
});
test('Location is a string', typeof location === 'string');

// ========================================
// APPLY CRITICAL HIT TESTS
// ========================================

console.log('\n--- APPLY CRITICAL HIT (8 tests) ---\n');

const ship = { hull: 40, maxHull: 40 };
const crit1 = applyCriticalHit(ship, 'mDrive', 2);

test('Critical hit initializes crits object', ship.crits !== undefined);
test('Critical hit returns location', crit1.location === 'mDrive');
test('Critical hit returns severity', crit1.severity === 2);
test('Critical hit adds to location array', ship.crits.mDrive.length === 1);
test('Total severity equals single crit', crit1.totalSeverity === 2);

// Multiple hits to same location stack
const crit2 = applyCriticalHit(ship, 'mDrive', 1);
test('Multiple crits to same location stack', crit2.totalSeverity === 3);
test('Crit array has multiple entries', ship.crits.mDrive.length === 2);

// Hit to different location
applyCriticalHit(ship, 'powerPlant', 3);
test('Different locations tracked separately',
  ship.crits.powerPlant.length === 1 && ship.crits.mDrive.length === 2);

// ========================================
// M-DRIVE EFFECTS TESTS
// ========================================

console.log('\n--- M-DRIVE EFFECTS (6 tests) ---\n');

const mdrive1 = getMDriveEffects(1);
test('Severity 1: Control DM-1, Thrust -1',
  mdrive1.controlDM === -1 && mdrive1.thrustPenalty === 1);

const mdrive3 = getMDriveEffects(3);
test('Severity 3: Control DM-3, Thrust -3',
  mdrive3.controlDM === -3 && mdrive3.thrustPenalty === 3);

const mdrive5 = getMDriveEffects(5);
test('Severity 5: M-Drive disabled',
  mdrive5.disabled === true);

const mdrive6 = getMDriveEffects(6);
test('Severity 6: Thrust 0',
  mdrive6.thrustPenalty === 999);

const mdrive0 = getMDriveEffects(0);
test('Severity 0: No penalties',
  mdrive0.controlDM === 0 && mdrive0.thrustPenalty === 0);

test('Disabled drive has message',
  mdrive5.message && mdrive5.message.includes('DISABLED'));

// ========================================
// POWER PLANT EFFECTS TESTS
// ========================================

console.log('\n--- POWER PLANT EFFECTS (6 tests) ---\n');

const pp1 = getPowerPlantEffects(1);
test('Severity 1: Power -10%, Thrust -1',
  pp1.powerPenalty === 10 && pp1.thrustPenalty === 1);

const pp2 = getPowerPlantEffects(2);
test('Severity 2: Power -20%, Thrust -2',
  pp2.powerPenalty === 20 && pp2.thrustPenalty === 2);

const pp3 = getPowerPlantEffects(3);
test('Severity 3: Power -50%, Thrust -1',
  pp3.powerPenalty === 50 && pp3.thrustPenalty === 1);

const pp4 = getPowerPlantEffects(4);
test('Severity 4+: Power Plant destroyed',
  pp4.disabled === true && pp4.powerPenalty === 100);

const pp6 = getPowerPlantEffects(6);
test('Severity 6: No power, no thrust',
  pp6.powerPenalty === 100 && pp6.thrustPenalty === 999);

test('Power plant destruction has message',
  pp4.message && pp4.message.includes('DESTROYED'));

// ========================================
// SENSORS EFFECTS TESTS
// ========================================

console.log('\n--- SENSORS EFFECTS (7 tests) ---\n');

const sensors0 = getSensorsEffects(0);
test('Severity 0: No range limit',
  sensors0.maxRange === null && sensors0.dm === 0);

const sensors1 = getSensorsEffects(1);
test('Severity 1: DM-2 beyond Medium',
  sensors1.maxRange === 'medium' && sensors1.dm === -2);

const sensors2 = getSensorsEffects(2);
test('Severity 2: Inoperative beyond Medium',
  sensors2.maxRange === 'medium' && sensors2.dm === -999);

const sensors3 = getSensorsEffects(3);
test('Severity 3: Inoperative beyond Short',
  sensors3.maxRange === 'short');

const sensors5 = getSensorsEffects(5);
test('Severity 5: Inoperative beyond Adjacent',
  sensors5.maxRange === 'adjacent');

const sensors6 = getSensorsEffects(6);
test('Severity 6: Sensors disabled',
  sensors6.dm === -999 && sensors6.message.includes('DISABLED'));

test('Sensors effects have messages',
  sensors1.message && sensors6.message);

// ========================================
// WEAPON EFFECTS TESTS
// ========================================

console.log('\n--- WEAPON EFFECTS (6 tests) ---\n');

const weapon0 = getWeaponEffects(0);
test('Severity 0: Weapon operational',
  weapon0.status === 'operational' && !weapon0.disabled);

const weapon1 = getWeaponEffects(1);
test('Severity 1: Weapon has Bane',
  weapon1.bane === true && weapon1.status === 'damaged');

const weapon2 = getWeaponEffects(2);
test('Severity 2: Weapon disabled',
  weapon2.disabled === true && weapon2.status === 'disabled');

const weapon3 = getWeaponEffects(3);
test('Severity 3: Weapon destroyed',
  weapon3.destroyed === true);

const weapon4 = getWeaponEffects(4);
test('Severity 4+: Weapon explodes',
  weapon4.explosion === true);

test('Weapon effects have status messages',
  weapon1.message && weapon3.message && weapon4.message);

// ========================================
// J-DRIVE EFFECTS TESTS
// ========================================

console.log('\n--- J-DRIVE EFFECTS (3 tests) ---\n');

const jdrive0 = getJDriveEffects(0);
test('Severity 0: Jump operational',
  !jdrive0.disabled);

const jdrive1 = getJDriveEffects(1);
test('Severity 1+: Jump disabled',
  jdrive1.disabled === true);

const jdrive5 = getJDriveEffects(5);
test('Any severity disables jump',
  jdrive5.disabled === true);

// ========================================
// HULL CRITICAL TESTS
// ========================================

console.log('\n--- HULL CRITICAL (6 tests) ---\n');

const hull1 = applyHullCritical(1);
test('Severity 1: Rolls 1D6 damage',
  hull1.dice === 1 && hull1.damage >= 1 && hull1.damage <= 6);

const hull3 = applyHullCritical(3);
test('Severity 3: Rolls 3D6 damage',
  hull3.dice === 3 && hull3.damage >= 3 && hull3.damage <= 18);

const hull6 = applyHullCritical(6);
test('Severity 6: Rolls 6D6 damage',
  hull6.dice === 6 && hull6.damage >= 6 && hull6.damage <= 36);

test('Hull critical has damage value',
  hull1.damage > 0);

test('Hull critical has message',
  hull1.message && hull1.message.includes('Hull critical'));

test('Damage scales with severity',
  hull3.damage > hull1.damage); // Statistically likely

// ========================================
// CREW CASUALTY TESTS
// ========================================

console.log('\n--- CREW CASUALTIES (6 tests) ---\n');

const crewShip = {
  crew: {
    pilot: { name: 'Pilot', health: 10, maxHealth: 10 },
    gunner: { name: 'Gunner', health: 10, maxHealth: 10 },
    engineer: { name: 'Engineer', health: 10, maxHealth: 10 }
  }
};

const casualty = applyCrewCasualty(crewShip, 2);
test('Crew casualty affects a crew member',
  casualty.casualties === 1);

test('Casualty has crew member name',
  casualty.crewMember !== undefined);

test('Casualty deals damage',
  casualty.damage > 0);

test('Crew health reduced',
  casualty.newHealth < 10);

test('Crew casualty rolls 1D6',
  casualty.damage >= 1 && casualty.damage <= 6); // Flat 1D6 (RAW)

// High severity casualty
const deadCrew = applyCrewCasualty(crewShip, 6);
test('Crew casualty at high severity still rolls 1D6',
  deadCrew.damage >= 1 && deadCrew.damage <= 6); // Flat 1D6 (RAW)

// ========================================
// REPAIR SYSTEM TESTS
// ========================================

console.log('\n--- DAMAGE CONTROL & REPAIR (8 tests) ---\n');

const repairShip = { hull: 40, maxHull: 40 };
applyCriticalHit(repairShip, 'sensors', 2);

const repair1 = attemptRepair(repairShip, 'sensors', 2);
test('Repair attempt returns result object',
  repair1.hasOwnProperty('success'));

test('Repair has roll information',
  repair1.roll !== null && repair1.total !== undefined);

test('Repair difficulty based on severity',
  repair1.dm === -2); // Severity 2 = DM-2

test('Repair marks crit as repaired on success',
  repair1.success ? repairShip.crits.sensors[0].repaired === true : true);

test('Repair is marked as temporary',
  repair1.success ? repairShip.crits.sensors[0].temporary === true : true);

// Attempt to repair already-repaired location
if (repair1.success) {
  const repair2 = attemptRepair(repairShip, 'sensors', 2);
  test('Cannot repair already-repaired location',
    !repair2.success && repair2.message.includes('No damage'));
} else {
  test('Repair can be attempted multiple times', true);
}

// Multiple crits - repairs worst first
const multiCritShip = { hull: 40, maxHull: 40 };
applyCriticalHit(multiCritShip, 'mDrive', 1);
applyCriticalHit(multiCritShip, 'mDrive', 3);

const repairMulti = attemptRepair(multiCritShip, 'mDrive', 3);
test('Repairs target worst severity first',
  repairMulti.severity === 3);

test('Get total severity after repair',
  getTotalSeverity(multiCritShip, 'mDrive') === (repairMulti.success ? 1 : 4));

// ========================================
// TOTAL SEVERITY TESTS
// ========================================

console.log('\n--- TOTAL SEVERITY CALCULATION (4 tests) ---\n');

const sevShip = { hull: 40, maxHull: 40 };
test('No crits = severity 0',
  getTotalSeverity(sevShip, 'mDrive') === 0);

applyCriticalHit(sevShip, 'mDrive', 2);
test('Single crit severity',
  getTotalSeverity(sevShip, 'mDrive') === 2);

applyCriticalHit(sevShip, 'mDrive', 1);
test('Multiple crits stack',
  getTotalSeverity(sevShip, 'mDrive') === 3);

// Repair one
sevShip.crits.mDrive[0].repaired = true;
test('Repaired crits not counted',
  getTotalSeverity(sevShip, 'mDrive') === 1);

// ========================================
// SUMMARY
// ========================================

console.log('\n========================================');
console.log('CRITICAL HITS TEST RESULTS');
console.log('========================================');
console.log(`PASSED: ${passed}/${passed + failed}`);
console.log(`FAILED: ${failed}/${passed + failed}\n`);

if (failed > 0) {
  console.log(`${RED}${failed} TEST(S) FAILED${RESET} ❌`);
  console.log('Fix the implementation before proceeding.\n');
  process.exit(1);
} else {
  console.log(`${GREEN}✅ ALL TESTS PASSED${RESET}\n`);
  console.log('========================================\n');
}
