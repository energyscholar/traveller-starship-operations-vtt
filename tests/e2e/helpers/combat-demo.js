#!/usr/bin/env node
/**
 * Combat Demo Launcher
 * Run: node tests/e2e/helpers/combat-demo.js
 *
 * Presents menu to select demo scenario:
 *   Demo 1: Kimbly vs Pirate Scout (smoke test) - AUTO
 *   Demo 2: Astral Dawn vs Patrol Corvette (full featured)
 *   Demo 3: Demo 1 with MANUAL mode (crew prompts)
 *   Demo 4: Q-Ship Fleet vs Destroyer - Marina's called shots on Power Plant!
 *   Demo 5: Q-Ship Fleet vs Pirate Fleet (fleet vs fleet)
 */

const { DEMO_CONFIGS } = require('./combat-demo-ships');
const { runDemo1 } = require('./combat-demo-1');
const { runDemo3 } = require('./combat-demo-3');
const { runDemo4 } = require('./combat-demo-4');

// ANSI
const ESC = '\x1b';
const CLEAR = `${ESC}[2J`;
const HOME = `${ESC}[H`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const WHITE = `${ESC}[37m`;
const RED = `${ESC}[31m`;
const MAGENTA = `${ESC}[35m`;
const BLUE = `${ESC}[34m`;

// Global state for TUI options
const RANGE_OPTIONS = ['Adjacent', 'Close', 'Short', 'Medium', 'Long', 'Very Long', 'Distant'];
let selectedRangeIndex = 3; // Default: Medium

function getSelectedRange() {
  return RANGE_OPTIONS[selectedRangeIndex];
}

function cycleRange() {
  selectedRangeIndex = (selectedRangeIndex + 1) % RANGE_OPTIONS.length;
}

// ════════════════════════════════════════════════════════════════════
// FLEET DISPLAY FUNCTIONS
// ════════════════════════════════════════════════════════════════════

function formatWeaponName(weapon) {
  const names = {
    'pulse_laser': 'Pulse Laser',
    'beam_laser': 'Beam Laser',
    'missile_rack': 'Missile Rack',
    'sandcaster': 'Sandcaster',
    'particle': 'Particle Beam',
    'ion': 'Ion Cannon'
  };
  return names[weapon] || weapon;
}

function renderShipCard(ship, index, isEnemy = false, isSelected = false) {
  const color = isEnemy ? RED : GREEN;
  const selectColor = isSelected ? YELLOW : color;
  const w = 54;
  const lines = [];

  // Header - highlight if selected
  const selectMarker = isSelected ? `${YELLOW}▶${RESET} ` : '  ';
  lines.push(`${selectMarker}${selectColor}${BOLD}┌${'─'.repeat(w-4)}┐${RESET}`);
  const nameType = `${ship.name} (${ship.shipType || 'Unknown'})`;
  const pad1 = Math.max(1, w - nameType.length - 4);
  lines.push(`${color}${BOLD}│${RESET} ${WHITE}${BOLD}${nameType}${RESET}${' '.repeat(pad1)}${color}${BOLD}│${RESET}`);
  lines.push(`${color}├${'─'.repeat(w-2)}┤${RESET}`);

  // Basic Stats
  const tonnage = ship.tonnage || '?';
  const hull = `${ship.hull || ship.maxHull}/${ship.maxHull} HP`;
  const armor = `Armor ${ship.armour || 0}`;
  const stats1 = `${tonnage}t  │  ${hull}  │  ${armor}`;
  const pad2 = Math.max(1, w - stats1.length - 4);
  lines.push(`${color}│${RESET} ${CYAN}${stats1}${RESET}${' '.repeat(pad2)}${color}│${RESET}`);

  // Propulsion
  const thrust = `Thrust-${ship.thrust || 0}`;
  const jump = ship.jump ? `Jump-${ship.jump}` : 'No Jump';
  const power = ship.maxPower ? `Power: ${ship.power || ship.maxPower}/${ship.maxPower}` : '';
  const stats2 = `${thrust}  │  ${jump}${power ? '  │  ' + power : ''}`;
  const pad3 = Math.max(1, w - stats2.length - 4);
  lines.push(`${color}│${RESET} ${stats2}${' '.repeat(pad3)}${color}│${RESET}`);

  // Combat Modifiers
  const fc = ship.fireControl ? `FC+${ship.fireControl}` : 'FC+0';
  const sensors = ship.sensorDM ? `Sensors+${ship.sensorDM}` : '';
  const pilot = `Pilot+${ship.pilotSkill || 0}`;
  const tactics = ship.captain?.skill_tactics_naval ? `Tactics+${ship.captain.skill_tactics_naval}` : '';
  let modifiers = [fc, pilot];
  if (sensors) modifiers.push(sensors);
  if (tactics) modifiers.push(tactics);
  const stats3 = modifiers.join('  │  ');
  const pad4 = Math.max(1, w - stats3.length - 4);
  lines.push(`${color}│${RESET} ${YELLOW}${stats3}${RESET}${' '.repeat(pad4)}${color}│${RESET}`);

  lines.push(`${color}├${'─'.repeat(w-2)}┤${RESET}`);

  // Weapons - Barbettes
  if (ship.barbettes && ship.barbettes.length > 0) {
    lines.push(`${color}│${RESET} ${WHITE}${BOLD}BARBETTES${RESET}${' '.repeat(w - 13)}${color}│${RESET}`);
    for (const b of ship.barbettes) {
      const bLine = `  ${b.name}: ${b.damage} (${b.gunner} +${b.gunnerSkill})`;
      const padB = Math.max(1, w - bLine.length - 3);
      lines.push(`${color}│${RESET}${bLine}${' '.repeat(padB)}${color}│${RESET}`);
    }
  }

  // Weapons - Turrets
  if (ship.turrets && ship.turrets.length > 0) {
    lines.push(`${color}│${RESET} ${WHITE}${BOLD}TURRETS${RESET}${' '.repeat(w - 11)}${color}│${RESET}`);
    for (const t of ship.turrets) {
      const weapons = t.weapons.map(formatWeaponName).join(', ');
      const tLine = `  #${t.id} ${t.type}: ${weapons}`;
      const padT = Math.max(1, w - tLine.length - 3);
      lines.push(`${color}│${RESET}${tLine}${' '.repeat(padT)}${color}│${RESET}`);
      const gunnerLine = `     Gunner: ${t.gunner} (+${t.gunnerSkill})`;
      const padG = Math.max(1, w - gunnerLine.length - 3);
      lines.push(`${color}│${RESET}${DIM}${gunnerLine}${RESET}${' '.repeat(padG)}${color}│${RESET}`);
    }
  }

  // Crew
  if (ship.crew && ship.crew.length > 0) {
    lines.push(`${color}├${'─'.repeat(w-2)}┤${RESET}`);
    lines.push(`${color}│${RESET} ${WHITE}${BOLD}CREW${RESET}${' '.repeat(w - 8)}${color}│${RESET}`);
    for (const c of ship.crew) {
      const cLine = `  ${c.name} - ${c.role} (${c.skill})`;
      const padC = Math.max(1, w - cLine.length - 3);
      lines.push(`${color}│${RESET}${cLine}${' '.repeat(padC)}${color}│${RESET}`);
    }
  }

  // Captain (if not in crew list)
  if (ship.captain && !ship.crew?.find(c => c.role === 'Captain')) {
    const capLine = `  Captain: ${ship.captain.name || 'Unknown'}`;
    const padCap = Math.max(1, w - capLine.length - 3);
    lines.push(`${color}│${RESET}${capLine}${' '.repeat(padCap)}${color}│${RESET}`);
  }

  // Special Equipment
  const specials = [];
  if (ship.sandcasters) specials.push(`Sandcasters: ${ship.sandcasters}`);
  if (ship.missiles) specials.push(`Missiles: ${ship.missiles}`);
  if (ship.marines) specials.push(`Marines: ${ship.marines}`);
  if (ship.cargo) specials.push(`Cargo: ${ship.cargo}t`);
  if (ship.hangarBays) specials.push(`Hangars: ${ship.hangarBays}`);

  if (specials.length > 0) {
    lines.push(`${color}├${'─'.repeat(w-2)}┤${RESET}`);
    lines.push(`${color}│${RESET} ${WHITE}${BOLD}EQUIPMENT${RESET}${' '.repeat(w - 13)}${color}│${RESET}`);
    const specLine = `  ${specials.join('  │  ')}`;
    const padS = Math.max(1, w - specLine.length - 3);
    lines.push(`${color}│${RESET}${specLine}${' '.repeat(padS)}${color}│${RESET}`);
  }

  // Footer
  lines.push(`${color}${BOLD}└${'─'.repeat(w-2)}┘${RESET}`);

  return lines;
}

function renderFleetPage(demoKey, pageNum = 0, selectedIdx = 0) {
  const config = DEMO_CONFIGS[demoKey];
  if (!config) return;

  const allShips = [];

  // Collect player ships
  if (config.player) {
    allShips.push({ ship: config.player, isEnemy: false });
  }
  if (config.playerFleet) {
    for (const ship of config.playerFleet) {
      allShips.push({ ship, isEnemy: false });
    }
  }

  // Collect enemy ships
  if (config.enemy) {
    allShips.push({ ship: config.enemy, isEnemy: true });
  }
  if (config.enemyFleet) {
    for (const ship of config.enemyFleet) {
      allShips.push({ ship, isEnemy: true });
    }
  }

  const shipsPerPage = 2;
  const totalPages = Math.ceil(allShips.length / shipsPerPage);
  const startIdx = pageNum * shipsPerPage;
  const pageShips = allShips.slice(startIdx, startIdx + shipsPerPage);

  let out = CLEAR + HOME;

  // Header
  out += `${CYAN}${BOLD}╔════════════════════════════════════════════════════════════════════╗${RESET}\n`;
  const title = `FLEET ROSTER: ${config.description}`;
  const titlePad = Math.max(1, 68 - title.length);
  out += `${CYAN}${BOLD}║${RESET} ${WHITE}${BOLD}${title}${RESET}${' '.repeat(titlePad)}${CYAN}${BOLD}║${RESET}\n`;
  const pageInfo = `Page ${pageNum + 1}/${totalPages}  │  ${allShips.length} ships total`;
  const pagePad = Math.max(1, 68 - pageInfo.length);
  out += `${CYAN}${BOLD}║${RESET} ${DIM}${pageInfo}${RESET}${' '.repeat(pagePad)}${CYAN}${BOLD}║${RESET}\n`;
  out += `${CYAN}${BOLD}╠════════════════════════════════════════════════════════════════════╣${RESET}\n`;

  // Ship cards - highlight selected
  for (let i = 0; i < pageShips.length; i++) {
    const { ship, isEnemy } = pageShips[i];
    const isSelected = i === selectedIdx;
    const cardLines = renderShipCard(ship, startIdx + i, isEnemy, isSelected);
    for (const line of cardLines) {
      out += `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(1, 68 - line.replace(/\x1b\[[0-9;]*m/g, '').length - 2))}${CYAN}║${RESET}\n`;
    }
    if (i < pageShips.length - 1) {
      out += `${CYAN}║${RESET}${' '.repeat(68)}${CYAN}║${RESET}\n`;
    }
  }

  // Footer with Edit option
  out += `${CYAN}╠════════════════════════════════════════════════════════════════════╣${RESET}\n`;
  out += `${CYAN}║${RESET} ${YELLOW}[↑/↓]${RESET} Select  ${YELLOW}[←/→]${RESET} Page  ${YELLOW}[E]${RESET} Edit  ${YELLOW}[B]${RESET} Back  ${YELLOW}[Q]${RESET} Quit${' '.repeat(8)}${CYAN}║${RESET}\n`;
  out += `${CYAN}${BOLD}╚════════════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);

  return { totalPages, currentPage: pageNum, pageShips };
}

// ════════════════════════════════════════════════════════════════════
// QUICK EDIT FUNCTIONS
// ════════════════════════════════════════════════════════════════════

const EDIT_FIELDS = [
  { key: 'hull', label: 'Hull Points', path: 'hull', min: 1, max: 999 },
  { key: 'maxHull', label: 'Max Hull', path: 'maxHull', min: 1, max: 999 },
  { key: 'armour', label: 'Armor', path: 'armour', min: 0, max: 20 },
  { key: 'pilotSkill', label: 'Pilot Skill', path: 'pilotSkill', min: 0, max: 6 },
  { key: 'thrust', label: 'Thrust', path: 'thrust', min: 0, max: 6 },
  { key: 'fireControl', label: 'Fire Control', path: 'fireControl', min: 0, max: 6 },
  { key: 'sensorDM', label: 'Sensors DM', path: 'sensorDM', min: 0, max: 4 }
];

function renderQuickEdit(ship, selectedField, turretIdx = -1) {
  const w = 62;
  let out = CLEAR + HOME;

  // Header
  out += `${YELLOW}${BOLD}╔${'═'.repeat(w-2)}╗${RESET}\n`;
  const title = `QUICK EDIT: ${ship.name} (${ship.shipType || 'Unknown'})`;
  const pad = Math.max(1, w - title.length - 4);
  out += `${YELLOW}${BOLD}║${RESET} ${WHITE}${BOLD}${title}${RESET}${' '.repeat(pad)}${YELLOW}${BOLD}║${RESET}\n`;
  out += `${YELLOW}╠${'═'.repeat(w-2)}╣${RESET}\n`;

  // Basic stats
  out += `${YELLOW}║${RESET} ${WHITE}${BOLD}COMBAT STATS${RESET}${' '.repeat(w - 16)}${YELLOW}║${RESET}\n`;

  EDIT_FIELDS.forEach((field, idx) => {
    const val = ship[field.path] ?? 0;
    const selected = selectedField === idx && turretIdx === -1;
    const prefix = selected ? `${GREEN}>${RESET}` : ' ';
    const valStr = selected ? `${GREEN}${BOLD}[ ${val.toString().padStart(3)} ]${RESET}` : `[ ${val.toString().padStart(3)} ]`;
    const line = `${prefix} ${field.label.padEnd(14)}: ${valStr}`;
    const linePad = Math.max(1, w - line.replace(/\x1b\[[0-9;]*m/g, '').length - 3);
    out += `${YELLOW}║${RESET}${line}${' '.repeat(linePad)}${YELLOW}║${RESET}\n`;
  });

  // Turret gunner skills
  if (ship.turrets && ship.turrets.length > 0) {
    out += `${YELLOW}╠${'═'.repeat(w-2)}╣${RESET}\n`;
    out += `${YELLOW}║${RESET} ${WHITE}${BOLD}TURRET GUNNERS${RESET}${' '.repeat(w - 18)}${YELLOW}║${RESET}\n`;

    ship.turrets.forEach((t, idx) => {
      const selected = turretIdx === idx;
      const prefix = selected ? `${GREEN}>${RESET}` : ' ';
      const skill = t.gunnerSkill ?? 0;
      const valStr = selected ? `${GREEN}${BOLD}[ ${skill} ]${RESET}` : `[ ${skill} ]`;
      const line = `${prefix} Turret #${t.id}: ${t.gunner?.substring(0, 12) || 'Unknown'} ${valStr}`;
      const linePad = Math.max(1, w - line.replace(/\x1b\[[0-9;]*m/g, '').length - 3);
      out += `${YELLOW}║${RESET}${line}${' '.repeat(linePad)}${YELLOW}║${RESET}\n`;
    });
  }

  // Footer
  out += `${YELLOW}╠${'═'.repeat(w-2)}╣${RESET}\n`;
  out += `${YELLOW}║${RESET} ${CYAN}[↑/↓]${RESET} Select  ${CYAN}[←/→]${RESET} Change  ${CYAN}[S]${RESET}ave  ${CYAN}[C]${RESET}ancel${' '.repeat(8)}${YELLOW}║${RESET}\n`;
  out += `${YELLOW}${BOLD}╚${'═'.repeat(w-2)}╝${RESET}\n`;

  process.stdout.write(out);
}

async function quickEditShip(ship, demoKey) {
  let selectedField = 0;
  let turretIdx = -1;  // -1 means editing basic fields, 0+ means turret
  const totalBasicFields = EDIT_FIELDS.length;
  const totalTurrets = ship.turrets?.length || 0;
  const totalFields = totalBasicFields + totalTurrets;

  renderQuickEdit(ship, selectedField, turretIdx);

  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      // Ctrl+C
      if (key === '\u0003') {
        cleanup();
        process.stdout.write('\n');
        process.exit();
      }

      // C or Escape to cancel
      if (key === 'c' || key === 'C' || key === '\x1b') {
        cleanup();
        resolve(false);
        return;
      }

      // S to save
      if (key === 's' || key === 'S') {
        cleanup();
        resolve(true);
        return;
      }

      // Up arrow
      if (key === '\x1b[A') {
        if (turretIdx >= 0) {
          turretIdx--;
          if (turretIdx < 0) {
            selectedField = totalBasicFields - 1;
          }
        } else if (selectedField > 0) {
          selectedField--;
        }
        renderQuickEdit(ship, selectedField, turretIdx);
        return;
      }

      // Down arrow
      if (key === '\x1b[B') {
        if (turretIdx === -1) {
          if (selectedField < totalBasicFields - 1) {
            selectedField++;
          } else if (totalTurrets > 0) {
            turretIdx = 0;
          }
        } else if (turretIdx < totalTurrets - 1) {
          turretIdx++;
        }
        renderQuickEdit(ship, selectedField, turretIdx);
        return;
      }

      // Left arrow - decrease value
      if (key === '\x1b[D') {
        if (turretIdx >= 0) {
          const turret = ship.turrets[turretIdx];
          turret.gunnerSkill = Math.max(0, (turret.gunnerSkill || 0) - 1);
        } else {
          const field = EDIT_FIELDS[selectedField];
          ship[field.path] = Math.max(field.min, (ship[field.path] || 0) - 1);
        }
        renderQuickEdit(ship, selectedField, turretIdx);
        return;
      }

      // Right arrow - increase value
      if (key === '\x1b[C') {
        if (turretIdx >= 0) {
          const turret = ship.turrets[turretIdx];
          turret.gunnerSkill = Math.min(6, (turret.gunnerSkill || 0) + 1);
        } else {
          const field = EDIT_FIELDS[selectedField];
          ship[field.path] = Math.min(field.max, (ship[field.path] || 0) + 1);
        }
        renderQuickEdit(ship, selectedField, turretIdx);
        return;
      }
    };

    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    process.stdin.on('data', onData);
  });
}

function showHelp() {
  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}HOTKEY REFERENCE${RESET}                                    ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}${BOLD}╠══════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${WHITE}${BOLD}MAIN MENU${RESET}                                           ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[1-5]${RESET}  Select and run combat demo                   ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[F]${RESET}    View Fleet Rosters (ship details)            ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[S]${RESET}    Cycle starting range (Close→Distant)         ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[?]${RESET}    Show this help screen                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[Q]${RESET}    Quit application                             ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${WHITE}${BOLD}FLEET BROWSER${RESET}                                       ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[↑/↓]${RESET}  Select ship on page                          ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[←/→]${RESET}  Page through ships                           ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[E]${RESET}    Edit selected ship stats                     ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[B]${RESET}    Back to previous menu                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${WHITE}${BOLD}DURING COMBAT${RESET}                                       ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[SPACE]${RESET} Advance to next action                       ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[F]${RESET}    Fight another round (at battle end)          ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[ENTER]${RESET} End combat / Continue                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${WHITE}${BOLD}SHIP EDITOR${RESET}                                         ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[↑/↓]${RESET}  Select stat to modify                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[←/→]${RESET}  Decrease/increase value                      ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[S]${RESET}    Save changes                                 ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[C]${RESET}    Cancel (discard changes)                     ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press any key to return to menu${RESET}                     ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

async function waitForHelpDismiss() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
      resolve();
    };

    process.stdin.on('data', onData);
  });
}

function showFleetMenu() {
  const d1 = DEMO_CONFIGS.demo1;
  const d2 = DEMO_CONFIGS.demo2;
  const d3 = DEMO_CONFIGS.demo3;
  const d4 = DEMO_CONFIGS.demo4;

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}FLEET ROSTER - SELECT SCENARIO${RESET}                     ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}${BOLD}╠══════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[1]${RESET} ${d1.description}                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}2 ships: ${d1.player.name} vs ${d1.enemy.name}${RESET}                 ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[2]${RESET} ${d2.description}                  ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}2 ships: ${d2.player.name} vs ${d2.enemy.name}${RESET}         ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[3]${RESET} ${d3.description}              ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}9 ships: Q-Ship + Marina's called shots!${RESET}         ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[4]${RESET} ${d4.description}                  ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}13 ships: Q-Ship Fleet vs Pirate Fleet${RESET}          ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press 1-4 to view fleet${RESET}                             ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${DIM}Press B to go back${RESET}                                  ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

async function viewFleet(demoKey) {
  let currentPage = 0;
  let selectedShipIdx = 0;  // Which ship on current page is selected
  let pageInfo = renderFleetPage(demoKey, currentPage, selectedShipIdx);

  const handleInput = async () => {
    return new Promise((resolve) => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = async (key) => {
        // Ctrl+C
        if (key === '\u0003') {
          cleanup();
          process.stdout.write('\n');
          process.exit();
        }

        // B to go back
        if (key === 'b' || key === 'B') {
          cleanup();
          resolve('back');
          return;
        }

        // Q to quit
        if (key === 'q' || key === 'Q') {
          cleanup();
          process.stdout.write(`${CLEAR}${HOME}Goodbye!\n`);
          process.exit(0);
        }

        // E to edit selected ship
        if (key === 'e' || key === 'E') {
          if (pageInfo.pageShips && pageInfo.pageShips[selectedShipIdx]) {
            cleanup();
            resolve({ action: 'edit', ship: pageInfo.pageShips[selectedShipIdx].ship });
          }
          return;
        }

        // Up/Down arrows to select ship on page
        if (key === '\x1b[A') {  // Up arrow
          if (selectedShipIdx > 0) {
            selectedShipIdx--;
            pageInfo = renderFleetPage(demoKey, currentPage, selectedShipIdx);
          }
          return;
        }

        if (key === '\x1b[B') {  // Down arrow
          if (pageInfo.pageShips && selectedShipIdx < pageInfo.pageShips.length - 1) {
            selectedShipIdx++;
            pageInfo = renderFleetPage(demoKey, currentPage, selectedShipIdx);
          }
          return;
        }

        // Left/Right arrows for pagination
        if (key === '\x1b[C' || key === 'n' || key === ' ') {  // Right arrow, n, space
          if (currentPage < pageInfo.totalPages - 1) {
            currentPage++;
            selectedShipIdx = 0;
            pageInfo = renderFleetPage(demoKey, currentPage, selectedShipIdx);
          }
          return;
        }

        if (key === '\x1b[D' || key === 'p') {  // Left arrow, p
          if (currentPage > 0) {
            currentPage--;
            selectedShipIdx = 0;
            pageInfo = renderFleetPage(demoKey, currentPage, selectedShipIdx);
          }
          return;
        }
      };

      const cleanup = () => {
        process.stdin.removeListener('data', onData);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
      };

      process.stdin.on('data', onData);
    });
  };

  // Main loop - handle edit and return
  while (true) {
    const result = await handleInput();

    if (result === 'back') {
      return;
    }

    if (result && result.action === 'edit') {
      const saved = await quickEditShip(result.ship, demoKey);
      // Re-render fleet page after edit
      pageInfo = renderFleetPage(demoKey, currentPage, selectedShipIdx);
    }
  }
}

async function fleetBrowser() {
  while (true) {
    showFleetMenu();

    const demoKey = await new Promise((resolve) => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (key) => {
        if (key === '\u0003') {
          cleanup();
          process.stdout.write('\n');
          process.exit();
        }

        if (key === 'b' || key === 'B') {
          cleanup();
          resolve(null);
          return;
        }

        if (key === 'q' || key === 'Q') {
          cleanup();
          process.stdout.write(`${CLEAR}${HOME}Goodbye!\n`);
          process.exit(0);
        }

        if (key === '1') { cleanup(); resolve('demo1'); return; }
        if (key === '2') { cleanup(); resolve('demo2'); return; }
        if (key === '3') { cleanup(); resolve('demo3'); return; }
        if (key === '4') { cleanup(); resolve('demo4'); return; }
      };

      const cleanup = () => {
        process.stdin.removeListener('data', onData);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.pause();
      };

      process.stdin.on('data', onData);
    });

    if (demoKey === null) {
      return;  // Back to main menu
    }

    await viewFleet(demoKey);
  }
}

function showMenu() {
  const d1 = DEMO_CONFIGS.demo1;
  const d2 = DEMO_CONFIGS.demo2;
  const d3 = DEMO_CONFIGS.demo3;
  const d4 = DEMO_CONFIGS.demo4;

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}TRAVELLER COMBAT TUI DEMO${RESET}                           ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}${BOLD}╠══════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[1]${RESET} ${d1.description} ${DIM}(AUTO)${RESET}              ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}${d1.player.name} vs ${d1.enemy.name} - Scout duel${RESET}           ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[2]${RESET} ${d2.description}                  ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}${d2.player.name} (${d2.player.tonnage}t) vs ${d2.enemy.name}${RESET}       ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[3]${RESET} ${d1.description} ${GREEN}(MANUAL)${RESET}           ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}Crew role turn prompts enabled${RESET}                   ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[4]${RESET} ${d3.description}              ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}8 ships vs 1000t Destroyer (400HP, Armor 8)${RESET}      ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[5]${RESET} ${d4.description}                  ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}8 ships vs 5 pirates - Ambush scenario${RESET}          ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                        ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press 1-5 to select demo${RESET}                            ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[F]${RESET} View Fleet Rosters (detailed ship stats)        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[S]${RESET} Starting Range: ${MAGENTA}${getSelectedRange().padEnd(10)}${RESET}                  ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[?]${RESET} Help - Show all hotkeys                         ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${DIM}Press Q or Ctrl+C to quit${RESET}                           ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

async function waitForSelection() {
  return new Promise((resolve) => {
    // Set up raw mode for single keypress
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      // Ctrl+C
      if (key === '\u0003') {
        cleanup();
        process.stdout.write('\n');
        process.exit();
      }

      // Q or q to quit
      if (key === 'q' || key === 'Q') {
        cleanup();
        process.stdout.write(`${CLEAR}${HOME}Goodbye!\n`);
        process.exit(0);
      }

      // 1-5 for demos
      if (key >= '1' && key <= '5') {
        cleanup();
        resolve(parseInt(key, 10));
        return;
      }

      // F for fleet browser
      if (key === 'f' || key === 'F') {
        cleanup();
        resolve('fleet');
        return;
      }

      // S to cycle starting range
      if (key === 's' || key === 'S') {
        cycleRange();
        showMenu();  // Refresh menu to show new range
        return;
      }

      // ? or H for help
      if (key === '?' || key === 'h' || key === 'H') {
        cleanup();
        resolve('help');
        return;
      }

      // Ignore other keys
    };

    const cleanup = () => {
      process.stdin.removeListener('data', onData);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();
    };

    process.stdin.on('data', onData);
  });
}

async function runDemo(demoNum) {
  const demoNames = {
    1: 'Demo 1 (Scout Duel AUTO)',
    2: 'Demo 2 (Q-Ship vs Corvette)',
    3: 'Demo 1 (Scout Duel MANUAL)',
    4: 'Demo 4 (Fleet + Marina Called Shots)',
    5: 'Demo 5 (Fleet vs Pirates)'
  };

  process.stdout.write(`${CLEAR}${HOME}${GREEN}Starting ${demoNames[demoNum]}...${RESET}\n`);
  await new Promise(r => setTimeout(r, 500));

  const startRange = getSelectedRange();

  switch (demoNum) {
    case 1:
      // Demo 1 AUTO mode
      await runDemo1({ manualMode: false, startRange });
      break;

    case 2:
      // Demo 2 (full Q-Ship vs Corvette) - legacy require
      // This one doesn't loop back, so we need to handle specially
      try {
        require('./combat-range-demo');
      } catch (e) {
        // Demo 2 exits process, handle gracefully
      }
      break;

    case 3:
      // Demo 1 MANUAL mode
      await runDemo1({ manualMode: true, startRange });
      break;

    case 4:
      // Demo 4: Fleet vs Destroyer
      await runDemo3({ manualMode: false, startRange });
      break;

    case 5:
      // Demo 5: Fleet vs Pirates
      await runDemo4({ manualMode: false, startRange });
      break;
  }
}

async function main() {
  // Menu loop - keeps returning until quit
  while (true) {
    showMenu();
    const selection = await waitForSelection();

    if (selection === 'fleet') {
      await fleetBrowser();
    } else if (selection === 'help') {
      showHelp();
      await waitForHelpDismiss();
    } else {
      await runDemo(selection);
    }
    // All demos should now loop back to menu
  }
}

main().catch(console.error);
