/**
 * Traveller Starship Operations VTT - Main Application
 * Handles UI state, socket communication, and user interactions
 */

// ==================== State ====================
const state = {
  socket: null,
  isGM: false,
  isGuest: false,
  guestName: null,
  guestSkill: 0,  // Default skill for guests, GM can override
  currentScreen: 'login',

  // Campaign data
  campaign: null,
  campaigns: [],

  // Player data
  player: null,
  players: [],

  // Ship data
  ship: null,
  ships: [],
  selectedShipId: null,
  selectedRole: null,
  selectedRoleInstance: 1,

  // Bridge state
  contacts: [],
  crewOnline: [],
  logEntries: []
};

// ==================== Socket Setup ====================
function initSocket() {
  state.socket = io();

  // Connection events
  state.socket.on('connect', () => {
    console.log('Connected to server');
    // Try to reconnect to previous session (Stage 3.5.5)
    tryReconnect();
  });

  state.socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showNotification('Disconnected from server', 'error');
  });

  // Reconnect events (Stage 3.5.5)
  state.socket.on('ops:reconnected', (data) => {
    console.log('Reconnected to session:', data.screen);
    state.campaign = data.campaign;
    state.players = data.players || [];
    state.ships = data.ships || [];
    state.ship = data.ship || null;
    state.player = data.account || null;
    state.selectedRole = data.role || null;
    state.logEntries = data.logs || [];
    state.crewOnline = data.crew || [];

    if (data.screen === 'bridge') {
      state.selectedShipId = data.ship?.id;
      showScreen('bridge');
      renderBridge();
      showNotification('Session restored', 'success');
    } else if (data.screen === 'player-setup') {
      showScreen('player-setup');
      renderPlayerSetup();
      showNotification('Session restored', 'success');
    } else if (data.screen === 'gm-setup') {
      state.isGM = true;
      showScreen('gm-setup');
      renderGMSetup();
      showNotification('Session restored', 'success');
    }
  });

  state.socket.on('ops:reconnectFailed', (data) => {
    console.log('Reconnect failed:', data.reason);
    // Clear stored session and show login
    clearStoredSession();
  });

  // Slot status updates (Stage 3.5.3)
  state.socket.on('ops:slotStatusUpdate', (data) => {
    const slot = state.players?.find(p => p.id === data.accountId);
    if (slot) {
      slot.inUse = data.status === 'in-use';
      renderPlayerSlots();
      renderGMSetup();
    }
  });

  // Campaign events
  state.socket.on('ops:campaigns', (data) => {
    state.campaigns = data.campaigns;
    renderCampaignList();
  });

  state.socket.on('ops:campaignCreated', (data) => {
    state.campaign = data.campaign;
    state.campaigns.push(data.campaign);
    if (state.isGM) {
      showScreen('gm-setup');
      renderGMSetup();
    }
  });

  state.socket.on('ops:campaignData', (data) => {
    state.campaign = data.campaign;
    state.players = data.players;
    state.ships = data.ships;

    if (state.isGM) {
      showScreen('gm-setup');
      renderGMSetup();
      // Save session for reconnect (Stage 3.5.5)
      saveSession();
    }
  });

  state.socket.on('ops:campaignUpdated', (data) => {
    state.campaign = data.campaign;
    if (state.isGM) {
      renderGMSetup();
    }
  });

  // Player slot events
  state.socket.on('ops:playerSlotCreated', (data) => {
    state.players.push(data.account);
    renderGMSetup();
    renderPlayerSlots();
  });

  state.socket.on('ops:playerSlotDeleted', (data) => {
    state.players = state.players.filter(p => p.id !== data.accountId);
    renderGMSetup();
    renderPlayerSlots();
  });

  // Player join events
  state.socket.on('ops:campaignJoined', (data) => {
    state.campaign = data.campaign;
    state.players = data.availableSlots;
    renderPlayerSlots();
  });

  state.socket.on('ops:playerSlotSelected', (data) => {
    state.player = data.account;
    state.ships = data.ships;
    state.isGuest = false;
    showScreen('player-setup');
    renderPlayerSetup();
  });

  state.socket.on('ops:playerJoined', (data) => {
    showNotification(`${data.slotName} joined the campaign`, 'info');
  });

  // Guest events
  state.socket.on('ops:guestJoined', (data) => {
    state.campaign = data.campaign;
    state.ships = data.ships;
    state.isGuest = true;
    state.guestName = data.guestName;
    state.guestSkill = data.defaultSkill;
    state.player = {
      slot_name: data.guestName,
      character_data: null
    };
    showScreen('player-setup');
    renderPlayerSetup();
    showNotification(`Joined as guest "${data.guestName}" (skill 0)`, 'info');
  });

  state.socket.on('ops:skillOverride', (data) => {
    state.guestSkill = data.skillLevel;
    showNotification(`GM set your ${data.role} skill to ${data.skillLevel}`, 'info');
  });

  // Character events
  state.socket.on('ops:characterImported', (data) => {
    if (state.player) {
      state.player.character_data = data.character;
    }
    renderPlayerSetup();
    closeModal();
    showNotification('Character saved', 'success');
  });

  // Ship & role events
  state.socket.on('ops:shipSelected', (data) => {
    state.ship = data.ship;
    // Update taken roles display
    renderRoleSelection();
  });

  state.socket.on('ops:roleAssigned', (data) => {
    state.selectedRole = data.role;
    renderPlayerSetup();
  });

  state.socket.on('ops:crewUpdate', (data) => {
    // Another player changed their role
    renderRoleSelection();
  });

  // Bridge events
  state.socket.on('ops:bridgeJoined', (data) => {
    state.ship = data.ship;
    state.selectedShipId = data.ship?.id;
    state.crewOnline = data.crew;
    state.contacts = [];
    state.logEntries = data.logs || [];
    state.campaign = data.campaign;
    state.selectedRole = data.role;
    showScreen('bridge');
    renderBridge();
    // Save session for reconnect (Stage 3.5.5)
    saveSession();
    // Request system status for engineer panel
    requestSystemStatus();
    // Request jump status for astrogator panel
    requestJumpStatus();
  });

  state.socket.on('ops:crewOnBridge', (data) => {
    showNotification(`${data.name || data.role} joined the bridge`, 'info');
  });

  state.socket.on('ops:sessionStarted', (data) => {
    showNotification('Session started', 'success');
    if (document.getElementById('bridge-date')) {
      document.getElementById('bridge-date').textContent = data.gameDate;
    }
  });

  state.socket.on('ops:logEntry', (data) => {
    state.logEntries.unshift(data.entry);
    renderShipLog();
  });

  state.socket.on('ops:timeAdvanced', (data) => {
    document.getElementById('bridge-date').textContent = data.newDate;
    showNotification(`Time advanced to ${data.newDate}`, 'info');
  });

  state.socket.on('ops:alertStatusChanged', (data) => {
    updateAlertStatus(data.status);
    showNotification(`Alert status: ${data.status}`, data.status === 'RED' ? 'error' : 'info');
  });

  // Ship management events
  state.socket.on('ops:shipAdded', (data) => {
    state.ships.push(data.ship);
    renderGMSetup();
    renderPlayerSetup();
    closeModal();
    showNotification(`Ship "${data.ship.name}" added`, 'success');
  });

  state.socket.on('ops:shipDeleted', (data) => {
    state.ships = state.ships.filter(s => s.id !== data.shipId);
    renderGMSetup();
  });

  state.socket.on('ops:shipTemplates', (data) => {
    state.shipTemplates = data.templates;
    populateShipTemplateSelect();
  });

  // Contact events
  state.socket.on('ops:contacts', (data) => {
    state.contacts = data.contacts;
    renderContacts();
  });

  state.socket.on('ops:contactAdded', (data) => {
    state.contacts.push(data.contact);
    renderContacts();
    showNotification(`Contact added: ${data.contact.name || data.contact.type}`, 'info');
  });

  state.socket.on('ops:contactUpdated', (data) => {
    const idx = state.contacts.findIndex(c => c.id === data.contact.id);
    if (idx >= 0) state.contacts[idx] = data.contact;
    renderContacts();
  });

  state.socket.on('ops:contactDeleted', (data) => {
    state.contacts = state.contacts.filter(c => c.id !== data.contactId);
    renderContacts();
  });

  state.socket.on('ops:scanResult', (data) => {
    state.contacts = data.contacts;
    renderContacts();
    showNotification(`Sensor scan complete: ${data.contacts.length} contacts`, 'info');
  });

  // Ship Systems events
  state.socket.on('ops:systemStatus', (data) => {
    state.systemStatus = data.systemStatus;
    state.damagedSystems = data.damagedSystems;
    if (state.role === 'engineer' || state.role === 'damage_control') {
      renderRoleDetailPanel(state.role);
    }
  });

  state.socket.on('ops:systemDamaged', (data) => {
    state.systemStatus = data.systemStatus;
    state.damagedSystems = Object.keys(data.systemStatus).filter(s =>
      data.systemStatus[s]?.totalSeverity > 0
    );
    showNotification(`System damage: ${formatSystemName(data.location)} (Severity ${data.severity})`, 'warning');
    if (state.role === 'engineer' || state.role === 'damage_control') {
      renderRoleDetailPanel(state.role);
    }
  });

  state.socket.on('ops:repairAttempted', (data) => {
    state.systemStatus = data.systemStatus;
    state.damagedSystems = Object.keys(data.systemStatus).filter(s =>
      data.systemStatus[s]?.totalSeverity > 0
    );
    const notifType = data.success ? 'success' : 'warning';
    showNotification(data.message, notifType);
    if (state.role === 'engineer' || state.role === 'damage_control') {
      renderRoleDetailPanel(state.role);
    }
  });

  state.socket.on('ops:systemDamageCleared', (data) => {
    state.systemStatus = data.systemStatus;
    state.damagedSystems = Object.keys(data.systemStatus).filter(s =>
      data.systemStatus[s]?.totalSeverity > 0
    );
    showNotification(`Damage cleared: ${data.location === 'all' ? 'all systems' : formatSystemName(data.location)}`, 'success');
    if (state.role === 'engineer' || state.role === 'damage_control') {
      renderRoleDetailPanel(state.role);
    }
  });

  // Jump events
  state.socket.on('ops:jumpStatus', (data) => {
    state.jumpStatus = data;
    if (state.role === 'astrogator' || state.role === 'pilot') {
      renderRoleDetailPanel(state.role);
    }
  });

  state.socket.on('ops:jumpInitiated', (data) => {
    state.jumpStatus = {
      inJump: true,
      jumpStartDate: data.jumpStartDate,
      jumpEndDate: data.jumpEndDate,
      destination: data.destination,
      jumpDistance: data.distance,
      hoursRemaining: 168,
      canExit: false
    };
    // Update ship fuel
    if (state.ship?.current_state) {
      state.ship.current_state.fuel = data.fuelRemaining;
    }
    showNotification(`Jump initiated to ${data.destination}. ETA: ${data.jumpEndDate}`, 'info');
    renderRoleDetailPanel(state.role);
    renderShipStatus();
  });

  state.socket.on('ops:jumpCompleted', (data) => {
    state.jumpStatus = { inJump: false };
    state.campaign.current_system = data.arrivedAt;
    showNotification(`Arrived at ${data.arrivedAt}`, 'success');
    renderRoleDetailPanel(state.role);
    renderBridge();
  });

  state.socket.on('ops:locationChanged', (data) => {
    state.campaign.current_system = data.newLocation;
    renderBridge();
  });

  // Refueling events
  state.socket.on('ops:fuelStatus', (data) => {
    state.fuelStatus = data;
    if (state.selectedRole === 'engineer') {
      renderRoleDetailPanel('engineer');
    }
    renderShipStatus();
  });

  state.socket.on('ops:refuelOptions', (data) => {
    state.fuelSources = data.sources;
    state.fuelTypes = data.fuelTypes;
    if (data.fuelStatus) {
      state.fuelStatus = data.fuelStatus;
    }
    populateRefuelModal();
  });

  state.socket.on('ops:canRefuelResult', (data) => {
    // Update refuel modal with cost/time info
    updateRefuelPreview(data);
  });

  state.socket.on('ops:refueled', (data) => {
    state.fuelStatus = data.newFuelStatus;
    // Update ship state
    if (state.ship?.current_state) {
      state.ship.current_state.fuel = data.newFuelStatus.total;
      state.ship.current_state.fuelBreakdown = data.newFuelStatus.breakdown;
    }
    showNotification(`Refueled ${data.fuelAdded} tons of ${data.fuelType} fuel`, 'success');
    renderShipStatus();
    if (state.selectedRole === 'engineer') {
      renderRoleDetailPanel('engineer');
    }
    closeModal();
  });

  state.socket.on('ops:fuelProcessingStarted', (data) => {
    showNotification(`Started processing ${data.tons} tons of fuel (${data.timeHours} hours)`, 'info');
    state.socket.emit('ops:getFuelStatus');
  });

  state.socket.on('ops:fuelProcessingStatus', (data) => {
    state.fuelProcessing = data;
    if (state.selectedRole === 'engineer') {
      renderRoleDetailPanel('engineer');
    }
  });

  state.socket.on('ops:fuelProcessingCompleted', (data) => {
    state.fuelStatus = data.newFuelStatus;
    showNotification(`Fuel processing complete: ${data.tons} tons now ready`, 'success');
    renderShipStatus();
    if (state.selectedRole === 'engineer') {
      renderRoleDetailPanel('engineer');
    }
  });

  state.socket.on('ops:jumpFuelPenalties', (data) => {
    if (data.hasUnrefined) {
      showNotification(`Warning: Using ${data.unrefinedAmount} tons unrefined fuel (DM ${data.dmModifier}, ${data.misjumpRisk * 100}% misjump risk)`, 'warning');
    }
  });

  // Error handling
  state.socket.on('ops:error', (error) => {
    showNotification(error.message, 'error');
  });
}

// ==================== Screen Management ====================
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`${screenId}-screen`).classList.add('active');
  state.currentScreen = screenId;
}

// ==================== Login Screen ====================
function initLoginScreen() {
  // GM Login
  document.getElementById('btn-gm-login').addEventListener('click', () => {
    state.isGM = true;
    document.querySelector('.login-options').classList.add('hidden');
    document.getElementById('campaign-select').classList.remove('hidden');
    state.socket.emit('ops:getCampaigns');
  });

  // Player Login
  document.getElementById('btn-player-login').addEventListener('click', () => {
    state.isGM = false;
    document.querySelector('.login-options').classList.add('hidden');
    document.getElementById('player-select').classList.remove('hidden');
  });

  // Back buttons
  document.getElementById('btn-back-login').addEventListener('click', () => {
    document.getElementById('campaign-select').classList.add('hidden');
    document.querySelector('.login-options').classList.remove('hidden');
  });

  document.getElementById('btn-back-player').addEventListener('click', () => {
    document.getElementById('player-select').classList.add('hidden');
    document.querySelector('.login-options').classList.remove('hidden');
  });

  document.getElementById('btn-back-player-slot').addEventListener('click', () => {
    document.getElementById('player-slot-select').classList.add('hidden');
    document.getElementById('player-select').classList.remove('hidden');
  });

  // Create campaign
  document.getElementById('btn-create-campaign').addEventListener('click', () => {
    showModal('template-create-campaign');
  });

  // Join campaign (player)
  document.getElementById('btn-join-campaign').addEventListener('click', () => {
    const code = document.getElementById('campaign-code').value.trim();
    if (code) {
      state.socket.emit('ops:joinCampaignAsPlayer', { campaignId: code });
      document.getElementById('player-select').classList.add('hidden');
      document.getElementById('player-slot-select').classList.remove('hidden');
    }
  });

  // Guest login flow
  // TODO: Complete guest login implementation in future autorun
  const btnJoinGuest = document.getElementById('btn-join-guest');
  if (btnJoinGuest) {
    btnJoinGuest.addEventListener('click', () => {
      const code = document.getElementById('campaign-code').value.trim();
      if (code) {
        state.guestCampaignCode = code;
        document.getElementById('player-select').classList.add('hidden');
        document.getElementById('guest-name-select').classList.remove('hidden');
      } else {
        showNotification('Please enter a campaign code first', 'error');
      }
    });
  }

  const btnConfirmGuest = document.getElementById('btn-confirm-guest');
  if (btnConfirmGuest) {
    btnConfirmGuest.addEventListener('click', () => {
      const guestName = document.getElementById('guest-name').value.trim();
      if (guestName && state.guestCampaignCode) {
        state.socket.emit('ops:joinAsGuest', {
          campaignId: state.guestCampaignCode,
          guestName: guestName
        });
      } else {
        showNotification('Please enter your name', 'error');
      }
    });
  }

  const btnBackGuest = document.getElementById('btn-back-guest');
  if (btnBackGuest) {
    btnBackGuest.addEventListener('click', () => {
      document.getElementById('guest-name-select').classList.add('hidden');
      document.getElementById('player-select').classList.remove('hidden');
    });
  }
}

function renderCampaignList() {
  const container = document.getElementById('campaign-list');

  if (state.campaigns.length === 0) {
    container.innerHTML = '<p class="placeholder">No campaigns yet</p>';
    return;
  }

  container.innerHTML = state.campaigns.map(c => `
    <div class="campaign-item" data-campaign-id="${c.id}">
      <div>
        <div class="campaign-name">${escapeHtml(c.name)}</div>
        <div class="campaign-meta">${escapeHtml(c.gm_name)} · ${c.current_system}</div>
      </div>
      <button class="btn btn-small btn-primary">Select</button>
    </div>
  `).join('');

  // Add click handlers
  container.querySelectorAll('.campaign-item').forEach(item => {
    item.addEventListener('click', () => {
      const campaignId = item.dataset.campaignId;
      state.socket.emit('ops:selectCampaign', { campaignId });
    });
  });
}

function renderPlayerSlots() {
  const container = document.getElementById('player-slot-list');

  if (state.players.length === 0) {
    container.innerHTML = '<p class="placeholder">No player slots available</p>';
    return;
  }

  container.innerHTML = state.players.map(p => `
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
      const playerId = item.dataset.playerId;
      state.socket.emit('ops:selectPlayerSlot', { playerId });
    });
  });
}

// ==================== GM Setup Screen ====================
function initGMSetupScreen() {
  // Copy campaign code button
  document.getElementById('btn-copy-code').addEventListener('click', () => {
    const codeEl = document.getElementById('campaign-code-value');
    const code = codeEl.textContent;
    if (code && code !== '--------') {
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('btn-copy-code');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('btn-copy-success');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('btn-copy-success');
        }, 2000);
      }).catch(() => {
        showNotification('Failed to copy code', 'error');
      });
    }
  });

  // Add player slot
  document.getElementById('btn-add-player-slot').addEventListener('click', () => {
    const name = document.getElementById('new-slot-name').value.trim();
    if (name) {
      state.socket.emit('ops:createPlayerSlot', {
        campaignId: state.campaign.id,
        slotName: name
      });
      document.getElementById('new-slot-name').value = '';
    }
  });

  // Add ship
  document.getElementById('btn-add-ship').addEventListener('click', () => {
    state.socket.emit('ops:getShipTemplates');
    showModal('template-add-ship');
  });

  // Campaign settings
  document.getElementById('campaign-date').addEventListener('change', (e) => {
    state.socket.emit('ops:updateCampaign', {
      campaignId: state.campaign.id,
      current_date: e.target.value
    });
  });

  document.getElementById('campaign-system').addEventListener('change', (e) => {
    state.socket.emit('ops:updateCampaign', {
      campaignId: state.campaign.id,
      current_system: e.target.value
    });
  });

  document.getElementById('god-mode-toggle').addEventListener('change', (e) => {
    state.socket.emit('ops:updateCampaign', {
      campaignId: state.campaign.id,
      god_mode: e.target.checked ? 1 : 0
    });
  });

  // Start session
  document.getElementById('btn-start-session').addEventListener('click', () => {
    state.socket.emit('ops:startSession', { campaignId: state.campaign.id });
  });

  // Logout
  document.getElementById('btn-gm-logout').addEventListener('click', () => {
    state.campaign = null;
    state.isGM = false;
    clearStoredSession();
    showScreen('login');
    document.getElementById('campaign-select').classList.add('hidden');
    document.querySelector('.login-options').classList.remove('hidden');
  });
}

function renderGMSetup() {
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

  // Ships list
  const shipsContainer = document.getElementById('gm-ships-list');
  shipsContainer.innerHTML = state.ships.map(s => `
    <div class="ship-item">
      <span class="name">${escapeHtml(s.name)}</span>
      <span class="type">${s.ship_data?.type || 'Unknown'}</span>
      ${s.is_party_ship ? '<span class="badge">Party Ship</span>' : ''}
    </div>
  `).join('') || '<p class="placeholder">No ships yet</p>';
}

// ==================== Player Setup Screen ====================
function initPlayerSetupScreen() {
  // Import character
  document.getElementById('btn-import-character').addEventListener('click', () => {
    showModal('template-character-import');
  });

  // Quick character (minimal)
  document.getElementById('btn-quick-character').addEventListener('click', () => {
    const name = prompt('Character name:');
    if (name) {
      state.socket.emit('ops:importCharacter', {
        playerId: state.player.id,
        character: { name, skills: {}, stats: {} }
      });
    }
  });

  // Join bridge
  document.getElementById('btn-join-bridge').addEventListener('click', () => {
    if (state.selectedShipId && state.selectedRole) {
      state.socket.emit('ops:joinBridge', {
        playerId: state.player.id,
        shipId: state.selectedShipId,
        role: state.selectedRole
      });
    }
  });

  // Logout
  document.getElementById('btn-player-logout').addEventListener('click', () => {
    state.player = null;
    clearStoredSession();
    showScreen('login');
    document.getElementById('player-slot-select').classList.add('hidden');
    document.getElementById('player-select').classList.add('hidden');
    document.querySelector('.login-options').classList.remove('hidden');
  });
}

function renderPlayerSetup() {
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
  const partyShips = state.ships.filter(s => s.is_party_ship && s.visible_to_players);

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

function renderRoleSelection() {
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
    { id: 'cargo_master', name: 'Cargo', desc: 'Cargo operations' }
  ];

  // Get crew requirements from ship template (if available)
  const crewReqs = state.ship?.template_data?.crew?.minimum || {};

  // Expand roles based on crew requirements
  const roles = [];
  for (const r of baseRoles) {
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
    const isTaken = takenBy && !isSelected;

    return `
      <div class="role-option ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''}"
           data-role-id="${r.id}" data-role-instance="${r.instance}" ${isTaken ? 'disabled' : ''}>
        <div class="role-name">${r.name}</div>
        <div class="role-desc">${r.desc}</div>
        ${takenBy ? `<div class="role-taken-by">Taken by ${escapeHtml(takenBy.name)}</div>` : ''}
      </div>
    `;
  }).join('');

  // Add role selection handlers
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
}

// ==================== Bridge Screen ====================
function initBridgeScreen() {
  // Toggle detail view
  document.getElementById('btn-toggle-detail').addEventListener('click', () => {
    const detail = document.getElementById('role-detail-view');
    const btn = document.getElementById('btn-toggle-detail');
    detail.classList.toggle('hidden');
    btn.textContent = detail.classList.contains('hidden') ? 'Show Details ▼' : 'Hide Details ▲';
  });

  // Add log note
  document.getElementById('btn-add-log').addEventListener('click', () => {
    const note = prompt('Log entry:');
    if (note) {
      state.socket.emit('ops:addLogEntry', {
        shipId: state.ship.id,
        message: note,
        entryType: 'manual'
      });
    }
  });

  // Menu button
  document.getElementById('btn-bridge-menu').addEventListener('click', () => {
    // TODO: Bridge menu modal
    showNotification('Menu coming soon', 'info');
  });

  // GM controls
  initGMControls();
}

function initGMControls() {
  document.getElementById('btn-gm-advance-time').addEventListener('click', () => {
    showModal('template-time-advance');
  });

  document.getElementById('btn-gm-add-contact').addEventListener('click', () => {
    showModal('template-add-contact');
  });

  document.getElementById('btn-gm-initiative').addEventListener('click', () => {
    state.socket.emit('ops:callInitiative', {
      campaignId: state.campaign.id
    });
  });

  document.getElementById('btn-gm-combat').addEventListener('click', () => {
    if (confirm('Start combat mode?')) {
      state.socket.emit('ops:startCombat', {
        campaignId: state.campaign.id
      });
    }
  });

  // System damage button (if exists)
  const damageBtn = document.getElementById('btn-gm-damage');
  if (damageBtn) {
    damageBtn.addEventListener('click', () => {
      showModal('template-apply-damage');
    });
  }
}

function renderBridge() {
  // Ship name
  document.getElementById('bridge-ship-name').textContent = state.ship?.name || 'Unknown Ship';

  // Date/time
  document.getElementById('bridge-date').textContent = state.campaign?.current_date || '???';

  // Guest indicator
  const guestIndicator = document.getElementById('guest-indicator');
  if (state.isGuest) {
    guestIndicator.classList.remove('hidden');
  } else {
    guestIndicator.classList.add('hidden');
  }

  // Ship status bar
  renderShipStatus();

  // Role panel
  const roleConfig = getRoleConfig(state.selectedRole);
  document.getElementById('role-panel-title').textContent = roleConfig.name;
  document.getElementById('role-name').textContent = formatRoleName(state.selectedRole);

  // Render role actions
  renderRoleActions(roleConfig);

  // Render crew list
  renderCrewList();

  // Render contacts
  renderContacts();

  // Render ship log
  renderShipLog();

  // Show GM overlay if GM
  if (state.isGM) {
    document.getElementById('gm-overlay').classList.remove('hidden');
  }
}

function renderShipStatus() {
  const shipState = state.ship?.current_state || {};
  const template = state.ship?.template_data || {};

  // Hull
  const maxHull = template.hull || 100;
  const currentHull = shipState.hull ?? maxHull;
  const hullPercent = Math.round((currentHull / maxHull) * 100);
  document.getElementById('hull-bar').style.width = `${hullPercent}%`;
  document.getElementById('hull-value').textContent = `${hullPercent}%`;

  // Fuel
  const maxFuel = template.fuel || 40;
  const currentFuel = shipState.fuel ?? maxFuel;
  const fuelPercent = Math.round((currentFuel / maxFuel) * 100);
  document.getElementById('fuel-bar').style.width = `${fuelPercent}%`;
  document.getElementById('fuel-value').textContent = `${currentFuel}/${maxFuel}`;

  // Power
  const powerPercent = shipState.powerPercent ?? 100;
  document.getElementById('power-bar').style.width = `${powerPercent}%`;
  document.getElementById('power-value').textContent = `${powerPercent}%`;

  // Location
  const location = state.campaign?.current_system || 'Unknown';
  document.getElementById('location-value').textContent = location;
}

function renderRoleActions(roleConfig) {
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
}

function renderRoleDetailPanel(role) {
  const container = document.getElementById('role-detail-view');
  const shipState = state.ship?.current_state || {};
  const template = state.ship?.template_data || {};

  // Role-specific content
  const detailContent = getRoleDetailContent(role, shipState, template);
  container.innerHTML = detailContent;
}

function getRoleDetailContent(role, shipState, template) {
  switch (role) {
    case 'pilot':
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

    case 'engineer':
      const maxPower = template.powerPlant || 100;
      const currentPower = shipState.power ?? maxPower;
      const powerPercent = Math.round((currentPower / maxPower) * 100);
      const systemStatus = state.systemStatus || {};
      const damagedSystems = state.damagedSystems || [];
      const fuelStatus = state.fuelStatus || {
        total: shipState.fuel ?? template.fuel ?? 40,
        max: template.fuel || 40,
        breakdown: { refined: shipState.fuel ?? template.fuel ?? 40, unrefined: 0, processed: 0 },
        percentFull: 100,
        processing: null,
        fuelProcessor: template.fuelProcessor || false
      };
      const fuelBreakdown = fuelStatus.breakdown || { refined: fuelStatus.total, unrefined: 0, processed: 0 };
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
              <span class="fuel-amount">${fuelStatus.total}/${fuelStatus.max}</span>
              <span class="fuel-unit">tons</span>
              <span class="fuel-percent">(${fuelStatus.percentFull}%)</span>
            </div>
            <div class="fuel-bar-container">
              <div class="fuel-bar-segment refined" style="width: ${(fuelBreakdown.refined / fuelStatus.max) * 100}%" title="Refined: ${fuelBreakdown.refined}t"></div>
              <div class="fuel-bar-segment processed" style="width: ${(fuelBreakdown.processed / fuelStatus.max) * 100}%" title="Processed: ${fuelBreakdown.processed}t"></div>
              <div class="fuel-bar-segment unrefined" style="width: ${(fuelBreakdown.unrefined / fuelStatus.max) * 100}%" title="Unrefined: ${fuelBreakdown.unrefined}t"></div>
            </div>
            <div class="fuel-breakdown">
              <div class="fuel-type refined"><span class="fuel-dot"></span>Refined: ${fuelBreakdown.refined}t</div>
              <div class="fuel-type processed"><span class="fuel-dot"></span>Processed: ${fuelBreakdown.processed}t</div>
              <div class="fuel-type unrefined"><span class="fuel-dot"></span>Unrefined: ${fuelBreakdown.unrefined}t</div>
            </div>
          </div>
          ${fuelBreakdown.unrefined > 0 ? `
          <div class="fuel-warning">
            <span class="warning-icon">⚠</span>
            Unrefined fuel: -2 DM to jump checks, 5% misjump risk
          </div>
          ` : ''}
          <div class="fuel-actions">
            <button onclick="openRefuelModal()" class="btn btn-small">Refuel</button>
            ${fuelStatus.fuelProcessor && fuelBreakdown.unrefined > 0 ? `
            <button onclick="openProcessFuelModal()" class="btn btn-small">Process Fuel</button>
            ` : ''}
          </div>
          ${fuelStatus.processing ? `
          <div class="fuel-processing-status">
            <span class="processing-icon">⚙</span>
            Processing ${fuelStatus.processing.tons}t: ${fuelStatus.processing.hoursRemaining}h remaining
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

    case 'gunner':
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

    case 'captain':
      return `
        <div class="detail-section">
          <h4>Ship Overview</h4>
          <div class="detail-stats">
            <div class="stat-row">
              <span>Ship Class:</span>
              <span class="stat-value">${template.class || state.ship?.name || 'Unknown'}</span>
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
              <span class="stat-value">${state.crewOnline?.length || 0}</span>
            </div>
            <div class="stat-row">
              <span>NPC Crew:</span>
              <span class="stat-value">${state.ship?.npcCrew?.length || 0}</span>
            </div>
          </div>
        </div>
      `;

    case 'sensor_operator':
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
              <span class="stat-value">${state.contacts?.length || 0}</span>
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

    case 'astrogator':
      const jumpStatus = state.jumpStatus || {};
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

      return `
        <div class="detail-section">
          <h4>Navigation</h4>
          <div class="detail-stats">
            <div class="stat-row">
              <span>Current System:</span>
              <span class="stat-value">${state.campaign?.current_system || 'Unknown'}</span>
            </div>
            <div class="stat-row">
              <span>Jump Drive:</span>
              <span class="stat-value">${state.systemStatus?.jDrive?.disabled ? 'DAMAGED' : 'Operational'}</span>
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

    case 'damage_control':
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

    default:
      // Generic detail view for other roles
      return `
        <div class="detail-section">
          <h4>${formatRoleName(role)} Station</h4>
          <div class="placeholder">Station details available during operations.</div>
        </div>
      `;
  }
}

function handleRoleAction(action) {
  // Emit action to server
  state.socket.emit('ops:roleAction', {
    shipId: state.ship.id,
    playerId: state.player.id,
    role: state.selectedRole,
    action: action
  });

  showNotification(`Action: ${formatActionName(action)}`, 'info');
}

function renderCrewList() {
  const container = document.getElementById('crew-list');
  const allCrew = [];

  // Add online players
  state.crewOnline.forEach(c => {
    allCrew.push({
      name: c.name,
      role: c.role,
      isNPC: false,
      isOnline: true,
      isYou: c.id === state.player?.id
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

  container.innerHTML = allCrew.map(c => `
    <div class="crew-member ${c.isNPC ? 'npc' : ''} ${c.isYou ? 'is-you' : ''}">
      <span class="online-indicator ${c.isOnline ? 'online' : ''}"></span>
      <span class="crew-name">${escapeHtml(c.name)}${c.isYou ? ' (You)' : ''}</span>
      <span class="crew-role">${formatRoleName(c.role)}</span>
    </div>
  `).join('') || '<p class="placeholder">No crew</p>';
}

function renderContacts() {
  const container = document.getElementById('sensor-contacts');

  if (state.contacts.length === 0) {
    container.innerHTML = '<p class="placeholder">No contacts detected</p>';
    return;
  }

  container.innerHTML = state.contacts.map(c => {
    const rangeClass = getRangeClass(c.range_band);
    const gmControls = state.isGM ? `
      <div class="contact-gm-controls">
        <button class="btn btn-icon btn-delete-contact" data-id="${c.id}" title="Delete">✕</button>
      </div>
    ` : '';

    return `
      <div class="contact-item ${rangeClass}" data-contact-id="${c.id}">
        <span class="contact-icon">${getContactIcon(c.type)}</span>
        <div class="contact-info">
          <div class="contact-name">${escapeHtml(c.name || c.type)}</div>
          <div class="contact-details">Bearing: ${c.bearing}° · ${c.transponder || 'No transponder'}</div>
        </div>
        <div class="contact-range">
          <div>${formatRange(c.range_km)}</div>
          <div class="range-band">${formatRangeBand(c.range_band)}</div>
        </div>
        ${gmControls}
      </div>
    `;
  }).join('');

  // Add click handlers for contact selection
  container.querySelectorAll('.contact-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Don't select if clicking delete button
      if (e.target.classList.contains('btn-delete-contact')) return;
      // TODO: Show contact details
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
  }
}

function getRangeClass(rangeBand) {
  switch (rangeBand) {
    case 'adjacent':
    case 'close':
    case 'short':
      return 'contact-close';
    case 'medium':
      return 'contact-medium';
    default:
      return 'contact-long';
  }
}

function formatRangeBand(band) {
  const labels = {
    adjacent: 'Adjacent',
    close: 'Close',
    short: 'Short',
    medium: 'Medium',
    long: 'Long',
    veryLong: 'V.Long',
    distant: 'Distant'
  };
  return labels[band] || band;
}

// ==================== Ship Systems ====================

function formatSystemName(system) {
  const names = {
    mDrive: 'M-Drive',
    jDrive: 'J-Drive',
    powerPlant: 'Power Plant',
    sensors: 'Sensors',
    computer: 'Computer',
    armour: 'Armour',
    weapon: 'Weapons',
    fuel: 'Fuel',
    cargo: 'Cargo',
    crew: 'Crew',
    hull: 'Hull'
  };
  return names[system] || system;
}

function renderSystemStatusItem(name, status) {
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

function attemptRepair() {
  const target = document.getElementById('repair-target')?.value;
  if (!target) {
    showNotification('No system selected', 'error');
    return;
  }

  // Get engineer skill from character (default 0)
  const engineerSkill = state.character?.skills?.engineer || 0;

  state.socket.emit('ops:repairSystem', {
    location: target,
    engineerSkill
  });
}

function requestSystemStatus() {
  if (state.socket && state.shipId) {
    state.socket.emit('ops:getSystemStatus');
  }
}

// ==================== Jump Travel ====================

function requestJumpStatus() {
  if (state.socket && state.shipId) {
    state.socket.emit('ops:getJumpStatus');
  }
}

function updateFuelEstimate() {
  const distance = parseInt(document.getElementById('jump-distance')?.value) || 1;
  const hullTonnage = state.ship?.template_data?.tonnage || 100;
  const fuelNeeded = Math.round(hullTonnage * distance * 0.1);
  const estimateEl = document.getElementById('fuel-estimate');
  if (estimateEl) {
    estimateEl.textContent = fuelNeeded;
  }
}

function initiateJump() {
  const destination = document.getElementById('jump-destination')?.value?.trim();
  const distance = parseInt(document.getElementById('jump-distance')?.value) || 1;

  if (!destination) {
    showNotification('Please enter a destination', 'error');
    return;
  }

  state.socket.emit('ops:initiateJump', {
    destination,
    distance
  });
}

function completeJump() {
  state.socket.emit('ops:completeJump');
}

// ==================== Refueling ====================

function openRefuelModal() {
  // Request refuel options from server
  state.socket.emit('ops:getRefuelOptions');
  showModal('template-refuel');
}

function openProcessFuelModal() {
  showModal('template-process-fuel');
}

function populateRefuelModal() {
  const sourceSelect = document.getElementById('refuel-source');
  if (!sourceSelect) return;

  if (!state.fuelSources || state.fuelSources.length === 0) {
    sourceSelect.innerHTML = '<option value="">No fuel sources available</option>';
    return;
  }

  sourceSelect.innerHTML = state.fuelSources.map(s =>
    `<option value="${s.id}">${s.name} - ${s.fuelType} (${s.cost > 0 ? 'Cr' + s.cost + '/ton' : 'Free'})</option>`
  ).join('');

  // Update preview
  updateRefuelAmountPreview();
}

function updateRefuelAmountPreview() {
  const sourceId = document.getElementById('refuel-source')?.value;
  const tons = parseInt(document.getElementById('refuel-amount')?.value) || 0;

  if (sourceId && tons > 0) {
    state.socket.emit('ops:canRefuel', { sourceId, tons });
  } else {
    updateRefuelPreview({ canRefuel: false });
  }
}

function updateRefuelPreview(data) {
  const previewEl = document.getElementById('refuel-preview');
  if (!previewEl) return;

  if (!data.canRefuel) {
    if (data.error) {
      previewEl.innerHTML = `<div class="refuel-error">${data.error}</div>`;
    } else {
      previewEl.innerHTML = '<div class="refuel-info">Select source and amount</div>';
    }
    return;
  }

  previewEl.innerHTML = `
    <div class="refuel-preview-info">
      <div class="preview-row">
        <span>Fuel Type:</span>
        <span class="preview-value">${data.fuelType}</span>
      </div>
      <div class="preview-row">
        <span>Cost:</span>
        <span class="preview-value">${data.cost > 0 ? 'Cr' + data.cost : 'Free'}</span>
      </div>
      <div class="preview-row">
        <span>Time:</span>
        <span class="preview-value">${data.timeHours > 0 ? data.timeHours + ' hours' : 'Instant'}</span>
      </div>
      ${data.skillCheck ? `
      <div class="preview-row">
        <span>Skill Check:</span>
        <span class="preview-value">${data.skillCheck.skill} (${data.skillCheck.difficulty}+)</span>
      </div>
      ` : ''}
    </div>
  `;
}

function executeRefuel() {
  const sourceId = document.getElementById('refuel-source')?.value;
  const tons = parseInt(document.getElementById('refuel-amount')?.value) || 0;

  if (!sourceId || tons <= 0) {
    showNotification('Please select source and amount', 'error');
    return;
  }

  state.socket.emit('ops:refuel', { sourceId, tons });
}

function setRefuelMax() {
  const fuelStatus = state.fuelStatus || {};
  const spaceAvailable = (fuelStatus.max || 40) - (fuelStatus.total || 0);
  const amountInput = document.getElementById('refuel-amount');
  if (amountInput) {
    amountInput.value = spaceAvailable;
    updateRefuelAmountPreview();
  }
}

function executeProcessFuel() {
  const tons = parseInt(document.getElementById('process-amount')?.value) || 0;

  if (tons <= 0) {
    showNotification('Please enter amount to process', 'error');
    return;
  }

  state.socket.emit('ops:startFuelProcessing', { tons });
  closeModal();
}

function setProcessMax() {
  const fuelStatus = state.fuelStatus || {};
  const unrefined = fuelStatus.breakdown?.unrefined || 0;
  const amountInput = document.getElementById('process-amount');
  if (amountInput) {
    amountInput.value = unrefined;
  }
}

function requestFuelStatus() {
  if (state.socket && state.selectedShipId) {
    state.socket.emit('ops:getFuelStatus');
  }
}

function renderShipLog() {
  const container = document.getElementById('ship-log');

  container.innerHTML = state.logEntries.slice(0, 50).map(e => `
    <div class="log-entry ${e.entry_type}">
      <span class="log-time">${e.game_date}</span>
      ${e.actor ? `<span class="log-actor">${escapeHtml(e.actor)}</span>` : ''}
      <span class="log-message">${escapeHtml(e.message)}</span>
    </div>
  `).join('') || '<p class="placeholder">No log entries</p>';
}

function updateAlertStatus(status) {
  const alertEl = document.getElementById('alert-status');
  alertEl.className = `alert-status ${status.toLowerCase()}`;
  alertEl.querySelector('.alert-text').textContent = status.toUpperCase();
}

// ==================== Modal Management ====================
function showModal(templateId) {
  const template = document.getElementById(templateId);
  const modal = document.getElementById('modal-content');
  modal.innerHTML = template.innerHTML;

  // Add close handlers
  modal.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  // Modal-specific handlers
  if (templateId === 'template-create-campaign') {
    document.getElementById('btn-confirm-create-campaign').addEventListener('click', () => {
      const name = document.getElementById('new-campaign-name').value.trim();
      const gmName = document.getElementById('gm-name').value.trim();
      if (name && gmName) {
        state.socket.emit('ops:createCampaign', { name, gmName });
        closeModal();
      }
    });
  }

  if (templateId === 'template-character-import') {
    document.getElementById('btn-save-character').addEventListener('click', () => {
      const character = {
        name: document.getElementById('char-name').value.trim(),
        skills: {
          pilot: parseInt(document.getElementById('skill-pilot').value) || 0,
          astrogation: parseInt(document.getElementById('skill-astrogation').value) || 0,
          engineer: parseInt(document.getElementById('skill-engineer').value) || 0,
          gunnery: parseInt(document.getElementById('skill-gunnery').value) || 0,
          sensors: parseInt(document.getElementById('skill-sensors').value) || 0,
          leadership: parseInt(document.getElementById('skill-leadership').value) || 0,
          tactics: parseInt(document.getElementById('skill-tactics').value) || 0
        },
        stats: {
          DEX: parseInt(document.getElementById('stat-dex').value) || 7,
          INT: parseInt(document.getElementById('stat-int').value) || 7,
          EDU: parseInt(document.getElementById('stat-edu').value) || 7
        }
      };

      if (character.name) {
        state.socket.emit('ops:importCharacter', {
          playerId: state.player.id,
          character
        });
      }
    });
  }

  if (templateId === 'template-time-advance') {
    // Quick time buttons
    modal.querySelectorAll('.time-quick').forEach(btn => {
      btn.addEventListener('click', () => {
        const hours = parseInt(btn.dataset.hours) || 0;
        const minutes = parseInt(btn.dataset.minutes) || 0;
        advanceTime(hours, minutes);
        closeModal();
      });
    });

    // Custom time button
    document.getElementById('btn-custom-time').addEventListener('click', () => {
      const hours = parseInt(document.getElementById('custom-hours').value) || 0;
      const minutes = parseInt(document.getElementById('custom-minutes').value) || 0;
      if (hours > 0 || minutes > 0) {
        advanceTime(hours, minutes);
        closeModal();
      }
    });
  }

  if (templateId === 'template-add-contact') {
    // Quick add buttons set type and submit
    modal.querySelectorAll('.contact-quick').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        document.getElementById('contact-type').value = type;
        // Auto-submit with defaults
        addContact({
          type,
          bearing: 0,
          range_km: 10000,
          signature: 'normal'
        });
        closeModal();
      });
    });

    // Full form submit
    document.getElementById('btn-save-contact').addEventListener('click', () => {
      addContact({
        name: document.getElementById('contact-name').value.trim() || null,
        type: document.getElementById('contact-type').value,
        bearing: parseInt(document.getElementById('contact-bearing').value) || 0,
        range_km: parseInt(document.getElementById('contact-range').value) || 0,
        transponder: document.getElementById('contact-transponder').value.trim() || null,
        signature: document.getElementById('contact-signature').value,
        gm_notes: document.getElementById('contact-notes').value.trim() || null
      });
      closeModal();
    });
  }

  if (templateId === 'template-apply-damage') {
    // Apply damage button
    document.getElementById('btn-apply-damage').addEventListener('click', () => {
      const system = document.getElementById('damage-system').value;
      const severity = parseInt(document.getElementById('damage-severity').value) || 1;
      applySystemDamage(system, severity);
      closeModal();
    });

    // Clear all damage button
    document.getElementById('btn-clear-damage').addEventListener('click', () => {
      if (confirm('Clear all damage from this ship?')) {
        state.socket.emit('ops:clearSystemDamage', {
          shipId: state.shipId,
          location: 'all'
        });
        closeModal();
      }
    });
  }

  if (templateId === 'template-add-ship') {
    // Populate template dropdown (templates should arrive via socket)
    populateShipTemplateSelect();

    // Template selection change - show info
    document.getElementById('ship-template').addEventListener('change', (e) => {
      updateShipTemplateInfo(e.target.value);
    });

    // Create ship button
    document.getElementById('btn-create-ship').addEventListener('click', () => {
      const name = document.getElementById('ship-name').value.trim();
      const templateId = document.getElementById('ship-template').value;
      const isPartyShip = document.getElementById('ship-is-party').checked;

      if (!name) {
        showNotification('Please enter a ship name', 'error');
        return;
      }
      if (!templateId) {
        showNotification('Please select a ship type', 'error');
        return;
      }

      state.socket.emit('ops:addShipFromTemplate', {
        templateId,
        name,
        isPartyShip
      });
    });
  }

  document.getElementById('modal-overlay').classList.remove('hidden');
}

function populateShipTemplateSelect() {
  const select = document.getElementById('ship-template');
  if (!select) return;

  if (!state.shipTemplates || state.shipTemplates.length === 0) {
    select.innerHTML = '<option value="">No templates available</option>';
    return;
  }

  select.innerHTML = '<option value="">-- Select Ship Type --</option>' +
    state.shipTemplates.map(t =>
      `<option value="${t.id}">${t.name} (${t.tonnage}t)</option>`
    ).join('');
}

function updateShipTemplateInfo(templateId) {
  const infoDiv = document.getElementById('ship-template-info');
  if (!infoDiv) return;

  if (!templateId) {
    infoDiv.innerHTML = '';
    return;
  }

  const template = state.shipTemplates?.find(t => t.id === templateId);
  if (!template) {
    infoDiv.innerHTML = '';
    return;
  }

  infoDiv.innerHTML = `
    <div class="template-stats">
      <div class="template-stat">
        <span class="label">Tonnage</span>
        <span class="value">${template.tonnage} dT</span>
      </div>
      <div class="template-stat">
        <span class="label">Jump</span>
        <span class="value">J-${template.jump || 0}</span>
      </div>
      <div class="template-stat">
        <span class="label">Thrust</span>
        <span class="value">${template.thrust || 0}G</span>
      </div>
      <div class="template-stat">
        <span class="label">Hull</span>
        <span class="value">${template.hull} HP</span>
      </div>
      <div class="template-stat">
        <span class="label">Crew Min</span>
        <span class="value">${Object.values(template.crew || {}).reduce((a, b) => a + b, 0)}</span>
      </div>
    </div>
  `;
}

function addContact(contactData) {
  state.socket.emit('ops:addContact', contactData);
}

function applySystemDamage(system, severity) {
  state.socket.emit('ops:applySystemDamage', {
    shipId: state.shipId,
    location: system,
    severity
  });
}

function advanceTime(hours, minutes) {
  state.socket.emit('ops:advanceTime', {
    campaignId: state.campaign.id,
    hours,
    minutes
  });
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ==================== Utilities ====================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatRoleName(role) {
  if (!role) return 'None';
  return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatActionName(action) {
  return action.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

function formatRange(range) {
  if (range >= 1000) {
    return `${(range / 1000).toFixed(1)}k km`;
  }
  return `${range} km`;
}

function getContactIcon(type) {
  const icons = {
    ship: '◇',
    station: '★',
    planet: '●',
    unknown: '?',
    hostile: '◆'
  };
  return icons[type] || icons.unknown;
}

function getRoleConfig(role) {
  const configs = {
    pilot: {
      name: 'Helm Control',
      actions: ['setCourse', 'dock', 'undock', 'evasiveAction', 'land']
    },
    captain: {
      name: 'Command',
      actions: ['setAlertStatus', 'issueOrders', 'authorizeWeapons', 'hail']
    },
    astrogator: {
      name: 'Navigation',
      actions: ['plotJump', 'calculateIntercept', 'verifyPosition']
    },
    engineer: {
      name: 'Engineering',
      actions: ['allocatePower', 'fieldRepair', 'overloadSystem']
    },
    sensor_operator: {
      name: 'Sensors & Comms',
      actions: ['activeScan', 'deepScan', 'hail', 'jam']
    },
    gunner: {
      name: 'Weapons',
      actions: ['fireWeapon', 'pointDefense', 'sandcaster']
    },
    damage_control: {
      name: 'Damage Control',
      actions: ['directRepair', 'prioritizeSystem', 'emergencyProcedure']
    },
    marines: {
      name: 'Security',
      actions: ['securityPatrol', 'prepareBoarding', 'repelBoarders']
    },
    medic: {
      name: 'Medical Bay',
      actions: ['treatInjury', 'triage', 'checkSupplies']
    },
    steward: {
      name: 'Passenger Services',
      actions: ['attendPassenger', 'checkSupplies', 'boostMorale']
    },
    cargo_master: {
      name: 'Cargo Operations',
      actions: ['checkManifest', 'loadCargo', 'unloadCargo']
    }
  };
  return configs[role] || { name: 'Unknown Role', actions: [] };
}

function showNotification(message, type = 'info') {
  // Simple notification - could be enhanced with toast UI
  console.log(`[${type.toUpperCase()}] ${message}`);

  // For now, use browser notification if available
  if (type === 'error') {
    alert(message);
  }
}

// ==================== Session Storage (Stage 3.5.5) ====================
const SESSION_KEY = 'ops_session';

function saveSession() {
  const sessionData = {
    campaignId: state.campaign?.id,
    accountId: state.player?.id,
    shipId: state.selectedShipId || state.ship?.id,
    role: state.selectedRole,
    isGM: state.isGM
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
}

function getStoredSession() {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (e) {
    console.warn('Failed to clear session:', e);
  }
}

function tryReconnect() {
  const session = getStoredSession();
  if (session && session.campaignId) {
    console.log('Attempting to reconnect to session:', session);
    state.socket.emit('ops:reconnect', session);
  } else {
    showNotification('Connected', 'success');
  }
}

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', () => {
  initSocket();
  initLoginScreen();
  initGMSetupScreen();
  initPlayerSetupScreen();
  initBridgeScreen();

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  });
});
