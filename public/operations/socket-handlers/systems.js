/**
 * AR-201: Ship Systems Socket Handlers
 *
 * Handles engineering and damage control events:
 * - System status
 * - System damage
 * - Repairs
 */

import { registerHandler } from './index.js';

// ==================== System Status ====================

function handleSystemStatus(data, state, helpers) {
  state.systemStatus = data.systemStatus;
  state.damagedSystems = data.damagedSystems;
  if (state.selectedRole === 'engineer' || state.selectedRole === 'damage_control') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

function handleSystemDamaged(data, state, helpers) {
  state.systemStatus = data.systemStatus;
  state.damagedSystems = Object.keys(data.systemStatus).filter(s =>
    data.systemStatus[s]?.totalSeverity > 0
  );
  helpers.showNotification(`System damage: ${helpers.formatSystemName(data.location)} (Severity ${data.severity})`, 'warning');
  if (state.selectedRole === 'engineer' || state.selectedRole === 'damage_control') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

function handleRepairAttempted(data, state, helpers) {
  state.systemStatus = data.systemStatus;
  state.damagedSystems = Object.keys(data.systemStatus).filter(s =>
    data.systemStatus[s]?.totalSeverity > 0
  );
  const notifType = data.success ? 'success' : 'warning';
  helpers.showNotification(data.message, notifType);
  if (state.selectedRole === 'engineer' || state.selectedRole === 'damage_control') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

function handleSystemDamageCleared(data, state, helpers) {
  state.systemStatus = data.systemStatus;
  state.damagedSystems = Object.keys(data.systemStatus).filter(s =>
    data.systemStatus[s]?.totalSeverity > 0
  );
  helpers.showNotification(`Damage cleared: ${data.location === 'all' ? 'all systems' : helpers.formatSystemName(data.location)}`, 'success');
  if (state.selectedRole === 'engineer' || state.selectedRole === 'damage_control') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

// AR-214: Ship Systems display update
function handleShipSystems(data, state, helpers) {
  // Delegate to window function for UI update
  if (typeof window.updateShipSystemsDisplay === 'function') {
    window.updateShipSystemsDisplay(data.systems);
  }
}

// AR-214: System Broken notification (AR-194)
function handleSystemBroken(data, state, helpers) {
  const { system, severity, failure } = data;
  const severityText = ['', 'Minor', 'Major', 'Critical'][severity] || 'Unknown';
  let message = `⚠️ ${system} DAMAGED (${severityText})`;
  if (failure?.name) {
    message += `: ${failure.name}`;
  }
  helpers.showNotification(message, 'warning');
  // Refresh role panel if on engineer/damage control
  if (state.selectedRole === 'engineer' || state.selectedRole === 'damage_control') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

// ==================== Register All Handlers ====================

registerHandler('ops:systemStatus', handleSystemStatus);
registerHandler('ops:systemDamaged', handleSystemDamaged);
registerHandler('ops:repairAttempted', handleRepairAttempted);
registerHandler('ops:systemDamageCleared', handleSystemDamageCleared);
registerHandler('ops:shipSystems', handleShipSystems);
registerHandler('ops:systemBroken', handleSystemBroken);

// Export for testing
export {
  handleSystemStatus,
  handleSystemDamaged,
  handleRepairAttempted,
  handleSystemDamageCleared,
  handleShipSystems,
  handleSystemBroken
};
