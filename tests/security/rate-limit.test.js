/**
 * AR-16.10: Security Test Suite - Rate Limiting
 * Tests that rate limiting is working correctly
 */

const { checkRateLimit, RATE_LIMIT_MAX_ACTIONS, RATE_LIMIT_WINDOW_MS } = require('../../lib/services/rate-limiter');
const state = require('../../lib/state');

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear any existing rate limit state
    state.clearSocketTimestamps('test-socket-1');
    state.clearSocketTimestamps('test-socket-2');
  });

  test('allows actions under rate limit', () => {
    const socketId = 'test-socket-1';

    // First action should be allowed
    expect(checkRateLimit(socketId)).toBe(true);

    // Second action should be allowed (limit is 2 per second)
    expect(checkRateLimit(socketId)).toBe(true);
  });

  test('blocks actions over rate limit', () => {
    const socketId = 'test-socket-2';

    // Use up the allowed actions
    for (let i = 0; i < RATE_LIMIT_MAX_ACTIONS; i++) {
      checkRateLimit(socketId);
    }

    // Next action should be blocked
    expect(checkRateLimit(socketId)).toBe(false);
  });

  test('rate limit constants are reasonable', () => {
    // Window should be 1 second
    expect(RATE_LIMIT_WINDOW_MS).toBe(1000);

    // Should allow at least 2 actions per second
    expect(RATE_LIMIT_MAX_ACTIONS).toBeGreaterThanOrEqual(2);

    // But not more than 10 (would be too permissive)
    expect(RATE_LIMIT_MAX_ACTIONS).toBeLessThanOrEqual(10);
  });
});
