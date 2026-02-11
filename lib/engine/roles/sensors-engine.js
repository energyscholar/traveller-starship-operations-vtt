/**
 * Sensors Engine - Detection and electronic warfare actions
 *
 * Handles:
 * - Active and passive scanning
 * - ECM/ECCM operations
 * - Target lock management
 *
 * @module lib/engine/roles/sensors-engine
 */

const { BaseRoleEngine } = require('./base-role-engine');

class SensorsEngine extends BaseRoleEngine {
  /**
   * Create sensors engine
   * @param {Object} ship - Ship state with sensors
   * @param {Object} options
   * @param {Object} options.combat - Combat state with contacts
   * @param {Object} options.eventBus - Shared event bus
   * @param {Object} options.rng - RNG for testing
   */
  constructor(ship, options = {}) {
    super('sensors', ship, options);
  }

  defineActions() {
    const base = super.defineActions();

    return {
      ...base,

      active_scan: {
        label: 'Active scan',
        description: 'Full sensor sweep - reveals contacts but reveals your position',
        isDefault: true,
        canExecute: () => this.canActiveScan(),
        disabledReason: this.getActiveScanDisabledReason(),
        execute: (params) => this.activeScan(params)
      },

      passive_scan: {
        label: 'Passive scan',
        description: 'Quiet listening - less effective but stealthy',
        execute: () => this.passiveScan()
      },

      ecm: {
        label: 'ECM jamming',
        description: 'Electronic countermeasures - disrupt enemy sensors/missiles',
        canExecute: () => this.canECM(),
        disabledReason: 'No ECM capability',
        execute: (params) => this.ecm(params)
      },

      eccm: {
        label: 'ECCM',
        description: 'Counter-countermeasures - protect against enemy jamming',
        canExecute: () => this.canECCM(),
        disabledReason: 'No ECCM capability',
        execute: () => this.eccm()
      },

      target_lock: {
        label: 'Lock target',
        description: 'Establish targeting lock on contact (grants Boon to attacks)',
        canExecute: () => this.canLockTarget(),
        disabledReason: 'No valid targets',
        execute: (params) => this.lockTarget(params)
      },

      break_lock: {
        label: 'Break lock',
        description: 'Attempt to break enemy targeting lock on us',
        canExecute: () => this.hasEnemyLock(),
        disabledReason: 'No enemy lock to break',
        execute: () => this.breakLock()
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTION IMPLEMENTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Active sensor scan
   */
  activeScan(params = {}) {
    const { targetArea } = params;

    // Electronics skill check
    const check = this.performSkillCheck('electronics', 8);

    // Reveal our position
    this.ship.sensorEmission = 'active';

    if (!check.success) {
      return {
        success: true,
        action: 'active_scan',
        detected: [],
        check
      };
    }

    // Calculate detection based on effect
    const scanPower = check.effect + this.getSensorDM();
    const detected = this.detectContacts(scanPower, 'active');

    return {
      success: true,
      action: 'active_scan',
      detected,
      scanPower,
      check
    };
  }

  /**
   * Passive sensor scan
   */
  passiveScan() {
    // Electronics skill check at -2 (harder than active)
    const check = this.performSkillCheck('electronics', 10);

    // Don't reveal our position
    this.ship.sensorEmission = 'passive';

    if (!check.success) {
      return {
        success: true,
        action: 'passive_scan',
        detected: [],
        check
      };
    }

    // Less effective than active scan
    const scanPower = Math.max(0, check.effect + this.getSensorDM() - 2);
    const detected = this.detectContacts(scanPower, 'passive');

    return {
      success: true,
      action: 'passive_scan',
      detected,
      scanPower,
      check,
      stealthy: true
    };
  }

  /**
   * Electronic countermeasures
   */
  ecm(params = {}) {
    const { target } = params;

    const check = this.performSkillCheck('electronics', 8);

    if (!check.success) {
      return {
        success: true,
        action: 'ecm',
        jamming: false,
        check
      };
    }

    // Calculate jamming strength
    const jammingStrength = check.effect + this.getECMDM();

    // Apply jamming effect
    if (target) {
      target.jammed = true;
      target.jammingStrength = jammingStrength;
    }

    // Ship is now jamming
    this.ship.ecmActive = true;
    this.ship.jammingStrength = jammingStrength;

    return {
      success: true,
      action: 'ecm',
      jamming: true,
      jammingStrength,
      target: target?.name,
      check
    };
  }

  /**
   * Electronic counter-countermeasures
   */
  eccm() {
    const check = this.performSkillCheck('electronics', 8);

    if (!check.success) {
      return {
        success: true,
        action: 'eccm',
        protected: false,
        check
      };
    }

    // Calculate protection strength
    const protectionStrength = check.effect + this.getECCMDM();

    // Apply protection
    this.ship.eccmActive = true;
    this.ship.eccmStrength = protectionStrength;

    return {
      success: true,
      action: 'eccm',
      protected: true,
      protectionStrength,
      check
    };
  }

  /**
   * Establish target lock
   */
  lockTarget(params = {}) {
    const { target } = params;

    if (!target) {
      return { success: false, error: 'No target specified' };
    }

    const check = this.performSkillCheck('electronics', 8);

    if (!check.success) {
      return {
        success: true,
        action: 'target_lock',
        locked: false,
        target: target.name,
        check
      };
    }

    // Track locked targets
    this.ship.targetLocks = this.ship.targetLocks || [];
    if (!this.ship.targetLocks.includes(target.id)) {
      this.ship.targetLocks.push(target.id);
    }

    return {
      success: true,
      action: 'target_lock',
      locked: true,
      target: target.name,
      boon: true,
      check
    };
  }

  /**
   * Break enemy targeting lock
   */
  breakLock() {
    // Opposed check vs enemy sensors
    const check = this.performSkillCheck('electronics', 10);

    if (!check.success) {
      return {
        success: true,
        action: 'break_lock',
        broken: false,
        check
      };
    }

    // Clear enemy lock on us
    this.ship.lockedByEnemy = false;

    return {
      success: true,
      action: 'break_lock',
      broken: true,
      check
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AVAILABILITY CHECKS
  // ─────────────────────────────────────────────────────────────────────────────

  canActiveScan() {
    // Check if sensors are operational
    return !this.areSensorsDisabled();
  }

  getActiveScanDisabledReason() {
    if (this.areSensorsDisabled()) return 'Sensors are disabled';
    return null;
  }

  canECM() {
    // Check for ECM capability
    return this.ship.ecm !== undefined || this.hasSystem('ecm');
  }

  canECCM() {
    // Check for ECCM capability
    return this.ship.eccm !== undefined || this.hasSystem('eccm');
  }

  canLockTarget() {
    // Need operational sensors and valid targets
    if (this.areSensorsDisabled()) return false;

    const contacts = this.combat?.contacts || [];
    return contacts.some(c => c.hostile && !c.destroyed);
  }

  hasEnemyLock() {
    return this.ship.lockedByEnemy === true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SENSOR HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if sensors are disabled
   */
  areSensorsDisabled() {
    const systems = this.ship.systems || {};
    return systems.sensors?.disabled === true;
  }

  /**
   * Check if ship has a specific system
   */
  hasSystem(systemName) {
    const systems = this.ship.systems || {};
    return systems[systemName] !== undefined;
  }

  /**
   * Get sensor modifier
   */
  getSensorDM() {
    // Base on sensor quality
    const sensorRating = this.ship.sensors || 0;
    return Math.floor(sensorRating / 2);
  }

  /**
   * Get ECM modifier
   */
  getECMDM() {
    return this.ship.ecm || 0;
  }

  /**
   * Get ECCM modifier
   */
  getECCMDM() {
    return this.ship.eccm || 0;
  }

  /**
   * Detect contacts based on scan power
   */
  detectContacts(scanPower, mode) {
    const contacts = this.combat?.contacts || [];
    const detected = [];

    for (const contact of contacts) {
      if (contact.destroyed) continue;

      // Calculate detection difficulty based on target stealth and range
      const stealthDM = contact.stealth || 0;
      const rangeDM = this.getRangeDM(contact.range);
      const detectionThreshold = stealthDM + rangeDM;

      if (scanPower >= detectionThreshold) {
        // Full detection
        detected.push({
          id: contact.id,
          name: contact.name,
          type: contact.type,
          range: contact.range,
          bearing: contact.bearing,
          detailLevel: 'full'
        });
      } else if (scanPower >= detectionThreshold - 2) {
        // Partial detection
        detected.push({
          id: contact.id,
          name: 'Unknown Contact',
          type: 'unknown',
          range: contact.range,
          detailLevel: 'partial'
        });
      }
    }

    return detected;
  }

  /**
   * Get range modifier for detection
   */
  getRangeDM(range) {
    const rangeDMs = {
      'Adjacent': -2,
      'Close': -1,
      'Short': 0,
      'Medium': 1,
      'Long': 2,
      'Very Long': 3,
      'Distant': 4
    };
    return rangeDMs[range] || 0;
  }
}

module.exports = { SensorsEngine };
