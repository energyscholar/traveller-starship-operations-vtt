/**
 * AR-250: Captain Role State
 *
 * Pure state extraction for captain panel.
 * No HTML, no formatting - just structured data.
 *
 * @module lib/engine/roles/captain-state
 */

/**
 * Alert status colors mapping
 */
const ALERT_COLORS = {
  'NORMAL': '#28a745',
  'GREEN': '#28a745',
  'YELLOW': '#ffc107',
  'RED': '#dc3545'
};

/**
 * Alert status display names
 */
const ALERT_DISPLAY = {
  'NORMAL': 'GREEN',
  'GREEN': 'GREEN',
  'YELLOW': 'YELLOW',
  'RED': 'RED'
};

/**
 * Get complete captain panel state
 * @param {object} shipState - Current ship state
 * @param {object} template - Ship template data
 * @param {object} ship - Full ship object
 * @param {array} crewOnline - Online crew list
 * @param {array} contacts - Sensor contacts
 * @param {array} rescueTargets - Rescue targets
 * @param {string} activePanel - Currently active sub-panel
 * @returns {object} Pure state object
 */
function getCaptainState(shipState, template, ship, crewOnline, contacts, rescueTargets = [], activePanel = 'captain') {
  const contactAnalysis = analyzeContacts(contacts);
  const crewStatus = analyzeCrewStatus(crewOnline);
  const alertState = getAlertState(shipState);

  return {
    activePanel,
    panels: ['captain', 'astrogator', 'pilot', 'engineer'],

    alert: alertState,

    contacts: contactAnalysis,

    crew: crewStatus,

    rescue: {
      targets: rescueTargets || [],
      hasTargets: (rescueTargets || []).length > 0,
      count: (rescueTargets || []).length
    },

    authorization: {
      weaponsMode: shipState?.weaponsAuth?.mode || 'hold',
      roe: shipState?.roe || 'hold'
    },

    shipName: ship?.name || template?.name || 'Unknown',
    shipClass: template?.shipClass || template?.class || 'Unknown Class'
  };
}

/**
 * Get alert status state
 * @param {object} shipState
 * @returns {object}
 */
function getAlertState(shipState) {
  const status = shipState?.alertStatus || 'NORMAL';
  return {
    status,
    displayName: ALERT_DISPLAY[status] || 'GREEN',
    color: ALERT_COLORS[status] || ALERT_COLORS.GREEN,
    isNormal: status === 'NORMAL' || status === 'GREEN',
    isYellow: status === 'YELLOW',
    isRed: status === 'RED'
  };
}

/**
 * Analyze contacts for captain overview
 * @param {array} contacts
 * @returns {object}
 */
function analyzeContacts(contacts) {
  const all = contacts || [];

  const targetable = all.filter(c => c.is_targetable);
  const authorized = targetable.filter(c => c.weapons_free);
  const unauthorized = targetable.filter(c => !c.weapons_free);

  const hostile = all.filter(c => c.marking === 'hostile');
  const unknown = all.filter(c => !c.marking || c.marking === 'unknown');
  const friendly = all.filter(c => c.marking === 'friendly');

  // Hailable contacts (have transponder and are ships/stations)
  const hailableTypes = ['Ship', 'Station', 'Starport', 'Base', 'Patrol', 'Free Trader', 'Far Trader', 'System Defense Boat'];
  const hailable = all.filter(c =>
    c.transponder && c.transponder !== 'NONE' &&
    !c.celestial && c.type &&
    hailableTypes.includes(c.type)
  );

  return {
    total: all.length,
    targetable: {
      list: targetable,
      count: targetable.length,
      authorized: authorized.length,
      unauthorized: unauthorized.length
    },
    byMarking: {
      hostile: { list: hostile, count: hostile.length },
      unknown: { list: unknown, count: unknown.length },
      friendly: { list: friendly, count: friendly.length }
    },
    hailable: {
      list: hailable,
      count: hailable.length
    },
    hasHostiles: hostile.length > 0,
    hasContacts: all.length > 0
  };
}

/**
 * Analyze crew status
 * @param {array} crewOnline
 * @returns {object}
 */
function analyzeCrewStatus(crewOnline) {
  const crew = crewOnline || [];

  // Group by role
  const byRole = {};
  for (const member of crew) {
    const role = member.role || 'Crew';
    if (!byRole[role]) {
      byRole[role] = [];
    }
    byRole[role].push(member);
  }

  return {
    online: crew,
    count: crew.length,
    byRole,
    hasCrew: crew.length > 0
  };
}

/**
 * Available captain orders
 */
const CAPTAIN_ORDERS = [
  { id: 'battleStations', name: 'Battle Stations', description: 'All hands to combat positions' },
  { id: 'standDown', name: 'Stand Down', description: 'Return to normal operations' },
  { id: 'generalQuarters', name: 'General Quarters', description: 'Prepare for potential engagement' },
  { id: 'abandonShip', name: 'Abandon Ship', description: 'All hands to escape pods' }
];

/**
 * Get available orders based on current state
 * @param {object} captainState - From getCaptainState
 * @returns {array} Available orders
 */
function getAvailableOrders(captainState) {
  const orders = [...CAPTAIN_ORDERS];

  // Filter based on current alert status
  if (captainState.alert.isRed) {
    // Already at max alert, can only stand down
    return orders.filter(o => o.id !== 'battleStations');
  }

  return orders;
}

/**
 * Determine recommended alert status
 * @param {object} captainState - From getCaptainState
 * @returns {object} { recommended, reason }
 */
function getRecommendedAlertStatus(captainState) {
  if (captainState.contacts.hasHostiles) {
    return {
      recommended: 'RED',
      reason: `${captainState.contacts.byMarking.hostile.count} hostile contact(s) detected`
    };
  }

  if (captainState.contacts.byMarking.unknown.count > 3) {
    return {
      recommended: 'YELLOW',
      reason: 'Multiple unknown contacts in system'
    };
  }

  return {
    recommended: 'GREEN',
    reason: 'No threats detected'
  };
}

module.exports = {
  getCaptainState,
  getAlertState,
  analyzeContacts,
  analyzeCrewStatus,
  getAvailableOrders,
  getRecommendedAlertStatus,
  ALERT_COLORS,
  ALERT_DISPLAY,
  CAPTAIN_ORDERS
};
