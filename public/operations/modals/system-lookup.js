/**
 * AR-201: System Lookup Modal Handler
 *
 * Handles TravellerMap system search, quick locations, deep space mode.
 */

import { registerModalHandler } from './index.js';

function setupSystemLookupModal(modal, state, helpers) {
  const { closeModal, showTravelModal, escapeHtml } = helpers;

  let selectedSystem = null;

  async function performSearch() {
    const query = document.getElementById('system-search-input').value.trim();
    if (!query) return;

    const resultsContainer = document.getElementById('system-search-results');
    resultsContainer.innerHTML = '<p class="search-loading">Searching TravellerMap...</p>';
    document.getElementById('btn-set-system').disabled = true;
    selectedSystem = null;

    try {
      const response = await fetch(`/api/travellermap/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data.Results?.Count > 0) {
        // Filter to only World results
        const worlds = data.Results.Items.filter(item => item.World);
        if (worlds.length === 0) {
          resultsContainer.innerHTML = '<p class="search-placeholder">No worlds found. Try a different search.</p>';
          return;
        }

        resultsContainer.innerHTML = worlds.map((item, index) => {
          const world = item.World;
          return `<div class="system-result-item" data-index="${index}">
            <div class="system-result-name">${escapeHtml(world.Name)}<span class="system-result-uwp">${world.Uwp}</span></div>
            <div class="system-result-details">${escapeHtml(world.Sector)} ${world.HexX}${String(world.HexY).padStart(2, '0')}</div>
          </div>`;
        }).join('');

        // Store worlds data for selection
        resultsContainer.dataset.worlds = JSON.stringify(worlds);

        // Click handler for results
        resultsContainer.querySelectorAll('.system-result-item').forEach(item => {
          item.addEventListener('click', () => {
            resultsContainer.querySelectorAll('.system-result-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            const worlds = JSON.parse(resultsContainer.dataset.worlds);
            selectedSystem = worlds[parseInt(item.dataset.index)].World;
            document.getElementById('btn-set-system').disabled = false;
          });
        });
      } else {
        resultsContainer.innerHTML = '<p class="search-placeholder">No results found. Try a different search.</p>';
      }
    } catch (error) {
      resultsContainer.innerHTML = `<p class="search-placeholder">Search failed: ${error.message}</p>`;
    }
  }

  // Search button
  document.getElementById('btn-system-search').addEventListener('click', performSearch);

  // Enter key in search input
  document.getElementById('system-search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  // Set system button - AR-33: Show travel confirmation modal
  document.getElementById('btn-set-system').addEventListener('click', () => {
    if (!selectedSystem) return;
    // AR-66: Fix undefined hex coordinates
    const hexX = selectedSystem.HexX || selectedSystem.Hex?.substring(0, 2) || '??';
    const hexY = selectedSystem.HexY || selectedSystem.Hex?.substring(2, 4) || '??';
    const systemName = `${selectedSystem.Name} (${selectedSystem.Sector || 'Unknown'} ${hexX}${String(hexY).padStart(2, '0')})`;
    showTravelModal({
      system: systemName,
      uwp: selectedSystem.Uwp,
      sector: selectedSystem.Sector,
      hex: `${selectedSystem.HexX}${String(selectedSystem.HexY).padStart(2, '0')}`
    });
  });

  // AR-23.6: Deep space mode toggle
  const deepSpaceToggle = document.getElementById('deep-space-toggle');
  const deepSpaceFields = document.getElementById('deep-space-fields');
  if (deepSpaceToggle && deepSpaceFields) {
    deepSpaceToggle.addEventListener('change', () => {
      deepSpaceFields.classList.toggle('hidden', !deepSpaceToggle.checked);
      if (!deepSpaceToggle.checked) {
        // Disable deep space mode
        state.socket.emit('ops:setDeepSpace', { enabled: false });
      } else {
        // Set reference to current system
        const refInput = document.getElementById('deep-space-reference');
        if (refInput && state.campaign?.current_system) {
          refInput.value = state.campaign.current_system;
        }
      }
    });
  }

  // AR-23.6: Update deep space position button
  const updateDeepSpaceBtn = document.getElementById('btn-update-deep-space');
  if (updateDeepSpaceBtn) {
    updateDeepSpaceBtn.addEventListener('click', () => {
      const referenceSystem = document.getElementById('deep-space-reference').value;
      const bearing = parseInt(document.getElementById('deep-space-bearing').value) || 0;
      const distance = parseFloat(document.getElementById('deep-space-distance').value) || 0;
      state.socket.emit('ops:setDeepSpace', {
        enabled: true,
        referenceSystem,
        bearing,
        distance
      });
    });
  }

  // AR-23.7: Home system button - go to home
  const homeBtn = document.getElementById('home-system-btn');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      if (state.homeSystem) {
        // Parse home system and set it
        state.socket.emit('ops:setCurrentSystem', { system: state.homeSystem });
        closeModal();
      }
    });
  }

  // AR-23.7: Quick location clicks (recent + favorites)
  const bindQuickLocationClicks = () => {
    // Recent locations
    document.querySelectorAll('#recent-locations .quick-location-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-favorite')) return;
        const loc = JSON.parse(item.dataset.location);
        state.socket.emit('ops:setCurrentSystem', {
          system: loc.system,
          uwp: loc.uwp,
          sector: loc.sector,
          hex: loc.hex
        });
        closeModal();
      });
      // Favorite toggle
      const favBtn = item.querySelector('.btn-favorite');
      if (favBtn) {
        favBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const loc = JSON.parse(item.dataset.location);
          state.socket.emit('ops:toggleFavoriteLocation', { location: loc });
        });
      }
    });

    // Favorite locations
    document.querySelectorAll('#favorite-locations .quick-location-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-set-home')) return;
        const loc = JSON.parse(item.dataset.location);
        state.socket.emit('ops:setCurrentSystem', {
          system: loc.system,
          uwp: loc.uwp,
          sector: loc.sector,
          hex: loc.hex
        });
        closeModal();
      });
      // Set as home button
      const homeBtn = item.querySelector('.btn-set-home');
      if (homeBtn) {
        homeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const loc = JSON.parse(item.dataset.location);
          state.socket.emit('ops:setHomeSystem', { locationDisplay: loc.locationDisplay });
        });
      }
    });
  };

  // Fetch location data and render
  state.socket.emit('ops:getLocationData');
  // Wait for data then bind clicks (renderQuickLocations will be called by socket handler)
  setTimeout(bindQuickLocationClicks, 100);
}

registerModalHandler('template-system-lookup', setupSystemLookupModal);

export { setupSystemLookupModal };
