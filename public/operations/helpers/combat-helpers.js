/**
 * AR-BD-5: Combat Helper Functions
 * Pure utility functions for combat display
 */

/**
 * Get color based on health percentage
 * @param {number} current - Current health
 * @param {number} max - Maximum health
 * @returns {string} CSS color (green, yellow, red, gray)
 */
export function getHealthColor(current, max) {
  if (max <= 0) return 'gray';
  if (current <= 0) return 'gray';

  const percent = (current / max) * 100;

  if (percent > 66) return 'green';
  if (percent > 33) return 'yellow';
  if (percent > 0) return 'red';
  return 'gray';
}

/**
 * Get health percentage
 * @param {number} current - Current health
 * @param {number} max - Maximum health
 * @returns {number} Percentage (0-100)
 */
export function getHealthPercent(current, max) {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (current / max) * 100));
}

/**
 * Get CSS class for health bar
 * @param {number} current - Current health
 * @param {number} max - Maximum health
 * @returns {string} CSS class name
 */
export function getHealthBarClass(current, max) {
  const color = getHealthColor(current, max);
  return `health-bar-${color}`;
}

/**
 * Format damage for display
 * @param {number} damage - Damage amount
 * @returns {string} Formatted string (e.g., "-15")
 */
export function formatDamage(damage) {
  return damage > 0 ? `-${damage}` : '0';
}

/**
 * Get disposition display color
 * @param {string} disposition - hostile, friendly, neutral, unknown
 * @returns {string} CSS color
 */
export function getDispositionColor(disposition) {
  switch (disposition) {
    case 'hostile': return '#ff4444';
    case 'friendly': return '#44ff44';
    case 'neutral': return '#ffff44';
    default: return '#888888';
  }
}

/**
 * Get contact icon shape based on type
 * @param {string} type - Contact type
 * @returns {string} Shape name (triangle, circle, square, diamond)
 */
export function getContactShape(type) {
  const typeLC = (type || '').toLowerCase();
  if (['ship', 'patrol', 'trader', 'warship', 'scout', 'corsair'].includes(typeLC)) {
    return 'triangle';
  }
  if (['station', 'starport', 'base'].includes(typeLC)) {
    return 'square';
  }
  if (['asteroid', 'debris'].includes(typeLC)) {
    return 'circle';
  }
  if (['missile', 'torpedo'].includes(typeLC)) {
    return 'diamond';
  }
  return 'circle';
}
