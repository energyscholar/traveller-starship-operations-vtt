/**
 * ANSI utilities for TUI session handling
 * Provides sanitization of user input to prevent escape sequence injection
 */

/**
 * Strip ANSI escape sequences from user input
 * Prevents terminal escape injection attacks
 * @param {string} str - Input string to sanitize
 * @returns {string} - Sanitized string with escape sequences removed
 */
function sanitizeUserString(str) {
  if (typeof str !== 'string') {
    return '';
  }

  // Remove ANSI escape sequences: ESC[ followed by parameters and command
  // Also remove raw ESC characters
  return str
    // Remove CSI sequences (ESC[...m, ESC[...H, etc)
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    // Remove OSC sequences (ESC]...BEL or ESC]...ESC\)
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    // Remove raw ESC characters
    .replace(/\x1b/g, '')
    // Remove other control characters except newline/tab
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

module.exports = {
  sanitizeUserString
};
