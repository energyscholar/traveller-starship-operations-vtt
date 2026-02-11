// ======== SHIP WEAPONS CALCULATIONS MODULE ========
// Based on Mongoose Traveller 2E High Guard 2022 Update

const TURRET_TYPES = {
  fixed: { tl: 7, tonnage: 0, hardpoints: 0, cost: 100000 },
  single: { tl: 7, tonnage: 1, hardpoints: 1, cost: 200000 },
  double: { tl: 8, tonnage: 1, hardpoints: 1, cost: 500000 },
  triple: { tl: 9, tonnage: 1, hardpoints: 1, cost: 1000000 },
  popup: { tl: 10, tonnage: 0, hardpoints: 1, cost: 1000000 }
};

const WEAPONS = {
  beam_laser: { tl: 10, power: 4, damage: '1d6', cost: 500000, range: 'medium', mount: 'turret', damageMultiple: 1, attackDM: 4 },
  pulse_laser: { tl: 9, power: 4, damage: '2d6', cost: 1000000, range: 'long', mount: 'turret', damageMultiple: 1, attackDM: 2 },
  particle_beam: { tl: 12, power: 8, damage: '3d6', cost: 4000000, range: 'vlong', mount: 'turret', damageMultiple: 1, attackDM: 0 },
  plasma_gun: { tl: 11, power: 6, damage: '3d6', cost: 2500000, range: 'medium', mount: 'turret', damageMultiple: 1, attackDM: 0 },
  fusion_gun: { tl: 14, power: 12, damage: '4d6', cost: 2000000, range: 'medium', mount: 'turret', damageMultiple: 1, attackDM: 0 },
  railgun: { tl: 10, power: 2, damage: '2d6', cost: 1000000, range: 'short', mount: 'turret', damageMultiple: 1, attackDM: 0 },
  missile_rack: { tl: 7, power: 0, damage: '4d6', cost: 750000, range: 'special', ammo: 12, mount: 'turret', damageMultiple: 1, attackDM: 0 },
  missile_rack_advanced: { tl: 12, power: 0, damage: '5d6', cost: 1500000, range: 'special', ammo: 12, mount: 'turret', damageMultiple: 1, attackDM: 0 },
  sandcaster: { tl: 9, power: 0, damage: '0', cost: 250000, range: 'special', ammo: 20, mount: 'turret', damageMultiple: 1, attackDM: 0 },
  particle_barbette: { tl: 11, power: 15, damage: '4d6', cost: 8000000, range: 'vlong', mount: 'barbette', damageMultiple: 3, attackDM: 0, traits: ['radiation'] },
  ion_barbette: { tl: 12, power: 10, damage: '7d6', cost: 6000000, range: 'medium', mount: 'barbette', damageMultiple: 3, attackDM: 0, traits: ['ion'] }
};

/**
 * Calculate hardpoints available
 * Formula: 1 per 100 tons of hull
 */
function calculateHardpoints(hullTonnage) {
  return Math.floor(hullTonnage / 100);
}

/**
 * Calculate weapon mount specifications
 */
function calculateTurretSpecs(turretType, weapons = []) {
  const turret = TURRET_TYPES[turretType];
  if (!turret) {
    throw new Error(`Invalid turret type: ${turretType}`);
  }

  let weaponCost = 0;
  let weaponPower = 0;
  const weaponsList = [];

  for (const weaponId of weapons) {
    const weapon = WEAPONS[weaponId];
    if (!weapon) {
      throw new Error(`Invalid weapon: ${weaponId}`);
    }
    weaponCost += weapon.cost;
    weaponPower += weapon.power;
    weaponsList.push({ id: weaponId, ...weapon });
  }

  return {
    turretType,
    tonnage: turret.tonnage,
    hardpoints: turret.hardpoints,
    cost: turret.cost + weaponCost,
    power: weaponPower,
    weapons: weaponsList,
    minimumTL: Math.max(turret.tl, ...weaponsList.map(w => w.tl))
  };
}

/**
 * Validate weapon configuration
 */
function validateWeapons(turretType, weapons, techLevel, availableHardpoints = null, availableTonnage = null) {
  const errors = [];
  const warnings = [];

  const turret = TURRET_TYPES[turretType];
  if (!turret) {
    errors.push(`Invalid turret type: ${turretType}`);
    return { valid: false, errors, warnings, stats: {} };
  }

  // Check weapon count
  const maxWeapons = turretType === 'triple' ? 3 : turretType === 'double' ? 2 : 1;
  if (weapons.length > maxWeapons) {
    errors.push(`${turretType} turret can only mount ${maxWeapons} weapon(s), ${weapons.length} specified`);
  }

  // Validate each weapon
  for (const weaponId of weapons) {
    const weapon = WEAPONS[weaponId];
    if (!weapon) {
      errors.push(`Invalid weapon: ${weaponId}`);
      continue;
    }

    if (techLevel < weapon.tl) {
      errors.push(`${weaponId} requires TL${weapon.tl}, ship is only TL${techLevel}`);
    }
  }

  if (techLevel < turret.tl) {
    errors.push(`${turretType} turret requires TL${turret.tl}, ship is only TL${techLevel}`);
  }

  const specs = calculateTurretSpecs(turretType, weapons);

  if (availableHardpoints !== null && turret.hardpoints > availableHardpoints) {
    errors.push(`Turret requires ${turret.hardpoints} hardpoint(s), only ${availableHardpoints} available`);
  }

  if (availableTonnage !== null && specs.tonnage > availableTonnage) {
    errors.push(`Turret requires ${specs.tonnage}t, only ${availableTonnage}t available`);
  }

  // Warnings
  if (weapons.length === 0) {
    warnings.push('Empty turret - consider installing weapons');
  }

  if (turretType === 'popup') {
    warnings.push('Pop-up turret adds hardpoint capacity but costs extra');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: specs
  };
}

/**
 * Calculate complete weapons package
 */
function calculateWeaponsPackage(hullTonnage, turretConfigs) {
  const hardpointsAvailable = calculateHardpoints(hullTonnage);
  const turrets = [];
  let totalTonnage = 0;
  let totalCost = 0;
  let totalPower = 0;
  let hardpointsUsed = 0;

  for (const config of turretConfigs) {
    const specs = calculateTurretSpecs(config.type, config.weapons || []);
    turrets.push(specs);
    totalTonnage += specs.tonnage;
    totalCost += specs.cost;
    totalPower += specs.power;
    hardpointsUsed += specs.hardpoints;
  }

  return {
    hardpointsAvailable,
    hardpointsUsed,
    hardpointsRemaining: hardpointsAvailable - hardpointsUsed,
    turrets,
    totalTonnage,
    totalCost,
    totalPower
  };
}

// ======== EXPORTS ========

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TURRET_TYPES,
    WEAPONS,
    calculateHardpoints,
    calculateTurretSpecs,
    validateWeapons,
    calculateWeaponsPackage
  };
}

if (typeof window !== 'undefined') {
  window.ShipWeapons = {
    TURRET_TYPES,
    WEAPONS,
    calculateHardpoints,
    calculateTurretSpecs,
    validateWeapons,
    calculateWeaponsPackage
  };
}
