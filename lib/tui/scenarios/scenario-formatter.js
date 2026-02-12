/**
 * ANSI display formatting for interactive battle scenarios.
 *
 * @module lib/tui/scenarios/scenario-formatter
 */

const { ANSI, stripAnsi, padLine } = require('../ansi-utils');

const { RESET, BOLD, DIM, CYAN, YELLOW, RED, GREEN, WHITE, MAGENTA,
        BRIGHT_RED, BRIGHT_GREEN, BRIGHT_YELLOW, BRIGHT_CYAN, BG_RED } = ANSI;

const WIDTH = 64;
const BORDER_H = '═';
const BORDER_TL = '╔';
const BORDER_TR = '╗';
const BORDER_BL = '╚';
const BORDER_BR = '╝';
const BORDER_V = '║';

function hline(ch = BORDER_H, w = WIDTH) {
  return ch.repeat(w);
}

function boxLine(content, w = WIDTH) {
  const stripped = stripAnsi(content);
  const pad = Math.max(0, w - 2 - stripped.length);
  return `${BORDER_V}${content}${' '.repeat(pad)}${BORDER_V}`;
}

/**
 * Format scenario header with title, round, range, stance
 */
function formatScenarioHeader(title, round, range, stance) {
  const lines = [];
  lines.push(`${CYAN}${BORDER_TL}${hline()}${BORDER_TR}${RESET}`);
  lines.push(`${CYAN}${boxLine(` ${BOLD}${title}${RESET}${CYAN}`)}${RESET}`);
  lines.push(`${CYAN}${boxLine(` Round: ${WHITE}${round}${CYAN}  Range: ${YELLOW}${range}${CYAN}  Stance: ${GREEN}${stance}${CYAN}`)}${RESET}`);
  lines.push(`${CYAN}${BORDER_BL}${hline()}${BORDER_BR}${RESET}`);
  return lines.join('\n');
}

/**
 * Format narrative beat text in a box
 */
function formatNarrativeBeat(text) {
  const lines = [];
  lines.push(`${MAGENTA}${BORDER_TL}${hline()}${BORDER_TR}${RESET}`);
  const textLines = text.split('\n');
  for (const line of textLines) {
    lines.push(`${MAGENTA}${boxLine(` ${WHITE}${line}${MAGENTA}`)}${RESET}`);
  }
  lines.push(`${MAGENTA}${BORDER_BL}${hline()}${BORDER_BR}${RESET}`);
  return lines.join('\n');
}

/**
 * Format decision prompt with numbered/lettered options
 */
function formatDecisionPrompt(prompt, options) {
  const lines = [];
  lines.push('');
  lines.push(`${BRIGHT_YELLOW}${BOLD}  ${prompt}${RESET}`);
  lines.push('');
  for (const opt of options) {
    lines.push(`  ${YELLOW}[${opt.key}]${RESET} ${WHITE}${BOLD}${opt.label}${RESET}`);
    if (opt.description) {
      lines.push(`      ${DIM}${opt.description}${RESET}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Format per-round combat summary
 */
function formatRoundSummary(roundData) {
  const lines = [];
  const { attacks = [], round = 0 } = roundData;

  lines.push(`${DIM}── Round ${round} Results ──${RESET}`);

  for (const atk of attacks) {
    const hitColor = atk.hit ? GREEN : RED;
    const hitLabel = atk.hit ? 'HIT' : 'MISS';
    const dmgStr = atk.hit ? ` → ${atk.damage} dmg` : '';
    let ionStr = '';
    if (atk.ionDrain) {
      if (atk.targetPowerRemaining !== undefined && atk.targetPowerRemaining <= 0) {
        ionStr = ` ${BRIGHT_RED}⚡ ION DRAIN: ${atk.ionDrain} — POWER PLANT OFFLINE${RESET}`;
      } else if (atk.targetPowerRemaining !== undefined) {
        ionStr = ` ${YELLOW}⚡ Ion drain: ${atk.ionDrain} power (${atk.targetPowerRemaining}/${atk.targetMaxPower} remaining)${RESET}`;
      } else {
        ionStr = ` ⚡${atk.ionDrain} power`;
      }
    }
    lines.push(`  ${DIM}${atk.attacker}${RESET} ${atk.weapon} → ${atk.target}: ${hitColor}${hitLabel}${RESET}${dmgStr}${ionStr}`);
  }

  if (attacks.length === 0) {
    lines.push(`  ${DIM}No attacks this round${RESET}`);
  }

  return lines.join('\n');
}

/**
 * Format fleet status display with HP bars
 */
function formatFleetStatus(playerFleet, enemyFleet) {
  const lines = [];

  lines.push(`${GREEN}${BOLD} FRIENDLY${RESET}`);
  for (const ship of playerFleet) {
    lines.push(formatShipLine(ship, GREEN));
  }

  lines.push('');
  lines.push(`${RED}${BOLD} HOSTILE${RESET}`);
  for (const ship of enemyFleet) {
    lines.push(formatShipLine(ship, RED));
  }

  return lines.join('\n');
}

function formatShipLine(ship, color) {
  const status = getShipStatus(ship);
  const hpPct = ship.maxHull > 0 ? ship.hull / ship.maxHull : 0;
  const barLen = 20;
  const filled = Math.round(hpPct * barLen);
  const barColor = hpPct > 0.5 ? GREEN : hpPct > 0.25 ? YELLOW : RED;
  const bar = `${barColor}${'█'.repeat(filled)}${DIM}${'░'.repeat(barLen - filled)}${RESET}`;
  const nameStr = padLine(`  ${ship.name || ship.id}`, 20);
  const hpStr = `${ship.hull}/${ship.maxHull}`;

  const missileStr = ship.missiles > 0 ? ` M:${ship.missiles}` : '';
  const sandStr = ship.sandcasters > 0 ? ` S:${ship.sandcasters}` : '';

  if (status !== 'active') {
    return `  ${DIM}${ship.name || ship.id} [${status}]${RESET}`;
  }

  let powerStr = '';
  if (ship.maxPower) {
    if (ship.systems?.powerPlant === 'disabled') {
      powerStr = ` ${BRIGHT_RED}POWER: OFFLINE${RESET}`;
    } else if (ship.power !== undefined) {
      const pwrColor = ship.power / ship.maxPower > 0.5 ? YELLOW : RED;
      powerStr = ` ${pwrColor}Pwr:${ship.power}/${ship.maxPower}${RESET}`;
    }
  }

  return `${color}${nameStr}${RESET} ${bar} ${hpStr}${DIM}${missileStr}${sandStr}${RESET}${powerStr}`;
}

function getShipStatus(ship) {
  if (ship.destroyed) return 'DESTROYED';
  if (ship.surrendered) return 'SURRENDERED';
  if (ship.fled) return 'FLED';
  if (ship.fleeing) return 'FLEEING';
  if (ship.hull <= 0) return 'DESTROYED';
  return 'active';
}

/**
 * Format post-battle combat analysis
 */
function formatCombatAnalysis(fullLog) {
  const lines = [];
  lines.push('');
  lines.push(`${CYAN}${BOLD}══════ COMBAT ANALYSIS ══════${RESET}`);

  const totalAttacks = fullLog.length;
  const hits = fullLog.filter(a => a.hit).length;
  const hitRate = totalAttacks > 0 ? ((hits / totalAttacks) * 100).toFixed(1) : '0.0';

  lines.push(`  Attacks: ${totalAttacks}  Hits: ${hits}  Rate: ${hitRate}%`);

  // Damage per round
  const byRound = {};
  for (const atk of fullLog) {
    byRound[atk.round] = (byRound[atk.round] || 0) + (atk.damage || 0);
  }
  const rounds = Object.keys(byRound).sort((a, b) => a - b);
  if (rounds.length > 0) {
    lines.push(`  Damage by round: ${rounds.map(r => `R${r}:${byRound[r]}`).join(' ')}`);
  }

  lines.push(`${CYAN}${BOLD}═════════════════════════════${RESET}`);
  return lines.join('\n');
}

/**
 * Format one-line stance indicator bar
 */
function formatStanceBar(currentStance) {
  const stances = [
    { key: 'A', label: 'Aggressive', id: 'AGGRESSIVE' },
    { key: 'B', label: 'Balanced', id: 'BALANCED' },
    { key: 'D', label: 'Defensive', id: 'DEFENSIVE' },
    { key: 'S', label: 'Standoff', id: 'STANDOFF' }
  ];

  return stances.map(s => {
    const active = s.id === currentStance;
    const color = active ? `${BRIGHT_GREEN}${BOLD}` : DIM;
    return `${color}[${s.key}]${active ? s.label : s.label.charAt(0)}${RESET}`;
  }).join(' ');
}

module.exports = {
  formatScenarioHeader,
  formatNarrativeBeat,
  formatDecisionPrompt,
  formatRoundSummary,
  formatFleetStatus,
  formatCombatAnalysis,
  formatStanceBar
};
