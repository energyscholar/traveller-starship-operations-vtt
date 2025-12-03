/**
 * Rate Limiter for Operations VTT
 * AR-16.8: Security hardening through request rate limiting
 *
 * Simple in-memory rate limiter for socket events.
 * Tracks requests per socket/IP and blocks excessive requests.
 */

// Default configuration
const DEFAULT_CONFIG = {
  // Max requests per window
  maxRequests: 100,
  // Window size in ms (1 minute)
  windowMs: 60000,
  // Block duration after exceeding limit (5 minutes)
  blockDurationMs: 300000
};

// Track requests per socket
// Map: socketId -> { count: number, windowStart: timestamp, blocked: timestamp|null }
const requestCounts = new Map();

// Track blocked IPs
// Map: ip -> unblockTime
const blockedIPs = new Map();

/**
 * Create a rate limiter with custom config
 * @param {Object} config - Configuration options
 * @returns {Object} Rate limiter instance
 */
function createRateLimiter(config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return {
    /**
     * Check if a request should be allowed
     * @param {string} socketId - Socket identifier
     * @param {string} ip - IP address (optional)
     * @returns {{allowed: boolean, remaining: number, retryAfter?: number}}
     */
    check(socketId, ip = null) {
      const now = Date.now();

      // Check IP block first
      if (ip && blockedIPs.has(ip)) {
        const unblockTime = blockedIPs.get(ip);
        if (now < unblockTime) {
          return {
            allowed: false,
            remaining: 0,
            retryAfter: Math.ceil((unblockTime - now) / 1000)
          };
        }
        // Unblock IP
        blockedIPs.delete(ip);
      }

      // Get or create request tracking
      let tracking = requestCounts.get(socketId);

      if (!tracking) {
        tracking = { count: 0, windowStart: now, blocked: null };
        requestCounts.set(socketId, tracking);
      }

      // Check if currently blocked
      if (tracking.blocked && now < tracking.blocked) {
        return {
          allowed: false,
          remaining: 0,
          retryAfter: Math.ceil((tracking.blocked - now) / 1000)
        };
      }

      // Reset window if expired
      if (now - tracking.windowStart > cfg.windowMs) {
        tracking.count = 0;
        tracking.windowStart = now;
        tracking.blocked = null;
      }

      // Increment count
      tracking.count++;

      // Check if over limit
      if (tracking.count > cfg.maxRequests) {
        tracking.blocked = now + cfg.blockDurationMs;

        // Also block IP if provided
        if (ip) {
          blockedIPs.set(ip, now + cfg.blockDurationMs);
        }

        return {
          allowed: false,
          remaining: 0,
          retryAfter: Math.ceil(cfg.blockDurationMs / 1000)
        };
      }

      return {
        allowed: true,
        remaining: cfg.maxRequests - tracking.count
      };
    },

    /**
     * Clear tracking for a socket (on disconnect)
     * @param {string} socketId - Socket identifier
     */
    clear(socketId) {
      requestCounts.delete(socketId);
    },

    /**
     * Get current stats
     * @returns {Object} Rate limiter stats
     */
    getStats() {
      return {
        trackedSockets: requestCounts.size,
        blockedIPs: blockedIPs.size
      };
    },

    /**
     * Reset all tracking (for testing)
     */
    reset() {
      requestCounts.clear();
      blockedIPs.clear();
    }
  };
}

// Default instance for operations handlers
const defaultLimiter = createRateLimiter();

// Specialized limiters for different event categories
const limiters = {
  // Standard events (100 per minute)
  standard: defaultLimiter,

  // High-frequency events (300 per minute)
  // For things like mouse moves, typing indicators
  highFrequency: createRateLimiter({ maxRequests: 300 }),

  // Sensitive events (10 per minute)
  // For things like campaign creation, deletion
  sensitive: createRateLimiter({ maxRequests: 10, blockDurationMs: 600000 }),

  // Auth events (5 per minute)
  // For login attempts
  auth: createRateLimiter({ maxRequests: 5, blockDurationMs: 900000 })
};

/**
 * Middleware factory for socket rate limiting
 * @param {string} category - Rate limit category
 * @returns {Function} Middleware function
 */
function rateLimitMiddleware(category = 'standard') {
  const limiter = limiters[category] || limiters.standard;

  return function (socket, next) {
    const ip = socket.handshake.address;
    const result = limiter.check(socket.id, ip);

    if (!result.allowed) {
      const error = new Error(`Rate limit exceeded. Retry after ${result.retryAfter} seconds.`);
      error.data = { retryAfter: result.retryAfter };
      return next(error);
    }

    next();
  };
}

/**
 * Check rate limit for a specific event
 * @param {Socket} socket - Socket instance
 * @param {string} category - Rate limit category
 * @returns {{allowed: boolean, error?: string}}
 */
function checkRateLimit(socket, category = 'standard') {
  const limiter = limiters[category] || limiters.standard;
  const ip = socket.handshake?.address;
  const result = limiter.check(socket.id, ip);

  if (!result.allowed) {
    return {
      allowed: false,
      error: `Rate limit exceeded. Retry after ${result.retryAfter} seconds.`
    };
  }

  return { allowed: true };
}

module.exports = {
  createRateLimiter,
  limiters,
  rateLimitMiddleware,
  checkRateLimit,
  DEFAULT_CONFIG
};
