/**
 * Weapon Strategy Pattern - Module Exports
 *
 * Provides Strategy Pattern implementation for weapon mechanics.
 * Each weapon type has its own strategy for resolving attacks.
 *
 * @example
 * const { WeaponContext } = require('./strategies');
 * const ctx = new WeaponContext();
 * const result = ctx.attack({ weapon, attacker, defender, range });
 *
 * @see README.md Architecture Patterns table
 * @see .claude/DESIGN-PATTERN-REFACTOR.md Stage 3
 */

// Base strategy
const { BaseWeaponStrategy, RANGE_DM } = require('./BaseWeaponStrategy');

// Concrete strategies
const { LaserStrategy, PulseLaserStrategy, BeamLaserStrategy } = require('./LaserStrategy');
const { MissileStrategy, LONG_RANGES } = require('./MissileStrategy');
const { SandcasterStrategy, ALLOWED_RANGES } = require('./SandcasterStrategy');
const { PointDefenseStrategy } = require('./PointDefenseStrategy');

// Context (strategy selector)
const {
  WeaponContext,
  WEAPON_STRATEGIES,
  TYPE_ALIASES,
  defaultWeaponContext
} = require('./WeaponContext');

module.exports = {
  // Base
  BaseWeaponStrategy,
  RANGE_DM,

  // Laser strategies
  LaserStrategy,
  PulseLaserStrategy,
  BeamLaserStrategy,

  // Missile strategy
  MissileStrategy,
  LONG_RANGES,

  // Defense strategies
  SandcasterStrategy,
  ALLOWED_RANGES,
  PointDefenseStrategy,

  // Context
  WeaponContext,
  WEAPON_STRATEGIES,
  TYPE_ALIASES,
  defaultWeaponContext
};
