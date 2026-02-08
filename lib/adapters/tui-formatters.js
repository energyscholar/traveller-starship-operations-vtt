/**
 * TUI Formatters - Pure ANSI Formatters for Role ViewModels
 *
 * Each formatter takes a ViewModel and returns an ANSI-formatted string.
 * Formatters are PURE functions with NO side effects.
 *
 * @module lib/adapters/tui-formatters
 */

const { ANSI, stripAnsi } = require('../tui/ansi-utils');

// Role-specific styling
const ROLE_STYLES = {
  gunner: { color: ANSI.RED, icon: '[GUN]', label: 'GUNNER' },
  pilot: { color: ANSI.CYAN, icon: '[PLT]', label: 'PILOT' },
  sensors: { color: ANSI.BLUE, icon: '[SNS]', label: 'SENSORS' },
  engineer: { color: ANSI.GREEN, icon: '[ENG]', label: 'ENGINEER' },
  captain: { color: ANSI.YELLOW, icon: '[CPT]', label: 'CAPTAIN' },
  'damage-control': { color: ANSI.MAGENTA, icon: '[DMG]', label: 'DAMAGE CTRL' },
  astrogator: { color: ANSI.BRIGHT_BLUE, icon: '[NAV]', label: 'ASTROGATOR' },
  observer: { color: ANSI.WHITE, icon: '[OBS]', label: 'OBSERVER' }
};

/**
 * Create a progress bar
 * @param {number} current - Current value
 * @param {number} max - Maximum value
 * @param {number} width - Bar width in characters
 * @returns {string} Colored progress bar
 */
function progressBar(current, max, width = 20) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.round(pct * width);
  const empty = width - filled;
  const color = pct > 0.5 ? ANSI.GREEN : pct > 0.25 ? ANSI.YELLOW : ANSI.RED;
  return color + '\u2588'.repeat(filled) + ANSI.DIM + '\u2591'.repeat(empty) + ANSI.RESET;
}

/**
 * Create a header line for a role panel
 * @param {string} role - Role type
 * @param {string} statusBadge - Status badge text
 * @param {string} statusClass - Status class for coloring
 * @returns {string} Formatted header
 */
function roleHeader(role, statusBadge, statusClass) {
  const style = ROLE_STYLES[role] || ROLE_STYLES.observer;
  const statusColor = statusClass.includes('free') || statusClass.includes('clear') ? ANSI.GREEN :
                      statusClass.includes('hold') || statusClass.includes('warning') ? ANSI.YELLOW :
                      statusClass.includes('critical') || statusClass.includes('emergency') ? ANSI.RED :
                      ANSI.WHITE;

  return `${style.color}${ANSI.BOLD}${style.icon} ${style.label}${ANSI.RESET} ` +
         `${statusColor}[${statusBadge}]${ANSI.RESET}`;
}

/**
 * Format a key-value line
 * @param {string} key - Label
 * @param {string} value - Value
 * @param {number} keyWidth - Width for key column
 * @returns {string} Formatted line
 */
function kvLine(key, value, keyWidth = 12) {
  const paddedKey = key.padEnd(keyWidth);
  return `  ${ANSI.DIM}${paddedKey}${ANSI.RESET} ${value}`;
}

/**
 * Format action availability
 * @param {string} name - Action name
 * @param {object} action - Action state { enabled, reason }
 * @returns {string} Formatted action line
 */
function actionLine(name, action) {
  if (action.enabled) {
    return `  ${ANSI.GREEN}[${name}]${ANSI.RESET}`;
  } else {
    return `  ${ANSI.DIM}[${name}] ${action.reason || 'unavailable'}${ANSI.RESET}`;
  }
}

// ============================================
// ROLE FORMATTERS
// ============================================

/**
 * Format Gunner ViewModel
 * @param {object} vm - Gunner ViewModel
 * @returns {string} ANSI-formatted string
 */
function formatGunner(vm) {
  const lines = [];
  const d = vm.derived;
  const data = vm.data;

  lines.push(roleHeader('gunner', d.statusBadge, d.statusClass));
  lines.push('');
  lines.push(kvLine('Turret', d.turretText));
  lines.push(kvLine('Weapons', d.weaponCountText));
  lines.push(kvLine('Targets', d.targetCountText));

  if (data.targeting?.selected) {
    lines.push(kvLine('Target', data.targeting.selected.name));
    lines.push(kvLine('Range', data.targeting.selected.rangeBand || '--'));
    lines.push(kvLine('Hit Chance', d.hitChanceText));
    lines.push(kvLine('Range DM', d.rangeDMText));
  }

  lines.push('');
  lines.push(`${ANSI.DIM}Actions:${ANSI.RESET}`);
  lines.push(actionLine('FIRE', vm.actions.fire));
  lines.push(actionLine('SELECT TARGET', vm.actions.selectTarget));

  return lines.join('\n');
}

/**
 * Format Pilot ViewModel
 * @param {object} vm - Pilot ViewModel
 * @returns {string} ANSI-formatted string
 */
function formatPilot(vm) {
  const lines = [];
  const d = vm.derived;
  const data = vm.data;

  lines.push(roleHeader('pilot', d.statusBadge, d.statusClass));
  lines.push('');
  lines.push(kvLine('Location', d.locationText));
  lines.push(kvLine('Destination', d.destinationText));
  lines.push(kvLine('Thrust', d.thrustText));
  lines.push(kvLine('Heading', d.headingText));

  if (data.jump?.inJump) {
    lines.push(kvLine('Jump Time', d.jumpTimeText));
  }

  if (data.flightConditions) {
    lines.push('');
    lines.push(`${d.flightSeverityClass === 'severity-danger' ? ANSI.RED : ANSI.YELLOW}Flight Conditions:${ANSI.RESET}`);
    if (data.flightConditions.visibility) lines.push(kvLine('Visibility', data.flightConditions.visibility));
    if (data.flightConditions.turbulence) lines.push(kvLine('Turbulence', data.flightConditions.turbulence));
  }

  lines.push('');
  lines.push(`${ANSI.DIM}Actions:${ANSI.RESET}`);
  lines.push(actionLine('SET DEST', vm.actions.setDestination));
  lines.push(actionLine('EVASIVE', vm.actions.evasiveManeuvers));

  return lines.join('\n');
}

/**
 * Format Sensors ViewModel
 * @param {object} vm - Sensors ViewModel
 * @returns {string} ANSI-formatted string
 */
function formatSensors(vm) {
  const lines = [];
  const d = vm.derived;
  const data = vm.data;

  lines.push(roleHeader('sensors', d.statusBadge, d.statusClass));
  lines.push('');
  lines.push(kvLine('Contacts', d.contactCountText));
  lines.push(kvLine('Ships', d.shipsText));
  lines.push(kvLine('Stations', d.stationsText));
  lines.push(kvLine('Threats', d.threatCountText));
  lines.push(kvLine('Lock', d.lockStatusText));

  lines.push('');
  lines.push(`${ANSI.DIM}Actions:${ANSI.RESET}`);
  lines.push(actionLine('SCAN', vm.actions.scan));
  lines.push(actionLine('LOCK', vm.actions.lock));
  lines.push(actionLine('UNLOCK', vm.actions.unlock));

  return lines.join('\n');
}

/**
 * Format Engineer ViewModel
 * @param {object} vm - Engineer ViewModel
 * @returns {string} ANSI-formatted string
 */
function formatEngineer(vm) {
  const lines = [];
  const d = vm.derived;
  const data = vm.data;

  lines.push(roleHeader('engineer', d.statusBadge, d.statusClass));
  lines.push('');

  // Fuel with progress bar
  const fuelPct = data.fuel?.percentFull || 0;
  lines.push(kvLine('Fuel', `${d.fuelText} ${progressBar(fuelPct, 100, 10)}`));
  lines.push(kvLine('Power', `${d.powerPercentText} ${progressBar(data.power?.percentUsed || 0, 100, 10)}`));
  lines.push(kvLine('Damaged', d.damagedCountText));
  lines.push(kvLine('Repairs', d.repairQueueText));
  lines.push(kvLine('Can Jump', d.canJumpText));

  lines.push('');
  lines.push(`${ANSI.DIM}Actions:${ANSI.RESET}`);
  lines.push(actionLine('POWER', vm.actions.adjustPower));
  lines.push(actionLine('REPAIR', vm.actions.repair));
  lines.push(actionLine('PROCESS FUEL', vm.actions.processFuel));

  return lines.join('\n');
}

/**
 * Format Captain ViewModel
 * @param {object} vm - Captain ViewModel
 * @returns {string} ANSI-formatted string
 */
function formatCaptain(vm) {
  const lines = [];
  const d = vm.derived;

  lines.push(roleHeader('captain', d.statusBadge, d.statusClass));
  lines.push('');
  lines.push(kvLine('Ship', d.shipNameText));
  lines.push(kvLine('Class', d.shipClassText));
  lines.push(kvLine('Crew', d.crewCountText));
  lines.push(kvLine('Alert', d.alertText));
  lines.push(kvLine('Contacts', d.contactSummaryText));
  lines.push(kvLine('Hostile', d.hostileSummaryText));

  lines.push('');
  lines.push(`${ANSI.DIM}Actions:${ANSI.RESET}`);
  lines.push(actionLine('SET ALERT', vm.actions.setAlert));
  lines.push(actionLine('ORDER', vm.actions.issueOrder));
  lines.push(actionLine('RELIEVE', vm.actions.relieveCrew));

  return lines.join('\n');
}

/**
 * Format Damage Control ViewModel
 * @param {object} vm - Damage Control ViewModel
 * @returns {string} ANSI-formatted string
 */
function formatDamageControl(vm) {
  const lines = [];
  const d = vm.derived;
  const data = vm.data;

  lines.push(roleHeader('damage-control', d.statusBadge, d.statusClass));
  lines.push('');

  // Hull with progress bar
  const hullPct = data.hull?.percent || 100;
  lines.push(kvLine('Hull', `${d.hullText} ${progressBar(hullPct, 100, 10)}`));
  lines.push(kvLine('Systems', d.damageCountText));
  lines.push(kvLine('Fires', d.fireCountText));
  lines.push(kvLine('Breaches', d.breachCountText));

  lines.push('');
  lines.push(`${ANSI.DIM}Actions:${ANSI.RESET}`);
  lines.push(actionLine('REPAIR HULL', vm.actions.repairHull));
  lines.push(actionLine('REPAIR SYS', vm.actions.repairSystem));
  lines.push(actionLine('FIREFIGHT', vm.actions.firefighting));
  lines.push(actionLine('SEAL BREACH', vm.actions.sealBreach));

  return lines.join('\n');
}

/**
 * Format Astrogator ViewModel
 * @param {object} vm - Astrogator ViewModel
 * @returns {string} ANSI-formatted string
 */
function formatAstrogator(vm) {
  const lines = [];
  const d = vm.derived;
  const data = vm.data;

  lines.push(roleHeader('astrogator', d.statusBadge, d.statusClass));
  lines.push('');
  lines.push(kvLine('Jump Rating', d.jumpRatingText));
  lines.push(kvLine('Range', d.jumpRangeText));
  lines.push(kvLine('Current', d.currentSystemText));
  lines.push(kvLine('Destination', d.destinationText));
  lines.push(kvLine('Fuel Req', d.fuelRequiredText));
  lines.push(kvLine('Fuel Avail', d.fuelAvailableText));
  lines.push(kvLine('Status', d.canJumpText));

  lines.push('');
  lines.push(`${ANSI.DIM}Actions:${ANSI.RESET}`);
  lines.push(actionLine('PLOT JUMP', vm.actions.plotJump));
  lines.push(actionLine('INITIATE', vm.actions.initiateJump));
  lines.push(actionLine('CANCEL', vm.actions.cancelJump));

  return lines.join('\n');
}

/**
 * Format Observer ViewModel
 * @param {object} vm - Observer ViewModel
 * @returns {string} ANSI-formatted string
 */
function formatObserver(vm) {
  const lines = [];
  const d = vm.derived;

  lines.push(roleHeader('observer', d.statusBadge, d.statusClass));
  lines.push('');
  lines.push(kvLine('Watching', d.watchRoleFormatted));
  lines.push(kvLine('Last Update', d.lastUpdateText));

  lines.push('');
  lines.push(`${ANSI.DIM}Actions:${ANSI.RESET}`);
  lines.push(actionLine('SWITCH ROLE', vm.actions.switchRole));

  return lines.join('\n');
}

// Formatter registry
const formatters = {
  gunner: formatGunner,
  pilot: formatPilot,
  sensors: formatSensors,
  engineer: formatEngineer,
  captain: formatCaptain,
  'damage-control': formatDamageControl,
  astrogator: formatAstrogator,
  observer: formatObserver
};

/**
 * Format any role ViewModel by type
 * @param {object} vm - Any role ViewModel
 * @returns {string} ANSI-formatted string
 */
function formatRole(vm) {
  const formatter = formatters[vm.type];
  if (!formatter) {
    return `${ANSI.RED}Unknown role: ${vm.type}${ANSI.RESET}`;
  }
  return formatter(vm);
}

module.exports = {
  ANSI,
  ROLE_STYLES,
  formatters,
  formatRole,
  formatGunner,
  formatPilot,
  formatSensors,
  formatEngineer,
  formatCaptain,
  formatDamageControl,
  formatAstrogator,
  formatObserver,
  // Helpers
  progressBar,
  roleHeader,
  kvLine,
  actionLine,
  stripAnsi
};
