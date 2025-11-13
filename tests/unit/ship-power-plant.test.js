// ======== POWER PLANT MODULE UNIT TESTS ========

const PowerPlant = require('../../lib/ship-power-plant');

describe('Power Plant Calculations', () => {

  describe('calculatePowerPlantTonnage', () => {
    test('Fusion TL12: 60 power ÷ 15 power/ton = 4t', () => {
      expect(PowerPlant.calculatePowerPlantTonnage(60, 'fusion_tl12')).toBe(4);
    });

    test('Fusion TL8: 50 power ÷ 10 power/ton = 5t', () => {
      expect(PowerPlant.calculatePowerPlantTonnage(50, 'fusion_tl8')).toBe(5);
    });

    test('Fusion TL15: 80 power ÷ 20 power/ton = 4t', () => {
      expect(PowerPlant.calculatePowerPlantTonnage(80, 'fusion_tl15')).toBe(4);
    });

    test('Antimatter: 200 power ÷ 100 power/ton = 2t', () => {
      expect(PowerPlant.calculatePowerPlantTonnage(200, 'antimatter')).toBe(2);
    });

    test('Fission: 80 power ÷ 8 power/ton = 10t', () => {
      expect(PowerPlant.calculatePowerPlantTonnage(80, 'fission')).toBe(10);
    });

    test('Chemical: 50 power ÷ 5 power/ton = 10t', () => {
      expect(PowerPlant.calculatePowerPlantTonnage(50, 'chemical')).toBe(10);
    });

    test('0 power returns 0 tonnage', () => {
      expect(PowerPlant.calculatePowerPlantTonnage(0, 'fusion_tl12')).toBe(0);
    });

    test('Invalid plant type throws error', () => {
      expect(() => PowerPlant.calculatePowerPlantTonnage(60, 'invalid')).toThrow('Invalid power plant type');
    });
  });

  describe('calculatePowerPlantCost', () => {
    test('Fusion TL12: 4t × MCr 1 = Cr 4,000,000', () => {
      expect(PowerPlant.calculatePowerPlantCost(4, 'fusion_tl12')).toBe(4000000);
    });

    test('Fusion TL8: 5t × MCr 0.5 = Cr 2,500,000', () => {
      expect(PowerPlant.calculatePowerPlantCost(5, 'fusion_tl8')).toBe(2500000);
    });

    test('Fusion TL15: 6t × MCr 2 = Cr 12,000,000', () => {
      expect(PowerPlant.calculatePowerPlantCost(6, 'fusion_tl15')).toBe(12000000);
    });

    test('Antimatter: 2t × MCr 10 = Cr 20,000,000', () => {
      expect(PowerPlant.calculatePowerPlantCost(2, 'antimatter')).toBe(20000000);
    });

    test('Fission: 10t × MCr 0.4 = Cr 4,000,000', () => {
      expect(PowerPlant.calculatePowerPlantCost(10, 'fission')).toBe(4000000);
    });
  });

  describe('calculateBasicPower', () => {
    test('100t hull: 100 × 20% = 20 power', () => {
      expect(PowerPlant.calculateBasicPower(100)).toBe(20);
    });

    test('200t hull: 200 × 20% = 40 power', () => {
      expect(PowerPlant.calculateBasicPower(200)).toBe(40);
    });

    test('400t hull: 400 × 20% = 80 power', () => {
      expect(PowerPlant.calculateBasicPower(400)).toBe(80);
    });
  });

  describe('calculateTotalPowerRequirement', () => {
    test('100t hull, Thrust-2, Jump-2: basic(20) + M(20) + J(20) = 60', () => {
      const req = PowerPlant.calculateTotalPowerRequirement(100, 2, 2);
      expect(req.basic).toBe(20);
      expect(req.manoeuvre).toBe(20);
      expect(req.jump).toBe(20);
      expect(req.other).toBe(0);
      expect(req.total).toBe(60);
    });

    test('200t hull, Thrust-1, Jump-1: basic(40) + M(20) + J(20) = 80', () => {
      const req = PowerPlant.calculateTotalPowerRequirement(200, 1, 1);
      expect(req.basic).toBe(40);
      expect(req.manoeuvre).toBe(20);
      expect(req.jump).toBe(20);
      expect(req.total).toBe(80);
    });

    test('400t hull, Thrust-4, Jump-3, sensors(4): total = 284', () => {
      const req = PowerPlant.calculateTotalPowerRequirement(400, 4, 3, 4);
      expect(req.basic).toBe(80);
      expect(req.manoeuvre).toBe(160);
      expect(req.jump).toBe(120);
      expect(req.other).toBe(4);
      expect(req.total).toBe(364);
    });

    test('No drives: 100t hull, 0 thrust, 0 jump = 20 power', () => {
      const req = PowerPlant.calculateTotalPowerRequirement(100, 0, 0);
      expect(req.total).toBe(20);
    });
  });

  describe('getBestPowerPlantType', () => {
    test('TL 6 uses fission', () => {
      expect(PowerPlant.getBestPowerPlantType(6)).toBe('fission');
    });

    test('TL 7 uses chemical', () => {
      expect(PowerPlant.getBestPowerPlantType(7)).toBe('chemical');
    });

    test('TL 8-11 uses fusion_tl8', () => {
      expect(PowerPlant.getBestPowerPlantType(8)).toBe('fusion_tl8');
      expect(PowerPlant.getBestPowerPlantType(11)).toBe('fusion_tl8');
    });

    test('TL 12-14 uses fusion_tl12', () => {
      expect(PowerPlant.getBestPowerPlantType(12)).toBe('fusion_tl12');
      expect(PowerPlant.getBestPowerPlantType(14)).toBe('fusion_tl12');
    });

    test('TL 15-19 uses fusion_tl15', () => {
      expect(PowerPlant.getBestPowerPlantType(15)).toBe('fusion_tl15');
      expect(PowerPlant.getBestPowerPlantType(19)).toBe('fusion_tl15');
    });

    test('TL 20+ uses antimatter', () => {
      expect(PowerPlant.getBestPowerPlantType(20)).toBe('antimatter');
      expect(PowerPlant.getBestPowerPlantType(25)).toBe('antimatter');
    });

    test('TL < 6 throws error', () => {
      expect(() => PowerPlant.getBestPowerPlantType(5)).toThrow('too low for power plant');
    });
  });

  describe('validatePowerPlant', () => {
    test('Valid fusion_tl12 at TL12 passes', () => {
      const result = PowerPlant.validatePowerPlant(60, 'fusion_tl12', 12);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.tonnage).toBe(4);
      expect(result.stats.cost).toBe(4000000);
    });

    test('Insufficient TL fails validation', () => {
      const result = PowerPlant.validatePowerPlant(60, 'fusion_tl12', 11);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires TL12');
    });

    test('Invalid plant type fails validation', () => {
      const result = PowerPlant.validatePowerPlant(60, 'invalid_type', 12);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid power plant type');
    });

    test('Insufficient tonnage fails validation', () => {
      const result = PowerPlant.validatePowerPlant(60, 'fusion_tl12', 12, 3);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires 4t, only 3t available');
    });

    test('Using outdated plant type generates warning', () => {
      const result = PowerPlant.validatePowerPlant(60, 'fusion_tl8', 12);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('fusion_tl12');
    });

    test('Fission/chemical generates inefficiency warning', () => {
      const result = PowerPlant.validatePowerPlant(80, 'fission', 8);
      expect(result.warnings).toContainEqual(expect.stringContaining('inefficient'));
    });

    test('0 power generates warning', () => {
      const result = PowerPlant.validatePowerPlant(0, 'fusion_tl12', 12);
      expect(result.warnings).toContainEqual(expect.stringContaining('Power output is 0'));
    });
  });

  describe('calculatePowerPackage', () => {
    test('Scout (100t, Thrust-2, Jump-2, TL12)', () => {
      const pkg = PowerPlant.calculatePowerPackage(100, 2, 2, 12, 4);
      expect(pkg.plantType).toBe('fusion_tl12');
      expect(pkg.powerOutput).toBe(64); // 20 + 20 + 20 + 4
      expect(pkg.tonnage).toBeCloseTo(4.267, 2);
      expect(pkg.powerPerTon).toBe(15);
      expect(pkg.minimumTL).toBe(12);
      expect(pkg.powerBreakdown.basic).toBe(20);
      expect(pkg.powerBreakdown.manoeuvre).toBe(20);
      expect(pkg.powerBreakdown.jump).toBe(20);
      expect(pkg.powerBreakdown.other).toBe(4);
    });

    test('Free Trader (200t, Thrust-1, Jump-1, TL12)', () => {
      const pkg = PowerPlant.calculatePowerPackage(200, 1, 1, 12, 2);
      expect(pkg.plantType).toBe('fusion_tl12');
      expect(pkg.powerOutput).toBe(82); // 40 + 20 + 20 + 2
      expect(pkg.tonnage).toBeCloseTo(5.467, 2);
      expect(pkg.costMCr).toBeCloseTo(5.467, 2);
    });

    test('High-TL ship uses fusion_tl15', () => {
      const pkg = PowerPlant.calculatePowerPackage(100, 2, 2, 15);
      expect(pkg.plantType).toBe('fusion_tl15');
      expect(pkg.powerPerTon).toBe(20);
    });

    test('Ultra high-TL ship uses antimatter', () => {
      const pkg = PowerPlant.calculatePowerPackage(1000, 6, 6, 20);
      expect(pkg.plantType).toBe('antimatter');
      expect(pkg.powerPerTon).toBe(100);
    });
  });

  describe('Integration Tests - Real Ship Specs', () => {
    test('Type-S Scout: 100t hull, T2, J2, 64 power total', () => {
      const validation = PowerPlant.validatePowerPlant(64, 'fusion_tl12', 12);
      expect(validation.valid).toBe(true);
      expect(validation.stats.tonnage).toBeCloseTo(4.267, 2);
    });

    test('Type-A Free Trader: 200t hull, T1, J1, ~82 power total', () => {
      const validation = PowerPlant.validatePowerPlant(82, 'fusion_tl12', 12);
      expect(validation.valid).toBe(true);
      expect(validation.stats.tonnage).toBeCloseTo(5.467, 2);
    });

    test('Patrol Corvette: 400t hull with high power needs', () => {
      // 400t, T5, J3, sensors(4), weapons(10)
      const req = PowerPlant.calculateTotalPowerRequirement(400, 5, 3, 14);
      expect(req.basic).toBe(80);
      expect(req.manoeuvre).toBe(200);
      expect(req.jump).toBe(120);
      expect(req.total).toBe(414);

      const validation = PowerPlant.validatePowerPlant(414, 'fusion_tl12', 12);
      expect(validation.valid).toBe(true);
      expect(validation.stats.tonnage).toBeCloseTo(27.6, 1);
    });
  });

});
