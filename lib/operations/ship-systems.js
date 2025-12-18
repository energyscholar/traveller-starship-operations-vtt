/**
 * Ship Systems Module
 * Manages ship system damage, status effects, and repairs for Operations mode
 * Wraps existing critical-hits.js and damage-effects.js for persistence
 */

const { db } = require('./database');
const { getShip, updateShipState } = require('./campaign');
const {
  getTotalSeverity,
  attemptRepair,
  applyCriticalHit
} = require('../critical-hits');
const {
  getMDriveEffects,
  getPowerPlantEffects,
  getSensorsEffects,
  getWeaponEffects,
  getJDriveEffects,
  getComputerEffects,
  getArmourEffects
} = require('../damage-effects');

// All trackable ship systems
const SHIP_SYSTEMS = [
  'sensors',
  'powerPlant',
  'fuel',
  'weapon',
  'armour',
  'hull',
  'mDrive',
  'cargo',
  'jDrive',
  'crew',
  'computer'
];

/**
 * Initialize empty crits structure
 * @returns {Object} Empty crits object with all locations
 */
function initCrits() {
  const crits = {};
  SHIP_SYSTEMS.forEach(system => {
    crits[system] = [];
  });
  return crits;
}

/**
 * Get system statuses for a ship based on accumulated damage
 * @param {Object} ship - Ship object with current_state
 * @returns {Object} Status effects for each system
 */
function getSystemStatuses(ship) {
  const crits = ship.current_state?.crits || {};
  const shipWithCrits = { crits };

  return {
    mDrive: {
      ...getMDriveEffects(getTotalSeverity(shipWithCrits, 'mDrive')),
      totalSeverity: getTotalSeverity(shipWithCrits, 'mDrive'),
      crits: crits.mDrive || []
    },
    powerPlant: {
      ...getPowerPlantEffects(getTotalSeverity(shipWithCrits, 'powerPlant')),
      totalSeverity: getTotalSeverity(shipWithCrits, 'powerPlant'),
      crits: crits.powerPlant || []
    },
    sensors: {
      ...getSensorsEffects(getTotalSeverity(shipWithCrits, 'sensors')),
      totalSeverity: getTotalSeverity(shipWithCrits, 'sensors'),
      crits: crits.sensors || []
    },
    jDrive: {
      ...getJDriveEffects(getTotalSeverity(shipWithCrits, 'jDrive')),
      totalSeverity: getTotalSeverity(shipWithCrits, 'jDrive'),
      crits: crits.jDrive || []
    },
    computer: {
      ...getComputerEffects(getTotalSeverity(shipWithCrits, 'computer')),
      totalSeverity: getTotalSeverity(shipWithCrits, 'computer'),
      crits: crits.computer || []
    },
    armour: {
      ...getArmourEffects(getTotalSeverity(shipWithCrits, 'armour')),
      totalSeverity: getTotalSeverity(shipWithCrits, 'armour'),
      crits: crits.armour || []
    },
    weapon: {
      totalSeverity: getTotalSeverity(shipWithCrits, 'weapon'),
      crits: crits.weapon || []
    },
    fuel: {
      totalSeverity: getTotalSeverity(shipWithCrits, 'fuel'),
      crits: crits.fuel || []
    },
    cargo: {
      totalSeverity: getTotalSeverity(shipWithCrits, 'cargo'),
      crits: crits.cargo || []
    },
    crew: {
      totalSeverity: getTotalSeverity(shipWithCrits, 'crew'),
      crits: crits.crew || []
    },
    hull: {
      totalSeverity: getTotalSeverity(shipWithCrits, 'hull'),
      crits: crits.hull || []
    }
  };
}

/**
 * Get list of damaged systems (any with unrepaired crits)
 * @param {Object} ship - Ship object
 * @returns {Array} Array of system names with damage
 */
function getDamagedSystems(ship) {
  const crits = ship.current_state?.crits || {};
  const damaged = [];

  for (const [system, critList] of Object.entries(crits)) {
    const unrepaired = (critList || []).filter(c => !c.repaired);
    if (unrepaired.length > 0) {
      damaged.push(system);
    }
  }

  return damaged;
}

/**
 * Apply system damage to a ship (GM action or combat import)
 * @param {string} shipId - Ship ID
 * @param {string} location - System location to damage
 * @param {number} severity - Damage severity (1-6)
 * @param {Object} [failureReason] - AR-194: Optional failure reason metadata
 * @returns {Object} Result with updated system status
 */
function applySystemDamage(shipId, location, severity, failureReason = null) {
  const ship = getShip(shipId);
  if (!ship) {
    return { success: false, error: 'Ship not found' };
  }

  if (!SHIP_SYSTEMS.includes(location)) {
    return { success: false, error: `Invalid system: ${location}` };
  }

  if (severity < 1 || severity > 6) {
    return { success: false, error: 'Severity must be 1-6' };
  }

  // Get or initialize crits
  const crits = ship.current_state?.crits || initCrits();

  // Apply the critical hit using existing function
  const shipWithCrits = { crits };
  const result = applyCriticalHit(shipWithCrits, location, severity, failureReason);

  // Persist to database
  updateShipState(shipId, { crits: shipWithCrits.crits });

  // Return result with updated status
  const updatedShip = getShip(shipId);
  return {
    success: true,
    location,
    severity,
    totalSeverity: result.totalSeverity,
    message: result.message,
    failureReason: result.failureReason,
    systemStatus: getSystemStatuses(updatedShip)
  };
}

/**
 * Attempt to repair a damaged system (Engineer action)
 * @param {string} shipId - Ship ID
 * @param {string} location - System to repair
 * @param {number} engineerSkill - Engineer's skill level
 * @returns {Object} Repair result
 */
function repairSystem(shipId, location, engineerSkill) {
  const ship = getShip(shipId);
  if (!ship) {
    return { success: false, error: 'Ship not found' };
  }

  const crits = ship.current_state?.crits;
  if (!crits || !crits[location] || crits[location].length === 0) {
    return { success: false, error: `No damage at ${location}` };
  }

  // Check if there's anything to repair
  const unrepaired = crits[location].filter(c => !c.repaired);
  if (unrepaired.length === 0) {
    return { success: false, error: `${location} already fully repaired` };
  }

  // Use existing repair function
  const shipWithCrits = { crits };
  const result = attemptRepair(shipWithCrits, location, engineerSkill);

  if (result.success) {
    // Persist the repair
    updateShipState(shipId, { crits: shipWithCrits.crits });
  }

  // Return result with updated status
  const updatedShip = getShip(shipId);
  return {
    ...result,
    systemStatus: getSystemStatuses(updatedShip)
  };
}

/**
 * Clear all damage from a system (GM override)
 * @param {string} shipId - Ship ID
 * @param {string} location - System to clear, or 'all' for everything
 * @returns {Object} Result
 */
function clearSystemDamage(shipId, location) {
  const ship = getShip(shipId);
  if (!ship) {
    return { success: false, error: 'Ship not found' };
  }

  let crits = ship.current_state?.crits || initCrits();

  if (location === 'all') {
    crits = initCrits();
  } else if (SHIP_SYSTEMS.includes(location)) {
    crits[location] = [];
  } else {
    return { success: false, error: `Invalid system: ${location}` };
  }

  updateShipState(shipId, { crits });

  const updatedShip = getShip(shipId);
  return {
    success: true,
    cleared: location,
    systemStatus: getSystemStatuses(updatedShip)
  };
}

module.exports = {
  SHIP_SYSTEMS,
  initCrits,
  getSystemStatuses,
  getDamagedSystems,
  applySystemDamage,
  repairSystem,
  clearSystemDamage
};
