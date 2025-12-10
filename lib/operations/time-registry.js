/**
 * AR-61: Time Registry with Race Condition Mitigations
 *
 * Provides:
 * - Mutex lock on time advancement (prevents concurrent advances)
 * - Sequential callback queue (processes callbacks in order)
 * - Optimistic locking with version numbers
 * - Debounce for rapid time advances
 */

class TimeRegistry {
  constructor() {
    // Per-campaign state
    this.campaigns = new Map();

    // Global debounce settings
    this.debounceMs = 100; // Collapse advances within 100ms
  }

  /**
   * Get or create campaign time state
   */
  getCampaignState(campaignId) {
    if (!this.campaigns.has(campaignId)) {
      this.campaigns.set(campaignId, {
        callbacks: new Map(),      // id -> { interval, handler, lastRun }
        version: 0,                // Optimistic locking version
        isAdvancing: false,        // Mutex lock
        pendingAdvance: null,      // Debounced advance
        lastAdvanceTime: 0,        // For debouncing
        timeLocked: false          // GM lock (AR-61 UQ)
      });
    }
    return this.campaigns.get(campaignId);
  }

  /**
   * Register a callback for time-based events
   * @param {string} campaignId - Campaign identifier
   * @param {string} callbackId - Unique callback identifier
   * @param {number} intervalMinutes - How often callback should fire (in game minutes)
   * @param {Function} handler - Async function(elapsedMinutes, campaignState) => void
   */
  registerCallback(campaignId, callbackId, intervalMinutes, handler) {
    const state = this.getCampaignState(campaignId);
    state.callbacks.set(callbackId, {
      interval: intervalMinutes,
      handler,
      lastRun: 0,
      accumulated: 0
    });
    return () => this.unregisterCallback(campaignId, callbackId);
  }

  /**
   * Unregister a callback
   */
  unregisterCallback(campaignId, callbackId) {
    const state = this.getCampaignState(campaignId);
    state.callbacks.delete(callbackId);
  }

  /**
   * Set GM time lock
   */
  setTimeLock(campaignId, locked) {
    const state = this.getCampaignState(campaignId);
    state.timeLocked = locked;
    state.version++;
  }

  /**
   * Check if time is locked
   */
  isTimeLocked(campaignId) {
    const state = this.getCampaignState(campaignId);
    return state.timeLocked;
  }

  /**
   * Advance time with race condition protection
   * @param {string} campaignId - Campaign identifier
   * @param {number} totalMinutes - Minutes to advance
   * @param {Object} options - { force: boolean, expectedVersion: number }
   * @returns {Promise<{ success: boolean, version: number, results: Array }>}
   */
  async advanceTime(campaignId, totalMinutes, options = {}) {
    const state = this.getCampaignState(campaignId);
    const now = Date.now();

    // Optimistic locking check
    if (options.expectedVersion !== undefined && options.expectedVersion !== state.version) {
      return {
        success: false,
        error: 'VERSION_MISMATCH',
        currentVersion: state.version,
        results: []
      };
    }

    // Check GM lock (unless force)
    if (state.timeLocked && !options.force) {
      return {
        success: false,
        error: 'TIME_LOCKED',
        version: state.version,
        results: []
      };
    }

    // Debounce rapid advances
    if (now - state.lastAdvanceTime < this.debounceMs && !options.force) {
      // Accumulate into pending advance
      if (state.pendingAdvance) {
        state.pendingAdvance.minutes += totalMinutes;
        return {
          success: true,
          debounced: true,
          version: state.version,
          results: []
        };
      }
    }

    // Mutex: Wait if already advancing
    if (state.isAdvancing) {
      // Queue this advance
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!state.isAdvancing) {
            clearInterval(check);
            resolve(this.advanceTime(campaignId, totalMinutes, options));
          }
        }, 10);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(check);
          resolve({
            success: false,
            error: 'TIMEOUT',
            version: state.version,
            results: []
          });
        }, 5000);
      });
    }

    // Acquire lock
    state.isAdvancing = true;
    state.lastAdvanceTime = now;
    state.version++;

    const results = [];

    try {
      // Process callbacks sequentially (not in parallel)
      for (const [callbackId, callback] of state.callbacks) {
        callback.accumulated += totalMinutes;

        // Check if callback should fire
        const timesToFire = Math.floor(callback.accumulated / callback.interval);
        if (timesToFire > 0) {
          const elapsedMinutes = timesToFire * callback.interval;
          callback.accumulated -= elapsedMinutes;
          callback.lastRun = now;

          try {
            // Execute callback
            const result = await callback.handler(elapsedMinutes, {
              campaignId,
              totalAdvanced: totalMinutes,
              version: state.version
            });
            results.push({
              callbackId,
              success: true,
              elapsedMinutes,
              result
            });
          } catch (err) {
            results.push({
              callbackId,
              success: false,
              error: err.message
            });
          }
        }
      }

      return {
        success: true,
        version: state.version,
        totalMinutes,
        results
      };
    } finally {
      // Release lock
      state.isAdvancing = false;
    }
  }

  /**
   * Get current version for optimistic locking
   */
  getVersion(campaignId) {
    return this.getCampaignState(campaignId).version;
  }

  /**
   * Get registered callbacks (for debugging/testing)
   */
  getCallbacks(campaignId) {
    const state = this.getCampaignState(campaignId);
    return Array.from(state.callbacks.keys());
  }

  /**
   * Clear all state for a campaign
   */
  clearCampaign(campaignId) {
    this.campaigns.delete(campaignId);
  }
}

// Singleton instance
const timeRegistry = new TimeRegistry();

module.exports = { TimeRegistry, timeRegistry };
