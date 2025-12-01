/**
 * PointDefenseStrategy - Anti-missile defense
 *
 * Uses ship's lasers to intercept incoming missiles.
 * Roll 2d6 + Gunner skill vs 8 to destroy missile.
 *
 * @see BaseWeaponStrategy for interface documentation
 * @see lib/weapons/missiles.js for MissileTracker
 */

const { BaseWeaponStrategy } = require('./BaseWeaponStrategy');

class PointDefenseStrategy extends BaseWeaponStrategy {
  constructor() {
    super('Point Defense');
  }

  /**
   * Resolve point defense against a missile
   * @param {Object} context - Defense context
   * @param {Object} context.missile - Target missile
   * @param {number} context.gunnerSkill - Gunner skill modifier
   * @returns {Object} Point defense result
   */
  resolve(context) {
    const { missile, gunnerSkill = 0 } = context;

    // Validate missile target
    if (!missile) {
      return {
        success: false,
        destroyed: false,
        reason: 'no_missile',
        weapon: this.name
      };
    }

    if (missile.status !== 'tracking') {
      return {
        success: false,
        destroyed: false,
        reason: 'missile_not_active',
        weapon: this.name
      };
    }

    // Point defense attack: 2d6 + Gunner skill vs 8
    const roll = this.dice.roll2d6();
    const total = roll.total + gunnerSkill;
    const hit = total >= 8;
    const effect = hit ? total - 8 : 0;

    if (hit) {
      return {
        success: true,
        destroyed: true,
        roll,
        total,
        effect,
        missileId: missile.id,
        weapon: this.name
      };
    } else {
      return {
        success: true,
        destroyed: false,
        roll,
        total,
        effect: 0,
        missileId: missile.id,
        weapon: this.name
      };
    }
  }
}

module.exports = { PointDefenseStrategy };
