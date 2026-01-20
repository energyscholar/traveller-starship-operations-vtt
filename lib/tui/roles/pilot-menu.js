/**
 * Pilot Station Menu for TUI
 * Display-only pilot/navigation station view
 */

const { getActiveSession } = require('../operations-menu');
const { getPilotState } = require('../../operations/pilot');
const { getCampaign } = require('../../operations/accounts');
const { getShip } = require('../../operations/campaign');
const { getCombatState, formatCombatBanner } = require('../combat-display');

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
 * Show pilot station screen
 */
function showPilotMenu() {
  const { campaignId, shipId } = getActiveSession();

  // Get combat state for banner
  const combatState = getCombatState(campaignId);
  const combatBanner = formatCombatBanner(combatState, 'pilot');

  let content = [];

  if (!campaignId) {
    content.push(`  ${YELLOW}No campaign selected.${RESET}`);
    content.push(`  ${DIM}Use [A] Campaign to select one.${RESET}`);
  } else {
    const campaign = getCampaign(campaignId);
    const ship = shipId ? getShip(shipId) : null;
    const pilotState = getPilotState(campaignId);

    // Header info
    if (ship) {
      content.push(`  ${DIM}Ship:${RESET} ${WHITE}${ship.name}${RESET}`);
      // Ship maneuver drive rating
      const mDrive = ship.ship_data?.mDrive || 0;
      content.push(`  ${DIM}M-Drive:${RESET} ${WHITE}${mDrive}G${RESET}`);
    }
    if (campaign) {
      content.push(`  ${DIM}Location:${RESET} ${WHITE}${campaign.location || 'Unknown'}${RESET}`);
    }
    content.push('');

    // Evasive Status
    content.push(`  ${WHITE}${BOLD}EVASIVE MANEUVERS${RESET}`);
    if (pilotState.evasive) {
      content.push(`  ${YELLOW}${BOLD}■■■ EVASIVE ■■■${RESET}`);
      if (pilotState.evasiveStartTime) {
        const elapsed = Math.floor((Date.now() - new Date(pilotState.evasiveStartTime).getTime()) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        content.push(`  ${DIM}Active for: ${mins}m ${secs}s${RESET}`);
      }
    } else {
      content.push(`  ${GREEN}Standard flight${RESET}`);
    }
    content.push('');

    // Destination
    content.push(`  ${WHITE}${BOLD}NAVIGATION${RESET}`);
    if (pilotState.destination) {
      content.push(`  ${DIM}Destination:${RESET} ${WHITE}${pilotState.destination}${RESET}`);
      if (pilotState.eta) {
        content.push(`  ${DIM}ETA:${RESET} ${WHITE}${pilotState.eta}${RESET}`);
      }
    } else {
      content.push(`  ${DIM}No destination set${RESET}`);
    }
    content.push('');

    // Time Block Status
    content.push(`  ${WHITE}${BOLD}TIME CONTROL${RESET}`);
    if (pilotState.timeBlocked) {
      content.push(`  ${RED}■ Time advancement BLOCKED${RESET}`);
    } else {
      content.push(`  ${GREEN}○ Time advancement allowed${RESET}`);
    }
    content.push('');

    // Range History (last 3)
    content.push(`  ${WHITE}${BOLD}RECENT MANEUVERS${RESET}`);
    const history = pilotState.rangeHistory || [];
    if (history.length === 0) {
      content.push(`  ${DIM}No recent maneuvers${RESET}`);
    } else {
      history.slice(0, 3).forEach(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        content.push(`  ${DIM}${time}${RESET} ${entry.action || 'Maneuver'}`);
      });
    }
  }

  const contentLines = content.map(line =>
    `${CYAN}║${RESET}${padLine(line)}${CYAN}║${RESET}`
  ).join('\n');

  const out = CLEAR + HOME +
    (combatBanner ? combatBanner + '\n' : '') +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}PILOT STATION${RESET}                                            ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    contentLines + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${DIM}Phase 1A: Display only${RESET}                                      ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[B]${RESET} ${DIM}Back to role selection${RESET}                                 ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Handle pilot menu input
 * @param {string} key - Key pressed
 * @param {Function} setScreen - Screen setter callback
 * @returns {boolean} Whether input was handled
 */
function handlePilotInput(key, setScreen) {
  if (key.toLowerCase() === 'b') {
    setScreen('role');
    return true;
  }
  return false;
}

module.exports = {
  showPilotMenu,
  handlePilotInput
};
