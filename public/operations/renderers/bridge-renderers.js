/**
 * AR-201 Phase 4: Bridge Renderers
 *
 * Render functions for bridge screen display.
 */

// State and helpers will be injected
let state = null;
let helpers = null;

/**
 * Initialize renderer with state and helpers
 */
export function initBridgeRenderers(appState, appHelpers) {
  state = appState;
  helpers = appHelpers;
}

/**
 * Main bridge render function
 */
export function renderBridge() {
  const {
    updateMapContacts, startBridgeClock, formatRoleName, getRoleConfig,
    renderObserverPanel, renderRoleActions, updateRoleQuirkDisplay,
    renderCrewList, renderContacts, renderShipLog, applyStatusIndicators
  } = helpers;

  // AR-71: Sync contacts to system map for rendering
  if (state.contacts) {
    updateMapContacts(state.contacts);
  }

  // Ship name
  const shipNameEl = document.getElementById('bridge-ship-name');
  shipNameEl.textContent = state.ship?.name || 'Unknown Ship';
  // AR-103.4: Ship type + campaign as tooltip on ship name
  const shipType = state.shipTemplate?.name || state.ship?.template_id?.replace(/_/g, ' ') || '';
  const campaignName = state.campaign?.name ? `Campaign: ${state.campaign.name}` : '';
  const tooltipParts = [shipType, campaignName].filter(Boolean);
  shipNameEl.title = tooltipParts.join(' | ');

  // AR-51.2: Update screen label with role
  const screenLabel = document.getElementById('bridge-screen-label');
  if (screenLabel) {
    const roleDisplay = state.isGM ? 'GM' : (state.selectedRole || 'Crew');
    const roleName = roleDisplay.charAt(0).toUpperCase() + roleDisplay.slice(1).replace(/_/g, ' ');
    screenLabel.textContent = `Bridge · ${roleName}`;
  }

  // Campaign name (AR-92: now hidden, shown as tooltip on ship name)
  const campaignNameEl = document.getElementById('bridge-campaign-name');
  if (campaignNameEl) {
    campaignNameEl.textContent = state.campaign?.name || '';
  }

  // Date/time - start the ticking clock
  startBridgeClock(state.campaign?.current_date || '1115-001 00:00');

  // AR-168: Full location display (system + ship position) - moved from status panel
  const locationEl = document.getElementById('bridge-location');
  if (locationEl) {
    const shipLocation = state.shipState?.locationName || state.ship?.current_state?.locationName;
    const systemName = state.campaign?.current_system || 'Unknown';
    let locationDisplay;
    if (shipLocation && !shipLocation.includes(systemName)) {
      locationDisplay = `${systemName} · ${shipLocation}`;
    } else if (shipLocation) {
      locationDisplay = shipLocation;
    } else {
      locationDisplay = systemName;
    }
    locationEl.textContent = locationDisplay;
  }

  // AR-103: Hex coordinate display with system name tooltip
  const hexEl = document.getElementById('bridge-hex');
  if (hexEl) {
    hexEl.textContent = state.campaign?.current_hex || '----';
    hexEl.title = state.campaign?.current_system || 'Current parsec';
  }

  // Guest indicator with skill level
  const guestIndicator = document.getElementById('guest-indicator');
  if (guestIndicator) {
    if (state.isGuest) {
      guestIndicator.classList.remove('hidden');
      const badge = guestIndicator.querySelector('.guest-badge');
      if (badge) {
        badge.textContent = `GUEST (Skill ${state.guestSkill || 0})`;
      }
    } else {
      guestIndicator.classList.add('hidden');
    }
  }

  // User identity display (Name, Role, Ship)
  const userNameEl = document.getElementById('bridge-user-name');
  const userRoleEl = document.getElementById('bridge-user-role');
  const userShipEl = document.getElementById('bridge-user-ship');
  if (userNameEl && userRoleEl) {
    if (state.isGM) {
      userNameEl.textContent = 'GM';
      userRoleEl.textContent = 'Game Master';
      userRoleEl.className = 'user-role-badge role-gm';
    } else {
      userNameEl.textContent = state.player?.character_data?.name || state.player?.slot_name || 'Player';
      userRoleEl.textContent = formatRoleName(state.selectedRole);
      userRoleEl.className = `user-role-badge role-${state.selectedRole || 'unknown'}`;
    }
  }
  // AR-103.2: Hide change role button for GM (GMs cannot change roles)
  const changeRoleBtn = document.getElementById('btn-change-role');
  if (changeRoleBtn) {
    changeRoleBtn.style.display = state.isGM ? 'none' : '';
  }
  if (userShipEl) {
    userShipEl.textContent = state.ship?.name || 'No Ship';
  }

  // Ship status bar
  renderShipStatus();

  // Role panel - observers get ASCII art instead
  const roleConfig = getRoleConfig(state.selectedRole);
  const isObserver = state.selectedRole === 'observer';

  if (isObserver) {
    // Show observer view with ship ASCII art
    document.getElementById('role-panel-title').textContent = 'Observer';
    document.getElementById('role-name').textContent = 'Spectator View';
    document.getElementById('btn-edit-role-personality').style.display = 'none';
    renderObserverPanel();
  } else {
    document.getElementById('role-panel-title').textContent = roleConfig.name;
    // Use custom title if set, otherwise use formatted role name
    const displayName = state.player?.role_title || formatRoleName(state.selectedRole);
    document.getElementById('role-name').textContent = displayName;
    document.getElementById('btn-edit-role-personality').style.display = '';
    // Render role actions
    renderRoleActions(roleConfig);
  }

  // Stage 2: Update quirk display
  updateRoleQuirkDisplay();

  // Render crew list
  renderCrewList();

  // Render contacts
  renderContacts();

  // Render ship log (still in app.js)
  helpers.renderShipLog();

  // Show GM overlay if GM
  if (state.isGM) {
    document.getElementById('gm-overlay').classList.remove('hidden');
    // Show prep panel toggle button for GM (AUTORUN-8)
    const prepToggle = document.getElementById('btn-toggle-prep-panel');
    if (prepToggle) {
      prepToggle.classList.remove('hidden');
    }
  } else {
    // Hide prep panel elements for non-GM
    const prepToggle = document.getElementById('btn-toggle-prep-panel');
    const prepPanel = document.getElementById('gm-prep-panel');
    if (prepToggle) prepToggle.classList.add('hidden');
    if (prepPanel) prepPanel.classList.add('hidden');
  }
}

/**
 * Render ship status bars (hull, fuel, power)
 */
export function renderShipStatus() {
  const shipState = state.ship?.current_state || {};
  const template = state.ship?.template_data || {};

  // Hull
  const maxHull = template.hull || 100;
  const currentHull = shipState.hull ?? maxHull;
  const hullPercent = Math.round((currentHull / maxHull) * 100);
  const hullBar = document.getElementById('hull-bar');
  hullBar.style.width = `${hullPercent}%`;
  // AR-15.9: Dynamic gradient position (100% = green, 0% = red)
  hullBar.style.backgroundPosition = `${hullPercent}% 0`;
  document.getElementById('hull-value').textContent = `${hullPercent}%`;

  // Fuel
  const maxFuel = template.fuel || 40;
  const currentFuel = shipState.fuel ?? maxFuel;
  const fuelPercent = Math.round((currentFuel / maxFuel) * 100);
  document.getElementById('fuel-bar').style.width = `${fuelPercent}%`;
  document.getElementById('fuel-value').textContent = `${currentFuel}/${maxFuel}`;

  // Power - AR-15.9: Dynamic gradient (green→yellow→red as power decreases)
  const powerPercent = shipState.powerPercent ?? 100;
  const powerBar = document.getElementById('power-bar');
  powerBar.style.width = `${powerPercent}%`;
  powerBar.style.backgroundPosition = `${powerPercent}% 0`;
  document.getElementById('power-value').textContent = `${powerPercent}%`;
}

/**
 * Render role action buttons
 */
export function renderRoleActions(roleConfig) {
  const { formatActionName, handleRoleAction, renderRoleDetailPanel, initJumpMapIfNeeded } = helpers;
  const container = document.getElementById('role-actions');
  container.innerHTML = (roleConfig.actions || []).map(action => `
    <button class="btn" data-action="${action}">${formatActionName(action)}</button>
  `).join('');

  // Add action handlers
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      handleRoleAction(btn.dataset.action);
    });
  });

  // Render role-specific detail panel
  renderRoleDetailPanel(state.selectedRole);

  // Stage 6: Initialize jump map if astrogator
  initJumpMapIfNeeded();
}

/**
 * Render observer panel with ship ASCII art
 */
export function renderObserverPanel() {
  const { getShipAsciiArt, escapeHtml } = helpers;
  // Clear role actions for observers
  const actionsContainer = document.getElementById('role-actions');
  actionsContainer.innerHTML = '';

  // Get ship type for ASCII art
  const shipType = state.ship?.template_data?.type || state.ship?.type || 'unknown';
  const shipName = state.ship?.name || 'Unknown Ship';
  const asciiArt = getShipAsciiArt(shipType);

  // Show ASCII art and observer message in the detail panel
  const detailContainer = document.getElementById('role-detail-view');
  detailContainer.innerHTML = `
    <div class="observer-panel">
      <div class="observer-ascii-art">
        <pre class="ship-ascii-art">${asciiArt}</pre>
      </div>
      <div class="observer-info">
        <h4>${escapeHtml(shipName)}</h4>
        <p class="observer-message">You are observing bridge operations.</p>
        <p class="observer-hint">Watch the crew manage their stations. You have no controls.</p>
      </div>
    </div>
  `;

  // Make sure detail view is visible for observers
  detailContainer.classList.remove('hidden');
}

/**
 * Render role detail panel content
 */
export function renderRoleDetailPanel(role) {
  const { getRoleDetailContent, applyStatusIndicators, expandRolePanel } = helpers;
  const container = document.getElementById('role-detail-view');

  // Build context object for role panel
  const context = {
    shipState: state.ship?.current_state || {},
    template: state.ship?.template_data || {},
    systemStatus: state.systemStatus || {},
    damagedSystems: state.damagedSystems || [],
    fuelStatus: state.fuelStatus,
    jumpStatus: state.jumpStatus || {},
    campaign: state.campaign,
    contacts: state.contacts,
    crewOnline: state.crewOnline,
    ship: state.ship,
    environmentalData: state.environmentalData || null,
    repairQueue: state.repairQueue || [],
    rescueTargets: state.rescueTargets || [],
    flightConditions: state.flightConditions || null,
    medicalConditions: state.medicalConditions || null,
    targetConditions: state.targetConditions || null,
    boardingConditions: state.boardingConditions || null
  };

  // Role-specific content from module
  const detailContent = getRoleDetailContent(role, context);
  container.innerHTML = detailContent;

  // AR-150: Apply UI status indicators after panel render
  applyStatusIndicators();

  // AR-102: Show embedded map for pilot role
  if (role === 'pilot' && state.selectedRole === 'pilot') {
    expandRolePanel('pilot-map');
  }
}

/**
 * Handle role action button click
 */
export function handleRoleAction(action) {
  const { formatActionName, getActionMessage, showNotification, formatRoleName } = helpers;
  // ROLE-1: Each role has functional actions
  const playerName = state.player?.character_data?.name || state.player?.slot_name || 'Player';
  const roleName = formatRoleName(state.selectedRole);

  // Get action message from role-panels module
  const logMessage = getActionMessage(action, playerName, roleName);

  // Emit action to server with log entry
  state.socket.emit('ops:roleAction', {
    shipId: state.ship.id,
    playerId: state.player.id,
    role: state.selectedRole,
    action: action,
    logMessage: logMessage
  });

  showNotification(`${formatActionName(action)} executed`, 'success');
}

/**
 * Render crew list panel
 */
export function renderCrewList() {
  const { escapeHtml, formatRoleName } = helpers;
  const container = document.getElementById('crew-list');
  const allCrew = [];

  // NAV-3: Role priority for sorting crew list
  const ROLE_PRIORITY = {
    'captain': 1,
    'pilot': 2,
    'engineer': 3,
    'astrogator': 4,
    'sensor_operator': 5,
    'gunner': 6,
    'damage_control': 7,
    'marines': 8,
    'medic': 9,
    'steward': 10,
    'cargo_master': 11,
    'gm': 0  // GM always first
  };

  // Add online players (always filter out GM entries - GM is observer, not crew)
  // AR-16: Deduplicate by accountId to prevent duplicate entries
  const seenAccountIds = new Set();
  state.crewOnline.forEach(c => {
    // Always skip GM entries - GM should never appear in crew list
    if (c.role === 'gm' || c.isGM) {
      return;
    }
    // Dedupe by accountId
    const accountId = c.id || c.accountId;
    if (accountId && seenAccountIds.has(accountId)) {
      return; // Skip duplicate
    }
    if (accountId) {
      seenAccountIds.add(accountId);
    }
    // Determine if this is the current user
    // GM is never "you" in crew list - they're an observer
    // For players, must have valid matching IDs (non-empty strings)
    const playerId = state.player?.id;
    const playerAccountId = state.player?.accountId;
    const crewId = accountId;
    const isYou = !state.isGM && crewId && (
      (playerId && typeof playerId === 'string' && playerId === crewId) ||
      (playerAccountId && typeof playerAccountId === 'string' && playerAccountId === crewId)
    );
    allCrew.push({
      name: c.character_name || c.slot_name || c.name,
      role: c.role,
      isNPC: false,
      isOnline: true,
      isYou: isYou,
      accountId: accountId,  // Server sends 'id', map to accountId
      characterData: c.character_data
    });
  });

  // Add NPC crew for unfilled roles
  if (state.ship?.npcCrew) {
    state.ship.npcCrew.forEach(npc => {
      if (!allCrew.find(c => c.role === npc.role)) {
        allCrew.push({
          name: npc.name,
          role: npc.role,
          isNPC: true,
          skillLevel: npc.skill_level,
          isOnline: false
        });
      }
    });
  }

  // Sort by role priority (NAV-3)
  allCrew.sort((a, b) => {
    const priorityA = ROLE_PRIORITY[a.role] ?? 99;
    const priorityB = ROLE_PRIORITY[b.role] ?? 99;
    return priorityA - priorityB;
  });

  // Check if current user can relieve crew (Captain, Medic, or GM)
  const canRelieve = state.selectedRole === 'captain' || state.selectedRole === 'medic' || state.isGM;

  container.innerHTML = allCrew.map(c => {
    const charDataAttr = c.characterData ? `data-character='${JSON.stringify(c.characterData).replace(/'/g, '&#39;')}'` : '';
    const hasCharClass = c.characterData ? 'has-character' : '';
    // Show relieve button if: can relieve AND not NPC AND not self AND has a role
    const showRelieveBtn = canRelieve && !c.isNPC && !c.isYou && c.role && c.accountId;
    // AR-15.10: Descriptive tooltip with name and role
    const relieveBtn = showRelieveBtn
      ? `<button class="btn-relieve" data-action="relieve" data-account-id="${escapeHtml(c.accountId)}" data-name="${escapeHtml(c.name)}" data-role="${escapeHtml(c.role)}" title="Relieve ${escapeHtml(c.name)} from ${formatRoleName(c.role)}">✕</button>`
      : '';
    // Show assign button if: GM AND not NPC AND not self AND (no role OR we want reassign option)
    const showAssignBtn = state.isGM && !c.isNPC && !c.isYou && c.accountId;
    const assignBtn = showAssignBtn
      ? `<button class="btn-assign" data-action="assign" data-account-id="${escapeHtml(c.accountId)}" data-name="${escapeHtml(c.name)}" title="Assign role">⚙</button>`
      : '';
    return `
    <div class="crew-member ${c.isNPC ? 'npc' : ''} ${c.isYou ? 'is-you' : ''}">
      <span class="online-indicator ${c.isOnline ? 'online' : ''}"></span>
      <span class="crew-name ${hasCharClass}" ${charDataAttr}>${escapeHtml(c.name)}${c.isYou ? ' (You)' : ''}</span>
      <span class="crew-role">${formatRoleName(c.role)}</span>
      ${assignBtn}${relieveBtn}
    </div>`;
  }).join('') || '<p class="placeholder">No crew</p>';
}

/**
 * Relieve crew member from duty (Captain, Medic, or GM)
 */
export function relieveCrewMember(accountId, name, role) {
  const { formatRoleName } = helpers;
  const roleName = formatRoleName(role);
  if (!confirm(`Relieve ${name} from duty as ${roleName}?`)) {
    return;
  }
  state.socket.emit('ops:relieveCrewMember', { accountId });
}

/**
 * GM assigns role to crew member
 */
export function gmAssignRole(accountId, name) {
  const { showNotification } = helpers;
  // Get list of available roles
  const roles = [
    { id: 'captain', name: 'Captain' },
    { id: 'pilot', name: 'Pilot' },
    { id: 'astrogator', name: 'Astrogator' },
    { id: 'engineer', name: 'Engineer' },
    { id: 'sensor_operator', name: 'Sensors' },
    { id: 'gunner', name: 'Gunner' },
    { id: 'damage_control', name: 'Damage Control' },
    { id: 'medic', name: 'Medical Officer' },
    { id: 'marines', name: 'Marines' },
    { id: 'steward', name: 'Steward' },
    { id: 'cargo_master', name: 'Cargo Master' },
    { id: 'observer', name: 'Observer' }
  ];

  // Simple prompt for now - could be upgraded to a modal later
  const roleOptions = roles.map(r => r.name).join(', ');
  const input = prompt(`Assign ${name} to which role?\n\nAvailable: ${roleOptions}`);

  if (!input) return;

  // Find matching role
  const inputLower = input.toLowerCase().trim();
  const role = roles.find(r =>
    r.id === inputLower ||
    r.name.toLowerCase() === inputLower ||
    r.name.toLowerCase().startsWith(inputLower)
  );

  if (!role) {
    showNotification(`Unknown role: ${input}`, 'error');
    return;
  }

  state.socket.emit('ops:gmAssignRole', {
    accountId,
    role: role.id,
    roleInstance: 1
  });
}

/**
 * Render sensor contacts list
 */
export function renderContacts() {
  const { escapeHtml, getRangeClass, getContactIcon, formatRangeBand, formatRange, interpretUWP, formatPopulation, showContactTooltip } = helpers;
  const container = document.getElementById('sensor-contacts');

  if (state.contacts.length === 0) {
    container.innerHTML = '<p class="placeholder">No contacts detected</p>';
    return;
  }

  // AR-25: Apply filtering
  let filteredContacts = state.contacts.filter(c => {
    if (state.contactFilter === 'all') return true;
    if (state.contactFilter === 'ships') {
      return ['Ship', 'Patrol', 'Trader', 'Warship', 'Scout', 'Free Trader', 'Far Trader'].includes(c.type);
    }
    if (state.contactFilter === 'stations') {
      return ['Station', 'Starport', 'Base', 'orbital'].includes(c.type);
    }
    if (state.contactFilter === 'celestial') {
      return c.celestial || ['Star', 'Planet', 'Moon', 'Gas Giant', 'Belt'].includes(c.type);
    }
    if (state.contactFilter === 'hostiles') {
      return c.weapons_free || c.hostile;
    }
    return true;
  });

  // AR-25: Apply sorting
  const rangePriority = { adjacent: 0, close: 1, short: 2, medium: 3, long: 4, distant: 5, stellar: 6, planetary: 7 };
  filteredContacts.sort((a, b) => {
    if (state.contactSort === 'range') {
      const aRank = rangePriority[a.range_band] ?? 99;
      const bRank = rangePriority[b.range_band] ?? 99;
      return aRank - bRank;
    }
    if (state.contactSort === 'name') {
      return (a.name || a.type || '').localeCompare(b.name || b.type || '');
    }
    if (state.contactSort === 'type') {
      return (a.type || '').localeCompare(b.type || '');
    }
    return 0;
  });

  if (filteredContacts.length === 0) {
    container.innerHTML = '<p class="placeholder">No matching contacts</p>';
    return;
  }

  container.innerHTML = filteredContacts.map(c => {
    const rangeClass = getRangeClass(c.range_band);
    // BD-3: Add fire button for armed contacts
    const hasWeapons = c.weapons && Array.isArray(c.weapons) && c.weapons.length > 0;
    const fireButton = hasWeapons ? `<button class="btn btn-icon btn-fire-contact" data-id="${c.id}" title="Fire Weapon">🔥</button>` : '';
    const gmControls = state.isGM ? `
      ${fireButton}
      <button class="btn btn-icon btn-delete-contact" data-id="${c.id}" title="Delete">✕</button>
    ` : '';
    // Authorized target indicator (weapons_free)
    const authorizedIndicator = c.weapons_free ? '<span class="authorized-indicator" title="Weapons Authorized">🎯</span>' : '';
    const authorizedClass = c.weapons_free ? 'weapons-authorized' : '';

    // Build inline summary (always visible on contact line)
    const inlineParts = [];
    if (c.type && c.type !== c.name) inlineParts.push(c.type);
    if (c.transponder) inlineParts.push(c.transponder);
    const inlineSummary = inlineParts.length > 0 ? `<span class="contact-inline-detail">${escapeHtml(inlineParts.join(' · '))}</span>` : '';

    // Build rich tooltip (only if substantial detail exists)
    const tooltipLines = [];

    // Celestial bodies (stars, planets)
    if (c.celestial || ['Star', 'Planet', 'Moon', 'Gas Giant', 'Belt'].includes(c.type)) {
      if (c.spectral_class) tooltipLines.push(`Spectral: ${c.spectral_class}`);
      if (c.luminosity) tooltipLines.push(`Luminosity: ${c.luminosity}`);
      if (c.uwp) {
        tooltipLines.push(`UWP: ${c.uwp}`);
        tooltipLines.push(interpretUWP(c.uwp));
      }
      if (c.population) tooltipLines.push(`Pop: ${formatPopulation(c.population)}`);
      if (c.trade_codes) tooltipLines.push(`Trade: ${c.trade_codes}`);
      if (c.description) tooltipLines.push(c.description);
    }

    // Ships - detail based on scan level
    if (['Ship', 'Patrol', 'Trader', 'Warship', 'Scout'].includes(c.type)) {
      if (c.tonnage) tooltipLines.push(`Tonnage: ${c.tonnage} dT`);
      if (c.ship_class) tooltipLines.push(`Class: ${c.ship_class}`);
      // Active scan reveals more
      if (c.scan_level >= 2) {
        if (c.thrust) tooltipLines.push(`Thrust: ${c.thrust}G`);
        if (c.jump) tooltipLines.push(`Jump: ${c.jump}`);
        if (c.armament) tooltipLines.push(`Weapons: ${c.armament}`);
      }
      // Deep scan reveals everything
      if (c.scan_level >= 3) {
        if (c.hull_status) tooltipLines.push(`Hull: ${c.hull_status}%`);
        if (c.crew_count) tooltipLines.push(`Crew: ${c.crew_count}`);
        if (c.cargo) tooltipLines.push(`Cargo: ${c.cargo}`);
        if (c.damage_status) tooltipLines.push(`Damage: ${c.damage_status}`);
      }
    }

    // Stations
    if (['Station', 'Starport', 'Base'].includes(c.type)) {
      if (c.starport_class) tooltipLines.push(`Class: ${c.starport_class}`);
      if (c.services) tooltipLines.push(`Services: ${c.services}`);
      if (c.berthing) tooltipLines.push(`Berthing: ${c.berthing} Cr`);
    }

    // Range in km if known
    if (c.range_km) tooltipLines.push(`Range: ${formatRange(c.range_km)}`);

    // GM notes
    if (state.isGM && c.gm_notes) tooltipLines.push(`GM: ${c.gm_notes}`);

    // Only render tooltip if we have substantial content
    const tooltipHtml = tooltipLines.length > 0
      ? `<div class="contact-hover-details">${tooltipLines.map(l => `<div>${escapeHtml(l)}</div>`).join('')}</div>`
      : '';

    // Format range km for display
    const rangeKmDisplay = c.range_km ? `<span class="contact-range-km">${formatRange(c.range_km)}</span>` : '';

    return `
      <div class="contact-item compact ${rangeClass} ${authorizedClass}" data-contact-id="${c.id}">
        <span class="contact-icon">${getContactIcon(c.type)}${authorizedIndicator}</span>
        <span class="contact-name" title="${escapeHtml(c.name || c.type)}">${escapeHtml(c.name || c.type)}</span>
        ${inlineSummary}
        ${rangeKmDisplay}
        <span class="contact-bearing">${c.bearing}°</span>
        <span class="contact-range-band">${formatRangeBand(c.range_band)}</span>
        ${gmControls}
        ${tooltipHtml}
      </div>
    `;
  }).join('');

  // Add click handlers for contact selection (TIP-1: Click-to-pin)
  container.querySelectorAll('.contact-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't select if clicking delete button
      if (e.target.classList.contains('btn-delete-contact')) return;
      e.stopPropagation();
      const contactId = item.dataset.contactId;
      showContactTooltip(contactId, item);
    });
  });

  // GM delete handlers
  if (state.isGM) {
    container.querySelectorAll('.btn-delete-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const contactId = btn.dataset.id;
        state.socket.emit('ops:deleteContact', { contactId });
      });
    });

    // BD-3: GM fire handlers
    container.querySelectorAll('.btn-fire-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const contactId = btn.dataset.id;
        // Find a party ship to target
        const targetShip = state.ships?.find(s => s.is_party_ship);
        if (!targetShip) {
          helpers.showNotification('No party ship to target', 'error');
          return;
        }
        // Fire the first weapon (weaponIndex 0)
        state.socket.emit('ops:fireAsContact', {
          contactId,
          weaponIndex: 0,
          targetShipId: targetShip.id
        });
      });
    });
  }
}

/**
 * Update role quirk display in role panel header
 */
export function updateRoleQuirkDisplay() {
  const quirkDisplay = document.getElementById('role-quirk-display');
  if (!quirkDisplay) return;

  const icon = state.player?.quirk_icon || '';
  const text = state.player?.quirk_text || '';

  if (icon || text) {
    let display = '';
    if (icon) display += icon;
    if (icon && text) display += ' ';
    if (text) display += `"${text}"`;
    quirkDisplay.textContent = display;
    quirkDisplay.title = text || 'Station quirk';
  } else {
    quirkDisplay.textContent = '';
  }
}

/**
 * Initialize GM controls on bridge
 */
export function initGMControls() {
  const { showModal, showNotification, showAddCombatContactModal } = helpers;

  // Alert status buttons
  document.getElementById('btn-alert-normal').addEventListener('click', () => {
    state.socket.emit('ops:setAlertStatus', { status: 'NORMAL' });
  });
  document.getElementById('btn-alert-yellow').addEventListener('click', () => {
    state.socket.emit('ops:setAlertStatus', { status: 'YELLOW' });
  });
  document.getElementById('btn-alert-red').addEventListener('click', () => {
    state.socket.emit('ops:setAlertStatus', { status: 'RED' });
  });

  // Time advance
  document.getElementById('btn-gm-advance-time').addEventListener('click', () => {
    showModal('template-time-advance');
  });

  // Add log entry
  document.getElementById('btn-gm-add-log').addEventListener('click', () => {
    showModal('template-add-log');
  });

  // Add contact
  document.getElementById('btn-gm-add-contact').addEventListener('click', () => {
    showModal('template-add-contact');
  });

  // Stage 5: Lookup System (TravellerMap)
  document.getElementById('btn-gm-lookup-system').addEventListener('click', () => {
    showModal('template-system-lookup');
  });

  document.getElementById('btn-gm-initiative').addEventListener('click', () => {
    state.socket.emit('ops:callInitiative', {
      campaignId: state.campaign.id
    });
  });

  document.getElementById('btn-gm-combat').addEventListener('click', () => {
    // Get targetable contacts
    const targetable = state.contacts?.filter(c => c.is_targetable) || [];
    if (targetable.length === 0) {
      showNotification('No targetable contacts for combat', 'error');
      return;
    }
    if (confirm(`Start combat mode with ${targetable.length} contact(s)?`)) {
      state.socket.emit('ops:enterCombat', {
        selectedContacts: targetable.map(c => c.id)
      });
    }
  });

  // AR-25: Spawn Training Target DRN
  document.getElementById('btn-spawn-training')?.addEventListener('click', () => {
    state.socket.emit('ops:spawnTrainingTarget');
  });

  // Exit combat button
  document.getElementById('btn-exit-combat')?.addEventListener('click', () => {
    if (confirm('End combat and return to bridge operations?')) {
      state.socket.emit('ops:exitCombat', { outcome: 'disengaged' });
    }
  });

  // Autorun 14: Add combat contact from prep panel
  document.getElementById('btn-add-combat-contact')?.addEventListener('click', () => {
    showAddCombatContactModal();
  });

  // System damage button (if exists)
  const damageBtn = document.getElementById('btn-gm-damage');
  if (damageBtn) {
    damageBtn.addEventListener('click', () => {
      showModal('template-apply-damage');
    });
  }
}
