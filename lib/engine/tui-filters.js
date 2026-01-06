/**
 * TUI Filter Helpers for Combat Demos
 *
 * Provides hotkey-accessible filters for testing readability.
 *
 * Hotkeys:
 *   v - cycle verbosity (NARRATIVE → NORMAL → DETAILED → DEBUG)
 *   c - toggle crits only (show only critical hit events)
 *   d - toggle damage only (show only damage events)
 *   p - toggle phase events (show phase transitions)
 *   a - show all (reset filters)
 *   / - quick filter prompt
 */

// Filter state
const state = {
  verbosity: 'NORMAL',     // NARRATIVE | NORMAL | DETAILED | DEBUG
  critsOnly: false,
  damageOnly: false,
  phaseEvents: true,
  customFilter: null       // regex string
};

// Verbosity levels (lower number = less text)
const VERBOSITY_LEVELS = {
  NARRATIVE: 1,
  NORMAL: 2,
  DETAILED: 3,
  DEBUG: 4
};

/**
 * Cycle to next verbosity level
 * @returns {string} New verbosity level
 */
function cycleVerbosity() {
  const levels = ['NARRATIVE', 'NORMAL', 'DETAILED', 'DEBUG'];
  const current = levels.indexOf(state.verbosity);
  state.verbosity = levels[(current + 1) % levels.length];
  return state.verbosity;
}

/**
 * Toggle crits-only filter
 * @returns {boolean} New state
 */
function toggleCritsOnly() {
  state.critsOnly = !state.critsOnly;
  if (state.critsOnly) {
    state.damageOnly = false; // Mutually exclusive
  }
  return state.critsOnly;
}

/**
 * Toggle damage-only filter
 * @returns {boolean} New state
 */
function toggleDamageOnly() {
  state.damageOnly = !state.damageOnly;
  if (state.damageOnly) {
    state.critsOnly = false; // Mutually exclusive
  }
  return state.damageOnly;
}

/**
 * Toggle phase events visibility
 * @returns {boolean} New state
 */
function togglePhaseEvents() {
  state.phaseEvents = !state.phaseEvents;
  return state.phaseEvents;
}

/**
 * Set custom regex filter
 * @param {string} pattern - Regex pattern string
 */
function setCustomFilter(pattern) {
  state.customFilter = pattern || null;
}

/**
 * Reset all filters to defaults
 */
function resetFilters() {
  state.verbosity = 'NORMAL';
  state.critsOnly = false;
  state.damageOnly = false;
  state.phaseEvents = true;
  state.customFilter = null;
}

/**
 * Check if a message should be shown based on current filters
 * @param {Object} msg - Message object with { text, level, type }
 *   - level: 'narrative' | 'normal' | 'detailed' | 'debug'
 *   - type: 'attack' | 'damage' | 'crit' | 'phase' | 'info' | etc.
 * @returns {boolean} True if message should be shown
 */
function shouldShow(msg) {
  // Check verbosity level
  const msgLevel = VERBOSITY_LEVELS[msg.level?.toUpperCase()] || 2;
  const currentLevel = VERBOSITY_LEVELS[state.verbosity];
  if (msgLevel > currentLevel) {
    return false;
  }

  // Check crits-only filter
  if (state.critsOnly && msg.type !== 'crit') {
    return false;
  }

  // Check damage-only filter
  if (state.damageOnly && !['damage', 'crit'].includes(msg.type)) {
    return false;
  }

  // Check phase events filter
  if (!state.phaseEvents && msg.type === 'phase') {
    return false;
  }

  // Check custom filter
  if (state.customFilter) {
    try {
      const regex = new RegExp(state.customFilter, 'i');
      if (!regex.test(msg.text)) {
        return false;
      }
    } catch {
      // Invalid regex, ignore filter
    }
  }

  return true;
}

/**
 * Get current filter state summary for display
 * @returns {string} Human-readable filter status
 */
function getFilterStatus() {
  const parts = [];

  parts.push(`V:${state.verbosity.charAt(0)}`);

  if (state.critsOnly) parts.push('CRITS');
  if (state.damageOnly) parts.push('DMG');
  if (!state.phaseEvents) parts.push('-phase');
  if (state.customFilter) parts.push(`/${state.customFilter}/`);

  return parts.join(' ');
}

/**
 * Get help text for filter hotkeys
 * @returns {string[]} Array of help lines
 */
function getFilterHelp() {
  return [
    'Filter Hotkeys:',
    '  v - Verbosity: ' + ['NARRATIVE', 'NORMAL', 'DETAILED', 'DEBUG'].join(' → '),
    '  c - Crits only (toggle)',
    '  d - Damage only (toggle)',
    '  p - Phase events (toggle)',
    '  a - Show all (reset)',
    '  / - Custom regex filter',
    '',
    `Current: ${getFilterStatus()}`
  ];
}

/**
 * Handle filter hotkey
 * @param {string} key - Pressed key
 * @returns {{ handled: boolean, message?: string }} Result
 */
function handleHotkey(key) {
  switch (key.toLowerCase()) {
    case 'v':
      return { handled: true, message: `Verbosity: ${cycleVerbosity()}` };

    case 'c':
      return { handled: true, message: `Crits Only: ${toggleCritsOnly() ? 'ON' : 'OFF'}` };

    case 'd':
      return { handled: true, message: `Damage Only: ${toggleDamageOnly() ? 'ON' : 'OFF'}` };

    case 'p':
      return { handled: true, message: `Phase Events: ${togglePhaseEvents() ? 'ON' : 'OFF'}` };

    case 'a':
      resetFilters();
      return { handled: true, message: 'Filters reset to defaults' };

    default:
      return { handled: false };
  }
}

/**
 * Tag a message with level and type for filtering
 * @param {string} text - Message text
 * @param {Object} opts - { level, type }
 * @returns {Object} Tagged message
 */
function tagMessage(text, opts = {}) {
  return {
    text,
    level: opts.level || 'normal',
    type: opts.type || 'info',
    timestamp: Date.now()
  };
}

// Export
module.exports = {
  // State management
  cycleVerbosity,
  toggleCritsOnly,
  toggleDamageOnly,
  togglePhaseEvents,
  setCustomFilter,
  resetFilters,

  // Filtering
  shouldShow,
  getFilterStatus,
  getFilterHelp,
  handleHotkey,
  tagMessage,

  // Direct state access (for testing)
  getState: () => ({ ...state }),
  setState: (newState) => Object.assign(state, newState)
};
