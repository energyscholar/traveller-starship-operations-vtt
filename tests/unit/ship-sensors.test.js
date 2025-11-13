// ======== SENSORS MODULE UNIT TESTS ========

const Sensors = require('../../lib/ship-sensors');

describe('Sensors Calculations', () => {

  describe('getSensorSpecs', () => {
    test('Basic sensors have 0 tonnage, 0 power, 0 cost', () => {
      const specs = Sensors.getSensorSpecs('basic');
      expect(specs.tonnage).toBe(0);
      expect(specs.power).toBe(0);
      expect(specs.cost).toBe(0);
      expect(specs.dm).toBe(-4);
      expect(specs.tl).toBe(8);
    });

    test('Civilian sensors: 1t, 1 power, MCr 3, DM-2', () => {
      const specs = Sensors.getSensorSpecs('civilian');
      expect(specs.tonnage).toBe(1);
      expect(specs.power).toBe(1);
      expect(specs.cost).toBe(3000000);
      expect(specs.dm).toBe(-2);
      expect(specs.tl).toBe(9);
    });

    test('Military sensors: 2t, 2 power, MCr 4.1, DM+0', () => {
      const specs = Sensors.getSensorSpecs('military');
      expect(specs.tonnage).toBe(2);
      expect(specs.power).toBe(2);
      expect(specs.cost).toBe(4100000);
      expect(specs.dm).toBe(0);
      expect(specs.tl).toBe(10);
      expect(specs.suite).toContain('Jammers');
    });

    test('Improved sensors: 3t, 4 power, MCr 4.3, DM+1', () => {
      const specs = Sensors.getSensorSpecs('improved');
      expect(specs.tonnage).toBe(3);
      expect(specs.power).toBe(4);
      expect(specs.cost).toBe(4300000);
      expect(specs.dm).toBe(1);
      expect(specs.tl).toBe(12);
    });

    test('Advanced sensors: 5t, 6 power, MCr 5.3, DM+2', () => {
      const specs = Sensors.getSensorSpecs('advanced');
      expect(specs.tonnage).toBe(5);
      expect(specs.power).toBe(6);
      expect(specs.cost).toBe(5300000);
      expect(specs.dm).toBe(2);
      expect(specs.tl).toBe(15);
    });

    test('Invalid sensor grade throws error', () => {
      expect(() => Sensors.getSensorSpecs('invalid')).toThrow('Invalid sensor grade');
    });
  });

  describe('getBestSensorGrade', () => {
    test('TL 8 uses basic sensors', () => {
      expect(Sensors.getBestSensorGrade(8)).toBe('basic');
    });

    test('TL 9 uses civilian sensors', () => {
      expect(Sensors.getBestSensorGrade(9)).toBe('civilian');
    });

    test('TL 10-11 uses military sensors', () => {
      expect(Sensors.getBestSensorGrade(10)).toBe('military');
      expect(Sensors.getBestSensorGrade(11)).toBe('military');
    });

    test('TL 12-14 uses improved sensors', () => {
      expect(Sensors.getBestSensorGrade(12)).toBe('improved');
      expect(Sensors.getBestSensorGrade(14)).toBe('improved');
    });

    test('TL 15+ uses advanced sensors', () => {
      expect(Sensors.getBestSensorGrade(15)).toBe('advanced');
      expect(Sensors.getBestSensorGrade(20)).toBe('advanced');
    });

    test('TL < 8 throws error', () => {
      expect(() => Sensors.getBestSensorGrade(7)).toThrow('too low for sensors');
    });
  });

  describe('validateSensors', () => {
    test('Valid military sensors at TL12 pass validation', () => {
      const result = Sensors.validateSensors('military', 12);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.tonnage).toBe(2);
      expect(result.stats.power).toBe(2);
      expect(result.stats.dm).toBe(0);
    });

    test('Insufficient TL fails validation', () => {
      const result = Sensors.validateSensors('military', 9);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('require TL10');
    });

    test('Invalid sensor grade fails validation', () => {
      const result = Sensors.validateSensors('invalid', 12);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid sensor grade');
    });

    test('Insufficient tonnage fails validation', () => {
      const result = Sensors.validateSensors('military', 12, 1);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('require 2t, only 1t available');
    });

    test('Insufficient power fails validation', () => {
      const result = Sensors.validateSensors('improved', 12, 5, 3);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('require 4 power, only 3 available');
    });

    test('Using lower grade than available generates warning', () => {
      const result = Sensors.validateSensors('civilian', 12);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(expect.stringContaining('improved'));
    });

    test('Basic sensors generate performance warning', () => {
      const result = Sensors.validateSensors('basic', 9);
      expect(result.warnings).toContainEqual(expect.stringContaining('DM-4 penalty'));
    });

    test('Military+ sensors note jamming capability', () => {
      const result = Sensors.validateSensors('military', 10);
      expect(result.warnings).toContainEqual(expect.stringContaining('jammers'));
    });
  });

  describe('calculateSensorPackage', () => {
    test('TL12 defaults to improved sensors', () => {
      const pkg = Sensors.calculateSensorPackage(12);
      expect(pkg.grade).toBe('improved');
      expect(pkg.tonnage).toBe(3);
      expect(pkg.power).toBe(4);
      expect(pkg.cost).toBe(4300000);
      expect(pkg.costMCr).toBe(4.3);
      expect(pkg.dm).toBe(1);
    });

    test('TL10 defaults to military sensors', () => {
      const pkg = Sensors.calculateSensorPackage(10);
      expect(pkg.grade).toBe('military');
      expect(pkg.dm).toBe(0);
    });

    test('Can specify preferred grade', () => {
      const pkg = Sensors.calculateSensorPackage(12, 'civilian');
      expect(pkg.grade).toBe('civilian');
      expect(pkg.dm).toBe(-2);
    });

    test('TL15 defaults to advanced sensors', () => {
      const pkg = Sensors.calculateSensorPackage(15);
      expect(pkg.grade).toBe('advanced');
      expect(pkg.dm).toBe(2);
      expect(pkg.suite).toContain('Neural Activity');
    });
  });

  describe('compareSensorGrades', () => {
    test('Advanced > military', () => {
      expect(Sensors.compareSensorGrades('advanced', 'military')).toBeGreaterThan(0);
    });

    test('Civilian < improved', () => {
      expect(Sensors.compareSensorGrades('civilian', 'improved')).toBeLessThan(0);
    });

    test('Military = military', () => {
      expect(Sensors.compareSensorGrades('military', 'military')).toBe(0);
    });

    test('Basic < civilian', () => {
      expect(Sensors.compareSensorGrades('basic', 'civilian')).toBeLessThan(0);
    });
  });

  describe('Integration Tests - Real Ship Specs', () => {
    test('Type-S Scout: Military sensors (TL12)', () => {
      const validation = Sensors.validateSensors('military', 12);
      expect(validation.valid).toBe(true);
      expect(validation.stats.tonnage).toBe(2);
      expect(validation.stats.power).toBe(2);
      expect(validation.stats.cost).toBe(4100000);
    });

    test('Type-A Free Trader: Civilian sensors (TL12)', () => {
      const validation = Sensors.validateSensors('civilian', 12);
      expect(validation.valid).toBe(true);
      expect(validation.stats.tonnage).toBe(1);
      expect(validation.stats.power).toBe(1);
      expect(validation.stats.dm).toBe(-2);
    });

    test('Patrol Corvette: Advanced sensors (TL14)', () => {
      const validation = Sensors.validateSensors('advanced', 15);
      expect(validation.valid).toBe(true);
      expect(validation.stats.tonnage).toBe(5);
      expect(validation.stats.dm).toBe(2);
    });

    test('Budget ship: Basic sensors (TL9)', () => {
      const validation = Sensors.validateSensors('basic', 9);
      expect(validation.valid).toBe(true);
      expect(validation.stats.tonnage).toBe(0);
      expect(validation.stats.cost).toBe(0);
    });
  });

});
