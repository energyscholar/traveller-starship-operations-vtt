/**
 * Auth Module
 *
 * Re-exports all auth functionality for convenient imports.
 */

const authService = require('./auth-service');
const tokenService = require('./token-service');
const lockoutService = require('./lockout-service');
const socketAuth = require('./middleware/socket-auth');
const httpAuth = require('./middleware/http-auth');
const pkce = require('./oauth/pkce');
const googleOAuth = require('./oauth/google');
const authRoutes = require('./routes/auth-routes');
const testAuthRoutes = require('./routes/test-auth');

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
  findOrCreateUserFromOAuth: authService.findOrCreateUserFromOAuth,
  getLinkedProviders: authService.getLinkedProviders,
  unlinkOAuthProvider: authService.unlinkOAuthProvider,

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
  socketRequireRole: socketAuth.requireRole,
  socketRequireAuth: socketAuth.requireAuth,
  getSocketUser: socketAuth.getSocketUser,

  // HTTP middleware
  httpAuthMiddleware: httpAuth.httpAuthMiddleware,
  httpRequireAuth: httpAuth.requireAuth,
  httpRequireRole: httpAuth.requireRole,
  requireAdmin: httpAuth.requireAdmin,
  requireGMOrAdmin: httpAuth.requireGMOrAdmin,
  getRequestUser: httpAuth.getRequestUser,
  isAuthenticated: httpAuth.isAuthenticated,
  hasRole: httpAuth.hasRole,
  isGMOrAdmin: httpAuth.isGMOrAdmin,

  // PKCE utilities
  generatePKCEPair: pkce.generatePKCEPair,
  generateState: pkce.generateState,
  verifyCodeChallenge: pkce.verifyCodeChallenge,

  // Google OAuth
  googleOAuth: {
    isConfigured: googleOAuth.isGoogleConfigured,
    getAuthorizationUrl: googleOAuth.getAuthorizationUrl,
    exchangeCodeForTokens: googleOAuth.exchangeCodeForTokens,
    getUserInfo: googleOAuth.getUserInfo,
    refreshAccessToken: googleOAuth.refreshAccessToken,
    revokeToken: googleOAuth.revokeToken
  },

  // Express routers
  authRoutes,
  testAuthRoutes
};
