/**
 * AR-250: Pilot Operations
 *
 * Pure business logic for pilot operations.
 * Extracted from socket handler for separation of concerns.
 *
 * @module lib/operations/pilot
 */

// Range band progression (per Traveller rules)
const RANGE_BANDS = ['adjacent', 'close', 'short', 'medium', 'long', 'veryLong', 'distant'];

// In-memory state (ephemeral per session)
const pilotState = {
  campaigns: new Map()
};

/**
 * Get or create pilot state for a campaign
 * @param {string} campaignId
 * @returns {object}
 */
function getPilotState(campaignId) {
  if (!pilotState.campaigns.has(campaignId)) {
    pilotState.campaigns.set(campaignId, {
      evasive: false,
      evasiveStartTime: null,
      destination: null,
      eta: null,
      rangeHistory: [],
      timeBlocked: false
    });
  }
  return pilotState.campaigns.get(campaignId);
}

/**
 * Add to range history (keeps last 20)
 * @param {object} state - Pilot state
 * @param {object} entry - History entry
 */
function addToRangeHistory(state, entry) {
  state.rangeHistory.unshift({
    ...entry,
    timestamp: new Date().toISOString()
  });
  if (state.rangeHistory.length > 20) {
    state.rangeHistory.pop();
  }
}

/**
 * Set evasive maneuvers
 * @param {string} campaignId
 * @param {boolean} enabled
 * @param {string} playerName
 * @returns {object} Result with evasive state
 */
function setEvasive(campaignId, enabled, playerName) {
  const state = getPilotState(campaignId);
  state.evasive = enabled;
  state.evasiveStartTime = enabled ? Date.now() : null;

  return {
    enabled,
    attackDM: enabled ? -2 : 0,
    setBy: playerName || 'Pilot',
    timestamp: new Date().toISOString()
  };
}

/**
 * Get range band index
 * @param {string} band
 * @returns {number}
 */
function getRangeBandIndex(band) {
  const normalized = band?.toLowerCase().replace(/[\s_-]/g, '') || 'medium';
  return RANGE_BANDS.findIndex(b => b.toLowerCase() === normalized);
}

/**
 * Change range to a contact
 * @param {string} campaignId
 * @param {string} contactId
 * @param {string} direction - 'approach' or 'withdraw'
 * @param {string} currentRange - Current range band
 * @param {string} playerName
 * @returns {object} Result with new range
 */
function changeRange(campaignId, contactId, direction, currentRange, playerName) {
  const state = getPilotState(campaignId);
  const currentIndex = getRangeBandIndex(currentRange);

  if (currentIndex === -1) {
    throw new Error(`Invalid range band: ${currentRange}`);
  }

  let newIndex;
  if (direction === 'approach') {
    newIndex = Math.max(0, currentIndex - 1);
  } else if (direction === 'withdraw') {
    newIndex = Math.min(RANGE_BANDS.length - 1, currentIndex + 1);
  } else {
    throw new Error(`Invalid direction: ${direction}`);
  }

  const newRange = RANGE_BANDS[newIndex];
  const changed = newIndex !== currentIndex;

  if (changed) {
    addToRangeHistory(state, {
      contactId,
      from: currentRange,
      to: newRange,
      direction,
      pilot: playerName
    });
  }

  return {
    contactId,
    oldRange: currentRange,
    newRange,
    changed,
    atLimit: direction === 'approach' ? newIndex === 0 : newIndex === RANGE_BANDS.length - 1,
    timestamp: new Date().toISOString()
  };
}

/**
 * Set course to destination
 * @param {string} campaignId
 * @param {object} destination - Destination object
 * @param {string} eta - Estimated time of arrival
 * @returns {object} Course result
 */
function setCourse(campaignId, destination, eta) {
  const state = getPilotState(campaignId);
  state.destination = destination;
  state.eta = eta;

  return {
    destination,
    eta,
    timestamp: new Date().toISOString()
  };
}

/**
 * Clear current course
 * @param {string} campaignId
 * @returns {object} Clear result
 */
function clearCourse(campaignId) {
  const state = getPilotState(campaignId);
  const hadDestination = !!state.destination;
  state.destination = null;
  state.eta = null;

  return {
    cleared: hadDestination,
    timestamp: new Date().toISOString()
  };
}

/**
 * Set time blocked state
 * @param {string} campaignId
 * @param {boolean} blocked
 * @returns {object}
 */
function setTimeBlocked(campaignId, blocked) {
  const state = getPilotState(campaignId);
  state.timeBlocked = blocked;

  return {
    timeBlocked: blocked,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check if pilot can pass time
 * @param {string} campaignId
 * @returns {boolean}
 */
function canPassTime(campaignId) {
  const state = getPilotState(campaignId);
  return !state.timeBlocked;
}

/**
 * Calculate travel time using brachistochrone trajectory
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} thrustG - Thrust in G
 * @returns {object} Travel calculation
 */
function calculateTravelTime(distanceKm, thrustG = 2) {
  const distanceM = distanceKm * 1000;
  const accelMS2 = thrustG * 9.81;

  // t = 2 * sqrt(d / a) for constant acceleration with flip at midpoint
  const timeSeconds = 2 * Math.sqrt(distanceM / accelMS2);
  const timeHours = timeSeconds / 3600;

  return {
    distanceKm,
    thrustG,
    timeSeconds,
    timeHours,
    turnoverKm: distanceKm / 2
  };
}

/**
 * Get full pilot status for a campaign
 * @param {string} campaignId
 * @returns {object}
 */
function getStatus(campaignId) {
  const state = getPilotState(campaignId);
  return {
    evasive: state.evasive,
    evasiveStartTime: state.evasiveStartTime,
    destination: state.destination,
    eta: state.eta,
    timeBlocked: state.timeBlocked,
    rangeHistoryCount: state.rangeHistory.length
  };
}

/**
 * Clear pilot state for a campaign (e.g., on session end)
 * @param {string} campaignId
 */
function clearState(campaignId) {
  pilotState.campaigns.delete(campaignId);
}

module.exports = {
  RANGE_BANDS,
  getPilotState,
  addToRangeHistory,
  setEvasive,
  getRangeBandIndex,
  changeRange,
  setCourse,
  clearCourse,
  setTimeBlocked,
  canPassTime,
  calculateTravelTime,
  getStatus,
  clearState
};
