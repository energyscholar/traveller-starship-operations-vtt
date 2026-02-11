/**
 * Combat Module (Autorun 14)
 * Handles Gunner actions, target management, and combat contact UI
 */

import { escapeHtml } from './utils.js';

/**
 * Fire weapon at locked target
 * @param {Object} state - App state
 */
export function fireWeapon(state) {
  const selectedTarget = document.querySelector('.target-item.selected');
  const targetId = selectedTarget?.dataset?.contactId || state.lockedTarget;

  if (!targetId) {
    window.showNotification('No target locked - select a target first', 'error');
    return;
  }

  const selectedWeapon = document.querySelector('input[name="weapon-select"]:checked');
  const weaponId = selectedWeapon?.value || null;

  state.socket.emit('ops:fireWeapon', { targetId, weaponId });
  window.showNotification('Firing...', 'warning');
}

/**
 * Lock target for gunner
 * @param {Object} state - App state
 * @param {string} contactId - Contact ID to lock
 */
export function lockTarget(state, contactId) {
  if (!contactId) {
    window.showNotification('Invalid target', 'error');
    return;
  }

  state.socket.emit('ops:acquireTarget', { contactId });
  state.lockedTarget = contactId;

  document.querySelectorAll('.target-item').forEach(item => {
    item.classList.remove('selected');
    if (item.dataset.contactId === contactId) {
      item.classList.add('selected');
    }
  });
}

/**
 * Select weapon for gunner
 * @param {Object} state - App state
 * @param {string} weaponId - Weapon ID
 */
export function selectWeapon(state, weaponId) {
  state.selectedWeapon = weaponId;
}

/**
 * Toggle point defense mode
 * @param {Object} state - App state
 */
export function togglePointDefense(state) {
  const currentState = state.pointDefenseEnabled || false;
  const newState = !currentState;

  state.socket.emit('ops:pointDefense', { enabled: newState });
  state.pointDefenseEnabled = newState;

  window.showNotification(
    newState ? 'Point defense ACTIVE' : 'Point defense DEACTIVATED',
    newState ? 'warning' : 'info'
  );
}

/**
 * Show modal to add a combat contact
 * @param {Object} state - App state
 */
export function showAddCombatContactModal(state) {
  const modalOverlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');

  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>Add Combat Contact</h3>
      <button class="btn-close" onclick="closeModal()">×</button>
    </div>
    <form id="add-combat-contact-form" class="modal-form">
      <div class="form-group">
        <label for="contact-name">Name/Transponder</label>
        <input type="text" id="contact-name" required placeholder="e.g., Corsair Raider">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="contact-type">Ship Type</label>
          <select id="contact-type">
            <option value="ship">Ship</option>
            <option value="fighter">Fighter</option>
            <option value="Station">Station</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div class="form-group">
          <label for="contact-disposition">Disposition</label>
          <select id="contact-disposition">
            <option value="hostile" selected>Hostile</option>
            <option value="neutral">Neutral</option>
            <option value="unknown">Unknown</option>
            <option value="friendly">Friendly</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="contact-range">Range Band</label>
          <select id="contact-range">
            <option value="distant">Distant</option>
            <option value="extreme">Extreme</option>
            <option value="long" selected>Long</option>
            <option value="medium">Medium</option>
            <option value="short">Short</option>
            <option value="close">Close</option>
            <option value="adjacent">Adjacent</option>
          </select>
        </div>
        <div class="form-group">
          <label for="contact-range-km">Range (km)</label>
          <input type="number" id="contact-range-km" value="500" min="0">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="contact-hull">Hull Points</label>
          <input type="number" id="contact-hull" value="40" min="1">
        </div>
        <div class="form-group">
          <label for="contact-armor">Armor</label>
          <input type="number" id="contact-armor" value="0" min="0">
        </div>
      </div>
      <div class="form-group">
        <label for="contact-notes">GM Notes (hidden from players)</label>
        <textarea id="contact-notes" rows="2" placeholder="True identity, tactics, etc."></textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="contact-targetable" checked>
          Make targetable (Gunner can fire on this)
        </label>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-danger">Add Hostile Contact</button>
      </div>
    </form>
  `;

  modalOverlay.classList.remove('hidden');

  document.getElementById('add-combat-contact-form').onsubmit = (e) => {
    e.preventDefault();
    submitCombatContact(state);
  };
}

/**
 * Submit combat contact form
 * @param {Object} state - App state
 */
export function submitCombatContact(state) {
  const name = document.getElementById('contact-name').value.trim();
  const type = document.getElementById('contact-type').value;
  const disposition = document.getElementById('contact-disposition').value;
  const range_band = document.getElementById('contact-range').value;
  const range_km = parseInt(document.getElementById('contact-range-km').value) || 500;
  const hull = parseInt(document.getElementById('contact-hull').value) || 40;
  const armor = parseInt(document.getElementById('contact-armor').value) || 0;
  const gm_notes = document.getElementById('contact-notes').value.trim();
  const is_targetable = document.getElementById('contact-targetable').checked ? 1 : 0;

  if (!name) {
    window.showNotification('Contact name is required', 'error');
    return;
  }

  const contactData = {
    name,
    type,
    transponder: name,
    disposition,
    range_band,
    range_km,
    health: hull,
    max_health: hull,
    armor,
    gm_notes: gm_notes || null,
    is_targetable,
    weapons_free: disposition === 'hostile' ? 1 : 0
  };

  state.socket.emit('ops:addContact', contactData);
  window.closeModal();
  window.showNotification(`Contact added: ${name}`, 'success');
}

/**
 * Render combat contacts list in prep panel
 * @param {Object} state - App state
 */
export function renderCombatContactsList(state) {
  const list = document.getElementById('combat-contacts-list');
  const count = document.getElementById('contacts-count');

  if (!list || !count) return;

  const targetableContacts = (state.contacts || []).filter(c => c.is_targetable);

  count.textContent = `${targetableContacts.length} contact${targetableContacts.length !== 1 ? 's' : ''}`;

  if (targetableContacts.length === 0) {
    list.innerHTML = '<p class="placeholder">No combat contacts in sensor range</p>';
    return;
  }

  list.innerHTML = targetableContacts.map(c => `
    <div class="prep-list-item contact-item ${c.disposition || 'unknown'}">
      <div class="contact-info">
        <span class="contact-name">${escapeHtml(c.name || 'Unknown')}</span>
        <span class="contact-disposition tag-${c.disposition || 'unknown'}">${c.disposition || 'unknown'}</span>
      </div>
      <div class="contact-stats">
        <span class="contact-range">${c.range_band || 'long'} (${c.range_km || '?'}km)</span>
        <span class="contact-health">Hull: ${c.health || 0}/${c.max_health || 0}</span>
        ${c.armor > 0 ? `<span class="contact-armor">Armor: ${c.armor}</span>` : ''}
      </div>
      <div class="contact-actions">
        <button class="btn btn-tiny btn-warning" onclick="toggleWeaponsFree('${c.id}')" title="${c.weapons_free ? 'Revoke' : 'Authorize'} weapons">
          ${c.weapons_free ? 'Revoke' : 'Auth'}
        </button>
        <button class="btn btn-tiny btn-danger" onclick="removeCombatContact('${c.id}')" title="Remove contact">×</button>
      </div>
    </div>
  `).join('');
}

/**
 * Toggle weapons free status for a contact
 * @param {Object} state - App state
 * @param {string} contactId - Contact ID
 */
export function toggleWeaponsFree(state, contactId) {
  const contact = state.contacts?.find(c => c.id === contactId);
  if (!contact) return;

  state.socket.emit('ops:authorizeWeapons', {
    contactId,
    authorized: !contact.weapons_free
  });
}

/**
 * Remove a combat contact
 * @param {Object} state - App state
 * @param {string} contactId - Contact ID
 */
export function removeCombatContact(state, contactId) {
  if (!confirm('Remove this contact?')) return;
  state.socket.emit('ops:removeContact', { contactId });
}

/**
 * Handle combat log socket updates
 * @param {Object} state - App state
 * @param {Object} data - Combat action data
 */
export function handleCombatAction(state, data) {
  const { type, attacker, target, weapon, damage, message } = data;

  if (!state.combatLog) state.combatLog = [];
  state.combatLog.unshift({
    timestamp: new Date().toISOString(),
    type,
    attacker,
    target,
    weapon,
    damage,
    message
  });

  if (state.combatLog.length > 50) {
    state.combatLog = state.combatLog.slice(0, 50);
  }
}
