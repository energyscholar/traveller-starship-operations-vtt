/**
 * GUI Renderers - Pure HTML Renderers for Role ViewModels
 *
 * Each renderer takes a ViewModel and returns an HTML string.
 * Renderers are PURE functions with NO side effects.
 * Uses data-action attributes for event binding (no inline handlers).
 *
 * @module public/operations-v2/adapters/gui-renderers
 */

// CSS class mappings for status
const STATUS_CLASSES = {
  'weapons-free': 'status-success',
  'weapons-hold': 'status-warning',
  'weapons-defensive': 'status-info',
  'all-clear': 'status-success',
  'threat-detected': 'status-danger',
  'unknown-contacts': 'status-warning',
  'nominal': 'status-success',
  'fuel-low': 'status-warning',
  'fuel-critical': 'status-danger',
  'power-overload': 'status-danger',
  'in-jump': 'status-info',
  'flight': 'status-success',
  'docked': 'status-info',
  'jump-ready': 'status-success',
  'standby': 'status-muted',
  'emergency': 'status-danger',
  'hull-critical': 'status-danger',
  'damage-present': 'status-warning',
  'alert-green': 'status-success',
  'alert-yellow': 'status-warning',
  'alert-red': 'status-danger',
  'observer-active': 'status-info',
  'on-call': 'status-success',
  'ready': 'status-success',
  'active': 'status-success'
};

/**
 * Escape HTML to prevent XSS
 * @param {string} str - Raw string
 * @returns {string} HTML-escaped string
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Create a progress bar HTML
 * @param {number} percent - Percentage (0-100)
 * @param {string} label - Optional label
 * @returns {string} Progress bar HTML
 */
function progressBar(percent, label = '') {
  const pct = Math.max(0, Math.min(100, percent));
  const colorClass = pct > 50 ? 'progress-success' : pct > 25 ? 'progress-warning' : 'progress-danger';
  return `<div class="progress-bar">
    <div class="progress-fill ${colorClass}" style="width: ${pct}%"></div>
    ${label ? `<span class="progress-label">${escapeHtml(label)}</span>` : ''}
  </div>`;
}

/**
 * Create an action button HTML
 * @param {string} action - Action identifier
 * @param {string} label - Button label
 * @param {object} actionState - { enabled, reason }
 * @returns {string} Button HTML
 */
function actionButton(action, label, actionState) {
  const disabled = !actionState.enabled;
  const title = disabled ? actionState.reason : '';
  return `<button class="btn btn-action" data-action="${escapeHtml(action)}" ${disabled ? 'disabled' : ''} ${title ? `title="${escapeHtml(title)}"` : ''}>
    ${escapeHtml(label)}
  </button>`;
}

/**
 * Create a key-value row HTML
 * @param {string} key - Label
 * @param {string} value - Value
 * @returns {string} Row HTML
 */
function kvRow(key, value) {
  return `<div class="kv-row">
    <span class="kv-key">${escapeHtml(key)}</span>
    <span class="kv-value">${escapeHtml(value)}</span>
  </div>`;
}

/**
 * Create a panel header HTML
 * @param {string} role - Role type
 * @param {string} statusBadge - Status text
 * @param {string} statusClass - Status class
 * @returns {string} Header HTML
 */
function panelHeader(role, statusBadge, statusClass) {
  const cssClass = STATUS_CLASSES[statusClass] || 'status-muted';
  const roleLabel = role.replace(/-/g, ' ').toUpperCase();
  return `<div class="panel-header">
    <h3 class="panel-title">${escapeHtml(roleLabel)}</h3>
    <span class="status-badge ${cssClass}">${escapeHtml(statusBadge)}</span>
  </div>`;
}

// ============================================
// ROLE RENDERERS
// ============================================

/**
 * Render Gunner panel
 * @param {object} vm - Gunner ViewModel
 * @returns {string} HTML string
 */
function renderGunner(vm) {
  const d = vm.derived;
  const data = vm.data;

  return `<div class="role-panel gunner-panel" data-role="gunner">
    ${panelHeader('gunner', d.statusBadge, d.statusClass)}
    <div class="panel-body">
      ${kvRow('Turret', d.turretText)}
      ${kvRow('Weapons', d.weaponCountText)}
      ${kvRow('Targets', d.targetCountText)}
      ${data.targeting?.selected ? `
        ${kvRow('Target', data.targeting.selected.name)}
        ${kvRow('Range', data.targeting.selected.rangeBand || '--')}
        ${kvRow('Hit Chance', d.hitChanceText)}
        ${kvRow('Range DM', d.rangeDMText)}
      ` : ''}
    </div>
    <div class="panel-actions">
      ${actionButton('fire', 'Fire', vm.actions.fire)}
      ${actionButton('selectTarget', 'Select Target', vm.actions.selectTarget)}
    </div>
  </div>`;
}

/**
 * Render Pilot panel
 * @param {object} vm - Pilot ViewModel
 * @returns {string} HTML string
 */
function renderPilot(vm) {
  const d = vm.derived;
  const data = vm.data;

  return `<div class="role-panel pilot-panel" data-role="pilot">
    ${panelHeader('pilot', d.statusBadge, d.statusClass)}
    <div class="panel-body">
      ${kvRow('Location', d.locationText)}
      ${kvRow('Destination', d.destinationText)}
      ${kvRow('Thrust', d.thrustText)}
      ${kvRow('Heading', d.headingText)}
      ${data.jump?.inJump ? kvRow('Jump Time', d.jumpTimeText) : ''}
    </div>
    <div class="panel-actions">
      ${actionButton('setDestination', 'Set Destination', vm.actions.setDestination)}
      ${actionButton('evasiveManeuvers', 'Evasive', vm.actions.evasiveManeuvers)}
    </div>
  </div>`;
}

/**
 * Render Sensors panel
 * @param {object} vm - Sensors ViewModel
 * @returns {string} HTML string
 */
function renderSensors(vm) {
  const d = vm.derived;

  return `<div class="role-panel sensors-panel" data-role="sensors">
    ${panelHeader('sensors', d.statusBadge, d.statusClass)}
    <div class="panel-body">
      ${kvRow('Contacts', d.contactCountText)}
      ${kvRow('Ships', d.shipsText)}
      ${kvRow('Stations', d.stationsText)}
      ${kvRow('Threats', d.threatCountText)}
      ${kvRow('Lock', d.lockStatusText)}
    </div>
    <div class="panel-actions">
      ${actionButton('scan', 'Scan', vm.actions.scan)}
      ${actionButton('lock', 'Lock', vm.actions.lock)}
      ${actionButton('unlock', 'Unlock', vm.actions.unlock)}
    </div>
  </div>`;
}

/**
 * Render Engineer panel
 * @param {object} vm - Engineer ViewModel
 * @returns {string} HTML string
 */
function renderEngineer(vm) {
  const d = vm.derived;
  const data = vm.data;
  const fuelPct = data.fuel?.percentFull || 0;
  const powerPct = data.power?.percentUsed || 0;

  return `<div class="role-panel engineer-panel" data-role="engineer">
    ${panelHeader('engineer', d.statusBadge, d.statusClass)}
    <div class="panel-body">
      <div class="meter-row">
        <span class="meter-label">Fuel</span>
        ${progressBar(fuelPct, d.fuelText)}
      </div>
      <div class="meter-row">
        <span class="meter-label">Power</span>
        ${progressBar(100 - powerPct, d.powerPercentText)}
      </div>
      ${kvRow('Damaged', d.damagedCountText)}
      ${kvRow('Repairs', d.repairQueueText)}
      ${kvRow('Can Jump', d.canJumpText)}
    </div>
    <div class="panel-actions">
      ${actionButton('adjustPower', 'Power', vm.actions.adjustPower)}
      ${actionButton('repair', 'Repair', vm.actions.repair)}
      ${actionButton('processFuel', 'Process Fuel', vm.actions.processFuel)}
    </div>
  </div>`;
}

/**
 * Render Captain panel
 * @param {object} vm - Captain ViewModel
 * @returns {string} HTML string
 */
function renderCaptain(vm) {
  const d = vm.derived;

  return `<div class="role-panel captain-panel" data-role="captain">
    ${panelHeader('captain', d.statusBadge, d.statusClass)}
    <div class="panel-body">
      ${kvRow('Ship', d.shipNameText)}
      ${kvRow('Class', d.shipClassText)}
      ${kvRow('Crew', d.crewCountText)}
      ${kvRow('Alert', d.alertText)}
      ${kvRow('Contacts', d.contactSummaryText)}
      ${kvRow('Hostile', d.hostileSummaryText)}
    </div>
    <div class="panel-actions">
      ${actionButton('setAlert', 'Alert', vm.actions.setAlert)}
      ${actionButton('issueOrder', 'Order', vm.actions.issueOrder)}
      ${actionButton('relieveCrew', 'Relieve', vm.actions.relieveCrew)}
    </div>
  </div>`;
}

/**
 * Render Damage Control panel
 * @param {object} vm - Damage Control ViewModel
 * @returns {string} HTML string
 */
function renderDamageControl(vm) {
  const d = vm.derived;
  const data = vm.data;
  const hullPct = data.hull?.percent || 100;

  return `<div class="role-panel damage-control-panel" data-role="damage-control">
    ${panelHeader('damage-control', d.statusBadge, d.statusClass)}
    <div class="panel-body">
      <div class="meter-row">
        <span class="meter-label">Hull</span>
        ${progressBar(hullPct, d.hullText)}
      </div>
      ${kvRow('Systems', d.damageCountText)}
      ${kvRow('Fires', d.fireCountText)}
      ${kvRow('Breaches', d.breachCountText)}
    </div>
    <div class="panel-actions">
      ${actionButton('repairHull', 'Repair Hull', vm.actions.repairHull)}
      ${actionButton('repairSystem', 'Repair Sys', vm.actions.repairSystem)}
      ${actionButton('firefighting', 'Firefight', vm.actions.firefighting)}
      ${actionButton('sealBreach', 'Seal', vm.actions.sealBreach)}
    </div>
  </div>`;
}

/**
 * Render Astrogator panel
 * @param {object} vm - Astrogator ViewModel
 * @returns {string} HTML string
 */
function renderAstrogator(vm) {
  const d = vm.derived;

  return `<div class="role-panel astrogator-panel" data-role="astrogator">
    ${panelHeader('astrogator', d.statusBadge, d.statusClass)}
    <div class="panel-body">
      ${kvRow('Jump Rating', d.jumpRatingText)}
      ${kvRow('Range', d.jumpRangeText)}
      ${kvRow('Current', d.currentSystemText)}
      ${kvRow('Destination', d.destinationText)}
      ${kvRow('Fuel Req', d.fuelRequiredText)}
      ${kvRow('Fuel Avail', d.fuelAvailableText)}
      ${kvRow('Status', d.canJumpText)}
    </div>
    <div class="panel-actions">
      ${actionButton('plotJump', 'Plot Jump', vm.actions.plotJump)}
      ${actionButton('initiateJump', 'Initiate', vm.actions.initiateJump)}
      ${actionButton('cancelJump', 'Cancel', vm.actions.cancelJump)}
    </div>
  </div>`;
}

/**
 * Render Observer panel
 * @param {object} vm - Observer ViewModel
 * @returns {string} HTML string
 */
function renderObserver(vm) {
  const d = vm.derived;

  return `<div class="role-panel observer-panel" data-role="observer">
    ${panelHeader('observer', d.statusBadge, d.statusClass)}
    <div class="panel-body">
      ${kvRow('Watching', d.watchRoleFormatted)}
      ${kvRow('Last Update', d.lastUpdateText)}
    </div>
    <div class="panel-actions">
      ${actionButton('switchRole', 'Switch Role', vm.actions.switchRole)}
    </div>
  </div>`;
}

/**
 * Render Comms panel
 * @param {object} vm - Comms ViewModel
 * @returns {string} HTML string
 */
function renderComms(vm) {
  const d = vm.derived;

  return `<div class="role-panel comms-panel" data-role="comms">
    ${panelHeader('comms', d.statusBadge, d.statusClass)}
    <div class="panel-body">
      ${kvRow('Channel', d.channelText)}
      ${kvRow('Messages', d.messageCountText)}
    </div>
    <div class="panel-actions">
      ${actionButton('hail', 'Hail', vm.actions.hail)}
      ${actionButton('broadcast', 'Broadcast', vm.actions.broadcast)}
    </div>
  </div>`;
}

/**
 * Render Medic panel
 * @param {object} vm - Medic ViewModel
 * @returns {string} HTML string
 */
function renderMedic(vm) {
  const d = vm.derived;

  return `<div class="role-panel medic-panel" data-role="medic">
    ${panelHeader('medic', d.statusBadge, d.statusClass)}
    <div class="panel-body">
      ${kvRow('Patients', d.patientCountText)}
      ${kvRow('Supplies', d.suppliesText)}
    </div>
    <div class="panel-actions">
      ${actionButton('treatPatient', 'Treat', vm.actions.treatPatient)}
      ${actionButton('checkSupplies', 'Supplies', vm.actions.checkSupplies)}
    </div>
  </div>`;
}

/**
 * Render Marines panel
 * @param {object} vm - Marines ViewModel
 * @returns {string} HTML string
 */
function renderMarines(vm) {
  const d = vm.derived;

  return `<div class="role-panel marines-panel" data-role="marines">
    ${panelHeader('marines', d.statusBadge, d.statusClass)}
    <div class="panel-body">
      ${kvRow('Squad', d.squadStatusText)}
      ${kvRow('Armor', d.armorText)}
    </div>
    <div class="panel-actions">
      ${actionButton('deploy', 'Deploy', vm.actions.deploy)}
      ${actionButton('drill', 'Drill', vm.actions.drill)}
    </div>
  </div>`;
}

/**
 * Render Steward panel
 * @param {object} vm - Steward ViewModel
 * @returns {string} HTML string
 */
function renderSteward(vm) {
  const d = vm.derived;

  return `<div class="role-panel steward-panel" data-role="steward">
    ${panelHeader('steward', d.statusBadge, d.statusClass)}
    <div class="panel-body">
      ${kvRow('Passengers', d.passengerCountText)}
      ${kvRow('Supplies', d.suppliesText)}
    </div>
    <div class="panel-actions">
      ${actionButton('servePassengers', 'Serve', vm.actions.servePassengers)}
      ${actionButton('checkInventory', 'Inventory', vm.actions.checkInventory)}
    </div>
  </div>`;
}

// Renderer registry (internal - use roleRenderers to avoid global scope conflict)
const roleRenderers = {
  gunner: renderGunner,
  pilot: renderPilot,
  sensors: renderSensors,
  engineer: renderEngineer,
  captain: renderCaptain,
  'damage-control': renderDamageControl,
  astrogator: renderAstrogator,
  observer: renderObserver,
  comms: renderComms,
  medic: renderMedic,
  marines: renderMarines,
  steward: renderSteward
};

/**
 * Render any role ViewModel by type
 * @param {object} vm - Any role ViewModel
 * @returns {string} HTML string
 */
function renderRole(vm) {
  const renderer = roleRenderers[vm.type];
  if (!renderer) {
    return `<div class="error-panel">Unknown role: ${escapeHtml(vm.type)}</div>`;
  }
  return renderer(vm);
}

// ============================================
// SCREEN RENDERERS
// ============================================

/**
 * Render campaign list item
 * @param {object} campaign - Campaign data
 * @returns {string} HTML string
 */
function renderCampaignItem(campaign) {
  return `<div class="campaign-item" data-campaign-id="${escapeHtml(campaign.id)}">
    <div class="campaign-name">${escapeHtml(campaign.name)}</div>
    <div class="campaign-info">
      <span class="campaign-ship">${escapeHtml(campaign.shipName || 'No ship')}</span>
      <span class="campaign-code">${escapeHtml(campaign.code || '')}</span>
    </div>
    <button class="btn btn-select" data-action="selectCampaign" data-campaign-id="${escapeHtml(campaign.id)}">Select</button>
  </div>`;
}

/**
 * Render player slot item
 * @param {object} slot - Slot data
 * @returns {string} HTML string
 */
function renderPlayerSlot(slot) {
  const taken = slot.taken || slot.connected;
  const actionAttr = !taken ? `data-action="selectSlot"` : '';
  return `<div class="player-slot ${taken ? 'taken' : 'available'}" ${actionAttr} data-slot-id="${escapeHtml(slot.id)}">
    <div class="slot-name">${escapeHtml(slot.name || 'Player ' + slot.id)}</div>
    <div class="slot-role">${escapeHtml(slot.role || 'No role')}</div>
    ${!taken ? `<button class="btn btn-join" data-action="selectSlot" data-slot-id="${escapeHtml(slot.id)}">Join</button>` : '<span class="slot-taken">Taken</span>'}
  </div>`;
}

/**
 * Render crew member for bridge
 * @param {object} crew - Crew member data
 * @returns {string} HTML string
 */
function renderCrewMember(crew) {
  return `<div class="crew-member ${crew.isNPC ? 'npc' : ''} ${crew.isYou ? 'is-you' : ''}">
    <span class="crew-name">${escapeHtml(crew.name)}</span>
    <span class="crew-role">${escapeHtml(crew.role)}</span>
    ${crew.hasRelieveBtn ? `<button class="btn-relieve" data-action="relieveCrew" data-crew-id="${escapeHtml(crew.id)}">Relieve</button>` : ''}
  </div>`;
}

/**
 * Render contact item for sensors
 * @param {object} contact - Contact data
 * @returns {string} HTML string
 */
function renderContactItem(contact) {
  const markingClass = contact.marking === 'hostile' ? 'contact-hostile' :
                       contact.marking === 'friendly' ? 'contact-friendly' : 'contact-unknown';
  return `<div class="contact-item ${markingClass}" data-contact-id="${escapeHtml(contact.id)}">
    <span class="contact-designation">${escapeHtml(contact.designation || contact.name)}</span>
    <span class="contact-range">${escapeHtml(contact.rangeBand || contact.range_band || '--')}</span>
    <span class="contact-marking">${escapeHtml(contact.marking || 'unknown')}</span>
  </div>`;
}

// Export for Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderers: roleRenderers,
    renderRole,
    renderGunner,
    renderPilot,
    renderSensors,
    renderEngineer,
    renderCaptain,
    renderDamageControl,
    renderAstrogator,
    renderObserver,
    renderComms,
    renderMedic,
    renderMarines,
    renderSteward,
    renderCampaignItem,
    renderPlayerSlot,
    renderCrewMember,
    renderContactItem,
    // Helpers
    escapeHtml,
    progressBar,
    actionButton,
    kvRow,
    panelHeader,
    STATUS_CLASSES
  };
}

// Export for browser (always set window.renderers if in browser)
if (typeof window !== 'undefined') {
  window.renderers = {
    renderRole,
    renderGunner,
    renderPilot,
    renderSensors,
    renderEngineer,
    renderCaptain,
    renderDamageControl,
    renderAstrogator,
    renderObserver,
    renderComms,
    renderMedic,
    renderMarines,
    renderSteward,
    renderCampaignItem,
    renderPlayerSlot,
    renderCrewMember,
    renderContactItem,
    escapeHtml,
    progressBar,
    actionButton,
    kvRow,
    panelHeader,
    STATUS_CLASSES
  };
}
