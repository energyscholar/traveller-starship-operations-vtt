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

// AR-194: Failure Reason Registry
// Organized by system, each with id, name, description, and flavorText
const FAILURE_REGISTRY = {
  mDrive: [
    { id: 'mdrive-bearing', name: 'Bearing Failure', description: 'Main thrust bearing worn or seized', flavorText: 'A grinding sound echoes through the hull' },
    { id: 'mdrive-plasma', name: 'Plasma Injector Misfire', description: 'Fuel injection timing off, reducing thrust', flavorText: 'The ship lurches unexpectedly' },
    { id: 'mdrive-coolant', name: 'Coolant Leak', description: 'Thermal management compromised', flavorText: 'Warning lights flash across the engineering console' },
    { id: 'mdrive-alignment', name: 'Thrust Vector Misalignment', description: 'Nozzles out of calibration', flavorText: 'The ship drifts slightly off course' }
  ],
  jDrive: [
    { id: 'jdrive-coil', name: 'Jump Coil Degradation', description: 'Hyperspace field generation unstable', flavorText: 'Strange harmonics resonate through the ship' },
    { id: 'jdrive-capacitor', name: 'Capacitor Discharge Failure', description: 'Jump energy storage compromised', flavorText: 'Power readings fluctuate wildly' },
    { id: 'jdrive-field', name: 'Field Containment Weakness', description: 'Jump bubble integrity reduced', flavorText: 'Instruments show worrying readings' }
  ],
  powerPlant: [
    { id: 'power-fuel', name: 'Fuel Flow Restriction', description: 'Fuel lines partially blocked', flavorText: 'Power output drops noticeably' },
    { id: 'power-regulator', name: 'Power Regulator Fault', description: 'Output voltage unstable', flavorText: 'Lights flicker throughout the ship' },
    { id: 'power-cooling', name: 'Reactor Cooling Issue', description: 'Heat buildup in power plant', flavorText: 'Temperature warnings appear' },
    { id: 'power-converter', name: 'Energy Converter Failure', description: 'Power conversion efficiency reduced', flavorText: 'Systems draw more fuel than normal' }
  ],
  sensors: [
    { id: 'sensors-array', name: 'Array Misalignment', description: 'Sensor array calibration lost', flavorText: 'Contacts appear fuzzy on the display' },
    { id: 'sensors-processor', name: 'Signal Processor Fault', description: 'Data processing errors', flavorText: 'Ghost contacts appear and disappear' },
    { id: 'sensors-antenna', name: 'Antenna Damage', description: 'Reception range reduced', flavorText: 'Static crackles across comm channels' }
  ],
  computer: [
    { id: 'computer-memory', name: 'Memory Corruption', description: 'Data storage errors detected', flavorText: 'The computer reports inconsistent readings' },
    { id: 'computer-processor', name: 'Processing Unit Failure', description: 'Computational capacity reduced', flavorText: 'Response times noticeably slower' },
    { id: 'computer-software', name: 'Software Glitch', description: 'Operating system instability', flavorText: 'Unexpected reboots occur randomly' }
  ],
  weapon: [
    { id: 'weapon-targeting', name: 'Targeting System Drift', description: 'Fire control calibration lost', flavorText: 'Targeting solutions take longer to lock' },
    { id: 'weapon-power', name: 'Weapon Power Coupling', description: 'Energy delivery inconsistent', flavorText: 'Weapons charge slowly' },
    { id: 'weapon-mount', name: 'Turret Mount Fault', description: 'Turret traverse impaired', flavorText: 'Weapons move sluggishly' }
  ],
  fuel: [
    { id: 'fuel-leak', name: 'Fuel Line Leak', description: 'Slow fuel loss detected', flavorText: 'The scent of fuel permeates engineering' },
    { id: 'fuel-pump', name: 'Fuel Pump Failure', description: 'Fuel transfer rate reduced', flavorText: 'Fuel gauges show erratic readings' },
    { id: 'fuel-contamination', name: 'Fuel Contamination', description: 'Impurities in fuel supply', flavorText: 'The power plant runs rough' }
  ],
  hull: [
    { id: 'hull-stress', name: 'Stress Fracture', description: 'Micro-cracks in hull plating', flavorText: 'Creaking sounds during maneuvers' },
    { id: 'hull-seal', name: 'Seal Degradation', description: 'Airlock or hatch seals worn', flavorText: 'Pressure readings fluctuate slightly' }
  ],
  cargo: [
    { id: 'cargo-hatch', name: 'Cargo Bay Malfunction', description: 'Loading mechanism fault', flavorText: 'Cargo doors respond slowly' },
    { id: 'cargo-grav', name: 'Cargo Grav Plate Failure', description: 'Gravity in cargo bay unstable', flavorText: 'Items drift in the cargo hold' }
  ],
  crew: [
    { id: 'crew-lifesupport', name: 'Life Support Fluctuation', description: 'Air quality or temperature issues', flavorText: 'The air feels stale and thin' },
    { id: 'crew-gravity', name: 'Gravity Plate Wobble', description: 'Artificial gravity uneven', flavorText: 'Walking feels strange in some areas' }
  ],
  armour: [
    { id: 'armour-ablative', name: 'Ablative Coating Damage', description: 'Protective layer compromised', flavorText: 'Scorch marks visible on hull' },
    { id: 'armour-structural', name: 'Structural Weakness', description: 'Armour integrity reduced', flavorText: 'Hull panels show stress patterns' }
  ]
};

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
 * AR-194: Get a random failure reason for a system
 * @param {string} system - System name
 * @returns {Object|null} Failure reason object or null if no registry entry
 */
function getRandomFailureReason(system) {
  const reasons = FAILURE_REGISTRY[system];
  if (!reasons || reasons.length === 0) {
    return null;
  }
  return reasons[Math.floor(Math.random() * reasons.length)];
}

/**
 * AR-194: Get failure reason by ID
 * @param {string} reasonId - Failure reason ID
 * @returns {Object|null} Failure reason object
 */
function getFailureReasonById(reasonId) {
  for (const system of Object.values(FAILURE_REGISTRY)) {
    const found = system.find(r => r.id === reasonId);
    if (found) return found;
  }
  return null;
}

/**
 * AR-194: Trigger random system failure (GM action)
 * Randomly selects a system and applies severity 1-2 damage with a failure reason
 * @param {string} shipId - Ship ID
 * @param {Object} [options] - Options
 * @param {string} [options.system] - Specific system to fail (random if not specified)
 * @param {number} [options.severity] - Specific severity (1-2 random if not specified)
 * @returns {Object} Result with failure details
 */
function triggerRandomFailure(shipId, options = {}) {
  const ship = getShip(shipId);
  if (!ship) {
    return { success: false, error: 'Ship not found' };
  }

  // Select system (random or specified)
  let system = options.system;
  if (!system) {
    // Weight toward important systems (mDrive, jDrive, powerPlant, sensors)
    const weightedSystems = [
      'mDrive', 'mDrive',
      'jDrive',
      'powerPlant', 'powerPlant',
      'sensors',
      'computer',
      'weapon',
      'fuel',
      'hull',
      'cargo',
      'crew',
      'armour'
    ];
    system = weightedSystems[Math.floor(Math.random() * weightedSystems.length)];
  }

  if (!SHIP_SYSTEMS.includes(system)) {
    return { success: false, error: `Invalid system: ${system}` };
  }

  // Select severity (1-2 for random breakdowns, representing YELLOW status)
  const severity = options.severity || (Math.random() < 0.7 ? 1 : 2);

  // Get failure reason
  const failureReason = getRandomFailureReason(system);

  // Apply the damage
  return applySystemDamage(shipId, system, severity, failureReason);
}

/**
 * AR-194: Get system status level (GREEN, YELLOW, RED)
 * GREEN: No damage
 * YELLOW: Severity 1-2 (minor issues, still operational)
 * RED: Severity 3+ (major issues, significantly impaired)
 * @param {Object} ship - Ship object
 * @param {string} system - System name
 * @returns {string} Status level: 'GREEN', 'YELLOW', or 'RED'
 */
function getSystemStatusLevel(ship, system) {
  const shipWithCrits = { crits: ship.current_state?.crits || {} };
  const severity = getTotalSeverity(shipWithCrits, system);

  if (severity === 0) return 'GREEN';
  if (severity <= 2) return 'YELLOW';
  return 'RED';
}

/**
 * AR-194: Get all system status levels
 * @param {Object} ship - Ship object
 * @returns {Object} Map of system -> status level
 */
function getAllSystemStatusLevels(ship) {
  const levels = {};
  for (const system of SHIP_SYSTEMS) {
    levels[system] = getSystemStatusLevel(ship, system);
  }
  return levels;
}

/**
 * AR-194: Get systems that need attention (YELLOW or RED)
 * @param {Object} ship - Ship object
 * @returns {Array} Array of { system, level, severity, crits }
 */
function getSystemsNeedingAttention(ship) {
  const results = [];
  const shipWithCrits = { crits: ship.current_state?.crits || {} };

  for (const system of SHIP_SYSTEMS) {
    const severity = getTotalSeverity(shipWithCrits, system);
    if (severity > 0) {
      results.push({
        system,
        level: severity <= 2 ? 'YELLOW' : 'RED',
        severity,
        crits: ship.current_state?.crits?.[system] || []
      });
    }
  }

  return results.sort((a, b) => b.severity - a.severity);
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
  FAILURE_REGISTRY,
  initCrits,
  getSystemStatuses,
  getDamagedSystems,
  applySystemDamage,
  repairSystem,
  clearSystemDamage,
  // AR-194: New exports
  getRandomFailureReason,
  getFailureReasonById,
  triggerRandomFailure,
  getSystemStatusLevel,
  getAllSystemStatusLevels,
  getSystemsNeedingAttention
};
