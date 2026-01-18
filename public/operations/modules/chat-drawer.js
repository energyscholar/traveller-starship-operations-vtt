/**
 * AR-XX: Chat Drawer Module
 * Collapsible bottom drawer for campaign chat
 */

import { escapeHtml } from './utils.js';

// Module state
let isExpanded = false;
let isGM = false;
let currentRecipient = null;  // null = broadcast, else recipientId
let currentIdentity = 'gm';   // For GM: 'gm', 'char:id', 'npc:name'
let characters = [];          // Available characters for GM identity dropdown

/**
 * Initialize chat drawer
 * @param {Object} state - App state with socket
 */
export function initChatDrawer(state) {
  const drawer = document.getElementById('chat-drawer');
  if (!drawer) return;

  // Header click to toggle
  const header = drawer.querySelector('.chat-drawer-header');
  if (header) {
    header.addEventListener('click', () => toggleDrawer());
  }

  // Send button
  const sendBtn = document.getElementById('chat-send-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', () => sendMessage(state));
  }

  // Enter key to send
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(state);
      }
    });
  }

  // ESC key to collapse
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isExpanded) {
      collapseDrawer();
    }
  });

  // Recipient dropdown change
  const recipientSelect = document.getElementById('chat-recipient-select');
  if (recipientSelect) {
    recipientSelect.addEventListener('change', (e) => {
      currentRecipient = e.target.value || null;
    });
  }

  // Identity dropdown change (GM only)
  const identitySelect = document.getElementById('chat-identity-select');
  if (identitySelect) {
    identitySelect.addEventListener('change', (e) => {
      currentIdentity = e.target.value || 'gm';
    });
  }

  // Socket listeners
  state.socket.on('chat:message', (msg) => addMessage(msg));
  state.socket.on('chat:history', (data) => {
    const container = document.getElementById('chat-messages');
    if (container) container.innerHTML = '';
    (data.messages || []).forEach(msg => addMessage(msg));
  });
  state.socket.on('chat:playerList', (data) => updateRecipientDropdown(data.players || []));
  state.socket.on('chat:error', (data) => {
    console.error('[Chat Error]', data.error);
  });

  // Request history when joining bridge
  state.socket.emit('chat:getHistory');
  state.socket.emit('chat:getPlayerList');
}

/**
 * Toggle drawer expanded/collapsed
 */
export function toggleDrawer() {
  const drawer = document.getElementById('chat-drawer');
  if (!drawer) return;

  isExpanded = !isExpanded;
  drawer.classList.toggle('collapsed', !isExpanded);

  const toggle = drawer.querySelector('.chat-toggle-icon');
  if (toggle) {
    toggle.textContent = isExpanded ? '\u25BC' : '\u25B2';
  }

  if (isExpanded) {
    const input = document.getElementById('chat-input');
    if (input) input.focus();
  }
}

/**
 * Collapse drawer
 */
export function collapseDrawer() {
  const drawer = document.getElementById('chat-drawer');
  if (!drawer) return;

  isExpanded = false;
  drawer.classList.add('collapsed');

  const toggle = drawer.querySelector('.chat-toggle-icon');
  if (toggle) {
    toggle.textContent = '\u25B2';
  }
}

/**
 * Send a chat message
 * @param {Object} state - App state with socket
 */
function sendMessage(state) {
  const input = document.getElementById('chat-input');
  const message = input?.value?.trim();

  if (!message) return;

  const payload = {
    message,
    type: currentRecipient ? 'whisper' : 'broadcast',
    recipientId: currentRecipient,
    speakAs: isGM ? currentIdentity : null
  };

  state.socket.emit('chat:send', payload);
  input.value = '';
}

/**
 * Add a message to the chat display
 * @param {Object} msg - ChatMessage object
 */
function addMessage(msg) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const name = escapeHtml(msg.senderName || 'Unknown');
  const role = escapeHtml(msg.senderRole || 'player');
  const text = escapeHtml(msg.message || '');

  const msgEl = document.createElement('div');
  msgEl.className = 'chat-message';

  if (msg.type === 'whisper') {
    msgEl.classList.add('chat-whisper');
    const toFrom = msg.recipientName ? `to ${escapeHtml(msg.recipientName)}` : '';
    msgEl.innerHTML = `<span class="chat-time">[${time}]</span> <span class="chat-whisper-label">[whisper ${toFrom}]</span> <strong class="chat-sender">${name}</strong>: ${text}`;
  } else {
    msgEl.innerHTML = `<span class="chat-time">[${time}]</span> <strong class="chat-sender">${name}</strong> <span class="chat-role">(${role})</span>: ${text}`;
  }

  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;

  // Limit messages
  while (container.children.length > 100) {
    container.removeChild(container.firstChild);
  }

  // Update unread indicator if collapsed
  if (!isExpanded) {
    const badge = document.getElementById('chat-unread-badge');
    if (badge) {
      const count = parseInt(badge.textContent || '0', 10) + 1;
      badge.textContent = count;
      badge.style.display = 'inline';
    }
  }
}

/**
 * Update recipient dropdown with connected players
 * @param {Array} players - [{id, name, role}]
 */
function updateRecipientDropdown(players) {
  const select = document.getElementById('chat-recipient-select');
  if (!select) return;

  // Keep "All Players" option, remove others
  while (select.options.length > 1) {
    select.remove(1);
  }

  players.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.role})`;
    select.appendChild(opt);
  });
}

/**
 * Set GM status and populate identity dropdown
 * @param {boolean} gmStatus
 * @param {Array} chars - [{id, name}] characters GM can speak as
 */
export function setGMStatus(gmStatus, chars = []) {
  isGM = gmStatus;
  characters = chars;

  const identityBar = document.getElementById('chat-identity-bar');
  if (identityBar) {
    identityBar.style.display = isGM ? 'flex' : 'none';
  }

  if (isGM) {
    updateIdentityDropdown(chars);
  }
}

/**
 * Update identity dropdown with characters
 * @param {Array} chars - [{id, name}]
 */
function updateIdentityDropdown(chars) {
  const select = document.getElementById('chat-identity-select');
  if (!select) return;

  // Clear and rebuild
  select.innerHTML = '<option value="gm">GM</option>';

  chars.forEach(c => {
    const opt = document.createElement('option');
    opt.value = `char:${c.id}`;
    opt.textContent = c.name;
    select.appendChild(opt);
  });

  currentIdentity = 'gm';
}

/**
 * Clear unread badge when drawer expands
 */
export function clearUnreadBadge() {
  const badge = document.getElementById('chat-unread-badge');
  if (badge) {
    badge.textContent = '0';
    badge.style.display = 'none';
  }
}
