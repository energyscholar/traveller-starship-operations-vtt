/**
 * AR-226: Missile Mechanics - Mongoose Traveller 2e (Corrected)
 *
 * Official Rules Implementation:
 * - Missiles deal 4D6 damage
 * - +2 DM at long, very long, and distant ranges
 * - 12 missiles per rack
 * - CANNOT be launched at Adjacent or Close range
 * - Flight time varies by launch range (not 1 band/turn)
 * - Point defense only on arrival turn
 * - Cumulative -1 DM per point defense attempt
 * - Double turret +1, Triple turret +2 to point defense
 * - Smart missiles: 8+ to hit, persist until destroyed
 * - ECM can jam/destroy missile salvos
 *
 * Flight Time Table (official):
 *   Short/Medium: 1 turn
 *   Long: 2 turns
 *   Very Long: 5 turns
 *   Distant: 10 turns
 */

const { DiceRoller } = require('../dice');
const dice = new DiceRoller();

// AR-226.1: Official flight time table
const MISSILE_FLIGHT_TIME = {
  'adjacent': 0,   // Cannot launch
  'close': 0,      // Cannot launch
  'short': 1,
  'medium': 1,
  'long': 2,
  'very_long': 5,
  'distant': 10
};

// AR-226.2: Ranges where missiles CANNOT be launched
const BLOCKED_LAUNCH_RANGES = ['adjacent', 'close'];

/**
 * AR-226.8: Missile Types (MT2E High Guard)
 *
 * Nuclear Missiles:
 * - Same 4D6 damage as standard missiles
 * - PLUS radiation crew hit (with -DM equal to target's armor)
 * - Highly illegal in most areas of space
 * - Cost: Cr450,000 per rack (vs Cr100,000 standard)
 * - Nuclear dampers negate radiation hits
 * - Ships with armor 8+ ignore radiation hits from nuclear weapons
 * - Requires Gunner (turret) with additional Electronics (sensors) check to arm
 *
 * Smart Missiles:
 * - Same damage as standard
 * - Always 8+ to hit regardless of gunnery effect
 * - Persist on miss - attack again next round
 * - Harder to ECM jam (resist on 8+)
 *
 * Bomb-Pumped Torpedoes (future):
 * - Not affected by nuclear dampers (detonate beyond damper effect)
 * - Requires TL15+
 */
const MISSILE_TYPES = {
  standard: {
    damage: '4D6',
    radiation: false,
    cost: 100000,
    legal: true,
    description: 'Standard missile'
  },
  smart: {
    damage: '4D6',
    radiation: false,
    cost: 150000,
    legal: true,
    smart: true,
    description: 'Smart missile - persists until destroyed'
  },
  nuclear: {
    damage: '4D6',
    radiation: true,
    radiationDamage: '2D6',  // Crew hit damage
    cost: 450000,
    legal: false,
    tl: 9,
    description: 'Nuclear missile - adds radiation crew hit'
  },
  nuclear_smart: {
    damage: '4D6',
    radiation: true,
    radiationDamage: '2D6',
    cost: 600000,
    legal: false,
    smart: true,
    tl: 10,
    description: 'Smart nuclear missile'
  }
  // TODO: bomb_pumped_torpedo (TL15, bypasses nuclear dampers)
};

/**
 * Check if radiation damage applies
 * @param {number} targetArmor - Target ship's armor rating
 * @param {boolean} hasNuclearDamper - Target has nuclear damper screen
 * @param {boolean} hasRadiationShielding - Target has radiation shielding
 * @returns {Object} { applies: boolean, dm: number, reason: string }
 */
function checkRadiationDamage(targetArmor, hasNuclearDamper = false, hasRadiationShielding = false) {
  if (hasNuclearDamper || hasRadiationShielding) {
    return {
      applies: false,
      dm: 0,
      reason: hasNuclearDamper ? 'Nuclear damper negated radiation' : 'Radiation shielding protected crew'
    };
  }

  if (targetArmor >= 8) {
    return {
      applies: false,
      dm: 0,
      reason: 'Armor 8+ provides radiation protection'
    };
  }

  return {
    applies: true,
    dm: -targetArmor,  // Radiation hit has -DM equal to armor
    reason: `Radiation crew hit with -${targetArmor} DM from armor`
  };
}

/**
 * Missile state tracking
 * Tracks all missiles in flight for a combat
 */
class MissileTracker {
  constructor() {
    this.missiles = new Map(); // missileId -> missile state
    this.nextMissileId = 1;
    this.pointDefenseAttempts = new Map(); // visageId -> attempt count this turn
  }

  /**
   * Reset point defense attempt counters (call at start of each round)
   */
  resetPointDefenseCounters() {
    this.pointDefenseAttempts.clear();
  }

  /**
   * AR-226.2: Check if missile can be launched at this range
   * @param {string} range - Current range band
   * @returns {boolean} True if launch is allowed
   */
  static canLaunchAtRange(range) {
    const normalizedRange = range.toLowerCase().replace(' ', '_');
    return !BLOCKED_LAUNCH_RANGES.includes(normalizedRange);
  }

  /**
   * AR-226.1: Get turns until missile impact
   * @param {string} range - Launch range
   * @returns {number} Turns until impact
   */
  static getFlightTime(range) {
    const normalizedRange = range.toLowerCase().replace(' ', '_');
    return MISSILE_FLIGHT_TIME[normalizedRange] || 1;
  }

  /**
   * Launch a missile
   * @param {Object} params - Launch parameters
   * @param {string} params.attackerId - ID of attacking ship
   * @param {string} params.defenderId - ID of target ship
   * @param {string} params.currentRange - Current range band
   * @param {number} params.round - Current combat round
   * @param {boolean} params.isSmart - Is this a smart missile? (deprecated, use missileType)
   * @param {string} params.missileType - 'standard', 'smart', 'nuclear', 'nuclear_smart'
   * @param {number} params.gunneryEffect - Gunnery check effect (for accuracy)
   * @returns {Object} Missile state or error
   */
  launchMissile({ attackerId, defenderId, currentRange, round, isSmart = false, missileType = 'standard', gunneryEffect = 0 }) {
    const normalizedRange = currentRange.toLowerCase().replace(' ', '_');

    // AR-226.2: Block launch at Adjacent/Close
    if (!MissileTracker.canLaunchAtRange(normalizedRange)) {
      return {
        error: true,
        reason: `Cannot launch missiles at ${currentRange} range - target too close`,
        range: currentRange
      };
    }

    // Get missile type info
    const typeInfo = MISSILE_TYPES[missileType] || MISSILE_TYPES.standard;

    // Support legacy isSmart flag
    const isSmartMissile = isSmart || typeInfo.smart || false;

    const missileId = `missile_${this.nextMissileId++}`;
    const flightTime = MissileTracker.getFlightTime(normalizedRange);
    const arrivalRound = round + flightTime;

    const missile = {
      id: missileId,
      attacker: attackerId,
      target: defenderId,
      launchRange: normalizedRange,
      currentRange: normalizedRange,
      launchRound: round,
      arrivalRound: arrivalRound,  // AR-226.1: When missile arrives
      flightTime: flightTime,
      turnsRemaining: flightTime,
      status: 'tracking', // 'tracking', 'destroyed', 'impacted', 'jammed'
      turnsInFlight: 0,
      isSmart: isSmartMissile,     // AR-226.3: Smart missile flag
      missileType: missileType,    // AR-226.8: Missile type for nuclear etc
      isNuclear: typeInfo.radiation || false,  // Nuclear missile flag
      gunneryEffect: gunneryEffect, // Affects to-hit on arrival
      pdAttempts: 0                // Track point defense attempts against this missile
    };

    this.missiles.set(missileId, missile);
    return missile;
  }

  /**
   * Update missiles at start of new round
   * AR-226.1: Missiles count down to arrival, not range bands
   * @param {number} round - New round number
   * @returns {Array} Array of missile updates (arrivals this round)
   */
  updateMissiles(round) {
    const updates = [];
    this.resetPointDefenseCounters();

    for (const [missileId, missile] of this.missiles.entries()) {
      if (missile.status !== 'tracking') continue;

      missile.turnsInFlight++;
      missile.turnsRemaining--;

      // Check if missile arrives this round
      if (round >= missile.arrivalRound) {
        missile.arriving = true;
        updates.push({
          missileId,
          action: 'arriving',
          missile: { ...missile },
          message: `Missile from ${missile.attacker} arriving at ${missile.target}!`
        });
      } else {
        updates.push({
          missileId,
          action: 'tracking',
          turnsRemaining: missile.turnsRemaining,
          missile: { ...missile }
        });
      }
    }

    return updates;
  }

  /**
   * Get missiles arriving this round (for point defense window)
   * AR-226.4: Point defense only allowed on arrival turn
   * @param {string} defenderId - Ship being targeted
   * @param {number} round - Current round
   * @returns {Array} Missiles that can be targeted by point defense
   */
  getArrivingMissiles(defenderId, round) {
    const arriving = [];
    for (const missile of this.missiles.values()) {
      if (missile.target === defenderId &&
          missile.status === 'tracking' &&
          round >= missile.arrivalRound) {
        arriving.push(missile);
      }
    }
    return arriving;
  }

  /**
   * AR-226.4/5/6: Attempt point defense against missile
   * @param {string} missileId - Missile to target
   * @param {Object} options - Point defense options
   * @param {number} options.gunnerSkill - Gunner skill level
   * @param {number} options.turretSize - 1=single, 2=double, 3=triple
   * @param {string} options visageId - Gunner ID (for cumulative penalty tracking)
   * @param {number} options.round - Current round
   * @returns {Object} Point defense result
   */
  pointDefense(missileId, { gunnerSkill = 0, turretSize = 1, gunnerId = 'default', round = 0 } = {}) {
    const missile = this.missiles.get(missileId);

    if (!missile) {
      return { success: false, reason: 'missile_not_found' };
    }

    if (missile.status !== 'tracking') {
      return { success: false, reason: 'missile_not_active' };
    }

    // AR-226.4: Can only target missiles on arrival turn
    if (round < missile.arrivalRound) {
      const turnsUntilArrival = missile.arrivalRound - round;
      return {
        success: false,
        reason: 'missile_not_arrived',
        turnsRemaining: turnsUntilArrival,
        message: `Missile will arrive in ${turnsUntilArrival} turn(s) - too far for point defense`
      };
    }

    // AR-226.5: Track cumulative penalty for this gunner
    const attempts = this.pointDefenseAttempts.get(gunnerId) || 0;
    const cumulativePenalty = -attempts;
    this.pointDefenseAttempts.set(gunnerId, attempts + 1);

    // AR-226.6: Turret size bonus
    const turretBonus = turretSize >= 3 ? 2 : (turretSize >= 2 ? 1 : 0);

    // Point defense attack: 2D6 + Gunner skill + turret bonus - cumulative penalty vs target 8
    const roll = dice.roll2d6();
    const total = roll.total + gunnerSkill + turretBonus + cumulativePenalty;
    const hit = total >= 8;

    missile.pdAttempts++;

    if (hit) {
      missile.status = 'destroyed';
      return {
        success: true,
        destroyed: true,
        roll: roll,
        total: total,
        modifiers: {
          gunnerSkill,
          turretBonus,
          cumulativePenalty,
          attemptNumber: attempts + 1
        },
        missile: { ...missile },
        message: `Point defense destroyed missile! (${roll.total} + ${gunnerSkill} skill + ${turretBonus} turret ${cumulativePenalty} cumulative = ${total} vs 8)`
      };
    } else {
      return {
        success: true,
        destroyed: false,
        roll: roll,
        total: total,
        modifiers: {
          gunnerSkill,
          turretBonus,
          cumulativePenalty,
          attemptNumber: attempts + 1
        },
        missile: { ...missile },
        message: `Point defense missed! (${roll.total} + ${gunnerSkill} skill + ${turretBonus} turret ${cumulativePenalty} cumulative = ${total} vs 8) - next attempt at ${cumulativePenalty - 1}`
      };
    }
  }

  /**
   * AR-226.7: Electronic Warfare (ECM) against missiles
   * @param {string} missileId - Missile to jam
   * @param {number} sensorSkill - Sensor operator skill
   * @returns {Object} ECM result
   */
  electronicWarfare(missileId, sensorSkill = 0) {
    const missile = this.missiles.get(missileId);

    if (!missile) {
      return { success: false, reason: 'missile_not_found' };
    }

    // Check ECM attempted BEFORE status - even jammed missiles should report this
    if (missile.ecmAttempted) {
      return {
        success: false,
        reason: 'ecm_already_attempted',
        message: 'This salvo has already been targeted by ECM this round'
      };
    }

    if (missile.status !== 'tracking') {
      return { success: false, reason: 'missile_not_active' };
    }

    missile.ecmAttempted = true;

    // ECM check: 2D6 + Electronics (sensors) vs 8
    const roll = dice.roll2d6();
    const total = roll.total + sensorSkill;
    const jammed = total >= 8;

    if (jammed) {
      // Smart missiles are harder to jam
      if (missile.isSmart) {
        const smartRoll = dice.roll2d6();
        if (smartRoll.total >= 8) {
          return {
            success: true,
            jammed: false,
            roll: roll,
            total: total,
            smartResist: smartRoll,
            missile: { ...missile },
            message: `ECM successful but smart missile resisted! (Smart roll: ${smartRoll.total})`
          };
        }
      }

      missile.status = 'jammed';
      return {
        success: true,
        jammed: true,
        roll: roll,
        total: total,
        missile: { ...missile },
        message: `ECM jammed missile! (${total} vs 8)`
      };
    } else {
      return {
        success: true,
        jammed: false,
        roll: roll,
        total: total,
        missile: { ...missile },
        message: `ECM failed to jam missile (${total} vs 8)`
      };
    }
  }

  /**
   * AR-226.3/8: Resolve missile impact (including smart missile and nuclear logic)
   * @param {string} missileId - Missile that's impacting
   * @param {number} dodgeDM - Target's dodge modifier
   * @param {Object} targetDefenses - Optional: { armor, hasNuclearDamper, hasRadiationShielding }
   * @returns {Object} Damage result
   */
  resolveMissileImpact(missileId, dodgeDM = 0, targetDefenses = {}) {
    const missile = this.missiles.get(missileId);

    if (!missile) {
      return { hit: false, reason: 'missile_not_found' };
    }

    if (missile.status !== 'tracking') {
      return { hit: false, reason: 'missile_not_active' };
    }

    // Calculate to-hit based on gunnery effect
    let targetNumber = 8;

    // AR-226.3: Smart missiles always need 8+ regardless of gunnery
    if (!missile.isSmart) {
      // Normal missiles: better gunnery = easier hit
      // Effect 0-1 = 8+, Effect 2-3 = 7+, Effect 4-5 = 6+, Effect 6+ = 5+
      if (missile.gunneryEffect >= 6) targetNumber = 5;
      else if (missile.gunneryEffect >= 4) targetNumber = 6;
      else if (missile.gunneryEffect >= 2) targetNumber = 7;
    }

    const attackRoll = dice.roll2d6();
    const total = attackRoll.total - dodgeDM;
    const hit = total >= targetNumber;

    if (hit) {
      // Roll 4D6 damage
      const damageRoll = dice.roll(4, 6);
      missile.status = 'impacted';

      // AR-226.8: Handle nuclear missile radiation
      let radiationResult = null;
      let radiationDamage = 0;
      if (missile.isNuclear) {
        const armor = targetDefenses.armor || 0;
        radiationResult = checkRadiationDamage(
          armor,
          targetDefenses.hasNuclearDamper || false,
          targetDefenses.hasRadiationShielding || false
        );

        if (radiationResult.applies) {
          // Roll radiation crew hit with armor DM
          const radiationRoll = dice.roll2d6();
          const radiationTotal = radiationRoll.total + radiationResult.dm;
          // Radiation hits on 8+
          if (radiationTotal >= 8) {
            const radiationDamageRoll = dice.roll(2, 6);  // 2D6 crew hit
            radiationDamage = radiationDamageRoll.total;
            radiationResult.hit = true;
            radiationResult.damage = radiationDamage;
            radiationResult.roll = radiationRoll;
            radiationResult.total = radiationTotal;
          } else {
            radiationResult.hit = false;
            radiationResult.roll = radiationRoll;
            radiationResult.total = radiationTotal;
          }
        }
      }

      const result = {
        hit: true,
        damage: damageRoll.total,
        damageRoll: damageRoll.dice,
        attackRoll: attackRoll,
        total: total,
        targetNumber: targetNumber,
        missile: { ...missile },
        message: `Missile impact! ${damageRoll.total} damage (${attackRoll.total} - ${dodgeDM} dodge = ${total} vs ${targetNumber}+)`
      };

      // Add nuclear/radiation info if applicable
      if (missile.isNuclear) {
        result.isNuclear = true;
        result.radiationResult = radiationResult;
        if (radiationResult && radiationResult.hit) {
          result.message += ` + ${radiationDamage} radiation crew damage!`;
        } else if (radiationResult) {
          result.message += ` (${radiationResult.reason})`;
        }
      }

      return result;
    } else {
      // AR-226.3: Smart missiles persist and attack again next round
      if (missile.isSmart) {
        missile.arrivalRound++; // Attack again next round
        return {
          hit: false,
          smartPersist: true,
          attackRoll: attackRoll,
          total: total,
          targetNumber: targetNumber,
          missile: { ...missile },
          message: `Smart missile missed but is circling for another attack! (${total} vs ${targetNumber}+)`
        };
      }

      missile.status = 'missed';
      return {
        hit: false,
        attackRoll: attackRoll,
        total: total,
        targetNumber: targetNumber,
        missile: { ...missile },
        message: `Missile missed! (${total} vs ${targetNumber}+)`
      };
    }
  }

  /**
   * Get all active missiles targeting a ship
   */
  getMissilesTargeting(defenderId) {
    const missiles = [];
    for (const missile of this.missiles.values()) {
      if (missile.target === defenderId && missile.status === 'tracking') {
        missiles.push({ ...missile });
      }
    }
    return missiles;
  }

  /**
   * Clean up old missiles (impacted, destroyed, jammed, or missed)
   */
  cleanup() {
    for (const [missileId, missile] of this.missiles.entries()) {
      if (['impacted', 'destroyed', 'jammed', 'missed'].includes(missile.status)) {
        // Keep missiles for 2 rounds for logging
        if (missile.turnsInFlight > 12) {
          this.missiles.delete(missileId);
        }
      }
    }
  }

  /**
   * Get missile state for debugging
   */
  getState() {
    const missiles = Array.from(this.missiles.values());
    return {
      activeMissiles: missiles.filter(m => m.status === 'tracking').length,
      arrivingMissiles: missiles.filter(m => m.status === 'tracking' && m.arriving).length,
      destroyedMissiles: missiles.filter(m => m.status === 'destroyed').length,
      jammedMissiles: missiles.filter(m => m.status === 'jammed').length,
      totalMissiles: missiles.length,
      missiles: missiles
    };
  }
}

/**
 * Calculate missile attack bonus based on range
 * Missiles get +2 DM at long, very long, and distant ranges
 */
function getMissileRangeBonus(range) {
  const normalizedRange = range.toLowerCase().replace(' ', '_');
  const longRanges = ['long', 'very_long', 'distant'];
  return longRanges.includes(normalizedRange) ? 2 : 0;
}

/**
 * AR-226.2: Check if missile can be launched at current range
 * Missiles CANNOT be launched at Adjacent or Close range
 */
function canLaunchMissile(range) {
  return MissileTracker.canLaunchAtRange(range);
}

/**
 * AR-226.1: Get flight time for a given range
 */
function getFlightTime(range) {
  return MissileTracker.getFlightTime(range);
}

module.exports = {
  MissileTracker,
  getMissileRangeBonus,
  canLaunchMissile,
  getFlightTime,
  checkRadiationDamage,
  MISSILE_FLIGHT_TIME,
  BLOCKED_LAUNCH_RANGES,
  MISSILE_TYPES
};
