/* global io, GUIAdapter, renderers, SharedMap */
const state = {
  socket: null,
  adapter: null,
  mode: null, // 'gm' | 'player' | 'solo'
  campaignId: null,
  campaignCode: null,
  shipId: null,
  role: null,
  slotId: null,
  userName: null,
  campaigns: [],
  playerSlots: [],
  ships: [],
  availableRoles: [],
  crew: [],
  contacts: [],
  connected: false,
  sharedMapSettings: { scale: 64, style: 'atlas' },
  sharedMapActive: false,
  sharedMapView: null,
  roleViewModel: null,
  debug: false  // Set to true to enable action logging
};


function init() {
  console.log('[OPS-V2] Initializing V2 interface...');

  // Initialize GUI adapter
  state.adapter = new GUIAdapter({
    container: document.getElementById('app'),
    onAction: handleAction
  });

  // Connect to socket
  connectSocket();

  console.log('[OPS-V2] V2 interface ready');
}


function connectSocket() {
  state.socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  // Connection events
  state.socket.on('connect', handleConnect);
  state.socket.on('disconnect', handleDisconnect);
  state.socket.on('connect_error', handleConnectError);

  // Campaign events
  state.socket.on('ops:campaigns', handleCampaigns);
  state.socket.on('ops:campaignData', handleCampaignData);
  state.socket.on('ops:campaignCreated', handleCampaignCreated);

  // Player events
  state.socket.on('ops:campaignJoined', handleCampaignJoined);
  state.socket.on('ops:playerSlots', handlePlayerSlots);
  state.socket.on('ops:playerSlotSelected', handlePlayerSlotSelected);
  state.socket.on('ops:playerJoined', handlePlayerJoined);
  state.socket.on('ops:slotStatusUpdate', handleSlotStatusUpdate);

  // Bridge events
  state.socket.on('ops:bridgeUpdate', handleBridgeUpdate);
  state.socket.on('ops:roleUpdate', handleRoleUpdate);

  // Error events
  state.socket.on('ops:error', handleError);

  state.socket.on('ops:bridgeJoined', handleBridgeJoined);
  state.socket.on('ops:crewOnBridge', handleCrewUpdate);
  state.socket.on('ops:contacts', handleContacts);
  state.socket.on('ops:sessionStarted', handleSessionStarted);
  state.socket.on('ops:alertStatusChanged', handleAlertStatusChanged);
  state.socket.on('ops:timeAdvanced', handleTimeAdvanced);
  state.socket.on('ops:crewMemberRelieved', handleCrewMemberRelieved);
  state.socket.on('ops:mapShared', (d) => SharedMap.handleMapShared(d, state));
  state.socket.on('ops:mapUnshared', (d) => SharedMap.handleMapUnshared(d, state));
  state.socket.on('ops:mapViewUpdated', (d) => SharedMap.handleMapViewUpdated(d, state));
  state.socket.on('ops:mapState', (d) => SharedMap.handleMapState(d, state));

  // Mail events
  state.socket.on('ops:mailList', (d) => EmailPanel.handleMailData({ messages: d.mail, unreadCount: d.unreadCount }));
  state.socket.on('ops:mailSent', () => { showToast('Message sent'); state.socket.emit('ops:getMail'); });
  state.socket.on('ops:newMail', (d) => { EmailPanel.updateBadge(d.unreadCount || 1); });
  state.socket.on('ops:mailUpdated', () => { state.socket.emit('ops:getMail'); });
}

function handleConnect() {
  console.log('[OPS-V2] Connected to server');
  state.connected = true;
  state.adapter.setVisible('connection-status', false);

  // Ping to keep alive
  setInterval(() => {
    if (state.connected) {
      state.socket.emit('ops:ping');
    }
  }, 30000);
}

function handleDisconnect() {
  console.log('[OPS-V2] Disconnected from server');
  state.connected = false;
  state.adapter.setText('connection-text', 'Disconnected - Reconnecting...');
  state.adapter.setVisible('connection-status', true);
}

function handleConnectError(err) {
  console.error('[OPS-V2] Connection error:', err.message);
  showError('Connection failed: ' + err.message);
}


function handleCampaigns(data) {
  console.log('[OPS-V2] Received campaigns:', data.campaigns?.length || 0);
  state.campaigns = data.campaigns || [];

  const container = document.getElementById('campaign-list');
  if (container) {
    if (state.campaigns.length === 0) {
      container.innerHTML = '<div class="empty-list">No campaigns yet</div>';
    } else {
      container.innerHTML = state.campaigns.map(c => renderers.renderCampaignItem(c)).join('');
    }
  }
}

function handleCampaignData(data) {
  console.log('[OPS-V2] Campaign data:', data.campaign?.name);
  state.campaignId = data.campaign?.id;
  state.campaignCode = data.campaign?.id?.substring(0, 8)?.toUpperCase() || null;

  // Auto-select first party ship
  const partyShips = (data.ships || []).filter(s => s.is_party_ship);
  if (partyShips.length > 0) {
    state.shipId = partyShips[0].id;
  }

  state.adapter.setText('campaign-code-value', state.campaignCode || '--------');
  state.adapter.setText('gm-campaign-name', data.campaign?.name || 'Campaign');

  if (state.mode === 'gm') {
    state.adapter.showScreen('gm-setup-screen');
  }
}

function handleCampaignCreated(data) {
  console.log('[OPS-V2] Campaign created:', data.campaign?.name);
  handleCampaignData(data);
}

function handleCampaignJoined(data) {
  console.log('[OPS-V2] Campaign joined:', data.campaign?.name);
  state.campaignId = data.campaign?.id;
  state.campaignCode = data.campaign?.id?.substring(0, 8)?.toUpperCase() || null;
  // Delegate to player slots handler with available slots
  handlePlayerSlots({ slots: data.availableSlots || [] });
}

function handlePlayerSlots(data) {
  console.log('[OPS-V2] Player slots:', data.slots?.length || 0);
  state.playerSlots = data.slots || [];

  const container = document.getElementById('player-slot-list');
  if (container) {
    if (state.playerSlots.length === 0) {
      container.innerHTML = '<div class="empty-list">No slots available</div>';
    } else {
      container.innerHTML = state.playerSlots.map(s => renderers.renderPlayerSlot(s)).join('');
    }
  }

  // Show slot selection
  state.adapter.setVisible('player-select', false);
  state.adapter.setVisible('player-slot-select', true);
}

function handlePlayerSlotSelected(data) {
  console.log('[OPS-V2] Player slot selected:', data.account?.slot_name);
  state.slotId = data.account?.id;
  state.userName = data.account?.slot_name;
  state.ships = data.ships || [];
  state.availableRoles = data.availableRoles || [];

  // Use pre-existing role/ship from account if available
  const existingRole = data.account?.role;
  const existingShipId = data.account?.ship_id;
  if (existingShipId) state.shipId = existingShipId;
  if (existingRole) state.role = existingRole;

  // Populate ships list
  const shipContainer = document.getElementById('ship-select-list');
  if (shipContainer) {
    if (state.ships.length === 0) {
      shipContainer.innerHTML = '<div class="empty-list">No ships available</div>';
    } else if (state.ships.length === 1 || existingShipId) {
      // Auto-select single ship or use existing
      state.shipId = existingShipId || state.ships[0].id;
      const shipName = state.ships.find(s => s.id === state.shipId)?.name || 'Ship';
      shipContainer.innerHTML = `<div class="ship-card selected">${shipName}</div>`;
    } else {
      shipContainer.innerHTML = state.ships.map(s =>
        `<div class="ship-card" data-action="selectShip" data-ship-id="${s.id}">${s.name}</div>`
      ).join('');
    }
  }

  // Populate roles list, highlight existing role
  const roleContainer = document.getElementById('role-select-list');
  if (roleContainer) {
    roleContainer.innerHTML = state.availableRoles.map(r =>
      `<div class="role-option ${r === existingRole ? 'selected' : ''}" data-action="selectRole" data-role-id="${r}">${r}</div>`
    ).join('');
  }

  // Enable join button if ship and role are set
  const joinBtn = document.getElementById('btn-join-bridge');
  if (joinBtn && state.shipId && state.role) {
    joinBtn.disabled = false;
  }

  // BUG FIX: Solo mode should auto-join bridge
  if (state.mode === 'solo') {
    // Auto-select ship if not already set
    if (!state.shipId && state.ships.length > 0) {
      state.shipId = state.ships[0].id;
    }
    // Auto-select role: prefer captain, or first available
    if (!state.role && state.availableRoles.length > 0) {
      state.role = state.availableRoles.includes('captain')
        ? 'captain'
        : state.availableRoles[0];
    }
    // Auto-join bridge if we have ship and role
    if (state.shipId && state.role) {
      console.log('[OPS-V2] Solo mode: auto-joining bridge as', state.role);
      joinBridge();
      return;
    }
  }

  state.adapter.showScreen('player-setup-screen');
}

function handlePlayerJoined(data) {
  console.log('[OPS-V2] Player joined:', data.slotId);
  state.slotId = data.slotId;
  state.role = data.role;
  state.userName = data.name;

  // Navigate to player setup or bridge
  if (data.onBridge) {
    state.adapter.showScreen('bridge-screen');
    updateBridgeHeader(data);
  } else {
    state.adapter.showScreen('player-setup-screen');
  }
}

function handleSlotStatusUpdate(data) {
  if (state.playerSlots.length > 0) handlePlayerSlots({ slots: data.slots || state.playerSlots });
}
function handleBridgeUpdate(data) {
  updateBridgeHeader(data);
  if (data.hull) state.adapter.setText('hull-value', `${data.hull.percent || 100}%`);
  if (data.power) state.adapter.setText('power-value', `${data.power.percent || 100}%`);
  if (data.fuel) state.adapter.setText('fuel-value', `${data.fuel.percent || 100}%`);
  if (data.crew) state.adapter.setHtml('crew-list', data.crew.map(c => renderers.renderCrewMember(c)).join(''));
  if (data.contacts) state.adapter.setHtml('contact-list', data.contacts.map(c => renderers.renderContactItem(c)).join(''));
}
function handleRoleUpdate(data) {
  if (data && data.viewModel) {
    console.log('[OPS-V2] ViewModel received:', data.viewModel.type);
    state.roleViewModel = data.viewModel;
    renderRolePanel();
  }
}
function handleError(error) { console.error('[OPS-V2] Server error:', error.message); showError(error.message); }

function handleBridgeJoined(data) {
  console.log('[OPS-V2] Bridge joined:', data.ship?.name);
  // Combine player accounts and NPC crew
  const allCrew = [];
  // Add player accounts (filtered to exclude GM)
  (data.crew || []).forEach(c => {
    if (c.role === 'gm' || c.isGM) return;
    allCrew.push({ ...c, name: c.character_name || c.slot_name || c.name || 'Unknown', isNPC: false });
  });
  // Add NPC crew for roles not filled by players
  const filledRoles = new Set(allCrew.map(c => c.role));
  (data.npcCrew || []).forEach(npc => {
    if (!filledRoles.has(npc.role)) {
      allCrew.push({ ...npc, isNPC: true });
    }
  });
  state.crew = allCrew;
  state.contacts = data.contacts || [];
  state.shipId = data.ship?.id || state.shipId;
  // Store campaign location for shared map
  state.sharedMapView = {
    sector: data.campaign?.current_sector || 'Spinward Marches',
    hex: data.campaign?.current_hex || '1910',
    system: data.campaign?.current_system || 'Unknown'
  };
  // Update header with ship/campaign data
  state.adapter.setText('bridge-ship-name', data.ship?.name || 'Unknown Ship');
  state.adapter.setText('bridge-location', data.campaign?.current_system || 'Unknown');
  state.adapter.setText('bridge-date', data.campaign?.current_date || '---');
  state.adapter.setText('bridge-user-role', data.role || 'GM');
  state.adapter.setText('bridge-user-name', data.isGM ? 'GM' : (state.userName || 'Player'));
  state.isGM = data.isGM || false;

  // Show GM menu section if user is GM
  const gmSection = document.getElementById('gm-menu-section');
  if (gmSection) {
    gmSection.style.display = state.isGM ? 'block' : 'none';
  }

  renderCrewList(); renderContacts(); renderRolePanel(); state.adapter.showScreen('bridge-screen');

  // Store system data for viewscreen
  if (data.systemData && window.v2SystemMap) {
    window.v2SystemMap.system = data.systemData;
    window.v2SystemMap.celestialObjects = data.systemData?.celestialObjects || data.systemData?.planets || [];
  }

  // Initialize viewscreen
  const viewscreenEl = document.getElementById('viewscreen-content');
  if (viewscreenEl && window.initV2Viewscreen) {
    window.initV2Viewscreen(viewscreenEl, state.role);
  }

  // Start ViewModel polling after successful bridge join
  startViewModelPolling();
}

// TASK 2: ViewModel polling for continuous updates
let viewModelPollInterval = null;
function startViewModelPolling() {
  // Prevent duplicate intervals
  if (viewModelPollInterval) return;
  viewModelPollInterval = setInterval(() => {
    if (state.role && state.shipId && state.socket && state.connected) {
      state.socket.emit('ops:getRoleUpdate', { role: state.role });
    }
  }, 5000);
}

function handleCrewUpdate(data) {
  // ops:crewOnBridge sends a single crew member joining, not the full list
  // Only add/update if this is a non-GM crew member
  if (data.role === 'gm' || data.isGM) return;
  if (data.accountId) {
    const existing = state.crew.findIndex(c => c.id === data.accountId || c.accountId === data.accountId);
    if (existing >= 0) {
      state.crew[existing] = { ...state.crew[existing], ...data, name: data.name || state.crew[existing].name };
    } else {
      state.crew.push({ ...data, name: data.name || 'Unknown', isNPC: false });
    }
    renderCrewList();
  }
}
function handleContacts(data) { state.contacts = data.contacts || []; renderContacts(); }
function handleSessionStarted(data) { console.log('[OPS-V2] Session started:', data.currentSystem); }
function renderCrewList() {
  const el = document.getElementById('crew-list');
  if (!el) return;
  el.innerHTML = state.crew.length
    ? state.crew.map(c => renderers.renderCrewMember(c)).join('')
    : '<div class="empty-list">No crew on bridge</div>';
}
function renderRolePanel() {
  const el = document.getElementById('role-panel');
  if (!el) return;
  const role = state.role || 'gm';
  if (state.roleViewModel && renderers.renderRole) {
    el.innerHTML = renderers.renderRole(state.roleViewModel);
  } else {
    el.innerHTML = `<div class="panel-header"><span class="panel-title">${role.toUpperCase()}</span></div><div class="panel-body">Awaiting data...</div>`;
  }
}
function renderContacts() { const el = document.getElementById('contact-list'); if (el) el.innerHTML = state.contacts.length ? state.contacts.map(c => renderers.renderContactItem(c)).join('') : '<div class="empty-list">No contacts</div>'; }

function handleAlertStatusChanged(data) {
  const status = data.alertStatus || data.status || 'NORMAL';
  const alertEl = document.getElementById('alert-status');
  if (alertEl) { alertEl.className = `alert-status alert-${status.toLowerCase()}`; const t = alertEl.querySelector('.alert-text'); if (t) t.textContent = status === 'RED' ? 'Red Alert' : status === 'YELLOW' ? 'Yellow Alert' : 'Normal'; }
  const bridge = document.getElementById('bridge-screen');
  if (bridge) bridge.className = `screen active alert-border-${status.toLowerCase()}`;
  showToast(`Alert: ${status}`);
}
function handleTimeAdvanced(data) {
  if (data.newDate) { state.adapter.setText('bridge-date', data.newDate); const el = document.getElementById('system-map-date'); if (el) el.textContent = data.newDate; showToast(`Time: ${data.newDate}`); }
}
function handleCrewMemberRelieved(data) {
  const idx = state.crew.findIndex(c => c.id === data.accountId || c.accountId === data.accountId);
  if (idx >= 0) state.crew[idx].role = null; renderCrewList(); showToast(`${data.slotName || 'Crew member'} has been relieved`);
}


const actionHandlers = {
  gmLogin: startGMLogin, playerLogin: startPlayerLogin, soloDemo: startSoloDemo,
  backToLogin, createCampaign, joinCampaign, startSession, joinBridge, copyCode, logout,
  backToPlayerSelect: () => { state.adapter.setVisible('player-slot-select', false); state.adapter.setVisible('player-select', true); },
  selectCampaign: (d) => selectCampaign(d.campaignId),
  selectSlot: (d) => selectSlot(d.slotId),
  selectShip: (d) => selectShip(d.shipId),
  selectRole: (d) => selectRole(d.roleId),
  closeToast: () => state.adapter.setVisible('error-toast', false),
  openMenu: toggleMenu,
  closeMenu: toggleMenu,
  setAlert: (d) => state.socket.emit('ops:setAlertStatus', { alertStatus: d.alert }),
  openSharedMap: () => { toggleMenu(); SharedMap.show(state); },
  closeMap: () => SharedMap.close(),
  shareMap: () => SharedMap.share(state),
  unshareMap: () => SharedMap.unshare(state),
  recenterPlayers: () => SharedMap.recenter(state),
  gotoHex: () => SharedMap.gotoHex(state),
  openEmail: () => { toggleMenu(); EmailPanel.show(state); },
  closeEmail: () => EmailPanel.close(),
  sendEmail: () => EmailPanel.sendEmail(state),
  saveDraft: () => EmailPanel.saveDraft(state),
  backToInbox: () => EmailPanel.backToInbox(),
  openSettings: () => showToast('Settings not yet implemented'),
  logout: () => { toggleMenu(); state.adapter.showScreen('login-screen'); },

  // === Menu Actions ===
  openBattleConsole: () => { toggleMenu(); if (window.BattleConsole) window.BattleConsole.show(state.socket); },
  enterCombat: () => { toggleMenu(); state.socket.emit('ops:enterCombat', {}); showToast('Entering combat...'); },
  loadDrill: () => { toggleMenu(); showToast('Drill loading not yet implemented'); },
  openContacts: () => { toggleMenu(); showToast('NPC contacts not yet implemented'); },
  openSystemMap: () => { toggleMenu(); if (window.v2SystemMap) window.v2SystemMap.toggle(); },
  openShipLog: () => { toggleMenu(); showToast('Ship log not yet implemented'); },

  // === Combat Actions (TASK 1) ===
  fireWeapon: (d) => {
    if (state.debug) console.log('[OPS-V2] fireWeapon', d);
    state.socket.emit('ops:fireWeapon', {
      targetId: d.targetId,
      weaponId: d.weaponId,
      targetSystem: d.targetSystem
    });
  },
  authorizeWeapons: (d) => {
    if (state.debug) console.log('[OPS-V2] authorizeWeapons', d);
    state.socket.emit('ops:authorizeWeapons', { mode: d.mode });
  },

  // === Engineering Actions (TASK 2) ===
  repairSystem: (d) => {
    if (state.debug) console.log('[OPS-V2] repairSystem', d);
    state.socket.emit('ops:repairSystem', { systemId: d.systemId });
  },
  applySystemDamage: (d) => {
    if (state.debug) console.log('[OPS-V2] applySystemDamage', d);
    state.socket.emit('ops:applySystemDamage', {
      systemId: d.systemId,
      damageLevel: d.damageLevel
    });
  },
  clearSystemDamage: (d) => {
    if (state.debug) console.log('[OPS-V2] clearSystemDamage', d);
    state.socket.emit('ops:clearSystemDamage', { systemId: d.systemId });
  },
  godModeRefuel: (d) => {
    if (state.debug) console.log('[OPS-V2] godModeRefuel', d);
    state.socket.emit('ops:godModeRefuel', { amount: d?.amount });
  },

  // === Navigation Actions (TASK 3) ===
  travelToSystem: (d) => {
    if (state.debug) console.log('[OPS-V2] travelToSystem', d);
    state.socket.emit('ops:travelToSystem', {
      destinationId: d.destinationId,
      thrust: d.thrust
    });
  },
  setCurrentSystem: (d) => {
    if (state.debug) console.log('[OPS-V2] setCurrentSystem', d);
    state.socket.emit('ops:setCurrentSystem', { systemId: d.systemId });
  },
  gmRelocateShip: (d) => {
    if (state.debug) console.log('[OPS-V2] gmRelocateShip', d);
    state.socket.emit('ops:gmRelocateShip', {
      shipId: d.shipId,
      hex: d.hex,
      systemId: d.systemId
    });
  },

  // === Sensor Actions (TASK 4) ===
  addContact: (d) => {
    if (state.debug) console.log('[OPS-V2] addContact', d);
    state.socket.emit('ops:addContact', {
      designation: d.designation,
      type: d.type,
      bearing: d.bearing,
      range: d.range
    });
  },
  shareStarSystem: (d) => {
    if (state.debug) console.log('[OPS-V2] shareStarSystem', d);
    state.socket.emit('ops:shareStarSystem', {
      systemId: d.systemId,
      targetShipId: d.targetShipId
    });
  },
  getSystemStatus: (d) => {
    if (state.debug) console.log('[OPS-V2] getSystemStatus', d);
    state.socket.emit('ops:getSystemStatus', { systemId: d.systemId });
  },

  // === Time/Comms Actions (TASK 5) ===
  advanceTime: (d) => {
    if (state.debug) console.log('[OPS-V2] advanceTime', d);
    state.socket.emit('ops:advanceTime', {
      hours: d.hours,
      days: d.days,
      minutes: d.minutes
    });
  },
  bridgeTransmission: (d) => {
    if (state.debug) console.log('[OPS-V2] bridgeTransmission', d);
    state.socket.emit('ops:bridgeTransmission', {
      message: d.message,
      channel: d.channel,
      targetId: d.targetId
    });
  },

  // === Module Actions (TASK 6) ===
  importModule: (d) => {
    if (state.debug) console.log('[OPS-V2] importModule', d);
    state.socket.emit('ops:importModule', {
      moduleType: d.moduleType,
      data: d.data
    });
  },
  deleteModule: (d) => {
    if (state.debug) console.log('[OPS-V2] deleteModule', d);
    state.socket.emit('ops:deleteModule', { moduleId: d.moduleId });
  },
  toggleModule: (d) => {
    if (state.debug) console.log('[OPS-V2] toggleModule', d);
    state.socket.emit('ops:toggleModule', {
      moduleId: d.moduleId,
      enabled: d.enabled
    });
  },
  getModuleSummary: (d) => {
    if (state.debug) console.log('[OPS-V2] getModuleSummary', d);
    state.socket.emit('ops:getModuleSummary', { moduleType: d.moduleType });
  },

  // === GM Actions (TASK 7) ===
  getPrepData: (d) => {
    if (state.debug) console.log('[OPS-V2] getPrepData', d);
    state.socket.emit('ops:getPrepData', {});
  },
  getShipSystems: (d) => {
    if (state.debug) console.log('[OPS-V2] getShipSystems', d);
    state.socket.emit('ops:getShipSystems', { shipId: d.shipId });
  },

  // === Additional Combat Actions ===
  fire: (d) => {
    if (state.debug) console.log('[OPS-V2] fire', d);
    state.socket.emit('ops:fireWeapon', { weaponId: d.weaponId, targetId: d.targetId });
  },
  selectTarget: (d) => {
    if (state.debug) console.log('[OPS-V2] selectTarget', d);
    state.socket.emit('ops:selectTarget', { targetId: d.targetId });
  },
  evasiveManeuvers: (d) => {
    if (state.debug) console.log('[OPS-V2] evasiveManeuvers', d);
    state.socket.emit('ops:evasiveManeuvers', { enabled: d.enabled !== false });
  },

  // === Sensor Actions ===
  scan: (d) => {
    if (state.debug) console.log('[OPS-V2] scan', d);
    state.socket.emit('ops:scanContact', { contactId: d.contactId, scanType: d.scanType || 'active' });
  },
  lock: (d) => {
    if (state.debug) console.log('[OPS-V2] lock', d);
    state.socket.emit('ops:lockTarget', { contactId: d.contactId });
  },
  unlock: (d) => {
    if (state.debug) console.log('[OPS-V2] unlock', d);
    state.socket.emit('ops:unlockTarget', { contactId: d.contactId });
  },

  // === Engineering Actions ===
  adjustPower: (d) => {
    if (state.debug) console.log('[OPS-V2] adjustPower', d);
    state.socket.emit('ops:adjustPower', { systemId: d.systemId, level: d.level });
  },
  repair: (d) => {
    if (state.debug) console.log('[OPS-V2] repair', d);
    state.socket.emit('ops:repairSystem', { systemId: d.systemId });
  },
  processFuel: (d) => {
    if (state.debug) console.log('[OPS-V2] processFuel', d);
    state.socket.emit('ops:startFuelProcessing', { tons: d.tons || 'all' });
  },

  // === Damage Control Actions ===
  repairHull: (d) => {
    if (state.debug) console.log('[OPS-V2] repairHull', d);
    state.socket.emit('ops:repairHull', { amount: d.amount });
  },
  firefighting: (d) => {
    if (state.debug) console.log('[OPS-V2] firefighting', d);
    state.socket.emit('ops:firefighting', { compartmentId: d.compartmentId });
  },
  sealBreach: (d) => {
    if (state.debug) console.log('[OPS-V2] sealBreach', d);
    state.socket.emit('ops:sealBreach', { compartmentId: d.compartmentId });
  },

  // === Captain/Order Actions ===
  issueOrder: (d) => {
    if (state.debug) console.log('[OPS-V2] issueOrder', d);
    state.socket.emit('ops:issueOrder', { text: d.text, targetRole: d.targetRole, priority: d.priority });
  },

  // === Navigation/Jump Actions ===
  setDestination: (d) => {
    if (state.debug) console.log('[OPS-V2] setDestination', d);
    state.socket.emit('ops:setDestination', { destinationId: d.destinationId, hex: d.hex });
  },
  plotJump: (d) => {
    if (state.debug) console.log('[OPS-V2] plotJump', d);
    state.socket.emit('ops:plotJump', { destination: d.destination, sector: d.sector, hex: d.hex });
  },
  initiateJump: (d) => {
    if (state.debug) console.log('[OPS-V2] initiateJump', d);
    state.socket.emit('ops:initiateJump', {});
  },
  cancelJump: (d) => {
    if (state.debug) console.log('[OPS-V2] cancelJump', d);
    state.socket.emit('ops:cancelJump', {});
  },

  // === Comms Actions ===
  hail: (d) => {
    if (state.debug) console.log('[OPS-V2] hail', d);
    state.socket.emit('ops:hailContact', { contactId: d.contactId });
  },
  broadcast: (d) => {
    if (state.debug) console.log('[OPS-V2] broadcast', d);
    state.socket.emit('ops:broadcast', { message: d.message, channel: d.channel });
  },

  // === Medic Actions ===
  treatPatient: (d) => {
    if (state.debug) console.log('[OPS-V2] treatPatient', d);
    state.socket.emit('ops:treatPatient', { patientId: d.patientId, treatmentType: d.treatmentType });
  },
  checkSupplies: (d) => {
    if (state.debug) console.log('[OPS-V2] checkSupplies', d);
    state.socket.emit('ops:checkMedicalSupplies', {});
  },

  // === Marines Actions ===
  deploy: (d) => {
    if (state.debug) console.log('[OPS-V2] deploy', d);
    state.socket.emit('ops:deployMarines', { location: d.location, missionType: d.missionType });
  },
  drill: (d) => {
    if (state.debug) console.log('[OPS-V2] drill', d);
    state.socket.emit('ops:marineDrill', { drillType: d.drillType });
  },

  // === Steward Actions ===
  servePassengers: (d) => {
    if (state.debug) console.log('[OPS-V2] servePassengers', d);
    state.socket.emit('ops:servePassengers', { serviceType: d.serviceType });
  },
  checkInventory: (d) => {
    if (state.debug) console.log('[OPS-V2] checkInventory', d);
    state.socket.emit('ops:checkInventory', { category: d.category });
  },

  // === Role Switching ===
  switchRole: (d) => {
    if (state.debug) console.log('[OPS-V2] switchRole', d);
    state.role = d.roleId;
    state.socket.emit('ops:switchRole', { newRole: d.roleId });
  }
};
function handleAction(action, data) {
  console.log('[OPS-V2] Action:', action, data);
  const handler = actionHandlers[action];
  if (handler) handler(data); else console.log('[OPS-V2] Unknown action:', action);
}


function startGMLogin() {
  state.mode = 'gm';
  state.adapter.setVisible('login-options', false);
  state.adapter.setVisible('campaign-select', true);

  // Request campaigns
  state.socket.emit('ops:getCampaigns');
}

function startPlayerLogin() {
  state.mode = 'player';
  state.adapter.setVisible('login-options', false);
  state.adapter.setVisible('player-select', true);
}

function startSoloDemo() {
  state.mode = 'solo';
  console.log('[OPS-V2] Starting solo demo...');
  state.socket.emit('ops:joinSoloDemoCampaign');
}

function backToLogin() {
  state.mode = null;
  state.adapter.setVisible('campaign-select', false);
  state.adapter.setVisible('player-select', false);
  state.adapter.setVisible('player-slot-select', false);
  state.adapter.setVisible('login-options', true);
}

function selectCampaign(campaignId) {
  console.log('[OPS-V2] Selecting campaign:', campaignId);
  state.socket.emit('ops:selectCampaign', { campaignId });
}

function createCampaign() {
  const name = prompt('Campaign name:');
  if (name) {
    state.socket.emit('ops:createCampaign', { name });
  }
}

function joinCampaign() {
  const codeInput = document.getElementById('campaign-code');
  const code = codeInput?.value?.trim();

  if (!code) {
    showError('Please enter a campaign code');
    return;
  }

  console.log('[OPS-V2] Joining campaign with code:', code);
  state.socket.emit('ops:joinCampaignAsPlayer', { campaignId: code });
}

function selectSlot(slotId) {
  console.log('[OPS-V2] Selecting slot:', slotId);
  // Server expects accountId, not slotId
  state.socket.emit('ops:selectPlayerSlot', { accountId: slotId });
}

function selectShip(shipId) {
  console.log('[OPS-V2] Selecting ship:', shipId);
  state.shipId = shipId;
  // Update UI to show selection
  document.querySelectorAll('#ship-select-list .ship-card').forEach(el => {
    el.classList.toggle('selected', el.dataset.shipId === shipId);
  });
  // Enable join button
  const joinBtn = document.getElementById('btn-join-bridge');
  if (joinBtn) joinBtn.disabled = false;
}

function selectRole(roleId) {
  console.log('[OPS-V2] Selecting role:', roleId);
  state.role = roleId;
  // Update UI to show selection
  document.querySelectorAll('#role-select-list .role-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.roleId === roleId);
  });
  // Enable join button
  const joinBtn = document.getElementById('btn-join-bridge');
  if (joinBtn) joinBtn.disabled = false;
}

function startSession() {
  console.log('[OPS-V2] Starting session...');
  state.socket.emit('ops:startSession', { campaignId: state.campaignId });
  // GM joins bridge after starting session
  state.socket.emit('ops:joinBridge', {
    shipId: state.shipId,
    role: 'gm',
    isGM: true
  });
}

function joinBridge() {
  console.log('[OPS-V2] Joining bridge...');
  state.socket.emit('ops:joinBridge', {
    campaignId: state.campaignId,
    slotId: state.slotId,
    shipId: state.shipId,
    role: state.role
  });
}

function copyCode() {
  const code = state.campaignCode || document.getElementById('campaign-code-value')?.textContent;
  if (code && code !== '--------') {
    navigator.clipboard.writeText(code).then(() => {
      showToast('Code copied!');
    }).catch(() => {
      showError('Failed to copy code');
    });
  }
}

function logout() {
  state.socket.emit('ops:logout');
  state.mode = null;
  state.campaignId = null;
  state.campaignCode = null;
  state.slotId = null;
  state.role = null;
  state.adapter.showScreen('login-screen');
  backToLogin();
}


function updateBridgeHeader(data) {
  if (data.shipName) state.adapter.setText('bridge-ship-name', data.shipName);
  if (data.location) state.adapter.setText('bridge-location', data.location);
  if (data.date) state.adapter.setText('bridge-date', data.date);
  if (data.role) state.adapter.setText('bridge-user-role', data.role);
  if (data.userName) state.adapter.setText('bridge-user-name', data.userName);

  // Update alert status
  const alertEl = document.getElementById('alert-status');
  if (alertEl && data.alertLevel) {
    alertEl.className = `alert-status alert-${data.alertLevel}`;
    const textEl = alertEl.querySelector('.alert-text');
    if (textEl) {
      textEl.textContent = data.alertLevel === 'red' ? 'Red Alert' :
                           data.alertLevel === 'yellow' ? 'Yellow Alert' : 'Normal';
    }
  }
}

function showError(message) {
  state.adapter.setText('error-message', message);
  state.adapter.setVisible('error-toast', true);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    state.adapter.setVisible('error-toast', false);
  }, 5000);
}

function showToast(message) {
  state.adapter.setText('error-message', message);
  state.adapter.setVisible('error-toast', true);

  setTimeout(() => {
    state.adapter.setVisible('error-toast', false);
  }, 2000);
}

function toggleMenu() {
  const menu = document.getElementById('hamburger-menu');
  if (menu) menu.classList.toggle('hidden');
}

// TASK 1: showModal dispatches event for modal system
function showModal(modalId) {
  const event = new CustomEvent('v2:showModal', { detail: { modalId } });
  document.dispatchEvent(event);
}

// Expose showToast, showModal, and state globally for modules
window.showToast = showToast;
window.showModal = showModal;
window.v2State = state;

// === Debug Tooling (TASK 8) ===
window.v2Debug = {
  enable: () => { state.debug = true; console.log('[OPS-V2] Debug mode enabled'); },
  disable: () => { state.debug = false; console.log('[OPS-V2] Debug mode disabled'); },
  state: () => console.log('[OPS-V2] State:', state),
  actions: () => console.log('[OPS-V2] Actions:', Object.keys(actionHandlers)),
  checkParity: () => {
    const v1Actions = [
      // Combat
      'fireWeapon', 'authorizeWeapons', 'fire', 'selectTarget', 'evasiveManeuvers',
      // Engineering
      'repairSystem', 'applySystemDamage', 'clearSystemDamage', 'godModeRefuel',
      'adjustPower', 'repair', 'processFuel',
      // Damage Control
      'repairHull', 'firefighting', 'sealBreach',
      // Navigation
      'travelToSystem', 'setCurrentSystem', 'gmRelocateShip', 'setDestination',
      'plotJump', 'initiateJump', 'cancelJump',
      // Sensors
      'addContact', 'shareStarSystem', 'getSystemStatus', 'scan', 'lock', 'unlock',
      // Comms
      'advanceTime', 'bridgeTransmission', 'hail', 'broadcast',
      // Captain
      'issueOrder',
      // Medic
      'treatPatient', 'checkSupplies',
      // Marines
      'deploy', 'drill',
      // Steward
      'servePassengers', 'checkInventory',
      // Modules
      'importModule', 'deleteModule', 'toggleModule', 'getModuleSummary',
      // GM
      'getPrepData', 'getShipSystems',
      // Role
      'switchRole'
    ];
    const wired = v1Actions.filter(a => actionHandlers[a]);
    const missing = v1Actions.filter(a => !actionHandlers[a]);
    console.log(`[OPS-V2] Parity: ${wired.length}/${v1Actions.length} (${(wired.length/v1Actions.length*100).toFixed(1)}%)`);
    if (missing.length) console.log('[OPS-V2] Missing:', missing);
    return { wired: wired.length, total: v1Actions.length, missing };
  }
};

// Shortcut for checkParity
window.checkParity = window.v2Debug.checkParity;


// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { state, init, handleAction };
}
