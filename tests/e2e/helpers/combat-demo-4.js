#!/usr/bin/env node
/**
 * Combat Demo 4: Q-Ship Fleet vs Pirate Fleet
 * Fleet vs fleet combat - ambush scenario
 * Run: node tests/e2e/helpers/combat-demo-4.js
 *
 * ══════════════════════════════════════════════════════════════════
 * SCENARIO: MERCHANT AMBUSH REVERSED
 * ══════════════════════════════════════════════════════════════════
 * Pirates approached what they thought was an unarmed merchant vessel.
 * The Q-Ship reveals hidden weapons and launches fighters - AMBUSH!
 *
 * ══════════════════════════════════════════════════════════════════
 * PLAYER FLEET (8 ships, 770t total)
 * ══════════════════════════════════════════════════════════════════
 *   ISS Astral Dawn (600t Q-Ship)
 *     - Hull: 240 HP, Armor: 1
 *     - Ion Barbette (3d6×10 power drain, +6 DM)
 *     - Particle Barbette (6d6 hull, +6 DM)
 *     - Fire Control: +4, Sensors: +1
 *     - Tactics-3 Captain for initiative
 *
 *   6× Tlatl Missile Fighters (10t each)
 *     - Hull: 4 HP each, Armor: 0
 *     - 1 missile each (+2 DM, 4d6 damage)
 *     - Fragile but devastating alpha strike
 *
 *   Armed Fast Pinnace (40t)
 *     - Hull: 16 HP, Armor: 2
 *     - Double turret: pulse laser + sandcaster
 *     - Pursuit/escort role
 *
 * ══════════════════════════════════════════════════════════════════
 * PIRATE FLEET (5 ships, 1860t total)
 * ══════════════════════════════════════════════════════════════════
 *   Black Widow (400t Corsair) - Lead raider
 *     - Hull: 160 HP, Armor: 4, Thrust: 4
 *     - Triple turret: beam laser + 2× missile racks
 *     - 8 marines, experienced crew
 *
 *   Black Fang (400t Corsair) - Second raider
 *     - Same loadout as Black Widow
 *     - Focus fires on Q-Ship with partner
 *
 *   Leech 1 & 2 (30t Boarding Shuttles)
 *     - Hull: 12 HP each, Armor: 0
 *     - Pulse laser, low skill crew
 *     - Expendable, targets fighters
 *     - Flee at 50% hull
 *
 *   Scavenger (1000t Tug Tender) - HIGH VALUE PRIZE
 *     - Hull: 400 HP, Armor: 2, Thrust: 1
 *     - Double beam laser (defensive only)
 *     - Non-combatant, surrenders easily (morale < 50%)
 *     - Valuable cargo and salvage equipment
 *
 * ══════════════════════════════════════════════════════════════════
 * COMBAT MECHANICS
 * ══════════════════════════════════════════════════════════════════
 *   SURPRISE BONUS: Player fleet gets +2 DM on Round 1 attacks
 *
 *   MORALE SYSTEM: Pirates track morale (starts 100%)
 *     - Damage reduces morale (1:1 with hull damage)
 *     - Ion hits reduce morale by 20 (terror effect)
 *     - Tug Tender surrenders at morale < 50% or hull < 50%
 *     - Shuttles flee at hull < 50%
 *     - Corsairs may flee at morale < 30% AND hull < 40%
 *
 *   TARGETING AI:
 *     - Corsairs prioritize Q-Ship (biggest threat/prize)
 *     - Shuttles target fighters (boarding attempt)
 *     - Tug Tender doesn't attack aggressively
 *
 * ══════════════════════════════════════════════════════════════════
 * EXPECTED OUTCOMES
 * ══════════════════════════════════════════════════════════════════
 *   - Fighter alpha strike severely damages lead Corsair
 *   - Ion barbette drains Corsair power and morale
 *   - Q-Ship takes significant damage from Corsair focus fire
 *   - 1-2 fighters likely destroyed by shuttle/Corsair fire
 *   - Tug Tender usually surrenders (capture opportunity)
 *   - Battle typically ends in 2 rounds with mixed results
 *
 *   This demo exposes Q-Ship design weaknesses:
 *   - Low armor (1) means Corsair hits penetrate easily
 *   - Fighter fragility (4 HP) vs concentrated fire
 *   - Reliance on surprise and alpha strike
 *
 * ══════════════════════════════════════════════════════════════════
 * KEYBOARD CONTROLS: [h]elp [b]ack [r]estart [q]uit
 * ══════════════════════════════════════════════════════════════════
 */

const { DEMO_CONFIGS, createDefaultSystems } = require('./combat-demo-ships');

// ANSI codes
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
const MAGENTA = `${ESC}[35m`;
const WHITE = `${ESC}[37m`;

// Load demo config
const config = DEMO_CONFIGS.demo4;

// State object
let state = {};
let returnToMenuCallback = null;

// Dice helpers
function roll1d6() { return Math.floor(Math.random() * 6) + 1; }
function roll2d6() {
  const d1 = roll1d6(), d2 = roll1d6();
  return { dice: [d1, d2], total: d1 + d2 };
}
function rollNd6(n) {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += roll1d6();
  return sum;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Reset state for new demo run
function resetState(options = {}) {
  const playerFleet = config.playerFleet.map(ship => ({
    ...ship,
    systems: createDefaultSystems(),
    destroyed: false,
    fled: false,
    surrendered: false,
    thrustUsed: 0,
    evasive: false
  }));

  const enemyFleet = config.enemyFleet.map(ship => ({
    ...ship,
    systems: createDefaultSystems(),
    destroyed: false,
    fled: false,
    surrendered: false,
    thrustUsed: 0,
    evasive: false,
    morale: 100  // Pirate morale - drops when losing
  }));

  state = {
    round: 1,
    phase: 'initiative',
    range: options.startRange || config.startRange,
    playerFleet,
    enemyFleet,
    narrative: [],
    maxNarrative: 12,  // Reduced for cleaner display
    manualMode: options.manualMode || false,
    piratesSurprised: true,  // First round surprise
    actingShip: null,        // Currently acting ship ID
    initiativeOrder: []      // Sorted by initiative roll
  };
}

function rollShipInitiative(ship) {
  let tacticsBonus = 0;
  if (ship.captain?.skill_tactics_naval) {
    const tacticsRoll = roll2d6();
    const tacticsTotal = tacticsRoll.total + ship.captain.skill_tactics_naval;
    if (tacticsTotal >= 8) {
      tacticsBonus = tacticsTotal - 8;
    }
  }

  const initRoll = roll2d6();
  const pilotSkill = ship.pilotSkill || 0;
  const thrust = ship.thrust || 0;
  const total = initRoll.total + pilotSkill + thrust + tacticsBonus;

  return { roll: initRoll.total, pilot: pilotSkill, thrust, tactics: tacticsBonus, total };
}

function addNarrative(text) {
  state.narrative.push(text);
  while (state.narrative.length > state.maxNarrative) state.narrative.shift();
}

function colorBar(current, max, width = 8) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.round(pct * width);
  const color = pct > 0.5 ? GREEN : pct > 0.25 ? YELLOW : RED;
  return color + '█'.repeat(filled) + DIM + '░'.repeat(width - filled) + RESET;
}

function getRangeDM(range) {
  const DMs = {
    'Adjacent': 0, 'Close': 0, 'Short': 1,
    'Medium': 0, 'Long': -2, 'Very Long': -4, 'Distant': -6
  };
  return DMs[range] || 0;
}

function getAliveShips(fleet) {
  return fleet.filter(s => !s.destroyed && !s.fled && !s.surrendered && s.hull > 0);
}

function isFleetDefeated(fleet) {
  return getAliveShips(fleet).length === 0;
}

function getFleetSummary(fleet, color) {
  const alive = getAliveShips(fleet);
  const totalHull = fleet.reduce((sum, s) => sum + (s.destroyed ? 0 : s.hull), 0);
  const maxHull = fleet.reduce((sum, s) => sum + s.maxHull, 0);
  return `${color}${alive.length}/${fleet.length} ships${RESET}`;
}

const visLen = (s) => s.replace(/\x1b\[[0-9;]*m/g, '').length;

function render() {
  const termWidth = process.stdout.columns || 120;
  const w = Math.min(110, termWidth - 4);

  let out = CLEAR + HOME;

  // Header
  out += `${CYAN}${BOLD}╔${'═'.repeat(w-2)}╗${RESET}\n`;
  const title = `DEMO 5: ${config.description}`;
  out += `${CYAN}${BOLD}║${RESET} ${WHITE}${BOLD}${title}${RESET}${' '.repeat(Math.max(1, w - title.length - 4))}${CYAN}${BOLD}║${RESET}\n`;
  const roundPhase = `ROUND ${state.round} * ${state.phase.toUpperCase()} * Range: ${state.range}`;
  const surprise = state.piratesSurprised ? ` ${YELLOW}[PIRATES SURPRISED!]${RESET}` : '';
  out += `${CYAN}${BOLD}║${RESET} ${WHITE}${roundPhase}${RESET}${surprise}${' '.repeat(Math.max(1, w - roundPhase.length - (state.piratesSurprised ? 22 : 0) - 4))}${CYAN}${BOLD}║${RESET}\n`;

  // Initiative order display
  if (state.initiativeOrder && state.initiativeOrder.length > 0) {
    const initStr = state.initiativeOrder.slice(0, 6).map((s, i) =>
      i === 0 ? `${GREEN}▶${s.name.slice(0, 8)}${RESET}` : `${DIM}${s.name.slice(0, 8)}${RESET}`
    ).join(' → ');
    const initLine = `Initiative: ${initStr}`;
    out += `${CYAN}║${RESET} ${initLine}${' '.repeat(Math.max(1, w - visLen(initLine) - 4))}${CYAN}║${RESET}\n`;
  }

  out += `${CYAN}╠${'═'.repeat(w-2)}╣${RESET}\n`;

  // Fleet status - two columns
  const col = Math.floor((w - 6) / 2);

  const pSummary = getFleetSummary(state.playerFleet, GREEN);
  const eSummary = getFleetSummary(state.enemyFleet, RED);
  out += `${CYAN}║${RESET} ${GREEN}${BOLD}Q-SHIP FLEET${RESET} ${pSummary}${' '.repeat(Math.max(1, col - 20))}${CYAN}│${RESET} ${RED}${BOLD}PIRATE FLEET${RESET} ${eSummary}${' '.repeat(Math.max(1, col - 19))}${CYAN}║${RESET}\n`;
  out += `${CYAN}╠${'═'.repeat(w-2)}╣${RESET}\n`;

  // List ships (side by side)
  const maxShips = Math.max(state.playerFleet.length, state.enemyFleet.length);
  for (let i = 0; i < maxShips; i++) {
    const pShip = state.playerFleet[i];
    const eShip = state.enemyFleet[i];

    let pLine = '';
    if (pShip) {
      const isActing = state.actingShip === pShip.id;
      const marker = isActing ? `${WHITE}${BOLD}▶${RESET}` : ' ';
      const status = pShip.destroyed ? `${RED}DESTROYED${RESET}` :
        colorBar(pShip.hull, pShip.maxHull, 6) + ` ${pShip.hull}`;
      const name = pShip.name.slice(0, 10);
      const nameColor = isActing ? `${WHITE}${BOLD}` : (pShip.destroyed ? DIM : GREEN);
      pLine = `${marker}${nameColor}${name}${RESET} ${status}`;
    }

    let eLine = '';
    if (eShip) {
      const isActing = state.actingShip === eShip.id;
      const marker = isActing ? `${WHITE}${BOLD}▶${RESET}` : ' ';
      let statusText;
      if (eShip.destroyed) statusText = `${RED}DESTROYED${RESET}`;
      else if (eShip.fled) statusText = `${YELLOW}FLED${RESET}`;
      else if (eShip.surrendered) statusText = `${MAGENTA}SURRENDERED${RESET}`;
      else statusText = colorBar(eShip.hull, eShip.maxHull, 6) + ` ${eShip.hull}`;

      const name = eShip.name.slice(0, 12);
      const morale = eShip.morale < 100 ? ` ${DIM}M:${eShip.morale}%${RESET}` : '';
      const nameColor = isActing ? `${WHITE}${BOLD}` : (eShip.destroyed || eShip.fled ? DIM : RED);
      eLine = `${marker}${nameColor}${name}${RESET} ${statusText}${morale}`;
    }

    const pPad = Math.max(1, col - visLen(pLine));
    const ePad = Math.max(1, col - visLen(eLine));
    out += `${CYAN}║${RESET} ${pLine}${' '.repeat(pPad)}${CYAN}│${RESET} ${eLine}${' '.repeat(ePad)}${CYAN}║${RESET}\n`;
  }

  out += `${CYAN}╠${'═'.repeat(w-2)}╣${RESET}\n`;

  // Narrative log
  out += `${CYAN}║${RESET} ${WHITE}${BOLD}COMBAT LOG${RESET}${' '.repeat(w - 14)}${CYAN}║${RESET}\n`;
  const logLines = state.narrative.slice(-10);
  for (const line of logLines) {
    const linePad = Math.max(1, w - visLen(line) - 4);
    out += `${CYAN}║${RESET} ${line}${' '.repeat(linePad)}${CYAN}║${RESET}\n`;
  }
  for (let i = logLines.length; i < 10; i++) {
    out += `${CYAN}║${RESET}${' '.repeat(w - 2)}${CYAN}║${RESET}\n`;
  }

  out += `${CYAN}╠${'═'.repeat(w-2)}╣${RESET}\n`;
  out += `${CYAN}║${RESET} ${DIM}[h]elp [b]ack [r]estart [q]uit${RESET}${' '.repeat(w - 35)}${CYAN}║${RESET}\n`;
  out += `${CYAN}${BOLD}╚${'═'.repeat(w-2)}╝${RESET}\n`;

  process.stdout.write(out);
}

// === TARGET SELECTION UI ===

function renderTargetSelection(targets, selectedIdx, attacker) {
  const termWidth = process.stdout.columns || 120;
  const w = Math.min(60, termWidth - 4);

  let out = CLEAR + HOME;
  out += `${CYAN}${BOLD}╔${'═'.repeat(w-2)}╗${RESET}\n`;
  out += `${CYAN}${BOLD}║${RESET} ${WHITE}${BOLD}SELECT TARGET${RESET}${' '.repeat(w - 16)}${CYAN}${BOLD}║${RESET}\n`;
  out += `${CYAN}${BOLD}║${RESET} ${DIM}${attacker.name} attacking...${RESET}${' '.repeat(Math.max(1, w - attacker.name.length - 16))}${CYAN}${BOLD}║${RESET}\n`;
  out += `${CYAN}╠${'═'.repeat(w-2)}╣${RESET}\n`;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const sel = i === selectedIdx ? `${GREEN}▶${RESET}` : ' ';
    const hullPct = Math.round((t.hull / t.maxHull) * 100);
    const hullColor = hullPct > 50 ? GREEN : hullPct > 25 ? YELLOW : RED;
    const name = t.name.padEnd(16);
    const type = (t.shipType || '').slice(0, 10).padEnd(10);
    const hull = `${hullColor}${t.hull}/${t.maxHull}${RESET}`;
    const line = `${sel} ${name} ${DIM}${type}${RESET} ${hull}`;
    out += `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(1, w - visLen(line) - 4))}${CYAN}║${RESET}\n`;
  }

  out += `${CYAN}╠${'═'.repeat(w-2)}╣${RESET}\n`;
  out += `${CYAN}║${RESET} ${DIM}[↑/↓] Select  [Enter] Confirm  [Esc] Cancel${RESET}${' '.repeat(Math.max(1, w - 46))}${CYAN}║${RESET}\n`;
  out += `${CYAN}${BOLD}╚${'═'.repeat(w-2)}╝${RESET}\n`;

  process.stdout.write(out);
}

async function selectTarget(attacker, enemyFleet) {
  const targets = enemyFleet.filter(s => !s.destroyed && !s.fled && !s.surrendered);
  if (targets.length === 0) return null;
  if (targets.length === 1) return targets[0];  // Auto-select if only one target

  let selectedIdx = 0;
  renderTargetSelection(targets, selectedIdx, attacker);

  return new Promise((resolve) => {
    const cleanup = () => {
      process.stdin.removeListener('data', onData);
    };

    const onData = (key) => {
      if (key === '\u0003') {  // Ctrl+C
        cleanup();
        process.stdout.write(CLEAR + HOME);
        process.exit(0);
      }

      if (key === '\x1b' || key === 'c' || key === 'C') {  // Escape or C to cancel
        cleanup();
        render();
        resolve(null);
        return;
      }

      if (key === '\r' || key === '\n') {  // Enter to confirm
        cleanup();
        render();
        resolve(targets[selectedIdx]);
        return;
      }

      if (key === '\x1b[A') {  // Up arrow
        if (selectedIdx > 0) {
          selectedIdx--;
          renderTargetSelection(targets, selectedIdx, attacker);
        }
        return;
      }

      if (key === '\x1b[B') {  // Down arrow
        if (selectedIdx < targets.length - 1) {
          selectedIdx++;
          renderTargetSelection(targets, selectedIdx, attacker);
        }
        return;
      }

      // Number keys for quick select (1-9)
      const num = parseInt(key);
      if (num >= 1 && num <= targets.length) {
        cleanup();
        render();
        resolve(targets[num - 1]);
        return;
      }
    };

    process.stdin.on('data', onData);
  });
}

// Resolve attack
async function resolveAttack(attacker, defender, weapon) {
  state.actingShip = attacker.id;
  render();

  const turret = weapon || attacker.turrets?.[0];
  if (!turret) return { hit: false };

  const fc = attacker.fireControl || 0;
  const gunner = turret.gunnerSkill || 0;
  const rangeDM = getRangeDM(state.range);
  // Surprise bonus on first round
  const surpriseBonus = state.piratesSurprised && state.playerFleet.includes(attacker) ? 2 : 0;
  const totalDM = fc + gunner + rangeDM + surpriseBonus;

  const roll = roll2d6();
  const total = roll.total + totalDM;
  const hit = total >= 8;
  const effect = hit ? total - 8 : 0;

  const attackerColor = state.playerFleet.includes(attacker) ? GREEN : RED;
  const weaponName = turret.weapons?.[0] || 'weapon';

  const surpriseNote = surpriseBonus > 0 ? ` ${YELLOW}+${surpriseBonus} surprise${RESET}` : '';
  addNarrative(`${attackerColor}${attacker.name}${RESET} fires at ${defender.name}${surpriseNote}`);
  addNarrative(`  ${roll.total}+${totalDM}=${total} → ${hit ? `${GREEN}HIT${RESET}` : `${DIM}MISS${RESET}`}`);

  if (hit) {
    let damageRoll = weaponName === 'missile_rack' ? rollNd6(4) : rollNd6(2);
    const armor = defender.armour || 0;
    const damage = Math.max(0, damageRoll - armor);

    defender.hull = Math.max(0, defender.hull - damage);
    addNarrative(`  ${YELLOW}${damageRoll} - ${armor} armor = ${damage} damage${RESET}`);

    // Update morale for pirates
    if (state.enemyFleet.includes(defender) && damage > 0) {
      defender.morale = Math.max(0, (defender.morale || 100) - damage);
    }

    if (defender.hull <= 0) {
      defender.destroyed = true;
      addNarrative(`  ${RED}${BOLD}>>> ${defender.name} DESTROYED! <<<${RESET}`);
    }

    return { hit: true, damage, effect };
  }

  return { hit: false };
}

// Check if pirate should flee or surrender
function checkPirateMorale(ship) {
  if (!ship || ship.destroyed || ship.fled || ship.surrendered) return;

  const morale = ship.morale || 100;
  const hullPct = ship.hull / ship.maxHull;

  // Check power for M-Drive (need at least 20% power to flee)
  const powerPct = (ship.power || ship.maxPower || 100) / (ship.maxPower || 100);
  const canFlee = powerPct >= 0.2;

  // Tug Tender surrenders easily (valuable cargo)
  if (ship.shipType === 'Tug Tender' && (morale < 50 || hullPct < 0.5)) {
    ship.surrendered = true;
    addNarrative(`${MAGENTA}${BOLD}${ship.name} SURRENDERS! "Don't shoot! We give up!"${RESET}`);
    return;
  }

  // Shuttles flee when damaged (if they have power)
  if (ship.shipType === 'Boarding Shuttle' && hullPct < 0.5) {
    if (canFlee) {
      ship.fled = true;
      addNarrative(`${YELLOW}${ship.name} flees the battle!${RESET}`);
    } else {
      addNarrative(`${CYAN}⚡ ${ship.name} tries to flee but M-Drive offline!${RESET}`);
    }
    return;
  }

  // Corsairs may flee if heavily damaged and low morale (if they have power)
  if (ship.shipType === 'Pirate Corsair' && morale < 30 && hullPct < 0.4) {
    if (!canFlee) {
      addNarrative(`${CYAN}⚡ ${ship.name} tries to flee but M-Drive offline! (${Math.round(powerPct * 100)}% power)${RESET}`);
      return;
    }
    if (Math.random() < 0.5) {
      ship.fled = true;
      addNarrative(`${YELLOW}${BOLD}${ship.name} breaks off and runs!${RESET}`);
    }
  }
}

// Fighter alpha strike on priority target
async function fighterAlphaStrike(fighters, enemies) {
  addNarrative(`${CYAN}${BOLD}═══ FIGHTER ALPHA STRIKE ═══${RESET}`);
  render();
  await delay(600);

  // Priority: Corsairs first (biggest threat)
  const corsairs = enemies.filter(s => s.shipType?.includes('Corsair') && !s.destroyed && !s.fled);
  const target = corsairs.length > 0 ? corsairs[0] : getAliveShips(enemies)[0];

  if (!target) return;

  for (const fighter of fighters) {
    if (fighter.destroyed || target.destroyed) continue;
    if ((fighter.missiles || 0) <= 0) continue;

    fighter.missiles--;
    await resolveAttack(fighter, target, fighter.turrets?.[0]);
    checkPirateMorale(target);
    render();
    await delay(300);
  }

  addNarrative(`${CYAN}═══ ALPHA STRIKE COMPLETE ═══${RESET}`);
  render();
}

// Q-Ship ion attack
async function ionAttack(qship, target) {
  state.actingShip = qship.id;
  render();

  const barbette = qship.barbettes?.find(b => b.id === 'ion');
  if (!barbette) return { hit: false };

  const fc = qship.fireControl || 0;
  const gunner = barbette.gunnerSkill || 0;
  const rangeDM = getRangeDM(state.range);
  const totalDM = fc + gunner + rangeDM;

  const roll = roll2d6();
  const total = roll.total + totalDM;
  const hit = total >= 8;
  const effect = hit ? total - 8 : 0;

  addNarrative(`${GREEN}${qship.name}${RESET} fires ${CYAN}ION BARBETTE${RESET} at ${target.name}`);

  if (hit) {
    const ionDice = rollNd6(3);
    const powerDrain = (ionDice + effect) * 10;
    target.power = Math.max(0, (target.power || target.maxPower || 100) - powerDrain);
    target.morale = Math.max(0, (target.morale || 100) - 20);  // Ion hits terrify pirates

    addNarrative(`  ${CYAN}${BOLD}⚡ ${powerDrain} POWER DRAINED!${RESET}`);
    checkPirateMorale(target);
    return { hit: true, powerDrain };
  }

  addNarrative(`  ${DIM}Miss${RESET}`);
  return { hit: false };
}

// Q-Ship turret barrage - fire offensive turrets (3 & 4)
async function qshipTurretBarrage(qship, enemies) {
  const aliveEnemies = getAliveShips(enemies);
  if (aliveEnemies.length === 0 || !qship || qship.destroyed) return;

  // Only fire offensive turrets (3 & 4 have beam lasers + missiles)
  const offensiveTurrets = qship.turrets?.filter(t =>
    t.weapons?.some(w => w !== 'sandcaster')
  ) || [];

  if (offensiveTurrets.length === 0) return;

  addNarrative(`${GREEN}${BOLD}── Q-SHIP TURRET BARRAGE ──${RESET}`);
  render();
  await delay(400);

  for (const turret of offensiveTurrets) {
    // Target priority: damaged corsairs first, then any alive
    const target = aliveEnemies.find(e => e.shipType?.includes('Corsair') && e.hull < e.maxHull)
      || aliveEnemies.find(e => e.shipType?.includes('Corsair'))
      || aliveEnemies[0];

    if (!target || target.destroyed) continue;

    await resolveAttack(qship, target, turret);
    checkPirateMorale(target);
    render();
    await delay(300);
  }
}

// Pirates attack
async function pirateFleetAttack(pirates, playerFleet) {
  const alivePirates = getAliveShips(pirates);
  if (alivePirates.length === 0) return;

  addNarrative(`${RED}${BOLD}═══ PIRATE ATTACK ═══${RESET}`);
  render();
  await delay(500);

  // Corsairs target Q-Ship, shuttles target fighters
  const qship = playerFleet.find(s => s.shipType === 'Q-Ship');
  const fighters = playerFleet.filter(s => s.shipType?.includes('Fighter') && !s.destroyed);

  for (const pirate of alivePirates) {
    if (pirate.shipType === 'Tug Tender') continue;  // Tug doesn't attack aggressively

    let target;
    if (pirate.shipType === 'Boarding Shuttle' && fighters.length > 0) {
      target = fighters[Math.floor(Math.random() * fighters.length)];
    } else if (qship && !qship.destroyed) {
      target = qship;
    } else {
      target = getAliveShips(playerFleet)[0];
    }

    if (!target) continue;

    await resolveAttack(pirate, target, pirate.turrets?.[0]);
    render();
    await delay(300);
  }

  addNarrative(`${RED}═══ PIRATE ATTACK COMPLETE ═══${RESET}`);
}

async function runDemo() {
  addNarrative(`${CYAN}${BOLD}═══ AMBUSH! ═══${RESET}`);
  addNarrative(`Pirates approached what they thought was a merchant...`);
  addNarrative(`${GREEN}Q-Ship reveals hidden weapons!${RESET}`);
  addNarrative(`${YELLOW}"It's a trap! All ships, defensive positions!"${RESET}`);
  render();
  await delay(2500);

  // === INITIATIVE (Pirates surprised - player goes first) ===
  state.phase = 'initiative';
  addNarrative(`${WHITE}${BOLD}─── INITIATIVE ───${RESET}`);
  addNarrative(`${GREEN}${BOLD}Q-SHIP FLEET HAS SURPRISE!${RESET}`);

  // Compute initiative order for all ships
  const allShips = [...state.playerFleet, ...state.enemyFleet].filter(s => !s.destroyed && !s.fled);
  state.initiativeOrder = allShips.map(s => ({
    ...s,
    initiative: rollShipInitiative(s).total
  })).sort((a, b) => b.initiative - a.initiative);

  render();
  await delay(1500);

  // === ROUND 1 ===
  state.round = 1;
  state.phase = 'attack';
  addNarrative(`${WHITE}${BOLD}═══ ROUND 1: ATTACK ═══${RESET}`);
  render();
  await delay(800);

  const qship = state.playerFleet.find(s => s.shipType === 'Q-Ship');
  const fighters = state.playerFleet.filter(s => s.shipType?.includes('Fighter'));
  const pinnace = state.playerFleet.find(s => s.shipType?.includes('Pinnace'));

  // Fighters alpha strike on lead corsair
  await fighterAlphaStrike(getAliveShips(fighters), state.enemyFleet);

  // Q-Ship ion attack - player selects target in manual mode
  const corsairs = state.enemyFleet.filter(s => s.shipType?.includes('Corsair') && !s.destroyed && !s.fled);
  if (corsairs.length > 0 && qship && !qship.destroyed) {
    let ionTarget = corsairs[0];
    if (state.manualMode) {
      addNarrative(`${WHITE}${BOLD}Select ion cannon target:${RESET}`);
      render();
      const selected = await selectTarget(qship, state.enemyFleet);
      if (selected) ionTarget = selected;
    }
    await ionAttack(qship, ionTarget);
    render();
    await delay(500);
  }

  // Q-Ship turret barrage
  await qshipTurretBarrage(qship, state.enemyFleet);

  // Check morale for all pirates
  for (const pirate of state.enemyFleet) {
    checkPirateMorale(pirate);
  }
  render();

  // Victory check
  if (isFleetDefeated(state.enemyFleet)) {
    addNarrative(`${GREEN}${BOLD}*** PIRATE FLEET DEFEATED! VICTORY! ***${RESET}`);
    const surrendered = state.enemyFleet.filter(s => s.surrendered);
    if (surrendered.length > 0) {
      addNarrative(`${MAGENTA}Captured: ${surrendered.map(s => s.name).join(', ')}${RESET}`);
    }
    render();
    await delay(3000);
    return;
  }

  // Pirates counterattack (if any survive)
  state.piratesSurprised = false;  // No more surprise bonus
  await pirateFleetAttack(state.enemyFleet, state.playerFleet);

  if (isFleetDefeated(state.playerFleet)) {
    addNarrative(`${RED}${BOLD}*** FLEET DESTROYED! DEFEAT! ***${RESET}`);
    render();
    await delay(3000);
    return;
  }

  // === ROUND 2 ===
  state.round = 2;
  state.phase = 'manoeuvre';
  addNarrative(`${WHITE}${BOLD}═══ ROUND 2 ═══${RESET}`);
  render();
  await delay(1000);

  // Close range
  state.range = 'Medium';
  addNarrative(`${GREEN}Q-Ship fleet closes to Medium range${RESET}`);
  render();
  await delay(800);

  state.phase = 'attack';
  addNarrative(`${WHITE}${BOLD}─── ROUND 2: ATTACK ───${RESET}`);
  render();

  // Continue alpha strike
  const aliveFighters = getAliveShips(fighters);
  if (aliveFighters.length > 0) {
    await fighterAlphaStrike(aliveFighters, state.enemyFleet);
  }

  // Q-Ship continues ion bombardment - player selects target
  const remainingCorsairs = state.enemyFleet.filter(s =>
    s.shipType?.includes('Corsair') && !s.destroyed && !s.fled && !s.surrendered);
  if (remainingCorsairs.length > 0 && qship && !qship.destroyed) {
    let ionTarget = remainingCorsairs[0];
    if (state.manualMode) {
      addNarrative(`${WHITE}${BOLD}Select ion cannon target:${RESET}`);
      render();
      const selected = await selectTarget(qship, state.enemyFleet);
      if (selected) ionTarget = selected;
    }
    await ionAttack(qship, ionTarget);
    render();
  }

  // Q-Ship turret barrage
  await qshipTurretBarrage(qship, state.enemyFleet);

  // Pinnace attacks - player selects target
  if (pinnace && !pinnace.destroyed) {
    let pinnaceTarget = getAliveShips(state.enemyFleet)[0];
    if (state.manualMode && pinnaceTarget) {
      addNarrative(`${WHITE}${BOLD}Select pinnace target:${RESET}`);
      render();
      const selected = await selectTarget(pinnace, state.enemyFleet);
      if (selected) pinnaceTarget = selected;
    }
    if (pinnaceTarget) {
      await resolveAttack(pinnace, pinnaceTarget, pinnace.turrets?.[0]);
      checkPirateMorale(pinnaceTarget);
      render();
    }
  }

  // Check all pirates for morale
  for (const pirate of state.enemyFleet) {
    checkPirateMorale(pirate);
  }
  render();
  await delay(500);

  // Pirates counterattack
  await pirateFleetAttack(state.enemyFleet, state.playerFleet);

  // Final status
  if (isFleetDefeated(state.enemyFleet)) {
    addNarrative(`${GREEN}${BOLD}*** PIRATE FLEET DEFEATED! VICTORY! ***${RESET}`);
    const surrendered = state.enemyFleet.filter(s => s.surrendered);
    const fled = state.enemyFleet.filter(s => s.fled);
    if (surrendered.length > 0) {
      addNarrative(`${MAGENTA}Captured: ${surrendered.map(s => s.name).join(', ')}${RESET}`);
    }
    if (fled.length > 0) {
      addNarrative(`${YELLOW}Escaped: ${fled.map(s => s.name).join(', ')}${RESET}`);
    }
  } else if (isFleetDefeated(state.playerFleet)) {
    addNarrative(`${RED}${BOLD}*** FLEET DESTROYED! DEFEAT! ***${RESET}`);
  } else {
    addNarrative(`${CYAN}═══ DEMO COMPLETE ═══${RESET}`);
    addNarrative(`Player: ${getAliveShips(state.playerFleet).length}/${state.playerFleet.length} ships`);
    addNarrative(`Pirates: ${getAliveShips(state.enemyFleet).length}/${state.enemyFleet.length} ships`);
  }

  render();
  await delay(3000);
}

// === KEYBOARD HANDLING ===
let showingHelp = false;

function renderHelp() {
  const w = 50;
  let out = CLEAR + HOME;
  out += `${CYAN}${BOLD}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${WHITE}${BOLD}DEMO 5: PIRATE AMBUSH HELP${RESET}${' '.repeat(w - 30)}${CYAN}|${RESET}\n`;
  out += `${CYAN}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}h${RESET}  - Show this help${' '.repeat(w - 24)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}m${RESET}  - Toggle manual mode${' '.repeat(w - 27)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}b${RESET}  - Back to menu${' '.repeat(w - 22)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}r${RESET}  - Restart demo${' '.repeat(w - 22)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}q${RESET}  - Quit program${' '.repeat(w - 22)}${CYAN}|${RESET}\n`;
  out += `${CYAN}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${WHITE}SCENARIO${RESET}${' '.repeat(w - 12)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  8 Q-Ship Fleet vs 5 Pirates${' '.repeat(w - 33)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  Pirates surprised - you act first!${' '.repeat(w - 40)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  Tug Tender is valuable prize${' '.repeat(w - 34)}${CYAN}|${RESET}\n`;
  out += `${CYAN}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${DIM}Press any key to continue...${RESET}${' '.repeat(w - 32)}${CYAN}|${RESET}\n`;
  out += `${CYAN}${BOLD}+${'-'.repeat(w-2)}+${RESET}\n`;
  process.stdout.write(out);
}

function setupKeyboardInput() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
    if (key === '\u0003') {
      process.stdout.write(CLEAR + HOME);
      process.exit(0);
    }

    if (showingHelp) {
      showingHelp = false;
      render();
      return;
    }

    if (key === 'h' || key === 'H') {
      showingHelp = true;
      renderHelp();
      return;
    }

    if (key === 'b' || key === 'B') {
      cleanupKeyboard();
      if (returnToMenuCallback) {
        returnToMenuCallback();
      } else {
        process.stdout.write(CLEAR + HOME);
        process.exit(0);
      }
      return;
    }

    if (key === 'q' || key === 'Q') {
      process.stdout.write(CLEAR + HOME + 'Goodbye!\n');
      process.exit(0);
    }

    if (key === 'm' || key === 'M') {
      state.manualMode = !state.manualMode;
      addNarrative(state.manualMode ?
        `${GREEN}Manual mode ENABLED - you will select targets${RESET}` :
        `${YELLOW}Manual mode DISABLED - AI selects targets${RESET}`);
      render();
      return;
    }

    if (key === 'r' || key === 'R') {
      process.stdout.write(CLEAR + HOME + `${YELLOW}Restarting...${RESET}\n`);
      resetState({ manualMode: state.manualMode });
      runDemo().catch(console.error);
    }
  });
}

function cleanupKeyboard() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
  process.stdin.removeAllListeners('data');
}

// === EXPORTED ENTRY POINT ===
async function runDemo4(options = {}) {
  return new Promise((resolve) => {
    returnToMenuCallback = resolve;
    resetState(options);
    setupKeyboardInput();
    runDemo().then(() => {
      setTimeout(() => {
        cleanupKeyboard();
        resolve();
      }, 3000);
    }).catch(console.error);
  });
}

module.exports = { runDemo4 };

// Run directly if executed as main
if (require.main === module) {
  resetState();
  setupKeyboardInput();
  runDemo().catch(console.error);
}
