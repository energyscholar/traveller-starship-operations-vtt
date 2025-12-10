/**
 * AR-35: Captain Orders Enhancement - TDD Tests
 * Focus: Acknowledgments + Navigation Quick Orders
 */

const { strict: assert } = require('assert');

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
    const order = createOrder('pilot', 'Set course for Regina');
    assert.ok(order.id, 'Order should have ID');
    assert.ok(order.id.startsWith('ord-'), 'Order ID should have prefix');
  },

  'Order tracks pending acknowledgments': () => {
    const order = createOrder('all', 'Battle Stations');
    assert.deepEqual(order.pendingAcks, ['pilot', 'gunner', 'engineer', 'sensors']);
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
    ['pilot', 'gunner', 'engineer', 'sensors'].forEach(r => acknowledgeOrder(order, r));
    assert.equal(order.pendingAcks.length, 0);
    assert.equal(order.status, 'acknowledged');
  },

  'Unacknowledged order after timeout is flagged': () => {
    const order = createOrder('pilot', 'Emergency stop');
    order.issuedAt = Date.now() - 31000; // 31 seconds ago
    const isStale = isOrderStale(order, 30000);
    assert.ok(isStale, 'Order should be stale after timeout');
  }
};

// === NAVIGATION QUICK ORDERS TESTS ===

const navOrderTests = {
  'Emergency Break order has correct type': () => {
    const order = createNavOrder('emergency_break');
    assert.equal(order.type, 'nav');
    assert.equal(order.navType, 'emergency_break');
    assert.equal(order.targetRole, 'pilot');
  },

  'Pursue order includes target contact': () => {
    const order = createNavOrder('pursue', { contactId: 'contact-1' });
    assert.equal(order.navType, 'pursue');
    assert.equal(order.contactId, 'contact-1');
  },

  'Run Silent order sets ship state flag': () => {
    const order = createNavOrder('run_silent');
    assert.equal(order.navType, 'run_silent');
    assert.ok(order.setsShipState, 'Run Silent should modify ship state');
    assert.equal(order.shipStateKey, 'runSilent');
  },

  'Full Speed order sets max thrust': () => {
    const order = createNavOrder('full_speed');
    assert.equal(order.navType, 'full_speed');
    assert.ok(order.setsShipState);
    assert.equal(order.shipStateKey, 'thrust');
    assert.equal(order.shipStateValue, 'max');
  },

  'Nav orders target pilot role specifically': () => {
    ['emergency_break', 'pursue', 'run_silent', 'full_speed'].forEach(type => {
      const order = createNavOrder(type);
      assert.equal(order.targetRole, 'pilot', `${type} should target pilot`);
    });
  }
};

// === STUB IMPLEMENTATIONS (to be replaced by real code) ===

function createOrder(targetRole, text) {
  const roles = targetRole === 'all'
    ? ['pilot', 'gunner', 'engineer', 'sensors']
    : [targetRole];

  return {
    id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text,
    targetRole,
    pendingAcks: [...roles],
    acknowledgedBy: [],
    issuedAt: Date.now(),
    status: 'pending'
  };
}

function acknowledgeOrder(order, role) {
  const idx = order.pendingAcks.indexOf(role);
  if (idx > -1) {
    order.pendingAcks.splice(idx, 1);
    order.acknowledgedBy.push(role);
    if (order.pendingAcks.length === 0) {
      order.status = 'acknowledged';
    }
  }
}

function isOrderStale(order, timeout) {
  return Date.now() - order.issuedAt > timeout;
}

function createNavOrder(navType, options = {}) {
  const stateOrders = {
    run_silent: { shipStateKey: 'runSilent', shipStateValue: true },
    full_speed: { shipStateKey: 'thrust', shipStateValue: 'max' }
  };

  return {
    id: `nav-${Date.now()}`,
    type: 'nav',
    navType,
    targetRole: 'pilot',
    contactId: options.contactId || null,
    setsShipState: !!stateOrders[navType],
    ...(stateOrders[navType] || {})
  };
}

// === RUN TESTS ===

console.log('=== AR-35 Captain Orders Tests ===\n');

console.log('--- Order Acknowledgment ---');
const ackPassed = runTests(acknowledgmentTests);

console.log('\n--- Navigation Quick Orders ---');
const navPassed = runTests(navOrderTests);

console.log('\n==================================================');
console.log(`Total: ${Object.keys(acknowledgmentTests).length + Object.keys(navOrderTests).length} tests`);
console.log(ackPassed && navPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED');
console.log('==================================================');

process.exit(ackPassed && navPassed ? 0 : 1);
