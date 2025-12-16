/**
 * Traveller Starship Operations VTT - Main Application
 * Handles UI state, socket communication, and user interactions
 */

// ==================== Module Imports ====================
import { SHIP_ASCII_ART, getShipAsciiArt } from './modules/ascii-art.js';
import { escapeHtml, formatRoleName, formatActionName, formatRange, getRangeClass, formatRangeBand, formatSystemName, getStatusColor, getContactIcon } from './modules/utils.js';
import { UWP_DATA, decodeUWP, formatUWPTooltip, getUWPSummary, createUWPSpan, initUWPTooltips } from './modules/uwp-decoder.js';
import { formatSkillName, formatCharacterTooltip, initCharacterTooltips } from './modules/tooltips.js';
import tooltipStrategy from './modules/tooltips-strategy.js';
import { getRoleDetailContent, getActionMessage, renderSystemStatusItem } from './modules/role-panels.js';
import * as combat from './modules/combat.js';
import { show, hide, toggle, setText, getValue } from './modules/dom-helpers.js';
import { copyWithFeedback } from './modules/clipboard.js';
import {
  initSystemMap,
  loadSystem as loadSystemMap,
  destroySystemMap,
  loadTestSystem,
  TEST_SYSTEMS,
  togglePause,
  setTimeSpeed,
  advanceTime as advanceMapTime,
  rewindTime as rewindMapTime,
  resetTime as resetMapTime,
  setDate as setMapDate,
  getDate as getMapDate,
  systemMapState,
  showPlacesOverlay,
  hidePlacesOverlay,
  resizeCanvas as resizeSystemMapCanvas,
  updateMapContacts,  // AR-71: Sync contacts to system map
  loadSystemFromJSON  // Load systems from JSON files
} from './modules/system-map.js';
import { applyStatusIndicators, toggleStatusIndicators } from './modules/ui-status-registry.js';
import { DEBUG, debugLog, debugWarn, debugError } from './modules/debug-config.js';
import { DEFAULT_SECTOR, DEFAULT_SUBSECTOR, DEFAULT_SYSTEM, DEFAULT_HEX } from './modules/constants.js';
import { startBridgeClock, stopBridgeClock, setBridgeClockDate, parseCampaignDate, formatClockTime, formatDayYear } from './modules/bridge-clock.js';
import { showNewsMailModal as _showNewsMailModal, closeNewsMailModal } from './modules/news-mail.js';
import { sendBridgeChatMessage as _sendBridgeChatMessage, addBridgeChatMessage } from './modules/bridge-chat.js';
import {
  showLibraryComputer as _showLibraryComputer,
  searchLibrary as _searchLibrary,
  showLibraryTab as _showLibraryTab,
  decodeUWPLibrary as _decodeUWPLibrary,
  handleLibraryResults,
  handleUWPDecoded,
  handleTradeCodes,
  handleStarports
} from './modules/library-computer.js';
import {
  updateAIQueueBadge as _updateAIQueueBadge,
  loadAIPendingResponses as _loadAIPendingResponses,
  showAIApprovalQueue as _showAIApprovalQueue,
  closeAIQueueModal,
  approveAIResponse as _approveAIResponse,
  rejectAIResponse as _rejectAIResponse
} from './modules/ai-npc-queue.js';
import { showShipStatusModal as _showShipStatusModal } from './modules/ship-status-modal.js';
import { showMailModal as _showMailModal, showMailDetailModal as _showMailDetailModal, updateMailBadge as _updateMailBadge } from './modules/mail-modal.js';
import { showComposeMailModal as _showComposeMailModal, populateComposeContacts as _populateComposeContacts } from './modules/mail-compose.js';
import { showFeedbackForm as _showFeedbackForm, submitFeedback as _submitFeedback, showFeedbackReview as _showFeedbackReview, copyLogAsTodo as _copyLogAsTodo } from './modules/feedback-form.js';

// Wrappers to inject state into module functions
const showNewsMailModal = (systemName) => _showNewsMailModal(state, systemName);
const sendBridgeChatMessage = () => _sendBridgeChatMessage(state);
const showLibraryComputer = () => _showLibraryComputer(showModalContent);
const searchLibrary = (query) => _searchLibrary(state, query);
const showLibraryTab = (tab) => _showLibraryTab(state, tab);
const decodeUWPLibrary = (uwp) => _decodeUWPLibrary(state, uwp);
const updateAIQueueBadge = () => _updateAIQueueBadge(state);
const loadAIPendingResponses = () => _loadAIPendingResponses(state);
const showAIApprovalQueue = () => _showAIApprovalQueue(state);
const approveAIResponse = (id) => _approveAIResponse(state, showNotification, id);
const rejectAIResponse = (id) => _rejectAIResponse(state, showNotification, id);
const showShipStatusModal = () => _showShipStatusModal(state, showModal, formatShipWeapons);
const showMailModal = (mailList, unread) => _showMailModal(state, showModalContent, mailList, unread);
const showMailDetailModal = (mail) => _showMailDetailModal(state, showModalContent, mail);
const updateMailBadge = () => _updateMailBadge(state);
const showComposeMailModal = () => _showComposeMailModal(state, showModalContent, showError, showMessage);
const populateComposeContacts = (contacts) => _populateComposeContacts(state, contacts);
const showFeedbackForm = () => _showFeedbackForm(showModalContent);
const submitFeedback = () => _submitFeedback(state, showNotification, closeModal);
const showFeedbackReview = () => _showFeedbackReview(state, showModalContent);
const copyLogAsTodo = (msg) => _copyLogAsTodo(showNotification, msg);

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
  pinnedContactId: null,  // TIP-1: Currently pinned contact for tooltip
  contactSort: 'range',   // AR-25: Contact sort preference
  contactFilter: 'all',   // AR-25: Contact filter preference
  sensorPanelMode: 'collapsed',  // AR-138: 'collapsed', 'expanded', 'combat'
  captainActivePanel: 'captain', // AR-131+: 'captain', 'astrogator', 'pilot', 'engineer'

  // AUTORUN-8: Prep data
  prepReveals: [],
  prepNpcs: [],
  prepLocations: [],
  prepEvents: [],
  prepEmails: [],
  prepHandouts: [],

  // AR-130: AI NPC pending responses
  aiPendingResponses: []
};

// Expose state globally for cross-module access (system-map.js, etc.)
window.state = state;

// ==================== Socket Setup ====================
function initSocket() {
  state.socket = io();

  // Connection events
  state.socket.on('connect', () => {
    debugLog('Connected to server');
    // Try to reconnect to previous session (Stage 3.5.5)
    tryReconnect();

    // Start heartbeat to keep connection alive (every 60 seconds)
    if (state.heartbeatInterval) clearInterval(state.heartbeatInterval);
    state.heartbeatInterval = setInterval(() => {
      state.socket.emit('ops:ping');
    }, 60000);

    // AR-30: Setup pilot listeners
    setupPilotListeners();
    // AR-31: Setup engineer listeners
    setupEngineerListeners();
    // AR-57: Setup transit calculator
    setupTransitCalculator();
  });

  state.socket.on('disconnect', () => {
    debugLog('Disconnected from server');
    showNotification('Disconnected from server', 'error');
    // Stop heartbeat on disconnect
    if (state.heartbeatInterval) {
      clearInterval(state.heartbeatInterval);
      state.heartbeatInterval = null;
    }
  });

  // Reconnect events (Stage 3.5.5)
  state.socket.on('ops:reconnected', (data) => {
    debugLog('Reconnected to session:', data.screen);
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
    debugLog('Reconnect failed:', data.reason);
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
      // AR-27: Request shared map state
      state.socket.emit('ops:getMapState');
      // AR-130: Load pending AI responses
      loadAIPendingResponses();
    }
  });

  state.socket.on('ops:campaignUpdated', (data) => {
    state.campaign = data.campaign;
    if (state.isGM) {
      renderGMSetup();
    }
  });

  // AR-21: Campaign CRUD events
  state.socket.on('ops:campaignDeleted', (data) => {
    state.campaigns = state.campaigns.filter(c => c.id !== data.campaignId);
    renderCampaignList();
  });

  state.socket.on('ops:campaignDuplicated', (data) => {
    state.campaigns.push(data.campaign);
    renderCampaignList();
  });

  state.socket.on('ops:campaignRenamed', (data) => {
    const campaign = state.campaigns.find(c => c.id === data.campaignId);
    if (campaign) campaign.name = data.name;
    renderCampaignList();
  });

  // AR-21: Export campaign - download JSON file
  state.socket.on('ops:campaignExported', (data) => {
    const json = JSON.stringify(data.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.data.manifest.campaignName.replace(/[^a-z0-9]/gi, '_')}_export.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // AR-21: Import campaign - add to list
  state.socket.on('ops:campaignImported', (data) => {
    state.campaigns.push(data.campaign);
    renderCampaignList();
    showNotification(`Campaign "${data.campaign.name}" imported successfully`, 'success');
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
    // AR-27: Request shared map state
    state.socket.emit('ops:getMapState');
  });

  state.socket.on('ops:playerSlotSelected', (data) => {
    state.player = data.account;
    state.ships = data.ships;
    state.isGuest = false;

    // Get available party ships
    const partyShips = (data.ships || []).filter(s => s.is_party_ship && s.visible_to_players);

    // Auto-select default ship from account preferences (if still valid)
    if (data.account.ship_id && partyShips.some(s => s.id === data.account.ship_id)) {
      state.selectedShipId = data.account.ship_id;
    } else if (partyShips.length === 1) {
      // Auto-select if only one party ship available
      state.selectedShipId = partyShips[0].id;
    } else {
      state.selectedShipId = null;
    }

    // Auto-select role from account preferences
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

  // Relieved from duty by Captain or Medical Officer
  state.socket.on('ops:relievedFromDuty', (data) => {
    const roleName = formatRoleName(data.previousRole);
    state.selectedRole = null;
    const message = data.reason
      ? `You have been relieved of ${roleName} duty by ${data.byCaption}: ${data.reason}`
      : `You have been relieved of ${roleName} duty by ${data.byCaption}`;
    showNotification(message, 'warning');
    // Return to player setup to select new role
    document.getElementById('gm-overlay')?.classList.add('hidden');
    showScreen('player-setup');
    renderPlayerSetup();
  });

  // Confirmation when Captain/Medic/GM relieves someone
  state.socket.on('ops:crewMemberRelieved', (data) => {
    showNotification(`${data.slotName} has been relieved of ${formatRoleName(data.previousRole)} duty`, 'success');
    // Update local crew state - find the relieved crew member and clear their role
    const crewIdx = state.crewOnline.findIndex(c =>
      (c.id && c.id === data.accountId) || (c.accountId && c.accountId === data.accountId)
    );
    if (crewIdx >= 0) {
      state.crewOnline[crewIdx].role = null;
    }
    renderCrewList();
  });

  // Confirmation when GM assigns role
  state.socket.on('ops:gmRoleAssigned', (data) => {
    showNotification(`${data.slotName} assigned to ${formatRoleName(data.role)}`, 'success');
    renderCrewList();
  });

  // Player notified when GM assigns them a role
  state.socket.on('ops:roleAssignedByGM', (data) => {
    state.selectedRole = data.role;
    state.selectedRoleInstance = data.roleInstance || 1;
    showNotification(`GM assigned you to ${formatRoleName(data.role)}`, 'info');
    updateBridgeHeader();
    updateRoleClass();
    renderRolePanel();
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

  // AR-135: Handle being bumped from a role
  state.socket.on('ops:roleBumped', (data) => {
    const { oldRole, newRole, message } = data;
    debugLog('[OPS] Role bumped:', data);

    // Update local state
    state.selectedRole = newRole;

    // Show toast notification
    showNotification(message || `You have been moved to ${newRole} role`, 'warning', 5000);

    // Re-render if on bridge
    if (state.currentScreen === 'bridge') {
      renderBridge();
    } else if (state.currentScreen === 'player-setup') {
      renderPlayerSetup();
    }
  });

  state.socket.on('ops:crewUpdate', (data) => {
    // Another player changed their role
    debugLog('[OPS] Crew update received:', data);

    // Update role selection if on player-setup screen
    if (state.currentScreen === 'player-setup') {
      renderRoleSelection();
    }

    // Update bridge crew display if on bridge screen
    if (state.currentScreen === 'bridge') {
      // Skip GM entries - GM is an observer, not crew
      if (data.role === 'gm' || data.isGM) {
        return;
      }
      // Update crewOnline array with the change
      if (data.crew) {
        // Full crew list provided - filter out any GM entries
        state.crewOnline = data.crew.filter(c => c.role !== 'gm' && !c.isGM);
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
            isNPC: false,
            character_data: data.character_data || null  // AR-14.7.4: Include character data for crew cards
          });
        }
      } else if (data.action === 'left' || data.action === 'disconnected' || data.action === 'relieved') {
        // Someone left, disconnected, or was relieved - remove them or clear their role
        const existingIdx = state.crewOnline.findIndex(c => c.accountId === data.accountId);
        if (existingIdx >= 0) {
          if (data.action === 'disconnected') {
            state.crewOnline.splice(existingIdx, 1);
          } else {
            state.crewOnline[existingIdx].role = null;
          }
        }
      }
      renderCrewList();
    }
  });

  // Bridge events
  state.socket.on('ops:bridgeJoined', (data) => {
    state.ship = data.ship || {};
    state.ship.npcCrew = data.npcCrew || [];  // Store NPC crew on ship object
    state.selectedShipId = data.ship?.id;
    // Filter out any GM entries from crew - GM is observer, not crew
    state.crewOnline = (data.crew || []).filter(c => c.role !== 'gm' && !c.isGM);
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
    // AR-102: Load current system data early for system map and navigation
    if (data.campaign?.current_system) {
      loadCurrentSystem(data.campaign.current_system);
    }
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

  // AR-97: Bridge Chat - receive transmissions
  state.socket.on('comms:newTransmission', (transmission) => {
    addBridgeChatMessage(transmission);
  });

  state.socket.on('ops:timeAdvanced', (data) => {
    // CLEAN-2: Consolidated handler (removed duplicate in setupPilotListeners)
    if (state.campaign) {
      state.campaign.current_date = data.newDate;
    }
    setBridgeClockDate(data.newDate);
    showNotification(`Time: ${data.newDate}${data.advancedBy ? ` (${data.advancedBy})` : ''}`, 'info');
  });

  state.socket.on('ops:alertStatusChanged', (data) => {
    const status = data.alertStatus || data.status;
    updateAlertStatus(status);
    // Apply border to all panels based on alert
    applyAlertBorder(status);
    if (state.selectedRole === 'captain') {
      renderRoleDetailPanel('captain');
    }
  });

  // AR-29 + AR-35: Captain event handlers with multi-ack tracking
  state.socket.on('ops:orderReceived', (data) => {
    // Show order to targeted crew
    const { target, order, from, id, requiresAck, pendingAcks, acknowledgedBy, orderType, contactId } = data;

    // AR-35: Store order in state for pending display
    if (!state.pendingOrders) state.pendingOrders = [];
    state.pendingOrders.push({
      id, target, order, from, requiresAck,
      pendingAcks: pendingAcks || [],
      acknowledgedBy: acknowledgedBy || [],
      timestamp: Date.now(),
      orderType, contactId
    });
    // Keep only last 20 orders
    if (state.pendingOrders.length > 20) state.pendingOrders.shift();

    if (target === 'all' || target === state.selectedRole) {
      showNotification(`Order from ${from}: ${order}`, 'warning');
      // Show acknowledge button for targeted roles
      if (requiresAck && state.selectedRole !== 'captain') {
        showOrderAckPrompt(id, order);
      }
    }
    // Captain sees all orders in panel
    if (state.selectedRole === 'captain') {
      updatePendingOrdersDisplay();
    }
  });

  state.socket.on('ops:orderAcknowledged', (data) => {
    const { orderId, acknowledgedBy, allAcknowledgedBy, pendingAcks, fullyAcknowledged } = data;

    // AR-35: Update order in state
    if (state.pendingOrders) {
      const order = state.pendingOrders.find(o => o.id === orderId);
      if (order) {
        order.acknowledgedBy = allAcknowledgedBy || [];
        order.pendingAcks = pendingAcks || [];
        if (fullyAcknowledged) {
          order.status = 'acknowledged';
        }
      }
    }

    if (state.selectedRole === 'captain') {
      const remaining = pendingAcks?.length || 0;
      const msg = fullyAcknowledged
        ? `${acknowledgedBy} acknowledged - Order complete`
        : `${acknowledgedBy} acknowledged (${remaining} pending)`;
      showNotification(msg, fullyAcknowledged ? 'success' : 'info');
      updatePendingOrdersDisplay();
    }
  });

  state.socket.on('ops:weaponsAuthChanged', (data) => {
    const { mode, authorizedTargets } = data;
    state.weaponsAuth = { mode, targets: authorizedTargets };
    // Update bridge header indicator
    updateWeaponsAuthIndicator(mode);
    if (state.selectedRole === 'gunner') {
      showNotification(`Weapons ${mode === 'free' ? 'FREE - cleared to engage' : 'HOLD - do not fire'}`, mode === 'free' ? 'warning' : 'info');
      renderRoleDetailPanel('gunner');
    }
    if (state.selectedRole === 'captain') {
      renderRoleDetailPanel('captain');
    }
  });

  state.socket.on('ops:contactMarked', (data) => {
    const { contactId, marking, markedBy } = data;
    // Update contact in state
    if (state.contacts) {
      const contact = state.contacts.find(c => c.id === contactId);
      if (contact) {
        contact.marking = marking;
      }
    }
    showNotification(`Contact marked ${marking} by ${markedBy}`, marking === 'hostile' ? 'warning' : 'info');
    renderRoleDetailPanel(state.selectedRole);
  });

  state.socket.on('ops:statusRequested', (data) => {
    // Auto-respond with status if we're a crew role
    if (state.selectedRole && state.selectedRole !== 'captain' && !state.isGM) {
      const status = generateRoleStatus(state.selectedRole);
      state.socket.emit('ops:statusReport', { role: state.selectedRole, status });
      showNotification('Status report sent to Captain', 'info');
    }
  });

  state.socket.on('ops:statusReceived', (data) => {
    // Captain receives status reports
    if (state.selectedRole === 'captain') {
      const { role, status, from } = data;
      showNotification(`${from} reports: ${status.summary || 'Ready'}`, 'info');
    }
  });

  state.socket.on('ops:leadershipResult', (data) => {
    const { roll, skill, dm, target, expires } = data;
    const resultEl = document.getElementById('leadership-result');
    if (resultEl) {
      resultEl.innerHTML = `
        <div class="leadership-roll">
          <strong>Leadership:</strong> ${roll} + ${skill} = ${roll + skill}
          <span class="dm ${dm >= 0 ? 'positive' : 'negative'}">DM ${dm >= 0 ? '+' : ''}${dm}</span>
          <small>(applies to next ${target} action)</small>
        </div>
      `;
    }
    state.leadershipDM = { dm, target, expires };
    showNotification(`Leadership check: DM ${dm >= 0 ? '+' : ''}${dm} to next action`, dm >= 0 ? 'success' : 'warning');
  });

  state.socket.on('ops:tacticsResult', (data) => {
    const { roll, skill, bonus } = data;
    const resultEl = document.getElementById('leadership-result');
    if (resultEl) {
      resultEl.innerHTML = `
        <div class="tactics-roll">
          <strong>Tactics:</strong> ${roll} + ${skill} = ${roll + skill}
          <span class="dm positive">Initiative +${bonus}</span>
        </div>
      `;
    }
    showNotification(`Tactics check: Initiative +${bonus}`, 'success');
  });

  state.socket.on('ops:leadershipApplied', (data) => {
    const { dm, appliedTo, action } = data;
    showNotification(`Leadership DM ${dm >= 0 ? '+' : ''}${dm} applied to ${appliedTo}'s ${action}`, 'info');
    state.leadershipDM = null;
  });

  // Stage 5: Current system updated (TravellerMap)
  state.socket.on('ops:currentSystemUpdated', (data) => {
    const locationEl = document.getElementById('bridge-location');
    if (locationEl) {
      locationEl.textContent = data.locationDisplay;
    }
    // AR-103: Update hex coordinate display in top bar with system name tooltip
    const hexEl = document.getElementById('bridge-hex');
    if (hexEl) {
      hexEl.textContent = data.hex || '----';
      hexEl.title = data.locationDisplay || 'Current parsec';
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

  // AR-23.6: Deep space mode updated
  state.socket.on('ops:deepSpaceUpdated', (data) => {
    if (state.campaign) {
      state.campaign.in_deep_space = data.inDeepSpace;
      state.campaign.deep_space_reference = data.referenceSystem;
      state.campaign.deep_space_bearing = data.bearing;
      state.campaign.deep_space_distance = data.distance;
      state.campaign.current_system = data.locationDisplay;
    }
    const locationEl = document.getElementById('bridge-location');
    if (locationEl) {
      locationEl.textContent = data.locationDisplay || 'Deep Space';
    }
    showNotification(data.inDeepSpace ? 'Entered deep space' : 'Exited deep space', 'info');
  });

  // AR-23.7: Location data (history, favorites, home)
  state.socket.on('ops:locationData', (data) => {
    state.locationHistory = data.locationHistory || [];
    state.favoriteLocations = data.favoriteLocations || [];
    state.homeSystem = data.homeSystem || null;
    state.inDeepSpace = data.inDeepSpace || false;
    state.deepSpaceReference = data.deepSpaceReference;
    state.deepSpaceBearing = data.deepSpaceBearing;
    state.deepSpaceDistance = data.deepSpaceDistance;
    renderQuickLocations();
  });

  state.socket.on('ops:homeSystemSet', (data) => {
    state.homeSystem = data.homeSystem;
    renderQuickLocations();
    showNotification(`Home system set to ${data.homeSystem}`, 'success');
  });

  state.socket.on('ops:favoritesUpdated', (data) => {
    state.favoriteLocations = data.favoriteLocations || [];
    renderQuickLocations();
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
    // Also populate ship editor if open
    populateShipEditor();
  });

  // Full template data for ship editor (AR-17)
  state.socket.on('ops:fullTemplate', (data) => {
    if (data.template) {
      shipEditor.editData = data.template;
      shipEditor.weapons = data.template.weapons || [];
      shipEditor.systems = data.template.systems || [];
      populateEditorFields(data.template);

      // Show preview
      const preview = document.getElementById('edit-template-preview');
      if (preview) {
        preview.innerHTML = `
          <div class="preview-stats">
            <div class="preview-stat">
              <span class="label">Tonnage</span>
              <span class="value">${data.template.tonnage || 100}t</span>
            </div>
            <div class="preview-stat">
              <span class="label">Jump</span>
              <span class="value">J-${data.template.drives?.jump?.rating || 0}</span>
            </div>
            <div class="preview-stat">
              <span class="label">Thrust</span>
              <span class="value">${data.template.drives?.manoeuvre?.thrust || 0}G</span>
            </div>
            <div class="preview-stat">
              <span class="label">Hull</span>
              <span class="value">${data.template.hull?.hullPoints || 40} HP</span>
            </div>
          </div>
        `;
      }
    }
  });

  // Ship updated (AR-17)
  state.socket.on('ops:shipUpdated', (data) => {
    const idx = state.ships.findIndex(s => s.id === data.ship.id);
    if (idx >= 0) {
      state.ships[idx] = data.ship;
    }
    renderGMSetup();
    closeModal();
    showNotification(`Ship "${data.ship.name}" updated`, 'success');
  });

  // Contact events
  state.socket.on('ops:contacts', (data) => {
    state.contacts = data.contacts;
    renderContacts();
    renderCombatContactsList(); // Autorun 14
    checkSensorThreats(); // AR-138.3: Auto-expand on threat
  });

  state.socket.on('ops:contactAdded', (data) => {
    state.contacts.push(data.contact);
    renderContacts();
    renderCombatContactsList(); // Autorun 14
    showNotification(`Contact added: ${data.contact.name || data.contact.type}`, 'info');
    checkSensorThreats(); // AR-138.3: Auto-expand on threat
  });

  state.socket.on('ops:contactUpdated', (data) => {
    const idx = state.contacts.findIndex(c => c.id === data.contact.id);
    if (idx >= 0) state.contacts[idx] = data.contact;
    renderContacts();
    renderCombatContactsList(); // Autorun 14
  });

  state.socket.on('ops:contactDeleted', (data) => {
    state.contacts = state.contacts.filter(c => c.id !== data.contactId);
    renderContacts();
    renderCombatContactsList(); // Autorun 14
  });

  // CLEAN-1: ops:scanResult handler moved to Autorun 5 section (line ~1167)
  // Removed duplicate handler that was causing double updates

  // Ship Systems events
  state.socket.on('ops:systemStatus', (data) => {
    state.systemStatus = data.systemStatus;
    state.damagedSystems = data.damagedSystems;
    if (state.selectedRole === 'engineer' || state.selectedRole === 'damage_control') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  state.socket.on('ops:systemDamaged', (data) => {
    state.systemStatus = data.systemStatus;
    state.damagedSystems = Object.keys(data.systemStatus).filter(s =>
      data.systemStatus[s]?.totalSeverity > 0
    );
    showNotification(`System damage: ${formatSystemName(data.location)} (Severity ${data.severity})`, 'warning');
    if (state.selectedRole === 'engineer' || state.selectedRole === 'damage_control') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  state.socket.on('ops:repairAttempted', (data) => {
    state.systemStatus = data.systemStatus;
    state.damagedSystems = Object.keys(data.systemStatus).filter(s =>
      data.systemStatus[s]?.totalSeverity > 0
    );
    const notifType = data.success ? 'success' : 'warning';
    showNotification(data.message, notifType);
    if (state.selectedRole === 'engineer' || state.selectedRole === 'damage_control') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  state.socket.on('ops:systemDamageCleared', (data) => {
    state.systemStatus = data.systemStatus;
    state.damagedSystems = Object.keys(data.systemStatus).filter(s =>
      data.systemStatus[s]?.totalSeverity > 0
    );
    showNotification(`Damage cleared: ${data.location === 'all' ? 'all systems' : formatSystemName(data.location)}`, 'success');
    if (state.selectedRole === 'engineer' || state.selectedRole === 'damage_control') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  // Jump events
  state.socket.on('ops:jumpStatus', (data) => {
    state.jumpStatus = data;
    if (state.selectedRole === 'astrogator' || state.selectedRole === 'pilot') {
      renderRoleDetailPanel(state.selectedRole);
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
    renderRoleDetailPanel(state.selectedRole);
    renderShipStatus();
  });

  state.socket.on('ops:jumpCompleted', (data) => {
    state.jumpStatus = { inJump: false };
    state.campaign.current_system = data.arrivedAt;
    // AR-124: Sync position verification state to BOTH state objects
    // Critical: role-panels reads from state.ship.current_state, not state.shipState
    const positionVerified = data.positionVerified ?? false;
    if (state.ship?.current_state) {
      state.ship.current_state.positionVerified = positionVerified;
      state.ship.current_state.locationId = 'loc-exit-jump';
      state.ship.current_state.locationName = 'Exit Jump Space';
    }
    if (state.shipState) {
      state.shipState.positionVerified = positionVerified;
      state.shipState.locationId = 'loc-exit-jump';
      state.shipState.locationName = 'Exit Jump Space';
    }
    // AR-103: Update hex after jump (parsec location changed) with system tooltip
    // AR-126: Also update sector for jump map recentering
    if (data.hex) {
      state.campaign.current_hex = data.hex;
      if (state.ship?.current_state) {
        state.ship.current_state.systemHex = data.hex;
      }
      if (state.shipState) {
        state.shipState.systemHex = data.hex;
      }
      const hexEl = document.getElementById('bridge-hex');
      if (hexEl) {
        hexEl.textContent = data.hex;
        hexEl.title = data.arrivedAt || 'Current parsec';
      }
    }
    // AR-126: Update sector for jump map
    if (data.sector) {
      state.campaign.current_sector = data.sector;
    }
    // Stage 7: Update date after jump
    if (data.newDate) {
      state.campaign.current_date = data.newDate;
    }
    // Autorun 5: Store news and mail for display
    state.systemNews = data.news || [];
    state.systemMail = data.mail || {};
    state.selectedRoleContent = data.roleContent || {};
    showNotification(`Arrived at ${data.arrivedAt}`, 'success');
    renderRoleDetailPanel(state.selectedRole);
    renderBridge();
    // AR-126: Refresh jump map with new location
    initJumpMapIfNeeded();
    // Show news/mail modal if there's content
    if (state.systemNews.length > 0 || Object.keys(state.systemMail).length > 0) {
      showNewsMailModal(data.arrivedAt);
    }
  });

  // AR-68: Position verification result
  // AR-124: Sync to both state objects
  state.socket.on('ops:positionVerified', (data) => {
    // Update BOTH state objects for consistency
    if (state.ship?.current_state) {
      state.ship.current_state.positionVerified = true;
    }
    if (state.shipState) {
      state.shipState.positionVerified = true;
    }
    // AR-110: Update campaign location data from verification response
    if (data.currentSystem) {
      state.campaign.current_system = data.currentSystem;
    }
    if (data.currentHex) {
      state.campaign.current_hex = data.currentHex;
      if (state.ship?.current_state) {
        state.ship.current_state.systemHex = data.currentHex;
      }
      if (state.shipState) {
        state.shipState.systemHex = data.currentHex;
      }
    }
    if (data.currentSector) {
      state.campaign.current_sector = data.currentSector;
    }
    showNotification(data.message, data.success ? 'success' : 'warning');
    renderRoleDetailPanel(state.selectedRole);
    renderBridge();
  });

  state.socket.on('ops:locationChanged', (data) => {
    state.campaign.current_system = data.newLocation;
    if (data.newDate) {
      state.campaign.current_date = data.newDate;
    }
    // AR-110: Update hex when location changes (both campaign and shipState)
    if (data.hex) {
      state.campaign.current_hex = data.hex;
      if (state.shipState) {
        state.shipState.systemHex = data.hex;
      }
    }
    // Update sector if provided
    if (data.sector) {
      state.campaign.current_sector = data.sector;
    }
    // Autorun 5: Update contacts if provided
    if (data.contacts) {
      state.contacts = data.contacts;
    }
    renderBridge();
    // AR-110: Refresh role panel (especially Astrogator which shows current system)
    renderRoleDetailPanel(state.selectedRole);
    // Refresh jump map for astrogator after location change
    if (state.selectedRole === 'astrogator') {
      initJumpMapIfNeeded();
    }
  });

  // Autorun 5: Handle contacts replaced on jump arrival
  state.socket.on('ops:contactsReplaced', (data) => {
    state.contacts = data.contacts || [];
    showNotification(`Sensor contacts updated: ${state.contacts.length} objects detected`, 'info');
    renderRoleDetailPanel(state.selectedRole);
    renderCombatContactsList(); // Autorun 14
  });

  // Autorun 5: Handle sensor scan results
  state.socket.on('ops:scanResult', (data) => {
    handleScanResult(data);
  });

  // Autorun 11: Handle targeted scan results (AR-70: Enhanced with skill rolls)
  state.socket.on('ops:scanContactResult', (data) => {
    if (data.success) {
      // Update contact in state
      const idx = state.contacts.findIndex(c => c.id === data.contactId);
      if (idx >= 0 && data.contact) {
        state.contacts[idx] = data.contact;
      }
      renderContacts();
      renderRoleDetailPanel(state.selectedRole);
      // AR-70: Show roll details if available
      const rollInfo = data.roll ? ` (${data.roll.join('+')}=${data.total})` : '';
      showNotification(data.message + rollInfo || 'Scan complete', 'success');
    } else {
      // AR-70: Failed scan shows roll details
      const rollInfo = data.roll ? ` (Roll: ${data.roll.join('+')}=${data.total})` : '';
      showNotification(data.message + rollInfo || 'Scan inconclusive', 'warning');
    }
  });

  // Autorun 12: Combat mode events
  state.socket.on('ops:combatStarted', (data) => {
    state.inCombat = true;
    state.combatState = data;
    showNotification('COMBAT STATIONS! Tactical mode engaged.', 'warning');
    showCombatScreen(data);
  });

  state.socket.on('ops:combatEnded', (data) => {
    state.inCombat = false;
    state.combatState = null;
    showNotification(`Combat ended: ${data.outcome}`, 'info');
    hideCombatScreen();
  });

  state.socket.on('ops:combatState', (data) => {
    state.inCombat = data.inCombat;
    state.combatState = data;
    if (data.inCombat) {
      showCombatScreen(data);
    }
  });

  // Autorun 5: Handle weapons authorization
  state.socket.on('ops:weaponsAuthorized', (data) => {
    handleWeaponsAuthorized(data);
  });

  // Autorun 5: Handle fire results
  state.socket.on('ops:fireResult', (data) => {
    handleFireResult(data.result || data);
  });

  // Autorun 14: Combat system handlers
  state.socket.on('ops:targetAcquired', (data) => {
    const contact = data.contact;
    state.lockedTarget = contact.id;
    showNotification(`Target locked: ${contact.name}`, 'success');
    renderRoleDetailPanel(state.selectedRole);
  });

  state.socket.on('ops:combatAction', (data) => {
    // Handle combat action broadcast (hit/miss/point defense)
    const { type, attacker, target, weapon, damage, message, targetDestroyed } = data;

    // Add to combat log in state
    if (!state.combatLog) state.combatLog = [];
    state.combatLog.unshift({
      timestamp: new Date().toISOString(),
      type,
      attacker,
      target,
      weapon,
      damage,
      message
    });

    // Keep only last 50 entries
    if (state.combatLog.length > 50) {
      state.combatLog = state.combatLog.slice(0, 50);
    }

    // Show notification for combat events
    if (type === 'hit') {
      showNotification(`${attacker} HIT ${target} for ${damage} damage!`, 'warning');
    } else if (type === 'miss') {
      showNotification(`${attacker} missed ${target}`, 'info');
    } else if (type === 'pointDefense') {
      showNotification(message, 'info');
    }

    // Refresh gunner panel to update combat log
    if (state.selectedRole === 'gunner') {
      renderRoleDetailPanel('gunner');
    }
  });

  state.socket.on('ops:targetDestroyed', (data) => {
    const { contactId, name, destroyedBy } = data;
    showNotification(`TARGET DESTROYED: ${name} by ${destroyedBy}!`, 'success');

    // Remove from contacts
    if (state.contacts) {
      state.contacts = state.contacts.filter(c => c.id !== contactId);
    }

    // Clear locked target if it was destroyed
    if (state.lockedTarget === contactId) {
      state.lockedTarget = null;
    }

    renderRoleDetailPanel(state.selectedRole);
  });

  state.socket.on('ops:shipWeapons', (data) => {
    state.shipWeapons = data.weapons || [];
    renderRoleDetailPanel(state.selectedRole);
  });

  // Ship Systems status response
  state.socket.on('ops:shipSystems', (data) => {
    updateShipSystemsDisplay(data.systems);
  });

  state.socket.on('ops:combatLog', (data) => {
    state.combatLog = data.log || [];
    renderRoleDetailPanel(state.selectedRole);
  });

  state.socket.on('ops:pointDefenseStatus', (data) => {
    state.pointDefenseEnabled = data.enabled;
    const btn = document.querySelector('.btn-point-defense');
    if (btn) {
      btn.classList.toggle('active', data.enabled);
      btn.textContent = data.enabled ? 'Point Defense ON' : 'Point Defense';
    }
  });

  // Autorun 5: Handle jump status update (for skip-to-exit feature)
  state.socket.on('ops:jumpStatusUpdated', (data) => {
    const { jumpStatus, message } = data;
    state.jumpStatus = jumpStatus;
    showNotification(message || 'Jump status updated', 'success');
    renderRoleDetailPanel(state.selectedRole);
  });

  // Stage 7: Handle time updates (from jumps or GM actions)
  state.socket.on('ops:timeUpdated', (data) => {
    if (data.currentDate && state.campaign) {
      state.campaign.current_date = data.currentDate;
      // Update date display
      setBridgeClockDate(data.currentDate);
      const gmDateEl = document.getElementById('campaign-date');
      if (gmDateEl) gmDateEl.value = data.currentDate;
    }
    if (data.reason) {
      showNotification(`Time advanced: ${data.reason}`, 'info');
    }
  });

  // Autorun 6: Mail system handlers
  state.socket.on('ops:mailList', (data) => {
    state.unreadMailCount = data.unreadCount || 0;
    updateMailBadge();
    openEmailApp(data.mail, data.unreadCount);
  });

  state.socket.on('ops:newMail', (data) => {
    if (data.recipientId === state.accountId || data.recipientId === 'all') {
      showNotification(`New mail from ${data.senderName}: ${data.subject}`, 'info');
      // Increment unread count and update badge
      state.unreadMailCount = (state.unreadMailCount || 0) + 1;
      updateMailBadge();
    }
  });

  // Stage 9.3: Handout viewer
  state.socket.on('ops:showHandout', (data) => {
    showHandoutModal(data.handout);
    showNotification(`${data.handout.sharedBy} shared a handout with you`, 'info');
  });

  // Autorun 6: NPC contacts handlers
  state.socket.on('ops:npcContactsList', (data) => {
    // If compose modal is waiting for contacts, populate it
    if (state.pendingComposeContacts) {
      populateComposeContacts(data.contacts);
    } else {
      showNPCContactsModal(data.contacts, data.isGM);
    }
  });

  state.socket.on('ops:npcContactsRefresh', () => {
    // Refresh NPC contacts if modal is open
    if (document.querySelector('.npc-contacts-modal')) {
      state.socket.emit('ops:getNPCContacts');
    }
  });

  // Autorun 6: Feedback handlers
  state.socket.on('ops:feedbackSubmitted', (data) => {
    showNotification('Feedback submitted successfully!', 'success');
    closeModal();
  });

  state.socket.on('ops:feedbackList', (data) => {
    renderFeedbackReview(data.feedback, data.stats);
  });

  state.socket.on('ops:feedbackStatusUpdated', (data) => {
    showNotification(`Feedback marked as ${data.status}`, 'success');
  });

  // Hail response handler
  state.socket.on('ops:hailResult', (data) => {
    if (data.success) {
      showNotification(data.message, 'success');
      // Refresh NPC contacts if a new contact was created
      if (data.newContact) {
        state.socket.emit('ops:getNPCContacts');
      }
    } else {
      showNotification(data.message || 'Hail failed', 'error');
    }
  });

  // AUTORUN-8: Prep Panel events
  state.socket.on('ops:prepData', (data) => {
    state.prepReveals = data.reveals || [];
    state.prepNpcs = data.npcs || [];
    state.prepLocations = data.locations || [];
    state.prepEvents = data.events || [];
    state.prepEmails = data.emails || [];
    state.prepHandouts = data.handouts || [];
    renderPrepReveals();
  });

  state.socket.on('ops:revealAdded', (data) => {
    state.prepReveals = state.prepReveals || [];
    state.prepReveals.push(data.reveal);
    renderPrepReveals();
  });

  state.socket.on('ops:revealUpdated', (data) => {
    const idx = (state.prepReveals || []).findIndex(r => r.id === data.reveal.id);
    if (idx >= 0) {
      state.prepReveals[idx] = data.reveal;
      renderPrepReveals();
    }
  });

  state.socket.on('ops:revealDeleted', (data) => {
    state.prepReveals = (state.prepReveals || []).filter(r => r.id !== data.revealId);
    renderPrepReveals();
  });

  state.socket.on('ops:revealExecuted', (data) => {
    // Update reveal status
    const reveal = (state.prepReveals || []).find(r => r.id === data.revealId);
    if (reveal) {
      reveal.status = 'revealed';
      renderPrepReveals();
    }
    // Show notification to GM
    if (state.isGM) {
      showNotification(`Revealed: ${data.title}`, 'success');
    }
  });

  state.socket.on('ops:playerReveal', (data) => {
    // Player received a reveal - show it to them
    showPlayerRevealModal(data);
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

  // ==================== AR-40: Library Computer Events ====================
  state.socket.on('ops:libraryResults', handleLibraryResults);
  state.socket.on('ops:uwpDecoded', handleUWPDecoded);
  state.socket.on('ops:tradeCodes', handleTradeCodes);
  state.socket.on('ops:starports', handleStarports);

  // ==================== AR-48: Medical Records Events ====================
  state.socket.on('ops:medicalRecords', handleMedicalRecords);

  // ==================== AR-49: Environmental Monitoring Events ====================
  state.socket.on('ops:environmentalData', (data) => {
    state.environmentalData = data;
    // Refresh sensors panel if active
    if (state.selectedRole === 'sensor_operator') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  // AR-49: Repair Queue Events
  state.socket.on('ops:repairQueue', (data) => {
    state.repairQueue = data.repairs || [];
    // Refresh engineer panel if active
    if (state.selectedRole === 'engineer') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  // AR-49: Rescue Targets Events (Captain triage)
  state.socket.on('ops:rescueTargets', (data) => {
    state.rescueTargets = data.targets || [];
    if (state.selectedRole === 'captain') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  // AR-49: Flight Conditions Events (Pilot)
  state.socket.on('ops:flightConditions', (data) => {
    state.flightConditions = data;
    if (state.selectedRole === 'pilot') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  // AR-49: Medical Conditions Events (Medic)
  state.socket.on('ops:medicalConditions', (data) => {
    state.medicalConditions = data;
    if (state.selectedRole === 'medic') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  // AR-49: Target Conditions Events (Gunner)
  state.socket.on('ops:targetConditions', (data) => {
    state.targetConditions = data;
    if (state.selectedRole === 'gunner') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  // AR-49: Boarding Conditions Events (Marines)
  state.socket.on('ops:boardingConditions', (data) => {
    state.boardingConditions = data;
    if (state.selectedRole === 'marines') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  // ==================== AR-27: Shared Map Events ====================

  // GM shared the map - auto-switch all players
  state.socket.on('ops:mapShared', (data) => {
    state.sharedMapActive = true;
    state.sharedMapView = data;
    updateSharedMapBadge(true);
    mapDebugMessage(`Map shared by ${data.sharedBy || 'GM'}`, 'info');

    // Auto-switch for PLAYERS only - GM already has map open
    if (data.autoSwitch && !state.isGM) {
      showSharedMap();
      updateSharedMapFrame(data);
      showNotification('GM is sharing the map', 'info');
    }

    // GM just needs button state updated
    updateSharedMapButtons();
  });

  // GM stopped sharing
  state.socket.on('ops:mapUnshared', () => {
    state.sharedMapActive = false;
    state.sharedMapView = null;
    updateSharedMapBadge(false);
    updateSharedMapButtons();
    mapDebugMessage('Map sharing stopped', 'info');
    if (!state.isGM) {
      showNotification('Map sharing ended', 'info');
      closeSharedMap();
    }
  });

  // GM updated the view (pan/zoom)
  state.socket.on('ops:mapViewUpdated', (data) => {
    state.sharedMapView = data;
    mapDebugMessage(`View updated: ${data.sector || 'unknown'}`, 'info');
    if (!state.isGM) {
      updateSharedMapFrame(data);
    }
  });

  // Reconnect: get current map state
  state.socket.on('ops:mapState', (data) => {
    state.sharedMapActive = data.shared;
    state.sharedMapView = data.shared ? data : null;
    updateSharedMapBadge(data.shared);
    if (data.shared) {
      mapDebugMessage('Reconnected to shared map', 'info');
    }
  });

  // ==================== AR-29.5: Star System Map Events ====================

  // GM shared a star system - players receive it
  state.socket.on('ops:starSystemShared', (data) => {
    console.log('[StarSystem] Received shared system:', data.sector, data.hex);
    showNotification(`Star system shared: ${data.system?.name || data.hex}`, 'info');

    // Auto-open the system map for players with the shared data
    if (!state.isGM) {
      showSystemMap(data.system?.name || 'Shared System');
      // Wait for canvas to initialize, then load the system
      setTimeout(() => {
        if (typeof loadSystemMap === 'function') {
          loadSystemMap(data.system, data.sector, data.hex);
        }
      }, 100);
    }
  });

  // Server sends star system data (from database or generated)
  state.socket.on('ops:starSystemData', (data) => {
    console.log('[StarSystem] Received system data:', data.sector, data.hex);
    if (typeof loadSystemMap === 'function') {
      loadSystemMap(data.system, data.sector, data.hex);
    }
  });

  // Star system saved confirmation
  state.socket.on('ops:starSystemSaved', (data) => {
    console.log('[StarSystem] System saved:', data.sector, data.hex);
    showNotification('Star system saved', 'success');
  });

  // ==================== Puppetry Debug System ====================
  // Quick-and-dirty eval-based puppetry for debugging
  // Server can send commands to manipulate DOM, click buttons, etc.
  // SECURITY: Only enabled on localhost (dev/test environments) - uses global DEBUG

  state.socket.on('puppetry:eval', (data) => {
    if (!DEBUG) {
      debugWarn('[PUPPETRY] eval disabled in production');
      return;
    }
    const { code, requestId } = data;
    console.log('[PUPPETRY] Executing:', code);
    try {
      // eslint-disable-next-line no-eval
      const result = eval(code);
      const response = { requestId, success: true, result: String(result) };
      state.socket.emit('puppetry:result', response);
      console.log('[PUPPETRY] Result:', result);
    } catch (error) {
      const response = { requestId, success: false, error: error.message };
      state.socket.emit('puppetry:result', response);
      console.error('[PUPPETRY] Error:', error);
    }
  });

  // Named action registry for puppetry (safer alternative to eval)
  state.socket.on('puppetry:action', (data) => {
    const { action, params, requestId } = data;
    console.log('[PUPPETRY] Action:', action, params);
    try {
      let result;
      switch (action) {
        case 'click':
          document.querySelector(params.selector).click();
          result = 'clicked';
          break;
        case 'type':
          const input = document.querySelector(params.selector);
          input.value = params.text;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          result = 'typed';
          break;
        case 'select':
          const select = document.querySelector(params.selector);
          select.value = params.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          result = 'selected';
          break;
        case 'getText':
          result = document.querySelector(params.selector)?.textContent || null;
          break;
        case 'getState':
          result = JSON.stringify(state);
          break;
        case 'screenshot':
          result = document.body.innerHTML.substring(0, 5000);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      state.socket.emit('puppetry:result', { requestId, success: true, result });
    } catch (error) {
      state.socket.emit('puppetry:result', { requestId, success: false, error: error.message });
    }
  });

  // AR-130: AI NPC Pending Response Events
  state.socket.on('ai:pendingResponse', (data) => {
    if (!state.isGM) return;
    state.aiPendingResponses.push(data);
    updateAIQueueBadge();
    showNotification(`AI response pending from ${data.npcName}`, 'info');
  });
}

// AR-151-2a: AI NPC Queue moved to modules/ai-npc-queue.js

// ==================== Screen Management ====================
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`${screenId}-screen`).classList.add('active');
  state.currentScreen = screenId;

  // Update role class when showing bridge
  if (screenId === 'bridge') {
    updateRoleClass();
  }
}

// ==================== Combat Screen (Autorun 12) ====================

function showCombatScreen(combatState) {
  // Switch to combat screen
  showScreen('combat');

  // Populate combat screen with combatants
  const combatMain = document.getElementById('combat-main');
  if (!combatMain) return;

  const combatants = combatState.combatants || [];

  combatMain.innerHTML = `
    <div class="combat-indicator">
      <span class="combat-status-icon">⚔️</span>
      <span class="combat-status-text">TACTICAL COMBAT MODE</span>
    </div>
    <div class="combat-combatants">
      <h3>Engaged Contacts (${combatants.length})</h3>
      <div class="combatant-list">
        ${combatants.map(c => `
          <div class="combatant-item">
            <span class="combatant-name">${c.name || '???'}</span>
            <span class="combatant-type">${c.type || 'Unknown'}</span>
            <span class="combatant-range">${c.range_band || '---'}</span>
            ${c.tonnage ? `<span class="combatant-tonnage">${c.tonnage} dT</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    <div class="combat-placeholder">
      <p>Full tactical combat system integration in progress...</p>
      <p><em>This screen will link to the existing space combat VTT</em></p>
    </div>
    ${state.isGM ? `
      <div class="combat-gm-controls">
        <button class="btn btn-danger" onclick="document.getElementById('btn-exit-combat').click()">End Combat</button>
      </div>
    ` : ''}
  `;
}

function hideCombatScreen() {
  // Return to bridge screen
  showScreen('bridge');
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

  // AR-21: Import campaign from JSON
  document.getElementById('btn-import-campaign').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });

  document.getElementById('import-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const campaignData = JSON.parse(event.target.result);
        const gmName = prompt('Enter GM name for imported campaign:', 'GM');
        if (gmName) {
          state.socket.emit('ops:importCampaign', { campaignData, gmName });
        }
      } catch (err) {
        showNotification('Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset for re-import
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

  // AR-58: ENTER hotkey for campaign code input
  document.getElementById('campaign-code')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      document.getElementById('btn-join-campaign').click();
    }
  });

  // Guest login flow (Stage 13.5 - completed)
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
      <div class="campaign-info">
        <div class="campaign-name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>
        <div class="campaign-meta">${escapeHtml(c.gm_name)} · ${c.current_system}</div>
      </div>
      <div class="campaign-actions">
        <button class="btn btn-small btn-primary btn-select" title="Select campaign">Select</button>
        <button class="btn btn-small btn-icon btn-rename" title="Rename campaign">✏</button>
        <button class="btn btn-small btn-icon btn-duplicate" title="Duplicate campaign">⧉</button>
        <button class="btn btn-small btn-icon btn-export" title="Export campaign">📥</button>
        <button class="btn btn-small btn-icon btn-delete" title="Delete campaign">🗑</button>
      </div>
    </div>
  `).join('');

  // Select campaign
  container.querySelectorAll('.btn-select').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const campaignId = btn.closest('.campaign-item').dataset.campaignId;
      state.socket.emit('ops:selectCampaign', { campaignId });
    });
  });

  // Duplicate campaign
  container.querySelectorAll('.btn-duplicate').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const campaignId = btn.closest('.campaign-item').dataset.campaignId;
      state.socket.emit('ops:duplicateCampaign', { campaignId });
    });
  });

  // AR-21: Rename campaign (inline edit)
  container.querySelectorAll('.btn-rename').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.campaign-item');
      const campaignId = item.dataset.campaignId;
      const nameEl = item.querySelector('.campaign-name');
      const currentName = nameEl.textContent;

      // Create inline input
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'campaign-name-input';
      input.value = currentName;
      input.style.cssText = 'width: 100%; padding: 2px 4px; font-size: inherit;';

      nameEl.replaceWith(input);
      input.focus();
      input.select();

      const save = () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
          state.socket.emit('ops:renameCampaign', { campaignId, newName });
        }
        // Restore display (will be re-rendered on success)
        const newEl = document.createElement('div');
        newEl.className = 'campaign-name';
        newEl.textContent = newName || currentName;
        input.replaceWith(newEl);
      };

      input.addEventListener('blur', save);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') {
          const newEl = document.createElement('div');
          newEl.className = 'campaign-name';
          newEl.textContent = currentName;
          input.replaceWith(newEl);
        }
      });
    });
  });

  // AR-21: Export campaign
  container.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const campaignId = btn.closest('.campaign-item').dataset.campaignId;
      state.socket.emit('ops:exportCampaign', { campaignId });
    });
  });

  // Delete campaign
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.campaign-item');
      const campaignId = item.dataset.campaignId;
      const campaignName = item.querySelector('.campaign-name').textContent;
      showDeleteCampaignModal(campaignId, campaignName);
    });
  });
}

// AR-21: Delete campaign confirmation modal
function showDeleteCampaignModal(campaignId, campaignName) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content delete-modal">
      <div class="modal-header">
        <h2>Delete Campaign</h2>
        <button class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to delete "<strong>${escapeHtml(campaignName)}</strong>"?</p>
        <p class="text-warning">This will permanently delete all players, ships, and logs.</p>
        <div class="form-group">
          <label>Type DELETE to confirm:</label>
          <input type="text" id="delete-confirm-input" placeholder="Type DELETE" autocomplete="off">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-cancel">Cancel</button>
        <button class="btn btn-danger btn-confirm-delete" disabled>Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = modal.querySelector('#delete-confirm-input');
  const confirmBtn = modal.querySelector('.btn-confirm-delete');
  const cancelBtn = modal.querySelector('.btn-cancel');
  const closeBtn = modal.querySelector('.btn-close');

  input.addEventListener('input', () => {
    confirmBtn.disabled = input.value !== 'DELETE';
  });

  confirmBtn.addEventListener('click', () => {
    state.socket.emit('ops:deleteCampaign', { campaignId });
    modal.remove();
  });

  cancelBtn.addEventListener('click', () => modal.remove());
  closeBtn.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  input.focus();
}

function renderPlayerSlots() {
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

// ==================== GM Setup Screen ====================
function initGMSetupScreen() {
  // Copy campaign code button
  document.getElementById('btn-copy-code').addEventListener('click', () => {
    const codeEl = document.getElementById('campaign-code-value');
    const code = codeEl.textContent;
    if (code && code !== '--------') {
      copyWithFeedback(code, 'btn-copy-code');
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

  // Custom ship (AR-17)
  document.getElementById('btn-custom-ship').addEventListener('click', () => {
    openShipEditor(null); // null = new ship
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

  // AR-124: Position verification toggle
  document.getElementById('position-verify-toggle').addEventListener('change', (e) => {
    state.socket.emit('ops:setRequirePositionVerification', { enabled: e.target.checked });
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

// AR-23.7: Render quick location buttons (recent, favorites, home)
function renderQuickLocations() {
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
    // AR-132: Release slot reservation on server before clearing local state
    state.socket.emit('ops:releaseSlot');
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

// ==================== Bridge Screen ====================
function initBridgeScreen() {
  // AR-25: Contact sort/filter controls
  document.getElementById('contact-sort')?.addEventListener('change', (e) => {
    state.contactSort = e.target.value;
    localStorage.setItem('ops_contact_sort', state.contactSort);
    renderContacts();
  });

  document.getElementById('contact-filter')?.addEventListener('change', (e) => {
    state.contactFilter = e.target.value;
    localStorage.setItem('ops_contact_filter', state.contactFilter);
    renderContacts();
  });

  // Restore saved sort/filter preferences
  const savedSort = localStorage.getItem('ops_contact_sort');
  const savedFilter = localStorage.getItem('ops_contact_filter');
  if (savedSort) {
    state.contactSort = savedSort;
    const sortEl = document.getElementById('contact-sort');
    if (sortEl) sortEl.value = savedSort;
  }
  if (savedFilter) {
    state.contactFilter = savedFilter;
    const filterEl = document.getElementById('contact-filter');
    if (filterEl) filterEl.value = savedFilter;
  }

  // Toggle detail view
  document.getElementById('btn-toggle-detail').addEventListener('click', () => {
    const detail = document.getElementById('role-detail-view');
    const btn = document.getElementById('btn-toggle-detail');
    detail.classList.toggle('hidden');
    btn.textContent = detail.classList.contains('hidden') ? 'Show Details ▼' : 'Hide Details ▲';
  });

  // Expandable Role Panel Controls (Stage 13.3)
  document.getElementById('btn-expand-half')?.addEventListener('click', () => {
    expandRolePanel('half');
  });

  document.getElementById('btn-expand-full')?.addEventListener('click', () => {
    expandRolePanel('full');
  });

  document.getElementById('btn-collapse-panel')?.addEventListener('click', () => {
    collapseRolePanel();
  });

  // AR-15.9: Browser fullscreen toggle
  document.getElementById('btn-fullscreen')?.addEventListener('click', toggleBrowserFullscreen);

  // Ship Systems panel toggle
  document.getElementById('btn-ship-systems')?.addEventListener('click', toggleShipSystemsPanel);
  document.getElementById('btn-close-ship-systems')?.addEventListener('click', hideShipSystemsPanel);

  // Keyboard shortcuts for panel expansion
  document.addEventListener('keydown', (e) => {
    if (state.currentScreen !== 'bridge') return;
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    // Escape collapses any expanded panel
    if (e.key === 'Escape') {
      collapseRolePanel();
      collapseExpandedPanel();
    }

    // F key for fullscreen toggle
    if (e.key === 'f' || e.key === 'F') {
      const rolePanel = document.getElementById('role-panel');
      if (rolePanel.classList.contains('expanded-full')) {
        collapseRolePanel();
      } else {
        expandRolePanel('full');
      }
    }

    // Number keys 1-4 toggle panel expansion
    const panelKeys = { '1': 'sensor-display', '2': 'role-panel', '3': 'crew-panel', '4': 'log-panel' };
    if (panelKeys[e.key]) {
      togglePanelExpand(panelKeys[e.key]);
    }

    // AR-150: 'u' key toggles UI status indicators (dev mode only)
    if ((e.key === 'u' || e.key === 'U') && DEBUG) {
      const isVisible = document.body.classList.toggle('show-ui-status');
      showNotification(`UI Status Indicators: ${isVisible ? 'ON' : 'OFF'}`, 'info');
      if (isVisible) applyStatusIndicators();
    }
  });

  // Panel expand button click handlers
  document.querySelectorAll('.btn-panel-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const panelId = btn.dataset.panel;
      togglePanelExpand(panelId);
    });
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

  // Menu button - show hamburger menu (Autorun 6)
  document.getElementById('btn-bridge-menu').addEventListener('click', () => {
    openHamburgerMenu();
  });

  // Close hamburger menu
  document.getElementById('btn-close-menu')?.addEventListener('click', closeHamburgerMenu);
  document.getElementById('hamburger-menu-overlay')?.addEventListener('click', closeHamburgerMenu);

  // Hamburger menu item clicks
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const feature = item.dataset.feature;
      handleMenuFeature(feature);
    });
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
    // AR-132: Release slot reservation on server before clearing local state
    state.socket.emit('ops:releaseSlot');
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

  // AUTORUN-8: GM Prep Panel
  initPrepPanel();
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

  // Current location within system (e.g., "Flammarion Highport")
  const locationEl = document.getElementById('bridge-location');
  if (locationEl) {
    // Use ship's locationName, fall back to system name
    const locationName = state.shipState?.locationName || state.ship?.current_state?.locationName;
    locationEl.textContent = locationName || state.campaign?.current_system || 'Unknown';
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

  // Render ship log
  renderShipLog();

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

function renderShipStatus() {
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

// Relieve crew member from duty (Captain, Medic, or GM)
function relieveCrewMember(accountId, name, role) {
  const roleName = formatRoleName(role);
  if (!confirm(`Relieve ${name} from duty as ${roleName}?`)) {
    return;
  }
  state.socket.emit('ops:relieveCrewMember', { accountId });
}

// GM assigns role to crew member
function gmAssignRole(accountId, name) {
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

function renderContacts() {
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
    const gmControls = state.isGM ? `
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

// ==================== Power Management (AR-31) ====================

/**
 * Set power allocation to a preset
 * @param {string} preset - combat, silent, jump, or standard
 */
function setPowerPreset(preset) {
  if (!state.socket || !state.shipId) {
    showNotification('Not connected to ship', 'error');
    return;
  }
  state.socket.emit('ops:setPowerPreset', { preset });
}

/**
 * Update power levels from sliders
 */
function updatePower() {
  if (!state.socket || !state.shipId) return;

  const sliders = document.querySelectorAll('.power-slider');
  const power = {};
  sliders.forEach(slider => {
    power[slider.dataset.system] = parseInt(slider.value, 10);
  });

  state.socket.emit('ops:setPower', power);
}

/**
 * Request current power status
 */
function requestPowerStatus() {
  if (state.socket && state.shipId) {
    state.socket.emit('ops:getPowerStatus');
  }
}

// ==================== Pilot Controls (AR-30) ====================

// Track evasive state locally for UI updates
let pilotEvasiveState = false;

function toggleEvasive() {
  if (!state.socket || !state.campaignId) {
    showNotification('Not connected to campaign', 'error');
    return;
  }

  const newState = !pilotEvasiveState;
  state.socket.emit('ops:setEvasive', { enabled: newState });
}

function changeRange(action) {
  if (!state.socket || !state.campaignId) {
    showNotification('Not connected to campaign', 'error');
    return;
  }

  const contactId = document.getElementById('range-contact-select')?.value;
  if (!contactId) {
    showNotification('No contact selected', 'error');
    return;
  }

  state.socket.emit('ops:setRange', { contactId, action });
}

// AR-64: Store pending travel data for TRAVEL button
let pendingTravelData = null;

function setCourse(destination, eta, travelData = null) {
  if (!state.socket || !state.campaign?.id) {
    showNotification('Not connected to campaign', 'error');
    return;
  }

  // Store travel data for TRAVEL button
  pendingTravelData = travelData;

  state.socket.emit('ops:setCourse', {
    destination,
    eta,
    travelTime: travelData?.travelHours || null
  });

  // Re-render pilot panel to show TRAVEL button
  if (state.role === 'pilot') {
    renderRoleDetailPanel('pilot');
  }
}

function clearCourse() {
  if (!state.socket || !state.campaign?.id) return;
  pendingTravelData = null;
  state.socket.emit('ops:clearCourse');
}

/**
 * AR-64: Execute travel to the set destination
 * Advances time and moves ship to destination location
 */
function travel() {
  if (!state.socket || !state.campaign?.id) {
    showNotification('Not connected to campaign', 'error');
    return;
  }

  if (!pendingTravelData?.locationId) {
    showNotification('No destination set - select a destination from the system map', 'warning');
    return;
  }

  // Confirm travel
  const hours = pendingTravelData.travelHours || 4;
  const confirmMsg = `Travel to destination? (${hours}h transit)`;

  if (!confirm(confirmMsg)) return;

  state.socket.emit('ops:travel', {
    destinationId: pendingTravelData.locationId
  });

  // Clear pending travel after sending
  pendingTravelData = null;
}

/**
 * Undock from station
 */
function undock() {
  if (!state.socket || !state.campaignId) {
    showNotification('Not connected to campaign', 'error');
    return;
  }

  if (!confirm('Release docking clamps and undock?')) return;

  state.socket.emit('ops:undock');
}

/**
 * Get current pending travel data (for UI)
 */
function getPendingTravel() {
  return pendingTravelData;
}

// ==================== AR-57: Transit Calculator (Brachistochrone) ====================
// Educational physics: t = 2 * sqrt(d / a)
// User learned Newtonian physics from Traveller at age ~12

// AR-103 Phase 6: calculateBrachistochrone, formatTransitTime, formatDistance moved to modules/helpers.js

/**
 * Update transit calculator display
 */
function updateTransitCalculator() {
  const distanceInput = document.getElementById('transit-distance');
  const accelSelect = document.getElementById('transit-accel');
  const timeDisplay = document.getElementById('transit-time');
  const turnoverDisplay = document.getElementById('transit-turnover');
  const velocityDisplay = document.getElementById('transit-velocity');

  if (!distanceInput || !accelSelect) return;

  const distance = parseFloat(distanceInput.value) || 100000;
  const accel = parseFloat(accelSelect.value) || 2;

  const result = calculateBrachistochrone(distance, accel);

  if (timeDisplay) timeDisplay.textContent = result.timeFormatted;
  if (turnoverDisplay) turnoverDisplay.textContent = formatDistance(result.turnoverKm);
  if (velocityDisplay) {
    const velocity = result.maxVelocityKmh;
    if (velocity > 1000000) {
      velocityDisplay.textContent = `${(velocity / 1000000).toFixed(1)} Mkm/h`;
    } else if (velocity > 1000) {
      velocityDisplay.textContent = `${(velocity / 1000).toFixed(1)}k km/h`;
    } else {
      velocityDisplay.textContent = `${velocity.toFixed(0)} km/h`;
    }
  }
}

/**
 * Show physics explanation modal
 */
function showPhysicsExplanation() {
  const html = `
    <div class="modal-header">
      <h2>Physics: Brachistochrone</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body">
      <div class="physics-explanation">
        <h3>Brachistochrone Transit</h3>
        <p><strong>"Brachistochrone"</strong> = Greek for "shortest time"</p>

        <h4>How it works:</h4>
        <ol>
          <li>Accelerate at constant thrust toward destination</li>
          <li>At midpoint (<strong>turnover</strong>), flip ship 180°</li>
          <li>Decelerate at same thrust to arrive stopped</li>
        </ol>

        <h4>The Formula:</h4>
        <div class="formula-box">
          <code>t = 2 × √(d ÷ a)</code>
        </div>
        <p>Where: <em>t</em> = time, <em>d</em> = distance, <em>a</em> = acceleration</p>

        <h4>Key Insights:</h4>
        <ul>
          <li>Double the distance → only 1.41× longer (√2)</li>
          <li>Double the thrust → only 0.71× time (1/√2)</li>
          <li>Max velocity at turnover: <code>v = √(a × d)</code></li>
        </ul>

        <h4>Example:</h4>
        <p>100,000 km at 2G = ~1h 46m transit</p>
        <p>At turnover: 50,000 km out, velocity ~1,400 km/s</p>
      </div>
    </div>
  `;

  showModalContent(html);
}

/**
 * Initialize transit calculator event listeners
 */
function setupTransitCalculator() {
  // Update on input change
  document.addEventListener('input', (e) => {
    if (e.target.id === 'transit-distance' || e.target.id === 'transit-accel') {
      updateTransitCalculator();
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'transit-accel') {
      updateTransitCalculator();
    }
  });

  // Physics explanation click
  document.addEventListener('click', (e) => {
    if (e.target.closest('.formula-help') || e.target.closest('.physics-badge')) {
      showPhysicsExplanation();
    }
  });

  // Initial calculation
  setTimeout(updateTransitCalculator, 100);
}

// ==================== AR-51: Gunner Weapons Reference ====================

/**
 * Show weapons reference modal with stats and tactical tips
 */
function showWeaponsReference() {
  const content = `
    <div class="weapons-reference-content">
      <section class="ref-section">
        <h4>TURRET WEAPONS</h4>
        <table class="ref-table">
          <tr><th>Weapon</th><th>Damage</th><th>Range</th><th>Power</th><th>Best For</th></tr>
          <tr><td>Pulse Laser</td><td>2D</td><td>Short</td><td>1</td><td>Called shots, point defense</td></tr>
          <tr><td>Beam Laser</td><td>1D</td><td>Medium</td><td>1</td><td>General combat</td></tr>
          <tr><td>Sandcaster</td><td>-1D*</td><td>Short</td><td>0</td><td>Missile defense</td></tr>
          <tr><td>Missile Rack</td><td>4D</td><td>Special</td><td>0</td><td>Long range alpha</td></tr>
        </table>
        <small>*Sandcaster reduces incoming damage</small>
      </section>

      <section class="ref-section">
        <h4>BARBETTE WEAPONS</h4>
        <table class="ref-table">
          <tr><th>Weapon</th><th>Damage</th><th>Range</th><th>Power</th><th>Best For</th></tr>
          <tr><td>Ion</td><td>Special</td><td>Medium</td><td>10</td><td>Disable for boarding</td></tr>
          <tr><td>Particle</td><td>6D+rad</td><td>V.Long</td><td>15</td><td>Kill shots</td></tr>
          <tr><td>Plasma</td><td>5D</td><td>Short</td><td>10</td><td>Close combat</td></tr>
        </table>
      </section>

      <section class="ref-section">
        <h4>POINT DEFENSE</h4>
        <ul class="ref-list">
          <li><strong>Sandcasters:</strong> -1D to all incoming damage</li>
          <li><strong>Active PD:</strong> Roll to destroy missiles (needs Fire Control)</li>
          <li><strong>Evade:</strong> Pilot maneuver, -DM to enemy attacks</li>
        </ul>
      </section>

      <section class="ref-section">
        <h4>TACTICAL TIPS</h4>
        <ul class="ref-list">
          <li><strong>Opening:</strong> Let fighters engage with missiles at range</li>
          <li><strong>Disable:</strong> Ion barbette for system hits before boarding</li>
          <li><strong>Defense:</strong> Keep one turret on sand duty</li>
          <li><strong>Called Shots:</strong> Use pulse lasers for precision</li>
        </ul>
      </section>

      <section class="ref-section">
        <h4>TARGET PRIORITY</h4>
        <ol class="ref-list">
          <li>Incoming missiles (point defense)</li>
          <li>Enemy weapons (disable threat)</li>
          <li>Engines (prevent escape)</li>
          <li>Bridge (force surrender)</li>
        </ol>
      </section>
    </div>
  `;

  showModal('Weapons Reference', content);
}

/**
 * Show range chart modal with DM modifiers
 */
function showRangeChart() {
  const content = `
    <div class="range-chart-content">
      <section class="ref-section">
        <h4>RANGE BANDS & DM</h4>
        <table class="ref-table">
          <tr><th>Range Band</th><th>Distance</th><th>Attack DM</th></tr>
          <tr><td>Adjacent</td><td>&lt; 1km</td><td class="dm-positive">+1</td></tr>
          <tr><td>Close</td><td>1-10km</td><td>+0</td></tr>
          <tr><td>Short</td><td>10-1,250km</td><td>+0</td></tr>
          <tr><td>Medium</td><td>1,250-10,000km</td><td class="dm-negative">-1</td></tr>
          <tr><td>Long</td><td>10,000-25,000km</td><td class="dm-negative">-2</td></tr>
          <tr><td>Very Long</td><td>25,000-50,000km</td><td class="dm-negative">-4</td></tr>
          <tr><td>Distant</td><td>&gt; 50,000km</td><td class="dm-negative">-6</td></tr>
        </table>
      </section>

      <section class="ref-section">
        <h4>ATTACK FORMULA</h4>
        <div class="formula-box">
          <strong>2D6 + Gunnery + Range DM >= 8 to hit</strong>
        </div>
        <p>Critical hit on Effect 6+ (roll - target number)</p>
      </section>

      <section class="ref-section">
        <h4>WEAPON RANGES</h4>
        <table class="ref-table">
          <tr><th>Weapon Type</th><th>Optimal Range</th></tr>
          <tr><td>Pulse Laser</td><td>Short (no penalty)</td></tr>
          <tr><td>Beam Laser</td><td>Medium (no penalty)</td></tr>
          <tr><td>Particle</td><td>Very Long (no penalty)</td></tr>
          <tr><td>Missiles</td><td>Any (guided)</td></tr>
        </table>
      </section>
    </div>
  `;

  showModal('Range Chart', content);
}

// Listen for pilot events
function setupPilotListeners() {
  if (!state.socket) return;

  state.socket.on('ops:evasiveChanged', (data) => {
    pilotEvasiveState = data.enabled;
    const btn = document.getElementById('evasive-toggle');
    if (btn) {
      btn.className = `btn btn-small ${data.enabled ? 'btn-active' : ''}`;
      btn.textContent = data.enabled ? '⚡ Evasive ON' : 'Evasive';
    }
    showNotification(data.enabled ? 'Evasive maneuvers engaged' : 'Evasive maneuvers ended', 'info');
  });

  state.socket.on('ops:rangeChanged', (data) => {
    showNotification(`Range to ${data.contactId}: ${data.previousRange} → ${data.newRange}`, 'info');
    // Refresh panel to show updated range
    if (typeof refreshCrewPanel === 'function') {
      refreshCrewPanel();
    }
  });

  state.socket.on('ops:courseChanged', (data) => {
    showNotification(`Course set for ${data.destination}`, 'info');
  });

  state.socket.on('ops:courseCleared', () => {
    showNotification('Course cleared', 'info');
  });

  // AR-64: Travel complete - ship arrived at destination
  state.socket.on('ops:travelComplete', (data) => {
    // Update ship state with new location
    if (state.shipState) {
      state.shipState.systemHex = data.systemHex;
      state.shipState.locationId = data.locationId;
      state.shipState.locationName = data.locationName;
    }

    // Update campaign date
    if (state.campaign && data.newDate) {
      state.campaign.current_date = data.newDate;
      setBridgeClockDate(data.newDate);
    }

    // Clear pending travel
    pendingTravelData = null;

    // Update system map location display
    const mapLocationEl = document.getElementById('system-map-location');
    if (mapLocationEl) mapLocationEl.textContent = data.locationName;

    // Update bridge header location display
    const bridgeLocationEl = document.getElementById('bridge-location');
    if (bridgeLocationEl) bridgeLocationEl.textContent = data.locationName;

    // Show notification
    showNotification(`Arrived at ${data.locationName} (${data.travelHours}h transit)`, 'success');

    // Animate camera to new location with max zoom (if enabled in settings)
    const animateCamera = localStorage.getItem('ops-setting-animate-camera') !== 'false';
    if (animateCamera && typeof window.animateCameraToLocation === 'function' && data.locationId) {
      window.animateCameraToLocation(data.locationId, { duration: 400, maxZoom: true });
    }

    // Re-render pilot panel to remove TRAVEL button
    if (state.role === 'pilot') {
      renderRoleDetailPanel('pilot');
    }
  });

  // Undock from station - ship location changed
  state.socket.on('ops:undocked', (data) => {
    // Update ship state with new location
    if (state.shipState) {
      state.shipState.locationId = data.locationId;
      state.shipState.locationName = data.toLocation;
      state.shipState.systemHex = data.systemHex;  // AR-124: Include system hex
    }
    // AR-124: Also sync to ship.current_state for consistency
    if (state.ship?.current_state) {
      state.ship.current_state.locationId = data.locationId;
      state.ship.current_state.locationName = data.toLocation;
      state.ship.current_state.systemHex = data.systemHex;
    }

    // Update bridge header location display
    const bridgeLocationEl = document.getElementById('bridge-location');
    if (bridgeLocationEl) bridgeLocationEl.textContent = data.toLocation;

    // AR-124: Update system-map-location display
    const mapLocationEl = document.getElementById('system-map-location');
    if (mapLocationEl) mapLocationEl.textContent = data.toLocation;

    // AR-124: Animate camera to new location
    if (typeof animateCameraToLocation === 'function') {
      animateCameraToLocation(data.locationId);
    }

    // Show notification
    showNotification(`Undocked from ${data.fromLocation}`, 'success');

    // Re-render pilot panel to update location and hide UNDOCK button
    if (state.role === 'pilot') {
      renderRoleDetailPanel('pilot');
    }
  });

  // CLEAN-2: ops:timeAdvanced handler moved to main socket setup (line ~646)
  // Removed duplicate that would add extra listener each time pilot role selected
}

// AR-31: Listen for engineer power events
function setupEngineerListeners() {
  if (!state.socket) return;

  state.socket.on('ops:powerChanged', (data) => {
    // Update local ship state
    if (state.shipState) {
      state.shipState.power = data.power;
      state.shipState.powerEffects = data.effects;
      state.shipState.powerPreset = data.preset;
    }
    // Show notification
    const presetLabel = data.preset ? data.preset.charAt(0).toUpperCase() + data.preset.slice(1) : 'Custom';
    showNotification(`Power: ${presetLabel} (${data.setBy})`, 'info');
    // Refresh panel to show updated power levels
    if (typeof refreshCrewPanel === 'function') {
      refreshCrewPanel();
    }
  });

  state.socket.on('ops:powerStatus', (data) => {
    if (state.shipState) {
      state.shipState.power = data.power;
      state.shipState.powerEffects = data.effects;
    }
    if (typeof refreshCrewPanel === 'function') {
      refreshCrewPanel();
    }
  });
}

// Advance game time (AR-30: player time control, AR-53: fix connection check)
function advanceTime(days, hours, minutes = 0, reason = '') {
  if (!state.socket || !state.socket.connected || !state.campaignId) {
    showNotification('Not connected to campaign', 'error');
    return;
  }
  state.socket.emit('ops:advanceTime', { days, hours, minutes, reason });
}

// AR-33: Travel confirmation modal
let pendingTravel = null;

function showTravelModal(destination) {
  pendingTravel = destination;

  // Load and show template
  const template = document.getElementById('template-travel-confirm');
  if (!template) {
    console.error('[Travel] Template not found');
    // Fallback: just set system without modal
    state.socket.emit('ops:setCurrentSystem', destination);
    closeModal();
    return;
  }

  const content = template.content.cloneNode(true);

  // Set destination name
  const destName = content.querySelector('#travel-destination-name');
  if (destName) destName.textContent = destination.system;

  // Set current date
  const currentDate = content.querySelector('#travel-current-date');
  if (currentDate) currentDate.textContent = state.campaign?.current_date || '--';

  // Calculate arrival date function
  const updateArrivalDate = () => {
    const selected = document.querySelector('input[name="travel-time"]:checked');
    const arrivalEl = document.getElementById('travel-arrival-date');
    if (!selected || !arrivalEl || !state.campaign?.current_date) return;

    let days = 0;
    if (selected.value === 'instant') {
      days = 0;
    } else if (selected.value === 'custom') {
      days = parseInt(document.getElementById('travel-custom-days')?.value) || 0;
    } else {
      days = parseInt(selected.value) || 7;
    }

    // Calculate new date (simple approximation for display)
    if (days === 0) {
      arrivalEl.textContent = state.campaign.current_date + ' (no change)';
    } else {
      // Parse YYYY-DDD HH:MM format
      const [datePart, timePart] = state.campaign.current_date.split(' ');
      const [year, dayOfYear] = datePart.split('-').map(Number);
      let newDay = dayOfYear + days;
      let newYear = year;
      while (newDay > 365) {
        newDay -= 365;
        newYear++;
      }
      arrivalEl.textContent = `${newYear}-${String(newDay).padStart(3, '0')} ${timePart || '00:00'}`;
    }
  };

  // Show modal
  const overlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');
  modalContent.innerHTML = '';
  modalContent.appendChild(content);
  overlay.classList.remove('hidden');

  // Add event listeners
  document.querySelectorAll('input[name="travel-time"]').forEach(radio => {
    radio.addEventListener('change', updateArrivalDate);
  });
  document.getElementById('travel-custom-days')?.addEventListener('input', () => {
    document.getElementById('travel-custom').checked = true;
    updateArrivalDate();
  });

  // Initial calculation
  setTimeout(updateArrivalDate, 10);

  // Confirm button
  document.getElementById('btn-confirm-travel')?.addEventListener('click', () => {
    const selected = document.querySelector('input[name="travel-time"]:checked');
    let days = 0;
    if (selected) {
      if (selected.value === 'instant') {
        days = 0;
      } else if (selected.value === 'custom') {
        days = parseInt(document.getElementById('travel-custom-days')?.value) || 0;
      } else {
        days = parseInt(selected.value) || 7;
      }
    }

    // Emit travel with time
    state.socket.emit('ops:travelToSystem', {
      ...pendingTravel,
      travelDays: days
    });
    closeModal();
    pendingTravel = null;
  });
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

// AR-68: Verify position after jump exit
function verifyPosition() {
  state.socket.emit('ops:verifyPosition');
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

// AR-36/AR-127: ECM/ECCM Functions (Mongoose 2e rules) - Fixed socket events
function toggleECM() {
  const newState = !state.shipState?.ecm;
  state.socket.emit('ops:setEW', { type: 'ecm', active: newState });
  if (!state.shipState) state.shipState = {};
  state.shipState.ecm = newState;
  showNotification(`ECM ${newState ? 'ACTIVATED' : 'DEACTIVATED'} - Enemies get ${newState ? '-2 DM' : 'no penalty'} to sensors`, newState ? 'warning' : 'info');
  renderRoleDetailPanel('sensor_operator');
}

function toggleECCM() {
  const newState = !state.shipState?.eccm;
  state.socket.emit('ops:setEW', { type: 'eccm', active: newState });
  if (!state.shipState) state.shipState = {};
  state.shipState.eccm = newState;
  showNotification(`ECCM ${newState ? 'ACTIVATED' : 'DEACTIVATED'} - ${newState ? 'Countering enemy ECM' : 'Vulnerable to jamming'}`, newState ? 'success' : 'info');
  renderRoleDetailPanel('sensor_operator');
}

function acquireSensorLock(contactId) {
  const contact = state.contacts?.find(c => c.id === contactId);
  if (!contact) return;

  // Check if target has ECM active (breaks lock attempt)
  if (contact.ecmActive) {
    showNotification('Lock failed - target ECM active', 'danger');
    return;
  }

  // AR-127: Fixed socket event name
  state.socket.emit('ops:setSensorLock', { contactId, locked: true });
  if (!state.shipState) state.shipState = {};
  state.shipState.sensorLock = {
    targetId: contactId,
    targetName: contact.name || contact.transponder || `Contact ${contactId.slice(0,4)}`,
    lockedAt: Date.now()
  };
  showNotification(`SENSOR LOCK acquired on ${state.shipState.sensorLock.targetName} (+2 Attack DM)`, 'success');
  renderRoleDetailPanel('sensor_operator');
}

function breakSensorLock() {
  // AR-127: Use setSensorLock with locked: false instead of separate event
  state.socket.emit('ops:setSensorLock', { contactId: null, locked: false });
  if (state.shipState) {
    state.shipState.sensorLock = null;
  }
  showNotification('Sensor lock released', 'info');
  renderRoleDetailPanel('sensor_operator');
}

// AR-36: Stealth mode toggle
function toggleStealth() {
  const newState = !state.shipState?.stealth;
  state.socket.emit('ops:setEW', { type: 'stealth', active: newState });
  if (!state.shipState) state.shipState = {};
  state.shipState.stealth = newState;
  showNotification(`Stealth mode ${newState ? 'ENGAGED' : 'disengaged'} - ${newState ? 'Reduced sensor signature' : 'Normal signature'}`, newState ? 'warning' : 'info');
  renderRoleDetailPanel('sensor_operator');
}

// AR-36: Set sensor lock on specific contact (alternative to acquireSensorLock)
function setSensorLock(contactId) {
  if (contactId) {
    acquireSensorLock(contactId);
  } else {
    breakSensorLock();
  }
}

// AR-138: Sensor panel mode toggle
function toggleSensorPanelMode(mode) {
  if (mode) {
    state.sensorPanelMode = mode;
  } else {
    // Cycle: collapsed → expanded → collapsed
    state.sensorPanelMode = state.sensorPanelMode === 'collapsed' ? 'expanded' : 'collapsed';
  }
  renderRoleDetailPanel('sensor_operator');
}

// AR-138: Check for threats and auto-expand sensor panel
function checkSensorThreats() {
  const threats = state.contacts?.filter(c =>
    !c.celestial && (c.marking === 'hostile' || (c.type === 'Ship' && c.marking === 'unknown'))
  ) || [];

  if (threats.length > 0 && state.sensorPanelMode === 'collapsed') {
    state.sensorPanelMode = 'combat';
    renderRoleDetailPanel('sensor_operator');
    showNotification(`⚠ ${threats.length} potential threat(s) detected!`, 'danger');
  }
}

// AR-138.2: Mini radar canvas renderer
function renderMiniRadar(contacts, range = 50000) {
  const canvas = document.getElementById('sensor-mini-radar');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const scale = (w / 2 - 10) / range;

  // Clear and fill background
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, w, h);

  // Draw range rings
  ctx.strokeStyle = 'rgba(100, 150, 100, 0.3)';
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75, 1].forEach(r => {
    ctx.beginPath();
    ctx.arc(cx, cy, r * (w / 2 - 10), 0, Math.PI * 2);
    ctx.stroke();
  });

  // Draw crosshairs
  ctx.strokeStyle = 'rgba(100, 150, 100, 0.2)';
  ctx.beginPath();
  ctx.moveTo(cx, 5);
  ctx.lineTo(cx, h - 5);
  ctx.moveTo(5, cy);
  ctx.lineTo(w - 5, cy);
  ctx.stroke();

  // Draw ship at center (triangle pointing up)
  ctx.fillStyle = '#4a9';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx - 4, cy + 4);
  ctx.lineTo(cx + 4, cy + 4);
  ctx.closePath();
  ctx.fill();

  // Draw contacts
  contacts.forEach(c => {
    const angle = ((c.bearing || 0) - 90) * Math.PI / 180;  // -90 to put 0° at top
    const dist = Math.min(c.range_km || range, range);
    const x = cx + Math.cos(angle) * dist * scale;
    const y = cy + Math.sin(angle) * dist * scale;

    // Color by marking
    const colors = {
      friendly: '#4f4',
      hostile: '#f44',
      neutral: '#48f',
      unknown: '#ff4'
    };
    ctx.fillStyle = colors[c.marking] || '#ff4';

    // Draw contact dot
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw bearing line for hostile
    if (c.marking === 'hostile') {
      ctx.strokeStyle = 'rgba(255, 68, 68, 0.3)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  });

  // Draw range label
  ctx.fillStyle = 'rgba(150, 170, 150, 0.6)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${(range / 1000).toFixed(0)}k km`, cx, h - 4);
}

// AR-131+: Captain panel switching - allows captain to access other role panels
function switchCaptainPanel(panel) {
  state.captainActivePanel = panel;
  renderRoleDetailPanel('captain');
  console.log(`[Captain] Switched to ${panel} panel`);
}

// AR-125L: Pirate encounter lite - scripted comms encounter
const pirateEncounterScript = [
  { delay: 0, from: 'SENSORS', msg: '⚠ Contact detected! Unknown vessel, bearing 045, range 50,000km' },
  { delay: 2000, from: 'PIRATE CORSAIR', msg: '🏴‍☠️ Attention merchant vessel! Heave to and prepare to be boarded. Resistance is futile.' },
  { delay: 6000, from: 'PIRATE CORSAIR', msg: '🏴‍☠️ Don\'t try anything clever. We have you outgunned. Cut your drives NOW.' },
  { delay: 12000, from: 'SENSORS', msg: '⚠ ALERT: Second contact detected! Military transponder - Imperial Navy patrol vessel!' },
  { delay: 14000, from: 'PIRATE CORSAIR', msg: '🏴‍☠️ Navy patrol?! All hands, emergency jump! This isn\'t over, merchant!' },
  { delay: 16000, from: 'SENSORS', msg: '✓ Pirate contact jumping out... Contact lost. All clear.' }
];

function gmTriggerPirateEncounter() {
  if (!state.isGM) {
    showNotification('Only GM can trigger encounters', 'danger');
    return;
  }

  showNotification('Triggering pirate encounter...', 'info');

  pirateEncounterScript.forEach(({ delay, from, msg }) => {
    setTimeout(() => {
      // Send as transmission to bridge chat
      const transmission = {
        fromName: from,
        message: msg,
        timestamp: Date.now()
      };
      addBridgeChatMessage(transmission);

      // Also emit to server so all clients see it
      if (state.socket) {
        state.socket.emit('ops:bridgeTransmission', transmission);
      }
    }, delay);
  });
}

// AR-139: GM damage control functions
function gmApplyDamage(severity) {
  if (!state.isGM) {
    showNotification('Only GM can apply damage', 'danger');
    return;
  }
  const systemSelect = document.getElementById('gm-damage-system-select');
  const location = systemSelect?.value || 'hull';
  state.socket.emit('ops:applySystemDamage', {
    shipId: state.shipId,
    location,
    severity
  });
  console.log(`[GM] Applied damage: ${location} severity ${severity}`);
}

function gmClearDamage() {
  if (!state.isGM) {
    showNotification('Only GM can clear damage', 'danger');
    return;
  }
  const systemSelect = document.getElementById('gm-damage-system-select');
  const location = systemSelect?.value || 'hull';
  state.socket.emit('ops:clearSystemDamage', {
    shipId: state.shipId,
    location
  });
  console.log(`[GM] Cleared damage: ${location}`);
}

function gmRestoreAllSystems() {
  if (!state.isGM) {
    showNotification('Only GM can restore systems', 'danger');
    return;
  }
  const systems = ['mDrive', 'jDrive', 'powerPlant', 'sensors', 'computer', 'weapon', 'hull', 'crew'];
  systems.forEach(location => {
    state.socket.emit('ops:clearSystemDamage', {
      shipId: state.shipId,
      location
    });
  });
  showNotification('All systems restored', 'success');
  console.log('[GM] Restored all systems');
}

// AR-139: Show GM damage controls when GM opens ship systems panel
function showGMDamageControls() {
  const controls = document.getElementById('gm-damage-controls');
  if (controls && state.isGM) {
    controls.classList.remove('hidden');
  }
}

// AR-103: calculateSensorDM moved to modules/helpers.js

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

  // CLEAN-1: Ensure complete update after scan
  renderContacts();
  renderCombatContactsList();
  checkSensorThreats(); // AR-138.3: Auto-expand on threat

  // Re-render panel to update contact counts
  renderRoleDetailPanel(state.selectedRole);
}

// Show scan result overlay with newly discovered info highlighted - AR-30
function showScanResultOverlay(contact, discoveries, oldLevel, newLevel) {
  // Define what fields are revealed at each scan level
  const SCAN_LEVEL_LABELS = { 0: 'Unknown', 1: 'Passive', 2: 'Active', 3: 'Deep' };

  // Map discovery strings to actual contact field names
  const DISCOVERY_FIELD_MAP = {
    'transponder': 'transponder',
    'celestial type': 'type',
    'bearing': 'bearing',
    'range': 'range_band',
    'ship type': 'type',
    'tonnage': 'tonnage',
    'signature': 'signature',
    'transponder override': 'transponder',
    'weapons detected': 'weapons',
    'cargo manifest': 'cargo',
    'crew count': 'crew',
    'detailed specs': 'specs',
    'GM notes': 'gm_notes'
  };

  // Create set of newly discovered field names
  const newFields = new Set(discoveries.map(d => DISCOVERY_FIELD_MAP[d]).filter(Boolean));

  // Build rows for all known info
  const rows = [];

  // Always show name/designator
  const displayName = contact.name || contact.transponder || `Contact ${contact.id?.slice(0, 4) || '???'}`;
  rows.push({ label: 'Designation', value: displayName, isNew: newFields.has('name') || newFields.has('transponder') });

  // Type (ship/celestial)
  if (contact.type) {
    rows.push({ label: 'Type', value: contact.type, isNew: newFields.has('type') });
  }

  // Position info
  if (contact.bearing !== undefined) {
    rows.push({ label: 'Bearing', value: `${contact.bearing}°`, isNew: newFields.has('bearing') });
  }
  if (contact.range_band) {
    rows.push({ label: 'Range', value: contact.range_band, isNew: newFields.has('range_band') });
  }
  if (contact.range_km) {
    rows.push({ label: 'Distance', value: `${contact.range_km.toLocaleString()} km`, isNew: false });
  }

  // Transponder
  if (contact.transponder) {
    rows.push({ label: 'Transponder', value: contact.transponder, isNew: newFields.has('transponder') });
  }

  // Ship details (level 2+)
  if (contact.tonnage) {
    rows.push({ label: 'Tonnage', value: `${contact.tonnage} dT`, isNew: newFields.has('tonnage') });
  }
  if (contact.signature) {
    rows.push({ label: 'Signature', value: contact.signature, isNew: newFields.has('signature') });
  }

  // Deep scan details (level 3)
  if (contact.crew) {
    rows.push({ label: 'Crew', value: contact.crew, isNew: newFields.has('crew') });
  }
  if (contact.cargo) {
    rows.push({ label: 'Cargo', value: contact.cargo, isNew: newFields.has('cargo') });
  }

  // Celestial info
  if (contact.stellar_class) {
    rows.push({ label: 'Stellar Class', value: contact.stellar_class, isNew: false });
  }
  if (contact.uwp) {
    rows.push({ label: 'UWP', value: contact.uwp, isNew: false });
  }
  if (contact.trade_codes) {
    rows.push({ label: 'Trade Codes', value: contact.trade_codes, isNew: false });
  }

  // Build HTML
  const rowsHtml = rows.map(r => `
    <div class="scan-result-row${r.isNew ? ' newly-discovered' : ''}">
      <span class="scan-result-label">${escapeHtml(r.label)}</span>
      <span class="scan-result-value">${escapeHtml(r.value)}</span>
    </div>
  `).join('');

  const overlay = document.createElement('div');
  overlay.className = 'scan-result-overlay';
  overlay.innerHTML = `
    <div class="scan-result-card">
      <div class="scan-result-header">
        <h4>Scan Complete</h4>
        <span class="scan-level-badge">${SCAN_LEVEL_LABELS[newLevel]} Scan</span>
      </div>
      <div class="scan-result-body">
        ${rowsHtml}
      </div>
      <div class="scan-result-footer">
        ${discoveries.length > 0 ? `New data acquired: ${discoveries.join(', ')}` : 'No new data discovered'}
        <br><small>Click anywhere to dismiss</small>
      </div>
    </div>
  `;

  // Click anywhere to dismiss
  overlay.addEventListener('click', () => {
    overlay.remove();
  });

  // Prevent click on card from dismissing (optional - currently allows dismiss anywhere)
  // overlay.querySelector('.scan-result-card').addEventListener('click', e => e.stopPropagation());

  document.body.appendChild(overlay);
}

// AR-151d: News & Mail Display moved to modules/news-mail.js

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
  renderRoleDetailPanel(state.selectedRole);
}

function fireAtTarget() {
  const targetSelect = document.getElementById('fire-target-select');
  const weaponSelect = document.getElementById('fire-weapon-select');

  if (!targetSelect) {
    showNotification('No target selected', 'error');
    return;
  }

  const contactId = targetSelect.value;
  const weaponId = weaponSelect?.value || null;
  const targetName = targetSelect.options[targetSelect.selectedIndex]?.text || 'Target';

  state.socket.emit('ops:fireWeapon', { targetId: contactId, weaponId });
  showNotification(`Firing at ${targetName}...`, 'warning');
}

// Combat module wrappers (AR-14) - delegate to combat.js module
function fireWeapon() { combat.fireWeapon(state); }
function fireAllWeapons() {
  // AR-37: Fire all ready weapons at locked target
  const weapons = state.shipWeapons || [];
  const targetId = state.shipState?.lockedTarget;
  if (!targetId) {
    showNotification('No target locked', 'warning');
    return;
  }
  weapons.forEach((w, idx) => {
    if (w.status === 'ready' || !w.status) {
      state.shipState.selectedWeapon = idx;
      combat.fireWeapon(state);
    }
  });
  showNotification(`Fired ${weapons.filter(w => w.status === 'ready' || !w.status).length} weapons`, 'info');
}
function lockTarget(contactId) { combat.lockTarget(state, contactId); }
function selectWeapon(weaponId) { combat.selectWeapon(state, weaponId); }
function selectWeaponByIndex(index) {
  // Convert index to weapon selection - stores index as selectedWeapon
  const idx = parseInt(index, 10);
  state.shipState.selectedWeapon = idx;
  renderRoleDetailPanel(state.selectedRole);
}
function togglePointDefense() { combat.togglePointDefense(state); }

// ==================== AR-29: Captain Operations ====================

/**
 * Set alert status (Captain only)
 */
function captainSetAlert(alertStatus) {
  if (state.selectedRole !== 'captain' && !state.isGM) {
    showNotification('Only Captain can change alert status', 'error');
    return;
  }
  // Map GREEN to NORMAL for backend compatibility
  const status = alertStatus === 'GREEN' ? 'NORMAL' : alertStatus;
  state.socket.emit('ops:setAlertStatus', { alertStatus: status });
  showNotification(`Alert status: ${alertStatus}`, alertStatus === 'RED' ? 'error' : alertStatus === 'YELLOW' ? 'warning' : 'success');
}

/**
 * Issue quick order (Captain only)
 */
function captainQuickOrder(order) {
  if (state.selectedRole !== 'captain' && !state.isGM) {
    showNotification('Only Captain can issue orders', 'error');
    return;
  }
  state.socket.emit('ops:issueOrder', { target: 'all', order, requiresAck: true });
  showNotification(`Order issued: ${order}`, 'info');
}

/**
 * Issue navigation order (Captain → Pilot)
 */
function captainNavOrder(orderType) {
  if (state.selectedRole !== 'captain' && !state.isGM) {
    showNotification('Only Captain can issue orders', 'error');
    return;
  }
  state.socket.emit('ops:issueOrder', { target: 'pilot', order: orderType, orderType: 'navigation', requiresAck: true });
  showNotification(`Navigation: ${orderType}`, orderType === 'Emergency Stop' ? 'warning' : 'info');
}

/**
 * Issue contact-targeted order (Captain → Pilot/Gunner)
 */
function captainContactOrder(action) {
  if (state.selectedRole !== 'captain' && !state.isGM) {
    showNotification('Only Captain can issue orders', 'error');
    return;
  }
  const contactSelect = document.getElementById('order-contact-select');
  if (!contactSelect?.value) {
    showNotification('Select a contact first', 'warning');
    return;
  }
  const contactId = contactSelect.value;
  const contactName = contactSelect.options[contactSelect.selectedIndex]?.text || 'contact';
  const order = `${action.charAt(0).toUpperCase() + action.slice(1)} ${contactName}`;
  const target = action === 'intercept' || action === 'avoid' ? 'pilot' : 'all';
  state.socket.emit('ops:issueOrder', { target, order, contactId, orderType: action, requiresAck: true });
  showNotification(`Order: ${order}`, action === 'intercept' ? 'warning' : 'info');
}

/**
 * Issue custom order (Captain only)
 */
function captainIssueOrder() {
  if (state.selectedRole !== 'captain' && !state.isGM) {
    showNotification('Only Captain can issue orders', 'error');
    return;
  }
  const targetSelect = document.getElementById('order-target-select');
  const orderInput = document.getElementById('order-text-input');
  if (!orderInput || !orderInput.value.trim()) {
    showNotification('Enter an order', 'warning');
    return;
  }
  const target = targetSelect?.value || 'all';
  const order = orderInput.value.trim();
  state.socket.emit('ops:issueOrder', { target, order, requiresAck: true });
  orderInput.value = '';
  showNotification(`Order sent to ${target}: ${order}`, 'info');
}

/**
 * Mark contact (Captain only)
 */
function captainMarkContact(marking) {
  if (state.selectedRole !== 'captain' && !state.isGM) {
    showNotification('Only Captain can mark contacts', 'error');
    return;
  }
  const contactSelect = document.getElementById('mark-contact-select');
  if (!contactSelect) {
    showNotification('No contact selected', 'error');
    return;
  }
  const contactId = contactSelect.value;
  state.socket.emit('ops:markContact', { contactId, marking });
  showNotification(`Contact marked as ${marking}`, marking === 'hostile' ? 'warning' : 'info');
}

/**
 * Set weapons authorization (Captain only)
 */
function captainWeaponsAuth(mode) {
  if (state.selectedRole !== 'captain' && state.selectedRole !== 'gunner' && !state.isGM) {
    showNotification('Only Captain or Gunner can authorize weapons', 'error');
    return;
  }
  state.socket.emit('ops:setWeaponsAuth', { mode, targets: ['all'] });
  showNotification(`Weapons ${mode === 'free' ? 'FREE' : 'HOLD'}`, mode === 'free' ? 'warning' : 'info');
}

/**
 * Request status from crew (Captain only)
 */
function captainRequestStatus() {
  if (state.selectedRole !== 'captain' && !state.isGM) {
    showNotification('Only Captain can request status', 'error');
    return;
  }
  state.socket.emit('ops:requestStatus', { target: 'all' });
  showNotification('Status report requested', 'info');
}

/**
 * Leadership check (Captain only)
 */
function captainLeadershipCheck() {
  if (state.selectedRole !== 'captain' && !state.isGM) {
    showNotification('Only Captain can make leadership checks', 'error');
    return;
  }
  // TODO: Get actual skill from character
  const skill = 0;
  state.socket.emit('ops:leadershipCheck', { skill, target: 'all' });
}

/**
 * Tactics check (Captain only)
 */
function captainTacticsCheck() {
  if (state.selectedRole !== 'captain' && !state.isGM) {
    showNotification('Only Captain can make tactics checks', 'error');
    return;
  }
  // TODO: Get actual skill from character
  const skill = 0;
  state.socket.emit('ops:tacticsCheck', { skill });
}

/**
 * Acknowledge an order (any crew)
 */
function acknowledgeOrder(orderId) {
  state.socket.emit('ops:acknowledgeOrder', { orderId });
  showNotification('Order acknowledged', 'success');
}

/**
 * AR-131: Captain Solo Mode - execute commands directly
 * Routes to existing role handlers with captain override
 */
function captainSoloCommand(command) {
  switch (command) {
    case 'plotJump':
      // Open jump plot modal or show destinations
      showNotification('Select a jump destination from the Astrogator panel', 'info');
      // Could open a modal here - for MVP, direct to astrogator panel
      break;

    case 'verifyPosition':
      state.socket.emit('ops:verifyPosition');
      showNotification('Verifying position...', 'info');
      break;

    case 'setCourse':
      // Show destinations panel
      showPlacesOverlay();
      showNotification('Select destination from Places panel', 'info');
      break;

    case 'refuel':
      // Trigger refuel dialog
      state.socket.emit('ops:getAvailableFuelSources');
      showNotification('Checking available fuel sources...', 'info');
      break;

    case 'refineFuel':
      state.socket.emit('ops:startFuelProcessing', { tons: 'all' });
      showNotification('Starting fuel processing...', 'info');
      break;

    default:
      showNotification(`Unknown command: ${command}`, 'warning');
  }

  // Log the captain's action
  state.socket.emit('ops:addLogEntry', {
    entryType: 'command',
    message: `Captain orders: ${command}`,
    actor: 'Captain'
  });
}

// Expose captain functions to window
window.captainSetAlert = captainSetAlert;
window.captainQuickOrder = captainQuickOrder;
window.captainNavOrder = captainNavOrder;
window.captainContactOrder = captainContactOrder;
window.captainIssueOrder = captainIssueOrder;
window.captainMarkContact = captainMarkContact;
window.captainWeaponsAuth = captainWeaponsAuth;
window.captainRequestStatus = captainRequestStatus;
window.captainLeadershipCheck = captainLeadershipCheck;
window.captainTacticsCheck = captainTacticsCheck;
window.acknowledgeOrder = acknowledgeOrder;
window.captainSoloCommand = captainSoloCommand;  // AR-131

/**
 * Update fire button text when weapon selection changes
 */
function updateFireButton() {
  const weaponSelect = document.getElementById('fire-weapon-select');
  const fireButton = document.getElementById('fire-button');
  if (weaponSelect && fireButton) {
    const selectedOption = weaponSelect.options[weaponSelect.selectedIndex];
    // Extract weapon name from option text (format: "Pulse Laser (2d6)")
    const weaponName = selectedOption?.text.split(' (')[0] || 'Weapon';
    fireButton.textContent = `FIRE ${weaponName}!`;
  }
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
  renderRoleDetailPanel(state.selectedRole);
}

// ==================== Jump Map (Stage 6) ====================

async function updateJumpMap() {
  const sector = state.campaign?.current_sector;
  const hex = state.campaign?.current_hex;

  if (!sector || !hex) return;

  const range = parseInt(document.getElementById('jump-map-range')?.value) || 2;
  const style = document.getElementById('jump-map-style')?.value || 'poster';

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
        ${data.Worlds.map(world => {
          // AR-66: Fix undefined hex coordinates
          const hexX = world.HexX || world.Hex?.substring(0, 2) || '??';
          const hexY = world.HexY || world.Hex?.substring(2, 4) || '??';
          const hex = `${hexX}${String(hexY).padStart(2, '0')}`;
          return `
          <div class="destination-item" data-name="${escapeHtml(world.Name)}" data-sector="${escapeHtml(world.Sector || sector)}" data-hex="${hex}" onclick="selectJumpDestination(this)">
            <span class="dest-name">${escapeHtml(world.Name)}</span>
            <span class="dest-uwp">${world.Uwp || '???????-?'}</span>
            <span class="dest-distance">J-${world.Distance || '?'}</span>
          </div>
        `;
        }).join('')}
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
    setTimeout(() => {
      updateJumpMap();
      initMapInteractions();
      restoreMapSize();
    }, 100);
  }
}

// AR-15.7: Map size control with localStorage persistence
function setMapSize(size) {
  const container = document.getElementById('jump-map-container');
  if (!container) return;

  container.dataset.size = size;
  localStorage.setItem('ops-map-size', size);

  // Update select to match
  const select = document.getElementById('jump-map-size');
  if (select) select.value = size;
}

function restoreMapSize() {
  const saved = localStorage.getItem('ops-map-size');
  if (saved) {
    setMapSize(saved);
  }
}

// AR-15.7: Map drag-to-pan and keyboard navigation
function initMapInteractions() {
  const container = document.getElementById('jump-map-container');
  const img = document.getElementById('jump-map-image');
  if (!container || !img) return;

  let isDragging = false;
  let startX, startY, scrollLeft, scrollTop;

  // Mouse drag to pan
  container.addEventListener('mousedown', (e) => {
    if (e.target !== img && e.target !== container) return;
    isDragging = true;
    container.style.cursor = 'grabbing';
    startX = e.pageX - container.offsetLeft;
    startY = e.pageY - container.offsetTop;
    scrollLeft = container.scrollLeft;
    scrollTop = container.scrollTop;
    e.preventDefault();
  });

  container.addEventListener('mouseleave', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });

  container.addEventListener('mouseup', () => {
    isDragging = false;
    container.style.cursor = 'grab';
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const y = e.pageY - container.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    container.scrollLeft = scrollLeft - walkX;
    container.scrollTop = scrollTop - walkY;
  });

  // Set initial cursor
  container.style.cursor = 'grab';

  // Keyboard navigation when container is focused
  container.tabIndex = 0; // Make focusable
  container.addEventListener('keydown', (e) => {
    const step = 50;
    switch (e.key) {
      case 'ArrowLeft':
        container.scrollLeft -= step;
        e.preventDefault();
        break;
      case 'ArrowRight':
        container.scrollLeft += step;
        e.preventDefault();
        break;
      case 'ArrowUp':
        container.scrollTop -= step;
        e.preventDefault();
        break;
      case 'ArrowDown':
        container.scrollTop += step;
        e.preventDefault();
        break;
    }
  });
}

// ==================== Refueling ====================

function openRefuelModal() {
  // Request refuel options from server
  state.socket.emit('ops:getRefuelOptions');
  showModal('template-refuel');
}

function processFuel() {
  if (!state.socket || !state.campaignId) {
    showNotification('Not connected to campaign', 'error');
    return;
  }

  // Get unrefined fuel amount from ship state
  const fuel = state.shipState?.fuel || {};
  const unrefined = fuel.unrefined || 0;

  if (unrefined <= 0) {
    showNotification('No unrefined fuel to process', 'warning');
    return;
  }

  // Prompt for amount
  const tons = prompt(`Process how many tons of unrefined fuel? (0-${unrefined})`, unrefined);
  if (tons === null) return;

  const amount = parseFloat(tons);
  if (isNaN(amount) || amount <= 0 || amount > unrefined) {
    showNotification('Invalid amount', 'error');
    return;
  }

  state.socket.emit('ops:startFuelProcessing', { tons: amount });
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

  // AR-60: Default amount to MAX
  setRefuelMax();
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
  if (alertEl) {
    // AR-92: Preserve alert-status-led class if present
    const isLed = alertEl.classList.contains('alert-status-led');
    alertEl.className = `alert-status ${isLed ? 'alert-status-led ' : ''}${status.toLowerCase()}`;
    // AR-92: Update tooltip for LED version
    alertEl.title = `Alert Status: ${status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}`;
    const textEl = alertEl.querySelector('.alert-text');
    if (textEl) textEl.textContent = status.toUpperCase();
  }
}

/**
 * Update weapons authorization indicator in bridge header
 */
function updateWeaponsAuthIndicator(mode) {
  const indicator = document.getElementById('weapons-auth-indicator');
  if (!indicator) return;

  const isFree = mode === 'free';
  indicator.className = `weapons-auth-indicator ${isFree ? 'free' : 'hold'}`;
  const textEl = indicator.querySelector('.weapons-text');
  if (textEl) {
    textEl.textContent = isFree ? 'WEAPONS FREE' : 'WEAPONS HOLD';
  }
}

/**
 * AR-29: Apply alert border to panels based on status
 */
function applyAlertBorder(status) {
  const rolePanel = document.getElementById('role-panel');
  if (!rolePanel) return;

  // Remove existing alert classes
  rolePanel.classList.remove('alert-green', 'alert-yellow', 'alert-red');

  // Apply new class based on status
  const normalizedStatus = status === 'NORMAL' ? 'green' : status.toLowerCase();
  if (['yellow', 'red'].includes(normalizedStatus)) {
    rolePanel.classList.add(`alert-${normalizedStatus}`);
  }
}

/**
 * AR-35: Update pending orders display with ack checkmarks
 */
function updatePendingOrdersDisplay() {
  const container = document.getElementById('pending-orders');
  if (!container) return;

  const orders = (state.pendingOrders || [])
    .filter(o => o.status !== 'acknowledged')
    .slice(-5); // Show last 5 pending

  if (orders.length === 0) {
    container.innerHTML = '<div class="no-orders">No pending orders</div>';
    return;
  }

  container.innerHTML = orders.map(order => {
    const allRoles = ['pilot', 'gunner', 'engineer', 'sensor_operator'];
    const targetRoles = order.target === 'all' ? allRoles : [order.target];
    const isStale = Date.now() - order.timestamp > 30000; // 30 sec timeout

    const roleIcons = targetRoles.map(role => {
      const shortName = role === 'sensor_operator' ? 'SEN' :
                        role.substring(0, 3).toUpperCase();
      const acked = order.acknowledgedBy?.some(a =>
        a.toLowerCase().includes(role.substring(0, 3))
      ) || !order.pendingAcks?.includes(role);
      return `<span class="ack-icon ${acked ? 'acked' : 'pending'}" title="${role}">${shortName}${acked ? '✓' : '○'}</span>`;
    }).join('');

    return `
      <div class="pending-order ${isStale ? 'stale' : ''}">
        <div class="order-text">${escapeHtml(order.order.substring(0, 50))}</div>
        <div class="order-acks">${roleIcons}</div>
      </div>
    `;
  }).join('');
}

/**
 * AR-29: Show order acknowledgment prompt
 */
function showOrderAckPrompt(orderId, orderText) {
  const toast = document.createElement('div');
  toast.className = 'order-ack-toast';
  toast.innerHTML = `
    <div class="order-content">
      <strong>Captain's Order:</strong> ${orderText}
    </div>
    <button onclick="acknowledgeOrder('${orderId}'); this.parentElement.remove();" class="btn btn-small btn-success">
      Acknowledge
    </button>
  `;
  document.body.appendChild(toast);

  // Auto-remove after 30 seconds
  setTimeout(() => toast.remove(), 30000);
}

/**
 * AR-29: Generate role status for Captain's status request
 */
function generateRoleStatus(role) {
  const status = { summary: 'Ready' };

  switch (role) {
    case 'pilot':
      status.summary = state.shipState?.evasive ? 'Evasive maneuvers' : 'Holding course';
      status.course = state.shipState?.course || 'None';
      status.fuel = state.fuelStatus?.percentage || 100;
      break;
    case 'gunner':
      status.summary = state.weaponsAuth?.mode === 'free' ? 'Weapons hot' : 'Weapons cold';
      status.weaponsReady = true;
      break;
    case 'engineer':
      status.summary = state.damagedSystems?.length ? `${state.damagedSystems.length} systems damaged` : 'All systems nominal';
      status.power = state.shipState?.power || 100;
      break;
    case 'sensor_operator':
      status.summary = `Tracking ${state.contacts?.length || 0} contacts`;
      status.contacts = state.contacts?.length || 0;
      break;
    default:
      status.summary = 'Standing by';
  }

  return status;
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
    const confirmCreate = () => {
      const name = document.getElementById('new-campaign-name').value.trim();
      const gmName = document.getElementById('gm-name').value.trim();
      if (name && gmName) {
        state.socket.emit('ops:createCampaign', { name, gmName });
        closeModal();
      }
    };
    document.getElementById('btn-confirm-create-campaign').addEventListener('click', confirmCreate);

    // AR-58: ENTER hotkey for create campaign inputs
    ['new-campaign-name', 'gm-name'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          confirmCreate();
        }
      });
    });
  }

  if (templateId === 'template-character-import') {
    // AR-19.3-4: File upload and drag-drop handlers
    const dropZone = document.getElementById('char-file-drop');
    const fileInput = document.getElementById('char-file-input');
    const pasteArea = document.getElementById('char-paste');
    const statusEl = document.getElementById('parse-status');

    // Handle file selection
    const handleFile = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        pasteArea.value = e.target.result;
        // Auto-trigger parse
        document.getElementById('btn-parse-character').click();
      };
      reader.onerror = () => {
        statusEl.textContent = 'Error reading file';
        statusEl.className = 'parse-status error';
      };
      reader.readAsText(file);
    };

    // File input change handler
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });

    // Drag and drop handlers
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    // Click on drop zone opens file dialog
    dropZone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'LABEL') {
        fileInput.click();
      }
    });

    // Parse button - extract data from pasted text
    document.getElementById('btn-parse-character').addEventListener('click', () => {
      const text = document.getElementById('char-paste').value.trim();
      const statusEl = document.getElementById('parse-status');

      if (!text) {
        statusEl.textContent = 'Please paste character data first';
        statusEl.className = 'parse-status warning';
        return;
      }

      // Parse the text
      const parsed = parseCharacterText(text);

      // Populate form fields
      if (parsed.name) {
        document.getElementById('char-name').value = parsed.name;
      }

      // Map skills to form fields
      const skillMap = {
        'Pilot': 'skill-pilot',
        'Astrogation': 'skill-astrogation',
        'Engineer': 'skill-engineer',
        'Gunnery': 'skill-gunnery',
        'Sensors': 'skill-sensors',
        'Electronics': 'skill-sensors',
        'Leadership': 'skill-leadership',
        'Tactics': 'skill-tactics'
      };

      for (const [skillName, inputId] of Object.entries(skillMap)) {
        if (parsed.skills[skillName] !== undefined) {
          const el = document.getElementById(inputId);
          if (el) el.value = parsed.skills[skillName];
        }
      }

      // Map stats
      if (parsed.stats.dex) document.getElementById('stat-dex').value = parsed.stats.dex;
      if (parsed.stats.int) document.getElementById('stat-int').value = parsed.stats.int;
      if (parsed.stats.edu) document.getElementById('stat-edu').value = parsed.stats.edu;

      // Show status
      const found = [];
      if (parsed.name) found.push('name');
      if (Object.keys(parsed.skills).length > 0) found.push(`${Object.keys(parsed.skills).length} skills`);
      if (parsed.stats.dex || parsed.stats.int || parsed.stats.edu) found.push('stats');

      if (found.length > 0) {
        statusEl.textContent = `Parsed: ${found.join(', ')}. Review and edit below.`;
        statusEl.className = 'parse-status success';
      } else {
        statusEl.textContent = 'Could not parse any data. Please enter manually.';
        statusEl.className = 'parse-status warning';
      }
    });

    // Save button
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
          characterData: character
        });
        closeModal();
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

    // Set system button - AR-33: Show travel confirmation modal
    document.getElementById('btn-set-system').addEventListener('click', () => {
      if (!selectedSystem) return;
      // AR-66: Fix undefined hex coordinates
      const hexX = selectedSystem.HexX || selectedSystem.Hex?.substring(0, 2) || '??';
      const hexY = selectedSystem.HexY || selectedSystem.Hex?.substring(2, 4) || '??';
      const systemName = `${selectedSystem.Name} (${selectedSystem.Sector || 'Unknown'} ${hexX}${String(hexY).padStart(2, '0')})`;
      showTravelModal({
        system: systemName,
        uwp: selectedSystem.Uwp,
        sector: selectedSystem.Sector,
        hex: `${selectedSystem.HexX}${String(selectedSystem.HexY).padStart(2, '0')}`
      });
    });

    // AR-23.6: Deep space mode toggle
    const deepSpaceToggle = document.getElementById('deep-space-toggle');
    const deepSpaceFields = document.getElementById('deep-space-fields');
    if (deepSpaceToggle && deepSpaceFields) {
      deepSpaceToggle.addEventListener('change', () => {
        deepSpaceFields.classList.toggle('hidden', !deepSpaceToggle.checked);
        if (!deepSpaceToggle.checked) {
          // Disable deep space mode
          state.socket.emit('ops:setDeepSpace', { enabled: false });
        } else {
          // Set reference to current system
          const refInput = document.getElementById('deep-space-reference');
          if (refInput && state.campaign?.current_system) {
            refInput.value = state.campaign.current_system;
          }
        }
      });
    }

    // AR-23.6: Update deep space position button
    const updateDeepSpaceBtn = document.getElementById('btn-update-deep-space');
    if (updateDeepSpaceBtn) {
      updateDeepSpaceBtn.addEventListener('click', () => {
        const referenceSystem = document.getElementById('deep-space-reference').value;
        const bearing = parseInt(document.getElementById('deep-space-bearing').value) || 0;
        const distance = parseFloat(document.getElementById('deep-space-distance').value) || 0;
        state.socket.emit('ops:setDeepSpace', {
          enabled: true,
          referenceSystem,
          bearing,
          distance
        });
      });
    }

    // AR-23.7: Home system button - go to home
    const homeBtn = document.getElementById('home-system-btn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        if (state.homeSystem) {
          // Parse home system and set it
          state.socket.emit('ops:setCurrentSystem', { system: state.homeSystem });
          closeModal();
        }
      });
    }

    // AR-23.7: Quick location clicks (recent + favorites)
    const bindQuickLocationClicks = () => {
      // Recent locations
      document.querySelectorAll('#recent-locations .quick-location-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('btn-favorite')) return;
          const loc = JSON.parse(item.dataset.location);
          state.socket.emit('ops:setCurrentSystem', {
            system: loc.system,
            uwp: loc.uwp,
            sector: loc.sector,
            hex: loc.hex
          });
          closeModal();
        });
        // Favorite toggle
        const favBtn = item.querySelector('.btn-favorite');
        if (favBtn) {
          favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const loc = JSON.parse(item.dataset.location);
            state.socket.emit('ops:toggleFavoriteLocation', { location: loc });
          });
        }
      });

      // Favorite locations
      document.querySelectorAll('#favorite-locations .quick-location-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('btn-set-home')) return;
          const loc = JSON.parse(item.dataset.location);
          state.socket.emit('ops:setCurrentSystem', {
            system: loc.system,
            uwp: loc.uwp,
            sector: loc.sector,
            hex: loc.hex
          });
          closeModal();
        });
        // Set as home button
        const homeBtn = item.querySelector('.btn-set-home');
        if (homeBtn) {
          homeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const loc = JSON.parse(item.dataset.location);
            state.socket.emit('ops:setHomeSystem', { locationDisplay: loc.locationDisplay });
          });
        }
      });
    };

    // Fetch location data and render
    state.socket.emit('ops:getLocationData');
    // Wait for data then bind clicks (renderQuickLocations will be called by socket handler)
    setTimeout(bindQuickLocationClicks, 100);
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

  // Ship Template Editor (AR-17)
  if (templateId === 'template-edit-ship') {
    // Populate editor with current data
    populateShipEditor();

    // Tab switching
    document.querySelectorAll('.editor-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        switchEditorTab(btn.dataset.tab);
      });
    });

    // Template selection change - load full template
    document.getElementById('edit-ship-template').addEventListener('change', (e) => {
      loadTemplateForEditor(e.target.value);
    });

    // Add weapon button
    document.getElementById('btn-add-weapon').addEventListener('click', addWeaponToEditor);

    // Add system button
    document.getElementById('btn-add-system').addEventListener('click', addSystemToEditor);

    // Save ship button
    document.getElementById('btn-save-edited-ship').addEventListener('click', saveEditedShip);

    // Update validation on field changes
    const fields = [
      'edit-hull-tonnage', 'edit-hull-points', 'edit-armor-rating',
      'edit-mdrive-thrust', 'edit-jdrive-rating', 'edit-power-output',
      'edit-fuel-capacity', 'edit-cargo-tonnage', 'edit-staterooms',
      'edit-low-berths', 'edit-common-areas'
    ];
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', updateValidationSummary);
    });

    // Initial validation
    updateValidationSummary();
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

  // AR-108.1: Refuel modal handlers (CSP compliance)
  if (templateId === 'template-refuel') {
    document.getElementById('refuel-amount')?.addEventListener('input', () => updateRefuelAmountPreview());
    document.getElementById('btn-refuel-max')?.addEventListener('click', () => setRefuelMax());
    document.getElementById('btn-execute-refuel')?.addEventListener('click', () => executeRefuel());
  }

  // AR-108.1: Process Fuel modal handlers (CSP compliance)
  if (templateId === 'template-process-fuel') {
    document.getElementById('btn-process-max')?.addEventListener('click', () => setProcessMax());
    document.getElementById('btn-execute-process')?.addEventListener('click', () => executeProcessFuel());
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

// ==================== Ship Template Editor (AR-17) ====================

// Ship editor state
const shipEditor = {
  shipId: null,
  templateId: null,
  editData: null,
  weapons: [],
  systems: []
};

/**
 * Open ship editor for existing ship or new custom ship
 * @param {string|null} shipId - Existing ship ID or null for new
 */
function openShipEditor(shipId = null) {
  shipEditor.shipId = shipId;
  shipEditor.editData = null;
  shipEditor.weapons = [];
  shipEditor.systems = [];

  // Load templates if not already loaded
  state.socket.emit('ops:getShipTemplates');

  // If editing existing ship, load its data
  if (shipId) {
    const ship = state.ships.find(s => s.id === shipId);
    if (ship) {
      shipEditor.editData = JSON.parse(JSON.stringify(ship.ship_data || {}));
      shipEditor.templateId = ship.template_id;
      shipEditor.weapons = shipEditor.editData.weapons || [];
      shipEditor.systems = shipEditor.editData.systems || [];
    }
  }

  showModal('template-edit-ship');
}

/**
 * Populate ship editor with data
 */
function populateShipEditor() {
  const select = document.getElementById('edit-ship-template');
  if (!select) return;

  // Populate template dropdown
  if (!state.shipTemplates || state.shipTemplates.length === 0) {
    select.innerHTML = '<option value="">No templates available</option>';
  } else {
    // Group by tonnage
    const byTonnage = {};
    state.shipTemplates.forEach(t => {
      const key = t.tonnage;
      if (!byTonnage[key]) byTonnage[key] = [];
      byTonnage[key].push(t);
    });

    select.innerHTML = '<option value="">-- Select Base Template --</option>' +
      Object.keys(byTonnage)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(tonnage => {
          const ships = byTonnage[tonnage];
          return ships.map(t =>
            `<option value="${t.id}" ${shipEditor.templateId === t.id ? 'selected' : ''}>
              ${t.name} (${t.tonnage}t, J-${t.jump || 0})
            </option>`
          ).join('');
        }).join('');
  }

  // If editing existing ship, populate name
  if (shipEditor.shipId) {
    const ship = state.ships.find(s => s.id === shipEditor.shipId);
    if (ship) {
      document.getElementById('edit-ship-name').value = ship.name;
    }
  }

  // If we have editData, populate all fields
  if (shipEditor.editData) {
    populateEditorFields(shipEditor.editData);
  }
}

/**
 * Populate all editor fields from ship data
 * @param {Object} data - Ship data object
 */
function populateEditorFields(data) {
  // Hull tab
  document.getElementById('edit-hull-tonnage').value = data.tonnage || data.hull?.tonnage || 100;
  document.getElementById('edit-hull-config').value = data.hull?.configuration || 'standard';
  document.getElementById('edit-hull-points').value = data.hull?.hullPoints || data.hullPoints || 40;
  document.getElementById('edit-armor-rating').value = data.armour?.rating || data.armourRating || 0;
  document.getElementById('edit-armor-type').value = data.armour?.type || 'none';

  // Drives tab
  document.getElementById('edit-mdrive-thrust').value = data.drives?.manoeuvre?.thrust || data.thrust || 1;
  document.getElementById('edit-jdrive-rating').value = data.drives?.jump?.rating || data.jump || 0;
  document.getElementById('edit-power-output').value = data.power?.output || 50;
  document.getElementById('edit-fuel-capacity').value = data.fuel?.total || 20;
  document.getElementById('edit-computer').value = data.computer?.processing || 1;
  document.getElementById('edit-sensors').value = data.sensors?.grade || 'civilian';

  // Cargo tab
  document.getElementById('edit-cargo-tonnage').value = data.cargo?.tonnage || 0;
  document.getElementById('edit-staterooms').value = data.staterooms?.standard?.count || 0;
  document.getElementById('edit-low-berths').value = data.staterooms?.lowBerths?.count || 0;
  document.getElementById('edit-common-areas').value = data.commonAreas?.tonnage || 0;

  // Weapons and systems
  shipEditor.weapons = data.weapons || [];
  shipEditor.systems = data.systems || [];
  renderWeaponsList();
  renderSystemsList();

  // Update validation
  updateValidationSummary();
}

/**
 * Load full template data when selection changes
 * @param {string} templateId - Template ID
 */
function loadTemplateForEditor(templateId) {
  if (!templateId) {
    shipEditor.templateId = null;
    shipEditor.editData = null;
    document.getElementById('edit-template-preview').innerHTML = '';
    return;
  }

  shipEditor.templateId = templateId;
  state.socket.emit('ops:getFullTemplate', { templateId });
}

/**
 * Render weapons list in editor
 */
function renderWeaponsList() {
  const container = document.getElementById('edit-weapons-list');
  if (!container) return;

  const weaponNames = {
    pulse_laser: 'Pulse Laser',
    beam_laser: 'Beam Laser',
    sandcaster: 'Sandcaster',
    missile_rack: 'Missile Rack',
    particle_beam: 'Particle Beam'
  };

  const mountNames = {
    turret_single: 'Single Turret',
    turret_double: 'Double Turret',
    turret_triple: 'Triple Turret',
    barbette: 'Barbette',
    bay: 'Bay'
  };

  if (shipEditor.weapons.length === 0) {
    container.innerHTML = '<p class="placeholder">No weapons installed</p>';
    return;
  }

  container.innerHTML = shipEditor.weapons.map((w, idx) => `
    <div class="weapon-item">
      <div class="weapon-info">
        <span class="weapon-name">${weaponNames[w.type] || w.type || w.name || 'Unknown'}</span>
        <span class="weapon-mount">${mountNames[w.mount] || w.mount || ''}</span>
      </div>
      <button class="btn-remove" data-remove-weapon="${idx}">Remove</button>
    </div>
  `).join('');

  // Add remove handlers
  container.querySelectorAll('[data-remove-weapon]').forEach(btn => {
    btn.addEventListener('click', () => {
      shipEditor.weapons.splice(parseInt(btn.dataset.removeWeapon), 1);
      renderWeaponsList();
      updateValidationSummary();
    });
  });
}

/**
 * Render systems list in editor
 */
function renderSystemsList() {
  const container = document.getElementById('edit-systems-list');
  if (!container) return;

  const systemNames = {
    fuel_processor: 'Fuel Processor',
    fuel_scoops: 'Fuel Scoops',
    cargo_crane: 'Cargo Crane',
    repair_drones: 'Repair Drones',
    probe_drones: 'Probe Drones',
    medical_bay: 'Medical Bay',
    workshop: 'Workshop'
  };

  if (shipEditor.systems.length === 0) {
    container.innerHTML = '<p class="placeholder">No additional systems</p>';
    return;
  }

  container.innerHTML = shipEditor.systems.map((s, idx) => `
    <div class="system-item">
      <div class="system-info">
        <span class="system-name">${systemNames[s.type] || s.type || 'Unknown'}</span>
        <span class="system-detail">${s.tonnage ? s.tonnage + 't' : ''}</span>
      </div>
      <button class="btn-remove" data-remove-system="${idx}">Remove</button>
    </div>
  `).join('');

  // Add remove handlers
  container.querySelectorAll('[data-remove-system]').forEach(btn => {
    btn.addEventListener('click', () => {
      shipEditor.systems.splice(parseInt(btn.dataset.removeSystem), 1);
      renderSystemsList();
      updateValidationSummary();
    });
  });
}

/**
 * Add weapon from selectors
 */
function addWeaponToEditor() {
  const type = document.getElementById('edit-weapon-type').value;
  const mount = document.getElementById('edit-weapon-mount').value;

  shipEditor.weapons.push({ type, mount });
  renderWeaponsList();
  updateValidationSummary();
}

/**
 * Add system from selector
 */
function addSystemToEditor() {
  const type = document.getElementById('edit-system-type').value;

  // Default tonnage by system type
  const tonnages = {
    fuel_processor: 1,
    fuel_scoops: 0,
    cargo_crane: 3,
    repair_drones: 1,
    probe_drones: 1,
    medical_bay: 4,
    workshop: 6
  };

  shipEditor.systems.push({ type, tonnage: tonnages[type] || 1 });
  renderSystemsList();
  updateValidationSummary();
}

/**
 * Update validation summary panel
 */
function updateValidationSummary() {
  const container = document.getElementById('edit-validation-summary');
  if (!container) return;

  const tonnage = parseInt(document.getElementById('edit-hull-tonnage')?.value) || 100;

  // Calculate used tonnage
  let usedTonnage = 0;

  // Hull components (rough estimates)
  const mdrive = parseInt(document.getElementById('edit-mdrive-thrust')?.value) || 0;
  const jdrive = parseInt(document.getElementById('edit-jdrive-rating')?.value) || 0;
  const fuel = parseInt(document.getElementById('edit-fuel-capacity')?.value) || 0;
  const cargo = parseInt(document.getElementById('edit-cargo-tonnage')?.value) || 0;
  const staterooms = parseInt(document.getElementById('edit-staterooms')?.value) || 0;
  const lowBerths = parseInt(document.getElementById('edit-low-berths')?.value) || 0;
  const common = parseInt(document.getElementById('edit-common-areas')?.value) || 0;

  // Drive tonnage estimates (% of hull per G/J)
  usedTonnage += (tonnage * mdrive * 0.01); // M-drive
  usedTonnage += (tonnage * jdrive * 0.05); // J-drive
  usedTonnage += fuel; // Fuel
  usedTonnage += 10; // Bridge (fixed)
  usedTonnage += cargo;
  usedTonnage += staterooms * 4; // 4t per stateroom
  usedTonnage += lowBerths * 0.5; // 0.5t per low berth
  usedTonnage += common;

  // Systems tonnage
  shipEditor.systems.forEach(s => {
    usedTonnage += s.tonnage || 0;
  });

  // Weapons tonnage (1t per turret, rough)
  shipEditor.weapons.forEach(() => {
    usedTonnage += 1;
  });

  const tonnagePercent = Math.min((usedTonnage / tonnage) * 100, 100);
  const tonnageClass = tonnagePercent > 100 ? 'error' : tonnagePercent > 90 ? 'warning' : '';

  // Power calculation
  const powerOutput = parseInt(document.getElementById('edit-power-output')?.value) || 50;
  const powerUsed = 20 + (mdrive * 10) + (jdrive * 10) + (shipEditor.weapons.length * 5);
  const powerPercent = Math.min((powerUsed / powerOutput) * 100, 100);
  const powerClass = powerUsed > powerOutput ? 'error' : powerUsed > powerOutput * 0.9 ? 'warning' : '';

  const errors = [];
  if (usedTonnage > tonnage) {
    errors.push(`Tonnage exceeded: ${Math.round(usedTonnage)}t used of ${tonnage}t available`);
  }
  if (powerUsed > powerOutput) {
    errors.push(`Power exceeded: ${powerUsed} used of ${powerOutput} available`);
  }

  container.innerHTML = `
    <div class="tonnage-bar">
      <span class="tonnage-text">Tonnage: ${Math.round(usedTonnage)}/${tonnage}t</span>
      <div class="bar">
        <div class="bar-fill ${tonnageClass}" style="width: ${tonnagePercent}%"></div>
      </div>
    </div>
    <div class="power-bar">
      <span class="power-text">Power: ${powerUsed}/${powerOutput}</span>
      <div class="bar">
        <div class="bar-fill ${powerClass}" style="width: ${powerPercent}%"></div>
      </div>
    </div>
    ${errors.length > 0 ? `
      <div class="validation-errors">
        ${errors.map(e => `<div class="validation-error">${e}</div>`).join('')}
      </div>
    ` : ''}
  `;

  return errors.length === 0;
}

/**
 * Collect editor data into ship object
 * @returns {Object} Ship data object
 */
function collectEditorData() {
  return {
    tonnage: parseInt(document.getElementById('edit-hull-tonnage').value) || 100,
    thrust: parseInt(document.getElementById('edit-mdrive-thrust').value) || 1,
    jump: parseInt(document.getElementById('edit-jdrive-rating').value) || 0,
    hull: {
      tonnage: parseInt(document.getElementById('edit-hull-tonnage').value) || 100,
      configuration: document.getElementById('edit-hull-config').value || 'standard',
      hullPoints: parseInt(document.getElementById('edit-hull-points').value) || 40
    },
    armour: {
      type: document.getElementById('edit-armor-type').value || 'none',
      rating: parseInt(document.getElementById('edit-armor-rating').value) || 0
    },
    drives: {
      manoeuvre: {
        thrust: parseInt(document.getElementById('edit-mdrive-thrust').value) || 1
      },
      jump: {
        rating: parseInt(document.getElementById('edit-jdrive-rating').value) || 0
      }
    },
    power: {
      output: parseInt(document.getElementById('edit-power-output').value) || 50
    },
    fuel: {
      total: parseInt(document.getElementById('edit-fuel-capacity').value) || 20
    },
    computer: {
      processing: parseInt(document.getElementById('edit-computer').value) || 1
    },
    sensors: {
      grade: document.getElementById('edit-sensors').value || 'civilian'
    },
    weapons: shipEditor.weapons,
    systems: shipEditor.systems,
    cargo: {
      tonnage: parseInt(document.getElementById('edit-cargo-tonnage').value) || 0
    },
    staterooms: {
      standard: { count: parseInt(document.getElementById('edit-staterooms').value) || 0 },
      lowBerths: { count: parseInt(document.getElementById('edit-low-berths').value) || 0 }
    },
    commonAreas: {
      tonnage: parseInt(document.getElementById('edit-common-areas').value) || 0
    }
  };
}

/**
 * Save edited ship
 */
function saveEditedShip() {
  const name = document.getElementById('edit-ship-name').value.trim();
  if (!name) {
    showNotification('Please enter a ship name', 'error');
    return;
  }

  if (!updateValidationSummary()) {
    if (!confirm('Ship configuration has validation errors. Save anyway?')) {
      return;
    }
  }

  const shipData = collectEditorData();

  if (shipEditor.shipId) {
    // Update existing ship
    state.socket.emit('ops:updateShip', {
      shipId: shipEditor.shipId,
      name,
      shipData
    });
  } else {
    // Create new custom ship
    state.socket.emit('ops:addCustomShip', {
      name,
      templateId: shipEditor.templateId,
      shipData,
      isPartyShip: true
    });
  }
}

/**
 * Switch editor tab
 * @param {string} tabId - Tab ID
 */
function switchEditorTab(tabId) {
  // Update tab buttons
  document.querySelectorAll('.editor-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Update panels
  document.querySelectorAll('.editor-panel').forEach(panel => {
    panel.classList.toggle('hidden', !panel.id.endsWith(tabId));
  });
}

function addContact(contactData) {
  state.socket.emit('ops:addContact', contactData);
}

// Combat contact functions - delegated to combat module (Autorun 14)
function showAddCombatContactModal() { combat.showAddCombatContactModal(state); }
function submitCombatContact() { combat.submitCombatContact(state); }
function renderCombatContactsList() { combat.renderCombatContactsList(state); }
function toggleWeaponsFree(contactId) { combat.toggleWeaponsFree(state, contactId); }
function removeCombatContact(contactId) { combat.removeCombatContact(state, contactId); }

function applySystemDamage(system, severity) {
  state.socket.emit('ops:applySystemDamage', {
    shipId: state.shipId,
    location: system,
    severity
  });
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ==================== Utilities (imported from modules/utils.js) ====================

// Parse character text (client-side version of lib/operations/characters.js parsers)
// AR-103 Phase 4: parseCharacterText, parseUPP, parseSkills moved to modules/helpers.js

// ==================== SHIP-6: ASCII Art (imported from modules/ascii-art.js) ====================

// ==================== TIP-3: UWP Decoder (imported from modules/uwp-decoder.js) ====================

// ==================== Stage 7: Character Tooltip (imported from modules/tooltips.js) ====================

// AR-103 Phase 5: getRoleConfig moved to modules/helpers.js

// AR-151-2b: Ship Status Modal moved to modules/ship-status-modal.js

// AR-103 Phase 7: formatWeaponName, formatTurretType, formatShipWeapons moved to modules/helpers.js

// AR-103: formatPopulation, interpretUWP moved to modules/helpers.js

// ==================== Contact Tooltip (TIP-1) ====================

// Factory function for star-specific popup content
function getStarPopupContent(contact) {
  let content = '';

  // Stellar class (always show for stars)
  if (contact.stellar_class) {
    content += `
      <div class="tooltip-row star-info">
        <span class="label">Spectral Type:</span>
        <span class="value">${escapeHtml(contact.stellar_class)}</span>
      </div>
    `;
  }

  // Parse stellar_info if it's JSON, or use individual fields
  let starInfo = {};
  if (contact.stellar_info) {
    try {
      starInfo = typeof contact.stellar_info === 'string'
        ? JSON.parse(contact.stellar_info)
        : contact.stellar_info;
    } catch (e) {
      debugWarn('Failed to parse stellar_info:', e);
    }
  }

  // Temperature
  if (starInfo.temperature || contact.temperature) {
    content += `
      <div class="tooltip-row star-info">
        <span class="label">Temperature:</span>
        <span class="value">${escapeHtml(starInfo.temperature || contact.temperature)}</span>
      </div>
    `;
  }

  // Luminosity
  if (starInfo.luminosity || contact.luminosity) {
    content += `
      <div class="tooltip-row star-info">
        <span class="label">Luminosity:</span>
        <span class="value">${escapeHtml(starInfo.luminosity || contact.luminosity)}</span>
      </div>
    `;
  }

  // Mass
  if (starInfo.mass || contact.mass) {
    content += `
      <div class="tooltip-row star-info">
        <span class="label">Mass:</span>
        <span class="value">${escapeHtml(starInfo.mass || contact.mass)}</span>
      </div>
    `;
  }

  // Habitable zone
  if (starInfo.habitableZone || contact.habitable_zone) {
    content += `
      <div class="tooltip-row star-info">
        <span class="label">Habitable Zone:</span>
        <span class="value">${escapeHtml(starInfo.habitableZone || contact.habitable_zone)}</span>
      </div>
    `;
  }

  // Description
  if (starInfo.description || contact.star_description) {
    content += `
      <div class="tooltip-description star-description">
        ${escapeHtml(starInfo.description || contact.star_description)}
      </div>
    `;
  }

  return content;
}

// Factory function for ship-specific popup content
function getShipPopupContent(contact) {
  let content = '';

  if (contact.tonnage) {
    content += `
      <div class="tooltip-row ship-info">
        <span class="label">Tonnage:</span>
        <span class="value">${contact.tonnage} dT</span>
      </div>
    `;
  }

  if (contact.crew_count) {
    content += `
      <div class="tooltip-row ship-info">
        <span class="label">Crew:</span>
        <span class="value">${contact.crew_count}</span>
      </div>
    `;
  }

  return content;
}

// Factory function for station-specific popup content
function getStationPopupContent(contact) {
  let content = '';

  if (contact.population) {
    content += `
      <div class="tooltip-row station-info">
        <span class="label">Population:</span>
        <span class="value">${contact.population}</span>
      </div>
    `;
  }

  if (contact.services) {
    const services = typeof contact.services === 'string'
      ? JSON.parse(contact.services)
      : contact.services;
    if (services && services.length) {
      content += `
        <div class="tooltip-row station-info">
          <span class="label">Services:</span>
          <span class="value">${escapeHtml(services.join(', '))}</span>
        </div>
      `;
    }
  }

  return content;
}

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

  // Stellar info for stars (Factory pattern - star-specific content)
  if (contact.stellar_class || contact.type === 'star') {
    content += getStarPopupContent(contact);
  }

  // Ship-specific info (Factory pattern)
  if (contact.type === 'ship' || contact.type === 'vessel' || contact.tonnage) {
    content += getShipPopupContent(contact);
  }

  // Station-specific info (Factory pattern)
  if (contact.type === 'station' || contact.type === 'starport' || contact.type === 'orbital') {
    content += getStationPopupContent(contact);
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

  // Hail button for ships/stations with transponders (Captain or Sensor Operator)
  const canHail = (state.selectedRole === 'captain' || state.selectedRole === 'sensor_operator' || state.isGM);
  const isHailable = contact.transponder && contact.transponder !== 'NONE' &&
    (contact.type === 'Free Trader' || contact.type === 'Far Trader' ||
     contact.type === 'Station' || contact.type === 'starport' || contact.type === 'Starport' ||
     contact.type === 'orbital' || contact.type === 'System Defense Boat' ||
     contact.type?.toLowerCase().includes('ship') || contact.type?.toLowerCase().includes('trader') ||
     contact.type?.toLowerCase().includes('station') || contact.transponder?.toLowerCase().includes('starport'));

  if (canHail && isHailable) {
    content += `
      <div class="tooltip-actions">
        <button class="btn btn-primary btn-hail" onclick="window.hailContact('${contactId}')">
          📡 Hail ${contact.transponder}
        </button>
      </div>
    `;
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

/**
 * AR-70: Scan a contact (targeted sensor scan)
 * @param {string} contactId - Contact ID to scan
 * @param {string} scanType - 'passive', 'active', or 'deep'
 */
function scanContact(contactId, scanType = 'active') {
  const contact = state.contacts.find(c => c.id === contactId);
  if (!contact) {
    showNotification('Contact not found', 'error');
    return;
  }

  // Emit scan event to server
  state.socket.emit('ops:scanContact', { contactId, scanType });
  showNotification(`Initiating ${scanType} scan...`, 'info');
}

/**
 * Hail a contact (ship/station)
 * Creates comms log entry and may create NPC contact if they respond
 * @param {string} contactId - Contact ID to hail
 */
function hailContact(contactId) {
  const contact = state.contacts.find(c => c.id === contactId);
  if (!contact) {
    showNotification('Contact not found', 'error');
    return;
  }

  if (!contact.transponder || contact.transponder === 'NONE') {
    showNotification('Cannot hail - no transponder signal', 'error');
    return;
  }

  // Emit hail event to server
  state.socket.emit('ops:hailContact', { contactId });

  // Close tooltip
  hideContactTooltip();
}

/**
 * Hail selected contact from Captain panel dropdown
 */
function hailSelectedContact() {
  const select = document.getElementById('hail-contact-select');
  if (!select || !select.value) {
    showNotification('No contact selected', 'warning');
    return;
  }
  hailContact(select.value);
}

/**
 * Broadcast message to all contacts
 */
function broadcastMessage() {
  const messageInput = document.getElementById('comms-message-input');
  const message = messageInput?.value?.trim();

  if (!message) {
    showNotification('Enter a message to broadcast', 'warning');
    return;
  }

  state.socket.emit('ops:broadcastMessage', { message });
  messageInput.value = '';
  showNotification('Broadcast sent', 'info');
}

/**
 * Send message to selected contact
 */
function sendCommsMessage() {
  const select = document.getElementById('hail-contact-select');
  const messageInput = document.getElementById('comms-message-input');

  if (!select || !select.value) {
    showNotification('No contact selected', 'warning');
    return;
  }

  const message = messageInput?.value?.trim();
  if (!message) {
    showNotification('Enter a message to send', 'warning');
    return;
  }

  const contact = state.contacts.find(c => c.id === select.value);
  const contactName = contact?.transponder || contact?.name || 'Unknown';

  state.socket.emit('ops:sendMessage', {
    contactId: select.value,
    message
  });

  messageInput.value = '';
  showNotification(`Message sent to ${contactName}`, 'info');
}

// AR-151e: Bridge Chat System moved to modules/bridge-chat.js

// ============================================
// Panel Copy Functions (for debugging)
// ============================================

/**
 * Copy ship log to clipboard as formatted text
 */
function copyShipLog() {
  const logEl = document.getElementById('ship-log');
  if (!logEl) {
    showNotification('Ship log not found', 'error');
    return;
  }

  const entries = logEl.querySelectorAll('.log-entry');
  const lines = [];

  lines.push('=== SHIP LOG ===');
  lines.push(`Copied: ${new Date().toISOString()}`);
  lines.push('');

  entries.forEach(entry => {
    const time = entry.querySelector('.log-time')?.textContent || '';
    const type = entry.querySelector('.log-type')?.textContent || '';
    const msg = entry.querySelector('.log-message')?.textContent || '';
    lines.push(`[${time}] [${type}] ${msg}`);
  });

  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => showNotification('Ship log copied', 'success'))
    .catch(() => showNotification('Copy failed', 'error'));
}

/**
 * Copy sensor panel contacts to clipboard
 */
function copySensorPanel() {
  const contacts = state.contacts || [];
  const lines = [];

  lines.push('=== SENSOR CONTACTS ===');
  lines.push(`Copied: ${new Date().toISOString()}`);
  lines.push(`Total: ${contacts.length}`);
  lines.push('');

  contacts.forEach(c => {
    lines.push(`[${c.id?.slice(0,8)}] ${c.transponder || c.name || 'Unknown'}`);
    lines.push(`  Type: ${c.type || '?'} | Range: ${c.range_band || '?'} | Bearing: ${c.bearing || 0}°`);
    lines.push(`  Marking: ${c.marking || 'unknown'} | Scan: ${c.scan_level || 0}`);
    lines.push('');
  });

  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => showNotification('Sensor data copied', 'success'))
    .catch(() => showNotification('Copy failed', 'error'));
}

/**
 * Copy current role panel state to clipboard
 */
function copyRolePanel() {
  const rolePanel = document.getElementById('role-panel-content');
  if (!rolePanel) {
    showNotification('Role panel not found', 'error');
    return;
  }

  const lines = [];
  lines.push('=== ROLE PANEL ===');
  lines.push(`Role: ${state.selectedRole || 'none'}`);
  lines.push(`Copied: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(rolePanel.innerText);

  navigator.clipboard.writeText(lines.join('\n'))
    .then(() => showNotification('Role panel copied', 'success'))
    .catch(() => showNotification('Copy failed', 'error'));
}

// AR-103: showNotification, getNotificationContainer moved to modules/notifications.js

// AR-103 Phase 8: Session storage moved to modules/session-storage.js
// Functions available via window: getStoredSession, clearStoredSession, saveSessionData

function saveSession() {
  // Wrapper that extracts data from state and calls the module function
  const sessionData = {
    campaignId: state.campaign?.id,
    accountId: state.player?.id,
    shipId: state.selectedShipId || state.ship?.id,
    role: state.selectedRole,
    isGM: state.isGM
  };
  saveSessionData(sessionData);
}

function tryReconnect() {
  const session = getStoredSession();
  if (session && session.campaignId) {
    debugLog('Attempting to reconnect to session:', session);
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
  initEmailAppHandlers();

  // AR-101: Fetch and display version
  fetch('/api/version')
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById('app-version');
      if (el) el.textContent = `v${data.version}`;
    })
    .catch(() => {}); // Silently fail if version unavailable

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

  // AR-108.1: Event listeners for migrated inline handlers (CSP compliance)
  document.getElementById('btn-copy-log')?.addEventListener('click', () => window.copyShipLog());
  document.getElementById('btn-subsector-map')?.addEventListener('click', () => toggleSectorMap());
  document.getElementById('menu-library')?.addEventListener('click', () => showLibraryComputer());
  document.getElementById('menu-ship-config')?.addEventListener('click', () => showShipConfiguration());
  document.getElementById('menu-crew-roster')?.addEventListener('click', () => showCrewRosterMenu());
  document.getElementById('menu-medical')?.addEventListener('click', () => showMedicalRecords());

  // Sector map controls
  document.getElementById('btn-sector-zoom-in')?.addEventListener('click', () => zoomSectorMap(1.2));
  document.getElementById('btn-sector-zoom-out')?.addEventListener('click', () => zoomSectorMap(0.8));
  document.getElementById('btn-sector-zoom-reset')?.addEventListener('click', () => resetSectorZoom());
  document.getElementById('btn-sector-map-close')?.addEventListener('click', () => hideSectorMap());

  // System map controls
  document.getElementById('btn-system-zoom-in')?.addEventListener('click', () => zoomSystemMap(1.3));
  document.getElementById('btn-system-zoom-out')?.addEventListener('click', () => zoomSystemMap(0.7));
  document.getElementById('btn-system-reset-view')?.addEventListener('click', () => resetSystemMapView());
  document.getElementById('btn-system-toggle-labels')?.addEventListener('click', () => toggleSystemMapLabels());
  document.getElementById('snap-to-now-btn')?.addEventListener('click', () => snapToNow());
  document.getElementById('btn-system-map-close')?.addEventListener('click', () => hideSystemMap());

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

  // AR-15.1: Initialize tooltip strategy system
  tooltipStrategy.init();

  // AR-16.4: Event delegation for crew list buttons (security - avoid inline onclick)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const accountId = btn.dataset.accountId;
    const name = btn.dataset.name;
    const role = btn.dataset.role;

    if (action === 'relieve' && accountId && name && role) {
      relieveCrewMember(accountId, name, role);
    } else if (action === 'assign' && accountId && name) {
      gmAssignRole(accountId, name);
    }
  });
});

// ==================== Hamburger Menu (Autorun 6) ====================

function openHamburgerMenu() {
  const menu = document.getElementById('hamburger-menu');
  const overlay = document.getElementById('hamburger-menu-overlay');
  if (menu) {
    menu.classList.add('open');
    overlay?.classList.remove('hidden');
    overlay?.classList.add('visible');

    // Initialize settings from localStorage
    const animateCameraCheckbox = document.getElementById('setting-animate-camera');
    if (animateCameraCheckbox) {
      animateCameraCheckbox.checked = localStorage.getItem('ops-setting-animate-camera') !== 'false';
      animateCameraCheckbox.onchange = (e) => {
        localStorage.setItem('ops-setting-animate-camera', e.target.checked ? 'true' : 'false');
      };
    }
  }
}

function closeHamburgerMenu() {
  const menu = document.getElementById('hamburger-menu');
  const overlay = document.getElementById('hamburger-menu-overlay');
  if (menu) {
    menu.classList.remove('open');
    overlay?.classList.add('hidden');
    overlay?.classList.remove('visible');
  }
}

function handleMenuFeature(feature) {
  closeHamburgerMenu();

  switch (feature) {
    case 'ship-log':
      // Ship log is already implemented - show it in a modal
      if (state.logs && state.logs.length > 0) {
        showLogModal();
      } else {
        showNotification('No log entries yet', 'info');
      }
      break;

    case 'mail':
      // Request mail from server
      state.socket.emit('ops:getMail');
      showNotification('Loading mail...', 'info');
      break;

    case 'contacts':
      // Request NPC contacts from server
      state.socket.emit('ops:getNPCContacts');
      showNotification('Loading contacts...', 'info');
      break;

    case 'ship-config':
      showNotification('Ship Configuration - Planned for Autorun 7', 'info');
      break;

    case 'cargo':
      showNotification('Cargo Manifest - Planned feature', 'info');
      break;

    case 'finances':
      showNotification('Ship Finances - Planned feature', 'info');
      break;

    case 'crew-roster':
      showCrewRoster();
      break;

    case 'medical':
      showMedicalRecords();
      break;

    case 'library':
      showNotification('Ship\'s Library - Planned feature', 'info');
      break;

    case 'feedback':
      if (state.isGM) {
        showFeedbackReview();
      } else {
        showFeedbackForm();
      }
      break;

    case 'shared-map':
      showSharedMap();
      break;

    case 'system-map':
      showSystemMap();
      break;

    default:
      showNotification(`Feature "${feature}" not yet implemented`, 'info');
  }
}

function showLogModal() {
  const logs = state.logs || [];
  const recentLogs = logs.slice(-50); // Show last 50 entries

  let html = `
    <div class="modal-header">
      <h2>Ship Log</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body log-modal-body">
      <div class="log-entries">
  `;

  if (recentLogs.length === 0) {
    html += '<p class="text-muted">No log entries recorded.</p>';
  } else {
    for (const log of recentLogs.reverse()) {
      const typeClass = log.entry_type === 'sensor' ? 'sensor' :
                       log.entry_type === 'combat' ? 'combat' :
                       log.entry_type === 'navigation' ? 'navigation' : '';
      html += `
        <div class="log-entry ${typeClass}">
          <span class="log-timestamp">${log.game_date || ''} ${log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}</span>
          <span class="log-type">[${log.entry_type || 'system'}]</span>
          <span class="log-message">${log.message}</span>
          ${log.actor ? `<span class="log-actor">- ${log.actor}</span>` : ''}
        </div>
      `;
    }
  }

  html += `
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close-modal>Close</button>
    </div>
  `;

  const modalContent = document.getElementById('modal-content');
  const modalOverlay = document.getElementById('modal-overlay');
  modalContent.innerHTML = html;
  modalOverlay.classList.remove('hidden');

  // Setup close handlers
  modalContent.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => modalOverlay.classList.add('hidden'));
  });
}

// AR-151-2c: Mail Modal moved to modules/mail-modal.js

// ==================== AR-27: Shared Map ====================

// Shared map state
state.sharedMapActive = false;
state.sharedMapView = null;

// AR-50.1: Shared map settings
state.sharedMapSettings = {
  scale: 64,       // Pixels per parsec (zoom level)
  style: 'poster'  // Map style
};

// AR-50.2: Track GM's current map view for re-center
// This is updated when GM opens map and when receiving map click events
state.gmCurrentMapView = null;

function showSharedMap() {
  // Create fullscreen map overlay with interactive TravellerMap iframe
  const existing = document.getElementById('shared-map-overlay');
  if (existing) {
    existing.classList.remove('hidden');
    // If player and shared view exists, sync to GM's view
    if (!state.isGM && state.sharedMapView) {
      updateSharedMapFrame(state.sharedMapView);
    } else {
      updateSharedMapIframe();
      // AR-50.2: Track GM's current view when opening map
      if (state.isGM) {
        trackGMMapView();
      }
    }
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'shared-map-overlay';
  overlay.className = 'shared-map-overlay';

  // AR-50.2: Use shared view data if available (for players), else use campaign data
  let sector, hex, systemName;
  if (!state.isGM && state.sharedMapView) {
    sector = state.sharedMapView.sector || DEFAULT_SECTOR;
    hex = state.sharedMapView.hex || DEFAULT_HEX;
    systemName = state.sharedMapView.center || 'Unknown';
  } else {
    sector = state.campaign?.current_sector || DEFAULT_SECTOR;
    hex = state.campaign?.current_hex || DEFAULT_HEX;
    systemName = state.campaign?.current_system || DEFAULT_SYSTEM;
  }

  overlay.innerHTML = `
    <div class="shared-map-header">
      <h2>Shared Map${state.sharedMapActive ? ' <span class="live-badge">LIVE</span>' : ''}</h2>
      <div class="shared-map-controls" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <span id="map-location-display" style="color: #888; font-size: 12px;">Centered on: <strong>${systemName}</strong> (${hex})</span>
        ${state.isGM ? `
          <div style="display: flex; gap: 4px; align-items: center;">
            <input type="text" id="map-hex-input" placeholder="Hex (e.g. 0404)" style="width: 100px; padding: 4px 8px; font-size: 12px; border-radius: 4px; border: 1px solid #444; background: #333; color: #fff;" value="${hex}">
            <button id="btn-goto-hex" class="btn btn-secondary btn-small" title="Navigate to hex and track for re-center">Go</button>
          </div>
          <button id="btn-share-map" class="btn btn-primary ${state.sharedMapActive ? 'hidden' : ''}">Share with Players</button>
          <button id="btn-recenter-players" class="btn btn-secondary ${state.sharedMapActive ? '' : 'hidden'}" title="Sync all players to tracked location">Re-center Players</button>
          <button id="btn-unshare-map" class="btn btn-danger ${state.sharedMapActive ? '' : 'hidden'}">Stop Sharing</button>
        ` : ''}
        <button id="btn-close-map" class="btn btn-secondary">Close</button>
      </div>
    </div>
    <div class="shared-map-container" id="shared-sector-map-container" style="flex: 1; position: relative; overflow: hidden; background: #000;">
      <iframe
        id="shared-map-iframe"
        src="${buildTravellerMapUrl(sector, hex)}"
        style="width: 100%; height: 100%; border: none;"
        allowfullscreen
      ></iframe>
    </div>
    <div class="shared-map-footer" style="padding: 8px 16px; background: rgba(0,0,0,0.5); display: flex; gap: 16px; align-items: center;">
      <span style="color: #aaa;">Drag to pan | Scroll to zoom | Double-click to zoom in</span>
      <span style="color: #666; margin-left: auto;">Powered by travellermap.com</span>
    </div>
  `;

  document.body.appendChild(overlay);

  // Event handlers
  document.getElementById('btn-close-map').addEventListener('click', closeSharedMap);

  if (state.isGM) {
    // AR-50.2: Go to hex button - navigates iframe and tracks location
    document.getElementById('btn-goto-hex')?.addEventListener('click', () => {
      const hexInput = document.getElementById('map-hex-input');
      const hex = hexInput?.value?.trim();
      if (!hex || !/^\d{4}$/.test(hex)) {
        showNotification('Enter a valid hex (e.g. 0404)', 'warning');
        return;
      }
      const sector = state.campaign?.current_sector || 'Spinward Marches';
      navigateToHex(sector, hex);
    });

    // Also allow Enter key in hex input
    document.getElementById('map-hex-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('btn-goto-hex')?.click();
      }
    });

    document.getElementById('btn-share-map')?.addEventListener('click', () => {
      // Share using tracked view if available
      const view = state.gmCurrentMapView || {
        center: state.campaign?.current_system,
        sector: state.campaign?.current_sector,
        hex: state.campaign?.current_hex
      };
      state.socket.emit('ops:shareMap', {
        center: view.center,
        sector: view.sector,
        hex: view.hex,
        scale: state.sharedMapSettings.scale,
        style: state.sharedMapSettings.style
      });
    });

    // AR-50.2: Re-center players button - broadcasts GM's current view to all players
    document.getElementById('btn-recenter-players')?.addEventListener('click', () => {
      // Use GM's tracked view if available, fallback to campaign data
      const view = state.gmCurrentMapView || {
        center: state.campaign?.current_system,
        sector: state.campaign?.current_sector,
        hex: state.campaign?.current_hex
      };
      state.socket.emit('ops:updateMapView', {
        center: view.center,
        sector: view.sector,
        hex: view.hex,
        scale: state.sharedMapSettings.scale,
        style: state.sharedMapSettings.style
      });
      showNotification('Players re-centered to current location', 'info');
    });

    document.getElementById('btn-unshare-map')?.addEventListener('click', () => {
      state.socket.emit('ops:unshareMap');
    });
  }
}

// AR-50.1: Build TravellerMap URL for iframe
function buildTravellerMapUrl(sector, hex) {
  const { scale, style } = state.sharedMapSettings;
  const params = new URLSearchParams({
    sector: sector,
    hex: hex,
    scale: scale,
    style: style
  });
  return `https://travellermap.com/?${params.toString()}`;
}

// AR-50.1: Update iframe src when location changes
function updateSharedMapIframe() {
  const iframe = document.getElementById('shared-map-iframe');
  if (!iframe) return;

  const sector = state.campaign?.current_sector || DEFAULT_SECTOR;
  const hex = state.campaign?.current_hex || DEFAULT_HEX;
  iframe.src = buildTravellerMapUrl(sector, hex);

  // Update header text
  const header = document.querySelector('.shared-map-controls span');
  if (header) {
    const systemName = state.campaign?.current_system || 'Unknown';
    header.innerHTML = `Centered on: <strong>${systemName}</strong> (${hex})`;
  }
}

function closeSharedMap() {
  const overlay = document.getElementById('shared-map-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

// AR-50.2: Track GM's current view for re-center functionality
function trackGMMapView() {
  const sector = state.campaign?.current_sector || DEFAULT_SECTOR;
  const hex = state.campaign?.current_hex || DEFAULT_HEX;
  const systemName = state.campaign?.current_system || DEFAULT_SYSTEM;

  state.gmCurrentMapView = {
    center: systemName,
    sector: sector,
    hex: hex
  };
  console.log('[MAP] GM view tracked:', state.gmCurrentMapView);
}

// AR-50.2: Navigate GM's map to a specific hex and track it
function navigateToHex(sector, hex) {
  const iframe = document.getElementById('shared-map-iframe');
  if (!iframe) return;

  // Update iframe
  const url = buildTravellerMapUrl(sector, hex);
  iframe.src = url;

  // Track this as GM's current view
  state.gmCurrentMapView = {
    center: `Hex ${hex}`,
    sector: sector,
    hex: hex
  };
  console.log('[MAP] GM navigated to:', state.gmCurrentMapView);

  // Update header display
  const display = document.getElementById('map-location-display');
  if (display) {
    display.innerHTML = `Centered on: <strong>Hex ${hex}</strong> (${hex})`;
  }

  // If already sharing, immediately broadcast to players
  if (state.sharedMapActive) {
    state.socket.emit('ops:updateMapView', {
      center: state.gmCurrentMapView.center,
      sector: state.gmCurrentMapView.sector,
      hex: state.gmCurrentMapView.hex,
      scale: state.sharedMapSettings.scale,
      style: state.sharedMapSettings.style
    });
    showNotification(`Players synced to ${hex}`, 'info');
  }
}

// AR-50.2: Listen for TravellerMap postMessage events (clicks)
// This allows GM to click on a system to set their "current view" for re-center
window.addEventListener('message', (event) => {
  // Only process messages from TravellerMap
  if (!event.origin.includes('travellermap.com')) return;
  if (!event.data || event.data.source !== 'travellermap') return;

  // Only GM tracks clicks
  if (!state.isGM) return;

  const { type, location } = event.data;
  if (type === 'click' || type === 'doubleclick') {
    // TravellerMap sends x, y in world coordinates (not sector/hex directly)
    // We need to convert or use the sector/hex from a subsequent lookup
    // For now, log and note this is a limitation
    console.log('[MAP] TravellerMap click:', location);

    // The click location gives us world coordinates, but we'd need to convert
    // to sector/hex. TravellerMap doesn't give us that directly.
    // Alternative approach: Let GM manually set location via UI
    // or we track what we programmatically navigate to
  }
});

function updateSharedMapBadge(isLive) {
  const badge = document.getElementById('shared-map-badge');
  if (badge) {
    badge.classList.toggle('hidden', !isLive);
  }
  // Also update header if map is open
  const liveSpan = document.querySelector('.shared-map-header .live-badge');
  if (liveSpan) {
    liveSpan.style.display = isLive ? 'inline' : 'none';
  }
}

// ==================== System Map (AR-29.5) ====================

function showSystemMap() {
  // Check if already open
  const existing = document.getElementById('system-map-overlay');
  if (existing) {
    existing.classList.remove('hidden');
    return;
  }

  // Create fullscreen overlay
  const overlay = document.createElement('div');
  overlay.id = 'system-map-overlay';
  overlay.className = 'system-map-overlay';

  const systemName = state.campaign?.current_system || 'Demo System';

  // Get hex and location for header (matching bridge header format)
  // Check multiple sources: ship.current_state, shipState, campaign
  const shipCurrentState = state.ship?.current_state || {};
  const currentHex = shipCurrentState.systemHex || state.shipState?.systemHex || state.campaign?.current_hex || '----';
  const currentSystemName = state.campaign?.current_system || systemName || 'Unknown';
  const currentLocation = shipCurrentState.locationName || state.shipState?.locationName || 'Unknown Location';
  const campaignDate = state.campaign?.current_date || '1105-001';
  const screenLabel = state.isGM ? 'System Map · GM' : 'System Map · Player';

  overlay.innerHTML = `
    <div class="esc-hint">ESC to close</div>
    <div class="system-map-header">
      <div class="system-map-header-info">
        <span class="screen-label">${escapeHtml(screenLabel)}</span>
        <h1 id="system-map-ship-name">${escapeHtml(state.ship?.name || 'Ship')}</h1>
        <span id="system-map-hex" class="hex-display" title="${escapeHtml(currentSystemName)}">${escapeHtml(currentHex)}</span>
        <span class="header-separator">·</span>
        <span id="system-map-location" class="location-display prominent">${escapeHtml(currentLocation)}</span>
        <span class="header-separator">·</span>
        <span id="system-map-date" class="date-display">${escapeHtml(campaignDate)}</span>
      </div>
      <div class="system-map-controls">
        <select id="test-system-select" class="form-control" style="width: auto; display: inline-block; min-width: 150px;" title="Select a star system to view">
          <option value="">Loading systems...</option>
        </select>
        <button id="btn-load-system" class="btn btn-warning" style="font-weight: bold;" title="Load the selected star system">SWITCH STARSYSTEM</button>
        <button id="btn-places" class="btn btn-info" title="Show clickable destinations in this system">📍 Places</button>
        <button id="btn-range-bands" class="btn btn-outline" title="Toggle tactical range bands">📡 Range</button>
        <button id="btn-goldilocks" class="btn btn-outline btn-toggle-fixed" title="Toggle habitable zone display - Shows where liquid water can exist">🌡️ HZ</button>
        <select id="object-selector" class="form-control" style="width: auto; display: inline-block; min-width: 120px;" title="Jump to object">
          <option value="">Go to...</option>
        </select>
        <button id="btn-show-ship" class="btn btn-outline" title="Show party ship">🚀 Ship</button>
        ${state.isGM ? `
          <button id="btn-share-system-map" class="btn btn-primary">Share with Players</button>
        ` : ''}
        <button id="btn-close-system-map" class="btn btn-secondary" onclick="window.closeSystemMap()">Close</button>
      </div>
    </div>
    <div id="system-map-container" class="system-map-container">
      <!-- Canvas will be inserted here by initSystemMap -->
    </div>
    <div class="system-map-time-controls">
      <button id="btn-time-rewind-100" class="btn btn-sm" title="Rewind 100 days - Move planets back in their orbits">◀◀ -100d</button>
      <button id="btn-time-rewind-10" class="btn btn-sm" title="Rewind 10 days">◀ -10d</button>
      <button id="btn-time-pause" class="btn btn-sm btn-primary" title="Pause/Resume orbital animation">⏸ Pause</button>
      <button id="btn-time-forward-10" class="btn btn-sm" title="Advance 10 days">+10d ▶</button>
      <button id="btn-time-forward-100" class="btn btn-sm" title="Advance 100 days - Move planets forward in their orbits">+100d ▶▶</button>
      <span class="time-speed-label">Speed:</span>
      <select id="time-speed-select" class="form-control" style="width: auto; display: inline-block;" title="Orbital animation speed multiplier">
        <option value="0" selected>0x</option>
        <option value="1">1x</option>
        <option value="5">5x</option>
        <option value="10">10x</option>
        <option value="50">50x</option>
      </select>
      <span class="date-input-label">Date:</span>
      <input type="number" id="date-year-input" class="form-control" style="width: 70px; display: inline-block;" value="1105" min="1" max="9999" title="Imperial Year (e.g., 1105)">
      <span>.</span>
      <input type="number" id="date-day-input" class="form-control" style="width: 55px; display: inline-block;" value="001" min="1" max="365" title="Day of Year (001-365)">
      <button id="btn-set-date" class="btn btn-sm" title="Set simulated date for orbital positions">Set</button>
      <span id="simulated-date" class="simulated-date">1105.001</span>
    </div>
    <div class="system-map-instructions">
      Scroll to zoom | Drag to pan | Time controls affect orbital positions
    </div>
  `;

  document.body.appendChild(overlay);

  // Initialize canvas after layout is complete (using double rAF to ensure layout)
  requestAnimationFrame(() => {
    requestAnimationFrame(async () => {
      // Use scoped query - there's another system-map-container in HTML that's hidden
      const container = overlay.querySelector('#system-map-container');
      if (container) {
        initSystemMap(container);

        // Populate system selector from index (20 systems from _index.json, sorted alphabetically)
        const select = document.getElementById('test-system-select');
        try {
          const indexRes = await fetch('/data/star-systems/_index.json');
          if (!indexRes.ok) throw new Error(`HTTP ${indexRes.status}`);
          const index = await indexRes.json();
          const systems = index.systems
            .filter(s => !s.special)  // Exclude jumpspace
            .sort((a, b) => a.name.localeCompare(b.name));

          console.log(`[SystemMap] Loaded ${systems.length} systems from _index.json`);

          select.innerHTML = systems
            .map(s => `<option value="${s.id}">${s.name}</option>`)
            .join('');

          // Select current system (must match by name, case-insensitive)
          // Strip parenthetical sector info like "(Spinward Marches 0931)"
          const rawSystemName = state.campaign?.current_system || DEFAULT_SYSTEM;
          const currentSystemName = rawSystemName.replace(/\s*\([^)]*\)\s*/g, '').trim();
          const matchingSystem = systems.find(s =>
            s.name.toLowerCase() === currentSystemName.toLowerCase() ||
            s.id.toLowerCase() === currentSystemName.toLowerCase()
          );
          if (matchingSystem) {
            select.value = matchingSystem.id;
            console.log(`[SystemMap] Selected current system: ${matchingSystem.name}`);
            // Load the selected system
            await loadSelectedSystemFromJSON(select.value);
          } else {
            // AR-110: Don't auto-load random system when current isn't found
            // AR-119: Default to Mora (Imperial capital) as fallback
            const fallbackSystem = systems.find(s => s.id === 'mora') || systems[0];
            select.value = fallbackSystem?.id || systems[0]?.id;
            console.log(`[SystemMap] No map data for "${currentSystemName}", showing ${fallbackSystem?.name || DEFAULT_SYSTEM}`);
            if (typeof window.showNotification === 'function') {
              window.showNotification(`No system map data for ${currentSystemName}. Showing ${fallbackSystem?.name || DEFAULT_SYSTEM}.`, 'warning');
            }
            await loadSelectedSystemFromJSON(select.value);
          }
          const nameEl = document.getElementById('system-map-name');
          if (nameEl) {
            nameEl.textContent = systems.find(s => s.id === select.value)?.name || currentSystemName;
          }

        } catch (err) {
          console.error('[SystemMap] Failed to load system index, falling back to TEST_SYSTEMS:', err);
          // Fallback to TEST_SYSTEMS (3 systems) - this should rarely happen
          select.innerHTML = Object.entries(TEST_SYSTEMS)
            .map(([key, sys]) => `<option value="${key}">${sys.name}</option>`)
            .join('');
          loadTestSystem('flammarion');
        }

        // Resize canvas after a short delay to ensure proper dimensions
        setTimeout(() => {
          resizeSystemMapCanvas();
        }, 100);
      }
    });
  });

  // Helper to load system from JSON
  // If forceReload=false, skip if system already loaded (preserves orbital positions)
  async function loadSelectedSystemFromJSON(systemId, forceReload = false) {
    try {
      // Check if system already loaded (from bridgeJoined early load)
      const currentId = window.systemMapState?.system?.id;
      if (!forceReload && currentId === systemId) {
        console.log(`[SystemMap] System ${systemId} already loaded, skipping reload`);
        setTimeout(() => updateObjectSelector(), 100);
        return;
      }

      const res = await fetch(`/data/star-systems/${systemId}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const systemData = await res.json();
      loadSystemFromJSON(systemData);
      resetMapTime();
      updateSimulatedDate();
      setTimeout(() => updateObjectSelector(), 100);

      // AR-111: Auto-show ship at current location
      setTimeout(() => updateShipOnSystemMap(systemData), 150);
    } catch (err) {
      console.error(`[SystemMap] Failed to load ${systemId}.json:`, err);
      // Fallback to TEST_SYSTEMS if available
      if (TEST_SYSTEMS[systemId]) {
        loadTestSystem(systemId);
      }
    }
  }

  document.getElementById('btn-share-system-map')?.addEventListener('click', () => {
    if (!systemMapState.system) {
      showNotification('No system loaded to share', 'warning');
      return;
    }
    state.socket.emit('ops:shareStarSystem', {
      sector: systemMapState.sector,
      hex: systemMapState.hex,
      system: systemMapState.system
    });
    showNotification('Star system shared with players', 'success');
  });

  // Places overlay toggle
  let placesVisible = false;
  document.getElementById('btn-places')?.addEventListener('click', () => {
    if (placesVisible) {
      hidePlacesOverlay();
      placesVisible = false;
    } else {
      showPlacesOverlay();
      placesVisible = true;
    }
  });

  // Load button switches to selected system AND updates ship location
  document.getElementById('btn-load-system').addEventListener('click', async () => {
    const select = document.getElementById('test-system-select');
    if (select.value) {
      const systemId = select.value;
      const systemName = select.options[select.selectedIndex]?.text || systemId;

      // Fetch system data to get hex and exit-jump location
      try {
        const res = await fetch(`/data/star-systems/${systemId}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const systemData = await res.json();

        // Find exit-jump location (default arrival point)
        const exitJump = systemData.locations?.find(loc => loc.id === 'loc-exit-jump');
        const exitJumpName = exitJump?.name || 'Exit Jump Space';
        const newHex = systemData.hex || '----';

        // Update ship state locally
        if (state.shipState) {
          state.shipState.systemHex = newHex;
          state.shipState.locationId = 'loc-exit-jump';
          state.shipState.locationName = exitJumpName;
        }

        // Update campaign current system
        if (state.campaign) {
          state.campaign.current_system = systemName;
        }

        // Update header elements
        const hexEl = document.getElementById('system-map-hex');
        if (hexEl) {
          hexEl.textContent = newHex;
          hexEl.title = systemName;
        }
        const locEl = document.getElementById('system-map-location');
        if (locEl) locEl.textContent = exitJumpName;

        // Also update bridge header if visible
        const bridgeHex = document.getElementById('bridge-hex');
        if (bridgeHex) {
          bridgeHex.textContent = newHex;
          bridgeHex.title = systemName;
        }
        const bridgeLoc = document.getElementById('bridge-location');
        if (bridgeLoc) bridgeLoc.textContent = exitJumpName;

        // Load the system into map
        await loadSelectedSystemFromJSON(systemId, true); // forceReload=true for explicit switch

        // AR-86: Refresh places overlay if visible
        if (placesVisible) {
          showPlacesOverlay();
        }
        showNotification(`Arrived at ${systemName} - ${exitJumpName}`, 'success');
      } catch (err) {
        console.error(`[SystemMap] Failed to switch to ${systemId}:`, err);
        showNotification(`Failed to switch to ${systemName}`, 'error');
      }
    }
  });

  // AR-29.9: Range bands toggle
  let rangeBandsOn = false;
  document.getElementById('btn-range-bands')?.addEventListener('click', () => {
    if (typeof toggleRangeBands === 'function') {
      toggleRangeBands();
      rangeBandsOn = !rangeBandsOn;
      const btn = document.getElementById('btn-range-bands');
      btn.classList.toggle('btn-active', rangeBandsOn);
      btn.textContent = rangeBandsOn ? '📡 Range ON' : '📡 Range';
    }
  });

  // AR-36: Goldilocks zone toggle (fixed-width button)
  let goldilocksOn = false;
  document.getElementById('btn-goldilocks')?.addEventListener('click', () => {
    if (typeof toggleGoldilocksZone === 'function') {
      toggleGoldilocksZone();
      goldilocksOn = !goldilocksOn;
      const btn = document.getElementById('btn-goldilocks');
      btn.classList.toggle('btn-active', goldilocksOn);
      // Keep same text, use class for visual feedback
    }
  });

  // AR-36: Object selector dropdown
  document.getElementById('object-selector')?.addEventListener('change', (e) => {
    const value = e.target.value;
    if (value && typeof goToObject === 'function') {
      goToObject(value);
      e.target.value = ''; // Reset selector
    }
  });

  // Populate object selector when system changes
  function updateObjectSelector() {
    const select = document.getElementById('object-selector');
    if (!select || !systemMapState.system) return;

    const options = ['<option value="">Go to...</option>'];

    // Add stars
    if (systemMapState.system.stars) {
      systemMapState.system.stars.forEach((star, i) => {
        options.push(`<option value="star-${i}">${star.name || `Star ${i + 1}`}</option>`);
      });
    }

    // Add planets
    if (systemMapState.system.planets) {
      systemMapState.system.planets.forEach((planet, i) => {
        const prefix = planet.isMainworld ? '★ ' : '';
        options.push(`<option value="planet-${i}">${prefix}${planet.name}</option>`);
      });
    }

    select.innerHTML = options.join('');
  }

  // Update selector after system loads
  setTimeout(updateObjectSelector, 200);

  /**
   * AR-111: Update ship position on system map based on current location
   * @param {Object} systemData - Loaded system JSON data
   */
  function updateShipOnSystemMap(systemData) {
    if (typeof updateShipPosition !== 'function') return;

    const locationId = state.shipState?.locationId;
    const shipName = state.ship?.name || 'Party Ship';
    let shipData = {
      name: shipName,
      position: { x: 5, y: 0, z: 0 }, // Default fallback
      heading: 0
    };

    // Try to find ship's location in system locations
    if (locationId && systemData?.locations) {
      const location = systemData.locations.find(l => l.id === locationId);
      if (location?.linkedTo) {
        // Find the linked celestial body
        const body = systemData.celestialObjects?.find(o => o.id === location.linkedTo);
        if (body) {
          const bodyOrbitAU = body.orbitAU || 0;
          const locationOrbitKm = location.orbitKm || 0;
          const locationOrbitAU = locationOrbitKm / 149597870.7; // km to AU

          // Pass location info for dynamic time-based positioning
          shipData.locationInfo = {
            linkedBodyOrbitAU: bodyOrbitAU,
            offsetAU: locationOrbitAU,
            offsetBearing: location.bearing || 0
          };
          console.log(`[SystemMap] Ship at ${locationId}: tracking body at ${bodyOrbitAU.toFixed(2)}AU + offset ${locationOrbitAU.toFixed(4)}AU`);
        }
      }
    }

    updateShipPosition(shipData);
  }

  // AR-29.9: Show party ship (manual toggle)
  document.getElementById('btn-show-ship')?.addEventListener('click', () => {
    // Re-show ship at current location
    if (typeof updateShipPosition === 'function' && window.systemMapState?.system) {
      updateShipOnSystemMap(window.systemMapState.system);
      showNotification('Ship shown on system map', 'info');
    }
  });

  // Time controls
  document.getElementById('btn-time-rewind-100').addEventListener('click', () => {
    rewindMapTime(100);
    updateSimulatedDate();
  });
  document.getElementById('btn-time-rewind-10').addEventListener('click', () => {
    rewindMapTime(10);
    updateSimulatedDate();
  });
  document.getElementById('btn-time-pause').addEventListener('click', () => {
    const paused = togglePause();
    document.getElementById('btn-time-pause').textContent = paused ? '▶ Play' : '⏸ Pause';
  });
  document.getElementById('btn-time-forward-10').addEventListener('click', () => {
    advanceMapTime(10);
    updateSimulatedDate();
  });
  document.getElementById('btn-time-forward-100').addEventListener('click', () => {
    advanceMapTime(100);
    updateSimulatedDate();
  });
  document.getElementById('time-speed-select').addEventListener('change', (e) => {
    setTimeSpeed(parseFloat(e.target.value));
  });

  // Date input handler
  document.getElementById('btn-set-date').addEventListener('click', () => {
    const year = parseInt(document.getElementById('date-year-input').value) || 1105;
    const day = parseInt(document.getElementById('date-day-input').value) || 1;
    setMapDate(year, Math.max(1, Math.min(365, day)));
    updateSimulatedDate();
  });

  // Update simulated date display periodically
  const daysInterval = setInterval(() => {
    if (!document.getElementById('simulated-date')) {
      clearInterval(daysInterval);
      return;
    }
    updateSimulatedDate();
  }, 500);
}

function updateSimulatedDate() {
  const dateEl = document.getElementById('simulated-date');
  if (dateEl) {
    const date = getMapDate();
    dateEl.textContent = `${date.year}.${date.day.toString().padStart(3, '0')}`;
  }
}

function closeSystemMap() {
  console.log('[SystemMap] closeSystemMap called');
  const overlay = document.getElementById('system-map-overlay');
  if (overlay) {
    try {
      destroySystemMap();
    } catch (e) {
      console.error('[SystemMap] Error in destroySystemMap:', e);
    }
    overlay.remove();
    console.log('[SystemMap] Overlay removed');
  } else {
    console.log('[SystemMap] No overlay found to close');
  }
}

// Expose system map functions globally
window.showSystemMap = showSystemMap;
window.closeSystemMap = closeSystemMap;

/**
 * AR-102: Load the current system data at session startup
 * This is called early (on bridgeJoined) to ensure system data is ready
 * for any component that needs it (embedded map, navigation, etc.)
 * @param {string} systemName - Name of the system to load (e.g., 'Flammarion')
 */
async function loadCurrentSystem(systemName) {
  if (!systemName) {
    console.warn('[loadCurrentSystem] No system name provided');
    return;
  }

  // Convert system name to ID (lowercase, remove parenthetical sector info, no spaces or dashes)
  const systemId = systemName.toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, '')  // Remove "(Spinward Marches 0931)" etc
    .replace(/\s+/g, '')
    .replace(/-/g, '');

  try {
    const res = await fetch(`/data/star-systems/${systemId}.json`);
    if (!res.ok) {
      console.error(`[loadCurrentSystem] Failed to fetch ${systemId}.json: HTTP ${res.status}`);
      return;
    }
    const systemData = await res.json();

    // Use global loadSystemFromJSON exposed from system-map.js
    if (typeof window.loadSystemFromJSON === 'function') {
      window.loadSystemFromJSON(systemData);
      console.log(`[loadCurrentSystem] Loaded system: ${systemName} (${systemData.celestialObjects?.length || 0} objects)`);
    } else {
      console.error('[loadCurrentSystem] window.loadSystemFromJSON not available');
    }
  } catch (err) {
    console.error(`[loadCurrentSystem] Error loading ${systemName}:`, err);
  }
}
window.loadCurrentSystem = loadCurrentSystem;

// ==================== AR-94: Embedded System Map for Pilot View ====================

/**
 * AR-94: Show embedded system map in pilot-map layout
 * Creates a simplified system map embedded in the bridge view (right 2/3)
 */
function showEmbeddedSystemMap() {
  const bridgeMain = document.querySelector('.bridge-main');
  if (!bridgeMain) return;

  // Check if embedded map already exists
  let embed = document.getElementById('embedded-system-map');
  if (embed) {
    embed.classList.remove('hidden');
    return;
  }

  // Create embedded map container
  embed = document.createElement('div');
  embed.id = 'embedded-system-map';
  embed.className = 'embedded-system-map';
  embed.innerHTML = `
    <div class="embedded-map-header">
      <span class="embedded-map-title">Navigation</span>
      <button class="btn btn-icon btn-small" onclick="expandEmbeddedMap()" title="Expand to full map">⛶</button>
    </div>
    <div id="embedded-map-container" class="embedded-map-container">
      <canvas id="embedded-system-canvas"></canvas>
    </div>
    <div class="embedded-map-controls">
      <button class="btn btn-small btn-outline" onclick="zoomEmbeddedMap(1.3)" title="Zoom In">+</button>
      <button class="btn btn-small btn-outline" onclick="zoomEmbeddedMap(0.7)" title="Zoom Out">−</button>
      <button class="btn btn-small" id="btn-pilot-destinations" onclick="showPilotDestinations()" title="Choose destination">📍 Set Course</button>
    </div>
  `;

  bridgeMain.appendChild(embed);

  // Initialize embedded canvas using system-map module
  setTimeout(() => {
    initEmbeddedSystemCanvas();
  }, 100);
}

/**
 * AR-94: Hide embedded system map
 */
function hideEmbeddedSystemMap() {
  const embed = document.getElementById('embedded-system-map');
  if (embed) {
    embed.classList.add('hidden');
  }
}

/**
 * AR-94: Initialize the embedded system canvas
 */
function initEmbeddedSystemCanvas() {
  const canvas = document.getElementById('embedded-system-canvas');
  const container = document.getElementById('embedded-map-container');
  if (!canvas || !container) return;

  // Use system-map module's init function if available
  if (typeof initEmbeddedMap === 'function') {
    initEmbeddedMap(canvas, container);
  } else {
    // Fallback: basic canvas setup
    const ctx = canvas.getContext('2d');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4a9eff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('System Map Loading...', canvas.width / 2, canvas.height / 2);
  }
}

/**
 * AR-94: Zoom embedded map
 */
function zoomEmbeddedMap(factor) {
  if (typeof zoomSystemMap === 'function') {
    zoomSystemMap(factor);
  }
}

/**
 * AR-94: Expand to full system map overlay
 */
function expandEmbeddedMap() {
  showSystemMap();
}

/**
 * AR-94/AR-129: Show pilot destinations picker
 * Fixed: Call showPlacesOverlay directly instead of undefined toggleDestinationsPanel
 */
function showPilotDestinations() {
  // AR-129: Use showPlacesOverlay directly - it shows destinations in sidebar
  showPlacesOverlay();
}

// Expose AR-94 functions globally
window.showEmbeddedSystemMap = showEmbeddedSystemMap;
window.hideEmbeddedSystemMap = hideEmbeddedSystemMap;
window.zoomEmbeddedMap = zoomEmbeddedMap;
window.expandEmbeddedMap = expandEmbeddedMap;
window.showPilotDestinations = showPilotDestinations;

function updateSharedMapButtons() {
  const shareBtn = document.getElementById('btn-share-map');
  const unshareBtn = document.getElementById('btn-unshare-map');
  const recenterBtn = document.getElementById('btn-recenter-players');
  if (shareBtn) shareBtn.classList.toggle('hidden', state.sharedMapActive);
  if (unshareBtn) unshareBtn.classList.toggle('hidden', !state.sharedMapActive);
  if (recenterBtn) recenterBtn.classList.toggle('hidden', !state.sharedMapActive);
}

// AR-50.2: Update shared map iframe with new location (for player sync)
function updateSharedMapFrame(data) {
  const iframe = document.getElementById('shared-map-iframe');
  if (!iframe || !data) return;

  const sector = data.sector || DEFAULT_SECTOR;
  const hex = data.hex || DEFAULT_HEX;
  const scale = data.scale || state.sharedMapSettings.scale;
  const style = data.style || state.sharedMapSettings.style;

  // Build URL with shared scale/style (not local settings)
  const params = new URLSearchParams({ sector, hex, scale, style });
  const url = `https://travellermap.com/?${params.toString()}`;

  // Only update if URL actually changed
  if (iframe.src !== url) {
    iframe.src = url;
    mapDebugMessage(`Synced to: ${sector}/${hex} scale=${scale}`);
  }

  // Update header text
  const header = document.querySelector('.shared-map-controls span');
  if (header) {
    const systemName = data.center || 'Unknown';
    header.innerHTML = `Centered on: <strong>${systemName}</strong> (${hex})`;
  }
}

/**
 * Show debug message on shared map overlay
 * Messages appear in lower-right corner and fade after 3 seconds
 * Only visible in DEBUG mode (localhost/development)
 * @param {string} message - Debug message to display
 * @param {string} type - Message type: 'info', 'warn', 'error' (default: 'info')
 */
function mapDebugMessage(message, type = 'info') {
  // Only show in debug mode
  if (!DEBUG) return;

  const overlay = document.getElementById('map-debug-overlay');
  if (!overlay) return;

  const msgEl = document.createElement('div');
  msgEl.className = `debug-message debug-${type}`;
  msgEl.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

  overlay.appendChild(msgEl);

  // Fade out and remove after 10 seconds
  setTimeout(() => {
    msgEl.classList.add('fade-out');
    setTimeout(() => msgEl.remove(), 500);
  }, 10000);

  // Keep max 5 messages
  while (overlay.children.length > 5) {
    overlay.firstChild.remove();
  }
}

// Expose for external use (debugging from console)
if (DEBUG) {
  window.mapDebugMessage = mapDebugMessage;
}

// ==================== Full-Screen Email App (Stage 13.4) ====================

// Store current mail list for reference
let currentMailList = [];
let selectedMailId = null;

function openEmailApp(mailList, unreadCount) {
  currentMailList = mailList || [];
  selectedMailId = null;

  const emailApp = document.getElementById('email-app');
  if (!emailApp) return;

  // Update unread badge
  const badge = document.getElementById('email-unread-count');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = `${unreadCount} unread`;
      badge.classList.remove('hidden');
    } else {
      badge.textContent = '';
      badge.classList.add('hidden');
    }
  }

  // Render inbox list
  renderEmailInbox(mailList);

  // Clear message view
  const messageView = document.getElementById('email-message-view');
  if (messageView) {
    messageView.innerHTML = `
      <div class="email-no-selection">
        <p>Select a message to read</p>
      </div>
    `;
  }

  // Hide compose view
  const composeView = document.getElementById('email-compose-view');
  if (composeView) {
    composeView.classList.add('hidden');
  }

  // Show email app
  emailApp.classList.remove('hidden');

  // Add keyboard listener for escape
  document.addEventListener('keydown', emailAppKeyHandler);
}

function closeEmailApp() {
  const emailApp = document.getElementById('email-app');
  if (emailApp) {
    emailApp.classList.add('hidden');
  }
  document.removeEventListener('keydown', emailAppKeyHandler);
  selectedMailId = null;
}

function emailAppKeyHandler(e) {
  if (e.key === 'Escape') {
    closeEmailApp();
  }
}

function renderEmailInbox(mailList) {
  const inboxList = document.getElementById('email-inbox-list');
  if (!inboxList) return;

  if (!mailList || mailList.length === 0) {
    inboxList.innerHTML = '<p class="placeholder">No messages</p>';
    return;
  }

  let html = '';
  for (const mail of mailList) {
    const isRead = mail.is_read ? 'read' : 'unread';
    const isSelected = mail.id === selectedMailId ? 'selected' : '';
    html += `
      <div class="email-inbox-item ${isRead} ${isSelected}" data-mail-id="${mail.id}">
        <div class="email-inbox-sender">${escapeHtml(mail.sender_name)}</div>
        <div class="email-inbox-subject">${escapeHtml(mail.subject)}</div>
        <div class="email-inbox-date">${mail.sent_date}</div>
        <div class="email-inbox-preview">${escapeHtml(mail.body.substring(0, 60))}${mail.body.length > 60 ? '...' : ''}</div>
      </div>
    `;
  }

  inboxList.innerHTML = html;

  // Add click handlers
  inboxList.querySelectorAll('.email-inbox-item').forEach(item => {
    item.addEventListener('click', () => {
      const mailId = item.dataset.mailId;
      selectEmailMessage(mailId);
    });
  });
}

function selectEmailMessage(mailId) {
  const mail = currentMailList.find(m => m.id === mailId);
  if (!mail) return;

  selectedMailId = mailId;

  // Update selection highlight in inbox
  document.querySelectorAll('.email-inbox-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.mailId === mailId);
    if (item.dataset.mailId === mailId) {
      item.classList.remove('unread');
      item.classList.add('read');
    }
  });

  // Mark as read on server
  if (!mail.is_read) {
    state.socket.emit('ops:markMailRead', { mailId });
    mail.is_read = true;
    state.unreadMailCount = Math.max(0, (state.unreadMailCount || 1) - 1);
    updateMailBadge();
    // Update email app badge too
    const badge = document.getElementById('email-unread-count');
    if (badge) {
      if (state.unreadMailCount > 0) {
        badge.textContent = `${state.unreadMailCount} unread`;
      } else {
        badge.textContent = '';
        badge.classList.add('hidden');
      }
    }
  }

  // Show message in message view
  const messageView = document.getElementById('email-message-view');
  if (messageView) {
    messageView.innerHTML = `
      <div class="email-message-header">
        <div class="email-message-from"><strong>From:</strong> ${escapeHtml(mail.sender_name)}</div>
        <div class="email-message-subject"><strong>Subject:</strong> ${escapeHtml(mail.subject)}</div>
        <div class="email-message-date"><strong>Date:</strong> ${mail.sent_date}</div>
      </div>
      <div class="email-message-body">
        ${escapeHtml(mail.body).split('\n').join('<br>')}
      </div>
      <div class="email-message-actions">
        <button class="btn btn-primary btn-small" id="btn-email-reply" data-mail-id="${mail.id}">Reply</button>
        <button class="btn btn-warning btn-small" id="btn-email-archive" data-mail-id="${mail.id}">Archive</button>
      </div>
    `;

    // Reply button handler
    document.getElementById('btn-email-reply')?.addEventListener('click', () => {
      showEmailCompose(mail);
    });

    // Archive button handler
    document.getElementById('btn-email-archive')?.addEventListener('click', () => {
      state.socket.emit('ops:archiveMail', { mailId: mail.id });
      showNotification('Mail archived', 'success');
      // Remove from local list and re-render
      currentMailList = currentMailList.filter(m => m.id !== mail.id);
      renderEmailInbox(currentMailList);
      selectedMailId = null;
      messageView.innerHTML = `
        <div class="email-no-selection">
          <p>Select a message to read</p>
        </div>
      `;
    });
  }

  // Hide compose view
  const composeView = document.getElementById('email-compose-view');
  if (composeView) {
    composeView.classList.add('hidden');
  }
}

function showEmailCompose(replyTo = null) {
  const messageView = document.getElementById('email-message-view');
  const composeView = document.getElementById('email-compose-view');

  if (!composeView) return;

  // Clear and setup compose form - match HTML element IDs
  const recipientSpan = document.getElementById('compose-recipient');
  const subjectField = document.getElementById('compose-subject-input');
  const bodyField = document.getElementById('compose-body-input');

  if (replyTo) {
    if (recipientSpan) recipientSpan.textContent = replyTo.sender_name;
    if (subjectField) subjectField.value = `Re: ${replyTo.subject}`;
    if (bodyField) {
      bodyField.value = '';
      bodyField.placeholder = 'Type your reply...';
    }
    composeView.dataset.replyToId = replyTo.id;
    composeView.dataset.replyToSender = replyTo.sender_name;
  } else {
    if (recipientSpan) recipientSpan.textContent = 'GM';
    if (subjectField) subjectField.value = '';
    if (bodyField) {
      bodyField.value = '';
      bodyField.placeholder = 'Type your message...';
    }
    delete composeView.dataset.replyToId;
    delete composeView.dataset.replyToSender;
  }

  // Show compose, hide message view content
  if (messageView) {
    messageView.innerHTML = '';
  }
  composeView.classList.remove('hidden');

  // Focus the body field
  if (bodyField) bodyField.focus();
}

function sendEmail() {
  const composeView = document.getElementById('email-compose-view');
  const subjectField = document.getElementById('compose-subject-input');
  const bodyField = document.getElementById('compose-body-input');

  const subject = subjectField?.value?.trim();
  const body = bodyField?.value?.trim();

  if (!body) {
    showError('Please enter a message');
    return;
  }

  const replyToId = composeView?.dataset?.replyToId;
  const replyToSender = composeView?.dataset?.replyToSender;

  if (replyToId) {
    // Reply to existing mail
    state.socket.emit('ops:replyToMail', {
      originalMailId: replyToId,
      subject: subject || 'Re: (no subject)',
      body
    });
  } else {
    // New mail to GM
    state.socket.emit('ops:sendMail', {
      to: 'GM',
      subject: subject || '(no subject)',
      body
    });
  }

  showNotification('Message sent', 'success');

  // Clear and hide compose
  if (subjectField) subjectField.value = '';
  if (bodyField) bodyField.value = '';
  composeView.classList.add('hidden');

  // Request updated mail list
  state.socket.emit('ops:getMail');
}

function cancelEmailCompose() {
  const composeView = document.getElementById('email-compose-view');
  const messageView = document.getElementById('email-message-view');

  if (composeView) {
    composeView.classList.add('hidden');
  }

  // If we had a selected message, re-show it
  if (selectedMailId) {
    selectEmailMessage(selectedMailId);
  } else if (messageView) {
    messageView.innerHTML = `
      <div class="email-no-selection">
        <p>Select a message to read</p>
      </div>
    `;
  }
}

function initEmailAppHandlers() {
  // Close button
  document.getElementById('btn-close-email-app')?.addEventListener('click', closeEmailApp);

  // Compose button
  document.getElementById('btn-compose-email')?.addEventListener('click', () => {
    showEmailCompose(null);
  });

  // Send button in compose view
  document.getElementById('btn-send-email')?.addEventListener('click', sendEmail);

  // Cancel button in compose view
  document.getElementById('btn-cancel-compose')?.addEventListener('click', cancelEmailCompose);
}

// ==================== Crew Roster (Stage 11.4) ====================

function showCrewRoster() {
  const npcCrew = state.ship?.npcCrew || [];
  const isGM = state.isGM;

  let html = `
    <div class="modal-header">
      <h2>Crew Roster</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body crew-roster-body">
  `;

  if (npcCrew.length === 0) {
    html += '<p class="text-muted">No NPC crew members assigned to this ship.</p>';
  } else {
    html += '<div class="crew-roster-list">';
    for (const crew of npcCrew) {
      const statusClass = crew.status === 'active' ? 'active' :
                         crew.status === 'relieved' ? 'relieved' :
                         crew.status === 'injured' ? 'injured' : '';
      html += `
        <div class="crew-roster-item ${statusClass}" data-crew-id="${crew.id}">
          <div class="crew-item-main">
            <span class="crew-name">${crew.name}</span>
            <span class="crew-role">${crew.role}</span>
          </div>
          <div class="crew-item-details">
            <span class="crew-skill">${getSkillLabel(crew.skill_level)}</span>
            ${crew.personality ? `<span class="crew-personality">${crew.personality}</span>` : ''}
            <span class="crew-status">${crew.status || 'active'}</span>
          </div>
          ${isGM ? `
            <div class="crew-item-actions">
              <button class="btn btn-sm btn-secondary" data-edit-crew="${crew.id}">Edit</button>
              <button class="btn btn-sm btn-danger" data-delete-crew="${crew.id}">Remove</button>
            </div>
          ` : ''}
        </div>
      `;
    }
    html += '</div>';
  }

  html += `
    </div>
    <div class="modal-footer">
      ${isGM ? '<button class="btn btn-primary" id="btn-add-crew">Add Crew Member</button>' : ''}
      <button class="btn btn-secondary" data-close-modal>Close</button>
    </div>
  `;

  showModalContent(html);

  // GM actions
  if (isGM) {
    document.getElementById('btn-add-crew')?.addEventListener('click', () => showAddCrewModal());

    document.querySelectorAll('[data-edit-crew]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const crewId = e.target.dataset.editCrew;
        const crew = npcCrew.find(c => c.id === crewId);
        if (crew) showEditCrewModal(crew);
      });
    });

    document.querySelectorAll('[data-delete-crew]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const crewId = e.target.dataset.deleteCrew;
        if (confirm('Remove this crew member?')) {
          state.socket.emit('ops:deleteNPCCrew', { crewId });
          showNotification('Crew member removed', 'info');
          setTimeout(() => showCrewRoster(), 500);
        }
      });
    });
  }
}

// AR-103: getSkillLabel moved to modules/helpers.js

function showAddCrewModal() {
  const html = `
    <div class="modal-header">
      <h2>Add Crew Member</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="crew-name" class="form-control" placeholder="Crew member name">
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="crew-role" class="form-control">
          <option value="pilot">Pilot</option>
          <option value="astrogator">Astrogator</option>
          <option value="engineer">Engineer</option>
          <option value="medic">Medic</option>
          <option value="gunner">Gunner</option>
          <option value="sensor_operator">Sensor Operator</option>
          <option value="steward">Steward</option>
          <option value="marine">Marine</option>
          <option value="deckhand">Deckhand</option>
        </select>
      </div>
      <div class="form-group">
        <label>Skill Level</label>
        <select id="crew-skill" class="form-control">
          <option value="0">Green (+0)</option>
          <option value="1" selected>Average (+1)</option>
          <option value="2">Veteran (+2)</option>
          <option value="3">Elite (+3)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Personality (optional)</label>
        <input type="text" id="crew-personality" class="form-control" placeholder="Brief personality">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="btn-back-roster">Back</button>
      <button class="btn btn-primary" id="btn-save-crew">Add Crew</button>
    </div>
  `;

  showModalContent(html);

  document.getElementById('btn-back-roster').addEventListener('click', () => showCrewRoster());
  document.getElementById('btn-save-crew').addEventListener('click', () => {
    const name = document.getElementById('crew-name').value.trim();
    const role = document.getElementById('crew-role').value;
    const skillLevel = parseInt(document.getElementById('crew-skill').value);
    const personality = document.getElementById('crew-personality').value.trim();

    if (!name) {
      showNotification('Please enter a name', 'error');
      return;
    }

    state.socket.emit('ops:addNPCCrew', {
      shipId: state.ship.id,
      name,
      role,
      skillLevel,
      personality
    });

    showNotification('Crew member added', 'success');
    setTimeout(() => showCrewRoster(), 500);
  });
}

function showEditCrewModal(crew) {
  const html = `
    <div class="modal-header">
      <h2>Edit Crew: ${crew.name}</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Name</label>
        <input type="text" id="crew-name" class="form-control" value="${crew.name}">
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="crew-role" class="form-control">
          <option value="pilot" ${crew.role === 'pilot' ? 'selected' : ''}>Pilot</option>
          <option value="astrogator" ${crew.role === 'astrogator' ? 'selected' : ''}>Astrogator</option>
          <option value="engineer" ${crew.role === 'engineer' ? 'selected' : ''}>Engineer</option>
          <option value="medic" ${crew.role === 'medic' ? 'selected' : ''}>Medic</option>
          <option value="gunner" ${crew.role === 'gunner' ? 'selected' : ''}>Gunner</option>
          <option value="sensor_operator" ${crew.role === 'sensor_operator' ? 'selected' : ''}>Sensor Operator</option>
          <option value="steward" ${crew.role === 'steward' ? 'selected' : ''}>Steward</option>
          <option value="marine" ${crew.role === 'marine' ? 'selected' : ''}>Marine</option>
          <option value="deckhand" ${crew.role === 'deckhand' ? 'selected' : ''}>Deckhand</option>
        </select>
      </div>
      <div class="form-group">
        <label>Skill Level</label>
        <select id="crew-skill" class="form-control">
          <option value="0" ${crew.skill_level === 0 ? 'selected' : ''}>Green (+0)</option>
          <option value="1" ${crew.skill_level === 1 ? 'selected' : ''}>Average (+1)</option>
          <option value="2" ${crew.skill_level === 2 ? 'selected' : ''}>Veteran (+2)</option>
          <option value="3" ${crew.skill_level === 3 ? 'selected' : ''}>Elite (+3)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Personality</label>
        <input type="text" id="crew-personality" class="form-control" value="${crew.personality || ''}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="crew-status" class="form-control">
          <option value="active" ${crew.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="relieved" ${crew.status === 'relieved' ? 'selected' : ''}>Relieved</option>
          <option value="injured" ${crew.status === 'injured' ? 'selected' : ''}>Injured</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="btn-back-roster">Back</button>
      <button class="btn btn-primary" id="btn-update-crew">Update</button>
    </div>
  `;

  showModalContent(html);

  document.getElementById('btn-back-roster').addEventListener('click', () => showCrewRoster());
  document.getElementById('btn-update-crew').addEventListener('click', () => {
    const name = document.getElementById('crew-name').value.trim();
    const role = document.getElementById('crew-role').value;
    const skillLevel = parseInt(document.getElementById('crew-skill').value);
    const personality = document.getElementById('crew-personality').value.trim();
    const status = document.getElementById('crew-status').value;

    if (!name) {
      showNotification('Please enter a name', 'error');
      return;
    }

    state.socket.emit('ops:updateNPCCrew', {
      crewId: crew.id,
      updates: { name, role, skill_level: skillLevel, personality, status }
    });

    showNotification('Crew member updated', 'success');
    setTimeout(() => showCrewRoster(), 500);
  });
}

// ==================== Handout Viewer (Stage 9.3) ====================

function showHandoutModal(handout) {
  const html = `
    <div class="modal-header">
      <h2>Handout</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body">
      <div class="handout-viewer">
        <div class="handout-title">${handout.title}</div>
        <div class="handout-content">
          ${handout.content}
        </div>
        ${handout.sharedBy ? `<div class="handout-meta">Shared by: ${handout.sharedBy}</div>` : ''}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close-modal>Close</button>
    </div>
  `;
  showModalContent(html);
}

// AR-151-2d: Mail Compose Modal moved to modules/mail-compose.js

// ==================== NPC Contacts Modal (Autorun 6) ====================

function showNPCContactsModal(contacts, isGM) {
  let html = `
    <div class="modal-header npc-contacts-modal">
      <h2>NPC Contacts</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body">
  `;

  if (!contacts || contacts.length === 0) {
    html += '<p class="text-muted">No known contacts.</p>';
  } else {
    html += '<div class="npc-contacts-list">';
    for (const contact of contacts) {
      html += `
        <div class="npc-contact-item">
          <div class="npc-contact-name">${contact.name}</div>
          ${contact.title ? `<div class="npc-contact-title">${contact.title}</div>` : ''}
          ${contact.location ? `<div class="npc-contact-location">Location: ${contact.location}</div>` : ''}
          ${contact.description ? `<div class="npc-contact-desc">${contact.description}</div>` : ''}
          ${isGM ? `<div class="npc-contact-visibility">Visible to: ${Array.isArray(contact.visible_to) && contact.visible_to.includes('all') ? 'Everyone' : (contact.visible_to?.length || 0) + ' players'}</div>` : ''}
        </div>
      `;
    }
    html += '</div>';
  }

  if (isGM) {
    html += `
      <div class="gm-controls">
        <button class="btn btn-small" onclick="showAddNPCContactForm()">+ Add Contact</button>
      </div>
    `;
  }

  html += `
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close-modal>Close</button>
    </div>
  `;

  showModalContent(html);
}

function showAddNPCContactForm() {
  const html = `
    <div class="modal-header">
      <h2>Add NPC Contact</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Name:</label>
        <input type="text" id="npc-name" class="form-input" required>
      </div>
      <div class="form-group">
        <label>Title:</label>
        <input type="text" id="npc-title" class="form-input" placeholder="e.g., Ship Broker, Scout">
      </div>
      <div class="form-group">
        <label>Location:</label>
        <input type="text" id="npc-location" class="form-input" placeholder="e.g., Regina Downport">
      </div>
      <div class="form-group">
        <label>Description:</label>
        <textarea id="npc-description" class="form-input" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="npc-visible-all"> Visible to all players</label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="state.socket.emit('ops:getNPCContacts')">Cancel</button>
      <button class="btn btn-primary" onclick="submitNPCContact()">Add Contact</button>
    </div>
  `;
  showModalContent(html);
}

function submitNPCContact() {
  const name = document.getElementById('npc-name')?.value;
  if (!name) {
    showNotification('Name is required', 'error');
    return;
  }

  const data = {
    name,
    title: document.getElementById('npc-title')?.value || null,
    location: document.getElementById('npc-location')?.value || null,
    description: document.getElementById('npc-description')?.value || null,
    visibleTo: document.getElementById('npc-visible-all')?.checked ? ['all'] : []
  };

  state.socket.emit('ops:addNPCContact', data);
  showNotification('Contact added', 'success');
  state.socket.emit('ops:getNPCContacts');
}

function showModalContent(html) {
  const modalContent = document.getElementById('modal-content');
  const modalOverlay = document.getElementById('modal-overlay');
  modalContent.innerHTML = html;
  modalOverlay.classList.remove('hidden');

  // Setup close handlers
  modalContent.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
}

// AR-151-2e: Feedback Form moved to modules/feedback-form.js

// AR-151f: Library Computer moved to modules/library-computer.js

// ==================== AR-48: Crew Roster (Menu) ====================

function showCrewRosterMenu() {
  const ship = state.ship || {};
  const template = state.shipTemplate || {};
  const npcCrew = ship.npc_crew || template.npcCrew || [];
  const connectedPlayers = state.connectedPlayers || [];

  let html = `
    <div class="modal-header">
      <h2>📋 Crew Roster - ${template.name || 'Ship'}</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body crew-roster">
      <div class="roster-section">
        <h4>Online Crew (${connectedPlayers.length})</h4>
        <div class="roster-list">
  `;

  if (connectedPlayers.length === 0) {
    html += '<div class="roster-empty">No crew currently online</div>';
  } else {
    for (const p of connectedPlayers) {
      const roleLabel = p.role ? p.role.charAt(0).toUpperCase() + p.role.slice(1).replace('_', ' ') : 'Unassigned';
      html += `
        <div class="roster-item online">
          <span class="roster-status">●</span>
          <span class="roster-name">${escapeHtml(p.slotName || p.username || 'Unknown')}</span>
          <span class="roster-role">${roleLabel}</span>
        </div>
      `;
    }
  }

  html += `
        </div>
      </div>
      <div class="roster-section">
        <h4>Ship's Complement (${npcCrew.length} NPC)</h4>
        <div class="roster-list">
  `;

  if (npcCrew.length === 0) {
    html += '<div class="roster-empty">No NPC crew assigned</div>';
  } else {
    for (const npc of npcCrew) {
      html += `
        <div class="roster-item npc">
          <span class="roster-status npc">◆</span>
          <span class="roster-name">${escapeHtml(npc.name || 'NPC')}</span>
          <span class="roster-role">${npc.role || npc.position || 'Crew'}</span>
        </div>
      `;
    }
  }

  html += `
        </div>
      </div>
      <div class="roster-summary" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--border-color);">
        <small>Crew Capacity: ${template.staterooms || '?'} staterooms | Low Berths: ${template.lowBerths || 0}</small>
      </div>
    </div>
  `;

  showModalContent(html);
}

// ==================== AR-48: Ship Configuration ====================

function showShipConfiguration() {
  const ship = state.ship || {};
  const template = state.shipTemplate || {};
  const shipData = ship.ship_data || template || {};

  const weapons = shipData.weapons || [];
  const drives = {
    mDrive: shipData.mDrive || shipData.maneuver || '?',
    jDrive: shipData.jDrive || shipData.jumpRating || '?',
    powerPlant: shipData.powerPlant || shipData.power || '?'
  };

  let html = `
    <div class="modal-header">
      <h2>🔧 ${shipData.name || template.name || 'Ship'} Configuration</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body ship-config">
      <div class="config-section">
        <h4>Hull</h4>
        <table class="config-table">
          <tr><td>Tonnage</td><td>${shipData.tonnage || template.tonnage || '?'} dT</td></tr>
          <tr><td>Hull Points</td><td>${shipData.hull || template.hull || '?'}</td></tr>
          <tr><td>Structure</td><td>${shipData.structure || template.structure || '?'}</td></tr>
          <tr><td>Armor</td><td>${shipData.armor || template.armor || 0}</td></tr>
        </table>
      </div>

      <div class="config-section">
        <h4>Drives & Power</h4>
        <table class="config-table">
          <tr><td>Maneuver</td><td>${drives.mDrive}-G</td></tr>
          <tr><td>Jump</td><td>Jump-${drives.jDrive}</td></tr>
          <tr><td>Power Plant</td><td>${drives.powerPlant}</td></tr>
        </table>
      </div>

      <div class="config-section">
        <h4>Fuel & Cargo</h4>
        <table class="config-table">
          <tr><td>Fuel Capacity</td><td>${shipData.fuel || template.fuel || '?'} tons</td></tr>
          <tr><td>Cargo Capacity</td><td>${shipData.cargo || template.cargo || '?'} tons</td></tr>
        </table>
      </div>

      <div class="config-section">
        <h4>Weapons (${weapons.length})</h4>
        ${weapons.length === 0 ? '<div class="config-empty">No weapons installed</div>' : `
        <table class="config-table">
          ${weapons.map(w => `
            <tr>
              <td>${w.name || 'Weapon'}</td>
              <td>${w.damage || '?'} dmg</td>
              <td>${w.mount || 'Turret'}</td>
            </tr>
          `).join('')}
        </table>
        `}
      </div>

      <div class="config-section">
        <h4>Accommodations</h4>
        <table class="config-table">
          <tr><td>Staterooms</td><td>${shipData.staterooms || template.staterooms || '?'}</td></tr>
          <tr><td>Low Berths</td><td>${shipData.lowBerths || template.lowBerths || 0}</td></tr>
        </table>
      </div>
    </div>
  `;

  showModalContent(html);
}

// ==================== AR-48: Medical Records ====================

function showMedicalRecords() {
  // Request health data from server
  state.socket.emit('ops:getMedicalRecords');

  // Show loading state
  const html = `
    <div class="modal-header">
      <h2>🏥 Medical Records</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body medical-records">
      <div class="loading">Loading medical data...</div>
    </div>
  `;
  showModalContent(html);
}

function handleMedicalRecords(data) {
  const { health = [], triage = [] } = data;
  const modalBody = document.querySelector('.modal-body.medical-records');
  if (!modalBody) return;

  let html = '';

  if (triage.length === 0 && health.length === 0) {
    // AR-93: Medical Records Easter Egg - Traveller-themed medical humor
    const medicalJokes = [
      { warning: 'CAUTION: Crew member claims "space madness" is real', note: 'Recommend ignoring unless they start talking to the ship.' },
      { warning: 'REMINDER: Jump sickness is not cured by "hair of the dog"', note: 'Engineering has been notified about the still.' },
      { warning: 'NOTE: "Vacc suit rash" is not contagious', note: 'But telling the crew that is.' },
      { warning: 'ALERT: Someone has been eating the Zhodani rations again', note: 'Telepathic indigestion is not covered by ship insurance.' },
      { warning: 'WARNING: Ship medic found practicing with a "healing crystal"', note: 'It was a broken sensor relay.' },
      { warning: 'NOTICE: Low gravity bone density is not an excuse to skip workout', note: 'Captain has authorized "motivational airlocks."' },
      { warning: 'UPDATE: Cure for "Vargr fleas" still not found', note: 'Recommend not arm wrestling on shore leave.' },
      { warning: 'MEMO: "Aslan honor duel wounds" not covered as workplace injury', note: 'Should have declined the challenge.' }
    ];
    const joke = medicalJokes[Math.floor(Math.random() * medicalJokes.length)];
    html = `
      <div class="medical-summary" style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
        <h4>All Crew Healthy</h4>
        <p style="color: var(--text-muted);">No injuries or conditions to report.</p>
        <hr style="margin: 20px 0; border-color: var(--border-color);">
        <div style="text-align: left; padding: 10px; background: rgba(255,193,7,0.1); border-radius: 4px; border-left: 3px solid var(--warning-color);">
          <strong style="color: var(--warning-color);">${joke.warning}</strong>
          <p style="color: var(--text-muted); margin: 5px 0 0 0; font-size: 0.9em;">${joke.note}</p>
        </div>
      </div>
    `;
  } else {
    // Triage section (urgent cases first)
    if (triage.length > 0) {
      html += '<div class="medical-section"><h4>Triage Priority</h4><div class="triage-list">';
      for (const t of triage) {
        const severityClass = t.severity === 'critical' ? 'text-danger' : t.severity === 'severe' ? 'text-warning' : '';
        html += `
          <div class="triage-item">
            <span class="triage-name">${escapeHtml(t.name || 'Unknown')}</span>
            <span class="triage-severity ${severityClass}">${t.severity || 'stable'}</span>
            <span class="triage-wounds">${t.wounds || 0} wounds</span>
          </div>
        `;
      }
      html += '</div></div>';
    }

    // Full health records
    html += '<div class="medical-section"><h4>Crew Health Status</h4><div class="health-list">';
    for (const h of health) {
      const statusColor = h.consciousness === 'alert' ? 'text-success' :
                          h.consciousness === 'unconscious' ? 'text-danger' : 'text-warning';
      const woundCount = h.wounds?.length || 0;
      const conditionCount = h.conditions?.length || 0;

      html += `
        <div class="health-item" style="padding: 8px; border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between;">
            <strong>${escapeHtml(h.name || h.character_id || 'Unknown')}</strong>
            <span class="${statusColor}">${h.consciousness || 'alert'}</span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted);">
            END: ${h.current_end ?? '?'}/${h.max_end ?? '?'} |
            Wounds: ${woundCount} | Conditions: ${conditionCount}
            ${h.total_dm ? ` | DM: ${h.total_dm}` : ''}
          </div>
        </div>
      `;
    }
    html += '</div></div>';
  }

  modalBody.innerHTML = html;
}

// ==================== GM Prep Panel (AUTORUN-8) ====================

// Initialize prep panel event listeners
function initPrepPanel() {
  // Toggle button - open panel
  const toggleBtn = document.getElementById('btn-toggle-prep-panel');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', openPrepPanel);
  }

  // Close button
  const closeBtn = document.getElementById('btn-close-prep-panel');
  if (closeBtn) {
    closeBtn.addEventListener('click', closePrepPanel);
  }

  // Tab switching
  document.querySelectorAll('.prep-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchPrepTab(tabName);
    });
  });

  // Add buttons (Stage 8.1 focuses on Reveals tab)
  const btnAddReveal = document.getElementById('btn-add-reveal');
  if (btnAddReveal) {
    btnAddReveal.addEventListener('click', showAddRevealModal);
  }
}

// Open prep panel
function openPrepPanel() {
  const panel = document.getElementById('gm-prep-panel');
  const toggle = document.getElementById('btn-toggle-prep-panel');
  if (panel) panel.classList.remove('hidden');
  if (toggle) toggle.classList.add('hidden');
  // Load current prep data
  loadPrepData();
}

// Close prep panel
function closePrepPanel() {
  const panel = document.getElementById('gm-prep-panel');
  const toggle = document.getElementById('btn-toggle-prep-panel');
  if (panel) panel.classList.add('hidden');
  if (toggle) toggle.classList.remove('hidden');
}

// Switch between prep tabs
function switchPrepTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.prep-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.prep-tab-content').forEach(content => {
    const isActive = content.id === `prep-tab-${tabName}`;
    content.classList.toggle('active', isActive);
  });
}

// Load prep data from server/state
function loadPrepData() {
  // Request prep data from server if not cached
  if (state.campaign?.id) {
    state.socket.emit('ops:getPrepData', { campaignId: state.campaign.id });
  }
  // Render all prep tabs
  renderPrepReveals();
  renderPrepNpcs();
  renderPrepLocations();
  renderPrepEvents();
  renderPrepEmails();
  renderPrepHandouts();
  renderPrepModules();
}

// ==================== Reveals (Stage 8.1) ====================

// Render reveals list
function renderPrepReveals() {
  const list = document.getElementById('reveals-list');
  const count = document.getElementById('reveals-count');
  const reveals = state.prepReveals || [];

  if (count) count.textContent = `${reveals.length} reveal${reveals.length !== 1 ? 's' : ''}`;

  if (!list) return;

  if (reveals.length === 0) {
    list.innerHTML = '<p class="placeholder">No reveals prepared</p>';
    return;
  }

  list.innerHTML = reveals.map(reveal => `
    <div class="prep-item" data-reveal-id="${reveal.id}">
      <div class="prep-item-header">
        <span class="prep-item-title">${escapeHtml(reveal.title)}</span>
        <span class="prep-item-status ${reveal.status}">${reveal.status}</span>
      </div>
      <div class="prep-item-desc">${escapeHtml(reveal.description || '')}</div>
      <div class="prep-item-meta">
        <span>Type: ${reveal.type || 'info'}</span>
        ${reveal.target ? `<span>To: ${reveal.target}</span>` : ''}
      </div>
      <div class="prep-item-actions">
        <button class="btn btn-primary" onclick="revealToPlayers('${reveal.id}')">Reveal</button>
        <button class="btn" onclick="editReveal('${reveal.id}')">Edit</button>
        <button class="btn btn-danger" onclick="deleteReveal('${reveal.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// Show modal to add new reveal
function showAddRevealModal() {
  const html = `
    <div class="modal-header">
      <h2>Add Reveal</h2>
      <button class="btn-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label for="reveal-title">Title</label>
        <input type="text" id="reveal-title" class="form-input" placeholder="Brief title for GM reference">
      </div>
      <div class="form-group">
        <label for="reveal-type">Type</label>
        <select id="reveal-type" class="form-input">
          <option value="info">Information</option>
          <option value="secret">Secret</option>
          <option value="clue">Clue</option>
          <option value="event">Event Trigger</option>
          <option value="npc">NPC Introduction</option>
        </select>
      </div>
      <div class="form-group">
        <label for="reveal-description">Content (shown to players)</label>
        <textarea id="reveal-description" class="form-input" rows="4" placeholder="What players will see when revealed"></textarea>
      </div>
      <div class="form-group">
        <label for="reveal-target">Target (optional)</label>
        <select id="reveal-target" class="form-input">
          <option value="">All Players</option>
          <option value="captain">Captain Only</option>
          <option value="pilot">Pilot Only</option>
          <option value="sensor_operator">Sensor Operator Only</option>
        </select>
      </div>
      <div class="form-group">
        <label for="reveal-notes">GM Notes (not shown to players)</label>
        <textarea id="reveal-notes" class="form-input" rows="2" placeholder="Private notes for GM"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitReveal()">Add Reveal</button>
    </div>
  `;
  showModalContent(html);
}

// Submit new reveal
function submitReveal() {
  const title = document.getElementById('reveal-title')?.value?.trim();
  const type = document.getElementById('reveal-type')?.value;
  const description = document.getElementById('reveal-description')?.value?.trim();
  const target = document.getElementById('reveal-target')?.value;
  const notes = document.getElementById('reveal-notes')?.value?.trim();

  if (!title) {
    showNotification('Title is required', 'error');
    return;
  }

  if (!description) {
    showNotification('Content is required', 'error');
    return;
  }

  state.socket.emit('ops:addReveal', {
    campaignId: state.campaign.id,
    title,
    type,
    description,
    target: target || null,
    notes: notes || null
  });

  closeModal();
  showNotification('Reveal added', 'success');
}

// Reveal to players
function revealToPlayers(revealId) {
  const reveal = (state.prepReveals || []).find(r => r.id === revealId);
  if (!reveal) return;

  // Confirm before revealing
  if (confirm(`Reveal "${reveal.title}" to ${reveal.target || 'all players'}?`)) {
    state.socket.emit('ops:executeReveal', {
      campaignId: state.campaign.id,
      revealId
    });
  }
}

// Edit reveal
function editReveal(revealId) {
  const reveal = (state.prepReveals || []).find(r => r.id === revealId);
  if (!reveal) return;

  const html = `
    <div class="modal-header">
      <h2>Edit Reveal</h2>
      <button class="btn-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label for="reveal-title">Title</label>
        <input type="text" id="reveal-title" class="form-input" value="${escapeHtml(reveal.title)}">
      </div>
      <div class="form-group">
        <label for="reveal-type">Type</label>
        <select id="reveal-type" class="form-input">
          <option value="info" ${reveal.type === 'info' ? 'selected' : ''}>Information</option>
          <option value="secret" ${reveal.type === 'secret' ? 'selected' : ''}>Secret</option>
          <option value="clue" ${reveal.type === 'clue' ? 'selected' : ''}>Clue</option>
          <option value="event" ${reveal.type === 'event' ? 'selected' : ''}>Event Trigger</option>
          <option value="npc" ${reveal.type === 'npc' ? 'selected' : ''}>NPC Introduction</option>
        </select>
      </div>
      <div class="form-group">
        <label for="reveal-description">Content</label>
        <textarea id="reveal-description" class="form-input" rows="4">${escapeHtml(reveal.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label for="reveal-target">Target</label>
        <select id="reveal-target" class="form-input">
          <option value="" ${!reveal.target ? 'selected' : ''}>All Players</option>
          <option value="captain" ${reveal.target === 'captain' ? 'selected' : ''}>Captain Only</option>
          <option value="pilot" ${reveal.target === 'pilot' ? 'selected' : ''}>Pilot Only</option>
          <option value="sensor_operator" ${reveal.target === 'sensor_operator' ? 'selected' : ''}>Sensor Operator Only</option>
        </select>
      </div>
      <div class="form-group">
        <label for="reveal-notes">GM Notes</label>
        <textarea id="reveal-notes" class="form-input" rows="2">${escapeHtml(reveal.notes || '')}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="updateReveal('${revealId}')">Save Changes</button>
    </div>
  `;
  showModalContent(html);
}

// Update reveal
function updateReveal(revealId) {
  const title = document.getElementById('reveal-title')?.value?.trim();
  const type = document.getElementById('reveal-type')?.value;
  const description = document.getElementById('reveal-description')?.value?.trim();
  const target = document.getElementById('reveal-target')?.value;
  const notes = document.getElementById('reveal-notes')?.value?.trim();

  if (!title || !description) {
    showNotification('Title and content are required', 'error');
    return;
  }

  state.socket.emit('ops:updateReveal', {
    campaignId: state.campaign.id,
    revealId,
    title,
    type,
    description,
    target: target || null,
    notes: notes || null
  });

  closeModal();
  showNotification('Reveal updated', 'success');
}

// Delete reveal
function deleteReveal(revealId) {
  if (confirm('Delete this reveal?')) {
    state.socket.emit('ops:deleteReveal', {
      campaignId: state.campaign.id,
      revealId
    });
    showNotification('Reveal deleted', 'info');
  }
}

// Show reveal modal for players
function showPlayerRevealModal(data) {
  const html = `
    <div class="modal-header">
      <h2>${data.type === 'secret' ? '🔒 Secret' : data.type === 'clue' ? '🔍 Clue' : 'ℹ️ Information'}</h2>
      <button class="btn-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="reveal-content" style="font-size: 16px; line-height: 1.6; padding: 16px 0;">
        ${escapeHtml(data.content).replace(/\n/g, '<br>')}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal()">Acknowledged</button>
    </div>
  `;
  showModalContent(html);
}

// ==================== NPCs (Stage 8.2) ====================

function renderPrepNpcs() {
  const list = document.getElementById('npcs-list');
  const count = document.getElementById('npcs-count');
  const npcs = state.prepNpcs || [];

  if (count) count.textContent = `${npcs.length} NPC${npcs.length !== 1 ? 's' : ''}`;
  if (!list) return;

  if (npcs.length === 0) {
    list.innerHTML = '<p class="placeholder">No NPCs prepared</p>';
    return;
  }

  list.innerHTML = npcs.map(npc => `
    <div class="prep-item" data-npc-id="${npc.id}">
      <div class="prep-item-header">
        <span class="prep-item-title">${escapeHtml(npc.name)}</span>
        <span class="prep-item-status ${npc.visibility}">${npc.visibility}</span>
      </div>
      <div class="prep-item-desc">
        ${npc.title ? `<strong>${escapeHtml(npc.title)}</strong> - ` : ''}
        ${escapeHtml(npc.role || 'neutral')}
        ${npc.location_text ? ` @ ${escapeHtml(npc.location_text)}` : ''}
      </div>
      <div class="prep-item-meta">
        <span>Status: ${npc.current_status || 'alive'}</span>
        ${npc.motivation_hidden ? '<span>Has hidden motivation</span>' : ''}
      </div>
      <div class="prep-item-actions">
        ${npc.visibility === 'hidden' ?
          `<button class="btn btn-primary" onclick="revealNpc('${npc.id}')">Reveal</button>` :
          `<button class="btn" onclick="hideNpc('${npc.id}')">Hide</button>`
        }
        <button class="btn" onclick="showNpcDetail('${npc.id}')">Detail</button>
      </div>
    </div>
  `).join('');
}

function revealNpc(npcId) {
  state.socket.emit('ops:revealNPC', { npcId });
  // Optimistic update
  const npc = state.prepNpcs.find(n => n.id === npcId);
  if (npc) {
    npc.visibility = 'revealed';
    renderPrepNpcs();
  }
  showNotification('NPC revealed to players', 'success');
}

function hideNpc(npcId) {
  // Would need ops:hideNPC handler - for now just update locally
  const npc = state.prepNpcs.find(n => n.id === npcId);
  if (npc) {
    npc.visibility = 'hidden';
    renderPrepNpcs();
  }
}

function showNpcDetail(npcId) {
  const npc = state.prepNpcs.find(n => n.id === npcId);
  if (!npc) return;

  const html = `
    <div class="modal-header">
      <h2>${escapeHtml(npc.name)}</h2>
      <button class="btn-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      ${npc.title ? `<p><strong>Title:</strong> ${escapeHtml(npc.title)}</p>` : ''}
      <p><strong>Role:</strong> ${escapeHtml(npc.role || 'neutral')}</p>
      <p><strong>Status:</strong> ${escapeHtml(npc.current_status || 'alive')}</p>
      ${npc.location_text ? `<p><strong>Location:</strong> ${escapeHtml(npc.location_text)}</p>` : ''}
      ${npc.personality ? `<p><strong>Personality:</strong> ${escapeHtml(npc.personality)}</p>` : ''}
      ${npc.motivation_public ? `<p><strong>Public Motivation:</strong> ${escapeHtml(npc.motivation_public)}</p>` : ''}
      ${npc.motivation_hidden ? `<p><strong>Hidden Motivation:</strong> <em>${escapeHtml(npc.motivation_hidden)}</em></p>` : ''}
      ${npc.background ? `<p><strong>Background:</strong> ${escapeHtml(npc.background)}</p>` : ''}
      ${npc.notes ? `<p><strong>GM Notes:</strong> ${escapeHtml(npc.notes)}</p>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Close</button>
      ${npc.visibility === 'hidden' ?
        `<button class="btn btn-primary" onclick="revealNpc('${npc.id}'); closeModal();">Reveal</button>` : ''
      }
    </div>
  `;
  showModalContent(html);
}

// ==================== Locations (Stage 8.2) ====================

function renderPrepLocations() {
  const list = document.getElementById('locations-list');
  const count = document.getElementById('locations-count');
  const locations = state.prepLocations || [];

  if (count) count.textContent = `${locations.length} location${locations.length !== 1 ? 's' : ''}`;
  if (!list) return;

  if (locations.length === 0) {
    list.innerHTML = '<p class="placeholder">No locations prepared</p>';
    return;
  }

  // Build tree structure
  const rootLocs = locations.filter(l => !l.parent_id);
  const childMap = {};
  locations.forEach(l => {
    if (l.parent_id) {
      if (!childMap[l.parent_id]) childMap[l.parent_id] = [];
      childMap[l.parent_id].push(l);
    }
  });

  function renderLoc(loc, depth = 0) {
    const children = childMap[loc.id] || [];
    const indent = depth * 16;
    return `
      <div class="prep-item" style="margin-left: ${indent}px" data-location-id="${loc.id}">
        <div class="prep-item-header">
          <span class="prep-item-title">${escapeHtml(loc.name)}</span>
          <span class="prep-item-status ${loc.visibility}">${loc.visibility}</span>
        </div>
        <div class="prep-item-desc">
          ${escapeHtml(loc.location_type || 'scene')}
          ${loc.uwp ? ` (${escapeHtml(loc.uwp)})` : ''}
        </div>
        <div class="prep-item-actions">
          ${loc.visibility === 'hidden' ?
            `<button class="btn btn-primary btn-sm" onclick="revealLocation('${loc.id}')">Reveal</button>` :
            `<button class="btn btn-sm" onclick="hideLocation('${loc.id}')">Hide</button>`
          }
        </div>
      </div>
      ${children.map(c => renderLoc(c, depth + 1)).join('')}
    `;
  }

  list.innerHTML = rootLocs.map(loc => renderLoc(loc)).join('');
}

function revealLocation(locationId) {
  state.socket.emit('ops:revealLocation', { locationId });
  const loc = state.prepLocations.find(l => l.id === locationId);
  if (loc) {
    loc.visibility = 'revealed';
    renderPrepLocations();
  }
  showNotification('Location revealed', 'success');
}

function hideLocation(locationId) {
  const loc = state.prepLocations.find(l => l.id === locationId);
  if (loc) {
    loc.visibility = 'hidden';
    renderPrepLocations();
  }
}

// ==================== Events (Stage 8.2) ====================

function renderPrepEvents() {
  const list = document.getElementById('events-list');
  const count = document.getElementById('events-count');
  const events = state.prepEvents || [];

  if (count) count.textContent = `${events.length} event${events.length !== 1 ? 's' : ''}`;
  if (!list) return;

  if (events.length === 0) {
    list.innerHTML = '<p class="placeholder">No events prepared</p>';
    return;
  }

  // Sort by trigger_date if available
  const sorted = [...events].sort((a, b) => {
    if (a.trigger_date && b.trigger_date) return a.trigger_date.localeCompare(b.trigger_date);
    if (a.trigger_date) return -1;
    if (b.trigger_date) return 1;
    return 0;
  });

  list.innerHTML = sorted.map(event => `
    <div class="prep-item" data-event-id="${event.id}">
      <div class="prep-item-header">
        <span class="prep-item-title">${escapeHtml(event.name)}</span>
        <span class="prep-item-status ${event.status}">${event.status}</span>
      </div>
      <div class="prep-item-desc">${escapeHtml(event.description || '')}</div>
      <div class="prep-item-meta">
        <span>Type: ${event.event_type || 'manual'}</span>
        ${event.trigger_date ? `<span>Date: ${event.trigger_date}</span>` : ''}
        ${event.reveals_to_trigger?.length ? `<span>Reveals: ${event.reveals_to_trigger.length}</span>` : ''}
        ${event.npcs_to_reveal?.length ? `<span>NPCs: ${event.npcs_to_reveal.length}</span>` : ''}
      </div>
      <div class="prep-item-actions">
        ${event.status === 'pending' ?
          `<button class="btn btn-primary" onclick="triggerEvent('${event.id}')">Trigger</button>` :
          `<span class="text-muted">Triggered</span>`
        }
        <button class="btn" onclick="showEventDetail('${event.id}')">Detail</button>
      </div>
    </div>
  `).join('');
}

function triggerEvent(eventId) {
  state.socket.emit('ops:triggerEvent', {
    campaignId: state.campaign.id,
    eventId,
    gameDate: state.gameDate
  });
  const event = state.prepEvents.find(e => e.id === eventId);
  if (event) {
    event.status = 'triggered';
    renderPrepEvents();
  }
  showNotification('Event triggered', 'success');
}

function showEventDetail(eventId) {
  const event = state.prepEvents.find(e => e.id === eventId);
  if (!event) return;

  const html = `
    <div class="modal-header">
      <h2>${escapeHtml(event.name)}</h2>
      <button class="btn-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <p><strong>Type:</strong> ${escapeHtml(event.event_type || 'manual')}</p>
      <p><strong>Status:</strong> ${escapeHtml(event.status)}</p>
      ${event.trigger_date ? `<p><strong>Trigger Date:</strong> ${escapeHtml(event.trigger_date)}</p>` : ''}
      ${event.description ? `<p><strong>Description:</strong> ${escapeHtml(event.description)}</p>` : ''}
      ${event.player_text ? `<p><strong>Player Text:</strong> ${escapeHtml(event.player_text)}</p>` : ''}
      ${event.reveals_to_trigger?.length ? `<p><strong>Reveals:</strong> ${event.reveals_to_trigger.length} linked</p>` : ''}
      ${event.npcs_to_reveal?.length ? `<p><strong>NPCs to reveal:</strong> ${event.npcs_to_reveal.length}</p>` : ''}
      ${event.emails_to_send?.length ? `<p><strong>Emails to send:</strong> ${event.emails_to_send.length}</p>` : ''}
      ${event.notes ? `<p><strong>GM Notes:</strong> ${escapeHtml(event.notes)}</p>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Close</button>
      ${event.status === 'pending' ?
        `<button class="btn btn-primary" onclick="triggerEvent('${event.id}'); closeModal();">Trigger Now</button>` : ''
      }
    </div>
  `;
  showModalContent(html);
}

// ==================== Email Queue (Stage 8.3) ====================

function renderPrepEmails() {
  const list = document.getElementById('email-list');
  const count = document.getElementById('email-count');
  const emails = state.prepEmails || {};
  const drafts = emails.drafts || [];
  const queued = emails.queued || [];
  const sent = emails.sent || [];
  const total = drafts.length + queued.length + sent.length;

  if (count) count.textContent = `${total} email${total !== 1 ? 's' : ''}`;
  if (!list) return;

  if (total === 0) {
    list.innerHTML = '<p class="placeholder">No emails prepared</p>';
    return;
  }

  let html = '';

  // Drafts
  if (drafts.length > 0) {
    html += `<div class="email-section"><h4>Drafts (${drafts.length})</h4>`;
    html += drafts.map(email => renderEmailItem(email, 'draft')).join('');
    html += '</div>';
  }

  // Queued
  if (queued.length > 0) {
    html += `<div class="email-section"><h4>Queued (${queued.length})</h4>`;
    html += queued.map(email => renderEmailItem(email, 'queued')).join('');
    html += '</div>';
  }

  // Sent (collapsed by default)
  if (sent.length > 0) {
    html += `<div class="email-section"><h4>Sent (${sent.length})</h4>`;
    html += sent.slice(0, 5).map(email => renderEmailItem(email, 'sent')).join('');
    if (sent.length > 5) html += `<p class="text-muted">...and ${sent.length - 5} more</p>`;
    html += '</div>';
  }

  list.innerHTML = html;
}

function renderEmailItem(email, status) {
  return `
    <div class="prep-item" data-email-id="${email.id}">
      <div class="prep-item-header">
        <span class="prep-item-title">${escapeHtml(email.subject || 'No subject')}</span>
        <span class="prep-item-status ${status}">${status}</span>
      </div>
      <div class="prep-item-desc">
        From: ${escapeHtml(email.sender_name || 'Unknown')} |
        To: ${escapeHtml(email.recipient_type || 'player')}
      </div>
      <div class="prep-item-meta">
        ${email.queued_for_date ? `<span>Scheduled: ${email.queued_for_date}</span>` : ''}
        ${email.sent_date ? `<span>Sent: ${email.sent_date}</span>` : ''}
      </div>
      ${status !== 'sent' ? `
        <div class="prep-item-actions">
          <button class="btn btn-primary btn-sm" onclick="sendEmailNow('${email.id}')">Send Now</button>
          ${status === 'draft' ? `<button class="btn btn-sm" onclick="queueEmail('${email.id}')">Queue</button>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function sendEmailNow(emailId) {
  state.socket.emit('ops:sendEmail', {
    emailId,
    sentDate: state.gameDate,
    deliveryDate: state.gameDate
  });
  showNotification('Email sent', 'success');
  // Reload prep data
  loadPrepData();
}

function queueEmail(emailId) {
  const date = prompt('Enter game date to send (e.g., 1105-042):');
  if (!date) return;
  state.socket.emit('ops:queueEmail', { emailId, queuedForDate: date });
  showNotification(`Email queued for ${date}`, 'success');
  loadPrepData();
}

// ==================== Handouts / Assets (Stage 8.3) ====================

function renderPrepHandouts() {
  const list = document.getElementById('handouts-list');
  const count = document.getElementById('handouts-count');
  const handouts = state.prepHandouts || [];

  if (count) count.textContent = `${handouts.length} handout${handouts.length !== 1 ? 's' : ''}`;
  if (!list) return;

  if (handouts.length === 0) {
    list.innerHTML = '<p class="placeholder">No handouts prepared</p>';
    return;
  }

  list.innerHTML = handouts.map(handout => `
    <div class="prep-item" data-handout-id="${handout.id}">
      <div class="prep-item-header">
        <span class="prep-item-title">${escapeHtml(handout.title)}</span>
        <span class="prep-item-status ${handout.visibility}">${handout.visibility}</span>
      </div>
      <div class="prep-item-desc">
        Type: ${handout.handout_type || 'document'}
        ${handout.file_url ? ' | Has file' : ''}
      </div>
      <div class="prep-item-actions">
        ${handout.visibility === 'hidden' ?
          `<button class="btn btn-primary btn-sm" onclick="shareHandout('${handout.id}')">Share</button>` :
          `<button class="btn btn-sm" onclick="hideHandout('${handout.id}')">Hide</button>`
        }
        <button class="btn btn-sm" onclick="showHandoutDetail('${handout.id}')">View</button>
      </div>
    </div>
  `).join('');
}

function shareHandout(handoutId) {
  state.socket.emit('ops:shareHandout', { handoutId });
  const handout = state.prepHandouts.find(h => h.id === handoutId);
  if (handout) {
    handout.visibility = 'revealed';
    renderPrepHandouts();
  }
  showNotification('Handout shared with players', 'success');
}

function hideHandout(handoutId) {
  const handout = state.prepHandouts.find(h => h.id === handoutId);
  if (handout) {
    handout.visibility = 'hidden';
    renderPrepHandouts();
  }
}

function showHandoutDetail(handoutId) {
  const handout = state.prepHandouts.find(h => h.id === handoutId);
  if (!handout) return;

  const html = `
    <div class="modal-header">
      <h2>${escapeHtml(handout.title)}</h2>
      <button class="btn-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <p><strong>Type:</strong> ${escapeHtml(handout.handout_type || 'document')}</p>
      <p><strong>Visibility:</strong> ${escapeHtml(handout.visibility)}</p>
      ${handout.file_url ? `<p><strong>File:</strong> <a href="${escapeHtml(handout.file_url)}" target="_blank">View</a></p>` : ''}
      ${handout.content_text ? `<div class="handout-content">${escapeHtml(handout.content_text)}</div>` : ''}
      ${handout.notes ? `<p><strong>GM Notes:</strong> ${escapeHtml(handout.notes)}</p>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Close</button>
      ${handout.visibility === 'hidden' ?
        `<button class="btn btn-primary" onclick="shareHandout('${handout.id}'); closeModal();">Share</button>` : ''
      }
    </div>
  `;
  showModalContent(html);
}

// ==================== Adventure Modules (AR-140) ====================

// State for modules
state.adventureModules = state.adventureModules || [];

function renderPrepModules() {
  const list = document.getElementById('modules-list');
  const count = document.getElementById('modules-count');
  const modules = state.adventureModules || [];

  if (count) count.textContent = `${modules.length} module${modules.length !== 1 ? 's' : ''}`;
  if (!list) return;

  if (modules.length === 0) {
    list.innerHTML = '<p class="placeholder">No adventure modules imported</p>';
    return;
  }

  list.innerHTML = modules.map(mod => `
    <div class="prep-item" data-module-id="${mod.id}">
      <div class="prep-item-header">
        <span class="prep-item-title">${escapeHtml(mod.module_name)}</span>
        <span class="prep-item-status ${mod.is_active ? 'active' : 'inactive'}">${mod.is_active ? 'Active' : 'Disabled'}</span>
      </div>
      <div class="prep-item-desc">
        v${escapeHtml(mod.module_version || '1.0')} | Imported: ${new Date(mod.imported_at).toLocaleDateString()}
      </div>
      <div class="prep-item-actions">
        <button class="btn btn-sm ${mod.is_active ? 'btn-warning' : 'btn-success'}" onclick="toggleModule('${mod.id}', ${!mod.is_active})">
          ${mod.is_active ? 'Disable' : 'Enable'}
        </button>
        <button class="btn btn-sm" onclick="showModuleDetail('${mod.id}')">Details</button>
        <button class="btn btn-sm btn-danger" onclick="deleteModule('${mod.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function showImportModuleModal() {
  const html = `
    <div class="modal-header">
      <h2>Import Adventure Module</h2>
      <button class="btn-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label for="module-name">Module Name</label>
        <input type="text" id="module-name" class="form-input" placeholder="Name for this module">
      </div>
      <div class="form-group">
        <label for="module-file">Adventure JSON File</label>
        <input type="file" id="module-file" class="form-input" accept=".json">
      </div>
      <p class="text-muted">Upload a .json file exported from the Export button or another Traveller VTT campaign.</p>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="importModuleFromFile()">Import</button>
    </div>
  `;
  showModalContent(html);
}

function importModuleFromFile() {
  const fileInput = document.getElementById('module-file');
  const nameInput = document.getElementById('module-name');
  const file = fileInput?.files?.[0];
  const moduleName = nameInput?.value?.trim();

  if (!file) {
    showError('Please select a file to import');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const adventureData = JSON.parse(e.target.result);
      state.socket.emit('ops:importModule', {
        adventureData,
        moduleName: moduleName || adventureData.manifest?.campaignName || file.name.replace('.json', '')
      });
      closeModal();
      showNotification('Importing module...', 'info');
    } catch (err) {
      showError('Invalid JSON file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function toggleModule(moduleId, isActive) {
  state.socket.emit('ops:toggleModule', { moduleId, isActive });
}

function deleteModule(moduleId) {
  if (!confirm('Delete this module and all its content? This cannot be undone.')) return;
  state.socket.emit('ops:deleteModule', { moduleId });
}

function showModuleDetail(moduleId) {
  state.socket.emit('ops:getModuleSummary', { moduleId });
}

// Socket listeners for modules
if (state.socket) {
  state.socket.on('ops:moduleList', (data) => {
    state.adventureModules = data.modules || [];
    renderPrepModules();
  });

  state.socket.on('ops:moduleImported', (data) => {
    showNotification(`Module "${data.moduleName}" imported successfully!`, 'success');
    state.socket.emit('ops:getModules');
    // Refresh prep data to show imported content
    state.socket.emit('ops:getPrepData', { campaignId: state.campaign?.id });
  });

  state.socket.on('ops:moduleUpdated', (data) => {
    const idx = state.adventureModules.findIndex(m => m.id === data.module.id);
    if (idx >= 0) state.adventureModules[idx] = data.module;
    renderPrepModules();
  });

  state.socket.on('ops:moduleDeleted', (data) => {
    state.adventureModules = state.adventureModules.filter(m => m.id !== data.moduleId);
    renderPrepModules();
    showNotification('Module deleted', 'info');
    // Refresh prep data
    state.socket.emit('ops:getPrepData', { campaignId: state.campaign?.id });
  });

  state.socket.on('ops:moduleSummary', (data) => {
    const summary = data.summary;
    if (!summary) {
      showError('Module not found');
      return;
    }
    const counts = summary.contentCounts || {};
    const html = `
      <div class="modal-header">
        <h2>${escapeHtml(summary.module_name)}</h2>
        <button class="btn-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <p><strong>Version:</strong> ${escapeHtml(summary.module_version)}</p>
        <p><strong>Status:</strong> ${summary.is_active ? 'Active' : 'Disabled'}</p>
        <p><strong>Imported:</strong> ${new Date(summary.imported_at).toLocaleString()}</p>
        <h4>Content Summary</h4>
        <table class="info-table">
          <tr><th>Type</th><th>Total</th><th>Gated</th></tr>
          ${Object.entries(counts).map(([type, c]) =>
            `<tr><td>${type}</td><td>${c.total}</td><td>${c.gated}</td></tr>`
          ).join('')}
        </table>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Close</button>
      </div>
    `;
    showModalContent(html);
  });
}

// ==================== Expandable Role Panel (Stage 13.3) ====================

/**
 * Expand role panel to half-screen, full-screen, or pilot-map mode
 * @param {string} mode - 'half', 'full', or 'pilot-map'
 */
function expandRolePanel(mode) {
  const rolePanel = document.getElementById('role-panel');
  const bridgeMain = document.querySelector('.bridge-main');

  // Collapse any existing expansion first
  collapseRolePanel();

  if (mode === 'half') {
    bridgeMain.classList.add('role-expanded-half');
    // Also show detail view in half-screen mode
    const detail = document.getElementById('role-detail-view');
    detail?.classList.remove('hidden');
  } else if (mode === 'full') {
    rolePanel.classList.add('expanded-full');
    // Also show detail view in full-screen mode
    const detail = document.getElementById('role-detail-view');
    detail?.classList.remove('hidden');
  } else if (mode === 'pilot-map') {
    // AR-94: Pilot default view - panel 1/3, system map 2/3
    bridgeMain.classList.add('pilot-map-layout');
    const detail = document.getElementById('role-detail-view');
    detail?.classList.remove('hidden');
    // Show embedded system map
    showEmbeddedSystemMap();
  }

  // Remember expansion state for this role
  if (state.selectedRole) {
    state.selectedRolePanelExpanded = state.selectedRolePanelExpanded || {};
    state.selectedRolePanelExpanded[state.selectedRole] = mode;
  }
}

/**
 * Collapse role panel back to normal size
 */
function collapseRolePanel() {
  const rolePanel = document.getElementById('role-panel');
  const bridgeMain = document.querySelector('.bridge-main');

  rolePanel.classList.remove('expanded-full');
  bridgeMain.classList.remove('role-expanded-half');
  bridgeMain.classList.remove('pilot-map-layout');  // AR-94
  hideEmbeddedSystemMap();  // AR-94

  // Clear remembered expansion state
  if (state.selectedRole && state.selectedRolePanelExpanded) {
    state.selectedRolePanelExpanded[state.selectedRole] = null;
  }
}

/**
 * AR-29.7: Toggle generic panel expansion
 * @param {string} panelId - Panel element ID
 */
function togglePanelExpand(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  // Role panel uses its own expand system
  if (panelId === 'role-panel') {
    if (panel.classList.contains('expanded-full')) {
      collapseRolePanel();
    } else {
      expandRolePanel('full');
    }
    return;
  }

  // Generic panel expansion
  if (panel.classList.contains('panel-expanded')) {
    collapseExpandedPanel();
  } else {
    expandPanel(panelId);
  }
}

/**
 * AR-29.7: Expand a panel to overlay the main content
 * @param {string} panelId - Panel element ID
 */
function expandPanel(panelId) {
  // First collapse any existing expanded panel
  collapseExpandedPanel();

  const panel = document.getElementById(panelId);
  if (!panel) return;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'panel-expand-overlay';
  overlay.id = 'panel-expand-overlay';
  overlay.onclick = collapseExpandedPanel;
  document.body.appendChild(overlay);

  // Expand panel
  panel.classList.add('panel-expanded');
  state.expandedPanelId = panelId;
}

/**
 * AR-29.7: Collapse any expanded panel
 */
function collapseExpandedPanel() {
  const overlay = document.getElementById('panel-expand-overlay');
  if (overlay) overlay.remove();

  if (state.expandedPanelId) {
    const panel = document.getElementById(state.expandedPanelId);
    if (panel) panel.classList.remove('panel-expanded');
    state.expandedPanelId = null;
  }
}

/**
 * AR-29.7 Phase 2: Update body class for role-specific styling
 */
function updateRoleClass() {
  const body = document.body;
  // Remove any existing role classes
  body.className = body.className.replace(/\brole-\w+\b/g, '').trim();
  // Add current role class
  if (state.selectedRole) {
    body.classList.add(`role-${state.selectedRole.replace('_', '-')}`);
  }
}

/**
 * Toggle Ship Systems panel visibility
 */
function toggleShipSystemsPanel() {
  const panel = document.getElementById('ship-systems-panel');
  if (panel.classList.contains('hidden')) {
    showShipSystemsPanel();
  } else {
    hideShipSystemsPanel();
  }
}

/**
 * Show Ship Systems panel and request current status
 */
function showShipSystemsPanel() {
  const panel = document.getElementById('ship-systems-panel');
  panel.classList.remove('hidden');

  // AR-139: Show GM damage controls if GM
  showGMDamageControls();

  // Request ship systems data from server
  if (state.socket && state.selectedShipId) {
    state.socket.emit('ops:getShipSystems', { shipId: state.selectedShipId });
  }
}

/**
 * Hide Ship Systems panel
 */
function hideShipSystemsPanel() {
  const panel = document.getElementById('ship-systems-panel');
  panel.classList.add('hidden');
}

/**
 * Update Ship Systems display with damage data
 * @param {Object} systems - System status object from server
 */
function updateShipSystemsDisplay(systems) {
  const panel = document.getElementById('ship-systems-panel');
  if (!panel) return;

  let hasDamage = false;
  let hasCritical = false;

  // System severity thresholds
  const DAMAGED_THRESHOLD = 1;
  const CRITICAL_THRESHOLD = 4;

  const statusTexts = {
    0: 'Operational',
    1: 'Light Damage',
    2: 'Damaged',
    3: 'Heavy Damage',
    4: 'Critical',
    5: 'Severe',
    6: 'Destroyed'
  };

  Object.entries(systems || {}).forEach(([systemName, systemData]) => {
    const severity = systemData?.totalSeverity || 0;
    const item = panel.querySelector(`[data-system="${systemName}"]`);
    if (!item) return;

    // Clear previous state
    item.classList.remove('damaged', 'critical', 'destroyed');

    // Set new state based on severity
    if (severity >= 6) {
      item.classList.add('destroyed');
      hasCritical = true;
    } else if (severity >= CRITICAL_THRESHOLD) {
      item.classList.add('critical');
      hasCritical = true;
    } else if (severity >= DAMAGED_THRESHOLD) {
      item.classList.add('damaged');
      hasDamage = true;
    }

    // Update status text
    const statusText = item.querySelector('.system-status-text');
    if (statusText) {
      statusText.textContent = statusTexts[Math.min(severity, 6)] || 'Operational';
    }
  });

  // Update header indicator
  updateShipSystemsIndicator(hasDamage, hasCritical);
}

/**
 * Update the Ship Systems button indicator color
 */
function updateShipSystemsIndicator(hasDamage, hasCritical) {
  const indicator = document.querySelector('.ship-systems-indicator');
  if (!indicator) return;

  indicator.classList.remove('all-green', 'has-damage', 'critical-damage');

  if (hasCritical) {
    indicator.classList.add('critical-damage');
  } else if (hasDamage) {
    indicator.classList.add('has-damage');
  } else {
    indicator.classList.add('all-green');
  }
}

/**
 * Restore expansion state when switching roles
 * AR-94: Pilot defaults to 'pilot-map' layout
 */
function restoreRolePanelExpansion() {
  if (state.selectedRole && state.selectedRolePanelExpanded?.[state.selectedRole]) {
    expandRolePanel(state.selectedRolePanelExpanded[state.selectedRole]);
  } else if (state.selectedRole === 'pilot') {
    // AR-94: Pilot defaults to pilot-map layout
    expandRolePanel('pilot-map');
  }
}

/**
 * AR-15.9: Toggle browser fullscreen mode using Fullscreen API
 */
function toggleBrowserFullscreen() {
  const btn = document.getElementById('btn-fullscreen');

  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      if (btn) btn.textContent = '⛶';
      if (btn) btn.title = 'Exit Fullscreen (Esc)';
    }).catch(err => {
      console.warn('Fullscreen request failed:', err);
    });
  } else {
    document.exitFullscreen().then(() => {
      if (btn) btn.textContent = '⛶';
      if (btn) btn.title = 'Toggle Fullscreen (F)';
    });
  }
}

// Update fullscreen button on fullscreen change (e.g., Esc key)
document.addEventListener('fullscreenchange', () => {
  const btn = document.getElementById('btn-fullscreen');
  if (btn) {
    btn.title = document.fullscreenElement ? 'Exit Fullscreen (Esc)' : 'Toggle Fullscreen (F)';
  }
});

// ==================== Global Exports for onclick handlers ====================
// ES6 modules scope functions, but onclick handlers need global access
window.attemptRepair = attemptRepair;
window.openRefuelModal = openRefuelModal;
window.processFuel = processFuel;
window.updatePower = updatePower;
window.executeRefuel = executeRefuel;
window.completeJump = completeJump;
window.initiateJump = initiateJump;
window.plotJumpCourse = plotJumpCourse;
window.verifyPosition = verifyPosition;  // AR-68
window.initiateJumpFromPlot = initiateJumpFromPlot;
window.performScan = performScan;
window.toggleECM = toggleECM;
window.toggleECCM = toggleECCM;
window.toggleStealth = toggleStealth;
window.setSensorLock = setSensorLock;
window.acquireSensorLock = acquireSensorLock;
window.breakSensorLock = breakSensorLock;
window.calculateSensorDM = calculateSensorDM;
// AR-138: Sensor panel mode
window.toggleSensorPanelMode = toggleSensorPanelMode;
window.checkSensorThreats = checkSensorThreats;
window.renderMiniRadar = renderMiniRadar;
// AR-131+: Captain panel switching
window.switchCaptainPanel = switchCaptainPanel;
// AR-139: GM damage controls
window.gmApplyDamage = gmApplyDamage;
window.gmClearDamage = gmClearDamage;
window.gmRestoreAllSystems = gmRestoreAllSystems;
// AR-125L: Pirate encounter
window.gmTriggerPirateEncounter = gmTriggerPirateEncounter;
// AR-140: Adventure modules
window.showImportModuleModal = showImportModuleModal;
window.importModuleFromFile = importModuleFromFile;
window.toggleModule = toggleModule;
window.deleteModule = deleteModule;
window.showModuleDetail = showModuleDetail;
window.renderPrepModules = renderPrepModules;
// AR-128: Observer role-watching
window.observerWatchRole = 'pilot';  // Default to watching pilot
window.setObserverWatchRole = function(role) {
  window.observerWatchRole = role;
  localStorage.setItem('observerWatchRole', role);
  renderRoleDetailPanel('observer');
};
// Load saved preference
if (localStorage.getItem('observerWatchRole')) {
  window.observerWatchRole = localStorage.getItem('observerWatchRole');
}
window.authorizeWeapons = authorizeWeapons;
window.fireAtTarget = fireAtTarget;
window.fireWeapon = fireWeapon;
window.fireAllWeapons = fireAllWeapons;
window.lockTarget = lockTarget;
window.selectWeapon = selectWeapon;
window.selectWeaponByIndex = selectWeaponByIndex;
window.togglePointDefense = togglePointDefense;
window.updateFireButton = updateFireButton;
// AR-51: Gunner Weapons Reference
window.showWeaponsReference = showWeaponsReference;
window.showRangeChart = showRangeChart;
// AR-40: Library Computer
window.showLibraryComputer = showLibraryComputer;
window.searchLibrary = searchLibrary;
window.showLibraryTab = showLibraryTab;
window.decodeUWPLibrary = decodeUWPLibrary;
// AR-48: Menu features
window.showCrewRosterMenu = showCrewRosterMenu;
window.showShipConfiguration = showShipConfiguration;
window.showMedicalRecords = showMedicalRecords;
// Autorun 14: Combat contact management
window.showAddCombatContactModal = showAddCombatContactModal;
window.submitCombatContact = submitCombatContact;
window.renderCombatContactsList = renderCombatContactsList;
window.toggleWeaponsFree = toggleWeaponsFree;
window.removeCombatContact = removeCombatContact;
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
// AR-15.7: Map controls
window.setMapSize = setMapSize;
// Autorun 6: Mail, NPC contacts, and Feedback
window.showAddNPCContactForm = showAddNPCContactForm;
window.submitNPCContact = submitNPCContact;
window.hailContact = hailContact;
window.scanContact = scanContact;  // AR-70
window.hailSelectedContact = hailSelectedContact;
window.broadcastMessage = broadcastMessage;
window.sendCommsMessage = sendCommsMessage;
window.sendBridgeChatMessage = sendBridgeChatMessage;
// Panel copy functions
window.copyShipLog = copyShipLog;
window.copySensorPanel = copySensorPanel;
window.copyRolePanel = copyRolePanel;
window.closeModal = closeModal;
window.relieveCrewMember = relieveCrewMember;
window.submitFeedback = submitFeedback;
window.showFeedbackReview = showFeedbackReview;
window.copyLogAsTodo = copyLogAsTodo;
// AUTORUN-8: Prep Panel exports
window.revealToPlayers = revealToPlayers;
window.editReveal = editReveal;
window.updateReveal = updateReveal;
window.deleteReveal = deleteReveal;
window.submitReveal = submitReveal;
// Stage 8.2: NPCs, Locations, Events
window.revealNpc = revealNpc;
window.hideNpc = hideNpc;
window.showNpcDetail = showNpcDetail;
window.revealLocation = revealLocation;
window.hideLocation = hideLocation;
window.triggerEvent = triggerEvent;
window.showEventDetail = showEventDetail;
// Stage 8.3: Email Queue, Handouts
window.sendEmailNow = sendEmailNow;
window.queueEmail = queueEmail;
window.shareHandout = shareHandout;
window.hideHandout = hideHandout;
window.showHandoutDetail = showHandoutDetail;
// AR-141: Full Email App
window.openEmailApp = openEmailApp;
window.closeEmailApp = closeEmailApp;
window.showEmailCompose = showEmailCompose;
window.sendEmail = sendEmail;
window.cancelEmailCompose = cancelEmailCompose;
// Stage 13.3: Expandable Role Panel
window.expandRolePanel = expandRolePanel;
window.collapseRolePanel = collapseRolePanel;
window.restoreRolePanelExpansion = restoreRolePanelExpansion;
// AR-30: Pilot Controls
window.toggleEvasive = toggleEvasive;
window.changeRange = changeRange;
window.setCourse = setCourse;
window.clearCourse = clearCourse;
window.advanceTime = advanceTime;
// AR-64: Travel/Navigation
window.travel = travel;
window.getPendingTravel = getPendingTravel;
window.undock = undock;
// AR-31: Engineer Power Management
window.setPowerPreset = setPowerPreset;
window.updatePower = updatePower;
