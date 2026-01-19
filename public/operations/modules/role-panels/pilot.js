/**
 * AR-204: Pilot Role Panel
 * Extracted from role-panels.js for maintainability.
 */

import { escapeHtml } from '../utils.js';

/**
 * Generate Pilot role panel HTML
 * @param {object} shipState - Current ship state
 * @param {object} template - Ship template data
 * @param {object} campaign - Campaign data
 * @param {object} jumpStatus - Jump status
 * @param {object} flightConditions - Flight conditions data
 * @returns {string} HTML string
 */
export function getPilotPanel(shipState, template, campaign, jumpStatus = {}, flightConditions = null) {
  const hasDestination = shipState.destination || campaign?.destination;
  const destination = shipState.destination || campaign?.destination || 'None set';
  const eta = shipState.eta || campaign?.eta || null;
  const evasive = shipState.evasive || false;
  const contacts = campaign?.sensorContacts || [];
  const inJump = jumpStatus?.inJump || false;

  // AR-124: Block navigation until position verified after jump
  if (shipState.positionVerified === false) {
    return `
      <div class="detail-section position-blocked">
        <h4>⏳ Navigation Blocked</h4>
        <div class="blocked-notice" style="padding: 16px; background: rgba(255,193,7,0.15); border-radius: 8px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px 0; font-weight: bold;">Ship has exited jump space</p>
          <p style="margin: 0; color: #aaa;">Astrogator must verify position before navigation systems can be used.</p>
        </div>
        <div class="waiting-indicator" style="text-align: center; padding: 20px; font-size: 1.2em; color: #ffc107;">
          Waiting for Astrogator...
        </div>
      </div>
    `;
  }

  // Flight conditions section HTML
  const flightConditionsHtml = flightConditions ? `
    <div class="detail-section flight-conditions">
      <h4>Flight Conditions</h4>
      <div class="detail-stats">
        ${flightConditions.visibility ? `
        <div class="stat-row">
          <span>Visibility:</span>
          <span class="stat-value ${flightConditions.visibility === 'Zero' ? 'text-danger' : flightConditions.visibility === 'Poor' ? 'text-warning' : ''}">${flightConditions.visibility}</span>
        </div>
        ` : ''}
        ${flightConditions.turbulence ? `
        <div class="stat-row">
          <span>Turbulence:</span>
          <span class="stat-value ${flightConditions.turbulence === 'Severe' ? 'text-danger' : flightConditions.turbulence === 'Moderate' ? 'text-warning' : ''}">${flightConditions.turbulence}</span>
        </div>
        ` : ''}
        ${flightConditions.difficultyMod !== undefined ? `
        <div class="stat-row">
          <span>Difficulty Mod:</span>
          <span class="stat-value ${flightConditions.difficultyMod < 0 ? 'text-danger' : ''}">${flightConditions.difficultyMod >= 0 ? '+' : ''}${flightConditions.difficultyMod}</span>
        </div>
        ` : ''}
        ${flightConditions.sensorAssist ? `
        <div class="stat-row">
          <span>Sensor Assist:</span>
          <span class="stat-value text-success">Active</span>
        </div>
        ` : ''}
      </div>
      ${flightConditions.hazard ? `
      <div class="flight-hazard" style="margin-top: 8px; padding: 8px; background: rgba(220,53,69,0.15); border-radius: 4px;">
        <strong class="text-danger">⚠ ${escapeHtml(flightConditions.hazard)}</strong>
      </div>
      ` : ''}
    </div>
  ` : '';

  // AR-64: Ship location from current_state
  const shipLocation = shipState.locationName || shipState.location || 'Unknown';
  const pendingTravel = typeof window.getPendingTravel === 'function' ? window.getPendingTravel() : null;
  const isDocked = (shipState.locationId || '').includes('dock');

  // AR-298: Format location with star system
  const currentSystem = campaign?.current_system || 'Unknown System';
  const fullLocation = `${currentSystem} System, ${shipLocation}`;
  const maxThrust = shipState.currentThrust || template.thrust || 2;
  const courseStatus = shipState.heading || shipState.vector || 'Holding';

  return `
    <div class="detail-section">
      <h4 style="display: flex; justify-content: space-between; align-items: center;">
        Helm Control
        <a href="#" onclick="event.preventDefault(); window.openSystemMapMaximized && window.openSystemMapMaximized()"
           class="helm-nav-link" style="font-size: 12px; font-weight: normal; color: var(--accent-blue);"
           title="Open maximized System Map for navigation">NAVIGATE FROM SYSTEM MAP</a>
      </h4>
      <div class="detail-stats helm-stats">
        <div class="helm-stat-row">
          <span class="helm-label">Location:</span>
          <span class="helm-value">${escapeHtml(fullLocation)}</span>
          ${isDocked ? '<button class="btn btn-small btn-warning" onclick="undock()" style="margin-left: 10px;">UNDOCK</button>' : ''}
        </div>
        <div class="helm-stat-row">
          <span class="helm-label">Speed:</span>
          <span class="helm-value">Max acceleration ${maxThrust}G</span>
        </div>
        <div class="helm-stat-row">
          <span class="helm-label">Course:</span>
          <span class="helm-value">${courseStatus}</span>
        </div>
        <div class="helm-stat-row">
          <span class="helm-label">Destination:</span>
          <span class="helm-value">${destination}</span>
        </div>
        ${eta ? `
        <div class="helm-stat-row">
          <span class="helm-label">ETA:</span>
          <span class="helm-value eta-display">${eta}</span>
        </div>
        ` : ''}
      </div>
      <div class="pilot-nav-controls" style="margin-top: 10px;">
        <button id="btn-set-course" class="btn btn-secondary" onclick="showPlacesOverlay()" title="Open Places panel to select destination [C]">
          <span class="hotkey-hint">[C]</span> Set Course
        </button>
        ${hasDestination && pendingTravel ? `
        <button id="btn-travel" class="btn btn-primary btn-travel" onclick="travel()" title="Execute transit to destination [T]">
          <span class="hotkey-hint">[T]</span> Travel (${pendingTravel.travelHours || '?'}h)
        </button>
        <button class="btn btn-small btn-secondary" onclick="clearCourse()" title="Cancel course">Clear</button>
        ` : ''}
      </div>
    </div>
    <div class="detail-section transit-calculator">
      <h4>Transit Calculator
        <span class="physics-badge" title="Brachistochrone: constant thrust to midpoint, flip, decelerate to stop">⚛</span>
      </h4>
      <div class="transit-form">
        <div class="stat-row">
          <label for="transit-distance">Distance:</label>
          <input type="number" id="transit-distance" class="transit-input" value="100000" min="1" step="1000"> <span class="unit">km</span>
        </div>
        <div class="stat-row">
          <label for="transit-accel">Thrust:</label>
          <select id="transit-accel" class="transit-select">
            <option value="0.5">0.5G (Gentle)</option>
            <option value="1">1G (Merchant)</option>
            <option value="2" selected>2G (Free Trader)</option>
            <option value="3">3G (Fast)</option>
            <option value="4">4G (Naval)</option>
            <option value="6">6G (Military)</option>
          </select>
        </div>
      </div>
      <div class="transit-results">
        <div class="stat-row">
          <span>Transit Time:</span>
          <span class="stat-value" id="transit-time">--</span>
        </div>
        <div class="stat-row">
          <span>Turnover at:</span>
          <span class="stat-value" id="transit-turnover">--</span>
        </div>
        <div class="stat-row">
          <span>Max Velocity:</span>
          <span class="stat-value" id="transit-velocity">--</span>
        </div>
      </div>
      <div class="transit-formula" id="transit-formula-display">
        <code>t = 2 × √(d ÷ a)</code>
        <span class="formula-help" title="Click for physics explanation">?</span>
      </div>
    </div>
    ${inJump ? `
    <div class="detail-section jump-status-section">
      <h4>IN JUMP SPACE</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Destination:</span>
          <span class="stat-value">${jumpStatus.destination || 'Unknown'}</span>
        </div>
        <div class="stat-row">
          <span>Exit Date:</span>
          <span class="stat-value">${jumpStatus.jumpEndDate || 'Calculating...'}</span>
        </div>
        ${jumpStatus.hoursRemaining !== undefined ? `
        <div class="stat-row">
          <span>Time Remaining:</span>
          <span class="stat-value">${jumpStatus.hoursRemaining}h</span>
        </div>
        ` : ''}
      </div>
      ${jumpStatus.canExit ? `
      <button onclick="completeJump()" class="btn btn-primary btn-exit-jump" title="Exit jump space at destination">Exit Jump Space</button>
      ` : ''}
    </div>
    ` : ''}
    <div class="detail-section">
      <h4>Maneuvers</h4>
      <div class="pilot-controls">
        <button id="evasive-toggle" class="btn btn-small ${evasive ? 'btn-active' : ''}"
                onclick="toggleEvasive()" title="Toggle evasive maneuvers (-2 DM to incoming attacks)"
                ${inJump ? 'disabled' : ''}>
          ${evasive ? '⚡ Evasive ON' : 'Evasive'}
        </button>
        ${contacts.length > 0 && !inJump ? `
        <div class="range-control">
          <select id="range-contact-select" class="pilot-select">
            ${contacts.map(c => `<option value="${c.id}">${c.designation || c.name} (${c.range || 'medium'})</option>`).join('')}
          </select>
          <div class="range-buttons">
            <button class="btn btn-small" onclick="changeRange('approach')" title="Close range">◀ Close</button>
            <button class="btn btn-small" onclick="changeRange('withdraw')" title="Increase range">Open ▶</button>
          </div>
        </div>
        ` : inJump ? '<div class="no-contacts">No maneuvers in jump space</div>' : '<div class="no-contacts">No contacts to maneuver against</div>'}
      </div>
    </div>
    <div class="detail-section">
      <h4>Drive Status</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Thrust Rating:</span>
          <span class="stat-value">${template.thrust || 2}G max</span>
        </div>
        <div class="stat-row">
          <span>M-Drive:</span>
          <span class="stat-value ${shipState.mDriveStatus === 'damaged' ? 'text-warning' : ''}">${shipState.mDriveStatus || 'Operational'}</span>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h4>Docking Status</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Status:</span>
          <span class="stat-value">${shipState.docked ? 'Docked' : inJump ? 'In Jump' : 'Free Flight'}</span>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h4>Time Controls</h4>
      <div class="time-controls">
        <div class="time-row">
          <button class="btn btn-small" onclick="advanceTime(0, 1)" title="Advance 1 hour">+1h</button>
          <button class="btn btn-small" onclick="advanceTime(0, 4)" title="Advance 4 hours">+4h</button>
          <button class="btn btn-small" onclick="advanceTime(0, 8)" title="Advance 8 hours">+8h</button>
        </div>
        <div class="time-row">
          <button class="btn btn-small" onclick="advanceTime(1, 0)" title="Advance 1 day">+1d</button>
          <button class="btn btn-small" onclick="advanceTime(3, 0)" title="Advance 3 days">+3d</button>
          <button class="btn btn-small btn-jump-time" onclick="advanceTime(7, 0)" title="Standard jump duration (7 days)">+7d (Jump)</button>
        </div>
        <div class="time-row">
          <button class="btn btn-small" onclick="advanceTime(10, 0)" title="Advance 10 days">+10d</button>
          <button class="btn btn-small" onclick="advanceTime(14, 0)" title="Advance 2 weeks">+14d</button>
        </div>
        <div class="time-row time-custom">
          <input type="text" id="custom-time-input" placeholder="e.g. 5h, 2d, 1w" title="Enter time: h=hours, d=days, w=weeks" style="width: 100px;">
          <button class="btn btn-small" onclick="advanceCustomTime()" title="Advance by custom amount">Go</button>
        </div>
      </div>
      ${inJump && jumpStatus.canExit ? `
      <button onclick="completeJump()" class="btn btn-primary btn-exit-jump" title="Exit jump space at destination">Exit Jump</button>
      ` : ''}
    </div>
    ${flightConditionsHtml}
  `;
}
