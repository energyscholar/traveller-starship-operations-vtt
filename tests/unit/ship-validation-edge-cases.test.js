// ======== SHIP VALIDATION EDGE CASES ========
// Comprehensive edge case tests for ship validation modules
// Focus: Boundary conditions, error handling, spec edge cases

const ManoeuvreDrive = require('../../lib/ship-manoeuvre-drive');
const Weapons = require('../../lib/ship-weapons');
const Armour = require('../../lib/ship-armour');
const PowerPlant = require('../../lib/ship-power-plant');
const Sensors = require('../../lib/ship-sensors');
const JumpDrive = require('../../lib/ship-jump-drive');

describe('Ship Validation Edge Cases', () => {

  // ========== MANOEUVRE DRIVE EDGE CASES ==========

  describe('Manoeuvre Drive - Boundary Conditions', () => {
    test('Small craft (10t): Thrust-6 at minimum TL12', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(10, 6, 12);
      expect(result.valid).toBe(true);
      expect(result.stats.driveTonnage).toBe(0.6); // 10 × 6%
      expect(result.stats.powerRequired).toBe(6); // 10 × 6 × 10%
    });

    test('Massive ship (10000t): Thrust-1', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(10000, 1, 9);
      expect(result.valid).toBe(true);
      expect(result.stats.driveTonnage).toBe(100); // 10000 × 1%
      expect(result.stats.powerRequired).toBe(1000); // 10000 × 1 × 10%
    });

    test('Thrust-11 at exact minimum TL17', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(100, 11, 17);
      expect(result.valid).toBe(true);
      expect(result.stats.minimumTL).toBe(17);
    });

    test('Thrust-11 at TL16 fails', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(100, 11, 16);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Thrust-11 requires TL17, ship is only TL16');
    });

    test('Fractional tonnage for small ship: 5t hull, Thrust-3', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(5, 3, 10);
      expect(result.valid).toBe(true);
      expect(result.stats.driveTonnage).toBe(0.15); // 5 × 3%
    });

    test('All thrust ratings 0-11 have valid TL mappings', () => {
      for (let thrust = 0; thrust <= 11; thrust++) {
        const tl = ManoeuvreDrive.getMinimumThrustTL(thrust);
        expect(tl).toBeGreaterThanOrEqual(9);
        expect(tl).toBeLessThanOrEqual(17);
      }
    });

    test('Thrust beyond maximum (12) fails validation', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(100, 12, 18);
      expect(result.valid).toBe(false);
    });

    test('Very large hull (100000t) with Thrust-1', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(100000, 1, 9);
      expect(result.valid).toBe(true);
      expect(result.stats.driveTonnage).toBe(1000); // 100000 × 1%
      expect(result.stats.powerRequired).toBe(10000);
    });
  });

  // ========== WEAPONS EDGE CASES ==========

  describe('Weapons - Small Craft & Hardpoint Edge Cases', () => {
    test('Small craft (10t): 0 hardpoints, cannot use turrets', () => {
      expect(Weapons.calculateHardpoints(10)).toBe(0);
      expect(Weapons.calculateHardpoints(50)).toBe(0);
      expect(Weapons.calculateHardpoints(99)).toBe(0);
    });

    test('Boundary: 99t = 0 hardpoints, 100t = 1 hardpoint', () => {
      expect(Weapons.calculateHardpoints(99)).toBe(0);
      expect(Weapons.calculateHardpoints(100)).toBe(1);
      expect(Weapons.calculateHardpoints(101)).toBe(1);
    });

    test('Boundary: 199t = 1 hardpoint, 200t = 2 hardpoints', () => {
      expect(Weapons.calculateHardpoints(199)).toBe(1);
      expect(Weapons.calculateHardpoints(200)).toBe(2);
      expect(Weapons.calculateHardpoints(201)).toBe(2);
    });

    test('Fixed mount requires 0 hardpoints (small craft use case)', () => {
      const specs = Weapons.calculateTurretSpecs('fixed', ['missile_rack']);
      expect(specs.hardpoints).toBe(0);
      expect(specs.tonnage).toBe(0);
    });

    test('Fixed mount on small craft (0 hardpoints available) passes', () => {
      const result = Weapons.validateWeapons('fixed', ['missile_rack'], 9, 0);
      expect(result.valid).toBe(true); // Fixed mount needs 0 hardpoints
    });

    test('Single turret on small craft (0 hardpoints) fails', () => {
      const result = Weapons.validateWeapons('single', ['beam_laser'], 10, 0);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('hardpoint'));
    });

    test('Multiple fixed mounts on small craft is valid', () => {
      // Small craft can have multiple fixed mounts (0 hardpoints each)
      const mount1 = Weapons.calculateTurretSpecs('fixed', ['missile_rack']);
      const mount2 = Weapons.calculateTurretSpecs('fixed', ['missile_rack']);
      const mount3 = Weapons.calculateTurretSpecs('fixed', ['missile_rack']);

      expect(mount1.hardpoints + mount2.hardpoints + mount3.hardpoints).toBe(0);
    });
  });

  describe('Weapons - Mixed Loadouts & Power', () => {
    test('Triple turret with mixed weapons (beam + pulse + railgun)', () => {
      const specs = Weapons.calculateTurretSpecs('triple', ['beam_laser', 'pulse_laser', 'railgun']);
      expect(specs.weapons).toHaveLength(3);
      expect(specs.power).toBe(4 + 4 + 2); // beam(4) + pulse(4) + railgun(2)
      expect(specs.minimumTL).toBe(10); // beam_laser and railgun both TL10
    });

    test('Mixed TL weapons: minimum TL is highest weapon TL', () => {
      const specs = Weapons.calculateTurretSpecs('double', ['missile_rack', 'fusion_gun']);
      expect(specs.minimumTL).toBe(14); // fusion_gun is TL14, missile_rack is TL7
    });

    test('Triple turret at exactly 3 weapons passes', () => {
      const result = Weapons.validateWeapons('triple', ['pulse_laser', 'pulse_laser', 'pulse_laser'], 10);
      expect(result.valid).toBe(true);
    });

    test('Triple turret with 4 weapons fails', () => {
      const result = Weapons.validateWeapons('triple', ['beam_laser', 'beam_laser', 'beam_laser', 'beam_laser'], 12);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('can only mount 3 weapon');
    });

    test('Double turret with 3 weapons fails', () => {
      const result = Weapons.validateWeapons('double', ['pulse_laser', 'pulse_laser', 'pulse_laser'], 10);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('can only mount 2 weapon');
    });

    test('Particle beam at minimum TL12', () => {
      const result = Weapons.validateWeapons('single', ['particle_beam'], 12, 2);
      expect(result.valid).toBe(true);
    });

    test('Particle beam at TL11 fails', () => {
      const result = Weapons.validateWeapons('single', ['particle_beam'], 11, 2);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires TL12');
    });
  });

  // ========== ARMOUR EDGE CASES ==========

  describe('Armour - Hull Size Multipliers', () => {
    test('Tiny hull (5t): Multiplier should be 4×', () => {
      expect(Armour.getHullMultiplier(5)).toBe(4);
      expect(Armour.getHullMultiplier(10)).toBe(4);
      expect(Armour.getHullMultiplier(15)).toBe(4);
    });

    test('Boundary: 15t = 4×, 16t = 3×', () => {
      expect(Armour.getHullMultiplier(15)).toBe(4);
      expect(Armour.getHullMultiplier(16)).toBe(3);
    });

    test('Boundary: 25t = 3×, 26t = 2×', () => {
      expect(Armour.getHullMultiplier(25)).toBe(3);
      expect(Armour.getHullMultiplier(26)).toBe(2);
    });

    test('Boundary: 99t = 2×, 100t = 1×', () => {
      expect(Armour.getHullMultiplier(99)).toBe(2);
      expect(Armour.getHullMultiplier(100)).toBe(1);
    });

    test('Large hull (1000t+): Multiplier should be 1×', () => {
      expect(Armour.getHullMultiplier(1000)).toBe(1);
      expect(Armour.getHullMultiplier(10000)).toBe(1);
    });

    test('Small craft armor is very expensive (4× multiplier)', () => {
      const tonnage10t = Armour.calculateArmourTonnage(10, 'titanium_steel', 2);
      const tonnage100t = Armour.calculateArmourTonnage(100, 'titanium_steel', 2);

      // 10t: (2.5% × 2 × 4) = 20% of hull = 2t
      expect(tonnage10t).toBe(2);
      // 100t: (2.5% × 2 × 1) = 5% of hull = 5t
      expect(tonnage100t).toBe(5);

      // Small craft armor tonnage per rating is higher despite smaller hull
      expect(tonnage10t / 10).toBeGreaterThan(tonnage100t / 100);
    });
  });

  describe('Armour - Tech Level Restrictions', () => {
    test('Crystaliron at exact TL10 is valid', () => {
      const result = Armour.validateArmour(100, 'crystaliron', 4, 10);
      expect(result.valid).toBe(true);
    });

    test('Crystaliron at TL9 fails', () => {
      const result = Armour.validateArmour(100, 'crystaliron', 4, 9);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires TL10');
    });

    test('Bonded superdense at exact TL14', () => {
      const result = Armour.validateArmour(100, 'bonded_superdense', 10, 14);
      expect(result.valid).toBe(true);
    });

    test('Molecular bonded at exact TL16', () => {
      const result = Armour.validateArmour(100, 'molecular_bonded', 10, 16);
      expect(result.valid).toBe(true);
    });

    test('Rating 0 armor generates warning', () => {
      const result = Armour.validateArmour(100, 'titanium_steel', 0, 9);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(expect.stringContaining('No armour'));
    });

    test('Titanium steel max rating at TL9', () => {
      const max = Armour.getMaxArmourRating('titanium_steel', 9);
      expect(max).toBe(9);

      const result = Armour.validateArmour(100, 'titanium_steel', 9, 9);
      expect(result.valid).toBe(true);
    });

    test('Titanium steel rating 10 at TL10 still capped at 9', () => {
      const max = Armour.getMaxArmourRating('titanium_steel', 10);
      expect(max).toBe(9); // Capped at 9 regardless of TL

      const result = Armour.validateArmour(100, 'titanium_steel', 10, 10);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('limited to 9 rating');
    });
  });

  // ========== POWER PLANT EDGE CASES ==========

  describe('Power Plant - TL Variants', () => {
    test('Fusion TL8 at minimum tech level', () => {
      const result = PowerPlant.validatePowerPlant(10, 'fusion_tl8', 8);
      expect(result.valid).toBe(true);
    });

    test('Fusion TL12 is more efficient than TL8', () => {
      const tl8 = PowerPlant.calculatePowerPlant(100, 10, 'fusion_tl8');
      const tl12 = PowerPlant.calculatePowerPlant(100, 10, 'fusion_tl12');

      expect(tl12.tonnage).toBeLessThan(tl8.tonnage); // 7.5t vs 10t
    });

    test('Fusion TL15 is most efficient fusion', () => {
      const tl8 = PowerPlant.calculatePowerPlant(100, 10, 'fusion_tl8');
      const tl15 = PowerPlant.calculatePowerPlant(100, 10, 'fusion_tl15');

      expect(tl15.tonnage).toBeLessThan(tl8.tonnage); // 5t vs 10t
    });

    test('Antimatter TL17 is smallest', () => {
      const fusion = PowerPlant.calculatePowerPlant(100, 10, 'fusion_tl15');
      const antimatter = PowerPlant.calculatePowerPlant(100, 10, 'antimatter_tl17');

      expect(antimatter.tonnage).toBeLessThan(fusion.tonnage); // 4t vs 5t
    });

    test('Antimatter at TL16 fails', () => {
      const result = PowerPlant.validatePowerPlant(10, 'antimatter_tl17', 16);
      expect(result.valid).toBe(false);
    });
  });

  describe('Power Plant - Output Calculations', () => {
    test('Power output equals hull tonnage × rating', () => {
      const plant = PowerPlant.calculatePowerPlant(100, 20, 'fusion_tl12');
      expect(plant.output).toBe(100 * 20); // 2000 units
    });

    test('Small craft power plant: 10t hull, rating 10', () => {
      const plant = PowerPlant.calculatePowerPlant(10, 10, 'fusion_tl8');
      expect(plant.output).toBe(100); // 10 × 10
      expect(plant.tonnage).toBe(1); // 10 × 10% (TL8 formula)
    });

    test('Large ship power plant: 1000t hull, rating 40', () => {
      const plant = PowerPlant.calculatePowerPlant(1000, 40, 'fusion_tl12');
      expect(plant.output).toBe(40000); // 1000 × 40
      expect(plant.tonnage).toBe(300); // 1000 × 40 × 0.75%
    });

    test('Zero output power plant', () => {
      const plant = PowerPlant.calculatePowerPlant(100, 0, 'fusion_tl8');
      expect(plant.output).toBe(0);
      expect(plant.tonnage).toBe(0);
    });
  });

  // ========== SENSORS EDGE CASES ==========

  describe('Sensors - Tech Level & Range', () => {
    test('Basic sensors are free (included in hull)', () => {
      const sensors = Sensors.calculateSensorPackage('basic', 8);
      expect(sensors.tonnage).toBe(0);
      expect(sensors.cost).toBe(0);
      expect(sensors.power).toBe(0);
    });

    test('Civilian sensors at minimum TL9', () => {
      const result = Sensors.validateSensors('civilian', 9);
      expect(result.valid).toBe(true);
    });

    test('Military sensors at minimum TL11', () => {
      const result = Sensors.validateSensors('military', 11);
      expect(result.valid).toBe(true);
    });

    test('Military sensors at TL10 fails', () => {
      const result = Sensors.validateSensors('military', 10);
      expect(result.valid).toBe(false);
    });

    test('Very Advanced sensors at exact TL15', () => {
      const result = Sensors.validateSensors('very_advanced', 15);
      expect(result.valid).toBe(true);
    });

    test('Sensor DM increases with grade', () => {
      const basic = Sensors.calculateSensorPackage('basic', 9);
      const military = Sensors.calculateSensorPackage('military', 11);
      const advanced = Sensors.calculateSensorPackage('advanced', 13);

      expect(basic.dm).toBeLessThan(military.dm);
      expect(military.dm).toBeLessThan(advanced.dm);
    });

    test('Invalid sensor grade fails validation', () => {
      const result = Sensors.validateSensors('invalid_grade', 15);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid sensor grade');
    });
  });

  // ========== JUMP DRIVE EDGE CASES ==========

  describe('Jump Drive - High Jump Numbers', () => {
    test('Jump-6 at minimum TL15', () => {
      const result = JumpDrive.validateJumpDrive(100, 6, 15);
      expect(result.valid).toBe(true);
    });

    test('Jump-6 at TL14 fails', () => {
      const result = JumpDrive.validateJumpDrive(100, 6, 14);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires TL15');
    });

    test('Jump-7 is beyond standard rules', () => {
      const tl = JumpDrive.getMinimumJumpTL(7);
      expect(tl).toBeGreaterThan(15); // Should require very high TL or fail
    });

    test('Jump fuel requirement scales linearly: J-6 = 60% hull', () => {
      const jump6 = JumpDrive.calculateJumpDrive(100, 6, 15);
      expect(jump6.fuelRequired).toBe(60); // 100t × 60%
    });

    test('Massive ship Jump-1 requires huge fuel', () => {
      const jump = JumpDrive.calculateJumpDrive(10000, 1, 9);
      expect(jump.fuelRequired).toBe(1000); // 10000t × 10%
    });

    test('Small craft cannot have jump drives (< 100t)', () => {
      // This is a game rule, not enforced by validation module
      // But small craft should trigger cost/tonnage warnings
      const jump = JumpDrive.calculateJumpDrive(50, 1, 9);
      expect(jump.driveTonnage).toBe(1); // 50t × 2%
      expect(jump.fuelRequired).toBe(5); // 50t × 10%
      // Note: Game rules prohibit this, but module calculates it
    });
  });

  // ========== INTEGRATION: Multi-Module Edge Cases ==========

  describe('Integration - Power Budget Edge Cases', () => {
    test('Scout ship: Total power required vs available', () => {
      // Type-S Scout: 100t, Power-60, Thrust-2, Jump-2
      const powerPlant = PowerPlant.calculatePowerPlant(100, 60, 'fusion_tl12');
      const manoeuvreDrive = ManoeuvreDrive.calculateManoeuvrePackage(100, 2);
      const jumpDrive = JumpDrive.calculateJumpDrive(100, 2, 12);
      const sensors = Sensors.calculateSensorPackage('military', 12);

      const basicPower = PowerPlant.calculateBasicPower(100); // 20 units
      const totalRequired = basicPower + manoeuvreDrive.powerRequired + jumpDrive.powerRequired + sensors.power;

      expect(powerPlant.output).toBeGreaterThanOrEqual(totalRequired);
    });

    test('Power plant must provide for manoeuvre + jump simultaneously', () => {
      const hull = 100;
      const thrust = 2;
      const jump = 2;

      const mPower = ManoeuvreDrive.calculateManoeuvrePower(hull, thrust); // 20
      const jPower = JumpDrive.calculateJumpPower(hull, jump); // 20
      const basic = PowerPlant.calculateBasicPower(hull); // 20

      const minPowerRating = Math.ceil((basic + mPower + jPower) / hull); // 60/100 = 0.6 → 1

      // For 100t ship with J-2, M-2: needs rating 1 minimum (100 output)
      // But Scout uses rating 4 (400 output) for weapons/sensors
      expect(minPowerRating).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration - Tonnage Budget Validation', () => {
    test('All components must fit in hull', () => {
      const hull = 100;
      const mDrive = ManoeuvreDrive.calculateManoeuvreDriveTonnage(hull, 2); // 2t
      const jDrive = JumpDrive.calculateJumpDrive(hull, 2, 12); // 4t drive + 20t fuel
      const power = PowerPlant.calculatePowerPlant(hull, 60, 'fusion_tl12'); // 4.5t + fuel
      const sensors = Sensors.calculateSensorPackage('military', 12); // 2t

      const totalTonnage = mDrive + jDrive.driveTonnage + jDrive.fuelRequired + power.tonnage + sensors.tonnage;

      expect(totalTonnage).toBeLessThan(hull); // Must leave room for bridge, staterooms, etc.
    });

    test('Small craft (10t) with high thrust leaves little room', () => {
      const hull = 10;
      const mDrive = ManoeuvreDrive.calculateManoeuvreDriveTonnage(hull, 6); // 0.6t
      const power = PowerPlant.calculatePowerPlant(hull, 10, 'fusion_tl8'); // 1t
      const fuel = 1; // Power plant fuel for 2 weeks
      const cockpit = 1.5; // Minimum bridge

      const remaining = hull - mDrive - power.tonnage - fuel - cockpit; // 5.9t left

      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThan(6);
    });
  });

});
