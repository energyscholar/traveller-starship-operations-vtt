/**
 * AR-BD-0b: Encounter Builder Modal Handler
 *
 * Allows GM to build and activate multi-ship encounters from templates.
 */

import { registerModalHandler } from './index.js';

// Local roster state
let roster = [];
let templates = [];

function setupEncounterBuilderModal(modal, state, helpers) {
  const { showNotification, closeModal } = helpers;

  // Request templates from server
  state.socket.emit('ops:getShipTemplates');

  const templateListEl = document.getElementById('encounter-template-list');
  const rosterEl = document.getElementById('encounter-roster');
  const searchEl = document.getElementById('encounter-template-search');

  // Handle template list response
  state.socket.once('ops:shipTemplates', (data) => {
    templates = data.templates || [];
    renderTemplateList();
  });

  function renderTemplateList(filter = '') {
    if (!templateListEl) return;
    const filterLower = filter.toLowerCase();
    const filtered = filter
      ? templates.filter(t => t.name.toLowerCase().includes(filterLower))
      : templates;

    templateListEl.innerHTML = filtered.map(t => `
      <div class="template-item" data-template-id="${t.id}">
        <div class="template-item-name">${t.name}</div>
        <div class="template-item-info">${t.tonnage}t - ${t.role}</div>
      </div>
    `).join('');

    // Add click handlers
    templateListEl.querySelectorAll('.template-item').forEach(el => {
      el.addEventListener('click', () => {
        const templateId = el.dataset.templateId;
        addToRoster(templateId);
      });
    });
  }

  function addToRoster(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const disposition = document.getElementById('encounter-default-disposition')?.value || 'hostile';
    const range = parseInt(document.getElementById('encounter-default-range')?.value) || 15000;

    roster.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36),
      templateId,
      name: template.name,
      tonnage: template.tonnage,
      disposition,
      range_km: range,
      bearing: Math.floor(Math.random() * 360)
    });

    renderRoster();
    showNotification(`Added ${template.name}`, 'info');
  }

  function renderRoster() {
    if (!rosterEl) return;

    if (roster.length === 0) {
      rosterEl.innerHTML = '<div class="roster-empty">Click templates to add ships</div>';
      return;
    }

    rosterEl.innerHTML = roster.map((item, index) => `
      <div class="roster-item ${item.disposition}" data-index="${index}">
        <div class="roster-item-name">
          <strong>${item.name}</strong>
          <span style="font-size: 0.8rem; color: #888;"> (${item.disposition}, ${item.range_km}km)</span>
        </div>
        <div class="roster-item-actions">
          <button class="btn btn-small btn-secondary btn-edit-roster" data-index="${index}">Edit</button>
          <button class="btn btn-small btn-danger btn-remove-roster" data-index="${index}">X</button>
        </div>
      </div>
    `).join('');

    // Edit handlers
    rosterEl.querySelectorAll('.btn-edit-roster').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        editRosterItem(index);
      });
    });

    // Remove handlers
    rosterEl.querySelectorAll('.btn-remove-roster').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        roster.splice(index, 1);
        renderRoster();
      });
    });
  }

  function editRosterItem(index) {
    const item = roster[index];
    if (!item) return;

    const newName = prompt('Ship name:', item.name);
    if (newName !== null) {
      item.name = newName || item.name;
    }

    const newDisposition = prompt('Disposition (hostile/neutral/friendly):', item.disposition);
    if (newDisposition && ['hostile', 'neutral', 'friendly'].includes(newDisposition.toLowerCase())) {
      item.disposition = newDisposition.toLowerCase();
    }

    const newRange = prompt('Range (km):', item.range_km);
    if (newRange !== null && !isNaN(parseInt(newRange))) {
      item.range_km = parseInt(newRange);
    }

    renderRoster();
  }

  // Search handler
  searchEl?.addEventListener('input', (e) => {
    renderTemplateList(e.target.value);
  });

  // Clear roster
  document.getElementById('btn-encounter-clear')?.addEventListener('click', () => {
    roster = [];
    renderRoster();
    showNotification('Roster cleared', 'info');
  });

  // Activate encounter
  document.getElementById('btn-encounter-activate')?.addEventListener('click', () => {
    if (roster.length === 0) {
      showNotification('Add ships to roster first', 'warning');
      return;
    }

    // Emit each contact creation
    for (const item of roster) {
      state.socket.emit('ops:createContactFromTemplate', {
        campaignId: state.campaign?.id,
        templateId: item.templateId,
        overrides: {
          name: item.name,
          disposition: item.disposition,
          range_km: item.range_km,
          bearing: item.bearing,
          weapons_free: item.disposition === 'hostile'
        }
      });
    }

    showNotification(`Activated encounter: ${roster.length} contacts`, 'success');
    roster = [];
    closeModal();
  });

  // Initial render
  renderRoster();
}

registerModalHandler('template-encounter-builder', setupEncounterBuilderModal);

export { setupEncounterBuilderModal };
