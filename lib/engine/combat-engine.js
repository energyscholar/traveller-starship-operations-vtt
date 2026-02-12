/**
 * Combat Engine - Pure Game Logic
 *
 * Handles all combat mechanics without any display concerns.
 * Emits events for TUI/GUI renderers to consume.
 *
 * @module lib/engine/combat-engine
 */

const { EventBus, EventTypes } = require('./event-bus');
const { roll1d6, roll2d6, rollNd6 } = require('../dice');

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Range modifiers for attack rolls
 */
const RANGE_DMS = {
  'Adjacent': 0,
  'Close': 0,
  'Short': 1,
  'Medium': 0,
  'Long': -2,
  'Very Long': -4,
  'Distant': -6
};

/**
 * Weapon damage dice configuration
 */
const WEAPON_DAMAGE = {
  pulse_laser: 2,           // Turret: 2D (CRB p156)
  beam_laser: 1,            // Turret: 1D (CRB p156)
  missile_rack: 4,          // 4D (standard missile)
  missile_rack_advanced: 5, // 5D (advanced missile)
  sandcaster: 0,
  particle_beam: 3,         // Turret: 3D (HG p28)
  particle: 4,              // Barbette: 4D (HG p30)
  particle_barbette: 4,     // Alias for barbette lookup
  ion: 7,                   // Barbette: 7D (HG p30)
  ion_barbette: 7,          // Alias for lookup compat
  barbette_ion: 7,          // Alias for Astral Dawn ship JSON
  barbette_particle: 4,     // Alias for Astral Dawn ship JSON
  railgun: 2,               // Turret: 2D (RAW)
  laser: 1                  // Generic fallback
};

/**
 * Weapon-specific attack DM bonuses (CRB p156)
 */
const WEAPON_ATTACK_DMS = {
  pulse_laser: 2,   // +2 DM
  beam_laser: 4     // +4 DM
};

/**
 * Combat phases in order
 */
const COMBAT_PHASES = [
  'initiative',
  'manoeuvre',
  'attack',
  'reaction',
  'actions',
  'damage'
];

// ─────────────────────────────────────────────────────────────────────────────
// COMBAT ENGINE CLASS
// ─────────────────────────────────────────────────────────────────────────────

class CombatEngine {
  /**
   * Create a new combat engine
   * @param {Object} options
   * @param {boolean} options.debug - Enable debug logging
   * @param {Object} options.rng - Custom RNG for testing (must have roll1d6, roll2d6, rollNd6)
   */
  constructor(options = {}) {
    this.eventBus = new EventBus({ debug: options.debug });
    this.debug = options.debug || false;

    // Allow custom RNG for deterministic testing
    this.rng = options.rng || { roll1d6, roll2d6, rollNd6 };

    // Combat state
    this.ships = [];
    this.round = 0;
    this.phase = null;
    this.range = 'Medium';
    this.currentActor = null;
    this.combatActive = false;

    // Statistics tracking
    this.stats = {
      attacks: 0,
      hits: 0,
      misses: 0,
      damageDealt: 0,
      pointDefenseAttempts: 0,
      pointDefenseSuccesses: 0,
      missilesLaunched: 0
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Initialize combat with ships
   * @param {Array} playerFleet - Player's ships
   * @param {Array} enemyFleet - Enemy ships
   * @param {Object} options - Combat options
   */
  initCombat(playerFleet, enemyFleet, options = {}) {
    this.ships = [
      ...playerFleet.map(s => ({ ...s, faction: 'player', destroyed: false })),
      ...enemyFleet.map(s => ({ ...s, faction: 'enemy', destroyed: false }))
    ];
    this.range = options.range || 'Medium';
    this.round = 0;
    this.phase = null;
    this.combatActive = true;
    this.stats = {
      attacks: 0, hits: 0, misses: 0, damageDealt: 0,
      pointDefenseAttempts: 0, pointDefenseSuccesses: 0,
      missilesLaunched: 0
    };

    // Initialize ship systems if not present
    for (const ship of this.ships) {
      if (!ship.systems) {
        ship.systems = this.createDefaultSystems();
      }
      if (ship.maxHull === undefined) {
        ship.maxHull = ship.hull;
      }
      if (ship.maxPower === undefined) {
        ship.maxPower = ship.power || 100;
      }
    }
  }

  /**
   * Create default ship systems
   */
  createDefaultSystems() {
    return {
      mDrive: { hits: 0, disabled: false },
      jDrive: { hits: 0, disabled: false },
      powerPlant: { hits: 0, disabled: false },
      sensors: { hits: 0, disabled: false },
      computer: { hits: 0, disabled: false },
      fuel: { hits: 0, disabled: false }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RANGE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get range DM for current range
   */
  getRangeDM(range = null) {
    const r = range || this.range;
    // Handle case-insensitive lookup
    for (const [key, value] of Object.entries(RANGE_DMS)) {
      if (key.toLowerCase() === r.toLowerCase()) {
        return value;
      }
    }
    return 0;
  }

  /**
   * Check if current range is long-range
   */
  isLongRange(range = null) {
    const r = (range || this.range).toLowerCase();
    return ['long', 'very long', 'distant'].includes(r);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // INITIATIVE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Roll initiative for all ships
   * @param {Object} options
   * @param {number} options.tacticsDM - Captain's Tactics skill bonus
   * @returns {Array} Ships sorted by initiative
   */
  rollInitiative(options = {}) {
    const { tacticsDM = 0 } = options;

    const initiatives = this.ships
      .filter(s => !s.destroyed)
      .map(ship => {
        const roll = this.rng.roll2d6();
        const pilotSkill = ship.pilot?.skill || 0;
        const thrustBonus = Math.min(ship.thrust || 0, 6); // Max +6 from thrust
        const factionTactics = ship.faction === 'player' ? tacticsDM : 0;
        const total = roll.total + pilotSkill + thrustBonus + factionTactics;

        return {
          ship,
          roll,
          total,
          breakdown: {
            roll: roll.total,
            pilotSkill,
            thrustBonus,
            tacticsDM: factionTactics
          }
        };
      })
      .sort((a, b) => b.total - a.total);

    this.eventBus.publish(EventTypes.INITIATIVE_ROLLED, {
      initiatives: initiatives.map(i => ({
        shipId: i.ship.id,
        shipName: i.ship.name,
        total: i.total,
        breakdown: i.breakdown
      }))
    });

    return initiatives;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTACK RESOLUTION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Resolve an attack between two ships
   * @param {Object} attacker - Attacking ship
   * @param {Object} defender - Defending ship
   * @param {Object} options - Attack options
   * @returns {Object} Attack result
   */
  resolveAttack(attacker, defender, options = {}) {
    const {
      weapon = null,
      turretIndex = 0,
      autoMissile = false  // Auto-select missiles at long range
    } = options;

    this.stats.attacks++;

    // Get weapon/turret
    const turret = weapon || attacker.turrets?.[turretIndex];
    if (!turret) {
      return { success: false, reason: 'No weapon available' };
    }

    // Determine weapon type
    let weaponType = turret.weapons?.[0] || turret.type || 'pulse_laser';

    // Auto-missile at long range
    const hasMissiles = (attacker.missiles || 0) > 0 && turret.weapons?.includes('missile_rack');
    const shouldFireMissile = autoMissile && hasMissiles && this.isLongRange();
    if (shouldFireMissile) {
      weaponType = 'missile_rack';
      attacker.missiles--;
      this.stats.missilesLaunched++;
    }

    // Calculate attack modifiers
    const fc = attacker.fireControl || 0;
    const gunnerSkill = turret.gunnerSkill || 0;
    const rangeDM = this.getRangeDM();
    // TODO: Evasive DM is -Thrust. RAW: -Pilot skill per dodge (each costs 1 Thrust)
    const evasiveDM = defender?.evasive ? -(defender.thrust || 0) : 0;
    const weaponAttackDM = WEAPON_ATTACK_DMS[weaponType] || 0;

    const totalDM = fc + gunnerSkill + rangeDM + evasiveDM + weaponAttackDM;

    // Roll attack
    const roll = this.rng.roll2d6();
    const total = roll.total + totalDM;
    const hit = total >= 8;
    const effect = hit ? total - 8 : 0;

    // Track stats
    if (hit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    // Build result object
    const result = {
      success: true,
      hit,
      attacker: { id: attacker.id, name: attacker.name },
      defender: { id: defender.id, name: defender.name },
      weapon: weaponType,
      roll,
      totalDM,
      total,
      effect,
      damage: 0,
      powerDrain: 0,
      systemDamage: null,
      destroyed: false,
      pointDefense: null,
      modifiers: { fc, gunnerSkill, rangeDM, evasiveDM, weaponAttackDM }
    };

    if (hit) {
      // Point defense check for missiles
      if (weaponType === 'missile_rack') {
        const pdResult = this.resolvePointDefense(defender);
        result.pointDefense = pdResult;
        if (pdResult?.success) {
          this.eventBus.publish(EventTypes.POINT_DEFENSE, {
            ...result,
            intercepted: true
          });
          return result;
        }
      }

      // Calculate damage
      result.damage = this.calculateDamage(weaponType, defender, effect, turret);

      // Apply damage
      if (weaponType === 'ion' || weaponType === 'ion_barbette') {
        result.powerDrain = result.damage;
        // Duration: 1 round, or D3 rounds if Effect >= 6
        result.ionDuration = effect >= 6 ? (this.rng.roll1d6() % 3 + 1) : 1;
        defender.power = Math.max(0, (defender.power || defender.maxPower) - result.powerDrain);
        result.damage = 0;
      } else {
        defender.hull = Math.max(0, defender.hull - result.damage);
        this.stats.damageDealt += result.damage;
      }

      // Check destruction
      if (defender.hull <= 0) {
        defender.destroyed = true;
        result.destroyed = true;
        this.eventBus.publish(EventTypes.SHIP_DESTROYED, {
          ship: { id: defender.id, name: defender.name },
          killedBy: { id: attacker.id, name: attacker.name }
        });
      }
    }

    // Emit attack event
    this.eventBus.publish(EventTypes.ATTACK_RESOLVED, result);

    if (result.damage > 0 || result.powerDrain > 0) {
      this.eventBus.publish(EventTypes.DAMAGE_APPLIED, {
        ship: { id: defender.id, name: defender.name },
        damage: result.damage,
        powerDrain: result.powerDrain,
        remainingHull: defender.hull,
        remainingPower: defender.power
      });
    }

    return result;
  }

  /**
   * Calculate damage for a weapon hit
   * @param {string} weaponType - Weapon type
   * @param {Object} defender - Defending ship
   * @param {number} effect - Attack effect (for ion weapons)
   * @returns {number} Final damage after armor
   */
  calculateDamage(weaponType, defender, effect = 0, weapon = null) {
    const damageDice = WEAPON_DAMAGE[weaponType] || 2;
    const damageMultiple = weapon?.damageMultiple || 1;

    if (weaponType === 'ion' || weaponType === 'ion_barbette') {
      // Ion: 7d6 power drain, ignores armour
      // Power drain = (dice total + effect) × damageMultiple
      const ionRoll = this.rng.rollNd6(damageDice || 7);
      return (ionRoll.total + effect) * damageMultiple;
    }

    const damageRoll = this.rng.rollNd6(damageDice);
    const armor = defender.armour || 0;
    return Math.max(0, damageRoll.total + effect - armor) * damageMultiple;
  }

  /**
   * Attempt point defense against incoming missile
   * @param {Object} defender - Defending ship
   * @returns {Object|null} Point defense result
   */
  resolvePointDefense(defender) {
    if (!defender.turrets?.length) return null;

    // Find a laser turret for point defense
    const pdTurret = defender.turrets.find(t =>
      t.weapons?.includes('pulse_laser') || t.weapons?.includes('beam_laser')
    );
    if (!pdTurret) return null;

    this.stats.pointDefenseAttempts++;

    // Track attempts this round for cumulative penalty
    defender.pdAttempts = (defender.pdAttempts || 0) + 1;
    const pdPenalty = -(defender.pdAttempts - 1);

    const pdGunnerSkill = pdTurret.gunnerSkill || 0;
    const roll = this.rng.roll2d6();
    const total = roll.total + pdGunnerSkill + pdPenalty;
    const success = total >= 8;

    if (success) {
      this.stats.pointDefenseSuccesses++;
    }

    return {
      success,
      roll,
      total,
      targetNumber: 8,
      penalty: pdPenalty,
      gunnerSkill: pdGunnerSkill
    };
  }

  /**
   * Apply system damage from called shot
   * @param {Object} ship - Target ship
   * @param {string} system - System targeted
   * @returns {Object} System damage result
   */
  applySystemDamage(ship, system) {
    if (!ship.systems) ship.systems = this.createDefaultSystems();
    if (!ship.systems[system]) ship.systems[system] = { hits: 0, disabled: false };

    ship.systems[system].hits++;

    // System disabled at 3 hits
    const disabled = ship.systems[system].hits >= 3;
    if (disabled && !ship.systems[system].disabled) {
      ship.systems[system].disabled = true;
    }

    const result = {
      system,
      hits: ship.systems[system].hits,
      disabled
    };

    if (result.hits > 0 || disabled) {
      this.eventBus.publish(EventTypes.SYSTEM_DAMAGED, {
        ship: { id: ship.id, name: ship.name },
        ...result
      });
    }

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TACTICAL ACTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Apply evasive maneuvers to a ship
   * @param {Object} ship - Ship to make evasive
   * @param {boolean} enable - Enable or disable evasive
   */
  setEvasive(ship, enable = true) {
    ship.evasive = enable;
    this.eventBus.publish(EventTypes.EVASIVE_ACTION, {
      ship: { id: ship.id, name: ship.name },
      enabled: enable,
      penalty: enable ? ship.thrust || 0 : 0
    });
  }

  /**
   * Apply evasive stance to fleet based on range and thrust
   * Ships with thrust >= 6 go evasive at long range
   * @param {Array} fleet - Ships to evaluate
   */
  applyTacticalStance(fleet) {
    const isLong = this.isLongRange();
    for (const ship of fleet) {
      if (ship.destroyed) continue;
      if (ship.thrust >= 6 && isLong) {
        this.setEvasive(ship, true);
      } else {
        this.setEvasive(ship, false);
      }
    }
  }

  /**
   * Activate sandcaster defense
   * @param {Object} ship - Ship using sandcaster
   * @returns {Object} Sandcaster result
   */
  activateSandcaster(ship) {
    if ((ship.sandcasters || 0) <= 0) {
      return { success: false, reason: 'No sandcasters remaining' };
    }

    ship.sandcasters--;
    ship.sandcasterActive = true;

    const result = {
      success: true,
      ship: { id: ship.id, name: ship.name },
      remaining: ship.sandcasters
    };

    this.eventBus.publish(EventTypes.SANDCASTER, result);
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Start a new combat round
   */
  startRound() {
    this.round++;
    this.phase = COMBAT_PHASES[0];

    // Reset per-round state
    for (const ship of this.ships) {
      if (!ship.destroyed) {
        ship.pdAttempts = 0;
        ship.sandcasterActive = false;
      }
    }

    this.eventBus.publish(EventTypes.ROUND_STARTED, {
      round: this.round,
      shipsRemaining: this.ships.filter(s => !s.destroyed).length
    });
  }

  /**
   * Advance to next combat phase
   * @returns {string|null} New phase or null if round complete
   */
  nextPhase() {
    const currentIndex = COMBAT_PHASES.indexOf(this.phase);
    if (currentIndex < COMBAT_PHASES.length - 1) {
      this.phase = COMBAT_PHASES[currentIndex + 1];
      this.eventBus.publish(EventTypes.PHASE_CHANGED, {
        phase: this.phase,
        round: this.round
      });
      return this.phase;
    }
    return null; // Round complete
  }

  /**
   * Check if combat should end
   * @returns {Object|null} Combat end result or null if continuing
   */
  checkCombatEnd() {
    const playerAlive = this.ships.filter(s => s.faction === 'player' && !s.destroyed);
    const enemyAlive = this.ships.filter(s => s.faction === 'enemy' && !s.destroyed);

    if (playerAlive.length === 0) {
      this.combatActive = false;
      const result = { winner: 'enemy', reason: 'All player ships destroyed' };
      this.eventBus.publish(EventTypes.COMBAT_ENDED, result);
      return result;
    }

    if (enemyAlive.length === 0) {
      this.combatActive = false;
      const result = { winner: 'player', reason: 'All enemy ships destroyed' };
      this.eventBus.publish(EventTypes.COMBAT_ENDED, result);
      return result;
    }

    // Check for power knockout
    const allEnemyPowerless = enemyAlive.every(s => (s.power ?? s.maxPower ?? 100) <= 0);
    if (allEnemyPowerless) {
      this.combatActive = false;
      const result = { winner: 'player', reason: 'Enemy ships disabled (no power)' };
      this.eventBus.publish(EventTypes.COMBAT_ENDED, result);
      return result;
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITY
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get ship by ID
   */
  getShip(id) {
    return this.ships.find(s => s.id === id);
  }

  /**
   * Get ships by faction
   */
  getShipsByFaction(faction) {
    return this.ships.filter(s => s.faction === faction && !s.destroyed);
  }

  /**
   * Get combat statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Subscribe to engine events
   */
  subscribe(eventType, callback) {
    return this.eventBus.subscribe(eventType, callback);
  }

  /**
   * Subscribe to multiple events
   */
  subscribeMany(subscriptions) {
    return this.eventBus.subscribeMany(subscriptions);
  }

  /**
   * Get event replay
   */
  replayEvents(fromId = 0) {
    return this.eventBus.replay(fromId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  CombatEngine,
  RANGE_DMS,
  WEAPON_DAMAGE,
  WEAPON_ATTACK_DMS,
  COMBAT_PHASES,
  // Expose dice helpers for testing/external use
  roll1d6,
  roll2d6,
  rollNd6
};
