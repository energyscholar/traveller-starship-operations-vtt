/**
 * Jump State Formatter for TUI
 * Displays: jump state, fuel cost, arrival time (if in-jump)
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

/**
 * Format jump state for display
 * @param {Object} jumpStatus - Status from getJumpStatus()
 * @param {Object} ship - Active ship data
 * @param {Object} campaign - Campaign data
 * @returns {string} Formatted jump display
 */
function formatJumpState(jumpStatus, ship, campaign) {
  const lines = [];

  lines.push(`${MAGENTA}${BOLD}JUMP STATUS${RESET}`);
  lines.push('');

  // Current state
  if (jumpStatus?.inJump) {
    lines.push(`  ${YELLOW}${BOLD}IN JUMP SPACE${RESET}`);
    lines.push('');
    lines.push(`  ${WHITE}Destination:${RESET}  ${GREEN}${jumpStatus.destination || 'Unknown'}${RESET}`);

    if (jumpStatus.arrivalDate) {
      lines.push(`  ${WHITE}Arrival:${RESET}      ${jumpStatus.arrivalDate}`);
    }

    if (jumpStatus.hoursRemaining !== undefined) {
      const days = Math.floor(jumpStatus.hoursRemaining / 24);
      const hours = jumpStatus.hoursRemaining % 24;
      lines.push(`  ${WHITE}Time Left:${RESET}    ${days}d ${hours}h`);
    }

    lines.push('');
    lines.push(`  ${DIM}Ship is in jumpspace. All external${RESET}`);
    lines.push(`  ${DIM}communications and sensors offline.${RESET}`);
  } else {
    lines.push(`  ${GREEN}Normal Space${RESET}`);
    lines.push('');

    // Jump drive info
    if (ship?.ship_data) {
      const jumpRating = ship.ship_data.jump || ship.ship_data.jumpDrive || 0;
      lines.push(`  ${WHITE}Jump Rating:${RESET}  J-${jumpRating}`);

      // Fuel info
      const fuelCapacity = ship.ship_data.fuelCapacity || 0;
      const currentFuel = ship.current_state?.fuel ?? fuelCapacity;
      const jumpFuel = ship.ship_data.fuelPerJump || Math.ceil(fuelCapacity * 0.1 * jumpRating);

      lines.push(`  ${WHITE}Fuel:${RESET}         ${currentFuel}/${fuelCapacity} tons`);
      lines.push(`  ${WHITE}Per Jump:${RESET}     ${jumpFuel} tons`);

      // Can we jump?
      if (jumpRating > 0) {
        if (currentFuel >= jumpFuel) {
          lines.push('');
          lines.push(`  ${GREEN}Ready to jump${RESET}`);
        } else {
          lines.push('');
          lines.push(`  ${RED}Insufficient fuel for jump${RESET}`);
        }
      } else {
        lines.push('');
        lines.push(`  ${DIM}No jump drive installed${RESET}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Format brief jump status (one line)
 * @param {Object} jumpStatus - Status from getJumpStatus()
 * @returns {string} Brief status line
 */
function formatJumpBrief(jumpStatus) {
  if (jumpStatus?.inJump) {
    const dest = jumpStatus.destination || 'Unknown';
    return `${MAGENTA}IN JUMP${RESET} -> ${dest}`;
  }
  return `${DIM}Normal space${RESET}`;
}

module.exports = {
  formatJumpState,
  formatJumpBrief
};
