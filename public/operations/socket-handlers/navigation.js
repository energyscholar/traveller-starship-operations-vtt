/**
 * AR-201: Navigation Socket Handlers
 *
 * Handles location, position, and deep space events:
 * - Current system updates
 * - Deep space mode
 * - Location history/favorites
 * - Home system
 * - Location changes
 */

import { registerHandler } from './index.js';

// ==================== System Location ====================

function handleCurrentSystemUpdated(data, state, helpers) {
  const locationEl = document.getElementById('bridge-location');
  if (locationEl) {
    locationEl.textContent = data.locationDisplay;
  }
  // AR-103: Update hex coordinate display in top bar with system name
  const hexEl = document.getElementById('bridge-hex');
  if (hexEl) {
    if (data.locationDisplay) {
      hexEl.textContent = `${data.hex || '----'} · ${data.locationDisplay}`;
    } else {
      hexEl.textContent = data.hex || '----';
    }
    hexEl.title = data.locationDisplay || 'Current parsec';
  }
  // Update campaign state with sector/hex for jump map
  if (state.campaign) {
    state.campaign.current_system = data.locationDisplay;
    state.campaign.current_sector = data.sector || null;
    state.campaign.current_hex = data.hex || null;
  }
  // Refresh jump map if astrogator
  if (state.selectedRole === 'astrogator') {
    helpers.renderRoleDetailPanel(state.selectedRole);
    helpers.initJumpMapIfNeeded();
  }
  helpers.showNotification(`Location set to ${data.locationDisplay}`, 'success');
}

// ==================== Deep Space ====================

function handleDeepSpaceUpdated(data, state, helpers) {
  if (state.campaign) {
    state.campaign.in_deep_space = data.inDeepSpace;
    state.campaign.deep_space_reference = data.referenceSystem;
    state.campaign.deep_space_bearing = data.bearing;
    state.campaign.deep_space_distance = data.distance;
    state.campaign.current_system = data.locationDisplay;
  }
  const locationEl = document.getElementById('bridge-location');
  if (locationEl) {
    locationEl.textContent = data.locationDisplay || 'Deep Space';
  }
  helpers.showNotification(data.inDeepSpace ? 'Entered deep space' : 'Exited deep space', 'info');
}

// ==================== Location Data/History ====================

function handleLocationData(data, state, helpers) {
  state.locationHistory = data.locationHistory || [];
  state.favoriteLocations = data.favoriteLocations || [];
  state.homeSystem = data.homeSystem || null;
  state.inDeepSpace = data.inDeepSpace || false;
  state.deepSpaceReference = data.deepSpaceReference;
  state.deepSpaceBearing = data.deepSpaceBearing;
  state.deepSpaceDistance = data.deepSpaceDistance;
  helpers.renderQuickLocations();
}

function handleHomeSystemSet(data, state, helpers) {
  state.homeSystem = data.homeSystem;
  helpers.renderQuickLocations();
  helpers.showNotification(`Home system set to ${data.homeSystem}`, 'success');
}

function handleFavoritesUpdated(data, state, helpers) {
  state.favoriteLocations = data.favoriteLocations || [];
  helpers.renderQuickLocations();
}

// ==================== Location Changed ====================

function handleLocationChanged(data, state, helpers) {
  state.campaign.current_system = data.newLocation;
  if (data.newDate) {
    state.campaign.current_date = data.newDate;
  }
  // AR-110: Update hex when location changes (both campaign and shipState)
  if (data.hex) {
    state.campaign.current_hex = data.hex;
    if (state.shipState) {
      state.shipState.systemHex = data.hex;
    }
    // AR-168: Update bridge-hex DOM element with system name
    const hexEl = document.getElementById('bridge-hex');
    if (hexEl) {
      if (data.newLocation) {
        hexEl.textContent = `${data.hex} · ${data.newLocation}`;
      } else {
        hexEl.textContent = data.hex;
      }
      hexEl.title = data.newLocation || 'Current parsec';
    }
  }
  // AR-126: Update sector for jump map recentering
  if (data.sector) {
    state.campaign.current_sector = data.sector;
  }
  // Autorun 5: Update contacts if provided
  if (data.contacts) {
    state.contacts = data.contacts;
  }
  helpers.renderBridge();
  // AR-110: Refresh role panel (especially Astrogator which shows current system)
  helpers.renderRoleDetailPanel(state.selectedRole);
  // AR-168: Load new system data for System View
  if (data.newLocation) {
    helpers.loadCurrentSystem(data.newLocation);
  }
  // Refresh jump map for astrogator after location change
  if (state.selectedRole === 'astrogator') {
    helpers.initJumpMapIfNeeded();
  }
}

// ==================== Register All Handlers ====================

registerHandler('ops:currentSystemUpdated', handleCurrentSystemUpdated);
registerHandler('ops:deepSpaceUpdated', handleDeepSpaceUpdated);
registerHandler('ops:locationData', handleLocationData);
registerHandler('ops:homeSystemSet', handleHomeSystemSet);
registerHandler('ops:favoritesUpdated', handleFavoritesUpdated);
registerHandler('ops:locationChanged', handleLocationChanged);

// Export for testing
export {
  handleCurrentSystemUpdated,
  handleDeepSpaceUpdated,
  handleLocationData,
  handleHomeSystemSet,
  handleFavoritesUpdated,
  handleLocationChanged
};
