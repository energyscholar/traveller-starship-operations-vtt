/**
 * CrewFactory - Factory Pattern for crew member creation
 *
 * Creates crew members with validated attributes, consistent defaults,
 * and optional customisation. Supports both space combat and ground combat
 * crew structures.
 *
 * @example
 * const crew = CrewFactory.createSpaceCrew('scout');
 * const customCrew = CrewFactory.createCrewMember('pilot', { name: 'Miller', skill: 2 });
 *
 * @see README.md Architecture Patterns table
 * @see lib/combat/game.js for space combat crew usage
 * @see lib/combat.js for ground combat crew usage
 */

/**
 * Default crew configurations by ship type
 */
const SPACE_CREW_CONFIGS = {
  scout: [
    { id: 'pilot_1', name: 'Miller', role: 'pilot', skill: 2, health: 10, maxHealth: 10 },
    { id: 'gunner_1', name: 'Chen', role: 'gunner', skill: 1, health: 10, maxHealth: 10 },
    { id: 'engineer_1', name: 'Rodriguez', role: 'engineer', skill: 1, health: 10, maxHealth: 10 }
  ],
  free_trader: [
    { id: 'pilot_1', name: 'Johnson', role: 'pilot', skill: 1, health: 10, maxHealth: 10 },
    { id: 'gunner_1', name: 'Smith', role: 'gunner', skill: 1, health: 10, maxHealth: 10 },
    { id: 'gunner_2', name: 'Davis', role: 'gunner', skill: 1, health: 10, maxHealth: 10 },
    { id: 'engineer_1', name: 'Wilson', role: 'engineer', skill: 1, health: 10, maxHealth: 10 }
  ]
};

/**
 * Default stats for ground combat crew
 */
const DEFAULT_STATS = {
  str: 7,
  dex: 7,
  int: 7,
  edu: 7,
  end: 7,
  soc: 7
};

/**
 * Role-specific stat bonuses
 */
const ROLE_STAT_BONUSES = {
  pilot: { dex: 2 },
  engineer: { int: 2 },
  gunner: { dex: 1 }
};

/**
 * Role-specific skill defaults
 */
const ROLE_SKILLS = {
  pilot: { pilot: 2, gunner: 0, engineering: 0, tactics_naval: 0, sensors: 0, marine: 0 },
  engineer: { pilot: 0, gunner: 0, engineering: 2, tactics_naval: 0, sensors: 0, marine: 0 },
  gunner: { pilot: 0, gunner: 2, engineering: 0, tactics_naval: 0, sensors: 0, marine: 0 }
};

class CrewFactory {
  /**
   * Create default space combat crew for a ship type
   * @param {string} shipType - 'scout' or 'free_trader'
   * @param {Object} [overrides] - Optional overrides for crew members
   * @returns {Array} Array of crew members
   */
  static createSpaceCrew(shipType, overrides = {}) {
    const config = SPACE_CREW_CONFIGS[shipType];
    if (!config) {
      return [];
    }

    return config.map(member => ({
      ...member,
      ...overrides[member.id]
    }));
  }

  /**
   * Create a single space combat crew member
   * @param {string} role - 'pilot', 'gunner', or 'engineer'
   * @param {Object} options - Crew member options
   * @param {string} [options.id] - Unique identifier
   * @param {string} [options.name] - Crew member name
   * @param {number} [options.skill=1] - Skill level
   * @param {number} [options.health=10] - Current health
   * @param {number} [options.maxHealth=10] - Maximum health
   * @returns {Object} Crew member object
   */
  static createSpaceCrewMember(role, options = {}) {
    const id = options.id || `${role}_${Date.now()}`;
    return {
      id,
      name: options.name || this._generateName(role),
      role,
      skill: options.skill ?? 1,
      health: options.health ?? 10,
      maxHealth: options.maxHealth ?? 10
    };
  }

  /**
   * Create a ground combat crew member with full stats
   * @param {string} shipType - Ship type for ID prefix
   * @param {string} role - 'pilot', 'engineer', or 'gunner'
   * @param {Object} options - Crew member options
   * @param {number} [options.index=1] - Index for ID generation
   * @param {string} [options.name] - Custom name
   * @param {Object} [options.stats] - Stat overrides
   * @param {Object} [options.skills] - Skill overrides
   * @returns {Object} Ground combat crew member
   */
  static createGroundCrewMember(shipType, role, options = {}) {
    const index = options.index ?? 1;
    const id = `${shipType}_${role}_${index}`;

    // Calculate stats with role bonuses
    const baseStats = { ...DEFAULT_STATS };
    const roleBonus = ROLE_STAT_BONUSES[role] || {};
    const stats = { ...baseStats };
    for (const [stat, bonus] of Object.entries(roleBonus)) {
      stats[stat] = (stats[stat] || 7) + bonus;
    }

    // Apply custom stat overrides
    if (options.stats) {
      Object.assign(stats, options.stats);
    }

    // Get role-specific skills with overrides
    const skills = {
      ...(ROLE_SKILLS[role] || ROLE_SKILLS.gunner),
      ...options.skills
    };

    return {
      id,
      name: options.name || `${role.charAt(0).toUpperCase() + role.slice(1)} ${index}`,
      role,
      stats,
      skills,
      health: options.health ?? 10,
      maxHealth: options.maxHealth ?? 10,
      preferences: {
        defaultTurret: options.defaultTurret ?? null,
        defaultTarget: null
      }
    };
  }

  /**
   * Create full ground combat crew for a ship type
   * @param {string} shipType - 'scout' or 'free_trader'
   * @returns {Array} Array of ground combat crew members
   */
  static createGroundCrew(shipType) {
    const crew = [];
    let idCounter = 1;

    // Create pilot
    crew.push(this.createGroundCrewMember(shipType, 'pilot', { index: idCounter++ }));

    // Create engineer
    crew.push(this.createGroundCrewMember(shipType, 'engineer', { index: idCounter++ }));

    // Create gunners (1 for scout, 2 for free trader)
    const gunnerCount = shipType === 'free_trader' ? 2 : 1;
    for (let i = 0; i < gunnerCount; i++) {
      crew.push(this.createGroundCrewMember(shipType, 'gunner', {
        index: idCounter++,
        name: `Gunner ${i + 1}`,
        defaultTurret: i === 0 ? 'turret1' : 'turret2'
      }));
    }

    return crew;
  }

  /**
   * Generate a random name for a role
   * @param {string} role - Crew role
   * @returns {string} Generated name
   * @private
   */
  static _generateName(role) {
    const names = {
      pilot: ['Miller', 'Chen', 'Johnson', 'Williams', 'Brown'],
      gunner: ['Smith', 'Davis', 'Garcia', 'Martinez', 'Robinson'],
      engineer: ['Rodriguez', 'Wilson', 'Anderson', 'Thomas', 'Taylor']
    };
    const roleNames = names[role] || names.gunner;
    return roleNames[Math.floor(Math.random() * roleNames.length)];
  }

  /**
   * Validate a crew member object
   * @param {Object} crewMember - Crew member to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  static validate(crewMember) {
    const errors = [];

    if (!crewMember.id) errors.push('Missing id');
    if (!crewMember.name) errors.push('Missing name');
    if (!crewMember.role) errors.push('Missing role');
    if (typeof crewMember.health !== 'number') errors.push('Invalid health');
    if (typeof crewMember.maxHealth !== 'number') errors.push('Invalid maxHealth');
    if (crewMember.health > crewMember.maxHealth) errors.push('Health exceeds maxHealth');

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = { CrewFactory, SPACE_CREW_CONFIGS, DEFAULT_STATS, ROLE_STAT_BONUSES, ROLE_SKILLS };
