/**
 * V2 Ship Modals
 * Ship-related modal dialogs
 */

(function(window) {
  'use strict';

  // ==================== Add Ship Modal ====================

  Modals.register('add-ship', (context) => {
    const { socket, templates = [] } = context;

    // Build template options
    const templateOptions = templates.map(t =>
      `<option value="${t.id}">${t.name} (${t.shipClass || t.hullTonnage + 't'})</option>`
    ).join('');

    return {
      title: 'Add Ship to Campaign',
      size: 'medium',
      content: `
        <div class="form-group">
          <label for="ship-name">Ship Name</label>
          <input type="text" id="ship-name" placeholder="Enter ship name">
        </div>
        <div class="form-group">
          <label for="ship-template">Ship Type</label>
          <select id="ship-template">
            <option value="">-- Select a ship type --</option>
            ${templateOptions}
          </select>
        </div>
        <div id="template-info" style="margin-bottom: 15px; color: var(--text-muted); font-size: 0.9em;"></div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="ship-is-party" checked>
            Party Ship (players can join crew)
          </label>
        </div>
        <div class="button-row">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" data-action="create">Create Ship</button>
        </div>
      `,
      onSetup: (modal) => {
        const templateSelect = modal.querySelector('#ship-template');
        const templateInfo = modal.querySelector('#template-info');

        // Show template info on selection
        templateSelect.addEventListener('change', () => {
          const templateId = templateSelect.value;
          const template = templates.find(t => t.id === templateId);
          if (template) {
            templateInfo.innerHTML = `
              <strong>${template.shipClass || template.name}</strong><br>
              Hull: ${template.hullTonnage || '?'}t | Thrust: ${template.thrust || '?'}G |
              Jump: ${template.jumpRating || 0} | Crew: ${template.crewMin || '?'}-${template.crewMax || '?'}
            `;
          } else {
            templateInfo.innerHTML = '';
          }
        });

        modal.querySelector('[data-action="create"]').addEventListener('click', () => {
          const name = modal.querySelector('#ship-name').value.trim();
          const templateId = templateSelect.value;
          const isPartyShip = modal.querySelector('#ship-is-party').checked;

          if (!name) {
            alert('Please enter a ship name');
            return;
          }
          if (!templateId) {
            alert('Please select a ship type');
            return;
          }

          socket.emit('ops:addShipFromTemplate', { templateId, name, isPartyShip });
          Modals.close();
        });

        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => Modals.close());
      }
    };
  });

  // ==================== Ship Status Modal ====================

  Modals.register('ship-status', (context) => {
    const { ship, shipState } = context;

    if (!ship) {
      return {
        title: 'Ship Status',
        size: 'medium',
        content: '<p>No ship data available.</p>'
      };
    }

    const hull = shipState?.hull || {};
    const fuel = shipState?.fuel || {};
    const power = shipState?.power || {};

    return {
      title: `${ship.name} Status`,
      size: 'medium',
      content: `
        <div style="display: grid; gap: 15px;">
          <div class="status-section">
            <h4 style="margin: 0 0 10px 0; color: var(--text-secondary);">Hull</h4>
            <div style="display: flex; justify-content: space-between;">
              <span>Current:</span>
              <span>${hull.current || 0} / ${hull.max || 0}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Armor:</span>
              <span>${hull.armor || 0}</span>
            </div>
          </div>

          <div class="status-section">
            <h4 style="margin: 0 0 10px 0; color: var(--text-secondary);">Fuel</h4>
            <div style="display: flex; justify-content: space-between;">
              <span>Refined:</span>
              <span>${fuel.refined || 0} tons</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Unrefined:</span>
              <span>${fuel.unrefined || 0} tons</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Capacity:</span>
              <span>${fuel.capacity || 0} tons</span>
            </div>
          </div>

          <div class="status-section">
            <h4 style="margin: 0 0 10px 0; color: var(--text-secondary);">Power</h4>
            <div style="display: flex; justify-content: space-between;">
              <span>Output:</span>
              <span>${power.output || 0} EP</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Used:</span>
              <span>${power.used || 0} EP</span>
            </div>
          </div>
        </div>
        <div class="button-row">
          <button class="btn btn-primary" data-action="close">Close</button>
        </div>
      `,
      onSetup: (modal) => {
        modal.querySelector('[data-action="close"]').addEventListener('click', () => Modals.close());
      }
    };
  });

  // ==================== Select Ship Modal ====================

  Modals.register('select-ship', (context) => {
    const { ships = [], onSelect, title = 'Select Ship' } = context;

    const shipList = ships.map(s =>
      `<button class="btn btn-secondary ship-option" data-ship-id="${s.id}" style="width: 100%; margin-bottom: 8px; text-align: left;">
        ${s.name} <span style="color: var(--text-muted);">(${s.shipClass || 'Unknown class'})</span>
      </button>`
    ).join('') || '<p style="color: var(--text-muted);">No ships available</p>';

    return {
      title,
      size: 'medium',
      content: `
        <div class="ship-list">
          ${shipList}
        </div>
        <div class="button-row">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
        </div>
      `,
      onSetup: (modal) => {
        modal.querySelectorAll('.ship-option').forEach(btn => {
          btn.addEventListener('click', () => {
            const shipId = btn.dataset.shipId;
            const ship = ships.find(s => s.id === shipId);
            Modals.close();
            if (onSelect) onSelect(ship);
          });
        });

        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => Modals.close());
      }
    };
  });

})(window);
