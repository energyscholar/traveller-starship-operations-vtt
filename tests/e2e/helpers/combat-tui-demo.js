#!/usr/bin/env node
/**
 * AR-207 ASCII Combat TUI Demo
 * In-place updating display - no scrolling
 * Run: node tests/e2e/helpers/combat-tui-demo.js
 */

const {
  narratePhaseChange,
  narrateAttack,
  narrateDamage,
  narrateEvasive,
  narrateReaction,
  narrateCombatStart
} = require('./combat-display');

// ANSI escape codes
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

// Progress bar with color
function colorBar(current, max, width = 20) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.max(0, Math.min(width, Math.round(pct * width)));
  const empty = width - filled;
  const color = pct > 0.5 ? GREEN : pct > 0.25 ? YELLOW : RED;
  return color + '█'.repeat(filled) + DIM + '░'.repeat(empty) + RESET;
}

// Combat state
let state = {
  round: 1,
  phase: 'manoeuvre',
  player: {
    name: 'Amishi',
    hull: 100, maxHull: 100,
    power: 100, maxPower: 100,
    evasive: false,
    sandcasters: 3,  // Sandcaster charges
    computer: 'Computer/25',
    fireControl: 4,  // Fire Control/4 = +4 DM
    weapons: [
      { name: 'Ion Barbette', gunner: 'AI-1', skill: 0 },      // AI uses FC only
      { name: 'Particle Barbette', gunner: 'Marina', skill: 6 } // Gunner-6
    ]
  },
  enemy: {
    name: 'Pirate Corsair',
    hull: 80, maxHull: 80,
    power: 100, maxPower: 100,
    range: 'Medium', rangeKm: 5000,
    computer: 'Computer/10',
    fireControl: 2,  // Fire Control/2 = +2 DM
    weapons: [
      { name: 'Triple Turret #1', type: 'Pulse Laser x3', gunner: 'Pirate-1', skill: 2, dexMod: 1 }, // Gunnery-2, DEX +1
      { name: 'Triple Turret #2', type: 'Pulse Laser x3', gunner: 'Pirate-2', skill: 2, dexMod: 1 }  // Gunnery-2, DEX +1
    ]
  },
  narrative: [],
  maxNarrative: 14
};

function addNarrative(text) {
  const lines = text.split('\n');
  for (const line of lines) {
    state.narrative.push(line);
  }
  while (state.narrative.length > state.maxNarrative) {
    state.narrative.shift();
  }
}

function render() {
  const w = 72;
  let out = CLEAR + HOME;

  // Header
  out += `${CYAN}${BOLD}╔${'═'.repeat(w-2)}╗${RESET}\n`;
  out += `${CYAN}${BOLD}║${RESET} ${WHITE}${BOLD}ROUND ${state.round}${RESET} • ${YELLOW}${state.phase.toUpperCase()} PHASE${RESET}`;
  out += ' '.repeat(w - 22 - state.phase.length - String(state.round).length) + `${CYAN}${BOLD}║${RESET}\n`;
  out += `${CYAN}${BOLD}╠${'═'.repeat(w-2)}╣${RESET}\n`;

  // Two columns: Enemy | Player
  const col1 = 35;
  const col2 = 33;

  out += `${CYAN}║${RESET} ${RED}${BOLD}ENEMY${RESET}` + ' '.repeat(col1 - 6) + `${CYAN}│${RESET} ${GREEN}${BOLD}YOUR SHIP${RESET}` + ' '.repeat(col2 - 10) + `${CYAN}║${RESET}\n`;

  // Enemy name + fire control | Player name
  const enemyLabel = `${state.enemy.name} [FC/+${state.enemy.fireControl}]`;
  out += `${CYAN}║${RESET} ${enemyLabel}` + ' '.repeat(col1 - enemyLabel.length) + `${CYAN}│${RESET} ${state.player.name}`;
  out += ' '.repeat(col2 - state.player.name.length) + `${CYAN}║${RESET}\n`;

  // Enemy hull | Player hull
  const eHullPct = Math.round((state.enemy.hull / state.enemy.maxHull) * 100);
  const pHullPct = Math.round((state.player.hull / state.player.maxHull) * 100);
  out += `${CYAN}║${RESET} Hull: ${colorBar(state.enemy.hull, state.enemy.maxHull, 15)} ${eHullPct.toString().padStart(3)}%`;
  out += `  ${CYAN}│${RESET} Hull: ${colorBar(state.player.hull, state.player.maxHull, 15)} ${pHullPct.toString().padStart(3)}%${CYAN}║${RESET}\n`;

  // Enemy power | Player power
  const ePwrPct = Math.round((state.enemy.power / state.enemy.maxPower) * 100);
  const pPwrPct = Math.round((state.player.power / state.player.maxPower) * 100);
  out += `${CYAN}║${RESET} Powr: ${colorBar(state.enemy.power, state.enemy.maxPower, 15)} ${ePwrPct.toString().padStart(3)}%`;
  out += `  ${CYAN}│${RESET} Powr: ${colorBar(state.player.power, state.player.maxPower, 15)} ${pPwrPct.toString().padStart(3)}%${CYAN}║${RESET}\n`;

  // Range | Evasive
  const rangeStr = `Range: ${state.enemy.range} (${state.enemy.rangeKm} km)`;
  const evasiveStr = `Evasive: ${state.player.evasive ? GREEN + 'YES -2' + RESET : 'NO'}`;
  out += `${CYAN}║${RESET} ${rangeStr}` + ' '.repeat(col1 - rangeStr.length) + `${CYAN}│${RESET} ${evasiveStr}` + ' '.repeat(col2 - 14) + `${CYAN}║${RESET}\n`;

  // Enemy weapons + gunners | Player weapons + gunners
  const eWep1 = state.enemy.weapons[0];
  const eWep2 = state.enemy.weapons[1];
  const pWep1 = state.player.weapons[0];
  const pWep2 = state.player.weapons[1];

  // Enemy FC + gunner totals: FC + Skill + DEX
  const eGunDM1 = state.enemy.fireControl + eWep1.skill + (eWep1.dexMod || 0);
  const eGunDM2 = state.enemy.fireControl + eWep2.skill + (eWep2.dexMod || 0);
  // Player: FC + Skill (AI uses FC only, Marina has Gunner-6)
  const pGunDM1 = state.player.fireControl + pWep1.skill;
  const pGunDM2 = state.player.fireControl + pWep2.skill;

  const eWepStr1 = `├ ${eWep1.type} [+${eGunDM1}]`;
  const eWepStr2 = `└ ${eWep2.type} [+${eGunDM2}]`;
  const pWepStr1 = `├ ${pWep1.name} [+${pGunDM1}]`;
  const pWepStr2 = `└ ${pWep2.name} [+${pGunDM2}]`;

  out += `${CYAN}║${RESET} ${DIM}${eWepStr1}${RESET}` + ' '.repeat(Math.max(1, col1 - eWepStr1.length)) + `${CYAN}│${RESET} ${DIM}${pWepStr1}${RESET}` + ' '.repeat(Math.max(1, col2 - pWepStr1.length)) + `${CYAN}║${RESET}\n`;
  out += `${CYAN}║${RESET} ${DIM}${eWepStr2}${RESET}` + ' '.repeat(Math.max(1, col1 - eWepStr2.length)) + `${CYAN}│${RESET} ${DIM}${pWepStr2}${RESET}` + ' '.repeat(Math.max(1, col2 - pWepStr2.length)) + `${CYAN}║${RESET}\n`;

  // Sandcasters
  const sandStr = `Sandcasters: ${MAGENTA}${state.player.sandcasters} charges${RESET}`;
  out += `${CYAN}║${RESET}` + ' '.repeat(col1) + ` ${CYAN}│${RESET} ${sandStr}` + ' '.repeat(col2 - 22) + `${CYAN}║${RESET}\n`;

  // Divider
  out += `${CYAN}╠${'═'.repeat(w-2)}╣${RESET}\n`;

  // Narrative section header
  out += `${CYAN}║${RESET} ${WHITE}${BOLD}COMBAT LOG${RESET}` + ' '.repeat(w - 13) + `${CYAN}║${RESET}\n`;
  out += `${CYAN}╠${'─'.repeat(w-2)}╣${RESET}\n`;

  // Narrative lines (padded to fill space)
  for (let i = 0; i < state.maxNarrative; i++) {
    const line = state.narrative[i] || '';
    const displayLine = line.slice(0, w - 4);
    out += `${CYAN}║${RESET} ${displayLine}` + ' '.repeat(w - 3 - displayLine.length) + `${CYAN}║${RESET}\n`;
  }

  // Footer
  out += `${CYAN}${BOLD}╚${'═'.repeat(w-2)}╝${RESET}\n`;

  process.stdout.write(out);
}

const delay = ms => new Promise(r => setTimeout(r, ms));

async function simulateCombat() {
  // Combat start
  addNarrative(narrateCombatStart(2));
  addNarrative(`${YELLOW}Amishi: FC/4, Marina Gunner-6 (+10), AI Gunners (+4)${RESET}`);
  addNarrative(`${RED}Corsair: FC/2, Gunners-2 DEX+1 (+5 total)${RESET}`);
  render();
  await delay(2500);

  // === ROUND 1 ===
  state.round = 1;
  state.phase = 'manoeuvre';
  addNarrative(narratePhaseChange('manoeuvre', 1));
  render();
  await delay(1500);

  state.player.evasive = true;
  addNarrative(narrateEvasive('Amishi', true));
  render();
  await delay(2000);

  // Attack phase
  state.phase = 'attack';
  addNarrative(narratePhaseChange('attack', 1));
  render();
  await delay(1500);

  // Player fires ion (AI gunner: 2d6 + FC4 = roll+4)
  addNarrative(`${GREEN}AI-1 fires Ion Barbette (2d6+4 FC)${RESET}`);
  render();
  await delay(800);
  const ion1 = { attacker: 'Amishi', target: 'Pirate Corsair', weapon: 'Ion Barbette', hit: true, total: 13, dice: [4,5], damageType: 'ion', powerDrain: 35 };
  addNarrative(narrateAttack(ion1));
  state.enemy.power = Math.max(0, state.enemy.power - 35);
  render();
  await delay(1500);

  addNarrative(narrateDamage('Pirate Corsair', { powerPercent: Math.round((state.enemy.power/state.enemy.maxPower)*100) }));
  render();
  await delay(2000);

  // Enemy fires BOTH turrets: FC+2, Skill+2, DEX+1 = +5, minus evasive -2 = +3 net
  addNarrative(`${RED}Pirate-1 fires Turret #1 (2d6+5 -2 evasive = +3)${RESET}`);
  render();
  await delay(1000);

  // Miss: 3+4+3 = 10, need 8... wait that hits. Let me make dice lower
  const miss1 = { attacker: 'Pirate Corsair', target: 'Amishi', weapon: 'Pulse Laser x3', hit: false, total: 7, dice: [2,2] };
  addNarrative(narrateAttack(miss1));
  render();
  await delay(1500);

  addNarrative(`${RED}Pirate-2 fires Turret #2 (2d6+5 -2 evasive = +3)${RESET}`);
  render();
  await delay(1000);

  // This one hits! Deploy sandcaster
  addNarrative(`${YELLOW}Incoming laser fire detected!${RESET}`);
  render();
  await delay(800);

  state.player.sandcasters--;
  addNarrative(narrateReaction('sandcaster', { success: true, armorBonus: 4 }));
  render();
  await delay(1000);

  const hit1 = { attacker: 'Pirate Corsair', target: 'Amishi', weapon: 'Pulse Laser x3', hit: true, total: 9, dice: [4,5], damageType: 'hull', actualDamage: 2 };
  addNarrative(narrateAttack(hit1));
  state.player.hull = Math.max(0, state.player.hull - 2);
  render();
  await delay(2000);

  // === ROUND 2 ===
  state.round = 2;
  state.phase = 'manoeuvre';
  addNarrative(narratePhaseChange('manoeuvre', 2));
  render();
  await delay(1500);

  // Stay evasive
  addNarrative('Amishi maintains evasive maneuvers');
  render();
  await delay(2000);

  // Attack phase
  state.phase = 'attack';
  addNarrative(narratePhaseChange('attack', 2));
  render();
  await delay(1500);

  // Player fires particle (Marina: 2d6 + FC4 + Gunner6 = +10!)
  addNarrative(`${GREEN}Marina fires Particle Barbette (2d6+10!)${RESET}`);
  render();
  await delay(800);
  const particle1 = { attacker: 'Amishi', target: 'Pirate Corsair', weapon: 'Particle Barbette', hit: true, total: 17, dice: [3,4], damageType: 'hull', actualDamage: 18, critical: true };
  addNarrative(narrateAttack(particle1));
  state.enemy.hull = Math.max(0, state.enemy.hull - 18);
  render();
  await delay(2000);

  addNarrative(`${RED}${BOLD}CRITICAL: M-Drive hit (Severity 1)${RESET}`);
  render();
  await delay(2000);

  // Enemy fires both turrets again
  addNarrative(`${RED}Pirate returns fire with both turrets!${RESET}`);
  render();
  await delay(1000);

  // First turret - sandcaster
  addNarrative(`${YELLOW}Sandcaster deployed!${RESET}`);
  state.player.sandcasters--;
  render();
  await delay(800);

  const reduced1 = { attacker: 'Pirate Corsair', target: 'Amishi', weapon: 'Pulse Laser x3', hit: true, total: 8, dice: [3,5], damageType: 'hull', actualDamage: 0 };
  addNarrative(narrateAttack(reduced1));
  render();
  await delay(1500);

  // Second turret hits
  const hit2 = { attacker: 'Pirate Corsair', target: 'Amishi', weapon: 'Pulse Laser x3', hit: true, total: 10, dice: [5,5], damageType: 'hull', actualDamage: 8 };
  addNarrative(narrateAttack(hit2));
  state.player.hull = Math.max(0, state.player.hull - 8);
  render();
  await delay(2000);

  // === ROUND 3 ===
  state.round = 3;
  state.phase = 'manoeuvre';
  addNarrative(narratePhaseChange('manoeuvre', 3));
  render();
  await delay(1500);

  state.player.evasive = false;
  addNarrative(narrateEvasive('Amishi', false));
  addNarrative(`${YELLOW}Going aggressive - all power to weapons!${RESET}`);
  render();
  await delay(2000);

  // Attack phase
  state.phase = 'attack';
  addNarrative(narratePhaseChange('attack', 3));
  render();
  await delay(1500);

  // Ion to drain remaining power (AI: 2d6+4)
  addNarrative(`${GREEN}AI-1 fires Ion Barbette (2d6+4)${RESET}`);
  render();
  await delay(800);
  const ion2 = { attacker: 'Amishi', target: 'Pirate Corsair', weapon: 'Ion Barbette', hit: true, total: 16, dice: [6,6], damageType: 'ion', powerDrain: 45 };
  addNarrative(narrateAttack(ion2));
  state.enemy.power = Math.max(0, state.enemy.power - 45);
  render();
  await delay(1500);

  addNarrative(narrateDamage('Pirate Corsair', { powerPercent: Math.round((state.enemy.power/state.enemy.maxPower)*100) }));
  render();
  await delay(2000);

  // Finishing particle blast (Marina: 2d6+10)
  addNarrative(`${GREEN}Marina fires Particle Barbette (2d6+10)${RESET}`);
  render();
  await delay(800);
  const particle2 = { attacker: 'Amishi', target: 'Pirate Corsair', weapon: 'Particle Barbette', hit: true, total: 18, dice: [4,4], damageType: 'hull', actualDamage: 22 };
  addNarrative(narrateAttack(particle2));
  state.enemy.hull = Math.max(0, state.enemy.hull - 22);
  render();
  await delay(2000);

  addNarrative(narrateDamage('Pirate Corsair', { hullPercent: Math.round((state.enemy.hull/state.enemy.maxHull)*100) }));
  render();
  await delay(1500);

  // Enemy attempts return fire but power critical
  addNarrative(`${DIM}Pirate Corsair attempts to return fire...${RESET}`);
  render();
  await delay(1000);
  addNarrative(`${DIM}Weapons offline - insufficient power!${RESET}`);
  render();
  await delay(2000);

  // Victory
  addNarrative('');
  addNarrative(`${GREEN}${BOLD}═══ COMBAT ENDED ═══${RESET}`);
  addNarrative(`${GREEN}Pirate Corsair surrenders! Hull critical, power depleted.${RESET}`);
  addNarrative(`${CYAN}Amishi: ${state.player.hull}% hull, ${state.player.sandcasters} sandcasters remaining${RESET}`);
  render();
}

// Handle ctrl+c gracefully
process.on('SIGINT', () => {
  console.log('\n');
  process.exit(0);
});

simulateCombat().catch(console.error);
