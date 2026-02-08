/**
 * AR-29: Captain Role Socket Handlers
 * Handles: orders, weapons auth, contact marking, status requests, leadership checks
 */

const operations = require('../../operations');
const { broadcastStateChange } = require('../broadcast-helpers');

// In-memory state (ephemeral per session)
const captainState = {
  // Map<campaignId, { orders: [], weaponsAuth: {}, contactMarkings: {}, leadershipDM: null }>
  campaigns: new Map()
};

/**
 * Get or create captain state for a campaign
 */
function getCaptainState(campaignId) {
  if (!captainState.campaigns.has(campaignId)) {
    captainState.campaigns.set(campaignId, {
      orders: [],           // Active orders
      weaponsAuth: {        // Weapons authorization
        mode: 'hold',       // 'hold' | 'free'
        targets: []         // ['all'] or [contactIds]
      },
      contactMarkings: {},  // { contactId: { marking, notes } }
      leadershipDM: null,   // { dm, expires, target }
      tacticsBonus: 0,      // Initiative bonus for combat
      commandLog: []        // Recent commands (last 50)
    });
  }
  return captainState.campaigns.get(campaignId);
}

/**
 * Generate order ID
 */
function generateOrderId() {
  return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add to command log (keeps last 50)
 */
function addToCommandLog(state, entry) {
  state.commandLog.unshift({
    ...entry,
    timestamp: new Date().toISOString()
  });
  if (state.commandLog.length > 50) {
    state.commandLog.pop();
  }
}

/**
 * Register captain handlers
 * @param {Object} ctx - Shared context from context.js
 */
function register(ctx) {
  const { socket, io, opsSession, socketLog, sanitizeError } = ctx;

  /**
   * Issue Order (Captain → Crew)
   * ops:issueOrder { target, order, requiresAck }
   */
  socket.on('ops:issueOrder', (data) => {
    try {
      if (!opsSession.isGM && opsSession.role !== 'captain') {
        socket.emit('ops:error', { message: 'Only Captain or GM can issue orders' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }

      const { target, order, requiresAck = true, contactId, orderType } = data || {};
      if (!order || typeof order !== 'string' || order.length > 200) {
        socket.emit('ops:error', { message: 'Invalid order (max 200 chars)' });
        return;
      }

      const state = getCaptainState(opsSession.campaignId);
      const orderId = generateOrderId();

      // Determine which roles need to acknowledge
      const targetRole = target || 'all';
      const allRoles = ['pilot', 'gunner', 'engineer', 'sensor_operator'];
      const pendingAcks = targetRole === 'all' ? [...allRoles] : [targetRole];

      const orderEntry = {
        id: orderId,
        target: targetRole,
        order: order.trim(),
        from: opsSession.slotName || 'Captain',
        requiresAck,
        acknowledged: false,
        acknowledgedBy: [],              // AR-35: Array for multi-ack tracking
        pendingAcks: requiresAck ? pendingAcks : [],  // AR-35: Roles awaiting ack
        timestamp: new Date().toISOString(),
        contactId: contactId || null,
        orderType: orderType || 'general',
        status: 'pending'                // AR-35: pending | acknowledged
      };

      state.orders.push(orderEntry);
      addToCommandLog(state, { type: 'order', target, order: order.trim(), contactId, orderType });

      // Broadcast to campaign - AR-35: include pendingAcks for UI
      broadcastStateChange(io, `ops:campaign:${opsSession.campaignId}`,'ops:orderReceived', {
        id: orderId,
        from: 'Captain',
        target: orderEntry.target,
        order: orderEntry.order,
        timestamp: orderEntry.timestamp,
        requiresAck,
        pendingAcks: orderEntry.pendingAcks,
        acknowledgedBy: [],
        contactId: orderEntry.contactId,
        orderType: orderEntry.orderType,
        status: 'pending'
      });

      socketLog.info(`[OPS] Captain issued order to ${target}: ${order.substring(0, 50)}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Order', error));
      socketLog.error('[OPS] Error issuing order:', error);
    }
  });

  /**
   * Acknowledge Order (Crew → Captain)
   * ops:acknowledgeOrder { orderId }
   */
  socket.on('ops:acknowledgeOrder', (data) => {
    try {
      if (!opsSession.campaignId) return;

      const { orderId } = data || {};
      const state = getCaptainState(opsSession.campaignId);
      const order = state.orders.find(o => o.id === orderId);
      const ackingRole = opsSession.role || 'crew';
      const ackingName = opsSession.slotName || ackingRole;

      if (!order) return;

      // AR-35: Multi-role acknowledgment tracking
      // Remove from pendingAcks if this role was expected
      const pendingIdx = order.pendingAcks.indexOf(ackingRole);
      if (pendingIdx > -1) {
        order.pendingAcks.splice(pendingIdx, 1);
      }

      // Add to acknowledgedBy if not already there
      if (!order.acknowledgedBy.includes(ackingName)) {
        order.acknowledgedBy.push(ackingName);
      }

      // Check if fully acknowledged (all pending cleared)
      if (order.pendingAcks.length === 0) {
        order.acknowledged = true;
        order.status = 'acknowledged';
        order.acknowledgedAt = new Date().toISOString();
      }

      // Notify all - include pending/acknowledged lists
      broadcastStateChange(io, `ops:campaign:${opsSession.campaignId}`,'ops:orderAcknowledged', {
        orderId,
        acknowledgedBy: ackingName,
        allAcknowledgedBy: order.acknowledgedBy,
        pendingAcks: order.pendingAcks,
        fullyAcknowledged: order.acknowledged,
        timestamp: new Date().toISOString()
      });

      socketLog.info(`[OPS] Order ${orderId} acked by ${ackingName}, pending: ${order.pendingAcks.length}`);
    } catch (error) {
      socketLog.error('[OPS] Error acknowledging order:', error);
    }
  });

  /**
   * Set Weapons Authorization (Captain → Gunners)
   * ops:setWeaponsAuth { mode, targets }
   */
  socket.on('ops:setWeaponsAuth', (data) => {
    try {
      if (!opsSession.isGM && opsSession.role !== 'captain' && opsSession.role !== 'gunner') {
        socket.emit('ops:error', { message: 'Only Captain, Gunner, or GM can authorize weapons' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }

      const { mode, targets } = data || {};
      if (!['hold', 'free'].includes(mode)) {
        socket.emit('ops:error', { message: 'Invalid mode (hold or free)' });
        return;
      }

      const state = getCaptainState(opsSession.campaignId);
      state.weaponsAuth = {
        mode,
        targets: targets || ['all']
      };

      addToCommandLog(state, { type: 'weapons_auth', mode, targets });

      // Broadcast to campaign
      broadcastStateChange(io, `ops:campaign:${opsSession.campaignId}`,'ops:weaponsAuthChanged', {
        mode,
        authorizedTargets: state.weaponsAuth.targets
      });

      socketLog.info(`[OPS] Weapons authorization: ${mode} on ${JSON.stringify(targets || ['all'])}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Weapons', error));
      socketLog.error('[OPS] Error setting weapons auth:', error);
    }
  });

  /**
   * Mark Contact (Captain → All)
   * ops:markContact { contactId, marking, notes }
   */
  socket.on('ops:markContact', (data) => {
    try {
      if (!opsSession.isGM && opsSession.role !== 'captain') {
        socket.emit('ops:error', { message: 'Only Captain or GM can mark contacts' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }

      const { contactId, marking, notes } = data || {};
      if (!contactId) {
        socket.emit('ops:error', { message: 'Contact ID required' });
        return;
      }
      if (!['friendly', 'neutral', 'hostile', 'unknown'].includes(marking)) {
        socket.emit('ops:error', { message: 'Invalid marking' });
        return;
      }

      const state = getCaptainState(opsSession.campaignId);
      state.contactMarkings[contactId] = {
        marking,
        notes: (notes || '').substring(0, 100),
        markedAt: new Date().toISOString()
      };

      addToCommandLog(state, { type: 'mark_contact', contactId, marking });

      // Broadcast to campaign
      broadcastStateChange(io, `ops:campaign:${opsSession.campaignId}`,'ops:contactMarked', {
        contactId,
        marking,
        notes: state.contactMarkings[contactId].notes,
        markedBy: 'Captain'
      });

      socketLog.info(`[OPS] Contact ${contactId} marked as ${marking}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Contact', error));
      socketLog.error('[OPS] Error marking contact:', error);
    }
  });

  /**
   * Request Status (Captain → Roles)
   * ops:requestStatus { target }
   */
  socket.on('ops:requestStatus', (data) => {
    try {
      if (!opsSession.isGM && opsSession.role !== 'captain') {
        socket.emit('ops:error', { message: 'Only Captain or GM can request status' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }

      const { target } = data || {};
      const state = getCaptainState(opsSession.campaignId);
      addToCommandLog(state, { type: 'status_request', target: target || 'all' });

      // Broadcast request - clients will respond
      broadcastStateChange(io, `ops:campaign:${opsSession.campaignId}`,'ops:statusRequested', {
        target: target || 'all',
        requestedBy: 'Captain',
        timestamp: new Date().toISOString()
      });

      socketLog.info(`[OPS] Status request sent to: ${target || 'all'}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Status', error));
      socketLog.error('[OPS] Error requesting status:', error);
    }
  });

  /**
   * Submit Status Report (Role → Captain)
   * ops:statusReport { role, status }
   */
  socket.on('ops:statusReport', (data) => {
    try {
      if (!opsSession.campaignId) return;

      const { role, status } = data || {};

      // Forward to Captain (and GM)
      broadcastStateChange(io, `ops:campaign:${opsSession.campaignId}`,'ops:statusReceived', {
        role: role || opsSession.role,
        status: status || {},
        from: opsSession.slotName || opsSession.role,
        timestamp: new Date().toISOString()
      });

      socketLog.info(`[OPS] Status report from ${role || opsSession.role}`);
    } catch (error) {
      socketLog.error('[OPS] Error submitting status:', error);
    }
  });

  /**
   * Leadership Check (Captain action)
   * ops:leadershipCheck { skill, target }
   */
  socket.on('ops:leadershipCheck', (data) => {
    try {
      if (!opsSession.isGM && opsSession.role !== 'captain') {
        socket.emit('ops:error', { message: 'Only Captain or GM can make leadership checks' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }

      const { skill = 0, target = 'all' } = data || {};
      const roll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
      const dm = roll + skill - 8; // Effect

      const state = getCaptainState(opsSession.campaignId);
      state.leadershipDM = {
        dm,
        target,
        expires: 'next_action',
        roll,
        skill
      };

      addToCommandLog(state, { type: 'leadership_check', roll, skill, dm, target });

      // Broadcast result
      broadcastStateChange(io, `ops:campaign:${opsSession.campaignId}`,'ops:leadershipResult', {
        roll,
        skill,
        dm,
        target,
        expires: 'next_action'
      });

      socketLog.info(`[OPS] Leadership check: ${roll} + ${skill} = ${roll + skill}, DM ${dm >= 0 ? '+' : ''}${dm}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Leadership', error));
      socketLog.error('[OPS] Error in leadership check:', error);
    }
  });

  /**
   * Tactics Check (Captain → Initiative)
   * ops:tacticsCheck { skill }
   */
  socket.on('ops:tacticsCheck', (data) => {
    try {
      if (!opsSession.isGM && opsSession.role !== 'captain') {
        socket.emit('ops:error', { message: 'Only Captain or GM can make tactics checks' });
        return;
      }
      if (!opsSession.campaignId) {
        socket.emit('ops:error', { message: 'No campaign selected' });
        return;
      }

      const { skill = 0 } = data || {};
      const roll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
      const bonus = roll + skill - 8; // Effect becomes initiative bonus

      const state = getCaptainState(opsSession.campaignId);
      state.tacticsBonus = Math.max(0, bonus); // Can't go negative

      addToCommandLog(state, { type: 'tactics_check', roll, skill, bonus: state.tacticsBonus });

      // Broadcast result
      broadcastStateChange(io, `ops:campaign:${opsSession.campaignId}`,'ops:tacticsResult', {
        roll,
        skill,
        bonus: state.tacticsBonus
      });

      socketLog.info(`[OPS] Tactics check: ${roll} + ${skill} = ${roll + skill}, bonus +${state.tacticsBonus}`);
    } catch (error) {
      socket.emit('ops:error', sanitizeError('Tactics', error));
      socketLog.error('[OPS] Error in tactics check:', error);
    }
  });

  /**
   * Get Captain State (for reconnecting clients)
   * ops:getCaptainState
   */
  socket.on('ops:getCaptainState', () => {
    try {
      if (!opsSession.campaignId) {
        socket.emit('ops:captainState', { orders: [], weaponsAuth: { mode: 'hold', targets: [] } });
        return;
      }

      const state = getCaptainState(opsSession.campaignId);
      socket.emit('ops:captainState', {
        orders: state.orders.filter(o => !o.acknowledged).slice(0, 10),
        weaponsAuth: state.weaponsAuth,
        contactMarkings: state.contactMarkings,
        leadershipDM: state.leadershipDM,
        tacticsBonus: state.tacticsBonus,
        commandLog: state.commandLog.slice(0, 20)
      });
    } catch (error) {
      socket.emit('ops:captainState', { orders: [], weaponsAuth: { mode: 'hold', targets: [] } });
    }
  });

  /**
   * Clear expired leadership DM (called when DM is used)
   * ops:useLeadershipDM { action }
   */
  socket.on('ops:useLeadershipDM', (data) => {
    try {
      if (!opsSession.campaignId) return;

      const state = getCaptainState(opsSession.campaignId);
      if (state.leadershipDM) {
        const { dm, target } = state.leadershipDM;
        const { action } = data || {};

        // Broadcast that DM was applied
        broadcastStateChange(io, `ops:campaign:${opsSession.campaignId}`,'ops:leadershipApplied', {
          dm,
          appliedTo: opsSession.slotName || opsSession.role,
          action: action || 'action'
        });

        // Clear the DM
        state.leadershipDM = null;
        socketLog.info(`[OPS] Leadership DM ${dm >= 0 ? '+' : ''}${dm} applied to ${opsSession.role}`);
      }
    } catch (error) {
      socketLog.error('[OPS] Error using leadership DM:', error);
    }
  });
}

// Export state getter for testing
module.exports = { register, getCaptainState, captainState };
