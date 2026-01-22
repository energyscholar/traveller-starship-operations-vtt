/**
 * Role Menu for TUI
 * Select and view bridge crew role stations
 */

const { getActiveSession } = require('./operations-menu');
const { getCaptainState, ALERT_STATUS, WEAPONS_AUTH } = require('../operations/captain');
const { getPilotState } = require('../operations/pilot');
const { getCampaign } = require('../operations/accounts');
const { getShip } = require('../operations/campaign');
const { getDamagedSystems, getSystemsNeedingAttention } = require('../operations/ship-systems');
const { getFuelStatus } = require('../operations/refueling');

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

// Role definitions
const ROLES = [
  { key: '1', id: 'captain', name: 'Captain', description: 'Command, orders, alert status' },
  { key: '2', id: 'pilot', name: 'Pilot', description: 'Navigation, evasive maneuvers' },
  { key: '3', id: 'engineer', name: 'Engineer', description: 'Systems, repairs, power' },
  { key: '4', id: 'gunner', name: 'Gunner', description: 'Weapons, targeting' },
  { key: '5', id: 'sensors', name: 'Sensors', description: 'Scans, contacts, ECM' },
  { key: '6', id: 'damage-control', name: 'Damage Ctrl', description: 'Emergency repairs' },
  { key: '7', id: 'astrogator', name: 'Astrogator', description: 'Jump plots, navigation' }
];

/**
 * Show role selection menu
 * @param {TUISession} session - TUI session for I/O
 */
function showRoleMenu(session) {
  const { campaignId, shipId } = getActiveSession();

  let statusLine = '';
  if (campaignId && shipId) {
    const ship = getShip(shipId);
    const campaign = getCampaign(campaignId);
    if (ship && campaign) {
      statusLine = `${DIM}Campaign: ${campaign.name} | Ship: ${ship.name}${RESET}`;
    }
  }

  const roleLines = ROLES.map(role =>
    `${CYAN}║${RESET}  ${YELLOW}[${role.key}]${RESET} ${WHITE}${role.name.padEnd(12)}${RESET} ${DIM}${role.description}${RESET}`
  ).map(line => {
    const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
    const padding = 64 - stripped.length + line.length - stripped.length;
    return line + ' '.repeat(Math.max(0, 64 - stripped.length)) + `${CYAN}║${RESET}`;
  }).join('\n');

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}BRIDGE CREW STATIONS${RESET}                                      ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    roleLines + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${statusLine}${' '.repeat(Math.max(0, 62 - statusLine.replace(/\x1b\[[0-9;]*m/g, '').length))}${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[B]${RESET} ${DIM}Back to main menu${RESET}                                      ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);
}

/**
 * Handle role menu input
 * @param {string} key - Key pressed
 * @param {Function} setScreen - Screen setter callback
 * @returns {boolean} Whether input was handled
 */
function handleRoleInput(key, setScreen) {
  const role = ROLES.find(r => r.key === key);
  if (role) {
    setScreen(`role-${role.id}`);
    return true;
  }
  if (key.toLowerCase() === 'b') {
    setScreen('main');
    return true;
  }
  return false;
}

/**
 * Show "coming soon" screen for unimplemented roles
 * @param {TUISession} session - TUI session for I/O
 * @param {string} roleName - Name of the role
 */
function showComingSoon(session, roleName) {
  const title = `${roleName.toUpperCase()} STATION`;
  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}${title}${RESET}${' '.repeat(Math.max(0, 60 - title.length))}${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${YELLOW}Coming soon...${RESET}                                             ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${DIM}This station is under construction.${RESET}                        ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[B]${RESET} ${DIM}Back to role selection${RESET}                                 ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  session.write(out);
}

/**
 * Wait for role menu selection
 * @param {TUISession} session - TUI session for I/O
 * @returns {Promise<string>} Selected action
 */
async function waitForRoleSelection(session) {
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

      // Number keys for roles
      const role = ROLES.find(r => r.key === key);
      if (role) {
        cleanup();
        resolve(role.id);
        return;
      }

      // B for back
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
 * @returns {Promise<void>}
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
      // Ctrl+C
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

// Import role station menus
const { showCaptainMenu, handleCaptainInput } = require('./roles/captain-menu');
const { showPilotMenu, handlePilotInput } = require('./roles/pilot-menu');
const { showEngineerMenu, handleEngineerInput } = require('./roles/engineer-menu');
const { showGunnerMenu, handleGunnerInput } = require('./roles/gunner-menu');
const { showSensorsMenu, handleSensorsInput } = require('./roles/sensors-menu');
const { showDamageControlMenu, handleDamageControlInput } = require('./roles/damage-control-menu');

/**
 * Run role menu loop
 * @param {TUISession} session - TUI session for I/O
 * @returns {Promise<void>}
 */
async function runRoleMenu(session) {
  while (true) {
    showRoleMenu(session);
    const selection = await waitForRoleSelection(session);

    switch (selection) {
      case 'captain':
        showCaptainMenu(session);
        await waitForAnyKey(session);
        break;

      case 'pilot':
        showPilotMenu(session);
        await waitForAnyKey(session);
        break;

      case 'engineer':
        showEngineerMenu(session);
        await waitForAnyKey(session);
        break;

      case 'gunner':
        showGunnerMenu(session);
        await waitForAnyKey(session);
        break;

      case 'sensors':
        showSensorsMenu(session);
        await waitForAnyKey(session);
        break;

      case 'damage-control':
        showDamageControlMenu(session);
        await waitForAnyKey(session);
        break;

      case 'astrogator':
        showComingSoon(session, selection);
        await waitForAnyKey(session);
        break;

      case 'back':
        return;
    }
  }
}

module.exports = {
  showRoleMenu,
  handleRoleInput,
  showComingSoon,
  waitForRoleSelection,
  runRoleMenu,
  ROLES
};
