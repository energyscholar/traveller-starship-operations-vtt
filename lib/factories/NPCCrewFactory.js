/**
 * NPCCrewFactory - Factory Pattern for Operations mode NPC crew generation
 *
 * Creates NPC crew members for ship operations with database-compatible
 * structure, random name generation, and role-based skill defaults.
 *
 * @example
 * const crew = NPCCrewFactory.createForShip(shipId, crewRequirements);
 * const npc = NPCCrewFactory.createNPC(shipId, 'pilot', { name: 'Custom Name' });
 *
 * @see README.md Architecture Patterns table
 * @see lib/operations/seed-ships.js for Operations mode usage
 * @see lib/operations/database.js for database schema
 */

/**
 * Name pools for different crew roles
 */
const NAME_POOLS = {
  pilot: ['Miller', 'Chen', 'Rodriguez', 'Williams', 'Brown', 'Nakamura', 'Okonkwo', 'Petrov'],
  astrogator: ['Navigation Officer', 'Stellar', 'Course', 'Waypoint', 'Vector'],
  engineer: ['Chief Engineer', 'Wilson', 'Thompson', 'Kowalski', 'Garcia', 'Singh'],
  gunner: ['Gunner One', 'Gunner Two', 'Gunner Three', 'Gunner Four', 'Torres', 'Kim'],
  steward: ['Chief Steward', 'Porter', 'Service', 'Adams', 'Liu'],
  medic: ['Ship\'s Doctor', 'Medical Officer', 'Dr. Park', 'Dr. Okafor'],
  marines: ['Sergeant', 'Corporal', 'Private', 'Lance Corporal'],
  captain: ['Captain', 'Commander', 'Skipper'],
  sensor_operator: ['Sensors', 'Scanner', 'Tech']
};

/**
 * Default skill levels by role
 */
const DEFAULT_SKILLS = {
  pilot: 1,
  astrogator: 1,
  engineer: 1,
  gunner: 0,
  steward: 0,
  medic: 1,
  marines: 0,
  captain: 2,
  sensor_operator: 1
};

class NPCCrewFactory {
  /**
   * Create NPC crew for a ship based on crew requirements
   * @param {string} shipId - Ship database ID
   * @param {Object} crewRequirements - Crew requirements from ship template
   * @param {Object} [crewRequirements.minimum] - Minimum crew by role
   * @param {Function} [idGenerator] - Optional ID generator function
   * @returns {Array} Array of NPC crew objects
   */
  static createForShip(shipId, crewRequirements, idGenerator = null) {
    const crew = [];
    const minCrew = crewRequirements.minimum || {};
    const generateId = idGenerator || (() => `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    for (const [role, count] of Object.entries(minCrew)) {
      for (let i = 0; i < count; i++) {
        crew.push(this.createNPC(shipId, role, {
          id: generateId(),
          index: i,
          totalInRole: count
        }));
      }
    }

    return crew;
  }

  /**
   * Create a single NPC crew member
   * @param {string} shipId - Ship database ID
   * @param {string} role - Crew role (pilot, engineer, gunner, etc.)
   * @param {Object} [options] - Optional overrides
   * @param {string} [options.id] - Custom ID
   * @param {string} [options.name] - Custom name
   * @param {number} [options.skill_level] - Custom skill level
   * @param {string} [options.personality] - Personality traits
   * @param {number} [options.index=0] - Index for name generation
   * @param {number} [options.totalInRole=1] - Total in this role for name suffix
   * @returns {Object} NPC crew member object
   */
  static createNPC(shipId, role, options = {}) {
    const index = options.index ?? 0;
    const totalInRole = options.totalInRole ?? 1;
    const roleNames = NAME_POOLS[role] || NAME_POOLS.gunner;

    // Generate name with suffix if multiple in same role
    let name = options.name;
    if (!name) {
      const baseName = roleNames[index % roleNames.length];
      name = totalInRole > 1 && index >= roleNames.length
        ? `${baseName} ${index + 1}`
        : baseName;
    }

    return {
      id: options.id || `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ship_id: shipId,
      name,
      role,
      skill_level: options.skill_level ?? DEFAULT_SKILLS[role] ?? 0,
      personality: options.personality ?? null,
      is_ai: options.is_ai ?? 0
    };
  }

  /**
   * Create a random NPC with random role
   * Useful for generating background crew
   * @param {string} shipId - Ship database ID
   * @param {Object} [options] - Optional overrides
   * @returns {Object} NPC crew member object
   */
  static createRandomNPC(shipId, options = {}) {
    const roles = Object.keys(NAME_POOLS);
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    return this.createNPC(shipId, randomRole, options);
  }

  /**
   * Get available crew roles
   * @returns {string[]} Array of role identifiers
   */
  static getAvailableRoles() {
    return Object.keys(NAME_POOLS);
  }

  /**
   * Get name pool for a role
   * @param {string} role - Crew role
   * @returns {string[]} Array of names for the role
   */
  static getNamePool(role) {
    return NAME_POOLS[role] || NAME_POOLS.gunner;
  }

  /**
   * Validate an NPC crew member object
   * @param {Object} npc - NPC to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  static validate(npc) {
    const errors = [];

    if (!npc.id) errors.push('Missing id');
    if (!npc.ship_id) errors.push('Missing ship_id');
    if (!npc.name) errors.push('Missing name');
    if (!npc.role) errors.push('Missing role');
    if (typeof npc.skill_level !== 'number') errors.push('Invalid skill_level');

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = { NPCCrewFactory, NAME_POOLS, DEFAULT_SKILLS };
