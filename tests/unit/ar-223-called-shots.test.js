/**
 * AR-223: Called Shot AI Unit Tests
 * TDD Phase: RED then GREEN
 *
 * AI chooses called shots based on:
 * - Defender hull status (<50% enables called shots)
 * - Escape attempts (target jDrive)
 * - Low power (target powerPlant)
 * - Ion weapons never use called shots (power drain only)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  selectCalledShotTarget,
  getCalledShotPenalty,
  CALLED_SHOT_PENALTIES
} = require('../../lib/combat/called-shot-ai');

describe('AR-223: Called Shot AI', () => {

  describe('selectCalledShotTarget', () => {

    it('returns null when defender has >50% hull (not damaged enough)', () => {
      const target = selectCalledShotTarget({
        defenderHull: 60,
        defenderMaxHull: 100,
        defenderSystems: { jDrive: { disabled: false } }
      });
      assert.strictEqual(target, null);
    });

    it('returns null for ion weapons (power drain, not physical)', () => {
      const target = selectCalledShotTarget({
        weaponType: 'ion',
        defenderHull: 30,
        defenderMaxHull: 100,
        defenderSystems: { jDrive: { disabled: false } }
      });
      assert.strictEqual(target, null);
    });

    it('targets jDrive when enemy attempting escape', () => {
      const target = selectCalledShotTarget({
        defenderHull: 40,
        defenderMaxHull: 100,
        defenderAttemptingEscape: true,
        defenderSystems: { jDrive: { disabled: false } }
      });
      assert.strictEqual(target, 'jDrive');
    });

    it('targets powerPlant when defender has low power (<30%)', () => {
      const target = selectCalledShotTarget({
        defenderHull: 40,
        defenderMaxHull: 100,
        defenderPower: 25,
        defenderMaxPower: 100,
        defenderSystems: { powerPlant: { disabled: false } }
      });
      assert.strictEqual(target, 'powerPlant');
    });

    it('targets mDrive when defender damaged but not escaping/low power', () => {
      const target = selectCalledShotTarget({
        defenderHull: 40,
        defenderMaxHull: 100,
        defenderPower: 80,
        defenderMaxPower: 100,
        defenderAttemptingEscape: false,
        defenderSystems: { mDrive: { disabled: false } }
      });
      assert.strictEqual(target, 'mDrive');
    });

    it('skips disabled jDrive, falls back to powerPlant', () => {
      const target = selectCalledShotTarget({
        defenderHull: 40,
        defenderMaxHull: 100,
        defenderAttemptingEscape: true,
        defenderPower: 20,
        defenderMaxPower: 100,
        defenderSystems: {
          jDrive: { disabled: true },
          powerPlant: { disabled: false }
        }
      });
      assert.strictEqual(target, 'powerPlant');
    });

    it('skips all disabled systems, returns null', () => {
      const target = selectCalledShotTarget({
        defenderHull: 40,
        defenderMaxHull: 100,
        defenderAttemptingEscape: true,
        defenderSystems: {
          jDrive: { disabled: true },
          powerPlant: { disabled: true },
          mDrive: { disabled: true },
          sensors: { disabled: true }
        }
      });
      assert.strictEqual(target, null);
    });

    it('prioritizes jDrive over powerPlant when escaping', () => {
      const target = selectCalledShotTarget({
        defenderHull: 40,
        defenderMaxHull: 100,
        defenderAttemptingEscape: true,
        defenderPower: 20, // Low power too
        defenderMaxPower: 100,
        defenderSystems: {
          jDrive: { disabled: false },
          powerPlant: { disabled: false }
        }
      });
      assert.strictEqual(target, 'jDrive'); // jDrive has priority
    });
  });

  describe('getCalledShotPenalty', () => {
    it('returns -4 for jDrive', () => {
      assert.strictEqual(getCalledShotPenalty('jDrive'), -4);
    });

    it('returns -4 for powerPlant', () => {
      assert.strictEqual(getCalledShotPenalty('powerPlant'), -4);
    });

    it('returns -2 for mDrive', () => {
      assert.strictEqual(getCalledShotPenalty('mDrive'), -2);
    });

    it('returns -2 for sensors', () => {
      assert.strictEqual(getCalledShotPenalty('sensors'), -2);
    });

    it('returns -6 for bridge (hardened)', () => {
      assert.strictEqual(getCalledShotPenalty('bridge'), -6);
    });

    it('returns -2 for unknown systems (default)', () => {
      assert.strictEqual(getCalledShotPenalty('turret1'), -2);
    });
  });

  describe('CALLED_SHOT_PENALTIES constant', () => {
    it('has penalties for critical systems', () => {
      assert.ok(CALLED_SHOT_PENALTIES.jDrive);
      assert.ok(CALLED_SHOT_PENALTIES.powerPlant);
      assert.ok(CALLED_SHOT_PENALTIES.mDrive);
      assert.ok(CALLED_SHOT_PENALTIES.sensors);
    });
  });

  describe('AI behavior variations', () => {
    it('handles missing defenderSystems gracefully', () => {
      const target = selectCalledShotTarget({
        defenderHull: 40,
        defenderMaxHull: 100
        // No defenderSystems
      });
      assert.strictEqual(target, null);
    });

    it('handles missing power values gracefully', () => {
      const target = selectCalledShotTarget({
        defenderHull: 40,
        defenderMaxHull: 100,
        defenderSystems: { mDrive: { disabled: false } }
        // No power values - shouldn't crash
      });
      // Should still target mDrive based on hull
      assert.strictEqual(target, 'mDrive');
    });
  });
});
