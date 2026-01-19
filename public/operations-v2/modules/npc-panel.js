/**
 * NPC Panel for V2 GUI
 * AI-powered NPC dialogue interface with GM approval queue
 */

// Role display configuration
const ROLE_CONFIG = {
  patron: { color: '#4CAF50', icon: '$', label: 'Patron' },
  ally: { color: '#2196F3', icon: '+', label: 'Ally' },
  contact: { color: '#9E9E9E', icon: '~', label: 'Contact' },
  neutral: { color: '#757575', icon: '-', label: 'Neutral' },
  enemy: { color: '#F44336', icon: '!', label: 'Enemy' }
};

/**
 * Render NPC list panel
 * @param {Array} npcs - Array of NPC objects
 * @param {Object} options - Render options
 * @returns {string} HTML string
 */
function renderNPCList(npcs, options = {}) {
  const { aiAvailable = false, onSelect, onReview } = options;

  if (!npcs || npcs.length === 0) {
    return `
      <div class="npc-panel">
        <div class="npc-panel-header">
          <h3>NPC Contacts</h3>
          <span class="ai-status ${aiAvailable ? 'online' : 'offline'}">
            AI ${aiAvailable ? 'Ready' : 'Offline'}
          </span>
        </div>
        <div class="npc-empty">
          <p>No NPCs in this campaign.</p>
          <p class="hint">NPCs can be added via campaign management.</p>
        </div>
      </div>
    `;
  }

  const npcItems = npcs.map((npc, idx) => {
    const role = npc.role || 'neutral';
    const config = ROLE_CONFIG[role] || ROLE_CONFIG.neutral;

    return `
      <div class="npc-item" data-npc-id="${npc.id}" data-index="${idx}">
        <div class="npc-icon" style="color: ${config.color}">${config.icon}</div>
        <div class="npc-info">
          <div class="npc-name">${escapeHtml(npc.name)}</div>
          ${npc.title ? `<div class="npc-title">${escapeHtml(npc.title)}</div>` : ''}
          ${npc.location_text ? `<div class="npc-location">${escapeHtml(npc.location_text)}</div>` : ''}
        </div>
        <div class="npc-role" style="color: ${config.color}">${config.label}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="npc-panel">
      <div class="npc-panel-header">
        <h3>NPC Contacts</h3>
        <span class="ai-status ${aiAvailable ? 'online' : 'offline'}">
          AI ${aiAvailable ? 'Ready' : 'Offline'}
        </span>
      </div>
      <div class="npc-list">
        ${npcItems}
      </div>
      <div class="npc-panel-footer">
        <button class="btn-review" onclick="NPCPanel.showReviewQueue()">GM Review Queue</button>
      </div>
    </div>
  `;
}

/**
 * Render NPC detail panel
 * @param {Object} npc - NPC object
 * @param {boolean} isGM - Whether viewer is GM
 * @returns {string} HTML string
 */
function renderNPCDetail(npc, isGM = false) {
  if (!npc) {
    return '<div class="npc-detail"><p>NPC not found.</p></div>';
  }

  const role = npc.role || 'neutral';
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.neutral;

  let hiddenSection = '';
  if (isGM && npc.motivation_hidden) {
    hiddenSection = `
      <div class="npc-section gm-only">
        <h4>Hidden Agenda (GM Only)</h4>
        <p>${escapeHtml(npc.motivation_hidden)}</p>
      </div>
    `;
  }

  let gmNotes = '';
  if (isGM && npc.notes) {
    gmNotes = `
      <div class="npc-section gm-only">
        <h4>GM Notes</h4>
        <p>${escapeHtml(npc.notes)}</p>
      </div>
    `;
  }

  return `
    <div class="npc-detail">
      <div class="npc-detail-header">
        <button class="btn-back" onclick="NPCPanel.showList()">← Back</button>
        <h3>${escapeHtml(npc.name)}</h3>
      </div>

      ${npc.title ? `<div class="npc-subtitle">${escapeHtml(npc.title)}</div>` : ''}

      <div class="npc-meta">
        <span class="npc-role-badge" style="background: ${config.color}">${config.label}</span>
        ${npc.current_status && npc.current_status !== 'alive' ?
          `<span class="npc-status-badge ${npc.current_status}">${npc.current_status}</span>` : ''}
        ${npc.location_text ? `<span class="npc-location-badge">${escapeHtml(npc.location_text)}</span>` : ''}
      </div>

      ${npc.personality ? `
        <div class="npc-section">
          <h4>Personality</h4>
          <p>${escapeHtml(npc.personality)}</p>
        </div>
      ` : ''}

      ${npc.motivation_public ? `
        <div class="npc-section">
          <h4>Known Goals</h4>
          <p>${escapeHtml(npc.motivation_public)}</p>
        </div>
      ` : ''}

      ${hiddenSection}

      ${npc.background ? `
        <div class="npc-section">
          <h4>Background</h4>
          <p>${escapeHtml(npc.background)}</p>
        </div>
      ` : ''}

      ${gmNotes}

      <div class="npc-actions">
        <button class="btn-talk" onclick="NPCPanel.startDialogue('${npc.id}')">
          💬 Talk to ${escapeHtml(npc.name)}
        </button>
      </div>
    </div>
  `;
}

/**
 * Render dialogue interface
 * @param {Object} npc - NPC object
 * @param {Array} history - Conversation history
 * @returns {string} HTML string
 */
function renderDialogue(npc, history = []) {
  const historyHtml = history.map(msg => `
    <div class="dialogue-message ${msg.role}">
      <div class="dialogue-speaker">${msg.role === 'user' ? 'You' : escapeHtml(npc.name)}</div>
      <div class="dialogue-text">${escapeHtml(msg.content)}</div>
    </div>
  `).join('');

  return `
    <div class="npc-dialogue">
      <div class="dialogue-header">
        <button class="btn-back" onclick="NPCPanel.showDetail('${npc.id}')">← Back</button>
        <h3>Dialogue with ${escapeHtml(npc.name)}</h3>
      </div>

      <div class="dialogue-history" id="dialogue-history">
        ${historyHtml || '<p class="dialogue-empty">Start a conversation...</p>'}
      </div>

      <div class="dialogue-input-area">
        <textarea id="dialogue-input" placeholder="Type your message..." rows="3"></textarea>
        <button class="btn-send" onclick="NPCPanel.sendMessage('${npc.id}')">Send</button>
      </div>

      <div class="dialogue-status" id="dialogue-status"></div>
    </div>
  `;
}

/**
 * Render GM review queue
 * @param {Array} pending - Pending responses
 * @returns {string} HTML string
 */
function renderReviewQueue(pending) {
  if (!pending || pending.length === 0) {
    return `
      <div class="review-queue">
        <div class="review-header">
          <button class="btn-back" onclick="NPCPanel.showList()">← Back</button>
          <h3>GM Review Queue</h3>
        </div>
        <div class="review-empty">
          <p>No pending AI responses to review.</p>
        </div>
      </div>
    `;
  }

  const items = pending.map((item, idx) => `
    <div class="review-item" data-id="${item.id}">
      <div class="review-npc">${escapeHtml(item.npc_name || 'Unknown NPC')}</div>
      <div class="review-preview">"${escapeHtml((item.response_text || '').substring(0, 60))}..."</div>
      <div class="review-actions">
        <button class="btn-approve" onclick="NPCPanel.approveResponse('${item.id}')">✓ Approve</button>
        <button class="btn-reject" onclick="NPCPanel.rejectResponse('${item.id}')">✗ Reject</button>
        <button class="btn-view" onclick="NPCPanel.viewResponse('${item.id}')">View</button>
      </div>
    </div>
  `).join('');

  return `
    <div class="review-queue">
      <div class="review-header">
        <button class="btn-back" onclick="NPCPanel.showList()">← Back</button>
        <h3>GM Review Queue</h3>
        <span class="review-count">${pending.length} pending</span>
      </div>
      <div class="review-list">
        ${items}
      </div>
    </div>
  `;
}

/**
 * Render review detail
 * @param {Object} item - Queue item
 * @returns {string} HTML string
 */
function renderReviewDetail(item) {
  return `
    <div class="review-detail">
      <div class="review-header">
        <button class="btn-back" onclick="NPCPanel.showReviewQueue()">← Back</button>
        <h3>Review: ${escapeHtml(item.npc_name || 'Unknown NPC')}</h3>
      </div>

      <div class="review-content">
        <h4>Generated Response:</h4>
        <div class="review-text">${escapeHtml(item.response_text || '')}</div>
      </div>

      <div class="review-edit">
        <h4>Edit before sending (optional):</h4>
        <textarea id="review-edit-text" rows="6">${escapeHtml(item.response_text || '')}</textarea>
      </div>

      <div class="review-actions">
        <button class="btn-approve-send" onclick="NPCPanel.approveAndSend('${item.id}')">
          ✓ Approve & Send
        </button>
        <button class="btn-reject" onclick="NPCPanel.rejectResponse('${item.id}')">
          ✗ Reject
        </button>
      </div>
    </div>
  `;
}

/**
 * Get CSS styles for NPC panel
 * @returns {string} CSS styles
 */
function getStyles() {
  return `
    .npc-panel { padding: 1rem; }
    .npc-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .npc-panel-header h3 { margin: 0; }
    .ai-status { font-size: 0.8rem; padding: 0.25rem 0.5rem; border-radius: 4px; }
    .ai-status.online { background: #4CAF50; color: white; }
    .ai-status.offline { background: #757575; color: white; }

    .npc-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .npc-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--bg-secondary, #2a2a2a); border-radius: 4px; cursor: pointer; }
    .npc-item:hover { background: var(--bg-hover, #3a3a3a); }
    .npc-icon { font-size: 1.5rem; width: 2rem; text-align: center; }
    .npc-info { flex: 1; }
    .npc-name { font-weight: bold; }
    .npc-title, .npc-location { font-size: 0.85rem; opacity: 0.7; }
    .npc-role { font-size: 0.85rem; text-transform: uppercase; }

    .npc-panel-footer { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color, #444); }
    .btn-review { background: #9C27B0; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }

    .npc-detail { padding: 1rem; }
    .npc-detail-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
    .npc-subtitle { opacity: 0.8; margin-bottom: 1rem; }
    .npc-meta { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .npc-role-badge, .npc-status-badge, .npc-location-badge { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }
    .npc-role-badge { color: white; }
    .npc-status-badge.dead { background: #F44336; color: white; }
    .npc-status-badge.missing { background: #FF9800; color: white; }
    .npc-location-badge { background: var(--bg-secondary, #2a2a2a); }

    .npc-section { margin: 1rem 0; }
    .npc-section h4 { margin: 0 0 0.5rem 0; font-size: 0.9rem; text-transform: uppercase; opacity: 0.7; }
    .npc-section.gm-only { background: rgba(156, 39, 176, 0.1); padding: 0.75rem; border-radius: 4px; border-left: 3px solid #9C27B0; }

    .npc-actions { margin-top: 1.5rem; }
    .btn-talk { background: #2196F3; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; font-size: 1rem; }
    .btn-back { background: transparent; border: 1px solid var(--border-color, #444); padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; color: inherit; }

    .npc-dialogue { display: flex; flex-direction: column; height: 100%; }
    .dialogue-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .dialogue-history { flex: 1; overflow-y: auto; padding: 1rem; background: var(--bg-secondary, #2a2a2a); border-radius: 4px; margin-bottom: 1rem; min-height: 200px; }
    .dialogue-message { margin-bottom: 1rem; }
    .dialogue-message.user .dialogue-speaker { color: #2196F3; }
    .dialogue-message.assistant .dialogue-speaker { color: #4CAF50; }
    .dialogue-speaker { font-weight: bold; font-size: 0.85rem; margin-bottom: 0.25rem; }
    .dialogue-text { line-height: 1.5; }
    .dialogue-empty { opacity: 0.5; text-align: center; }

    .dialogue-input-area { display: flex; gap: 0.5rem; }
    .dialogue-input-area textarea { flex: 1; resize: none; padding: 0.5rem; border-radius: 4px; border: 1px solid var(--border-color, #444); background: var(--bg-secondary, #2a2a2a); color: inherit; }
    .btn-send { background: #4CAF50; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
    .dialogue-status { margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.7; }

    .review-queue { padding: 1rem; }
    .review-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .review-count { background: #FF9800; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }
    .review-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .review-item { padding: 1rem; background: var(--bg-secondary, #2a2a2a); border-radius: 4px; }
    .review-npc { font-weight: bold; margin-bottom: 0.5rem; }
    .review-preview { font-style: italic; opacity: 0.8; margin-bottom: 0.75rem; }
    .review-actions { display: flex; gap: 0.5rem; }
    .btn-approve { background: #4CAF50; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer; }
    .btn-reject { background: #F44336; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer; }
    .btn-view { background: #2196F3; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer; }

    .review-detail { padding: 1rem; }
    .review-content { margin: 1rem 0; }
    .review-text { background: var(--bg-secondary, #2a2a2a); padding: 1rem; border-radius: 4px; line-height: 1.5; }
    .review-edit { margin: 1rem 0; }
    .review-edit textarea { width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid var(--border-color, #444); background: var(--bg-secondary, #2a2a2a); color: inherit; }
    .btn-approve-send { background: #4CAF50; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 4px; cursor: pointer; }

    .npc-empty, .review-empty { text-align: center; padding: 2rem; opacity: 0.7; }
    .hint { font-size: 0.85rem; opacity: 0.6; }
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.NPCPanel = {
    renderNPCList,
    renderNPCDetail,
    renderDialogue,
    renderReviewQueue,
    renderReviewDetail,
    getStyles,

    // State
    _npcs: [],
    _currentNPC: null,
    _dialogueHistory: [],
    _pendingReviews: [],
    _container: null,
    _socket: null,
    _campaignId: null,
    _isGM: true,

    /**
     * Initialize the NPC panel
     */
    init(container, socket, campaignId, isGM = true) {
      this._container = container;
      this._socket = socket;
      this._campaignId = campaignId;
      this._isGM = isGM;

      // Inject styles
      if (!document.getElementById('npc-panel-styles')) {
        const style = document.createElement('style');
        style.id = 'npc-panel-styles';
        style.textContent = getStyles();
        document.head.appendChild(style);
      }

      // Set up socket listeners
      if (socket) {
        socket.on('npc:list', (data) => {
          this._npcs = data.npcs || [];
          this.showList();
        });

        socket.on('npc:response', (data) => {
          this._addToHistory('assistant', data.response);
          this._updateDialogueStatus('');
        });

        socket.on('npc:error', (data) => {
          this._updateDialogueStatus(`Error: ${data.error}`);
        });

        socket.on('npc:reviewQueue', (data) => {
          this._pendingReviews = data.pending || [];
          if (this._currentView === 'review') {
            this.showReviewQueue();
          }
        });
      }

      this.showList();
    },

    /**
     * Show NPC list
     */
    showList() {
      this._currentView = 'list';
      if (this._container) {
        const aiAvailable = this._socket ? true : false; // Simplified check
        this._container.innerHTML = renderNPCList(this._npcs, { aiAvailable });

        // Add click handlers
        this._container.querySelectorAll('.npc-item').forEach(item => {
          item.addEventListener('click', () => {
            const id = item.dataset.npcId;
            this.showDetail(id);
          });
        });
      }
    },

    /**
     * Show NPC detail
     */
    showDetail(npcId) {
      this._currentView = 'detail';
      const npc = this._npcs.find(n => n.id === npcId);
      if (npc && this._container) {
        this._currentNPC = npc;
        this._container.innerHTML = renderNPCDetail(npc, this._isGM);
      }
    },

    /**
     * Start dialogue
     */
    startDialogue(npcId) {
      this._currentView = 'dialogue';
      const npc = this._npcs.find(n => n.id === npcId);
      if (npc && this._container) {
        this._currentNPC = npc;
        this._dialogueHistory = [];
        this._container.innerHTML = renderDialogue(npc, this._dialogueHistory);

        // Focus input
        const input = document.getElementById('dialogue-input');
        if (input) input.focus();

        // Enter key handler
        if (input) {
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              this.sendMessage(npcId);
            }
          });
        }
      }
    },

    /**
     * Send message to NPC
     */
    sendMessage(npcId) {
      const input = document.getElementById('dialogue-input');
      if (!input || !input.value.trim()) return;

      const message = input.value.trim();
      input.value = '';

      // Add to history
      this._addToHistory('user', message);

      // Update status
      this._updateDialogueStatus('Generating response...');

      // Send via socket
      if (this._socket) {
        this._socket.emit('npc:talk', {
          campaignId: this._campaignId,
          npcId: npcId,
          message: message
        });
      } else {
        this._updateDialogueStatus('AI not available (no connection)');
      }
    },

    /**
     * Add message to dialogue history
     */
    _addToHistory(role, content) {
      this._dialogueHistory.push({ role, content });

      const historyEl = document.getElementById('dialogue-history');
      if (historyEl && this._currentNPC) {
        historyEl.innerHTML = this._dialogueHistory.map(msg => `
          <div class="dialogue-message ${msg.role}">
            <div class="dialogue-speaker">${msg.role === 'user' ? 'You' : escapeHtml(this._currentNPC.name)}</div>
            <div class="dialogue-text">${escapeHtml(msg.content)}</div>
          </div>
        `).join('');

        // Scroll to bottom
        historyEl.scrollTop = historyEl.scrollHeight;
      }
    },

    /**
     * Update dialogue status
     */
    _updateDialogueStatus(message) {
      const statusEl = document.getElementById('dialogue-status');
      if (statusEl) {
        statusEl.textContent = message;
      }
    },

    /**
     * Show review queue
     */
    showReviewQueue() {
      this._currentView = 'review';
      if (this._container) {
        this._container.innerHTML = renderReviewQueue(this._pendingReviews);
      }
    },

    /**
     * View response detail
     */
    viewResponse(itemId) {
      const item = this._pendingReviews.find(i => i.id === itemId);
      if (item && this._container) {
        this._container.innerHTML = renderReviewDetail(item);
      }
    },

    /**
     * Approve response
     */
    approveResponse(itemId) {
      if (this._socket) {
        this._socket.emit('npc:approve', {
          campaignId: this._campaignId,
          responseId: itemId
        });
      }
      // Remove from local list
      this._pendingReviews = this._pendingReviews.filter(i => i.id !== itemId);
      this.showReviewQueue();
    },

    /**
     * Approve and send with edits
     */
    approveAndSend(itemId) {
      const editText = document.getElementById('review-edit-text');
      const edits = editText ? editText.value : null;

      if (this._socket) {
        this._socket.emit('npc:approve', {
          campaignId: this._campaignId,
          responseId: itemId,
          edits: edits
        });
      }
      // Remove from local list
      this._pendingReviews = this._pendingReviews.filter(i => i.id !== itemId);
      this.showReviewQueue();
    },

    /**
     * Reject response
     */
    rejectResponse(itemId) {
      if (this._socket) {
        this._socket.emit('npc:reject', {
          campaignId: this._campaignId,
          responseId: itemId
        });
      }
      // Remove from local list
      this._pendingReviews = this._pendingReviews.filter(i => i.id !== itemId);
      this.showReviewQueue();
    }
  };
}

// Export for Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    renderNPCList,
    renderNPCDetail,
    renderDialogue,
    renderReviewQueue,
    renderReviewDetail,
    getStyles
  };
}
