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
import './socket-handlers/sensors.js';
import './socket-handlers/gm.js';
import './socket-handlers/fuel.js';
import './socket-handlers/map.js';
import './socket-handlers/misc.js';
import './socket-handlers/conditions.js';
import './socket-handlers/ship-damage.js';  // BD-2: Incoming fire damage
import './socket-handlers/modules.js';  // AR-214: Adventure module events
import { initAllHandlers, getRegisteredHandlers } from './socket-handlers/index.js';
// AR-201: Modal handler modules
import './modals/character-import.js';
import './modals/system-lookup.js';
import './modals/gm-bridge-menu.js';
import './modals/encounter-builder.js';
import './modals/simple-modals.js';
import './modals/ship-modals.js';
import { getModalHandler, getRegisteredModals } from './modals/index.js';
// AR-201: Screen handler modules
import './screens/login-screen.js';
import './screens/gm-setup-screen.js';
import './screens/player-setup-screen.js';
import './screens/bridge-screen.js';
import { getScreenHandler, getRegisteredScreens } from './screens/index.js';
// AR-201: Renderer modules
import {
  initRenderers,
  renderBridge as _renderBridge,
  renderShipStatus as _renderShipStatus,
  renderRoleActions as _renderRoleActions,
  renderObserverPanel as _renderObserverPanel,
  renderRoleDetailPanel as _renderRoleDetailPanel,
  handleRoleAction as _handleRoleAction,
  renderCrewList as _renderCrewList,
  relieveCrewMember as _relieveCrewMember,
  gmAssignRole as _gmAssignRole,
  renderContacts as _renderContacts,
  updateRoleQuirkDisplay as _updateRoleQuirkDisplay,
  initGMControls as _initGMControls,
  renderGMSetup as _renderGMSetup,
  renderPlayerSetup as _renderPlayerSetup,
  renderRoleSelection as _renderRoleSelection,
  renderPlayerSlots as _renderPlayerSlots,
  renderQuickLocations as _renderQuickLocations,
  renderCampaignList as _renderCampaignList,
  showDeleteCampaignModal as _showDeleteCampaignModal
} from './renderers/index.js';
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
// AR-201: Bridge header update (was missing, referenced but never defined)
const updateBridgeHeader = () => {
  const screenLabel = document.getElementById('bridge-screen-label');
  if (screenLabel) {
    const roleDisplay = state.isGM ? 'GM' : (state.selectedRole || 'Crew');
    const roleName = roleDisplay.charAt(0).toUpperCase() + roleDisplay.slice(1).replace(/_/g, ' ');
    screenLabel.textContent = `Bridge · ${roleName}`;
  }
};
// AR-201: Role panel render (was missing, referenced but never defined)
const renderRolePanel = () => {
  if (state.selectedRole) {
    const roleConfig = getRoleConfig(state.selectedRole);
    if (roleConfig) {
      renderRoleActions(roleConfig);
    }
  }
};
// AR-201: Feedback review render (was missing, referenced but never defined)
const renderFeedbackReview = (feedback, stats) => {
  // TODO: Implement feedback review UI when needed
  console.log('[Feedback] renderFeedbackReview called with', feedback?.length || 0, 'items');
};
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
    handleFireResult,
    // Sensors
    handleScanResult,
    // Fuel
    populateRefuelModal,
    updateRefuelPreview,
    // Map
    updateSharedMapBadge,
    mapDebugMessage,
    showSharedMap,
    updateSharedMapFrame,
    updateSharedMapButtons,
    closeSharedMap,
    showSystemMap,
    loadSystemMap,
    // Misc
    updateMailBadge,
    openEmailApp,
    showHandoutModal,
    populateComposeContacts,
    showNPCContactsModal,
    renderFeedbackReview,
    renderPrepReveals,
    showPlayerRevealModal
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

  // AR-201: GM modifier events moved to socket-handlers/gm.js
  // (3 handlers: ops:gmModifierSet, ops:gmModifierCleared, ops:gmModifierState)

  // AR-201: Sensor events moved to socket-handlers/sensors.js
  // (3 handlers: ops:contactsReplaced, ops:scanResult, ops:scanContactResult)

  // AR-201: Combat events moved to socket-handlers/combat.js
  // (11 handlers: ops:combatStarted, ops:combatEnded, ops:targetAcquired, etc.)

  // AR-214: ops:shipSystems moved to socket-handlers/systems.js

  // Autorun 5: Handle jump status update (for skip-to-exit feature)
  state.socket.on('ops:jumpStatusUpdated', (data) => {
    const { jumpStatus, message } = data;
    state.jumpStatus = jumpStatus;
    showNotification(message || 'Jump status updated', 'success');
    renderRoleDetailPanel(state.selectedRole);
  });

  // AR-201: Misc events moved to socket-handlers/misc.js
  // (16 handlers: ops:timeUpdated, ops:mailList, ops:prepData, etc.)

  // Refueling events
  // AR-201: Fuel events moved to socket-handlers/fuel.js
  // (8 handlers: ops:fuelStatus, ops:refuelOptions, ops:refueled, etc.)

  // Error handling
  state.socket.on('ops:error', (error) => {
    showNotification(error.message, 'error');
  });

  // AR-214: ops:systemBroken moved to socket-handlers/systems.js

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
  // AR-201: Conditions events moved to socket-handlers/conditions.js
  // (7 handlers: ops:environmentalData, ops:repairQueue, ops:flightConditions, etc.)

  // ==================== AR-27: Shared Map Events ====================

  // AR-201: Map sharing events moved to socket-handlers/map.js
  // (7 handlers: ops:mapShared, ops:mapUnshared, ops:starSystemShared, etc.)

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


// AR-201: Delegate to extracted renderers
function renderCampaignList() {
  _renderCampaignList();
}

function showDeleteCampaignModal(campaignId, campaignName) {
  _showDeleteCampaignModal(campaignId, campaignName);
}

function renderPlayerSlots() {
  _renderPlayerSlots();
}


// AR-201: Delegate to extracted renderer
function renderQuickLocations() {
  _renderQuickLocations();
}

// AR-201: Delegate to extracted renderers
function renderGMSetup() {
  _renderGMSetup();
}

function renderPlayerSetup() {
  _renderPlayerSetup();
}

// AR-201: Delegate to extracted renderers
function renderRoleSelection() {
  _renderRoleSelection();
}

function initGMControls() {
  _initGMControls();
}

function updateRoleQuirkDisplay() {
  _updateRoleQuirkDisplay();
}

// AR-201: Delegate to extracted renderer
function renderBridge() {
  _renderBridge();
}

// AR-201: Delegate to extracted renderer
function renderShipStatus() {
  _renderShipStatus();
}

// AR-201: Delegate to extracted renderers
function renderRoleActions(roleConfig) {
  _renderRoleActions(roleConfig);
}

function renderObserverPanel() {
  _renderObserverPanel();
}

function renderRoleDetailPanel(role) {
  _renderRoleDetailPanel(role);
}

function handleRoleAction(action) {
  _handleRoleAction(action);
}

// AR-201: Delegate to extracted renderers
function renderCrewList() {
  _renderCrewList();
}

function relieveCrewMember(accountId, name, role) {
  _relieveCrewMember(accountId, name, role);
}

function gmAssignRole(accountId, name) {
  _gmAssignRole(accountId, name);
}

function renderContacts() {
  _renderContacts();
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

/**
 * AR-125.1: Truncate text to max length with ellipsis
 */
function truncateText(text, maxLength = 60) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * AR-125.1: Render ship log with tooltip support
 */
function renderShipLog() {
  const container = document.getElementById('ship-log');

  container.innerHTML = state.logEntries.slice(0, 50).map((e, idx) => {
    const fullMessage = e.message || '';
    const isTruncated = fullMessage.length > 60;
    const displayMessage = truncateText(fullMessage, 60);

    return `
    <div class="log-entry ${e.entry_type} ${isTruncated ? 'has-tooltip' : ''}"
         data-log-idx="${idx}"
         ${isTruncated ? `data-full-message="${escapeHtml(fullMessage).replace(/"/g, '&quot;')}"` : ''}>
      <span class="log-time">${e.game_date}</span>
      ${e.actor ? `<span class="log-actor">${escapeHtml(e.actor)}</span>` : ''}
      <span class="log-message">${escapeHtml(displayMessage)}</span>
      ${isTruncated ? '<span class="log-expand-hint">...</span>' : ''}
    </div>
  `;
  }).join('') || '<p class="placeholder">No log entries</p>';

  // AR-125.1: Attach tooltip handlers
  initLogTooltips(container);
}

/**
 * AR-125.1: Initialize log entry tooltip handlers
 */
function initLogTooltips(container) {
  const entries = container.querySelectorAll('.log-entry.has-tooltip');

  entries.forEach(entry => {
    // Hover: show tooltip
    entry.addEventListener('mouseenter', showLogTooltip);
    entry.addEventListener('mouseleave', hideLogTooltip);
    // Click: pin popup
    entry.addEventListener('click', pinLogPopup);
  });
}

/**
 * AR-125.1: Show tooltip on hover
 */
function showLogTooltip(e) {
  const entry = e.currentTarget;
  const fullMessage = entry.dataset.fullMessage;
  if (!fullMessage) return;

  // Don't show tooltip if popup is pinned
  if (document.querySelector('.log-popup-pinned')) return;

  let tooltip = document.getElementById('log-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'log-tooltip';
    tooltip.className = 'log-tooltip';
    document.body.appendChild(tooltip);
  }

  tooltip.textContent = fullMessage;
  tooltip.style.display = 'block';

  // Position near cursor
  const rect = entry.getBoundingClientRect();
  tooltip.style.left = `${rect.left}px`;
  tooltip.style.top = `${rect.bottom + 5}px`;
}

/**
 * AR-125.1: Hide tooltip
 */
function hideLogTooltip() {
  const tooltip = document.getElementById('log-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

/**
 * AR-125.1: Pin popup on click
 */
function pinLogPopup(e) {
  const entry = e.currentTarget;
  const fullMessage = entry.dataset.fullMessage;
  const idx = entry.dataset.logIdx;
  const logEntry = state.logEntries[idx];

  if (!fullMessage || !logEntry) return;

  // Hide tooltip
  hideLogTooltip();

  // Remove existing pinned popup
  const existing = document.querySelector('.log-popup-pinned');
  if (existing) existing.remove();

  // Create pinned popup
  const popup = document.createElement('div');
  popup.className = 'log-popup-pinned';
  popup.innerHTML = `
    <div class="log-popup-header">
      <span class="log-popup-time">${logEntry.game_date}</span>
      ${logEntry.actor ? `<span class="log-popup-actor">${escapeHtml(logEntry.actor)}</span>` : ''}
      <span class="log-popup-type">[${logEntry.entry_type}]</span>
      <button class="log-popup-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="log-popup-message">${escapeHtml(fullMessage)}</div>
  `;

  // Position popup
  const rect = entry.getBoundingClientRect();
  popup.style.left = `${rect.left}px`;
  popup.style.top = `${rect.bottom + 5}px`;

  document.body.appendChild(popup);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function closePopup(ev) {
      if (!popup.contains(ev.target) && ev.target !== entry) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }, 10);
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

// AR-201: Modal helpers object for extracted handlers
const modalHelpers = {
  closeModal,
  showNotification,
  escapeHtml,
  advanceTime,
  parseCharacterText,
  showTravelModal,
  addContact,
  applySystemDamage,
  populateShipTemplateSelect,
  updateShipTemplateInfo,
  populateShipEditor,
  switchEditorTab,
  loadTemplateForEditor,
  addWeaponToEditor,
  addSystemToEditor,
  saveEditedShip,
  updateValidationSummary,
  updateRefuelAmountPreview,
  setRefuelMax,
  executeRefuel,
  setProcessMax,
  executeProcessFuel,
  showModal: (templateId) => showModal(templateId)  // AR-BD-0b: Allow nested modal opening
};

// AR-201: Renderer helpers for extracted render functions
const rendererHelpers = {
  // Utilities
  escapeHtml,
  formatRoleName,
  formatActionName,
  formatRange,
  getRangeClass,
  formatRangeBand,
  getContactIcon,
  getShipAsciiArt,
  // Role system
  getRoleConfig,
  getRoleDetailContent,
  getActionMessage,
  // State updates
  updateMapContacts,
  startBridgeClock,
  applyStatusIndicators,
  expandRolePanel,
  initJumpMapIfNeeded,
  // Notifications
  showNotification,
  showModal,
  showContactTooltip,
  showAddCombatContactModal,
  showDeleteCampaignModal,
  // Setup
  openShipEditor,
  // Recursive render calls
  renderObserverPanel,
  renderRoleActions,
  updateRoleQuirkDisplay,
  renderCrewList,
  renderContacts,
  renderShipLog,
  handleRoleAction,
  renderRoleDetailPanel,
  renderRoleSelection,
  // UWP helpers
  interpretUWP,
  formatPopulation
};

// AR-201: Initialize renderers with state and helpers
initRenderers(state, rendererHelpers);

// AR-201: Screen helpers object for extracted screen handlers
const screenHelpers = {
  // Core
  showModal,
  showScreen,
  showNotification,
  clearStoredSession,
  // Login
  // GM Setup
  copyWithFeedback,
  openShipEditor,
  // Player Setup
  // Bridge
  renderContacts,
  formatRoleName,
  initShipStatusPanel,
  initCompactViewscreen,
  expandRolePanel,
  collapseRolePanel,
  toggleBrowserFullscreen,
  toggleShipSystemsPanel,
  hideShipSystemsPanel,
  collapseExpandedPanel,
  togglePanelExpand,
  showShipStatusModal,
  openHamburgerMenu,
  closeHamburgerMenu,
  handleMenuFeature,
  renderPlayerSetup,
  initGMControls,
  initPrepPanel,
  applyStatusIndicators,
  DEBUG
};

function showModal(templateId) {
  const template = document.getElementById(templateId);
  const modal = document.getElementById('modal-content');
  modal.innerHTML = template.innerHTML;

  // Add close handlers
  modal.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', closeModal);
  });

  // AR-201: Check registry for extracted handlers
  const handler = getModalHandler(templateId);
  if (handler) {
    handler(modal, state, modalHelpers);
    document.getElementById('modal-overlay').classList.remove('hidden');
    return;
  }

  // AR-201: All modals now use registry pattern - no inline handlers

  // Unregistered modal fallback (show modal overlay anyway)
  if (!handler) {
    console.warn(`No handler registered for modal: ${templateId}`);
  }

  // AR-201: All modal handlers moved to modals/ directory

  // Show modal overlay for any modal (registered or not)
  document.getElementById('modal-overlay').classList.remove('hidden');
}

// AR-201: ~320 lines of inline modal handlers removed here
// Now in modals/: character-import.js, system-lookup.js, gm-bridge-menu.js,
//                 simple-modals.js, ship-modals.js

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

  // AR-201: Initialize screens via registry
  const screenIds = ['login', 'gm-setup', 'player-setup', 'bridge'];
  for (const screenId of screenIds) {
    const handler = getScreenHandler(screenId);
    if (handler) {
      handler(state, screenHelpers);
    }
  }

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

// AR-214: Module socket handlers moved to socket-handlers/modules.js

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
