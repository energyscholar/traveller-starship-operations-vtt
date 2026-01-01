/**
 * Combat Display Unit Tests
 * Tests ASCII combat display renderer functions
 */

const {
  renderCombatDisplay,
  renderCombatStatus,
  renderAttackLog,
  progressBar,
  formatModifiers,
  // Narrator functions (AR-207)
  narratePhaseChange,
  narrateAttack,
  narrateDamage,
  narrateCritical,
  narrateReaction,
  narrateCombatStart,
  narrateCombatEnd,
  narrateEvasive
} = require('../e2e/helpers/combat-display');

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log('========================================');
console.log('COMBAT DISPLAY UNIT TESTS');
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

function assertEqual(actual, expected, description) {
  const result = actual === expected;
  if (!result) {
    console.log(`${RED}✗${RESET} ${description}`);
    console.log(`  Expected: ${expected}`);
    console.log(`  Actual:   ${actual}`);
    failed++;
  } else {
    console.log(`${GREEN}✓${RESET} ${description}`);
    passed++;
  }
}

// ========================================
// PROGRESS BAR TESTS
// ========================================

console.log('--- PROGRESS BAR (6 tests) ---\n');

assertEqual(progressBar(100, 100, 10), '██████████', 'Full bar at 100%');
assertEqual(progressBar(50, 100, 10), '█████░░░░░', 'Half bar at 50%');
assertEqual(progressBar(0, 100, 10), '░░░░░░░░░░', 'Empty bar at 0%');
assertEqual(progressBar(25, 100, 4), '█░░░', 'Quarter bar width 4');
assertEqual(progressBar(0, 0, 10), '░░░░░░░░░░', 'Zero max shows empty');
assertEqual(progressBar(150, 100, 10), '██████████', 'Over 100% caps at full');

// ========================================
// FORMAT MODIFIERS TESTS
// ========================================

console.log('\n--- FORMAT MODIFIERS (5 tests) ---\n');

assertEqual(
  formatModifiers({ skill: 2, range: -1 }),
  '+2skill -1range',
  'Basic skill and range modifiers'
);

assertEqual(
  formatModifiers({ skill: 0, range: 0 }),
  '',
  'Zero modifiers returns empty'
);

assertEqual(
  formatModifiers({ skill: 3, range: -2, evasive: -2 }),
  '+3skill -2range -2evade',
  'Includes evasive modifier'
);

assertEqual(
  formatModifiers({ calledShot: -4 }),
  '-4called',
  'Called shot penalty'
);

assertEqual(
  formatModifiers(null),
  '',
  'Null modifiers returns empty'
);

// ========================================
// ATTACK LOG TESTS
// ========================================

console.log('\n--- ATTACK LOG (6 tests) ---\n');

const hitResult = {
  hit: true,
  weapon: 'Particle Barbette',
  target: 'Pirate',
  total: 10,
  actualDamage: 15,
  damageType: 'hull'
};
test('Hit shows [HIT] prefix', renderAttackLog(hitResult).startsWith('[HIT]'));
test('Hit includes damage', renderAttackLog(hitResult).includes('15dmg'));

const missResult = {
  hit: false,
  weapon: 'Laser',
  target: 'Corsair',
  total: 5
};
test('Miss shows [MISS] prefix', renderAttackLog(missResult).startsWith('[MISS]'));
test('Miss has no damage suffix', !renderAttackLog(missResult).includes('dmg'));

const ionResult = {
  hit: true,
  weapon: 'Ion Barbette',
  target: 'Raider',
  total: 9,
  damageType: 'ion',
  powerDrain: 140
};
test('Ion shows power drain', renderAttackLog(ionResult).includes('140pwr'));

const critResult = {
  hit: true,
  weapon: 'Particle',
  target: 'Scout',
  total: 14,
  actualDamage: 25,
  critical: true
};
test('Critical shows CRIT!', renderAttackLog(critResult).includes('CRIT!'));

// ========================================
// COMBAT STATUS TESTS
// ========================================

console.log('\n--- COMBAT STATUS (3 tests) ---\n');

const combatState = {
  phase: 'attack',
  round: 3,
  combatants: [{ name: 'Pirate' }, { name: 'Corsair' }]
};

const status = renderCombatStatus(combatState);
test('Status shows round', status.includes('R3'));
test('Status shows phase', status.includes('ATTACK'));
test('Status shows contact count', status.includes('2 contacts'));

// ========================================
// FULL DISPLAY TESTS
// ========================================

console.log('\n--- FULL DISPLAY (5 tests) ---\n');

const fullCombatState = {
  phase: 'attack',
  round: 2,
  combatants: [{
    name: 'Pirate Corsair',
    range_band: 'medium',
    range_km: 5000,
    health: 40,
    max_health: 80,
    power: 60,
    max_power: 100
  }]
};

const shipState = {
  name: 'Amishi',
  hull: 85,
  maxHull: 100,
  power: 100,
  maxPower: 100,
  evasive: false
};

const lastAction = {
  hit: true,
  roll: 9,
  dice: [5, 4],
  modifiers: { skill: 2, range: 0 },
  total: 11,
  damage: 20,
  armorReduction: 5,
  actualDamage: 15,
  damageType: 'hull',
  attacker: 'Amishi',
  target: 'Pirate Corsair',
  weapon: 'Particle Barbette'
};

const display = renderCombatDisplay(fullCombatState, shipState, lastAction);

test('Display contains header box', display.includes('╔') && display.includes('╗'));
test('Display shows round and phase', display.includes('ROUND 2') && display.includes('ATTACK'));
test('Display shows combatant name', display.includes('Pirate Corsair'));
test('Display shows ship name', display.includes('Amishi'));
test('Display shows damage breakdown', display.includes('15') || display.includes('hull'));

// ========================================
// EDGE CASES
// ========================================

console.log('\n--- EDGE CASES (4 tests) ---\n');

const emptyState = {};
const emptyDisplay = renderCombatDisplay(emptyState, {}, null);
test('Handles empty combat state', emptyDisplay.includes('ROUND 1'));

const nullDisplay = renderCombatDisplay(null, null, null);
test('Handles null inputs', nullDisplay.includes('ROUND 1'));

const noActionDisplay = renderCombatDisplay(fullCombatState, shipState, null);
test('Handles no last action', noActionDisplay.includes('no actions'));

const emptyLog = renderAttackLog(null);
test('Empty attack log returns empty string', emptyLog === '');

// ========================================
// NARRATOR TESTS (AR-207)
// ========================================

console.log('\n--- PHASE NARRATOR (4 tests) ---\n');

assertEqual(
  narratePhaseChange('manoeuvre', 3),
  '═══ ROUND 3 ═══\nMANOEUVRE PHASE - Pilots may take evasive action.',
  'Manoeuvre phase with round header'
);

test('Attack phase no round header', !narratePhaseChange('attack', 2).includes('ROUND'));
test('Attack phase description', narratePhaseChange('attack', 2).includes('Gunners may fire'));
test('Unknown phase fallback', narratePhaseChange('custom', 1).includes('CUSTOM PHASE'));

console.log('\n--- ATTACK NARRATOR (5 tests) ---\n');

const hitAttack = {
  attacker: 'Amishi',
  target: 'Pirate',
  weapon: 'Particle Barbette',
  hit: true,
  total: 10,
  dice: [5, 5],
  damageType: 'hull',
  actualDamage: 15
};
test('Hit attack includes attacker', narrateAttack(hitAttack).includes('Amishi fires'));
test('Hit attack includes HIT', narrateAttack(hitAttack).includes('HIT!'));
test('Hit attack includes damage', narrateAttack(hitAttack).includes('15 hull damage'));

const missAttack = { attacker: 'Scout', target: 'Raider', weapon: 'Laser', hit: false, total: 5, dice: [2, 3] };
test('Miss attack includes MISS', narrateAttack(missAttack).includes('MISS'));

const ionAttack = { attacker: 'Amishi', target: 'Pirate', weapon: 'Ion', hit: true, total: 9, dice: [4, 5], damageType: 'ion', powerDrain: 140 };
test('Ion attack shows power drain', narrateAttack(ionAttack).includes('140 power drained'));

console.log('\n--- DAMAGE NARRATOR (4 tests) ---\n');

test('Destroyed target', narrateDamage('Corsair', { destroyed: true }) === 'Corsair DESTROYED!');
test('Hull critical', narrateDamage('Pirate', { hullPercent: 20 }).includes('hull critical'));
test('Power degraded', narrateDamage('Raider', { powerPercent: 45 }).includes('weapons at -2 DM'));
test('Empty damage returns empty', narrateDamage('Ship', {}) === '');

console.log('\n--- CRITICAL NARRATOR (3 tests) ---\n');

test('Critical with location', narrateCritical({ location: 'mDrive', severity: 2 }).includes('M-Drive'));
test('Critical with severity', narrateCritical({ location: 'sensors', severity: 1 }).includes('Severity 1'));
test('Null critical returns empty', narrateCritical(null) === '');

console.log('\n--- REACTION NARRATOR (4 tests) ---\n');

test('Sandcaster success', narrateReaction('sandcaster', { success: true, armorBonus: 3 }).includes('+3'));
test('Sandcaster fail', narrateReaction('sandcaster', { success: false }).includes('no effect'));
test('Point defense intercept', narrateReaction('pointDefense', { intercepted: true }).includes('intercepts'));
test('Unknown type returns empty', narrateReaction('unknown', {}) === '');

console.log('\n--- COMBAT START/END/EVASIVE (4 tests) ---\n');

test('Combat start shows count', narrateCombatStart(3).includes('3 contacts'));
test('Combat end shows outcome', narrateCombatEnd('Victory!').includes('Victory!'));
test('Evasive enabled', narrateEvasive('Amishi', true).includes('-2 to incoming'));
test('Evasive disabled', narrateEvasive('Amishi', false).includes('normal flight'));

// ========================================
// SUMMARY
// ========================================

console.log('\n========================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
