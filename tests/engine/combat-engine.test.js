/**
 * Combat Engine Tests
 * Run with: node tests/engine/combat-engine.test.js
 */

const {
  CombatEngine,
  RANGE_DMS,
  WEAPON_DAMAGE,
  COMBAT_PHASES
} = require('../../lib/engine/combat-engine');
const { EventTypes } = require('../../lib/engine/event-bus');

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
  console.log('PASS:', message);
}

// Deterministic RNG for testing
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

// Test ships
const playerShip = {
  id: 'player1',
  name: 'ISS Defender',
  hull: 100,
  maxHull: 100,
  armour: 4,
  thrust: 4,
  fireControl: 2,
  missiles: 5,
  sandcasters: 3,
  turrets: [
    { id: 1, weapons: ['pulse_laser', 'missile_rack'], gunnerSkill: 2 }
  ]
};

const enemyShip = {
  id: 'enemy1',
  name: 'Pirate Raider',
  hull: 80,
  maxHull: 80,
  armour: 2,
  thrust: 6,
  fireControl: 1,
  turrets: [
    { id: 1, weapons: ['beam_laser'], gunnerSkill: 1 }
  ]
};

console.log('========================================');
console.log('COMBAT ENGINE UNIT TESTS');
console.log('========================================\n');

// Test 1: Initialization
console.log('Test 1: Combat initialization');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }], { range: 'Medium' });

  assert(engine.ships.length === 2, 'Two ships initialized');
  assert(engine.range === 'Medium', 'Range set correctly');
  assert(engine.combatActive === true, 'Combat is active');
}

// Test 2: Faction assignment
console.log('\nTest 2: Faction assignment');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const p = engine.getShip('player1');
  const e = engine.getShip('enemy1');

  assert(p.faction === 'player', 'Player faction assigned');
  assert(e.faction === 'enemy', 'Enemy faction assigned');
}

// Test 3: Default systems
console.log('\nTest 3: Default systems created');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const ship = engine.getShip('player1');

  assert(ship.systems !== undefined, 'Systems object created');
  assert(ship.systems.mDrive !== undefined, 'M-Drive system exists');
  assert(ship.systems.powerPlant !== undefined, 'Power plant system exists');
}

// Test 4: Range DMs
console.log('\nTest 4: Range modifiers');
{
  const engine = new CombatEngine();

  assert(engine.getRangeDM('Short') === 1, 'Short range DM = +1');
  assert(engine.getRangeDM('Medium') === 0, 'Medium range DM = 0');
  assert(engine.getRangeDM('Long') === -2, 'Long range DM = -2');
  assert(engine.getRangeDM('Very Long') === -4, 'Very Long range DM = -4');
  assert(engine.getRangeDM('Distant') === -6, 'Distant range DM = -6');
}

// Test 5: Long range detection
console.log('\nTest 5: Long range detection');
{
  const engine = new CombatEngine();

  engine.range = 'Long';
  assert(engine.isLongRange() === true, 'Long is long range');

  engine.range = 'Medium';
  assert(engine.isLongRange() === false, 'Medium is not long range');

  engine.range = 'Very Long';
  assert(engine.isLongRange() === true, 'Very Long is long range');
}

// Test 6: Attack hit
console.log('\nTest 6: Attack resolution - hit');
{
  // Roll 4+4=8, plus modifiers will hit
  const engine = new CombatEngine({ rng: createDeterministicRNG([4, 4, 3, 3]) });
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const attacker = engine.getShip('player1');
  const defender = engine.getShip('enemy1');

  const result = engine.resolveAttack(attacker, defender);

  assert(result.success === true, 'Attack resolved successfully');
  assert(result.hit === true, 'Attack hit');
  assert(result.weapon === 'pulse_laser', 'Weapon type correct');
}

// Test 7: Attack miss
console.log('\nTest 7: Attack resolution - miss');
{
  // Roll 1+1=2, fc(0)+gunner(2)+weaponDM(2)=+4, total 6 → miss (need 8)
  const engine = new CombatEngine({ rng: createDeterministicRNG([1, 1]) });
  engine.initCombat([{ ...playerShip, fireControl: 0 }], [{ ...enemyShip }]);

  const attacker = engine.getShip('player1');
  const defender = engine.getShip('enemy1');
  const initialHull = defender.hull;

  const result = engine.resolveAttack(attacker, defender);

  assert(result.hit === false, 'Attack missed');
  assert(defender.hull === initialHull, 'Hull unchanged on miss');
}

// Test 8: Damage application
console.log('\nTest 8: Damage application');
{
  // Roll 4+4=8 hit, then 4+4=8 damage
  const engine = new CombatEngine({ rng: createDeterministicRNG([4, 4, 4, 4]) });
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const attacker = engine.getShip('player1');
  const defender = engine.getShip('enemy1');
  const initialHull = defender.hull;

  engine.resolveAttack(attacker, defender);

  assert(defender.hull < initialHull, 'Hull reduced after hit');
}

// Test 9: Armor
console.log('\nTest 9: Armor protection');
{
  // Roll 1+1=2+6DM=8 (barely hit, effect=0), then 3+3=6 damage vs armor 10 = 0 damage
  const engine = new CombatEngine({ rng: createDeterministicRNG([1, 1, 3, 3]) });
  engine.initCombat(
    [{ ...playerShip }],
    [{ ...enemyShip, armour: 10 }]
  );

  const attacker = engine.getShip('player1');
  const defender = engine.getShip('enemy1');

  engine.resolveAttack(attacker, defender);

  assert(defender.hull === 80, 'High armor prevents damage');
}

// Test 10: Attack events
console.log('\nTest 10: Attack events emitted');
{
  const engine = new CombatEngine({ rng: createDeterministicRNG([4, 4, 3, 3]) });
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const events = [];
  engine.subscribe(EventTypes.ATTACK_RESOLVED, (e) => events.push(e));

  const attacker = engine.getShip('player1');
  const defender = engine.getShip('enemy1');

  engine.resolveAttack(attacker, defender);

  assert(events.length === 1, 'Attack event emitted');
  assert(events[0].data.hit === true, 'Event has hit result');
}

// Test 11: Statistics tracking
console.log('\nTest 11: Statistics tracking');
{
  const engine = new CombatEngine({ rng: createDeterministicRNG([4, 4, 3, 3]) });
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const attacker = engine.getShip('player1');
  const defender = engine.getShip('enemy1');

  engine.resolveAttack(attacker, defender);

  const stats = engine.getStats();
  assert(stats.attacks === 1, 'Attack counted');
  assert(stats.hits === 1, 'Hit counted');
}

// Test 12: Evasive penalty
console.log('\nTest 12: Evasive maneuvers penalty');
{
  // Roll 3+4=7, +6DM -6evasive = 7, miss (need 8)
  const engine = new CombatEngine({ rng: createDeterministicRNG([3, 4]) });
  engine.initCombat(
    [{ ...playerShip }],
    [{ ...enemyShip, thrust: 6, evasive: true }]
  );

  const attacker = engine.getShip('player1');
  const defender = engine.getShip('enemy1');

  const result = engine.resolveAttack(attacker, defender);

  assert(result.modifiers.evasiveDM === -6, 'Evasive DM equals thrust');
  assert(result.hit === false, 'Attack missed due to evasive');
}

// Test 16: Set evasive
console.log('\nTest 16: Set evasive');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const ship = engine.getShip('player1');

  engine.setEvasive(ship, true);
  assert(ship.evasive === true, 'Evasive enabled');

  engine.setEvasive(ship, false);
  assert(ship.evasive === false, 'Evasive disabled');
}

// Test 17: Ship destruction
console.log('\nTest 17: Ship destruction');
{
  // High damage roll
  const engine = new CombatEngine({ rng: createDeterministicRNG([6, 6, 6, 6, 6, 6]) });
  engine.initCombat(
    [{ ...playerShip }],
    [{ ...enemyShip, hull: 5, armour: 0 }]
  );

  const attacker = engine.getShip('player1');
  const defender = engine.getShip('enemy1');

  const result = engine.resolveAttack(attacker, defender);

  assert(defender.destroyed === true, 'Ship destroyed');
  assert(result.destroyed === true, 'Result shows destruction');
}

// Test 18: Ship destroyed event
console.log('\nTest 18: Ship destroyed event');
{
  const engine = new CombatEngine({ rng: createDeterministicRNG([6, 6, 6, 6, 6, 6]) });
  engine.initCombat(
    [{ ...playerShip }],
    [{ ...enemyShip, hull: 5, armour: 0 }]
  );

  const events = [];
  engine.subscribe(EventTypes.SHIP_DESTROYED, (e) => events.push(e));

  const attacker = engine.getShip('player1');
  const defender = engine.getShip('enemy1');

  engine.resolveAttack(attacker, defender);

  assert(events.length === 1, 'Destroyed event emitted');
  assert(events[0].data.ship.name === 'Pirate Raider', 'Correct ship in event');
}

// Test 19: Initiative
console.log('\nTest 19: Initiative roll');
{
  const engine = new CombatEngine({ rng: createDeterministicRNG([3, 4, 5, 2]) });
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const initiatives = engine.rollInitiative();

  assert(initiatives.length === 2, 'Two ships rolled initiative');
  assert(typeof initiatives[0].total === 'number', 'Initiative has total');
}

// Test 20: Tactics DM
console.log('\nTest 20: Tactics DM in initiative');
{
  const engine = new CombatEngine({ rng: createDeterministicRNG([3, 4, 5, 2]) });
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const initiatives = engine.rollInitiative({ tacticsDM: 2 });

  const playerInit = initiatives.find(i => i.ship.id === 'player1');
  assert(playerInit.breakdown.tacticsDM === 2, 'Tactics DM applied to player');

  const enemyInit = initiatives.find(i => i.ship.id === 'enemy1');
  assert(enemyInit.breakdown.tacticsDM === 0, 'No tactics DM for enemy');
}

// Test 21: Start round
console.log('\nTest 21: Start round');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  engine.startRound();

  assert(engine.round === 1, 'Round is 1');
  assert(engine.phase === 'initiative', 'Phase is initiative');
}

// Test 22: Round started event
console.log('\nTest 22: Round started event');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const events = [];
  engine.subscribe(EventTypes.ROUND_STARTED, (e) => events.push(e));

  engine.startRound();

  assert(events.length === 1, 'Round event emitted');
  assert(events[0].data.round === 1, 'Round number correct');
}

// Test 23: Phase advancement
console.log('\nTest 23: Phase advancement');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  engine.startRound();
  assert(engine.phase === 'initiative', 'Starts at initiative');

  engine.nextPhase();
  assert(engine.phase === 'manoeuvre', 'Advances to manoeuvre');

  engine.nextPhase();
  assert(engine.phase === 'attack', 'Advances to attack');
}

// Test 24: Phase changed event
console.log('\nTest 24: Phase changed event');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const events = [];
  engine.subscribe(EventTypes.PHASE_CHANGED, (e) => events.push(e));

  engine.startRound();
  engine.nextPhase();
  engine.nextPhase();

  assert(events.length === 2, 'Two phase change events');
  assert(events[0].data.phase === 'manoeuvre', 'First phase correct');
  assert(events[1].data.phase === 'attack', 'Second phase correct');
}

// Test 25: Round end
console.log('\nTest 25: Round end detection');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  engine.startRound();

  // Advance through all phases
  for (let i = 0; i < COMBAT_PHASES.length - 1; i++) {
    engine.nextPhase();
  }

  const result = engine.nextPhase();
  assert(result === null, 'Null when round complete');
}

// Test 26: Player victory
console.log('\nTest 26: Player victory detection');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const enemy = engine.getShip('enemy1');
  enemy.destroyed = true;

  const result = engine.checkCombatEnd();

  assert(result !== null, 'Combat ended');
  assert(result.winner === 'player', 'Player won');
}

// Test 27: Enemy victory
console.log('\nTest 27: Enemy victory detection');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const player = engine.getShip('player1');
  player.destroyed = true;

  const result = engine.checkCombatEnd();

  assert(result !== null, 'Combat ended');
  assert(result.winner === 'enemy', 'Enemy won');
}

// Test 28: Power knockout
console.log('\nTest 28: Power knockout detection');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip, power: 0 }]);

  const result = engine.checkCombatEnd();

  assert(result !== null, 'Combat ended');
  assert(result.reason.includes('no power'), 'Power knockout reason');
}

// Test 29: Sandcaster
console.log('\nTest 29: Sandcaster activation');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip, sandcasters: 2 }], [{ ...enemyShip }]);

  const ship = engine.getShip('player1');

  const result = engine.activateSandcaster(ship);

  assert(result.success === true, 'Sandcaster activated');
  assert(ship.sandcasters === 1, 'Sandcasters decremented');
  assert(ship.sandcasterActive === true, 'Sandcaster active flag set');
}

// Test 30: Sandcaster exhausted
console.log('\nTest 30: Sandcaster exhausted');
{
  const engine = new CombatEngine();
  engine.initCombat([{ ...playerShip, sandcasters: 0 }], [{ ...enemyShip }]);

  const ship = engine.getShip('player1');

  const result = engine.activateSandcaster(ship);

  assert(result.success === false, 'Sandcaster failed');
}

// Test 31: Tactical stance - high thrust evasive at long range
console.log('\nTest 31: Tactical stance');
{
  const engine = new CombatEngine();
  engine.initCombat(
    [{ ...playerShip, thrust: 6 }],
    [{ ...enemyShip, thrust: 4 }],
    { range: 'Long' }
  );

  const playerFleet = engine.getShipsByFaction('player');
  const enemyFleet = engine.getShipsByFaction('enemy');

  engine.applyTacticalStance(playerFleet);
  engine.applyTacticalStance(enemyFleet);

  assert(playerFleet[0].evasive === true, 'High thrust ship goes evasive at long range');
  assert(enemyFleet[0].evasive === false, 'Low thrust ship not evasive');
}

// Test 32: Tactical stance clears at short range
console.log('\nTest 32: Tactical stance clears at short range');
{
  const engine = new CombatEngine();
  engine.initCombat(
    [{ ...playerShip, thrust: 6 }],
    [{ ...enemyShip }],
    { range: 'Short' }
  );

  const fleet = engine.getShipsByFaction('player');
  fleet[0].evasive = true; // Manually set

  engine.applyTacticalStance(fleet);

  assert(fleet[0].evasive === false, 'Evasive cleared at short range');
}

// Test 33: Event replay
console.log('\nTest 33: Event replay');
{
  const engine = new CombatEngine({ rng: createDeterministicRNG([4, 4, 3, 3]) });
  engine.initCombat([{ ...playerShip }], [{ ...enemyShip }]);

  const attacker = engine.getShip('player1');
  const defender = engine.getShip('enemy1');

  engine.startRound();
  engine.resolveAttack(attacker, defender);

  const events = engine.replayEvents();

  assert(events.length > 0, 'Events recorded');
  assert(events.some(e => e.type === EventTypes.ROUND_STARTED), 'Round event in replay');
  assert(events.some(e => e.type === EventTypes.ATTACK_RESOLVED), 'Attack event in replay');
}

// Test 34: Constants
console.log('\nTest 34: Constants defined');
{
  assert(RANGE_DMS.Adjacent === 0, 'Adjacent range DM');
  assert(RANGE_DMS.Short === 1, 'Short range DM');
  assert(RANGE_DMS.Distant === -6, 'Distant range DM');
  assert(WEAPON_DAMAGE.pulse_laser === 2, 'Pulse laser damage dice');
  assert(WEAPON_DAMAGE.beam_laser === 1, 'Beam laser damage dice');
  assert(WEAPON_DAMAGE.missile_rack === 4, 'Missile damage dice');
  assert(WEAPON_DAMAGE.particle === 4, 'Particle barbette damage dice');
  assert(WEAPON_DAMAGE.ion === 7, 'Ion barbette damage dice');
  assert(COMBAT_PHASES.includes('attack'), 'Attack phase defined');
}

console.log('\n========================================');
console.log('ALL COMBAT ENGINE TESTS PASSED');
console.log('========================================');
