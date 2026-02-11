#!/usr/bin/env node
/**
 * Combat Simulator - Headless combat engine for experiments
 * Runs battles without display for data collection
 *
 * Usage:
 *   const { simulateBattle } = require('./combat-simulator');
 *   const result = await simulateBattle({ scenario: 'qship-vs-destroyer' });
 */

const { DEMO_CONFIGS, createDefaultSystems } = require('./combat-demo-ships');
const { captainDecision } = require('../../../lib/combat/captain-ai');

// Dice helpers
function roll1d6() { return Math.floor(Math.random() * 6) + 1; }
function roll2d6() {
  return { total: roll1d6() + roll1d6() };
}
function rollNd6(n) {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += roll1d6();
  return sum;
}

// Range DMs
const RANGE_DMS = {
  'Adjacent': 0, 'Close': 0, 'Short': 1,
  'Medium': 0, 'Long': -2, 'Very Long': -4, 'Distant': -6
};

function getRangeDM(range) {
  return RANGE_DMS[range] || 0;
}

/**
 * Simulate a single attack
 */
function simulateAttack(attacker, defender, weapon, options = {}) {
  const { rangeDM = 0 } = options;

  const fc = attacker.fireControl || 0;
  const gunner = weapon.gunnerSkill || 0;
  const totalDM = fc + gunner + rangeDM;

  const roll = roll2d6();
  const total = roll.total + totalDM;
  const hit = total >= 8;
  const effect = hit ? total - 8 : 0;

  let damage = 0;
  let powerDrain = 0;

  if (hit) {
    const weaponType = weapon.type || weapon.weapons?.[0] || 'pulse_laser';
    const damageMultiple = weapon.damageMultiple || 1;

    if (weaponType.includes('ion')) {
      // Ion: 7d6 power drain, ignores armour
      const ionDice = rollNd6(7);
      powerDrain = (ionDice + effect) * damageMultiple;
      defender.power = Math.max(0, (defender.power || defender.maxPower || 100) - powerDrain);
    } else if (weaponType.includes('particle')) {
      // Particle: 4d6 barbette
      const damageRoll = rollNd6(4);
      const rawDamage = damageRoll + effect;
      damage = Math.max(0, rawDamage - (defender.armour || 0)) * damageMultiple;
      defender.hull = Math.max(0, defender.hull - damage);
    } else if (weaponType.includes('missile')) {
      const damageRoll = rollNd6(4);
      const rawDamage = damageRoll + effect;
      damage = Math.max(0, rawDamage - (defender.armour || 0));
      defender.hull = Math.max(0, defender.hull - damage);
    } else {
      // Laser
      const damageRoll = rollNd6(2);
      const rawDamage = damageRoll + effect;
      damage = Math.max(0, rawDamage - (defender.armour || 0));
      defender.hull = Math.max(0, defender.hull - damage);
    }
  }

  return { hit, damage, powerDrain, effect };
}

/**
 * Simulate Q-Ship coordinated barrage
 */
function simulateCoordinatedBarrage(qship, defender, rangeDM) {
  const results = {
    particleHit: false,
    ionHit: false,
    particleDamage: 0,
    powerDrain: 0,
    knockout: false
  };

  // Marina fires one barbette per round, alternating ion/particle
  // Ion barbette attack (power drain, ignores armour)
  const ionBarbette = qship.barbettes?.find(b => b.id === 'ion');
  if (ionBarbette) {
    const iResult = simulateAttack(qship, defender,
      { ...ionBarbette, type: 'ion', damageMultiple: ionBarbette.damageMultiple || 3 },
      { rangeDM }
    );
    results.ionHit = iResult.hit;
    results.powerDrain = iResult.powerDrain;
  }

  // Check knockout (power dead)
  const powerDead = defender.power <= 0;
  results.knockout = powerDead;

  return results;
}

/**
 * Simulate a full battle
 * @param {Object} config - Battle configuration
 * @returns {Object} Battle results
 */
async function simulateBattle(config = {}) {
  const {
    scenario = 'qship-vs-destroyer',
    startRange = 'Medium',
    maxRounds = 10
  } = config;

  // Scenario lookup map
  const SCENARIO_MAP = {
    'qship-vs-destroyer': 'demo3',
    'qship-vs-pirates': 'demo4',
    'amishi-vs-bloodprofit': 'demo5',
    'kimbly-vs-pirate': 'demo1',
    'astral-vs-corvette': 'demo2'
  };

  // Load scenario - lookup by name or use direct demo number
  const demoKey = SCENARIO_MAP[scenario] || scenario;
  const demoConfig = DEMO_CONFIGS[demoKey] || DEMO_CONFIGS.demo3;

  // Clone ships
  const playerFleet = demoConfig.playerFleet.map(s => ({
    ...s,
    systems: createDefaultSystems(),
    destroyed: false
  }));
  const enemyFleet = demoConfig.enemyFleet.map(s => ({
    ...s,
    systems: createDefaultSystems(),
    destroyed: false
  }));

  const qship = playerFleet.find(s => s.shipType === 'Q-Ship');
  const enemy = enemyFleet[0];

  const results = {
    scenario,
    startRange,
    rounds: 0,
    winner: null,
    playerHullPct: 100,
    enemyHullPct: 100,
    knockouts: 0,
    missilesLaunched: 0,
    flees: 0,
    surrenders: 0,
    attacks: []
  };

  const rangeDM = getRangeDM(startRange);

  // Simulate rounds
  for (let round = 1; round <= maxRounds; round++) {
    results.rounds = round;

    // Captain AI decisions for each enemy ship
    for (const ship of enemyFleet) {
      if (ship.destroyed || ship.fled || ship.surrendered) continue;

      const decision = captainDecision(
        {
          hull: ship.hull,
          maxHull: ship.maxHull,
          power: ship.power ?? ship.maxPower ?? 100,
          maxPower: ship.maxPower ?? 100,
          fleeThreshold: ship.fleeThreshold
        },
        {
          friendlyFleet: enemyFleet.filter(s => !s.destroyed && !s.fled && !s.surrendered),
          enemyFleet: playerFleet.filter(s => !s.destroyed)
        }
      );

      if (decision === 'flee') {
        ship.fled = true;
        results.flees++;
      } else if (decision === 'surrender') {
        ship.surrendered = true;
        results.surrenders++;
      }
    }

    // Check if all enemies fled/surrendered/destroyed
    const activeEnemies = enemyFleet.filter(s => !s.destroyed && !s.fled && !s.surrendered);
    if (activeEnemies.length === 0) {
      results.winner = 'player';
      break;
    }

    // Fighter alpha strike (missiles)
    const fighters = playerFleet.filter(s => s.shipType === 'Fighter' && !s.destroyed);
    for (const fighter of fighters) {
      if (fighter.missiles > 0) {
        fighter.missiles--;
        results.missilesLaunched++;
        const atkResult = simulateAttack(fighter, enemy,
          { gunnerSkill: 2, type: 'missile' },
          { rangeDM }
        );
        results.attacks.push({ type: 'missile', hit: atkResult.hit });
      }
    }

    // Check enemy destroyed
    if (enemy.hull <= 0) {
      enemy.destroyed = true;
      results.winner = 'player';
      break;
    }

    // Q-Ship coordinated barrage
    if (!qship.destroyed && !enemy.destroyed) {
      const barrage = simulateCoordinatedBarrage(qship, enemy, rangeDM);
      if (barrage.knockout) {
        results.knockouts++;
      }
    }

    // Check enemy destroyed
    if (enemy.hull <= 0 || enemy.power <= 0) {
      enemy.destroyed = true;
      results.winner = 'player';
      break;
    }

    // Enemy counterattack on Q-Ship (skip if fled/surrendered)
    if (!enemy.destroyed && !enemy.fled && !enemy.surrendered && !qship.destroyed) {
      for (let t = 0; t < 3 && !qship.destroyed; t++) {
        const atkResult = simulateAttack(enemy, qship,
          { gunnerSkill: 2, type: 'beam_laser' },
          { rangeDM }
        );
        if (atkResult.hit) {
          const dmg = rollNd6(3) - (qship.armour || 0);
          qship.hull = Math.max(0, qship.hull - Math.max(0, dmg));
          if (qship.hull <= 0) {
            qship.destroyed = true;
            // Check if all player ships destroyed
            const alivePlayer = playerFleet.filter(s => !s.destroyed && s.hull > 0);
            if (alivePlayer.length === 0) {
              results.winner = 'enemy';
            }
          }
        }
      }
    }
  }

  // Calculate final percentages
  results.playerHullPct = Math.round((qship.hull / qship.maxHull) * 100);
  results.enemyHullPct = Math.round((enemy.hull / enemy.maxHull) * 100);

  if (!results.winner) {
    results.winner = results.playerHullPct > results.enemyHullPct ? 'player' : 'stalemate';
  }

  return results;
}

/**
 * Run multiple battles and aggregate stats
 */
async function runExperiment(config = {}) {
  const {
    name = 'Experiment',
    runs = 100,
    ...battleConfig
  } = config;

  const results = [];
  for (let i = 0; i < runs; i++) {
    const result = await simulateBattle(battleConfig);
    results.push(result);
  }

  // Aggregate stats
  const wins = results.filter(r => r.winner === 'player').length;
  const knockouts = results.reduce((sum, r) => sum + r.knockouts, 0);
  const avgRounds = results.reduce((sum, r) => sum + r.rounds, 0) / runs;
  const avgPlayerHull = results.reduce((sum, r) => sum + r.playerHullPct, 0) / runs;
  const totalFlees = results.reduce((sum, r) => sum + r.flees, 0);
  const totalSurrenders = results.reduce((sum, r) => sum + r.surrenders, 0);

  return {
    name,
    runs,
    config: battleConfig,
    winRate: Math.round((wins / runs) * 100),
    knockoutRate: Math.round((knockouts / runs) * 100),
    avgRounds: Math.round(avgRounds * 10) / 10,
    avgPlayerHull: Math.round(avgPlayerHull),
    flees: totalFlees,
    surrenders: totalSurrenders,
    avgFlees: Math.round((totalFlees / runs) * 10) / 10,
    avgSurrenders: Math.round((totalSurrenders / runs) * 10) / 10,
    fleeRate: Math.round((results.filter(r => r.flees > 0).length / runs) * 100),
    surrenderRate: Math.round((results.filter(r => r.surrenders > 0).length / runs) * 100),
    rawResults: results
  };
}

module.exports = {
  simulateBattle,
  runExperiment,
  simulateAttack,
  simulateCoordinatedBarrage
};

// Run if executed directly
if (require.main === module) {
  (async () => {
    console.log('Running quick combat simulation test...\n');

    const result = await simulateBattle({
      startRange: 'Medium'
    });

    console.log('Battle Result:');
    console.log(`  Winner: ${result.winner}`);
    console.log(`  Rounds: ${result.rounds}`);
    console.log(`  Q-Ship Hull: ${result.playerHullPct}%`);
    console.log(`  Enemy Hull: ${result.enemyHullPct}%`);
    console.log(`  Knockouts: ${result.knockouts}`);
  })();
}
