/**
 * V2 Email Panel Module
 * IIFE exposing window.EmailPanel for mail functionality
 */
(function(window) {
  'use strict';

  let currentTab = 'inbox';
  let messages = [];
  let drafts = [];
  let currentMessage = null;

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format mail date
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    const match = dateStr.match(/^(\d{4})-(\d{3})/);
    if (!match) return dateStr;
    return `${match[1]}-${match[2]}`;
  }

  /**
   * Truncate string with ellipsis
   */
  function truncate(str, maxLen) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + '...';
  }

  /**
   * Show the email overlay
   */
  function show(state) {
    const overlay = document.getElementById('email-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');

    // Request mail data from server
    if (state.socket) {
      state.socket.emit('ops:getMail');
    }

    // Switch to inbox by default
    switchTab('inbox');
  }

  /**
   * Close the email overlay
   */
  function close() {
    const overlay = document.getElementById('email-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  /**
   * Switch between tabs
   */
  function switchTab(tab) {
    currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.email-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update tab content
    document.querySelectorAll('.email-tab-content').forEach(content => {
      content.classList.add('hidden');
    });

    const targetContent = document.getElementById('email-' + tab);
    if (targetContent) {
      targetContent.classList.remove('hidden');
    }
  }

  /**
   * Render a single message row
   */
  function renderMessageRow(msg, idx) {
    const isRead = msg.is_read;
    const priority = msg.priority || 'normal';
    const priorityIcon = priority === 'urgent' ? '!!' : priority === 'high' ? '!' : '';
    const from = truncate(msg.sender_name || 'Unknown', 20);
    const subject = truncate(msg.subject || '(no subject)', 35);
    const date = formatDate(msg.sent_date || msg.delivery_date);

    return `<div class="email-row ${isRead ? 'read' : 'unread'}" data-message-idx="${idx}">
      <span class="email-priority ${priority}">${escapeHtml(priorityIcon)}</span>
      <span class="email-from">${escapeHtml(from)}</span>
      <span class="email-subject">${escapeHtml(subject)}</span>
      <span class="email-date">${escapeHtml(date)}</span>
    </div>`;
  }

  /**
   * Render inbox
   */
  function renderInbox() {
    const list = document.getElementById('email-list');
    if (!list) return;

    if (!messages || messages.length === 0) {
      list.innerHTML = '<div class="email-empty">No messages</div>';
      return;
    }

    list.innerHTML = messages.map((msg, idx) => renderMessageRow(msg, idx)).join('');

    // Add click handlers
    list.querySelectorAll('.email-row').forEach(row => {
      row.addEventListener('click', () => {
        const idx = parseInt(row.dataset.messageIdx, 10);
        viewMessage(messages[idx]);
      });
    });
  }

  /**
   * Render drafts list
   */
  function renderDrafts() {
    const list = document.getElementById('drafts-list');
    if (!list) return;

    if (!drafts || drafts.length === 0) {
      list.innerHTML = '<div class="email-empty">No drafts</div>';
      return;
    }

    list.innerHTML = drafts.map((draft, idx) => {
      const to = truncate(draft.recipient_id || '(no recipient)', 20);
      const subject = truncate(draft.subject || '(no subject)', 35);
      return `<div class="draft-row" data-draft-idx="${idx}">
        <span class="draft-to">To: ${escapeHtml(to)}</span>
        <span class="draft-subject">${escapeHtml(subject)}</span>
      </div>`;
    }).join('');

    // Add click handlers
    list.querySelectorAll('.draft-row').forEach(row => {
      row.addEventListener('click', () => {
        const idx = parseInt(row.dataset.draftIdx, 10);
        editDraft(drafts[idx]);
      });
    });
  }

  /**
   * View a message
   */
  function viewMessage(msg) {
    currentMessage = msg;

    const content = document.getElementById('message-content');
    if (!content) return;

    const priority = msg.priority || 'normal';

    content.innerHTML = `
      <div class="message-header">
        <div class="message-from"><strong>From:</strong> ${escapeHtml(msg.sender_name || 'Unknown')}</div>
        <div class="message-to"><strong>To:</strong> ${escapeHtml(formatRecipient(msg))}</div>
        <div class="message-subject"><strong>Subject:</strong> ${escapeHtml(msg.subject || '(no subject)')}</div>
        <div class="message-date"><strong>Date:</strong> ${escapeHtml(formatDate(msg.sent_date))}</div>
        ${priority !== 'normal' ? `<div class="message-priority"><strong>Priority:</strong> ${escapeHtml(priority.toUpperCase())}</div>` : ''}
      </div>
      <div class="message-body">${escapeHtml(msg.body || '(empty message)')}</div>
    `;

    // Show the view tab
    document.querySelectorAll('.email-tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById('email-view').classList.remove('hidden');

    // Mark as read
    if (window.state && window.state.socket && !msg.is_read) {
      window.state.socket.emit('ops:markMailRead', { mailId: msg.id });
      msg.is_read = true;
    }
  }

  /**
   * Format recipient
   */
  function formatRecipient(msg) {
    if (!msg) return 'Unknown';
    switch (msg.recipient_type) {
      case 'all': return 'All Crew';
      case 'ship': return 'Ship Crew';
      case 'role': return `Role: ${msg.recipient_id || 'Unknown'}`;
      default: return msg.recipient_id || 'Unknown';
    }
  }

  /**
   * Edit a draft
   */
  function editDraft(draft) {
    document.getElementById('compose-to').value = draft.recipient_id || '';
    document.getElementById('compose-subject').value = draft.subject || '';
    document.getElementById('compose-body').value = draft.body || '';
    switchTab('compose');
  }

  /**
   * Back to inbox
   */
  function backToInbox() {
    currentMessage = null;
    switchTab('inbox');
  }

  /**
   * Handle mail data from server
   */
  function handleMailData(data) {
    if (data.messages) {
      messages = data.messages;
      renderInbox();
    }
    if (data.drafts) {
      drafts = data.drafts;
      renderDrafts();
    }

    // Update badge
    updateBadge(data.unreadCount || 0);
  }

  /**
   * Update unread badge
   */
  function updateBadge(count) {
    const badge = document.getElementById('email-badge');
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  /**
   * Send email
   */
  function sendEmail(state) {
    const to = document.getElementById('compose-to').value.trim();
    const subject = document.getElementById('compose-subject').value.trim();
    const body = document.getElementById('compose-body').value.trim();

    if (!to || !body) {
      alert('Please enter recipient and message body');
      return;
    }

    if (state.socket) {
      state.socket.emit('ops:sendMail', {
        campaignId: state.campaignId,
        recipientId: to,
        subject: subject || '(no subject)',
        body: body
      });

      // Clear form
      document.getElementById('compose-to').value = '';
      document.getElementById('compose-subject').value = '';
      document.getElementById('compose-body').value = '';

      // Switch to inbox
      switchTab('inbox');
    }
  }

  /**
   * Save draft
   */
  function saveDraft(state) {
    const to = document.getElementById('compose-to').value.trim();
    const subject = document.getElementById('compose-subject').value.trim();
    const body = document.getElementById('compose-body').value.trim();

    if (state.socket) {
      state.socket.emit('ops:saveDraft', {
        campaignId: state.campaignId,
        recipientId: to,
        subject: subject,
        body: body
      });

      // Switch to drafts
      switchTab('drafts');
    }
  }

  /**
   * Calculate delivery estimate
   */
  function updateDeliveryEstimate(parsecs) {
    const el = document.getElementById('delivery-estimate');
    if (!el) return;

    if (!parsecs || parsecs <= 0) {
      el.textContent = 'Delivery: Instant (same system)';
    } else {
      const weeks = parsecs * 2;
      if (weeks === 2) {
        el.textContent = 'Delivery: ~2 weeks';
      } else if (weeks < 8) {
        el.textContent = `Delivery: ~${weeks} weeks`;
      } else {
        const months = Math.round(weeks / 4);
        el.textContent = `Delivery: ~${months} month${months > 1 ? 's' : ''}`;
      }
    }
  }

  /**
   * Initialize tab click handlers
   */
  function init() {
    document.querySelectorAll('.email-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose module
  window.EmailPanel = {
    show,
    close,
    switchTab,
    handleMailData,
    updateBadge,
    sendEmail,
    saveDraft,
    backToInbox,
    updateDeliveryEstimate
  };

})(window);
