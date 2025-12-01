/**
 * Role Panels Module
 * Generates role-specific detail panel HTML for Operations VTT
 *
 * Extracted from app.js for modularization (Autorun 3, Stage 1)
 */

import { escapeHtml, formatRoleName, formatSystemName } from './utils.js';

/**
 * Action log messages for each role action
 */
export const ROLE_ACTION_MESSAGES = {
  // Pilot
  setCourse: (name) => `${name} plotting new course`,
  evasiveAction: (name) => `${name} initiating evasive maneuvers`,
  dock: (name) => `${name} beginning docking sequence`,
  undock: (name) => `${name} releasing docking clamps`,
  // Captain
  setAlertStatus: (name) => `${name} adjusting alert status`,
  issueOrders: (name) => `Captain ${name} issuing bridge orders`,
  authorizeWeapons: (name) => `${name} authorizing weapons release`,
  hail: (name) => `${name} opening communications channel`,
  // Astrogator
  plotJump: (name) => `${name} calculating jump coordinates`,
  calculateIntercept: (name) => `${name} plotting intercept course`,
  verifyPosition: (name) => `${name} confirming current position`,
  // Engineer
  allocatePower: (name) => `${name} reallocating power grid`,
  fieldRepair: (name) => `${name} performing field repairs`,
  overloadSystem: (name) => `${name} overloading system capacitors`,
  // Sensors
  activeScan: (name) => `${name} initiating active sensor sweep`,
  deepScan: (name) => `${name} performing deep scan analysis`,
  jam: (name) => `${name} activating electronic countermeasures`,
  // Gunner
  fireWeapon: (name) => `${name} firing weapons`,
  pointDefense: (name) => `${name} activating point defense`,
  sandcaster: (name) => `${name} deploying sandcaster screen`,
  // Damage Control
  directRepair: (name) => `${name} directing repair teams`,
  prioritizeSystem: (name) => `${name} prioritizing system repairs`,
  emergencyProcedure: (name) => `${name} executing emergency procedure`,
  // Marines
  securityPatrol: (name) => `${name} initiating security patrol`,
  prepareBoarding: (name) => `${name} preparing boarding party`,
  repelBoarders: (name) => `${name} coordinating defense against boarders`,
  // Medic
  treatInjury: (name) => `${name} treating injured crew member`,
  triage: (name) => `${name} performing triage assessment`,
  checkSupplies: (name) => `${name} checking medical supplies`,
  // Steward
  attendPassenger: (name) => `${name} attending to passengers`,
  boostMorale: (name) => `${name} boosting crew morale`,
  // Cargo
  checkManifest: (name) => `${name} reviewing cargo manifest`,
  loadCargo: (name) => `${name} supervising cargo loading`,
  unloadCargo: (name) => `${name} coordinating cargo unloading`
};

/**
 * Get action log message for a role action
 * @param {string} action - Action identifier
 * @param {string} playerName - Player name
 * @param {string} roleName - Role name for fallback
 * @returns {string} Log message
 */
export function getActionMessage(action, playerName, roleName) {
  const messageFn = ROLE_ACTION_MESSAGES[action];
  if (messageFn) {
    return messageFn(playerName);
  }
  return `${playerName} (${roleName}): ${action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`;
}

/**
 * Render system status item HTML
 * @param {string} name - System name
 * @param {object} status - System status object
 * @returns {string} HTML string
 */
export function renderSystemStatusItem(name, status) {
  if (!status) {
    return `
      <div class="system-status-item operational">
        <span class="system-name">${name}</span>
        <span class="system-state">Operational</span>
      </div>
    `;
  }

  const severity = status.totalSeverity || 0;
  const statusClass = severity === 0 ? 'operational' : severity <= 2 ? 'damaged' : 'critical';
  const statusText = severity === 0 ? 'Operational' :
                     status.disabled ? 'DISABLED' :
                     status.message || `Damaged (Sev ${severity})`;

  return `
    <div class="system-status-item ${statusClass}">
      <span class="system-name">${name}</span>
      <span class="system-state">${statusText}</span>
      ${severity > 0 ? `<span class="system-severity">Sev ${severity}</span>` : ''}
    </div>
  `;
}

/**
 * Get role detail panel HTML content
 * @param {string} role - Role identifier
 * @param {object} context - Context object with state
 * @param {object} context.shipState - Ship current state
 * @param {object} context.template - Ship template data
 * @param {object} context.systemStatus - System damage status
 * @param {array} context.damagedSystems - List of damaged system names
 * @param {object} context.fuelStatus - Fuel status object
 * @param {object} context.jumpStatus - Jump status object
 * @param {object} context.campaign - Campaign data
 * @param {array} context.contacts - Sensor contacts
 * @param {array} context.crewOnline - Online crew list
 * @param {object} context.ship - Full ship object
 * @returns {string} HTML string
 */
export function getRoleDetailContent(role, context) {
  const { shipState = {}, template = {}, systemStatus = {}, damagedSystems = [],
          fuelStatus, jumpStatus = {}, campaign, contacts = [], crewOnline = [], ship } = context;

  switch (role) {
    case 'pilot':
      return getPilotPanel(shipState, template);

    case 'engineer':
      return getEngineerPanel(shipState, template, systemStatus, damagedSystems, fuelStatus);

    case 'gunner':
      return getGunnerPanel(shipState, template);

    case 'captain':
      return getCaptainPanel(shipState, template, ship, crewOnline);

    case 'sensor_operator':
      return getSensorOperatorPanel(shipState, contacts);

    case 'astrogator':
      return getAstrogatorPanel(shipState, template, jumpStatus, campaign, systemStatus);

    case 'damage_control':
      return getDamageControlPanel(shipState, template);

    default:
      return `
        <div class="detail-section">
          <h4>${formatRoleName(role)} Station</h4>
          <div class="placeholder">Station details available during operations.</div>
        </div>
      `;
  }
}

// ==================== Individual Role Panel Functions ====================

function getPilotPanel(shipState, template) {
  return `
    <div class="detail-section">
      <h4>Thrust Status</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Thrust Rating:</span>
          <span class="stat-value">${template.thrust || 2}G</span>
        </div>
        <div class="stat-row">
          <span>Current Vector:</span>
          <span class="stat-value">${shipState.vector || 'Stationary'}</span>
        </div>
        <div class="stat-row">
          <span>Maneuver Drive:</span>
          <span class="stat-value ${shipState.mDriveStatus === 'damaged' ? 'text-warning' : ''}">${shipState.mDriveStatus || 'Operational'}</span>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h4>Docking Status</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Status:</span>
          <span class="stat-value">${shipState.docked ? 'Docked' : 'Free Flight'}</span>
        </div>
      </div>
    </div>
  `;
}

function getEngineerPanel(shipState, template, systemStatus, damagedSystems, fuelStatus) {
  const maxPower = template.powerPlant || 100;
  const currentPower = shipState.power ?? maxPower;
  const powerPercent = Math.round((currentPower / maxPower) * 100);

  const fs = fuelStatus || {
    total: shipState.fuel ?? template.fuel ?? 40,
    max: template.fuel || 40,
    breakdown: { refined: shipState.fuel ?? template.fuel ?? 40, unrefined: 0, processed: 0 },
    percentFull: 100,
    processing: null,
    fuelProcessor: template.fuelProcessor || false
  };
  const fuelBreakdown = fs.breakdown || { refined: fs.total, unrefined: 0, processed: 0 };

  return `
    <div class="detail-section">
      <h4>System Status</h4>
      <div class="system-status-grid">
        ${renderSystemStatusItem('M-Drive', systemStatus.mDrive)}
        ${renderSystemStatusItem('Power Plant', systemStatus.powerPlant)}
        ${renderSystemStatusItem('J-Drive', systemStatus.jDrive)}
        ${renderSystemStatusItem('Sensors', systemStatus.sensors)}
        ${renderSystemStatusItem('Computer', systemStatus.computer)}
        ${renderSystemStatusItem('Armour', systemStatus.armour)}
      </div>
    </div>
    ${damagedSystems.length > 0 ? `
    <div class="detail-section">
      <h4>Repair Actions</h4>
      <div class="repair-controls">
        <select id="repair-target" class="repair-select">
          ${damagedSystems.map(s => `<option value="${s}">${formatSystemName(s)}</option>`).join('')}
        </select>
        <button onclick="attemptRepair()" class="btn btn-small">Attempt Repair</button>
      </div>
      <div class="repair-info">
        <small>Engineer check (8+) with DM = -Severity</small>
      </div>
    </div>
    ` : ''}
    <div class="detail-section">
      <h4>Fuel Status</h4>
      <div class="fuel-display">
        <div class="fuel-total">
          <span class="fuel-amount">${fs.total}/${fs.max}</span>
          <span class="fuel-unit">tons</span>
          <span class="fuel-percent">(${fs.percentFull}%)</span>
        </div>
        <div class="fuel-bar-container">
          <div class="fuel-bar-segment refined" style="width: ${(fuelBreakdown.refined / fs.max) * 100}%" title="Refined: ${fuelBreakdown.refined}t"></div>
          <div class="fuel-bar-segment processed" style="width: ${(fuelBreakdown.processed / fs.max) * 100}%" title="Processed: ${fuelBreakdown.processed}t"></div>
          <div class="fuel-bar-segment unrefined" style="width: ${(fuelBreakdown.unrefined / fs.max) * 100}%" title="Unrefined: ${fuelBreakdown.unrefined}t"></div>
        </div>
        <div class="fuel-breakdown">
          <div class="fuel-type refined"><span class="fuel-dot"></span>Refined: ${fuelBreakdown.refined}t</div>
          <div class="fuel-type processed"><span class="fuel-dot"></span>Processed: ${fuelBreakdown.processed}t</div>
          <div class="fuel-type unrefined"><span class="fuel-dot"></span>Unrefined: ${fuelBreakdown.unrefined}t</div>
        </div>
      </div>
      ${fuelBreakdown.unrefined > 0 ? `
      <div class="fuel-warning">
        <span class="warning-icon">!</span>
        Unrefined fuel: -2 DM to jump checks, 5% misjump risk
      </div>
      ` : ''}
      <div class="fuel-actions">
        <button onclick="openRefuelModal()" class="btn btn-small">Refuel</button>
        ${fs.fuelProcessor && fuelBreakdown.unrefined > 0 ? `
        <button onclick="openProcessFuelModal()" class="btn btn-small">Process Fuel</button>
        ` : ''}
      </div>
      ${fs.processing ? `
      <div class="fuel-processing-status">
        <span class="processing-icon">*</span>
        Processing ${fs.processing.tons}t: ${fs.processing.hoursRemaining}h remaining
      </div>
      ` : ''}
    </div>
    <div class="detail-section">
      <h4>Jump Capability</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Jump Rating:</span>
          <span class="stat-value">J-${template.jumpRating || 2}</span>
        </div>
        <div class="stat-row">
          <span>Fuel per Jump:</span>
          <span class="stat-value">${Math.round((template.tonnage || 100) * 0.1)}t/parsec</span>
        </div>
      </div>
    </div>
  `;
}

function getGunnerPanel(shipState, template) {
  const weapons = template.weapons || [];
  const ammo = shipState.ammo || {};

  return `
    <div class="detail-section">
      <h4>Weapons Status</h4>
      <div class="weapons-list">
        ${weapons.length > 0 ? weapons.map((w, i) => `
          <div class="weapon-item">
            <span class="weapon-name">${w.name || w.id || 'Weapon ' + (i + 1)}</span>
            <span class="weapon-status">${shipState.weaponStatus?.[i] || 'Ready'}</span>
          </div>
        `).join('') : '<div class="placeholder">No weapons configured</div>'}
      </div>
    </div>
    <div class="detail-section">
      <h4>Ammunition</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Missiles:</span>
          <span class="stat-value">${ammo.missiles ?? 12}</span>
        </div>
        <div class="stat-row">
          <span>Sandcaster:</span>
          <span class="stat-value">${ammo.sandcaster ?? 20}</span>
        </div>
      </div>
    </div>
  `;
}

function getCaptainPanel(shipState, template, ship, crewOnline) {
  return `
    <div class="detail-section">
      <h4>Ship Overview</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Ship Class:</span>
          <span class="stat-value">${template.class || ship?.name || 'Unknown'}</span>
        </div>
        <div class="stat-row">
          <span>Tonnage:</span>
          <span class="stat-value">${template.tonnage || '?'} dT</span>
        </div>
        <div class="stat-row">
          <span>Alert Status:</span>
          <span class="stat-value">${shipState.alertStatus || 'NORMAL'}</span>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h4>Crew Status</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Online:</span>
          <span class="stat-value">${crewOnline?.length || 0}</span>
        </div>
        <div class="stat-row">
          <span>NPC Crew:</span>
          <span class="stat-value">${ship?.npcCrew?.length || 0}</span>
        </div>
      </div>
    </div>
  `;
}

function getSensorOperatorPanel(shipState, contacts) {
  return `
    <div class="detail-section">
      <h4>Sensor Status</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Mode:</span>
          <span class="stat-value">${shipState.sensorMode || 'Passive'}</span>
        </div>
        <div class="stat-row">
          <span>Range:</span>
          <span class="stat-value">${shipState.sensorRange || 'Standard'}</span>
        </div>
        <div class="stat-row">
          <span>Contacts:</span>
          <span class="stat-value">${contacts?.length || 0}</span>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h4>EW Status</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Jamming:</span>
          <span class="stat-value">${shipState.jamming ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
    </div>
  `;
}

function getAstrogatorPanel(shipState, template, jumpStatus, campaign, systemStatus) {
  const jumpRating = template.jumpRating || 2;
  const fuelAvailable = shipState.fuel ?? template.fuel ?? 40;

  if (jumpStatus.inJump) {
    return `
      <div class="detail-section jump-in-progress">
        <h4>IN JUMP SPACE</h4>
        <div class="jump-status-display">
          <div class="stat-row">
            <span>Destination:</span>
            <span class="stat-value">${jumpStatus.destination}</span>
          </div>
          <div class="stat-row">
            <span>Jump Distance:</span>
            <span class="stat-value">J-${jumpStatus.jumpDistance}</span>
          </div>
          <div class="stat-row">
            <span>ETA:</span>
            <span class="stat-value">${jumpStatus.jumpEndDate}</span>
          </div>
          <div class="stat-row">
            <span>Time Remaining:</span>
            <span class="stat-value">${jumpStatus.hoursRemaining} hours</span>
          </div>
        </div>
        ${jumpStatus.canExit ? `
          <button onclick="completeJump()" class="btn btn-primary">Exit Jump Space</button>
        ` : ''}
      </div>
    `;
  }

  const hasSectorData = campaign?.current_sector && campaign?.current_hex;

  return `
    <div class="detail-section">
      <h4>Navigation</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Current System:</span>
          <span class="stat-value">${campaign?.current_system || 'Unknown'}</span>
        </div>
        <div class="stat-row">
          <span>Jump Drive:</span>
          <span class="stat-value">${systemStatus?.jDrive?.disabled ? 'DAMAGED' : 'Operational'}</span>
        </div>
        <div class="stat-row">
          <span>Jump Rating:</span>
          <span class="stat-value">J-${jumpRating}</span>
        </div>
        <div class="stat-row">
          <span>Fuel Available:</span>
          <span class="stat-value">${fuelAvailable} tons</span>
        </div>
      </div>
    </div>
    ${hasSectorData ? `
    <div class="detail-section jump-map-section">
      <h4>Jump Map</h4>
      <div class="jump-map-controls">
        <select id="jump-map-range" class="jump-select" onchange="updateJumpMap()">
          ${[...Array(jumpRating)].map((_, i) => `
            <option value="${i+1}">J-${i+1} Range</option>
          `).join('')}
        </select>
        <select id="jump-map-style" class="jump-select" onchange="updateJumpMap()">
          <option value="terminal">Terminal</option>
          <option value="poster">Poster</option>
          <option value="candy">Candy</option>
          <option value="atlas">Atlas</option>
        </select>
      </div>
      <div id="jump-map-container" class="jump-map-container">
        <img id="jump-map-image" src="" alt="Jump Map" style="display: none;">
        <div class="jump-map-loading">Loading jump map...</div>
      </div>
      <div id="jump-destinations" class="jump-destinations">
        <div class="jump-destinations-loading">Fetching nearby systems...</div>
      </div>
    </div>
    ` : `
    <div class="detail-section">
      <p class="placeholder">Use system lookup to set location for jump map</p>
    </div>
    `}
    <div class="detail-section">
      <h4>Plot Jump</h4>
      <div class="jump-controls">
        <div class="form-group">
          <label for="jump-destination">Destination:</label>
          <input type="text" id="jump-destination" placeholder="System name" class="jump-input">
        </div>
        <div class="form-group">
          <label for="jump-distance">Distance:</label>
          <select id="jump-distance" class="jump-select" onchange="updateFuelEstimate()">
            ${[...Array(jumpRating)].map((_, i) => `
              <option value="${i+1}">Jump-${i+1} (${i+1} parsec${i > 0 ? 's' : ''})</option>
            `).join('')}
          </select>
        </div>
        <div class="fuel-estimate">
          Fuel required: <span id="fuel-estimate">--</span> tons
        </div>
        <button onclick="initiateJump()" class="btn btn-primary">Initiate Jump</button>
      </div>
    </div>
  `;
}

function getDamageControlPanel(shipState, template) {
  return `
    <div class="detail-section">
      <h4>Hull Integrity</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Hull:</span>
          <span class="stat-value">${shipState.hull ?? template.hull ?? 100}/${template.hull || 100}</span>
        </div>
        <div class="stat-row">
          <span>Armor:</span>
          <span class="stat-value">${template.armor || 0}</span>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h4>Damage Report</h4>
      <div class="damage-list">
        ${(shipState.criticals || []).length > 0 ?
          shipState.criticals.map(c => `<div class="damage-item text-warning">${c}</div>`).join('') :
          '<div class="placeholder">No damage reported</div>'
        }
      </div>
    </div>
  `;
}
