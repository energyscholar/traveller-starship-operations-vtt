// Stage 10: Critical Hit System
// Mongoose Traveller 2e - Critical Hits and Severity

const { DiceRoller } = require('./dice');

/**
 * Calculate severity of a critical hit
 * @param {number} damage - Damage dealt by the attack
 * @returns {number} Severity (1-6, capped)
 */
function calculateSeverity(damage) {
  if (damage <= 0) return 0;
  const severity = Math.ceil(damage / 10);
  return Math.min(severity, 6); // Cap at severity 6
}

/**
 * Roll for critical hit location
 * @returns {string} Location name
 */
function rollCriticalLocation() {
  const dice = new DiceRoller();
  const roll = dice.roll2d6().total;

  const locations = {
    2: 'sensors',
    3: 'powerPlant',
    4: 'fuel',
    5: 'weapon',
    6: 'armour',
    7: 'hull',
    8: 'mDrive',
    9: 'cargo',
    10: 'jDrive',
    11: 'crew',
    12: 'computer'
  };

  return locations[roll];
}

/**
 * Check if attack triggers critical hit
 * Rules: Effect ≥6 AND damage > 0
 * @param {number} effect - Attack effect
 * @param {number} damage - Damage dealt
 * @returns {boolean}
 */
function triggersCriticalHit(effect, damage) {
  return effect >= 6 && damage > 0;
}

/**
 * Check if ship should suffer sustained damage crit
 * Rules: Ship suffers Severity 1 crit every 10% hull lost
 * @param {number} currentHull - Current hull points
 * @param {number} maxHull - Maximum hull points
 * @param {number} previousHull - Hull before this attack
 * @returns {boolean}
 */
function triggersSustainedDamage(currentHull, maxHull, previousHull) {
  const threshold = maxHull * 0.1;

  // Calculate how many 10% chunks have been lost
  const hullLost = maxHull - currentHull;
  const previousHullLost = maxHull - previousHull;

  const currentThresholds = Math.floor(hullLost / threshold);
  const previousThresholds = Math.floor(previousHullLost / threshold);

  return currentThresholds > previousThresholds;
}

/**
 * Apply a critical hit to a ship
 * @param {object} ship - Ship state object
 * @param {string} location - Hit location
 * @param {number} severity - Severity (1-6)
 * @returns {object} Critical hit details
 */
function applyCriticalHit(ship, location, severity) {
  // Initialize crits tracking if not present
  if (!ship.crits) {
    ship.crits = {
      sensors: [],
      powerPlant: [],
      fuel: [],
      weapon: [],
      armour: [],
      hull: [],
      mDrive: [],
      cargo: [],
      jDrive: [],
      crew: [],
      computer: []
    };
  }

  // Ensure the location array exists
  if (!ship.crits[location]) {
    ship.crits[location] = [];
  }

  // Add the crit to the location's array
  ship.crits[location].push({
    severity,
    repaired: false,
    timestamp: Date.now()
  });

  // Calculate total severity for this location (sum of all unrepaired crits)
  const totalSeverity = ship.crits[location]
    .filter(c => !c.repaired)
    .reduce((sum, c) => sum + c.severity, 0);

  return {
    location,
    severity,
    totalSeverity,
    message: `Critical Hit! ${location} (Severity ${severity})`
  };
}

/**
 * Get total active severity for a location
 * @param {object} ship - Ship state object
 * @param {string} location - Location name
 * @returns {number} Total active severity
 */
function getTotalSeverity(ship, location) {
  if (!ship.crits || !ship.crits[location]) return 0;

  return ship.crits[location]
    .filter(c => !c.repaired)
    .reduce((sum, c) => sum + c.severity, 0);
}

/**
 * Attempt to repair a critical hit
 * Engineer check (Average 8+) with DM = -Severity
 * @param {object} ship - Ship state object
 * @param {string} location - Location to repair
 * @param {number} engineerSkill - Engineer skill level
 * @returns {object} Repair result
 */
function attemptRepair(ship, location, engineerSkill) {
  const dice = new DiceRoller();

  // Find the worst unrepaired crit at this location
  const unrepaired = ship.crits[location]
    .filter(c => !c.repaired)
    .sort((a, b) => b.severity - a.severity);

  if (unrepaired.length === 0) {
    return {
      success: false,
      message: `No damage at ${location} to repair`,
      roll: null
    };
  }

  const targetCrit = unrepaired[0];
  const targetNumber = 8;
  const dm = -targetCrit.severity;

  const roll = dice.roll2d6();
  const total = roll.total + engineerSkill + dm;
  const success = total >= targetNumber;

  if (success) {
    targetCrit.repaired = true;
    targetCrit.temporary = true; // Repairs last 1D hours only
    targetCrit.repairedAt = Date.now();
  }

  return {
    success,
    location,
    severity: targetCrit.severity,
    roll: roll.total,
    skill: engineerSkill,
    dm,
    total,
    needed: targetNumber,
    message: success
      ? `Repair successful! ${location} Severity ${targetCrit.severity} temporarily fixed`
      : `Repair failed (needed ${targetNumber}, got ${total})`
  };
}

module.exports = {
  calculateSeverity,
  rollCriticalLocation,
  triggersCriticalHit,
  triggersSustainedDamage,
  applyCriticalHit,
  getTotalSeverity,
  attemptRepair
};
