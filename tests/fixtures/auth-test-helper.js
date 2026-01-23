/**
 * Auth Test Helper
 *
 * Higher-level test utilities for auth testing:
 * - withAuthMode: Run test with specific AUTH_MODE
 * - createMockSocketWithAuth: Socket with user attached
 * - cleanupAuthTestData: Remove all test auth data
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

// Store original env for restoration
let originalEnv = {};

/**
 * Run a test function with a specific AUTH_MODE
 * Automatically restores previous mode after test
 * @param {string} mode - 'disabled', 'optional', or 'required'
 * @param {Function} fn - Async test function to run
 * @param {string} secret - JWT secret (default: test secret)
 */
async function withAuthMode(mode, fn, secret = 'test-jwt-secret-minimum-length-32-chars') {
  // Save original
  originalEnv = {
    AUTH_MODE: process.env.AUTH_MODE,
    JWT_SECRET: process.env.JWT_SECRET
  };

  // Set new mode
  process.env.AUTH_MODE = mode;
  if (mode !== 'disabled') {
    process.env.JWT_SECRET = secret;
  } else {
    delete process.env.JWT_SECRET;
  }

  // Clear auth-config cache to pick up new env
  try {
    delete require.cache[require.resolve('../../lib/config/auth-config')];
  } catch (e) {
    // Module not cached
  }

  try {
    await fn();
  } finally {
    // Restore original
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

    // Clear cache again to pick up restored env
    try {
      delete require.cache[require.resolve('../../lib/config/auth-config')];
    } catch (e) {
      // Module not cached
    }
  }
}

/**
 * Create a mock socket with user already attached
 * Simulates authenticated socket after middleware
 * @param {Object} user - User object with id, username, role
 * @returns {Object} Mock socket with EventEmitter capabilities
 */
function createMockSocketWithAuth(user) {
  const emitter = new EventEmitter();

  const socket = {
    id: crypto.randomUUID(),
    handshake: {
      headers: {},
      query: {},
      address: '127.0.0.1'
    },
    user: user || null,
    authToken: null,

    // EventEmitter methods
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    once: emitter.once.bind(emitter),
    emit: emitter.emit.bind(emitter),
    removeListener: emitter.removeListener.bind(emitter),
    removeAllListeners: emitter.removeAllListeners.bind(emitter),

    // Socket.io methods
    join: () => {},
    leave: () => {},
    to: () => ({ emit: () => {} }),
    disconnect: () => {}
  };

  return socket;
}

/**
 * Create a mock socket without auth (for testing rejection)
 * @returns {Object} Mock socket without user
 */
function createUnauthenticatedSocket() {
  return createMockSocketWithAuth(null);
}

/**
 * Clean up all test auth data from database
 * Removes users, sessions, and login attempts
 * @param {Object} db - Database instance with prepare method
 */
function cleanupAuthTestData(db) {
  const testUsernames = [
    'test_admin',
    'test_gm',
    'test_player',
    'locked_user',
    'integration_test_user'
  ];

  try {
    // Clean users
    const userPlaceholders = testUsernames.map(() => '?').join(',');
    db.prepare(`DELETE FROM auth_users WHERE username IN (${userPlaceholders})`).run(...testUsernames);

    // Clean sessions (by user_id join or just clear old sessions)
    db.prepare(`DELETE FROM auth_sessions WHERE expires_at < datetime('now', '-1 day')`).run();

    // Clean login attempts
    db.prepare(`DELETE FROM auth_login_attempts WHERE identifier IN (${userPlaceholders})`).run(...testUsernames);

    // Clean OAuth links for test users
    db.prepare(`DELETE FROM auth_oauth_links WHERE user_id NOT IN (SELECT id FROM auth_users)`).run();
  } catch (err) {
    // Tables may not exist in all test environments
    console.debug('[auth-test-helper] Cleanup partial:', err.message);
  }
}

/**
 * Create test campaign membership
 * @param {Object} db - Database instance
 * @param {string} userId - User ID
 * @param {string} campaignId - Campaign ID
 * @param {string} role - Membership role (gm, player)
 */
function createTestMembership(db, userId, campaignId, role = 'player') {
  try {
    db.prepare(`
      INSERT OR REPLACE INTO campaign_memberships (user_id, campaign_id, role, joined_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(userId, campaignId, role);
  } catch (err) {
    // Table may not exist
    console.debug('[auth-test-helper] Membership create failed:', err.message);
  }
}

/**
 * Remove test campaign membership
 * @param {Object} db - Database instance
 * @param {string} userId - User ID
 * @param {string} campaignId - Campaign ID
 */
function removeTestMembership(db, userId, campaignId) {
  try {
    db.prepare(`DELETE FROM campaign_memberships WHERE user_id = ? AND campaign_id = ?`).run(userId, campaignId);
  } catch (err) {
    // Ignore
  }
}

module.exports = {
  withAuthMode,
  createMockSocketWithAuth,
  createUnauthenticatedSocket,
  cleanupAuthTestData,
  createTestMembership,
  removeTestMembership
};
