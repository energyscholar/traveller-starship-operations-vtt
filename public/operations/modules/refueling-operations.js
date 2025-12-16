/**
 * AR-153 Phase 3: Refueling Operations Module
 * Fuel management, refueling, and processing
 *
 * Note: Uses global showNotification from notifications.js
 */

/**
 * Open refuel modal
 * @param {Object} state - Application state
 * @param {Function} showModalFn - Function to show modal
 */
export function openRefuelModal(state, showModalFn) {
  // Request refuel options from server
  state.socket.emit('ops:getRefuelOptions');
  showModalFn('template-refuel');
}

/**
 * Process unrefined fuel via prompt (simple version)
 * @param {Object} state - Application state
 */
export function processFuel(state) {
  if (!state.socket || !state.campaignId) {
    showNotification('Not connected to campaign', 'error');
    return;
  }

  // Get unrefined fuel amount from ship state
  const fuel = state.shipState?.fuel || {};
  const unrefined = fuel.unrefined || 0;

  if (unrefined <= 0) {
    showNotification('No unrefined fuel to process', 'warning');
    return;
  }

  // Prompt for amount
  const tons = prompt(`Process how many tons of unrefined fuel? (0-${unrefined})`, unrefined);
  if (tons === null) return;

  const amount = parseFloat(tons);
  if (isNaN(amount) || amount <= 0 || amount > unrefined) {
    showNotification('Invalid amount', 'error');
    return;
  }

  state.socket.emit('ops:startFuelProcessing', { tons: amount });
}

/**
 * Populate refuel modal with available sources
 * @param {Object} state - Application state
 * @param {Function} setRefuelMaxFn - Function to set max refuel amount
 */
export function populateRefuelModal(state, setRefuelMaxFn) {
  const sourceSelect = document.getElementById('refuel-source');
  if (!sourceSelect) return;

  if (!state.fuelSources || state.fuelSources.length === 0) {
    sourceSelect.innerHTML = '<option value="">No fuel sources available</option>';
    return;
  }

  sourceSelect.innerHTML = state.fuelSources.map(s =>
    `<option value="${s.id}">${s.name} - ${s.fuelType} (${s.cost > 0 ? 'Cr' + s.cost + '/ton' : 'Free'})</option>`
  ).join('');

  // AR-60: Default amount to MAX
  setRefuelMaxFn();
}

/**
 * Update refuel preview when amount/source changes
 * @param {Object} state - Application state
 */
export function updateRefuelAmountPreview(state) {
  const sourceId = document.getElementById('refuel-source')?.value;
  const tons = parseInt(document.getElementById('refuel-amount')?.value) || 0;

  if (sourceId && tons > 0) {
    state.socket.emit('ops:canRefuel', { sourceId, tons });
  } else {
    updateRefuelPreview({ canRefuel: false });
  }
}

/**
 * Update refuel preview display
 * @param {Object} data - Preview data from server
 */
export function updateRefuelPreview(data) {
  const previewEl = document.getElementById('refuel-preview');
  if (!previewEl) return;

  if (!data.canRefuel) {
    if (data.error) {
      previewEl.innerHTML = `<div class="refuel-error">${data.error}</div>`;
    } else {
      previewEl.innerHTML = '<div class="refuel-info">Select source and amount</div>';
    }
    return;
  }

  previewEl.innerHTML = `
    <div class="refuel-preview-info">
      <div class="preview-row">
        <span>Fuel Type:</span>
        <span class="preview-value">${data.fuelType}</span>
      </div>
      <div class="preview-row">
        <span>Cost:</span>
        <span class="preview-value">${data.cost > 0 ? 'Cr' + data.cost : 'Free'}</span>
      </div>
      <div class="preview-row">
        <span>Time:</span>
        <span class="preview-value">${data.timeHours > 0 ? data.timeHours + ' hours' : 'Instant'}</span>
      </div>
      ${data.skillCheck ? `
      <div class="preview-row">
        <span>Skill Check:</span>
        <span class="preview-value">${data.skillCheck.skill} (${data.skillCheck.difficulty}+)</span>
      </div>
      ` : ''}
    </div>
  `;
}

/**
 * Execute refuel operation
 * @param {Object} state - Application state
 */
export function executeRefuel(state) {
  const sourceId = document.getElementById('refuel-source')?.value;
  const tons = parseInt(document.getElementById('refuel-amount')?.value) || 0;

  if (!sourceId || tons <= 0) {
    showNotification('Please select source and amount', 'error');
    return;
  }

  state.socket.emit('ops:refuel', { sourceId, tons });
}

/**
 * Set refuel amount to maximum available space
 * @param {Object} state - Application state
 * @param {Function} updatePreviewFn - Function to update preview
 */
export function setRefuelMax(state, updatePreviewFn) {
  const fuelStatus = state.fuelStatus || {};
  const spaceAvailable = (fuelStatus.max || 40) - (fuelStatus.total || 0);
  const amountInput = document.getElementById('refuel-amount');
  if (amountInput) {
    amountInput.value = spaceAvailable;
    updatePreviewFn();
  }
}

/**
 * Execute fuel processing from modal
 * @param {Object} state - Application state
 * @param {Function} closeModalFn - Function to close modal
 */
export function executeProcessFuel(state, closeModalFn) {
  const tons = parseInt(document.getElementById('process-amount')?.value) || 0;

  if (tons <= 0) {
    showNotification('Please enter amount to process', 'error');
    return;
  }

  state.socket.emit('ops:startFuelProcessing', { tons });
  closeModalFn();
}

/**
 * Set process amount to maximum unrefined fuel
 * @param {Object} state - Application state
 */
export function setProcessMax(state) {
  const fuelStatus = state.fuelStatus || {};
  const unrefined = fuelStatus.breakdown?.unrefined || 0;
  const amountInput = document.getElementById('process-amount');
  if (amountInput) {
    amountInput.value = unrefined;
  }
}

/**
 * Request current fuel status from server
 * @param {Object} state - Application state
 */
export function requestFuelStatus(state) {
  if (state.socket && state.selectedShipId) {
    state.socket.emit('ops:getFuelStatus');
  }
}
