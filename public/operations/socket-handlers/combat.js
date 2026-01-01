/**
 * AR-201: Combat Socket Handlers
 *
 * Handles tactical combat events:
 * - Combat start/end
 * - Weapons authorization
 * - Fire results
 * - Target acquisition
 * - Combat actions and log
 */

import { registerHandler } from './index.js';

// ==================== Combat Mode ====================

function handleCombatStarted(data, state, helpers) {
  state.inCombat = true;
  state.combatState = data;
  state.combatPhase = data.phase || 'manoeuvre';
  state.combatRound = data.round || 1;
  helpers.showNotification('COMBAT STATIONS! Tactical mode engaged.', 'warning');
  helpers.showCombatScreen(data);
}

function handleCombatEnded(data, state, helpers) {
  state.inCombat = false;
  state.combatState = null;
  state.combatPhase = null;
  state.combatRound = null;
  helpers.showNotification(`Combat ended: ${data.outcome}`, 'info');
  helpers.hideCombatScreen();
}

function handlePhaseChanged(data, state, helpers) {
  state.combatPhase = data.phase;
  state.combatRound = data.round;
  helpers.showNotification(`Phase: ${data.phase.toUpperCase()} (Round ${data.round})`, 'info');
}

function handleCombatState(data, state, helpers) {
  state.inCombat = data.inCombat;
  state.combatState = data;
  if (data.inCombat) {
    helpers.showCombatScreen(data);
  }
}

// ==================== Weapons ====================

function handleWeaponsAuthorized(data, state, helpers) {
  helpers.handleWeaponsAuthorized(data);
}

function handleFireResult(data, state, helpers) {
  helpers.handleFireResult(data.result || data);
}

// ==================== Targeting ====================

function handleTargetAcquired(data, state, helpers) {
  const contact = data.contact;
  state.lockedTarget = contact.id;
  helpers.showNotification(`Target locked: ${contact.name}`, 'success');
  helpers.renderRoleDetailPanel(state.selectedRole);
}

function handleTargetDestroyed(data, state, helpers) {
  const { contactId, name, destroyedBy } = data;
  helpers.showNotification(`TARGET DESTROYED: ${name} by ${destroyedBy}!`, 'success');

  // Remove from contacts
  if (state.contacts) {
    state.contacts = state.contacts.filter(c => c.id !== contactId);
  }

  // Clear locked target if it was destroyed
  if (state.lockedTarget === contactId) {
    state.lockedTarget = null;
  }

  helpers.renderRoleDetailPanel(state.selectedRole);
}

// ==================== Combat Actions ====================

function handleCombatAction(data, state, helpers) {
  // Handle combat action broadcast (hit/miss/point defense)
  const { type, attacker, target, weapon, damage, message } = data;

  // Add to combat log in state
  if (!state.combatLog) state.combatLog = [];
  state.combatLog.unshift({
    timestamp: new Date().toISOString(),
    type,
    attacker,
    target,
    weapon,
    damage,
    message
  });

  // Keep only last 50 entries
  if (state.combatLog.length > 50) {
    state.combatLog = state.combatLog.slice(0, 50);
  }

  // Show notification for combat events
  if (type === 'hit') {
    helpers.showNotification(`${attacker} HIT ${target} for ${damage} damage!`, 'warning');
  } else if (type === 'miss') {
    helpers.showNotification(`${attacker} missed ${target}`, 'info');
  } else if (type === 'pointDefense') {
    helpers.showNotification(message, 'info');
  }

  // Refresh gunner panel to update combat log
  if (state.selectedRole === 'gunner') {
    helpers.renderRoleDetailPanel('gunner');
  }
}

function handleShipWeapons(data, state, helpers) {
  state.shipWeapons = data.weapons || [];
  helpers.renderRoleDetailPanel(state.selectedRole);
}

function handleCombatLog(data, state, helpers) {
  state.combatLog = data.log || [];
  helpers.renderRoleDetailPanel(state.selectedRole);
}

function handlePointDefenseStatus(data, state, helpers) {
  state.pointDefenseEnabled = data.enabled;
  const btn = document.querySelector('.btn-point-defense');
  if (btn) {
    btn.classList.toggle('active', data.enabled);
    btn.textContent = data.enabled ? 'Point Defense ON' : 'Point Defense';
  }
}

// ==================== Register All Handlers ====================

registerHandler('ops:combatStarted', handleCombatStarted);
registerHandler('ops:combatEnded', handleCombatEnded);
registerHandler('ops:combatState', handleCombatState);
registerHandler('ops:phaseChanged', handlePhaseChanged);
registerHandler('ops:weaponsAuthorized', handleWeaponsAuthorized);
registerHandler('ops:fireResult', handleFireResult);
registerHandler('ops:targetAcquired', handleTargetAcquired);
registerHandler('ops:targetDestroyed', handleTargetDestroyed);
registerHandler('ops:combatAction', handleCombatAction);
registerHandler('ops:shipWeapons', handleShipWeapons);
registerHandler('ops:combatLog', handleCombatLog);
registerHandler('ops:pointDefenseStatus', handlePointDefenseStatus);

// Export for testing
export {
  handleCombatStarted,
  handleCombatEnded,
  handleCombatState,
  handlePhaseChanged,
  handleWeaponsAuthorized,
  handleFireResult,
  handleTargetAcquired,
  handleTargetDestroyed,
  handleCombatAction,
  handleShipWeapons,
  handleCombatLog,
  handlePointDefenseStatus
};
