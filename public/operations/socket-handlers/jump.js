/**
 * AR-201: Jump Socket Handlers
 *
 * Handles jump drive and navigation events:
 * - Jump status
 * - Jump plotting
 * - Jump initiation/completion
 * - Position verification
 */

import { registerHandler } from './index.js';

// ==================== Jump Status ====================

function handleJumpStatus(data, state, helpers) {
  state.jumpStatus = data;
  if (state.selectedRole === 'astrogator' || state.selectedRole === 'pilot') {
    helpers.renderRoleDetailPanel(state.selectedRole);
  }
}

function handleJumpPlotted(data, state, helpers) {
  helpers.handleJumpPlotted(data);
}

function handleJumpInitiated(data, state, helpers) {
  state.jumpStatus = {
    inJump: true,
    jumpStartDate: data.jumpStartDate,
    jumpEndDate: data.jumpEndDate,
    destination: data.destination,
    jumpDistance: data.distance,
    hoursRemaining: 168,
    canExit: false
  };
  // Update ship fuel
  if (state.ship?.current_state) {
    state.ship.current_state.fuel = data.fuelRemaining;
  }
  // Hide plot result since we're now jumping
  const plotResult = document.getElementById('jump-plot-result');
  if (plotResult) plotResult.style.display = 'none';
  helpers.showNotification(`Jump initiated to ${data.destination}. ETA: ${data.jumpEndDate}`, 'info');
  helpers.renderRoleDetailPanel(state.selectedRole);
  helpers.renderShipStatus();
}

function handleJumpCompleted(data, state, helpers) {
  state.jumpStatus = { inJump: false };
  state.campaign.current_system = data.arrivedAt;
  // AR-124: Sync position verification state to BOTH state objects
  // Critical: role-panels reads from state.ship.current_state, not state.shipState
  const positionVerified = data.positionVerified ?? false;
  if (state.ship?.current_state) {
    state.ship.current_state.positionVerified = positionVerified;
    state.ship.current_state.locationId = 'loc-exit-jump';
    state.ship.current_state.locationName = 'Exit Jump Space';
  }
  if (state.shipState) {
    state.shipState.positionVerified = positionVerified;
    state.shipState.locationId = 'loc-exit-jump';
    state.shipState.locationName = 'Exit Jump Space';
  }
  // AR-103: Update hex after jump (parsec location changed) with system tooltip
  // AR-126: Also update sector for jump map recentering
  console.log('[AR-168] ops:jumpCompleted received:', { hex: data.hex, sector: data.sector, arrivedAt: data.arrivedAt });
  if (data.hex) {
    state.campaign.current_hex = data.hex;
    console.log('[AR-168] Updated state.campaign.current_hex to:', data.hex);
    if (state.ship?.current_state) {
      state.ship.current_state.systemHex = data.hex;
    }
    if (state.shipState) {
      state.shipState.systemHex = data.hex;
    }
    const hexEl = document.getElementById('bridge-hex');
    if (hexEl) {
      if (data.arrivedAt) {
        hexEl.textContent = `${data.hex} · ${data.arrivedAt}`;
      } else {
        hexEl.textContent = data.hex;
      }
      hexEl.title = data.arrivedAt || 'Current parsec';
    }
  }
  // AR-126: Update sector for jump map
  if (data.sector) {
    state.campaign.current_sector = data.sector;
  }
  // Stage 7: Update date after jump
  if (data.newDate) {
    state.campaign.current_date = data.newDate;
  }
  // Autorun 5: Store news and mail for display
  state.systemNews = data.news || [];
  state.systemMail = data.mail || {};
  state.selectedRoleContent = data.roleContent || {};
  helpers.showNotification(`Arrived at ${data.arrivedAt}`, 'success');
  helpers.renderRoleDetailPanel(state.selectedRole);
  helpers.renderBridge();
  // AR-126: Refresh jump map with new location
  helpers.initJumpMapIfNeeded();
  // Show news/mail modal if there's content
  if (state.systemNews.length > 0 || Object.keys(state.systemMail).length > 0) {
    helpers.showNewsMailModal(data.arrivedAt);
  }
}

// ==================== Position Verification ====================

function handlePositionVerified(data, state, helpers) {
  // Update BOTH state objects for consistency
  if (state.ship?.current_state) {
    state.ship.current_state.positionVerified = true;
  }
  if (state.shipState) {
    state.shipState.positionVerified = true;
  }
  // AR-110: Update campaign location data from verification response
  if (data.currentSystem) {
    state.campaign.current_system = data.currentSystem;
  }
  if (data.currentHex) {
    state.campaign.current_hex = data.currentHex;
    if (state.ship?.current_state) {
      state.ship.current_state.systemHex = data.currentHex;
    }
    if (state.shipState) {
      state.shipState.systemHex = data.currentHex;
    }
    // AR-168: Update bridge-hex DOM element with hex + system name
    const hexEl = document.getElementById('bridge-hex');
    if (hexEl) {
      if (data.currentSystem) {
        hexEl.textContent = `${data.currentHex} · ${data.currentSystem}`;
      } else {
        hexEl.textContent = data.currentHex;
      }
      hexEl.title = data.currentSystem || 'Current parsec';
    }
  }
  if (data.currentSector) {
    state.campaign.current_sector = data.currentSector;
  }
  helpers.showNotification(data.message, data.success ? 'success' : 'warning');
  helpers.renderRoleDetailPanel(state.selectedRole);
  helpers.renderBridge();
  // AR-168: Refresh displays after position verification (system changed)
  if (data.currentSystem) {
    helpers.loadCurrentSystem(data.currentSystem);
  }
  if (state.selectedRole === 'astrogator') {
    helpers.updateJumpMap();
  }
}

// AR-214: Jump status updated (for skip-to-exit feature)
function handleJumpStatusUpdated(data, state, helpers) {
  const { jumpStatus, message } = data;
  state.jumpStatus = jumpStatus;
  helpers.showNotification(message || 'Jump status updated', 'success');
  helpers.renderRoleDetailPanel(state.selectedRole);
}

// ==================== Register All Handlers ====================

registerHandler('ops:jumpStatus', handleJumpStatus);
registerHandler('ops:jumpPlotted', handleJumpPlotted);
registerHandler('ops:jumpInitiated', handleJumpInitiated);
registerHandler('ops:jumpCompleted', handleJumpCompleted);
registerHandler('ops:positionVerified', handlePositionVerified);
registerHandler('ops:jumpStatusUpdated', handleJumpStatusUpdated);

// Export for testing
export {
  handleJumpStatus,
  handleJumpPlotted,
  handleJumpInitiated,
  handleJumpCompleted,
  handlePositionVerified,
  handleJumpStatusUpdated
};
