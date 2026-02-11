/**
 * BaseWeaponStrategy - Abstract base class for weapon attack strategies
 *
 * Defines the interface for all weapon strategies. Concrete strategies
 * implement resolve() to handle attack resolution for specific weapon types.
 *
 * @example
 * class LaserStrategy extends BaseWeaponStrategy {
 *   resolve(context) {
 *     return this.rollAttack(context);
 *   }
 * }
 *
 * @see README.md Architecture Patterns table
 * @see .claude/DESIGN-PATTERN-REFACTOR.md Stage 3
 */

const { DiceRoller } = require('../../dice');

// Range bands with DM modifiers
const RANGE_DM = {
  'Adjacent': 0,
  'Close': 0,
  'Short': 1,
  'Medium': 0,
  'Long': -2,
  'Very Long': -4,
  'Distant': -6
};

class BaseWeaponStrategy {
  /**
   * @param {string} name - Weapon type name for logging
   */
  constructor(name = 'Base') {
    this.name = name;
    this.dice = new DiceRoller();
  }

  /**
   * Resolve an attack with this weapon
   * @abstract
   * @param {Object} context - Attack context
   * @param {Object} context.attacker - Attacking ship/player
   * @param {Object} context.defender - Target ship/player
   * @param {Object} context.weapon - Weapon being used
   * @param {string} context.range - Current combat range
   * @param {number} context.gunnerSkill - Gunner skill modifier
   * @param {number} [context.dodgeDM=0] - Defender's dodge modifier
   * @returns {Object} Attack result
   */
  resolve(context) {
    throw new Error('WeaponStrategy.resolve() must be implemented by subclass');
  }

  /**
   * Check if weapon can fire at current range
   * @param {Object} weapon - Weapon definition
   * @param {string} range - Current range
   * @returns {boolean}
   */
  canFireAtRange(weapon, range) {
    if (!weapon.rangeRestriction) return true;
    return weapon.rangeRestriction.includes(range.toLowerCase());
  }

  /**
   * Get range modifier for attack roll
   * @param {string} range - Range band name
   * @returns {number} Range DM
   */
  getRangeDM(range) {
    return RANGE_DM[range] ?? 0;
  }

  /**
   * Roll attack dice (2d6 + modifiers vs 8)
   * @param {Object} context - Attack context
   * @returns {Object} Roll result
   */
  rollAttack(context) {
    const { gunnerSkill = 0, range, dodgeDM = 0 } = context;
    const roll = this.dice.roll2d6();
    const rangeDM = this.getRangeDM(range);

    const total = roll.total + gunnerSkill + rangeDM - dodgeDM;
    const hit = total >= 8;
    const effect = hit ? total - 8 : 0;

    return {
      roll,
      total,
      hit,
      effect,
      modifiers: {
        gunnerSkill,
        rangeDM,
        dodgeDM
      }
    };
  }

  /**
   * Roll damage dice based on weapon formula
   * @param {string} damageFormula - e.g., '2d6', '3d6', '4d6'
   * @param {number} effect - Attack effect (added to damage)
   * @param {number} armor - Defender's armor
   * @returns {Object} Damage result
   */
  rollDamage(damageFormula, effect = 0, armor = 0) {
    // Parse damage formula (e.g., '2d6' -> { count: 2, sides: 6 })
    const match = damageFormula.match(/(\d+)d(\d+)/i);
    if (!match) {
      return { damage: 0, roll: null, breakdown: 'Invalid formula' };
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const roll = this.dice.roll(count, sides);

    const rawDamage = roll.total + effect;
    const afterArmor = Math.max(0, rawDamage - armor);
    const damageMultiple = this.damageMultiple || 1;
    const damage = afterArmor * damageMultiple;

    return {
      damage,
      roll,
      rawDamage,
      effect,
      armor,
      damageMultiple,
      breakdown: `${roll.total} + ${effect} (effect) - ${armor} (armor)${damageMultiple > 1 ? ' ×' + damageMultiple : ''} = ${damage}`
    };
  }

  /**
   * Create a miss result
   * @param {Object} attackRoll - Attack roll result
   * @returns {Object} Miss result
   */
  createMissResult(attackRoll) {
    return {
      hit: false,
      damage: 0,
      attackRoll,
      weapon: this.name
    };
  }

  /**
   * Create a hit result
   * @param {Object} attackRoll - Attack roll result
   * @param {Object} damageResult - Damage roll result
   * @returns {Object} Hit result
   */
  createHitResult(attackRoll, damageResult) {
    return {
      hit: true,
      damage: damageResult.damage,
      attackRoll,
      damageResult,
      weapon: this.name
    };
  }

  /**
   * Create a range-blocked result
   * @param {string} range - Current range
   * @param {Array} allowedRanges - Allowed range bands
   * @returns {Object} Blocked result
   */
  createRangeBlockedResult(range, allowedRanges) {
    return {
      hit: false,
      damage: 0,
      blocked: true,
      reason: `${this.name} cannot fire at ${range} range`,
      allowedRanges,
      weapon: this.name
    };
  }
}

module.exports = { BaseWeaponStrategy, RANGE_DM };
