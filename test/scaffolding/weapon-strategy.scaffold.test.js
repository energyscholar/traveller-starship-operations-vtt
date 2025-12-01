/**
 * Weapon Strategy Pattern Scaffolding Tests
 *
 * These tests verify the Strategy Pattern implementation for weapon attacks.
 * They will be removed after the design pattern refactor is complete.
 *
 * @see .claude/DESIGN-PATTERN-REFACTOR.md Stage 3
 */

const {
  BaseWeaponStrategy,
  RANGE_DM,
  LaserStrategy,
  PulseLaserStrategy,
  BeamLaserStrategy,
  MissileStrategy,
  LONG_RANGES,
  SandcasterStrategy,
  ALLOWED_RANGES,
  PointDefenseStrategy,
  WeaponContext,
  WEAPON_STRATEGIES,
  TYPE_ALIASES
} = require('../../lib/weapons/strategies');

describe('Weapon Strategy Pattern - Scaffolding Tests', () => {
  describe('BaseWeaponStrategy', () => {
    test('cannot be used directly for attacks', () => {
      const base = new BaseWeaponStrategy('Test');
      expect(() => base.resolve({})).toThrow('must be implemented');
    });

    test('provides range DM lookup', () => {
      const base = new BaseWeaponStrategy('Test');
      expect(base.getRangeDM('Adjacent')).toBe(2);
      expect(base.getRangeDM('Close')).toBe(0);
      expect(base.getRangeDM('Short')).toBe(-1);
      expect(base.getRangeDM('Medium')).toBe(-2);
      expect(base.getRangeDM('Long')).toBe(-2);
      expect(base.getRangeDM('Very Long')).toBe(-4);
      expect(base.getRangeDM('Distant')).toBe(-4);
    });

    test('checks range restrictions', () => {
      const base = new BaseWeaponStrategy('Test');

      // No restriction = can fire anywhere
      expect(base.canFireAtRange({}, 'Long')).toBe(true);

      // With restriction
      const weapon = { rangeRestriction: ['adjacent', 'close', 'medium'] };
      expect(base.canFireAtRange(weapon, 'Close')).toBe(true);
      expect(base.canFireAtRange(weapon, 'Long')).toBe(false);
    });

    test('rolls attack dice correctly', () => {
      const base = new BaseWeaponStrategy('Test');
      const result = base.rollAttack({
        gunnerSkill: 2,
        range: 'Medium',
        dodgeDM: 1
      });

      expect(result).toHaveProperty('roll');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hit');
      expect(result).toHaveProperty('effect');
      expect(result).toHaveProperty('modifiers');
      expect(result.modifiers.gunnerSkill).toBe(2);
      expect(result.modifiers.rangeDM).toBe(-2);
      expect(result.modifiers.dodgeDM).toBe(1);
    });

    test('rolls damage correctly', () => {
      const base = new BaseWeaponStrategy('Test');
      const result = base.rollDamage('3d6', 2, 5);

      expect(result).toHaveProperty('damage');
      expect(result).toHaveProperty('roll');
      expect(result).toHaveProperty('rawDamage');
      expect(result.effect).toBe(2);
      expect(result.armor).toBe(5);
      expect(result.damage).toBeGreaterThanOrEqual(0);
    });

    test('creates miss result', () => {
      const base = new BaseWeaponStrategy('Test');
      const miss = base.createMissResult({ total: 5 });
      expect(miss.hit).toBe(false);
      expect(miss.damage).toBe(0);
    });

    test('creates hit result', () => {
      const base = new BaseWeaponStrategy('Test');
      const hit = base.createHitResult(
        { total: 10, effect: 2 },
        { damage: 8 }
      );
      expect(hit.hit).toBe(true);
      expect(hit.damage).toBe(8);
    });
  });

  describe('LaserStrategy', () => {
    test('resolves laser attacks', () => {
      const strategy = new LaserStrategy();
      expect(strategy.name).toBe('Laser');

      const result = strategy.resolve({
        weapon: { type: 'laser', damage: '2d6' },
        range: 'Medium',
        defender: { armor: 2 },
        gunnerSkill: 1
      });

      expect(result).toHaveProperty('hit');
      expect(result).toHaveProperty('damage');
      expect(result.weapon).toBe('Laser');
    });

    test('blocks out-of-range attacks', () => {
      const strategy = new LaserStrategy();
      const result = strategy.resolve({
        weapon: { type: 'beam_laser', damage: '3d6', rangeRestriction: ['adjacent', 'close', 'medium'] },
        range: 'Long',
        defender: { armor: 2 },
        gunnerSkill: 1
      });

      expect(result.hit).toBe(false);
      expect(result.blocked).toBe(true);
    });
  });

  describe('PulseLaserStrategy', () => {
    test('uses correct name', () => {
      const strategy = new PulseLaserStrategy();
      expect(strategy.name).toBe('Pulse Laser');
    });
  });

  describe('BeamLaserStrategy', () => {
    test('uses correct name', () => {
      const strategy = new BeamLaserStrategy();
      expect(strategy.name).toBe('Beam Laser');
    });
  });

  describe('MissileStrategy', () => {
    test('launches missiles without attack roll', () => {
      const strategy = new MissileStrategy();
      expect(strategy.name).toBe('Missile');

      const result = strategy.resolve({
        attacker: { ammo: { missiles: 5 } },
        weapon: { type: 'missile' },
        range: 'Long'
      });

      expect(result.launched).toBe(true);
      expect(result.tracking).toBe(true);
      expect(result.hit).toBe(false); // Not hit yet - tracking
    });

    test('blocks launch without ammo', () => {
      const strategy = new MissileStrategy();
      const result = strategy.resolve({
        attacker: { ammo: { missiles: 0 } },
        weapon: { type: 'missile' },
        range: 'Medium'
      });

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('No missiles');
    });

    test('gives range bonus at long ranges', () => {
      const strategy = new MissileStrategy();
      expect(strategy.getMissileRangeBonus('Long')).toBe(2);
      expect(strategy.getMissileRangeBonus('Very Long')).toBe(2);
      expect(strategy.getMissileRangeBonus('Distant')).toBe(2);
      expect(strategy.getMissileRangeBonus('Medium')).toBe(0);
    });

    test('resolves missile impact', () => {
      const strategy = new MissileStrategy();
      const result = strategy.resolveImpact({
        defender: { armor: 4 },
        sandcasterResult: { armorBonus: 3 }
      });

      expect(result.hit).toBe(true);
      expect(result.sandcasterBonus).toBe(3);
      expect(result).toHaveProperty('damage');
    });
  });

  describe('SandcasterStrategy', () => {
    test('resolves sandcaster defense', () => {
      const strategy = new SandcasterStrategy();
      expect(strategy.name).toBe('Sandcaster');

      const result = strategy.resolve({
        defender: { ammo: { sandcaster: 5 } },
        gunnerSkill: 1,
        attackType: 'laser'
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('armorBonus');
      expect(result.ammoUsed).toBe(1);
    });

    test('fails without ammo', () => {
      const strategy = new SandcasterStrategy();
      const result = strategy.resolve({
        defender: { ammo: { sandcaster: 0 } },
        gunnerSkill: 1
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('no_ammo');
    });

    test('only works at close ranges', () => {
      const strategy = new SandcasterStrategy();
      expect(strategy.canUseAtRange('Adjacent')).toBe(true);
      expect(strategy.canUseAtRange('Close')).toBe(true);
      expect(strategy.canUseAtRange('Medium')).toBe(false);
      expect(strategy.canUseAtRange('Long')).toBe(false);
    });
  });

  describe('PointDefenseStrategy', () => {
    test('resolves point defense', () => {
      const strategy = new PointDefenseStrategy();
      expect(strategy.name).toBe('Point Defense');

      const result = strategy.resolve({
        missile: { id: 'missile_1', status: 'tracking' },
        gunnerSkill: 2
      });

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('destroyed');
      expect(result).toHaveProperty('roll');
      expect(result).toHaveProperty('total');
    });

    test('fails without missile target', () => {
      const strategy = new PointDefenseStrategy();
      const result = strategy.resolve({
        gunnerSkill: 2
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('no_missile');
    });

    test('fails on inactive missile', () => {
      const strategy = new PointDefenseStrategy();
      const result = strategy.resolve({
        missile: { id: 'missile_1', status: 'destroyed' },
        gunnerSkill: 2
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('missile_not_active');
    });
  });

  describe('WeaponContext', () => {
    let ctx;

    beforeEach(() => {
      ctx = new WeaponContext();
    });

    test('selects correct strategy for weapon type', () => {
      expect(ctx.getStrategy('pulse_laser').name).toBe('Pulse Laser');
      expect(ctx.getStrategy('beam_laser').name).toBe('Beam Laser');
      expect(ctx.getStrategy('missile').name).toBe('Missile');
      expect(ctx.getStrategy('sandcaster').name).toBe('Sandcaster');
      expect(ctx.getStrategy('point_defense').name).toBe('Point Defense');
    });

    test('normalizes weapon type strings', () => {
      expect(ctx.normalizeType('Pulse Laser')).toBe('pulse_laser');
      expect(ctx.normalizeType('beam-laser')).toBe('beam_laser');
      expect(ctx.normalizeType('MISSILES')).toBe('missile');
      expect(ctx.normalizeType('pd')).toBe('point_defense');
    });

    test('attacks using appropriate strategy', () => {
      const result = ctx.attack({
        weapon: { type: 'pulse_laser', damage: '2d6' },
        attacker: {},
        defender: { armor: 2 },
        range: 'Medium',
        gunnerSkill: 1
      });

      expect(result).toHaveProperty('hit');
      expect(result).toHaveProperty('damage');
    });

    test('launches missiles', () => {
      const result = ctx.launchMissile({
        attacker: { ammo: { missiles: 5 } },
        weapon: { type: 'missile' },
        range: 'Long'
      });

      expect(result.launched).toBe(true);
    });

    test('uses sandcaster', () => {
      const result = ctx.useSandcaster({
        defender: { ammo: { sandcaster: 5 } },
        gunnerSkill: 1
      });

      expect(result).toHaveProperty('armorBonus');
    });

    test('uses point defense', () => {
      const result = ctx.usePointDefense({
        missile: { id: 'missile_1', status: 'tracking' },
        gunnerSkill: 2
      });

      expect(result.success).toBe(true);
    });

    test('checks weapon range validity', () => {
      expect(ctx.canFireAtRange({ type: 'pulse_laser' }, 'Long')).toBe(true);

      const beamLaser = {
        type: 'beam_laser',
        rangeRestriction: ['adjacent', 'close', 'medium']
      };
      expect(ctx.canFireAtRange(beamLaser, 'Close')).toBe(true);
      expect(ctx.canFireAtRange(beamLaser, 'Long')).toBe(false);
    });

    test('checks sandcaster range', () => {
      expect(ctx.canUseSandcasterAtRange('Close')).toBe(true);
      expect(ctx.canUseSandcasterAtRange('Long')).toBe(false);
    });

    test('lists available weapon types', () => {
      const types = ctx.getAvailableTypes();
      expect(types).toContain('laser');
      expect(types).toContain('pulse_laser');
      expect(types).toContain('missile');
      expect(types).toContain('sandcaster');
      expect(types).toContain('point_defense');
    });
  });

  describe('Constants', () => {
    test('RANGE_DM has all range bands', () => {
      expect(RANGE_DM).toHaveProperty('Adjacent');
      expect(RANGE_DM).toHaveProperty('Close');
      expect(RANGE_DM).toHaveProperty('Short');
      expect(RANGE_DM).toHaveProperty('Medium');
      expect(RANGE_DM).toHaveProperty('Long');
      expect(RANGE_DM).toHaveProperty('Very Long');
      expect(RANGE_DM).toHaveProperty('Distant');
    });

    test('LONG_RANGES for missile bonus', () => {
      expect(LONG_RANGES).toContain('Long');
      expect(LONG_RANGES).toContain('Very Long');
      expect(LONG_RANGES).toContain('Distant');
    });

    test('ALLOWED_RANGES for sandcaster', () => {
      expect(ALLOWED_RANGES).toContain('Adjacent');
      expect(ALLOWED_RANGES).toContain('Close');
      expect(ALLOWED_RANGES.length).toBe(2);
    });

    test('WEAPON_STRATEGIES has all strategies', () => {
      expect(Object.keys(WEAPON_STRATEGIES).length).toBeGreaterThanOrEqual(6);
    });

    test('TYPE_ALIASES normalize weapon names', () => {
      expect(TYPE_ALIASES['pulse laser']).toBe('pulse_laser');
      expect(TYPE_ALIASES['missiles']).toBe('missile');
    });
  });
});
