/**
 * Gunner Station Menu for TUI
 * Display-only gunner/weapons station view
 */

const { getActiveSession } = require('../operations-menu');
const { getCampaign } = require('../../operations/accounts');
const { getShip } = require('../../operations/campaign');
const { getVisibleContacts } = require('../../operations/contacts');

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

// Selected target state
let selectedTargetIdx = -1;
let selectedWeaponIdx = 0;

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
 * Show gunner station screen
 */
function showGunnerMenu() {
  const { campaignId, shipId } = getActiveSession();

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

      // Ship Weapons
      content.push(`  ${WHITE}${BOLD}WEAPONS SYSTEMS${RESET}`);
      const shipData = ship.ship_data || {};
      const weapons = shipData.weapons || [];
      if (weapons.length === 0) {
        content.push(`  ${DIM}No weapons installed${RESET}`);
      } else {
        weapons.forEach((weapon, idx) => {
          const selected = idx === selectedWeaponIdx ? `${GREEN}►${RESET}` : ' ';
          const name = weapon.name || weapon.type || 'Unknown Weapon';
          content.push(`  ${selected} ${name}`);
        });
      }
      content.push('');

      // Targetable Contacts
      content.push(`  ${WHITE}${BOLD}TARGETABLE CONTACTS${RESET}`);
      const contacts = getVisibleContacts(campaignId, shipId);
      const targetable = contacts.filter(c => c.is_targetable);

      if (targetable.length === 0) {
        content.push(`  ${DIM}No targets in range${RESET}`);
      } else {
        targetable.slice(0, 6).forEach((contact, idx) => {
          const selected = idx === selectedTargetIdx ? `${RED}►${RESET}` : ' ';
          const color = getDispositionColor(contact.disposition);
          const healthPct = contact.max_health > 0
            ? Math.round((contact.health / contact.max_health) * 100)
            : 100;
          const healthColor = healthPct > 50 ? GREEN : healthPct > 25 ? YELLOW : RED;
          const range = contact.range_band || 'Unknown';
          content.push(`  ${selected}[${idx + 1}] ${color}${contact.name}${RESET} - ${range} (${healthColor}${healthPct}%${RESET})`);
        });
        if (targetable.length > 6) {
          content.push(`  ${DIM}... and ${targetable.length - 6} more${RESET}`);
        }
      }
      content.push('');

      // Selected Target Info
      if (selectedTargetIdx >= 0 && selectedTargetIdx < targetable.length) {
        const target = targetable[selectedTargetIdx];
        content.push(`  ${WHITE}${BOLD}TARGET LOCKED${RESET}`);
        content.push(`  ${RED}${target.name}${RESET}`);
        content.push(`  ${DIM}Range:${RESET} ${target.range_band || 'Unknown'}`);
        content.push(`  ${DIM}Bearing:${RESET} ${target.bearing || 0}°`);
      } else {
        content.push(`  ${DIM}No target selected${RESET}`);
      }
    }
  }

  const contentLines = content.map(line =>
    `${CYAN}║${RESET}${padLine(line)}${CYAN}║${RESET}`
  ).join('\n');

  const out = CLEAR + HOME +
    `${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}\n` +
    `${CYAN}${BOLD}║${RESET}  ${WHITE}${BOLD}GUNNER STATION${RESET}                                           ${CYAN}${BOLD}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    contentLines + '\n' +
    `${CYAN}║${RESET}                                                                ${CYAN}║${RESET}\n` +
    `${CYAN}╠══════════════════════════════════════════════════════════════╣${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[1-9]${RESET} ${DIM}Select target${RESET}  ${GREEN}[W]${RESET} ${DIM}Cycle weapon${RESET}  ${GREEN}[F]${RESET} ${DIM}Fire${RESET}       ${CYAN}║${RESET}\n` +
    `${CYAN}║${RESET}  ${GREEN}[B]${RESET} ${DIM}Back to role selection${RESET}                                 ${CYAN}║${RESET}\n` +
    `${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}\n`;

  process.stdout.write(out);
}

/**
 * Handle gunner menu input
 * @param {string} key - Key pressed
 * @param {Function} setScreen - Screen setter callback
 * @returns {boolean} Whether input was handled
 */
function handleGunnerInput(key, setScreen) {
  const k = key.toLowerCase();

  if (k === 'b') {
    selectedTargetIdx = -1;
    selectedWeaponIdx = 0;
    setScreen('role');
    return true;
  }

  // Number keys 1-9 for target selection
  if (key >= '1' && key <= '9') {
    selectedTargetIdx = parseInt(key) - 1;
    showGunnerMenu(); // Refresh display
    return true;
  }

  // W - Cycle weapon
  if (k === 'w') {
    const { shipId } = getActiveSession();
    if (shipId) {
      const ship = getShip(shipId);
      const weapons = ship?.ship_data?.weapons || [];
      if (weapons.length > 0) {
        selectedWeaponIdx = (selectedWeaponIdx + 1) % weapons.length;
        showGunnerMenu(); // Refresh display
      }
    }
    return true;
  }

  // F - Fire (display only for now)
  if (k === 'f') {
    // Phase 1A: Display only
    return true;
  }

  return false;
}

module.exports = {
  showGunnerMenu,
  handleGunnerInput
};
