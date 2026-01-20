/**
 * Sensors Station Menu for TUI
 * Display-only sensor operator station view
 */

const { getActiveSession } = require('../operations-menu');
const { getCampaign } = require('../../operations/accounts');
const { getShip } = require('../../operations/campaign');
const { getVisibleContacts, getScanLevelLabel } = require('../../operations/contacts');
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
const MAGENTA = `${ESC}[35m`;

// Selected contact state
let selectedContactIdx = -1;
let ewMode = 'off'; // 'off', 'ecm', 'jam'
let sensorLockTarget = null;

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
 * Get disposition color
 */
function getDispositionColor(disposition) {
  switch (disposition) {
    case 'hostile': return RED;
    case 'neutral': return YELLOW;
    case 'friendly': return GREEN;
    default: return WHITE;
  }
}

/**
 * Get scan level color
 */
function getScanColor(level) {
  if (level >= 3) return GREEN;
  if (level >= 2) return YELLOW;
  if (level >= 1) return CYAN;
  return DIM;
}

/**
 * Show sensors station screen
 */
function showSensorsMenu() {
  const { campaignId, shipId } = getActiveSession();

  // Get combat state for banner
  const combatState = getCombatState(campaignId);
  const combatBanner = formatCombatBanner(combatState, 'sensors');

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

      // EW Status
      content.push(`  ${WHITE}${BOLD}ELECTRONIC WARFARE${RESET}`);
      let ewDisplay;
      switch (ewMode) {
        case 'ecm':
          ewDisplay = `${GREEN}ECM ACTIVE${RESET} ${DIM}(defensive)${RESET}`;
          break;
        case 'jam':
          ewDisplay = `${MAGENTA}JAMMING${RESET} ${DIM}(offensive)${RESET}`;
          break;
        default:
          ewDisplay = `${DIM}Inactive${RESET}`;
      }
      content.push(`  Mode: ${ewDisplay}`);
      content.push('');

      // Sensor Lock
      content.push(`  ${WHITE}${BOLD}SENSOR LOCK${RESET}`);
      if (sensorLockTarget) {
        content.push(`  ${CYAN}LOCKED:${RESET} ${RED}${sensorLockTarget}${RESET}`);
      } else {
        content.push(`  ${DIM}No lock active${RESET}`);
      }
      content.push('');

      // Contacts List
      content.push(`  ${WHITE}${BOLD}DETECTED CONTACTS${RESET}`);
      const contacts = getVisibleContacts(campaignId, shipId);

      if (contacts.length === 0) {
        content.push(`  ${DIM}No contacts detected${RESET}`);
      } else {
        contacts.slice(0, 6).forEach((contact, idx) => {
          const selected = idx === selectedContactIdx ? `${CYAN}►${RESET}` : ' ';
          const color = getDispositionColor(contact.disposition);
          const scanLevel = contact.scan_level || 0;
          const scanColor = getScanColor(scanLevel);
          const scanLabel = getScanLevelLabel ? getScanLevelLabel(scanLevel) : `L${scanLevel}`;
          const locked = sensorLockTarget === contact.name ? `${CYAN}[L]${RESET}` : '';
          content.push(`  ${selected}[${idx + 1}] ${color}${contact.name}${RESET} ${scanColor}(${scanLabel})${RESET} ${locked}`);
        });
        if (contacts.length > 6) {
          content.push(`  ${DIM}... and ${contacts.length - 6} more${RESET}`);
        }
      }
      content.push('');

      // Selected Contact Info
      if (selectedContactIdx >= 0 && selectedContactIdx < contacts.length) {
        const contact = contacts[selectedContactIdx];
        content.push(`  ${WHITE}${BOLD}CONTACT DETAILS${RESET}`);
        content.push(`  ${contact.name}`);
        content.push(`  ${DIM}Type:${RESET} ${contact.type || 'Unknown'}`);
        content.push(`  ${DIM}Range:${RESET} ${contact.range_band || 'Unknown'}`);
        content.push(`  ${DIM}Bearing:${RESET} ${contact.bearing || 0}°`);
        content.push(`  ${DIM}Signature:${RESET} ${contact.signature || 'Normal'}`);
      }
    }
  }

  const contentLines = content.map(line =>
    `${CYAN}║${RESET}${padLine(line)}${CYAN}║${RESET}`
  ).join('\n');

  const out = CLEAR + HOME +
    (combatBanner ? combatBanner + '\n' : '') +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}SENSORS STATION${RESET}                                          ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    contentLines + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[1-9]${RESET} ${DIM}Select${RESET}  ${GREEN}[S]${RESET} ${DIM}Scan${RESET}  ${GREEN}[E]${RESET} ${DIM}ECM${RESET}  ${GREEN}[J]${RESET} ${DIM}Jam${RESET}  ${GREEN}[L]${RESET} ${DIM}Lock${RESET}   ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[B]${RESET} ${DIM}Back to role selection${RESET}                                 ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Handle sensors menu input
 * @param {string} key - Key pressed
 * @param {Function} setScreen - Screen setter callback
 * @returns {boolean} Whether input was handled
 */
function handleSensorsInput(key, setScreen) {
  const k = key.toLowerCase();

  if (k === 'b') {
    selectedContactIdx = -1;
    setScreen('role');
    return true;
  }

  // Number keys 1-9 for contact selection
  if (key >= '1' && key <= '9') {
    selectedContactIdx = parseInt(key) - 1;
    showSensorsMenu(); // Refresh display
    return true;
  }

  // S - Scan (display only for now)
  if (k === 's') {
    // Phase 1A: Display only
    return true;
  }

  // E - Toggle ECM
  if (k === 'e') {
    ewMode = ewMode === 'ecm' ? 'off' : 'ecm';
    showSensorsMenu(); // Refresh display
    return true;
  }

  // J - Toggle Jamming
  if (k === 'j') {
    ewMode = ewMode === 'jam' ? 'off' : 'jam';
    showSensorsMenu(); // Refresh display
    return true;
  }

  // L - Lock sensors on selected contact
  if (k === 'l') {
    const { campaignId, shipId } = getActiveSession();
    if (campaignId && selectedContactIdx >= 0) {
      const contacts = getVisibleContacts(campaignId, shipId);
      if (selectedContactIdx < contacts.length) {
        const contact = contacts[selectedContactIdx];
        sensorLockTarget = sensorLockTarget === contact.name ? null : contact.name;
        showSensorsMenu(); // Refresh display
      }
    }
    return true;
  }

  return false;
}

module.exports = {
  showSensorsMenu,
  handleSensorsInput
};
