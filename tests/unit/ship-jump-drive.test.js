// ======== JUMP DRIVE MODULE UNIT TESTS ========

const JumpDrive = require('../../lib/ship-jump-drive');

describe('Jump Drive Calculations', () => {

  describe('calculateJumpDriveTonnage', () => {
    test('Jump-0 (no drive) returns 0 tonnage', () => {
      expect(JumpDrive.calculateJumpDriveTonnage(100, 0)).toBe(0);
    });

    test('Jump-1 on 100t hull: (100 × 2.5%) + 5 = 7.5t, min 10t → 10t', () => {
      expect(JumpDrive.calculateJumpDriveTonnage(100, 1)).toBe(10);
    });

    test('Jump-2 on 100t hull: (100 × 5%) + 5 = 10t', () => {
      expect(JumpDrive.calculateJumpDriveTonnage(100, 2)).toBe(10);
    });

    test('Jump-2 on 200t hull: (200 × 5%) + 5 = 15t', () => {
      expect(JumpDrive.calculateJumpDriveTonnage(200, 2)).toBe(15);
    });

    test('Jump-4 on 400t hull: (400 × 10%) + 5 = 45t', () => {
      expect(JumpDrive.calculateJumpDriveTonnage(400, 4)).toBe(45);
    });

    test('Jump-6 on 800t hull: (800 × 15%) + 5 = 125t', () => {
      expect(JumpDrive.calculateJumpDriveTonnage(800, 6)).toBe(125);
    });
  });

  describe('calculateJumpFuel', () => {
    test('Jump-0 requires 0 fuel', () => {
      expect(JumpDrive.calculateJumpFuel(100, 0)).toBe(0);
    });

    test('Jump-1 on 100t hull: 100 × 1 × 10% = 10t', () => {
      expect(JumpDrive.calculateJumpFuel(100, 1)).toBe(10);
    });

    test('Jump-2 on 100t hull: 100 × 2 × 10% = 20t', () => {
      expect(JumpDrive.calculateJumpFuel(100, 2)).toBe(20);
    });

    test('Jump-2 on 200t hull: 200 × 2 × 10% = 40t', () => {
      expect(JumpDrive.calculateJumpFuel(200, 2)).toBe(40);
    });

    test('Jump-4 on 400t hull: 400 × 4 × 10% = 160t', () => {
      expect(JumpDrive.calculateJumpFuel(400, 4)).toBe(160);
    });
  });

  describe('calculateJumpPower', () => {
    test('Jump-0 requires 0 power', () => {
      expect(JumpDrive.calculateJumpPower(100, 0)).toBe(0);
    });

    test('Jump-2 on 100t hull: 100 × 2 × 10% = 20 power', () => {
      expect(JumpDrive.calculateJumpPower(100, 2)).toBe(20);
    });

    test('Jump-4 on 400t hull: 400 × 4 × 10% = 160 power', () => {
      expect(JumpDrive.calculateJumpPower(400, 4)).toBe(160);
    });
  });

  describe('calculateJumpDriveCost', () => {
    test('0 tonnage costs 0 credits', () => {
      expect(JumpDrive.calculateJumpDriveCost(0)).toBe(0);
    });

    test('10t drive: 10 × MCr 1.5 = MCr 15 = Cr 15,000,000', () => {
      expect(JumpDrive.calculateJumpDriveCost(10)).toBe(15000000);
    });

    test('15t drive: 15 × MCr 1.5 = MCr 22.5 = Cr 22,500,000', () => {
      expect(JumpDrive.calculateJumpDriveCost(15)).toBe(22500000);
    });

    test('125t drive: 125 × MCr 1.5 = MCr 187.5 = Cr 187,500,000', () => {
      expect(JumpDrive.calculateJumpDriveCost(125)).toBe(187500000);
    });
  });

  describe('getMinimumJumpTL', () => {
    test('Jump-0 requires TL 0', () => {
      expect(JumpDrive.getMinimumJumpTL(0)).toBe(0);
    });

    test('Jump-1 requires TL 9', () => {
      expect(JumpDrive.getMinimumJumpTL(1)).toBe(9);
    });

    test('Jump-2 requires TL 11', () => {
      expect(JumpDrive.getMinimumJumpTL(2)).toBe(11);
    });

    test('Jump-4 requires TL 13', () => {
      expect(JumpDrive.getMinimumJumpTL(4)).toBe(13);
    });

    test('Jump-6 requires TL 15', () => {
      expect(JumpDrive.getMinimumJumpTL(6)).toBe(15);
    });
  });

  describe('validateJumpDrive', () => {
    test('Valid Jump-2 on TL12 100t ship', () => {
      const result = JumpDrive.validateJumpDrive(100, 2, 12);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.driveTonnage).toBe(10);
      expect(result.stats.fuelRequired).toBe(20);
      expect(result.stats.powerRequired).toBe(20);
    });

    test('Jump-4 on TL12 ship fails (requires TL13)', () => {
      const result = JumpDrive.validateJumpDrive(400, 4, 12);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires TL13');
    });

    test('Negative jump rating fails', () => {
      const result = JumpDrive.validateJumpDrive(100, -1, 12);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('cannot be negative');
    });

    test('Jump-10 exceeds maximum', () => {
      const result = JumpDrive.validateJumpDrive(100, 10, 20);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum of 9');
    });

    test('Insufficient fuel generates warning', () => {
      const result = JumpDrive.validateJumpDrive(100, 2, 12, null, 10);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('fuel');
    });

    test('Jump-0 generates warning about no interstellar travel', () => {
      const result = JumpDrive.validateJumpDrive(100, 0, 12);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('cannot travel between star systems');
    });
  });

  describe('calculateJumpPackage', () => {
    test('Scout (100t) with Jump-2 complete package', () => {
      const pkg = JumpDrive.calculateJumpPackage(100, 2);
      expect(pkg.jumpRating).toBe(2);
      expect(pkg.driveTonnage).toBe(10);
      expect(pkg.fuelRequired).toBe(20);
      expect(pkg.powerRequired).toBe(20);
      expect(pkg.cost).toBe(15000000); // MCr 15
      expect(pkg.costMCr).toBe(15);
      expect(pkg.minimumTL).toBe(11);
      expect(pkg.totalTonnage).toBe(30); // 10t drive + 20t fuel
    });

    test('Free Trader (200t) with Jump-2 complete package', () => {
      const pkg = JumpDrive.calculateJumpPackage(200, 2);
      expect(pkg.driveTonnage).toBe(15);
      expect(pkg.fuelRequired).toBe(40);
      expect(pkg.totalTonnage).toBe(55); // 15t drive + 40t fuel
      expect(pkg.costMCr).toBe(22.5); // 15t × MCr 1.5
    });

    test('Patrol Corvette (400t) with Jump-4 complete package', () => {
      const pkg = JumpDrive.calculateJumpPackage(400, 4);
      expect(pkg.driveTonnage).toBe(45);
      expect(pkg.fuelRequired).toBe(160);
      expect(pkg.powerRequired).toBe(160);
      expect(pkg.minimumTL).toBe(13);
      expect(pkg.totalTonnage).toBe(205); // 45t drive + 160t fuel
    });
  });
});
