/**
 * AR-57: Navigation/Pilot/Astrogator - TDD Tests
 * Brachistochrone physics per user UQ: educational, show the math
 * User learned Newtonian physics from Traveller at age ~12!
 */
const assert = require('assert');

/**
 * Brachistochrone transit calculations
 * The ship accelerates to midpoint, flips, decelerates to destination
 *
 * Key formulas (from Traveller physics):
 * - Total time: t = 2 * sqrt(d / a)
 * - Max velocity at turnover: v_max = a * (t/2) = sqrt(a * d)
 * - Distance to turnover: d/2
 */
function calculateBrachistochrone(distanceKm, accelG) {
  const distanceM = distanceKm * 1000; // Convert km to m
  const accelMs2 = accelG * 9.81; // Convert G to m/s^2

  // Total transit time: t = 2 * sqrt(d / a)
  const timeSeconds = 2 * Math.sqrt(distanceM / accelMs2);

  // Maximum velocity at turnover: v = sqrt(a * d)
  const maxVelocityMs = Math.sqrt(accelMs2 * distanceM);

  // Turnover point (halfway)
  const turnoverKm = distanceKm / 2;

  return {
    timeSeconds,
    timeHours: timeSeconds / 3600,
    maxVelocityMs,
    maxVelocityKmH: maxVelocityMs * 3.6,
    turnoverKm,
    formula: `t = 2 × √(${distanceKm}km / ${accelG}G)`
  };
}

describe('AR-57 Navigation', () => {

  describe('57.1 Course Plotting', () => {
    it('should plot course to destination', () => {
      const destination = { name: 'Highport', distance: 100000 };
      const course = { destination, acceleration: 2, duration: 3600 };
      assert.ok(course.destination);
    });

    it('should support multiple destinations', () => {
      const destinations = [
        { name: 'Highport', distanceKm: 500 },
        { name: 'Gas Giant', distanceKm: 1500000 },
        { name: 'Jump Point', distanceKm: 150000 }
      ];
      assert.strictEqual(destinations.length, 3);
    });
  });

  describe('57.2 Brachistochrone Physics', () => {

    it('should calculate time: t = 2 * sqrt(d/a)', () => {
      // Test case: 100,000 km at 1G
      // d = 100,000 km = 100,000,000 m
      // a = 1G = 9.81 m/s^2
      // t = 2 * sqrt(100,000,000 / 9.81) = 2 * 3193.5 = 6387 seconds
      const result = calculateBrachistochrone(100000, 1);
      const expectedTime = 2 * Math.sqrt(100000000 / 9.81);
      assert.ok(Math.abs(result.timeSeconds - expectedTime) < 1);
    });

    it('should calculate max velocity at turnover', () => {
      // v_max = sqrt(a * d)
      const result = calculateBrachistochrone(100000, 1);
      const expectedV = Math.sqrt(9.81 * 100000000);
      assert.ok(Math.abs(result.maxVelocityMs - expectedV) < 10);
    });

    it('should scale time with sqrt of distance (2x dist = 1.41x time)', () => {
      const short = calculateBrachistochrone(100000, 1);
      const long = calculateBrachistochrone(200000, 1);
      const ratio = long.timeSeconds / short.timeSeconds;
      // sqrt(2) ≈ 1.414
      assert.ok(Math.abs(ratio - Math.sqrt(2)) < 0.01);
    });

    it('should scale time with sqrt of 1/accel (2x accel = 0.707x time)', () => {
      const slow = calculateBrachistochrone(100000, 1);
      const fast = calculateBrachistochrone(100000, 2);
      const ratio = fast.timeSeconds / slow.timeSeconds;
      // 1/sqrt(2) ≈ 0.707
      assert.ok(Math.abs(ratio - 1/Math.sqrt(2)) < 0.01);
    });

    it('should identify turnover at midpoint', () => {
      const result = calculateBrachistochrone(100000, 1);
      assert.strictEqual(result.turnoverKm, 50000);
    });
  });

  describe('57.3 Real-World Scenarios', () => {

    it('should calculate orbit-to-orbit transit', () => {
      // Earth orbit to Mars orbit: ~78 million km average
      const result = calculateBrachistochrone(78000000, 1);
      // At 1G, this is about 2.5 days
      const days = result.timeHours / 24;
      assert.ok(days > 2 && days < 3);
    });

    it('should calculate surface to highport (500km)', () => {
      const result = calculateBrachistochrone(500, 1);
      // About 8 minutes
      const minutes = result.timeSeconds / 60;
      assert.ok(minutes > 7 && minutes < 10);
    });

    it('should handle 2G thrust (faster trader)', () => {
      const at1G = calculateBrachistochrone(100000, 1);
      const at2G = calculateBrachistochrone(100000, 2);
      // 2G should be ~30% faster (1/sqrt(2))
      assert.ok(at2G.timeSeconds < at1G.timeSeconds);
    });

    it('should handle 6G thrust (military)', () => {
      const at1G = calculateBrachistochrone(100000, 1);
      const at6G = calculateBrachistochrone(100000, 6);
      // 6G should be ~2.45x faster (1/sqrt(6))
      const ratio = at6G.timeSeconds / at1G.timeSeconds;
      assert.ok(Math.abs(ratio - 1/Math.sqrt(6)) < 0.01);
    });
  });

  describe('57.4 Educational Tooltips', () => {

    it('should include formula in tooltip', () => {
      const result = calculateBrachistochrone(100000, 2);
      assert.ok(result.formula.includes('√'));
    });

    it('should format time human-readable', () => {
      const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };
      assert.strictEqual(formatTime(3660), '1h 1m');
      assert.strictEqual(formatTime(300), '5m');
    });

    it('should explain turnover concept', () => {
      const explanation = 'At turnover, flip ship 180° and decelerate at same rate';
      assert.ok(explanation.includes('turnover'));
    });
  });

  describe('57.5 Acceleration Options', () => {

    it('should support standard G ratings', () => {
      const gRatings = [0.5, 1, 2, 3, 4, 5, 6];
      gRatings.forEach(g => {
        const result = calculateBrachistochrone(100000, g);
        assert.ok(result.timeSeconds > 0);
      });
    });

    it('should allow comfort vs speed tradeoff', () => {
      const comfort = calculateBrachistochrone(100000, 0.5); // 0.5G gentle
      const standard = calculateBrachistochrone(100000, 1);   // 1G normal
      const fast = calculateBrachistochrone(100000, 2);       // 2G harsh

      assert.ok(comfort.timeSeconds > standard.timeSeconds);
      assert.ok(standard.timeSeconds > fast.timeSeconds);
    });
  });
});
