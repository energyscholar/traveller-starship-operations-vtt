/**
 * AR-61: Time Tracking System - TDD Tests with Race Condition Coverage
 */
const assert = require('assert');
const { TimeRegistry } = require('../lib/operations/time-registry');

describe('AR-61 Time Tracking', () => {
  let registry;

  beforeEach(() => {
    registry = new TimeRegistry();
  });

  describe('Basic Functionality', () => {
    it('should register time callbacks', () => {
      registry.registerCallback('camp1', 'fuel', 60, async () => {});
      const callbacks = registry.getCallbacks('camp1');
      assert.strictEqual(callbacks.length, 1);
      assert.strictEqual(callbacks[0], 'fuel');
    });

    it('should unregister callbacks', () => {
      const unregister = registry.registerCallback('camp1', 'fuel', 60, async () => {});
      unregister();
      assert.strictEqual(registry.getCallbacks('camp1').length, 0);
    });

    it('should advance time and trigger callbacks', async () => {
      let triggered = false;
      registry.registerCallback('camp1', 'test', 30, async () => {
        triggered = true;
      });

      await registry.advanceTime('camp1', 60);
      assert.strictEqual(triggered, true);
    });

    it('should support GM time lock', async () => {
      registry.setTimeLock('camp1', true);
      assert.strictEqual(registry.isTimeLocked('camp1'), true);

      const result = await registry.advanceTime('camp1', 60);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'TIME_LOCKED');
    });

    it('should allow force advance when locked', async () => {
      registry.setTimeLock('camp1', true);
      const result = await registry.advanceTime('camp1', 60, { force: true });
      assert.strictEqual(result.success, true);
    });
  });

  describe('Race Condition: Mutex Lock', () => {
    it('should prevent concurrent time advances', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;

      registry.registerCallback('camp1', 'counter', 1, async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise(r => setTimeout(r, 10)); // Simulate work
        concurrentCount--;
      });

      // Fire multiple advances simultaneously
      const advances = [
        registry.advanceTime('camp1', 10),
        registry.advanceTime('camp1', 10),
        registry.advanceTime('camp1', 10)
      ];

      await Promise.all(advances);
      assert.strictEqual(maxConcurrent, 1, 'Should never have concurrent execution');
    });
  });

  describe('Race Condition: Sequential Callbacks', () => {
    it('should process callbacks sequentially, not in parallel', async () => {
      const executionOrder = [];

      registry.registerCallback('camp1', 'first', 1, async () => {
        executionOrder.push('first-start');
        await new Promise(r => setTimeout(r, 5));
        executionOrder.push('first-end');
      });

      registry.registerCallback('camp1', 'second', 1, async () => {
        executionOrder.push('second-start');
        await new Promise(r => setTimeout(r, 5));
        executionOrder.push('second-end');
      });

      await registry.advanceTime('camp1', 10);

      // Sequential: first completes before second starts
      const firstEndIdx = executionOrder.indexOf('first-end');
      const secondStartIdx = executionOrder.indexOf('second-start');
      assert.ok(firstEndIdx < secondStartIdx, 'Callbacks should execute sequentially');
    });
  });

  describe('Race Condition: Optimistic Locking', () => {
    it('should reject stale version updates', async () => {
      const version = registry.getVersion('camp1');

      // Advance once to increment version
      await registry.advanceTime('camp1', 10);

      // Try with old version
      const result = await registry.advanceTime('camp1', 10, { expectedVersion: version });
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'VERSION_MISMATCH');
    });

    it('should accept matching version updates', async () => {
      const version = registry.getVersion('camp1');
      const result = await registry.advanceTime('camp1', 10, { expectedVersion: version });
      assert.strictEqual(result.success, true);
    });
  });

  describe('Race Condition: Callback Registration During Advance', () => {
    it('should handle callback registration during time advance', async () => {
      let lateCallbackRan = false;

      registry.registerCallback('camp1', 'slow', 1, async () => {
        await new Promise(r => setTimeout(r, 20));
        // Register new callback mid-execution
        registry.registerCallback('camp1', 'late', 1, async () => {
          lateCallbackRan = true;
        });
      });

      await registry.advanceTime('camp1', 10);
      // Late callback shouldn't run in this advance (registered after iteration started)
      // But should be registered for next advance

      const callbacks = registry.getCallbacks('camp1');
      assert.ok(callbacks.includes('late'), 'Late callback should be registered');
    });
  });

  describe('Callback Interval Accumulation', () => {
    it('should accumulate time and fire at correct intervals', async () => {
      let fireCount = 0;
      let totalElapsed = 0;

      registry.registerCallback('camp1', 'hourly', 60, async (elapsedMinutes) => {
        fireCount++;
        totalElapsed += elapsedMinutes;
      });

      await registry.advanceTime('camp1', 30); // Not enough
      assert.strictEqual(fireCount, 0);

      await registry.advanceTime('camp1', 30); // Now 60 total
      assert.strictEqual(fireCount, 1);
      assert.strictEqual(totalElapsed, 60);

      await registry.advanceTime('camp1', 120); // Fires once with 120 min elapsed
      assert.strictEqual(fireCount, 2);
      assert.strictEqual(totalElapsed, 180); // 60 + 120
    });

    it('should pass elapsed minutes to callback for batch processing', async () => {
      let processedUnits = 0;

      // Simulate fuel processing: 1 ton per 60 minutes
      registry.registerCallback('camp1', 'fuel', 60, async (elapsedMinutes) => {
        const units = Math.floor(elapsedMinutes / 60);
        processedUnits += units;
      });

      await registry.advanceTime('camp1', 180); // 3 hours
      assert.strictEqual(processedUnits, 3); // 3 tons processed
    });
  });
});
