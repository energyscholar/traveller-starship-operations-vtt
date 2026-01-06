/**
 * AR-250: Captain Operations
 *
 * Pure business logic for captain/command operations.
 * Extracted from socket handler for separation of concerns.
 *
 * @module lib/operations/captain
 */

// Alert status definitions
const ALERT_STATUS = {
  GREEN: 'GREEN',
  YELLOW: 'YELLOW',
  RED: 'RED'
};

// Weapons authorization modes
const WEAPONS_AUTH = {
  HOLD: 'hold',
  DEFENSIVE: 'defensive',
  FREE: 'free'
};

// Order types
const ORDER_TYPES = {
  BATTLE_STATIONS: 'battleStations',
  STAND_DOWN: 'standDown',
  GENERAL_QUARTERS: 'generalQuarters',
  ABANDON_SHIP: 'abandonShip',
  COURSE_CHANGE: 'courseChange',
  WEAPONS_FREE: 'weaponsFree',
  WEAPONS_HOLD: 'weaponsHold',
  CUSTOM: 'custom'
};

// Captain state per campaign
const captainState = {
  campaigns: new Map()
};

/**
 * Get or create captain state for a campaign
 * @param {string} campaignId
 * @returns {object}
 */
function getCaptainState(campaignId) {
  if (!captainState.campaigns.has(campaignId)) {
    captainState.campaigns.set(campaignId, {
      alertStatus: ALERT_STATUS.GREEN,
      weaponsAuth: WEAPONS_AUTH.HOLD,
      pendingOrders: [],
      orderHistory: [],
      leadershipDM: 0,
      tacticsDM: 0,
      lastLeadershipRoll: null,
      lastTacticsRoll: null
    });
  }
  return captainState.campaigns.get(campaignId);
}

/**
 * Issue an order
 * @param {string} campaignId
 * @param {string} orderType - Type of order
 * @param {object} orderData - Additional order data
 * @param {string} issuedBy - Captain's name
 * @returns {object} Order result
 */
function issueOrder(campaignId, orderType, orderData = {}, issuedBy) {
  const state = getCaptainState(campaignId);

  const order = {
    id: `order_${Date.now()}`,
    type: orderType,
    data: orderData,
    issuedBy,
    issuedAt: new Date().toISOString(),
    acknowledged: false,
    acknowledgedBy: []
  };

  state.pendingOrders.push(order);
  state.orderHistory.unshift(order);

  // Keep history to last 50
  if (state.orderHistory.length > 50) {
    state.orderHistory.pop();
  }

  // Auto-update alert status for certain orders
  if (orderType === ORDER_TYPES.BATTLE_STATIONS) {
    state.alertStatus = ALERT_STATUS.RED;
  } else if (orderType === ORDER_TYPES.STAND_DOWN) {
    state.alertStatus = ALERT_STATUS.GREEN;
  } else if (orderType === ORDER_TYPES.GENERAL_QUARTERS) {
    state.alertStatus = ALERT_STATUS.YELLOW;
  }

  return order;
}

/**
 * Acknowledge an order
 * @param {string} campaignId
 * @param {string} orderId - Order ID
 * @param {string} acknowledgedBy - Crew member name
 * @returns {object} Acknowledgement result
 */
function acknowledgeOrder(campaignId, orderId, acknowledgedBy) {
  const state = getCaptainState(campaignId);
  const order = state.pendingOrders.find(o => o.id === orderId);

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  if (!order.acknowledgedBy.includes(acknowledgedBy)) {
    order.acknowledgedBy.push(acknowledgedBy);
  }

  return {
    orderId,
    acknowledgedBy,
    totalAcknowledgements: order.acknowledgedBy.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Set weapons authorization mode
 * @param {string} campaignId
 * @param {string} mode - Authorization mode
 * @param {string} setBy - Captain's name
 * @param {object} options - Additional options (targets, etc.)
 * @returns {object} Authorization result
 */
function setWeaponsAuth(campaignId, mode, setBy, options = {}) {
  const state = getCaptainState(campaignId);

  if (!Object.values(WEAPONS_AUTH).includes(mode)) {
    throw new Error(`Invalid weapons auth mode: ${mode}`);
  }

  state.weaponsAuth = mode;

  return {
    mode,
    targets: options.targets || [],
    setBy,
    previousMode: state.weaponsAuth,
    timestamp: new Date().toISOString()
  };
}

/**
 * Set alert status
 * @param {string} campaignId
 * @param {string} status - Alert status
 * @param {string} setBy - Captain's name
 * @returns {object} Status result
 */
function setAlertStatus(campaignId, status, setBy) {
  const state = getCaptainState(campaignId);

  if (!Object.values(ALERT_STATUS).includes(status)) {
    throw new Error(`Invalid alert status: ${status}`);
  }

  const previousStatus = state.alertStatus;
  state.alertStatus = status;

  return {
    status,
    previousStatus,
    setBy,
    timestamp: new Date().toISOString()
  };
}

/**
 * Record leadership check result
 * @param {string} campaignId
 * @param {number} roll - Roll result
 * @param {number} dm - Resulting DM
 * @returns {object}
 */
function recordLeadershipCheck(campaignId, roll, dm) {
  const state = getCaptainState(campaignId);
  state.leadershipDM = dm;
  state.lastLeadershipRoll = {
    roll,
    dm,
    timestamp: new Date().toISOString()
  };

  return {
    roll,
    dm,
    effect: dm >= 0 ? `+${dm}` : `${dm}`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Record tactics check result
 * @param {string} campaignId
 * @param {number} roll - Roll result
 * @param {number} dm - Resulting DM
 * @returns {object}
 */
function recordTacticsCheck(campaignId, roll, dm) {
  const state = getCaptainState(campaignId);
  state.tacticsDM = dm;
  state.lastTacticsRoll = {
    roll,
    dm,
    timestamp: new Date().toISOString()
  };

  return {
    roll,
    dm,
    effect: dm >= 0 ? `+${dm}` : `${dm}`,
    timestamp: new Date().toISOString()
  };
}

/**
 * Use leadership DM (consumes it)
 * @param {string} campaignId
 * @returns {object}
 */
function useLeadershipDM(campaignId) {
  const state = getCaptainState(campaignId);
  const dm = state.leadershipDM;
  state.leadershipDM = 0;

  return {
    dm,
    consumed: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Get full captain status
 * @param {string} campaignId
 * @returns {object}
 */
function getStatus(campaignId) {
  const state = getCaptainState(campaignId);
  return {
    alertStatus: state.alertStatus,
    weaponsAuth: state.weaponsAuth,
    leadershipDM: state.leadershipDM,
    tacticsDM: state.tacticsDM,
    pendingOrderCount: state.pendingOrders.length,
    orderHistoryCount: state.orderHistory.length
  };
}

/**
 * Clear captain state for a campaign
 * @param {string} campaignId
 */
function clearState(campaignId) {
  captainState.campaigns.delete(campaignId);
}

module.exports = {
  ALERT_STATUS,
  WEAPONS_AUTH,
  ORDER_TYPES,
  getCaptainState,
  issueOrder,
  acknowledgeOrder,
  setWeaponsAuth,
  setAlertStatus,
  recordLeadershipCheck,
  recordTacticsCheck,
  useLeadershipDM,
  getStatus,
  clearState
};
