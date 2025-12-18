/**
 * AR-194: Ship System Failure Reason Registry
 * Scalable data-driven failure types for each ship system
 */

const FAILURE_REASONS = {
  mDrive: [
    {
      id: 'mdrive-001',
      name: 'Thrust Plate Misalignment',
      description: 'Gravitational thrust plates out of sync',
      severity: 'minor',
      effect: 'thrust_reduced',
      effectValue: 1,
      repairDM: 0,
      repairTime: '1d6',
      flavorText: 'The ship shudders slightly during acceleration'
    },
    {
      id: 'mdrive-002',
      name: 'Plasma Conduit Leak',
      description: 'Minor plasma leak in drive housing',
      severity: 'major',
      effect: 'thrust_reduced',
      effectValue: 2,
      repairDM: -2,
      repairTime: '2d6',
      flavorText: 'Warning lights flash as plasma pressure drops'
    }
  ],

  jDrive: [
    {
      id: 'jdrive-001',
      name: 'Jump Capacitor Degradation',
      description: 'Capacitors losing charge retention',
      severity: 'minor',
      effect: 'jump_charge_slow',
      effectValue: null,
      repairDM: -1,
      repairTime: '2d6',
      flavorText: 'Jump drive takes longer to charge'
    },
    {
      id: 'jdrive-002',
      name: 'Zuchai Crystal Fracture',
      description: 'Hairline crack in primary jump crystal',
      severity: 'critical',
      effect: 'jump_disabled',
      effectValue: null,
      repairDM: -4,
      repairTime: '4d6',
      flavorText: 'Jump drive offline - crystal replacement required'
    }
  ],

  powerPlant: [
    {
      id: 'power-001',
      name: 'Fuel Injector Clog',
      description: 'Contaminated fuel blocking injectors',
      severity: 'minor',
      effect: 'power_reduced',
      effectValue: 10,
      repairDM: +1,
      repairTime: '1d6',
      flavorText: 'Power fluctuations throughout the ship'
    },
    {
      id: 'power-002',
      name: 'Fusion Containment Fluctuation',
      description: 'Magnetic containment field unstable',
      severity: 'critical',
      effect: 'power_emergency',
      effectValue: 50,
      repairDM: -3,
      repairTime: '3d6',
      flavorText: 'EMERGENCY: Fusion containment critical'
    }
  ],

  sensors: [
    {
      id: 'sensor-001',
      name: 'Array Calibration Drift',
      description: 'Sensor arrays out of alignment',
      severity: 'minor',
      effect: 'sensor_dm_penalty',
      effectValue: -1,
      repairDM: 0,
      repairTime: '1d6',
      flavorText: 'Contacts appearing fuzzy on displays'
    },
    {
      id: 'sensor-002',
      name: 'Active Emitter Burnout',
      description: 'Primary radar emitter failed',
      severity: 'major',
      effect: 'active_sensors_disabled',
      effectValue: null,
      repairDM: -2,
      repairTime: '2d6',
      flavorText: 'Active sensors offline - passive only'
    }
  ],

  lifeSupport: [
    {
      id: 'life-001',
      name: 'CO2 Scrubber Saturation',
      description: 'Scrubber filters need replacement',
      severity: 'minor',
      effect: 'air_quality_warning',
      effectValue: null,
      repairDM: +2,
      repairTime: '1d3',
      flavorText: 'Air feels stale, crew reports headaches'
    },
    {
      id: 'life-002',
      name: 'Water Recycler Issue',
      description: 'Bacterial growth in water system',
      severity: 'major',
      effect: 'water_rationing',
      effectValue: null,
      repairDM: -1,
      repairTime: '2d6',
      flavorText: 'Water tastes off - rationing recommended'
    }
  ],

  computer: [
    {
      id: 'comp-001',
      name: 'Memory Corruption',
      description: 'Data corruption in secondary storage',
      severity: 'minor',
      effect: 'software_glitch',
      effectValue: null,
      repairDM: +1,
      repairTime: '1d3',
      flavorText: 'Occasional display glitches'
    }
  ]
};

/**
 * Get a random failure reason for a system
 */
function getRandomFailure(system) {
  const reasons = FAILURE_REASONS[system];
  if (!reasons || reasons.length === 0) return null;
  return reasons[Math.floor(Math.random() * reasons.length)];
}

/**
 * Get failure by ID
 */
function getFailureById(failureId) {
  for (const system of Object.keys(FAILURE_REASONS)) {
    const found = FAILURE_REASONS[system].find(f => f.id === failureId);
    if (found) return { ...found, system };
  }
  return null;
}

/**
 * Get all failures for a system
 */
function getFailuresForSystem(system) {
  return FAILURE_REASONS[system] || [];
}

/**
 * Map severity string to numeric value for damage system
 * @param {string} severity - 'minor', 'major', or 'critical'
 * @returns {number} 1, 2, or 3
 */
function severityToNumber(severity) {
  const map = { minor: 1, major: 2, critical: 3 };
  return map[severity] || 1;
}

/**
 * Roll dice notation (e.g., "2d6", "1d3")
 */
function rollDiceNotation(notation) {
  const match = notation.match(/^(\d+)d(\d+)$/);
  if (!match) return 1;
  const [, count, sides] = match.map(Number);
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}

module.exports = {
  FAILURE_REASONS,
  getRandomFailure,
  getFailureById,
  getFailuresForSystem,
  severityToNumber,
  rollDiceNotation
};
