/**
 * AR-152-1: Shared Map Module
 * Extracted from app.js - TravellerMap integration for shared sector viewing
 */

import { DEFAULT_SECTOR, DEFAULT_HEX, DEFAULT_SYSTEM } from './constants.js';

/**
 * Build TravellerMap URL for iframe
 * @param {Object} state - Application state
 * @param {string} sector - Sector name
 * @param {string} hex - Hex coordinates
 * @returns {string} TravellerMap URL
 */
export function buildTravellerMapUrl(state, sector, hex) {
  const { scale, style } = state.sharedMapSettings;
  const params = new URLSearchParams({
    sector: sector,
    hex: hex,
    scale: scale,
    style: style
  });
  return `https://travellermap.com/?${params.toString()}`;
}

/**
 * Show shared map overlay
 * @param {Object} state - Application state
 */
export function showSharedMap(state) {
  // Create fullscreen map overlay with interactive TravellerMap iframe
  const existing = document.getElementById('shared-map-overlay');
  if (existing) {
    existing.classList.remove('hidden');
    // If player and shared view exists, sync to GM's view
    if (!state.isGM && state.sharedMapView) {
      updateSharedMapFrame(state, state.sharedMapView);
    } else {
      updateSharedMapIframe(state);
      // AR-50.2: Track GM's current view when opening map
      if (state.isGM) {
        trackGMMapView(state);
      }
    }
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'shared-map-overlay';
  overlay.className = 'shared-map-overlay';

  // AR-50.2: Use shared view data if available (for players), else use campaign data
  let sector, hex, systemName;
  if (!state.isGM && state.sharedMapView) {
    sector = state.sharedMapView.sector || DEFAULT_SECTOR;
    hex = state.sharedMapView.hex || DEFAULT_HEX;
    systemName = state.sharedMapView.center || 'Unknown';
  } else {
    sector = state.campaign?.current_sector || DEFAULT_SECTOR;
    hex = state.campaign?.current_hex || DEFAULT_HEX;
    systemName = state.campaign?.current_system || DEFAULT_SYSTEM;
  }

  overlay.innerHTML = `
    <div class="shared-map-header">
      <h2>Shared Map${state.sharedMapActive ? ' <span class="live-badge">LIVE</span>' : ''}</h2>
      <div class="shared-map-controls" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <span id="map-location-display" style="color: #888; font-size: 12px;">Centered on: <strong>${systemName}</strong> (${hex})</span>
        ${state.isGM ? `
          <div style="display: flex; gap: 4px; align-items: center;">
            <input type="text" id="map-hex-input" placeholder="Hex (e.g. 0404)" style="width: 100px; padding: 4px 8px; font-size: 12px; border-radius: 4px; border: 1px solid #444; background: #333; color: #fff;" value="${hex}">
            <button id="btn-goto-hex" class="btn btn-secondary btn-small" title="Navigate to hex and track for re-center">Go</button>
          </div>
          <button id="btn-share-map" class="btn btn-primary ${state.sharedMapActive ? 'hidden' : ''}">Share with Players</button>
          <button id="btn-recenter-players" class="btn btn-secondary ${state.sharedMapActive ? '' : 'hidden'}" title="Sync all players to tracked location">Re-center Players</button>
          <button id="btn-unshare-map" class="btn btn-danger ${state.sharedMapActive ? '' : 'hidden'}">Stop Sharing</button>
        ` : ''}
        <button id="btn-close-map" class="btn btn-secondary">Close</button>
      </div>
    </div>
    <div class="shared-map-container" id="shared-sector-map-container" style="flex: 1; position: relative; overflow: hidden; background: #000;">
      <iframe
        id="shared-map-iframe"
        src="${buildTravellerMapUrl(state, sector, hex)}"
        style="width: 100%; height: 100%; border: none;"
        allowfullscreen
      ></iframe>
    </div>
    <div class="shared-map-footer" style="padding: 8px 16px; background: rgba(0,0,0,0.5); display: flex; gap: 16px; align-items: center;">
      <span style="color: #aaa;">Drag to pan | Scroll to zoom | Double-click to zoom in</span>
      <span style="color: #666; margin-left: auto;">Powered by travellermap.com</span>
    </div>
  `;

  document.body.appendChild(overlay);

  // Event handlers
  document.getElementById('btn-close-map').addEventListener('click', closeSharedMap);

  if (state.isGM) {
    // AR-50.2: Go to hex button - navigates iframe and tracks location
    document.getElementById('btn-goto-hex')?.addEventListener('click', () => {
      const hexInput = document.getElementById('map-hex-input');
      const hex = hexInput?.value?.trim();
      if (!hex || !/^\d{4}$/.test(hex)) {
        showNotification('Enter a valid hex (e.g. 0404)', 'warning');
        return;
      }
      const sector = state.campaign?.current_sector || 'Spinward Marches';
      navigateToHex(state, sector, hex);
    });

    // Also allow Enter key in hex input
    document.getElementById('map-hex-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('btn-goto-hex')?.click();
      }
    });

    document.getElementById('btn-share-map')?.addEventListener('click', () => {
      // Share using tracked view if available
      const view = state.gmCurrentMapView || {
        center: state.campaign?.current_system,
        sector: state.campaign?.current_sector,
        hex: state.campaign?.current_hex
      };
      state.socket.emit('ops:shareMap', {
        center: view.center,
        sector: view.sector,
        hex: view.hex,
        scale: state.sharedMapSettings.scale,
        style: state.sharedMapSettings.style
      });
    });

    // AR-50.2: Re-center players button - broadcasts GM's current view to all players
    document.getElementById('btn-recenter-players')?.addEventListener('click', () => {
      // Use GM's tracked view if available, fallback to campaign data
      const view = state.gmCurrentMapView || {
        center: state.campaign?.current_system,
        sector: state.campaign?.current_sector,
        hex: state.campaign?.current_hex
      };
      state.socket.emit('ops:updateMapView', {
        center: view.center,
        sector: view.sector,
        hex: view.hex,
        scale: state.sharedMapSettings.scale,
        style: state.sharedMapSettings.style
      });
      showNotification('Players re-centered to current location', 'info');
    });

    document.getElementById('btn-unshare-map')?.addEventListener('click', () => {
      state.socket.emit('ops:unshareMap');
    });
  }
}

/**
 * Update iframe src when location changes
 * @param {Object} state - Application state
 */
export function updateSharedMapIframe(state) {
  const iframe = document.getElementById('shared-map-iframe');
  if (!iframe) return;

  const sector = state.campaign?.current_sector || DEFAULT_SECTOR;
  const hex = state.campaign?.current_hex || DEFAULT_HEX;
  iframe.src = buildTravellerMapUrl(state, sector, hex);

  // Update header text
  const header = document.querySelector('.shared-map-controls span');
  if (header) {
    const systemName = state.campaign?.current_system || 'Unknown';
    header.innerHTML = `Centered on: <strong>${systemName}</strong> (${hex})`;
  }
}

/**
 * Close shared map overlay
 */
export function closeSharedMap() {
  const overlay = document.getElementById('shared-map-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

/**
 * Track GM's current view for re-center functionality
 * @param {Object} state - Application state
 */
export function trackGMMapView(state) {
  const sector = state.campaign?.current_sector || DEFAULT_SECTOR;
  const hex = state.campaign?.current_hex || DEFAULT_HEX;
  const systemName = state.campaign?.current_system || DEFAULT_SYSTEM;

  state.gmCurrentMapView = {
    center: systemName,
    sector: sector,
    hex: hex
  };
  console.log('[MAP] GM view tracked:', state.gmCurrentMapView);
}

/**
 * Navigate GM's map to a specific hex and track it
 * @param {Object} state - Application state
 * @param {string} sector - Sector name
 * @param {string} hex - Hex coordinates
 */
export function navigateToHex(state, sector, hex) {
  const iframe = document.getElementById('shared-map-iframe');
  if (!iframe) return;

  // Update iframe
  const url = buildTravellerMapUrl(state, sector, hex);
  iframe.src = url;

  // Track this as GM's current view
  state.gmCurrentMapView = {
    center: `Hex ${hex}`,
    sector: sector,
    hex: hex
  };
  console.log('[MAP] GM navigated to:', state.gmCurrentMapView);

  // Update header display
  const display = document.getElementById('map-location-display');
  if (display) {
    display.innerHTML = `Centered on: <strong>Hex ${hex}</strong> (${hex})`;
  }

  // If already sharing, immediately broadcast to players
  if (state.sharedMapActive) {
    state.socket.emit('ops:updateMapView', {
      center: state.gmCurrentMapView.center,
      sector: state.gmCurrentMapView.sector,
      hex: state.gmCurrentMapView.hex,
      scale: state.sharedMapSettings.scale,
      style: state.sharedMapSettings.style
    });
    showNotification(`Players synced to ${hex}`, 'info');
  }
}

/**
 * Initialize TravellerMap postMessage listener for GM clicks
 * @param {Object} state - Application state
 */
export function initTravellerMapListener(state) {
  window.addEventListener('message', (event) => {
    // Only process messages from TravellerMap
    if (!event.origin.includes('travellermap.com')) return;
    if (!event.data || event.data.source !== 'travellermap') return;

    // Only GM tracks clicks
    if (!state.isGM) return;

    const { type, location } = event.data;
    if (type === 'click' || type === 'doubleclick') {
      // TravellerMap sends x, y in world coordinates (not sector/hex directly)
      // We need to convert or use the sector/hex from a subsequent lookup
      // For now, log and note this is a limitation
      console.log('[MAP] TravellerMap click:', location);

      // The click location gives us world coordinates, but we'd need to convert
      // to sector/hex. TravellerMap doesn't give us that directly.
      // Alternative approach: Let GM manually set location via UI
      // or we track what we programmatically navigate to
    }
  });
}

/**
 * Update shared map badge visibility
 * @param {boolean} isLive - Whether map is being shared
 */
export function updateSharedMapBadge(isLive) {
  const badge = document.getElementById('shared-map-badge');
  if (badge) {
    badge.classList.toggle('hidden', !isLive);
  }
  // Also update header if map is open
  const liveSpan = document.querySelector('.shared-map-header .live-badge');
  if (liveSpan) {
    liveSpan.style.display = isLive ? 'inline' : 'none';
  }
}

/**
 * Update shared map frame with new view data (for player sync)
 * @param {Object} state - Application state
 * @param {Object} data - View data with sector, hex, center, scale, style
 */
export function updateSharedMapFrame(state, data) {
  const iframe = document.getElementById('shared-map-iframe');
  if (!iframe || !data) return;

  const sector = data.sector || DEFAULT_SECTOR;
  const hex = data.hex || DEFAULT_HEX;
  const scale = data.scale || state.sharedMapSettings.scale;
  const style = data.style || state.sharedMapSettings.style;

  // Build URL with shared scale/style (not local settings)
  const params = new URLSearchParams({ sector, hex, scale, style });
  const url = `https://travellermap.com/?${params.toString()}`;

  // Only update if URL actually changed
  if (iframe.src !== url) {
    iframe.src = url;
    console.log(`[MAP] Synced to: ${sector}/${hex} scale=${scale}`);
  }

  // Update header text
  const header = document.querySelector('.shared-map-controls span');
  if (header) {
    const systemName = data.center || 'Unknown';
    header.innerHTML = `Centered on: <strong>${systemName}</strong> (${hex})`;
  }
}
