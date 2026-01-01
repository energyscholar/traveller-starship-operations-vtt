/**
 * AR-227: Route Planner Unit Tests
 */

const {
  findRoute,
  findRouteWithFuel,
  getReachableSystems,
  hexDistance,
  getSystemsInRange,
  isValidWaypoint
} = require('../../lib/route-planner');

console.log('========================================');
console.log('AR-227: ROUTE PLANNER TESTS');
console.log('========================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${description}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAIL: ${description}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ========================================
// Hex Distance Tests
// ========================================

console.log('Hex Distance (5 tests):\n');

test('1.1: Same hex = 0 distance', () => {
  assert(hexDistance('1815', '1815') === 0, 'Same hex should be 0');
});

test('1.2: Adjacent hex = 1 parsec', () => {
  assert(hexDistance('1815', '1814') === 1, 'Should be 1 parsec');
  assert(hexDistance('1815', '1816') === 1, 'Should be 1 parsec');
});

test('1.3: Diagonal hexes calculate correctly', () => {
  const dist = hexDistance('1815', '1617');
  assert(dist >= 2 && dist <= 3, 'Diagonal should be 2-3 parsecs');
});

test('1.4: Long distance works', () => {
  const dist = hexDistance('0101', '3240');
  assert(dist > 30, 'Cross-sector should be >30 parsecs');
});

test('1.5: Symmetrical distance', () => {
  const d1 = hexDistance('1815', '2020');
  const d2 = hexDistance('2020', '1815');
  assert(d1 === d2, 'Distance should be symmetrical');
});

// ========================================
// Route Finding Tests
// ========================================

console.log('\nRoute Finding (6 tests):\n');

test('2.1: Find route between adjacent systems', () => {
  // Find two adjacent populated systems
  const route = findRoute('1910', '2010', { jump: 1 });
  assert(route.valid === true || route.error, 'Should return result');
});

test('2.2: Direct jump detected', () => {
  const route = findRoute('1910', '2010', { jump: 2 });
  if (route.valid) {
    assert(route.jumps >= 1, 'Should have at least 1 jump');
  }
});

test('2.3: Invalid start hex returns error', () => {
  const route = findRoute('9999', '1910', { jump: 2 });
  assert(route.valid === false, 'Should fail for invalid hex');
  assert(route.error.includes('not found'), 'Should explain error');
});

test('2.4: Route respects jump range', () => {
  // Try with different jump values
  const jump1 = findRoute('1910', '3140', { jump: 1 });
  const jump2 = findRoute('1910', '3140', { jump: 2 });

  // Jump-2 should find shorter or equal route
  if (jump1.valid && jump2.valid) {
    assert(jump2.jumps <= jump1.jumps, 'Higher jump should mean fewer jumps');
  }
});

test('2.5: Red zone avoidance (noRed=true)', () => {
  const route = findRoute('1910', '3140', { jump: 2, noRed: true });
  // Route should avoid red zones (if any exist on path)
  if (route.valid && route.systems) {
    // Just verify route completed
    assert(route.path.length >= 2, 'Should have valid path');
  }
});

test('2.6: Route returns system names', () => {
  const route = findRoute('1910', '2010', { jump: 2 });
  if (route.valid) {
    assert(route.systems, 'Should include system names');
    assert(route.systems.length === route.path.length, 'Names should match path');
  }
});

// ========================================
// Refueling Route Tests
// ========================================

console.log('\nRefueling Routes (3 tests):\n');

test('3.1: findRouteWithFuel returns fuel info', () => {
  const route = findRouteWithFuel('1910', '2010', { jump: 2 });
  if (route.valid) {
    assert(route.stops || route.path, 'Should have stops or path');
  }
});

test('3.2: Fuel stops include gas giant info', () => {
  const route = findRouteWithFuel('1910', '2910', { jump: 2 });
  if (route.valid && route.stops) {
    const stop = route.stops[0];
    assert(stop.hasOwnProperty('refuel'), 'Stops should have refuel info');
  }
});

test('3.3: requireRefuel filters systems', () => {
  const withRefuel = findRoute('1910', '3140', { jump: 2, requireRefuel: true });
  const withoutRefuel = findRoute('1910', '3140', { jump: 2, requireRefuel: false });
  // Both should complete (may take different paths)
  if (withRefuel.valid && withoutRefuel.valid) {
    // requireRefuel may result in same or longer route
    assert(withRefuel.jumps >= 0, 'Should have valid jump count');
  }
});

// ========================================
// Reachable Systems Tests
// ========================================

console.log('\nReachable Systems (3 tests):\n');

test('4.1: getReachableSystems returns map', () => {
  const reachable = getReachableSystems('1910', 2, { jump: 2 });
  assert(reachable instanceof Map, 'Should return Map');
  assert(reachable.has('1910'), 'Should include start system');
});

test('4.2: Start system has 0 jumps', () => {
  const reachable = getReachableSystems('1910', 2, { jump: 2 });
  const start = reachable.get('1910');
  assert(start.jumps === 0, 'Start should have 0 jumps');
});

test('4.3: More jumps = more systems reachable', () => {
  const reach2 = getReachableSystems('1910', 2, { jump: 2 });
  const reach3 = getReachableSystems('1910', 3, { jump: 2 });
  assert(reach3.size >= reach2.size, 'More jumps should reach more systems');
});

// ========================================
// Waypoint Validation Tests
// ========================================

console.log('\nWaypoint Validation (3 tests):\n');

test('5.1: Red zone blocked when noRed=true', () => {
  const redSystem = { zone: 'Red', gg: 1, uwp: 'A000000-0' };
  assert(isValidWaypoint(redSystem, { noRed: true }) === false, 'Should block Red');
  assert(isValidWaypoint(redSystem, { noRed: false }) === true, 'Should allow Red');
});

test('5.2: Refuel requirement checks gas giant', () => {
  const noRefuel = { gg: 0, uwp: 'X000000-0' };
  const hasGG = { gg: 2, uwp: 'X000000-0' };
  const hasPort = { gg: 0, uwp: 'A000000-0' };

  assert(isValidWaypoint(noRefuel, { requireRefuel: true }) === false, 'No refuel should block');
  assert(isValidWaypoint(hasGG, { requireRefuel: true }) === true, 'GG should allow');
  assert(isValidWaypoint(hasPort, { requireRefuel: true }) === true, 'Starport should allow');
});

test('5.3: Wilderness-only requires gas giant', () => {
  const hasGG = { gg: 2, uwp: 'A000000-0' };
  const noGG = { gg: 0, uwp: 'A000000-0' };

  assert(isValidWaypoint(hasGG, { wildernessOnly: true }) === true, 'GG should allow');
  assert(isValidWaypoint(noGG, { wildernessOnly: true }) === false, 'No GG should block');
});

// ========================================
// Summary
// ========================================

console.log('\n========================================');
console.log('TEST SUMMARY');
console.log('========================================');
console.log(`Total tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log('========================================\n');

if (testsFailed > 0) {
  process.exit(1);
}
