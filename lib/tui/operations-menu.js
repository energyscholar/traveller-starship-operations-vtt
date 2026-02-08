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

const { ANSI, stripAnsi } = require('./ansi-utils');
const { BOLD, DIM, RESET, GREEN, YELLOW, CYAN, WHITE, CLEAR, HOME } = ANSI;

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
 * @param {TUISession} session - TUI session for I/O
 */
function showOperationsMenu(session) {
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

  session.write(out);
}

/**
 * Show travel screen
 * @param {TUISession} session - TUI session for I/O
 */
function showTravelScreen(session) {
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

  session.write(out);
}

/**
 * Show jump screen
 * @param {TUISession} session - TUI session for I/O
 */
function showJumpScreen(session) {
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

  session.write(out);
}

/**
 * Show fuel screen
 * @param {TUISession} session - TUI session for I/O
 */
function showFuelScreen(session) {
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

  session.write(out);
}

/**
 * Show contacts screen
 * @param {TUISession} session - TUI session for I/O
 */
function showContactsScreen(session) {
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

  session.write(out);

  return contacts;
}

/**
 * Show contact detail screen
 * @param {TUISession} session - TUI session for I/O
 * @param {Object} contact - Contact object
 */
function showContactDetailScreen(session, contact) {
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

  session.write(out);
}

/**
 * Show time screen
 * @param {TUISession} session - TUI session for I/O
 */
function showTimeScreen(session) {
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

  session.write(out);
}

/**
 * Wait for operations menu selection
 * @param {TUISession} session - TUI session for I/O
 * @returns {Promise<string>} 'travel', 'jump', 'fuel', 'contacts', 'time', or 'back'
 */
async function waitForOperationsSelection(session) {
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
 * Wait for contact selection or any key
 * @param {TUISession} session - TUI session for I/O
 * @param {number} maxContact - Maximum contact number
 * @returns {Promise<number|null>} Contact number (1-based) or null
 */
async function waitForContactSelection(session, maxContact) {
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

      // Check for number key
      const num = parseInt(key, 10);
      if (num >= 1 && num <= maxContact) {
        resolve(num);
        return;
      }

      resolve(null);
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
 * Run operations menu loop
 * @param {TUISession} session - TUI session for I/O
 * @returns {Promise<void>} Resolves when user selects [B] Back
 */
async function runOperationsMenu(session) {
  while (true) {
    showOperationsMenu(session);
    const selection = await waitForOperationsSelection(session);

    switch (selection) {
      case 'travel':
        showTravelScreen(session);
        await waitForAnyKey(session);
        break;

      case 'jump':
        showJumpScreen(session);
        await waitForAnyKey(session);
        break;

      case 'fuel':
        showFuelScreen(session);
        await waitForAnyKey(session);
        break;

      case 'contacts':
        const contacts = showContactsScreen(session);
        if (contacts && contacts.length > 0) {
          const contactNum = await waitForContactSelection(session, contacts.length);
          if (contactNum !== null) {
            const contact = contacts[contactNum - 1];
            showContactDetailScreen(session, contact);
            await waitForAnyKey(session);
          }
        } else {
          await waitForAnyKey(session);
        }
        break;

      case 'time':
        showTimeScreen(session);
        await waitForAnyKey(session);
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
