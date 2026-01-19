/**
 * Escape Mechanics Tests
 * Tests for lib/combat/escape-mechanics.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  canAttemptMDriveEscape,
  resolveMDriveEscape,
  canAttemptJDriveEscape,
  resolveJDriveEscape,
  ESCAPE_MARGIN_REQUIRED,
  MIN_POWER_PERCENT
} = require('../../lib/combat/escape-mechanics');

describe('Escape Mechanics', () => {

  describe('canAttemptMDriveEscape', () => {

    it('returns true with working drive and sufficient power', () => {
      const ship = {
        mDrive: { disabled: false },
        power: 100,
        maxPower: 100
      };
      assert.strictEqual(canAttemptMDriveEscape(ship), true);
    });

    it('returns false with disabled drive', () => {
      const ship = {
        mDrive: { disabled: true },
        power: 100,
        maxPower: 100
      };
      assert.strictEqual(canAttemptMDriveEscape(ship), false);
    });

    it('returns false with insufficient power', () => {
      const ship = {
        mDrive: { disabled: false },
        power: 10,
        maxPower: 100
      };
      assert.strictEqual(canAttemptMDriveEscape(ship), false, 'Should fail at 10% power');
    });

    it('returns true at exactly minimum power', () => {
      const ship = {
        mDrive: { disabled: false },
        power: 20,
        maxPower: 100
      };
      assert.strictEqual(canAttemptMDriveEscape(ship), true, 'Should pass at 20% power');
    });

  });

  describe('resolveMDriveEscape', () => {

    it('returns escaped: true when margin >= 3', () => {
      const result = resolveMDriveEscape({
        escaperRoll: 12,
        chaserRoll: 8
      });
      assert.strictEqual(result.escaped, true, 'Margin 4 should escape');
      assert.strictEqual(result.margin, 4);
    });

    it('returns escaped: true when margin exactly 3', () => {
      const result = resolveMDriveEscape({
        escaperRoll: 10,
        chaserRoll: 7
      });
      assert.strictEqual(result.escaped, true, 'Margin 3 should escape');
      assert.strictEqual(result.margin, 3);
    });

    it('returns escaped: false when margin < 3', () => {
      const result = resolveMDriveEscape({
        escaperRoll: 10,
        chaserRoll: 8
      });
      assert.strictEqual(result.escaped, false, 'Margin 2 should fail');
      assert.strictEqual(result.margin, 2);
    });

    it('returns escaped: false when margin is negative', () => {
      const result = resolveMDriveEscape({
        escaperRoll: 6,
        chaserRoll: 10
      });
      assert.strictEqual(result.escaped, false, 'Negative margin should fail');
      assert.strictEqual(result.margin, -4);
    });

    it('includes required margin in result', () => {
      const result = resolveMDriveEscape({
        escaperRoll: 10,
        chaserRoll: 7
      });
      assert.strictEqual(result.requiredMargin, ESCAPE_MARGIN_REQUIRED);
    });

  });

  describe('canAttemptJDriveEscape', () => {

    it('returns true with working drive, power, and fuel', () => {
      const ship = {
        jDrive: { disabled: false },
        power: 100,
        maxPower: 100,
        fuel: 40,
        fuelPerJump: 20
      };
      assert.strictEqual(canAttemptJDriveEscape(ship), true);
    });

    it('returns false with disabled drive', () => {
      const ship = {
        jDrive: { disabled: true },
        power: 100,
        maxPower: 100,
        fuel: 40,
        fuelPerJump: 20
      };
      assert.strictEqual(canAttemptJDriveEscape(ship), false);
    });

    it('returns false with insufficient fuel', () => {
      const ship = {
        jDrive: { disabled: false },
        power: 100,
        maxPower: 100,
        fuel: 10,
        fuelPerJump: 20
      };
      assert.strictEqual(canAttemptJDriveEscape(ship), false);
    });

    it('returns false with insufficient power', () => {
      const ship = {
        jDrive: { disabled: false },
        power: 10,
        maxPower: 100,
        fuel: 40,
        fuelPerJump: 20
      };
      assert.strictEqual(canAttemptJDriveEscape(ship), false);
    });

  });

  describe('resolveJDriveEscape', () => {

    it('returns escaped: true for valid jump', () => {
      const ship = {
        jDrive: { disabled: false },
        power: 100,
        maxPower: 100,
        fuel: 40,
        fuelPerJump: 20
      };
      const result = resolveJDriveEscape(ship);
      assert.strictEqual(result.escaped, true);
    });

    it('includes fuel consumed in result', () => {
      const ship = {
        jDrive: { disabled: false },
        power: 100,
        maxPower: 100,
        fuel: 40,
        fuelPerJump: 20
      };
      const result = resolveJDriveEscape(ship);
      if (result.escaped) {
        assert.ok(result.fuelConsumed !== undefined, 'Should report fuel consumed');
      }
    });

  });

  describe('ESCAPE_MARGIN_REQUIRED', () => {

    it('is positive number', () => {
      assert.ok(ESCAPE_MARGIN_REQUIRED > 0, 'Should be positive');
      assert.strictEqual(ESCAPE_MARGIN_REQUIRED, 3, 'Should be 3 per rules');
    });

  });

  describe('MIN_POWER_PERCENT', () => {

    it('is positive number', () => {
      assert.ok(MIN_POWER_PERCENT > 0, 'Should be positive');
      assert.strictEqual(MIN_POWER_PERCENT, 20, 'Should be 20%');
    });

  });

});
