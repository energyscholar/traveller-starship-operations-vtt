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

/**
 * Find existing OAuth link or create new user from OAuth profile
 * @param {Object} oauthProfile - Profile from OAuth provider
 * @param {string} oauthProfile.provider - Provider name (e.g., 'google')
 * @param {string} oauthProfile.providerUserId - User ID from provider
 * @param {string} oauthProfile.email - User email
 * @param {string} oauthProfile.displayName - Display name
 * @param {string} oauthProfile.avatarUrl - Avatar URL
 * @param {Object} tokens - OAuth tokens
 * @param {string} tokens.accessToken - Access token
 * @param {string} tokens.refreshToken - Refresh token (optional)
 * @param {number} tokens.expiresIn - Token expiry in seconds
 * @returns {Object} { success, user?, token?, error? }
 */
async function findOrCreateUserFromOAuth(oauthProfile, tokens = {}) {
  if (!isAuthEnabled()) {
    return { success: false, error: 'Authentication is disabled' };
  }

  const { provider, providerUserId, email, displayName, avatarUrl } = oauthProfile;

  if (!provider || !providerUserId) {
    return { success: false, error: 'Invalid OAuth profile' };
  }

  try {
    // Check if OAuth link already exists
    const existingLink = db.prepare(`
      SELECT user_id FROM oauth_providers
      WHERE provider = ? AND provider_user_id = ?
    `).get(provider, providerUserId);

    let userId;

    if (existingLink) {
      // Existing user - update OAuth tokens
      userId = existingLink.user_id;
      updateOAuthTokens(provider, providerUserId, tokens);
    } else {
      // New user - check if email matches existing account
      let existingUser = null;
      if (email) {
        existingUser = db.prepare(`
          SELECT id FROM auth_users WHERE email = ?
        `).get(email);
      }

      if (existingUser) {
        // Link OAuth to existing account
        userId = existingUser.id;
      } else {
        // Create new user
        userId = generateUserId();
        const username = generateUniqueUsername(displayName || email || provider);

        db.prepare(`
          INSERT INTO auth_users (id, username, password_hash, email, role)
          VALUES (?, ?, ?, ?, 'player')
        `).run(userId, username, 'oauth-only', email);
      }

      // Create OAuth link
      const linkId = crypto.randomUUID();
      const expiresAt = tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        : null;

      db.prepare(`
        INSERT INTO oauth_providers (
          id, user_id, provider, provider_user_id, email, display_name, avatar_url,
          access_token, refresh_token, token_expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        linkId, userId, provider, providerUserId, email, displayName, avatarUrl,
        tokens.accessToken, tokens.refreshToken, expiresAt
      );
    }

    // Get the user
    const user = getUserById(userId);
    if (!user) {
      return { success: false, error: 'Failed to retrieve user' };
    }

    // Create session token
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
      user,
      token: tokenResult.token,
      expiresAt: tokenResult.expiresAt
    };
  } catch (err) {
    console.error('OAuth user creation failed:', err.message);
    return { success: false, error: 'OAuth authentication failed' };
  }
}

/**
 * Update OAuth tokens for existing link
 * @param {string} provider - Provider name
 * @param {string} providerUserId - Provider user ID
 * @param {Object} tokens - New tokens
 */
function updateOAuthTokens(provider, providerUserId, tokens) {
  if (!tokens.accessToken) return;

  const expiresAt = tokens.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
    : null;

  db.prepare(`
    UPDATE oauth_providers
    SET access_token = ?, refresh_token = COALESCE(?, refresh_token),
        token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE provider = ? AND provider_user_id = ?
  `).run(tokens.accessToken, tokens.refreshToken, expiresAt, provider, providerUserId);
}

/**
 * Generate a unique username from display name or email
 * @param {string} base - Base string to generate from
 * @returns {string} Unique username
 */
function generateUniqueUsername(base) {
  // Clean the base string
  let username = base
    .toLowerCase()
    .replace(/@.*$/, '') // Remove email domain
    .replace(/[^a-z0-9]/g, '') // Remove special chars
    .slice(0, 20); // Limit length

  if (!username || username.length < 3) {
    username = 'user';
  }

  // Check if unique
  const existing = db.prepare(`
    SELECT id FROM auth_users WHERE username = ?
  `).get(username);

  if (!existing) {
    return username;
  }

  // Add random suffix
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${username}_${suffix}`;
}

/**
 * Get OAuth providers linked to a user
 * @param {string} userId - User ID
 * @returns {Array} List of linked providers
 */
function getLinkedProviders(userId) {
  try {
    return db.prepare(`
      SELECT provider, provider_user_id, email, display_name, avatar_url, created_at
      FROM oauth_providers WHERE user_id = ?
    `).all(userId);
  } catch (err) {
    return [];
  }
}

/**
 * Unlink an OAuth provider from user
 * @param {string} userId - User ID
 * @param {string} provider - Provider to unlink
 * @returns {boolean} Whether unlink succeeded
 */
function unlinkOAuthProvider(userId, provider) {
  try {
    const result = db.prepare(`
      DELETE FROM oauth_providers WHERE user_id = ? AND provider = ?
    `).run(userId, provider);
    return result.changes > 0;
  } catch (err) {
    return false;
  }
}

module.exports = {
  register,
  login,
  logout,
  getUserById,
  getUserByUsername,
  changePassword,
  deleteUser,
  verifyAndGetUser,
  findOrCreateUserFromOAuth,
  getLinkedProviders,
  unlinkOAuthProvider
};
