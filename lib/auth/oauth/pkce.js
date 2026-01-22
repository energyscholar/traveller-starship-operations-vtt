/**
 * PKCE (Proof Key for Code Exchange) utilities
 *
 * Implements RFC 7636 for secure OAuth 2.0 authorization code flow.
 * Prevents authorization code interception attacks.
 */

const crypto = require('crypto');

/**
 * Generate a cryptographically random code verifier
 * @param {number} length - Length of verifier (43-128 chars, default 64)
 * @returns {string} URL-safe base64 encoded random string
 */
function generateCodeVerifier(length = 64) {
  // RFC 7636: verifier must be 43-128 characters
  if (length < 43 || length > 128) {
    throw new Error('Code verifier length must be between 43 and 128');
  }

  // Generate random bytes and encode as URL-safe base64
  const buffer = crypto.randomBytes(length);
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .slice(0, length);
}

/**
 * Generate code challenge from verifier using S256 method
 * @param {string} verifier - The code verifier
 * @returns {string} URL-safe base64 encoded SHA-256 hash
 */
function generateCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a PKCE pair (verifier and challenge)
 * @param {number} length - Length of verifier (default 64)
 * @returns {Object} { verifier, challenge, method: 'S256' }
 */
function generatePKCEPair(length = 64) {
  const verifier = generateCodeVerifier(length);
  const challenge = generateCodeChallenge(verifier);

  return {
    verifier,
    challenge,
    method: 'S256'
  };
}

/**
 * Verify a code verifier against a challenge
 * @param {string} verifier - The code verifier to check
 * @param {string} challenge - The expected challenge
 * @returns {boolean} Whether the verifier matches the challenge
 */
function verifyCodeChallenge(verifier, challenge) {
  const computed = generateCodeChallenge(verifier);
  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(challenge)
    );
  } catch {
    // Lengths don't match
    return false;
  }
}

/**
 * Generate a state parameter for CSRF protection
 * @returns {string} Random state string
 */
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a nonce for replay protection (OpenID Connect)
 * @returns {string} Random nonce string
 */
function generateNonce() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEPair,
  verifyCodeChallenge,
  generateState,
  generateNonce
};
