/**
 * AR-153 Phase 1D: Jump Travel Module
 * Jump drive operations and course plotting
 */

/**
 * Request current jump status
 * @param {Object} state - Application state
 */
export function requestJumpStatus(state) {
  if (state.socket && state.shipId) {
    state.socket.emit('ops:getJumpStatus');
  }
}

/**
 * Update fuel estimate based on jump distance
 * @param {Object} state - Application state
 */
export function updateFuelEstimate(state) {
  const distance = parseInt(document.getElementById('jump-distance')?.value) || 1;
  const hullTonnage = state.ship?.template_data?.tonnage || 100;
  const fuelNeeded = Math.round(hullTonnage * distance * 0.1);
  const estimateEl = document.getElementById('fuel-estimate');
  if (estimateEl) {
    estimateEl.textContent = fuelNeeded;
  }
}

/**
 * Plot jump course (shows info before committing)
 * @param {Object} state - Application state
 */
export function plotJumpCourse(state) {
  const destination = document.getElementById('jump-destination')?.value?.trim();
  const distance = parseInt(document.getElementById('jump-distance')?.value) || 1;

  if (!destination) {
    showNotification('Please enter a destination system', 'error');
    return;
  }

  state.socket.emit('ops:plotJump', {
    destination,
    distance
  });
}

/**
 * Verify position after jump exit
 * @param {Object} state - Application state
 */
export function verifyPosition(state) {
  state.socket.emit('ops:verifyPosition');
}

/**
 * Handle plotJump result
 * @param {Object} data - Plot result data
 */
export function handleJumpPlotted(data) {
  const resultDiv = document.getElementById('jump-plot-result');
  if (!resultDiv) return;

  const {
    destination, distance, canJump, error, fuelNeeded, fuelAvailable,
    fuelAfterJump, travelTime, currentDate, arrivalDate, warnings = [],
    destinationInfo, astrogatorSkill
  } = data;

  let html = `<div class="jump-plot-summary ${canJump ? 'can-jump' : 'cannot-jump'}">`;

  if (!canJump) {
    html += `
      <div class="plot-error">
        <span class="error-icon">!</span>
        ${error || 'Cannot initiate jump'}
      </div>
    `;
  } else {
    html += `
      <div class="plot-header">Course to ${destination} (J-${distance})</div>
      <div class="plot-stats">
        <div class="plot-row">
          <span>Fuel Required:</span>
          <span class="plot-value">${fuelNeeded} tons</span>
        </div>
        <div class="plot-row">
          <span>Fuel After Jump:</span>
          <span class="plot-value ${fuelAfterJump < fuelNeeded ? 'text-warning' : ''}">${fuelAfterJump} tons</span>
        </div>
        <div class="plot-row">
          <span>Travel Time:</span>
          <span class="plot-value">${travelTime}</span>
        </div>
        <div class="plot-row">
          <span>Current Date:</span>
          <span class="plot-value">${currentDate}</span>
        </div>
        <div class="plot-row">
          <span>ETA:</span>
          <span class="plot-value">${arrivalDate}</span>
        </div>
      </div>
    `;

    if (destinationInfo) {
      html += `
        <div class="plot-destination-info">
          <div class="plot-row">
            <span>Starport:</span>
            <span class="plot-value">${destinationInfo.starport || '?'}</span>
          </div>
          ${destinationInfo.gasGiants > 0 ? `
          <div class="plot-row">
            <span>Gas Giants:</span>
            <span class="plot-value">${destinationInfo.gasGiants} (wilderness refuel possible)</span>
          </div>
          ` : ''}
        </div>
      `;
    }

    if (warnings.length > 0) {
      html += `<div class="plot-warnings">`;
      warnings.forEach(w => {
        html += `<div class="plot-warning"><span class="warning-icon">!</span> ${w}</div>`;
      });
      html += `</div>`;
    }

    if (astrogatorSkill) {
      html += `<div class="plot-skill-note"><em>${astrogatorSkill}</em></div>`;
    }

    html += `
      <div class="plot-actions">
        <button onclick="initiateJumpFromPlot('${destination}', ${distance})" class="btn btn-primary">
          Initiate Jump
        </button>
      </div>
    `;
  }

  html += `</div>`;
  resultDiv.innerHTML = html;
  resultDiv.style.display = 'block';
}

/**
 * Initiate jump from plotted course
 * @param {Object} state - Application state
 * @param {string} destination - Jump destination
 * @param {number} distance - Jump distance
 */
export function initiateJumpFromPlot(state, destination, distance) {
  // Read hex/sector from input data attributes (set when destination selected)
  const destInput = document.getElementById('jump-destination');
  const destinationHex = destInput?.dataset?.hex || null;
  const destinationSector = destInput?.dataset?.sector || null;
  state.socket.emit('ops:initiateJump', { destination, distance, destinationHex, destinationSector });
}

/**
 * Initiate jump from form inputs
 * @param {Object} state - Application state
 */
export function initiateJump(state) {
  const destInput = document.getElementById('jump-destination');
  const destination = destInput?.value?.trim();
  const distance = parseInt(document.getElementById('jump-distance')?.value) || 1;

  if (!destination) {
    showNotification('Please enter a destination', 'error');
    return;
  }

  // Send hex/sector as UIDs for reliable server-side lookup
  const destinationHex = destInput?.dataset?.hex || null;
  const destinationSector = destInput?.dataset?.sector || null;
  state.socket.emit('ops:initiateJump', {
    destination,
    distance,
    destinationHex,
    destinationSector
  });
}

/**
 * Complete jump
 * @param {Object} state - Application state
 */
export function completeJump(state) {
  state.socket.emit('ops:completeJump');
}

/**
 * Skip to jump exit (testing feature)
 * @param {Object} state - Application state
 */
export function skipToJumpExit(state) {
  state.socket.emit('ops:skipToJumpExit');
  showNotification('Advancing time to jump exit...', 'info');
}
