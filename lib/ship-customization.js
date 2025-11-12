// ======== SHIP CUSTOMIZATION VALIDATION MODULE ========
// Validation rules for ship customization (Stage 12.4)
// CRITICAL: Server-side validation will mirror these rules (Stage 12.6)

// ======== VALIDATION RULES ========

/**
 * Validate all ship modifications
 * @param {Object} template - Base ship template
 * @param {Object} mods - Modifications object
 * @returns {Object} {valid: boolean, errors: Array, warnings: Array}
 */
function validateCustomShip(template, mods) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  if (!mods || Object.keys(mods).length === 0) {
    return result; // No modifications = valid
  }

  // Validate turrets
  if (mods.turrets) {
    const turretValidation = validateTurrets(template, mods.turrets);
    result.errors.push(...turretValidation.errors);
    result.warnings.push(...turretValidation.warnings);
  }

  // Validate armor
  if (mods.armor !== undefined && mods.armor !== null) {
    const armorValidation = validateArmor(template, mods.armor);
    result.errors.push(...armorValidation.errors);
    result.warnings.push(...armorValidation.warnings);
  }

  // Validate thrust
  if (mods.thrust !== undefined && mods.thrust !== null) {
    const thrustValidation = validateThrust(template, mods.thrust);
    result.errors.push(...thrustValidation.errors);
    result.warnings.push(...thrustValidation.warnings);
  }

  // Validate jump
  if (mods.jump !== undefined && mods.jump !== null) {
    const jumpValidation = validateJump(template, mods.jump);
    result.errors.push(...jumpValidation.errors);
    result.warnings.push(...jumpValidation.warnings);
  }

  // Validate cargo/fuel
  if (mods.cargo !== undefined || mods.fuel !== undefined) {
    const cargoFuelValidation = validateCargoFuel(template, mods);
    result.errors.push(...cargoFuelValidation.errors);
    result.warnings.push(...cargoFuelValidation.warnings);
  }

  result.valid = result.errors.length === 0;
  return result;
}

/**
 * Validate turret modifications
 * @param {Object} template - Base ship template
 * @param {Array} modTurrets - Modified turrets array
 * @returns {Object} {errors: Array, warnings: Array}
 */
function validateTurrets(template, modTurrets) {
  const errors = [];
  const warnings = [];

  // Check hardpoint limit (1 per 100t)
  const hardpoints = template.hardpoints || Math.floor(template.tonnage / 100);
  if (modTurrets.length > hardpoints) {
    errors.push(`Too many turrets: ${modTurrets.length} exceeds hardpoint limit of ${hardpoints}`);
  }

  // Validate each turret
  modTurrets.forEach((turret, index) => {
    const turretName = turret.id || `Turret ${index + 1}`;

    // Validate turret type
    if (!['single', 'double', 'triple'].includes(turret.type)) {
      errors.push(`${turretName}: Invalid turret type "${turret.type}"`);
    }

    // Validate weapon count matches turret capacity
    const weaponCount = turret.weapons ? turret.weapons.length : 0;
    const capacity = getTurretCapacity(turret.type);

    if (weaponCount > capacity) {
      errors.push(`${turretName}: ${weaponCount} weapons exceeds ${turret.type} turret capacity of ${capacity}`);
    }

    // Validate weapon types
    if (turret.weapons) {
      turret.weapons.forEach((weaponId, wIndex) => {
        if (!isValidWeapon(weaponId)) {
          errors.push(`${turretName} Weapon ${wIndex + 1}: Invalid weapon type "${weaponId}"`);
        }
      });
    }

    // Warning for empty turret
    if (weaponCount === 0) {
      warnings.push(`${turretName}: Turret has no weapons assigned`);
    }

    // Warning for underutilized turret
    if (weaponCount < capacity && weaponCount > 0) {
      warnings.push(`${turretName}: ${turret.type} turret can hold ${capacity} weapons, only ${weaponCount} assigned`);
    }
  });

  return { errors, warnings };
}

/**
 * Validate armor modifications
 * @param {Object} template - Base ship template
 * @param {number} newArmor - New armor rating
 * @returns {Object} {errors: Array, warnings: Array}
 */
function validateArmor(template, newArmor) {
  const errors = [];
  const warnings = [];

  // Check TL maximum (TL9 = max armor 4, TL12 = max armor 6, etc.)
  const techLevel = template.techLevel || 9;
  const maxArmor = Math.floor(techLevel / 2); // Simplified: TL/2 = max armor

  if (newArmor > maxArmor) {
    errors.push(`Armor ${newArmor} exceeds TL${techLevel} maximum of ${maxArmor}`);
  }

  if (newArmor < 0) {
    errors.push(`Armor cannot be negative`);
  }

  // Warning for no armor
  if (newArmor === 0 && (template.armour || 0) > 0) {
    warnings.push(`Removing armor makes ship more vulnerable`);
  }

  return { errors, warnings };
}

/**
 * Validate thrust modifications
 * @param {Object} template - Base ship template
 * @param {number} newThrust - New thrust rating
 * @returns {Object} {errors: Array, warnings: Array}
 */
function validateThrust(template, newThrust) {
  const errors = [];
  const warnings = [];

  // Thrust range: 1-6 (Traveller standard)
  if (newThrust < 1) {
    errors.push(`Thrust ${newThrust} too low (minimum 1)`);
  }

  if (newThrust > 6) {
    errors.push(`Thrust ${newThrust} too high (maximum 6)`);
  }

  // Warning for low thrust
  if (newThrust === 1 && (template.thrust || 0) > 1) {
    warnings.push(`Reducing thrust to 1 makes ship slow`);
  }

  return { errors, warnings };
}

/**
 * Validate jump modifications
 * @param {Object} template - Base ship template
 * @param {number} newJump - New jump rating
 * @returns {Object} {errors: Array, warnings: Array}
 */
function validateJump(template, newJump) {
  const errors = [];
  const warnings = [];

  // Jump range: 0-6 (Traveller standard)
  if (newJump < 0) {
    errors.push(`Jump ${newJump} cannot be negative`);
  }

  if (newJump > 6) {
    errors.push(`Jump ${newJump} too high (maximum 6)`);
  }

  // Check fuel requirements (Jump-N requires 10% × N × tonnage)
  const tonnage = template.tonnage || 100;
  const fuelRequired = tonnage * 0.1 * newJump;
  const availableFuel = template.fuel || 0;

  if (fuelRequired > availableFuel && newJump > 0) {
    warnings.push(`Jump-${newJump} requires ${fuelRequired}t fuel, but only ${availableFuel}t available`);
  }

  return { errors, warnings };
}

/**
 * Validate cargo/fuel modifications
 * @param {Object} template - Base ship template
 * @param {Object} mods - Modifications object
 * @returns {Object} {errors: Array, warnings: Array}
 */
function validateCargoFuel(template, mods) {
  const errors = [];
  const warnings = [];

  const newCargo = mods.cargo !== undefined ? mods.cargo : (template.cargo || 0);
  const newFuel = mods.fuel !== undefined ? mods.fuel : (template.fuel || 0);

  // Total cargo + fuel must equal base total (just reallocating)
  const baseTotal = (template.cargo || 0) + (template.fuel || 0);
  const newTotal = newCargo + newFuel;

  if (newTotal !== baseTotal) {
    errors.push(`Cargo (${newCargo}t) + Fuel (${newFuel}t) = ${newTotal}t, must equal ${baseTotal}t`);
  }

  if (newCargo < 0) {
    errors.push(`Cargo cannot be negative`);
  }

  if (newFuel < 0) {
    errors.push(`Fuel cannot be negative`);
  }

  // Warning for low fuel
  const jumpRating = mods.jump !== undefined ? mods.jump : (template.jump || 0);
  const tonnage = template.tonnage || 100;
  const fuelRequiredForJump = tonnage * 0.1 * jumpRating;

  if (newFuel < fuelRequiredForJump && jumpRating > 0) {
    warnings.push(`Fuel (${newFuel}t) insufficient for Jump-${jumpRating} (requires ${fuelRequiredForJump}t)`);
  }

  return { errors, warnings };
}

// ======== HELPER FUNCTIONS ========

/**
 * Get turret capacity based on type
 * @param {string} type - Turret type (single, double, triple)
 * @returns {number} Number of weapons turret can hold
 */
function getTurretCapacity(type) {
  const capacities = {
    single: 1,
    double: 2,
    triple: 3
  };
  return capacities[type] || 0;
}

/**
 * Check if weapon ID is valid
 * @param {string} weaponId - Weapon identifier
 * @returns {boolean} True if valid weapon
 */
function isValidWeapon(weaponId) {
  const validWeapons = [
    'pulse_laser',
    'beam_laser',
    'particle_beam',
    'missile_rack',
    'sandcaster',
    'railgun',
    'meson_gun'
  ];
  return validWeapons.includes(weaponId);
}

/**
 * Get maximum hardpoints for a ship
 * @param {Object} template - Base ship template
 * @returns {number} Maximum hardpoints (1 per 100t)
 */
function getMaxHardpoints(template) {
  return template.hardpoints || Math.floor(template.tonnage / 100);
}

/**
 * Get maximum armor for a ship
 * @param {Object} template - Base ship template
 * @returns {number} Maximum armor based on TL
 */
function getMaxArmor(template) {
  const techLevel = template.techLevel || 9;
  return Math.floor(techLevel / 2);
}

/**
 * Check if modifications are within budget
 * @param {Object} template - Base ship template
 * @param {Object} mods - Modifications object
 * @param {number} budget - Budget in credits
 * @returns {boolean} True if within budget
 */
function isWithinBudget(template, mods, budget) {
  // Requires ship-costs.js module
  if (typeof calculateModificationCost !== 'function') {
    console.warn('ship-costs.js not loaded');
    return true;
  }

  const modCost = calculateModificationCost(template, mods);
  return modCost <= budget;
}

// ======== EXPORTS ========

// Node.js/CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateCustomShip,
    validateTurrets,
    validateArmor,
    validateThrust,
    validateJump,
    validateCargoFuel,
    getTurretCapacity,
    isValidWeapon,
    getMaxHardpoints,
    getMaxArmor,
    isWithinBudget
  };
}

// Browser/window export (for backward compatibility)
if (typeof window !== 'undefined') {
  window.ShipCustomization = {
    validateCustomShip,
    validateTurrets,
    validateArmor,
    validateThrust,
    validateJump,
    validateCargoFuel,
    getTurretCapacity,
    isValidWeapon,
    getMaxHardpoints,
    getMaxArmor,
    isWithinBudget
  };
}
