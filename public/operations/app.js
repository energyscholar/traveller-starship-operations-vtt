/**
 * Traveller Starship Operations VTT - Main Application
 * Handles UI state, socket communication, and user interactions
 */

// ==================== Module Imports ====================
import { SHIP_ASCII_ART, getShipAsciiArt } from './modules/ascii-art.js';
import { escapeHtml, formatRoleName, formatActionName, formatRange, getRangeClass, formatRangeBand, formatSystemName, getStatusColor, getContactIcon } from './modules/utils.js';
import { UWP_DATA, decodeUWP, formatUWPTooltip, getUWPSummary, createUWPSpan, initUWPTooltips } from './modules/uwp-decoder.js';
import { formatSkillName, formatCharacterTooltip, initCharacterTooltips } from './modules/tooltips.js';
import { getRoleDetailContent, getActionMessage, renderSystemStatusItem } from './modules/role-panels.js';

// ==================== State ====================
const state = {
  socket: null,
  heartbeatInterval: null,  // Keep-alive interval
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
  gmSelectedShipId: null,  // GM's selected ship for bridge view
  selectedRole: null,
  selectedRoleInstance: 1,

  // Bridge state
  contacts: [],
  crewOnline: [],
  logEntries: [],
  pinnedContactId: null  // TIP-1: Currently pinned contact for tooltip
};

// ==================== Socket Setup ====================
function initSocket() {
  state.socket = io();

  // Connection events
  state.socket.on('connect', () => {
    console.log('Connected to server');
    // Try to reconnect to previous session (Stage 3.5.5)
    tryReconnect();

    // Start heartbeat to keep connection alive (every 60 seconds)
    if (state.heartbeatInterval) clearInterval(state.heartbeatInterval);
    state.heartbeatInterval = setInterval(() => {
      state.socket.emit('ops:ping');
    }, 60000);
  });

  state.socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showNotification('Disconnected from server', 'error');
    // Stop heartbeat on disconnect
    if (state.heartbeatInterval) {
      clearInterval(state.heartbeatInterval);
      state.heartbeatInterval = null;
    }
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
    // Auto-select default ship and role from account preferences
    if (data.account.ship_id) {
      state.selectedShipId = data.account.ship_id;
    }
    if (data.account.role) {
      state.selectedRole = data.account.role;
    }
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

  // NAV-4: Role cleared (left duty station)
  state.socket.on('ops:roleCleared', (data) => {
    const roleName = formatRoleName(data.previousRole);
    state.selectedRole = null;
    showNotification(`Left ${roleName} station - now off-duty`, 'info');
    // Return to player setup to select new role
    document.getElementById('gm-overlay')?.classList.add('hidden');
    showScreen('player-setup');
    renderPlayerSetup();
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

  // Stage 2: Role personality updated
  state.socket.on('ops:rolePersonalityUpdated', (data) => {
    if (state.player && state.player.id === data.playerId) {
      state.player.role_title = data.roleTitle;
      state.player.quirk_text = data.quirkText;
      state.player.quirk_icon = data.quirkIcon;
      updateRoleQuirkDisplay();
    }
    showNotification('Station personality saved', 'success');
  });

  // Ship & role events
  state.socket.on('ops:shipSelected', (data) => {
    state.ship = data.ship;
    state.ship.npcCrew = data.npcCrew || [];  // Store NPC crew on ship object
    // Update taken roles display
    renderRoleSelection();
  });

  state.socket.on('ops:roleAssigned', (data) => {
    state.selectedRole = data.role;
    renderPlayerSetup();
  });

  state.socket.on('ops:crewUpdate', (data) => {
    // Another player changed their role
    console.log('[OPS] Crew update received:', data);

    // Update role selection if on player-setup screen
    if (state.currentScreen === 'player-setup') {
      renderRoleSelection();
    }

    // Update bridge crew display if on bridge screen
    if (state.currentScreen === 'bridge') {
      // Update crewOnline array with the change
      if (data.crew) {
        // Full crew list provided
        state.crewOnline = data.crew;
      } else if (data.action === 'joined' || data.role) {
        // Someone joined or took a role - add/update them
        const existingIdx = state.crewOnline.findIndex(c => c.accountId === data.accountId);
        if (existingIdx >= 0) {
          state.crewOnline[existingIdx].role = data.role;
          state.crewOnline[existingIdx].roleInstance = data.roleInstance;
        } else if (data.slotName || data.accountId) {
          state.crewOnline.push({
            accountId: data.accountId,
            name: data.slotName || data.playerName || 'Unknown',
            role: data.role,
            roleInstance: data.roleInstance,
            isNPC: false
          });
        }
      } else if (data.action === 'left' || data.action === 'disconnected') {
        // Someone left - remove them or clear their role
        const existingIdx = state.crewOnline.findIndex(c => c.accountId === data.accountId);
        if (existingIdx >= 0) {
          if (data.action === 'disconnected') {
            state.crewOnline.splice(existingIdx, 1);
          } else {
            state.crewOnline[existingIdx].role = null;
          }
        }
      }
      renderCrewStatus();
    }
  });

  // Bridge events
  state.socket.on('ops:bridgeJoined', (data) => {
    state.ship = data.ship;
    state.ship.npcCrew = data.npcCrew || [];  // Store NPC crew on ship object
    state.selectedShipId = data.ship?.id;
    state.crewOnline = data.crew;
    state.contacts = data.contacts || [];  // Use contacts from server
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

    // GM auto-joins bridge after starting session using selected ship
    if (state.isGM && state.gmSelectedShipId) {
      state.socket.emit('ops:joinBridge', {
        shipId: state.gmSelectedShipId,
        role: 'gm',
        isGM: true
      });
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

  // Stage 5: Current system updated (TravellerMap)
  state.socket.on('ops:currentSystemUpdated', (data) => {
    const locationEl = document.getElementById('bridge-location');
    if (locationEl) {
      locationEl.textContent = data.locationDisplay;
    }
    // Update campaign state with sector/hex for jump map
    if (state.campaign) {
      state.campaign.current_system = data.locationDisplay;
      state.campaign.current_sector = data.sector || null;
      state.campaign.current_hex = data.hex || null;
    }
    // Refresh jump map if astrogator
    if (state.selectedRole === 'astrogator') {
      renderRoleDetailPanel(state.selectedRole);
      initJumpMapIfNeeded();
    }
    showNotification(`Location set to ${data.locationDisplay}`, 'success');
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

  // Autorun 5: Handle jump plot result
  state.socket.on('ops:jumpPlotted', (data) => {
    handleJumpPlotted(data);
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
    // Hide plot result since we're now jumping
    const plotResult = document.getElementById('jump-plot-result');
    if (plotResult) plotResult.style.display = 'none';
    showNotification(`Jump initiated to ${data.destination}. ETA: ${data.jumpEndDate}`, 'info');
    renderRoleDetailPanel(state.role);
    renderShipStatus();
  });

  state.socket.on('ops:jumpCompleted', (data) => {
    state.jumpStatus = { inJump: false };
    state.campaign.current_system = data.arrivedAt;
    // Stage 7: Update date after jump
    if (data.newDate) {
      state.campaign.current_date = data.newDate;
    }
    // Autorun 5: Store news and mail for display
    state.systemNews = data.news || [];
    state.systemMail = data.mail || {};
    state.roleContent = data.roleContent || {};
    showNotification(`Arrived at ${data.arrivedAt}`, 'success');
    renderRoleDetailPanel(state.role);
    renderBridge();
    // Show news/mail modal if there's content
    if (state.systemNews.length > 0 || Object.keys(state.systemMail).length > 0) {
      showNewsMailModal(data.arrivedAt);
    }
  });

  state.socket.on('ops:locationChanged', (data) => {
    state.campaign.current_system = data.newLocation;
    if (data.newDate) {
      state.campaign.current_date = data.newDate;
    }
    // Autorun 5: Update contacts if provided
    if (data.contacts) {
      state.contacts = data.contacts;
    }
    renderBridge();
  });

  // Autorun 5: Handle contacts replaced on jump arrival
  state.socket.on('ops:contactsReplaced', (data) => {
    state.contacts = data.contacts || [];
    showNotification(`Sensor contacts updated: ${state.contacts.length} objects detected`, 'info');
    renderRoleDetailPanel(state.role);
  });

  // Autorun 5: Handle sensor scan results
  state.socket.on('ops:scanResult', (data) => {
    handleScanResult(data);
  });

  // Autorun 5: Handle weapons authorization
  state.socket.on('ops:weaponsAuthorized', (data) => {
    handleWeaponsAuthorized(data);
  });

  // Autorun 5: Handle fire results
  state.socket.on('ops:fireResult', (data) => {
    handleFireResult(data);
  });

  // Autorun 5: Handle jump status update (for skip-to-exit feature)
  state.socket.on('ops:jumpStatusUpdated', (data) => {
    const { jumpStatus, message } = data;
    state.jumpStatus = jumpStatus;
    showNotification(message || 'Jump status updated', 'success');
    renderRoleDetailPanel(state.role);
  });

  // Stage 7: Handle time updates (from jumps or GM actions)
  state.socket.on('ops:timeUpdated', (data) => {
    if (data.currentDate && state.campaign) {
      state.campaign.current_date = data.currentDate;
      // Update date display
      const dateEl = document.getElementById('bridge-date');
      if (dateEl) dateEl.textContent = data.currentDate;
      const gmDateEl = document.getElementById('campaign-date');
      if (gmDateEl) gmDateEl.value = data.currentDate;
    }
    if (data.reason) {
      showNotification(`Time advanced: ${data.reason}`, 'info');
    }
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
  // Restore saved campaign code from localStorage
  const savedCode = localStorage.getItem('ops_campaign_code');
  if (savedCode) {
    document.getElementById('campaign-code').value = savedCode;
  }

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
      // Save campaign code to localStorage for convenience
      localStorage.setItem('ops_campaign_code', code);
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
      const accountId = item.dataset.playerId;  // Server expects accountId
      state.socket.emit('ops:selectPlayerSlot', { accountId });
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
    </div>
  `).join('') || '<p class="placeholder">No ships yet</p>';

  // Add click handlers for ship selection
  shipsContainer.querySelectorAll('.ship-item.selectable').forEach(item => {
    item.addEventListener('click', () => {
      state.gmSelectedShipId = item.dataset.shipId;
      renderGMSetup(); // Re-render to show selection
    });
  });
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

    return `
      <div class="role-option ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''} ${r.unlimited ? 'unlimited' : ''}"
           data-role-id="${r.id}" data-role-instance="${r.instance}" ${isTaken ? 'disabled' : ''}>
        <div class="role-name">${r.name}</div>
        <div class="role-desc">${r.desc}</div>
        ${isTaken ? `<div class="role-taken-by">Taken by ${escapeHtml(takenBy.name)}</div>` : ''}
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

  // TIP-2: Click ship name to show status modal
  document.getElementById('bridge-ship-name').addEventListener('click', showShipStatusModal);
  document.getElementById('bridge-ship-name').style.cursor = 'pointer';

  // Menu button - show GM menu modal (GM-1)
  document.getElementById('btn-bridge-menu').addEventListener('click', () => {
    if (state.isGM) {
      showModal('template-gm-bridge-menu');
      // Populate campaign code
      const codeEl = document.getElementById('gm-menu-campaign-code');
      if (codeEl && state.campaign?.id) {
        codeEl.textContent = state.campaign.id.substring(0, 8).toUpperCase();
      }
    } else {
      showNotification('Player menu coming soon', 'info');
    }
  });

  // Change role button (NAV-1)
  document.getElementById('btn-change-role').addEventListener('click', () => {
    if (state.isGM) {
      showNotification('GMs cannot change roles', 'info');
      return;
    }
    // Return to player setup screen for role selection
    state.selectedRole = null;
    document.getElementById('gm-overlay')?.classList.add('hidden');
    showScreen('player-setup');
    renderPlayerSetup();
  });

  // NAV-4: Leave role (go off-duty)
  document.getElementById('btn-leave-role').addEventListener('click', () => {
    if (state.isGM) {
      showNotification('GMs cannot leave roles', 'info');
      return;
    }
    if (!state.selectedRole) {
      showNotification('No role assigned', 'info');
      return;
    }
    // Confirm before leaving
    if (confirm(`Leave ${formatRoleName(state.selectedRole)} station? NPC will take over.`)) {
      state.socket.emit('ops:leaveRole');
    }
  });

  // Stage 2: Edit role personality (quirk/title)
  document.getElementById('btn-edit-role-personality').addEventListener('click', () => {
    if (!state.selectedRole || state.selectedRole === 'observer') {
      showNotification('No role to customize', 'info');
      return;
    }
    showModal('template-edit-role-personality');
  });

  // Bridge logout
  document.getElementById('btn-bridge-logout').addEventListener('click', () => {
    // Reset all state
    state.ship = null;
    state.selectedShipId = null;
    state.selectedRole = null;
    state.player = null;
    state.campaign = null;
    state.isGM = false;
    state.isGuest = false;
    clearStoredSession();
    // Hide GM overlay if visible
    document.getElementById('gm-overlay')?.classList.add('hidden');
    showScreen('login');
  });

  // GM controls
  initGMControls();
}

function initGMControls() {
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

// Stage 2: Update quirk display in role panel header
function updateRoleQuirkDisplay() {
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

function renderBridge() {
  // Ship name
  document.getElementById('bridge-ship-name').textContent = state.ship?.name || 'Unknown Ship';

  // Campaign name (Phase 1 requirement)
  const campaignNameEl = document.getElementById('bridge-campaign-name');
  if (campaignNameEl) {
    campaignNameEl.textContent = state.campaign?.name || '';
  }

  // Date/time
  document.getElementById('bridge-date').textContent = state.campaign?.current_date || '???';

  // Current system/location (Phase 1 requirement)
  const locationEl = document.getElementById('bridge-location');
  if (locationEl) {
    locationEl.textContent = state.campaign?.current_system || 'Unknown';
  }

  // Guest indicator
  const guestIndicator = document.getElementById('guest-indicator');
  if (state.isGuest) {
    guestIndicator.classList.remove('hidden');
  } else {
    guestIndicator.classList.add('hidden');
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

  // Location (UI-5: Better location display)
  // Use ship's detailed location if available, fall back to campaign system
  const shipLocation = shipState.location;
  const systemName = state.campaign?.current_system || 'Unknown';
  let locationDisplay;

  if (shipLocation && !shipLocation.includes(systemName)) {
    // Ship has specific location not including system name - combine both
    locationDisplay = `${systemName} · ${shipLocation}`;
  } else if (shipLocation) {
    // Ship location already includes system info
    locationDisplay = shipLocation;
  } else {
    // Just system name
    locationDisplay = systemName;
  }
  document.getElementById('location-value').textContent = locationDisplay;
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

  // Stage 6: Initialize jump map if astrogator
  initJumpMapIfNeeded();
}

function renderObserverPanel() {
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

function renderRoleDetailPanel(role) {
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
    ship: state.ship
  };

  // Role-specific content from module
  const detailContent = getRoleDetailContent(role, context);
  container.innerHTML = detailContent;
}

function handleRoleAction(action) {
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

function renderCrewList() {
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

  // Add online players
  state.crewOnline.forEach(c => {
    allCrew.push({
      name: c.character_name || c.slot_name || c.name,
      role: c.role,
      isNPC: false,
      isOnline: true,
      isYou: c.id === state.player?.id,
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

  container.innerHTML = allCrew.map(c => {
    const charDataAttr = c.characterData ? `data-character='${JSON.stringify(c.characterData).replace(/'/g, '&#39;')}'` : '';
    const hasCharClass = c.characterData ? 'has-character' : '';
    return `
    <div class="crew-member ${c.isNPC ? 'npc' : ''} ${c.isYou ? 'is-you' : ''}">
      <span class="online-indicator ${c.isOnline ? 'online' : ''}"></span>
      <span class="crew-name ${hasCharClass}" ${charDataAttr}>${escapeHtml(c.name)}${c.isYou ? ' (You)' : ''}</span>
      <span class="crew-role">${formatRoleName(c.role)}</span>
    </div>`;
  }).join('') || '<p class="placeholder">No crew</p>';
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
    // GM notes only visible to GM
    const gmNotes = state.isGM && c.gm_notes ? `
      <div class="contact-gm-notes">${escapeHtml(c.gm_notes)}</div>
    ` : '';

    return `
      <div class="contact-item ${rangeClass}" data-contact-id="${c.id}">
        <span class="contact-icon">${getContactIcon(c.type)}</span>
        <div class="contact-info">
          <div class="contact-name">${escapeHtml(c.name || c.type)}</div>
          <div class="contact-details">Bearing: ${c.bearing}° · ${c.transponder || 'No transponder'}</div>
          ${gmNotes}
        </div>
        <div class="contact-range">
          <div>${formatRange(c.range_km)}</div>
          <div class="range-band">${formatRangeBand(c.range_band)}</div>
        </div>
        ${gmControls}
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
  }
}

// ==================== Ship Systems ====================

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

// Autorun 5: Plot jump course (shows info before committing)
function plotJumpCourse() {
  const destination = document.getElementById('jump-destination')?.value?.trim();
  const distance = parseInt(document.getElementById('jump-distance')?.value) || 1;

  if (!destination) {
    showNotification('Please enter a destination system', 'error');
    return;
  }

  state.socket.emit('ops:plotJump', {
    destination,
    distance
  });
}

// Handle plotJump result
function handleJumpPlotted(data) {
  const resultDiv = document.getElementById('jump-plot-result');
  if (!resultDiv) return;

  const {
    destination, distance, canJump, error, fuelNeeded, fuelAvailable,
    fuelAfterJump, travelTime, currentDate, arrivalDate, warnings = [],
    destinationInfo, astrogatorSkill
  } = data;

  let html = `<div class="jump-plot-summary ${canJump ? 'can-jump' : 'cannot-jump'}">`;

  if (!canJump) {
    html += `
      <div class="plot-error">
        <span class="error-icon">!</span>
        ${error || 'Cannot initiate jump'}
      </div>
    `;
  } else {
    html += `
      <div class="plot-header">Course to ${destination} (J-${distance})</div>
      <div class="plot-stats">
        <div class="plot-row">
          <span>Fuel Required:</span>
          <span class="plot-value">${fuelNeeded} tons</span>
        </div>
        <div class="plot-row">
          <span>Fuel After Jump:</span>
          <span class="plot-value ${fuelAfterJump < fuelNeeded ? 'text-warning' : ''}">${fuelAfterJump} tons</span>
        </div>
        <div class="plot-row">
          <span>Travel Time:</span>
          <span class="plot-value">${travelTime}</span>
        </div>
        <div class="plot-row">
          <span>Current Date:</span>
          <span class="plot-value">${currentDate}</span>
        </div>
        <div class="plot-row">
          <span>ETA:</span>
          <span class="plot-value">${arrivalDate}</span>
        </div>
      </div>
    `;

    if (destinationInfo) {
      html += `
        <div class="plot-destination-info">
          <div class="plot-row">
            <span>Starport:</span>
            <span class="plot-value">${destinationInfo.starport || '?'}</span>
          </div>
          ${destinationInfo.gasGiants > 0 ? `
          <div class="plot-row">
            <span>Gas Giants:</span>
            <span class="plot-value">${destinationInfo.gasGiants} (wilderness refuel possible)</span>
          </div>
          ` : ''}
        </div>
      `;
    }

    if (warnings.length > 0) {
      html += `<div class="plot-warnings">`;
      warnings.forEach(w => {
        html += `<div class="plot-warning"><span class="warning-icon">!</span> ${w}</div>`;
      });
      html += `</div>`;
    }

    if (astrogatorSkill) {
      html += `<div class="plot-skill-note"><em>${astrogatorSkill}</em></div>`;
    }

    html += `
      <div class="plot-actions">
        <button onclick="initiateJumpFromPlot('${destination}', ${distance})" class="btn btn-primary">
          Initiate Jump
        </button>
      </div>
    `;
  }

  html += `</div>`;
  resultDiv.innerHTML = html;
  resultDiv.style.display = 'block';
}

// Initiate jump from plotted course
function initiateJumpFromPlot(destination, distance) {
  state.socket.emit('ops:initiateJump', { destination, distance });
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

function skipToJumpExit() {
  // Testing feature: Advance time to allow jump exit
  state.socket.emit('ops:skipToJumpExit');
  showNotification('Advancing time to jump exit...', 'info');
}

// ==================== Sensor Operations (Autorun 5) ====================

function performScan(scanType = 'passive') {
  state.socket.emit('ops:sensorScan', { scanType });
  showNotification(`Initiating ${scanType} sensor scan...`, 'info');
}

function handleScanResult(data) {
  const { scanType, contacts, categorized, totalCount, description, skillNote } = data;

  // Update state contacts
  state.contacts = contacts;

  // Show notification
  showNotification(description, 'success');

  // Update scan result display if visible
  const scanResultDiv = document.getElementById('scan-result-display');
  if (scanResultDiv) {
    let html = `
      <div class="detail-section">
        <h4>Scan Results</h4>
        <div class="scan-description">${description}</div>
        <div class="scan-categories">
    `;

    if (categorized) {
      if (categorized.celestial?.length > 0) {
        html += `<div class="scan-category">
          <span class="category-label">Celestial:</span>
          <span class="category-list">${categorized.celestial.map(c => c.name || c.type).join(', ')}</span>
        </div>`;
      }
      if (categorized.stations?.length > 0) {
        html += `<div class="scan-category">
          <span class="category-label">Stations:</span>
          <span class="category-list">${categorized.stations.map(c => c.transponder || c.name || c.type).join(', ')}</span>
        </div>`;
      }
      if (categorized.ships?.length > 0) {
        html += `<div class="scan-category">
          <span class="category-label">Ships:</span>
          <span class="category-list">${categorized.ships.map(c => c.transponder || c.name || 'Unknown').join(', ')}</span>
        </div>`;
      }
      if (categorized.unknown?.length > 0) {
        html += `<div class="scan-category">
          <span class="category-label">Other:</span>
          <span class="category-list">${categorized.unknown.map(c => c.name || c.type || 'Contact').join(', ')}</span>
        </div>`;
      }
    }

    if (skillNote) {
      html += `<div class="scan-skill-note"><em>${skillNote}</em></div>`;
    }

    html += `</div></div>`;
    scanResultDiv.innerHTML = html;
    scanResultDiv.style.display = 'block';
  }

  // Re-render panel to update contact counts
  renderRoleDetailPanel(state.role);
}

// ==================== News & Mail Display (Autorun 5) ====================

function showNewsMailModal(systemName) {
  const news = state.systemNews || [];
  const mail = state.systemMail || {};
  const roleContent = state.roleContent || {};

  // Get role-specific mail if available
  const myMail = mail[state.role] || null;
  const myRoleAdvice = roleContent[state.role] || null;

  // Create modal content
  let html = `
    <div class="news-mail-modal">
      <div class="news-mail-header">
        <h3>DATA LINK ESTABLISHED: ${systemName.toUpperCase()}</h3>
        <button onclick="closeNewsMailModal()" class="close-btn">&times;</button>
      </div>
      <div class="news-mail-content">
  `;

  // Role-specific advice section
  if (myRoleAdvice) {
    html += `
      <div class="role-advice-section">
        <h4>STATION BRIEF: ${state.role.replace('_', ' ').toUpperCase()}</h4>
        <div class="role-advice-content">${myRoleAdvice}</div>
      </div>
    `;
  }

  // Personal mail section
  if (myMail) {
    html += `
      <div class="mail-section">
        <h4>PERSONAL MESSAGE</h4>
        <div class="mail-item">
          <div class="mail-header">
            <span class="mail-from">From: ${myMail.from}</span>
            <span class="mail-subject">Re: ${myMail.subject}</span>
          </div>
          <div class="mail-body">${myMail.content}</div>
        </div>
      </div>
    `;
  }

  // News section
  if (news.length > 0) {
    html += `
      <div class="news-section">
        <h4>SYSTEM NEWS</h4>
        ${news.map(item => `
          <div class="news-item">
            <div class="news-headline">${item.headline}</div>
            <div class="news-source">— ${item.source}</div>
            <div class="news-content">${item.content}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  html += `
      </div>
      <div class="news-mail-footer">
        <button onclick="closeNewsMailModal()" class="btn btn-primary">Acknowledge</button>
      </div>
    </div>
  `;

  // Create and show modal
  let modal = document.getElementById('news-mail-overlay');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'news-mail-overlay';
    modal.className = 'news-mail-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML = html;
  modal.style.display = 'flex';
}

function closeNewsMailModal() {
  const modal = document.getElementById('news-mail-overlay');
  if (modal) {
    modal.style.display = 'none';
  }
}

// ==================== Weapons Operations (Autorun 5) ====================

function authorizeWeapons() {
  const targetSelect = document.getElementById('auth-target-select');
  if (!targetSelect) {
    showNotification('No target selected', 'error');
    return;
  }

  const contactId = targetSelect.value;
  const targetName = targetSelect.options[targetSelect.selectedIndex]?.text || 'Target';

  state.socket.emit('ops:authorizeWeapons', { contactId });
  showNotification(`Authorizing weapons on ${targetName}...`, 'info');
}

function handleWeaponsAuthorized(data) {
  const { contact, message } = data;

  showNotification(message || `Weapons authorized on ${contact?.name || 'target'}`, 'success');

  // Update contacts in state
  if (state.contacts && contact) {
    const idx = state.contacts.findIndex(c => c.id === contact.id);
    if (idx >= 0) {
      state.contacts[idx] = contact;
    }
  }

  // Re-render to update both Captain and Gunner panels
  renderRoleDetailPanel(state.role);
}

function fireAtTarget() {
  const targetSelect = document.getElementById('fire-target-select');
  const weaponSelect = document.getElementById('fire-weapon-select');

  if (!targetSelect) {
    showNotification('No target selected', 'error');
    return;
  }

  const contactId = targetSelect.value;
  const weaponIndex = parseInt(weaponSelect?.value) || 0;
  const targetName = targetSelect.options[targetSelect.selectedIndex]?.text || 'Target';

  state.socket.emit('ops:fireAtContact', { contactId, weaponIndex });
  showNotification(`Firing at ${targetName}...`, 'warning');
}

function handleFireResult(data) {
  const { hit, roll, target, damage, damageRoll, targetDestroyed, description, message } = data;

  // Show notification
  showNotification(message, hit ? 'success' : 'info');

  // Update contact in state if damaged
  if (state.contacts && data.contact) {
    const idx = state.contacts.findIndex(c => c.id === data.contact.id);
    if (idx >= 0) {
      state.contacts[idx] = data.contact;
    }
  }

  // Show detailed fire result
  const fireResultDiv = document.getElementById('fire-result-display');
  if (fireResultDiv) {
    let html = `
      <div class="detail-section fire-result ${hit ? 'hit' : 'miss'}">
        <h4>${hit ? 'HIT!' : 'MISS'}</h4>
        <div class="fire-details">
          <div class="stat-row">
            <span>Target:</span>
            <span class="stat-value">${target || 'Unknown'}</span>
          </div>
          <div class="stat-row">
            <span>Attack Roll:</span>
            <span class="stat-value">${roll || '?'}</span>
          </div>
    `;

    if (hit && damage !== undefined) {
      html += `
          <div class="stat-row">
            <span>Damage:</span>
            <span class="stat-value">${damage} ${damageRoll ? `(${damageRoll})` : ''}</span>
          </div>
      `;
    }

    if (targetDestroyed) {
      html += `
          <div class="target-destroyed">TARGET DESTROYED!</div>
      `;
    }

    html += `
          <div class="fire-description">${description || ''}</div>
        </div>
      </div>
    `;

    fireResultDiv.innerHTML = html;
    fireResultDiv.style.display = 'block';
  }

  // Re-render panel
  renderRoleDetailPanel(state.role);
}

// ==================== Jump Map (Stage 6) ====================

async function updateJumpMap() {
  const sector = state.campaign?.current_sector;
  const hex = state.campaign?.current_hex;

  if (!sector || !hex) return;

  const range = parseInt(document.getElementById('jump-map-range')?.value) || 2;
  const style = document.getElementById('jump-map-style')?.value || 'terminal';

  const mapImg = document.getElementById('jump-map-image');
  const loadingEl = document.querySelector('.jump-map-loading');

  if (mapImg) {
    mapImg.style.display = 'none';
    if (loadingEl) loadingEl.style.display = 'block';

    // Use the proxy API
    const mapUrl = `/api/travellermap/jumpmap?sector=${encodeURIComponent(sector)}&hex=${hex}&jump=${range}&style=${style}`;
    mapImg.onload = () => {
      mapImg.style.display = 'block';
      if (loadingEl) loadingEl.style.display = 'none';
    };
    mapImg.onerror = () => {
      if (loadingEl) loadingEl.textContent = 'Failed to load map';
    };
    mapImg.src = mapUrl;
  }

  // Also fetch destinations
  fetchJumpDestinations(sector, hex, range);
}

async function fetchJumpDestinations(sector, hex, range) {
  const container = document.getElementById('jump-destinations');
  if (!container) return;

  try {
    const response = await fetch(`/api/travellermap/jumpworlds?sector=${encodeURIComponent(sector)}&hex=${hex}&jump=${range}`);
    const data = await response.json();

    if (data.Worlds && data.Worlds.length > 0) {
      container.innerHTML = `
        <div class="destinations-header">
          <span>System</span>
          <span>UWP</span>
          <span>Distance</span>
        </div>
        ${data.Worlds.map(world => `
          <div class="destination-item" data-name="${escapeHtml(world.Name)}" data-sector="${escapeHtml(world.Sector || sector)}" data-hex="${world.HexX}${String(world.HexY).padStart(2, '0')}" onclick="selectJumpDestination(this)">
            <span class="dest-name">${escapeHtml(world.Name)}</span>
            <span class="dest-uwp">${world.Uwp || '???????-?'}</span>
            <span class="dest-distance">J-${world.Distance || '?'}</span>
          </div>
        `).join('')}
      `;
    } else {
      container.innerHTML = '<p class="placeholder">No nearby systems found</p>';
    }
  } catch (error) {
    container.innerHTML = `<p class="placeholder">Failed to fetch destinations</p>`;
  }
}

function selectJumpDestination(element) {
  const name = element.dataset.name;
  const sector = element.dataset.sector;
  const hex = element.dataset.hex;

  // Fill in the destination input
  const destInput = document.getElementById('jump-destination');
  if (destInput) {
    destInput.value = `${name} (${sector} ${hex})`;
  }

  // Highlight selected
  document.querySelectorAll('.destination-item').forEach(el => el.classList.remove('selected'));
  element.classList.add('selected');

  showNotification(`Selected ${name} as destination`, 'info');
}

// Initialize jump map when astrogator panel is rendered
function initJumpMapIfNeeded() {
  if (state.selectedRole === 'astrogator' && state.campaign?.current_sector) {
    setTimeout(() => updateJumpMap(), 100);
  }
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

  if (templateId === 'template-add-log') {
    document.getElementById('btn-save-log-entry').addEventListener('click', () => {
      const entryType = document.getElementById('log-entry-type').value;
      const message = document.getElementById('log-entry-message').value.trim();
      if (message) {
        state.socket.emit('ops:addLogEntry', {
          shipId: state.ship.id,
          entryType,
          message
        });
        closeModal();
      }
    });
  }

  // Stage 2: Edit Role Personality Modal
  if (templateId === 'template-edit-role-personality') {
    let selectedIcon = state.player?.quirk_icon || '';

    // Pre-fill current values
    document.getElementById('edit-role-title').value = state.player?.role_title || '';
    document.getElementById('edit-quirk-text').value = state.player?.quirk_text || '';

    // Icon picker selection
    modal.querySelectorAll('.icon-btn').forEach(btn => {
      const icon = btn.dataset.icon;
      if (icon === selectedIcon) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedIcon = icon;
      });
    });

    // Save button
    document.getElementById('btn-save-role-personality').addEventListener('click', () => {
      const roleTitle = document.getElementById('edit-role-title').value.trim();
      const quirkText = document.getElementById('edit-quirk-text').value.trim();

      state.socket.emit('ops:updateRolePersonality', {
        playerId: state.player?.id,
        roleTitle: roleTitle || null,
        quirkText: quirkText || null,
        quirkIcon: selectedIcon || null
      });
      closeModal();
    });
  }

  // Stage 5: System Lookup Modal (TravellerMap)
  if (templateId === 'template-system-lookup') {
    let selectedSystem = null;

    async function performSearch() {
      const query = document.getElementById('system-search-input').value.trim();
      if (!query) return;

      const resultsContainer = document.getElementById('system-search-results');
      resultsContainer.innerHTML = '<p class="search-loading">Searching TravellerMap...</p>';
      document.getElementById('btn-set-system').disabled = true;
      selectedSystem = null;

      try {
        const response = await fetch(`/api/travellermap/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.Results?.Count > 0) {
          // Filter to only World results
          const worlds = data.Results.Items.filter(item => item.World);
          if (worlds.length === 0) {
            resultsContainer.innerHTML = '<p class="search-placeholder">No worlds found. Try a different search.</p>';
            return;
          }

          resultsContainer.innerHTML = worlds.map((item, index) => {
            const world = item.World;
            return `<div class="system-result-item" data-index="${index}">
              <div class="system-result-name">${escapeHtml(world.Name)}<span class="system-result-uwp">${world.Uwp}</span></div>
              <div class="system-result-details">${escapeHtml(world.Sector)} ${world.HexX}${String(world.HexY).padStart(2, '0')}</div>
            </div>`;
          }).join('');

          // Store worlds data for selection
          resultsContainer.dataset.worlds = JSON.stringify(worlds);

          // Click handler for results
          resultsContainer.querySelectorAll('.system-result-item').forEach(item => {
            item.addEventListener('click', () => {
              resultsContainer.querySelectorAll('.system-result-item').forEach(i => i.classList.remove('selected'));
              item.classList.add('selected');
              const worlds = JSON.parse(resultsContainer.dataset.worlds);
              selectedSystem = worlds[parseInt(item.dataset.index)].World;
              document.getElementById('btn-set-system').disabled = false;
            });
          });
        } else {
          resultsContainer.innerHTML = '<p class="search-placeholder">No results found. Try a different search.</p>';
        }
      } catch (error) {
        resultsContainer.innerHTML = `<p class="search-placeholder">Search failed: ${error.message}</p>`;
      }
    }

    // Search button
    document.getElementById('btn-system-search').addEventListener('click', performSearch);

    // Enter key in search input
    document.getElementById('system-search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });

    // Set system button
    document.getElementById('btn-set-system').addEventListener('click', () => {
      if (!selectedSystem) return;
      const systemName = `${selectedSystem.Name} (${selectedSystem.Sector} ${selectedSystem.HexX}${String(selectedSystem.HexY).padStart(2, '0')})`;
      state.socket.emit('ops:setCurrentSystem', {
        system: systemName,
        uwp: selectedSystem.Uwp,
        sector: selectedSystem.Sector,
        hex: `${selectedSystem.HexX}${String(selectedSystem.HexY).padStart(2, '0')}`
      });
      closeModal();
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

  // GM Bridge Menu (GM-1)
  if (templateId === 'template-gm-bridge-menu') {
    document.getElementById('btn-gm-copy-code').addEventListener('click', () => {
      const codeEl = document.getElementById('gm-menu-campaign-code');
      const code = codeEl?.textContent;
      if (code && code !== '--------') {
        navigator.clipboard.writeText(code).then(() => {
          const btn = document.getElementById('btn-gm-copy-code');
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

    // GM-3: God Mode Handlers
    // Populate current ship values
    if (state.ship?.current_state) {
      const cs = state.ship.current_state;
      document.getElementById('god-ship-hull').value = cs.hullPoints || 0;
      document.getElementById('god-ship-fuel').value = cs.fuel || 0;
      document.getElementById('god-ship-power').value = cs.power || 100;
      document.getElementById('god-ship-alert').value = cs.alertStatus || 'NORMAL';
    }

    // Apply Ship Changes
    document.getElementById('btn-god-apply-ship').addEventListener('click', () => {
      const updates = {
        hullPoints: parseInt(document.getElementById('god-ship-hull').value) || 0,
        fuel: parseInt(document.getElementById('god-ship-fuel').value) || 0,
        power: parseInt(document.getElementById('god-ship-power').value) || 100,
        alertStatus: document.getElementById('god-ship-alert').value
      };
      state.socket.emit('ops:godModeUpdateShip', {
        shipId: state.ship?.id,
        updates
      });
      showNotification('Ship state updated', 'success');
    });

    // Add Contact
    document.getElementById('btn-god-add-contact').addEventListener('click', () => {
      const name = document.getElementById('god-contact-name').value || 'Unknown Contact';
      const type = document.getElementById('god-contact-type').value;
      const range = parseInt(document.getElementById('god-contact-range').value) || 50000;
      const bearing = parseInt(document.getElementById('god-contact-bearing').value) || 0;
      state.socket.emit('ops:godModeAddContact', {
        campaignId: state.campaign?.id,
        contact: { name, type, range_km: range, bearing, visible_to: 'all', signature: 'normal' }
      });
      document.getElementById('god-contact-name').value = '';
      showNotification('Contact added', 'success');
    });

    // Quick Commands
    document.getElementById('btn-god-repair-all').addEventListener('click', () => {
      state.socket.emit('ops:godModeRepairAll', { shipId: state.ship?.id });
      showNotification('All systems repaired', 'success');
    });

    document.getElementById('btn-god-refuel').addEventListener('click', () => {
      state.socket.emit('ops:godModeRefuel', { shipId: state.ship?.id });
      showNotification('Ship fully refueled', 'success');
    });

    document.getElementById('btn-god-clear-contacts').addEventListener('click', () => {
      if (confirm('Clear all contacts?')) {
        state.socket.emit('ops:godModeClearContacts', { campaignId: state.campaign?.id });
        showNotification('All contacts cleared', 'success');
      }
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

// ==================== Utilities (imported from modules/utils.js) ====================

// ==================== SHIP-6: ASCII Art (imported from modules/ascii-art.js) ====================

// ==================== TIP-3: UWP Decoder (imported from modules/uwp-decoder.js) ====================

// ==================== Stage 7: Character Tooltip (imported from modules/tooltips.js) ====================

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

// ==================== Ship Status Modal (TIP-2) ====================
function showShipStatusModal() {
  if (!state.ship) return;

  showModal('template-ship-status');

  const ship = state.ship;
  const template = ship.template_data || {};
  const shipData = ship.ship_data || {};
  const shipState = ship.current_state || {};

  // Set name
  document.getElementById('ship-status-name').textContent = ship.name;

  // Build content
  const maxHull = template.hull || 100;
  const currentHull = shipState.hull ?? maxHull;
  const hullPercent = Math.round((currentHull / maxHull) * 100);

  const maxFuel = template.fuel || 40;
  const currentFuel = shipState.fuel ?? maxFuel;
  const fuelPercent = Math.round((currentFuel / maxFuel) * 100);

  let content = `
    <div class="ship-info-grid">
      <div class="info-section">
        <h4>Ship Details</h4>
        <div class="info-row"><span class="label">Type:</span><span class="value">${shipData.type || 'Unknown'}</span></div>
        <div class="info-row"><span class="label">Tech Level:</span><span class="value">TL${shipData.techLevel || '?'}</span></div>
        <div class="info-row"><span class="label">Tonnage:</span><span class="value">${shipData.tonnage || '?'} tons</span></div>
        <div class="info-row"><span class="label">Thrust:</span><span class="value">${shipData.thrust || '?'}-G</span></div>
        <div class="info-row"><span class="label">Jump:</span><span class="value">J-${shipData.jump || '?'}</span></div>
        <div class="info-row"><span class="label">Sensors:</span><span class="value">${shipData.sensors || 'Standard'}</span></div>
        <div class="info-row"><span class="label">Computer:</span><span class="value">${shipData.computer || 'Model/1'}</span></div>
      </div>
      <div class="info-section">
        <h4>Current Status</h4>
        <div class="info-row"><span class="label">Hull:</span><span class="value ${getStatusColor(hullPercent)}">${hullPercent}%</span></div>
        <div class="info-row"><span class="label">Fuel:</span><span class="value ${getStatusColor(fuelPercent)}">${currentFuel}/${maxFuel} tons</span></div>
        <div class="info-row"><span class="label">Power:</span><span class="value">${shipState.powerPercent ?? 100}%</span></div>
        <div class="info-row"><span class="label">Alert:</span><span class="value alert-${(shipState.alertStatus || 'normal').toLowerCase()}">${shipState.alertStatus || 'Normal'}</span></div>
        <div class="info-row"><span class="label">Location:</span><span class="value">${shipState.location || 'Unknown'}</span></div>
      </div>
    </div>
  `;

  // Ship systems if available
  if (shipState.systems) {
    content += `<div class="info-section"><h4>Ship Systems</h4>`;
    for (const [name, sys] of Object.entries(shipState.systems)) {
      const statusClass = sys.status === 'operational' ? 'status-green' :
                         sys.status === 'degraded' ? 'status-yellow' : 'status-red';
      content += `<div class="info-row">
        <span class="label">${name}:</span>
        <span class="value ${statusClass}">${sys.health || 100}% - ${sys.status || 'Unknown'}</span>
      </div>`;
    }
    content += `</div>`;
  }

  // Weapons - get from template_data turrets
  const weaponsHtml = formatShipWeapons(template);
  if (weaponsHtml) {
    content += `<div class="info-section weapons-section"><h4>Armament</h4>${weaponsHtml}</div>`;
  }

  document.getElementById('ship-status-content').innerHTML = content;
}

// Format weapon ID to readable name
function formatWeaponName(weaponId) {
  const names = {
    'beam_laser': 'Beam Laser',
    'pulse_laser': 'Pulse Laser',
    'missile_rack': 'Missile Rack',
    'sandcaster': 'Sandcaster',
    'particle_beam': 'Particle Beam',
    'fusion_gun': 'Fusion Gun',
    'plasma_gun': 'Plasma Gun',
    'meson_gun': 'Meson Gun'
  };
  return names[weaponId] || weaponId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Format turret type
function formatTurretType(type) {
  const types = {
    'single': 'Single Turret',
    'double': 'Double Turret',
    'triple': 'Triple Turret',
    'pop_up_single': 'Pop-up Single',
    'pop_up_double': 'Pop-up Double',
    'barbette': 'Barbette',
    'bay': 'Bay Weapon',
    'spinal': 'Spinal Mount'
  };
  return types[type] || type;
}

// Get formatted weapons list from ship template
function formatShipWeapons(template) {
  const turrets = template?.turrets || [];
  if (turrets.length === 0) return null;

  return turrets.map(turret => {
    const type = formatTurretType(turret.type);
    const weapons = (turret.weapons || []).map(formatWeaponName);
    const concealed = turret.concealed ? ' (Concealed)' : '';
    return `<div class="weapon-row">
      <span class="turret-type">${type}${concealed}:</span>
      <span class="weapon-list">${weapons.join(', ')}</span>
    </div>`;
  }).join('');
}

// ==================== Contact Tooltip (TIP-1) ====================
function showContactTooltip(contactId, targetElement) {
  const contact = state.contacts.find(c => c.id === contactId);
  if (!contact) return;

  const tooltip = document.getElementById('contact-tooltip');
  const nameEl = document.getElementById('tooltip-contact-name');
  const contentEl = document.getElementById('tooltip-content');

  // Set name
  nameEl.textContent = contact.name || contact.type || 'Unknown Contact';

  // SHIP-6: Get ASCII art for the contact type
  const asciiArt = getShipAsciiArt(contact.ship_type || contact.type);

  // Build tooltip content - start with ASCII art if available
  let content = '';
  if (asciiArt) {
    content += `<pre class="ship-ascii-art">${escapeHtml(asciiArt)}</pre>`;
  }

  content += `
    <div class="tooltip-row">
      <span class="label">Type:</span>
      <span class="value">${contact.type || 'Unknown'}</span>
    </div>
    <div class="tooltip-row">
      <span class="label">Bearing:</span>
      <span class="value">${contact.bearing}°</span>
    </div>
    <div class="tooltip-row">
      <span class="label">Range:</span>
      <span class="value">${formatRange(contact.range_km)} (${formatRangeBand(contact.range_band)})</span>
    </div>
    <div class="tooltip-row">
      <span class="label">Transponder:</span>
      <span class="value">${contact.transponder || 'None'}</span>
    </div>
    <div class="tooltip-row">
      <span class="label">Signature:</span>
      <span class="value">${contact.signature || 'Normal'}</span>
    </div>
  `;

  // GM-only info
  if (state.isGM && contact.gm_notes) {
    content += `
      <div class="tooltip-row gm-only">
        <span class="label">GM Notes:</span>
        <span class="value">${escapeHtml(contact.gm_notes)}</span>
      </div>
    `;
  }

  // Targetable info
  if (contact.is_targetable) {
    content += `
      <div class="tooltip-row">
        <span class="label">Health:</span>
        <span class="value">${contact.health}/${contact.max_health}</span>
      </div>
      <div class="tooltip-row">
        <span class="label">Weapons Free:</span>
        <span class="value">${contact.weapons_free ? 'Yes' : 'No'}</span>
      </div>
    `;
  }

  // TIP-3: UWP tooltip for planets/celestial objects
  if (contact.uwp) {
    content += `
      <div class="tooltip-row">
        <span class="label">UWP:</span>
        <span class="value">${createUWPSpan(contact.uwp)}</span>
      </div>
    `;
  }

  // Stellar class for stars
  if (contact.stellar_class) {
    content += `
      <div class="tooltip-row">
        <span class="label">Stellar Class:</span>
        <span class="value">${escapeHtml(contact.stellar_class)}</span>
      </div>
    `;
  }

  // Trade codes
  if (contact.trade_codes) {
    const codes = typeof contact.trade_codes === 'string' ? JSON.parse(contact.trade_codes) : contact.trade_codes;
    if (codes && codes.length > 0) {
      content += `
        <div class="tooltip-row">
          <span class="label">Trade Codes:</span>
          <span class="value">${escapeHtml(codes.join(', '))}</span>
        </div>
      `;
    }
  }

  // Wiki reference link
  if (contact.wiki_url) {
    content += `
      <div class="tooltip-row">
        <span class="label">Reference:</span>
        <span class="value"><a href="${escapeHtml(contact.wiki_url)}" target="_blank" rel="noopener" class="wiki-link">Traveller Wiki</a></span>
      </div>
    `;
  }

  // Ship weapons (from ship_data or template)
  const shipData = contact.ship_data ? (typeof contact.ship_data === 'string' ? JSON.parse(contact.ship_data) : contact.ship_data) : null;
  if (shipData?.turrets && shipData.turrets.length > 0) {
    const weaponsHtml = formatShipWeapons(shipData);
    if (weaponsHtml) {
      content += `<div class="tooltip-weapons"><strong>Armament:</strong>${weaponsHtml}</div>`;
    }
  }

  contentEl.innerHTML = content;

  // Position tooltip near target element
  const rect = targetElement.getBoundingClientRect();
  const tooltipWidth = 280;
  let left = rect.right + 10;
  let top = rect.top;

  // Keep tooltip on screen
  if (left + tooltipWidth > window.innerWidth) {
    left = rect.left - tooltipWidth - 10;
  }
  if (top + 200 > window.innerHeight) {
    top = window.innerHeight - 220;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.classList.remove('hidden');

  // Mark contact as selected
  document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('selected'));
  targetElement.classList.add('selected');
  state.pinnedContactId = contactId;
}

function hideContactTooltip() {
  const tooltip = document.getElementById('contact-tooltip');
  tooltip.classList.add('hidden');
  document.querySelectorAll('.contact-item').forEach(el => el.classList.remove('selected'));
  state.pinnedContactId = null;
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

  // GM-2: Check for campaign code in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const campaignCode = urlParams.get('code') || urlParams.get('campaign');
  if (campaignCode) {
    // Auto-fill campaign code and show player login
    document.getElementById('campaign-code').value = campaignCode.toUpperCase();
    document.getElementById('login-screen').querySelector('.login-options').classList.add('hidden');
    document.getElementById('campaign-select').classList.add('hidden');
    document.getElementById('player-select').classList.remove('hidden');
    // Focus the join button
    setTimeout(() => document.getElementById('btn-join-campaign').focus(), 100);
  }

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  });

  // TIP-1: Contact tooltip close button and click-outside-to-close
  document.getElementById('btn-close-tooltip').addEventListener('click', hideContactTooltip);
  document.addEventListener('click', (e) => {
    const tooltip = document.getElementById('contact-tooltip');
    if (!tooltip.classList.contains('hidden') &&
        !tooltip.contains(e.target) &&
        !e.target.closest('.contact-item')) {
      hideContactTooltip();
    }
  });

  // TIP-3: Initialize UWP tooltip system
  initUWPTooltips();

  // Stage 7: Initialize character tooltip system
  initCharacterTooltips();
});

// ==================== Global Exports for onclick handlers ====================
// ES6 modules scope functions, but onclick handlers need global access
window.attemptRepair = attemptRepair;
window.openRefuelModal = openRefuelModal;
window.openProcessFuelModal = openProcessFuelModal;
window.completeJump = completeJump;
window.initiateJump = initiateJump;
window.plotJumpCourse = plotJumpCourse;
window.initiateJumpFromPlot = initiateJumpFromPlot;
window.performScan = performScan;
window.authorizeWeapons = authorizeWeapons;
window.fireAtTarget = fireAtTarget;
window.skipToJumpExit = skipToJumpExit;
window.showNewsMailModal = showNewsMailModal;
window.closeNewsMailModal = closeNewsMailModal;
window.updateFuelEstimate = updateFuelEstimate;
window.setRefuelMax = setRefuelMax;
window.setProcessMax = setProcessMax;
window.executeRefuel = executeRefuel;
window.executeProcessFuel = executeProcessFuel;
// Stage 6: Jump map functions
window.updateJumpMap = updateJumpMap;
window.selectJumpDestination = selectJumpDestination;
