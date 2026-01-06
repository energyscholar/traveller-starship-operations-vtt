/**
 * AR-251: Pilot GUI Adapter
 *
 * Client-side adapter for pilot state.
 * Mirrors lib/engine/roles/pilot-state.js for ES module compatibility.
 *
 * @module adapters/pilot-adapter
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
export function getPilotState(shipState, template, campaign, jumpStatus = {}, flightConditions = null, pendingTravel = null) {
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
export function canNavigate(pilotState) {
  return !pilotState.navigation.positionBlocked && !pilotState.jump.inJump;
}

/**
 * Get flight condition severity
 * @param {object} flightConditions - Flight conditions object
 * @returns {string} 'normal', 'warning', or 'danger'
 */
export function getFlightConditionSeverity(flightConditions) {
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
 * Get drive status summary
 * @param {object} pilotState - From getPilotState
 * @returns {object} { status, canThrust, thrustRatio }
 */
export function getDriveStatus(pilotState) {
  const { currentThrust, maxThrust, mDriveDamaged } = pilotState.drive;
  return {
    status: mDriveDamaged ? 'damaged' : 'operational',
    canThrust: !mDriveDamaged && currentThrust > 0,
    thrustRatio: maxThrust > 0 ? currentThrust / maxThrust : 0
  };
}

/**
 * Get jump status summary
 * @param {object} pilotState - From getPilotState
 * @returns {object} { inJump, canJump, statusText }
 */
export function getJumpStatus(pilotState) {
  const { inJump, destination, hoursRemaining, canExit } = pilotState.jump;

  if (inJump) {
    return {
      inJump: true,
      canJump: false,
      statusText: `In jump to ${destination || 'unknown'} (${hoursRemaining || '?'}h remaining)`
    };
  }

  return {
    inJump: false,
    canJump: !pilotState.navigation.positionBlocked,
    statusText: 'Ready for jump'
  };
}
