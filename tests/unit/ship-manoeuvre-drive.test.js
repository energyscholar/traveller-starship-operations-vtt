// ======== MANOEUVRE DRIVE MODULE UNIT TESTS ========

const ManoeuvreDrive = require('../../lib/ship-manoeuvre-drive');

describe('Manoeuvre Drive Calculations', () => {

  describe('calculateManoeuvreDriveTonnage', () => {
    test('Thrust-0 on 100t hull: 100 × 0.5% = 0.5t', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveTonnage(100, 0)).toBe(0.5);
    });

    test('Thrust-1 on 100t hull: 100 × 1% = 1t', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveTonnage(100, 1)).toBe(1);
    });

    test('Thrust-2 on 100t hull: 100 × 2% = 2t', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveTonnage(100, 2)).toBe(2);
    });

    test('Thrust-1 on 200t hull: 200 × 1% = 2t', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveTonnage(200, 1)).toBe(2);
    });

    test('Thrust-2 on 200t hull: 200 × 2% = 4t', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveTonnage(200, 2)).toBe(4);
    });

    test('Thrust-4 on 400t hull: 400 × 4% = 16t', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveTonnage(400, 4)).toBe(16);
    });

    test('Thrust-6 on 800t hull: 800 × 6% = 48t', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveTonnage(800, 6)).toBe(48);
    });

    test('Thrust-10 on 1000t hull: 1000 × 10% = 100t', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveTonnage(1000, 10)).toBe(100);
    });
  });

  describe('calculateManoeuvrePower', () => {
    test('Thrust-0 requires 0 power', () => {
      expect(ManoeuvreDrive.calculateManoeuvrePower(100, 0)).toBe(0);
    });

    test('Thrust-1 on 100t hull: 100 × 1 × 10% = 10 power', () => {
      expect(ManoeuvreDrive.calculateManoeuvrePower(100, 1)).toBe(10);
    });

    test('Thrust-2 on 100t hull: 100 × 2 × 10% = 20 power', () => {
      expect(ManoeuvreDrive.calculateManoeuvrePower(100, 2)).toBe(20);
    });

    test('Thrust-1 on 200t hull: 200 × 1 × 10% = 20 power', () => {
      expect(ManoeuvreDrive.calculateManoeuvrePower(200, 1)).toBe(20);
    });

    test('Thrust-4 on 400t hull: 400 × 4 × 10% = 160 power', () => {
      expect(ManoeuvreDrive.calculateManoeuvrePower(400, 4)).toBe(160);
    });

    test('Thrust-6 on 800t hull: 800 × 6 × 10% = 480 power', () => {
      expect(ManoeuvreDrive.calculateManoeuvrePower(800, 6)).toBe(480);
    });
  });

  describe('calculateManoeuvreDriveCost', () => {
    test('0 tonnage costs 0 credits', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveCost(0)).toBe(0);
    });

    test('1t drive: 1 × MCr 2 = MCr 2 = Cr 2,000,000', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveCost(1)).toBe(2000000);
    });

    test('2t drive: 2 × MCr 2 = MCr 4 = Cr 4,000,000', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveCost(2)).toBe(4000000);
    });

    test('16t drive: 16 × MCr 2 = MCr 32 = Cr 32,000,000', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveCost(16)).toBe(32000000);
    });

    test('48t drive: 48 × MCr 2 = MCr 96 = Cr 96,000,000', () => {
      expect(ManoeuvreDrive.calculateManoeuvreDriveCost(48)).toBe(96000000);
    });
  });

  describe('getMinimumThrustTL', () => {
    test('Thrust-0 requires TL 9', () => {
      expect(ManoeuvreDrive.getMinimumThrustTL(0)).toBe(9);
    });

    test('Thrust-1 requires TL 9', () => {
      expect(ManoeuvreDrive.getMinimumThrustTL(1)).toBe(9);
    });

    test('Thrust-2 requires TL 10', () => {
      expect(ManoeuvreDrive.getMinimumThrustTL(2)).toBe(10);
    });

    test('Thrust-4 requires TL 11', () => {
      expect(ManoeuvreDrive.getMinimumThrustTL(4)).toBe(11);
    });

    test('Thrust-6 requires TL 12', () => {
      expect(ManoeuvreDrive.getMinimumThrustTL(6)).toBe(12);
    });

    test('Thrust-8 requires TL 13', () => {
      expect(ManoeuvreDrive.getMinimumThrustTL(8)).toBe(13);
    });

    test('Thrust-10 requires TL 16', () => {
      expect(ManoeuvreDrive.getMinimumThrustTL(10)).toBe(16);
    });

    test('Thrust-11 requires TL 17', () => {
      expect(ManoeuvreDrive.getMinimumThrustTL(11)).toBe(17);
    });
  });

  describe('validateManoeuvreDrive', () => {
    test('Valid Thrust-2 on TL12 100t ship passes validation', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(100, 2, 12);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.driveTonnage).toBe(2);
      expect(result.stats.powerRequired).toBe(20);
    });

    test('Negative thrust fails validation', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(100, -1, 12);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Thrust rating cannot be negative');
    });

    test('Thrust > 11 fails validation', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(100, 12, 18);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Thrust rating 12 exceeds maximum of 11');
    });

    test('Insufficient TL fails validation', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(100, 6, 11);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Thrust-6 requires TL12, ship is only TL11');
    });

    test('Insufficient tonnage fails validation', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(100, 2, 12, 1);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Manoeuvre drive requires 2t, only 1t available');
    });

    test('Thrust-0 generates performance warning', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(100, 0, 9);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Thrust-0 (0.5% hull) provides minimal manoeuvrability');
    });

    test('Thrust-1 generates slow warning', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(200, 1, 9);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Thrust-1 is slow for combat operations');
    });

    test('High thrust generates agility warning', () => {
      const result = ManoeuvreDrive.validateManoeuvreDrive(400, 6, 12);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Thrust-6 is very agile but requires significant tonnage and power');
    });
  });

  describe('calculateManoeuvrePackage', () => {
    test('Thrust-2 on 100t hull returns complete package', () => {
      const pkg = ManoeuvreDrive.calculateManoeuvrePackage(100, 2);
      expect(pkg.thrust).toBe(2);
      expect(pkg.driveTonnage).toBe(2);
      expect(pkg.powerRequired).toBe(20);
      expect(pkg.cost).toBe(4000000);
      expect(pkg.costMCr).toBe(4);
      expect(pkg.minimumTL).toBe(10);
    });

    test('Thrust-1 on 200t hull (Scout specs)', () => {
      const pkg = ManoeuvreDrive.calculateManoeuvrePackage(200, 1);
      expect(pkg.thrust).toBe(1);
      expect(pkg.driveTonnage).toBe(2);
      expect(pkg.powerRequired).toBe(20);
      expect(pkg.cost).toBe(4000000);
      expect(pkg.costMCr).toBe(4);
      expect(pkg.minimumTL).toBe(9);
    });

    test('Thrust-4 on 400t hull (Patrol Corvette)', () => {
      const pkg = ManoeuvreDrive.calculateManoeuvrePackage(400, 4);
      expect(pkg.thrust).toBe(4);
      expect(pkg.driveTonnage).toBe(16);
      expect(pkg.powerRequired).toBe(160);
      expect(pkg.cost).toBe(32000000);
      expect(pkg.costMCr).toBe(32);
      expect(pkg.minimumTL).toBe(11);
    });

    test('Thrust-0 on 100t hull', () => {
      const pkg = ManoeuvreDrive.calculateManoeuvrePackage(100, 0);
      expect(pkg.thrust).toBe(0);
      expect(pkg.driveTonnage).toBe(0.5);
      expect(pkg.powerRequired).toBe(0);
      expect(pkg.cost).toBe(1000000);
      expect(pkg.costMCr).toBe(1);
      expect(pkg.minimumTL).toBe(9);
    });
  });

  describe('Integration Tests - Real Ship Specs', () => {
    test('Type-S Scout: 100t, Thrust-2', () => {
      const validation = ManoeuvreDrive.validateManoeuvreDrive(100, 2, 12);
      expect(validation.valid).toBe(true);
      expect(validation.stats.driveTonnage).toBe(2);
      expect(validation.stats.powerRequired).toBe(20);
      expect(validation.stats.cost).toBe(4000000);
    });

    test('Type-A Free Trader: 200t, Thrust-1', () => {
      const validation = ManoeuvreDrive.validateManoeuvreDrive(200, 1, 12);
      expect(validation.valid).toBe(true);
      expect(validation.stats.driveTonnage).toBe(2);
      expect(validation.stats.powerRequired).toBe(20);
      expect(validation.stats.cost).toBe(4000000);
    });

    test('Patrol Corvette: 400t, Thrust-5', () => {
      const validation = ManoeuvreDrive.validateManoeuvreDrive(400, 5, 12);
      expect(validation.valid).toBe(true);
      expect(validation.stats.driveTonnage).toBe(20);
      expect(validation.stats.powerRequired).toBe(200);
      expect(validation.stats.cost).toBe(40000000);
    });
  });

});
