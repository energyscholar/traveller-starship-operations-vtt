/**
 * AR-201: Campaign Socket Handlers
 *
 * Handles all campaign-related socket events:
 * - Campaign CRUD (create, read, update, delete)
 * - Campaign join/leave
 * - Player slot management
 * - Campaign export/import
 */

import { registerHandler } from './index.js';

// ==================== Campaign List ====================

function handleCampaigns(data, state, helpers) {
  state.campaigns = data.campaigns;
  helpers.renderCampaignList();

  // AR-296: Show feedback alert if there's new feedback
  if (data.newFeedbackCount > 0) {
    handleFeedbackCount({ count: data.newFeedbackCount });
  }
}

function handleCampaignCreated(data, state, helpers) {
  state.campaign = data.campaign;
  state.campaigns.push(data.campaign);
  if (state.isGM) {
    helpers.showScreen('gm-setup');
    helpers.renderGMSetup();
  }
}

function handleCampaignData(data, state, helpers) {
  state.campaign = data.campaign;
  state.players = data.players;
  state.ships = data.ships;

  if (state.isGM) {
    helpers.showScreen('gm-setup');
    helpers.renderGMSetup();
    // Save session for reconnect
    helpers.saveSession();
    // Request shared map state
    state.socket.emit('ops:getMapState');
    // Load pending AI responses
    helpers.loadAIPendingResponses();
  }
}

function handleCampaignUpdated(data, state, helpers) {
  state.campaign = data.campaign;
  if (state.isGM) {
    helpers.renderGMSetup();
  }
}

// ==================== Campaign CRUD ====================

function handleCampaignDeleted(data, state, helpers) {
  state.campaigns = state.campaigns.filter(c => c.id !== data.campaignId);
  helpers.renderCampaignList();
}

function handleCampaignDuplicated(data, state, helpers) {
  state.campaigns.push(data.campaign);
  helpers.renderCampaignList();
}

function handleCampaignRenamed(data, state, helpers) {
  const campaign = state.campaigns.find(c => c.id === data.campaignId);
  if (campaign) campaign.name = data.name;
  helpers.renderCampaignList();
}

// ==================== Export/Import ====================

function handleCampaignExported(data, state, helpers) {
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
}

function handleCampaignImported(data, state, helpers) {
  state.campaigns.push(data.campaign);
  helpers.renderCampaignList();
  helpers.showNotification(`Campaign "${data.campaign.name}" imported successfully`, 'success');
}

// ==================== Player Slots ====================

function handlePlayerSlotCreated(data, state, helpers) {
  state.players.push(data.account);
  helpers.renderGMSetup();
  helpers.renderPlayerSlots();
}

function handlePlayerSlotDeleted(data, state, helpers) {
  state.players = state.players.filter(p => p.id !== data.accountId);
  helpers.renderGMSetup();
  helpers.renderPlayerSlots();
}

// ==================== AR-296: Feedback ====================

function handleFeedbackCount(data) {
  const alert = document.getElementById('feedback-alert');
  const countEl = document.getElementById('feedback-count');

  if (!alert || !countEl) return;

  const count = data.count || 0;
  if (count > 0) {
    countEl.textContent = count;
    alert.classList.remove('hidden');
    console.log('[Feedback] Showing alert banner with', count, 'items');
  } else {
    alert.classList.add('hidden');
  }
}

// ==================== Campaign Join ====================

function handleCampaignJoined(data, state, helpers) {
  state.campaign = data.campaign;
  state.players = data.availableSlots;
  helpers.renderPlayerSlots();
  // Request shared map state
  state.socket.emit('ops:getMapState');
}

function handlePlayerSlotSelected(data, state, helpers) {
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
  helpers.showScreen('player-setup');
  helpers.renderPlayerSetup();
}

// ==================== Register All Handlers ====================

registerHandler('ops:campaigns', handleCampaigns);
registerHandler('ops:campaignCreated', handleCampaignCreated);
registerHandler('ops:campaignData', handleCampaignData);
registerHandler('ops:campaignUpdated', handleCampaignUpdated);
registerHandler('ops:campaignDeleted', handleCampaignDeleted);
registerHandler('ops:campaignDuplicated', handleCampaignDuplicated);
registerHandler('ops:campaignRenamed', handleCampaignRenamed);
registerHandler('ops:campaignExported', handleCampaignExported);
registerHandler('ops:campaignImported', handleCampaignImported);
registerHandler('ops:playerSlotCreated', handlePlayerSlotCreated);
registerHandler('ops:playerSlotDeleted', handlePlayerSlotDeleted);
registerHandler('ops:campaignJoined', handleCampaignJoined);
registerHandler('ops:playerSlotSelected', handlePlayerSlotSelected);
registerHandler('ops:feedbackCount', handleFeedbackCount);

// Export for testing
export {
  handleCampaigns,
  handleCampaignCreated,
  handleCampaignData,
  handleCampaignUpdated,
  handleCampaignDeleted,
  handleCampaignDuplicated,
  handleCampaignRenamed,
  handleCampaignExported,
  handleCampaignImported,
  handlePlayerSlotCreated,
  handlePlayerSlotDeleted,
  handleCampaignJoined,
  handlePlayerSlotSelected,
  handleFeedbackCount
};
