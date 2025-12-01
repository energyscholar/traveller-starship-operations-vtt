/**
 * WeaponContext - Strategy selector for weapon attacks
 *
 * Manages weapon strategies and dispatches attacks to the appropriate
 * strategy based on weapon type. Provides a unified interface for
 * all weapon operations.
 *
 * @example
 * const ctx = new WeaponContext();
 * const result = ctx.attack({
 *   weapon: { type: 'pulse_laser', damage: '2d6' },
 *   attacker, defender, range, gunnerSkill
 * });
 *
 * @see README.md Architecture Patterns table
 * @see .claude/DESIGN-PATTERN-REFACTOR.md Stage 3
 */

const { LaserStrategy, PulseLaserStrategy, BeamLaserStrategy } = require('./LaserStrategy');
const { MissileStrategy } = require('./MissileStrategy');
const { SandcasterStrategy } = require('./SandcasterStrategy');
const { PointDefenseStrategy } = require('./PointDefenseStrategy');

// Weapon type to strategy mapping
const WEAPON_STRATEGIES = {
  'laser': new LaserStrategy(),
  'pulse_laser': new PulseLaserStrategy(),
  'beam_laser': new BeamLaserStrategy(),
  'missile': new MissileStrategy(),
  'sandcaster': new SandcasterStrategy(),
  'point_defense': new PointDefenseStrategy()
};

// Normalized weapon type aliases
const TYPE_ALIASES = {
  'pulse laser': 'pulse_laser',
  'pulselaser': 'pulse_laser',
  'beam laser': 'beam_laser',
  'beamlaser': 'beam_laser',
  'missiles': 'missile',
  'sandcasters': 'sandcaster',
  'sand': 'sandcaster',
  'pd': 'point_defense',
  'pointdefense': 'point_defense'
};

class WeaponContext {
  constructor() {
    this.strategies = WEAPON_STRATEGIES;
  }

  /**
   * Get strategy for a weapon type
   * @param {string} weaponType - Weapon type identifier
   * @returns {Object} Weapon strategy
   */
  getStrategy(weaponType) {
    const normalizedType = this.normalizeType(weaponType);
    return this.strategies[normalizedType] || this.strategies.laser;
  }

  /**
   * Normalize weapon type string
   * @param {string} weaponType - Raw weapon type
   * @returns {string} Normalized type
   */
  normalizeType(weaponType) {
    if (!weaponType) return 'laser';
    const lower = weaponType.toLowerCase().replace(/[-\s]+/g, '_');
    return TYPE_ALIASES[lower] || lower;
  }

  /**
   * Resolve an attack with appropriate strategy
   * @param {Object} context - Attack context
   * @param {Object} context.weapon - Weapon being used
   * @param {Object} context.attacker - Attacking ship/player
   * @param {Object} context.defender - Target ship/player
   * @param {string} context.range - Current combat range
   * @param {number} [context.gunnerSkill=0] - Gunner skill modifier
   * @returns {Object} Attack result
   */
  attack(context) {
    const { weapon } = context;
    const strategy = this.getStrategy(weapon?.type);
    return strategy.resolve(context);
  }

  /**
   * Resolve a missile launch
   * @param {Object} context - Launch context
   * @returns {Object} Launch result
   */
  launchMissile(context) {
    const strategy = this.strategies.missile;
    return strategy.resolve(context);
  }

  /**
   * Resolve missile impact
   * @param {Object} context - Impact context
   * @returns {Object} Impact result
   */
  resolveMissileImpact(context) {
    const strategy = this.strategies.missile;
    return strategy.resolveImpact(context);
  }

  /**
   * Resolve sandcaster defense
   * @param {Object} context - Defense context
   * @returns {Object} Defense result
   */
  useSandcaster(context) {
    const strategy = this.strategies.sandcaster;
    return strategy.resolve(context);
  }

  /**
   * Resolve point defense against missile
   * @param {Object} context - Defense context
   * @returns {Object} Point defense result
   */
  usePointDefense(context) {
    const strategy = this.strategies.point_defense;
    return strategy.resolve(context);
  }

  /**
   * Check if a weapon can fire at the given range
   * @param {Object} weapon - Weapon to check
   * @param {string} range - Target range
   * @returns {boolean}
   */
  canFireAtRange(weapon, range) {
    const strategy = this.getStrategy(weapon?.type);
    if (typeof strategy.canFireAtRange === 'function') {
      return strategy.canFireAtRange(weapon, range);
    }
    // Default: check via base strategy
    return !weapon?.rangeRestriction ||
           weapon.rangeRestriction.includes(range.toLowerCase());
  }

  /**
   * Check if sandcaster can be used at range
   * @param {string} range - Current range
   * @returns {boolean}
   */
  canUseSandcasterAtRange(range) {
    const strategy = this.strategies.sandcaster;
    return strategy.canUseAtRange(range);
  }

  /**
   * Get all available weapon types
   * @returns {Array<string>}
   */
  getAvailableTypes() {
    return Object.keys(this.strategies);
  }

  /**
   * Get strategy by name (for testing)
   * @param {string} name - Strategy name
   * @returns {Object}
   */
  getStrategyByName(name) {
    return this.strategies[name];
  }
}

// Default singleton instance
const defaultWeaponContext = new WeaponContext();

module.exports = {
  WeaponContext,
  WEAPON_STRATEGIES,
  TYPE_ALIASES,
  defaultWeaponContext
};
