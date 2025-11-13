// ======== ARMOUR MODULE UNIT TESTS ========

const Armour = require('../../lib/ship-armour');

describe('Armour Calculations', () => {

  describe('getHullMultiplier', () => {
    test('5-15t hull: multiplier = 4', () => {
      expect(Armour.getHullMultiplier(10)).toBe(4);
      expect(Armour.getHullMultiplier(15)).toBe(4);
    });

    test('16-25t hull: multiplier = 3', () => {
      expect(Armour.getHullMultiplier(20)).toBe(3);
      expect(Armour.getHullMultiplier(25)).toBe(3);
    });

    test('26-99t hull: multiplier = 2', () => {
      expect(Armour.getHullMultiplier(50)).toBe(2);
      expect(Armour.getHullMultiplier(99)).toBe(2);
    });

    test('100+ hull: multiplier = 1', () => {
      expect(Armour.getHullMultiplier(100)).toBe(1);
      expect(Armour.getHullMultiplier(1000)).toBe(1);
    });
  });

  describe('calculateArmourTonnage', () => {
    test('100t hull, crystaliron-4: 1.25% × 4 × 1 = 5t', () => {
      expect(Armour.calculateArmourTonnage(100, 'crystaliron', 4)).toBe(5);
    });

    test('100t hull, crystaliron-2: 1.25% × 2 × 1 = 2.5t', () => {
      expect(Armour.calculateArmourTonnage(100, 'crystaliron', 2)).toBe(2.5);
    });

    test('200t hull, crystaliron-2: 1.25% × 2 × 1 = 5t', () => {
      expect(Armour.calculateArmourTonnage(200, 'crystaliron', 2)).toBe(5);
    });

    test('Small hull multiplier: 10t, crystaliron-2: 1.25% × 2 × 4 = 1t', () => {
      expect(Armour.calculateArmourTonnage(10, 'crystaliron', 2)).toBe(1);
    });

    test('Rating 0 returns 0 tonnage', () => {
      expect(Armour.calculateArmourTonnage(100, 'crystaliron', 0)).toBe(0);
    });

    test('Titanium steel: 2.5% per point', () => {
      expect(Armour.calculateArmourTonnage(100, 'titanium_steel', 4)).toBe(10);
    });

    test('Molecular bonded: 0.5% per point', () => {
      expect(Armour.calculateArmourTonnage(100, 'molecular_bonded', 4)).toBe(2);
    });
  });

  describe('calculateArmourCost', () => {
    test('5t crystaliron: 5 × Cr 200,000 = Cr 1,000,000', () => {
      expect(Armour.calculateArmourCost(5, 'crystaliron')).toBe(1000000);
    });

    test('10t titanium steel: 10 × Cr 50,000 = Cr 500,000', () => {
      expect(Armour.calculateArmourCost(10, 'titanium_steel')).toBe(500000);
    });

    test('2t molecular bonded: 2 × MCr 1.5 = Cr 3,000,000', () => {
      expect(Armour.calculateArmourCost(2, 'molecular_bonded')).toBe(3000000);
    });
  });

  describe('getMaxArmourRating', () => {
    test('Titanium steel maxes at TL or 9', () => {
      expect(Armour.getMaxArmourRating('titanium_steel', 7)).toBe(7);
      expect(Armour.getMaxArmourRating('titanium_steel', 12)).toBe(9);
    });

    test('Crystaliron maxes at TL or 13', () => {
      expect(Armour.getMaxArmourRating('crystaliron', 10)).toBe(10);
      expect(Armour.getMaxArmourRating('crystaliron', 12)).toBe(12);
      expect(Armour.getMaxArmourRating('crystaliron', 15)).toBe(13);
    });

    test('Bonded superdense maxes at TL', () => {
      expect(Armour.getMaxArmourRating('bonded_superdense', 14)).toBe(14);
      expect(Armour.getMaxArmourRating('bonded_superdense', 20)).toBe(20);
    });

    test('Molecular bonded maxes at TL+4', () => {
      expect(Armour.getMaxArmourRating('molecular_bonded', 16)).toBe(20);
      expect(Armour.getMaxArmourRating('molecular_bonded', 18)).toBe(22);
    });
  });

  describe('getBestArmourType', () => {
    test('TL 7-9 uses titanium steel', () => {
      expect(Armour.getBestArmourType(7)).toBe('titanium_steel');
      expect(Armour.getBestArmourType(9)).toBe('titanium_steel');
    });

    test('TL 10-13 uses crystaliron', () => {
      expect(Armour.getBestArmourType(10)).toBe('crystaliron');
      expect(Armour.getBestArmourType(13)).toBe('crystaliron');
    });

    test('TL 14-15 uses bonded superdense', () => {
      expect(Armour.getBestArmourType(14)).toBe('bonded_superdense');
      expect(Armour.getBestArmourType(15)).toBe('bonded_superdense');
    });

    test('TL 16+ uses molecular bonded', () => {
      expect(Armour.getBestArmourType(16)).toBe('molecular_bonded');
      expect(Armour.getBestArmourType(20)).toBe('molecular_bonded');
    });
  });

  describe('validateArmour', () => {
    test('Valid crystaliron-4 on 100t TL12 ship', () => {
      const result = Armour.validateArmour(100, 'crystaliron', 4, 12);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.tonnage).toBe(5);
      expect(result.stats.cost).toBe(1000000);
    });

    test('Insufficient TL fails', () => {
      const result = Armour.validateArmour(100, 'crystaliron', 4, 9);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires TL10');
    });

    test('Rating exceeds max fails', () => {
      const result = Armour.validateArmour(100, 'titanium_steel', 10, 12);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('limited to 9 rating');
    });

    test('Negative rating fails', () => {
      const result = Armour.validateArmour(100, 'crystaliron', -1, 12);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('cannot be negative');
    });

    test('Insufficient tonnage fails', () => {
      const result = Armour.validateArmour(100, 'crystaliron', 4, 12, 2);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires 5t, only 2t available');
    });

    test('Rating 0 generates warning', () => {
      const result = Armour.validateArmour(100, 'crystaliron', 0, 12);
      expect(result.warnings).toContainEqual(expect.stringContaining('No armour'));
    });

    test('Small hull generates multiplier warning', () => {
      const result = Armour.validateArmour(20, 'crystaliron', 2, 12);
      expect(result.warnings).toContainEqual(expect.stringContaining('3× armour multiplier'));
    });
  });

  describe('calculateArmourPackage', () => {
    test('100t TL12 ship, rating 4', () => {
      const pkg = Armour.calculateArmourPackage(100, 4, 12);
      expect(pkg.armourType).toBe('crystaliron');
      expect(pkg.rating).toBe(4);
      expect(pkg.tonnage).toBe(5);
      expect(pkg.cost).toBe(1000000);
      expect(pkg.costMCr).toBe(1);
    });

    test('200t TL12 ship, rating 2', () => {
      const pkg = Armour.calculateArmourPackage(200, 2, 12);
      expect(pkg.armourType).toBe('crystaliron');
      expect(pkg.tonnage).toBe(5);
    });

    test('TL16 uses molecular bonded', () => {
      const pkg = Armour.calculateArmourPackage(100, 10, 16);
      expect(pkg.armourType).toBe('molecular_bonded');
      expect(pkg.maxRating).toBe(20);
    });
  });

  describe('Integration Tests - Real Ship Specs', () => {
    test('Type-S Scout: 100t, crystaliron-4', () => {
      const result = Armour.validateArmour(100, 'crystaliron', 4, 12);
      expect(result.valid).toBe(true);
      expect(result.stats.tonnage).toBe(5);
      expect(result.stats.cost).toBe(1000000);
    });

    test('Type-A Free Trader: 200t, crystaliron-2', () => {
      const result = Armour.validateArmour(200, 'crystaliron', 2, 12);
      expect(result.valid).toBe(true);
      expect(result.stats.tonnage).toBe(5);
      expect(result.stats.cost).toBe(1000000);
    });

    test('Patrol Corvette: 400t, bonded_superdense-8', () => {
      const result = Armour.validateArmour(400, 'bonded_superdense', 8, 14);
      expect(result.valid).toBe(true);
      expect(result.stats.tonnage).toBe(25.6);
    });
  });

});
