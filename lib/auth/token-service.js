/**
 * Token Service
 *
 * JWT token creation and verification for authentication.
 * Tokens are stored in httpOnly cookies for security.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getJwtSecret, getJwtConfig, isAuthEnabled } = require('../config/auth-config');
const { db } = require('../operations/database');

/**
 * Generate a token ID for session tracking
 * @returns {string} Random token ID
 */
function generateTokenId() {
  return crypto.randomUUID();
}

/**
 * Hash a token for storage (don't store raw tokens)
 * @param {string} token - JWT token
 * @returns {string} SHA-256 hash of token
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a JWT token for a user
 * @param {Object} user - User object with id, username, role
 * @returns {Object} { token, expiresAt } or null if auth disabled
 */
function createToken(user) {
  if (!isAuthEnabled()) {
    return null;
  }

  const secret = getJwtSecret();
  if (!secret) {
    return null;
  }

  const config = getJwtConfig();
  const tokenId = generateTokenId();

  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role || 'player',
    jti: tokenId
  };

  const token = jwt.sign(payload, secret, {
    expiresIn: config.expiresIn,
    issuer: config.issuer,
    audience: config.audience
  });

  // Calculate expiry time
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000).toISOString();

  // Store session in database
  const tokenHash = hashToken(token);
  try {
    db.prepare(`
      INSERT INTO auth_sessions (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(tokenId, user.id, tokenHash, expiresAt);
  } catch (err) {
    console.error('Failed to store session:', err.message);
    return null;
  }

  return { token, expiresAt };
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  if (!isAuthEnabled()) {
    return null;
  }

  const secret = getJwtSecret();
  if (!secret) {
    return null;
  }

  const config = getJwtConfig();

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: config.issuer,
      audience: config.audience
    });

    // Verify session exists in database
    const tokenHash = hashToken(token);
    const session = db.prepare(`
      SELECT * FROM auth_sessions
      WHERE token_hash = ? AND expires_at > datetime('now')
    `).get(tokenHash);

    if (!session) {
      return null;
    }

    // Update last_used_at
    db.prepare(`
      UPDATE auth_sessions SET last_used_at = datetime('now')
      WHERE token_hash = ?
    `).run(tokenHash);

    return decoded;
  } catch (err) {
    // Token invalid or expired
    return null;
  }
}

/**
 * Revoke a token (logout)
 * @param {string} token - JWT token to revoke
 * @returns {boolean} Whether revocation succeeded
 */
function revokeToken(token) {
  if (!token) {
    return false;
  }

  try {
    const tokenHash = hashToken(token);
    const result = db.prepare(`
      DELETE FROM auth_sessions WHERE token_hash = ?
    `).run(tokenHash);
    return result.changes > 0;
  } catch (err) {
    console.error('Failed to revoke token:', err.message);
    return false;
  }
}

/**
 * Revoke all tokens for a user
 * @param {string} userId - User ID
 * @returns {number} Number of sessions revoked
 */
function revokeAllUserTokens(userId) {
  try {
    const result = db.prepare(`
      DELETE FROM auth_sessions WHERE user_id = ?
    `).run(userId);
    return result.changes;
  } catch (err) {
    console.error('Failed to revoke user tokens:', err.message);
    return 0;
  }
}

/**
 * Clean up expired sessions
 * @returns {number} Number of sessions cleaned
 */
function cleanupExpiredSessions() {
  try {
    const result = db.prepare(`
      DELETE FROM auth_sessions WHERE expires_at < datetime('now')
    `).run();
    return result.changes;
  } catch (err) {
    console.error('Failed to cleanup sessions:', err.message);
    return 0;
  }
}

/**
 * Get active session count for a user
 * @param {string} userId - User ID
 * @returns {number} Number of active sessions
 */
function getActiveSessionCount(userId) {
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM auth_sessions
      WHERE user_id = ? AND expires_at > datetime('now')
    `).get(userId);
    return result?.count || 0;
  } catch (err) {
    return 0;
  }
}

module.exports = {
  createToken,
  verifyToken,
  revokeToken,
  revokeAllUserTokens,
  cleanupExpiredSessions,
  getActiveSessionCount,
  hashToken
};
