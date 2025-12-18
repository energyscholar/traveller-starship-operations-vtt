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
  loadSystemFromJSON,  // Load systems from JSON files
  centerOnContact,     // AR-197: Center map on contact
  flashSystemMap       // AR-197: Flash effect for alerts
} from './modules/system-map.js';
import { applyStatusIndicators, toggleStatusIndicators } from './modules/ui-status-registry.js';
import { DEBUG, debugLog, debugWarn, debugError } from './modules/debug-config.js';
// AR-201: Socket handler modules
import './socket-handlers/campaigns.js';
import './socket-handlers/roles.js';
import './socket-handlers/bridge.js';
import './socket-handlers/navigation.js';
import './socket-handlers/ships.js';
import './socket-handlers/contacts.js';
import './socket-handlers/systems.js';
import './socket-handlers/jump.js';
import './socket-handlers/combat.js';
import { initAllHandlers, getRegisteredHandlers } from './socket-handlers/index.js';
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
import { showNPCContactsModal as _showNPCContactsModal, showAddNPCContactForm as _showAddNPCContactForm, submitNPCContact as _submitNPCContact } from './modules/npc-contacts.js';
import { showCrewRosterMenu as _showCrewRosterMenu } from './modules/crew-roster-menu.js';
import { showShipConfiguration as _showShipConfiguration } from './modules/ship-config.js';
import { showMedicalRecords as _showMedicalRecords, handleMedicalRecords } from './modules/medical-records.js';
import { showHandoutModal as _showHandoutModal } from './modules/handout-viewer.js';
import { renderPrepReveals as _renderPrepReveals, showAddRevealModal as _showAddRevealModal, submitReveal as _submitReveal, revealToPlayers as _revealToPlayers, editReveal as _editReveal, updateReveal as _updateReveal, deleteReveal as _deleteReveal, showPlayerRevealModal as _showPlayerRevealModal } from './modules/gm-reveals.js';
import { renderPrepNpcs as _renderPrepNpcs, revealNpc as _revealNpc, hideNpc as _hideNpc, showNpcDetail as _showNpcDetail } from './modules/gm-prep-npcs.js';
import { renderPrepLocations as _renderPrepLocations, revealLocation as _revealLocation, hideLocation as _hideLocation } from './modules/gm-prep-locations.js';
import { renderPrepEvents as _renderPrepEvents, triggerEvent as _triggerEvent, showEventDetail as _showEventDetail } from './modules/gm-prep-events.js';
import { renderPrepEmails as _renderPrepEmails, sendEmailNow as _sendEmailNow, queueEmail as _queueEmail } from './modules/gm-prep-emails.js';
import { renderPrepHandouts as _renderPrepHandouts, shareHandout as _shareHandout, hideHandout as _hideHandout, showHandoutDetail as _showHandoutDetail } from './modules/gm-prep-handouts.js';
import { showCrewRoster as _showCrewRoster, showAddCrewModal as _showAddCrewModal, showEditCrewModal as _showEditCrewModal } from './modules/crew-roster-full.js';
import { openHamburgerMenu, closeHamburgerMenu, handleMenuFeature as _handleMenuFeature, showLogModal as _showLogModal } from './modules/hamburger-menu.js';
import { openEmailApp as _openEmailApp, closeEmailApp, renderEmailInbox as _renderEmailInbox, showEmailCompose, sendEmail as _sendEmail, cancelEmailCompose as _cancelEmailCompose, initEmailAppHandlers as _initEmailAppHandlers } from './modules/email-app.js';
import {
  showSharedMap as _showSharedMap,
  closeSharedMap,
  updateSharedMapIframe as _updateSharedMapIframe,
  trackGMMapView as _trackGMMapView,
  updateSharedMapFrame as _updateSharedMapFrame,
  initTravellerMapListener,
  updateSharedMapBadge,
  navigateToHex as _navigateToHex,
  buildTravellerMapUrl as _buildTravellerMapUrl
} from './modules/shared-map.js';
// AR-153: Phase 1 modules
import { setPowerPreset as _setPowerPreset, updatePower as _updatePower, requestPowerStatus as _requestPowerStatus } from './modules/power-management.js';
import { updateTransitCalculator, showPhysicsExplanation as _showPhysicsExplanation, setupTransitCalculator } from './modules/transit-calculator.js';
import { copyShipLog, copySensorPanel as _copySensorPanel, copyRolePanel as _copyRolePanel } from './modules/copy-export.js';
import { requestJumpStatus as _requestJumpStatus, updateFuelEstimate as _updateFuelEstimate, plotJumpCourse as _plotJumpCourse, verifyPosition as _verifyPosition, handleJumpPlotted, initiateJumpFromPlot as _initiateJumpFromPlot, initiateJump as _initiateJump, completeJump as _completeJump, skipToJumpExit as _skipToJumpExit } from './modules/jump-travel.js';
// AR-153: Phase 2 modules
import { updateJumpMap as _updateJumpMap, fetchJumpDestinations, selectJumpDestination, initJumpMapIfNeeded as _initJumpMapIfNeeded, setMapSize, restoreMapSize, initMapInteractions } from './modules/jump-map.js';
import { performScan as _performScan, toggleECM as _toggleECM, toggleECCM as _toggleECCM, acquireSensorLock as _acquireSensorLock, breakSensorLock as _breakSensorLock, toggleStealth as _toggleStealth, setSensorLock as _setSensorLock, toggleSensorPanelMode as _toggleSensorPanelMode, checkSensorThreats as _checkSensorThreats, renderMiniRadar } from './modules/sensor-operations.js';
import { expandRolePanel as _expandRolePanel, collapseRolePanel as _collapseRolePanel, togglePanelExpand as _togglePanelExpand, expandPanel as _expandPanel, collapseExpandedPanel as _collapseExpandedPanel, updateRoleClass as _updateRoleClass } from './modules/panel-management.js';
// AR-153: Phase 3 modules
import { openRefuelModal as _openRefuelModal, processFuel as _processFuel, populateRefuelModal as _populateRefuelModal, updateRefuelAmountPreview as _updateRefuelAmountPreview, updateRefuelPreview, executeRefuel as _executeRefuel, setRefuelMax as _setRefuelMax, executeProcessFuel as _executeProcessFuel, setProcessMax as _setProcessMax, requestFuelStatus as _requestFuelStatus } from './modules/refueling-operations.js';
// AR-153: Phase 4 modules
import { captainSetAlert as _captainSetAlert, captainQuickOrder as _captainQuickOrder, captainNavOrder as _captainNavOrder, captainContactOrder as _captainContactOrder, captainIssueOrder as _captainIssueOrder, captainMarkContact as _captainMarkContact, captainWeaponsAuth as _captainWeaponsAuth, captainRequestStatus as _captainRequestStatus, captainLeadershipCheck as _captainLeadershipCheck, captainTacticsCheck as _captainTacticsCheck, acknowledgeOrder as _acknowledgeOrder, captainSoloCommand as _captainSoloCommand } from './modules/captain-operations.js';
// AR-153: Phase 5 modules
import { getStarPopupContent, getShipPopupContent, getStationPopupContent, showContactTooltip as _showContactTooltip, hideContactTooltip as _hideContactTooltip, scanContact as _scanContact, hailContact as _hailContact, hailSelectedContact as _hailSelectedContact, broadcastMessage as _broadcastMessage } from './modules/contact-tooltip.js';
// AR-153: Phase 6 modules
import { getEditorState, setEditorData, openShipEditor as _openShipEditor, populateShipEditor as _populateShipEditor, populateEditorFields, loadTemplateForEditor as _loadTemplateForEditor, renderWeaponsList, renderSystemsList, addWeaponToEditor, addSystemToEditor, updateValidationSummary, collectEditorData, saveEditedShip as _saveEditedShip, switchEditorTab } from './modules/ship-template-editor.js';
// AR-153: Phase 7 modules
import { getEvasiveState, setEvasiveState, getPendingTravel, clearPendingTravel, toggleEvasive as _toggleEvasive, changeRange as _changeRange, setCourse as _setCourse, clearCourse as _clearCourse, travel as _travel, undock as _undock, setupPilotListeners as _setupPilotListeners } from './modules/pilot-controls.js';
// AR-164: Ship Status Panels
import { initShipStatusPanel, refreshShipStatus, destroyShipStatusPanel } from './modules/ship-status-panel.js';
import { initCompactViewscreen, destroyCompactViewscreen, setViewscreenVisible } from './modules/compact-viewscreen.js';

// AR-152: Helper wrappers for notification variants
const showError = (msg) => showNotification(msg, 'error');
const showMessage = (msg) => showNotification(msg, 'info');

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
const showNPCContactsModal = (contacts, isGM) => _showNPCContactsModal(showModalContent, contacts, isGM);
const showAddNPCContactForm = () => _showAddNPCContactForm(showModalContent);
const submitNPCContact = () => _submitNPCContact(state, showNotification);
const showCrewRosterMenu = () => _showCrewRosterMenu(state, showModalContent);
const showShipConfiguration = () => _showShipConfiguration(state, showModalContent);
const showMedicalRecords = () => _showMedicalRecords(state, showModalContent);
const showHandoutModal = (handout) => _showHandoutModal(showModalContent, handout);
// AR-151-5: GM Prep panel wrappers
const renderPrepReveals = () => _renderPrepReveals(state);
const showAddRevealModal = () => _showAddRevealModal(showModalContent);
const submitReveal = () => _submitReveal(state, showNotification, closeModal);
const revealToPlayers = (revealId) => _revealToPlayers(state, showNotification, revealId);
const editReveal = (revealId) => _editReveal(state, showModalContent, revealId);
const updateReveal = (revealId) => _updateReveal(state, showNotification, closeModal, revealId);
const deleteReveal = (revealId) => _deleteReveal(state, showNotification, revealId);
const showPlayerRevealModal = (data) => _showPlayerRevealModal(showModalContent, closeModal, data);
const renderPrepNpcs = () => _renderPrepNpcs(state, showNotification);
const revealNpc = (npcId) => _revealNpc(state, showNotification, renderPrepNpcs, npcId);
const hideNpc = (npcId) => _hideNpc(state, renderPrepNpcs, npcId);
const showNpcDetail = (npcId) => _showNpcDetail(state, showModalContent, npcId);
const renderPrepLocations = () => _renderPrepLocations(state, showNotification);
const revealLocation = (locationId) => _revealLocation(state, showNotification, renderPrepLocations, locationId);
const hideLocation = (locationId) => _hideLocation(state, renderPrepLocations, locationId);
// AR-151-6: GM Prep events, emails, handouts wrappers
const renderPrepEvents = () => _renderPrepEvents(state);
const triggerEvent = (eventId) => _triggerEvent(state, showNotification, renderPrepEvents, eventId);
const showEventDetail = (eventId) => _showEventDetail(state, showModalContent, eventId);
const renderPrepEmails = () => _renderPrepEmails(state);
const sendEmailNow = (emailId) => _sendEmailNow(state, showNotification, loadPrepData, emailId);
const queueEmail = (emailId) => _queueEmail(state, showNotification, loadPrepData, emailId);
const renderPrepHandouts = () => _renderPrepHandouts(state);
const shareHandout = (handoutId) => _shareHandout(state, showNotification, renderPrepHandouts, handoutId);
const hideHandout = (handoutId) => _hideHandout(state, renderPrepHandouts, handoutId);
const showHandoutDetail = (handoutId) => _showHandoutDetail(state, showModalContent, handoutId);
// AR-151-7: Crew Roster wrappers
const showCrewRoster = () => _showCrewRoster(state, showModalContent, showNotification);
const showAddCrewModal = () => _showAddCrewModal(state, showModalContent, showNotification);
const showEditCrewModal = (crew) => _showEditCrewModal(state, showModalContent, showNotification, crew);
// AR-151-8: Hamburger Menu + Email App wrappers
const showLogModal = () => _showLogModal(state);
const handleMenuFeature = (feature) => _handleMenuFeature(state, {
  showLogModal, showNotification, showCrewRoster, showMedicalRecords,
  showFeedbackForm, showFeedbackReview, showSharedMap, showSystemMap
}, feature);
const openEmailApp = (mailList, unread) => _openEmailApp(state, updateMailBadge, mailList, unread);
const renderEmailInbox = (mailList) => _renderEmailInbox(state, updateMailBadge, mailList);
const sendEmail = () => _sendEmail(state, showError, showNotification);
const cancelEmailCompose = () => _cancelEmailCompose(state, updateMailBadge);
const initEmailAppHandlers = () => _initEmailAppHandlers(state, updateMailBadge, showError, showNotification);
// AR-152: Shared Map wrappers
const showSharedMap = () => _showSharedMap(state);
const updateSharedMapIframe = () => _updateSharedMapIframe(state);
const trackGMMapView = () => _trackGMMapView(state);
const updateSharedMapFrame = (data) => _updateSharedMapFrame(state, data);
const navigateToHex = (sector, hex) => _navigateToHex(state, sector, hex);
const buildTravellerMapUrl = (sector, hex) => _buildTravellerMapUrl(state, sector, hex);
// AR-153: Phase 1 wrappers
const setPowerPreset = (preset) => _setPowerPreset(state, preset);
const updatePower = () => _updatePower(state);
const requestPowerStatus = () => _requestPowerStatus(state);
const showPhysicsExplanation = () => _showPhysicsExplanation(showModalContent);
const copySensorPanel = () => _copySensorPanel(state);
const copyRolePanel = () => _copyRolePanel(state);
const requestJumpStatus = () => _requestJumpStatus(state);
const updateFuelEstimate = () => _updateFuelEstimate(state);
const plotJumpCourse = () => _plotJumpCourse(state);
const verifyPosition = () => _verifyPosition(state);
const initiateJumpFromPlot = (dest, dist) => _initiateJumpFromPlot(state, dest, dist);
const initiateJump = () => _initiateJump(state);
const completeJump = () => _completeJump(state);
const skipToJumpExit = () => _skipToJumpExit(state);
// AR-153: Phase 2A wrappers
const updateJumpMap = () => _updateJumpMap(state);
const initJumpMapIfNeeded = () => _initJumpMapIfNeeded(state, updateJumpMap);
// AR-153: Phase 2B wrappers
const performScan = (scanType) => _performScan(state, renderRoleDetailPanel, scanType);
const toggleECM = () => _toggleECM(state, renderRoleDetailPanel);
const toggleECCM = () => _toggleECCM(state, renderRoleDetailPanel);
const acquireSensorLock = (contactId) => _acquireSensorLock(state, renderRoleDetailPanel, contactId);
const breakSensorLock = () => _breakSensorLock(state, renderRoleDetailPanel);
const toggleStealth = () => _toggleStealth(state, renderRoleDetailPanel);
const setSensorLock = (contactId) => _setSensorLock(state, renderRoleDetailPanel, contactId);
const toggleSensorPanelMode = (mode) => _toggleSensorPanelMode(state, renderRoleDetailPanel, mode);
const checkSensorThreats = () => _checkSensorThreats(state, renderRoleDetailPanel);
// AR-153: Phase 2C wrappers
const expandRolePanel = (mode) => _expandRolePanel(state, showEmbeddedSystemMap, mode);
const collapseRolePanel = () => _collapseRolePanel(state, hideEmbeddedSystemMap);
const togglePanelExpand = (panelId) => _togglePanelExpand(state, expandRolePanel, collapseRolePanel, panelId);
const expandPanel = (panelId) => _expandPanel(state, panelId);
const collapseExpandedPanel = () => _collapseExpandedPanel(state);
const updateRoleClass = () => _updateRoleClass(state);
// AR-153: Phase 3 wrappers
const openRefuelModal = () => _openRefuelModal(state, showModal);
const processFuel = () => _processFuel(state);
const updateRefuelAmountPreview = () => _updateRefuelAmountPreview(state);
const executeRefuel = () => _executeRefuel(state);
const setRefuelMax = () => _setRefuelMax(state, updateRefuelAmountPreview);
const populateRefuelModal = () => _populateRefuelModal(state, setRefuelMax);
const executeProcessFuel = () => _executeProcessFuel(state, closeModal);
const setProcessMax = () => _setProcessMax(state);
const requestFuelStatus = () => _requestFuelStatus(state);
// AR-153: Phase 4 wrappers
const captainSetAlert = (alertStatus) => _captainSetAlert(state, alertStatus);
const captainQuickOrder = (order) => _captainQuickOrder(state, order);
const captainNavOrder = (orderType) => _captainNavOrder(state, orderType);
const captainContactOrder = (action) => _captainContactOrder(state, action);
const captainIssueOrder = () => _captainIssueOrder(state);
const captainMarkContact = (marking) => _captainMarkContact(state, marking);
const captainWeaponsAuth = (mode) => _captainWeaponsAuth(state, mode);
const captainRequestStatus = () => _captainRequestStatus(state);
const captainLeadershipCheck = () => _captainLeadershipCheck(state);
const captainTacticsCheck = () => _captainTacticsCheck(state);
const acknowledgeOrder = (orderId) => _acknowledgeOrder(state, orderId);
const captainSoloCommand = (command) => _captainSoloCommand(state, showPlacesOverlay, command);
// AR-153: Phase 5 wrappers
const showContactTooltip = (contactId, targetElement) => _showContactTooltip(state, contactId, targetElement);
const hideContactTooltip = () => _hideContactTooltip(state);
const scanContact = (contactId, scanType) => _scanContact(state, contactId, scanType);
const hailContact = (contactId) => _hailContact(state, hideContactTooltip, contactId);
const hailSelectedContact = () => _hailSelectedContact(state, hailContact);
const broadcastMessage = () => _broadcastMessage(state);
// AR-153: Phase 6 wrappers
const openShipEditor = (shipId) => _openShipEditor(state, showModal, shipId);
const populateShipEditor = () => _populateShipEditor(state);
const loadTemplateForEditor = (templateId) => _loadTemplateForEditor(state, templateId);
const saveEditedShip = () => _saveEditedShip(state);
// AR-153: Phase 7 wrappers
const toggleEvasive = () => _toggleEvasive(state);
const changeRange = (action) => _changeRange(state, action);
const setCourse = (destination, eta, travelData) => _setCourse(state, renderRoleDetailPanel, destination, eta, travelData);
const clearCourse = () => _clearCourse(state);
const travel = () => _travel(state);
const undock = () => _undock(state);
const setupPilotListeners = () => _setupPilotListeners(state, renderRoleDetailPanel, null, setBridgeClockDate, window.animateCameraToLocation);

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

  // AR-201: Create helpers object for extracted socket handlers
  const socketHelpers = {
    // Screen/UI
    showScreen,
    showNotification,
    closeModal,
    debugLog,
    // Campaign
    renderCampaignList,
    renderGMSetup,
    renderPlayerSlots,
    renderPlayerSetup,
    saveSession,
    loadAIPendingResponses,
    // Roles
    formatRoleName,
    renderCrewList,
    updateBridgeHeader,
    updateRoleClass,
    renderRolePanel,
    updateRoleQuirkDisplay,
    renderRoleSelection,
    renderBridge,
    // Bridge
    requestSystemStatus,
    requestJumpStatus,
    loadCurrentSystem,
    refreshShipStatus,
    renderShipLog,
    setBridgeClockDate,
    updateAlertStatus,
    applyAlertBorder,
    renderRoleDetailPanel,
    showOrderAckPrompt,
    updatePendingOrdersDisplay,
    updateWeaponsAuthIndicator,
    generateRoleStatus,
    // Navigation
    initJumpMapIfNeeded,
    renderQuickLocations,
    // Ships
    populateShipTemplateSelect,
    populateShipEditor,
    setEditorData,
    populateEditorFields,
    // Contacts
    renderContacts,
    renderCombatContactsList,
    checkSensorThreats,
    // Systems
    formatSystemName,
    // Jump
    handleJumpPlotted,
    renderShipStatus,
    showNewsMailModal,
    updateJumpMap,
    // Combat
    showCombatScreen,
    hideCombatScreen,
    handleWeaponsAuthorized,
    handleFireResult
  };

  // AR-201: Initialize extracted handlers (campaigns, etc.)
  initAllHandlers(state.socket, state, socketHelpers);
  debugLog(`[AR-201] Initialized ${getRegisteredHandlers().length} extracted socket handlers`);

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
      // AR-166: Load current system for compact viewscreen on reconnect
      if (data.campaign?.current_system) {
        loadCurrentSystem(data.campaign.current_system);
      }
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

  // AR-201: Campaign events moved to socket-handlers/campaigns.js
  // (13 handlers: ops:campaigns, ops:campaignCreated, ops:campaignData, etc.)

  // AR-201: Role events moved to socket-handlers/roles.js
  // (14 handlers: ops:playerJoined, ops:guestJoined, ops:roleCleared, etc.)

  // AR-201: Bridge events moved to socket-handlers/bridge.js
  // (15 handlers: ops:bridgeJoined, ops:crewOnBridge, ops:sessionStarted, etc.)

  // AR-97: Bridge Chat - receive transmissions (TODO: move to comms.js)
  state.socket.on('comms:newTransmission', (transmission) => {
    addBridgeChatMessage(transmission);
  });

  // AR-201: Navigation events moved to socket-handlers/navigation.js
  // (6 handlers: ops:currentSystemUpdated, ops:deepSpaceUpdated, ops:locationData, etc.)

  // AR-201: Ship management events moved to socket-handlers/ships.js
  // (5 handlers: ops:shipAdded, ops:shipDeleted, ops:shipUpdated, etc.)

  // AR-201: Contact events moved to socket-handlers/contacts.js
  // (4 handlers: ops:contacts, ops:contactAdded, ops:contactUpdated, etc.)

  // AR-201: Ship Systems events moved to socket-handlers/systems.js
  // (4 handlers: ops:systemStatus, ops:systemDamaged, ops:repairAttempted, etc.)

  // AR-201: Jump events moved to socket-handlers/jump.js
  // (5 handlers: ops:jumpStatus, ops:jumpPlotted, ops:jumpInitiated, etc.)

  // AR-186: GM Roll Modifier socket handlers
  state.socket.on('ops:gmModifierSet', (data) => {
    state.gmModifier = data;
    const statusEl = document.getElementById('gm-modifier-status');
    if (statusEl) {
      const dmText = data.dm >= 0 ? `+${data.dm}` : data.dm;
      statusEl.textContent = `Active: ${dmText}${data.reason ? ` (${data.reason})` : ''}${data.persistent ? ' [persistent]' : ''}`;
      statusEl.classList.remove('hidden');
    }
    showNotification(`GM Modifier: ${data.dm >= 0 ? '+' : ''}${data.dm}${data.reason ? ` (${data.reason})` : ''}`, 'info');
  });

  state.socket.on('ops:gmModifierCleared', () => {
    state.gmModifier = null;
    const statusEl = document.getElementById('gm-modifier-status');
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.classList.add('hidden');
    }
    showNotification('GM Modifier cleared', 'info');
  });

  state.socket.on('ops:gmModifierState', (data) => {
    state.gmModifier = data;
    if (data) {
      document.getElementById('gm-modifier-dm').value = data.dm;
      document.getElementById('gm-modifier-reason').value = data.reason || '';
      document.getElementById('gm-modifier-persistent').checked = data.persistent;
      const statusEl = document.getElementById('gm-modifier-status');
      if (statusEl) {
        const dmText = data.dm >= 0 ? `+${data.dm}` : data.dm;
        statusEl.textContent = `Active: ${dmText}${data.reason ? ` (${data.reason})` : ''}`;
        statusEl.classList.remove('hidden');
      }
    }
  });

  // ops:locationChanged moved to socket-handlers/navigation.js

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

  // AR-201: Combat events moved to socket-handlers/combat.js
  // (11 handlers: ops:combatStarted, ops:combatEnded, ops:targetAcquired, etc.)

  // Ship Systems status response
  state.socket.on('ops:shipSystems', (data) => {
    updateShipSystemsDisplay(data.systems);
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

  // AR-194: System Broken notification
  state.socket.on('ops:systemBroken', (data) => {
    const { system, severity, failure } = data;
    const severityText = ['', 'Minor', 'Major', 'Critical'][severity] || 'Unknown';
    let message = `⚠️ ${system} DAMAGED (${severityText})`;
    if (failure?.name) {
      message += `: ${failure.name}`;
    }
    showNotification(message, 'warning');
    // Refresh role panel if on engineer/damage control
    if (state.selectedRole === 'engineer' || state.selectedRole === 'damage_control') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  // AR-197: Jump Emergence Alert
  state.socket.on('ops:jumpEmergence', (data) => {
    const { contactId, name, transponder, bearing, range_km, type, tonnage } = data;
    // Format range for display
    const rangeDisplay = range_km > 1000000
      ? `${(range_km / 1000000).toFixed(1)}M km`
      : `${Math.round(range_km).toLocaleString()} km`;

    // Build alert message
    const shipInfo = transponder || name || 'Unknown vessel';
    const message = `🚨 JUMP EMERGENCE: ${shipInfo} detected at bearing ${bearing}°, range ${rangeDisplay}`;

    // Show notification with high priority
    showNotification(message, 'warning');

    // Flash system map red
    flashSystemMap('rgba(255, 100, 0, 0.4)', 800);

    // Log to ship log
    console.log(`[JumpEmergence] ${type || 'Ship'} ${name} emerged at bearing ${bearing}, range ${range_km}km`);

    // Refresh sensor panel if active
    if (state.selectedRole === 'sensor_operator') {
      renderRoleDetailPanel(state.selectedRole);
    }
  });

  // AR-197: Viewscreen Focus - Center system map on contact
  state.socket.on('ops:viewscreenFocus', (data) => {
    const { contactId, name, bearing, range_km } = data;

    // Center the system map on the contact
    const centered = centerOnContact(contactId, 2); // Zoom level 2 for good view

    if (centered) {
      showNotification(`📍 Viewscreen locked on: ${name || contactId}`, 'info');
    } else {
      // Contact may not be in map yet, show notification anyway
      showNotification(`📍 Tracking: ${name || 'Contact'} at bearing ${bearing}°`, 'info');
    }
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

  // AR-186: GM Roll Modifier
  document.getElementById('btn-gm-modifier-apply').addEventListener('click', () => {
    const dm = parseInt(document.getElementById('gm-modifier-dm').value) || 0;
    const reason = document.getElementById('gm-modifier-reason').value || '';
    const persistent = document.getElementById('gm-modifier-persistent').checked;
    state.socket.emit('ops:setGmModifier', { dm, reason, persistent });
  });

  document.getElementById('btn-gm-modifier-clear').addEventListener('click', () => {
    state.socket.emit('ops:clearGmModifier');
    document.getElementById('gm-modifier-dm').value = '';
    document.getElementById('gm-modifier-reason').value = '';
    document.getElementById('gm-modifier-persistent').checked = false;
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
  // AR-164: Initialize Ship Status Panels
  const shipStatusContainer = document.getElementById('ship-status-panel');
  const viewscreenContainer = document.getElementById('compact-viewscreen');
  if (shipStatusContainer) {
    initShipStatusPanel(shipStatusContainer);
  }
  if (viewscreenContainer) {
    // AR-167: Pass role for default panel selection
    initCompactViewscreen(viewscreenContainer, state.selectedRole);
  }

  // AR-164: Sensor panel toggle handlers
  document.getElementById('btn-show-sensors')?.addEventListener('click', () => {
    const statusPanels = document.getElementById('status-panels');
    const sensorPanel = document.getElementById('sensor-display');
    if (statusPanels) statusPanels.classList.add('hidden');
    if (sensorPanel) sensorPanel.classList.remove('sensor-panel-hidden');
  });

  document.getElementById('btn-hide-sensors')?.addEventListener('click', () => {
    const statusPanels = document.getElementById('status-panels');
    const sensorPanel = document.getElementById('sensor-display');
    if (statusPanels) statusPanels.classList.remove('hidden');
    if (sensorPanel) sensorPanel.classList.add('sensor-panel-hidden');
  });

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
  // AR-168: Location moved to top bar (bridge-location in renderBridge)
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

// AR-153: Power Management moved to modules/power-management.js

// AR-153: Pilot Controls moved to modules/pilot-controls.js

// ==================== AR-57: Transit Calculator (Brachistochrone) ====================
// Educational physics: t = 2 * sqrt(d / a)
// User learned Newtonian physics from Traveller at age ~12

// AR-153: Transit Calculator moved to modules/transit-calculator.js

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

// AR-153: setupPilotListeners moved to modules/pilot-controls.js

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

// AR-192: Custom time input parser
function advanceCustomTime() {
  const input = document.getElementById('custom-time-input');
  if (!input) return;

  const value = input.value.trim().toLowerCase();
  if (!value) {
    showNotification('Enter a time value (e.g., 5h, 2d, 1w)', 'warning');
    return;
  }

  // Parse formats: "5h", "2d", "1w", "3d 5h", "2.5d"
  let totalHours = 0;
  const parts = value.split(/\s+/);

  for (const part of parts) {
    const match = part.match(/^(\d+\.?\d*)\s*(h|d|w|hours?|days?|weeks?)$/i);
    if (!match) {
      showNotification(`Invalid format: "${part}". Use h/d/w (e.g., 5h, 2d, 1w)`, 'error');
      return;
    }

    const num = parseFloat(match[1]);
    const unit = match[2].charAt(0).toLowerCase();

    if (unit === 'h') totalHours += num;
    else if (unit === 'd') totalHours += num * 24;
    else if (unit === 'w') totalHours += num * 24 * 7;
  }

  if (totalHours <= 0) {
    showNotification('Time must be greater than 0', 'error');
    return;
  }

  const days = Math.floor(totalHours / 24);
  const hours = Math.floor(totalHours % 24);
  const minutes = Math.round((totalHours % 1) * 60);

  advanceTime(days, hours, minutes, 'custom');
  input.value = '';
  showNotification(`Advanced ${totalHours.toFixed(1)} hours`, 'success');
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

// AR-153: Jump Travel moved to modules/jump-travel.js

// AR-153: Sensor Operations moved to modules/sensor-operations.js

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

// AR-153: Captain Operations moved to modules/captain-operations.js

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

// AR-153: Jump Map moved to modules/jump-map.js

// AR-153: Refueling Operations moved to modules/refueling-operations.js

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

    // AR-194: Break System
    document.getElementById('btn-god-break-system').addEventListener('click', () => {
      const system = document.getElementById('god-break-system').value;
      const severityStr = document.getElementById('god-break-severity').value;
      const severity = severityStr ? parseInt(severityStr, 10) : null;
      state.socket.emit('ops:breakSystem', {
        shipId: state.ship?.id,
        system,
        severity
      });
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

// AR-153: Ship Template Editor moved to modules/ship-template-editor.js

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

// AR-153: Contact Tooltip moved to modules/contact-tooltip.js

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

// AR-153: Copy/Export utilities moved to modules/copy-export.js

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

// AR-151-8a: Hamburger Menu moved to modules/hamburger-menu.js

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

// AR-152: Shared Map functions moved to modules/shared-map.js
// Initialize TravellerMap postMessage listener
initTravellerMapListener(state);

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

// AR-152: updateSharedMapFrame moved to modules/shared-map.js

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

// AR-151-8b: Full-Screen Email App moved to modules/email-app.js

// AR-151-7: Crew Roster moved to modules/crew-roster-full.js

// AR-151-4b: Handout Viewer moved to modules/handout-viewer.js

// AR-151-2d: Mail Compose Modal moved to modules/mail-compose.js

// AR-151-3a: NPC Contacts Modal moved to modules/npc-contacts.js

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

// AR-151-3b: Crew Roster Menu moved to modules/crew-roster-menu.js
// AR-151-3c: Ship Configuration moved to modules/ship-config.js

// AR-151-4a: Medical Records moved to modules/medical-records.js

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

// AR-151-5: Reveals, NPCs, Locations moved to modules/gm-reveals.js, modules/gm-prep-npcs.js, modules/gm-prep-locations.js

// AR-151-6: Events, Email Queue, Handouts moved to modules/gm-prep-events.js, gm-prep-emails.js, gm-prep-handouts.js

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

// AR-153: Panel Management moved to modules/panel-management.js

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
// AR-151-5: GM Prep panel render functions
window.renderPrepReveals = renderPrepReveals;
window.showAddRevealModal = showAddRevealModal;
window.showPlayerRevealModal = showPlayerRevealModal;
window.renderPrepNpcs = renderPrepNpcs;
window.renderPrepLocations = renderPrepLocations;
// AR-151-6: Events, Emails, Handouts render functions
window.renderPrepEvents = renderPrepEvents;
window.renderPrepEmails = renderPrepEmails;
window.renderPrepHandouts = renderPrepHandouts;
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
window.advanceCustomTime = advanceCustomTime;
// AR-64: Travel/Navigation
window.travel = travel;
window.getPendingTravel = getPendingTravel;
window.undock = undock;
// AR-31: Engineer Power Management
window.setPowerPreset = setPowerPreset;
window.updatePower = updatePower;
window.requestPowerStatus = requestPowerStatus;
// AR-153: Transit Calculator exports
window.updateTransitCalculator = updateTransitCalculator;
window.showPhysicsExplanation = showPhysicsExplanation;
window.setupTransitCalculator = setupTransitCalculator;
// AR-153: Jump Travel exports
window.requestJumpStatus = requestJumpStatus;
window.handleJumpPlotted = handleJumpPlotted;
// AR-153: Jump Map exports
window.updateJumpMap = updateJumpMap;
window.fetchJumpDestinations = fetchJumpDestinations;
window.selectJumpDestination = selectJumpDestination;
window.initJumpMapIfNeeded = initJumpMapIfNeeded;
window.setMapSize = setMapSize;
window.restoreMapSize = restoreMapSize;
window.initMapInteractions = initMapInteractions;
// AR-153: Sensor Operations exports
window.performScan = performScan;
window.toggleECM = toggleECM;
window.toggleECCM = toggleECCM;
window.acquireSensorLock = acquireSensorLock;
window.breakSensorLock = breakSensorLock;
window.toggleStealth = toggleStealth;
window.setSensorLock = setSensorLock;
window.toggleSensorPanelMode = toggleSensorPanelMode;
window.checkSensorThreats = checkSensorThreats;
window.renderMiniRadar = renderMiniRadar;
// AR-153: Panel Management exports
window.expandRolePanel = expandRolePanel;
window.collapseRolePanel = collapseRolePanel;
window.togglePanelExpand = togglePanelExpand;
window.expandPanel = expandPanel;
window.collapseExpandedPanel = collapseExpandedPanel;
window.updateRoleClass = updateRoleClass;
// AR-153: Refueling Operations exports
window.openRefuelModal = openRefuelModal;
window.processFuel = processFuel;
window.populateRefuelModal = populateRefuelModal;
window.updateRefuelAmountPreview = updateRefuelAmountPreview;
window.updateRefuelPreview = updateRefuelPreview;
window.executeRefuel = executeRefuel;
window.setRefuelMax = setRefuelMax;
window.executeProcessFuel = executeProcessFuel;
window.setProcessMax = setProcessMax;
window.requestFuelStatus = requestFuelStatus;
// AR-153: Captain Operations exports
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
window.captainSoloCommand = captainSoloCommand;
// AR-153: Phase 5 Contact Tooltip exports
window.showContactTooltip = showContactTooltip;
window.hideContactTooltip = hideContactTooltip;
window.scanContact = scanContact;
window.hailContact = hailContact;
window.hailSelectedContact = hailSelectedContact;
window.broadcastMessage = broadcastMessage;
// AR-153: Phase 6 Ship Template Editor exports
window.openShipEditor = openShipEditor;
window.populateShipEditor = populateShipEditor;
window.populateEditorFields = populateEditorFields;
window.loadTemplateForEditor = loadTemplateForEditor;
window.renderWeaponsList = renderWeaponsList;
window.renderSystemsList = renderSystemsList;
window.addWeaponToEditor = addWeaponToEditor;
window.addSystemToEditor = addSystemToEditor;
window.updateValidationSummary = updateValidationSummary;
window.saveEditedShip = saveEditedShip;
window.switchEditorTab = switchEditorTab;
// AR-153: Phase 7 Pilot Controls exports
window.toggleEvasive = toggleEvasive;
window.changeRange = changeRange;
window.setCourse = setCourse;
window.clearCourse = clearCourse;
window.travel = travel;
window.undock = undock;
window.getPendingTravel = getPendingTravel;
// AR-151: Core utilities and maps for onclick handlers
window.showModalContent = showModalContent;
window.showNotification = showNotification;
window.escapeHtml = escapeHtml;
// AR-152: Shared Map exports
window.showSharedMap = showSharedMap;
window.closeSharedMap = closeSharedMap;
window.updateSharedMapIframe = updateSharedMapIframe;
window.trackGMMapView = trackGMMapView;
window.updateSharedMapFrame = updateSharedMapFrame;
// AR-152: System Map exports
window.showSystemMap = showSystemMap;
window.closeSystemMap = closeSystemMap;
// AR-152: Embedded System Map exports (already at line 8257-8258)
// AR-151-8: Hamburger Menu + Email App exports
window.openHamburgerMenu = openHamburgerMenu;
window.closeHamburgerMenu = closeHamburgerMenu;
window.handleMenuFeature = handleMenuFeature;
window.showLogModal = showLogModal;
window.openEmailApp = openEmailApp;
window.closeEmailApp = closeEmailApp;
window.showEmailCompose = showEmailCompose;
window.sendEmail = sendEmail;
window.cancelEmailCompose = cancelEmailCompose;
