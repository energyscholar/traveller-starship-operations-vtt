// ======== STATEROOMS CALCULATIONS MODULE ========
// Based on Mongoose Traveller 2E High Guard 2022 Update

/**
 * Stateroom specifications
 */
const STATEROOM_SPECS = {
  standard: {
    tonnage: 4,
    cost: 500000,  // MCr 0.5
    capacity: 1
  },
  luxury: {
    tonnage: 8,
    cost: 1000000,  // MCr 1
    capacity: 1
  },
  lowBerth: {
    tonnage: 0.5,
    cost: 50000,  // Cr 50,000
    capacity: 1
  },
  barracks: {
    tonnage: 2,  // 2 tons per marine
    cost: 100000,  // Cr 100,000 per marine
    capacity: 1
  }
};

/**
 * Calculate tonnage for staterooms
 *
 * @param {string} type - Stateroom type (standard, luxury, lowBerth, barracks)
 * @param {number} count - Number of staterooms
 * @returns {number} Total tonnage
 */
function calculateStateroomTonnage(type, count) {
  const specs = STATEROOM_SPECS[type];
  if (!specs) {
    throw new Error(`Invalid stateroom type: ${type}`);
  }
  return specs.tonnage * count;
}

/**
 * Calculate cost for staterooms
 *
 * @param {string} type - Stateroom type
 * @param {number} count - Number of staterooms
 * @returns {number} Total cost in credits
 */
function calculateStateroomCost(type, count) {
  const specs = STATEROOM_SPECS[type];
  if (!specs) {
    throw new Error(`Invalid stateroom type: ${type}`);
  }
  return specs.cost * count;
}

/**
 * Calculate crew requirements
 *
 * @param {number} hullTonnage - Ship hull size in tons
 * @param {number} thrust - Thrust rating
 * @param {number} jumpRating - Jump rating
 * @param {number} turrets - Number of turrets
 * @returns {Object} Crew requirements breakdown
 */
function calculateCrewRequirements(hullTonnage, thrust, jumpRating, turrets) {
  const crew = {
    pilot: 1,
    astrogator: jumpRating > 0 ? 1 : 0,
    engineer: Math.max(1, Math.ceil(hullTonnage / 1000)),
    gunner: turrets,
    steward: 0,
    medic: 0,
    marines: 0
  };

  // Stewards: 1 per 8 high passengers (not automated here)
  // Medic: recommended for low berths

  crew.total = Object.values(crew).reduce((sum, val) => sum + val, 0);

  return crew;
}

/**
 * Validate stateroom configuration
 *
 * @param {string} type - Stateroom type
 * @param {number} count - Number of staterooms
 * @param {number} availableTonnage - Available tonnage (optional)
 * @returns {Object} {valid: boolean, errors: Array, warnings: Array, stats: Object}
 */
function validateStaterooms(type, count, availableTonnage = null) {
  const errors = [];
  const warnings = [];

  const specs = STATEROOM_SPECS[type];
  if (!specs) {
    errors.push(`Invalid stateroom type: ${type}`);
    return { valid: false, errors, warnings, stats: {} };
  }

  if (count < 0) {
    errors.push('Count cannot be negative');
  }

  const tonnage = calculateStateroomTonnage(type, count);
  const cost = calculateStateroomCost(type, count);

  if (availableTonnage !== null && tonnage > availableTonnage) {
    errors.push(`${count}× ${type} staterooms require ${tonnage}t, only ${availableTonnage}t available`);
  }

  // Warnings
  if (type === 'lowBerth') {
    warnings.push('Low berths require medic for safe revival (5% death risk without)');
  }

  if (type === 'luxury') {
    warnings.push('Luxury staterooms double tonnage and cost - consider for high passengers only');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      tonnage,
      cost,
      capacity: count,
      perUnit: specs
    }
  };
}

/**
 * Calculate complete stateroom package for crew + passengers
 *
 * @param {Object} requirements - {crew, passengers, lowBerths}
 * @returns {Object} Complete stateroom breakdown
 */
function calculateStateroomPackage(requirements) {
  const { crew = 0, passengers = 0, lowBerths = 0 } = requirements;

  const standard = crew + passengers;
  const standardTonnage = calculateStateroomTonnage('standard', standard);
  const standardCost = calculateStateroomCost('standard', standard);

  const lowBerthTonnage = calculateStateroomTonnage('lowBerth', lowBerths);
  const lowBerthCost = calculateStateroomCost('lowBerth', lowBerths);

  return {
    standard: {
      count: standard,
      tonnage: standardTonnage,
      cost: standardCost
    },
    lowBerths: {
      count: lowBerths,
      tonnage: lowBerthTonnage,
      cost: lowBerthCost
    },
    total: {
      tonnage: standardTonnage + lowBerthTonnage,
      cost: standardCost + lowBerthCost
    }
  };
}

// ======== EXPORTS ========

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STATEROOM_SPECS,
    calculateStateroomTonnage,
    calculateStateroomCost,
    calculateCrewRequirements,
    validateStaterooms,
    calculateStateroomPackage
  };
}

if (typeof window !== 'undefined') {
  window.Staterooms = {
    STATEROOM_SPECS,
    calculateStateroomTonnage,
    calculateStateroomCost,
    calculateCrewRequirements,
    validateStaterooms,
    calculateStateroomPackage
  };
}
