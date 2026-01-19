/**
 * BATCH 3.B: Combat Captain AI
 *
 * Tactical decision-making for enemy ship captains.
 * Determines whether a ship should fight, flee, or surrender based on:
 * - Hull integrity
 * - Power levels
 * - Fleet strength comparison (odds)
 * - Ship-specific flee thresholds
 */

// Default thresholds
const DEFAULT_FLEE_THRESHOLD = 0.3;      // 30% hull
const POWER_FLEE_THRESHOLD = 0.2;        // 20% power
const SURRENDER_ODDS_THRESHOLD = 0.2;    // <20% odds
const SURRENDER_HULL_THRESHOLD = 0.5;    // <50% hull (combined with bad odds)
const FLEE_ODDS_THRESHOLD = 0.3;         // <30% odds

/**
 * Captain decision each combat round
 *
 * @param {Object} shipState - Current ship state
 * @param {number} shipState.hull - Current hull points
 * @param {number} shipState.maxHull - Maximum hull points
 * @param {number} [shipState.power] - Current power
 * @param {number} [shipState.maxPower] - Maximum power
 * @param {number} [shipState.fleeThreshold] - Custom flee threshold (0-1), default 0.3
 * @param {Object} battleState - Overall battle state
 * @param {Array} battleState.friendlyFleet - Ships on this ship's side
 * @param {Array} battleState.enemyFleet - Opposing ships
 * @returns {string} 'fight' | 'flee' | 'surrender'
 */
function captainDecision(shipState, battleState) {
  // Calculate hull percentage (default to 0 if maxHull is 0 to avoid NaN)
  const hullPercent = shipState.maxHull > 0
    ? shipState.hull / shipState.maxHull
    : 0;

  // Calculate power percentage (default to 100% if not provided)
  const powerPercent = (shipState.power !== undefined && shipState.maxPower)
    ? shipState.power / shipState.maxPower
    : 1.0;

  // Get flee threshold (custom or default)
  const fleeThreshold = shipState.fleeThreshold ?? DEFAULT_FLEE_THRESHOLD;

  // Calculate fleet strength odds
  const friendlyStrength = calculateFleetStrength(battleState.friendlyFleet);
  const enemyStrength = calculateFleetStrength(battleState.enemyFleet);
  const totalStrength = friendlyStrength + enemyStrength;
  const odds = totalStrength > 0 ? friendlyStrength / totalStrength : 0.5;

  // Decision logic:
  // 1. Flee if hull below threshold or power critically low
  if (hullPercent < fleeThreshold || powerPercent < POWER_FLEE_THRESHOLD) {
    return 'flee';
  }

  // 2. Surrender if odds are terrible AND already damaged
  if (odds < SURRENDER_ODDS_THRESHOLD && hullPercent < SURRENDER_HULL_THRESHOLD) {
    return 'surrender';
  }

  // 3. Flee if odds are bad
  if (odds < FLEE_ODDS_THRESHOLD) {
    return 'flee';
  }

  // 4. Otherwise, fight
  return 'fight';
}

/**
 * Calculate combined fleet strength
 *
 * Weights by hull integrity, weapon count, and thrust capability.
 * Destroyed ships contribute zero strength.
 *
 * @param {Array} fleet - Array of ship objects
 * @param {number} fleet[].hull - Current hull points
 * @param {number} fleet[].maxHull - Maximum hull points
 * @param {boolean} [fleet[].destroyed] - Is ship destroyed
 * @param {Array} [fleet[].turrets] - Ship turrets/weapons
 * @param {number} [fleet[].thrust] - Ship thrust rating
 * @returns {number} Combined fleet strength
 */
function calculateFleetStrength(fleet) {
  if (!fleet || !Array.isArray(fleet)) return 0;

  return fleet.reduce((sum, ship) => {
    // Skip destroyed ships
    if (ship.destroyed) return sum;

    // Calculate hull factor (0-1)
    const hullFactor = (ship.maxHull > 0)
      ? ship.hull / ship.maxHull
      : 0;

    // Count weapons (turrets)
    const weaponCount = Array.isArray(ship.turrets) ? ship.turrets.length : 0;

    // Weapon multiplier: each weapon adds 20% effectiveness
    const weaponMultiplier = 1 + weaponCount * 0.2;

    // Thrust factor (default to 1 if not specified)
    const thrustFactor = ship.thrust || 1;

    // Ship strength = hull% * weapon multiplier * thrust
    const shipStrength = hullFactor * weaponMultiplier * thrustFactor;

    return sum + shipStrength;
  }, 0);
}

module.exports = {
  captainDecision,
  calculateFleetStrength,
  // Export thresholds for testing
  DEFAULT_FLEE_THRESHOLD,
  POWER_FLEE_THRESHOLD,
  SURRENDER_ODDS_THRESHOLD,
  SURRENDER_HULL_THRESHOLD,
  FLEE_ODDS_THRESHOLD
};
