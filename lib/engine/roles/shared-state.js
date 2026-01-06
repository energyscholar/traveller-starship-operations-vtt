/**
 * AR-250: Shared Role State Functions
 *
 * Pure state extraction for role panels.
 * No HTML, no formatting - just structured data.
 *
 * @module lib/engine/roles/shared-state
 */

/**
 * Extract system state from damage status
 * @param {string} name - System name
 * @param {object} status - System status object (from ship.systems[key])
 * @returns {object} Pure state object
 */
function getSystemState(name, status) {
  if (!status) {
    return {
      name,
      severity: 0,
      disabled: false,
      operational: true,
      failureReason: null,
      message: null,
      crits: []
    };
  }

  const severity = status.totalSeverity || 0;
  const unrepairedCrits = (status.crits || []).filter(c => !c.repaired);
  const latestCrit = unrepairedCrits[unrepairedCrits.length - 1];

  return {
    name,
    severity,
    disabled: status.disabled || false,
    operational: severity === 0,
    failureReason: latestCrit?.failureReason || null,
    message: status.message || null,
    crits: status.crits || []
  };
}

/**
 * Get system metadata from ship template
 * @param {string} system - System key
 * @param {object} template - Ship template data
 * @returns {object} System metadata
 */
function getSystemMeta(system, template) {
  if (!template) {
    return { type: system, description: '' };
  }

  switch (system) {
    case 'mDrive':
      return {
        type: 'mDrive',
        thrust: template.thrust,
        tonnage: template.tonnage
      };
    case 'jDrive':
      return {
        type: 'jDrive',
        jump: template.jump,
        fuel: template.fuel,
        hasJDrive: !!template.jump
      };
    case 'powerPlant':
      return {
        type: 'powerPlant',
        tonnage: template.tonnage,
        techLevel: template.techLevel
      };
    case 'sensors':
      return {
        type: 'sensors',
        grade: template.sensors || 'Standard'
      };
    case 'computer':
      return {
        type: 'computer',
        model: template.computer || 'Ship computer'
      };
    case 'armour':
      return {
        type: 'armour',
        rating: template.armour || 0,
        hull: template.hull
      };
    case 'hull':
      return {
        type: 'hull',
        hp: template.hull,
        tonnage: template.tonnage
      };
    case 'weapon':
      return {
        type: 'weapon',
        turretCount: template.turrets?.length || 0,
        turrets: template.turrets || []
      };
    default:
      return { type: system };
  }
}

/**
 * Determine status classification for display
 * @param {number} severity - Damage severity
 * @param {boolean} disabled - Whether system is disabled
 * @returns {string} Status class: 'operational', 'damaged', or 'critical'
 */
function getStatusClass(severity, disabled) {
  if (disabled) return 'critical';
  if (severity === 0) return 'operational';
  if (severity <= 2) return 'damaged';
  return 'critical';
}

/**
 * Get status display text
 * @param {object} systemState - From getSystemState
 * @returns {string} Status text
 */
function getStatusText(systemState) {
  if (systemState.operational) return 'Operational';
  if (systemState.disabled) return 'DISABLED';
  if (systemState.failureReason?.name) return systemState.failureReason.name;
  if (systemState.message) return systemState.message;
  return `Damaged (Sev ${systemState.severity})`;
}

module.exports = {
  getSystemState,
  getSystemMeta,
  getStatusClass,
  getStatusText
};
