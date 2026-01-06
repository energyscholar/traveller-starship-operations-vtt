/**
 * AR-251: Captain GUI Adapter
 *
 * Client-side adapter for captain state.
 * Mirrors lib/engine/roles/captain-state.js for ES module compatibility.
 *
 * @module adapters/captain-adapter
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
 * Get alert status state
 * @param {object} shipState
 * @returns {object}
 */
export function getAlertState(shipState) {
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
export function analyzeContacts(contacts) {
  const all = contacts || [];

  const targetable = all.filter(c => c.is_targetable);
  const authorized = targetable.filter(c => c.weapons_free);
  const unauthorized = targetable.filter(c => !c.weapons_free);

  const byMarking = {
    hostile: all.filter(c => c.marking === 'hostile'),
    unknown: all.filter(c => c.marking === 'unknown'),
    friendly: all.filter(c => c.marking === 'friendly'),
    neutral: all.filter(c => c.marking === 'neutral')
  };

  return {
    total: all.length,
    targetable: targetable.length,
    authorized: authorized.length,
    unauthorized: unauthorized.length,
    byMarking,
    hasHostiles: byMarking.hostile.length > 0,
    hasUnknowns: byMarking.unknown.length > 0,
    threatLevel: byMarking.hostile.length > 0 ? 'high' :
                 byMarking.unknown.length > 0 ? 'medium' : 'low'
  };
}

/**
 * Analyze crew status
 * @param {array} crewOnline
 * @returns {object}
 */
export function analyzeCrewStatus(crewOnline) {
  const crew = crewOnline || [];

  const byRole = {};
  for (const member of crew) {
    const role = member.role || 'unassigned';
    if (!byRole[role]) byRole[role] = [];
    byRole[role].push(member);
  }

  const critical = ['captain', 'pilot', 'engineer'];
  const criticalFilled = critical.filter(role => byRole[role]?.length > 0);

  return {
    total: crew.length,
    byRole,
    criticalRoles: critical,
    criticalFilled: criticalFilled.length,
    criticalMissing: critical.filter(r => !byRole[r]?.length),
    allCriticalFilled: criticalFilled.length === critical.length
  };
}

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
export function getCaptainState(shipState, template, ship, crewOnline, contacts, rescueTargets = [], activePanel = 'captain') {
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
 * Check if captain can issue weapons authorization
 * @param {object} captainState - From getCaptainState
 * @returns {object} { canAuthorize, reason }
 */
export function canAuthorizeWeapons(captainState) {
  if (!captainState.contacts.hasHostiles && !captainState.contacts.hasUnknowns) {
    return { canAuthorize: true, reason: 'No threats detected' };
  }
  return { canAuthorize: true, reason: null };
}

/**
 * Get recommended alert level
 * @param {object} captainState - From getCaptainState
 * @returns {string} Recommended alert status
 */
export function getRecommendedAlert(captainState) {
  if (captainState.contacts.hasHostiles) return 'RED';
  if (captainState.contacts.hasUnknowns) return 'YELLOW';
  return 'GREEN';
}

/**
 * Get authorization summary for display
 * @param {object} captainState - From getCaptainState
 * @returns {object} { mode, displayText, canFire }
 */
export function getAuthorizationSummary(captainState) {
  const { weaponsMode, roe } = captainState.authorization;
  const mode = weaponsMode || roe || 'hold';

  const displayText = {
    'hold': 'Weapons Hold',
    'defensive': 'Defensive Fire Only',
    'free': 'Weapons Free'
  }[mode] || 'Unknown';

  return {
    mode,
    displayText,
    canFire: mode === 'free' || mode === 'defensive'
  };
}
