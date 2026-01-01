/**
 * Turn Notification Logic (Headless)
 *
 * Provides turn notification state checks and action handling.
 * Display layer agnostic - works with TUI and WebGUI adapters.
 *
 * @module lib/combat/turn-notification
 */

// Role action definitions (from ROLE-API.md)
const ROLE_ACTIONS = {
  captain: [
    { id: 'continue', label: 'Continue engagement', isDefault: true },
    { id: 'focus_fire', label: 'Focus fire on target', isDefault: false },
    { id: 'disengage', label: 'Disengage/retreat', isDefault: false },
    { id: 'hail', label: 'Hail enemy', isDefault: false }
  ],
  pilot: [
    { id: 'maintain', label: 'Maintain range', isDefault: true },
    { id: 'close', label: 'Close range', isDefault: false },
    { id: 'open', label: 'Open range', isDefault: false },
    { id: 'evasive', label: 'Evasive maneuvers', isDefault: false }
  ],
  gunner: [
    { id: 'fire_primary', label: 'Fire primary weapon', isDefault: true },
    { id: 'fire_alt', label: 'Fire secondary weapon', isDefault: false },
    { id: 'sandcaster', label: 'Activate sandcaster', isDefault: false },
    { id: 'hold', label: 'Hold fire', isDefault: false }
  ],
  engineer: [
    { id: 'monitor', label: 'Monitor systems', isDefault: true },
    { id: 'boost_thrust', label: 'Boost thrust (+1)', isDefault: false },
    { id: 'emergency_power', label: 'Emergency power', isDefault: false },
    { id: 'assist_dc', label: 'Damage control assist', isDefault: false }
  ],
  sensors: [
    { id: 'passive', label: 'Passive scan', isDefault: true },
    { id: 'active_scan', label: 'Active scan target', isDefault: false },
    { id: 'ew', label: 'Electronic warfare', isDefault: false },
    { id: 'analyze', label: 'Identify weak points', isDefault: false }
  ],
  damage_control: [
    { id: 'standby', label: 'Standby', isDefault: true },
    { id: 'repair', label: 'Repair system', isDefault: false },
    { id: 'seal', label: 'Seal hull breach', isDefault: false },
    { id: 'redistribute', label: 'Redistribute power', isDefault: false }
  ]
};

// Phase to role mapping
const PHASE_ROLES = {
  initiative: ['sensors'],
  manoeuvre: ['pilot'],
  attack: ['gunner', 'sensors'],
  reaction: ['gunner'],
  actions: ['captain', 'engineer'],
  damage: ['damage_control']
};

// Called shot targets with penalties (from combat-engine.js)
const CALLED_SHOT_TARGETS = [
  { id: 'mDrive', label: 'M-Drive', penalty: -2, tactical: 'Stop pursuit/escape' },
  { id: 'jDrive', label: 'Jump Drive', penalty: -4, tactical: 'Prevent jump escape' },
  { id: 'powerPlant', label: 'Power Plant', penalty: -4, tactical: 'Cripple ship' },
  { id: 'sensors', label: 'Sensors', penalty: -2, tactical: 'Blind the enemy' },
  { id: 'weapon', label: 'Weapon', penalty: -2, tactical: 'Disarm turret' },
  { id: 'computer', label: 'Computer', penalty: -3, tactical: 'Disable fire control' },
  { id: 'fuel', label: 'Fuel Tanks', penalty: -2, tactical: 'Strand the ship' }
];

/**
 * Get called shot penalty for a target system
 * @param {string} targetSystem - System ID (e.g., 'jDrive')
 * @returns {number} Penalty (negative number)
 */
function getCalledShotPenalty(targetSystem) {
  if (!targetSystem) return 0;
  const target = CALLED_SHOT_TARGETS.find(t => t.id === targetSystem);
  return target ? target.penalty : -2;
}

/**
 * Get menu items for called shot target selection
 * @param {Object} defenderSystems - Defender's systems state (to grey out disabled)
 * @returns {Array} Array of target options
 */
function getCalledShotMenuItems(defenderSystems) {
  return CALLED_SHOT_TARGETS.map((target, index) => {
    const systemState = defenderSystems?.[target.id];
    const disabled = systemState?.disabled || systemState?.hp <= 0;
    return {
      number: index + 1,
      id: target.id,
      label: `${target.label} (${target.penalty})`,
      penalty: target.penalty,
      tactical: target.tactical,
      available: !disabled,
      disabled: disabled
    };
  });
}

/**
 * Check if warning should be shown for player
 * Warning triggers at PHASE START if player will act this phase
 *
 * @param {Object} state - Combat state
 * @param {string} playerId - Player ID to check
 * @returns {boolean} True if warning should display
 */
function shouldShowWarning(state, playerId) {
  if (!state || !playerId) return false;

  // Get roles acting in current phase
  const rolesThisPhase = PHASE_ROLES[state.phase] || [];
  if (rolesThisPhase.length === 0) return false;

  // Check if player has any role acting this phase
  const playerShip = state.ships?.[playerId] || state.player;
  if (!playerShip) return false;

  // Check if any player crew member has a role in this phase
  const crew = playerShip.crew || [];
  for (const member of crew) {
    const role = member.role?.toLowerCase().replace(' ', '_');
    if (rolesThisPhase.includes(role)) {
      // Player will act this phase, but is not currently active
      if (state.currentActor !== playerId) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if turn modal should be shown for player
 * Modal triggers when player is the CURRENT ACTOR
 *
 * @param {Object} state - Combat state
 * @param {string} playerId - Player ID to check
 * @returns {boolean} True if modal should display
 */
function shouldShowTurnModal(state, playerId) {
  if (!state || !playerId) return false;

  // Player is currently active
  return state.currentActor === playerId;
}

/**
 * Get the default action for a role
 *
 * @param {string} role - Role name (e.g., 'gunner', 'pilot')
 * @param {Object} state - Combat state (for context)
 * @returns {Object|null} Default action or null if role not found
 */
function getDefaultAction(role, state) {
  const normalizedRole = role?.toLowerCase().replace(' ', '_');
  const actions = ROLE_ACTIONS[normalizedRole];
  if (!actions) return null;

  return actions.find(a => a.isDefault) || actions[0];
}

/**
 * Format weapon name for display (pulse_laser -> Pulse Laser)
 */
function formatWeaponName(weapon) {
  if (!weapon) return 'Unknown';
  return weapon.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Get menu items for a role's actions
 *
 * @param {string} role - Role name
 * @param {Object} state - Combat state (for availability checks)
 * @param {Object} ship - Ship object with turrets/weapons
 * @returns {Array} Array of action objects with availability
 */
function getRoleMenuItems(role, state, ship) {
  const normalizedRole = role?.toLowerCase().replace(' ', '_');

  // For gunner, build dynamic weapon menu from ship's turrets
  if (normalizedRole === 'gunner' && ship?.turrets?.length > 0) {
    const actions = [];
    const turret = ship.turrets[0]; // Primary turret

    // Add each weapon as a fire option
    if (turret.weapons) {
      turret.weapons.forEach((weapon, idx) => {
        if (weapon !== 'sandcaster') {
          actions.push({
            id: `fire_${weapon}`,
            label: `Fire ${formatWeaponName(weapon)}`,
            weapon: weapon,
            isDefault: idx === 0,
            available: !turret.disabled
          });
        }
      });
    }

    // Add sandcaster if present
    if (turret.weapons?.includes('sandcaster')) {
      actions.push({
        id: 'sandcaster',
        label: 'Activate Sandcaster',
        weapon: 'sandcaster',
        isDefault: false,
        available: (ship.sandcasters || 0) > 0
      });
    }

    // Add called shot option (opens target submenu)
    actions.push({
      id: 'called_shot',
      label: 'Called Shot...',
      isDefault: false,
      available: true,
      submenu: true
    });

    // Add hold fire option
    actions.push({
      id: 'hold',
      label: 'Hold fire',
      isDefault: false,
      available: true
    });

    return actions.map((action, index) => ({
      ...action,
      number: index + 1
    }));
  }

  // Default behavior for other roles
  const actions = ROLE_ACTIONS[normalizedRole];
  if (!actions) return [];

  return actions.map((action, index) => ({
    ...action,
    number: index + 1,
    available: true
  }));
}

/**
 * Execute a selected action
 *
 * @param {Object} action - Action object to execute
 * @param {Object} state - Combat state to modify
 * @returns {Object} Result with { success, message, stateChanges }
 */
function executeAction(action, state) {
  if (!action || !state) {
    return { success: false, message: 'Invalid action or state' };
  }

  // Action execution is role/action specific
  // This is a stub - full implementation depends on game rules
  const result = {
    success: true,
    message: `Executed: ${action.label}`,
    stateChanges: {}
  };

  // Handle common actions
  switch (action.id) {
    case 'hold':
    case 'standby':
    case 'monitor':
    case 'passive':
    case 'continue':
    case 'maintain':
      // No-op actions
      result.message = `${action.label} - standing by`;
      break;

    case 'evasive':
      result.stateChanges.evasive = true;
      result.message = 'Evasive maneuvers engaged! +2 to be hit';
      break;

    case 'disengage':
      result.stateChanges.retreating = true;
      result.message = 'Disengaging - defensive posture';
      break;

    default:
      // Other actions need full implementation
      result.message = `Action ${action.id} executed`;
  }

  return result;
}

/**
 * Get the active role for current phase
 *
 * @param {string} phase - Current phase
 * @param {Object} ship - Ship object with crew
 * @returns {Object|null} { role, crewMember } or null
 */
function getActiveRole(phase, ship) {
  const rolesThisPhase = PHASE_ROLES[phase] || [];
  if (!rolesThisPhase.length || !ship?.crew) return null;

  for (const member of ship.crew) {
    const role = member.role?.toLowerCase().replace(' ', '_');
    if (rolesThisPhase.includes(role)) {
      return { role, crewMember: member };
    }
  }

  return null;
}

module.exports = {
  ROLE_ACTIONS,
  PHASE_ROLES,
  CALLED_SHOT_TARGETS,
  shouldShowWarning,
  shouldShowTurnModal,
  getDefaultAction,
  getRoleMenuItems,
  executeAction,
  getActiveRole,
  getCalledShotPenalty,
  getCalledShotMenuItems
};
