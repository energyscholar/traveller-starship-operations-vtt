/**
 * Fuel Status Formatter for TUI
 * Displays: current/max fuel, percentage, available sources with costs
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
 * Format fuel status for display
 * @param {Object} fuelStatus - Status from getFuelStatus()
 * @param {Array} availableSources - Sources from getAvailableSources()
 * @returns {string} Formatted fuel display
 */
function formatFuelState(fuelStatus, availableSources) {
  const lines = [];

  lines.push(`${CYAN}${BOLD}FUEL STATUS${RESET}`);
  lines.push('');

  if (!fuelStatus) {
    lines.push(`  ${YELLOW}No fuel data available.${RESET}`);
    return lines.join('\n');
  }

  // Current fuel level
  const current = fuelStatus.current || 0;
  const max = fuelStatus.capacity || fuelStatus.max || 100;
  const percent = max > 0 ? Math.round((current / max) * 100) : 0;

  // Color based on fuel level
  let fuelColor = GREEN;
  if (percent <= 25) fuelColor = RED;
  else if (percent <= 50) fuelColor = YELLOW;

  lines.push(`  ${WHITE}Current:${RESET}     ${fuelColor}${current}${RESET} / ${max} tons`);
  lines.push(`  ${WHITE}Level:${RESET}       ${fuelColor}${formatFuelBar(percent)} ${percent}%${RESET}`);

  // Fuel types breakdown
  if (fuelStatus.refined !== undefined || fuelStatus.unrefined !== undefined) {
    lines.push('');
    lines.push(`  ${WHITE}Breakdown:${RESET}`);
    if (fuelStatus.refined > 0) {
      lines.push(`    ${GREEN}Refined:${RESET}   ${fuelStatus.refined} tons`);
    }
    if (fuelStatus.unrefined > 0) {
      lines.push(`    ${YELLOW}Unrefined:${RESET} ${fuelStatus.unrefined} tons`);
    }
    if (fuelStatus.processed > 0) {
      lines.push(`    ${GREEN}Processed:${RESET} ${fuelStatus.processed} tons`);
    }
  }

  // Jump fuel requirement
  if (fuelStatus.jumpFuelRequired) {
    lines.push('');
    const jumpReady = current >= fuelStatus.jumpFuelRequired;
    const jumpColor = jumpReady ? GREEN : RED;
    lines.push(`  ${WHITE}Jump Fuel:${RESET}   ${jumpColor}${fuelStatus.jumpFuelRequired} tons required${RESET}`);
    if (!jumpReady) {
      lines.push(`  ${RED}INSUFFICIENT FUEL FOR JUMP${RESET}`);
    }
  }

  // Available sources
  if (availableSources && availableSources.length > 0) {
    lines.push('');
    lines.push(`  ${WHITE}${BOLD}Available Sources:${RESET}`);
    availableSources.forEach((source, idx) => {
      const cost = source.cost > 0 ? `Cr${source.cost}/ton` : 'Free';
      const time = source.timeHours > 0 ? `, ${source.timeHours}h` : '';
      lines.push(`    ${YELLOW}${idx + 1}.${RESET} ${source.name} (${cost}${time})`);
    });
  } else {
    lines.push('');
    lines.push(`  ${DIM}No refueling sources at current location${RESET}`);
  }

  return lines.join('\n');
}

/**
 * Format fuel level as progress bar
 * @param {number} percent - Fuel percentage 0-100
 * @returns {string} Progress bar
 */
function formatFuelBar(percent) {
  const width = 20;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

/**
 * Format brief fuel status (one line)
 * @param {Object} fuelStatus - Status from getFuelStatus()
 * @returns {string} Brief status line
 */
function formatFuelBrief(fuelStatus) {
  if (!fuelStatus) return `${DIM}No fuel data${RESET}`;

  const current = fuelStatus.current || 0;
  const max = fuelStatus.capacity || fuelStatus.max || 100;
  const percent = max > 0 ? Math.round((current / max) * 100) : 0;

  let color = GREEN;
  if (percent <= 25) color = RED;
  else if (percent <= 50) color = YELLOW;

  return `Fuel: ${color}${current}/${max}t (${percent}%)${RESET}`;
}

module.exports = {
  formatFuelState,
  formatFuelBrief,
  formatFuelBar
};
