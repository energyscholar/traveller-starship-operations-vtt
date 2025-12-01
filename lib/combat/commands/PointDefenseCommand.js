/**
 * PointDefenseCommand - Point defense against incoming missiles
 *
 * Encapsulates a point defense action to intercept missiles.
 * Uses 2D6 + Gunner skill vs target 8 to intercept.
 *
 * @example
 * const cmd = new PointDefenseCommand({
 *   combat,
 *   actor: defender,
 *   missileId: 'missile_123'
 * });
 *
 * @see BaseCommand for interface documentation
 */

const { BaseCommand } = require('./BaseCommand');

class PointDefenseCommand extends BaseCommand {
  /**
   * @param {Object} context - Command context
   * @param {Object} context.combat - Combat state
   * @param {Object} context.actor - Defending player
   * @param {string} context.missileId - ID of missile to intercept
   */
  constructor(context) {
    super('pointDefense', context);

    this.missileId = context.missileId;
    this.targetMissile = null;
    this.intercepted = false;
  }

  /**
   * Validate point defense action
   * @returns {Object} { valid: boolean, reason?: string }
   */
  validate() {
    // Point defense can be used on enemy turn (reaction)
    // So we don't check turn ownership

    // Check missile exists and is targeting this actor
    if (!this.missileId) {
      return { valid: false, reason: 'no_missile_specified' };
    }

    this.targetMissile = this.findMissile();
    if (!this.targetMissile) {
      return { valid: false, reason: 'missile_not_found' };
    }

    if (this.targetMissile.targetId !== this.actor.id) {
      return { valid: false, reason: 'missile_not_targeting_you' };
    }

    if (this.targetMissile.intercepted || this.targetMissile.detonated) {
      return { valid: false, reason: 'missile_already_resolved' };
    }

    // Check has point defense capability
    if (!this.hasPointDefense()) {
      return { valid: false, reason: 'no_point_defense' };
    }

    return { valid: true };
  }

  /**
   * Find the target missile in combat state
   * @returns {Object|null}
   */
  findMissile() {
    if (!this.combat?.activeMissiles) return null;
    return this.combat.activeMissiles.find(m => m.id === this.missileId);
  }

  /**
   * Check if actor has point defense capability
   * @returns {boolean}
   */
  hasPointDefense() {
    const { SHIPS } = require('../../combat');
    const shipData = SHIPS[this.actor?.ship];
    if (!shipData?.weapons) return false;

    // Any turret weapon can do point defense
    return shipData.weapons.some(w =>
      w.mount === 'turret' ||
      w.type === 'sandcaster' ||
      w.type === 'pulse_laser' ||
      w.type === 'beam_laser'
    );
  }

  /**
   * Execute point defense
   * @returns {Object} Interception result
   */
  execute() {
    // Capture state before changes
    this.previousState = this.captureState();

    // Roll 2D6 + Gunner skill vs 8
    const gunnerSkill = this.getGunnerSkill();
    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    const total = roll1 + roll2 + gunnerSkill;

    this.intercepted = total >= 8;

    if (this.intercepted && this.targetMissile) {
      this.targetMissile.intercepted = true;
    }

    this.executed = true;
    this.result = {
      roll: roll1 + roll2,
      gunnerSkill,
      total,
      target: 8,
      intercepted: this.intercepted,
      message: this.intercepted
        ? `Point defense successful! Missile intercepted (${total} vs 8)`
        : `Point defense failed! Missile continues (${total} vs 8)`
    };

    return this.result;
  }

  /**
   * Get gunner skill from actor's crew
   * @returns {number}
   */
  getGunnerSkill() {
    if (this.actor?.crew) {
      for (const crewMember of Object.values(this.actor.crew)) {
        if (crewMember?.skills?.gunner) {
          return crewMember.skills.gunner;
        }
      }
    }
    return 0;
  }

  /**
   * Capture point defense-specific state
   * @returns {Object}
   */
  captureState() {
    const baseState = super.captureState();
    return {
      ...baseState,
      missileIntercepted: this.targetMissile?.intercepted ?? false
    };
  }

  /**
   * Restore point defense-specific state
   * @param {Object} state
   */
  restoreState(state) {
    super.restoreState(state);

    // Restore missile state
    if (this.targetMissile && state.missileIntercepted !== undefined) {
      this.targetMissile.intercepted = state.missileIntercepted;
    }
  }

  /**
   * Command summary
   * @returns {Object}
   */
  toJSON() {
    return {
      ...super.toJSON(),
      missileId: this.missileId,
      intercepted: this.intercepted,
      roll: this.result?.total
    };
  }
}

module.exports = { PointDefenseCommand };
