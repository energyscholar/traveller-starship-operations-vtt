/**
 * AR-201: GM Bridge Menu Modal Handler
 *
 * Handles God mode controls, ship state editing, contact management.
 */

import { registerModalHandler } from './index.js';

function setupGMBridgeMenuModal(modal, state, helpers) {
  const { showNotification } = helpers;

  // Copy campaign code
  document.getElementById('btn-gm-copy-code').addEventListener('click', () => {
    const codeEl = document.getElementById('gm-menu-campaign-code');
    const code = codeEl?.textContent;
    if (code && code !== '--------') {
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('btn-gm-copy-code');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('btn-copy-success');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('btn-copy-success');
        }, 2000);
      }).catch(() => {
        showNotification('Failed to copy code', 'error');
      });
    }
  });

  // GM-3: God Mode Handlers
  // Populate current ship values
  if (state.ship?.current_state) {
    const cs = state.ship.current_state;
    document.getElementById('god-ship-hull').value = cs.hullPoints || 0;
    document.getElementById('god-ship-fuel').value = cs.fuel || 0;
    document.getElementById('god-ship-power').value = cs.power || 100;
    document.getElementById('god-ship-alert').value = cs.alertStatus || 'NORMAL';
  }

  // Apply Ship Changes
  document.getElementById('btn-god-apply-ship').addEventListener('click', () => {
    const updates = {
      hullPoints: parseInt(document.getElementById('god-ship-hull').value) || 0,
      fuel: parseInt(document.getElementById('god-ship-fuel').value) || 0,
      power: parseInt(document.getElementById('god-ship-power').value) || 100,
      alertStatus: document.getElementById('god-ship-alert').value
    };
    state.socket.emit('ops:godModeUpdateShip', {
      shipId: state.ship?.id,
      updates
    });
    showNotification('Ship state updated', 'success');
  });

  // AR-BD-0a: Ship Template Dropdown
  const templateSelect = document.getElementById('god-template-select');
  if (templateSelect) {
    // Request templates from server
    state.socket.emit('ops:getContactTemplates');

    // Handle template list response
    const handleTemplates = (data) => {
      const { templates } = data;
      templateSelect.innerHTML = '<option value="">-- Select Template --</option>';
      for (const t of templates) {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.name} (${t.tonnage}t)`;
        templateSelect.appendChild(opt);
      }
    };
    state.socket.once('ops:contactTemplates', handleTemplates);
  }

  // Range band dropdown sync - when dropdown changes, update the input
  document.getElementById('god-template-range-band')?.addEventListener('change', (e) => {
    document.getElementById('god-template-range').value = e.target.value;
  });
  document.getElementById('god-contact-range-band')?.addEventListener('change', (e) => {
    document.getElementById('god-contact-range').value = e.target.value;
  });

  // Add from Template
  document.getElementById('btn-god-add-from-template')?.addEventListener('click', () => {
    const templateId = document.getElementById('god-template-select')?.value;
    if (!templateId) {
      showNotification('Select a template first', 'warning');
      return;
    }
    const nameOverride = document.getElementById('god-template-name')?.value || null;
    const disposition = document.getElementById('god-template-disposition')?.value || 'hostile';
    const range = parseInt(document.getElementById('god-template-range')?.value) || 50000;

    state.socket.emit('ops:createContactFromTemplate', {
      campaignId: state.campaign?.id,
      templateId,
      overrides: {
        name: nameOverride,
        disposition,
        range_km: range,
        bearing: Math.floor(Math.random() * 360),
        weapons_free: disposition === 'hostile'
      }
    });
    document.getElementById('god-template-name').value = '';
    showNotification('Contact created from template', 'success');
  });

  // Add Custom Contact
  document.getElementById('btn-god-add-contact').addEventListener('click', () => {
    const name = document.getElementById('god-contact-name').value || 'Unknown Contact';
    const type = document.getElementById('god-contact-type').value;
    const range = parseInt(document.getElementById('god-contact-range').value) || 50000;
    const bearing = parseInt(document.getElementById('god-contact-bearing').value) || 0;
    state.socket.emit('ops:godModeAddContact', {
      campaignId: state.campaign?.id,
      contact: { name, type, range_km: range, bearing, visible_to: 'all', signature: 'normal' }
    });
    document.getElementById('god-contact-name').value = '';
    showNotification('Contact added', 'success');
  });

  // Quick Commands
  document.getElementById('btn-god-repair-all').addEventListener('click', () => {
    state.socket.emit('ops:godModeRepairAll', { shipId: state.ship?.id });
    showNotification('All systems repaired', 'success');
  });

  document.getElementById('btn-god-refuel').addEventListener('click', () => {
    state.socket.emit('ops:godModeRefuel', { shipId: state.ship?.id });
    showNotification('Ship fully refueled', 'success');
  });

  document.getElementById('btn-god-clear-contacts').addEventListener('click', () => {
    if (confirm('Clear all contacts?')) {
      state.socket.emit('ops:godModeClearContacts', { campaignId: state.campaign?.id });
      showNotification('All contacts cleared', 'success');
    }
  });

  // AR-BD-0b: Encounter Builder
  document.getElementById('btn-god-encounter-builder')?.addEventListener('click', () => {
    helpers.showModal('template-encounter-builder');
  });

  // AR-194: Break System
  document.getElementById('btn-god-break-system').addEventListener('click', () => {
    const system = document.getElementById('god-break-system').value;
    const severityStr = document.getElementById('god-break-severity').value;
    const severity = severityStr ? parseInt(severityStr, 10) : null;
    state.socket.emit('ops:breakSystem', {
      shipId: state.ship?.id,
      system,
      severity
    });
  });

  // AR-BD-12: Drill Controls
  const drillSelect = document.getElementById('god-drill-select');
  const drillStatus = document.getElementById('god-drill-status');
  const loadDrillBtn = document.getElementById('btn-god-load-drill');
  const resetDrillBtn = document.getElementById('btn-god-reset-drill');

  // Request available drills
  state.socket.emit('ops:getAvailableDrills');
  state.socket.emit('ops:getActiveDrill', { campaignId: state.campaign?.id });

  state.socket.once('ops:availableDrills', (data) => {
    const drillsList = data.drills || [];
    drillSelect.innerHTML = '<option value="">-- Select Drill --</option>';
    for (const d of drillsList) {
      const opt = document.createElement('option');
      opt.value = d.filename;
      opt.textContent = `${d.name} (${d.difficulty})`;
      drillSelect.appendChild(opt);
    }
  });

  state.socket.once('ops:activeDrillState', (data) => {
    if (data.drill) {
      drillStatus.textContent = `Active: ${data.drill.drillName}`;
      resetDrillBtn.disabled = false;
    } else {
      drillStatus.textContent = 'No drill active';
      resetDrillBtn.disabled = true;
    }
  });

  // Load drill
  loadDrillBtn?.addEventListener('click', () => {
    const filename = drillSelect?.value;
    if (!filename) {
      showNotification('Select a drill first', 'warning');
      return;
    }
    if (!confirm(`Load drill? This will clear existing contacts.`)) {
      return;
    }
    state.socket.emit('ops:loadDrill', {
      campaignId: state.campaign?.id,
      filename,
      shipId: state.ship?.id,
      shipState: state.ship?.current_state
    });
    showNotification('Loading drill...', 'info');
  });

  // Reset drill
  resetDrillBtn?.addEventListener('click', () => {
    if (!confirm('Reset drill to initial state?')) {
      return;
    }
    state.socket.emit('ops:resetDrill', {
      campaignId: state.campaign?.id
    });
    showNotification('Resetting drill...', 'info');
  });

  // Listen for drill events
  const handleDrillLoaded = (data) => {
    drillStatus.textContent = `Active: ${data.drill.name}`;
    resetDrillBtn.disabled = false;
    showNotification(`Drill loaded: ${data.drill.name}`, 'success');
    renderTacticalList();
  };
  state.socket.on('ops:drillLoaded', handleDrillLoaded);

  const handleDrillReset = (data) => {
    showNotification(`Drill reset: ${data.drillName}`, 'success');
    renderTacticalList();
  };
  state.socket.on('ops:drillReset', handleDrillReset);

  // AR-BD-8: Tactical Overview Panel
  const tacticalPanel = document.getElementById('tactical-panel');
  const tacticalList = document.getElementById('tactical-contacts-list');
  let currentSort = 'range';

  // Collapsible toggle
  document.querySelector('[data-toggle="tactical-panel"]')?.addEventListener('click', (e) => {
    const group = e.target.closest('.god-mode-group');
    group?.classList.toggle('collapsed');
  });

  // Sort buttons
  document.querySelectorAll('.tactical-sort').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSort = btn.dataset.sort;
      renderTacticalList();
    });
  });

  function getHealthColor(current, max) {
    if (max <= 0 || current <= 0) return 'gray';
    const percent = (current / max) * 100;
    if (percent > 66) return 'green';
    if (percent > 33) return 'yellow';
    return 'red';
  }

  function formatRange(km) {
    if (km >= 1000) return `${(km/1000).toFixed(0)}Mm`;
    return `${km}km`;
  }

  function renderTacticalList() {
    const contacts = state.contacts || [];
    const targetable = contacts.filter(c => c.is_targetable);

    if (targetable.length === 0) {
      tacticalList.innerHTML = '<div class="tactical-empty">No contacts</div>';
      return;
    }

    // Sort contacts
    const sorted = [...targetable].sort((a, b) => {
      if (currentSort === 'range') {
        return (a.range_km || 0) - (b.range_km || 0);
      } else {
        const aPercent = (a.health || 0) / (a.max_health || 1);
        const bPercent = (b.health || 0) / (b.max_health || 1);
        return aPercent - bPercent;
      }
    });

    tacticalList.innerHTML = sorted.map(c => {
      const healthPercent = c.max_health > 0 ? Math.round((c.health / c.max_health) * 100) : 0;
      const healthColor = getHealthColor(c.health, c.max_health);
      const hasWeapons = c.weapons && Array.isArray(c.weapons) && c.weapons.length > 0;

      return `
        <div class="tactical-item" data-contact-id="${c.id}">
          <div class="tactical-item-name" title="${c.name}">${c.name}</div>
          <div class="tactical-item-range">${formatRange(c.range_km || 0)}</div>
          <div class="tactical-hp-bar">
            <div class="tactical-hp-fill health-${healthColor}" style="width: ${healthPercent}%"></div>
          </div>
          <div class="tactical-item-fire">
            ${hasWeapons ? `<button class="btn btn-icon btn-fire-tactical" data-id="${c.id}" title="Fire">🔥</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Fire button handlers
    tacticalList.querySelectorAll('.btn-fire-tactical').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const contactId = btn.dataset.id;
        const contact = contacts.find(c => c.id === contactId);
        if (contact && state.ship?.id) {
          state.socket.emit('ops:fireAsContact', {
            contactId,
            weaponIndex: 0,
            targetShipId: state.ship.id
          });
          showNotification(`${contact.name} fires!`, 'warning');
        }
      });
    });

    // Row click → pan map (placeholder)
    tacticalList.querySelectorAll('.tactical-item').forEach(row => {
      row.addEventListener('click', () => {
        const contactId = row.dataset.contactId;
        showNotification(`Selected: ${contactId}`, 'info');
        // TODO: Implement map pan to contact
      });
    });
  }

  // Initial render
  renderTacticalList();

  // Combat Mode Controls
  const enterCombatBtn = document.getElementById('btn-god-enter-combat');
  const exitCombatBtn = document.getElementById('btn-god-exit-combat');
  const advancePhaseBtn = document.getElementById('btn-god-advance-phase');
  const phaseDisplay = document.getElementById('combat-phase-display');
  const roundEl = document.getElementById('combat-round');
  const phaseEl = document.getElementById('combat-phase');

  function updateCombatUI(inCombat, phase, round) {
    if (inCombat) {
      enterCombatBtn.disabled = true;
      exitCombatBtn.disabled = false;
      advancePhaseBtn.disabled = false;
      phaseDisplay.style.display = 'flex';
      if (phase) phaseEl.textContent = phase.toUpperCase();
      if (round) roundEl.textContent = round;
    } else {
      enterCombatBtn.disabled = false;
      exitCombatBtn.disabled = true;
      advancePhaseBtn.disabled = true;
      phaseDisplay.style.display = 'none';
    }
  }

  // Check initial combat state
  if (state.inCombat) {
    updateCombatUI(true, state.combatPhase, state.combatRound);
  }

  enterCombatBtn?.addEventListener('click', () => {
    const targetable = state.contacts?.filter(c => c.is_targetable) || [];
    if (targetable.length === 0) {
      showNotification('Add hostile contacts first', 'warning');
      return;
    }
    state.socket.emit('ops:enterCombat', {
      campaignId: state.campaign?.id,
      selectedContacts: targetable.map(c => c.id)
    });
  });

  exitCombatBtn?.addEventListener('click', () => {
    state.socket.emit('ops:exitCombat', {
      campaignId: state.campaign?.id,
      outcome: 'disengaged'
    });
  });

  advancePhaseBtn?.addEventListener('click', () => {
    state.socket.emit('ops:advancePhase', {
      campaignId: state.campaign?.id
    });
  });

  // Listen for combat state changes
  state.socket.on('ops:combatStarted', (data) => {
    state.inCombat = true;
    state.combatPhase = data.phase || 'manoeuvre';
    state.combatRound = data.round || 1;
    updateCombatUI(true, state.combatPhase, state.combatRound);
  });

  state.socket.on('ops:combatEnded', () => {
    state.inCombat = false;
    updateCombatUI(false);
  });

  state.socket.on('ops:phaseChanged', (data) => {
    state.combatPhase = data.phase;
    state.combatRound = data.round;
    updateCombatUI(true, data.phase, data.round);
  });
}

registerModalHandler('template-gm-bridge-menu', setupGMBridgeMenuModal);

export { setupGMBridgeMenuModal };
