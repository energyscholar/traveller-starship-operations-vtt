/**
 * Captain Orders Module (AR-35)
 * Order management, acknowledgment tracking, and navigation quick orders
 */

const { generateId } = require('./database');

// Default stale timeout (30 seconds)
const DEFAULT_STALE_TIMEOUT = 30000;

// All crew roles that can acknowledge orders
const ALL_CREW_ROLES = ['pilot', 'engineer', 'gunner', 'sensors', 'medic'];

// Standard order templates
const STANDARD_ORDERS = {
  BATTLE_STATIONS: {
    id: 'battle_stations',
    text: 'All hands to battle stations!',
    targetRole: 'all',
    requiresAck: true,
    priority: 'high'
  },
  STAND_DOWN: {
    id: 'stand_down',
    text: 'Stand down. Resume normal operations.',
    targetRole: 'all',
    requiresAck: true,
    priority: 'normal'
  },
  EMERGENCY_BREAK: {
    id: 'emergency_break',
    text: 'Emergency braking! All hands brace!',
    targetRole: 'pilot',
    requiresAck: true,
    priority: 'critical'
  },
  PURSUE: {
    id: 'pursue',
    text: 'Pursue designated contact.',
    targetRole: 'pilot',
    requiresAck: true,
    priority: 'high'
  },
  RUN_SILENT: {
    id: 'run_silent',
    text: 'Running silent. Minimize emissions.',
    targetRole: 'all',
    requiresAck: true,
    priority: 'high'
  },
  FULL_SPEED: {
    id: 'full_speed',
    text: 'Full speed ahead! Maximum thrust!',
    targetRole: 'pilot',
    requiresAck: true,
    priority: 'high'
  },
  HOLD_FIRE: {
    id: 'hold_fire',
    text: 'Hold fire! Weapons tight!',
    targetRole: 'gunner',
    requiresAck: true,
    priority: 'high'
  },
  WEAPONS_FREE: {
    id: 'weapons_free',
    text: 'Weapons free! Engage at will!',
    targetRole: 'gunner',
    requiresAck: true,
    priority: 'high'
  }
};

/**
 * Create an order object
 * @param {string} targetRole - 'all' or specific role
 * @param {string} text - Order text
 * @param {object} options - Additional options
 * @returns {object} Order object
 */
function createOrder(targetRole, text, options = {}) {
  const id = `order_${generateId()}`;
  const timestamp = Date.now();

  // Determine pending acks based on target
  let pendingAcks;
  if (targetRole === 'all') {
    pendingAcks = [...ALL_CREW_ROLES];
  } else {
    pendingAcks = [targetRole];
  }

  return {
    id,
    text,
    targetRole,
    pendingAcks,
    acknowledgedBy: [],
    status: 'pending',
    timestamp,
    priority: options.priority || 'normal',
    requiresAck: options.requiresAck !== false,
    contactId: options.contactId || null,
    ...options
  };
}

/**
 * Acknowledge an order from a role
 * @param {object} order - Order object (mutated)
 * @param {string} role - Role acknowledging
 * @returns {object} Updated order
 */
function acknowledgeOrder(order, role) {
  // Handle duplicate acks gracefully
  if (order.acknowledgedBy.includes(role)) {
    return order;
  }

  // Remove from pending
  const pendingIdx = order.pendingAcks.indexOf(role);
  if (pendingIdx !== -1) {
    order.pendingAcks.splice(pendingIdx, 1);
  }

  // Add to acknowledged
  order.acknowledgedBy.push(role);

  // Update status if all acknowledged
  if (order.pendingAcks.length === 0) {
    order.status = 'acknowledged';
  }

  return order;
}

/**
 * Check if an order is stale
 * @param {object} order - Order object
 * @param {number} timeout - Timeout in ms (default 30s)
 * @returns {boolean} True if stale
 */
function isOrderStale(order, timeout = DEFAULT_STALE_TIMEOUT) {
  if (order.status === 'acknowledged') {
    return false;
  }
  const age = Date.now() - order.timestamp;
  return age > timeout;
}

/**
 * Create a navigation quick order
 * @param {string} navType - Type: emergency_break, pursue, run_silent, full_speed
 * @param {object} options - Additional options (contactId, etc)
 * @returns {object} Order object
 */
function createNavOrder(navType, options = {}) {
  const navOrders = {
    emergency_break: {
      targetRole: 'pilot',
      text: 'Emergency braking! All hands brace!',
      priority: 'critical',
      shipStateFlag: 'emergencyBrake'
    },
    pursue: {
      targetRole: 'pilot',
      text: options.contactId
        ? `Pursue contact ${options.contactId}!`
        : 'Pursue designated contact!',
      priority: 'high',
      contactId: options.contactId || null
    },
    run_silent: {
      targetRole: 'all',
      text: 'Running silent. Minimize emissions.',
      priority: 'high',
      shipStateFlag: 'runSilent'
    },
    full_speed: {
      targetRole: 'pilot',
      text: 'Full speed ahead! Maximum thrust!',
      priority: 'high',
      shipStateFlag: 'fullSpeed',
      thrust: 'max'
    }
  };

  const navConfig = navOrders[navType];
  if (!navConfig) {
    throw new Error(`Unknown nav order type: ${navType}`);
  }

  return createOrder(navConfig.targetRole, navConfig.text, {
    ...navConfig,
    ...options,
    navType
  });
}

module.exports = {
  STANDARD_ORDERS,
  ALL_CREW_ROLES,
  DEFAULT_STALE_TIMEOUT,
  createOrder,
  acknowledgeOrder,
  isOrderStale,
  createNavOrder
};
