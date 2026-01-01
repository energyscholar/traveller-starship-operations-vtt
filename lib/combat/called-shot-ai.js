/**
 * AR-223: Called Shot AI
 *
 * AI logic for selecting called shot targets based on tactical situation:
 * - Defender must be below 50% hull
 * - Ion weapons cannot use called shots (power drain only)
 * - Priority: jDrive (escape) > powerPlant (knockout) > mDrive (mobility)
 */

const CALLED_SHOT_PENALTIES = {
  jDrive: -4,
  powerPlant: -4,
  mDrive: -2,
  sensors: -2,
  bridge: -6,
  fuel: -2,
  cargo: -1,
  turret: -2
};

/**
 * Priority list for called shot targeting
 * Each entry has a condition function that determines when to target
 */
const CALLED_SHOT_PRIORITY = [
  {
    system: 'jDrive',
    condition: (ctx) => ctx.defenderAttemptingEscape === true
  },
  {
    system: 'powerPlant',
    condition: (ctx) => {
      if (!ctx.defenderPower || !ctx.defenderMaxPower) return false;
      return ctx.defenderPower < ctx.defenderMaxPower * 0.3;
    }
  },
  {
    system: 'mDrive',
    condition: (ctx) => {
      // Default fallback when damaged enough
      return ctx.defenderHull < ctx.defenderMaxHull * 0.5;
    }
  },
  {
    system: 'sensors',
    condition: () => Math.random() < 0.1  // 10% random chance
  }
];

/**
 * Select optimal called shot target based on tactical situation
 *
 * @param {Object} ctx - Combat context
 * @param {string} [ctx.weaponType] - Weapon type ('ion' disables called shots)
 * @param {number} ctx.defenderHull - Current hull points
 * @param {number} ctx.defenderMaxHull - Maximum hull points
 * @param {boolean} [ctx.defenderAttemptingEscape] - Is defender trying to escape
 * @param {number} [ctx.defenderPower] - Current power
 * @param {number} [ctx.defenderMaxPower] - Maximum power
 * @param {Object} [ctx.defenderSystems] - System status { system: { disabled: bool } }
 * @returns {string|null} Target system or null if no called shot
 */
function selectCalledShotTarget(ctx) {
  // Ion weapons drain power, not physical damage - no called shots
  if (ctx.weaponType === 'ion') return null;

  // Only use called shots when defender is damaged (<50% hull)
  if (ctx.defenderHull >= ctx.defenderMaxHull * 0.5) return null;

  // Need system status to target
  if (!ctx.defenderSystems) return null;

  // Check priority list
  for (const { system, condition } of CALLED_SHOT_PRIORITY) {
    // Skip disabled systems
    if (ctx.defenderSystems[system]?.disabled) continue;

    // Skip if system doesn't exist
    if (!ctx.defenderSystems[system]) continue;

    // Check if condition is met
    if (condition(ctx)) {
      return system;
    }
  }

  return null;
}

/**
 * Get DM penalty for called shot to specific system
 *
 * @param {string} system - Target system
 * @returns {number} DM penalty (negative)
 */
function getCalledShotPenalty(system) {
  return CALLED_SHOT_PENALTIES[system] ?? -2;
}

module.exports = {
  CALLED_SHOT_PENALTIES,
  CALLED_SHOT_PRIORITY,
  selectCalledShotTarget,
  getCalledShotPenalty
};
