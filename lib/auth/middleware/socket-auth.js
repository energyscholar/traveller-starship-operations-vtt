/**
 * Socket.io Authentication Middleware
 *
 * Extracts JWT from httpOnly cookie and validates on connection.
 * Attaches user info to socket for use in handlers.
 */

const cookie = require('cookie');
const { isAuthEnabled, isAuthRequired, getAuthMode, AUTH_MODE } = require('../../config/auth-config');
const tokenService = require('../token-service');
const authService = require('../auth-service');

/**
 * Extract token from socket handshake
 * @param {Object} socket - Socket.io socket
 * @returns {string|null} JWT token or null
 */
function extractToken(socket) {
  // Try cookie first (preferred for httpOnly)
  const cookieHeader = socket.handshake.headers.cookie;
  if (cookieHeader) {
    const cookies = cookie.parse(cookieHeader);
    if (cookies.auth_token) {
      return cookies.auth_token;
    }
  }

  // Fallback to auth header (for testing/non-browser clients)
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback to query param (least preferred, for debugging)
  if (socket.handshake.query && socket.handshake.query.token) {
    return socket.handshake.query.token;
  }

  return null;
}

/**
 * Socket.io authentication middleware
 *
 * Behavior depends on AUTH_MODE:
 * - disabled: Always allows, no user attached
 * - optional: Validates token if present, allows anonymous
 * - required: Rejects connections without valid token
 *
 * @param {Object} socket - Socket.io socket
 * @param {Function} next - Next middleware function
 */
function socketAuthMiddleware(socket, next) {
  const mode = getAuthMode();

  // Disabled mode - allow all connections
  if (mode === AUTH_MODE.DISABLED) {
    socket.user = null;
    return next();
  }

  const token = extractToken(socket);

  // No token provided
  if (!token) {
    if (mode === AUTH_MODE.REQUIRED) {
      return next(new Error('Authentication required'));
    }
    // Optional mode - allow anonymous
    socket.user = null;
    return next();
  }

  // Verify token
  const decoded = tokenService.verifyToken(token);
  if (!decoded) {
    if (mode === AUTH_MODE.REQUIRED) {
      return next(new Error('Invalid or expired token'));
    }
    // Optional mode - allow with invalid token (treat as anonymous)
    socket.user = null;
    return next();
  }

  // Attach user info to socket
  socket.user = {
    id: decoded.sub,
    username: decoded.username,
    role: decoded.role
  };

  // Store token for logout capability
  socket.authToken = token;

  next();
}

/**
 * Create a middleware that requires specific role
 * @param {...string} allowedRoles - Roles that are allowed
 * @returns {Function} Socket.io middleware
 */
function requireRole(...allowedRoles) {
  return (socket, next) => {
    if (!isAuthEnabled()) {
      return next();
    }

    if (!socket.user) {
      return next(new Error('Authentication required'));
    }

    if (!allowedRoles.includes(socket.user.role)) {
      return next(new Error('Insufficient permissions'));
    }

    next();
  };
}

/**
 * Middleware to require authentication (for specific namespaces)
 * @param {Object} socket - Socket.io socket
 * @param {Function} next - Next middleware function
 */
function requireAuth(socket, next) {
  if (!isAuthEnabled()) {
    return next();
  }

  if (!socket.user) {
    return next(new Error('Authentication required'));
  }

  next();
}

/**
 * Get user from socket (helper for handlers)
 * @param {Object} socket - Socket.io socket
 * @returns {Object|null} User object or null
 */
function getSocketUser(socket) {
  return socket.user || null;
}

/**
 * Check if socket is authenticated
 * @param {Object} socket - Socket.io socket
 * @returns {boolean}
 */
function isAuthenticated(socket) {
  return socket.user !== null && socket.user !== undefined;
}

/**
 * Check if socket has role
 * @param {Object} socket - Socket.io socket
 * @param {string} role - Role to check
 * @returns {boolean}
 */
function hasRole(socket, role) {
  return socket.user?.role === role;
}

/**
 * Check if socket is GM or admin
 * @param {Object} socket - Socket.io socket
 * @returns {boolean}
 */
function isGMOrAdmin(socket) {
  return socket.user?.role === 'gm' || socket.user?.role === 'admin';
}

module.exports = {
  socketAuthMiddleware,
  requireRole,
  requireAuth,
  extractToken,
  getSocketUser,
  isAuthenticated,
  hasRole,
  isGMOrAdmin
};
