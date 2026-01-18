/**
 * TDD Tests for Unified Coordinate System
 *
 * The coordinate system must handle:
 * 1. Absolute positions (km from system origin)
 * 2. Location-based positions (at station X orbiting planet Y)
 * 3. Orbital dynamics (ships/stations move with their parent body)
 * 4. Transit (ships moving along a course between points)
 * 5. Reference frame conversion (system-wide vs planet-local)
 */

const {
  // Constants
  AU_IN_KM,
  KM_PER_HOUR_1G,

  // Unit conversions
  auToKm,
  kmToAu,

  // Position/velocity creation
  createPosition,
  createVelocity,

  // Distance calculations
  distanceBetween,

  // Orbital mechanics
  getOrbitalPosition,
  getAbsolutePosition,
  getRelativePosition,

  // Transit/movement
  calculateCourse,
  getTimeToDestination,
  moveAlongCourse,

  // Reference frame transforms
  systemToLocal,
  localToSystem,

  // Ship state
  updateOrbitingBody,

  // Star system data bridge
  getLocationPosition,
  getDistanceBetweenLocations
} = require('../../lib/coordinates');

// =============================================================================
// Test Runner
// =============================================================================

let passed = 0;
let failed = 0;
let currentSection = '';

function section(name) {
  currentSection = name;
  console.log(`\n--- ${name} ---\n`);
}

function test(name, fn) {
  try {
    fn();
    console.log(`\x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.log(`\x1b[31m✗\x1b[0m ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function assertCloseTo(actual, expected, tolerance = 1, message) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(message || `Expected ${expected} ± ${tolerance}, got ${actual} (diff: ${diff})`);
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

console.log('\n=== Coordinate System Tests ===');

section('Constants');

test('AU_IN_KM is astronomically correct', () => {
  assertCloseTo(AU_IN_KM, 149597870.7, 1);
});

test('KM_PER_HOUR_1G is physically reasonable for 1G cruise', () => {
  assert(KM_PER_HOUR_1G > 30000, 'Should be > 30000 km/h');
  assert(KM_PER_HOUR_1G < 40000, 'Should be < 40000 km/h');
});

// =============================================================================
// UNIT CONVERSIONS
// =============================================================================

section('Unit Conversions');

test('auToKm converts 1 AU correctly', () => {
  assertCloseTo(auToKm(1), 149597870.7, 1);
});

test('auToKm converts 0 AU to 0 km', () => {
  assertEqual(auToKm(0), 0);
});

test('auToKm converts fractional AU', () => {
  assertCloseTo(auToKm(0.5), 74798935.35, 1);
});

test('kmToAu converts 1 AU worth of km back', () => {
  assertCloseTo(kmToAu(149597870.7), 1, 0.000001);
});

test('kmToAu converts 0 km to 0 AU', () => {
  assertEqual(kmToAu(0), 0);
});

test('round-trip conversion preserves value', () => {
  const original = 2.5;
  const km = auToKm(original);
  const backToAu = kmToAu(km);
  assertCloseTo(backToAu, original, 0.0000001);
});

// =============================================================================
// POSITION CREATION
// =============================================================================

section('Position Creation');

test('createPosition with km coordinates', () => {
  const pos = createPosition(1000, 2000, 0);
  assertEqual(pos.x, 1000);
  assertEqual(pos.y, 2000);
  assertEqual(pos.z, 0);
  assertEqual(pos.unit, 'km');
});

test('createPosition defaults z to 0', () => {
  const pos = createPosition(100, 200);
  assertEqual(pos.z, 0);
});

test('createPosition can specify unit', () => {
  const pos = createPosition(1, 2, 0, 'au');
  assertEqual(pos.unit, 'au');
});

test('createVelocity with km/h', () => {
  const vel = createVelocity(1000, 500, 0);
  assertEqual(vel.x, 1000);
  assertEqual(vel.y, 500);
  assertEqual(vel.z, 0);
  assertEqual(vel.unit, 'km/h');
});

// =============================================================================
// DISTANCE CALCULATIONS
// =============================================================================

section('Distance Calculations');

test('distanceBetween same point is 0', () => {
  const p1 = createPosition(100, 200, 0);
  const p2 = createPosition(100, 200, 0);
  assertEqual(distanceBetween(p1, p2), 0);
});

test('distanceBetween horizontal distance', () => {
  const p1 = createPosition(0, 0, 0);
  const p2 = createPosition(1000, 0, 0);
  assertEqual(distanceBetween(p1, p2), 1000);
});

test('distanceBetween vertical distance', () => {
  const p1 = createPosition(0, 0, 0);
  const p2 = createPosition(0, 1000, 0);
  assertEqual(distanceBetween(p1, p2), 1000);
});

test('distanceBetween diagonal (3-4-5 triangle)', () => {
  const p1 = createPosition(0, 0, 0);
  const p2 = createPosition(3000, 4000, 0);
  assertEqual(distanceBetween(p1, p2), 5000);
});

test('distanceBetween 3D distance', () => {
  const p1 = createPosition(0, 0, 0);
  const p2 = createPosition(100, 200, 200);
  // sqrt(100^2 + 200^2 + 200^2) = sqrt(10000 + 40000 + 40000) = sqrt(90000) = 300
  assertEqual(distanceBetween(p1, p2), 300);
});

test('distanceBetween converts units if needed', () => {
  const p1 = createPosition(0, 0, 0, 'km');
  const p2 = createPosition(1, 0, 0, 'au');
  assertCloseTo(distanceBetween(p1, p2), 149597870.7, 1);
});

// =============================================================================
// ORBITAL POSITION CALCULATIONS
// =============================================================================

section('Orbital Position Calculations');

test('getOrbitalPosition at time 0 is on positive X axis', () => {
  const pos = getOrbitalPosition({
    orbitRadiusKm: 1000000,
    orbitPeriodHours: 24,
    initialBearing: 0
  }, 0);

  assertCloseTo(pos.x, 1000000, 1);
  assertCloseTo(pos.y, 0, 1);
});

test('getOrbitalPosition at quarter period is on positive Y axis', () => {
  const pos = getOrbitalPosition({
    orbitRadiusKm: 1000000,
    orbitPeriodHours: 24,
    initialBearing: 0
  }, 6); // 6 hours = quarter of 24-hour period

  assertCloseTo(pos.x, 0, 1);
  assertCloseTo(pos.y, 1000000, 1);
});

test('getOrbitalPosition at half period is on negative X axis', () => {
  const pos = getOrbitalPosition({
    orbitRadiusKm: 1000000,
    orbitPeriodHours: 24,
    initialBearing: 0
  }, 12);

  assertCloseTo(pos.x, -1000000, 1);
  assertCloseTo(pos.y, 0, 1);
});

test('getOrbitalPosition respects initial bearing', () => {
  const pos = getOrbitalPosition({
    orbitRadiusKm: 1000000,
    orbitPeriodHours: 24,
    initialBearing: 90  // Start on positive Y axis
  }, 0);

  assertCloseTo(pos.x, 0, 1);
  assertCloseTo(pos.y, 1000000, 1);
});

test('getOrbitalPosition full period returns to start', () => {
  const orbit = {
    orbitRadiusKm: 1000000,
    orbitPeriodHours: 24,
    initialBearing: 45
  };

  const start = getOrbitalPosition(orbit, 0);
  const end = getOrbitalPosition(orbit, 24);

  assertCloseTo(end.x, start.x, 1);
  assertCloseTo(end.y, start.y, 1);
});

// =============================================================================
// HIERARCHICAL POSITION (body orbiting body)
// =============================================================================

section('Hierarchical Position Calculations');

// Test system: Star -> Planet -> Moon -> Station
const testSystem = {
  star: {
    id: 'star',
    type: 'Star',
    position: createPosition(0, 0, 0)
  },
  planet: {
    id: 'planet',
    type: 'Planet',
    parentId: 'star',
    orbitRadiusKm: 150000000,  // ~1 AU
    orbitPeriodHours: 8760,    // 1 year
    initialBearing: 0
  },
  moon: {
    id: 'moon',
    type: 'Moon',
    parentId: 'planet',
    orbitRadiusKm: 400000,     // Like Earth's moon
    orbitPeriodHours: 720,     // ~30 days
    initialBearing: 0
  },
  station: {
    id: 'station',
    type: 'Station',
    parentId: 'moon',
    orbitRadiusKm: 500,
    orbitPeriodHours: 2,
    initialBearing: 0
  }
};

test('getAbsolutePosition of star is origin', () => {
  const pos = getAbsolutePosition(testSystem.star, testSystem, 0);
  assertEqual(pos.x, 0);
  assertEqual(pos.y, 0);
});

test('getAbsolutePosition of planet at time 0', () => {
  const pos = getAbsolutePosition(testSystem.planet, testSystem, 0);
  assertCloseTo(pos.x, 150000000, 1);
  assertCloseTo(pos.y, 0, 1);
});

test('getAbsolutePosition of moon includes planet position', () => {
  const pos = getAbsolutePosition(testSystem.moon, testSystem, 0);
  // Planet at (150M, 0), moon at +400k from planet
  assertCloseTo(pos.x, 150400000, 1);
  assertCloseTo(pos.y, 0, 1);
});

test('getAbsolutePosition of station includes full chain', () => {
  const pos = getAbsolutePosition(testSystem.station, testSystem, 0);
  // Planet + moon + station
  assertCloseTo(pos.x, 150400500, 1);
});

test('getAbsolutePosition changes with time', () => {
  const pos1 = getAbsolutePosition(testSystem.planet, testSystem, 0);
  const pos2 = getAbsolutePosition(testSystem.planet, testSystem, 2190); // Quarter year

  // Should have rotated 90 degrees
  assertCloseTo(pos2.x, 0, 10000);  // Near 0 (within 10000 km)
  assertCloseTo(pos2.y, 150000000, 10000);
});

test('getRelativePosition from planet to moon', () => {
  const rel = getRelativePosition(
    testSystem.moon,
    testSystem.planet,
    testSystem,
    0
  );
  assertCloseTo(rel.x, 400000, 1);
  assertCloseTo(rel.y, 0, 1);
});

// =============================================================================
// TRANSIT / COURSE CALCULATIONS
// =============================================================================

section('Transit and Course Calculations');

test('calculateCourse between two points', () => {
  const from = createPosition(0, 0, 0);
  const to = createPosition(1000000, 0, 0);
  const speedKmH = 35000;

  const course = calculateCourse(from, to, speedKmH);

  assertEqual(course.distanceKm, 1000000);
  assertEqual(course.speedKmH, 35000);
  assertCloseTo(course.durationHours, 1000000 / 35000, 0.01);
});

test('getTimeToDestination calculates correctly', () => {
  const from = createPosition(0, 0, 0);
  const to = createPosition(350000, 0, 0);
  const speedKmH = 35000;

  const hours = getTimeToDestination(from, to, speedKmH);
  assertEqual(hours, 10);
});

test('moveAlongCourse at start returns start position', () => {
  const course = {
    startPosition: createPosition(0, 0, 0),
    endPosition: createPosition(1000, 0, 0),
    distanceKm: 1000,
    speedKmH: 100,
    durationHours: 10
  };

  const pos = moveAlongCourse(course, 0);
  assertEqual(pos.x, 0);
  assertEqual(pos.y, 0);
});

test('moveAlongCourse at end returns end position', () => {
  const course = {
    startPosition: createPosition(0, 0, 0),
    endPosition: createPosition(1000, 0, 0),
    distanceKm: 1000,
    speedKmH: 100,
    durationHours: 10
  };

  const pos = moveAlongCourse(course, 10);
  assertEqual(pos.x, 1000);
  assertEqual(pos.y, 0);
});

test('moveAlongCourse at halfway returns midpoint', () => {
  const course = {
    startPosition: createPosition(0, 0, 0),
    endPosition: createPosition(1000, 1000, 0),
    distanceKm: Math.sqrt(2000000),
    speedKmH: Math.sqrt(2000000) / 10,
    durationHours: 10
  };

  const pos = moveAlongCourse(course, 5);
  assertCloseTo(pos.x, 500, 1);
  assertCloseTo(pos.y, 500, 1);
});

test('moveAlongCourse past end clamps to end', () => {
  const course = {
    startPosition: createPosition(0, 0, 0),
    endPosition: createPosition(1000, 0, 0),
    distanceKm: 1000,
    speedKmH: 100,
    durationHours: 10
  };

  const pos = moveAlongCourse(course, 20);  // Past end
  assertEqual(pos.x, 1000);
});

// =============================================================================
// REFERENCE FRAME TRANSFORMS
// =============================================================================

section('Reference Frame Transforms');

test('systemToLocal converts system coords to planet-local', () => {
  const systemPos = createPosition(150400000, 0, 0);
  const planetPos = createPosition(150000000, 0, 0);

  const local = systemToLocal(systemPos, planetPos);

  assertEqual(local.x, 400000);
  assertEqual(local.y, 0);
});

test('localToSystem converts planet-local to system coords', () => {
  const localPos = createPosition(400000, 0, 0);
  const planetPos = createPosition(150000000, 0, 0);

  const system = localToSystem(localPos, planetPos);

  assertEqual(system.x, 150400000);
  assertEqual(system.y, 0);
});

test('round-trip transform preserves position', () => {
  const original = createPosition(150400000, 50000, 0);
  const planetPos = createPosition(150000000, 0, 0);

  const local = systemToLocal(original, planetPos);
  const backToSystem = localToSystem(local, planetPos);

  assertEqual(backToSystem.x, original.x);
  assertEqual(backToSystem.y, original.y);
});

// =============================================================================
// SHIP POSITION STATE
// =============================================================================

section('Ship Position State');

test('updateOrbitingBody updates ship position with parent', () => {
  const ship = {
    orbitingBodyId: 'planet',
    orbitRadiusKm: 500,
    orbitBearing: 0
  };

  const pos = updateOrbitingBody(ship, testSystem, 0);

  // Ship at 500km from planet, planet at 150M from star
  assertCloseTo(pos.x, 150000500, 1);
  assertCloseTo(pos.y, 0, 1);
});

test('ship position changes when parent moves', () => {
  const ship = {
    orbitingBodyId: 'planet',
    orbitRadiusKm: 500,
    orbitBearing: 0
  };

  const pos1 = updateOrbitingBody(ship, testSystem, 0);
  const pos2 = updateOrbitingBody(ship, testSystem, 2190);  // Quarter year

  // Ship should have moved with planet
  const distance = distanceBetween(pos1, pos2);
  assert(distance > 100000000, 'Ship should have moved > 100M km with planet');
});

// =============================================================================
// REAL GAME SCENARIOS
// =============================================================================

section('Real Game Scenarios (Mora System)');

// Mora system from our data
const moraSystem = {
  dimoph: {
    id: 'dimoph',
    type: 'Star',
    position: createPosition(0, 0, 0)
  },
  mora: {
    id: 'mora',
    type: 'Planet',
    parentId: 'dimoph',
    orbitRadiusKm: auToKm(2.52),  // 2.52 AU
    orbitPeriodHours: 1162 * 24,  // 1162 days
    initialBearing: 344
  },
  moraHighport: {
    id: 'mora-highport',
    type: 'Station',
    parentId: 'mora',
    orbitRadiusKm: 400 + 7784,  // 400km altitude + planet radius
    orbitPeriodHours: 2,
    initialBearing: 0
  },
  exitJumpSpace: {
    id: 'exit-jump-space',
    type: 'JumpPoint',
    parentId: 'mora',
    orbitRadiusKm: 1500000,
    orbitPeriodHours: 0,  // Stationary relative to planet
    initialBearing: 60
  },
  jumpPoint: {
    id: 'jump-point',
    type: 'JumpPoint',
    parentId: 'mora',
    orbitRadiusKm: 1500000,
    orbitPeriodHours: 0,
    initialBearing: 240
  }
};

test('Mora is approximately 2.52 AU from Dimoph', () => {
  const pos = getAbsolutePosition(moraSystem.mora, moraSystem, 0);
  const distanceKm = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
  const distanceAu = kmToAu(distanceKm);

  assertCloseTo(distanceAu, 2.52, 0.1);
});

test('Jump points are 1.5M km from Mora', () => {
  const moraPos = getAbsolutePosition(moraSystem.mora, moraSystem, 0);
  const exitPos = getAbsolutePosition(moraSystem.exitJumpSpace, moraSystem, 0);

  const distance = distanceBetween(moraPos, exitPos);
  assertCloseTo(distance, 1500000, 1000);  // Within 1000 km
});

test('Jump points are on opposite sides of Mora', () => {
  const moraPos = getAbsolutePosition(moraSystem.mora, moraSystem, 0);
  const exitPos = getAbsolutePosition(moraSystem.exitJumpSpace, moraSystem, 0);
  const jumpPos = getAbsolutePosition(moraSystem.jumpPoint, moraSystem, 0);

  // Get relative positions
  const exitRel = systemToLocal(exitPos, moraPos);
  const jumpRel = systemToLocal(jumpPos, moraPos);

  // They should be roughly opposite (dot product negative)
  const dot = exitRel.x * jumpRel.x + exitRel.y * jumpRel.y;
  assert(dot < 0, `Dot product should be negative (opposite sides), got ${dot}`);
});

test('Travel time from highport to jump point is reasonable', () => {
  const highportPos = getAbsolutePosition(moraSystem.moraHighport, moraSystem, 0);
  const jumpPos = getAbsolutePosition(moraSystem.jumpPoint, moraSystem, 0);

  // Scout ship at 2G can do ~70,000 km/h cruise
  const hours = getTimeToDestination(highportPos, jumpPos, 70000);

  // ~1.5M km at 70k km/h = ~21 hours
  assert(hours > 15, `Travel time should be > 15 hours, got ${hours}`);
  assert(hours < 30, `Travel time should be < 30 hours, got ${hours}`);
});

// =============================================================================
// STAR SYSTEM DATA BRIDGE
// =============================================================================

section('Star System Data Bridge');

// Mock star system in the format used by actual game data
const mockStarSystem = {
  celestialObjects: [
    {
      id: '3124-star-dimoph',
      type: 'Star',
      name: 'Dimoph',
      orbitAU: 0
    },
    {
      id: '3124-mainworld',
      type: 'Planet',
      name: 'Mora',
      isMainworld: true,
      orbitAU: 2.52,
      bearing: 344
    }
  ],
  locations: [
    {
      id: 'mora-highport',
      type: 'highport',
      name: 'Mora Highport',
      parentId: '3124-mainworld',
      orbitalAltitudeKm: 400
    },
    {
      id: 'mora-downport',
      type: 'downport',
      name: 'Mora Downport',
      parentId: '3124-mainworld',
      surface: true
    },
    {
      id: 'exit-jump-space',
      type: 'jump-point',
      name: 'Exit Jump Space',
      parentId: '3124-mainworld',
      orbitKm: 1500000,
      bearing: 60
    },
    {
      id: 'jump-point',
      type: 'jump-point',
      name: 'Jump Point',
      parentId: '3124-mainworld',
      orbitKm: 1500000,
      bearing: 240
    }
  ]
};

test('getLocationPosition returns position for highport', () => {
  const pos = getLocationPosition(mockStarSystem, 'mora-highport', 0);
  assert(pos !== null, 'Should return a position');
  assert(pos.x !== 0 || pos.y !== 0, 'Should not be at origin');
});

test('getLocationPosition returns null for unknown location', () => {
  const pos = getLocationPosition(mockStarSystem, 'nonexistent', 0);
  assertEqual(pos, null);
});

test('getLocationPosition handles surface locations', () => {
  const downportPos = getLocationPosition(mockStarSystem, 'mora-downport', 0);
  const mainworldPos = getLocationPosition(mockStarSystem, 'mora-highport', 0);

  // Downport should be very close to mainworld (at planet center)
  // Highport is 400km above, so distance should be ~400km
  assert(downportPos !== null, 'Downport should have position');
});

test('getDistanceBetweenLocations calculates distance', () => {
  const result = getDistanceBetweenLocations(
    mockStarSystem,
    'mora-highport',
    'jump-point',
    0
  );

  assert(result !== null, 'Should return distance');
  assert(result.distanceKm > 1000000, 'Distance should be > 1M km');
  assert(result.distanceKm < 2000000, 'Distance should be < 2M km');
});

test('getDistanceBetweenLocations returns null for unknown locations', () => {
  const result = getDistanceBetweenLocations(
    mockStarSystem,
    'mora-highport',
    'nonexistent',
    0
  );
  assertEqual(result, null);
});

test('Jump points on opposite sides have distance ~3M km', () => {
  const result = getDistanceBetweenLocations(
    mockStarSystem,
    'exit-jump-space',
    'jump-point',
    0
  );

  assert(result !== null, 'Should return distance');
  // 1.5M km on each side = ~3M km apart (opposite bearings 60° and 240°)
  assertCloseTo(result.distanceKm, 3000000, 100000);
});

// =============================================================================
// Summary
// =============================================================================

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('==================================================\n');

if (failed > 0) {
  process.exit(1);
}
