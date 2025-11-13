// ======== SHIP WEAPONS MODULE UNIT TESTS ========

const Weapons = require('../../lib/ship-weapons');

describe('Ship Weapons Calculations', () => {

  describe('calculateHardpoints', () => {
    test('100t hull = 1 hardpoint', () => {
      expect(Weapons.calculateHardpoints(100)).toBe(1);
    });

    test('200t hull = 2 hardpoints', () => {
      expect(Weapons.calculateHardpoints(200)).toBe(2);
    });

    test('400t hull = 4 hardpoints', () => {
      expect(Weapons.calculateHardpoints(400)).toBe(4);
    });

    test('50t hull = 0 hardpoints', () => {
      expect(Weapons.calculateHardpoints(50)).toBe(0);
    });
  });

  describe('calculateTurretSpecs', () => {
    test('Empty single turret', () => {
      const specs = Weapons.calculateTurretSpecs('single', []);
      expect(specs.tonnage).toBe(1);
      expect(specs.cost).toBe(200000);
      expect(specs.power).toBe(0);
      expect(specs.weapons).toHaveLength(0);
    });

    test('Double turret with 2 beam lasers', () => {
      const specs = Weapons.calculateTurretSpecs('double', ['beam_laser', 'beam_laser']);
      expect(specs.tonnage).toBe(1);
      expect(specs.cost).toBe(500000 + 500000 + 500000); // turret + 2 weapons
      expect(specs.power).toBe(8); // 4 + 4
      expect(specs.weapons).toHaveLength(2);
    });

    test('Fixed mount with pulse laser', () => {
      const specs = Weapons.calculateTurretSpecs('fixed', ['pulse_laser']);
      expect(specs.tonnage).toBe(0);
      expect(specs.cost).toBe(100000 + 1000000);
      expect(specs.power).toBe(4);
    });

    test('Triple turret with 3 pulse lasers', () => {
      const specs = Weapons.calculateTurretSpecs('triple', ['pulse_laser', 'pulse_laser', 'pulse_laser']);
      expect(specs.tonnage).toBe(1);
      expect(specs.power).toBe(12); // 4 + 4 + 4
    });

    test('Invalid turret type throws error', () => {
      expect(() => Weapons.calculateTurretSpecs('invalid', [])).toThrow('Invalid turret type');
    });

    test('Invalid weapon throws error', () => {
      expect(() => Weapons.calculateTurretSpecs('single', ['invalid_weapon'])).toThrow('Invalid weapon');
    });
  });

  describe('validateWeapons', () => {
    test('Valid single turret with beam laser', () => {
      const result = Weapons.validateWeapons('single', ['beam_laser'], 12, 2);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.tonnage).toBe(1);
      expect(result.stats.power).toBe(4);
    });

    test('Too many weapons in single turret fails', () => {
      const result = Weapons.validateWeapons('single', ['beam_laser', 'pulse_laser'], 12);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('can only mount 1 weapon');
    });

    test('Insufficient TL fails', () => {
      const result = Weapons.validateWeapons('single', ['fusion_gun'], 12, 2);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires TL14');
    });

    test('Invalid turret type fails', () => {
      const result = Weapons.validateWeapons('invalid', [], 12);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid turret type');
    });

    test('No hardpoints available fails', () => {
      const result = Weapons.validateWeapons('single', ['beam_laser'], 12, 0);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires 1 hardpoint');
    });

    test('Empty turret generates warning', () => {
      const result = Weapons.validateWeapons('double', [], 12, 2);
      expect(result.warnings).toContainEqual(expect.stringContaining('Empty turret'));
    });

    test('Pop-up turret generates info warning', () => {
      const result = Weapons.validateWeapons('popup', ['beam_laser'], 12, 2);
      expect(result.warnings).toContainEqual(expect.stringContaining('Pop-up turret'));
    });
  });

  describe('calculateWeaponsPackage', () => {
    test('100t hull with 1 double turret (2 beam lasers)', () => {
      const pkg = Weapons.calculateWeaponsPackage(100, [
        { type: 'double', weapons: ['beam_laser', 'beam_laser'] }
      ]);
      expect(pkg.hardpointsAvailable).toBe(1);
      expect(pkg.hardpointsUsed).toBe(1);
      expect(pkg.hardpointsRemaining).toBe(0);
      expect(pkg.turrets).toHaveLength(1);
      expect(pkg.totalTonnage).toBe(1);
      expect(pkg.totalPower).toBe(8);
    });

    test('400t hull with 4 triple turrets', () => {
      const configs = Array(4).fill({ type: 'triple', weapons: ['pulse_laser'] });
      const pkg = Weapons.calculateWeaponsPackage(400, configs);
      expect(pkg.hardpointsAvailable).toBe(4);
      expect(pkg.hardpointsUsed).toBe(4);
      expect(pkg.totalTonnage).toBe(4);
    });

    test('Empty configuration', () => {
      const pkg = Weapons.calculateWeaponsPackage(200, []);
      expect(pkg.hardpointsAvailable).toBe(2);
      expect(pkg.hardpointsUsed).toBe(0);
      expect(pkg.turrets).toHaveLength(0);
    });
  });

  describe('Weapon Specifications', () => {
    test('Beam laser: TL10, 4 power, MCr 0.5', () => {
      const weapon = Weapons.WEAPONS.beam_laser;
      expect(weapon.tl).toBe(10);
      expect(weapon.power).toBe(4);
      expect(weapon.cost).toBe(500000);
    });

    test('Missile rack: TL7, 0 power, 12 ammo', () => {
      const weapon = Weapons.WEAPONS.missile_rack;
      expect(weapon.tl).toBe(7);
      expect(weapon.power).toBe(0);
      expect(weapon.ammo).toBe(12);
    });

    test('Fusion gun: TL14, 12 power, 4d6 damage', () => {
      const weapon = Weapons.WEAPONS.fusion_gun;
      expect(weapon.tl).toBe(14);
      expect(weapon.power).toBe(12);
      expect(weapon.damage).toBe('4d6');
    });
  });

  describe('Integration Tests - Real Ship Specs', () => {
    test('Type-S Scout: 1 empty double turret', () => {
      const pkg = Weapons.calculateWeaponsPackage(100, [
        { type: 'double', weapons: [] }
      ]);
      expect(pkg.hardpointsAvailable).toBe(1);
      expect(pkg.totalTonnage).toBe(1);
      expect(pkg.totalPower).toBe(0);
    });

    test('Type-A2 Far Trader: 2 double turrets with beam lasers', () => {
      const pkg = Weapons.calculateWeaponsPackage(200, [
        { type: 'double', weapons: ['beam_laser', 'beam_laser'] },
        { type: 'double', weapons: ['beam_laser', 'beam_laser'] }
      ]);
      expect(pkg.hardpointsUsed).toBe(2);
      expect(pkg.totalTonnage).toBe(2);
      expect(pkg.totalPower).toBe(16); // 4×4
    });

    test('Patrol Corvette: 4 turrets mix', () => {
      const pkg = Weapons.calculateWeaponsPackage(400, [
        { type: 'triple', weapons: ['pulse_laser', 'pulse_laser', 'pulse_laser'] },
        { type: 'double', weapons: ['missile_rack', 'sandcaster'] },
        { type: 'single', weapons: ['particle_beam'] },
        { type: 'double', weapons: ['beam_laser', 'beam_laser'] }
      ]);
      expect(pkg.hardpointsUsed).toBe(4);
      expect(pkg.turrets).toHaveLength(4);
    });
  });

});
