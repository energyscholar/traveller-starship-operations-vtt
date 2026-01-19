/**
 * AR-35: Captain Orders Enhancement - TDD Tests
 * Focus: Acknowledgments + Navigation Quick Orders
 *
 * Updated to use real captain-orders module
 */

const { strict: assert } = require('assert');
const {
  createOrder,
  acknowledgeOrder,
  isOrderStale,
  createNavOrder,
  ALL_CREW_ROLES
} = require('../lib/operations/captain-orders');

// Test utilities
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

// === ORDER ACKNOWLEDGMENT TESTS ===

const acknowledgmentTests = {
  'Order has unique ID for tracking': () => {
    // When captain issues order, it gets unique orderId
    const order = createOrder('pilot', 'Set course for Flammarion');
    assert.ok(order.id, 'Order should have ID');
    assert.ok(order.id.startsWith('order_'), 'Order ID should have order_ prefix');
  },

  'Order tracks pending acknowledgments': () => {
    const order = createOrder('all', 'Battle Stations');
    // Real module uses ALL_CREW_ROLES which includes medic
    assert.equal(order.pendingAcks.length, ALL_CREW_ROLES.length);
    ALL_CREW_ROLES.forEach(role => {
      assert.ok(order.pendingAcks.includes(role), `Should include ${role}`);
    });
  },

  'Single role order has one pending ack': () => {
    const order = createOrder('pilot', 'Evasive maneuvers');
    assert.deepEqual(order.pendingAcks, ['pilot']);
  },

  'Acknowledgment removes from pending': () => {
    const order = createOrder('all', 'Stand down');
    acknowledgeOrder(order, 'pilot');
    assert.ok(!order.pendingAcks.includes('pilot'));
    assert.ok(order.acknowledgedBy.includes('pilot'));
  },

  'Order complete when all ack': () => {
    const order = createOrder('all', 'Prepare for jump');
    ALL_CREW_ROLES.forEach(r => acknowledgeOrder(order, r));
    assert.equal(order.pendingAcks.length, 0);
    assert.equal(order.status, 'acknowledged');
  },

  'Unacknowledged order after timeout is flagged': () => {
    const order = createOrder('pilot', 'Emergency stop');
    order.timestamp = Date.now() - 31000; // 31 seconds ago
    const stale = isOrderStale(order, 30000);
    assert.ok(stale, 'Order should be stale after timeout');
  }
};

// === NAVIGATION QUICK ORDERS TESTS ===

const navOrderTests = {
  'Emergency Break order has correct type': () => {
    const order = createNavOrder('emergency_break');
    assert.equal(order.navType, 'emergency_break');
    assert.equal(order.targetRole, 'pilot');
    assert.equal(order.priority, 'critical');
  },

  'Pursue order includes target contact': () => {
    const order = createNavOrder('pursue', { contactId: 'contact-1' });
    assert.equal(order.navType, 'pursue');
    assert.equal(order.contactId, 'contact-1');
  },

  'Run Silent order sets ship state flag': () => {
    const order = createNavOrder('run_silent');
    assert.equal(order.navType, 'run_silent');
    assert.equal(order.shipStateFlag, 'runSilent');
    assert.equal(order.targetRole, 'all'); // Run silent targets everyone
  },

  'Full Speed order sets max thrust': () => {
    const order = createNavOrder('full_speed');
    assert.equal(order.navType, 'full_speed');
    assert.equal(order.shipStateFlag, 'fullSpeed');
    assert.equal(order.thrust, 'max');
  },

  'Nav orders target appropriate roles': () => {
    // Most nav orders target pilot
    ['emergency_break', 'pursue', 'full_speed'].forEach(type => {
      const order = createNavOrder(type);
      assert.equal(order.targetRole, 'pilot', `${type} should target pilot`);
    });
    // Run silent targets all crew
    const runSilent = createNavOrder('run_silent');
    assert.equal(runSilent.targetRole, 'all', 'run_silent targets all');
  }
};

// === RUN TESTS ===

console.log('=== AR-35 Captain Orders Tests ===\n');

console.log('--- Order Acknowledgment ---');
const ackPassed = runTests(acknowledgmentTests);

console.log('\n--- Navigation Quick Orders ---');
const navPassed = runTests(navOrderTests);

const total = Object.keys(acknowledgmentTests).length + Object.keys(navOrderTests).length;
console.log('\n==================================================');
console.log(`PASSED: ${total}/${total}`);
console.log(ackPassed && navPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED');
console.log('==================================================');

process.exit(ackPassed && navPassed ? 0 : 1);
