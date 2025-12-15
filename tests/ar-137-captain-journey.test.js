/**
 * AR-137: Captain Solo Journey Tests
 *
 * Validates captain panel switching (AR-131+) and journey mechanics.
 * Uses Dorannia → Ator route (J-2 distance).
 */

const { getSystemByName, generateGasGiantJumpPoints } = require('../lib/operations/star-system-loader');

// Simple test helpers
function expect(val) {
  return {
    toBe: (expected) => {
      if (val !== expected) throw new Error(`Expected ${expected}, got ${val}`);
    },
    toBeDefined: () => {
      if (val === undefined || val === null) throw new Error('Expected defined value');
    },
    toBeGreaterThan: (n) => {
      if (!(val > n)) throw new Error(`Expected > ${n}, got ${val}`);
    },
    toContain: (str) => {
      if (!val.includes(str)) throw new Error(`Expected to contain "${str}"`);
    },
    toBeCloseTo: (expected, precision) => {
      const diff = Math.abs(val - expected);
      const tolerance = Math.pow(10, -precision);
      if (diff > tolerance) throw new Error(`Expected ${expected} ± ${tolerance}, got ${val}`);
    }
  };
}

const tests = [
  // System Data Validation
  ['Dorannia system exists with required data', () => {
    const sys = getSystemByName('Dorannia');
    expect(sys).toBeDefined();
    expect(sys.hex).toBe('0530');
    expect(sys.celestialObjects).toBeDefined();
    expect(sys.celestialObjects.length).toBeGreaterThan(0);
  }],

  ['Ator system exists with required data', () => {
    const sys = getSystemByName('Ator');
    expect(sys).toBeDefined();
    expect(sys.hex).toBe('0729');
    expect(sys.celestialObjects).toBeDefined();
  }],

  ['Jump distance Dorannia to Ator is 2 parsecs (J-2)', () => {
    const hexDistance = (hex1, hex2) => {
      const x1 = parseInt(hex1.slice(0, 2));
      const y1 = parseInt(hex1.slice(2, 4));
      const x2 = parseInt(hex2.slice(0, 2));
      const y2 = parseInt(hex2.slice(2, 4));
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dx + dy));
    };
    expect(hexDistance('0530', '0729')).toBe(2);
  }],

  // AR-136: Gas Giant Jump Points
  ['Gas giant jump points are generated', () => {
    const sys = getSystemByName('Dorannia');
    const jumpPoints = sys?.celestialObjects?.filter(o => o.type === 'Jump Point') || [];
    const gasGiants = sys?.celestialObjects?.filter(o => o.type === 'Gas Giant') || [];

    // If there are gas giants, there should be jump points
    if (gasGiants.length > 0) {
      expect(jumpPoints.length).toBeGreaterThan(0);
    }
  }],

  ['Jump point at 100 diameters from gas giant', () => {
    const mockSystem = {
      celestialObjects: [{
        id: 'test-gg',
        name: 'Test Gas Giant',
        type: 'Gas Giant',
        orbitAU: 5.0,
        radiusKm: 50000  // 100,000 km diameter
      }]
    };

    generateGasGiantJumpPoints(mockSystem);
    const jp = mockSystem.celestialObjects.find(o => o.type === 'Jump Point');
    expect(jp).toBeDefined();

    // 100 diameters = 200 * radiusKm = 10,000,000 km
    const expectedDistanceAU = (200 * 50000) / 149597870.7;
    const actualDistanceAU = jp.orbitAU - 5.0;
    expect(actualDistanceAU).toBeCloseTo(expectedDistanceAU, 4);
  }],

  // AR-131+: Captain Panel Functions (browser module, verify file exists)
  ['Role panel module exists', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../public/operations/modules/role-panels.js');
    expect(fs.existsSync(filePath)).toBe(true);

    // Verify module contains captain panel switching code
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content.includes('switchCaptainPanel')).toBe(true);
    expect(content.includes('captainActivePanel')).toBe(true);
  }]
];

// Run tests
console.log('AR-137 Captain Solo Journey Tests\n');
console.log('=' .repeat(50));

let passed = 0;
let failed = 0;

tests.forEach(([name, fn]) => {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
});

console.log('=' .repeat(50));
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

process.exit(failed > 0 ? 1 : 0);
