/**
 * Damage Control Station Menu for TUI
 * Display-only damage control station view
 */

const { getActiveSession } = require('../operations-menu');
const { getCampaign } = require('../../operations/accounts');
const { getShip } = require('../../operations/campaign');
const { getDamagedSystems, getSystemsNeedingAttention } = require('../../operations/ship-systems');

// ANSI escape codes
const ESC = '\x1b';
const CLEAR = `${ESC}[2J`;
const HOME = `${ESC}[H`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const RED = `${ESC}[31m`;
const CYAN = `${ESC}[36m`;
const WHITE = `${ESC}[37m`;

// Selected system state
let selectedSystemIdx = -1;
let activeRepairs = [];

/**
 * Strip ANSI codes for length calculation
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Pad line to fit in box
 */
function padLine(line, width = 64) {
  const stripped = stripAnsi(line);
  return line + ' '.repeat(Math.max(0, width - stripped.length));
}

/**
 * Get severity color
 */
function getSeverityColor(severity) {
  if (severity >= 3) return RED;
  if (severity >= 2) return YELLOW;
  return GREEN;
}

/**
 * Format system name for display
 */
function formatSystemName(system) {
  return system
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Show damage control station screen
 */
function showDamageControlMenu() {
  const { campaignId, shipId } = getActiveSession();

  let content = [];

  if (!campaignId) {
    content.push(`  ${YELLOW}No campaign selected.${RESET}`);
    content.push(`  ${DIM}Use [A] Campaign to select one.${RESET}`);
  } else if (!shipId) {
    content.push(`  ${YELLOW}No ship selected.${RESET}`);
    content.push(`  ${DIM}Use [A] Campaign to select a ship.${RESET}`);
  } else {
    const campaign = getCampaign(campaignId);
    const ship = getShip(shipId);

    if (!ship) {
      content.push(`  ${RED}Ship not found.${RESET}`);
    } else {
      // Header info
      content.push(`  ${DIM}Ship:${RESET} ${WHITE}${ship.name}${RESET}`);
      content.push('');

      // Hull Integrity
      content.push(`  ${WHITE}${BOLD}HULL INTEGRITY${RESET}`);
      const currentState = ship.current_state || {};
      const hullCurrent = currentState.hullPoints ?? ship.ship_data?.hullPoints ?? 0;
      const hullMax = ship.ship_data?.hullPoints ?? hullCurrent;
      const hullPct = hullMax > 0 ? Math.round((hullCurrent / hullMax) * 100) : 100;
      const hullColor = hullPct > 50 ? GREEN : hullPct > 25 ? YELLOW : RED;
      content.push(`  ${hullColor}${hullCurrent}${RESET}/${hullMax} (${hullPct}%)`);

      // Hull bar
      const barWidth = 30;
      const filled = Math.round((hullPct / 100) * barWidth);
      const hullBar = `${hullColor}${'█'.repeat(filled)}${DIM}${'░'.repeat(barWidth - filled)}${RESET}`;
      content.push(`  ${hullBar}`);
      content.push('');

      // Damaged Systems
      content.push(`  ${WHITE}${BOLD}DAMAGE REPORT${RESET}`);
      const attentionNeeded = getSystemsNeedingAttention(ship);

      if (attentionNeeded.length === 0) {
        content.push(`  ${GREEN}All systems operational${RESET}`);
      } else {
        attentionNeeded.slice(0, 6).forEach((item, idx) => {
          const selected = idx === selectedSystemIdx ? `${RED}►${RESET}` : ' ';
          const color = getSeverityColor(item.severity);
          const name = formatSystemName(item.system);
          const statusIcon = item.level === 'RED' ? '■' : '▲';
          content.push(`  ${selected}[${idx + 1}] ${color}${statusIcon}${RESET} ${name} ${DIM}(sev ${item.severity})${RESET}`);
        });
        if (attentionNeeded.length > 6) {
          content.push(`  ${DIM}... and ${attentionNeeded.length - 6} more${RESET}`);
        }
      }
      content.push('');

      // Active Repairs
      content.push(`  ${WHITE}${BOLD}REPAIR OPERATIONS${RESET}`);
      if (activeRepairs.length === 0) {
        content.push(`  ${DIM}No repairs in progress${RESET}`);
      } else {
        activeRepairs.slice(0, 3).forEach(repair => {
          const progressBar = '█'.repeat(Math.floor(repair.progress / 10)) +
                              '░'.repeat(10 - Math.floor(repair.progress / 10));
          content.push(`  ${YELLOW}${repair.system}${RESET} [${progressBar}] ${repair.progress}%`);
        });
      }
      content.push('');

      // Selected System Details
      if (selectedSystemIdx >= 0 && selectedSystemIdx < attentionNeeded.length) {
        const item = attentionNeeded[selectedSystemIdx];
        content.push(`  ${WHITE}${BOLD}SELECTED: ${formatSystemName(item.system)}${RESET}`);
        content.push(`  ${DIM}Severity:${RESET} ${getSeverityColor(item.severity)}${item.severity}${RESET}`);
        content.push(`  ${DIM}Status:${RESET} ${item.level === 'RED' ? RED : YELLOW}${item.level}${RESET}`);
        if (item.crits && item.crits.length > 0) {
          content.push(`  ${DIM}Crits:${RESET} ${item.crits.length}`);
        }
      }
    }
  }

  const contentLines = content.map(line =>
    `${CYAN}║${RESET}${padLine(line)}${CYAN}║${RESET}`
  ).join('\n');

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}DAMAGE CONTROL STATION${RESET}                                   ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    contentLines + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[1-9]${RESET} ${DIM}Select system${RESET}  ${GREEN}[R]${RESET} ${DIM}Start repair${RESET}                   ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[B]${RESET} ${DIM}Back to role selection${RESET}                                 ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Handle damage control menu input
 * @param {string} key - Key pressed
 * @param {Function} setScreen - Screen setter callback
 * @returns {boolean} Whether input was handled
 */
function handleDamageControlInput(key, setScreen) {
  const k = key.toLowerCase();

  if (k === 'b') {
    selectedSystemIdx = -1;
    setScreen('role');
    return true;
  }

  // Number keys 1-9 for system selection
  if (key >= '1' && key <= '9') {
    selectedSystemIdx = parseInt(key) - 1;
    showDamageControlMenu(); // Refresh display
    return true;
  }

  // R - Start repair (display only for now)
  if (k === 'r') {
    // Phase 1A: Display only
    // In future: start repair on selected system
    return true;
  }

  return false;
}

module.exports = {
  showDamageControlMenu,
  handleDamageControlInput
};
