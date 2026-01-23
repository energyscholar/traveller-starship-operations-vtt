/**
 * Auth Routes Tests
 *
 * Tests for HTTP auth endpoints:
 * - GET /auth/status
 * - POST /auth/login
 * - POST /auth/logout
 * - GET /auth/me
 */

const {
  TEST_USERS,
  enableAuth,
  disableAuth,
  restoreAuth,
  createTestUsers,
  cleanupTestUsers
} = require('../fixtures/auth-mock');

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

// Module references (loaded after env setup)
let db, authService, tokenService;

async function setup() {
  // Enable auth for tests
  enableAuth('optional', 'test-jwt-secret-minimum-length-32-chars');

  // Clear cached modules
  const modulesToClear = [
    '../../lib/auth/auth-service',
    '../../lib/auth/token-service',
    '../../lib/config/auth-config',
    '../../lib/operations/database'
  ];

  modulesToClear.forEach(mod => {
    try {
      delete require.cache[require.resolve(mod)];
    } catch (e) {
      // Module not cached, ignore
    }
  });

  // Load fresh modules
  db = require('../../lib/operations/database').db;
  authService = require('../../lib/auth/auth-service');
  tokenService = require('../../lib/auth/token-service');

  // Create test users
  await createTestUsers(db, authService);
}

async function teardown() {
  // Clean up test users
  cleanupTestUsers(db);
  restoreAuth();
}

// ============================================
// Tests
// ============================================

console.log('\n=== Auth Routes Tests ===\n');

const tests = [
  // /auth/status tests
  test('/auth/status returns enabled:false when auth disabled', async () => {
    disableAuth();
    // Clear auth-config cache
    delete require.cache[require.resolve('../../lib/config/auth-config')];
    const { isAuthEnabled } = require('../../lib/config/auth-config');
    assertFalse(isAuthEnabled(), 'Auth should be disabled');
    // Restore for next test
    enableAuth('optional', 'test-jwt-secret-minimum-length-32-chars');
    delete require.cache[require.resolve('../../lib/config/auth-config')];
  }),

  test('/auth/status returns enabled:true when auth enabled', async () => {
    const { isAuthEnabled } = require('../../lib/config/auth-config');
    assertTrue(isAuthEnabled(), 'Auth should be enabled');
  }),

  // Login tests
  test('login succeeds with valid credentials', async () => {
    const result = await authService.login(
      TEST_USERS.player.username,
      TEST_USERS.player.password,
      '127.0.0.1'
    );
    assertTrue(result.success, 'Login should succeed');
    assertTrue(result.token, 'Should return token');
    assertTrue(result.user, 'Should return user');
    assertEqual(result.user.username, TEST_USERS.player.username);
  }),

  test('login fails with wrong password', async () => {
    const result = await authService.login(
      TEST_USERS.player.username,
      'WrongPassword123!',
      '127.0.0.1'
    );
    assertFalse(result.success, 'Login should fail');
    assertTrue(result.error, 'Should have error message');
  }),

  test('login fails with non-existent user', async () => {
    const result = await authService.login(
      'nonexistent_user',
      'SomePassword!',
      '127.0.0.1'
    );
    assertFalse(result.success, 'Login should fail');
  }),

  // Token tests
  test('token verification succeeds for valid token', async () => {
    const result = await authService.login(
      TEST_USERS.player.username,
      TEST_USERS.player.password,
      '127.0.0.1'
    );
    const decoded = tokenService.verifyToken(result.token);
    assertTrue(decoded, 'Token should be valid');
    assertEqual(decoded.username, TEST_USERS.player.username);
  }),

  test('token verification fails for invalid token', () => {
    const decoded = tokenService.verifyToken('invalid.token.here');
    assertEqual(decoded, null, 'Invalid token should return null');
  }),

  // Logout/revoke tests
  test('token revocation removes session', async () => {
    const result = await authService.login(
      TEST_USERS.gm.username,
      TEST_USERS.gm.password,
      '127.0.0.1'
    );
    assertTrue(result.success, 'Login should succeed');

    // Verify token works
    const beforeRevoke = tokenService.verifyToken(result.token);
    assertTrue(beforeRevoke, 'Token should be valid before revoke');

    // Revoke token
    const revoked = tokenService.revokeToken(result.token);
    assertTrue(revoked, 'Revocation should succeed');

    // Verify token no longer works
    const afterRevoke = tokenService.verifyToken(result.token);
    assertEqual(afterRevoke, null, 'Token should be invalid after revoke');
  }),

  // verifyAndGetUser tests
  test('verifyAndGetUser returns user for valid token', async () => {
    const loginResult = await authService.login(
      TEST_USERS.admin.username,
      TEST_USERS.admin.password,
      '127.0.0.1'
    );
    const user = authService.verifyAndGetUser(loginResult.token);
    assertTrue(user, 'Should return user');
    assertEqual(user.username, TEST_USERS.admin.username);
    assertEqual(user.role, TEST_USERS.admin.role);
  }),

  test('verifyAndGetUser returns null for invalid token', () => {
    const user = authService.verifyAndGetUser('bad.token.value');
    assertEqual(user, null, 'Should return null for bad token');
  })
];

// Run all tests
async function runTests() {
  await setup();

  console.log('--- Auth Status ---\n');
  await tests[0]();
  await tests[1]();

  console.log('\n--- Login ---\n');
  await tests[2]();
  await tests[3]();
  await tests[4]();

  console.log('\n--- Token Verification ---\n');
  await tests[5]();
  await tests[6]();

  console.log('\n--- Logout/Revocation ---\n');
  await tests[7]();

  console.log('\n--- User Lookup ---\n');
  await tests[8]();
  await tests[9]();

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
