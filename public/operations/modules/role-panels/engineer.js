/**
 * AR-204: Engineer Role Panel
 * Extracted from role-panels.js for maintainability.
 */

import { escapeHtml, formatSystemName } from '../utils.js';
import { renderSystemStatusItem, getSystemTooltip } from './shared.js';

/**
 * Generate Engineer role panel HTML
 * @param {object} shipState - Current ship state
 * @param {object} template - Ship template data
 * @param {object} systemStatus - System damage status
 * @param {array} damagedSystems - List of damaged system names
 * @param {object} fuelStatus - Fuel status object
 * @param {array} repairQueue - Active repair queue
 * @returns {string} HTML string
 */
export function getEngineerPanel(shipState, template, systemStatus, damagedSystems, fuelStatus, repairQueue = []) {
  // Power allocation state - AR-54: added power budget tracking
  const defaultPower = { mDrive: 75, weapons: 75, sensors: 75, lifeSupport: 75, computer: 75 };
  const power = { ...defaultPower, ...(shipState.power || {}) };
  const powerEffects = shipState.powerEffects || { weaponsDM: 0, sensorsDM: 0, thrustMultiplier: 1.0 };
  const totalPowerUsed = Object.values(power).reduce((a, b) => a + b, 0);
  const maxPower = Object.keys(power).length * 100; // 500 for 5 systems
  const powerPercent = Math.round((totalPowerUsed / maxPower) * 100);

  const rawFs = fuelStatus || {};
  const fs = {
    total: rawFs.total ?? shipState.fuel ?? template.fuel ?? 40,
    max: rawFs.max ?? template.fuel ?? 40,
    breakdown: rawFs.breakdown || { refined: shipState.fuel ?? template.fuel ?? 40, unrefined: 0, processed: 0 },
    percentFull: rawFs.percentFull ?? 100,
    processing: rawFs.processing ?? null,
    fuelProcessor: rawFs.fuelProcessor ?? template.fuelProcessor ?? false
  };
  const rawBreakdown = fs.breakdown || {};
  const fuelBreakdown = {
    refined: rawBreakdown.refined ?? fs.total ?? 0,
    unrefined: rawBreakdown.unrefined ?? 0,
    processed: rawBreakdown.processed ?? 0
  };

  // Power effect warnings
  const warnings = [];
  if (powerEffects.weaponsDM < 0) warnings.push(`Weapons: ${powerEffects.weaponsDM} DM`);
  if (powerEffects.sensorsDM < 0) warnings.push(`Sensors: ${powerEffects.sensorsDM} DM`);
  if (powerEffects.thrustMultiplier < 1) warnings.push(`Thrust: ${Math.round(powerEffects.thrustMultiplier * 100)}%`);

  // AR-191: Power breakdown tooltip
  const powerTooltip = `Power Usage: ${powerPercent}%\n` +
    `M-Drive: ${power.mDrive}%\n` +
    `Weapons: ${power.weapons}%\n` +
    `Sensors: ${power.sensors}%\n` +
    `Life Support: ${power.lifeSupport}%\n` +
    `Computer: ${power.computer}%`;

  return `
    <div class="detail-section power-section power-controls">
      <h4>Power Allocation</h4>
      <div class="power-budget" title="${powerTooltip}">
        <span class="power-budget-label">Power Budget:</span>
        <div class="power-budget-bar">
          <div class="power-budget-fill ${powerPercent > 100 ? 'overload' : powerPercent > 80 ? 'high' : ''}" style="width: ${Math.min(powerPercent, 100)}%"></div>
        </div>
        <span class="power-budget-value ${powerPercent > 100 ? 'text-danger' : ''}">${powerPercent}%</span>
      </div>
      <div class="power-presets">
        <button onclick="window.setPowerPreset('combat')" class="btn btn-small ${shipState.powerPreset === 'combat' ? 'btn-active' : ''}" title="Max weapons and sensors">Combat</button>
        <button onclick="window.setPowerPreset('silent')" class="btn btn-small ${shipState.powerPreset === 'silent' ? 'btn-active' : ''}" title="Minimal power signature">Silent</button>
        <button onclick="window.setPowerPreset('jump')" class="btn btn-small ${shipState.powerPreset === 'jump' ? 'btn-active' : ''}" title="Prep for jump">Jump</button>
        <button onclick="window.setPowerPreset('standard')" class="btn btn-small ${shipState.powerPreset === 'standard' ? 'btn-active' : ''}" title="Balanced allocation">Standard</button>
      </div>
      <div class="power-sliders">
        <div class="power-slider-row">
          <label>M-Drive</label>
          <input type="range" min="0" max="100" value="${power.mDrive}" class="power-slider" data-system="mDrive" onchange="window.updatePower()" oninput="this.nextElementSibling.textContent=this.value+'%'">
          <span class="power-value">${power.mDrive}%</span>
        </div>
        <div class="power-slider-row">
          <label>Weapons</label>
          <input type="range" min="0" max="100" value="${power.weapons}" class="power-slider" data-system="weapons" onchange="window.updatePower()" oninput="this.nextElementSibling.textContent=this.value+'%'">
          <span class="power-value">${power.weapons}%</span>
        </div>
        <div class="power-slider-row">
          <label>Sensors</label>
          <input type="range" min="0" max="100" value="${power.sensors}" class="power-slider" data-system="sensors" onchange="window.updatePower()" oninput="this.nextElementSibling.textContent=this.value+'%'">
          <span class="power-value">${power.sensors}%</span>
        </div>
        <div class="power-slider-row">
          <label>Life Sup</label>
          <input type="range" min="0" max="100" value="${power.lifeSupport}" class="power-slider" data-system="lifeSupport" onchange="window.updatePower()" oninput="this.nextElementSibling.textContent=this.value+'%'">
          <span class="power-value">${power.lifeSupport}%</span>
        </div>
        <div class="power-slider-row">
          <label>Computer</label>
          <input type="range" min="0" max="100" value="${power.computer}" class="power-slider" data-system="computer" onchange="window.updatePower()" oninput="this.nextElementSibling.textContent=this.value+'%'">
          <span class="power-value">${power.computer}%</span>
        </div>
      </div>
      ${warnings.length > 0 ? `
      <div class="power-effects-warning">
        <small>Effects: ${warnings.join(' | ')}</small>
      </div>
      ` : ''}
    </div>
    <div class="detail-section system-status">
      <h4>System Status</h4>
      <div class="system-status-grid systems-grid">
        ${renderSystemStatusItem('M-Drive', systemStatus.mDrive, getSystemTooltip('mDrive', template))}
        ${renderSystemStatusItem('Power Plant', systemStatus.powerPlant, getSystemTooltip('powerPlant', template))}
        ${renderSystemStatusItem('J-Drive', systemStatus.jDrive, getSystemTooltip('jDrive', template))}
        ${renderSystemStatusItem('Sensors', systemStatus.sensors, getSystemTooltip('sensors', template))}
        ${renderSystemStatusItem('Computer', systemStatus.computer, getSystemTooltip('computer', template))}
        ${renderSystemStatusItem('Armour', systemStatus.armour, getSystemTooltip('armour', template))}
      </div>
    </div>
    ${damagedSystems.length > 0 ? `
    <div class="detail-section">
      <h4>Repair Actions</h4>
      <div class="repair-controls">
        <select id="repair-target" class="repair-select">
          ${damagedSystems.map(s => `<option value="${s}">${formatSystemName(s)}</option>`).join('')}
        </select>
        <button onclick="attemptRepair()" class="btn btn-small" title="Roll Engineer check (8+) to repair selected system. DM penalty equals damage severity.">Attempt Repair</button>
      </div>
      <div class="repair-info">
        <small>Engineer check (8+) with DM = -Severity</small>
      </div>
    </div>
    ` : ''}
    ${repairQueue.length > 0 ? `
    <div class="detail-section repair-queue-section">
      <h4>Active Repairs (${repairQueue.length})</h4>
      <div class="repair-queue-list">
        ${repairQueue.map(r => `
          <div class="repair-item ${r.status === 'in_progress' ? 'active' : ''}" data-repair-id="${r.id}">
            <div class="repair-header">
              <span class="repair-system">${escapeHtml(r.system || 'Unknown')}</span>
              <span class="repair-status ${r.status === 'in_progress' ? 'text-warning' : ''}">${r.status === 'in_progress' ? 'In Progress' : 'Queued'}</span>
            </div>
            <div class="repair-details" style="font-size: 0.85em; color: var(--text-muted);">
              <span class="repair-hours">${r.hoursRemaining || r.hoursRequired}h remaining</span>
              ${r.partsRequired ? `<span class="repair-parts"> | Parts: ${r.partsRequired}</span>` : ''}
            </div>
            <div class="repair-progress" style="background: var(--bg-secondary); border-radius: 3px; height: 4px; margin-top: 4px;">
              <div class="repair-progress-bar" style="width: ${r.hoursRequired ? ((r.hoursRequired - (r.hoursRemaining || r.hoursRequired)) / r.hoursRequired * 100) : 0}%; background: var(--primary); height: 100%; border-radius: 3px;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    <div class="detail-section">
      <h4 title="Fuel is consumed by maneuver drives and jump drives. Unrefined fuel risks misjump.">Fuel Status</h4>
      <div class="fuel-display">
        <div class="fuel-total">
          <span class="fuel-amount">${fs.total}/${fs.max}</span>
          <span class="fuel-unit">tons</span>
          <span class="fuel-percent">(${fs.percentFull}%)</span>
        </div>
        <div class="fuel-bar-container">
          <div class="fuel-bar-segment refined" style="width: ${(fuelBreakdown.refined / fs.max) * 100}%" title="Refined: ${fuelBreakdown.refined}t"></div>
          <div class="fuel-bar-segment processed" style="width: ${(fuelBreakdown.processed / fs.max) * 100}%" title="Processed: ${fuelBreakdown.processed}t"></div>
          <div class="fuel-bar-segment unrefined" style="width: ${(fuelBreakdown.unrefined / fs.max) * 100}%" title="Unrefined: ${fuelBreakdown.unrefined}t"></div>
        </div>
        <div class="fuel-breakdown">
          <div class="fuel-type refined"><span class="fuel-dot"></span>Refined: ${fuelBreakdown.refined}t</div>
          <div class="fuel-type processed"><span class="fuel-dot"></span>Processed: ${fuelBreakdown.processed}t</div>
          <div class="fuel-type unrefined"><span class="fuel-dot"></span>Unrefined: ${fuelBreakdown.unrefined}t</div>
        </div>
      </div>
      ${fs.percentFull < 25 ? `
      <div class="fuel-warning fuel-warning-low">
        <span class="warning-icon">⚠</span>
        LOW FUEL: ${fs.percentFull}% remaining - refuel soon!
      </div>
      ` : ''}
      ${fuelBreakdown.unrefined > 0 ? `
      <div class="fuel-warning">
        <span class="warning-icon">!</span>
        Unrefined fuel: -2 DM to jump checks, 5% misjump risk
      </div>
      ` : ''}
      <div class="fuel-actions">
        <button onclick="openRefuelModal()" class="btn btn-small" title="Refuel ship from starport, gas giant, or water source">Refuel</button>
        ${fs.fuelProcessor && fuelBreakdown.unrefined > 0 ? `
        <button onclick="processFuel()" class="btn btn-small" title="Process unrefined fuel to remove misjump risk (takes time)">Process Fuel</button>
        ` : ''}
        <button onclick="window.magicRefuel && window.magicRefuel()" class="btn btn-small btn-secondary" title="Magically refuel ship so you are not stranded during testing" style="margin-left: 4px;">Magic Refuel</button>
      </div>
      ${fs.processing ? `
      <div class="fuel-processing-status">
        <span class="processing-icon">*</span>
        Processing ${fs.processing.tons}t: ${fs.processing.hoursRemaining}h remaining
      </div>
      ` : ''}
    </div>
    <div class="detail-section jump-capability-compact">
      <h4>Jump Capability</h4>
      ${(() => {
        const jumpRating = template.jumpRating || 2;
        const tonnage = template.tonnage || 100;
        const jumpNet = template.jumpNet || 0; // AR-54: Jump Net bonus tonnage
        const effectiveTonnage = tonnage + jumpNet;
        const fuelPerParsec = Math.ceil(effectiveTonnage * 0.1);
        const maxJumps = Math.floor(fs.total / fuelPerParsec);
        const jumpTooltip = `Ship: ${tonnage}t${jumpNet ? ` + ${jumpNet}t Jump Net` : ''}\\nFuel/parsec: ${fuelPerParsec}t\\nMax jumps with current fuel: ${maxJumps}`;
        return `
      <div class="jump-stats-row" title="${jumpTooltip}">
        <span class="jump-stat">J-${jumpRating}</span>
        <span class="jump-stat">${fuelPerParsec}t/pc</span>
        <span class="jump-stat ${maxJumps === 0 ? 'text-danger' : ''}">${maxJumps} jump${maxJumps !== 1 ? 's' : ''}</span>
      </div>`;
      })()}
    </div>
  `;
}
