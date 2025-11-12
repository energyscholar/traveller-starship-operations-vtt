/**
 * Missile Mechanics - Traveller 2e
 *
 * Stage 11: Missile tracking, launch, movement, and point defense
 *
 * Rules:
 * - Missiles deal 4D6 damage
 * - +2 DM at long, very long, and distant ranges
 * - 12 missiles per rack
 * - Missiles move 1 range band per round (towards target)
 * - Can be shot down by point defense (laser vs missile)
 * - Reload takes 1 round
 */

const { DiceRoller } = require('../dice');
const dice = new DiceRoller();

/**
 * Missile state tracking
 * Tracks all missiles in flight for a combat
 */
class MissileTracker {
  constructor() {
    this.missiles = new Map(); // missileId -> missile state
    this.nextMissileId = 1;
  }

  /**
   * Launch a missile
   * @param {Object} params - Launch parameters
   * @param {string} params.attackerId - ID of attacking ship
   * @param {string} params.defenderId - ID of target ship
   * @param {string} params.currentRange - Current range band
   * @param {number} params.round - Current combat round
   * @returns {Object} Missile state
   */
  launchMissile({ attackerId, defenderId, currentRange, round }) {
    const missileId = `missile_${this.nextMissileId++}`;

    const missile = {
      id: missileId,
      attacker: attackerId,
      target: defenderId,
      launchRange: currentRange,
      currentRange: currentRange,
      launchRound: round,
      status: 'tracking', // 'tracking', 'destroyed', 'impacted'
      turnsInFlight: 0
    };

    this.missiles.set(missileId, missile);
    return missile;
  }

  /**
   * Update missiles at start of new round
   * Missiles move 1 range band closer to target
   * @param {number} round - New round number
   * @returns {Array} Array of missile updates
   */
  updateMissiles(round) {
    const updates = [];

    for (const [missileId, missile] of this.missiles.entries()) {
      if (missile.status !== 'tracking') continue;

      missile.turnsInFlight++;

      // Move missile 1 range band closer
      const newRange = this.moveCloser(missile.currentRange);

      if (newRange !== missile.currentRange) {
        missile.currentRange = newRange;
        updates.push({
          missileId,
          action: 'moved',
          oldRange: missile.currentRange,
          newRange: newRange
        });
      }

      // Check if missile has reached target (adjacent range)
      if (newRange === 'adjacent') {
        updates.push({
          missileId,
          action: 'impact',
          missile: missile
        });
      }
    }

    return updates;
  }

  /**
   * Move missile 1 range band closer to target
   * Range progression: distant → very_long → long → medium → short → close → adjacent
   */
  moveCloser(currentRange) {
    const rangeBands = ['adjacent', 'close', 'short', 'medium', 'long', 'very_long', 'distant'];
    const currentIndex = rangeBands.indexOf(currentRange);

    if (currentIndex <= 0) return 'adjacent';
    return rangeBands[currentIndex - 1];
  }

  /**
   * Attempt point defense against missile
   * @param {string} missileId - Missile to target
   * @param {Object} defender - Defending ship
   * @param {number} gunnerSkill - Gunner skill level
   * @returns {Object} Point defense result
   */
  pointDefense(missileId, defender, gunnerSkill = 0) {
    const missile = this.missiles.get(missileId);

    if (!missile) {
      return { success: false, reason: 'missile_not_found' };
    }

    if (missile.status !== 'tracking') {
      return { success: false, reason: 'missile_not_active' };
    }

    // Point defense attack: 2D6 + Gunner skill vs target 8
    const roll = dice.roll2d6();
    const total = roll.total + gunnerSkill;
    const hit = total >= 8;

    if (hit) {
      missile.status = 'destroyed';
      return {
        success: true,
        destroyed: true,
        roll: roll,
        total: total,
        missile: missile
      };
    } else {
      return {
        success: true,
        destroyed: false,
        roll: roll,
        total: total,
        missile: missile
      };
    }
  }

  /**
   * Resolve missile impact
   * @param {string} missileId - Missile that's impacting
   * @returns {Object} Damage result
   */
  resolveMissileImpact(missileId) {
    const missile = this.missiles.get(missileId);

    if (!missile) {
      return { hit: false, reason: 'missile_not_found' };
    }

    if (missile.status !== 'tracking') {
      return { hit: false, reason: 'missile_not_active' };
    }

    // Missiles automatically hit (no attack roll needed)
    // Roll 4D6 damage
    const roll = dice.roll(4, 6);

    missile.status = 'impacted';

    return {
      hit: true,
      damage: roll.total,
      damageRoll: roll.dice,
      missile: missile
    };
  }

  /**
   * Get all active missiles targeting a ship
   */
  getMissilesTargeting(defenderId) {
    const missiles = [];
    for (const missile of this.missiles.values()) {
      if (missile.target === defenderId && missile.status === 'tracking') {
        missiles.push(missile);
      }
    }
    return missiles;
  }

  /**
   * Clean up old missiles (impacted or destroyed)
   */
  cleanup() {
    for (const [missileId, missile] of this.missiles.entries()) {
      if (missile.status === 'impacted' || missile.status === 'destroyed') {
        // Keep missiles for 2 rounds for logging
        if (missile.turnsInFlight > 10) {
          this.missiles.delete(missileId);
        }
      }
    }
  }

  /**
   * Get missile state for debugging
   */
  getState() {
    return {
      activeMissiles: Array.from(this.missiles.values()).filter(m => m.status === 'tracking').length,
      totalMissiles: this.missiles.size,
      missiles: Array.from(this.missiles.values())
    };
  }
}

/**
 * Calculate missile attack bonus based on range
 * Missiles get +2 DM at long, very long, and distant ranges
 */
function getMissileRangeBonus(range) {
  const longRanges = ['long', 'very_long', 'distant'];
  return longRanges.includes(range) ? 2 : 0;
}

/**
 * Check if missile can be launched at current range
 * Missiles can be launched at any range
 */
function canLaunchMissile(range) {
  return true; // Missiles work at all ranges
}

module.exports = {
  MissileTracker,
  getMissileRangeBonus,
  canLaunchMissile
};
