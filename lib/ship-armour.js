// ======== ARMOUR CALCULATIONS MODULE ========
// Based on Mongoose Traveller 2E High Guard 2022 Update
// Page 13 (High Guard) - Armour specifications

const ARMOUR_TYPES = {
  titanium_steel: {
    tl: 7,
    percentPerPoint: 2.5,
    costPerTon: 50000,
    maxProtection: (tl) => Math.min(tl, 9)
  },
  crystaliron: {
    tl: 10,
    percentPerPoint: 1.25,
    costPerTon: 200000,
    maxProtection: (tl) => Math.min(tl, 13)
  },
  bonded_superdense: {
    tl: 14,
    percentPerPoint: 0.80,
    costPerTon: 500000,
    maxProtection: (tl) => tl
  },
  molecular_bonded: {
    tl: 16,
    percentPerPoint: 0.50,
    costPerTon: 1500000,
    maxProtection: (tl) => tl + 4
  }
};

const HULL_MULTIPLIERS = {
  '5-15': 4,
  '16-25': 3,
  '26-99': 2,
  '100+': 1
};

/**
 * Get hull size multiplier for armour
 */
function getHullMultiplier(hullTonnage) {
  if (hullTonnage <= 15) return 4;
  if (hullTonnage <= 25) return 3;
  if (hullTonnage <= 99) return 2;
  return 1;
}

/**
 * Calculate armour tonnage
 * Formula: (Hull % per Point × Rating) × Hull Multiplier
 */
function calculateArmourTonnage(hullTonnage, armourType, rating) {
  const specs = ARMOUR_TYPES[armourType];
  if (!specs) {
    throw new Error(`Invalid armour type: ${armourType}`);
  }

  if (rating === 0) return 0;

  const percentPerPoint = specs.percentPerPoint;
  const hullMultiplier = getHullMultiplier(hullTonnage);

  const percentage = percentPerPoint * rating * hullMultiplier;
  return (hullTonnage * percentage) / 100;
}

/**
 * Calculate armour cost
 */
function calculateArmourCost(tonnage, armourType) {
  const specs = ARMOUR_TYPES[armourType];
  if (!specs) {
    throw new Error(`Invalid armour type: ${armourType}`);
  }

  return tonnage * specs.costPerTon;
}

/**
 * Get maximum armour rating for type and TL
 */
function getMaxArmourRating(armourType, techLevel) {
  const specs = ARMOUR_TYPES[armourType];
  if (!specs) {
    throw new Error(`Invalid armour type: ${armourType}`);
  }

  return specs.maxProtection(techLevel);
}

/**
 * Get best armour type for tech level
 */
function getBestArmourType(techLevel) {
  if (techLevel >= 16) return 'molecular_bonded';
  if (techLevel >= 14) return 'bonded_superdense';
  if (techLevel >= 10) return 'crystaliron';
  if (techLevel >= 7) return 'titanium_steel';

  throw new Error(`Tech level ${techLevel} too low for armour (minimum TL 7)`);
}

/**
 * Validate armour configuration
 */
function validateArmour(hullTonnage, armourType, rating, techLevel, availableTonnage = null) {
  const errors = [];
  const warnings = [];

  const specs = ARMOUR_TYPES[armourType];
  if (!specs) {
    errors.push(`Invalid armour type: ${armourType}`);
    return { valid: false, errors, warnings, stats: {} };
  }

  // Validate TL
  if (techLevel < specs.tl) {
    errors.push(`${armourType} requires TL${specs.tl}, ship is only TL${techLevel}`);
  }

  // Validate rating
  const maxRating = getMaxArmourRating(armourType, techLevel);
  if (rating > maxRating) {
    errors.push(`${armourType} at TL${techLevel} limited to ${maxRating} rating, ${rating} specified`);
  }

  if (rating < 0) {
    errors.push('Armour rating cannot be negative');
  }

  const tonnage = calculateArmourTonnage(hullTonnage, armourType, rating);
  const cost = calculateArmourCost(tonnage, armourType);

  if (availableTonnage !== null && tonnage > availableTonnage) {
    errors.push(`Armour requires ${tonnage}t, only ${availableTonnage}t available`);
  }

  // Warnings
  const bestType = getBestArmourType(techLevel);
  if (armourType !== bestType && techLevel >= specs.tl) {
    warnings.push(`Consider ${bestType} for better efficiency at TL${techLevel}`);
  }

  if (rating === 0) {
    warnings.push('No armour - ship is vulnerable');
  }

  if (hullTonnage <= 25) {
    warnings.push(`Small hull (${hullTonnage}t) has ${getHullMultiplier(hullTonnage)}× armour multiplier - armour is expensive`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      tonnage,
      cost,
      rating,
      maxRating,
      minimumTL: specs.tl
    }
  };
}

/**
 * Calculate armour package
 */
function calculateArmourPackage(hullTonnage, rating, techLevel) {
  const armourType = getBestArmourType(techLevel);
  const maxRating = getMaxArmourRating(armourType, techLevel);
  const actualRating = Math.min(rating, maxRating);
  const tonnage = calculateArmourTonnage(hullTonnage, armourType, actualRating);
  const cost = calculateArmourCost(tonnage, armourType);

  return {
    armourType,
    rating: actualRating,
    maxRating,
    tonnage,
    cost,
    costMCr: cost / 1000000,
    minimumTL: ARMOUR_TYPES[armourType].tl
  };
}

// ======== EXPORTS ========

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ARMOUR_TYPES,
    getHullMultiplier,
    calculateArmourTonnage,
    calculateArmourCost,
    getMaxArmourRating,
    getBestArmourType,
    validateArmour,
    calculateArmourPackage
  };
}

if (typeof window !== 'undefined') {
  window.Armour = {
    ARMOUR_TYPES,
    getHullMultiplier,
    calculateArmourTonnage,
    calculateArmourCost,
    getMaxArmourRating,
    getBestArmourType,
    validateArmour,
    calculateArmourPackage
  };
}
