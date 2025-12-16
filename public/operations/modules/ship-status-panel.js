/**
 * AR-164: Ship Status Panel
 * Displays ship cutaway diagram with dynamic health indicators
 */

console.log('[ShipStatusPanel] Module loading...');

// Ship Status Panel State
const shipStatusState = {
  container: null,
  svgDoc: null,
  visible: true,
  shipData: null,
  currentState: null
};

// System status mapping (system name -> SVG element ID)
const SYSTEM_SVG_MAP = {
  command: 'command',
  sensors: 'sensors',
  gunnery: 'gunnery',
  engineering: 'engineering',
  damageControl: 'damage-control',
  hangar: 'hangar',
  cargoFuel: 'cargo-fuel'
};

// Status colors
const STATUS_COLORS = {
  operational: '#48bb78',  // Green
  degraded: '#ecc94b',     // Yellow
  damaged: '#fc8181',      // Red
  offline: '#718096'       // Gray
};

/**
 * Initialize the ship status panel
 * @param {HTMLElement} container - Container element for the panel
 */
function initShipStatusPanel(container) {
  if (!container) {
    console.warn('[ShipStatusPanel] No container provided');
    return;
  }

  shipStatusState.container = container;

  // Load SVG into container
  loadShipSVG();

  console.log('[ShipStatusPanel] Initialized');
}

/**
 * Load the ship cutaway SVG
 */
async function loadShipSVG() {
  const container = shipStatusState.container;
  if (!container) return;

  try {
    // Create object element to load SVG (allows styling)
    const svgPath = '/img/q-ship-diagram-sideview.svg';

    // Fetch SVG content directly for inline embedding
    const response = await fetch(svgPath);
    if (!response.ok) {
      throw new Error(`Failed to load SVG: ${response.status}`);
    }

    const svgText = await response.text();
    container.innerHTML = svgText;

    // Get SVG document
    shipStatusState.svgDoc = container.querySelector('svg');

    if (shipStatusState.svgDoc) {
      // Make SVG responsive
      shipStatusState.svgDoc.style.width = '100%';
      shipStatusState.svgDoc.style.height = '100%';
      shipStatusState.svgDoc.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      console.log('[ShipStatusPanel] SVG loaded successfully');
    }
  } catch (err) {
    console.error('[ShipStatusPanel] Failed to load SVG:', err);
    container.innerHTML = `
      <div class="ship-status-error">
        <p>Ship diagram unavailable</p>
      </div>
    `;
  }
}

/**
 * Update system status colors on the SVG
 * @param {Object} systemStatus - Map of system names to status objects
 */
function updateSystemStatus(systemStatus) {
  const svg = shipStatusState.svgDoc;
  if (!svg || !systemStatus) return;

  for (const [system, svgId] of Object.entries(SYSTEM_SVG_MAP)) {
    const element = svg.getElementById(svgId);
    if (!element) continue;

    const status = systemStatus[system];
    const color = getStatusColor(status);

    // Update fill color of the system area
    const rect = element.querySelector('rect, ellipse');
    if (rect) {
      // Change gradient or direct fill based on status
      if (status?.severity > 0) {
        rect.style.fill = color;
        rect.style.opacity = '0.8';
      }
    }
  }
}

/**
 * Get color for system status
 * @param {Object} status - System status object
 * @returns {string} Color hex code
 */
function getStatusColor(status) {
  if (!status || status.severity === 0) {
    return STATUS_COLORS.operational;
  }
  if (status.disabled) {
    return STATUS_COLORS.offline;
  }
  if (status.severity >= 3) {
    return STATUS_COLORS.damaged;
  }
  return STATUS_COLORS.degraded;
}

/**
 * Update hull status bar
 * @param {number} current - Current hull HP
 * @param {number} max - Maximum hull HP
 */
function updateHullStatus(current, max) {
  const svg = shipStatusState.svgDoc;
  if (!svg) return;

  // Find hull bar elements in status bar
  const hullText = svg.querySelector('#status-bar text:nth-of-type(7)');
  if (hullText) {
    hullText.textContent = `${current}/${max}`;
  }
}

/**
 * Update fuel status bar
 * @param {number} current - Current fuel
 * @param {number} max - Maximum fuel
 */
function updateFuelStatus(current, max) {
  const svg = shipStatusState.svgDoc;
  if (!svg) return;

  // Update fuel bar width proportionally
  const percentage = max > 0 ? (current / max) : 0;
  const fuelBar = svg.querySelector('#status-bar rect:nth-of-type(4)');
  if (fuelBar) {
    const fullWidth = 80;
    fuelBar.setAttribute('width', String(fullWidth * percentage));
  }
}

/**
 * Update attendant craft status
 * @param {Object} craftStatus - Status of small craft
 */
function updateCraftStatus(craftStatus) {
  const svg = shipStatusState.svgDoc;
  if (!svg || !craftStatus) return;

  // Update craft status indicators in the fleet row
  // Each craft card has a status dot
  const craftRow = svg.getElementById('craft-row');
  if (!craftRow) return;

  // Update each craft's status dot based on craftStatus
  for (const [craftName, status] of Object.entries(craftStatus)) {
    const craftElement = craftRow.querySelector(`[data-craft="${craftName}"]`);
    if (craftElement) {
      const dot = craftElement.querySelector('circle');
      if (dot) {
        dot.style.fill = getStatusColor(status);
      }
    }
  }
}

/**
 * Update location display
 * @param {string} location - Current location text
 */
function updateLocation(location) {
  const svg = shipStatusState.svgDoc;
  if (!svg) return;

  // Find location text in status bar
  const locText = Array.from(svg.querySelectorAll('#status-bar text'))
    .find(t => t.textContent.includes('Flammarion') || t.getAttribute('x') === '535');
  if (locText) {
    locText.textContent = location;
  }
}

/**
 * Update alert status
 * @param {string} alertLevel - NORMAL, YELLOW, RED, etc.
 */
function updateAlertStatus(alertLevel) {
  const svg = shipStatusState.svgDoc;
  if (!svg) return;

  const alertRect = svg.querySelector('#status-bar rect[fill="#276749"]');
  const alertText = Array.from(svg.querySelectorAll('#status-bar text'))
    .find(t => ['NORMAL', 'YELLOW', 'RED'].includes(t.textContent));

  if (alertRect && alertText) {
    alertText.textContent = alertLevel;

    const alertColors = {
      NORMAL: { bg: '#276749', text: '#48bb78' },
      YELLOW: { bg: '#744210', text: '#ecc94b' },
      RED: { bg: '#742a2a', text: '#fc8181' }
    };

    const colors = alertColors[alertLevel] || alertColors.NORMAL;
    alertRect.setAttribute('fill', colors.bg);
    alertText.setAttribute('fill', colors.text);
  }
}

/**
 * Show/hide the panel
 * @param {boolean} visible - Visibility state
 */
function setVisible(visible) {
  shipStatusState.visible = visible;
  if (shipStatusState.container) {
    shipStatusState.container.style.display = visible ? 'block' : 'none';
  }
}

/**
 * Refresh panel with full ship state
 * @param {Object} ship - Full ship object with ship_data and current_state
 */
function refreshShipStatus(ship) {
  if (!ship) return;

  shipStatusState.shipData = ship.ship_data;
  shipStatusState.currentState = ship.current_state;

  const state = ship.current_state || {};

  // Update hull
  if (state.hull) {
    updateHullStatus(state.hull.current, state.hull.max);
  }

  // Update fuel
  if (state.fuel) {
    updateFuelStatus(state.fuel.current, state.fuel.max);
  }

  // Update alert status
  if (state.alertStatus) {
    updateAlertStatus(state.alertStatus.toUpperCase());
  }

  // Update system status if damage tracking exists
  if (state.systemStatus) {
    updateSystemStatus(state.systemStatus);
  }
}

/**
 * Destroy the panel
 */
function destroyShipStatusPanel() {
  if (shipStatusState.container) {
    shipStatusState.container.innerHTML = '';
  }
  shipStatusState.container = null;
  shipStatusState.svgDoc = null;
  console.log('[ShipStatusPanel] Destroyed');
}

// Exports
export {
  initShipStatusPanel,
  updateSystemStatus,
  updateHullStatus,
  updateFuelStatus,
  updateCraftStatus,
  updateLocation,
  updateAlertStatus,
  refreshShipStatus,
  setVisible,
  destroyShipStatusPanel,
  shipStatusState
};
