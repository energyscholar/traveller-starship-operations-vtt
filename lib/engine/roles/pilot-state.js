/**
 * AR-250: Pilot Role State
 *
 * Pure state extraction for pilot panel.
 * No HTML, no formatting - just structured data.
 *
 * @module lib/engine/roles/pilot-state
 */

/**
 * Get complete pilot panel state
 * @param {object} shipState - Current ship state
 * @param {object} template - Ship template data
 * @param {object} campaign - Campaign data
 * @param {object} jumpStatus - Jump status
 * @param {object} flightConditions - Flight conditions data
 * @param {object} pendingTravel - Pending travel data (optional)
 * @returns {object} Pure state object
 */
function getPilotState(shipState, template, campaign, jumpStatus = {}, flightConditions = null, pendingTravel = null) {
  const inJump = jumpStatus?.inJump || false;

  return {
    // Navigation state
    navigation: {
      positionBlocked: shipState.positionVerified === false,
      location: shipState.locationName || shipState.location || 'Unknown',
      locationId: shipState.locationId || '',
      isDocked: (shipState.locationId || '').includes('dock'),
      destination: shipState.destination || campaign?.destination || null,
      hasDestination: !!(shipState.destination || campaign?.destination),
      eta: shipState.eta || campaign?.eta || null,
      heading: shipState.heading || shipState.vector || 'Holding'
    },

    // Drive state
    drive: {
      currentThrust: shipState.currentThrust || template?.thrust || 2,
      maxThrust: template?.thrust || 2,
      mDriveStatus: shipState.mDriveStatus || 'Operational',
      mDriveDamaged: shipState.mDriveStatus === 'damaged'
    },

    // Maneuver state
    maneuvers: {
      evasive: shipState.evasive || false,
      contacts: campaign?.sensorContacts || [],
      hasContacts: (campaign?.sensorContacts || []).length > 0,
      canManeuver: !inJump && (campaign?.sensorContacts || []).length > 0
    },

    // Jump state
    jump: {
      inJump,
      destination: jumpStatus?.destination || null,
      endDate: jumpStatus?.jumpEndDate || null,
      hoursRemaining: jumpStatus?.hoursRemaining,
      canExit: jumpStatus?.canExit || false
    },

    // Flight conditions (if in atmosphere/hazard)
    flightConditions: flightConditions ? {
      visibility: flightConditions.visibility || null,
      turbulence: flightConditions.turbulence || null,
      difficultyMod: flightConditions.difficultyMod,
      sensorAssist: flightConditions.sensorAssist || false,
      hazard: flightConditions.hazard || null
    } : null,

    // Docking state
    docking: {
      docked: shipState.docked || false,
      statusText: shipState.docked ? 'Docked' : inJump ? 'In Jump' : 'Free Flight'
    },

    // Travel state
    travel: pendingTravel ? {
      pending: true,
      hours: pendingTravel.travelHours || null
    } : { pending: false }
  };
}

/**
 * Determine if pilot can take navigation actions
 * @param {object} pilotState - From getPilotState
 * @returns {boolean}
 */
function canNavigate(pilotState) {
  return !pilotState.navigation.positionBlocked && !pilotState.jump.inJump;
}

/**
 * Get flight condition severity
 * @param {object} flightConditions - Flight conditions object
 * @returns {string} 'normal', 'warning', or 'danger'
 */
function getFlightConditionSeverity(flightConditions) {
  if (!flightConditions) return 'normal';
  if (flightConditions.visibility === 'Zero' || flightConditions.turbulence === 'Severe') {
    return 'danger';
  }
  if (flightConditions.visibility === 'Poor' || flightConditions.turbulence === 'Moderate') {
    return 'warning';
  }
  return 'normal';
}

/**
 * Calculate brachistochrone transit time
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} accelG - Acceleration in G (1G = 9.81 m/s²)
 * @returns {object} Transit calculation result
 */
function calculateTransitTime(distanceKm, accelG) {
  const distanceM = distanceKm * 1000;
  const accelMS2 = accelG * 9.81;

  // t = 2 * sqrt(d / a)  (brachistochrone formula for constant thrust, flip at midpoint)
  const timeSeconds = 2 * Math.sqrt(distanceM / accelMS2);
  const timeHours = timeSeconds / 3600;
  const turnoverKm = distanceKm / 2;

  // Max velocity at midpoint: v = sqrt(2 * a * d/2) = sqrt(a * d)
  const maxVelocityMS = Math.sqrt(accelMS2 * distanceM);
  const maxVelocityKmS = maxVelocityMS / 1000;

  return {
    timeSeconds,
    timeHours,
    timeFormatted: formatTransitTime(timeHours),
    turnoverKm,
    turnoverFormatted: formatDistance(turnoverKm),
    maxVelocityMS,
    maxVelocityKmS,
    velocityFormatted: formatVelocity(maxVelocityKmS)
  };
}

/**
 * Format transit time for display
 * @param {number} hours
 * @returns {string}
 */
function formatTransitTime(hours) {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)} hours`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)} days`;
}

/**
 * Format distance for display
 * @param {number} km
 * @returns {string}
 */
function formatDistance(km) {
  if (km < 1000) {
    return `${km.toFixed(0)} km`;
  }
  if (km < 1000000) {
    return `${(km / 1000).toFixed(1)}k km`;
  }
  return `${(km / 1000000).toFixed(2)}M km`;
}

/**
 * Format velocity for display
 * @param {number} kmPerSecond
 * @returns {string}
 */
function formatVelocity(kmPerSecond) {
  if (kmPerSecond < 1) {
    return `${(kmPerSecond * 1000).toFixed(0)} m/s`;
  }
  return `${kmPerSecond.toFixed(1)} km/s`;
}

module.exports = {
  getPilotState,
  canNavigate,
  getFlightConditionSeverity,
  calculateTransitTime,
  formatTransitTime,
  formatDistance,
  formatVelocity
};
