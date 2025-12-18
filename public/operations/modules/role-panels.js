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
/**
 * AR-187: Generate tooltip text for ship system
 * @param {string} system - System key (mDrive, jDrive, etc.)
 * @param {object} template - Ship template data
 * @returns {string} Tooltip text
 */
function getSystemTooltip(system, template) {
  if (!template) return '';
  switch (system) {
    case 'mDrive':
      return `Thrust ${template.thrust || '?'} | ${template.tonnage || '?'}t ship`;
    case 'jDrive':
      return template.jump ? `Jump-${template.jump} | Fuel: ${template.fuel || '?'}t` : 'No Jump Drive';
    case 'powerPlant':
      return `Powers ${template.tonnage || '?'}t ship | TL${template.techLevel || '?'}`;
    case 'sensors':
      return template.sensors || 'Standard sensors';
    case 'computer':
      return template.computer || 'Ship computer';
    case 'armour':
      return `Armour ${template.armour || 0} | Hull ${template.hull || '?'}`;
    case 'hull':
      return `${template.hull || '?'} HP | ${template.tonnage || '?'} tons`;
    case 'weapon':
      const turretCount = template.turrets?.length || 0;
      return turretCount ? `${turretCount} turret${turretCount > 1 ? 's' : ''}` : 'No weapons';
    default:
      return '';
  }
}

export function renderSystemStatusItem(name, status, tooltip = '') {
  if (!status) {
    const tooltipAttr = tooltip ? ` title="${tooltip}"` : '';
    return `
      <div class="system-status-item operational"${tooltipAttr}>
        <span class="system-name">${name}</span>
        <span class="system-state">Operational</span>
      </div>
    `;
  }

  const severity = status.totalSeverity || 0;
  const statusClass = severity === 0 ? 'operational' : severity <= 2 ? 'damaged' : 'critical';

  // AR-194: Get failure reason from latest unrepaired crit
  const unrepairedCrits = (status.crits || []).filter(c => !c.repaired);
  const latestCrit = unrepairedCrits[unrepairedCrits.length - 1];
  const failureReason = latestCrit?.failureReason;

  // Build status text with failure reason if available
  let statusText;
  if (severity === 0) {
    statusText = 'Operational';
  } else if (status.disabled) {
    statusText = 'DISABLED';
  } else if (failureReason?.name) {
    statusText = failureReason.name;
  } else {
    statusText = status.message || `Damaged (Sev ${severity})`;
  }

  // Build tooltip with failure description
  let fullTooltip = tooltip || '';
  if (failureReason) {
    const reasonTooltip = [
      failureReason.name,
      failureReason.description,
      failureReason.flavorText ? `"${failureReason.flavorText}"` : ''
    ].filter(Boolean).join(' - ');
    fullTooltip = fullTooltip ? `${fullTooltip}\n\n${reasonTooltip}` : reasonTooltip;
  }
  const tooltipAttr = fullTooltip ? ` title="${fullTooltip}"` : '';

  return `
    <div class="system-status-item ${statusClass}"${tooltipAttr}>
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
          fuelStatus, jumpStatus = {}, campaign, contacts = [], crewOnline = [], ship,
          roleInstance = 1, shipWeapons = [], combatLog = [], environmentalData = null,
          repairQueue = [], rescueTargets = [], flightConditions = null,
          medicalConditions = null, targetConditions = null, boardingConditions = null } = context;

  switch (role) {
    case 'pilot':
      return getPilotPanel(shipState, template, campaign, jumpStatus, flightConditions);

    case 'engineer':
      return getEngineerPanel(shipState, template, systemStatus, damagedSystems, fuelStatus, repairQueue);

    case 'gunner':
      return getGunnerPanel(shipState, template, contacts, roleInstance, shipWeapons, combatLog, targetConditions);

    case 'captain':
      return getCaptainPanel(shipState, template, ship, crewOnline, contacts, rescueTargets);

    case 'sensor_operator':
      return getSensorOperatorPanel(shipState, contacts, environmentalData);

    case 'astrogator':
      return getAstrogatorPanel(shipState, template, jumpStatus, campaign, systemStatus);

    case 'damage_control':
      return getDamageControlPanel(shipState, template, systemStatus, damagedSystems);

    case 'medic':
      return getMedicPanel(shipState, template, crewOnline, medicalConditions);

    case 'marines':
      return getMarinesPanel(shipState, template, boardingConditions);

    case 'comms':
      return getCommsPanel(shipState, contacts, crewOnline);

    case 'steward':
      return getStewardPanel(shipState, template, crewOnline);

    case 'observer':
      // AR-128: Pass full context so observer can watch other roles
      return getObserverPanel(shipState, template, campaign, jumpStatus, contacts, context);

    default:
      // AR-69: Fall back to Observer panel for unknown roles
      return getObserverPanel(shipState, template, campaign, jumpStatus, contacts, context);
  }
}

// ==================== Individual Role Panel Functions ====================

function getPilotPanel(shipState, template, campaign, jumpStatus = {}, flightConditions = null) {
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

  return `
    <div class="detail-section">
      <h4>Helm Control</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Location:</span>
          <span class="stat-value">${escapeHtml(shipLocation)}</span>
          ${isDocked ? '<button class="btn btn-small btn-warning" onclick="undock()" style="margin-left: 10px;">UNDOCK</button>' : ''}
        </div>
        <div class="stat-row">
          <span>Speed:</span>
          <span class="stat-value">${shipState.currentThrust || template.thrust || 2}G</span>
        </div>
        <div class="stat-row">
          <span>Course:</span>
          <span class="stat-value">${shipState.heading || shipState.vector || 'Holding'}</span>
        </div>
        <div class="stat-row">
          <span>Destination:</span>
          <span class="stat-value">${destination}</span>
        </div>
        ${eta ? `
        <div class="stat-row">
          <span>ETA:</span>
          <span class="stat-value eta-display">${eta}</span>
        </div>
        ` : ''}
      </div>
      <div class="pilot-nav-controls" style="margin-top: 10px;">
        <button id="btn-set-course" class="btn btn-secondary" onclick="showPlacesOverlay()" title="Open Places panel to select destination">
          Set Course
        </button>
        ${hasDestination && pendingTravel ? `
        <button id="btn-travel" class="btn btn-primary btn-travel" onclick="travel()" title="Execute transit to destination">
          Travel (${pendingTravel.travelHours || '?'}h)
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

function getEngineerPanel(shipState, template, systemStatus, damagedSystems, fuelStatus, repairQueue = []) {
  // Power allocation state - AR-54: added power budget tracking
  const defaultPower = { mDrive: 75, weapons: 75, sensors: 75, lifeSupport: 75, computer: 75 };
  const power = { ...defaultPower, ...(shipState.power || {}) };
  const powerEffects = shipState.powerEffects || { weaponsDM: 0, sensorsDM: 0, thrustMultiplier: 1.0 };
  const totalPowerUsed = Object.values(power).reduce((a, b) => a + b, 0);
  const maxPower = Object.keys(power).length * 100; // 500 for 5 systems
  const powerPercent = Math.round((totalPowerUsed / maxPower) * 100);

  const rawFs = fuelStatus || {};
  const fs = {
    total: rawFs.total ?? shipState.fuel ?? template.fuel ?? 40,
    max: rawFs.max ?? template.fuel ?? 40,
    breakdown: rawFs.breakdown || { refined: shipState.fuel ?? template.fuel ?? 40, unrefined: 0, processed: 0 },
    percentFull: rawFs.percentFull ?? 100,
    processing: rawFs.processing ?? null,
    fuelProcessor: rawFs.fuelProcessor ?? template.fuelProcessor ?? false
  };
  const rawBreakdown = fs.breakdown || {};
  const fuelBreakdown = {
    refined: rawBreakdown.refined ?? fs.total ?? 0,
    unrefined: rawBreakdown.unrefined ?? 0,
    processed: rawBreakdown.processed ?? 0
  };

  // Power effect warnings
  const warnings = [];
  if (powerEffects.weaponsDM < 0) warnings.push(`Weapons: ${powerEffects.weaponsDM} DM`);
  if (powerEffects.sensorsDM < 0) warnings.push(`Sensors: ${powerEffects.sensorsDM} DM`);
  if (powerEffects.thrustMultiplier < 1) warnings.push(`Thrust: ${Math.round(powerEffects.thrustMultiplier * 100)}%`);

  // AR-191: Power breakdown tooltip
  const powerTooltip = `Power Usage: ${powerPercent}%\n` +
    `M-Drive: ${power.mDrive}%\n` +
    `Weapons: ${power.weapons}%\n` +
    `Sensors: ${power.sensors}%\n` +
    `Life Support: ${power.lifeSupport}%\n` +
    `Computer: ${power.computer}%`;

  return `
    <div class="detail-section power-section power-controls">
      <h4>Power Allocation</h4>
      <div class="power-budget" title="${powerTooltip}">
        <span class="power-budget-label">Power Budget:</span>
        <div class="power-budget-bar">
          <div class="power-budget-fill ${powerPercent > 100 ? 'overload' : powerPercent > 80 ? 'high' : ''}" style="width: ${Math.min(powerPercent, 100)}%"></div>
        </div>
        <span class="power-budget-value ${powerPercent > 100 ? 'text-danger' : ''}">${powerPercent}%</span>
      </div>
      <div class="power-presets">
        <button onclick="window.setPowerPreset('combat')" class="btn btn-small ${shipState.powerPreset === 'combat' ? 'btn-active' : ''}" title="Max weapons and sensors">Combat</button>
        <button onclick="window.setPowerPreset('silent')" class="btn btn-small ${shipState.powerPreset === 'silent' ? 'btn-active' : ''}" title="Minimal power signature">Silent</button>
        <button onclick="window.setPowerPreset('jump')" class="btn btn-small ${shipState.powerPreset === 'jump' ? 'btn-active' : ''}" title="Prep for jump">Jump</button>
        <button onclick="window.setPowerPreset('standard')" class="btn btn-small ${shipState.powerPreset === 'standard' ? 'btn-active' : ''}" title="Balanced allocation">Standard</button>
      </div>
      <div class="power-sliders">
        <div class="power-slider-row">
          <label>M-Drive</label>
          <input type="range" min="0" max="100" value="${power.mDrive}" class="power-slider" data-system="mDrive" onchange="window.updatePower()" oninput="this.nextElementSibling.textContent=this.value+'%'">
          <span class="power-value">${power.mDrive}%</span>
        </div>
        <div class="power-slider-row">
          <label>Weapons</label>
          <input type="range" min="0" max="100" value="${power.weapons}" class="power-slider" data-system="weapons" onchange="window.updatePower()" oninput="this.nextElementSibling.textContent=this.value+'%'">
          <span class="power-value">${power.weapons}%</span>
        </div>
        <div class="power-slider-row">
          <label>Sensors</label>
          <input type="range" min="0" max="100" value="${power.sensors}" class="power-slider" data-system="sensors" onchange="window.updatePower()" oninput="this.nextElementSibling.textContent=this.value+'%'">
          <span class="power-value">${power.sensors}%</span>
        </div>
        <div class="power-slider-row">
          <label>Life Sup</label>
          <input type="range" min="0" max="100" value="${power.lifeSupport}" class="power-slider" data-system="lifeSupport" onchange="window.updatePower()" oninput="this.nextElementSibling.textContent=this.value+'%'">
          <span class="power-value">${power.lifeSupport}%</span>
        </div>
        <div class="power-slider-row">
          <label>Computer</label>
          <input type="range" min="0" max="100" value="${power.computer}" class="power-slider" data-system="computer" onchange="window.updatePower()" oninput="this.nextElementSibling.textContent=this.value+'%'">
          <span class="power-value">${power.computer}%</span>
        </div>
      </div>
      ${warnings.length > 0 ? `
      <div class="power-effects-warning">
        <small>Effects: ${warnings.join(' | ')}</small>
      </div>
      ` : ''}
    </div>
    <div class="detail-section system-status">
      <h4>System Status</h4>
      <div class="system-status-grid systems-grid">
        ${renderSystemStatusItem('M-Drive', systemStatus.mDrive, getSystemTooltip('mDrive', template))}
        ${renderSystemStatusItem('Power Plant', systemStatus.powerPlant, getSystemTooltip('powerPlant', template))}
        ${renderSystemStatusItem('J-Drive', systemStatus.jDrive, getSystemTooltip('jDrive', template))}
        ${renderSystemStatusItem('Sensors', systemStatus.sensors, getSystemTooltip('sensors', template))}
        ${renderSystemStatusItem('Computer', systemStatus.computer, getSystemTooltip('computer', template))}
        ${renderSystemStatusItem('Armour', systemStatus.armour, getSystemTooltip('armour', template))}
      </div>
    </div>
    ${damagedSystems.length > 0 ? `
    <div class="detail-section">
      <h4>Repair Actions</h4>
      <div class="repair-controls">
        <select id="repair-target" class="repair-select">
          ${damagedSystems.map(s => `<option value="${s}">${formatSystemName(s)}</option>`).join('')}
        </select>
        <button onclick="attemptRepair()" class="btn btn-small" title="Roll Engineer check (8+) to repair selected system. DM penalty equals damage severity.">Attempt Repair</button>
      </div>
      <div class="repair-info">
        <small>Engineer check (8+) with DM = -Severity</small>
      </div>
    </div>
    ` : ''}
    ${repairQueue.length > 0 ? `
    <div class="detail-section repair-queue-section">
      <h4>Active Repairs (${repairQueue.length})</h4>
      <div class="repair-queue-list">
        ${repairQueue.map(r => `
          <div class="repair-item ${r.status === 'in_progress' ? 'active' : ''}" data-repair-id="${r.id}">
            <div class="repair-header">
              <span class="repair-system">${escapeHtml(r.system || 'Unknown')}</span>
              <span class="repair-status ${r.status === 'in_progress' ? 'text-warning' : ''}">${r.status === 'in_progress' ? 'In Progress' : 'Queued'}</span>
            </div>
            <div class="repair-details" style="font-size: 0.85em; color: var(--text-muted);">
              <span class="repair-hours">${r.hoursRemaining || r.hoursRequired}h remaining</span>
              ${r.partsRequired ? `<span class="repair-parts"> | Parts: ${r.partsRequired}</span>` : ''}
            </div>
            <div class="repair-progress" style="background: var(--bg-secondary); border-radius: 3px; height: 4px; margin-top: 4px;">
              <div class="repair-progress-bar" style="width: ${r.hoursRequired ? ((r.hoursRequired - (r.hoursRemaining || r.hoursRequired)) / r.hoursRequired * 100) : 0}%; background: var(--primary); height: 100%; border-radius: 3px;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    <div class="detail-section">
      <h4 title="Fuel is consumed by maneuver drives and jump drives. Unrefined fuel risks misjump.">Fuel Status</h4>
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
      ${fs.percentFull < 25 ? `
      <div class="fuel-warning fuel-warning-low">
        <span class="warning-icon">⚠</span>
        LOW FUEL: ${fs.percentFull}% remaining - refuel soon!
      </div>
      ` : ''}
      ${fuelBreakdown.unrefined > 0 ? `
      <div class="fuel-warning">
        <span class="warning-icon">!</span>
        Unrefined fuel: -2 DM to jump checks, 5% misjump risk
      </div>
      ` : ''}
      <div class="fuel-actions">
        <button onclick="openRefuelModal()" class="btn btn-small" title="Refuel ship from starport, gas giant, or water source">Refuel</button>
        ${fs.fuelProcessor && fuelBreakdown.unrefined > 0 ? `
        <button onclick="processFuel()" class="btn btn-small" title="Process unrefined fuel to remove misjump risk (takes time)">Process Fuel</button>
        ` : ''}
      </div>
      ${fs.processing ? `
      <div class="fuel-processing-status">
        <span class="processing-icon">*</span>
        Processing ${fs.processing.tons}t: ${fs.processing.hoursRemaining}h remaining
      </div>
      ` : ''}
    </div>
    <div class="detail-section jump-capability-compact">
      <h4>Jump Capability</h4>
      ${(() => {
        const jumpRating = template.jumpRating || 2;
        const tonnage = template.tonnage || 100;
        const jumpNet = template.jumpNet || 0; // AR-54: Jump Net bonus tonnage
        const effectiveTonnage = tonnage + jumpNet;
        const fuelPerParsec = Math.ceil(effectiveTonnage * 0.1);
        const maxJumps = Math.floor(fs.total / fuelPerParsec);
        const jumpTooltip = `Ship: ${tonnage}t${jumpNet ? ` + ${jumpNet}t Jump Net` : ''}\\nFuel/parsec: ${fuelPerParsec}t\\nMax jumps with current fuel: ${maxJumps}`;
        return `
      <div class="jump-stats-row" title="${jumpTooltip}">
        <span class="jump-stat">J-${jumpRating}</span>
        <span class="jump-stat">${fuelPerParsec}t/pc</span>
        <span class="jump-stat ${maxJumps === 0 ? 'text-danger' : ''}">${maxJumps} jump${maxJumps !== 1 ? 's' : ''}</span>
      </div>`;
      })()}
    </div>
  `;
}

function getGunnerPanel(shipState, template, contacts, roleInstance = 1, shipWeapons = [], combatLog = [], targetConditions = null) {
  // Use ship_weapons from database if available, else fall back to template
  const weapons = shipWeapons.length > 0 ? shipWeapons : (template.weapons || []);
  const ammo = shipState.ammo || {};

  // Determine turret assignment based on roleInstance
  const turretCount = weapons.filter(w => w.mount === 'turret' || w.type === 'turret' || !w.mount).length;
  const assignedTurret = roleInstance <= turretCount ? roleInstance : null;
  const turretWeapons = assignedTurret ? weapons.filter((w, i) => i === assignedTurret - 1) : weapons;

  // Filter to targetable contacts - AR-53: default is_targetable to true (Gunner override per UQ)
  const hostileContacts = contacts?.filter(c =>
    c.is_targetable !== false
  ) || [];
  const hasTargets = hostileContacts.length > 0;
  const hasWeapons = weapons.length > 0;

  // Selected weapon (from state or first available)
  const selectedWeaponId = shipState.selectedWeapon || (weapons[0]?.id || 0);
  const selectedWeapon = weapons.find(w => (w.id || weapons.indexOf(w)) === selectedWeaponId) || weapons[0];

  // Selected target (from state or first available)
  const selectedTargetId = shipState.lockedTarget || (hostileContacts[0]?.id);
  const selectedTarget = hostileContacts.find(c => c.id === selectedTargetId);

  // Weapon status classes
  const getWeaponStatusClass = (status) => {
    switch (status) {
      case 'ready': return 'weapon-ready';
      case 'fired': return 'weapon-fired';
      case 'damaged': return 'weapon-damaged';
      case 'destroyed': return 'weapon-destroyed';
      default: return 'weapon-ready';
    }
  };

  // Range band DM calculation
  const getRangeDM = (band) => {
    const dms = { adjacent: 1, close: 0, short: 0, medium: -1, long: -2, extreme: -4, distant: -6 };
    return dms[band] ?? -4;
  };

  const formatRangeDM = (dm) => dm >= 0 ? `+${dm}` : `${dm}`;

  // AR-15.6: Calculate hit probability
  const calculateHitProbability = (weapon, target, gunnerySkill = 0) => {
    if (!weapon || !target) return null;
    const rangeDM = getRangeDM(target.range_band);
    const totalDM = gunnerySkill + rangeDM;
    // 2D6 >= 8 - DM to hit
    const targetNumber = 8 - totalDM;
    // Probability calculation for 2D6
    let successCount = 0;
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        if (d1 + d2 >= targetNumber) successCount++;
      }
    }
    return Math.round((successCount / 36) * 100);
  };

  // Calculate hit chance for selected weapon/target
  const gunnerySkill = shipState.gunnerySkill || 0;
  const hitChance = selectedWeapon && selectedTarget
    ? calculateHitProbability(selectedWeapon, selectedTarget, gunnerySkill)
    : null;

  // Group weapons by type for selector
  const weaponTypes = [...new Set(weapons.map(w => w.weapon_type || w.type || 'beam'))];
  const hasMissiles = weapons.some(w => (w.weapon_type || w.type || '').toLowerCase().includes('missile'));

  // Weapons authorization status
  const weaponsFree = shipState.weaponsAuth?.mode === 'free';

  return `
    <div class="detail-section gunner-header">
      <h4>GUNNER STATION ${assignedTurret ? `- TURRET ${assignedTurret}` : ''}</h4>
      <div class="gunner-status-badge ${weaponsFree ? 'weapons-free' : 'weapons-hold'}"
           title="${weaponsFree ? 'Weapons authorized - engage at will' : 'Weapons secured - await authorization'}">
        ${weaponsFree ? 'WEAPONS FREE' : 'WEAPONS HOLD'}
      </div>
    </div>

    <div class="detail-section gunner-auth-section">
      <h4>Rules of Engagement</h4>
      <div class="weapons-auth-controls" style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
        <button onclick="window.captainWeaponsAuth('hold')"
                class="btn btn-small ${shipState.roe === 'hold' ? 'btn-warning active' : 'btn-secondary'}"
                title="HOLD FIRE - No weapons discharge without direct order">
          HOLD
        </button>
        <button onclick="window.captainWeaponsAuth('defensive')"
                class="btn btn-small ${shipState.roe === 'defensive' ? 'btn-info active' : 'btn-secondary'}"
                title="DEFENSIVE - Return fire only when fired upon">
          DEFENSIVE
        </button>
        <button onclick="window.captainWeaponsAuth('free')"
                class="btn btn-small ${shipState.roe === 'free' || weaponsFree ? 'btn-danger active' : 'btn-secondary'}"
                title="WEAPONS FREE - Engage any hostile target at will">
          FREE
        </button>
      </div>
      <small class="auth-hint" style="color: var(--text-muted); margin-top: 4px; display: block;">
        ${shipState.roe === 'free' || weaponsFree ? 'Engage hostile targets at will' :
          shipState.roe === 'defensive' ? 'Return fire when fired upon' :
          'Weapons secured - await authorization'}
      </small>
      <small class="gunner-override-note" style="color: var(--text-muted); font-size: 10px; display: block;">
        Gunner: Override available via FIRE button (logs violation)
      </small>
    </div>

    <div class="detail-section target-section">
      <h4>TARGET PRIORITY QUEUE</h4>
      ${!hasTargets ? `
        <div class="no-target-locked">
          <div class="locked-icon">○</div>
          <div class="no-target-text">No Target Locked</div>
          <small>Awaiting hostile contacts or authorization</small>
        </div>
      ` : `
        <div class="target-list">
          ${hostileContacts
            .map(c => ({
              ...c,
              hitChance: selectedWeapon ? calculateHitProbability(selectedWeapon, c, gunnerySkill) : 0,
              threat: c.marking === 'hostile' ? 3 : c.marking === 'unknown' ? 2 : 1,
              priority: (c.marking === 'hostile' ? 100 : 50) + (selectedWeapon ? calculateHitProbability(selectedWeapon, c, gunnerySkill) : 0)
            }))
            .sort((a, b) => b.priority - a.priority)
            .map((c, idx) => {
            const targetHitChance = c.hitChance;
            const threatLevel = c.threat === 3 ? 'HIGH' : c.threat === 2 ? 'MED' : 'LOW';
            const threatClass = c.threat === 3 ? 'text-danger' : c.threat === 2 ? 'text-warning' : 'text-success';
            return `
            <div class="target-item ${c.id === selectedTargetId ? 'selected' : ''}"
                 onclick="lockTarget('${c.id}')" data-contact-id="${c.id}"
                 title="Priority #${idx + 1} - Click to lock${targetHitChance ? ` - ${targetHitChance}% hit chance` : ''}">
              <div class="target-header">
                <span class="target-indicator">${c.id === selectedTargetId ? '◉' : '○'}</span>
                <span class="target-priority" style="font-size: 10px; color: var(--text-muted);">#${idx + 1}</span>
                <span class="target-name">${escapeHtml(c.name || 'Unknown')}</span>
                <span class="target-threat ${threatClass}" title="Threat level">${threatLevel}</span>
              </div>
              <div class="target-details">
                <span class="target-range">${c.range_band || 'Unknown'} (${formatRangeDM(getRangeDM(c.range_band))} DM)</span>
                <span class="target-distance">${c.range_km || '?'}km</span>
                ${targetHitChance !== null ? `<span class="target-hit-chance">${targetHitChance}%</span>` : ''}
              </div>
              <div class="target-health-bar">
                <div class="health-fill" style="width: ${Math.max(0, (c.health / (c.max_health || 100)) * 100)}%"></div>
                <span class="health-text">${c.health || 0}/${c.max_health || 100}</span>
              </div>
            </div>
          `}).join('')}
        </div>
      `}
    </div>

    ${targetConditions ? `
    <div class="detail-section target-conditions">
      <h4>Targeting Conditions</h4>
      <div class="detail-stats">
        ${targetConditions.lockStatus ? `
        <div class="stat-row">
          <span>Lock Status:</span>
          <span class="stat-value ${targetConditions.lockStatus === 'Locked' ? 'text-success' : targetConditions.lockStatus === 'Acquiring' ? 'text-warning' : ''}">${targetConditions.lockStatus}</span>
        </div>
        ` : ''}
        ${targetConditions.ecmEffect ? `
        <div class="stat-row">
          <span>ECM Effect:</span>
          <span class="stat-value ${targetConditions.ecmEffect === 'Heavy' ? 'text-danger' : targetConditions.ecmEffect === 'Moderate' ? 'text-warning' : ''}">${targetConditions.ecmEffect}</span>
        </div>
        ` : ''}
        ${targetConditions.solutionQuality ? `
        <div class="stat-row">
          <span>Firing Solution:</span>
          <span class="stat-value ${targetConditions.solutionQuality === 'Excellent' ? 'text-success' : targetConditions.solutionQuality === 'Poor' ? 'text-danger' : ''}">${targetConditions.solutionQuality}</span>
        </div>
        ` : ''}
        ${targetConditions.targetAspect ? `
        <div class="stat-row">
          <span>Target Aspect:</span>
          <span class="stat-value">${targetConditions.targetAspect}</span>
        </div>
        ` : ''}
        ${targetConditions.trackingMod !== undefined ? `
        <div class="stat-row">
          <span>Tracking Mod:</span>
          <span class="stat-value ${targetConditions.trackingMod < 0 ? 'text-danger' : targetConditions.trackingMod > 0 ? 'text-success' : ''}">${targetConditions.trackingMod >= 0 ? '+' : ''}${targetConditions.trackingMod}</span>
        </div>
        ` : ''}
      </div>
      ${targetConditions.warning ? `
      <div class="targeting-warning" style="margin-top: 8px; padding: 8px; background: rgba(220,53,69,0.15); border-radius: 4px;">
        <strong class="text-danger">⚠ ${escapeHtml(targetConditions.warning)}</strong>
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${selectedWeapon && selectedTarget ? `
    <div class="detail-section fire-solution-section">
      <h4>FIRE SOLUTION</h4>
      <div class="fire-solution-display">
        <div class="solution-modifiers">
          <div class="mod-row"><span>Gunnery Skill:</span><span class="dm-value ${gunnerySkill >= 0 ? 'dm-positive' : 'dm-negative'}">+${gunnerySkill}</span></div>
          <div class="mod-row"><span>Range (${selectedTarget.range_band || 'Med'}):</span><span class="dm-value ${getRangeDM(selectedTarget.range_band) >= 0 ? 'dm-positive' : 'dm-negative'}">${formatRangeDM(getRangeDM(selectedTarget.range_band))}</span></div>
          ${shipState?.sensorLock?.targetId === selectedTarget.id ? '<div class="mod-row"><span>Sensor Lock:</span><span class="dm-value dm-positive">+2</span></div>' : ''}
          ${selectedTarget.dodge ? `<div class="mod-row"><span>Target Dodge:</span><span class="dm-value dm-negative">-${Math.floor((selectedTarget.thrust || 0) / 2)}</span></div>` : ''}
          <div class="mod-row total"><span>Total DM:</span><span class="dm-value">${formatRangeDM(gunnerySkill + getRangeDM(selectedTarget.range_band) + (shipState?.sensorLock?.targetId === selectedTarget.id ? 2 : 0))}</span></div>
        </div>
        <div class="solution-result">
          <div class="hit-probability" title="Chance to hit on 2D6 ≥ 8">
            <span class="hit-label">HIT:</span>
            <span class="hit-value ${hitChance >= 70 ? 'text-success' : hitChance >= 40 ? 'text-warning' : 'text-danger'}">${hitChance}%</span>
          </div>
        </div>
      </div>
      <div class="damage-prediction" style="margin-top: 8px; padding: 8px; background: var(--bg-tertiary); border-radius: 4px;">
        <div class="stat-row"><span>Weapon Damage:</span><span class="stat-value">${selectedWeapon.damage || '2D6'}</span></div>
        <div class="stat-row"><span>Target Armour:</span><span class="stat-value">${selectedTarget.armour || 0}</span></div>
        <div class="stat-row"><span>Expected Damage:</span><span class="stat-value">${Math.max(0, (parseInt(selectedWeapon.damage) || 2) * 3.5 - (selectedTarget.armour || 0)).toFixed(0)}</span></div>
        ${selectedTarget.health && selectedTarget.max_health ? `
        <div class="stat-row"><span>Shots to Kill:</span><span class="stat-value">${Math.ceil(selectedTarget.health / Math.max(1, (parseInt(selectedWeapon.damage) || 2) * 3.5 - (selectedTarget.armour || 0)))}</span></div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    <div class="detail-section weapons-section">
      <h4>WEAPONS</h4>
      ${hasWeapons && weapons.length > 1 ? `
      <div class="weapon-selector-dropdown">
        <label for="weapon-type-select">Active Weapon:</label>
        <select id="weapon-type-select" class="weapon-select" onchange="selectWeaponByIndex(this.value)"
                title="Select weapon to fire">
          ${weapons.map((w, i) => {
            const isAssigned = assignedTurret === null || i === assignedTurret - 1;
            const isMissile = (w.weapon_type || w.type || '').toLowerCase().includes('missile');
            const ammoText = w.ammo_max !== null && w.ammo_max !== undefined ? ` [${w.ammo_current}/${w.ammo_max}]` : '';
            return `<option value="${i}" ${!isAssigned ? 'disabled' : ''} ${(w.id || i) === selectedWeaponId ? 'selected' : ''}>
              ${w.name || 'Weapon ' + (i + 1)}${ammoText}${isMissile ? ' (Missile)' : ''}
            </option>`;
          }).join('')}
        </select>
      </div>
      ` : ''}
      <div class="weapons-grid">
        ${hasWeapons ? weapons.map((w, i) => {
          const isAssigned = assignedTurret === null || i === assignedTurret - 1;
          const isSelected = (w.id || i) === selectedWeaponId;
          const status = w.status || 'ready';
          const hasAmmo = w.ammo_max === null || (w.ammo_current > 0);
          const isMissile = (w.weapon_type || w.type || '').toLowerCase().includes('missile');
          return `
            <div class="weapon-card ${isAssigned ? 'assigned' : 'unassigned'} ${isSelected ? 'selected' : ''} ${getWeaponStatusClass(status)}"
                 onclick="selectWeaponByIndex(${i})" title="${w.name || 'Weapon ' + (i + 1)}: ${w.damage || '2d6'} damage, ${w.range || 'Medium'} range">
              <div class="weapon-header">
                <span class="weapon-select-indicator">${isSelected ? '◉' : '○'}</span>
                <span class="weapon-name">${w.name || 'Weapon ' + (i + 1)}</span>
                <span class="weapon-mount">${w.mount || 'Turret'}</span>
                ${isMissile ? '<span class="weapon-type-badge missile">MSL</span>' : ''}
              </div>
              <div class="weapon-stats">
                <span class="weapon-range" title="Optimal engagement range">Range: ${w.range || 'Medium'}</span>
                <span class="weapon-damage" title="Damage on hit">Damage: ${w.damage || '2d6'}</span>
              </div>
              ${w.ammo_max !== null && w.ammo_max !== undefined ? `
                <div class="weapon-ammo" title="${w.ammo_current} rounds remaining of ${w.ammo_max}">
                  <span class="ammo-label">Ammo:</span>
                  <span class="ammo-count ${w.ammo_current <= 3 ? 'ammo-low' : ''} ${w.ammo_current === 0 ? 'ammo-empty' : ''}">${w.ammo_current}/${w.ammo_max}</span>
                  ${isMissile && w.ammo_current > 0 ? '<span class="ammo-ready">LOADED</span>' : ''}
                  ${w.ammo_current === 0 ? '<span class="ammo-depleted">DEPLETED</span>' : ''}
                </div>
              ` : ''}
              <div class="weapon-status-indicator">${status.toUpperCase()}</div>
            </div>
          `;
        }).join('') : '<div class="placeholder">No weapons configured</div>'}
      </div>
    </div>

    <div class="detail-section fire-control-section">
      ${hitChance !== null && hasTargets && selectedWeapon ? `
      <div class="fire-solution" style="background: var(--panel-bg); padding: 8px; border-radius: 4px; margin-bottom: 8px;">
        <div class="hit-probability-display" title="Calculated from: 2D6 + Gunnery ${gunnerySkill >= 0 ? '+' : ''}${gunnerySkill} + Range DM ${formatRangeDM(getRangeDM(selectedTarget?.range_band))} >= 8">
          <span class="hit-label">Hit Chance:</span>
          <span class="hit-value ${hitChance >= 70 ? 'hit-high' : hitChance >= 40 ? 'hit-medium' : 'hit-low'}">${hitChance}%</span>
        </div>
        <div class="damage-prediction" style="margin-top: 4px;">
          <span style="color: var(--text-muted);">Expected Damage:</span>
          <span style="color: var(--danger); font-weight: bold;">${selectedWeapon.damage || '2d6'}</span>
          <span style="color: var(--text-muted); font-size: 11px;">(avg ~${Math.round(((selectedWeapon.damage || '2d6').match(/(\d+)d(\d+)/)?.[1] * (parseInt((selectedWeapon.damage || '2d6').match(/(\d+)d(\d+)/)?.[2]) + 1) / 2) || 7)})</span>
        </div>
      </div>
      ` : ''}
      <div class="fire-buttons" style="display: flex; gap: 5px; flex-wrap: wrap;">
        <button onclick="fireWeapon()" class="btn btn-danger btn-fire"
                title="${hasTargets ? `Fire ${selectedWeapon?.name || 'weapon'} at ${selectedTarget?.name || 'target'}${hitChance ? ` (${hitChance}% hit chance)` : ''}` : 'No target locked - awaiting hostile contacts or authorization'}"
                ${!hasTargets || !hasWeapons ? 'disabled' : ''}>
          ${selectedWeapon && (selectedWeapon.weapon_type || selectedWeapon.type || '').toLowerCase().includes('missile') ? 'LAUNCH!' : 'FIRE!'}
        </button>
        ${weapons.length > 1 ? `
        <button onclick="window.fireAllWeapons()" class="btn btn-danger"
                title="Fire all ready weapons at locked target"
                ${!hasTargets || !hasWeapons ? 'disabled' : ''}>
          FIRE ALL
        </button>
        ` : ''}
        <button onclick="togglePointDefense()" class="btn btn-warning btn-point-defense"
                title="Point Defense: Automatically intercept incoming missiles. Uses ammo each round."
                ${!hasWeapons ? 'disabled' : ''}>
          Point Defense
        </button>
      </div>
    </div>

    <div class="detail-section gunner-reference-section">
      <h4>TACTICAL REFERENCE</h4>
      <div class="action-buttons" style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button onclick="window.showWeaponsReference()" class="btn btn-small btn-info"
                title="Open weapons reference - damage, ranges, and tactical tips">
          Weapons Guide
        </button>
        <button onclick="window.showRangeChart()" class="btn btn-small btn-secondary"
                title="Range bands and DM modifiers">
          Range Chart
        </button>
      </div>
    </div>

    <div class="detail-section combat-log-section">
      <h4>FIRE LOG</h4>
      <div class="combat-log-list" id="gunner-combat-log">
        ${combatLog.length > 0 ? combatLog.slice(0, 10).map(entry => {
          const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--';
          const isHit = entry.action === 'hit' || (entry.roll_data?.hit === true);
          const isMiss = entry.action === 'miss' || (entry.roll_data?.hit === false);
          return `
            <div class="log-entry ${isHit ? 'log-hit' : ''} ${isMiss ? 'log-miss' : ''}">
              <span class="log-time">[${time}]</span>
              <span class="log-message">${escapeHtml(entry.result || entry.action || '')}</span>
            </div>
          `;
        }).join('') : `
          <div class="log-entry log-empty">No combat actions recorded</div>
        `}
      </div>
    </div>

    <div class="detail-section gunner-skill-note">
      <small>Attack: 2D6 + Gunnery skill + Range DM >= 8 to hit | Critical: Effect 6+</small>
    </div>
  `;
}

function getCaptainPanel(shipState, template, ship, crewOnline, contacts, rescueTargets = []) {
  // AR-131+: Get active sub-panel for captain's role switching
  const activePanel = window.state?.captainActivePanel || 'captain';

  // AR-131+: Tab bar for role switching (always show at top)
  const tabBar = `
    <div class="captain-tab-bar" style="display: flex; gap: 4px; margin-bottom: 12px; padding: 4px; background: var(--bg-tertiary); border-radius: 6px;">
      <button onclick="window.switchCaptainPanel('captain')" class="btn btn-tiny ${activePanel === 'captain' ? 'btn-primary' : 'btn-secondary'}" title="Captain orders and status">
        Captain
      </button>
      <button onclick="window.switchCaptainPanel('astrogator')" class="btn btn-tiny ${activePanel === 'astrogator' ? 'btn-primary' : 'btn-secondary'}" title="Plot jumps and navigation">
        Astrogator
      </button>
      <button onclick="window.switchCaptainPanel('pilot')" class="btn btn-tiny ${activePanel === 'pilot' ? 'btn-primary' : 'btn-secondary'}" title="Ship maneuvering">
        Pilot
      </button>
      <button onclick="window.switchCaptainPanel('engineer')" class="btn btn-tiny ${activePanel === 'engineer' ? 'btn-primary' : 'btn-secondary'}" title="Systems and repairs">
        Engineer
      </button>
    </div>
  `;

  // AR-131+: If showing a different role's panel, delegate to that panel function
  if (activePanel === 'astrogator') {
    // AR-168: Get jumpStatus from window.state for proper IN JUMP display
    const jumpStatus = window.state?.jumpStatus || {};
    const campaign = window.state?.campaign || {};
    const systemStatus = ship?.current_state?.systemStatus || {};
    return tabBar + getAstrogatorPanel(shipState, template, jumpStatus, campaign, systemStatus);
  }
  if (activePanel === 'pilot') {
    // AR-171: Fix signature - getPilotPanel expects (shipState, template, campaign, jumpStatus, flightConditions)
    const campaign = window.state?.campaign || {};
    const jumpStatus = window.state?.jumpStatus || {};
    const flightConditions = window.state?.flightConditions || null;
    return tabBar + getPilotPanel(shipState, template, campaign, jumpStatus, flightConditions);
  }
  if (activePanel === 'engineer') {
    // AR-172: Fix signature - getEngineerPanel expects (shipState, template, systemStatus, damagedSystems, fuelStatus, repairQueue)
    const systemStatus = window.state?.systemStatus || ship?.current_state?.systemStatus || {};
    const damagedSystems = window.state?.damagedSystems || [];
    const fuelStatus = window.state?.fuelStatus || { total: 0, max: 0, breakdown: {} };
    const repairQueue = window.state?.repairQueue || [];
    return tabBar + getEngineerPanel(shipState, template, systemStatus, damagedSystems, fuelStatus, repairQueue);
  }

  // Captain panel content below
  // Filter to targetable contacts only
  const targetableContacts = contacts?.filter(c => c.is_targetable) || [];
  const authorizedTargets = targetableContacts.filter(c => c.weapons_free);
  const unauthorizedTargets = targetableContacts.filter(c => !c.weapons_free);

  // Alert status colors
  const alertColors = {
    'NORMAL': '#28a745',
    'GREEN': '#28a745',
    'YELLOW': '#ffc107',
    'RED': '#dc3545'
  };
  const alertStatus = shipState.alertStatus || 'NORMAL';
  const alertColor = alertColors[alertStatus] || '#28a745';

  // Count contacts by marking
  const hostileCount = contacts?.filter(c => c.marking === 'hostile').length || 0;
  const unknownCount = contacts?.filter(c => !c.marking || c.marking === 'unknown').length || 0;

  // Hailable contacts (have transponder and are ships/stations)
  const hailableContacts = contacts?.filter(c =>
    c.transponder && c.transponder !== 'NONE' &&
    !c.celestial && c.type &&
    ['Ship', 'Station', 'Starport', 'Base', 'Patrol', 'Free Trader', 'Far Trader', 'System Defense Boat'].includes(c.type)
  ) || [];

  return tabBar + `
    <div class="detail-section captain-alert-section">
      <h4>Alert Status</h4>
      <div class="alert-status-display" style="border-left: 4px solid ${alertColor}; padding-left: 10px;">
        <span class="alert-status-text" style="color: ${alertColor}; font-weight: bold; font-size: 1.2em;">
          ${alertStatus === 'NORMAL' ? 'GREEN' : alertStatus}
        </span>
      </div>
      <div class="alert-controls" style="margin-top: 10px; display: flex; gap: 5px;">
        <button onclick="window.captainSetAlert('GREEN')" class="btn btn-small ${alertStatus === 'NORMAL' || alertStatus === 'GREEN' ? 'btn-success' : 'btn-secondary'}" title="Normal operations">
          Green
        </button>
        <button onclick="window.captainSetAlert('YELLOW')" class="btn btn-small ${alertStatus === 'YELLOW' ? 'btn-warning' : 'btn-secondary'}" title="Battle stations - combat readiness">
          Yellow
        </button>
        <button onclick="window.captainSetAlert('RED')" class="btn btn-small ${alertStatus === 'RED' ? 'btn-danger' : 'btn-secondary'}" title="Emergency - all hands">
          Red
        </button>
      </div>
    </div>

    <div class="detail-section captain-orders-section">
      <h4>Issue Orders</h4>
      <div class="quick-orders" style="margin-bottom: 8px; display: flex; gap: 5px; flex-wrap: wrap;">
        <button onclick="window.captainQuickOrder('Evade')" class="btn btn-small btn-secondary" title="Order evasive maneuvers">Evade</button>
        <button onclick="window.captainQuickOrder('Hold Position')" class="btn btn-small btn-secondary" title="Maintain current position">Hold</button>
        <button onclick="window.captainQuickOrder('Engage')" class="btn btn-small btn-secondary" title="Engage hostiles">Engage</button>
        <button onclick="window.captainQuickOrder('Stand Down')" class="btn btn-small btn-secondary" title="Return to normal ops">Stand Down</button>
      </div>
      <div class="nav-orders" style="margin-bottom: 8px; display: flex; gap: 5px; flex-wrap: wrap;">
        <button onclick="window.captainNavOrder('Emergency Stop')" class="btn btn-small btn-danger" title="All stop - emergency">E-Stop</button>
        <button onclick="window.captainNavOrder('Pursue')" class="btn btn-small btn-warning" title="Pursue target">Pursue</button>
        <button onclick="window.captainNavOrder('Run Silent')" class="btn btn-small btn-secondary" title="Minimize emissions">Silent</button>
        <button onclick="window.captainNavOrder('Full Thrust')" class="btn btn-small btn-primary" title="Maximum acceleration">Full</button>
      </div>
      ${contacts?.length > 0 ? `
      <div class="contact-orders" style="margin-bottom: 8px; display: flex; gap: 5px; align-items: center;">
        <select id="order-contact-select" class="order-select" style="flex: 1; max-width: 150px;">
          ${contacts.map(c => `
            <option value="${c.id}">${escapeHtml(c.transponder || c.name || 'Contact')}</option>
          `).join('')}
        </select>
        <button onclick="window.captainContactOrder('intercept')" class="btn btn-small btn-warning" title="Intercept contact">Intercept</button>
        <button onclick="window.captainContactOrder('track')" class="btn btn-small btn-secondary" title="Track contact">Track</button>
        <button onclick="window.captainContactOrder('avoid')" class="btn btn-small btn-secondary" title="Avoid contact">Avoid</button>
      </div>
      ` : ''}
      <div class="order-input-row" style="display: flex; gap: 5px;">
        <select id="order-target-select" class="order-select" style="flex: 0 0 100px;">
          <option value="all">All Crew</option>
          <option value="pilot">Pilot</option>
          <option value="gunner">Gunner</option>
          <option value="engineer">Engineer</option>
          <option value="sensor_operator">Sensors</option>
        </select>
        <input type="text" id="order-text-input" class="order-input" placeholder="Enter order..." maxlength="200" style="flex: 1;">
        <button onclick="window.captainIssueOrder()" class="btn btn-small btn-primary" title="Send order to selected crew">Send</button>
      </div>
      <div id="pending-orders" class="pending-orders" style="margin-top: 10px; max-height: 100px; overflow-y: auto;"></div>
    </div>

    <div class="detail-section captain-contacts-section">
      <h4>Tactical Overview</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Total Contacts:</span>
          <span class="stat-value">${contacts?.length || 0}</span>
        </div>
        <div class="stat-row">
          <span>Hostile:</span>
          <span class="stat-value ${hostileCount > 0 ? 'text-danger' : ''}">${hostileCount}</span>
        </div>
        <div class="stat-row">
          <span>Unknown:</span>
          <span class="stat-value ${unknownCount > 0 ? 'text-warning' : ''}">${unknownCount}</span>
        </div>
      </div>
      ${contacts?.length > 0 ? `
        <div class="contact-marking" style="margin-top: 10px;">
          <label for="mark-contact-select">Mark Contact:</label>
          <select id="mark-contact-select" class="mark-select" style="width: 100%; margin-top: 5px;">
            ${contacts.map(c => `
              <option value="${c.id}">${escapeHtml(c.name || 'Unknown')} - ${c.marking || 'unknown'}</option>
            `).join('')}
          </select>
          <div class="marking-buttons" style="margin-top: 5px; display: flex; gap: 5px;">
            <button onclick="window.captainMarkContact('friendly')" class="btn btn-small btn-success" title="Mark as friendly">Friendly</button>
            <button onclick="window.captainMarkContact('neutral')" class="btn btn-small btn-secondary" title="Mark as neutral">Neutral</button>
            <button onclick="window.captainMarkContact('hostile')" class="btn btn-small btn-danger" title="Mark as hostile">Hostile</button>
          </div>
        </div>
      ` : ''}
    </div>

    <div class="detail-section captain-weapons-section">
      <h4>Weapons Authorization</h4>
      <div class="weapons-auth-master" style="margin-bottom: 10px;">
        <button onclick="window.captainWeaponsAuth('hold')" class="btn btn-small ${shipState.weaponsAuth?.mode !== 'free' ? 'btn-warning' : 'btn-secondary'}" title="Gunners cannot fire">
          Weapons Hold
        </button>
        <button onclick="window.captainWeaponsAuth('free')" class="btn btn-small ${shipState.weaponsAuth?.mode === 'free' ? 'btn-danger' : 'btn-secondary'}" title="Gunners may engage">
          Weapons Free
        </button>
      </div>
      ${targetableContacts.length === 0 ? `
        <div class="placeholder">No targetable contacts</div>
      ` : `
        <div class="weapons-auth-status">
          <div class="stat-row">
            <span>Authorized:</span>
            <span class="stat-value ${authorizedTargets.length > 0 ? 'text-warning' : ''}">${authorizedTargets.length}</span>
          </div>
        </div>
      `}
    </div>

    <div class="detail-section captain-crew-section">
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
      <button onclick="window.captainRequestStatus()" class="btn btn-small btn-secondary" style="margin-top: 10px;" title="Request status from all stations">
        Request Status Report
      </button>
    </div>

    <div class="detail-section captain-leadership-section">
      <h4>Command Actions</h4>
      <div class="leadership-buttons" style="display: flex; gap: 5px; flex-wrap: wrap;">
        <button onclick="window.captainLeadershipCheck()" class="btn btn-small btn-primary" title="Roll Leadership to give DM to next crew action">
          Leadership Check
        </button>
        <button onclick="window.captainTacticsCheck()" class="btn btn-small btn-primary" title="Roll Tactics for initiative bonus">
          Tactics Check
        </button>
      </div>
      <div id="leadership-result" class="leadership-result" style="margin-top: 10px;"></div>
    </div>

    ${rescueTargets.length > 0 ? `
    <div class="detail-section captain-rescue-section">
      <h4>Rescue Priorities (${rescueTargets.length})</h4>
      <div class="rescue-list">
        ${rescueTargets.sort((a, b) => (a.eta || 999) - (b.eta || 999)).map((r, i) => `
          <div class="rescue-item ${r.eta && r.eta < 10 ? 'urgent' : ''}" style="padding: 6px 8px; background: ${i === 0 ? 'rgba(220,53,69,0.15)' : 'var(--bg-secondary)'}; border-radius: 4px; margin: 4px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="rescue-name">${escapeHtml(r.name || 'Unknown')}</span>
              <span class="rescue-count" style="font-weight: bold;">${r.count || '?'} souls</span>
            </div>
            <div style="font-size: 0.85em; color: var(--text-muted); display: flex; justify-content: space-between;">
              <span>${escapeHtml(r.location || '')}</span>
              ${r.eta ? `<span class="${r.eta < 10 ? 'text-danger' : 'text-warning'}">ETA: ${r.eta}m</span>` : ''}
            </div>
            ${r.notes ? `<div style="font-size: 0.8em; font-style: italic; color: var(--text-muted);">${escapeHtml(r.notes)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <div class="detail-section captain-solo-section">
      <h4>Ship Operations (Solo Mode)</h4>
      <p style="color: var(--text-muted); font-size: 0.8em; margin-bottom: 8px;">
        Command all ship functions directly. Skill: Captain=0, Filled Role=1, Skilled Crew=their skill.
      </p>
      <div class="solo-controls" style="display: flex; flex-direction: column; gap: 8px;">
        <div class="solo-group">
          <label style="font-size: 0.85em; color: var(--text-secondary);">Navigation</label>
          <div style="display: flex; gap: 5px; margin-top: 4px;">
            <button id="btn-captain-solo-plot" onclick="window.captainSoloCommand('plotJump')" class="btn btn-small btn-secondary" title="Plot jump course to destination">
              Plot Jump
            </button>
            <button id="btn-captain-solo-verify" onclick="window.captainSoloCommand('verifyPosition')" class="btn btn-small btn-secondary" title="Verify position after jump exit">
              Verify Position
            </button>
          </div>
        </div>
        <div class="solo-group">
          <label style="font-size: 0.85em; color: var(--text-secondary);">Helm</label>
          <div style="display: flex; gap: 5px; margin-top: 4px;">
            <button id="btn-captain-solo-course" onclick="window.captainSoloCommand('setCourse')" class="btn btn-small btn-secondary" title="Set course to destination">
              Set Course
            </button>
          </div>
        </div>
        <div class="solo-group">
          <label style="font-size: 0.85em; color: var(--text-secondary);">Engineering</label>
          <div style="display: flex; gap: 5px; margin-top: 4px;">
            <button id="btn-captain-solo-refuel" onclick="window.captainSoloCommand('refuel')" class="btn btn-small btn-secondary" title="Begin refueling">
              Refuel
            </button>
            <button id="btn-captain-solo-refine" onclick="window.captainSoloCommand('refineFuel')" class="btn btn-small btn-secondary" title="Process unrefined fuel">
              Refine Fuel
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="detail-section captain-comms-section">
      <h4>Communications</h4>
      ${hailableContacts.length === 0 ? `
        <div class="placeholder">No hailable contacts in range</div>
      ` : `
        <div class="hail-controls">
          <select id="hail-contact-select" class="hail-select" style="width: 100%; margin-bottom: 8px;">
            ${hailableContacts.map(c => `
              <option value="${c.id}">${escapeHtml(c.transponder || c.name || 'Unknown')} (${c.type})</option>
            `).join('')}
          </select>
          <div class="hail-buttons" style="display: flex; gap: 5px; margin-bottom: 8px;">
            <button onclick="window.hailSelectedContact()" class="btn btn-small btn-primary" title="Open channel to selected contact">
              Hail
            </button>
            <button onclick="window.broadcastMessage()" class="btn btn-small btn-secondary" title="Broadcast to all contacts">
              Broadcast
            </button>
          </div>
          <div class="message-input-row" style="display: flex; gap: 5px;">
            <input type="text" id="comms-message-input" class="comms-input" placeholder="Enter message..." maxlength="500" style="flex: 1;">
            <button onclick="window.sendCommsMessage()" class="btn btn-small btn-success" title="Send message to selected contact">
              Send
            </button>
          </div>
        </div>
      `}
    </div>
  `;
}

function getSensorOperatorPanel(shipState, contacts, environmentalData = null) {
  // Categorize contacts for display
  const celestials = contacts?.filter(c => c.celestial) || [];
  const stations = contacts?.filter(c => !c.celestial && c.type && ['Station', 'Starport', 'Base'].includes(c.type)) || [];
  const ships = contacts?.filter(c => !c.celestial && c.type && ['Ship', 'Patrol'].includes(c.type)) || [];
  const unknowns = contacts?.filter(c => !c.celestial && (!c.type || c.type === 'unknown')) || [];

  // AR-138: Count threats for status display
  const threats = contacts?.filter(c =>
    !c.celestial && (c.marking === 'hostile' || (c.type === 'Ship' && c.marking === 'unknown'))
  ) || [];
  const totalContacts = (contacts?.length || 0) - celestials.length;

  // AR-138: Get panel mode from global state
  const panelMode = window.state?.sensorPanelMode || 'collapsed';

  // AR-138: EW status for collapsed display
  const ecmActive = shipState?.ecm || shipState?.ecmActive || false;
  const eccmActive = shipState?.eccm || shipState?.eccmActive || false;
  const stealthActive = shipState?.stealth || false;
  const sensorLock = shipState?.sensorLock || null;

  // AR-138: Collapsed mode - single line status
  if (panelMode === 'collapsed') {
    const statusIcon = threats.length > 0 ? '🔴' : (unknowns.length > 0 ? '🟡' : '🟢');
    const statusText = threats.length > 0 ? 'THREATS' : (totalContacts > 0 ? 'Clear' : 'Clear');
    const ewStatus = [];
    if (stealthActive) ewStatus.push('Stealth');
    if (ecmActive) ewStatus.push('ECM');
    if (eccmActive) ewStatus.push('ECCM');
    if (sensorLock) ewStatus.push('🎯Lock');

    return `
      <div class="sensor-panel-collapsed" onclick="toggleSensorPanelMode('expanded')" style="cursor: pointer;">
        <div class="sensor-status-bar" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-secondary); border-radius: 6px;">
          <div class="sensor-status-left" style="display: flex; align-items: center; gap: 12px;">
            <span class="status-icon" style="font-size: 1.2em;">${statusIcon}</span>
            <span class="status-text" style="font-weight: 600;">${statusText}</span>
            <span class="contact-count" style="color: var(--text-muted);">
              ${totalContacts > 0 ? `👁 ${totalContacts} contact${totalContacts !== 1 ? 's' : ''}` : 'No contacts'}
            </span>
            ${threats.length > 0 ? `<span class="threat-count" style="color: var(--danger);">⚔ ${threats.length} threat${threats.length !== 1 ? 's' : ''}</span>` : ''}
          </div>
          <div class="sensor-status-right" style="display: flex; align-items: center; gap: 8px;">
            ${ewStatus.length > 0 ? `<span class="ew-status" style="font-size: 0.85em; color: var(--warning);">${ewStatus.join(' | ')}</span>` : ''}
            <span class="expand-hint" style="color: var(--text-muted); font-size: 0.85em;">▼ Expand</span>
          </div>
        </div>
      </div>
    `;
  }

  // Scan level labels
  const scanLevelLabels = ['Unknown', 'Passive', 'Active', 'Deep'];

  // AR-55: Range band to KM conversion for tooltips
  const rangeBandKm = {
    Adjacent: '< 1 km',
    Close: '1-10 km',
    Short: '10-1,250 km',
    Medium: '1,250-10,000 km',
    Long: '10,000-25,000 km',
    VeryLong: '25,000-50,000 km',
    Distant: '50,000+ km'
  };

  // AR-55: Compact single-line contact rendering
  const renderContactCompact = (c) => {
    const scanLevel = c.scan_level || 0;
    const scanClass = scanLevel === 0 ? 'undetected' : scanLevel === 1 ? 'passive' : scanLevel === 2 ? 'active' : 'deep';
    const showName = scanLevel >= 2;
    const name = showName ? escapeHtml(c.name || c.transponder || '???') : `C-${(c.id || '').slice(0,4)}`;
    const type = scanLevel >= 1 ? (c.type || '???') : '???';
    const rangeKm = rangeBandKm[c.range_band] || c.range_band || '???';
    const tooltip = `${name}\\nType: ${type}\\nRange: ${c.range_band} (${rangeKm})\\nBearing: ${c.bearing || 0}°\\nScan: ${scanLevelLabels[scanLevel]}${c.tonnage && scanLevel >= 3 ? `\\nTonnage: ${c.tonnage} dT` : ''}`;

    return `
      <div class="sensor-contact-compact ${scanClass}" data-contact-id="${c.id}" title="${tooltip}" onclick="window.showContactTooltip && showContactTooltip('${c.id}')">
        <span class="contact-type-icon type-${type.toLowerCase()}">${type.charAt(0)}</span>
        <span class="contact-name-compact">${name}</span>
        <span class="contact-range-compact">${c.range_band || '???'}</span>
        ${scanLevel < 3 ? `<span class="scan-indicator" onclick="event.stopPropagation(); scanContact('${c.id}', ${scanLevel + 1})">◎</span>` : ''}
      </div>
    `;
  };

  // Legacy detailed contact rendering (for expanded view)
  const renderContact = (c) => {
    const scanLevel = c.scan_level || 0;
    const scanClass = scanLevel === 0 ? 'undetected' : scanLevel === 1 ? 'passive' : scanLevel === 2 ? 'active' : 'deep';

    // What info to show based on scan level
    const showType = scanLevel >= 1;
    const showName = scanLevel >= 2;
    const showDetails = scanLevel >= 3;

    return `
      <div class="sensor-contact ${scanClass}" data-contact-id="${c.id}">
        <div class="contact-header">
          <span class="contact-designator">${showName ? escapeHtml(c.name || c.transponder || 'Unknown') : `Contact ${c.id?.slice(0,4) || '???'}`}</span>
          <span class="contact-range">${c.range_band || 'Unknown'}</span>
        </div>
        <div class="contact-details">
          ${showType ? `<span class="contact-type">${c.type || 'Unknown'}</span>` : '<span class="contact-type">???</span>'}
          <span class="contact-bearing">${c.bearing || 0}°</span>
          <span class="contact-scan-level scan-${scanClass}">${scanLevelLabels[scanLevel]}</span>
        </div>
        ${showDetails && c.tonnage ? `<div class="contact-tonnage">${c.tonnage} dT</div>` : ''}
        ${scanLevel < 3 ? `
          <button class="btn btn-tiny" onclick="scanContact('${c.id}', ${scanLevel + 1})">
            ${scanLevel < 2 ? 'Active Scan' : 'Deep Scan'}
          </button>
        ` : ''}
      </div>
    `;
  };

  // AR-36: ECM/ECCM state - variables already declared above for collapsed mode
  const sensorGrade = shipState?.sensorGrade || 'civilian';

  // AR-138: Mode indicator for expanded/combat
  const modeLabel = panelMode === 'combat' ? 'COMBAT' : 'EXPANDED';

  // AR-138: Build contact data for mini radar
  const radarContacts = contacts?.filter(c => !c.celestial).map(c => ({
    id: c.id,
    bearing: c.bearing || 0,
    range_km: c.range_km || 50000,
    marking: c.marking || 'unknown',
    type: c.type || 'unknown',
    name: c.name || c.transponder || `C-${(c.id || '').slice(0,4)}`
  })) || [];

  return `
    <div class="sensor-panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 4px 8px; background: var(--bg-tertiary); border-radius: 4px;">
      <span style="font-weight: 600; font-size: 0.9em;">📡 SENSORS ${panelMode === 'combat' ? '<span style="color: var(--danger);">[COMBAT]</span>' : ''}</span>
      <button onclick="toggleSensorPanelMode('collapsed')" class="btn btn-tiny btn-secondary" title="Collapse panel">▲ Collapse</button>
    </div>

    <!-- AR-138: Mini Radar Display -->
    <div class="detail-section mini-radar-section" style="margin-bottom: 12px;">
      <div class="mini-radar-container" style="display: flex; justify-content: center; align-items: center;">
        <canvas id="sensor-mini-radar" width="200" height="200" style="background: #0a0a12; border-radius: 50%; border: 2px solid var(--border-color);"></canvas>
      </div>
      <div class="radar-legend" style="display: flex; justify-content: center; gap: 12px; margin-top: 6px; font-size: 0.75em; color: var(--text-muted);">
        <span><span style="color: #4f4;">●</span> Friendly</span>
        <span><span style="color: #f44;">●</span> Hostile</span>
        <span><span style="color: #ff4;">●</span> Unknown</span>
        <span><span style="color: #48f;">●</span> Neutral</span>
      </div>
      <script>
        if (typeof renderMiniRadar === 'function') {
          setTimeout(() => renderMiniRadar(${JSON.stringify(radarContacts)}, 50000), 0);
        }
      </script>
    </div>

    <!-- AR-138.4: Emissions Meter -->
    <div class="detail-section emissions-section" style="margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-size: 0.85em; font-weight: 500;">EMISSIONS</span>
        <span style="font-size: 0.75em; color: var(--text-muted);">
          ${stealthActive ? 'Low Profile (-4 DM)' : ecmActive ? 'Active Jamming' : 'Normal'}
        </span>
      </div>
      <div class="emissions-bar" style="background: var(--bg-tertiary); border-radius: 4px; height: 8px; overflow: hidden;">
        <div style="height: 100%; width: ${stealthActive ? '20' : ecmActive ? '60' : '100'}%; background: ${stealthActive ? 'var(--success)' : ecmActive ? 'var(--warning)' : 'var(--info)'}; transition: width 0.3s, background 0.3s;"></div>
      </div>
      <div style="font-size: 0.7em; color: var(--text-muted); margin-top: 2px;">
        ${stealthActive ? '⚠ Active scan would reveal position' : ecmActive ? 'Jamming active - easier to detect but harder to target' : 'Full emissions - visible on passive scans'}
      </div>
    </div>

    <div class="detail-section">
      <h4>Sensor Controls</h4>
      <div class="sensor-scan-buttons">
        <button onclick="performScan('passive')" class="btn btn-small" title="Passive Scan: Detect transponders and celestials only. Does not reveal your position.">
          Passive Scan
        </button>
        <button onclick="performScan('active')" class="btn btn-small btn-warning" title="Active Scan: Full sensor sweep. WARNING: May reveal your position to other ships!">
          Active Scan
        </button>
        <button onclick="performScan('deep')" class="btn btn-small btn-danger" title="Deep Scan: Detailed analysis of contacts. CAUTION: Definitely reveals your position!">
          Deep Scan
        </button>
      </div>
      <div class="sensor-scan-note">
        <small>Active/Deep scans reveal our position to other ships</small>
      </div>
    </div>

    <!-- AR-138.5: Context-sensitive EW controls - show ECM/ECCM only when ships present -->
    <div class="detail-section ecm-section">
      <h4>Electronic Warfare</h4>
      <div class="ecm-status">
        <div class="stat-row">
          <span>Sensor Grade:</span>
          <span class="stat-value ${sensorGrade === 'military' ? 'text-success' : ''}">${sensorGrade === 'military' ? 'Military (+2 DM)' : 'Civilian (+0 DM)'}</span>
        </div>
      </div>
      <div class="ecm-controls" style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
        ${ships.length > 0 || threats.length > 0 ? `
          <button id="btn-ecm" onclick="window.toggleECM()" class="btn btn-small ${ecmActive ? 'btn-danger' : 'btn-secondary'}" title="ECM: Jamming gives enemies -2 DM to sensor checks against us">
            ECM ${ecmActive ? 'ON' : 'OFF'}
          </button>
          <button id="btn-eccm" onclick="window.toggleECCM()" class="btn btn-small ${eccmActive ? 'btn-success' : 'btn-secondary'}" title="ECCM: Counter-jamming negates enemy ECM (-2 penalty)">
            ECCM ${eccmActive ? 'ON' : 'OFF'}
          </button>
        ` : ''}
        <button id="btn-stealth" onclick="window.toggleStealth()" class="btn btn-small ${stealthActive ? 'btn-warning' : 'btn-secondary'}" title="Stealth: Reduce emissions to avoid detection">
          Stealth ${stealthActive ? 'ON' : 'OFF'}
        </button>
      </div>
      ${sensorLock ? `
        <div class="sensor-lock-status" style="margin-top: 8px; padding: 6px; background: var(--bg-tertiary); border-left: 3px solid var(--success); border-radius: 4px;">
          <strong>LOCK:</strong> ${escapeHtml(sensorLock.targetName || sensorLock.targetId)}
          <span class="lock-bonus">(+2 Attack DM)</span>
          <button id="btn-break-lock" onclick="window.breakSensorLock()" class="btn btn-tiny btn-secondary" style="margin-left: 8px;">Break</button>
        </div>
      ` : `
        <div class="sensor-lock-hint" style="margin-top: 8px; color: var(--text-muted); font-size: 0.85em;">
          Click a contact below to acquire sensor lock (+2 Attack DM)
        </div>
      `}
    </div>
    <div class="detail-section sensor-contacts-section">
      <h4>Contacts (${contacts?.length || 0})</h4>
      <div class="sensor-contacts-compact">
        ${ships.length > 0 ? `<div class="category-label">Ships</div>${ships.map(renderContactCompact).join('')}` : ''}
        ${stations.length > 0 ? `<div class="category-label">Stations</div>${stations.map(renderContactCompact).join('')}` : ''}
        ${unknowns.length > 0 ? `<div class="category-label">Unknown</div>${unknowns.map(renderContactCompact).join('')}` : ''}
        ${celestials.length > 0 ? `<div class="category-label">Celestial</div>${celestials.map(c => `
          <div class="sensor-contact-compact celestial" title="${escapeHtml(c.name || 'Body')}\\nType: ${c.type || 'Planet'}">
            <span class="contact-type-icon type-celestial">★</span>
            <span class="contact-name-compact">${escapeHtml(c.name || 'Body')}</span>
            <span class="contact-range-compact">${c.type || 'Planet'}</span>
          </div>
        `).join('')}` : ''}
        ${(!contacts || contacts.length === 0) ? '<div class="placeholder">No contacts</div>' : ''}
      </div>
    </div>
    <div id="scan-result-display" class="scan-result-display" style="display: none;">
      <!-- Populated by scan results -->
    </div>
    ${ships.length > 0 ? `
    <div class="detail-section">
      <h4>Threat Assessment</h4>
      <div class="threat-list">
        ${ships.filter(c => c.scan_level >= 2).map(c => {
          const threat = c.marking === 'hostile' ? 'HIGH' : c.marking === 'unknown' ? 'UNKNOWN' : 'LOW';
          const threatClass = threat === 'HIGH' ? 'text-danger' : threat === 'UNKNOWN' ? 'text-warning' : 'text-success';
          return `
            <div class="threat-item" style="display: flex; justify-content: space-between; padding: 3px 0;">
              <span>${escapeHtml(c.name || c.transponder || 'Contact')}</span>
              <span class="${threatClass}">${threat}</span>
            </div>
          `;
        }).join('') || '<div class="placeholder">Scan ships to assess threats</div>'}
      </div>
    </div>
    ` : ''}
    ${environmentalData ? `
    <div class="detail-section environmental-monitoring">
      <h4>Environmental Monitoring</h4>
      <div class="detail-stats">
        ${environmentalData.temperature !== undefined ? `
        <div class="stat-row">
          <span>Temperature:</span>
          <span class="stat-value ${environmentalData.temperature > 100 ? 'text-danger' : environmentalData.temperature < -20 ? 'text-info' : ''}">${environmentalData.temperature}°C</span>
        </div>
        ` : ''}
        ${environmentalData.atmosphere ? `
        <div class="stat-row">
          <span>Atmosphere:</span>
          <span class="stat-value ${environmentalData.atmosphereToxic ? 'text-danger' : ''}">${escapeHtml(environmentalData.atmosphere)}</span>
        </div>
        ` : ''}
        ${environmentalData.visibility ? `
        <div class="stat-row">
          <span>Visibility:</span>
          <span class="stat-value ${environmentalData.visibility === 'Poor' || environmentalData.visibility === 'Zero' ? 'text-warning' : ''}">${environmentalData.visibility}</span>
        </div>
        ` : ''}
        ${environmentalData.radiation !== undefined ? `
        <div class="stat-row">
          <span>Radiation:</span>
          <span class="stat-value ${environmentalData.radiation > 50 ? 'text-danger' : environmentalData.radiation > 20 ? 'text-warning' : ''}">${environmentalData.radiation} mSv/h</span>
        </div>
        ` : ''}
      </div>
      ${environmentalData.hazards && environmentalData.hazards.length > 0 ? `
      <div class="hazard-alerts" style="margin-top: 8px;">
        <div class="alert-header" style="font-weight: bold; color: var(--danger);">⚠ Active Hazards</div>
        ${environmentalData.hazards.map(h => `
          <div class="hazard-item" style="padding: 4px 8px; background: rgba(255,0,0,0.1); border-radius: 4px; margin: 4px 0;">
            <span class="hazard-name">${escapeHtml(h.name)}</span>
            ${h.distance ? `<span class="hazard-distance" style="float: right;">${h.distance}</span>` : ''}
            ${h.eta ? `<div class="hazard-eta text-warning" style="font-size: 0.85em;">ETA: ${h.eta}</div>` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}
      ${environmentalData.prediction ? `
      <div class="prediction-alert" style="margin-top: 8px; padding: 8px; background: rgba(255,165,0,0.15); border-radius: 4px;">
        <strong>Prediction:</strong> ${escapeHtml(environmentalData.prediction)}
      </div>
      ` : ''}
    </div>
    ` : ''}
    <div class="detail-section sensor-skill-note">
      <small><em>Your Electronics (sensors) skill affects detection range and accuracy</em></small>
    </div>
  `;
}

function getAstrogatorPanel(shipState, template, jumpStatus, campaign, systemStatus) {
  const jumpRating = template.jumpRating || 2;
  const fuelAvailable = shipState.fuel ?? template.fuel ?? 40;
  const tonnage = template.tonnage || 100;
  const fuelPerParsec = Math.round(tonnage * 0.1); // 10% of tonnage per parsec

  // AR-15.8: Calculate max jump range based on fuel
  const maxJumpWithFuel = Math.min(jumpRating, Math.floor(fuelAvailable / fuelPerParsec));
  const jDriveDisabled = systemStatus?.jDrive?.disabled;

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
          <button onclick="completeJump()" class="btn btn-primary" title="Exit jump space at destination">Exit Jump Space</button>
        ` : `
          <div class="jump-skip-testing">
            <button onclick="skipToJumpExit()" class="btn btn-secondary btn-small" title="Testing: Advance time to jump exit">
              [DEV] Skip to Exit
            </button>
            <small class="testing-note">Testing only - advances time 168h</small>
          </div>
        `}
      </div>
    `;
  }

  // AR-68: Check if position needs verification after jump exit
  const needsVerification = shipState.positionVerified === false;
  if (needsVerification) {
    return `
      <div class="detail-section position-verification">
        <h4>POSITION VERIFICATION REQUIRED</h4>
        <div class="verification-notice">
          Ship has just exited jump space. Verify position before pilot can navigate.
        </div>
        <button onclick="verifyPosition()" class="btn btn-primary">
          Verify Position
        </button>
        <small class="verification-note">Electronics (Sensors) check with +4 DM</small>
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
          <span class="stat-value">${campaign?.current_system || (campaign?.current_sector && campaign?.current_hex ? `${campaign.current_sector} ${campaign.current_hex}` : 'Unknown')}</span>
        </div>
        <div class="stat-row">
          <span>Jump Drive:</span>
          <span class="stat-value ${jDriveDisabled ? 'text-danger' : ''}">${jDriveDisabled ? 'DAMAGED' : 'Operational'}</span>
        </div>
        <div class="stat-row" title="Maximum jump distance capability">
          <span>Jump Rating:</span>
          <span class="stat-value">J-${jumpRating}</span>
        </div>
        <div class="stat-row" title="${fuelAvailable} tons available, ${fuelPerParsec} tons per parsec">
          <span>Fuel Available:</span>
          <span class="stat-value ${fuelAvailable < fuelPerParsec ? 'text-danger' : ''}">${fuelAvailable} tons</span>
        </div>
        <div class="stat-row" title="Maximum jump distance with current fuel">
          <span>Max Jump Range:</span>
          <span class="stat-value ${maxJumpWithFuel < jumpRating ? 'text-warning' : 'text-success'}">
            J-${maxJumpWithFuel} ${maxJumpWithFuel < jumpRating ? '(fuel limited)' : ''}
          </span>
        </div>
      </div>
    </div>
    ${hasSectorData ? `
    <div class="detail-section jump-map-section">
      <h4>Jump Map</h4>
      <div class="jump-map-controls">
        <select id="jump-map-range" class="jump-select" onchange="updateJumpMap()" title="Display systems within jump range">
          ${[...Array(jumpRating)].map((_, i) => {
            const canReach = (i + 1) <= maxJumpWithFuel;
            return `<option value="${i+1}" ${!canReach ? 'class="jump-out-of-range"' : ''}>
              J-${i+1} Range${!canReach ? ' (needs fuel)' : ''}
            </option>`;
          }).join('')}
        </select>
        <select id="jump-map-style" class="jump-select" onchange="updateJumpMap()" title="Map display style">
          <option value="poster">Poster</option>
          <option value="terminal">Terminal</option>
          <option value="candy">Candy</option>
          <option value="atlas">Atlas</option>
        </select>
        <select id="jump-map-size" class="jump-select" onchange="setMapSize(this.value)" title="Map display size">
          <option value="small">Small</option>
          <option value="medium" selected>Medium</option>
          <option value="large">Large</option>
          <option value="full">Full Screen</option>
        </select>
      </div>
      <div id="jump-map-container" class="jump-map-container" data-size="medium">
        <img id="jump-map-image" src="" alt="Jump Map" style="display: none;">
        <div class="jump-map-loading">Loading jump map...</div>
      </div>
      <div class="jump-map-hint">
        <small>Drag to pan | Scroll to zoom | Click system for details</small>
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
      <h4>Plot Jump Course</h4>
      ${jDriveDisabled ? `
      <div class="jump-warning">
        <span class="warning-icon">⚠</span>
        <span>Jump drive damaged - repairs required before jump</span>
      </div>
      ` : ''}
      <div class="jump-controls">
        <div class="form-group">
          <label for="jump-destination">Destination:</label>
          <input type="text" id="jump-destination" placeholder="System name (e.g., Ator)" class="jump-input"
                 title="Enter destination system name">
        </div>
        <div class="form-group">
          <label for="jump-distance">Distance:</label>
          <select id="jump-distance" class="jump-select" title="Select jump distance (limited by fuel and drive rating)">
            ${[...Array(jumpRating)].map((_, i) => {
              const distance = i + 1;
              const fuelNeeded = distance * fuelPerParsec;
              const canJump = distance <= maxJumpWithFuel && !jDriveDisabled;
              return `<option value="${distance}" ${!canJump ? 'disabled' : ''}>
                Jump-${distance} (${distance} parsec${distance > 1 ? 's' : ''}, ${fuelNeeded}t fuel)${!canJump ? ' - unavailable' : ''}
              </option>`;
            }).join('')}
          </select>
        </div>
        <button onclick="plotJumpCourse()" class="btn btn-secondary ${jDriveDisabled || maxJumpWithFuel === 0 ? 'disabled' : ''}"
                title="${jDriveDisabled ? 'Jump drive damaged' : maxJumpWithFuel === 0 ? 'Insufficient fuel for any jump' : 'Calculate jump coordinates and verify fuel requirements'}"
                ${jDriveDisabled || maxJumpWithFuel === 0 ? 'disabled' : ''}>Plot Course</button>
      </div>
      <div id="jump-plot-result" class="jump-plot-result" style="display: none;">
        <!-- Populated by plotJumpCourse() -->
      </div>
    </div>
    <div class="detail-section astrogator-skill-note">
      <small><em>Your Astrogation skill affects jump accuracy and fuel efficiency</em></small>
    </div>
  `;
}

function getDamageControlPanel(shipState, template, systemStatus = {}, damagedSystems = []) {
  // AR-38.3: Merge combat damage with template-based system damage
  const shipSystems = shipState.systems || template.systems || {};
  const templateDamagedSystems = Object.entries(shipSystems)
    .filter(([name, sys]) => sys && sys.health !== undefined && sys.health < 100)
    .map(([name, sys]) => ({ name, health: sys.health, issue: sys.issue, status: sys.status }));

  // Combine combat damage + template damage for repair list
  const allDamagedSystems = [
    ...damagedSystems,
    ...templateDamagedSystems.map(s => s.name).filter(n => !damagedSystems.includes(n))
  ];

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
      <h4>System Status</h4>
      <div class="system-status-grid">
        ${renderSystemStatusItem('M-Drive', systemStatus.mDrive, getSystemTooltip('mDrive', template))}
        ${renderSystemStatusItem('Power Plant', systemStatus.powerPlant, getSystemTooltip('powerPlant', template))}
        ${renderSystemStatusItem('J-Drive', systemStatus.jDrive, getSystemTooltip('jDrive', template))}
        ${renderSystemStatusItem('Sensors', systemStatus.sensors, getSystemTooltip('sensors', template))}
        ${renderSystemStatusItem('Computer', systemStatus.computer, getSystemTooltip('computer', template))}
        ${renderSystemStatusItem('Armour', systemStatus.armour, getSystemTooltip('armour', template))}
        ${renderSystemStatusItem('Weapons', systemStatus.weapon, getSystemTooltip('weapon', template))}
        ${renderSystemStatusItem('Hull', systemStatus.hull, getSystemTooltip('hull', template))}
        ${renderSystemStatusItem('Fuel', systemStatus.fuel)}
        ${renderSystemStatusItem('Cargo', systemStatus.cargo)}
      </div>
      ${templateDamagedSystems.length > 0 ? `
      <h5 style="margin-top: 12px;">Auxiliary Systems</h5>
      <div class="system-status-grid">
        ${templateDamagedSystems.map(sys => `
          <div class="system-status-item ${sys.health < 50 ? 'critical' : 'damaged'}">
            <span class="system-name">${sys.name}</span>
            <span class="system-state">${sys.health}% - ${sys.status}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
    ${allDamagedSystems.length > 0 ? `
    <div class="detail-section">
      <h4>Repair Actions</h4>
      <div class="repair-controls">
        <select id="repair-target" class="repair-select">
          ${allDamagedSystems.map(s => `<option value="${s}">${formatSystemName(s)}</option>`).join('')}
        </select>
        <button onclick="attemptRepair()" class="btn btn-small" title="Roll repair check (8+) to fix selected system. DM penalty equals damage severity.">Attempt Repair</button>
      </div>
      <div class="repair-info">
        <small>Repair check (8+) with DM = -Severity</small>
      </div>
    </div>
    ` : `
    <div class="detail-section">
      <h4>Repair Actions</h4>
      <div class="placeholder">All systems operational</div>
    </div>
    `}
  `;
}

// ==================== AR-49 Phase 5: Medic Panel ====================

function getMedicPanel(shipState, template, crewOnline = [], medicalConditions = null) {
  // Medical conditions section HTML
  const medicalConditionsHtml = medicalConditions ? `
    <div class="detail-section medical-conditions">
      <h4>Medical Status</h4>
      <div class="detail-stats">
        ${medicalConditions.alertLevel ? `
        <div class="stat-row">
          <span>Alert Level:</span>
          <span class="stat-value ${medicalConditions.alertLevel === 'Critical' ? 'text-danger' : medicalConditions.alertLevel === 'Elevated' ? 'text-warning' : ''}">${medicalConditions.alertLevel}</span>
        </div>
        ` : ''}
        ${medicalConditions.supplyLevel !== undefined ? `
        <div class="stat-row">
          <span>Medical Supplies:</span>
          <span class="stat-value ${medicalConditions.supplyLevel <= 25 ? 'text-danger' : medicalConditions.supplyLevel <= 50 ? 'text-warning' : ''}">${medicalConditions.supplyLevel}%</span>
        </div>
        ` : ''}
        ${medicalConditions.bedCapacity !== undefined ? `
        <div class="stat-row">
          <span>Beds Available:</span>
          <span class="stat-value">${medicalConditions.bedsUsed || 0}/${medicalConditions.bedCapacity}</span>
        </div>
        ` : ''}
      </div>
      ${medicalConditions.patients && medicalConditions.patients.length > 0 ? `
      <div class="patient-list" style="margin-top: 8px;">
        <strong>Patients:</strong>
        <ul style="margin: 4px 0 0 0; padding-left: 16px;">
          ${medicalConditions.patients.map(p => `
            <li class="${p.severity === 'critical' ? 'text-danger' : p.severity === 'serious' ? 'text-warning' : ''}">
              ${escapeHtml(p.name)} - ${escapeHtml(p.condition)}${p.treatmentEta ? ` (${p.treatmentEta})` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
      ${medicalConditions.hazard ? `
      <div class="medical-hazard" style="margin-top: 8px; padding: 8px; background: rgba(220,53,69,0.15); border-radius: 4px;">
        <strong class="text-danger">⚠ ${escapeHtml(medicalConditions.hazard)}</strong>
      </div>
      ` : ''}
    </div>
  ` : '';

  // Crew health overview
  const crewCount = crewOnline?.length || 0;
  const healthyCount = medicalConditions?.healthyCrew ?? crewCount;
  const injuredCount = medicalConditions?.patients?.length || 0;

  return `
    <div class="detail-section">
      <h4>Sickbay</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Crew Health:</span>
          <span class="stat-value ${injuredCount > 0 ? 'text-warning' : 'text-success'}">${healthyCount}/${crewCount} healthy</span>
        </div>
        <div class="stat-row">
          <span>Injured:</span>
          <span class="stat-value ${injuredCount > 0 ? 'text-danger' : ''}">${injuredCount}</span>
        </div>
      </div>
    </div>

    ${medicalConditionsHtml}

    <div class="detail-section">
      <h4>Medical Actions</h4>
      <div class="action-buttons">
        <button onclick="roleAction('triage')" class="btn btn-small">Triage</button>
        <button onclick="roleAction('treatInjury')" class="btn btn-small">Treat Injury</button>
        <button onclick="roleAction('checkSupplies')" class="btn btn-small">Check Supplies</button>
      </div>
    </div>
  `;
}

// ==================== AR-49 Phase 7: Marines Panel ====================

function getMarinesPanel(shipState, template, boardingConditions = null) {
  // Default squad status
  const squadReady = shipState.marineSquadReady ?? true;
  const squadSize = template.marineComplement || 4;

  // Boarding conditions section HTML
  const boardingConditionsHtml = boardingConditions ? `
    <div class="detail-section boarding-conditions">
      <h4>Tactical Situation</h4>
      <div class="detail-stats">
        ${boardingConditions.alertLevel ? `
        <div class="stat-row">
          <span>Alert Level:</span>
          <span class="stat-value ${boardingConditions.alertLevel === 'Combat' ? 'text-danger' : boardingConditions.alertLevel === 'Elevated' ? 'text-warning' : ''}">${boardingConditions.alertLevel}</span>
        </div>
        ` : ''}
        ${boardingConditions.hostileCount !== undefined ? `
        <div class="stat-row">
          <span>Hostile Count:</span>
          <span class="stat-value ${boardingConditions.hostileCount > 0 ? 'text-danger' : 'text-success'}">${boardingConditions.hostileCount}</span>
        </div>
        ` : ''}
        ${boardingConditions.deckControl ? `
        <div class="stat-row">
          <span>Deck Control:</span>
          <span class="stat-value ${boardingConditions.deckControl === 'Contested' ? 'text-warning' : boardingConditions.deckControl === 'Enemy' ? 'text-danger' : 'text-success'}">${boardingConditions.deckControl}</span>
        </div>
        ` : ''}
        ${boardingConditions.breachPoints !== undefined ? `
        <div class="stat-row">
          <span>Breach Points:</span>
          <span class="stat-value ${boardingConditions.breachPoints > 0 ? 'text-danger' : ''}">${boardingConditions.breachPoints}</span>
        </div>
        ` : ''}
      </div>
      ${boardingConditions.sectors && boardingConditions.sectors.length > 0 ? `
      <div class="sector-list" style="margin-top: 8px;">
        <strong>Sector Status:</strong>
        <ul style="margin: 4px 0 0 0; padding-left: 16px;">
          ${boardingConditions.sectors.map(s => `
            <li class="${s.status === 'hostile' ? 'text-danger' : s.status === 'contested' ? 'text-warning' : 'text-success'}">
              ${escapeHtml(s.name)} - ${escapeHtml(s.status)}
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
      ${boardingConditions.hazard ? `
      <div class="boarding-hazard" style="margin-top: 8px; padding: 8px; background: rgba(220,53,69,0.15); border-radius: 4px;">
        <strong class="text-danger">⚠ ${escapeHtml(boardingConditions.hazard)}</strong>
      </div>
      ` : ''}
    </div>
  ` : '';

  return `
    <div class="detail-section">
      <h4>Marine Detachment</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Squad Status:</span>
          <span class="stat-value ${squadReady ? 'text-success' : 'text-warning'}">${squadReady ? 'Ready' : 'Deploying'}</span>
        </div>
        <div class="stat-row">
          <span>Squad Size:</span>
          <span class="stat-value">${squadSize} marines</span>
        </div>
        <div class="stat-row">
          <span>Equipment:</span>
          <span class="stat-value">${shipState.marineEquipment || 'Standard'}</span>
        </div>
      </div>
    </div>

    ${boardingConditionsHtml}

    <div class="detail-section">
      <h4>Tactical Actions</h4>
      <div class="action-buttons" style="display: flex; flex-wrap: wrap; gap: 6px;">
        <button onclick="roleAction('securityPatrol')" class="btn btn-small"
                title="Deploy marines on patrol routes. Increases internal security, detects intruders earlier. Takes 1 hour to establish full coverage.">
          Security Patrol
        </button>
        <button onclick="roleAction('prepareBoarding')" class="btn btn-small"
                title="Prep for boarding action: issue weapons, breaching charges, vacc suits. Marines ready at airlock. Takes 10 minutes.">
          Prep Boarding
        </button>
        <button onclick="roleAction('repelBoarders')" class="btn btn-small btn-danger"
                title="ALERT: Hostile boarders detected! Marines engage enemy forces. Triggers tactical combat resolution.">
          Repel Boarders
        </button>
      </div>
    </div>
  `;
}

// ==================== AR-18 Phase 8: Comms Panel ====================

function getCommsPanel(shipState, contacts = [], crewOnline = []) {
  // Find hailable contacts (have transponder and are ships/stations)
  const hailableContacts = contacts?.filter(c =>
    c.transponder && c.transponder !== 'NONE' &&
    !c.celestial && c.type &&
    ['Ship', 'Station', 'Starport', 'Base', 'Patrol', 'Free Trader', 'Far Trader', 'System Defense Boat'].includes(c.type)
  ) || [];

  // Active hail status
  const activeHail = shipState.activeHail || null;
  const transponderStatus = shipState.transponder || 'ACTIVE';
  const radioStatus = shipState.radioStatus || 'STANDBY';

  // Unread message count
  const unreadCount = shipState.unreadMailCount || 0;

  return `
    <div class="detail-section comms-status">
      <h4>Communications Status</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Transponder:</span>
          <span class="stat-value ${transponderStatus === 'SILENT' ? 'text-warning' : 'text-success'}">${transponderStatus}</span>
        </div>
        <div class="stat-row">
          <span>Radio:</span>
          <span class="stat-value">${radioStatus}</span>
        </div>
        ${unreadCount > 0 ? `
        <div class="stat-row">
          <span>Unread Messages:</span>
          <span class="stat-value text-warning">${unreadCount}</span>
        </div>
        ` : ''}
      </div>
      ${activeHail ? `
      <div class="active-hail" style="margin-top: 8px; padding: 8px; background: rgba(40,167,69,0.15); border-radius: 4px;">
        <strong>Active Channel:</strong> ${escapeHtml(activeHail.target)}
        <button onclick="roleAction('endHail')" class="btn btn-small btn-secondary" style="margin-left: 8px;">End</button>
      </div>
      ` : ''}
    </div>

    <div class="detail-section comms-email">
      <h4>Ship Mail</h4>
      <div class="action-buttons">
        <button onclick="window.openEmailApp()" class="btn btn-small ${unreadCount > 0 ? 'btn-warning' : 'btn-primary'}"
                title="Open ship mail system">
          ${unreadCount > 0 ? `📬 Messages (${unreadCount})` : '📧 Open Mail'}
        </button>
      </div>
    </div>

    <div class="detail-section comms-hailing">
      <h4>Hailing</h4>
      ${hailableContacts.length > 0 ? `
        <div class="hail-contacts" style="margin-bottom: 8px;">
          <select id="hail-contact-select" class="hail-select" style="width: 100%;">
            ${hailableContacts.map(c => `
              <option value="${c.id}">${escapeHtml(c.transponder || c.name || 'Unknown')}</option>
            `).join('')}
          </select>
        </div>
        <div class="action-buttons" style="display: flex; gap: 6px;">
          <button onclick="window.hailSelectedContact()" class="btn btn-small btn-primary"
                  title="Open voice channel to selected contact">
            Hail
          </button>
          <button onclick="window.broadcastMessage()" class="btn btn-small btn-secondary"
                  title="Broadcast message on open frequencies">
            Broadcast
          </button>
        </div>
      ` : `
        <div class="placeholder">No contacts with active transponders</div>
      `}
    </div>

    <div class="detail-section comms-actions">
      <h4>Communications Actions</h4>
      <div class="action-buttons" style="display: flex; flex-wrap: wrap; gap: 6px;">
        <button onclick="roleAction('toggleTransponder')" class="btn btn-small ${transponderStatus === 'SILENT' ? 'btn-warning' : 'btn-secondary'}"
                title="Toggle ship transponder. Silent running hides identity but violates traffic regulations.">
          ${transponderStatus === 'SILENT' ? 'Enable Transponder' : 'Go Silent'}
        </button>
        <button onclick="roleAction('scanFrequencies')" class="btn btn-small"
                title="Scan local radio frequencies for chatter, distress signals, or encrypted comms.">
          Scan Frequencies
        </button>
        <button onclick="roleAction('requestDocking')" class="btn btn-small"
                title="Request docking clearance from starport or station.">
          Request Docking
        </button>
      </div>
    </div>

    <div class="detail-section comms-bridge-chat">
      <h4>Bridge Chat</h4>
      <div id="bridge-chat-log" class="chat-log" style="height: 150px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; margin-bottom: 8px; font-size: 12px;">
        <div class="chat-placeholder" style="color: #666; font-style: italic;">No messages yet...</div>
      </div>
      <div style="display: flex; gap: 6px;">
        <input type="text" id="bridge-chat-input" class="form-control" placeholder="Type message..."
               style="flex: 1; padding: 6px; background: rgba(255,255,255,0.1); border: 1px solid #444; border-radius: 4px; color: #fff;"
               onkeypress="if(event.key==='Enter') window.sendBridgeChatMessage()">
        <button onclick="window.sendBridgeChatMessage()" class="btn btn-small btn-primary">Send</button>
      </div>
    </div>
  `;
}

// ==================== AR-18 Phase 9: Steward Panel ====================

function getStewardPanel(shipState, template, crewOnline = []) {
  // Passenger manifest
  const passengers = shipState.passengers || [];
  const highPassengers = passengers.filter(p => p.class === 'high').length;
  const midPassengers = passengers.filter(p => p.class === 'middle').length;
  const lowPassengers = passengers.filter(p => p.class === 'low').length;

  // Cargo status
  const cargoUsed = shipState.cargoUsed || 0;
  const cargoCapacity = template.cargo || 0;

  // Life support
  const lifeSupport = shipState.lifeSupport || { status: 'NOMINAL', days: 30 };

  // Morale (crew satisfaction)
  const crewMorale = shipState.crewMorale || 'Good';
  const moraleColors = { 'Excellent': 'text-success', 'Good': '', 'Fair': 'text-warning', 'Poor': 'text-danger' };

  return `
    <div class="detail-section steward-passengers">
      <h4>Passenger Manifest</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>High Passage:</span>
          <span class="stat-value">${highPassengers}</span>
        </div>
        <div class="stat-row">
          <span>Middle Passage:</span>
          <span class="stat-value">${midPassengers}</span>
        </div>
        <div class="stat-row">
          <span>Low Berths:</span>
          <span class="stat-value">${lowPassengers}</span>
        </div>
        <div class="stat-row">
          <span>Total:</span>
          <span class="stat-value">${passengers.length}</span>
        </div>
      </div>
      ${passengers.length > 0 ? `
      <div class="passenger-list" style="margin-top: 8px; max-height: 100px; overflow-y: auto;">
        <ul style="margin: 0; padding-left: 16px; font-size: 0.85em;">
          ${passengers.slice(0, 5).map(p => `
            <li>${escapeHtml(p.name || 'Passenger')} (${p.class || 'standard'})</li>
          `).join('')}
          ${passengers.length > 5 ? `<li>...and ${passengers.length - 5} more</li>` : ''}
        </ul>
      </div>
      ` : ''}
    </div>

    <div class="detail-section steward-cargo">
      <h4>Cargo & Stores</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Cargo Hold:</span>
          <span class="stat-value ${cargoUsed >= cargoCapacity ? 'text-warning' : ''}">${cargoUsed}/${cargoCapacity} dT</span>
        </div>
        <div class="stat-row">
          <span>Life Support:</span>
          <span class="stat-value ${lifeSupport.days < 7 ? 'text-danger' : lifeSupport.days < 14 ? 'text-warning' : ''}">${lifeSupport.days} days</span>
        </div>
      </div>
    </div>

    <div class="detail-section steward-morale">
      <h4>Crew Welfare</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Crew Count:</span>
          <span class="stat-value">${crewOnline.length}</span>
        </div>
        <div class="stat-row">
          <span>Morale:</span>
          <span class="stat-value ${moraleColors[crewMorale] || ''}">${crewMorale}</span>
        </div>
      </div>
    </div>

    <div class="detail-section steward-actions">
      <h4>Steward Actions</h4>
      <div class="action-buttons" style="display: flex; flex-wrap: wrap; gap: 6px;">
        <button onclick="roleAction('servePassengers')" class="btn btn-small"
                title="Attend to passenger needs. Improves satisfaction, may generate tips or trade rumors.">
          Serve Passengers
        </button>
        <button onclick="roleAction('inventoryCheck')" class="btn btn-small"
                title="Review cargo manifest and consumables. Identifies shortages before they become critical.">
          Check Inventory
        </button>
        <button onclick="roleAction('boostMorale')" class="btn btn-small"
                title="Organize crew recreation. Costs some consumables but improves morale and reduces stress effects.">
          Boost Morale
        </button>
      </div>
    </div>
  `;
}

/**
 * AR-69/AR-128: Enhanced Observer Panel with role-watching capability
 * Observer can watch any other role's panel (read-only, buttons hidden)
 * @param {Object} shipState - Current ship state
 * @param {Object} template - Ship template data
 * @param {Object} campaign - Campaign data
 * @param {Object} jumpStatus - Jump status
 * @param {Array} contacts - Sensor contacts
 * @param {Object} context - Full context for watched role rendering
 * @returns {string} Panel HTML
 */
function getObserverPanel(shipState, template, campaign, jumpStatus = {}, contacts = [], context = {}) {
  // Get current watch role from global state (default: pilot)
  const watchRole = window.observerWatchRole || 'pilot';

  // Role selector dropdown
  const roleOptions = [
    { id: 'pilot', name: 'Pilot' },
    { id: 'astrogator', name: 'Astrogator' },
    { id: 'engineer', name: 'Engineer' },
    { id: 'sensor_operator', name: 'Sensors' },
    { id: 'captain', name: 'Captain' },
    { id: 'gunner', name: 'Gunner' },
    { id: 'comms', name: 'Comms' }
  ];

  const roleSelector = `
    <div class="detail-section observer-role-selector">
      <h4>Observing Role</h4>
      <select id="observer-watch-role" onchange="window.setObserverWatchRole(this.value)" style="width: 100%; padding: 8px; margin-bottom: 8px;">
        ${roleOptions.map(r => `<option value="${r.id}" ${watchRole === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
      </select>
    </div>
  `;

  // Try to render the watched role's panel
  let watchedPanel = '';
  try {
    watchedPanel = getWatchedRolePanel(watchRole, context);
  } catch (e) {
    // AR-128: Fallback to basic info on any error
    console.warn('Observer: Error rendering watched role panel:', e);
    watchedPanel = getBasicObserverInfo(shipState, template, campaign, jumpStatus, contacts);
  }

  return `
    ${roleSelector}
    <div class="observer-watched-panel" style="opacity: 0.9;">
      <div class="observer-watching-label" style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; font-size: 0.8em; color: var(--text-muted);">
        👁 Observing: ${roleOptions.find(r => r.id === watchRole)?.name || watchRole}
      </div>
      ${watchedPanel}
    </div>
    <div class="detail-section observer-note">
      <p style="color: #666; font-size: 0.75em; font-style: italic; margin: 8px 0 0 0;">
        Observer mode: View-only access. Select a crew role to take action.
      </p>
    </div>
  `;
}

/**
 * AR-128: Get watched role's panel with buttons completely hidden
 */
function getWatchedRolePanel(watchRole, context) {
  const { shipState = {}, template = {}, systemStatus = {}, damagedSystems = [],
          fuelStatus, jumpStatus = {}, campaign, contacts = [], crewOnline = [], ship,
          roleInstance = 1, shipWeapons = [], combatLog = [], environmentalData = null,
          repairQueue = [], rescueTargets = [], flightConditions = null } = context;

  let panelHtml = '';

  switch (watchRole) {
    case 'pilot':
      panelHtml = getPilotPanel(shipState, template, campaign, jumpStatus, flightConditions);
      break;
    case 'astrogator':
      panelHtml = getAstrogatorPanel(shipState, template, jumpStatus, campaign, systemStatus);
      break;
    case 'engineer':
      panelHtml = getEngineerPanel(shipState, template, systemStatus, damagedSystems, fuelStatus, repairQueue);
      break;
    case 'sensor_operator':
      panelHtml = getSensorOperatorPanel(shipState, contacts, environmentalData);
      break;
    case 'captain':
      panelHtml = getCaptainPanel(shipState, template, ship, crewOnline, contacts, rescueTargets);
      break;
    case 'gunner':
      panelHtml = getGunnerPanel(shipState, template, contacts, roleInstance, shipWeapons, combatLog);
      break;
    case 'comms':
      panelHtml = getCommsPanel(shipState, contacts, crewOnline);
      break;
    default:
      panelHtml = getPilotPanel(shipState, template, campaign, jumpStatus, flightConditions);
  }

  // AR-128: Strip all buttons and interactive elements completely (not gray)
  return stripInteractiveElements(panelHtml);
}

/**
 * AR-128: Remove buttons, selects, inputs from panel HTML
 */
function stripInteractiveElements(html) {
  return html
    // Remove button elements completely
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, '')
    // Remove input elements
    .replace(/<input[^>]*>/gi, '')
    // Remove select elements (but not their display text)
    .replace(/<select[^>]*>[\s\S]*?<\/select>/gi, '<span class="observer-disabled">[Select disabled]</span>')
    // Remove onclick handlers from remaining elements
    .replace(/\sonclick="[^"]*"/gi, '')
    .replace(/\sonchange="[^"]*"/gi, '');
}

/**
 * AR-128: Fallback basic observer info on error
 */
function getBasicObserverInfo(shipState, template, campaign, jumpStatus, contacts) {
  const currentSystem = campaign?.current_system || 'Unknown';
  const currentHex = campaign?.current_hex || '--';
  const fuel = shipState?.fuel ?? template?.fuel ?? 0;
  const fuelCapacity = template?.fuelCapacity || template?.fuel || 40;
  const hull = shipState?.hull ?? template?.hull ?? 0;
  const hullMax = template?.hull || 100;

  return `
    <div class="detail-section">
      <h4>Ship Status</h4>
      <div class="detail-stats">
        <div class="stat-row"><span>System:</span><span class="stat-value">${escapeHtml(currentSystem)} (${escapeHtml(currentHex)})</span></div>
        <div class="stat-row"><span>Hull:</span><span class="stat-value">${hull}/${hullMax}</span></div>
        <div class="stat-row"><span>Fuel:</span><span class="stat-value">${fuel}/${fuelCapacity} tons</span></div>
        ${jumpStatus?.inJump ? `<div class="stat-row"><span>In Jump:</span><span class="stat-value">${jumpStatus.destination}</span></div>` : ''}
      </div>
    </div>
    <div class="detail-section">
      <h4>Contacts (${contacts.length})</h4>
      ${contacts.length > 0 ? contacts.slice(0, 5).map(c => `<div>${escapeHtml(c.name || 'Unknown')}</div>`).join('') : '<p>No contacts</p>'}
    </div>
  `;
}
