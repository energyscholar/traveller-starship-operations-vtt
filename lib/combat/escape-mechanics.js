/**
 * AR-223: Escape Mechanics
 *
 * M-Drive escape: Opposed pilot check, needs +3 margin to escape
 * J-Drive escape: Automatic if operational, has power, has fuel
 */

const ESCAPE_MARGIN_REQUIRED = 3;
const MIN_POWER_PERCENT = 20;

/**
 * Check if ship can attempt M-Drive escape
 *
 * @param {Object} ship - Ship state
 * @param {Object} ship.mDrive - M-Drive status { disabled: bool }
 * @param {number} ship.power - Current power
 * @param {number} ship.maxPower - Maximum power
 * @returns {boolean} True if escape attempt allowed
 */
function canAttemptMDriveEscape(ship) {
  // M-Drive must be operational
  if (ship.mDrive?.disabled) return false;

  // Need minimum power
  const powerPercent = (ship.power / ship.maxPower) * 100;
  if (powerPercent < MIN_POWER_PERCENT) return false;

  return true;
}

/**
 * Resolve M-Drive escape attempt (opposed pilot check)
 *
 * @param {Object} params
 * @param {number} params.escaperRoll - Escaping ship's roll (2D6 + Pilot + modifiers)
 * @param {number} params.chaserRoll - Chasing ship's roll
 * @returns {Object} { escaped: bool, margin: number }
 */
function resolveMDriveEscape({ escaperRoll, chaserRoll }) {
  const margin = escaperRoll - chaserRoll;
  const escaped = margin >= ESCAPE_MARGIN_REQUIRED;

  return {
    escaped,
    margin,
    requiredMargin: ESCAPE_MARGIN_REQUIRED
  };
}

/**
 * Check if ship can attempt J-Drive escape
 *
 * @param {Object} ship - Ship state
 * @param {Object} ship.jDrive - J-Drive status { disabled: bool }
 * @param {number} ship.power - Current power
 * @param {number} ship.maxPower - Maximum power
 * @param {number} ship.fuel - Current fuel tons
 * @param {number} ship.fuelPerJump - Fuel required for jump-1
 * @returns {boolean} True if jump escape allowed
 */
function canAttemptJDriveEscape(ship) {
  // J-Drive must be operational
  if (ship.jDrive?.disabled) return false;

  // Need minimum power
  const powerPercent = (ship.power / ship.maxPower) * 100;
  if (powerPercent < MIN_POWER_PERCENT) return false;

  // Need fuel for at least jump-1
  if (ship.fuel < ship.fuelPerJump) return false;

  return true;
}

/**
 * Resolve J-Drive escape (automatic if requirements met)
 *
 * @param {Object} ship - Ship state
 * @returns {Object} { escaped: bool, fuelConsumed?: number, reason?: string }
 */
function resolveJDriveEscape(ship) {
  // Check jDrive
  if (ship.jDrive?.disabled) {
    return { escaped: false, reason: 'jDrive disabled' };
  }

  // Check fuel
  if (ship.fuel < ship.fuelPerJump) {
    return { escaped: false, reason: 'insufficient fuel' };
  }

  // Jump escape is automatic (no roll needed)
  return {
    escaped: true,
    fuelConsumed: ship.fuelPerJump
  };
}

module.exports = {
  ESCAPE_MARGIN_REQUIRED,
  MIN_POWER_PERCENT,
  canAttemptMDriveEscape,
  canAttemptJDriveEscape,
  resolveMDriveEscape,
  resolveJDriveEscape
};
