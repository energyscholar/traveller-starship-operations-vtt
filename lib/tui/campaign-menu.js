/**
 * Campaign Menu for TUI
 * Select campaign and ship for session
 */

const { formatCampaignList, formatShipList } = require('./formatters/campaign-formatter');
const { getAllCampaigns, getCampaign } = require('../operations/accounts');
const { getShipsByCampaign, getPartyShips } = require('../operations/campaign');
const { setActiveSession } = require('./operations-menu');

// ANSI escape codes
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

// Module state
let campaigns = [];
let selectedCampaign = null;
let ships = [];
let selectedShip = null;

/**
 * Strip ANSI codes for length calculation
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Show campaign selection screen
 */
function showCampaignSelect() {
  campaigns = getAllCampaigns();
  const content = formatCampaignList(campaigns);

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}SELECT CAMPAIGN${RESET}                                          ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET}${line}${' '.repeat(Math.max(0, 64 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press number to select campaign${RESET}                              ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${DIM}Press [B] to go back${RESET}                                         ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Show ship selection screen
 */
function showShipSelect() {
  if (!selectedCampaign) return;

  ships = getShipsByCampaign(selectedCampaign.id, true);
  const content = formatShipList(ships);

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}SELECT SHIP${RESET} - ${selectedCampaign.name}                       ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET}${line}${' '.repeat(Math.max(0, 64 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press number to select ship${RESET}                                  ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${DIM}Press [B] to go back${RESET}                                         ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Show confirmation screen
 */
function showConfirmation() {
  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}SESSION CONFIGURED${RESET}                                       ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${WHITE}Campaign:${RESET}  ${GREEN}${selectedCampaign.name}${RESET}${' '.repeat(Math.max(0, 45 - selectedCampaign.name.length))}${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${WHITE}Ship:${RESET}      ${GREEN}${selectedShip.name}${RESET}${' '.repeat(Math.max(0, 49 - selectedShip.name.length))}${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${DIM}Operations menu will now use this ship.${RESET}                      ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press any key to continue${RESET}                                    ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Wait for key press and return number or 'back'
 * @param {number} maxNum - Maximum valid number
 * @returns {Promise<number|string>}
 */
async function waitForNumberOrBack(maxNum) {
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

      // Back
      if (key === 'b' || key === 'B') {
        cleanup();
        resolve('back');
        return;
      }

      // Number selection
      const num = parseInt(key, 10);
      if (num >= 1 && num <= maxNum) {
        cleanup();
        resolve(num);
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

/**
 * Wait for any key press
 */
async function waitForAnyKey() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
      cleanup();
      if (key === '\u0003') {
        process.stdout.write('\n');
        process.exit();
      }
      resolve();
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

/**
 * Run campaign menu flow
 * @returns {Promise<void>} Resolves when user goes back to main menu
 */
async function runCampaignMenu() {
  // Campaign selection
  while (true) {
    showCampaignSelect();
    const selection = await waitForNumberOrBack(campaigns.length);

    if (selection === 'back') {
      return;
    }

    selectedCampaign = campaigns[selection - 1];

    // Ship selection
    while (true) {
      showShipSelect();
      const shipSelection = await waitForNumberOrBack(ships.length);

      if (shipSelection === 'back') {
        break; // Go back to campaign selection
      }

      selectedShip = ships[shipSelection - 1];

      // Set active session for operations
      setActiveSession(selectedCampaign.id, selectedShip.id);

      // Show confirmation
      showConfirmation();
      await waitForAnyKey();

      return; // Back to main menu
    }
  }
}

/**
 * Get current selection
 * @returns {Object} { campaign, ship }
 */
function getSelection() {
  return { campaign: selectedCampaign, ship: selectedShip };
}

module.exports = {
  showCampaignSelect,
  showShipSelect,
  runCampaignMenu,
  getSelection
};
