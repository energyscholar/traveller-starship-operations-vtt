/**
 * Sandcaster Mechanics - Traveller 2e
 *
 * Stage 11: Sandcaster reactions and missile defense
 *
 * Rules:
 * - Sandcasters are defensive weapons (reaction)
 * - Used against incoming laser attacks or missiles
 * - Gunner makes skill check: 2D6 + Gunner skill vs 8
 * - Success: Add 1D + Effect to armor for that attack
 * - 20 canisters of sand per sandcaster
 * - Range: Adjacent or Close only
 * - Can also be used for anti-personnel (8D damage, personal scale)
 */

const { DiceRoller } = require('../dice');
const dice = new DiceRoller();

/**
 * Attempt to use sandcaster against incoming attack
 * @param {Object} params - Sandcaster parameters
 * @param {number} params.gunnerSkill - Gunner skill level
 * @param {string} params.attackType - 'laser' or 'missile'
 * @param {number} params.ammoRemaining - Canisters remaining
 * @returns {Object} Sandcaster result
 */
function useSandcaster({ gunnerSkill = 0, attackType, ammoRemaining }) {
  // Check ammo
  if (ammoRemaining <= 0) {
    return {
      success: false,
      reason: 'no_ammo',
      armorBonus: 0
    };
  }

  // Gunner skill check: 2D6 + skill vs 8
  const roll = dice.roll2d6();
  const total = roll.total + gunnerSkill;
  const success = total >= 8;

  if (!success) {
    return {
      success: false,
      reason: 'failed_check',
      roll: roll,
      total: total,
      armorBonus: 0,
      ammoUsed: 1 // Sand is consumed even on failure
    };
  }

  // Success: Calculate armor bonus
  const effect = total - 8;
  const bonusDie = dice.roll(1, 6)[0];
  const armorBonus = bonusDie + effect;

  return {
    success: true,
    roll: roll,
    total: total,
    effect: effect,
    bonusDie: bonusDie,
    armorBonus: armorBonus,
    ammoUsed: 1,
    attackType: attackType
  };
}

/**
 * Check if sandcaster can be used at current range
 * Sandcasters only work at adjacent or close range
 */
function canUseSandcaster(range) {
  return range === 'adjacent' || range === 'close';
}

/**
 * Sandcaster vs missile interception
 * Special case: Sandcaster can intercept missiles
 * @param {Object} params - Interception parameters
 * @param {number} params.gunnerSkill - Gunner skill level
 * @param {number} params.ammoRemaining - Canisters remaining
 * @returns {Object} Interception result
 */
function interceptMissile({ gunnerSkill = 0, ammoRemaining }) {
  if (ammoRemaining <= 0) {
    return {
      success: false,
      intercepted: false,
      reason: 'no_ammo'
    };
  }

  // Interception check: 2D6 + Gunner skill vs 8
  const roll = dice.roll2d6();
  const total = roll.total + gunnerSkill;
  const intercepted = total >= 8;

  return {
    success: true,
    intercepted: intercepted,
    roll: roll,
    total: total,
    ammoUsed: 1
  };
}

/**
 * Anti-personnel mode (not implemented in Stage 11, placeholder)
 * Sandcasters can fire sand clouds at personnel (8D damage, personal scale)
 */
function antiPersonnelMode({ gunnerSkill = 0, ammoRemaining }) {
  // Not implemented in Stage 11 (ship combat only)
  // Would be used for boarding actions (Stage 13)
  return {
    success: false,
    reason: 'not_implemented',
    note: 'Anti-personnel mode available in Stage 13 (Boarding Actions)'
  };
}

module.exports = {
  useSandcaster,
  canUseSandcaster,
  interceptMissile,
  antiPersonnelMode
};
