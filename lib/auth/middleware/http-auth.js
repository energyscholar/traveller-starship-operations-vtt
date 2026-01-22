/**
 * HTTP Authentication Middleware
 *
 * Express middleware for authenticating HTTP requests.
 * Extracts JWT from cookies or Authorization header.
 */

const { isAuthEnabled, isAuthRequired, getAuthMode, AUTH_MODE } = require('../../config/auth-config');
const tokenService = require('../token-service');
const authService = require('../auth-service');

/**
 * Extract token from HTTP request
 * @param {Object} req - Express request
 * @returns {string|null} JWT token or null
 */
function extractToken(req) {
  // Try cookie first (preferred for web apps)
  if (req.cookies?.auth_token) {
    return req.cookies.auth_token;
  }

  // Fallback to Authorization header (for API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * HTTP authentication middleware
 *
 * Behavior depends on AUTH_MODE:
 * - disabled: Always allows, no user attached
 * - optional: Validates token if present, allows anonymous
 * - required: Rejects requests without valid token
 *
 * Attaches req.user if authenticated.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function httpAuthMiddleware(req, res, next) {
  const mode = getAuthMode();

  // Disabled mode - allow all requests
  if (mode === AUTH_MODE.DISABLED) {
    req.user = null;
    return next();
  }

  const token = extractToken(req);

  // No token provided
  if (!token) {
    if (mode === AUTH_MODE.REQUIRED) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Optional mode - allow anonymous
    req.user = null;
    return next();
  }

  // Verify token
  const decoded = tokenService.verifyToken(token);
  if (!decoded) {
    if (mode === AUTH_MODE.REQUIRED) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    // Optional mode - allow with invalid token (treat as anonymous)
    req.user = null;
    return next();
  }

  // Attach user info to request
  req.user = {
    id: decoded.sub,
    username: decoded.username,
    role: decoded.role
  };

  // Store token for logout capability
  req.authToken = token;

  next();
}

/**
 * Middleware that requires authentication
 * Use after httpAuthMiddleware for routes that need auth
 */
function requireAuth(req, res, next) {
  if (!isAuthEnabled()) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  next();
}

/**
 * Create middleware that requires specific role(s)
 * @param {...string} allowedRoles - Roles that are allowed
 * @returns {Function} Express middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!isAuthEnabled()) {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Middleware that requires admin role
 */
const requireAdmin = requireRole('admin');

/**
 * Middleware that requires GM or admin role
 */
const requireGMOrAdmin = requireRole('gm', 'admin');

/**
 * Get user from request (helper for route handlers)
 * @param {Object} req - Express request
 * @returns {Object|null} User object or null
 */
function getRequestUser(req) {
  return req.user || null;
}

/**
 * Check if request is authenticated
 * @param {Object} req - Express request
 * @returns {boolean}
 */
function isAuthenticated(req) {
  return req.user !== null && req.user !== undefined;
}

/**
 * Check if request user has role
 * @param {Object} req - Express request
 * @param {string} role - Role to check
 * @returns {boolean}
 */
function hasRole(req, role) {
  return req.user?.role === role;
}

/**
 * Check if request user is GM or admin
 * @param {Object} req - Express request
 * @returns {boolean}
 */
function isGMOrAdmin(req) {
  return req.user?.role === 'gm' || req.user?.role === 'admin';
}

module.exports = {
  httpAuthMiddleware,
  requireAuth,
  requireRole,
  requireAdmin,
  requireGMOrAdmin,
  extractToken,
  getRequestUser,
  isAuthenticated,
  hasRole,
  isGMOrAdmin
};
