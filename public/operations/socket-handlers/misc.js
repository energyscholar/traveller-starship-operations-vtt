/**
 * AR-201: Miscellaneous Socket Handlers
 *
 * Handles various UI and utility events:
 * - Time updates
 * - Mail system
 * - Handouts
 * - NPC contacts
 * - Feedback
 * - Hailing
 * - Prep panel/reveals
 */

import { registerHandler } from './index.js';

// ==================== Time ====================

function handleTimeUpdated(data, state, helpers) {
  if (data.currentDate && state.campaign) {
    state.campaign.current_date = data.currentDate;
    // Update date display
    helpers.setBridgeClockDate(data.currentDate);
    const gmDateEl = document.getElementById('campaign-date');
    if (gmDateEl) gmDateEl.value = data.currentDate;
  }
  if (data.reason) {
    helpers.showNotification(`Time advanced: ${data.reason}`, 'info');
  }
}

// ==================== Mail ====================

function handleMailList(data, state, helpers) {
  state.unreadMailCount = data.unreadCount || 0;
  helpers.updateMailBadge();
  helpers.openEmailApp(data.mail, data.unreadCount);
}

function handleNewMail(data, state, helpers) {
  if (data.recipientId === state.accountId || data.recipientId === 'all') {
    helpers.showNotification(`New mail from ${data.senderName}: ${data.subject}`, 'info');
    // Increment unread count and update badge
    state.unreadMailCount = (state.unreadMailCount || 0) + 1;
    helpers.updateMailBadge();
  }
}

// ==================== Handouts ====================

function handleShowHandout(data, state, helpers) {
  helpers.showHandoutModal(data.handout);
  helpers.showNotification(`${data.handout.sharedBy} shared a handout with you`, 'info');
}

// ==================== NPC Contacts ====================

function handleNPCContactsList(data, state, helpers) {
  // If compose modal is waiting for contacts, populate it
  if (state.pendingComposeContacts) {
    helpers.populateComposeContacts(data.contacts);
  } else {
    helpers.showNPCContactsModal(data.contacts, data.isGM);
  }
}

function handleNPCContactsRefresh(data, state, helpers) {
  // Refresh NPC contacts if modal is open
  if (document.querySelector('.npc-contacts-modal')) {
    state.socket.emit('ops:getNPCContacts');
  }
}

// ==================== Feedback ====================

function handleFeedbackSubmitted(data, state, helpers) {
  helpers.showNotification('Feedback submitted successfully!', 'success');
  helpers.closeModal();
}

function handleFeedbackList(data, state, helpers) {
  helpers.renderFeedbackReview(data.feedback, data.stats);
}

function handleFeedbackStatusUpdated(data, state, helpers) {
  helpers.showNotification(`Feedback marked as ${data.status}`, 'success');
}

// ==================== Hailing ====================

function handleHailResult(data, state, helpers) {
  if (data.success) {
    helpers.showNotification(data.message, 'success');
    // Refresh NPC contacts if a new contact was created
    if (data.newContact) {
      state.socket.emit('ops:getNPCContacts');
    }
  } else {
    helpers.showNotification(data.message || 'Hail failed', 'error');
  }
}

// ==================== Prep Panel ====================

function handlePrepData(data, state, helpers) {
  state.prepReveals = data.reveals || [];
  state.prepNpcs = data.npcs || [];
  state.prepLocations = data.locations || [];
  state.prepEvents = data.events || [];
  state.prepEmails = data.emails || [];
  state.prepHandouts = data.handouts || [];
  helpers.renderPrepReveals();
}

function handleRevealAdded(data, state, helpers) {
  state.prepReveals = state.prepReveals || [];
  state.prepReveals.push(data.reveal);
  helpers.renderPrepReveals();
}

function handleRevealUpdated(data, state, helpers) {
  const idx = (state.prepReveals || []).findIndex(r => r.id === data.reveal.id);
  if (idx >= 0) {
    state.prepReveals[idx] = data.reveal;
    helpers.renderPrepReveals();
  }
}

function handleRevealDeleted(data, state, helpers) {
  state.prepReveals = (state.prepReveals || []).filter(r => r.id !== data.revealId);
  helpers.renderPrepReveals();
}

function handleRevealExecuted(data, state, helpers) {
  // Update reveal status
  const reveal = (state.prepReveals || []).find(r => r.id === data.revealId);
  if (reveal) {
    reveal.status = 'revealed';
    helpers.renderPrepReveals();
  }
  // Show notification to GM
  if (state.isGM) {
    helpers.showNotification(`Revealed: ${data.title}`, 'success');
  }
}

function handlePlayerReveal(data, state, helpers) {
  helpers.showPlayerRevealModal(data);
}

// ==================== Register All Handlers ====================

registerHandler('ops:timeUpdated', handleTimeUpdated);
registerHandler('ops:mailList', handleMailList);
registerHandler('ops:newMail', handleNewMail);
registerHandler('ops:showHandout', handleShowHandout);
registerHandler('ops:npcContactsList', handleNPCContactsList);
registerHandler('ops:npcContactsRefresh', handleNPCContactsRefresh);
registerHandler('ops:feedbackSubmitted', handleFeedbackSubmitted);
registerHandler('ops:feedbackList', handleFeedbackList);
registerHandler('ops:feedbackStatusUpdated', handleFeedbackStatusUpdated);
registerHandler('ops:hailResult', handleHailResult);
registerHandler('ops:prepData', handlePrepData);
registerHandler('ops:revealAdded', handleRevealAdded);
registerHandler('ops:revealUpdated', handleRevealUpdated);
registerHandler('ops:revealDeleted', handleRevealDeleted);
registerHandler('ops:revealExecuted', handleRevealExecuted);
registerHandler('ops:playerReveal', handlePlayerReveal);

// Export for testing
export {
  handleTimeUpdated,
  handleMailList,
  handleNewMail,
  handleShowHandout,
  handleNPCContactsList,
  handleNPCContactsRefresh,
  handleFeedbackSubmitted,
  handleFeedbackList,
  handleFeedbackStatusUpdated,
  handleHailResult,
  handlePrepData,
  handleRevealAdded,
  handleRevealUpdated,
  handleRevealDeleted,
  handleRevealExecuted,
  handlePlayerReveal
};
