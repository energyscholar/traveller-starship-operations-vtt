/**
 * AR-151-6c: GM Prep Handouts Module
 * Stage 8.3: Handout management for GM Prep panel
 */

import { escapeHtml } from './utils.js';

/**
 * Render handouts list in GM Prep panel
 * @param {Object} state - Application state
 */
export function renderPrepHandouts(state) {
  const list = document.getElementById('handouts-list');
  const count = document.getElementById('handouts-count');
  const handouts = state.prepHandouts || [];

  if (count) count.textContent = `${handouts.length} handout${handouts.length !== 1 ? 's' : ''}`;
  if (!list) return;

  if (handouts.length === 0) {
    list.innerHTML = '<p class="placeholder">No handouts prepared</p>';
    return;
  }

  list.innerHTML = handouts.map(handout => `
    <div class="prep-item" data-handout-id="${handout.id}">
      <div class="prep-item-header">
        <span class="prep-item-title">${escapeHtml(handout.title)}</span>
        <span class="prep-item-status ${handout.visibility}">${handout.visibility}</span>
      </div>
      <div class="prep-item-desc">
        Type: ${handout.handout_type || 'document'}
        ${handout.file_url ? ' | Has file' : ''}
      </div>
      <div class="prep-item-actions">
        ${handout.visibility === 'hidden' ?
          `<button class="btn btn-primary btn-sm" onclick="shareHandout('${handout.id}')">Share</button>` :
          `<button class="btn btn-sm" onclick="hideHandout('${handout.id}')">Hide</button>`
        }
        <button class="btn btn-sm" onclick="showHandoutDetail('${handout.id}')">View</button>
      </div>
    </div>
  `).join('');
}

/**
 * Share handout with players
 * @param {Object} state - Application state
 * @param {Function} showNotification - Notification function
 * @param {Function} renderCallback - Callback to re-render list
 * @param {string} handoutId - Handout ID
 */
export function shareHandout(state, showNotification, renderCallback, handoutId) {
  state.socket.emit('ops:shareHandout', { handoutId });
  const handout = state.prepHandouts.find(h => h.id === handoutId);
  if (handout) {
    handout.visibility = 'revealed';
    renderCallback();
  }
  showNotification('Handout shared with players', 'success');
}

/**
 * Hide handout from players
 * @param {Object} state - Application state
 * @param {Function} renderCallback - Callback to re-render list
 * @param {string} handoutId - Handout ID
 */
export function hideHandout(state, renderCallback, handoutId) {
  const handout = state.prepHandouts.find(h => h.id === handoutId);
  if (handout) {
    handout.visibility = 'hidden';
    renderCallback();
  }
}

/**
 * Show handout detail modal
 * @param {Object} state - Application state
 * @param {Function} showModalContent - Modal display function
 * @param {string} handoutId - Handout ID
 */
export function showHandoutDetail(state, showModalContent, handoutId) {
  const handout = state.prepHandouts.find(h => h.id === handoutId);
  if (!handout) return;

  const html = `
    <div class="modal-header">
      <h2>${escapeHtml(handout.title)}</h2>
      <button class="btn-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <p><strong>Type:</strong> ${escapeHtml(handout.handout_type || 'document')}</p>
      <p><strong>Visibility:</strong> ${escapeHtml(handout.visibility)}</p>
      ${handout.file_url ? `<p><strong>File:</strong> <a href="${escapeHtml(handout.file_url)}" target="_blank">View</a></p>` : ''}
      ${handout.content_text ? `<div class="handout-content">${escapeHtml(handout.content_text)}</div>` : ''}
      ${handout.notes ? `<p><strong>GM Notes:</strong> ${escapeHtml(handout.notes)}</p>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Close</button>
      ${handout.visibility === 'hidden' ?
        `<button class="btn btn-primary" onclick="shareHandout('${handout.id}'); closeModal();">Share</button>` : ''
      }
    </div>
  `;
  showModalContent(html);
}
