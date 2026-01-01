/**
 * AR-223: TUI Control Mode System
 *
 * 3-way control: AUTO / CAPTAIN / ROLE
 * Role filtering: ALL (default) or specific role for spotlight
 * Speed settings: INSTANT / FAST / NORMAL / SLOW
 * Fight mode: NORMAL (escape at 75%) or FIGHT_TO_END
 */

const CONTROL_MODES = ['AUTO', 'CAPTAIN', 'ROLE'];

const ROLES = ['ALL', 'captain', 'pilot', 'gunner', 'engineer', 'sensors', 'marines'];

const SPEED_MS = {
  INSTANT: 0,
  FAST: 250,
  NORMAL: 500,
  SLOW: 1000
};

const SPEED_ORDER = ['SLOW', 'NORMAL', 'FAST', 'INSTANT'];

/**
 * Cycle to next control mode
 * @param {string} current - Current mode (AUTO, CAPTAIN, ROLE)
 * @returns {string} Next mode
 */
function cycleControlMode(current) {
  const idx = CONTROL_MODES.indexOf(current);
  if (idx === -1) return 'AUTO';
  return CONTROL_MODES[(idx + 1) % CONTROL_MODES.length];
}

/**
 * Determine if player input needed for this role/action
 *
 * @param {string} mode - Control mode (AUTO, CAPTAIN, ROLE)
 * @param {string} role - Role making the action (captain, gunner, etc.)
 * @param {string} action - Action type (for future use)
 * @param {string} [activeRole='ALL'] - Selected role filter (only in ROLE mode)
 * @returns {boolean} True if player should be prompted
 */
function needsPlayerInput(mode, role, action, activeRole = 'ALL') {
  // AUTO: AI handles everything
  if (mode === 'AUTO') return false;

  // CAPTAIN: Only captain decisions need input
  if (mode === 'CAPTAIN') return role === 'captain';

  // ROLE mode: Check activeRole filter
  if (activeRole === 'ALL') return true;

  // Specific role selected: only that role prompts, others auto
  return role === activeRole;
}

/**
 * Check if role selection menu should be available
 * @param {string} mode - Current control mode
 * @returns {boolean} True if 'r' key should show role menu
 */
function canSelectRole(mode) {
  return mode === 'ROLE';
}

/**
 * Get delay in milliseconds for current speed setting
 * @param {string} speed - Speed setting (INSTANT, FAST, NORMAL, SLOW)
 * @returns {number} Delay in ms
 */
function getSpeedMs(speed) {
  return SPEED_MS[speed] ?? SPEED_MS.NORMAL;
}

/**
 * Cycle speed up or down
 * @param {string} current - Current speed
 * @param {'up'|'down'} direction - Direction to cycle
 * @returns {string} New speed setting
 */
function cycleSpeed(current, direction) {
  const idx = SPEED_ORDER.indexOf(current);
  if (idx === -1) return 'NORMAL';

  if (direction === 'up') {
    return SPEED_ORDER[Math.min(idx + 1, SPEED_ORDER.length - 1)];
  } else {
    return SPEED_ORDER[Math.max(idx - 1, 0)];
  }
}

/**
 * Check if ship should attempt escape based on fight mode
 * @param {Object} params
 * @param {string} params.mode - Fight mode (NORMAL or FIGHT_TO_END)
 * @param {number} params.hull - Current hull points
 * @param {number} params.maxHull - Maximum hull points
 * @returns {boolean} True if escape should be attempted
 */
function checkEscapeCondition({ mode, hull, maxHull }) {
  if (mode === 'FIGHT_TO_END') return false;

  const hullPercent = (hull / maxHull) * 100;
  return hullPercent <= 75;
}

module.exports = {
  CONTROL_MODES,
  ROLES,
  SPEED_MS,
  cycleControlMode,
  needsPlayerInput,
  canSelectRole,
  getSpeedMs,
  cycleSpeed,
  checkEscapeCondition
};
