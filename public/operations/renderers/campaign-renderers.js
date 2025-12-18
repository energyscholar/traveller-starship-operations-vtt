/**
 * AR-201 Phase 4: Campaign Renderers
 *
 * Render functions for campaign list and related UI.
 */

// State and helpers will be injected
let state = null;
let helpers = null;

/**
 * Initialize renderer with state and helpers
 */
export function initCampaignRenderers(appState, appHelpers) {
  state = appState;
  helpers = appHelpers;
}

/**
 * Render campaign list
 */
export function renderCampaignList() {
  const { escapeHtml, showDeleteCampaignModal } = helpers;
  const container = document.getElementById('campaign-list');

  if (state.campaigns.length === 0) {
    container.innerHTML = '<p class="placeholder">No campaigns yet</p>';
    return;
  }

  container.innerHTML = state.campaigns.map(c => `
    <div class="campaign-item" data-campaign-id="${c.id}">
      <div class="campaign-info">
        <div class="campaign-name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div>
        <div class="campaign-meta">${escapeHtml(c.gm_name)} · ${c.current_system}</div>
      </div>
      <div class="campaign-actions">
        <button class="btn btn-small btn-primary btn-select" title="Select campaign">Select</button>
        <button class="btn btn-small btn-icon btn-rename" title="Rename campaign">✏</button>
        <button class="btn btn-small btn-icon btn-duplicate" title="Duplicate campaign">⧉</button>
        <button class="btn btn-small btn-icon btn-export" title="Export campaign">📥</button>
        <button class="btn btn-small btn-icon btn-delete" title="Delete campaign">🗑</button>
      </div>
    </div>
  `).join('');

  // Select campaign
  container.querySelectorAll('.btn-select').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const campaignId = btn.closest('.campaign-item').dataset.campaignId;
      state.socket.emit('ops:selectCampaign', { campaignId });
    });
  });

  // Duplicate campaign
  container.querySelectorAll('.btn-duplicate').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const campaignId = btn.closest('.campaign-item').dataset.campaignId;
      state.socket.emit('ops:duplicateCampaign', { campaignId });
    });
  });

  // AR-21: Rename campaign (inline edit)
  container.querySelectorAll('.btn-rename').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.campaign-item');
      const campaignId = item.dataset.campaignId;
      const nameEl = item.querySelector('.campaign-name');
      const currentName = nameEl.textContent;

      // Create inline input
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'campaign-name-input';
      input.value = currentName;
      input.style.cssText = 'width: 100%; padding: 2px 4px; font-size: inherit;';

      nameEl.replaceWith(input);
      input.focus();
      input.select();

      const save = () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
          state.socket.emit('ops:renameCampaign', { campaignId, newName });
        }
        // Restore display (will be re-rendered on success)
        const newEl = document.createElement('div');
        newEl.className = 'campaign-name';
        newEl.textContent = newName || currentName;
        input.replaceWith(newEl);
      };

      input.addEventListener('blur', save);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') {
          const newEl = document.createElement('div');
          newEl.className = 'campaign-name';
          newEl.textContent = currentName;
          input.replaceWith(newEl);
        }
      });
    });
  });

  // AR-21: Export campaign
  container.querySelectorAll('.btn-export').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const campaignId = btn.closest('.campaign-item').dataset.campaignId;
      state.socket.emit('ops:exportCampaign', { campaignId });
    });
  });

  // Delete campaign
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.campaign-item');
      const campaignId = item.dataset.campaignId;
      const campaignName = item.querySelector('.campaign-name').textContent;
      showDeleteCampaignModal(campaignId, campaignName);
    });
  });
}

/**
 * Show delete campaign confirmation modal
 */
export function showDeleteCampaignModal(campaignId, campaignName) {
  const { escapeHtml } = helpers;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content delete-modal">
      <div class="modal-header">
        <h2>Delete Campaign</h2>
        <button class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to delete "<strong>${escapeHtml(campaignName)}</strong>"?</p>
        <p class="text-warning">This will permanently delete all players, ships, and logs.</p>
        <div class="form-group">
          <label>Type DELETE to confirm:</label>
          <input type="text" id="delete-confirm-input" placeholder="Type DELETE" autocomplete="off">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-cancel">Cancel</button>
        <button class="btn btn-danger btn-confirm-delete" disabled>Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = modal.querySelector('#delete-confirm-input');
  const confirmBtn = modal.querySelector('.btn-confirm-delete');
  const cancelBtn = modal.querySelector('.btn-cancel');
  const closeBtn = modal.querySelector('.btn-close');

  input.addEventListener('input', () => {
    confirmBtn.disabled = input.value !== 'DELETE';
  });

  confirmBtn.addEventListener('click', () => {
    state.socket.emit('ops:deleteCampaign', { campaignId });
    modal.remove();
  });

  cancelBtn.addEventListener('click', () => modal.remove());
  closeBtn.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  input.focus();
}
