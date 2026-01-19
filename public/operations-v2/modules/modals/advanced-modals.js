/**
 * V2 Advanced Modals
 * Jump, Contact, System Lookup, Ship Config, Refueling
 */

(function(window) {
  'use strict';

  // ==================== Jump Destination Modal (TASK 1) ====================

  Modals.register('jump-destination', (context) => {
    const { socket, currentSystem, jumpRating = 2, fuelAvailable = 40 } = context;

    let selectedSystem = null;

    return {
      title: 'Jump Destination',
      size: 'large',
      content: `
        <div class="form-group">
          <label for="jump-search">Search System</label>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="jump-search" placeholder="Enter system name..." style="flex: 1;">
            <button class="btn btn-primary" id="btn-jump-search">Search</button>
          </div>
        </div>
        <div id="jump-results" class="search-results" style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 4px; padding: 10px; margin-bottom: 15px;">
          <p style="color: var(--text-muted);">Enter a system name to search</p>
        </div>
        <div id="jump-calc" class="hidden" style="background: var(--bg-primary); padding: 15px; border-radius: 4px; margin-bottom: 15px;">
          <h4 style="margin: 0 0 10px 0;">Jump Calculation</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>Distance: <span id="jump-distance">-</span> parsecs</div>
            <div>Jump Rating: ${jumpRating}</div>
            <div>Fuel Required: <span id="jump-fuel">-</span> tons</div>
            <div>Fuel Available: ${fuelAvailable} tons</div>
          </div>
          <div id="jump-status" style="margin-top: 10px; padding: 10px; border-radius: 4px;"></div>
        </div>
        <div class="button-row">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" id="btn-initiate-jump" disabled>Initiate Jump</button>
        </div>
      `,
      onSetup: (modal) => {
        const searchInput = modal.querySelector('#jump-search');
        const resultsDiv = modal.querySelector('#jump-results');
        const calcDiv = modal.querySelector('#jump-calc');
        const jumpBtn = modal.querySelector('#btn-initiate-jump');

        const performSearch = async () => {
          const query = searchInput.value.trim();
          if (!query) return;

          resultsDiv.innerHTML = '<p style="color: var(--text-muted);">Searching...</p>';

          try {
            const response = await fetch(`/api/travellermap/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.Results?.Items?.length > 0) {
              const worlds = data.Results.Items.filter(i => i.World).slice(0, 10);
              if (worlds.length === 0) {
                resultsDiv.innerHTML = '<p style="color: var(--text-muted);">No worlds found</p>';
                return;
              }

              resultsDiv.innerHTML = worlds.map((item, idx) => {
                const w = item.World;
                return `<div class="search-result-item" data-idx="${idx}" style="padding: 8px; cursor: pointer; border-bottom: 1px solid var(--border-color);">
                  <strong>${w.Name}</strong> <span style="color: var(--text-muted);">${w.Uwp}</span>
                  <div style="font-size: 0.9em; color: var(--text-muted);">${w.Sector} ${w.HexX}${String(w.HexY).padStart(2, '0')}</div>
                </div>`;
              }).join('');

              // Store data
              resultsDiv._worlds = worlds;

              // Click handlers
              resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                  resultsDiv.querySelectorAll('.search-result-item').forEach(i => i.style.background = '');
                  item.style.background = 'var(--accent-primary-muted)';

                  const world = resultsDiv._worlds[parseInt(item.dataset.idx)].World;
                  selectedSystem = world;

                  // Show calculation (simplified)
                  calcDiv.classList.remove('hidden');
                  const distance = Math.floor(Math.random() * 5) + 1; // Would calculate real distance
                  const fuelNeeded = distance * 10;

                  modal.querySelector('#jump-distance').textContent = distance;
                  modal.querySelector('#jump-fuel').textContent = fuelNeeded;

                  const statusDiv = modal.querySelector('#jump-status');
                  if (distance > jumpRating) {
                    statusDiv.textContent = 'Distance exceeds jump rating!';
                    statusDiv.style.background = 'var(--danger-muted)';
                    statusDiv.style.color = 'var(--danger)';
                    jumpBtn.disabled = true;
                  } else if (fuelNeeded > fuelAvailable) {
                    statusDiv.textContent = 'Insufficient fuel!';
                    statusDiv.style.background = 'var(--warning-muted)';
                    statusDiv.style.color = 'var(--warning)';
                    jumpBtn.disabled = true;
                  } else {
                    statusDiv.textContent = 'Jump possible';
                    statusDiv.style.background = 'var(--success-muted)';
                    statusDiv.style.color = 'var(--success)';
                    jumpBtn.disabled = false;
                  }
                });
              });
            } else {
              resultsDiv.innerHTML = '<p style="color: var(--text-muted);">No results found</p>';
            }
          } catch (err) {
            resultsDiv.innerHTML = `<p style="color: var(--danger);">Search failed: ${err.message}</p>`;
          }
        };

        modal.querySelector('#btn-jump-search').addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') performSearch();
        });

        jumpBtn.addEventListener('click', () => {
          if (!selectedSystem) return;
          socket.emit('ops:initiateJump', {
            destination: selectedSystem.Name,
            sector: selectedSystem.Sector,
            hex: `${selectedSystem.HexX}${String(selectedSystem.HexY).padStart(2, '0')}`
          });
          Modals.close();
        });

        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => Modals.close());
      }
    };
  });

  // ==================== Contact Details Modal (TASK 2) ====================

  Modals.register('contact-details', (context) => {
    const { socket, contact, isGM = false } = context;

    if (!contact) {
      return {
        title: 'Contact Details',
        size: 'medium',
        content: '<p>No contact data available.</p>'
      };
    }

    const editableFields = isGM ? `
      <div class="form-group">
        <label for="contact-name">Designation</label>
        <input type="text" id="contact-name" value="${contact.name || contact.designation || ''}">
      </div>
      <div class="form-group">
        <label for="contact-type">Type</label>
        <select id="contact-type">
          <option value="unknown" ${contact.type === 'unknown' ? 'selected' : ''}>Unknown</option>
          <option value="ship" ${contact.type === 'ship' ? 'selected' : ''}>Ship</option>
          <option value="station" ${contact.type === 'station' ? 'selected' : ''}>Station</option>
          <option value="debris" ${contact.type === 'debris' ? 'selected' : ''}>Debris</option>
          <option value="asteroid" ${contact.type === 'asteroid' ? 'selected' : ''}>Asteroid</option>
        </select>
      </div>
      <div class="form-group">
        <label for="contact-transponder">Transponder</label>
        <input type="text" id="contact-transponder" value="${contact.transponder || ''}">
      </div>
      <div class="form-group">
        <label for="contact-notes">GM Notes</label>
        <textarea id="contact-notes" rows="3">${contact.gm_notes || ''}</textarea>
      </div>
    ` : '';

    return {
      title: `Contact: ${contact.name || contact.designation || 'Unknown'}`,
      size: 'medium',
      content: `
        <div style="display: grid; gap: 10px; margin-bottom: 15px;">
          <div><strong>Type:</strong> ${contact.type || 'Unknown'}</div>
          <div><strong>Bearing:</strong> ${contact.bearing || 0}&deg;</div>
          <div><strong>Range:</strong> ${(contact.range_km / 1000).toFixed(1) || '?'} km</div>
          <div><strong>Transponder:</strong> ${contact.transponder || 'None'}</div>
          <div><strong>Signature:</strong> ${contact.signature || 'Normal'}</div>
        </div>
        ${editableFields}
        <div class="button-row">
          ${isGM ? '<button class="btn btn-danger" data-action="delete">Delete</button>' : ''}
          <button class="btn btn-secondary" data-action="close">Close</button>
          ${isGM ? '<button class="btn btn-primary" data-action="save">Save</button>' : ''}
        </div>
      `,
      onSetup: (modal) => {
        modal.querySelector('[data-action="close"]')?.addEventListener('click', () => Modals.close());

        if (isGM) {
          modal.querySelector('[data-action="save"]')?.addEventListener('click', () => {
            socket.emit('ops:updateContact', {
              contactId: contact.id,
              name: modal.querySelector('#contact-name').value,
              type: modal.querySelector('#contact-type').value,
              transponder: modal.querySelector('#contact-transponder').value,
              gm_notes: modal.querySelector('#contact-notes').value
            });
            Modals.close();
          });

          modal.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
            if (confirm('Delete this contact?')) {
              socket.emit('ops:deleteContact', { contactId: contact.id });
              Modals.close();
            }
          });
        }
      }
    };
  });

  // ==================== System Lookup Modal (TASK 3) ====================

  Modals.register('system-lookup', (context) => {
    const { socket, onSelect } = context;

    let selectedSystem = null;

    return {
      title: 'Star System Lookup',
      size: 'large',
      content: `
        <div class="form-group">
          <label for="system-search">Search TravellerMap</label>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="system-search" placeholder="System name..." style="flex: 1;">
            <button class="btn btn-primary" id="btn-search">Search</button>
          </div>
        </div>
        <div id="system-results" style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 4px; padding: 10px; margin-bottom: 15px;">
          <p style="color: var(--text-muted);">Enter a system name to search the Traveller Map database</p>
        </div>
        <div class="button-row">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" id="btn-select" disabled>Select System</button>
        </div>
      `,
      onSetup: (modal) => {
        const searchInput = modal.querySelector('#system-search');
        const resultsDiv = modal.querySelector('#system-results');
        const selectBtn = modal.querySelector('#btn-select');

        const performSearch = async () => {
          const query = searchInput.value.trim();
          if (!query) return;

          resultsDiv.innerHTML = '<p style="color: var(--text-muted);">Searching TravellerMap...</p>';

          try {
            const response = await fetch(`/api/travellermap/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.Results?.Items?.length > 0) {
              const worlds = data.Results.Items.filter(i => i.World).slice(0, 15);
              if (worlds.length === 0) {
                resultsDiv.innerHTML = '<p style="color: var(--text-muted);">No worlds found</p>';
                return;
              }

              resultsDiv.innerHTML = worlds.map((item, idx) => {
                const w = item.World;
                return `<div class="system-item" data-idx="${idx}" style="padding: 10px; cursor: pointer; border-bottom: 1px solid var(--border-color);">
                  <div><strong>${w.Name}</strong> <code style="margin-left: 8px;">${w.Uwp}</code></div>
                  <div style="font-size: 0.9em; color: var(--text-muted);">${w.Sector} ${w.HexX}${String(w.HexY).padStart(2, '0')}</div>
                </div>`;
              }).join('');

              resultsDiv._worlds = worlds;

              resultsDiv.querySelectorAll('.system-item').forEach(item => {
                item.addEventListener('click', () => {
                  resultsDiv.querySelectorAll('.system-item').forEach(i => i.style.background = '');
                  item.style.background = 'var(--accent-primary-muted)';
                  selectedSystem = resultsDiv._worlds[parseInt(item.dataset.idx)].World;
                  selectBtn.disabled = false;
                });
              });
            } else {
              resultsDiv.innerHTML = '<p style="color: var(--text-muted);">No results found</p>';
            }
          } catch (err) {
            resultsDiv.innerHTML = `<p style="color: var(--danger);">Error: ${err.message}</p>`;
          }
        };

        modal.querySelector('#btn-search').addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') performSearch();
        });

        selectBtn.addEventListener('click', () => {
          if (!selectedSystem) return;
          if (onSelect) {
            onSelect(selectedSystem);
          } else {
            socket.emit('ops:setCurrentSystem', {
              system: selectedSystem.Name,
              sector: selectedSystem.Sector,
              hex: `${selectedSystem.HexX}${String(selectedSystem.HexY).padStart(2, '0')}`,
              uwp: selectedSystem.Uwp
            });
          }
          Modals.close();
        });

        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => Modals.close());
      }
    };
  });

  // ==================== Ship Config Modal (TASK 4) ====================

  Modals.register('ship-config', (context) => {
    const { socket, ship, shipState } = context;

    if (!ship) {
      return {
        title: 'Ship Configuration',
        size: 'medium',
        content: '<p>No ship data available.</p>'
      };
    }

    return {
      title: `${ship.name} Configuration`,
      size: 'large',
      content: `
        <div class="form-group">
          <label for="ship-name">Ship Name</label>
          <input type="text" id="ship-name" value="${ship.name || ''}">
        </div>
        <div class="form-group">
          <label for="ship-registry">Registry</label>
          <input type="text" id="ship-registry" value="${ship.registry || ''}">
        </div>
        <div class="form-group">
          <label>Transponder</label>
          <select id="ship-transponder">
            <option value="on" ${ship.transponder !== 'off' ? 'selected' : ''}>On (Broadcasting)</option>
            <option value="off" ${ship.transponder === 'off' ? 'selected' : ''}>Off (Silent Running)</option>
          </select>
        </div>
        <div style="background: var(--bg-primary); padding: 15px; border-radius: 4px; margin: 15px 0;">
          <h4 style="margin: 0 0 10px 0;">Ship Stats (Read-Only)</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
            <div>Hull: ${shipState?.hull?.current || 0}/${shipState?.hull?.max || 0}</div>
            <div>Armor: ${shipState?.hull?.armor || 0}</div>
            <div>Thrust: ${ship.thrust || 0}G</div>
            <div>Jump: ${ship.jumpRating || 0}</div>
            <div>Fuel: ${shipState?.fuel?.refined || 0}/${shipState?.fuel?.capacity || 0}</div>
            <div>Cargo: ${shipState?.cargo?.current || 0}/${ship.cargo || 0}t</div>
          </div>
        </div>
        <div class="button-row">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" data-action="save">Save Changes</button>
        </div>
      `,
      onSetup: (modal) => {
        modal.querySelector('[data-action="save"]').addEventListener('click', () => {
          socket.emit('ops:updateShipConfig', {
            shipId: ship.id,
            name: modal.querySelector('#ship-name').value,
            registry: modal.querySelector('#ship-registry').value,
            transponder: modal.querySelector('#ship-transponder').value
          });
          Modals.close();
        });

        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => Modals.close());
      }
    };
  });

  // ==================== Refueling Operations Modal (TASK 5) ====================

  Modals.register('refueling', (context) => {
    const { socket, shipId, fuelState, location } = context;

    const current = (fuelState?.refined || 0) + (fuelState?.unrefined || 0);
    const capacity = fuelState?.capacity || 40;
    const needed = capacity - current;

    const hasGasGiant = location?.hasGasGiant || false;
    const hasWater = location?.hasWater || false;
    const hasStarport = location?.starportClass && ['A', 'B', 'C', 'D'].includes(location.starportClass);

    return {
      title: 'Refueling Operations',
      size: 'medium',
      content: `
        <div style="background: var(--bg-primary); padding: 15px; border-radius: 4px; margin-bottom: 15px;">
          <h4 style="margin: 0 0 10px 0;">Fuel Status</h4>
          <div>Refined: ${fuelState?.refined || 0} tons</div>
          <div>Unrefined: ${fuelState?.unrefined || 0} tons</div>
          <div>Capacity: ${capacity} tons</div>
          <div style="margin-top: 5px; color: var(--warning);">Need: ${needed} tons</div>
        </div>

        <div class="quick-buttons" style="margin-bottom: 15px;">
          <button class="btn btn-secondary refuel-option" data-type="skim" ${!hasGasGiant ? 'disabled' : ''}>
            Gas Giant Skim
            ${!hasGasGiant ? '<br><small>(No gas giant)</small>' : ''}
          </button>
          <button class="btn btn-secondary refuel-option" data-type="water" ${!hasWater ? 'disabled' : ''}>
            Water Extraction
            ${!hasWater ? '<br><small>(No water source)</small>' : ''}
          </button>
          <button class="btn btn-secondary refuel-option" data-type="purchase" ${!hasStarport ? 'disabled' : ''}>
            Starport Purchase
            ${!hasStarport ? '<br><small>(No starport)</small>' : ''}
          </button>
        </div>

        <div id="refuel-details" class="hidden" style="background: var(--bg-primary); padding: 15px; border-radius: 4px; margin-bottom: 15px;">
          <h4 id="refuel-type-label" style="margin: 0 0 10px 0;">Refueling Details</h4>
          <div class="form-group">
            <label for="refuel-amount">Amount (tons)</label>
            <input type="number" id="refuel-amount" min="1" max="${needed}" value="${Math.min(needed, 20)}">
          </div>
          <div id="refuel-info" style="font-size: 0.9em; color: var(--text-muted);"></div>
        </div>

        <div class="button-row">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" id="btn-refuel" disabled>Begin Refueling</button>
        </div>
      `,
      onSetup: (modal) => {
        const detailsDiv = modal.querySelector('#refuel-details');
        const refuelBtn = modal.querySelector('#btn-refuel');
        const amountInput = modal.querySelector('#refuel-amount');
        const infoDiv = modal.querySelector('#refuel-info');
        let selectedType = null;

        const updateInfo = () => {
          const amount = parseInt(amountInput.value) || 0;
          if (selectedType === 'skim') {
            infoDiv.innerHTML = `Time: ~${Math.ceil(amount / 10)} hours<br>Result: Unrefined fuel (needs processing)`;
          } else if (selectedType === 'water') {
            infoDiv.innerHTML = `Time: ~${Math.ceil(amount / 5)} hours<br>Result: Unrefined fuel (needs processing)`;
          } else if (selectedType === 'purchase') {
            const cost = amount * 500; // Cr500/ton refined
            infoDiv.innerHTML = `Cost: Cr${cost.toLocaleString()}<br>Result: Refined fuel (ready to use)`;
          }
        };

        modal.querySelectorAll('.refuel-option').forEach(btn => {
          btn.addEventListener('click', () => {
            if (btn.disabled) return;
            modal.querySelectorAll('.refuel-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedType = btn.dataset.type;
            detailsDiv.classList.remove('hidden');
            modal.querySelector('#refuel-type-label').textContent =
              selectedType === 'skim' ? 'Gas Giant Skimming' :
              selectedType === 'water' ? 'Water Extraction' : 'Starport Purchase';
            refuelBtn.disabled = false;
            updateInfo();
          });
        });

        amountInput.addEventListener('input', updateInfo);

        refuelBtn.addEventListener('click', () => {
          if (!selectedType) return;
          socket.emit('ops:refuel', {
            shipId,
            type: selectedType,
            amount: parseInt(amountInput.value) || 0
          });
          Modals.close();
        });

        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => Modals.close());
      }
    };
  });

})(window);
