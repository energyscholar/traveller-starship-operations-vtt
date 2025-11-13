// ======== MANOEUVRE DRIVE CALCULATIONS MODULE ========
// Based on Mongoose Traveller 2E High Guard 2022 Update
// Page 18 (High Guard) - Thrust Potential

/**
 * Calculate manoeuvre drive tonnage
 * Formula: Hull × Thrust Rating × 1%
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {number} thrust - Thrust rating (0-11)
 * @returns {number} Manoeuvre drive tonnage
 */
function calculateManoeuvreDriveTonnage(hullTonnage, thrust) {
  if (thrust === 0) return hullTonnage * 0.005; // 0.5% for thrust 0

  const percentage = thrust * 1; // 1% per thrust rating
  return hullTonnage * percentage / 100;
}

/**
 * Calculate manoeuvre drive power requirement
 * Formula: Hull × Thrust × 10%
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {number} thrust - Thrust rating (0-11)
 * @returns {number} Power required
 */
function calculateManoeuvrePower(hullTonnage, thrust) {
  if (thrust === 0) return 0;
  return hullTonnage * thrust * 0.1;
}

/**
 * Calculate manoeuvre drive cost
 * Formula: Tonnage × MCr 2
 *
 * @param {number} tonnage - Manoeuvre drive tonnage
 * @returns {number} Cost in credits
 */
function calculateManoeuvreDriveCost(tonnage) {
  if (tonnage === 0) return 0;
  const MCR_PER_TON = 2;
  return tonnage * MCR_PER_TON * 1000000; // Convert MCr to Cr
}

/**
 * Get minimum TL for thrust rating
 * Based on High Guard Thrust Potential table
 *
 * @param {number} thrust - Thrust rating (0-11)
 * @returns {number} Minimum tech level
 */
function getMinimumThrustTL(thrust) {
  const tlTable = {
    0: 9,
    1: 9,
    2: 10,
    3: 10,
    4: 11,
    5: 11,
    6: 12,
    7: 12,
    8: 13,
    9: 13,
    10: 16,
    11: 17
  };

  return tlTable[thrust] !== undefined ? tlTable[thrust] : 9;
}

/**
 * Validate manoeuvre drive configuration
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {number} thrust - Thrust rating (0-11)
 * @param {number} techLevel - Ship tech level
 * @param {number} availableTonnage - Available tonnage for installation (optional)
 * @returns {Object} {valid: boolean, errors: Array, warnings: Array, stats: Object}
 */
function validateManoeuvreDrive(hullTonnage, thrust, techLevel, availableTonnage = null) {
  const errors = [];
  const warnings = [];

  // Validate thrust rating range
  if (thrust < 0) {
    errors.push('Thrust rating cannot be negative');
  }

  if (thrust > 11) {
    errors.push(`Thrust rating ${thrust} exceeds maximum of 11`);
  }

  // Validate TL requirements
  const requiredTL = getMinimumThrustTL(thrust);
  if (techLevel < requiredTL) {
    errors.push(`Thrust-${thrust} requires TL${requiredTL}, ship is only TL${techLevel}`);
  }

  // Calculate requirements
  const driveTonnage = calculateManoeuvreDriveTonnage(hullTonnage, thrust);
  const powerRequired = calculateManoeuvrePower(hullTonnage, thrust);
  const cost = calculateManoeuvreDriveCost(driveTonnage);

  // Check tonnage availability
  if (availableTonnage !== null && driveTonnage > availableTonnage) {
    errors.push(`Manoeuvre drive requires ${driveTonnage}t, only ${availableTonnage}t available`);
  }

  // Performance warnings
  if (thrust === 0) {
    warnings.push('Thrust-0 (0.5% hull) provides minimal manoeuvrability');
  }

  if (thrust === 1) {
    warnings.push('Thrust-1 is slow for combat operations');
  }

  if (thrust >= 6) {
    warnings.push(`Thrust-${thrust} is very agile but requires significant tonnage and power`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      driveTonnage,
      powerRequired,
      cost,
      minimumTL: requiredTL
    }
  };
}

/**
 * Calculate complete manoeuvre drive package for a ship
 * Returns all costs and requirements
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {number} thrust - Thrust rating (0-11)
 * @returns {Object} Complete manoeuvre drive specifications
 */
function calculateManoeuvrePackage(hullTonnage, thrust) {
  const driveTonnage = calculateManoeuvreDriveTonnage(hullTonnage, thrust);
  const powerRequired = calculateManoeuvrePower(hullTonnage, thrust);
  const cost = calculateManoeuvreDriveCost(driveTonnage);
  const minimumTL = getMinimumThrustTL(thrust);

  return {
    thrust,
    driveTonnage,
    powerRequired,
    cost,
    costMCr: cost / 1000000,
    minimumTL
  };
}

// ======== EXPORTS ========

// Node.js/CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateManoeuvreDriveTonnage,
    calculateManoeuvrePower,
    calculateManoeuvreDriveCost,
    getMinimumThrustTL,
    validateManoeuvreDrive,
    calculateManoeuvrePackage
  };
}

// Browser/window export
if (typeof window !== 'undefined') {
  window.ManoeuvreDrive = {
    calculateManoeuvreDriveTonnage,
    calculateManoeuvrePower,
    calculateManoeuvreDriveCost,
    getMinimumThrustTL,
    validateManoeuvreDrive,
    calculateManoeuvrePackage
  };
}
