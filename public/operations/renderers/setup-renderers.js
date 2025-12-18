/**
 * AR-201 Phase 4: Setup Renderers
 *
 * Render functions for GM and Player setup screens.
 */

// State and helpers will be injected
let state = null;
let helpers = null;

/**
 * Initialize renderer with state and helpers
 */
export function initSetupRenderers(appState, appHelpers) {
  state = appState;
  helpers = appHelpers;
}

/**
 * Render GM setup screen
 */
export function renderGMSetup() {
  const { escapeHtml, openShipEditor } = helpers;

  document.getElementById('gm-campaign-name').textContent = state.campaign?.name || 'Campaign Setup';

  // Campaign code display
  const codeEl = document.getElementById('campaign-code-value');
  if (codeEl && state.campaign?.id) {
    // Show first 8 characters of campaign ID as the join code
    codeEl.textContent = state.campaign.id.substring(0, 8).toUpperCase();
  }

  // Campaign settings
  document.getElementById('campaign-date').value = state.campaign?.current_date || '1105-001';
  document.getElementById('campaign-system').value = state.campaign?.current_system || 'Regina';
  document.getElementById('god-mode-toggle').checked = state.campaign?.god_mode;
  // AR-124: Position verification toggle (default true if not set)
  document.getElementById('position-verify-toggle').checked = state.campaign?.require_position_verification !== 0;

  // Player slots
  const slotsContainer = document.getElementById('gm-player-slots');
  slotsContainer.innerHTML = state.players.map(p => `
    <div class="player-slot">
      <span class="name">${escapeHtml(p.slot_name)}</span>
      <span class="status ${p.last_login ? 'online' : ''}">${p.character_name || 'No character'}</span>
      <button class="btn btn-small btn-danger" data-delete-slot="${p.id}">×</button>
    </div>
  `).join('') || '<p class="placeholder">No player slots yet</p>';

  // Add delete handlers
  slotsContainer.querySelectorAll('[data-delete-slot]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.socket.emit('ops:deletePlayerSlot', { playerId: btn.dataset.deleteSlot });
    });
  });

  // Ships list - GM can select which ship to view on bridge
  const shipsContainer = document.getElementById('gm-ships-list');

  // Auto-select party ship if none selected
  if (!state.gmSelectedShipId && state.ships.length > 0) {
    const partyShip = state.ships.find(s => s.is_party_ship);
    state.gmSelectedShipId = partyShip?.id || state.ships[0].id;
  }

  shipsContainer.innerHTML = state.ships.map(s => `
    <div class="ship-item selectable ${state.gmSelectedShipId === s.id ? 'selected' : ''}" data-ship-id="${s.id}">
      <span class="name">${escapeHtml(s.name)}</span>
      <span class="type">${s.ship_data?.type || 'Unknown'}</span>
      ${s.is_party_ship ? '<span class="badge">Party Ship</span>' : ''}
      <button class="btn btn-small btn-secondary" data-edit-ship="${s.id}" title="Edit Ship">✎</button>
    </div>
  `).join('') || '<p class="placeholder">No ships yet</p>';

  // Add click handlers for ship selection
  shipsContainer.querySelectorAll('.ship-item.selectable').forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't select if clicking edit button
      if (e.target.matches('[data-edit-ship]')) return;
      state.gmSelectedShipId = item.dataset.shipId;
      renderGMSetup(); // Re-render to show selection
    });
  });

  // Add edit handlers
  shipsContainer.querySelectorAll('[data-edit-ship]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openShipEditor(btn.dataset.editShip);
    });
  });
}

/**
 * Render player setup screen
 */
export function renderPlayerSetup() {
  const { escapeHtml, renderRoleSelection } = helpers;

  document.getElementById('player-slot-name').textContent = state.player?.slot_name || 'Player Setup';

  // Character display
  const charDisplay = document.getElementById('character-display');
  if (state.player?.character_data) {
    const char = state.player.character_data;
    const skills = Object.entries(char.skills || {})
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `<span class="skill-badge">${k}: ${v}</span>`)
      .join('');

    charDisplay.innerHTML = `
      <div class="char-name">${escapeHtml(char.name)}</div>
      <div class="char-skills">${skills || 'No skills defined'}</div>
    `;
  } else {
    charDisplay.innerHTML = '<p class="placeholder">No character imported</p>';
  }

  // Ship selection
  const shipContainer = document.getElementById('ship-select-list');
  const partyShips = state.ships
    .filter(s => s.is_party_ship && s.visible_to_players)
    .sort((a, b) => a.name.localeCompare(b.name));  // Alphabetize ships

  shipContainer.innerHTML = partyShips.map(s => `
    <div class="ship-option ${state.selectedShipId === s.id ? 'selected' : ''}" data-ship-id="${s.id}">
      <div class="ship-name">${escapeHtml(s.name)}</div>
      <div class="ship-type">${s.ship_data?.type || 'Unknown Type'}</div>
    </div>
  `).join('') || '<p class="placeholder">No ships available</p>';

  // Add ship selection handlers
  shipContainer.querySelectorAll('.ship-option').forEach(opt => {
    opt.addEventListener('click', () => {
      state.selectedShipId = opt.dataset.shipId;
      renderPlayerSetup();
      state.socket.emit('ops:selectShip', {
        playerId: state.player.id,
        shipId: state.selectedShipId
      });
    });
  });

  // Role selection
  renderRoleSelection();

  // Update join button state
  const joinBtn = document.getElementById('btn-join-bridge');
  joinBtn.disabled = !state.selectedShipId || !state.selectedRole || !state.player?.character_data;
}

/**
 * Render role selection list
 */
export function renderRoleSelection() {
  const { escapeHtml, showNotification, formatRoleName } = helpers;
  const container = document.getElementById('role-select-list');
  const baseRoles = [
    { id: 'pilot', name: 'Pilot', desc: 'Navigation, maneuvering, docking' },
    { id: 'captain', name: 'Captain', desc: 'Command, tactics, leadership' },
    { id: 'astrogator', name: 'Astrogator', desc: 'Jump plotting, navigation' },
    { id: 'engineer', name: 'Engineer', desc: 'Power, drives, repairs' },
    { id: 'sensor_operator', name: 'Sensors', desc: 'Detection, comms, EW' },
    { id: 'gunner', name: 'Gunner', desc: 'Weapons, point defense' },
    { id: 'damage_control', name: 'Damage Control', desc: 'Repairs, emergencies' },
    { id: 'marines', name: 'Marines', desc: 'Security, boarding' },
    { id: 'medic', name: 'Medic', desc: 'Medical care' },
    { id: 'steward', name: 'Steward', desc: 'Passengers, supplies' },
    { id: 'cargo_master', name: 'Cargo', desc: 'Cargo operations' },
    { id: 'observer', name: 'Observer', desc: 'Watch bridge operations', unlimited: true }
  ].sort((a, b) => a.name.localeCompare(b.name));  // Alphabetize roles

  // Get crew requirements from ship template (if available)
  const crewReqs = state.ship?.template_data?.crew?.minimum || {};

  // Expand roles based on crew requirements
  const roles = [];
  for (const r of baseRoles) {
    // Unlimited roles (observer) always show as single option, never expand
    if (r.unlimited) {
      roles.push({
        id: r.id,
        instance: 1,
        fullId: r.id,
        name: r.name,
        desc: r.desc,
        unlimited: true
      });
      continue;
    }
    const count = crewReqs[r.id] || 1;
    if (count > 1) {
      // Multiple instances of this role
      for (let i = 1; i <= count; i++) {
        roles.push({
          id: r.id,
          instance: i,
          fullId: `${r.id}:${i}`,
          name: `${r.name} ${i}`,
          desc: r.desc
        });
      }
    } else {
      roles.push({
        id: r.id,
        instance: 1,
        fullId: r.id,
        name: r.name,
        desc: r.desc
      });
    }
  }

  // Get taken roles (from other players on same ship)
  // Format: role or role:instance
  const takenRoles = state.players
    .filter(p => p.ship_id === state.selectedShipId && p.id !== state.player?.id)
    .map(p => ({
      role: p.role,
      roleInstance: p.role_instance || 1,
      fullId: p.role_instance > 1 ? `${p.role}:${p.role_instance}` : p.role,
      name: p.slot_name
    }));

  container.innerHTML = roles.map(r => {
    const takenBy = takenRoles.find(t => t.fullId === r.fullId);
    const isSelected = state.selectedRole === r.id &&
                       (state.selectedRoleInstance || 1) === r.instance;
    // Unlimited roles are never marked as taken
    const isTaken = !r.unlimited && takenBy && !isSelected;

    // TODO: Expand tooltips with detailed role responsibilities
    const tooltip = `${r.name}: ${r.desc}`;
    return `
      <div class="role-option ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''} ${r.unlimited ? 'unlimited' : ''}"
           data-role-id="${r.id}" data-role-instance="${r.instance}"
           data-taken-by="${isTaken ? escapeHtml(takenBy.name) : ''}"
           title="${tooltip}">
        <div class="role-name">${r.name}</div>
        <div class="role-desc">${r.desc}</div>
        ${isTaken ? `<div class="role-taken-by">Taken by ${escapeHtml(takenBy.name)}</div>` : ''}
      </div>
    `;
  }).join('');

  // Add role selection handlers for available roles
  container.querySelectorAll('.role-option:not(.taken)').forEach(opt => {
    opt.addEventListener('click', () => {
      state.selectedRole = opt.dataset.roleId;
      state.selectedRoleInstance = parseInt(opt.dataset.roleInstance) || 1;
      state.socket.emit('ops:assignRole', {
        playerId: state.player.id,
        role: state.selectedRole,
        roleInstance: state.selectedRoleInstance
      });
    });
  });

  // AR-143: Add click handlers for taken roles (with confirmation)
  container.querySelectorAll('.role-option.taken').forEach(opt => {
    opt.style.cursor = 'pointer'; // Make it clear it's clickable
    opt.addEventListener('click', () => {
      const roleName = opt.querySelector('.role-name')?.textContent || 'this role';
      const takenByName = opt.dataset.takenBy || 'another player';

      // Show confirmation dialog
      const confirmed = confirm(`Replace ${takenByName} as ${roleName}?\n\nThis will remove them from this station.`);

      if (confirmed) {
        state.selectedRole = opt.dataset.roleId;
        state.selectedRoleInstance = parseInt(opt.dataset.roleInstance) || 1;
        state.socket.emit('ops:assignRole', {
          playerId: state.player.id,
          role: state.selectedRole,
          roleInstance: state.selectedRoleInstance
        });
        showNotification(`Taking over ${roleName} from ${takenByName}`, 'info');
      }
    });
  });
}

/**
 * Render player slots list (for joining)
 */
export function renderPlayerSlots() {
  const { escapeHtml } = helpers;
  const container = document.getElementById('player-slot-list');

  if (state.players.length === 0) {
    container.innerHTML = '<p class="placeholder">No player slots available</p>';
    return;
  }

  // AR-16: Deduplicate players by ID
  const seenIds = new Set();
  const uniquePlayers = state.players.filter(p => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  container.innerHTML = uniquePlayers.map(p => `
    <div class="slot-item ${p.character_name ? 'has-character' : ''}" data-player-id="${p.id}">
      <div>
        <div class="slot-name">${escapeHtml(p.slot_name)}</div>
        ${p.character_name ? `<div class="slot-character">${escapeHtml(p.character_name)}</div>` : ''}
      </div>
      <button class="btn btn-small btn-primary">Join</button>
    </div>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.slot-item').forEach(item => {
    item.addEventListener('click', () => {
      const accountId = item.dataset.playerId;  // Server expects accountId
      state.socket.emit('ops:selectPlayerSlot', { accountId });
    });
  });
}

/**
 * Render quick location buttons (recent, favorites, home)
 */
export function renderQuickLocations() {
  const { escapeHtml } = helpers;

  // Home system button
  const homeBtn = document.getElementById('home-system-btn');
  if (homeBtn) {
    if (state.homeSystem) {
      homeBtn.classList.remove('hidden');
      homeBtn.querySelector('.location-name').textContent = state.homeSystem;
    } else {
      homeBtn.classList.add('hidden');
    }
  }

  // Recent locations
  const recentContainer = document.getElementById('recent-locations');
  if (recentContainer) {
    if (state.locationHistory && state.locationHistory.length > 0) {
      recentContainer.innerHTML = state.locationHistory.slice(0, 5).map(loc => `
        <div class="quick-location-item" data-location='${JSON.stringify(loc).replace(/'/g, "&#39;")}'>
          <span class="location-name">${escapeHtml(loc.locationDisplay || loc.system)}</span>
          <button class="btn-icon btn-favorite" title="Toggle favorite">★</button>
        </div>
      `).join('');
    } else {
      recentContainer.innerHTML = '<p class="quick-placeholder">No recent locations</p>';
    }
  }

  // Favorite locations
  const favContainer = document.getElementById('favorite-locations');
  if (favContainer) {
    if (state.favoriteLocations && state.favoriteLocations.length > 0) {
      favContainer.innerHTML = state.favoriteLocations.map(loc => `
        <div class="quick-location-item favorite" data-location='${JSON.stringify(loc).replace(/'/g, "&#39;")}'>
          <span class="location-icon">★</span>
          <span class="location-name">${escapeHtml(loc.locationDisplay || loc.system)}</span>
          <button class="btn-icon btn-set-home" title="Set as home">🏠</button>
        </div>
      `).join('');
    } else {
      favContainer.innerHTML = '<p class="quick-placeholder">No favorites saved</p>';
    }
  }

  // Update deep space toggle state
  const deepSpaceToggle = document.getElementById('deep-space-toggle');
  const deepSpaceFields = document.getElementById('deep-space-fields');
  if (deepSpaceToggle && deepSpaceFields) {
    deepSpaceToggle.checked = state.inDeepSpace || false;
    deepSpaceFields.classList.toggle('hidden', !state.inDeepSpace);
    if (state.inDeepSpace) {
      const refInput = document.getElementById('deep-space-reference');
      const bearingInput = document.getElementById('deep-space-bearing');
      const distanceInput = document.getElementById('deep-space-distance');
      if (refInput) refInput.value = state.deepSpaceReference || '';
      if (bearingInput) bearingInput.value = state.deepSpaceBearing || '';
      if (distanceInput) distanceInput.value = state.deepSpaceDistance || '';
    }
  }
}
