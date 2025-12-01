/**
 * EndTurnCommand - End current player's turn
 *
 * Encapsulates the action of ending a turn, marking the player
 * as having acted and potentially triggering round advancement.
 *
 * @example
 * const cmd = new EndTurnCommand({
 *   combat,
 *   actor: currentPlayer
 * });
 *
 * @see BaseCommand for interface documentation
 */

const { BaseCommand } = require('./BaseCommand');

class EndTurnCommand extends BaseCommand {
  /**
   * @param {Object} context - Command context
   * @param {Object} context.combat - Combat state
   * @param {Object} context.actor - Player ending turn
   */
  constructor(context) {
    super('endTurn', context);

    this.roundAdvanced = false;
    this.missilesMoved = [];
  }

  /**
   * Validate end turn action
   * @returns {Object} { valid: boolean, reason?: string }
   */
  validate() {
    // Check it's actor's turn
    const turnCheck = this.validateTurn();
    if (!turnCheck.valid) return turnCheck;

    return { valid: true };
  }

  /**
   * Execute end turn
   * @returns {Object} End turn result
   */
  execute() {
    // Capture state before changes
    this.previousState = this.captureState();

    // Mark turn as complete
    if (this.combat?.turnComplete) {
      this.combat.turnComplete[this.actor.id] = true;
    }

    // Clear sandcaster bonuses at end of turn
    if (this.actor.sandcasterActive) {
      this.actor.sandcasterActive = false;
      this.actor.sandcasterBonus = 0;
    }

    // Check if all players have acted
    const allActed = this.checkAllPlayersActed();

    if (allActed) {
      this.advanceRound();
    }

    this.executed = true;
    this.result = {
      playerFinished: this.actor.id,
      roundAdvanced: this.roundAdvanced,
      newRound: this.combat?.round,
      message: this.roundAdvanced
        ? `Turn ended. Round ${this.combat?.round} begins!`
        : `Turn ended.`
    };

    return this.result;
  }

  /**
   * Check if all players have acted this round
   * @returns {boolean}
   */
  checkAllPlayersActed() {
    if (!this.combat?.turnComplete) return false;

    // Check player1 and player2
    const p1Done = this.combat.turnComplete.player1 || !this.combat.player1;
    const p2Done = this.combat.turnComplete.player2 || !this.combat.player2;

    return p1Done && p2Done;
  }

  /**
   * Advance to next round
   */
  advanceRound() {
    if (!this.combat) return;

    // Increment round
    this.combat.round = (this.combat.round || 1) + 1;
    this.roundAdvanced = true;

    // Reset turn tracking
    this.combat.turnComplete = {};

    // Move missiles closer
    this.moveMissiles();

    // Process missile detonations
    this.processMissileDetonations();
  }

  /**
   * Move all active missiles one band closer
   */
  moveMissiles() {
    if (!this.combat?.activeMissiles) return;

    for (const missile of this.combat.activeMissiles) {
      if (!missile.intercepted && !missile.detonated) {
        missile.distanceRemaining -= 1;
        this.missilesMoved.push({
          id: missile.id,
          distanceRemaining: missile.distanceRemaining
        });
      }
    }
  }

  /**
   * Process missiles that have reached their target
   */
  processMissileDetonations() {
    if (!this.combat?.activeMissiles) return;

    for (const missile of this.combat.activeMissiles) {
      if (!missile.intercepted && !missile.detonated && missile.distanceRemaining <= 0) {
        missile.detonated = true;

        // Find target and apply damage (4D6)
        const target = missile.targetId === 'player1'
          ? this.combat.player1
          : this.combat.player2;

        if (target) {
          const damage = this.rollMissileDamage();
          const effectiveDamage = Math.max(0, damage - (target.armor || 0));
          target.hull -= effectiveDamage;
          if (target.hull < 0) target.hull = 0;

          missile.damageDealt = effectiveDamage;
        }
      }
    }
  }

  /**
   * Roll 4D6 for missile damage
   * @returns {number}
   */
  rollMissileDamage() {
    let total = 0;
    for (let i = 0; i < 4; i++) {
      total += Math.floor(Math.random() * 6) + 1;
    }
    return total;
  }

  /**
   * Capture end turn-specific state
   * @returns {Object}
   */
  captureState() {
    const baseState = super.captureState();
    return {
      ...baseState,
      sandcasterActive: this.actor?.sandcasterActive ?? false,
      sandcasterBonus: this.actor?.sandcasterBonus ?? 0,
      turnComplete: this.combat?.turnComplete ? { ...this.combat.turnComplete } : {},
      activeMissiles: this.combat?.activeMissiles
        ? this.combat.activeMissiles.map(m => ({ ...m }))
        : []
    };
  }

  /**
   * Restore end turn-specific state
   * @param {Object} state
   */
  restoreState(state) {
    super.restoreState(state);

    if (this.actor) {
      this.actor.sandcasterActive = state.sandcasterActive;
      this.actor.sandcasterBonus = state.sandcasterBonus;
    }

    if (this.combat) {
      this.combat.turnComplete = { ...state.turnComplete };
      this.combat.activeMissiles = state.activeMissiles.map(m => ({ ...m }));

      if (this.roundAdvanced) {
        this.combat.round -= 1;
      }
    }
  }

  /**
   * Command summary
   * @returns {Object}
   */
  toJSON() {
    return {
      ...super.toJSON(),
      roundAdvanced: this.roundAdvanced,
      missilesMoved: this.missilesMoved.length
    };
  }
}

module.exports = { EndTurnCommand };
