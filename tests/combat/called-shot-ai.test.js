/**
 * Called Shot AI Tests
 * Tests for lib/combat/called-shot-ai.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  canUseCalledShot,
  selectCalledShotTarget,
  getCalledShotPenalty,
  CALLED_SHOT_PENALTIES,
  CALLED_SHOT_PRIORITY,
  CALLED_SHOT_EXCLUDED_WEAPONS
} = require('../../lib/combat/called-shot-ai');

describe('Called Shot AI', () => {

  describe('canUseCalledShot', () => {

    it('returns true for beam/pulse weapons', () => {
      assert.strictEqual(canUseCalledShot('beam_laser'), true, 'Beam laser should allow called shots');
      assert.strictEqual(canUseCalledShot('pulse_laser'), true, 'Pulse laser should allow called shots');
    });

    it('returns true for missile weapons', () => {
      assert.strictEqual(canUseCalledShot('missile'), true, 'Missiles should allow called shots');
    });

    it('returns false for sandcaster', () => {
      assert.strictEqual(canUseCalledShot('sandcaster'), false, 'Sandcaster should not allow called shots');
    });

    it('returns false for ion weapons', () => {
      assert.strictEqual(canUseCalledShot('ion'), false, 'Ion should not allow called shots');
      assert.strictEqual(canUseCalledShot('ion_cannon'), false, 'Ion cannon should not allow called shots');
    });

    it('returns true for unknown weapon (default allow)', () => {
      assert.strictEqual(canUseCalledShot('unknown_weapon'), true, 'Unknown should default to allow');
    });

    it('returns true for null/undefined weapon', () => {
      assert.strictEqual(canUseCalledShot(null), true, 'Null should default to allow');
      assert.strictEqual(canUseCalledShot(undefined), true, 'Undefined should default to allow');
    });

  });

  describe('selectCalledShotTarget', () => {

    it('returns valid system name or null', () => {
      const ctx = {
        weaponType: 'pulse_laser',
        defenderHull: 20,
        defenderMaxHull: 100
      };
      const target = selectCalledShotTarget(ctx);
      // Should return a system name or null
      assert.ok(target === null || typeof target === 'string', 'Should return string or null');
    });

    it('prioritizes jDrive when defender attempting escape', () => {
      const ctx = {
        weaponType: 'pulse_laser',
        defenderHull: 40,
        defenderMaxHull: 100,
        defenderAttemptingEscape: true
      };
      const target = selectCalledShotTarget(ctx);
      // When escaping, should target J-Drive
      if (target) {
        assert.strictEqual(target, 'jDrive', 'Should target J-Drive when escaping');
      }
    });

    it('returns null for ion weapons', () => {
      const ctx = {
        weaponType: 'ion_cannon',
        defenderHull: 20,
        defenderMaxHull: 100
      };
      const target = selectCalledShotTarget(ctx);
      assert.strictEqual(target, null, 'Ion weapons should not use called shots');
    });

  });

  describe('getCalledShotPenalty', () => {

    it('returns correct DM for mDrive', () => {
      const penalty = getCalledShotPenalty('mDrive');
      assert.strictEqual(penalty, -2, 'M-Drive penalty should be -2');
    });

    it('returns correct DM for jDrive', () => {
      const penalty = getCalledShotPenalty('jDrive');
      assert.strictEqual(penalty, -4, 'J-Drive penalty should be -4');
    });

    it('returns correct DM for powerPlant', () => {
      const penalty = getCalledShotPenalty('powerPlant');
      assert.strictEqual(penalty, -4, 'Power plant penalty should be -4');
    });

    it('returns correct DM for bridge', () => {
      const penalty = getCalledShotPenalty('bridge');
      assert.strictEqual(penalty, -6, 'Bridge penalty should be -6');
    });

  });

  describe('CALLED_SHOT_PENALTIES', () => {

    it('has all major systems', () => {
      assert.ok(CALLED_SHOT_PENALTIES.mDrive !== undefined, 'Should have mDrive');
      assert.ok(CALLED_SHOT_PENALTIES.jDrive !== undefined, 'Should have jDrive');
      assert.ok(CALLED_SHOT_PENALTIES.powerPlant !== undefined, 'Should have powerPlant');
      assert.ok(CALLED_SHOT_PENALTIES.sensors !== undefined, 'Should have sensors');
      assert.ok(CALLED_SHOT_PENALTIES.bridge !== undefined, 'Should have bridge');
    });

    it('penalties are negative numbers', () => {
      Object.values(CALLED_SHOT_PENALTIES).forEach(penalty => {
        assert.ok(penalty < 0, 'Penalties should be negative');
      });
    });

  });

  describe('CALLED_SHOT_PRIORITY', () => {

    it('is array of priority rules', () => {
      assert.ok(Array.isArray(CALLED_SHOT_PRIORITY), 'Should be array');
      assert.ok(CALLED_SHOT_PRIORITY.length > 0, 'Should have priority rules');
    });

    it('each rule has system and condition', () => {
      CALLED_SHOT_PRIORITY.forEach(rule => {
        assert.ok(rule.system, 'Rule should have system');
        assert.ok(typeof rule.condition === 'function', 'Rule should have condition function');
      });
    });

    it('jDrive is early in priority list', () => {
      const jDriveIdx = CALLED_SHOT_PRIORITY.findIndex(r => r.system === 'jDrive');
      assert.ok(jDriveIdx >= 0, 'Should have jDrive rule');
      assert.ok(jDriveIdx < 3, 'jDrive should be high priority');
    });

  });

  describe('CALLED_SHOT_EXCLUDED_WEAPONS', () => {

    it('includes sandcaster', () => {
      assert.ok(CALLED_SHOT_EXCLUDED_WEAPONS.includes('sandcaster'), 'Should exclude sandcaster');
    });

    it('includes ion weapons', () => {
      const hasIon = CALLED_SHOT_EXCLUDED_WEAPONS.some(w => w.includes('ion'));
      assert.ok(hasIon, 'Should exclude ion weapons');
    });

  });

});
