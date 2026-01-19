/**
 * AR-196: Boarding UI Module
 * Provides UI components for boarding actions in space combat
 *
 * Based on lib/boarding.js for server-side resolution
 */

import { escapeHtml } from './utils.js';

/**
 * Check if boarding action is available for current target
 * @param {Object} shipState - Ship state
 * @param {Object} target - Target contact
 * @returns {Object} { canBoard, reason }
 */
export function canBoard(shipState, target) {
  if (!target) {
    return { canBoard: false, reason: 'No target selected' };
  }

  // Must be at adjacent range
  const rangeBand = (target.range_band || '').toLowerCase();
  if (rangeBand !== 'adjacent') {
    return { canBoard: false, reason: `Must be at Adjacent range (currently: ${target.range_band || 'unknown'})` };
  }

  // Must have marines or crew available
  const marines = shipState?.marines || 0;
  const crew = shipState?.crew || 0;
  if (marines === 0 && crew === 0) {
    return { canBoard: false, reason: 'No marines or crew available for boarding' };
  }

  // Check hangar/launch bay status
  if (shipState?.systems?.hangar?.disabled || shipState?.launchBayDisabled) {
    return { canBoard: false, reason: 'Launch bay disabled - cannot deploy boarding party' };
  }

  // Target must not be destroyed
  if (target.hull <= 0 || target.destroyed) {
    return { canBoard: false, reason: 'Target already destroyed' };
  }

  return { canBoard: true, reason: null };
}

/**
 * Render boarding action panel for marines role
 * @param {Object} shipState - Ship state
 * @param {Object} target - Selected target
 * @param {Object} boardingState - Current boarding operation state
 * @returns {string} HTML string
 */
export function renderBoardingPanel(shipState, target, boardingState = null) {
  const marines = shipState?.marines || 0;
  const crew = shipState?.boardingCrew || 0;
  const armorRating = shipState?.marineArmor || 4;  // Default Combat Armor
  const weaponsRating = shipState?.marineWeapons || 1;  // Default Small Arms

  const { canBoard: boardingAllowed, reason: blockReason } = canBoard(shipState, target);

  // Calculate troop strength preview
  const troopStrength = crew + (marines * 2) +
                       (armorRating > 5 ? 1 : 0) +
                       (weaponsRating >= 2 ? 1 : 0);

  // Active boarding operation
  if (boardingState?.active) {
    return `
      <div class="detail-section boarding-active">
        <h4>BOARDING IN PROGRESS</h4>
        <div class="boarding-status" style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; border-left: 4px solid var(--warning);">
          <div class="status-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Target:</span>
            <span class="stat-value">${escapeHtml(boardingState.targetName || 'Unknown')}</span>
          </div>
          <div class="status-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Phase:</span>
            <span class="stat-value ${boardingState.phase === 'fighting' ? 'text-danger' : 'text-warning'}">${boardingState.phase?.toUpperCase() || 'DEPLOYING'}</span>
          </div>
          <div class="status-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Round:</span>
            <span class="stat-value">${boardingState.round || 1} / ${boardingState.maxRounds || '?'}</span>
          </div>
          ${boardingState.attackerDM ? `
            <div class="status-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Our Advantage:</span>
              <span class="stat-value ${boardingState.attackerDM > 0 ? 'text-success' : ''}">${boardingState.attackerDM > 0 ? '+' : ''}${boardingState.attackerDM} DM</span>
            </div>
          ` : ''}
          ${boardingState.defenderDM ? `
            <div class="status-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Enemy Advantage:</span>
              <span class="stat-value text-danger">+${boardingState.defenderDM} DM</span>
            </div>
          ` : ''}
        </div>
        <div class="boarding-actions" style="margin-top: 12px; display: flex; gap: 8px;">
          <button onclick="window.continueBoardingAction()" class="btn btn-warning" title="Continue the boarding action - roll for next round">
            Continue Assault
          </button>
          <button onclick="window.retreatBoardingAction()" class="btn btn-secondary" title="Abort boarding and retreat to ship">
            Retreat
          </button>
        </div>
        ${boardingState.lastResult ? `
          <div class="boarding-last-result" style="margin-top: 12px; padding: 8px; background: var(--bg-tertiary); border-radius: 4px; font-size: 0.85em;">
            <strong>Last Round:</strong> ${escapeHtml(boardingState.lastResult)}
          </div>
        ` : ''}
      </div>
    `;
  }

  // Boarding preparation
  return `
    <div class="detail-section boarding-prep">
      <h4>Boarding Action</h4>
      ${!boardingAllowed ? `
        <div class="boarding-blocked" style="padding: 12px; background: rgba(220,53,69,0.15); border-radius: 6px; margin-bottom: 12px;">
          <span class="text-danger" style="font-weight: bold;">Cannot Board</span>
          <div style="color: var(--text-muted); font-size: 0.85em; margin-top: 4px;">${escapeHtml(blockReason)}</div>
        </div>
      ` : ''}
      <div class="boarding-forces" style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; margin-bottom: 12px;">
        <h5 style="margin: 0 0 8px 0; font-size: 0.9em;">Available Forces</h5>
        <div class="force-row" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Marines:</span>
          <span class="stat-value">${marines} (×2 strength)</span>
        </div>
        <div class="force-row" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Crew for boarding:</span>
          <input type="number" id="boarding-crew-count" min="0" max="${shipState?.totalCrew || 10}" value="${crew}"
                 style="width: 60px; text-align: right; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px; padding: 2px 6px;"
                 onchange="window.updateBoardingPreview()">
        </div>
        <div class="force-row" style="display: flex; justify-content: space-between; margin-bottom: 4px; padding-top: 8px; border-top: 1px solid var(--border-color);">
          <span style="font-weight: bold;">Total Strength:</span>
          <span class="stat-value" id="boarding-strength-preview" style="font-weight: bold; color: var(--accent-green);">${troopStrength}</span>
        </div>
      </div>
      <div class="boarding-equipment" style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; margin-bottom: 12px;">
        <h5 style="margin: 0 0 8px 0; font-size: 0.9em;">Equipment</h5>
        <div class="equip-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span>Armor:</span>
          <select id="boarding-armor" class="boarding-select" onchange="window.updateBoardingPreview()"
                  style="padding: 4px 8px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px;">
            <option value="0">None</option>
            <option value="2">Flak Jacket (2)</option>
            <option value="4" ${armorRating === 4 ? 'selected' : ''}>Combat Armor (4)</option>
            <option value="6">Battle Dress (6) +1 STR</option>
            <option value="8">Battle Dress TL15 (8) +1 STR</option>
          </select>
        </div>
        <div class="equip-row" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Weapons:</span>
          <select id="boarding-weapons" class="boarding-select" onchange="window.updateBoardingPreview()"
                  style="padding: 4px 8px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px;">
            <option value="0">Sidearms</option>
            <option value="1" ${weaponsRating === 1 ? 'selected' : ''}>Rifles</option>
            <option value="2">Heavy Weapons +1 STR</option>
            <option value="3">FGMP/PGMP +1 STR</option>
          </select>
        </div>
      </div>
      ${target ? `
        <div class="boarding-target" style="background: var(--bg-secondary); padding: 12px; border-radius: 6px; margin-bottom: 12px;">
          <h5 style="margin: 0 0 8px 0; font-size: 0.9em;">Target: ${escapeHtml(target.name || target.transponder || 'Unknown')}</h5>
          <div class="target-row" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Range:</span>
            <span class="stat-value ${(target.range_band || '').toLowerCase() === 'adjacent' ? 'text-success' : 'text-danger'}">${target.range_band || 'Unknown'}</span>
          </div>
          <div class="target-row" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Type:</span>
            <span class="stat-value">${target.type || 'Unknown'}</span>
          </div>
          ${target.crew !== undefined ? `
            <div class="target-row" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Est. Crew:</span>
              <span class="stat-value">${target.crew}</span>
            </div>
          ` : ''}
          ${target.marines !== undefined ? `
            <div class="target-row" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Est. Marines:</span>
              <span class="stat-value ${target.marines > 0 ? 'text-warning' : 'text-success'}">${target.marines || 'None'}</span>
            </div>
          ` : ''}
        </div>
      ` : `
        <div class="no-target" style="padding: 12px; background: var(--bg-tertiary); border-radius: 6px; text-align: center; color: var(--text-muted);">
          Select a target to board
        </div>
      `}
      <button onclick="window.initiateBoardingAction()" class="btn btn-danger btn-boarding"
              style="width: 100%;" ${!boardingAllowed ? 'disabled' : ''}
              title="${boardingAllowed ? 'Launch boarding party to capture enemy vessel' : blockReason}">
        ${boardingAllowed ? 'INITIATE BOARDING' : 'Cannot Board'}
      </button>
      <div class="boarding-note" style="margin-top: 8px; font-size: 0.75em; color: var(--text-muted); text-align: center;">
        Boarding requires Adjacent range (&lt;1 km) and functional launch bay
      </div>
    </div>
  `;
}

/**
 * Calculate and display boarding strength preview
 */
export function updateBoardingPreview() {
  const marines = parseInt(document.getElementById('boarding-marines')?.value || '0', 10);
  const crew = parseInt(document.getElementById('boarding-crew-count')?.value || '0', 10);
  const armor = parseInt(document.getElementById('boarding-armor')?.value || '0', 10);
  const weapons = parseInt(document.getElementById('boarding-weapons')?.value || '0', 10);

  let strength = crew + (marines * 2);
  if (armor > 5) strength += 1;  // Battle Dress bonus
  if (weapons >= 2) strength += 1;  // Heavy weapons bonus

  const display = document.getElementById('boarding-strength-preview');
  if (display) {
    display.textContent = strength;
    display.style.color = strength > 10 ? 'var(--accent-green)' : strength > 5 ? 'var(--warning)' : 'var(--text-muted)';
  }
}

/**
 * Format boarding outcome for display
 * @param {Object} result - Result from resolveBoardingAction
 * @returns {string} Formatted outcome message
 */
export function formatBoardingOutcome(result) {
  const outcomeLabels = {
    'ATTACKERS_DEFEATED': 'DEFEATED - Boarding party eliminated!',
    'ATTACKERS_RETREAT': 'RETREAT - Boarding party forced back!',
    'FIGHTING_CONTINUES': 'ENGAGED - Combat continues...',
    'SUCCESS': 'BREAKTHROUGH - Control imminent!',
    'IMMEDIATE_CONTROL': 'CAPTURED - Ship is ours!'
  };

  return outcomeLabels[result.outcome] || result.outcome;
}

/**
 * Render boarding result notification
 * @param {Object} result - Boarding resolution result
 * @returns {string} HTML for notification
 */
export function renderBoardingResult(result) {
  const outcomeClass = {
    'ATTACKERS_DEFEATED': 'danger',
    'ATTACKERS_RETREAT': 'warning',
    'FIGHTING_CONTINUES': 'info',
    'SUCCESS': 'success',
    'IMMEDIATE_CONTROL': 'success'
  }[result.outcome] || 'info';

  return `
    <div class="boarding-result boarding-${outcomeClass}" style="padding: 12px; border-radius: 6px; background: var(--bg-${outcomeClass === 'success' ? 'success' : outcomeClass === 'danger' ? 'danger' : 'secondary'});">
      <div class="result-header" style="font-weight: bold; font-size: 1.1em; margin-bottom: 8px;">
        ${formatBoardingOutcome(result)}
      </div>
      <div class="result-description" style="margin-bottom: 8px;">
        ${escapeHtml(result.description || '')}
      </div>
      ${result.hullDamage ? `<div class="result-damage text-warning">Ship took ${result.hullDamage} hull damage</div>` : ''}
      ${result.roundsToControl !== undefined && result.roundsToControl > 0 ? `<div class="result-rounds">Control in ${result.roundsToControl} rounds</div>` : ''}
      ${result.counterBoardAllowed ? `<div class="result-counter text-danger">Enemy may counter-board at +${result.counterBoardDM} DM!</div>` : ''}
    </div>
  `;
}

// Export for window binding
export default {
  canBoard,
  renderBoardingPanel,
  updateBoardingPreview,
  formatBoardingOutcome,
  renderBoardingResult
};
