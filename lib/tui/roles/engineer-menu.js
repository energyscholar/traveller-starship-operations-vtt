/**
 * Engineer Station Menu for TUI
 * Display-only engineer/systems station view
 */

const { getActiveSession } = require('../operations-menu');
const { getCampaign } = require('../../operations/accounts');
const { getShip } = require('../../operations/campaign');
const { getDamagedSystems, getSystemsNeedingAttention } = require('../../operations/ship-systems');
const { getFuelStatus } = require('../../operations/refueling');
const { getCombatState, formatCombatBanner } = require('../combat-display');

const { ANSI, stripAnsi, padLine } = require('../ansi-utils');
const { BOLD, DIM, RESET, GREEN, YELLOW, RED, CYAN, WHITE, CLEAR, HOME } = ANSI;

/**
 * Get severity color
 */
function getSeverityColor(severity) {
  if (severity >= 3) return RED;
  if (severity >= 2) return YELLOW;
  return GREEN;
}

/**
 * Show engineer station screen
 * @param {TUISession} session - TUI session for I/O
 */
function showEngineerMenu(session) {
  const { campaignId, shipId } = getActiveSession();

  // Get combat state for banner
  const combatState = getCombatState(campaignId);
  const combatBanner = formatCombatBanner(combatState, 'engineer');

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
      const shipData = ship.ship_data || {};
      content.push(`  ${DIM}Class:${RESET} ${WHITE}${shipData.class || 'Unknown'}${RESET}`);
      content.push('');

      // Fuel Status
      content.push(`  ${WHITE}${BOLD}FUEL STATUS${RESET}`);
      try {
        const fuelStatus = getFuelStatus(shipId);
        const fuelPercent = fuelStatus.maxFuel > 0
          ? Math.round((fuelStatus.currentFuel / fuelStatus.maxFuel) * 100)
          : 0;
        const fuelColor = fuelPercent > 50 ? GREEN : fuelPercent > 25 ? YELLOW : RED;
        content.push(`  ${fuelColor}${fuelStatus.currentFuel}${RESET}/${fuelStatus.maxFuel} tons (${fuelPercent}%)`);
        content.push(`  ${DIM}Type:${RESET} ${fuelStatus.fuelType || 'Unknown'}`);
      } catch (e) {
        content.push(`  ${DIM}Fuel data unavailable${RESET}`);
      }
      content.push('');

      // Power Plant Status
      content.push(`  ${WHITE}${BOLD}POWER PLANT${RESET}`);
      const powerPlant = shipData.powerPlant || 0;
      content.push(`  ${DIM}Rating:${RESET} ${WHITE}${powerPlant}${RESET}`);
      content.push('');

      // Damaged Systems
      content.push(`  ${WHITE}${BOLD}SYSTEM STATUS${RESET}`);
      const damagedSystems = getDamagedSystems(ship);
      if (damagedSystems.length === 0) {
        content.push(`  ${GREEN}All systems operational${RESET}`);
      } else {
        content.push(`  ${RED}${damagedSystems.length} system(s) damaged:${RESET}`);
        damagedSystems.slice(0, 4).forEach(system => {
          content.push(`  ${RED}■${RESET} ${system}`);
        });
        if (damagedSystems.length > 4) {
          content.push(`  ${DIM}... and ${damagedSystems.length - 4} more${RESET}`);
        }
      }
      content.push('');

      // Systems Needing Attention (detailed)
      content.push(`  ${WHITE}${BOLD}REPAIR PRIORITIES${RESET}`);
      const attentionNeeded = getSystemsNeedingAttention(ship);
      if (attentionNeeded.length === 0) {
        content.push(`  ${GREEN}No repairs needed${RESET}`);
      } else {
        attentionNeeded.slice(0, 3).forEach(item => {
          const color = getSeverityColor(item.severity);
          content.push(`  ${color}■${RESET} ${item.system} (severity: ${item.severity})`);
        });
        if (attentionNeeded.length > 3) {
          content.push(`  ${DIM}... and ${attentionNeeded.length - 3} more${RESET}`);
        }
      }
    }
  }

  const contentLines = content.map(line =>
    `${CYAN}║${RESET}${padLine(line)}${CYAN}║${RESET}`
  ).join('\n');

  const out = CLEAR + HOME +
    (combatBanner ? combatBanner + '\n' : '') +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}ENGINEER STATION${RESET}                                         ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    contentLines + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${DIM}Phase 1A: Display only${RESET}                                      ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[B]${RESET} ${DIM}Back to role selection${RESET}                                 ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);
}

/**
 * Handle engineer menu input
 * @param {string} key - Key pressed
 * @param {Function} setScreen - Screen setter callback
 * @returns {boolean} Whether input was handled
 */
function handleEngineerInput(key, setScreen) {
  if (key.toLowerCase() === 'b') {
    setScreen('role');
    return true;
  }
  return false;
}

module.exports = {
  showEngineerMenu,
  handleEngineerInput
};
