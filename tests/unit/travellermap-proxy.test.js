/**
 * TravellerMap Proxy Module Tests
 * AR-121: Tests for lib/travellermap.js
 */

// Test utilities
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected ${expected}, got ${actual}`);
  }
}

function assertType(value, type, msg = '') {
  if (typeof value !== type) {
    throw new Error(`${msg} Expected typeof ${type}, got ${typeof value}`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected truthy value, got ${value}`);
  }
}

// ==================== Tests ====================

console.log('\n=== TravellerMap Proxy Tests ===\n');

// Import the module
const travellerMap = require('../../lib/travellermap');

// Module loading
console.log('Module Loading (1 test):');

test('Module loads successfully', () => {
  assertTrue(travellerMap, 'Module should load');
});

// Core exports
console.log('\nCore Exports (5 tests):');

test('searchWorlds is a function', () => {
  assertType(travellerMap.searchWorlds, 'function');
});

test('getWorld is a function', () => {
  assertType(travellerMap.getWorld, 'function');
});

test('getJumpWorlds is a function', () => {
  assertType(travellerMap.getJumpWorlds, 'function');
});

test('getJumpMapImage is a function', () => {
  assertType(travellerMap.getJumpMapImage, 'function');
});

test('getSectorData is a function', () => {
  assertType(travellerMap.getSectorData, 'function');
});

// AR-121 extended exports
console.log('\nAR-121 Extended Exports (3 tests):');

test('getJumpRoute is a function', () => {
  assertType(travellerMap.getJumpRoute, 'function');
});

test('getCoordinates is a function', () => {
  assertType(travellerMap.getCoordinates, 'function');
});

test('listSectors is a function', () => {
  assertType(travellerMap.listSectors, 'function');
});

// Cache management exports
console.log('\nCache Management (5 tests):');

test('clearCache is a function', () => {
  assertType(travellerMap.clearCache, 'function');
});

test('getCacheStats is a function', () => {
  assertType(travellerMap.getCacheStats, 'function');
});

test('cleanupExpiredCache is a function', () => {
  assertType(travellerMap.cleanupExpiredCache, 'function');
});

test('getCacheStats returns correct structure', () => {
  const stats = travellerMap.getCacheStats();
  assertTrue(typeof stats === 'object', 'Should return object');
  assertTrue('totalEntries' in stats, 'Should have totalEntries');
  assertTrue('validEntries' in stats, 'Should have validEntries');
  assertTrue('expiredEntries' in stats, 'Should have expiredEntries');
});

test('clearCache executes without error', () => {
  travellerMap.clearCache();
  assertTrue(true);
});

// Jump map params
console.log('\nJump Map Params (3 tests):');

test('getJumpMapParams returns correct structure', () => {
  const params = travellerMap.getJumpMapParams('Spinward Marches', '1910', 2, 'terminal');
  assertEqual(params.sector, 'Spinward Marches');
  assertEqual(params.hex, '1910');
  assertEqual(params.jump, 2);
  assertEqual(params.style, 'terminal');
  assertEqual(params.scale, 48);
});

test('Jump clamped to minimum 1', () => {
  const params = travellerMap.getJumpMapParams('Test', '0101', 0, 'poster');
  assertEqual(params.jump, 1);
});

test('Jump clamped to maximum 6', () => {
  const params = travellerMap.getJumpMapParams('Test', '0101', 10, 'poster');
  assertEqual(params.jump, 6);
});

// Summary
console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('==================================================');
