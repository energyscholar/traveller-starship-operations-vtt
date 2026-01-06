/**
 * AR-250: Engineer Role State
 *
 * Pure state extraction for engineer panel.
 * No HTML, no formatting - just structured data.
 *
 * @module lib/engine/roles/engineer-state
 */

const DEFAULT_POWER = {
  mDrive: 75,
  weapons: 75,
  sensors: 75,
  lifeSupport: 75,
  computer: 75
};

/**
 * Get complete engineer panel state
 * @param {object} shipState - Current ship state
 * @param {object} template - Ship template data
 * @param {object} systemStatus - System damage status
 * @param {array} damagedSystems - List of damaged system names
 * @param {object} fuelStatus - Fuel status object
 * @param {array} repairQueue - Active repair queue
 * @returns {object} Pure state object
 */
function getEngineerState(shipState, template, systemStatus, damagedSystems, fuelStatus, repairQueue = []) {
  const power = getPowerState(shipState);
  const fuel = getFuelState(shipState, template, fuelStatus);

  return {
    power,
    fuel,
    systems: getSystemsState(systemStatus, damagedSystems),
    repairs: getRepairState(repairQueue),
    warnings: getPowerWarnings(shipState.powerEffects || {}),
    preset: shipState.powerPreset || 'standard'
  };
}

/**
 * Calculate power allocation state
 * @param {object} shipState
 * @returns {object}
 */
function getPowerState(shipState) {
  const power = { ...DEFAULT_POWER, ...(shipState.power || {}) };
  const totalUsed = Object.values(power).reduce((a, b) => a + b, 0);
  const maxPower = Object.keys(power).length * 100;
  const percentUsed = Math.round((totalUsed / maxPower) * 100);

  return {
    allocation: power,
    totalUsed,
    maxPower,
    percentUsed,
    overloaded: percentUsed > 100,
    high: percentUsed > 80 && percentUsed <= 100,
    effects: shipState.powerEffects || {
      weaponsDM: 0,
      sensorsDM: 0,
      thrustMultiplier: 1.0
    }
  };
}

/**
 * Calculate fuel state
 * @param {object} shipState
 * @param {object} template
 * @param {object} fuelStatus
 * @returns {object}
 */
function getFuelState(shipState, template, fuelStatus) {
  const rawFs = fuelStatus || {};

  const total = rawFs.total ?? shipState.fuel ?? template?.fuel ?? 40;
  const max = rawFs.max ?? template?.fuel ?? 40;

  const breakdown = {
    refined: rawFs.breakdown?.refined ?? total,
    unrefined: rawFs.breakdown?.unrefined ?? 0,
    processed: rawFs.breakdown?.processed ?? 0
  };

  const percentFull = rawFs.percentFull ?? Math.round((total / max) * 100);

  return {
    total,
    max,
    breakdown,
    percentFull,
    processing: rawFs.processing ?? null,
    hasFuelProcessor: rawFs.fuelProcessor ?? template?.fuelProcessor ?? false,
    jumpFuel: template?.jumpFuel ?? Math.round(max * 0.1),
    canJump: total >= (template?.jumpFuel ?? Math.round(max * 0.1)),
    lowFuel: percentFull < 25,
    criticalFuel: percentFull < 10
  };
}

/**
 * Get systems damage state
 * @param {object} systemStatus
 * @param {array} damagedSystems
 * @returns {object}
 */
function getSystemsState(systemStatus, damagedSystems) {
  const systems = systemStatus || {};
  const damaged = damagedSystems || [];

  // Core systems to track
  const coreSystemKeys = ['mDrive', 'jDrive', 'powerPlant', 'sensors', 'computer', 'hull', 'armour'];

  const systemStates = {};
  for (const key of coreSystemKeys) {
    const status = systems[key];
    systemStates[key] = {
      operational: !status || (status.totalSeverity || 0) === 0,
      severity: status?.totalSeverity || 0,
      disabled: status?.disabled || false,
      crits: status?.crits || []
    };
  }

  return {
    states: systemStates,
    damagedList: damaged,
    hasDamage: damaged.length > 0,
    criticalCount: damaged.filter(d =>
      systems[d]?.disabled || (systems[d]?.totalSeverity || 0) >= 3
    ).length
  };
}

/**
 * Get repair queue state
 * @param {array} repairQueue
 * @returns {object}
 */
function getRepairState(repairQueue) {
  const queue = repairQueue || [];

  return {
    queue,
    count: queue.length,
    active: queue.length > 0,
    currentRepair: queue[0] || null
  };
}

/**
 * Calculate power effect warnings
 * @param {object} powerEffects
 * @returns {array}
 */
function getPowerWarnings(powerEffects) {
  const warnings = [];

  if (powerEffects.weaponsDM < 0) {
    warnings.push({
      system: 'Weapons',
      modifier: powerEffects.weaponsDM,
      text: `Weapons: ${powerEffects.weaponsDM} DM`
    });
  }

  if (powerEffects.sensorsDM < 0) {
    warnings.push({
      system: 'Sensors',
      modifier: powerEffects.sensorsDM,
      text: `Sensors: ${powerEffects.sensorsDM} DM`
    });
  }

  if (powerEffects.thrustMultiplier < 1) {
    const percent = Math.round(powerEffects.thrustMultiplier * 100);
    warnings.push({
      system: 'Thrust',
      modifier: powerEffects.thrustMultiplier,
      text: `Thrust: ${percent}%`
    });
  }

  return warnings;
}

/**
 * Power preset definitions
 */
const POWER_PRESETS = {
  combat: { mDrive: 100, weapons: 100, sensors: 100, lifeSupport: 75, computer: 100 },
  silent: { mDrive: 25, weapons: 0, sensors: 25, lifeSupport: 50, computer: 50 },
  jump: { mDrive: 50, weapons: 0, sensors: 50, lifeSupport: 100, computer: 100 },
  standard: { mDrive: 75, weapons: 75, sensors: 75, lifeSupport: 75, computer: 75 }
};

/**
 * Get power preset configuration
 * @param {string} presetName
 * @returns {object}
 */
function getPowerPreset(presetName) {
  return POWER_PRESETS[presetName] || POWER_PRESETS.standard;
}

module.exports = {
  getEngineerState,
  getPowerState,
  getFuelState,
  getSystemsState,
  getRepairState,
  getPowerWarnings,
  getPowerPreset,
  POWER_PRESETS,
  DEFAULT_POWER
};
