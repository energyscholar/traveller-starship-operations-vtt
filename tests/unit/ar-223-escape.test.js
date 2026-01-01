/**
 * AR-223: Escape Mechanics Unit Tests
 * TDD Phase: RED then GREEN
 *
 * M-Drive escape: Opposed pilot check, needs +3 margin
 * J-Drive escape: Requires operational jDrive, power ≥20%, fuel
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  canAttemptMDriveEscape,
  canAttemptJDriveEscape,
  resolveMDriveEscape,
  resolveJDriveEscape
} = require('../../lib/combat/escape-mechanics');

describe('AR-223: Escape Mechanics', () => {

  describe('M-Drive Escape', () => {

    describe('canAttemptMDriveEscape', () => {
      it('requires mDrive not disabled', () => {
        assert.strictEqual(canAttemptMDriveEscape({
          mDrive: { disabled: true },
          power: 50,
          maxPower: 100
        }), false);
      });

      it('requires power >= 20%', () => {
        assert.strictEqual(canAttemptMDriveEscape({
          mDrive: { disabled: false },
          power: 15,
          maxPower: 100
        }), false);

        assert.strictEqual(canAttemptMDriveEscape({
          mDrive: { disabled: false },
          power: 20,
          maxPower: 100
        }), true);
      });

      it('allows escape when requirements met', () => {
        assert.strictEqual(canAttemptMDriveEscape({
          mDrive: { disabled: false },
          power: 50,
          maxPower: 100
        }), true);
      });
    });

    describe('resolveMDriveEscape', () => {
      it('escapes with +3 margin or more', () => {
        const result = resolveMDriveEscape({
          escaperRoll: 12,
          chaserRoll: 9
        });
        assert.strictEqual(result.escaped, true);
        assert.strictEqual(result.margin, 3);
      });

      it('fails with +2 margin', () => {
        const result = resolveMDriveEscape({
          escaperRoll: 11,
          chaserRoll: 9
        });
        assert.strictEqual(result.escaped, false);
        assert.strictEqual(result.margin, 2);
      });

      it('fails when chaser wins', () => {
        const result = resolveMDriveEscape({
          escaperRoll: 8,
          chaserRoll: 10
        });
        assert.strictEqual(result.escaped, false);
        assert.strictEqual(result.margin, -2);
      });

      it('exactly +3 margin succeeds', () => {
        const result = resolveMDriveEscape({
          escaperRoll: 10,
          chaserRoll: 7
        });
        assert.strictEqual(result.escaped, true);
      });
    });
  });

  describe('J-Drive Escape', () => {

    describe('canAttemptJDriveEscape', () => {
      it('requires jDrive not disabled', () => {
        assert.strictEqual(canAttemptJDriveEscape({
          jDrive: { disabled: true },
          power: 50,
          maxPower: 100,
          fuel: 20,
          fuelPerJump: 10
        }), false);
      });

      it('requires power >= 20%', () => {
        assert.strictEqual(canAttemptJDriveEscape({
          jDrive: { disabled: false },
          power: 15,
          maxPower: 100,
          fuel: 20,
          fuelPerJump: 10
        }), false);
      });

      it('requires fuel for jump-1', () => {
        assert.strictEqual(canAttemptJDriveEscape({
          jDrive: { disabled: false },
          power: 50,
          maxPower: 100,
          fuel: 5,
          fuelPerJump: 10
        }), false);

        assert.strictEqual(canAttemptJDriveEscape({
          jDrive: { disabled: false },
          power: 50,
          maxPower: 100,
          fuel: 10,
          fuelPerJump: 10
        }), true);
      });

      it('allows escape when all requirements met', () => {
        assert.strictEqual(canAttemptJDriveEscape({
          jDrive: { disabled: false },
          power: 50,
          maxPower: 100,
          fuel: 20,
          fuelPerJump: 10
        }), true);
      });
    });

    describe('resolveJDriveEscape', () => {
      it('succeeds automatically when jDrive operational', () => {
        const result = resolveJDriveEscape({
          jDrive: { disabled: false },
          fuel: 20,
          fuelPerJump: 10
        });
        assert.strictEqual(result.escaped, true);
        assert.strictEqual(result.fuelConsumed, 10);
      });

      it('fails when jDrive disabled', () => {
        const result = resolveJDriveEscape({
          jDrive: { disabled: true },
          fuel: 20,
          fuelPerJump: 10
        });
        assert.strictEqual(result.escaped, false);
        assert.strictEqual(result.reason, 'jDrive disabled');
      });

      it('fails when insufficient fuel', () => {
        const result = resolveJDriveEscape({
          jDrive: { disabled: false },
          fuel: 5,
          fuelPerJump: 10
        });
        assert.strictEqual(result.escaped, false);
        assert.strictEqual(result.reason, 'insufficient fuel');
      });
    });
  });

  describe('Called shot effects on escape', () => {
    it('disabling jDrive prevents jump escape', () => {
      const ship = {
        jDrive: { disabled: false },
        power: 50,
        maxPower: 100,
        fuel: 20,
        fuelPerJump: 10
      };

      // Before called shot
      assert.strictEqual(canAttemptJDriveEscape(ship), true);

      // Called shot disables jDrive
      ship.jDrive.disabled = true;

      // After called shot
      assert.strictEqual(canAttemptJDriveEscape(ship), false);
    });

    it('disabling mDrive prevents thrust escape', () => {
      const ship = {
        mDrive: { disabled: false },
        power: 50,
        maxPower: 100
      };

      assert.strictEqual(canAttemptMDriveEscape(ship), true);

      ship.mDrive.disabled = true;

      assert.strictEqual(canAttemptMDriveEscape(ship), false);
    });
  });
});
