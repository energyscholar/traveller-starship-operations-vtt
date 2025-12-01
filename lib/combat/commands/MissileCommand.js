/**
 * MissileCommand - Missile launch command
 *
 * Encapsulates a missile launch action with validation for ammo,
 * range tracking, and flight state management.
 *
 * Missiles don't hit instantly - they track toward target over rounds.
 *
 * @example
 * const cmd = new MissileCommand({
 *   combat,
 *   actor: attacker,
 *   target: defender,
 *   missileCount: 1
 * });
 *
 * @see BaseCommand for interface documentation
 * @see lib/weapons/strategies/MissileStrategy for resolution
 */

const { BaseCommand } = require('./BaseCommand');

class MissileCommand extends BaseCommand {
  /**
   * @param {Object} context - Command context
   * @param {Object} context.combat - Combat state
   * @param {Object} context.actor - Launching player
   * @param {Object} context.target - Target player
   * @param {number} [context.missileCount=1] - Number of missiles to launch
   */
  constructor(context) {
    super('missile', context);

    this.missileCount = context.missileCount ?? 1;
    this.launchedMissiles = [];
  }

  /**
   * Validate missile launch
   * @returns {Object} { valid: boolean, reason?: string }
   */
  validate() {
    // Check turn
    const turnCheck = this.validateTurn();
    if (!turnCheck.valid) return turnCheck;

    // Check not already acted
    const actedCheck = this.validateNotActed();
    if (!actedCheck.valid) return actedCheck;

    // Check target exists
    if (!this.target) {
      return { valid: false, reason: 'no_target' };
    }

    // Check ammo
    const ammoCheck = this.validateAmmo('missiles', this.missileCount);
    if (!ammoCheck.valid) return ammoCheck;

    // Check has missile launcher
    if (!this.hasMissileLauncher()) {
      return { valid: false, reason: 'no_missile_launcher' };
    }

    return { valid: true };
  }

  /**
   * Check if actor has missile launcher
   * @returns {boolean}
   */
  hasMissileLauncher() {
    // Check actor's weapons for missile capability
    const { SHIPS } = require('../../combat');
    const shipData = SHIPS[this.actor?.ship];
    if (!shipData?.weapons) return false;

    return shipData.weapons.some(w =>
      w.type === 'missile_rack' ||
      w.type === 'missile' ||
      w.name?.toLowerCase().includes('missile')
    );
  }

  /**
   * Execute the missile launch
   * @returns {Object} Launch result
   */
  execute() {
    // Capture state before changes
    this.previousState = this.captureState();

    // Deduct ammo
    if (this.actor.ammo) {
      this.actor.ammo.missiles -= this.missileCount;
    }

    // Create missile entries for tracking
    const currentRange = this.combat?.range || 'Medium';
    const rangeToDistance = {
      'Adjacent': 0,
      'Close': 1,
      'Short': 2,
      'Medium': 3,
      'Long': 4,
      'Very Long': 5,
      'Distant': 6
    };

    const distance = rangeToDistance[currentRange] ?? 3;

    for (let i = 0; i < this.missileCount; i++) {
      const missile = {
        id: `missile_${Date.now()}_${i}`,
        launcherId: this.actor.id,
        targetId: this.target.id,
        launchRound: this.combat?.round || 1,
        distanceRemaining: distance,
        intercepted: false,
        detonated: false
      };
      this.launchedMissiles.push(missile);

      // Add to combat's active missiles
      if (!this.combat.activeMissiles) {
        this.combat.activeMissiles = [];
      }
      this.combat.activeMissiles.push(missile);
    }

    // Mark turn as complete
    if (this.combat?.turnComplete) {
      this.combat.turnComplete[this.actor.id] = true;
    }

    this.executed = true;
    this.result = {
      launched: this.missileCount,
      missiles: this.launchedMissiles,
      message: `Launched ${this.missileCount} missile${this.missileCount > 1 ? 's' : ''} at ${this.target.ship || 'target'}`
    };

    return this.result;
  }

  /**
   * Capture missile-specific state
   * @returns {Object}
   */
  captureState() {
    const baseState = super.captureState();
    return {
      ...baseState,
      actorMissiles: this.actor?.ammo?.missiles ?? 0,
      activeMissileCount: this.combat?.activeMissiles?.length ?? 0
    };
  }

  /**
   * Restore missile-specific state
   * @param {Object} state
   */
  restoreState(state) {
    super.restoreState(state);

    // Restore ammo
    if (this.actor?.ammo && state.actorMissiles !== undefined) {
      this.actor.ammo.missiles = state.actorMissiles;
    }

    // Remove launched missiles from combat
    if (this.combat?.activeMissiles && this.launchedMissiles.length > 0) {
      const launchedIds = new Set(this.launchedMissiles.map(m => m.id));
      this.combat.activeMissiles = this.combat.activeMissiles.filter(
        m => !launchedIds.has(m.id)
      );
    }
  }

  /**
   * Command summary
   * @returns {Object}
   */
  toJSON() {
    return {
      ...super.toJSON(),
      missileCount: this.missileCount,
      launched: this.launchedMissiles.length
    };
  }
}

module.exports = { MissileCommand };
