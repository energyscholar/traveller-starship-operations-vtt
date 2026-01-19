/**
 * V2 Shared Map Module
 * IIFE exposing window.SharedMap for TravellerMap integration
 */
(function(window) {
  'use strict';

  function buildUrl(state, sector, hex) {
    const { scale, style } = state.sharedMapSettings || { scale: 64, style: 'atlas' };
    const params = new URLSearchParams({
      sector: sector || 'Spinward Marches',
      hex: hex || '1910',
      scale: scale || 64,
      style: style || 'atlas'
    });
    return `https://travellermap.com/?${params.toString()}`;
  }

  function show(state) {
    const overlay = document.getElementById('shared-map-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    // Show/hide GM-only controls
    const isGM = state.mode === 'gm';
    document.querySelectorAll('.gm-only').forEach(el => {
      el.classList.toggle('hidden', !isGM);
    });

    // Update share/unshare button visibility based on active state
    updateShareButtons(state);

    // Load iframe if not already loaded
    const iframe = document.getElementById('shared-map-iframe');
    if (iframe && !iframe.src) {
      const view = state.sharedMapView || {};
      iframe.src = buildUrl(state, view.sector, view.hex);
    }

    // Update location display
    updateLocationDisplay(state);
  }

  function close() {
    const overlay = document.getElementById('shared-map-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function share(state) {
    if (!state.socket) return;
    const iframe = document.getElementById('shared-map-iframe');
    const url = iframe?.src || '';
    // Parse current view from iframe URL
    const params = new URLSearchParams(url.split('?')[1] || '');
    state.socket.emit('ops:shareMap', {
      sector: params.get('sector') || 'Spinward Marches',
      hex: params.get('hex') || '1910',
      scale: params.get('scale') || 64,
      style: params.get('style') || 'atlas'
    });
  }

  function unshare(state) {
    if (!state.socket) return;
    state.socket.emit('ops:unshareMap');
  }

  function recenter(state) {
    if (!state.socket || !state.sharedMapView) return;
    state.socket.emit('ops:recenterPlayers', state.sharedMapView);
  }

  function gotoHex(state) {
    const input = document.getElementById('map-hex-input');
    const hex = input?.value?.trim();
    if (!hex) return;
    const iframe = document.getElementById('shared-map-iframe');
    if (iframe) {
      const view = state.sharedMapView || {};
      iframe.src = buildUrl(state, view.sector, hex);
    }
  }

  function updateShareButtons(state) {
    const shareBtn = document.getElementById('btn-share-map');
    const unshareBtn = document.getElementById('btn-unshare-map');
    const recenterBtn = document.getElementById('btn-recenter-players');
    const isSharing = state.sharedMapActive;

    if (shareBtn) shareBtn.classList.toggle('hidden', isSharing);
    if (unshareBtn) unshareBtn.classList.toggle('hidden', !isSharing);
    if (recenterBtn) recenterBtn.classList.toggle('hidden', !isSharing);

    // Update badge
    const badge = document.getElementById('shared-map-badge');
    const liveBadge = document.getElementById('map-live-badge');
    if (badge) badge.classList.toggle('hidden', !isSharing);
    if (liveBadge) liveBadge.classList.toggle('hidden', !isSharing);
  }

  function updateLocationDisplay(state) {
    const display = document.getElementById('map-location-display');
    if (!display) return;
    const view = state.sharedMapView || {};
    if (view.system && view.hex) {
      display.textContent = `Centered on: ${view.system} (${view.hex})`;
    } else if (view.hex) {
      display.textContent = `Centered on: ${view.sector || 'Spinward Marches'} ${view.hex}`;
    } else {
      display.textContent = 'Centered on: ...';
    }
  }

  function handleMapShared(data, state) {
    state.sharedMapActive = true;
    state.sharedMapView = data;
    updateShareButtons(state);
    updateLocationDisplay(state);
    // Auto-open for players
    if (state.mode !== 'gm') {
      show(state);
      updateIframe(state, data);
    }
    window.showToast?.(`Map shared by ${data.sharedBy || 'GM'}`);
  }

  function handleMapUnshared(data, state) {
    state.sharedMapActive = false;
    state.sharedMapView = null;
    updateShareButtons(state);
    // Auto-close for players
    if (state.mode !== 'gm') {
      close();
    }
    window.showToast?.('Map sharing stopped');
  }

  function handleMapViewUpdated(data, state) {
    state.sharedMapView = data;
    updateLocationDisplay(state);
    // Sync iframe for players
    if (state.mode !== 'gm') {
      updateIframe(state, data);
    }
  }

  function handleMapState(data, state) {
    state.sharedMapActive = data.shared;
    state.sharedMapView = data.shared ? data : null;
    updateShareButtons(state);
    if (data.shared) {
      window.showToast?.('Reconnected to shared map');
    }
  }

  function updateIframe(state, data) {
    const iframe = document.getElementById('shared-map-iframe');
    if (iframe) {
      iframe.src = buildUrl(state, data.sector, data.hex);
    }
  }

  // Expose API
  window.SharedMap = {
    show, close, share, unshare, recenter, gotoHex,
    handleMapShared, handleMapUnshared, handleMapViewUpdated, handleMapState,
    updateShareButtons
  };

})(window);
