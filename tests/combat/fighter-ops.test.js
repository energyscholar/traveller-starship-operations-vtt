/**
 * Fighter Operations Tests
 * C2: Launch, alpha strike, recover, friendly fire
 */

const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    if (!process.env.TEST_QUIET) console.log(`  PASS: ${name}`);
  } catch (error) {
    testsFailed++;
    console.error(`  FAIL: ${name}`);
    console.error(`    ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Not equal'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log('Fighter Operations Tests');
console.log('='.repeat(50));

const {
  getFighterTemplate,
  createFighterContact,
  getAvailableCallsigns,
  resolveAlphaStrike,
  resolveFriendlyFire
} = require('../../lib/operations/fighter-ops');

// ─── Fighter Template ──────────────────────────────────────

console.log('\n--- Fighter Template ---');

test('fighter template loads', () => {
  const t = getFighterTemplate();
  assert(t, 'Template should exist');
  assertEqual(t.id, 'light_fighter', 'ID should be light_fighter');
});

test('fighter has missile rack primary', () => {
  const t = getFighterTemplate();
  const missile = t.weapons.find(w => w.weapons.includes('missile_rack'));
  assert(missile, 'Should have missile rack');
  assertEqual(missile.damage, '4d6', 'Missile should do 4d6');
});

test('fighter has pulse laser secondary', () => {
  const t = getFighterTemplate();
  const laser = t.weapons.find(w => w.weapons.includes('pulse_laser'));
  assert(laser, 'Should have pulse laser');
  assertEqual(laser.damage, '2d6', 'Laser should do 2d6');
});

test('fighter has 4 hull points', () => {
  const t = getFighterTemplate();
  assertEqual(t.hull.hullPoints, 4, 'HP');
});

test('fighter has armor 0', () => {
  const t = getFighterTemplate();
  assertEqual(t.armour.rating, 0, 'Armor');
});

test('fighter has thrust 6', () => {
  const t = getFighterTemplate();
  assertEqual(t.thrust, 6, 'Thrust');
});

test('fighter has 6 named pilots', () => {
  const t = getFighterTemplate();
  assertEqual(t.squadron.callsigns.length, 6, 'Should have 6 callsigns');
  assert(t.squadron.callsigns.includes('Hardpoint'), 'Should include Hardpoint');
  assert(t.squadron.callsigns.includes('Ghost'), 'Should include Ghost');
});

test('fighter squadron has gunner_skill 2', () => {
  const t = getFighterTemplate();
  assertEqual(t.squadron.gunner_skill, 2, 'Gunner skill');
});

// ─── Create Fighter Contact ───────────────────────────────

console.log('\n--- Create Fighter Contact ---');

test('createFighterContact returns valid contact', () => {
  const c = createFighterContact('Hardpoint', 0);
  assertEqual(c.id, 'fighter_hardpoint', 'ID');
  assert(c.name.includes('Hardpoint'), 'Name should include callsign');
  assertEqual(c.disposition, 'friendly', 'Disposition');
  assertEqual(c.health, 4, 'Health');
  assertEqual(c.armor, 0, 'Armor');
  assertEqual(c.gunner_skill, 2, 'Gunner skill');
  assert(c.auto_fire === true, 'Auto fire should be enabled');
});

test('createFighterContact has weapons', () => {
  const c = createFighterContact('Whisper', 1);
  assertEqual(c.weapons.length, 2, 'Should have 2 weapons');
  assert(c.weapons.some(w => w.name === 'Missile Rack'), 'Should have missile rack');
  assert(c.weapons.some(w => w.name === 'Pulse Laser'), 'Should have pulse laser');
});

test('createFighterContact uses provided range band', () => {
  const c = createFighterContact('Brick', 2, 'extreme');
  assertEqual(c.range_band, 'extreme', 'Range band');
});

// ─── Available Callsigns ──────────────────────────────────

console.log('\n--- Available Callsigns ---');

test('getAvailableCallsigns returns all 6 when none launched', () => {
  const available = getAvailableCallsigns([]);
  assertEqual(available.length, 6, 'Count');
});

test('getAvailableCallsigns excludes launched fighters', () => {
  const available = getAvailableCallsigns(['fighter_hardpoint', 'fighter_ghost']);
  assertEqual(available.length, 4, 'Count');
  assert(!available.includes('Hardpoint'), 'Should not include Hardpoint');
  assert(!available.includes('Ghost'), 'Should not include Ghost');
});

test('getAvailableCallsigns returns empty when all launched', () => {
  const allIds = ['fighter_hardpoint', 'fighter_whisper', 'fighter_brick',
                  'fighter_ghost', 'fighter_preacher', 'fighter_dice'];
  const available = getAvailableCallsigns(allIds);
  assertEqual(available.length, 0, 'Count');
});

// ─── Alpha Strike ─────────────────────────────────────────

console.log('\n--- Alpha Strike ---');

test('resolveAlphaStrike returns results for each fighter', () => {
  const fighters = [
    createFighterContact('Hardpoint', 0, 'long'),
    createFighterContact('Whisper', 1, 'long')
  ];
  const target = { name: 'Corsair Alpha', range_band: 'long', armor: 3, health: 40, max_health: 40 };
  const result = resolveAlphaStrike(fighters, target, 'missile');
  assert(result.results.length > 0, 'Should have results');
  assert(typeof result.totalDamage === 'number', 'Should have total damage');
  assert(typeof result.hits === 'number', 'Should have hit count');
  assert(result.narration.length > 0, 'Should have narration');
});

test('resolveAlphaStrike with empty fighters returns empty', () => {
  const target = { name: 'Test', health: 10, max_health: 10 };
  const result = resolveAlphaStrike([], target);
  assertEqual(result.results.length, 0, 'No results');
  assertEqual(result.totalDamage, 0, 'No damage');
});

test('resolveAlphaStrike with no target returns empty', () => {
  const fighters = [createFighterContact('Hardpoint', 0)];
  const result = resolveAlphaStrike(fighters, null);
  assertEqual(result.results.length, 0, 'No results');
});

test('resolveAlphaStrike skips destroyed fighters', () => {
  const fighter = createFighterContact('Hardpoint', 0);
  fighter.health = 0;
  const target = { name: 'Test', health: 10, max_health: 10, range_band: 'long' };
  const result = resolveAlphaStrike([fighter], target);
  assertEqual(result.results.length, 0, 'Should skip destroyed');
});

test('resolveAlphaStrike narration includes fighter count and target', () => {
  const fighters = [createFighterContact('Hardpoint', 0)];
  const target = { name: 'Corsair Bravo', range_band: 'long', armor: 2, health: 30, max_health: 30 };
  const result = resolveAlphaStrike(fighters, target, 'missile');
  assert(result.narration.includes('1 Tlatl fighter'), 'Should mention count');
  assert(result.narration.includes('Corsair Bravo'), 'Should mention target');
});

test('resolveAlphaStrike with weaponType=all fires all weapons', () => {
  const fighters = [createFighterContact('Hardpoint', 0, 'long')];
  const target = { name: 'Test', range_band: 'medium', armor: 0, health: 30, max_health: 30 };
  const result = resolveAlphaStrike(fighters, target, 'all');
  // Should fire both missile rack and pulse laser
  assertEqual(result.results.length, 2, 'Should fire 2 weapons');
});

// ─── Friendly Fire ────────────────────────────────────────

console.log('\n--- Friendly Fire ---');

test('resolveFriendlyFire resolves attacks from friendly craft', () => {
  const fighters = [createFighterContact('Hardpoint', 0, 'long')];
  const target = { name: 'Enemy', range_band: 'long', armor: 0, health: 20, max_health: 20 };
  const results = resolveFriendlyFire(fighters, target);
  assert(results.length > 0, 'Should have results');
});

test('resolveFriendlyFire skips non-friendly', () => {
  const fighter = createFighterContact('Hardpoint', 0);
  fighter.disposition = 'hostile';
  const target = { name: 'Test', health: 10, max_health: 10 };
  const results = resolveFriendlyFire([fighter], target);
  assertEqual(results.length, 0, 'Should skip hostile');
});

test('resolveFriendlyFire returns empty with no target', () => {
  const fighters = [createFighterContact('Hardpoint', 0)];
  const results = resolveFriendlyFire(fighters, null);
  assertEqual(results.length, 0, 'Should be empty');
});

// ─── BattleState.removeContact ────────────────────────────

console.log('\n--- BattleState.removeContact ---');

test('removeContact removes a contact', () => {
  const { BattleState } = require('../../lib/operations/BattleState');
  const state = new BattleState();
  state.transition('COMBAT');
  state.addContact({ id: 'test1', name: 'Test Contact', type: 'ship' });
  assert(state.getContact('test1') !== null, 'Contact should exist');
  const removed = state.removeContact('test1');
  assert(removed === true, 'Should return true');
  assert(state.getContact('test1') === null, 'Contact should be gone');
});

test('removeContact returns false for missing contact', () => {
  const { BattleState } = require('../../lib/operations/BattleState');
  const state = new BattleState();
  state.transition('COMBAT');
  const removed = state.removeContact('nonexistent');
  assert(removed === false, 'Should return false');
});

// ─── Summary ──────────────────────────────────────────────

console.log('\n' + '='.repeat(50));
console.log(`PASSED: ${testsPassed}/${testsPassed + testsFailed}`);
if (testsFailed > 0) {
  console.log(`FAILED: ${testsFailed}`);
  process.exit(1);
}
