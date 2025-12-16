/**
 * AR-151-2e: Feedback Form Module
 * Autorun 6: Bug reports and feature requests
 */

/**
 * Show feedback submission form
 * @param {Function} showModalContent - Function to show modal content
 */
export function showFeedbackForm(showModalContent) {
  const html = `
    <div class="modal-header">
      <h2>Submit Feedback</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body">
      <p class="feedback-intro">Help improve Traveller VTT! Report bugs or request features.</p>
      <div class="form-group">
        <label>Type:</label>
        <select id="feedback-type" class="form-input">
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
          <option value="question">Question</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Title:</label>
        <input type="text" id="feedback-title" class="form-input" placeholder="Brief description" required>
      </div>
      <div class="form-group">
        <label>Details:</label>
        <textarea id="feedback-description" class="form-input" rows="5" placeholder="Provide as much detail as possible. For bugs: what happened vs what you expected."></textarea>
      </div>
      <div class="form-group">
        <label>Priority:</label>
        <select id="feedback-priority" class="form-input">
          <option value="low">Low - Minor issue</option>
          <option value="normal" selected>Normal</option>
          <option value="high">High - Significantly impacts gameplay</option>
          <option value="critical">Critical - Game-breaking</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close-modal>Cancel</button>
      <button class="btn btn-primary" onclick="submitFeedback()">Submit Feedback</button>
    </div>
  `;
  showModalContent(html);
}

/**
 * Submit feedback to server
 * @param {Object} state - Application state
 * @param {Function} showNotification - Notification function
 * @param {Function} closeModal - Function to close modal
 */
export function submitFeedback(state, showNotification, closeModal) {
  const title = document.getElementById('feedback-title')?.value;
  if (!title) {
    showNotification('Title is required', 'error');
    return;
  }

  const feedbackType = document.getElementById('feedback-type')?.value || 'other';
  const description = document.getElementById('feedback-description')?.value || '';
  const priority = document.getElementById('feedback-priority')?.value || 'normal';

  // Submit as a log entry with type 'feedback'
  const message = `[${feedbackType.toUpperCase()}] [${priority}] ${title}${description ? ': ' + description : ''}`;

  state.socket.emit('ops:addLogEntry', {
    entryType: 'feedback',
    message
  });

  showNotification('Feedback submitted - check ship log!', 'success');
  closeModal();
}

/**
 * Show feedback review modal for GM
 * @param {Object} state - Application state
 * @param {Function} showModalContent - Function to show modal content
 */
export function showFeedbackReview(state, showModalContent) {
  const feedbackLogs = (state.logs || []).filter(log => log.entry_type === 'feedback');

  let html = `
    <div class="modal-header">
      <h2>Feedback Review</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body feedback-review-body">
      <div class="feedback-stats">
        <span class="stat-item">Total: ${feedbackLogs.length}</span>
      </div>
      <div class="feedback-list">
  `;

  if (feedbackLogs.length === 0) {
    html += '<p class="text-muted">No feedback submitted yet. Players can submit feedback via the hamburger menu.</p>';
  } else {
    for (const log of feedbackLogs.reverse()) {
      html += `
        <div class="feedback-item">
          <div class="feedback-item-header">
            <span class="feedback-date">${log.game_date || ''}</span>
            <span class="feedback-actor">${log.actor || 'Anonymous'}</span>
          </div>
          <div class="feedback-message">${log.message}</div>
          <div class="feedback-actions">
            <button class="btn btn-small" onclick="copyLogAsTodo('${log.message.replace(/'/g, "\\'")}')">Copy as TODO</button>
          </div>
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

  showModalContent(html);
}

/**
 * Copy feedback as TODO to clipboard
 * @param {Function} showNotification - Notification function
 * @param {string} message - Feedback message to copy
 */
export function copyLogAsTodo(showNotification, message) {
  // Extract the title from the feedback message format: [TYPE] [PRIORITY] Title: Description
  const match = message.match(/\[.*?\]\s*\[.*?\]\s*(.+)/);
  const title = match ? match[1].split(':')[0].trim() : message;
  const todoText = `TODO: ${title}`;

  navigator.clipboard.writeText(todoText).then(() => {
    showNotification('Copied to clipboard as TODO!', 'success');
  }).catch(() => {
    prompt('Copy this TODO:', todoText);
  });
}
