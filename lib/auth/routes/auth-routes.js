/**
 * Auth Routes
 *
 * Express routes for authentication endpoints.
 * Handles OAuth flows, login, logout, and user info.
 */

const express = require('express');
const { isAuthEnabled, getCookieConfig } = require('../../config/auth-config');
const authService = require('../auth-service');
const tokenService = require('../token-service');
const googleOAuth = require('../oauth/google');

const router = express.Router();

// In-memory store for OAuth state (should use Redis in production)
const oauthStates = new Map();
const STATE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Clean up expired OAuth states
 */
function cleanupExpiredStates() {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.createdAt > STATE_TTL) {
      oauthStates.delete(state);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredStates, 5 * 60 * 1000);

/**
 * GET /auth/status
 * Check auth status and return current user if authenticated
 */
router.get('/status', (req, res) => {
  if (!isAuthEnabled()) {
    return res.json({ enabled: false, user: null });
  }

  const token = req.cookies?.auth_token;
  if (!token) {
    return res.json({ enabled: true, user: null });
  }

  const user = authService.verifyAndGetUser(token);
  res.json({ enabled: true, user });
});

/**
 * POST /auth/login
 * Username/password login
 */
router.post('/login', async (req, res) => {
  if (!isAuthEnabled()) {
    return res.status(403).json({ error: 'Authentication is disabled' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const result = await authService.login(username, password, ip);

  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  // Set auth cookie
  const cookieConfig = getCookieConfig();
  res.cookie('auth_token', result.token, cookieConfig);

  res.json({
    success: true,
    user: result.user,
    expiresAt: result.expiresAt
  });
});

/**
 * POST /auth/register
 * Create new account with username/password
 */
router.post('/register', async (req, res) => {
  if (!isAuthEnabled()) {
    return res.status(403).json({ error: 'Authentication is disabled' });
  }

  const { username, password, email } = req.body;
  const result = await authService.register(username, password, { email });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Auto-login after registration
  const loginResult = await authService.login(username, password);
  if (loginResult.success) {
    const cookieConfig = getCookieConfig();
    res.cookie('auth_token', loginResult.token, cookieConfig);
  }

  res.json({
    success: true,
    user: result.user
  });
});

/**
 * POST /auth/logout
 * Clear auth cookie and revoke token
 */
router.post('/logout', (req, res) => {
  const token = req.cookies?.auth_token;
  if (token) {
    tokenService.revokeToken(token);
  }

  res.clearCookie('auth_token', { path: '/' });
  res.json({ success: true });
});

/**
 * GET /auth/google
 * Start Google OAuth flow
 */
router.get('/google', (req, res) => {
  if (!isAuthEnabled()) {
    return res.status(403).json({ error: 'Authentication is disabled' });
  }

  if (!googleOAuth.isGoogleConfigured()) {
    return res.status(501).json({ error: 'Google OAuth not configured' });
  }

  const redirectUri = `${req.protocol}://${req.get('host')}/auth/google/callback`;
  const { url, state, pkce } = googleOAuth.getAuthorizationUrl(redirectUri);

  // Store state and PKCE verifier
  oauthStates.set(state, {
    verifier: pkce.verifier,
    redirectUri,
    createdAt: Date.now()
  });

  res.redirect(url);
});

/**
 * GET /auth/google/callback
 * Google OAuth callback handler
 */
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/login?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.redirect('/login?error=missing_params');
  }

  // Validate state
  const stateData = oauthStates.get(state);
  if (!stateData) {
    return res.redirect('/login?error=invalid_state');
  }

  oauthStates.delete(state);

  try {
    // Exchange code for tokens
    const tokens = await googleOAuth.exchangeCodeForTokens(
      code,
      stateData.verifier,
      stateData.redirectUri
    );

    // Get user profile
    const profile = await googleOAuth.getUserInfo(tokens.accessToken);

    // Find or create user
    const result = await authService.findOrCreateUserFromOAuth(profile, tokens);

    if (!result.success) {
      return res.redirect(`/login?error=${encodeURIComponent(result.error)}`);
    }

    // Set auth cookie
    const cookieConfig = getCookieConfig();
    res.cookie('auth_token', result.token, cookieConfig);

    // Redirect to app
    res.redirect('/operations');
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    res.redirect('/login?error=oauth_failed');
  }
});

/**
 * GET /auth/providers
 * List available OAuth providers
 */
router.get('/providers', (req, res) => {
  const providers = [];

  if (googleOAuth.isGoogleConfigured()) {
    providers.push({
      id: 'google',
      name: 'Google',
      url: '/auth/google'
    });
  }

  res.json({ providers });
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', (req, res) => {
  if (!isAuthEnabled()) {
    return res.status(403).json({ error: 'Authentication is disabled' });
  }

  const token = req.cookies?.auth_token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = authService.verifyAndGetUser(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Get linked providers
  const linkedProviders = authService.getLinkedProviders(user.id);

  res.json({
    user,
    linkedProviders
  });
});

module.exports = router;
