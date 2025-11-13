// ======== SENSORS CALCULATIONS MODULE ========
// Based on Mongoose Traveller 2E High Guard 2022 Update
// Page 21 (High Guard) - Sensors specifications

/**
 * Sensor specifications
 * Based on High Guard sensor table
 */
const SENSOR_TYPES = {
  basic: {
    grade: 'basic',
    tl: 8,
    dm: -4,
    power: 0,
    tonnage: 0,
    cost: 0,
    suite: ['Lidar', 'Radar']
  },
  civilian: {
    grade: 'civilian',
    tl: 9,
    dm: -2,
    power: 1,
    tonnage: 1,
    cost: 3000000,  // MCr 3
    suite: ['Lidar', 'Radar']
  },
  military: {
    grade: 'military',
    tl: 10,
    dm: 0,
    power: 2,
    tonnage: 2,
    cost: 4100000,  // MCr 4.1
    suite: ['Jammers', 'Lidar', 'Radar']
  },
  improved: {
    grade: 'improved',
    tl: 12,
    dm: 1,
    power: 4,
    tonnage: 3,
    cost: 4300000,  // MCr 4.3
    suite: ['Densitometer', 'Jammers', 'Lidar', 'Radar']
  },
  advanced: {
    grade: 'advanced',
    tl: 15,
    dm: 2,
    power: 6,
    tonnage: 5,
    cost: 5300000,  // MCr 5.3
    suite: ['Densitometer', 'Jammers', 'Lidar', 'Neural Activity', 'Radar']
  }
};

/**
 * Get sensor specifications by grade
 *
 * @param {string} grade - Sensor grade (basic, civilian, military, improved, advanced)
 * @returns {Object} Sensor specifications
 */
function getSensorSpecs(grade) {
  const specs = SENSOR_TYPES[grade];
  if (!specs) {
    throw new Error(`Invalid sensor grade: ${grade}`);
  }
  return specs;
}

/**
 * Get best sensor grade for tech level
 *
 * @param {number} techLevel - Ship tech level
 * @returns {string} Best available sensor grade
 */
function getBestSensorGrade(techLevel) {
  if (techLevel >= 15) return 'advanced';
  if (techLevel >= 12) return 'improved';
  if (techLevel >= 10) return 'military';
  if (techLevel >= 9) return 'civilian';
  if (techLevel >= 8) return 'basic';

  throw new Error(`Tech level ${techLevel} is too low for sensors (minimum TL 8)`);
}

/**
 * Validate sensor configuration
 *
 * @param {string} grade - Sensor grade
 * @param {number} techLevel - Ship tech level
 * @param {number} availableTonnage - Available tonnage for installation (optional)
 * @param {number} availablePower - Available power (optional)
 * @returns {Object} {valid: boolean, errors: Array, warnings: Array, stats: Object}
 */
function validateSensors(grade, techLevel, availableTonnage = null, availablePower = null) {
  const errors = [];
  const warnings = [];

  // Validate grade exists
  const specs = SENSOR_TYPES[grade];
  if (!specs) {
    errors.push(`Invalid sensor grade: ${grade}`);
    return { valid: false, errors, warnings, stats: {} };
  }

  // Validate TL requirements
  if (techLevel < specs.tl) {
    errors.push(`${grade} sensors require TL${specs.tl}, ship is only TL${techLevel}`);
  }

  // Check tonnage availability
  if (availableTonnage !== null && specs.tonnage > availableTonnage) {
    errors.push(`${grade} sensors require ${specs.tonnage}t, only ${availableTonnage}t available`);
  }

  // Check power availability
  if (availablePower !== null && specs.power > availablePower) {
    errors.push(`${grade} sensors require ${specs.power} power, only ${availablePower} available`);
  }

  // Performance warnings
  const bestGrade = getBestSensorGrade(techLevel);
  if (grade !== bestGrade && techLevel >= specs.tl) {
    warnings.push(`Consider upgrading to ${bestGrade} sensors for better performance at TL${techLevel}`);
  }

  if (grade === 'basic') {
    warnings.push('Basic sensors have DM-4 penalty - consider upgrading for better detection');
  }

  if (grade === 'military' || grade === 'improved' || grade === 'advanced') {
    if (specs.suite.includes('Jammers')) {
      warnings.push('Sensors include electronic countermeasures (jammers)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      tonnage: specs.tonnage,
      power: specs.power,
      cost: specs.cost,
      dm: specs.dm,
      minimumTL: specs.tl,
      suite: specs.suite
    }
  };
}

/**
 * Calculate complete sensor package for a ship
 *
 * @param {number} techLevel - Ship tech level
 * @param {string} preferredGrade - Preferred sensor grade (optional, defaults to best for TL)
 * @returns {Object} Complete sensor specifications
 */
function calculateSensorPackage(techLevel, preferredGrade = null) {
  const grade = preferredGrade || getBestSensorGrade(techLevel);
  const specs = getSensorSpecs(grade);

  return {
    grade,
    tonnage: specs.tonnage,
    power: specs.power,
    cost: specs.cost,
    costMCr: specs.cost / 1000000,
    dm: specs.dm,
    minimumTL: specs.tl,
    suite: specs.suite
  };
}

/**
 * Compare two sensor grades
 * Returns positive if grade1 > grade2, negative if grade1 < grade2, 0 if equal
 *
 * @param {string} grade1 - First sensor grade
 * @param {string} grade2 - Second sensor grade
 * @returns {number} Comparison result
 */
function compareSensorGrades(grade1, grade2) {
  const specs1 = getSensorSpecs(grade1);
  const specs2 = getSensorSpecs(grade2);

  return specs1.dm - specs2.dm;
}

// ======== EXPORTS ========

// Node.js/CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SENSOR_TYPES,
    getSensorSpecs,
    getBestSensorGrade,
    validateSensors,
    calculateSensorPackage,
    compareSensorGrades
  };
}

// Browser/window export
if (typeof window !== 'undefined') {
  window.Sensors = {
    SENSOR_TYPES,
    getSensorSpecs,
    getBestSensorGrade,
    validateSensors,
    calculateSensorPackage,
    compareSensorGrades
  };
}
