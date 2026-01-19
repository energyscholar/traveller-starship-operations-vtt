/**
 * Travel State Formatter for TUI
 * Displays: location, destination, ETA, evasive status
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

/**
 * Format travel state for display
 * @param {Object} pilotState - State from getPilotState()
 * @param {Object} campaign - Campaign data
 * @param {Object} ship - Active ship data
 * @returns {string} Formatted travel display
 */
function formatTravelState(pilotState, campaign, ship) {
  const lines = [];

  // Location
  const location = campaign?.current_system || 'Unknown';
  const sector = campaign?.current_sector || '';
  const hex = campaign?.current_hex || '';
  const locationStr = hex ? `${location} (${sector} ${hex})` : location;

  lines.push(`${CYAN}${BOLD}TRAVEL STATUS${RESET}`);
  lines.push('');
  lines.push(`  ${WHITE}Location:${RESET}    ${GREEN}${locationStr}${RESET}`);

  // Ship info
  if (ship) {
    const shipType = ship.ship_data?.type || ship.ship_data?.shipType || 'Unknown';
    lines.push(`  ${WHITE}Ship:${RESET}        ${ship.name} (${shipType})`);

    // Thrust info
    const thrust = ship.ship_data?.thrust || 0;
    lines.push(`  ${WHITE}Thrust:${RESET}      M-${thrust}`);
  }

  // Destination/Course
  if (pilotState?.destination) {
    lines.push(`  ${WHITE}Course:${RESET}      ${YELLOW}${pilotState.destination}${RESET}`);

    if (pilotState.eta) {
      lines.push(`  ${WHITE}ETA:${RESET}         ${pilotState.eta}`);
    }
  } else {
    lines.push(`  ${WHITE}Course:${RESET}      ${DIM}No course set${RESET}`);
  }

  // Evasive status
  lines.push('');
  if (pilotState?.evasive) {
    lines.push(`  ${YELLOW}${BOLD}EVASIVE MANEUVERS ACTIVE${RESET}`);
    lines.push(`  ${DIM}Attack DM: -2 to incoming fire${RESET}`);
    lines.push(`  ${DIM}Cannot fire weapons effectively${RESET}`);
  } else {
    lines.push(`  ${DIM}Evasive: Off${RESET}`);
  }

  return lines.join('\n');
}

/**
 * Format brief travel status (one line)
 * @param {Object} pilotState - State from getPilotState()
 * @param {Object} campaign - Campaign data
 * @returns {string} Brief status line
 */
function formatTravelBrief(pilotState, campaign) {
  const location = campaign?.current_system || 'Unknown';
  const evasive = pilotState?.evasive ? ` ${YELLOW}[EVASIVE]${RESET}` : '';
  const course = pilotState?.destination ? ` -> ${pilotState.destination}` : '';

  return `${GREEN}${location}${RESET}${course}${evasive}`;
}

module.exports = {
  formatTravelState,
  formatTravelBrief
};
