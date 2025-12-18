/**
 * AR-201: Role Conditions Socket Handlers
 *
 * Handles role-specific condition updates:
 * - Environmental data (sensors)
 * - Repair queue (engineer)
 * - Rescue targets (captain)
 * - Flight conditions (pilot)
 * - Medical conditions (medic)
 * - Target conditions (gunner)
 * - Boarding conditions (marines)
 */

import { registerHandler } from './index.js';

// ==================== Sensor Conditions ====================

function handleEnvironmentalData(data, state, helpers) {
  state.environmentalData = data;
  // Refresh sensors panel if active
  if (state.selectedRole === 'sensor_operator') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

// ==================== Engineer Conditions ====================

function handleRepairQueue(data, state, helpers) {
  state.repairQueue = data.repairs || [];
  // Refresh engineer panel if active
  if (state.selectedRole === 'engineer') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

// ==================== Captain Conditions ====================

function handleRescueTargets(data, state, helpers) {
  state.rescueTargets = data.targets || [];
  if (state.selectedRole === 'captain') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

// ==================== Pilot Conditions ====================

function handleFlightConditions(data, state, helpers) {
  state.flightConditions = data;
  if (state.selectedRole === 'pilot') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

// ==================== Medic Conditions ====================

function handleMedicalConditions(data, state, helpers) {
  state.medicalConditions = data;
  if (state.selectedRole === 'medic') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

// ==================== Gunner Conditions ====================

function handleTargetConditions(data, state, helpers) {
  state.targetConditions = data;
  if (state.selectedRole === 'gunner') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

// ==================== Marines Conditions ====================

function handleBoardingConditions(data, state, helpers) {
  state.boardingConditions = data;
  if (state.selectedRole === 'marines') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

// ==================== Register All Handlers ====================

registerHandler('ops:environmentalData', handleEnvironmentalData);
registerHandler('ops:repairQueue', handleRepairQueue);
registerHandler('ops:rescueTargets', handleRescueTargets);
registerHandler('ops:flightConditions', handleFlightConditions);
registerHandler('ops:medicalConditions', handleMedicalConditions);
registerHandler('ops:targetConditions', handleTargetConditions);
registerHandler('ops:boardingConditions', handleBoardingConditions);

// Export for testing
export {
  handleEnvironmentalData,
  handleRepairQueue,
  handleRescueTargets,
  handleFlightConditions,
  handleMedicalConditions,
  handleTargetConditions,
  handleBoardingConditions
};
