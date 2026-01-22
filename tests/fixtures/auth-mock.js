/**
 * Auth Test Fixtures
 *
 * Mock utilities for testing with authentication enabled/disabled.
 * Provides test users, tokens, and environment helpers.
 */

const crypto = require('crypto');

// Test user fixtures
const TEST_USERS = {
  admin: {
    id: '00000000-0000-4000-8000-000000000100',
    username: 'test_admin',
    password: 'TestAdmin123!',
    email: 'admin@test.local',
    role: 'admin'
  },
  gm: {
    id: '00000000-0000-4000-8000-000000000101',
    username: 'test_gm',
    password: 'TestGM1234!',
    email: 'gm@test.local',
    role: 'gm'
  },
  player: {
    id: '00000000-0000-4000-8000-000000000102',
    username: 'test_player',
    password: 'TestPlayer!',
    email: 'player@test.local',
    role: 'player'
  },
  lockedOut: {
    id: '00000000-0000-4000-8000-000000000103',
    username: 'locked_user',
    password: 'LockedUser!',
    email: 'locked@test.local',
    role: 'player'
  }
};

// Store original env values for restoration
let originalEnv = {};

/**
 * Enable auth for tests
 * @param {string} mode - 'optional' or 'required'
 * @param {string} secret - JWT secret (defaults to test secret)
 */
function enableAuth(mode = 'optional', secret = 'test-jwt-secret-for-testing-only') {
  originalEnv = {
    AUTH_MODE: process.env.AUTH_MODE,
    JWT_SECRET: process.env.JWT_SECRET
  };
  process.env.AUTH_MODE = mode;
  process.env.JWT_SECRET = secret;
}

/**
 * Disable auth for tests
 */
function disableAuth() {
  originalEnv = {
    AUTH_MODE: process.env.AUTH_MODE,
    JWT_SECRET: process.env.JWT_SECRET
  };
  process.env.AUTH_MODE = 'disabled';
  delete process.env.JWT_SECRET;
}

/**
 * Restore original auth environment
 */
function restoreAuth() {
  if (originalEnv.AUTH_MODE !== undefined) {
    process.env.AUTH_MODE = originalEnv.AUTH_MODE;
  } else {
    delete process.env.AUTH_MODE;
  }
  if (originalEnv.JWT_SECRET !== undefined) {
    process.env.JWT_SECRET = originalEnv.JWT_SECRET;
  } else {
    delete process.env.JWT_SECRET;
  }
  originalEnv = {};
}

/**
 * Create test users in database
 * @param {Object} dbObj - Database object with prepare method
 * @param {Object} authService - Auth service module
 * @returns {Object} Created users with tokens
 */
async function createTestUsers(dbObj, authService) {
  const users = {};

  for (const [key, userData] of Object.entries(TEST_USERS)) {
    // Clean up any existing test user
    try {
      dbObj.prepare('DELETE FROM auth_users WHERE username = ?').run(userData.username);
    } catch {
      // Ignore if table doesn't exist yet
    }

    // Register user
    const result = await authService.register(
      userData.username,
      userData.password,
      { email: userData.email, role: userData.role }
    );

    if (result.success) {
      users[key] = {
        ...userData,
        id: result.user.id
      };
    }
  }

  return users;
}

/**
 * Clean up test users from database
 * @param {Object} dbObj - Database object with prepare method
 */
function cleanupTestUsers(dbObj) {
  for (const userData of Object.values(TEST_USERS)) {
    try {
      dbObj.prepare('DELETE FROM auth_users WHERE username = ?').run(userData.username);
      dbObj.prepare('DELETE FROM auth_login_attempts WHERE identifier = ?').run(userData.username);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Create a mock socket with auth cookie
 * @param {string} token - JWT token
 * @returns {Object} Mock socket object
 */
function createMockSocket(token = null) {
  const socket = {
    id: crypto.randomUUID(),
    handshake: {
      headers: {},
      query: {}
    },
    user: null,
    authToken: null
  };

  if (token) {
    socket.handshake.headers.cookie = `auth_token=${token}`;
  }

  return socket;
}

/**
 * Create a mock socket with Authorization header
 * @param {string} token - JWT token
 * @returns {Object} Mock socket object
 */
function createMockSocketWithHeader(token) {
  const socket = createMockSocket();
  socket.handshake.headers.authorization = `Bearer ${token}`;
  return socket;
}

/**
 * Create a mock socket with query token
 * @param {string} token - JWT token
 * @returns {Object} Mock socket object
 */
function createMockSocketWithQuery(token) {
  const socket = createMockSocket();
  socket.handshake.query.token = token;
  return socket;
}

/**
 * Simulate multiple failed login attempts to trigger lockout
 * @param {Object} lockoutService - Lockout service module
 * @param {string} identifier - Username or IP
 * @param {number} count - Number of failures to record
 */
function simulateFailedLogins(lockoutService, identifier, count = 5) {
  for (let i = 0; i < count; i++) {
    lockoutService.recordAttempt(identifier, '127.0.0.1', false);
  }
}

/**
 * Assert helper for test frameworks
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message if false
 */
function assertTrue(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Assert equality helper
 * @param {*} actual - Actual value
 * @param {*} expected - Expected value
 * @param {string} message - Error message if not equal
 */
function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}`);
  }
}

/**
 * Assert not null helper
 * @param {*} value - Value to check
 * @param {string} message - Error message if null
 */
function assertNotNull(value, message = 'Value should not be null') {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * Assert null helper
 * @param {*} value - Value to check
 * @param {string} message - Error message if not null
 */
function assertNull(value, message = 'Value should be null') {
  if (value !== null && value !== undefined) {
    throw new Error(message);
  }
}

module.exports = {
  TEST_USERS,
  enableAuth,
  disableAuth,
  restoreAuth,
  createTestUsers,
  cleanupTestUsers,
  createMockSocket,
  createMockSocketWithHeader,
  createMockSocketWithQuery,
  simulateFailedLogins,
  assertTrue,
  assertEqual,
  assertNotNull,
  assertNull
};
