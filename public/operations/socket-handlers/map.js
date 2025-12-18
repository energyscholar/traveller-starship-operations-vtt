/**
 * AR-201: Map Sharing Socket Handlers
 *
 * Handles map sharing and star system events:
 * - Map shared/unshared
 * - Map view updates
 * - Star system sharing
 */

import { registerHandler } from './index.js';

// ==================== Map Sharing ====================

function handleMapShared(data, state, helpers) {
  state.sharedMapActive = true;
  state.sharedMapView = data;
  helpers.updateSharedMapBadge(true);
  helpers.mapDebugMessage(`Map shared by ${data.sharedBy || 'GM'}`, 'info');

  // Auto-switch for PLAYERS only - GM already has map open
  if (data.autoSwitch && !state.isGM) {
    helpers.showSharedMap();
    helpers.updateSharedMapFrame(data);
    helpers.showNotification('GM is sharing the map', 'info');
  }

  // GM just needs button state updated
  helpers.updateSharedMapButtons();
}

function handleMapUnshared(data, state, helpers) {
  state.sharedMapActive = false;
  state.sharedMapView = null;
  helpers.updateSharedMapBadge(false);
  helpers.updateSharedMapButtons();
  helpers.mapDebugMessage('Map sharing stopped', 'info');
  if (!state.isGM) {
    helpers.showNotification('Map sharing ended', 'info');
    helpers.closeSharedMap();
  }
}

function handleMapViewUpdated(data, state, helpers) {
  state.sharedMapView = data;
  helpers.mapDebugMessage(`View updated: ${data.sector || 'unknown'}`, 'info');
  if (!state.isGM) {
    helpers.updateSharedMapFrame(data);
  }
}

function handleMapState(data, state, helpers) {
  state.sharedMapActive = data.shared;
  state.sharedMapView = data.shared ? data : null;
  helpers.updateSharedMapBadge(data.shared);
  if (data.shared) {
    helpers.mapDebugMessage('Reconnected to shared map', 'info');
  }
}

// ==================== Star System ====================

function handleStarSystemShared(data, state, helpers) {
  console.log('[StarSystem] Received shared system:', data.sector, data.hex);
  helpers.showNotification(`Star system shared: ${data.system?.name || data.hex}`, 'info');

  // Auto-open the system map for players with the shared data
  if (!state.isGM) {
    helpers.showSystemMap(data.system?.name || 'Shared System');
    // Wait for canvas to initialize, then load the system
    setTimeout(() => {
      helpers.loadSystemMap(data.system, data.sector, data.hex);
    }, 100);
  }
}

function handleStarSystemData(data, state, helpers) {
  console.log('[StarSystem] Received system data:', data.sector, data.hex);
  helpers.loadSystemMap(data.system, data.sector, data.hex);
}

function handleStarSystemSaved(data, state, helpers) {
  console.log('[StarSystem] System saved:', data.sector, data.hex);
  helpers.showNotification('Star system saved', 'success');
}

// ==================== Register All Handlers ====================

registerHandler('ops:mapShared', handleMapShared);
registerHandler('ops:mapUnshared', handleMapUnshared);
registerHandler('ops:mapViewUpdated', handleMapViewUpdated);
registerHandler('ops:mapState', handleMapState);
registerHandler('ops:starSystemShared', handleStarSystemShared);
registerHandler('ops:starSystemData', handleStarSystemData);
registerHandler('ops:starSystemSaved', handleStarSystemSaved);

// Export for testing
export {
  handleMapShared,
  handleMapUnshared,
  handleMapViewUpdated,
  handleMapState,
  handleStarSystemShared,
  handleStarSystemData,
  handleStarSystemSaved
};
