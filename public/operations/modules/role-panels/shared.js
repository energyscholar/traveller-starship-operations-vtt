/**
 * AR-204: Shared Role Panel Functions
 * AR-250: GUI Adapter for shared role rendering.
 *
 * ARCHITECTURE NOTE:
 * - State logic: lib/engine/roles/shared-state.js (CommonJS, server-side)
 * - This file: GUI rendering (ES modules, client-side)
 *
 * Due to ES/CommonJS boundary, state functions are duplicated.
 * The server-side shared-state.js is authoritative for:
 * - TUI adapters
 * - Unit tests
 * - Any future shared rendering
 */

/**
 * AR-187: Generate tooltip text for ship system
 * @param {string} system - System key (mDrive, jDrive, etc.)
 * @param {object} template - Ship template data
 * @returns {string} Tooltip text
 */
export function getSystemTooltip(system, template) {
  if (!template) return '';
  switch (system) {
    case 'mDrive':
      return `Thrust ${template.thrust || '?'} | ${template.tonnage || '?'}t ship`;
    case 'jDrive':
      return template.jump ? `Jump-${template.jump} | Fuel: ${template.fuel || '?'}t` : 'No Jump Drive';
    case 'powerPlant':
      return `Powers ${template.tonnage || '?'}t ship | TL${template.techLevel || '?'}`;
    case 'sensors':
      return template.sensors || 'Standard sensors';
    case 'computer':
      return template.computer || 'Ship computer';
    case 'armour':
      return `Armour ${template.armour || 0} | Hull ${template.hull || '?'}`;
    case 'hull':
      return `${template.hull || '?'} HP | ${template.tonnage || '?'} tons`;
    case 'weapon':
      const turretCount = template.turrets?.length || 0;
      return turretCount ? `${turretCount} turret${turretCount > 1 ? 's' : ''}` : 'No weapons';
    default:
      return '';
  }
}

/**
 * Render system status item HTML
 * @param {string} name - System name
 * @param {object} status - System status object
 * @param {string} tooltip - Optional tooltip text
 * @returns {string} HTML string
 */
export function renderSystemStatusItem(name, status, tooltip = '') {
  if (!status) {
    const tooltipAttr = tooltip ? ` title="${tooltip}"` : '';
    return `
      <div class="system-status-item operational"${tooltipAttr}>
        <span class="system-name">${name}</span>
        <span class="system-state">Operational</span>
      </div>
    `;
  }

  const severity = status.totalSeverity || 0;
  const statusClass = severity === 0 ? 'operational' : severity <= 2 ? 'damaged' : 'critical';

  // AR-194: Get failure reason from latest unrepaired crit
  const unrepairedCrits = (status.crits || []).filter(c => !c.repaired);
  const latestCrit = unrepairedCrits[unrepairedCrits.length - 1];
  const failureReason = latestCrit?.failureReason;

  // Build status text with failure reason if available
  let statusText;
  if (severity === 0) {
    statusText = 'Operational';
  } else if (status.disabled) {
    statusText = 'DISABLED';
  } else if (failureReason?.name) {
    statusText = failureReason.name;
  } else {
    statusText = status.message || `Damaged (Sev ${severity})`;
  }

  // Build tooltip with failure description
  let fullTooltip = tooltip || '';
  if (failureReason) {
    const reasonTooltip = [
      failureReason.name,
      failureReason.description,
      failureReason.flavorText ? `"${failureReason.flavorText}"` : ''
    ].filter(Boolean).join(' - ');
    fullTooltip = fullTooltip ? `${fullTooltip}\n\n${reasonTooltip}` : reasonTooltip;
  }
  const tooltipAttr = fullTooltip ? ` title="${fullTooltip}"` : '';

  return `
    <div class="system-status-item ${statusClass}"${tooltipAttr}>
      <span class="system-name">${name}</span>
      <span class="system-state">${statusText}</span>
      ${severity > 0 ? `<span class="system-severity">Sev ${severity}</span>` : ''}
    </div>
  `;
}
