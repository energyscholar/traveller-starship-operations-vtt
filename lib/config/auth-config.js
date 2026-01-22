/**
 * Auth Configuration
 *
 * AUTH_MODE controls authentication behavior:
 * - 'disabled': No auth (development, testing)
 * - 'optional': Auth available but not required (soft rollout)
 * - 'required': All socket connections must authenticate (production)
 *
 * In production, JWT_SECRET must be set or the server will exit.
 */

const AUTH_MODE = Object.freeze({
  DISABLED: 'disabled',
  OPTIONAL: 'optional',
  REQUIRED: 'required'
});

/**
 * Get the current auth mode from environment
 * @returns {string} One of AUTH_MODE values
 */
function getAuthMode() {
  const mode = process.env.AUTH_MODE?.toLowerCase() || AUTH_MODE.DISABLED;

  // Validate the mode
  if (!Object.values(AUTH_MODE).includes(mode)) {
    console.warn(`Invalid AUTH_MODE "${mode}", defaulting to disabled`);
    return AUTH_MODE.DISABLED;
  }

  return mode;
}

/**
 * Get the JWT secret, with fail-fast for production
 * @returns {string|null} The JWT secret or null if disabled
 * @throws {Error} In required mode without JWT_SECRET
 */
function getJwtSecret() {
  const mode = getAuthMode();

  if (mode === AUTH_MODE.DISABLED) {
    return null;
  }

  const secret = process.env.JWT_SECRET;

  if (mode === AUTH_MODE.REQUIRED && !secret) {
    console.error('FATAL: JWT_SECRET must be set when AUTH_MODE=required');
    process.exit(1);
  }

  if (!secret && mode === AUTH_MODE.OPTIONAL) {
    console.warn('AUTH_MODE=optional but JWT_SECRET not set, auth will fail');
  }

  return secret || null;
}

/**
 * Check if auth is enabled (optional or required)
 * @returns {boolean}
 */
function isAuthEnabled() {
  return getAuthMode() !== AUTH_MODE.DISABLED;
}

/**
 * Check if auth is required
 * @returns {boolean}
 */
function isAuthRequired() {
  return getAuthMode() === AUTH_MODE.REQUIRED;
}

/**
 * Get JWT configuration
 * @returns {Object} JWT config with expiresIn
 */
function getJwtConfig() {
  return {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'traveller-ops-vtt',
    audience: 'traveller-ops-client'
  };
}

/**
 * Get cookie configuration for JWT storage
 * @returns {Object} Cookie options
 */
function getCookieConfig() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/'
  };
}

/**
 * Get bcrypt configuration
 * @returns {Object} Bcrypt config with saltRounds
 */
function getBcryptConfig() {
  return {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10
  };
}

/**
 * Get lockout configuration for brute-force protection
 * @returns {Object} Lockout config
 */
function getLockoutConfig() {
  return {
    maxAttempts: parseInt(process.env.LOCKOUT_MAX_ATTEMPTS, 10) || 5,
    windowMinutes: parseInt(process.env.LOCKOUT_WINDOW_MINUTES, 10) || 15,
    lockoutMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES, 10) || 30
  };
}

module.exports = {
  AUTH_MODE,
  getAuthMode,
  getJwtSecret,
  isAuthEnabled,
  isAuthRequired,
  getJwtConfig,
  getCookieConfig,
  getBcryptConfig,
  getLockoutConfig
};
