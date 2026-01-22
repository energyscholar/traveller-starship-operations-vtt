/**
 * Auth Service
 *
 * Main authentication operations: register, login, logout.
 * Coordinates token-service and lockout-service.
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { getBcryptConfig, isAuthEnabled, isAuthRequired } = require('../config/auth-config');
const { db } = require('../operations/database');
const tokenService = require('./token-service');
const lockoutService = require('./lockout-service');

/**
 * Generate a user ID
 * @returns {string} UUID v4
 */
function generateUserId() {
  return crypto.randomUUID();
}

/**
 * Register a new user
 * @param {string} username - Unique username
 * @param {string} password - Plain text password
 * @param {Object} options - Optional: email, role
 * @returns {Object} { success, user?, error? }
 */
async function register(username, password, options = {}) {
  if (!isAuthEnabled()) {
    return { success: false, error: 'Authentication is disabled' };
  }

  // Validate input
  if (!username || username.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters' };
  }
  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  // Check for existing user
  const existing = db.prepare(`
    SELECT id FROM auth_users WHERE username = ?
  `).get(username.toLowerCase());

  if (existing) {
    return { success: false, error: 'Username already exists' };
  }

  // Hash password
  const config = getBcryptConfig();
  const passwordHash = await bcrypt.hash(password, config.saltRounds);

  // Create user
  const userId = generateUserId();
  const role = options.role || 'player';
  const email = options.email || null;

  try {
    db.prepare(`
      INSERT INTO auth_users (id, username, password_hash, email, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, username.toLowerCase(), passwordHash, email, role);

    const user = {
      id: userId,
      username: username.toLowerCase(),
      email,
      role
    };

    return { success: true, user };
  } catch (err) {
    console.error('Registration failed:', err.message);
    return { success: false, error: 'Registration failed' };
  }
}

/**
 * Login a user
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @param {string} ipAddress - Client IP for lockout tracking
 * @returns {Object} { success, token?, expiresAt?, user?, error? }
 */
async function login(username, password, ipAddress = 'unknown') {
  if (!isAuthEnabled()) {
    return { success: false, error: 'Authentication is disabled' };
  }

  const identifier = username.toLowerCase();

  // Check lockout
  const lockout = lockoutService.isLockedOut(identifier);
  if (lockout.locked) {
    return {
      success: false,
      error: `Account locked. Try again in ${lockout.remainingMinutes} minutes`
    };
  }

  // Find user
  const user = db.prepare(`
    SELECT id, username, password_hash, email, role
    FROM auth_users WHERE username = ?
  `).get(identifier);

  if (!user) {
    lockoutService.recordAttempt(identifier, ipAddress, false);
    return { success: false, error: 'Invalid username or password' };
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    lockoutService.recordAttempt(identifier, ipAddress, false);
    return { success: false, error: 'Invalid username or password' };
  }

  // Record successful login
  lockoutService.recordAttempt(identifier, ipAddress, true);

  // Create token
  const tokenResult = tokenService.createToken({
    id: user.id,
    username: user.username,
    role: user.role
  });

  if (!tokenResult) {
    return { success: false, error: 'Failed to create session' };
  }

  return {
    success: true,
    token: tokenResult.token,
    expiresAt: tokenResult.expiresAt,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  };
}

/**
 * Logout a user (revoke token)
 * @param {string} token - JWT token to revoke
 * @returns {Object} { success }
 */
function logout(token) {
  const revoked = tokenService.revokeToken(token);
  return { success: revoked };
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Object|null} User object or null
 */
function getUserById(userId) {
  try {
    const user = db.prepare(`
      SELECT id, username, email, role, created_at
      FROM auth_users WHERE id = ?
    `).get(userId);
    return user || null;
  } catch (err) {
    return null;
  }
}

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {Object|null} User object or null
 */
function getUserByUsername(username) {
  try {
    const user = db.prepare(`
      SELECT id, username, email, role, created_at
      FROM auth_users WHERE username = ?
    `).get(username.toLowerCase());
    return user || null;
  } catch (err) {
    return null;
  }
}

/**
 * Update user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password for verification
 * @param {string} newPassword - New password
 * @returns {Object} { success, error? }
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = db.prepare(`
    SELECT password_hash FROM auth_users WHERE id = ?
  `).get(userId);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Verify current password
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return { success: false, error: 'Current password is incorrect' };
  }

  // Validate new password
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters' };
  }

  // Hash and update
  const config = getBcryptConfig();
  const passwordHash = await bcrypt.hash(newPassword, config.saltRounds);

  try {
    db.prepare(`
      UPDATE auth_users SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(passwordHash, userId);

    // Revoke all existing sessions (force re-login)
    tokenService.revokeAllUserTokens(userId);

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to update password' };
  }
}

/**
 * Delete a user account
 * @param {string} userId - User ID
 * @returns {Object} { success, error? }
 */
function deleteUser(userId) {
  try {
    // Sessions cascade delete via foreign key
    const result = db.prepare(`
      DELETE FROM auth_users WHERE id = ?
    `).run(userId);

    if (result.changes === 0) {
      return { success: false, error: 'User not found' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to delete user' };
  }
}

/**
 * Verify a token and return user info
 * @param {string} token - JWT token
 * @returns {Object|null} User info or null if invalid
 */
function verifyAndGetUser(token) {
  const decoded = tokenService.verifyToken(token);
  if (!decoded) {
    return null;
  }

  return getUserById(decoded.sub);
}

module.exports = {
  register,
  login,
  logout,
  getUserById,
  getUserByUsername,
  changePassword,
  deleteUser,
  verifyAndGetUser
};
