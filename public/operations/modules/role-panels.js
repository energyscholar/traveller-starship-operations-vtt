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
          fuelStatus, jumpStatus = {}, campaign, contacts = [], crewOnline = [], ship,
          roleInstance = 1, shipWeapons = [], combatLog = [] } = context;

  switch (role) {
    case 'pilot':
      return getPilotPanel(shipState, template, campaign, jumpStatus);

    case 'engineer':
      return getEngineerPanel(shipState, template, systemStatus, damagedSystems, fuelStatus);

    case 'gunner':
      return getGunnerPanel(shipState, template, contacts, roleInstance, shipWeapons, combatLog);

    case 'captain':
      return getCaptainPanel(shipState, template, ship, crewOnline, contacts);

    case 'sensor_operator':
      return getSensorOperatorPanel(shipState, contacts);

    case 'astrogator':
      return getAstrogatorPanel(shipState, template, jumpStatus, campaign, systemStatus);

    case 'damage_control':
      return getDamageControlPanel(shipState, template, systemStatus, damagedSystems);

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

function getPilotPanel(shipState, template, campaign, jumpStatus = {}) {
  const hasDestination = shipState.destination || campaign?.destination;
  const destination = shipState.destination || campaign?.destination || 'None set';
  const eta = shipState.eta || campaign?.eta || null;
  const evasive = shipState.evasive || false;
  const contacts = campaign?.sensorContacts || [];
  const inJump = jumpStatus?.inJump || false;

  return `
    <div class="detail-section">
      <h4>Helm Control</h4>
      <div class="detail-stats">
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
      </div>
      ${inJump && jumpStatus.canExit ? `
      <button onclick="completeJump()" class="btn btn-primary btn-exit-jump" title="Exit jump space at destination">Exit Jump</button>
      ` : ''}
    </div>
  `;
}

function getEngineerPanel(shipState, template, systemStatus, damagedSystems, fuelStatus) {
  // Power allocation state
  const power = shipState.power || { mDrive: 75, weapons: 75, sensors: 75, lifeSupport: 75, computer: 75 };
  const powerEffects = shipState.powerEffects || { weaponsDM: 0, sensorsDM: 0, thrustMultiplier: 1.0 };

  const fs = fuelStatus || {
    total: shipState.fuel ?? template.fuel ?? 40,
    max: template.fuel || 40,
    breakdown: { refined: shipState.fuel ?? template.fuel ?? 40, unrefined: 0, processed: 0 },
    percentFull: 100,
    processing: null,
    fuelProcessor: template.fuelProcessor || false
  };
  const fuelBreakdown = fs.breakdown || { refined: fs.total, unrefined: 0, processed: 0 };

  // Power effect warnings
  const warnings = [];
  if (powerEffects.weaponsDM < 0) warnings.push(`Weapons: ${powerEffects.weaponsDM} DM`);
  if (powerEffects.sensorsDM < 0) warnings.push(`Sensors: ${powerEffects.sensorsDM} DM`);
  if (powerEffects.thrustMultiplier < 1) warnings.push(`Thrust: ${Math.round(powerEffects.thrustMultiplier * 100)}%`);

  return `
    <div class="detail-section power-section">
      <h4>Power Allocation</h4>
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
        <button onclick="attemptRepair()" class="btn btn-small" title="Roll Engineer check (8+) to repair selected system. DM penalty equals damage severity.">Attempt Repair</button>
      </div>
      <div class="repair-info">
        <small>Engineer check (8+) with DM = -Severity</small>
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
      ${fuelBreakdown.unrefined > 0 ? `
      <div class="fuel-warning">
        <span class="warning-icon">!</span>
        Unrefined fuel: -2 DM to jump checks, 5% misjump risk
      </div>
      ` : ''}
      <div class="fuel-actions">
        <button onclick="openRefuelModal()" class="btn btn-small" title="Refuel ship from starport, gas giant, or water source">Refuel</button>
        ${fs.fuelProcessor && fuelBreakdown.unrefined > 0 ? `
        <button onclick="openProcessFuelModal()" class="btn btn-small" title="Process unrefined fuel to remove misjump risk (takes time)">Process Fuel</button>
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

function getGunnerPanel(shipState, template, contacts, roleInstance = 1, shipWeapons = [], combatLog = []) {
  // Use ship_weapons from database if available, else fall back to template
  const weapons = shipWeapons.length > 0 ? shipWeapons : (template.weapons || []);
  const ammo = shipState.ammo || {};

  // Determine turret assignment based on roleInstance
  const turretCount = weapons.filter(w => w.mount === 'turret' || w.type === 'turret' || !w.mount).length;
  const assignedTurret = roleInstance <= turretCount ? roleInstance : null;
  const turretWeapons = assignedTurret ? weapons.filter((w, i) => i === assignedTurret - 1) : weapons;

  // Filter to authorized/hostile targets
  const hostileContacts = contacts?.filter(c =>
    c.is_targetable && (c.weapons_free || c.disposition === 'hostile')
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
      <h4>Weapons Authorization</h4>
      <div class="weapons-auth-controls" style="display: flex; gap: 8px; margin-top: 8px;">
        <button onclick="window.captainWeaponsAuth('hold')"
                class="btn btn-small ${!weaponsFree ? 'btn-warning active' : 'btn-secondary'}"
                title="Secure weapons - no firing without direct order">
          HOLD
        </button>
        <button onclick="window.captainWeaponsAuth('free')"
                class="btn btn-small ${weaponsFree ? 'btn-danger active' : 'btn-secondary'}"
                title="Authorize weapons - engage hostile targets">
          FREE
        </button>
      </div>
      <small class="auth-hint" style="color: var(--text-muted); margin-top: 4px; display: block;">
        ${weaponsFree ? 'Engage hostile targets at will' : 'Awaiting weapons free authorization'}
      </small>
    </div>

    <div class="detail-section target-section">
      <h4>TARGET</h4>
      ${!hasTargets ? `
        <div class="no-target-locked">
          <div class="locked-icon">○</div>
          <div class="no-target-text">No Target Locked</div>
          <small>Awaiting hostile contacts or authorization</small>
        </div>
      ` : `
        <div class="target-list">
          ${hostileContacts.map(c => {
            const targetHitChance = selectedWeapon ? calculateHitProbability(selectedWeapon, c, gunnerySkill) : null;
            return `
            <div class="target-item ${c.id === selectedTargetId ? 'selected' : ''}"
                 onclick="lockTarget('${c.id}')" data-contact-id="${c.id}"
                 title="Click to lock target${targetHitChance ? ` - ${targetHitChance}% hit chance` : ''}">
              <div class="target-header">
                <span class="target-indicator">${c.id === selectedTargetId ? '◉' : '○'}</span>
                <span class="target-name">${escapeHtml(c.name || 'Unknown')}</span>
                <span class="target-disposition ${c.disposition || 'unknown'}">${c.disposition || '?'}</span>
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
      ${hitChance !== null && hasTargets ? `
      <div class="hit-probability-display" title="Calculated from: 2D6 + Gunnery ${gunnerySkill >= 0 ? '+' : ''}${gunnerySkill} + Range DM ${formatRangeDM(getRangeDM(selectedTarget?.range_band))} >= 8">
        <span class="hit-label">Hit Chance:</span>
        <span class="hit-value ${hitChance >= 70 ? 'hit-high' : hitChance >= 40 ? 'hit-medium' : 'hit-low'}">${hitChance}%</span>
        <span class="hit-breakdown">(2D6 + ${gunnerySkill} ${formatRangeDM(getRangeDM(selectedTarget?.range_band))} >= 8)</span>
      </div>
      ` : ''}
      <div class="fire-buttons">
        <button onclick="fireWeapon()" class="btn btn-danger btn-fire"
                title="${hasTargets ? `Fire ${selectedWeapon?.name || 'weapon'} at ${selectedTarget?.name || 'target'}${hitChance ? ` (${hitChance}% hit chance)` : ''}` : 'No target locked - awaiting hostile contacts or authorization'}"
                ${!hasTargets || !hasWeapons ? 'disabled' : ''}>
          ${selectedWeapon && (selectedWeapon.weapon_type || selectedWeapon.type || '').toLowerCase().includes('missile') ? 'LAUNCH!' : 'FIRE!'}
        </button>
        <button onclick="togglePointDefense()" class="btn btn-warning btn-point-defense"
                title="Point Defense: Automatically intercept incoming missiles. Uses ammo each round."
                ${!hasWeapons ? 'disabled' : ''}>
          Point Defense
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

function getCaptainPanel(shipState, template, ship, crewOnline, contacts) {
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

  return `
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

function getSensorOperatorPanel(shipState, contacts) {
  // Categorize contacts for display
  const celestials = contacts?.filter(c => c.celestial) || [];
  const stations = contacts?.filter(c => !c.celestial && c.type && ['Station', 'Starport', 'Base'].includes(c.type)) || [];
  const ships = contacts?.filter(c => !c.celestial && c.type && ['Ship', 'Patrol'].includes(c.type)) || [];
  const unknowns = contacts?.filter(c => !c.celestial && (!c.type || c.type === 'unknown')) || [];

  // Scan level labels
  const scanLevelLabels = ['Unknown', 'Passive', 'Active', 'Deep'];

  // Render a single contact with detection-based fog of war
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

  return `
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
    <div class="detail-section sensor-contacts-section">
      <h4>Contacts (${contacts?.length || 0})</h4>
      <div class="sensor-contacts-list">
        ${ships.length > 0 ? `
          <div class="contact-category">
            <div class="category-header">Ships (${ships.length})</div>
            ${ships.map(renderContact).join('')}
          </div>
        ` : ''}
        ${stations.length > 0 ? `
          <div class="contact-category">
            <div class="category-header">Stations (${stations.length})</div>
            ${stations.map(renderContact).join('')}
          </div>
        ` : ''}
        ${unknowns.length > 0 ? `
          <div class="contact-category">
            <div class="category-header">Unidentified (${unknowns.length})</div>
            ${unknowns.map(renderContact).join('')}
          </div>
        ` : ''}
        ${celestials.length > 0 ? `
          <div class="contact-category">
            <div class="category-header">Celestial (${celestials.length})</div>
            ${celestials.map(c => `
              <div class="sensor-contact celestial">
                <span class="contact-designator">${escapeHtml(c.name || 'Body')}</span>
                <span class="contact-type">${c.type || 'Planet'}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${(!contacts || contacts.length === 0) ? '<div class="placeholder">No contacts detected</div>' : ''}
      </div>
    </div>
    <div id="scan-result-display" class="scan-result-display" style="display: none;">
      <!-- Populated by scan results -->
    </div>
    <div class="detail-section">
      <h4>EW Status</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Jamming:</span>
          <span class="stat-value">${shipState.jamming ? 'Active' : 'Inactive'}</span>
        </div>
        <div class="stat-row">
          <span>Stealth:</span>
          <span class="stat-value">${shipState.stealth ? 'Active' : 'Off'}</span>
        </div>
      </div>
    </div>
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
          <option value="terminal">Terminal</option>
          <option value="poster">Poster</option>
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
        ${renderSystemStatusItem('M-Drive', systemStatus.mDrive)}
        ${renderSystemStatusItem('Power Plant', systemStatus.powerPlant)}
        ${renderSystemStatusItem('J-Drive', systemStatus.jDrive)}
        ${renderSystemStatusItem('Sensors', systemStatus.sensors)}
        ${renderSystemStatusItem('Computer', systemStatus.computer)}
        ${renderSystemStatusItem('Armour', systemStatus.armour)}
        ${renderSystemStatusItem('Weapons', systemStatus.weapon)}
        ${renderSystemStatusItem('Hull', systemStatus.hull)}
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
