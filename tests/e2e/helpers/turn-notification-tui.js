/**
 * TUI Turn Notification Display Adapter
 *
 * ASCII art overlays and modal dialogs for the TUI combat demo.
 * Uses the headless logic from lib/combat/turn-notification.js
 *
 * @module tests/e2e/helpers/turn-notification-tui
 */

// ANSI escape codes
const ESC = '\x1b';
const CLEAR = `${ESC}[2J`;
const HOME = `${ESC}[H`;
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const WHITE = `${ESC}[37m`;
const RED = `${ESC}[31m`;
const MAGENTA = `${ESC}[35m`;

// ============================================================
// SCREEN POSITIONING SYSTEM
// ============================================================

/**
 * Move cursor to specific row, col position (1-based)
 * @param {number} row - Row (1-based, top is 1)
 * @param {number} col - Column (1-based, left is 1)
 * @returns {string} ANSI escape sequence
 */
function moveTo(row, col) {
  return `${ESC}[${row};${col}H`;
}

/**
 * Move cursor up n rows
 */
function moveUp(n = 1) {
  return `${ESC}[${n}A`;
}

/**
 * Move cursor down n rows
 */
function moveDown(n = 1) {
  return `${ESC}[${n}B`;
}

/**
 * Move cursor right n columns
 */
function moveRight(n = 1) {
  return `${ESC}[${n}C`;
}

/**
 * Move cursor left n columns
 */
function moveLeft(n = 1) {
  return `${ESC}[${n}D`;
}

/**
 * Save cursor position
 */
function saveCursor() {
  return `${ESC}[s`;
}

/**
 * Restore cursor position
 */
function restoreCursor() {
  return `${ESC}[u`;
}

/**
 * Hide cursor
 */
function hideCursor() {
  return `${ESC}[?25l`;
}

/**
 * Show cursor
 */
function showCursor() {
  return `${ESC}[?25h`;
}

/**
 * Render a string at a specific position
 * @param {number} row - Row position (1-based)
 * @param {number} col - Column position (1-based)
 * @param {string} text - Text to render (may include ANSI codes)
 * @returns {string} Positioned text
 */
function renderAt(row, col, text) {
  return moveTo(row, col) + text;
}

/**
 * Render multiple lines starting at a position
 * @param {number} startRow - Starting row (1-based)
 * @param {number} col - Column position (1-based)
 * @param {Array} lines - Array of strings to render
 * @returns {string} All positioned lines
 */
function renderLines(startRow, col, lines) {
  return lines.map((line, i) => renderAt(startRow + i, col, line)).join('');
}

/**
 * Clear a rectangular region of the screen
 * @param {number} row - Top row
 * @param {number} col - Left column
 * @param {number} width - Width in characters
 * @param {number} height - Height in rows
 * @returns {string} Clear sequence
 */
function clearRegion(row, col, width, height) {
  const clearLine = ' '.repeat(width);
  const lines = [];
  for (let i = 0; i < height; i++) {
    lines.push(renderAt(row + i, col, clearLine));
  }
  return lines.join('');
}

/**
 * Calculate visible length of string (strips ANSI codes)
 * @param {string} s - String with possible ANSI codes
 * @returns {number} Visible character count
 */
function visLen(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

/**
 * Pad string to exact visible width
 * @param {string} s - String to pad
 * @param {number} width - Target visible width
 * @param {string} char - Padding character (default space)
 * @returns {string} Padded string
 */
function padTo(s, width, char = ' ') {
  const visible = visLen(s);
  if (visible >= width) return s;
  return s + char.repeat(width - visible);
}

// ASCII art for "YOUR" (used in warning overlay)
const ASCII_YOUR = [
  '██╗   ██╗ ██████╗ ██╗   ██╗██████╗ ',
  '╚██╗ ██╔╝██╔═══██╗██║   ██║██╔══██╗',
  ' ╚████╔╝ ██║   ██║██║   ██║██████╔╝',
  '  ╚██╔╝  ██║   ██║██║   ██║██╔══██╗',
  '   ██║   ╚██████╔╝╚██████╔╝██║  ██║',
  '   ╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═╝'
];

// ASCII art for "GO!" (used in active overlay)
const ASCII_GO = [
  ' ██████╗  ██████╗ ██╗',
  '██╔════╝ ██╔═══██╗██║',
  '██║  ███╗██║   ██║██║',
  '██║   ██║██║   ██║╚═╝',
  '╚██████╔╝╚██████╔╝██╗',
  ' ╚═════╝  ╚═════╝ ╚═╝'
];

// Box drawing characters
const BOX = {
  tl: '╔', tr: '╗', bl: '╚', br: '╝',
  h: '═', v: '║',
  ml: '╠', mr: '╣'
};

/**
 * Render full-screen warning overlay (YELLOW)
 * Shows "YOUR TURN COMING UP"
 *
 * @param {string} playerName - Name of the player
 * @param {string} role - Role that will act
 * @param {number} width - Terminal width (default 70)
 * @returns {string} Full overlay string
 */
function renderWarningOverlay(playerName, role, width = 70) {
  const lines = [];
  const innerWidth = width - 2;

  // Top border
  lines.push(YELLOW + BOLD + BOX.tl + BOX.h.repeat(innerWidth) + BOX.tr + RESET);

  // Empty line
  lines.push(YELLOW + BOLD + BOX.v + RESET + ' '.repeat(innerWidth) + YELLOW + BOLD + BOX.v + RESET);

  // ASCII art
  for (const artLine of ASCII_YOUR) {
    const pad = Math.max(0, Math.floor((innerWidth - artLine.length) / 2));
    const content = ' '.repeat(pad) + artLine + ' '.repeat(innerWidth - pad - artLine.length);
    lines.push(YELLOW + BOLD + BOX.v + WHITE + content + YELLOW + BOLD + BOX.v + RESET);
  }

  // Empty line
  lines.push(YELLOW + BOLD + BOX.v + RESET + ' '.repeat(innerWidth) + YELLOW + BOLD + BOX.v + RESET);

  // Message line
  const msg = `TURN COMING UP - ${playerName.toUpperCase()} (${role.toUpperCase()})`;
  const msgPad = Math.max(0, Math.floor((innerWidth - msg.length) / 2));
  const msgContent = ' '.repeat(msgPad) + msg + ' '.repeat(innerWidth - msgPad - msg.length);
  lines.push(YELLOW + BOLD + BOX.v + WHITE + BOLD + msgContent + YELLOW + BOLD + BOX.v + RESET);

  // Empty line
  lines.push(YELLOW + BOLD + BOX.v + RESET + ' '.repeat(innerWidth) + YELLOW + BOLD + BOX.v + RESET);

  // Bottom border
  lines.push(YELLOW + BOLD + BOX.bl + BOX.h.repeat(innerWidth) + BOX.br + RESET);

  return CLEAR + HOME + lines.join('\n');
}

/**
 * Render full-screen active overlay (GREEN)
 * Shows "GO! YOUR TURN NOW"
 *
 * @param {string} playerName - Name of the player
 * @param {string} role - Role that is acting
 * @param {number} width - Terminal width (default 70)
 * @returns {string} Full overlay string
 */
function renderActiveOverlay(playerName, role, width = 70) {
  const lines = [];
  const innerWidth = width - 2;

  // Top border
  lines.push(GREEN + BOLD + BOX.tl + BOX.h.repeat(innerWidth) + BOX.tr + RESET);

  // Empty line
  lines.push(GREEN + BOLD + BOX.v + RESET + ' '.repeat(innerWidth) + GREEN + BOLD + BOX.v + RESET);

  // ASCII art
  for (const artLine of ASCII_GO) {
    const pad = Math.max(0, Math.floor((innerWidth - artLine.length) / 2));
    const content = ' '.repeat(pad) + artLine + ' '.repeat(innerWidth - pad - artLine.length);
    lines.push(GREEN + BOLD + BOX.v + WHITE + content + GREEN + BOLD + BOX.v + RESET);
  }

  // Empty line
  lines.push(GREEN + BOLD + BOX.v + RESET + ' '.repeat(innerWidth) + GREEN + BOLD + BOX.v + RESET);

  // Message line
  const msg = `YOUR TURN - ${playerName.toUpperCase()} (${role.toUpperCase()})`;
  const msgPad = Math.max(0, Math.floor((innerWidth - msg.length) / 2));
  const msgContent = ' '.repeat(msgPad) + msg + ' '.repeat(innerWidth - msgPad - msg.length);
  lines.push(GREEN + BOLD + BOX.v + WHITE + BOLD + msgContent + GREEN + BOLD + BOX.v + RESET);

  // Empty line
  lines.push(GREEN + BOLD + BOX.v + RESET + ' '.repeat(innerWidth) + GREEN + BOLD + BOX.v + RESET);

  // Bottom border
  lines.push(GREEN + BOLD + BOX.bl + BOX.h.repeat(innerWidth) + BOX.br + RESET);

  return CLEAR + HOME + lines.join('\n');
}

/**
 * Render action modal dialog
 *
 * @param {string} playerName - Player name
 * @param {string} role - Role
 * @param {string} shipName - Ship name
 * @param {Array} menuItems - Array of action objects
 * @param {number} defaultIdx - Index of default action (0-based)
 * @param {number} width - Modal width (default 50)
 * @returns {string} Modal string (does not clear screen)
 */
function renderActionModal(playerName, role, shipName, menuItems, defaultIdx = 0, width = 50) {
  const lines = [];
  const innerWidth = width - 4;  // Account for border + padding

  // Header
  const header = `YOUR TURN: ${playerName} • ${role.toUpperCase()} • ${shipName}`;
  const headerTrunc = header.slice(0, innerWidth);
  const headerPad = innerWidth - headerTrunc.length;

  lines.push(CYAN + BOLD + BOX.tl + BOX.h.repeat(width - 2) + BOX.tr + RESET);
  lines.push(CYAN + BOLD + BOX.v + RESET + ' ' + WHITE + BOLD + headerTrunc + RESET + ' '.repeat(headerPad) + ' ' + CYAN + BOLD + BOX.v + RESET);
  lines.push(CYAN + BOLD + BOX.ml + BOX.h.repeat(width - 2) + BOX.mr + RESET);

  // Empty line
  lines.push(CYAN + BOX.v + RESET + ' '.repeat(width - 2) + CYAN + BOX.v + RESET);

  // Menu items
  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const num = i + 1;
    const marker = item.isDefault ? '[*]' : '   ';
    const label = item.label.slice(0, innerWidth - 8);
    const itemPad = innerWidth - label.length - 5;  // 5 = "1. " + marker spacing

    const color = item.available !== false ? WHITE : DIM;
    const line = `  ${num}. ${label}${' '.repeat(Math.max(0, itemPad))}${marker}  `;

    lines.push(CYAN + BOX.v + RESET + color + line.slice(0, width - 2) + RESET + CYAN + BOX.v + RESET);
  }

  // Empty line
  lines.push(CYAN + BOX.v + RESET + ' '.repeat(width - 2) + CYAN + BOX.v + RESET);

  // Footer with controls
  lines.push(CYAN + BOLD + BOX.ml + BOX.h.repeat(width - 2) + BOX.mr + RESET);

  const defaultLabel = menuItems[defaultIdx]?.label || 'Default action';
  const enterLine = `  ENTER = ${defaultLabel.slice(0, 30)} (default)`;
  const escLine = '  ESC = Skip turn';

  lines.push(CYAN + BOX.v + RESET + DIM + enterLine.padEnd(width - 2) + RESET + CYAN + BOX.v + RESET);
  lines.push(CYAN + BOX.v + RESET + DIM + escLine.padEnd(width - 2) + RESET + CYAN + BOX.v + RESET);
  lines.push(CYAN + BOLD + BOX.bl + BOX.h.repeat(width - 2) + BOX.br + RESET);

  return lines.join('\n');
}

/**
 * Handle modal input and return selected action
 *
 * @param {string} key - Key pressed
 * @param {Array} menuItems - Available menu items
 * @returns {Object|null} { action, skip } or null if key not recognized
 */
function handleModalInput(key, menuItems) {
  // ESC = skip turn
  if (key === '\x1b' || key === '\u001b') {
    return { action: null, skip: true };
  }

  // ENTER = default action
  if (key === '\r' || key === '\n') {
    const defaultAction = menuItems.find(m => m.isDefault) || menuItems[0];
    return { action: defaultAction, skip: false };
  }

  // Number keys 1-4 select menu items
  const num = parseInt(key, 10);
  if (num >= 1 && num <= menuItems.length) {
    const action = menuItems[num - 1];
    if (action.available !== false) {
      return { action, skip: false };
    }
  }

  return null;  // Key not recognized
}

/**
 * Center a modal on screen (returns positioned output)
 *
 * @param {string} modal - Modal string
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 * @param {number} modalWidth - Modal width
 * @returns {string} Positioned modal
 */
function centerModal(modal, screenWidth, screenHeight, modalWidth) {
  const modalLines = modal.split('\n');
  const leftPad = Math.max(0, Math.floor((screenWidth - modalWidth) / 2));
  const topPad = Math.max(0, Math.floor((screenHeight - modalLines.length) / 2));

  const positionedLines = [];

  // Move cursor to top position
  positionedLines.push(`${ESC}[${topPad};1H`);

  // Add each line with left padding
  for (const line of modalLines) {
    positionedLines.push(' '.repeat(leftPad) + line);
  }

  return positionedLines.join('\n');
}

module.exports = {
  // Overlay renderers
  renderWarningOverlay,
  renderActiveOverlay,
  renderActionModal,
  handleModalInput,
  centerModal,

  // Screen positioning
  moveTo,
  moveUp,
  moveDown,
  moveRight,
  moveLeft,
  saveCursor,
  restoreCursor,
  hideCursor,
  showCursor,
  renderAt,
  renderLines,
  clearRegion,

  // String helpers
  visLen,
  padTo,

  // Constants
  ASCII_YOUR,
  ASCII_GO,
  BOX,

  // ANSI codes (for external use)
  ANSI: { ESC, CLEAR, HOME, BOLD, DIM, RESET, GREEN, YELLOW, CYAN, WHITE, RED, MAGENTA }
};
