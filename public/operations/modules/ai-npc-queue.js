/**
 * AR-151-2a: AI NPC Queue Module
 * AR-130: AI NPC response queue for GM approval
 */

/**
 * Update the AI queue badge count
 * @param {Object} state - Application state
 */
export function updateAIQueueBadge(state) {
  const badge = document.getElementById('ai-queue-badge');
  if (badge) {
    badge.textContent = state.aiPendingResponses.length;
    badge.style.display = state.aiPendingResponses.length > 0 ? 'inline' : 'none';
  }
}

/**
 * Load pending AI responses from server
 * @param {Object} state - Application state
 */
export function loadAIPendingResponses(state) {
  if (!state.isGM || !state.campaign) return;
  state.socket.emit('ai:getPending', { campaignId: state.campaign.id }, (response) => {
    if (response.pending) {
      state.aiPendingResponses = response.pending;
      updateAIQueueBadge(state);
    }
  });
}

/**
 * Show AI approval queue modal
 * @param {Object} state - Application state
 */
export function showAIApprovalQueue(state) {
  if (!state.isGM) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'ai-queue-modal';

  const queue = state.aiPendingResponses;

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3>AI Response Queue (${queue.length})</h3>
        <button class="btn-close" onclick="closeAIQueueModal()">×</button>
      </div>
      <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
        ${queue.length === 0 ? '<p class="text-muted">No pending AI responses</p>' : queue.map(item => `
          <div class="ai-queue-item" data-id="${item.id}" style="border: 1px solid #333; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <strong>${item.npc_name || item.npcName}</strong>
              <small class="text-muted">${new Date(item.created_at || item.generatedAt).toLocaleString()}</small>
            </div>
            <textarea class="ai-response-text" style="width: 100%; height: 80px; background: #1a1a2e; color: #e0e0e0; border: 1px solid #444; border-radius: 4px; padding: 5px;">${item.response_text || item.response}</textarea>
            <div style="margin-top: 8px; display: flex; gap: 8px;">
              <button class="btn btn-success btn-sm" onclick="approveAIResponse('${item.id}')">Approve & Send</button>
              <button class="btn btn-danger btn-sm" onclick="rejectAIResponse('${item.id}')">Reject</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

/**
 * Close AI queue modal
 */
export function closeAIQueueModal() {
  const modal = document.getElementById('ai-queue-modal');
  if (modal) modal.remove();
}

/**
 * Approve an AI response and send it
 * @param {Object} state - Application state
 * @param {Function} showNotification - Notification function
 * @param {string} responseId - Response ID to approve
 */
export function approveAIResponse(state, showNotification, responseId) {
  const item = document.querySelector(`.ai-queue-item[data-id="${responseId}"]`);
  const editedText = item?.querySelector('.ai-response-text')?.value;

  state.socket.emit('ai:approve', {
    responseId,
    edits: editedText,
    campaignId: state.campaign.id
  }, (response) => {
    if (response.success) {
      state.aiPendingResponses = state.aiPendingResponses.filter(r => r.id !== responseId);
      updateAIQueueBadge(state);
      item?.remove();
      showNotification('AI response approved and sent', 'success');
      if (state.aiPendingResponses.length === 0) {
        closeAIQueueModal();
      }
    } else {
      showNotification('Failed to approve: ' + response.error, 'error');
    }
  });
}

/**
 * Reject an AI response
 * @param {Object} state - Application state
 * @param {Function} showNotification - Notification function
 * @param {string} responseId - Response ID to reject
 */
export function rejectAIResponse(state, showNotification, responseId) {
  state.socket.emit('ai:reject', { responseId }, (response) => {
    if (response.success) {
      state.aiPendingResponses = state.aiPendingResponses.filter(r => r.id !== responseId);
      updateAIQueueBadge(state);
      document.querySelector(`.ai-queue-item[data-id="${responseId}"]`)?.remove();
      showNotification('AI response rejected', 'info');
      if (state.aiPendingResponses.length === 0) {
        closeAIQueueModal();
      }
    }
  });
}
