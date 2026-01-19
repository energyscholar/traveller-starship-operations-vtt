/**
 * Contacts Formatter for TUI
 * Displays: visible contacts list with scan levels, contact details
 */

// ANSI escape codes
const ESC = '\x1b';
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const WHITE = `${ESC}[37m`;
const RED = `${ESC}[31m`;
const MAGENTA = `${ESC}[35m`;

// Range band display colors
const RANGE_COLORS = {
  adjacent: RED,
  close: RED,
  short: YELLOW,
  medium: YELLOW,
  long: GREEN,
  veryLong: CYAN,
  distant: DIM
};

// Disposition colors
const DISPOSITION_COLORS = {
  hostile: RED,
  unfriendly: YELLOW,
  neutral: WHITE,
  friendly: GREEN,
  allied: CYAN,
  unknown: DIM
};

/**
 * Format contacts list for display
 * @param {Array} contacts - Contacts from getVisibleContacts()
 * @param {Function} getScanLevelLabel - Function to get scan level label
 * @returns {string} Formatted contacts list
 */
function formatContactsList(contacts, getScanLevelLabel) {
  const lines = [];

  lines.push(`${CYAN}${BOLD}SENSOR CONTACTS${RESET}`);
  lines.push('');

  if (!contacts || contacts.length === 0) {
    lines.push(`  ${DIM}No contacts detected.${RESET}`);
    return lines.join('\n');
  }

  lines.push(`  ${DIM}${contacts.length} contact(s) in range${RESET}`);
  lines.push('');

  contacts.forEach((contact, idx) => {
    const num = idx + 1;
    const name = contact.name || contact.transponder || 'Unknown';
    const range = contact.range_band || 'unknown';
    const rangeColor = RANGE_COLORS[range] || DIM;
    const scanLevel = getScanLevelLabel ? getScanLevelLabel(contact.scan_level || 0) : 'Unknown';

    // Disposition indicator
    const disp = contact.disposition || 'unknown';
    const dispColor = DISPOSITION_COLORS[disp] || DIM;
    const dispIcon = getDispositionIcon(disp);

    lines.push(`  ${YELLOW}[${num}]${RESET} ${dispColor}${dispIcon}${RESET} ${WHITE}${name}${RESET}`);
    lines.push(`      ${rangeColor}${formatRangeBand(range)}${RESET} | ${DIM}Scan: ${scanLevel}${RESET}`);
  });

  lines.push('');
  lines.push(`  ${DIM}Press number to view details${RESET}`);

  return lines.join('\n');
}

/**
 * Format contact detail for display
 * @param {Object} contact - Single contact object
 * @param {Function} getScanLevelLabel - Function to get scan level label
 * @returns {string} Formatted contact detail
 */
function formatContactDetail(contact, getScanLevelLabel) {
  const lines = [];

  if (!contact) {
    return `  ${YELLOW}Contact not found.${RESET}`;
  }

  const name = contact.name || contact.transponder || 'Unknown Contact';
  const scanLevel = contact.scan_level || 0;
  const scanLabel = getScanLevelLabel ? getScanLevelLabel(scanLevel) : 'Unknown';

  lines.push(`${CYAN}${BOLD}CONTACT: ${name}${RESET}`);
  lines.push('');

  // Basic info (always visible)
  const range = contact.range_band || 'unknown';
  const rangeColor = RANGE_COLORS[range] || DIM;
  lines.push(`  ${WHITE}Range:${RESET}       ${rangeColor}${formatRangeBand(range)}${RESET}`);
  lines.push(`  ${WHITE}Bearing:${RESET}     ${contact.bearing || 0}°`);
  lines.push(`  ${WHITE}Scan Level:${RESET}  ${scanLabel}`);

  // Passive scan (level 1+)
  if (scanLevel >= 1) {
    if (contact.transponder) {
      lines.push(`  ${WHITE}Transponder:${RESET} ${contact.transponder}`);
    }
    if (contact.type && contact.type !== 'unknown') {
      lines.push(`  ${WHITE}Type:${RESET}        ${contact.type}`);
    }
  }

  // Active scan (level 2+)
  if (scanLevel >= 2) {
    if (contact.ship_type) {
      lines.push(`  ${WHITE}Ship Type:${RESET}   ${contact.ship_type}`);
    }
    if (contact.tonnage) {
      lines.push(`  ${WHITE}Tonnage:${RESET}     ${contact.tonnage}t`);
    }
    if (contact.signature) {
      lines.push(`  ${WHITE}Signature:${RESET}   ${contact.signature}`);
    }

    // Disposition with color
    const disp = contact.disposition || 'unknown';
    const dispColor = DISPOSITION_COLORS[disp] || DIM;
    lines.push(`  ${WHITE}Disposition:${RESET} ${dispColor}${disp.toUpperCase()}${RESET}`);

    // Weapons detected
    if (contact.weapons && contact.weapons.length > 0) {
      lines.push(`  ${WHITE}Weapons:${RESET}     ${RED}${contact.weapons.length} detected${RESET}`);
    }
  }

  // Deep scan (level 3)
  if (scanLevel >= 3) {
    if (contact.crew_count) {
      lines.push(`  ${WHITE}Crew:${RESET}        ${contact.crew_count}`);
    }
    if (contact.gm_notes) {
      lines.push('');
      lines.push(`  ${MAGENTA}GM Notes:${RESET}`);
      lines.push(`  ${DIM}${contact.gm_notes}${RESET}`);
    }
  }

  // Combat status
  if (contact.is_targetable) {
    lines.push('');
    const health = contact.health || 0;
    const maxHealth = contact.max_health || 100;
    const healthPct = maxHealth > 0 ? Math.round((health / maxHealth) * 100) : 0;
    let healthColor = GREEN;
    if (healthPct <= 25) healthColor = RED;
    else if (healthPct <= 50) healthColor = YELLOW;

    lines.push(`  ${WHITE}Hull:${RESET}        ${healthColor}${health}/${maxHealth} (${healthPct}%)${RESET}`);

    if (contact.weapons_free) {
      lines.push(`  ${RED}${BOLD}WEAPONS FREE${RESET}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format range band for display
 */
function formatRangeBand(band) {
  const labels = {
    adjacent: 'Adjacent',
    close: 'Close',
    short: 'Short',
    medium: 'Medium',
    long: 'Long',
    veryLong: 'Very Long',
    distant: 'Distant'
  };
  return labels[band] || band;
}

/**
 * Get disposition icon
 */
function getDispositionIcon(disposition) {
  const icons = {
    hostile: '!',
    unfriendly: '-',
    neutral: '=',
    friendly: '+',
    allied: '*',
    unknown: '?'
  };
  return icons[disposition] || '?';
}

/**
 * Format brief contacts status (one line)
 * @param {Array} contacts - Contacts from getVisibleContacts()
 * @returns {string} Brief status line
 */
function formatContactsBrief(contacts) {
  if (!contacts || contacts.length === 0) {
    return `${DIM}No contacts${RESET}`;
  }

  const hostile = contacts.filter(c => c.disposition === 'hostile').length;
  if (hostile > 0) {
    return `${RED}${contacts.length} contacts (${hostile} hostile)${RESET}`;
  }

  return `${GREEN}${contacts.length} contacts${RESET}`;
}

module.exports = {
  formatContactsList,
  formatContactDetail,
  formatContactsBrief,
  formatRangeBand,
  getDispositionIcon
};
