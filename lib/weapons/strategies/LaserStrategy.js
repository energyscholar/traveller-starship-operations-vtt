/**
 * LaserStrategy - Direct energy weapon attacks
 *
 * Handles both Pulse Lasers (2d6, all ranges) and Beam Lasers (1d6, limited range).
 * Laser weapons have unlimited ammo but may have range restrictions.
 *
 * @see BaseWeaponStrategy for interface documentation
 */

const { BaseWeaponStrategy } = require('./BaseWeaponStrategy');

class LaserStrategy extends BaseWeaponStrategy {
  constructor() {
    super('Laser');
  }

  /**
   * Resolve a laser attack
   * @param {Object} context - Attack context
   * @returns {Object} Attack result
   */
  resolve(context) {
    const { weapon, range, defender } = context;

    // Check range restriction
    if (!this.canFireAtRange(weapon, range)) {
      return this.createRangeBlockedResult(range, weapon.rangeRestriction);
    }

    // Roll attack
    const attackRoll = this.rollAttack(context);

    if (!attackRoll.hit) {
      return this.createMissResult(attackRoll);
    }

    // Roll damage
    const damageResult = this.rollDamage(
      weapon.damage,
      attackRoll.effect,
      defender.armor ?? 0
    );

    return this.createHitResult(attackRoll, damageResult);
  }
}

/**
 * PulseLaserStrategy - 2d6 damage, all ranges
 */
class PulseLaserStrategy extends LaserStrategy {
  constructor() {
    super();
    this.name = 'Pulse Laser';
  }
}

/**
 * BeamLaserStrategy - 1d6 damage, adjacent/close/medium only
 */
class BeamLaserStrategy extends LaserStrategy {
  constructor() {
    super();
    this.name = 'Beam Laser';
  }
}

module.exports = { LaserStrategy, PulseLaserStrategy, BeamLaserStrategy };
