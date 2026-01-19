/**
 * Captain Orders Module Tests
 * Tests for lib/operations/captain-orders.js
 * AR-35: Captain Orders Enhancement
 */

const {
  STANDARD_ORDERS,
  ALL_CREW_ROLES,
  DEFAULT_STALE_TIMEOUT,
  createOrder,
  acknowledgeOrder,
  isOrderStale,
  createNavOrder
} = require('../../lib/operations/captain-orders');

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

function assertFalse(value, msg = '') {
  if (value) {
    throw new Error(`${msg} Expected falsy, got ${value}`);
  }
}

function assertIncludes(arr, value, msg = '') {
  if (!arr.includes(value)) {
    throw new Error(`${msg} Expected array to include ${value}`);
  }
}

console.log('=== Captain Orders Module Tests ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// createOrder tests
// ─────────────────────────────────────────────────────────────────────────────

test('createOrder generates unique order ID with prefix', () => {
  const order1 = createOrder('pilot', 'Test order 1');
  const order2 = createOrder('pilot', 'Test order 2');
  assertTrue(order1.id.startsWith('order_'), 'ID should have order_ prefix');
  assertTrue(order2.id.startsWith('order_'), 'ID should have order_ prefix');
  assertTrue(order1.id !== order2.id, 'IDs should be unique');
});

test('createOrder sets pending acks for all-crew orders', () => {
  const order = createOrder('all', 'All hands report!');
  assertEqual(order.pendingAcks.length, ALL_CREW_ROLES.length, 'Should have all roles pending');
  ALL_CREW_ROLES.forEach(role => {
    assertIncludes(order.pendingAcks, role, `Should include ${role}`);
  });
});

test('createOrder sets single pending ack for targeted orders', () => {
  const order = createOrder('pilot', 'Pilot only order');
  assertEqual(order.pendingAcks.length, 1, 'Should have one pending ack');
  assertEqual(order.pendingAcks[0], 'pilot', 'Should be pilot');
});

test('createOrder initializes status as pending', () => {
  const order = createOrder('engineer', 'Test order');
  assertEqual(order.status, 'pending', 'Status should be pending');
});

test('createOrder captures timestamp', () => {
  const before = Date.now();
  const order = createOrder('gunner', 'Test order');
  const after = Date.now();
  assertTrue(order.timestamp >= before, 'Timestamp should be >= start');
  assertTrue(order.timestamp <= after, 'Timestamp should be <= end');
});

// ─────────────────────────────────────────────────────────────────────────────
// acknowledgeOrder tests
// ─────────────────────────────────────────────────────────────────────────────

test('acknowledgeOrder removes role from pendingAcks', () => {
  const order = createOrder('all', 'Battle stations!');
  assertEqual(order.pendingAcks.length, 5, 'Should start with 5 pending');
  acknowledgeOrder(order, 'pilot');
  assertEqual(order.pendingAcks.length, 4, 'Should have 4 pending after ack');
  assertFalse(order.pendingAcks.includes('pilot'), 'Pilot should not be pending');
});

test('acknowledgeOrder adds role to acknowledgedBy', () => {
  const order = createOrder('pilot', 'Execute maneuver');
  assertEqual(order.acknowledgedBy.length, 0, 'Should start empty');
  acknowledgeOrder(order, 'pilot');
  assertEqual(order.acknowledgedBy.length, 1, 'Should have 1 ack');
  assertIncludes(order.acknowledgedBy, 'pilot', 'Should include pilot');
});

test('acknowledgeOrder sets status=acknowledged when all ack', () => {
  const order = createOrder('pilot', 'Single target order');
  assertEqual(order.status, 'pending', 'Should start pending');
  acknowledgeOrder(order, 'pilot');
  assertEqual(order.status, 'acknowledged', 'Should be acknowledged');
});

test('acknowledgeOrder handles duplicate acks gracefully', () => {
  const order = createOrder('pilot', 'Test order');
  acknowledgeOrder(order, 'pilot');
  acknowledgeOrder(order, 'pilot'); // Duplicate
  assertEqual(order.acknowledgedBy.length, 1, 'Should still have 1 ack');
  assertEqual(order.status, 'acknowledged', 'Should be acknowledged');
});

// ─────────────────────────────────────────────────────────────────────────────
// isOrderStale tests
// ─────────────────────────────────────────────────────────────────────────────

test('isOrderStale returns false for fresh orders', () => {
  const order = createOrder('pilot', 'Fresh order');
  assertFalse(isOrderStale(order), 'Fresh order should not be stale');
});

test('isOrderStale returns true after timeout', () => {
  const order = createOrder('pilot', 'Old order');
  order.timestamp = Date.now() - 31000; // 31 seconds ago
  assertTrue(isOrderStale(order), 'Old order should be stale');
});

test('isOrderStale respects custom timeout values', () => {
  const order = createOrder('pilot', 'Test order');
  order.timestamp = Date.now() - 5000; // 5 seconds ago
  assertFalse(isOrderStale(order, 10000), 'Should not be stale with 10s timeout');
  assertTrue(isOrderStale(order, 3000), 'Should be stale with 3s timeout');
});

// ─────────────────────────────────────────────────────────────────────────────
// createNavOrder tests
// ─────────────────────────────────────────────────────────────────────────────

test('createNavOrder creates emergency_break order', () => {
  const order = createNavOrder('emergency_break');
  assertEqual(order.targetRole, 'pilot', 'Should target pilot');
  assertEqual(order.priority, 'critical', 'Should be critical priority');
  assertTrue(order.text.includes('Emergency'), 'Text should mention emergency');
  assertEqual(order.shipStateFlag, 'emergencyBrake', 'Should have shipStateFlag');
});

test('createNavOrder creates pursue order with contactId', () => {
  const order = createNavOrder('pursue', { contactId: 'contact_123' });
  assertEqual(order.targetRole, 'pilot', 'Should target pilot');
  assertEqual(order.contactId, 'contact_123', 'Should have contactId');
  assertTrue(order.text.includes('contact_123'), 'Text should include contactId');
});

test('createNavOrder creates run_silent order with shipState flag', () => {
  const order = createNavOrder('run_silent');
  assertEqual(order.targetRole, 'all', 'Should target all');
  assertEqual(order.shipStateFlag, 'runSilent', 'Should have runSilent flag');
  assertTrue(order.text.includes('silent'), 'Text should mention silent');
});

test('createNavOrder creates full_speed order with thrust=max', () => {
  const order = createNavOrder('full_speed');
  assertEqual(order.targetRole, 'pilot', 'Should target pilot');
  assertEqual(order.thrust, 'max', 'Should have thrust=max');
  assertEqual(order.shipStateFlag, 'fullSpeed', 'Should have fullSpeed flag');
});

// ─────────────────────────────────────────────────────────────────────────────
// Order Templates tests
// ─────────────────────────────────────────────────────────────────────────────

test('STANDARD_ORDERS provides expected templates', () => {
  assertTrue(STANDARD_ORDERS.BATTLE_STATIONS, 'Should have BATTLE_STATIONS');
  assertTrue(STANDARD_ORDERS.STAND_DOWN, 'Should have STAND_DOWN');
  assertTrue(STANDARD_ORDERS.HOLD_FIRE, 'Should have HOLD_FIRE');
  assertTrue(STANDARD_ORDERS.WEAPONS_FREE, 'Should have WEAPONS_FREE');
});

test('battle stations order has correct structure', () => {
  const bs = STANDARD_ORDERS.BATTLE_STATIONS;
  assertEqual(bs.id, 'battle_stations', 'Should have correct id');
  assertEqual(bs.targetRole, 'all', 'Should target all');
  assertEqual(bs.requiresAck, true, 'Should require ack');
  assertEqual(bs.priority, 'high', 'Should be high priority');
});

test('DEFAULT_STALE_TIMEOUT is 30 seconds', () => {
  assertEqual(DEFAULT_STALE_TIMEOUT, 30000, 'Should be 30000ms');
});

test('ALL_CREW_ROLES includes expected roles', () => {
  assertIncludes(ALL_CREW_ROLES, 'pilot', 'Should include pilot');
  assertIncludes(ALL_CREW_ROLES, 'engineer', 'Should include engineer');
  assertIncludes(ALL_CREW_ROLES, 'gunner', 'Should include gunner');
  assertIncludes(ALL_CREW_ROLES, 'sensors', 'Should include sensors');
  assertIncludes(ALL_CREW_ROLES, 'medic', 'Should include medic');
});

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);
console.log(`PASSED: ${passed}/${passed + failed}`);

if (failed > 0) process.exit(1);
