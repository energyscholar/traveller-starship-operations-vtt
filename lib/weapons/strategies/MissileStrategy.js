/**
 * MissileStrategy - Guided munitions with tracking
 *
 * Missiles deal 4d6 damage and get +2 DM at long range.
 * They track targets and can be intercepted by point defense.
 * Limited ammo (12 missiles per rack).
 *
 * @see BaseWeaponStrategy for interface documentation
 * @see lib/weapons/missiles.js for MissileTracker
 */

const { BaseWeaponStrategy } = require('./BaseWeaponStrategy');

// Long ranges where missiles get +2 DM
const LONG_RANGES = ['Long', 'Very Long', 'Distant'];

class MissileStrategy extends BaseWeaponStrategy {
  constructor() {
    super('Missile');
  }

  /**
   * Get missile range bonus
   * @param {string} range - Current range
   * @returns {number} Range bonus (0 or +2)
   */
  getMissileRangeBonus(range) {
    return LONG_RANGES.includes(range) ? 2 : 0;
  }

  /**
   * Check if player has missile ammo
   * @param {Object} attacker - Attacking player
   * @returns {boolean}
   */
  hasAmmo(attacker) {
    return attacker.ammo?.missiles > 0;
  }

  /**
   * Resolve a missile launch
   * Note: Missiles don't resolve immediately - they track targets.
   * This creates a launch result; impact is handled by MissileTracker.
   *
   * @param {Object} context - Attack context
   * @returns {Object} Launch result
   */
  resolve(context) {
    const { attacker, weapon, range } = context;

    // Check ammo
    if (!this.hasAmmo(attacker)) {
      return {
        hit: false,
        damage: 0,
        blocked: true,
        reason: 'No missiles remaining',
        weapon: this.name
      };
    }

    // Missiles always launch successfully (no attack roll)
    // They track towards target and resolve on impact
    const rangeBonus = this.getMissileRangeBonus(range);

    return {
      launched: true,
      tracking: true,
      hit: false, // Not hit yet - tracking
      damage: 0, // Damage resolved on impact
      weapon: this.name,
      rangeBonus,
      ammoUsed: 1,
      note: 'Missile launched, tracking target'
    };
  }

  /**
   * Resolve missile impact (when missile reaches target)
   * @param {Object} context - Impact context
   * @param {Object} context.defender - Target ship
   * @param {Object} [context.sandcasterResult] - If defender used sandcaster
   * @returns {Object} Impact result
   */
  resolveImpact(context) {
    const { defender, sandcasterResult } = context;

    // Missiles auto-hit (no attack roll at impact)
    const armor = defender.armor ?? 0;
    const sandcasterBonus = sandcasterResult?.armorBonus ?? 0;
    const totalArmor = armor + sandcasterBonus;

    // Roll 4d6 damage
    const damageResult = this.rollDamage('4d6', 0, totalArmor);

    return {
      hit: true,
      damage: damageResult.damage,
      damageResult,
      weapon: this.name,
      sandcasterBonus,
      note: 'Missile impact'
    };
  }
}

module.exports = { MissileStrategy, LONG_RANGES };
