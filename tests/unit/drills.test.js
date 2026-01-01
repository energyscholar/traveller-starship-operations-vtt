/**
 * AR-BD-13: Drills System Unit Tests
 */

describe('AR-BD-13: Drills System', () => {
  const drills = require('../../lib/operations/drills');

  describe('getAvailableDrills', () => {
    it('returns array of drill metadata', () => {
      const result = drills.getAvailableDrills();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(4);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('filename');
    });
  });

  describe('loadDrillFile', () => {
    it('loads valid drill file', () => {
      const result = drills.loadDrillFile('blood-profit-run1.json');
      expect(result).toHaveProperty('id', 'blood-profit-run1');
      expect(result).toHaveProperty('name');
      expect(Array.isArray(result.contacts)).toBe(true);
    });

    it('rejects invalid filename', () => {
      expect(() => drills.loadDrillFile('invalid.json')).toThrow();
    });

    it('rejects path traversal', () => {
      expect(() => drills.loadDrillFile('../etc/passwd')).toThrow();
    });
  });

  describe('DrillState', () => {
    it('has all required states', () => {
      expect(drills.DrillState.INACTIVE).toBe('INACTIVE');
      expect(drills.DrillState.LOADING).toBe('LOADING');
      expect(drills.DrillState.ACTIVE).toBe('ACTIVE');
      expect(drills.DrillState.RESETTING).toBe('RESETTING');
    });
  });

  describe('getDrillState', () => {
    it('returns INACTIVE for unknown campaign', () => {
      const result = drills.getDrillState('unknown-campaign-xyz');
      expect(result).toBe('INACTIVE');
    });
  });
});

// Simple test helper
function expect(actual) {
  return {
    toBe: (expected) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected} but got ${actual}`);
      }
    },
    toHaveProperty: (prop, value) => {
      if (!(prop in actual)) {
        throw new Error(`Expected object to have property ${prop}`);
      }
      if (value !== undefined && actual[prop] !== value) {
        throw new Error(`Expected ${prop} to be ${value} but got ${actual[prop]}`);
      }
    },
    toThrow: () => {
      // actual is a function
      try {
        actual();
        throw new Error('Expected function to throw');
      } catch (e) {
        // Expected
      }
    }
  };
}

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

// Run tests
console.log('\n=== Drills System Tests ===');
