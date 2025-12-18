/**
 * AR-201: Simple Modal Handlers
 *
 * Smaller modals combined into one file:
 * - Create Campaign
 * - Time Advance
 * - Add Log
 * - Edit Role Personality
 * - Add Contact
 * - Apply Damage
 * - Refuel
 * - Process Fuel
 */

import { registerModalHandler } from './index.js';

// ==================== Create Campaign ====================

function setupCreateCampaignModal(modal, state, helpers) {
  const { closeModal } = helpers;

  const confirmCreate = () => {
    const name = document.getElementById('new-campaign-name').value.trim();
    const gmName = document.getElementById('gm-name').value.trim();
    if (name && gmName) {
      state.socket.emit('ops:createCampaign', { name, gmName });
      closeModal();
    }
  };

  document.getElementById('btn-confirm-create-campaign').addEventListener('click', confirmCreate);

  // AR-58: ENTER hotkey for create campaign inputs
  ['new-campaign-name', 'gm-name'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault();
        confirmCreate();
      }
    });
  });
}

// ==================== Time Advance ====================

function setupTimeAdvanceModal(modal, state, helpers) {
  const { closeModal, advanceTime } = helpers;

  // Quick time buttons
  modal.querySelectorAll('.time-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      const hours = parseInt(btn.dataset.hours) || 0;
      const minutes = parseInt(btn.dataset.minutes) || 0;
      advanceTime(hours, minutes);
      closeModal();
    });
  });

  // Custom time button
  document.getElementById('btn-custom-time').addEventListener('click', () => {
    const hours = parseInt(document.getElementById('custom-hours').value) || 0;
    const minutes = parseInt(document.getElementById('custom-minutes').value) || 0;
    if (hours > 0 || minutes > 0) {
      advanceTime(hours, minutes);
      closeModal();
    }
  });
}

// ==================== Add Log ====================

function setupAddLogModal(modal, state, helpers) {
  const { closeModal } = helpers;

  document.getElementById('btn-save-log-entry').addEventListener('click', () => {
    const entryType = document.getElementById('log-entry-type').value;
    const message = document.getElementById('log-entry-message').value.trim();
    if (message) {
      state.socket.emit('ops:addLogEntry', {
        shipId: state.ship.id,
        entryType,
        message
      });
      closeModal();
    }
  });
}

// ==================== Edit Role Personality ====================

function setupEditRolePersonalityModal(modal, state, helpers) {
  const { closeModal } = helpers;

  let selectedIcon = state.player?.quirk_icon || '';

  // Pre-fill current values
  document.getElementById('edit-role-title').value = state.player?.role_title || '';
  document.getElementById('edit-quirk-text').value = state.player?.quirk_text || '';

  // Icon picker selection
  modal.querySelectorAll('.icon-btn').forEach(btn => {
    const icon = btn.dataset.icon;
    if (icon === selectedIcon) btn.classList.add('selected');
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedIcon = icon;
    });
  });

  // Save button
  document.getElementById('btn-save-role-personality').addEventListener('click', () => {
    const roleTitle = document.getElementById('edit-role-title').value.trim();
    const quirkText = document.getElementById('edit-quirk-text').value.trim();

    state.socket.emit('ops:updateRolePersonality', {
      playerId: state.player?.id,
      roleTitle: roleTitle || null,
      quirkText: quirkText || null,
      quirkIcon: selectedIcon || null
    });
    closeModal();
  });
}

// ==================== Add Contact ====================

function setupAddContactModal(modal, state, helpers) {
  const { closeModal, addContact } = helpers;

  // Quick add buttons set type and submit
  modal.querySelectorAll('.contact-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      document.getElementById('contact-type').value = type;
      // Auto-submit with defaults
      addContact({
        type,
        bearing: 0,
        range_km: 10000,
        signature: 'normal'
      });
      closeModal();
    });
  });

  // Full form submit
  document.getElementById('btn-save-contact').addEventListener('click', () => {
    addContact({
      name: document.getElementById('contact-name').value.trim() || null,
      type: document.getElementById('contact-type').value,
      bearing: parseInt(document.getElementById('contact-bearing').value) || 0,
      range_km: parseInt(document.getElementById('contact-range').value) || 0,
      transponder: document.getElementById('contact-transponder').value.trim() || null,
      signature: document.getElementById('contact-signature').value,
      gm_notes: document.getElementById('contact-notes').value.trim() || null
    });
    closeModal();
  });
}

// ==================== Apply Damage ====================

function setupApplyDamageModal(modal, state, helpers) {
  const { closeModal, applySystemDamage } = helpers;

  // Apply damage button
  document.getElementById('btn-apply-damage').addEventListener('click', () => {
    const system = document.getElementById('damage-system').value;
    const severity = parseInt(document.getElementById('damage-severity').value) || 1;
    applySystemDamage(system, severity);
    closeModal();
  });

  // Clear all damage button
  document.getElementById('btn-clear-damage').addEventListener('click', () => {
    if (confirm('Clear all damage from this ship?')) {
      state.socket.emit('ops:clearSystemDamage', {
        shipId: state.shipId,
        location: 'all'
      });
      closeModal();
    }
  });
}

// ==================== Refuel ====================

function setupRefuelModal(modal, state, helpers) {
  const { updateRefuelAmountPreview, setRefuelMax, executeRefuel } = helpers;

  document.getElementById('refuel-amount')?.addEventListener('input', () => updateRefuelAmountPreview());
  document.getElementById('btn-refuel-max')?.addEventListener('click', () => setRefuelMax());
  document.getElementById('btn-execute-refuel')?.addEventListener('click', () => executeRefuel());
}

// ==================== Process Fuel ====================

function setupProcessFuelModal(modal, state, helpers) {
  const { setProcessMax, executeProcessFuel } = helpers;

  document.getElementById('btn-process-max')?.addEventListener('click', () => setProcessMax());
  document.getElementById('btn-execute-process')?.addEventListener('click', () => executeProcessFuel());
}

// ==================== Register All ====================

registerModalHandler('template-create-campaign', setupCreateCampaignModal);
registerModalHandler('template-time-advance', setupTimeAdvanceModal);
registerModalHandler('template-add-log', setupAddLogModal);
registerModalHandler('template-edit-role-personality', setupEditRolePersonalityModal);
registerModalHandler('template-add-contact', setupAddContactModal);
registerModalHandler('template-apply-damage', setupApplyDamageModal);
registerModalHandler('template-refuel', setupRefuelModal);
registerModalHandler('template-process-fuel', setupProcessFuelModal);

export {
  setupCreateCampaignModal,
  setupTimeAdvanceModal,
  setupAddLogModal,
  setupEditRolePersonalityModal,
  setupAddContactModal,
  setupApplyDamageModal,
  setupRefuelModal,
  setupProcessFuelModal
};
