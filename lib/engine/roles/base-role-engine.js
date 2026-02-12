/**
 * Base Role Engine - Shared action execution pattern for all crew roles
 *
 * Provides:
 * - Action definition and execution
 * - Skill check resolution
 * - Event emission for TUI/GUI rendering
 *
 * Each role engine extends this with role-specific actions.
 *
 * @module lib/engine/roles/base-role-engine
 */

const { EventBus } = require('../event-bus');
const { roll1d6, roll2d6Sum: roll2d6 } = require('../../dice');

class BaseRoleEngine {
  /**
   * Create a role engine
   * @param {string} role - Role identifier (captain, pilot, gunner, etc.)
   * @param {Object} ship - Ship state object
   * @param {Object} options
   * @param {EventBus} options.eventBus - Shared event bus (creates new if not provided)
   * @param {Object} options.combat - Combat state reference (for phase/range access)
   * @param {Object} options.rng - RNG functions for testing { roll1d6, roll2d6 }
   */
  constructor(role, ship, options = {}) {
    this.role = role;
    this.ship = ship;
    this.eventBus = options.eventBus || new EventBus();
    this.combat = options.combat || null;
    this.rng = options.rng || { roll1d6, roll2d6 };

    // Subclasses define actions in defineActions()
    this.actions = this.defineActions();
  }

  /**
   * Override in subclass to define role-specific actions
   * @returns {Object} Map of actionId -> action definition
   */
  defineActions() {
    return {
      skip: {
        label: 'Skip',
        description: 'Take no action this phase',
        isDefault: false,
        execute: () => ({ success: true, skipped: true })
      }
    };
  }

  /**
   * Execute an action by ID
   * @param {string} actionId - Action identifier
   * @param {Object} params - Action parameters
   * @returns {Object} Result with success flag
   */
  execute(actionId, params = {}) {
    const action = this.actions[actionId];

    if (!action) {
      return { success: false, error: `Unknown action: ${actionId}` };
    }

    // Check prerequisites
    if (action.canExecute && !action.canExecute(params)) {
      return {
        success: false,
        error: action.disabledReason || 'Action not available'
      };
    }

    // Execute the action
    const result = action.execute(params);

    // Emit event
    this.eventBus.publish(`${this.role}:${actionId}`, {
      role: this.role,
      action: actionId,
      ship: this.ship,
      params,
      result
    });

    return result;
  }

  /**
   * Get list of currently available actions
   * @returns {Array} Actions that can be executed
   */
  getAvailableActions() {
    return Object.entries(this.actions)
      .filter(([id, action]) => !action.canExecute || action.canExecute())
      .map(([id, action]) => ({
        id,
        label: action.label,
        description: action.description,
        isDefault: action.isDefault || false
      }));
  }

  /**
   * Get all defined actions (including unavailable)
   * @returns {Array} All actions with availability status
   */
  getAllActions() {
    return Object.entries(this.actions).map(([id, action]) => ({
      id,
      label: action.label,
      description: action.description,
      isDefault: action.isDefault || false,
      available: !action.canExecute || action.canExecute(),
      disabledReason: action.canExecute && !action.canExecute()
        ? action.disabledReason
        : null
    }));
  }

  /**
   * Get the default action for this role
   * @returns {Object|null} Default action or null
   */
  getDefaultAction() {
    const defaults = this.getAvailableActions().filter(a => a.isDefault);
    return defaults[0] || null;
  }

  /**
   * Perform a skill check
   * @param {string} skill - Skill name (pilot, gunnery, engineer, etc.)
   * @param {number} difficulty - Target number (default 8)
   * @param {Array} modifiers - Array of { name, value } modifiers
   * @returns {Object} Skill check result
   */
  performSkillCheck(skill, difficulty = 8, modifiers = []) {
    const roll = this.rng.roll2d6();
    const skillLevel = this.getSkillLevel(skill);
    const totalDM = modifiers.reduce((sum, m) => sum + (m.value || 0), 0);
    const total = roll + skillLevel + totalDM;
    const success = total >= difficulty;
    const effect = total - difficulty;

    return {
      success,
      roll,
      skillLevel,
      modifiers,
      totalDM,
      total,
      difficulty,
      effect
    };
  }

  /**
   * Get skill level for a given skill
   * @param {string} skill - Skill name
   * @returns {number} Skill level (0 if not found)
   */
  getSkillLevel(skill) {
    // Check crew skills on ship
    if (this.ship.crew && this.ship.crew[skill] !== undefined) {
      return this.ship.crew[skill];
    }

    // Check role-specific skill shortcuts
    const roleSkillMap = {
      captain: 'tactics',
      pilot: 'pilot',
      gunner: 'gunnery',
      engineer: 'engineer',
      sensors: 'electronics',
      damage_control: 'mechanic'
    };

    if (skill === 'primary' && roleSkillMap[this.role]) {
      return this.getSkillLevel(roleSkillMap[this.role]);
    }

    // Default to 0
    return 0;
  }

  /**
   * Subscribe to events from this engine
   * @param {string} eventType - Event type
   * @param {Function} callback - Handler
   * @returns {Function} Unsubscribe function
   */
  subscribe(eventType, callback) {
    return this.eventBus.subscribe(eventType, callback);
  }

  /**
   * Get current engine state
   * @returns {Object} State snapshot
   */
  getState() {
    return {
      role: this.role,
      shipId: this.ship?.id,
      shipName: this.ship?.name,
      availableActions: this.getAvailableActions(),
      phase: this.combat?.phase || null,
      round: this.combat?.round || null
    };
  }
}

module.exports = { BaseRoleEngine, roll1d6, roll2d6 };
