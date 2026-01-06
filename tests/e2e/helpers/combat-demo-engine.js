#!/usr/bin/env node
/**
 * Combat Demo - Engine-Powered Version
 *
 * Demonstrates using the shared CombatEngine with TUI adapter.
 * This is the AR-236 target architecture in action.
 *
 * Run: node tests/e2e/helpers/combat-demo-engine.js
 */

const { CombatEngine } = require('../../../lib/engine/combat-engine');
const { TUICombatAdapter } = require('../../../lib/engine/tui-combat-adapter');
const { EventTypes } = require('../../../lib/engine/event-bus');
const { DEMO_CONFIGS, createDefaultSystems } = require('./combat-demo-ships');

// ANSI codes for custom output
const ESC = '\x1b';
const CLEAR = `${ESC}[2J`;
const HOME = `${ESC}[H`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;
const GREEN = `${ESC}[32m`;
const RED = `${ESC}[31m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;

const WHITE = `${ESC}[37m`;
const MAGENTA = `${ESC}[35m`;

// State
let engine = null;
let adapter = null;
let narrativeLog = [];
let isPaused = false;
let showingHelp = false;
let returnToMenuCallback = null;

// ─────────────────────────────────────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────────────────────────────────────

function setupCombat(config = DEMO_CONFIGS.demo3) {
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

  // Create TUI adapter with custom output
  adapter = new TUICombatAdapter(engine, {
    output: (text) => {
      narrativeLog.push(text);
      console.log(text);
    },
    isPlayerShip: (ship) => {
      const s = engine.getShip(ship.id);
      return s?.faction === 'player';
    },
    verbose: true
  });

  adapter.connect();

  return { playerFleet, enemyFleet };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELAY HELPER (pause-aware)
// ─────────────────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((resolve) => {
    const check = () => {
      if (isPaused) {
        setTimeout(check, 100);
      } else {
        setTimeout(resolve, ms);
      }
    };
    check();
  });
}

function togglePause() {
  isPaused = !isPaused;
  if (isPaused) {
    console.log(`\n${YELLOW}${BOLD}[PAUSED]${RESET} ${DIM}Press ESC to resume, ? for help${RESET}`);
  } else {
    console.log(`${GREEN}[RESUMED]${RESET}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBAT ACTIONS (thin wrappers around engine)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fighter alpha strike - all fighters fire missiles
 */
async function fighterAlphaStrike(fighters, target) {
  const results = [];

  for (const fighter of fighters) {
    if (fighter.destroyed || (fighter.missiles || 0) <= 0) continue;

    // Engine handles the attack
    const result = engine.resolveAttack(fighter, target, {
      autoMissile: true
    });

    results.push(result);
    await delay(100);
  }

  return results;
}

/**
 * Capital ship turret attacks
 */
async function capitalShipAttack(ship, targets) {
  const results = [];

  for (const turret of ship.turrets || []) {
    if (turret.disabled) continue;

    // Skip sandcasters - they're defensive only
    const weapons = turret.weapons || [];
    if (weapons.every(w => w === 'sandcaster')) continue;

    // Pick a random target
    const aliveTargets = targets.filter(t => !t.destroyed);
    if (aliveTargets.length === 0) break;

    const target = aliveTargets[Math.floor(Math.random() * aliveTargets.length)];

    const result = engine.resolveAttack(ship, target, {
      weapon: turret,
      autoMissile: engine.isLongRange()
    });

    results.push(result);
    await delay(80);
  }

  return results;
}

/**
 * Q-Ship coordinated barrage
 */
async function coordinatedBarrage(qship, target) {
  const results = [];

  // Fire all turrets
  for (const turret of qship.turrets || []) {
    if (turret.disabled) continue;

    // Called shot on critical systems for beam lasers
    const isBeam = turret.weapons?.includes('beam_laser');
    const calledShot = isBeam && Math.random() < 0.3 ? 'powerPlant' : null;

    const result = engine.resolveAttack(qship, target, {
      weapon: turret,
      calledShot,
      autoMissile: engine.isLongRange()
    });

    results.push(result);
    await delay(100);
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DEMO LOOP
// ─────────────────────────────────────────────────────────────────────────────

async function runDemo() {
  console.log(CLEAR + HOME);
  console.log(`${BOLD}${CYAN}════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}  COMBAT DEMO - ENGINE POWERED (AR-236)${RESET}`);
  console.log(`${BOLD}${CYAN}════════════════════════════════════════════════${RESET}`);
  console.log('');
  console.log(`${DIM}This demo uses the shared CombatEngine with TUI adapter.${RESET}`);
  console.log(`${DIM}All game logic is in lib/engine/combat-engine.js${RESET}`);
  console.log(`${DIM}Display is handled by lib/engine/tui-combat-adapter.js${RESET}`);
  console.log('');

  await delay(2000);

  // Setup
  const { playerFleet, enemyFleet } = setupCombat();

  // Get fleets from engine (they have faction assigned)
  const players = engine.getShipsByFaction('player');
  const enemies = engine.getShipsByFaction('enemy');

  // Find key ships
  const qship = players.find(s => s.shipType === 'Q-Ship');
  const fighters = players.filter(s => s.shipType?.includes('Fighter') || s.shipType?.includes('Tlatl'));
  const destroyer = enemies[0];

  // Show initial state
  console.log(`${GREEN}${BOLD}Player Fleet:${RESET}`);
  for (const ship of players) {
    console.log(`  ${GREEN}${ship.name}${RESET} (${ship.shipType}) - ${ship.hull} HP`);
  }

  console.log(`${RED}${BOLD}Enemy Fleet:${RESET}`);
  for (const ship of enemies) {
    console.log(`  ${RED}${ship.name}${RESET} (${ship.shipType}) - ${ship.hull} HP, Armor ${ship.armour}`);
  }

  console.log('');
  console.log(`${YELLOW}Range: ${engine.range}${RESET}`);
  console.log('');

  await delay(2000);

  // Apply tactical stance (evasive at long range)
  engine.applyTacticalStance(fighters);

  // Combat rounds
  const maxRounds = 8;

  for (let round = 1; round <= maxRounds; round++) {
    // Check for combat end
    const endCheck = engine.checkCombatEnd();
    if (endCheck) break;

    // Start round
    engine.startRound();

    await delay(500);

    // Initiative phase
    const initiatives = engine.rollInitiative({ tacticsDM: 2 });

    await delay(500);
    engine.nextPhase(); // -> manoeuvre

    // Manoeuvre phase - update tactical stance
    engine.applyTacticalStance(fighters);

    await delay(300);
    engine.nextPhase(); // -> attack

    // Attack phase

    // Fighter alpha strike (fires first - lighter ships)
    const aliveFighters = fighters.filter(f => !f.destroyed && (f.missiles || 0) > 0);
    if (aliveFighters.length > 0 && !destroyer.destroyed) {
      console.log(`${CYAN}${BOLD}── Fighter Alpha Strike (${aliveFighters.length} fighters) ──${RESET}`);
      await fighterAlphaStrike(aliveFighters, destroyer);
      await delay(400);
    }

    // Q-Ship coordinated barrage
    if (!qship.destroyed && !destroyer.destroyed) {
      console.log(`${CYAN}${BOLD}── Q-Ship Barrage ──${RESET}`);
      await coordinatedBarrage(qship, destroyer);
      await delay(400);
    }

    engine.nextPhase(); // -> reaction

    // Reaction phase - enemy counterattack
    if (!destroyer.destroyed) {
      console.log(`${RED}${BOLD}── Enemy Counterattack ──${RESET}`);
      await capitalShipAttack(destroyer, players.filter(p => !p.destroyed));
    }

    await delay(300);
    engine.nextPhase(); // -> actions
    engine.nextPhase(); // -> damage

    // Show status
    console.log('');
    adapter.showFleetStatus(
      players.filter(p => !p.destroyed),
      enemies.filter(e => !e.destroyed)
    );

    await delay(1000);

    // Check end
    const combatEnd = engine.checkCombatEnd();
    if (combatEnd) break;
  }

  // Final check
  engine.checkCombatEnd();

  // Stats
  console.log('');
  console.log(`${CYAN}${BOLD}Combat Statistics:${RESET}`);
  const stats = engine.getStats();
  console.log(`  Attacks: ${stats.attacks}`);
  console.log(`  Hits: ${stats.hits} (${Math.round(stats.hits/stats.attacks*100)}%)`);
  console.log(`  Damage dealt: ${stats.damageDealt}`);
  console.log(`  Called shots: ${stats.calledShotsHit}/${stats.calledShotsAttempted}`);
  console.log(`  Missiles launched: ${stats.missilesLaunched}`);
  console.log(`  Point defense: ${stats.pointDefenseSuccesses}/${stats.pointDefenseAttempts}`);

  // Cleanup
  adapter.disconnect();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELP SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function renderHelp() {
  const w = 52;
  let out = CLEAR + HOME;
  out += `${CYAN}${BOLD}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${WHITE}${BOLD}COMBAT DEMO HELP (ENGINE MODE)${RESET}${' '.repeat(w - 35)}${CYAN}|${RESET}\n`;
  out += `${CYAN}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${WHITE}CONTROLS${RESET}${' '.repeat(w - 12)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}ESC${RESET}  - Toggle pause${' '.repeat(w - 24)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}?/h${RESET}  - Show this help${' '.repeat(w - 25)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}r${RESET}    - Restart demo${' '.repeat(w - 24)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}b${RESET}    - Back to menu${' '.repeat(w - 24)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}q${RESET}    - Quit program${' '.repeat(w - 24)}${CYAN}|${RESET}\n`;
  out += `${CYAN}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${WHITE}COMBAT PHASES${RESET}${' '.repeat(w - 17)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${MAGENTA}Initiative${RESET} - Roll tactics${' '.repeat(w - 31)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${CYAN}Manoeuvre${RESET}  - Thrust & evasion${' '.repeat(w - 35)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${RED}Attack${RESET}     - Weapons fire${' '.repeat(w - 30)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${RED}Reaction${RESET}   - Point defense${' '.repeat(w - 31)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}Actions${RESET}    - Repairs & damage${' '.repeat(w - 34)}${CYAN}|${RESET}\n`;
  out += `${CYAN}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${DIM}Press any key to continue...${RESET}${' '.repeat(w - 32)}${CYAN}|${RESET}\n`;
  out += `${CYAN}${BOLD}+${'-'.repeat(w-2)}+${RESET}\n`;
  process.stdout.write(out);
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYBOARD INPUT
// ─────────────────────────────────────────────────────────────────────────────

function setupKeyboardInput() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
    // Ctrl+C - always quit
    if (key === '\u0003') {
      cleanupKeyboard();
      process.stdout.write(CLEAR + HOME);
      process.exit(0);
    }

    // ESC key toggles pause
    if (key === '\x1b' || key === '\u001b') {
      togglePause();
      return;
    }

    // Help dismissal
    if (showingHelp) {
      showingHelp = false;
      return;
    }

    // ? or h for help
    if (key === '?' || key === 'h' || key === 'H') {
      showingHelp = true;
      renderHelp();
      return;
    }

    // Don't process other keys while paused
    if (isPaused) return;

    // q - quit
    if (key === 'q' || key === 'Q') {
      cleanupKeyboard();
      process.stdout.write(CLEAR + HOME + `${GREEN}Demo ended.${RESET}\n`);
      process.exit(0);
    }

    // b - back to menu
    if (key === 'b' || key === 'B') {
      if (returnToMenuCallback) {
        cleanupKeyboard();
        returnToMenuCallback();
      }
      return;
    }

    // r - restart
    if (key === 'r' || key === 'R') {
      process.stdout.write(CLEAR + HOME + `${YELLOW}Restarting...${RESET}\n`);
      isPaused = false;
      runDemo().catch(console.error);
      return;
    }
  });
}

function cleanupKeyboard() {
  process.stdin.removeAllListeners('data');
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED API
// ─────────────────────────────────────────────────────────────────────────────

async function runDemoEngine(options = {}) {
  return new Promise((resolve) => {
    returnToMenuCallback = resolve;
    setupKeyboardInput();
    runDemo().then(() => {
      setTimeout(() => {
        cleanupKeyboard();
        resolve();
      }, 3000);
    }).catch(console.error);
  });
}

module.exports = { runDemoEngine, runDemo, setupCombat };

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  setupKeyboardInput();
  runDemo()
    .then(() => {
      console.log('');
      console.log(`${DIM}Demo complete. Press Ctrl+C to exit.${RESET}`);
    })
    .catch(err => {
      console.error('Demo error:', err);
      process.exit(1);
    });
}
