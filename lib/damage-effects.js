// Stage 10: Damage Effects System
// System-specific effects based on critical hit severity

const { DiceRoller } = require('./dice');

/**
 * Get M-Drive effects from critical damage
 * Sev 1-4: Control DM penalty, Thrust -1 per severity
 * Sev 5-6: Thrust 0, Hull Severity +1 (Sev 6 only)
 * @param {number} totalSeverity - Total active severity
 * @returns {object} Effects
 */
function getMDriveEffects(totalSeverity) {
  if (totalSeverity === 0) {
    return { controlDM: 0, thrustPenalty: 0, disabled: false };
  }

  if (totalSeverity >= 5) {
    return {
      controlDM: -4,
      thrustPenalty: 999, // Effectively disables thrust
      disabled: true,
      message: 'M-Drive DISABLED'
    };
  }

  return {
    controlDM: -totalSeverity,
    thrustPenalty: totalSeverity,
    disabled: false,
    message: `M-Drive: ${-totalSeverity} control DM, -${totalSeverity} Thrust`
  };
}

/**
 * Get Power Plant effects from critical damage
 * Sev 1-2: Thrust -1, Power -10%
 * Sev 3: Thrust -1, Power -50%
 * Sev 4-6: Thrust 0, Power 0, Hull damage
 * @param {number} totalSeverity
 * @returns {object} Effects
 */
function getPowerPlantEffects(totalSeverity) {
  if (totalSeverity === 0) {
    return { powerPenalty: 0, thrustPenalty: 0, disabled: false };
  }

  if (totalSeverity >= 4) {
    return {
      powerPenalty: 100,
      thrustPenalty: 999,
      disabled: true,
      message: 'Power Plant DESTROYED - No power, no thrust'
    };
  }

  if (totalSeverity === 3) {
    return {
      powerPenalty: 50,
      thrustPenalty: 1,
      disabled: false,
      message: 'Power Plant damaged: -50% power, -1 Thrust'
    };
  }

  return {
    powerPenalty: totalSeverity * 10,
    thrustPenalty: totalSeverity,
    disabled: false,
    message: `Power Plant: -${totalSeverity * 10}% power, -${totalSeverity} Thrust`
  };
}

/**
 * Get Sensors effects from critical damage
 * Severity progressively limits sensor range
 * @param {number} totalSeverity
 * @returns {object} Effects
 */
function getSensorsEffects(totalSeverity) {
  const rangeLimits = {
    0: { maxRange: null, dm: 0, message: 'Sensors operational' },
    1: { maxRange: 'medium', dm: -2, message: 'Sensors: DM-2 beyond Medium' },
    2: { maxRange: 'medium', dm: -999, message: 'Sensors inoperative beyond Medium' },
    3: { maxRange: 'short', dm: -999, message: 'Sensors inoperative beyond Short' },
    4: { maxRange: 'close', dm: -999, message: 'Sensors inoperative beyond Close' },
    5: { maxRange: 'adjacent', dm: -999, message: 'Sensors inoperative beyond Adjacent' },
    6: { maxRange: null, dm: -999, message: 'Sensors DISABLED' }
  };

  const severity = Math.min(totalSeverity, 6);
  return rangeLimits[severity];
}

/**
 * Get Weapon effects from critical damage
 * Sev 1: Bane, Sev 2: Disabled, Sev 3: Destroyed, Sev 4-6: Explosion
 * @param {number} severity - Severity of this specific hit
 * @returns {object} Effects
 */
function getWeaponEffects(severity) {
  if (severity === 0) {
    return { status: 'operational', bane: false, disabled: false };
  }

  if (severity === 1) {
    return {
      status: 'damaged',
      bane: true,
      disabled: false,
      message: 'Weapon has Bane'
    };
  }

  if (severity === 2) {
    return {
      status: 'disabled',
      bane: false,
      disabled: true,
      message: 'Weapon DISABLED'
    };
  }

  if (severity >= 3) {
    return {
      status: 'destroyed',
      bane: false,
      disabled: true,
      destroyed: true,
      explosion: severity >= 4,
      message: severity >= 4 ? 'Weapon EXPLODED' : 'Weapon destroyed'
    };
  }
}

/**
 * Get J-Drive effects from critical damage
 * Any severity disables jump capability
 * @param {number} totalSeverity
 * @returns {object} Effects
 */
function getJDriveEffects(totalSeverity) {
  if (totalSeverity === 0) {
    return { disabled: false, message: 'Jump drive operational' };
  }

  return {
    disabled: true,
    severity: totalSeverity,
    message: `Jump drive DISABLED (Severity ${totalSeverity})`
  };
}

/**
 * Get Computer effects from critical damage
 * @param {number} totalSeverity
 * @returns {object} Effects
 */
function getComputerEffects(totalSeverity) {
  if (totalSeverity === 0) {
    return { dm: 0, disabled: false };
  }

  if (totalSeverity >= 4) {
    return {
      dm: -999,
      disabled: true,
      message: 'Computer OFFLINE'
    };
  }

  // RAW: Computer critical is DM-2 at Sev 1, rating -1 at Sev 2-3 (HG p.49)
  const computerDM = totalSeverity === 1 ? -2 : -(totalSeverity + 1);
  return {
    dm: computerDM,
    disabled: false,
    message: `Computer: DM${computerDM} to all checks`
  };
}

/**
 * Get Armour effects from critical damage
 * Permanent armour reduction
 * @param {number} totalSeverity
 * @returns {object} Effects
 */
function getArmourEffects(totalSeverity) {
  return {
    reduction: totalSeverity,
    message: totalSeverity > 0
      ? `Armour reduced by ${totalSeverity}`
      : 'Armour intact'
  };
}

/**
 * Apply hull critical hit - immediate damage
 * Sev 1-6: 1D/2D/3D/4D/5D/6D damage
 * @param {number} severity
 * @returns {object} Damage result
 */
function applyHullCritical(severity) {
  const dice = new DiceRoller();

  // Roll severity D6
  const roll = dice.roll(severity, 6);

  return {
    damage: roll.total,
    dice: severity,
    rolls: roll.dice,
    message: `Hull critical! ${severity}D6 = ${roll.total} damage`
  };
}

/**
 * Apply crew casualty from critical hit
 * @param {object} ship - Ship state
 * @param {number} severity - Hit severity
 * @returns {object} Casualty result
 */
function applyCrewCasualty(ship, severity) {
  if (!ship.crew) {
    return {
      casualties: 0,
      message: 'No crew to injure'
    };
  }

  // Get all living crew members
  const livingCrew = Object.values(ship.crew).filter(c => c && c.health > 0);

  if (livingCrew.length === 0) {
    return {
      casualties: 0,
      message: 'All crew already incapacitated'
    };
  }

  // Damage random crew member — RAW: crew takes 1D damage per hit (HG p.49)
  const targetCrew = livingCrew[Math.floor(Math.random() * livingCrew.length)];
  const damage = Math.floor(Math.random() * 6) + 1; // 1D6 flat (RAW)

  const previousHealth = targetCrew.health;
  targetCrew.health = Math.max(0, targetCrew.health - damage);

  return {
    casualties: 1,
    crewMember: targetCrew.name,
    damage,
    newHealth: targetCrew.health,
    killed: targetCrew.health === 0,
    message: targetCrew.health === 0
      ? `${targetCrew.name} KILLED (${damage} damage)`
      : `${targetCrew.name} injured: ${previousHealth} → ${targetCrew.health} HP`
  };
}

/**
 * Apply fuel leak from critical hit
 * @param {number} severity
 * @returns {object} Leak details
 */
function applyFuelLeak(severity) {
  const dice = new DiceRoller();

  if (severity === 1) {
    return {
      rate: 'hourly',
      amount: dice.roll('1d6').total,
      message: `Fuel leak: ${dice.roll('1d6').total} tons/hour`
    };
  }

  if (severity === 2) {
    return {
      rate: 'per round',
      amount: dice.roll('1d6').total,
      message: `Fuel leak: ${dice.roll('1d6').total} tons/round`
    };
  }

  if (severity === 3) {
    const percent = dice.roll('1d6').total * 10;
    return {
      rate: 'immediate',
      percent,
      message: `Fuel leak: ${percent}% fuel lost`
    };
  }

  // Severity 4-6: Tank destroyed
  return {
    rate: 'destroyed',
    destroyed: true,
    message: 'Fuel tank DESTROYED'
  };
}

module.exports = {
  getMDriveEffects,
  getPowerPlantEffects,
  getSensorsEffects,
  getWeaponEffects,
  getJDriveEffects,
  getComputerEffects,
  getArmourEffects,
  applyHullCritical,
  applyCrewCasualty,
  applyFuelLeak
};
