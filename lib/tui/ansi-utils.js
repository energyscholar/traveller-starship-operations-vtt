/**
 * ANSI utilities for TUI session handling
 * Shared color constants, escape helpers, and string utilities
 */

// Base escape
const ESC = '\x1b';

// All ANSI constants in one object
const ANSI = {
  RESET: `${ESC}[0m`,
  BOLD: `${ESC}[1m`,
  DIM: `${ESC}[2m`,
  UNDERLINE: `${ESC}[4m`,

  // Colors
  BLACK: `${ESC}[30m`,
  RED: `${ESC}[31m`,
  GREEN: `${ESC}[32m`,
  YELLOW: `${ESC}[33m`,
  BLUE: `${ESC}[34m`,
  MAGENTA: `${ESC}[35m`,
  CYAN: `${ESC}[36m`,
  WHITE: `${ESC}[37m`,

  // Bright colors
  BRIGHT_RED: `${ESC}[91m`,
  BRIGHT_GREEN: `${ESC}[92m`,
  BRIGHT_YELLOW: `${ESC}[93m`,
  BRIGHT_BLUE: `${ESC}[94m`,
  BRIGHT_CYAN: `${ESC}[96m`,

  // Background
  BG_RED: `${ESC}[41m`,
  BG_GREEN: `${ESC}[42m`,
  BG_YELLOW: `${ESC}[43m`,

  // Cursor/screen
  CLEAR: `${ESC}[2J`,
  HOME: `${ESC}[H`
};

/**
 * Strip ANSI escape sequences for length calculation
 * @param {string} str - String with ANSI codes
 * @returns {string} Plain text
 */
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Pad line to width accounting for ANSI codes
 * @param {string} line - Line possibly containing ANSI codes
 * @param {number} width - Target width
 * @returns {string} Padded line
 */
function padLine(line, width = 64) {
  const stripped = stripAnsi(line);
  return line + ' '.repeat(Math.max(0, width - stripped.length));
}

/**
 * Strip ANSI escape sequences from user input
 * Prevents terminal escape injection attacks
 * @param {string} str - Input string to sanitize
 * @returns {string} Sanitized string with escape sequences removed
 */
function sanitizeUserString(str) {
  if (typeof str !== 'string') {
    return '';
  }

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
  ESC,
  ANSI,
  stripAnsi,
  padLine,
  sanitizeUserString
};
