/**
 * AR-201: Fuel Socket Handlers
 *
 * Handles fuel management events:
 * - Fuel status
 * - Refueling options and operations
 * - Fuel processing
 * - Jump fuel penalties
 */

import { registerHandler } from './index.js';

// ==================== Fuel Status ====================

function handleFuelStatus(data, state, helpers) {
  state.fuelStatus = data;
  if (state.selectedRole === 'engineer') {
    helpers.renderRoleDetailPanel('engineer');
  }
  helpers.renderShipStatus();
}

function handleRefuelOptions(data, state, helpers) {
  state.fuelSources = data.sources;
  state.fuelTypes = data.fuelTypes;
  if (data.fuelStatus) {
    state.fuelStatus = data.fuelStatus;
  }
  helpers.populateRefuelModal();
}

function handleCanRefuelResult(data, state, helpers) {
  // Update refuel modal with cost/time info
  helpers.updateRefuelPreview(data);
}

// ==================== Refueling ====================

function handleRefueled(data, state, helpers) {
  state.fuelStatus = data.newFuelStatus;
  // Update ship state
  if (state.ship?.current_state) {
    state.ship.current_state.fuel = data.newFuelStatus.total;
    state.ship.current_state.fuelBreakdown = data.newFuelStatus.breakdown;
  }
  helpers.showNotification(`Refueled ${data.fuelAdded} tons of ${data.fuelType} fuel`, 'success');
  helpers.renderShipStatus();
  if (state.selectedRole === 'engineer') {
    helpers.renderRoleDetailPanel('engineer');
  }
  helpers.closeModal();
}

// ==================== Fuel Processing ====================

function handleFuelProcessingStarted(data, state, helpers) {
  helpers.showNotification(`Started processing ${data.tons} tons of fuel (${data.timeHours} hours)`, 'info');
  state.socket.emit('ops:getFuelStatus');
}

function handleFuelProcessingStatus(data, state, helpers) {
  state.fuelProcessing = data;
  if (state.selectedRole === 'engineer') {
    helpers.renderRoleDetailPanel('engineer');
  }
}

function handleFuelProcessingCompleted(data, state, helpers) {
  state.fuelStatus = data.newFuelStatus;
  helpers.showNotification(`Fuel processing complete: ${data.tons} tons now ready`, 'success');
  helpers.renderShipStatus();
  if (state.selectedRole === 'engineer') {
    helpers.renderRoleDetailPanel('engineer');
  }
}

function handleJumpFuelPenalties(data, state, helpers) {
  if (data.hasUnrefined) {
    helpers.showNotification(`Warning: Using ${data.unrefinedAmount} tons unrefined fuel (DM ${data.dmModifier}, ${data.misjumpRisk * 100}% misjump risk)`, 'warning');
  }
}

// ==================== Register All Handlers ====================

registerHandler('ops:fuelStatus', handleFuelStatus);
registerHandler('ops:refuelOptions', handleRefuelOptions);
registerHandler('ops:canRefuelResult', handleCanRefuelResult);
registerHandler('ops:refueled', handleRefueled);
registerHandler('ops:fuelProcessingStarted', handleFuelProcessingStarted);
registerHandler('ops:fuelProcessingStatus', handleFuelProcessingStatus);
registerHandler('ops:fuelProcessingCompleted', handleFuelProcessingCompleted);
registerHandler('ops:jumpFuelPenalties', handleJumpFuelPenalties);

// Export for testing
export {
  handleFuelStatus,
  handleRefuelOptions,
  handleCanRefuelResult,
  handleRefueled,
  handleFuelProcessingStarted,
  handleFuelProcessingStatus,
  handleFuelProcessingCompleted,
  handleJumpFuelPenalties
};
