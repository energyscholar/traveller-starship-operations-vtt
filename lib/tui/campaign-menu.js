/**
 * Campaign Menu for TUI
 * Select campaign and ship for session
 */

const { formatCampaignList, formatShipList } = require('./formatters/campaign-formatter');
const { getAllCampaigns, getCampaign } = require('../operations/accounts');
const { getShipsByCampaign, getPartyShips } = require('../operations/campaign');
const { setActiveSession } = require('./operations-menu');
const { ANSI, stripAnsi, sanitizeUserString } = require('./ansi-utils');
const { BOLD, DIM, RESET, GREEN, YELLOW, RED, CYAN, WHITE, CLEAR, HOME } = ANSI;

// Module state
let campaigns = [];
let selectedCampaign = null;
let ships = [];
let selectedShip = null;

/**
 * Show campaign selection screen
 * @param {TUISession} session - TUI session for I/O
 */
function showCampaignSelect(session) {
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

  session.write(out);
}

/**
 * Show ship selection screen
 * @param {TUISession} session - TUI session for I/O
 */
function showShipSelect(session) {
  if (!selectedCampaign) return;

  ships = getShipsByCampaign(selectedCampaign.id, true);
  const content = formatShipList(ships);

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}SELECT SHIP${RESET} - ${sanitizeUserString(selectedCampaign.name)}                       ${CYAN}${BOLD}║${RESET}\n` +
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

  session.write(out);
}

/**
 * Show confirmation screen
 * @param {TUISession} session - TUI session for I/O
 */
function showConfirmation(session) {
  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}SESSION CONFIGURED${RESET}                                       ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${WHITE}Campaign:${RESET}  ${GREEN}${sanitizeUserString(selectedCampaign.name)}${RESET}${' '.repeat(Math.max(0, 45 - sanitizeUserString(selectedCampaign.name).length))}${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${WHITE}Ship:${RESET}      ${GREEN}${sanitizeUserString(selectedShip.name)}${RESET}${' '.repeat(Math.max(0, 49 - sanitizeUserString(selectedShip.name).length))}${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${DIM}Operations menu will now use this ship.${RESET}                      ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press any key to continue${RESET}                                    ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);
}

/**
 * Wait for key press and return number or 'back'
 * @param {TUISession} session - TUI session for I/O
 * @param {number} maxNum - Maximum valid number
 * @returns {Promise<number|string>}
 */
async function waitForNumberOrBack(session, maxNum) {
  return new Promise((resolve) => {
    if (session.isTTY()) {
      session.setRawMode(true);
    }
    session.resume();
    session.setEncoding('utf8');

    const onData = (key) => {
      // Ctrl+C
      if (key === '\u0003') {
        cleanup();
        session.write('\n');
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
      session.removeInput(onData);
      if (session.isTTY()) {
        session.setRawMode(false);
      }
      session.pause();
    };

    session.onInput(onData);
  });
}

/**
 * Wait for any key press
 * @param {TUISession} session - TUI session for I/O
 */
async function waitForAnyKey(session) {
  return new Promise((resolve) => {
    if (session.isTTY()) {
      session.setRawMode(true);
    }
    session.resume();
    session.setEncoding('utf8');

    const onData = (key) => {
      cleanup();
      if (key === '\u0003') {
        session.write('\n');
        process.exit();
      }
      resolve();
    };

    const cleanup = () => {
      session.removeInput(onData);
      if (session.isTTY()) {
        session.setRawMode(false);
      }
      session.pause();
    };

    session.onInput(onData);
  });
}

/**
 * Run campaign menu flow
 * @param {TUISession} session - TUI session for I/O
 * @returns {Promise<void>} Resolves when user goes back to main menu
 */
async function runCampaignMenu(session) {
  // Campaign selection
  while (true) {
    showCampaignSelect(session);
    const selection = await waitForNumberOrBack(session, campaigns.length);

    if (selection === 'back') {
      return;
    }

    selectedCampaign = campaigns[selection - 1];

    // Ship selection
    while (true) {
      showShipSelect(session);
      const shipSelection = await waitForNumberOrBack(session, ships.length);

      if (shipSelection === 'back') {
        break; // Go back to campaign selection
      }

      selectedShip = ships[shipSelection - 1];

      // Set active session for operations
      setActiveSession(selectedCampaign.id, selectedShip.id);

      // Show confirmation
      showConfirmation(session);
      await waitForAnyKey(session);

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
