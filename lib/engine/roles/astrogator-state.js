/**
 * AR-250: Astrogator Role State
 *
 * Pure state extraction for astrogator panel.
 * No HTML, no formatting - just structured data.
 *
 * @module lib/engine/roles/astrogator-state
 */

/**
 * Get complete astrogator panel state
 * @param {object} shipState - Current ship state
 * @param {object} template - Ship template data
 * @param {object} jumpStatus - Jump status
 * @param {object} campaign - Campaign data
 * @param {object} systemStatus - System status
 * @returns {object} Pure state object
 */
function getAstrogatorState(shipState, template, jumpStatus, campaign, systemStatus) {
  const jumpRating = template?.jumpRating || 2;
  const tonnage = template?.tonnage || 100;
  const fuelPerParsec = Math.round(tonnage * 0.1);
  const fuelAvailable = shipState?.fuel ?? template?.fuel ?? 40;
  const jDriveDisabled = systemStatus?.jDrive?.disabled || false;

  const jump = getJumpState(jumpStatus, jumpRating, fuelAvailable, fuelPerParsec, jDriveDisabled);
  const navigation = getNavigationState(shipState, campaign);

  return {
    jump,
    navigation,
    fuel: {
      available: fuelAvailable,
      perParsec: fuelPerParsec,
      lowFuel: fuelAvailable < fuelPerParsec
    },
    canJump: !jDriveDisabled && fuelAvailable >= fuelPerParsec && !navigation.needsVerification,
    mode: determineMode(jumpStatus, shipState)
  };
}

/**
 * Get jump drive state
 * @param {object} jumpStatus
 * @param {number} jumpRating
 * @param {number} fuelAvailable
 * @param {number} fuelPerParsec
 * @param {boolean} jDriveDisabled
 * @returns {object}
 */
function getJumpState(jumpStatus, jumpRating, fuelAvailable, fuelPerParsec, jDriveDisabled) {
  const maxJumpWithFuel = Math.min(jumpRating, Math.floor(fuelAvailable / fuelPerParsec));
  const inJump = jumpStatus?.inJump || false;

  return {
    rating: jumpRating,
    maxWithFuel: maxJumpWithFuel,
    fuelLimited: maxJumpWithFuel < jumpRating,
    driveDisabled: jDriveDisabled,
    driveOperational: !jDriveDisabled,
    inJump,
    destination: jumpStatus?.destination || null,
    distance: jumpStatus?.jumpDistance || null,
    endDate: jumpStatus?.jumpEndDate || null,
    hoursRemaining: jumpStatus?.hoursRemaining || null,
    canExit: jumpStatus?.canExit || false,
    jumpRanges: getJumpRanges(jumpRating, maxJumpWithFuel)
  };
}

/**
 * Get available jump range options
 * @param {number} jumpRating
 * @param {number} maxWithFuel
 * @returns {array}
 */
function getJumpRanges(jumpRating, maxWithFuel) {
  const ranges = [];
  for (let i = 1; i <= jumpRating; i++) {
    ranges.push({
      distance: i,
      reachable: i <= maxWithFuel,
      needsFuel: i > maxWithFuel
    });
  }
  return ranges;
}

/**
 * Get navigation state
 * @param {object} shipState
 * @param {object} campaign
 * @returns {object}
 */
function getNavigationState(shipState, campaign) {
  const hasSectorData = !!(campaign?.current_sector && campaign?.current_hex);

  return {
    currentSystem: campaign?.current_system || null,
    sector: campaign?.current_sector || null,
    hex: campaign?.current_hex || null,
    hasSectorData,
    locationDisplay: campaign?.current_system ||
      (hasSectorData ? `${campaign.current_sector} ${campaign.current_hex}` : 'Unknown'),
    needsVerification: shipState?.positionVerified === false,
    positionVerified: shipState?.positionVerified !== false
  };
}

/**
 * Determine current astrogator mode
 * @param {object} jumpStatus
 * @param {object} shipState
 * @returns {string} 'inJump', 'needsVerification', or 'ready'
 */
function determineMode(jumpStatus, shipState) {
  if (jumpStatus?.inJump) return 'inJump';
  if (shipState?.positionVerified === false) return 'needsVerification';
  return 'ready';
}

/**
 * Calculate jump fuel cost
 * @param {number} tonnage - Ship tonnage
 * @param {number} distance - Jump distance in parsecs
 * @returns {number} Fuel required in tons
 */
function calculateJumpFuel(tonnage, distance) {
  const fuelPerParsec = Math.round(tonnage * 0.1);
  return fuelPerParsec * distance;
}

/**
 * Check if jump is possible
 * @param {object} state - From getAstrogatorState
 * @param {number} distance - Desired jump distance
 * @returns {object} { possible, reason }
 */
function canExecuteJump(state, distance) {
  if (state.mode === 'inJump') {
    return { possible: false, reason: 'Already in jump space' };
  }
  if (state.mode === 'needsVerification') {
    return { possible: false, reason: 'Position verification required' };
  }
  if (state.jump.driveDisabled) {
    return { possible: false, reason: 'Jump drive disabled' };
  }
  if (distance > state.jump.rating) {
    return { possible: false, reason: `Exceeds jump rating (J-${state.jump.rating})` };
  }
  if (distance > state.jump.maxWithFuel) {
    return { possible: false, reason: 'Insufficient fuel' };
  }
  return { possible: true, reason: null };
}

module.exports = {
  getAstrogatorState,
  getJumpState,
  getJumpRanges,
  getNavigationState,
  determineMode,
  calculateJumpFuel,
  canExecuteJump
};
