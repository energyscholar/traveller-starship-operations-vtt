/**
 * AR-BD-2: Ship Damage Socket Handler
 *
 * Handles incoming damage to PC ships:
 * - ops:pcShipDamaged - Hull damage from enemy fire
 * - ops:shipDestroyed - Ship destruction notification
 */

import { registerHandler } from './index.js';

/**
 * Handle PC ship taking damage
 * Updates state and triggers UI refresh for all role panels
 */
function handlePcShipDamaged(data, state, helpers) {
  const {
    shipId,
    shipName,
    attacker,
    weapon,
    damage,
    newHull,
    maxHull,
    destroyed
  } = data;

  // Update state - find and update the ship
  if (state.ships) {
    const ship = state.ships.find(s => s.id === shipId);
    if (ship) {
      ship.current_state = ship.current_state || {};
      ship.current_state.hull = newHull;
    }
  }

  // Update current ship if this is the player's ship
  if (state.currentShip && state.currentShip.id === shipId) {
    state.currentShip.current_state = state.currentShip.current_state || {};
    state.currentShip.current_state.hull = newHull;
  }

  // Calculate hull percentage for severity
  const hullPercent = Math.round((newHull / maxHull) * 100);

  // Determine notification severity
  let notificationType = 'warning';
  let message = `INCOMING FIRE! ${attacker} hit with ${weapon} - ${damage} damage!`;

  if (destroyed) {
    notificationType = 'error';
    message = `CRITICAL! ${shipName} DESTROYED by ${attacker}!`;
  } else if (hullPercent < 25) {
    notificationType = 'error';
    message = `CRITICAL DAMAGE! ${attacker} hit with ${weapon} - ${damage} damage! Hull at ${hullPercent}%!`;
  } else if (hullPercent < 50) {
    notificationType = 'warning';
    message = `HEAVY DAMAGE! ${attacker} hit with ${weapon} - ${damage} damage! Hull at ${hullPercent}%!`;
  }

  // Show notification
  helpers.showNotification(message, notificationType);

  // Refresh role panel to show updated hull
  if (helpers.renderRoleDetailPanel && state.selectedRole) {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }

  // Update any hull displays
  if (helpers.updateHullDisplay) {
    helpers.updateHullDisplay(newHull, maxHull);
  }

  // Trigger screen shake for dramatic effect (if available)
  if (helpers.triggerScreenShake) {
    const intensity = destroyed ? 'heavy' : (hullPercent < 25 ? 'medium' : 'light');
    helpers.triggerScreenShake(intensity);
  }

  // Update ship status indicator
  if (helpers.updateShipStatus) {
    helpers.updateShipStatus(shipId, { hull: newHull, maxHull, destroyed });
  }
}

/**
 * Handle ship destruction
 * Separate handler for complete destruction event
 */
function handleShipDestroyed(data, state, helpers) {
  const { shipId, name, destroyedBy } = data;

  // Show dramatic notification
  helpers.showNotification(`${name} DESTROYED by ${destroyedBy}!`, 'error');

  // Update state
  if (state.ships) {
    const ship = state.ships.find(s => s.id === shipId);
    if (ship) {
      ship.destroyed = true;
      ship.current_state = ship.current_state || {};
      ship.current_state.hull = 0;
    }
  }

  if (state.currentShip && state.currentShip.id === shipId) {
    state.currentShip.destroyed = true;
    state.currentShip.current_state = state.currentShip.current_state || {};
    state.currentShip.current_state.hull = 0;
  }

  // Refresh panels
  if (helpers.renderRoleDetailPanel && state.selectedRole) {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

/**
 * Handle GM fire result (GM-only response)
 */
function handleFireAsContactResult(data, state, helpers) {
  const { result, contactId, weaponIndex, targetShipId } = data;

  // Update GM panel with result
  if (helpers.showGMFireResult) {
    helpers.showGMFireResult(result, contactId, weaponIndex, targetShipId);
  }

  // Show notification to GM
  const message = result.hit
    ? `Hit! ${result.actualDamage} damage dealt.`
    : `Miss! Attack roll: ${result.roll}`;
  helpers.showNotification(message, result.hit ? 'success' : 'info');
}

// Register handlers
registerHandler('ops:pcShipDamaged', handlePcShipDamaged);
registerHandler('ops:shipDestroyed', handleShipDestroyed);
registerHandler('ops:fireAsContactResult', handleFireAsContactResult);
