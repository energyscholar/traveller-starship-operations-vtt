/**
 * AR-36: Sensors Role Enhancement - TDD Tests
 * Focus: ECM/ECCM using Mongoose Traveller 2e rules
 *
 * Mongoose 2e ECM Rules Summary:
 * - ECM gives DM-2 to enemy sensors
 * - ECCM counters ECM, removing penalty
 * - Military sensors have +2 DM
 * - Civilian sensors have +0 DM
 * - Range affects sensor checks (close +2, distant -2)
 */

const { strict: assert } = require('assert');

function runTests(tests) {
  let passed = 0, failed = 0;
  for (const [name, fn] of Object.entries(tests)) {
    try {
      fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (e) {
      console.log(`✗ ${name}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\n${passed}/${passed + failed} tests passed`);
  return failed === 0;
}

// === ECM/ECCM TESTS ===

const ecmTests = {
  'ECM active gives -2 DM to enemy sensors': () => {
    const ship = createShip({ ecmActive: true });
    const enemy = createShip({ sensorGrade: 'civilian' });
    const dm = calculateSensorDM(enemy, ship);
    assert.equal(dm, -2, 'ECM should give -2 DM');
  },

  'ECCM counters ECM, removes penalty': () => {
    const ship = createShip({ ecmActive: true });
    const enemy = createShip({ sensorGrade: 'civilian', eccmActive: true });
    const dm = calculateSensorDM(enemy, ship);
    assert.equal(dm, 0, 'ECCM should counter ECM');
  },

  'Military sensors give +2 DM base': () => {
    const ship = createShip({});
    const scanner = createShip({ sensorGrade: 'military' });
    const dm = calculateSensorDM(scanner, ship);
    assert.equal(dm, 2, 'Military sensors should give +2');
  },

  'Civilian sensors give +0 DM base': () => {
    const ship = createShip({});
    const scanner = createShip({ sensorGrade: 'civilian' });
    const dm = calculateSensorDM(scanner, ship);
    assert.equal(dm, 0, 'Civilian sensors should give +0');
  },

  'ECM + Military sensors = net 0 DM': () => {
    const target = createShip({ ecmActive: true });
    const scanner = createShip({ sensorGrade: 'military' });
    const dm = calculateSensorDM(scanner, target);
    assert.equal(dm, 0, 'Military +2, ECM -2 = 0');
  },

  'ECCM without enemy ECM has no effect': () => {
    const target = createShip({ ecmActive: false });
    const scanner = createShip({ sensorGrade: 'civilian', eccmActive: true });
    const dm = calculateSensorDM(scanner, target);
    assert.equal(dm, 0, 'ECCM alone should not affect DM');
  }
};

// === RANGE MODIFIER TESTS ===

const rangeTests = {
  'Close range gives +2 DM': () => {
    const dm = getRangeDM('close');
    assert.equal(dm, 2);
  },

  'Short range gives +1 DM': () => {
    const dm = getRangeDM('short');
    assert.equal(dm, 1);
  },

  'Medium range gives +0 DM': () => {
    const dm = getRangeDM('medium');
    assert.equal(dm, 0);
  },

  'Long range gives -1 DM': () => {
    const dm = getRangeDM('long');
    assert.equal(dm, -1);
  },

  'Very Long range gives -2 DM': () => {
    const dm = getRangeDM('veryLong');
    assert.equal(dm, -2);
  },

  'Distant range gives -4 DM': () => {
    const dm = getRangeDM('distant');
    assert.equal(dm, -4);
  }
};

// === SENSOR LOCK TESTS ===

const lockTests = {
  'Sensor lock persists until broken': () => {
    const lock = createSensorLock('contact-1', 'ship-1');
    assert.ok(lock.active);
    assert.equal(lock.targetId, 'contact-1');
    assert.equal(lock.lockingShipId, 'ship-1');
  },

  'Lock broken by target ECM activation': () => {
    const lock = createSensorLock('contact-1', 'ship-1');
    const target = createShip({ id: 'contact-1', ecmActive: false });

    // Target activates ECM
    target.ecmActive = true;
    const stillLocked = checkLockValid(lock, target);
    assert.ok(!stillLocked, 'Lock should break when target activates ECM');
  },

  'Lock provides +2 DM to attacks': () => {
    const lock = createSensorLock('contact-1', 'ship-1');
    const attackDM = getLockAttackBonus(lock);
    assert.equal(attackDM, 2, 'Lock should give +2 attack DM');
  },

  'Lock requires sensor operator action to maintain': () => {
    const lock = createSensorLock('contact-1', 'ship-1');
    lock.lastMaintained = Date.now() - 61000; // 61 seconds ago
    const valid = isLockMaintained(lock, 60000);
    assert.ok(!valid, 'Lock should expire without maintenance');
  }
};

// === STUB IMPLEMENTATIONS ===

function createShip(options) {
  return {
    id: options.id || `ship-${Math.random().toString(36).substr(2, 6)}`,
    sensorGrade: options.sensorGrade || 'civilian',
    ecmActive: options.ecmActive || false,
    eccmActive: options.eccmActive || false
  };
}

function calculateSensorDM(scanner, target) {
  let dm = 0;

  // Sensor grade bonus
  if (scanner.sensorGrade === 'military') dm += 2;

  // ECM penalty
  if (target.ecmActive) dm -= 2;

  // ECCM counter
  if (target.ecmActive && scanner.eccmActive) dm += 2;

  return dm;
}

function getRangeDM(range) {
  const rangeDMs = {
    close: 2,
    short: 1,
    medium: 0,
    long: -1,
    veryLong: -2,
    distant: -4
  };
  return rangeDMs[range] || 0;
}

function createSensorLock(targetId, lockingShipId) {
  return {
    targetId,
    lockingShipId,
    active: true,
    lockedAt: Date.now(),
    lastMaintained: Date.now()
  };
}

function checkLockValid(lock, target) {
  // Lock breaks if target activates ECM after lock was established
  if (target.ecmActive) return false;
  return lock.active;
}

function getLockAttackBonus(lock) {
  return lock.active ? 2 : 0;
}

function isLockMaintained(lock, timeout) {
  return Date.now() - lock.lastMaintained <= timeout;
}

// === RUN TESTS ===

console.log('=== AR-36 Sensor ECM Tests (Mongoose 2e) ===\n');

console.log('--- ECM/ECCM Modifiers ---');
const ecmPassed = runTests(ecmTests);

console.log('\n--- Range Modifiers ---');
const rangePassed = runTests(rangeTests);

console.log('\n--- Sensor Lock ---');
const lockPassed = runTests(lockTests);

console.log('\n==================================================');
const total = Object.keys(ecmTests).length + Object.keys(rangeTests).length + Object.keys(lockTests).length;
console.log(`Total: ${total} tests`);
console.log(ecmPassed && rangePassed && lockPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED');
console.log('==================================================');

process.exit(ecmPassed && rangePassed && lockPassed ? 0 : 1);
