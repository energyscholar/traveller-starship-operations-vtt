/**
 * ShipFactory - Factory Pattern for space combat ship creation
 *
 * Creates ship instances with validated components, consistent defaults,
 * and optional customisation. All combat ships pass through factory validation.
 *
 * @example
 * const ship = ShipFactory.create('scout');
 * const customShip = ShipFactory.create('free_trader', { hull: 60 });
 * const combatShip = ShipFactory.createCombatShip(socketId, 'scout', crew);
 *
 * @see README.md Architecture Patterns table
 * @see lib/combat.js for SHIPS data
 * @see lib/socket-handlers/space.handlers.js for combat ship usage
 */

const { CrewFactory } = require('./CrewFactory');

/**
 * Default ship configurations
 * Based on Mongoose Traveller 2E High Guard
 */
const SHIP_TEMPLATES = {
  scout: {
    name: 'Scout',
    type: 'Type-S Scout',
    hull: 40,
    maxHull: 40,
    armor: 4,
    pilotSkill: 2,
    movement: 2,
    turrets: 1,
    weapons: [
      {
        id: 'pulseLaser',
        name: 'Pulse Laser',
        damage: '2d6',
        ammo: null,
        rangeRestriction: null
      },
      {
        id: 'missiles',
        name: 'Missiles',
        damage: '4d6',
        ammo: 6,
        longRangeBonus: 2
      }
    ]
  },
  free_trader: {
    name: 'Free Trader',
    type: 'Type-A Free Trader',
    hull: 80,
    maxHull: 80,
    armor: 2,
    pilotSkill: 1,
    movement: 1,
    turrets: 2,
    weapons: [
      {
        id: 'beamLaser',
        name: 'Beam Laser',
        damage: '3d6',
        ammo: null,
        rangeRestriction: ['adjacent', 'close', 'medium']
      },
      {
        id: 'beamLaser',
        name: 'Beam Laser',
        damage: '3d6',
        ammo: null,
        rangeRestriction: ['adjacent', 'close', 'medium']
      }
    ]
  }
};

/**
 * Default ammo counts by weapon type
 */
const DEFAULT_AMMO = {
  missiles: 12,
  sandcasters: 20
};

class ShipFactory {
  /**
   * Create a ship from template
   * @param {string} shipType - 'scout' or 'free_trader'
   * @param {Object} [overrides] - Optional property overrides
   * @returns {Object} Ship object
   */
  static create(shipType, overrides = {}) {
    const template = SHIP_TEMPLATES[shipType];
    if (!template) {
      throw new Error(`Unknown ship type: ${shipType}`);
    }

    return {
      ...template,
      ...overrides,
      // Ensure maxHull stays in sync with hull if hull is overridden
      maxHull: overrides.maxHull ?? overrides.hull ?? template.maxHull
    };
  }

  /**
   * Create a ship configured for combat
   * Includes player ID, crew, ammo tracking, and criticals
   * @param {string} playerId - Socket ID or player identifier
   * @param {string} shipType - 'scout' or 'free_trader'
   * @param {Array} [crew] - Optional pre-generated crew
   * @param {Object} [options] - Additional combat options
   * @returns {Object} Combat-ready ship object
   */
  static createCombatShip(playerId, shipType, crew = null, options = {}) {
    const template = SHIP_TEMPLATES[shipType];
    if (!template) {
      throw new Error(`Unknown ship type: ${shipType}`);
    }

    // Generate crew if not provided
    const shipCrew = crew || CrewFactory.createSpaceCrew(shipType);

    // Initialize ammo tracking
    const ammo = {
      missiles: DEFAULT_AMMO.missiles,
      sandcasters: DEFAULT_AMMO.sandcasters,
      ...options.ammo
    };

    return {
      id: playerId,
      name: template.name,
      ship: shipType,
      hull: template.hull,
      maxHull: template.maxHull,
      armor: template.armor,
      pilotSkill: template.pilotSkill,
      turrets: template.turrets,
      crew: shipCrew,
      criticals: [],
      ammo,
      ...options
    };
  }

  /**
   * Create a ship from JSON template file
   * Used for v2 ship templates from data/ships/v2/
   * @param {Object} templateData - Loaded JSON template
   * @param {Object} [overrides] - Optional property overrides
   * @returns {Object} Ship object with combat-ready properties
   */
  static createFromTemplate(templateData, overrides = {}) {
    return {
      ...templateData,
      hullPoints: templateData.hull?.hullPoints || 40,
      maxHullPoints: templateData.hull?.hullPoints || 40,
      armourRating: templateData.armour?.rating || 0,
      ...overrides
    };
  }

  /**
   * Get available ship types
   * @returns {string[]} Array of ship type identifiers
   */
  static getAvailableTypes() {
    return Object.keys(SHIP_TEMPLATES);
  }

  /**
   * Get ship template data
   * @param {string} shipType - Ship type identifier
   * @returns {Object|null} Ship template or null if not found
   */
  static getTemplate(shipType) {
    return SHIP_TEMPLATES[shipType] || null;
  }

  /**
   * Validate a ship object
   * @param {Object} ship - Ship to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  static validate(ship) {
    const errors = [];

    if (!ship.name) errors.push('Missing name');
    if (typeof ship.hull !== 'number' || ship.hull < 0) errors.push('Invalid hull');
    if (typeof ship.maxHull !== 'number' || ship.maxHull < 0) errors.push('Invalid maxHull');
    if (ship.hull > ship.maxHull) errors.push('Hull exceeds maxHull');
    if (typeof ship.armor !== 'number' || ship.armor < 0) errors.push('Invalid armor');

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = { ShipFactory, SHIP_TEMPLATES, DEFAULT_AMMO };
