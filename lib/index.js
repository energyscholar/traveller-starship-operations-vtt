// ======== TRAVELLER COMBAT VTT - SHIP VALIDATION LIBRARY ========
// Centralized exports for all ship validation modules

const JumpDrive = require('./ship-jump-drive');
const ManoeuvreDrive = require('./ship-manoeuvre-drive');
const PowerPlant = require('./ship-power-plant');
const Sensors = require('./ship-sensors');
const Bridge = require('./ship-bridge');
const Staterooms = require('./ship-staterooms');
const Weapons = require('./ship-weapons');
const Armour = require('./ship-armour');

/**
 * Ship Validation Library
 *
 * Complete ship design validation based on Mongoose Traveller 2E High Guard 2022
 *
 * @module ShipValidation
 * @exports {Object} All ship component validation modules
 */
module.exports = {
  // Individual component modules
  JumpDrive,
  ManoeuvreDrive,
  PowerPlant,
  Sensors,
  Bridge,
  Staterooms,
  Weapons,
  Armour,

  // Quick access to common functions
  validators: {
    validateJumpDrive: JumpDrive.validateJumpDrive,
    validateManoeuvreDrive: ManoeuvreDrive.validateManoeuvreDrive,
    validatePowerPlant: PowerPlant.validatePowerPlant,
    validateSensors: Sensors.validateSensors,
    validateBridge: Bridge.validateBridge,
    validateStaterooms: Staterooms.validateStaterooms,
    validateWeapons: Weapons.validateWeapons,
    validateArmour: Armour.validateArmour
  },

  // Package calculators
  packages: {
    calculateJumpPackage: JumpDrive.calculateJumpPackage,
    calculateManoeuvrePackage: ManoeuvreDrive.calculateManoeuvrePackage,
    calculatePowerPackage: PowerPlant.calculatePowerPackage,
    calculateSensorPackage: Sensors.calculateSensorPackage,
    calculateStateroomPackage: Staterooms.calculateStateroomPackage,
    calculateWeaponsPackage: Weapons.calculateWeaponsPackage,
    calculateArmourPackage: Armour.calculateArmourPackage
  },

  // Utility functions
  utils: {
    calculateHardpoints: Weapons.calculateHardpoints,
    calculateBasicPower: PowerPlant.calculateBasicPower,
    calculateTotalPowerRequirement: PowerPlant.calculateTotalPowerRequirement,
    calculateCrewRequirements: Staterooms.calculateCrewRequirements,
    getBestPowerPlantType: PowerPlant.getBestPowerPlantType,
    getBestSensorGrade: Sensors.getBestSensorGrade,
    getBestArmourType: Armour.getBestArmourType,
    getRecommendedBridgeType: Bridge.getRecommendedBridgeType
  }
};

/**
 * Validate complete ship design
 *
 * Performs comprehensive validation of all ship components and checks
 * power requirements, tonnage allocation, and technical compatibility.
 *
 * @param {Object} shipSpec - Ship specification object with the following structure:
 *   @param {Object} shipSpec.hull - Hull specification { tonnage: number }
 *   @param {Object} shipSpec.drives - Drive specification { jump: {rating}, manoeuvre: {thrust} }
 *   @param {Object} shipSpec.power - Power plant specification { output: number, type: string }
 *   @param {Object} shipSpec.sensors - Sensor specification { grade: string }
 *   @param {Object} shipSpec.bridge - Bridge specification { type: string }
 *   @param {Object} shipSpec.staterooms - Staterooms specification { standard: {count}, luxury: {count} }
 *   @param {Array} shipSpec.weapons - Array of weapon mount objects
 *   @param {Object} shipSpec.armour - Armour specification { type: string, rating: number }
 *   @param {number} shipSpec.techLevel - Ship's technology level
 *
 * @returns {Object} Comprehensive validation results:
 *   @returns {boolean} valid - Overall validation status
 *   @returns {Array<string>} errors - Critical errors that prevent ship from functioning
 *   @returns {Array<string>} warnings - Non-critical issues or recommendations
 *   @returns {Object} componentValidation - Individual component validation results
 *   @returns {Object} powerAnalysis - Power requirement vs. availability analysis
 *   @returns {Object} tonnageAnalysis - Tonnage allocation breakdown
 */
function validateCompleteShip(shipSpec) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    componentValidation: {},
    powerAnalysis: {},
    tonnageAnalysis: {}
  };

  const { hull, drives, power, sensors, bridge, staterooms, weapons, armour, techLevel } = shipSpec;

  if (!hull || !hull.tonnage) {
    results.valid = false;
    results.errors.push('Hull specification with tonnage is required');
    return results;
  }

  if (!techLevel) {
    results.valid = false;
    results.errors.push('Tech level is required');
    return results;
  }

  let totalTonnage = 0;
  let totalPowerRequired = 0;

  // Validate jump drive
  if (drives && drives.jump) {
    const jumpResult = JumpDrive.validateJumpDrive(
      hull.tonnage,
      drives.jump.rating,
      techLevel
    );
    results.componentValidation.jumpDrive = jumpResult;
    if (!jumpResult.valid) results.valid = false;
    results.errors.push(...jumpResult.errors);
    results.warnings.push(...jumpResult.warnings);

    if (jumpResult.stats) {
      totalTonnage += jumpResult.stats.driveTonnage + jumpResult.stats.fuelRequired;
      totalPowerRequired += jumpResult.stats.powerRequired;
    }
  }

  // Validate manoeuvre drive
  if (drives && drives.manoeuvre) {
    const manoeuvreResult = ManoeuvreDrive.validateManoeuvreDrive(
      hull.tonnage,
      drives.manoeuvre.thrust,
      techLevel
    );
    results.componentValidation.manoeuvreDrive = manoeuvreResult;
    if (!manoeuvreResult.valid) results.valid = false;
    results.errors.push(...manoeuvreResult.errors);
    results.warnings.push(...manoeuvreResult.warnings);

    if (manoeuvreResult.stats) {
      totalTonnage += manoeuvreResult.stats.driveTonnage;
      totalPowerRequired += manoeuvreResult.stats.powerRequired;
    }
  }

  // Validate power plant
  if (power) {
    const powerResult = PowerPlant.validatePowerPlant(
      power.output,
      power.type,
      techLevel
    );
    results.componentValidation.powerPlant = powerResult;
    if (!powerResult.valid) results.valid = false;
    results.errors.push(...powerResult.errors);
    results.warnings.push(...powerResult.warnings);

    if (powerResult.stats) {
      totalTonnage += powerResult.stats.tonnage;
    }
  }

  // Validate sensors
  if (sensors) {
    const sensorResult = Sensors.validateSensors(sensors.grade, techLevel);
    results.componentValidation.sensors = sensorResult;
    if (!sensorResult.valid) results.valid = false;
    results.errors.push(...sensorResult.errors);
    results.warnings.push(...sensorResult.warnings);

    if (sensorResult.stats) {
      totalTonnage += sensorResult.stats.tonnage;
      totalPowerRequired += sensorResult.stats.power;
    }
  }

  // Validate bridge
  if (bridge) {
    const bridgeResult = Bridge.validateBridge(hull.tonnage, bridge.type, techLevel);
    results.componentValidation.bridge = bridgeResult;
    if (!bridgeResult.valid) results.valid = false;
    results.errors.push(...bridgeResult.errors);
    results.warnings.push(...bridgeResult.warnings);

    if (bridgeResult.stats) {
      totalTonnage += bridgeResult.stats.tonnage;
    }
  }

  // Validate staterooms
  if (staterooms) {
    const stateroomResult = Staterooms.validateStaterooms(staterooms, techLevel);
    results.componentValidation.staterooms = stateroomResult;
    if (!stateroomResult.valid) results.valid = false;
    results.errors.push(...stateroomResult.errors);
    results.warnings.push(...stateroomResult.warnings);

    if (stateroomResult.stats) {
      totalTonnage += stateroomResult.stats.totalTonnage;
    }
  }

  // Validate weapons
  if (weapons && Array.isArray(weapons)) {
    const hardpoints = Weapons.calculateHardpoints(hull.tonnage);
    let weaponPower = 0;
    let weaponTonnage = 0;

    weapons.forEach((weapon, index) => {
      const weaponResult = Weapons.validateWeapons(
        weapon.mount,
        weapon.weapons || [],
        techLevel
      );
      results.componentValidation[`weapon_${index + 1}`] = weaponResult;
      if (!weaponResult.valid) results.valid = false;
      results.errors.push(...weaponResult.errors);
      results.warnings.push(...weaponResult.warnings);

      if (weaponResult.stats) {
        weaponPower += weaponResult.stats.totalPower;
        weaponTonnage += weaponResult.stats.turretTonnage;
      }
    });

    totalPowerRequired += weaponPower;
    totalTonnage += weaponTonnage;

    if (weapons.length > hardpoints) {
      results.valid = false;
      results.errors.push(`Too many weapon mounts (${weapons.length}) for available hardpoints (${hardpoints})`);
    }
  }

  // Validate armour
  if (armour) {
    const armourResult = Armour.validateArmour(
      hull.tonnage,
      armour.type,
      armour.rating,
      techLevel
    );
    results.componentValidation.armour = armourResult;
    if (!armourResult.valid) results.valid = false;
    results.errors.push(...armourResult.errors);
    results.warnings.push(...armourResult.warnings);

    if (armourResult.stats) {
      totalTonnage += armourResult.stats.tonnage;
    }
  }

  // Basic power requirement
  const basicPower = PowerPlant.calculateBasicPower(hull.tonnage);
  totalPowerRequired += basicPower;

  // Power analysis
  results.powerAnalysis = {
    required: totalPowerRequired,
    available: power ? power.output : 0,
    basic: basicPower,
    manoeuvre: drives && drives.manoeuvre ? ManoeuvreDrive.calculateManoeuvrePower(hull.tonnage, drives.manoeuvre.thrust) : 0,
    jump: drives && drives.jump ? hull.tonnage * drives.jump.rating * 0.1 : 0,
    sensors: sensors && results.componentValidation.sensors && results.componentValidation.sensors.stats ?
      results.componentValidation.sensors.stats.power : 0,
    weapons: weapons ? totalPowerRequired - basicPower -
      (drives && drives.manoeuvre ? ManoeuvreDrive.calculateManoeuvrePower(hull.tonnage, drives.manoeuvre.thrust) : 0) -
      (drives && drives.jump ? hull.tonnage * drives.jump.rating * 0.1 : 0) -
      (sensors && results.componentValidation.sensors && results.componentValidation.sensors.stats ?
        results.componentValidation.sensors.stats.power : 0) : 0,
    surplus: power ? power.output - totalPowerRequired : 0
  };

  if (power && totalPowerRequired > power.output) {
    results.valid = false;
    results.errors.push(`Insufficient power: ${totalPowerRequired} required, ${power.output} available (deficit: ${totalPowerRequired - power.output})`);
  } else if (power && totalPowerRequired < power.output * 0.5) {
    results.warnings.push(`Power plant oversized: ${power.output} available, only ${totalPowerRequired} required`);
  }

  // Tonnage analysis
  results.tonnageAnalysis = {
    hull: hull.tonnage,
    allocated: totalTonnage,
    remaining: hull.tonnage - totalTonnage
  };

  if (totalTonnage > hull.tonnage) {
    results.valid = false;
    results.errors.push(`Total tonnage (${totalTonnage}t) exceeds hull capacity (${hull.tonnage}t)`);
  }

  return results;
}

module.exports.validateCompleteShip = validateCompleteShip;
