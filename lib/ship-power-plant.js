// ======== POWER PLANT CALCULATIONS MODULE ========
// Based on Mongoose Traveller 2E High Guard 2022 Update
// Page 18 (High Guard) - Power Plant specifications

/**
 * Power plant specifications
 * Based on High Guard power plant table
 */
const POWER_PLANT_TYPES = {
  fission: {
    tl: 6,
    powerPerTon: 8,
    costPerTon: 400000  // MCr 0.4 = Cr 400,000
  },
  chemical: {
    tl: 7,
    powerPerTon: 5,
    costPerTon: 250000  // MCr 0.25
  },
  fusion_tl8: {
    tl: 8,
    powerPerTon: 10,
    costPerTon: 500000  // MCr 0.5
  },
  fusion_tl12: {
    tl: 12,
    powerPerTon: 15,
    costPerTon: 1000000  // MCr 1
  },
  fusion_tl15: {
    tl: 15,
    powerPerTon: 20,
    costPerTon: 2000000  // MCr 2
  },
  antimatter: {
    tl: 20,
    powerPerTon: 100,
    costPerTon: 10000000  // MCr 10
  }
};

/**
 * Calculate tonnage required for power plant
 *
 * @param {number} powerOutput - Required power output
 * @param {string} plantType - Power plant type (fission, chemical, fusion_tl8, fusion_tl12, fusion_tl15, antimatter)
 * @returns {number} Tonnage required
 */
function calculatePowerPlantTonnage(powerOutput, plantType) {
  const specs = POWER_PLANT_TYPES[plantType];
  if (!specs) {
    throw new Error(`Invalid power plant type: ${plantType}`);
  }

  if (powerOutput === 0) return 0;

  return powerOutput / specs.powerPerTon;
}

/**
 * Calculate power plant cost
 *
 * @param {number} tonnage - Power plant tonnage
 * @param {string} plantType - Power plant type
 * @returns {number} Cost in credits
 */
function calculatePowerPlantCost(tonnage, plantType) {
  const specs = POWER_PLANT_TYPES[plantType];
  if (!specs) {
    throw new Error(`Invalid power plant type: ${plantType}`);
  }

  return tonnage * specs.costPerTon;
}

/**
 * Calculate basic ship power requirements
 * Formula: Hull × 20%
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @returns {number} Basic power required
 */
function calculateBasicPower(hullTonnage) {
  return hullTonnage * 0.2;
}

/**
 * Calculate total ship power requirements
 * Includes basic systems, manoeuvre drive, and jump drive
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {number} thrust - Thrust rating
 * @param {number} jumpRating - Jump rating
 * @param {number} otherPower - Other systems power (sensors, weapons, etc.)
 * @returns {Object} Power breakdown
 */
function calculateTotalPowerRequirement(hullTonnage, thrust = 0, jumpRating = 0, otherPower = 0) {
  const basic = calculateBasicPower(hullTonnage);
  const manoeuvre = hullTonnage * thrust * 0.1;
  const jump = hullTonnage * jumpRating * 0.1;

  return {
    basic,
    manoeuvre,
    jump,
    other: otherPower,
    total: basic + manoeuvre + jump + otherPower
  };
}

/**
 * Determine best power plant type for tech level
 *
 * @param {number} techLevel - Ship tech level
 * @returns {string} Best available power plant type
 */
function getBestPowerPlantType(techLevel) {
  if (techLevel >= 20) return 'antimatter';
  if (techLevel >= 15) return 'fusion_tl15';
  if (techLevel >= 12) return 'fusion_tl12';
  if (techLevel >= 8) return 'fusion_tl8';
  if (techLevel >= 7) return 'chemical';
  if (techLevel >= 6) return 'fission';

  throw new Error(`Tech level ${techLevel} is too low for power plant (minimum TL 6)`);
}

/**
 * Validate power plant configuration
 *
 * @param {number} powerOutput - Required power output
 * @param {string} plantType - Power plant type
 * @param {number} techLevel - Ship tech level
 * @param {number} availableTonnage - Available tonnage for installation (optional)
 * @returns {Object} {valid: boolean, errors: Array, warnings: Array, stats: Object}
 */
function validatePowerPlant(powerOutput, plantType, techLevel, availableTonnage = null) {
  const errors = [];
  const warnings = [];

  // Validate plant type exists
  const specs = POWER_PLANT_TYPES[plantType];
  if (!specs) {
    errors.push(`Invalid power plant type: ${plantType}`);
    return { valid: false, errors, warnings, stats: {} };
  }

  // Validate TL requirements
  if (techLevel < specs.tl) {
    errors.push(`${plantType} requires TL${specs.tl}, ship is only TL${techLevel}`);
  }

  // Calculate requirements
  const tonnage = calculatePowerPlantTonnage(powerOutput, plantType);
  const cost = calculatePowerPlantCost(tonnage, plantType);

  // Check tonnage availability
  if (availableTonnage !== null && tonnage > availableTonnage) {
    errors.push(`Power plant requires ${tonnage}t, only ${availableTonnage}t available`);
  }

  // Performance warnings
  const bestType = getBestPowerPlantType(techLevel);
  if (plantType !== bestType && techLevel >= specs.tl) {
    warnings.push(`Consider using ${bestType} for better power efficiency at TL${techLevel}`);
  }

  if (plantType === 'fission' || plantType === 'chemical') {
    warnings.push(`${plantType} power plants are inefficient - consider fusion if available`);
  }

  if (powerOutput === 0) {
    warnings.push('Power output is 0 - ship will have no power systems');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      tonnage,
      cost,
      powerPerTon: specs.powerPerTon,
      minimumTL: specs.tl
    }
  };
}

/**
 * Calculate complete power plant package
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {number} thrust - Thrust rating
 * @param {number} jumpRating - Jump rating
 * @param {number} techLevel - Ship tech level
 * @param {number} otherPower - Other systems power requirements
 * @returns {Object} Complete power plant specifications
 */
function calculatePowerPackage(hullTonnage, thrust, jumpRating, techLevel, otherPower = 0) {
  const powerReq = calculateTotalPowerRequirement(hullTonnage, thrust, jumpRating, otherPower);
  const plantType = getBestPowerPlantType(techLevel);
  const tonnage = calculatePowerPlantTonnage(powerReq.total, plantType);
  const cost = calculatePowerPlantCost(tonnage, plantType);
  const specs = POWER_PLANT_TYPES[plantType];

  return {
    plantType,
    powerOutput: powerReq.total,
    tonnage,
    cost,
    costMCr: cost / 1000000,
    powerPerTon: specs.powerPerTon,
    minimumTL: specs.tl,
    powerBreakdown: powerReq
  };
}

// ======== EXPORTS ========

// Node.js/CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    POWER_PLANT_TYPES,
    calculatePowerPlantTonnage,
    calculatePowerPlantCost,
    calculateBasicPower,
    calculateTotalPowerRequirement,
    getBestPowerPlantType,
    validatePowerPlant,
    calculatePowerPackage
  };
}

// Browser/window export
if (typeof window !== 'undefined') {
  window.PowerPlant = {
    POWER_PLANT_TYPES,
    calculatePowerPlantTonnage,
    calculatePowerPlantCost,
    calculateBasicPower,
    calculateTotalPowerRequirement,
    getBestPowerPlantType,
    validatePowerPlant,
    calculatePowerPackage
  };
}
