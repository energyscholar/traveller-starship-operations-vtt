/**
 * Tests for GunnerEngine
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { GunnerEngine } = require('../../../lib/engine/roles/gunner-engine');
const { EventBus } = require('../../../lib/engine/event-bus');

describe('GunnerEngine', () => {
  let engine;
  let mockShip;
  let mockRng;
  let eventBus;

  beforeEach(() => {
    mockShip = {
      id: 'ship-1',
      name: 'Test Ship',
      crew: { gunnery: 2 },
      turrets: [
        {
          id: 'turret-1',
          name: 'Pulse Laser',
          weapons: ['pulse_laser'],
          usedThisRound: false
        },
        {
          id: 'turret-2',
          name: 'Beam Laser',
          weapons: ['beam_laser'],
          usedThisRound: false
        },
        {
          id: 'turret-3',
          name: 'Missile Rack',
          weapons: ['missile'],
          ammo: 6,
          usedThisRound: false
        }
      ]
    };

    mockRng = {
      roll1d6: () => 3,
      roll2d6: () => 8  // Hits on 8+
    };

    eventBus = new EventBus();
    engine = new GunnerEngine(mockShip, { eventBus, rng: mockRng });
  });

  describe('constructor', () => {
    it('should set role to gunner', () => {
      assert.strictEqual(engine.role, 'gunner');
    });

    it('should have fire_primary as default action', () => {
      const def = engine.getDefaultAction();
      assert.strictEqual(def.id, 'fire_primary');
    });
  });

  describe('fire_primary action', () => {
    it('should fire first available turret', () => {
      const result = engine.execute('fire_primary');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.action, 'fire');
      assert.strictEqual(result.weapon, 'Pulse Laser');
    });

    it('should mark turret as used', () => {
      engine.execute('fire_primary');
      assert.strictEqual(mockShip.turrets[0].usedThisRound, true);
    });

    it('should emit event', () => {
      let emitted = null;
      eventBus.subscribe('gunner:fire_primary', (e) => { emitted = e; });

      engine.execute('fire_primary');
      assert.ok(emitted);
      assert.strictEqual(emitted.data.action, 'fire_primary');
    });

    it('should skip sandcaster for primary', () => {
      mockShip.turrets[0].weapons = ['sandcaster'];
      const result = engine.execute('fire_primary');

      assert.strictEqual(result.weapon, 'Beam Laser');
    });
  });

  describe('fire_secondary action', () => {
    it('should fire second turret', () => {
      const result = engine.execute('fire_secondary');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.weapon, 'Beam Laser');
    });

    it('should fail if only one turret', () => {
      mockShip.turrets = [mockShip.turrets[0]];
      const result = engine.execute('fire_secondary');

      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('secondary'));
    });

    it('should not be available if first turret is only option', () => {
      mockShip.turrets = [mockShip.turrets[0]];
      assert.strictEqual(engine.canFireSecondary(), false);
    });
  });

  describe('fire_missiles action', () => {
    it('should fire missile mount', () => {
      const result = engine.execute('fire_missiles');

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.weapon, 'Missile Rack');
    });

    it('should fail without missiles', () => {
      mockShip.turrets = mockShip.turrets.filter(t =>
        !t.weapons.includes('missile')
      );
      const result = engine.execute('fire_missiles');

      assert.strictEqual(result.success, false);
    });

    it('should fail when out of ammo', () => {
      mockShip.turrets[2].ammo = 0;
      const result = engine.execute('fire_missiles');

      assert.strictEqual(result.success, false);
    });
  });

  describe('point_defense action', () => {
    it('should attempt intercept with available laser', () => {
      const result = engine.execute('point_defense', {
        incomingMissile: { id: 'missile-1' }
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.action, 'point_defense');
      assert.ok(result.check);
    });

    it('should mark turret as used for PD', () => {
      engine.execute('point_defense', {
        incomingMissile: { id: 'missile-1' }
      });

      const pdTurret = mockShip.turrets.find(t => t.usedForPD);
      assert.ok(pdTurret);
    });

    it('should fail without incoming missile', () => {
      const result = engine.execute('point_defense');

      assert.strictEqual(result.success, false);
      assert.ok(result.error.includes('incoming'));
    });

    it('should fail if all lasers already used', () => {
      mockShip.turrets[0].usedThisRound = true;
      mockShip.turrets[1].usedThisRound = true;

      const result = engine.execute('point_defense', {
        incomingMissile: { id: 'missile-1' }
      });

      assert.strictEqual(result.success, false);
    });
  });

  describe('turret management', () => {
    it('should get usable turrets (not disabled, not used)', () => {
      mockShip.turrets[0].usedThisRound = true;
      mockShip.turrets[1].disabled = true;

      const usable = engine.getUsableTurrets();
      assert.strictEqual(usable.length, 1);
      assert.strictEqual(usable[0].id, 'turret-3');
    });

    it('should reset turrets for new round', () => {
      mockShip.turrets[0].usedThisRound = true;
      mockShip.turrets[1].usedForPD = true;

      engine.resetTurrets();

      assert.strictEqual(mockShip.turrets[0].usedThisRound, false);
      assert.strictEqual(mockShip.turrets[1].usedForPD, false);
    });
  });

  describe('getAvailableActions', () => {
    it('should include all weapon actions when turrets available', () => {
      const actions = engine.getAvailableActions();
      const ids = actions.map(a => a.id);

      assert.ok(ids.includes('fire_primary'));
      assert.ok(ids.includes('fire_secondary'));
      assert.ok(ids.includes('fire_missiles'));
      assert.ok(ids.includes('point_defense'));
    });

    it('should exclude used weapons', () => {
      mockShip.turrets[0].usedThisRound = true;
      mockShip.turrets[1].usedThisRound = true;
      mockShip.turrets[2].usedThisRound = true;

      const actions = engine.getAvailableActions();
      const ids = actions.map(a => a.id);

      // All weapons used, so no fire actions available
      assert.ok(!ids.includes('fire_primary'));
      assert.ok(!ids.includes('fire_secondary'));
      assert.ok(!ids.includes('fire_missiles'));
    });
  });

  describe('weapon name formatting', () => {
    it('should use turret name if available', () => {
      const name = engine.getWeaponName(mockShip.turrets[0]);
      assert.strictEqual(name, 'Pulse Laser');
    });

    it('should format weapon type if no name', () => {
      const turret = { weapons: ['beam_laser'] };
      const name = engine.getWeaponName(turret);
      assert.strictEqual(name, 'Beam Laser');
    });

    it('should return Unknown for null turret', () => {
      assert.strictEqual(engine.getWeaponName(null), 'Unknown');
    });
  });

  describe('combat engine integration', () => {
    it('should delegate to combat engine when provided', () => {
      let attackResolved = false;
      const mockCombatEngine = {
        resolveAttack: (attacker, defender, options) => {
          attackResolved = true;
          return { hit: true, damage: 5 };
        }
      };

      engine = new GunnerEngine(mockShip, {
        combatEngine: mockCombatEngine,
        rng: mockRng
      });

      const target = { id: 'enemy', name: 'Enemy Ship' };
      const result = engine.execute('fire_primary', { target });

      assert.ok(attackResolved);
      assert.strictEqual(result.hit, true);
      assert.strictEqual(result.damage, 5);
    });
  });
});
