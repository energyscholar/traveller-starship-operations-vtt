/**
 * Auth Module
 *
 * Re-exports all auth functionality for convenient imports.
 */

const authService = require('./auth-service');
const tokenService = require('./token-service');
const lockoutService = require('./lockout-service');
const socketAuth = require('./middleware/socket-auth');

module.exports = {
  // Auth service (main API)
  register: authService.register,
  login: authService.login,
  logout: authService.logout,
  getUserById: authService.getUserById,
  getUserByUsername: authService.getUserByUsername,
  changePassword: authService.changePassword,
  deleteUser: authService.deleteUser,
  verifyAndGetUser: authService.verifyAndGetUser,

  // Token service
  createToken: tokenService.createToken,
  verifyToken: tokenService.verifyToken,
  revokeToken: tokenService.revokeToken,
  revokeAllUserTokens: tokenService.revokeAllUserTokens,
  cleanupExpiredSessions: tokenService.cleanupExpiredSessions,

  // Lockout service
  isLockedOut: lockoutService.isLockedOut,
  clearLockout: lockoutService.clearLockout,
  getLockoutStatus: lockoutService.getLockoutStatus,
  cleanupOldAttempts: lockoutService.cleanupOldAttempts,

  // Socket middleware
  socketAuthMiddleware: socketAuth.socketAuthMiddleware,
  requireRole: socketAuth.requireRole,
  requireAuth: socketAuth.requireAuth,
  getSocketUser: socketAuth.getSocketUser,
  isAuthenticated: socketAuth.isAuthenticated,
  hasRole: socketAuth.hasRole,
  isGMOrAdmin: socketAuth.isGMOrAdmin
};
