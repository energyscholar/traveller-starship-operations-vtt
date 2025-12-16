/**
 * AR-151-3a: NPC Contacts Modal Module
 * Autorun 6: NPC contact management for players and GM
 */

/**
 * Show NPC contacts list modal
 * @param {Function} showModalContent - Function to show modal content
 * @param {Array} contacts - List of NPC contacts
 * @param {boolean} isGM - Whether user is GM
 */
export function showNPCContactsModal(showModalContent, contacts, isGM) {
  let html = `
    <div class="modal-header npc-contacts-modal">
      <h2>NPC Contacts</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body">
  `;

  if (!contacts || contacts.length === 0) {
    html += '<p class="text-muted">No known contacts.</p>';
  } else {
    html += '<div class="npc-contacts-list">';
    for (const contact of contacts) {
      html += `
        <div class="npc-contact-item">
          <div class="npc-contact-name">${contact.name}</div>
          ${contact.title ? `<div class="npc-contact-title">${contact.title}</div>` : ''}
          ${contact.location ? `<div class="npc-contact-location">Location: ${contact.location}</div>` : ''}
          ${contact.description ? `<div class="npc-contact-desc">${contact.description}</div>` : ''}
          ${isGM ? `<div class="npc-contact-visibility">Visible to: ${Array.isArray(contact.visible_to) && contact.visible_to.includes('all') ? 'Everyone' : (contact.visible_to?.length || 0) + ' players'}</div>` : ''}
        </div>
      `;
    }
    html += '</div>';
  }

  if (isGM) {
    html += `
      <div class="gm-controls">
        <button class="btn btn-small" onclick="showAddNPCContactForm()">+ Add Contact</button>
      </div>
    `;
  }

  html += `
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close-modal>Close</button>
    </div>
  `;

  showModalContent(html);
}

/**
 * Show add NPC contact form
 * @param {Function} showModalContent - Function to show modal content
 */
export function showAddNPCContactForm(showModalContent) {
  const html = `
    <div class="modal-header">
      <h2>Add NPC Contact</h2>
      <button class="btn-close" data-close-modal>×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>Name:</label>
        <input type="text" id="npc-name" class="form-input" required>
      </div>
      <div class="form-group">
        <label>Title:</label>
        <input type="text" id="npc-title" class="form-input" placeholder="e.g., Ship Broker, Scout">
      </div>
      <div class="form-group">
        <label>Location:</label>
        <input type="text" id="npc-location" class="form-input" placeholder="e.g., Regina Downport">
      </div>
      <div class="form-group">
        <label>Description:</label>
        <textarea id="npc-description" class="form-input" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="npc-visible-all"> Visible to all players</label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="state.socket.emit('ops:getNPCContacts')">Cancel</button>
      <button class="btn btn-primary" onclick="submitNPCContact()">Add Contact</button>
    </div>
  `;
  showModalContent(html);
}

/**
 * Submit new NPC contact
 * @param {Object} state - Application state
 * @param {Function} showNotification - Notification function
 */
export function submitNPCContact(state, showNotification) {
  const name = document.getElementById('npc-name')?.value;
  if (!name) {
    showNotification('Name is required', 'error');
    return;
  }

  const data = {
    name,
    title: document.getElementById('npc-title')?.value || null,
    location: document.getElementById('npc-location')?.value || null,
    description: document.getElementById('npc-description')?.value || null,
    visibleTo: document.getElementById('npc-visible-all')?.checked ? ['all'] : []
  };

  state.socket.emit('ops:addNPCContact', data);
  showNotification('Contact added', 'success');
  state.socket.emit('ops:getNPCContacts');
}
