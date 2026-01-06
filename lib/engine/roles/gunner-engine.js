/**
 * Gunner Engine - Weapon firing and targeting actions
 *
 * Handles:
 * - Primary/secondary weapon selection
 * - Missile attacks
 * - Point defense reactions
 * - Called shots
 *
 * @module lib/engine/roles/gunner-engine
 */

const { BaseRoleEngine } = require('./base-role-engine');
const { canUseCalledShot } = require('../../combat/called-shot-ai');

class GunnerEngine extends BaseRoleEngine {
  /**
   * Create gunner engine
   * @param {Object} ship - Ship state with turrets array
   * @param {Object} options
   * @param {Object} options.combatEngine - CombatEngine for attack resolution
   * @param {Object} options.combat - Combat state reference
   * @param {Object} options.eventBus - Shared event bus
   * @param {Object} options.rng - RNG for testing
   */
  constructor(ship, options = {}) {
    super('gunner', ship, options);
    this.combatEngine = options.combatEngine || null;
  }

  defineActions() {
    const base = super.defineActions();

    return {
      ...base,

      fire_primary: {
        label: 'Fire primary weapon',
        description: 'Fire main weapon at target',
        isDefault: true,
        canExecute: () => this.canFirePrimary(),
        disabledReason: this.getPrimaryDisabledReason(),
        execute: (params) => this.firePrimary(params)
      },

      fire_secondary: {
        label: 'Fire secondary weapon',
        description: 'Fire backup weapon at target',
        canExecute: () => this.canFireSecondary(),
        disabledReason: this.getSecondaryDisabledReason(),
        execute: (params) => this.fireSecondary(params)
      },

      fire_missiles: {
        label: 'Fire missiles',
        description: 'Launch missile salvo at target',
        canExecute: () => this.canFireMissiles(),
        disabledReason: this.getMissilesDisabledReason(),
        execute: (params) => this.fireMissiles(params)
      },

      point_defense: {
        label: 'Point defense',
        description: 'Intercept incoming missile with laser',
        canExecute: () => this.canPointDefense(),
        disabledReason: this.getPointDefenseDisabledReason(),
        execute: (params) => this.pointDefense(params)
      },

      called_shot: {
        label: 'Called shot',
        description: 'Target specific system (-4 DM)',
        canExecute: () => this.canCalledShot(),
        disabledReason: this.getCalledShotDisabledReason(),
        execute: (params) => this.calledShot(params)
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTION IMPLEMENTATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Fire primary weapon (first available turret)
   */
  firePrimary(params = {}) {
    const turret = this.getPrimaryTurret();
    if (!turret) {
      return { success: false, error: 'No available weapons' };
    }

    return this.fireWeapon(turret, params);
  }

  /**
   * Fire secondary weapon (second turret if available)
   */
  fireSecondary(params = {}) {
    const turret = this.getSecondaryTurret();
    if (!turret) {
      return { success: false, error: 'No secondary weapon available' };
    }

    return this.fireWeapon(turret, params);
  }

  /**
   * Fire missiles
   */
  fireMissiles(params = {}) {
    const missileMount = this.getMissileMount();
    if (!missileMount) {
      return { success: false, error: 'No missiles available' };
    }

    return this.fireWeapon(missileMount, { ...params, autoMissile: true });
  }

  /**
   * Attempt point defense against incoming missile
   */
  pointDefense(params = {}) {
    const { incomingMissile, sourceShip } = params;

    if (!incomingMissile) {
      return { success: false, error: 'No incoming missile to intercept' };
    }

    // Find available laser for PD
    const pdWeapon = this.getPointDefenseWeapon();
    if (!pdWeapon) {
      return { success: false, error: 'No point defense weapons available' };
    }

    // Mark turret as used for PD this round
    pdWeapon.usedForPD = true;

    // Gunnery skill check to intercept
    const check = this.performSkillCheck('gunnery', 8);

    return {
      success: true,
      action: 'point_defense',
      intercepted: check.success,
      weapon: pdWeapon.name || 'Laser',
      check
    };
  }

  /**
   * Called shot - target specific system
   */
  calledShot(params = {}) {
    const { target, system } = params;

    if (!system) {
      return { success: false, error: 'Must specify target system' };
    }

    const turret = this.getPrimaryTurret();
    if (!turret) {
      return { success: false, error: 'No available weapons' };
    }

    return this.fireWeapon(turret, { ...params, calledShot: system });
  }

  /**
   * Core weapon firing logic
   */
  fireWeapon(turret, params = {}) {
    const { target, calledShot, autoMissile } = params;

    // Mark turret as used
    turret.usedThisRound = true;

    // If we have a combat engine, delegate to it
    if (this.combatEngine && target) {
      const result = this.combatEngine.resolveAttack(this.ship, target, {
        weapon: turret,
        calledShot,
        autoMissile
      });

      return {
        success: true,
        action: 'fire',
        weapon: this.getWeaponName(turret),
        target: target.name,
        ...result
      };
    }

    // Standalone mode - just do skill check
    const check = this.performSkillCheck('gunnery', 8);

    return {
      success: true,
      action: 'fire',
      weapon: this.getWeaponName(turret),
      hit: check.success,
      check
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // AVAILABILITY CHECKS
  // ─────────────────────────────────────────────────────────────────────────────

  canFirePrimary() {
    return this.getPrimaryTurret() !== null;
  }

  getPrimaryDisabledReason() {
    const turrets = this.getUsableTurrets();
    if (turrets.length === 0) return 'No weapons available';
    if (turrets[0]?.usedThisRound) return 'Already fired this round';
    return null;
  }

  canFireSecondary() {
    return this.getSecondaryTurret() !== null;
  }

  getSecondaryDisabledReason() {
    const turrets = this.getUsableTurrets();
    if (turrets.length < 2) return 'No secondary weapon';
    if (turrets[1]?.usedThisRound) return 'Already fired this round';
    return null;
  }

  canFireMissiles() {
    return this.getMissileMount() !== null;
  }

  getMissilesDisabledReason() {
    const missiles = this.ship.turrets?.find(t =>
      t.weapons?.some(w => w === 'missile' || w.includes('missile'))
    );
    if (!missiles) return 'No missile launcher';
    if (missiles.usedThisRound) return 'Already fired this round';
    if ((missiles.ammo ?? 0) <= 0) return 'Out of missiles';
    return null;
  }

  canPointDefense() {
    return this.getPointDefenseWeapon() !== null;
  }

  getPointDefenseDisabledReason() {
    const lasers = this.ship.turrets?.filter(t =>
      t.weapons?.some(w => w.includes('laser')) &&
      !t.usedThisRound &&
      !t.usedForPD
    );
    if (!lasers || lasers.length === 0) return 'No point defense weapons available';
    return null;
  }

  canCalledShot() {
    const turret = this.getPrimaryTurret();
    if (!turret) return false;
    // AR-216: Check weapon type - ion cannons and sandcasters cannot use called shots
    const weaponType = turret.weapons?.[0] || turret.type;
    return canUseCalledShot(weaponType);
  }

  getCalledShotDisabledReason() {
    const turret = this.getPrimaryTurret();
    if (!turret) return 'No weapons available';
    const weaponType = turret.weapons?.[0] || turret.type;
    if (!canUseCalledShot(weaponType)) {
      return `${weaponType} cannot use called shots`;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TURRET HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get all turrets that aren't disabled or used
   */
  getUsableTurrets() {
    if (!this.ship.turrets) return [];
    return this.ship.turrets.filter(t =>
      !t.disabled &&
      !t.usedThisRound
    );
  }

  /**
   * Get primary (first usable) turret
   */
  getPrimaryTurret() {
    const turrets = this.getUsableTurrets();
    // Skip sandcasters for primary weapon
    const nonSandcaster = turrets.filter(t =>
      !t.weapons?.every(w => w === 'sandcaster')
    );
    return nonSandcaster[0] || null;
  }

  /**
   * Get secondary turret
   */
  getSecondaryTurret() {
    const turrets = this.getUsableTurrets();
    const nonSandcaster = turrets.filter(t =>
      !t.weapons?.every(w => w === 'sandcaster')
    );
    return nonSandcaster[1] || null;
  }

  /**
   * Get missile mount if available and has ammo
   */
  getMissileMount() {
    if (!this.ship.turrets) return null;
    return this.ship.turrets.find(t =>
      t.weapons?.some(w => w === 'missile' || w.includes('missile')) &&
      !t.disabled &&
      !t.usedThisRound &&
      (t.ammo === undefined || t.ammo > 0)
    ) || null;
  }

  /**
   * Get available laser for point defense
   */
  getPointDefenseWeapon() {
    if (!this.ship.turrets) return null;
    return this.ship.turrets.find(t =>
      t.weapons?.some(w => w.includes('laser')) &&
      !t.disabled &&
      !t.usedThisRound &&
      !t.usedForPD
    ) || null;
  }

  /**
   * Get weapon name from turret
   */
  getWeaponName(turret) {
    if (!turret) return 'Unknown';
    if (turret.name) return turret.name;
    if (turret.weapons?.[0]) {
      return turret.weapons[0]
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }
    return 'Weapon';
  }

  /**
   * Reset all turrets for new round
   */
  resetTurrets() {
    if (!this.ship.turrets) return;
    for (const turret of this.ship.turrets) {
      turret.usedThisRound = false;
      turret.usedForPD = false;
    }
  }
}

module.exports = { GunnerEngine };
