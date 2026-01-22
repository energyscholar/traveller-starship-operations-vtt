/**
 * Lockout Service
 *
 * Brute-force protection via login attempt tracking.
 * Tracks failed attempts by username/IP and enforces lockout periods.
 */

const { getLockoutConfig, isAuthEnabled } = require('../config/auth-config');
const { db } = require('../operations/database');

/**
 * Record a login attempt
 * @param {string} identifier - Username or IP address
 * @param {string} ipAddress - Client IP address
 * @param {boolean} success - Whether login succeeded
 */
function recordAttempt(identifier, ipAddress, success) {
  if (!isAuthEnabled()) {
    return;
  }

  try {
    db.prepare(`
      INSERT INTO auth_login_attempts (identifier, ip_address, success)
      VALUES (?, ?, ?)
    `).run(identifier, ipAddress, success ? 1 : 0);
  } catch (err) {
    console.error('Failed to record login attempt:', err.message);
  }
}

/**
 * Get recent failed attempt count for an identifier
 * @param {string} identifier - Username or IP address
 * @returns {number} Number of failed attempts in window
 */
function getFailedAttemptCount(identifier) {
  if (!isAuthEnabled()) {
    return 0;
  }

  const config = getLockoutConfig();

  try {
    // Use SQLite's datetime functions for proper comparison
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM auth_login_attempts
      WHERE identifier = ? AND success = 0
      AND datetime(attempted_at) > datetime('now', '-' || ? || ' minutes')
    `).get(identifier, config.windowMinutes);
    return result?.count || 0;
  } catch (err) {
    console.error('Failed to get attempt count:', err.message);
    return 0;
  }
}

/**
 * Check if an identifier is locked out
 * @param {string} identifier - Username or IP address
 * @returns {Object} { locked: boolean, remainingMinutes: number }
 */
function isLockedOut(identifier) {
  if (!isAuthEnabled()) {
    return { locked: false, remainingMinutes: 0 };
  }

  const config = getLockoutConfig();
  const failedCount = getFailedAttemptCount(identifier);

  if (failedCount < config.maxAttempts) {
    return { locked: false, remainingMinutes: 0 };
  }

  // Get the most recent failed attempt and check if still in lockout period
  // Use SQLite to calculate lockout end time in UTC
  const lockoutCheck = db.prepare(`
    SELECT
      datetime(attempted_at, '+' || ? || ' minutes') as lockout_end,
      (julianday(datetime(attempted_at, '+' || ? || ' minutes')) - julianday('now')) * 24 * 60 as remaining_minutes
    FROM auth_login_attempts
    WHERE identifier = ? AND success = 0
    ORDER BY attempted_at DESC LIMIT 1
  `).get(config.lockoutMinutes, config.lockoutMinutes, identifier);

  if (!lockoutCheck) {
    return { locked: false, remainingMinutes: 0 };
  }

  const remainingMinutes = Math.ceil(lockoutCheck.remaining_minutes);
  if (remainingMinutes <= 0) {
    return { locked: false, remainingMinutes: 0 };
  }

  return { locked: true, remainingMinutes };
}

/**
 * Clear lockout for an identifier (admin action)
 * @param {string} identifier - Username or IP address
 * @returns {number} Number of records cleared
 */
function clearLockout(identifier) {
  try {
    const result = db.prepare(`
      DELETE FROM auth_login_attempts WHERE identifier = ?
    `).run(identifier);
    return result.changes;
  } catch (err) {
    console.error('Failed to clear lockout:', err.message);
    return 0;
  }
}

/**
 * Clean up old login attempts (maintenance)
 * @returns {number} Number of records cleaned
 */
function cleanupOldAttempts() {
  const config = getLockoutConfig();
  // Keep attempts for 2x the lockout window for audit purposes
  const retentionMinutes = config.lockoutMinutes * 2;

  try {
    const result = db.prepare(`
      DELETE FROM auth_login_attempts
      WHERE datetime(attempted_at) < datetime('now', '-' || ? || ' minutes')
    `).run(retentionMinutes);
    return result.changes;
  } catch (err) {
    console.error('Failed to cleanup attempts:', err.message);
    return 0;
  }
}

/**
 * Get lockout status summary for an identifier
 * @param {string} identifier - Username or IP address
 * @returns {Object} Status summary
 */
function getLockoutStatus(identifier) {
  const config = getLockoutConfig();
  const failedCount = getFailedAttemptCount(identifier);
  const { locked, remainingMinutes } = isLockedOut(identifier);

  return {
    identifier,
    failedAttempts: failedCount,
    maxAttempts: config.maxAttempts,
    locked,
    remainingMinutes,
    attemptsRemaining: Math.max(0, config.maxAttempts - failedCount)
  };
}

module.exports = {
  recordAttempt,
  getFailedAttemptCount,
  isLockedOut,
  clearLockout,
  cleanupOldAttempts,
  getLockoutStatus
};
