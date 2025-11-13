// ======== BRIDGE MODULE UNIT TESTS ========

const Bridge = require('../../lib/ship-bridge');

describe('Bridge Calculations', () => {

  describe('calculateBridgeTonnage', () => {
    test('Cockpit (≤50t): 1.5 tons', () => {
      expect(Bridge.calculateBridgeTonnage(30, 'cockpit')).toBe(1.5);
      expect(Bridge.calculateBridgeTonnage(50, 'cockpit')).toBe(1.5);
    });

    test('Dual cockpit (≤50t): 2.5 tons', () => {
      expect(Bridge.calculateBridgeTonnage(40, 'dual_cockpit')).toBe(2.5);
    });

    test('Cockpit on >50t hull throws error', () => {
      expect(() => Bridge.calculateBridgeTonnage(100, 'cockpit')).toThrow('only available for ships 50 tons or less');
    });

    test('Hull ≤50t: 3 tons', () => {
      expect(Bridge.calculateBridgeTonnage(30)).toBe(3);
      expect(Bridge.calculateBridgeTonnage(50)).toBe(3);
    });

    test('Hull 51-99t: 6 tons', () => {
      expect(Bridge.calculateBridgeTonnage(75)).toBe(6);
      expect(Bridge.calculateBridgeTonnage(99)).toBe(6);
    });

    test('Hull 100-200t: 10 tons', () => {
      expect(Bridge.calculateBridgeTonnage(100)).toBe(10);
      expect(Bridge.calculateBridgeTonnage(200)).toBe(10);
    });

    test('Hull 201-1,000t: 20 tons', () => {
      expect(Bridge.calculateBridgeTonnage(400)).toBe(20);
      expect(Bridge.calculateBridgeTonnage(1000)).toBe(20);
    });

    test('Hull 1,001-2,000t: 40 tons', () => {
      expect(Bridge.calculateBridgeTonnage(1500)).toBe(40);
      expect(Bridge.calculateBridgeTonnage(2000)).toBe(40);
    });

    test('Hull 2,001-100,000t: 60 tons', () => {
      expect(Bridge.calculateBridgeTonnage(5000)).toBe(60);
      expect(Bridge.calculateBridgeTonnage(100000)).toBe(60);
    });

    test('Command bridge adds 40 tons', () => {
      expect(Bridge.calculateBridgeTonnage(5000, 'command_bridge')).toBe(100); // 60 + 40
    });

    test('Command bridge on <5000t hull throws error', () => {
      expect(() => Bridge.calculateBridgeTonnage(1000, 'command_bridge')).toThrow('only available for ships 5,000 tons');
    });
  });

  describe('calculateBridgeCost', () => {
    test('Cockpit: Cr 10,000', () => {
      expect(Bridge.calculateBridgeCost(30, 'cockpit')).toBe(10000);
    });

    test('Dual cockpit: Cr 15,000', () => {
      expect(Bridge.calculateBridgeCost(40, 'dual_cockpit')).toBe(15000);
    });

    test('100t hull: MCr 0.5 = Cr 500,000', () => {
      expect(Bridge.calculateBridgeCost(100)).toBe(500000);
    });

    test('200t hull: MCr 1 = Cr 1,000,000', () => {
      expect(Bridge.calculateBridgeCost(200)).toBe(1000000);
    });

    test('400t hull: MCr 2 = Cr 2,000,000', () => {
      expect(Bridge.calculateBridgeCost(400)).toBe(2000000);
    });

    test('Command bridge adds MCr 30', () => {
      const baseCost = Bridge.calculateBridgeCost(5000);
      const commandCost = Bridge.calculateBridgeCost(5000, 'command_bridge');
      expect(commandCost).toBe(baseCost + 30000000);
    });
  });

  describe('validateBridge', () => {
    test('Valid standard bridge on 100t hull', () => {
      const result = Bridge.validateBridge(100);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.tonnage).toBe(10);
      expect(result.stats.cost).toBe(500000);
    });

    test('Valid cockpit on 50t hull', () => {
      const result = Bridge.validateBridge(50, 'cockpit');
      expect(result.valid).toBe(true);
      expect(result.stats.tonnage).toBe(1.5);
    });

    test('Invalid bridge type fails', () => {
      const result = Bridge.validateBridge(100, 'invalid');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid bridge type');
    });

    test('Cockpit on large hull fails', () => {
      const result = Bridge.validateBridge(100, 'cockpit');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('50 tons or less');
    });

    test('Insufficient tonnage fails', () => {
      const result = Bridge.validateBridge(100, 'standard', 5);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('requires 10t, only 5t available');
    });

    test('Cockpit generates 24-hour warning', () => {
      const result = Bridge.validateBridge(30, 'cockpit');
      expect(result.warnings).toContainEqual(expect.stringContaining('24 hours'));
    });

    test('Small bridge generates DM-1 warning', () => {
      const result = Bridge.validateBridge(75);
      expect(result.warnings).toContainEqual(expect.stringContaining('DM-1'));
    });
  });

  describe('getRecommendedBridgeType', () => {
    test('≤50t recommends cockpit', () => {
      expect(Bridge.getRecommendedBridgeType(30)).toBe('cockpit');
      expect(Bridge.getRecommendedBridgeType(50)).toBe('cockpit');
    });

    test('51-4999t recommends standard', () => {
      expect(Bridge.getRecommendedBridgeType(100)).toBe('standard');
      expect(Bridge.getRecommendedBridgeType(1000)).toBe('standard');
    });

    test('≥5000t recommends command bridge', () => {
      expect(Bridge.getRecommendedBridgeType(5000)).toBe('command_bridge');
      expect(Bridge.getRecommendedBridgeType(10000)).toBe('command_bridge');
    });
  });

  describe('Integration Tests - Real Ship Specs', () => {
    test('Type-S Scout: 100t hull, 10t bridge, Cr 500,000', () => {
      const result = Bridge.validateBridge(100);
      expect(result.valid).toBe(true);
      expect(result.stats.tonnage).toBe(10);
      expect(result.stats.cost).toBe(500000);
    });

    test('Type-A Free Trader: 200t hull, 10t bridge, Cr 1,000,000', () => {
      const result = Bridge.validateBridge(200);
      expect(result.valid).toBe(true);
      expect(result.stats.tonnage).toBe(10);
      expect(result.stats.cost).toBe(1000000);
    });

    test('Patrol Corvette: 400t hull, 20t bridge', () => {
      const result = Bridge.validateBridge(400);
      expect(result.valid).toBe(true);
      expect(result.stats.tonnage).toBe(20);
      expect(result.stats.cost).toBe(2000000);
    });
  });

});
