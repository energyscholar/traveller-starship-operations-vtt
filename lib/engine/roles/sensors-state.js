/**
 * AR-250: Sensor Operator Role State
 *
 * Pure state extraction for sensors panel.
 * No HTML, no formatting - just structured data.
 *
 * @module lib/engine/roles/sensors-state
 */

/**
 * Scan level names
 */
const SCAN_LEVELS = ['Unknown', 'Passive', 'Active', 'Deep'];

/**
 * Range band to approximate distance
 */
const RANGE_BAND_KM = {
  Adjacent: '< 1 km',
  Close: '1-10 km',
  Short: '10-1,250 km',
  Medium: '1,250-10,000 km',
  Long: '10,000-25,000 km',
  VeryLong: '25,000-50,000 km',
  Distant: '50,000+ km'
};

/**
 * Contact types that are stations
 */
const STATION_TYPES = ['Station', 'Starport', 'Base'];

/**
 * Contact types that are ships
 */
const SHIP_TYPES = ['Ship', 'Patrol', 'Free Trader', 'Far Trader', 'System Defense Boat'];

/**
 * Get complete sensors panel state
 * @param {object} shipState - Current ship state
 * @param {array} contacts - Sensor contacts
 * @param {object} environmentalData - Environmental monitoring data
 * @param {string} panelMode - 'collapsed' or 'expanded'
 * @returns {object} Pure state object
 */
function getSensorsState(shipState, contacts, environmentalData = null, panelMode = 'expanded') {
  const categorized = categorizeContacts(contacts);
  const ewStatus = getEWStatus(shipState);
  const threatAssessment = assessThreats(contacts);

  return {
    panelMode,

    contacts: categorized,

    threats: threatAssessment,

    ew: ewStatus,

    lock: {
      target: shipState?.sensorLock || null,
      hasLock: !!shipState?.sensorLock
    },

    environmental: environmentalData ? {
      data: environmentalData,
      hasData: true
    } : { hasData: false },

    summary: {
      totalNonCelestial: categorized.counts.ships + categorized.counts.stations + categorized.counts.unknowns,
      statusIcon: threatAssessment.hasThreats ? 'red' :
                  categorized.counts.unknowns > 0 ? 'yellow' : 'green',
      statusText: threatAssessment.hasThreats ? 'THREATS' : 'Clear'
    }
  };
}

/**
 * Categorize contacts by type
 * @param {array} contacts
 * @returns {object}
 */
function categorizeContacts(contacts) {
  const all = contacts || [];

  const celestials = all.filter(c => c.celestial);
  const stations = all.filter(c => !c.celestial && c.type && STATION_TYPES.includes(c.type));
  const ships = all.filter(c => !c.celestial && c.type && SHIP_TYPES.includes(c.type));
  const unknowns = all.filter(c => !c.celestial && (!c.type || c.type === 'unknown'));

  return {
    all,
    celestials,
    stations,
    ships,
    unknowns,
    counts: {
      total: all.length,
      celestials: celestials.length,
      stations: stations.length,
      ships: ships.length,
      unknowns: unknowns.length
    }
  };
}

/**
 * Get Electronic Warfare status
 * @param {object} shipState
 * @returns {object}
 */
function getEWStatus(shipState) {
  const ecmActive = shipState?.ecm || shipState?.ecmActive || false;
  const eccmActive = shipState?.eccm || shipState?.eccmActive || false;
  const stealthActive = shipState?.stealth || false;

  const active = [];
  if (stealthActive) active.push('Stealth');
  if (ecmActive) active.push('ECM');
  if (eccmActive) active.push('ECCM');

  return {
    ecm: ecmActive,
    eccm: eccmActive,
    stealth: stealthActive,
    activeList: active,
    hasActiveEW: active.length > 0
  };
}

/**
 * Assess threat contacts
 * @param {array} contacts
 * @returns {object}
 */
function assessThreats(contacts) {
  const all = contacts || [];

  // Threats: hostile marking OR unknown ship
  const threats = all.filter(c =>
    !c.celestial &&
    (c.marking === 'hostile' || (c.type === 'Ship' && c.marking === 'unknown'))
  );

  const hostile = all.filter(c => c.marking === 'hostile');

  return {
    list: threats,
    count: threats.length,
    hasThreats: threats.length > 0,
    hostileCount: hostile.length
  };
}

/**
 * Get contact scan state
 * @param {object} contact
 * @returns {object}
 */
function getContactScanState(contact) {
  const scanLevel = contact.scan_level || 0;

  return {
    level: scanLevel,
    levelName: SCAN_LEVELS[scanLevel] || 'Unknown',
    canScanDeeper: scanLevel < 3,
    showType: scanLevel >= 1,
    showName: scanLevel >= 2,
    showDetails: scanLevel >= 3
  };
}

/**
 * Get display info for contact based on scan level
 * @param {object} contact
 * @returns {object}
 */
function getContactDisplayInfo(contact) {
  const scan = getContactScanState(contact);

  return {
    name: scan.showName ? (contact.name || contact.transponder || '???') : `C-${(contact.id || '').slice(0, 4)}`,
    type: scan.showType ? (contact.type || '???') : '???',
    rangeBand: contact.range_band || '???',
    rangeKm: RANGE_BAND_KM[contact.range_band] || contact.range_band || '???',
    bearing: contact.bearing || 0,
    scanLevel: scan.levelName,
    tonnage: scan.showDetails ? contact.tonnage : null,
    canScanDeeper: scan.canScanDeeper,
    isHostile: contact.marking === 'hostile',
    isUnknown: !contact.marking || contact.marking === 'unknown',
    isFriendly: contact.marking === 'friendly'
  };
}

/**
 * Get sensor DM based on grade
 * @param {string} sensorGrade
 * @returns {number}
 */
function getSensorDM(sensorGrade) {
  const grades = {
    'Civilian': -2,
    'Basic': -1,
    'Standard': 0,
    'Military': 1,
    'Advanced': 2,
    'Cutting Edge': 3
  };
  return grades[sensorGrade] || 0;
}

/**
 * Calculate ECM effectiveness
 * @param {object} shipState
 * @param {object} targetState
 * @returns {object}
 */
function calculateECMEffectiveness(shipState, targetState) {
  const myECM = shipState?.ecm ? 1 : 0;
  const theirECCM = targetState?.eccm ? 1 : 0;
  const netEffect = myECM - theirECCM;

  return {
    myECM,
    theirECCM,
    netEffect,
    effective: netEffect > 0,
    description: netEffect > 0 ? 'ECM effective' :
                 netEffect < 0 ? 'ECCM countered' : 'Contested'
  };
}

// ========================================
// AR-255: ECM/ECCM Combat Mechanics
// Based on High Guard 2022 rules
// ========================================

/**
 * Sensor grade DM table (High Guard p.21, RAW)
 */
const SENSOR_GRADE_DMS = {
  'Basic': -4,
  'Civilian': -2,
  'Military': 0,
  'Improved': 1,
  'Advanced': 2,
  'Very Advanced': 3  // No RAW value, extrapolated as Advanced+1
};

/**
 * Get sensor attack DM based on grade
 * @param {string} sensorGrade - Sensor grade name
 * @returns {number} Attack modifier
 */
function getSensorAttackDM(sensorGrade) {
  return SENSOR_GRADE_DMS[sensorGrade] ?? 0;
}

/**
 * Calculate ECM penalty to incoming attacks
 * ECM provides -2 DM to incoming fire if target doesn't have ECCM
 * @param {object} defenderState - Defending ship state
 * @param {object} attackerState - Attacking ship state
 * @returns {number} Attack penalty (negative = harder to hit)
 */
function calculateECMPenalty(defenderState, attackerState) {
  const defenderECM = defenderState?.ecm || defenderState?.ecmActive;
  const attackerECCM = attackerState?.eccm || attackerState?.eccmActive;

  if (!defenderECM) return 0;
  if (attackerECCM) return -1; // Partial counter
  return -2; // Full ECM effect
}

/**
 * Calculate ECCM bonus to own attacks
 * ECCM provides +1 DM to own fire vs targets using ECM
 * @param {object} attackerState - Attacking ship state
 * @param {object} defenderState - Defending ship state
 * @returns {number} Attack bonus
 */
function calculateECCMBonus(attackerState, defenderState) {
  const attackerECCM = attackerState?.eccm || attackerState?.eccmActive;
  const defenderECM = defenderState?.ecm || defenderState?.ecmActive;

  if (!attackerECCM) return 0;
  if (defenderECM) return 1; // Counter their ECM
  return 0; // ECCM has no effect if target isn't jamming
}

/**
 * Calculate total sensor-related attack modifiers
 * @param {object} attackerState - Attacking ship state
 * @param {object} defenderState - Defending ship state
 * @param {string} attackerSensorGrade - Attacker's sensor grade
 * @returns {object} Breakdown of modifiers
 */
function calculateSensorAttackModifiers(attackerState, defenderState, attackerSensorGrade = 'Civilian') {
  const sensorDM = getSensorAttackDM(attackerSensorGrade);
  const ecmPenalty = calculateECMPenalty(defenderState, attackerState);
  const eccmBonus = calculateECCMBonus(attackerState, defenderState);
  const total = sensorDM + ecmPenalty + eccmBonus;

  return {
    sensorDM,
    ecmPenalty,
    eccmBonus,
    total,
    breakdown: [
      sensorDM !== 0 ? `${formatDM(sensorDM)} sensors` : null,
      ecmPenalty !== 0 ? `${formatDM(ecmPenalty)} ECM` : null,
      eccmBonus !== 0 ? `${formatDM(eccmBonus)} ECCM` : null
    ].filter(Boolean)
  };
}

/**
 * Format DM for display
 * @param {number} dm
 * @returns {string}
 */
function formatDM(dm) {
  return dm >= 0 ? `+${dm}` : `${dm}`;
}

/**
 * Sensor lock state
 * RAW (CRB p161): Locked target → attacker rolls 3D6 keep best 2 (Boon)
 * See lib/operations/combat-engine.js rollAttackWithBoon() for roll implementation.
 */

/**
 * Check if sensor lock grants Boon on attack
 * @param {object} attackerState - Attacker ship state
 * @param {string} targetId - Target being fired upon
 * @param {boolean} isGuidedWeapon - Whether weapon is guided (missiles)
 * @returns {{ isBoon: boolean }} Boon flag for attack roll
 */
function calculateSensorLockBonus(attackerState, targetId, isGuidedWeapon = false) {
  if (!isGuidedWeapon) return { isBoon: false };
  if (attackerState?.sensorLock === targetId) return { isBoon: true };
  return { isBoon: false };
}

/**
 * Check if ship can use ECM (requires Military+ sensors)
 * @param {string} sensorGrade
 * @returns {boolean}
 */
function canUseECM(sensorGrade) {
  const ecmCapableSensors = ['Military', 'Advanced', 'Very Advanced'];
  return ecmCapableSensors.includes(sensorGrade);
}

/**
 * Get comprehensive EW combat state
 * @param {object} shipState - Own ship state
 * @param {object} targetState - Target ship state (for attack calculations)
 * @param {string} sensorGrade - Own sensor grade
 * @returns {object} EW state for combat
 */
function getEWCombatState(shipState, targetState, sensorGrade = 'Civilian') {
  const attackMods = calculateSensorAttackModifiers(shipState, targetState, sensorGrade);
  const defenseMods = calculateSensorAttackModifiers(targetState, shipState, targetState?.sensorGrade || 'Civilian');

  return {
    attack: {
      total: attackMods.total,
      breakdown: attackMods.breakdown,
      sensorDM: attackMods.sensorDM,
      ecmPenalty: attackMods.ecmPenalty,
      eccmBonus: attackMods.eccmBonus
    },
    defense: {
      ecmProviding: calculateECMPenalty({ ecm: true, eccm: false }, targetState),
      eccmCountering: targetState?.eccm ? 1 : 0
    },
    capabilities: {
      canECM: canUseECM(sensorGrade),
      ecmActive: !!shipState?.ecm,
      eccmActive: !!shipState?.eccm,
      hasLock: !!shipState?.sensorLock
    }
  };
}

module.exports = {
  getSensorsState,
  categorizeContacts,
  getEWStatus,
  assessThreats,
  getContactScanState,
  getContactDisplayInfo,
  getSensorDM,
  calculateECMEffectiveness,
  // AR-255: ECM/ECCM combat mechanics
  SENSOR_GRADE_DMS,
  getSensorAttackDM,
  calculateECMPenalty,
  calculateECCMBonus,
  calculateSensorAttackModifiers,
  calculateSensorLockBonus,
  canUseECM,
  getEWCombatState,
  SCAN_LEVELS,
  RANGE_BAND_KM,
  STATION_TYPES,
  SHIP_TYPES
};
