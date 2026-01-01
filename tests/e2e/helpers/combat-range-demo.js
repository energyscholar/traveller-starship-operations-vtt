#!/usr/bin/env node
/**
 * AR-207 Range-Aware Combat Demo
 * Shows range bands, thrust, and sandcaster effectiveness
 * Run: node tests/e2e/helpers/combat-range-demo.js
 */

const {
  narratePhaseChange,
  narrateAttack,
  narrateDamage,
  narrateEvasive,
  narrateReaction
} = require('./combat-display');

// ANSI
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

function colorBar(current, max, width = 20) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.round(pct * width);
  const color = pct > 0.5 ? GREEN : pct > 0.25 ? YELLOW : RED;
  return color + '█'.repeat(filled) + DIM + '░'.repeat(width - filled) + RESET;
}

function systemColor(health) {
  if (health > 66) return GREEN;
  if (health > 33) return YELLOW;
  return RED;
}

function worstSystemColor(systems) {
  const minHealth = Math.min(...Object.values(systems));
  return systemColor(minHealth);
}

const SYSTEM_NAMES = {
  mDrive: 'M-Drive',
  jDrive: 'J-Drive',
  powerPlant: 'Power',
  sensors: 'Sensors',
  computer: 'Computer',
  lifeSupport: 'Life Sup',
  fuel: 'Fuel',
  bridge: 'Bridge'
};

function renderSystemsPanel(systems, shipName, x, y) {
  const lines = [];
  lines.push(`${MAGENTA}${BOLD}┌─ ${shipName.toUpperCase()} SYSTEMS ─┐${RESET}`);
  for (const [key, name] of Object.entries(SYSTEM_NAMES)) {
    const health = systems[key];
    const color = systemColor(health);
    const bar = colorBar(health, 100, 8);
    lines.push(`${MAGENTA}│${RESET} ${name.padEnd(9)} ${bar} ${color}${health.toString().padStart(3)}%${RESET}${MAGENTA}│${RESET}`);
  }
  lines.push(`${MAGENTA}└${'─'.repeat(22)}┘${RESET}`);
  return lines;
}

// Apply random system damage (critical hits)
function applySystemDamage(systems, severity) {
  const systemKeys = Object.keys(systems);
  const targetSystem = systemKeys[Math.floor(Math.random() * systemKeys.length)];
  const damage = Math.min(systems[targetSystem], 10 + severity * 10);
  systems[targetSystem] = Math.max(0, systems[targetSystem] - damage);
  return { system: SYSTEM_NAMES[targetSystem], damage };
}

// Help overlay (H key)
function renderHelpOverlay() {
  const lines = [];
  const w = 36;
  lines.push(`${CYAN}${BOLD}╔${'═'.repeat(w-2)}╗${RESET}`);
  lines.push(`${CYAN}║${RESET} ${WHITE}${BOLD}HOTKEYS${RESET}${' '.repeat(w - 11)}${CYAN}║${RESET}`);
  lines.push(`${CYAN}╠${'═'.repeat(w-2)}╣${RESET}`);
  lines.push(`${CYAN}║${RESET}  ${YELLOW}H${RESET}  Toggle this help       ${CYAN}║${RESET}`);
  lines.push(`${CYAN}║${RESET}  ${YELLOW}S${RESET}  Toggle systems overlay  ${CYAN}║${RESET}`);
  lines.push(`${CYAN}║${RESET}  ${YELLOW}D${RESET}  Toggle ship detail      ${CYAN}║${RESET}`);
  lines.push(`${CYAN}║${RESET}  ${YELLOW}1${RESET}  Select enemy ship       ${CYAN}║${RESET}`);
  lines.push(`${CYAN}║${RESET}  ${YELLOW}2${RESET}  Select player ship      ${CYAN}║${RESET}`);
  lines.push(`${CYAN}║${RESET}  ${YELLOW}Q${RESET}  Quit                    ${CYAN}║${RESET}`);
  lines.push(`${CYAN}╠${'═'.repeat(w-2)}╣${RESET}`);
  lines.push(`${CYAN}║${RESET} ${DIM}Press H to close${RESET}${' '.repeat(w - 20)}${CYAN}║${RESET}`);
  lines.push(`${CYAN}╚${'═'.repeat(w-2)}╝${RESET}`);
  return lines;
}

// Full ship detail overlay (D key)
function renderDetailOverlay(ship, shipName, systems, isPlayer) {
  const lines = [];
  const color = isPlayer ? GREEN : RED;
  const w = 40;
  lines.push(`${color}${BOLD}╔${'═'.repeat(w-2)}╗${RESET}`);
  lines.push(`${color}║${RESET} ${WHITE}${BOLD}${shipName.toUpperCase().padEnd(w-4)}${RESET}${color}║${RESET}`);
  lines.push(`${color}╠${'═'.repeat(w-2)}╣${RESET}`);

  // Stats
  lines.push(`${color}║${RESET} Tonnage: ${ship.tonnage}t${' '.repeat(w - 16 - String(ship.tonnage).length)}${color}║${RESET}`);
  lines.push(`${color}║${RESET} Hardpoints: ${ship.hardpoints}${' '.repeat(w - 17)}${color}║${RESET}`);
  lines.push(`${color}║${RESET} Thrust: ${ship.thrust}  FC: +${ship.fireControl}${' '.repeat(w - 22)}${color}║${RESET}`);
  lines.push(`${color}║${RESET} Pilot: +${ship.pilotSkill}${' '.repeat(w - 14)}${color}║${RESET}`);
  lines.push(`${color}╠${'═'.repeat(w-2)}╣${RESET}`);

  // Hull/Power
  const hullPct = Math.round((ship.hull / ship.maxHull) * 100);
  const pwrPct = Math.round((ship.power / ship.maxPower) * 100);
  lines.push(`${color}║${RESET} Hull:  ${colorBar(ship.hull, ship.maxHull, 15)} ${hullPct}%${' '.repeat(w - 29)}${color}║${RESET}`);
  lines.push(`${color}║${RESET} Power: ${colorBar(ship.power, ship.maxPower, 15)} ${pwrPct}%${' '.repeat(w - 29)}${color}║${RESET}`);
  lines.push(`${color}╠${'═'.repeat(w-2)}╣${RESET}`);

  // Systems
  lines.push(`${color}║${RESET} ${WHITE}${BOLD}SYSTEMS${RESET}${' '.repeat(w - 11)}${color}║${RESET}`);
  for (const [key, name] of Object.entries(SYSTEM_NAMES)) {
    const health = systems[key];
    const sysColor = systemColor(health);
    lines.push(`${color}║${RESET}  ${name.padEnd(10)} ${sysColor}${health}%${RESET}${' '.repeat(w - 18 - String(health).length)}${color}║${RESET}`);
  }
  lines.push(`${color}╠${'═'.repeat(w-2)}╣${RESET}`);

  // Weapons
  lines.push(`${color}║${RESET} ${WHITE}${BOLD}WEAPONS${RESET}${' '.repeat(w - 11)}${color}║${RESET}`);
  if (ship.barbettes) {
    for (const b of ship.barbettes) {
      lines.push(`${color}║${RESET}  ${CYAN}${b.name}${RESET}${' '.repeat(w - 6 - b.name.length)}${color}║${RESET}`);
      lines.push(`${color}║${RESET}   ${DIM}${b.gunner} +${b.gunnerSkill}${RESET}${' '.repeat(w - 9 - b.gunner.length - String(b.gunnerSkill).length)}${color}║${RESET}`);
    }
  }
  if (ship.turrets) {
    for (const t of ship.turrets) {
      const wpns = t.weapons.slice(0, 2).map(w => w.slice(0, 6)).join(',');
      lines.push(`${color}║${RESET}  T${t.id}: ${wpns}${' '.repeat(Math.max(1, w - 9 - wpns.length))}${color}║${RESET}`);
    }
  }
  lines.push(`${color}╚${'═'.repeat(w-2)}╝${RESET}`);
  return lines;
}

function roll2d6() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return { dice: [d1, d2], total: d1 + d2 };
}

function roll1d6() { return Math.floor(Math.random() * 6) + 1; }

function rollNd6(n) {
  let total = 0;
  for (let i = 0; i < n; i++) total += roll1d6();
  return total;
}

// Range bands
const RANGES = ['Adjacent', 'Close', 'Short', 'Medium', 'Long', 'VeryLong', 'Distant'];
const RANGE_INDEX = { Adjacent: 0, Close: 1, Short: 2, Medium: 3, Long: 4, VeryLong: 5, Distant: 6 };

function rangeBar(currentRange) {
  const idx = RANGE_INDEX[currentRange];
  let bar = '';
  for (let i = 0; i < RANGES.length; i++) {
    if (i === idx) {
      bar += `${YELLOW}${BOLD}[${RANGES[i].slice(0,3).toUpperCase()}]${RESET}`;
    } else if (i < idx) {
      bar += `${GREEN}${RANGES[i].slice(0,1)}${RESET}──`;
    } else {
      bar += `──${DIM}${RANGES[i].slice(0,1)}${RESET}`;
    }
  }
  return bar;
}

// State
let state = {
  round: 1,
  phase: 'manoeuvre',
  range: 'Close',  // Starting at CLOSE - sandcasters work!
  // ISS Astral Dawn (Q-Ship) - from data/ships/v2/amishi.json
  player: {
    name: 'Astral Dawn',
    hull: 240, maxHull: 240,     // 600t = 240 HP
    armour: 1,                    // Bonded Superdense, Rating 1
    power: 548, maxPower: 548,    // Power output: 548
    thrust: 3, thrustUsed: 0,     // Thrust 3
    jump: 3,                      // Jump-3
    evasive: false,
    sandcasters: 120,             // 6x sandcasters × 20 canisters
    pilotSkill: 2,
    fireControl: 4,               // FC/4 from Computer/25
    sensorDM: 1,                  // Improved sensors
    // Ship specs
    tonnage: 600,
    hardpoints: 6,
    barbettes: [
      { id: 'ion', name: 'Ion Barbette', damage: '3d6×10 pwr', gunner: 'Marina', gunnerSkill: 6 },
      { id: 'particle', name: 'Particle Barb', damage: '6d6 hull', gunner: 'Marina', gunnerSkill: 6 }
    ],
    turrets: [
      { id: 1, type: 'triple', weapons: ['sandcaster', 'sandcaster', 'sandcaster'], gunner: 'AI Gunner', gunnerSkill: 1 },
      { id: 2, type: 'triple', weapons: ['sandcaster', 'sandcaster', 'sandcaster'], gunner: 'AI Gunner', gunnerSkill: 1 },
      { id: 3, type: 'triple', weapons: ['beam_laser', 'missile', 'missile'], gunner: 'AI Gunner', gunnerSkill: 1 },
      { id: 4, type: 'triple', weapons: ['beam_laser', 'missile', 'missile'], gunner: 'AI Gunner', gunnerSkill: 1 }
    ]
  },
  // Patrol Corvette (Type-T) - Mongoose Traveller stats
  // Source: MONGOOSE-TRAVELLER-RULES-EXTRACT.md:516
  enemy: {
    name: 'Patrol Corvette',
    hull: 160, maxHull: 160,    // 400t = 160 HP
    armour: 4,                   // Armour 4
    power: 390, maxPower: 390,   // Power required: 390
    thrust: 4, thrustUsed: 0,    // Thrust 4
    jump: 3,                     // Jump-3
    pilotSkill: 2,               // Trained Navy pilot
    fireControl: 1,              // Fire Control/1
    sensorDM: 1,                 // Military Grade sensors
    tacticalAwareness: false,
    // Ship specs
    tonnage: 400,
    hardpoints: 4,
    turrets: [
      { id: 1, type: 'triple', weapons: ['pulse_laser', 'pulse_laser', 'pulse_laser'], gunner: 'Navy Gunner', gunnerSkill: 2 },
      { id: 2, type: 'triple', weapons: ['pulse_laser', 'pulse_laser', 'pulse_laser'], gunner: 'Navy Gunner 2', gunnerSkill: 2 },
      { id: 3, type: 'triple', weapons: ['missile_rack', 'missile_rack', 'missile_rack'], gunner: 'Navy Gunner 3', gunnerSkill: 1 },
      { id: 4, type: 'triple', weapons: ['missile_rack', 'missile_rack', 'missile_rack'], gunner: 'Navy Gunner 4', gunnerSkill: 1 }
    ]
  },
  narrative: [],
  maxNarrative: 20,  // Longer scrollback for larger display
  // Damage flash state
  playerDamageFlash: null,  // { amount, expiry }
  enemyDamageFlash: null,
  // Initiative tracking
  initiativeStep: 0,  // Current step in initiative sequence
  // Ship detail view
  selectedShip: 1,  // 1=enemy, 2=player (press 1/2 to toggle)
  showDetailOverlay: false,  // D key toggles full overlay
  showSystemsOverlay: false, // S key toggles systems overlay
  showHelpOverlay: false,    // H key toggles help overlay
  currentActor: 'player',    // Whose turn it is (for turn indicator colors)
  // Ship systems state (percentage health)
  playerSystems: {
    mDrive: 100, jDrive: 100, powerPlant: 100, sensors: 100,
    computer: 100, lifeSupport: 100, fuel: 100, bridge: 100
  },
  enemySystems: {
    mDrive: 100, jDrive: 100, powerPlant: 100, sensors: 100,
    computer: 100, lifeSupport: 100, fuel: 100, bridge: 100
  }
};

// Initiative sequence (Traveller ship combat)
const INITIATIVE_SEQUENCE = [
  { id: 'manoeuvre', name: 'Manoeuvre', desc: 'Pilot actions' },
  { id: 'attack', name: 'Attack', desc: 'Gunnery fire' },
  { id: 'reaction', name: 'Reaction', desc: 'Point defense' },
  { id: 'damage', name: 'Damage', desc: 'Apply hits' }
];

function addNarrative(text) {
  state.narrative.push(text);
  while (state.narrative.length > state.maxNarrative) state.narrative.shift();
}

function canUseSandcaster() {
  return state.range === 'Adjacent' || state.range === 'Close';
}

// Helper to flash damage on a ship
function flashDamage(target, amount) {
  const flash = { amount, expiry: Date.now() + 2000 };  // 2 second flash
  if (target === 'player') state.playerDamageFlash = flash;
  else state.enemyDamageFlash = flash;
}

function renderInitiativeSidebar() {
  const lines = [];
  const W = 16;  // Inner content width (fixed)

  // Strip ANSI codes to get visible length
  const visLen = (s) => s.replace(/\x1b\[[0-9;]*m/g, '').length;

  // Create a sidebar line with exact width - content is padded to W chars
  const row = (text) => {
    const vl = visLen(text);
    const pad = Math.max(0, W - vl);
    return `${MAGENTA}│${RESET}${text}${' '.repeat(pad)}${MAGENTA}│${RESET}`;
  };

  const top = `${MAGENTA}┌${'─'.repeat(W)}┐${RESET}`;
  const mid = `${MAGENTA}├${'─'.repeat(W)}┤${RESET}`;
  const bot = `${MAGENTA}└${'─'.repeat(W)}┘${RESET}`;

  lines.push(top);
  lines.push(row(`${WHITE}${BOLD}INITIATIVE${RESET}`));
  lines.push(row(`Round ${state.round}`));
  lines.push(mid);

  // Phases
  for (const step of INITIATIVE_SEQUENCE) {
    const isCurrent = step.id === state.phase;
    const prefix = isCurrent ? `${YELLOW}►` : `${DIM} `;
    lines.push(row(`${prefix}${step.name}${RESET}`));
  }
  lines.push(mid);

  // Ship selector
  const s1 = state.selectedShip === 1 ? `${YELLOW}[1]${RESET}` : ' 1 ';
  const s2 = state.selectedShip === 2 ? `${YELLOW}[2]${RESET}` : ' 2 ';
  lines.push(row(`${s1}  ${s2}`));
  lines.push(mid);

  // Selected ship
  const isEnemy = state.selectedShip === 1;
  const ship = isEnemy ? state.enemy : state.player;
  const name = isEnemy ? 'CORVETTE' : 'ASTRAL';
  const col = isEnemy ? RED : GREEN;

  lines.push(row(`${col}${BOLD}${name}${RESET}`));
  lines.push(row(`${DIM}${ship.tonnage}t ${ship.hardpoints}HP${RESET}`));
  lines.push(row(`${DIM}T:${ship.thrust} FC:+${ship.fireControl}${RESET}`));
  lines.push(mid);

  // Turrets (show all, compact)
  const turrets = ship.turrets || [];
  for (const t of turrets.slice(0, 4)) {
    const wpn = (t.weapons[0] || '').replace('_', ' ').slice(0, 5);
    lines.push(row(`${col}T${t.id}:${wpn} +${t.gunnerSkill}${RESET}`));
  }
  lines.push(mid);

  // Hotkeys hint
  lines.push(row(`${YELLOW}H${RESET} = Help`));
  lines.push(bot);

  return lines;
}

function render() {
  // Auto-fit to terminal size - optimized for wide screens
  const termWidth = process.stdout.columns || 180;
  const termHeight = process.stdout.rows || 50;
  const sidebarW = 20;  // Sidebar total width (16 inner + 2 borders + 2 gap)
  const w = Math.max(140, termWidth - sidebarW - 4);  // Main panel width - much wider
  const h = termHeight;  // Alias for overlay positioning
  const narrativeLines = Math.max(18, h - 16);  // More narrative lines

  let out = CLEAR + HOME;

  // Check if flashes expired
  if (state.playerDamageFlash && Date.now() > state.playerDamageFlash.expiry) state.playerDamageFlash = null;
  if (state.enemyDamageFlash && Date.now() > state.enemyDamageFlash.expiry) state.enemyDamageFlash = null;

  // Get sidebar lines
  const sidebar = renderInitiativeSidebar();
  let sidebarIdx = 0;

  function appendSidebar(line) {
    if (sidebarIdx < sidebar.length) {
      return line + '  ' + sidebar[sidebarIdx++];
    }
    return line;
  }

  // Header
  out += appendSidebar(`${CYAN}${BOLD}╔${'═'.repeat(w-2)}╗${RESET}`) + '\n';
  out += `${CYAN}${BOLD}║${RESET} ${WHITE}${BOLD}ROUND ${state.round}${RESET} • ${YELLOW}${state.phase.toUpperCase()}${RESET}`;
  const header = `ROUND ${state.round} • ${state.phase.toUpperCase()}`;
  out += appendSidebar(' '.repeat(w - header.length - 5) + `${CYAN}${BOLD}║${RESET}`) + '\n';

  // Range band display
  out += appendSidebar(`${CYAN}${BOLD}╠${'═'.repeat(w-2)}╣${RESET}`) + '\n';
  const rangeDisplay = rangeBar(state.range);
  const sandNote = canUseSandcaster() ? `${GREEN}SANDCASTERS ACTIVE${RESET}` : `${RED}SANDCASTERS BLOCKED${RESET}`;
  out += appendSidebar(`${CYAN}║${RESET} RANGE: ${rangeDisplay}  ${sandNote}` + ' '.repeat(5) + `${CYAN}║${RESET}`) + '\n';
  out += appendSidebar(`${CYAN}╠${'═'.repeat(w-2)}╣${RESET}`) + '\n';

  // Two columns - dynamic width based on terminal
  const col1 = Math.floor((w - 6) / 2);
  const col2 = w - col1 - 6;

  // Headers with damage flash
  const enemyFlash = state.enemyDamageFlash ? ` ${RED}${BOLD}[-${state.enemyDamageFlash.amount}]${RESET}` : '';
  const playerFlash = state.playerDamageFlash ? ` ${RED}${BOLD}[-${state.playerDamageFlash.amount}]${RESET}` : '';
  const enemyHeader = `${RED}${BOLD}PATROL CORVETTE${RESET}${enemyFlash}`;
  const playerHeader = `${GREEN}${BOLD}ASTRAL DAWN${RESET}${playerFlash}`;
  out += appendSidebar(`${CYAN}║${RESET} ${enemyHeader}` + ' '.repeat(Math.max(1, col1 - 15 - (enemyFlash ? 6 : 0))) + `${CYAN}│${RESET} ${playerHeader}` + ' '.repeat(Math.max(1, col2 - 11 - (playerFlash ? 6 : 0))) + `${CYAN}║${RESET}`) + '\n';

  // Hull - show actual values with dynamic bar width + worst system indicator
  const barWidth = Math.max(10, Math.floor(col1 / 3));
  const eHullVal = `${state.enemy.hull}/${state.enemy.maxHull}`;
  const pHullVal = `${state.player.hull}/${state.player.maxHull}`;
  const eSysColor = worstSystemColor(state.enemySystems);
  const pSysColor = worstSystemColor(state.playerSystems);
  const eSysInd = `${eSysColor}●${RESET}`;  // Worst system indicator
  const pSysInd = `${pSysColor}●${RESET}`;
  out += appendSidebar(`${CYAN}║${RESET} Hull: ${colorBar(state.enemy.hull, state.enemy.maxHull, barWidth)} ${eHullVal.padStart(7)}${eSysInd}` +
    ' '.repeat(Math.max(1, col1 - 17 - barWidth)) + `${CYAN}│${RESET} Hull: ${colorBar(state.player.hull, state.player.maxHull, barWidth)} ${pHullVal.padStart(7)}${pSysInd}${CYAN}║${RESET}`) + '\n';

  // Power - show actual values with dynamic bar width
  const ePwrVal = `${state.enemy.power}/${state.enemy.maxPower}`;
  const pPwrVal = `${state.player.power}/${state.player.maxPower}`;
  out += appendSidebar(`${CYAN}║${RESET} Powr: ${colorBar(state.enemy.power, state.enemy.maxPower, barWidth)} ${ePwrVal.padStart(7)}` +
    ' '.repeat(Math.max(1, col1 - 16 - barWidth)) + `${CYAN}│${RESET} Powr: ${colorBar(state.player.power, state.player.maxPower, barWidth)} ${pPwrVal.padStart(7)}${CYAN}║${RESET}`) + '\n';

  // Thrust
  const eThrustAvail = state.enemy.thrust - state.enemy.thrustUsed;
  const pThrustAvail = state.player.thrust - state.player.thrustUsed;
  const eThrustStr = `Thrust: ${eThrustAvail}/${state.enemy.thrust}`;
  const pThrustStr = `Thrust: ${pThrustAvail}/${state.player.thrust}`;
  const pSandStr = `Sand: ${MAGENTA}${state.player.sandcasters}${RESET}`;
  let thrustLine = `${CYAN}║${RESET} ${eThrustStr}  Pilot+${state.enemy.pilotSkill}` + ' '.repeat(col1 - eThrustStr.length - 10);
  thrustLine += `${CYAN}│${RESET} ${pThrustStr}  ${pSandStr}` + ' '.repeat(col2 - pThrustStr.length - 12) + `${CYAN}║${RESET}`;
  out += appendSidebar(thrustLine) + '\n';

  // Evasive
  const evasiveStr = state.player.evasive ? `${GREEN}EVASIVE -2${RESET}` : 'Normal';
  const bestEnemyGunner = Math.max(...state.enemy.turrets.map(t => t.gunnerSkill));
  let evasiveLine = `${CYAN}║${RESET} FC/+${state.enemy.fireControl} Gunner+${bestEnemyGunner}` + ' '.repeat(col1 - 17);
  evasiveLine += `${CYAN}│${RESET} FC/+${state.player.fireControl}  ${evasiveStr}` + ' '.repeat(col2 - 18) + `${CYAN}║${RESET}`;
  out += appendSidebar(evasiveLine) + '\n';

  // Divider
  out += appendSidebar(`${CYAN}╠${'═'.repeat(w-2)}╣${RESET}`) + '\n';
  out += appendSidebar(`${CYAN}║${RESET} ${WHITE}${BOLD}COMBAT LOG${RESET}` + ' '.repeat(w - 13) + `${CYAN}║${RESET}`) + '\n';
  out += appendSidebar(`${CYAN}╠${'─'.repeat(w-2)}╣${RESET}`) + '\n';

  // Narrative - dynamic height based on terminal
  const showLines = Math.min(narrativeLines, state.narrative.length + (narrativeLines - state.narrative.length));
  for (let i = 0; i < narrativeLines; i++) {
    const lineIdx = Math.max(0, state.narrative.length - narrativeLines) + i;
    const line = state.narrative[lineIdx] || '';
    const displayLine = line.slice(0, w - 4);
    out += appendSidebar(`${CYAN}║${RESET} ${displayLine}` + ' '.repeat(Math.max(0, w - 3 - displayLine.length)) + `${CYAN}║${RESET}`) + '\n';
  }

  out += appendSidebar(`${CYAN}${BOLD}╚${'═'.repeat(w-2)}╝${RESET}`) + '\n';

  // Systems overlay (S key toggle)
  if (state.showSystemsOverlay) {
    const enemySysLines = renderSystemsPanel(state.enemySystems, 'Corvette', 0, 0);
    const playerSysLines = renderSystemsPanel(state.playerSystems, 'Astral Dawn', 0, 0);
    // Position overlays above the bottom of screen
    const overlayY = Math.floor(h / 2) - 5;
    const enemyX = 5;
    const playerX = Math.floor(w / 2) + 5;
    for (let i = 0; i < enemySysLines.length; i++) {
      out += `\x1b[${overlayY + i};${enemyX}H${enemySysLines[i]}`;
      out += `\x1b[${overlayY + i};${playerX}H${playerSysLines[i]}`;
    }
  }

  // Detail overlay (D key toggle) - full ship info
  if (state.showDetailOverlay) {
    const selectedIsPlayer = state.selectedShip === 2;
    const ship = selectedIsPlayer ? state.player : state.enemy;
    const shipName = selectedIsPlayer ? 'Astral Dawn' : 'Patrol Corvette';
    const systems = selectedIsPlayer ? state.playerSystems : state.enemySystems;
    const detailLines = renderDetailOverlay(ship, shipName, systems, selectedIsPlayer);
    // Center the overlay
    const overlayX = Math.floor(w / 2) - 20;
    const overlayY = 5;
    for (let i = 0; i < detailLines.length; i++) {
      out += `\x1b[${overlayY + i};${overlayX}H${detailLines[i]}`;
    }
  }

  // Help overlay (H key toggle)
  if (state.showHelpOverlay) {
    const helpLines = renderHelpOverlay();
    const overlayX = Math.floor(w / 2) - 18;
    const overlayY = 8;
    for (let i = 0; i < helpLines.length; i++) {
      out += `\x1b[${overlayY + i};${overlayX}H${helpLines[i]}`;
    }
  }

  process.stdout.write(out);
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function opposedPilotCheck(approacher, defender, approacherSkill, defenderSkill) {
  const aRoll = roll2d6();
  const dRoll = roll2d6();
  const aTotal = aRoll.total + approacherSkill;
  const dTotal = dRoll.total + defenderSkill;
  const success = aTotal > dTotal;
  return { success, aRoll, dRoll, aTotal, dTotal };
}

// Helper: Resolve a turret attack
async function resolveTurretAttack(turret, attackerFC, isPlayer, evasiveMod = 0) {
  const dm = attackerFC + turret.gunnerSkill;
  const roll = roll2d6();
  const total = roll.total + dm + evasiveMod;
  const hit = total >= 8;
  const weaponType = turret.weapons[0];
  const weaponName = weaponType.replace('_', ' ');

  // Damage varies by weapon
  let damage = 0;
  if (hit) {
    if (weaponType === 'pulse_laser') damage = rollNd6(2);
    else if (weaponType === 'beam_laser') damage = rollNd6(1) + 2;
    else if (weaponType === 'missile') damage = rollNd6(4); // Big if it hits
  }

  return { turret, roll, total, hit, damage, weaponName, dm };
}

async function combat() {
  // Modifier breakdowns for display
  const marinaFC = state.player.fireControl;
  const marinaGun = 6;
  const marinaDM = marinaFC + marinaGun; // FC/4 + Gunner-6 = +10
  const marinaModStr = `+${marinaDM} (FC/${marinaFC}+Gun${marinaGun})`;

  const pirateFC = state.enemy.fireControl;
  const pirateGun = Math.max(...state.enemy.turrets.map(t => t.gunnerSkill)); // Best gunner
  const pirateDEX = 1;
  const pirateDM = pirateFC + pirateGun + pirateDEX; // FC/2 + Gun/3 + DEX = +6
  const pirateModStr = `+${pirateDM} (FC/${pirateFC}+Gun${pirateGun}+DEX)`;

  addNarrative(`${CYAN}═══ COMBAT INITIATED ═══${RESET}`);
  addNarrative(`Starting range: ${YELLOW}${state.range}${RESET} - ${GREEN}Sandcasters active!${RESET}`);
  addNarrative(`Q-ship Astral Dawn vs Patrol Corvette`);
  render();
  await delay(2500);

  // === ROUND 1: Close range - sandcasters work! ===
  state.round = 1;
  state.phase = 'manoeuvre';
  addNarrative(narratePhaseChange('manoeuvre', 1));
  render();
  await delay(1500);

  // Both hold position initially
  addNarrative(`Both ships maneuver for advantage at Close range`);
  render();
  await delay(1500);

  // Attack phase
  state.phase = 'attack';
  state.currentActor = 'player';  // Player acts first
  addNarrative(narratePhaseChange('attack', 1));
  render();
  await delay(1500);

  // === ASTRAL DAWN ATTACKS (all weapons) ===

  // Marina fires Ion Barbette
  addNarrative(`${GREEN}Marina fires Ion Barbette ${marinaModStr}${RESET}`);
  render();
  await delay(600);

  const ionRoll = roll2d6();
  const ionTotal = ionRoll.total + marinaDM;
  const ionHit = ionTotal >= 8;
  const ionEffect = ionHit ? ionTotal - 8 : 0;
  const ionDrain = ionHit ? (rollNd6(3) + ionEffect) * 10 : 0;

  if (ionHit) {
    state.enemy.power = Math.max(0, state.enemy.power - ionDrain);
    flashDamage('enemy', ionDrain);
    addNarrative(`${GREEN}HIT!${RESET} (${ionTotal}) - ${MAGENTA}${ionDrain} power drained${RESET}`);
  } else {
    addNarrative(`${RED}MISS${RESET} (${ionTotal} vs 8)`);
  }
  render();
  await delay(1000);

  // Astral Dawn offensive turrets (T3 & T4: beam laser + missiles)
  const offensiveTurrets = state.player.turrets.filter(t => t.weapons[0] !== 'sandcaster');
  for (const turret of offensiveTurrets) {
    const aiDM = state.player.fireControl + turret.gunnerSkill;
    const weaponType = turret.weapons[0];
    addNarrative(`${GREEN}T${turret.id} AI fires ${weaponType.replace('_', ' ')} +${aiDM}${RESET}`);
    render();
    await delay(400);

    const result = await resolveTurretAttack(turret, state.player.fireControl, true, 0);
    if (result.hit) {
      state.enemy.hull = Math.max(0, state.enemy.hull - result.damage);
      flashDamage('enemy', result.damage);
      addNarrative(`${GREEN}HIT!${RESET} ${result.damage} hull damage`);
    } else {
      addNarrative(`${DIM}Miss (${result.total} vs 8)${RESET}`);
    }
    render();
    await delay(600);
  }

  // === CORSAIR ATTACKS (both turrets) ===
  state.currentActor = 'enemy';
  const evasiveMod = state.player.evasive ? -2 : 0;

  for (const turret of state.enemy.turrets) {
    const turretDM = state.enemy.fireControl + turret.gunnerSkill + 1; // +1 DEX
    addNarrative(`${RED}Corvette T${turret.id} fires pulse laser +${turretDM}${RESET}`);
    render();
    await delay(400);

    const pirateRoll = roll2d6();
    const pirateTotal = pirateRoll.total + turretDM + evasiveMod;
    const pirateHit = pirateTotal >= 8;

    if (pirateHit && canUseSandcaster()) {
      state.player.sandcasters--;
      const sandRoll = roll2d6();
      const sandTotal = sandRoll.total + 4;
      const sandSuccess = sandTotal >= 8;
      const sandBonus = sandSuccess ? roll1d6() + (sandTotal - 8) : 0;
      const rawDamage = rollNd6(2);
      const damage = Math.max(0, rawDamage - 1 - sandBonus);
      state.player.hull = Math.max(0, state.player.hull - damage);
      if (damage > 0) flashDamage('player', damage);
      if (sandSuccess) {
        addNarrative(`${GREEN}SANDCASTER!${RESET} blocks → ${damage} dmg`);
        state.enemy.tacticalAwareness = true;
      } else {
        addNarrative(`${YELLOW}Sandcaster miss!${RESET} ${damage} damage`);
        if (damage > 5) {
          const sysDamage = applySystemDamage(state.playerSystems, 1);
          addNarrative(`${RED}${sysDamage.system} damaged!${RESET}`);
        }
      }
    } else if (pirateHit) {
      const damage = Math.max(0, rollNd6(2) - 1);
      state.player.hull = Math.max(0, state.player.hull - damage);
      if (damage > 0) flashDamage('player', damage);
      addNarrative(`${RED}HIT${RESET} - ${damage} damage`);
      if (damage > 3) {
        const sysDamage = applySystemDamage(state.playerSystems, 1);
        addNarrative(`${RED}${sysDamage.system} hit!${RESET}`);
      }
    } else {
      addNarrative(`${GREEN}MISS${RESET} (${pirateTotal} vs 8)`);
    }
    render();
    await delay(800);
  }

  // === ROUND 2: Pirate realizes sandcasters are a problem! ===
  state.round = 2;
  state.phase = 'manoeuvre';
  state.player.thrustUsed = 0;
  state.enemy.thrustUsed = 0;
  addNarrative(narratePhaseChange('manoeuvre', 2));
  render();
  await delay(1500);

  // Pirate tactical decision
  addNarrative(`${RED}${BOLD}"Those damned sandcasters!"${RESET} Pirate opens range!`);
  render();
  await delay(1200);

  // Pirate tries to escape to Medium (opposed check)
  addNarrative(`${RED}Corvette burns thrust to escape to Medium...${RESET}`);
  render();
  await delay(800);

  const escape1 = await opposedPilotCheck('Corvette', 'Astral Dawn', state.enemy.pilotSkill, state.player.pilotSkill);
  if (escape1.aTotal > escape1.dTotal) {
    state.range = 'Short';
    state.enemy.thrustUsed += 1;
    addNarrative(`Pilot check: ${escape1.aTotal} vs ${escape1.dTotal} - ${RED}Corvette escapes!${RESET}`);
    addNarrative(`Range opens to ${YELLOW}Short${RESET}`);
  } else {
    addNarrative(`Pilot check: ${escape1.aTotal} vs ${escape1.dTotal} - ${GREEN}BLOCKED!${RESET}`);
    addNarrative(`${GREEN}Astral Dawn matches maneuver, stays at Close!${RESET}`);
  }
  render();
  await delay(2000);

  // Attack phase
  state.phase = 'attack';
  addNarrative(narratePhaseChange('attack', 2));
  render();
  await delay(1500);

  // Marina ion again
  addNarrative(`${GREEN}Marina targets power systems again!${RESET}`);
  render();
  await delay(800);

  const ion2Roll = roll2d6();
  const ion2Total = ion2Roll.total + marinaDM;
  const ion2Effect = ion2Total >= 8 ? ion2Total - 8 : 0;
  const ion2Drain = ion2Total >= 8 ? (rollNd6(3) + ion2Effect) * 10 : 0;

  if (ion2Total >= 8) {
    state.enemy.power = Math.max(0, state.enemy.power - ion2Drain);
    flashDamage('enemy', ion2Drain);
    addNarrative(`${GREEN}HIT!${RESET} - ${MAGENTA}${ion2Drain} more power drained!${RESET}`);
    if (state.enemy.power <= 25) {
      addNarrative(`${RED}${BOLD}POWER CRITICAL! Corvette weapons degraded!${RESET}`);
    }
  } else {
    addNarrative(`${RED}MISS${RESET}`);
  }
  render();
  await delay(2000);

  // Pirate fires (possibly with degraded power)
  const powerPenalty = state.enemy.power <= 25 ? -4 : state.enemy.power <= 50 ? -2 : 0;
  addNarrative(`${RED}Pirate fires${powerPenalty ? ` (${powerPenalty} power loss)` : ''}!${RESET}`);
  render();
  await delay(800);

  const pir2Roll = roll2d6();
  const pir2Total = pir2Roll.total + pirateDM + powerPenalty;
  const pir2Hit = pir2Total >= 8;

  if (pir2Hit && canUseSandcaster() && state.player.sandcasters > 0) {
    state.player.sandcasters--;
    const sandRoll = roll2d6();
    const sandSuccess = sandRoll.total + 4 >= 8;
    const sandBonus = sandSuccess ? roll1d6() + (sandRoll.total + 4 - 8) : 0;
    const damage = Math.max(0, rollNd6(2) - 1 - sandBonus);
    state.player.hull = Math.max(0, state.player.hull - damage);
    if (damage > 0) flashDamage('player', damage);
    addNarrative(sandSuccess ? `${GREEN}Sandcaster!${RESET} ${damage} damage` : `${damage} damage`);
  } else if (pir2Hit) {
    const damage = Math.max(0, rollNd6(2) - 1);
    state.player.hull = Math.max(0, state.player.hull - damage);
    if (damage > 0) flashDamage('player', damage);
    addNarrative(`${RED}HIT${RESET} - ${damage} damage`);
  } else {
    addNarrative(`${GREEN}MISS${RESET} (${pir2Total} vs 8)`);
  }
  render();
  await delay(2000);

  // === ROUND 3: Final tactical showdown ===
  state.round = 3;
  state.phase = 'manoeuvre';
  state.player.thrustUsed = 0;
  state.enemy.thrustUsed = 0;
  addNarrative(narratePhaseChange('manoeuvre', 3));
  render();
  await delay(1500);

  if (state.range === 'Short') {
    // Pirate tries to push to Medium
    addNarrative(`${RED}Corvette desperately pushes for Medium range!${RESET}`);
    render();
    await delay(800);

    const escape2 = await opposedPilotCheck('Corvette', 'Astral Dawn', state.enemy.pilotSkill, state.player.pilotSkill);
    if (escape2.aTotal > escape2.dTotal) {
      state.range = 'Medium';
      addNarrative(`${RED}Corvette reaches Medium!${RESET} Sandcasters now useless!`);
    } else {
      addNarrative(`${GREEN}Astral Dawn BLOCKS!${RESET} "You're not going anywhere!"`);
      state.range = 'Close';
      addNarrative(`Range forced back to ${YELLOW}Close${RESET}!`);
    }
  } else {
    // Astral Dawn tries to close
    addNarrative(`${GREEN}Astral Dawn closes to keep sandcasters in play!${RESET}`);
    render();
    await delay(800);
    state.range = 'Close';
    addNarrative(`Range: ${YELLOW}Close${RESET} - ${GREEN}Sandcasters ACTIVE${RESET}`);
  }
  render();
  await delay(2000);

  // Final attack phase
  state.phase = 'attack';
  addNarrative(narratePhaseChange('attack', 3));
  render();
  await delay(1500);

  // Marina switches to particle for the kill
  addNarrative(`${GREEN}Marina: "Switching to particle. Finish this."${RESET}`);
  render();
  await delay(800);

  const partRoll = roll2d6();
  const partTotal = partRoll.total + marinaDM;

  if (partTotal >= 8) {
    const partDamage = rollNd6(6);
    state.enemy.hull = Math.max(0, state.enemy.hull - partDamage);
    flashDamage('enemy', partDamage);
    // Critical hit - apply system damage
    const sysDamage = applySystemDamage(state.enemySystems, 2);
    addNarrative(`${GREEN}${BOLD}DEVASTATING HIT!${RESET} ${partDamage} hull, ${sysDamage.system} damaged!`);
  } else {
    addNarrative(`${RED}MISS${RESET} - Corvette evades!`);
  }
  render();
  await delay(2000);

  // Show systems overlay briefly
  addNarrative(`${MAGENTA}[PRESS S: Ship Systems]${RESET}`);
  state.showSystemsOverlay = true;
  render();
  await delay(3000);
  state.showSystemsOverlay = false;

  // Show detail overlay briefly
  addNarrative(`${MAGENTA}[PRESS D: Full Ship Details]${RESET}`);
  state.showDetailOverlay = true;
  render();
  await delay(3000);
  state.showDetailOverlay = false;

  // Conclusion
  addNarrative('');
  if (state.enemy.hull <= 20 || state.enemy.power <= 10) {
    addNarrative(`${YELLOW}${BOLD}"We surrender! We surrender!"${RESET}`);
    addNarrative(`${GREEN}${BOLD}═══ PRIZE TAKEN ═══${RESET}`);
  } else if (state.enemy.power <= 30) {
    addNarrative(`${YELLOW}Corvette adrift, power failing...${RESET}`);
    addNarrative(`${GREEN}Victory imminent.${RESET}`);
  } else {
    addNarrative(`${YELLOW}Combat continues...${RESET}`);
  }
  addNarrative(`${CYAN}Range: ${state.range} | Corvette: ${state.enemy.hull}%H ${state.enemy.power}%P${RESET}`);
  render();
}

process.on('SIGINT', () => { console.log('\n'); process.exit(0); });

// Keyboard input for ship selection (1/2) and detail overlay (D)
if (process.stdin.isTTY) {
  const readline = require('readline');
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
      console.log('\n');
      process.exit(0);
    }
    if (str === '1') {
      state.selectedShip = 1;
      render();
    } else if (str === '2') {
      state.selectedShip = 2;
      render();
    } else if (str === 'd' || str === 'D') {
      state.showDetailOverlay = !state.showDetailOverlay;
      state.showHelpOverlay = false;
      render();
    } else if (str === 's' || str === 'S') {
      state.showSystemsOverlay = !state.showSystemsOverlay;
      state.showHelpOverlay = false;
      render();
    } else if (str === 'h' || str === 'H') {
      state.showHelpOverlay = !state.showHelpOverlay;
      render();
    } else if (str === 'q' || str === 'Q') {
      console.log('\n');
      process.exit(0);
    }
  });
}

combat().catch(console.error);
