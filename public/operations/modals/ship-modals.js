/**
 * AR-201: Ship Modal Handlers
 *
 * Handles ship creation and editing modals.
 */

import { registerModalHandler } from './index.js';

// ==================== Add Ship ====================

function setupAddShipModal(modal, state, helpers) {
  const { showNotification, populateShipTemplateSelect, updateShipTemplateInfo } = helpers;

  // Populate template dropdown (templates should arrive via socket)
  populateShipTemplateSelect();

  // Template selection change - show info
  document.getElementById('ship-template').addEventListener('change', (e) => {
    updateShipTemplateInfo(e.target.value);
  });

  // Create ship button
  document.getElementById('btn-create-ship').addEventListener('click', () => {
    const name = document.getElementById('ship-name').value.trim();
    const templateId = document.getElementById('ship-template').value;
    const isPartyShip = document.getElementById('ship-is-party').checked;

    if (!name) {
      showNotification('Please enter a ship name', 'error');
      return;
    }
    if (!templateId) {
      showNotification('Please select a ship type', 'error');
      return;
    }

    state.socket.emit('ops:addShipFromTemplate', {
      templateId,
      name,
      isPartyShip
    });
  });
}

// ==================== Edit Ship ====================

function setupEditShipModal(modal, state, helpers) {
  const {
    populateShipEditor, switchEditorTab, loadTemplateForEditor,
    addWeaponToEditor, addSystemToEditor, saveEditedShip, updateValidationSummary
  } = helpers;

  // Populate editor with current data
  populateShipEditor();

  // Tab switching
  document.querySelectorAll('.editor-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switchEditorTab(btn.dataset.tab);
    });
  });

  // Template selection change - load full template
  document.getElementById('edit-ship-template').addEventListener('change', (e) => {
    loadTemplateForEditor(e.target.value);
  });

  // Add weapon button
  document.getElementById('btn-add-weapon').addEventListener('click', addWeaponToEditor);

  // Add system button
  document.getElementById('btn-add-system').addEventListener('click', addSystemToEditor);

  // Save ship button
  document.getElementById('btn-save-edited-ship').addEventListener('click', saveEditedShip);

  // Update validation on field changes
  const fields = [
    'edit-hull-tonnage', 'edit-hull-points', 'edit-armor-rating',
    'edit-mdrive-thrust', 'edit-jdrive-rating', 'edit-power-output',
    'edit-fuel-capacity', 'edit-cargo-tonnage', 'edit-staterooms',
    'edit-low-berths', 'edit-common-areas'
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateValidationSummary);
  });

  // Initial validation
  updateValidationSummary();
}

// ==================== Register All ====================

registerModalHandler('template-add-ship', setupAddShipModal);
registerModalHandler('template-edit-ship', setupEditShipModal);

export { setupAddShipModal, setupEditShipModal };
