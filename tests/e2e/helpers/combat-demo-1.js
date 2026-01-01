#!/usr/bin/env node
/**
 * Combat Demo 1: Kimbly vs Pirate Scout (Smoke Test)
 * Simpler TUI demo - 2 rounds of scout vs scout combat
 * Run: node tests/e2e/helpers/combat-demo-1.js
 */

const { DEMO_CONFIGS, createDefaultSystems } = require('./combat-demo-ships');
const {
  narratePhaseChange,
  narrateAttack,
  narrateDamage
} = require('./combat-display');
const {
  renderWarningOverlay,
  renderActiveOverlay,
  renderActionModal,
  handleModalInput,
  renderCalledShotMenu,
  handleCalledShotInput,
  ANSI
} = require('./turn-notification-tui');
const {
  shouldShowWarning,
  shouldShowTurnModal,
  getRoleMenuItems,
  getActiveRole,
  getCalledShotPenalty,
  getCalledShotMenuItems
} = require('../../../lib/combat/turn-notification');
const {
  cycleControlMode,
  needsPlayerInput,
  canSelectRole,
  getSpeedMs,
  cycleSpeed,
  checkEscapeCondition,
  CONTROL_MODES,
  ROLES
} = require('../../../lib/combat/control-mode');

// ============================================================================
// CALLED SHOTS IMPLEMENTATION (AR-216)
// ============================================================================
// Called shots allow targeting specific ship systems with attack penalty.
// See lib/combat/turn-notification.js for CALLED_SHOT_TARGETS and penalties.
// ============================================================================

/**
 * Enemy AI: Decide if enemy should use a called shot
 * @param {Object} attackerShip - Attacker ship
 * @param {Object} defenderShip - Defender (player) ship
 * @param {Object} defenderSystems - Defender's systems state
 * @returns {string|null} Target system ID or null for normal attack
 */
function getEnemyCalledShotTarget(attackerShip, defenderShip, defenderSystems) {
  // 25% chance to use called shot when defender below 50% hull
  if (defenderShip.hull < defenderShip.maxHull * 0.5 && Math.random() < 0.25) {
    // Priority: jDrive (prevent escape) > powerPlant (cripple) > mDrive (stop)
    if (defenderSystems.jDrive && !defenderSystems.jDrive.disabled && defenderSystems.jDrive.hp > 0) {
      return 'jDrive';
    }
    if (defenderSystems.powerPlant && !defenderSystems.powerPlant.disabled && defenderSystems.powerPlant.hp > 0) {
      return 'powerPlant';
    }
    if (defenderSystems.mDrive && !defenderSystems.mDrive.disabled && defenderSystems.mDrive.hp > 0) {
      return 'mDrive';
    }
  }
  return null;
}

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
const config = DEMO_CONFIGS.demo1;

// State object (will be reset by resetState)
let state = {};

// Callback for returning to menu
let returnToMenuCallback = null;

// Reset state for new demo run
function resetState(options = {}) {
  state = {
    round: 1,
    phase: 'initiative',
    range: options.startRange || config.startRange,
    player: { ...config.player, thrustUsed: 0, evasive: false },
    enemy: { ...config.enemy, thrustUsed: 0, evasive: false },
    narrative: [],
    maxNarrative: 14,
    playerSystems: createDefaultSystems(),
    enemySystems: createDefaultSystems(),
    currentActor: 'player',
    turretFlash: null,
    // AR-223: 3-way control mode (AUTO/CAPTAIN/ROLE)
    controlMode: options.controlMode || 'AUTO',
    activeRole: 'ALL',  // Role filter (only in ROLE mode)
    speed: 'NORMAL',    // INSTANT/FAST/NORMAL/SLOW
    fightMode: 'NORMAL', // NORMAL or FIGHT_TO_END
    // Initiative tracking (MT2E p.167)
    playerInitiative: 0,
    enemyInitiative: 0,
    initiativeWinner: null
  };
}

// Roll initiative for a ship (MT2E: 2d6 + Pilot + Thrust + Tactics effect)
function rollShipInitiative(ship) {
  // Captain tactics check (8+ to get bonus)
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

  return {
    roll: initRoll.total,
    pilot: pilotSkill,
    thrust: thrust,
    tactics: tacticsBonus,
    total: total
  };
}

// Initialize state with defaults
resetState();

// Flash a turret when FIRING (red/green based on ship)
function flashTurretFire(shipId, turretId) {
  state.turretFlash = { shipId, turretId, type: 'fire', expiry: Date.now() + 2000 };
}

// Flash a turret when READY for point defense (yellow)
function flashTurretReady(shipId, turretId) {
  state.turretFlash = { shipId, turretId, type: 'ready', expiry: Date.now() + 2000 };
}

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

// === PIRATE ESCAPE LOGIC ===
// Pirate attempts escape when hull drops below 75%
function shouldPirateEscape(ship) {
  const threshold = ship.maxHull * 0.75;
  return ship.hull < threshold;
}

// Pilot contest: pirate needs to win by 3+ to escape
// Returns { escaped: bool, pirateRoll, playerRoll, margin }
function attemptPirateEscape() {
  const pirateRoll = roll2d6().total + state.enemy.pilotSkill;
  const playerRoll = roll2d6().total + state.player.pilotSkill;
  const margin = pirateRoll - playerRoll;
  return {
    escaped: margin >= 3,
    pirateRoll,
    playerRoll,
    margin
  };
}

function colorBar(current, max, width = 15) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.round(pct * width);
  const color = pct > 0.5 ? GREEN : pct > 0.25 ? YELLOW : RED;
  return color + '█'.repeat(filled) + DIM + '░'.repeat(width - filled) + RESET;
}

// Range band display
const RANGE_BANDS = ['Adjacent', 'Close', 'Short', 'Medium', 'Long', 'Very Long', 'Distant'];
function rangeBar(current) {
  const abbrevs = ['A', 'CLO', 'S', 'M', 'L', 'V', 'D'];
  return abbrevs.map((a, i) => {
    const band = RANGE_BANDS[i];
    if (band === current) return `${YELLOW}${BOLD}[${a}]${RESET}`;
    if (RANGE_BANDS.indexOf(current) > i) return `${GREEN}${a}${RESET}`;
    return `${DIM}${a}${RESET}`;
  }).join('──');
}

function addNarrative(text) {
  state.narrative.push(text);
  while (state.narrative.length > state.maxNarrative) state.narrative.shift();
}

function canUseSandcaster() {
  return state.range === 'Adjacent' || state.range === 'Close';
}

// Range DM per Mongoose Traveller 2E (p.234-235)
function getRangeDM(range) {
  const DMs = {
    'Adjacent': 0, 'Close': 0, 'Short': 1,
    'Medium': 0, 'Long': -2, 'Very Long': -4, 'Distant': -6
  };
  return DMs[range] || 0;
}

// Weapon DM per Mongoose Traveller 2E (p.239-240)
function getWeaponDM(weapon) {
  const DMs = {
    'pulse_laser': 2,
    'beam_laser': 4,
    'missile_rack': 0,
    'sandcaster': 0
  };
  return DMs[weapon] || 0;
}

// Calculate attack DM for a turret (includes all modifiers)
function getTurretDM(ship, turret, range, defender) {
  const fc = ship.fireControl || 0;
  const gunner = turret.gunnerSkill || 0;
  const sensor = ship.sensorDM || 0;
  const rangeDM = getRangeDM(range);
  const weaponDM = getWeaponDM(turret.weapons[0]);
  // Evasive target: -Pilot skill to hit (MT2E p.165)
  const evasiveDM = defender?.evasive ? -(defender.pilotSkill || 0) : 0;
  const total = fc + gunner + sensor + rangeDM + weaponDM + evasiveDM;
  return { fc, gunner, sensor, rangeDM, weaponDM, evasiveDM, total };
}

// Critical hit location table (MT2E p.169)
const CRITICAL_LOCATIONS = {
  2: 'Sensors',
  3: 'Power Plant',
  4: 'Fuel',
  5: 'Weapon',
  6: 'Armour',
  7: 'Hull',
  8: 'M-Drive',
  9: 'Cargo',
  10: 'J-Drive',
  11: 'Crew',
  12: 'Computer'
};

// Roll for critical hit location
function rollCriticalLocation() {
  const roll = roll2d6().total;
  return { roll, location: CRITICAL_LOCATIONS[roll] };
}

// Apply critical hit effects (MT2E p.169-170)
function applyCritical(ship, systems, location, severity) {
  const effects = [];

  switch (location) {
    case 'Sensors':
      systems.sensors = Math.max(0, systems.sensors - severity * 20);
      effects.push(`Sensors -${severity * 20}%`);
      break;
    case 'Power Plant':
      systems.powerPlant = Math.max(0, systems.powerPlant - severity * 20);
      ship.power = Math.max(0, ship.power - severity * 10);
      effects.push(`Power Plant -${severity * 20}%, Power -${severity * 10}`);
      break;
    case 'Fuel':
      systems.fuel = Math.max(0, systems.fuel - severity * 25);
      effects.push(`Fuel tank -${severity * 25}%`);
      break;
    case 'Weapon':
      // Disable first turret at severity 2+
      if (severity >= 2 && ship.turrets[0]) {
        ship.turrets[0].disabled = true;
        effects.push('Turret DISABLED');
      } else {
        effects.push('Weapon damaged (Bane)');
      }
      break;
    case 'Armour':
      ship.armour = Math.max(0, ship.armour - severity);
      effects.push(`Armour -${severity}`);
      break;
    case 'Hull':
      const hullDamage = rollNd6(severity);
      ship.hull = Math.max(0, ship.hull - hullDamage);
      effects.push(`Hull -${hullDamage} (${severity}d6)`);
      break;
    case 'M-Drive':
      systems.mDrive = Math.max(0, systems.mDrive - severity * 20);
      ship.thrust = Math.max(0, ship.thrust - 1);
      effects.push(`M-Drive -${severity * 20}%, Thrust -1`);
      break;
    case 'Cargo':
      effects.push(`Cargo destroyed (${severity * 10}%)`);
      break;
    case 'J-Drive':
      systems.jDrive = Math.max(0, systems.jDrive - severity * 25);
      effects.push(`J-Drive -${severity * 25}%`);
      break;
    case 'Crew':
      effects.push(`Crew casualty! (${severity} crew)`);
      break;
    case 'Computer':
      systems.computer = Math.max(0, systems.computer - severity * 25);
      effects.push(`Computer -${severity * 25}%`);
      break;
  }

  return effects;
}

// Combat phases per Mongoose Traveller rules
// Each phase has: id, name, role (who acts), active (can be disabled)
const COMBAT_PHASES = [
  { id: 'initiative', name: 'Initiative', role: 'captain', desc: 'Roll initiative + Tactics' },
  { id: 'manoeuvre', name: 'Manoeuvre', role: 'pilot', desc: 'Thrust allocation, range change' },
  { id: 'attack', name: 'Attack', role: 'gunner', desc: 'Weapons fire' },
  { id: 'reaction', name: 'Reaction', role: 'gunner', desc: 'Point defense, sandcasters' },
  { id: 'actions', name: 'Actions', role: 'engineer', desc: 'Repairs, power, systems' },
  { id: 'damage', name: 'Damage', role: 'all', desc: 'Apply hits, criticals' }
];

// Track which phases are active (can be disabled if no crew for role)
function getPhaseState(phaseId) {
  // For Demo 1: all phases active (both ships have all roles filled)
  // In production: check if role has living crew member
  const phase = COMBAT_PHASES.find(p => p.id === phaseId);
  if (!phase) return { active: false, reason: 'Unknown phase' };

  // Example: Damage Control phase inactive if no DC crew
  // if (phaseId === 'damage_control' && !state.player.crew.damageControl) {
  //   return { active: false, reason: 'No DC crew' };
  // }

  return { active: true };
}

// Strip ANSI codes for length calculation
const visLen = (s) => s.replace(/\x1b\[[0-9;]*m/g, '').length;

function renderInitiativeSidebar(targetHeight) {
  const lines = [];
  const W = 18;  // Inner content width (fixed)

  // Check if turret flash expired
  if (state.turretFlash && Date.now() > state.turretFlash.expiry) {
    state.turretFlash = null;
  }

  // Row helper - pads to exact width W
  const row = (text) => {
    const vl = visLen(text);
    const pad = Math.max(0, W - vl);
    return `${MAGENTA}|${RESET}${text}${' '.repeat(pad)}${MAGENTA}|${RESET}`;
  };

  const top = `${MAGENTA}+${'-'.repeat(W)}+${RESET}`;
  const mid = `${MAGENTA}+${'-'.repeat(W)}+${RESET}`;
  const bot = `${MAGENTA}+${'-'.repeat(W)}+${RESET}`;

  lines.push(top);
  lines.push(row(` ${WHITE}${BOLD}ROUND ${state.round}${RESET}`));
  lines.push(mid);

  // === SHIPS (Initiative Order) ===
  lines.push(row(' ' + WHITE + BOLD + 'SHIPS' + RESET));

  // Build ship list with turret flash info
  const ships = [
    { id: 'player', ship: state.player, activeColor: GREEN },
    { id: 'enemy', ship: state.enemy, activeColor: RED }
  ];

  for (let i = 0; i < ships.length; i++) {
    const { id, ship, activeColor } = ships[i];
    const isActive = state.currentActor === id;
    const num = i + 1;
    const name = ship.name.slice(0, 10);

    // Check for turret flash on this ship
    const hasFlash = state.turretFlash?.shipId === id;
    let flash = '';
    if (hasFlash && state.turretFlash.type === 'fire') {
      flash = WHITE + BOLD + '*' + RESET;
    } else if (hasFlash && state.turretFlash.type === 'ready') {
      flash = CYAN + BOLD + '+' + RESET;
    }

    // Build visible text FIRST (no ANSI in middle), then wrap with colors
    const marker = isActive ? '>' : ' ';
    const text = ' ' + marker + num + '. ' + name;

    // Apply colors to complete text block
    let line;
    if (isActive) {
      line = activeColor + BOLD + text + RESET + flash;
    } else {
      line = DIM + text + RESET;
    }
    lines.push(row(line));
  }

  lines.push(mid);

  // === PHASE SEQUENCE ===
  lines.push(row(' ' + WHITE + BOLD + 'PHASES' + RESET));
  const phaseIdx = COMBAT_PHASES.findIndex(s => s.id === state.phase);

  // Role color mapping
  const roleColors = {
    captain: MAGENTA,
    pilot: CYAN,
    gunner: RED,
    engineer: YELLOW,
    sensors: CYAN,
    all: WHITE
  };

  for (let i = 0; i < COMBAT_PHASES.length; i++) {
    const phase = COMBAT_PHASES[i];
    const phaseState = getPhaseState(phase.id);
    const roleCol = roleColors[phase.role] || WHITE;
    const phaseName = phase.name.slice(0, 10);

    // Build visible text FIRST (no ANSI interleaved), then wrap with color
    let marker, colorStart;
    if (!phaseState.active) {
      marker = 'x ';
      colorStart = DIM;
    } else if (i < phaseIdx) {
      marker = '* ';
      colorStart = DIM;
    } else if (i === phaseIdx) {
      marker = '> ';
      colorStart = roleCol + BOLD;
    } else {
      marker = '  ';
      colorStart = DIM;
    }
    const text = ' ' + marker + phaseName;
    const line = colorStart + text + RESET;
    lines.push(row(line));
  }
  lines.push(mid);

  // === MODE INDICATOR (AR-223) ===
  const modeColors = { AUTO: GREEN, CAPTAIN: YELLOW + BOLD, ROLE: CYAN + BOLD };
  const modeText = (modeColors[state.controlMode] || GREEN) + state.controlMode + RESET;
  const speedText = DIM + state.speed + RESET;
  const fightText = state.fightMode === 'FIGHT_TO_END' ? RED + '⚔' + RESET : '';
  lines.push(row(` Mode: ${modeText} ${speedText} ${fightText}`));
  lines.push(mid);

  // === CURRENT ACTOR STATS ===
  const ship = state.currentActor === 'player' ? state.player : state.enemy;
  const actorCol = state.currentActor === 'player' ? GREEN : RED;
  lines.push(row(actorCol + ship.tonnage + 't Arm:' + ship.armour + RESET));
  lines.push(row(DIM + 'FC:+' + ship.fireControl + ' Sns:+' + (ship.sensorDM || 0) + RESET));

  // Pad to target height
  while (lines.length < targetHeight - 1) {
    lines.push(row(''));
  }
  lines.push(bot);

  return lines;
}

function render() {
  const termWidth = process.stdout.columns || 120;
  const sidebarW = 22;
  const w = Math.min(100, termWidth - sidebarW - 4);

  // Calculate total height (header + ships + log + footer)
  const totalHeight = 3 + 6 + 2 + state.maxNarrative + 2;  // ~25 lines

  // Get sidebar lines (matched to main panel height)
  const sidebar = renderInitiativeSidebar(totalHeight);
  let sidebarIdx = 0;

  function appendSidebar(line) {
    if (sidebarIdx < sidebar.length) {
      return line + '  ' + sidebar[sidebarIdx++];
    }
    return line;
  }

  let out = CLEAR + HOME;

  // Header
  out += appendSidebar(`${CYAN}${BOLD}╔${'═'.repeat(w-2)}╗${RESET}`) + '\n';
  const title = `DEMO 1: ${config.description}`;
  out += appendSidebar(`${CYAN}${BOLD}║${RESET} ${WHITE}${BOLD}${title}${RESET}${' '.repeat(Math.max(1, w - title.length - 4))}${CYAN}${BOLD}║${RESET}`) + '\n';
  // Round/Phase line - add extra padding to align with sidebar
  const roundPhase = `ROUND ${state.round} * ${state.phase.toUpperCase()}`;
  out += appendSidebar(`${CYAN}${BOLD}║${RESET} ${WHITE}${roundPhase}${RESET}${' '.repeat(Math.max(1, w - roundPhase.length - 4))}${CYAN}${BOLD}║${RESET}`) + '\n';
  out += appendSidebar(`${CYAN}╠${'═'.repeat(w-2)}╣${RESET}`) + '\n';

  // Range
  const sandNote = canUseSandcaster() ? `${GREEN}SAND OK${RESET}` : `${RED}SAND BLOCKED${RESET}`;
  out += appendSidebar(`${CYAN}║${RESET} RANGE: ${rangeBar(state.range)}  ${sandNote}${' '.repeat(Math.max(1, w - 58))}${CYAN}║${RESET}`) + '\n';
  out += appendSidebar(`${CYAN}╠${'═'.repeat(w-2)}╣${RESET}`) + '\n';

  // Ship status - two columns
  const col = Math.floor((w - 6) / 2);

  // Names with ship type and tonnage
  const eType = state.enemy.shipType || '';
  const pType = state.player.shipType || '';
  const eTons = state.enemy.tonnage ? `${state.enemy.tonnage}t` : '';
  const pTons = state.player.tonnage ? `${state.player.tonnage}t` : '';
  const eName = `${eType} ${eTons} - ${state.enemy.name}`.toUpperCase();
  const pName = `${pType} ${pTons} - ${state.player.name}`.toUpperCase();
  out += appendSidebar(`${CYAN}║${RESET} ${RED}${BOLD}${eName}${RESET}${' '.repeat(Math.max(1, col - eName.length))}${CYAN}│${RESET} ${GREEN}${BOLD}${pName}${RESET}${' '.repeat(Math.max(1, col - pName.length))}${CYAN}║${RESET}`) + '\n';

  // Hull bars
  const eHull = `${state.enemy.hull}/${state.enemy.maxHull}`;
  const pHull = `${state.player.hull}/${state.player.maxHull}`;
  out += appendSidebar(`${CYAN}║${RESET} Hull: ${colorBar(state.enemy.hull, state.enemy.maxHull)} ${eHull.padStart(5)}${' '.repeat(Math.max(1, col - 28))}${CYAN}│${RESET} Hull: ${colorBar(state.player.hull, state.player.maxHull)} ${pHull.padStart(5)}${' '.repeat(Math.max(1, col - 28))}${CYAN}║${RESET}`) + '\n';

  // Stats line
  const eStats = `T:${state.enemy.thrust} FC:+${state.enemy.fireControl} Arm:${state.enemy.armour}`;
  const pStats = `T:${state.player.thrust} FC:+${state.player.fireControl} Arm:${state.player.armour}`;
  out += appendSidebar(`${CYAN}║${RESET} ${DIM}${eStats}${RESET}${' '.repeat(Math.max(1, col - eStats.length))}${CYAN}│${RESET} ${DIM}${pStats}${RESET}${' '.repeat(Math.max(1, col - pStats.length))}${CYAN}║${RESET}`) + '\n';

  // Turrets
  const eTurret = state.enemy.turrets[0];
  const pTurret = state.player.turrets[0];
  const eDM = getTurretDM(state.enemy, eTurret, state.range, state.player);
  const pDM = getTurretDM(state.player, pTurret, state.range, state.enemy);
  out += appendSidebar(`${CYAN}║${RESET} ${RED}Turret +${eDM.total} (${eTurret.gunner})${RESET}${' '.repeat(Math.max(1, col - 20))}${CYAN}│${RESET} ${GREEN}Turret +${pDM.total} (${pTurret.gunner})${RESET}${' '.repeat(Math.max(1, col - 18))}${CYAN}║${RESET}`) + '\n';

  // Captain/Crew
  if (state.player.captain) {
    const capInfo = `Capt: ${state.player.captain.name} (Tactics-${state.player.captain.skill_tactics_naval})`;
    out += appendSidebar(`${CYAN}║${RESET}${' '.repeat(col + 1)}${CYAN}│${RESET} ${MAGENTA}${capInfo}${RESET}${' '.repeat(Math.max(1, col - capInfo.length))}${CYAN}║${RESET}`) + '\n';
  }

  out += appendSidebar(`${CYAN}╠${'═'.repeat(w-2)}╣${RESET}`) + '\n';

  // Combat log
  out += appendSidebar(`${CYAN}║${RESET} ${WHITE}${BOLD}COMBAT LOG${RESET}${' '.repeat(w - 14)}${CYAN}║${RESET}`) + '\n';
  out += appendSidebar(`${CYAN}╠${'─'.repeat(w-2)}╣${RESET}`) + '\n';

  for (const line of state.narrative) {
    const vl = visLen(line);
    const pad = Math.max(0, w - vl - 4);
    out += appendSidebar(`${CYAN}║${RESET} ${line}${' '.repeat(pad)}${CYAN}║${RESET}`) + '\n';
  }

  // Pad remaining lines
  const remaining = state.maxNarrative - state.narrative.length;
  for (let i = 0; i < remaining; i++) {
    out += appendSidebar(`${CYAN}║${RESET}${' '.repeat(w - 2)}${CYAN}║${RESET}`) + '\n';
  }

  out += appendSidebar(`${CYAN}${BOLD}╚${'═'.repeat(w-2)}╝${RESET}`) + '\n';

  process.stdout.write(out);
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// === TURN NOTIFICATION SEQUENCE ===
// Shows warning -> active -> modal, returns selected action
// DEMOTODO: Add Pilot prompts in manoeuvre phase, Captain prompts in actions phase
//           Currently only Gunner role gets prompted during attack phase
async function showPlayerTurn(phase, ship, render) {
  const roleInfo = getActiveRole(phase, ship);
  if (!roleInfo) return null;

  const { role, crewMember } = roleInfo;

  // AR-223: Check if this role needs player input based on control mode
  if (!needsPlayerInput(state.controlMode, role, 'action', state.activeRole)) {
    return null;  // Auto mode for this role
  }

  // YELLOW warning flash (speed-adjusted)
  process.stdout.write(renderWarningOverlay(crewMember.name, role));
  await delay(Math.max(getSpeedMs(state.speed), 250));

  // GREEN active flash (speed-adjusted)
  process.stdout.write(renderActiveOverlay(crewMember.name, role));
  await delay(Math.max(getSpeedMs(state.speed), 250));

  // Re-render the main display
  render();

  // Show modal and wait for input (pass ship for dynamic weapon names)
  const menuItems = getRoleMenuItems(role, state, ship);
  const modal = renderActionModal(crewMember.name, role, ship.name, menuItems);
  process.stdout.write('\n' + modal);

  // Wait for keypress
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onKey = async (key) => {
      // Ctrl+C = exit
      if (key === '\u0003') {
        process.stdout.write('\n');
        process.exit();
      }

      const result = handleModalInput(key, menuItems);
      if (result) {
        // Check if "Called Shot" was selected
        if (result.action?.id === 'called_shot') {
          process.stdin.removeListener('data', onKey);

          // Show called shot target menu
          const defender = state.enemy; // Assume attacking enemy
          const targets = getCalledShotMenuItems(defender.systems);
          const turret = ship.turrets?.[0];
          const csModal = renderCalledShotMenu(targets, turret?.weapons?.[0] || 'weapon');
          process.stdout.write('\n' + csModal);

          // Wait for target selection
          const targetResult = await waitForCalledShotTarget(targets);
          if (targetResult.cancel) {
            // User cancelled, go back to main menu
            render();
            process.stdout.write('\n' + modal);
            process.stdin.on('data', onKey);
            return;
          }

          // Return action with target system
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
          }
          process.stdin.pause();
          resolve({
            action: { ...result.action, targetSystem: targetResult.target.id },
            skip: false
          });
          return;
        }

        process.stdin.removeListener('data', onKey);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
        resolve(result);
      }
    };

    process.stdin.on('data', onKey);
  });
}

// Helper to wait for called shot target selection
function waitForCalledShotTarget(targets) {
  return new Promise((resolve) => {
    const onKey = (key) => {
      if (key === '\u0003') {
        process.stdout.write('\n');
        process.exit();
      }

      const result = handleCalledShotInput(key, targets);
      if (result) {
        process.stdin.removeListener('data', onKey);
        resolve(result);
      }
    };

    process.stdin.on('data', onKey);
  });
}

// Resolve a single attack
// targetSystem: optional called shot target (e.g., 'jDrive', 'powerPlant')
async function resolveAttack(attacker, defender, attackerShip, defenderShip, turret, targetSystem = null) {
  const mods = getTurretDM(attackerShip, turret, state.range, defenderShip);

  // Apply called shot penalty
  const calledShotPenalty = getCalledShotPenalty(targetSystem);
  const totalMod = mods.total + calledShotPenalty;

  const roll = roll2d6();
  const total = roll.total + totalMod;
  const hit = total >= 8;
  const effect = hit ? total - 8 : 0;

  // Flash the firing turret
  flashTurretFire(attacker, turret.id);

  // Build detailed attack breakdown
  const weaponType = turret.weapons[0].replace('_', ' ');
  const col = attacker === 'player' ? GREEN : RED;
  let breakdown = `2d6=${roll.total} +FC=${mods.fc} +Gun=${mods.gunner} +Sns=${mods.sensor} +Rng=${mods.rangeDM} +Wpn=${mods.weaponDM}`;
  if (mods.evasiveDM !== 0) breakdown += ` ${YELLOW}Evasive=${mods.evasiveDM}${DIM}`;
  if (calledShotPenalty !== 0) breakdown += ` ${YELLOW}Called=${calledShotPenalty}${DIM}`;

  // Narrative for called shot
  if (targetSystem) {
    const targetName = targetSystem.replace(/([A-Z])/g, ' $1').trim();
    addNarrative(`${col}${BOLD}${turret.gunner} targets ${targetName.toUpperCase()}! (${calledShotPenalty})${RESET}`);
  }
  addNarrative(`${col}${turret.gunner} fires ${weaponType}${RESET}`);
  addNarrative(`${DIM}${breakdown} = ${total} vs 8${RESET}`);
  render();
  await delay(800);

  if (hit) {
    // Calculate damage based on weapon type (dice + effect - armour)
    let damageRoll = 0;
    let damage = 0;
    const weapon = turret.weapons[0];

    if (weapon === 'pulse_laser') {
      damageRoll = roll2d6().total;
      damage = Math.max(0, damageRoll + effect - defenderShip.armour);
    } else if (weapon === 'missile_rack') {
      damageRoll = rollNd6(4);
      damage = Math.max(0, damageRoll + effect - defenderShip.armour);
    } else if (weapon === 'sandcaster') {
      // Sandcasters don't do damage
      addNarrative(`${YELLOW}Sandcaster deployed (defensive)${RESET}`);
      render();
      return { hit: false };
    }

    // Apply sandcaster defense at close/adjacent range (MT2E p.271)
    if (canUseSandcaster() && defenderShip.sandcasters > 0 && attacker === 'enemy') {
      // Flash player turret as READY (point defense)
      flashTurretReady('player', 1);
      render();
      await delay(400);

      defenderShip.sandcasters--;
      const sandTurret = defenderShip.turrets[0];
      const sandGunnerSkill = sandTurret?.gunnerSkill || 0;
      const sandRoll = roll2d6();
      const sandTotal = sandRoll.total + sandGunnerSkill;
      const sandSuccess = sandTotal >= 8;
      if (sandSuccess) {
        const sandEffect = sandTotal - 8;
        const sandBonus = roll1d6() + sandEffect;
        damage = Math.max(0, damage - sandBonus);
        addNarrative(`${GREEN}SANDCASTER (${sandRoll.total}+${sandGunnerSkill}=${sandTotal}) blocks ${sandBonus}!${RESET} → ${damage} damage`);
      } else {
        addNarrative(`${YELLOW}Sandcaster miss (${sandTotal} vs 8)${RESET} ${damage} damage`);
      }
    } else if (hit) {
      const dmgBreakdown = `${damageRoll}+${effect}-${defenderShip.armour}=${damage}`;
      addNarrative(`${attacker === 'player' ? GREEN : RED}HIT!${RESET} Effect ${effect} → ${dmgBreakdown} damage`);
    }

    // Apply damage to defender
    if (damage > 0) {
      if (attacker === 'player') {
        state.enemy.hull = Math.max(0, state.enemy.hull - damage);
      } else {
        state.player.hull = Math.max(0, state.player.hull - damage);
      }

      // Called shot: damage goes to targeted system
      if (targetSystem && damage > 0) {
        const severity = Math.ceil(damage / 10);
        const defSystems = attacker === 'player' ? state.enemySystems : state.playerSystems;
        const targetName = targetSystem.replace(/([A-Z])/g, ' $1').trim();
        const effects = applyCritical(defenderShip, defSystems, targetSystem, severity);

        addNarrative(`${YELLOW}${BOLD}★ CALLED SHOT HIT! ★${RESET}`);
        addNarrative(`${YELLOW}${targetName.toUpperCase()} takes ${damage} damage (Severity ${severity})${RESET}`);
        for (const eff of effects) {
          addNarrative(`${YELLOW}  → ${eff}${RESET}`);
        }

        // Check if system is disabled
        if (defSystems[targetSystem]?.hp <= 0 || defSystems[targetSystem]?.disabled) {
          addNarrative(`${RED}${BOLD}>>> ${targetName.toUpperCase()} DISABLED! <<<${RESET}`);
        }
        render();
        await delay(1500);
      }
      // Critical hit check (MT2E p.169): Effect ≥6 AND damage > 0 (only if not a called shot)
      else if (effect >= 6) {
        const severity = Math.ceil(damage / 10);
        const crit = rollCriticalLocation();
        const defSystems = attacker === 'player' ? state.enemySystems : state.playerSystems;
        const effects = applyCritical(defenderShip, defSystems, crit.location, severity);

        addNarrative(`${MAGENTA}${BOLD}★ CRITICAL HIT! ★${RESET}`);
        addNarrative(`${MAGENTA}Location: ${crit.location} (${crit.roll}) Severity ${severity}${RESET}`);
        for (const eff of effects) {
          addNarrative(`${MAGENTA}  → ${eff}${RESET}`);
        }
        render();
        await delay(1500);
      }
    }

    render();
    return { hit: true, damage, effect, targetSystem };
  } else {
    addNarrative(`${DIM}Miss (${total} vs 8)${RESET}`);
    render();
    return { hit: false, targetSystem };
  }
}

async function runDemo() {
  addNarrative(`${CYAN}${BOLD}═══ CONTACT! ═══${RESET}`);
  addNarrative(`${state.player.name} engages ${state.enemy.name} at ${YELLOW}${state.range}${RESET} range`);
  render();
  await delay(1000);

  // === INITIATIVE PHASE (MT2E p.167) ===
  state.phase = 'initiative';
  addNarrative(`${WHITE}${BOLD}─── INITIATIVE ───${RESET}`);

  // Roll initiative for both ships
  const playerInit = rollShipInitiative(state.player);
  const enemyInit = rollShipInitiative(state.enemy);

  state.playerInitiative = playerInit.total;
  state.enemyInitiative = enemyInit.total;

  // Show player initiative breakdown
  let playerBreakdown = `2d6=${playerInit.roll} +Pilot=${playerInit.pilot} +Thrust=${playerInit.thrust}`;
  if (playerInit.tactics > 0) playerBreakdown += ` +Tactics=${playerInit.tactics}`;
  addNarrative(`${GREEN}${state.player.name}: ${playerBreakdown} = ${playerInit.total}${RESET}`);

  // Show enemy initiative
  let enemyBreakdown = `2d6=${enemyInit.roll} +Pilot=${enemyInit.pilot} +Thrust=${enemyInit.thrust}`;
  if (enemyInit.tactics > 0) enemyBreakdown += ` +Tactics=${enemyInit.tactics}`;
  addNarrative(`${RED}${state.enemy.name}: ${enemyBreakdown} = ${enemyInit.total}${RESET}`);

  // Determine winner (ties go to player)
  if (playerInit.total >= enemyInit.total) {
    state.initiativeWinner = 'player';
    addNarrative(`${GREEN}${BOLD}${state.player.name} ACTS FIRST!${RESET}`);
  } else {
    state.initiativeWinner = 'enemy';
    addNarrative(`${RED}${BOLD}${state.enemy.name} ACTS FIRST!${RESET}`);
  }

  render();
  await delay(2000);

  // === ROUND 1 ===
  state.round = 1;
  // Reset thrust at round start (MT2E p.165)
  state.player.thrustUsed = 0;
  state.enemy.thrustUsed = 0;
  state.player.evasive = false;
  state.enemy.evasive = false;

  state.phase = 'manoeuvre';
  addNarrative(`${WHITE}${BOLD}─── ROUND 1: MANOEUVRE ───${RESET}`);
  render();
  await delay(1000);

  // Enemy declares evasive if losing initiative (costs 1 thrust)
  if (state.initiativeWinner === 'player' && state.enemy.thrust > state.enemy.thrustUsed) {
    state.enemy.evasive = true;
    state.enemy.thrustUsed += 1;
    addNarrative(`${RED}${state.enemy.name} goes EVASIVE (1 thrust)${RESET}`);
    render();
    await delay(600);
  }

  // Manoeuvre - player decides to close
  if (state.range === 'Medium') {
    addNarrative(`${GREEN}Pilot closes range...${RESET}`);
    render();
    await delay(600);

    const playerPilot = roll2d6().total + state.player.pilotSkill;
    const enemyPilot = roll2d6().total + state.enemy.pilotSkill;

    if (playerPilot >= enemyPilot) {
      state.range = 'Short';
      state.player.thrustUsed += 1;  // Closing costs thrust
      addNarrative(`${GREEN}Range → Short${RESET} (${playerPilot} vs ${enemyPilot})`);
    } else {
      addNarrative(`${RED}Blocked!${RESET} (${playerPilot} vs ${enemyPilot})`);
    }
    render();
    await delay(1200);
  }

  // Attack phase
  state.phase = 'attack';
  addNarrative(`${WHITE}${BOLD}─── ATTACK PHASE ───${RESET}`);
  render();
  await delay(800);

  // Attack order based on initiative winner
  const firstAttacker = state.initiativeWinner;
  const secondAttacker = state.initiativeWinner === 'player' ? 'enemy' : 'player';

  state.currentActor = firstAttacker;
  const firstShip = firstAttacker === 'player' ? state.player : state.enemy;
  const firstTarget = firstAttacker === 'player' ? state.enemy : state.player;
  const firstTurret = firstShip.turrets[0];

  // First attacker fires (based on initiative)
  if (firstAttacker === 'player') {
    const turnAction = await showPlayerTurn('attack', state.player, render);
    if (turnAction?.skip) {
      addNarrative(`${DIM}${firstTurret.gunner} holds fire${RESET}`);
      render();
    } else {
      await resolveAttack(firstAttacker, secondAttacker, firstShip, firstTarget, firstTurret);
    }
  } else {
    await resolveAttack(firstAttacker, secondAttacker, firstShip, firstTarget, firstTurret);
  }
  await delay(800);

  // Check for first target destroyed
  if (firstTarget.hull <= 0) {
    const col = firstAttacker === 'player' ? GREEN : RED;
    addNarrative(`${col}${BOLD}*** ${firstTarget.name} DESTROYED! ***${RESET}`);
    render();
    await delay(3000);
    return;
  }

  // Second attacker fires
  state.currentActor = secondAttacker;
  const secondShip = secondAttacker === 'player' ? state.player : state.enemy;
  const secondTarget = secondAttacker === 'player' ? state.enemy : state.player;
  const secondTurret = secondShip.turrets[0];

  if (secondAttacker === 'player') {
    const turnAction2 = await showPlayerTurn('attack', state.player, render);
    if (turnAction2?.skip) {
      addNarrative(`${DIM}${secondTurret.gunner} holds fire${RESET}`);
      render();
    } else {
      await resolveAttack(secondAttacker, firstAttacker, secondShip, secondTarget, secondTurret);
    }
  } else {
    await resolveAttack(secondAttacker, firstAttacker, secondShip, secondTarget, secondTurret);
  }
  await delay(800);

  // Check for second target destroyed
  if (secondTarget.hull <= 0) {
    const col = secondAttacker === 'player' ? GREEN : RED;
    addNarrative(`${col}${BOLD}*** ${secondTarget.name} DESTROYED! ***${RESET}`);
    render();
    await delay(3000);
    return;
  }

  // === ROUND 2 ===
  state.round = 2;
  // Reset thrust at round start
  state.player.thrustUsed = 0;
  state.enemy.thrustUsed = 0;
  state.player.evasive = false;
  state.enemy.evasive = false;

  state.phase = 'manoeuvre';
  addNarrative(`${WHITE}${BOLD}─── ROUND 2: MANOEUVRE ───${RESET}`);
  render();
  await delay(1500);

  // Check if pirate should escape (hull < 75%)
  if (shouldPirateEscape(state.enemy)) {
    addNarrative(`${YELLOW}${state.enemy.name} is damaged (${state.enemy.hull}/${state.enemy.maxHull}) - attempting escape!${RESET}`);
    render();
    await delay(800);

    const result = attemptPirateEscape();
    if (result.escaped) {
      addNarrative(`Pilot: ${result.pirateRoll} vs ${result.playerRoll} (margin +${result.margin}) - ${RED}${BOLD}ESCAPED!${RESET}`);
      addNarrative(`${RED}${state.enemy.name} jumps to safety!${RESET}`);
      render();
      await delay(3000);
      return;
    } else {
      addNarrative(`Pilot: ${result.pirateRoll} vs ${result.playerRoll} (margin ${result.margin}) - ${GREEN}Escape blocked!${RESET}`);
      render();
      await delay(1000);
    }
  } else {
    // Normal manoeuvre - pirate still aggressive
    addNarrative(`${RED}${state.enemy.name} presses the attack!${RESET}`);
    render();
    await delay(800);
  }

  // Attack phase
  state.phase = 'attack';
  addNarrative(narratePhaseChange('attack', 2));
  render();
  await delay(1000);

  // Final exchanges - Round 2
  state.currentActor = 'player';
  const r2pTurret = state.player.turrets[0];
  await resolveAttack('player', 'enemy', state.player, state.enemy, r2pTurret);
  await delay(800);

  if (state.enemy.hull <= 0) {
    addNarrative(`${GREEN}${BOLD}*** ${state.enemy.name} DESTROYED! ***${RESET}`);
    render();
    await delay(3000);
    return;
  }

  state.currentActor = 'enemy';
  const r2eTurret = state.enemy.turrets[0];
  const r2eTarget = getEnemyCalledShotTarget(state.enemy, state.player, state.playerSystems);
  await resolveAttack('enemy', 'player', state.enemy, state.player, r2eTurret, r2eTarget);
  await delay(800);

  if (state.player.hull <= 0) {
    addNarrative(`${RED}${BOLD}*** ${state.player.name} DESTROYED! ***${RESET}`);
    render();
    await delay(3000);
    return;
  }

  // === ROUND 3 ===
  state.round = 3;
  state.phase = 'manoeuvre';
  addNarrative(`${WHITE}${BOLD}═══ ROUND 3 ═══${RESET}`);
  render();
  await delay(1500);

  // Check if pirate should escape (hull < 75%)
  if (shouldPirateEscape(state.enemy)) {
    addNarrative(`${YELLOW}${state.enemy.name} is damaged (${state.enemy.hull}/${state.enemy.maxHull}) - attempting escape!${RESET}`);
    render();
    await delay(800);

    const result = attemptPirateEscape();
    if (result.escaped) {
      addNarrative(`Pilot: ${result.pirateRoll} vs ${result.playerRoll} (margin +${result.margin}) - ${RED}${BOLD}ESCAPED!${RESET}`);
      addNarrative(`${RED}${state.enemy.name} jumps to safety!${RESET}`);
      render();
      await delay(3000);
      return;
    } else {
      addNarrative(`Pilot: ${result.pirateRoll} vs ${result.playerRoll} (margin ${result.margin}) - ${GREEN}Escape blocked!${RESET}`);
      render();
      await delay(1000);
    }
  }

  // Player tries to close to sandcaster range
  addNarrative(`${GREEN}${state.player.name} closes for the kill!${RESET}`);
  render();
  await delay(800);

  const closePilot = roll2d6().total + state.player.pilotSkill;
  const evadePilot = roll2d6().total + state.enemy.pilotSkill;

  if (closePilot >= evadePilot) {
    state.range = 'Close';
    addNarrative(`Pilot: ${closePilot} vs ${evadePilot} - ${GREEN}Range → Close!${RESET}`);
  } else {
    addNarrative(`Pilot: ${closePilot} vs ${evadePilot} - ${RED}Evaded!${RESET}`);
  }
  render();
  await delay(1200);

  // Attack phase
  state.phase = 'attack';
  addNarrative(narratePhaseChange('attack', 3));
  render();
  await delay(800);

  // Round 3 attacks
  state.currentActor = 'player';
  const r3pTurret = state.player.turrets[0];
  await resolveAttack('player', 'enemy', state.player, state.enemy, r3pTurret);
  await delay(800);

  if (state.enemy.hull <= 0) {
    addNarrative(`${GREEN}${BOLD}*** ${state.enemy.name} DESTROYED! ***${RESET}`);
    render();
    await delay(3000);
    return;
  }

  state.currentActor = 'enemy';
  const r3eTurret = state.enemy.turrets[0];
  const r3eTarget = getEnemyCalledShotTarget(state.enemy, state.player, state.playerSystems);
  await resolveAttack('enemy', 'player', state.enemy, state.player, r3eTurret, r3eTarget);
  await delay(800);

  if (state.player.hull <= 0) {
    addNarrative(`${RED}${BOLD}*** ${state.player.name} DESTROYED! ***${RESET}`);
    render();
    await delay(3000);
    return;
  }

  // === ROUND 4 ===
  state.round = 4;
  state.phase = 'manoeuvre';
  addNarrative(`${WHITE}${BOLD}═══ ROUND 4 ═══${RESET}`);
  render();
  await delay(1500);

  // Check if pirate should escape (hull < 75%)
  if (shouldPirateEscape(state.enemy)) {
    addNarrative(`${YELLOW}${state.enemy.name} is damaged (${state.enemy.hull}/${state.enemy.maxHull}) - attempting escape!${RESET}`);
    render();
    await delay(800);

    const result = attemptPirateEscape();
    if (result.escaped) {
      addNarrative(`Pilot: ${result.pirateRoll} vs ${result.playerRoll} (margin +${result.margin}) - ${RED}${BOLD}ESCAPED!${RESET}`);
      addNarrative(`${RED}${state.enemy.name} jumps to safety!${RESET}`);
      render();
      await delay(3000);
      return;
    } else {
      addNarrative(`Pilot: ${result.pirateRoll} vs ${result.playerRoll} (margin ${result.margin}) - ${GREEN}Escape blocked!${RESET}`);
      render();
      await delay(1000);
    }
  } else {
    // Both ships maneuver
    addNarrative(`${YELLOW}Both ships jockey for position...${RESET}`);
    render();
    await delay(1000);
  }

  // Attack phase
  state.phase = 'attack';
  addNarrative(narratePhaseChange('attack', 4));
  render();
  await delay(800);

  // Round 4 attacks
  state.currentActor = 'player';
  const r4pTurret = state.player.turrets[0];
  await resolveAttack('player', 'enemy', state.player, state.enemy, r4pTurret);
  await delay(800);

  if (state.enemy.hull <= 0) {
    addNarrative(`${GREEN}${BOLD}*** ${state.enemy.name} DESTROYED! ***${RESET}`);
    render();
    await delay(3000);
    return;
  }

  state.currentActor = 'enemy';
  const r4eTurret = state.enemy.turrets[0];
  const r4eTarget = getEnemyCalledShotTarget(state.enemy, state.player, state.playerSystems);
  await resolveAttack('enemy', 'player', state.enemy, state.player, r4eTurret, r4eTarget);
  await delay(800);

  if (state.player.hull <= 0) {
    addNarrative(`${RED}${BOLD}*** ${state.player.name} DESTROYED! ***${RESET}`);
    render();
    await delay(3000);
    return;
  }

  // End of demo
  addNarrative(`${CYAN}═══ DEMO COMPLETE ═══${RESET}`);
  addNarrative(`${state.player.name}: ${state.player.hull}/${state.player.maxHull} hull`);
  addNarrative(`${state.enemy.name}: ${state.enemy.hull}/${state.enemy.maxHull} hull`);
  render();
  await delay(3000);
}

// === KEYBOARD HANDLING ===
let showingHelp = false;

function renderHelp() {
  const w = 50;
  let out = CLEAR + HOME;
  out += `${CYAN}${BOLD}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${WHITE}${BOLD}COMBAT DEMO HELP${RESET}${' '.repeat(w - 20)}${CYAN}|${RESET}\n`;
  out += `${CYAN}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${WHITE}CONTROLS${RESET}${' '.repeat(w - 12)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}h${RESET}  - Show this help${' '.repeat(w - 24)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}m${RESET}  - Toggle MANUAL/AUTO mode${' '.repeat(w - 32)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}b${RESET}  - Back to menu${' '.repeat(w - 22)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}r${RESET}  - Restart demo${' '.repeat(w - 22)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}q${RESET}  - Quit program${' '.repeat(w - 22)}${CYAN}|${RESET}\n`;
  out += `${CYAN}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${WHITE}PHASES (by role)${RESET}${' '.repeat(w - 20)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${MAGENTA}Initiative${RESET} - Captain (Tactics)${' '.repeat(w - 36)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${CYAN}Manoeuvre${RESET}  - Pilot (Thrust)${' '.repeat(w - 34)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${RED}Attack${RESET}     - Gunner (Weapons)${' '.repeat(w - 35)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${RED}Reaction${RESET}   - Gunner (Defense)${' '.repeat(w - 36)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${YELLOW}Actions${RESET}    - Engineer (Repairs)${' '.repeat(w - 37)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${WHITE}Damage${RESET}     - All (Apply hits)${' '.repeat(w - 35)}${CYAN}|${RESET}\n`;
  out += `${CYAN}+${'-'.repeat(w-2)}+${RESET}\n`;
  out += `${CYAN}|${RESET} ${WHITE}SIDEBAR INDICATORS${RESET}${' '.repeat(w - 22)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${GREEN}>${RESET}  - Active ship${' '.repeat(w - 20)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${WHITE}${BOLD}*${RESET}  - Turret FIRING${' '.repeat(w - 22)}${CYAN}|${RESET}\n`;
  out += `${CYAN}|${RESET}  ${CYAN}${BOLD}+${RESET}  - Turret READY (defense)${' '.repeat(w - 30)}${CYAN}|${RESET}\n`;
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
    // Ctrl+C - always quit
    if (key === '\u0003') {
      process.stdout.write(CLEAR + HOME);
      process.exit(0);
    }

    if (showingHelp) {
      // Any key dismisses help
      showingHelp = false;
      render();
      return;
    }

    // h - show help
    if (key === 'h' || key === 'H') {
      showingHelp = true;
      renderHelp();
      return;
    }

    // m - cycle control mode (AUTO → CAPTAIN → ROLE)
    if (key === 'm' || key === 'M') {
      state.controlMode = cycleControlMode(state.controlMode);
      addNarrative(`${YELLOW}Mode: ${state.controlMode}${RESET}`);
      if (state.controlMode === 'ROLE') {
        addNarrative(`${CYAN}Press 'r' to select specific role${RESET}`);
      }
      render();
      return;
    }

    // f - toggle fight mode
    if (key === 'f' || key === 'F') {
      state.fightMode = state.fightMode === 'NORMAL' ? 'FIGHT_TO_END' : 'NORMAL';
      addNarrative(`${YELLOW}Fight Mode: ${state.fightMode}${RESET}`);
      render();
      return;
    }

    // +/- adjust speed
    if (key === '+' || key === '=') {
      state.speed = cycleSpeed(state.speed, 'up');
      addNarrative(`${CYAN}Speed: ${state.speed}${RESET}`);
      render();
      return;
    }
    if (key === '-' || key === '_') {
      state.speed = cycleSpeed(state.speed, 'down');
      addNarrative(`${CYAN}Speed: ${state.speed}${RESET}`);
      render();
      return;
    }

    // q - quit entirely
    if (key === 'q' || key === 'Q') {
      process.stdout.write(CLEAR + HOME + `${GREEN}Demo ended.${RESET}\n`);
      process.exit(0);
    }

    // b - back to menu
    if (key === 'b' || key === 'B') {
      if (returnToMenuCallback) {
        cleanupKeyboard();
        returnToMenuCallback();
      } else {
        // Running standalone, just restart
        process.stdout.write(CLEAR + HOME + `${YELLOW}Restarting...${RESET}\n`);
        resetState({ controlMode: state.controlMode, speed: state.speed, fightMode: state.fightMode });
        runDemo().catch(console.error);
      }
      return;
    }

    // r - restart demo
    if (key === 'r' || key === 'R') {
      process.stdout.write(CLEAR + HOME + `${YELLOW}Restarting...${RESET}\n`);
      resetState({ controlMode: state.controlMode, speed: state.speed, fightMode: state.fightMode });
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
// Run demo with options, returns promise that resolves when returning to menu
async function runDemo1(options = {}) {
  return new Promise((resolve) => {
    returnToMenuCallback = resolve;
    resetState(options);
    setupKeyboardInput();
    runDemo().then(() => {
      // Demo completed naturally, return to menu after delay
      setTimeout(() => {
        cleanupKeyboard();
        resolve();
      }, 3000);
    }).catch(console.error);
  });
}

module.exports = { runDemo1 };

// Run directly if executed as main
if (require.main === module) {
  setupKeyboardInput();
  runDemo().catch(console.error);
}
