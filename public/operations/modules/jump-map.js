/**
 * AR-153 Phase 2A: Jump Map Module
 * Jump map display and destination selection
 *
 * Note: Uses global escapeHtml and showNotification from helpers.js/notifications.js
 */

/**
 * Update jump map display
 * @param {Object} state - Application state
 */
export async function updateJumpMap(state) {
  const sector = state.campaign?.current_sector;
  const hex = state.campaign?.current_hex;


  if (!sector || !hex) {
    return;
  }

  const range = parseInt(document.getElementById('jump-map-range')?.value) || 2;
  const style = document.getElementById('jump-map-style')?.value || 'poster';

  const mapImg = document.getElementById('jump-map-image');
  const loadingEl = document.querySelector('.jump-map-loading');

  if (mapImg) {
    mapImg.style.display = 'none';
    if (loadingEl) loadingEl.style.display = 'block';

    // Use the proxy API
    const mapUrl = `/api/travellermap/jumpmap?sector=${encodeURIComponent(sector)}&hex=${hex}&jump=${range}&style=${style}`;
    mapImg.onload = () => {
      mapImg.style.display = 'block';
      if (loadingEl) loadingEl.style.display = 'none';
    };
    mapImg.onerror = () => {
      if (loadingEl) loadingEl.textContent = 'Failed to load map';
    };
    mapImg.src = mapUrl;
  }

  // Also fetch destinations
  fetchJumpDestinations(sector, hex, range);
}

/**
 * Fetch jump destinations from API
 * @param {string} sector - Current sector name
 * @param {string} hex - Current hex coordinate
 * @param {number} range - Jump range
 */
export async function fetchJumpDestinations(sector, hex, range) {
  const container = document.getElementById('jump-destinations');
  if (!container) return;

  try {
    const response = await fetch(`/api/travellermap/jumpworlds?sector=${encodeURIComponent(sector)}&hex=${hex}&jump=${range}`);
    const data = await response.json();

    if (data.Worlds && data.Worlds.length > 0) {
      container.innerHTML = `
        <div class="destinations-header">
          <span>System</span>
          <span>UWP</span>
          <span>Distance</span>
        </div>
        ${data.Worlds.map(world => {
          // AR-66: Fix undefined hex coordinates
          const hexX = world.HexX || world.Hex?.substring(0, 2) || '??';
          const hexY = world.HexY || world.Hex?.substring(2, 4) || '??';
          const worldHex = `${hexX}${String(hexY).padStart(2, '0')}`;
          const distance = world.Distance || 1;
          return `
          <div class="destination-item" data-name="${escapeHtml(world.Name)}" data-sector="${escapeHtml(world.Sector || sector)}" data-hex="${worldHex}" data-distance="${distance}" onclick="selectJumpDestination(this)">
            <span class="dest-name">${escapeHtml(world.Name)}</span>
            <span class="dest-uwp">${world.Uwp || '???????-?'}</span>
            <span class="dest-distance">J-${distance}</span>
          </div>
        `;
        }).join('')}
      `;
    } else {
      container.innerHTML = '<p class="placeholder">No nearby systems found</p>';
    }
  } catch (error) {
    container.innerHTML = `<p class="placeholder">Failed to fetch destinations</p>`;
  }
}

/**
 * Select a jump destination from the list
 * @param {HTMLElement} element - Clicked destination element
 */
export function selectJumpDestination(element) {
  const name = element.dataset.name;
  const sector = element.dataset.sector;
  const hex = element.dataset.hex;
  const distance = parseInt(element.dataset.distance) || 1;

  // Fill in the destination input - AR-168: Store hex/sector as data attributes for UID lookup
  const destInput = document.getElementById('jump-destination');
  if (destInput) {
    destInput.value = `${name} (${sector} ${hex})`;
    destInput.dataset.hex = hex;
    destInput.dataset.sector = sector;
    destInput.dataset.name = name;
  }

  // Auto-set distance dropdown to match actual parsec distance
  const distanceSelect = document.getElementById('jump-distance');
  if (distanceSelect) {
    distanceSelect.value = String(distance);
  }

  // Highlight selected
  document.querySelectorAll('.destination-item').forEach(el => el.classList.remove('selected'));
  element.classList.add('selected');

  showNotification(`Selected ${name} (J-${distance})`, 'info');
}

/**
 * Initialize jump map when astrogator panel is rendered
 * @param {Object} state - Application state
 * @param {Function} updateJumpMapFn - Bound updateJumpMap function
 */
export function initJumpMapIfNeeded(state, updateJumpMapFn) {
  if (state.selectedRole === 'astrogator' && state.campaign?.current_sector) {
    setTimeout(() => {
      updateJumpMapFn();
      initMapInteractions();
      restoreMapSize();
    }, 100);
  }
}

/**
 * Set map size with localStorage persistence
 * @param {string} size - Size preset (small, medium, large)
 */
export function setMapSize(size) {
  const container = document.getElementById('jump-map-container');
  if (!container) return;

  container.dataset.size = size;
  localStorage.setItem('ops-map-size', size);

  // Update select to match
  const select = document.getElementById('jump-map-size');
  if (select) select.value = size;
}

/**
 * Restore map size from localStorage
 */
export function restoreMapSize() {
  const saved = localStorage.getItem('ops-map-size');
  if (saved) {
    setMapSize(saved);
  }
}

/**
 * Initialize map drag-to-pan and keyboard navigation
 */
export function initMapInteractions() {
  const container = document.getElementById('jump-map-container');
  const img = document.getElementById('jump-map-image');
  if (!container || !img) return;

  let isDragging = false;
  let startX, startY, scrollLeft, scrollTop;

  // Mouse drag to pan
  container.addEventListener('mousedown', (e) => {
    if (e.target !== img && e.target !== container) return;
    isDragging = true;
    container.style.cursor = 'grabbing';
    startX = e.pageX - container.offsetLeft;
    startY = e.pageY - container.offsetTop;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
    e.preventDefault();
  });

  container.addEventListener('mouseleave', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });

  container.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const y = e.pageY - container.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    container.scrollLeft = scrollLeft - walkX;
    container.scrollTop = scrollTop - walkY;
  });

  // Set initial cursor
  container.style.cursor = 'grab';

  // Keyboard navigation when container is focused
  container.tabIndex = 0; // Make focusable
  container.addEventListener('keydown', (e) => {
    const step = 50;
    switch (e.key) {
      case 'ArrowLeft':
        container.scrollLeft -= step;
        e.preventDefault();
        break;
      case 'ArrowRight':
        container.scrollLeft += step;
        e.preventDefault();
        break;
      case 'ArrowUp':
        container.scrollTop -= step;
        e.preventDefault();
        break;
      case 'ArrowDown':
        container.scrollTop += step;
        e.preventDefault();
        break;
    }
  });
}
