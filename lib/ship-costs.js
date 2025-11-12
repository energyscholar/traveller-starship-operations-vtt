// ======== SHIP COST CALCULATION MODULE ========
// Calculates costs for ship customization (Stage 12.4)
// All costs stored as integer credits to avoid floating point errors
// Convert to MCr only for display

// ======== CONSTANTS ========

const MCR = 1000000; // 1 million credits

// Turret costs (in credits)
const TURRET_COSTS = {
  single: 200000,    // MCr 0.2
  double: 500000,    // MCr 0.5
  triple: 1000000    // MCr 1.0
};

// Weapon costs (in credits)
const WEAPON_COSTS = {
  pulse_laser: 1000000,     // MCr 1.0
  beam_laser: 500000,       // MCr 0.5
  particle_beam: 4000000,   // MCr 4.0
  missile_rack: 750000,     // MCr 0.75
  sandcaster: 250000,       // MCr 0.25
  railgun: 2000000,         // MCr 2.0
  meson_gun: 50000000       // MCr 50.0 (capital weapon)
};

// Armor cost per ton of ship per armor point (in credits)
const ARMOR_COST_PER_TON_PER_POINT = 50000; // MCr 0.05 per 10 tons per point

// Drive costs are complex (from Traveller Core Rulebook)
// Simplified: Cost per thrust/jump rating per 100t of ship
const M_DRIVE_COST_PER_THRUST_PER_100T = 2000000;  // MCr 2.0
const J_DRIVE_COST_PER_JUMP_PER_100T = 10000000;   // MCr 10.0

// ======== COST CALCULATION FUNCTIONS ========

/**
 * Calculate total cost of ship modifications
 * @param {Object} template - Base ship template
 * @param {Object} mods - Modifications object
 * @returns {number} Total modification cost in credits
 */
function calculateModificationCost(template, mods) {
  if (!mods || Object.keys(mods).length === 0) {
    return 0;
  }

  let totalCost = 0;

  // Turret modifications
  if (mods.turrets) {
    totalCost += calculateTurretCost(template, mods.turrets);
  }

  // Armor modifications
  if (mods.armor !== undefined && mods.armor !== null) {
    totalCost += calculateArmorCost(template, mods.armor);
  }

  // M-Drive modifications
  if (mods.thrust !== undefined && mods.thrust !== null) {
    totalCost += calculateMDriveCost(template, mods.thrust);
  }

  // J-Drive modifications
  if (mods.jump !== undefined && mods.jump !== null) {
    totalCost += calculateJDriveCost(template, mods.jump);
  }

  // Cargo/Fuel trade-offs don't cost money (just reallocating tonnage)

  return totalCost;
}

/**
 * Calculate cost of turret modifications
 * @param {Object} template - Base ship template
 * @param {Array} modTurrets - Modified turrets array
 * @returns {number} Turret modification cost in credits
 */
function calculateTurretCost(template, modTurrets) {
  const baseTurrets = template.turrets || [];
  let cost = 0;

  for (let i = 0; i < modTurrets.length; i++) {
    const modTurret = modTurrets[i];
    const baseTurret = baseTurrets[i];

    // New turret (didn't exist in base)
    if (!baseTurret) {
      cost += getTurretCost(modTurret);
      continue;
    }

    // Upgraded turret type
    if (modTurret.type !== baseTurret.type) {
      const typeCost = getTurretTypeCost(modTurret.type) - getTurretTypeCost(baseTurret.type);
      cost += Math.max(0, typeCost); // Only charge for upgrades, not downgrades
    }

    // Changed weapons
    const weaponCost = getTurretWeaponsCost(modTurret) - getTurretWeaponsCost(baseTurret);
    cost += Math.max(0, weaponCost); // Only charge for net additions
  }

  return cost;
}

/**
 * Get total cost of a turret (type + weapons)
 * @param {Object} turret - Turret object
 * @returns {number} Total turret cost in credits
 */
function getTurretCost(turret) {
  const typeCost = getTurretTypeCost(turret.type);
  const weaponsCost = getTurretWeaponsCost(turret);
  return typeCost + weaponsCost;
}

/**
 * Get cost of turret type only
 * @param {string} type - Turret type (single, double, triple)
 * @returns {number} Turret type cost in credits
 */
function getTurretTypeCost(type) {
  return TURRET_COSTS[type] || 0;
}

/**
 * Get total cost of weapons in a turret
 * @param {Object} turret - Turret object
 * @returns {number} Total weapons cost in credits
 */
function getTurretWeaponsCost(turret) {
  if (!turret.weapons || turret.weapons.length === 0) {
    return 0;
  }

  return turret.weapons.reduce((total, weaponId) => {
    return total + (WEAPON_COSTS[weaponId] || 0);
  }, 0);
}

/**
 * Calculate cost of armor modification
 * Formula: MCr 0.05 per (tonnage/10) per armor point
 * @param {Object} template - Base ship template
 * @param {number} newArmor - New armor rating
 * @returns {number} Armor modification cost in credits
 */
function calculateArmorCost(template, newArmor) {
  const baseArmor = template.armour || 0;
  const armorIncrease = newArmor - baseArmor;

  if (armorIncrease <= 0) {
    return 0; // No cost for reducing armor
  }

  const tonnage = template.tonnage || 100;
  const tonnageUnits = tonnage / 10;

  return ARMOR_COST_PER_TON_PER_POINT * tonnageUnits * armorIncrease;
}

/**
 * Calculate cost of M-Drive modification
 * Simplified formula: MCr 2.0 per thrust increase per 100t
 * @param {Object} template - Base ship template
 * @param {number} newThrust - New thrust rating
 * @returns {number} M-Drive modification cost in credits
 */
function calculateMDriveCost(template, newThrust) {
  const baseThrust = template.thrust || 0;
  const thrustIncrease = newThrust - baseThrust;

  if (thrustIncrease <= 0) {
    return 0; // No cost for reducing thrust
  }

  const tonnage = template.tonnage || 100;
  const tonnageUnits = tonnage / 100;

  return M_DRIVE_COST_PER_THRUST_PER_100T * tonnageUnits * thrustIncrease;
}

/**
 * Calculate cost of J-Drive modification
 * Simplified formula: MCr 10.0 per jump increase per 100t
 * @param {Object} template - Base ship template
 * @param {number} newJump - New jump rating
 * @returns {number} J-Drive modification cost in credits
 */
function calculateJDriveCost(template, newJump) {
  const baseJump = template.jump || 0;
  const jumpIncrease = newJump - baseJump;

  if (jumpIncrease <= 0) {
    return 0; // No cost for reducing jump
  }

  const tonnage = template.tonnage || 100;
  const tonnageUnits = tonnage / 100;

  return J_DRIVE_COST_PER_JUMP_PER_100T * tonnageUnits * jumpIncrease;
}

/**
 * Format credits as MCr string for display
 * @param {number} credits - Amount in credits
 * @returns {string} Formatted MCr string (e.g., "MCr 2.50")
 */
function formatMCr(credits) {
  const mcr = credits / MCR;
  return `MCr ${mcr.toFixed(2)}`;
}

/**
 * Convert MCr to credits
 * @param {number} mcr - Amount in megacredits
 * @returns {number} Amount in credits
 */
function mcrToCredits(mcr) {
  return Math.round(mcr * MCR);
}

/**
 * Get cost breakdown for display
 * @param {Object} template - Base ship template
 * @param {Object} mods - Modifications object
 * @returns {Object} Cost breakdown with components
 */
function getCostBreakdown(template, mods) {
  const breakdown = {
    baseCost: template.cost || 0,
    turrets: 0,
    armor: 0,
    mDrive: 0,
    jDrive: 0,
    total: 0
  };

  if (!mods || Object.keys(mods).length === 0) {
    breakdown.total = breakdown.baseCost;
    return breakdown;
  }

  if (mods.turrets) {
    breakdown.turrets = calculateTurretCost(template, mods.turrets);
  }

  if (mods.armor !== undefined && mods.armor !== null) {
    breakdown.armor = calculateArmorCost(template, mods.armor);
  }

  if (mods.thrust !== undefined && mods.thrust !== null) {
    breakdown.mDrive = calculateMDriveCost(template, mods.thrust);
  }

  if (mods.jump !== undefined && mods.jump !== null) {
    breakdown.jDrive = calculateJDriveCost(template, mods.jump);
  }

  const modificationCost = breakdown.turrets + breakdown.armor + breakdown.mDrive + breakdown.jDrive;
  breakdown.total = breakdown.baseCost + modificationCost;
  breakdown.modificationCost = modificationCost;

  return breakdown;
}

// ======== EXPORTS ========

// Node.js/CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateModificationCost,
    calculateTurretCost,
    calculateArmorCost,
    calculateMDriveCost,
    calculateJDriveCost,
    getTurretCost,
    getTurretTypeCost,
    getTurretWeaponsCost,
    formatMCr,
    mcrToCredits,
    getCostBreakdown,
    // Export constants for reference
    TURRET_COSTS,
    WEAPON_COSTS,
    MCR
  };
}

// Browser/window export (for backward compatibility)
if (typeof window !== 'undefined') {
  window.ShipCosts = {
    calculateModificationCost,
    calculateTurretCost,
    calculateArmorCost,
    calculateMDriveCost,
    calculateJDriveCost,
    getTurretCost,
    getTurretTypeCost,
    getTurretWeaponsCost,
    formatMCr,
    mcrToCredits,
    getCostBreakdown,
    TURRET_COSTS,
    WEAPON_COSTS,
    MCR
  };
}
