/**
 * AR-153 Phase 7: Pilot Controls Module
 * Pilot navigation, evasive maneuvers, and travel functions
 *
 * Note: Uses globals showNotification, setBridgeClockDate from app.js
 */

// Module-level state (encapsulated within module)
let pilotEvasiveState = false;
let pendingTravelData = null;

/**
 * Get current evasive state
 * @returns {boolean} Current evasive state
 */
export function getEvasiveState() {
  return pilotEvasiveState;
}

/**
 * Set evasive state (from socket handler)
 * @param {boolean} enabled - New evasive state
 */
export function setEvasiveState(enabled) {
  pilotEvasiveState = enabled;
}

/**
 * Get current pending travel data (for UI)
 * @returns {Object|null} Pending travel data
 */
export function getPendingTravel() {
  return pendingTravelData;
}

/**
 * Clear pending travel data
 */
export function clearPendingTravel() {
  pendingTravelData = null;
}

/**
 * Toggle evasive maneuvers
 * @param {Object} state - Application state
 */
export function toggleEvasive(state) {
  if (!state.socket || !state.campaignId) {
    showNotification('Not connected to campaign', 'error');
    return;
  }

  const newState = !pilotEvasiveState;
  state.socket.emit('ops:setEvasive', { enabled: newState });
}

/**
 * Change range to contact
 * @param {Object} state - Application state
 * @param {string} action - Range action (close/open)
 */
export function changeRange(state, action) {
  if (!state.socket || !state.campaignId) {
    showNotification('Not connected to campaign', 'error');
    return;
  }

  const contactId = document.getElementById('range-contact-select')?.value;
  if (!contactId) {
    showNotification('No contact selected', 'error');
    return;
  }

  state.socket.emit('ops:setRange', { contactId, action });
}

/**
 * Set course to destination
 * @param {Object} state - Application state
 * @param {Function} renderRolePanelFn - Function to re-render role panel
 * @param {string} destination - Destination name
 * @param {string} eta - Estimated time of arrival
 * @param {Object|null} travelData - Travel data for TRAVEL button
 */
export function setCourse(state, renderRolePanelFn, destination, eta, travelData = null) {
  if (!state.socket || !state.campaign?.id) {
    showNotification('Not connected to campaign', 'error');
    return;
  }

  // Store travel data for TRAVEL button
  pendingTravelData = travelData;

  state.socket.emit('ops:setCourse', {
    destination,
    eta,
    travelTime: travelData?.travelHours || null
  });

  // Re-render pilot panel to show TRAVEL button
  if (state.role === 'pilot') {
    renderRolePanelFn('pilot');
  }
}

/**
 * Clear current course
 * @param {Object} state - Application state
 */
export function clearCourse(state) {
  if (!state.socket || !state.campaign?.id) return;
  pendingTravelData = null;
  state.socket.emit('ops:clearCourse');
}

/**
 * Execute travel to the set destination
 * Advances time and moves ship to destination location
 * @param {Object} state - Application state
 */
export function travel(state) {
  if (!state.socket || !state.campaign?.id) {
    showNotification('Not connected to campaign', 'error');
    return;
  }

  if (!pendingTravelData?.locationId) {
    showNotification('No destination set - select a destination from the system map', 'warning');
    return;
  }

  // Confirm travel
  const hours = pendingTravelData.travelHours || 4;
  const confirmMsg = `Travel to destination? (${hours}h transit)`;

  if (!confirm(confirmMsg)) return;

  state.socket.emit('ops:travel', {
    destinationId: pendingTravelData.locationId,
    travelHours: pendingTravelData.travelHours || 4
  });

  // Clear pending travel after sending
  pendingTravelData = null;
}

/**
 * Undock from station
 * @param {Object} state - Application state
 */
export function undock(state) {
  if (!state.socket || !state.campaignId) {
    showNotification('Not connected to campaign', 'error');
    return;
  }

  if (!confirm('Release docking clamps and undock?')) return;

  state.socket.emit('ops:undock');
}

/**
 * Setup pilot event listeners
 * @param {Object} state - Application state
 * @param {Function} renderRolePanelFn - Function to re-render role panel
 * @param {Function} refreshCrewPanelFn - Function to refresh crew panel
 * @param {Function} setBridgeClockDateFn - Function to set bridge clock date
 * @param {Function} animateCameraFn - Function to animate camera (optional)
 */
export function setupPilotListeners(state, renderRolePanelFn, refreshCrewPanelFn, setBridgeClockDateFn, animateCameraFn) {
  if (!state.socket) return;

  state.socket.on('ops:evasiveChanged', (data) => {
    pilotEvasiveState = data.enabled;
    const btn = document.getElementById('evasive-toggle');
    if (btn) {
      btn.className = `btn btn-small ${data.enabled ? 'btn-active' : ''}`;
      btn.textContent = data.enabled ? '⚡ Evasive ON' : 'Evasive';
    }
    showNotification(data.enabled ? 'Evasive maneuvers engaged' : 'Evasive maneuvers ended', 'info');
  });

  state.socket.on('ops:rangeChanged', (data) => {
    showNotification(`Range to ${data.contactId}: ${data.previousRange} → ${data.newRange}`, 'info');
    // Refresh panel to show updated range
    if (refreshCrewPanelFn) {
      refreshCrewPanelFn();
    }
  });

  state.socket.on('ops:courseChanged', (data) => {
    showNotification(`Course set for ${data.destination}`, 'info');
  });

  state.socket.on('ops:courseCleared', () => {
    // AR-262: Clear course line when course is cancelled
    if (typeof window.setMapDestination === 'function') {
      window.setMapDestination(null);
    }
    showNotification('Course cleared', 'info');
  });

  // AR-64: Travel complete - ship arrived at destination
  state.socket.on('ops:travelComplete', (data) => {
    // Update ship state with new location (ensure shipState exists)
    if (!state.shipState) state.shipState = {};
    state.shipState.systemHex = data.systemHex;
    state.shipState.locationId = data.locationId;
    state.shipState.locationName = data.locationName;

    // Update campaign date
    if (state.campaign && data.newDate) {
      state.campaign.current_date = data.newDate;
      setBridgeClockDateFn(data.newDate);
    }

    // Clear pending travel
    pendingTravelData = null;

    // Update system map location display
    const mapLocationEl = document.getElementById('system-map-location');
    if (mapLocationEl) mapLocationEl.textContent = data.locationName;

    // Update bridge header location display
    const bridgeLocationEl = document.getElementById('bridge-location');
    if (bridgeLocationEl) bridgeLocationEl.textContent = data.locationName;

    // Show notification
    showNotification(`Arrived at ${data.locationName} (${data.travelHours}h transit)`, 'success');

    // Animate camera to new location with max zoom (if enabled in settings)
    const animateCamera = localStorage.getItem('ops-setting-animate-camera') !== 'false';
    if (animateCamera && animateCameraFn && data.locationId) {
      animateCameraFn(data.locationId, { duration: 400, maxZoom: true });
    }

    // AR-262: Clear course line on arrival
    if (typeof window.setMapDestination === 'function') {
      window.setMapDestination(null);
    }

    // AR-263: Update ship position on map
    if (typeof window.refreshShipMapPosition === 'function') {
      window.refreshShipMapPosition(data.locationId, state.ship?.name);
    }

    // Re-render pilot panel to remove TRAVEL button
    if (state.role === 'pilot') {
      renderRolePanelFn('pilot');
    }
  });

  // Undock from station - ship location changed
  state.socket.on('ops:undocked', (data) => {
    // Update ship state with new location
    if (state.shipState) {
      state.shipState.locationId = data.locationId;
      state.shipState.locationName = data.toLocation;
      state.shipState.systemHex = data.systemHex;
    }
    // AR-124: Also sync to ship.current_state for consistency
    if (state.ship?.current_state) {
      state.ship.current_state.locationId = data.locationId;
      state.ship.current_state.locationName = data.toLocation;
      state.ship.current_state.systemHex = data.systemHex;
    }

    // Update bridge header location display
    const bridgeLocationEl = document.getElementById('bridge-location');
    if (bridgeLocationEl) bridgeLocationEl.textContent = data.toLocation;

    // AR-124: Update system-map-location display
    const mapLocationEl = document.getElementById('system-map-location');
    if (mapLocationEl) mapLocationEl.textContent = data.toLocation;

    // AR-124: Animate camera to new location
    if (animateCameraFn) {
      animateCameraFn(data.locationId);
    }

    // AR-263: Update ship position on map
    if (typeof window.refreshShipMapPosition === 'function') {
      window.refreshShipMapPosition(data.locationId, state.ship?.name);
    }

    // Show notification
    showNotification(`Undocked from ${data.fromLocation}`, 'success');

    // Re-render pilot panel to update location and hide UNDOCK button
    if (state.role === 'pilot') {
      renderRolePanelFn('pilot');
    }
  });
}
