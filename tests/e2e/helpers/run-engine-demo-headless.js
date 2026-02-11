#!/usr/bin/env node
/**
 * Headless Engine Demo Runner
 * Runs the AR-236 combat engine demo and outputs to stdout
 * Based on combat-demo-engine.js but non-interactive
 */

const { CombatEngine } = require('../../../lib/engine/combat-engine');
const { TUICombatAdapter } = require('../../../lib/engine/tui-combat-adapter');
const { DEMO_CONFIGS, createDefaultSystems } = require('./combat-demo-ships');

// State
let engine = null;
let adapter = null;

// Strip ANSI codes for clean output
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// Small delay for readability
const delay = ms => new Promise(r => setTimeout(r, ms));

// Format fleet specs
function printFleetSpecs(config) {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                    FLEET SPECIFICATIONS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Scenario: ${config.description}`);
  console.log(`Starting Range: ${config.startRange}`);
  console.log('');

  console.log('───────────────────────────────────────────────────────────────────');
  console.log('PLAYER FLEET (8 ships, 770t total)');
  console.log('───────────────────────────────────────────────────────────────────');

  for (const ship of config.playerFleet) {
    console.log(`\n  ${ship.name} (${ship.shipType})`);
    console.log(`    Tonnage: ${ship.tonnage}t | Hull: ${ship.hull} HP | Armor: ${ship.armour}`);
    console.log(`    Thrust: ${ship.thrust} | Fire Control: +${ship.fireControl || 0}`);

    if (ship.barbettes && ship.barbettes.length > 0) {
      console.log(`    Barbettes: ${ship.barbettes.map(b => `${b.name} (${b.damage})`).join(', ')}`);
    }
    if (ship.turrets && ship.turrets.length > 0) {
      const weapons = new Set();
      ship.turrets.forEach(t => t.weapons.forEach(w => weapons.add(w.replace(/_/g, ' '))));
      console.log(`    Turrets: ${ship.turrets.length}× triple (${[...weapons].join(', ')})`);
    }
    if (ship.missiles) {
      console.log(`    Missiles: ${ship.missiles}`);
    }
  }

  console.log('\n───────────────────────────────────────────────────────────────────');
  console.log('ENEMY FLEET (1 ship, 1000t total)');
  console.log('───────────────────────────────────────────────────────────────────');

  for (const ship of config.enemyFleet) {
    console.log(`\n  ${ship.name} (${ship.shipType})`);
    console.log(`    Tonnage: ${ship.tonnage}t | Hull: ${ship.hull} HP | Armor: ${ship.armour}`);
    console.log(`    Thrust: ${ship.thrust} | Fire Control: +${ship.fireControl || 0}`);

    if (ship.turrets && ship.turrets.length > 0) {
      const weapons = new Set();
      ship.turrets.forEach(t => t.weapons.forEach(w => weapons.add(w.replace(/_/g, ' '))));
      console.log(`    Turrets: ${ship.turrets.length}× triple (${[...weapons].join(', ')})`);
    }
    if (ship.missiles) {
      console.log(`    Missiles: ${ship.missiles}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('                       COMBAT LOG');
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

// Fighter alpha strike
async function fighterAlphaStrike(fighters, target) {
  for (const fighter of fighters) {
    if (fighter.destroyed || (fighter.missiles || 0) <= 0) continue;
    engine.resolveAttack(fighter, target, { autoMissile: true });
    await delay(20);
  }
}

// Capital ship attacks
async function capitalShipAttack(ship, targets) {
  for (const turret of ship.turrets || []) {
    if (turret.disabled) continue;
    const weapons = turret.weapons || [];
    if (weapons.every(w => w === 'sandcaster')) continue;

    const aliveTargets = targets.filter(t => !t.destroyed && t.hull > 0);
    if (aliveTargets.length === 0) break;

    const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];
    engine.resolveAttack(ship, target, {
      weapon: turret,
      autoMissile: engine.isLongRange()
    });
    await delay(20);
  }
}

// Q-Ship coordinated barrage
async function coordinatedBarrage(qship, target) {
  for (const turret of qship.turrets || []) {
    if (turret.disabled) continue;

    engine.resolveAttack(qship, target, {
      weapon: turret,
      autoMissile: engine.isLongRange()
    });
    await delay(20);
  }
}

async function runDemo() {
  const config = DEMO_CONFIGS.demo3;

  // Print fleet specs first
  printFleetSpecs(config);

  // Create engine
  engine = new CombatEngine({ debug: false });

  // Clone ships from config
  const playerFleet = config.playerFleet.map(s => ({
    ...s,
    systems: createDefaultSystems(),
    destroyed: false,
    maxHull: s.hull,
    maxPower: s.power || 100
  }));

  const enemyFleet = config.enemyFleet.map(s => ({
    ...s,
    systems: createDefaultSystems(),
    destroyed: false,
    maxHull: s.hull,
    maxPower: s.power || 100
  }));

  // Initialize combat
  engine.initCombat(playerFleet, enemyFleet, { range: config.startRange || 'Long' });

  // Create TUI adapter with stdout output
  adapter = new TUICombatAdapter(engine, {
    output: (text) => {
      console.log(stripAnsi(text));
    },
    isPlayerShip: (ship) => {
      const s = engine.getShip(ship.id);
      return s?.faction === 'player';
    },
    verbose: true
  });

  adapter.connect();

  // Get references
  const qship = playerFleet[0];
  const fighters = playerFleet.filter(s => s.shipType === 'Tlatl Fighter');
  const destroyer = enemyFleet[0];

  // Run combat rounds
  const maxRounds = 15;

  for (let round = 1; round <= maxRounds; round++) {
    console.log(`\n═══ ROUND ${round} ═══`);

    // Initiative phase
    engine.rollInitiative({ tacticsDM: 2 });
    engine.nextPhase(); // -> manoeuvre

    // Manoeuvre phase
    engine.applyTacticalStance(fighters);
    engine.nextPhase(); // -> attack

    // Attack phase - Fighter alpha strike
    const aliveFighters = fighters.filter(f => !f.destroyed && f.hull > 0 && (f.missiles || 0) > 0);
    if (aliveFighters.length > 0 && !destroyer.destroyed && destroyer.hull > 0) {
      console.log(`\n── Fighter Alpha Strike (${aliveFighters.length} fighters) ──`);
      await fighterAlphaStrike(aliveFighters, destroyer);
    }

    // Q-Ship coordinated barrage
    if (!qship.destroyed && qship.hull > 0 && !destroyer.destroyed && destroyer.hull > 0) {
      console.log(`\n── Q-Ship Barrage ──`);
      await coordinatedBarrage(qship, destroyer);
    }

    engine.nextPhase(); // -> reaction

    // Reaction phase - enemy counterattack
    if (!destroyer.destroyed && destroyer.hull > 0) {
      console.log(`\n── Enemy Counterattack ──`);
      await capitalShipAttack(destroyer, playerFleet.filter(p => !p.destroyed && p.hull > 0));
    }

    engine.nextPhase(); // -> actions
    engine.nextPhase(); // -> damage

    // Status
    const playerAlive = playerFleet.filter(s => !s.destroyed && s.hull > 0);
    const enemyAlive = enemyFleet.filter(s => !s.destroyed && s.hull > 0);

    console.log(`\n--- Round ${round} Complete ---`);
    console.log(`Player: ${playerAlive.length}/${playerFleet.length} ships`);
    if (destroyer.hull > 0) {
      console.log(`Destroyer: ${destroyer.hull}/${destroyer.maxHull} HP (${Math.round(destroyer.hull/destroyer.maxHull*100)}%)`);
    }

    // Check end
    if (engine.checkCombatEnd()) break;
    if (playerAlive.length === 0 || enemyAlive.length === 0) break;
  }

  // Final summary
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('                      BATTLE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');

  const playerSurvivors = playerFleet.filter(s => !s.destroyed && s.hull > 0);
  const enemySurvivors = enemyFleet.filter(s => !s.destroyed && s.hull > 0);

  if (enemySurvivors.length === 0) {
    console.log('\n  ★ PLAYER VICTORY ★');
  } else if (playerSurvivors.length === 0) {
    console.log('\n  ✗ PLAYER DEFEAT ✗');
  } else {
    console.log('\n  ◆ STALEMATE ◆');
  }

  console.log(`\n  Player Fleet: ${playerSurvivors.length}/${playerFleet.length} surviving`);
  for (const ship of playerFleet) {
    const status = ship.destroyed || ship.hull <= 0 ? 'DESTROYED' : `${ship.hull}/${ship.maxHull} HP`;
    console.log(`    ${ship.name}: ${status}`);
  }

  console.log(`\n  Enemy Fleet: ${enemySurvivors.length}/${enemyFleet.length} surviving`);
  for (const ship of enemyFleet) {
    const status = ship.destroyed || ship.hull <= 0 ? 'DESTROYED' : `${ship.hull}/${ship.maxHull} HP`;
    console.log(`    ${ship.name}: ${status}`);
  }

  // Stats
  console.log('\n  Combat Statistics:');
  const stats = engine.getStats();
  console.log(`    Attacks: ${stats.attacks}`);
  console.log(`    Hits: ${stats.hits} (${stats.attacks > 0 ? Math.round(stats.hits/stats.attacks*100) : 0}%)`);
  console.log(`    Damage dealt: ${stats.damageDealt}`);
  console.log(`    Missiles launched: ${stats.missilesLaunched}`);

  console.log('\n═══════════════════════════════════════════════════════════════════');
}

runDemo().catch(err => {
  console.error('Demo error:', err);
  process.exit(1);
});
