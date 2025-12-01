/**
 * Factory Pattern Module - Unified exports
 *
 * Provides centralized access to all factory classes for entity creation.
 * Use factories instead of direct object construction for:
 * - Consistent defaults
 * - Validation
 * - Easy testing
 * - Future persistence integration
 *
 * @example
 * const { CrewFactory, ShipFactory, NPCCrewFactory } = require('./lib/factories');
 *
 * const crew = CrewFactory.createSpaceCrew('scout');
 * const ship = ShipFactory.create('free_trader');
 * const npcs = NPCCrewFactory.createForShip(shipId, requirements);
 *
 * @see README.md Architecture Patterns table
 * @see .claude/DESIGN-PATTERN-REFACTOR.md for implementation details
 */

const { CrewFactory, SPACE_CREW_CONFIGS, DEFAULT_STATS, ROLE_STAT_BONUSES, ROLE_SKILLS } = require('./CrewFactory');
const { ShipFactory, SHIP_TEMPLATES, DEFAULT_AMMO } = require('./ShipFactory');
const { NPCCrewFactory, NAME_POOLS, DEFAULT_SKILLS } = require('./NPCCrewFactory');

module.exports = {
  // Factory classes
  CrewFactory,
  ShipFactory,
  NPCCrewFactory,

  // Configuration exports (for testing and extension)
  SPACE_CREW_CONFIGS,
  DEFAULT_STATS,
  ROLE_STAT_BONUSES,
  ROLE_SKILLS,
  SHIP_TEMPLATES,
  DEFAULT_AMMO,
  NAME_POOLS,
  DEFAULT_SKILLS
};
