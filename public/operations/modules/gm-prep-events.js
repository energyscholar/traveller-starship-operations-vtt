/**
 * AR-151-6a: GM Prep Events Module
 * Stage 8.2: Event management for GM Prep panel
 */

import { escapeHtml } from './utils.js';

/**
 * Render events list in GM Prep panel
 * @param {Object} state - Application state
 */
export function renderPrepEvents(state) {
  const list = document.getElementById('events-list');
  const count = document.getElementById('events-count');
  const events = state.prepEvents || [];

  if (count) count.textContent = `${events.length} event${events.length !== 1 ? 's' : ''}`;
  if (!list) return;

  if (events.length === 0) {
    list.innerHTML = '<p class="placeholder">No events prepared</p>';
    return;
  }

  // Sort by trigger_date if available
  const sorted = [...events].sort((a, b) => {
    if (a.trigger_date && b.trigger_date) return a.trigger_date.localeCompare(b.trigger_date);
    if (a.trigger_date) return -1;
    if (b.trigger_date) return 1;
    return 0;
  });

  list.innerHTML = sorted.map(event => `
    <div class="prep-item" data-event-id="${event.id}">
      <div class="prep-item-header">
        <span class="prep-item-title">${escapeHtml(event.name)}</span>
        <span class="prep-item-status ${event.status}">${event.status}</span>
      </div>
      <div class="prep-item-desc">${escapeHtml(event.description || '')}</div>
      <div class="prep-item-meta">
        <span>Type: ${event.event_type || 'manual'}</span>
        ${event.trigger_date ? `<span>Date: ${event.trigger_date}</span>` : ''}
        ${event.reveals_to_trigger?.length ? `<span>Reveals: ${event.reveals_to_trigger.length}</span>` : ''}
        ${event.npcs_to_reveal?.length ? `<span>NPCs: ${event.npcs_to_reveal.length}</span>` : ''}
      </div>
      <div class="prep-item-actions">
        ${event.status === 'pending' ?
          `<button class="btn btn-primary" onclick="triggerEvent('${event.id}')">Trigger</button>` :
          `<span class="text-muted">Triggered</span>`
        }
        <button class="btn" onclick="showEventDetail('${event.id}')">Detail</button>
      </div>
    </div>
  `).join('');
}

/**
 * Trigger an event
 * @param {Object} state - Application state
 * @param {Function} showNotification - Notification function
 * @param {Function} renderCallback - Callback to re-render list
 * @param {string} eventId - Event ID
 */
export function triggerEvent(state, showNotification, renderCallback, eventId) {
  state.socket.emit('ops:triggerEvent', {
    campaignId: state.campaign.id,
    eventId,
    gameDate: state.gameDate
  });
  const event = state.prepEvents.find(e => e.id === eventId);
  if (event) {
    event.status = 'triggered';
    renderCallback();
  }
  showNotification('Event triggered', 'success');
}

/**
 * Show event detail modal
 * @param {Object} state - Application state
 * @param {Function} showModalContent - Modal display function
 * @param {string} eventId - Event ID
 */
export function showEventDetail(state, showModalContent, eventId) {
  const event = state.prepEvents.find(e => e.id === eventId);
  if (!event) return;

  const html = `
    <div class="modal-header">
      <h2>${escapeHtml(event.name)}</h2>
      <button class="btn-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <p><strong>Type:</strong> ${escapeHtml(event.event_type || 'manual')}</p>
      <p><strong>Status:</strong> ${escapeHtml(event.status)}</p>
      ${event.trigger_date ? `<p><strong>Trigger Date:</strong> ${escapeHtml(event.trigger_date)}</p>` : ''}
      ${event.description ? `<p><strong>Description:</strong> ${escapeHtml(event.description)}</p>` : ''}
      ${event.player_text ? `<p><strong>Player Text:</strong> ${escapeHtml(event.player_text)}</p>` : ''}
      ${event.reveals_to_trigger?.length ? `<p><strong>Reveals:</strong> ${event.reveals_to_trigger.length} linked</p>` : ''}
      ${event.npcs_to_reveal?.length ? `<p><strong>NPCs to reveal:</strong> ${event.npcs_to_reveal.length}</p>` : ''}
      ${event.emails_to_send?.length ? `<p><strong>Emails to send:</strong> ${event.emails_to_send.length}</p>` : ''}
      ${event.notes ? `<p><strong>GM Notes:</strong> ${escapeHtml(event.notes)}</p>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Close</button>
      ${event.status === 'pending' ?
        `<button class="btn btn-primary" onclick="triggerEvent('${event.id}'); closeModal();">Trigger Now</button>` : ''
      }
    </div>
  `;
  showModalContent(html);
}
