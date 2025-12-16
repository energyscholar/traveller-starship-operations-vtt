/**
 * AR-151-6b: GM Prep Email Queue Module
 * Stage 8.3: Email queue management for GM Prep panel
 */

import { escapeHtml } from './utils.js';

/**
 * Render emails list in GM Prep panel
 * @param {Object} state - Application state
 */
export function renderPrepEmails(state) {
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

/**
 * Render a single email item
 * @param {Object} email - Email data
 * @param {string} status - Email status
 * @returns {string} HTML string
 */
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

/**
 * Send email immediately
 * @param {Object} state - Application state
 * @param {Function} showNotification - Notification function
 * @param {Function} loadPrepData - Function to reload prep data
 * @param {string} emailId - Email ID
 */
export function sendEmailNow(state, showNotification, loadPrepData, emailId) {
  state.socket.emit('ops:sendEmail', {
    emailId,
    sentDate: state.gameDate,
    deliveryDate: state.gameDate
  });
  showNotification('Email sent', 'success');
  // Reload prep data
  loadPrepData();
}

/**
 * Queue email for later delivery
 * @param {Object} state - Application state
 * @param {Function} showNotification - Notification function
 * @param {Function} loadPrepData - Function to reload prep data
 * @param {string} emailId - Email ID
 */
export function queueEmail(state, showNotification, loadPrepData, emailId) {
  const date = prompt('Enter game date to send (e.g., 1105-042):');
  if (!date) return;
  state.socket.emit('ops:queueEmail', { emailId, queuedForDate: date });
  showNotification(`Email queued for ${date}`, 'success');
  loadPrepData();
}
