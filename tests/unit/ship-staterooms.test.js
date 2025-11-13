// ======== STATEROOMS MODULE UNIT TESTS ========

const Staterooms = require('../../lib/ship-staterooms');

describe('Staterooms Calculations', () => {

  describe('calculateStateroomTonnage', () => {
    test('1 standard stateroom = 4 tons', () => {
      expect(Staterooms.calculateStateroomTonnage('standard', 1)).toBe(4);
    });

    test('4 standard staterooms = 16 tons', () => {
      expect(Staterooms.calculateStateroomTonnage('standard', 4)).toBe(16);
    });

    test('1 luxury stateroom = 8 tons', () => {
      expect(Staterooms.calculateStateroomTonnage('luxury', 1)).toBe(8);
    });

    test('20 low berths = 10 tons', () => {
      expect(Staterooms.calculateStateroomTonnage('lowBerth', 20)).toBe(10);
    });

    test('Invalid type throws error', () => {
      expect(() => Staterooms.calculateStateroomTonnage('invalid', 1)).toThrow('Invalid stateroom type');
    });
  });

  describe('calculateStateroomCost', () => {
    test('1 standard stateroom = MCr 0.5 = Cr 500,000', () => {
      expect(Staterooms.calculateStateroomCost('standard', 1)).toBe(500000);
    });

    test('4 standard staterooms = MCr 2 = Cr 2,000,000', () => {
      expect(Staterooms.calculateStateroomCost('standard', 4)).toBe(2000000);
    });

    test('1 luxury stateroom = MCr 1 = Cr 1,000,000', () => {
      expect(Staterooms.calculateStateroomCost('luxury', 1)).toBe(1000000);
    });

    test('20 low berths = Cr 1,000,000', () => {
      expect(Staterooms.calculateStateroomCost('lowBerth', 20)).toBe(1000000);
    });
  });

  describe('calculateCrewRequirements', () => {
    test('100t, T2, J2, 1 turret: pilot, astrogator, engineer, gunner', () => {
      const crew = Staterooms.calculateCrewRequirements(100, 2, 2, 1);
      expect(crew.pilot).toBe(1);
      expect(crew.astrogator).toBe(1);
      expect(crew.engineer).toBe(1);
      expect(crew.gunner).toBe(1);
      expect(crew.total).toBe(4);
    });

    test('200t, T1, J0, 0 turrets: pilot, engineer only', () => {
      const crew = Staterooms.calculateCrewRequirements(200, 1, 0, 0);
      expect(crew.pilot).toBe(1);
      expect(crew.astrogator).toBe(0);
      expect(crew.engineer).toBe(1);
      expect(crew.gunner).toBe(0);
      expect(crew.total).toBe(2);
    });

    test('400t hull requires more engineers', () => {
      const crew = Staterooms.calculateCrewRequirements(1200, 4, 3, 4);
      expect(crew.engineer).toBe(2);
    });
  });

  describe('validateStaterooms', () => {
    test('Valid 4 standard staterooms pass validation', () => {
      const result = Staterooms.validateStaterooms('standard', 4);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.tonnage).toBe(16);
      expect(result.stats.cost).toBe(2000000);
    });

    test('Negative count fails validation', () => {
      const result = Staterooms.validateStaterooms('standard', -1);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual('Count cannot be negative');
    });

    test('Invalid type fails validation', () => {
      const result = Staterooms.validateStaterooms('invalid', 1);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid stateroom type');
    });

    test('Insufficient tonnage fails validation', () => {
      const result = Staterooms.validateStaterooms('standard', 4, 10);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('require 16t, only 10t available');
    });

    test('Low berths generate medic warning', () => {
      const result = Staterooms.validateStaterooms('lowBerth', 20);
      expect(result.warnings).toContainEqual(expect.stringContaining('medic'));
    });

    test('Luxury staterooms generate cost warning', () => {
      const result = Staterooms.validateStaterooms('luxury', 2);
      expect(result.warnings).toContainEqual(expect.stringContaining('double tonnage'));
    });
  });

  describe('calculateStateroomPackage', () => {
    test('4 crew, 0 passengers, 0 low berths', () => {
      const pkg = Staterooms.calculateStateroomPackage({ crew: 4, passengers: 0, lowBerths: 0 });
      expect(pkg.standard.count).toBe(4);
      expect(pkg.standard.tonnage).toBe(16);
      expect(pkg.standard.cost).toBe(2000000);
      expect(pkg.lowBerths.count).toBe(0);
      expect(pkg.total.tonnage).toBe(16);
    });

    test('4 crew, 6 passengers, 20 low berths', () => {
      const pkg = Staterooms.calculateStateroomPackage({ crew: 4, passengers: 6, lowBerths: 20 });
      expect(pkg.standard.count).toBe(10);
      expect(pkg.standard.tonnage).toBe(40);
      expect(pkg.lowBerths.count).toBe(20);
      expect(pkg.lowBerths.tonnage).toBe(10);
      expect(pkg.total.tonnage).toBe(50);
    });
  });

  describe('Integration Tests - Real Ship Specs', () => {
    test('Type-S Scout: 4 staterooms for crew', () => {
      const result = Staterooms.validateStaterooms('standard', 4);
      expect(result.valid).toBe(true);
      expect(result.stats.tonnage).toBe(16);
      expect(result.stats.cost).toBe(2000000);
    });

    test('Type-A Free Trader: 10 standard + 20 low berths', () => {
      const pkg = Staterooms.calculateStateroomPackage({ crew: 4, passengers: 6, lowBerths: 20 });
      expect(pkg.standard.tonnage).toBe(40);
      expect(pkg.lowBerths.tonnage).toBe(10);
      expect(pkg.total.tonnage).toBe(50);
    });
  });

});
