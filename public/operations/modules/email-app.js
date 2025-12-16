/**
 * AR-151-8b: Full-Screen Email App Module
 * Stage 13.4: In-character email interface
 */

import { escapeHtml } from './utils.js';

// Module-level state
let currentMailList = [];
let selectedMailId = null;

/**
 * Open email app
 * @param {Object} state - Application state
 * @param {Function} updateMailBadge - Badge update function
 * @param {Array} mailList - List of mail items
 * @param {number} unreadCount - Number of unread messages
 */
export function openEmailApp(state, updateMailBadge, mailList, unreadCount) {
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
  renderEmailInbox(state, updateMailBadge, mailList);

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

/**
 * Close email app
 */
export function closeEmailApp() {
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

/**
 * Render email inbox
 * @param {Object} state - Application state
 * @param {Function} updateMailBadge - Badge update function
 * @param {Array} mailList - List of mail items
 */
export function renderEmailInbox(state, updateMailBadge, mailList) {
  const inboxList = document.getElementById('email-inbox-list');
  if (!inboxList) return;

  currentMailList = mailList || currentMailList;

  if (!currentMailList || currentMailList.length === 0) {
    inboxList.innerHTML = '<p class="placeholder">No messages</p>';
    return;
  }

  let html = '';
  for (const mail of currentMailList) {
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
      selectEmailMessage(state, updateMailBadge, mailId);
    });
  });
}

/**
 * Select and display email message
 * @param {Object} state - Application state
 * @param {Function} updateMailBadge - Badge update function
 * @param {string} mailId - Mail ID
 */
export function selectEmailMessage(state, updateMailBadge, mailId) {
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
      // Use global showNotification
      window.showNotification?.('Mail archived', 'success');
      // Remove from local list and re-render
      currentMailList = currentMailList.filter(m => m.id !== mail.id);
      renderEmailInbox(state, updateMailBadge, currentMailList);
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

/**
 * Show email compose view
 * @param {Object} replyTo - Mail to reply to (optional)
 */
export function showEmailCompose(replyTo = null) {
  const messageView = document.getElementById('email-message-view');
  const composeView = document.getElementById('email-compose-view');

  if (!composeView) return;

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

  if (messageView) {
    messageView.innerHTML = '';
  }
  composeView.classList.remove('hidden');

  if (bodyField) bodyField.focus();
}

/**
 * Send email
 * @param {Object} state - Application state
 * @param {Function} showError - Error display function
 * @param {Function} showNotification - Notification function
 */
export function sendEmail(state, showError, showNotification) {
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

  if (replyToId) {
    state.socket.emit('ops:replyToMail', {
      originalMailId: replyToId,
      subject: subject || 'Re: (no subject)',
      body
    });
  } else {
    state.socket.emit('ops:sendMail', {
      to: 'GM',
      subject: subject || '(no subject)',
      body
    });
  }

  showNotification('Message sent', 'success');

  if (subjectField) subjectField.value = '';
  if (bodyField) bodyField.value = '';
  composeView.classList.add('hidden');

  state.socket.emit('ops:getMail');
}

/**
 * Cancel email compose
 * @param {Object} state - Application state
 * @param {Function} updateMailBadge - Badge update function
 */
export function cancelEmailCompose(state, updateMailBadge) {
  const composeView = document.getElementById('email-compose-view');
  const messageView = document.getElementById('email-message-view');

  if (composeView) {
    composeView.classList.add('hidden');
  }

  if (selectedMailId) {
    selectEmailMessage(state, updateMailBadge, selectedMailId);
  } else if (messageView) {
    messageView.innerHTML = `
      <div class="email-no-selection">
        <p>Select a message to read</p>
      </div>
    `;
  }
}

/**
 * Initialize email app handlers
 * @param {Object} state - Application state
 * @param {Function} updateMailBadge - Badge update function
 * @param {Function} showError - Error display function
 * @param {Function} showNotification - Notification function
 */
export function initEmailAppHandlers(state, updateMailBadge, showError, showNotification) {
  document.getElementById('btn-close-email-app')?.addEventListener('click', closeEmailApp);
  document.getElementById('btn-compose-email')?.addEventListener('click', () => showEmailCompose(null));
  document.getElementById('btn-send-email')?.addEventListener('click', () => sendEmail(state, showError, showNotification));
  document.getElementById('btn-cancel-compose')?.addEventListener('click', () => cancelEmailCompose(state, updateMailBadge));
}
