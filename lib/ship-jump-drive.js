// ======== JUMP DRIVE CALCULATIONS MODULE ========
// Based on Mongoose Traveller 2E High Guard 2022 Update
// Page 179 (Core Rules) & Page 18 (High Guard)

/**
 * Calculate jump drive tonnage
 * Formula: (Hull × Jump Rating × 2.5%) + 5 tons, minimum 10 tons
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {number} jumpRating - Jump rating (0-9)
 * @returns {number} Jump drive tonnage
 */
function calculateJumpDriveTonnage(hullTonnage, jumpRating) {
  if (jumpRating === 0) return 0; // No jump drive

  const percentage = jumpRating * 2.5; // 2.5% per jump rating
  const baseTonnage = (hullTonnage * percentage / 100) + 5;
  const minimum = 10; // Absolute minimum

  return Math.max(baseTonnage, minimum);
}

/**
 * Calculate jump fuel requirement
 * Formula: Hull × Jump Rating × 10%
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {number} jumpRating - Jump rating (0-9)
 * @returns {number} Fuel required in tons
 */
function calculateJumpFuel(hullTonnage, jumpRating) {
  if (jumpRating === 0) return 0;
  return hullTonnage * jumpRating * 0.1;
}

/**
 * Calculate jump drive power requirement
 * Formula: Hull × Jump Rating × 10%
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {number} jumpRating - Jump rating (0-9)
 * @returns {number} Power required
 */
function calculateJumpPower(hullTonnage, jumpRating) {
  if (jumpRating === 0) return 0;
  return hullTonnage * jumpRating * 0.1;
}

/**
 * Calculate jump drive cost
 * Formula: Tonnage × MCr 1.5
 *
 * @param {number} tonnage - Jump drive tonnage
 * @returns {number} Cost in credits
 */
function calculateJumpDriveCost(tonnage) {
  if (tonnage === 0) return 0;
  const MCR_PER_TON = 1.5;
  return tonnage * MCR_PER_TON * 1000000; // Convert MCr to Cr
}

/**
 * Get minimum TL for jump rating
 * Based on High Guard Jump Potential table
 *
 * @param {number} jumpRating - Jump rating (0-9)
 * @returns {number} Minimum tech level
 */
function getMinimumJumpTL(jumpRating) {
  const tlTable = {
    0: 0,  // No jump drive
    1: 9,
    2: 11,
    3: 12,
    4: 13,
    5: 14,
    6: 15,
    7: 16,
    8: 17,
    9: 18
  };

  return tlTable[jumpRating] !== undefined ? tlTable[jumpRating] : 9;
}

/**
 * Validate jump drive configuration
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {number} jumpRating - Jump rating (0-9)
 * @param {number} techLevel - Ship tech level
 * @param {number} availableTonnage - Available tonnage for installation (optional)
 * @param {number} availableFuel - Available fuel tankage (optional)
 * @returns {Object} {valid: boolean, errors: Array, warnings: Array, stats: Object}
 */
function validateJumpDrive(hullTonnage, jumpRating, techLevel, availableTonnage = null, availableFuel = null) {
  const errors = [];
  const warnings = [];

  // Validate jump rating range
  if (jumpRating < 0) {
    errors.push('Jump rating cannot be negative');
  }

  if (jumpRating > 9) {
    errors.push(`Jump rating ${jumpRating} exceeds maximum of 9`);
  }

  // Validate TL requirements
  const requiredTL = getMinimumJumpTL(jumpRating);
  if (techLevel < requiredTL) {
    errors.push(`Jump-${jumpRating} requires TL${requiredTL}, ship is only TL${techLevel}`);
  }

  // Calculate requirements
  const driveTonnage = calculateJumpDriveTonnage(hullTonnage, jumpRating);
  const fuelRequired = calculateJumpFuel(hullTonnage, jumpRating);
  const powerRequired = calculateJumpPower(hullTonnage, jumpRating);
  const cost = calculateJumpDriveCost(driveTonnage);

  // Check tonnage availability
  if (availableTonnage !== null && driveTonnage > availableTonnage) {
    errors.push(`Jump drive requires ${driveTonnage}t, only ${availableTonnage}t available`);
  }

  // Check fuel availability
  if (availableFuel !== null && fuelRequired > availableFuel) {
    if (jumpRating > 0) {
      warnings.push(`Jump-${jumpRating} requires ${fuelRequired}t fuel, only ${availableFuel}t available`);
    }
  }

  // Performance warnings
  if (jumpRating === 1) {
    warnings.push('Jump-1 limits ship to single-parsec hops');
  }

  if (jumpRating === 0) {
    warnings.push('No jump drive - ship cannot travel between star systems');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      driveTonnage,
      fuelRequired,
      powerRequired,
      cost,
      minimumTL: requiredTL
    }
  };
}

/**
 * Calculate complete jump drive package for a ship
 * Returns all costs and requirements
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {number} jumpRating - Jump rating (0-9)
 * @returns {Object} Complete jump drive specifications
 */
function calculateJumpPackage(hullTonnage, jumpRating) {
  const driveTonnage = calculateJumpDriveTonnage(hullTonnage, jumpRating);
  const fuelRequired = calculateJumpFuel(hullTonnage, jumpRating);
  const powerRequired = calculateJumpPower(hullTonnage, jumpRating);
  const cost = calculateJumpDriveCost(driveTonnage);
  const minimumTL = getMinimumJumpTL(jumpRating);

  return {
    jumpRating,
    driveTonnage,
    fuelRequired,
    powerRequired,
    cost,
    costMCr: cost / 1000000,
    minimumTL,
    totalTonnage: driveTonnage + fuelRequired
  };
}

// ======== EXPORTS ========

// Node.js/CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateJumpDriveTonnage,
    calculateJumpFuel,
    calculateJumpPower,
    calculateJumpDriveCost,
    getMinimumJumpTL,
    validateJumpDrive,
    calculateJumpPackage
  };
}

// Browser/window export
if (typeof window !== 'undefined') {
  window.JumpDrive = {
    calculateJumpDriveTonnage,
    calculateJumpFuel,
    calculateJumpPower,
    calculateJumpDriveCost,
    getMinimumJumpTL,
    validateJumpDrive,
    calculateJumpPackage
  };
}
