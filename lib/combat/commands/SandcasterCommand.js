/**
 * SandcasterCommand - Deploy sandcaster for laser defense
 *
 * Encapsulates a sandcaster deployment providing temporary armor
 * bonus against laser/energy weapons.
 *
 * Effect: 1D6 + Effect bonus to armor vs lasers for the round.
 *
 * @example
 * const cmd = new SandcasterCommand({
 *   combat,
 *   actor: defender
 * });
 *
 * @see BaseCommand for interface documentation
 */

const { BaseCommand } = require('./BaseCommand');

class SandcasterCommand extends BaseCommand {
  /**
   * @param {Object} context - Command context
   * @param {Object} context.combat - Combat state
   * @param {Object} context.actor - Deploying player
   */
  constructor(context) {
    super('sandcaster', context);

    this.sandBonus = 0;
  }

  /**
   * Validate sandcaster deployment
   * @returns {Object} { valid: boolean, reason?: string }
   */
  validate() {
    // Sandcaster is a reaction, can use on enemy turn
    // But we check ammo

    // Check ammo
    const ammoCheck = this.validateAmmo('sandcaster', 1);
    if (!ammoCheck.valid) return ammoCheck;

    // Check has sandcaster
    if (!this.hasSandcaster()) {
      return { valid: false, reason: 'no_sandcaster' };
    }

    // Check not already deployed this round
    if (this.actor.sandcasterActive) {
      return { valid: false, reason: 'sandcaster_already_active' };
    }

    return { valid: true };
  }

  /**
   * Check if actor has sandcaster
   * @returns {boolean}
   */
  hasSandcaster() {
    const { SHIPS } = require('../../combat');
    const shipData = SHIPS[this.actor?.ship];
    if (!shipData?.weapons) return false;

    return shipData.weapons.some(w =>
      w.type === 'sandcaster' ||
      w.name?.toLowerCase().includes('sand')
    );
  }

  /**
   * Execute sandcaster deployment
   * @returns {Object} Deployment result
   */
  execute() {
    // Capture state before changes
    this.previousState = this.captureState();

    // Deduct ammo
    if (this.actor.ammo) {
      this.actor.ammo.sandcaster -= 1;
    }

    // Roll for effect (1D6)
    const roll = Math.floor(Math.random() * 6) + 1;
    const gunnerSkill = this.getGunnerSkill();

    // Calculate effect (roll - 8 + 2D6, simplified to roll + skill)
    const effect = Math.max(0, roll + gunnerSkill - 4);
    this.sandBonus = 1 + effect; // Base 1 + effect

    // Mark sandcaster as active
    this.actor.sandcasterActive = true;
    this.actor.sandcasterBonus = this.sandBonus;

    this.executed = true;
    this.result = {
      roll,
      effect,
      armorBonus: this.sandBonus,
      message: `Sandcaster deployed! +${this.sandBonus} armor vs lasers this round`
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
   * Capture sandcaster-specific state
   * @returns {Object}
   */
  captureState() {
    const baseState = super.captureState();
    return {
      ...baseState,
      actorSandcaster: this.actor?.ammo?.sandcaster ?? 0,
      sandcasterActive: this.actor?.sandcasterActive ?? false,
      sandcasterBonus: this.actor?.sandcasterBonus ?? 0
    };
  }

  /**
   * Restore sandcaster-specific state
   * @param {Object} state
   */
  restoreState(state) {
    super.restoreState(state);

    if (this.actor) {
      if (state.actorSandcaster !== undefined) {
        this.actor.ammo = this.actor.ammo || {};
        this.actor.ammo.sandcaster = state.actorSandcaster;
      }
      this.actor.sandcasterActive = state.sandcasterActive;
      this.actor.sandcasterBonus = state.sandcasterBonus;
    }
  }

  /**
   * Command summary
   * @returns {Object}
   */
  toJSON() {
    return {
      ...super.toJSON(),
      armorBonus: this.sandBonus
    };
  }
}

module.exports = { SandcasterCommand };
