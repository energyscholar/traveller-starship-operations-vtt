/**
 * Campaign/Ship Formatter for TUI
 * Displays: campaign name, code, ship count; ship name, type, location
 */

const { ANSI } = require('../ansi-utils');
const { BOLD, DIM, RESET, GREEN, YELLOW, CYAN, WHITE } = ANSI;

/**
 * Format campaign list for display
 * @param {Array} campaigns - List of campaigns from getAllCampaigns()
 * @returns {string} Formatted campaign list
 */
function formatCampaignList(campaigns) {
  if (!campaigns || campaigns.length === 0) {
    return `  ${DIM}No campaigns found.${RESET}`;
  }

  const lines = [];

  campaigns.forEach((campaign, idx) => {
    const num = idx + 1;
    const code = campaign.id.substring(0, 8).toUpperCase();
    const name = campaign.name || 'Unnamed Campaign';
    const system = campaign.current_system || 'Unknown';

    lines.push(`  ${YELLOW}[${num}]${RESET} ${WHITE}${name}${RESET}`);
    lines.push(`      ${DIM}Code: ${code} | Location: ${system}${RESET}`);
  });

  return lines.join('\n');
}

/**
 * Format single campaign detail
 * @param {Object} campaign - Campaign object
 * @param {number} shipCount - Number of ships
 * @returns {string} Formatted campaign detail
 */
function formatCampaignDetail(campaign, shipCount = 0) {
  const lines = [];
  const code = campaign.id.substring(0, 8).toUpperCase();

  lines.push(`${CYAN}${BOLD}CAMPAIGN${RESET}`);
  lines.push('');
  lines.push(`  ${WHITE}Name:${RESET}      ${GREEN}${campaign.name || 'Unnamed'}${RESET}`);
  lines.push(`  ${WHITE}Code:${RESET}      ${code}`);
  lines.push(`  ${WHITE}GM:${RESET}        ${campaign.gm_name || 'Unknown'}`);
  lines.push(`  ${WHITE}Location:${RESET}  ${campaign.current_system || 'Unknown'}`);
  lines.push(`  ${WHITE}Date:${RESET}      ${campaign.current_date || 'Unknown'}`);
  lines.push(`  ${WHITE}Ships:${RESET}     ${shipCount}`);

  return lines.join('\n');
}

/**
 * Format ship list for display
 * @param {Array} ships - List of ships from getShipsByCampaign()
 * @returns {string} Formatted ship list
 */
function formatShipList(ships) {
  if (!ships || ships.length === 0) {
    return `  ${DIM}No ships in this campaign.${RESET}`;
  }

  const lines = [];

  ships.forEach((ship, idx) => {
    const num = idx + 1;
    const name = ship.name || 'Unnamed Ship';
    const type = ship.ship_data?.type || ship.ship_data?.shipType || 'Unknown';
    const isParty = ship.is_party_ship ? `${GREEN}[PARTY]${RESET}` : '';

    lines.push(`  ${YELLOW}[${num}]${RESET} ${WHITE}${name}${RESET} ${isParty}`);
    lines.push(`      ${DIM}${type}${RESET}`);
  });

  return lines.join('\n');
}

/**
 * Format single ship detail
 * @param {Object} ship - Ship object
 * @returns {string} Formatted ship detail
 */
function formatShipDetail(ship) {
  const lines = [];
  const data = ship.ship_data || {};

  lines.push(`${CYAN}${BOLD}SHIP${RESET}`);
  lines.push('');
  lines.push(`  ${WHITE}Name:${RESET}      ${GREEN}${ship.name || 'Unnamed'}${RESET}`);
  lines.push(`  ${WHITE}Type:${RESET}      ${data.type || data.shipType || 'Unknown'}`);
  lines.push(`  ${WHITE}Tonnage:${RESET}   ${data.tonnage || 'Unknown'}`);
  lines.push(`  ${WHITE}Jump:${RESET}      J-${data.jump || data.jumpDrive || 0}`);
  lines.push(`  ${WHITE}Thrust:${RESET}    M-${data.thrust || 0}`);

  if (ship.is_party_ship) {
    lines.push('');
    lines.push(`  ${GREEN}Party Ship${RESET}`);
  }

  return lines.join('\n');
}

module.exports = {
  formatCampaignList,
  formatCampaignDetail,
  formatShipList,
  formatShipDetail
};
