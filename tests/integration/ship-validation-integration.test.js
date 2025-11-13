// ======== SHIP VALIDATION INTEGRATION TESTS ========
// Tests complete ship validation using all modules together

const ShipValidation = require('../../lib/index');

describe('Ship Validation Integration', () => {

  describe('Module Exports', () => {
    test('All modules are exported', () => {
      expect(ShipValidation.JumpDrive).toBeDefined();
      expect(ShipValidation.ManoeuvreDrive).toBeDefined();
      expect(ShipValidation.PowerPlant).toBeDefined();
      expect(ShipValidation.Sensors).toBeDefined();
      expect(ShipValidation.Bridge).toBeDefined();
      expect(ShipValidation.Staterooms).toBeDefined();
      expect(ShipValidation.Weapons).toBeDefined();
      expect(ShipValidation.Armour).toBeDefined();
    });

    test('Validators object provides quick access', () => {
      expect(ShipValidation.validators.validateJumpDrive).toBeDefined();
      expect(ShipValidation.validators.validateManoeuvreDrive).toBeDefined();
      expect(ShipValidation.validators.validatePowerPlant).toBeDefined();
      expect(ShipValidation.validators.validateSensors).toBeDefined();
    });

    test('Packages object provides calculators', () => {
      expect(ShipValidation.packages.calculateJumpPackage).toBeDefined();
      expect(ShipValidation.packages.calculateManoeuvrePackage).toBeDefined();
      expect(ShipValidation.packages.calculatePowerPackage).toBeDefined();
    });

    test('Utils object provides helpers', () => {
      expect(ShipValidation.utils.calculateHardpoints).toBeDefined();
      expect(ShipValidation.utils.calculateBasicPower).toBeDefined();
      expect(ShipValidation.utils.calculateTotalPowerRequirement).toBeDefined();
    });
  });

  describe('Complete Ship Validation - Type-S Scout', () => {
    const scoutSpec = {
      hull: { tonnage: 100 },
      drives: {
        jump: { rating: 2 },
        manoeuvre: { thrust: 2 }
      },
      power: { output: 60, type: 'fusion_tl12' },
      sensors: { grade: 'military' },
      techLevel: 12
    };

    test('All components validate successfully', () => {
      const jumpResult = ShipValidation.validators.validateJumpDrive(100, 2, 12);
      expect(jumpResult.valid).toBe(true);

      const manoeuvreResult = ShipValidation.validators.validateManoeuvreDrive(100, 2, 12);
      expect(manoeuvreResult.valid).toBe(true);

      const powerResult = ShipValidation.validators.validatePowerPlant(60, 'fusion_tl12', 12);
      expect(powerResult.valid).toBe(true);

      const sensorResult = ShipValidation.validators.validateSensors('military', 12);
      expect(sensorResult.valid).toBe(true);

      const bridgeResult = ShipValidation.validators.validateBridge(100, 'standard', 12);
      expect(bridgeResult.valid).toBe(true);
    });

    test('Power requirements match power plant output', () => {
      const powerReq = ShipValidation.utils.calculateTotalPowerRequirement(100, 2, 2, 4);
      expect(powerReq.total).toBe(64); // 20 basic + 20 M + 20 J + 4 sensors

      // Scout has 60 power plant - would need to jump dim
      expect(powerReq.basic + powerReq.manoeuvre + powerReq.other).toBe(44); // Normal ops
      expect(powerReq.jump).toBe(20); // Jump operation
    });

    test('Complete validation function works', () => {
      const result = ShipValidation.validateCompleteShip(scoutSpec);
      expect(result.valid).toBe(true);
      expect(result.componentValidation.jumpDrive).toBeDefined();
      expect(result.componentValidation.manoeuvreDrive).toBeDefined();
      expect(result.componentValidation.powerPlant).toBeDefined();
    });
  });

  describe('Complete Ship Validation - Type-A Free Trader', () => {
    test('200t hull with J1/T1 validates', () => {
      const jumpResult = ShipValidation.validators.validateJumpDrive(200, 1, 12);
      expect(jumpResult.valid).toBe(true);
      expect(jumpResult.stats.driveTonnage).toBe(10);
      expect(jumpResult.stats.fuelRequired).toBe(20);

      const manoeuvreResult = ShipValidation.validators.validateManoeuvreDrive(200, 1, 12);
      expect(manoeuvreResult.valid).toBe(true);
      expect(manoeuvreResult.stats.driveTonnage).toBe(2);
      expect(manoeuvreResult.stats.powerRequired).toBe(20);
    });

    test('Crew requirements calculation', () => {
      const crew = ShipValidation.utils.calculateCrewRequirements(200, 1, 1, 0);
      expect(crew.pilot).toBe(1);
      expect(crew.astrogator).toBe(1);
      expect(crew.engineer).toBe(1);
      expect(crew.total).toBe(3);
    });

    test('Stateroom package for crew + passengers', () => {
      const pkg = ShipValidation.packages.calculateStateroomPackage({
        crew: 4,
        passengers: 6,
        lowBerths: 20
      });
      expect(pkg.standard.count).toBe(10);
      expect(pkg.standard.tonnage).toBe(40);
      expect(pkg.lowBerths.count).toBe(20);
      expect(pkg.lowBerths.tonnage).toBe(10);
      expect(pkg.total.tonnage).toBe(50);
    });
  });

  describe('Complete Ship Validation - Patrol Corvette', () => {
    test('400t military ship with high thrust validates', () => {
      const manoeuvreResult = ShipValidation.validators.validateManoeuvreDrive(400, 5, 12);
      expect(manoeuvreResult.valid).toBe(true);
      expect(manoeuvreResult.stats.driveTonnage).toBe(20);
      expect(manoeuvreResult.stats.powerRequired).toBe(200);
    });

    test('Jump-3 on 400t hull', () => {
      const jumpResult = ShipValidation.validators.validateJumpDrive(400, 3, 12);
      expect(jumpResult.valid).toBe(true);
      expect(jumpResult.stats.driveTonnage).toBe(35);
      expect(jumpResult.stats.fuelRequired).toBe(120);
    });

    test('Multiple turrets configuration', () => {
      const hardpoints = ShipValidation.utils.calculateHardpoints(400);
      expect(hardpoints).toBe(4);

      const weaponsPkg = ShipValidation.packages.calculateWeaponsPackage(400, [
        { type: 'triple', weapons: ['pulse_laser', 'pulse_laser', 'pulse_laser'] },
        { type: 'double', weapons: ['missile_rack', 'sandcaster'] },
        { type: 'single', weapons: ['particle_beam'] },
        { type: 'double', weapons: ['beam_laser', 'beam_laser'] }
      ]);

      expect(weaponsPkg.hardpointsUsed).toBe(4);
      expect(weaponsPkg.hardpointsRemaining).toBe(0);
      expect(weaponsPkg.turrets).toHaveLength(4);
    });

    test('Heavy armour on military vessel', () => {
      const armourResult = ShipValidation.validators.validateArmour(400, 'bonded_superdense', 8, 14);
      expect(armourResult.valid).toBe(true);
      expect(armourResult.stats.rating).toBe(8);
    });

    test('Total power requirements', () => {
      // 400t, Thrust-5, Jump-3, sensors(4), weapons(14)
      const powerReq = ShipValidation.utils.calculateTotalPowerRequirement(400, 5, 3, 18);
      expect(powerReq.basic).toBe(80);
      expect(powerReq.manoeuvre).toBe(200);
      expect(powerReq.jump).toBe(120);
      expect(powerReq.other).toBe(18);
      expect(powerReq.total).toBe(418);
    });
  });

  describe('Error Handling', () => {
    test('Invalid TL for jump drive', () => {
      const result = ShipValidation.validators.validateJumpDrive(100, 4, 12);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires TL13');
    });

    test('Insufficient power for configuration', () => {
      // Scout trying to run everything simultaneously
      const powerReq = ShipValidation.utils.calculateTotalPowerRequirement(100, 2, 2, 4);
      expect(powerReq.total).toBe(64);

      // Scout only has 60 power - warning should be generated
      expect(powerReq.total).toBeGreaterThan(60);
    });

    test('Too many weapons for turret type', () => {
      const result = ShipValidation.validators.validateWeapons(
        'single',
        ['beam_laser', 'pulse_laser'],
        12
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('can only mount 1 weapon');
    });

    test('Armour rating exceeds maximum for TL', () => {
      const result = ShipValidation.validators.validateArmour(100, 'titanium_steel', 10, 12);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('limited to 9 rating');
    });
  });

  describe('Package Calculations', () => {
    test('Jump package includes all costs', () => {
      const pkg = ShipValidation.packages.calculateJumpPackage(100, 2);
      expect(pkg.jumpRating).toBe(2);
      expect(pkg.driveTonnage).toBe(10);
      expect(pkg.fuelRequired).toBe(20);
      expect(pkg.powerRequired).toBe(20);
      expect(pkg.cost).toBe(15000000);
      expect(pkg.costMCr).toBe(15);
      expect(pkg.totalTonnage).toBe(30);
    });

    test('Manoeuvre package for high-thrust ship', () => {
      const pkg = ShipValidation.packages.calculateManoeuvrePackage(400, 5);
      expect(pkg.thrust).toBe(5);
      expect(pkg.driveTonnage).toBe(20);
      expect(pkg.powerRequired).toBe(200);
      expect(pkg.cost).toBe(40000000);
      expect(pkg.costMCr).toBe(40);
    });

    test('Power package auto-selects best type for TL', () => {
      const pkg = ShipValidation.packages.calculatePowerPackage(100, 2, 2, 12, 4);
      expect(pkg.plantType).toBe('fusion_tl12');
      expect(pkg.powerOutput).toBe(64);
      expect(pkg.powerPerTon).toBe(15);
    });

    test('Armour package respects TL limits', () => {
      const pkg = ShipValidation.packages.calculateArmourPackage(100, 10, 12);
      expect(pkg.armourType).toBe('crystaliron');
      expect(pkg.rating).toBeLessThanOrEqual(12); // Crystaliron maxes at TL or 13
      expect(pkg.maxRating).toBe(12);
    });
  });

});
