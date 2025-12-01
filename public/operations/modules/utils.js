/**
 * Utility Functions Module
 * Common utilities for Operations VTT
 *
 * Extracted from app.js for modularization (Autorun 3, Stage 1)
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Format role name for display
 * Converts snake_case to Title Case
 * @param {string} role - Role identifier (e.g., "sensor_operator")
 * @returns {string} Formatted name (e.g., "Sensor Operator")
 */
export function formatRoleName(role) {
  if (!role) return 'None';
  return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Format action name for display
 * @param {string} action - Action identifier
 * @returns {string} Formatted action name
 */
export function formatActionName(action) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Format range for display
 * @param {number} range - Range in km
 * @returns {string} Formatted range string
 */
export function formatRange(range) {
  if (range >= 1000000) {
    return `${(range / 1000000).toFixed(1)}M km`;
  } else if (range >= 1000) {
    return `${(range / 1000).toFixed(1)}k km`;
  }
  return `${range} km`;
}

/**
 * Get range band class name
 * @param {string} rangeBand - Range band identifier
 * @returns {string} CSS class name
 */
export function getRangeClass(rangeBand) {
  const classes = {
    'close': 'range-close',
    'short': 'range-short',
    'medium': 'range-medium',
    'long': 'range-long',
    'distant': 'range-distant',
    'stellar': 'range-stellar',
    'belt': 'range-belt',
    'planetary': 'range-planetary'
  };
  return classes[rangeBand] || 'range-unknown';
}

/**
 * Format range band for display
 * @param {string} band - Range band identifier
 * @returns {string} Formatted range band name
 */
export function formatRangeBand(band) {
  const names = {
    'close': 'Close',
    'short': 'Short',
    'medium': 'Medium',
    'long': 'Long',
    'distant': 'Distant',
    'stellar': 'Stellar',
    'belt': 'Belt',
    'planetary': 'Planetary'
  };
  return names[band] || band;
}

/**
 * Format system name for display
 * @param {string} system - System identifier (snake_case or camelCase)
 * @returns {string} Formatted system name
 */
export function formatSystemName(system) {
  if (!system) return 'Unknown';
  const names = {
    // snake_case keys
    'bridge': 'Bridge',
    'sensors': 'Sensors',
    'weapons': 'Weapons',
    'maneuver_drive': 'M-Drive',
    'jump_drive': 'J-Drive',
    'power_plant': 'Power Plant',
    'fuel_system': 'Fuel System',
    'life_support': 'Life Support',
    'computer': 'Computer',
    'hull': 'Hull',
    // camelCase keys (ship systems)
    'mDrive': 'M-Drive',
    'jDrive': 'J-Drive',
    'powerPlant': 'Power Plant',
    'armour': 'Armour',
    'weapon': 'Weapons',
    'fuel': 'Fuel',
    'cargo': 'Cargo',
    'crew': 'Crew'
  };
  return names[system] || system.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get status color based on percentage
 * @param {number} percent - Value from 0-100
 * @returns {string} CSS color class
 */
export function getStatusColor(percent) {
  if (percent >= 75) return 'status-good';
  if (percent >= 50) return 'status-warn';
  if (percent >= 25) return 'status-low';
  return 'status-crit';
}

/**
 * Get contact type icon
 * @param {string} type - Contact type
 * @returns {string} Icon/symbol for the contact
 */
export function getContactIcon(type) {
  const icons = {
    'Ship': '⬡',
    'Station': '⬢',
    'Planet': '●',
    'Moon': '○',
    'Star': '★',
    'Gas Giant': '◉',
    'Planetoid Belt': '⋯',
    'Naval Base': '⚓',
    'Scout Base': '⚐',
    'Unknown': '?'
  };
  return icons[type] || '◇';
}
