/**
 * Auth Negative Tests
 *
 * Tests for authentication failure scenarios:
 * - Invalid credentials
 * - Expired tokens
 * - Locked accounts
 * - Missing/malformed tokens
 * - Insufficient permissions
 */

const {
  TEST_USERS,
  enableAuth,
  disableAuth,
  restoreAuth,
  cleanupTestUsers,
  createMockSocket,
  simulateFailedLogins,
  assertTrue,
  assertEqual,
  assertNotNull,
  assertNull
} = require('../fixtures/auth-mock');

// Load modules after environment setup
let db, authService, tokenService, lockoutService, socketAuth;

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

async function setup() {
  // Enable auth for tests FIRST
  enableAuth('optional', 'test-jwt-secret-minimum-length-32-chars');

  // Clear ALL potentially cached auth-related modules
  // This must be done in dependency order (leaf modules first)
  const modulesToClear = [
    '../../lib/auth/middleware/socket-auth',
    '../../lib/auth/auth-service',
    '../../lib/auth/token-service',
    '../../lib/auth/lockout-service',
    '../../lib/auth/index',
    '../../lib/config/auth-config'
  ];

  for (const mod of modulesToClear) {
    try {
      delete require.cache[require.resolve(mod)];
    } catch (e) {
      // Module might not be in cache yet
    }
  }

  // Load modules fresh (they will now see the updated env vars)
  const database = require('../../lib/operations/database');
  db = database.db;

  // Reload auth-config first to ensure env vars are picked up
  const authConfig = require('../../lib/config/auth-config');
  if (!authConfig.isAuthEnabled()) {
    console.warn('Warning: Auth not enabled after setup, check environment');
  }

  authService = require('../../lib/auth/auth-service');
  tokenService = require('../../lib/auth/token-service');
  lockoutService = require('../../lib/auth/lockout-service');
  socketAuth = require('../../lib/auth/middleware/socket-auth');

  // Clean up any previous test data
  cleanupTestUsers(db);

  // Also clean up any stale lockout records from previous runs
  try {
    db.prepare('DELETE FROM auth_login_attempts WHERE identifier LIKE ?').run('%_test_%');
    db.prepare('DELETE FROM auth_login_attempts WHERE identifier LIKE ?').run('nonexistent_user_%');
  } catch (e) {
    // Ignore cleanup errors
  }
}

async function teardown() {
  cleanupTestUsers(db);
  restoreAuth();
}

// Test definitions
const tests = [
  // Registration negative tests
  test('Register fails with short username', async () => {
    const result = await authService.register('ab', 'ValidPassword123!');
    assertTrue(!result.success, 'Should fail');
    assertTrue(result.error.includes('3 characters'), 'Should mention minimum length');
  }),

  test('Register fails with short password', async () => {
    const result = await authService.register('validuser', 'short');
    assertTrue(!result.success, 'Should fail');
    assertTrue(result.error.includes('8 characters'), 'Should mention minimum length');
  }),

  test('Register fails with duplicate username', async () => {
    const username = 'duplicate_test_user';
    // First registration should succeed
    const first = await authService.register(username, 'ValidPassword123!');
    assertTrue(first.success, 'First registration should succeed');

    // Second registration should fail
    const second = await authService.register(username, 'DifferentPass123!');
    assertTrue(!second.success, 'Duplicate should fail');
    assertTrue(second.error.includes('exists'), 'Should mention exists');

    // Cleanup
    db.prepare('DELETE FROM auth_users WHERE username = ?').run(username);
  }),

  // Login negative tests
  test('Login fails with wrong password', async () => {
    // Use unique username to avoid conflicts
    const username = 'wrong_pass_test_' + Date.now();

    // Clean up any existing user first
    try {
      db.prepare('DELETE FROM auth_users WHERE username = ?').run(username);
      db.prepare('DELETE FROM auth_login_attempts WHERE identifier = ?').run(username);
    } catch (e) {
      // Ignore errors
    }

    const regResult = await authService.register(username, 'CorrectPass123!');
    assertTrue(regResult.success, 'Registration should succeed: ' + (regResult.error || 'no error'));

    const result = await authService.login(username, 'WrongPassword!');
    assertTrue(!result.success, 'Should fail with wrong password');
    assertTrue(
      result.error.includes('Invalid') || result.error.includes('disabled'),
      'Should indicate invalid or disabled: ' + result.error
    );

    // Cleanup
    try {
      db.prepare('DELETE FROM auth_users WHERE username = ?').run(username);
      db.prepare('DELETE FROM auth_login_attempts WHERE identifier = ?').run(username);
    } catch (e) {
      // Ignore cleanup errors
    }
  }),

  test('Login fails with nonexistent user', async () => {
    // Use unique identifier to avoid lockout interference
    const uniqueUser = 'nonexistent_' + Date.now();
    const result = await authService.login(uniqueUser, 'AnyPassword!');
    assertTrue(!result.success, 'Should fail');
    assertTrue(
      result.error.includes('Invalid') || result.error.includes('disabled'),
      'Should indicate invalid or disabled: ' + result.error
    );
    // Clean up lockout record
    try {
      db.prepare('DELETE FROM auth_login_attempts WHERE identifier = ?').run(uniqueUser);
    } catch (e) {
      // Ignore
    }
  }),

  test('Login fails when locked out', async () => {
    const username = 'lockout_test_user';
    await authService.register(username, 'ValidPassword123!');

    // Clear any previous attempts first
    lockoutService.clearLockout(username);

    // Simulate multiple failed attempts (more than max of 5)
    for (let i = 0; i < 6; i++) {
      lockoutService.recordAttempt(username, '127.0.0.1', false);
    }

    // Even with correct password, should be locked
    const result = await authService.login(username, 'ValidPassword123!');
    assertTrue(!result.success, 'Should be locked');
    assertTrue(result.error.includes('locked'), 'Should mention locked');

    // Cleanup
    lockoutService.clearLockout(username);
    db.prepare('DELETE FROM auth_users WHERE username = ?').run(username);
  }),

  // Token negative tests
  test('Verify fails with invalid token', () => {
    const result = tokenService.verifyToken('invalid.token.here');
    assertNull(result, 'Should return null for invalid token');
  }),

  test('Verify fails with tampered token', async () => {
    const username = 'tamper_test_user';
    await authService.register(username, 'ValidPassword123!');
    const loginResult = await authService.login(username, 'ValidPassword123!');
    assertTrue(loginResult.success, 'Login should succeed');

    // Tamper with the token
    const tamperedToken = loginResult.token.slice(0, -5) + 'XXXXX';
    const result = tokenService.verifyToken(tamperedToken);
    assertNull(result, 'Should reject tampered token');

    // Cleanup
    db.prepare('DELETE FROM auth_users WHERE username = ?').run(username);
  }),

  test('Verify fails after logout', async () => {
    const username = 'logout_test_user';
    await authService.register(username, 'ValidPassword123!');
    const loginResult = await authService.login(username, 'ValidPassword123!');
    assertTrue(loginResult.success, 'Login should succeed');

    // Verify token works
    const beforeLogout = tokenService.verifyToken(loginResult.token);
    assertNotNull(beforeLogout, 'Token should be valid before logout');

    // Logout
    authService.logout(loginResult.token);

    // Token should now be invalid
    const afterLogout = tokenService.verifyToken(loginResult.token);
    assertNull(afterLogout, 'Token should be invalid after logout');

    // Cleanup
    db.prepare('DELETE FROM auth_users WHERE username = ?').run(username);
  }),

  // Socket middleware negative tests
  test('Socket middleware rejects in required mode without token', async () => {
    // Switch to required mode
    process.env.AUTH_MODE = 'required';

    // Clear cache to reload config
    delete require.cache[require.resolve('../../lib/config/auth-config')];
    delete require.cache[require.resolve('../../lib/auth/middleware/socket-auth')];
    const socketAuthRequired = require('../../lib/auth/middleware/socket-auth');

    const socket = createMockSocket();
    let error = null;

    await new Promise((resolve) => {
      socketAuthRequired.socketAuthMiddleware(socket, (err) => {
        error = err;
        resolve();
      });
    });

    assertTrue(error !== null, 'Should have error');
    assertTrue(error.message.includes('required'), 'Should mention required');

    // Restore optional mode
    process.env.AUTH_MODE = 'optional';
    delete require.cache[require.resolve('../../lib/config/auth-config')];
    delete require.cache[require.resolve('../../lib/auth/middleware/socket-auth')];
  }),

  test('Socket middleware allows anonymous in optional mode', async () => {
    const socket = createMockSocket();
    let error = null;

    await new Promise((resolve) => {
      socketAuth.socketAuthMiddleware(socket, (err) => {
        error = err;
        resolve();
      });
    });

    assertNull(error, 'Should not have error');
    assertNull(socket.user, 'Should have null user for anonymous');
  }),

  test('Socket middleware rejects invalid token in required mode', async () => {
    process.env.AUTH_MODE = 'required';
    delete require.cache[require.resolve('../../lib/config/auth-config')];
    delete require.cache[require.resolve('../../lib/auth/middleware/socket-auth')];
    const socketAuthRequired = require('../../lib/auth/middleware/socket-auth');

    const socket = createMockSocket('invalid.token.here');
    let error = null;

    await new Promise((resolve) => {
      socketAuthRequired.socketAuthMiddleware(socket, (err) => {
        error = err;
        resolve();
      });
    });

    assertTrue(error !== null, 'Should have error');
    assertTrue(error.message.includes('Invalid') || error.message.includes('expired'), 'Should mention invalid');

    // Restore
    process.env.AUTH_MODE = 'optional';
    delete require.cache[require.resolve('../../lib/config/auth-config')];
    delete require.cache[require.resolve('../../lib/auth/middleware/socket-auth')];
  }),

  // Password change negative tests
  test('Change password fails with wrong current password', async () => {
    const username = 'change_pass_user';
    const registerResult = await authService.register(username, 'OldPassword123!');
    assertTrue(registerResult.success, 'Registration should succeed');

    const result = await authService.changePassword(
      registerResult.user.id,
      'WrongOldPassword!',
      'NewPassword123!'
    );
    assertTrue(!result.success, 'Should fail');
    assertTrue(result.error.includes('incorrect'), 'Should mention incorrect');

    // Cleanup
    db.prepare('DELETE FROM auth_users WHERE username = ?').run(username);
  }),

  test('Change password fails with weak new password', async () => {
    const username = 'weak_pass_user';
    const registerResult = await authService.register(username, 'ValidPassword123!');
    assertTrue(registerResult.success, 'Registration should succeed');

    const result = await authService.changePassword(
      registerResult.user.id,
      'ValidPassword123!',
      'weak'
    );
    assertTrue(!result.success, 'Should fail');
    assertTrue(result.error.includes('8 characters'), 'Should mention length');

    // Cleanup
    db.prepare('DELETE FROM auth_users WHERE username = ?').run(username);
  }),

  // Lockout service tests
  test('Lockout status reflects failed attempts', () => {
    const identifier = 'lockout_status_test';

    // Clear any previous attempts from this identifier
    lockoutService.clearLockout(identifier);

    // Initially should not be locked
    let status = lockoutService.getLockoutStatus(identifier);
    assertTrue(!status.locked, 'Should not be locked initially');
    assertEqual(status.attemptsRemaining, 5, 'Should have 5 attempts');

    // Add some failures
    simulateFailedLogins(lockoutService, identifier, 3);

    status = lockoutService.getLockoutStatus(identifier);
    assertTrue(!status.locked, 'Should not be locked after 3 attempts');
    assertEqual(status.attemptsRemaining, 2, 'Should have 2 attempts remaining');

    // Add more to trigger lockout
    simulateFailedLogins(lockoutService, identifier, 2);

    status = lockoutService.getLockoutStatus(identifier);
    assertTrue(status.locked, 'Should be locked after 5 attempts');
    assertTrue(status.remainingMinutes > 0, 'Should have lockout time remaining');

    // Cleanup
    lockoutService.clearLockout(identifier);
  }),

  // Role-based tests
  test('requireRole middleware rejects unauthenticated', async () => {
    const roleMiddleware = socketAuth.requireRole('admin');
    const socket = createMockSocket();
    socket.user = null;

    let error = null;
    await new Promise((resolve) => {
      roleMiddleware(socket, (err) => {
        error = err;
        resolve();
      });
    });

    assertTrue(error !== null, 'Should have error');
    assertTrue(error.message.includes('Authentication'), 'Should mention auth');
  }),

  test('requireRole middleware rejects wrong role', async () => {
    const roleMiddleware = socketAuth.requireRole('admin');
    const socket = createMockSocket();
    socket.user = { id: '123', username: 'test', role: 'player' };

    let error = null;
    await new Promise((resolve) => {
      roleMiddleware(socket, (err) => {
        error = err;
        resolve();
      });
    });

    assertTrue(error !== null, 'Should have error');
    assertTrue(error.message.includes('permissions'), 'Should mention permissions');
  }),

  test('requireRole middleware allows correct role', async () => {
    const roleMiddleware = socketAuth.requireRole('admin', 'gm');
    const socket = createMockSocket();
    socket.user = { id: '123', username: 'test', role: 'gm' };

    let error = null;
    await new Promise((resolve) => {
      roleMiddleware(socket, (err) => {
        error = err;
        resolve();
      });
    });

    assertNull(error, 'Should not have error for valid role');
  })
];

// Run all tests
async function run() {
  console.log('=== Auth Negative Tests ===\n');

  await setup();

  for (const testFn of tests) {
    await testFn();
  }

  await teardown();

  console.log(`\n=== Results: ${passed}/${passed + failed} passed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
