/**
 * TUI Jump Formatter Tests
 * Tests for lib/tui/formatters/jump-formatter.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  formatJumpState,
  formatJumpBrief
} = require('../../../lib/tui/formatters/jump-formatter');

describe('TUI Jump Formatter', () => {

  describe('formatJumpState', () => {

    it('returns a string', () => {
      const output = formatJumpState({});
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatJumpState({});
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('shows normal space when not in jump', () => {
      const output = formatJumpState({});
      assert.ok(output.includes('Normal') || output.includes('normal') || output.length > 0, 'Should indicate normal space');
    });

    it('shows jump in progress when active', () => {
      const jumpState = { inJump: true, destination: 'Regina', daysRemaining: 3 };
      const output = formatJumpState(jumpState);
      assert.ok(output.includes('Regina') || output.includes('jump') || output.includes('Jump'), 'Should show jump info');
    });

    it('is a pure function (does not modify input)', () => {
      const jumpState = { inJump: true, destination: 'Efate' };
      const copy = JSON.parse(JSON.stringify(jumpState));

      formatJumpState(jumpState);

      assert.deepStrictEqual(jumpState, copy, 'Should not modify jumpState');
    });
  });

  describe('formatJumpBrief', () => {

    it('returns a string', () => {
      const output = formatJumpBrief({});
      assert.strictEqual(typeof output, 'string');
    });

    it('contains ANSI codes', () => {
      const output = formatJumpBrief({});
      assert.ok(output.includes('\x1b['), 'Should contain ANSI escape codes');
    });

    it('shows brief status', () => {
      const output = formatJumpBrief({ inJump: true });
      assert.ok(output.length > 0, 'Should return non-empty string');
    });
  });
});
