/**
 * Test Auth Routes (Localhost Only)
 *
 * Development-only routes for testing authentication without OAuth.
 * ONLY available when:
 * - Running on localhost (127.0.0.1 or ::1)
 * - NODE_ENV !== 'production'
 *
 * These routes bypass normal OAuth flow for testing purposes.
 */

const express = require('express');
const { isAuthEnabled, getCookieConfig } = require('../../config/auth-config');
const authService = require('../auth-service');

const router = express.Router();

/**
 * Middleware to restrict routes to localhost only
 */
function localhostOnly(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || '';
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction || !isLocalhost) {
    return res.status(403).json({
      error: 'Test auth routes only available on localhost in development'
    });
  }

  next();
}

// Apply localhost restriction to all routes
router.use(localhostOnly);

/**
 * GET /auth/test
 * Info about test auth endpoints
 */
router.get('/', (req, res) => {
  res.json({
    message: 'Test auth endpoints (localhost only)',
    endpoints: {
      'POST /auth/test/login-as': 'Login as any user by username',
      'POST /auth/test/create-user': 'Create a test user',
      'POST /auth/test/create-gm': 'Create a GM user',
      'GET /auth/test/users': 'List all users',
      'POST /auth/test/oauth-mock': 'Simulate OAuth login'
    }
  });
});

/**
 * POST /auth/test/login-as
 * Login as any existing user by username (no password required)
 */
router.post('/login-as', async (req, res) => {
  if (!isAuthEnabled()) {
    return res.status(403).json({ error: 'Authentication is disabled' });
  }

  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  const user = authService.getUserByUsername(username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Create token directly (bypassing password check)
  const tokenService = require('../token-service');
  const tokenResult = tokenService.createToken({
    id: user.id,
    username: user.username,
    role: user.role
  });

  if (!tokenResult) {
    return res.status(500).json({ error: 'Failed to create token' });
  }

  const cookieConfig = getCookieConfig();
  res.cookie('auth_token', tokenResult.token, cookieConfig);

  res.json({
    success: true,
    user,
    message: 'Logged in (test mode - no password required)'
  });
});

/**
 * POST /auth/test/create-user
 * Create a test user with optional role
 */
router.post('/create-user', async (req, res) => {
  if (!isAuthEnabled()) {
    return res.status(403).json({ error: 'Authentication is disabled' });
  }

  const { username, email, role = 'player' } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  // Use a simple test password
  const password = 'TestPassword123!';
  const result = await authService.register(username, password, { email, role });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    success: true,
    user: result.user,
    password, // Return password so tester knows it
    message: 'Test user created'
  });
});

/**
 * POST /auth/test/create-gm
 * Shortcut to create a GM user
 */
router.post('/create-gm', async (req, res) => {
  if (!isAuthEnabled()) {
    return res.status(403).json({ error: 'Authentication is disabled' });
  }

  const { username = 'test_gm', email } = req.body;
  const password = 'TestGM123!';

  const result = await authService.register(username, password, { email, role: 'gm' });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    success: true,
    user: result.user,
    password,
    message: 'GM user created'
  });
});

/**
 * GET /auth/test/users
 * List all users (for debugging)
 */
router.get('/users', (req, res) => {
  const { db } = require('../../operations/database');

  try {
    const users = db.prepare(`
      SELECT id, username, email, role, created_at
      FROM auth_users ORDER BY created_at DESC
    `).all();

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/test/oauth-mock
 * Simulate OAuth login without actual OAuth provider
 */
router.post('/oauth-mock', async (req, res) => {
  if (!isAuthEnabled()) {
    return res.status(403).json({ error: 'Authentication is disabled' });
  }

  const {
    provider = 'google',
    providerUserId = 'test_' + Date.now(),
    email,
    displayName = 'Test User'
  } = req.body;

  const mockProfile = {
    provider,
    providerUserId,
    email: email || `${providerUserId}@test.local`,
    displayName,
    avatarUrl: null
  };

  const mockTokens = {
    accessToken: 'mock_access_token_' + Date.now(),
    refreshToken: 'mock_refresh_token_' + Date.now(),
    expiresIn: 3600
  };

  const result = await authService.findOrCreateUserFromOAuth(mockProfile, mockTokens);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  const cookieConfig = getCookieConfig();
  res.cookie('auth_token', result.token, cookieConfig);

  res.json({
    success: true,
    user: result.user,
    message: 'Mock OAuth login successful'
  });
});

/**
 * DELETE /auth/test/user/:username
 * Delete a test user
 */
router.delete('/user/:username', async (req, res) => {
  const { username } = req.params;
  const user = authService.getUserByUsername(username);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const result = authService.deleteUser(user.id);
  res.json(result);
});

module.exports = router;
