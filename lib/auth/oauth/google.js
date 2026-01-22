/**
 * Google OAuth Provider
 *
 * Implements Google OAuth 2.0 with PKCE for secure authentication.
 * Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.
 */

const { generatePKCEPair, generateState, generateNonce } = require('./pkce');

// Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/**
 * Get Google OAuth configuration from environment
 * @returns {Object|null} Config or null if not configured
 */
function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    // Default redirect URI - can be overridden
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
  };
}

/**
 * Check if Google OAuth is configured
 * @returns {boolean}
 */
function isGoogleConfigured() {
  return getGoogleConfig() !== null;
}

/**
 * Generate Google OAuth authorization URL
 * @param {string} redirectUri - OAuth callback URL
 * @returns {Object} { url, state, pkce: { verifier, challenge } }
 */
function getAuthorizationUrl(redirectUri) {
  const config = getGoogleConfig();
  if (!config) {
    throw new Error('Google OAuth not configured');
  }

  const state = generateState();
  const pkce = generatePKCEPair();
  const nonce = generateNonce();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri || config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: pkce.challenge,
    code_challenge_method: 'S256',
    access_type: 'offline', // Request refresh token
    prompt: 'consent' // Force consent to get refresh token
  });

  return {
    url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
    state,
    nonce,
    pkce: {
      verifier: pkce.verifier,
      challenge: pkce.challenge
    }
  };
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from Google
 * @param {string} codeVerifier - PKCE code verifier
 * @param {string} redirectUri - Must match the one used in authorization
 * @returns {Promise<Object>} Token response
 */
async function exchangeCodeForTokens(code, codeVerifier, redirectUri) {
  const config = getGoogleConfig();
  if (!config) {
    throw new Error('Google OAuth not configured');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri || config.redirectUri
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokens = await response.json();
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    tokenType: tokens.token_type,
    idToken: tokens.id_token,
    scope: tokens.scope
  };
}

/**
 * Get user info from Google
 * @param {string} accessToken - Valid access token
 * @returns {Promise<Object>} User profile
 */
async function getUserInfo(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  const profile = await response.json();
  return {
    provider: 'google',
    providerUserId: profile.sub,
    email: profile.email,
    emailVerified: profile.email_verified,
    displayName: profile.name,
    givenName: profile.given_name,
    familyName: profile.family_name,
    avatarUrl: profile.picture,
    locale: profile.locale
  };
}

/**
 * Refresh an access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New token response
 */
async function refreshAccessToken(refreshToken) {
  const config = getGoogleConfig();
  if (!config) {
    throw new Error('Google OAuth not configured');
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const tokens = await response.json();
  return {
    accessToken: tokens.access_token,
    expiresIn: tokens.expires_in,
    tokenType: tokens.token_type,
    scope: tokens.scope
  };
}

/**
 * Revoke a token (logout from Google)
 * @param {string} token - Access or refresh token
 * @returns {Promise<boolean>} Whether revocation succeeded
 */
async function revokeToken(token) {
  const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
    method: 'POST'
  });

  return response.ok;
}

module.exports = {
  getGoogleConfig,
  isGoogleConfigured,
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getUserInfo,
  refreshAccessToken,
  revokeToken,
  // Expose constants for testing
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL
};
