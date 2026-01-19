/**
 * AR-204: Astrogator Role Panel
 * Extracted from role-panels.js for maintainability.
 */

/**
 * Generate Astrogator role panel HTML
 * @param {object} shipState - Current ship state
 * @param {object} template - Ship template data
 * @param {object} jumpStatus - Jump status
 * @param {object} campaign - Campaign data
 * @param {object} systemStatus - System status
 * @returns {string} HTML string
 */
export function getAstrogatorPanel(shipState, template, jumpStatus, campaign, systemStatus) {
  const jumpRating = template.jumpRating || 2;
  const fuelAvailable = shipState.fuel ?? template.fuel ?? 40;
  const tonnage = template.tonnage || 100;
  const fuelPerParsec = Math.round(tonnage * 0.1); // 10% of tonnage per parsec

  // AR-15.8: Calculate max jump range based on fuel
  const maxJumpWithFuel = Math.min(jumpRating, Math.floor(fuelAvailable / fuelPerParsec));
  const jDriveDisabled = systemStatus?.jDrive?.disabled;

  if (jumpStatus.inJump) {
    return `
      <div class="detail-section jump-in-progress">
        <h4>IN JUMP SPACE</h4>
        <div class="jump-status-display">
          <div class="stat-row">
            <span>Destination:</span>
            <span class="stat-value">${jumpStatus.destination}</span>
          </div>
          <div class="stat-row">
            <span>Jump Distance:</span>
            <span class="stat-value">J-${jumpStatus.jumpDistance}</span>
          </div>
          <div class="stat-row">
            <span>ETA:</span>
            <span class="stat-value">${jumpStatus.jumpEndDate}</span>
          </div>
          <div class="stat-row">
            <span>Time Remaining:</span>
            <span class="stat-value">${jumpStatus.hoursRemaining} hours</span>
          </div>
        </div>
        ${jumpStatus.canExit ? `
          <button onclick="completeJump()" class="btn btn-primary" title="Exit jump space at destination">Exit Jump Space</button>
        ` : `
          <div class="jump-skip-testing">
            <button onclick="skipToJumpExit()" class="btn btn-secondary btn-small" title="Testing: Advance time to jump exit">
              [DEV] Skip to Exit
            </button>
            <small class="testing-note">Testing only - advances time 168h</small>
          </div>
        `}
      </div>
    `;
  }

  // AR-68: Check if position needs verification after jump exit
  const needsVerification = shipState.positionVerified === false;
  if (needsVerification) {
    return `
      <div class="detail-section position-verification">
        <h4>POSITION VERIFICATION REQUIRED</h4>
        <div class="verification-notice">
          Ship has just exited jump space. Verify position before pilot can navigate.
        </div>
        <button onclick="verifyPosition()" class="btn btn-primary">
          Verify Position
        </button>
        <small class="verification-note">Electronics (Sensors) check with +4 DM</small>
      </div>
    `;
  }

  const hasSectorData = campaign?.current_sector && campaign?.current_hex;

  return `
    <div class="detail-section">
      <h4>Navigation</h4>
      <div class="detail-stats">
        <div class="stat-row">
          <span>Current System:</span>
          <span class="stat-value">${campaign?.current_system || (campaign?.current_sector && campaign?.current_hex ? `${campaign.current_sector} ${campaign.current_hex}` : 'Unknown')}</span>
        </div>
        <div class="stat-row">
          <span>Jump Drive:</span>
          <span class="stat-value ${jDriveDisabled ? 'text-danger' : ''}">${jDriveDisabled ? 'DAMAGED' : 'Operational'}</span>
        </div>
        <div class="stat-row" title="Maximum jump distance capability">
          <span>Jump Rating:</span>
          <span class="stat-value">J-${jumpRating}</span>
        </div>
        <div class="stat-row" title="${fuelAvailable} tons available, ${fuelPerParsec} tons per parsec">
          <span>Fuel Available:</span>
          <span class="stat-value ${fuelAvailable < fuelPerParsec ? 'text-danger' : ''}">${fuelAvailable} tons</span>
        </div>
        <div class="stat-row" title="Maximum jump distance with current fuel">
          <span>Max Jump Range:</span>
          <span class="stat-value ${maxJumpWithFuel < jumpRating ? 'text-warning' : 'text-success'}">
            J-${maxJumpWithFuel} ${maxJumpWithFuel < jumpRating ? '(fuel limited)' : ''}
          </span>
        </div>
      </div>
    </div>
    ${hasSectorData ? `
    <div class="detail-section jump-map-section">
      <h4>Jump Map</h4>
      <div class="jump-map-controls">
        <select id="jump-map-range" class="jump-select" onchange="updateJumpMap()" title="Display systems within jump range">
          ${[...Array(jumpRating)].map((_, i) => {
            const canReach = (i + 1) <= maxJumpWithFuel;
            return `<option value="${i+1}" ${!canReach ? 'class="jump-out-of-range"' : ''}>
              J-${i+1} Range${!canReach ? ' (needs fuel)' : ''}
            </option>`;
          }).join('')}
        </select>
        <select id="jump-map-style" class="jump-select" onchange="updateJumpMap()" title="Map display style">
          <option value="poster">Poster</option>
          <option value="terminal">Terminal</option>
          <option value="candy">Candy</option>
          <option value="atlas">Atlas</option>
        </select>
        <select id="jump-map-size" class="jump-select" onchange="setMapSize(this.value)" title="Map display size">
          <option value="small">Small</option>
          <option value="medium" selected>Medium</option>
          <option value="large">Large</option>
          <option value="full">Full Screen</option>
        </select>
      </div>
      <div id="jump-map-container" class="jump-map-container" data-size="medium">
        <img id="jump-map-image" src="" alt="Jump Map" style="display: none;">
        <div class="jump-map-loading">Loading jump map...</div>
      </div>
      <div class="jump-map-hint">
        <small>Drag to pan | Scroll to zoom | Click system for details</small>
      </div>
      <div id="jump-destinations" class="jump-destinations">
        <div class="jump-destinations-loading">Fetching nearby systems...</div>
      </div>
    </div>
    ` : `
    <div class="detail-section">
      <p class="placeholder">Use system lookup to set location for jump map</p>
    </div>
    `}
    <div class="detail-section">
      <h4>Plot Jump Course</h4>
      ${jDriveDisabled ? `
      <div class="jump-warning">
        <span class="warning-icon">⚠</span>
        <span>Jump drive damaged - repairs required before jump</span>
      </div>
      ` : ''}
      <div class="jump-controls">
        <div class="form-group">
          <label for="jump-destination">Destination:</label>
          <input type="text" id="jump-destination" placeholder="System name (e.g., Ator)" class="jump-input"
                 title="Enter destination system name">
        </div>
        <div class="form-group">
          <label for="jump-distance">Distance:</label>
          <select id="jump-distance" class="jump-select" title="Select jump distance (limited by fuel and drive rating)">
            ${[...Array(jumpRating)].map((_, i) => {
              const distance = i + 1;
              const fuelNeeded = distance * fuelPerParsec;
              const canJump = distance <= maxJumpWithFuel && !jDriveDisabled;
              return `<option value="${distance}" ${!canJump ? 'disabled' : ''}>
                Jump-${distance} (${distance} parsec${distance > 1 ? 's' : ''}, ${fuelNeeded}t fuel)${!canJump ? ' - unavailable' : ''}
              </option>`;
            }).join('')}
          </select>
        </div>
        <button onclick="plotJumpCourse()" class="btn btn-secondary ${jDriveDisabled || maxJumpWithFuel === 0 ? 'disabled' : ''}"
                title="${jDriveDisabled ? 'Jump drive damaged' : maxJumpWithFuel === 0 ? 'Insufficient fuel for any jump' : 'Calculate jump coordinates and verify fuel requirements [P]'}"
                ${jDriveDisabled || maxJumpWithFuel === 0 ? 'disabled' : ''}><span class="hotkey-hint">[P]</span> Plot Course</button>
      </div>
      <div id="jump-plot-result" class="jump-plot-result" style="display: none;">
        <!-- Populated by plotJumpCourse() -->
      </div>
    </div>
    <div class="detail-section astrogator-skill-note">
      <small><em>Your Astrogation skill affects jump accuracy and fuel efficiency</em></small>
    </div>
  `;
}
