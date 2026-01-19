/**
 * Operations Menu for TUI
 * Submenu with [V] Travel, [J] Jump, [F] Fuel, [C] Contacts, [T] Time, [B] Back
 */

const { formatTravelState } = require('./formatters/travel-formatter');
const { formatJumpState } = require('./formatters/jump-formatter');
const { formatFuelState } = require('./formatters/fuel-formatter');
const { formatContactsList, formatContactDetail } = require('./formatters/contacts-formatter');
const { formatTimeState } = require('./formatters/time-formatter');
const { getPilotState } = require('../operations/pilot');
const { getJumpStatus } = require('../operations/jump');
const { getCampaign } = require('../operations/accounts');
const { getShip } = require('../operations/campaign');
const { getFuelStatus, getAvailableSources } = require('../operations/refueling');
const { getVisibleContacts, getContact, getScanLevelLabel } = require('../operations/contacts');
const timeRegistry = require('../operations/time-registry');

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

// Session state (set by campaign menu)
let activeCampaignId = null;
let activeShipId = null;

/**
 * Set active campaign/ship for operations
 * @param {string} campaignId
 * @param {string} shipId
 */
function setActiveSession(campaignId, shipId) {
  activeCampaignId = campaignId;
  activeShipId = shipId;
}

/**
 * Get active session state
 * @returns {Object} { campaignId, shipId }
 */
function getActiveSession() {
  return { campaignId: activeCampaignId, shipId: activeShipId };
}

/**
 * Show operations submenu
 */
function showOperationsMenu() {
  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}OPERATIONS${RESET}                                               ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[V]${RESET} ${WHITE}Travel${RESET}                                               ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}View location, course, evasive status${RESET}                  ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[J]${RESET} ${WHITE}Jump${RESET}                                                 ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}View jump status, fuel, destination${RESET}                    ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[F]${RESET} ${WHITE}Fuel${RESET}                                                 ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}View fuel status, refueling sources${RESET}                    ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[C]${RESET} ${WHITE}Contacts${RESET}                                             ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}View sensor contacts, scan levels${RESET}                      ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}[T]${RESET} ${WHITE}Time${RESET}                                                 ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}      ${DIM}View/advance game time${RESET}                                 ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[B]${RESET} ${DIM}Back to main menu${RESET}                                      ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Show travel screen
 */
function showTravelScreen() {
  let content;

  if (!activeCampaignId) {
    content = `  ${YELLOW}No campaign selected.${RESET}\n  ${DIM}Use [A] Campaign to select one.${RESET}`;
  } else {
    const campaign = getCampaign(activeCampaignId);
    const ship = activeShipId ? getShip(activeShipId) : null;
    const pilotState = getPilotState(activeCampaignId);
    content = formatTravelState(pilotState, campaign, ship);
  }

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}TRAVEL STATUS${RESET}                                            ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press any key to return${RESET}                                     ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Show jump screen
 */
function showJumpScreen() {
  let content;

  if (!activeCampaignId) {
    content = `  ${YELLOW}No campaign selected.${RESET}\n  ${DIM}Use [A] Campaign to select one.${RESET}`;
  } else {
    const campaign = getCampaign(activeCampaignId);
    const ship = activeShipId ? getShip(activeShipId) : null;
    const jumpStatus = getJumpStatus(activeShipId, campaign?.current_date);
    content = formatJumpState(jumpStatus, ship, campaign);
  }

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}JUMP STATUS${RESET}                                              ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press any key to return${RESET}                                     ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Show fuel screen
 */
function showFuelScreen() {
  let content;

  if (!activeCampaignId) {
    content = `  ${YELLOW}No campaign selected.${RESET}\n  ${DIM}Use [A] Campaign to select one.${RESET}`;
  } else if (!activeShipId) {
    content = `  ${YELLOW}No ship selected.${RESET}\n  ${DIM}Use [A] Campaign to select a ship.${RESET}`;
  } else {
    try {
      const fuelStatus = getFuelStatus(activeShipId);
      const availableSources = getAvailableSources(activeCampaignId, activeShipId);
      content = formatFuelState(fuelStatus, availableSources);
    } catch (e) {
      content = `  ${YELLOW}Unable to load fuel status.${RESET}\n  ${DIM}${e.message}${RESET}`;
    }
  }

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}FUEL STATUS${RESET}                                              ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press any key to return${RESET}                                     ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Show contacts screen
 */
function showContactsScreen() {
  let content;
  let contacts = [];

  if (!activeCampaignId) {
    content = `  ${YELLOW}No campaign selected.${RESET}\n  ${DIM}Use [A] Campaign to select one.${RESET}`;
  } else {
    try {
      contacts = getVisibleContacts(activeCampaignId, activeShipId);
      content = formatContactsList(contacts, getScanLevelLabel);
    } catch (e) {
      content = `  ${YELLOW}Unable to load contacts.${RESET}\n  ${DIM}${e.message}${RESET}`;
    }
  }

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}SENSOR CONTACTS${RESET}                                          ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press number for details, any other key to return${RESET}           ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);

  return contacts;
}

/**
 * Show contact detail screen
 */
function showContactDetailScreen(contact) {
  const content = formatContactDetail(contact, getScanLevelLabel);

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}CONTACT DETAILS${RESET}                                          ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press any key to return${RESET}                                     ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Show time screen
 */
function showTimeScreen() {
  let content;

  if (!activeCampaignId) {
    content = `  ${YELLOW}No campaign selected.${RESET}\n  ${DIM}Use [A] Campaign to select one.${RESET}`;
  } else {
    const campaign = getCampaign(activeCampaignId);
    const timeState = timeRegistry.getCampaignState(activeCampaignId);
    content = formatTimeState(campaign, timeState);
  }

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}TIME STATUS${RESET}                                              ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    content.split('\n').map(line =>
      `${CYAN}║${RESET} ${line}${' '.repeat(Math.max(0, 62 - stripAnsi(line).length))}${CYAN}║${RESET}`
    ).join('\n') + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}Press any key to return${RESET}                                     ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Strip ANSI codes for length calculation
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Wait for operations menu selection
 * @returns {Promise<string>} 'travel', 'jump', 'fuel', 'contacts', 'time', or 'back'
 */
async function waitForOperationsSelection() {
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

      if (key === 'v' || key === 'V') {
        cleanup();
        resolve('travel');
        return;
      }

      if (key === 'j' || key === 'J') {
        cleanup();
        resolve('jump');
        return;
      }

      if (key === 'f' || key === 'F') {
        cleanup();
        resolve('fuel');
        return;
      }

      if (key === 'c' || key === 'C') {
        cleanup();
        resolve('contacts');
        return;
      }

      if (key === 't' || key === 'T') {
        cleanup();
        resolve('time');
        return;
      }

      if (key === 'b' || key === 'B') {
        cleanup();
        resolve('back');
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
 * Wait for contact selection or any key
 * @param {number} maxContact - Maximum contact number
 * @returns {Promise<number|null>} Contact number (1-based) or null
 */
async function waitForContactSelection(maxContact) {
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

      // Check for number key
      const num = parseInt(key, 10);
      if (num >= 1 && num <= maxContact) {
        resolve(num);
        return;
      }

      resolve(null);
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
 * Run operations menu loop
 * @returns {Promise<void>} Resolves when user selects [B] Back
 */
async function runOperationsMenu() {
  while (true) {
    showOperationsMenu();
    const selection = await waitForOperationsSelection();

    switch (selection) {
      case 'travel':
        showTravelScreen();
        await waitForAnyKey();
        break;

      case 'jump':
        showJumpScreen();
        await waitForAnyKey();
        break;

      case 'fuel':
        showFuelScreen();
        await waitForAnyKey();
        break;

      case 'contacts':
        const contacts = showContactsScreen();
        if (contacts && contacts.length > 0) {
          const contactNum = await waitForContactSelection(contacts.length);
          if (contactNum !== null) {
            const contact = contacts[contactNum - 1];
            showContactDetailScreen(contact);
            await waitForAnyKey();
          }
        } else {
          await waitForAnyKey();
        }
        break;

      case 'time':
        showTimeScreen();
        await waitForAnyKey();
        break;

      case 'back':
        return;
    }
  }
}

module.exports = {
  showOperationsMenu,
  showTravelScreen,
  showJumpScreen,
  showFuelScreen,
  showContactsScreen,
  showContactDetailScreen,
  showTimeScreen,
  waitForOperationsSelection,
  waitForContactSelection,
  runOperationsMenu,
  setActiveSession,
  getActiveSession
};
