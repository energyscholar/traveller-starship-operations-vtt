/**
 * AR-201: Bridge Socket Handlers
 *
 * Handles bridge operations and captain commands:
 * - Bridge join/session
 * - Log entries
 * - Alert status
 * - Orders and acknowledgments
 * - Leadership/tactics checks
 */

import { registerHandler } from './index.js';
import { initChatDrawer, setGMStatus } from '../modules/chat-drawer.js';

// ==================== Bridge Join ====================

function handleBridgeJoined(data, state, helpers) {
  state.ship = data.ship || {};
  state.ship.npcCrew = data.npcCrew || [];
  state.selectedShipId = data.ship?.id;
  state.crewOnline = (data.crew || []).filter(c => c.role !== 'gm' && !c.isGM);
  state.contacts = data.contacts || [];
  state.logEntries = data.logs || [];
  state.campaign = data.campaign;
  state.selectedRole = data.role;

  helpers.showScreen('bridge');
  helpers.renderBridge();
  helpers.saveSession();
  helpers.requestSystemStatus();
  helpers.requestJumpStatus();

  if (data.campaign?.current_system) {
    helpers.loadCurrentSystem(data.campaign.current_system);
  }
  if (state.ship) {
    helpers.refreshShipStatus(state.ship);
  }
  // Auto-show sensor panel for sensor operators
  if (data.role === 'sensor_operator') {
    const statusPanels = document.getElementById('status-panels');
    const sensorPanel = document.getElementById('sensor-display');
    if (statusPanels) statusPanels.classList.add('hidden');
    if (sensorPanel) sensorPanel.classList.remove('sensor-panel-hidden');
  }

  // AR-XX: Initialize chat drawer
  initChatDrawer(state);

  // Set up GM identity dropdown with available characters
  if (data.isGM || state.isGM) {
    const chars = (data.crew || [])
      .filter(c => c.slot_name && c.id)
      .map(c => ({ id: c.id, name: c.slot_name }));
    setGMStatus(true, chars);
  }
}

function handleCrewOnBridge(data, state, helpers) {
  helpers.showNotification(`${data.name || data.role} joined the bridge`, 'info');
}

function handleSessionStarted(data, state, helpers) {
  helpers.showNotification('Session started', 'success');
  // GM auto-joins bridge after starting session
  if (state.isGM && state.gmSelectedShipId) {
    state.socket.emit('ops:joinBridge', {
      shipId: state.gmSelectedShipId,
      role: 'gm',
      isGM: true
    });
  }
}

// ==================== Logs & Time ====================

function handleLogEntry(data, state, helpers) {
  state.logEntries.unshift(data.entry);
  helpers.renderShipLog();
}

function handleTimeAdvanced(data, state, helpers) {
  if (state.campaign) {
    state.campaign.current_date = data.newDate;
  }
  helpers.setBridgeClockDate(data.newDate);

  // AR-216: Update all date displays including system map header
  const systemMapDate = document.getElementById('system-map-date');
  if (systemMapDate) {
    systemMapDate.textContent = data.newDate;
  }

  helpers.showNotification(`Time: ${data.newDate}${data.advancedBy ? ` (${data.advancedBy})` : ''}`, 'info');
}

// ==================== Alert Status ====================

function handleAlertStatusChanged(data, state, helpers) {
  const status = data.alertStatus || data.status;
  helpers.updateAlertStatus(status);
  helpers.applyAlertBorder(status);
  if (state.selectedRole === 'captain') {
    helpers.renderRoleDetailPanel('captain');
  }
}

// ==================== Orders ====================

function handleOrderReceived(data, state, helpers) {
  const { target, order, from, id, requiresAck, pendingAcks, acknowledgedBy, orderType, contactId } = data;

  if (!state.pendingOrders) state.pendingOrders = [];
  state.pendingOrders.push({
    id, target, order, from, requiresAck,
    pendingAcks: pendingAcks || [],
    acknowledgedBy: acknowledgedBy || [],
    timestamp: Date.now(),
    orderType, contactId
  });
  if (state.pendingOrders.length > 20) state.pendingOrders.shift();

  if (target === 'all' || target === state.selectedRole) {
    helpers.showNotification(`Order from ${from}: ${order}`, 'warning');
    if (requiresAck && state.selectedRole !== 'captain') {
      helpers.showOrderAckPrompt(id, order);
    }
  }
  if (state.selectedRole === 'captain') {
    helpers.updatePendingOrdersDisplay();
  }
}

function handleOrderAcknowledged(data, state, helpers) {
  const { orderId, acknowledgedBy, allAcknowledgedBy, pendingAcks, fullyAcknowledged } = data;

  if (state.pendingOrders) {
    const order = state.pendingOrders.find(o => o.id === orderId);
    if (order) {
      order.acknowledgedBy = allAcknowledgedBy || [];
      order.pendingAcks = pendingAcks || [];
      if (fullyAcknowledged) {
        order.status = 'acknowledged';
      }
    }
  }

  if (state.selectedRole === 'captain') {
    const remaining = pendingAcks?.length || 0;
    const msg = fullyAcknowledged
      ? `${acknowledgedBy} acknowledged - Order complete`
      : `${acknowledgedBy} acknowledged (${remaining} pending)`;
    helpers.showNotification(msg, fullyAcknowledged ? 'success' : 'info');
    helpers.updatePendingOrdersDisplay();
  }
}

// ==================== Weapons Auth ====================

function handleWeaponsAuthChanged(data, state, helpers) {
  const { mode, authorizedTargets } = data;
  state.weaponsAuth = { mode, targets: authorizedTargets };
  helpers.updateWeaponsAuthIndicator(mode);
  if (state.selectedRole === 'gunner') {
    helpers.showNotification(`Weapons ${mode === 'free' ? 'FREE - cleared to engage' : 'HOLD - do not fire'}`, mode === 'free' ? 'warning' : 'info');
    helpers.renderRoleDetailPanel('gunner');
  }
  if (state.selectedRole === 'captain') {
    helpers.renderRoleDetailPanel('captain');
  }
}

// ==================== Contacts ====================

function handleContactMarked(data, state, helpers) {
  const { contactId, marking, markedBy } = data;
  if (state.contacts) {
    const contact = state.contacts.find(c => c.id === contactId);
    if (contact) {
      contact.marking = marking;
    }
  }
  helpers.showNotification(`Contact marked ${marking} by ${markedBy}`, marking === 'hostile' ? 'warning' : 'info');
  helpers.renderRoleDetailPanel(state.selectedRole);
}

// ==================== Status Reports ====================

function handleStatusRequested(data, state, helpers) {
  if (state.selectedRole && state.selectedRole !== 'captain' && !state.isGM) {
    const status = helpers.generateRoleStatus(state.selectedRole);
    state.socket.emit('ops:statusReport', { role: state.selectedRole, status });
    helpers.showNotification('Status report sent to Captain', 'info');
  }
}

function handleStatusReceived(data, state, helpers) {
  if (state.selectedRole === 'captain') {
    const { role, status, from } = data;
    helpers.showNotification(`${from} reports: ${status.summary || 'Ready'}`, 'info');
  }
}

// ==================== Leadership/Tactics ====================

function handleLeadershipResult(data, state, helpers) {
  const { roll, skill, dm, target, expires } = data;
  const resultEl = document.getElementById('leadership-result');
  if (resultEl) {
    resultEl.innerHTML = `
      <div class="leadership-roll">
        <strong>Leadership:</strong> ${roll} + ${skill} = ${roll + skill}
        <span class="dm ${dm >= 0 ? 'positive' : 'negative'}">DM ${dm >= 0 ? '+' : ''}${dm}</span>
        <small>(applies to next ${target} action)</small>
      </div>
    `;
  }
  state.leadershipDM = { dm, target, expires };
  helpers.showNotification(`Leadership check: DM ${dm >= 0 ? '+' : ''}${dm} to next action`, dm >= 0 ? 'success' : 'warning');
}

function handleTacticsResult(data, state, helpers) {
  const { roll, skill, bonus } = data;
  const resultEl = document.getElementById('leadership-result');
  if (resultEl) {
    resultEl.innerHTML = `
      <div class="tactics-roll">
        <strong>Tactics:</strong> ${roll} + ${skill} = ${roll + skill}
        <span class="dm positive">Initiative +${bonus}</span>
      </div>
    `;
  }
  helpers.showNotification(`Tactics check: Initiative +${bonus}`, 'success');
}

function handleLeadershipApplied(data, state, helpers) {
  const { dm, appliedTo, action } = data;
  helpers.showNotification(`Leadership DM ${dm >= 0 ? '+' : ''}${dm} applied to ${appliedTo}'s ${action}`, 'info');
  state.leadershipDM = null;
}

// ==================== Register All Handlers ====================

registerHandler('ops:bridgeJoined', handleBridgeJoined);
registerHandler('ops:crewOnBridge', handleCrewOnBridge);
registerHandler('ops:sessionStarted', handleSessionStarted);
registerHandler('ops:logEntry', handleLogEntry);
registerHandler('ops:timeAdvanced', handleTimeAdvanced);
registerHandler('ops:alertStatusChanged', handleAlertStatusChanged);
registerHandler('ops:orderReceived', handleOrderReceived);
registerHandler('ops:orderAcknowledged', handleOrderAcknowledged);
registerHandler('ops:weaponsAuthChanged', handleWeaponsAuthChanged);
registerHandler('ops:contactMarked', handleContactMarked);
registerHandler('ops:statusRequested', handleStatusRequested);
registerHandler('ops:statusReceived', handleStatusReceived);
registerHandler('ops:leadershipResult', handleLeadershipResult);
registerHandler('ops:tacticsResult', handleTacticsResult);
registerHandler('ops:leadershipApplied', handleLeadershipApplied);

// Export for testing
export {
  handleBridgeJoined,
  handleCrewOnBridge,
  handleSessionStarted,
  handleLogEntry,
  handleTimeAdvanced,
  handleAlertStatusChanged,
  handleOrderReceived,
  handleOrderAcknowledged,
  handleWeaponsAuthChanged,
  handleContactMarked,
  handleStatusRequested,
  handleStatusReceived,
  handleLeadershipResult,
  handleTacticsResult,
  handleLeadershipApplied
};
