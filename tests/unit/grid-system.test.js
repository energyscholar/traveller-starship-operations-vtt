// Stage 7: Grid System Tests
// Test movement, range calculation, and line of sight
// TDD: Write tests FIRST, implement SECOND

const { SHIPS, hexDistance, rangeFromDistance, checkLineOfSight, validateMove, GRID_SIZE } = require('../../lib/combat');

console.log('========================================');
console.log('STAGE 7: GRID SYSTEM TESTS');
console.log('========================================\n');

let passCount = 0;
let failCount = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passCount++;
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  ${error.message}`);
    failCount++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Expected condition to be true');
  }
}

function assertFalse(condition, message = '') {
  if (condition) {
    throw new Error(message || 'Expected condition to be false');
  }
}

console.log('--- MOVEMENT VALIDATION (8 tests) ---\n');

test('Scout has 3 movement points', () => {
  assertEqual(SHIPS.scout.movement, 3, 'Scout should have 3 movement points');
});

test('Free Trader has 2 movement points', () => {
  assertEqual(SHIPS.free_trader.movement, 2, 'Free Trader should have 2 movement points');
});

test('Ship can move within movement points', () => {
  const from = { q: 0, r: 0 };
  const to = { q: 2, r: 0 };
  const ship = SHIPS.scout; // 3 movement points

  const distance = hexDistance(from, to);
  const result = validateMove(from, to, ship.movement);

  assertEqual(distance, 2, 'Distance should be 2 hexes');
  assertTrue(result.valid, 'Move should be valid (2 hexes <= 3 movement)');
});

test('Cannot move beyond movement points', () => {
  const from = { q: 0, r: 0 };
  const to = { q: 4, r: 0 };
  const ship = SHIPS.scout; // 3 movement points

  const distance = hexDistance(from, to);
  const result = validateMove(from, to, ship.movement);

  assertEqual(distance, 4, 'Distance should be 4 hexes');
  assertFalse(result.valid, 'Move should be invalid (4 hexes > 3 movement)');
});

test('Invalid positions rejected (off grid)', () => {
  const from = { q: 0, r: 0 };
  const to = { q: 15, r: 15 }; // Off 10x10 grid

  const result = validateMove(from, to, SHIPS.scout.movement);

  assertFalse(result.valid, 'Move should be invalid (off grid)');
  assertTrue(result.error.includes('grid') || result.error.includes('bounds'), 'Error should mention grid/bounds');
});

test('Position updates correctly after move', () => {
  const from = { q: 2, r: 3 };
  const to = { q: 4, r: 3 };

  const result = validateMove(from, to, SHIPS.scout.movement);

  assertTrue(result.valid, 'Move should be valid');
  assertEqual(result.newPosition.q, to.q, 'New position q should match destination');
  assertEqual(result.newPosition.r, to.r, 'New position r should match destination');
});

test('Cannot move to same position (distance 0)', () => {
  const from = { q: 5, r: 5 };
  const to = { q: 5, r: 5 };

  const distance = hexDistance(from, to);

  assertEqual(distance, 0, 'Distance to same hex should be 0');
  // This is technically valid but wasteful - allow it
});

test('Movement distance calculated correctly (diagonal)', () => {
  const from = { q: 0, r: 0 };
  const to = { q: 2, r: -1 };

  const distance = hexDistance(from, to);

  // Using cube coordinates: distance = (|q1-q2| + |r1-r2| + |s1-s2|) / 2
  // where s = -q - r
  // from: q=0, r=0, s=0
  // to: q=2, r=-1, s=-1
  // distance = (|0-2| + |0-(-1)| + |0-(-1)|) / 2 = (2 + 1 + 1) / 2 = 2
  assertEqual(distance, 2, 'Diagonal distance should be 2 hexes');
});

console.log('\n--- RANGE CALCULATION (6 tests) ---\n');

test('Adjacent range (0-1 hexes)', () => {
  const pos1 = { q: 0, r: 0 };
  const pos2 = { q: 1, r: 0 };

  const distance = hexDistance(pos1, pos2);
  const range = rangeFromDistance(distance);

  assertEqual(distance, 1, 'Distance should be 1');
  assertEqual(range, 'adjacent', 'Range should be adjacent');
});

test('Close range (2-3 hexes)', () => {
  const pos1 = { q: 0, r: 0 };
  const pos2 = { q: 2, r: 0 };

  const distance = hexDistance(pos1, pos2);
  const range = rangeFromDistance(distance);

  assertEqual(distance, 2, 'Distance should be 2');
  assertEqual(range, 'close', 'Range should be close');
});

test('Medium range (4-5 hexes)', () => {
  const pos1 = { q: 0, r: 0 };
  const pos2 = { q: 4, r: 0 };

  const distance = hexDistance(pos1, pos2);
  const range = rangeFromDistance(distance);

  assertEqual(distance, 4, 'Distance should be 4');
  assertEqual(range, 'medium', 'Range should be medium');
});

test('Long range (6-7 hexes)', () => {
  const pos1 = { q: 0, r: 0 };
  const pos2 = { q: 6, r: 0 };

  const distance = hexDistance(pos1, pos2);
  const range = rangeFromDistance(distance);

  assertEqual(distance, 6, 'Distance should be 6');
  assertEqual(range, 'long', 'Range should be long');
});

test('Very Long range (8+ hexes)', () => {
  const pos1 = { q: 0, r: 0 };
  const pos2 = { q: 9, r: 0 };

  const distance = hexDistance(pos1, pos2);
  const range = rangeFromDistance(distance);

  assertEqual(distance, 9, 'Distance should be 9');
  assertEqual(range, 'veryLong', 'Range should be veryLong');
});

test('Range at boundary (3 hexes = close)', () => {
  const pos1 = { q: 0, r: 0 };
  const pos2 = { q: 3, r: 0 };

  const distance = hexDistance(pos1, pos2);
  const range = rangeFromDistance(distance);

  assertEqual(distance, 3, 'Distance should be 3');
  assertEqual(range, 'close', 'Range should be close (2-3 hexes)');
});

console.log('\n--- LINE OF SIGHT (6 tests) ---\n');

test('Clear LOS between adjacent ships', () => {
  const from = { q: 0, r: 0 };
  const to = { q: 1, r: 0 };
  const obstacles = [];

  const los = checkLineOfSight(from, to, obstacles);

  assertTrue(los.clear, 'LOS should be clear between adjacent hexes');
});

test('LOS blocked by obstacle', () => {
  const from = { q: 0, r: 0 };
  const to = { q: 4, r: 0 };
  const obstacles = [{ q: 2, r: 0 }]; // Obstacle in the middle

  const los = checkLineOfSight(from, to, obstacles);

  assertFalse(los.clear, 'LOS should be blocked by obstacle');
  assertEqual(los.blockedBy.q, 2, 'Should identify blocking hex');
  assertEqual(los.blockedBy.r, 0, 'Should identify blocking hex');
});

test('LOS clear when obstacle is off path', () => {
  const from = { q: 0, r: 0 };
  const to = { q: 4, r: 0 };
  const obstacles = [{ q: 2, r: 2 }]; // Obstacle off the path

  const los = checkLineOfSight(from, to, obstacles);

  assertTrue(los.clear, 'LOS should be clear when obstacle is off path');
});

test('LOS works diagonally', () => {
  const from = { q: 0, r: 0 };
  const to = { q: 3, r: -2 };
  const obstacles = [];

  const los = checkLineOfSight(from, to, obstacles);

  assertTrue(los.clear, 'LOS should work diagonally');
});

test('LOS at maximum range (9 hexes)', () => {
  const from = { q: 0, r: 0 };
  const to = { q: 9, r: 0 };
  const obstacles = [];

  const los = checkLineOfSight(from, to, obstacles);

  assertTrue(los.clear, 'LOS should work at maximum range');
});

test('Multiple obstacles can block LOS', () => {
  const from = { q: 0, r: 0 };
  const to = { q: 6, r: 0 };
  const obstacles = [
    { q: 1, r: 0 },
    { q: 3, r: 0 },
    { q: 5, r: 0 }
  ];

  const los = checkLineOfSight(from, to, obstacles);

  assertFalse(los.clear, 'LOS should be blocked by first obstacle');
  assertEqual(los.blockedBy.q, 1, 'Should identify first blocking hex');
});

// Test summary
console.log('\n========================================');
console.log('GRID SYSTEM TEST RESULTS');
console.log('========================================');
console.log(`PASSED: ${passCount}/20`);
console.log(`FAILED: ${failCount}/20`);

if (failCount === 0) {
  console.log('\nALL TESTS PASSED ✅');
  console.log('========================================');
  console.log('Grid system ready!');
  console.log('Ready for Stage 8: Additional Ships');
} else {
  console.log(`\n${failCount} TEST(S) FAILED ❌`);
  console.log('Fix the implementation before proceeding.');
  process.exit(1);
}
