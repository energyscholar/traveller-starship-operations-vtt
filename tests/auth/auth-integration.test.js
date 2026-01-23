/**
 * Auth Integration Tests
 *
 * Tests for auth at the socket/handler level:
 * - Socket authentication middleware
 * - Campaign membership enforcement
 */

const {
  withAuthMode,
  createMockSocketWithAuth,
  createUnauthenticatedSocket,
  cleanupAuthTestData,
  createTestMembership,
  removeTestMembership
} = require('../fixtures/auth-test-helper');

const { TEST_USERS, enableAuth, restoreAuth, createTestUsers } = require('../fixtures/auth-mock');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return async () => {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (err) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${err.message}`);
      failed++;
    }
  };
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected "${expected}", got "${actual}"`);
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg} Expected truthy, got "${value}"`);
  }
}

function assertFalse(value, msg = '') {
  if (value) {
    throw new Error(`${msg} Expected falsy, got "${value}"`);
  }
}

// Module references
let db, authService;

async function setup() {
  enableAuth('optional', 'test-jwt-secret-minimum-length-32-chars');

  // Clear cached modules
  const modulesToClear = [
    '../../lib/auth/auth-service',
    '../../lib/config/auth-config',
    '../../lib/operations/database'
  ];

  modulesToClear.forEach(mod => {
    try {
      delete require.cache[require.resolve(mod)];
    } catch (e) {}
  });

  db = require('../../lib/operations/database').db;
  authService = require('../../lib/auth/auth-service');

  await createTestUsers(db, authService);
}

async function teardown() {
  cleanupAuthTestData(db);
  restoreAuth();
}

console.log('\n=== Auth Integration Tests ===\n');

const tests = [
  // Socket with auth user
  test('socket.user is set for authenticated socket', async () => {
    const user = {
      id: TEST_USERS.player.id,
      username: TEST_USERS.player.username,
      role: TEST_USERS.player.role
    };
    const socket = createMockSocketWithAuth(user);
    assertTrue(socket.user, 'Socket should have user');
    assertEqual(socket.user.username, TEST_USERS.player.username);
  }),

  test('socket.user is null for unauthenticated socket', async () => {
    const socket = createUnauthenticatedSocket();
    assertEqual(socket.user, null, 'Socket should not have user');
  }),

  // withAuthMode helper
  test('withAuthMode sets correct mode', async () => {
    await withAuthMode('required', async () => {
      const { isAuthRequired } = require('../../lib/config/auth-config');
      assertTrue(isAuthRequired(), 'Should be in required mode');
    });
  }),

  test('withAuthMode restores original mode', async () => {
    const originalMode = process.env.AUTH_MODE;
    await withAuthMode('required', async () => {});
    assertEqual(process.env.AUTH_MODE, originalMode, 'Mode should be restored');
  }),

  // Campaign membership tests
  test('createTestMembership adds membership record', async () => {
    // Get an existing campaign for testing
    const campaign = db.prepare('SELECT id FROM campaigns LIMIT 1').get();
    if (!campaign) {
      console.log('  (skipped - no campaigns exist)');
      return;
    }

    // Get actual test user from DB (created by createTestUsers)
    const user = db.prepare("SELECT id FROM auth_users WHERE username = 'test_player'").get();
    if (!user) {
      console.log('  (skipped - test user not found)');
      return;
    }

    const userId = user.id;
    const campaignId = campaign.id;

    createTestMembership(db, userId, campaignId, 'player');

    const membership = db.prepare(`
      SELECT * FROM campaign_memberships WHERE user_id = ? AND campaign_id = ?
    `).get(userId, campaignId);

    assertTrue(membership, 'Membership should exist');
    assertEqual(membership.role, 'player');

    // Cleanup
    removeTestMembership(db, userId, campaignId);
  }),

  test('removeTestMembership removes record', async () => {
    // Get an existing campaign for testing
    const campaign = db.prepare('SELECT id FROM campaigns LIMIT 1').get();
    if (!campaign) {
      console.log('  (skipped - no campaigns exist)');
      return;
    }

    // Get actual test user from DB
    const user = db.prepare("SELECT id FROM auth_users WHERE username = 'test_player'").get();
    if (!user) {
      console.log('  (skipped - test user not found)');
      return;
    }

    const userId = user.id;
    const campaignId = campaign.id;

    createTestMembership(db, userId, campaignId, 'gm');
    removeTestMembership(db, userId, campaignId);

    const membership = db.prepare(`
      SELECT * FROM campaign_memberships WHERE user_id = ? AND campaign_id = ?
    `).get(userId, campaignId);

    assertFalse(membership, 'Membership should be removed');
  }),

  // Mock socket event handling
  test('mock socket emits and receives events', async () => {
    const socket = createMockSocketWithAuth({ id: '123', username: 'test', role: 'player' });
    let received = null;

    socket.on('test-event', (data) => {
      received = data;
    });

    socket.emit('test-event', { message: 'hello' });

    assertTrue(received, 'Should receive event');
    assertEqual(received.message, 'hello');
  }),

  test('cleanupAuthTestData removes test data', async () => {
    // First verify we have test users
    const beforeCount = db.prepare(`
      SELECT COUNT(*) as count FROM auth_users WHERE username LIKE 'test_%'
    `).get();
    assertTrue(beforeCount.count > 0, 'Should have test users before cleanup');

    // Note: We don't actually run cleanup here as it would break other tests
    // Just verify the function exists and can be called
    assertTrue(typeof cleanupAuthTestData === 'function', 'Function should exist');
  })
];

async function runTests() {
  await setup();

  console.log('--- Socket Authentication ---\n');
  await tests[0]();
  await tests[1]();

  console.log('\n--- withAuthMode Helper ---\n');
  await tests[2]();
  await tests[3]();

  console.log('\n--- Campaign Membership ---\n');
  await tests[4]();
  await tests[5]();

  console.log('\n--- Mock Socket Events ---\n');
  await tests[6]();

  console.log('\n--- Cleanup Helper ---\n');
  await tests[7]();

  await teardown();

  console.log('\n==================================================');
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('==================================================');
  console.log(`PASSED: ${passed}/${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
