/**
 * SandcasterStrategy - Defensive countermeasures
 *
 * Sandcasters deploy sand clouds to absorb energy attacks.
 * Used as a reaction to incoming laser fire or missiles.
 * Success adds 1d6 + Effect to armor for that attack.
 *
 * @see BaseWeaponStrategy for interface documentation
 * @see lib/weapons/sandcasters.js for sandcaster functions
 */

const { BaseWeaponStrategy } = require('./BaseWeaponStrategy');

// Sandcasters only work at close ranges
const ALLOWED_RANGES = ['Adjacent', 'Close'];

class SandcasterStrategy extends BaseWeaponStrategy {
  constructor() {
    super('Sandcaster');
  }

  /**
   * Check if sandcaster can be used at current range
   * @param {string} range - Current range
   * @returns {boolean}
   */
  canUseAtRange(range) {
    return ALLOWED_RANGES.includes(range);
  }

  /**
   * Check if player has sandcaster ammo
   * @param {Object} defender - Defending player
   * @returns {boolean}
   */
  hasAmmo(defender) {
    return defender.ammo?.sandcaster > 0 || defender.ammo?.sandcasters > 0;
  }

  /**
   * Resolve sandcaster defense
   * @param {Object} context - Defense context
   * @param {Object} context.defender - Defending player
   * @param {number} context.gunnerSkill - Gunner skill modifier
   * @param {string} context.attackType - 'laser' or 'missile'
   * @returns {Object} Defense result
   */
  resolve(context) {
    const { defender, gunnerSkill = 0, attackType = 'laser' } = context;

    // Check ammo
    if (!this.hasAmmo(defender)) {
      return {
        success: false,
        reason: 'no_ammo',
        armorBonus: 0,
        weapon: this.name
      };
    }

    // Roll skill check: 2d6 + Gunner vs 8
    const roll = this.dice.roll2d6();
    const total = roll.total + gunnerSkill;
    const success = total >= 8;

    if (!success) {
      return {
        success: false,
        reason: 'failed_check',
        roll,
        total,
        armorBonus: 0,
        ammoUsed: 1,
        weapon: this.name
      };
    }

    // Success: 1d6 + Effect armor bonus
    const effect = total - 8;
    const bonusRoll = this.dice.roll(1, 6);
    const armorBonus = bonusRoll.total + effect;

    return {
      success: true,
      roll,
      total,
      effect,
      bonusRoll,
      armorBonus,
      ammoUsed: 1,
      attackType,
      weapon: this.name
    };
  }
}

module.exports = { SandcasterStrategy, ALLOWED_RANGES };
