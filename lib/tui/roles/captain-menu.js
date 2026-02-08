/**
 * Captain Station Menu for TUI
 * Display-only captain/command station view
 */

const { getActiveSession } = require('../operations-menu');
const { getCaptainState, ALERT_STATUS, WEAPONS_AUTH } = require('../../operations/captain');
const { getCampaign } = require('../../operations/accounts');
const { getShip } = require('../../operations/campaign');
const { getCombatState, formatCombatBanner } = require('../combat-display');

const { ANSI, stripAnsi, padLine } = require('../ansi-utils');
const { BOLD, DIM, RESET, GREEN, YELLOW, RED, CYAN, WHITE, CLEAR, HOME } = ANSI;

/**
 * Get alert status color
 */
function getAlertColor(status) {
  switch (status) {
    case ALERT_STATUS.RED: return RED;
    case ALERT_STATUS.YELLOW: return YELLOW;
    case ALERT_STATUS.GREEN:
    default: return GREEN;
  }
}

/**
 * Get weapons auth display
 */
function getWeaponsAuthDisplay(auth) {
  switch (auth) {
    case WEAPONS_AUTH.FREE: return `${RED}FREE${RESET}`;
    case WEAPONS_AUTH.DEFENSIVE: return `${YELLOW}DEFENSIVE${RESET}`;
    case WEAPONS_AUTH.HOLD:
    default: return `${GREEN}HOLD${RESET}`;
  }
}


/**
 * Show captain station screen
 * @param {TUISession} session - TUI session for I/O
 */
function showCaptainMenu(session) {
  const { campaignId, shipId } = getActiveSession();

  // Get combat state for banner
  const combatState = getCombatState(campaignId);
  const combatBanner = formatCombatBanner(combatState, 'captain');

  let content = [];

  if (!campaignId) {
    content.push(`  ${YELLOW}No campaign selected.${RESET}`);
    content.push(`  ${DIM}Use [A] Campaign to select one.${RESET}`);
  } else {
    const campaign = getCampaign(campaignId);
    const ship = shipId ? getShip(shipId) : null;
    const captainState = getCaptainState(campaignId);

    // Header info
    if (ship) {
      content.push(`  ${DIM}Ship:${RESET} ${WHITE}${ship.name}${RESET}`);
    }
    if (campaign) {
      content.push(`  ${DIM}Campaign:${RESET} ${WHITE}${campaign.name}${RESET}`);
    }
    content.push('');

    // Alert Status
    const alertColor = getAlertColor(captainState.alertStatus);
    content.push(`  ${WHITE}${BOLD}ALERT STATUS${RESET}`);
    content.push(`  ${alertColor}${BOLD}■■■ ${captainState.alertStatus} ■■■${RESET}`);
    content.push('');

    // Weapons Authorization
    content.push(`  ${WHITE}${BOLD}WEAPONS AUTHORIZATION${RESET}`);
    content.push(`  ${getWeaponsAuthDisplay(captainState.weaponsAuth)}`);
    content.push('');

    // Leadership/Tactics DM
    content.push(`  ${WHITE}${BOLD}COMMAND BONUSES${RESET}`);
    const leaderDM = captainState.leadershipDM || 0;
    const tacticsDM = captainState.tacticsDM || 0;
    content.push(`  Leadership DM: ${leaderDM >= 0 ? '+' : ''}${leaderDM}`);
    content.push(`  Tactics DM:    ${tacticsDM >= 0 ? '+' : ''}${tacticsDM}`);
    content.push('');

    // Pending Orders
    content.push(`  ${WHITE}${BOLD}PENDING ORDERS${RESET}`);
    const pendingOrders = captainState.pendingOrders || [];
    if (pendingOrders.length === 0) {
      content.push(`  ${DIM}No pending orders${RESET}`);
    } else {
      pendingOrders.slice(0, 3).forEach(order => {
        const ack = order.acknowledged ? `${GREEN}✓${RESET}` : `${YELLOW}○${RESET}`;
        content.push(`  ${ack} ${order.type}`);
      });
      if (pendingOrders.length > 3) {
        content.push(`  ${DIM}... and ${pendingOrders.length - 3} more${RESET}`);
      }
    }
  }

  const contentLines = content.map(line =>
    `${CYAN}║${RESET}${padLine(line)}${CYAN}║${RESET}`
  ).join('\n');

  const out = CLEAR + HOME +
    (combatBanner ? combatBanner + '\n' : '') +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}CAPTAIN STATION${RESET}                                          ${CYAN}${BOLD}║${RESET}\n` +
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
 * Handle captain menu input
 * @param {string} key - Key pressed
 * @param {Function} setScreen - Screen setter callback
 * @returns {boolean} Whether input was handled
 */
function handleCaptainInput(key, setScreen) {
  if (key.toLowerCase() === 'b') {
    setScreen('role');
    return true;
  }
  return false;
}

module.exports = {
  showCaptainMenu,
  handleCaptainInput
};
