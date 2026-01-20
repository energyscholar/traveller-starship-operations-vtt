/**
 * Combat Display Helpers for TUI
 * Provides combat state access and banner formatting for role menus
 */

const { campaignCombatState } = require('../socket-handlers/ops/context');

// ANSI escape codes
const ESC = '\x1b';
const BOLD = `${ESC}[1m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;
const RED = `${ESC}[31m`;
const YELLOW = `${ESC}[33m`;
const CYAN = `${ESC}[36m`;
const WHITE = `${ESC}[37m`;
const MAGENTA = `${ESC}[35m`;

// Phase display names
const PHASE_NAMES = {
  manoeuvre: 'MANOEUVRE',
  attack: 'ATTACK',
  actions: 'ACTIONS',
  damage: 'DAMAGE'
};

// Role-to-phase mapping for "YOUR TURN" highlighting
const ROLE_PHASES = {
  pilot: ['manoeuvre'],
  gunner: ['attack'],
  sensors: ['actions'],
  engineer: ['actions'],
  'damage-control': ['actions', 'damage'],
  captain: ['manoeuvre', 'attack', 'actions', 'damage'] // Captain can act anytime
};

/**
 * Get combat state for a campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Object} Combat state or default inactive state
 */
function getCombatState(campaignId) {
  if (!campaignId) return { inCombat: false };
  return campaignCombatState.get(campaignId) || { inCombat: false };
}

/**
 * Check if it's a role's turn to act
 * @param {string} role - Role ID (pilot, gunner, etc.)
 * @param {string} phase - Current combat phase
 * @returns {boolean} Whether role can act this phase
 */
function isRoleTurn(role, phase) {
  const phases = ROLE_PHASES[role] || [];
  return phases.includes(phase);
}

/**
 * Format combat banner for display
 * @param {Object} combatState - Combat state object
 * @param {string} [role] - Optional role for YOUR TURN highlighting
 * @returns {string|null} Formatted banner string or null if not in combat
 */
function formatCombatBanner(combatState, role = null) {
  if (!combatState || !combatState.inCombat) return null;

  const round = combatState.round || 1;
  const phase = combatState.phase || 'manoeuvre';
  const phaseName = PHASE_NAMES[phase] || phase.toUpperCase();

  // Check if it's this role's turn
  const yourTurn = role && isRoleTurn(role, phase);
  const turnIndicator = yourTurn ? `${YELLOW}${BOLD} ◄ YOUR TURN${RESET}` : '';

  const line1 = `${RED}${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}`;
  const contentText = `  ⚔️  COMBAT ACTIVE - Round ${round} - ${phaseName} PHASE${yourTurn ? '' : ''}`;
  const padding = 62 - contentText.length - (yourTurn ? 12 : 0);
  const line2 = `${RED}${BOLD}║${RESET}${RED}${contentText}${RESET}${turnIndicator}${' '.repeat(Math.max(0, padding))}${RED}${BOLD}║${RESET}`;
  const line3 = `${RED}${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}`;

  return `${line1}\n${line2}\n${line3}`;
}

/**
 * Get phase color for display
 * @param {string} phase - Combat phase
 * @returns {string} ANSI color code
 */
function getPhaseColor(phase) {
  switch (phase) {
    case 'manoeuvre': return CYAN;
    case 'attack': return RED;
    case 'actions': return YELLOW;
    case 'damage': return MAGENTA;
    default: return WHITE;
  }
}

module.exports = {
  getCombatState,
  formatCombatBanner,
  isRoleTurn,
  getPhaseColor,
  PHASE_NAMES,
  ROLE_PHASES
};
