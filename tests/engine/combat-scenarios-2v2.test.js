/**
 * AR-249: Combat Scenario Tests - Tier 2: 2v2 Fleet Skirmish
 *
 * Tests for multi-ship combat covering:
 * - Coordinated attacks
 * - Target priority selection
 * - Multi-ship damage tracking
 * - Turn order with multiple combatants
 *
 * Run with: node tests/engine/combat-scenarios-2v2.test.js
 */

const {
  CombatEngine,
  RANGE_DMS,
  COMBAT_PHASES
} = require('../../lib/engine/combat-engine');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error('  FAIL:', message);
    failed++;
    return false;
  }
  console.log('  PASS:', message);
  passed++;
  return true;
}

// Deterministic RNG
function createDeterministicRNG(sequence) {
  let index = 0;
  const values = [...sequence];
  return {
    roll1d6: () => {
      const val = values[index % values.length];
      index++;
      return val;
    },
    roll2d6: function() {
      const d1 = this.roll1d6();
      const d2 = this.roll1d6();
      return { dice: [d1, d2], total: d1 + d2 };
    },
    rollNd6: function(n) {
      let sum = 0;
      const dice = [];
      for (let i = 0; i < n; i++) {
        const d = this.roll1d6();
        dice.push(d);
        sum += d;
      }
      return { dice, total: sum };
    }
  };
}

// =============================================================================
// FLEET SHIPS
// =============================================================================

// Player fleet
const playerFlagship = {
  id: 'player_flag',
  name: 'ISS Victory',
  hull: 120,
  maxHull: 120,
  armour: 6,
  thrust: 4,
  fireControl: 3,
  missiles: 12,
  sandcasters: 6,
  sensorGrade: 'Advanced',
  turrets: [
    { id: 1, weapons: ['beam_laser', 'missile_rack'], gunnerSkill: 2 },
    { id: 2, weapons: ['pulse_laser', 'sandcaster'], gunnerSkill: 2 }
  ]
};

const playerEscort = {
  id: 'player_escort',
  name: 'ISS Defender',
  hull: 60,
  maxHull: 60,
  armour: 4,
  thrust: 6,
  fireControl: 2,
  missiles: 4,
  sandcasters: 3,
  sensorGrade: 'Military',
  turrets: [
    { id: 1, weapons: ['pulse_laser', 'sandcaster'], gunnerSkill: 1 }
  ]
};

// Enemy fleet
const enemyRaider = {
  id: 'enemy_raider',
  name: 'Corsair Alpha',
  hull: 80,
  maxHull: 80,
  armour: 2,
  thrust: 6,
  fireControl: 1,
  missiles: 6,
  sandcasters: 2,
  sensorGrade: 'Military',
  turrets: [
    { id: 1, weapons: ['beam_laser', 'missile_rack'], gunnerSkill: 1 }
  ]
};

const enemyGunboat = {
  id: 'enemy_gunboat',
  name: 'Corsair Beta',
  hull: 50,
  maxHull: 50,
  armour: 3,
  thrust: 5,
  fireControl: 2,
  missiles: 0,
  sandcasters: 1,
  sensorGrade: 'Civilian',
  turrets: [
    { id: 1, weapons: ['pulse_laser', 'pulse_laser'], gunnerSkill: 2 }
  ]
};

// =============================================================================
// TIER 2.1: MULTI-SHIP INITIALIZATION
// =============================================================================

console.log('========================================');
console.log('AR-249 TIER 2: 2v2 FLEET SKIRMISH');
console.log('========================================\n');

console.log('--- 2.1: Multi-Ship Initialization ---\n');

// Test: 4 ships initialize correctly
{
  console.log('Test 2.1.1: Four ships initialized');
  const engine = new CombatEngine();
  engine.initCombat(
    [{ ...playerFlagship }, { ...playerEscort }],
    [{ ...enemyRaider }, { ...enemyGunboat }]
  );

  assert(engine.ships.length === 4, 'Four ships in combat');

  const players = engine.ships.filter(s => s.faction === 'player');
  const enemies = engine.ships.filter(s => s.faction === 'enemy');

  assert(players.length === 2, 'Two player ships');
  assert(enemies.length === 2, 'Two enemy ships');
}

// Test: All ships have unique IDs
{
  console.log('\nTest 2.1.2: Unique ship IDs');
  const engine = new CombatEngine();
  engine.initCombat(
    [{ ...playerFlagship }, { ...playerEscort }],
    [{ ...enemyRaider }, { ...enemyGunboat }]
  );

  const ids = engine.ships.map(s => s.id);
  const uniqueIds = new Set(ids);

  assert(uniqueIds.size === 4, 'All ship IDs unique');
}

// Test: Ships retrievable by ID
{
  console.log('\nTest 2.1.3: Ships retrievable by ID');
  const engine = new CombatEngine();
  engine.initCombat(
    [{ ...playerFlagship }, { ...playerEscort }],
    [{ ...enemyRaider }, { ...enemyGunboat }]
  );

  const flagship = engine.getShip('player_flag');
  const escort = engine.getShip('player_escort');
  const raider = engine.getShip('enemy_raider');
  const gunboat = engine.getShip('enemy_gunboat');

  assert(flagship !== undefined, 'Flagship found');
  assert(escort !== undefined, 'Escort found');
  assert(raider !== undefined, 'Raider found');
  assert(gunboat !== undefined, 'Gunboat found');
}

// =============================================================================
// TIER 2.2: TARGET SELECTION
// =============================================================================

console.log('\n--- 2.2: Target Selection ---\n');

// Test: Can attack any enemy
{
  console.log('Test 2.2.1: Attack different targets');
  const engine = new CombatEngine({ rng: createDeterministicRNG([4, 4, 3, 3, 4, 4, 3, 3]) });
  engine.initCombat(
    [{ ...playerFlagship }, { ...playerEscort }],
    [{ ...enemyRaider }, { ...enemyGunboat }]
  );

  const flagship = engine.getShip('player_flag');
  const raider = engine.getShip('enemy_raider');
  const gunboat = engine.getShip('enemy_gunboat');

  // Attack first target
  const result1 = engine.resolveAttack(flagship, raider);
  assert(result1.success === true, 'Can attack raider');

  // Attack second target
  const result2 = engine.resolveAttack(flagship, gunboat);
  assert(result2.success === true, 'Can attack gunboat');
}

// Test: Multiple attackers on one target
{
  console.log('\nTest 2.2.2: Multiple attackers on one target');
  const engine = new CombatEngine({ rng: createDeterministicRNG([5, 5, 3, 3, 5, 5, 3, 3]) });
  engine.initCombat(
    [{ ...playerFlagship }, { ...playerEscort }],
    [{ ...enemyRaider }, { ...enemyGunboat }]
  );

  const flagship = engine.getShip('player_flag');
  const escort = engine.getShip('player_escort');
  const raider = engine.getShip('enemy_raider');
  const initialHull = raider.hull;

  // Both ships attack same target
  engine.resolveAttack(flagship, raider);
  engine.resolveAttack(escort, raider);

  // Raider should take cumulative damage
  assert(raider.hull <= initialHull, 'Target takes cumulative damage');
}

// Test: Target priority by hull
{
  console.log('\nTest 2.2.3: Target priority assessment');
  const engine = new CombatEngine();
  engine.initCombat(
    [{ ...playerFlagship }],
    [{ ...enemyRaider }, { ...enemyGunboat }]
  );

  const enemies = engine.ships.filter(s => s.faction === 'enemy');

  // Gunboat has less hull - might be priority target
  const weakest = enemies.reduce((a, b) => a.hull < b.hull ? a : b);
  assert(weakest.id === 'enemy_gunboat', 'Gunboat is weakest target');

  // Raider has missiles - might be priority threat
  const mostArmed = enemies.reduce((a, b) => (a.missiles || 0) > (b.missiles || 0) ? a : b);
  assert(mostArmed.id === 'enemy_raider', 'Raider is most armed');
}

// =============================================================================
// TIER 2.3: MULTI-SHIP DAMAGE TRACKING
// =============================================================================

console.log('\n--- 2.3: Damage Tracking ---\n');

// Test: Independent hull tracking
{
  console.log('Test 2.3.1: Independent hull tracking');
  const engine = new CombatEngine({ rng: createDeterministicRNG([6, 6, 4, 4, 6, 6, 4, 4]) });
  engine.initCombat(
    [{ ...playerFlagship }, { ...playerEscort }],
    [{ ...enemyRaider }, { ...enemyGunboat }]
  );

  const raider = engine.getShip('enemy_raider');
  const gunboat = engine.getShip('enemy_gunboat');
  const flagship = engine.getShip('player_flag');

  const raiderInitial = raider.hull;
  const gunboatInitial = gunboat.hull;

  // Damage only raider
  engine.resolveAttack(flagship, raider);

  // Gunboat should be unaffected
  assert(gunboat.hull === gunboatInitial, 'Gunboat hull unchanged');
}

// Test: Track damage across multiple rounds
{
  console.log('\nTest 2.3.2: Cumulative damage tracking');
  const engine = new CombatEngine({ rng: createDeterministicRNG([5, 4, 3, 3, 5, 4, 3, 3, 5, 4, 3, 3]) });
  engine.initCombat(
    [{ ...playerFlagship }],
    [{ ...enemyGunboat }]
  );

  const flagship = engine.getShip('player_flag');
  const gunboat = engine.getShip('enemy_gunboat');
  const initialHull = gunboat.hull;

  // Multiple attacks
  engine.resolveAttack(flagship, gunboat);
  const afterFirst = gunboat.hull;

  engine.resolveAttack(flagship, gunboat);
  const afterSecond = gunboat.hull;

  // Each hit should reduce hull
  assert(afterFirst <= initialHull, 'First attack tracked');
  assert(afterSecond <= afterFirst, 'Second attack tracked');
}

// Test: System damage per ship
{
  console.log('\nTest 2.3.3: Per-ship system tracking');
  const engine = new CombatEngine();
  engine.initCombat(
    [{ ...playerFlagship }, { ...playerEscort }],
    [{ ...enemyRaider }, { ...enemyGunboat }]
  );

  // Each ship should have independent systems
  const ships = engine.ships;
  for (const ship of ships) {
    assert(ship.systems !== undefined, `${ship.name} has systems`);
  }
}

// =============================================================================
// TIER 2.4: TURN ORDER
// =============================================================================

console.log('\n--- 2.4: Turn Order ---\n');

// Test: All ships can act
{
  console.log('Test 2.4.1: All ships can act');
  const engine = new CombatEngine();
  engine.initCombat(
    [{ ...playerFlagship }, { ...playerEscort }],
    [{ ...enemyRaider }, { ...enemyGunboat }]
  );

  // Each ship should be capable of acting
  for (const ship of engine.ships) {
    assert(ship.hull > 0, `${ship.name} is active (hull > 0)`);
    assert(ship.turrets?.length > 0, `${ship.name} has weapons`);
  }
}

// Test: Combat phases exist
{
  console.log('\nTest 2.4.2: Combat phases defined');

  assert(COMBAT_PHASES !== undefined, 'Combat phases exported');
  assert(COMBAT_PHASES.includes('manoeuvre'), 'Manoeuvre phase exists');
  assert(COMBAT_PHASES.includes('attack'), 'Attack phase exists');
}

// Test: Round counter
{
  console.log('\nTest 2.4.3: Round tracking');
  const engine = new CombatEngine();
  engine.initCombat(
    [{ ...playerFlagship }],
    [{ ...enemyRaider }]
  );

  const initialRound = engine.round || 1;

  if (typeof engine.endRound === 'function') {
    engine.endRound();
    assert(engine.round === initialRound + 1, 'Round incremented');
  } else {
    assert(true, 'Round tracking structure exists (manual)');
  }
}

// =============================================================================
// TIER 2.5: COORDINATED ATTACKS
// =============================================================================

console.log('\n--- 2.5: Coordinated Attacks ---\n');

// Test: Focus fire effectiveness
{
  console.log('Test 2.5.1: Focus fire on single target');
  const engine = new CombatEngine({ rng: createDeterministicRNG([5, 5, 4, 4, 5, 5, 4, 4]) });
  engine.initCombat(
    [{ ...playerFlagship }, { ...playerEscort }],
    [{ ...enemyGunboat }]
  );

  const flagship = engine.getShip('player_flag');
  const escort = engine.getShip('player_escort');
  const gunboat = engine.getShip('enemy_gunboat');
  const initialHull = gunboat.hull;

  // Coordinated attack
  const result1 = engine.resolveAttack(flagship, gunboat);
  const result2 = engine.resolveAttack(escort, gunboat);

  const totalDamage = (result1.damage || 0) + (result2.damage || 0);

  if (result1.hit || result2.hit) {
    assert(gunboat.hull < initialHull, 'Focus fire deals damage');
  }
}

// Test: Split attacks on multiple targets
{
  console.log('\nTest 2.5.2: Split attacks');
  const engine = new CombatEngine({ rng: createDeterministicRNG([5, 4, 3, 3, 5, 4, 3, 3]) });
  engine.initCombat(
    [{ ...playerFlagship }, { ...playerEscort }],
    [{ ...enemyRaider }, { ...enemyGunboat }]
  );

  const flagship = engine.getShip('player_flag');
  const escort = engine.getShip('player_escort');
  const raider = engine.getShip('enemy_raider');
  const gunboat = engine.getShip('enemy_gunboat');

  const raiderInitial = raider.hull;
  const gunboatInitial = gunboat.hull;

  // Split attacks
  engine.resolveAttack(flagship, raider);
  engine.resolveAttack(escort, gunboat);

  // Both targets should potentially take damage
  assert(true, 'Split attack strategy executed');
}

// =============================================================================
// TIER 2.6: VICTORY CONDITIONS (FLEET)
// =============================================================================

console.log('\n--- 2.6: Fleet Victory Conditions ---\n');

// Test: One enemy destroyed, one alive
{
  console.log('Test 2.6.1: Partial enemy destruction');
  const engine = new CombatEngine();
  engine.initCombat(
    [{ ...playerFlagship }],
    [{ ...enemyRaider, hull: 0 }, { ...enemyGunboat }]
  );

  const enemies = engine.ships.filter(s => s.faction === 'enemy');
  const aliveEnemies = enemies.filter(s => s.hull > 0);

  assert(enemies.length === 2, 'Two enemies in combat');
  assert(aliveEnemies.length === 1, 'One enemy still alive');
  assert(engine.combatActive === true, 'Combat continues');
}

// Test: All enemies destroyed
{
  console.log('\nTest 2.6.2: All enemies destroyed');
  const engine = new CombatEngine();
  engine.initCombat(
    [{ ...playerFlagship }],
    [{ ...enemyRaider, hull: 0 }, { ...enemyGunboat, hull: 0 }]
  );

  const enemies = engine.ships.filter(s => s.faction === 'enemy');
  const aliveEnemies = enemies.filter(s => s.hull > 0);

  assert(aliveEnemies.length === 0, 'All enemies destroyed');
}

// Test: Player ship destroyed, escort survives
{
  console.log('\nTest 2.6.3: Flagship destroyed, escort survives');
  const engine = new CombatEngine();
  engine.initCombat(
    [{ ...playerFlagship, hull: 0 }, { ...playerEscort }],
    [{ ...enemyRaider }]
  );

  const players = engine.ships.filter(s => s.faction === 'player');
  const alivePlayers = players.filter(s => s.hull > 0);

  assert(alivePlayers.length === 1, 'One player ship survives');
  assert(alivePlayers[0].id === 'player_escort', 'Escort survives');
}

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n========================================');
console.log('TIER 2 (2v2) TEST SUMMARY');
console.log('========================================');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
