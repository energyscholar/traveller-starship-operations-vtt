/**
 * AR-194: Failure Reasons Registry Tests (TDD)
 */

const failureReasons = require('../lib/operations/failure-reasons');

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

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected truthy, got ${value}`);
  }
}

function assertNotNull(value, msg = '') {
  if (value === null || value === undefined) {
    throw new Error(`${msg} Expected non-null, got ${value}`);
  }
}

// ==================== Tests ====================

console.log('\n=== Failure Reasons Tests ===\n');

console.log('--- Registry Structure ---\n');

test('FAILURE_REASONS has all core systems', () => {
  const { FAILURE_REASONS } = failureReasons;
  assertTrue(FAILURE_REASONS.mDrive, 'mDrive failures exist');
  assertTrue(FAILURE_REASONS.jDrive, 'jDrive failures exist');
  assertTrue(FAILURE_REASONS.powerPlant, 'powerPlant failures exist');
  assertTrue(FAILURE_REASONS.sensors, 'sensors failures exist');
  assertTrue(FAILURE_REASONS.lifeSupport, 'lifeSupport failures exist');
  assertTrue(FAILURE_REASONS.computer, 'computer failures exist');
});

test('Each system has at least one failure reason', () => {
  const { FAILURE_REASONS } = failureReasons;
  for (const system of Object.keys(FAILURE_REASONS)) {
    assertTrue(FAILURE_REASONS[system].length > 0, `${system} has failures`);
  }
});

test('Failure reasons have required fields', () => {
  const { FAILURE_REASONS } = failureReasons;
  const reason = FAILURE_REASONS.mDrive[0];

  assertTrue(reason.id, 'has id');
  assertTrue(reason.name, 'has name');
  assertTrue(reason.description, 'has description');
  assertTrue(reason.severity, 'has severity');
  assertTrue(reason.effect, 'has effect');
  assertTrue(reason.repairDM !== undefined, 'has repairDM');
  assertTrue(reason.repairTime, 'has repairTime');
  assertTrue(reason.flavorText, 'has flavorText');
});

console.log('\n--- Random Failure ---\n');

test('getRandomFailure returns valid failure for known system', () => {
  const failure = failureReasons.getRandomFailure('mDrive');

  assertNotNull(failure, 'returns a failure');
  assertTrue(failure.id.startsWith('mdrive-'), 'has mDrive prefix');
  assertTrue(failure.name, 'has name');
});

test('getRandomFailure returns null for unknown system', () => {
  const failure = failureReasons.getRandomFailure('unknownSystem');

  assertEqual(failure, null, 'returns null for unknown system');
});

console.log('\n--- Failure by ID ---\n');

test('getFailureById returns correct failure', () => {
  const failure = failureReasons.getFailureById('mdrive-001');

  assertNotNull(failure, 'returns a failure');
  assertEqual(failure.id, 'mdrive-001');
  assertEqual(failure.system, 'mDrive', 'includes system name');
});

test('getFailureById returns null for unknown ID', () => {
  const failure = failureReasons.getFailureById('unknown-999');

  assertEqual(failure, null, 'returns null for unknown ID');
});

console.log('\n--- Failures for System ---\n');

test('getFailuresForSystem returns array for valid system', () => {
  const failures = failureReasons.getFailuresForSystem('sensors');

  assertTrue(Array.isArray(failures), 'returns array');
  assertTrue(failures.length > 0, 'has failures');
});

test('getFailuresForSystem returns empty array for invalid system', () => {
  const failures = failureReasons.getFailuresForSystem('invalid');

  assertTrue(Array.isArray(failures), 'returns array');
  assertEqual(failures.length, 0, 'empty for invalid');
});

console.log('\n--- Dice Notation ---\n');

test('rollDiceNotation handles 1d6', () => {
  const result = failureReasons.rollDiceNotation('1d6');

  assertTrue(result >= 1 && result <= 6, `1d6 in range: ${result}`);
});

test('rollDiceNotation handles 2d6', () => {
  const result = failureReasons.rollDiceNotation('2d6');

  assertTrue(result >= 2 && result <= 12, `2d6 in range: ${result}`);
});

test('rollDiceNotation handles 1d3', () => {
  const result = failureReasons.rollDiceNotation('1d3');

  assertTrue(result >= 1 && result <= 3, `1d3 in range: ${result}`);
});

console.log('\n--- Break System Integration ---\n');

test('Failure reasons exist for ship systems that can break', () => {
  // Systems from SHIP_SYSTEMS that should have failure reasons
  const breakableSystems = ['mDrive', 'jDrive', 'powerPlant', 'sensors', 'computer'];

  for (const system of breakableSystems) {
    const failures = failureReasons.getFailuresForSystem(system);
    assertTrue(failures.length > 0, `${system} has failure reasons`);
  }
});

test('Failure reasons map to severity levels', () => {
  const { FAILURE_REASONS } = failureReasons;
  const validSeverities = ['minor', 'major', 'critical'];

  for (const system of Object.keys(FAILURE_REASONS)) {
    for (const failure of FAILURE_REASONS[system]) {
      assertTrue(
        validSeverities.includes(failure.severity),
        `${failure.id} has valid severity: ${failure.severity}`
      );
    }
  }
});

test('Severity maps to numeric value for damage', () => {
  // minor=1, major=2, critical=3
  const severityMap = { minor: 1, major: 2, critical: 3 };
  const failure = failureReasons.getFailureById('mdrive-002'); // major

  assertEqual(severityMap[failure.severity], 2, 'major maps to 2');
});

test('severityToNumber converts correctly', () => {
  assertEqual(failureReasons.severityToNumber('minor'), 1);
  assertEqual(failureReasons.severityToNumber('major'), 2);
  assertEqual(failureReasons.severityToNumber('critical'), 3);
  assertEqual(failureReasons.severityToNumber('unknown'), 1, 'defaults to 1');
});

// ==================== Summary ====================

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('==================================================');

if (failed > 0) {
  process.exit(1);
}
