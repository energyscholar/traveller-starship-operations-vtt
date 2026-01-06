/**
 * AR-250: Sensor Operations
 *
 * Pure business logic for sensor operations.
 * Extracted from socket handler for separation of concerns.
 *
 * @module lib/operations/sensors
 */

// Scan level definitions
const SCAN_LEVELS = {
  UNKNOWN: 0,
  PASSIVE: 1,
  ACTIVE: 2,
  DEEP: 3
};

// EW states
const ewState = {
  campaigns: new Map()
};

/**
 * Get or create EW state for a campaign
 * @param {string} campaignId
 * @returns {object}
 */
function getEWState(campaignId) {
  if (!ewState.campaigns.has(campaignId)) {
    ewState.campaigns.set(campaignId, {
      ecm: false,
      eccm: false,
      stealth: false,
      sensorLock: null,
      environmentalData: null
    });
  }
  return ewState.campaigns.get(campaignId);
}

/**
 * Set ECM/ECCM/Stealth mode
 * @param {string} campaignId
 * @param {string} mode - 'ecm', 'eccm', or 'stealth'
 * @param {boolean} enabled
 * @param {string} setBy - Player name
 * @returns {object} EW state result
 */
function setEW(campaignId, mode, enabled, setBy) {
  const state = getEWState(campaignId);

  if (!['ecm', 'eccm', 'stealth'].includes(mode)) {
    throw new Error(`Invalid EW mode: ${mode}`);
  }

  state[mode] = enabled;

  return {
    mode,
    enabled,
    ecm: state.ecm,
    eccm: state.eccm,
    stealth: state.stealth,
    setBy,
    timestamp: new Date().toISOString()
  };
}

/**
 * Set sensor lock on target
 * @param {string} campaignId
 * @param {string} targetId - Contact ID to lock, or null to unlock
 * @param {string} setBy - Player name
 * @returns {object} Lock result
 */
function setSensorLock(campaignId, targetId, setBy) {
  const state = getEWState(campaignId);
  const previousLock = state.sensorLock;
  state.sensorLock = targetId;

  return {
    targetId,
    previousLock,
    locked: !!targetId,
    setBy,
    timestamp: new Date().toISOString()
  };
}

/**
 * Set environmental data (atmospheric readings, etc.)
 * @param {string} campaignId
 * @param {object} data - Environmental data object
 * @returns {object}
 */
function setEnvironmentalData(campaignId, data) {
  const state = getEWState(campaignId);
  state.environmentalData = data;

  return {
    data,
    hasData: !!data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Clear environmental data
 * @param {string} campaignId
 * @returns {object}
 */
function clearEnvironmentalData(campaignId) {
  const state = getEWState(campaignId);
  state.environmentalData = null;

  return {
    cleared: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Calculate scan success probability
 * @param {number} sensorDM - Ship sensor DM
 * @param {number} targetSignature - Target's signature modifier
 * @param {string} scanLevel - Current scan level
 * @param {object} conditions - Additional conditions
 * @returns {object} Scan calculation
 */
function calculateScanChance(sensorDM, targetSignature = 0, scanLevel = 'passive', conditions = {}) {
  // Base difficulty for scan types
  const baseDifficulty = {
    passive: 6,   // Easy
    active: 8,    // Routine
    deep: 10      // Difficult
  };

  const difficulty = baseDifficulty[scanLevel] || 8;
  const totalDM = sensorDM - targetSignature + (conditions.ecmActive ? -2 : 0) + (conditions.eccmActive ? 2 : 0);
  const targetNumber = difficulty - totalDM;

  // Calculate 2D6 probability
  let successCount = 0;
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      if (d1 + d2 >= targetNumber) successCount++;
    }
  }

  return {
    difficulty,
    totalDM,
    targetNumber,
    probability: Math.round((successCount / 36) * 100),
    conditions
  };
}

/**
 * Classify contact based on scan data
 * @param {object} contact - Contact object
 * @param {number} scanLevel - Achieved scan level
 * @returns {object} Classification result
 */
function classifyContact(contact, scanLevel) {
  const classification = {
    level: scanLevel,
    levelName: ['Unknown', 'Passive', 'Active', 'Deep'][scanLevel] || 'Unknown'
  };

  // What we can determine at each level
  if (scanLevel >= SCAN_LEVELS.PASSIVE) {
    classification.type = contact.type || 'Ship';
    classification.bearing = contact.bearing;
    classification.range = contact.range_band;
  }

  if (scanLevel >= SCAN_LEVELS.ACTIVE) {
    classification.name = contact.name || contact.transponder;
    classification.transponder = contact.transponder;
    classification.velocity = contact.velocity;
  }

  if (scanLevel >= SCAN_LEVELS.DEEP) {
    classification.tonnage = contact.tonnage;
    classification.armament = contact.weapons || [];
    classification.crew = contact.crew;
    classification.cargo = contact.cargo;
  }

  return classification;
}

/**
 * Calculate effective sensor range
 * @param {string} sensorGrade - Sensor grade (Civilian, Military, etc.)
 * @param {object} conditions - Conditions affecting range
 * @returns {object} Range limits
 */
function calculateSensorRange(sensorGrade, conditions = {}) {
  // Base ranges by grade (in km)
  const baseRanges = {
    Civilian: { passive: 10000, active: 25000 },
    Basic: { passive: 25000, active: 50000 },
    Standard: { passive: 50000, active: 100000 },
    Military: { passive: 100000, active: 250000 },
    Advanced: { passive: 250000, active: 500000 },
    'Cutting Edge': { passive: 500000, active: 1000000 }
  };

  const base = baseRanges[sensorGrade] || baseRanges.Standard;

  // Apply modifiers
  let modifier = 1.0;
  if (conditions.nebula) modifier *= 0.5;
  if (conditions.asteroid) modifier *= 0.75;
  if (conditions.ecmActive) modifier *= 0.8;

  return {
    passive: Math.round(base.passive * modifier),
    active: Math.round(base.active * modifier),
    modifier,
    conditions
  };
}

/**
 * Prioritize contacts by threat
 * @param {array} contacts - Array of contacts
 * @returns {array} Sorted contacts
 */
function prioritizeContacts(contacts) {
  return [...contacts].sort((a, b) => {
    // Hostile first
    if (a.marking === 'hostile' && b.marking !== 'hostile') return -1;
    if (b.marking === 'hostile' && a.marking !== 'hostile') return 1;

    // Then unknown
    if (a.marking === 'unknown' && b.marking === 'friendly') return -1;
    if (b.marking === 'unknown' && a.marking === 'friendly') return 1;

    // Then by range (closer = higher priority)
    const rangeOrder = ['adjacent', 'close', 'short', 'medium', 'long', 'veryLong', 'distant'];
    const aRange = rangeOrder.indexOf(a.range_band?.toLowerCase()) || 99;
    const bRange = rangeOrder.indexOf(b.range_band?.toLowerCase()) || 99;

    return aRange - bRange;
  });
}

/**
 * Get current EW status for a campaign
 * @param {string} campaignId
 * @returns {object}
 */
function getStatus(campaignId) {
  return getEWState(campaignId);
}

/**
 * Clear sensor state for a campaign
 * @param {string} campaignId
 */
function clearState(campaignId) {
  ewState.campaigns.delete(campaignId);
}

module.exports = {
  SCAN_LEVELS,
  getEWState,
  setEW,
  setSensorLock,
  setEnvironmentalData,
  clearEnvironmentalData,
  calculateScanChance,
  classifyContact,
  calculateSensorRange,
  prioritizeContacts,
  getStatus,
  clearState
};
